import { HexCoord, TerrainType } from "@simple-civ/engine";
import { terrainImages } from "../../assets";

export type Point = { x: number; y: number };

export function getTerrainColor(type: TerrainType): string {
    switch (type) {
        case "Plains": return "#86efac";
        case "Hills": return "#fde047";
        case "Forest": return "#166534";
        case "Marsh": return "#14b8a6";
        case "Desert": return "#fcd34d";
        case "Mountain": return "#57534e";
        case "Coast": return "#60a5fa";
        case "DeepSea": return "#1e3a8a";
        default: return "#ccc";
    }
}

export function getTerrainImage(type: TerrainType): string | null {
    return terrainImages[type] ?? null;
}

export function getHexPoints(hexSize: number): string {
    const points: string[] = [];
    for (let i = 0; i < 6; i++) {
        const angleDeg = 60 * i - 30;
        const angleRad = (Math.PI / 180) * angleDeg;
        points.push(`${hexSize * Math.cos(angleRad)},${hexSize * Math.sin(angleRad)}`);
    }
    return points.join(" ");
}

export function getHexCornerOffsets(hexSize: number): Point[] {
    const offsets: Point[] = [];
    for (let i = 0; i < 6; i++) {
        const angleDeg = 60 * i - 30;
        const angleRad = (Math.PI / 180) * angleDeg;
        offsets.push({
            x: hexSize * Math.cos(angleRad),
            y: hexSize * Math.sin(angleRad),
        });
    }
    return offsets;
}

export function hexToPixel(hex: HexCoord, hexSize: number): Point {
    const x = hexSize * (Math.sqrt(3) * hex.q + (Math.sqrt(3) / 2) * hex.r);
    const y = hexSize * ((3 / 2) * hex.r);
    return { x, y };
}

export function squaredDistance(a: Point, b: Point): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
}

