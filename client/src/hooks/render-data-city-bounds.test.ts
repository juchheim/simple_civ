import { describe, expect, it } from "vitest";
import { buildCityBoundsSegments } from "./render-data-city-bounds";

type BoundsEntry = Parameters<typeof buildCityBoundsSegments>[0]["tileRenderData"][number];

const HEX_CORNER_OFFSETS = [
    { x: 10, y: 0 },
    { x: 5, y: 8.66 },
    { x: -5, y: 8.66 },
    { x: -10, y: 0 },
    { x: -5, y: -8.66 },
    { x: 5, y: -8.66 },
];

function makeEntry(overrides: Partial<BoundsEntry>): BoundsEntry {
    return {
        key: "0,0",
        tile: {
            coord: { q: 0, r: 0 },
            ownerId: "p1",
            ownerCityId: "c1",
        },
        position: { x: 0, y: 0 },
        visibility: {
            isVisible: true,
            isFogged: false,
        },
        ...overrides,
    } as BoundsEntry;
}

describe("render-data-city-bounds", () => {
    it("builds six boundary segments for an isolated city tile", () => {
        const tileRenderData = [makeEntry({ key: "0,0" })];
        const tileByKey = new Map<string, BoundsEntry>([["0,0", tileRenderData[0]]]);

        const bounds = buildCityBoundsSegments({
            tileRenderData,
            tileByKey,
            playerColorMap: new Map([["p1", "#ff0000"]]),
            hexCornerOffsets: HEX_CORNER_OFFSETS,
        });

        expect(bounds).toHaveLength(6);
        expect(bounds.every(segment => segment.strokeColor === "#ff0000")).toBe(true);
        expect(bounds.every(segment => segment.isVisible)).toBe(true);
    });

    it("excludes interior edges between adjacent tiles of the same city", () => {
        const tileA = makeEntry({
            key: "0,0",
            tile: { coord: { q: 0, r: 0 }, ownerId: "p1", ownerCityId: "c1" },
            visibility: { isVisible: true, isFogged: false },
        });
        const tileB = makeEntry({
            key: "1,0",
            tile: { coord: { q: 1, r: 0 }, ownerId: "p1", ownerCityId: "c1" },
            position: { x: 20, y: 0 },
            visibility: { isVisible: false, isFogged: true },
        });

        const tileRenderData = [tileA, tileB];
        const tileByKey = new Map<string, BoundsEntry>([
            ["0,0", tileA],
            ["1,0", tileB],
        ]);

        const bounds = buildCityBoundsSegments({
            tileRenderData,
            tileByKey,
            playerColorMap: new Map([["p1", "#ff0000"]]),
            hexCornerOffsets: HEX_CORNER_OFFSETS,
        });

        expect(bounds).toHaveLength(10);
        expect(bounds.some(segment => segment.isFogged)).toBe(true);
        expect(bounds.some(segment => segment.key === "0,0-0")).toBe(false);
        expect(bounds.some(segment => segment.key === "1,0-3")).toBe(false);
    });

    it("ignores shrouded tiles even when they are city owned", () => {
        const shroudedTile = makeEntry({
            visibility: { isVisible: false, isFogged: false },
        });
        const tileRenderData = [shroudedTile];
        const tileByKey = new Map<string, BoundsEntry>([["0,0", shroudedTile]]);

        const bounds = buildCityBoundsSegments({
            tileRenderData,
            tileByKey,
            playerColorMap: new Map([["p1", "#ff0000"]]),
            hexCornerOffsets: HEX_CORNER_OFFSETS,
        });

        expect(bounds).toHaveLength(0);
    });
});
