SIMPLE CIV — v0.91 RULEBOOK / DESIGN DOC
Table of Contents

Vision & Design Pillars

1.1 Game Vision

1.2 Design Pillars

Core Rules

2.1 Game Overview

2.2 Components (Digital Equivalents)

2.3 Setup

2.4 Turn Structure

2.5 Cities & Economy

2.6 Units & Combat

2.7 Technology

2.8 Exploration & Diplomacy

2.9 Victory, Ties, Elimination

Content Reference

3.1 Terrain & Features

3.2 Units

3.3 Buildings

3.4 Tech Tree

3.5 Projects

3.6 Civilizations & Traits

3.7 Map Sizes & Generation

Rules Priority

State Indicators

UI Standards

AI / Engine Hooks Appendix

1. Vision & Design Pillars
1.1 Game Vision

A digital, board-game-style empire game where you lead a small civilization from early villages to early industry on a compact hex map. Rules are simple, turns are fast, and every turn asks for a few meaningful choices. The goal is to keep the “one more turn” feel without modern 4X bloat.

1.2 Design Pillars

Simplicity first
If a rule can’t be explained in 1–2 sentences, it’s probably out.

Fast turns
Typical turns should be 10–20 seconds once the player understands the game.

Clear cause and effect
If you do X, you should quickly see why it helped or hurt.

Short campaign, long arc
One game is ~70–80 turns on Standard maps; you still feel like you built a civilization in miniature.

Board-game clarity
Few numbers, clear icons, minimal hidden math.

Safety nets, not handholding
You can lose battles and still recover. Cities always have some defense; you’re never totally naked.

2. Core Rules
2.1 Game Overview

Theme: Lead a small civilization from early villages to early industry on a compact map.

Players: 1–4 (human vs AI and/or hotseat). Rules are identical regardless of player count.

Core Loop:

Cities generate Food, Production, Science.

Food grows Population → more tiles worked.

Production builds Units / Buildings / Projects.

Science unlocks Techs that improve everything else.

You explore, fight, and race toward either Conquest or Progress victory.

2.1.1 Victory Conditions

You can win in two main ways:

Conquest Victory

You control all other civilizations’ capital cities.

Progress Victory

You complete a 3-step global project chain:
Observatory → Grand Academy → Grand Experiment

If multiple players would win in the same global round, tie-breaking is defined in 2.9.3.

2.2 Components (Digital Equivalents)
2.2.1 Map & Terrain

The world is a hex grid of tiles.

Each tile has:

A base terrain (Plains, Hills, Forest, Mountain, Coast/Sea, Desert, Marsh).

Optionally an overlay feature (River edge, Rich Soil, Ore Vein, Sacred Site).

Full terrain rules and yields are in 3.1 Terrain & Features.

2.2.2 Cities

Each city tracks:

Name

Population (Pop)

City Center tile and worked tiles

Yields per turn: Food, Production, Science

Stored Food & Production

Buildings

Defense Strength & HP

2.2.3 Units

Each unit has:

Type: Civilian (Settler) or Military (Scout, Melee, Ranged, Cavalry, Naval)

Stats: Attack, Defense, Range, Move, HP

Tile Position

Units are upgraded globally via techs (no separate “era unit cards”).
Full unit stats in 3.2 Units.

2.2.4 Tech Tree

3 Eras:

Hearth Age (early)

Banner Age (mid)

Engine Age (late)

Each Era has 5 techs (15 total).

Each tech:

Has a Science cost.

Unlocks exactly one thing:

A building,

A project,

A passive empire bonus,

Or a unit availability/upgrade rule.

Full tech list in 3.4 Tech Tree.

2.2.5 Yields

Three yields:

Food — grows Population when enough is stored.

Production — builds Units, Buildings, Projects.

Science — researches Technologies.

No other yields exist in v1.0.
There is no Gold, Happiness, Loyalty, Trade, or upkeep.

2.2.6 Projects & Wonders

Projects are special city builds that:

enable Progress steps, or

provide long-term bonuses.

Wonders are not defined in v1.0.

Progress projects are in 3.5 Projects.

