import React from "react";
import { Player } from "@simple-civ/engine";

type TechButtonProps = {
    player: Player | undefined;
    onShowTechTree: () => void;
};

export const TechButton: React.FC<TechButtonProps> = ({ player, onShowTechTree }) => (
    <div>
        <h4>Research</h4>
        {player?.currentTech ? (
            <div>
                <p style={{ margin: "5px 0" }}>{player.currentTech.id}</p>
                <p style={{ margin: "5px 0", fontSize: "12px" }}>
                    Progress: {player.currentTech.progress}/{player.currentTech.cost}
                </p>
            </div>
        ) : (
            <p style={{ margin: "5px 0", color: "#ff9800" }}>No active research</p>
        )}
        <button onClick={onShowTechTree} style={{ marginTop: "10px" }}>
            Tech Tree
        </button>
    </div>
);

