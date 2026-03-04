import { readFileSync, writeFileSync } from "fs";

const RESULTS_FILE = "/tmp/comprehensive-simulation-results.json";
const OUTPUT_FILE = "/tmp/city-state-report.md";

const YIELD_TYPES = ["Science", "Production", "Food", "Gold"];
const CIV_ORDER = ["ForgeClans", "ScholarKingdoms", "RiverLeague", "AetherianVanguard", "StarborneSeekers", "JadeCovenant"];
const MAP_ORDER = ["Tiny", "Small", "Standard", "Large", "Huge"];
const SUZERAIN_CHANGE_CAUSES = ["Investment", "PassiveContestation", "WartimeRelease", "WarBreak", "Other"];
const CAMP_OUTCOME_ORDER = ["ClearedBySelf", "ClearedByOther", "TimedOut", "WarPrepCancelled", "WartimeEmergencyCancelled", "CampVanished", "Retargeted", "Eliminated", "OtherCancelled", "StillActive"];
const CAMP_READINESS_ORDER = ["PreArmy", "ArmyTech", "ArmyFielded"];
const CAMP_PREP_STATE_ORDER = ["Buildup", "Gathering", "Positioning", "Ready"];

function num(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function avg(total, count) {
    return count > 0 ? total / count : 0;
}

function pct(part, total) {
    return total > 0 ? (part / total) * 100 : 0;
}

function fmt(value, digits = 2) {
    return Number.isFinite(value) ? value.toFixed(digits) : "n/a";
}

function markdownTable(headers, rows) {
    const head = `| ${headers.join(" | ")} |`;
    const divider = `| ${headers.map(() => "---").join(" | ")} |`;
    const body = rows.map(row => `| ${row.join(" | ")} |`).join("\n");
    return `${head}\n${divider}\n${body}`;
}

function percentile(sortedValues, p) {
    if (!sortedValues.length) return NaN;
    if (sortedValues.length === 1) return sortedValues[0];
    const clamped = Math.max(0, Math.min(1, p));
    const idx = clamped * (sortedValues.length - 1);
    const low = Math.floor(idx);
    const high = Math.ceil(idx);
    if (low === high) return sortedValues[low];
    const weight = idx - low;
    return sortedValues[low] * (1 - weight) + sortedValues[high] * weight;
}

function summarizeDistribution(values) {
    if (!values.length) {
        return {
            min: NaN,
            p25: NaN,
            median: NaN,
            p75: NaN,
            max: NaN,
            avg: NaN,
        };
    }
    const sorted = [...values].sort((a, b) => a - b);
    const total = sorted.reduce((sum, value) => sum + value, 0);
    return {
        min: sorted[0],
        p25: percentile(sorted, 0.25),
        median: percentile(sorted, 0.5),
        p75: percentile(sorted, 0.75),
        max: sorted[sorted.length - 1],
        avg: total / sorted.length,
    };
}

function pearson(xs, ys) {
    if (!Array.isArray(xs) || !Array.isArray(ys) || xs.length !== ys.length || xs.length === 0) return 0;

    const xMean = avg(xs.reduce((sum, value) => sum + value, 0), xs.length);
    const yMean = avg(ys.reduce((sum, value) => sum + value, 0), ys.length);

    let cov = 0;
    let xVar = 0;
    let yVar = 0;
    for (let i = 0; i < xs.length; i++) {
        const dx = xs[i] - xMean;
        const dy = ys[i] - yMean;
        cov += dx * dy;
        xVar += dx * dx;
        yVar += dy * dy;
    }

    const denom = Math.sqrt(xVar * yVar);
    return denom > 0 ? cov / denom : 0;
}

function createPerSimMetric() {
    return {
        suzerainTurns: 0,
        investedGold: 0,
        maintenanceGoldSpent: 0,
        investmentActions: 0,
        maintenanceInvestmentActions: 0,
        safeMaintenanceGoldSpent: 0,
        safeMaintenanceActions: 0,
        turnoverGoldSpent: 0,
        turnoverActions: 0,
        flipWindowGoldSpent: 0,
        flipWindowActions: 0,
        deepChallengeGoldSpent: 0,
        deepChallengeActions: 0,
        neutralClaimGoldSpent: 0,
        neutralClaimActions: 0,
        pairFatigueGoldSpent: 0,
        pairFatigueActions: 0,
        focusTurns: 0,
        focusChallengeTurns: 0,
        focusMaintenanceTurns: 0,
        focusAssignments: 0,
        focusSwitches: 0,
    };
}

function createCivAggregate() {
    return {
        games: 0,
        wins: 0,
        totalSuzerainTurns: 0,
        totalInvestedGold: 0,
        totalMaintenanceGold: 0,
        totalInvestmentActions: 0,
        totalMaintenanceInvestmentActions: 0,
        totalSafeMaintenanceGold: 0,
        totalSafeMaintenanceActions: 0,
        totalTurnoverGold: 0,
        totalTurnoverActions: 0,
        totalFlipWindowGold: 0,
        totalFlipWindowActions: 0,
        totalDeepChallengeGold: 0,
        totalDeepChallengeActions: 0,
        totalNeutralClaimGold: 0,
        totalNeutralClaimActions: 0,
        totalPairFatigueGold: 0,
        totalPairFatigueActions: 0,
        totalFocusTurns: 0,
        totalFocusChallengeTurns: 0,
        totalFocusMaintenanceTurns: 0,
        totalFocusAssignments: 0,
        totalFocusSwitches: 0,
        gamesWithSuzerain: 0,
        winsWithSuzerain: 0,
        gamesWithoutSuzerain: 0,
        winsWithoutSuzerain: 0,
        gamesWithInvestment: 0,
        winsWithInvestment: 0,
        topSuzerainClaims: 0,
    };
}

function createYieldAggregate() {
    return {
        cityStates: 0,
        activeTurns: 0,
        contestedTurns: 0,
        noSuzerainContestedTurns: 0,
        closeRaceContestedTurns: 0,
        turnoverWindowTurns: 0,
        flipWindowTurns: 0,
        safeLeadTurns: 0,
        hotspotTurns: 0,
        passiveContestationTurns: 0,
        passiveCloseRaceTurns: 0,
        passiveAssistedSuzerainChanges: 0,
        passiveAssistedOwnershipTurnovers: 0,
        suzerainChanges: 0,
        ownershipTurnovers: 0,
        uniqueSuzerainTotal: 0,
        surviving: 0,
        removed: 0,
    };
}

function createMapAggregate() {
    return {
        sims: 0,
        telemetrySims: 0,
        simsWithCityStates: 0,
        totalCreated: 0,
        totalActiveTurns: 0,
        firstCreationTurns: [],
    };
}

function createCityAggregate(name, yieldType) {
    return {
        name,
        yieldType,
        appearances: 0,
        activeTurns: 0,
        contestedTurns: 0,
        noSuzerainContestedTurns: 0,
        closeRaceContestedTurns: 0,
        turnoverWindowTurns: 0,
        flipWindowTurns: 0,
        safeLeadTurns: 0,
        hotspotTurns: 0,
        passiveContestationTurns: 0,
        passiveCloseRaceTurns: 0,
        passiveAssistedSuzerainChanges: 0,
        passiveAssistedOwnershipTurnovers: 0,
        suzerainChanges: 0,
        ownershipTurnovers: 0,
        suzerainChangesByCause: createCauseAggregate(),
        ownershipTurnoversByCause: createCauseAggregate(),
        passiveAssistedSuzerainChangesByCause: createCauseAggregate(),
        passiveAssistedOwnershipTurnoversByCause: createCauseAggregate(),
        uniqueSuzerainTotal: 0,
        suzerainTurnsByCiv: new Map(),
        focusTurnsByCiv: new Map(),
        focusChallengeTurnsByCiv: new Map(),
        focusMaintenanceTurnsByCiv: new Map(),
        investmentByCiv: new Map(),
    };
}

function createCauseAggregate() {
    return Object.fromEntries(SUZERAIN_CHANGE_CAUSES.map(cause => [cause, 0]));
}

function createCampOutcomeAggregate() {
    return Object.fromEntries(CAMP_OUTCOME_ORDER.map(outcome => [outcome, 0]));
}

function createCampReadinessAggregate() {
    return {
        episodes: 0,
        selfClears: 0,
        timedOut: 0,
        reachedReady: 0,
        totalPrepTurns: 0,
        prepToReadyTurns: 0,
        prepToReadySamples: 0,
    };
}

function ensureMapValue(map, key, createFn) {
    if (!map.has(key)) {
        map.set(key, createFn());
    }
    return map.get(key);
}

function contestedBreakdown(cityState) {
    const contestedTurns = num(cityState.contestedTurns, 0);
    const hasNoSuz = cityState?.noSuzerainContestedTurns !== undefined && cityState?.noSuzerainContestedTurns !== null;
    const hasCloseRace = cityState?.closeRaceContestedTurns !== undefined && cityState?.closeRaceContestedTurns !== null;

    if (!hasNoSuz && !hasCloseRace) {
        return {
            total: contestedTurns,
            noSuzerain: contestedTurns,
            closeRace: 0,
            hasBreakdown: false,
        };
    }

    const noSuzerain = num(cityState.noSuzerainContestedTurns, 0);
    const closeRace = num(cityState.closeRaceContestedTurns, 0);
    return {
        total: Math.max(contestedTurns, noSuzerain + closeRace),
        noSuzerain,
        closeRace,
        hasBreakdown: true,
    };
}

function uniqueSuzerainsForCityState(cityState) {
    const reportedCount = num(cityState.uniqueSuzerainCount, NaN);
    if (Number.isFinite(reportedCount) && reportedCount >= 0) {
        return reportedCount;
    }

    const ids = new Set(
        Object.entries(cityState.suzerainTurnsByPlayer || {})
            .filter(([, turns]) => num(turns, 0) > 0)
            .map(([playerId]) => playerId)
    );
    if (cityState.finalSuzerainId) {
        ids.add(cityState.finalSuzerainId);
    }
    return ids.size;
}

function formatTurnBreakdown(turnMap) {
    const entries = Array.from(turnMap.entries())
        .filter(([, turns]) => turns > 0)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    if (entries.length === 0) return "None";
    return entries.map(([civ, turns]) => `${civ} ${fmt(turns, 0)}T`).join(", ");
}

function formatInvestmentBreakdown(investMap) {
    const entries = Array.from(investMap.entries())
        .filter(([, value]) => value.goldSpent > 0 || value.actions > 0)
        .sort((a, b) => b[1].goldSpent - a[1].goldSpent || a[0].localeCompare(b[0]));
    if (entries.length === 0) return "None";
    return entries.map(([civ, value]) => {
        const maintenancePart = value.maintenanceGoldSpent > 0
            ? `, maintain ${fmt(value.maintenanceGoldSpent, 0)}G`
            : "";
        return `${civ} ${fmt(value.goldSpent, 0)}G/${fmt(value.actions, 0)}${maintenancePart}`;
    }).join(", ");
}

function formatFocusBreakdown(turnMap) {
    const entries = Array.from(turnMap.entries())
        .filter(([, turns]) => turns > 0)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    if (entries.length === 0) return "None";
    return entries.map(([civ, turns]) => `${civ} ${fmt(turns, 0)}T`).join(", ");
}

function readCauseCounter(raw) {
    const counter = createCauseAggregate();
    for (const cause of SUZERAIN_CHANGE_CAUSES) {
        counter[cause] = num(raw?.[cause], 0);
    }
    return counter;
}

function addCauseCounter(target, source) {
    for (const cause of SUZERAIN_CHANGE_CAUSES) {
        target[cause] += num(source?.[cause], 0);
    }
}

function formatCauseBreakdown(counter) {
    const entries = SUZERAIN_CHANGE_CAUSES
        .map(cause => [cause, num(counter?.[cause], 0)])
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    if (entries.length === 0) return "None";
    return entries.map(([cause, count]) => `${cause} ${fmt(count, 0)}`).join(", ");
}

function readPairCounter(raw) {
    const counter = {};
    for (const [pairKey, count] of Object.entries(raw || {})) {
        const numeric = num(count, 0);
        if (numeric > 0) counter[pairKey] = numeric;
    }
    return counter;
}

function formatPairBreakdown(counter, idToCiv) {
    const entries = Object.entries(counter || {})
        .map(([pairKey, count]) => {
            const [a = "?", b = "?"] = pairKey.split("|");
            const civA = idToCiv.get(a) || a;
            const civB = idToCiv.get(b) || b;
            return [`${civA} <> ${civB}`, num(count, 0)];
        })
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    if (entries.length === 0) return "None";
    return entries.map(([pair, count]) => `${pair} ${fmt(count, 0)}`).join(", ");
}

const results = JSON.parse(readFileSync(RESULTS_FILE, "utf8"));

const civAgg = new Map();
const yieldAgg = new Map(YIELD_TYPES.map(type => [type, createYieldAggregate()]));
const cityAgg = new Map();
const mapAgg = new Map();

let simsWithCityStateTelemetry = 0;
let simsMissingCityStateTelemetry = 0;
let totalCityStatesCreated = 0;
let totalCityStateActiveTurns = 0;
let totalSurvivingCityStates = 0;
let totalContestedTurns = 0;
let totalNoSuzerainContestedTurns = 0;
let totalCloseRaceContestedTurns = 0;
let totalTurnoverWindowTurns = 0;
let totalFlipWindowTurns = 0;
let totalSafeLeadTurns = 0;
let totalHotspotTurns = 0;
let totalPassiveContestationTurns = 0;
let totalPassiveCloseRaceTurns = 0;
let totalPassiveOpenings = 0;
let totalPassiveOpeningTurnDelayTotal = 0;
let totalPassiveOpeningsTreasuryAffordable = 0;
let totalPassiveOpeningsReserveSafe = 0;
let totalPassiveOpeningsAttemptedByNominated = 0;
let totalPassiveOpeningAttemptTurnDelayTotal = 0;
let totalPassiveOpeningAttemptTurnDelaySamples = 0;
let totalPassiveOpeningsNoAttempt = 0;
let totalPassiveOpeningsNoAttemptTreasuryBlocked = 0;
let totalPassiveOpeningsNoAttemptReserveBlocked = 0;
let totalPassiveOpeningsNoAttemptDespiteCapacity = 0;
let totalPassiveOpeningsResolved = 0;
let totalPassiveOpeningsWonByNominated = 0;
let totalPassiveOpeningsLost = 0;
let totalPassiveOpeningsExpired = 0;
let totalPassiveAssistedSuzerainChanges = 0;
let totalPassiveAssistedOwnershipTurnovers = 0;
let totalSuzerainChanges = 0;
let totalOwnershipTurnovers = 0;
let totalUniqueSuzerains = 0;
let cityStatesWithContestBreakdown = 0;
let cityStatesWithoutContestBreakdown = 0;
const totalSuzerainChangesByCause = createCauseAggregate();
const totalOwnershipTurnoversByCause = createCauseAggregate();
const totalPassiveAssistedSuzerainChangesByCause = createCauseAggregate();
const totalPassiveAssistedOwnershipTurnoversByCause = createCauseAggregate();
const totalPassiveOpeningsResolvedByCause = createCauseAggregate();
const totalPassiveOpeningsWonByNominatedByCause = createCauseAggregate();
const firstCreationTurns = [];
let totalInvestedGoldAllParticipants = 0;
let totalMaintenanceGoldAllParticipants = 0;
let totalInvestmentActionsAllParticipants = 0;
let totalMaintenanceInvestmentActionsAllParticipants = 0;
let totalSafeMaintenanceGoldAllParticipants = 0;
let totalSafeMaintenanceActionsAllParticipants = 0;
let totalTurnoverGoldAllParticipants = 0;
let totalTurnoverActionsAllParticipants = 0;
let totalFlipWindowGoldAllParticipants = 0;
let totalFlipWindowActionsAllParticipants = 0;
let totalDeepChallengeGoldAllParticipants = 0;
let totalDeepChallengeActionsAllParticipants = 0;
let totalNeutralClaimGoldAllParticipants = 0;
let totalNeutralClaimActionsAllParticipants = 0;
let totalPairFatigueGoldAllParticipants = 0;
let totalPairFatigueActionsAllParticipants = 0;
let totalFocusTurnsAllParticipants = 0;
let totalFocusChallengeTurnsAllParticipants = 0;
let totalFocusMaintenanceTurnsAllParticipants = 0;
let totalFocusAssignmentsAllParticipants = 0;
let totalFocusSwitchesAllParticipants = 0;
let totalSuzerainTurnsAllParticipants = 0;
let totalCampClearingEpisodes = 0;
const campOutcomeCounts = createCampOutcomeAggregate();
const campReadinessAgg = new Map(CAMP_READINESS_ORDER.map(readiness => [readiness, createCampReadinessAggregate()]));
const campInitialPrepStateCounts = Object.fromEntries(CAMP_PREP_STATE_ORDER.map(state => [state, 0]));
const campSightedToPrepTurns = [];
const campPrepToReadyTurns = [];
const campPrepToSelfClearTurns = [];
const campTotalPrepTurns = [];
let campDirectReadyStarts = 0;
let campReachedReadyEpisodes = 0;
let campEpisodesWithSighting = 0;
let campTimeoutAfterReady = 0;
let campClearedByOtherFromBuildup = 0;
let campClearedByOtherFromLateStart = 0;
let campClearedByOtherOther = 0;
let campWarInterruptedEpisodes = 0;
const campEpisodeRows = [];

const winFlags = [];
const suzerainObservations = [];
const investedGoldObservations = [];
const cityStateInstanceRows = [];

let winnerSamples = 0;
let winnerSuzerainTurnsTotal = 0;
let winnerInvestedGoldTotal = 0;
let winnersWithAnySuzerain = 0;
let winnersWithAnyInvestment = 0;
const winnerSuzerainShareOfSim = [];

let nonWinnerSamples = 0;
let nonWinnerSuzerainTurnsTotal = 0;
let nonWinnerInvestedGoldTotal = 0;

let participantsWithSuzerain = 0;
let participantWinsWithSuzerain = 0;
let participantsWithoutSuzerain = 0;
let participantWinsWithoutSuzerain = 0;
let participantsWithInvestment = 0;
let participantWinsWithInvestment = 0;

for (const sim of results) {
    const summary = sim.cityStateSummary;
    const mapSize = sim.mapSize || "Unknown";
    const mapSummary = ensureMapValue(mapAgg, mapSize, createMapAggregate);
    mapSummary.sims += 1;
    const participants = sim.participatingCivs || sim.finalState?.civs || [];
    const idToCiv = new Map();
    const participantCivs = new Set();

    for (const participant of participants) {
        if (!participant?.id || !participant?.civName) continue;
        idToCiv.set(participant.id, participant.civName);
        participantCivs.add(participant.civName);
    }

    if (!summary || typeof summary !== "object" || !Array.isArray(summary.cityStates) || typeof summary.byPlayer !== "object") {
        simsMissingCityStateTelemetry += 1;
        continue;
    }

    simsWithCityStateTelemetry += 1;
    mapSummary.telemetrySims += 1;
    totalCityStatesCreated += num(summary.totalCityStatesCreated, summary.cityStates.length);
    totalCityStateActiveTurns += num(
        summary.totalCityStateActiveTurns,
        summary.cityStates.reduce((sum, cityState) => sum + num(cityState.activeTurns, 0), 0)
    );
    totalSurvivingCityStates += num(
        summary.survivingCityStates,
        summary.cityStates.filter(cityState => cityState.removedTurn === null || cityState.removedTurn === undefined).length
    );

    const createdCount = num(summary.totalCityStatesCreated, summary.cityStates.length);
    mapSummary.totalCreated += createdCount;
    mapSummary.totalActiveTurns += num(
        summary.totalCityStateActiveTurns,
        summary.cityStates.reduce((sum, cityState) => sum + num(cityState.activeTurns, 0), 0)
    );
    if (createdCount > 0) {
        mapSummary.simsWithCityStates += 1;
        const createdTurns = summary.cityStates
            .map(cityState => num(cityState.createdTurn, NaN))
            .filter(turn => Number.isFinite(turn));
        if (createdTurns.length > 0) {
            const firstCreatedTurn = Math.min(...createdTurns);
            mapSummary.firstCreationTurns.push(firstCreatedTurn);
            firstCreationTurns.push(firstCreatedTurn);
        }
    }

    const campEpisodes = Array.isArray(summary.campClearing?.episodes) ? summary.campClearing.episodes : [];
    for (const episode of campEpisodes) {
        const outcome = CAMP_OUTCOME_ORDER.includes(episode.outcome) ? episode.outcome : "OtherCancelled";
        const readiness = CAMP_READINESS_ORDER.includes(episode.readinessAtStart) ? episode.readinessAtStart : "PreArmy";
        const initialPrepState = CAMP_PREP_STATE_ORDER.includes(episode.initialPrepState) ? episode.initialPrepState : "Buildup";
        const prepStartedTurn = num(episode.prepStartedTurn, NaN);
        const endedTurn = num(episode.endedTurn, NaN);
        const firstReadyTurn = num(episode.firstReadyTurn, NaN);
        const campClearedTurn = num(episode.campClearedTurn, NaN);
        const totalPrep = num(episode.totalPrepTurns, 0);
        const sightedTurn = num(episode.sightedTurn, NaN);
        const initialMilitaryCount = num(episode.initialMilitaryCount, NaN);
        const initialRequiredMilitary = num(episode.initialRequiredMilitary, NaN);

        totalCampClearingEpisodes += 1;
        campOutcomeCounts[outcome] += 1;
        campInitialPrepStateCounts[initialPrepState] += 1;
        const readinessEntry = campReadinessAgg.get(readiness);
        readinessEntry.episodes += 1;
        readinessEntry.totalPrepTurns += totalPrep;
        campTotalPrepTurns.push(totalPrep);

        if (initialPrepState === "Ready") {
            campDirectReadyStarts += 1;
        }
        if (Number.isFinite(sightedTurn) && Number.isFinite(prepStartedTurn)) {
            campEpisodesWithSighting += 1;
            campSightedToPrepTurns.push(prepStartedTurn - sightedTurn);
        }
        if (Number.isFinite(firstReadyTurn) && Number.isFinite(prepStartedTurn)) {
            campReachedReadyEpisodes += 1;
            readinessEntry.reachedReady += 1;
            const prepToReady = firstReadyTurn - prepStartedTurn;
            readinessEntry.prepToReadyTurns += prepToReady;
            readinessEntry.prepToReadySamples += 1;
            campPrepToReadyTurns.push(prepToReady);
        }
        if (outcome === "ClearedBySelf") {
            readinessEntry.selfClears += 1;
            if (Number.isFinite(campClearedTurn) && Number.isFinite(prepStartedTurn)) {
                campPrepToSelfClearTurns.push(campClearedTurn - prepStartedTurn);
            }
        }
        if (outcome === "TimedOut") {
            readinessEntry.timedOut += 1;
            if (Number.isFinite(firstReadyTurn)) {
                campTimeoutAfterReady += 1;
            }
        }
        if (outcome === "WarPrepCancelled" || outcome === "WartimeEmergencyCancelled") {
            campWarInterruptedEpisodes += 1;
        }
        if (outcome === "ClearedByOther") {
            if (
                (Number.isFinite(initialMilitaryCount) && Number.isFinite(initialRequiredMilitary) && initialMilitaryCount < initialRequiredMilitary)
                || initialPrepState === "Buildup"
            ) {
                campClearedByOtherFromBuildup += 1;
            } else if (Number.isFinite(sightedTurn) && Number.isFinite(prepStartedTurn) && (prepStartedTurn - sightedTurn) >= 3) {
                campClearedByOtherFromLateStart += 1;
            } else {
                campClearedByOtherOther += 1;
            }
        }

        campEpisodeRows.push({
            mapSize,
            seed: sim.seed,
            civName: episode.civName || idToCiv.get(episode.playerId) || episode.playerId,
            outcome,
            readiness,
            initialPrepState,
            prepStartedTurn,
            endedTurn,
            totalPrep,
            sightedToPrep: Number.isFinite(sightedTurn) && Number.isFinite(prepStartedTurn) ? (prepStartedTurn - sightedTurn) : NaN,
            prepToReady: Number.isFinite(firstReadyTurn) && Number.isFinite(prepStartedTurn) ? (firstReadyTurn - prepStartedTurn) : NaN,
        });
    }

    const perSimCiv = new Map();
    for (const civName of participantCivs.values()) {
        perSimCiv.set(civName, createPerSimMetric());
    }

    for (const [playerId, playerSummaryRaw] of Object.entries(summary.byPlayer || {})) {
        const playerSummary = playerSummaryRaw || {};
        const civName = playerSummary.civName || idToCiv.get(playerId) || playerId;
        if (!perSimCiv.has(civName)) {
            perSimCiv.set(civName, createPerSimMetric());
        }
        const metrics = perSimCiv.get(civName);
        metrics.suzerainTurns += num(playerSummary.suzerainTurns, 0);
        metrics.investedGold += num(playerSummary.investedGold, 0);
        metrics.maintenanceGoldSpent += num(playerSummary.maintenanceGoldSpent, 0);
        metrics.investmentActions += num(playerSummary.investmentActions, 0);
        metrics.maintenanceInvestmentActions += num(playerSummary.maintenanceInvestmentActions, 0);
        metrics.safeMaintenanceGoldSpent += num(playerSummary.safeMaintenanceGoldSpent, 0);
        metrics.safeMaintenanceActions += num(playerSummary.safeMaintenanceActions, 0);
        metrics.turnoverGoldSpent += num(playerSummary.turnoverGoldSpent, 0);
        metrics.turnoverActions += num(playerSummary.turnoverActions, 0);
        metrics.flipWindowGoldSpent += num(playerSummary.flipWindowGoldSpent, 0);
        metrics.flipWindowActions += num(playerSummary.flipWindowActions, 0);
        metrics.deepChallengeGoldSpent += num(playerSummary.deepChallengeGoldSpent, 0);
        metrics.deepChallengeActions += num(playerSummary.deepChallengeActions, 0);
        metrics.neutralClaimGoldSpent += num(playerSummary.neutralClaimGoldSpent, 0);
        metrics.neutralClaimActions += num(playerSummary.neutralClaimActions, 0);
        metrics.pairFatigueGoldSpent += num(playerSummary.pairFatigueGoldSpent, 0);
        metrics.pairFatigueActions += num(playerSummary.pairFatigueActions, 0);
        metrics.focusTurns += num(playerSummary.focusTurns, 0);
        metrics.focusChallengeTurns += num(playerSummary.focusChallengeTurns, 0);
        metrics.focusMaintenanceTurns += num(playerSummary.focusMaintenanceTurns, 0);
        metrics.focusAssignments += num(playerSummary.focusAssignments, 0);
        metrics.focusSwitches += num(playerSummary.focusSwitches, 0);
    }

    for (const cityState of summary.cityStates) {
        const yieldType = YIELD_TYPES.includes(cityState.yieldType) ? cityState.yieldType : "Science";
        const yieldSummary = ensureMapValue(yieldAgg, yieldType, createYieldAggregate);
        const contested = contestedBreakdown(cityState);
        const suzerainChanges = num(cityState.suzerainChanges, 0);
        const ownershipTurnovers = num(cityState.ownershipTurnovers, 0);
        const uniqueSuzerainCount = uniqueSuzerainsForCityState(cityState);
        const turnoverWindowTurns = num(cityState.turnoverWindowTurns, 0);
        const flipWindowTurns = num(cityState.flipWindowTurns, 0);
        const safeLeadTurns = num(cityState.safeLeadTurns, 0);
        const hotspotTurns = num(cityState.hotspotTurns, 0);
        const passiveContestationTurns = num(cityState.passiveContestationTurns, 0);
        const passiveCloseRaceTurns = num(cityState.passiveCloseRaceTurns, 0);
        const passiveOpenings = num(cityState.passiveOpenings, 0);
        const passiveOpeningTurnDelayTotal = num(cityState.passiveOpeningTurnDelayTotal, 0);
        const passiveOpeningsTreasuryAffordable = num(cityState.passiveOpeningsTreasuryAffordable, 0);
        const passiveOpeningsReserveSafe = num(cityState.passiveOpeningsReserveSafe, 0);
        const passiveOpeningsAttemptedByNominated = num(cityState.passiveOpeningsAttemptedByNominated, 0);
        const passiveOpeningAttemptTurnDelayTotal = num(cityState.passiveOpeningAttemptTurnDelayTotal, 0);
        const passiveOpeningAttemptTurnDelaySamples = num(cityState.passiveOpeningAttemptTurnDelaySamples, 0);
        const passiveOpeningsNoAttempt = num(cityState.passiveOpeningsNoAttempt, 0);
        const passiveOpeningsNoAttemptTreasuryBlocked = num(cityState.passiveOpeningsNoAttemptTreasuryBlocked, 0);
        const passiveOpeningsNoAttemptReserveBlocked = num(cityState.passiveOpeningsNoAttemptReserveBlocked, 0);
        const passiveOpeningsNoAttemptDespiteCapacity = num(cityState.passiveOpeningsNoAttemptDespiteCapacity, 0);
        const passiveOpeningsResolved = num(cityState.passiveOpeningsResolved, 0);
        const passiveOpeningsWonByNominated = num(cityState.passiveOpeningsWonByNominated, 0);
        const passiveOpeningsLost = num(cityState.passiveOpeningsLost, 0);
        const passiveOpeningsExpired = num(cityState.passiveOpeningsExpired, 0);
        const passiveAssistedSuzerainChanges = num(cityState.passiveAssistedSuzerainChanges, 0);
        const passiveAssistedOwnershipTurnovers = num(cityState.passiveAssistedOwnershipTurnovers, 0);
        const suzerainChangesByCause = readCauseCounter(cityState.suzerainChangesByCause);
        const ownershipTurnoversByCause = readCauseCounter(cityState.ownershipTurnoversByCause);
        const passiveOpeningsResolvedByCause = readCauseCounter(cityState.passiveOpeningsResolvedByCause);
        const passiveOpeningsWonByNominatedByCause = readCauseCounter(cityState.passiveOpeningsWonByNominatedByCause);
        const passiveAssistedSuzerainChangesByCause = readCauseCounter(cityState.passiveAssistedSuzerainChangesByCause);
        const passiveAssistedOwnershipTurnoversByCause = readCauseCounter(cityState.passiveAssistedOwnershipTurnoversByCause);
        const ownershipTurnoversByPair = readPairCounter(cityState.ownershipTurnoversByPair);
        yieldSummary.cityStates += 1;
        yieldSummary.activeTurns += num(cityState.activeTurns, 0);
        yieldSummary.contestedTurns += contested.total;
        yieldSummary.noSuzerainContestedTurns += contested.noSuzerain;
        yieldSummary.closeRaceContestedTurns += contested.closeRace;
        yieldSummary.turnoverWindowTurns += turnoverWindowTurns;
        yieldSummary.flipWindowTurns += flipWindowTurns;
        yieldSummary.safeLeadTurns += safeLeadTurns;
        yieldSummary.hotspotTurns += hotspotTurns;
        yieldSummary.passiveContestationTurns += passiveContestationTurns;
        yieldSummary.passiveCloseRaceTurns += passiveCloseRaceTurns;
        yieldSummary.passiveAssistedSuzerainChanges += passiveAssistedSuzerainChanges;
        yieldSummary.passiveAssistedOwnershipTurnovers += passiveAssistedOwnershipTurnovers;
        yieldSummary.suzerainChanges += suzerainChanges;
        yieldSummary.ownershipTurnovers += ownershipTurnovers;
        yieldSummary.uniqueSuzerainTotal += uniqueSuzerainCount;
        if (cityState.removedTurn === null || cityState.removedTurn === undefined) {
            yieldSummary.surviving += 1;
        } else {
            yieldSummary.removed += 1;
        }

        totalContestedTurns += contested.total;
        totalNoSuzerainContestedTurns += contested.noSuzerain;
        totalCloseRaceContestedTurns += contested.closeRace;
        totalTurnoverWindowTurns += turnoverWindowTurns;
        totalFlipWindowTurns += flipWindowTurns;
        totalSafeLeadTurns += safeLeadTurns;
        totalHotspotTurns += hotspotTurns;
        totalPassiveContestationTurns += passiveContestationTurns;
        totalPassiveCloseRaceTurns += passiveCloseRaceTurns;
        totalPassiveOpenings += passiveOpenings;
        totalPassiveOpeningTurnDelayTotal += passiveOpeningTurnDelayTotal;
        totalPassiveOpeningsTreasuryAffordable += passiveOpeningsTreasuryAffordable;
        totalPassiveOpeningsReserveSafe += passiveOpeningsReserveSafe;
        totalPassiveOpeningsAttemptedByNominated += passiveOpeningsAttemptedByNominated;
        totalPassiveOpeningAttemptTurnDelayTotal += passiveOpeningAttemptTurnDelayTotal;
        totalPassiveOpeningAttemptTurnDelaySamples += passiveOpeningAttemptTurnDelaySamples;
        totalPassiveOpeningsNoAttempt += passiveOpeningsNoAttempt;
        totalPassiveOpeningsNoAttemptTreasuryBlocked += passiveOpeningsNoAttemptTreasuryBlocked;
        totalPassiveOpeningsNoAttemptReserveBlocked += passiveOpeningsNoAttemptReserveBlocked;
        totalPassiveOpeningsNoAttemptDespiteCapacity += passiveOpeningsNoAttemptDespiteCapacity;
        totalPassiveOpeningsResolved += passiveOpeningsResolved;
        totalPassiveOpeningsWonByNominated += passiveOpeningsWonByNominated;
        totalPassiveOpeningsLost += passiveOpeningsLost;
        totalPassiveOpeningsExpired += passiveOpeningsExpired;
        totalPassiveAssistedSuzerainChanges += passiveAssistedSuzerainChanges;
        totalPassiveAssistedOwnershipTurnovers += passiveAssistedOwnershipTurnovers;
        totalSuzerainChanges += suzerainChanges;
        totalOwnershipTurnovers += ownershipTurnovers;
        addCauseCounter(totalSuzerainChangesByCause, suzerainChangesByCause);
        addCauseCounter(totalOwnershipTurnoversByCause, ownershipTurnoversByCause);
        addCauseCounter(totalPassiveOpeningsResolvedByCause, passiveOpeningsResolvedByCause);
        addCauseCounter(totalPassiveOpeningsWonByNominatedByCause, passiveOpeningsWonByNominatedByCause);
        addCauseCounter(totalPassiveAssistedSuzerainChangesByCause, passiveAssistedSuzerainChangesByCause);
        addCauseCounter(totalPassiveAssistedOwnershipTurnoversByCause, passiveAssistedOwnershipTurnoversByCause);
        totalUniqueSuzerains += uniqueSuzerainCount;
        if (contested.hasBreakdown) {
            cityStatesWithContestBreakdown += 1;
        } else {
            cityStatesWithoutContestBreakdown += 1;
        }

        const cityName = cityState.cityName || cityState.cityStateId || "Unknown";
        const cityKey = `${yieldType}|${cityName}`;
        const citySummary = ensureMapValue(cityAgg, cityKey, () => createCityAggregate(cityName, yieldType));
        const instanceSuzerainTurnsByCiv = new Map();
        citySummary.appearances += 1;
        citySummary.activeTurns += num(cityState.activeTurns, 0);
        citySummary.contestedTurns += contested.total;
        citySummary.noSuzerainContestedTurns += contested.noSuzerain;
        citySummary.closeRaceContestedTurns += contested.closeRace;
        citySummary.turnoverWindowTurns += turnoverWindowTurns;
        citySummary.flipWindowTurns += flipWindowTurns;
        citySummary.safeLeadTurns += safeLeadTurns;
        citySummary.hotspotTurns += hotspotTurns;
        citySummary.passiveContestationTurns += passiveContestationTurns;
        citySummary.passiveCloseRaceTurns += passiveCloseRaceTurns;
        citySummary.passiveAssistedSuzerainChanges += passiveAssistedSuzerainChanges;
        citySummary.passiveAssistedOwnershipTurnovers += passiveAssistedOwnershipTurnovers;
        citySummary.suzerainChanges += suzerainChanges;
        citySummary.ownershipTurnovers += ownershipTurnovers;
        addCauseCounter(citySummary.suzerainChangesByCause, suzerainChangesByCause);
        addCauseCounter(citySummary.ownershipTurnoversByCause, ownershipTurnoversByCause);
        addCauseCounter(citySummary.passiveAssistedSuzerainChangesByCause, passiveAssistedSuzerainChangesByCause);
        addCauseCounter(citySummary.passiveAssistedOwnershipTurnoversByCause, passiveAssistedOwnershipTurnoversByCause);
        citySummary.uniqueSuzerainTotal += uniqueSuzerainCount;

        for (const [playerId, turnsRaw] of Object.entries(cityState.suzerainTurnsByPlayer || {})) {
            const turns = num(turnsRaw, 0);
            if (turns <= 0) continue;
            const civName = idToCiv.get(playerId) || summary.byPlayer?.[playerId]?.civName || playerId;
            citySummary.suzerainTurnsByCiv.set(civName, (citySummary.suzerainTurnsByCiv.get(civName) || 0) + turns);
            instanceSuzerainTurnsByCiv.set(civName, (instanceSuzerainTurnsByCiv.get(civName) || 0) + turns);
        }

        for (const [playerId, turnsRaw] of Object.entries(cityState.focusTurnsByPlayer || {})) {
            const turns = num(turnsRaw, 0);
            if (turns <= 0) continue;
            const civName = idToCiv.get(playerId) || summary.byPlayer?.[playerId]?.civName || playerId;
            citySummary.focusTurnsByCiv.set(civName, (citySummary.focusTurnsByCiv.get(civName) || 0) + turns);
        }

        for (const [playerId, turnsRaw] of Object.entries(cityState.focusChallengeTurnsByPlayer || {})) {
            const turns = num(turnsRaw, 0);
            if (turns <= 0) continue;
            const civName = idToCiv.get(playerId) || summary.byPlayer?.[playerId]?.civName || playerId;
            citySummary.focusChallengeTurnsByCiv.set(civName, (citySummary.focusChallengeTurnsByCiv.get(civName) || 0) + turns);
        }

        for (const [playerId, turnsRaw] of Object.entries(cityState.focusMaintenanceTurnsByPlayer || {})) {
            const turns = num(turnsRaw, 0);
            if (turns <= 0) continue;
            const civName = idToCiv.get(playerId) || summary.byPlayer?.[playerId]?.civName || playerId;
            citySummary.focusMaintenanceTurnsByCiv.set(civName, (citySummary.focusMaintenanceTurnsByCiv.get(civName) || 0) + turns);
        }

        for (const [playerId, investmentRaw] of Object.entries(cityState.investmentByPlayer || {})) {
            const investment = investmentRaw || {};
            const civName = idToCiv.get(playerId) || summary.byPlayer?.[playerId]?.civName || playerId;
            const existing = citySummary.investmentByCiv.get(civName) || {
                goldSpent: 0,
                actions: 0,
                maintenanceGoldSpent: 0,
                maintenanceActions: 0,
            };
            existing.goldSpent += num(investment.goldSpent, 0);
            existing.actions += num(investment.actions, 0);
            existing.maintenanceGoldSpent += num(investment.maintenanceGoldSpent, 0);
            existing.maintenanceActions += num(investment.maintenanceActions, 0);
            citySummary.investmentByCiv.set(civName, existing);
        }

        const topSuzerain = Array.from(instanceSuzerainTurnsByCiv.entries())
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
        if (topSuzerain && topSuzerain[1] > 0) {
            const topCivAgg = ensureMapValue(civAgg, topSuzerain[0], createCivAggregate);
            topCivAgg.topSuzerainClaims += 1;
        }

        cityStateInstanceRows.push({
            mapSize,
            seed: sim.seed,
            cityName,
            cityStateId: cityState.cityStateId || cityState.cityStateId,
            yieldType,
            createdTurn: num(cityState.createdTurn, NaN),
            activeTurns: num(cityState.activeTurns, 0),
            hotspotTurns,
            ownershipTurnovers,
            suzerainChanges,
            pairFatigueActions: num(cityState.pairFatigueActions, 0),
            pairFatigueGoldSpent: num(cityState.pairFatigueGoldSpent, 0),
            ownershipTurnoversByCause,
            ownershipPairBreakdown: formatPairBreakdown(ownershipTurnoversByPair, idToCiv),
        });
    }

    const winnerCiv = sim.winner?.civ || null;
    const simTotalSuzerainTurns = Array.from(perSimCiv.values()).reduce((sum, value) => sum + value.suzerainTurns, 0);

    for (const [civName, metrics] of perSimCiv.entries()) {
        const civSummary = ensureMapValue(civAgg, civName, createCivAggregate);
        const isWinner = winnerCiv === civName;
        const suzerainTurns = num(metrics.suzerainTurns, 0);
        const investedGold = num(metrics.investedGold, 0);

        civSummary.games += 1;
        civSummary.totalSuzerainTurns += suzerainTurns;
        civSummary.totalInvestedGold += investedGold;
        civSummary.totalMaintenanceGold += num(metrics.maintenanceGoldSpent, 0);
        civSummary.totalInvestmentActions += num(metrics.investmentActions, 0);
        civSummary.totalMaintenanceInvestmentActions += num(metrics.maintenanceInvestmentActions, 0);
        civSummary.totalSafeMaintenanceGold += num(metrics.safeMaintenanceGoldSpent, 0);
        civSummary.totalSafeMaintenanceActions += num(metrics.safeMaintenanceActions, 0);
        civSummary.totalTurnoverGold += num(metrics.turnoverGoldSpent, 0);
        civSummary.totalTurnoverActions += num(metrics.turnoverActions, 0);
        civSummary.totalFlipWindowGold += num(metrics.flipWindowGoldSpent, 0);
        civSummary.totalFlipWindowActions += num(metrics.flipWindowActions, 0);
        civSummary.totalDeepChallengeGold += num(metrics.deepChallengeGoldSpent, 0);
        civSummary.totalDeepChallengeActions += num(metrics.deepChallengeActions, 0);
        civSummary.totalNeutralClaimGold += num(metrics.neutralClaimGoldSpent, 0);
        civSummary.totalNeutralClaimActions += num(metrics.neutralClaimActions, 0);
        civSummary.totalPairFatigueGold += num(metrics.pairFatigueGoldSpent, 0);
        civSummary.totalPairFatigueActions += num(metrics.pairFatigueActions, 0);
        civSummary.totalFocusTurns += num(metrics.focusTurns, 0);
        civSummary.totalFocusChallengeTurns += num(metrics.focusChallengeTurns, 0);
        civSummary.totalFocusMaintenanceTurns += num(metrics.focusMaintenanceTurns, 0);
        civSummary.totalFocusAssignments += num(metrics.focusAssignments, 0);
        civSummary.totalFocusSwitches += num(metrics.focusSwitches, 0);
        totalSuzerainTurnsAllParticipants += suzerainTurns;
        totalInvestedGoldAllParticipants += investedGold;
        totalMaintenanceGoldAllParticipants += num(metrics.maintenanceGoldSpent, 0);
        totalInvestmentActionsAllParticipants += num(metrics.investmentActions, 0);
        totalMaintenanceInvestmentActionsAllParticipants += num(metrics.maintenanceInvestmentActions, 0);
        totalSafeMaintenanceGoldAllParticipants += num(metrics.safeMaintenanceGoldSpent, 0);
        totalSafeMaintenanceActionsAllParticipants += num(metrics.safeMaintenanceActions, 0);
        totalTurnoverGoldAllParticipants += num(metrics.turnoverGoldSpent, 0);
        totalTurnoverActionsAllParticipants += num(metrics.turnoverActions, 0);
        totalFlipWindowGoldAllParticipants += num(metrics.flipWindowGoldSpent, 0);
        totalFlipWindowActionsAllParticipants += num(metrics.flipWindowActions, 0);
        totalDeepChallengeGoldAllParticipants += num(metrics.deepChallengeGoldSpent, 0);
        totalDeepChallengeActionsAllParticipants += num(metrics.deepChallengeActions, 0);
        totalNeutralClaimGoldAllParticipants += num(metrics.neutralClaimGoldSpent, 0);
        totalNeutralClaimActionsAllParticipants += num(metrics.neutralClaimActions, 0);
        totalPairFatigueGoldAllParticipants += num(metrics.pairFatigueGoldSpent, 0);
        totalPairFatigueActionsAllParticipants += num(metrics.pairFatigueActions, 0);
        totalFocusTurnsAllParticipants += num(metrics.focusTurns, 0);
        totalFocusChallengeTurnsAllParticipants += num(metrics.focusChallengeTurns, 0);
        totalFocusMaintenanceTurnsAllParticipants += num(metrics.focusMaintenanceTurns, 0);
        totalFocusAssignmentsAllParticipants += num(metrics.focusAssignments, 0);
        totalFocusSwitchesAllParticipants += num(metrics.focusSwitches, 0);

        if (isWinner) civSummary.wins += 1;

        if (suzerainTurns > 0) {
            civSummary.gamesWithSuzerain += 1;
            participantsWithSuzerain += 1;
            if (isWinner) {
                civSummary.winsWithSuzerain += 1;
                participantWinsWithSuzerain += 1;
            }
        } else {
            civSummary.gamesWithoutSuzerain += 1;
            participantsWithoutSuzerain += 1;
            if (isWinner) {
                civSummary.winsWithoutSuzerain += 1;
                participantWinsWithoutSuzerain += 1;
            }
        }

        if (investedGold > 0) {
            civSummary.gamesWithInvestment += 1;
            participantsWithInvestment += 1;
            if (isWinner) {
                civSummary.winsWithInvestment += 1;
                participantWinsWithInvestment += 1;
            }
        }

        suzerainObservations.push(suzerainTurns);
        investedGoldObservations.push(investedGold);
        winFlags.push(isWinner ? 1 : 0);

        if (isWinner) {
            winnerSamples += 1;
            winnerSuzerainTurnsTotal += suzerainTurns;
            winnerInvestedGoldTotal += investedGold;
            if (suzerainTurns > 0) winnersWithAnySuzerain += 1;
            if (investedGold > 0) winnersWithAnyInvestment += 1;
            if (simTotalSuzerainTurns > 0) {
                winnerSuzerainShareOfSim.push(suzerainTurns / simTotalSuzerainTurns);
            }
        } else {
            nonWinnerSamples += 1;
            nonWinnerSuzerainTurnsTotal += suzerainTurns;
            nonWinnerInvestedGoldTotal += investedGold;
        }
    }
}

const civRows = [];
const turnoverCivRows = [];
const orderedCivs = Array.from(new Set([...CIV_ORDER, ...civAgg.keys()]));
for (const civName of orderedCivs) {
    const data = civAgg.get(civName);
    if (!data || data.games === 0) continue;

    civRows.push([
        civName,
        `${data.games}`,
        `${data.wins}`,
        `${fmt(pct(data.wins, data.games), 1)}%`,
        fmt(avg(data.totalSuzerainTurns, data.games), 2),
        fmt(avg(data.totalInvestedGold, data.games), 1),
        fmt(avg(data.totalMaintenanceGold, data.games), 1),
        fmt(avg(data.totalInvestmentActions, data.games), 2),
        `${fmt(pct(data.winsWithSuzerain, data.gamesWithSuzerain), 1)}%`,
        `${fmt(pct(data.winsWithoutSuzerain, data.gamesWithoutSuzerain), 1)}%`,
        `${fmt(data.topSuzerainClaims, 0)}`,
    ]);

    turnoverCivRows.push([
        civName,
        fmt(avg(data.totalTurnoverGold, data.games), 1),
        fmt(avg(data.totalDeepChallengeGold, data.games), 1),
        fmt(avg(data.totalNeutralClaimGold, data.games), 1),
        fmt(avg(data.totalPairFatigueGold, data.games), 1),
        fmt(avg(data.totalSafeMaintenanceGold, data.games), 1),
        fmt(avg(data.totalFocusChallengeTurns, data.games), 2),
        fmt(avg(data.totalFocusMaintenanceTurns, data.games), 2),
        fmt(avg(data.totalFocusSwitches, data.games), 2),
    ]);
}
if (civRows.length === 0) {
    civRows.push(["No telemetry", "0", "0", "0.0%", "0.00", "0.0", "0.0", "0.00", "0.0%", "0.0%", "0"]);
    turnoverCivRows.push(["No telemetry", "0.0", "0.0", "0.0", "0.0", "0.0", "0.00", "0.00", "0.00"]);
}

const yieldRows = [];
const yieldTurnoverRows = [];
for (const yieldType of YIELD_TYPES) {
    const data = yieldAgg.get(yieldType) || createYieldAggregate();
    yieldRows.push([
        yieldType,
        `${data.cityStates}`,
        fmt(avg(data.activeTurns, data.cityStates), 2),
        `${fmt(pct(data.contestedTurns, data.activeTurns), 1)}%`,
        `${fmt(pct(data.noSuzerainContestedTurns, data.activeTurns), 1)}%`,
        `${fmt(pct(data.closeRaceContestedTurns, data.activeTurns), 1)}%`,
        fmt(data.activeTurns > 0 ? (data.suzerainChanges * 100) / data.activeTurns : 0, 2),
        fmt(avg(data.uniqueSuzerainTotal, data.cityStates), 2),
        `${data.surviving}`,
        `${data.removed}`,
    ]);
    yieldTurnoverRows.push([
        yieldType,
        `${fmt(pct(data.turnoverWindowTurns, data.activeTurns), 1)}%`,
        `${fmt(pct(data.flipWindowTurns, data.activeTurns), 1)}%`,
        `${fmt(pct(data.safeLeadTurns, data.activeTurns), 1)}%`,
        `${fmt(pct(data.hotspotTurns, data.activeTurns), 1)}%`,
    ]);
}

const cityRows = Array.from(cityAgg.values())
    .sort((a, b) => {
        if (a.yieldType !== b.yieldType) return a.yieldType.localeCompare(b.yieldType);
        return a.name.localeCompare(b.name);
    })
    .map(city => ([
        city.name,
        city.yieldType,
        `${city.appearances}`,
        fmt(avg(city.activeTurns, city.appearances), 2),
        `${fmt(pct(city.contestedTurns, city.activeTurns), 1)}%`,
        `${fmt(pct(city.noSuzerainContestedTurns, city.activeTurns), 1)}%`,
        `${fmt(pct(city.closeRaceContestedTurns, city.activeTurns), 1)}%`,
        `${fmt(pct(city.turnoverWindowTurns, city.activeTurns), 1)}%`,
        `${fmt(pct(city.flipWindowTurns, city.activeTurns), 1)}%`,
        `${fmt(pct(city.safeLeadTurns, city.activeTurns), 1)}%`,
        `${fmt(pct(city.hotspotTurns, city.activeTurns), 1)}%`,
        fmt(city.activeTurns > 0 ? (city.suzerainChanges * 100) / city.activeTurns : 0, 2),
        fmt(avg(city.uniqueSuzerainTotal, city.appearances), 2),
        formatTurnBreakdown(city.suzerainTurnsByCiv),
        formatFocusBreakdown(city.focusChallengeTurnsByCiv),
        formatFocusBreakdown(city.focusMaintenanceTurnsByCiv),
        formatInvestmentBreakdown(city.investmentByCiv),
        fmt(avg(city.suzerainChanges, city.appearances), 2),
        fmt(avg(city.ownershipTurnovers, city.appearances), 2),
        formatCauseBreakdown(city.ownershipTurnoversByCause),
    ]));
if (cityRows.length === 0) {
    cityRows.push(["No city-states observed", "-", "0", "0.00", "0.0%", "0.0%", "0.0%", "0.0%", "0.0%", "0.0%", "0.0%", "0.00", "0.00", "None", "None", "None", "None", "0.00", "0.00", "None"]);
}

const flipCauseRows = SUZERAIN_CHANGE_CAUSES.map(cause => ([
    cause,
    `${fmt(totalSuzerainChangesByCause[cause], 0)}`,
    `${fmt(totalOwnershipTurnoversByCause[cause], 0)}`,
    `${fmt(pct(totalSuzerainChangesByCause[cause], Math.max(1, totalSuzerainChanges)), 1)}%`,
    `${fmt(pct(totalOwnershipTurnoversByCause[cause], Math.max(1, totalOwnershipTurnovers)), 1)}%`,
]));

const hotspotRows = Array.from(cityAgg.values())
    .filter(city => city.hotspotTurns > 0 || city.ownershipTurnovers > 0)
    .sort((a, b) =>
        b.ownershipTurnovers - a.ownershipTurnovers
        || b.hotspotTurns - a.hotspotTurns
        || a.name.localeCompare(b.name)
    )
    .slice(0, 12)
    .map(city => ([
        city.name,
        city.yieldType,
        `${fmt(avg(city.hotspotTurns, city.appearances), 1)}T`,
        `${fmt(pct(city.hotspotTurns, Math.max(1, city.activeTurns)), 1)}%`,
        `${fmt(avg(city.ownershipTurnovers, city.appearances), 2)}`,
        `${fmt(avg(city.suzerainChanges, city.appearances), 2)}`,
        formatCauseBreakdown(city.ownershipTurnoversByCause),
    ]));
if (hotspotRows.length === 0) {
    hotspotRows.push(["No hotspots observed", "-", "0.0T", "0.0%", "0.00", "0.00", "None"]);
}

const hotspotInstanceRows = cityStateInstanceRows
    .filter(city => city.hotspotTurns > 0 || city.ownershipTurnovers > 0)
    .sort((a, b) =>
        b.ownershipTurnovers - a.ownershipTurnovers
        || b.hotspotTurns - a.hotspotTurns
        || a.mapSize.localeCompare(b.mapSize)
        || a.cityName.localeCompare(b.cityName)
    )
    .slice(0, 16)
    .map(city => ([
        city.mapSize,
        `${city.seed}`,
        city.cityName,
        city.yieldType,
        Number.isFinite(city.createdTurn) ? fmt(city.createdTurn, 0) : "n/a",
        `${fmt(city.activeTurns, 0)}T`,
        `${fmt(city.hotspotTurns, 0)}T`,
        `${fmt(pct(city.hotspotTurns, Math.max(1, city.activeTurns)), 1)}%`,
        `${fmt(city.ownershipTurnovers, 0)}`,
        `${fmt(city.suzerainChanges, 0)}`,
        city.ownershipPairBreakdown,
        formatCauseBreakdown(city.ownershipTurnoversByCause),
    ]));
if (hotspotInstanceRows.length === 0) {
    hotspotInstanceRows.push(["-", "-", "No hotspot instances observed", "-", "n/a", "0T", "0T", "0.0%", "0", "0", "None", "None"]);
}

const suzerainWinCorr = pearson(suzerainObservations, winFlags);
const investmentWinCorr = pearson(investedGoldObservations, winFlags);
const creationTiming = summarizeDistribution(firstCreationTurns);
const challengerGoldAllParticipants = Math.max(0, totalInvestedGoldAllParticipants - totalMaintenanceGoldAllParticipants);
const challengerActionsAllParticipants = Math.max(0, totalInvestmentActionsAllParticipants - totalMaintenanceInvestmentActionsAllParticipants);

const orderedMapSizes = Array.from(new Set([...MAP_ORDER, ...Array.from(mapAgg.keys())]));
const mapRows = [];
for (const mapSize of orderedMapSizes) {
    const data = mapAgg.get(mapSize);
    if (!data || data.sims === 0) continue;
    const avgCreatedPerTelemetrySim = avg(data.totalCreated, data.telemetrySims);
    const avgFirstCreationTurn = summarizeDistribution(data.firstCreationTurns).avg;
    mapRows.push([
        mapSize,
        `${data.sims}`,
        `${data.telemetrySims}`,
        `${data.simsWithCityStates}`,
        `${fmt(pct(data.simsWithCityStates, data.telemetrySims), 1)}%`,
        `${data.totalCreated}`,
        fmt(avgCreatedPerTelemetrySim, 2),
        Number.isFinite(avgFirstCreationTurn) ? fmt(avgFirstCreationTurn, 1) : "n/a",
    ]);
}
if (mapRows.length === 0) {
    mapRows.push(["No map telemetry", "0", "0", "0", "0.0%", "0", "0.00", "n/a"]);
}

const campSightedToPrepTiming = summarizeDistribution(campSightedToPrepTurns);
const campPrepToReadyTiming = summarizeDistribution(campPrepToReadyTurns);
const campPrepToSelfClearTiming = summarizeDistribution(campPrepToSelfClearTurns);
const campTotalPrepTiming = summarizeDistribution(campTotalPrepTurns);
const campOutcomeRows = CAMP_OUTCOME_ORDER
    .filter(outcome => campOutcomeCounts[outcome] > 0)
    .map(outcome => [
        outcome,
        `${campOutcomeCounts[outcome]}`,
        `${fmt(pct(campOutcomeCounts[outcome], totalCampClearingEpisodes), 1)}%`,
    ]);
if (campOutcomeRows.length === 0) {
    campOutcomeRows.push(["No camp-clearing telemetry", "0", "0.0%"]);
}

const campReadinessRows = CAMP_READINESS_ORDER
    .map(readiness => {
        const data = campReadinessAgg.get(readiness) || createCampReadinessAggregate();
        return [
            readiness,
            `${data.episodes}`,
            `${data.selfClears}`,
            `${fmt(pct(data.selfClears, data.episodes), 1)}%`,
            `${data.timedOut}`,
            `${fmt(pct(data.timedOut, data.episodes), 1)}%`,
            `${fmt(avg(data.totalPrepTurns, data.episodes), 2)}`,
            data.prepToReadySamples > 0 ? fmt(avg(data.prepToReadyTurns, data.prepToReadySamples), 2) : "n/a",
            `${fmt(pct(data.reachedReady, data.episodes), 1)}%`,
        ];
    })
    .filter(row => Number(row[1]) > 0);
if (campReadinessRows.length === 0) {
    campReadinessRows.push(["No readiness telemetry", "0", "0", "0.0%", "0", "0.0%", "0.00", "n/a", "0.0%"]);
}

const campSlowestRows = campEpisodeRows
    .filter(row => Number.isFinite(row.totalPrep) && row.totalPrep > 0)
    .sort((a, b) => b.totalPrep - a.totalPrep || a.civName.localeCompare(b.civName))
    .slice(0, 10)
    .map(row => [
        row.mapSize,
        `${row.seed}`,
        row.civName,
        row.outcome,
        row.readiness,
        row.initialPrepState,
        Number.isFinite(row.sightedToPrep) ? fmt(row.sightedToPrep, 0) : "n/a",
        `${fmt(row.totalPrep, 0)}T`,
        Number.isFinite(row.prepToReady) ? fmt(row.prepToReady, 0) : "n/a",
    ]);
if (campSlowestRows.length === 0) {
    campSlowestRows.push(["-", "-", "No episodes observed", "-", "-", "-", "n/a", "0T", "n/a"]);
}

const report = `# City-State Simulation Report

Generated: ${new Date().toISOString()}

## Data Coverage
- Simulations processed: ${results.length}
- Simulations with city-state telemetry: ${simsWithCityStateTelemetry}
- Simulations missing city-state telemetry: ${simsMissingCityStateTelemetry}
- Total city-states created: ${totalCityStatesCreated}
- Total city-state active turns: ${totalCityStateActiveTurns}
- Total contested turns: ${totalContestedTurns} (No Suz: ${totalNoSuzerainContestedTurns}, Close-race: ${totalCloseRaceContestedTurns})
- Total turnover-window turns: ${totalTurnoverWindowTurns}
- Total flip-window turns: ${totalFlipWindowTurns}
- Total safe-lead incumbent turns: ${totalSafeLeadTurns}
- Total hotspot turns: ${totalHotspotTurns}
- Contest telemetry coverage (city-state entries): ${cityStatesWithContestBreakdown} with split fields, ${cityStatesWithoutContestBreakdown} legacy-only
- Global suzerain flip rate: ${fmt(totalCityStateActiveTurns > 0 ? (totalSuzerainChanges * 100) / totalCityStateActiveTurns : 0, 2)} per 100 active turns
- True ownership turnover rate: ${fmt(totalCityStateActiveTurns > 0 ? (totalOwnershipTurnovers * 100) / totalCityStateActiveTurns : 0, 2)} per 100 active turns
- Average unique suzerains per city-state: ${fmt(avg(totalUniqueSuzerains, totalCityStatesCreated), 2)}
- Average city-states created per telemetry simulation: ${fmt(avg(totalCityStatesCreated, simsWithCityStateTelemetry), 2)}
- Average surviving city-states at game end (telemetry sims): ${fmt(avg(totalSurvivingCityStates, simsWithCityStateTelemetry), 2)}

${simsMissingCityStateTelemetry > 0 ? `> Warning: ${simsMissingCityStateTelemetry} simulations did not include \`cityStateSummary\` telemetry. Rebuild engine and rerun simulations for full coverage.` : ""}