2.2.7 Civilizations

Each civilization has:

a name,

a single always-on trait,

an AI personality (AI appendix).

Traits are in 3.6 Civilizations & Traits.

2.3 Setup
2.3.1 Starting the Game

Choose map size: Small / Standard / Large (dimensions in 3.7.1).

Generate map:

Place terrain and overlays per 3.7 Map Generation.

Choose civilizations.

Starting positions:

Each player is placed in a fair start zone per 3.7.3.

2.3.2 Starting Units & Cities

Each player starts with:

1 Settler

1 Scout

The Settler may immediately found a capital city, or move to a better location.

2.4 Turn Structure

A global round consists of each player taking a full turn in order.

2.4.1 Player Turn Phases

On your turn:

Start of Turn (Upkeep & Yields)

For each city:

Add Food/Production/Science yields.

Apply growth if stored Food ≥ GrowthCost (2.5.4).

Apply build completions if stored Production ≥ cost (2.5.5).

Apply tech progress:

Add total Science to current tech.

If tech completes, resolve unlock.

Planning Phase

For each city that finished a build or is idle:

Choose a new Unit/Building/Project to build.

If a tech finished:

Choose a new tech to research.

You may reassign worked tiles in your cities (2.5.3).

Action Phase

In any order, for each of your units:

Move up to Move value.

If eligible, attack once.

Each city with a garrison may make one ranged attack (2.6.5.3).

End of Turn

Nothing resolves here except passing control.

2.4.2 End of Global Round

After all players have taken a turn:

Check victories (2.9).

Resolve ties (2.9.3).

Check elimination (2.9.4).

2.5 Cities & Economy
2.5.1 Founding Cities & Territory

Settlers may found a city on any valid land tile (not Mountain, not Coast/Sea).

When founded:

The tile becomes the City Center.

City starts at Pop 1 with 0 stored Food/Production.

City immediately works its Center (2.5.2).

Each city controls tiles within 2 rings.

No shared tiles: a tile belongs to only one city.

Cities may work Coast/Sea tiles within their borders.

2.5.2 City Center Tile & Base Yields

City centers are never dead tiles.

City Center yield calculation

Start with base terrain yields.

Add overlay yields on that tile.

Apply minimums:

If Food < 2, set Food = 2.

If Production < 1, set Production = 1.

Science has no minimum.

Apply civ trait effects.

Result: every city starts with ≥2 Food and ≥1 Production from its center.

2.5.3 Population & Worked Tiles

Pop = number of tiles a city can work.

Pop N city works N tiles:

Center always counts as one.

Choose N−1 more inside borders.

Reassigning tiles: During Planning Phase, you may freely change which tiles each city works; changes take effect immediately for that turn.

2.5.4 Food Storage & Growth (Explicit Formula)

Each city tracks stored Food.

At start of turn, add Food yield to stored Food.

If stored Food ≥ GrowthCost:

Pop +1

Subtract GrowthCost

Leftover Food remains

City may grow multiple times if enough Food remains

There is no Food upkeep.

2.5.4.1 Growth Cost Function (v0.8 tuned)

Let BaseCost[2] = 20.
For N > 2:

BaseCost[N] = ceil(BaseCost[N−1] × f(N))


Growth factors:

2–4: f = 1.20

5–6: f = 1.27

7–8: f = 1.32

9–10: f = 1.37

11+: f = 1.42

GrowthCost(Pop) = BaseCost[Pop+1], modified by buildings.

2.5.4.2 Farmstead Modifier

In a city with a Farmstead:

ActualGrowthCost(Pop) = ceil(BaseCost[Pop+1] × 0.9)

2.5.4.3 Reference Growth Costs (Pop 1 → 11, No Farmstead)
From Pop	To Pop	Food Cost
1	2	20
2	3	24
3	4	29
4	5	37
5	6	47
6	7	63
7	8	84
8	9	116
9	10	159
10	11	226

With Farmstead, each is reduced by 10% (ceil).

2.5.5 Production & Build Progress

Each city tracks stored Production on its current build.

At start of turn, add city Production to current build.

If stored Production ≥ cost:

