import { useLoader } from "@react-three/fiber";
import * as THREE from "three";

export function useBoardTexture(url: string): THREE.Texture {
    const texture = useLoader(THREE.TextureLoader, url);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.anisotropy = 4;
    return texture;
}
