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
            <h4>Units on Tile:</h4>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {units.map(unit => (
                    <button
                        key={unit.id}
                        onClick={() => onSelectUnit(unit.id)}
                        style={{
                            background: selectedUnitId === unit.id ? "#4CAF50" : "#666",
                            border: selectedUnitId === unit.id ? "2px solid white" : "1px solid #999",
                            padding: "5px 10px",
                        }}
                    >
                        {unit.type} (M:{unit.movesLeft})
                    </button>
                ))}
            </div>
        </div>
    );
};