## Creation Timing
- Simulations with at least one city-state created: ${firstCreationTurns.length}/${simsWithCityStateTelemetry} (${fmt(pct(firstCreationTurns.length, simsWithCityStateTelemetry), 1)}%)
- First city-state creation turn (min / p25 / median / p75 / max): ${Number.isFinite(creationTiming.min) ? fmt(creationTiming.min, 0) : "n/a"} / ${Number.isFinite(creationTiming.p25) ? fmt(creationTiming.p25, 0) : "n/a"} / ${Number.isFinite(creationTiming.median) ? fmt(creationTiming.median, 0) : "n/a"} / ${Number.isFinite(creationTiming.p75) ? fmt(creationTiming.p75, 0) : "n/a"} / ${Number.isFinite(creationTiming.max) ? fmt(creationTiming.max, 0) : "n/a"}
- First city-state creation turn (average, sims with any): ${Number.isFinite(creationTiming.avg) ? fmt(creationTiming.avg, 1) : "n/a"}

## Map-Size Creation Rates
${markdownTable([
    "Map",
    "Sims",
    "Telemetry Sims",
    "Sims with >=1 CS",
    "Share with >=1 CS",
    "Total Created",
    "Avg Created / Telemetry Sim",
    "Avg First CS Turn",
], mapRows)}

