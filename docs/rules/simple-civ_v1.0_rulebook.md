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
<!-- CODEX_SKIP_END -->

## 1. Vision & Pillars
- **One-more-turn, zero bloat**: fast, board-game-paced 4X on a compact hex map.
- **Clarity over crunch**: only three yields (Food, Production, Science); no upkeep, no hidden multipliers.
- **Short campaign, real arc**: ~150 turns on Standard maps.
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
- **Map size**: Tiny 17×12, Small 21×17, Standard 25×19, Large 28×21, Huge 37×28.
- **Civ count caps**: Tiny 2, Small 3, Standard 4, Large/Huge 6.
- **Players**: 1–4 (human/AI/hotseat). Rules identical for all.
- **Starting units**: each civ begins with 1 Settler + 1 Scout + 1 Spear Guard (Starborne Seekers start with an additional Scout).
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
  - Units may Fortify (consumes moves, +2 defense).
- **End of Turn**: pass control; no resolutions occur here.
- **End of Round**: native camps take their turn (patrol/aggro/retreat, attacks, heal) before victory/ties/elimination checks.

## 6. Yields & Economy
- **Only three yields**: Food (growth), Production (build progress), Science (research). No gold/happiness/upkeep/trade.
- **City center minimums**: enforce ≥2 Food and ≥1 Production after terrain/overlay/civ modifiers; base city Science +1 per city.
- **Storage & overflow**: Food and Production overflow carry after growth/completion.
- **Growth cost**: base 30 for Pop 2; scales by Pop range multipliers:
  - Pop 2–4: ×1.30, Pop 5–6: ×1.40, Pop 7–8: ×1.80, Pop 9–10: ×2.00, Pop 11+: ×2.50.
  - Modifiers: Farmstead ×0.9, Jade Granary ×0.85, Jade Covenant passive ×0.9 (stack multiplicatively on base formula).
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
  - Base city HP 15; capture resets to 8. Base defense strength 3.
  - City heal 2 HP/turn if not damaged that turn (and HP > 0); friendly city heal for units: +5 HP/turn.
  - **Garrison Bonuses**:
    - **Melee Unit**: +2 City Defense, +1 City Attack Strength, Retaliation Range 1.
    - **Ranged Unit**: +1 City Defense, +3 City Attack Strength, Retaliation Range 2.
  - City Ward adds +4 defense and +1 city attack.
- **City Attack**:
  - Base city attack strength 3; range 2; one shot/turn if unfired and garrisoned.
  - **Automatic Retaliation**: If a city with a garrison is attacked by a unit within the garrison's Retaliation Range, the city automatically strikes back after taking damage.
- **Razing**:
  - Non-capitals may be razed by owner if a garrison is present (removes city). Capitals cannot be razed.

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
  - **Goodie Hut**: Special one-time discovery reward. ~3% spawn rate on valid land tiles (not Mountain, Coast, Deep Sea, or tiles with other overlays). When a unit enters a Goodie Hut tile, the hut is collected and removed, granting one of four random rewards (25% chance each):
    - **Food**: +10 Food to nearest city if Pop < 3, otherwise +5 Food.
    - **Production**: +10 Production to nearest city if no active build, otherwise +5 Production.
    - **Research**: +20% progress toward current tech if < 50% complete, otherwise +10%. No reward if no tech is being researched.
    - **Free Scout**: Spawns a Scout unit at or adjacent to the hut (0 moves remaining).
  - **Native Camp**: Hostile neutral encampment with a 3-hex territory. Each camp spawns 1 Native Champion and 2 Native Archers; natives aggro when attacked or when enemy units enter territory and may chase up to 2 tiles beyond it. Natives heal +2 HP/turn inside camp territory.
  - **Cleared Settlement**: Appears after a camp is cleared; grants +1 Food on the tile and replaces the camp overlay.
- **City Center rule**: apply terrain + overlay, then enforce minimums, then civ perks.