Build completes.

Excess Production carries to next build.

Locked builds: Once started, a build cannot be switched or cancelled.
You choose a new build only on completion.

2.5.6 Science Yields (Base Science Rule)

Each city produces 1 Science per turn by default.

Additional Science comes from:

Buildings,

Worked Sacred Sites,

Tech passives,

Traits.

Total Science is applied each turn to the current tech.

2.5.7 Buildings (Summary)

Buildings increase yields or defense and are 1 per city unless stated otherwise.
Full list in 3.3 Buildings.

2.5.8 Settlers & New Cities
2.5.8.1 Settler Unit

Move 1, HP 1, no combat strength.

Cost: 70 Production.

When a city produces a Settler:

That city loses 1 Pop (min Pop 1).

2.5.8.2 Founding Cities

A Settler may found a city on a valid land tile.
The Settler is consumed.

2.5.8.3 Capturing Settlers

**Via Movement:** A Settler on a tile may be captured by an enemy military unit entering the tile. The settler changes ownership immediately.

**Via Attack:** Any unit may capture a settler by "attacking" it. The attacker must be adjacent (even ranged units). Instead of dealing damage:
- The settler changes ownership to the attacker
- The attacking unit moves to the settler's hex
- Both units have all movement consumed
- The captured settler cannot move until the turn after next (movement lock)

If at peace, capturing immediately declares war.

2.6 Units & Combat
2.6.1 Unit Types & Stats

Base combat units have 10 HP.

Armies have 15 HP.

Techs give global buffs (see 3.4).

2.6.2 Movement & Stacking

Each unit has Move points per turn.

Terrain movement costs are in 3.1.

No stacking:

1 military unit per tile.

Settlers may share a tile with 1 friendly military unit.

Blocking: Units cannot move through enemy units to reach tiles behind them.

Movement boundaries:

Land units may not enter Coast/Deep Sea.

Naval units may not enter land tiles (including city tiles).

#### 2.6.2.1 Linked Units

- During the Action Phase a player may link two friendly units that occupy the same hex. Both units must belong to the acting player, must not have attacked this turn, and neither may already be linked.
- Linked units always move together. When one spends movement, its partner is moved to the same destination and both units’ remaining movement is set to the lower of the two units’ Move values.
- If a linked move becomes illegal for the partner (blocked tile, enemy occupation, domain restriction, etc.), the moving unit continues if the destination is still legal and the pair automatically unlinks.
- Links also break automatically if the units ever end any action on different hexes. Players may issue an explicit Unlink order instead of moving.
- Linking does not override stacking rules: only one military and one civilian may share a hex, and each unit can have at most one linked partner.

2.6.3 Line of Sight & Range

Default vision radius: 2 tiles (Scouts 3).

Mountains block LoS behind them.

Forest/Hills block LoS through them to farther tiles.

2.6.4 Combat Resolution (Units vs Units)

Combat is deterministic with a small random band.
No counterattack.

When a unit attacks:

Attack Power

AttackPower = AttackerAttack + random(−1,0,+1)


Defense Power

DefensePower = DefenderDefense + terrain modifier + bonuses


Damage

delta = AttackPower − DefensePower
rawDamage = 3 + floor(delta/2)
Damage = clamp(rawDamage, 1…7)


Subtract Damage from defender HP.
If HP ≤ 0, defender is destroyed.

2.6.5 City Combat & Siege

Cities are static defenders.

2.6.5.1 City Stats (v0.8 tuned)

Max City HP: 20

CityDefenseStrength:

CityDefenseStrength =
  5 + floor(Pop/2) + (City Ward ? +4 : +0)


CityDefense = CityDefenseStrength.

2.6.5.2 Attacking Cities

Units attack cities using the same formula as unit combat.
Ranged units may attack from range; Melee/Cav must be adjacent.

2.6.5.3 City Ranged Attacks

A city may make one ranged attack per turn if it has a friendly garrison on its tile.

CityAttack = 3 (+1 if City Ward)

Range 2 with LoS rules.

2.6.5.4 Capturing Cities

A city is captured when:

City HP ≤ 0, and

An enemy Melee or Cavalry unit enters the tile using movement
(may happen after the reducing attack).

On capture:

City changes owner.

City HP reset to 10.

All military units in the tile are destroyed.

City retains all buildings.

Stored yields and current build are lost.

Borders remain; worked tiles reset to automatic assignment.

City loses 1 Pop (min 1).

Only Melee/Cav may capture. Scouts, Ranged, and Naval units cannot.

**Melee Advance After Kill:** When a melee unit (range = 1) kills an enemy unit in adjacent combat, it automatically advances into the defender's hex. All movement is consumed (this already happens when attacking). Scouts, Ranged, and Naval units cannot.

2.6.5.5 Razing Cities

After capture, attacker chooses Keep or Raze:

Raze: City is removed from the game. Borders disappear. Tile reverts to its original pre-settlement terrain/feature. All stored yields and current builds are lost.

Capitals have no special rules besides being required for Conquest victory.

2.6.6 Fortify (v0.6 completion)

If a military unit does not move or attack on its turn, it becomes Fortified until it moves or attacks again:

Fortify bonus: +1 Defense.

2.6.7 Healing

Units heal only in friendly territory and only if they did not move or attack:

Friendly tile: +3 HP

Friendly city: +5 HP

2.6.7.1 City Healing

Cities automatically heal 2 HP at the start of their owner's turn, up to their Max HP.

**Healing Cooldown:** Cities that took damage in the previous turn do not heal. A city must survive one full turn cycle without taking damage before healing resumes.

2.7 Technology
2.7.1 Research Basics

Your civ researches exactly one tech at a time.

Each turn, add total Science to that tech.

When progress ≥ cost:

Tech completes and its unlock is gained.

Next Planning Phase you choose a new available tech.

Locked research: Once started, a tech cannot be switched.

2.7.2 Tech Tree Structure & Era Gates

3 eras, 5 techs each, 15 total.

Era gates:

Banner techs require 2 Hearth techs completed.

Engine techs require 2 Banner techs completed.

Some techs have specific prerequisites.

Full list in 3.4.

2.8 Exploration & Diplomacy
2.8.1 Fog of War

Unseen tiles are hidden.

Seen but out of sight tiles show terrain only.

Units/cities provide vision.

2.8.2 Contact

Seeing another civ’s unit or city establishes Contact.
You start at Peace.

2.8.3 Peace & War

At Peace, you may not attack that civ.

Attacking a Peace civ auto-declares War first.

Either side may propose Peace at any time; no minimum war duration or limits on peace proposals.

2.9 Victory, Ties, Elimination
2.9.1 Conquest Victory

You win if you control all other civs’ capitals.

If your capital is captured, you remain in the game as long as you control at least one city.

2.9.2 Progress Victory

You win if you complete Grand Experiment while controlling at least one city.

Progress chain:

Observatory

Grand Academy

Grand Experiment

Rules:

Each Progress step is once per civ.

Only one city may build a given step at a time.

If a city is captured mid-project, the project cancels and Production is lost.

Completed steps are permanent milestones for your civ even if the city is later lost.

2.9.3 Ties & Simultaneous Victories (v0.9 locked)

If multiple victories occur in the same global round:

Progress resolves first.

Conquest resolves second.

If multiple players achieve the same victory type simultaneously:

Score = Total Population + Number of Cities + Techs Researched.

Highest Score wins.

If still tied, tied players share victory.

2.9.4 Elimination (v0.7 locked)

At the end of each global round, any civ controlling 0 cities **and** no Settlers is eliminated.

Before elimination, a civ with 0 cities may still act during the round (and attempt to found).

On elimination, its units are removed and it takes no further turns.