## Camp-Clearing Activation Funnel
- Camp-clearing episodes observed: ${totalCampClearingEpisodes}
- Direct starts in Ready: ${campDirectReadyStarts} (${fmt(pct(campDirectReadyStarts, totalCampClearingEpisodes), 1)}%)
- Episodes that reached Ready: ${campReachedReadyEpisodes} (${fmt(pct(campReachedReadyEpisodes, totalCampClearingEpisodes), 1)}%)
- Episodes with sighting telemetry: ${campEpisodesWithSighting} (${fmt(pct(campEpisodesWithSighting, totalCampClearingEpisodes), 1)}%)
- Sighted -> prep start (avg / median): ${Number.isFinite(campSightedToPrepTiming.avg) ? fmt(campSightedToPrepTiming.avg, 2) : "n/a"} / ${Number.isFinite(campSightedToPrepTiming.median) ? fmt(campSightedToPrepTiming.median, 0) : "n/a"} turns
- Prep start -> first Ready (avg / median): ${Number.isFinite(campPrepToReadyTiming.avg) ? fmt(campPrepToReadyTiming.avg, 2) : "n/a"} / ${Number.isFinite(campPrepToReadyTiming.median) ? fmt(campPrepToReadyTiming.median, 0) : "n/a"} turns
- Prep start -> self clear (avg / median): ${Number.isFinite(campPrepToSelfClearTiming.avg) ? fmt(campPrepToSelfClearTiming.avg, 2) : "n/a"} / ${Number.isFinite(campPrepToSelfClearTiming.median) ? fmt(campPrepToSelfClearTiming.median, 0) : "n/a"} turns
- Total prep duration (avg / median): ${Number.isFinite(campTotalPrepTiming.avg) ? fmt(campTotalPrepTiming.avg, 2) : "n/a"} / ${Number.isFinite(campTotalPrepTiming.median) ? fmt(campTotalPrepTiming.median, 0) : "n/a"} turns
- Timeouts after reaching Ready: ${campTimeoutAfterReady} (${fmt(pct(campTimeoutAfterReady, campOutcomeCounts.TimedOut), 1)}% of timeouts)
- War-interrupted episodes: ${campWarInterruptedEpisodes} (${fmt(pct(campWarInterruptedEpisodes, totalCampClearingEpisodes), 1)}%)
- Cleared-by-other breakdown: lacked military ${campClearedByOtherFromBuildup}, late start ${campClearedByOtherFromLateStart}, other ${campClearedByOtherOther}
- Initial prep state mix: ${CAMP_PREP_STATE_ORDER.map(state => `${state} ${campInitialPrepStateCounts[state]}`).join(", ")}

