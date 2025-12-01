import { describe, it, expect, beforeEach } from 'vitest';
import { GameState, UnitType, UnitState, TerrainType } from '../core/types.js';
import { handleSetAutoExplore, handleClearAutoExplore, handleMoveUnit } from './actions/units.js';
import { advancePlayerTurn } from './turn-lifecycle.js';
import { generateWorld } from '../map/map-generator.js';

describe('Auto Explore', () => {
    let state: GameState;
    const playerId = 'p1';

    beforeEach(() => {
        state = generateWorld({ mapSize: "Tiny", players: [{ id: playerId, civName: 'TestCiv', color: '#000000' }] });
        // Setup a simple map with a scout
        state.currentPlayerId = playerId;
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
            { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
            { coord: { q: 0, r: 1 }, terrain: TerrainType.Plains, overlays: [] }, // Adjacent
            { coord: { q: 0, r: 2 }, terrain: TerrainType.Plains, overlays: [] }, // Farther
            { coord: { q: 0, r: 3 }, terrain: TerrainType.Plains, overlays: [] }, // Dist 3 (visible)
            { coord: { q: 0, r: 4 }, terrain: TerrainType.Plains, overlays: [] }, // Dist 4 (hidden)
            { coord: { q: 0, r: 5 }, terrain: TerrainType.Plains, overlays: [] },
            { coord: { q: 0, r: 6 }, terrain: TerrainType.Plains, overlays: [] },
        ];
        state.revealed = { [playerId]: ['0,0'] }; // Only start revealed
        state.visibility = { [playerId]: ['0,0'] };
    });

    it('should set isAutoExploring flag', () => {
        state = handleSetAutoExplore(state, { type: 'SetAutoExplore', playerId, unitId: 'u1' });
        const unit = state.units.find(u => u.id === 'u1');
        expect(unit?.isAutoExploring).toBe(true);
    });

    it('should clear isAutoExploring flag', () => {
        state = handleSetAutoExplore(state, { type: 'SetAutoExplore', playerId, unitId: 'u1' });
        state = handleClearAutoExplore(state, { type: 'ClearAutoExplore', playerId, unitId: 'u1' });
        const unit = state.units.find(u => u.id === 'u1');
        expect(unit?.isAutoExploring).toBe(false);
    });

    it('should automatically pick a target and move towards it immediately', () => {
        // Enable auto explore
        state = handleSetAutoExplore(state, { type: 'SetAutoExplore', playerId, unitId: 'u1' });

        const unit = state.units.find(u => u.id === 'u1');
        expect(unit?.isAutoExploring).toBe(true);

        // Should have moved immediately!
        // It likely moved to 0,1 (closest unexplored) and stopped because target reached
        expect(unit?.coord).not.toEqual({ q: 0, r: 0 });
        expect(state.revealed[playerId]).toContain('0,1');
    });

    it('should continue exploring on next turn', () => {
        // Enable auto explore
        state = handleSetAutoExplore(state, { type: 'SetAutoExplore', playerId, unitId: 'u1' });

        // Advance turn
        state = advancePlayerTurn(state, playerId);

        const unit = state.units.find(u => u.id === 'u1');
        // Should have continued moving
        // Initial move to 0,1. Next turn moves to 0,2 and maybe 0,3
        expect(unit?.coord.r).toBeGreaterThan(1);
    });

    it('should stop auto-exploring when manually moved', () => {
        // Set moves to 0 so it doesn't move immediately
        const u = state.units.find(u => u.id === 'u1');
        if (u) u.movesLeft = 0;

        state = handleSetAutoExplore(state, { type: 'SetAutoExplore', playerId, unitId: 'u1' });

        // Give moves back
        if (u) u.movesLeft = 1;

        state = handleMoveUnit(state, {
            type: 'MoveUnit',
            playerId,
            unitId: 'u1',
            to: { q: 0, r: 1 }
        });

        const unit = state.units.find(u => u.id === 'u1');
        expect(unit?.isAutoExploring).toBe(false);
    });

    it('should retarget if the closest unexplored tile is unreachable', () => {
        state.map.tiles = [
            { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
            { coord: { q: 1, r: 0 }, terrain: TerrainType.DeepSea, overlays: [] },
            { coord: { q: 2, r: 0 }, terrain: TerrainType.DeepSea, overlays: [] },
            { coord: { q: 3, r: 0 }, terrain: TerrainType.DeepSea, overlays: [] },
            { coord: { q: 5, r: 0 }, terrain: TerrainType.Plains, overlays: [] }, // Hidden but unreachable for land units (Dist 5)
            { coord: { q: 0, r: 1 }, terrain: TerrainType.Plains, overlays: [] },
            { coord: { q: 0, r: 2 }, terrain: TerrainType.Plains, overlays: [] },
            { coord: { q: 0, r: 3 }, terrain: TerrainType.Plains, overlays: [] },
            { coord: { q: 0, r: 4 }, terrain: TerrainType.Plains, overlays: [] }, // Hidden but reachable (Dist 4)
        ];
        state.revealed = { [playerId]: ['0,0', '0,1', '0,2', '0,3'] };
        state.visibility = { [playerId]: ['0,0', '0,1', '0,2', '0,3'] };

        state = handleSetAutoExplore(state, { type: 'SetAutoExplore', playerId, unitId: 'u1' });

        state = advancePlayerTurn(state, playerId);

        const unit = state.units.find(u => u.id === 'u1');
        expect(unit?.isAutoExploring).toBe(true);
        expect(unit?.coord).toEqual({ q: 0, r: 2 }); // Moved toward the reachable target
        // Target might be cleared or updated, but as long as we moved correctly (not towards 5,0), it's fine.
        expect(unit?.autoMoveTarget).not.toEqual({ q: 5, r: 0 });
    });
});
