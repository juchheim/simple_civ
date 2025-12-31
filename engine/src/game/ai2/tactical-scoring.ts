import { City, GameState, Unit, UnitType } from "../../core/types.js";
import { hexDistance } from "../../core/hex.js";
import { UNITS } from "../../core/constants.js";
import { countThreatsToTile } from "../ai/units/movement-safety.js";
import { getAiMemoryV2 } from "./memory.js";
import { getAiProfileV2 } from "./rules.js";
import { getUnitRole, isCityOnlySiegeUnitType, isSiegeRole } from "./schema.js";
import { getCityValueProfile, getUnitThreatProfile } from "./tactical-threat.js";
import { isMilitary } from "./unit-roles.js";
import { getCombatPreviewUnitVsUnit } from "../helpers/combat-preview.js";
import { isGarrisoned } from "./attack-order/shared.js";

export type AttackScoreInput = {
    state: GameState;
    playerId: string;
    attacker: Unit;
    targetType: "Unit" | "City";
    target: Unit | City;
    damage: number;
    returnDamage: number;
    targetHpOverride?: number;
};

export type AttackScoreResult = {
    score: number;
    wouldKill: boolean;
};

export type ScoreBreakdown = {
    total: number;
    components: Record<string, number>;
    notes?: string[];
};

export type MoveAttackScoreInput = AttackScoreInput & {
    exposureDamage: number;
    exposureMultiplier?: number;
};

export type MoveAttackScoreResult = AttackScoreResult & {
    exposurePenalty: number;
};

export type DefenseAttackScoreInput = AttackScoreInput & {
    targetType: "Unit";
    target: Unit;
    cityCoord: { q: number; r: number };
};

export type CaptureSupportResult = {
    wouldDropToZero: boolean;
    canCaptureNow: boolean;
    followUpCapture: boolean;
    captureBonus: number;
    stallPenalty: number;
};

const DEFENSE_BONUS_RADIUS = 4;
const DEFENSE_BONUS_PER_TILE = 15;

function hasReadyCapturerAdjacent(state: GameState, playerId: string, cityCoord: { q: number; r: number }): boolean {
    return state.units.some(u =>
        u.ownerId === playerId &&
        isMilitary(u) &&
        UNITS[u.type].canCaptureCity &&
        u.movesLeft > 0 &&
        !u.hasAttacked &&
        !isGarrisoned(u, state, playerId) &&
        hexDistance(u.coord, cityCoord) === 1
    );
}

export function evaluateCaptureSupport(input: {
    state: GameState;
    playerId: string;
    attacker: Unit;
    city: City;
    damage: number;
    targetHpOverride?: number;
}): CaptureSupportResult {
    const { state, playerId, attacker, city, damage, targetHpOverride } = input;
    const profile = getAiProfileV2(state, playerId);
    const siegeCommitment = profile.tactics.siegeCommitment;
    const targetHp = targetHpOverride ?? city.hp;
    const wouldDropToZero = targetHp - damage <= 0;

    const canCaptureNow = wouldDropToZero &&
        UNITS[attacker.type].canCaptureCity &&
        hexDistance(attacker.coord, city.coord) === 1;
    const followUpCapture = wouldDropToZero && hasReadyCapturerAdjacent(state, playerId, city.coord);

    let captureBonus = 0;
    if (canCaptureNow) {
        captureBonus = 320 + (200 * siegeCommitment);
    } else if (followUpCapture) {
        captureBonus = 120 + (120 * siegeCommitment);
    }

    const stallPenalty = wouldDropToZero && !canCaptureNow && !followUpCapture
        ? (UNITS[attacker.type].canCaptureCity ? 350 : 800)
        : 0;

    return {
        wouldDropToZero,
        canCaptureNow,
        followUpCapture,
        captureBonus,
        stallPenalty
    };
}

function isHighValueTarget(target: Unit): boolean {
    if (target.type === UnitType.Titan) return true;
    if (target.type === UnitType.Settler) return true;
    if (UNITS[target.type].rng > 1 && target.hp <= 5) return true;
    return false;
}

function focusProximityBonus(state: GameState, playerId: string, target: Unit): number {
    const memory = getAiMemoryV2(state, playerId);
    const focusCity = memory.focusCityId ? state.cities.find(c => c.id === memory.focusCityId) : undefined;
    if (!focusCity) return 0;

    const profile = getAiProfileV2(state, playerId);
    const mult = 0.5 + profile.tactics.forceConcentration;
    const dist = hexDistance(target.coord, focusCity.coord);
    if (dist <= 2) return 40 * mult;
    if (dist <= 4) return 20 * mult;
    return 0;
}

