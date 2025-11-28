import { describe, it, expect } from 'vitest';
import { TerrainType, UnitType } from '../core/types';
import { generateWorld } from '../map/map-generator';
import { advancePlayerTurn } from './turn-lifecycle';
import { handleSetAutoMoveTarget } from './actions/units';

describe('Auto Movement Persistence', () => {
    it('should continue moving across multiple turns', () => {
        // 1. Setup minimal state
        const state = generateWorld({
            mapSize: 'Tiny',
            seed: 12345,
            players: [{ id: 'p1', civName: 'ForgeClans', color: '#ff0000' }]
        });
        const player = state.players[0];
        const unit = state.units.find(u => u.ownerId === player.id && u.type === UnitType.Scout);

        if (!unit) throw new Error("No scout found");

        // Move unit to a clear area (0,0 is usually safe or near start)
        // Let's assume start position is valid.
        const start = { ...unit.coord };

        // Pick a target far away
        const targetTile = state.map.tiles.find(t => {
            const dist = Math.max(Math.abs(t.coord.q - start.q), Math.abs(t.coord.r - start.r), Math.abs(t.coord.q + t.coord.r - start.q - start.r));
            return dist >= 4;
        });

        if (!targetTile) throw new Error("Map too small for test");
        const target = targetTile.coord;

        // Let's find a valid target using BFS or just picking one
        // We'll just force a target and hope it's valid terrain.
        // Or better, we mock the map to be all plains.
        state.map.tiles.forEach(t => t.terrain = TerrainType.Plains); // Flatten the world

        // Set target
        handleSetAutoMoveTarget(state, {
            type: 'SetAutoMoveTarget',
            playerId: player.id,
            unitId: unit.id,
            target: target
        });

        expect(unit.autoMoveTarget).toBeDefined();

        // 2. Advance Turn 1 (Simulate End Turn -> Next Turn)
        // advancePlayerTurn resets moves and processes auto-move
        advancePlayerTurn(state, player.id);

        // Scout should have moved 3 tiles
        // Dist should be 3 (6 - 3)
        // Or at least it should have moved SOMEWHERE.
        expect(unit.coord).not.toEqual(start);
        expect(unit.movesLeft).toBe(0); // Used all moves
        expect(unit.autoMoveTarget).toBeDefined(); // Should still have target

        const posAfterTurn1 = { ...unit.coord };

        // 3. Advance Turn 2
        advancePlayerTurn(state, player.id);

        // Scout should have moved again
        expect(unit.coord).not.toEqual(posAfterTurn1);
        expect(unit.movesLeft).toBe(0); // Used all moves

        // Should be at target now?
        // If dist was 6, and moves 3+3=6.
        // It might have reached.
    });
});
