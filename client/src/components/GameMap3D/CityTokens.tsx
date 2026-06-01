import { Html } from "@react-three/drei";
import { BuildingType } from "@simple-civ/engine";
import * as THREE from "three";
import { cityImages, overlayImages } from "../../assets";
import type { CityOverlayDescriptor } from "../GameMap/CityLayer";
import { ProjectedHexDecal, ProjectedHexToken } from "./primitives";
import type { Projector } from "./projection";
import { useBoardTexture } from "./textures";

function CityToken({ overlay, projector }: { overlay: CityOverlayDescriptor; projector: Projector }) {
    const texture = useBoardTexture(cityImages[Math.min(overlay.city.pop, 10)]);
    const bulwarkTexture = useBoardTexture(overlayImages.Bulwark);
    const baseElevation = 0.34;
    const hpPct = Math.max(0, Math.min(1, overlay.city.hp / overlay.city.maxHp));

    return (
        <group>
            <ProjectedHexToken
                coord={overlay.city.coord}
                projector={projector}
                bottomElevation={baseElevation}
                topElevation={baseElevation + 0.28}
                scale={0.9}
            >
                <meshStandardMaterial color={overlay.strokeColor} roughness={0.72} />
            </ProjectedHexToken>
            <ProjectedHexDecal
                coord={overlay.city.coord}
                projector={projector}
                elevation={baseElevation + 0.285}
                scale={0.86}
            >
                <meshBasicMaterial map={texture} transparent alphaTest={0.04} side={THREE.DoubleSide} />
            </ProjectedHexDecal>
            {overlay.city.buildings.includes(BuildingType.Bulwark) && (
                <ProjectedHexDecal
                    coord={overlay.city.coord}
                    projector={projector}
                    elevation={baseElevation + 0.3}
                    scale={0.89}
                >
                    <meshBasicMaterial map={bulwarkTexture} transparent alphaTest={0.04} side={THREE.DoubleSide} />
                </ProjectedHexDecal>
            )}
            <Html
                position={projector.positionOf(overlay.city.coord, baseElevation + 0.8)}
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

export function CityTokens({ overlays, projector }: { overlays: CityOverlayDescriptor[]; projector: Projector }) {
    return <>{overlays.map(overlay => <CityToken key={overlay.key} overlay={overlay} projector={projector} />)}</>;
}
