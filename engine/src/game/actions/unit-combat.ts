import { GameState, UnitState, UnitType, BuildingType, HistoryEventType, UnitDomain } from "../../core/types.js";
import { logEvent } from "../history.js";
import {
    BUILDINGS,
    CITY_DEFENSE_BASE,
    CITY_ATTACK_BASE,
    CITY_WARD_ATTACK_BONUS,
    TERRAIN,
    FORTIFY_DEFENSE_BONUS,
    UNITS,
    TREBUCHET_CITY_ATTACK_BONUS,
    TREBUCHET_CITY_RETALIATION_REDUCTION,
} from "../../core/constants.js";
import { hexDistance, hexEquals, hexToString, getNeighbors } from "../../core/hex.js";
import { captureCity } from "../helpers/cities.js";
import { buildTileLookup, calculateCiv6Damage, getEffectiveUnitStats, hasClearLineOfSight } from "../helpers/combat.js";
import { ensureWar } from "../helpers/diplomacy.js";
import { assertHasNotAttacked, assertMovesLeft, assertOwnership, getCityAt, getUnitOrThrow } from "../helpers/action-helpers.js";
import { resolveLinkedPartner, unlinkPair } from "../helpers/movement.js";
import { AttackAction } from "./unit-action-types.js";
import { triggerNativeAggro, triggerNativeRetreat, isNativeUnit, clearNativeCamp } from "../natives/native-behavior.js";
import { ensureCityStateWar, getCityStateByOwnerId, removeCityStateByCityId } from "../city-states.js";

