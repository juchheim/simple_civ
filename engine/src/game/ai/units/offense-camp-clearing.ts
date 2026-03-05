import { aiInfo } from "../debug-logging.js";
import { getNeighbors, hexDistance, hexEquals } from "../../../core/hex.js";
import { GameState, HistoryEventType, UnitType } from "../../../core/types.js";
import { UNITS } from "../../../core/constants.js";
import { tryAction } from "../shared/actions.js";
import { findPath } from "../../helpers/pathfinding.js";
import { expectedDamageFrom, expectedDamageToUnit, isScoutType } from "./unit-helpers.js";
import { logEvent } from "../../history.js";
import { clearCampPrepAndRetarget } from "../camp-clearing.js";

const CAMP_PRESSURE_ATTACK_MIN_HEALTH_RATIO = 0.45;
const CAMP_PRESSURE_ATTACK_FINISHABLE_HP = 7;
const CAMP_PRESSURE_ATTACK_MEANINGFUL_TRADE_RATIO = 0.35;
const CAMP_READY_BAIL_LOCAL_RADIUS = 5;
const CAMP_READY_BAIL_POWER_RATIO = 0.8;
const CAMP_READY_REINFORCE_RADIUS = 9;
const CAMP_READY_REINFORCE_POWER_TARGET_RATIO = 0.82;
const CAMP_READY_REINFORCE_POWER_ARRIVAL_DISCOUNT = 0.7;

type CampReadyBailoutDecision = "None" | "Reinforce" | "Exit";

function getCampAttackers(state: GameState, playerId: string) {
    return state.units
        .filter(u =>
            u.ownerId === playerId &&
            !u.hasAttacked &&
            !isScoutType(u.type) &&
            UNITS[u.type].domain !== "Civilian" &&
            u.type !== UnitType.Titan
        )
        .sort((a, b) => UNITS[b.type].rng - UNITS[a.type].rng);
}

function shouldForceCampPressureAttack(
    state: GameState,
    playerId: string,
    attacker: GameState["units"][number],
    target: {
        unit: GameState["units"][number];
        dmg: number;
        counter: number;
    },
    campId: string,
): boolean {
    const healthRatio = attacker.maxHp > 0 ? attacker.hp / attacker.maxHp : 0;
    if (healthRatio < CAMP_PRESSURE_ATTACK_MIN_HEALTH_RATIO) return false;
    if (target.dmg <= 0) return false;

    const defendersRemaining = state.units.filter(unit => unit.campId === campId).length;
    const availableAttackers = getCampAttackers(state, playerId);
    const localAdvantage = availableAttackers.length + 1 >= defendersRemaining;
    if (!localAdvantage) return false;

    const followUpAttackers = availableAttackers.filter(other =>
        other.id !== attacker.id &&
        hexDistance(other.coord, target.unit.coord) <= UNITS[other.type].rng
    );
    if (followUpAttackers.length === 0) return false;

    const targetRemainingHp = target.unit.hp - target.dmg;
    if (targetRemainingHp <= CAMP_PRESSURE_ATTACK_FINISHABLE_HP) return true;
    return target.dmg >= Math.ceil(target.unit.maxHp * CAMP_PRESSURE_ATTACK_MEANINGFUL_TRADE_RATIO);
}

function estimateUnitPower(type: UnitType): number {
    const stats = UNITS[type];
    return (stats.atk * 1.8) + (stats.def * 1.1) + (stats.hp * 0.12) + (stats.rng * 1.25);
}

