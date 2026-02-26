import { Action, DiplomacyState, GameState, HexCoord, hexEquals, Unit, UNITS } from "@simple-civ/engine";

export type TileVisibilityState = "visible" | "fogged" | "shroud";

export function getTileVisibilityState(
    gameState: GameState,
    playerId: string,
    coord: HexCoord,
): TileVisibilityState {
    const key = `${coord.q},${coord.r}`;
    const isVisible = gameState.visibility?.[playerId]?.includes(key) ?? false;
    const isRevealed = gameState.revealed?.[playerId]?.includes(key) ?? false;
    if (isVisible) return "visible";
    if (isRevealed) return "fogged";
    return "shroud";
}

export function isAtPeaceWithTarget(
    diplomacy: GameState["diplomacy"] | undefined,
    playerId: string,
    targetPlayerId: string,
): boolean {
    const diplomacyState = diplomacy?.[playerId]?.[targetPlayerId] || DiplomacyState.Peace;
    return diplomacyState === DiplomacyState.Peace;
}

export function getEnemyTerritoryOwnerAtPeaceForCoord(
    gameState: GameState,
    playerId: string,
    diplomacy: GameState["diplomacy"] | undefined,
    coord: HexCoord,
): string | null {
    const tile = gameState.map.tiles.find(t => hexEquals(t.coord, coord));
    if (!tile?.ownerId || tile.ownerId === playerId) return null;

    const cityOnTile = gameState.cities.find(c => hexEquals(c.coord, coord));
    if (cityOnTile) return null;

    return isAtPeaceWithTarget(diplomacy, playerId, tile.ownerId) ? tile.ownerId : null;
}

export function createMoveUnitAction(playerId: string, unitId: string, to: HexCoord): Action {
    return {
        type: "MoveUnit",
        playerId,
        unitId,
        to,
    };
}

export function createAttackAction(
    playerId: string,
    attackerId: string,
    targetId: string,
    targetType: "Unit" | "City",
): Action {
    return {
        type: "Attack",
        playerId,
        attackerId,
        targetId,
        targetType,
    };
}

export function canUnitAttackCity(unit: Unit): boolean {
    const unitStats = UNITS[unit.type as keyof typeof UNITS];
    return unitStats.domain !== "Civilian";
}

export function canUnitsStack(movingUnit: Unit, targetUnit: Unit): boolean {
    const movingStats = UNITS[movingUnit.type];
    const targetStats = UNITS[targetUnit.type];
    return (movingStats.domain === "Civilian" && targetStats.domain !== "Civilian") ||
        (movingStats.domain !== "Civilian" && targetStats.domain === "Civilian");
}

export function pickLinkedOrFirstFriendlyUnitId(friendlyUnits: Unit[]): string | null {
    const linkedUnit = friendlyUnits.find(unit =>
        unit.linkedUnitId && friendlyUnits.some(partner => partner.id === unit.linkedUnitId),
    );
    return linkedUnit?.id ?? friendlyUnits[0]?.id ?? null;
}
