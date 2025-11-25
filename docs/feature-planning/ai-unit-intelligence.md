# AI Unit Intelligence Plan

## Current unit decision rules (today)
- Turn order: after goal/tech/city choices, the AI runs `moveSettlersAndFound` → `manageSettlerEscorts` → diplomacy → `attackTargets` → `moveMilitaryTowardTargets` (`engine/src/game/ai/turn-runner.ts`).
- Settlers: flee if a war enemy is within 3 tiles (step to the farthest neighbor), found if the current tile scores best vs adjacent, otherwise search radius 8 for the highest `scoreCitySite` and step toward it, retry founding after moving.
- Settler safety/escorts: "safe" = inside friendly ring-2 borders with no war enemy within 3; "needs escort" if outside borders or any war enemy within 5. Assign nearest non-civilian with moves left; escorts only walk toward the settler until within 2 tiles.
- Attacks: for each non-settler unit, if it has not attacked, fire at the lowest-HP enemy city in range, else the nearest enemy unit in range. Immediately attempt city capture if an adjacent enemy city is at 0 HP.
- War movement: when at war, every non-civilian steps toward the nearest enemy city, retrying up to 3 steps per unit while moves remain. Movement is greedy by distance only (no pathfinding or terrain/domain awareness); capture checks run before each move.

## Problem situations and solutions
1) Fragile attacks: units launch into bad-odds fights because targeting ignores damage trades and counterattacks.  
   - Solution: add a combat evaluation step (expected damage to target vs self after counter) and require a minimum favorable ratio before attacking; fallback to hold/heal if no safe attack exists.
2) No healing or regroup: damaged units keep advancing and die instead of recovering.  
   - Solution: introduce a retreat/fortify rule when HP falls below a threshold (e.g., <40%); step toward the nearest friendly city or stop on defensible terrain to heal before rejoining.
3) Pathfinding stalls: greedy step-to-nearest-city fails when rivers/coasts/mountains block a straight line or when naval/land domains mismatch.  
   - Solution: add domain-aware shortest-path search (cost = move cost, block impassable/occupied) with a limited depth; if unreachable, retarget to the next closest enemy city or enemy unit.
4) Idle peace-time scouts: outside war, scouts never move, so fog stays thick and start sites/targets remain unknown.  
   - Solution: add an exploration pass for scouts during peace: pick farthest fogged coordinate or unseen resource ring and walk via pathfinder; pause if a war triggers.
5) Siege focus drift: attackers split damage across multiple cities/units, slowing captures.  
   - Solution: add focus-fire queues: pick one primary war city and concentrate ranged/melee attacks on it until taken; prefer finishing blows on low-HP cities/units within reach before new engagements.
6) No defensive response: AI keeps marching outward even when enemies threaten its own cities.  
   - Solution: insert a defensive check before war movement: if an enemy is within 3–4 tiles of any friendly city, redirect nearby units to intercept or garrison, overriding offensive marching until the threat is cleared.
7) Settler escort drift: escorts only close distance to the settler but do not co-move along the chosen path, leaving settlers exposed on long trips.  
   - Solution: pair escorts to settlers with a shared path to the target site; move the escort first along the path, then move the settler into the escort's screened tile. Re-evaluate safety each turn and reassign if the escort dies.
8) Capture opportunities missed: units only attempt capture on adjacent 0-HP cities and otherwise march past critical targets.  
   - Solution: add a capture pass that routes the nearest capture-capable unit to any 0-HP enemy city in vision, even if slightly off the primary path; prioritize cities with garrisons destroyed over fresh targets.
9) Domain misuse for naval: River Boats currently follow the same land-centric logic, so they may stop at coastlines or ignore naval choke points.  
   - Solution: split naval targeting into a coastal-city list and naval patrol routes; ensure naval units only path through Coast/Sea tiles and prefer shoreline cities or exposed land units adjacent to water.
10) Stacking and blocking: greedy movement can clog narrow tiles and leave ranged units on front lines.  
   - Solution: add lightweight formation rules: let melee move first, reserve safe tiles for ranged (keep at max range when possible), and allow unit swapping (move + move back) to unjam chokepoints when paths are blocked.

## Additional situations (peace/defense focus)
11) Peace-time aimlessness: when not at war, military units idle and waste turns.  
    - Solution: add a peace posture: explore fog with scouts, park melee/ranged on high-defense tiles within 2–3 of cities, and patrol borders (looping paths) to maintain vision while avoiding neutral encroachment on far-flung tiles.
12) Avoiding unwanted wars: an AI that prefers peace (or is losing) should not provoke.  
    - Solution: add a stance flag (e.g., Defensive/Builder) that suppresses border poking—keep units inside own territory unless escorting settlers, avoid ending turns adjacent to neutral borders, and only declare if war heuristic is strongly favorable or a city is threatened.
13) City protection in peace: cities without garrisons are free kills if war begins.  
    - Solution: maintain a minimum garrison: always keep at least one unit (any domain that can garrison) in each city; if empty, assign the nearest available unit to move in and stay unless an escort or counter-raid temporarily pulls it out.
14) City protection in war: garrisons keep cities firing and add capture blockers.  
    - Solution: prioritize filling empty city tiles with a fresh or defensive unit before marching to offense; if a city is under threat (enemy within 3–4), pull a nearby unit to garrison first, then counterattack from adjacent safe tiles.
15) Front-line rotation: wounded units sit on cities or choke points and die, turning off city attacks.  
    - Solution: add rotation: if a garrison or front-line unit drops below a threshold, swap with a healthier backup from 1–2 tiles behind before the turn ends, to keep the city attack active and preserve units.
16) Post-siege consolidation: after taking a city, units keep sprinting forward leaving the new city exposed.  
    - Solution: on capture, auto-garrison with the capturing unit or the nearest healthy defender, and leave at least one extra unit within 2 tiles until the city heals above a safety threshold; only then resume offense.
17) Non-war production alignment: peace-focused civs may still overbuild military and stall growth.  
    - Solution: if stance is Defensive/Builder and no active wars, cap standing army size by population or upkeep-free threshold, bias production toward economy buildings/projects, and disband or park surplus units instead of spamming more.
