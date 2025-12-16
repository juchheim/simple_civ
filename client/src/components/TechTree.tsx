import React from "react";
import { GameState, TechId, EraId, TECHS, UNITS, BUILDINGS, PROJECTS, UnitType, BuildingType, ProjectId } from "@simple-civ/engine";
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

    // Tooltip state - tracks what to show and where
    const [tooltip, setTooltip] = React.useState<{ content: string; x: number; y: number } | null>(null);

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

    // Get civ-specific unique item for a tech (for tooltip display)
    const getCivUniqueForTech = (techId: TechId): string | null => {
        if (!player) return null;
        const civName = player.civName;

        // Unique buildings
        if (civName === "JadeCovenant" && techId === TechId.Fieldcraft) {
            return `⭐ Unique: Jade Granary • ${renderBuildingStats(BuildingType.JadeGranary)}`;
        }
        if (civName === "AetherianVanguard" && techId === TechId.SteamForges) {
            return `⭐ Unique: Titan's Core • ${renderBuildingStats(BuildingType.TitansCore)}`;
        }
        if (civName === "StarborneSeekers" && techId === TechId.StarCharts) {
            return `⭐ Unique: Spirit Observatory • ${renderBuildingStats(BuildingType.SpiritObservatory)}`;
        }

        // Bulwark Building for defensive civs
        if ((civName === "ScholarKingdoms" || civName === "StarborneSeekers") && techId === TechId.StoneworkHalls) {
            return `⭐ Unique: Building: Bulwark • ${renderBuildingStats(BuildingType.Bulwark)}`;
        }

        return null;
    };

    // Get a description for a unit type
    const getUnitDescription = (unitType: UnitType): string => {
        switch (unitType) {
            case UnitType.Settler:
                return "Founds new cities. Cannot attack.";
            case UnitType.Scout:
                return "Fast explorer with low combat stats. Great for scouting terrain.";
            case UnitType.SpearGuard:
                return "Reliable melee infantry. Can capture cities.";
            case UnitType.BowGuard:
                return "Ranged attacker. Strikes from 2 tiles away but cannot capture cities.";
            case UnitType.Riders:
                return "Fast cavalry. High mobility and can capture cities.";
            case UnitType.Skiff:
                return "Naval unit for exploring and controlling coastal waters.";

            case UnitType.Titan:
                return "Devastating war machine. Extremely powerful in combat.";
            default:
                return "";
        }
    };

    // Get a description for a building type
    const getBuildingDescription = (buildingType: BuildingType): string => {
        switch (buildingType) {
            case BuildingType.Farmstead:
                return "Increases food production and speeds city growth.";
            case BuildingType.StoneWorkshop:
                return "Boosts production output for faster building and unit creation.";
            case BuildingType.Scriptorium:
                return "Increases science output for faster research.";
            case BuildingType.Reservoir:
                return "Major food boost, especially effective when working water tiles.";
            case BuildingType.LumberMill:
                return "Increases production, with bonus when working forest tiles.";
            case BuildingType.Academy:
                return "Advanced research facility providing substantial science.";
            case BuildingType.CityWard:
                return "Fortification that increases city defense and bombardment strength.";
            case BuildingType.Forgeworks:
                return "Industrial facility for massive production output.";
            case BuildingType.CitySquare:
                return "Urban center providing both food and production.";
            case BuildingType.TitansCore:
                return "Unique Aetherian facility. Summons The Titan upon completion.";
            case BuildingType.SpiritObservatory:
                return "Unique Starborne facility. Grants major science and food bonuses.";
            case BuildingType.JadeGranary:
                return "Unique Jade Covenant granary with enhanced food production.";
            case BuildingType.Bulwark:
                return "Scholar/Starborne Fortress. +12 Defense, +4 Attack, +1 Science. BLOCKS Military Production.";
            default:
                return "";
        }
    };

    // Get a description for a project type
    const getProjectDescription = (projectId: ProjectId): string => {
        const project = PROJECTS[projectId];
        if (!project) return "";

        switch (projectId) {
            case ProjectId.Observatory:
                return `Milestone project. First step toward Progress Victory. Cost: ${project.cost}P`;
            case ProjectId.GrandAcademy:
                return `Second milestone toward Progress Victory. Requires Observatory. Cost: ${project.cost}P`;
            case ProjectId.GrandExperiment:
                return `Final milestone. Completing this wins the game via Progress Victory! Cost: ${project.cost}P`;
            case ProjectId.FormArmy_SpearGuard:
                return "Upgrades a SpearGuard unit into an elite Army with improved stats.";
            case ProjectId.FormArmy_BowGuard:
                return "Upgrades a BowGuard unit into an elite Army with improved stats.";
            case ProjectId.FormArmy_Riders:
                return "Upgrades a Riders unit into an elite Army with improved stats.";
            case ProjectId.HarvestFestival:
                return `Grants +25 Food. Requires Farmstead. Cost: ${project.cost}P`;
            case ProjectId.AlchemicalExperiments:
                return `Grants +25 Science. Requires Scriptorium. Cost: ${project.cost}P`;
            default:
                return "";
        }
    };

    // Get a description for a passive bonus
    const getPassiveDescription = (key: string): string => {
        if (key.includes("+1/+1 to Melee & Ranged")) {
            return "All melee and ranged units gain +1 Attack and +1 Defense permanently.";
        }
        if (key.includes("Enable Form Army")) {
            return "Unlocks projects to upgrade units into powerful Army formations with +5 HP and improved stats.";
        }
        if (key.includes("+1/+1 to Armies")) {
            return "All Army units gain an additional +1 Attack and +1 Defense.";
        }
        if (key.includes("+2 Science per city")) {
            return "Every city in your empire produces +2 bonus Science per turn.";
        }
        return "";
    };

    const renderUnlockLine = (tech: typeof TECHS[TechId]): string => {
        if (tech.unlock.type === "Unit") {
            const unit = UNITS[tech.unlock.id as UnitType];
            if (!unit) return `Unit: ${formatName(tech.unlock.id)}`;
            const stats = `${unit.atk}/${unit.def}/${unit.move}${unit.rng > 1 ? `/${unit.rng}r` : ""}`;
            const desc = getUnitDescription(tech.unlock.id as UnitType);
            return `Unit: ${formatName(tech.unlock.id)} • ${stats} • Cost: ${unit.cost}\n${desc}`;
        }
        if (tech.unlock.type === "Building") {
            const stats = renderBuildingStats(tech.unlock.id as BuildingType);
            const desc = getBuildingDescription(tech.unlock.id as BuildingType);
            return `Building: ${formatName(tech.unlock.id)} • ${stats}\n${desc}`;
        }
        if (tech.unlock.type === "Passive") {
            const desc = getPassiveDescription(tech.unlock.key);
            return `Passive: ${tech.unlock.key}${desc ? `\n${desc}` : ""}`;
        }
        const desc = getProjectDescription(tech.unlock.id as ProjectId);
        return `Project: ${formatName(tech.unlock.id)}${desc ? `\n${desc}` : ""}`;
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

    // Build tooltip content for a tech
    const buildTechTooltip = (techId: TechId): string => {
        const tech = TECHS[techId];
        const lines: string[] = [];

        // Main unlock line
        lines.push(renderUnlockLine(tech));

        // Building extras
        if (tech.unlock.type === "Building") {
            const extras = getBuildingExtras(tech.unlock.id as BuildingType);
            if (extras.conditional) lines.push(extras.conditional);
            if (extras.projects) lines.push(extras.projects);
        }

        // Civ-Specific Uniques (now consolidated via getCivUniqueForTech)
        const civUnique = getCivUniqueForTech(techId);
        if (civUnique) {
            lines.push(civUnique);
        }

        return lines.join("\n");
    };

    const renderTechCard = (techId: TechId) => {
        const tech = TECHS[techId];
        const state = getTechState(techId);
        const isCurrent = state === "current";
        const needsAttention = techId === firstAvailableTech;

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

        const handleMouseMove = (e: React.MouseEvent) => {
            setTooltip({
                content: buildTechTooltip(techId),
                x: e.clientX,
                y: e.clientY + 16  // Position below the cursor
            });
        };

        const handleMouseLeave = () => {
            setTooltip(null);
        };

        return (
            <div
                key={techId}
                className={`tech-card tech-card--${state}${needsAttention ? ' tech-card--needs-attention' : ''}`}
                onClick={handleClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={progressStyle}
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
                                <div className="tech-tree-era-req">Requires 3 Hearth techs</div>
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

            {/* Mouse-following tooltip */}
            {tooltip && (
                <div
                    className="tech-card-tooltip"
                    style={{
                        left: tooltip.x,
                        top: tooltip.y,
                    }}
                >
                    {tooltip.content}
                </div>
            )}
        </div>
    );
};