function getCampReadyBailoutDecision(
    state: GameState,
    playerId: string,
    camp: GameState["nativeCamps"][number],
): CampReadyBailoutDecision {
    const defenders = state.units.filter(unit => unit.campId === camp.id);
    if (defenders.length === 0) return "None";

    const friendlyMilitary = state.units.filter(unit =>
        unit.ownerId === playerId
        && !isScoutType(unit.type)
        && UNITS[unit.type].domain !== "Civilian"
        && unit.type !== UnitType.Titan
    );

    const localFriendly = friendlyMilitary.filter(unit => hexDistance(unit.coord, camp.coord) <= CAMP_READY_BAIL_LOCAL_RADIUS);
    if (localFriendly.length === 0) return "Exit";

    const localFriendlyPower = localFriendly.reduce((sum, unit) => sum + estimateUnitPower(unit.type), 0);
    const defenderPower = defenders.reduce((sum, unit) => sum + estimateUnitPower(unit.type), 0);
    const powerRatio = defenderPower > 0 ? (localFriendlyPower / defenderPower) : 1;
    if (powerRatio >= CAMP_READY_BAIL_POWER_RATIO) {
        return "None";
    }

    const attackers = getCampAttackers(state, playerId);
    const canKillThisTurn = attackers.some(attacker =>
        defenders.some(defender =>
            hexDistance(attacker.coord, defender.coord) <= UNITS[attacker.type].rng
            && expectedDamageToUnit(attacker, defender, state) >= defender.hp
        )
    );
    if (canKillThisTurn) {
        return "None";
    }

    const nearbyReinforcements = friendlyMilitary.filter(unit =>
        hexDistance(unit.coord, camp.coord) <= CAMP_READY_REINFORCE_RADIUS
        && hexDistance(unit.coord, camp.coord) > CAMP_READY_BAIL_LOCAL_RADIUS
    );
    if (nearbyReinforcements.length === 0) return "Exit";
    const reinforcementPower = nearbyReinforcements.reduce((sum, unit) => sum + estimateUnitPower(unit.type), 0);
    const projectedPower = localFriendlyPower + (reinforcementPower * CAMP_READY_REINFORCE_POWER_ARRIVAL_DISCOUNT);
    if (projectedPower >= defenderPower * CAMP_READY_REINFORCE_POWER_TARGET_RATIO) {
        return "Reinforce";
    }
    return "Exit";
}

function canAttackCampDefender(
    state: GameState,
    unit: GameState["units"][number],
    campId: string,
): boolean {
    return state.units.some(defender =>
        defender.campId === campId
        && hexDistance(unit.coord, defender.coord) <= UNITS[unit.type].rng
    );
}

function findCampEscapeHex(
    state: GameState,
    blocker: GameState["units"][number],
    current: GameState["units"][number],
    moveTarget: GameState["nativeCamps"][number]["coord"],
    campCoord: GameState["nativeCamps"][number]["coord"],
): GameState["units"][number]["coord"] | undefined {
    const candidates = getNeighbors(blocker.coord)
        .filter(coord => !hexEquals(coord, current.coord))
        .filter(coord => !state.units.some(unit => hexEquals(unit.coord, coord)))
        .map(coord => ({
            coord,
            path: findPath(blocker.coord, coord, blocker, state),
            distToTarget: hexDistance(coord, moveTarget),
            distToCamp: hexDistance(coord, campCoord),
        }))
        .filter(candidate => candidate.path.length === 1);

    candidates.sort((a, b) =>
        a.distToTarget - b.distToTarget
        || a.distToCamp - b.distToCamp
        || a.coord.q - b.coord.q
        || a.coord.r - b.coord.r
    );

    return candidates[0]?.coord;
}

function resolveCampFriendlyBlocker(
    state: GameState,
    playerId: string,
    current: GameState["units"][number],
    blockingUnit: GameState["units"][number],
    moveTarget: GameState["nativeCamps"][number]["coord"],
    targetCamp: GameState["nativeCamps"][number],
): { updatedState: GameState; movedCurrent: boolean } {
    let next = state;

    if (canAttackCampDefender(next, blockingUnit, targetCamp.id)) {
        return { updatedState: next, movedCurrent: false };
    }

    if (blockingUnit.movesLeft > 0) {
        const escape = findCampEscapeHex(next, blockingUnit, current, moveTarget, targetCamp.coord);
        if (escape) {
            const movedBlocker = tryAction(next, {
                type: "MoveUnit",
                playerId,
                unitId: blockingUnit.id,
                to: escape,
            });
            if (movedBlocker !== next) {
                next = movedBlocker;
            }
        }
    }
    return { updatedState: next, movedCurrent: false };
}

/**
 * Move military units toward a target native camp during camp clearing phases.
 * Called when player has active campClearingPrep in Gathering, Positioning, or Ready state.
 */
