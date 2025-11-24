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
    <div>
        <h4>Unit: {unit.type}</h4>
        <p>Moves: {unit.movesLeft}</p>
        <p>HP: {unit.hp}</p>
        {linkedPartner && (
            <p style={{ fontSize: 12, color: "#c6ddff" }}>
                Linked with {linkedPartner.type}
            </p>
        )}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            <button onClick={onLinkUnits} disabled={!canLinkUnits}>
                Link
            </button>
            <button onClick={onUnlinkUnits} disabled={!canUnlinkUnits}>
                Unlink
            </button>
        </div>
        {unit.type === UnitType.Settler && isMyTurn && (
            <button onClick={onFoundCity}>Found City</button>
        )}
    </div>
);

