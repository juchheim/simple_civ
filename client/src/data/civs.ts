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
        perk: "+1 Production per Hill (Capital) • Military 10% cheaper • +1 Attack per Engine tech",
        color: "#f97316",
    },
    {
        id: "ScholarKingdoms",
        title: "Scholar Kingdoms",
        summary: "Science-focused with defensive bonuses near their learning centers.",
        perk: "+1 Science in Capital • +1 Science per CityWard • Scaling Defense: +6 distributed across all cities",
        color: "#0ea5e9",
    },
    {
        id: "RiverLeague",
        title: "River League",
        summary: "Masters of river-based agriculture and industry.",
        perk: "+1 Food per river tile • +1 Prod per 2 river tiles • Units near rivers +1 Atk/+1 Def",
        color: "#A0522D",
    },
    {
        id: "AetherianVanguard",
        title: "Aetherian Vanguard",
        summary: "Gains strength through the ages and can summon the legendary Titan.",
        perk: "+1 Prod (Capital) • +2 HP per era (max +6) • Science from kills • Titan's Core (80)",
        color: "#9333ea",
    },
    {
        id: "StarborneSeekers",
        title: "Starborne Seekers",
        summary: "Explorers seeking cosmic enlightenment through technology.",
        perk: "Extra Scout • +1 Defense (everywhere) • +1 Science when at Peace • Spirit Observatory (220)",
        color: "#1e3a8a",
    },
    {
        id: "JadeCovenant",
        title: "Jade Covenant",
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
