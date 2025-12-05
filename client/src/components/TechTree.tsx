import React from "react";
import { GameState, TechId, EraId, TECHS, UNITS, BUILDINGS, PROJECTS, UnitType, BuildingType } from "@simple-civ/engine";
import { CIV_OPTIONS } from "../data/civs";

interface TechTreeProps {
    gameState: GameState;
    playerId: string;
    onChooseTech: (techId: TechId) => void;
    onClose: () => void;
}

export const TechTree: React.FC<TechTreeProps> = ({ gameState, playerId, onChooseTech, onClose }) => {
    const player = gameState.players.find(p => p.id === playerId);
    const civData = player ? CIV_OPTIONS.find(c => c.id === player.civName) : null;

    const [lines, setLines] = React.useState<{ x1: number, y1: number, x2: number, y2: number }[]>([]);
    const techRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Calculate lines on mount and resize
    React.useEffect(() => {
        const calculateLines = () => {
            if (!containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();
            const newLines: { x1: number, y1: number, x2: number, y2: number }[] = [];

            Object.entries(TECHS).forEach(([techId, tech]) => {
                const targetEl = techRefs.current[techId];
                if (!targetEl) return;
                const targetRect = targetEl.getBoundingClientRect();

                // Connect to prerequisites
                tech.prereqTechs.forEach(prereqId => {
                    const sourceEl = techRefs.current[prereqId];
                    if (sourceEl) {
                        const sourceRect = sourceEl.getBoundingClientRect();

                        // Calculate relative coordinates
                        newLines.push({
                            x1: sourceRect.right - containerRect.left - 5, // Slight inset
                            y1: sourceRect.bottom - containerRect.top,
                            x2: targetRect.right - containerRect.left - 5, // Slight inset
                            y2: targetRect.top - containerRect.top
                        });
                    }
                });
            });
            setLines(newLines);
        };

        // Initial calculation
        setTimeout(calculateLines, 100); // Small delay to ensure layout is settled

        window.addEventListener('resize', calculateLines);
        return () => window.removeEventListener('resize', calculateLines);
    }, [gameState]); // Recalculate if game state changes (though tech tree structure is static)

    if (!player) {
        return null;
    }

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
    const getTech = (id: TechId) => [id, TECHS[id]] as const;

    const hearthTechs = [
        getTech(TechId.Fieldcraft),
        getTech(TechId.StoneworkHalls),
        getTech(TechId.ScriptLore),
        getTech(TechId.FormationTraining),
        getTech(TechId.TrailMaps),
    ];

    const bannerTechs = [
        getTech(TechId.Wellworks),
        getTech(TechId.TimberMills),
        getTech(TechId.ScholarCourts),
        getTech(TechId.DrilledRanks),
        getTech(TechId.CityWards),
    ];

    const engineTechs = [
        getTech(TechId.UrbanPlans),
        getTech(TechId.SteamForges),
        getTech(TechId.SignalRelay),
        getTech(TechId.ArmyDoctrine),
        getTech(TechId.StarCharts),
    ];

    const formatName = (name: string): string => {
        return name.replace(/([A-Z])/g, ' $1').trim();
    };

    const renderBuildingStats = (buildingId: BuildingType) => {
        const building = BUILDINGS[buildingId];
        if (!building) return null;
        const yields = [];
        if (building.yieldFlat?.F) yields.push(`+${building.yieldFlat.F} Food`);
        if (building.yieldFlat?.P) yields.push(`+${building.yieldFlat.P} Prod`);
        if (building.yieldFlat?.S) yields.push(`+${building.yieldFlat.S} Sci`);

        const unlockedProjects = Object.entries(PROJECTS).filter(([_, p]) => p.prereqBuilding === buildingId);

        return (
            <div style={{ fontSize: "10px", marginTop: "4px", lineHeight: "1.3" }}>
                <div>Cost: {building.cost}</div>
                {yields.length > 0 && <div>{yields.join(", ")}</div>}
                {building.defenseBonus && <div>+{building.defenseBonus} Defense</div>}
                {building.cityAttackBonus && <div>+{building.cityAttackBonus} City Atk</div>}
                {building.growthMult && <div>Growth Cost: -{Math.round((1 - building.growthMult) * 100)}%</div>}
                {building.conditional && <div style={{ fontStyle: "italic" }}>{building.conditional}</div>}
                {unlockedProjects.length > 0 && (
                    <div style={{ marginTop: "2px", color: "var(--color-highlight)" }}>
                        Unlocks: {unlockedProjects.map(([id, _]) => formatName(id)).join(", ")}
                    </div>
                )}
            </div>
        );
    };

    const renderUnlockStats = (tech: typeof TECHS[TechId]) => {
        if (tech.unlock.type === "Unit") {
            const unit = UNITS[tech.unlock.id as UnitType];
            if (!unit) return null;
            return (
                <div style={{ fontSize: "10px", marginTop: "4px", lineHeight: "1.3" }}>
                    <div>Atk: {unit.atk} | Def: {unit.def} | Move: {unit.move}</div>
                    {unit.rng > 1 && <div>Range: {unit.rng}</div>}
                    <div>Cost: {unit.cost}</div>
                </div>
            );
        }
        if (tech.unlock.type === "Building") {
            return renderBuildingStats(tech.unlock.id as BuildingType);
        }
        return null;
    };

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
                ref={el => techRefs.current[techId] = el}
                style={{
                    padding: "10px",
                    margin: "5px",
                    background: bgColor,
                    border: available && !researched && !isCurrent ? `2px solid ${borderColor}` : `1px solid ${borderColor}`,
                    borderRadius: "4px",
                    cursor: available && !researched && !isCurrent ? "pointer" : "default",
                    width: "180px",
                    flexShrink: 0,
                    color: textColor,
                    display: "flex",
                    flexDirection: "column",
                    position: "relative", // For z-index context
                    zIndex: 2,
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
                <div style={{ fontWeight: "bold", marginBottom: "5px", color: isCurrent ? "var(--color-bg-main)" : "var(--color-text-main)" }}>
                    {formatName(techId)}
                </div>
                <div style={{ fontSize: "12px", opacity: 0.8 }}>
                    Cost: {tech.cost}
                </div>
                <div style={{ fontSize: "11px", opacity: 0.9, marginTop: "5px", fontWeight: "bold" }}>
                    {tech.unlock.type === "Building" || tech.unlock.type === "Unit"
                        ? `${tech.unlock.type}: ${formatName(tech.unlock.id)}`
                        : tech.unlock.type === "Passive"
                            ? `Passive: ${tech.unlock.key}`
                            : `Project: ${formatName(tech.unlock.id)}`}
                </div>

                {/* Civ-Specific Uniques */}
                {player.civName === "JadeCovenant" && techId === TechId.Fieldcraft && (
                    <>
                        <div style={{ fontSize: "10px", color: "var(--color-highlight-strong)", marginTop: "4px", fontWeight: "bold" }}>
                            Unique: Jade Granary
                        </div>
                        {renderBuildingStats(BuildingType.JadeGranary)}
                    </>
                )}
                {player.civName === "AetherianVanguard" && techId === TechId.SteamForges && (
                    <>
                        <div style={{ fontSize: "10px", color: "var(--color-highlight-strong)", marginTop: "4px", fontWeight: "bold" }}>
                            Unique: Titan's Core
                        </div>
                        {renderBuildingStats(BuildingType.TitansCore)}
                    </>
                )}
                {player.civName === "StarborneSeekers" && techId === TechId.StarCharts && (
                    <>
                        <div style={{ fontSize: "10px", color: "var(--color-highlight-strong)", marginTop: "4px", fontWeight: "bold" }}>
                            Unique: Spirit Observatory
                        </div>
                        {renderBuildingStats(BuildingType.SpiritObservatory)}
                    </>
                )}

                {renderUnlockStats(tech)}

                {isCurrent && (
                    <div style={{ fontSize: "11px", fontWeight: "bold", marginTop: "auto", paddingTop: "5px" }}>
                        Progress: {player.currentTech!.progress}/{player.currentTech!.cost}
                    </div>
                )}
            </div>
        );
    };

    if (!player) return null;

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
            <div ref={containerRef} style={{ maxWidth: "1200px", margin: "0 auto", color: "var(--color-text-main)", position: "relative" }}>
                {/* SVG Overlay for Lines */}
                <svg style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                    zIndex: 1
                }}>
                    {lines.map((line, i) => (
                        <line
                            key={i}
                            x1={line.x1}
                            y1={line.y1}
                            x2={line.x2}
                            y2={line.y2}
                            stroke="var(--color-text-muted)"
                            strokeWidth="2"
                            opacity="0.4"
                        />
                    ))}
                </svg>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", position: "relative", zIndex: 2 }}>
                    <div>
                        <h2 style={{ margin: 0 }}>Tech Tree</h2>
                        {civData && (
                            <div style={{ fontSize: "14px", color: "var(--color-highlight)", marginTop: "5px" }}>
                                {civData.title}: {civData.perk}
                            </div>
                        )}
                    </div>
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
                    <div style={{ background: "var(--color-bg-panel)", border: "1px solid var(--color-highlight)", padding: "15px", marginBottom: "20px", borderRadius: "4px", position: "relative", zIndex: 2 }}>
                        <strong style={{ color: "var(--color-highlight-strong)" }}>Choose a technology to research!</strong>
                        <p style={{ margin: "5px 0 0 0", fontSize: "14px", color: "var(--color-text-muted)" }}>
                            Click on any available (gold border) tech to begin researching it.
                        </p>
                    </div>
                )}

                <div style={{ marginBottom: "30px", position: "relative", zIndex: 2 }}>
                    <h3 style={{ color: "var(--color-text-main)", borderBottom: "1px solid var(--color-border)", paddingBottom: "5px" }}>Hearth Era</h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}> {/* Increased gap for lines */}
                        {hearthTechs.map(([id, tech]) => renderTech(id as TechId, tech))}
                    </div>
                </div>

                <div style={{ marginBottom: "30px", position: "relative", zIndex: 2 }}>
                    <h3 style={{ color: "var(--color-text-main)", borderBottom: "1px solid var(--color-border)", paddingBottom: "5px" }}>Banner Era</h3>
                    <div style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "10px" }}>
                        Requires 2 Hearth techs
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
                        {bannerTechs.map(([id, tech]) => renderTech(id as TechId, tech))}
                    </div>
                </div>

                <div style={{ marginBottom: "30px", position: "relative", zIndex: 2 }}>
                    <h3 style={{ color: "var(--color-text-main)", borderBottom: "1px solid var(--color-border)", paddingBottom: "5px" }}>Engine Era</h3>
                    <div style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "10px" }}>
                        Requires 2 Banner techs
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
                        {engineTechs.map(([id, tech]) => renderTech(id as TechId, tech))}
                    </div>
                </div>


            </div>
        </div>
    );
};
