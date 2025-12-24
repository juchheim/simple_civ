import { DiplomacyState, GameState, Unit, UnitType, BuildingType, TechId } from "../../core/types.js";
import { hexDistance, hexEquals, getNeighbors, hexToString } from "../../core/hex.js";
import { UNITS } from "../../core/constants.js";
import { findPath } from "../helpers/pathfinding.js";
import { LookupCache, buildLookupCache } from "../helpers/lookup-cache.js";
import { tryAction } from "../ai/shared/actions.js";
import { getCombatPreviewUnitVsCity, getCombatPreviewUnitVsUnit } from "../helpers/combat-preview.js";
import { getAiMemoryV2, setAiMemoryV2 } from "./memory.js";
import { getAiProfileV2 } from "./rules.js";
import { selectFocusTargetV2 } from "./strategy.js";
import { pickBest } from "./util.js";
import { aiInfo } from "../ai/debug-logging.js";
// Multi-threat awareness from Legacy
import { countThreatsToTile, getBestSkirmishPosition } from "../ai/units/movement-safety.js";
import { getThreatLevel } from "../ai/units/unit-helpers.js";
// Battle group coordination from Legacy
import { identifyBattleGroups, coordinateGroupAttack } from "../ai/units/battle-groups.js";
// Aid vulnerable units and post-attack repositioning from Legacy
import { aidVulnerableUnits, repositionRanged } from "../ai/units/defense.js";
// Level 4: Army Phase State Machine
import { updateArmyPhase, allowOpportunityKill } from "./army-phase.js";
// Level 1A/1B: Attack Order Optimization and Move-Then-Attack
import { planAttackOrderV2, executeAttack, updateTacticalFocus, planMoveAndAttack, executeMoveAttack } from "./attack-order.js";
// Level 3: Wait Decision Filter
import { filterAttacksWithWaitDecision } from "./wait-decision.js";

function isMilitary(u: Unit): boolean {
    return UNITS[u.type].domain !== "Civilian" && u.type !== UnitType.Scout && u.type !== UnitType.ArmyScout;
}

function isCapturer(u: Unit): boolean {
    return u.type === UnitType.SpearGuard || u.type === UnitType.ArmySpearGuard || u.type === UnitType.Titan;
}

function isSiege(u: Unit): boolean {
    return u.type === UnitType.BowGuard || u.type === UnitType.ArmyBowGuard;
}

function isRider(u: Unit): boolean {
    return u.type === UnitType.Riders || u.type === UnitType.ArmyRiders;
}

function isRanged(u: Unit): boolean {
    return UNITS[u.type].rng > 1;
}

function hasReadyCapturerAdjacent(state: GameState, playerId: string, cityCoord: { q: number; r: number }): boolean {
    return state.units.some(u =>
        u.ownerId === playerId &&
        isMilitary(u) &&
        UNITS[u.type].canCaptureCity &&
        u.movesLeft > 0 &&
        hexDistance(u.coord, cityCoord) === 1
    );
}

function pickApproachTile(state: GameState, playerId: string, unit: Unit, cityCoord: { q: number; r: number }, cache?: LookupCache): { q: number; r: number } {
    // Pick an adjacent tile to the city that we can approach without stacking with friendly military.
    const neigh = getNeighbors(cityCoord);
    let best = neigh[0] ?? cityCoord;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const n of neigh) {
        // Avoid any occupied tile (friendly or enemy); movement/capture needs clean adjacency.
        const nKey = hexToString(n);
        const occupied = cache ? cache.unitByCoordKey.has(nKey) : state.units.some(u => hexEquals(u.coord, n));
        if (occupied) continue;
        const score = hexDistance(unit.coord, n);
        // Ensure it is actually reachable under current diplomacy/path rules.
        const path = findPath(unit.coord, n, unit, state, cache);
        if (path.length === 0) continue;
        if (score < bestScore) {
            bestScore = score;
            best = n;
        }
    }
    return best;
}

function routeCityCapturesV2(state: GameState, playerId: string): GameState {
    let next = state;
    const capturable = next.cities.filter(c => c.ownerId !== playerId && c.hp <= 0);
    if (capturable.length === 0) return next;

    // v1.1: Build set of city coordinates for garrison protection
    const myCityCoords = new Set(
        next.cities.filter(c => c.ownerId === playerId).map(c => `${c.coord.q},${c.coord.r}`)
    );

    const captureUnits = next.units
        .filter(u => u.ownerId === playerId && u.movesLeft > 0 && isMilitary(u) && UNITS[u.type].canCaptureCity &&
            !myCityCoords.has(`${u.coord.q},${u.coord.r}`)) // Don't pull garrisoned units
        .sort((a, b) => (b.type === UnitType.Titan ? 1 : 0) - (a.type === UnitType.Titan ? 1 : 0)); // prefer non-Titan first

    const assigned = new Set<string>();
    for (const city of capturable) {
        const candidates = captureUnits.filter(u => !assigned.has(u.id));
        if (candidates.length === 0) break;
        const best = pickBest(candidates, u => -hexDistance(u.coord, city.coord));
        const unit = best?.item;
        if (!unit) continue;
        // Don't try to move onto the city tile (garrison can block); move to an approach tile (adjacent),
        // then capture via Attack (handled by bestAttackForUnit).
        const live = next.units.find(u => u.id === unit.id);
        if (!live) continue;
        // Build cache for pathfinding-heavy pickApproachTile (6+ findPath calls)
        const cache = buildLookupCache(next);
        const approach = pickApproachTile(next, playerId, live, city.coord, cache);
        const before = next;
        next = moveTowardAllMoves(next, playerId, unit.id, approach, 8);
        if (next !== before) assigned.add(unit.id);
    }
    return next;
}

function pickRallyCoord(state: GameState, target: { q: number; r: number }, desiredDist: number): { q: number; r: number } {
    // Pick a rally ring coord around the target that is reasonably close to our side.
    // (Bounded scan for performance.)
    let best = target;
    let bestScore = Number.POSITIVE_INFINITY;
    let scanned = 0;
    for (const t of state.map.tiles) {
        if (scanned++ > 900) break;
        const d = hexDistance(t.coord, target);
        if (d !== desiredDist) continue;
        // Prefer tiles that are not occupied by enemy city and are generally reachable.
        const score = Math.abs(t.coord.q - target.q) + Math.abs(t.coord.r - target.r);
        if (score < bestScore) {
            bestScore = score;
            best = t.coord;
        }
    }
    return best;
}

function pickRingCoordForUnit(
    state: GameState,
    playerId: string,
    unit: Unit,
    target: { q: number; r: number },
    desiredDist: number,
    scanLimit = 1000,
    cache?: LookupCache
): { q: number; r: number } {
    // Pick a coord at an exact distance ring around `target`, biased toward being reachable from `unit`,
    // and avoiding friendly military stacking.
    const candidates: { coord: { q: number; r: number }; score: number }[] = [];
    let scanned = 0;
    for (const t of state.map.tiles) {
        if (scanned++ > scanLimit) break;
        if (hexDistance(t.coord, target) !== desiredDist) continue;
        const tKey = hexToString(t.coord);
        const occupied = cache ? cache.unitByCoordKey.has(tKey) : state.units.some(u => hexEquals(u.coord, t.coord));
        if (occupied) continue;
        const score = hexDistance(unit.coord, t.coord);
        candidates.push({ coord: t.coord, score });
    }
    candidates.sort((a, b) => a.score - b.score);
    for (const c of candidates.slice(0, 30)) {
        const path = findPath(unit.coord, c.coord, unit, state, cache);
        if (path.length > 0) return c.coord;
    }
    return target;
}

