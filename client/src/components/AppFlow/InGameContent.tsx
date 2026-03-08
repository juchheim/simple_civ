import React from "react";
import { Action, CombatPreview, DiplomacyState, GameState, getMapSpecificVictoryRules, HexCoord, TechId } from "@simple-civ/engine";
import { EndGameExperience } from "../EndGame/EndGameExperience";
import { GameMap, GameMapHandle, MapViewport } from "../GameMap";
import { HUD } from "../HUD";
import { CombatPreviewModal, WarDeclarationModal } from "../HUD/sections";
import { Modal } from "../Modal";
import { SaveGameModal } from "../SaveGameModal";
import { TechTree } from "../TechTree";
import { Toast, ToastContainer } from "../Toast";

type PendingWarAttack = { action: Action; targetPlayerId: string } | null;
type PendingCombatPreview = { preview: CombatPreview; action: Action } | null;

type InGameContentProps = {
    gameState: GameState;
    mapRef: React.RefObject<GameMapHandle>;
    playerId: string;
    selectedCoord: HexCoord | null;
    selectedUnitId: string | null;
    reachableCoordSet: Set<string>;
    showShroud: boolean;
    showTileYields: boolean;
    cityToCenter: HexCoord | null;
    onSetMapView: (view: MapViewport) => void;
    onTileClick: (coord: HexCoord) => void;
    toasts: Toast[];
    onDismissToast: (id: string) => void;
    onAction: (action: Action) => void;
    onSelectUnit: (unitId: string | null) => void;
    onSelectCoord: (coord: HexCoord | null) => void;
    onShowTechTree: () => void;
    onSave: () => void;
    onLoad: () => void;
    onRestart: () => void;
    onResign: () => void;
    onQuit: () => void;
    onToggleShroud: () => void;
    onToggleYields: () => void;
    showCombatPreview: boolean;
    onToggleCombatPreview: () => void;
    onCenterCity: (coord: HexCoord) => void;
    mapView: MapViewport | null;
    onNavigateMap: (point: { x: number; y: number }) => void;
    showGameMenu: boolean;
    onToggleGameMenu: (show: boolean) => void;
    musicEnabled?: boolean;
    onToggleMusic?: () => void;
    musicVolume?: number;
    onMusicVolumeChange?: (volume: number) => void;
    musicStatusLabel?: string;
    showTechTree: boolean;
    onCloseTechTree: () => void;
    onChooseTech: (techId: TechId) => void;
    pendingWarAttack: PendingWarAttack;
    setPendingWarAttack: (pending: PendingWarAttack) => void;
    runActions: (actions: Action[]) => void;
    clearSelection: () => void;
    pendingCombatPreview: PendingCombatPreview;
    confirmCombatPreview: () => void;
    cancelCombatPreview: () => void;
    onDisableCombatPreview: () => void;
    showSaveModal: boolean;
    onCloseSaveModal: () => void;
    onConfirmSave: () => void;
    error: string | null;
    setError: (error: string | null) => void;
};

