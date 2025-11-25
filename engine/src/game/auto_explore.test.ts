import { describe, it, expect, beforeEach } from 'vitest';
import { GameState, UnitType, UnitState, PlayerPhase, TerrainType } from '../core/types.js';
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

    it('should automatically pick a target and move towards it', () => {
        // Enable auto explore
        state = handleSetAutoExplore(state, { type: 'SetAutoExplore', playerId, unitId: 'u1' });

        // Advance turn to trigger auto-explore logic
        state = advancePlayerTurn(state, playerId);

        const unit = state.units.find(u => u.id === 'u1');
        expect(unit?.isAutoExploring).toBe(true);
        // Should have moved to 0,2 (Scout has 2 moves)
        expect(unit?.coord).toEqual({ q: 0, r: 2 });
        // Should have revealed 0,1
        expect(state.revealed[playerId]).toContain('0,1');
    });

    it('should stop auto-exploring when manually moved', () => {
        state = handleSetAutoExplore(state, { type: 'SetAutoExplore', playerId, unitId: 'u1' });

        state = handleMoveUnit(state, {
            type: 'MoveUnit',
            playerId,
            unitId: 'u1',
            to: { q: 0, r: 1 }
        });

        const unit = state.units.find(u => u.id === 'u1');
        expect(unit?.isAutoExploring).toBe(false);
    });
});
