import React from "react";
import { DifficultyLevel, MAP_DIMS, MapSize, MAX_CIVS_BY_MAP_SIZE } from "@simple-civ/engine";
import { CIV_OPTIONS, CivId, CivOption } from "../../data/civs";

type CivSelectionScreenProps = {
    selectedCiv: CivId;
    selectedMapSize: MapSize;
    numCivs: number;
    selectedDifficulty: DifficultyLevel;
    onSelectCiv: (civId: CivId) => void;
    onSelectMapSize: (mapSize: MapSize) => void;
    onSelectNumCivs: (numCivs: number) => void;
    onSelectDifficulty: (difficulty: DifficultyLevel) => void;
    onStartGame: () => void;
    onBack: () => void;
};

export const CivSelectionScreen: React.FC<CivSelectionScreenProps> = ({
    selectedCiv,
    selectedMapSize,
    numCivs,
    selectedDifficulty,
    onSelectCiv,
    onSelectMapSize,
    onSelectNumCivs,
    onSelectDifficulty,
    onStartGame,
    onBack,
}) => {
    const maxCivsGlobal = Math.max(...Object.values(MAX_CIVS_BY_MAP_SIZE));

    return (
        <div style={{ position: "fixed", inset: 0, background: "var(--color-bg-deep)", color: "var(--color-text-main)", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
            <div style={{ width: "min(1200px, 100%)", height: "min(700px, 85vh)", background: "var(--color-bg-panel)", borderRadius: 24, boxShadow: "0 20px 80px rgba(0,0,0,0.5)", border: "1px solid var(--color-border)", display: "flex", flexDirection: "row", overflow: "hidden" }}>

                {/* Left Column: Logo */}
                <div style={{ flex: "0 0 30%", display: "flex", alignItems: "flex-start", justifyContent: "center", background: "var(--color-bg-deep)", paddingTop: 40 }}>
                    <img src="/logo.png" alt="SimpleCiv Logo" style={{ maxWidth: "80%", maxHeight: "80%", objectFit: "contain" }} />
                </div>

                {/* Right Column: Content */}
                <div style={{ flex: 1, padding: 40, display: "flex", flexDirection: "column", gap: 24, minWidth: 0, overflow: "hidden" }}>

                    {/* Header */}
                    <div>
                        <div style={{ fontSize: 24, fontWeight: 700 }}>Choose your Civilization</div>
                    </div>

                    {/* Civ Grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, flex: 1, overflowY: "auto", minHeight: 0, paddingRight: 8 }}>
                        {CIV_OPTIONS.map((option: CivOption) => {
                            const isSelected = option.id === selectedCiv;
                            return (
                                <button
                                    key={option.id}
                                    onClick={() => onSelectCiv(option.id)}
                                    style={{
                                        textAlign: "left",
                                        background: isSelected ? "var(--color-bg-deep)" : "transparent",
                                        border: `2px solid ${isSelected ? "var(--color-highlight)" : "var(--color-border)"}`,
                                        borderRadius: 12,
                                        padding: "16px 16px 8px 16px",
                                        color: "var(--color-text-main)",
                                        cursor: "pointer",
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "flex-start",
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                                        <span style={{ width: 12, height: 12, borderRadius: "50%", background: option.color, display: "inline-block" }} />
                                        <span style={{ fontWeight: 700, fontSize: 16 }}>{option.title}</span>
                                    </div>
                                    <div style={{ fontSize: 14, color: "var(--color-text-muted)", marginBottom: 6 }}>{option.summary}</div>
                                    <div style={{ fontSize: 13, color: "var(--color-highlight)", lineHeight: 1.4, whiteSpace: "normal" }}>{option.perk}</div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Settings & Buttons */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: "auto", flexShrink: 0 }}>

                        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                            <div style={{ display: "flex", gap: 19, alignItems: "flex-end", width: "100%" }}>
                                {/* Map Size */}
                                <div>
                                    <label style={{ display: "block", fontSize: 13, color: "var(--color-text-muted)", marginBottom: 6 }}>Map Size</label>
                                    <div style={{ display: "flex", gap: 4 }}>
                                        {(Object.keys(MAP_DIMS) as MapSize[]).map((size) => (
                                            <button
                                                key={size}
                                                onClick={() => onSelectMapSize(size)}
                                                style={{
                                                    padding: "6px 10px",
                                                    fontSize: 13,
                                                    borderRadius: 6,
                                                    border: size === selectedMapSize ? "2px solid var(--color-highlight)" : "1px solid var(--color-border)",
                                                    background: size === selectedMapSize ? "var(--color-bg-deep)" : "transparent",
                                                    color: "var(--color-text-main)",
                                                    cursor: "pointer",
                                                }}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Number of Civs */}
                                <div>
                                    <label style={{ display: "block", fontSize: 13, color: "var(--color-text-muted)", marginBottom: 6 }}>Civs</label>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(32px, 1fr))", gap: 3, maxWidth: 180 }}>
                                        {Array.from({ length: maxCivsGlobal - 1 }, (_, i) => i + 2).map(count => {
                                            const allowedForMap = MAX_CIVS_BY_MAP_SIZE[selectedMapSize] ?? 4;
                                            const allowed = count <= allowedForMap && count <= CIV_OPTIONS.length;
                                            return (
                                                <button
                                                    key={count}
                                                    onClick={() => {
                                                        if (!allowed) return;
                                                        onSelectNumCivs(count);
                                                    }}
                                                    disabled={!allowed}
                                                    style={{
                                                        width: 32,
                                                        height: 32,
                                                        borderRadius: 6,
                                                        border: count === numCivs ? "2px solid var(--color-highlight)" : "1px solid var(--color-border)",
                                                        background: count === numCivs ? "var(--color-bg-deep)" : "transparent",
                                                        color: "var(--color-text-main)",
                                                        fontWeight: 600,
                                                        fontSize: 13,
                                                        cursor: allowed ? "pointer" : "not-allowed",
                                                        opacity: allowed ? 1 : 0.5
                                                    }}
                                                >
                                                    {count}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Difficulty Selector */}
                                <div>
                                    <label style={{ display: "block", fontSize: 13, color: "var(--color-text-muted)", marginBottom: 6 }}>Difficulty</label>
                                    <div style={{ display: "flex", gap: 4 }}>
                                        {(["Easy", "Normal", "Hard", "Expert"] as DifficultyLevel[]).map((level) => (
                                            <button
                                                key={level}
                                                onClick={() => onSelectDifficulty(level)}
                                                style={{
                                                    padding: "6px 10px",
                                                    fontSize: 13,
                                                    borderRadius: 6,
                                                    border: level === selectedDifficulty ? "2px solid var(--color-highlight)" : "1px solid var(--color-border)",
                                                    background: level === selectedDifficulty ? "var(--color-bg-deep)" : "transparent",
                                                    color: level === "Expert" ? "var(--color-text-danger)" : (level === "Hard" ? "var(--color-text-warning)" : "var(--color-text-main)"),
                                                    cursor: "pointer",
                                                    fontWeight: level === selectedDifficulty ? 700 : 400
                                                }}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            {/* Buttons */}
                            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                <button
                                    onClick={onStartGame}
                                    style={{
                                        flex: 1,
                                        padding: "12px",
                                        borderRadius: 10,
                                        border: "none",
                                        background: "var(--color-highlight-strong, #cd8a36)",
                                        color: "white",
                                        fontWeight: 700,
                                        fontSize: 16,
                                        cursor: "pointer",
                                        boxShadow: "0 10px 30px rgba(0,0,0,0.25)"
                                    }}
                                >
                                    Start Game
                                </button>
                                <button
                                    onClick={onBack}
                                    style={{
                                        padding: "12px 16px",
                                        borderRadius: 10,
                                        border: "1px solid var(--color-border)",
                                        background: "transparent",
                                        color: "var(--color-text-main)",
                                        cursor: "pointer",
                                        marginRight: 8
                                    }}
                                >
                                    Back
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
