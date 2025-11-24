import React from "react";
import { HexCoord, Unit } from "@simple-civ/engine";

type UseSelectedUnitsArgs = {
    selectedCoord: HexCoord | null;
    units: Unit[];
    playerId: string;
    selectedUnitId: string | null;
    onSelectUnit: (unitId: string | null) => void;
};

export const useSelectedUnits = ({ selectedCoord, units, playerId, selectedUnitId, onSelectUnit }: UseSelectedUnitsArgs) => {
    const unitsOnTile = React.useMemo(
        () =>
            selectedCoord
                ? units.filter(
                      unit =>
                          unit.coord.q === selectedCoord.q &&
                          unit.coord.r === selectedCoord.r &&
                          unit.ownerId === playerId,
                  )
                : [],
        [selectedCoord, units, playerId],
    );

    React.useEffect(() => {
        if (unitsOnTile.length === 1 && !selectedUnitId) {
            onSelectUnit(unitsOnTile[0].id);
        }
    }, [unitsOnTile, selectedUnitId, onSelectUnit]);

    const selectedUnit = selectedUnitId ? units.find(u => u.id === selectedUnitId) ?? null : null;

    const linkedPartner = selectedUnit?.linkedUnitId ? units.find(u => u.id === selectedUnit.linkedUnitId) ?? null : null;

    const linkCandidate = selectedUnit ? unitsOnTile.find(u => u.id !== selectedUnit.id && !u.linkedUnitId) : undefined;

    return {
        unitsOnTile,
        selectedUnit,
        linkedPartner,
        linkCandidate,
    };
};