export function getDefenseBonus(cityCoord: { q: number; r: number }, targetCoord: { q: number; r: number }): number {
    const distToCity = hexDistance(targetCoord, cityCoord);
    return Math.max(0, DEFENSE_BONUS_RADIUS - distToCity) * DEFENSE_BONUS_PER_TILE;
}

function buildBreakdown(
    total: number,
    components: Record<string, number>,
    notes: string[]
): ScoreBreakdown {
    const breakdown: ScoreBreakdown = { total, components };
    if (notes.length > 0) breakdown.notes = notes;
    return breakdown;
}

function scoreUnitAttackInternal(
    input: Omit<AttackScoreInput, "targetType"> & { target: Unit },
    includeBreakdown: boolean
): AttackScoreResult & { breakdown?: ScoreBreakdown } {
    const { state, playerId, attacker, target, damage, returnDamage, targetHpOverride } = input;
    const profile = getAiProfileV2(state, playerId);
    const memory = getAiMemoryV2(state, playerId);
    const targetHp = targetHpOverride ?? target.hp;
    const wouldKill = damage >= targetHp;
    const targetProfile = getUnitThreatProfile(target);
    const attackerProfile = getUnitThreatProfile(attacker);

    const components: Record<string, number> = {};
    const notes: string[] = [];

    let score = 0;
    const damageScore = damage * 2;
    score += damageScore;
    if (includeBreakdown) components.damage = damageScore;

    const killBonus = wouldKill ? (40 + targetProfile.strategicValue * 2) : 0;
    score += killBonus;
    if (includeBreakdown && killBonus !== 0) components.killBonus = killBonus;

    const threatScore = targetProfile.unitThreat * 12;
    score += threatScore;
    if (includeBreakdown) components.threat = threatScore;

    if (isHighValueTarget(target)) {
        score += 40;
        if (includeBreakdown) components.highValue = 40;
    }

    const targetRole = getUnitRole(target.type);
    let roleBonus = 0;
    if (isSiegeRole(targetRole)) roleBonus += 35;
    if (targetRole === "capture") roleBonus += 15;
    if (targetRole === "defense") roleBonus += 10;
    if (roleBonus !== 0) {
        score += roleBonus;
        if (includeBreakdown) components.roleBonus = roleBonus;
    }

    let focusBonus = 0;
    if (memory.tacticalFocusUnitId && target.id === memory.tacticalFocusUnitId) {
        focusBonus += 40 + (40 * profile.tactics.forceConcentration);
    }
    focusBonus += focusProximityBonus(state, playerId, target);
    if (focusBonus !== 0) {
        score += focusBonus;
        if (includeBreakdown) components.focusBonus = focusBonus;
    }

    if (wouldKill && UNITS[attacker.type].rng > 1 && damage > targetHp + 2) {
        const overkillPenalty = 10 + (30 * profile.tactics.rangedCaution);
        score -= overkillPenalty;
        if (includeBreakdown) components.overkillPenalty = -overkillPenalty;
    }

    const isSuicide = returnDamage >= attacker.hp;
    if (isSuicide) {
        const suicidePenalty = (wouldKill && targetProfile.strategicValue > attackerProfile.strategicValue) ? 20 : 200;
        score -= suicidePenalty;
        if (includeBreakdown) components.suicidePenalty = -suicidePenalty;
        if (includeBreakdown) notes.push("suicide-trade");
    }

    const riskPenalty = returnDamage * (wouldKill ? 0.6 : 1.6) * (1 - profile.tactics.riskTolerance);
    score -= riskPenalty;
    if (includeBreakdown && riskPenalty !== 0) components.riskPenalty = -riskPenalty;

    if (UNITS[attacker.type].rng === 1) {
        const threats = countThreatsToTile(state, playerId, target.coord, target.id);
        if (threats.count >= 3 && !wouldKill) {
            score -= 80;
            if (includeBreakdown) components.tileThreatPenalty = -80;
        } else if (threats.count >= 2) {
            const penalty = (threats.totalDamage * 0.8) * (1 - profile.tactics.riskTolerance);
            score -= penalty;
            if (includeBreakdown) components.tileThreatPenalty = -penalty;
        }
    } else {
        const threats = countThreatsToTile(state, playerId, attacker.coord, target.id);
        if (threats.count >= 2) {
            const cautionMult = (0.5 + profile.tactics.rangedCaution) * (1 - profile.tactics.riskTolerance);
            const penalty = (threats.totalDamage * 0.6) * cautionMult;
            score -= penalty;
            if (includeBreakdown) components.rangedThreatPenalty = -penalty;
        }
    }

    return {
        score,
        wouldKill,
        breakdown: includeBreakdown ? buildBreakdown(score, components, notes) : undefined
    };
}

