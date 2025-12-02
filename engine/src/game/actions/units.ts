import { GameState, HexCoord, UnitState, UnitType, BuildingType } from "../../core/types.js";
import {
    ATTACK_RANDOM_BAND,
    CITY_DEFENSE_BASE,
    CITY_WARD_DEFENSE_BONUS,
    CITY_ATTACK_BASE,
    CITY_WARD_ATTACK_BONUS,
    DAMAGE_BASE,
    DAMAGE_MAX,
    DAMAGE_MIN,
    TERRAIN,
    GARRISON_RANGED_RETALIATION_RANGE,
    FORTIFY_DEFENSE_BONUS,
    UNITS,
} from "../../core/constants.js";
import { hexDistance, hexEquals, hexToString } from "../../core/hex.js";
import { refreshPlayerVision } from "../vision.js";
import { captureCity } from "../helpers/cities.js";
import { findPath, findReachableTiles } from "../helpers/pathfinding.js";
import {
    createMoveContext,
    executeUnitMove,
    resolveLinkedPartner,
    validateTileOccupancy,
    unlinkPair,
    MoveContext,
} from "../helpers/movement.js";
import { getEffectiveUnitStats, hasClearLineOfSight } from "../helpers/combat.js";
import { ensureWar } from "../helpers/diplomacy.js";

export function handleMoveUnit(state: GameState, action: { type: "MoveUnit"; playerId: string; unitId: string; to: HexCoord; isAuto?: boolean }): GameState {
    let unit: any;
    for (const u of state.units) {
        if (u.id === action.unitId) {
            unit = u;
            break;
        }
    }
    if (!unit) throw new Error("Unit not found");
    if (unit.ownerId !== action.playerId) throw new Error("Not your unit");
    if (unit.movesLeft <= 0) throw new Error("No moves left");

    // Manual move cancels auto-explore
    if (unit.isAutoExploring && !action.isAuto) {
        unit.isAutoExploring = false;
        unit.autoMoveTarget = undefined;
    }

    const dist = hexDistance(unit.coord, action.to);
    if (dist !== 1) throw new Error("Can only move 1 tile at a time");

    const targetTile = state.map.tiles.find(t => hexEquals(t.coord, action.to));
    if (!targetTile) throw new Error("Invalid target tile");

    const moveContext = createMoveContext(unit, targetTile);

    let partner = resolveLinkedPartner(state, unit);
    let partnerContext: MoveContext | null = null;
    let partnerWillMove = false;

    if (partner) {
        try {
            partnerContext = createMoveContext(partner, targetTile);
            validateTileOccupancy(
                state,
                action.to,
                [
                    { unit, stats: moveContext.stats },
                    { unit: partner, stats: partnerContext.stats },
                ],
                action.playerId
            );
            partnerWillMove = true;
        } catch (err) {
            unlinkPair(unit, partner);
            partner = undefined;
            partnerContext = null;
        }
    }

    if (!partnerWillMove) {
        validateTileOccupancy(state, action.to, [{ unit, stats: moveContext.stats }], action.playerId);
    }

    executeUnitMove(state, unit, moveContext, action.to, action.playerId);

    if (partnerWillMove && partner && partnerContext) {
        try {
            executeUnitMove(state, partner, partnerContext, action.to, action.playerId);
            const sharedMoves = Math.min(unit.movesLeft, partner.movesLeft);
            unit.movesLeft = sharedMoves;
            partner.movesLeft = sharedMoves;
        } catch (err) {
            unlinkPair(unit, partner);
        }
    }

    refreshPlayerVision(state, action.playerId);

    return state;
}

