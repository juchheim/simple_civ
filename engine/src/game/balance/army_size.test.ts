
import { describe, it, expect } from 'vitest';
import { GameState } from "../../core/types.js";
import { getAiProfileV2 } from "../ai2/rules.js";

function createMockState(civName: string): GameState {
    return {
        turn: 1,
        players: [{ id: "p1", civName }],
        cities: [],
        units: [],
        map: { width: 10, height: 10, tiles: [] },
        diplomacy: {},
    } as unknown as GameState;
}

describe('Peacetime Army Size Checks', () => {
    it('should have armyPerCity = 2.2 for ScholarKingdoms', () => {
        const state = createMockState("ScholarKingdoms");
        const profile = getAiProfileV2(state, "p1");
        expect(profile.build.armyPerCity).toBe(2.2);
    });

    it('should have armyPerCity = 2.5 for StarborneSeekers', () => {
        const state = createMockState("StarborneSeekers");
        const profile = getAiProfileV2(state, "p1");
        expect(profile.build.armyPerCity).toBe(2.5);
    });
});
