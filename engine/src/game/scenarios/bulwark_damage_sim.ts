
import { CIV6_DAMAGE_BASE, CIV6_DAMAGE_DIVISOR } from "../../core/constants.js";

// Mock Constants (pulled from read files)
// City Base Attack: 3
// Bulwark Bonus: 4
// City Ward Bonus: 1
const CITY_BASE_ATK = 3;
const BULWARK_BONUS = 4;
const CITY_WARD_BONUS = 1;

function simulate(attackerName: string, attackerDef: number, hasBulwark: boolean, hasWard: boolean) {
    let cityAtk = CITY_BASE_ATK;
    if (hasBulwark) cityAtk += BULWARK_BONUS;
    if (hasWard) cityAtk += CITY_WARD_BONUS;

    // Simulate average damage (seed doesn't matter for average, just use base formula)
    // Formula: BASE * exp(diff / DIVISOR)
    const diff = cityAtk - attackerDef;
    const baseDamage = CIV6_DAMAGE_BASE * Math.exp(diff / CIV6_DAMAGE_DIVISOR);

    // Range is * 0.9 to * 1.1
    const minDmg = Math.round(baseDamage * 0.9);
    const maxDmg = Math.round(baseDamage * 1.1);
    const avgDmg = Math.round(baseDamage);

    console.log(`[${attackerName} (Def ${attackerDef})] vs City(Atk ${cityAtk}): Return Damage = ${avgDmg} (Range: ${minDmg}-${maxDmg})`);
}

console.log("--- Standard City (No Bulwark) ---");
simulate("SpearGuard", 10, false, false);
simulate("ArmySpearGuard", 18, false, false);

console.log("\n--- City with Bulwark ---");
simulate("SpearGuard", 10, true, false);
simulate("ArmySpearGuard", 18, true, false);

console.log("\n--- City with Bulwark + City Ward ---");
simulate("SpearGuard", 10, true, true);
simulate("ArmySpearGuard", 18, true, true);
simulate("Titan", 25, true, true);
