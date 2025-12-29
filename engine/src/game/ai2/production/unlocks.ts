// Unit unlock mapping based on tech progression.
import { TechId, UnitType } from "../../../core/types.js";

export function getUnlockedUnits(playerTechs: TechId[]): UnitType[] {
    // Base units always available
    const unlocked: UnitType[] = [UnitType.Scout, UnitType.Settler];

    const hasDrilledRanks = playerTechs.includes(TechId.DrilledRanks);
    const hasArmyDoctrine = playerTechs.includes(TechId.ArmyDoctrine);

    if (playerTechs.includes(TechId.FormationTraining)) {
        // Unit obsolescence: SpearGuard/BowGuard become obsolete once DrilledRanks is researched
        // AI should build Army versions instead (stronger, better survival)
        if (!hasDrilledRanks) {
            unlocked.push(UnitType.SpearGuard, UnitType.BowGuard);
        }
    }
    if (playerTechs.includes(TechId.TrailMaps)) {
        // Unit obsolescence: Riders become obsolete once ArmyDoctrine is researched
        if (!hasArmyDoctrine) {
            unlocked.push(UnitType.Riders);
        }
    }
    if (hasDrilledRanks) {
        unlocked.push(UnitType.ArmySpearGuard, UnitType.ArmyBowGuard);
    }
    if (hasArmyDoctrine) {
        unlocked.push(UnitType.ArmyRiders);
    }
    // Landship and Airship are NOT obsoleted - they are unique advanced units
    if (playerTechs.includes(TechId.CompositeArmor)) {
        unlocked.push(UnitType.Landship);
    }
    if (playerTechs.includes(TechId.Aerodynamics)) {
        unlocked.push(UnitType.Airship);
    }
    if (playerTechs.includes(TechId.CityWards)) {
        // CityWards unlocks Bulwark building (not a unit)
    }
    return unlocked;
}