### Camp Outcomes
${markdownTable([
    "Outcome",
    "Episodes",
    "Share",
], campOutcomeRows)}

### Camp Funnel By Readiness
${markdownTable([
    "Readiness",
    "Episodes",
    "Self Clears",
    "Self Clear Rate",
    "Timeouts",
    "Timeout Rate",
    "Avg Prep Turns",
    "Avg Prep->Ready",
    "Reached Ready",
], campReadinessRows)}

### Slowest Prep Episodes
${markdownTable([
    "Map",
    "Seed",
    "Civ",
    "Outcome",
    "Readiness",
    "Initial State",
    "Sighted->Prep",
    "Total Prep",
    "Prep->Ready",
], campSlowestRows)}

## Suzerainty vs Winning
- Winner average suzerain turns: ${fmt(avg(winnerSuzerainTurnsTotal, winnerSamples), 2)}
- Non-winner average suzerain turns: ${fmt(avg(nonWinnerSuzerainTurnsTotal, nonWinnerSamples), 2)}
- Winner average city-state investment: ${fmt(avg(winnerInvestedGoldTotal, winnerSamples), 1)}G
- Non-winner average city-state investment: ${fmt(avg(nonWinnerInvestedGoldTotal, nonWinnerSamples), 1)}G
- Winners with any suzerainty: ${winnersWithAnySuzerain}/${winnerSamples} (${fmt(pct(winnersWithAnySuzerain, winnerSamples), 1)}%)
- Winners with any city-state investment: ${winnersWithAnyInvestment}/${winnerSamples} (${fmt(pct(winnersWithAnyInvestment, winnerSamples), 1)}%)
- Participant win rate with any suzerainty: ${fmt(pct(participantWinsWithSuzerain, participantsWithSuzerain), 1)}%
- Participant win rate without suzerainty: ${fmt(pct(participantWinsWithoutSuzerain, participantsWithoutSuzerain), 1)}%
- Participant win rate with any city-state investment: ${fmt(pct(participantWinsWithInvestment, participantsWithInvestment), 1)}%
- Correlation (suzerain turns -> win flag): ${fmt(suzerainWinCorr, 3)}
- Correlation (city-state gold invested -> win flag): ${fmt(investmentWinCorr, 3)}
- Winner share of sim-wide suzerain turns (when any suzerainty existed): ${fmt(avg(winnerSuzerainShareOfSim.reduce((sum, value) => sum + value, 0), winnerSuzerainShareOfSim.length) * 100, 1)}%

