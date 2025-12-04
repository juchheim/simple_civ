import React from "react";
import { GameState, HexCoord } from "@simple-civ/engine";
export type MapViewport = {
    pan: {
        x: number;
        y: number;
    };
    zoom: number;
    size: {
        width: number;
        height: number;
    };
    worldBounds: {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
    };
    center: {
        x: number;
        y: number;
    };
};
export type GameMapHandle = {
    centerOnCoord: (coord: HexCoord) => void;
    centerOnPoint: (point: {
        x: number;
        y: number;
    }) => void;
};
interface GameMapProps {
    gameState: GameState;
    onTileClick: (coord: HexCoord) => void;
    selectedCoord: HexCoord | null;
    playerId: string;
    showShroud: boolean;
    selectedUnitId: string | null;
    reachableCoords: Set<string>;
    showTileYields: boolean;
    cityToCenter?: HexCoord | null;
    onViewChange?: (view: MapViewport) => void;
}
export declare const GameMap: React.MemoExoticComponent<React.ForwardRefExoticComponent<GameMapProps & React.RefAttributes<GameMapHandle>>>;
export {};
