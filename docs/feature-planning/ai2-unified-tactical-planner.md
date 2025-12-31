# AI2 Unified Role and Threat Schema + Tactical Planner Interface

Status: Draft

## Goals
- Unify offense and defense scoring under a single role and threat schema.
- Consolidate tactical planning into a single planner that returns a coherent action plan.
- Keep AI decisions tunable via `AiTacticsProfileV2` and civ personalities.
- Preserve special rules like Trebuchet city-only siege behavior while fitting the unified model.
- Enforce war-only attacks and use border violations to trigger war before attacking.

## Non-Goals
- Redesign diplomacy, production, or strategic goal selection.
- Change combat rules, unit stats, or garrison mechanics.
- Replace the ArmyPhase state machine (it should remain as a gate).

## Current Gaps (Why This Is Needed)
- Multiple overlapping scoring systems: attack-order, move-attack, defense-situation, defense-combat.
- Threat and value are computed differently in different modules.
- Roles are defined in one place, but tactical behavior reinterprets them inconsistently.
- The tactical planner executes offense and defense in separate pipelines without a shared view.
- Hard-coded rules and exceptions make tuning brittle and non-obvious.

## Unified Role and Threat Schema

### 1) Unit Role and Capability Profile
Keep the existing `UnitRole` as the primary label and add a derived capability profile used by all tactical logic.

Primary role (existing):
- `siege`, `capture`, `defense`, `vision`, `civilian`

Capabilities (derived from stats and traits):
- `canAttackUnits`, `canAttackCities`, `canCaptureCities`
- `range`, `mobility`, `isRanged`, `isArmy`, `isTitan`
- `isSiege`, `isCityOnlySiege` (siege that cannot attack units)
- `garrisonEligible` (exclude Scout, Trebuchet, Settler)

Role tags (derived, not exclusive):
- `frontline` (melee, high HP, low range)
- `skirmisher` (ranged, low HP, mobility)
- `siege_specialist` (city-only siege behavior)
- `capturer` (can capture cities)
- `support` (low damage, utility, escort)

### 2) Threat Profile (Enemy-Centric)
Every enemy unit and city gets a unified threat profile so offense and defense reason with the same metrics.

Threat components:
- `unitThreat`: expected damage to units over one turn.
- `cityThreat`: expected damage to cities over one turn.
- `captureThreat`: proximity and capability to capture a city.
- `zoneThreat`: ability to contest or control tiles (move + range).
- `retaliationThreat`: risk of counterattack if we engage.
- `strategicValue`: unit value, city value, and capital status.

Derived fields:
- `reach`: distance minus attack range (<= 0 means attackable now).
- `pressure`: aggregate of threat components, scaled by profile.

### 3) Target Value Profile (Our-Centric)
Targets get a unified value profile so all attack types compare apples to apples.

Target components:
- `hpFrac`, `wouldKill`, `overkill`
- `isCapital`, `isFocusCity`, `isFocusUnit`
- `captureReady` (can capture now or have a ready capturer)
- `recaptureValue` (original owner bonus)
- `roleValue` (role-based priority, not just raw stats)

## Unified Tactical Scoring
All tactical actions should score using a shared set of components and weights.

Score components:
- `damageScore`: damage dealt and %HP removed.
- `killScore`: guaranteed kill value.
- `captureScore`: immediate capture or guaranteed follow-up capture.
- `threatRemoval`: reduces enemy threat profile.
- `objectiveBonus`: focus city, capital, or strategic unit bonus.
- `riskPenalty`: return damage and exposure.
- `exposurePenalty`: projected incoming damage on the destination tile.
- `stallPenalty`: preventing city HP at 0 without capture support.
- `roleFitBonus`: action aligns with unit role and capability profile.

Weights:
- Driven by `AiTacticsProfileV2` and civ aggression profiles.
- Any new weights must be surfaced in one place for tuning.

## Consolidated Tactical Planner Interface

### Planner Input
- `GameState`, `playerId`, `mode` (`offense-only` or `full`).
- `TacticalContext` with profile, memory, and enemy set.
- `ArmyPhase` to gate aggressive actions.

### Planner Output
Single plan object covering all tactical decisions for the turn.

Proposed shape (pseudocode):
```
type TacticalActionPlan = {
    action: Action;
    unitId: string;
    targetId?: string;
    intent: "attack" | "move-attack" | "defend" | "retreat" | "support" | "garrison";
    score: number;
    components: ScoreComponents;
};

type TacticalPlan = {
    actions: TacticalActionPlan[];
    debug?: {
        threatMap?: Record<string, number>;
        focusTargetId?: string;
        focusCityId?: string;
    };
};
```

### Implementation Notes (Phase 1)
- `planTacticalTurn` returns a `TacticalPlan` that captures defense and offense planning plus context.
- `executeTacticalPlan` runs the offense portion and post-attack cleanup.
- Defense pipeline still executes during planning so offense plans reflect post-defense state.
- Defense now emits explicit action plans that are merged into the unified `actions` list.
- Defense actions are still executed during planning to preserve post-defense state for offense planning.

### Planner Phases
1) Build context, roles, and threat profiles.
2) Generate candidates:
   - Immediate attacks
   - Move-then-attack
   - Defense actions (ring, intercept, focus-fire, retreat)
   - Garrison swaps and reinforcements
3) Score candidates with the unified scoring model.
4) Select actions:
   - One action per unit
   - Respect army-phase gates and war-only rules
   - Resolve conflicts by priority and score
5) Execute in deterministic order:
   - Defensive survival actions first
   - Attack order and move-attack
   - Post-attack cleanup

## Integration Map (Refactor Targets)
- Replace per-module scoring with `tactical-scoring.ts`.
- Replace defense and offense threat calculations with `tactical-threat.ts`.
- Use `isCityOnlySiege` capability to preserve Trebuchet behavior while keeping `siege` as the role.
- Centralize `capture support` and `stall penalties` logic.
- Tactical planner should call defense and offense through a single plan rather than separate pipelines.
- Use `assessCityThreatLevel` for defense and production gating (no legacy threat helpers).
- Keep wait-decision scoring aligned with `scoreAttackOption`.

## Focused Test Plan (for Implementation Phase)
- Attack scoring:
  - Capital focus bonus scales with `siegeCommitment`.
  - Focus proximity scales with `forceConcentration`.
  - City zeroing without capture support is penalized.
  - Trebuchet city-only siege bonus stays above generic siege when hitting cities.
- Move-attack:
  - LoS and exposure constraints are enforced.
  - High exposure cancels non-lethal move-attacks.
- Defense:
  - Threat levels derive from the same threat profile used in offense.
  - Focus-fire picks the same target that offensive scoring would prioritize.
  - Wait decision no-kill checks use unified scoring (no low-value pokes).
