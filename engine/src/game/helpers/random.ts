import { GameState } from "../../core/types.js";

/**
 * Advance the shared seed using the repo-standard LCG (see spawn/movement helpers).
 * Returns the pseudo-random integer derived from the previous seed.
 */
export function advanceSeed(state: GameState): number {
    const rand = Math.floor(state.seed * 10000);
    state.seed = (state.seed * 9301 + 49297) % 233280;
    return rand;
}

export function seededBool(state: GameState): boolean {
    return advanceSeed(state) % 2 === 0;
}

export function seededChoice<T>(state: GameState, options: T[]): T | null {
    if (options.length === 0) return null;
    const idx = advanceSeed(state) % options.length;
    return options[idx];
}