export function handleLinkUnits(state: GameState, action: { type: "LinkUnits"; playerId: string; unitId: string; partnerId: string }): GameState {
    const unit = state.units.find(u => u.id === action.unitId);
    const partner = state.units.find(u => u.id === action.partnerId);
    if (!unit || !partner) throw new Error("Unit not found");
    if (unit.id === partner.id) throw new Error("Cannot link unit to itself");
    if (unit.ownerId !== action.playerId || partner.ownerId !== action.playerId) throw new Error("Not your unit");
    if (!hexEquals(unit.coord, partner.coord)) throw new Error("Units must share a tile to link");
    if (unit.linkedUnitId || partner.linkedUnitId) throw new Error("Units already linked");
    if (unit.hasAttacked || partner.hasAttacked) throw new Error("Units are combat-engaged");

    unit.linkedUnitId = partner.id;
    partner.linkedUnitId = unit.id;
    return state;
}

export function handleUnlinkUnits(state: GameState, action: { type: "UnlinkUnits"; playerId: string; unitId: string; partnerId?: string }): GameState {
    const unit = state.units.find(u => u.id === action.unitId);
    if (!unit) throw new Error("Unit not found");
    if (unit.ownerId !== action.playerId) throw new Error("Not your unit");
    if (!unit.linkedUnitId) throw new Error("Unit is not linked");

    const partner = state.units.find(u => u.id === unit.linkedUnitId);
    if (partner && partner.ownerId !== action.playerId) throw new Error("Not your unit");
    if (action.partnerId && partner && partner.id !== action.partnerId) throw new Error("Partner mismatch");

    unlinkPair(unit, partner);
    return state;
}