function runFocusSiegeAndCapture(state: GameState, playerId: string): GameState {
    let next = state;
    const enemies = warEnemyIds(next, playerId);
    if (enemies.size === 0) return next;

    const mem = getAiMemoryV2(next, playerId);
    const focusCity = mem.focusCityId ? next.cities.find(c => c.id === mem.focusCityId) : undefined;
    if (!focusCity || !enemies.has(focusCity.ownerId)) return next;

    // City attack range is 2; stage at 3 so units can step in to attack/capture quickly.
    const rally = pickRallyCoord(next, focusCity.coord, 3);

    const units = next.units
        .filter(u => u.ownerId === playerId && u.movesLeft > 0 && isMilitary(u))
        .filter(u => u.type !== UnitType.Titan) // Titan handled separately
        .filter(u => !u.isTitanEscort) // v6.6h: Reserved escorts stay with Titan
        .filter(u => {
            // FIX #7: Do not pull garrisons from Threatened cities.
            // If unit is on a city tile, and that city is threatened, exclude it from offensive routing.
            const city = next.cities.find(c => hexEquals(c.coord, u.coord));
            if (city && city.ownerId === playerId) {
                // FIX #7: Garrisoned units cannot attack. Do not use them for offensive grouping logic
                // if they are likely to try interacting aggressively.
                // Actually, simpler: if they are in a city, they count as defenders/garrisons.
                // EXCLUDE them from the offensive 'units' pool entirely so runFocusSiegeAndCapture
                // doesn't try to path them around or order them to attack.
                return false;
            }
            return true;
        });

    const capturers = units.filter(isCapturer);
    const siege = units.filter(isSiege);
    const riders = units.filter(isRider);
    const others = units.filter(u => !isCapturer(u) && !isSiege(u) && !isRider(u));

    // 1) Siege units: get to range 2 and shoot the focus city (do not stand adjacent).
    for (const u of siege) {
        const live = next.units.find(x => x.id === u.id);
        if (!live || live.movesLeft <= 0) continue;
        const dist = hexDistance(live.coord, focusCity.coord);
        if (dist <= 2) continue; // close enough, attack pass will prefer city now
        // Build cache for pathfinding-heavy pickRingCoordForUnit (30+ findPath calls)
        const cache = buildLookupCache(next);
        const siegeRing = pickRingCoordForUnit(next, playerId, live, focusCity.coord, 2, 1200, cache);
        next = moveToward(next, playerId, live, siegeRing);
    }

    // 2) Capturers: stay staged until the city is low, then move in and capture.
    for (const u of capturers) {
        const live = next.units.find(x => x.id === u.id);
        if (!live || live.movesLeft <= 0) continue;
        const dist = hexDistance(live.coord, focusCity.coord);

        // If adjacent, stop (attack pass will handle capture attempts).
        if (dist === 1) continue;

        // If city is already at/under 0 (somehow) rush capture.
        if (focusCity.hp <= 0) {
            next = moveToward(next, playerId, live, focusCity.coord);
            continue;
        }

        // FIX #3: Route capturers to cities under ACTIVE SIEGE (not just 0 HP).
        // If city is below 85% HP (was 60%), it's being bombarded - get capturers in position NOW.
        // FIXv7.5: Swarm Logic - attack sooner
        const hpPercent = focusCity.maxHp ? focusCity.hp / focusCity.maxHp : 1;
        const isUnderSiege = hpPercent <= 0.85;

        // FIX #4: MELEE ASSAULT
        // If we have no siege units, we MUST attack with melee or we stall forever.
        // Also if we have overwhelming numbers (2+ capturers), just swarm.
        const noSiegeSupport = siege.length === 0;
        const overwhelmingForce = capturers.length >= 2; // Reduced from 3
        const shouldAssault = isUnderSiege || noSiegeSupport || overwhelmingForce;

        // Once the city is low, under siege, or it's a capital, step onto an approach tile so we can capture immediately when it hits 0.
        if (focusCity.isCapital || focusCity.hp <= 12 || shouldAssault) {
            const approach = pickApproachTile(next, playerId, live, focusCity.coord);
            next = moveToward(next, playerId, live, approach);
        } else {
            // Otherwise stage at rally until siege has softened it.
            next = moveToward(next, playerId, live, rally);
        }
    }

    // 3) Riders: never outrun—keep them within 2 tiles of the nearest capturer/siege.
    const anchorUnits = [...capturers, ...siege].map(u => next.units.find(x => x.id === u.id)).filter(Boolean) as Unit[];
    for (const u of riders) {
        const live = next.units.find(x => x.id === u.id);
        if (!live || live.movesLeft <= 0) continue;
        const nearestAnchorDist = anchorUnits.length
            ? Math.min(...anchorUnits.map(a => hexDistance(a.coord, live.coord)))
            : 0;
        if (nearestAnchorDist > 2) {
            // Move only one step toward rally (single-step pacing)
            next = moveToward(next, playerId, live, rally);
        }
    }

    // 4) Others: follow to rally.
    for (const u of others) {
        const live = next.units.find(x => x.id === u.id);
        if (!live || live.movesLeft <= 0) continue;
        next = moveToward(next, playerId, live, rally);
    }

    return next;
}

function warEnemyIds(state: GameState, playerId: string): Set<string> {
    const ids = new Set<string>();
    for (const p of state.players) {
        if (p.id === playerId || p.isEliminated) continue;
        if (state.diplomacy?.[playerId]?.[p.id] === "War") ids.add(p.id);
    }
    return ids;
}

function cityValue(state: GameState, playerId: string, city: any): number {
    const profile = getAiProfileV2(state, playerId);
    let v = 20;

    // v7.2: RECAPTURE PRIORITY (Item 4)
    // originalOwnerId tracks who founded the city. If it was ours and someone else owns it, we NEED it back.
    if (city.originalOwnerId === playerId && city.ownerId !== playerId) {
        v += 500; // High priority - recapture lost cities
        // Capital loss should trigger URGENT recapture priority
        if (city.isCapital) v += 1000;
    }

    // v7.2: CAPTURED CAPITAL PRIORITY (Item 5)
    // If we own an enemy capital, prioritize its development/defense (higher value)
    if (city.isCapital && city.ownerId === playerId && city.originalOwnerId !== playerId) {
        v += 100; // Value enemy capitals highly
    }

    if (city.isCapital) v += 35 * profile.titan.capitalHunt;
    const hpFrac = city.maxHp ? city.hp / city.maxHp : 1;
    v += (1 - hpFrac) * 18 * profile.titan.finisher;
    if (city.hp <= 0) v += 40;
    return v;
}

function unitValue(u: Unit): number {
    if (String(u.type).startsWith("Army")) return 18;
    if (u.type === UnitType.Titan) return 50;
    if (u.type === UnitType.Riders) return 12;
    if (u.type === UnitType.BowGuard) return 11;
    if (u.type === UnitType.SpearGuard) return 10;
    if (u.type === UnitType.Scout || u.type === UnitType.ArmyScout) return 4;
    if (u.type === UnitType.Settler) return 30;
    return 8;
}

