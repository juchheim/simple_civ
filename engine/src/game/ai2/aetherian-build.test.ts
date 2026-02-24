
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chooseCityBuildV2 } from './production.js';
import { GameState, City } from '../../core/types.js';

// 1. Mock logging
vi.mock('../ai/debug-logging.js', () => ({
    aiInfo: vi.fn(),
    aiError: vi.fn(),
    aiWarn: vi.fn(),
    isAiDebugEnabled: () => false,
}));

// 2. Mock ALL sub-pickers referenced in production.ts to control the test
// We use simple factory functions that return simple values (or null)

vi.mock('./production/emergency.js', () => ({
    isWarEmergency: () => false,
    pickCityUnderAttackBuild: () => null,
    pickGarrisonReplenishmentBuild: () => null,
    pickWarEmergencyBuild: () => null
}));

vi.mock('./production/staging.js', () => ({
    pickWarStagingProduction: () => null
}));

vi.mock('./production/war.js', () => ({
    pickTrebuchetProduction: () => null
}));

vi.mock('./production/defense-priority.js', () => ({
    shouldPrioritizeDefense: () => 'expand',
    resolveInterleave: () => false
}));

vi.mock('./production/tech-unlocks.js', () => ({
    pickTechUnlockBuild: () => null
}));

vi.mock('./production/proactive.js', () => ({
    pickProactiveReinforcementBuild: () => null
}));

vi.mock('./production/phases/defense.js', () => ({
    pickPhaseDefensePriorityBuild: () => null,
    pickPhaseDefenseSupportBuild: () => null
}));

vi.mock('./production/phases/expansion.js', () => ({
    pickPhaseEarlyExpansionBuild: () => null,
    pickPhaseExpansionBuild: () => null
}));

vi.mock('./production/economy.js', () => ({
    pickEconomyBuilding: () => null
}));

vi.mock('./production/capability-gaps.js', () => ({
    pickCapabilityGapBuild: () => null
}));

vi.mock('./production/civ-builds.js', () => ({
    pickRiverLeagueEarlyBoost: () => null,
    pickDefensiveEarlyMilitaryBuild: () => null,
    pickDefensiveLorekeeperBuild: () => null,
    pickDefensiveArmyBuild: () => null,
    // We want the REAL implementation of this one? No, we can't easily partially mock.
    // So we will MOCK it to return our expected Titan build, and verify `chooseCityBuildV2` picks it.
    // Wait, if we mock it, we aren't testing the logic inside it.
    // BUT we are testing the PRODUCTION PRIORITY order.
    // So:
    // 1. Mock AetherianPicker to return "TITAN CORE"
    // 2. Mock VictoryPicker to return "OBSERVATORY"
    // 3. Assert chooseCityBuildV2 returns "TITAN CORE"
    pickAetherianVanguardBuild: () => ({ type: 'Building', id: 'TitansCore_MOCKED' })
}));

vi.mock('./production/victory.js', () => ({
    pickVictoryProject: () => ({ type: 'Project', id: 'Observatory_MOCKED' })
}));

// Mock rules and strategic-plan minimally to avoid crash in `buildProductionContext`
vi.mock('./rules.js', () => ({
    getAiProfileV2: () => ({
        civName: 'AetherianVanguard',
        economy: {
            reserveMultiplier: 1,
            deficitToleranceTurns: 3,
            goldBuildBias: 1,
            rushBuyAggression: 1,
            upkeepRatioLimit: 0.55,
        },
    }),
    canBuild: () => true
}));

vi.mock('./strategic-plan.js', () => ({
    getGamePhase: () => 'Expand',
    assessCapabilities: () => ({}),
    findCapabilityGaps: () => ({
        needSiege: 0,
        needCapture: 0,
        needDefense: 0,
        needVision: 0,
        needGarrison: 0,
        priority: 'capture'
    }),
    getGoalRequirements: () => ({}),
    getBestUnitForRole: () => null
}));

vi.mock('./defense-situation/scoring.js', () => ({
    assessCityThreatLevel: () => 'none'
}));

describe('Aetherian Vanguard Build Priority Integration', () => {
    let state: GameState;
    let city: City;

    beforeEach(() => {
        state = {
            turn: 100,
            players: [{ id: 'p1', civName: 'AetherianVanguard', techs: [] }],
            cities: [],
            units: [],
            diplomacy: {}
        } as any;
        city = { id: 'c1', ownerId: 'p1' } as any;
        state.cities = [city];
    });

    it('should select Aetherian Build (Titan) over Victory Project (Observatory)', () => {
        // Since we mocked both pickers to return specific items:
        // Aetherian -> TitansCore_MOCKED
        // Victory -> Observatory_MOCKED

        // If Priority is correct (Aetherian > Victory), we get Titan.
        const result = chooseCityBuildV2(state, 'p1', city, 'Progress');

        expect(result).not.toBeNull();
        expect(result?.id).toBe('TitansCore_MOCKED');
    });
});
