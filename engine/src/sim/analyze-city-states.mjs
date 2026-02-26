import { readFileSync, writeFileSync } from "fs";

const RESULTS_FILE = "/tmp/comprehensive-simulation-results.json";
const OUTPUT_FILE = "/tmp/city-state-report.md";

const YIELD_TYPES = ["Science", "Production", "Food", "Gold"];
const CIV_ORDER = ["ForgeClans", "ScholarKingdoms", "RiverLeague", "AetherianVanguard", "StarborneSeekers", "JadeCovenant"];

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
        surviving: 0,
        removed: 0,
    };
}

function createCityAggregate(name, yieldType) {
    return {
        name,
        yieldType,
        appearances: 0,
        activeTurns: 0,
        contestedTurns: 0,
        suzerainChanges: 0,
        suzerainTurnsByCiv: new Map(),
        investmentByCiv: new Map(),
    };
}

function ensureMapValue(map, key, createFn) {
    if (!map.has(key)) {
        map.set(key, createFn());
    }
    return map.get(key);
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

const results = JSON.parse(readFileSync(RESULTS_FILE, "utf8"));

const civAgg = new Map();
const yieldAgg = new Map(YIELD_TYPES.map(type => [type, createYieldAggregate()]));
const cityAgg = new Map();

let simsWithCityStateTelemetry = 0;
let simsMissingCityStateTelemetry = 0;
let totalCityStatesCreated = 0;
let totalCityStateActiveTurns = 0;
let totalSurvivingCityStates = 0;

const winFlags = [];
const suzerainObservations = [];
const investedGoldObservations = [];

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
    totalCityStatesCreated += num(summary.totalCityStatesCreated, summary.cityStates.length);
    totalCityStateActiveTurns += num(
        summary.totalCityStateActiveTurns,
        summary.cityStates.reduce((sum, cityState) => sum + num(cityState.activeTurns, 0), 0)
    );
    totalSurvivingCityStates += num(
        summary.survivingCityStates,
        summary.cityStates.filter(cityState => cityState.removedTurn === null || cityState.removedTurn === undefined).length
    );

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
    }

    for (const cityState of summary.cityStates) {
        const yieldType = YIELD_TYPES.includes(cityState.yieldType) ? cityState.yieldType : "Science";
        const yieldSummary = ensureMapValue(yieldAgg, yieldType, createYieldAggregate);
        yieldSummary.cityStates += 1;
        yieldSummary.activeTurns += num(cityState.activeTurns, 0);
        yieldSummary.contestedTurns += num(cityState.contestedTurns, 0);
        if (cityState.removedTurn === null || cityState.removedTurn === undefined) {
            yieldSummary.surviving += 1;
        } else {
            yieldSummary.removed += 1;
        }

        const cityName = cityState.cityName || cityState.cityStateId || "Unknown";
        const cityKey = `${yieldType}|${cityName}`;
        const citySummary = ensureMapValue(cityAgg, cityKey, () => createCityAggregate(cityName, yieldType));
        const instanceSuzerainTurnsByCiv = new Map();
        citySummary.appearances += 1;
        citySummary.activeTurns += num(cityState.activeTurns, 0);
        citySummary.contestedTurns += num(cityState.contestedTurns, 0);
        citySummary.suzerainChanges += num(cityState.suzerainChanges, 0);

        for (const [playerId, turnsRaw] of Object.entries(cityState.suzerainTurnsByPlayer || {})) {
            const turns = num(turnsRaw, 0);
            if (turns <= 0) continue;
            const civName = idToCiv.get(playerId) || summary.byPlayer?.[playerId]?.civName || playerId;
            citySummary.suzerainTurnsByCiv.set(civName, (citySummary.suzerainTurnsByCiv.get(civName) || 0) + turns);
            instanceSuzerainTurnsByCiv.set(civName, (instanceSuzerainTurnsByCiv.get(civName) || 0) + turns);
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
}
if (civRows.length === 0) {
    civRows.push(["No telemetry", "0", "0", "0.0%", "0.00", "0.0", "0.0", "0.00", "0.0%", "0.0%", "0"]);
}

const yieldRows = [];
for (const yieldType of YIELD_TYPES) {
    const data = yieldAgg.get(yieldType) || createYieldAggregate();
    yieldRows.push([
        yieldType,
        `${data.cityStates}`,
        fmt(avg(data.activeTurns, data.cityStates), 2),
        `${fmt(pct(data.contestedTurns, data.activeTurns), 1)}%`,
        `${data.surviving}`,
        `${data.removed}`,
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
        formatTurnBreakdown(city.suzerainTurnsByCiv),
        formatInvestmentBreakdown(city.investmentByCiv),
        fmt(avg(city.suzerainChanges, city.appearances), 2),
    ]));
if (cityRows.length === 0) {
    cityRows.push(["No city-states observed", "-", "0", "0.00", "0.0%", "None", "None", "0.00"]);
}

const suzerainWinCorr = pearson(suzerainObservations, winFlags);
const investmentWinCorr = pearson(investedGoldObservations, winFlags);

const report = `# City-State Simulation Report

Generated: ${new Date().toISOString()}

## Data Coverage
- Simulations processed: ${results.length}
- Simulations with city-state telemetry: ${simsWithCityStateTelemetry}
- Simulations missing city-state telemetry: ${simsMissingCityStateTelemetry}
- Total city-states created: ${totalCityStatesCreated}
- Total city-state active turns: ${totalCityStateActiveTurns}
- Average city-states created per telemetry simulation: ${fmt(avg(totalCityStatesCreated, simsWithCityStateTelemetry), 2)}
- Average surviving city-states at game end (telemetry sims): ${fmt(avg(totalSurvivingCityStates, simsWithCityStateTelemetry), 2)}

${simsMissingCityStateTelemetry > 0 ? `> Warning: ${simsMissingCityStateTelemetry} simulations did not include \`cityStateSummary\` telemetry. Rebuild engine and rerun simulations for full coverage.` : ""}

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

## Yield-Type Summary
${markdownTable([
    "Yield",
    "City-States",
    "Avg Active Turns",
    "Contested Turn Share",
    "Surviving",
    "Removed",
], yieldRows)}

## City-State Suzerainty Ledger
${markdownTable([
    "City-State",
    "Yield",
    "Appearances",
    "Avg Active Turns",
    "Contested Share",
    "Suzerain Turns by Civ",
    "Investment by Civ (Gold/Actions)",
    "Avg Suz Changes",
], cityRows)}

## Notes
- "Maintenance Gold" counts investment spend that occurred while the investor was the incumbent suzerain for that city-state.
- Correlations are participant-level across telemetry simulations and should be treated as directional, not causal.
`;

writeFileSync(OUTPUT_FILE, report);
console.log(`City-state report written to ${OUTPUT_FILE}`);
