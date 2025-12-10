import React from "react";
import type { Action, GameState, HexCoord } from "@simple-civ/engine";
import { Codex, DiplomacySummary, GameMenu, TechButton, TurnSummary, TurnTasks, UnitList, UnitPanel, CityPanel, TileInfoPanel } from "./sections";
import { MiniMap } from "./MiniMap";
import type { AttentionTask, BlockingTask, DiplomacyRow, EmpireYields, HUDLayoutProps, HUDSelectionState } from "./helpers";
import type { CityBuildOptions } from "./hooks";

type ToggleCardProps = {
    label: string;
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
    children: React.ReactNode;
    cardClassName?: string;
    cardStyle?: React.CSSProperties;
};

export function ToggleCard({ label, isOpen, onOpen, onClose, children, cardClassName = "hud-menu-card", cardStyle }: ToggleCardProps) {
    if (!isOpen) {
        return (
            <button className="hud-tab-trigger" onClick={onOpen}>
                {label}
            </button>
        );
    }
    return (
        <div className={`hud-card ${cardClassName}`} style={{ position: "relative", ...cardStyle }}>
            <button className="hud-close-button" onClick={onClose} aria-label={`Close ${label.toLowerCase()} menu`}>
                X
            </button>
            {children}
        </div>
    );
}

type TopRowProps = {
    isMyTurn: boolean;
    showCodex: boolean;
    onToggleCodex: (show: boolean) => void;
    showDiplomacy: boolean;
    onToggleDiplomacy: (show: boolean) => void;
    showResearch: boolean;
    onToggleResearch: (show: boolean) => void;
    diplomacyRows: DiplomacyRow[];
    playerId: string;
    onAction: (action: Action) => void;
    player: GameState["players"][number] | undefined;
    onShowTechTree: () => void;
    gameState: GameState;
    mapView: HUDLayoutProps["meta"]["mapView"];
    selectedUnitId: string | null;
    onNavigateMap: (point: { x: number; y: number }) => void;
};

export const TopRow: React.FC<TopRowProps> = ({
    isMyTurn,
    showCodex,
    onToggleCodex,
    showDiplomacy,
    onToggleDiplomacy,
    showResearch,
    onToggleResearch,
    diplomacyRows,
    playerId,
    onAction,
    player,
    onShowTechTree,
    gameState,
    mapView,
    selectedUnitId,
    onNavigateMap,
}) => (
    <div className="hud-top-row">
        <div className="hud-top-row-buttons">
            <ToggleCard
                label="Codex"
                isOpen={showCodex}
                onOpen={() => onToggleCodex(true)}
                onClose={() => onToggleCodex(false)}
                cardStyle={{ width: "500px", maxWidth: "90vw" }}
            >
                <Codex />
            </ToggleCard>
            {isMyTurn && (
                <ToggleCard
                    label="Diplomacy"
                    isOpen={showDiplomacy}
                    onOpen={() => onToggleDiplomacy(true)}
                    onClose={() => onToggleDiplomacy(false)}
                >
                    <DiplomacySummary rows={diplomacyRows} playerId={playerId} onAction={onAction} />
                </ToggleCard>
            )}
            <ToggleCard
                label="Research"
                isOpen={showResearch}
                onOpen={() => onToggleResearch(true)}
                onClose={() => onToggleResearch(false)}
            >
                <TechButton player={player} onShowTechTree={onShowTechTree} />
            </ToggleCard>
        </div>
        <MiniMap
            gameState={gameState}
            playerId={playerId}
            mapView={mapView}
            selectedUnitId={selectedUnitId}
            onNavigate={onNavigateMap}
        />
    </div>
);

type TopLeftMenuProps = {
    showGameMenu: boolean;
    onToggleGameMenu: (show: boolean) => void;
    onSave: () => void;
    onLoad: () => void;
    onRestart: () => void;
    onQuit: () => void;
    onResign: () => void;
    showShroud: boolean;
    onToggleShroud: () => void;
    showYields: boolean;
    onToggleYields: () => void;
    showCombatPreview: boolean;
    onToggleCombatPreview: () => void;
    empireYields: EmpireYields;
};

