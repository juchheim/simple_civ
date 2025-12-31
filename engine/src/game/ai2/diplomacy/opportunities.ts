import { GameState, UnitType } from "../../../core/types.js";
import { hexDistance } from "../../../core/hex.js";
import { estimateMilitaryPower } from "../../ai/goals.js";
import { getAiProfileV2 } from "../rules.js";
import { canDeclareWar } from "../../helpers/diplomacy.js";
import { isCombatUnitType } from "../schema.js";

// ============================================================================
// v8.0: COMPLEX TACTICAL OPPORTUNITY DETECTION
// ============================================================================
// Detects multiple types of opportunities:
// 1. Early Rush - Military advantage over expanding enemy
// 2. Counter-Attack - Enemy military overextended
// 3. Vulnerable Cities - Low or no defenders

function isMilitaryUnit(u: { type: UnitType }): boolean {
    return isCombatUnitType(u.type);
}

/**
 * Check if the AI has enough military units staged near a target to attack effectively.
 * This prevents premature war declarations where the AI declares war but has no units
 * positioned to actually attack, leading to "declare war then do nothing" behavior.
 * 
 * When this returns false but a target is identified, the AI should set focusTargetPlayerId
 * which triggers the pre-war rally behavior in tactics.ts (lines 1247-1315) to stage units.
 */
export function hasUnitsStaged(state: GameState, playerId: string, targetId: string): boolean {
    const targetCities = state.cities.filter(c => c.ownerId === targetId);
    const focusCity = targetCities.find(c => c.isCapital) ?? targetCities[0];
    if (!focusCity) return false;

    const STAGING_DISTANCE = 5;
    const MIN_STAGED_UNITS = 3;

    const stagedMilitary = state.units.filter(u =>
        u.ownerId === playerId &&
        isMilitaryUnit(u) &&
        hexDistance(u.coord, focusCity.coord) <= STAGING_DISTANCE
    );

    return stagedMilitary.length >= MIN_STAGED_UNITS;
}

/**
 * Find a vulnerable city (low defenders within 2 tiles)
 */
function findVulnerableCity(
    state: GameState,
    ownerId: string,
    maxDefenders: number = 1
): { q: number; r: number; name: string; id: string; defenders: number } | null {
    const cities = state.cities.filter(c => c.ownerId === ownerId);
    const military = state.units.filter(u => u.ownerId === ownerId && isMilitaryUnit(u));

    let mostVulnerable: { city: typeof cities[0]; defenders: number } | null = null;

    for (const city of cities) {
        const defenders = military.filter(u => hexDistance(u.coord, city.coord) <= 2).length;
        if (defenders <= maxDefenders) {
            if (!mostVulnerable || defenders < mostVulnerable.defenders) {
                mostVulnerable = { city, defenders };
            }
        }
    }

    if (mostVulnerable) {
        return {
            q: mostVulnerable.city.coord.q,
            r: mostVulnerable.city.coord.r,
            name: mostVulnerable.city.name,
            id: mostVulnerable.city.id,
            defenders: mostVulnerable.defenders
        };
    }
    return null;
}

/**
 * v8.0: Detect Early Rush Opportunity
 * 
 * Triggers when:
 * - We have military advantage (1.5x+ power)
 * - Target is over-expanding (more cities than military)
 * - Target capital has low defense
 * - We have nearby units
 * 
 * Returns prioritized target or null.
 */
