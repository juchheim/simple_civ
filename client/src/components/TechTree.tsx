import React from "react";
import { GameState, TECHS, TechId } from "@simple-civ/engine";
import { CIV_OPTIONS } from "../data/civs";
import { formatName } from "../utils/strings";
import { useTutorial } from "../contexts/TutorialContext";
import {
    AETHER_TECHS,
    BANNER_TECHS,
    ENGINE_TECHS,
    getEraActivation,
    getAdditionalBuildingUnlocks,
    getCivUniqueBuilding,
    getTechStateForPlayer,
    getUnlockInfo,
    HEARTH_TECHS
} from "./tech-tree-helpers";
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

    const renderTechCard = (techId: TechId) => {
        const tech = TECHS[techId];
        const state = getTechStateForPlayer(techId, player);
        const isCurrent = state === "current";
        const unlock = getUnlockInfo(tech);
        const civUnique = getCivUniqueBuilding(techId, player.civName);
        const additionalBuildingUnlocks = getAdditionalBuildingUnlocks(
            techId,
            player.civName,
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

    const { isHearthActive, isBannerActive, isEngineActive, isAetherActive } = getEraActivation(player.techs);

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
                                {HEARTH_TECHS.map(renderTechCard)}
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
                                {BANNER_TECHS.map(renderTechCard)}
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
                                {ENGINE_TECHS.map(renderTechCard)}
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
                                {AETHER_TECHS.map(renderTechCard)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