export const TopLeftMenu: React.FC<TopLeftMenuProps> = ({
    showGameMenu,
    onToggleGameMenu,
    onSave,
    onLoad,
    onRestart,
    onQuit,
    onResign,
    showShroud,
    onToggleShroud,
    showYields,
    onToggleYields,
    showCombatPreview,
    onToggleCombatPreview,
    empireYields,
}) => (
    <div className="hud-top-left">
        <ToggleCard
            label="Game"
            isOpen={showGameMenu}
            onOpen={() => onToggleGameMenu(true)}
            onClose={() => onToggleGameMenu(false)}
        >
            <GameMenu
                onSave={onSave}
                onLoad={onLoad}
                onRestart={onRestart}
                onQuit={onQuit}
                onResign={onResign}
                showShroud={showShroud}
                onToggleShroud={onToggleShroud}
                showYields={showYields}
                onToggleYields={onToggleYields}
                showCombatPreview={showCombatPreview}
                onToggleCombatPreview={onToggleCombatPreview}
            />
        </ToggleCard>
        <div className="hud-empire-yields">
            <span className="hud-yield hud-yield--food" title="Food per turn"><img src="/ui/Food.png" alt="Food" className="hud-yield-icon" /> {empireYields.F}</span>
            <span className="hud-yield hud-yield--prod" title="Production per turn"><img src="/ui/Production.png" alt="Production" className="hud-yield-icon" /> {empireYields.P}</span>
            <span className="hud-yield hud-yield--science" title="Science per turn"><img src="/ui/Science.png" alt="Science" className="hud-yield-icon" /> {empireYields.S}</span>
        </div>
    </div>
);

type SelectionStackProps = {
    selection: HUDSelectionState;
    canLinkUnits: boolean;
    canUnlinkUnits: boolean;
    isMyTurn: boolean;
    onLinkUnits: () => void;
    onUnlinkUnits: () => void;
    onFoundCity: () => void;
    onToggleAutoExplore: () => void;
    onFortifyUnit: () => void;
    onCancelMovement: () => void;
    gameState: GameState;
    onSelectUnit: (unitId: string | null) => void;
    playerId: string;
    cityBuildOptions: CityBuildOptions;
    onBuild: (type: "Unit" | "Building" | "Project", id: string) => void;
    onRazeCity: () => void;
    onSetWorkedTiles: (cityId: string, tiles: HexCoord[]) => void;
    onSelectCoord: (coord: HexCoord | null) => void;
    units: GameState["units"];
};

export const SelectionStack: React.FC<SelectionStackProps> = ({
    selection,
    canLinkUnits,
    canUnlinkUnits,
    isMyTurn,
    onLinkUnits,
    onUnlinkUnits,
    onFoundCity,
    onToggleAutoExplore,
    onFortifyUnit,
    onCancelMovement,
    gameState,
    onSelectUnit,
    playerId,
    cityBuildOptions,
    onBuild,
    onRazeCity,
    onSetWorkedTiles,
    onSelectCoord,
    units,
}) => {
    const { showUnitStack, unitsOnTile, selectedUnitId, selectedUnit, linkedPartner, selectedCoord, selectedCity } = selection;

    return (
        <div className="hud-left-stack">
            {showUnitStack && (
                <div className="hud-card hud-selection-card">
                    <UnitList units={unitsOnTile} selectedUnitId={selectedUnitId} onSelectUnit={onSelectUnit} />
                    {selectedUnit && (
                        <UnitPanel
                            unit={selectedUnit}
                            linkedPartner={linkedPartner ?? null}
                            canLinkUnits={canLinkUnits}
                            canUnlinkUnits={canUnlinkUnits}
                            isMyTurn={isMyTurn}
                            onLinkUnits={onLinkUnits}
                            onUnlinkUnits={onUnlinkUnits}
                            onFoundCity={onFoundCity}
                            onToggleAutoExplore={onToggleAutoExplore}
                            onFortifyUnit={onFortifyUnit}
                            onCancelMovement={onCancelMovement}
                            gameState={gameState}
                        />
                    )}
                </div>
            )}
            {selectedCoord && !selectedCity && (
                <div className="hud-card hud-selection-card">
                    <TileInfoPanel
                        tile={gameState.map.tiles.find(t => t.coord.q === selectedCoord.q && t.coord.r === selectedCoord.r)!}
                    />
                </div>
            )}
            {selectedCity && selectedCity.ownerId !== playerId && (
                <div className="hud-card hud-enemy-city-card">
                    <CityPanel
                        city={selectedCity}
                        isMyTurn={isMyTurn}
                        playerId={playerId}
                        gameState={gameState}
                        units={units}
                        buildOptions={cityBuildOptions}
                        onBuild={onBuild}
                        onRazeCity={onRazeCity}
                        onSetWorkedTiles={onSetWorkedTiles}
                        onSelectUnit={onSelectUnit}
                        onClose={() => onSelectCoord(null)}
                    />
                </div>
            )}
        </div>
    );
};

