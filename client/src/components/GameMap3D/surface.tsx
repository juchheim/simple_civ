import * as THREE from "three";
import type { WorldSurface } from "./projection";

export function WorldSurfaceShell({ surface }: { surface: WorldSurface }) {
    if (surface.kind === "sphere") {
        return (
            <mesh>
                <sphereGeometry args={[surface.radius - 0.05, 48, 24]} />
                <meshStandardMaterial color="#082f49" roughness={0.68} side={THREE.DoubleSide} />
            </mesh>
        );
    }

    return (
        <group>
            <mesh>
                <cylinderGeometry args={[surface.radius - 0.05, surface.radius - 0.05, surface.height + 0.8, 72, 1, false, 0, surface.wrapAngle]} />
                <meshStandardMaterial color="#082f49" roughness={0.7} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, surface.height / 2 + 0.38, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[surface.radius - 0.05, 72]} />
                <meshStandardMaterial color="#0c4a6e" roughness={0.72} />
            </mesh>
            <mesh position={[0, -surface.height / 2 - 0.38, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <circleGeometry args={[surface.radius - 0.05, 72]} />
                <meshStandardMaterial color="#0c4a6e" roughness={0.72} />
            </mesh>
        </group>
    );
}
