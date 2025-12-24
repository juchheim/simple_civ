
import { describe, it, expect } from 'vitest';
import { GameState, PlayerPhase, HistoryEventType, DiplomacyState } from '../../core/types';
import { handleProposePeace, handleSetDiplomacy } from './diplomacy';
import { disableSharedVision, canDeclareWar, getTurnsUntilWarAllowed } from '../helpers/diplomacy';
import { MIN_PEACE_DURATION } from '../../core/constants';

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
            },
            nativeCamps: []
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

describe('Peace Treaty Cooldown', () => {
    function createBaseState(turn: number): GameState {
        return {
            id: 'test_game',
            turn,
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
                'p1': { 'p2': DiplomacyState.Peace },
                'p2': { 'p1': DiplomacyState.Peace }
            } as any,
            diplomacyOffers: [],
            sharedVision: {},
            contacts: {
                'p1': { 'p2': true },
                'p2': { 'p1': true }
            },
            history: {
                events: [],
                playerStats: {},
                playerFog: {}
            },
            nativeCamps: []
        };
    }

    it('should block war declaration during peace cooldown (less than 15 turns)', () => {
        const state = createBaseState(20);
        // Peace was established on turn 10, now it's turn 20 (10 turns since peace)
        state.diplomacyChangeTurn = {
            'p1': { 'p2': 10 },
            'p2': { 'p1': 10 }
        };

        // canDeclareWar should return false (only 10 turns passed, need 15)
        expect(canDeclareWar(state, 'p1', 'p2')).toBe(false);
        expect(getTurnsUntilWarAllowed(state, 'p1', 'p2')).toBe(5);

        // handleSetDiplomacy should throw an error
        expect(() => {
            handleSetDiplomacy(state, { type: 'SetDiplomacy', playerId: 'p1', targetPlayerId: 'p2', state: DiplomacyState.War });
        }).toThrow(/Cannot declare war: peace treaty requires 15 turns/);
    });

    it('should allow war declaration after peace cooldown expires (15+ turns)', () => {
        const state = createBaseState(30);
        // Peace was established on turn 10, now it's turn 30 (20 turns since peace)
        state.diplomacyChangeTurn = {
            'p1': { 'p2': 10 },
            'p2': { 'p1': 10 }
        };

        // canDeclareWar should return true (20 turns passed)
        expect(canDeclareWar(state, 'p1', 'p2')).toBe(true);
        expect(getTurnsUntilWarAllowed(state, 'p1', 'p2')).toBe(0);

        // handleSetDiplomacy should succeed
        const newState = handleSetDiplomacy(state, { type: 'SetDiplomacy', playerId: 'p1', targetPlayerId: 'p2', state: DiplomacyState.War });
        expect(newState.diplomacy['p1']['p2']).toBe(DiplomacyState.War);
    });

    it('should allow war declaration exactly at 15 turn boundary', () => {
        const state = createBaseState(25);
        // Peace was established on turn 10, now it's turn 25 (exactly 15 turns)
        state.diplomacyChangeTurn = {
            'p1': { 'p2': 10 },
            'p2': { 'p1': 10 }
        };

        // canDeclareWar should return true (exactly 15 turns passed)
        expect(canDeclareWar(state, 'p1', 'p2')).toBe(true);
        expect(getTurnsUntilWarAllowed(state, 'p1', 'p2')).toBe(0);
    });

    it('should allow war declaration if no diplomacyChangeTurn record exists (initial contact)', () => {
        const state = createBaseState(10);
        // No diplomacyChangeTurn record - this means peace since game start
        state.diplomacyChangeTurn = undefined;

        // canDeclareWar should return true (no treaty was signed)
        expect(canDeclareWar(state, 'p1', 'p2')).toBe(true);
    });

    it('should allow re-declaring war if already at war', () => {
        const state = createBaseState(20);
        state.diplomacy = {
            'p1': { 'p2': DiplomacyState.War },
            'p2': { 'p1': DiplomacyState.War }
        } as any;
        // War started on turn 15, now turn 20
        state.diplomacyChangeTurn = {
            'p1': { 'p2': 15 },
            'p2': { 'p1': 15 }
        };

        // canDeclareWar should return true (already at war)
        expect(canDeclareWar(state, 'p1', 'p2')).toBe(true);
    });
});
