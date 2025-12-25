import React from "react";
import { Player } from "@simple-civ/engine";
import { formatName } from "../../../utils/strings";
import { useTutorial } from "../../../contexts/TutorialContext";

type TechButtonProps = {
    player: Player | undefined;
    onShowTechTree: () => void;
    sciencePerTurn: number;
};

export const TechButton: React.FC<TechButtonProps> = ({ player, onShowTechTree, sciencePerTurn }) => {
    const tech = player?.currentTech;
    const progress = tech ? Math.min(100, Math.round((tech.progress / tech.cost) * 100)) : 0;
    const tutorial = useTutorial();

    const handleShowTechTree = () => {
        tutorial.markComplete("viewedTechTree");
        onShowTechTree();
    };

    // Pulse the button if no research selected and haven't viewed tech tree yet
    const shouldPulse = !tech && tutorial.shouldPulse("viewedTechTree");

    return (
        <div>
            <div className="hud-section-title">Research</div>
            <div className="hud-menu-header">
                <div>
                    <div className="hud-subtext" style={{ margin: 0 }}>
                        {tech ? "Currently studying" : "Pick your next technology"}
                    </div>
                    <p className="hud-title" style={{ marginTop: 2 }}>
                        {tech ? formatName(tech.id) : "No active research"}
                    </p>
                </div>
                <button
                    className={`hud-button ${shouldPulse ? "pulse" : ""}`}
                    style={{
                        background: "var(--color-highlight-strong)",
                        color: "var(--color-bg-main)",
                        borderColor: "var(--color-highlight-strong)"
                    }}
                    onClick={handleShowTechTree}
                    title={tutorial.getTooltip("viewedTechTree")}
                >
                    Tech Tree
                </button>
            </div>
            {tech ? (
                <>
                    <div className="hud-progress">
                        <div className="hud-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="hud-subtext">
                        {(() => {
                            const remaining = tech.cost - tech.progress;
                            const turnsRemaining = sciencePerTurn > 0 ? Math.ceil(remaining / sciencePerTurn) : Infinity;
                            const turnsText = turnsRemaining === Infinity ? "∞ turns" : `${turnsRemaining} turn${turnsRemaining !== 1 ? "s" : ""}`;
                            return `${turnsText} (${tech.progress}/${tech.cost})`;
                        })()}
                    </div>
                </>
            ) : (
                <div className="hud-subtext warn">Research is paused until you pick a tech.</div>
            )}
        </div>
    );
};







