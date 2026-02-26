import { AiVictoryGoal, City, DiplomacyState, GameState } from "../../../core/types.js";
import { getAiProfileV2 } from "../rules.js";
import { getAiMemoryV2, type OperationalTheater } from "../memory.js";
import { buildPerception, type AiPerception } from "../perception.js";
import { getInfluenceMapsCached, type InfluenceMaps } from "../influence-map.js";
import { isCombatUnitType } from "../schema.js";
import {
    assessCapabilities,
    findCapabilityGaps,
    getGoalRequirements,
    getGamePhase
} from "../strategic-plan.js";
import { getUnlockedUnits } from "./unlocks.js";
import { assessCityThreatLevel } from "../defense-situation/scoring.js";
import { computeEconomySnapshot, type EconomySnapshot } from "../economy/budget.js";

export type ProductionContext = {
    player: GameState["players"][number];
    profile: ReturnType<typeof getAiProfileV2>;
    memory: ReturnType<typeof getAiMemoryV2>;
    perception: AiPerception;
    influence?: InfluenceMaps;
    primaryTheater?: OperationalTheater;
    phase: ReturnType<typeof getGamePhase>;
    myCities: City[];
    myUnits: GameState["units"];
    myMilitaryUnits: GameState["units"];
    unlockedUnits: ReturnType<typeof getUnlockedUnits>;
    capabilities: ReturnType<typeof assessCapabilities>;
    gaps: ReturnType<typeof findCapabilityGaps>;
    warEnemies: GameState["players"];
    warEnemyIds: Set<string>;
    aliveEnemyIds: Set<string>;
    atWar: boolean;
    thisCityThreat: ReturnType<typeof assessCityThreatLevel>;
    economy: EconomySnapshot;
};

export function buildProductionContext(
    state: GameState,
    playerId: string,
    city: City,
    goal: AiVictoryGoal,
    sharedEconomySnapshot?: EconomySnapshot
): ProductionContext | null {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return null;

    const memory = getAiMemoryV2(state, playerId);
    const theaterFresh = memory.operationalTurn !== undefined && (state.turn - memory.operationalTurn) <= 2;
    const primaryTheater = theaterFresh ? memory.operationalTheaters?.[0] : undefined;

    const profile = getAiProfileV2(state, playerId);
    const economy = sharedEconomySnapshot ?? computeEconomySnapshot(state, playerId);
    const perception = buildPerception(state, playerId);
    const influence = state.map?.tiles
        ? (getInfluenceMapsCached(state, playerId, { budget: 600 }).maps ?? undefined)
        : undefined;
    const phase = getGamePhase(state);
    const myCities = state.cities.filter(c => c.ownerId === playerId);
    const myUnits = state.units.filter(u => u.ownerId === playerId);
    const myMilitaryUnits = myUnits.filter(u => isCombatUnitType(u.type));
    const unlockedUnits = getUnlockedUnits(player.techs);
    const requirements = getGoalRequirements(goal, profile.civName, phase, myCities.length);
    const capabilities = assessCapabilities(state, playerId);
    const gaps = findCapabilityGaps(capabilities, requirements);

    const warEnemies = state.players.filter(p =>
        p.id !== playerId &&
        !p.isEliminated &&
        state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
    );
    const warEnemyIds = new Set(warEnemies.map(p => p.id));
    const aliveEnemyIds = new Set(
        state.players.filter(p => p.id !== playerId && !p.isEliminated).map(p => p.id)
    );
    const atWar = warEnemies.length > 0;
    const thisCityThreat = assessCityThreatLevel(state, city, playerId, 5, 2, perception.isCoordVisible);

    return {
        player,
        profile,
        memory,
        perception,
        influence,
        primaryTheater,
        phase,
        myCities,
        myUnits,
        myMilitaryUnits,
        unlockedUnits,
        capabilities,
        gaps,
        warEnemies,
        warEnemyIds,
        aliveEnemyIds,
        atWar,
        thisCityThreat,
        economy,
    };
}
