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
- [18. State Indicators & UI Standards](#18-state-indicators-ui-standards)
- [19. Rules Priority & Engine Hooks](#19-rules-priority-engine-hooks)

<!-- CODEX_SKIP_START -->
## [DEV-ONLY] Authoring & Codex Conventions
- The rulebook is the single source of truth. Keep all rules, data, and appendices here.
- Codex hides any content inside `CODEX_SKIP_START/CODEX_SKIP_END` markers and any heading prefixed `[DEV-ONLY]`.
- For player-facing clarity, keep prose concise and bulleted. Avoid hard line breaks mid-sentence.
- When adding new sections, prefer numbered headings so anchors stay stable (e.g., `## 4. Setup & Start State`).
- If you must include engine-only notes (e.g., implementation details, debugging switches), wrap them in dev-only headings or skip blocks so players do not see them.
- To add a dev-only appendix, wrap the section in a skip block or prefix the heading with `[DEV-ONLY]`.

## [DEV-ONLY] v0.98 MAJOR Balance Changes
**Goal: Address 50-game AI simulation showing ScholarKingdoms 54% win rate, AetherianVanguard/JadeCovenant 0% win rate**

### Civilization Reworks

**ScholarKingdoms - MAJOR NERF**
- OLD: "+2 Science in Capital only"
- NEW: **"Royal Scholars"** — +1 Science per Scriptorium/Academy built in each city
- Impact: Gates their bonus behind building investment (40-60 Prod each), no longer free snowball science

**AetherianVanguard - MAJOR BUFF**
- NEW: **Starting Bonus** — Starts with 2 extra SpearGuards (4 units total: Settler, Scout, 2x SpearGuard) *(v0.98 Update 3: Increased to 2 SpearGuards)*
- NEW: Titan's Core cost reduced from 200 to 150
- Keeps: Battle Hardened (+1 HP per era), Titan Rampage behavior

**JadeCovenant - MAJOR BUFF**
- NEW: **"Population Power"** — Military units gain +1 Attack and +1 Defense per 5 total population across all cities *(v0.98 Update 5: NERFED to per-8 population)*
- Keeps: Verdant Growth (10% faster growth), Bountiful Harvest (+5 Food on founding), Jade Granary
- REMOVED: **Double Settlers** *(v0.98 Update 2: REMOVED - 80% win rate was too strong)*

**RiverLeague - BUFF**
- NEW: **"River Knowledge"** — +1 Science in cities on river tiles (in addition to existing +1 Food and +1 Production)
- River cities now provide triple yield bonus: +1F, +1P, +1S

**ForgeClans - FIX**
- FIX: Now correctly gives +1 Production PER worked Hill tile (was only +1 total if any Hill worked)

### Progress Victory Slowdown
Progress project costs increased significantly to slow down tech victories (62% of wins were Progress):
- Observatory: 160 (was 120, +33%)
- Grand Academy: 210 (was 165, +27%)
- Grand Experiment: 280 (was 210, +33%)

### Other Balance
- Titan's Core cost: 150 (was 200, -25%) to help AetherianVanguard reach their power spike

## [DEV-ONLY] v0.98 Update 4 Balance Changes (Nov 27, 2025)
**Goal: Address 50-game analysis showing ForgeClans 8.8% win rate, StarborneSeekers 17.6% win rate with 32.4% elimination, stalled games at 8%**

### Civilization Adjustments

**ForgeClans - BUFF**
- NEW: **"Master Craftsmen"** — Projects complete 25% faster (effective +25% production towards projects)
- Impact: Helps them convert strong economies into victories via both Form Army and Progress chain

**StarborneSeekers - BUFF**
- CHANGED: Starting bonus from 2x Scout to **Scout + SpearGuard** (3 units: Settler, Scout, SpearGuard)
- Impact: Addresses highest elimination rate (32.4%) by providing defensive capability

### AI Improvements

**Overwhelming Power Detection**
- When a civ has 2x the military power of ALL remaining enemies, AI switches to Conquest mode
- Addresses stalled games where dominant civs failed to finish off weak opponents

**"Finish Him" Heuristic**
- AI now prioritizes attacking enemies down to 1-2 cities when the AI has 1.5x their military power
- City siege targeting prioritizes: Finishable enemies → Capitals → Low HP → Nearest

## [DEV-ONLY] v0.98 Update 5 Balance Changes (Nov 27, 2025)
**Goal: Address ForgeClans 8.8% win rate, StarborneSeekers high elimination, stalled games from peace/war cycles**

### Critical Nerfs

**JadeCovenant - NERFED**
- Population Power threshold increased from **5 to 8** population per combat bonus
- At 54 avg pop: reduces bonus from +10/+10 to +6/+6

### Civilization Buffs

**ForgeClans - MAJOR REWORK**
- **"Forged Arms"**: Military units gain +1 Attack when any city has 2+ worked Hill tiles
- **"Production Mastery"**: Military units cost 20% less Production
- **AI Personality**: Changed warPowerThreshold from 0.45 to 0.65 (less suicidal declarations)
- **Tech Weights**: Increased priority for DrilledRanks and ArmyDoctrine

**StarborneSeekers - BUFF**  
- NEW: **"Celestial Guidance"**: Military units within 3 tiles of capital gain +1 Defense
- Helps them survive early aggression while building toward their tech/exploration goals

### Army Accessibility

**Form Army Costs Reduced**
- Form Army — Spear Guard: 10 (was 15)
- Form Army — Bow Guard: 10 (was 15)
- Form Army — Riders: 15 (was 20)

### AI Improvements: War Finish Logic

**Overwhelming Power War Declaration**
- When a civ has 2x power over a target, bypasses peace duration and always declares war
- Dominant civs no longer get stuck in peace/war oscillation

**Finishable Target Logic**
- Targets with 1-2 cities + AI has 1.5x power = always declare war
- Never accept/propose peace when winning decisively (overwhelming or finishable)
- Peace duration bypass ensures continuous pressure until elimination

## [DEV-ONLY] v0.98 Update 6 Balance Changes (Nov 27, 2025)
**Goal: Fix wars ending at minimum 15 turns, boost ForgeClans, nerf StarborneSeekers Progress rush**

### CRITICAL: War Completion Logic Overhaul

**Problem:** Wars were ending at EXACTLY 15 turns (minimum duration). Civs immediately proposed peace when minimum expired.

**Solution: "Press to Conclusion" War Logic**
- Extended war duration when winning: **25 turns** (was 15) if any advantage exists
- New checks: `hasCityAdvantage()`, `isWinningWar()`, `isActuallyLosingWar()`
- **NEVER** propose/accept peace if:
  - Overwhelming power (2x enemy)
  - Finishable target (1-2 cities)
  - City advantage (2+ more cities)
  - Winning war (more power AND more cities)
- Peace only accepted if **actually losing**: <60% power OR fewer cities AND weaker

### HIGH: ForgeClans "Industrial Warfare" Identity

**Problem:** 5.9% win rate despite 77.2% tech completion (highest). Attacked 2x more than attacking.

**Solution: Late-Game Powerhouse**
- NEW: **"Industrial Warfare"** — +1 Attack per Engine-era tech researched (max +5)
  - SteamForges, CityWards, UrbanPlans, SignalRelay, StarCharts
  - Fully teched ForgeClans units get +5 Attack!
- AI personality: `warPowerThreshold` 0.65→0.7, `declareAfterContactTurns` 2→4
- Tech priorities boosted for all Engine-era techs

### HIGH: StarborneSeekers Nerfs

**Problem:** 35.3% win rate with only 1.7 avg cities and 11.5 pop. Progress rush too strong.

**Solution: Slow Down Progress Path**
- Spirit Observatory cost: **275** (was 200, +37.5%)
- "Stargazers" passive: **Removed +1 Science in Capital** (keep Sacred Site bonus only)
- Net effect: Slower rush to The Revelation

### MEDIUM: Form Army — Riders

**Problem:** 0 Riders armies formed across all 50 games.

**Solution:**
- FormArmy_Riders cost: **10** (was 15, same as SpearGuard/BowGuard)

## [DEV-ONLY] v0.98 Update 8 Balance Changes (Nov 27, 2025)
**Goal: Help weakest civs (ScholarKingdoms, JadeCovenant) and improve game balance**

### Civilization Buffs

**ScholarKingdoms - BUFF**
- NEW: **"Great Library"** — +1 Science in Capital (restored after being removed)
- NEW: **"Scholarly Retreat"** — Military units within 2 tiles of any city with Scriptorium or Academy gain +2 Defense
- Impact: Helps weakest civ (47.6% tech completion) survive long enough to use science advantage

**JadeCovenant - BUFF**
- Jade Granary cost: **100** (was 150, -33%)
- Impact: Was only built 14% of games, now more accessible to leverage growth bonuses
<!-- CODEX_SKIP_END -->

## 1. Vision & Pillars
- **One-more-turn, zero bloat**: fast, board-game-paced 4X on a compact hex map.
- **Clarity over crunch**: only three yields (Food, Production, Science); no upkeep, no hidden multipliers.
- **Short campaign, real arc**: ~70–80 turns on Standard maps.
- **Safety nets**: every city defends itself; recovery is possible after setbacks.
- **Board-game readability**: few numbers, clear effects, deterministic structure with limited randomness in combat.

## 2. How to Read & Terminology
- **F/P/S**: Food, Production, Science.
- **Pop**: population of a city; equals number of worked tiles.
- **City Center**: founding tile; always worked; enforces minimum yields (2F/1P).
- **Garrison**: any friendly unit on the city tile; enables city attack.
- **Ring 1 / Ring 2**: hex distance 1 or 2 from city center.
- **Contact**: you have met another civ on the map; required for diplomacy.
- **Vision states**: Visible (bright), Revealed/Fogged (seen but not visible), Shroud (never seen).

## 3. Core Loop & Victory
- Cities work tiles → generate F/P/S.
- Food grows Pop → more tiles worked.
- Production completes Units/Buildings/Projects.
- Science unlocks Techs that improve everything else.
- Victory paths:
  - **Conquest**: control all other capitals.
  - **Progress**: complete Observatory → Grand Academy → Grand Experiment.
  - Ties resolve per section 17.

## 4. Setup & Start State
- **Map size**: Tiny 14×10, Small 18×14, Standard 22×16, Large 24×18, Huge 32×24.
- **Civ count caps**: Tiny 2, Small 3, Standard 4, Large/Huge 6.
- **Players**: 1–4 (human/AI/hotseat). Rules identical for all.
- **Starting units**: 
  - Standard: 1 Settler + 1 Scout
  - AetherianVanguard: 1 Settler + 1 Scout + 2 SpearGuards (4 units total) *(v0.98 Update 3: 2 SpearGuards)*
  - StarborneSeekers: 1 Settler + 1 Scout + 1 SpearGuard (3 units total) *(v0.98 Update 4: Changed from 2 Scouts to Scout + SpearGuard for defensive capability)*
- **Starting placement**: fair-start zones with nearby workable tiles; capitals named from civ list (unique first-city name, then list, then "New [Capital] n" if exhausted). Players may rename on founding.
- **Fog**: unseen tiles start in shroud; vision comes from units/cities and shared vision offers.

## 5. Turn Structure
- **Start of Turn (Upkeep & Yields)**:
  - For each city: add F/P/S yields; apply growth if stored Food ≥ cost; apply build progress if stored Production ≥ cost; heal city if eligible; reset city fire flag if applicable.
  - Add Science to current tech; if completed, apply unlock.
  - Reset per-turn unit flags (attacks, movement already tracked via movesLeft).
- **Planning Phase**:
  - Choose new build for cities that finished/are idle (Unit/Building/Project).
  - Choose a tech if none is active.
  - Reassign worked tiles (within Pop, owned, visible or revealed).
- **Action Phase**:
  - Units move up to move value; 1 attack per unit per turn.
  - Cities with garrison may attack once at range 2 if unfired.
- **End of Turn**: pass control; no resolutions occur here.
- **End of Round**: after all players, check victory/ties/elimination.

## 6. Yields & Economy
- **Only three yields**: Food (growth), Production (build progress), Science (research). No gold/happiness/upkeep/trade.
- **City center minimums**: enforce ≥2 Food and ≥1 Production after terrain/overlay/civ modifiers; base city Science +1 per city.
- **Storage & overflow**: Food and Production overflow carry after growth/completion.
- **Growth cost**: base 30 for Pop 2; scales by Pop range multipliers:
  - Pop 2–4: ×1.30, Pop 5–6: ×1.40, Pop 7–8: ×1.58, Pop 9–10: ×1.68, Pop 11+: ×2.00.
  - Modifiers: Farmstead ×0.9, Jade Granary ×0.85, JadeCovenant passive ×0.9 (stack multiplicatively on base formula).
- **Production**: stored per city; switching builds discards current progress.
- **Science**: global per turn; applied only to selected tech; pauses if none selected.

## 7. Cities
- **Founding**:
  - Settler may found on valid land (not Mountain, not Coast/Deep Sea).
  - Starts at Pop 1, 0 stored yields, working center.
  - Territory: center + Ring 1; at Pop 3+ auto-claims Ring 2 (no shrink if Pop drops).
  - Tiles are exclusive to one city; auto-claim picks highest yield (Food > Production > Science tie-breaker).
- **City Center Yield Calculation**:
  - Start with terrain yields; add overlay bonuses; apply minimums (2F/1P); apply civ trait effects.
- **Worked Tiles**:
  - Pop = number of worked tiles (center always counted).
  - Assign only owned tiles within Ring 2, visible or revealed; cannot exceed Pop; center mandatory.
  - Reassignment allowed during Planning; changes take effect immediately that turn.
- **Growth**:
  - At Start of Turn: add Food; if stored Food ≥ cost → Pop +1, subtract cost (overflow kept), recompute cost for next Pop.
- **Production & Builds**:
  - At Start of Turn: add Production; if stored Production ≥ build cost, complete build, consume cost, keep overflow.
  - Build categories: Unit, Building, Project (one active slot). Switching clears progress.
  - **Spawning**: If city center is occupied, new units spawn on the nearest valid adjacent tile (spiraling out).
- **Defense & HP**:
  - Base city HP 15; capture resets to 8. Base defense strength 5.
  - City heal 1 HP/turn if not damaged that turn (and HP > 0); friendly city heal for units: +5 HP/turn.
  - Garrison enables city attack; City Ward adds +4 defense and +1 city attack.
- **City Attack**:
  - Base city attack strength 3; range 2; one shot/turn if unfired and garrisoned.
- **Razing**:
  - Non-capitals may be razed by owner (removes city). Capitals cannot be razed.

## 8. Terrain & Features
- **Terrain (yield F/P/S | move cost | defense | LoS | workable)**:
  - Plains: 1/1/0 | land 1 | 0 | clear | yes.
  - Hills: 0/2/0 | land 2 | +2 | blocks LoS | yes.
  - Forest: 1/1/0 | land 2 | +1 | blocks LoS | yes.
  - Marsh: 2/0/0 | land 2 | -1 | clear | yes.
  - Desert: 0/1/0 | land 1 | -1 | clear | yes.
  - Mountain: 0/0/0 | impassable land | 0 | blocks LoS | not workable.
  - Coast: 1/0/0 | naval 1 | 0 | clear | yes (naval domain).
  - Deep Sea: 1/0/0 | naval 1 | 0 | clear | yes (naval domain).
- **Overlays**:
  - River Edge (adjacency marker), Rich Soil (+1F), Ore Vein (+1P), Sacred Site (+1S).
- **City Center rule**: apply terrain + overlay, then enforce minimums, then civ perks.

## 9. Units
- **Base Units** (atk/def/rng/move/HP/cost/domain/capture/vision):
  - Settler: 0/2/1/1/1/70, Civilian, cannot capture, vision 2. *(v0.98 Update 4: HP 10→1 for testing)*
  - Scout: 1/1/1/2/10/25, Land, no capture, vision 3.
  - Spear Guard: 2/2/1/1/10/30, Land, can capture, vision 2.
  - Bow Guard: 2/1/2/1/10/30, Land, no capture, vision 2.
  - Riders: 2/2/1/2/10/40, Land, can capture, vision 2.
  - River Boat: 2/2/1/3/10/35, Naval, no capture, vision 2.
- **Army Units** (formed via projects; HP 15):
  - Army Scout 3/3/1/2, no capture, vision 3.
  - Army Spear Guard 4/4/1/1, capture, vision 2.
  - Army Bow Guard 4/3/2/1, no capture, vision 2.
  - Army Riders 4/4/1/2, capture, vision 2.
- **Titan**: 25 atk / 10 def / rng 1 / move 3 / HP 50 / capture / vision 3 (summoned by Titan's Core).
- **States**: Normal, Fortified (+1 defense until move/attack), Garrisoned (on city), PendingSpawn (queued).
- **Linking**: Units on the same tile can link together. Linked units move together at the slower unit's pace. Used for escort pairing (settler + military) and army coordination.
- **Vision**: provided per unit; shared vision extends via diplomacy.
- **Move & Domain**: land units cannot enter impassable (Mountains, off-map); naval units use Coast/Sea.

## 10. Movement & Combat
- **Movement**:
  - Spend move points per tile; terrain move costs apply (land vs naval). Cannot enter impassable.
  - Linked units move together at the slower unit's pace.
- **Auto-Movement**:
  - Click any valid tile (even in Fog) to set a destination. Unit will auto-path each turn until arrival.
  - **Queuing**: You may issue move orders to units with 0 moves left; they will start moving next turn.
  - **Persistence**: If blocked by a friendly unit, the unit waits and retries next turn.
  - **Interrupts**: Combat or manual move commands cancel auto-movement.
- **Attacking**:
  - One attack per unit per turn; ranged must respect range; melee requires adjacency.
  - Cities can be attacked; only capture-capable units take cities.
- **Damage Model**:
  - Base damage 4, clamped by min/max (1–7 band) with random variance (ATTACK_RANDOM_BAND -1/0/+1).
  - Modified by attacker attack vs defender defense plus terrain modifiers; minimum 1 damage on hit.
- **Defense & Terrain**:
  - Hills +2 defense, Forest +1, Marsh -1, Desert -1; City Ward adds city defense/attack bonuses.
- **Line of Sight**:
  - Hills/Forest/Mountain block LoS; ranged attacks require LoS unless adjacent.
- **Counterattacks**:
  - Melee targets counter if alive and capable.
- **Healing**:
  - Friendly tile: +3 HP/turn; friendly city: +5 HP/turn.
  - Cities heal 1 HP/turn if not damaged that turn.
  - Captured units may have healing delay; cities track last damaged turn to gate healing.
- **Capture**:
  - Only capture-capable units (melee/cavalry/armies/Titan) can seize cities; on capture, city HP resets to 8.

## 11. Technology
- **Costs by era**: Hearth 20, Banner 50, Engine 85 Science.
- **Single active tech**: Science applies each Start of Turn; on completion choose next (research pauses if none).
- **Unlocks** (one per tech):
  - Fieldcraft → Farmstead.
  - Stonework Halls → Stone Workshop.
  - Script Lore → Scriptorium.
  - Formation Training → +1 Defense to melee units.
  - Trail Maps → River Boat.
  - Wellworks → Reservoir.
  - Timber Mills → Lumber Mill.
  - Scholar Courts → Academy.
  - Drilled Ranks → +1 Attack to melee & ranged.
  - City Wards → City Ward.
  - Steam Forges → Forgeworks and Titan's Core building access.
  - Signal Relay → +1 Science per city (passive).
  - Urban Plans → City Square.
  - Army Doctrine → enables Form Army projects (Banner era, cost 50, requires Formation Training).
  - Star Charts → Observatory project (starts Progress chain).

## 12. Buildings
- Costs are Production; one per city unless noted.
  - **Farmstead** (40, Fieldcraft): +1 Food; growth 10% cheaper.
  - **Stone Workshop** (40, Stonework Halls): +1 Production.
  - **Scriptorium** (40, Script Lore): +1 Science.
  - **Reservoir** (60, Wellworks): +1 Food (+1 extra if river city).
  - **Lumber Mill** (60, Timber Mills): +1 Production (+1 extra if any Forest worked).
  - **Academy** (60, Scholar Courts): +2 Science.
  - **City Ward** (60, City Wards): +4 city defense, +1 city attack.
  - **Forgeworks** (80, Steam Forges): +2 Production.
  - **City Square** (80, Urban Plans): +1 Food, +1 Production.
  - **Titan's Core** (150, Steam Forges): summons Titan on completion (unique per civ). *(v0.98: Reduced from 200)*
  - **Spirit Observatory** (275, Star Charts): "The Revelation"—complete current tech, grant a free tech, +2 Science per city, counts as Observatory milestone (unique per civ). *(v0.98 Update 6: Increased from 200 to nerf Progress rush)*
  - **Jade Granary** (100, Wellworks): "The Great Harvest"—+1 Pop per city, growth 15% cheaper, +1 Food per city (unique per civ). *(v0.98 Update 8: Reduced from 150 - was only built 14% of games)*

## 13. Projects & Wonders
- **Progress Chain** (once per civ, one city at a time):
  - Observatory (160, Star Charts) → milestone, +Science in city, unlocks Grand Academy. *(v0.98: Increased from 120)*
  - Grand Academy (210, after Observatory) → +1 Science per city, unlocks Grand Experiment. *(v0.98: Increased from 165)*
  - Grand Experiment (280, after Grand Academy) → Progress Victory on completion. *(v0.98: Increased from 210)*
- **Form Army Projects** (Army Doctrine, Banner era):
  - Form Army — Spear Guard (10): convert Spear Guard → Army Spear Guard. *(v0.98 Update 5)*
  - Form Army — Bow Guard (10): convert Bow Guard → Army Bow Guard. *(v0.98 Update 5)*
  - Form Army — Riders (10): convert Riders → Army Riders. *(v0.98 Update 6: Reduced from 15 - 0 formed in 50 games!)*
- **Milestone Marker**:
  - JadeGranaryComplete (0 cost) tracks Jade Granary completion (not player-selectable).
- **Wonders**: not otherwise defined in v0.98 beyond unique buildings/projects above.

## 14. Civilizations & Traits

### ForgeClans
- **Ironworking**: +1 Production per worked Hill tile. *(v0.98: Fixed to be per-tile, not flat)*
- **Master Craftsmen**: Projects complete 25% faster (effective +25% production towards projects). *(v0.98 Update 4)*
- **Forged Arms**: Military units gain +1 Attack when any city has 2+ worked Hill tiles. *(v0.98 Update 5)*
- **Production Mastery**: Military units cost 20% less Production. *(v0.98 Update 5)*
- **Industrial Warfare**: Military units gain +1 Attack per Engine-era tech researched (max +5 with all 5 techs). *(v0.98 Update 6: NEW - late-game powerhouse identity)*

### Scholar Kingdoms
- **Great Library**: +1 Science in Capital. *(v0.98 Update 8: BUFFED - Restored after being removed, helps weakest civ get science head start)*
- **Royal Scholars**: +1 Science per Scriptorium or Academy building in each city. *(v0.98: MAJOR NERF - Changed from "+2 Science in Capital only" to gate bonus behind building investment)*
- **Scholarly Retreat**: Military units within 2 tiles of any city with Scriptorium or Academy gain +2 Defense. *(v0.98 Update 8: NEW - helps them survive long enough to use science advantage)*

### River League
- **River's Bounty**: +1 Food from each worked river-adjacent tile.
- **River Commerce**: +1 Production in cities on river tiles.
- **River Knowledge**: +1 Science in cities on river tiles. *(v0.98: NEW - Triple river city bonus)*

### Aetherian Vanguard
- **Vanguard Force**: Starts with 2 extra SpearGuards (4 units: Settler, Scout, 2x SpearGuard). *(v0.98 Update 3: Now 2 SpearGuards)*
- **Battle Hardened**: Military units gain +1 HP per era researched (max +3).
- **Titan's Core**: Can build Titan's Core (summon Titan, cost 150). *(v0.98: Reduced from 200)*
- **Titan's Wrath**: When a Titan is spawned, automatically switches to aggressive Conquest mode.

### Starborne Seekers
- **Vanguard Scouts**: Starts with Scout + SpearGuard (3 units: Settler, Scout, SpearGuard). *(v0.98 Update 4)*
- **Stargazers**: Worked Sacred Sites provide +1 bonus Science (on top of base yield). *(v0.98 Update 6: NERFED - removed +1 Science in Capital)*
- **Celestial Guidance**: Military units within 3 tiles of capital gain +1 Defense. *(v0.98 Update 5)*
- **Spirit Observatory**: Can build Spirit Observatory (Revelation bonus, cost 275). *(v0.98 Update 6: Increased from 200)*

### Jade Covenant
- **Population Power**: Military units gain +1 Attack and +1 Defense per 8 total population across all cities. *(v0.98 Update 5: NERFED from per-5 to per-8)*
- **Bountiful Harvest**: Cities start with +5 stored Food when founded.
- **Verdant Growth**: +10% faster growth globally (stacks with Farmstead/Jade Granary).
- **Jade Granary**: Can build Jade Granary (Great Harvest bonus).
- ~~Double Settlers~~ *(v0.98 Update 2: REMOVED - 80% win rate was too strong)*

## 15. Map & Generation
- **Sizes**: Tiny 14×10, Small 18×14, Standard 22×16, Large 24×18, Huge 32×24.
- **Civ caps**: Tiny 2, Small 3, Standard 4, Large/Huge 6.
- **Terrain generation**: mix of Plains/Hills/Forest/Marsh/Desert/Mountain/Coast/Deep Sea with overlays (River edges, Rich Soil, Ore Vein, Sacred Site).
- **Start fairness**: each civ placed in balanced start zones with access to workable tiles; capitals get civ-specific first name.
- **Territory**: exclusive ownership; auto-claim rules in section 7.
- **Vision**: see section 2 for states; shared vision via diplomacy applies after acceptance.
- **Map Boundaries**: The full map dimensions are hidden from the player. The game only renders visible/revealed tiles plus a 2-tile buffer of shroud. Tiles beyond this buffer are not rendered, appearing as empty void until explored.

## 16. Diplomacy
- **Contact**: You must have met another player (units/cities visible) before declaring war or sharing vision.
- **Known Strength**: Once contact is made, each side sees the other civilization's current military power value in the Diplomacy panel; this number is shared symmetrically and used by AI for war/peace decisions.
- **War**: Sets stance to War. Both players can attack each other's units and cities.
- **Peace**: Default stance after contact. Players cannot attack each other.
- **Propose Peace**: If you are at war, you may propose peace. If the other player also proposes peace (or has an incoming proposal from you), peace is established.
- **Shared Vision**: At Peace, you may propose sharing vision. Both players see each other's explored tiles.

### Diplomatic State Durations
- **War Duration**: Once war is declared between two civilizations, it must last a **minimum of 15 turns** before either party can propose peace. This ensures wars are sustained conflicts rather than brief skirmishes.
- **Peace Duration**: After establishing peace (or at initial contact), at least **15 turns** must pass before either civilization can declare war on the other. This creates stable periods for diplomacy and prevents immediate re-hostilities.
- **Purpose**: These minimum durations make diplomatic states meaningful and prevent rapid oscillation between war and peace.

## 17. Victory, Ties, Elimination
- **Conquest Victory**: you control all enemy capitals.
- **Progress Victory**: complete Grand Experiment.
- **Tie resolution**: if multiple victories same round, Progress outranks Conquest; if still tied, earlier turn order prevails.
- **Elimination**: civ with zero cities is eliminated; remaining units are removed.

## 18. State Indicators & UI Standards
- **Per-unit flags**: hasAttacked (attack availability), movesLeft (movement), linkedUnitId (army/escort pairing), capturedOnTurn (healing gate).
- **Per-city flags**: hasFiredThisTurn (city attack), lastDamagedOnTurn (healing gate), currentBuild/progress.
- **HUD expectations**:
  - Show current tech and progress; allow tech selection.
  - Show city build, yields, worked tiles with Pop cap enforcement and ownership/vision rules.
  - Show unit selection, link/unlink actions, found city when Settler.
  - Bottom city panel focused on city data; turn panel bottom-right; top tabs for Research, Diplomacy, Codex.
  - Vision states: visible, fogged (seen), shroud (unseen) legend exposed.
  - **Camera**: Starts centered on the player's initial unit/city at a standard zoom level (1.0). Does not reveal map size by zooming out to fit.
- **Status colors**: use existing HUD styles (chips/pills) to denote peace/war, garrison, fired, etc.

## 19. Rules Priority & Engine Hooks
- **Priority**: Engine logic (constants/types) → this rulebook → UI copy. If discrepancies arise, engine constants are authoritative; update rulebook to match.
- **Engine hooks**:
  - Actions: EndTurn, MoveUnit, Attack (unit/city), SetCityBuild, FoundCity, CityAttack, SetWorkedTiles, SetDiplomacy/Peace/Vision actions, Link/Unlink, RazeCity, Propose/Accept offers.
  - Tech progression: ChooseTech required to spend Science.
  - Vision sharing/diplomacy stored in gameState.sharedVision/diplomacy/diplomacyOffers.
  - Progress tracking: milestones stored via projects (Observatory, Grand Academy, Grand Experiment, JadeGranaryComplete).