export function detectEarlyRushOpportunity(
    state: GameState,
    playerId: string
): { targetId: string; priority: number } | null {
    const profile = getAiProfileV2(state, playerId);
    if (!profile.diplomacy.canInitiateWars) return null;

    // Only consider early rush before turn 60
    if (state.turn > 60) return null;

    // Check early rush chance from profile
    const rushChance = (profile as any).earlyRushChance || 0;
    if (rushChance <= 0) return null;

    // Roll for early rush (deterministic based on turn + player id hash)
    const hash = playerId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const roll = ((state.turn * 7 + hash) % 100) / 100;
    if (roll > rushChance) return null;

    const myPower = estimateMilitaryPower(playerId, state);
    const myCities = state.cities.filter(c => c.ownerId === playerId);

    let bestTarget: { targetId: string; priority: number } | null = null;

    for (const other of state.players) {
        if (other.id === playerId || other.isEliminated) continue;
        if (!canDeclareWar(state, playerId, other.id)) continue;

        const theirPower = estimateMilitaryPower(other.id, state);
        const theirCities = state.cities.filter(c => c.ownerId === other.id);
        const theirMilitary = state.units.filter(u => u.ownerId === other.id && isMilitaryUnit(u));

        // Calculate priority based on opportunity factors
        let priority = 0;

        // Factor 1: Military advantage (up to +30)
        if (myPower > theirPower * 1.5) priority += 15;
        if (myPower > theirPower * 2.0) priority += 15;

        // Factor 2: Over-expansion (more cities than military) (up to +20)
        const overExpansion = theirCities.length - theirMilitary.length;
        if (overExpansion > 0) priority += Math.min(20, overExpansion * 5);

        // Factor 3: Capital low defense (up to +25)
        const theirCapital = theirCities.find(c => c.isCapital);
        if (theirCapital) {
            const capitalDefenders = theirMilitary.filter(u =>
                hexDistance(u.coord, theirCapital.coord) <= 2
            ).length;
            if (capitalDefenders === 0) priority += 25;
            else if (capitalDefenders === 1) priority += 15;
            else if (capitalDefenders === 2) priority += 5;
        }

        // Factor 4: Proximity (up to +15)
        const myCapital = myCities.find(c => c.isCapital);
        if (myCapital && theirCapital) {
            const dist = hexDistance(myCapital.coord, theirCapital.coord);
            if (dist <= 8) priority += 15;
            else if (dist <= 12) priority += 10;
            else if (dist <= 16) priority += 5;
        }

        // Only consider if priority is high enough
        if (priority >= 25 && (!bestTarget || priority > bestTarget.priority)) {
            bestTarget = { targetId: other.id, priority };
        }
    }

    return bestTarget;
}

/**
 * v8.0: Detect Counter-Attack Opportunity
 * 
 * Triggers when an opponent's military is far from their cities,
 * leaving them vulnerable to a counter-attack.
 * 
 * Returns the best opportunity or null.
 */