3. Content Reference
3.1 Terrain & Features
3.1.1 Base Terrain
Terrain	Food	Prod	Sci	Move Cost (Land)	Move Cost (Naval)	Def Mod	Notes
Plains	1	1	0	1	—	+0	Default land
Hills	0	2	0	2	—	+2	Strong prod
Forest	1	1	0	2	—	+1	Blocks LoS through
Marsh	2	0	0	2	—	−1	High food
Desert	0	1	0	1	—	−1	Poor city sites
Mountain	0	0	0	—	—	—	Impassable
Coast	1	0	0	—	1	+0	Naval only, workable
Deep Sea	1	0	0	—	1	+0	Naval only, workable
3.1.2 Overlay Features
Feature	Effect
River (edge)	Adjacent tiles get +1 Food when worked. City on river is a “river city.” No movement/combat effect.
Rich Soil	+1 Food on that tile.
Ore Vein	+1 Production on that tile.
Sacred Site	+1 Science on that tile.
3.2 Units
3.2.1 Civilian

Settler

Atk 0 / Def 0 / Range 1 / Move 1 / HP 1

Cost: 70 Production

Founds cities; can be captured.

3.2.2 Core Military Units (Hearth base)
Unit	Atk	Def	Rng	Move	HP	Cost	Notes
Scout	1	1	1	2	10	25	Explore
Spear Guard (Melee)	2	2	1	1	10	30	Capture cities
Bow Guard (Ranged)	2	1	2	1	10	30	Ranged damage
Riders (Cavalry)	2	2	1	2	10	40	Fast capture
Skiff (Naval)	2	2	1	3	10	35	Water only
3.2.3 Armies (Elite)

After Army Doctrine, a city may build Form Army (Unit Type):

Cost: 50% of base unit cost.

Requires at least one full-HP eligible unit of that type within city borders.

On completion, choose an eligible unit; it becomes an Army:

+2 Atk, +2 Def, HP 15.

3.3 Buildings
Building	Era	Tech	Cost	Effect
Farmstead	Hearth	Fieldcraft	40	+1F city; −10% GrowthCost
Stone Workshop	Hearth	Stonework Halls	40	+1P city
Scriptorium	Hearth	Script Lore	40	+1S city
Reservoir	Banner	Wellworks	60	+1F city (+1F more if river city)
Lumber Mill	Banner	Timber Mills	60	+1P city (+1P more if any Forest worked)
Academy	Banner	Scholar Courts	60	+2S city
City Ward	Banner	City Wards	60	+4 CityDefense; CityAttack +1
Forgeworks	Engine	Steam Forges	80	+2P city
City Square	Engine	Urban Plans	80	+1F +1P city
3.4 Tech Tree (v0.8 tuned costs)
3.4.1 Hearth Age (cost 20 each)

Fieldcraft → Farmstead

Stonework Halls → Stone Workshop

Script Lore → Scriptorium

Formation Training → Passive: +1 Def to Melee

Trail Maps → Skiff

3.4.2 Banner Age (cost 50 each; requires 2 Hearth)

Wellworks (req Fieldcraft) → Reservoir

Timber Mills (req Stonework Halls) → Lumber Mill

Scholar Courts (req Script Lore) → Academy

Drilled Ranks (req Formation Training) → Passive: +1 Atk to Melee & Ranged

City Wards (req Stonework Halls or Formation Training) → City Ward

3.4.3 Engine Age (cost 85 each; requires 2 Banner)

Steam Forges (req Timber Mills) → Forgeworks

Signal Relay (req Scholar Courts) → Passive: +1 Science per city

Urban Plans (req Wellworks) → City Square

Army Doctrine (req Drilled Ranks) → Armies

Star Charts (req Script Lore AND Scholar Courts) → Observatory

3.5 Projects (v0.8 tuned)

Progress Projects (once per civ each):

Observatory

Tech: Star Charts

Cost: 120 Production

Effect: +1 Science in that city; unlocks Grand Academy.

Grand Academy

Requires Observatory milestone

Cost: 165 Production

Effect: +1 Science per city; unlocks Grand Experiment.

Grand Experiment

Requires Grand Academy milestone

Cost: 210 Production

Effect: Win Progress Victory.

3.6 Civilizations & Traits

Forge Clans — Hillwrights
Each of your cities gets +1 Production if it works at least one Hills tile.

Scholar Kingdoms — Quiet Study
Each city at Pop 3+ gains +1 Science.

River League — River Larders
Each river-adjacent tile you own gains +1 Food when worked.