function attackScoreVsUnit(state: GameState, playerId: string, attacker: Unit, defender: Unit): number {
    const profile = getAiProfileV2(state, playerId);
    const preview = getCombatPreviewUnitVsUnit(state, attacker, defender);
    const dmg = preview.estimatedDamage.avg;
    const ret = preview.returnDamage?.avg ?? 0;
    const kill = dmg >= defender.hp ? 1 : 0;
    const suicide = ret >= attacker.hp ? 1 : 0;

    const base = dmg * 2 + kill * (40 + unitValue(defender) * 2);
    const riskPenalty = (ret * 1.7) * (1 - profile.tactics.riskTolerance);
    const suicidePenalty = suicide ? 200 : 0;

    // Multi-threat awareness: check OTHER enemies that can attack this position after the attack
    const attackerStats = UNITS[attacker.type];
    const attackPosition = attackerStats.rng > 1 ? attacker.coord : defender.coord; // melee moves to target
    const threats = countThreatsToTile(state, playerId, attackPosition, defender.id);

    // Penalize attacks that leave us exposed to multiple counter-attacks
    let exposurePenalty = 0;
    if (threats.count >= 2) {
        exposurePenalty = (threats.totalDamage * 0.8) * (1 - profile.tactics.riskTolerance);
    }
    if (threats.count >= 3 && !kill) {
        exposurePenalty += 80; // Heavy penalty for getting surrounded without securing a kill
    }

    return base - riskPenalty - suicidePenalty - exposurePenalty;
}

function attackScoreVsCity(state: GameState, playerId: string, attacker: Unit, city: any): number {
    const profile = getAiProfileV2(state, playerId);
    const preview = getCombatPreviewUnitVsCity(state, attacker, city);
    const dmg = preview.estimatedDamage.avg;
    const ret = preview.returnDamage?.avg ?? 0;

    const wouldDropToZero = city.hp - dmg <= 0;
    const canCaptureNow = wouldDropToZero && UNITS[attacker.type].canCaptureCity && hexDistance(attacker.coord, city.coord) === 1;
    const attackerCanCapture = !!UNITS[attacker.type].canCaptureCity;
    const followUpCapture = hasReadyCapturerAdjacent(state, playerId, city.coord);

    const base = dmg * 2.5 + cityValue(state, playerId, city);
    const captureBonus = canCaptureNow ? 420 : 0;
    let riskPenalty = (ret * 1.8) * (1 - profile.tactics.riskTolerance);
    const capitalBonus = city.isCapital ? 180 : 0;

    // Capital assaults must be less risk-averse, otherwise capitals never fall and we stall to turn limit.
    if (city.isCapital) {
        riskPenalty *= 0.6;
        if (canCaptureNow) riskPenalty *= 0.2;
    }

    // Critical anti-stall rule:
    // If a non-capturer (or a capturer not currently adjacent) would reduce a city to 0,
    // penalize unless we have an immediate adjacent capturer ready to step in this turn.
    // This prevents bowguards from "sniping" cities to 0 and leaving them uncaptured for many turns.
    let lethalNoCapturePenalty = 0;
    if (wouldDropToZero && !canCaptureNow && !followUpCapture) {
        lethalNoCapturePenalty = attackerCanCapture ? 350 : 800;
    }

    return base + captureBonus + capitalBonus - riskPenalty - lethalNoCapturePenalty;
}

function bestAttackForUnit(state: GameState, playerId: string, unit: Unit): { action: any; score: number } | null {
    // v5.13 FIX: Garrisoned units cannot attack (engine rule).
    // Validate this early to prevent "Action Failed" loops and pathing stalls.
    // (Settlers are exempt from this rule in the engine, but they don't attack anyway)
    // v5.13 FIX: Garrisoned units cannot attack (engine rule).
    // Validate this early to prevent "Action Failed" loops and pathing stalls.
    // (Settlers are exempt from this rule in the engine, but they don't attack anyway)
    const cityAtLoc = state.cities.find(c => hexEquals(c.coord, unit.coord));
    if (cityAtLoc && cityAtLoc.ownerId === playerId && unit.type !== UnitType.Settler) {
        return null; // Strict block
    }

    const enemies = warEnemyIds(state, playerId);
    if (enemies.size === 0) return null;
    const rng = UNITS[unit.type].rng;
    const mem = getAiMemoryV2(state, playerId);
    const focusCity = mem.focusCityId ? state.cities.find(c => c.id === mem.focusCityId) : undefined;
    const focusEnemy = focusCity && enemies.has(focusCity.ownerId) ? focusCity : undefined;

    // Capture NOW if adjacent to a 0-HP enemy city (legacy captureIfPossible behavior).
    if (UNITS[unit.type].canCaptureCity) {
        const adjZero = state.cities.find(c =>
            enemies.has(c.ownerId) &&
            c.hp <= 0 &&
            hexDistance(unit.coord, c.coord) === 1
        );
        if (adjZero) {
            return {
                action: { type: "Attack", playerId, attackerId: unit.id, targetType: "City", targetId: adjZero.id },
                score: 999999,
            };
        }
    }

    // Include native units (they have campId but aren't player-owned enemies)
    const nativeUnits = state.units
        .filter(u => u.campId && u.ownerId !== playerId) // Natives have campId
        .filter(u => hexDistance(unit.coord, u.coord) <= rng)
        .map(u => ({
            kind: "Unit" as const,
            target: u,
            score: attackScoreVsUnit(state, playerId, unit, u) * 0.8, // Slight deprioritization vs player enemies
        }));

    const unitTargets = state.units
        .filter(u => enemies.has(u.ownerId))
        .filter(u => hexDistance(unit.coord, u.coord) <= rng)
        .map(u => ({
            kind: "Unit" as const,
            target: u,
            score: attackScoreVsUnit(state, playerId, unit, u),
        }));

    const cityTargets = state.cities
        .filter(c => enemies.has(c.ownerId))
        .filter(c => hexDistance(unit.coord, c.coord) <= rng)
        .map(c => ({
            kind: "City" as const,
            target: c,
            score: (() => {
                let s = attackScoreVsCity(state, playerId, unit, c);
                // Siege priority: push the focus city hard so wars actually convert into captures.
                if (focusEnemy && c.id === focusEnemy.id) {
                    if (UNITS[unit.type].canCaptureCity) s += 200;
                    if (UNITS[unit.type].rng > 1) s += 220;
                    if (unit.type === UnitType.Titan) s += 350;
                }
                return s;
            })(),
        }));

    const best = pickBest([...unitTargets, ...nativeUnits, ...cityTargets], t => t.score);
    if (!best) return null;

    const tgt = best.item;
    if (tgt.kind === "Unit") {
        return { action: { type: "Attack", playerId, attackerId: unit.id, targetType: "Unit", targetId: tgt.target.id }, score: tgt.score };
    }
    return { action: { type: "Attack", playerId, attackerId: unit.id, targetType: "City", targetId: tgt.target.id }, score: tgt.score };
}

function moveToward(state: GameState, playerId: string, unit: Unit, dest: { q: number; r: number }, cache?: LookupCache): GameState {
    const path = findPath(unit.coord, dest, unit, state, cache);
    if (path.length === 0) return state;
    const step = path[0];

    const stepKey = hexToString(step);
    const unitAtStep = cache ? cache.unitByCoordKey.get(stepKey) : state.units.find(u => hexEquals(u.coord, step));
    const occupiedFriendlyMil = unitAtStep && unitAtStep.id !== unit.id && unitAtStep.ownerId === playerId && isMilitary(unitAtStep);

    if (occupiedFriendlyMil) {
        const curDist = hexDistance(unit.coord, dest);
        const candidates = getNeighbors(unit.coord)
            .filter(n => hexDistance(n, dest) < curDist)
            .filter(n => {
                const nKey = hexToString(n);
                const uAtN = cache ? cache.unitByCoordKey.get(nKey) : state.units.find(u => hexEquals(u.coord, n));
                return !(uAtN && uAtN.ownerId === playerId && isMilitary(uAtN));
            })
            .sort((a, b) => hexDistance(a, dest) - hexDistance(b, dest));
        for (const alt of candidates) {
            const movedAlt = tryAction(state, { type: "MoveUnit", playerId, unitId: unit.id, to: alt });
            if (movedAlt !== state) return movedAlt;
        }
        return state;
    }

    return tryAction(state, { type: "MoveUnit", playerId, unitId: unit.id, to: step });
}

