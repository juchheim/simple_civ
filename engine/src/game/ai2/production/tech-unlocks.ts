import { canBuild } from "../../rules.js";
import { City, GameState, TechId, UnitType } from "../../../core/types.js";
import { aiInfo } from "../../ai/debug-logging.js";
import type { BuildOption, ProductionContext } from "../production.js";

export function pickTechUnlockBuild(
    state: GameState,
    city: City,
    context: ProductionContext
): BuildOption | null {
    const { player, profile, myUnits, myCities, atWar, phase } = context;

    // Landship FIRST: If we researched CompositeArmor and at war/Execute phase
    // v6.1: Landship is CORE late game unit. Increase cap to 8.
    if (player.techs.includes(TechId.CompositeArmor) && (atWar || phase === "Execute")) {
        const currentLandships = myUnits.filter(u => u.type === UnitType.Landship).length;
        if (currentLandships < 8 && canBuild(city, "Unit", UnitType.Landship, state)) {
            aiInfo(`[AI Build] ${profile.civName} TECH UNLOCK: Landship (${currentLandships}/8)`);
            return { type: "Unit", id: UnitType.Landship };
        }
    }

    // Airship SECOND: Niche support unit
    // v6.1: ONLY build if we already have Landships (Core). Don't build Airships in isolation.
    if (player.techs.includes(TechId.Aerodynamics)) {
        const currentLandships = myUnits.filter(u => u.type === UnitType.Landship).length;
        const currentAirships = myUnits.filter(u => u.type === UnitType.Airship).length;

        // Strict Condition: Must have 2+ Landships first
        if (currentLandships >= 2) {
            const airshipCap = Math.min(2, myCities.length); // Max 1 per city, cap at 2
            if (currentAirships < airshipCap && canBuild(city, "Unit", UnitType.Airship, state)) {
                aiInfo(`[AI Build] ${profile.civName} TECH UNLOCK: Airship (${currentAirships}/${airshipCap}) - Have Landships`);
                return { type: "Unit", id: UnitType.Airship };
            }
        }
    }

    return null;
}
