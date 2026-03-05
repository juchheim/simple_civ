# Problem 07: Airship 97.1% Survival Rate — Why Do They Die At All?

## The Problem
Airships have a 97.1% survival rate (only 18 deaths out of 629 produced). They are defined as non-combat reconnaissance units in the `Air` domain and should not be targetable by ground/naval units. So why do any die?

## User Direction
"Figure out why they die at all. They're non-combat reconnaissance units that are in the air and shouldn't be targetable."

## Investigation Plan

### Current Airship Definition
From `constants.ts` line 399:
```
[UnitType.Airship]: { atk: 0, def: 10, rng: 0, move: 4, hp: 20, cost: 75, domain: UnitDomain.Air, canCaptureCity: false, vision: 4 }
```
- ATK 0, DEF 10, HP 20
- Domain: `UnitDomain.Air`
- Cannot capture cities, range 0 (can't attack)

### Where to Look for the Bug

#### 1. Combat System — Can Units Target Air Domain?
**File:** `engine/src/game/helpers/combat-preview.ts`
- Check `getCombatPreviewUnitVsUnit()`: does it filter out Air domain targets?
- Check if there's an explicit domain validation that prevents ground units from attacking air units.

**File:** `engine/src/game/ai2/schema.ts`
- Check `canAttackUnits()` and `canAttackCities()`: do these filter air domain?

**File:** `engine/src/game/ai2/attack-order/shared.ts`
- Check `canPlanAttack()`: does it validate target domain?

#### 2. Action Validation — Can Attack Actions Target Airships?
**File:** `engine/src/game/actions/` (directory — check all action handlers)
- Look for the `Attack` action handler. Does it validate that the target is a valid domain?
- If there's no domain check, ground units could attack Airships via direct action even though the AI wouldn't plan it.

#### 3. City Combat — Do Airships Take City Bombardment Damage?
**File:** Check if cities can target Air domain units during their turn.
- Cities have `CITY_ATTACK_RANGE = 2`. If an Airship flies within range 2 of an enemy city, does the city auto-attack it?
- This could explain a small number of deaths — Airships scouting near enemy cities take bombardment.

#### 4. Collateral/AoE Damage
- Check if there's any area-of-effect damage mechanic that could hit Airships incidentally.

#### 5. Starvation/Austerity Death
- Check if units can die from economic collapse (austerity → disbanding). If the owner goes to 0 gold and units are disbanded, Airships might be included.

### Fix Plan

Once the death source is identified:

#### If Ground Units Can Target Airships:
**File:** The combat validation system (likely `actions/` or `combat-preview.ts`)
- Add domain validation: `if (target.domain === UnitDomain.Air) return false` for all ground/naval attack sources.

#### If City Bombardment Hits Airships:
**File:** The city combat system
- Add domain filter: cities should not target Air domain units.

#### If Disbanding From Economic Collapse:
**File:** The disbanding/austerity system
- Add Airship protection: non-combat units in Air domain should be last to disband, or exempt from forced disbanding.

## Ripple Effects to Monitor
- **Vision balance:** Airships provide 4 vision, moving 4 tiles per turn. If truly invulnerable, they provide risk-free scouting. This is intentional per the design, but monitor if it creates information asymmetry problems.
- **Combat balance:** With truly untargetable Airships, the only counter is to build your own. Make sure the tech gate (Aerodynamics, avg turn 280) is late enough that this doesn't dominate.
- **18 deaths is very small.** This is likely an edge case bug rather than a design problem. Fix should be surgical.

## Verification
Run 200 simulations before/after. Target:
- Airship death rate: 0% (or effectively 0% — only from owner elimination)
- No change to other unit death rates
- No change to overall victory balance
