import { OverlayType } from "@simple-civ/engine";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { terrainImages } from "../../assets";
import type { TileRenderEntry } from "../../hooks/useRenderData";
import { getTerrainElevation } from "./elevation";
import { ProjectedHexDecal } from "./primitives";
import type { Projector } from "./projection";
import { useBoardTexture } from "./textures";

const OVERLAY_TEXTURES: Partial<Record<OverlayType, string>> = {
    [OverlayType.GoodieHut]: terrainImages.GoodieHut,
    [OverlayType.NativeCamp]: terrainImages.NativeCamp,
    [OverlayType.ClearedSettlement]: terrainImages.ClearedSettlement,
};

const RESOURCE_COLORS: Partial<Record<OverlayType, string>> = {
    [OverlayType.RichSoil]: "#84cc16",
    [OverlayType.OreVein]: "#f59e0b",
    [OverlayType.SacredSite]: "#fde68a",
};

function OverlaySprite({
    url,
    coord,
    projector,
    elevation,
}: {
    url: string;
    coord: { q: number; r: number };
    projector: Projector;
    elevation: number;
}) {
    const texture = useBoardTexture(url);
    return (
        <ProjectedHexDecal coord={coord} projector={projector} elevation={elevation} scale={0.72}>
            <meshBasicMaterial map={texture} transparent alphaTest={0.08} depthWrite={false} side={THREE.DoubleSide} />
        </ProjectedHexDecal>
    );
}

export function OverlayDecals({
    entries,
    projector,
    showTileYields,
}: {
    entries: TileRenderEntry[];
    projector: Projector;
    showTileYields: boolean;
}) {
    return (
        <>
            {entries.flatMap(entry => {
                if (!entry.visibility.isVisible && !entry.visibility.isFogged) return [];
                const elevation = getTerrainElevation(entry.tile.terrain) + 0.025;
                return entry.tile.overlays
                    .filter(overlay => overlay !== OverlayType.RiverEdge)
                    .map((overlay, index) => {
                        const texture = OVERLAY_TEXTURES[overlay];
                        if (texture) {
                            return (
                                <OverlaySprite
                                    key={`${entry.key}-${overlay}-${index}`}
                                    url={texture}
                                    coord={entry.tile.coord}
                                    projector={projector}
                                    elevation={elevation + index * 0.01}
                                />
                            );
                        }

                        return (
                            <ProjectedHexDecal
                                key={`${entry.key}-${overlay}-${index}`}
                                coord={entry.tile.coord}
                                projector={projector}
                                elevation={elevation + 0.025 + index * 0.035}
                                scale={0.17}
                            >
                                <meshBasicMaterial color={RESOURCE_COLORS[overlay] ?? "#ffffff"} side={THREE.DoubleSide} />
                            </ProjectedHexDecal>
                        );
                    });
            })}
            {showTileYields && entries
                .filter(entry => entry.visibility.isVisible || entry.visibility.isFogged)
                .map(entry => (
                    <Html
                        key={`yield-${entry.key}`}
                        position={projector.positionOf(entry.tile.coord, getTerrainElevation(entry.tile.terrain) + 0.09)}
                        center
                        distanceFactor={8}
                        style={{ pointerEvents: "none" }}
                    >
                        <div style={{ padding: "1px 4px", borderRadius: 5, background: "rgba(2,6,23,0.72)", color: "#f8fafc", fontSize: 8, fontWeight: 700, whiteSpace: "nowrap" }}>
                            {entry.yields.F}F {entry.yields.P}P {entry.yields.S}S {entry.yields.G}G
                        </div>
                    </Html>
                ))}
        </>
    );
}
