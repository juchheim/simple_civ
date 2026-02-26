import { aiInfo } from "../debug-logging.js";
import { hexDistance, hexEquals } from "../../../core/hex.js";
import { GameState, UnitType } from "../../../core/types.js";
import { UNITS } from "../../../core/constants.js";
import { tryAction } from "../shared/actions.js";
import { findPath } from "../../helpers/pathfinding.js";
import { expectedDamageFrom, expectedDamageToUnit, isScoutType } from "./unit-helpers.js";

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
        if (phase === "Ready") {
            const unitRange = UNITS[current.type].rng;
            if (distToCamp <= unitRange) {
                aiInfo(`[AI CAMP ATTACK] ${playerId} ${current.type} in range of camp (${distToCamp} tiles)`);
                continue;
            }
        }

        // Find path to camp
        const path = findPath(current.coord, targetCamp.coord, current, next);
        if (path.length === 0) continue;

        const step = path[0];

        // Check for friendly military on target tile (Stacking Limit)
        const unitsOnTarget = next.units.filter(u => hexEquals(u.coord, step));
        const friendlyMilitary = unitsOnTarget.some(u =>
            u.ownerId === playerId && UNITS[u.type].domain !== "Civilian"
        );
        if (friendlyMilitary) continue;

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

    // Get our military units that can attack
    const attackers = next.units.filter(u =>
        u.ownerId === playerId &&
        !u.hasAttacked &&
        !isScoutType(u.type) &&
        UNITS[u.type].domain !== "Civilian" && u.type !== UnitType.Titan
    );

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

        if (!wouldSurvive && !wouldKill) {
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
