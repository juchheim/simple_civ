import React from "react";
import { Unit, UnitType } from "@simple-civ/engine";

type UnitPanelProps = {
    unit: Unit;
    linkedPartner: Unit | null;
    canLinkUnits: boolean;
    canUnlinkUnits: boolean;
    isMyTurn: boolean;
    onLinkUnits: () => void;
    onUnlinkUnits: () => void;
    onFoundCity: () => void;
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
}) => (
    <div style={{ marginTop: 10 }}>
        <div className="hud-section-title">Selected Unit</div>
        <p className="hud-title-sm" style={{ margin: "2px 0 8px 0" }}>
            Unit: {unit.type}
        </p>
        <div className="hud-chip-row">
            <span className="hud-chip">Moves: {unit.movesLeft}</span>
            <span className="hud-chip">HP: {unit.hp}</span>
            {linkedPartner && <span className="hud-chip success">Linked with {linkedPartner.type}</span>}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            <button className="hud-button small" onClick={onLinkUnits} disabled={!canLinkUnits}>
                Link
            </button>
            <button className="hud-button small ghost" onClick={onUnlinkUnits} disabled={!canUnlinkUnits}>
                Unlink
            </button>
        </div>
        {unit.type === UnitType.Settler && isMyTurn && (
            <button className="hud-button small" style={{ marginTop: 8 }} onClick={onFoundCity}>
                Found City
            </button>
        )}
    </div>
);
