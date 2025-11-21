import { TERRAIN_DEF_MOD } from "../data/terrainData";
import { UNIT_STATS, ARMY_BONUS } from "../data/unitData";
import { RNG } from "../types/gameTypes";
import { Unit } from "../types/unitTypes";
import { City } from "../types/cityTypes";

export function rollAttackBand(rng:RNG): number {
  const r = rng();
  if (r < 1/3) return -1;
  if (r < 2/3) return 0;
  return 1;
}

export function computeDamage(attAtk:number, defDef:number, rng:RNG): number {
  const atkPower = attAtk + rollAttackBand(rng);
  const defPower = defDef;
  const delta = atkPower - defPower;
  const raw = 3 + Math.floor(delta/2);
  return Math.min(Math.max(raw,1),7);
}

export function resolveUnitVsUnit(att:Unit, def:Unit, defTerrain:any, rng:RNG): number {
  const attStats = baseStats(att);
  const defStats = baseStats(def);

  let defensePower = defStats.def + TERRAIN_DEF_MOD[defTerrain.terrain];
  if (def.fortified) defensePower += 1;

  const dmg = computeDamage(attStats.atk, defensePower, rng);
  def.hp -= dmg;
  return dmg;
}

export function resolveUnitVsCity(att:Unit, city:City, cityDefense:number, rng:RNG): number {
  const attStats = baseStats(att);
  const dmg = computeDamage(attStats.atk, cityDefense, rng);
  // city HP handled in cities.ts
  return dmg;
}

function baseStats(u:Unit) {
  const s = UNIT_STATS[u.type];
  if (!u.isArmy) return s;
  return {...s, atk:s.atk+ARMY_BONUS.atk, def:s.def+ARMY_BONUS.def, maxHP:ARMY_BONUS.maxHP };
}