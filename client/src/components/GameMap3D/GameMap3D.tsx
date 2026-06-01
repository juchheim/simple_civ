import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EraId, HexCoord } from "@simple-civ/engine";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { EraModal } from "../EraModal";
import type { GameMapHandle, GameMapProps } from "../GameMap";
import { hexToPixel as projectHexToPixel } from "../GameMap/geometry";
import { useMapVisibility } from "../../hooks/useMapVisibility";
import { useRenderData } from "../../hooks/useRenderData";
import { BoardIndicators } from "./BoardIndicators";
import { BorderTubes } from "./BorderTubes";
import { CityTokens } from "./CityTokens";
import { FogLayer } from "./FogLayer";
import { BoardLighting } from "./lighting";
import { OverlayDecals } from "./OverlayDecals";
import { createProjector, Projector } from "./projection";
import { RiverRibbons } from "./RiverRibbons";
import { WorldSurfaceShell } from "./surface";
import { TerrainInstances } from "./TerrainInstances";
import { UnitTokens } from "./UnitTokens";
import { Map3DController, useMap3DController } from "./useMap3DController";

const WORLD_HEX_SIZE = 1;

type SceneProps = {
    projector: Projector;
    tiles: ReturnType<typeof useRenderData>["tileRenderData"];
    cities: ReturnType<typeof useRenderData>["cityOverlayData"];
    borders: ReturnType<typeof useRenderData>["cityBounds"];
    unitsOnCity: ReturnType<typeof useRenderData>["unitRenderDataOnCity"];
    unitsOffCity: ReturnType<typeof useRenderData>["unitRenderDataOffCity"];
    rivers: ReturnType<typeof useRenderData>["riverLineSegments"];
    path: ReturnType<typeof useRenderData>["pathData"];
    mapTiles: GameMapProps["gameState"]["map"]["tiles"];
    initialCenter: HexCoord | null;
    showShroud: boolean;
    showTileYields: boolean;
    onHover: (coord: HexCoord | null) => void;
    onTileClick: (coord: HexCoord) => void;
    onViewChange: GameMapProps["onViewChange"];
    onControllerReady: (controller: Map3DController) => void;
};

function BoardScene({
    projector,
    tiles,
    cities,
    borders,
    unitsOnCity,
    unitsOffCity,
    rivers,
    path,
    mapTiles,
    initialCenter,
    showShroud,
    showTileYields,
    onHover,
    onTileClick,
    onViewChange,
    onControllerReady,
}: SceneProps) {
    const controlsRef = React.useRef<OrbitControlsImpl>(null);
    const { controller, handleControlsChange } = useMap3DController({
        projector,
        tiles: mapTiles,
        initialCenter,
        controlsRef,
        onViewChange,
    });

    React.useEffect(() => onControllerReady(controller), [controller, onControllerReady]);

    return (
        <>
            <color attach="background" args={["#020617"]} />
            <BoardLighting />
            <WorldSurfaceShell surface={projector.surface} />
            <TerrainInstances
                entries={tiles}
                projector={projector}
                showShroud={showShroud}
                onHover={onHover}
                onClick={onTileClick}
            />
            <FogLayer entries={tiles} projector={projector} showShroud={showShroud} />
            <OverlayDecals entries={tiles} projector={projector} showTileYields={showTileYields} />
            <RiverRibbons segments={rivers} projector={projector} />
            <BorderTubes borders={borders} projector={projector} />
            <CityTokens overlays={cities} projector={projector} />
            <UnitTokens units={unitsOnCity} projector={projector} onCity />
            <UnitTokens units={unitsOffCity} projector={projector} />
            <BoardIndicators tiles={tiles} path={path} projector={projector} />
            <OrbitControls
                ref={controlsRef}
                enableDamping
                dampingFactor={0.09}
                enablePan={false}
                minDistance={Math.max(projector.surface.radius * 1.14, 5)}
                maxDistance={Math.max(projector.surface.radius * 3.4, 16)}
                minPolarAngle={Math.PI * 0.16}
                maxPolarAngle={Math.PI * 0.84}
                onChange={handleControlsChange}
            />
        </>
    );
}

