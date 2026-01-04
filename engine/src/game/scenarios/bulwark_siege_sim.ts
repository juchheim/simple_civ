/**
 * Bulwark Siege Simulation
 * Tests: Can 2 ArmySpearGuard + 1 ArmyBowGuard capture a city with Bulwark?
 */

import {
    CIV6_DAMAGE_BASE,
    CIV6_DAMAGE_DIVISOR,
    CIV6_DAMAGE_MIN,
    CIV6_DAMAGE_MAX,
    UNITS,
    BUILDINGS,
    CITY_DEFENSE_BASE,
    CITY_WARD_DEFENSE_BONUS,
    CITY_ATTACK_BASE,
    CITY_WARD_ATTACK_BONUS,
    CITY_HEAL_PER_TURN,
    BASE_CITY_HP,
} from "../../core/constants.js";
import { BuildingType, UnitType } from "../../core/types.js";

// Constants
const BULWARK_DEF = BUILDINGS[BuildingType.Bulwark].defenseBonus || 0; // +5
const BULWARK_ATK = BUILDINGS[BuildingType.Bulwark].cityAttackBonus || 0; // +2

// Unit Stats
const ARMY_SPEARGUARD = UNITS[UnitType.ArmySpearGuard]; // ATK 8, DEF 4, HP 15
const ARMY_BOWGUARD = UNITS[UnitType.ArmyBowGuard];     // ATK 6, DEF 3, HP 15

// Damage Formula
function calcDamage(atk: number, def: number): number {
    const diff = atk - def;
    const baseDamage = CIV6_DAMAGE_BASE * Math.exp(diff / CIV6_DAMAGE_DIVISOR);
    return Math.max(CIV6_DAMAGE_MIN, Math.min(CIV6_DAMAGE_MAX, Math.round(baseDamage)));
}

// City Setup
interface CityState {
    hp: number;
    maxHp: number;
    defense: number;
    attack: number;
    pop: number;
    hasBulwark: boolean;
    hasWard: boolean;
    hasGarrison: boolean;
    garrisonType?: UnitType;
}

interface UnitState {
    type: UnitType;
    hp: number;
    atk: number;
    def: number;
}

function createCity(hasBulwark: boolean, hasWard: boolean, hasGarrison: boolean, pop: number = 5): CityState {
    let defense = CITY_DEFENSE_BASE + Math.floor(pop / 2); // Base + Pop bonus
    let attack = CITY_ATTACK_BASE;

    if (hasBulwark) {
        defense += BULWARK_DEF;
        attack += BULWARK_ATK;
    }
    if (hasWard) {
        defense += CITY_WARD_DEFENSE_BONUS;
        attack += CITY_WARD_ATTACK_BONUS;
    }
    if (hasGarrison) {
        // Assume Lorekeeper garrison (ranged, +1 DEF, +3 ATK)
        defense += 1;
        attack += 3;
    }

    return { hp: BASE_CITY_HP, maxHp: BASE_CITY_HP, defense, attack, pop, hasBulwark, hasWard, hasGarrison, garrisonType: hasGarrison ? UnitType.Lorekeeper : undefined };
}

function createAttackForce(): UnitState[] {
    return [
        { type: UnitType.ArmySpearGuard, hp: ARMY_SPEARGUARD.hp, atk: ARMY_SPEARGUARD.atk, def: ARMY_SPEARGUARD.def },
        { type: UnitType.ArmySpearGuard, hp: ARMY_SPEARGUARD.hp, atk: ARMY_SPEARGUARD.atk, def: ARMY_SPEARGUARD.def },
        { type: UnitType.ArmyBowGuard, hp: ARMY_BOWGUARD.hp, atk: ARMY_BOWGUARD.atk, def: ARMY_BOWGUARD.def },
    ];
}

