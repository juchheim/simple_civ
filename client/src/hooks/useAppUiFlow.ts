import { useCallback, useEffect, useState } from "react";
import { HexCoord } from "@simple-civ/engine";
import { MapViewport } from "../components/GameMap";

type UseAppUiFlowResult = {
    showTechTree: boolean;
    setShowTechTree: (show: boolean) => void;
    openTechTree: () => void;
    closeTechTree: () => void;
    showShroud: boolean;
    toggleShroud: () => void;
    showTileYields: boolean;
    toggleTileYields: () => void;
    cityToCenter: HexCoord | null;
    setCityToCenter: (coord: HexCoord | null) => void;
    mapView: MapViewport | null;
    setMapView: (view: MapViewport) => void;
    showGameMenu: boolean;
    setShowGameMenu: (show: boolean) => void;
    openGameMenu: () => void;
    closeGameMenu: () => void;
    resetMapNavigation: () => void;
    resetUiOverlays: () => void;
};

export function useAppUiFlow(): UseAppUiFlowResult {
    const [showTechTree, setShowTechTreeState] = useState(false);
    const [showShroud, setShowShroud] = useState(true);
    const [showTileYields, setShowTileYields] = useState(false);
    const [cityToCenter, setCityToCenterState] = useState<HexCoord | null>(null);
    const [mapView, setMapViewState] = useState<MapViewport | null>(null);
    const [showGameMenu, setShowGameMenuState] = useState(false);

    const setShowTechTree = useCallback((show: boolean) => {
        setShowTechTreeState(show);
    }, []);

    const openTechTree = useCallback(() => setShowTechTreeState(true), []);
    const closeTechTree = useCallback(() => setShowTechTreeState(false), []);

    const toggleShroud = useCallback(() => {
        setShowShroud(prev => !prev);
    }, []);

    const toggleTileYields = useCallback(() => {
        setShowTileYields(prev => !prev);
    }, []);

    const setCityToCenter = useCallback((coord: HexCoord | null) => {
        setCityToCenterState(coord);
    }, []);

    const setMapView = useCallback((view: MapViewport) => {
        setMapViewState(view);
    }, []);

    const setShowGameMenu = useCallback((show: boolean) => {
        setShowGameMenuState(show);
    }, []);

    const openGameMenu = useCallback(() => setShowGameMenuState(true), []);
    const closeGameMenu = useCallback(() => setShowGameMenuState(false), []);

    const resetMapNavigation = useCallback(() => {
        setCityToCenterState(null);
        setMapViewState(null);
    }, []);

    const resetUiOverlays = useCallback(() => {
        setShowTechTreeState(false);
        setShowGameMenuState(false);
    }, []);

    useEffect(() => {
        if (cityToCenter) {
            const timeout = setTimeout(() => setCityToCenterState(null), 100);
            return () => clearTimeout(timeout);
        }
    }, [cityToCenter]);

    return {
        showTechTree,
        setShowTechTree,
        openTechTree,
        closeTechTree,
        showShroud,
        toggleShroud,
        showTileYields,
        toggleTileYields,
        cityToCenter,
        setCityToCenter,
        mapView,
        setMapView,
        showGameMenu,
        setShowGameMenu,
        openGameMenu,
        closeGameMenu,
        resetMapNavigation,
        resetUiOverlays,
    };
}
