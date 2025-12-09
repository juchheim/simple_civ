import React from "react";
import { Modal } from "./Modal";

interface SavedGameInfo {
    timestamp: number;
    turn: number;
    civName: string;
}

interface LoadGameModalProps {
    isOpen: boolean;
    onClose: () => void;
    saves: {
        manual: SavedGameInfo | null;
        auto: SavedGameInfo | null;
    };
    onLoad: (slot: "manual" | "auto") => void;
}

export const LoadGameModal: React.FC<LoadGameModalProps> = ({ isOpen, onClose, saves, onLoad }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Load Game">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {!saves.manual && !saves.auto && (
                    <div style={{ padding: "30px 0", textAlign: "center", color: "var(--color-text-muted, #9ca3af)" }}>
                        No saved games found.
                    </div>
                )}

                {saves.manual && (
                    <SlotCard
                        title="Manual Save"
                        info={saves.manual}
                        onClick={() => {
                            onLoad("manual");
                            onClose();
                        }}
                    />
                )}

                {saves.auto && (
                    <SlotCard
                        title="Auto Save (Turn 5+)"
                        info={saves.auto}
                        onClick={() => {
                            onLoad("auto");
                            onClose();
                        }}
                    />
                )}
            </div>
        </Modal>
    );
};

const SlotCard: React.FC<{ title: string; info: SavedGameInfo; onClick: () => void }> = ({ title, info, onClick }) => {
    return (
        <button
            onClick={onClick}
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                width: "100%",
                padding: 16,
                background: "var(--color-bg-deep, #111)",
                border: "1px solid var(--color-border, #374151)",
                borderRadius: 8,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--color-highlight, #eab308)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border, #374151)";
                e.currentTarget.style.background = "var(--color-bg-deep, #111)";
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "var(--color-highlight, #eab308)" }}>{title}</span>
                <span style={{ fontSize: 12, color: "var(--color-text-muted, #9ca3af)" }}>
                    {new Date(info.timestamp).toLocaleString()}
                </span>
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 13, color: "var(--color-text-main, #d1d5db)", marginTop: 4 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ opacity: 0.6 }}>Civ:</span> {info.civName}
                </span>
                <span style={{ width: 1, background: "rgba(255,255,255,0.2)" }} />
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ opacity: 0.6 }}>Turn:</span> {info.turn}
                </span>
            </div>
        </button>
    );
};
