export function clamp01(x: number): number {
    if (x < 0) return 0;
    if (x > 1) return 1;
    return x;
}

export function clamp(min: number, x: number, max: number): number {
    return Math.max(min, Math.min(max, x));
}

export function pickBest<T>(items: T[], score: (t: T) => number): { item: T; score: number } | null {
    let best: T | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const it of items) {
        const s = score(it);
        if (s > bestScore) {
            best = it;
            bestScore = s;
        }
    }
    return best ? { item: best, score: bestScore } : null;
}







