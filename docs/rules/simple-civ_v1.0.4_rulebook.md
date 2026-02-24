## [DEV-ONLY] This document is the single source of truth for rules, data, and UX expectations. It is formatted for both developers and the in-game Codex.

## Table of Contents
- [1. Vision & Pillars](#1-vision-pillars)
- [2. How to Read & Terminology](#2-how-to-read-terminology)
- [3. Core Loop & Victory](#3-core-loop-victory)
- [4. Setup & Start State](#4-setup-start-state)
- [5. Turn Structure](#5-turn-structure)
- [6. Yields & Economy](#6-yields-economy)
- [7. Cities](#7-cities)
- [8. Terrain & Features](#8-terrain-features)
- [9. Units](#9-units)
- [10. Movement & Combat](#10-movement-combat)
- [11. Technology](#11-technology)
- [12. Buildings](#12-buildings)
- [13. Projects & Wonders](#13-projects-wonders)
- [14. Civilizations & Traits](#14-civilizations-traits)
- [15. Map & Generation](#15-map-generation)
- [16. Diplomacy](#16-diplomacy)
- [17. Victory, Ties, Elimination](#17-victory-ties-elimination)
- [[DEV-ONLY] 18. State Indicators & UI Standards](#18-state-indicators-ui-standards)
- [[DEV-ONLY] 19. Rules Priority & Engine Hooks](#19-rules-priority-engine-hooks)

<!-- CODEX_SKIP_START -->
## [DEV-ONLY] Authoring & Codex Conventions
- The rulebook is the single source of truth. Keep all rules, data, and appendices here.
- Codex hides any content inside `CODEX_SKIP_START/CODEX_SKIP_END` markers and any heading prefixed `[DEV-ONLY]`.
- For player-facing clarity, keep prose concise and bulleted. Avoid hard line breaks mid-sentence.
- When adding new sections, prefer numbered headings so anchors stay stable (e.g., `## 4. Setup & Start State`).
- If you must include engine-only notes (e.g., implementation details, debugging switches), wrap them in dev-only headings or skip blocks so players do not see them.
- To add a dev-only appendix, wrap the section in a skip block or prefix the heading with `[DEV-ONLY]`.
<!-- CODEX_SKIP_END -->

## 1. Vision & Pillars
- **One-more-turn, zero bloat**: fast, board-game-paced 4X on a compact hex map.
- **Clarity over crunch**: four yields (Food, Production, Science, Gold) with visible upkeep and clear economy levers.
- **Short campaign, real arc**: ~150 turns on Standard maps.
- **Safety nets**: every city defends itself; recovery is possible after setbacks.
- **Board-game readability**: few numbers, clear effects, deterministic structure with limited randomness in combat.

## 2. How to Read & Terminology
- **F/P/S/G**: Food, Production, Science, Gold.
- **Pop**: population of a city; equals number of worked tiles.
- **City Center**: founding tile; always worked; enforces minimum yields (2F/1P).
- **Garrison**: any friendly unit on the city tile; enables city attack.
- **Ring 1 / Ring 2**: hex distance 1 or 2 from city center.
- **Contact**: you have met another civ on the map; required for diplomacy.
- **Vision states**: Visible (bright), Revealed/Fogged (seen but not visible), Shroud (never seen).

## 3. Core Loop & Victory
- Cities work tiles → generate F/P/S/G.
- Food grows Pop → more tiles worked.
- Production completes Units/Buildings/Projects.
- Science unlocks Techs that improve everything else.
- Gold funds upkeep and enables rush-buy timing plays.
- Victory paths:
  - **Conquest**: control a majority of founded capitals (>50%) or be last with cities/settlers.
  - **Progress**: complete Observatory → Grand Academy → Grand Experiment.
  - Ties resolve per section 17.

## 4. Setup & Start State
- **Map size**: Tiny 20×15, Small 25×20, Standard 30×22, Large 35×25, Huge 40×30.
- **Civ count caps**: Tiny 2, Small 3, Standard 4, Large/Huge 6.
- **Players**: 1–4 (human/AI/hotseat). Rules identical for all.
- **Starting units**: each civ begins with 1 Settler + 1 Scout + 1 Spear Guard. **Scholar Kingdoms** gain an extra Bow Guard.
- **Starting placement**: fair-start zones with nearby workable tiles; capitals named from civ list (unique first-city name, then list, then "New [Capital] n" if exhausted). Players may rename on founding.
- **Fog**: unseen tiles start in shroud; vision comes from units/cities and shared vision offers.

## 5. Turn Structure
- **Start of Turn (Upkeep & Yields)**:
  - For each city: add F/P/S/G yields; apply growth if stored Food ≥ cost; apply build progress if stored Production ≥ cost; heal city if eligible; reset city fire flag if applicable.
  - Update economy ledger: `grossGold - buildingUpkeep - militaryUpkeep = netGold`, then apply to treasury (treasury cannot go below 0).
  - If treasury is 0 and netGold is negative, austerity activates; it clears once netGold is non-negative.
  - Add Science to current tech; if completed, apply unlock.
  - Reset per-turn unit flags (attacks, movement already tracked via movesLeft).
- **Planning Phase**:
  - Choose new build for cities that finished/are idle (Unit/Building/Project).
  - Choose a tech if none is active.
  - Reassign worked tiles (within Pop, owned, visible or revealed).
- **Action Phase**:
  - Units move up to move value; 1 attack per unit per turn.
  - Cities with garrison may attack once at range 2 if unfired.
  - Units may Fortify (consumes moves, +1 defense).
- **End of Turn**: pass control; no resolutions occur here.
- **End of Round**: native camps take their turn (patrol/aggro/retreat, attacks, heal) before victory/ties/elimination checks.

## 6. Yields & Economy
- **Four yields**:
  - **Food**: growth.
  - **Production**: build progress.
  - **Science**: research.
  - **Gold**: treasury flow, upkeep coverage, and rush-buy spending.
- **City center minimums**: enforce ≥2 Food, ≥1 Production, and ≥1 Gold after terrain/overlay/civ modifiers; base city Science +1 and base city Gold +1 per city.
- **Storage & overflow**: Food and Production overflow carry after growth/completion.
- **Growth cost**: base 30 for Pop 2; scales by Pop range multipliers:
  - Pop 2–4: ×1.35, Pop 5–6: ×1.45, Pop 7–8: ×1.85, Pop 9–10: ×2.10, Pop 11+: ×2.60.
  - Modifiers (multiplicative): Farmstead ×0.90; Jade Granary ×0.85; Jade Covenant passive ×0.95.
- **Production**: stored per city; switching builds preserves progress per build item in that city.
- **Science**: global per turn; applied only to selected tech; pauses if none selected.
- **Gold ledger**:
  - `grossGold`: total city gold yield.
  - `buildingUpkeep`: sum of building maintenance.
  - `militaryUpkeep`: upkeep from supply over-cap (`usedSupply > freeSupply`).
  - `netGold = grossGold - buildingUpkeep - militaryUpkeep`.
- **Supply pressure**:
  - Free supply = base + city count + supply from economic buildings.
  - Economic buildings are part of military infrastructure because they increase free supply.
  - Military upkeep scales with excess supply above free supply.
- **Austerity**:
  - Trigger: treasury is 0 and netGold is negative.
  - Effects: reduced production and science until netGold recovers to non-negative.
- **Rush-buy**:
  - Spend Gold to complete current city production instantly.
  - Disabled during austerity.
  - Progress victory chain projects and unique once-per-civ completions cannot be rush-bought.
  - Gold buildings apply city-local rush-buy discounts:
    - Trading Post 5%, Market Hall 10%, Bank 15%, Exchange 20% (highest completed tier applies).

## 7. Cities
- **Founding**:
  - Settler may found on valid land (not Mountain, not Coast/Deep Sea).
  - Starts at Pop 1, 0 stored Food/Production, working center.
  - Territory: center + Ring 1; at Pop 3+ auto-claims Ring 2 (no shrink if Pop drops).
  - Tiles are exclusive to one city; auto-claim prioritizes overall yield with tactical weighting (including Gold under economy pressure).
- **City Center Yield Calculation**:
  - Start with terrain yields; add overlay bonuses; apply minimums (2F/1P/1G); apply civ trait effects.
- **Worked Tiles**:
  - Pop = number of worked tiles (center always counted).
  - Assign only owned tiles within Ring 2, visible or revealed; cannot exceed Pop; center mandatory.
  - Reassignment allowed during Planning; changes take effect immediately that turn.
- **Growth**:
  - At Start of Turn: add Food; if stored Food ≥ cost → Pop +1, subtract cost (overflow kept), recompute cost for next Pop.
- **Production & Builds**:
  - At Start of Turn: add Production; if stored Production ≥ build cost, complete build, consume cost, keep overflow.
  - Build categories: Unit, Building, Project (one active slot). Switching stores progress for later return to that same build item.
  - **Spawning**: If city center is occupied, new units spawn on the nearest valid adjacent tile (spiraling out).
- **Defense & HP**:
  - Base city HP 20 (resets to 10 on capture). Base defense strength 3.
  - City heal 3 HP/turn if not damaged that turn; friendly city heal for units: +5 HP/turn.
  - **Garrison Bonuses**:
    - **Melee Unit**: +2 City Defense, +1 City Attack Strength, Retaliation Range 1.
    - **Ranged Unit**: +1 City Defense, +3 City Attack Strength, Retaliation Range 2.
  - City Ward adds +2 defense and +1 city attack. Shield Generator adds +15 defense and 50 Shield HP (regenerates 5/turn).
- **City Attack**:
  - Base city attack strength 3; range 2; one shot/turn if unfired and garrisoned.
  - **Automatic Retaliation**: If a city with a garrison is attacked by a unit within the garrison's Retaliation Range, the city automatically strikes back after taking damage.
- **Razing**:
  - Non-capitals may be razed by owner if a garrison is present (removes city). Capitals cannot be razed.

## 8. Terrain & Features
- **Terrain (yield F/P/S/G | move cost | defense | LoS | workable)**:
  - Plains: 1/1/0/0 | land 1 | 0 | clear | yes.
  - Hills: 0/2/0/0 | land 2 | +2 | blocks LoS | yes.
  - Forest: 1/1/0/0 | land 2 | +1 | blocks LoS | yes.
  - Marsh: 2/0/0/0 | land 2 | -1 | clear | yes.
  - Desert: 0/1/0/1 | land 1 | -1 | clear | yes.
  - Mountain: 0/0/0/0 | impassable land | 0 | blocks LoS | not workable.
  - Coast: 1/0/0/1 | naval 1 | 0 | clear | yes (naval domain).
  - Deep Sea: 1/0/0/1 | naval 1 | 0 | clear | yes (naval domain).
- **Overlays**:
  - River Edge (adjacency marker), Rich Soil (+1F), Ore Vein (+1P/+1G), Sacred Site (+1S/+1G).
  - **Goodie Hut**: One-time discovery reward (removed on collection). Rewards are 25% each:
    - **Food**: +10 Food to nearest city if Pop < 3, otherwise +5.
    - **Production**: +10 Production to nearest city if idle, otherwise +5.
    - **Research**: +20% of current tech if under 50% complete, otherwise +10%. No benefit if no tech is selected.
    - **Free Scout**: Spawns a Scout at/near the hut with 0 moves this turn.
  - **Native Camp**: Hostile neutral encampment with a 3-hex territory. Each camp spawns 1 Native Champion and 2 Native Archers; natives aggro when attacked or when enemy units enter territory and may chase up to 2 tiles beyond it. **Native Champions gain +2 Attack/Defense within 2 tiles of their camp.** Natives heal +2 HP/turn inside camp territory. When a player clears the camp, it immediately becomes a city for the captor (seeded with +20 Production); the camp overlay is removed.
- **Cleared Settlement**: Fallback state if a camp disappears without a capturing player; grants +1 Food and +1 Gold on the tile and replaces the camp overlay.
- **City Center rule**: apply terrain + overlay, then enforce minimums, then civ perks.

## 9. Units
- **Costs scale with time**: all unit costs use `Base × min(4, 1 + floor(Turn/35))`.
- **Base Units** (atk/def/rng/move/HP/cost/domain/capture/vision):
  - Settler: 0/2/1/1/1/18, Civilian, cannot capture, vision 2.
  - Scout: 1/1/1/2/10/23, Land, no capture, vision 3.
  - Spear Guard: 2/2/1/1/10/27, Land, can capture, vision 2.
  - Bow Guard: 2/1/2/1/10/27, Land, no capture, vision 2.
  - Riders: 2/2/1/2/10/32, Land, can capture, vision 2.
  - Skiff: 2/2/1/3/10/32, Naval, no capture, vision 2.
- **Army Units** (HP 15; buildable after Drilled Ranks):
  - Army Scout 3/3/1/2, no capture, vision 3.
  - Army Spear Guard 8/4/1/1, capture, vision 2.
  - Army Bow Guard 6/3/2/1, no capture, vision 2.
  - Army Riders 8/4/1/2, capture, vision 2.
- **Aether Era Units**:
  - Airship: 0/10/0/4/20/75, Air, no capture, vision 4 (support/scout).
  - Landship: 14/10/1/3/25/120, Land, can capture, vision 2 (late-game siege/capture).
- **Civ-exclusive Units**:
  - Lorekeeper (Scholar/Starborne only): 4/6/2/1/15/65, Land, no capture, vision 2; gains +2 Defense in friendly territory or on own city.
  - **Titan** (Aetherian Vanguard only): 15/15/1/2/40, capture, vision 2; regenerates 1 HP/turn in enemy/neutral, 2 in friendly territory, 4 in friendly city.
- **Neutral Native Defenders** (not buildable; guard camps): Native Champion 4/4/1/1/18, no capture, vision 2; Native Archer 3/2/2/1/12, no capture, vision 2.
- **States**: Normal, Fortified (+1 defense until move/attack), Garrisoned (on city), PendingSpawn (queued).
- **Linking**: eligible units can be linked/unlinked as paired forces for coordinated movement/combat behavior.
- **Vision**: provided per unit; shared vision extends via diplomacy.
- **Move & Domain**: land units cannot enter impassable (Mountains, off-map); naval units use Coast/Sea.

## 10. Movement & Combat
- **Movement**:
  - Spend move points per tile; terrain move costs apply (land vs naval). Cannot enter impassable.
  - Linked units move together.
- **Auto-Movement**:
  - Click any valid tile (even in Fog) to set a destination. Unit will auto-path each turn until arrival.
  - **Queuing**: You may issue move orders to units with 0 moves left; they will start moving next turn.
  - **Persistence**: If blocked by a friendly unit, the unit waits and retries next turn.
  - **Interrupts**: Combat or manual move commands cancel auto-movement.
  - **Peacetime Restrictions**: Units cannot enter enemy territory (owned tiles) unless at War.
  - **Expulsion**: If peace is declared while units are in enemy territory, they are automatically moved to the nearest valid, unoccupied, neutral or friendly tile.
- **Fortify**:
  - Action available to non-Settler units with moves left.
  - Consumes all remaining moves.
  - Grants +1 Defense bonus.
  - Unit remains Fortified until it moves or attacks.
  - Fortified units are not considered "idle" for turn blocking.
- **Attacking**:
  - One attack per unit per turn; ranged must respect range; melee requires adjacency.
  - Cities can be attacked; only capture-capable units take cities.
- **Damage Model**:
  - Formula: `Damage = 5 × e^(StrengthDiff / 25) × RandomMult`
  - StrengthDiff = Attacker ATK - Defender DEF (includes terrain/fortify bonuses)
  - RandomMult = 0.9 to 1.1 (deterministic from game seed)
  - Damage clamped to [1, 15]
- **Defense & Terrain**:
  - Hills +2 defense, Forest +1, Marsh -1, Desert -1; City Ward adds city defense/attack bonuses.
  - Fortified state adds +1 defense.
- **Line of Sight**:
  - Hills/Forest/Mountain block LoS; ranged attacks require LoS unless adjacent.
- **Counterattacks (Melee Return Damage)**:
  - When a melee unit (range 1) attacks and the defender survives, the defender counter-attacks using the same damage formula (Defender ATK vs Attacker DEF).
  - Ranged units (range > 1) do NOT take return damage from units.
  - City garrison retaliation uses the same formula.
- **Healing**:
  - Friendly tile: +3 HP/turn; friendly city: +5 HP/turn.
  - Cities heal 3 HP/turn if not damaged that turn.
  - Captured units may have healing delay; cities track last damaged turn to gate healing.
- **Native Camps & Aggro**:
  - Camp territory is a 3-hex radius; entering or attacking natives triggers Aggro for 3 turns (timer refreshes while enemies remain). Aggro natives may chase targets up to 2 tiles beyond camp territory.
  - Native turns resolve at end-of-round: reset moves, patrol if idle, attack/advance when Aggro, retreat toward camp when damaged, then heal (+2 HP/turn inside territory).
  - Clearing the last native converts the camp into a city for the capturing player (auto-named using their next available city name) with +20 Production stored; camp overlay is removed.
- **Capture**:
  - Only capture-capable units (melee/cavalry/armies/Titan) can seize cities; on capture, city HP resets to 10.

## 11. Technology
- **Single active tech**: Science applies each Start of Turn; on completion choose next (research pauses if none).
- **Era costs (current)**:
  - Hearth: 30-40 Science.
  - Banner: 75-100 Science.
  - Engine: 150-200 Science.
  - Aether: 300 Science.
- **Era gates in current game flow**:
  - Banner techs require 3 researched Hearth techs.
  - Engine techs require 2 researched Banner techs.
  - Tech Tree UI also gates Aether display/selection at 2 researched Engine techs.
- **Unlocks**:
  - Fieldcraft (30) → Farmstead.
  - Stonework Halls (30) → Stone Workshop.
  - Script Lore (40) → Scriptorium.
  - Formation Training (30) → Trebuchet.
  - Trail Maps (30) → Skiff.
  - Wellworks (75) → Reservoir.
  - Timber Mills (75) → +1 Attack/+1 Defense to Melee and Ranged units (passive).
  - Scholar Courts (100) → Academy.
  - Drilled Ranks (75) → Enables Army unit production (Army Spear Guard / Army Bow Guard / Army Riders).
  - City Wards (75) → City Ward.
  - Steam Forges (150) → Forgeworks (also enables Titan's Core build access for Aetherian Vanguard).
  - Signal Relay (200) → +2 Science per city (passive; also gates Exchange building availability).
  - Urban Plans (150) → City Square.
  - Army Doctrine (150) → +1 Attack/+1 Defense to Armies (passive).
  - Star Charts (200) → Observatory project (starts Progress chain).
  - **Aether Era**:
    - Aerodynamics (300) → Airship.
    - Zero Point Energy (300) → Aether Reactor.
    - Composite Armor (300) → Landship.
    - Plasma Shields (300) → Shield Generator.
    - Dimensional Gate (300) → Global Mobility (+1 Movement to all units).

## 12. Buildings
- Costs are Production; one per city unless noted.
  - **Farmstead** (40, Fieldcraft): +1 Food; growth 10% cheaper.
  - **Stone Workshop** (40, Stonework Halls): +1 Production.
  - **Scriptorium** (40, Script Lore): +1 Science.
  - **Trading Post** (40, Fieldcraft): +4 Gold, 2 upkeep; +1 Gold if river-adjacent; +1 free supply; rush-buy discount 5%.
    - Tactical role: early treasury stabilizer and low-cost military supply support.
  - **Market Hall** (56, Wellworks): +6 Gold, 3 upkeep; +1 Gold at Pop 5+; +1 free supply; rush-buy discount 10%.
    - Tactical role: rewards food-first growth planning to hit Pop 5 breakpoints.
  - **Bank** (72, Urban Plans): +8 Gold, 4 upkeep; +1 Gold if working any Ore Vein; +2 free supply; rush-buy discount 15%.
    - Tactical role: turns ore control into sustained war economy and faster emergency production.
  - **Exchange** (108, Signal Relay, requires Bank in same city): +10 Gold, 5 upkeep; +2 free supply; rush-buy discount 20%.
    - Tactical role: late-midgame tempo city anchor for high-priority rush-buy turns.
  - **Reservoir** (50, Wellworks): +2 Food (+1 extra if river city).
  - **Lumber Mill** (60, Timber Mills): +1 Production (+1 extra if any Forest worked).
  - **Academy** (50, Scholar Courts): +3 Science.
  - **City Ward** (60, City Wards): +2 city defense, +1 city attack.
  - **Forgeworks** (80, Steam Forges): +4 Production.
  - **City Square** (80, Urban Plans): +2 Food, +2 Production.
  - **Titan's Core** (60, Steam Forges, Aetherian only): Summons **The Titan** (limit 1 per civ).
  - **Jade Granary** (50, Fieldcraft, Jade only): +2 Food, +1 Production. On completion: +1 Pop in that city, +1 Food per city, 15% cheaper growth, once per civ.
  - **Bulwark** (70, Stonework Halls, Scholar/Starborne only): +3 city defense, +1 city attack, 4 upkeep. Once per civ. City cannot build Army units.
  - **Aether Reactor** (200, Zero Point Energy): +5 Food, +5 Production, +5 Science.
  - **Shield Generator** (250, Plasma Shields): +15 city defense; adds 50 Shield HP that regenerates 5/turn.

## 13. Projects & Wonders
- **Progress Chain** (once per civ, one city at a time):
  - Observatory (400, Star Charts) → milestone (+1 Science in that city), unlocks Grand Academy.
  - Grand Academy (550, after Observatory) → +1 Science per city, unlocks Grand Experiment.
  - Grand Experiment (700, after Grand Academy) → Progress Victory on completion.
- **Army production note**:
  - No separate Form Army conversion projects in the current build; army variants are produced directly as units once Drilled Ranks is researched.
- **Filler Projects** (Repeatable) [Costs scale with turn]:
  - Harvest Festival (100 base, Farmstead): Grants 25 Food.
  - Alchemical Experiments (100 base, Scriptorium): Grants 25 Science.
  - Scaling: `Base × min(5, 1 + floor(Turn/40))`.
- **Milestone Markers** (not player-selectable):
  - JadeGranaryComplete (tracks Jade Granary completion, enables global growth/food bonus).
  - TitansCoreComplete (tracks Titan's Core completion, prevents rebuild).
  - BulwarkComplete (tracks Bulwark completion, prevents rebuild).
- **Wonders**: covered by unique buildings above (Titan's Core, Jade Granary, Bulwark).

## 14. Civilizations & Traits
- **ForgeClans**:
  - Capital: +1 Production per worked Hill.
  - Industrial buildings: Stone Workshop (+1P, +1S), Lumber Mill (+1P), Forgeworks (+1P, +1S).
  - Military: 20% cheaper; +2 Attack for units built in cities with 2+ Hills; +1 Attack per tracked mid/late tech (max +5).
- **Scholar Kingdoms**:
  - Science: +1 per city with a City Ward.
  - Starts with an extra Bow Guard; can build Bulwark and Lorekeeper.
- **River League**:
  - Yields: +1 Food per river tile; +1 Production per 2 river tiles worked.
  - Military: +1 flat Attack to all military; +2 Attack/+2 Defense when adjacent to a river; +1 Attack when attacking cities.
- **Aetherian Vanguard**:
  - **Scavenger Doctrine**: Kills grant Science based on enemy combat power.
  - **Vanguard Logistics**: Cities with a garrison gain +1 Production.
  - **Vanguard Resilience**: +1 Defense to military units.
  - **Titan Momentum**: +1 Movement to military units while The Titan is alive.
  - Unique: Titan's Core (summons Titan; once per civ).
- **Starborne Seekers**:
  - **Peaceful Meditation**: +1 Science in Capital while not at war.
  - Unique access: Bulwark and Lorekeeper.
- **Jade Covenant**:
  - Growth: 5% cheaper globally; Settlers 10% cheaper.
  - **Population Power**: +1 Attack/+1 Defense per 29 total population (all cities), capped at +2.
  - **Ancestral Protection**: Settlers +2 Defense.
  - **Nature's Wrath**: Enemy units at war in Jade territory take 1 damage at start of their turn.
  - Unique: Jade Granary (once per civ) — +2F/+1P; on completion +1 Pop in that city, +1 Food per city, and 15% cheaper growth.
- AI personalities differ by civ goal/aggression but follow identical rules.

## 15. Map & Generation
- **Sizes**: Tiny 20×15, Small 25×20, Standard 30×22, Large 35×25, Huge 40×30.
- **Civ caps**: Tiny 2, Small 3, Standard 4, Large/Huge 6.
- **Terrain generation**: Perlin-driven landmasses with coast detection, mountain clusters, and overlays (River edges, Rich Soil, Ore Vein, Sacred Site, Goodie Huts).
- **Native camps**: Spawn after player starts are placed (minimum 8 tiles from starts, 6 between camps). Camp counts scale by map size: Tiny 1–2, Small 2–3, Standard 3–4, Large 5–6, Huge 8–10. Each camp begins with 1 Champion + 2 Archers.
- **Start fairness**: each civ placed in balanced start zones with access to workable tiles; capitals get civ-specific first name.
- **Territory**: exclusive ownership; auto-claim rules in section 7.
- **Vision**: see section 2 for states; shared vision via diplomacy applies after acceptance.

## 16. Diplomacy
- **Contact**: You must have met another player (units/cities visible) before declaring war or sharing vision.
- **War**: Sets stance to War. Both players can attack each other's units and cities.
- **Peace**: Default stance after contact. Players cannot attack each other.
- **Propose Peace**: If you are at war, you may propose peace. If the other player also proposes peace (or has an incoming proposal from you), peace is established.
- **Shared Vision**: At Peace, you may propose sharing vision. Both players see each other's explored tiles.

### Diplomatic State Durations
- **War Duration**: Once war is declared between two civilizations, it must last a **minimum of 15 turns** before either party can propose peace. This ensures wars are sustained conflicts rather than brief skirmishes.
- **Peace Duration**: After establishing peace (or at initial contact), at least **15 turns** must pass before either civilization can declare war on the other. This creates stable periods for diplomacy and prevents immediate re-hostilities.
- **Purpose**: These minimum durations make diplomatic states meaningful and prevent rapid oscillation between war and peace.

### [DEV-ONLY] AI Diplomacy Behavior
- **War Escalation**: AI aggression scales with the game turn. In the late game (Turn 50+), AI civilizations become "Bloodthirsty" and will refuse all peace offers to drive the game to a conclusion.
- **Map Scaling**: On Standard, Large, and Huge maps, Conquest-biased civilizations (e.g., Aetherian Vanguard) are more aggressive to overcome travel distances.
- **Domination Bypass**: Extremely powerful AI civilizations (3x stronger than target) may bypass the standard peace duration to crush weak neighbors.
- **War Preparation**: AI will spend up to 10 turns preparing for war (building units, positioning) before declaring hostilities.

## 17. Victory, Ties, Elimination
- **Conquest Victory**: control a majority of all founded capitals (>50%) or be the last remaining player with cities/settlers.
- **Progress Victory**: complete Grand Experiment.
- **Tie resolution**: if multiple victories same round, Progress outranks Conquest; if still tied, earlier turn order prevails.
- **Elimination**: civ with zero cities **and** no Settlers is eliminated; remaining units are removed.
- **Game Over**:
  - Upon victory or defeat, a full-screen End Game Experience overlay displays the result.
  - **Overview Screen**: Shows victory/defeat status, final turn count, final score, and action buttons.
  - **History Replay**: Interactive map visualization showing turn-by-turn expansion, fog reveals, and key events (city founding, battles, tech research, era transitions, diplomacy changes). Includes playback controls (play/pause, speed adjustment, timeline scrubber) and event notifications.
  - **Statistics Screen**: Detailed line charts tracking Score, Science, Production, Military, and Territory over the course of the game for all civilizations.
  - **Restart Game**: Allows players to instantly restart the match with the exact same seed, map size, and civilization settings.
  - **Main Menu**: Returns to the title screen to configure a new game.
  - The game turn counter freezes at the victory moment (`endTurn`) to ensure accurate statistics and replay data.

## [DEV-ONLY] 18. State Indicators & UI Standards
- **Per-unit flags**: hasAttacked (attack availability), movesLeft (movement), linkedUnitId (army pairing), capturedOnTurn (healing gate).
- **Per-city flags**: hasFiredThisTurn (city attack), lastDamagedOnTurn (healing gate), currentBuild/progress.
- **HUD expectations**:
  - Show current tech and progress; allow tech selection.
  - Show city build, yields, worked tiles with Pop cap enforcement and ownership/vision rules.
  - Show unit selection, link/unlink actions, found city when Settler.
  - Show Fortify action for eligible units.
  - Bottom city panel focused on city data; turn panel bottom-right; top tabs for Research, Diplomacy, Codex.
  - Vision states: visible, fogged (seen), shroud (unseen) legend exposed.
- **Tech Tree UI**:
  - Full-screen modal overlay with horizontal scrollable layout organized by era (Hearth → Banner → Engine → Aether).
  - Tech cards display: name, cost, prerequisites, unlock type (Unit/Building/Project/Passive), and detailed stats.
  - Visual states: **Available** (clickable, highlighted border), **Current** (active research with progress bar), **Researched** (checkmark, dimmed), **Locked** (grayed out, requires prerequisites/era gates).
  - Building unlocks show: yields, bonuses, conditional effects, and projects they unlock.
  - Civ-specific unique buildings displayed on relevant tech cards: Jade Granary, Titan's Core, Bulwark.
  - Era progression gates are shown in the UI: "Requires 3 Hearth techs" (Banner), "Requires 2 Banner techs" (Engine), "Requires 2 Engine techs" (Aether).
- **Status colors**: use existing HUD styles (chips/pills) to denote peace/war, garrison, fired, fortified, etc.

## [DEV-ONLY] 19. Rules Priority & Engine Hooks
- **Priority**: Engine logic (constants/types) → this rulebook → UI copy. If discrepancies arise, engine constants are authoritative; update rulebook to match.
- **Engine hooks**:
  - Actions: EndTurn, MoveUnit, Attack (unit/city), SetCityBuild, FoundCity, CityAttack, SetWorkedTiles, SetDiplomacy/Peace/Vision actions, Link/Unlink, RazeCity, Propose/Accept offers, FortifyUnit.
  - Tech progression: ChooseTech required to spend Science.
  - Vision sharing/diplomacy stored in gameState.sharedVision/diplomacy/diplomacyOffers.
  - Progress tracking: milestones stored via projects (Observatory, Grand Academy, Grand Experiment, JadeGranaryComplete, TitansCoreComplete, BulwarkComplete).
