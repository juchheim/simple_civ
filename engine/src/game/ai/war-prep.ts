import { aiLog, aiInfo } from "./debug-logging.js";
import { GameState, Player, DiplomacyState, UnitType } from "../../core/types.js";
import { aiWarPeaceDecision } from "../ai-decisions.js";
import { hexDistance } from "../../core/hex.js";
import { UNITS } from "../../core/constants.js";
import { isScoutType } from "./units/unit-helpers.js";
import { getPersonalityForPlayer } from "./personality.js";

export function manageWarPreparation(state: GameState, playerId: string): GameState {
    const player = state.players.find(p => p.id === playerId);
    if (!player || player.isEliminated) return state;

    // 1. If we have an active preparation, manage it
    if (player.warPreparation) {
        return updateWarPreparation(state, player);
    }

    // 2. If no active preparation, check if we should start one
    return checkForNewWarTargets(state, player);
}

function updateWarPreparation(state: GameState, player: Player): GameState {
    const prep = player.warPreparation!;
    const target = state.players.find(p => p.id === prep.targetId);

    // Cancel if target is dead or we are already at war (e.g. they declared on us)
    if (!target || target.isEliminated || state.diplomacy?.[player.id]?.[target.id] === DiplomacyState.War) {
        aiInfo(`[AI WAR PREP] ${player.id} cancelling preparation against ${prep.targetId} (target invalid or already at war)`);
        return {
            ...state,
            players: state.players.map(p =>
                p.id === player.id ? { ...p, warPreparation: undefined } : p
            )
        };
    }

    // Check if we still want war (using raw decision)
    const decision = aiWarPeaceDecision(player.id, target.id, state, { ignorePrep: true });
    if (decision !== "DeclareWar") {
        aiInfo(`[AI WAR PREP] ${player.id} cancelling preparation against ${prep.targetId} (no longer wants war)`);
        return {
            ...state,
            players: state.players.map(p =>
                p.id === player.id ? { ...p, warPreparation: undefined } : p
            )
        };
    }

    // v0.99 Update: Minimum turn requirements to prevent rushing
    const turnsSinceStart = state.turn - prep.startedTurn;

    // v2.0: Accelerated war prep for early rushers (1 turn per phase instead of 2)
    const personality = getPersonalityForPlayer(state, player.id);
    const MIN_GATHERING_TURNS = personality.acceleratedWarPrep ? 1 : 2;
    const MIN_POSITIONING_TURNS = personality.acceleratedWarPrep ? 1 : 2;

    // v0.99 Update: Timeout - if we take too long, just go!
    // This prevents getting stuck in "Positioning" forever if units can't reach the border
    if (turnsSinceStart > 10 && prep.state !== "Buildup") {
        aiInfo(`[AI WAR PREP] ${player.id} preparation TIMEOUT against ${target.id} (took >10 turns) - Forcing Ready!`);
        return {
            ...state,
            players: state.players.map(p =>
                p.id === player.id ? { ...p, warPreparation: { ...prep, state: "Ready" } } : p
            )
        };
    }

    let newPrepState = prep;

    // State Transitions (only one per turn, with minimum time requirements)
    if (prep.state === "Buildup") {
        // v0.99: Buildup phase - we are building units to reach war threshold
        // Check if we are now strong enough to declare war (or at least start gathering)
        const decision = aiWarPeaceDecision(player.id, target.id, state, { ignorePrep: true });

        if (decision === "DeclareWar") {
            aiInfo(`[AI WAR PREP] ${player.id} finished Buildup against ${target.id} (power sufficient), moving to Gathering`);
            newPrepState = { ...prep, state: "Gathering", startedTurn: state.turn }; // Reset timer for Gathering
        } else if (turnsSinceStart > 20) {
            // If we can't build up in 20 turns, give up
            aiInfo(`[AI WAR PREP] ${player.id} giving up Buildup against ${target.id} (took too long)`);
            return {
                ...state,
                players: state.players.map(p =>
                    p.id === player.id ? { ...p, warPreparation: undefined } : p
                )
            };
        } else {
            if (state.turn % 5 === 0) {
                aiInfo(`[AI WAR PREP] ${player.id} still Building Up against ${target.id} (turn ${turnsSinceStart}/20)`);
            }
        }
    } else if (prep.state === "Gathering") {
        if (turnsSinceStart >= MIN_GATHERING_TURNS) {
            aiInfo(`[AI WAR PREP] ${player.id} finished Gathering against ${target.id} (after ${turnsSinceStart} turns), moving to Positioning`);
            newPrepState = { ...prep, state: "Positioning" };
        } else {
            aiInfo(`[AI WAR PREP] ${player.id} still Gathering against ${target.id} (${turnsSinceStart}/${MIN_GATHERING_TURNS} turns)`);
        }
    } else if (prep.state === "Positioning") {
        if (turnsSinceStart >= MIN_GATHERING_TURNS + MIN_POSITIONING_TURNS) {
            // Check if units are in position
            if (areUnitsPositioned(state, player.id, target.id)) {
                aiInfo(`[AI WAR PREP] ${player.id} finished Positioning against ${target.id}, Ready to declare!`);
                newPrepState = { ...prep, state: "Ready" };
            } else {
                aiInfo(`[AI WAR PREP] ${player.id} not yet positioned against ${target.id} - need more units at border`);
            }
        } else {
            const turnsInPositioning = turnsSinceStart - MIN_GATHERING_TURNS;
            aiInfo(`[AI WAR PREP] ${player.id} still Positioning against ${target.id} (${turnsInPositioning}/${MIN_POSITIONING_TURNS} turns)`);
        }
    }

    if (newPrepState !== prep) {
        return {
            ...state,
            players: state.players.map(p =>
                p.id === player.id ? { ...p, warPreparation: newPrepState } : p
            )
        };
    }

    return state;
}

