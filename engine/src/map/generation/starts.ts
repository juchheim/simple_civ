import { Player, Tile } from "../../core/types.js";
import { hexDistance } from "../../core/hex.js";

type StartPlacementContext = {
    players: Player[];
    validStarts: Tile[];
    startScore: (tile: Tile, player: Player) => number;
    meetsStartGuarantees: (tile: Tile) => boolean;
};

const MIN_START_DIST = 6;

export function pickStartingSpots(context: StartPlacementContext): Map<string, Tile> {
    const { players, validStarts, startScore, meetsStartGuarantees } = context;
    const placements = new Map<string, Tile>();
    const available = [...validStarts];
    const chosen: Tile[] = [];

    for (const player of players) {
        const spaced = available.filter(t =>
            chosen.every(s => hexDistance(t.coord, s.coord) >= MIN_START_DIST)
        );
        const guaranteed = spaced.filter(t => meetsStartGuarantees(t));
        const pool = guaranteed.length ? guaranteed : spaced.length ? spaced : available;
        let spot = pool[0];
        let bestScore = -Infinity;
        for (const candidate of pool) {
            const score = startScore(candidate, player);
            if (score > bestScore) {
                bestScore = score;
                spot = candidate;
            }
        }

        if (spot) {
            placements.set(player.id, spot);
            chosen.push(spot);
            const idx = available.indexOf(spot);
            if (idx > -1) {
                available.splice(idx, 1);
            }
        }
    }

    return placements;
}

