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
- **Map size**: Tiny 12×8, Small 16×12, Standard 20×14, Large 24×18, Huge 32×24.
- **Civ count caps**: Tiny 2, Small 3, Standard 4, Large/Huge 6.
- **Players**: 1–4 (human/AI/hotseat). Rules identical for all.
- **Starting units**: each civ begins with 1 Settler + 1 Scout.
- **Starting placement**: fair-start zones with nearby workable tiles; capitals named from civ list (unique first-city name, then list, then “New [Capital] n” if exhausted). Players may rename on founding.
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
- **Growth cost**: base 20 for Pop 2; scales by Pop range multipliers:
  - Pop 2–4: ×1.20, Pop 5–6: ×1.27, Pop 7–8: ×1.32, Pop 9–10: ×1.37, Pop 11+: ×1.42.
  - Modifiers: Farmstead ×0.9, Jade Granary ×0.85 (stack multiplicatively on base formula).
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
- **Defense & HP**:
  - Base city HP 20; capture resets to 10. Base defense strength 5.
  - City heal 2 HP/turn if not damaged that turn; friendly city heal for units: +5 HP/turn.
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
  - Settler: 0/0/1/1/1/70, Civilian, cannot capture, vision 2.
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
- **Linking**: eligible units can link into armies via Form Army projects; unlink to split back to base units.
- **Vision**: provided per unit; shared vision extends via diplomacy.
- **Move & Domain**: land units cannot enter impassable (Mountains, off-map); naval units use Coast/Sea.

## 10. Movement & Combat
- **Movement**:
  - Spend move points per tile; terrain move costs apply (land vs naval). Cannot enter impassable.
  - Linked units move together.
- **Attacking**:
  - One attack per unit per turn; ranged must respect range; melee requires adjacency.
  - Cities can be attacked; only capture-capable units take cities.
- **Damage Model**:
  - Base damage 3, clamped by min/max (1–7 band) with random variance (ATTACK_RANDOM_BAND -1/0/+1).
  - Modified by attacker attack vs defender defense plus terrain modifiers; minimum 1 damage on hit.
- **Defense & Terrain**:
  - Hills +2 defense, Forest +1, Marsh -1, Desert -1; City Ward adds city defense/attack bonuses.
- **Line of Sight**:
  - Hills/Forest/Mountain block LoS; ranged attacks require LoS unless adjacent.
- **Counterattacks**:
  - Melee targets counter if alive and capable.
- **Healing**:
  - Friendly tile: +3 HP/turn; friendly city: +5 HP/turn.
  - Cities heal 2 HP/turn if not damaged that turn.
  - Captured units may have healing delay; cities track last damaged turn to gate healing.
- **Capture**:
  - Only capture-capable units (melee/cavalry/armies/Titan) can seize cities; on capture, city HP resets to 10.

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
  - Army Doctrine → enables Form Army projects.
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
  - **Titan's Core** (200, Steam Forges): summons Titan on completion (unique per civ).
  - **Spirit Observatory** (200, Star Charts): “The Revelation”—complete current tech, grant a free tech, +2 Science per city, counts as Observatory milestone (unique per civ).
  - **Jade Granary** (150, Wellworks): “The Great Harvest”—+1 Pop per city, growth 15% cheaper, +1 Food per city (unique per civ).

## 13. Projects & Wonders
- **Progress Chain** (once per civ, one city at a time):
  - Observatory (120, Star Charts) → milestone, +Science in city, unlocks Grand Academy.
  - Grand Academy (165, after Observatory) → +1 Science per city, unlocks Grand Experiment.
  - Grand Experiment (210, after Grand Academy) → Progress Victory on completion.
- **Form Army Projects** (Army Doctrine):
  - Form Army — Spear Guard (15): convert Spear Guard → Army Spear Guard.
  - Form Army — Bow Guard (15): convert Bow Guard → Army Bow Guard.
  - Form Army — Riders (20): convert Riders → Army Riders.
