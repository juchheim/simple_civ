import { hexEquals, hexDistance } from "../../core/hex.js";
import {
    AiVictoryGoal,
    BuildingType,
    City,
    GameState,
    ProjectId,
    TechId,
    UnitType,
    TerrainType,
    DiplomacyState,
} from "../../core/types.js";
import { canBuild, getTileYields } from "../rules.js";
import { tryAction } from "./shared/actions.js";
import { tileWorkingPriority, tilesByPriority } from "./city-heuristics.js";
import { AiPersonality, getPersonalityForPlayer } from "./personality.js";
import { hexSpiral } from "../../core/hex.js";
import { UNITS } from "../../core/constants.js";

function isAtWar(state: GameState, playerId: string): boolean {
    return state.players.some(
        p => p.id !== playerId && !p.isEliminated && state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
    );
}

type BuildOption = { type: "Unit" | "Building" | "Project"; id: string };

function hasAvailableCitySite(state: GameState, _playerId: string): boolean {
    const MIN_CITY_DISTANCE = 3;

    for (const tile of state.map.tiles) {
        // Basic terrain checks
        if (tile.ownerId) continue;
        if (tile.hasCityCenter) continue;
        if (tile.terrain === TerrainType.Mountain ||
            tile.terrain === TerrainType.Coast ||
            tile.terrain === TerrainType.DeepSea) continue;

        // Check distance from ALL cities (match validation logic in handleFoundCity)
        let tooClose = false;
        for (const city of state.cities) {
            const dist = hexDistance(tile.coord, city.coord);
            if (dist < MIN_CITY_DISTANCE) {
                tooClose = true;
                break;
            }
        }
        if (tooClose) continue;

        return true;  // Found at least one valid site!
    }
    return false;
}

