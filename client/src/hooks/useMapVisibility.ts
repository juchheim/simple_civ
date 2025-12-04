import { useMemo } from "react";
import { GameState, Tile } from "@simple-civ/engine";

export type TileVisibilityState = { isVisible: boolean; isFogged: boolean; isShroud: boolean };

const FALLBACK_VISIBILITY: TileVisibilityState = { isVisible: false, isFogged: false, isShroud: true };

const RENDER_BUFFER_RADIUS = 2;
const RENDER_OFFSETS: { q: number; r: number }[] = [];
for (let q = -RENDER_BUFFER_RADIUS; q <= RENDER_BUFFER_RADIUS; q++) {
    const r1 = Math.max(-RENDER_BUFFER_RADIUS, -q - RENDER_BUFFER_RADIUS);
    const r2 = Math.min(RENDER_BUFFER_RADIUS, -q + RENDER_BUFFER_RADIUS);
    for (let r = r1; r <= r2; r++) {
        RENDER_OFFSETS.push({ q, r });
    }
}

type MapVisibilityParams = {
    gameState: GameState;
    playerId: string;
    map: { tiles: Tile[] };
};

export const useMapVisibility = ({ gameState, playerId, map }: MapVisibilityParams) => {
    const visibleSet = useMemo(() => new Set(gameState.visibility?.[playerId] ?? []), [gameState, playerId]);
    const revealedSet = useMemo(() => new Set(gameState.revealed?.[playerId] ?? []), [gameState, playerId]);

    const tileVisibility = useMemo(() => {
        const info = new Map<string, TileVisibilityState>();
        map.tiles.forEach(tile => {
            const key = `${tile.coord.q},${tile.coord.r}`;
            const isVisible = visibleSet.has(key);
            const isRevealed = revealedSet.has(key);
            info.set(key, {
                isVisible,
                isFogged: !isVisible && isRevealed,
                isShroud: !isVisible && !isRevealed,
            });
        });
        return info;
    }, [map.tiles, visibleSet, revealedSet]);

    const renderableKeys = useMemo(() => {
        const keys = new Set<string>();
        const processSet = (s: Set<string>) => {
            s.forEach(key => {
                const parts = key.split(',');
                const q = parseInt(parts[0], 10);
                const r = parseInt(parts[1], 10);
                for (const offset of RENDER_OFFSETS) {
                    keys.add(`${q + offset.q},${r + offset.r}`);
                }
            });
        };
        processSet(visibleSet);
        processSet(revealedSet);
        return keys;
    }, [visibleSet, revealedSet]);

    return {
        visibleSet,
        revealedSet,
        tileVisibility,
        renderableKeys,
        FALLBACK_VISIBILITY,
    };
};
