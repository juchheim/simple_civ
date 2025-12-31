// Defense combat module - exports only the planner-driven API.
// Legacy run-phase entry points (runHomeDefenderCombat, coordinateDefensiveFocusFire,
// runDefensiveRingCombat, runLastStandAttacks) have been removed.
export { planTacticalDefense } from "./defense-combat/tactical-defense.js";
