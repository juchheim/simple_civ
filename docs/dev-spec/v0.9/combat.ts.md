// v2.0: Civ 6-style damage formula with melee return damage
import { TERRAIN } from "../core/constants";
import { Unit } from "../types/unitTypes";
import { City } from "../types/cityTypes";
import { GameState } from "../types/gameTypes";

// Constants
const CIV6_DAMAGE_BASE = 5;
const CIV6_DAMAGE_DIVISOR = 25;
const CIV6_DAMAGE_RANDOM_MIN = 0.9;
const CIV6_DAMAGE_RANDOM_MAX = 1.1;
const CIV6_DAMAGE_MIN = 1;
const CIV6_DAMAGE_MAX = 15;

/**
 * Civ 6-style damage formula: Damage = BASE × e^(StrengthDiff / DIVISOR) × RandomMult
 * Returns calculated damage and updated seed for RNG.
 */
export function calculateCiv6Damage(
    attackerAtk: number,
    defenderDef: number,
    seed: number
): { damage: number; newSeed: number } {
    const diff = attackerAtk - defenderDef;
    const baseDamage = CIV6_DAMAGE_BASE * Math.exp(diff / CIV6_DAMAGE_DIVISOR);

    // Deterministic random from seed (range 0.9 to 1.1)
    const randomMult = CIV6_DAMAGE_RANDOM_MIN +
        ((seed % 100) / 100) * (CIV6_DAMAGE_RANDOM_MAX - CIV6_DAMAGE_RANDOM_MIN);
    const newSeed = (seed * 9301 + 49297) % 233280;

    const rawDamage = Math.round(baseDamage * randomMult);
    const damage = Math.max(CIV6_DAMAGE_MIN, Math.min(CIV6_DAMAGE_MAX, rawDamage));

    return { damage, newSeed };
}

/**
 * Unit vs Unit combat with melee return damage.
 * - Apply damage to defender
 * - If defender survives AND attacker is melee (rng=1), defender counter-attacks
 */
export function resolveUnitVsUnit(
    state: GameState,
    att: Unit,
    def: Unit,
    attStats: { atk: number; def: number; rng: number },
    defStats: { atk: number; def: number }
): void {
    // Calculate damage to defender
    const { damage, newSeed } = calculateCiv6Damage(attStats.atk, defStats.def, state.seed);
    state.seed = newSeed;
    def.hp -= damage;

    // Melee return damage: if defender survives and attacker is melee
    if (def.hp > 0 && attStats.rng === 1) {
        const { damage: returnDamage, newSeed: returnSeed } = calculateCiv6Damage(
            defStats.atk, attStats.def, state.seed
        );
        state.seed = returnSeed;
        att.hp -= returnDamage;
    }
}

/**
 * Unit vs City combat uses same formula.
 */
export function resolveUnitVsCity(
    state: GameState,
    att: Unit,
    cityDefense: number
): number {
    const attStats = getEffectiveUnitStats(att, state);
    const { damage, newSeed } = calculateCiv6Damage(attStats.atk, cityDefense, state.seed);
    state.seed = newSeed;
    return damage;
}