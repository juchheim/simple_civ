
import { describe, it, expect } from 'vitest';
import { GameState, PlayerPhase, HistoryEventType, DiplomacyState } from '../../core/types';
import { handleProposePeace } from './diplomacy';
import { disableSharedVision } from '../helpers/diplomacy';

describe('Diplomacy Action Verification', () => {
    it('should log PeaceMade event when PROPOSING peace matches an existing offer', () => {
        const state: GameState = {
            id: 'test_game',
            turn: 10,
            players: [
                { id: 'p1', civName: 'CivA', techs: [], completedProjects: [], isEliminated: false, currentEra: 'Primitive' } as any,
                { id: 'p2', civName: 'CivB', techs: [], completedProjects: [], isEliminated: false, currentEra: 'Primitive' } as any,
            ],
            currentPlayerId: 'p1',
            phase: PlayerPhase.Action,
            map: { width: 10, height: 10, tiles: [] },
            units: [],
            cities: [],
            seed: 123,
            visibility: {},
            revealed: {},
            diplomacy: {
                'p1': { 'p2': DiplomacyState.War },
                'p2': { 'p1': DiplomacyState.War }
            } as any,
            diplomacyOffers: [
                { from: 'p2', to: 'p1', type: 'Peace' } // p2 already offered peace
            ],
            sharedVision: {},
            contacts: {
                'p1': { 'p2': true },
                'p2': { 'p1': true }
            },
            history: {
                events: [],
                playerStats: {},
                playerFog: {}
            }
        };

        // p1 proposes peace, which should match p2's offer and finalize it
        const newState = handleProposePeace(state, { type: 'ProposePeace', playerId: 'p1', targetPlayerId: 'p2' });

        // Check if peace is established
        expect(newState.diplomacy['p1']['p2']).toBe(DiplomacyState.Peace);

        // CHECK IF EVENT WAS LOGGED
        const peaceEvent = newState.history?.events.find(e => e.type === HistoryEventType.PeaceMade);
        expect(peaceEvent).toBeDefined();
        if (peaceEvent) {
            expect(peaceEvent.playerId).toBe('p1');
            expect(peaceEvent.data.targetId).toBe('p2');
        }
    });
});