## 9. Units
- **Base Units** (atk/def/rng/move/HP/cost/domain/capture/vision):
  *Note: Unit costs scale with game turn (Base * (1 + Turn/25)).*
  - Settler: 0/2/1/1/1/18, Civilian, cannot capture, vision 2.
  - Scout: 1/1/1/2/10/23, Land, no capture, vision 3.
  - Spear Guard: 2/2/1/1/10/27, Land, can capture, vision 2.
  - Bow Guard: 2/1/2/1/10/27, Land, no capture, vision 2.
  - Riders: 2/2/1/2/10/32, Land, can capture, vision 2.
  - Skiff: 2/2/1/3/10/32, Naval, no capture, vision 2.
- **Army Units** (formed via projects; HP 15):
  - Army Scout 3/3/1/2, no capture, vision 3.
  - Army Spear Guard 8/4/1/1, capture, vision 2.
  - Army Bow Guard 6/3/2/1, no capture, vision 2.
  - Army Riders 8/4/1/2, capture, vision 2.
  - **Titan**: 30 atk / 8 def / rng 1 / move 2 / HP 30 / capture / vision 3 (summoned by Titan's Core). **Location-based regeneration**: 1 HP/turn in enemy territory, 3 HP/turn in friendly territory, 5 HP/turn in friendly city.
- **Neutral Native Defenders** (not buildable; guard camps): Native Champion 4/4/1/1/18, no capture, vision 2; Native Archer 3/2/2/1/12, no capture, vision 2.
- **States**: Normal, Fortified (+2 defense until move/attack), Garrisoned (on city), PendingSpawn (queued).
- **Linking**: eligible units can link into armies via Form Army projects; unlink to split back to base units.
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
- **Damage Model (v2.0 - Civ 6-style)**:
  - Formula: `Damage = 5 × e^(StrengthDiff / 25) × RandomMult`
  - StrengthDiff = Attacker ATK - Defender DEF (includes terrain/fortify bonuses)
  - RandomMult = 0.9 to 1.1 (deterministic from game seed)
  - Damage clamped to [1, 15]
- **Defense & Terrain**:
  - Hills +2 defense, Forest +1, Marsh -1, Desert -1; City Ward adds city defense/attack bonuses.
  - Fortified state adds +1 defense.
- **Line of Sight**:
  - Hills/Forest/Mountain block LoS; ranged attacks require LoS unless adjacent.
- **Counterattacks (v2.0 - Melee Return Damage)**:
  - When a melee unit (range 1) attacks and the defender survives, the defender counter-attacks using the same damage formula (Defender ATK vs Attacker DEF).
  - Ranged units (range > 1) do NOT take return damage from units.
  - City garrison retaliation uses the same formula.
- **Healing**:
  - Friendly tile: +3 HP/turn; friendly city: +5 HP/turn.
  - Cities heal 2 HP/turn if not damaged that turn.
  - Captured units may have healing delay; cities track last damaged turn to gate healing.
- **Native Camps & Aggro**:
  - Camp territory is a 3-hex radius; entering or attacking natives triggers Aggro for 3 turns (timer refreshes while enemies remain). Aggro natives may chase targets up to 2 tiles beyond camp territory.
  - Native turns resolve at end-of-round: reset moves, patrol if idle, attack/advance when Aggro, retreat toward camp when damaged, then heal (+2 HP/turn inside territory).
  - Clearing the last native removes the camp, applies the Cleared Settlement overlay (+1F), and grants +20 Production to the nearest city of the clearing player.
- **Capture**:
  - Only capture-capable units (melee/cavalry/armies/Titan) can seize cities; on capture, city HP resets to 8.

## 11. Technology
- **Costs by era**: Hearth 20, Banner 50, Engine 85 Science.
- **Single active tech**: Science applies each Start of Turn; on completion choose next (research pauses if none).
- **Unlocks** (one per tech):
  - Fieldcraft → Farmstead.
  - Stonework Halls → Stone Workshop.
  - Script Lore → Scriptorium.
  - Formation Training → +1 Attack and +1 Defense to Melee and Ranged units.
  - Trail Maps → Skiff.
  - Wellworks → Reservoir.
  - Timber Mills → Lumber Mill.
  - Scholar Courts → Academy.
  - Drilled Ranks → Enables Form Army projects.
  - City Wards → City Ward.
  - Steam Forges → Forgeworks and Titan's Core building access.
  - Signal Relay → +1 Science per city (passive).
  - Urban Plans → City Square.
  - Army Doctrine → +1 Attack and +1 Defense to Armies.
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
  - **Titan's Core**: Cost 100. Summons **The Titan** (Limit 1).
    - **Titan Stats**: Attack 30, Defense 8, HP 30, Moves 2. Location-based regeneration.
- **Spirit Observatory**: Cost 300. +1 Science per city. Counts as Observatory. milestone (unique per civ).
  - **Jade Granary** (30, Fieldcraft): "The Great Harvest"—+1 Pop per city, growth 15% cheaper, +1 Food per city, Spawns Free Settler (unique per civ).

## 13. Projects & Wonders
- **Progress Chain** (once per civ, one city at a time):
  - Observatory (220, Star Charts) → milestone, +Science in city, unlocks Grand Academy.
  - Grand Academy (265, after Observatory) → +1 Science per city, unlocks Grand Experiment.
  - Grand Experiment (350, after Grand Academy) → Progress Victory on completion.
- **Form Army Projects** (Army Doctrine) [Costs scale with turn]:
  - Form Army — Spear Guard (10 base): convert Spear Guard → Army Spear Guard.
  - Form Army — Bow Guard (10 base): convert Bow Guard → Army Bow Guard.
  - Form Army — Riders (10 base): convert Riders → Army Riders.
- **Filler Projects** (Repeatable) [Costs scale with turn]:
  - Harvest Festival (100 base, Farmstead): Grants 25 Food.
  - Alchemical Experiments (100 base, Scriptorium): Grants 25 Science.
- **Milestone Marker**:
  - JadeGranaryComplete (0 cost) tracks Jade Granary completion (not player-selectable).
- **Wonders**: not otherwise defined in v0.94 beyond unique buildings/projects above.

## 14. Civilizations & Traits
- **ForgeClans**: +1 Production from each worked Hill (Capital Only). **Forged Arms**: Military units 10% cheaper; units from cities with 2+ Hills get +1 Attack. **Industrial Warfare**: +1 Attack per Engine tech (max +5).
- **Scholar Kingdoms**: **Citadel Protocol**: +1 Science in Capital. +1 Science per city with a City Ward. Units near cities get scaling Defense bonus: +6/cityCount (1 city = +6 DEF, 2 = +3 each, 3 = +2 each, 4+ = +1 each). Rewards "tall" play with fewer, fortified cities.
- **River League**: +1 Food per river tile. +1 Production per 4 river tiles worked. **River Guardians**: Units near rivers get +1 Attack, +1 Defense.
- **AetherianVanguard**: Unique Unit: Titan (Super-Unit). **Battle Hardened**: Military units gain +2 HP per era researched (max +6). **Scavenger Doctrine**: Units gain Science on kill. **Vanguard Logistics**: Cities with a garrison gain +1 Production.
- **StarborneSeekers**: Unique Building: Spirit Observatory (220 Prod, +1 Science per city, counts as Observatory). **Celestial Guidance**: Units near capital +1 Defense. Starts with an extra Scout (total 2 Scouts + Spear Guard).
- **JadeCovenant**: Unique Building: Jade Granary (30 Prod) - +1 Pop/City, +1 Food/City, Spawns Free Settler, Growth 15% cheaper. **Bountiful Harvest**: Cities start with +5 stored Food. **Verdant Growth**: 10% cheaper growth globally. **Nomadic Heritage**: Settlers have 3 Movement and 10 HP. **Ancestral Protection**: Settlers gain +2 Defense. **Population Power**: Units +1 Atk/Def per 8 Pop. **Nature's Wrath**: Enemy units in Jade Covenant territory take 1 HP attrition damage at the start of their turn if at war.
- AI personalities differ by civ goal/aggression but follow identical rules.

## 15. Map & Generation
- **Sizes**: Tiny 17×12, Small 21×17, Standard 25×19, Large 28×21, Huge 37×28.
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

### AI Diplomacy Behavior
- **War Escalation**: AI aggression scales with the game turn. In the late game (Turn 50+), AI civilizations become "Bloodthirsty" and will refuse all peace offers to drive the game to a conclusion.
- **Map Scaling**: On Standard, Large, and Huge maps, Conquest-biased civilizations (e.g., Aetherian Vanguard) are more aggressive to overcome travel distances.
- **Domination Bypass**: Extremely powerful AI civilizations (3x stronger than target) may bypass the standard peace duration to crush weak neighbors.
- **War Preparation**: AI will spend up to 10 turns preparing for war (building units, positioning) before declaring hostilities.

## 17. Victory, Ties, Elimination
- **Conquest Victory**: you control all enemy capitals.
- **Progress Victory**: complete Grand Experiment.
- **Tie resolution**: if multiple victories same round, Progress outranks Conquest; if still tied, earlier turn order prevails.
- **Elimination**: civ with zero cities is eliminated; remaining units are removed.
- **Game Over**:
  - Upon victory or defeat, a full-screen End Game Experience overlay displays the result.
  - **Overview Screen**: Shows victory/defeat status, final turn count, final score, and action buttons.
  - **History Replay**: Interactive map visualization showing turn-by-turn expansion, fog reveals, and key events (city founding, battles, tech research, era transitions, diplomacy changes). Includes playback controls (play/pause, speed adjustment, timeline scrubber) and event notifications.
  - **Statistics Screen**: Detailed line charts tracking Score, Science, Production, Military, and Territory over the course of the game for all civilizations.
  - **Restart Game**: Allows players to instantly restart the match with the exact same seed, map size, and civilization settings.
  - **Main Menu**: Returns to the title screen to configure a new game.
  - The game turn counter freezes at the victory moment (`endTurn`) to ensure accurate statistics and replay data.

## 18. State Indicators & UI Standards
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
  - Full-screen modal overlay with horizontal scrollable layout organized by era (Hearth → Banner → Engine).
  - Tech cards display: name, cost, prerequisites, unlock type (Unit/Building/Project/Passive), and detailed stats.
  - Visual states: **Available** (clickable, highlighted border), **Current** (active research with progress bar), **Researched** (checkmark, dimmed), **Locked** (grayed out, requires prerequisites/era gates).
  - Building unlocks show: yields, bonuses, conditional effects, and projects they unlock.
  - Civ-specific unique buildings (Jade Granary, Titan's Core, Spirit Observatory) displayed on relevant tech cards.
  - Era progression gates clearly indicated (e.g., \"Requires 3 Hearth techs\" for Banner era, \"Requires 2 Banner techs\" for Engine era).
- **Status colors**: use existing HUD styles (chips/pills) to denote peace/war, garrison, fired, fortified, etc.

## 19. Rules Priority & Engine Hooks
- **Priority**: Engine logic (constants/types) → this rulebook → UI copy. If discrepancies arise, engine constants are authoritative; update rulebook to match.
- **Engine hooks**:
  - Actions: EndTurn, MoveUnit, Attack (unit/city), SetCityBuild, FoundCity, CityAttack, SetWorkedTiles, SetDiplomacy/Peace/Vision actions, Link/Unlink, RazeCity, Propose/Accept offers, FortifyUnit.
  - Tech progression: ChooseTech required to spend Science.
  - Vision sharing/diplomacy stored in gameState.sharedVision/diplomacy/diplomacyOffers.
  - Progress tracking: milestones stored via projects (Observatory, Grand Academy, Grand Experiment, JadeGranaryComplete).
