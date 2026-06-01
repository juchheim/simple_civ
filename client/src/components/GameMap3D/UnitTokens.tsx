import { Html } from "@react-three/drei";
import { UnitType } from "@simple-civ/engine";
import * as THREE from "three";
import { unitImages } from "../../assets";
import type { UnitDescriptor } from "../GameMap/UnitLayer";
import { HexRing } from "./primitives";
import type { Projector } from "./projection";
import { useBoardTexture } from "./textures";

function UnitToken({ descriptor, projector, stackOffset }: { descriptor: UnitDescriptor; projector: Projector; stackOffset: number }) {
    const texture = useBoardTexture(unitImages[descriptor.unit.type] || unitImages.Scout);
    const normal = projector.normalAt(descriptor.unit.coord);
    const tokenQuaternion = projector.orientationOf(descriptor.unit.coord);
    const decalQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    const isExhausted = descriptor.unit.movesLeft <= 0 && descriptor.unit.hasAttacked && !descriptor.unit.cpGranted;
    const baseElevation = 0.72 + stackOffset;
    const hpPct = Math.max(0, Math.min(1, descriptor.unit.hp / descriptor.unit.maxHp));

    return (
        <group>
            <mesh
                position={projector.positionOf(descriptor.unit.coord, baseElevation + 0.1)}
                quaternion={tokenQuaternion}
                scale={[0.58, 0.2, 0.58]}
            >
                <cylinderGeometry args={[1, 1, 1, 6]} />
                <meshStandardMaterial color={descriptor.color} roughness={0.74} opacity={isExhausted ? 0.62 : 1} transparent={isExhausted} />
            </mesh>
            <mesh
                position={projector.positionOf(descriptor.unit.coord, baseElevation + 0.205)}
                quaternion={decalQuaternion}
            >
                <circleGeometry args={[0.56, 6]} />
                <meshBasicMaterial map={texture} transparent alphaTest={0.04} opacity={isExhausted ? 0.62 : 1} side={THREE.DoubleSide} />
            </mesh>
            {(descriptor.isSelected || descriptor.isLinkedPartner) && (
                <HexRing
                    coord={descriptor.unit.coord}
                    projector={projector}
                    elevation={baseElevation + 0.24}
                    color={descriptor.isSelected ? "#facc15" : "#ffffff"}
                    scale={0.74}
                />
            )}
            {descriptor.unit.statusEffects?.includes("NaturesWrath") && (
                <HexRing coord={descriptor.unit.coord} projector={projector} elevation={baseElevation + 0.25} color="#10b981" scale={0.84} opacity={0.8} />
            )}
            {descriptor.canMove && !descriptor.isSelected && (
                <mesh position={projector.positionOf(descriptor.unit.coord, baseElevation + 0.45)}>
                    <sphereGeometry args={[0.1, 8, 8]} />
                    <meshBasicMaterial color="#4ade80" />
                </mesh>
            )}
            {descriptor.unit.type !== UnitType.Settler && (
                <Html position={projector.positionOf(descriptor.unit.coord, baseElevation + 0.72)} center distanceFactor={8} style={{ pointerEvents: "none" }}>
                    <div style={{ width: 48, height: 5, background: "#111827", border: "1px solid #020617" }}>
                        <div style={{ width: `${hpPct * 100}%`, height: "100%", background: hpPct > 0.5 ? "#22c55e" : hpPct > 0.25 ? "#eab308" : "#ef4444" }} />
                    </div>
                </Html>
            )}
        </group>
    );
}

export function UnitTokens({
    units,
    projector,
    onCity,
}: {
    units: UnitDescriptor[];
    projector: Projector;
    onCity?: boolean;
}) {
    return (
        <>
            {units.map((descriptor, index) => (
                <UnitToken
                    key={descriptor.unit.id}
                    descriptor={descriptor}
                    projector={projector}
                    stackOffset={(onCity ? 0.32 : 0) + index * 0.002}
                />
            ))}
        </>
    );
}
