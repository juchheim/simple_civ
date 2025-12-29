// Mutual defense reinforcement routing across cities.
import { DiplomacyState, GameState } from "../../core/types.js";
import { hexDistance, hexEquals, getNeighbors } from "../../core/hex.js";
import { tryAction } from "../ai/shared/actions.js";
import { aiInfo } from "../ai/debug-logging.js";
import { getThreatLevel } from "../ai/units/unit-helpers.js";
import { isPerimeterCity } from "./defense-perimeter.js";
import { isMilitary } from "./unit-roles.js";

/**
 * v7.2: Mutual Defense - Cities Share Defenders
 * When a city is under attack, nearby cities send spare defenders to help.
 * 
 * Rules:
 * - Only send reinforcements from cities that have MORE than their minimum defenders
 * - Capital: keep 4, only send excess
 * - Perimeter: keep 3, only send excess
 * - Interior: keep 1, only send excess
 * - Prioritize reinforcing the most threatened city
 * - Units move toward the threatened city (may take multiple turns)
 */
export function sendMutualDefenseReinforcements(state: GameState, playerId: string): GameState {
    let next = state;

    const myCities = next.cities.filter(c => c.ownerId === playerId);
    if (myCities.length < 2) return next; // Need at least 2 cities for mutual defense

    // Find enemies at war with us
    const enemies = next.players.filter(p =>
        !p.isEliminated &&
        p.id !== playerId &&
        next.diplomacy[playerId]?.[p.id] === DiplomacyState.War
    );
    if (enemies.length === 0) return next;
    const enemyIds = new Set(enemies.map(e => e.id));

    // Calculate threat level and defender status for each city
    const cityStatus = myCities.map(city => {
        const threat = getThreatLevel(next, city, playerId);
        const perimeter = isPerimeterCity(next, city, playerId);

        // Minimum required defenders
        // v7.2: Use perimeter status for capital too. Safe capital only needs 1 garrison.
        const minDefenders = city.isCapital ? (perimeter ? 4 : 1) : (perimeter ? 3 : 1);

        // Count current defenders (garrison + ring)
        const garrison = next.units.find(u =>
            u.ownerId === playerId &&
            isMilitary(u) &&
            hexEquals(u.coord, city.coord)
        );
        const ringDefenders = next.units.filter(u =>
            u.ownerId === playerId &&
            isMilitary(u) &&
            hexDistance(u.coord, city.coord) === 1
        );
        const currentDefenders = (garrison ? 1 : 0) + ringDefenders.length;

        // Excess defenders that could be sent
        const excess = Math.max(0, currentDefenders - minDefenders);

        // Deficit defenders that are needed
        const deficit = Math.max(0, minDefenders - currentDefenders);

        return {
            city,
            threat,
            perimeter,
            minDefenders,
            currentDefenders,
            excess,
            deficit,
            ringDefenders
        };
    });

    // Find cities that need reinforcements (high/critical threat AND deficit)
    const needsHelp = cityStatus
        .filter(cs => (cs.threat === "high" || cs.threat === "critical") && cs.deficit > 0)
        .sort((a, b) => {
            // Critical before high
            if (a.threat === "critical" && b.threat !== "critical") return -1;
            if (b.threat === "critical" && a.threat !== "critical") return 1;
            // Capital before others
            if (a.city.isCapital && !b.city.isCapital) return -1;
            if (b.city.isCapital && !a.city.isCapital) return 1;
            // Higher deficit first
            return b.deficit - a.deficit;
        });

    if (needsHelp.length === 0) return next;

    // Find cities that can send help (have excess defenders)
    const canHelp = cityStatus
        .filter(cs => cs.excess > 0)
        .sort((a, b) => b.excess - a.excess); // Highest excess first

    // Send reinforcements from helper cities to threatened cities
    for (const needy of needsHelp) {
        if (needy.deficit <= 0) continue;

        for (const helper of canHelp) {
            if (helper.excess <= 0) continue;

            // Check distance - only help nearby cities (within 8 tiles)
            const distance = hexDistance(helper.city.coord, needy.city.coord);
            if (distance > 8) continue;

            // Find ring defenders that can be sent
            // v8.1: Only send if THIS city doesn't have nearby enemies (don't strip defenders from threatened cities)
            const helperEnemiesNearby = next.units.filter(u =>
                enemyIds.has(u.ownerId) &&
                isMilitary(u) &&
                hexDistance(u.coord, helper.city.coord) <= 3
            );
            if (helperEnemiesNearby.length > 0) continue; // Don't strip this city's defenders

            const toSend = helper.ringDefenders.filter(u => {
                const liveUnit = next.units.find(uu => uu.id === u.id);
                return liveUnit && liveUnit.movesLeft > 0;
            }).slice(0, Math.min(helper.excess, needy.deficit));

            for (const unit of toSend) {
                const liveUnit = next.units.find(u => u.id === unit.id);
                if (!liveUnit || liveUnit.movesLeft <= 0) continue;

                // Move toward the threatened city
                const ringPositions = getNeighbors(needy.city.coord).filter(n =>
                    !next.units.some(u => hexEquals(u.coord, n))
                );

                let moved = false;

                // If close enough, move directly to ring
                if (ringPositions.length > 0) {
                    const closest = ringPositions.sort((a, b) =>
                        hexDistance(liveUnit.coord, a) - hexDistance(liveUnit.coord, b)
                    )[0];

                    if (hexDistance(liveUnit.coord, closest) <= liveUnit.movesLeft) {
                        const moveResult = tryAction(next, {
                            type: "MoveUnit", playerId, unitId: liveUnit.id, to: closest
                        });
                        if (moveResult !== next) {
                            next = moveResult;
                            moved = true;
                            aiInfo(`[MUTUAL DEFENSE] ${playerId} ${liveUnit.type} from ${helper.city.name} reinforcing ${needy.city.name} (threat:${needy.threat})`);
                        }
                    }
                }

                // Otherwise step toward city
                if (!moved) {
                    const sorted = getNeighbors(liveUnit.coord).sort((a, b) =>
                        hexDistance(a, needy.city.coord) - hexDistance(b, needy.city.coord)
                    );
                    for (const n of sorted) {
                        const attempt = tryAction(next, { type: "MoveUnit", playerId, unitId: liveUnit.id, to: n });
                        if (attempt !== next) {
                            next = attempt;
                            aiInfo(`[MUTUAL DEFENSE] ${playerId} ${liveUnit.type} stepping from ${helper.city.name} toward ${needy.city.name}`);
                            break;
                        }
                    }
                }

                helper.excess--;
                needy.deficit--;
                if (needy.deficit <= 0) break;
            }

            if (needy.deficit <= 0) break;
        }
    }

    return next;
}
