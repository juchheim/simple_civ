import React from "react";
import { GameState, TechId, EraId, TECHS, UNITS, BUILDINGS, UnitType, BuildingType } from "@simple-civ/engine";
import { CIV_OPTIONS } from "../data/civs";
import { formatName } from "../utils/strings";
import { useTutorial } from "../contexts/TutorialContext";
import "./TechTree.css";

interface TechTreeProps {
    gameState: GameState;
    playerId: string;
    onChooseTech: (techId: TechId) => void;
    onClose: () => void;
}

export const TechTree: React.FC<TechTreeProps> = ({ gameState, playerId, onChooseTech, onClose }) => {
    const player = gameState.players.find(p => p.id === playerId);
    const civData = player ? CIV_OPTIONS.find(c => c.id === player.civName) : null;
    const tutorial = useTutorial();

    if (!player) return null;

    const canResearch = (techId: TechId): boolean => {
        const tech = TECHS[techId];
        if (!tech) return false;
        if (player.techs.includes(techId)) return false;

        for (const req of tech.prereqTechs) {
            if (!player.techs.includes(req)) return false;
        }

        if (tech.era === EraId.Banner) {
            const hearthCount = player.techs.filter(t => TECHS[t].era === EraId.Hearth).length;
            if (hearthCount < 3) return false;
        }
        if (tech.era === EraId.Engine) {
            const bannerCount = player.techs.filter(t => TECHS[t].era === EraId.Banner).length;
            if (bannerCount < 2) return false;
        }
        // v6.0: Aether Era Gate
        if (tech.era === EraId.Aether) {
            const engineCount = player.techs.filter(t => TECHS[t].era === EraId.Engine).length;
            // Requires 2 Engine techs
            if (engineCount < 2) return false;
        }

        return true;
    };

    const getTechState = (techId: TechId) => {
        const isCurrent = player.currentTech?.id === techId;
        const researched = player.techs.includes(techId);
        const available = canResearch(techId);

        if (isCurrent) return "current";
        if (researched) return "researched";
        if (available) return "available";
        return "locked";
    };

    // Compact building stats for inline card display
    const getCompactBuildingStats = (buildingId: BuildingType): string => {
        const building = BUILDINGS[buildingId];
        if (!building) return "";
        const parts: string[] = [];
        if (building.yieldFlat?.F) parts.push(`+${building.yieldFlat.F}F`);
        if (building.yieldFlat?.P) parts.push(`+${building.yieldFlat.P}P`);
        if (building.yieldFlat?.S) parts.push(`+${building.yieldFlat.S}S`);
        const baseGold = building.yieldFlat?.G ?? 0;
        const upkeep = building.maintenance ?? 0;
        if (baseGold > 0 && upkeep > 0) {
            const netGold = baseGold - upkeep;
            parts.push(`${netGold >= 0 ? "+" : ""}${netGold}G net`);
        } else if (baseGold > 0) {
            parts.push(`+${baseGold}G`);
        } else if (upkeep > 0) {
            parts.push(`-${upkeep}G`);
        }
        if (building.defenseBonus) parts.push(`+${building.defenseBonus}Def`);
        if (building.cityAttackBonus) parts.push(`+${building.cityAttackBonus}Atk`);
        if (building.growthMult) parts.push(`+${Math.round((1 - building.growthMult) * 100)}%Gro`);
        return parts.join(" ");
    };

    const getAdditionalBuildingUnlocks = (techId: TechId, primaryUnlock?: string): Array<{ name: string; stats: string }> => {
        return Object.entries(BUILDINGS)
            .filter(([buildingId, data]) => data.techReq === techId && buildingId !== primaryUnlock)
            .map(([buildingId]) => {
                const id = buildingId as BuildingType;
                return {
                    name: formatName(id),
                    stats: getCompactBuildingStats(id),
                };
            });
    };

    // Get civ-specific unique building for a tech
    const getCivUniqueBuilding = (techId: TechId): { name: string; stats: string } | null => {
        if (!player) return null;
        const civName = player.civName;

        if (civName === "JadeCovenant" && techId === TechId.Fieldcraft) {
            return { name: "Jade Granary", stats: getCompactBuildingStats(BuildingType.JadeGranary) };
        }
        if (civName === "AetherianVanguard" && techId === TechId.SteamForges) {
            return { name: "Titan's Core", stats: getCompactBuildingStats(BuildingType.TitansCore) };
        }

        if ((civName === "ScholarKingdoms" || civName === "StarborneSeekers") && techId === TechId.StoneworkHalls) {
            return { name: "Bulwark", stats: getCompactBuildingStats(BuildingType.Bulwark) };
        }
        return null;
    };

    // Get unlock info for display on card
    const getUnlockInfo = (tech: typeof TECHS[TechId]): { type: string; name: string; stats: string } => {
        if (tech.unlock.type === "Unit") {
            const unit = UNITS[tech.unlock.id as UnitType];
            if (!unit) return { type: "Unit", name: formatName(tech.unlock.id), stats: "" };
            const stats = `${unit.atk}/${unit.def}/${unit.move}${unit.rng > 1 ? `/${unit.rng}r` : ""}`;
            return { type: "Unit", name: formatName(tech.unlock.id), stats };
        }
        if (tech.unlock.type === "Building") {
            return {
                type: "Bldg",
                name: formatName(tech.unlock.id),
                stats: getCompactBuildingStats(tech.unlock.id as BuildingType)
            };
        }
        if (tech.unlock.type === "Passive") {
            return { type: "Bonus", name: tech.unlock.key, stats: "" };
        }
        return { type: "Project", name: formatName(tech.unlock.id), stats: "" };
    };

    const renderTechCard = (techId: TechId) => {
        const tech = TECHS[techId];
        const state = getTechState(techId);
        const isCurrent = state === "current";
        const unlock = getUnlockInfo(tech);
        const civUnique = getCivUniqueBuilding(techId);
        const additionalBuildingUnlocks = getAdditionalBuildingUnlocks(
            techId,
            tech.unlock.type === "Building" ? tech.unlock.id : undefined
        );

        const handleClick = () => {
            if (state === "available") {
                tutorial.markComplete("selectedResearch");
                onChooseTech(techId);
            }
        };

        // Calculate progress percentage for current tech
        const progressPercent = isCurrent && player.currentTech
            ? Math.min(100, (player.currentTech.progress / player.currentTech.cost) * 100)
            : 0;

        // Progress background style for current tech
        const progressStyle: React.CSSProperties = isCurrent ? {
            background: `linear-gradient(90deg, 
                rgba(255, 255, 255, 0.15) 0%, 
                rgba(255, 255, 255, 0.15) ${progressPercent}%, 
                transparent ${progressPercent}%, 
                transparent 100%)`
        } : {};

        return (
            <div
                key={techId}
                className={`tech-card tech-card--${state}`}
                onClick={handleClick}
                style={progressStyle}
            >
                <div className="tech-card-header">
                    <span className="tech-card-name">{formatName(techId)}</span>
                    <span className="tech-card-cost">⚗ {tech.cost}</span>
                </div>

                {/* Show prerequisite tech if any - right under header */}
                {tech.prereqTechs.length > 0 && (
                    <div className="tech-card-prereq">
                        ← {tech.prereqTechs.map(t => formatName(t)).join(", ")}
                    </div>
                )}

                {/* Unlock info - always visible */}
                <div className="tech-card-unlock">
                    <span className="tech-card-unlock-type">{unlock.type}:</span> {unlock.name}
                    {unlock.stats && <span className="tech-card-unlock-stats">{unlock.stats}</span>}
                </div>

                {additionalBuildingUnlocks.length > 0 && (
                    <div className="tech-card-unlock">
                        <span className="tech-card-unlock-type">Also:</span>{" "}
                        {additionalBuildingUnlocks.map((unlockData, index) => (
                            <span key={`${techId}-also-${unlockData.name}`}>
                                {index > 0 ? ", " : ""}
                                {unlockData.name}
                                {unlockData.stats ? ` (${unlockData.stats})` : ""}
                            </span>
                        ))}
                    </div>
                )}

                {/* Civ-specific unique */}
                {civUnique && (
                    <div className="tech-card-unique">
                        ⭐ {civUnique.name} {civUnique.stats && <span className="tech-card-unlock-stats">{civUnique.stats}</span>}
                    </div>
                )}

                {/* Star Charts: Progress Victory note */}
                {techId === TechId.StarCharts && (
                    <div className="tech-card-victory">🏆 Required for Progress Victory</div>
                )}

                {/* Progress indicator for current tech */}
                {isCurrent && player.currentTech && (
                    <div className="tech-card-progress-text">
                        {player.currentTech.progress}/{player.currentTech.cost}
                    </div>
                )}
            </div>
        );
    };

    // Tech lists by era
    const hearthTechs: TechId[] = [
        TechId.Fieldcraft,
        TechId.StoneworkHalls,
        TechId.ScriptLore,
        TechId.FormationTraining,
        TechId.TrailMaps,
    ];

    const bannerTechs: TechId[] = [
        TechId.Wellworks,
        TechId.TimberMills,
        TechId.ScholarCourts,
        TechId.DrilledRanks,
        TechId.CityWards,
    ];

    const engineTechs: TechId[] = [
        TechId.UrbanPlans,
        TechId.SteamForges,
        TechId.SignalRelay,
        TechId.ArmyDoctrine,
        TechId.StarCharts,
    ];

    const aetherTechs: TechId[] = [
        TechId.ZeroPointEnergy,
        TechId.Aerodynamics,
        TechId.PlasmaShields,
        TechId.CompositeArmor,
        TechId.DimensionalGate,
    ];

    // Calculate Active Eras
    const hearthCount = player.techs.filter(t => TECHS[t].era === EraId.Hearth).length;
    const bannerCount = player.techs.filter(t => TECHS[t].era === EraId.Banner).length;
    const engineCount = player.techs.filter(t => TECHS[t].era === EraId.Engine).length;

    const isHearthActive = true;
    const isBannerActive = hearthCount >= 3;
    const isEngineActive = bannerCount >= 2;
    const isAetherActive = engineCount >= 2;

    return (
        <div className="tech-tree-overlay">
            <div className="tech-tree-background" />
            <div className="tech-tree-container">
                {/* Header */}
                <div className="tech-tree-header">
                    <div className="tech-tree-title-section">
                        <h2>Technology Tree</h2>
                        {civData && (
                            <div className="tech-tree-civ-perk">
                                {civData.title}: {civData.perk}
                            </div>
                        )}
                    </div>
                    <button className="tech-tree-close-btn" onClick={onClose}>
                        Close
                    </button>
                </div>

                {/* Horizontal Era Scroll */}
                <div className="tech-tree-scroll">
                    <div className="tech-tree-eras">
                        {/* Hearth Era */}
                        <div className={`tech-tree-era tech-tree-era--hearth ${isHearthActive ? "tech-tree-era--active" : ""}`}>
                            <div className="tech-tree-era-header">
                                <h3 className="tech-tree-era-title">Hearth Era</h3>
                                <div className="tech-tree-era-req">Start your path</div>
                            </div>
                            <div className="tech-tree-cards">
                                {hearthTechs.map(renderTechCard)}
                            </div>
                        </div>

                        {/* Arrow: Hearth → Banner */}
                        <div className={`tech-tree-arrow ${isBannerActive ? "tech-tree-arrow--active" : ""}`}>
                            <div className="tech-tree-arrow-line" />
                            <div className="tech-tree-arrow-head" />
                        </div>

                        {/* Banner Era */}
                        <div className={`tech-tree-era tech-tree-era--banner ${isBannerActive ? "tech-tree-era--active" : ""}`}>
                            <div className="tech-tree-era-header">
                                <h3 className="tech-tree-era-title">Banner Era</h3>
                                <div className="tech-tree-era-req">Requires 3 Hearth techs</div>
                            </div>
                            <div className="tech-tree-cards">
                                {bannerTechs.map(renderTechCard)}
                            </div>
                        </div>

                        {/* Arrow: Banner → Engine */}
                        <div className={`tech-tree-arrow ${isEngineActive ? "tech-tree-arrow--active" : ""}`}>
                            <div className="tech-tree-arrow-line" />
                            <div className="tech-tree-arrow-head" />
                        </div>

                        {/* Engine Era */}
                        <div className={`tech-tree-era tech-tree-era--engine ${isEngineActive ? "tech-tree-era--active" : ""}`}>
                            <div className="tech-tree-era-header">
                                <h3 className="tech-tree-era-title">Engine Era</h3>
                                <div className="tech-tree-era-req">Requires 2 Banner techs</div>
                            </div>
                            <div className="tech-tree-cards">
                                {engineTechs.map(renderTechCard)}
                            </div>
                        </div>


                        {/* Arrow: Engine → Aether */}
                        <div className={`tech-tree-arrow ${isAetherActive ? "tech-tree-arrow--active" : ""}`}>
                            <div className="tech-tree-arrow-line" />
                            <div className="tech-tree-arrow-head" />
                        </div>

                        {/* Aether Era */}
                        <div className={`tech-tree-era tech-tree-era--aether ${isAetherActive ? "tech-tree-era--active" : ""}`}>
                            <div className="tech-tree-era-header">
                                <h3 className="tech-tree-era-title">Aether Era</h3>
                                <div className="tech-tree-era-req">Requires 2 Engine techs</div>
                            </div>
                            <div className="tech-tree-cards">
                                {aetherTechs.map(renderTechCard)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );


};
