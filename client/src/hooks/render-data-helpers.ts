import {
    City,
    GameState,
    HexCoord,
    TerrainType,
    Tile,
    Yields,
    getTileYields,
    isTileAdjacentToRiver
} from "@simple-civ/engine";
import { UnitDescriptor } from "../components/GameMap/UnitLayer";

type PlayerRecord = GameState["players"][number];

export function toCoordKey(coord: HexCoord): string {
    return `${coord.q},${coord.r}`;
}

export function createPlayersById(players: PlayerRecord[]): Map<string, PlayerRecord> {
    const playerMap = new Map<string, PlayerRecord>();
    players.forEach(player => playerMap.set(player.id, player));
    return playerMap;
}

export function createPlayerColorMap(players: PlayerRecord[]): Map<string, string> {
    const colorMap = new Map<string, string>();
    players.forEach(player => colorMap.set(player.id, player.color));
    return colorMap;
}

export function createCitiesByCoord(cities: City[]): Map<string, City> {
    const cityMap = new Map<string, City>();
    cities.forEach(city => cityMap.set(toCoordKey(city.coord), city));
    return cityMap;
}

type ComputeTileYieldsWithCivBonusesParams = {
    tile: Tile;
    playerId: string;
    playersById: Map<string, PlayerRecord>;
    map: GameState["map"] | undefined;
};

type MapWithOptionalRivers = {
    rivers?: unknown;
};

export function computeTileYieldsWithCivBonuses({
    tile,
    playerId,
    playersById,
    map,
}: ComputeTileYieldsWithCivBonusesParams): Yields {
    const owner = playersById.get(tile.ownerId ?? playerId) ?? playersById.get(playerId);
    const civ = owner?.civName;
    const base = getTileYields(tile);

    let food = base.F;
    let production = base.P;
    const science = base.S;
    const gold = base.G;

    const rivers = map ? (map as MapWithOptionalRivers).rivers : undefined;
    const adjacentToRiver = map && Array.isArray(rivers)
        ? isTileAdjacentToRiver(map, tile.coord)
        : false;

    if (civ === "RiverLeague" && adjacentToRiver) {
        food += 1;
    }
    if (civ === "ForgeClans" && tile.terrain === TerrainType.Hills) {
        production += 1;
    }

    return { F: food, P: production, S: science, G: gold };
}

export function splitUnitRenderDataByCity(unitRenderData: UnitDescriptor[]): {
    unitRenderDataOnCity: UnitDescriptor[];
    unitRenderDataOffCity: UnitDescriptor[];
} {
    const onCity: UnitDescriptor[] = [];
    const offCity: UnitDescriptor[] = [];
    unitRenderData.forEach(unit => {
        if (unit.isOnCityHex) {
            onCity.push(unit);
            return;
        }
        offCity.push(unit);
    });

    return {
        unitRenderDataOnCity: onCity,
        unitRenderDataOffCity: offCity,
    };
}
