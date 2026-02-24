import { AiVictoryGoal, City, DiplomacyState, GameState, ProjectId, TechId, UnitType } from "../../core/types.js";
import { hexDistance } from "../../core/hex.js";
import { estimateMilitaryPower } from "../ai/goals.js";
import { evaluateBestVictoryPath } from "../ai/victory-evaluator.js";
import { getAiMemoryV2, setAiMemoryV2, type OperationalTheater } from "./memory.js";
import { getAiProfileV2 } from "./rules.js";
import { buildPerception } from "./perception.js";
import { type InfluenceMaps } from "./influence-map.js";
import { getCityValueProfile } from "./tactical-threat.js";
import { aiInfo, isAiDebugEnabled } from "../ai/debug-logging.js";
import { clamp01, pickBest } from "./util.js";

function isProgressThreat(state: GameState, targetPlayerId: string): boolean {
    const p = state.players.find(x => x.id === targetPlayerId);
    if (!p) return false;
    const completedObs = p.completedProjects?.includes(ProjectId.Observatory);
    const completedAcad = p.completedProjects?.includes(ProjectId.GrandAcademy);
    const completedExp = p.completedProjects?.includes(ProjectId.GrandExperiment);
    if (completedExp) return true;

    const buildingProgress = state.cities.some(c =>
        c.ownerId === targetPlayerId &&
        c.currentBuild?.type === "Project" &&
        (c.currentBuild.id === ProjectId.Observatory || c.currentBuild.id === ProjectId.GrandAcademy || c.currentBuild.id === ProjectId.GrandExperiment)
    );

    if (completedAcad || buildingProgress) return true;
    if (completedObs && state.turn >= 110) return true;
    return false;
}

export function isAtWarV2(state: GameState, playerId: string): boolean {
    return state.players.some(p =>
        p.id !== playerId &&
        !p.isEliminated &&
        state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
    );
}

type GoalScoreBreakdown = {
    total: number;
    components: Record<string, number>;
    notes?: string[];
};

type GoalCandidate = {
    goal: AiVictoryGoal;
    score: number;
    breakdown: GoalScoreBreakdown;
};

const GOAL_BASE: Record<AiVictoryGoal, number> = {
    Conquest: 0.35,
    Progress: 0.35,
    Balanced: 0.4,
};

const AGGRESSIVE_CIVS = new Set(["ForgeClans", "RiverLeague"]);
const CONQUEST_FIRST_CIVS = new Set(["ForgeClans", "AetherianVanguard"]);

const PROGRESS_PROJECTS = [ProjectId.Observatory, ProjectId.GrandAcademy, ProjectId.GrandExperiment];

function formatGoalBreakdown(breakdown: GoalScoreBreakdown): string {
    const parts = Object.entries(breakdown.components)
        .filter(([, value]) => Math.abs(value) >= 0.01)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .map(([key, value]) => `${key}:${value.toFixed(2)}`);
    if (breakdown.notes && breakdown.notes.length > 0) {
        parts.push(`notes:${breakdown.notes.join("|")}`);
    }
    return parts.join(", ");
}

function makeGoalCandidate(goal: AiVictoryGoal, components: Record<string, number>, notes?: string[]): GoalCandidate {
    const total = clamp01(Object.values(components).reduce((sum, value) => sum + value, 0));
    return {
        goal,
        score: total,
        breakdown: {
            total,
            components,
            notes: notes && notes.length > 0 ? notes : undefined,
        },
    };
}

function getInfluenceRatio(layer: InfluenceMaps["threat"] | undefined, coord: { q: number; r: number }): number {
    if (!layer || layer.max <= 0) return 0;
    return clamp01(layer.get(coord) / layer.max);
}

function getStrongestEnemyPower(state: GameState, playerId: string): number {
    let maxPower = 0;
    for (const enemy of state.players) {
        if (enemy.id === playerId || enemy.isEliminated) continue;
        const power = estimateMilitaryPower(enemy.id, state);
        if (power > maxPower) maxPower = power;
    }
    return Math.max(1, maxPower);
}

