import { useCallback, useState } from "react";
import { Action, DiplomacyState, GameState, HexCoord, UNITS, findPath, hexDistance, hexEquals, hexToString } from "@simple-civ/engine";
import { useReachablePaths } from "./useReachablePaths";

type PendingWar = { action: Action; targetPlayerId: string } | null;

type InteractionControllerParams = {
    gameState: GameState | null;
    playerId: string;
    dispatchAction: (action: Action) => void;
    runActions: (actions: Action[]) => void;
};

export function useInteractionController({
    gameState,
    playerId,
    dispatchAction,
    runActions,
}: InteractionControllerParams) {
    const [selectedCoord, setSelectedCoord] = useState<HexCoord | null>(null);
    const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
    const [hoveredCoord, setHoveredCoord] = useState<HexCoord | null>(null);
    const [pendingWarAttack, setPendingWarAttack] = useState<PendingWar>(null);

    const { reachablePaths, reachableCoordSet } = useReachablePaths(gameState, playerId, selectedUnitId);
    const diplomacy = gameState?.diplomacy;

    const tryAttackUnit = useCallback((
        unit: { id: string; ownerId: string },
        targetUnit: { id: string; ownerId: string },
    ) => {
        const attackAction: Action = {
            type: "Attack",
            playerId,
            attackerId: unit.id,
            targetId: targetUnit.id,
            targetType: "Unit"
        };

        const diplomacyState = diplomacy?.[playerId]?.[targetUnit.ownerId] || DiplomacyState.Peace;
        if (diplomacyState === DiplomacyState.Peace) {
            setPendingWarAttack({ action: attackAction, targetPlayerId: targetUnit.ownerId });
        } else {
            dispatchAction(attackAction);
            setSelectedCoord(null);
            setSelectedUnitId(null);
        }
        return true;
    }, [diplomacy, dispatchAction, playerId, setPendingWarAttack, setSelectedCoord, setSelectedUnitId]);

    const tryAttackCity = useCallback((
        unit: any,
        targetCity: any,
    ) => {
        const unitStats = UNITS[unit.type as keyof typeof UNITS];
        const dist = hexDistance(unit.coord, targetCity.coord);
        if (dist > unitStats.rng || targetCity.hp <= 0) return false;

        const attackAction: Action = {
            type: "Attack",
            playerId,
            attackerId: unit.id,
            targetId: targetCity.id,
            targetType: "City"
        };

        const diplomacyState = diplomacy?.[playerId]?.[targetCity.ownerId] || DiplomacyState.Peace;
        if (diplomacyState === DiplomacyState.Peace) {
            setPendingWarAttack({ action: attackAction, targetPlayerId: targetCity.ownerId });
        } else {
            dispatchAction(attackAction);
            setSelectedCoord(null);
            setSelectedUnitId(null);
        }
        return true;
    }, [diplomacy, dispatchAction, playerId, setPendingWarAttack, setSelectedCoord, setSelectedUnitId]);

    const trySwapOrStack = useCallback((unit: any, friendlyUnitOnTile: any, coord: HexCoord) => {
        const distance = hexDistance(unit.coord, friendlyUnitOnTile.coord);
        if (distance !== 1 || unit.movesLeft <= 0) {
            setSelectedCoord(coord);
            setSelectedUnitId(friendlyUnitOnTile.id);
            return true;
        }

        const unitStats = UNITS[unit.type];
        const targetStats = UNITS[friendlyUnitOnTile.type];
        const canStack = (unitStats.domain === "Civilian" && targetStats.domain !== "Civilian") ||
            (unitStats.domain !== "Civilian" && targetStats.domain === "Civilian");

        if (canStack) {
            dispatchAction({
                type: "MoveUnit",
                playerId,
                unitId: unit.id,
                to: coord
            });
            setSelectedCoord(coord);
            setSelectedUnitId(unit.id);
            return true;
        }

        dispatchAction({
            type: "SwapUnits",
            playerId,
            unitId: unit.id,
            targetUnitId: friendlyUnitOnTile.id
        });
        setSelectedCoord(coord);
        setSelectedUnitId(unit.id);
        return true;
    }, [dispatchAction, playerId, setSelectedCoord, setSelectedUnitId]);

    const tryPlannedPath = useCallback((unit: any, coord: HexCoord) => {
        const coordKey = hexToString(coord);
        const plannedInfo = reachablePaths[coordKey];
        const plannedPath = plannedInfo?.path;
        if (!plannedPath || plannedPath.length === 0) return false;

        runActions(plannedPath.map((step: HexCoord) => ({
            type: "MoveUnit",
            playerId,
            unitId: unit.id,
            to: step,
        })));

        if (plannedInfo.movesLeft === 0) {
            setSelectedCoord(null);
            setSelectedUnitId(null);
        } else {
            setSelectedCoord(coord);
            setSelectedUnitId(unit.id);
        }
        return true;
    }, [playerId, reachablePaths, runActions, setSelectedCoord, setSelectedUnitId]);

    const tryAdjacentMove = useCallback((unit: any, coord: HexCoord) => {
        if (hexDistance(unit.coord, coord) !== 1 || unit.movesLeft <= 0) return false;

        dispatchAction({
            type: "MoveUnit",
            playerId,
            unitId: unit.id,
            to: coord
        });
        if (unit.movesLeft === 1) {
            setSelectedCoord(null);
            setSelectedUnitId(null);
        } else {
            setSelectedCoord(coord);
            setSelectedUnitId(unit.id);
        }
        return true;
    }, [dispatchAction, playerId, setSelectedCoord, setSelectedUnitId]);

    const tryAutoMove = useCallback((unit: any, coord: HexCoord) => {
        if (!gameState) return false;

        const autoPath = findPath(unit.coord, coord, unit, gameState);
        if (autoPath.length === 0) return false;

        const actions: Action[] = [{
            type: "SetAutoMoveTarget",
            playerId,
            unitId: unit.id,
            target: coord
        }];

        const firstStep = autoPath[0];
        if (firstStep && hexDistance(unit.coord, firstStep) === 1 && unit.movesLeft > 0) {
            actions.push({
                type: "MoveUnit",
                playerId,
                unitId: unit.id,
                to: firstStep
            });
        }

        runActions(actions);
        setSelectedCoord(null);
        setSelectedUnitId(null);
        return true;
    }, [gameState, playerId, runActions, setSelectedCoord, setSelectedUnitId]);

    const handleTileClick = useCallback((coord: HexCoord) => {
        if (!gameState) return;

        if (selectedUnitId) {
            const unit = gameState.units.find(u => u.id === selectedUnitId);
            if (unit && unit.ownerId === playerId) {
                const targetUnit = gameState.units.find(u => hexEquals(u.coord, coord));

                if (targetUnit && targetUnit.ownerId !== playerId) {
                    if (tryAttackUnit(unit, targetUnit)) return;
                }

                const targetCity = gameState.cities.find(c => hexEquals(c.coord, coord));
                if (targetCity && targetCity.ownerId !== playerId) {
                    if (tryAttackCity(unit, targetCity)) return;
                }

                const friendlyUnitOnTile = gameState.units.find(u => hexEquals(u.coord, coord) && u.ownerId === playerId);
                if (friendlyUnitOnTile && friendlyUnitOnTile.id !== unit.id) {
                    if (trySwapOrStack(unit, friendlyUnitOnTile, coord)) return;
                }

                if (hexEquals(unit.coord, coord)) {
                    setSelectedUnitId(null);
                    setSelectedCoord(null);
                    return;
                }

                if (tryPlannedPath(unit, coord)) return;
                if (tryAdjacentMove(unit, coord)) return;
                if (tryAutoMove(unit, coord)) return;
            }
        }

        setSelectedCoord(coord);

        const cityOnTile = gameState.cities.find(c => hexEquals(c.coord, coord));
        if (cityOnTile) {
            setSelectedUnitId(null);
            return;
        }

        const friendlyUnits = gameState.units.filter(
            u => u.ownerId === playerId && hexEquals(u.coord, coord),
        );
        if (friendlyUnits.length === 0) {
            const enemyUnit = gameState.units.find(u => hexEquals(u.coord, coord));
            if (enemyUnit) {
                setSelectedUnitId(enemyUnit.id);
                return;
            }
            setSelectedUnitId(null);
            return;
        }

        const linkedUnit = friendlyUnits.find(u =>
            u.linkedUnitId && friendlyUnits.some(partner => partner.id === u.linkedUnitId),
        );
        setSelectedUnitId(linkedUnit?.id ?? friendlyUnits[0].id);
    }, [gameState, selectedUnitId, playerId, tryAttackUnit, tryAttackCity, trySwapOrStack, tryPlannedPath, tryAdjacentMove, tryAutoMove]);

    return {
        selectedCoord,
        setSelectedCoord,
        selectedUnitId,
        setSelectedUnitId,
        hoveredCoord,
        setHoveredCoord,
        pendingWarAttack,
        setPendingWarAttack,
        handleTileClick,
        reachableCoordSet,
    };
}
