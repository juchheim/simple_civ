import React from "react";
import { GameState, TechId, EraId, TECHS, UNITS, BUILDINGS, PROJECTS, UnitType, BuildingType } from "@simple-civ/engine";
import { CIV_OPTIONS } from "../data/civs";
import { formatName } from "../utils/strings";
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
            if (hearthCount < 2) return false;
        }
        if (tech.era === EraId.Engine) {
            const bannerCount = player.techs.filter(t => TECHS[t].era === EraId.Banner).length;
            if (bannerCount < 2) return false;
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

    const renderBuildingStats = (buildingId: BuildingType): string => {
        const building = BUILDINGS[buildingId];
        if (!building) return "";
        const parts: string[] = [];

        // Yields
        const yields: string[] = [];
        if (building.yieldFlat?.F) yields.push(`+${building.yieldFlat.F}F`);
        if (building.yieldFlat?.P) yields.push(`+${building.yieldFlat.P}P`);
        if (building.yieldFlat?.S) yields.push(`+${building.yieldFlat.S}S`);
        if (yields.length > 0) parts.push(yields.join(" "));

        // Bonuses
        if (building.defenseBonus) parts.push(`+${building.defenseBonus} Def`);
        if (building.cityAttackBonus) parts.push(`+${building.cityAttackBonus} City Atk`);
        if (building.growthMult) parts.push(`-${Math.round((1 - building.growthMult) * 100)}% Growth`);

        parts.push(`Cost: ${building.cost}`);
        return parts.join(" • ");
    };

    const getBuildingExtras = (buildingId: BuildingType): { conditional?: string; projects?: string } => {
        const building = BUILDINGS[buildingId];
        if (!building) return {};
        const result: { conditional?: string; projects?: string } = {};
        if (building.conditional) result.conditional = building.conditional;
        const unlockedProjects = Object.entries(PROJECTS).filter(([_, p]) => p.prereqBuilding === buildingId);
        if (unlockedProjects.length > 0) {
            result.projects = `Unlocks: ${unlockedProjects.map(([id]) => formatName(id)).join(", ")}`;
        }
        return result;
    };

    const renderUnlockLine = (tech: typeof TECHS[TechId]): string => {
        if (tech.unlock.type === "Unit") {
            const unit = UNITS[tech.unlock.id as UnitType];
            if (!unit) return `Unit: ${formatName(tech.unlock.id)}`;
            const stats = `${unit.atk}/${unit.def}/${unit.move}${unit.rng > 1 ? `/${unit.rng}r` : ""}`;
            return `Unit: ${formatName(tech.unlock.id)} • ${stats} • Cost: ${unit.cost}`;
        }
        if (tech.unlock.type === "Building") {
            const stats = renderBuildingStats(tech.unlock.id as BuildingType);
            return `Building: ${formatName(tech.unlock.id)} • ${stats}`;
        }
        if (tech.unlock.type === "Passive") {
            return `Passive: ${tech.unlock.key}`;
        }
        return `Project: ${formatName(tech.unlock.id)}`;
    };

    // Check if no research is currently selected
    const noResearchSelected = !player.currentTech;

    // Find the first available tech for the attention indicator
    const hearthTechsList: TechId[] = [
        TechId.Fieldcraft,
        TechId.StoneworkHalls,
        TechId.ScriptLore,
        TechId.FormationTraining,
        TechId.TrailMaps,
    ];
    const bannerTechsList: TechId[] = [
        TechId.Wellworks,
        TechId.TimberMills,
        TechId.ScholarCourts,
        TechId.DrilledRanks,
        TechId.CityWards,
    ];
    const engineTechsList: TechId[] = [
        TechId.UrbanPlans,
        TechId.SteamForges,
        TechId.SignalRelay,
        TechId.ArmyDoctrine,
        TechId.StarCharts,
    ];
    const allTechs = [...hearthTechsList, ...bannerTechsList, ...engineTechsList];
    const firstAvailableTech = noResearchSelected
        ? allTechs.find(t => getTechState(t) === "available")
        : null;

    const renderTechCard = (techId: TechId) => {
        const tech = TECHS[techId];
        const state = getTechState(techId);
        const isCurrent = state === "current";
        const needsAttention = techId === firstAvailableTech;

        const handleClick = () => {
            if (state === "available") {
                onChooseTech(techId);
            }
        };

        // Get building extras (conditional, projects) if applicable
        const buildingExtras = tech.unlock.type === "Building"
            ? getBuildingExtras(tech.unlock.id as BuildingType)
            : {};

        return (
            <div
                key={techId}
                className={`tech-card tech-card--${state}${needsAttention ? ' tech-card--needs-attention' : ''}`}
                onClick={handleClick}
            >
                <div className="tech-card-header">
                    <span className="tech-card-name">{formatName(techId)}</span>
                    <span className="tech-card-cost">⚗ {tech.cost}</span>
                </div>

                {/* Show prerequisite tech if any */}
                {tech.prereqTechs.length > 0 && (
                    <div className="tech-card-prereq">
                        ← Requires: {tech.prereqTechs.map(t => formatName(t)).join(", ")}
                    </div>
                )}

                <div className="tech-card-unlock">{renderUnlockLine(tech)}</div>

                {/* Extra info for buildings */}
                {buildingExtras.conditional && (
                    <div className="tech-card-conditional">{buildingExtras.conditional}</div>
                )}
                {buildingExtras.projects && (
                    <div className="tech-card-projects">{buildingExtras.projects}</div>
                )}

                {/* Civ-Specific Uniques */}
                {player.civName === "JadeCovenant" && techId === TechId.Fieldcraft && (
                    <div className="tech-card-unique">
                        Unique: Jade Granary • {renderBuildingStats(BuildingType.JadeGranary)}
                    </div>
                )}
                {player.civName === "AetherianVanguard" && techId === TechId.SteamForges && (
                    <div className="tech-card-unique">
                        Unique: Titan's Core • {renderBuildingStats(BuildingType.TitansCore)}
                    </div>
                )}
                {player.civName === "StarborneSeekers" && techId === TechId.StarCharts && (
                    <div className="tech-card-unique">
                        Unique: Spirit Observatory • {renderBuildingStats(BuildingType.SpiritObservatory)}
                    </div>
                )}

                {isCurrent && (
                    <div className="tech-card-progress">
                        <div
                            className="tech-card-progress-fill"
                            style={{ width: `${Math.min(100, (player.currentTech!.progress / player.currentTech!.cost) * 100)}%` }}
                        />
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
                        <div className="tech-tree-era tech-tree-era--hearth">
                            <div className="tech-tree-era-header">
                                <h3 className="tech-tree-era-title">Hearth Era</h3>
                                <div className="tech-tree-era-req">Choose a technology to begin research.</div>
                            </div>
                            <div className="tech-tree-cards">
                                {hearthTechs.map(renderTechCard)}
                            </div>
                        </div>

                        {/* Arrow: Hearth → Banner */}
                        <div className="tech-tree-arrow">
                            <div className="tech-tree-arrow-line" />
                            <div className="tech-tree-arrow-head">▶</div>
                        </div>

                        {/* Banner Era */}
                        <div className="tech-tree-era tech-tree-era--banner">
                            <div className="tech-tree-era-header">
                                <h3 className="tech-tree-era-title">Banner Era</h3>
                                <div className="tech-tree-era-req">Requires 2 Hearth techs</div>
                            </div>
                            <div className="tech-tree-cards">
                                {bannerTechs.map(renderTechCard)}
                            </div>
                        </div>

                        {/* Arrow: Banner → Engine */}
                        <div className="tech-tree-arrow">
                            <div className="tech-tree-arrow-line" />
                            <div className="tech-tree-arrow-head">▶</div>
                        </div>

                        {/* Engine Era */}
                        <div className="tech-tree-era tech-tree-era--engine">
                            <div className="tech-tree-era-header">
                                <h3 className="tech-tree-era-title">Engine Era</h3>
                                <div className="tech-tree-era-req">Requires 2 Banner techs</div>
                            </div>
                            <div className="tech-tree-cards">
                                {engineTechs.map(renderTechCard)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
