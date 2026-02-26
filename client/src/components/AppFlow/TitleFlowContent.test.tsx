import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TitleFlowContent } from "./TitleFlowContent";

vi.mock("../TitleScreen", () => ({
    TitleScreen: ({ onNewGame, onLoadGame }: { onNewGame: () => void; onLoadGame: () => void }) => (
        <div>
            <button onClick={onNewGame}>title-new</button>
            <button onClick={onLoadGame}>title-load</button>
        </div>
    ),
}));

vi.mock("./CivSelectionScreen", () => ({
    CivSelectionScreen: ({
        onStartGame,
        onBack,
        onSelectCiv,
        onSelectMapSize,
        onSelectNumCivs,
        onSelectDifficulty,
    }: {
        onStartGame: () => void;
        onBack: () => void;
        onSelectCiv: (civId: any) => void;
        onSelectMapSize: (mapSize: any) => void;
        onSelectNumCivs: (numCivs: number) => void;
        onSelectDifficulty: (difficulty: any) => void;
    }) => (
        <div>
            <button onClick={onStartGame}>civ-start</button>
            <button onClick={onBack}>civ-back</button>
            <button onClick={() => onSelectCiv("ScholarKingdoms")}>pick-civ</button>
            <button onClick={() => onSelectMapSize("Large")}>pick-map</button>
            <button onClick={() => onSelectNumCivs(6)}>pick-count</button>
            <button onClick={() => onSelectDifficulty("Hard")}>pick-difficulty</button>
        </div>
    ),
}));

function baseProps(overrides: Partial<React.ComponentProps<typeof TitleFlowContent>> = {}): React.ComponentProps<typeof TitleFlowContent> {
    return {
        showTitleScreen: true,
        onShowSetup: vi.fn(),
        onLoadGame: vi.fn(),
        selectedCiv: "ForgeClans",
        selectedMapSize: "Standard",
        numCivs: 4,
        selectedDifficulty: "Normal",
        onSelectCiv: vi.fn(),
        onSelectMapSize: vi.fn(),
        onSelectNumCivs: vi.fn(),
        onSelectDifficulty: vi.fn(),
        onStartGame: vi.fn(),
        onBack: vi.fn(),
        ...overrides,
    };
}

describe("TitleFlowContent", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders title screen branch and forwards actions", () => {
        const props = baseProps({ showTitleScreen: true });
        render(<TitleFlowContent {...props} />);

        fireEvent.click(screen.getByText("title-new"));
        fireEvent.click(screen.getByText("title-load"));

        expect(props.onShowSetup).toHaveBeenCalled();
        expect(props.onLoadGame).toHaveBeenCalled();
    });

    it("renders civ setup branch and forwards actions", () => {
        const props = baseProps({ showTitleScreen: false });
        render(<TitleFlowContent {...props} />);

        fireEvent.click(screen.getByText("civ-start"));
        fireEvent.click(screen.getByText("civ-back"));
        fireEvent.click(screen.getByText("pick-civ"));
        fireEvent.click(screen.getByText("pick-map"));
        fireEvent.click(screen.getByText("pick-count"));
        fireEvent.click(screen.getByText("pick-difficulty"));

        expect(props.onStartGame).toHaveBeenCalled();
        expect(props.onBack).toHaveBeenCalled();
        expect(props.onSelectCiv).toHaveBeenCalledWith("ScholarKingdoms");
        expect(props.onSelectMapSize).toHaveBeenCalledWith("Large");
        expect(props.onSelectNumCivs).toHaveBeenCalledWith(6);
        expect(props.onSelectDifficulty).toHaveBeenCalledWith("Hard");
    });
});
