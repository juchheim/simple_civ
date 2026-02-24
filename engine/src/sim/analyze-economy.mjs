import { readFileSync, writeFileSync } from "fs";

const RESULTS_FILE = "/tmp/comprehensive-simulation-results.json";
const OUTPUT_FILE = "/tmp/economic-balance-report.md";

const CIVS = ["ForgeClans", "ScholarKingdoms", "RiverLeague", "AetherianVanguard", "StarborneSeekers", "JadeCovenant"];
const MAP_ORDER = ["Tiny", "Small", "Standard", "Large", "Huge"];
const GOLD_BUILDINGS = ["TradingPost", "MarketHall", "Bank", "Exchange"];
const PHASES = ["early", "mid", "late"];
const SCHOLAR_AUSTERITY_BASELINE_FEB21 = 0.136;
const EXCHANGE_ADOPTION_TARGET = 0.35;
const BANK_UPTIME_TARGET = 0.70;
const TREASURY_VARIANCE_CAP_INCREASE = 0.10;
const VARIANCE_TARGET_CIVS = ["RiverLeague", "JadeCovenant"];

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

function fmtPct(part, total, digits = 1) {
    return `${pct(part, total).toFixed(digits)}%`;
}

function median(values) {
    if (!values || values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
    return sorted[mid];
}

function max(values) {
    if (!values || values.length === 0) return 0;
    return Math.max(...values);
}

function sum(values) {
    return values.reduce((acc, value) => acc + value, 0);
}

function variance(values) {
    if (!values || values.length === 0) return 0;
    const mean = avg(sum(values), values.length);
    return avg(values.reduce((acc, value) => acc + ((value - mean) ** 2), 0), values.length);
}

function markdownTable(headers, rows) {
    const head = `| ${headers.join(" | ")} |`;
    const divider = `| ${headers.map(() => "---").join(" | ")} |`;
    const body = rows.map(row => `| ${row.join(" | ")} |`).join("\n");
    return `${head}\n${divider}\n${body}`;
}

function createPhaseAggregate() {
    return {
        samples: 0,
        grossGoldTotal: 0,
        buildingUpkeepTotal: 0,
        militaryUpkeepTotal: 0,
        netGoldTotal: 0,
        treasuryTotal: 0,
        deficitTurns: 0,
        austerityTurns: 0,
    };
}

function createCivAggregate() {
    const phase = {};
    for (const p of PHASES) {
        phase[p] = createPhaseAggregate();
    }

    return {
        games: 0,
        wins: 0,
        conquestWins: 0,
        progressWins: 0,
        winTurns: [],

        economySamples: 0,
        grossGoldTotal: 0,
        buildingUpkeepTotal: 0,
        militaryUpkeepTotal: 0,
        netGoldTotal: 0,
        treasuryTotal: 0,
        treasuryMin: Number.POSITIVE_INFINITY,
        treasuryMax: Number.NEGATIVE_INFINITY,
        usedSupplyTotal: 0,
        freeSupplyTotal: 0,
        upkeepRatioTotal: 0,
        deficitTurns: 0,
        positiveNetTurns: 0,
        austerityTurns: 0,
        enteredAusterityCount: 0,
        recoveredFromAusterityCount: 0,
        maxConsecutiveAusterityValues: [],
        supplyPressureTurns: 0,
        zeroTreasuryDeficitTurns: 0,
        atWarTurns: 0,
        atWarNetGoldTotal: 0,
        atWarDeficitTurns: 0,
        atWarAusterityTurns: 0,
        bankConditionalCitySamples: 0,
        bankConditionalActiveSamples: 0,
        rushBuyCount: 0,
        rushBuyGoldSpent: 0,
        rushBuyGoldSaved: 0,
        exchangeDelayValues: [],

        phase,

        buildingCompletions: {},
        goldBuildingCompletions: Object.fromEntries(GOLD_BUILDINGS.map(building => [building, 0])),
        goldBuildingFirstTurns: Object.fromEntries(GOLD_BUILDINGS.map(building => [building, []])),
    };
}

function createMapAggregate() {
    return {
        games: 0,
        economySamples: 0,
        netGoldTotal: 0,
        grossGoldTotal: 0,
        buildingUpkeepTotal: 0,
        militaryUpkeepTotal: 0,
        treasuryTotal: 0,
        treasuryMin: Number.POSITIVE_INFINITY,
        treasuryMax: Number.NEGATIVE_INFINITY,
        deficitTurns: 0,
        austerityTurns: 0,
        bankConditionalCitySamples: 0,
        bankConditionalActiveSamples: 0,
        rushBuyCount: 0,
        rushBuyGoldSpent: 0,
        rushBuyGoldSaved: 0,
        exchangeDelayValues: [],
        goldBuildingFirstTurns: Object.fromEntries(GOLD_BUILDINGS.map(building => [building, []])),
    };
}

function addEconomySummary(target, eco) {
    const samples = num(eco.samples, 0);
    if (samples <= 0) return;

    const grossGoldTotal = num(eco.grossGoldTotal, num(eco.avgGrossGold) * samples);
    const buildingUpkeepTotal = num(eco.buildingUpkeepTotal, num(eco.avgBuildingUpkeep) * samples);
    const militaryUpkeepTotal = num(eco.militaryUpkeepTotal, num(eco.avgMilitaryUpkeep) * samples);
    const netGoldTotal = num(eco.netGoldTotal, num(eco.avgNetGold) * samples);
    const treasuryTotal = num(eco.treasuryTotal, num(eco.avgTreasury) * samples);

    target.economySamples += samples;
    target.grossGoldTotal += grossGoldTotal;
    target.buildingUpkeepTotal += buildingUpkeepTotal;
    target.militaryUpkeepTotal += militaryUpkeepTotal;
    target.netGoldTotal += netGoldTotal;
    target.treasuryTotal += treasuryTotal;
    target.treasuryMin = Math.min(target.treasuryMin, num(eco.treasuryMin, 0));
    target.treasuryMax = Math.max(target.treasuryMax, num(eco.treasuryMax, 0));
    if (typeof target.usedSupplyTotal === "number") {
        target.usedSupplyTotal += num(eco.avgUsedSupply, 0) * samples;
    }
    if (typeof target.freeSupplyTotal === "number") {
        target.freeSupplyTotal += num(eco.avgFreeSupply, 0) * samples;
    }
    if (typeof target.upkeepRatioTotal === "number") {
        target.upkeepRatioTotal += num(eco.avgUpkeepRatio, 0) * samples;
    }
    target.deficitTurns += num(eco.deficitTurns, num(eco.deficitTurnRate, 0) * samples);
    if (typeof target.positiveNetTurns === "number") {
        target.positiveNetTurns += num(eco.positiveNetTurns, samples - num(eco.deficitTurns, 0));
    }
    target.austerityTurns += num(eco.austerityTurns, num(eco.austerityTurnRate, 0) * samples);
    if (typeof target.enteredAusterityCount === "number") {
        target.enteredAusterityCount += num(eco.enteredAusterityCount, 0);
    }
    if (typeof target.recoveredFromAusterityCount === "number") {
        target.recoveredFromAusterityCount += num(eco.recoveredFromAusterityCount, 0);
    }
    if (Array.isArray(target.maxConsecutiveAusterityValues)) {
        target.maxConsecutiveAusterityValues.push(num(eco.maxConsecutiveAusterity, 0));
    }
    if (typeof target.supplyPressureTurns === "number") {
        target.supplyPressureTurns += num(eco.supplyPressureTurns, num(eco.supplyPressureRate, 0) * samples);
    }
    if (typeof target.zeroTreasuryDeficitTurns === "number") {
        target.zeroTreasuryDeficitTurns += num(eco.zeroTreasuryDeficitTurns, 0);
    }
    if (typeof target.atWarTurns === "number") {
        target.atWarTurns += num(eco.atWarTurns, num(eco.atWarTurnRate, 0) * samples);
    }
    if (typeof target.atWarNetGoldTotal === "number") {
        target.atWarNetGoldTotal += num(eco.avgAtWarNetGold, 0) * num(eco.atWarTurns, 0);
    }
    if (typeof target.atWarDeficitTurns === "number") {
        target.atWarDeficitTurns += num(eco.atWarDeficitTurnRate, 0) * num(eco.atWarTurns, 0);
    }
    if (typeof target.atWarAusterityTurns === "number") {
        target.atWarAusterityTurns += num(eco.atWarAusterityTurnRate, 0) * num(eco.atWarTurns, 0);
    }
    if (typeof target.bankConditionalCitySamples === "number") {
        target.bankConditionalCitySamples += num(eco.bankConditionalCitySamples, 0);
    }
    if (typeof target.bankConditionalActiveSamples === "number") {
        target.bankConditionalActiveSamples += num(eco.bankConditionalActiveSamples, 0);
    }
    if (typeof target.rushBuyCount === "number") {
        target.rushBuyCount += num(eco.rushBuyCount, 0);
    }
    if (typeof target.rushBuyGoldSpent === "number") {
        target.rushBuyGoldSpent += num(eco.rushBuyGoldSpent, 0);
    }
    if (typeof target.rushBuyGoldSaved === "number") {
        target.rushBuyGoldSaved += num(eco.rushBuyGoldSaved, 0);
    }
    if (Array.isArray(target.exchangeDelayValues)) {
        const delay = eco.exchangeUnlockToFirstBuildDelay;
        if (Number.isFinite(delay)) {
            target.exchangeDelayValues.push(delay);
        }
    }

    if (target.phase) {
        for (const phaseName of PHASES) {
            const phase = eco.phase?.[phaseName];
            if (!phase) continue;

            const phaseSamples = num(phase.samples, 0);
            if (phaseSamples <= 0) continue;

            const phaseTarget = target.phase[phaseName];
            phaseTarget.samples += phaseSamples;
            phaseTarget.grossGoldTotal += num(phase.grossGoldTotal, num(phase.avgGrossGold, 0) * phaseSamples);
            phaseTarget.buildingUpkeepTotal += num(phase.buildingUpkeepTotal, num(phase.avgBuildingUpkeep, 0) * phaseSamples);
            phaseTarget.militaryUpkeepTotal += num(phase.militaryUpkeepTotal, num(phase.avgMilitaryUpkeep, 0) * phaseSamples);
            phaseTarget.netGoldTotal += num(phase.netGoldTotal, num(phase.avgNetGold, 0) * phaseSamples);
            phaseTarget.treasuryTotal += num(phase.treasuryTotal, num(phase.avgTreasury, 0) * phaseSamples);
            phaseTarget.deficitTurns += num(phase.deficitTurns, num(phase.deficitTurnRate, 0) * phaseSamples);
            phaseTarget.austerityTurns += num(phase.austerityTurns, num(phase.austerityTurnRate, 0) * phaseSamples);
        }
    }
}

const results = JSON.parse(readFileSync(RESULTS_FILE, "utf8"));

const civStats = new Map(CIVS.map(civ => [civ, createCivAggregate()]));
const mapStats = new Map(MAP_ORDER.map(mapSize => [
    mapSize,
    new Map(CIVS.map(civ => [civ, createMapAggregate()])),
]));
const acceptance = {
    exchangeEligible: 0,
    exchangeBuiltAfterUnlock: 0,
    bankConditionalCitySamples: 0,
    bankConditionalActiveSamples: 0,
    scholarSamples: 0,
    scholarAusterityTurns: 0,
    treasuryAvgByCiv: Object.fromEntries(VARIANCE_TARGET_CIVS.map(civ => [civ, []])),
};

const ensureCiv = civName => {
    if (!civStats.has(civName)) {
        civStats.set(civName, createCivAggregate());
    }
    return civStats.get(civName);
};

const ensureMapCiv = (mapSize, civName) => {
    if (!mapStats.has(mapSize)) {
        mapStats.set(mapSize, new Map());
    }
    const mapEntry = mapStats.get(mapSize);
    if (!mapEntry.has(civName)) {
        mapEntry.set(civName, createMapAggregate());
    }
    return mapEntry.get(civName);
};

let simsWithEconomySummary = 0;
let simsMissingEconomySummary = 0;

for (const sim of results) {
    const mapSize = sim.mapSize;
    const idToCivName = new Map();

    const participants = sim.participatingCivs || sim.finalState?.civs || [];
    for (const p of participants) {
        if (p?.id && p?.civName) {
            idToCivName.set(p.id, p.civName);
        }
    }

    const participatingCivs = new Set(idToCivName.values());
    for (const civName of participatingCivs) {
        const civAgg = ensureCiv(civName);
        civAgg.games += 1;
        ensureMapCiv(mapSize, civName).games += 1;
    }

    if (sim.winner?.civ) {
        const winnerAgg = ensureCiv(sim.winner.civ);
        winnerAgg.wins += 1;
        if (sim.victoryType === "Conquest") winnerAgg.conquestWins += 1;
        if (sim.victoryType === "Progress") winnerAgg.progressWins += 1;
        if (sim.winTurn) winnerAgg.winTurns.push(sim.winTurn);
    }

    if (sim.economySummary && typeof sim.economySummary === "object") {
        simsWithEconomySummary += 1;

        for (const [playerId, ecoRaw] of Object.entries(sim.economySummary)) {
            const eco = ecoRaw || {};
            const civName = eco.civName || idToCivName.get(playerId);
            if (!civName) continue;

            const civAgg = ensureCiv(civName);
            addEconomySummary(civAgg, eco);

            const mapAgg = ensureMapCiv(mapSize, civName);
            addEconomySummary(mapAgg, eco);

            if (eco.exchangeUnlockTurn !== null && eco.exchangeUnlockTurn !== undefined) {
                acceptance.exchangeEligible += 1;
                if (eco.exchangeFirstBuildTurn !== null && eco.exchangeFirstBuildTurn !== undefined) {
                    acceptance.exchangeBuiltAfterUnlock += 1;
                }
            }
            acceptance.bankConditionalCitySamples += num(eco.bankConditionalCitySamples, 0);
            acceptance.bankConditionalActiveSamples += num(eco.bankConditionalActiveSamples, 0);

            if (civName === "ScholarKingdoms") {
                const samples = num(eco.samples, 0);
                acceptance.scholarSamples += samples;
                acceptance.scholarAusterityTurns += num(eco.austerityTurns, num(eco.austerityTurnRate, 0) * samples);
            }

            if (VARIANCE_TARGET_CIVS.includes(civName)) {
                const avgTreasury = Number(eco.avgTreasury);
                if (Number.isFinite(avgTreasury)) {
                    acceptance.treasuryAvgByCiv[civName].push(avgTreasury);
                }
            }
        }
    } else {
        simsMissingEconomySummary += 1;
    }

    const firstGoldBuildingTurnByCiv = new Map();

    for (const event of sim.events || []) {
        if (event.type !== "BuildingComplete") continue;
        const civName = idToCivName.get(event.owner);
        if (!civName) continue;

        const civAgg = ensureCiv(civName);
        civAgg.buildingCompletions[event.building] = (civAgg.buildingCompletions[event.building] || 0) + 1;

        if (GOLD_BUILDINGS.includes(event.building)) {
            civAgg.goldBuildingCompletions[event.building] += 1;

            if (!firstGoldBuildingTurnByCiv.has(civName)) {
                firstGoldBuildingTurnByCiv.set(civName, {});
            }
            const civTurns = firstGoldBuildingTurnByCiv.get(civName);
            if (!(event.building in civTurns) || event.turn < civTurns[event.building]) {
                civTurns[event.building] = event.turn;
            }
        }
    }

    firstGoldBuildingTurnByCiv.forEach((buildingTurns, civName) => {
        const civAgg = ensureCiv(civName);
        const mapAgg = ensureMapCiv(mapSize, civName);
        for (const building of GOLD_BUILDINGS) {
            if (building in buildingTurns) {
                civAgg.goldBuildingFirstTurns[building].push(buildingTurns[building]);
                if (mapAgg.goldBuildingFirstTurns?.[building]) {
                    mapAgg.goldBuildingFirstTurns[building].push(buildingTurns[building]);
                }
            }
        }
    });
}

const civScoreRows = [];
for (const civName of CIVS) {
    const civAgg = ensureCiv(civName);
    const upkeepTotal = civAgg.buildingUpkeepTotal + civAgg.militaryUpkeepTotal;
    const avgMaxAusterity = avg(sum(civAgg.maxConsecutiveAusterityValues), civAgg.maxConsecutiveAusterityValues.length);
    const maxAusterity = max(civAgg.maxConsecutiveAusterityValues);
    const rushBuyVolume = civAgg.rushBuyGoldSpent + civAgg.rushBuyGoldSaved;
    const exchangeDelayMedian = median(civAgg.exchangeDelayValues);

    civScoreRows.push([
        civName,
        `${civAgg.games}`,
        fmtPct(civAgg.wins, civAgg.games),
        `${fmtPct(civAgg.conquestWins, civAgg.wins)} C / ${fmtPct(civAgg.progressWins, civAgg.wins)} P`,
        fmt(avg(civAgg.grossGoldTotal, civAgg.economySamples)),
        fmt(avg(upkeepTotal, civAgg.economySamples)),
        fmt(avg(civAgg.netGoldTotal, civAgg.economySamples)),
        fmt(avg(civAgg.treasuryTotal, civAgg.economySamples)),
        fmtPct(civAgg.deficitTurns, civAgg.economySamples),
        fmtPct(civAgg.austerityTurns, civAgg.economySamples),
        `${fmt(avgMaxAusterity, 1)} / ${fmt(maxAusterity, 0)}`,
        fmtPct(civAgg.supplyPressureTurns, civAgg.economySamples),
        fmt(avg(civAgg.atWarNetGoldTotal, civAgg.atWarTurns)),
        fmtPct(civAgg.bankConditionalActiveSamples, civAgg.bankConditionalCitySamples),
        fmt(avg(civAgg.rushBuyCount, civAgg.games)),
        fmt(avg(civAgg.rushBuyGoldSaved, civAgg.games)),
        fmtPct(civAgg.rushBuyGoldSaved, rushBuyVolume),
        exchangeDelayMedian === null ? "n/a" : fmt(exchangeDelayMedian, 1),
    ]);
}

const goldBuildingSections = GOLD_BUILDINGS.map(building => {
    const rows = CIVS.map(civName => {
        const civAgg = ensureCiv(civName);
        const completions = civAgg.goldBuildingCompletions[building] || 0;
        const firstTurns = civAgg.goldBuildingFirstTurns[building] || [];
        const medFirst = median(firstTurns);
        return [
            civName,
            fmt(avg(completions, civAgg.games)),
            fmtPct(firstTurns.length, civAgg.games),
            medFirst === null ? "n/a" : fmt(medFirst, 1),
        ];
    });

    return `### ${building}\n${markdownTable([
        "Civ",
        "Completions / Game",
        "Adoption Rate",
        "Median First Completion Turn",
    ], rows)}`;
});

const phaseRows = [];
for (const civName of CIVS) {
    const civAgg = ensureCiv(civName);
    const row = [civName];

    for (const phaseName of PHASES) {
        row.push(fmt(avg(civAgg.phase[phaseName].netGoldTotal, civAgg.phase[phaseName].samples)));
    }
    for (const phaseName of PHASES) {
        row.push(fmtPct(civAgg.phase[phaseName].austerityTurns, civAgg.phase[phaseName].samples));
    }

    phaseRows.push(row);
}

const mapSections = MAP_ORDER.map(mapSize => {
    const mapEntry = mapStats.get(mapSize) || new Map();
    const rows = CIVS.map(civName => {
        const data = mapEntry.get(civName) || createMapAggregate();
        return [
            civName,
            `${data.games}`,
            fmt(avg(data.grossGoldTotal, data.economySamples)),
            fmt(avg(data.buildingUpkeepTotal + data.militaryUpkeepTotal, data.economySamples)),
            fmt(avg(data.netGoldTotal, data.economySamples)),
            fmtPct(data.deficitTurns, data.economySamples),
            fmtPct(data.austerityTurns, data.economySamples),
        ];
    });

    return `### ${mapSize}\n${markdownTable([
        "Civ",
        "Games",
        "Avg Gross",
        "Avg Upkeep",
        "Avg Net",
        "Deficit Turns",
        "Austerity Turns",
    ], rows)}`;
});

const mapGoldTimingSections = MAP_ORDER.map(mapSize => {
    const mapEntry = mapStats.get(mapSize) || new Map();
    const rows = CIVS.map(civName => {
        const data = mapEntry.get(civName) || createMapAggregate();
        const medians = GOLD_BUILDINGS.map(building => {
            const firstTurns = data.goldBuildingFirstTurns?.[building] || [];
            const med = median(firstTurns);
            return med === null ? "n/a" : fmt(med, 1);
        });
        return [civName, ...medians];
    });

    return `### ${mapSize}\n${markdownTable([
        "Civ",
        "TradingPost First",
        "MarketHall First",
        "Bank First",
        "Exchange First",
    ], rows)}`;
});

const tuningFlags = CIVS.map(civName => {
    const civAgg = ensureCiv(civName);
    const lines = [];

    const avgNet = avg(civAgg.netGoldTotal, civAgg.economySamples);
    const avgUpkeepRatio = avg(civAgg.upkeepRatioTotal, civAgg.economySamples);
    const deficitRate = avg(civAgg.deficitTurns, civAgg.economySamples);
    const austerityRate = avg(civAgg.austerityTurns, civAgg.economySamples);
    const atWarDeficitRate = avg(civAgg.atWarDeficitTurns, civAgg.atWarTurns);
    const avgTreasury = avg(civAgg.treasuryTotal, civAgg.economySamples);
    const maxAusterity = max(civAgg.maxConsecutiveAusterityValues);

    if (civAgg.economySamples === 0) {
        lines.push("No economy telemetry available (rebuild engine + rerun simulation).\n");
        return `### ${civName}\n- ${lines.join("\n- ")}`;
    }

    if (avgNet < 0) lines.push(`Chronic negative net gold (${fmt(avgNet)}).`);
    if (deficitRate > 0.30) lines.push(`High deficit exposure (${(deficitRate * 100).toFixed(1)}% of turns).`);
    if (austerityRate > 0.12) lines.push(`Austerity too frequent (${(austerityRate * 100).toFixed(1)}% of turns).`);
    if (maxAusterity > 6) lines.push(`Long austerity streaks detected (max ${maxAusterity} consecutive turns).`);
    if (avgUpkeepRatio > 0.75) lines.push(`Upkeep pressure is high (avg upkeep/gross ratio ${fmt(avgUpkeepRatio)}).`);
    if (atWarDeficitRate > 0.40) lines.push(`Wartime economy collapses often (deficit in ${(atWarDeficitRate * 100).toFixed(1)}% of war turns).`);
    if (avgTreasury < 25) lines.push(`Treasury buffer is low (avg ${fmt(avgTreasury)}G).`);

    const exchangeAdoption = pct((civAgg.goldBuildingFirstTurns.Exchange || []).length, civAgg.games);
    if (exchangeAdoption < 20) lines.push(`Late-gold building adoption is low (Exchange adoption ${exchangeAdoption.toFixed(1)}%).`);

    if (lines.length === 0) {
        lines.push("No major economy red flags detected in current sample.");
    }

    return `### ${civName}\n- ${lines.join("\n- ")}`;
});

const totalWins = CIVS.reduce((acc, civ) => acc + ensureCiv(civ).wins, 0);
const totalConquestWins = CIVS.reduce((acc, civ) => acc + ensureCiv(civ).conquestWins, 0);
const totalProgressWins = CIVS.reduce((acc, civ) => acc + ensureCiv(civ).progressWins, 0);
const exchangeAdoptionRate = avg(acceptance.exchangeBuiltAfterUnlock, acceptance.exchangeEligible);
const bankConditionalUptime = avg(acceptance.bankConditionalActiveSamples, acceptance.bankConditionalCitySamples);
const scholarAusterityRate = avg(acceptance.scholarAusterityTurns, acceptance.scholarSamples);
const scholarAusterityDeltaPp = (scholarAusterityRate - SCHOLAR_AUSTERITY_BASELINE_FEB21) * 100;
const exchangeTargetMet = exchangeAdoptionRate >= EXCHANGE_ADOPTION_TARGET;
const bankTargetMet = bankConditionalUptime >= BANK_UPTIME_TARGET;
const scholarTargetMet = scholarAusterityRate < SCHOLAR_AUSTERITY_BASELINE_FEB21;
const treasuryVarianceRows = VARIANCE_TARGET_CIVS.map(civName => {
    const values = acceptance.treasuryAvgByCiv[civName] ?? [];
    const varianceValue = variance(values);
    const mean = avg(sum(values), values.length);
    const stdev = Math.sqrt(varianceValue);
    const cv = mean > 0 ? stdev / mean : 0;
    return {
        civName,
        count: values.length,
        variance: varianceValue,
        cv,
    };
});
const acceptanceRows = [
    [
        "Exchange adoption among SignalRelay researchers",
        `${(exchangeAdoptionRate * 100).toFixed(1)}% (${acceptance.exchangeBuiltAfterUnlock} / ${acceptance.exchangeEligible})`,
        `>= ${(EXCHANGE_ADOPTION_TARGET * 100).toFixed(0)}%`,
        exchangeTargetMet ? "Met" : "Not met",
        "",
    ],
    [
        "Bank conditional uptime",
        `${(bankConditionalUptime * 100).toFixed(1)}% (${acceptance.bankConditionalActiveSamples} / ${acceptance.bankConditionalCitySamples})`,
        `>= ${(BANK_UPTIME_TARGET * 100).toFixed(0)}%`,
        bankTargetMet ? "Met" : "Not met",
        "",
    ],
    [
        "ScholarKingdoms austerity share vs Feb 21 baseline",
        `${(scholarAusterityRate * 100).toFixed(1)}% (delta ${scholarAusterityDeltaPp >= 0 ? "+" : ""}${scholarAusterityDeltaPp.toFixed(1)}pp vs ${(SCHOLAR_AUSTERITY_BASELINE_FEB21 * 100).toFixed(1)}%)`,
        `< ${(SCHOLAR_AUSTERITY_BASELINE_FEB21 * 100).toFixed(1)}%`,
        scholarTargetMet ? "Met" : "Not met",
        "",
    ],
    ...treasuryVarianceRows.map(row => [
        `${row.civName} treasury runaway variance cap`,
        `Variance ${fmt(row.variance)} (CV ${fmt(row.cv, 3)})`,
        `<= +${Math.round(TREASURY_VARIANCE_CAP_INCREASE * 100)}% vs Feb 21 baseline`,
        "Indeterminate",
        "Baseline variance value not present in current report artifacts",
    ]),
];

const report = `# Economic Balance Report\n\nGenerated: ${new Date().toISOString()}\n\n## Data Coverage\n- Simulations processed: ${results.length}\n- Simulations with economy telemetry: ${simsWithEconomySummary}\n- Simulations missing economy telemetry: ${simsMissingEconomySummary}\n- Total wins: ${totalWins} (${totalConquestWins} Conquest / ${totalProgressWins} Progress)\n\n${simsMissingEconomySummary > 0 ? `> Warning: ${simsMissingEconomySummary} simulations did not include economySummary. Run \`npm run build -w engine\` before simulation to ensure latest telemetry.` : ""}\n\n## Acceptance Targets\n${markdownTable([
    "Target",
    "Current",
    "Threshold",
    "Status",
    "Notes",
], acceptanceRows)}\n\n## Civ Economy Scorecard\n${markdownTable([
    "Civ",
    "Games",
    "Win%",
    "Victory Mix",
    "Avg Gross",
    "Avg Upkeep",
    "Avg Net",
    "Avg Treasury",
    "Deficit Turns",
    "Austerity Turns",
    "Austerity Streak (Avg/Max)",
    "Supply Pressure",
    "Avg Net (At War)",
    "Bank Uptime",
    "Rush-Buys/Game",
    "Saved Gold/Game",
    "Discount Utilization",
    "Exchange Delay",
], civScoreRows)}\n\n## Gold Building Adoption\n${goldBuildingSections.join("\n\n")}\n\n## Economy By Game Phase\n(Phase buckets: Early <= 100, Mid 101-200, Late > 200)\n\n${markdownTable([
    "Civ",
    "Early Net",
    "Mid Net",
    "Late Net",
    "Early Austerity",
    "Mid Austerity",
    "Late Austerity",
], phaseRows)}\n\n## Map Size Sensitivity\n${mapSections.join("\n\n")}\n\n## Gold Building Timing By Map Size\n${mapGoldTimingSections.join("\n\n")}\n\n## Civ-Specific Tuning Flags\n${tuningFlags.join("\n\n")}\n\n## How To Use This Report\n- Use **Avg Net**, **Deficit Turns**, and **Austerity Turns** to determine if a civ's baseline economy is stable.\n- Use **Avg Net (At War)** and **Supply Pressure** to tune war upkeep pressure per civ.\n- Use **Bank Uptime**, **Rush-Buys/Game**, **Saved Gold/Game**, and **Exchange Delay** to evaluate tactical gold payoff adoption.\n- Use **Gold Building Adoption** + **Median First Completion Turn** to tune AI economy bias and building cost/tech timing.\n- Use **Phase Net** and **Phase Austerity** to isolate whether issues are early snowball, midgame squeeze, or late-game collapse.\n- Use **Map Size Sensitivity** to decide whether fixes should be global or map-size-specific.\n`;

writeFileSync(OUTPUT_FILE, report);
console.log(`Economic report written to ${OUTPUT_FILE}`);
