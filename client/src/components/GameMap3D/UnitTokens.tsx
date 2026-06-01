import { Html } from "@react-three/drei";
import { UnitType } from "@simple-civ/engine";
import * as THREE from "three";
import { unitImages } from "../../assets";
import type { UnitDescriptor } from "../GameMap/UnitLayer";
import { HexRing, ProjectedHexDecal, ProjectedHexToken } from "./primitives";
import type { Projector } from "./projection";
import { useBoardTexture } from "./textures";

const UNIT_TOKEN_CLEARANCE = 0.018;
const UNIT_TOKEN_DEPTH = 0.1;

function darkenColor(color: string): string {
    return new THREE.Color(color).multiplyScalar(0.5).getStyle();
}

function UnitToken({
    descriptor,
    projector,
    stackOffset,
    getGroundElevation,
}: {
    descriptor: UnitDescriptor;
    projector: Projector;
    stackOffset: number;
    getGroundElevation: (coord: UnitDescriptor["unit"]["coord"]) => number;
}) {
    const texture = useBoardTexture(unitImages[descriptor.unit.type] || unitImages.Scout);
    const isExhausted = descriptor.unit.movesLeft <= 0 && descriptor.unit.hasAttacked && !descriptor.unit.cpGranted;
    const baseElevation = getGroundElevation(descriptor.unit.coord) + UNIT_TOKEN_CLEARANCE + stackOffset;
    const topElevation = baseElevation + UNIT_TOKEN_DEPTH;
    const hpPct = Math.max(0, Math.min(1, descriptor.unit.hp / descriptor.unit.maxHp));

    return (
        <group>
            <ProjectedHexToken
                coord={descriptor.unit.coord}
                projector={projector}
                bottomElevation={baseElevation}
                topElevation={topElevation}
                scale={0.78}
                sideColor={darkenColor(descriptor.color)}
            >
                <meshStandardMaterial color={descriptor.color} roughness={0.74} opacity={isExhausted ? 0.62 : 1} transparent={isExhausted} />
            </ProjectedHexToken>
            <ProjectedHexDecal
                coord={descriptor.unit.coord}
                projector={projector}
                elevation={topElevation + 0.005}
                scale={0.74}
            >
                <meshBasicMaterial map={texture} transparent alphaTest={0.04} opacity={isExhausted ? 0.62 : 1} side={THREE.DoubleSide} />
            </ProjectedHexDecal>
            {(descriptor.isSelected || descriptor.isLinkedPartner) && (
                <HexRing
                    coord={descriptor.unit.coord}
                    projector={projector}
                    elevation={topElevation + 0.01}
                    color={descriptor.isSelected ? "#facc15" : "#ffffff"}
                    scale={0.74}
                />
            )}
            {descriptor.unit.statusEffects?.includes("NaturesWrath") && (
                <HexRing coord={descriptor.unit.coord} projector={projector} elevation={topElevation + 0.015} color="#10b981" scale={0.84} opacity={0.8} />
            )}
            {descriptor.canMove && !descriptor.isSelected && (
                <mesh position={projector.positionOf(descriptor.unit.coord, topElevation + 0.22)}>
                    <sphereGeometry args={[0.1, 8, 8]} />
                    <meshBasicMaterial color="#4ade80" />
                </mesh>
            )}
            {descriptor.unit.type !== UnitType.Settler && (
                <Html position={projector.positionOf(descriptor.unit.coord, topElevation + 0.48)} center distanceFactor={8} style={{ pointerEvents: "none" }}>
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
    getGroundElevation,
}: {
    units: UnitDescriptor[];
    projector: Projector;
    onCity?: boolean;
    getGroundElevation: (coord: UnitDescriptor["unit"]["coord"]) => number;
}) {
    return (
        <>
            {units.map((descriptor, index) => (
                <UnitToken
                    key={descriptor.unit.id}
                    descriptor={descriptor}
                    projector={projector}
                    stackOffset={(onCity ? 0.14 : 0) + index * 0.002}
                    getGroundElevation={getGroundElevation}
                />
            ))}
        </>
    );
}
