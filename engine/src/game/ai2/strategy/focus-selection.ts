import { City, GameState, ProjectId } from "../../../core/types.js";
import { hexDistance } from "../../../core/hex.js";
import { estimateMilitaryPower } from "../../ai/goals.js";
import type { OperationalTheater } from "../memory.js";
import type { CivAiProfileV2 } from "../rules.js";
import type { InfluenceMaps } from "../influence-map.js";
import { getCityValueProfile } from "../tactical-threat.js";
import { clamp01, pickBest } from "../util.js";
import { isProgressThreat } from "../diplomacy/utils.js";

type EnemyPlayer = GameState["players"][number];

const PROGRESS_PROJECTS = new Set([ProjectId.Observatory, ProjectId.GrandAcademy, ProjectId.GrandExperiment]);

function getInfluenceRatio(layer: InfluenceMaps["threat"] | undefined, coord: { q: number; r: number }): number {
    if (!layer || layer.max <= 0) return 0;
    return clamp01(layer.get(coord) / layer.max);
}

export function pickBestWarFinishTarget(
    state: GameState,
    playerId: string,
    warEnemies: EnemyPlayer[],
    myPower: number
): EnemyPlayer | undefined {
    return pickBest(warEnemies, enemy => {
        const cityCount = state.cities.filter(c => c.ownerId === enemy.id).length;
        const hasCapital = state.cities.some(c => c.ownerId === enemy.id && c.isCapital);
        const enemyPower = estimateMilitaryPower(enemy.id, state);
        const ratio = enemyPower > 0 ? (myPower / enemyPower) : Infinity;
        // Prefer enemies with few cities and/or missing capital; then prefer higher ratio.
        return (10 - Math.min(10, cityCount)) + (hasCapital ? 0 : 6) + Math.min(8, ratio);
    })?.item;
}

export function shouldKeepFocusTarget(input: {
    state: GameState;
    playerId: string;
    enemies: EnemyPlayer[];
    focusTargetPlayerId?: string;
    focusSetTurn?: number;
    inWar: boolean;
}): boolean {
    if (!input.focusTargetPlayerId || input.focusSetTurn === undefined) return false;
    const stillAlive = input.enemies.some(e => e.id === input.focusTargetPlayerId);
    const baseStick = input.inWar ? 25 : 12;
    const targetHasCapital = input.state.cities.some(c => c.ownerId === input.focusTargetPlayerId && c.isCapital);
    const stickiness = (input.inWar && targetHasCapital) ? 40 : baseStick;
    const freshEnough = (input.state.turn - input.focusSetTurn) <= stickiness;
    return stillAlive && freshEnough;
}

export function buildFocusTargetCandidates(input: {
    state: GameState;
    playerId: string;
    myPower: number;
    myAnchor: City;
    candidateEnemies: EnemyPlayer[];
    profile: CivAiProfileV2;
    primaryTheater: OperationalTheater | null;
    hasHumanPlayer: boolean;
}): Array<{ targetId: string; score: number }> {
    return input.candidateEnemies.map(enemy => {
        const theirPower = estimateMilitaryPower(enemy.id, input.state);
        const ratio = theirPower > 0 ? input.myPower / theirPower : Infinity;
        const theirCities = input.state.cities.filter(c => c.ownerId === enemy.id);
        const nearestCityDist = theirCities.length ? Math.min(...theirCities.map(c => hexDistance(input.myAnchor.coord, c.coord))) : 999;
        const hasCapital = theirCities.some(c => c.isCapital);
        const isFinishable = theirCities.length > 0 && theirCities.length <= 2 && ratio >= 1.25;
        const progressThreat = isProgressThreat(input.state, enemy.id);

        let preference = 0;
        if (input.profile.diplomacy.targetPreference === "Nearest") preference = -nearestCityDist;
        if (input.profile.diplomacy.targetPreference === "Capital") preference = hasCapital ? 5 : 0;
        if (input.profile.diplomacy.targetPreference === "Finishable") preference = isFinishable ? 10 : 0;

        const humanBonus = (input.hasHumanPlayer && !enemy.isAI) ? 15 : 0;

        let theaterBonus = 0;
        if (input.primaryTheater && input.primaryTheater.targetPlayerId === enemy.id) {
            theaterBonus += 10 + (input.primaryTheater.priority * 25);
            if (input.primaryTheater.objective === "deny-progress") theaterBonus += 20;
            if (input.primaryTheater.objective === "capture-capital") theaterBonus += 12;
        }

        const deny = (input.profile.diplomacy.canInitiateWars &&
            input.profile.diplomacy.warPowerRatio <= 1.35 &&
            progressThreat)
            ? 45
            : 0;
        const score = preference + (ratio * 5) - (nearestCityDist * 0.35) + (isFinishable ? 6 : 0) + deny + humanBonus + theaterBonus;
        return { targetId: enemy.id, score };
    });
}

export function selectBestFocusCityCandidate(input: {
    state: GameState;
    playerId: string;
    anchor: City;
    candidateCities: City[];
    profile: CivAiProfileV2;
    theaterForTarget?: OperationalTheater;
    influence?: InfluenceMaps;
}): City | undefined {
    const scored = input.candidateCities.map(city => {
        const dist = hexDistance(input.anchor.coord, city.coord);
        const cityValue = getCityValueProfile(input.state, input.playerId, city);
        const isProgressProject = city.currentBuild?.type === "Project" && PROGRESS_PROJECTS.has(city.currentBuild.id as ProjectId);
        const denyScore = isProgressProject ? 2000 : 0;
        const siegeCommitmentScore = input.profile.tactics.siegeCommitment * 6 * (1 - cityValue.hpFrac);

        let theaterBonus = 0;
        if (input.theaterForTarget && input.theaterForTarget.targetCityId === city.id) {
            theaterBonus += 150 + (input.theaterForTarget.priority * 100);
            if (input.theaterForTarget.objective === "deny-progress") theaterBonus += 120;
            if (input.theaterForTarget.objective === "capture-capital") theaterBonus += 80;
        }

        const frontRatio = getInfluenceRatio(input.influence?.front, city.coord);
        const pressureRatio = getInfluenceRatio(input.influence?.pressure, city.coord);
        const influenceBonus = (frontRatio * 30) + (pressureRatio * 24);
        const score =
            denyScore +
            cityValue.totalValue +
            siegeCommitmentScore +
            theaterBonus +
            influenceBonus +
            (-dist * 0.45);
        return { city, score };
    });

    return pickBest(scored, entry => entry.score)?.item?.city;
}
