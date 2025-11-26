import React from "react";
import { GameState, TechId, EraId, TECHS } from "@simple-civ/engine";

interface TechTreeProps {
    gameState: GameState;
    playerId: string;
    onChooseTech: (techId: TechId) => void;
    onClose: () => void;
}

export const TechTree: React.FC<TechTreeProps> = ({ gameState, playerId, onChooseTech, onClose }) => {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return null;

    const canResearch = (techId: TechId): boolean => {
        const tech = TECHS[techId];
        if (!tech) return false;

        // Already researched?
        if (player.techs.includes(techId)) return false;

        // Check prerequisites
        for (const req of tech.prereqTechs) {
            if (!player.techs.includes(req)) return false;
        }

        // Era requirements
        if (tech.era === EraId.Banner) {
            const hearthCount = player.techs.filter(t => TECHS[t].era === EraId.Hearth).length;
            if (hearthCount < 2) return false;
        }
        if (tech.era === EraId.Engine) {
            const bannerCount = player.techs.filter(t => TECHS[t].era === EraId.Banner).length;
            if (bannerCount < 2) return false;
        }

        return true;
    };

    // Group techs by era
    const hearthTechs = Object.entries(TECHS).filter(([_, tech]) => tech.era === EraId.Hearth);
    const bannerTechs = Object.entries(TECHS).filter(([_, tech]) => tech.era === EraId.Banner);
    const engineTechs = Object.entries(TECHS).filter(([_, tech]) => tech.era === EraId.Engine);

    const renderTech = (techId: TechId, tech: typeof TECHS[TechId]) => {
        const researched = player.techs.includes(techId);
        const available = canResearch(techId);
        const isCurrent = player.currentTech?.id === techId;

        let bgColor = "var(--color-bg-main)";
        let textColor = "var(--color-text-muted)";
        let borderColor = "var(--color-border)";

        if (isCurrent) {
            bgColor = "var(--color-highlight)";
            textColor = "var(--color-bg-main)";
            borderColor = "var(--color-highlight)";
        } else if (researched) {
            bgColor = "var(--color-bg-panel)";
            textColor = "var(--color-text-main)";
            borderColor = "var(--color-border)";
        } else if (available) {
            bgColor = "var(--color-bg-deep)";
            textColor = "var(--color-text-main)";
            borderColor = "var(--color-highlight)";
        }

        return (
            <div
                key={techId}
                style={{
                    padding: "10px",
                    margin: "5px",
                    background: bgColor,
                    border: available && !researched && !isCurrent ? `2px solid ${borderColor}` : `1px solid ${borderColor}`,
                    borderRadius: "4px",
                    cursor: available && !researched && !isCurrent ? "pointer" : "default",
                    minWidth: "150px",
                    color: textColor,
                }}
                onMouseEnter={(e) => {
                    if (available && !researched && !isCurrent) {
                        e.currentTarget.style.borderColor = "var(--color-highlight-strong)";
                    }
                }}
                onMouseLeave={(e) => {
                    if (available && !researched && !isCurrent) {
                        e.currentTarget.style.borderColor = borderColor;
                    }
                }}
                onClick={() => {
                    if (available && !researched && !isCurrent) {
                        onChooseTech(techId);
                    }
                }}
            >
                <div style={{ fontWeight: "bold", marginBottom: "5px", color: isCurrent ? "var(--color-bg-main)" : "var(--color-text-main)" }}>{techId}</div>
                <div style={{ fontSize: "12px", opacity: 0.8 }}>
                    Cost: {tech.cost}
                </div>
                <div style={{ fontSize: "11px", opacity: 0.7, marginTop: "5px" }}>
                    {tech.unlock.type === "Building" || tech.unlock.type === "Unit"
                        ? `${tech.unlock.type}: ${tech.unlock.id}`
                        : tech.unlock.type === "Passive"
                            ? `Passive: ${tech.unlock.key}`
                            : `Project: ${tech.unlock.id}`}
                </div>
                {isCurrent && (
                    <div style={{ fontSize: "11px", fontWeight: "bold", marginTop: "3px" }}>
                        Progress: {player.currentTech!.progress}/{player.currentTech!.cost}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 1000,
            overflow: "auto",
            padding: "20px"
        }}>
            <div style={{ maxWidth: "1200px", margin: "0 auto", color: "var(--color-text-main)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h2>Tech Tree</h2>
                    <button onClick={onClose} style={{
                        padding: "10px 20px",
                        fontSize: "16px",
                        background: "transparent",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text-main)",
                        cursor: "pointer"
                    }}>Close</button>
                </div>

                {!player.currentTech && (
                    <div style={{ background: "var(--color-bg-panel)", border: "1px solid var(--color-highlight)", padding: "15px", marginBottom: "20px", borderRadius: "4px" }}>
                        <strong style={{ color: "var(--color-highlight-strong)" }}>Choose a technology to research!</strong>
                        <p style={{ margin: "5px 0 0 0", fontSize: "14px", color: "var(--color-text-muted)" }}>
                            Click on any available (gold border) tech to begin researching it.
                        </p>
                    </div>
                )}

                <div style={{ marginBottom: "30px" }}>
                    <h3 style={{ color: "var(--color-text-main)", borderBottom: "1px solid var(--color-border)", paddingBottom: "5px" }}>Hearth Era</h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                        {hearthTechs.map(([id, tech]) => renderTech(id as TechId, tech))}
                    </div>
                </div>

                <div style={{ marginBottom: "30px" }}>
                    <h3 style={{ color: "var(--color-text-main)", borderBottom: "1px solid var(--color-border)", paddingBottom: "5px" }}>Banner Era</h3>
                    <div style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "10px" }}>
                        Requires 2 Hearth techs
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                        {bannerTechs.map(([id, tech]) => renderTech(id as TechId, tech))}
                    </div>
                </div>

                <div style={{ marginBottom: "30px" }}>
                    <h3 style={{ color: "var(--color-text-main)", borderBottom: "1px solid var(--color-border)", paddingBottom: "5px" }}>Engine Era</h3>
                    <div style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "10px" }}>
                        Requires 2 Banner techs
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                        {engineTechs.map(([id, tech]) => renderTech(id as TechId, tech))}
                    </div>
                </div>

                <div style={{ marginTop: "20px", padding: "15px", background: "var(--color-bg-panel)", borderRadius: "4px", border: "1px solid var(--color-border)" }}>
                    <h4>Legend:</h4>
                    <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginTop: "10px" }}>
                        <div><span style={{ display: "inline-block", width: "20px", height: "20px", background: "var(--color-bg-panel)", border: "1px solid var(--color-border)", marginRight: "5px" }}></span> Researched</div>
                        <div><span style={{ display: "inline-block", width: "20px", height: "20px", background: "var(--color-highlight)", marginRight: "5px" }}></span> Currently Researching</div>
                        <div><span style={{ display: "inline-block", width: "20px", height: "20px", background: "var(--color-bg-deep)", border: "2px solid var(--color-highlight)", marginRight: "5px" }}></span> Available</div>
                        <div><span style={{ display: "inline-block", width: "20px", height: "20px", background: "var(--color-bg-main)", border: "1px solid var(--color-border)", marginRight: "5px" }}></span> Locked</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
