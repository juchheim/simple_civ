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
        summary: "Industrial powerhouse with strong production and late-game military.",
        perk: "+1 Prod/Hill (Capital) • 25% cheaper military • +1 Attack (all) • +1 Attack/Engine tech",
        color: "#f97316",
    },
    {
        id: "ScholarKingdoms",
        title: "Scholar Kingdoms",
        summary: "Science-focused with defensive bonuses near their learning centers.",
        perk: "Starts with BowGuard • +1 Science in Capital • +1 Science/CityWard • +8 Defense (split across cities)",
        color: "#0ea5e9",
    },
    {
        id: "RiverLeague",
        title: "River League",
        summary: "Masters of river-based agriculture and industry.",
        perk: "+1 Food/river tile • +1 Prod/2 river tiles • +2 Atk/+2 Def near rivers • +1 Atk vs cities",
        color: "#A0522D",
    },
    {
        id: "AetherianVanguard",
        title: "AetherianVanguard",
        summary: "Gains strength through the ages and can summon the legendary Titan.",
        perk: "+1 Prod w/ garrison • Science on kills • +2 HP/era (max +6) • Titan's Core",
        color: "#9333ea",
    },
    {
        id: "StarborneSeekers",
        title: "Starborne Seekers",
        summary: "Explorers seeking cosmic enlightenment through technology.",
        perk: "+1 Science at peace • +1 Defense everywhere • Spirit Observatory: +5 Sci/+4 Food",
        color: "#1e3a8a",
    },
    {
        id: "JadeCovenant",
        title: "Jade Covenant",
        summary: "Masters of growth and population-based power.",
        perk: "Cities start +5 Food • 20% faster growth • 30% cheaper settlers (3 move) • +1 Atk/Def per 4 pop • Nature's Wrath: enemy units take 1 damage in their territory",
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