## Investment Mix
- Total city-state investment: ${fmt(totalInvestedGoldAllParticipants, 0)}G across ${fmt(totalInvestmentActionsAllParticipants, 0)} actions
- Maintenance investment: ${fmt(totalMaintenanceGoldAllParticipants, 0)}G (${fmt(pct(totalMaintenanceGoldAllParticipants, totalInvestedGoldAllParticipants), 1)}%) across ${fmt(totalMaintenanceInvestmentActionsAllParticipants, 0)} actions (${fmt(pct(totalMaintenanceInvestmentActionsAllParticipants, totalInvestmentActionsAllParticipants), 1)}%)
- Challenger investment: ${fmt(challengerGoldAllParticipants, 0)}G (${fmt(pct(challengerGoldAllParticipants, totalInvestedGoldAllParticipants), 1)}%) across ${fmt(challengerActionsAllParticipants, 0)} actions (${fmt(pct(challengerActionsAllParticipants, totalInvestmentActionsAllParticipants), 1)}%)
- Maintenance gold per suzerain turn: ${fmt(avg(totalMaintenanceGoldAllParticipants, totalSuzerainTurnsAllParticipants), 2)}
- Maintenance actions per 100 suzerain turns: ${fmt(avg(totalMaintenanceInvestmentActionsAllParticipants * 100, totalSuzerainTurnsAllParticipants), 2)}

