import { canBuild } from "../../rules.js";
import { BuildingType, City, GameState } from "../../../core/types.js";
import { aiInfo } from "../../ai/debug-logging.js";
import type { BuildOption } from "../production.js";

const ECONOMY_BUILDINGS: BuildingType[] = [
    BuildingType.StoneWorkshop,
    BuildingType.Scriptorium,
    BuildingType.Academy,
    BuildingType.Farmstead,
    BuildingType.Forgeworks,
];

export function pickEconomyBuilding(state: GameState, playerId: string, city: City, civName: string): BuildOption | null {
    for (const building of ECONOMY_BUILDINGS) {
        if (!city.buildings.includes(building) && canBuild(city, "Building", building, state)) {
            aiInfo(`[AI Build] ${civName} ECONOMY: ${building}`);
            return { type: "Building", id: building };
        }
    }
    return null;
}
