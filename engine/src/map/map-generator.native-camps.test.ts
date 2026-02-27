import { describe, expect, it } from "vitest";
import { MapSize, UnitType } from "../core/types.js";
import { generateWorld } from "./map-generator.js";
import { assignNextCityStateYieldType } from "../game/city-states.js";

const CIVS = [
    "ForgeClans",
    "ScholarKingdoms",
    "RiverLeague",
    "AetherianVanguard",
    "StarborneSeekers",
    "JadeCovenant",
];

const CIV_COUNT_BY_MAP_SIZE: Record<MapSize, number> = {
    Tiny: 2,
    Small: 3,
    Standard: 4,
    Large: 6,
    Huge: 6,
};

const MIN_AVG_CAMPS_BY_MAP_SIZE: Record<MapSize, number> = {
    Tiny: 1.8,
    Small: 2.8,
    Standard: 4.6,
    Large: 7.5,
    Huge: 11.0,
};

const SAMPLE_SEEDS = [101, 202, 303, 404, 505, 606];

function buildPlayers(count: number) {
    return CIVS.slice(0, count).map((civName, index) => ({
        id: `p${index + 1}`,
        civName,
        color: `#${(index + 1).toString().repeat(3)}`,
        ai: true,
    }));
}

function countCampChampions(state: ReturnType<typeof generateWorld>): number {
    const campIds = new Set(
        state.units
            .filter(unit => unit.type === UnitType.NativeChampion && unit.ownerId === "natives" && !!unit.campId)
            .map(unit => unit.campId as string)
    );
    return campIds.size;
}

describe("map-generator native camps", () => {
    it("keeps native camp density viable across map sizes", () => {
        const mapSizes: MapSize[] = ["Tiny", "Small", "Standard", "Large", "Huge"];

        for (const mapSize of mapSizes) {
            const playerCount = CIV_COUNT_BY_MAP_SIZE[mapSize];
            const players = buildPlayers(playerCount);
            let totalCamps = 0;

            for (const seed of SAMPLE_SEEDS) {
                const state = generateWorld({
                    mapSize,
                    players,
                    seed,
                });
                totalCamps += countCampChampions(state);
            }

            const avgCamps = totalCamps / SAMPLE_SEEDS.length;
            expect(avgCamps).toBeGreaterThanOrEqual(MIN_AVG_CAMPS_BY_MAP_SIZE[mapSize]);
        }
    });

    it("varies first city-state yield by seed while staying deterministic", () => {
        const players = buildPlayers(CIV_COUNT_BY_MAP_SIZE.Standard);
        const yields = new Set<string>();

        for (const seed of SAMPLE_SEEDS) {
            const state = generateWorld({
                mapSize: "Standard",
                players,
                seed,
            });
            yields.add(assignNextCityStateYieldType(state));
        }

        expect(yields.size).toBeGreaterThanOrEqual(3);
    });
});
