import { describe, expect, it } from "vitest";
import { DiplomacyState, EraId, GameState, PlayerPhase, UnitType } from "../../../core/types.js";
import { getCombatPreviewUnitVsUnit } from "../../../game/helpers/combat-preview.js";
import { shouldUnitWait } from "../../../game/ai2/wait-decision.js";
import { scoreAttackOption } from "../../../game/ai2/attack-order/scoring.js";
import type { PlannedAttack } from "../../../game/ai2/attack-order.js";

function baseState(): GameState {
    return {
        id: "test",
        turn: 10,
        players: [],
        currentPlayerId: "p1",
        phase: PlayerPhase.Planning,
        aiSystem: "UtilityV2",
        aiMemoryV2: {},
        map: { width: 10, height: 10, tiles: [] },
        units: [],
        cities: [],
        seed: 1,
        visibility: {},
        revealed: {},
        diplomacy: {},
        sharedVision: {},
        contacts: {},
        diplomacyOffers: [],
        nativeCamps: [],
    };
}

function mkPlayer(id: string, civName: string): any {
    return {
        id,
        civName,
        isAI: true,
        aiGoal: "Balanced",
        techs: [],
        completedProjects: [],
        isEliminated: false,
        currentEra: EraId.Primitive,
    };
}

function mkUnit(ownerId: string, id: string, type: UnitType, q: number, r: number): any {
    return {
        id,
        ownerId,
        type,
        coord: { q, r },
        hp: 10,
        maxHp: 10,
        movesLeft: 1,
        hasAttacked: false,
        state: "Normal",
    };
}

function seedTiles(state: GameState, min: number, max: number): void {
    for (let q = min; q <= max; q++) {
        for (let r = min; r <= max; r++) {
            state.map.tiles.push({ coord: { q, r }, terrain: "Plains", overlays: [] } as any);
        }
    }
}

describe("wait decision - no kill scoring", () => {
    it("does not wait on low-value pokes under current aggression tuning", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ScholarKingdoms"), mkPlayer("p2", "RiverLeague")];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };

        const attacker = mkUnit("p1", "u1", UnitType.SpearGuard, 0, 1);
        const target = mkUnit("p2", "e1", UnitType.Scout, 0, 2);
        const enemyAnchor = mkUnit("p2", "e2", UnitType.SpearGuard, 0, 0);

        state.units = [attacker, target, enemyAnchor];
        seedTiles(state, -1, 3);

        const preview = getCombatPreviewUnitVsUnit(state, attacker, target);
        const scored = scoreAttackOption({
            state,
            playerId: "p1",
            attacker,
            targetType: "Unit",
            target,
            damage: preview.estimatedDamage.avg,
            returnDamage: preview.returnDamage?.avg ?? 0
        });

        const attack: PlannedAttack = {
            attacker,
            targetId: target.id,
            targetType: "Unit",
            damage: preview.estimatedDamage.avg,
            returnDamage: preview.returnDamage?.avg ?? 0,
            wouldKill: scored.wouldKill,
            score: scored.score
        };

        const decision = shouldUnitWait(state, "p1", attack, [attack]);

        expect(decision.shouldWait).toBe(false);
    });
});
