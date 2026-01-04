
import { describe, it, expect, vi } from 'vitest';
import { runFocusSiegeAndCapture } from './siege-routing.js';
import { GameState, Unit, UnitType, UnitDomain, City } from '../../core/types.js';
import { UNITS } from '../../core/constants.js';
import { TacticalContext } from './tactical-context.js';

// Mock dependencies
vi.mock('../../core/constants.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../core/constants.js')>();
    return {
        ...actual,
        UNITS: {
            ...actual.UNITS,
            'Trebuchet': { atk: 10, def: 2, rng: 2, move: 1, hp: 15, cost: 50, domain: 'Land', canCaptureCity: false },
            'BowGuard': { atk: 2, def: 1, rng: 2, move: 1, hp: 10, cost: 27, domain: 'Land', canCaptureCity: false },
            'SpearGuard': { atk: 2, def: 2, rng: 1, move: 1, hp: 10, cost: 27, domain: 'Land', canCaptureCity: true },
        }
    };
});

// Helper to create basic state
function createTestState(): GameState {
    const city: City = {
        id: 'city1',
        ownerId: 'enemy',
        name: 'TargetCity',
        coord: { q: 0, r: 0 },
        hp: 10,
        maxHp: 35,
        buildings: []
    } as unknown as City;

    return {
        turn: 10,
        currentPlayerId: 'player1',
        players: [{ id: 'player1' }, { id: 'enemy' }],
        cities: [city],
        units: [],
        map: {
            width: 10,
            height: 10,
            tiles: Array.from({ length: 100 }, (_, i) => ({
                coord: { q: i % 10, r: Math.floor(i / 10) },
                terrain: 'Plains',
                overlays: []
            }))
        },
        diplomacy: {
            player1: { enemy: 'War' },
            enemy: { player1: 'War' }
        },
        visibility: { 'player1': [] },
        revealed: { 'player1': [] },
        contacts: { 'player1': { 'enemy': true }, 'enemy': { 'player1': true } },
        sharedVision: {},
        diplomacyOffers: []
    } as unknown as GameState;
}

function createLookupCacheMock(state: GameState, playerId: string) {
    const tiles = new Map();
    state.map.tiles.forEach(t => tiles.set(`${t.coord.q},${t.coord.r}`, t));

    // Simulate visibility - everything visible for test
    const visibleKeys = new Set<string>();
    state.map.tiles.forEach(t => visibleKeys.add(`${t.coord.q},${t.coord.r}`));

    return {
        unitAt: () => undefined,
        unitByCoordKey: new Map(),
        cityByCoordKey: new Map(),
        visibilitySet: new Map([[playerId, visibleKeys]]),
        tileByKey: tiles
    } as any;
}

describe('runFocusSiegeAndCapture', () => {
    it('should keep Trebuchets (Range 2) at distance 2', () => {
        const state = createTestState();

        // Trebuchet at distance 2 (should stay)
        const trebuchet: Unit = {
            id: 'treb1',
            type: UnitType.Trebuchet,
            ownerId: 'player1',
            coord: { q: 2, r: 0 }, // Distance 2
            movesLeft: 1,
            hp: 15
        } as Unit;

        state.units = [trebuchet];

        const ctx: TacticalContext = {
            enemyIds: new Set(['enemy']),
            memory: { focusCityId: 'city1' },
            createLookupCache: () => createLookupCacheMock(state, 'player1')
        } as any;

        const nextState = runFocusSiegeAndCapture(state, 'player1', ctx);

        // Should not have moved
        const movedTreb = nextState.units.find(u => u.id === 'treb1');
        expect(movedTreb?.coord).toEqual({ q: 2, r: 0 });
    });

    it('should move Trebuchets (Range 2) from distance 3 to distance 2', () => {
        const state = createTestState();

        // Trebuchet at distance 3
        const trebuchet: Unit = {
            id: 'treb1',
            type: UnitType.Trebuchet,
            ownerId: 'player1',
            coord: { q: 3, r: 0 }, // Distance 3
            movesLeft: 1,
            hp: 15
        } as Unit;

        state.units = [trebuchet];

        const ctx: TacticalContext = {
            enemyIds: new Set(['enemy']),
            memory: { focusCityId: 'city1' },
            createLookupCache: () => createLookupCacheMock(state, 'player1')
        } as any;

        const nextState = runFocusSiegeAndCapture(state, 'player1', ctx);

        // Should move closer (to dist 2)
        expect(nextState.units.find(u => u.id === 'treb1')?.coord).not.toEqual({ q: 3, r: 0 });
    });

    it('should keep Capture units (Range 1) moving to distance 1', () => {
        const state = createTestState();

        // SpearGuard at distance 2
        const spear: Unit = {
            id: 'spear1',
            type: UnitType.SpearGuard,
            ownerId: 'player1',
            coord: { q: 2, r: 0 }, // Distance 2
            movesLeft: 1,
            hp: 10
        } as Unit;

        state.units = [spear];

        const ctx: TacticalContext = {
            enemyIds: new Set(['enemy']),
            memory: { focusCityId: 'city1' },
            createLookupCache: () => createLookupCacheMock(state, 'player1')
        } as any;

        const nextState = runFocusSiegeAndCapture(state, 'player1', ctx);

        // Should move closer (to dist 1)
        const movedSpear = nextState.units.find(u => u.id === 'spear1');
        expect(movedSpear?.coord).not.toEqual({ q: 2, r: 0 });

        // Check if it moved to distance 1 (1,0)
        // distance from (0,0) is 1.
        expect(movedSpear).toBeDefined();
        if (movedSpear) {
            expect(movedSpear.coord.q + movedSpear.coord.r).toBeLessThan(2);
        }
    });
});
