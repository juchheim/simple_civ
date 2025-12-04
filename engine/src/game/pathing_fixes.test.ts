
import { describe, it, expect, beforeEach } from 'vitest';
import { GameState, UnitType, UnitState, TerrainType } from '../core/types.js';
import { handleSetAutoExplore, handleSetAutoMoveTarget } from './actions/units.js';
import { generateWorld } from '../map/map-generator.js';

describe('Pathing Fixes', () => {
    let state: GameState;
    const playerId = 'p1';

    beforeEach(() => {
        state = generateWorld({ mapSize: "Tiny", players: [{ id: playerId, civName: 'TestCiv', color: '#000000' }] });
        state.currentPlayerId = playerId;
    });

    it('Scout should move to coast if unexplored tiles are across water (Frontier Search)', () => {
        // Setup: Scout at 0,0. Water at 1,0. Unexplored land at 4,0 (Dist 4, outside vision 3).
        // Scout cannot enter water.

        state.units = [{
            id: 'u1',
            type: UnitType.Scout,
            ownerId: playerId,
            coord: { q: 0, r: 0 },
            hp: 10,
            maxHp: 10,
            movesLeft: 2,
            state: UnitState.Normal,
            hasAttacked: false,
        }];

        state.map.tiles = [
            { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [] }, // Scout
            { coord: { q: 1, r: 0 }, terrain: TerrainType.DeepSea, overlays: [] }, // Water
            // 2,0 and 3,0 are irrelevant, just need 4,0 to be unexplored
            { coord: { q: 4, r: 0 }, terrain: TerrainType.Plains, overlays: [] }, // Unexplored target

            { coord: { q: 0, r: 1 }, terrain: TerrainType.Plains, overlays: [] }, // Land
            { coord: { q: 1, r: 1 }, terrain: TerrainType.Plains, overlays: [] }, // Land (Closer to 4,0)
        ];

        // Reveal everything except 4,0
        // Scout vision is 3, so it will reveal 0,0 to 3,0 if they exist.
        // But we only defined a few tiles.
        // refreshPlayerVision only reveals tiles that exist in state.map.tiles.
        // So 4,0 will remain unrevealed if it's outside vision.
        // Dist(0,0, 4,0) = 4. > 3. So it's safe.

        state.revealed = { [playerId]: ['0,0', '1,0', '0,1', '1,1'] };

        state = handleSetAutoExplore(state, { type: 'SetAutoExplore', playerId, unitId: 'u1' });

        const unit = state.units.find(u => u.id === 'u1');
        // Should move to 1,1 because it's dist 3 from 4,0.
        // 0,0 is dist 4.
        // 0,1 is dist 4.
        expect(unit?.coord).toEqual({ q: 1, r: 1 });
    });

    it('Unit should move partially if long path is blocked', () => {
        // Unit at 0,0. Target 0,4.
        // Path: 0,0 -> 0,1 -> 0,2 -> 0,3 -> 0,4.
        // Blocker at 0,2 (Friendly unit or mountain or whatever, let's say friendly unit that refuses to swap/move).
        // Actually, friendly units can stack? No, military limit 1.
        // Let's put a friendly military unit at 0,2.

        state.units = [
            {
                id: 'u1',
                type: UnitType.SpearGuard,
                ownerId: playerId,
                coord: { q: 0, r: 0 },
                hp: 10, maxHp: 10, movesLeft: 2, state: UnitState.Normal, hasAttacked: false
            },
            {
                id: 'u2',
                type: UnitType.SpearGuard,
                ownerId: playerId,
                coord: { q: 0, r: 2 },
                hp: 10, maxHp: 10, movesLeft: 0, state: UnitState.Fortified, hasAttacked: false
            }
        ];

        state.map.tiles = [
            { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
            { coord: { q: 0, r: 1 }, terrain: TerrainType.Plains, overlays: [] },
            { coord: { q: 0, r: 2 }, terrain: TerrainType.Plains, overlays: [] },
            { coord: { q: 0, r: 3 }, terrain: TerrainType.Plains, overlays: [] },
            { coord: { q: 0, r: 4 }, terrain: TerrainType.Plains, overlays: [] },
        ];

        state.revealed = { [playerId]: ['0,0', '0,1', '0,2', '0,3', '0,4'] };
        state.visibility = { [playerId]: ['0,0', '0,1', '0,2', '0,3', '0,4'] };

        // Set target to 0,4
        state = handleSetAutoMoveTarget(state, { type: 'SetAutoMoveTarget', playerId, unitId: 'u1', target: { q: 0, r: 4 } });

        // Trigger movement (usually happens in turn loop or when setting target if moves left? No, SetAutoMoveTarget doesn't trigger immediate move in `units.ts`? Let's check.)
        // handleSetAutoMoveTarget just sets the target.
        // We need to call processAutoMovement manually or advance turn.

        processAutoMovement(state, playerId, 'u1');

        const unit = state.units.find(u => u.id === 'u1');

        // Normal pathfinding would fail because 0,2 is blocked.
        // Partial pathing should find that 0,1 is the closest reachable tile to 0,4.
        // So it should move to 0,1.

        expect(unit?.coord).toEqual({ q: 0, r: 1 });

        // And it should still have the target
        expect(unit?.autoMoveTarget).toEqual({ q: 0, r: 4 });
    });
});
