import { GameState, HexCoord, UnitState, UnitType, BuildingType } from "../../core/types.js";
import {
    ATTACK_RANDOM_BAND,
    CITY_ATTACK_BASE,
    CITY_WARD_ATTACK_BONUS,
    CITY_DEFENSE_BASE,
    CITY_WARD_DEFENSE_BONUS,
    DAMAGE_BASE,
    DAMAGE_MAX,
    DAMAGE_MIN,
    TERRAIN,
} from "../../core/constants.js";
import { hexDistance, hexEquals } from "../../core/hex.js";
import { refreshPlayerVision } from "../vision.js";
import {
    createMoveContext,
    executeUnitMove,
    resolveLinkedPartner,
    validateTileOccupancy,
    unlinkPair,
    MoveContext,
} from "../helpers/movement.js";
import { getEffectiveUnitStats, hasClearLineOfSight } from "../helpers/combat.js";
import { ensureWar } from "../helpers/diplomacy.js";

export function handleMoveUnit(state: GameState, action: { type: "MoveUnit"; playerId: string; unitId: string; to: HexCoord }): GameState {
    const unit = state.units.find(u => u.id === action.unitId);
    if (!unit) throw new Error("Unit not found");
    if (unit.ownerId !== action.playerId) throw new Error("Not your unit");
    if (unit.movesLeft <= 0) throw new Error("No moves left");

    const dist = hexDistance(unit.coord, action.to);
    if (dist !== 1) throw new Error("Can only move 1 tile at a time");

    const targetTile = state.map.tiles.find(t => hexEquals(t.coord, action.to));
    if (!targetTile) throw new Error("Invalid target tile");

    const moveContext = createMoveContext(unit, targetTile);

    let partner = resolveLinkedPartner(state, unit);
    let partnerContext: MoveContext | null = null;
    let partnerWillMove = false;

    if (partner) {
        try {
            partnerContext = createMoveContext(partner, targetTile);
            validateTileOccupancy(
                state,
                action.to,
                [
                    { unit, stats: moveContext.stats },
                    { unit: partner, stats: partnerContext.stats },
                ],
                action.playerId
            );
            partnerWillMove = true;
        } catch (err) {
            unlinkPair(unit, partner);
            partner = undefined;
            partnerContext = null;
        }
    }

    if (!partnerWillMove) {
        validateTileOccupancy(state, action.to, [{ unit, stats: moveContext.stats }], action.playerId);
    }

    executeUnitMove(state, unit, moveContext, action.to, action.playerId);

    if (partnerWillMove && partner && partnerContext) {
        try {
            executeUnitMove(state, partner, partnerContext, action.to, action.playerId);
            const sharedMoves = Math.min(unit.movesLeft, partner.movesLeft);
            unit.movesLeft = sharedMoves;
            partner.movesLeft = sharedMoves;
        } catch (err) {
            unlinkPair(unit, partner);
        }
    }

    refreshPlayerVision(state, action.playerId);

    return state;
}

export function handleLinkUnits(state: GameState, action: { type: "LinkUnits"; playerId: string; unitId: string; partnerId: string }): GameState {
    const unit = state.units.find(u => u.id === action.unitId);
    const partner = state.units.find(u => u.id === action.partnerId);
    if (!unit || !partner) throw new Error("Unit not found");
    if (unit.id === partner.id) throw new Error("Cannot link unit to itself");
    if (unit.ownerId !== action.playerId || partner.ownerId !== action.playerId) throw new Error("Not your unit");
    if (!hexEquals(unit.coord, partner.coord)) throw new Error("Units must share a tile to link");
    if (unit.linkedUnitId || partner.linkedUnitId) throw new Error("Units already linked");
    if (unit.hasAttacked || partner.hasAttacked) throw new Error("Units are combat-engaged");

    unit.linkedUnitId = partner.id;
    partner.linkedUnitId = unit.id;
    return state;
}

export function handleUnlinkUnits(state: GameState, action: { type: "UnlinkUnits"; playerId: string; unitId: string; partnerId?: string }): GameState {
    const unit = state.units.find(u => u.id === action.unitId);
    if (!unit) throw new Error("Unit not found");
    if (unit.ownerId !== action.playerId) throw new Error("Not your unit");
    if (!unit.linkedUnitId) throw new Error("Unit is not linked");

    const partner = state.units.find(u => u.id === unit.linkedUnitId);
    if (partner && partner.ownerId !== action.playerId) throw new Error("Not your unit");
    if (action.partnerId && partner && partner.id !== action.partnerId) throw new Error("Partner mismatch");

    unlinkPair(unit, partner);
    return state;
}

