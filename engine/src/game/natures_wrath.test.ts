import { describe, it, expect, beforeEach } from 'vitest';
import { GameState, Player, UnitType, UnitState, DiplomacyState } from '../core/types.js';
import { generateWorld } from '../map/map-generator.js';
import { handleFoundCity } from './actions/cities.js';
import { handleEndTurn } from './turn-lifecycle.js';
import { UNITS } from '../core/constants.js';

describe('City Attack / Attrition Reproduction', () => {
    let state: GameState;

    beforeEach(() => {
        state = generateWorld({ mapSize: "Small", players: [{ id: "p1", civName: "A", color: "red" }, { id: "p2", civName: "B", color: "blue" }] });
    });

    it('should NOT deal damage to units near a generic enemy city', () => {
        const p1 = state.players[0];
        const p2 = state.players[1];
        p2.civName = 'SolarDynasty'; // Generic civ

        // Setup War
        state.diplomacy[p1.id][p2.id] = DiplomacyState.War;
        state.diplomacy[p2.id][p1.id] = DiplomacyState.War;

        // P2 founds a city
        const settler = state.units.find(u => u.ownerId === p2.id && u.type === UnitType.Settler);
        if (!settler) throw new Error("No settler for p2");
        state = handleFoundCity(state, { type: 'FoundCity', playerId: p2.id, unitId: settler.id, name: 'EnemyCity' });
        const city = state.cities.find(c => c.ownerId === p2.id);
        if (!city) throw new Error("City not created");

        // Place 3 P1 units adjacent to the city
        const coords = [
            { q: city.coord.q + 1, r: city.coord.r },
            { q: city.coord.q - 1, r: city.coord.r },
            { q: city.coord.q, r: city.coord.r + 1 },
        ];

        coords.forEach((coord, i) => {
            state.units.push({
                id: `u_p1_${i}`,
                type: UnitType.SpearGuard,
                ownerId: p1.id,
                coord: coord,
                hp: UNITS[UnitType.SpearGuard].hp,
                maxHp: UNITS[UnitType.SpearGuard].hp,
                movesLeft: 0,
                state: UnitState.Normal,
                hasAttacked: false,
            });
        });

        // End P1 turn
        state = handleEndTurn(state, { type: 'EndTurn', playerId: p1.id });
        // End P2 turn -> P1 starts turn
        state = handleEndTurn(state, { type: 'EndTurn', playerId: p2.id });

        // Check P1 units HP
        const p1Units = state.units.filter(u => u.ownerId === p1.id && u.type === UnitType.SpearGuard);
        expect(p1Units.length).toBe(3);
        p1Units.forEach(u => {
            expect(u.hp).toBe(UNITS[UnitType.SpearGuard].hp); // Should be full HP
        });
    });

    it('should deal damage to units near a Jade Covenant city (Nature\'s Wrath)', () => {
        const p1 = state.players[0];
        const p2 = state.players[1];
        p2.civName = 'JadeCovenant'; // Attrition civ

        // Setup War
        state.diplomacy[p1.id][p2.id] = DiplomacyState.War;
        state.diplomacy[p2.id][p1.id] = DiplomacyState.War;

        // P2 founds a city
        const settler = state.units.find(u => u.ownerId === p2.id && u.type === UnitType.Settler);
        if (!settler) throw new Error("No settler for p2");
        state = handleFoundCity(state, { type: 'FoundCity', playerId: p2.id, unitId: settler.id, name: 'JadeCity' });
        const city = state.cities.find(c => c.ownerId === p2.id);
        if (!city) throw new Error("City not created");

        // Place 3 P1 units adjacent to the city
        const coords = [
            { q: city.coord.q + 1, r: city.coord.r },
            { q: city.coord.q - 1, r: city.coord.r },
            { q: city.coord.q, r: city.coord.r + 1 },
        ];

        coords.forEach((coord, i) => {
            state.units.push({
                id: `u_p1_${i}`,
                type: UnitType.SpearGuard,
                ownerId: p1.id,
                coord: coord,
                hp: UNITS[UnitType.SpearGuard].hp,
                maxHp: UNITS[UnitType.SpearGuard].hp,
                movesLeft: 0,
                state: UnitState.Normal,
                hasAttacked: false,
            });
        });

        // End P1 turn
        state = handleEndTurn(state, { type: 'EndTurn', playerId: p1.id });
        // End P2 turn -> P1 starts turn -> Attrition applied
        state = handleEndTurn(state, { type: 'EndTurn', playerId: p2.id });

        // Check P1 units HP
        const p1Units = state.units.filter(u => u.ownerId === p1.id && u.type === UnitType.SpearGuard);
        expect(p1Units.length).toBe(3);
        p1Units.forEach(u => {
            expect(u.hp).toBe(UNITS[UnitType.SpearGuard].hp - 1); // Should take 1 damage
        });
    });

    it('should NOT deal extra damage from garrison if not attacked', () => {
        const p1 = state.players[0];
        const p2 = state.players[1];
        p2.civName = 'JadeCovenant';

        // Setup War
        state.diplomacy[p1.id][p2.id] = DiplomacyState.War;
        state.diplomacy[p2.id][p1.id] = DiplomacyState.War;

        // P2 founds a city
        const settler = state.units.find(u => u.ownerId === p2.id && u.type === UnitType.Settler);
        if (!settler) throw new Error("No settler for p2");
        state = handleFoundCity(state, { type: 'FoundCity', playerId: p2.id, unitId: settler.id, name: 'GarrisonCity' });
        const city = state.cities.find(c => c.ownerId === p2.id);
        if (!city) throw new Error("City not created");

        // Add a Garrisoned BowGuard for P2
        state.units.push({
            id: 'u_p2_garrison',
            type: UnitType.BowGuard,
            ownerId: p2.id,
            coord: city.coord,
            hp: UNITS[UnitType.BowGuard].hp,
            maxHp: UNITS[UnitType.BowGuard].hp,
            movesLeft: 0,
            state: UnitState.Garrisoned,
            hasAttacked: false,
        });

        // Place a P1 unit adjacent to the city
        const targetCoord = { q: city.coord.q + 1, r: city.coord.r };
        state.units.push({
            id: 'u_p1_target',
            type: UnitType.SpearGuard,
            ownerId: p1.id,
            coord: targetCoord,
            hp: UNITS[UnitType.SpearGuard].hp,
            maxHp: UNITS[UnitType.SpearGuard].hp,
            movesLeft: 0,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        // End P1 turn
        state = handleEndTurn(state, { type: 'EndTurn', playerId: p1.id });
        // End P2 turn -> P1 starts turn -> Attrition applied
        state = handleEndTurn(state, { type: 'EndTurn', playerId: p2.id });

        // Check P1 unit HP
        const target = state.units.find(u => u.id === 'u_p1_target');
        if (!target) throw new Error("Target unit died");

        // Expected: MaxHP - 1 (Nature's Wrath)
        // If it takes more, then the garrison attacked.
        expect(target.hp).toBe(UNITS[UnitType.SpearGuard].hp - 1);
    });
});