function simulateSiege(city: CityState, attackers: UnitState[], maxTurns: number = 50): { turnsToCapture: number | "Never"; survivingAttackers: number; cityHpRemaining: number } {
    let turns = 0;

    console.log(`\n--- Siege Start ---`);
    console.log(`City: HP=${city.hp}, DEF=${city.defense}, ATK=${city.attack}`);
    console.log(`Attackers: ${attackers.map(a => `${a.type}(HP=${a.hp})`).join(", ")}`);

    while (city.hp > 0 && attackers.some(a => a.hp > 0) && turns < maxTurns) {
        turns++;
        let turnLog = `Turn ${turns}: `;

        // Each attacker attacks the city
        for (const attacker of attackers) {
            if (attacker.hp <= 0) continue;

            const dmgToCity = calcDamage(attacker.atk, city.defense);
            city.hp = Math.max(0, city.hp - dmgToCity);

            // City retaliates (only melee get hit)
            const isMelee = UNITS[attacker.type].rng === 1;
            if (isMelee && city.hp > 0) {
                const retaliation = calcDamage(city.attack, attacker.def);
                attacker.hp = Math.max(0, attacker.hp - retaliation);
            }
        }

        // City heals at end of turn if not at 0
        if (city.hp > 0) {
            city.hp = Math.min(city.maxHp, city.hp + CITY_HEAL_PER_TURN);
        }

        const alive = attackers.filter(a => a.hp > 0);
        turnLog += `City HP=${city.hp}, Alive Attackers=${alive.length}`;
        console.log(turnLog);

        if (city.hp <= 0) {
            console.log(`City Captured on Turn ${turns}!`);
            return { turnsToCapture: turns, survivingAttackers: alive.length, cityHpRemaining: 0 };
        }
        if (alive.length === 0) {
            console.log(`All Attackers Dead on Turn ${turns}!`);
            return { turnsToCapture: "Never", survivingAttackers: 0, cityHpRemaining: city.hp };
        }
    }

    console.log(`Siege Stalled after ${turns} turns.`);
    return { turnsToCapture: "Never", survivingAttackers: attackers.filter(a => a.hp > 0).length, cityHpRemaining: city.hp };
}

// --- Run Simulations ---
console.log("=".repeat(60));
console.log("BULWARK SIEGE SIMULATION");
console.log("Attackers: 2x ArmySpearGuard + 1x ArmyBowGuard");
console.log("=".repeat(60));

console.log("\n=== Scenario 1: City with NO Bulwark, NO Ward, NO Garrison ===");
const result1 = simulateSiege(createCity(false, false, false), createAttackForce());
console.log(`Result: ${result1.turnsToCapture === "Never" ? "FAILED" : `Captured in ${result1.turnsToCapture} turns`}, ${result1.survivingAttackers} attackers survived`);

console.log("\n=== Scenario 2: City with Bulwark ONLY ===");
const result2 = simulateSiege(createCity(true, false, false), createAttackForce());
console.log(`Result: ${result2.turnsToCapture === "Never" ? "FAILED" : `Captured in ${result2.turnsToCapture} turns`}, ${result2.survivingAttackers} attackers survived`);

console.log("\n=== Scenario 3: City with Bulwark + CityWard ===");
const result3 = simulateSiege(createCity(true, true, false), createAttackForce());
console.log(`Result: ${result3.turnsToCapture === "Never" ? "FAILED" : `Captured in ${result3.turnsToCapture} turns`}, ${result3.survivingAttackers} attackers survived`);

console.log("\n=== Scenario 4: City with Bulwark + CityWard + Lorekeeper Garrison ===");
const result4 = simulateSiege(createCity(true, true, true), createAttackForce());
console.log(`Result: ${result4.turnsToCapture === "Never" ? "FAILED" : `Captured in ${result4.turnsToCapture} turns`}, ${result4.survivingAttackers} attackers survived`);

// Summary
console.log("\n" + "=".repeat(60));
console.log("SUMMARY");
console.log("=".repeat(60));
console.log(`No Defenses:           ${result1.turnsToCapture === "Never" ? "FAILED" : `${result1.turnsToCapture} turns, ${result1.survivingAttackers} survive`}`);
console.log(`Bulwark Only:          ${result2.turnsToCapture === "Never" ? "FAILED" : `${result2.turnsToCapture} turns, ${result2.survivingAttackers} survive`}`);
console.log(`Bulwark + Ward:        ${result3.turnsToCapture === "Never" ? "FAILED" : `${result3.turnsToCapture} turns, ${result3.survivingAttackers} survive`}`);
console.log(`Bulwark + Ward + Garr: ${result4.turnsToCapture === "Never" ? "FAILED" : `${result4.turnsToCapture} turns, ${result4.survivingAttackers} survive`}`);
