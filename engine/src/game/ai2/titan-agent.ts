import { GameState, UnitType, BuildingType, TechId } from "../../core/types.js";
import { hexDistance, hexEquals, hexToString } from "../../core/hex.js";
import { UNITS } from "../../core/constants.js";
import { tryAction } from "../ai/shared/actions.js";
import { getCombatPreviewUnitVsCity } from "../helpers/combat-preview.js";
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

    const profile = getAiProfileV2(next, playerId);
    const targetCity = pickBest(enemyCities, c => {
        const dist = hexDistance(titan.coord, c.coord);
        const capital = c.isCapital ? 1 : 0;
        const finish = c.hp <= 0 ? 1 : 0;
        const hpFrac = c.maxHp ? c.hp / c.maxHp : 1;
        const momentum = -dist * (1.2 + profile.titan.momentum);
        return (capital * 25 * profile.titan.capitalHunt) + (finish * 30 * profile.titan.finisher) + ((1 - hpFrac) * 18) + momentum;
    })?.item;

    const rallyPoint = targetCity?.coord ?? titan.coord;
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

    next.units.filter(u => u.ownerId === playerId).forEach(u => {
        u.isTitanEscort = false;
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
        const best = pickBest(enemyCities, c => {
            const dist = hexDistance(titan.coord, c.coord);
            const capital = c.isCapital ? 1 : 0;
            const finish = c.hp <= 0 ? 1 : 0;
            const hpFrac = c.maxHp ? c.hp / c.maxHp : 1;
            const momentum = -dist * (1.2 + profile.titan.momentum);
            return (capital * 25 * profile.titan.capitalHunt) + (finish * 30 * profile.titan.finisher) + ((1 - hpFrac) * 18) + momentum;
        });
        targetCityId = best?.item?.id;
    }

    if (!targetCityId) return next;
    next = setAiMemoryV2(next, playerId, { ...memory, titanFocusCityId: targetCityId });

    const targetCity = next.cities.find(c => c.id === targetCityId);
    if (!targetCity) return next;

    const titanHpFrac = titan.maxHp ? titan.hp / titan.maxHp : (titan.hp / UNITS[titan.type].hp);
    const onFriendlyCity = next.cities.some(c => c.ownerId === playerId && hexEquals(c.coord, titan.coord));

    const TITAN_HEAL_THRESHOLD = 0.8;
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

    if (titanHpFrac < 0.2 && !onFriendlyCity) {
        const safe = nearestFriendlyCity(next, playerId, titan.coord);
        if (safe) {
            return moveTowardAllMoves(next, playerId, titan.id, safe, 6, createLookupCache(next));
        }
    }

    const supportCount = next.units.filter(u =>
        u.ownerId === playerId &&
        isMilitary(u) &&
        u.type !== UnitType.Titan &&
        hexDistance(u.coord, titan.coord) <= 2
    ).length;
    const isAetherian = profile.civName === "AetherianVanguard";

    const requiredSupport = isAetherian ? 5 : (titanHpFrac < 0.55 ? 4 : 3);
    const allowDeepPush = supportCount >= requiredSupport;

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

    const distToTarget = hexDistance(liveTitan.coord, cityNow.coord);
    const sprintMode = distToTarget <= 5;
    const allowedMoves = sprintMode ? 8 : 2;

    if (sprintMode) {
        aiInfo(`[TITAN LOG] SPRINTING to target (Dist: ${distToTarget})`);
    }

    next = moveTowardAllMoves(next, playerId, liveTitan.id, dest, allowedMoves);
    return next;
}