## Turnover Diagnostics
- Turnover-window challenger investment: ${fmt(totalTurnoverGoldAllParticipants, 0)}G across ${fmt(totalTurnoverActionsAllParticipants, 0)} actions
- Flip-window challenger investment: ${fmt(totalFlipWindowGoldAllParticipants, 0)}G across ${fmt(totalFlipWindowActionsAllParticipants, 0)} actions
- Deep-challenge investment: ${fmt(totalDeepChallengeGoldAllParticipants, 0)}G across ${fmt(totalDeepChallengeActionsAllParticipants, 0)} actions
- Neutral-claim investment: ${fmt(totalNeutralClaimGoldAllParticipants, 0)}G across ${fmt(totalNeutralClaimActionsAllParticipants, 0)} actions
- Passive contestation pulses: ${fmt(totalPassiveContestationTurns, 0)}
- Passive contestation close-race pulses: ${fmt(totalPassiveCloseRaceTurns, 0)}
- Passive openings observed: ${fmt(totalPassiveOpenings, 0)}
- Passive openings with treasury to invest: ${fmt(totalPassiveOpeningsTreasuryAffordable, 0)} (${fmt(pct(totalPassiveOpeningsTreasuryAffordable, totalPassiveOpenings), 1)}%)
- Passive openings with reserve-safe invest: ${fmt(totalPassiveOpeningsReserveSafe, 0)} (${fmt(pct(totalPassiveOpeningsReserveSafe, totalPassiveOpenings), 1)}%)
- Passive openings avg nominated turn-order delay: ${fmt(avg(totalPassiveOpeningTurnDelayTotal, totalPassiveOpenings), 2)} turns
- Passive openings attempted by nominated challenger: ${fmt(totalPassiveOpeningsAttemptedByNominated, 0)} (${fmt(pct(totalPassiveOpeningsAttemptedByNominated, totalPassiveOpenings), 1)}%)
- Passive openings avg delay to first nominated attempt: ${fmt(avg(totalPassiveOpeningAttemptTurnDelayTotal, totalPassiveOpeningAttemptTurnDelaySamples), 2)} turns
- Passive openings resolved before expiry: ${fmt(totalPassiveOpeningsResolved, 0)} (${fmt(pct(totalPassiveOpeningsResolved, totalPassiveOpenings), 1)}%)
- Passive openings won by nominated challenger: ${fmt(totalPassiveOpeningsWonByNominated, 0)} (${fmt(pct(totalPassiveOpeningsWonByNominated, totalPassiveOpenings), 1)}%; ${fmt(pct(totalPassiveOpeningsWonByNominated, totalPassiveOpeningsResolved), 1)}% of resolved)
- Passive openings lost to someone else: ${fmt(totalPassiveOpeningsLost, 0)}
- Passive openings expired unresolved: ${fmt(totalPassiveOpeningsExpired, 0)}
- Passive opening resolutions by cause: ${formatCauseBreakdown(totalPassiveOpeningsResolvedByCause)}
- Passive opening nominated wins by cause: ${formatCauseBreakdown(totalPassiveOpeningsWonByNominatedByCause)}
- Passive openings with no nominated attempt: ${fmt(totalPassiveOpeningsNoAttempt, 0)} (${fmt(pct(totalPassiveOpeningsNoAttempt, totalPassiveOpenings), 1)}%)
- No-attempt reasons: treasury blocked ${fmt(totalPassiveOpeningsNoAttemptTreasuryBlocked, 0)}, reserve blocked ${fmt(totalPassiveOpeningsNoAttemptReserveBlocked, 0)}, no-attempt despite capacity ${fmt(totalPassiveOpeningsNoAttemptDespiteCapacity, 0)}
- Passive direct flip conversion per 100 close-race pulses: ${fmt(avg(totalOwnershipTurnoversByCause.PassiveContestation * 100, totalPassiveCloseRaceTurns), 2)}
- Passive-assisted suzerainty changes: ${fmt(totalPassiveAssistedSuzerainChanges, 0)} (${fmt(pct(totalPassiveAssistedSuzerainChanges, Math.max(1, totalSuzerainChanges - totalSuzerainChangesByCause.PassiveContestation)), 1)}% of non-passive changes)
- Passive-assisted true ownership turnovers: ${fmt(totalPassiveAssistedOwnershipTurnovers, 0)} (${fmt(pct(totalPassiveAssistedOwnershipTurnovers, totalOwnershipTurnovers), 1)}% of ownership turnover)
- Passive-assisted ownership conversion per 100 close-race pulses: ${fmt(avg(totalPassiveAssistedOwnershipTurnovers * 100, totalPassiveCloseRaceTurns), 2)}
- Passive-involved ownership conversion per 100 close-race pulses: ${fmt(avg((totalOwnershipTurnoversByCause.PassiveContestation + totalPassiveAssistedOwnershipTurnovers) * 100, totalPassiveCloseRaceTurns), 2)}
- Passive-assisted ownership causes: ${formatCauseBreakdown(totalPassiveAssistedOwnershipTurnoversByCause)}
- Pair-fatigue-triggered investment: ${fmt(totalPairFatigueGoldAllParticipants, 0)}G across ${fmt(totalPairFatigueActionsAllParticipants, 0)} actions
- Pair-fatigue share of challenger spend: ${fmt(pct(totalPairFatigueGoldAllParticipants, challengerGoldAllParticipants), 1)}%
- Safe-maintenance investment: ${fmt(totalSafeMaintenanceGoldAllParticipants, 0)}G across ${fmt(totalSafeMaintenanceActionsAllParticipants, 0)} actions
- Focus turns: ${fmt(totalFocusTurnsAllParticipants, 0)} (challenge ${fmt(totalFocusChallengeTurnsAllParticipants, 0)}, maintenance ${fmt(totalFocusMaintenanceTurnsAllParticipants, 0)})
- Focus assignments: ${fmt(totalFocusAssignmentsAllParticipants, 0)}, focus switches: ${fmt(totalFocusSwitchesAllParticipants, 0)}
- Flip conversion per 100 turnover-window turns: ${fmt(avg(totalSuzerainChanges * 100, totalTurnoverWindowTurns), 2)}
- True ownership conversion per 100 turnover-window turns: ${fmt(avg(totalOwnershipTurnovers * 100, totalTurnoverWindowTurns), 2)}
- Flip conversion per 100 challenge-focus turns: ${fmt(avg(totalSuzerainChanges * 100, totalFocusChallengeTurnsAllParticipants), 2)}
- Safe-maintenance share of maintenance spend: ${fmt(pct(totalSafeMaintenanceGoldAllParticipants, totalMaintenanceGoldAllParticipants), 1)}%

