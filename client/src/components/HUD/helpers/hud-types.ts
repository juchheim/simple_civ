import type { Action, GameState, HexCoord } from "@simple-civ/engine";
import type { MapViewport } from "../../GameMap";
import type { CityBuildOptions } from "../hooks";
import type { DiplomacyRow } from "./diplomacy";
import type { AttentionTask, BlockingTask } from "./hud-utils";

export type EmpireYields = { F: number; P: number; S: number };

export type HUDSelectionState = {
    selectedCoord: HexCoord | null;
    selectedUnitId: string | null;
    selectedCity: GameState["cities"][number] | null;
    unitsOnTile: GameState["units"];
    selectedUnit: GameState["units"][number] | null;
    linkedPartner: GameState["units"][number] | null;
    showUnitStack: boolean;
    canLinkUnits: boolean;
    canUnlinkUnits: boolean;
};

export type HUDHandlers = {
    onSelectUnit: (unitId: string | null) => void;
    onSelectCoord: (coord: HexCoord | null) => void;
    onCenterCity: (coord: HexCoord) => void;
    onNavigateMap: (point: { x: number; y: number }) => void;
};

export type HUDMeta = {
    gameState: GameState;
    playerId: string;
    isMyTurn: boolean;
    diplomacyRows: DiplomacyRow[];
    empireYields: EmpireYields;
    mapView: MapViewport | null;
};

export type HUDLayoutProps = {
    meta: HUDMeta;
    selection: HUDSelectionState;
    buildOptions: CityBuildOptions;
    uiFlags: {
        showResearch: boolean;
        showDiplomacy: boolean;
        showCodex: boolean;
        showGameMenu: boolean;
        showShroud: boolean;
        showYields: boolean;
        showCombatPreview: boolean;
    };
    uiToggles: {
        setShowResearch: (show: boolean) => void;
        setShowDiplomacy: (show: boolean) => void;
        setShowCodex: (show: boolean) => void;
        setShowGameMenu: (show: boolean) => void;
        onToggleShroud: () => void;
        onToggleYields: () => void;
        onToggleCombatPreview: () => void;
    };
    actions: {
        onAction: (action: Action) => void;
        onSave: () => void;
        onLoad: () => void;
        onRestart: () => void;
        onQuit: () => void;
        onResign: () => void;
        onBuild: (type: "Unit" | "Building" | "Project", id: string) => void;
        onRazeCity: () => void;
        onSetWorkedTiles: (cityId: string, tiles: HexCoord[]) => void;
        onLinkUnits: () => void;
        onUnlinkUnits: () => void;
        onFoundCity: () => void;
        onToggleAutoExplore: () => void;
        onFortifyUnit: () => void;
        onCancelMovement: () => void;
        onEndTurn: () => void;
        onShowTechTree: () => void;
    };
    tasks: {
        blockingTasks: BlockingTask[];
        attentionTasks: AttentionTask[];
        canEndTurn: boolean;
        endTurnMessage?: string;
    };
};