export function handleAttack(state: GameState, action: { type: "Attack"; playerId: string; attackerId: string; targetId: string; targetType: "Unit" | "City" }): GameState {
    let attacker: any;
    for (const u of state.units) {
        if (u.id === action.attackerId) {
            attacker = u;
            break;
        }
    }
    if (!attacker) throw new Error("Attacker not found");
    if (attacker.ownerId !== action.playerId) throw new Error("Not your unit");
    if (attacker.hasAttacked) throw new Error("Already attacked");
    if (attacker.movesLeft <= 0) throw new Error("No moves left to attack");

    const attackerStats = getEffectiveUnitStats(attacker, state);

    const targetOwner = action.targetType === "Unit"
        ? state.units.find(u => u.id === action.targetId)?.ownerId
        : state.cities.find(c => c.id === action.targetId)?.ownerId;
    if (targetOwner && targetOwner !== action.playerId) {
        ensureWar(state, action.playerId, targetOwner);
    }

    if (action.targetType === "Unit") {
        let defender: any;
        for (const u of state.units) {
            if (u.id === action.targetId) {
                defender = u;
                break;
            }
        }
        if (!defender) throw new Error("Defender not found");

        // Smart Stack Attack: If targeting a Settler with a military escort, redirect to escort
        if (defender.type === UnitType.Settler) {
            const partner = resolveLinkedPartner(state, defender);
            if (partner && partner.ownerId === defender.ownerId && hexEquals(partner.coord, defender.coord)) {
                const partnerStats = UNITS[partner.type];
                if (partnerStats.domain !== "Civilian") {
                    // Redirect attack to the escort
                    defender = partner;
                }
            }
        }

        const dist = hexDistance(attacker.coord, defender.coord);
        if (dist > attackerStats.rng) throw new Error("Target out of range");
        if (!hasClearLineOfSight(state, attacker.coord, defender.coord)) throw new Error("Line of sight blocked");

        // If we are (still) targeting a Settler, it means no escort or we bypassed it?
        // Actually, if we redirected, defender is now the escort.
        // If we didn't redirect, defender is the Settler.

        if (defender.type === UnitType.Settler) {
            if (dist !== 1) throw new Error("Must be adjacent to capture settler");
            const defenderCoord = defender.coord;

            // Unlink from any partner before capture
            unlinkPair(defender, resolveLinkedPartner(state, defender));

            defender.ownerId = action.playerId;
            defender.movesLeft = 0;
            defender.capturedOnTurn = state.turn;
            attacker.coord = defenderCoord;
            attacker.hasAttacked = true;
            attacker.movesLeft = 0;
            attacker.state = UnitState.Normal;
            return state;
        }

        const randIdx = Math.floor(state.seed % 3);
        state.seed = (state.seed * 9301 + 49297) % 233280;
        const randomMod = ATTACK_RANDOM_BAND[randIdx];

        const attackPower = attackerStats.atk + randomMod;

        let defensePower = getEffectiveUnitStats(defender, state).def;
        const tile = state.map.tiles.find(t => hexEquals(t.coord, defender.coord));
        if (tile) {
            defensePower += TERRAIN[tile.terrain].defenseMod;
        }
        if (defender.state === UnitState.Fortified) defensePower += FORTIFY_DEFENSE_BONUS;

        const delta = attackPower - defensePower;
        const rawDamage = DAMAGE_BASE + Math.floor(delta / 2);
        const damage = Math.max(DAMAGE_MIN, Math.min(DAMAGE_MAX, rawDamage));

        defender.hp -= damage;
        attacker.hasAttacked = true;
        attacker.movesLeft = 0;
        attacker.state = UnitState.Normal;

        if (defender.hp <= 0) {
            const defenderCoord = defender.coord;

            // Unlink partner if defender dies
            unlinkPair(defender, resolveLinkedPartner(state, defender));

            state.units = state.units.filter(u => u.id !== defender.id);

            // Move Attacker into tile if melee
            if (attackerStats.rng === 1 && dist === 1) {
                // Check if there's an unconquered enemy city at the defender's location
                const cityAtLocation = state.cities.find(c => hexEquals(c.coord, defenderCoord));
                const isUnconqueredEnemyCity = cityAtLocation &&
                    cityAtLocation.ownerId !== action.playerId &&
                    cityAtLocation.hp > 0;

                // Only move into the tile if there's no unconquered enemy city
                if (!isUnconqueredEnemyCity) {
                    attacker.coord = defenderCoord;
                    attacker.movesLeft = 0;

                    // Capture any remaining civilians on the tile (e.g. the Settler we just exposed)
                    const remainingEnemies = state.units.filter(u =>
                        hexEquals(u.coord, defenderCoord) &&
                        u.ownerId !== action.playerId &&
                        UNITS[u.type].domain === "Civilian"
                    );

                    for (const enemy of remainingEnemies) {
                        unlinkPair(enemy, resolveLinkedPartner(state, enemy));
                        enemy.ownerId = action.playerId;
                        enemy.movesLeft = 0;
                        enemy.capturedOnTurn = state.turn;
                    }
                }
            }
        }
    } else {
        const city = state.cities.find(c => c.id === action.targetId);
        if (!city) throw new Error("City not found");

        const dist = hexDistance(attacker.coord, city.coord);
        if (dist > attackerStats.rng) throw new Error("Target out of range");
        if (!hasClearLineOfSight(state, attacker.coord, city.coord)) throw new Error("Line of sight blocked");

        const randIdx = Math.floor(state.seed % 3);
        state.seed = (state.seed * 9301 + 49297) % 233280;
        const randomMod = ATTACK_RANDOM_BAND[randIdx];

        const attackPower = attackerStats.atk + randomMod;

        // v1.0: Calculate garrison bonuses
        const garrison = state.units.find(u => hexEquals(u.coord, city.coord) && u.ownerId === city.ownerId && u.type !== UnitType.Settler);
        let garrisonDefenseBonus = 0;
        let garrisonAttackBonus = 0;
        let garrisonRetaliationRange = 0;

        if (garrison) {
            const garrisonStats = UNITS[garrison.type];
            // Ranged units (range 2+)
            if (garrisonStats.rng >= 2) {
                garrisonDefenseBonus = 1;  // GARRISON_RANGED_DEFENSE_BONUS
                garrisonAttackBonus = 3;   // GARRISON_RANGED_ATTACK_BONUS
                garrisonRetaliationRange = 2; // GARRISON_RANGED_RETALIATION_RANGE
            } else {
                // Melee units (range 1)
                garrisonDefenseBonus = 2;  // GARRISON_MELEE_DEFENSE_BONUS
                garrisonAttackBonus = 1;   // GARRISON_MELEE_ATTACK_BONUS
                garrisonRetaliationRange = 1; // GARRISON_MELEE_RETALIATION_RANGE
            }
        }

        let defensePower = CITY_DEFENSE_BASE + Math.floor(city.pop / 2) + garrisonDefenseBonus;
        if (city.buildings.includes(BuildingType.CityWard)) defensePower += CITY_WARD_DEFENSE_BONUS;

        const delta = attackPower - defensePower;
        const rawDamage = DAMAGE_BASE + Math.floor(delta / 2);
        const damage = Math.max(DAMAGE_MIN, Math.min(DAMAGE_MAX, rawDamage));

        city.hp -= damage;
        city.lastDamagedOnTurn = state.turn;
        attacker.hasAttacked = true;
        attacker.movesLeft = 0;

        // v1.0: Automatic retaliation if garrisoned and attacker in range
        if (garrison && dist <= garrisonRetaliationRange && !attacker.retaliatedAgainstThisTurn) {
            const cityAttackPower = CITY_ATTACK_BASE +
                (city.buildings.includes(BuildingType.CityWard) ? CITY_WARD_ATTACK_BONUS : 0) +
                garrisonAttackBonus;

            let attackerDefense = getEffectiveUnitStats(attacker, state).def;
            const attackerTile = state.map.tiles.find(t => hexEquals(t.coord, attacker.coord));
            if (attackerTile) attackerDefense += TERRAIN[attackerTile.terrain].defenseMod;
            if (attacker.state === UnitState.Fortified) attackerDefense += FORTIFY_DEFENSE_BONUS;

            const retaliationDelta = cityAttackPower - attackerDefense;
            const retaliationRawDamage = DAMAGE_BASE + Math.floor(retaliationDelta / 2);
            const retaliationDamage = Math.max(DAMAGE_MIN, Math.min(DAMAGE_MAX, retaliationRawDamage));

            attacker.hp -= retaliationDamage;
            attacker.retaliatedAgainstThisTurn = true;

            if (attacker.hp <= 0) {
                state.units = state.units.filter(u => u.id !== attacker.id);
                return state;
            }
        }

        if (city.hp <= 0) {
            if (attackerStats.canCaptureCity && dist === 1) {
                const cityCoord = city.coord;

                // v1.0: Remove garrison on capture
                if (garrison) {
                    unlinkPair(garrison, resolveLinkedPartner(state, garrison));
                    state.units = state.units.filter(u => u.id !== garrison.id);
                }

                // Capture City
                captureCity(state, city, action.playerId);

                // Move Attacker into city
                attacker.coord = cityCoord;
                attacker.movesLeft = 0;
            }
        }
    }

    return state;
}

