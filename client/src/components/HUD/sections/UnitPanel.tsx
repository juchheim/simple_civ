import React from "react";
import { Unit, UnitType, GameState, getUnitCombatStats, UnitState } from "@simple-civ/engine";

type UnitPanelProps = {
    unit: Unit;
    linkedPartner: Unit | null;
    canLinkUnits: boolean;
    canUnlinkUnits: boolean;
    isMyTurn: boolean;
    onLinkUnits: () => void;
    onUnlinkUnits: () => void;
    onFoundCity: () => void;
    onToggleAutoExplore: () => void;
    onFortifyUnit: () => void;
    gameState: GameState;
};

export const UnitPanel: React.FC<UnitPanelProps> = ({
    unit,
    linkedPartner,
    canLinkUnits,
    canUnlinkUnits,
    isMyTurn,
    onLinkUnits,
    onUnlinkUnits,
    onFoundCity,
    onToggleAutoExplore,
    onFortifyUnit,
    gameState,
}) => {
    const stats = React.useMemo(() => getUnitCombatStats(unit, gameState), [unit, gameState]);

    const canFortify = isMyTurn && unit.movesLeft > 0 && unit.type !== UnitType.Settler && unit.state !== UnitState.Fortified;

    return (
        <div style={{ marginTop: 10 }}>
            <div className="hud-section-title">Selected Unit</div>
            <p className="hud-title-sm" style={{ margin: "2px 0 8px 0" }}>
                Unit: {unit.type}
            </p>
            <div className="hud-chip-row">
                <span className="hud-chip">Moves: {unit.movesLeft}</span>
                <span className="hud-chip">HP: {unit.hp}</span>
                <span className="hud-chip">Atk: {stats.atk}</span>
                <span className="hud-chip">Def: {stats.def}</span>
                <span className="hud-chip">Rng: {stats.rng}</span>
                {linkedPartner && <span className="hud-chip success">Linked with {linkedPartner.type}</span>}
                {unit.isAutoExploring && <span className="hud-chip success">Auto Exploring</span>}
                {unit.state === UnitState.Fortified && <span className="hud-chip success">Fortified</span>}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                <button className="hud-button small" onClick={onLinkUnits} disabled={!canLinkUnits}>
                    Link
                </button>
                <button className="hud-button small ghost" onClick={onUnlinkUnits} disabled={!canUnlinkUnits}>
                    Unlink
                </button>
                <button className="hud-button small" onClick={onFortifyUnit} disabled={!canFortify}>
                    Fortify
                </button>
            </div>
            {unit.type === UnitType.Settler && isMyTurn && (
                <button className="hud-button small primary" style={{ marginTop: 8 }} onClick={onFoundCity}>
                    Found City
                </button>
            )}
            {unit.type === UnitType.Scout && isMyTurn && (
                <button className="hud-button small" style={{ marginTop: 8 }} onClick={onToggleAutoExplore}>
                    {unit.isAutoExploring ? "Stop Auto Explore" : "Auto Explore"}
                </button>
            )}
        </div>
    );
};
