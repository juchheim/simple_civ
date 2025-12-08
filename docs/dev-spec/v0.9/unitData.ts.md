import { UnitType, UnitClass, UnitStats } from "../types/unitTypes";

export const UNIT_STATS: Record<UnitType, UnitStats> = {
  Settler: {
    atk:0, def:0, range:1, move:1, maxHP:1, costP:70,
    class:UnitClass.Civilian, canCaptureCity:false, domain:"Land"
  },
  Scout: {
    atk:1, def:1, range:1, move:2, maxHP:10, costP:25,
    class:UnitClass.Scout, canCaptureCity:false, domain:"Land"
  },
  SpearGuard: {
    atk:2, def:2, range:1, move:1, maxHP:10, costP:30,
    class:UnitClass.Melee, canCaptureCity:true, domain:"Land"
  },
  BowGuard: {
    atk:2, def:1, range:2, move:1, maxHP:10, costP:30,
    class:UnitClass.Ranged, canCaptureCity:false, domain:"Land"
  },
  Riders: {
    atk:2, def:2, range:1, move:2, maxHP:10, costP:40,
    class:UnitClass.Cavalry, canCaptureCity:true, domain:"Land"
  },
  Skiff: {
    atk:2, def:2, range:1, move:3, maxHP:10, costP:35,
    class:UnitClass.Naval, canCaptureCity:false, domain:"Naval"
  },
};

export const ARMY_BONUS = { atk:+2, def:+2, maxHP:15 };
export const ARMY_UPGRADE_COST_MULT = 0.5; // 50% of base unit cost