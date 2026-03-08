export const DEFAULT_CIVS = [
    "ForgeClans",
    "ScholarKingdoms",
    "RiverLeague",
    "AetherianVanguard",
    "StarborneSeekers",
    "JadeCovenant",
];

const PROGRESS_PROJECTS = new Set(["Observatory", "GrandAcademy", "GrandExperiment"]);
const CAPTURE_BURST_WINDOW = 25;
const MAX_DECLARATION_POWER_RATIO_SAMPLE = 5;

function avg(total, count) {
    return count > 0 ? total / count : 0;
}

function pct(part, total) {
    return total > 0 ? (part / total) * 100 : 0;
}

function median(values) {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
}

function maxEventsInWindow(turns, windowSize) {
    if (!turns.length) return 0;
    let maxCount = 0;
    let left = 0;
    for (let right = 0; right < turns.length; right++) {
        while (turns[right] - turns[left] > windowSize) {
            left++;
        }
        maxCount = Math.max(maxCount, right - left + 1);
    }
    return maxCount;
}

function getEventPriority(event) {
    switch (event.type) {
        case "WarDeclaration":
            return 0;
        case "CityCapture":
            return 1;
        case "Elimination":
            return 2;
        case "PeaceTreaty":
            return 3;
        case "ProjectComplete":
            return 4;
        default:
            return 5;
    }
}

function sortEvents(events) {
    return [...(events ?? [])].sort((a, b) => {
        if (a.turn !== b.turn) return a.turn - b.turn;
        return getEventPriority(a) - getEventPriority(b);
    });
}

function createRawStats() {
    return {
        gamesPlayed: 0,
        wins: 0,
        progressWins: 0,
        conquestWins: 0,
        initiatedWars: 0,
        declarationPowerRatioTotal: 0,
        declarationPowerRatioSamples: 0,
        initiatedWarsWithCapture: 0,
        initiatedWarsWithCapitalCapture: 0,
        initiatedWarsWithElimination: 0,
        citiesCapturedInInitiatedWars: 0,
        capitalCapturesInInitiatedWars: 0,
        eliminationsCausedInInitiatedWars: 0,
        gamesWithAnyCapture: 0,
        winsWithAnyCapture: 0,
        gamesWithFirstCapture: 0,
        winsWithFirstCapture: 0,
        progressWinsWithPriorCapture: 0,
        progressWinsWithPriorCapitalCapture: 0,
        capturesBeforeFirstProgressProjectTotal: 0,
        capturesBeforeFirstProgressProjectSamples: 0,
        firstWarTurnsInWins: [],
        firstWarTurnsInLosses: [],
        firstCaptureTurnsInWins: [],
        firstCaptureTurnsInLosses: [],
        maxCaptureBurst25InWins: [],
        maxCaptureBurst25InLosses: [],
        turnsFromFirstCaptureToWin: [],
        turnsToFirstCaptureFromDeclaredWar: [],
    };
}

function ensureTrackedStats(byCiv, civName) {
    if (!civName || !byCiv.has(civName)) return null;
    return byCiv.get(civName);
}