export function handleSetAutoMoveTarget(state: GameState, action: { type: "SetAutoMoveTarget"; playerId: string; unitId: string; target: HexCoord }): GameState {
    const unit = state.units.find(u => u.id === action.unitId);
    if (!unit) throw new Error("Unit not found");
    if (unit.ownerId !== action.playerId) throw new Error("Not your unit");

    // Validate target is on map
    const targetTile = state.map.tiles.find(t => hexEquals(t.coord, action.target));
    if (!targetTile) throw new Error("Invalid target tile");

    unit.autoMoveTarget = action.target;
    unit.isAutoExploring = false; // Setting specific target cancels auto-explore
    return state;
}

export function handleClearAutoMoveTarget(state: GameState, action: { type: "ClearAutoMoveTarget"; playerId: string; unitId: string }): GameState {
    const unit = state.units.find(u => u.id === action.unitId);
    if (!unit) throw new Error("Unit not found");
    if (unit.ownerId !== action.playerId) throw new Error("Not your unit");

    unit.autoMoveTarget = undefined;
    return state;
}

export function handleSetAutoExplore(state: GameState, action: { type: "SetAutoExplore"; playerId: string; unitId: string }): GameState {
    const unit = state.units.find(u => u.id === action.unitId);
    if (!unit) throw new Error("Unit not found");
    if (unit.ownerId !== action.playerId) throw new Error("Not your unit");

    unit.isAutoExploring = true;
    unit.autoMoveTarget = undefined; // Will be calculated next turn or immediately if moves left

    // Trigger immediate exploration if moves remain
    if (unit.movesLeft > 0) {
        // Refresh vision first to ensure we have up-to-date visibility data
        refreshPlayerVision(state, action.playerId);
        processAutoExplore(state, action.playerId, unit.id);
        processAutoMovement(state, action.playerId, unit.id);
    }

    return state;
}

