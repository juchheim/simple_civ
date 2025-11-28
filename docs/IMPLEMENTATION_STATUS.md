# Implementation Status - v0.98 codebase

Last Updated: 2025-11-24

## ✅ Implemented
- Core turn loop with unit movement/combat (melee/ranged), city production/growth/healing/fortify, city capture & raze, territory claim (radius 2), and worked-tile assignment UI.
- Tech tree flow (era gates, prereqs), research accumulation, build gating for units/buildings/projects.
- Progress/Conquest victory checks at end of round; elimination removes a civ’s units when cityless.
- Fog of war (per-player visibility + revealed), shroud rendering/legend toggle in UI.
- Diplomacy: war/peace state, auto-war on attacks/captures, peace offers/acceptance, and a mutual vision-sharing pact (peace gated).
- UI: Game map with visibility shading, HUD for city/unit/diplomacy controls, TechTree modal, manual tile assignment, city ranged attack & raze controls.
- Map size selection (Tiny, Small, Standard, Large, Huge) with constraints on number of civilizations.
- Number of civilizations selection (2-4) with map size constraints enforced.
- Unique city names: each civ has 20 thematic names, capital is fixed, subsequent names are random and unique.
- Unit linking: players can link two units on the same hex for synchronized movement, with automatic unlinking on separation.
- AI heuristics/personality: Full implementation including city site scoring, war/peace decisions, victory bias switching, and civ-specific personalities.

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
- Start: each civ gets Settler + Scout; no start-quality guarantees, spacing is loose (~4 hex min in code). Choose map size (Tiny to Huge) and number of civilizations (2-4).
- Civilizations: Forge Clans, Scholar Kingdoms, River League, and The Aetherian Vanguard (with unique Titan's Core wonder).
- Play: move/attack, found cities, build units/buildings/projects, research techs, manage worked tiles, city ranged attack (range 2), offer/accept peace or vision sharing.
- Limitations: no LoS blocking, no AI, no save/load, contact always active, map quality/generator is basic, no naval embark rules.
