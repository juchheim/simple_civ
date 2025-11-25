import React from "react";
import { HexCoord, Unit, City, hexEquals } from "@simple-civ/engine";

type UseSelectedUnitsArgs = {
    selectedCoord: HexCoord | null;
    units: Unit[];
    cities: City[];
    playerId: string;
    selectedUnitId: string | null;
    onSelectUnit: (unitId: string | null) => void;
};

export const useSelectedUnits = ({ selectedCoord, units, cities, playerId, selectedUnitId, onSelectUnit }: UseSelectedUnitsArgs) => {
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

    const hasCityOnTile = React.useMemo(
        () => selectedCoord ? cities.some(c => hexEquals(c.coord, selectedCoord)) : false,
        [selectedCoord, cities],
    );

    React.useEffect(() => {
        // Don't auto-select unit if there's a city on the tile (city menu should take priority)
        if (unitsOnTile.length === 1 && !selectedUnitId && !hasCityOnTile) {
            onSelectUnit(unitsOnTile[0].id);
        }
    }, [unitsOnTile, selectedUnitId, hasCityOnTile, onSelectUnit]);

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