export function handleClearAutoExplore(state: GameState, action: { type: "ClearAutoExplore"; playerId: string; unitId: string }): GameState {
    const unit = state.units.find(u => u.id === action.unitId);
    if (!unit) throw new Error("Unit not found");
    if (unit.ownerId !== action.playerId) throw new Error("Not your unit");

    unit.isAutoExploring = false;
    unit.autoMoveTarget = undefined;
    return state;
}

export function handleFortifyUnit(state: GameState, action: { type: "FortifyUnit"; playerId: string; unitId: string }): GameState {
    const unit = state.units.find(u => u.id === action.unitId);
    if (!unit) throw new Error("Unit not found");
    if (unit.ownerId !== action.playerId) throw new Error("Not your unit");
    if (unit.movesLeft <= 0) throw new Error("No moves left");
    if (unit.type === UnitType.Settler) throw new Error("Settlers cannot fortify");

    unit.state = UnitState.Fortified;
    unit.movesLeft = 0; // Consumes all moves
    unit.isAutoExploring = false;
    return state;
}

export function handleSwapUnits(state: GameState, action: { type: "SwapUnits"; playerId: string; unitId: string; targetUnitId: string }): GameState {
    const unit = state.units.find(u => u.id === action.unitId);
    const targetUnit = state.units.find(u => u.id === action.targetUnitId);

    if (!unit || !targetUnit) throw new Error("Unit not found");
    if (unit.ownerId !== action.playerId || targetUnit.ownerId !== action.playerId) throw new Error("Not your unit");
    if (unit.movesLeft <= 0) throw new Error("No moves left"); // Only initiator needs moves? Or both?
    // Let's say initiator needs moves. Target can be 0 moves.

    // Validate adjacency
    if (hexDistance(unit.coord, targetUnit.coord) !== 1) throw new Error("Units must be adjacent to swap");

    // Validate domain compatibility (e.g. Land unit can't swap into Ocean if it can't go there)
    // Actually, if they are swapping, they are just trading places.
    // But we should check if `unit` can enter `targetUnit.coord` and vice versa.
    const unitTile = state.map.tiles.find(t => hexEquals(t.coord, unit.coord));
    const targetTile = state.map.tiles.find(t => hexEquals(t.coord, targetUnit.coord));

    if (!unitTile || !targetTile) throw new Error("Invalid tiles");

    // Check if unit can enter targetTile
    // We can use validateTileOccupancy but we need to ignore the target unit itself (since we are swapping)
    // But validateTileOccupancy checks for *other* units too.
    // Simpler: just check terrain domain.
    const unitStats = UNITS[unit.type];
    const targetStats = UNITS[targetUnit.type];

    if (unitStats.domain === "Land" && (targetTile.terrain === "Coast" || targetTile.terrain === "DeepSea" || targetTile.terrain === "Mountain")) throw new Error("Unit cannot enter target terrain");
    if (unitStats.domain === "Naval" && (targetTile.terrain !== "Coast" && targetTile.terrain !== "DeepSea")) throw new Error("Unit cannot enter target terrain");

    if (targetStats.domain === "Land" && (unitTile.terrain === "Coast" || unitTile.terrain === "DeepSea" || unitTile.terrain === "Mountain")) throw new Error("Target unit cannot enter initiator terrain");
    if (targetStats.domain === "Naval" && (unitTile.terrain !== "Coast" && unitTile.terrain !== "DeepSea")) throw new Error("Target unit cannot enter initiator terrain");

    // Perform Swap
    const tempCoord = unit.coord;
    unit.coord = targetUnit.coord;
    targetUnit.coord = tempCoord;

    // Cost?
    // Swapping is powerful. Maybe cost 1 move for initiator?
    unit.movesLeft -= 1;

    // Update vision
    refreshPlayerVision(state, action.playerId);

    return state;
}



