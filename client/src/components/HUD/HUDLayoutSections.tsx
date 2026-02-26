import React from "react";
import type { Action, GameState, HexCoord } from "@simple-civ/engine";
import { Codex, DiplomacySummary, GameMenu, TechButton, TurnSummary, TurnTasks, UnitList, UnitPanel, CityPanel, TileInfoPanel } from "./sections";
import { MiniMap } from "./MiniMap";
import type { AttentionTask, BlockingTask, CityStateRow, DiplomacyRow, EmpireYields, HUDLayoutProps, HUDSelectionState } from "./helpers";
import type { CityBuildOptions } from "./hooks";
import { useTutorial } from "../../contexts/TutorialContext";

type ToggleCardProps = {
    label: string;
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
    children: React.ReactNode;
    cardClassName?: string;
    cardStyle?: React.CSSProperties;
    pulse?: boolean;
    tooltip?: string;
};

export function ToggleCard({ label, isOpen, onOpen, onClose, children, cardClassName = "hud-menu-card", cardStyle, pulse, tooltip }: ToggleCardProps) {
    if (!isOpen) {
        return (
            <button
                className={`hud-tab-trigger ${pulse ? "pulse" : ""}`}
                onClick={onOpen}
                title={tooltip}
            >
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
    showEconomy: boolean;
    onToggleEconomy: (show: boolean) => void;
    showDiplomacy: boolean;
    onToggleDiplomacy: (show: boolean) => void;
    showResearch: boolean;
    onToggleResearch: (show: boolean) => void;
    playerEconomy: HUDLayoutProps["meta"]["playerEconomy"];
    diplomacyRows: DiplomacyRow[];
    cityStateRows?: CityStateRow[];
    playerId: string;
    onAction: (action: Action) => void;
    player: GameState["players"][number] | undefined;
    onShowTechTree: () => void;
    gameState: GameState;
    mapView: HUDLayoutProps["meta"]["mapView"];
    selectedUnitId: string | null;
    onNavigateMap: (point: { x: number; y: number }) => void;
    sciencePerTurn: number;
};

export const TopRow: React.FC<TopRowProps> = ({
    isMyTurn,
    showCodex,
    onToggleCodex,
    showEconomy,
    onToggleEconomy,
    showDiplomacy,
    onToggleDiplomacy,
    showResearch,
    onToggleResearch,
    playerEconomy,
    diplomacyRows,
    cityStateRows = [],
    playerId,
    onAction,
    player,
    onShowTechTree,
    gameState,
    mapView,
    selectedUnitId,
    onNavigateMap,
    sciencePerTurn,
}) => {
    const tutorial = useTutorial();

    const handleOpenCodex = () => {
        tutorial.markComplete("openedCodex");
        onToggleCodex(true);
    };

    const handleOpenDiplomacy = () => {
        tutorial.markComplete("contactedOtherCiv");
        onToggleDiplomacy(true);
    };

    const shouldPulseCodex = tutorial.shouldPulse("openedCodex");
    const hasContacts = diplomacyRows.length > 0;
    const shouldPulseDiplomacy = hasContacts && tutorial.shouldPulse("contactedOtherCiv");

    return (
        <div className="hud-top-row">
            <div className="hud-top-row-buttons">
                <ToggleCard
                    label="Codex"
                    isOpen={showCodex}
                    onOpen={handleOpenCodex}
                    onClose={() => onToggleCodex(false)}
                    cardStyle={{ width: "500px", maxWidth: "90vw" }}
                    pulse={shouldPulseCodex}
                    tooltip={shouldPulseCodex ? "Browse the game rules and unit stats" : undefined}
                >
                    <Codex />
                </ToggleCard>
                <ToggleCard
                    label="Economy"
                    isOpen={showEconomy}
                    onOpen={() => onToggleEconomy(true)}
                    onClose={() => onToggleEconomy(false)}
                    cardStyle={{ width: "420px", maxWidth: "90vw" }}
                >
                    <EconomySummary playerEconomy={playerEconomy} />
                </ToggleCard>
                {isMyTurn && (
                    <ToggleCard
                        label="Diplomacy"
                        isOpen={showDiplomacy}
                        onOpen={handleOpenDiplomacy}
                        onClose={() => onToggleDiplomacy(false)}
                        pulse={shouldPulseDiplomacy}
                        tooltip={shouldPulseDiplomacy ? "View diplomatic relations with other civilizations" : undefined}
                    >
                        <DiplomacySummary rows={diplomacyRows} cityStateRows={cityStateRows} playerId={playerId} onAction={onAction} />
                    </ToggleCard>
                )}
                <ToggleCard
                    label="Research"
                    isOpen={showResearch}
                    onOpen={() => onToggleResearch(true)}
                    onClose={() => onToggleResearch(false)}
                >
                    <TechButton player={player} onShowTechTree={onShowTechTree} sciencePerTurn={sciencePerTurn} />
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
};

type EconomySummaryProps = {
    playerEconomy: HUDLayoutProps["meta"]["playerEconomy"];
};

const EconomySummary: React.FC<EconomySummaryProps> = ({ playerEconomy }) => (
    <>
        <p className="hud-section-title">Economy</p>
        <div className="hud-economy-stack">
            <div className="hud-economy-row">
                <span className="hud-economy-label">Treasury</span>
                <span className="hud-pill">{playerEconomy.treasury}G</span>
            </div>
            <div className="hud-economy-row">
                <span className="hud-economy-label">Net</span>
                <span className={`hud-pill ${playerEconomy.net >= 0 ? "success" : "warn"}`}>
                    {playerEconomy.net >= 0 ? "+" : ""}{playerEconomy.net}G/turn
                </span>
            </div>
            <div className="hud-economy-divider" />
            <div className="hud-economy-row">
                <span className="hud-economy-label">Income</span>
                <span className="hud-economy-value">+{playerEconomy.income}G</span>
            </div>
            <div className="hud-economy-row">
                <span className="hud-economy-label">Building Upkeep</span>
                <span className="hud-economy-value">-{playerEconomy.buildingUpkeep}G</span>
            </div>
            <div className="hud-economy-row">
                <span className="hud-economy-label">Military Upkeep</span>
                <span className="hud-economy-value">-{playerEconomy.militaryUpkeep}G</span>
            </div>
            <div className="hud-economy-divider" />
            <div className="hud-economy-row">
                <span className="hud-economy-label">Used Supply</span>
                <span className="hud-economy-value">{playerEconomy.usedSupply}</span>
            </div>
            <div className="hud-economy-row">
                <span className="hud-economy-label">Free Supply</span>
                <span className="hud-economy-value">{playerEconomy.freeSupply}</span>
            </div>
        </div>
    </>
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
    musicEnabled?: boolean;
    onToggleMusic?: () => void;
    musicVolume?: number;
    onMusicVolumeChange?: (volume: number) => void;
    musicStatusLabel?: string;
    empireYields: EmpireYields;
    playerEconomy: HUDLayoutProps["meta"]["playerEconomy"];
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
    musicEnabled,
    onToggleMusic,
    musicVolume,
    onMusicVolumeChange,
    musicStatusLabel,
    empireYields,
    playerEconomy,
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
                musicEnabled={musicEnabled}
                onToggleMusic={onToggleMusic}
                musicVolume={musicVolume}
                onMusicVolumeChange={onMusicVolumeChange}
                musicStatusLabel={musicStatusLabel}
            />
        </ToggleCard>
        <div className="hud-empire-yields">
            <span className="hud-yield hud-yield--food" title="Food per turn"><img src="/ui/Food.png" alt="Food" className="hud-yield-icon" /> {empireYields.F}</span>
            <span className="hud-yield hud-yield--prod" title="Production per turn"><img src="/ui/Production.png" alt="Production" className="hud-yield-icon" /> {empireYields.P}</span>
            <span className="hud-yield hud-yield--science" title="Science per turn"><img src="/ui/Science.png" alt="Science" className="hud-yield-icon" /> {empireYields.S}</span>
            <span className="hud-yield hud-yield--gold" title="Net gold per turn after upkeep"><img src="/ui/Gold.png" alt="Gold" className="hud-yield-icon" /> {playerEconomy.net >= 0 ? "+" : ""}{playerEconomy.net}</span>
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
    onDisbandUnit: () => void;
    onCancelMovement: () => void;
    gameState: GameState;
    onSelectUnit: (unitId: string | null) => void;
    playerId: string;
    cityBuildOptions: CityBuildOptions;
    onBuild: (type: "Unit" | "Building" | "Project", id: string) => void;
    onRushBuy: (cityId: string) => void;
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
    onDisbandUnit,
    onCancelMovement,
    gameState,
    onSelectUnit,
    playerId,
    cityBuildOptions,
    onBuild,
    onRushBuy,
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
                            onDisbandUnit={onDisbandUnit}
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
                        onRushBuy={onRushBuy}
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
    onRushBuy: (cityId: string) => void;
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
    onRushBuy,
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
                onRushBuy={onRushBuy}
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