export function handleAttack(state: GameState, action: AttackAction): GameState {
    const attacker = getUnitOrThrow(state, action.attackerId, "Attacker not found");
    assertOwnership(attacker, action.playerId);
    assertHasNotAttacked(attacker, "Already attacked");
    assertMovesLeft(attacker, "No moves left to attack");
    const tileLookup = buildTileLookup(state);

    // Check if attacker is garrisoned
    const cityAtAttackerLoc = getCityAt(state, attacker.coord);
    if (cityAtAttackerLoc && cityAtAttackerLoc.ownerId === attacker.ownerId && attacker.type !== UnitType.Settler) {
        throw new Error("Garrisoned units cannot attack");
    }

    const attackerStats = getEffectiveUnitStats(attacker, state);

    // Civilian units (like Settlers) cannot attack
    if (UNITS[attacker.type].domain === UnitDomain.Civilian) {
        throw new Error("Civilian units cannot attack");
    }

    // v6.0: Early check for untargetable units (Air Domain)
    if (action.targetType === "Unit") {
        const targetUnit = state.units.find(u => u.id === action.targetId);
        if (targetUnit && UNITS[targetUnit.type].domain === UnitDomain.Air) {
            throw new Error("Cannot attack air units");
        }
        // v1.0.3: Trebuchet can only attack cities, not units
        if (attacker.type === UnitType.Trebuchet) {
            throw new Error("Trebuchet can only attack cities");
        }
    }

    const targetOwner = action.targetType === "Unit"
        ? state.units.find(u => u.id === action.targetId)?.ownerId
        : state.cities.find(c => c.id === action.targetId)?.ownerId;
    // Skip war check for native units (owned by "natives" special ID) - always attackable
    if (targetOwner && targetOwner !== action.playerId && targetOwner !== "natives") {
        const cityState = getCityStateByOwnerId(state, targetOwner);
        if (cityState) {
            ensureCityStateWar(state, targetOwner, action.playerId);
        } else {
            ensureWar(state, action.playerId, targetOwner);
        }
    }

    const attackerCanCaptureCity = attackerStats.canCaptureCity && !attacker.isCityStateLevy;

    if (action.targetType === "Unit") {
        let defender = getUnitOrThrow(state, action.targetId, "Defender not found");

        // If defender is garrisoned in a friendly city, redirect attack to the city.
        const cityAtLocation = state.cities.find(c => hexEquals(c.coord, defender.coord));
        if (cityAtLocation && cityAtLocation.ownerId === defender.ownerId) {
            return handleAttack(state, {
                ...action,
                targetId: cityAtLocation.id,
                targetType: "City",
            });
        }

        // Smart Stack Attack: If targeting a Settler, check for ANY military unit on the same tile
        // This handles both linked escorts AND unlinked military units (e.g., after capturing a settler)
        if (defender.type === UnitType.Settler) {
            // First check for any military unit on the same tile (linked or not)
            const militaryOnTile = state.units.find(u =>
                hexEquals(u.coord, defender.coord) &&
                u.id !== defender.id &&
                u.ownerId === defender.ownerId &&
                UNITS[u.type].domain !== UnitDomain.Civilian
            );

            if (militaryOnTile) {
                // Redirect attack to the military unit
                defender = militaryOnTile;
            } else {
                // Fall back to linked partner check for backwards compatibility
                const partner = resolveLinkedPartner(state, defender);
                if (partner && partner.ownerId === defender.ownerId && hexEquals(partner.coord, defender.coord)) {
                    const partnerStats = UNITS[partner.type];
                    if (partnerStats.domain !== "Civilian") {
                        // Redirect attack to the escort
                        defender = partner;
                    }
                }
            }
        }

        const dist = hexDistance(attacker.coord, defender.coord);
        if (dist > attackerStats.rng) throw new Error(`Target out of range (Distance: ${dist}, Range: ${attackerStats.rng})`);
        if (!hasClearLineOfSight(state, attacker.coord, defender.coord)) throw new Error("Line of sight blocked");

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

        // Calculate defender's effective defense with terrain and fortification
        const defenderStats = getEffectiveUnitStats(defender, state, attacker);
        let defensePower = defenderStats.def;
        const tile = tileLookup.get(hexToString(defender.coord));
        if (tile) {
            defensePower += TERRAIN[tile.terrain].defenseMod;
        }
        if (defender.state === UnitState.Fortified) defensePower += FORTIFY_DEFENSE_BONUS;

        // v3.0: Flanking Bonus
        // +1 Attack for each OTHER friendly military unit adjacent to defender
        const defenderNeighbors = getNeighbors(defender.coord);
        let flankingBonus = 0;
        for (const n of defenderNeighbors) {
            const friend = state.units.find(u =>
                hexEquals(u.coord, n) &&
                u.ownerId === action.playerId &&
                u.id !== attacker.id &&
                UNITS[u.type].domain !== "Civilian"
            );
            if (friend) flankingBonus += 1;
        }

        // v2.0: Civ 6-style damage formula
        const damageResult = calculateCiv6Damage(attackerStats.atk + flankingBonus, defensePower, state.seed);
        let damage = damageResult.damage;
        state.seed = damageResult.newSeed;

        // Difficulty combat bonus for AI attackers
        const attackerPlayer = state.players.find(p => p.id === attacker.ownerId);
        if (attackerPlayer?.isAI && state.difficulty) {
            const difficultyMultipliers: Record<string, number> = {
                Easy: 0.9,
                Normal: 1.0,
                Hard: 1.1,
                Expert: 1.2
            };
            damage = Math.floor(damage * (difficultyMultipliers[state.difficulty] ?? 1.0));
        }

        defender.hp -= damage;
        defender.lastDamagedOnTurn = state.turn;
        attacker.hasAttacked = true;
        attacker.movesLeft = 0;
        attacker.state = UnitState.Normal;

        // Native combat triggers
        if (isNativeUnit(defender)) {
            // Trigger aggro for the camp when a native is attacked
            triggerNativeAggro(state, defender, action.playerId);

            // Trigger retreat when native takes damage
            triggerNativeRetreat(state, defender);
        }

        // v2.0: Melee return damage - defender counter-attacks if alive and attacker is melee
        if (defender.hp > 0 && attackerStats.rng === 1) {
            // Calculate attacker's defense with terrain (attacker is not fortified since they attacked)
            let attackerDefense = attackerStats.def;
            const attackerTile = tileLookup.get(hexToString(attacker.coord));
            if (attackerTile) attackerDefense += TERRAIN[attackerTile.terrain].defenseMod;

            const { damage: returnDamage, newSeed: returnSeed } = calculateCiv6Damage(
                defenderStats.atk, attackerDefense, state.seed
            );
            state.seed = returnSeed;
            attacker.hp -= returnDamage;
            attacker.lastDamagedOnTurn = state.turn;

            // If attacker dies from return damage
            if (attacker.hp <= 0) {
                state.units = state.units.filter(u => u.id !== attacker.id);
                return state;
            }

            attacker.lastDamagedOnTurn = state.turn;
        }

        if (defender.hp <= 0) {
            const defenderCoord = defender.coord;
            const wasNative = isNativeUnit(defender);
            const defenderCampId = defender.campId;

            // v1.1: Aetherian Vanguard "Scavenger Doctrine" - Gain Science from kills
            if (attacker.ownerId === action.playerId) {
                const player = state.players.find(p => p.id === attacker.ownerId);
                if (player && player.civName === "AetherianVanguard" && player.currentTech) {
                    const victimStats = UNITS[defender.type as UnitType];
                    // v1.9: Reworked - Base on combat power (ATK + DEF + HP/2), not cost
                    // v2.7: Nerfed multiplier from 0.5 to 0.2 - Prevent snowballing
                    // v5.14: Buffed to 0.3 (was 0.2) per user request
                    // v6.6k: Buffed to 0.5 to help Aetherian win rate (was 16.9%)
                    // v6.6m: Buffed to 0.7 to further help Aetherian (was 16.4%)
                    const combatPower = victimStats.atk + victimStats.def + Math.floor(victimStats.hp / 2);
                    const scienceGain = Math.floor(combatPower * 0.8); // v1.0.5: Buffed from 0.6 to 0.8 (analysis showed 14.6% win rate)
                    if (scienceGain > 0) {
                        player.currentTech.progress += scienceGain;
                        // Track for simulation analysis
                        if (!player.scavengerDoctrineStats) {
                            player.scavengerDoctrineStats = { kills: 0, scienceGained: 0 };
                        }
                        player.scavengerDoctrineStats.kills++;
                        player.scavengerDoctrineStats.scienceGained += scienceGain;
                    }
                }

                // Track Titan kills for AetherianVanguard analysis
                if (attacker.type === UnitType.Titan && player) {
                    if (!player.titanStats) {
                        player.titanStats = { kills: 0, cityCaptures: 0, deathballCaptures: 0, totalSupportAtCaptures: 0, escortsMarkedTotal: 0, escortsAtCaptureTotal: 0, totalMilitaryAtCaptures: 0, supportByCapture: [] };
                    }
                    player.titanStats.kills++;
                }
            }

            // Unlink partner if defender dies
            unlinkPair(defender, resolveLinkedPartner(state, defender));

            state.units = state.units.filter(u => u.id !== defender.id);

            // Handle native camp clearing
            if (wasNative && defenderCampId) {
                handleNativeDeath(state, defenderCampId, action.playerId);
            }


            // Move Attacker into tile if melee
            if (attackerStats.rng === 1 && dist === 1) {
                const cityAtLocation = state.cities.find(c => hexEquals(c.coord, defenderCoord));
                const isUnconqueredEnemyCity = cityAtLocation &&
                    cityAtLocation.ownerId !== action.playerId &&
                    cityAtLocation.hp > 0;

                if (!isUnconqueredEnemyCity) {
                    attacker.coord = defenderCoord;
                    attacker.movesLeft = 0;

                    // Capture any remaining civilians on the tile
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
        if (dist > attackerStats.rng) throw new Error(`Target out of range (Distance: ${dist}, Range: ${attackerStats.rng})`);
        if (!hasClearLineOfSight(state, attacker.coord, city.coord)) throw new Error("Line of sight blocked");

        // v6.7: Find the garrison with the highest range (for best retaliation) when multiple units on city tile
        // v7.10: Exclude Scouts from garrison - they don't provide defense/attack bonuses
        // v1.0.3: Exclude Trebuchets from garrison - siege weapons cannot garrison
        const garrisonCandidates = state.units.filter(u => hexEquals(u.coord, city.coord) && u.ownerId === city.ownerId && u.type !== UnitType.Settler && u.type !== UnitType.Scout && u.type !== UnitType.Trebuchet);
        const garrison = garrisonCandidates.length > 0
            ? garrisonCandidates.reduce((best, u) => UNITS[u.type].rng > UNITS[best.type].rng ? u : best)
            : undefined;
        let garrisonDefenseBonus = 0;
        let garrisonAttackBonus = 0;
        let garrisonRetaliationRange = 0;

        if (garrison) {
            const garrisonStats = UNITS[garrison.type];
            if (garrisonStats.rng >= 2) {
                garrisonDefenseBonus = 1;
                garrisonAttackBonus = 3;
                garrisonRetaliationRange = 2;
            } else {
                garrisonDefenseBonus = 2;
                garrisonAttackBonus = 1;
                garrisonRetaliationRange = 1;
            }
        }

        // v5.10: Bulwark Return Damage Fix
        // If city has Bulwark, it acts as a stationary garrison for retaliation purposes.
        // v5.11: DISABLED per user request (logic kept for potential re-enable)
        const hasBulwark = false; // city.buildings.includes(BuildingType.Bulwark);
        if (hasBulwark) {
            const bulwarkStats = BUILDINGS[BuildingType.Bulwark];
            // Add Bulwark's cityAttackBonus (4) to the base
            garrisonAttackBonus += (bulwarkStats.cityAttackBonus || 0);
            // Ensure range is at least 2 (Bulwark is ranged)
            garrisonRetaliationRange = Math.max(garrisonRetaliationRange, 2);
            // Defense bonus is handled in general building loop below, so don't add it here to avoid double counting
        }

        // v2.0: Civ 6-style damage formula for city attacks
        // v5.0: Dynamic defense calculation from all buildings
        let defensePower = CITY_DEFENSE_BASE + Math.floor(city.pop / 2) + garrisonDefenseBonus;
        for (const b of city.buildings) {
            if (BUILDINGS[b].defenseBonus) defensePower += BUILDINGS[b].defenseBonus;
        }


        // v3.0: Flanking Bonus vs City
        // +1 Attack for each OTHER friendly military unit adjacent to city
        const cityNeighbors = getNeighbors(city.coord);
        let cityFlankingBonus = 0;
        for (const n of cityNeighbors) {
            const friend = state.units.find(u =>
                hexEquals(u.coord, n) &&
                u.ownerId === action.playerId &&
                u.id !== attacker.id &&
                UNITS[u.type].domain !== "Civilian"
            );
            if (friend) cityFlankingBonus += 1;
        }

        // v1.8: RiverLeague "River Siege" - +1 Attack when attacking cities
        const player = state.players.find(p => p.id === action.playerId);
        const riverSiegeBonus = player?.civName === "RiverLeague" ? 1 : 0;

        // v1.0.3: Trebuchet Siege Bonus - +4 Attack vs cities
        const trebuchetBonus = attacker.type === UnitType.Trebuchet ? TREBUCHET_CITY_ATTACK_BONUS : 0;

        const damageResult = calculateCiv6Damage(attackerStats.atk + cityFlankingBonus + riverSiegeBonus + trebuchetBonus, defensePower, state.seed);
        let damage = damageResult.damage;
        state.seed = damageResult.newSeed;

        // Difficulty combat bonus for AI attackers
        if (player?.isAI && state.difficulty) {
            const difficultyMultipliers: Record<string, number> = {
                Easy: 0.9,
                Normal: 1.0,
                Hard: 1.1,
                Expert: 1.2
            };
            damage = Math.floor(damage * (difficultyMultipliers[state.difficulty] ?? 1.0));
        }

        let appliedDamage = damage;

        // v6.0: Shield Absorption
        if (city.shield && city.shield > 0) {
            if (appliedDamage <= city.shield) {
                city.shield -= appliedDamage;
                appliedDamage = 0;
            } else {
                appliedDamage -= city.shield;
                city.shield = 0;
            }
        }

        city.hp = Math.max(0, city.hp - appliedDamage);
        city.lastDamagedOnTurn = state.turn;
        attacker.hasAttacked = true;
        attacker.movesLeft = 0;

        // City retaliation via garrison OR Bulwark
        if ((garrison || hasBulwark) && dist <= garrisonRetaliationRange && !attacker.retaliatedAgainstThisTurn) {
            // v2.0: Civ 6-style retaliation damage
            const cityAttackPower = CITY_ATTACK_BASE +
                (city.buildings.includes(BuildingType.CityWard) ? CITY_WARD_ATTACK_BONUS : 0) +
                garrisonAttackBonus;

            let attackerDefense = getEffectiveUnitStats(attacker, state).def;
            const attackerTile = tileLookup.get(hexToString(attacker.coord));
            if (attackerTile) attackerDefense += TERRAIN[attackerTile.terrain].defenseMod;
            if (attacker.state === UnitState.Fortified) attackerDefense += FORTIFY_DEFENSE_BONUS;

            const { damage: retaliationDamage, newSeed: retSeed } = calculateCiv6Damage(
                cityAttackPower, attackerDefense, state.seed
            );
            state.seed = retSeed;

            // v1.0.3: Trebuchet takes 50% less damage from city retaliation
            let finalRetaliationDamage = retaliationDamage;
            if (attacker.type === UnitType.Trebuchet) {
                finalRetaliationDamage = Math.floor(retaliationDamage * TREBUCHET_CITY_RETALIATION_REDUCTION);
            }

            attacker.hp -= finalRetaliationDamage;
            attacker.retaliatedAgainstThisTurn = true;

            if (attacker.hp <= 0) {
                state.units = state.units.filter(u => u.id !== attacker.id);
                return state;
            }
        }

        if (city.hp <= 0) {
            if (attackerCanCaptureCity && dist === 1) {
                const cityCoord = city.coord;

                // v7.10: Remove ALL enemy units on city tile (except Air), not just garrison
                // This ensures Scouts and other non-garrison units are also destroyed on capture
                const enemyUnitsOnCity = state.units.filter(u =>
                    hexEquals(u.coord, cityCoord) &&
                    u.ownerId === city.ownerId &&
                    UNITS[u.type].domain !== UnitDomain.Air
                );
                for (const enemy of enemyUnitsOnCity) {
                    unlinkPair(enemy, resolveLinkedPartner(state, enemy));
                }
                state.units = state.units.filter(u =>
                    !enemyUnitsOnCity.some(e => e.id === u.id)
                );

                captureCity(state, city, action.playerId);
                removeCityStateByCityId(state, city.id);
                logEvent(state, HistoryEventType.CityCaptured, action.playerId, { cityId: city.id, cityName: city.name, coord: city.coord, isCapital: city.isCapital });

                // Track Titan city captures for analysis
                if (attacker.type === UnitType.Titan) {
                    const player = state.players.find(p => p.id === action.playerId);
                    if (player) {
                        if (!player.titanStats) {
                            player.titanStats = { kills: 0, cityCaptures: 0, deathballCaptures: 0, totalSupportAtCaptures: 0, escortsMarkedTotal: 0, escortsAtCaptureTotal: 0, totalMilitaryAtCaptures: 0, supportByCapture: [] };
                        }
                        player.titanStats.cityCaptures++;

                        // Count support units near the captured city for deathball analysis
                        // v6.6i: Range 4 to match safe staging distance (escorts at 2-4)
                        const nearbyMilitary = state.units.filter(u =>
                            u.ownerId === action.playerId &&
                            u.id !== attacker.id &&
                            UNITS[u.type].domain !== "Civilian" &&
                            hexDistance(u.coord, city.coord) <= 4
                        );
                        const supportCount = nearbyMilitary.length;
                        const escortCount = nearbyMilitary.filter(u => u.isTitanEscort).length;

                        player.titanStats.totalSupportAtCaptures += supportCount;
                        player.titanStats.escortsAtCaptureTotal += escortCount;
                        player.titanStats.totalMilitaryAtCaptures += supportCount + 1; // +1 for Titan
                        player.titanStats.supportByCapture.push(supportCount); // v6.6j: Track per-capture
                    }
                } else {
                    // Track deathball captures (non-Titan city captures by AetherianVanguard)
                    const player = state.players.find(p => p.id === action.playerId);
                    const hasTitan = state.units.some(u => u.ownerId === action.playerId && u.type === UnitType.Titan);

                    if (player && player.civName === "AetherianVanguard" && hasTitan) {
                        if (!player.titanStats) {
                            player.titanStats = { kills: 0, cityCaptures: 0, deathballCaptures: 0, totalSupportAtCaptures: 0, escortsMarkedTotal: 0, escortsAtCaptureTotal: 0, totalMilitaryAtCaptures: 0, supportByCapture: [] };
                        }
                        player.titanStats.deathballCaptures++;
                    }
                }

                attacker.coord = cityCoord;
                attacker.movesLeft = 0;
            }
        }
    }

    return state;
}

/**
 * Handle native unit death - check if camp should be cleared and grant rewards
 */
function handleNativeDeath(state: GameState, campId: string, killerPlayerId: string): void {
    const remainingUnits = state.units.filter(u => u.campId === campId);
    if (remainingUnits.length > 0) return; // Camp still has defenders

    clearNativeCamp(state, campId, killerPlayerId);
}
