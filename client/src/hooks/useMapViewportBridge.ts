import { useCallback, useRef } from "react";
import { GameMapHandle } from "../components/GameMap";

type UseMapViewportBridgeResult = {
    mapRef: React.RefObject<GameMapHandle>;
    navigateMapView: (point: { x: number; y: number }) => void;
};

export function useMapViewportBridge(): UseMapViewportBridgeResult {
    const mapRef = useRef<GameMapHandle>(null);

    const navigateMapView = useCallback((point: { x: number; y: number }) => {
        mapRef.current?.centerOnPoint(point);
    }, []);

    return {
        mapRef,
        navigateMapView,
    };
}