type ForcedGoal = {
    goal: AiVictoryGoal;
    reason: string;
    notes?: string[];
};

function computeForcedGoal(state: GameState, playerId: string, player: GameState["players"][number]): ForcedGoal | null {
    // v9.10: Endgame crisis overrides all other logic.
    if (state.turn > 225) {
        const evaluation = evaluateBestVictoryPath(state, playerId);
        const notes = [
            evaluation.reason ? `eval:${evaluation.reason}` : "eval",
            `turnsP:${evaluation.turnsToProgress}`,
            `turnsC:${evaluation.turnsToConquest}`,
        ];
        return { goal: evaluation.path, reason: "endgame-crisis", notes };
    }

    // Aetherian Titan presence = commit to Conquest.
    if (player.civName === "AetherianVanguard") {
        const hasTitan = state.units.some(u => u.ownerId === playerId && u.type === UnitType.Titan);
        if (hasTitan) {
            return { goal: "Conquest", reason: "aetherian-titan" };
        }

        const completedProjects = player.completedProjects ?? [];
        const hasTitansCore = completedProjects.includes(ProjectId.TitansCoreComplete);
        if (hasTitansCore) {
            const completedScience = PROGRESS_PROJECTS.filter(id => completedProjects.includes(id)).length;
            if (completedScience >= 2) {
                return { goal: "Progress", reason: "aetherian-science-pivot" };
            }
            if (state.turn > 250) {
                return { goal: "Progress", reason: "aetherian-stall-pivot" };
            }

            const myPower = estimateMilitaryPower(playerId, state);
            const strongestEnemyPower = getStrongestEnemyPower(state, playerId);
            const powerRatio = strongestEnemyPower > 0 ? myPower / strongestEnemyPower : 2;
            if (powerRatio >= 1.5) {
                return { goal: "Conquest", reason: "aetherian-dominance", notes: [`ratio:${powerRatio.toFixed(2)}`] };
            }
            return { goal: "Progress", reason: "aetherian-underdog", notes: [`ratio:${powerRatio.toFixed(2)}`] };
        }
    }

    return null;
}

