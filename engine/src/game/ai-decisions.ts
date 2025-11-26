import { CITY_DEFENSE_BASE, CITY_WARD_DEFENSE_BONUS, UNITS } from "../core/constants.js";
import { hexDistance } from "../core/hex.js";
import {
    BuildingType,
    City,
    DiplomacyState,
    GameState,
    ProjectId,
    TechId,
    UnitType,
} from "../core/types.js";
import { getPersonalityForPlayer } from "./ai/personality.js";
import { setContact } from "./helpers/diplomacy.js";

export type WarPeaceDecision = "DeclareWar" | "ProposePeace" | "AcceptPeace" | "None";
const warVetoLog: string[] = [];
export function getWarVetoLog(): string[] {
    return [...warVetoLog];
}
export function clearWarVetoLog() {
    warVetoLog.length = 0;
}
function logVeto(reason: string) {
    if (warVetoLog.length < 1000) warVetoLog.push(reason);
}

function estimateMilitaryPower(playerId: string, state: GameState): number {
    const units = state.units.filter(u => u.ownerId === playerId);
    const unitPower = units.reduce((sum, u) => {
        const stats = UNITS[u.type];
        const atk = stats.atk * 2;
        const def = stats.def * 1.5;
        const hp = stats.hp * 0.25;
        const formationBonus = u.type.startsWith("Army") ? 1.25 : 1;
        return sum + (atk + def + hp) * formationBonus;
    }, 0);

    const cities = state.cities.filter(c => c.ownerId === playerId);
    const cityPower = cities.reduce((sum, c) => {
        const ward = c.buildings.includes(BuildingType.CityWard) ? CITY_WARD_DEFENSE_BONUS : 0;
        return sum + (CITY_DEFENSE_BASE + ward) * 2 + c.hp * 0.3;
    }, 0);

    return unitPower + cityPower;
}

function progressRaceRiskHigh(playerId: string, state: GameState): boolean {
    const me = state.players.find(p => p.id === playerId);
    if (!me) return false;
    const myProgressSteps = me.completedProjects.filter(p =>
        p === ProjectId.Observatory || p === ProjectId.GrandAcademy || p === ProjectId.GrandExperiment
    ).length;

    return state.players.some(p => {
        if (p.id === playerId) return false;
        const steps = p.completedProjects.filter(cp =>
            cp === ProjectId.Observatory || cp === ProjectId.GrandAcademy || cp === ProjectId.GrandExperiment
        ).length;
        const researchingProgress =
            p.currentTech?.id === TechId.StarCharts || p.currentTech?.id === TechId.ScholarCourts || p.currentTech?.id === TechId.ScriptLore;
        return steps > myProgressSteps || (researchingProgress && steps >= myProgressSteps);
    });
}

function enemyCityDistance(playerId: string, targetId: string, state: GameState): { dist: number | null; myCities: string[]; theirCities: string[] } {
    const myCities = state.cities.filter(c => c.ownerId === playerId);
    // Visibility-agnostic: consider all enemy cities
    const theirCities = state.cities.filter(c => c.ownerId === targetId);
    if (!myCities.length || !theirCities.length) return { dist: null, myCities: myCities.map(c => c.id), theirCities: theirCities.map(c => c.id) };
    let best: number | null = null;
    for (const mine of myCities) {
        for (const theirs of theirCities) {
            const d = hexDistance(mine.coord, theirs.coord);
            if (best === null || d < best) best = d;
        }
    }
    return { dist: best, myCities: myCities.map(c => c.id), theirCities: theirCities.map(c => c.id) };
}

function hasTitan(playerId: string, state: GameState): boolean {
    return state.units.some(u => u.ownerId === playerId && u.type === UnitType.Titan);
}

