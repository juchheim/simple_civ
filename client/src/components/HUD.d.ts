import React from "react";
import { GameState, HexCoord, Action } from "@simple-civ/engine";
interface HUDProps {
    gameState: GameState;
    selectedCoord: HexCoord | null;
    onAction: (action: Action) => void;
    playerId: string;
}
export declare const HUD: React.FC<HUDProps>;
export {};
