# AI Unit Intelligence Improvements v2

## Goal
Make the AI tactically smarter: coordinate battles, avoid suicidal moves, maintain proper army size, and protect vulnerable units.

---

## Problems Identified

| Problem | Symptom | Fix |
|---------|---------|-----|
| Bowguard-only siege | City stuck at 1 HP forever | Route capture units to sieges |
| Suicidal lateral move | Retreat into another enemy | Danger-aware pathfinding |
| Poor combat evaluation | Run when could kill | Check combat outcome before retreat |
| No unit coordination | Fight individually | Battle group coordination |
| Allies don't help | Nearby units watch ally die | Aid vulnerable units |
| Bad army sizing | Too few/many units | Production intelligence |

---

## Implementation Phases

### Phase 2: Intelligent Retreat
Files: `unit-helpers.ts`, `defense.ts`, `settlers.ts`

- Add `evaluateTileDanger()` to score enemy threat per tile
- Add `findSafeRetreatTile()` for danger-aware retreat
- Update `retreatWounded()` to avoid retreating into enemies
- Update settler flee to consider ALL nearby threats

### Phase 3: Siege Composition  
Files: `offense.ts`, `cities.ts`

- Add `hasSiegeCapability()` to check for capture-capable units
- Route SpearGuard/Riders to stalled sieges
- Prioritize building capture units when sieges lack them

### Phase 4: Combat Evaluation
Files: `unit-helpers.ts`

- Add `estimateSurvivalRounds()` and `canKillNearbyEnemy()`
- Update `shouldRetreat()`: stay if can kill, run if just dying

### Phase 5: Unit Coordination
Files: `offense.ts`

- Add `identifyBattleGroups()` to cluster nearby units
- Add `coordinateGroupAttack()` for sequenced attacks
- Focus fire: all units target same enemy
- Attack order: ranged first, then melee

### Phase 6: Aid Vulnerable Units
Files: `defense.ts`, `turn-runner.ts`

- Add `findVulnerableAllies()` to detect threatened units
- Add rescue behavior to move healthy units toward threatened allies
- Call after city defense, before attacks

### Phase 7: Production Intelligence
Files: `cities.ts`, `war-prep.ts`

- Add `calculateDesiredArmySize()`:
  - Peace: 1 unit per city minimum
  - War prep: 2x peace + siege force
  - War: build until 1.5x enemy power
- Maintain garrison while attacking
- Cap settlers during war

---

## Verification

### Tests (`npm run test` in engine/)

New cases for `tactics.test.ts`:
1. Safe retreat direction
2. Siege composition routing
3. Combat evaluation (stay vs run)
4. Group coordination  
5. Aid vulnerable ally
6. Army sizing

### Manual
1. Attack AI unit → observe retreat direction
2. Siege AI city → observe production response
3. Surround AI unit → observe if allies come
4. Declare war → observe military buildup