## Flip Cause Summary
${markdownTable([
    "Cause",
    "Suzerainty Changes",
    "True Ownership Turnovers",
    "State Change Share",
    "Ownership Share",
], flipCauseRows)}

## Hotspot Diagnostics
- Hotspot turn share of active turns: ${fmt(pct(totalHotspotTurns, totalCityStateActiveTurns), 1)}%
- City-state instances with any hotspot time: ${cityStateInstanceRows.filter(city => city.hotspotTurns > 0).length}/${cityStateInstanceRows.length}
- True ownership turnovers occurring in hotspot instances: ${fmt(cityStateInstanceRows.filter(city => city.hotspotTurns > 0).reduce((sum, city) => sum + city.ownershipTurnovers, 0), 0)} / ${fmt(totalOwnershipTurnovers, 0)}

## Hotspot Instances
${markdownTable([
    "Map",
    "Seed",
    "City-State",
    "Yield",
    "Created",
    "Active",
    "Hotspot",
    "Hotspot Share",
    "Ownership Turnovers",
    "Suz Changes",
    "Turnover Pair",
    "Ownership Causes",
], hotspotInstanceRows)}

## Hotspot City Names (Cross-Sim Aggregate)
${markdownTable([
    "City-State",
    "Yield",
    "Avg Hotspot Turns",
    "Hotspot Share",
    "Avg Ownership Turnovers",
    "Avg Suz Changes",
    "Ownership Causes",
], hotspotRows)}

