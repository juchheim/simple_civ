import { describe, it, expect, beforeEach } from 'vitest';
import { generateWorld } from '../../../map/map-generator.js';
import { DiplomacyState, GameState, UnitType, UnitState, TerrainType } from '../../../core/types.js';
import { titanRampage } from './titan.js';
import { UNITS } from '../../../core/constants.js';

function createTestTile(coord: { q: number; r: number }, ownerId?: string) {
    return {
        coord,
        terrain: TerrainType.Plains,
        overlays: [],
        ownerId
    };
}

function createTestCity(ownerId: string, coord: { q: number; r: number }) {
    return {
        id: `city_${coord.q}_${coord.r}`,
        name: 'Test City',
        ownerId,
        coord,
        pop: 1,
        buildings: [],
        hp: 100,
        maxHp: 100,
        isCapital: false,
        storedFood: 0,
        storedProduction: 0,
        workedTiles: [],
        buildProgress: 0,
        currentBuild: null,
        hasFiredThisTurn: false,
        milestones: []
    };
}

function createTestUnit(ownerId: string, type: UnitType, coord: { q: number; r: number }) {
    return {
        id: `u_${ownerId}_${coord.q}_${coord.r}_${type}`,
        type,
        ownerId,
        coord,
        hp: UNITS[type].hp,
        maxHp: UNITS[type].hp,
        movesLeft: UNITS[type].move,
        state: UnitState.Normal,
        hasAttacked: false
    };
}

describe('Titan Leash Logic', () => {
    let state: GameState;
    const PID = 'p1';
    const EID = 'p2';

    beforeEach(() => {
        state = generateWorld({ mapSize: 'Small', players: [{ id: PID, civName: 'AetherianVanguard', color: 'red' }, { id: EID, civName: 'RiverLeague', color: 'blue' }] });
        state.map.tiles = [];
        state.units = [];
        state.cities = [];
        // Create a 20x20 generic map
        state.map.width = 20;
        state.map.height = 20;
        for (let q = 0; q < 20; q++) {
            for (let r = 0; r < 20; r++) {
                state.map.tiles.push(createTestTile({ q, r }, PID));
            }
        }

        // War setup
        state.diplomacy[PID] = { [EID]: DiplomacyState.War };
        state.diplomacy[EID] = { [PID]: DiplomacyState.War };
    });

    it('should wait (leash) when army is far away', () => {
        // Titan at 0,0
        const titan = createTestUnit(PID, UnitType.Titan, { q: 0, r: 0 });
        state.units.push(titan);

        // Target City at 0,10 (Far)
        const targetCity = createTestCity(EID, { q: 0, r: 10 });
        state.cities.push(targetCity);

        // Army at 10,10 (Far from Titan, but existence means totalMilitary > 0)
        // 4 Units exist, so requiredSupport = 4
        for (let i = 0; i < 4; i++) {
            state.units.push(createTestUnit(PID, UnitType.SpearGuard, { q: 10, r: 10 + i }));
        }

        // Run Titan AI
        const nextState = titanRampage(state, PID);
        const nextTitan = nextState.units.find(u => u.id === titan.id);

        // Should NOT have moved (Leashed)
        expect(nextTitan?.coord).toEqual({ q: 0, r: 0 });
        // movesLeft should still be 2 because we 'break' the loop, acting as end of turn for unit
        // Or if the loop breaks, the unit just sits there.
    });

    it('should move when army is nearby', () => {
        // Titan at 0,0
        const titan = createTestUnit(PID, UnitType.Titan, { q: 0, r: 0 });
        state.units.push(titan);

        // Target City at 0,10
        const targetCity = createTestCity(EID, { q: 0, r: 10 });
        state.cities.push(targetCity);

        // Army at 1,0..1,3 (Nearby but NOT blocking path 0,0 -> 0,1)
        for (let i = 0; i < 4; i++) {
            state.units.push(createTestUnit(PID, UnitType.SpearGuard, { q: 1, r: i }));
        }

        const nextState = titanRampage(state, PID);
        const nextTitan = nextState.units.find(u => u.id === titan.id);

        // Should have moved towards 0,10
        // Path from 0,0 to 0,10 goes 0,1 -> 0,2 etc.
        // Neighbors of 0,0 includes 0,1. 
        // 0,1 is occupied by friendly, so Titan pathfinder might go around or through friendly?
        // Standard pathfinding allows moving through friendly.
        expect(nextTitan?.coord).not.toEqual({ q: 0, r: 0 });
    });

    it('should move when army is depleted (no units exist)', () => {
        // Titan at 0,0
        const titan = createTestUnit(PID, UnitType.Titan, { q: 0, r: 0 });
        state.units.push(titan);

        // Target City at 0,10
        const targetCity = createTestCity(EID, { q: 0, r: 10 });
        state.cities.push(targetCity);

        // NO ARMY
        // totalMilitary = 0. requiredSupport = 0. nearbySupport = 0.
        // 0 < 0 is False. So Leash condition fails -> Titan Moves.

        const nextState = titanRampage(state, PID);
        const nextTitan = nextState.units.find(u => u.id === titan.id);

        expect(nextTitan?.coord).not.toEqual({ q: 0, r: 0 });
    });

    it('should ignore leash when close to target', () => {
        // Titan at 0,8
        const titan = createTestUnit(PID, UnitType.Titan, { q: 0, r: 8 });
        state.units.push(titan);

        // Target City at 0,10 (Distance 2)
        const targetCity = createTestCity(EID, { q: 0, r: 10 });
        state.cities.push(targetCity);

        // Army Far Away
        for (let i = 0; i < 4; i++) {
            state.units.push(createTestUnit(PID, UnitType.SpearGuard, { q: 10, r: 10 + i }));
        }

        // logic: if (!canCaptureNow && distToTarget > 2)
        // dist is 2. So condition is false. Leash ignored.

        const nextState = titanRampage(state, PID);
        const nextTitan = nextState.units.find(u => u.id === titan.id);

        expect(nextTitan?.coord).not.toEqual({ q: 0, r: 8 });
    });

    // NOTE: TitanStep event emission was removed from titanRampage() for performance.
    // TitanStep events are now only tracked in parallel-analysis.ts when SIM_LOG_TITAN_STEPS=true.
});