export function analyzeWarConversion(results, civs = DEFAULT_CIVS) {
    const byCiv = new Map(civs.map(civ => [civ, createRawStats()]));

    for (const sim of results ?? []) {
        const participants = sim.participatingCivs
            ?? sim.finalState?.civs?.map(civ => ({
                id: civ.id,
                civName: civ.civName,
                isEliminated: civ.isEliminated,
            }))
            ?? [];
        const idToCiv = new Map(participants.map(civ => [civ.id, civ.civName]));

        for (const participant of participants) {
            const stats = ensureTrackedStats(byCiv, participant.civName);
            if (stats) stats.gamesPlayed++;
        }

        const sortedEvents = sortEvents(sim.events);
        const winnerId = sim.winner?.id ?? null;
        const winnerCiv = sim.winner?.civ ?? null;

        if (winnerCiv) {
            const winnerStats = ensureTrackedStats(byCiv, winnerCiv);
            if (winnerStats) {
                winnerStats.wins++;
                if (sim.victoryType === "Progress") winnerStats.progressWins++;
                if (sim.victoryType === "Conquest") winnerStats.conquestWins++;
            }
        }

        const captureTurnsByCivId = new Map(participants.map(civ => [civ.id, []]));
        const capitalCaptureTurnsByCivId = new Map(participants.map(civ => [civ.id, []]));
        const firstWarTurnByCivId = new Map();
        const firstCaptureTurnByCivId = new Map();
        const activeWarsByPair = new Map();
        const initiatedEpisodes = [];
        let firstCaptureOwnerId = null;
        let firstProgressProjectTurnForWinner = null;

        for (const event of sortedEvents) {
            if (event.type === "WarDeclaration") {
                const initiatorCiv = idToCiv.get(event.initiator);
                const initiatorStats = ensureTrackedStats(byCiv, initiatorCiv);
                if (initiatorStats) {
                    initiatorStats.initiatedWars++;
                    if (event.targetPower > 0) {
                        initiatorStats.declarationPowerRatioTotal += Math.min(
                            event.initiatorPower / event.targetPower,
                            MAX_DECLARATION_POWER_RATIO_SAMPLE,
                        );
                        initiatorStats.declarationPowerRatioSamples++;
                    }
                }

                if (!firstWarTurnByCivId.has(event.initiator)) {
                    firstWarTurnByCivId.set(event.initiator, event.turn);
                }

                const pairKey = [event.initiator, event.target].sort().join("|");
                if (!activeWarsByPair.has(pairKey)) {
                    const episode = {
                        initiatorId: event.initiator,
                        initiatorCiv,
                        targetId: event.target,
                        startTurn: event.turn,
                        captures: 0,
                        capitalCaptures: 0,
                        elimination: false,
                        firstCaptureDelay: null,
                    };
                    activeWarsByPair.set(pairKey, episode);
                    initiatedEpisodes.push(episode);
                }
                continue;
            }

            if (event.type === "CityCapture") {
                if (!firstCaptureOwnerId) {
                    firstCaptureOwnerId = event.to;
                }

                if (captureTurnsByCivId.has(event.to)) {
                    captureTurnsByCivId.get(event.to).push(event.turn);
                }
                if (event.isCapital && capitalCaptureTurnsByCivId.has(event.to)) {
                    capitalCaptureTurnsByCivId.get(event.to).push(event.turn);
                }
                if (!firstCaptureTurnByCivId.has(event.to)) {
                    firstCaptureTurnByCivId.set(event.to, event.turn);
                }

                const pairKey = [event.from, event.to].sort().join("|");
                const episode = activeWarsByPair.get(pairKey);
                if (episode && episode.initiatorId === event.to && episode.targetId === event.from) {
                    episode.captures++;
                    if (event.isCapital) episode.capitalCaptures++;
                    if (episode.firstCaptureDelay === null) {
                        episode.firstCaptureDelay = event.turn - episode.startTurn;
                    }
                }
                continue;
            }

            if (event.type === "Elimination" && event.by) {
                const pairKey = [event.by, event.eliminated].sort().join("|");
                const episode = activeWarsByPair.get(pairKey);
                if (episode && episode.initiatorId === event.by && episode.targetId === event.eliminated) {
                    episode.elimination = true;
                }
                continue;
            }

            if (event.type === "PeaceTreaty") {
                const pairKey = [event.civ1, event.civ2].sort().join("|");
                activeWarsByPair.delete(pairKey);
                continue;
            }

            if (
                winnerId &&
                sim.victoryType === "Progress" &&
                firstProgressProjectTurnForWinner === null &&
                event.type === "ProjectComplete" &&
                event.civ === winnerId &&
                PROGRESS_PROJECTS.has(event.project)
            ) {
                firstProgressProjectTurnForWinner = event.turn;
            }
        }

        for (const episode of initiatedEpisodes) {
            const stats = ensureTrackedStats(byCiv, episode.initiatorCiv);
            if (!stats) continue;
            if (episode.captures > 0) stats.initiatedWarsWithCapture++;
            if (episode.capitalCaptures > 0) stats.initiatedWarsWithCapitalCapture++;
            if (episode.elimination) stats.initiatedWarsWithElimination++;
            stats.citiesCapturedInInitiatedWars += episode.captures;
            stats.capitalCapturesInInitiatedWars += episode.capitalCaptures;
            stats.eliminationsCausedInInitiatedWars += episode.elimination ? 1 : 0;
            if (episode.firstCaptureDelay !== null) {
                stats.turnsToFirstCaptureFromDeclaredWar.push(episode.firstCaptureDelay);
            }
        }

        for (const participant of participants) {
            const civName = participant.civName;
            const civId = participant.id;
            const stats = ensureTrackedStats(byCiv, civName);
            if (!stats) continue;

            const captureTurns = captureTurnsByCivId.get(civId) ?? [];
            const capitalCaptureTurns = capitalCaptureTurnsByCivId.get(civId) ?? [];
            const hasCapture = captureTurns.length > 0;
            const didWin = winnerCiv === civName;

            if (hasCapture) {
                stats.gamesWithAnyCapture++;
                if (didWin) stats.winsWithAnyCapture++;
            }
            if (firstCaptureOwnerId === civId) {
                stats.gamesWithFirstCapture++;
                if (didWin) stats.winsWithFirstCapture++;
            }

            const firstWarTurn = firstWarTurnByCivId.get(civId);
            if (firstWarTurn !== undefined) {
                (didWin ? stats.firstWarTurnsInWins : stats.firstWarTurnsInLosses).push(firstWarTurn);
            }

            const firstCaptureTurn = firstCaptureTurnByCivId.get(civId);
            if (firstCaptureTurn !== undefined) {
                (didWin ? stats.firstCaptureTurnsInWins : stats.firstCaptureTurnsInLosses).push(firstCaptureTurn);
            }

            if (captureTurns.length > 0) {
                const maxBurst = maxEventsInWindow(captureTurns, CAPTURE_BURST_WINDOW);
                (didWin ? stats.maxCaptureBurst25InWins : stats.maxCaptureBurst25InLosses).push(maxBurst);
            }

            if (didWin && sim.winTurn && firstCaptureTurn !== undefined) {
                stats.turnsFromFirstCaptureToWin.push(sim.winTurn - firstCaptureTurn);
            }

            if (
                didWin &&
                sim.victoryType === "Progress" &&
                firstProgressProjectTurnForWinner !== null
            ) {
                const priorCaptures = captureTurns.filter(turn => turn < firstProgressProjectTurnForWinner);
                const priorCapitalCaptures = capitalCaptureTurns.filter(turn => turn < firstProgressProjectTurnForWinner);
                stats.capturesBeforeFirstProgressProjectTotal += priorCaptures.length;
                stats.capturesBeforeFirstProgressProjectSamples++;
                if (priorCaptures.length > 0) stats.progressWinsWithPriorCapture++;
                if (priorCapitalCaptures.length > 0) stats.progressWinsWithPriorCapitalCapture++;
            }
        }
    }

    const finalized = new Map();
    byCiv.forEach((stats, civName) => {
        finalized.set(civName, {
            ...stats,
            avgDeclarationPowerRatio: avg(stats.declarationPowerRatioTotal, stats.declarationPowerRatioSamples),
            warCaptureConversionRate: pct(stats.initiatedWarsWithCapture, stats.initiatedWars),
            warCapitalCaptureConversionRate: pct(stats.initiatedWarsWithCapitalCapture, stats.initiatedWars),
            warEliminationConversionRate: pct(stats.initiatedWarsWithElimination, stats.initiatedWars),
            capturesPerInitiatedWar: avg(stats.citiesCapturedInInitiatedWars, stats.initiatedWars),
            capitalCapturesPerInitiatedWar: avg(stats.capitalCapturesInInitiatedWars, stats.initiatedWars),
            eliminationsPerInitiatedWar: avg(stats.eliminationsCausedInInitiatedWars, stats.initiatedWars),
            winRateAfterAnyCapture: pct(stats.winsWithAnyCapture, stats.gamesWithAnyCapture),
            winRateAfterFirstCapture: pct(stats.winsWithFirstCapture, stats.gamesWithFirstCapture),
            progressWinPivotRate: pct(stats.progressWinsWithPriorCapture, stats.progressWins),
            progressWinCapitalPivotRate: pct(stats.progressWinsWithPriorCapitalCapture, stats.progressWins),
            avgCapturesBeforeFirstProgressProject: avg(
                stats.capturesBeforeFirstProgressProjectTotal,
                stats.capturesBeforeFirstProgressProjectSamples,
            ),
            medianFirstWarTurnInWins: median(stats.firstWarTurnsInWins),
            medianFirstWarTurnInLosses: median(stats.firstWarTurnsInLosses),
            medianFirstCaptureTurnInWins: median(stats.firstCaptureTurnsInWins),
            medianFirstCaptureTurnInLosses: median(stats.firstCaptureTurnsInLosses),
            medianCaptureBurst25InWins: median(stats.maxCaptureBurst25InWins),
            medianCaptureBurst25InLosses: median(stats.maxCaptureBurst25InLosses),
            medianTurnsFromFirstCaptureToWin: median(stats.turnsFromFirstCaptureToWin),
            medianTurnsToFirstCaptureFromDeclaredWar: median(stats.turnsToFirstCaptureFromDeclaredWar),
        });
    });

    return {
        byCiv: finalized,
        captureBurstWindow: CAPTURE_BURST_WINDOW,
    };
}
