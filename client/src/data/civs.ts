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
        title: "ForgeClans",
        summary: "Industrial powerhouse with strong production and late-game military.",
        perk: "+1 Production per Hill (Capital) • Projects 20% faster • Military 20% cheaper • +1 Attack per Engine tech",
        color: "#f97316",
    },
    {
        id: "ScholarKingdoms",
        title: "Scholar Kingdoms",
        summary: "Science-focused with defensive bonuses near their learning centers.",
        perk: "Capital +1 Sci • Units near cities +2 Defense",
        color: "#0ea5e9",
    },
    {
        id: "RiverLeague",
        title: "River League",
        summary: "Thrives along waterways with triple yield bonuses.",
        perk: "+1 Food per river tile • River cities: +1 Prod, +1 Sci • +1 Prod per 2 river tiles",
        color: "#A0522D",
    },
    {
        id: "AetherianVanguard",
        title: "The Aetherian Vanguard",
        summary: "Gains power through the ages and summons a legendary Titan.",
        perk: "Units +2 HP per era (max +6) • Scavenger Doctrine: Science on Kill • Can build Titan's Core (100)",
        color: "#9333ea",
    },
    {
        id: "StarborneSeekers",
        title: "The Starborne Seekers",
        summary: "Explorers seeking cosmic enlightenment through technology.",
        perk: "Starts with Scout + SpearGuard • Units near capital +1 Defense • Spirit Observatory (300)",
        color: "#1e3a8a",
    },
    {
        id: "JadeCovenant",
        title: "The Jade Covenant",
        summary: "Masters of growth and population-based military power.",
        perk: "Cities start +5 Food • 10% cheaper growth • Settlers have 10 HP & 3 Move • Units +1 Atk/Def per 8 Pop • Nature's Wrath: Enemies take 1 dmg/turn in territory • Jade Granary (30)",
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