type FriendlyCityPanelCardProps = {
    selectedCity: GameState["cities"][number] | null;
    playerId: string;
    isMyTurn: boolean;
    gameState: GameState;
    units: GameState["units"];
    buildOptions: CityBuildOptions;
    onBuild: (type: "Unit" | "Building" | "Project", id: string) => void;
    onRazeCity: () => void;
    onSetWorkedTiles: (cityId: string, tiles: HexCoord[]) => void;
    onSelectUnit: (unitId: string | null) => void;
    onSelectCoord: (coord: HexCoord | null) => void;
};

export const FriendlyCityPanelCard: React.FC<FriendlyCityPanelCardProps> = ({
    selectedCity,
    playerId,
    isMyTurn,
    gameState,
    units,
    buildOptions,
    onBuild,
    onRazeCity,
    onSetWorkedTiles,
    onSelectUnit,
    onSelectCoord,
}) => {
    if (!selectedCity || selectedCity.ownerId !== playerId) return null;
    return (
        <div className="hud-card hud-city-panel">
            <CityPanel
                city={selectedCity}
                isMyTurn={isMyTurn}
                playerId={playerId}
                gameState={gameState}
                units={units}
                buildOptions={buildOptions}
                onBuild={onBuild}
                onRazeCity={onRazeCity}
                onSetWorkedTiles={onSetWorkedTiles}
                onSelectUnit={onSelectUnit}
                onClose={() => onSelectCoord(null)}
            />
        </div>
    );
};

type TurnStackProps = {
    blockingTasks: BlockingTask[];
    attentionTasks: AttentionTask[];
    isMyTurn: boolean;
    onOpenTechTree: () => void;
    onFocusCity: (coord: HexCoord) => void;
    onFocusUnit: (unitId: string, coord: HexCoord) => void;
    turn: number;
    currentPlayerId: string;
    canEndTurn: boolean;
    disableReason?: string;
    onEndTurn: () => void;
};

