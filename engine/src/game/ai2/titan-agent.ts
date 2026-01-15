import { GameState, UnitType, BuildingType, TechId } from "../../core/types.js";
import { hexDistance, hexEquals, hexToString } from "../../core/hex.js";
import { UNITS } from "../../core/constants.js";
import { tryAction } from "../ai/shared/actions.js";
import { getCombatPreviewUnitVsCity } from "../helpers/combat-preview.js";
import { getUnitMaxMoves } from "../helpers/combat.js"; // v9.15: For actual movement with bonuses
import { buildLookupCache } from "../helpers/lookup-cache.js";
import { getAiProfileV2 } from "./rules.js";
import { getAiMemoryV2, setAiMemoryV2 } from "./memory.js";
import { pickBest } from "./util.js";
import { moveToward, moveTowardAllMoves, findEngagementPath, nearestFriendlyCity } from "./movement.js";
import { bestAttackForUnit } from "./combat-eval.js";
import { TacticalContext } from "./tactical-context.js";
import { warEnemyIds } from "./enemies.js";
import { isMilitary } from "./unit-roles.js";
import { aiInfo } from "../ai/debug-logging.js";

export function followTitan(state: GameState, playerId: string): GameState {
    let next = state;
    const titan = next.units.find(u => u.ownerId === playerId && u.type === UnitType.Titan);
    if (!titan) return next;

    const enemies = warEnemyIds(next, playerId);
    if (enemies.size === 0) return next;

    const enemyCities = next.cities.filter(c => enemies.has(c.ownerId));
    if (enemyCities.length === 0) return next;

    // v9.10: Use Titan's actual target from memory so deathball follows where Titan is actually going
    const memory = getAiMemoryV2(next, playerId);
    let targetCity = memory.titanFocusCityId
        ? next.cities.find(c => c.id === memory.titanFocusCityId && enemies.has(c.ownerId))
        : null;

    // Fallback to Titan's position if no memorized target
    if (!targetCity) {
        targetCity = pickBest(enemyCities, c => -hexDistance(titan.coord, c.coord))?.item ?? null;
    }

    // v9.15 FIX: Escorts follow TITAN's position, not the target city
    // This keeps escorts near Titan even when it retreats or changes direction
    const rallyPoint = titan.coord;
    const SAFE_STAGING_DISTANCE = 3;

    const myCities = next.cities.filter(c => c.ownerId === playerId);
    const potentialEscorts = next.units.filter(u => {
        if (u.ownerId !== playerId) return false;
        if (!isMilitary(u)) return false;
        if (u.type === UnitType.Titan) return false;
        if (u.movesLeft <= 0) return false;
        if (u.hasAttacked) return false;
        if (u.isHomeDefender) return false;
        const isGarrisoned = myCities.some(c => hexEquals(c.coord, u.coord));
        if (isGarrisoned) return false;
        const isInRing = myCities.some(c => hexDistance(c.coord, u.coord) === 1);
        if (isInRing) return false;
        const distToTarget = hexDistance(u.coord, rallyPoint);
        if (distToTarget <= SAFE_STAGING_DISTANCE && distToTarget >= 2) return false;
        return true;
    }).sort((a, b) => {
        const aRider = a.type === UnitType.ArmyRiders ? 0 : 1;
        const bRider = b.type === UnitType.ArmyRiders ? 0 : 1;
        if (aRider !== bRider) return aRider - bRider;
        return hexDistance(a.coord, rallyPoint) - hexDistance(b.coord, rallyPoint);
    });

    // v9.15 FIX: Only clear escort flags for units that are FAR from Titan (>6 hexes)
    // Previously all flags were cleared, causing escorts to lose their role if they fell behind
    next.units.filter(u => u.ownerId === playerId).forEach(u => {
        if (hexDistance(u.coord, titan.coord) > 6) {
            u.isTitanEscort = false;
        }
    });

    let escortsMoved = 0;
    for (const escort of potentialEscorts) {
        const liveEscort = next.units.find(u => u.id === escort.id);
        if (!liveEscort || liveEscort.movesLeft <= 0) continue;

        const currentDist = hexDistance(liveEscort.coord, rallyPoint);
        if (currentDist >= 2 && currentDist <= SAFE_STAGING_DISTANCE) {
            liveEscort.isTitanEscort = true;
            escortsMoved++;
            continue;
        }

        const before = next;
        next = moveToward(next, playerId, liveEscort, rallyPoint);
        if (next !== before) {
            const movedUnit = next.units.find(u => u.id === escort.id);
            if (movedUnit) {
                movedUnit.isTitanEscort = true;
            }
            escortsMoved++;
        }
    }

    let escortsMarked = 0;
    next.units.filter(u =>
        u.ownerId === playerId &&
        isMilitary(u) &&
        u.type !== UnitType.Titan &&
        hexDistance(u.coord, rallyPoint) >= 2 &&
        hexDistance(u.coord, rallyPoint) <= 4
    ).forEach(u => {
        u.isTitanEscort = true;
        escortsMarked++;
    });

    const player = next.players.find(p => p.id === playerId);
    if (player) {
        if (!player.titanStats) {
            player.titanStats = { kills: 0, cityCaptures: 0, deathballCaptures: 0, totalSupportAtCaptures: 0, escortsMarkedTotal: 0, escortsAtCaptureTotal: 0, totalMilitaryAtCaptures: 0, supportByCapture: [] };
        }
        player.titanStats.escortsMarkedTotal += escortsMarked + escortsMoved;
    }

    if (escortsMoved > 0 || escortsMarked > 0) {
        const targetLabel = targetCity ? `city ${targetCity.name}` : `Titan`;
        aiInfo(`[TITAN ESCORT] ${escortsMoved} moved, ${escortsMarked} already nearby -> ${escortsMoved + escortsMarked} total escorts marked for ${targetLabel}`);
    }

    return next;
}

