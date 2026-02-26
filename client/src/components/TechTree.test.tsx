import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { DiplomacyState, EraId, GameState, PlayerPhase, TerrainType } from "@simple-civ/engine";
import { TutorialProvider } from "../contexts/TutorialContext";
import { TechTree } from "./TechTree";

function createGameState(civName: string): GameState {
    return {
        id: "game-1",
        turn: 1,
        players: [
            {
                id: "p1",
                civName,
                color: "#fff",
                techs: [],
                currentTech: null,
                completedProjects: [],
                isEliminated: false,
                currentEra: EraId.Hearth,
            },
            {
                id: "p2",
                civName: "ForgeClans",
                color: "#0ff",
                techs: [],
                currentTech: null,
                completedProjects: [],
                isEliminated: false,
                currentEra: EraId.Hearth,
            },
        ],
        currentPlayerId: "p1",
        phase: PlayerPhase.Action,
        map: {
            width: 2,
            height: 2,
            tiles: [
                { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
            ],
        },
        units: [],
        cities: [],
        seed: 1,
        visibility: { p1: [], p2: [] },
        revealed: { p1: [], p2: [] },
        diplomacy: {
            p1: { p2: DiplomacyState.Peace },
            p2: { p1: DiplomacyState.Peace },
        },
        sharedVision: {},
        contacts: {
            p1: { p2: true },
            p2: { p1: true },
        },
        diplomacyOffers: [],
        nativeCamps: [],
    };
}

function renderTechTree(civName: string) {
    return render(
        <TutorialProvider>
            <TechTree
                gameState={createGameState(civName)}
                playerId="p1"
                onChooseTech={vi.fn()}
                onClose={vi.fn()}
            />
        </TutorialProvider>
    );
}

function getTechCardText(container: HTMLElement): string {
    return Array.from(container.querySelectorAll(".tech-card"))
        .map(card => card.textContent || "")
        .join(" ");
}

describe("TechTree civ-specific unlock visibility", () => {
    it("hides civ-locked buildings from non-eligible civs", () => {
        const { container } = renderTechTree("ForgeClans");
        const cardText = getTechCardText(container);

        expect(cardText).not.toContain("Bulwark");
        expect(cardText).not.toContain("Jade Granary");
        expect(cardText).not.toMatch(/Titan'?s Core/);
    });

    it("shows civ-locked buildings for eligible civs", () => {
        const scholarCards = getTechCardText(renderTechTree("ScholarKingdoms").container);
        expect(scholarCards).toContain("Bulwark");

        const jadeCards = getTechCardText(renderTechTree("JadeCovenant").container);
        expect(jadeCards).toContain("Jade Granary");

        const aetherianCards = getTechCardText(renderTechTree("AetherianVanguard").container);
        expect(aetherianCards).toMatch(/Titan'?s Core/);
    });
});
