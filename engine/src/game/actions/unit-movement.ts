import { GameState, UnitState, UnitType } from "../../core/types.js";
import { UNITS } from "../../core/constants.js";
import { hexEquals, hexToString } from "../../core/hex.js";
import {
    assertAdjacent,
    assertMovesLeft,
    assertOwnership,
    assertTileCanBeOccupied,
    getUnitOrThrow,
} from "../helpers/action-helpers.js";
import {
    createMoveContext,
    executeUnitMove,
    resolveLinkedPartner,
    unlinkPair,
} from "../helpers/movement.js";
import {
    LinkUnitsAction,
    MoveUnitAction,
    SwapUnitsAction,
    UnlinkUnitsAction,
    FortifyUnitAction,
} from "./unit-action-types.js";
import { refreshPlayerVision } from "../vision.js";
import { buildTileLookup } from "../helpers/combat.js";

export function handleMoveUnit(state: GameState, action: MoveUnitAction): GameState {
    const unit = getUnitOrThrow(state, action.unitId);
    assertOwnership(unit, action.playerId);
    assertMovesLeft(unit);

    // Manual move cancels auto-explore
    if (unit.isAutoExploring && !action.isAuto) {
        unit.isAutoExploring = false;
        unit.autoMoveTarget = undefined;
    }

    assertAdjacent(unit.coord, action.to, "Can only move 1 tile at a time");

    const tileLookup = buildTileLookup(state);
    const targetTile = tileLookup.get(hexToString(action.to));
    if (!targetTile) throw new Error("Invalid target tile");

    const moveContext = createMoveContext(unit, targetTile, state);

    let partner = resolveLinkedPartner(state, unit);
    let partnerWillMove = false;
    let partnerStatsContext = null as ReturnType<typeof createMoveContext> | null;

    if (partner) {
        try {
            partnerStatsContext = createMoveContext(partner, targetTile);
            assertTileCanBeOccupied(
                state,
                action.to,
                [
                    { unit, stats: moveContext.stats },
                    { unit: partner, stats: partnerStatsContext.stats },
                ],
                action.playerId,
                tileLookup
            );
            partnerWillMove = true;
        } catch {
            unlinkPair(unit, partner);
            partner = undefined;
            partnerStatsContext = null;
        }
    }

    if (!partnerWillMove) {
        assertTileCanBeOccupied(state, action.to, [{ unit, stats: moveContext.stats }], action.playerId, tileLookup);
    }

    executeUnitMove(state, unit, moveContext, action.to, action.playerId);

    if (partnerWillMove && partner && partnerStatsContext) {
        try {
            executeUnitMove(state, partner, partnerStatsContext, action.to, action.playerId);
            const sharedMoves = Math.min(unit.movesLeft, partner.movesLeft);
            unit.movesLeft = sharedMoves;
            partner.movesLeft = sharedMoves;
        } catch {
            unlinkPair(unit, partner);
        }
    }

    refreshPlayerVision(state, action.playerId);

    // Clear failed targets on successful move (context changed)
    if (unit.failedAutoMoveTargets) {
        unit.failedAutoMoveTargets = undefined;
    }

    return state;
}

export function handleLinkUnits(state: GameState, action: LinkUnitsAction): GameState {
    const unit = getUnitOrThrow(state, action.unitId);
    const partner = getUnitOrThrow(state, action.partnerId);
    if (unit.id === partner.id) throw new Error("Cannot link unit to itself");
    assertOwnership(unit, action.playerId);
    assertOwnership(partner, action.playerId);
    if (!hexEquals(unit.coord, partner.coord)) throw new Error("Units must share a tile to link");
    if (unit.linkedUnitId || partner.linkedUnitId) throw new Error("Units already linked");
    if (unit.hasAttacked || partner.hasAttacked) throw new Error("Units are combat-engaged");

    const unitDomain = UNITS[unit.type].domain;
    const partnerDomain = UNITS[partner.type].domain;
    if (unitDomain !== "Civilian" && partnerDomain !== "Civilian") {
        throw new Error("Cannot link two military units");
    }

    unit.linkedUnitId = partner.id;
    partner.linkedUnitId = unit.id;
    return state;
}

export function handleUnlinkUnits(state: GameState, action: UnlinkUnitsAction): GameState {
    const unit = getUnitOrThrow(state, action.unitId);
    assertOwnership(unit, action.playerId);
    if (!unit.linkedUnitId) throw new Error("Unit is not linked");

    const partner = state.units.find(u => u.id === unit.linkedUnitId);
    if (partner) {
        assertOwnership(partner, action.playerId);
    }
    if (action.partnerId && partner && partner.id !== action.partnerId) throw new Error("Partner mismatch");

    unlinkPair(unit, partner);
    return state;
}

export function handleFortifyUnit(state: GameState, action: FortifyUnitAction): GameState {
    const unit = getUnitOrThrow(state, action.unitId);
    assertOwnership(unit, action.playerId);
    assertMovesLeft(unit);
    if (unit.type === UnitType.Settler) throw new Error("Settlers cannot fortify");

    unit.state = UnitState.Fortified;
    unit.movesLeft = 0; // Consumes all moves
    unit.isAutoExploring = false;
    return state;
}

export function handleSwapUnits(state: GameState, action: SwapUnitsAction): GameState {
    const unit = getUnitOrThrow(state, action.unitId);
    const targetUnit = getUnitOrThrow(state, action.targetUnitId);

    assertOwnership(unit, action.playerId);
    assertOwnership(targetUnit, action.playerId);

    // Prevent swapping with Settlers (stacking logic should handle them, but swapping is for military shuffling)
    if (unit.type === UnitType.Settler || targetUnit.type === UnitType.Settler) throw new Error("Cannot swap with Settler");

    assertMovesLeft(unit); // Only initiator needs moves? Or both?

    // Validate adjacency
    assertAdjacent(unit.coord, targetUnit.coord, "Units must be adjacent to swap");

    // Validate domain compatibility (e.g. Land unit can't swap into Ocean if it can't go there)
    const unitTile = state.map.tiles.find(t => hexEquals(t.coord, unit.coord));
    const targetTile = state.map.tiles.find(t => hexEquals(t.coord, targetUnit.coord));

    if (!unitTile || !targetTile) throw new Error("Invalid tiles");

    const unitStats = UNITS[unit.type];
    const targetStats = UNITS[targetUnit.type];

    if (unitStats.domain === "Land" && (targetTile.terrain === "Coast" || targetTile.terrain === "DeepSea" || targetTile.terrain === "Mountain")) throw new Error("Unit cannot enter target terrain");
    if (unitStats.domain === "Naval" && (targetTile.terrain !== "Coast" && targetTile.terrain !== "DeepSea")) throw new Error("Unit cannot enter target terrain");

    if (targetStats.domain === "Land" && (unitTile.terrain === "Coast" || unitTile.terrain === "DeepSea" || unitTile.terrain === "Mountain")) throw new Error("Target unit cannot enter initiator terrain");
    if (targetStats.domain === "Naval" && (unitTile.terrain !== "Coast" && unitTile.terrain !== "DeepSea")) throw new Error("Target unit cannot enter initiator terrain");

    // Perform Swap
    const tempCoord = unit.coord;
    unit.coord = targetUnit.coord;
    targetUnit.coord = tempCoord;

    // Swapping is powerful. Cost 1 move for both units.
    unit.movesLeft -= 1;
    targetUnit.movesLeft = Math.max(0, targetUnit.movesLeft - 1);

    // Update vision
    refreshPlayerVision(state, action.playerId);

    return state;
}
