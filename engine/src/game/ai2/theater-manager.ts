import { AiVictoryGoal, DiplomacyState, GameState, ProjectId } from "../../core/types.js";
import { hexDistance } from "../../core/hex.js";
import { aiInfo, isAiDebugEnabled } from "../ai/debug-logging.js";
import { getAiMemoryV2, setAiMemoryV2, type OperationalObjective, type OperationalTheater } from "./memory.js";
import { getCityValueProfile, getUnitThreatProfile } from "./tactical-threat.js";
import { isMilitary } from "./unit-roles.js";
import { clamp01 } from "./util.js";
import { getInfluenceMapsCached, sumInfluenceInRadius, type InfluenceMaps } from "./influence-map.js";
import { getOffensiveCityStateOwnerIds } from "./city-state-policy.js";

const CLUSTER_DISTANCE = 6;
const THREAT_RADIUS = 6;
const FRIENDLY_RADIUS = 6;
const DISTANCE_CAP = 12;

const PROGRESS_PROJECTS = new Set<ProjectId>([
    ProjectId.Observatory,
    ProjectId.GrandAcademy,
    ProjectId.GrandExperiment,
]);

type FrontNode = {
    coord: { q: number; r: number };
    ownerId: string;
    cityId: string;
    value: number;
    isCapital: boolean;
    hasProgressProject: boolean;
    isCityState: boolean;
};

type FrontCluster = {
    id: string;
    nodes: FrontNode[];
    center: { q: number; r: number };
    centerValue: number;
};

function isProgressProject(city: GameState["cities"][number]): boolean {
    if (city.currentBuild?.type !== "Project") return false;
    return PROGRESS_PROJECTS.has(city.currentBuild.id as ProjectId);
}

function isProgressThreatForPlayer(state: GameState, targetPlayerId: string): boolean {
    const player = state.players.find(p => p.id === targetPlayerId);
    if (!player) return false;

    const completedProjects = player.completedProjects ?? [];
    const completedObs = completedProjects.includes(ProjectId.Observatory);
    const completedAcad = completedProjects.includes(ProjectId.GrandAcademy);
    const completedExp = completedProjects.includes(ProjectId.GrandExperiment);
    if (completedExp) return true;

    const buildingProgress = state.cities.some(c =>
        c.ownerId === targetPlayerId &&
        isProgressProject(c)
    );

    if (completedAcad || buildingProgress) return true;
    if (completedObs && state.turn >= 110) return true;
    return false;
}

function buildFrontNodes(state: GameState, playerId: string, goal: AiVictoryGoal): FrontNode[] {
    const enemies = state.players.filter(p => p.id !== playerId && !p.isEliminated);
    const nodes: FrontNode[] = [];

    for (const enemy of enemies) {
        const enemyCities = state.cities.filter(c => c.ownerId === enemy.id);
        for (const city of enemyCities) {
            const value = getCityValueProfile(state, playerId, city).totalValue;
            nodes.push({
                coord: city.coord,
                ownerId: enemy.id,
                cityId: city.id,
                value,
                isCapital: !!city.isCapital,
                hasProgressProject: isProgressProject(city),
                isCityState: false,
            });
        }
    }

    const offensiveCityStateOwners = getOffensiveCityStateOwnerIds(state, playerId, goal);
    for (const cityState of state.cityStates ?? []) {
        if (!cityState.discoveredByPlayer[playerId]) continue;
        if (!cityState.warByPlayer[playerId] && !offensiveCityStateOwners.has(cityState.ownerId)) continue;
        const city = state.cities.find(c => c.id === cityState.cityId && c.ownerId === cityState.ownerId);
        if (!city) continue;

        const cityValue = getCityValueProfile(state, playerId, city).totalValue;
        const suzerainPressure = cityState.suzerainId && cityState.suzerainId !== playerId ? 16 : 0;
        const warPressure = cityState.warByPlayer[playerId] ? 10 : 0;
        const neutralBonus = cityState.suzerainId ? 0 : 8;
        const value = cityValue + suzerainPressure + warPressure + neutralBonus;

        nodes.push({
            coord: city.coord,
            ownerId: cityState.ownerId,
            cityId: city.id,
            value,
            isCapital: false,
            hasProgressProject: false,
            isCityState: true,
        });
    }

    return nodes;
}

