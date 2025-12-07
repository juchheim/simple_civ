# Implementation Status - v2.0 codebase

Last Updated: 2025-12-07

## ✅ Implemented
- Core turn loop with unit movement/combat (melee/ranged with **v2.0 Civ 6-style damage formula and melee return damage**), city production/growth/healing/fortify, city capture & raze, territory claim (radius 2), and worked-tile assignment UI.
- Tech tree flow (era gates, prereqs), research accumulation, build gating for units/buildings/projects.
- Progress/Conquest victory checks at end of round; elimination removes a civ’s units when cityless.
- Fog of war (per-player visibility + revealed), shroud rendering/legend toggle in UI.
- Diplomacy: war/peace state, auto-war on attacks/captures, peace offers/acceptance, and a mutual vision-sharing pact (peace gated).
- UI: Game map with visibility shading, HUD for city/unit/diplomacy controls, TechTree modal, manual tile assignment, city ranged attack & raze controls.
- Map size selection (Tiny, Small, Standard, Large, Huge) with constraints on number of civilizations.
- Number of civilizations selection (2-4) with map size constraints enforced.
- Unique city names: each civ has 20 thematic names, capital is fixed, subsequent names are random and unique.
- Unit linking: players can link two units on the same hex for synchronized movement, with automatic unlinking on separation.
- **AI & War Escalation**:
    - Full AI implementation: City founding, tile evaluation, economy management, and tech progression.
    - **War Escalation**: AI aggression scales with time; "Bloodthirsty" mode in late game (Turn 50+) refuses peace.
    - **Tactical Combat**: AI uses "Smart Buildup" for war prep, coordinates attacks, and uses "Clear the Way" tactics for city capture.
    - **Diplomacy**: AI respects peace durations but can bypass them if overwhelming (Domination Bypass).
- **End Game Experience**:
    - **History Replay**: Interactive map scrubbing showing turn-by-turn expansion, fog reveals, and key events (Cities founded, Battles, etc.) with responsive SVG rendering.
    - **Statistics**: Detailed line charts tracking Score, Science, Production, Military, and Territory over the course of the game.
    - **Visuals**: Polished Victory/Defeat screens with dynamic backgrounds based on the winning Era/Civilization.
    - **Engine History**: Efficient delta-compressed history tracking for minimal memory footprint.
- **Balance Adjustments (v1.0)**:
    - **Starborne Seekers**: Nerfed Spirit Observatory (Cost 300). Removed Sacred Site Science Bonus. Restored starting SpearGuard.
    - **River League**: Buffed river bonus to +1 Production per 2 river tiles (was 1/3). Buffed River Guardians to +2 Defense near rivers. Auto-assigner prioritizes river tiles.
    - **Jade Covenant**: Buffed Settlers (10 HP, 3 Movement). Added "Jade Granary" unique building (Hearth Era, Cost 30, +1 Pop/Food, Spawns Free Settler). Added "Nature's Wrath" (1 HP Attrition to enemies in territory). AI aggressively expands (2-tile density) and pivots to victory earlier. Stops settling in late-game wars.
    - **Aetherian Vanguard**: Titans ignore terrain movement costs. **Battle Hardened** perk buffed to +2 HP/era (max +6). **Scavenger Doctrine**: Science on Kill.
    - **AI Logic**: Improved victory condition pursuit. Aggression scales on Standard+ maps to encourage conquest.
- **Combat Overhaul (v2.0)**:
    - **Civ 6-style Damage Formula**: `Damage = 5 × e^(StrengthDiff / 25) × RandomMult`, clamped [1, 15]. Replaces old linear formula.
    - **Melee Return Damage**: When a melee unit attacks and the defender survives, the defender counter-attacks using the same formula. Ranged units do NOT take return damage.
    - **Titan Regeneration**: Location-based healing (1 HP/turn in enemy territory, 3 HP/turn in friendly territory, 5 HP/turn in friendly city). Titan stats: 30 ATK, 8 DEF, 30 HP.
    - **City Retaliation**: Uses unified Civ 6 damage formula for garrison retaliation.

## 🔧 Partially Implemented
- Map generation: coast-biased edges, terrain variation, mountain clusters, river overlays with edge list, and best-fit start selection (≥6 spacing, nearby food/prod), but no mapGenParams tunables, advanced smoothing, or true edge-driven river gen.
- Diplomacy contact rules: contact is tracked on sight and gates diplomacy actions, but diplomacy tables still default to Peace and there is no contact-establishment notification.
- Map/engine types diverge from dev-spec (tile overlays vs features+rivers edge graph).
- Multiplayer: hotseat only; networking/server exists but not wired to client.

## ❌ Missing/Not Yet Implemented

- Save/Load beyond local browser storage (no persistence service).
- Embark/naval-transport rules, Great People, districts, additional unit/building content beyond v0.9 core list.
- Dev-spec helper modules (cities/states/ai) are not present; logic lives in turn-loop.

## 🎮 Current Gameplay Notes
- Start: each civ gets Settler + Scout (Aetherian +1 SpearGuard); no start-quality guarantees, spacing is loose (~4 hex min in code). Choose map size (Tiny to Huge) and number of civilizations (2-4).
- Civilizations: Forge Clans, Scholar Kingdoms, River League, The Aetherian Vanguard, Starborne Seekers, and Jade Covenant.
- Play: move/attack, found cities, build units/buildings/projects, research techs, manage worked tiles, city ranged attack (range 2), offer/accept peace or vision sharing.
- Limitations: no LoS blocking, no save/load, contact always active, map quality/generator is basic, no naval embark rules.
