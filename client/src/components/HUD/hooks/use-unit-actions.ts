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
    const canLinkUnits = isMyTurn &&
        isLinkable(selectedUnit) &&
        isLinkable(linkCandidate);

    const canUnlinkUnits = isMyTurn && !!selectedUnit?.linkedUnitId && (!linkedPartner || linkedPartner.ownerId === playerId);

    const handleLinkUnits = React.useCallback(() => {
        if (!selectedUnit || !linkCandidate) return;
        onAction(buildLinkAction(playerId, selectedUnit, linkCandidate));
    }, [selectedUnit, linkCandidate, playerId, onAction]);

    const handleUnlinkUnits = React.useCallback(() => {
        if (!selectedUnit?.linkedUnitId) return;
        onAction({ type: "UnlinkUnits", playerId, unitId: selectedUnit.id, partnerId: selectedUnit.linkedUnitId });
    }, [selectedUnit, playerId, onAction]);

    const handleFoundCity = React.useCallback(() => {
        if (!selectedUnit) return;
        const name = window.prompt("City Name (leave blank for auto-generated):", "");
        if (name !== null) {
            onAction({ type: "FoundCity", playerId, unitId: selectedUnit.id, name });
        }
    }, [selectedUnit, playerId, onAction]);

    const handleToggleAutoExplore = React.useCallback(() => {
        if (!selectedUnit) return;
        if (selectedUnit.isAutoExploring) {
            onAction({ type: "ClearAutoExplore", playerId, unitId: selectedUnit.id });
        } else {
            onAction({ type: "SetAutoExplore", playerId, unitId: selectedUnit.id });
        }
    }, [selectedUnit, playerId, onAction]);

    const handleFortifyUnit = React.useCallback(() => {
        if (!selectedUnit) return;
        onAction({ type: "FortifyUnit", playerId, unitId: selectedUnit.id });
    }, [selectedUnit, playerId, onAction]);

    const handleCancelMovement = React.useCallback(() => {
        if (!selectedUnit) return;
        onAction({ type: "ClearAutoMoveTarget", playerId, unitId: selectedUnit.id });
    }, [selectedUnit, playerId, onAction]);

    return {
        canLinkUnits,
        canUnlinkUnits,
        handleLinkUnits,
        handleUnlinkUnits,
        handleFoundCity,
        handleToggleAutoExplore,
        handleFortifyUnit,
        handleCancelMovement,
    };
};

const isLinkable = (unit?: Unit | null) => {
    if (!unit) return false;
    return !unit.linkedUnitId && !unit.hasAttacked;
};

const buildLinkAction = (playerId: string, unit: Unit, partner: Unit): Action => ({
    type: "LinkUnits",
    playerId,
    unitId: unit.id,
    partnerId: partner.id,
});

