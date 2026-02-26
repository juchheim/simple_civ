import { AiVictoryGoal, GameState, ProjectId, TechId, UnitType } from "../../../core/types.js";
import type { CivAiProfileV2 } from "../rules.js";
import { estimateMilitaryPower } from "../../ai/goals.js";
import { evaluateBestVictoryPath } from "../../ai/victory-evaluator.js";
import { clamp01 } from "../util.js";
import { isProgressThreat } from "../diplomacy/utils.js";

type GoalScoreBreakdown = {
    total: number;
    components: Record<string, number>;
    notes?: string[];
};

export type GoalCandidate = {
    goal: AiVictoryGoal;
    score: number;
    breakdown: GoalScoreBreakdown;
};

export type ForcedGoal = {
    goal: AiVictoryGoal;
    reason: string;
    notes?: string[];
};

const GOAL_BASE: Record<AiVictoryGoal, number> = {
    Conquest: 0.35,
    Progress: 0.35,
    Balanced: 0.4,
};

const AGGRESSIVE_CIVS = new Set(["ForgeClans", "RiverLeague"]);
const CONQUEST_FIRST_CIVS = new Set(["ForgeClans", "AetherianVanguard"]);

const PROGRESS_PROJECTS = [ProjectId.Observatory, ProjectId.GrandAcademy, ProjectId.GrandExperiment];

export function formatGoalBreakdown(breakdown: GoalScoreBreakdown): string {
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

function getStrongestEnemyPower(state: GameState, playerId: string): number {
    let maxPower = 0;
    for (const enemy of state.players) {
        if (enemy.id === playerId || enemy.isEliminated) continue;
        const power = estimateMilitaryPower(enemy.id, state);
        if (power > maxPower) maxPower = power;
    }
    return Math.max(1, maxPower);
}

export function computeForcedGoal(
    state: GameState,
    playerId: string,
    player: GameState["players"][number]
): ForcedGoal | null {
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

export function buildForcedGoalCandidates(forced: ForcedGoal): GoalCandidate[] {
    return (["Conquest", "Progress", "Balanced"] as AiVictoryGoal[]).map(goal => {
        const components = {
            override: goal === forced.goal ? 1 : 0,
        };
        return makeGoalCandidate(goal, components, goal === forced.goal ? [forced.reason, ...(forced.notes ?? [])] : undefined);
    });
}

export function buildStandardGoalCandidates(
    state: GameState,
    playerId: string,
    player: GameState["players"][number],
    profile: CivAiProfileV2,
    inWar: boolean
): GoalCandidate[] {
    const hasStarCharts = player.techs.includes(TechId.StarCharts);
    const hasCompositeArmor = player.techs.includes(TechId.CompositeArmor);
    const myCities = state.cities.filter(c => c.ownerId === playerId).length;
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

    return [
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
}
