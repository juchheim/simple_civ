import { useCallback, useState } from "react";
import { Action, GameState, HexCoord, UNITS, findPath, hexDistance, hexEquals, hexToString, Unit, getCombatPreviewUnitVsUnit, getCombatPreviewUnitVsCity, CombatPreview } from "@simple-civ/engine";
import { useReachablePaths } from "./useReachablePaths";
import {
    canUnitAttackCity,
    canUnitsStack,
    createAttackAction,
    createMoveUnitAction,
    getEnemyTerritoryOwnerAtPeaceForCoord,
    getTileVisibilityState,
    isAtPeaceWithTarget,
    pickLinkedOrFirstFriendlyUnitId,
} from "./interaction-controller-helpers";

type PendingWar = { action: Action; targetPlayerId: string } | null;

type PendingCombatPreview = {
    preview: CombatPreview;
    action: Action;
} | null;

type InteractionControllerParams = {
    gameState: GameState | null;
    playerId: string;
    dispatchAction: (action: Action) => void;
    runActions: (actions: Action[]) => void;
    showCombatPreview?: boolean;
};

export function useInteractionController({
    gameState,
    playerId,
    dispatchAction,
    runActions,
    showCombatPreview = true,
}: InteractionControllerParams) {
    const [selectedCoord, setSelectedCoord] = useState<HexCoord | null>(null);
    const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
    const [pendingWarAttack, setPendingWarAttack] = useState<PendingWar>(null);
    const [pendingCombatPreview, setPendingCombatPreview] = useState<PendingCombatPreview>(null);

    const { reachablePaths, reachableCoordSet } = useReachablePaths(gameState, playerId, selectedUnitId);
    const diplomacy = gameState?.diplomacy;

    const getEnemyTerritoryOwnerAtPeace = useCallback((coord: HexCoord): string | null => {
        if (!gameState) return null;
        return getEnemyTerritoryOwnerAtPeaceForCoord(gameState, playerId, diplomacy, coord);
    }, [gameState, playerId, diplomacy]);

    const tryAttackUnit = useCallback((
        unit: Unit,
        targetUnit: Unit,
    ) => {
        if (!gameState) return false;

        const attackAction = createAttackAction(playerId, unit.id, targetUnit.id, "Unit");

        // Native units (ownerId "natives") are always attackable without war
        const isNative = targetUnit.ownerId === "natives";
        if (!isNative && isAtPeaceWithTarget(diplomacy, playerId, targetUnit.ownerId)) {
            setPendingWarAttack({ action: attackAction, targetPlayerId: targetUnit.ownerId });
        } else if (showCombatPreview) {
            const preview = getCombatPreviewUnitVsUnit(gameState, unit, targetUnit);
            setPendingCombatPreview({ preview, action: attackAction });
        } else {
            dispatchAction(attackAction);
            setSelectedCoord(null);
            setSelectedUnitId(null);
        }
        return true;
    }, [diplomacy, dispatchAction, gameState, playerId, showCombatPreview, setPendingWarAttack, setSelectedCoord, setSelectedUnitId]);

    const tryAttackCity = useCallback((
        unit: Unit,
        targetCity: any,
    ) => {
        if (!gameState) return false;

        // Only military units can attack cities (not civilians like Settlers)
        if (!canUnitAttackCity(unit)) return false;
        const unitStats = UNITS[unit.type as keyof typeof UNITS];

        const dist = hexDistance(unit.coord, targetCity.coord);
        if (dist > unitStats.rng || targetCity.hp <= 0) return false;

        const attackAction = createAttackAction(playerId, unit.id, targetCity.id, "City");

        if (isAtPeaceWithTarget(diplomacy, playerId, targetCity.ownerId)) {
            setPendingWarAttack({ action: attackAction, targetPlayerId: targetCity.ownerId });
        } else if (showCombatPreview) {
            const preview = getCombatPreviewUnitVsCity(gameState, unit, targetCity);
            setPendingCombatPreview({ preview, action: attackAction });
        } else {
            dispatchAction(attackAction);
            setSelectedCoord(null);
            setSelectedUnitId(null);
        }
        return true;
    }, [diplomacy, dispatchAction, gameState, playerId, showCombatPreview, setPendingWarAttack, setSelectedCoord, setSelectedUnitId]);

    const trySwapOrStack = useCallback((unit: Unit, friendlyUnitOnTile: Unit, coord: HexCoord) => {
        const distance = hexDistance(unit.coord, friendlyUnitOnTile.coord);
        if (distance !== 1 || unit.movesLeft <= 0) {
            setSelectedCoord(coord);
            setSelectedUnitId(friendlyUnitOnTile.id);
            return true;
        }

        const canStack = canUnitsStack(unit, friendlyUnitOnTile);

        if (canStack) {
            dispatchAction(createMoveUnitAction(playerId, unit.id, coord));
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

        // Check if the first step enters enemy territory at peace
        const firstStep = plannedPath[0];
        const enemyOwner = getEnemyTerritoryOwnerAtPeace(firstStep);
        if (enemyOwner) {
            // Queue war declaration for the first move into enemy territory
            const moveAction = createMoveUnitAction(playerId, unit.id, firstStep);
            setPendingWarAttack({ action: moveAction, targetPlayerId: enemyOwner });
            return true;
        }

        runActions(plannedPath.map((step: HexCoord) => createMoveUnitAction(playerId, unit.id, step)));

        if (plannedInfo.movesLeft === 0) {
            setSelectedCoord(null);
            setSelectedUnitId(null);
        } else {
            setSelectedCoord(coord);
            setSelectedUnitId(unit.id);
        }
        return true;
    }, [playerId, reachablePaths, runActions, setSelectedCoord, setSelectedUnitId, getEnemyTerritoryOwnerAtPeace, setPendingWarAttack]);

    const tryAdjacentMove = useCallback((unit: any, coord: HexCoord) => {
        if (hexDistance(unit.coord, coord) !== 1 || unit.movesLeft <= 0) return false;

        // Check if entering enemy territory at peace
        const enemyOwner = getEnemyTerritoryOwnerAtPeace(coord);
        if (enemyOwner) {
            const moveAction = createMoveUnitAction(playerId, unit.id, coord);
            setPendingWarAttack({ action: moveAction, targetPlayerId: enemyOwner });
            return true;
        }

        dispatchAction(createMoveUnitAction(playerId, unit.id, coord));
        if (unit.movesLeft === 1) {
            setSelectedCoord(null);
            setSelectedUnitId(null);
        } else {
            setSelectedCoord(coord);
            setSelectedUnitId(unit.id);
        }
        return true;
    }, [dispatchAction, playerId, setSelectedCoord, setSelectedUnitId, getEnemyTerritoryOwnerAtPeace, setPendingWarAttack]);

    const tryAutoMove = useCallback((unit: any, coord: HexCoord) => {
        if (!gameState) return false;

        const autoPath = findPath(unit.coord, coord, unit, gameState);
        if (autoPath.length === 0) {
            return false;
        }

        // Check if the first step enters enemy territory at peace
        const firstStep = autoPath[0];
        if (firstStep && hexDistance(unit.coord, firstStep) === 1 && unit.movesLeft > 0) {
            const enemyOwner = getEnemyTerritoryOwnerAtPeace(firstStep);
            if (enemyOwner) {
                const moveAction = createMoveUnitAction(playerId, unit.id, firstStep);
                setPendingWarAttack({ action: moveAction, targetPlayerId: enemyOwner });
                return true;
            }
        }

        const actions: Action[] = [{
            type: "SetAutoMoveTarget",
            playerId,
            unitId: unit.id,
            target: coord
        }];

        if (firstStep && hexDistance(unit.coord, firstStep) === 1 && unit.movesLeft > 0) {
            actions.push(createMoveUnitAction(playerId, unit.id, firstStep));
        }

        runActions(actions);
        setSelectedCoord(null);
        setSelectedUnitId(null);
        return true;
    }, [gameState, playerId, runActions, setSelectedCoord, setSelectedUnitId, getEnemyTerritoryOwnerAtPeace, setPendingWarAttack]);

    const handleTileClick = useCallback((coord: HexCoord) => {
        if (!gameState) return;

        // Check visibility
        const visibilityState = getTileVisibilityState(gameState, playerId, coord);
        const isFogged = visibilityState === "fogged";
        const isShroud = visibilityState === "shroud";

        // Handle fogged tiles (previously seen, not currently visible)
        if (isFogged) {
            // If a unit is selected, try to move to the fogged tile
            if (selectedUnitId) {
                const unit = gameState.units.find(u => u.id === selectedUnitId);
                if (unit && unit.ownerId === playerId) {
                    // We allow movement into fog, but not direct interaction with entities (which shouldn't be visible anyway)
                    if (tryPlannedPath(unit, coord)) return;
                    if (tryAdjacentMove(unit, coord)) return;
                    if (tryAutoMove(unit, coord)) return;
                }
            }

            // Allow selecting the tile to see terrain info, but do NOT allow selecting units or interacting
            setSelectedCoord(coord);
            setSelectedUnitId(null);
            return;
        }

        // Handle shroud tiles (unexplored, never seen)
        if (isShroud) {
            // If a unit is selected, try to move to the shroud tile (exploration)
            if (selectedUnitId) {
                const unit = gameState.units.find(u => u.id === selectedUnitId);
                if (unit && unit.ownerId === playerId) {
                    // We allow movement into shroud for exploration
                    if (tryPlannedPath(unit, coord)) return;
                    if (tryAdjacentMove(unit, coord)) return;
                    if (tryAutoMove(unit, coord)) return;
                }
            }

            // Don't select shroud tiles or deselect units - just ignore if no movement possible
            return;
        }

        if (selectedUnitId) {
            const unit = gameState.units.find(u => u.id === selectedUnitId);
            if (unit && unit.ownerId === playerId) {
                // Check for city first - garrisoned units are protected by the city
                const targetCity = gameState.cities.find(c => hexEquals(c.coord, coord));
                if (targetCity && targetCity.ownerId !== playerId) {
                    if (tryAttackCity(unit, targetCity)) return;
                }

                // Only try to attack a unit if there's no city on the tile
                const targetUnit = gameState.units.find(u => hexEquals(u.coord, coord));
                if (targetUnit && targetUnit.ownerId !== playerId && !targetCity) {
                    if (tryAttackUnit(unit, targetUnit)) return;
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

        setSelectedUnitId(pickLinkedOrFirstFriendlyUnitId(friendlyUnits));
    }, [gameState, selectedUnitId, playerId, tryAttackUnit, tryAttackCity, trySwapOrStack, tryPlannedPath, tryAdjacentMove, tryAutoMove]);

    const confirmCombatPreview = useCallback(() => {
        if (pendingCombatPreview) {
            dispatchAction(pendingCombatPreview.action);
            setPendingCombatPreview(null);
            setSelectedCoord(null);
            setSelectedUnitId(null);
        }
    }, [pendingCombatPreview, dispatchAction, setSelectedCoord, setSelectedUnitId]);

    const cancelCombatPreview = useCallback(() => {
        setPendingCombatPreview(null);
    }, []);

    return {
        selectedCoord,
        setSelectedCoord,
        selectedUnitId,
        setSelectedUnitId,
        pendingWarAttack,
        setPendingWarAttack,
        pendingCombatPreview,
        confirmCombatPreview,
        cancelCombatPreview,
        handleTileClick,
        reachableCoordSet,
    };
}