export function moveUnitsForCampClearing(state: GameState, playerId: string): GameState {
    let next = state;
    const player = next.players.find(p => p.id === playerId);
    if (!player?.campClearingPrep) return next;

    const phase = player.campClearingPrep.state;
    // Only move during Gathering, Positioning, or Ready phases
    if (phase !== "Gathering" && phase !== "Positioning" && phase !== "Ready") return next;

    const targetCamp = next.nativeCamps.find(c => c.id === player.campClearingPrep!.targetCampId);
    if (!targetCamp) return next;
    const campDefenders = () => next.units.filter(u => u.campId === targetCamp.id);

    // v1.1: Build set of city coordinates for garrison protection
    const myCityCoords = new Set(
        next.cities.filter(c => c.ownerId === playerId).map(c => `${c.coord.q},${c.coord.r}`)
    );

    // Get military units that can move toward camp (excluding garrisoned units)
    const units = next.units.filter(u =>
        u.ownerId === playerId &&
        u.movesLeft > 0 &&
        !isScoutType(u.type) &&
        UNITS[u.type].domain !== "Civilian" && u.type !== UnitType.Titan &&
        !myCityCoords.has(`${u.coord.q},${u.coord.r}`) // Don't pull garrisoned units
    );

    aiInfo(`[AI CAMP MOVE] ${playerId} moving ${units.length} units toward camp (${phase} phase)`);

    for (const unit of units) {
        const current = next.units.find(u => u.id === unit.id);
        if (!current || current.movesLeft <= 0) continue;

        const distToCamp = hexDistance(current.coord, targetCamp.coord);

        // If already at camp, done
        if (distToCamp === 0) continue;

        // During Ready phase, don't move if we're in attack range
        let moveTarget = targetCamp.coord;
        if (phase === "Ready") {
            const unitRange = UNITS[current.type].rng;
            const defenders = campDefenders();
            const defenderInRange = defenders.some(defender => hexDistance(current.coord, defender.coord) <= unitRange);
            if (defenderInRange) {
                aiInfo(`[AI CAMP ATTACK] ${playerId} ${current.type} in range of camp (${distToCamp} tiles)`);
                continue;
            }
            const nearestDefender = defenders
                .map(defender => ({
                    coord: defender.coord,
                    dist: hexDistance(current.coord, defender.coord),
                }))
                .sort((a, b) => a.dist - b.dist)[0];
            if (nearestDefender) {
                moveTarget = nearestDefender.coord;
            }
        }

        // Find path to camp
        let path = findPath(
            current.coord,
            moveTarget,
            current,
            next,
            undefined,
            phase === "Ready" ? { ignoreFriendlyBlockers: true } : undefined,
        );
        if (path.length === 0 && !hexEquals(moveTarget, targetCamp.coord)) {
            path = findPath(
                current.coord,
                targetCamp.coord,
                current,
                next,
                undefined,
                phase === "Ready" ? { ignoreFriendlyBlockers: true } : undefined,
            );
        }
        if (path.length === 0) continue;

        let step = path[0];

        // Check for friendly military on target tile (Stacking Limit)
        const unitsOnTarget = next.units.filter(u => hexEquals(u.coord, step));
        const friendlyMilitary = unitsOnTarget.some(u =>
            u.ownerId === playerId && UNITS[u.type].domain !== "Civilian"
        );
        if (friendlyMilitary) {
            if (phase !== "Ready") continue;

            const blockingUnit = unitsOnTarget.find(u =>
                u.ownerId === playerId && UNITS[u.type].domain !== "Civilian"
            );
            if (!blockingUnit) continue;

            const resolved = resolveCampFriendlyBlocker(next, playerId, current, blockingUnit, moveTarget, targetCamp);
            if (resolved.updatedState !== next) {
                next = resolved.updatedState;
            }
            if (resolved.movedCurrent) {
                continue;
            }

            const refreshedCurrent = next.units.find(u => u.id === current.id);
            if (!refreshedCurrent || refreshedCurrent.movesLeft <= 0) continue;
            let strictPath = findPath(refreshedCurrent.coord, moveTarget, refreshedCurrent, next);
            if (strictPath.length === 0 && !hexEquals(moveTarget, targetCamp.coord)) {
                strictPath = findPath(refreshedCurrent.coord, targetCamp.coord, refreshedCurrent, next);
            }
            if (strictPath.length === 0) continue;
            step = strictPath[0];
            const blockedAgain = next.units.some(u =>
                hexEquals(u.coord, step)
                && u.ownerId === playerId
                && UNITS[u.type].domain !== "Civilian"
            );
            if (blockedAgain) continue;
        }

        const moved = tryAction(next, { type: "MoveUnit", playerId, unitId: current.id, to: step });
        if (moved !== next) {
            next = moved;
            aiInfo(`[AI CAMP MOVE] ${playerId} ${current.type} moving toward camp (dist ${distToCamp}->${distToCamp - 1})`);
        }
    }

    return next;
}

/**
 * Attack native camp units. Called during Ready phase.
 * Prioritizes: archers before champion, lowest HP first, only attacks if worthwhile.
 */
