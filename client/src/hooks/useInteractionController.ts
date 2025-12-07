import { useCallback, useState } from "react";
import { Action, DiplomacyState, GameState, HexCoord, UNITS, findPath, hexDistance, hexEquals, hexToString, Unit, getCombatPreviewUnitVsUnit, getCombatPreviewUnitVsCity, CombatPreview } from "@simple-civ/engine";
import { useReachablePaths } from "./useReachablePaths";

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

    const tryAttackUnit = useCallback((
        unit: Unit,
        targetUnit: Unit,
    ) => {
        if (!gameState) return false;

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

        console.log('[DEBUG tryAutoMove] Called with unit:', unit.id, 'at', unit.coord, 'target:', coord);
        const autoPath = findPath(unit.coord, coord, unit, gameState);
        console.log('[DEBUG tryAutoMove] findPath returned:', autoPath);
        if (autoPath.length === 0) {
            console.log('[DEBUG tryAutoMove] Path is empty, returning false');
            return false;
        }

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

        console.log('[DEBUG tryAutoMove] Dispatching actions:', actions);
        runActions(actions);
        setSelectedCoord(null);
        setSelectedUnitId(null);
        return true;
    }, [gameState, playerId, runActions, setSelectedCoord, setSelectedUnitId]);

    const handleTileClick = useCallback((coord: HexCoord) => {
        if (!gameState) return;

        // Check visibility
        const key = `${coord.q},${coord.r}`;
        // Note: We don't have the pre-computed sets here, so we check the raw arrays.
        // This is slightly less efficient but fine for a click handler.
        const isVisible = gameState.visibility?.[playerId]?.includes(key) ?? false;
        const isRevealed = gameState.revealed?.[playerId]?.includes(key) ?? false;
        const isFogged = !isVisible && isRevealed;
        const isShroud = !isVisible && !isRevealed;

        // Handle fogged tiles (previously seen, not currently visible)
        if (isFogged) {
            console.log('[DEBUG FOG] Clicked fogged tile:', key, 'Selected unit:', selectedUnitId);
            // If a unit is selected, try to move to the fogged tile
            if (selectedUnitId) {
                const unit = gameState.units.find(u => u.id === selectedUnitId);
                console.log('[DEBUG FOG] Unit found:', unit?.id, 'Owner:', unit?.ownerId, 'PlayerId:', playerId);
                if (unit && unit.ownerId === playerId) {
                    // We allow movement into fog, but not direct interaction with entities (which shouldn't be visible anyway)
                    console.log('[DEBUG FOG] Trying tryPlannedPath...');
                    if (tryPlannedPath(unit, coord)) { console.log('[DEBUG FOG] tryPlannedPath succeeded'); return; }
                    console.log('[DEBUG FOG] Trying tryAdjacentMove...');
                    if (tryAdjacentMove(unit, coord)) { console.log('[DEBUG FOG] tryAdjacentMove succeeded'); return; }
                    console.log('[DEBUG FOG] Trying tryAutoMove...');
                    if (tryAutoMove(unit, coord)) { console.log('[DEBUG FOG] tryAutoMove succeeded'); return; }
                    console.log('[DEBUG FOG] All movement attempts failed');
                }
            }

            // Allow selecting the tile to see terrain info, but do NOT allow selecting units or interacting
            setSelectedCoord(coord);
            setSelectedUnitId(null);
            console.log('[DEBUG FOG] Fell through to tile selection, unit deselected');
            return;
        }

        // Handle shroud tiles (unexplored, never seen)
        if (isShroud) {
            console.log('[DEBUG SHROUD] Clicked shroud tile:', key, 'Selected unit:', selectedUnitId);
            // If a unit is selected, try to move to the shroud tile (exploration)
            if (selectedUnitId) {
                const unit = gameState.units.find(u => u.id === selectedUnitId);
                console.log('[DEBUG SHROUD] Unit found:', unit?.id, 'Owner:', unit?.ownerId, 'PlayerId:', playerId);
                if (unit && unit.ownerId === playerId) {
                    // We allow movement into shroud for exploration
                    console.log('[DEBUG SHROUD] Trying tryPlannedPath...');
                    if (tryPlannedPath(unit, coord)) { console.log('[DEBUG SHROUD] tryPlannedPath succeeded'); return; }
                    console.log('[DEBUG SHROUD] Trying tryAdjacentMove...');
                    if (tryAdjacentMove(unit, coord)) { console.log('[DEBUG SHROUD] tryAdjacentMove succeeded'); return; }
                    console.log('[DEBUG SHROUD] Trying tryAutoMove...');
                    if (tryAutoMove(unit, coord)) { console.log('[DEBUG SHROUD] tryAutoMove succeeded'); return; }
                    console.log('[DEBUG SHROUD] All movement attempts failed');
                }
            }

            // Don't select shroud tiles or deselect units - just ignore if no movement possible
            console.log('[DEBUG SHROUD] No movement, ignoring click');
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

        const linkedUnit = friendlyUnits.find(u =>
            u.linkedUnitId && friendlyUnits.some(partner => partner.id === u.linkedUnitId),
        );
        setSelectedUnitId(linkedUnit?.id ?? friendlyUnits[0].id);
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
