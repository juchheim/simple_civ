import { Html } from "@react-three/drei";
import { BuildingType } from "@simple-civ/engine";
import * as THREE from "three";
import { cityImages, overlayImages } from "../../assets";
import type { CityOverlayDescriptor } from "../GameMap/CityLayer";
import type { Projector } from "./projection";
import { useBoardTexture } from "./textures";

function CityToken({ overlay, projector }: { overlay: CityOverlayDescriptor; projector: Projector }) {
    const texture = useBoardTexture(cityImages[Math.min(overlay.city.pop, 10)]);
    const bulwarkTexture = useBoardTexture(overlayImages.Bulwark);
    const normal = projector.normalAt(overlay.city.coord);
    const tokenQuaternion = projector.orientationOf(overlay.city.coord);
    const decalQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    const baseElevation = 0.34;
    const hpPct = Math.max(0, Math.min(1, overlay.city.hp / overlay.city.maxHp));

    return (
        <group>
            <mesh
                position={projector.positionOf(overlay.city.coord, baseElevation + 0.14)}
                quaternion={tokenQuaternion}
                scale={[0.86, 0.28, 0.86]}
            >
                <cylinderGeometry args={[1, 1, 1, 6]} />
                <meshStandardMaterial color={overlay.strokeColor} roughness={0.72} />
            </mesh>
            <mesh
                position={projector.positionOf(overlay.city.coord, baseElevation + 0.285)}
                quaternion={decalQuaternion}
            >
                <circleGeometry args={[0.84, 6]} />
                <meshBasicMaterial map={texture} transparent alphaTest={0.04} side={THREE.DoubleSide} />
            </mesh>
            {overlay.city.buildings.includes(BuildingType.Bulwark) && (
                <mesh
                    position={projector.positionOf(overlay.city.coord, baseElevation + 0.3)}
                    quaternion={decalQuaternion}
                >
                    <circleGeometry args={[0.87, 6]} />
                    <meshBasicMaterial map={bulwarkTexture} transparent alphaTest={0.04} side={THREE.DoubleSide} />
                </mesh>
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