function checkForNewWarTargets(state: GameState, player: Player): GameState {
    const personality = getPersonalityForPlayer(state, player.id);

    for (const other of state.players) {
        if (other.id === player.id || other.isEliminated) continue;

        // Skip if already at war
        if (state.diplomacy?.[player.id]?.[other.id] === DiplomacyState.War) continue;

        // v2.0: Early rush check - if forceEarlyWarPrep is true and we have contact,
        // immediately start war preparation on first contact (in early game)
        if (personality.forceEarlyWarPrep && state.turn <= 25) {
            const hasContact = state.contacts?.[player.id]?.[other.id];
            if (hasContact) {
                aiInfo(`[AI EARLY RUSH] ${player.id} starting RUSH war preparation against ${other.id} on contact!`);
                return {
                    ...state,
                    players: state.players.map(p =>
                        p.id === player.id ? {
                            ...p,
                            warPreparation: {
                                targetId: other.id,
                                state: "Gathering",  // Skip buildup since we start with military now
                                startedTurn: state.turn
                            }
                        } : p
                    )
                };
            }
        }

        const decision = aiWarPeaceDecision(player.id, other.id, state, { ignorePrep: true });

        if (decision === "DeclareWar") {
            aiInfo(`[AI WAR PREP] ${player.id} starting war preparation against ${other.id}`);
            return {
                ...state,
                players: state.players.map(p =>
                    p.id === player.id ? {
                        ...p,
                        warPreparation: {
                            targetId: other.id,
                            state: "Gathering",
                            startedTurn: state.turn
                        }
                    } : p
                )
            };
        } else if (decision === "PrepareForWar") {
            aiInfo(`[AI WAR PREP] ${player.id} starting military buildup against ${other.id}`);
            return {
                ...state,
                players: state.players.map(p =>
                    p.id === player.id ? {
                        ...p,
                        warPreparation: {
                            targetId: other.id,
                            state: "Buildup",
                            startedTurn: state.turn
                        }
                    } : p
                )
            };
        }
    }
    return state;
}

function areUnitsPositioned(state: GameState, playerId: string, targetId: string): boolean {
    const myUnits = state.units.filter(u => u.ownerId === playerId && !isScoutType(u.type) && UNITS[u.type].domain !== "Civilian" && u.type !== UnitType.Titan);
    const targetCities = state.cities.filter(c => c.ownerId === targetId);

    if (myUnits.length === 0 || targetCities.length === 0) return false;

    // We consider positioned if at least 50% of our military is within 3 tiles of any enemy city
    // AND we have at least 2 units there.
    let positionedCount = 0;

    for (const unit of myUnits) {
        const dist = Math.min(...targetCities.map(c => hexDistance(unit.coord, c.coord)));
        // Within 3 tiles is "at the border" usually
        if (dist <= 3) {
            positionedCount++;
        }
    }

    const positionedRatio = positionedCount / myUnits.length;
    const isReady = positionedCount >= 2 && positionedRatio >= 0.4; // 40% positioned is enough to start

    if (!isReady && state.turn % 5 === 0) {
        aiInfo(`[AI WAR PREP] ${playerId} positioning update: ${positionedCount}/${myUnits.length} units near ${targetId} (${(positionedRatio * 100).toFixed(1)}%)`);
    }

    return isReady;
}