function moveTowardAllMoves(state: GameState, playerId: string, unitId: string, dest: { q: number; r: number }, maxSteps = 6, cache?: LookupCache): GameState {
    let next = state;
    let steps = 0;
    while (steps++ < maxSteps) {
        const unit = next.units.find(u => u.id === unitId);
        if (!unit || unit.movesLeft <= 0) return next;
        if (hexDistance(unit.coord, dest) === 0) return next;
        const before = next;
        // Note: can't reuse cache after state mutation (tryAction creates new state)
        next = moveToward(next, playerId, unit, dest);
        if (next === before) return next;
    }
    return next;
}

function findEngagementPath(start: { q: number; r: number }, target: { q: number; r: number }, unit: Unit, state: GameState, cache?: LookupCache): { q: number; r: number }[] | null {
    const direct = findPath(start, target, unit, state, cache);
    if (direct && direct.length > 0) return direct;
    const neighbors = getNeighbors(target).sort((a, b) => hexDistance(a, start) - hexDistance(b, start));
    for (const n of neighbors) {
        if (hexEquals(n, start)) return [];
        const path = findPath(start, n, unit, state, cache);
        if (path && path.length > 0) return path;
    }
    return null;
}

function nearestFriendlyCity(state: GameState, playerId: string, from: { q: number; r: number }): { q: number; r: number } | null {
    const cities = state.cities.filter(c => c.ownerId === playerId);
    if (cities.length === 0) return null;
    let best = cities[0]!.coord;
    let bestDist = hexDistance(from, best);
    for (const c of cities) {
        const d = hexDistance(from, c.coord);
        if (d < bestDist) {
            bestDist = d;
            best = c.coord;
        }
    }
    return best;
}

function retreatIfNeeded(state: GameState, playerId: string, unit: Unit): GameState {
    const profile = getAiProfileV2(state, playerId);
    if (!isMilitary(unit)) return state;
    const hpFrac = unit.maxHp ? unit.hp / unit.maxHp : (unit.hp / UNITS[unit.type].hp);

    // FIX #5: Reduce retreat threshold during active sieges.
    // Units should stay in the fight when we're close to capturing a city.
    const mem = getAiMemoryV2(state, playerId);
    const focusCity = mem.focusCityId ? state.cities.find(c => c.id === mem.focusCityId) : undefined;
    const inActiveSiege = focusCity && focusCity.ownerId !== playerId && hexDistance(unit.coord, focusCity.coord) <= 4;

    // FINAL TUNING: During sieges OR active wars, units are 70% less likely to retreat (effectively halves the HP threshold).
    const atWar = state.players.some(p => p.id !== playerId && !p.isEliminated && state.diplomacy?.[playerId]?.[p.id] === "War"); const effectiveRetreatFrac = (inActiveSiege || atWar)
        ? profile.tactics.retreatHpFrac * 0.5
        : profile.tactics.retreatHpFrac;

    if (hpFrac >= effectiveRetreatFrac) return state;

    // Siege commitment: if we're committed to a capital siege, don't peel off at moderate HP.
    if (focusCity && focusCity.isCapital && focusCity.ownerId !== playerId) {
        const nearFocus = hexDistance(unit.coord, focusCity.coord) <= 4;
        if (nearFocus && profile.tactics.siegeCommitment >= 0.7 && hpFrac >= 0.2) {
            return state;
        }
    }

    const enemies = warEnemyIds(state, playerId);
    if (enemies.size === 0) return state;
    const nearbyThreat = state.units.some(u => enemies.has(u.ownerId) && hexDistance(u.coord, unit.coord) <= 2);
    if (!nearbyThreat) return state;

    const cities = state.cities.filter(c => c.ownerId === playerId);
    const safeCity = cities.sort((a, b) => hexDistance(a.coord, unit.coord) - hexDistance(b.coord, unit.coord))[0];
    if (!safeCity) return state;

    // FIX #6: Force Fortify if already safe.
    // If we simply "return state", the unit still has moves, and runFocusSiegeAndCapture might grab it.
    // By forcing Fortify, we consume its moves and lock it down for healing/defense.
    if (hexEquals(unit.coord, safeCity.coord)) {
        return tryAction(state, { type: "FortifyUnit", playerId, unitId: unit.id });
    }

    const next = moveToward(state, playerId, unit, safeCity.coord);
    // If we arrived at safety after moving, also lock down.
    if (next !== state) {
        const movedUnit = next.units.find(u => u.id === unit.id);
        if (movedUnit && movedUnit.movesLeft > 0 && hexEquals(movedUnit.coord, safeCity.coord)) {
            return tryAction(next, { type: "FortifyUnit", playerId, unitId: unit.id });
        }
    }
    return next;
}

/**
 * v6.6f: Complete rewrite of escort logic.
 * 
 * Previous issues:
 * - v6.6e read titanFocusCityId but it wasn't set yet (runTitanAgent sets it later)
 * - Only moved 5 escorts per turn (8.2 units at creation on average)
 * 
 * Fix:
 * - Compute target city using same logic as runTitanAgent
 * - Move ALL available escorts toward target (no cap)
 * - Run before all other unit actions so escorts have moves
 */