function clusterFrontNodes(nodes: FrontNode[]): FrontCluster[] {
    const clusters: FrontCluster[] = [];

    for (const node of nodes) {
        let assigned: FrontCluster | null = null;
        for (const cluster of clusters) {
            if (hexDistance(node.coord, cluster.center) <= CLUSTER_DISTANCE) {
                assigned = cluster;
                break;
            }
        }

        if (!assigned) {
            const id = `front-${clusters.length + 1}`;
            clusters.push({ id, nodes: [node], center: node.coord, centerValue: node.value });
            continue;
        }

        assigned.nodes.push(node);
        if (node.value > assigned.centerValue) {
            assigned.center = node.coord;
            assigned.centerValue = node.value;
        }
    }

    return clusters;
}

function pickPrimaryNode(cluster: FrontCluster): FrontNode | null {
    if (cluster.nodes.length === 0) return null;
    return cluster.nodes.reduce((best, node) => (node.value > best.value ? node : best), cluster.nodes[0]);
}

function determineObjective(input: {
    atWar: boolean;
    isCapital: boolean;
    progressThreat: boolean;
    isCityState: boolean;
    distance: number;
}): OperationalObjective {
    const { atWar, isCapital, progressThreat, isCityState, distance } = input;

    if (isCityState) return "pressure";
    if (progressThreat) return "deny-progress";
    if (isCapital) return "capture-capital";
    if (!atWar && distance <= 4) return "defend-border";
    return "pressure";
}

function computeThreatScore(
    state: GameState,
    playerId: string,
    targetPlayerId: string,
    anchor: { q: number; r: number },
    influence?: InfluenceMaps
): number {
    if (influence) {
        return sumInfluenceInRadius(influence.threat, influence.indexByCoord, anchor, THREAT_RADIUS);
    }
    let threat = 0;
    for (const unit of state.units) {
        if (unit.ownerId !== targetPlayerId) continue;
        if (hexDistance(unit.coord, anchor) > THREAT_RADIUS) continue;
        threat += getUnitThreatProfile(unit).totalThreat;
    }
    return threat;
}

function computeFriendlyScore(
    state: GameState,
    playerId: string,
    anchor: { q: number; r: number },
    influence?: InfluenceMaps
): number {
    if (influence) {
        return sumInfluenceInRadius(influence.control, influence.indexByCoord, anchor, FRIENDLY_RADIUS);
    }
    let friendly = 0;
    for (const unit of state.units) {
        if (unit.ownerId !== playerId) continue;
        if (!isMilitary(unit)) continue;
        if (hexDistance(unit.coord, anchor) > FRIENDLY_RADIUS) continue;
        friendly += getUnitThreatProfile(unit).totalThreat;
    }
    return friendly;
}

function computePriority(input: {
    atWar: boolean;
    progressThreat: boolean;
    isCapital: boolean;
    isCityState: boolean;
    distance: number;
    threat: number;
    friendly: number;
}): number {
    const base = 0.3;
    const warBias = input.atWar ? 0.25 : (input.isCityState ? 0.12 : 0.05);
    const progressBias = input.isCityState ? 0 : (input.progressThreat ? 0.25 : 0);
    const capitalBias = input.isCapital ? 0.15 : 0;
    const cityStateBias = input.isCityState ? 0.12 : 0;
    const threatBias = clamp01(input.threat / 250) * 0.15;
    const friendlyBias = clamp01(input.friendly / 250) * 0.1;
    const distancePenalty = clamp01(input.distance / DISTANCE_CAP) * 0.2;

    return clamp01(base + warBias + progressBias + capitalBias + cityStateBias + threatBias + friendlyBias - distancePenalty);
}

