import React from "react";
import { InGameContentAdapter } from "../components/AppFlow/InGameContentAdapter";
import { LoadGameModalPresenter } from "../components/AppFlow/LoadGameModalPresenter";
import { TitleFlowContent } from "../components/AppFlow/TitleFlowContent";
import { AppCoreState } from "./useAppCoreState";
import { useInGameContentProps } from "./useInGameContentProps";
import { useLoadGameModalPresenterProps } from "./useLoadGameModalPresenterProps";
import { useTitleFlowContentProps } from "./useTitleFlowContentProps";

export type AppShellProps = {
    hasGameState: boolean;
    titleContent: React.ReactNode;
    gameContent: React.ReactNode;
};

export type UseAppViewModelResult = {
    appShellProps: AppShellProps;
    loadGameModalPresenterProps: React.ComponentProps<typeof LoadGameModalPresenter>;
};

export function useAppPresenterModel(core: AppCoreState): UseAppViewModelResult {
    const titleFlowContentProps = useTitleFlowContentProps({
        showTitleScreen: core.showTitleScreen,
        onShowSetup: core.hideTitle,
        onLoadGame: core.handleLoadGame,
        selectedCiv: core.selectedCiv,
        selectedMapSize: core.selectedMapSize,
        numCivs: core.numCivs,
        selectedDifficulty: core.selectedDifficulty,
        onSelectCiv: core.setSelectedCiv,
        onSelectMapSize: core.setSelectedMapSize,
        onSelectNumCivs: core.setNumCivs,
        onSelectDifficulty: core.setSelectedDifficulty,
        onStartGame: core.handleStartNewGame,
        onBack: core.resetToTitleScreen,
    });

    const inGameContentProps = useInGameContentProps({
        gameState: core.gameState,
        mapRef: core.mapRef,
        playerId: core.playerId,
        selectedCoord: core.selectedCoord,
        selectedUnitId: core.selectedUnitId,
        reachableCoordSet: core.reachableCoordSet,
        showShroud: core.showShroud,
        showTileYields: core.showTileYields,
        cityToCenter: core.cityToCenter,
        onSetMapView: core.setMapView,
        onTileClick: core.handleTileClick,
        toasts: core.allToasts,
        onDismissToast: core.dismissToast,
        onAction: core.handleAction,
        onSelectUnit: core.setSelectedUnitId,
        onSelectCoord: core.setSelectedCoord,
        onShowTechTree: core.openTechTree,
        onSave: core.handleSaveGame,
        onLoad: core.handleLoadGame,
        onRestart: core.handleRestart,
        onResign: core.handleResign,
        onQuit: core.quitToTitle,
        onToggleShroud: core.toggleShroud,
        onToggleYields: core.toggleTileYields,
        showCombatPreview: core.showCombatPreview,
        onToggleCombatPreview: core.toggleCombatPreview,
        onCenterCity: core.setCityToCenter,
        mapView: core.mapView,
        onNavigateMap: core.navigateMapView,
        showGameMenu: core.showGameMenu,
        onToggleGameMenu: core.setShowGameMenu,
        musicEnabled: core.musicEnabled,
        onToggleMusic: core.toggleMusic,
        musicVolume: core.musicVolume,
        onMusicVolumeChange: core.setMusicVolume,
        musicStatusLabel: core.musicStatusLabel,
        showTechTree: core.showTechTree,
        onCloseTechTree: core.closeTechTree,
        onChooseTech: core.handleChooseTech,
        pendingWarAttack: core.pendingWarAttack,
        setPendingWarAttack: core.setPendingWarAttack,
        runActions: core.runActions,
        clearSelection: core.clearSelection,
        pendingCombatPreview: core.pendingCombatPreview,
        confirmCombatPreview: core.confirmCombatPreview,
        cancelCombatPreview: core.cancelCombatPreview,
        onDisableCombatPreview: core.disableCombatPreview,
        showSaveModal: core.showSaveModal,
        onCloseSaveModal: core.closeSaveModal,
        onConfirmSave: core.confirmSaveGame,
        error: core.error,
        setError: core.setError,
    });

    const loadGameModalPresenterProps = useLoadGameModalPresenterProps({
        isOpen: core.showLoadModal,
        onClose: core.closeLoadModal,
        listSaves: core.listSaves,
        onLoad: core.confirmLoadGame,
    });

    const titleContent = <TitleFlowContent {...titleFlowContentProps} />;
    const gameContent = <InGameContentAdapter {...inGameContentProps} />;

    return {
        appShellProps: {
            hasGameState: Boolean(core.gameState),
            titleContent,
            gameContent,
        },
        loadGameModalPresenterProps,
    };
}
