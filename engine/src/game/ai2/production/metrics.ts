import type { InfluenceMaps } from "../influence-map.js";
import { clamp01 } from "../util.js";

export type CapabilityGapShape = Partial<{
    needSiege: number;
    needCapture: number;
    needDefense: number;
    needVision: number;
    needGarrison: number;
}>;

export function computeGapSeverity(gaps: CapabilityGapShape | null | undefined, cityCount: number): number {
    if (!gaps || typeof gaps.needSiege !== "number") return 0;
    const gapTotal =
        (gaps.needSiege ?? 0) +
        (gaps.needCapture ?? 0) +
        (gaps.needDefense ?? 0) +
        (gaps.needVision ?? 0) +
        (gaps.needGarrison ?? 0);
    const scale = Math.max(1, cityCount + 2);
    return clamp01(gapTotal / scale);
}

export function computeExpansionNeed(desiredCities: number, cityCount: number): number {
    if (desiredCities <= 0) return 0;
    return clamp01((desiredCities - cityCount) / desiredCities);
}

export function getInfluenceRatio(
    layer: InfluenceMaps["threat"] | undefined,
    coord: { q: number; r: number }
): number {
    if (!layer || layer.max <= 0) return 0;
    return clamp01(layer.get(coord) / layer.max);
}