function buildPriorities(goal: AiVictoryGoal, personality: AiPersonality, atWar: boolean, state: GameState, playerId: string): BuildOption[] {
    const player = state.players.find(p => p.id === playerId);

    // Check if player can complete victory projects - if so, prioritize them!
    const canCompleteVictoryProjects = player && player.techs.includes(TechId.StarCharts);
    const hasObservatory = player?.completedProjects.includes(ProjectId.Observatory);
    const hasGrandAcademy = player?.completedProjects.includes(ProjectId.GrandAcademy);

    // Check if we are safe enough to pursue victory
    // Safe if: Not at war OR we have a decent military (at least 3 units)
    const myUnits = state.units.filter(u => u.ownerId === playerId);
    const militaryCount = myUnits.filter(u => u.type !== UnitType.Settler && u.type !== UnitType.Scout && u.type !== UnitType.RiverBoat).length;
    const scoutCount = myUnits.filter(u => u.type === UnitType.Scout).length;
    const isSafeEnough = !atWar || militaryCount >= 3;

    // If we can work on victory, do it (unless massively losing a war)
    if (canCompleteVictoryProjects && isSafeEnough) {
        const victoryPath: BuildOption[] = [];
        if (!hasObservatory) {
            victoryPath.push({ type: "Project", id: ProjectId.Observatory });
        } else if (!hasGrandAcademy) {
            victoryPath.push({ type: "Project", id: ProjectId.GrandAcademy });
        } else {
            victoryPath.push({ type: "Project", id: ProjectId.GrandExperiment });
        }

        // Prepend victory projects to normal priorities
        const normalPriorities = buildNormalPriorities(goal, personality, scoutCount);
        return [...victoryPath, ...normalPriorities];
    }

    // v0.96 balance: Check for army formation opportunities even when not at war
    // v0.99: Drilled Ranks enables armies now
    const hasFormArmyTech = player?.techs.includes(TechId.DrilledRanks) ?? false;

    // Count unit types to determine which armies we can form
    const units = state.units.filter(u => u.ownerId === playerId);
    const spearCount = units.filter(u => u.type === UnitType.SpearGuard).length;
    const bowCount = units.filter(u => u.type === UnitType.BowGuard).length;
    const ridersCount = units.filter(u => u.type === UnitType.Riders).length;

    // Build army formation priorities based on available units
    const armyPriorities: BuildOption[] = [];
    if (hasFormArmyTech) {
        // Prioritize forming armies when we have 2+ of a unit type
        // v0.99: If Conquest goal, prioritize armies even more aggressively (1+ unit is enough if we want to upgrade)
        // Actually, Form Army transforms a single unit into an Army unit. It doesn't combine two units.
        // Wait, let's check constants.ts ProjectData.
        // "onComplete: { type: "Transform", payload: { baseUnit: UnitType.SpearGuard, armyUnit: UnitType.ArmySpearGuard } }"
        // And rules.ts: "const hasUnit = state.units.some(u => ... u.type === requiredUnitType ...)"
        // So it transforms ONE unit.
        // So we just need 1 unit of that type.

        if (spearCount >= 1) armyPriorities.push({ type: "Project", id: ProjectId.FormArmy_SpearGuard });
        if (bowCount >= 1) armyPriorities.push({ type: "Project", id: ProjectId.FormArmy_BowGuard });
        if (ridersCount >= 1) armyPriorities.push({ type: "Project", id: ProjectId.FormArmy_Riders });
    }

    // When at war, heavily prioritize military production
    // Army formation is TOP priority if available, then varied units
    if (atWar || player?.warPreparation || goal === "Conquest") {
        // If preparing for war, we want to build up forces
        // If actually at war, we MUST build forces
        // If Conquest goal, we ALWAYS want strongest units

        if (hasFormArmyTech) {
            // Prioritize army formation over individual units
            // v0.96: Put army formations first, then units based on what we lack
            const allArmyOptions: BuildOption[] = [
                { type: "Project", id: ProjectId.FormArmy_BowGuard },
                { type: "Project", id: ProjectId.FormArmy_SpearGuard },
                { type: "Project", id: ProjectId.FormArmy_Riders },
            ];

            // Put armies we can actually form first
            const prioritizedArmies = [
                ...armyPriorities,
                ...allArmyOptions.filter(a => !armyPriorities.some(p => p.id === a.id))
            ];

            return [
                ...prioritizedArmies,
                { type: "Unit", id: UnitType.Settler }, // Still allow settlers if safe
                { type: "Unit", id: UnitType.BowGuard },
                { type: "Unit", id: UnitType.SpearGuard },
                { type: "Unit", id: UnitType.Riders },
                { type: "Building", id: BuildingType.StoneWorkshop },
                { type: "Building", id: BuildingType.Farmstead },
            ];
        } else {
            // No armies yet, build varied individual units
            // Check current army composition to balance melee/ranged
            const rangedCount = units.filter(u => u.type === UnitType.BowGuard || u.type === UnitType.ArmyBowGuard).length;
            const meleeCount = units.filter(u =>
                u.type === UnitType.SpearGuard || u.type === UnitType.Riders ||
                u.type === UnitType.ArmySpearGuard || u.type === UnitType.ArmyRiders
            ).length;

            // Ensure we have at least one of each if possible
            const hasSpear = units.some(u => u.type === UnitType.SpearGuard || u.type === UnitType.ArmySpearGuard);
            const hasBow = units.some(u => u.type === UnitType.BowGuard || u.type === UnitType.ArmyBowGuard);
            const hasRider = units.some(u => u.type === UnitType.Riders || u.type === UnitType.ArmyRiders);

            const meleeFirst: BuildOption[] = [
                { type: "Unit", id: UnitType.Settler },
                { type: "Unit", id: UnitType.SpearGuard },
                { type: "Unit", id: UnitType.Riders },
                { type: "Unit", id: UnitType.BowGuard },
            ];

            const rangedFirst: BuildOption[] = [
                { type: "Unit", id: UnitType.Settler },
                { type: "Unit", id: UnitType.BowGuard },
                { type: "Unit", id: UnitType.SpearGuard },
                { type: "Unit", id: UnitType.Riders },
            ];

            // If we are missing a specific type, prioritize it
            let unitPriority: BuildOption[] = [];
            if (!hasSpear) unitPriority.push({ type: "Unit", id: UnitType.SpearGuard });
            if (!hasBow) unitPriority.push({ type: "Unit", id: UnitType.BowGuard });
            if (!hasRider) unitPriority.push({ type: "Unit", id: UnitType.Riders });

            // Then fill with balanced approach
            if (rangedCount > meleeCount) {
                unitPriority = [...unitPriority, ...meleeFirst];
            } else {
                unitPriority = [...unitPriority, ...rangedFirst];
            }

            // Remove duplicates
            unitPriority = unitPriority.filter((v, i, a) => a.findIndex(t => t.type === v.type && t.id === v.id) === i);

            return [
                ...unitPriority,
                { type: "Building", id: BuildingType.StoneWorkshop },
                { type: "Building", id: BuildingType.Farmstead },
            ];
        }
    }

    // Not at war, but if we have Army Doctrine and units to form, consider it
    let normalPriorities = buildNormalPriorities(goal, personality, scoutCount);

    // v0.98 Update 7: ForgeClans early military deterrence
    // They get attacked the most - ensure they have military before expanding
    if (player?.civName === "ForgeClans") {
        normalPriorities = getForgeClansEarlyMilitaryPriorities(state, playerId, normalPriorities);
    }

    if (armyPriorities.length > 0) {
        // Insert army formation opportunities after first few normal priorities
        // This allows peacetime army building without completely disrupting economy
        return [
            ...normalPriorities.slice(0, 2),
            ...armyPriorities,
            ...normalPriorities.slice(2),
        ];
    }

    return normalPriorities;
}

