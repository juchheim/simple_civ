import { GameState } from "@simple-civ/engine/src/core/types";
import { hexToString } from "@simple-civ/engine/src/core/hex";
import { getHexCornerOffsets, hexToPixel, squaredDistance } from "../GameMap/geometry";

export const REPLAY_HEX_SIZE = 10;
export const REPLAY_SPEED_OPTIONS = [0.5, 1, 2, 4] as const;
export const REPLAY_BASE_TURN_DELAY_MS = 300;
export const REPLAY_EVENT_DELAY_MS = 2000;

export type ReplayViewBox = {
    viewBoxX: number;
    viewBoxY: number;
    viewBoxW: number;
    viewBoxH: number;
};

export type RiverSegment = {
    aKey: string;
    bKey: string;
    p1: { x: number; y: number };
    p2: { x: number; y: number };
};

export type ReplayEvent = NonNullable<NonNullable<GameState["history"]>["events"]>[number];

export function getReplayMaxTurn(gameState: GameState): number {
    return gameState.endTurn ?? gameState.turn;
}

export function buildFogHistory(
    gameState: GameState,
    playerId: string,
    maxTurn: number,
): Record<number, Set<string>> {
    const history: Record<number, Set<string>> = {};
    const playerFog = gameState.history?.playerFog?.[playerId];

    if (!playerFog) {
        const fallback = new Set<string>();
        (gameState.revealed?.[playerId] ?? []).forEach(key => fallback.add(key));
        history[0] = new Set(fallback);
        history[maxTurn] = new Set(fallback);
        return history;
    }

    const cumulative = new Set<string>();
    for (let turn = 0; turn <= maxTurn; turn++) {
        const delta = playerFog[turn];
        if (delta) {
            delta.forEach(coord => cumulative.add(hexToString(coord)));
        }
        history[turn] = new Set(cumulative);
    }
    return history;
}

export function getActiveReplayEvents(
    gameState: GameState,
    replayTurn: number,
    playerId: string,
): ReplayEvent[] {
    const events = gameState.history?.events ?? [];
    return events.filter(event => {
        if (event.turn !== replayTurn) return false;
        const isMyEvent = event.playerId === playerId;
        const isInvolvingMe = (event.data as any)?.targetId === playerId || (event.data as any)?.otherPlayerId === playerId;
        return isMyEvent || isInvolvingMe;
    });
}

export function computeReplayViewBox(
    mapWidth: number,
    mapHeight: number,
    hexSize: number,
): ReplayViewBox {
    const maxQ = mapWidth - 1;
    const maxR = mapHeight - 1;
    const corners = [
        { q: 0, r: 0 },
        { q: maxQ, r: 0 },
        { q: 0, r: maxR },
        { q: maxQ, r: maxR },
    ];

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    corners.forEach(corner => {
        const center = hexToPixel(corner, hexSize);
        minX = Math.min(minX, center.x - hexSize);
        maxX = Math.max(maxX, center.x + hexSize);
        minY = Math.min(minY, center.y - hexSize);
        maxY = Math.max(maxY, center.y + hexSize);
    });

    return {
        viewBoxX: minX - hexSize,
        viewBoxY: minY - hexSize,
        viewBoxW: (maxX - minX) + hexSize * 2,
        viewBoxH: (maxY - minY) + hexSize * 2,
    };
}

export function getReplayTurnDelayMs(speedMultiplier: number, hasEvents: boolean): number {
    const baseDelay = REPLAY_BASE_TURN_DELAY_MS / speedMultiplier;
    if (!hasEvents) return baseDelay;
    return Math.max(baseDelay, REPLAY_EVENT_DELAY_MS);
}

export function buildReplayRiverSegments(
    rivers: GameState["map"]["rivers"] | undefined,
    hexSize: number,
): RiverSegment[] {
    if (!rivers) return [];

    const segments: RiverSegment[] = [];
    const offsets = getHexCornerOffsets(hexSize);

    const getCorners = (q: number, r: number) => {
        const center = hexToPixel({ q, r }, hexSize);
        return offsets.map(offset => ({ x: center.x + offset.x, y: center.y + offset.y }));
    };

    rivers.forEach(river => {
        const cornersA = getCorners(river.a.q, river.a.r);
        const cornersB = getCorners(river.b.q, river.b.r);
        const sharedCorners: { x: number; y: number }[] = [];

        for (const pointA of cornersA) {
            for (const pointB of cornersB) {
                if (squaredDistance(pointA, pointB) < 0.1) {
                    sharedCorners.push(pointA);
                    break;
                }
            }
            if (sharedCorners.length === 2) break;
        }

        if (sharedCorners.length === 2) {
            segments.push({
                aKey: hexToString(river.a),
                bKey: hexToString(river.b),
                p1: sharedCorners[0],
                p2: sharedCorners[1],
            });
        }
    });

    return segments;
}

export function getReplayTerrainColor(terrain: string): string {
    switch (terrain) {
        case "Ocean": return "#1e3a8a";
        case "DeepSea": return "#172554";
        case "Coast": return "#3b82f6";
        case "Grassland": return "#4ade80";
        case "Plains": return "#facc15";
        case "Desert": return "#fbbf24";
        case "Tundra": return "#e5e7eb";
        case "Snow": return "#ffffff";
        case "Mountain": return "#57534e";
        case "Forest": return "#166534";
        case "Marsh": return "#10b981";
        case "Hills": return "#a3e635";
        default: return "#333";
    }
}

export function formatReplayId(id: string): string {
    return id.replace(/([A-Z])/g, " $1").trim();
}

export function getReplayEventLabel(
    event: ReplayEvent,
    gameState: GameState,
    playerId: string,
): string {
    switch (event.type) {
        case "CityFounded":
            return `City Founded: ${event.data.cityName}`;
        case "TechResearched":
            return `Researched: ${formatReplayId(event.data.techId)}`;
        case "EraEntered":
            return `Entered Era: ${event.data.era || "?"}`;
        case "WarDeclared": {
            const targetId = (event.data as any)?.targetId;
            if (event.playerId === playerId) {
                const targetName = gameState.players.find(player => player.id === targetId)?.civName || "Unknown";
                return `Declared War on ${formatReplayId(targetName)}`;
            }
            const attackerName = gameState.players.find(player => player.id === event.playerId)?.civName || "Unknown";
            return `${formatReplayId(attackerName)} Declared War!`;
        }
        case "CityCaptured":
            return `City Captured: ${event.data.cityName}`;
        case "PeaceMade": {
            const targetId = (event.data as any)?.targetId;
            const otherName = event.playerId === playerId
                ? (gameState.players.find(player => player.id === targetId)?.civName || "Unknown")
                : (gameState.players.find(player => player.id === event.playerId)?.civName || "Unknown");
            return `Peace Treaty Signed with ${formatReplayId(otherName)}`;
        }
        case "VictoryAchieved":
            return `Victory (${event.data.victoryType})`;
        case "CivContact": {
            if (event.playerId !== playerId) return "";
            const otherId = event.data.targetId;
            const otherCiv = gameState.players.find(player => player.id === otherId)?.civName || "Unknown";
            return `Met Civilization: ${formatReplayId(otherCiv)}`;
        }
        case "WonderBuilt":
            return `Wonder Completed: ${formatReplayId(event.data.buildId || event.data.wonderId || "Unknown")}`;
        default:
            return "";
    }
}
