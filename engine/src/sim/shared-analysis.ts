import { GameState, UnitType, DiplomacyState, TechId, ProjectId, BuildingType } from "../core/types.js";
import { UNITS } from "../core/constants.js";

// Simple military power estimation
export function estimateMilitaryPower(playerId: string, state: GameState): number {
    const units = state.units.filter(u => u.ownerId === playerId);
    let power = 0;
    units.forEach(u => {
        const stats = UNITS[u.type];
        power += stats.atk + stats.def + (u.hp / stats.hp) * 2; // Weight by HP remaining
    });
    return power;
}

export type CivName =
    | "ForgeClans"
    | "ScholarKingdoms"
    | "RiverLeague"
    | "AetherianVanguard"
    | "StarborneSeekers"
    | "JadeCovenant";

export type Event =
    | { type: "WarDeclaration"; turn: number; initiator: string; target: string; initiatorPower: number; targetPower: number }
    | { type: "PeaceTreaty"; turn: number; civ1: string; civ2: string }
    | { type: "UnitDeath"; turn: number; unitId: string; unitType: UnitType; owner: string; killedBy?: string }
    | { type: "UnitProduction"; turn: number; cityId: string; owner: string; unitType: UnitType; unitId?: string }
    | { type: "CityCapture"; turn: number; cityId: string; from: string; to: string }
    | { type: "CityFound"; turn: number; cityId: string; owner: string }
    | { type: "CityRaze"; turn: number; cityId: string; owner: string }
    | { type: "TechComplete"; turn: number; civ: string; tech: TechId }
    | { type: "ProjectComplete"; turn: number; civ: string; project: ProjectId }
    | { type: "BuildingComplete"; turn: number; cityId: string; owner: string; building: BuildingType }
    | { type: "Contact"; turn: number; civ1: string; civ2: string }
    | { type: "SharedVision"; turn: number; civ1: string; civ2: string; action: "offer" | "accept" | "revoke" }
    | { type: "Elimination"; turn: number; eliminated: string; by?: string }
    | { type: "TitanSpawn"; turn: number; owner: string; unitId: string; unitCount: number }
    | { type: "TitanDeath"; turn: number; owner: string; killedBy?: string }
    | { type: "TitanKill"; turn: number; owner: string; victimType: string }
    | { type: "TitanStep"; turn: number; owner: string; supportCount: number }
    | { type: "ScavengerDoctrineScience"; turn: number; owner: string; victimType: UnitType; scienceGain: number };

export type TurnSnapshot = {
    turn: number;
    civs: {
        id: string;
        civName: string;
        cities: number;
        totalPop: number;
        techs: number;
        projects: number;
        units: number;
        militaryPower: number;
        totalProduction: number;
        totalScience: number;
        isEliminated: boolean;
        scavengerDoctrineStats?: { kills: number; scienceGained: number }; // AetherianVanguard tracking
        titanStats?: { kills: number; cityCaptures: number; deathballCaptures: number }; // Titan performance tracking
    }[];
    cities: {
        id: string;
        owner: string;
        pop: number;
        buildings: BuildingType[];
    }[];
    units: {
        id: string;
        owner: string;
        type: UnitType;
    }[];
    diplomacy: {
        civ1: string;
        civ2: string;
        state: DiplomacyState;
    }[];
};

// Seeded random number generator for reproducible civ selection
export function seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
        // Park-Miller minimal standard LCG with explicit modulus
        s = (Math.imul(48271, s) | 0) % 2147483647;
        return (s & 2147483647) / 2147483648;
    };
}

// Fisher-Yates shuffle with seeded random
export function shuffleWithSeed<T>(array: T[], seed: number): T[] {
    const result = [...array];
    const random = seededRandom(seed);
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

export function civList(limit?: number, seed?: number): { id: string; civName: CivName; color: string; ai: boolean }[] {
    const allCivs: CivName[] = [
        "ForgeClans",
        "ScholarKingdoms",
        "RiverLeague",
        "AetherianVanguard",
        "StarborneSeekers",
        "JadeCovenant",
    ];
    const shuffled = seed !== undefined ? shuffleWithSeed(allCivs, seed) : allCivs;
    const chosen = limit ? shuffled.slice(0, limit) : shuffled;
    const rng = seed !== undefined ? seededRandom(seed + 17) : Math.random;
    const colors = ["#e25822", "#4b9be0", "#2fa866", "#8a4dd2", "#f4b400", "#888888"];
    return chosen.map((civ, idx) => {
        const fallback = `#${((rng() * 0xffffff) | 0).toString(16).padStart(6, "0")}`;
        return {
            id: `p${idx + 1}`,
            civName: civ,
            color: colors[idx] ?? fallback,
            ai: true,
        };
    });
}

export function calculateCivStats(state: GameState, civId: string) {
    const player = state.players.find(p => p.id === civId);
    if (!player) return null;

    const cities = state.cities.filter(c => c.ownerId === civId);
    const units = state.units.filter(u => u.ownerId === civId);
    const totalPop = cities.reduce((sum, c) => sum + c.pop, 0);

    const totalProduction = cities.reduce((sum, c) => {
        let prod = c.pop;
        if (c.buildings.includes(BuildingType.StoneWorkshop)) prod += 1;
        if (c.buildings.includes(BuildingType.LumberMill)) prod += 1;
        if (c.buildings.includes(BuildingType.Forgeworks)) prod += 2;
        if (c.buildings.includes(BuildingType.CitySquare)) prod += 1;
        return sum + prod;
    }, 0);

    const totalScience = cities.length +
        (cities.filter(c => c.buildings.includes(BuildingType.Scriptorium)).length) +
        (cities.filter(c => c.buildings.includes(BuildingType.Academy)).length * 2) +
        (player.techs.includes(TechId.SignalRelay) ? cities.length : 0);

    return {
        id: civId,
        civName: player.civName,
        cities: cities.length,
        totalPop,
        totalProduction,
        totalScience,
        techs: player.techs.length,
        projects: player.completedProjects.length,
        units: units.length,
        militaryPower: estimateMilitaryPower(civId, state),
        isEliminated: player.isEliminated || false,
        scavengerDoctrineStats: player.scavengerDoctrineStats,
        titanStats: player.titanStats,
    };
}

export function createTurnSnapshot(state: GameState): TurnSnapshot {
    const civs = state.players.map(p => calculateCivStats(state, p.id)).filter(s => s !== null) as any[];

    return {
        turn: state.turn,
        civs,
        cities: state.cities.map(c => ({
            id: c.id,
            owner: c.ownerId,
            pop: c.pop,
            buildings: [...c.buildings],
        })),
        units: state.units.map(u => ({
            id: u.id,
            owner: u.ownerId,
            type: u.type,
        })),
        diplomacy: [],
    };
}