export function aiWarPeaceDecision(playerId: string, targetId: string, state: GameState): WarPeaceDecision {
    if (!state.contacts?.[playerId]?.[targetId]) {
        // if units/cities are visible, force contact
        const seesAny = state.units.some(u => u.ownerId === targetId);
        if (seesAny) {
            setContact(state, playerId, targetId);
        } else {
            return "None";
        }
    }
    const personality = getPersonalityForPlayer(state, playerId);
    const aggression = personality.aggression;
    const warPowerThreshold = (() => {
        if (aggression.aggressionSpikeTrigger === "TitanBuilt" && hasTitan(playerId, state)) {
            return aggression.warPowerThresholdLate ?? aggression.warPowerThreshold;
        }
        return aggression.warPowerThreshold;
    })();
    const warDistanceMax = aggression.warDistanceMax;
    const stance = state.diplomacy?.[playerId]?.[targetId] ?? DiplomacyState.Peace;
    const aiPower = estimateMilitaryPower(playerId, state);
    const enemyPower = estimateMilitaryPower(targetId, state);
    const losingWar = aiPower < enemyPower * aggression.peacePowerThreshold;
    const progressRisk = progressRaceRiskHigh(playerId, state);
    const inWar = stance === DiplomacyState.War;
    const contactTurnKey = `metTurn_${targetId}`;
    const metTurn = (state.contacts?.[playerId] as any)?.[contactTurnKey] ?? state.turn;
    const contactTurns = Math.max(0, state.turn - metTurn);
    const declareAfterContact = personality.declareAfterContactTurns ?? 0;

    // Check diplomacy state duration
    const stateChangedTurn = state.diplomacyChangeTurn?.[playerId]?.[targetId] ?? 0;
    const turnsSinceChange = state.turn - stateChangedTurn;

    if (inWar) {
        // Minimum war duration check
        const MIN_WAR_DURATION = 15;
        if (turnsSinceChange < MIN_WAR_DURATION) {
            // War must last at least 15 turns before proposing peace
            return "None";
        }

        const incomingPeace = state.diplomacyOffers?.some(o => o.type === "Peace" && o.from === targetId && o.to === playerId);
        if (incomingPeace && (losingWar || progressRisk)) return "AcceptPeace";
        if (losingWar || progressRisk) return "ProposePeace";
        return "None";
    }

    // Minimum peace duration check - but only if there was a previous war
    // Don't block initial wars!
    const MIN_PEACE_DURATION = 15;
    const hadPriorDiplomacyChange = stateChangedTurn > 0;
    if (hadPriorDiplomacyChange && !inWar && turnsSinceChange < MIN_PEACE_DURATION) {
        // Peace must last at least 15 turns before declaring war AGAIN
        logVeto(`Peace too recent: ${playerId}->${targetId} turns since peace: ${turnsSinceChange}/${MIN_PEACE_DURATION}`);
        return "None";
    }

    const { dist, myCities, theirCities } = enemyCityDistance(playerId, targetId, state);
    if (theirCities.length === 0 || myCities.length === 0) {
        logVeto(`No cities for war eval ${playerId}->${targetId} myCities=${myCities.join(",") || "none"} theirCities=${theirCities.join(",") || "none"}`);
    }
    if (dist !== null && dist <= warDistanceMax && aiPower >= enemyPower * warPowerThreshold) {
        console.info(`[AI WAR] ${playerId} declaring war on ${targetId} (power ${aiPower.toFixed(1)} vs ${enemyPower.toFixed(1)}, dist ${dist})`);
        return "DeclareWar";
    }

    if (declareAfterContact > 0 && contactTurns >= declareAfterContact && dist !== null) {
        if (aiPower >= enemyPower * 0.5) {
            return "DeclareWar";
        } else {
            logVeto(`Force-war veto: ${playerId}->${targetId} power ${aiPower.toFixed(1)} vs ${enemyPower.toFixed(1)}`);
        }
    }

    if (dist === null) {
        logVeto(`No enemy city distance for ${playerId}->${targetId} contactTurns=${contactTurns} myCities=${myCities.join(",") || "none"} theirCities=${theirCities.join(",") || "none"}`);
    } else {
        logVeto(
            `No war: ${playerId}->${targetId} dist ${dist}/${warDistanceMax} power ${aiPower.toFixed(
                1
            )} vs ${enemyPower.toFixed(1)} req ${warPowerThreshold} contactTurns=${contactTurns} myCities=${myCities.join(",") || "none"} theirCities=${theirCities.join(",") || "none"}`
        );
    }

    return "None";
}

export { aiVictoryBias } from "./ai/goals.js";
export { aiChooseTech } from "./ai/tech.js";
