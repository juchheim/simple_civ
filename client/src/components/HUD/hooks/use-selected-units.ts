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
        () => getUnitsOnTile(selectedCoord, units, playerId),
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

    const linkCandidate = selectedUnit ? findLinkCandidate(unitsOnTile, selectedUnit.id) : undefined;

    return {
        unitsOnTile,
        selectedUnit,
        linkedPartner,
        linkCandidate,
    };
};

const getUnitsOnTile = (coord: HexCoord | null, units: Unit[], playerId: string) => {
    if (!coord) return [];
    return units.filter(
        unit =>
            unit.coord.q === coord.q &&
            unit.coord.r === coord.r &&
            unit.ownerId === playerId,
    );
};

const findLinkCandidate = (unitsOnTile: Unit[], selectedUnitId: string) => {
    return unitsOnTile.find(u => u.id !== selectedUnitId && !u.linkedUnitId);
};