export const InGameContent: React.FC<InGameContentProps> = ({
    gameState,
    mapRef,
    playerId,
    selectedCoord,
    selectedUnitId,
    reachableCoordSet,
    showShroud,
    showTileYields,
    cityToCenter,
    onSetMapView,
    onTileClick,
    toasts,
    onDismissToast,
    onAction,
    onSelectUnit,
    onSelectCoord,
    onShowTechTree,
    onSave,
    onLoad,
    onRestart,
    onResign,
    onQuit,
    onToggleShroud,
    onToggleYields,
    showCombatPreview,
    onToggleCombatPreview,
    onCenterCity,
    mapView,
    onNavigateMap,
    showGameMenu,
    onToggleGameMenu,
    musicEnabled,
    onToggleMusic,
    musicVolume,
    onMusicVolumeChange,
    musicStatusLabel,
    showTechTree,
    onCloseTechTree,
    onChooseTech,
    pendingWarAttack,
    setPendingWarAttack,
    runActions,
    clearSelection,
    pendingCombatPreview,
    confirmCombatPreview,
    cancelCombatPreview,
    onDisableCombatPreview,
    showSaveModal,
    onCloseSaveModal,
    onConfirmSave,
    error,
    setError,
}) => {
    const mapSpecificVictoryRules = React.useMemo(
        () => getMapSpecificVictoryRules(gameState.map),
        [gameState.map]
    );
    const [dismissedRuleGameIds, setDismissedRuleGameIds] = React.useState<Set<string>>(() => new Set());
    const [showMapRuleModal, setShowMapRuleModal] = React.useState(false);

    React.useEffect(() => {
        const shouldShowRules = mapSpecificVictoryRules.length > 0 &&
            gameState.turn <= 1 &&
            !dismissedRuleGameIds.has(gameState.id);
        setShowMapRuleModal(shouldShowRules);
    }, [dismissedRuleGameIds, gameState.id, gameState.turn, mapSpecificVictoryRules]);

    const handleDismissMapRuleModal = React.useCallback(() => {
        setDismissedRuleGameIds(prev => {
            const next = new Set(prev);
            next.add(gameState.id);
            return next;
        });
        setShowMapRuleModal(false);
    }, [gameState.id]);

    return (
        <div style={{ width: "100vw", height: "100vh", overflow: "hidden", position: "relative" }}>
            <GameMap
                ref={mapRef}
                gameState={gameState}
                onTileClick={onTileClick}
                selectedCoord={selectedCoord}
                playerId={playerId}
                showShroud={showShroud}
                selectedUnitId={selectedUnitId}
                reachableCoords={reachableCoordSet}
                showTileYields={showTileYields}
                cityToCenter={cityToCenter}
                onViewChange={onSetMapView}
            />
            <ToastContainer toasts={toasts} onDismiss={onDismissToast} />
            <HUD
                gameState={gameState}
                selectedCoord={selectedCoord}
                selectedUnitId={selectedUnitId}
                onAction={onAction}
                onSelectUnit={onSelectUnit}
                onSelectCoord={onSelectCoord}
                onShowTechTree={onShowTechTree}
                playerId={playerId}
                onSave={onSave}
                onLoad={onLoad}
                onRestart={onRestart}
                onResign={onResign}
                onQuit={onQuit}
                showShroud={showShroud}
                onToggleShroud={onToggleShroud}
                showYields={showTileYields}
                onToggleYields={onToggleYields}
                showCombatPreview={showCombatPreview}
                onToggleCombatPreview={onToggleCombatPreview}
                onCenterCity={onCenterCity}
                mapView={mapView}
                onNavigateMap={onNavigateMap}
                showGameMenu={showGameMenu}
                onToggleGameMenu={onToggleGameMenu}
                musicEnabled={musicEnabled}
                onToggleMusic={onToggleMusic}
                musicVolume={musicVolume}
                onMusicVolumeChange={onMusicVolumeChange}
                musicStatusLabel={musicStatusLabel}
            />
            {showTechTree && (
                <TechTree
                    gameState={gameState}
                    playerId={playerId}
                    onChooseTech={onChooseTech}
                    onClose={onCloseTechTree}
                />
            )}
            {gameState.winnerId && (
                <EndGameExperience
                    gameState={gameState}
                    playerId={playerId}
                    onRestart={onRestart}
                    onQuit={onQuit}
                />
            )}
            {pendingWarAttack && (() => {
                const targetPlayer = gameState.players.find(p => p.id === pendingWarAttack.targetPlayerId);
                const actionType = pendingWarAttack.action.type === "MoveUnit" ? "move" : "attack";
                return targetPlayer ? (
                    <WarDeclarationModal
                        targetCivName={targetPlayer.civName}
                        targetColor={targetPlayer.color}
                        actionType={actionType}
                        onConfirm={() => {
                            // Run both actions together as a batch so war is declared before move executes
                            runActions([
                                { type: "SetDiplomacy", playerId, targetPlayerId: pendingWarAttack.targetPlayerId, state: DiplomacyState.War },
                                pendingWarAttack.action
                            ]);
                            setPendingWarAttack(null);
                            clearSelection();
                        }}
                        onCancel={() => {
                            setPendingWarAttack(null);
                        }}
                    />
                ) : null;
            })()}
            {pendingCombatPreview && (
                <CombatPreviewModal
                    preview={pendingCombatPreview.preview}
                    onConfirm={confirmCombatPreview}
                    onCancel={cancelCombatPreview}
                    onDisablePreview={onDisableCombatPreview}
                />
            )}
            <SaveGameModal
                isOpen={showSaveModal}
                onClose={onCloseSaveModal}
                onConfirmSave={onConfirmSave}
            />
            <Modal
                isOpen={showMapRuleModal}
                onClose={handleDismissMapRuleModal}
                title="Map-Specific Victory Rules"
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
                        This match changes the standard victory rules for the selected map size.
                    </div>
                    {mapSpecificVictoryRules.map(rule => (
                        <div
                            key={rule.id}
                            style={{
                                borderRadius: 12,
                                border: "1px solid rgba(205, 138, 54, 0.3)",
                                background: "rgba(205, 138, 54, 0.08)",
                                padding: "14px 16px",
                                display: "flex",
                                flexDirection: "column",
                                gap: 6,
                            }}
                        >
                            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-highlight)" }}>
                                {rule.title}
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-main)" }}>
                                {rule.summary}
                            </div>
                            <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--color-text-muted)" }}>
                                {rule.detail}
                            </div>
                        </div>
                    ))}
                    <button
                        onClick={handleDismissMapRuleModal}
                        style={{
                            alignSelf: "flex-end",
                            padding: "10px 16px",
                            borderRadius: 10,
                            border: "none",
                            background: "var(--color-highlight-strong, #cd8a36)",
                            color: "#fff",
                            fontWeight: 700,
                            cursor: "pointer",
                        }}
                    >
                        Continue
                    </button>
                </div>
            </Modal>
            {error && (
                <div style={{
                    position: "fixed",
                    bottom: 20,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "rgba(220, 38, 38, 0.9)",
                    color: "white",
                    padding: "12px 24px",
                    borderRadius: 8,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                    zIndex: 9999,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    animation: "fadeIn 0.3s ease-out"
                }}>
                    <span style={{ fontWeight: 600 }}>Error:</span>
                    <span>{error}</span>
                    <button
                        onClick={() => setError(null)}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "white",
                            cursor: "pointer",
                            fontSize: 18,
                            marginLeft: 8,
                            padding: 4,
                            lineHeight: 1
                        }}
                    >
                        ×
                    </button>
                </div>
            )}
        </div>
    );
};
