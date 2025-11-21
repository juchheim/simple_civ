import { CITY_DEFENSE_BASE, CITY_WARD_DEFENSE_BONUS, TECHS, UNITS } from "../core/constants.js";
import { hexDistance } from "../core/hex.js";
import {
    AiVictoryGoal,
    BuildingType,
    City,
    DiplomacyState,
    GameState,
    ProjectId,
    TechId,
} from "../core/types.js";

export type WarPeaceDecision = "DeclareWar" | "ProposePeace" | "AcceptPeace" | "None";

function canResearch(playerTechs: TechId[], techId: TechId): boolean {
    const data = TECHS[techId];
    return data.prereqTechs.every(t => playerTechs.includes(t));
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

function anyEnemyNearCity(city: City, state: GameState, ownerId: string, radius: number): boolean {
    return state.units.some(u => u.ownerId !== ownerId && hexDistance(u.coord, city.coord) <= radius);
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

export function aiVictoryBias(playerId: string, state: GameState): AiVictoryGoal {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return "Balanced";
    const capitals = state.cities.filter(c => c.ownerId === playerId && c.isCapital);
    const capitalsSafe = capitals.every(c => c.hp >= c.maxHp * 0.6 && !anyEnemyNearCity(c, state, playerId, 2));
    if (player.completedProjects.includes(ProjectId.Observatory) && capitalsSafe) {
        return "Progress";
    }

    const hasArmies = state.units.some(u => u.ownerId === playerId && u.type.startsWith("Army"));
    const enemyCapitalInStrikeRange = state.cities.some(c => {
        if (c.ownerId === playerId || !c.isCapital) return false;
        return state.units.some(u => u.ownerId === playerId && hexDistance(u.coord, c.coord) <= 4);
    });
    if (hasArmies && enemyCapitalInStrikeRange) {
        return "Conquest";
    }

    return player.aiGoal ?? "Balanced";
}

export function aiChooseTech(playerId: string, state: GameState, goal: AiVictoryGoal): TechId | null {
    const player = state.players.find(p => p.id === playerId);
    if (!player || player.currentTech) return null;

    const hasTech = (t: TechId) => player.techs.includes(t);
    const progressPath: TechId[] = [TechId.ScriptLore, TechId.ScholarCourts, TechId.StarCharts];
    const conquestPath: TechId[] = [TechId.FormationTraining, TechId.DrilledRanks, TechId.ArmyDoctrine];
    const path = goal === "Progress" ? progressPath : goal === "Conquest" ? conquestPath : [];

    for (const techId of path) {
        if (!hasTech(techId) && canResearch(player.techs, techId)) {
            return techId;
        }
    }

    const available = Object.values(TechId)
        .filter(t => !hasTech(t) && canResearch(player.techs, t))
        .sort((a, b) => TECHS[a].cost - TECHS[b].cost);

    return available[0] ?? null;
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
