import { AiVictoryGoal, City, DiplomacyState, GameState, ProjectId, TechId, UnitType } from "../../core/types.js";
import { hexDistance } from "../../core/hex.js";
import { estimateMilitaryPower } from "../ai/goals.js";
import { evaluateBestVictoryPath } from "../ai/victory-evaluator.js";
import { getAiMemoryV2, setAiMemoryV2 } from "./memory.js";
import { getAiProfileV2 } from "./rules.js";
import { getCityValueProfile } from "./tactical-threat.js";
import { pickBest } from "./util.js";

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

export function chooseVictoryGoalV2(state: GameState, playerId: string): AiVictoryGoal {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return "Balanced";

    const profile = getAiProfileV2(state, playerId);

    // Hard triggers:
    // v9.10: Global Stall Breaker "Endgame Crisis"
    // If game drags past Turn 225, force ALL civs to commit to their best victory path.
    // This overrides personality to prevent "Balanced" dithering in stalemates.
    if (state.turn > 225) {
        // Use the evaluator to find the fastest path mathematically
        const evaluation = evaluateBestVictoryPath(state, playerId);
        return evaluation.path;
    }

    const hasTitan = state.units.some(u => u.ownerId === playerId && u.type === UnitType.Titan);
    if (hasTitan && player.civName === "AetherianVanguard") return "Conquest";

    // v7.9: Aetherian post-Titan's Core decision
    // After building Titan's Core, decide whether to push Conquest (Landships) or pivot to Progress
    // Decision: If power > 1.5x strongest enemy, stay Conquest. Otherwise, pivot to Progress.
    const hasTitansCore = player.completedProjects.includes(ProjectId.TitansCoreComplete);
    if (hasTitansCore && player.civName === "AetherianVanguard") {
        // v9.2: Aetherian Fix - Break strategic paralysis
        const scienceProjects = [ProjectId.Observatory, ProjectId.GrandAcademy, ProjectId.GrandExperiment];
        const completedScience = scienceProjects.filter(id => player.completedProjects.includes(id)).length;

        // 1. Science Priority: If we are close to science win (2/3 done), always push Progress
        if (completedScience >= 2) return "Progress";

        // 2. Stall Breaker: If game is dragging on (Turn > 250) and we haven't won yet, switch to Progress
        if (state.turn > 250) return "Progress";

        const myPower = estimateMilitaryPower(playerId, state);
        const enemies = state.players.filter(p => p.id !== playerId && !p.isEliminated);
        const strongestEnemyPower = Math.max(...enemies.map(e => estimateMilitaryPower(e.id, state)), 1);
        const powerRatio = myPower / strongestEnemyPower;

        // If we dominate (1.5x+ power), stay Conquest for the kill
        if (powerRatio >= 1.5) {
            return "Conquest";
        }
        // Otherwise, pivot to Progress - safer bet with science-on-kill advantage
        return "Progress";
    }

    const hasStarCharts = player.techs.includes(TechId.StarCharts);

    // Prefer progress if profile invests heavily AND we have path unlocked.
    const progressAffinity =
        (profile.build.weights.project[ProjectId.Observatory] ?? 0) +
        (profile.build.weights.project[ProjectId.GrandAcademy] ?? 0) +
        (profile.build.weights.project[ProjectId.GrandExperiment] ?? 0);

    if (hasStarCharts && (progressAffinity >= 2.5 || profile.tactics.riskTolerance < 0.3)) {
        const conquestFirstCivs = ["ForgeClans", "AetherianVanguard"];
        if (conquestFirstCivs.includes(profile.civName)) {
            // Stay on Conquest but can still build Progress projects concurrently.
            return "Conquest";
        }
        return "Progress";
    }

    // If currently at war, lean Conquest unless civ is very peace-biased.
    const inWar = isAtWarV2(state, playerId);
    if (inWar && profile.diplomacy.warPowerRatio <= 1.2) return "Conquest";

    // If we are an aggressive civ and a progress threat exists, treat it as Conquest mode (deny the win).
    if (profile.diplomacy.canInitiateWars && profile.diplomacy.warPowerRatio <= 1.35) {
        const threatExists = state.players.some(p => p.id !== playerId && !p.isEliminated && isProgressThreat(state, p.id));
        if (threatExists) return "Conquest";
    }

    // v1.1.0: Aggressive civs should default to Conquest to drive early military buildup
    // This ensures they build siege units (Trebuchets) in the Expand phase
    // v9.8: Aggressive civs default to Conquest, BUT pivot if they dominate.
    const aggressiveCivs = ["ForgeClans", "RiverLeague", "JadeCovenant"];
    if (aggressiveCivs.includes(profile.civName)) {
        // If we have a massive empire (captured cities), pivot to Hybrid/Progress
        const myCities = state.cities.filter(c => c.ownerId === playerId).length;
        // If we have > 8 cities, our science output from captures qualifies us for Progress.
        // Also if we have Titanium/Landships (CompositeArmor), we can afford to divert production.
        const hasCompositeArmor = player.techs.includes(TechId.CompositeArmor);

        if (myCities >= 8 && hasCompositeArmor && hasStarCharts) {
            return "Progress"; // Hybrid Win: Conquest Military + Science Finish
        }
        return "Conquest";
    }

    // Otherwise Balanced.
    return "Balanced";
}

export function selectFocusTargetV2(state: GameState, playerId: string): { state: GameState; focusTargetId?: string; focusCityId?: string } {
    const memory = getAiMemoryV2(state, playerId);
    const profile = getAiProfileV2(state, playerId);
    const myPower = estimateMilitaryPower(playerId, state);

    const enemies = state.players.filter(p => p.id !== playerId && !p.isEliminated);
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

    const candidateTargets = enemies
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

            // Overall: prefer reasonable distance + weak/finishable + preference.
            const deny = (profile.diplomacy.canInitiateWars && profile.diplomacy.warPowerRatio <= 1.35 && progressThreat) ? 45 : 0;
            const score = pref + (ratio * 5) - (nearestCityDist * 0.35) + (isFinishable ? 6 : 0) + deny + humanBonus;
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

export function selectFocusCityAgainstTarget(state: GameState, playerId: string, targetId: string): City | undefined {
    const profile = getAiProfileV2(state, playerId);
    const myCities = state.cities.filter(c => c.ownerId === playerId);
    const anchor = myCities.find(c => c.isCapital) ?? myCities[0];
    if (!anchor) return undefined;

    const enemyCities = state.cities.filter(c => c.ownerId === targetId);
    if (enemyCities.length === 0) return undefined;

    const scored = enemyCities.map(c => {
        const dist = hexDistance(anchor.coord, c.coord);
        const cityValue = getCityValueProfile(state, playerId, c);
        const progressProject =
            c.currentBuild?.type === "Project" &&
            (c.currentBuild.id === ProjectId.Observatory || c.currentBuild.id === ProjectId.GrandAcademy || c.currentBuild.id === ProjectId.GrandExperiment);
        const denyScore = progressProject ? 2000 : 0;
        const siegeCommitmentScore = profile.tactics.siegeCommitment * 6 * (1 - cityValue.hpFrac);
        const score =
            denyScore +
            cityValue.totalValue +
            siegeCommitmentScore +
            (-dist * 0.45);
        return { c, score };
    });

    return pickBest(scored, s => s.score)?.item?.c;
}