export const TurnStack: React.FC<TurnStackProps> = ({
    blockingTasks,
    attentionTasks,
    isMyTurn,
    onOpenTechTree,
    onFocusCity,
    onFocusUnit,
    turn,
    currentPlayerId,
    canEndTurn,
    disableReason,
    onEndTurn,
}) => (
    <div className="hud-turn-stack">
        <TurnTasks
            blockingTasks={blockingTasks}
            attentionTasks={attentionTasks}
            isMyTurn={isMyTurn}
            onOpenTechTree={onOpenTechTree}
            onFocusCity={onFocusCity}
            onFocusUnit={onFocusUnit}
        />
        <div className="hud-card hud-turn-panel">
            <TurnSummary
                turn={turn}
                currentPlayerId={currentPlayerId}
                isMyTurn={isMyTurn}
                canEndTurn={canEndTurn}
                blockingCount={blockingTasks.length}
                disableReason={disableReason}
                onEndTurn={onEndTurn}
            />
        </div>
    </div>
);
export const HUDLayout: React.FC<HUDLayoutProps> = props => {
    const {
        meta: {
            gameState,
            playerId,
            isMyTurn,
            diplomacyRows,
            empireYields,
            mapView,
        },
        selection: {
            selectedCoord,
            selectedUnitId,
            selectedCity,
            unitsOnTile,
            selectedUnit,
            linkedPartner,
            showUnitStack,
            canLinkUnits,
            canUnlinkUnits,
        },
        buildOptions,
        uiFlags: {
            showResearch,
            showDiplomacy,
            showCodex,
            showGameMenu,
            showShroud,
            showYields,
            showCombatPreview,
        },
        uiToggles: {
            setShowResearch,
            setShowDiplomacy,
            setShowCodex,
            setShowGameMenu,
            onToggleShroud,
            onToggleYields,
            onToggleCombatPreview,
        },
        actions: {
            onAction,
            onSave,
            onLoad,
            onRestart,
            onQuit,
            onResign,
            onBuild,
            onRazeCity,
            onSetWorkedTiles,
            onLinkUnits,
            onUnlinkUnits,
            onFoundCity,
            onToggleAutoExplore,
            onFortifyUnit,
            onCancelMovement,
            onEndTurn,
            onShowTechTree,
        },
        tasks: {
            blockingTasks,
            attentionTasks,
            canEndTurn,
            endTurnMessage,
        },
        handlers: {
            onSelectUnit,
            onSelectCoord,
            onNavigateMap,
            onFocusCity,
            onFocusUnit,
        },
    } = props;

    return (
        <>
            <TopRow
                isMyTurn={isMyTurn}
                showCodex={showCodex}
                onToggleCodex={setShowCodex}
                showDiplomacy={showDiplomacy}
                onToggleDiplomacy={setShowDiplomacy}
                showResearch={showResearch}
                onToggleResearch={setShowResearch}
                diplomacyRows={diplomacyRows}
                playerId={playerId}
                onAction={onAction}
                player={gameState.players.find(p => p.id === playerId)}
                onShowTechTree={onShowTechTree}
                gameState={gameState}
                mapView={mapView}
                selectedUnitId={selectedUnitId}
                onNavigateMap={onNavigateMap}
            />

            <TopLeftMenu
                showGameMenu={showGameMenu}
                onToggleGameMenu={setShowGameMenu}
                onSave={onSave}
                onLoad={onLoad}
                onRestart={onRestart}
                onQuit={onQuit}
                onResign={onResign}
                showShroud={showShroud}
                onToggleShroud={onToggleShroud}
                showYields={showYields}
                onToggleYields={onToggleYields}
                showCombatPreview={showCombatPreview}
                onToggleCombatPreview={onToggleCombatPreview}
                empireYields={empireYields}
            />

            <SelectionStack
                selection={{
                    selectedCoord,
                    selectedUnitId,
                    selectedCity,
                    unitsOnTile,
                    selectedUnit,
                    linkedPartner,
                    showUnitStack,
                    canLinkUnits,
                    canUnlinkUnits,
                }}
                canLinkUnits={canLinkUnits}
                canUnlinkUnits={canUnlinkUnits}
                isMyTurn={isMyTurn}
                onLinkUnits={onLinkUnits}
                onUnlinkUnits={onUnlinkUnits}
                onFoundCity={onFoundCity}
                onToggleAutoExplore={onToggleAutoExplore}
                onFortifyUnit={onFortifyUnit}
                onCancelMovement={onCancelMovement}
                gameState={gameState}
                onSelectUnit={onSelectUnit}
                selectedCoord={selectedCoord}
                selectedCity={selectedCity}
                playerId={playerId}
                cityBuildOptions={buildOptions}
                onBuild={onBuild}
                onRazeCity={onRazeCity}
                onSetWorkedTiles={onSetWorkedTiles}
                onSelectCoord={onSelectCoord}
                units={gameState.units}
            />

            <FriendlyCityPanelCard
                selectedCity={selectedCity}
                playerId={playerId}
                isMyTurn={isMyTurn}
                gameState={gameState}
                units={gameState.units}
                buildOptions={buildOptions}
                onBuild={onBuild}
                onRazeCity={onRazeCity}
                onSetWorkedTiles={onSetWorkedTiles}
                onSelectUnit={onSelectUnit}
                onSelectCoord={onSelectCoord}
            />

            <TurnStack
                blockingTasks={blockingTasks}
                attentionTasks={attentionTasks}
                isMyTurn={isMyTurn}
                onOpenTechTree={onShowTechTree}
                onFocusCity={onFocusCity}
                onFocusUnit={onFocusUnit}
                turn={gameState.turn}
                currentPlayerId={gameState.currentPlayerId}
                canEndTurn={canEndTurn}
                disableReason={endTurnMessage}
                onEndTurn={onEndTurn}
            />
        </>
    );
};