export function handleAttack(state: GameState, action: { type: "Attack"; playerId: string; attackerId: string; targetId: string; targetType: "Unit" | "City" }): GameState {
    const attacker = state.units.find(u => u.id === action.attackerId);
    if (!attacker) throw new Error("Attacker not found");
    if (attacker.ownerId !== action.playerId) throw new Error("Not your unit");
    if (attacker.hasAttacked) throw new Error("Already attacked");
    if (attacker.movesLeft <= 0) throw new Error("No moves left to attack");

    const attackerStats = getEffectiveUnitStats(attacker, state);

    const targetOwner = action.targetType === "Unit"
        ? state.units.find(u => u.id === action.targetId)?.ownerId
        : state.cities.find(c => c.id === action.targetId)?.ownerId;
    if (targetOwner && targetOwner !== action.playerId) {
        ensureWar(state, action.playerId, targetOwner);
    }

    if (action.targetType === "Unit") {
        const defender = state.units.find(u => u.id === action.targetId);
        if (!defender) throw new Error("Defender not found");

        const dist = hexDistance(attacker.coord, defender.coord);
        if (dist > attackerStats.rng) throw new Error("Target out of range");
        if (!hasClearLineOfSight(state, attacker.coord, defender.coord)) throw new Error("Line of sight blocked");

        if (defender.type === UnitType.Settler) {
            if (dist !== 1) throw new Error("Must be adjacent to capture settler");
            const defenderCoord = defender.coord;
            defender.ownerId = action.playerId;
            defender.movesLeft = 0;
            defender.capturedOnTurn = state.turn;
            attacker.coord = defenderCoord;
            attacker.hasAttacked = true;
            attacker.movesLeft = 0;
            attacker.state = UnitState.Normal;
            return state;
        }

        const randIdx = Math.floor(state.seed % 3);
        state.seed = (state.seed * 9301 + 49297) % 233280;
        const randomMod = ATTACK_RANDOM_BAND[randIdx];

        const attackPower = attackerStats.atk + randomMod;

        let defensePower = getEffectiveUnitStats(defender, state).def;
        const tile = state.map.tiles.find(t => hexEquals(t.coord, defender.coord));
        if (tile) {
            defensePower += TERRAIN[tile.terrain].defenseMod;
        }
        if (defender.state === UnitState.Fortified) defensePower += 1;

        const delta = attackPower - defensePower;
        const rawDamage = DAMAGE_BASE + Math.floor(delta / 2);
        const damage = Math.max(DAMAGE_MIN, Math.min(DAMAGE_MAX, rawDamage));

        defender.hp -= damage;
        attacker.hasAttacked = true;
        attacker.state = UnitState.Normal;

        if (defender.hp <= 0) {
            const defenderCoord = defender.coord;
            state.units = state.units.filter(u => u.id !== defender.id);
            if (attackerStats.rng === 1 && dist === 1) {
                attacker.coord = defenderCoord;
                attacker.movesLeft = 0;
            }
        }
    } else {
        const city = state.cities.find(c => c.id === action.targetId);
        if (!city) throw new Error("City not found");

        const dist = hexDistance(attacker.coord, city.coord);
        if (dist > attackerStats.rng) throw new Error("Target out of range");
        if (!hasClearLineOfSight(state, attacker.coord, city.coord)) throw new Error("Line of sight blocked");

        const randIdx = Math.floor(state.seed % 3);
        state.seed = (state.seed * 9301 + 49297) % 233280;
        const randomMod = ATTACK_RANDOM_BAND[randIdx];

        const attackPower = attackerStats.atk + randomMod;

        let defensePower = CITY_DEFENSE_BASE + Math.floor(city.pop / 2);
        if (city.buildings.includes(BuildingType.CityWard)) defensePower += CITY_WARD_DEFENSE_BONUS;

        const delta = attackPower - defensePower;
        const rawDamage = DAMAGE_BASE + Math.floor(delta / 2);
        const damage = Math.max(DAMAGE_MIN, Math.min(DAMAGE_MAX, rawDamage));

        city.hp -= damage;
        city.lastDamagedOnTurn = state.turn;
        attacker.hasAttacked = true;

        if (city.hp <= 0) {
            if (attackerStats.canCaptureCity && dist === 1) {
                // Capture happens via MoveUnit after HP reaches zero.
            }
        }
    }

    return state;
}

