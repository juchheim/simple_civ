import React from "react";
import { Player } from "@simple-civ/engine";
import { formatName } from "../../../utils/strings";

type TechButtonProps = {
    player: Player | undefined;
    onShowTechTree: () => void;
};

export const TechButton: React.FC<TechButtonProps> = ({ player, onShowTechTree }) => {
    const tech = player?.currentTech;
    const progress = tech ? Math.min(100, Math.round((tech.progress / tech.cost) * 100)) : 0;

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
                    className="hud-button"
                    style={{
                        background: "var(--color-highlight-strong)",
                        color: "var(--color-bg-main)",
                        borderColor: "var(--color-highlight-strong)"
                    }}
                    onClick={onShowTechTree}
                >
                    Tech Tree
                </button>
            </div>
            {tech ? (
                <>
                    <div className="hud-progress">
                        <div className="hud-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="hud-subtext">Progress: {tech.progress}/{tech.cost}</div>
                </>
            ) : (
                <div className="hud-subtext warn">Research is paused until you pick a tech.</div>
            )}
        </div>
    );
};