3.7 Map Sizes & Generation (v0.6/v0.7 completed)
3.7.1 Map Sizes (Hex)

Small: 16×12

Standard: 20×14

Large: 24×18

3.7.2 Light Generation Recipe

Place Mountains in 2–3 clusters.

Place Coast/Sea along 1–2 edges, with a few inland bays.

Fill remaining land with a bias toward Plains/Forest, and sprinkle Hills/Marsh/Desert.

Add overlays:

Rivers along 8–12 edges (Standard).

Rich Soil / Ore Vein / Sacred Site at low density.

3.7.3 Starting Guarantees

For each player start, the generator must ensure within 2 tiles:

At least one tile with effective ≥2 Food.

At least one tile with effective ≥2 Production.

At least one valid settlement tile within 1 tile.

Starting Settlers must be at least 6 tiles apart (hex distance).
If a start fails guarantees, regenerate that start zone until it passes (max 50 tries, then best-available by site score).

4. Rules Priority (v0.91)

If two rules conflict, resolve by priority:

Victory rules

Combat rules

City/economy rules

Tech/building/project rules

Terrain/feature rules

Reference appendix + glossary

If still unclear, the digital version follows the reference appendix.

5. State Indicators (v0.91)

These are official game states the engine/UI may surface:

Fortified — unit didn’t move or attack last turn (+1 Def).

Garrisoned — unit on a city tile.

Pending Spawn — unit completed but no legal tile; spawns when available.

Capturable City — city HP ≤ 0.

Milestone Complete — a Progress step finished by a civ.

Eliminated — civ has 0 cities at end of round.

6. UI Standards (v0.91)

6.1 Yield & Stat Icons

Food (F): grain icon, green number.

Production (P): hammer/gear icon, orange number.

Science (S): star/book icon, blue number.

HP: red bar.

Defense Strength: shield number on unit/city panel.

6.2 Map Controls (v0.91)

The map view supports interactive navigation:

Centering: The map automatically centers and fits to viewport on load, showing all tiles with appropriate padding.

Panning: Click and drag with the left mouse button to pan the map in any direction.

Zooming: Use the mouse wheel to zoom in and out. Zoom range is 0.5x to 3.0x. Zooming is centered on the mouse cursor position.

Unit Icons: Unit sprites are rendered at 110×110 pixels to be clearly visible within hex tiles (hex size: 75px radius).

6.3 Terminology

Terminology is fixed:

Global Round = all players take one turn.

Planning Phase = builds/tech/tiles selection only.

Action Phase = movement/attacks only.

7. AI / Engine Hooks Appendix (v0.91, non-player)
7.1 City Site Scoring (minimum AI)

Score candidate tile:

CenterYieldValue + best 3 nearby tiles + bonuses.

Yield weights: Food=1, Production=1, Science=1.

Bonus +1 if river city.

Bonus +1 per nearby overlay tile (Rich Soil, Ore Vein, Sacred Site).

7.2 Tile Working Priority

If pursuing Progress: prefer Science → Production → Food.

If pursuing Conquest: prefer Production → Food → Science.

If city Pop is behind curve: prefer Food.

7.3 War / Peace Heuristic

Declare war if enemy city within ~8 tiles AND AI military power ≥ defender power.

Accept peace if losing war OR Progress race risk is high.

7.4 Victory Pursuit Switch

If Observatory milestone complete and capitals not falling quickly → bias to Progress.

If enemy capital in strike range and AI has Armies → bias to Conquest.

7.5 Settler Safety and Escort Rules

**Safety Definition:**
A settler is considered "safe" if:
- It is within friendly city borders (2 rings from any owned city), AND
- No enemy units (with whom the player is at war) are visible within 3 tiles

**Escort Requirement:**
An AI settler should use an escort if:
- The settler must travel through non-friendly territory, OR  
- Enemy units are visible within 5 tiles of the planned settlement path

**Escort Assignment:**
- Prioritize nearby military units that are not actively engaged in combat
- The escort should move with the settler toward the target site
- Once the settler founds a city or reaches safety, the escort may be reassigned

