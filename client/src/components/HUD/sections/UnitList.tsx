import React from "react";
import { Unit } from "@simple-civ/engine";

type UnitListProps = {
    units: Unit[];
    selectedUnitId: string | null;
    onSelectUnit: (unitId: string) => void;
};

export const UnitList: React.FC<UnitListProps> = ({ units, selectedUnitId, onSelectUnit }) => {
    if (units.length <= 1) return null;

    return (
        <div>
            <div className="hud-section-title">Units on Tile</div>
            <div className="hud-chip-row">
                {units.map(unit => (
                    <button
                        key={unit.id}
                        onClick={() => onSelectUnit(unit.id)}
                        className={`hud-chip-button ${selectedUnitId === unit.id ? "active" : ""}`}
                    >
                        {unit.type} (M:{unit.movesLeft})
                    </button>
                ))}
            </div>
        </div>
    );
};





