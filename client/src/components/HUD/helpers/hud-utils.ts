import { GameState, HexCoord, UnitState, pickBestAvailableTech, getCityYields } from "@simple-civ/engine";

export type BlockingTask = { id: string; kind: "research" | "city"; label: string; coord?: HexCoord };
export type AttentionTask = { id: string; kind: "unit"; label: string; coord: HexCoord; unitId: string };

export const calculateEmpireYields = (cities: GameState["cities"], playerId: string, gameState: GameState) => {
    const playerCities = cities.filter(c => c.ownerId === playerId);
    return playerCities.reduce(
        (acc, city) => {
            const yields = getCityYields(city, gameState);
            return { F: acc.F + yields.F, P: acc.P + yields.P, S: acc.S + yields.S, G: acc.G + yields.G };
        },
        { F: 0, P: 0, S: 0, G: 0 }
    );
};

export const getSelectedCity = (coord: HexCoord | null, cities: GameState["cities"]) => {
    if (!coord) return null;
    return cities.find(c => c.coord.q === coord.q && c.coord.r === coord.r) ?? null;
};

export const buildBlockingTasks = (
    isMyTurn: boolean,
    player: GameState["players"][number] | undefined,
    cities: GameState["cities"],
    playerId: string
): BlockingTask[] => {
    if (!isMyTurn || !player) return [];
    const required: BlockingTask[] = [];
    if (!player.currentTech) {
        const nextTech = pickBestAvailableTech(player);
        if (nextTech) {
            required.push({ id: "research", kind: "research", label: "Select new research" });
        }
    }
    for (const city of cities) {
        if (city.ownerId !== playerId) continue;
        if (!city.currentBuild) {
            required.push({
                id: `city-${city.id}`,
                kind: "city",
                label: `Choose production: ${city.name}`,
                coord: city.coord,
            });
        }
    }
    return required;
};

export const buildAttentionTasks = (
    isMyTurn: boolean,
    playerId: string,
    units: GameState["units"]
): AttentionTask[] => {
    if (!isMyTurn) return [];
    const optional: AttentionTask[] = [];
    for (const unit of units) {
        if (unit.ownerId !== playerId) continue;
        if (unit.movesLeft <= 0) continue;
        if (unit.state !== UnitState.Normal) continue;
        if (unit.autoMoveTarget) continue;
        optional.push({
            id: `unit-${unit.id}`,
            kind: "unit",
            label: `Unit idle: ${unit.type}`,
            coord: unit.coord,
            unitId: unit.id,
        });
    }
    return optional;
};
