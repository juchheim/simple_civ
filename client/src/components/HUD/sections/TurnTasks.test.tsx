import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TurnTasks } from "./TurnTasks";

describe("TurnTasks", () => {
    it("does not auto-expand when there are no tasks", () => {
        render(
            <TurnTasks
                blockingTasks={[]}
                attentionTasks={[]}
                isMyTurn={true}
                onOpenTechTree={vi.fn()}
                onFocusCity={vi.fn()}
                onFocusUnit={vi.fn()}
            />
        );
        const card = screen.queryByText("Blocking");
        expect(card).toBeNull();
    });

    it("auto-expands when there are blocking tasks", () => {
        render(
            <TurnTasks
                blockingTasks={[{ id: "1", kind: "research", label: "Research" }]}
                attentionTasks={[]}
                isMyTurn={true}
                onOpenTechTree={vi.fn()}
                onFocusCity={vi.fn()}
                onFocusUnit={vi.fn()}
            />
        );
        const card = screen.getByText("Blocking");
        expect(card).toBeInTheDocument();
    });

    it("auto-expands when there is 1 attention task", () => {
        render(
            <TurnTasks
                blockingTasks={[]}
                attentionTasks={[{ id: "1", kind: "unit", label: "Unit", coord: { q: 0, r: 0 }, unitId: "u1" }]}
                isMyTurn={true}
                onOpenTechTree={vi.fn()}
                onFocusCity={vi.fn()}
                onFocusUnit={vi.fn()}
            />
        );
        const card = screen.getByText("Attention");
        expect(card).toBeInTheDocument();
    });

    it("auto-expands when there are 2 attention tasks", () => {
        render(
            <TurnTasks
                blockingTasks={[]}
                attentionTasks={[
                    { id: "1", kind: "unit", label: "Unit 1", coord: { q: 0, r: 0 }, unitId: "u1" },
                    { id: "2", kind: "unit", label: "Unit 2", coord: { q: 0, r: 0 }, unitId: "u2" }
                ]}
                isMyTurn={true}
                onOpenTechTree={vi.fn()}
                onFocusCity={vi.fn()}
                onFocusUnit={vi.fn()}
            />
        );
        const card = screen.getByText("Attention");
        expect(card).toBeInTheDocument();
    });
});
