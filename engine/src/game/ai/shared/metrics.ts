import { hexDistance } from "../../../core/hex.js";
import { HexCoord } from "../../../core/types.js";

export function sortByDistance<T>(origin: HexCoord, items: T[], getCoord: (item: T) => HexCoord): T[] {
    return [...items].sort(
        (a, b) => hexDistance(getCoord(a), origin) - hexDistance(getCoord(b), origin)
    );
}

export function nearestByDistance<T>(origin: HexCoord, items: T[], getCoord: (item: T) => HexCoord): T | null {
    const sorted = sortByDistance(origin, items, getCoord);
    return sorted[0] ?? null;
}