function buildNormalPriorities(goal: AiVictoryGoal, personality: AiPersonality, scoutCount: number): BuildOption[] {
    const shouldBuildScout = scoutCount < 2; // Cap scouts at 2

    const progress: BuildOption[] = [
        ...(shouldBuildScout ? [{ type: "Unit", id: UnitType.Scout } as BuildOption] : []),          // Early exploration
        { type: "Project", id: ProjectId.Observatory },
        { type: "Project", id: ProjectId.GrandAcademy },
        { type: "Project", id: ProjectId.GrandExperiment },
        { type: "Building", id: BuildingType.Scriptorium },
        { type: "Building", id: BuildingType.Farmstead },
        { type: "Building", id: BuildingType.StoneWorkshop },
        { type: "Unit", id: UnitType.Settler },
        { type: "Unit", id: UnitType.SpearGuard },
        { type: "Unit", id: UnitType.Riders },
    ];
    const conquest: BuildOption[] = [
        ...(shouldBuildScout ? [{ type: "Unit", id: UnitType.Scout } as BuildOption] : []),          // Early exploration
        { type: "Unit", id: UnitType.SpearGuard },
        { type: "Unit", id: UnitType.Riders },
        { type: "Unit", id: UnitType.BowGuard },
        { type: "Project", id: ProjectId.FormArmy_SpearGuard },
        { type: "Project", id: ProjectId.FormArmy_Riders },
        { type: "Project", id: ProjectId.FormArmy_BowGuard },
        { type: "Building", id: BuildingType.StoneWorkshop },
        { type: "Building", id: BuildingType.Farmstead },
        { type: "Unit", id: UnitType.Settler },
    ];
    const balanced: BuildOption[] = [
        ...(shouldBuildScout ? [{ type: "Unit", id: UnitType.Scout } as BuildOption] : []),          // Early exploration
        { type: "Unit", id: UnitType.Settler },
        { type: "Unit", id: UnitType.SpearGuard },
        { type: "Building", id: BuildingType.Farmstead },
        { type: "Building", id: BuildingType.StoneWorkshop },
        { type: "Building", id: BuildingType.Scriptorium },
        { type: "Unit", id: UnitType.Riders },
    ];

    let prioritized = goal === "Progress" ? progress : goal === "Conquest" ? conquest : balanced;

    if (personality.projectRush) {
        const rushType = personality.projectRush.type === "Building" ? "Building" : "Project";
        prioritized = [{ type: rushType, id: personality.projectRush.id as string }, ...prioritized];
    }

    if (personality.unitBias.navalWeight) {
        prioritized = [{ type: "Unit", id: UnitType.RiverBoat }, ...prioritized];
    }

    // Ensure at least one military pick near the top to avoid pure builder loops.
    const hasEarlyMilitary = prioritized.slice(0, 3).some(p => p.type === "Unit" && p.id !== UnitType.Settler);
    if (!hasEarlyMilitary) {
        prioritized = [{ type: "Unit", id: UnitType.SpearGuard }, ...prioritized];
    }

    // Remove duplicates (simple check)
    prioritized = prioritized.filter((v, i, a) => a.findIndex(t => t.type === v.type && t.id === v.id) === i);

    return prioritized;
}

/**
 * v0.98 Update 8: ForgeClans early military deterrence (toned down further)
 * ForgeClans gets attacked the most - they need early military to deter aggression
 * Reduced to 1 military per city, only first 15 turns (was 20, originally 25)
 */
