import { GameState } from "../../core/types.js";

export type AiPlaystyle = {
    /**
     * 0..1. Higher means more willing to take risky fights when advantage is unclear.
     */
    riskTolerance: number;
    /**
     * 0..1. Higher means prefer concentrating force for timing windows over skirmishing.
     */
    forceConcentration: number;
    /**
     * 0..1. Higher means prioritize finishing sieges/captures once started.
     */
    siegeCommitment: number;
    /**
     * 0..1. Higher means expand earlier/more aggressively when safe.
     */
    expansionDrive: number;
    /**
     * 0..1. Higher means invest in progress victory chain more readily.
     */
    progressDrive: number;
};

const defaultPlaystyle: AiPlaystyle = {
    riskTolerance: 0.35,
    forceConcentration: 0.55,
    siegeCommitment: 0.55,
    expansionDrive: 0.55,
    progressDrive: 0.45,
};

export function getPlaystyleForPlayer(state: GameState, playerId: string): AiPlaystyle {
    const player = state.players.find(p => p.id === playerId);
    const civ = player?.civName;

    // NOTE: This is intentionally small and “weight-based”.
    // We’ll expand this as we migrate decisions to utility scoring.
    if (civ === "ForgeClans") {
        // Production advantage → build up a decisive local advantage, then prosecute sieges hard.
        return {
            ...defaultPlaystyle,
            riskTolerance: 0.35,
            forceConcentration: 0.85,
            siegeCommitment: 0.80,
            expansionDrive: 0.40,
            progressDrive: 0.30,
        };
    }

    if (civ === "AetherianVanguard") {
        return {
            ...defaultPlaystyle,
            riskTolerance: 0.55,
            forceConcentration: 0.75,
            siegeCommitment: 0.75,
            expansionDrive: 0.45,
            progressDrive: 0.25,
        };
    }

    if (civ === "StarborneSeekers" || civ === "ScholarKingdoms") {
        return {
            ...defaultPlaystyle,
            riskTolerance: 0.20,
            forceConcentration: 0.50,
            siegeCommitment: 0.45,
            expansionDrive: 0.35,
            progressDrive: 0.85,
        };
    }

    if (civ === "JadeCovenant" || civ === "RiverLeague") {
        return {
            ...defaultPlaystyle,
            riskTolerance: 0.35,
            forceConcentration: 0.60,
            siegeCommitment: 0.55,
            expansionDrive: 0.75,
            progressDrive: 0.55,
        };
    }

    return defaultPlaystyle;
}







