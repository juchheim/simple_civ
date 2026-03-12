export const DEVELOPED_GOLD_HUB_MIN_TURN = 101;
export const DEVELOPED_GOLD_HUB_MIN_CITIES = 3;
export const DEVELOPED_GOLD_HUB_TARGET = 0.45;
export const DEVELOPED_GOLD_HUB_MAX_CIV = 0.50;
export const STRATEGIC_SITE_RATE_LABEL = "Strategic Site Rate";
export const DEVELOPED_GOLD_SHARE_LABEL = "Developed Top Gold City Share";
export const LEGACY_GOLD_SHARE_LABEL = "Legacy Top Gold City Share (All Turns)";

export function isDevelopedEconomySample(turn, ownedCityCount) {
    return turn >= DEVELOPED_GOLD_HUB_MIN_TURN && ownedCityCount >= DEVELOPED_GOLD_HUB_MIN_CITIES;
}

export function evaluateChallengePressure({ avgNet, deficitRate, austerityRate, lateNet }) {
    return avgNet >= 0
        && avgNet <= 20
        && deficitRate >= 0.10
        && deficitRate <= 0.55
        && austerityRate >= 0.04
        && austerityRate <= 0.42
        && lateNet <= 38;
}

export function evaluateEconomyInfrastructure({
    avgGoldEconomyCities,
    multiGoldEconomyTurnRate,
    marketAdoptionRate,
    bankAdoptionRate,
}) {
    return avgGoldEconomyCities >= 1.6
        && multiGoldEconomyTurnRate >= 0.35
        && marketAdoptionRate >= 0.45
        && bankAdoptionRate >= 0.25;
}

export function evaluateGoldHubCity({ avgDevelopedTopCityGoldShare }) {
    return avgDevelopedTopCityGoldShare > 0
        && avgDevelopedTopCityGoldShare <= DEVELOPED_GOLD_HUB_TARGET;
}

export function evaluateAdaptationAndArmy({
    militaryProducedPer100Turns,
    supplyPerCity,
    deficitEntryCount,
    deficitRecoveryRate,
    deficitRate,
    militaryProducedUnderStressRate,
}) {
    return militaryProducedPer100Turns >= 2.0
        && supplyPerCity >= 1.6
        && (deficitEntryCount <= 2 || deficitRecoveryRate >= 0.18)
        && (deficitRate < 0.20 || militaryProducedUnderStressRate >= 0.10);
}

export function evaluateScarcityPillars(input) {
    const challengeHealthy = evaluateChallengePressure(input);
    const infrastructureHealthy = evaluateEconomyInfrastructure(input);
    const goldHubHealthy = evaluateGoldHubCity(input);
    const adaptationHealthy = evaluateAdaptationAndArmy(input);
    const healthyPillars = Number(challengeHealthy)
        + Number(infrastructureHealthy)
        + Number(goldHubHealthy)
        + Number(adaptationHealthy);

    return {
        challengeHealthy,
        infrastructureHealthy,
        goldHubHealthy,
        adaptationHealthy,
        healthyPillars,
        verdict: healthyPillars >= 3 ? "Healthy" : "Needs Tuning",
    };
}

export function summarizeDevelopedGoldHubShipGate(civRows) {
    const shares = civRows
        .map(row => Number(row.avgDevelopedTopCityGoldShare))
        .filter(value => Number.isFinite(value) && value > 0);
    const passingCivs = shares.filter(value => value <= DEVELOPED_GOLD_HUB_TARGET).length;
    const totalCivs = shares.length;
    const maxShare = shares.length > 0 ? Math.max(...shares) : 0;

    return {
        passingCivs,
        totalCivs,
        maxShare,
        met: totalCivs > 0
            && passingCivs >= 5
            && maxShare <= DEVELOPED_GOLD_HUB_MAX_CIV,
    };
}