## Civ Performance
${markdownTable([
    "Civ",
    "Games",
    "Wins",
    "Win%",
    "Avg Suz Turns",
    "Avg Invested Gold",
    "Avg Maintenance Gold",
    "Avg Invest Actions",
    "Win% (Suz>0)",
    "Win% (Suz=0)",
    "Top Suz Claims",
], civRows)}

## Turnover Pressure By Civ
${markdownTable([
    "Civ",
    "Avg Turnover Gold",
    "Avg Deep Gold",
    "Avg Neutral Gold",
    "Avg Pair-Fatigue Gold",
    "Avg Safe Maint Gold",
    "Avg Focus Challenge T",
    "Avg Focus Maint T",
    "Focus Switches / Game",
], turnoverCivRows)}

## Yield-Type Summary
${markdownTable([
    "Yield",
    "City-States",
    "Avg Active Turns",
    "Contested Turn Share",
    "No Suz Share",
    "Close-Race Share",
    "Flip Rate /100T",
    "Avg Unique Suz",
    "Surviving",
    "Removed",
], yieldRows)}

## Yield Turnover Windows
${markdownTable([
    "Yield",
    "Turnover Window Share",
    "Flip Window Share",
    "Safe Lead Share",
    "Hotspot Share",
], yieldTurnoverRows)}

## City-State Suzerainty Ledger
${markdownTable([
    "City-State",
    "Yield",
    "Appearances",
    "Avg Active Turns",
    "Contested Share",
    "No Suz Share",
    "Close-Race Share",
    "Turnover Window Share",
    "Flip Window Share",
    "Safe Lead Share",
    "Hotspot Share",
    "Flip Rate /100T",
    "Avg Unique Suz",
    "Suzerain Turns by Civ",
    "Focus Challenge by Civ",
    "Focus Maintenance by Civ",
    "Investment by Civ (Gold/Actions)",
    "Avg Suz Changes",
    "Avg Ownership Turnovers",
    "Ownership Causes",
], cityRows)}

## Notes
- "Maintenance Gold" counts investment spend that occurred while the investor was the incumbent suzerain for that city-state.
- "Safe-maintenance" counts incumbent spend made while the city-state lead was already above the safe upkeep threshold.
- "Turnover-window" counts challenger spend made while the incumbent lead was within three influence purchases.
- "Deep-challenge" counts challenger spend made outside the turnover window.
- "Neutral-claim" counts spend into city-states with no incumbent suzerain.
- "Passive contestation pulses" count end-of-round influence pressure applications. "Passive-assisted" counts later non-passive suzerainty changes that landed within two turns of a passive close-race pulse.
- "Pair-fatigue-triggered" counts challenger spend where repeated two-civ reclaim fatigue reduced the reclaim bonus or pressure.
- "No Suz Share" counts turns where the city-state had no suzerain.
- "Close-Race Share" counts turns where a suzerain existed but first/second influence were within the contest margin.
- "Flip Rate /100T" is suzerain changes per 100 active turns.
- "True ownership turnover" counts only changes from one suzerain civ directly to another, excluding drops to no suzerain.
- "Hotspot Share" counts turns where the city-state had entered a recent repeated-flip streak.
- "Hotspot Instances" are the primary per-simulation diagnostic. "Hotspot City Names" remains a cross-simulation aggregate by city-state name.
- Correlations are participant-level across telemetry simulations and should be treated as directional, not causal.
${cityStatesWithoutContestBreakdown > 0 ? `- Legacy telemetry fallback was used for ${cityStatesWithoutContestBreakdown} city-state entries (contested turns counted as No Suz only).` : ""}
`;

writeFileSync(OUTPUT_FILE, report);
console.log(`City-state report written to ${OUTPUT_FILE}`);