- **Milestone Marker**:
  - JadeGranaryComplete (0 cost) tracks Jade Granary completion (not player-selectable).
- **Wonders**: not otherwise defined in v0.94 beyond unique buildings/projects above.

## 14. Civilizations & Traits
- **ForgeClans**: +1 Production from each worked Hill.
- **Scholar Kingdoms**: +1 Science in cities with Pop ≥3.
- **River League**: +1 Food from each worked river-adjacent tile.
- **Aetherian Vanguard**: Can build Titan's Core (summon Titan).
- **Starborne Seekers**: Can build Spirit Observatory (Revelation bonus).
- **Jade Covenant**: Can build Jade Granary (Great Harvest bonus).
- AI personalities differ by civ goal/aggression but follow identical rules.

## 15. Map & Generation
- **Sizes**: Tiny 12×8, Small 16×12, Standard 20×14, Large 24×18, Huge 32×24.
- **Civ caps**: Tiny 2, Small 3, Standard 4, Large/Huge 6.
- **Terrain generation**: mix of Plains/Hills/Forest/Marsh/Desert/Mountain/Coast/Deep Sea with overlays (River edges, Rich Soil, Ore Vein, Sacred Site).
- **Start fairness**: each civ placed in balanced start zones with access to workable tiles; capitals get civ-specific first name.
- **Territory**: exclusive ownership; auto-claim rules in section 7.
- **Vision**: see section 2 for states; shared vision via diplomacy applies after acceptance.

## 16. Diplomacy
- **States**: Peace or War.
- **Contact required**: must have met civ to interact.
- **Actions**:
  - Declare War (sets state to War).
  - Propose Peace (while at War); accept incoming Peace to end War.
  - Offer Vision Share (only at Peace); accept to share maps; revoke anytime.
- **Shared vision**: reveals explored tiles mutually until revoked or state changes.
- **Offers tracking**: incoming/outgoing Peace and Vision offers persist until accepted/declined or state change invalidates them.

## 17. Victory, Ties, Elimination
- **Conquest Victory**: you control all enemy capitals.
- **Progress Victory**: complete Grand Experiment.
- **Tie resolution**: if multiple victories same round, Progress outranks Conquest; if still tied, earlier turn order prevails.
- **Elimination**: civ with zero cities is eliminated; remaining units are removed.

## 18. State Indicators & UI Standards
- **Per-unit flags**: hasAttacked (attack availability), movesLeft (movement), linkedUnitId (army pairing), capturedOnTurn (healing gate).
- **Per-city flags**: hasFiredThisTurn (city attack), lastDamagedOnTurn (healing gate), currentBuild/progress.
- **HUD expectations**:
  - Show current tech and progress; allow tech selection.
  - Show city build, yields, worked tiles with Pop cap enforcement and ownership/vision rules.
  - Show unit selection, link/unlink actions, found city when Settler.
  - Bottom city panel focused on city data; turn panel bottom-right; top tabs for Research, Diplomacy, Codex.
  - Vision states: visible, fogged (seen), shroud (unseen) legend exposed.
- **Status colors**: use existing HUD styles (chips/pills) to denote peace/war, garrison, fired, etc.

## 19. Rules Priority & Engine Hooks
- **Priority**: Engine logic (constants/types) → this rulebook → UI copy. If discrepancies arise, engine constants are authoritative; update rulebook to match.
- **Engine hooks**:
  - Actions: EndTurn, MoveUnit, Attack (unit/city), SetCityBuild, FoundCity, CityAttack, SetWorkedTiles, SetDiplomacy/Peace/Vision actions, Link/Unlink, RazeCity, Propose/Accept offers.
  - Tech progression: ChooseTech required to spend Science.
  - Vision sharing/diplomacy stored in gameState.sharedVision/diplomacy/diplomacyOffers.
  - Progress tracking: milestones stored via projects (Observatory, Grand Academy, Grand Experiment, JadeGranaryComplete).
