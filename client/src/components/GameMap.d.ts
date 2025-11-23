import React from "react";
import { GameState, HexCoord } from "@simple-civ/engine";
interface GameMapProps {
    gameState: GameState;
    onTileClick: (coord: HexCoord) => void;
    selectedCoord: HexCoord | null;
    playerId: string;
    showShroud: boolean;
    selectedUnitId: string | null;
    reachableCoords: Set<string>;
}
export declare const GameMap: React.FC<GameMapProps>;
export {};
