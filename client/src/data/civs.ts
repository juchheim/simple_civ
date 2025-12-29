export type CivId = "ForgeClans" | "ScholarKingdoms" | "RiverLeague" | "AetherianVanguard" | "StarborneSeekers" | "JadeCovenant";

export type CivOption = {
    id: CivId;
    title: string;
    summary: string;
    color: string;
    perk: string;
};

export const CIV_OPTIONS: CivOption[] = [
    {
        id: "ForgeClans",
        title: "Forge Clans",
        summary: "Industrial powerhouse with strong production and military might.",
        perk: "+1 Prod/Hill (Capital) • 20% cheaper military • +2 Atk if produced in a city with 2+ Hills • +1 Atk per Engine tech",
        color: "#f97316",
    },
    {
        id: "ScholarKingdoms",
        title: "Scholar Kingdoms",
        summary: "Science-focused kingdom with steadfast defensive capabilities.",
        perk: "+1 Science (Capital) • +1 Science per City Ward • +1 Defense (all units) • Unique: Lorekeeper, Bulwark",
        color: "#0ea5e9",
    },
    {
        id: "RiverLeague",
        title: "River League",
        summary: "Masters of river-based agriculture and trade warfare.",
        perk: "+1 Food/river • +1 Prod per 2 rivers • +2 Atk (all units) • +2 Atk/Def near rivers • +2 Atk vs cities",
        color: "#A0522D",
    },
    {
        id: "AetherianVanguard",
        title: "Aetherian Vanguard",
        summary: "Gains strength through combat and can summon the legendary Titan.",
        perk: "+1 Prod in cities with a garrisoned unit • +1 Defense (all units) • Science on kills • +1 Move after Titan's Core • Unique: Titan",
        color: "#9333ea",
    },
    {
        id: "StarborneSeekers",
        title: "Starborne Seekers",
        summary: "Explorers seeking cosmic enlightenment through peaceful research.",
        perk: "+1 Science (Capital) while at peace • +1 Defense (all units) • Unique: Lorekeeper, Bulwark",
        color: "#1e3a8a",
    },
    {
        id: "JadeCovenant",
        title: "Jade Covenant",
        summary: "Masters of growth and population-based power.",
        perk: "+2 Food/city • +1 Atk/Def per 16 pop • 15% faster growth • 20% cheaper Settlers (+2 Def, 2 Move) • Nature's Wrath: Enemies in your territory take 1 damage/turn",
        color: "#0f9d58",
    },
];

const FALLBACK_COLORS = ["#fbbf24", "#a855f7", "#f43f5e", "#14b8a6", "#94a3b8"];

function seededIndex(length: number, seed?: number): number {
    if (length <= 0) return 0;
    if (seed == null || Number.isNaN(seed)) {
        return Math.floor(Math.random() * length);
    }
    const value = Math.abs(Math.sin(seed) * 10000);
    return Math.floor(value % length);
}

export function pickAiCiv(excluded: CivId[], seed?: number): CivOption {
    const pool = CIV_OPTIONS.filter(c => !excluded.includes(c.id));
    if (pool.length === 0) return CIV_OPTIONS[0];
    const idx = seededIndex(pool.length, seed);
    return pool[idx] ?? pool[0];
}

export function pickPlayerColor(civName: CivId, used: Set<string>): string {
    const normalizedUsed = new Set(Array.from(used).map(c => c.toLowerCase()));
    const civColor = CIV_OPTIONS.find(c => c.id === civName)?.color;
    const palette = civColor ? [civColor, ...FALLBACK_COLORS] : FALLBACK_COLORS;

    for (const color of palette) {
        const key = color.toLowerCase();
        if (!normalizedUsed.has(key)) {
            normalizedUsed.add(key);
            used.add(key);
            return color;
        }
    }

    return civColor ?? "#22d3ee";
}
