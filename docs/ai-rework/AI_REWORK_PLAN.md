# AI Rework Plan

## Purpose
Create a step-by-step, execution-ready plan to evolve the current AI from rules-heavy scripting into a utility-based architecture with spatial reasoning, perception limits, and scalable performance.

## Current State Summary
The AI is functional and feature-rich, but decision-making is dominated by hard-coded rules and phase gates, which makes behavior brittle and predictable. Spatial reasoning is mostly local and per-unit, with no influence maps or theater-level planning. The system has several tactical scoring modules, but they are not unified under a central utility brain that arbitrates strategic intent.

## Audit Findings By Lens
Decision-Making Architecture: Rules and priority ladders dominate (tech, production, diplomacy, army phase). There are tactical scorers, but no unified utility arbitration across layers.
Spatial Reasoning: AI performs per-unit tile scans and repeated A* calls without map-level influence fields or front detection.
Hierarchical Logic: Tactical planner is a god-object coordinating offense, defense, siege, and titan; no explicit strategic-operational-tactical decomposition.
Performance & Pathfinding: Pathfinding is repeated per unit and per action, with limited caching and no time slicing. Several loops scan large map sets per unit.
Player Experience: AI uses perfect information in many decisions. Human bias exists, but it is a direct scoring modifier rather than a personality-driven uncertainty model.

## Red Flags (Targets For Refactor)
engine/src/game/ai2/turn-runner.ts: Fixed phase pipeline with no cross-layer arbitration -> Replace with central brain that scores intents and assigns budgets.
engine/src/game/ai2/strategy.ts: Hard-coded goal switching using full enemy state -> Replace with utility goal selection over perceived state with hysteresis.
engine/src/game/ai2/production.ts: Large priority ladder with civ-specific hacks -> Replace with candidate generation + normalized utility scoring.
engine/src/game/ai2/diplomacy.ts: Rule-heavy war forcing and omniscient evaluation -> Replace with diplomacy utility using perception and front influence.
engine/src/game/ai2/army-phase.ts: Finite state machine gating attacks -> Replace with continuous readiness utility and rally tasks.
engine/src/game/ai2/tactical-planner.ts: God-object for tactics -> Split into tactical subsystems that emit scored actions into a resolver.
engine/src/game/ai2/targeting.ts: Repeated pathfinding in local scans -> Replace with cached distance fields and flow fields.
engine/src/game/helpers/pathfinding.ts: A* called frequently with minimal reuse -> Add per-turn path cache, flow fields, and time-slicing.
engine/src/game/ai2/defense-situation/assessment.ts: Threat evaluation uses omniscient enemy lists -> Use perception memory and last-seen positions.

## Missing Systems
Influence maps (threat, control, resource, mobility).
Perception and belief model (fog-of-war memory, uncertainty decay).
Unified utility arbitration layer across strategy, production, diplomacy, and tactics.
Operational theater/front manager for grouping forces and targets.
Multi-turn planner (HTN/GOAP style) for war prep, city specialization, and victory races.
Group pathing via flow fields and per-turn path caches.
Opponent modeling and intent prediction.
Mistake emulation and bounded rationality.

## Execution Roadmap (Step-by-Step)
1. Perception Layer
Completed: AiPerception snapshot + visibility gating for tactics, focus targeting, production threat, and war staging. Remaining: last-seen memory and uncertainty decay so AI can reason about unseen units.
2. Influence Maps
Completed (scaffold): per-turn influence grids for threat, control, border, front, pressure, resource value, and mobility cost. Integrated into theater manager scoring and war staging/production bias. Added caching + time-sliced updates (budgeted build) via influence map cache and orchestrated in the turn runner.
3. Utility Framework Core
Introduce a standard utility scorer interface with normalized 0..1 outputs, plus a resolver that selects intents and actions under per-turn budgets. Deliverable: core utility utilities plus logging hooks for score breakdowns.
4. Subsystem Conversion Order
Convert subsystems in this order: tech selection, diplomacy, production, strategic goal selection, tactical planning, operational theater manager, and finally movement/pathing integration. Each conversion must remove hard-coded priority ladders and emit normalized scores.
5. Operational Layer
Add a theater manager that clusters conflict fronts using influence gradients and assigns objectives to groups. Deliverable: OpOrder list with objective targets, staging points, and desired force ratios.
6. Tactical Layer
Refactor tactics to consume OpOrders and influence maps, emitting scored actions into a global resolver to avoid unit-level conflicts.
7. Performance Layer
Add flow fields and time slicing for movement and targeting queries; implement per-turn budgets to bound AI computation.
8. Player Experience Layer
Add uncertainty, limited lookahead, and controlled noise tied to civ personality. Deliverable: consistent fog-of-war adherence and fewer omniscient reactions.

## Conversion Status
- Completed: tech selection, diplomacy, production, strategic goal selection (utility scoring).
- In progress: tactical planning (utility-scored action resolver).
- Completed: operational theater manager scaffold (front clustering + objective assignment).
- Completed: perception snapshot + visibility gating (tactics, strategy focus, production threat/staging, siege targeting).
- Completed: movement/pathing integration (flow fields + influence bias, cache invalidation, defense/siege/rally/titan/retreat routing, regression tests).

## Status Update (2026-02-04)
- Flow-field integration is complete across all active movement paths (defense, siege, rally, titan, retreat).
- Regression tests added/updated for flow usage (defense, siege, titan, retreat).
- Movement/pathing integration milestone: no remaining incomplete items.

## Utility Framework Standard
All subsystem scorers must output values in 0..1 and include a score breakdown for debugging. Scores must be computed from perception, not omniscient state. Each subsystem must expose a candidate list plus a winner with a documented rationale.

## Definition Of Done For Each Subsystem
The old priority ladder or hard gate is removed. The new logic uses normalized utility scoring and logs a breakdown. The subsystem reads from perception and influence maps rather than raw state.

## Testing Expectations
Add or update unit tests for each subsystem conversion. Add one integration simulation test that validates the AI still completes a full turn without errors.

## Risks And Mitigations
Risk: Utility scores fluctuate and cause thrashing. Mitigation: apply hysteresis and minimum commitment windows.
Risk: Influence maps cost too much time. Mitigation: incremental updates and time-sliced evaluation.
Risk: Behavior regressions during conversion. Mitigation: keep old behavior behind a feature flag during each subsystem migration.

## Initial Subsystem Choice
Tech selection is the first conversion target because it is self-contained and already uses partial heuristics. It can be fully converted to the utility model without large architectural dependencies.
