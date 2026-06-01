import { Html } from "@react-three/drei";
import { BuildingType } from "@simple-civ/engine";
import * as THREE from "three";
import { cityImages, overlayImages } from "../../assets";
import type { CityOverlayDescriptor } from "../GameMap/CityLayer";
import { ProjectedHexDecal, ProjectedHexToken } from "./primitives";
import type { Projector } from "./projection";
import { useBoardTexture } from "./textures";

const CITY_TOKEN_CLEARANCE = 0.018;
const CITY_TOKEN_DEPTH = 0.11;

function darkenColor(color: string): string {
    return new THREE.Color(color).multiplyScalar(0.5).getStyle();
}

function CityToken({
    overlay,
    projector,
    getGroundElevation,
}: {
    overlay: CityOverlayDescriptor;
    projector: Projector;
    getGroundElevation: (coord: CityOverlayDescriptor["city"]["coord"]) => number;
}) {
    const texture = useBoardTexture(cityImages[Math.min(overlay.city.pop, 10)]);
    const bulwarkTexture = useBoardTexture(overlayImages.Bulwark);
    const baseElevation = getGroundElevation(overlay.city.coord) + CITY_TOKEN_CLEARANCE;
    const topElevation = baseElevation + CITY_TOKEN_DEPTH;
    const hpPct = Math.max(0, Math.min(1, overlay.city.hp / overlay.city.maxHp));

    return (
        <group>
            <ProjectedHexToken
                coord={overlay.city.coord}
                projector={projector}
                bottomElevation={baseElevation}
                topElevation={topElevation}
                scale={0.9}
                sideColor={darkenColor(overlay.strokeColor)}
            >
                <meshStandardMaterial color={overlay.strokeColor} roughness={0.72} />
            </ProjectedHexToken>
            <ProjectedHexDecal
                coord={overlay.city.coord}
                projector={projector}
                elevation={topElevation + 0.005}
                scale={0.86}
            >
                <meshBasicMaterial map={texture} transparent alphaTest={0.04} side={THREE.DoubleSide} />
            </ProjectedHexDecal>
            {overlay.city.buildings.includes(BuildingType.Bulwark) && (
                <ProjectedHexDecal
                    coord={overlay.city.coord}
                    projector={projector}
                    elevation={topElevation + 0.01}
                    scale={0.89}
                >
                    <meshBasicMaterial map={bulwarkTexture} transparent alphaTest={0.04} side={THREE.DoubleSide} />
                </ProjectedHexDecal>
            )}
            <Html
                position={projector.positionOf(overlay.city.coord, topElevation + 0.45)}
                center
                distanceFactor={8}
                style={{ pointerEvents: "none" }}
            >
                <div style={{ minWidth: 88, color: "white", textAlign: "center", textShadow: "0 1px 3px #000", fontSize: 11, fontWeight: 700 }}>
                    <div style={{ height: 4, background: "#111827", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${hpPct * 100}%`, height: "100%", background: hpPct > 0.5 ? "#4ade80" : "#ef4444" }} />
                    </div>
                    <div>{overlay.city.isCapital ? "* " : ""}{overlay.city.name} ({overlay.city.pop})</div>
                </div>
            </Html>
        </group>
    );
}

export function CityTokens({
    overlays,
    projector,
    getGroundElevation,
}: {
    overlays: CityOverlayDescriptor[];
    projector: Projector;
    getGroundElevation: (coord: CityOverlayDescriptor["city"]["coord"]) => number;
}) {
    return <>{overlays.map(overlay => <CityToken key={overlay.key} overlay={overlay} projector={projector} getGroundElevation={getGroundElevation} />)}</>;
}