export function processAutoMovement(state: GameState, playerId: string, specificUnitId?: string) {
    let unitsWithTargets = state.units.filter(u => u.ownerId === playerId && u.autoMoveTarget);
    if (specificUnitId) {
        unitsWithTargets = unitsWithTargets.filter(u => u.id === specificUnitId);
    }

    for (const unit of unitsWithTargets) {
        // Safety break
        let moves = 0;
        const MAX_MOVES = 10;

        while (unit.movesLeft > 0 && unit.autoMoveTarget && moves < MAX_MOVES) {
            moves++;

            // 1. Calculate Path with current vision
            const path = findPath(unit.coord, unit.autoMoveTarget, unit, state);

            // 2. Check if path exists
            if (path.length === 0) {
                // Target unreachable or already there
                if (hexEquals(unit.coord, unit.autoMoveTarget)) {
                    unit.autoMoveTarget = undefined;
                } else {
                    // Path blocked? Check if it's permanently blocked by terrain
                    const targetTile = state.map.tiles.find(t => hexEquals(t.coord, unit.autoMoveTarget!));
                    if (targetTile) {
                        const stats = UNITS[unit.type];
                        const isLand = stats.domain === "Land";
                        const isNaval = stats.domain === "Naval";

                        let invalid = false;
                        // Check if terrain is incompatible with unit domain
                        if (isLand && (targetTile.terrain === "Coast" || targetTile.terrain === "DeepSea" || targetTile.terrain === "Mountain")) invalid = true;
                        if (isNaval && (targetTile.terrain !== "Coast" && targetTile.terrain !== "DeepSea")) invalid = true;

                        if (invalid) {
                            unit.autoMoveTarget = undefined;
                        } else {
                            // Target is valid but path is blocked (e.g. by units)
                            // Try to find a partial path: Move to the closest reachable tile to the target
                            const reachable = findReachableTiles(unit.coord, unit, state, 10); // Search range 10
                            let bestTile: HexCoord | undefined;
                            let minDist = Infinity;

                            for (const [key, coord] of reachable) {
                                const d = hexDistance(coord, unit.autoMoveTarget!);
                                if (d < minDist) {
                                    minDist = d;
                                    bestTile = coord;
                                }
                            }

                            if (bestTile && !hexEquals(bestTile, unit.coord)) {
                                // Found a partial step!
                                const partialPath = findPath(unit.coord, bestTile, unit, state);
                                if (partialPath.length > 0) {
                                    // Override path for this step
                                    // We don't change autoMoveTarget, just move towards it as best we can
                                    // Actually, we need to execute the move.
                                    // Let's just set 'path' to this partial path and let the logic below handle it?
                                    // But 'path' is const.
                                    // We can just execute the move here and continue?
                                    // Or break the loop and try again next turn?
                                    // Better: Modify the logic to use this partial step.

                                    // Let's just execute the move directly here and `continue` the outer loop (next move step)
                                    // But we are inside a `while` loop for moves.
                                    // If we move, we consume moves.

                                    const nextStep = partialPath[0];
                                    try {
                                        handleMoveUnit(state, {
                                            type: "MoveUnit",
                                            playerId: unit.ownerId,
                                            unitId: unit.id,
                                            to: nextStep,
                                            isAuto: true
                                        });
                                        // Continue to next move iteration
                                        continue;
                                    } catch (e) {
                                        // Even partial move failed?
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
                break;
            }

            // 3. Try to move to next step
            const nextStep = path[0];
            try {
                handleMoveUnit(state, {
                    type: "MoveUnit",
                    playerId: unit.ownerId,
                    unitId: unit.id,
                    to: nextStep,
                    isAuto: true
                });
                // handleMoveUnit calls refreshPlayerVision internally, so vision is up to date for next iteration
            } catch (e) {
                // Move failed (blocked by unit, etc)
                // Stop for this turn, but keep target to try again next turn
                break;
            }
        }
    }
}

export function processAutoExplore(state: GameState, playerId: string, specificUnitId?: string) {
    let explorers = state.units.filter(u => u.ownerId === playerId && u.isAutoExploring);
    if (specificUnitId) {
        explorers = explorers.filter(u => u.id === specificUnitId);
    }


    if (explorers.length === 0) return;

    const revealedSet = new Set(state.revealed[playerId] || []);

    // Find all unexplored tiles
    const unexploredTiles = state.map.tiles.filter(t => !revealedSet.has(hexToString(t.coord)));

    if (unexploredTiles.length === 0) {
        // Map fully explored, stop all auto-explorers
        explorers.forEach(u => {
            u.isAutoExploring = false;
            u.autoMoveTarget = undefined;
        });
        return;
    }

    for (const unit of explorers) {
        // Check if current target is still valid (unexplored)
        if (unit.autoMoveTarget) {
            const targetKey = hexToString(unit.autoMoveTarget);

            // If target was revealed/explored, clear it and pick a new one
            if (revealedSet.has(targetKey)) {
                unit.autoMoveTarget = undefined;
            } else {
                // Target is still unexplored - stick with it!
                // Don't re-evaluate for "better" targets, this causes loops
                // The processAutoMovement will handle pathfinding each turn
                // If temporarily blocked, scout waits; if permanently blocked, keeps trying
                continue;
            }
        }

        // Find closest REACHABLE unexplored tile
        // Build a list of candidates with their distances and paths
        const candidates: Array<{ tile: typeof unexploredTiles[0], dist: number }> = [];

        for (const tile of unexploredTiles) {
            const dist = hexDistance(unit.coord, tile.coord);
            const path = findPath(unit.coord, tile.coord, unit, state);

            // Only consider tiles that have a valid path
            if (path.length > 0) {
                candidates.push({ tile, dist });
            }
        }

        // Sort by distance and pick the closest reachable one
        if (candidates.length > 0) {
            candidates.sort((a, b) => a.dist - b.dist);
            unit.autoMoveTarget = candidates[0].tile.coord;
        } else {
            // No reachable unexplored tiles right now
            // Fallback: Frontier Search
            // Find the reachable tile that is closest to ANY unexplored tile
            // This helps when the "unknown" is across water - we move to the coast.

            const reachable = findReachableTiles(unit.coord, unit, state, 15); // Search range 15
            let bestTile: HexCoord | undefined;
            let minScore = Infinity; // Score = distance to unexplored

            // Optimization: Instead of checking all unexplored tiles against all reachable tiles (O(N*M)),
            // we can just check reachable tiles against the *closest* unexplored tile?
            // Or just iterate reachable tiles and find distance to nearest unexplored?
            // Since we already have `unexploredTiles`, let's try to find the "closest unexplored" to our current position
            // and try to get as close to THAT as possible.

            // Find closest unexplored tile (even if unreachable)
            let closestUnexplored: HexCoord | undefined;
            let closestDist = Infinity;

            for (const tile of unexploredTiles) {
                const d = hexDistance(unit.coord, tile.coord);
                if (d < closestDist) {
                    closestDist = d;
                    closestUnexplored = tile.coord;
                }
            }

            if (closestUnexplored) {
                // Now find the reachable tile that minimizes distance to this closest unexplored tile
                for (const [key, coord] of reachable) {
                    const d = hexDistance(coord, closestUnexplored);
                    if (d < minScore) {
                        minScore = d;
                        bestTile = coord;
                    }
                }
            }

            if (bestTile && !hexEquals(bestTile, unit.coord)) {
                unit.autoMoveTarget = bestTile;
            } else {
                // Truly stuck
                unit.autoMoveTarget = undefined;
            }
        }
    }
}