export function runPreTitanRally(state: GameState, playerId: string): GameState {
    let next = state;
    const memory = getAiMemoryV2(next, playerId);
    const myCities = next.cities.filter(c => c.ownerId === playerId);
    const hasTitan = next.units.some(u => u.ownerId === playerId && u.type === UnitType.Titan);
    const player = next.players.find(p => p.id === playerId);
    const researchingSteamForges = player?.currentTech?.id === TechId.SteamForges;

    if (memory.titanCoreCityId) {
        const rallyCity = next.cities.find(c => c.id === memory.titanCoreCityId);
        const buildingCore = rallyCity?.currentBuild?.type === "Building" && rallyCity?.currentBuild?.id === BuildingType.TitansCore;
        const stillValid = rallyCity &&
            rallyCity.ownerId === playerId &&
            (buildingCore || researchingSteamForges) &&
            !hasTitan;

        if (!stillValid) {
            next = setAiMemoryV2(next, playerId, { ...memory, titanCoreCityId: undefined });
        }
    }

    const titanCoreCity = myCities.find(c =>
        c.currentBuild?.type === "Building" && c.currentBuild?.id === BuildingType.TitansCore
    );
    const potentialRallyCity = titanCoreCity || (researchingSteamForges && !hasTitan
        ? myCities.find(c => c.isCapital) || myCities[0]
        : undefined
    );

    const currentMemory = getAiMemoryV2(next, playerId);
    if (potentialRallyCity && !hasTitan && currentMemory.titanCoreCityId !== potentialRallyCity.id) {
        next = setAiMemoryV2(next, playerId, { ...currentMemory, titanCoreCityId: potentialRallyCity.id });
    }

    const updatedMemory = getAiMemoryV2(next, playerId);
    if (updatedMemory.titanCoreCityId && !hasTitan) {
        const rallyCity = next.cities.find(c => c.id === updatedMemory.titanCoreCityId);
        if (rallyCity) {
            const garrisonIds = new Set<string>();
            for (const city of myCities) {
                if (city.id === rallyCity.id) continue;
                const garrisons = next.units.filter(u =>
                    u.ownerId === playerId &&
                    isMilitary(u) &&
                    hexEquals(u.coord, city.coord)
                );
                garrisons.forEach(g => garrisonIds.add(g.id));

                const ringDefenders = next.units.filter(u =>
                    u.ownerId === playerId &&
                    isMilitary(u) &&
                    hexDistance(u.coord, city.coord) === 1
                );
                ringDefenders.forEach(r => garrisonIds.add(r.id));
            }

            const militaryToRally = next.units.filter(u =>
                u.ownerId === playerId &&
                u.movesLeft > 0 &&
                isMilitary(u) &&
                u.type !== UnitType.Titan &&
                !garrisonIds.has(u.id) &&
                !u.isHomeDefender &&
                hexDistance(u.coord, rallyCity.coord) > 1
            ).sort((a, b) =>
                hexDistance(a.coord, rallyCity.coord) - hexDistance(b.coord, rallyCity.coord)
            );

            for (const unit of militaryToRally) {
                const liveUnit = next.units.find(u => u.id === unit.id);
                if (!liveUnit || liveUnit.movesLeft <= 0) continue;
                next = moveToward(next, playerId, liveUnit, rallyCity.coord);
            }

            aiInfo(`[DEATHBALL RALLY] ${playerId} rallying ${militaryToRally.length} units to Titan Core city (${garrisonIds.size} garrisons held back)`);
        }
    }

    return next;
}

