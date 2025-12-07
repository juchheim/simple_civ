import React, { useState } from "react";

type GameMenuProps = {
    onSave: () => void;
    onLoad: () => void;
    onRestart: () => void;
    onQuit: () => void;
    onResign: () => void;
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
    onResign,
    showShroud,
    onToggleShroud,
    showYields,
    onToggleYields,
}) => {
    const [showPreferences, setShowPreferences] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    React.useEffect(() => {
        const handleFullscreenChange = () => {
            const isFs = !!(
                document.fullscreenElement ||
                (document as any).webkitFullscreenElement ||
                (document as any).mozFullScreenElement ||
                (document as any).msFullscreenElement
            );
            setIsFullscreen(isFs);

            // Unlock keyboard when exiting fullscreen
            if (!isFs && (navigator as any).keyboard?.unlock) {
                (navigator as any).keyboard.unlock();
            }
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
        document.addEventListener("mozfullscreenchange", handleFullscreenChange);
        document.addEventListener("MSFullscreenChange", handleFullscreenChange);

        // Initial check
        handleFullscreenChange();

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
            document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
            document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
        };
    }, []);

    const toggleFullscreen = async () => {
        if (!isFullscreen) {
            const docEl = document.documentElement as any;
            try {
                if (docEl.requestFullscreen) {
                    await docEl.requestFullscreen();
                } else if (docEl.webkitRequestFullscreen) {
                    await docEl.webkitRequestFullscreen();
                } else if (docEl.mozRequestFullScreen) {
                    await docEl.mozRequestFullScreen();
                } else if (docEl.msRequestFullscreen) {
                    await docEl.msRequestFullscreen();
                }

                // Lock Escape key if supported
                if ((navigator as any).keyboard?.lock) {
                    await (navigator as any).keyboard.lock(["Escape"]);
                }
            } catch (err) {
                console.error("Error attempting to enable fullscreen:", err);
            }
        } else {
            const doc = document as any;
            if (doc.exitFullscreen) {
                doc.exitFullscreen();
            } else if (doc.webkitExitFullscreen) {
                doc.webkitExitFullscreen();
            } else if (doc.mozCancelFullScreen) {
                doc.mozCancelFullScreen();
            } else if (doc.msExitFullscreen) {
                doc.msExitFullscreen();
            }

            if ((navigator as any).keyboard?.unlock) {
                (navigator as any).keyboard.unlock();
            }
        }
    };

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
                                checked={isFullscreen}
                                onChange={toggleFullscreen}
                                style={{ width: 16, height: 16, cursor: "pointer" }}
                            />
                            Fullscreen
                        </label>
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
                    <button
                        className="hud-button"
                        onClick={() => {
                            if (window.confirm("Are you sure you want to Resign? This will end the game immediately.")) {
                                onResign();
                            }
                        }}
                        style={{
                            marginTop: "10px",
                            background: "rgba(220, 20, 60, 0.2)",
                            border: "1px solid rgba(220, 20, 60, 0.5)",
                            color: "#ff6b6b",
                        }}
                    >
                        Resign Game
                    </button>
                </div>
            </div>
        </div>
    );
};