export function attackCampTargets(state: GameState, playerId: string): GameState {
    let next = state;
    const player = next.players.find(p => p.id === playerId);
    if (!player?.campClearingPrep || player.campClearingPrep.state !== "Ready") return next;

    const targetCamp = next.nativeCamps.find(c => c.id === player.campClearingPrep!.targetCampId);
    if (!targetCamp) return next;

    // Get native units for this camp, sorted by priority
    const nativeUnits = next.units
        .filter(u => u.campId === targetCamp.id)
        .sort((a, b) => {
            // Archers before Champion
            if (a.type === UnitType.NativeChampion && b.type !== UnitType.NativeChampion) return 1;
            if (a.type !== UnitType.NativeChampion && b.type === UnitType.NativeChampion) return -1;
            // Lowest HP first
            return a.hp - b.hp;
        });

    if (nativeUnits.length === 0) {
        // Camp cleared! Remove prep
        aiInfo(`[AI CAMP] ${playerId} camp ${targetCamp.id} cleared!`);
        return {
            ...next,
            players: next.players.map(p =>
                p.id === playerId ? { ...p, campClearingPrep: undefined } : p
            )
        };
    }

    const bailoutDecision = getCampReadyBailoutDecision(next, playerId, targetCamp);
    if (bailoutDecision === "Reinforce") {
        aiInfo(`[AI CAMP] ${playerId} downgrading Ready->Positioning for reinforcements at camp ${targetCamp.id}`);
        logEvent(next, HistoryEventType.CampClearingStateChanged, playerId, {
            campId: targetCamp.id,
            fromState: "Ready",
            toState: "Positioning",
        });
        return {
            ...next,
            players: next.players.map(entry =>
                entry.id === playerId && entry.campClearingPrep
                    ? {
                        ...entry,
                        campClearingPrep: {
                            ...entry.campClearingPrep,
                            state: "Positioning",
                            startedTurn: next.turn,
                        },
                    }
                    : entry
            ),
        };
    }
    if (bailoutDecision === "Exit") {
        aiInfo(`[AI CAMP] ${playerId} ending doomed camp assault at ${targetCamp.id} (no viable reinforcements)`);
        logEvent(next, HistoryEventType.CampClearingEnded, playerId, {
            campId: targetCamp.id,
            campCoord: targetCamp.coord,
            outcome: "OtherCancelled",
        });
        return clearCampPrepAndRetarget(next, playerId, targetCamp.id);
    }

    // Get our military units that can attack
    const attackers = getCampAttackers(next, playerId);

    for (const attacker of attackers) {
        const current = next.units.find(u => u.id === attacker.id);
        if (!current || current.hasAttacked) continue;

        const stats = UNITS[current.type];

        // Find targets in range
        const targets = nativeUnits
            .filter(native => {
                const updatedNative = next.units.find(u => u.id === native.id);
                if (!updatedNative) return false;
                return hexDistance(current.coord, updatedNative.coord) <= stats.rng;
            })
            .map(native => {
                const updatedNative = next.units.find(u => u.id === native.id)!;
                return {
                    unit: updatedNative,
                    dmg: expectedDamageToUnit(current, updatedNative, next),
                    counter: expectedDamageFrom(updatedNative, current, next)
                };
            });

        if (targets.length === 0) continue;

        // Pick best target (lowest HP first, prefer kills)
        const bestTarget = targets
            .sort((a, b) => {
                const aKills = a.dmg >= a.unit.hp ? 0 : 1;
                const bKills = b.dmg >= b.unit.hp ? 0 : 1;
                if (aKills !== bKills) return aKills - bKills;
                return a.unit.hp - b.unit.hp;
            })[0];

        // Check if attack is worthwhile: survive OR kill
        const wouldSurvive = current.hp > bestTarget.counter;
        const wouldKill = bestTarget.dmg >= bestTarget.unit.hp;
        const wouldForcePressure = shouldForceCampPressureAttack(next, playerId, current, bestTarget, targetCamp.id);

        if (!wouldSurvive && !wouldKill && !wouldForcePressure) {
            aiInfo(`[AI CAMP SKIP] ${playerId} ${current.type} skipping attack (would die without killing)`);
            continue;
        }

        // Attack!
        const attacked = tryAction(next, {
            type: "Attack",
            playerId,
            attackerId: current.id,
            targetId: bestTarget.unit.id,
            targetType: "Unit"
        });

        if (attacked !== next) {
            aiInfo(`[AI CAMP ATTACK] ${playerId} ${current.type} attacks ${bestTarget.unit.type} (${bestTarget.dmg} dmg, HP: ${bestTarget.unit.hp})`);
            next = attacked;
        }
    }

    return next;
}