function followTitan(state: GameState, playerId: string): GameState {
    let next = state;
    const titan = next.units.find(u => u.ownerId === playerId && u.type === UnitType.Titan);
    if (!titan) return next;

    // Find enemy cities (same logic as runTitanAgent)
    const enemies = warEnemyIds(next, playerId);
    if (enemies.size === 0) return next;

    const enemyCities = next.cities.filter(c => enemies.has(c.ownerId));
    if (enemyCities.length === 0) return next;

    // Pick target city using same scoring as runTitanAgent
    const profile = getAiProfileV2(next, playerId);
    const targetCity = pickBest(enemyCities, c => {
        const dist = hexDistance(titan.coord, c.coord);
        const capital = c.isCapital ? 1 : 0;
        const finish = c.hp <= 0 ? 1 : 0;
        const hpFrac = c.maxHp ? c.hp / c.maxHp : 1;
        const momentum = -dist * (1.2 + profile.titan.momentum);
        return (capital * 25 * profile.titan.capitalHunt) + (finish * 30 * profile.titan.finisher) + ((1 - hpFrac) * 18) + momentum;
    })?.item;
    // v6.6i: Rally point is at SAFE DISTANCE (range 3) from target city
    // City attack range is 2, so staging at 3 keeps escorts alive
    // The Titan goes in alone to attack/capture, escorts provide support fire
    const rallyPoint = targetCity?.coord ?? titan.coord;
    const SAFE_STAGING_DISTANCE = 3;

    // Find ALL military units that could escort (no range limit, no count limit!)
    // v7.2: Garrisons stay in cities - don't pull defenders for deathball
    // v7.1: Home defenders stay in friendly territory
    const myCities = next.cities.filter(c => c.ownerId === playerId);
    const potentialEscorts = next.units.filter(u => {
        if (u.ownerId !== playerId) return false;
        if (!isMilitary(u)) return false;
        if (u.type === UnitType.Titan) return false;
        if (u.movesLeft <= 0) return false;
        if (u.hasAttacked) return false;
        if (u.isHomeDefender) return false; // v7.1: Home defenders don't join deathball

        // v7.2: Garrisons stay in cities - don't pull defenders
        const isGarrisoned = myCities.some(c => hexEquals(c.coord, u.coord));
        if (isGarrisoned) return false;

        // v1.2: Ring defenders (distance 1 from any city) also stay put
        const isInRing = myCities.some(c => hexDistance(c.coord, u.coord) === 1);
        if (isInRing) return false;

        // v6.6i: Already at safe staging distance - don't move closer!
        const distToTarget = hexDistance(u.coord, rallyPoint);
        if (distToTarget <= SAFE_STAGING_DISTANCE && distToTarget >= 2) return false;

        return true;
    }).sort((a, b) => {
        // Prioritize ArmyRiders (they have 2 move like Titan)
        const aRider = a.type === UnitType.ArmyRiders ? 0 : 1;
        const bRider = b.type === UnitType.ArmyRiders ? 0 : 1;
        if (aRider !== bRider) return aRider - bRider;
        // Then by distance to target (closest first for faster convergence)
        return hexDistance(a.coord, rallyPoint) - hexDistance(b.coord, rallyPoint);
    });

    // v6.6h: Clear escort flag from all player units first (reset each turn)
    next.units.filter(u => u.ownerId === playerId).forEach(u => {
        u.isTitanEscort = false;
    });

    // Move escorts toward staging position and MARK them as reserved
    // v6.6i: Escorts stop at SAFE_STAGING_DISTANCE, don't get too close to city
    let escortsMoved = 0;
    for (const escort of potentialEscorts) {
        const liveEscort = next.units.find(u => u.id === escort.id);
        if (!liveEscort || liveEscort.movesLeft <= 0) continue;

        // Check if already at safe staging distance
        const currentDist = hexDistance(liveEscort.coord, rallyPoint);
        if (currentDist >= 2 && currentDist <= SAFE_STAGING_DISTANCE) {
            // Already at safe staging position - just mark as escort
            liveEscort.isTitanEscort = true;
            escortsMoved++;
            continue;
        }

        const before = next;
        next = moveToward(next, playerId, liveEscort, rallyPoint);
        if (next !== before) {
            // v6.6h: Mark as escort so other combat logic skips this unit
            const movedUnit = next.units.find(u => u.id === escort.id);
            if (movedUnit) {
                movedUnit.isTitanEscort = true;
            }
            escortsMoved++;
        }
    }

    // Mark units in safe staging zone as escorts (range 2-4 from target)
    let escortsMarked = 0;
    next.units.filter(u =>
        u.ownerId === playerId &&
        isMilitary(u) &&
        u.type !== UnitType.Titan &&
        hexDistance(u.coord, rallyPoint) >= 2 &&
        hexDistance(u.coord, rallyPoint) <= 4
    ).forEach(u => {
        u.isTitanEscort = true;
        escortsMarked++;
    });

    // Track total escorts marked for diagnostics
    const player = next.players.find(p => p.id === playerId);
    if (player) {
        if (!player.titanStats) {
            player.titanStats = { kills: 0, cityCaptures: 0, deathballCaptures: 0, totalSupportAtCaptures: 0, escortsMarkedTotal: 0, escortsAtCaptureTotal: 0, totalMilitaryAtCaptures: 0, supportByCapture: [] };
        }
        player.titanStats.escortsMarkedTotal += escortsMarked + escortsMoved;
    }

    if (escortsMoved > 0 || escortsMarked > 0) {
        const targetLabel = targetCity ? `city ${targetCity.name}` : `Titan`;
        aiInfo(`[TITAN ESCORT] ${escortsMoved} moved, ${escortsMarked} already nearby -> ${escortsMoved + escortsMarked} total escorts marked for ${targetLabel}`);
    }

    return next;
}

