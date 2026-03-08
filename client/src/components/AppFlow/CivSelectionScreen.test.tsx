import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CivSelectionScreen } from "./CivSelectionScreen";

function baseProps(overrides: Partial<React.ComponentProps<typeof CivSelectionScreen>> = {}): React.ComponentProps<typeof CivSelectionScreen> {
    return {
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

describe("CivSelectionScreen", () => {
    it("hides the map-specific rules panel on huge maps when no special rules are active", () => {
        render(<CivSelectionScreen {...baseProps({ selectedMapSize: "Huge" })} />);

        expect(screen.queryByText("Map-Specific Victory Rules")).not.toBeInTheDocument();
    });

    it("hides the map-specific rules panel when the selected map uses standard victory rules", () => {
        render(<CivSelectionScreen {...baseProps({ selectedMapSize: "Standard" })} />);

        expect(screen.queryByText("Map-Specific Victory Rules")).not.toBeInTheDocument();
    });
});