export function buildOperationalTheaters(
    state: GameState,
    playerId: string,
    influence?: InfluenceMaps
): OperationalTheater[] {
    const myCities = state.cities.filter(c => c.ownerId === playerId);
    if (myCities.length === 0) return [];

    const goal = state.players.find(player => player.id === playerId)?.aiGoal ?? "Balanced";
    const nodes = buildFrontNodes(state, playerId, goal);
    if (nodes.length === 0) return [];

    const influenceMaps = influence ?? getInfluenceMapsCached(state, playerId, { forceFull: true }).maps;
    if (!influenceMaps) return [];
    const clusters = clusterFrontNodes(nodes);
    const cityStateByOwnerId = new Map((state.cityStates ?? []).map(cityState => [cityState.ownerId, cityState]));
    const theaters: OperationalTheater[] = [];

    for (const cluster of clusters) {
        const primary = pickPrimaryNode(cluster);
        if (!primary) continue;

        const targetCity = state.cities.find(c => c.id === primary.cityId);
        if (!targetCity) continue;

        let anchorCity = myCities[0];
        let anchorDistance = hexDistance(anchorCity.coord, targetCity.coord);
        for (const city of myCities) {
            const dist = hexDistance(city.coord, targetCity.coord);
            if (dist < anchorDistance) {
                anchorDistance = dist;
                anchorCity = city;
            }
        }

        const cityState = cityStateByOwnerId.get(primary.ownerId);
        const atWar = cityState
            ? !!cityState.warByPlayer[playerId]
            : (state.diplomacy?.[playerId]?.[primary.ownerId] === DiplomacyState.War);
        const progressThreat = primary.isCityState
            ? false
            : (isProgressThreatForPlayer(state, primary.ownerId) || primary.hasProgressProject);
        const threat = computeThreatScore(state, playerId, primary.ownerId, anchorCity.coord, influenceMaps);
        const friendly = computeFriendlyScore(state, playerId, anchorCity.coord, influenceMaps);
        const objective = determineObjective({
            atWar,
            isCapital: primary.isCapital,
            progressThreat,
            isCityState: primary.isCityState,
            distance: anchorDistance,
        });
        const priority = computePriority({
            atWar,
            progressThreat,
            isCapital: primary.isCapital,
            isCityState: primary.isCityState,
            distance: anchorDistance,
            threat,
            friendly,
        });

        theaters.push({
            id: cluster.id,
            targetPlayerId: primary.ownerId,
            targetCityId: primary.cityId,
            anchorCityId: anchorCity.id,
            anchorCoord: anchorCity.coord,
            targetCoord: primary.coord,
            objective,
            priority,
            threat,
            friendly,
            distance: anchorDistance,
            atWar,
            cityCount: cluster.nodes.length,
        });
    }

    theaters.sort((a, b) => b.priority - a.priority || a.distance - b.distance);
    return theaters;
}

export function runTheaterManager(state: GameState, playerId: string): GameState {
    const influenceMaps = getInfluenceMapsCached(state, playerId, { forceFull: true }).maps;
    const theaters = influenceMaps ? buildOperationalTheaters(state, playerId, influenceMaps) : buildOperationalTheaters(state, playerId);
    const memory = getAiMemoryV2(state, playerId);
    const next = setAiMemoryV2(state, playerId, {
        ...memory,
        operationalTheaters: theaters,
        operationalTurn: state.turn,
    });

    if (isAiDebugEnabled() && theaters.length > 0) {
        const top = theaters.slice(0, 3)
            .map(t => `${t.id}:${t.objective}@${t.targetCityId ?? "?"} p=${t.priority.toFixed(2)}`)
            .join(" | ");
        aiInfo(`[THEATER] ${playerId} ${top}`);
    }

    return next;
}
