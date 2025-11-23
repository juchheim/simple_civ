import React from "react";
import { GameState, HexCoord, Action } from "@simple-civ/engine";
interface HUDProps {
    gameState: GameState;
    selectedCoord: HexCoord | null;
    selectedUnitId: string | null;
    onAction: (action: Action) => void;
    onSelectUnit: (unitId: string | null) => void;
    onShowTechTree: () => void;
    playerId: string;
}
export declare const HUD: React.FC<HUDProps>;
export {};