function getForgeClansEarlyMilitaryPriorities(state: GameState, playerId: string, basePriorities: BuildOption[]): BuildOption[] {
    // Only apply in first 15 turns - after that, normal build priorities (was 20)
    if (state.turn > 15) {
        return basePriorities;
    }

    const myCities = state.cities.filter(c => c.ownerId === playerId);
    const myUnits = state.units.filter(u => u.ownerId === playerId);
    const militaryUnits = myUnits.filter(u =>
        u.type !== UnitType.Settler &&
        u.type !== UnitType.Scout &&
        u.type !== UnitType.RiverBoat
    );

    // Early game: 1-2 cities, need 1 military per city as minimum deterrence
    // Reduced from 2-per-city which was too strong
    const isEarlyGame = myCities.length <= 2;
    const needsMoreMilitary = militaryUnits.length < myCities.length;
    const scoutCount = myUnits.filter(u => u.type === UnitType.Scout).length;

    if (isEarlyGame && needsMoreMilitary) {
        console.info(`[AI Build] ForgeClans ${playerId} prioritizing military deterrence (${militaryUnits.length} military, ${myCities.length} cities)`);

        // Lighter military focus - one defender then continue normally
        const militaryFirst: BuildOption[] = [
            ...(scoutCount < 2 ? [{ type: "Unit", id: UnitType.Scout } as BuildOption] : []),           // Still need scouts early
            { type: "Unit", id: UnitType.SpearGuard },      // One defender
            { type: "Building", id: BuildingType.StoneWorkshop },  // Production boost
            { type: "Unit", id: UnitType.Settler },         // Can expand earlier now
            { type: "Building", id: BuildingType.Farmstead },
            { type: "Unit", id: UnitType.BowGuard },        // Then ranged support
        ];

        return militaryFirst;
    }

    return basePriorities;
}

export function pickCityBuilds(state: GameState, playerId: string, goal: AiVictoryGoal): GameState {
    let next = state;
    const personality = getPersonalityForPlayer(next, playerId);
    const desiredCities = personality.desiredCities ?? 3;
    const myCities = next.cities.filter(c => c.ownerId === playerId);
    const cityCountShort = myCities.length < desiredCities;
    const desiredShortfall = Math.max(0, desiredCities - myCities.length);
    const freeLandNear = myCities.some(c => {
        const ring = hexSpiral(c.coord, 4);
        return ring.some(coord => {
            const tile = next.map.tiles.find(t => hexEquals(t.coord, coord));
            return tile && !tile.ownerId && tile.terrain !== TerrainType.Mountain && tile.terrain !== TerrainType.DeepSea && tile.terrain !== TerrainType.Coast;
        });
    });
    const activeSettlers = next.units.filter(u => u.ownerId === playerId && u.type === UnitType.Settler).length;
    const settlersQueued = next.cities.filter(
        c => c.ownerId === playerId && c.currentBuild?.type === "Unit" && c.currentBuild.id === UnitType.Settler
    ).length;
    let settlersInFlight = activeSettlers + settlersQueued;
    const openCitySite = hasAvailableCitySite(next, playerId);
    const settlerCap = Math.max(1, Math.ceil(desiredShortfall / 2));
    const cityOrder = state.cities.filter(c => c.ownerId === playerId);
    const atWar = isAtWar(next, playerId);
    const priorities = buildPriorities(goal, personality, atWar, next, playerId);
    for (const city of cityOrder) {
        if (city.currentBuild) continue;
        for (const option of priorities) {
            if (option.type === "Unit" && option.id === UnitType.Settler) {
                const allowSettler = desiredShortfall > 0 && settlersInFlight < settlerCap && (cityCountShort || freeLandNear) && openCitySite;
                if (!allowSettler) continue;
                console.info(`[AI Build] ${playerId} queuing Settler in ${city.name} (cities=${myCities.length}/${desiredCities}, inFlight=${settlersInFlight})`);
                settlersInFlight++;
            }
            if (canBuild(city, option.type, option.id, next)) {
                // Log all builds (military and buildings are silent otherwise)
                if (option.type !== "Unit" || option.id !== UnitType.Settler) {
                    console.info(`[AI Build] ${playerId} queuing ${option.id} in ${city.name}`);
                }

                next = tryAction(next, {
                    type: "SetCityBuild",
                    playerId,
                    cityId: city.id,
                    buildType: option.type,
                    buildId: option.id,
                });
                break;
            }
        }
    }
    return next;
}

export function assignWorkedTiles(state: GameState, playerId: string, goal: AiVictoryGoal): GameState {
    let next = state;
    const cities = next.cities.filter(c => c.ownerId === playerId);
    for (const city of cities) {
        const priority = tileWorkingPriority(goal, city, next);
        const sorted = tilesByPriority(city, next, priority);
        const worked: typeof city.workedTiles = [city.coord];
        for (const tile of sorted) {
            if (worked.length >= city.pop) break;
            if (hexEquals(tile.coord, city.coord)) continue;
            worked.push(tile.coord);
        }
        next = tryAction(next, {
            type: "SetWorkedTiles",
            playerId,
            cityId: city.id,
            tiles: worked,
        });
    }
    return next;
}

// --- AI City Razing Logic (v0.96 balance) ---

