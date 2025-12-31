export {
    scoreAttackOption,
    scoreAttackOptionWithBreakdown,
    scoreCityAttack,
    scoreCityAttackWithBreakdown,
    scoreDefenseAttackOption,
    scoreDefenseAttackOptionWithBreakdown,
    scoreDefenseAttackPreview,
    scoreMoveAttackOption,
    scoreMoveAttackOptionWithBreakdown,
    scoreUnitAttack,
    scoreUnitAttackWithBreakdown,
    getDefenseBonus,
    evaluateCaptureSupport,
} from "../tactical-scoring.js";

export type {
    AttackScoreInput,
    AttackScoreResult,
    CaptureSupportResult,
    DefenseAttackScoreInput,
    MoveAttackScoreInput,
    MoveAttackScoreResult,
    ScoreBreakdown,
} from "../tactical-scoring.js";