export function chooseVictoryGoalV2(state: GameState, playerId: string): AiVictoryGoal {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return "Balanced";

    const profile = getAiProfileV2(state, playerId);
    const forced = computeForcedGoal(state, playerId, player);
    if (forced) {
        const candidates = (["Conquest", "Progress", "Balanced"] as AiVictoryGoal[]).map(goal => {
            const components = {
                override: goal === forced.goal ? 1 : 0,
            };
            return makeGoalCandidate(goal, components, goal === forced.goal ? [forced.reason, ...(forced.notes ?? [])] : undefined);
        });
        const bestForced = pickBest(candidates, c => c.score)?.item?.goal ?? forced.goal;
        if (isAiDebugEnabled()) {
            const chosen = candidates.find(c => c.goal === bestForced);
            if (chosen) {
                const breakdown = formatGoalBreakdown(chosen.breakdown);
                aiInfo(`[AI Goal] Forced ${bestForced} (${chosen.score.toFixed(2)}) | ${breakdown}`);
            }
        }
        return bestForced;
    }

    const hasStarCharts = player.techs.includes(TechId.StarCharts);
    const hasCompositeArmor = player.techs.includes(TechId.CompositeArmor);
    const myCities = state.cities.filter(c => c.ownerId === playerId).length;
    const inWar = isAtWarV2(state, playerId);
    const isAggressive = AGGRESSIVE_CIVS.has(profile.civName);
    const conquestFirst = CONQUEST_FIRST_CIVS.has(profile.civName);

    const projectWeights = profile.build?.weights?.project ?? {};
    const progressAffinity =
        (projectWeights[ProjectId.Observatory] ?? 0) +
        (projectWeights[ProjectId.GrandAcademy] ?? 0) +
        (projectWeights[ProjectId.GrandExperiment] ?? 0);
    const progressAffinityScore = clamp01(progressAffinity / 2.5);
    const riskAverseScore = clamp01((0.35 - profile.tactics.riskTolerance) / 0.35);
    const progressLean = hasStarCharts ? Math.max(progressAffinityScore, riskAverseScore) : 0;

    const warBias = inWar ? clamp01((1.35 - profile.diplomacy.warPowerRatio) / 0.35) * 0.2 : 0;

    const progressThreatExists = profile.diplomacy.canInitiateWars &&
        profile.diplomacy.warPowerRatio <= 1.35 &&
        state.players.some(p => p.id !== playerId && !p.isEliminated && isProgressThreat(state, p.id));
    const denyThreatBias = progressThreatExists ? 0.2 : 0;

    const aggressiveBias = isAggressive ? 0.25 : 0;
    const aggressivePivot = isAggressive && myCities >= 8 && hasCompositeArmor && hasStarCharts;
    const aggressivePivotBias = aggressivePivot ? 0.35 : 0;

    let progressLeanBias = progressLean * 0.25;
    let conquestFirstBias = 0;
    if (hasStarCharts && progressLean > 0 && conquestFirst) {
        conquestFirstBias = 0.25 + (progressLean * 0.2);
        progressLeanBias = 0;
    }

    const candidates: GoalCandidate[] = [
        makeGoalCandidate("Conquest", {
            base: GOAL_BASE.Conquest,
            aggressive: aggressiveBias,
            war: warBias,
            deny: denyThreatBias,
            conquestFirst: conquestFirstBias,
        }),
        makeGoalCandidate("Progress", {
            base: GOAL_BASE.Progress,
            progressLean: progressLeanBias,
            pivot: aggressivePivotBias,
        }),
        makeGoalCandidate("Balanced", {
            base: GOAL_BASE.Balanced,
        }),
    ];

    const best = pickBest(candidates, c => c.score)?.item ?? candidates[0];
    if (isAiDebugEnabled()) {
        const breakdown = formatGoalBreakdown(best.breakdown);
        aiInfo(`[AI Goal] ${best.goal} (${best.score.toFixed(2)}) | ${breakdown}`);
    }
    return best.goal;
}

