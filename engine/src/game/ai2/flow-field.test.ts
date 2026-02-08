import { describe, expect, it } from "vitest";
import { buildFlowField, makeInfluenceBias } from "./flow-field.js";
import { GameState, TerrainType } from "../../core/types.js";
import { hexDistance } from "../../core/hex.js";

function makeState(): GameState {
    const tiles = [];
    for (let r = 0; r < 3; r++) {
        for (let q = 0; q < 3; q++) {
            tiles.push({
                coord: { q, r },
                terrain: TerrainType.Plains,
                overlays: [],
            });
        }
    }

    return {
        id: "test",
        turn: 1,
        players: [],
        currentPlayerId: "p1",
        map: { width: 3, height: 3, tiles },
        units: [],
        cities: [],
        visibility: {},
    } as GameState;
}

describe("FlowField", () => {
    it("computes uniform costs matching hex distance on flat terrain", () => {
        const state = makeState();
        const target = { q: 2, r: 2 };
        const flow = buildFlowField(state, target);

        const origin = { q: 0, r: 0 };
        const expected = hexDistance(origin, target);
        expect(flow.getCost(origin)).toBe(expected);
        expect(flow.getCost(target)).toBe(0);
    });

    it("treats impassable tiles as unreachable", () => {
        const state = makeState();
        const mountain = state.map.tiles.find(t => t.coord.q === 1 && t.coord.r === 1);
        if (mountain) mountain.terrain = TerrainType.Mountain;

        const flow = buildFlowField(state, { q: 2, r: 2 });
        expect(flow.getCost({ q: 1, r: 1 })).toBe(Number.POSITIVE_INFINITY);
    });

    it("applies cost bias when provided", () => {
        const state = makeState();
        const biasCoord = { q: 1, r: 1 };
        const flow = buildFlowField(state, { q: 2, r: 2 }, {
            costBias: (coord) => (coord.q === biasCoord.q && coord.r === biasCoord.r ? 3 : 0),
        });

        const biasedCost = flow.getCost(biasCoord);
        expect(biasedCost).toBeGreaterThan(1);
    });

    it("creates an influence bias function when layers provided", () => {
        const state = makeState();
        const flow = buildFlowField(state, { q: 2, r: 2 });
        const bias = makeInfluenceBias({
            threat: flow,
            pressure: flow,
            control: flow,
        });

        expect(bias).toBeTypeOf("function");
        if (bias) {
            expect(bias({ q: 0, r: 0 })).toBeTypeOf("number");
        }
    });
});