function runTitanAgent(state: GameState, playerId: string): GameState {
    let next = state;
    const titan = next.units.find(u => u.ownerId === playerId && u.type === UnitType.Titan);
    if (!titan) return next;
    const enemies = warEnemyIds(next, playerId);
    if (enemies.size === 0) return next;

    const profile = getAiProfileV2(next, playerId);
    const memory = getAiMemoryV2(next, playerId);
    const enemyCities = next.cities.filter(c => enemies.has(c.ownerId));
    if (enemyCities.length === 0) return next;

    // Align Titan with the main siege focus if we have one (prevents Titan wandering to a different target
    // while the deathball captures cities elsewhere).
    const focusCity = memory.focusCityId ? next.cities.find(c => c.id === memory.focusCityId) : undefined;
    if (focusCity && enemies.has(focusCity.ownerId)) {
        next = setAiMemoryV2(next, playerId, { ...memory, titanFocusCityId: focusCity.id });
    }

    aiInfo(`[TITAN LOG] ${playerId} Turn ${next.turn} | HP: ${titan.hp}/${UNITS[UnitType.Titan].hp} | Moves: ${titan.movesLeft} | At: (${titan.coord.q},${titan.coord.r})`);

    let targetCityId = memory.titanFocusCityId;
    if (targetCityId) {
        const stillValid = enemyCities.some(c => c.id === targetCityId);
        if (!stillValid) targetCityId = undefined;
    }

    if (!targetCityId) {
        const best = pickBest(enemyCities, c => {
            const dist = hexDistance(titan.coord, c.coord);
            const capital = c.isCapital ? 1 : 0;
            const finish = c.hp <= 0 ? 1 : 0;
            const hpFrac = c.maxHp ? c.hp / c.maxHp : 1;
            const momentum = -dist * (1.2 + profile.titan.momentum);
            return (capital * 25 * profile.titan.capitalHunt) + (finish * 30 * profile.titan.finisher) + ((1 - hpFrac) * 18) + momentum;
        });
        targetCityId = best?.item?.id;
    }

    if (!targetCityId) return next;
    next = setAiMemoryV2(next, playerId, { ...memory, titanFocusCityId: targetCityId });

    const targetCity = next.cities.find(c => c.id === targetCityId);
    if (!targetCity) return next;

    // Titan constraints were too strict and were effectively neutering the unit:
    // - It was frequently waiting for 3+ support units (based on forceConcentration),
    // - and it was using only 1 movement even though Titan has move=2.
    //
    // New behavior:
    // - AetherianVanguard Titan is allowed to spearhead (minimal support requirement),
    // - uses ALL remaining movement each turn toward its target,
    // - avoids only "pure suicide" attacks unless the attack would capture a city.
    const titanHpFrac = titan.maxHp ? titan.hp / titan.maxHp : (titan.hp / UNITS[titan.type].hp);
    const onFriendlyCity = next.cities.some(c => c.ownerId === playerId && hexEquals(c.coord, titan.coord));

    // v2.2: Titan healing holdout - after capturing a city, stay to heal until 80% HP.
    // This prevents the Titan from immediately rushing the next target while damaged.
    const TITAN_HEAL_THRESHOLD = 0.8;
    if (onFriendlyCity && titanHpFrac < TITAN_HEAL_THRESHOLD) {
        aiInfo(`[TITAN LOG] Healing holdout in city (HP: ${Math.round(titanHpFrac * 100)}% < ${TITAN_HEAL_THRESHOLD * 100}% threshold)`);
        return next; // Stay put and heal
    }

    // Ensure Titan is not linked (prevents stacking violations during capture)
    if (titan.linkedUnitId) {

        const unlinked = tryAction(next, { type: "UnlinkUnits", playerId, unitId: titan.id });
        if (unlinked !== next) {
            next = unlinked;
            // Re-fetch titan after action
            const newTitan = next.units.find(u => u.id === titan.id);
            if (!newTitan) return next;
        }
    }

    if (titanHpFrac < 0.2 && !onFriendlyCity) {
        const safe = nearestFriendlyCity(next, playerId, titan.coord);
        if (safe) {

            return moveTowardAllMoves(next, playerId, titan.id, safe, 6);
        }
    }

    const supportCount = next.units.filter(u =>
        u.ownerId === playerId &&
        isMilitary(u) &&
        u.type !== UnitType.Titan &&
        hexDistance(u.coord, titan.coord) <= 2
    ).length;
    const isAetherian = profile.civName === "AetherianVanguard";

    // v2.3: TITAN WANT BIGGER DEATHBALL!
    // Increased support requirements to ensure Titan has proper escort before pushing.
    const requiredSupport = isAetherian ? 5 : (titanHpFrac < 0.55 ? 4 : 3);
    const allowDeepPush = supportCount >= requiredSupport;

    if (!allowDeepPush) {
        aiInfo(`[TITAN LOG] Waiting for support (Current: ${supportCount}/${requiredSupport})`);
    }

    // Legacy lesson: Titan must handle blockers. Prefer pathing to an engagement tile (adjacent to city),
    // and if movement fails due to occupancy, clear the blocking unit then resume sieging.
    let safety = 0;
    const visitedTiles = new Set<string>();
    visitedTiles.add(hexToString(titan.coord));

    while (safety++ < 8) {
        const live = next.units.find(u => u.id === titan.id);
        const cityNow = next.cities.find(c => c.id === targetCityId);
        if (!live || !cityNow) return next;
        if (live.movesLeft <= 0) return next;


        const dist = hexDistance(live.coord, cityNow.coord);

        // 0) NEW: Opportunistic Unit Attacks (Self-Defense / Value Trades)
        if (!live.hasAttacked) {
            const bestAttack = bestAttackForUnit(next, playerId, live);
            if (bestAttack && bestAttack.score > 0) {
                // If it's a kill or high value (e.g. > 50 score), take it!
                // Or if it's blocking our path (distance 1)
                const isBlocker = bestAttack.action.targetType === "Unit" &&
                    hexDistance(live.coord, next.units.find(u => u.id === bestAttack.action.targetId)!.coord) <= 1;

                if (bestAttack.score > 50 || isBlocker) {
                    aiInfo(`[TITAN LOG] Opportunistic Attack on ${bestAttack.action.targetType} (Score: ${bestAttack.score})`);
                    const attacked = tryAction(next, bestAttack.action);
                    if (attacked !== next) {
                        next = attacked;
                        continue;
                    }
                }
            }
        }

        // 1) Immediate capture if city is already at 0 and we are adjacent.
        if (cityNow.hp <= 0 && dist === 1 && UNITS[live.type].canCaptureCity) {

            const moved = tryAction(next, { type: "MoveUnit", playerId, unitId: live.id, to: cityNow.coord });
            if (moved !== next) {
                next = moved;
                continue;
            }
        }

        // 2) If not adjacent, move toward an engagement tile (not the city tile itself).
        if (dist > 1) {
            if (!allowDeepPush) {
                aiInfo(`[TITAN LOG] Holding position (Waiting for support)`);
                break;
            }
            const path = findEngagementPath(live.coord, cityNow.coord, live, next);
            if (path && path.length > 0) {
                const step = path[0];
                const stepKey = hexToString(step);

                // OSCILLATION FIX: Do not move to a tile we have already visited this turn.
                if (visitedTiles.has(stepKey)) {

                    break;
                }


                const moved = tryAction(next, { type: "MoveUnit", playerId, unitId: live.id, to: step });
                if (moved !== next) {
                    aiInfo(`[TITAN LOG] Moving to (${step.q},${step.r}) toward target`);
                    next = moved;
                    visitedTiles.add(stepKey);
                    continue;
                }
                // Movement failed: attempt to clear a blocking unit (prefer the unit on our intended step).
                if (!live.hasAttacked) {
                    const blocker =
                        next.units.find(u => u.ownerId !== playerId && hexEquals(u.coord, step)) ??
                        next.units.find(u => u.ownerId !== playerId && hexDistance(u.coord, live.coord) <= UNITS[live.type].rng);
                    if (blocker && !onFriendlyCity) {
                        const attacked = tryAction(next, { type: "Attack", playerId, attackerId: live.id, targetType: "Unit", targetId: blocker.id });
                        if (attacked !== next) {
                            next = attacked;
                            continue;
                        }
                    }
                }
                // Can't move, can't clear: give up this loop.

                break;
            } else {
                // No path to engagement: try to clear *any* adjacent enemy, otherwise drop target and re-pick next turn.
                if (!live.hasAttacked) {

                    const blocker = next.units.find(u => u.ownerId !== playerId && hexDistance(u.coord, live.coord) <= UNITS[live.type].rng);
                    if (blocker && !onFriendlyCity) {
                        const attacked = tryAction(next, { type: "Attack", playerId, attackerId: live.id, targetType: "Unit", targetId: blocker.id });
                        if (attacked !== next) {
                            next = attacked;
                            continue;
                        }
                    }
                }
                // If we can't path (rare in real games, common in unit tests with empty maps),
                // keep the selected target so we don't oscillate or clear memory incorrectly.
                break;
            }
        }

        // 3) Attack city if in range.
        if (!live.hasAttacked && dist <= UNITS[live.type].rng && cityNow.hp > 0) {
            const preview = getCombatPreviewUnitVsCity(next, live, cityNow);
            const ret = preview.returnDamage?.avg ?? 0;
            const wouldDie = ret >= live.hp;
            const dmg = preview.estimatedDamage.avg;
            const wouldCapture = (cityNow.hp - dmg) <= 0 && dist === 1;

            if ((wouldCapture || !wouldDie || profile.tactics.riskTolerance >= 0.8) && !onFriendlyCity) {
                const attacked = tryAction(next, { type: "Attack", playerId, attackerId: live.id, targetType: "City", targetId: cityNow.id });
                if (attacked !== next) {
                    next = attacked;
                    continue;
                }
            }
        }

        break;
    }

    const liveTitan = next.units.find(u => u.id === titan.id);
    if (!liveTitan || liveTitan.movesLeft <= 0) return next;

    if (!allowDeepPush) {
        // Non-Aetherian Titans (if any) or edge cases: don't run off alone when badly hurt.
        if (titanHpFrac < 0.55) return next;
    }

    // If we still have moves after attacking, keep closing to an engagement tile.
    // If we still have moves after attacking, keep closing to an engagement tile.
    const cityNow = next.cities.find(c => c.id === targetCityId);
    if (!cityNow) return next;
    const path = findEngagementPath(liveTitan.coord, cityNow.coord, liveTitan, next);
    const dest = (path && path.length > 0) ? path[path.length - 1] : cityNow.coord;

    // v7.7: TITAN SPRINT LOGIC (Fix for Move 3 outrunning Move 2 escorts)
    // If we are far from the target (> 5 tiles), limit movement to 2 steps to stay with the army.
    // If we are close (<= 5 tiles), UNLEASH SPEED 3 to close the gap and engage.
    const distToTarget = hexDistance(liveTitan.coord, cityNow.coord);
    const sprintMode = distToTarget <= 5;
    const allowedMoves = sprintMode ? 8 : 2; // 8 is effectively "all moves", 2 is "army speed"

    if (sprintMode) {
        aiInfo(`[TITAN LOG] SPRINTING to target (Dist: ${distToTarget})`);
    }

    next = moveTowardAllMoves(next, playerId, liveTitan.id, dest, allowedMoves);
    return next;
}

