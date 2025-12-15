# Feature Plan: Bulwark Defensive Unit & Engine Era Rebalance

## Problem Statement

Scholar Kingdoms and Starborne Seekers currently suffer from a critical strategic disadvantage:

1.  **The City Wards Trap:** Their unique traits push them toward researching `CityWards` (a defensive tech), which takes them *off* the optimal science/progress path. They invest turns into a dead-end that yields no offensive power.
2.  **Insufficient Defense:** The existing defensive bonuses (+Defense near cities) are not strong enough to repel dedicated "deathball" attacks from aggressive civs (Forge Clans, Aetherian Vanguard). The defensive civs just die slower.
3.  **No Return on Investment:** Building defensive structures/units is a pure sunk cost. Aggressive civs build units that generate map control and can snowball into victory. Defensive civs build units that... sit there.

**Result:** 0-10% win rates for Scholar Kingdoms and Starborne Seekers across simulations.

> [!WARNING]
> **Known Risk: Early Game Vulnerability**
> This plan addresses mid-to-late game defense. Scholar/Starborne civs remain vulnerable to early rushes (before `CityWards` is researched). This may require separate tuning (e.g., starting unit buffs, faster early tech, or existing defensive passive buffs).

---

## Proposed Solution

A three-pronged approach:

### 1. New Unit: **Bulwark**

A ranged defensive emplacement that acts as a city's ultimate garrison. It counters armies from a distance and provides economic value to specific civs.

| Stat        | Value | Notes                                             |
| :---------- | :---- | :------------------------------------------------ |
| Attack      | 2-4   | Minimal. It's a wall, not a weapon (until awakened). |
| Defense     | 18-20 | Very high. Shrugs off early/mid-game attacks.     |
| Range       | **2** | **Ranged retaliation.** Can strike attackers before they reach the city. |
| Movement    | 0     | **Cannot move.** Permanently anchored to its city.|
| HP          | 15    | Comparable to Army units.                         |
| Cost        | ~50   | Significant investment, but worth it.             |
| Domain      | Land  |                                                   |
| Capture?    | No    | Cannot capture cities.                            |
| Tech Req    | `CityWards` |                                              |

**Special Rules:**
*   **Immobile:** The `Bulwark` has 0 base movement. It cannot be given move orders. It stays on the city tile it was produced on.
*   **Science Yield (Civ-Specific):** For **Scholar Kingdoms** and **Starborne Seekers**, a city with a `Bulwark` garrison gains **+2 Science per turn**. This turns a military expense into an economic engine. *(Note: This value can be tuned down if testing shows snowball issues.)*
*   **Awakening (Star Charts):** If the owning player has researched `StarCharts`, the `Bulwark`'s Attack increases significantly (e.g., to 8-10). This defends the late-game Progress victory push.

---

### 2. Engine Era Tech Rebalance

The late game currently snowballs too fast. By the time defensive civs get their tools, they're already dead. We slow down the Engine Era and buff its *economic* rewards to make reaching it feel impactful.

| Tech          | Old Cost | New Cost | Reward Change                                     |
| :------------ | :------- | :------- | :------------------------------------------------ |
| `SteamForges` | 85       | **100**  | `Forgeworks` building: +4 Production (was +2).    |
| `SignalRelay` | 85       | **100**  | +2 Science per city (was +1).                     |
| `UrbanPlans`  | 85       | **100**  | `CitySquare` building: +2 Food, +2 Prod (was +1/+1). |
| `ArmyDoctrine`| 85       | **100**  | **No change to bonus.** Stays at +1/+1 to Armies. |
| `StarCharts`  | 85       | **120**  | Unlocks `Bulwark` attack bonus ("Awakening"). Gatekeeper to late-game. |

---

### 3. AI Behavior: Defensive Posture

Update AI personalities for Scholar Kingdoms and Starborne Seekers:

*   **Reduce `warPowerThreshold`:** Make them less likely to initiate offensive wars.
*   **Increase `peacePowerThreshold`:** Make them more likely to accept peace offers.
*   **Reduce `warDistanceMax`:** They should only fight neighbors who are actively threatening them.
*   **Prioritize Defensive Builds:** Ensure AI city build logic favors `CityWard` -> `Bulwark` over offensive units.

The goal is for these civs to feel *different* in gameplay: they turtle, they tech, they survive until late game, and then they either win via Progress or unleash their awakened Bulwarks.

---

## Implementation Checklist

- [ ] **`types.ts`**: Add `Bulwark` to `UnitType` enum.
- [ ] **`constants.ts`**:
    - [ ] Add `Bulwark` stats to `UNITS`.
    - [ ] Update Engine Era tech costs in `TECHS`.
    - [ ] Update `BUILDINGS` for `Forgeworks` (+4P) and `CitySquare` (+2F/+2P).
- [ ] **`rules.ts`**:
    - [ ] `canBuild`: Allow `Bulwark` if `CityWards` tech is present.
    - [ ] `getCityYields`: Add +2 Science if city has a `Bulwark` garrison and owner is Scholar/Starborne.
- [ ] **`combat.ts`**:
    - [ ] `getEffectiveUnitStats`: If unit is `Bulwark` and owner has `StarCharts`, increase Attack.
- [ ] **Movement Handling**:
    - [ ] Ensure `Bulwark` with 0 Move cannot receive move orders (validation in `handleMoveUnit`).
    - [ ] Ensure AI pathfinding ignores `Bulwark` units.
- [ ] **`personality.ts`**:
    - [ ] Update `ScholarKingdoms` aggression profile.
    - [ ] Update `StarborneSeekers` aggression profile.
- [ ] **AI Build Logic** (if applicable):
    - [ ] Add priority for `Bulwark` in defensive civ build queues.
- [ ] **New Test File (`bulwark.test.ts`)**:
    - [ ] Verify `Bulwark` cannot move.
    - [ ] Verify Science yield for Scholar/Starborne.
    - [ ] Verify Attack bonus with `StarCharts`.
    - [ ] Verify high Defense stat in combat calculations.

---

## Verification Plan

### Automated
*   Run existing `balance.test.ts` suite.
*   Create and run `bulwark.test.ts`.

### Manual Playtesting
1.  Start a game as Scholar Kingdoms.
2.  Rush `CityWards` tech.
3.  Build a `Bulwark`. Verify it cannot move.
4.  Verify city +2 Science yield appears.
5.  Provoke an attack from an AI. Verify `Bulwark` tanks significant damage.
6.  Research `StarCharts`. Verify `Bulwark` can now deal significant Attack damage.

### Simulation
*   Run 20-game batch simulation.
*   Verify Scholar Kingdoms and Starborne Seekers win rates improve to 15-25% range.
*   Verify aggressive civs (Forge Clans, Vanguard) win rates do not spike above 35%.
