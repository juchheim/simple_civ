import React from "react";
import { DiplomacyAlert } from "../hooks/use-diplomacy-alerts";
import { GameState } from "@simple-civ/engine";

interface DiplomacyAlertModalProps {
    alert: DiplomacyAlert;
    gameState: GameState;
    onOpenDiplomacy?: () => void;
    onDismiss: () => void;
}

export const DiplomacyAlertModal: React.FC<DiplomacyAlertModalProps> = ({ alert, gameState: _gameState, onOpenDiplomacy, onDismiss }) => {
    const isWar = alert.type === "WarDeclared";
    const isProgressRace = alert.type === "ProgressRace";
    const isCapitalCapture = alert.type === "CapitalCaptured";
    const isUniqueBuilding = alert.type === "UniqueBuilding";
    const isEraTransition = alert.type === "EraTransition";
    const isCityRazed = alert.type === "CityRazed";

    let title: string;
    let message: string;
    let icon: string;
    let borderColor: string;
    let showDiplomacyButton = true;
    let subtitle: string | undefined;

    if (isProgressRace) {
        const milestone = alert.progressMilestone;

        if (milestone === "GrandExperiment") {
            // Only triggers when building - game ends immediately on completion
            title = "Progress Victory Threat!";
            message = `The ${alert.civName} is working on the Grand Experiment! They are dangerously close to Progress Victory.`;
            icon = "⚗️";
            borderColor = "#f59e0b"; // Amber/orange for warning
            showDiplomacyButton = false;
        } else if (milestone === "GrandAcademy") {
            title = "Progress Milestone Reached";
            message = `The ${alert.civName} has completed the Grand Academy. They are advancing toward Progress Victory.`;
            icon = "🔬";
            borderColor = "#3b82f6"; // Blue
            showDiplomacyButton = false;
        } else {
            title = "Progress Path Started";
            message = `The ${alert.civName} has completed the Observatory. They have begun the Progress Victory path.`;
            icon = "🔭";
            borderColor = "#8b5cf6"; // Purple
            showDiplomacyButton = false;
        }
    } else if (isCapitalCapture) {
        title = "Capital Captured!";
        message = `The ${alert.civName} has captured ${alert.cityName || "a capital"}!`;
        subtitle = `They now control ${alert.capitalCount || 1} capital${(alert.capitalCount || 1) !== 1 ? "s" : ""}.`;
        icon = "🏛️";
        borderColor = "#dc2626"; // Red for conquest
        showDiplomacyButton = false;
    } else if (isUniqueBuilding) {
        const buildingName = alert.buildingType === "TitansCore"
            ? "Titan's Core"
            : alert.buildingType === "SpiritObservatory"
                ? "Spirit Observatory"
                : "Jade Granary";
        const isStarted = alert.buildingStatus === "Started";

        title = isStarted ? `${buildingName} Construction Begun` : `${buildingName} Completed`;
        message = isStarted
            ? `The ${alert.civName} has begun construction of the ${buildingName}.`
            : `The ${alert.civName} has completed the ${buildingName}!`;

        if (alert.buildingType === "TitansCore" && !isStarted) {
            subtitle = "The Titan has been summoned!";
        } else if (alert.buildingType === "SpiritObservatory" && !isStarted) {
            subtitle = "The Revelation: +1 Science per city";
        } else if (alert.buildingType === "JadeGranary" && !isStarted) {
            subtitle = "The Great Harvest: +1 Pop per city, 15% cheaper growth";
        }

        icon = alert.buildingType === "TitansCore" ? "⚙️" : alert.buildingType === "SpiritObservatory" ? "🔭" : "🌾";
        borderColor = isStarted ? "#f59e0b" : "#10b981"; // Amber for started, green for completed
        showDiplomacyButton = false;
    } else if (isEraTransition) {
        const eraName = alert.era === "Banner" ? "Banner" : alert.era === "Engine" ? "Engine" : "Hearth";
        title = "Era Transition";
        message = `The ${alert.civName} has entered the ${eraName} Era.`;
        icon = "📜";
        borderColor = "#8b5cf6"; // Purple
        showDiplomacyButton = false;
    } else if (isCityRazed) {
        title = "City Destroyed";
        message = `The ${alert.civName} has razed ${alert.cityName || "a city"}!`;
        icon = "🔥";
        borderColor = "#dc2626"; // Red
        showDiplomacyButton = false;
    } else if (alert.type === "CivDefeated") {
        title = "Civilization Defeated";
        message = `The ${alert.civName} has been eliminated from the game!`;
        subtitle = "One less rival to contend with.";
        icon = "💀";
        borderColor = "#6b7280"; // Gray for defeat
        showDiplomacyButton = false;
    } else {
        title = isWar ? "Declaration of War" : "Peace Proposal";
        message = isWar
            ? `The ${alert.civName} has declared war on you!`
            : `The ${alert.civName} has offered a peace treaty.`;
        icon = isWar ? "⚔️" : "🕊️";
        borderColor = isWar ? "#ef4444" : "var(--color-highlight)";
    }

    return (
        <div style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 1000,
            pointerEvents: "auto"
        }}>
            <div className="hud-card" style={{
                width: "min(400px, 90vw)",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
                border: `1px solid ${borderColor}`
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                        fontSize: 24,
                        lineHeight: 1,
                        color: borderColor
                    }}>
                        {icon}
                    </div>
                    <div>
                        <div className="hud-section-title" style={{ marginBottom: 2 }}>Diplomatic Alert</div>
                        <div className="hud-title-sm" style={{ fontSize: 18 }}>{title}</div>
                    </div>
                </div>

                <div className="hud-paragraph" style={{ fontSize: 14 }}>
                    {message}
                </div>

                {subtitle && (
                    <div className="hud-subtext" style={{ fontStyle: "italic", color: "var(--color-text-secondary)" }}>
                        {subtitle}
                    </div>
                )}

                {!isProgressRace && !isCapitalCapture && !isUniqueBuilding && !isEraTransition && !isCityRazed && (
                    <div className="hud-subtext">
                        Visit the Diplomacy tab to respond to this event.
                    </div>
                )}

                {isProgressRace && (
                    <div className="hud-subtext">
                        Consider prioritizing Progress Victory projects to compete, or prepare for military action to prevent their victory.
                    </div>
                )}

                {isCapitalCapture && (
                    <div className="hud-subtext">
                        Monitor their conquest progress and consider defensive measures.
                    </div>
                )}

                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    {showDiplomacyButton && onOpenDiplomacy && (
                        <button
                            className={`hud-button ${isWar ? "danger" : ""}`}
                            style={{ flex: 1 }}
                            onClick={onOpenDiplomacy}
                        >
                            Open Diplomacy
                        </button>
                    )}
                    <button
                        className="hud-button ghost"
                        style={showDiplomacyButton ? {} : { flex: 1 }}
                        onClick={onDismiss}
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    );
};