export function runTacticsV2(state: GameState, playerId: string): GameState {
    let next = state;

    // Ensure focus target exists (sets memory).
    const focused = selectFocusTargetV2(next, playerId);
    next = focused.state;

    // Retreat pass.
    // v6.6h: Escorts skip retreat - they stay with Titan
    const unitsForRetreat = next.units.filter(u => u.ownerId === playerId && u.movesLeft > 0 && isMilitary(u) && u.type !== UnitType.Titan && !u.isTitanEscort);
    for (const unit of unitsForRetreat) {
        const live = next.units.find(u => u.id === unit.id);
        if (!live || live.movesLeft <= 0) continue;
        next = retreatIfNeeded(next, playerId, live);
    }

    // Note: Ranged repositioning is handled by repositionRanged() AFTER attacks
    // This avoids conflicts where pre-attack movement wastes moves or positions units suboptimally

    // Titan Core pre-spawn detection: detect city building Titan's Core and rally army early
    // v2.4: Also rally when RESEARCHING SteamForges (the tech that unlocks Titan's Core) for earlier prep
    const preTitanMemory = getAiMemoryV2(next, playerId);
    const myCities = next.cities.filter(c => c.ownerId === playerId);
    const hasTitan = next.units.some(u => u.ownerId === playerId && u.type === UnitType.Titan);
    const player = next.players.find(p => p.id === playerId);
    const researchingSteamForges = player?.currentTech?.id === TechId.SteamForges;

    // Clear stale titanCoreCityId if:
    // 1. Titan already exists (rally complete)
    // 2. Rally city no longer owned by player
    // 3. Rally city no longer building Titan's Core (AND not researching SteamForges)
    if (preTitanMemory.titanCoreCityId) {
        const rallyCity = next.cities.find(c => c.id === preTitanMemory.titanCoreCityId);
        const buildingCore = rallyCity?.currentBuild?.type === "Building" && rallyCity?.currentBuild?.id === BuildingType.TitansCore;
        const stillValid = rallyCity &&
            rallyCity.ownerId === playerId &&
            (buildingCore || researchingSteamForges) &&
            !hasTitan;

        if (!stillValid) {
            next = setAiMemoryV2(next, playerId, { ...preTitanMemory, titanCoreCityId: undefined });
        }
    }

    // Detect new Titan Core being built OR pick a rally city when researching SteamForges
    const titanCoreCity = myCities.find(c =>
        c.currentBuild?.type === "Building" && c.currentBuild?.id === BuildingType.TitansCore
    );
    // If researching SteamForges but not building yet, pick capital or highest-production city as rally point
    const potentialRallyCity = titanCoreCity || (researchingSteamForges && !hasTitan
        ? myCities.find(c => c.isCapital) || myCities[0]
        : undefined
    );

    const currentMemory = getAiMemoryV2(next, playerId);
    if (potentialRallyCity && !hasTitan && currentMemory.titanCoreCityId !== potentialRallyCity.id) {
        next = setAiMemoryV2(next, playerId, { ...currentMemory, titanCoreCityId: potentialRallyCity.id });
    }

    // v2.3: TITAN WANT ALL DEATHBALL READY WHEN SPAWN!
    // Pre-spawn deathball rally: aggressively rally military units toward the Titan Core city
    // BUT keep at least one garrison per city for defense
    const updatedMemory = getAiMemoryV2(next, playerId);
    if (updatedMemory.titanCoreCityId && !hasTitan) {
        const rallyCity = next.cities.find(c => c.id === updatedMemory.titanCoreCityId);
        if (rallyCity) {
            // Build a set of city coords that need to keep a garrison
            const cityCoords = new Set(
                myCities.filter(c => c.id !== rallyCity.id).map(c => hexToString(c.coord))
            );

            // v7.2: Mark ALL units in each city as garrisons, not just one
            // This prevents oscillation where garrisons get pulled to another city
            const garrisonIds = new Set<string>();
            for (const city of myCities) {
                if (city.id === rallyCity.id) continue; // Rally city doesn't need garrison - Titan will spawn there
                // Mark units ON the city tile
                const garrisons = next.units.filter(u =>
                    u.ownerId === playerId &&
                    isMilitary(u) &&
                    hexEquals(u.coord, city.coord)
                );
                garrisons.forEach(g => garrisonIds.add(g.id));

                // v1.2: Also protect ring defenders (distance 1 from city)
                const ringDefenders = next.units.filter(u =>
                    u.ownerId === playerId &&
                    isMilitary(u) &&
                    hexDistance(u.coord, city.coord) === 1
                );
                ringDefenders.forEach(r => garrisonIds.add(r.id));
            }

            // Rally ALL military units EXCEPT designated garrisons and home defenders
            // v7.1: Home defenders stay in territory
            const militaryToRally = next.units.filter(u =>
                u.ownerId === playerId &&
                u.movesLeft > 0 &&
                isMilitary(u) &&
                u.type !== UnitType.Titan &&
                !garrisonIds.has(u.id) && // Don't pull designated garrisons
                !u.isHomeDefender && // v7.1: Home defenders don't join rally
                hexDistance(u.coord, rallyCity.coord) > 1 // Rally anyone not already adjacent
            ).sort((a, b) =>
                // Prioritize closest units to get the deathball assembled quickly
                hexDistance(a.coord, rallyCity.coord) - hexDistance(b.coord, rallyCity.coord)
            );

            // Rally units
            for (const unit of militaryToRally) {
                const liveUnit = next.units.find(u => u.id === unit.id);
                if (!liveUnit || liveUnit.movesLeft <= 0) continue;
                next = moveToward(next, playerId, liveUnit, rallyCity.coord);
            }

            aiInfo(`[DEATHBALL RALLY] ${playerId} rallying ${militaryToRally.length} units to Titan Core city (${garrisonIds.size} garrisons held back)`);
        }
    }

    // v6.6d: CRITICAL FIX - followTitan must run EARLY, before other units use their moves!
    // Previously ran at line 1092 AFTER attacks/repositioning exhausted all movesLeft.
    next = followTitan(next, playerId);


    // Aid vulnerable units: send reinforcements to isolated allies before attacking
    next = aidVulnerableUnits(next, playerId);

    // Level 4: Update army phase state machine
    const armyPhaseResult = updateArmyPhase(next, playerId);
    next = armyPhaseResult.state;
    const currentArmyPhase = armyPhaseResult.phase;
    aiInfo(`[ARMY PHASE] ${playerId} is in phase: ${currentArmyPhase}`);

    // Battle group coordination: identify clusters of units engaged with enemies and coordinate focus-fire
    const battleGroups = identifyBattleGroups(next, playerId);
    for (const group of battleGroups) {
        next = coordinateGroupAttack(next, playerId, group);
    }

    // Level 2: Update tactical focus target before attack planning
    next = updateTacticalFocus(next, playerId);

    // Level 1A: Optimized attack ordering with simulated HP tracking
    // This replaces the per-unit bestAttackForUnit loop with a coordinated approach
    // that considers kill sequencing and prevents spread damage
    if (currentArmyPhase === 'attacking') {
        let plannedAttacks = planAttackOrderV2(next, playerId);

        // Level 3: Filter out attacks where the unit should wait
        const originalCount = plannedAttacks.length;
        plannedAttacks = filterAttacksWithWaitDecision(next, playerId, plannedAttacks);
        const filteredCount = originalCount - plannedAttacks.length;

        aiInfo(`[ATTACK ORDER] ${playerId} planned ${plannedAttacks.length} attacks (${plannedAttacks.filter(a => a.wouldKill).length} kills, ${filteredCount} waiting)`);

        for (const attack of plannedAttacks) {
            // Verify attacker still valid
            const liveAttacker = next.units.find(u => u.id === attack.attacker.id);
            if (!liveAttacker || liveAttacker.hasAttacked || liveAttacker.movesLeft <= 0) continue;

            // Overkill prevention: verify target still alive
            if (attack.targetType === "Unit") {
                const target = next.units.find(u => u.id === attack.targetId);
                if (!target || target.hp <= 0) continue;
            }

            next = executeAttack(next, playerId, attack);
        }
    } else {
        // Not in attack phase - only allow opportunity kills
        // v6.6h: Escorts skip opportunity attacks - they stay with Titan
        const attackers = next.units.filter(u => u.ownerId === playerId && !u.hasAttacked && isMilitary(u) && u.type !== UnitType.Titan && !u.isTitanEscort);
        for (const unit of attackers) {
            const live = next.units.find(u => u.id === unit.id);
            if (!live || live.hasAttacked) continue;
            const best = bestAttackForUnit(next, playerId, live);
            if (best && best.score > 0) {
                const preview = getCombatPreviewUnitVsUnit(next, live,
                    next.units.find(u => u.id === best.action.targetId) ?? live);
                const wouldKill = best.action.targetType === "Unit"
                    ? preview.estimatedDamage.avg >= (next.units.find(u => u.id === best.action.targetId)?.hp ?? 0)
                    : false;

                if (allowOpportunityKill(wouldKill, best.score, currentArmyPhase)) {
                    next = tryAction(next, best.action);
                } else {
                    aiInfo(`[ARMY PHASE] ${playerId} unit ${live.id} waiting (phase: ${currentArmyPhase})`);
                }
            }
        }
    }

    // Level 1B: Move-Then-Attack for units not in immediate attack range
    if (currentArmyPhase === 'attacking') {
        const moveAttackPlans = planMoveAndAttack(next, playerId);
        aiInfo(`[MOVE-ATTACK] ${playerId} planned ${moveAttackPlans.length} move-attack combos`);

        for (const plan of moveAttackPlans) {
            const liveUnit = next.units.find(u => u.id === plan.unit.id);
            if (!liveUnit || liveUnit.hasAttacked || liveUnit.movesLeft <= 0) continue;

            next = executeMoveAttack(next, playerId, plan);
        }
    }

    // Post-attack ranged repositioning: kite ranged units away from melee after they attack
    next = repositionRanged(next, playerId);

    // Immediate capture routing: if any enemy city is at 0 HP, send a capturer to take it now.
    // This is a key missing piece vs Legacy (`routeCityCaptures`) and is required to close out wars.
    next = routeCityCapturesV2(next, playerId);

    // Titan agent (separate so it doesn't get blocked by generic movement/attacks).
    next = runTitanAgent(next, playerId);
    // v6.6d: followTitan moved to run EARLY (before attacks) so escorts have moves available

    // Main siege/capture behavior: coordinate a real combined-arms push on the focused city.
    next = runFocusSiegeAndCapture(next, playerId);

    const enemies = warEnemyIds(next, playerId);
    const inWar = enemies.size > 0;

    const memory = getAiMemoryV2(next, playerId);
    const focusCity = memory.focusCityId ? next.cities.find(c => c.id === memory.focusCityId) : undefined;
    if (!focusCity) return next;

    const profile = getAiProfileV2(next, playerId);

    // POST-WAR RALLY: Immediately after war declaration, aggressively move all units to the front
    // This fixes the issue where AI declares war but units are scattered and don't attack
    const justDeclaredWar = memory.focusSetTurn === next.turn && inWar;
    if (justDeclaredWar && focusCity) {
        aiInfo(`[POST-WAR RALLY] ${playerId} just declared war - rallying all forces to ${focusCity.name}`);

        const rallyTarget = focusCity.coord;
        const myCityCoords = new Set(myCities.map(c => `${c.coord.q},${c.coord.r}`));

        const militaryToRally = next.units.filter(u =>
            u.ownerId === playerId &&
            u.movesLeft > 0 &&
            isMilitary(u) &&
            u.type !== UnitType.Titan && // Titan has its own agent
            !u.isTitanEscort && // Escorts follow Titan
            !u.isHomeDefender && // Home defenders stay in territory
            !myCityCoords.has(`${u.coord.q},${u.coord.r}`) && // Don't pull garrisons
            hexDistance(u.coord, rallyTarget) > 3 // Not already close enough
        ).sort((a, b) =>
            hexDistance(a.coord, rallyTarget) - hexDistance(b.coord, rallyTarget)
        );

        let rallied = 0;
        for (const unit of militaryToRally) {
            const liveUnit = next.units.find(u => u.id === unit.id);
            if (!liveUnit || liveUnit.movesLeft <= 0) continue;

            // Use ALL movement to get there fast
            const before = next;
            next = moveTowardAllMoves(next, playerId, liveUnit.id, rallyTarget, 6);
            if (next !== before) rallied++;
        }

        if (rallied > 0) {
            aiInfo(`[POST-WAR RALLY] ${playerId} rallied ${rallied} units toward ${focusCity.name}`);
        }
    }

    // Pre-war rally: if we have a focus target and can initiate wars, start staging a strike group even while at peace.
    // This avoids a deadlock where diplomacy wants staged forces before declaring but no one ever moves toward the front.
    const focusedTargetId = memory.focusTargetPlayerId;
    const stanceToFocus = focusedTargetId ? (next.diplomacy?.[playerId]?.[focusedTargetId] ?? DiplomacyState.Peace) : DiplomacyState.Peace;
    const canPreWarRally =
        !inWar &&
        !!focusedTargetId &&
        stanceToFocus === DiplomacyState.Peace &&
        profile.diplomacy.canInitiateWars &&
        profile.tactics.forceConcentration >= 0.65;

    // Force concentration / staging: if we don't have enough units near the focus city, rally at a staging ring instead of trickling in.
    const requiredNear = Math.max(2, Math.ceil(profile.tactics.forceConcentration * 4));
    const nearCount = next.units.filter(u =>
        u.ownerId === playerId &&
        isMilitary(u) &&
        u.type !== UnitType.Titan &&
        hexDistance(u.coord, focusCity.coord) <= 5
    ).length;
    const shouldStage = (nearCount < requiredNear) && (profile.tactics.forceConcentration >= 0.65);

    const pickStagingCoord = (unit: Unit): { q: number; r: number } => {
        const desiredDist = 5;
        let best = focusCity.coord;
        let bestScore = Number.POSITIVE_INFINITY;
        // Scan a limited subset (map tiles are not huge; still keep it bounded).
        let scanned = 0;
        for (const t of next.map.tiles) {
            if (scanned++ > 600) break;
            const dCity = hexDistance(t.coord, focusCity.coord);
            if (dCity !== desiredDist) continue;
            const dUnit = hexDistance(t.coord, unit.coord);
            if (dUnit < bestScore) {
                bestScore = dUnit;
                best = t.coord;
            }
        }
        return best;
    };

    const cityTiles = new Set(next.cities.filter(c => c.ownerId === playerId).map(c => `${c.coord.q},${c.coord.r}`));
    const movers = next.units
        .filter(u =>
            u.ownerId === playerId &&
            u.movesLeft > 0 &&
            isMilitary(u) &&
            u.type !== UnitType.Titan &&
            !u.isHomeDefender && // v7.1: Home defenders stay in territory
            !cityTiles.has(`${u.coord.q},${u.coord.r}`) // don't pull garrisons off cities
        )
        .sort((a, b) => hexDistance(a.coord, focusCity.coord) - hexDistance(b.coord, focusCity.coord));

    // If we're not at war yet, move a real strike group (not 2 units) so we can actually declare and capture fast.
    const maxPreWarMovers = canPreWarRally ? Math.max(8, requiredNear - nearCount) : movers.length;
    let movedCount = 0;

    for (const unit of movers) {
        const live = next.units.find(u => u.id === unit.id);
        if (!live || live.movesLeft <= 0) continue;
        if (hexDistance(live.coord, focusCity.coord) <= UNITS[live.type].rng) continue; // already in range-ish
        const dest = (shouldStage || canPreWarRally) ? pickStagingCoord(live) : focusCity.coord;

        const before = next;
        next = moveToward(before, playerId, live, dest);
        if (next !== before) {
            movedCount += 1;
            if (canPreWarRally && movedCount >= maxPreWarMovers) break;
        }
    }

    return next;
}


