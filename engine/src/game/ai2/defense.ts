// Defense module - exports only the planner-driven API surface.
// Legacy run-phase entry points have been removed; all defense actions
// now flow through the unified tactical planner.

export { planTacticalDefense } from "./defense-combat.js";
export { isPerimeterCity } from "./defense-perimeter.js";
export { planDefenseAssignments } from "./defense/steps.js";
export { planDefensiveRing } from "./defense-ring.js";
export { planMutualDefenseReinforcements } from "./defense-mutual-defense.js";