export function detectCounterAttackOpportunity(
    state: GameState,
    playerId: string
): { targetId: string; priority: number; vulnerableCity: { q: number; r: number; name: string; id: string } } | null {
    const profile = getAiProfileV2(state, playerId);
    if (!profile.diplomacy.canInitiateWars) return null;

    const myMilitary = state.units.filter(u => u.ownerId === playerId && isMilitaryUnit(u));

    let bestOpportunity: {
        targetId: string;
        priority: number;
        vulnerableCity: { q: number; r: number; name: string; id: string }
    } | null = null;

    for (const other of state.players) {
        if (other.id === playerId || other.isEliminated) continue;
        if (!canDeclareWar(state, playerId, other.id)) continue;

        const theirCities = state.cities.filter(c => c.ownerId === other.id);
        const theirMilitary = state.units.filter(u => u.ownerId === other.id && isMilitaryUnit(u));

        if (theirCities.length === 0 || theirMilitary.length === 0) continue;

        // Find their most vulnerable city
        let mostVulnerable: { city: typeof theirCities[0]; defenders: number } | null = null;
        for (const city of theirCities) {
            const defenders = theirMilitary.filter(u => hexDistance(u.coord, city.coord) <= 2).length;
            if (!mostVulnerable || defenders < mostVulnerable.defenders) {
                mostVulnerable = { city, defenders };
            }
        }

        if (!mostVulnerable) continue;

        // Calculate how overextended their military is
        let totalDistFromHome = 0;
        for (const unit of theirMilitary) {
            let minDistToCity = Infinity;
            for (const city of theirCities) {
                const dist = hexDistance(unit.coord, city.coord);
                if (dist < minDistToCity) minDistToCity = dist;
            }
            totalDistFromHome += minDistToCity;
        }
        const avgDistFromHome = totalDistFromHome / theirMilitary.length;

        // Calculate priority
        let priority = 0;

        // Factor 1: Low defenders on vulnerable city (up to +30)
        priority += (3 - mostVulnerable.defenders) * 10;

        // Factor 2: Nearby friendly units (up to +20)
        const nearbyFriendlies = myMilitary.filter(u =>
            hexDistance(u.coord, mostVulnerable!.city.coord) <= 5
        ).length;
        priority += Math.min(20, nearbyFriendlies * 5);

        // Factor 3: Enemy military far from home (up to +25)
        if (avgDistFromHome >= 5) priority += 15;
        if (avgDistFromHome >= 8) priority += 10;

        // Factor 4: Vulnerable city is capital (+10)
        if (mostVulnerable.city.isCapital) priority += 10;

        // Only consider if priority is high enough
        if (priority >= 40 && (!bestOpportunity || priority > bestOpportunity.priority)) {
            bestOpportunity = {
                targetId: other.id,
                priority,
                vulnerableCity: {
                    q: mostVulnerable.city.coord.q,
                    r: mostVulnerable.city.coord.r,
                    name: mostVulnerable.city.name,
                    id: mostVulnerable.city.id
                }
            };
        }
    }

    return bestOpportunity;
}

export type TacticalOpportunity = {
    targetId: string;
    focusCity?: { q: number; r: number; name: string; id: string };
    reason: string;
};

/**
 * Check for any tactical opportunity (early rush, counter-attack, or punitive strike)
 */
export function checkTacticalOpportunity(
    state: GameState,
    playerId: string
): TacticalOpportunity | null {
    // Check early rush opportunity
    const earlyRush = detectEarlyRushOpportunity(state, playerId);
    if (earlyRush) {
        const targetCities = state.cities.filter(c => c.ownerId === earlyRush.targetId);
        const focusCity = targetCities.find(c => c.isCapital) || targetCities[0];
        if (focusCity) {
            return {
                targetId: earlyRush.targetId,
                focusCity: { q: focusCity.coord.q, r: focusCity.coord.r, name: focusCity.name, id: focusCity.id },
                reason: `Early Rush (priority ${earlyRush.priority})`
            };
        }
    }

    // Check counter-attack opportunity
    const counterAttack = detectCounterAttackOpportunity(state, playerId);
    if (counterAttack) {
        return {
            targetId: counterAttack.targetId,
            focusCity: counterAttack.vulnerableCity,
            reason: `Counter-Attack (priority ${counterAttack.priority})`
        };
    }

    // Check simple vulnerable city (fallback)
    for (const other of state.players) {
        if (other.id === playerId || other.isEliminated) continue;
        if (!canDeclareWar(state, playerId, other.id)) continue;

        const vulnerable = findVulnerableCity(state, other.id, 0);
        if (vulnerable) {
            // Must have enough free units
            const myCityCoordsSet = new Set(
                state.cities.filter(c => c.ownerId === playerId).map(c => `${c.coord.q},${c.coord.r}`)
            );
            const freeUnits = state.units.filter(u =>
                u.ownerId === playerId &&
                isMilitaryUnit(u) &&
                !u.isHomeDefender &&
                !myCityCoordsSet.has(`${u.coord.q},${u.coord.r}`)
            );

            if (freeUnits.length >= 4) {
                return {
                    targetId: other.id,
                    focusCity: vulnerable,
                    reason: `Punitive Strike (0 defenders on ${vulnerable.name})`
                };
            }
        }
    }

    return null;
}
