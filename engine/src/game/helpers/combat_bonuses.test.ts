
import { describe, it, expect } from 'vitest';
import { getScholarKingdomsDefenseBonus, getJadeCovenantCombatBonus } from './combat.js';
import { GameState, Player, City, Unit, UnitType } from '../../core/types.js';
import { SCHOLAR_KINGDOMS_DEFENSE_BONUS } from '../../core/constants.js';

describe('Combat Bonuses', () => {
    describe('Scholar Kingdoms Defense', () => {
        it('should return 0 for non-ScholarKingdoms', () => {
            const player = { id: 'p1', civName: 'ForgeClans' } as Player;
            const state = { cities: [], players: [player] } as unknown as GameState;
            const unit = { coord: { q: 0, r: 0 } } as Unit;
            expect(getScholarKingdomsDefenseBonus(state, player, unit)).toBe(0);
        });

        it('should correctly divide bonus among cities', () => {
            const player = { id: 'p1', civName: 'ScholarKingdoms' } as Player;

            // 1 City: +8
            const state1 = {
                cities: [{ id: 'c1', ownerId: 'p1', coord: { q: 0, r: 0 } }],
                players: [player]
            } as unknown as GameState;
            // Unit at 0,0 (dist 0)
            const unit1 = { coord: { q: 0, r: 0 } } as Unit;

            // Ensure constant is 8
            expect(SCHOLAR_KINGDOMS_DEFENSE_BONUS).toBe(8);

            expect(getScholarKingdomsDefenseBonus(state1, player, unit1)).toBe(8);

            // 2 Cities: +4 each
            const state2 = {
                cities: [
                    { id: 'c1', ownerId: 'p1', coord: { q: 0, r: 0 } },
                    { id: 'c2', ownerId: 'p1', coord: { q: 10, r: 10 } }
                ],
                players: [player]
            } as unknown as GameState;
            // Unit near city 1
            expect(getScholarKingdomsDefenseBonus(state2, player, unit1)).toBe(4);

            // 4 Cities: +2 each
            const state4 = {
                cities: [
                    { id: 'c1', ownerId: 'p1', coord: { q: 0, r: 0 } },
                    { id: 'c2', ownerId: 'p1', coord: { q: 10, r: 10 } },
                    { id: 'c3', ownerId: 'p1', coord: { q: 20, r: 20 } },
                    { id: 'c4', ownerId: 'p1', coord: { q: 30, r: 30 } }
                ],
                players: [player]
            } as unknown as GameState;
            expect(getScholarKingdomsDefenseBonus(state4, player, unit1)).toBe(2);
        });

        it('should verify bonus radius', () => {
            const player = { id: 'p1', civName: 'ScholarKingdoms' } as Player;
            const state = {
                cities: [{ id: 'c1', ownerId: 'p1', coord: { q: 0, r: 0 } }],
                players: [player]
            } as unknown as GameState;

            // At radius 1 (adjacent) -> Should get bonus
            const unitIn = { coord: { q: 0, r: 1 } } as Unit;
            expect(getScholarKingdomsDefenseBonus(state, player, unitIn)).toBe(8);

            // At radius 2 -> Should NOT get bonus (default radius is 1)
            const unitOut = { coord: { q: 0, r: 2 } } as Unit;
            expect(getScholarKingdomsDefenseBonus(state, player, unitOut)).toBe(0);
        });
    });
});
