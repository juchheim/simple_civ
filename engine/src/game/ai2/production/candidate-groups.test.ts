import { beforeEach, describe, expect, it, vi } from "vitest";
import { addPrimaryProductionCandidates, type ProductionCandidateAddInput } from "./candidate-groups.js";

const option = (id: string) => ({ type: "Unit", id } as const);

const mockPickCityUnderAttackBuild = vi.fn(() => option("CityUnderAttack"));
const mockPickGarrisonReplenishmentBuild = vi.fn(() => option("WarGarrison"));
const mockPickWarEmergencyBuild = vi.fn(() => option("WarEmergency"));
const mockPickVictoryProject = vi.fn(() => option("VictoryProject"));
const mockPickEconomyBuilding = vi.fn(() => option("EconomyBuilding"));
const mockPickAetherianVanguardBuild = vi.fn(() => option("AetherianTitan"));
const mockPickDefensiveArmyBuild = vi.fn(() => option("DefensiveArmy"));
const mockPickDefensiveEarlyMilitaryBuild = vi.fn(() => option("DefensiveEarly"));
const mockPickDefensiveLorekeeperBuild = vi.fn(() => option("DefensiveLorekeeper"));
const mockPickRiverLeagueEarlyBoost = vi.fn(() => option("RiverLeagueBoost"));
const mockPickTechUnlockBuild = vi.fn(() => option("TechUnlock"));
const mockPickPhaseDefensePriorityBuild = vi.fn(() => option("DefensePriority"));
const mockPickPhaseDefenseSupportBuild = vi.fn(() => option("DefenseSupport"));
const mockPickPhaseEarlyExpansionBuild = vi.fn(() => option("EarlyExpansion"));
const mockPickPhaseExpansionBuild = vi.fn(() => option("Expansion"));
const mockPickProactiveReinforcementBuild = vi.fn(() => option("ProactiveReinforcement"));
const mockPickWarStagingProduction = vi.fn(() => option("WarStaging"));
const mockPickTrebuchetProduction = vi.fn(() => option("WarSiege"));
const mockPickCapabilityGapBuild = vi.fn(() => option("CapabilityGap"));

vi.mock("./emergency.js", () => ({
    pickCityUnderAttackBuild: (...args: any[]) => mockPickCityUnderAttackBuild(...args),
    pickGarrisonReplenishmentBuild: (...args: any[]) => mockPickGarrisonReplenishmentBuild(...args),
    pickWarEmergencyBuild: (...args: any[]) => mockPickWarEmergencyBuild(...args),
}));

vi.mock("./victory.js", () => ({
    pickVictoryProject: (...args: any[]) => mockPickVictoryProject(...args),
}));

vi.mock("./economy.js", () => ({
    pickEconomyBuilding: (...args: any[]) => mockPickEconomyBuilding(...args),
}));

vi.mock("./civ-builds.js", () => ({
    pickAetherianVanguardBuild: (...args: any[]) => mockPickAetherianVanguardBuild(...args),
    pickDefensiveArmyBuild: (...args: any[]) => mockPickDefensiveArmyBuild(...args),
    pickDefensiveEarlyMilitaryBuild: (...args: any[]) => mockPickDefensiveEarlyMilitaryBuild(...args),
    pickDefensiveLorekeeperBuild: (...args: any[]) => mockPickDefensiveLorekeeperBuild(...args),
    pickRiverLeagueEarlyBoost: (...args: any[]) => mockPickRiverLeagueEarlyBoost(...args),
}));

vi.mock("./tech-unlocks.js", () => ({
    pickTechUnlockBuild: (...args: any[]) => mockPickTechUnlockBuild(...args),
}));

vi.mock("./phases/defense.js", () => ({
    pickPhaseDefensePriorityBuild: (...args: any[]) => mockPickPhaseDefensePriorityBuild(...args),
    pickPhaseDefenseSupportBuild: (...args: any[]) => mockPickPhaseDefenseSupportBuild(...args),
}));

vi.mock("./phases/expansion.js", () => ({
    pickPhaseEarlyExpansionBuild: (...args: any[]) => mockPickPhaseEarlyExpansionBuild(...args),
    pickPhaseExpansionBuild: (...args: any[]) => mockPickPhaseExpansionBuild(...args),
}));

vi.mock("./proactive.js", () => ({
    pickProactiveReinforcementBuild: (...args: any[]) => mockPickProactiveReinforcementBuild(...args),
}));

vi.mock("./staging.js", () => ({
    pickWarStagingProduction: (...args: any[]) => mockPickWarStagingProduction(...args),
}));

vi.mock("./war.js", () => ({
    pickTrebuchetProduction: (...args: any[]) => mockPickTrebuchetProduction(...args),
}));

vi.mock("./capability-gaps.js", () => ({
    pickCapabilityGapBuild: (...args: any[]) => mockPickCapabilityGapBuild(...args),
}));

function baseParams(overrides: Partial<Parameters<typeof addPrimaryProductionCandidates>[0]> = {}): Parameters<typeof addPrimaryProductionCandidates>[0] {
    const profile: any = {
        civName: "ForgeClans",
        economy: {
            goldBuildBias: 1,
            upkeepRatioLimit: 0.5,
        },
    };
    const economy: any = {
        grossGold: 10,
        buildingUpkeep: 2,
        militaryUpkeep: 3,
        netGold: 5,
        treasury: 100,
        reserveFloor: 20,
        deficitRiskTurns: 10,
        economyState: "Healthy",
        spendableTreasury: 80,
        usedSupply: 3,
        freeSupply: 6,
        upkeepRatio: 0.3,
        atWar: false,
    };

    return {
        addCandidate: () => {},
        state: {} as any,
        playerId: "p1",
        city: { id: "c1" } as any,
        goal: "Balanced",
        context: {} as any,
        profile,
        myCities: [{ id: "c1" } as any],
        economy,
        warEmergency: false,
        isEconomyRecoveryState: false,
        isCrisis: false,
        defenseDecision: "interleave",
        shouldBuildDefender: true,
        theaterBias: 0.02,
        threatMod: 0.01,
        frontMod: 0.02,
        pressureMod: 0.01,
        safetyMod: 0.01,
        expansionMod: 0.01,
        gapMod: 0.01,
        supplyGap: 0,
        supplyNearCap: false,
        ...overrides,
    };
}

describe("production candidate groups", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("adds production candidates in stable order", () => {
        const added: ProductionCandidateAddInput[] = [];
        addPrimaryProductionCandidates(baseParams({
            addCandidate: input => added.push(input),
        }));

        expect(added.map(c => c.reason)).toEqual([
            "city-under-attack",
            "war-staging",
            "war-siege",
            "war-garrison",
            "war-emergency",
            "aetherian-titan",
            "victory-project",
            "defense-priority",
            "riverleague-boost",
            "defensive-early-military",
            "early-expansion",
            "defensive-lorekeeper",
            "defensive-army",
            "tech-unlock",
            "proactive-reinforcement",
            "defense-support",
            "capability-gap",
            "expansion",
            "economy",
        ]);
    });

    it("skips gated candidates during emergency/recovery", () => {
        const added: ProductionCandidateAddInput[] = [];
        addPrimaryProductionCandidates(baseParams({
            addCandidate: input => added.push(input),
            warEmergency: true,
            isEconomyRecoveryState: true,
            supplyGap: 2,
        }));

        const reasons = added.map(c => c.reason);
        expect(reasons.includes("victory-project")).toBe(false);
        expect(reasons.includes("defensive-army")).toBe(false);
        expect(reasons.includes("economy")).toBe(true);
    });
});
