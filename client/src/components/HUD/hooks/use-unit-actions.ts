import React from "react";
import { Action, Unit } from "@simple-civ/engine";

type UseUnitActionsArgs = {
    isMyTurn: boolean;
    selectedUnit: Unit | null;
    linkCandidate?: Unit;
    linkedPartner?: Unit | null;
    playerId: string;
    onAction: (action: Action) => void;
};

export const useUnitActions = ({ isMyTurn, selectedUnit, linkCandidate, linkedPartner, playerId, onAction }: UseUnitActionsArgs) => {
    const canLinkUnits =
        isMyTurn &&
        !!selectedUnit &&
        !!linkCandidate &&
        !selectedUnit.linkedUnitId &&
        !selectedUnit.hasAttacked &&
        !linkCandidate.hasAttacked;

    const canUnlinkUnits = isMyTurn && !!selectedUnit?.linkedUnitId && (!linkedPartner || linkedPartner.ownerId === playerId);

    const handleLinkUnits = React.useCallback(() => {
        if (!selectedUnit || !linkCandidate) return;
        onAction({ type: "LinkUnits", playerId, unitId: selectedUnit.id, partnerId: linkCandidate.id });
    }, [selectedUnit, linkCandidate, playerId, onAction]);

    const handleUnlinkUnits = React.useCallback(() => {
        if (!selectedUnit?.linkedUnitId) return;
        onAction({ type: "UnlinkUnits", playerId, unitId: selectedUnit.id, partnerId: selectedUnit.linkedUnitId });
    }, [selectedUnit, playerId, onAction]);

    const handleFoundCity = React.useCallback(() => {
        if (!selectedUnit) return;
        const name = window.prompt("City Name:", "New City");
        if (name) {
            onAction({ type: "FoundCity", playerId, unitId: selectedUnit.id, name });
        }
    }, [selectedUnit, playerId, onAction]);

    return {
        canLinkUnits,
        canUnlinkUnits,
        handleLinkUnits,
        handleUnlinkUnits,
        handleFoundCity,
    };
};