const GameMap3DComponent = React.forwardRef<GameMapHandle, GameMapProps>(({
    gameState,
    onTileClick,
    selectedCoord,
    playerId,
    showShroud,
    selectedUnitId,
    reachableCoords,
    showTileYields,
    cityToCenter,
    onViewChange,
}, ref) => {
    const { map, units, cities } = gameState;
    const [hoveredCoord, setHoveredCoord] = React.useState<HexCoord | null>(null);
    const controllerRef = React.useRef<Map3DController | null>(null);
    const [showEraModal, setShowEraModal] = React.useState(false);
    const [modalEra, setModalEra] = React.useState<EraId>(EraId.Primitive);
    const lastSeenEra = React.useRef<EraId | null>(null);
    const projector = React.useMemo(
        () => createProjector({ width: map.width, height: map.height }, WORLD_HEX_SIZE),
        [map.height, map.width],
    );
    const hexToPixel = React.useCallback((hex: HexCoord) => projectHexToPixel(hex, WORLD_HEX_SIZE), []);
    const { tileVisibility, renderableKeys, FALLBACK_VISIBILITY } = useMapVisibility({ gameState, playerId, map });
    const renderData = useRenderData({
        gameState,
        playerId,
        map,
        units,
        cities,
        tileVisibility,
        renderableKeys,
        selectedCoord,
        selectedUnitId,
        hoveredCoord,
        reachableCoords,
        hexToPixel,
        FALLBACK_VISIBILITY,
    });

    const initialCenter = React.useMemo(() => {
        if (renderData.selectedUnit) return renderData.selectedUnit.coord;
        return units.find(unit => unit.ownerId === playerId)?.coord ??
            cities.find(city => city.ownerId === playerId)?.coord ??
            map.tiles[0]?.coord ??
            null;
    }, [cities, map.tiles, playerId, renderData.selectedUnit, units]);

    React.useEffect(() => {
        const player = gameState.players.find(candidate => candidate.id === playerId);
        if (!player) return;
        if (lastSeenEra.current === null) {
            lastSeenEra.current = player.currentEra;
        } else if (player.currentEra !== lastSeenEra.current) {
            lastSeenEra.current = player.currentEra;
            setModalEra(player.currentEra);
            setShowEraModal(true);
        }
    }, [gameState.players, playerId]);

    const handleTileClick = React.useCallback((coord: HexCoord) => {
        const visibility = tileVisibility.get(`${coord.q},${coord.r}`) ?? FALLBACK_VISIBILITY;
        if (visibility.isShroud && !selectedUnitId) return;
        onTileClick(coord);
    }, [FALLBACK_VISIBILITY, onTileClick, selectedUnitId, tileVisibility]);

    const setController = React.useCallback((controller: Map3DController) => {
        controllerRef.current = controller;
    }, []);

    React.useEffect(() => {
        if (cityToCenter) controllerRef.current?.centerOnCoord(cityToCenter);
    }, [cityToCenter]);

    React.useImperativeHandle(ref, () => ({
        centerOnCoord: coord => controllerRef.current?.centerOnCoord(coord),
        centerOnPoint: point => controllerRef.current?.centerOnPoint(point),
    }), []);

    return (
        <div style={{ width: "100%", height: "100%", position: "relative", touchAction: "none" }}>
            <Canvas
                frameloop="demand"
                camera={{ position: [0, 6, Math.max(projector.surface.radius * 2.2, 16)], fov: 48, near: 0.1, far: 300 }}
                gl={{ antialias: true, alpha: false }}
                onPointerMissed={() => setHoveredCoord(null)}
            >
                <BoardScene
                    projector={projector}
                    tiles={renderData.tileRenderData}
                    cities={renderData.cityOverlayData}
                    borders={renderData.cityBounds}
                    unitsOnCity={renderData.unitRenderDataOnCity}
                    unitsOffCity={renderData.unitRenderDataOffCity}
                    rivers={renderData.riverLineSegments}
                    path={renderData.pathData}
                    mapTiles={map.tiles}
                    initialCenter={initialCenter}
                    showShroud={showShroud}
                    showTileYields={showTileYields}
                    onHover={setHoveredCoord}
                    onTileClick={handleTileClick}
                    onViewChange={onViewChange}
                    onControllerReady={setController}
                />
            </Canvas>
            <EraModal era={modalEra} isOpen={showEraModal} onClose={() => setShowEraModal(false)} />
        </div>
    );
});

GameMap3DComponent.displayName = "GameMap3D";

export default React.memo(GameMap3DComponent);
