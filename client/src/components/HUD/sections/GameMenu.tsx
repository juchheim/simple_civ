import React, { useState } from "react";

type GameMenuProps = {
    onSave: () => void;
    onLoad: () => void;
    onRestart: () => void;
    onQuit: () => void;
    showShroud: boolean;
    onToggleShroud: () => void;
    showYields: boolean;
    onToggleYields: () => void;
};

export const GameMenu: React.FC<GameMenuProps> = ({
    onSave,
    onLoad,
    onRestart,
    onQuit,
    showShroud,
    onToggleShroud,
    showYields,
    onToggleYields,
}) => {
    const [showPreferences, setShowPreferences] = useState(false);

    if (showPreferences) {
        return (
            <div>
                <div className="hud-menu-header" style={{ marginBottom: 10, justifyContent: "flex-start" }}>
                    <button className="hud-button small ghost" onClick={() => setShowPreferences(false)}>
                        ← Back
                    </button>
                    <div className="hud-section-title" style={{ margin: 0 }}>Preferences</div>
                </div>
                <div className="hud-menu-scroll">
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "4px 0" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: "#e5e7eb" }}>
                            <input
                                type="checkbox"
                                checked={showShroud}
                                onChange={onToggleShroud}
                                style={{ width: 16, height: 16, cursor: "pointer" }}
                            />
                            Show unseen shroud
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: "#e5e7eb" }}>
                            <input
                                type="checkbox"
                                checked={showYields}
                                onChange={onToggleYields}
                                style={{ width: 16, height: 16, cursor: "pointer" }}
                            />
                            Show terrain yields
                        </label>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="hud-section-title">Game</div>
            <div className="hud-menu-scroll">
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "10px 0" }}>
                    <button className="hud-button" onClick={() => setShowPreferences(true)}>
                        Preferences
                    </button>
                    <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "5px 0" }} />
                    <button className="hud-button" onClick={onSave}>
                        Save Game
                    </button>
                    <button className="hud-button" onClick={onLoad}>
                        Load Game
                    </button>
                    <button className="hud-button" onClick={onRestart}>
                        Restart Game
                    </button>
                    <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "5px 0" }} />
                    <button className="hud-button danger" onClick={onQuit}>
                        Quit to Main Menu
                    </button>
                </div>
            </div>
        </div>
    );
};
