import React from "react";

interface WarDeclarationModalProps {
    targetCivName: string;
    targetColor: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export const WarDeclarationModal: React.FC<WarDeclarationModalProps> = ({ targetCivName, targetColor, onConfirm, onCancel }) => {
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
                border: "1px solid #ef4444"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                        fontSize: 24,
                        lineHeight: 1,
                        color: "#ef4444"
                    }}>
                        ⚔️
                    </div>
                    <div>
                        <div className="hud-section-title" style={{ marginBottom: 2 }}>Declare War?</div>
                        <div className="hud-title-sm" style={{ fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ width: 12, height: 12, borderRadius: "50%", background: targetColor, display: "inline-block" }} />
                            {targetCivName}
                        </div>
                    </div>
                </div>

                <div className="hud-paragraph" style={{ fontSize: 14 }}>
                    This action will declare war on the {targetCivName}. Are you sure you want to proceed?
                </div>

                <div className="hud-subtext warn">
                    Warning: Declaring war will allow both civilizations to attack each other's units and cities.
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    <button
                        className="hud-button danger"
                        style={{ flex: 1 }}
                        onClick={onConfirm}
                    >
                        Declare War & Attack
                    </button>
                    <button
                        className="hud-button ghost"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};
