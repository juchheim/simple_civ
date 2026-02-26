import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MAX_CIVS_BY_MAP_SIZE } from "@simple-civ/engine";
import { useGameSetupConfig } from "./useGameSetupConfig";

describe("useGameSetupConfig", () => {
    it("initializes with the current setup defaults", () => {
        const { result } = renderHook(() => useGameSetupConfig());

        expect(result.current.selectedCiv).toBe("ForgeClans");
        expect(result.current.selectedMapSize).toBe("Standard");
        expect(result.current.numCivs).toBe(4);
        expect(result.current.selectedDifficulty).toBe("Normal");
    });

    it("clamps civilization count when map size max is lower", async () => {
        const { result } = renderHook(() => useGameSetupConfig());

        act(() => {
            result.current.setNumCivs(6);
            result.current.setSelectedMapSize("Tiny");
        });

        await waitFor(() => {
            expect(result.current.numCivs).toBe(MAX_CIVS_BY_MAP_SIZE.Tiny);
        });
    });

    it("builds a deterministic seeded player list with unique civs/colors", () => {
        const { result } = renderHook(() => useGameSetupConfig());

        const firstBuild = result.current.buildPlayers(123);
        const secondBuild = result.current.buildPlayers(123);

        expect(secondBuild).toEqual(firstBuild);
        expect(firstBuild).toHaveLength(result.current.numCivs);
        expect(firstBuild[0]).toMatchObject({
            id: "p1",
            civName: result.current.selectedCiv,
        });
        expect(firstBuild.slice(1).every(player => player.ai === true)).toBe(true);
        expect(new Set(firstBuild.map(player => player.civName)).size).toBe(firstBuild.length);
        expect(new Set(firstBuild.map(player => player.color.toLowerCase())).size).toBe(firstBuild.length);
    });
});