export function runTitanAgent(state: GameState, playerId: string, ctx?: TacticalContext): GameState {
    let next = state;
    const titan = next.units.find(u => u.ownerId === playerId && u.type === UnitType.Titan);
    if (!titan) return next;

    const enemies = ctx?.enemyIds ?? warEnemyIds(next, playerId);
    if (enemies.size === 0) return next;

    const profile = ctx?.profile ?? getAiProfileV2(next, playerId);
    const memory = ctx?.memory ?? getAiMemoryV2(next, playerId);
    const createLookupCache = ctx?.createLookupCache ?? buildLookupCache;

    const enemyCities = next.cities.filter(c => enemies.has(c.ownerId));
    if (enemyCities.length === 0) return next;

    const focusCity = memory.focusCityId ? next.cities.find(c => c.id === memory.focusCityId) : undefined;
    if (focusCity && enemies.has(focusCity.ownerId)) {
        next = setAiMemoryV2(next, playerId, { ...memory, titanFocusCityId: focusCity.id });
    }

    aiInfo(`[TITAN LOG] ${playerId} Turn ${next.turn} | HP: ${titan.hp}/${UNITS[UnitType.Titan].hp} | Moves: ${titan.movesLeft} | At: (${titan.coord.q},${titan.coord.r})`);

    let targetCityId = memory.titanFocusCityId;
    if (targetCityId) {
        const stillValid = enemyCities.some(c => c.id === targetCityId);
        if (!stillValid) targetCityId = undefined;
    }

    if (!targetCityId) {
        // v9.10: Capital-focused path attack strategy
        // 1. Find the nearest enemy capital as the ultimate goal
        // 2. Target any enemy cities along the path to that capital
        // 3. This ensures we capture cities en route, not bypass them

        const enemyCapitals = enemyCities.filter(c => c.isCapital);
        const nearestCapital = enemyCapitals.length > 0
            ? pickBest(enemyCapitals, c => -hexDistance(titan.coord, c.coord))?.item
            : null;

        if (nearestCapital) {
            const distToCapital = hexDistance(titan.coord, nearestCapital.coord);

            // Check if any non-capital enemy city is "on the way" to the capital
            // A city is "on the way" if capturing it adds up to 2 extra turns (6 hexes at Titan's 3 move)
            const MAX_DETOUR_HEXES = 6; // 2 turns × 3 move
            const citiesOnPath = enemyCities.filter(c => {
                if (c.isCapital) return false;
                const distToCity = hexDistance(titan.coord, c.coord);
                const cityToCapital = hexDistance(c.coord, nearestCapital.coord);
                const detour = (distToCity + cityToCapital) - distToCapital;
                return detour <= MAX_DETOUR_HEXES;
            });

            if (citiesOnPath.length > 0) {
                // Target the closest city on the path
                const nearestOnPath = pickBest(citiesOnPath, c => -hexDistance(titan.coord, c.coord))?.item;
                if (nearestOnPath) {
                    aiInfo(`[TITAN LOG] Targeting ${nearestOnPath.name} (on path to capital ${nearestCapital.name})`);
                    targetCityId = nearestOnPath.id;
                }
            }

            // If no cities on path, target the capital directly
            if (!targetCityId) {
                aiInfo(`[TITAN LOG] Targeting capital ${nearestCapital.name} directly`);
                targetCityId = nearestCapital.id;
            }
        } else {
            // No capitals left - target nearest city
            const nearest = pickBest(enemyCities, c => -hexDistance(titan.coord, c.coord))?.item;
            if (nearest) {
                aiInfo(`[TITAN LOG] No capitals - targeting nearest city ${nearest.name}`);
                targetCityId = nearest.id;
            }
        }
    }

    if (!targetCityId) return next;
    next = setAiMemoryV2(next, playerId, { ...memory, titanFocusCityId: targetCityId });

    const targetCity = next.cities.find(c => c.id === targetCityId);
    if (!targetCity) return next;

    const titanHpFrac = titan.maxHp ? titan.hp / titan.maxHp : (titan.hp / UNITS[titan.type].hp);
    const onFriendlyCity = next.cities.some(c => c.ownerId === playerId && hexEquals(c.coord, titan.coord));

    // v9.10: Lowered from 0.8 to 0.65 - Titan was waiting too long in cities
    const TITAN_HEAL_THRESHOLD = 0.65;
    if (onFriendlyCity && titanHpFrac < TITAN_HEAL_THRESHOLD) {
        aiInfo(`[TITAN LOG] Healing holdout in city (HP: ${Math.round(titanHpFrac * 100)}% < ${TITAN_HEAL_THRESHOLD * 100}% threshold)`);
        return next;
    }

    if (titan.linkedUnitId) {
        const unlinked = tryAction(next, { type: "UnlinkUnits", playerId, unitId: titan.id });
        if (unlinked !== next) {
            next = unlinked;
            const newTitan = next.units.find(u => u.id === titan.id);
            if (!newTitan) return next;
        }
    }

    // v9.11: Raised from 0.2 to 0.4 - retreat EARLIER to survive with 40% HP
    // 82% death rate was because Titan didn't retreat until nearly dead
    if (titanHpFrac < 0.4 && !onFriendlyCity) {
        aiInfo(`[TITAN LOG] Retreating early (HP: ${Math.round(titanHpFrac * 100)}% < 40%) - survival priority!`);
        const safe = nearestFriendlyCity(next, playerId, titan.coord);
        if (safe) {
            return moveTowardAllMoves(next, playerId, titan.id, safe, 6, createLookupCache(next));
        }
    }

    // v9.16: Increased radius from 2 to 3 hexes - escorts 3 hexes away should count as support
    const supportCount = next.units.filter(u =>
        u.ownerId === playerId &&
        isMilitary(u) &&
        u.type !== UnitType.Titan &&
        getUnitMaxMoves(u, next) >= 2 && // Actual movement with bonuses
        hexDistance(u.coord, titan.coord) <= 3  // v9.16: Extended from 2 to 3
    ).length;
    const isAetherian = profile.civName === "AetherianVanguard";

    // v9.10: Reduced from 5 to 4 to match the 4 Riders built before Titan's Core
    const requiredSupport = isAetherian ? 4 : (titanHpFrac < 0.55 ? 4 : 3);
    const allowDeepPush = supportCount >= requiredSupport;

    // v9.14: BALANCED - Retreat only when BOTH alone AND damaged
    // Previous version retreated too much, causing 0 wins on Standard/Large/Huge
    // Now: Keep fighting unless support is critical AND we've taken damage
    const criticalSupportLevel = 2;
    const hasTakenDamage = titanHpFrac < 0.9; // 90% = taken some damage
    if (supportCount < criticalSupportLevel && !onFriendlyCity && hasTakenDamage) {
        aiInfo(`[TITAN LOG] RETREAT - Support critical (${supportCount}) AND damaged (${Math.round(titanHpFrac * 100)}%)`);
        const safe = nearestFriendlyCity(next, playerId, titan.coord);
        if (safe) {
            return moveTowardAllMoves(next, playerId, titan.id, safe, 6, createLookupCache(next));
        }
    }

    if (!allowDeepPush) {
        aiInfo(`[TITAN LOG] Waiting for support (Current: ${supportCount}/${requiredSupport})`);
    }

    let safety = 0;
    const visitedTiles = new Set<string>();
    visitedTiles.add(hexToString(titan.coord));

    while (safety++ < 8) {
        const live = next.units.find(u => u.id === titan.id);
        const cityNow = next.cities.find(c => c.id === targetCityId);
        if (!live || !cityNow) return next;
        if (live.movesLeft <= 0) return next;

        const dist = hexDistance(live.coord, cityNow.coord);

        if (!live.hasAttacked) {
            const bestAttack = bestAttackForUnit(next, playerId, live, enemies);
            if (bestAttack && bestAttack.score > 0) {
                const isBlocker = bestAttack.action.targetType === "Unit" &&
                    hexDistance(live.coord, next.units.find(u => u.id === bestAttack.action.targetId)!.coord) <= 1;

                if (bestAttack.score > 50 || isBlocker) {
                    aiInfo(`[TITAN LOG] Opportunistic Attack on ${bestAttack.action.targetType} (Score: ${bestAttack.score})`);
                    const attacked = tryAction(next, bestAttack.action);
                    if (attacked !== next) {
                        next = attacked;
                        continue;
                    }
                }
            }
        }

        if (cityNow.hp <= 0 && dist === 1 && UNITS[live.type].canCaptureCity) {
            const moved = tryAction(next, { type: "MoveUnit", playerId, unitId: live.id, to: cityNow.coord });
            if (moved !== next) {
                next = moved;
                continue;
            }
        }

        if (dist > 1) {
            if (!allowDeepPush) {
                aiInfo(`[TITAN LOG] Holding position (Waiting for support)`);
                break;
            }
            const path = findEngagementPath(live.coord, cityNow.coord, live, next, createLookupCache(next));
            if (path && path.length > 0) {
                const step = path[0];
                const stepKey = hexToString(step);

                if (visitedTiles.has(stepKey)) {
                    break;
                }

                const moved = tryAction(next, { type: "MoveUnit", playerId, unitId: live.id, to: step });
                if (moved !== next) {
                    aiInfo(`[TITAN LOG] Moving to (${step.q},${step.r}) toward target`);
                    next = moved;
                    visitedTiles.add(stepKey);
                    continue;
                }
                if (!live.hasAttacked) {
                    const blocker =
                        next.units.find(u => u.ownerId !== playerId && hexEquals(u.coord, step)) ??
                        next.units.find(u => u.ownerId !== playerId && hexDistance(u.coord, live.coord) <= UNITS[live.type].rng);
                    if (blocker && !onFriendlyCity) {
                        const attacked = tryAction(next, { type: "Attack", playerId, attackerId: live.id, targetType: "Unit", targetId: blocker.id });
                        if (attacked !== next) {
                            next = attacked;
                            continue;
                        }
                    }
                }
                break;
            } else {
                if (!live.hasAttacked) {
                    const blocker = next.units.find(u => u.ownerId !== playerId && hexDistance(u.coord, live.coord) <= UNITS[live.type].rng);
                    if (blocker && !onFriendlyCity) {
                        const attacked = tryAction(next, { type: "Attack", playerId, attackerId: live.id, targetType: "Unit", targetId: blocker.id });
                        if (attacked !== next) {
                            next = attacked;
                            continue;
                        }
                    }
                }
                break;
            }
        }

        if (!live.hasAttacked && dist <= UNITS[live.type].rng && cityNow.hp > 0) {
            const preview = getCombatPreviewUnitVsCity(next, live, cityNow);
            const ret = preview.returnDamage?.avg ?? 0;
            const wouldDie = ret >= live.hp;
            const dmg = preview.estimatedDamage.avg;
            const wouldCapture = (cityNow.hp - dmg) <= 0 && dist === 1;

            if ((wouldCapture || !wouldDie || profile.tactics.riskTolerance >= 0.8) && !onFriendlyCity) {
                const attacked = tryAction(next, { type: "Attack", playerId, attackerId: live.id, targetType: "City", targetId: cityNow.id });
                if (attacked !== next) {
                    next = attacked;
                    continue;
                }
            }
        }

        break;
    }

    const liveTitan = next.units.find(u => u.id === titan.id);
    if (!liveTitan || liveTitan.movesLeft <= 0) return next;

    if (!allowDeepPush) {
        if (titanHpFrac < 0.55) return next;
    }

    const cityNow = next.cities.find(c => c.id === targetCityId);
    if (!cityNow) return next;
    const path = findEngagementPath(liveTitan.coord, cityNow.coord, liveTitan, next, createLookupCache(next));
    const dest = (path && path.length > 0) ? path[path.length - 1] : cityNow.coord;

    // v9.16: Removed sprint mode - obsolete with Aetherian +1 movement bonus
    // Titan and escorts all have 3+ movement now, so just use remaining moves
    next = moveTowardAllMoves(next, playerId, liveTitan.id, dest, liveTitan.movesLeft);
    return next;
}