export function selectFocusTargetV2(state: GameState, playerId: string): { state: GameState; focusTargetId?: string; focusCityId?: string } {
    const memory = getAiMemoryV2(state, playerId);
    const profile = getAiProfileV2(state, playerId);
    const myPower = estimateMilitaryPower(playerId, state);
    const perception = buildPerception(state, playerId);

    const theaters = memory.operationalTheaters ?? [];
    const theaterFresh = memory.operationalTurn !== undefined && (state.turn - memory.operationalTurn) <= 2;
    const primaryTheater: OperationalTheater | null = theaterFresh && theaters.length > 0 ? theaters[0] : null;

    const enemies = state.players.filter(p => p.id !== playerId && !p.isEliminated);
    const visibleEnemies = perception.visibilityKnown
        ? enemies.filter(e => perception.visibleEnemyIds.has(e.id))
        : enemies;
    const candidateEnemies = perception.visibilityKnown && visibleEnemies.length > 0
        ? visibleEnemies
        : enemies;
    if (enemies.length === 0) return { state, focusTargetId: undefined, focusCityId: undefined };

    // If our stored focus city is no longer an enemy city (captured / flipped), clear it so we can roll forward.
    if (memory.focusCityId) {
        const fc = state.cities.find(c => c.id === memory.focusCityId);
        if (!fc || fc.ownerId === playerId) {
            const cleared = setAiMemoryV2(state, playerId, {
                ...memory,
                focusCityId: undefined,
                focusTargetPlayerId: undefined,
                focusSetTurn: undefined,
            });
            return selectFocusTargetV2(cleared, playerId);
        }
    }

    // Legacy "FINISH HIM": if we're already at war with someone who is nearly dead, hard-focus them until eliminated.
    const warEnemies = enemies.filter(e => state.diplomacy?.[playerId]?.[e.id] === DiplomacyState.War);
    if (warEnemies.length > 0) {
        const bestFinish = pickBest(warEnemies, e => {
            const cityCount = state.cities.filter(c => c.ownerId === e.id).length;
            const hasCapital = state.cities.some(c => c.ownerId === e.id && c.isCapital);
            const ratio = (estimateMilitaryPower(e.id, state) > 0) ? (myPower / estimateMilitaryPower(e.id, state)) : Infinity;
            // Prefer enemies with few cities and/or missing capital; then prefer higher ratio.
            return (10 - Math.min(10, cityCount)) + (hasCapital ? 0 : 6) + Math.min(8, ratio);
        })?.item;
        if (bestFinish) {
            const focusCity = selectFocusCityAgainstTarget(state, playerId, bestFinish.id);
            const next = setAiMemoryV2(state, playerId, {
                ...memory,
                focusTargetPlayerId: bestFinish.id,
                focusCityId: focusCity?.id,
                focusSetTurn: state.turn,
            });
            return { state: next, focusTargetId: bestFinish.id, focusCityId: focusCity?.id };
        }
    }

    // Stickiness: keep focus longer during wars so we actually finish capital sieges (conquest requires capitals).
    if (memory.focusTargetPlayerId) {
        const stillAlive = enemies.some(e => e.id === memory.focusTargetPlayerId);
        const inWar = isAtWarV2(state, playerId);
        const baseStick = inWar ? 25 : 12;
        const targetHasCapital = state.cities.some(c => c.ownerId === memory.focusTargetPlayerId && c.isCapital);
        const stickiness = (inWar && targetHasCapital) ? 40 : baseStick;
        const freshEnough = memory.focusSetTurn !== undefined ? (state.turn - memory.focusSetTurn) <= stickiness : false;
        if (stillAlive && freshEnough) {
            return { state, focusTargetId: memory.focusTargetPlayerId, focusCityId: memory.focusCityId };
        }
    }

    const myCities = state.cities.filter(c => c.ownerId === playerId);
    const myAnchor = myCities.find(c => c.isCapital) ?? myCities[0];
    if (!myAnchor) return { state, focusTargetId: undefined, focusCityId: undefined };

    // Check if there's a human player in the game
    const hasHumanPlayer = state.players.some(p => !p.isAI && !p.isEliminated);

    const candidateTargets = candidateEnemies
        .map(e => {
            const theirPower = estimateMilitaryPower(e.id, state);
            const ratio = theirPower > 0 ? myPower / theirPower : Infinity;
            const theirCities = state.cities.filter(c => c.ownerId === e.id);
            const nearestCityDist = theirCities.length ? Math.min(...theirCities.map(c => hexDistance(myAnchor.coord, c.coord))) : 999;
            const hasCapital = theirCities.some(c => c.isCapital);
            const isFinishable = theirCities.length > 0 && theirCities.length <= 2 && ratio >= 1.25;
            const progressThreat = isProgressThreat(state, e.id);

            let pref = 0;
            if (profile.diplomacy.targetPreference === "Nearest") pref = -nearestCityDist;
            if (profile.diplomacy.targetPreference === "Capital") pref = hasCapital ? 5 : 0;
            if (profile.diplomacy.targetPreference === "Finishable") pref = isFinishable ? 10 : 0;

            // Human preference: If there's a human in the game, AI prefers to attack them
            const humanBonus = (hasHumanPlayer && !e.isAI) ? 15 : 0;

            // Operational theater bias: steer toward top theater objective if available.
            let theaterBonus = 0;
            if (primaryTheater && primaryTheater.targetPlayerId === e.id) {
                theaterBonus += 10 + (primaryTheater.priority * 25);
                if (primaryTheater.objective === "deny-progress") theaterBonus += 20;
                if (primaryTheater.objective === "capture-capital") theaterBonus += 12;
            }

            // Overall: prefer reasonable distance + weak/finishable + preference.
            const deny = (profile.diplomacy.canInitiateWars && profile.diplomacy.warPowerRatio <= 1.35 && progressThreat) ? 45 : 0;
            const score = pref + (ratio * 5) - (nearestCityDist * 0.35) + (isFinishable ? 6 : 0) + deny + humanBonus + theaterBonus;
            return { targetId: e.id, score };
        });

    const bestTarget = pickBest(candidateTargets, c => c.score)?.item?.targetId;
    if (!bestTarget) {
        return { state, focusTargetId: undefined, focusCityId: undefined };
    }

    const focusCity = selectFocusCityAgainstTarget(state, playerId, bestTarget);
    const next = setAiMemoryV2(state, playerId, {
        ...memory,
        focusTargetPlayerId: bestTarget,
        focusCityId: focusCity?.id,
        focusSetTurn: state.turn,
    });
    return { state: next, focusTargetId: bestTarget, focusCityId: focusCity?.id };
}

