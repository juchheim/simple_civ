import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { UnitPanel } from "./UnitPanel";
import { Unit, UnitState, UnitType } from "@simple-civ/engine";

const createUnit = (overrides: Partial<Unit> = {}): Unit => ({
    id: "unit-1",
    type: UnitType.Settler,
    ownerId: "p1",
    coord: { q: 0, r: 0 },
    hp: 10,
    maxHp: 10,
    movesLeft: 2,
    state: UnitState.Normal,
    hasAttacked: false,
    ...overrides,
});

describe("UnitPanel", () => {
    it("reflects link button enablement and hides found city when not my turn", () => {
        const unit = createUnit({ type: UnitType.Scout });
        render(
            <UnitPanel
                unit={unit}
                linkedPartner={null}
                canLinkUnits={false}
                canUnlinkUnits={true}
                isMyTurn={false}
                onLinkUnits={vi.fn()}
                onUnlinkUnits={vi.fn()}
                onFoundCity={vi.fn()}
            />,
        );

        expect(screen.getByRole("button", { name: "Link" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Unlink" })).toBeEnabled();
        expect(screen.queryByText("Found City")).not.toBeInTheDocument();
    });

    it("fires callbacks when actions are enabled", () => {
        const onLink = vi.fn();
        const onUnlink = vi.fn();
        const onFoundCity = vi.fn();
        const unit = createUnit();

        render(
            <UnitPanel
                unit={unit}
                linkedPartner={null}
                canLinkUnits={true}
                canUnlinkUnits={true}
                isMyTurn={true}
                onLinkUnits={onLink}
                onUnlinkUnits={onUnlink}
                onFoundCity={onFoundCity}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Link" }));
        fireEvent.click(screen.getByRole("button", { name: "Unlink" }));
        fireEvent.click(screen.getByText("Found City"));

        expect(onLink).toHaveBeenCalledTimes(1);
        expect(onUnlink).toHaveBeenCalledTimes(1);
        expect(onFoundCity).toHaveBeenCalledTimes(1);
    });
});