export function scoreUnitAttack(
    input: Omit<AttackScoreInput, "targetType"> & { target: Unit }
): AttackScoreResult {
    const scored = scoreUnitAttackInternal(input, false);
    return { score: scored.score, wouldKill: scored.wouldKill };
}

export function scoreUnitAttackWithBreakdown(
    input: Omit<AttackScoreInput, "targetType"> & { target: Unit }
): AttackScoreResult & { breakdown: ScoreBreakdown } {
    return scoreUnitAttackInternal(input, true) as AttackScoreResult & { breakdown: ScoreBreakdown };
}

function scoreCityAttackInternal(
    input: Omit<AttackScoreInput, "targetType"> & { target: City },
    includeBreakdown: boolean
): AttackScoreResult & { breakdown?: ScoreBreakdown } {
    const { state, playerId, attacker, target, damage, returnDamage, targetHpOverride } = input;
    const profile = getAiProfileV2(state, playerId);
    const memory = getAiMemoryV2(state, playerId);
    const targetHp = targetHpOverride ?? target.hp;
    const captureSupport = evaluateCaptureSupport({
        state,
        playerId,
        attacker,
        city: target,
        damage,
        targetHpOverride: targetHp
    });

    const siegeCommitment = profile.tactics.siegeCommitment;
    const cityValue = getCityValueProfile(state, playerId, target, targetHp);

    const components: Record<string, number> = {};
    const notes: string[] = [];

    let score = 0;
    const damageScore = damage * 2.5;
    score += damageScore;
    if (includeBreakdown) components.damage = damageScore;

    score += cityValue.totalValue;
    if (includeBreakdown) components.cityValue = cityValue.totalValue;

    if (memory.focusCityId && target.id === memory.focusCityId) {
        const focusBonus = 80 + (80 * siegeCommitment);
        score += focusBonus;
        if (includeBreakdown) components.focusBonus = focusBonus;
    }

    const attackerRole = getUnitRole(attacker.type);
    let roleBonus = 0;
    if (isCityOnlySiegeUnitType(attacker.type)) roleBonus += 60 + (100 * siegeCommitment);
    else if (isSiegeRole(attackerRole)) roleBonus += 20 + (60 * siegeCommitment);
    if (UNITS[attacker.type].canCaptureCity) roleBonus += 15 + (30 * siegeCommitment);
    if (attackerRole === "defense") roleBonus -= 20;
    if (roleBonus !== 0) {
        score += roleBonus;
        if (includeBreakdown) components.roleBonus = roleBonus;
    }

    score += captureSupport.captureBonus;
    if (includeBreakdown && captureSupport.captureBonus !== 0) {
        components.captureBonus = captureSupport.captureBonus;
    }

    let riskPenalty = returnDamage * 1.8 * (1 - profile.tactics.riskTolerance);
    if (target.isCapital) {
        riskPenalty *= 0.6;
        if (captureSupport.canCaptureNow) riskPenalty *= 0.2;
    }
    score -= riskPenalty;
    if (includeBreakdown && riskPenalty !== 0) components.riskPenalty = -riskPenalty;

    const exposure = countThreatsToTile(state, playerId, attacker.coord, target.id);
    if (exposure.count >= 2) {
        const cautionMult = UNITS[attacker.type].rng > 1
            ? (0.5 + profile.tactics.rangedCaution)
            : 1;
        const exposurePenalty = (exposure.totalDamage * 0.8) * cautionMult * (1 - profile.tactics.riskTolerance);
        score -= exposurePenalty;
        if (includeBreakdown) components.exposurePenalty = -exposurePenalty;
    }

    score -= captureSupport.stallPenalty;
    if (includeBreakdown && captureSupport.stallPenalty !== 0) {
        components.stallPenalty = -captureSupport.stallPenalty;
        notes.push("stall-risk");
    }

    return {
        score,
        wouldKill: captureSupport.wouldDropToZero,
        breakdown: includeBreakdown ? buildBreakdown(score, components, notes) : undefined
    };
}

