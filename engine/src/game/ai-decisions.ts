import { CITY_DEFENSE_BASE, CITY_WARD_DEFENSE_BONUS, UNITS } from "../core/constants.js";
import { hexDistance } from "../core/hex.js";
import {
    BuildingType,
    City,
    DiplomacyState,
    GameState,
    ProjectId,
    TechId,
} from "../core/types.js";

export type WarPeaceDecision = "DeclareWar" | "ProposePeace" | "AcceptPeace" | "None";

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

function enemyCityDistance(playerId: string, targetId: string, state: GameState): number | null {
    const myCities = state.cities.filter(c => c.ownerId === playerId);
    const theirCities = state.cities.filter(c => c.ownerId === targetId);
    if (!myCities.length || !theirCities.length) return null;
    let best: number | null = null;
    for (const mine of myCities) {
        for (const theirs of theirCities) {
            const d = hexDistance(mine.coord, theirs.coord);
            if (best === null || d < best) best = d;
        }
    }
    return best;
}

export function aiWarPeaceDecision(playerId: string, targetId: string, state: GameState): WarPeaceDecision {
    if (!state.contacts?.[playerId]?.[targetId]) return "None";
    const stance = state.diplomacy?.[playerId]?.[targetId] ?? DiplomacyState.Peace;
    const aiPower = estimateMilitaryPower(playerId, state);
    const enemyPower = estimateMilitaryPower(targetId, state);
    const losingWar = aiPower < enemyPower * 0.9;
    const progressRisk = progressRaceRiskHigh(playerId, state);
    const inWar = stance === DiplomacyState.War;

    if (inWar) {
        const incomingPeace = state.diplomacyOffers?.some(o => o.type === "Peace" && o.from === targetId && o.to === playerId);
        if (incomingPeace && (losingWar || progressRisk)) return "AcceptPeace";
        if (losingWar || progressRisk) return "ProposePeace";
        return "None";
    }

    const dist = enemyCityDistance(playerId, targetId, state);
    if (dist !== null && dist <= 8 && aiPower >= enemyPower) {
        return "DeclareWar";
    }

    return "None";
}

export { aiVictoryBias } from "./ai/goals.js";
export { aiChooseTech } from "./ai/tech.js";
