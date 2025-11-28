import React from "react";
import { DiplomacyAlert } from "../hooks/use-diplomacy-alerts";

interface DiplomacyAlertModalProps {
    alert: DiplomacyAlert;
    onOpenDiplomacy: () => void;
    onDismiss: () => void;
}

export const DiplomacyAlertModal: React.FC<DiplomacyAlertModalProps> = ({ alert, onOpenDiplomacy, onDismiss }) => {
    const isWar = alert.type === "WarDeclared";
    const title = isWar ? "Declaration of War" : "Peace Proposal";
    const message = isWar
        ? `The ${alert.civName} has declared war on you!`
        : `The ${alert.civName} has offered a peace treaty.`;

    return (
        <div style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 1000,
            pointerEvents: "auto"
        }}>
            <div className="hud-card" style={{
                width: "min(400px, 90vw)",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
                border: isWar ? "1px solid #ef4444" : "1px solid var(--color-highlight)"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                        fontSize: 24,
                        lineHeight: 1,
                        color: isWar ? "#ef4444" : "var(--color-highlight)"
                    }}>
                        {isWar ? "⚔️" : "🕊️"}
                    </div>
                    <div>
                        <div className="hud-section-title" style={{ marginBottom: 2 }}>Diplomatic Alert</div>
                        <div className="hud-title-sm" style={{ fontSize: 18 }}>{title}</div>
                    </div>
                </div>

                <div className="hud-paragraph" style={{ fontSize: 14 }}>
                    {message}
                </div>

                <div className="hud-subtext">
                    Visit the Diplomacy tab to respond to this event.
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    <button
                        className={`hud-button ${isWar ? "danger" : ""}`}
                        style={{ flex: 1 }}
                        onClick={onOpenDiplomacy}
                    >
                        Open Diplomacy
                    </button>
                    <button
                        className="hud-button ghost"
                        onClick={onDismiss}
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    );
};