function calculateIsolation(city: City, playerId: string, state: GameState): number {
    const friendlyCities = state.cities.filter(c => c.ownerId === playerId && c.id !== city.id);
    if (friendlyCities.length === 0) return Infinity;
    return Math.min(...friendlyCities.map(c => hexDistance(city.coord, c.coord)));
}

function calculateThreatLevel(city: City, playerId: string, state: GameState): number {
    const enemies = state.players.filter(p =>
        p.id !== playerId &&
        !p.isEliminated &&
        state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
    );

    if (enemies.length === 0) return 0;

    const enemyMilitary = state.units.filter(u =>
        enemies.some(e => e.id === u.ownerId) &&
        UNITS[u.type].domain !== "Civilian" &&
        hexDistance(city.coord, u.coord) <= 5
    );

    const ourMilitary = state.units.filter(u =>
        u.ownerId === playerId &&
        UNITS[u.type].domain !== "Civilian" &&
        hexDistance(city.coord, u.coord) <= 5
    );

    const enemyPower = enemyMilitary.reduce((sum, u) => sum + UNITS[u.type].atk + UNITS[u.type].def, 0);
    const ourPower = ourMilitary.reduce((sum, u) => sum + UNITS[u.type].atk + UNITS[u.type].def, 0);

    return ourPower > 0 ? enemyPower / ourPower : (enemyPower > 0 ? 10 : 0);
}

function calculateEconomicValue(city: City, state: GameState): number {
    // Sum F+P of workable tiles
    let total = 0;
    for (const coord of city.workedTiles) {
        const t = state.map.tiles.find(tile => hexEquals(tile.coord, coord));
        if (t) {
            const yields = getTileYields(t);
            total += yields.F + yields.P;
        }
    }
    return total;
}

function calculateDefensibility(city: City, playerId: string, state: GameState): number {
    let score = 0;

    // Has garrison?
    const hasGarrison = state.units.some(u =>
        u.ownerId === playerId &&
        hexEquals(u.coord, city.coord)
    );
    if (hasGarrison) score += 0.5;

    // Has City Ward?
    if (city.buildings.includes(BuildingType.CityWard)) score += 0.3;

    // City HP (higher HP = more defensible)
    const maxHp = city.maxHp || 20;
    score += (city.hp / maxHp) * 0.2;

    return score;
}

function evaluateCityForRazing(city: City, playerId: string, state: GameState): boolean {
    // Calculate strategic value factors
    const isolation = calculateIsolation(city, playerId, state);
    const threatLevel = calculateThreatLevel(city, playerId, state);
    const economicValue = calculateEconomicValue(city, state);
    const defensibility = calculateDefensibility(city, playerId, state);

    // Raze if:
    // - Very isolated (> 8 tiles from nearest friendly city)
    // - High threat (enemy military power > 1.5x our local military)
    // - Low economic value (< 3 F+P from workable tiles)
    // - Poor defensibility (< 0.5 score)

    const razeScore =
        (isolation > 8 ? 2 : 0) +
        (threatLevel > 1.5 ? 2 : 0) +
        (economicValue < 3 ? 1 : 0) +
        (defensibility < 0.5 ? 1 : 0);

    // Raze if score >= 3 (multiple bad factors)
    const shouldRaze = razeScore >= 3;

    if (shouldRaze) {
        console.info(`[AI Raze] ${playerId} considering razing ${city.name}: isolation=${isolation}, threat=${threatLevel.toFixed(2)}, econ=${economicValue}, def=${defensibility.toFixed(2)}, score=${razeScore}`);
    }

    return shouldRaze;
}

/**
 * Consider razing poorly situated cities to consolidate forces.
 * Called after combat, before end turn.
 */
export function considerRazing(state: GameState, playerId: string): GameState {
    let next = state;

    const playerCities = next.cities.filter(c => c.ownerId === playerId);

    // Never raze if we have <= 2 cities
    if (playerCities.length <= 2) return next;

    // Only consider razing during wartime
    if (!isAtWar(next, playerId)) return next;

    for (const city of playerCities) {
        // Never raze capitals
        if (city.isCapital) continue;

        // Never raze high-pop cities (too valuable)
        if (city.pop >= 4) continue;

        // Must have a garrison to raze
        const hasGarrison = next.units.some(u =>
            u.ownerId === playerId &&
            hexEquals(u.coord, city.coord)
        );
        if (!hasGarrison) continue;

        const shouldRaze = evaluateCityForRazing(city, playerId, next);

        if (shouldRaze) {
            console.info(`[AI Raze] ${playerId} razing ${city.name}`);
            next = tryAction(next, {
                type: "RazeCity",
                playerId,
                cityId: city.id,
            });
        }
    }

    return next;
}