export function selectFocusCityAgainstTarget(
    state: GameState,
    playerId: string,
    targetId: string,
    influence?: InfluenceMaps
): City | undefined {
    const profile = getAiProfileV2(state, playerId);
    const memory = getAiMemoryV2(state, playerId);
    const perception = buildPerception(state, playerId);
    const theaterFresh = memory.operationalTurn !== undefined && (state.turn - memory.operationalTurn) <= 2;
    const theaterForTarget = theaterFresh ? (memory.operationalTheaters ?? []).find(t => t.targetPlayerId === targetId) : undefined;

    const myCities = state.cities.filter(c => c.ownerId === playerId);
    const anchor = myCities.find(c => c.isCapital) ?? myCities[0];
    if (!anchor) return undefined;

    const enemyCities = state.cities.filter(c => c.ownerId === targetId);
    if (enemyCities.length === 0) return undefined;
    const visibleEnemyCities = enemyCities.filter(c => perception.isCoordVisible(c.coord));
    const candidateCities = perception.visibilityKnown && visibleEnemyCities.length > 0
        ? visibleEnemyCities
        : enemyCities;

    const scored = candidateCities.map(c => {
        const dist = hexDistance(anchor.coord, c.coord);
        const cityValue = getCityValueProfile(state, playerId, c);
        const progressProject =
            c.currentBuild?.type === "Project" &&
            (c.currentBuild.id === ProjectId.Observatory || c.currentBuild.id === ProjectId.GrandAcademy || c.currentBuild.id === ProjectId.GrandExperiment);
        const denyScore = progressProject ? 2000 : 0;
        const siegeCommitmentScore = profile.tactics.siegeCommitment * 6 * (1 - cityValue.hpFrac);
        let theaterBonus = 0;
        if (theaterForTarget && theaterForTarget.targetCityId === c.id) {
            theaterBonus += 150 + (theaterForTarget.priority * 100);
            if (theaterForTarget.objective === "deny-progress") theaterBonus += 120;
            if (theaterForTarget.objective === "capture-capital") theaterBonus += 80;
        }
        const frontRatio = getInfluenceRatio(influence?.front, c.coord);
        const pressureRatio = getInfluenceRatio(influence?.pressure, c.coord);
        const influenceBonus = (frontRatio * 30) + (pressureRatio * 24);
        const score =
            denyScore +
            cityValue.totalValue +
            siegeCommitmentScore +
            theaterBonus +
            influenceBonus +
            (-dist * 0.45);
        return { c, score };
    });

    return pickBest(scored, s => s.score)?.item?.c;
}