export function scoreCityAttack(
    input: Omit<AttackScoreInput, "targetType"> & { target: City }
): AttackScoreResult {
    const scored = scoreCityAttackInternal(input, false);
    return { score: scored.score, wouldKill: scored.wouldKill };
}

export function scoreCityAttackWithBreakdown(
    input: Omit<AttackScoreInput, "targetType"> & { target: City }
): AttackScoreResult & { breakdown: ScoreBreakdown } {
    return scoreCityAttackInternal(input, true) as AttackScoreResult & { breakdown: ScoreBreakdown };
}

export function scoreAttackOption(input: AttackScoreInput): AttackScoreResult {
    if (input.targetType === "Unit") {
        return scoreUnitAttack({ ...input, target: input.target as Unit });
    }
    return scoreCityAttack({ ...input, target: input.target as City });
}

export function scoreAttackOptionWithBreakdown(
    input: AttackScoreInput
): AttackScoreResult & { breakdown: ScoreBreakdown } {
    if (input.targetType === "Unit") {
        return scoreUnitAttackWithBreakdown({ ...input, target: input.target as Unit });
    }
    return scoreCityAttackWithBreakdown({ ...input, target: input.target as City });
}

export function scoreMoveAttackOption(input: MoveAttackScoreInput): MoveAttackScoreResult {
    const scored = scoreAttackOption(input);
    const mult = input.exposureMultiplier ?? 1;
    const exposurePenalty = input.exposureDamage * mult * 2;
    return {
        score: scored.score - exposurePenalty,
        wouldKill: scored.wouldKill,
        exposurePenalty
    };
}

export function scoreMoveAttackOptionWithBreakdown(
    input: MoveAttackScoreInput
): MoveAttackScoreResult & { breakdown: ScoreBreakdown } {
    const scored = scoreAttackOptionWithBreakdown(input);
    const mult = input.exposureMultiplier ?? 1;
    const exposurePenalty = input.exposureDamage * mult * 2;
    const total = scored.score - exposurePenalty;
    return {
        score: total,
        wouldKill: scored.wouldKill,
        exposurePenalty,
        breakdown: buildBreakdown(
            total,
            {
                ...scored.breakdown.components,
                exposurePenalty: -exposurePenalty
            },
            scored.breakdown.notes ?? []
        )
    };
}

export function scoreDefenseAttackOption(input: DefenseAttackScoreInput): AttackScoreResult {
    const scored = scoreAttackOption(input);
    const defenseBonus = getDefenseBonus(input.cityCoord, input.target.coord);
    return {
        score: scored.score + defenseBonus,
        wouldKill: scored.wouldKill
    };
}

export function scoreDefenseAttackOptionWithBreakdown(
    input: DefenseAttackScoreInput
): AttackScoreResult & { breakdown: ScoreBreakdown } {
    const scored = scoreAttackOptionWithBreakdown(input);
    const defenseBonus = getDefenseBonus(input.cityCoord, input.target.coord);
    const total = scored.score + defenseBonus;
    return {
        score: total,
        wouldKill: scored.wouldKill,
        breakdown: buildBreakdown(
            total,
            {
                ...scored.breakdown.components,
                defenseBonus
            },
            scored.breakdown.notes ?? []
        )
    };
}

export function scoreDefenseAttackPreview(input: {
    state: GameState;
    playerId: string;
    attacker: Unit;
    target: Unit;
    cityCoord: { q: number; r: number };
}): { score: number; wouldKill: boolean; damage: number; returnDamage: number } {
    const preview = getCombatPreviewUnitVsUnit(input.state, input.attacker, input.target);
    const scored = scoreDefenseAttackOption({
        state: input.state,
        playerId: input.playerId,
        attacker: input.attacker,
        targetType: "Unit",
        target: input.target,
        damage: preview.estimatedDamage.avg,
        returnDamage: preview.returnDamage?.avg ?? 0,
        cityCoord: input.cityCoord
    });
    return {
        score: scored.score,
        wouldKill: scored.wouldKill,
        damage: preview.estimatedDamage.avg,
        returnDamage: preview.returnDamage?.avg ?? 0
    };
}
