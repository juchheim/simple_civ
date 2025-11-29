import { describe, it, expect, beforeEach } from 'vitest';
import { GameState, UnitType, UnitState, TerrainType } from '../core/types.js';
import { handleSetAutoExplore } from './actions/units.js';
import { generateWorld } from '../map/map-generator.js';

describe('Auto Explore Terrain', () => {
    let state: GameState;
    const playerId = 'p1';

    beforeEach(() => {
        state = generateWorld({ mapSize: "Tiny", players: [{ id: playerId, civName: 'TestCiv', color: '#000000' }] });
        state.currentPlayerId = playerId;
        state.units = [{
            id: 'u1',
            type: UnitType.Scout, // Moves: 2
            ownerId: playerId,
            coord: { q: 0, r: 0 },
            hp: 10,
            maxHp: 10,
            movesLeft: 1, // Only 1 move left!
            state: UnitState.Normal,
            hasAttacked: false,
        }];
        state.map.tiles = [
            { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [] }, // Cost 1
            { coord: { q: 0, r: 1 }, terrain: TerrainType.Forest, overlays: [] }, // Cost 2 (Hidden)
            { coord: { q: 0, r: 2 }, terrain: TerrainType.Plains, overlays: [] },
        ];
        // Only 0,0 is revealed. 0,1 is hidden.
        state.revealed = { [playerId]: ['0,0'] };
        state.visibility = { [playerId]: ['0,0'] };
    });

    it('should fail to move into hidden high-cost terrain if moves are insufficient', () => {
        // Scout has 1 move left.
        // Target is 0,1 (Forest, Cost 2).
        // Pathfinding sees it as hidden -> Cost 1.
        // Path found.
        // Move execution sees actual Cost 2.
        // Should fail.

        state = handleSetAutoExplore(state, { type: 'SetAutoExplore', playerId, unitId: 'u1' });

        const unit = state.units.find(u => u.id === 'u1');
        expect(unit?.isAutoExploring).toBe(true);

        // Should NOT have moved because cost (2) > movesLeft (1)
        expect(unit?.coord).toEqual({ q: 0, r: 0 });

        // But it should still be auto-exploring (waiting for next turn)
        expect(unit?.isAutoExploring).toBe(true);
        // And it should have a target
        expect(unit?.autoMoveTarget).toBeDefined();
    });
});
