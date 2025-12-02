import { useCallback, useEffect, useRef, useState } from "react";
import { GameMap, GameMapHandle, MapViewport } from "./components/GameMap";
import { HUD } from "./components/HUD";
import { TechTree } from "./components/TechTree";
import { TitleScreen } from "./components/TitleScreen";
import { VictoryLossScreen } from "./components/VictoryLossScreen";
import { WarDeclarationModal } from "./components/HUD/sections";
import { Action, HexCoord, MapSize, TechId, UNITS, MAP_DIMS, MAX_CIVS_BY_MAP_SIZE, findPath, DiplomacyState } from "@simple-civ/engine";
import { hexEquals, hexDistance, hexToString } from "./utils/hex";
import { CIV_OPTIONS, CivId, CivOption, pickAiCiv, pickPlayerColor } from "./data/civs";
import { useGameSession } from "./hooks/useGameSession";
import { useReachablePaths } from "./hooks/useReachablePaths";

function App() {
    const handleSessionRestore = useCallback(() => setShowTitleScreen(false), []);

    const {
        gameState,
        playerId,
        runActions,
        startNewGame,
        restartLastGame,
        handleSave,
        handleLoad,
        lastGameSettings,
        clearSession,
        error,
        setError,
    } = useGameSession({ onSessionRestore: handleSessionRestore });
    const mapRef = useRef<GameMapHandle | null>(null);
    const [selectedCoord, setSelectedCoord] = useState<HexCoord | null>(null);
    const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
    const [hoveredCoord, setHoveredCoord] = useState<HexCoord | null>(null);
    const [showTechTree, setShowTechTree] = useState(false);
    const [showShroud, setShowShroud] = useState(true);
    const [showTileYields, setShowTileYields] = useState(false);
    const [selectedCiv, setSelectedCiv] = useState<CivId>(CIV_OPTIONS[0].id);
    const [selectedMapSize, setSelectedMapSize] = useState<MapSize>("Small");
    const [numCivs, setNumCivs] = useState(2);
    const [seedInput, setSeedInput] = useState("");
    const [showTitleScreen, setShowTitleScreen] = useState(true);
    const [cityToCenter, setCityToCenter] = useState<HexCoord | null>(null);
    const [mapView, setMapView] = useState<MapViewport | null>(null);
    const [pendingWarAttack, setPendingWarAttack] = useState<{ action: Action; targetPlayerId: string } | null>(null);
    const [showGameMenu, setShowGameMenu] = useState(false);

    // Auto-clear error after 3 seconds
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [error, setError]);

    // Enforce constraints when map size changes
    useEffect(() => {
        const maxForMap = MAX_CIVS_BY_MAP_SIZE[selectedMapSize] ?? 4;
        const maxForCivs = CIV_OPTIONS.length;
        const effectiveMax = Math.min(maxForMap, maxForCivs);
        if (numCivs > effectiveMax) {
            setNumCivs(effectiveMax);
        }
    }, [selectedMapSize, numCivs]);

    // Global key listener for shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (selectedUnitId || selectedCoord) {
                    setSelectedCoord(null);
                    setSelectedUnitId(null);
                } else if (showTechTree) {
                    setShowTechTree(false);
                } else if (showGameMenu) {
                    setShowGameMenu(false);
                } else {
                    setShowGameMenu(true);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedUnitId, selectedCoord, showTechTree, showGameMenu]);

    const handleStartNewGame = () => {
        try {
            const rawSeed = seedInput.trim() === "" ? undefined : Number(seedInput);
            const parsedSeed = rawSeed != null && !Number.isNaN(rawSeed) ? rawSeed : undefined;

            const usedColors = new Set<string>();
            const humanColor = pickPlayerColor(selectedCiv, usedColors);

            const players = [];

            // Human player
            players.push({ id: "p1", civName: selectedCiv, color: humanColor });

            // AI players

            // If we run out of unique civs, we might need to duplicate (though requirement says max <= unique)
            // The constraint logic should prevent this, but let's be safe or just pick from available.

            for (let i = 1; i < numCivs; i++) {
                const aiCiv = pickAiCiv([selectedCiv, ...players.slice(1).map(p => p.civName as CivId)], parsedSeed ? parsedSeed + i : undefined);
                const aiColor = pickPlayerColor(aiCiv.id, usedColors);
                players.push({ id: `p${i + 1}`, civName: aiCiv.id, color: aiColor, ai: true });
            }

            const settings = { mapSize: selectedMapSize, players, seed: parsedSeed };
            const state = startNewGame(settings);
            console.info("[World] seed", state.seed);
            setShowTechTree(true);
            setShowTitleScreen(false);
            setSelectedCoord(null);
            setSelectedUnitId(null);
        } catch (error: any) {
            console.error("App: Error generating world:", error);
            alert(`Failed to start game: ${error?.message ?? error}`);
        }
    };

    const { reachablePaths, reachableCoordSet } = useReachablePaths(gameState, playerId, selectedUnitId);

    const handleAction = useCallback((action: Action) => {
        runActions([action]);
        // Deselect unit when auto-explore is enabled
        if (action.type === "SetAutoExplore") {
            setSelectedUnitId(null);
            setSelectedCoord(null);
        }
    }, [runActions, setSelectedCoord, setSelectedUnitId]);

    const handleChooseTech = (techId: TechId) => {
        handleAction({ type: "ChooseTech", playerId, techId });
        setShowTechTree(false);
    };

    const handleTileClick = useCallback((coord: HexCoord) => {
        if (!gameState) return;

        // If unit selected and clicking another tile -> Move?
        if (selectedUnitId) {
            const unit = gameState.units.find(u => u.id === selectedUnitId);
            if (unit && unit.ownerId === playerId) {
                // Try to move
                // Or Attack?
                // Simple heuristic: if enemy unit on target -> Attack. Else -> Move.
                const targetUnit = gameState.units.find(u => hexEquals(u.coord, coord));

                if (targetUnit && targetUnit.ownerId !== playerId) {
                    const attackAction: Action = {
                        type: "Attack",
                        playerId,
                        attackerId: unit.id,
                        targetId: targetUnit.id,
                        targetType: "Unit"
                    };

                    // Check if attacking would declare war
                    const diplomacyState = gameState.diplomacy[playerId]?.[targetUnit.ownerId] || DiplomacyState.Peace;
                    if (diplomacyState === DiplomacyState.Peace) {
                        // Show war declaration modal
                        setPendingWarAttack({ action: attackAction, targetPlayerId: targetUnit.ownerId });
                    } else {
                        // Already at war, execute attack immediately
                        handleAction(attackAction);
                        setSelectedCoord(null);
                        setSelectedUnitId(null);
                    }
                    return;
                }

                // Check for enemy city attack
                const targetCity = gameState.cities.find(c => hexEquals(c.coord, coord));
                if (targetCity && targetCity.ownerId !== playerId && targetCity.hp > 0) {
                    const unitStats = UNITS[unit.type];
                    const dist = hexDistance(unit.coord, coord);
                    if (dist <= unitStats.rng) {
                        const attackAction: Action = {
                            type: "Attack",
                            playerId,
                            attackerId: unit.id,
                            targetId: targetCity.id,
                            targetType: "City"
                        };

                        // Check if attacking would declare war
                        const diplomacyState = gameState.diplomacy[playerId]?.[targetCity.ownerId] || DiplomacyState.Peace;
                        if (diplomacyState === DiplomacyState.Peace) {
                            // Show war declaration modal
                            setPendingWarAttack({ action: attackAction, targetPlayerId: targetCity.ownerId });
                        } else {
                            // Already at war, execute attack immediately
                            handleAction(attackAction);
                            setSelectedCoord(null);
                            setSelectedUnitId(null);
                        }
                        return;
                    }
                }
                // Check if clicking on a friendly unit (that isn't self)
                const friendlyUnitOnTile = gameState.units.find(u => hexEquals(u.coord, coord) && u.ownerId === playerId);
                if (friendlyUnitOnTile && friendlyUnitOnTile.id !== unit.id) {
                    // If units are adjacent, swap them instead of selecting
                    const distance = hexDistance(unit.coord, friendlyUnitOnTile.coord);
                    if (distance === 1 && unit.movesLeft > 0) {
                        // Attempt to swap units
                        handleAction({
                            type: "SwapUnits",
                            playerId,
                            unitId: unit.id,
                            targetUnitId: friendlyUnitOnTile.id
                        });
                        // Keep the originally selected unit selected after swap (it will now be at the clicked position)
                        setSelectedCoord(coord);
                        setSelectedUnitId(unit.id);
                        return;
                    }
                    // If not adjacent, fall through to selection logic
                    setSelectedCoord(coord);
                    setSelectedUnitId(friendlyUnitOnTile.id);
                    return;
                }

                // If clicking self -> Deselect
                if (hexEquals(unit.coord, coord)) {
                    setSelectedUnitId(null);
                    setSelectedCoord(null);
                    return;
                }


                const coordKey = hexToString(coord);
                const plannedInfo = reachablePaths[coordKey];
                const plannedPath = plannedInfo?.path;
                if (plannedPath && plannedPath.length > 0) {
                    runActions(plannedPath.map((step: HexCoord) => ({
                        type: "MoveUnit",
                        playerId,
                        unitId: unit.id,
                        to: step,
                    })));

                    // Auto-deselect if unit will have 0 moves left
                    // Check if the plannedInfo indicates moves remaining
                    if (plannedInfo.movesLeft === 0) {
                        setSelectedCoord(null);
                        setSelectedUnitId(null);
                    } else {
                        setSelectedCoord(coord);
                        setSelectedUnitId(unit.id);
                    }
                    return;
                }

                // Fallback: If neighbor and not in reachablePaths (maybe cache issue), try direct move
                // But only if the unit has moves left
                if (hexDistance(unit.coord, coord) === 1 && unit.movesLeft > 0) {
                    handleAction({
                        type: "MoveUnit",
                        playerId,
                        unitId: unit.id,
                        to: coord
                    });
                    // Auto-deselect if unit had only 1 move left
                    if (unit.movesLeft === 1) {
                        setSelectedCoord(null);
                        setSelectedUnitId(null);
                    } else {
                        setSelectedCoord(coord);
                        setSelectedUnitId(unit.id);
                    }
                    return;
                }

                // If not immediately reachable (or no moves left), try to set auto-move target
                const autoPath = findPath(unit.coord, coord, unit, gameState);
                if (autoPath.length > 0) {
                    // Batch actions together to avoid state batching issues
                    const actions: Action[] = [{
                        type: "SetAutoMoveTarget",
                        playerId,
                        unitId: unit.id,
                        target: coord
                    }];

                    // Try to move the first step if it's a neighbor AND we have moves
                    const firstStep = autoPath[0];
                    if (firstStep && hexDistance(unit.coord, firstStep) === 1 && unit.movesLeft > 0) {
                        actions.push({
                            type: "MoveUnit",
                            playerId,
                            unitId: unit.id,
                            to: firstStep
                        });
                    }

                    runActions(actions);
                    // Fully deselect (clear both coordinate and unit)
                    setSelectedCoord(null);
                    setSelectedUnitId(null);
                    return;
                } else {
                    console.log("Auto-path not found");
                    // Optional: Feedback to user
                    // alert("Cannot reach target");
                }
            }
        }

        // Select tile and auto-select a friendly unit (prefer linked pairs)
        setSelectedCoord(coord);

        // Check if there's a city on this tile - if so, prioritize showing city UI over unit selection
        const cityOnTile = gameState.cities.find(c => hexEquals(c.coord, coord));
        if (cityOnTile) {
            setSelectedUnitId(null);
            return;
        }

        const friendlyUnits = gameState.units.filter(
            u => u.ownerId === playerId && hexEquals(u.coord, coord),
        );
        if (friendlyUnits.length === 0) {
            setSelectedUnitId(null);
            return;
        }

        // Prefer a unit that is linked with another unit on the tile
        const linkedUnit = friendlyUnits.find(u =>
            u.linkedUnitId && friendlyUnits.some(partner => partner.id === u.linkedUnitId),
        );
        setSelectedUnitId(linkedUnit?.id ?? friendlyUnits[0].id);
    }, [gameState, selectedUnitId, playerId, handleAction, reachablePaths, runActions, setSelectedCoord, setSelectedUnitId]);

    const handleSaveGame = () => {
        const saved = handleSave();
        alert(saved ? "Game saved." : "Failed to save game.");
    };

    const handleLoadGame = () => {
        const success = handleLoad();
        if (!success) {
            alert("No saved game found.");
            return;
        }
        setShowTitleScreen(false);
        setSelectedCoord(null);
        setSelectedUnitId(null);
        alert("Loaded saved game.");
    };

    const handleRestart = () => {
        if (!lastGameSettings) return;
        try {
            const restarted = restartLastGame();
            if (!restarted) return;
            console.info("[World] Restarted with previous settings");
            setShowTechTree(true);
            setSelectedCoord(null);
            setSelectedUnitId(null);
        } catch (error: any) {
            console.error("App: Error restarting game:", error);
            alert(`Failed to restart game: ${error?.message ?? error}`);
        }
    };

    // Reset cityToCenter after a brief delay to allow re-centering on same city
    useEffect(() => {
        if (cityToCenter) {
            const timeout = setTimeout(() => setCityToCenter(null), 100);
            return () => clearTimeout(timeout);
        }
    }, [cityToCenter]);

    const handleNavigateMapView = (point: { x: number; y: number }) => {
        mapRef.current?.centerOnPoint(point);
    };

    if (!gameState) {
        if (showTitleScreen) {
            return (
                <TitleScreen
                    onNewGame={() => setShowTitleScreen(false)}
                    onLoadGame={handleLoadGame}
                />
            );
        }

        return (
            <div style={{ position: "fixed", inset: 0, background: "var(--color-bg-deep)", color: "var(--color-text-main)", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
                <div style={{ width: "min(1200px, 100%)", height: "min(700px, 85vh)", background: "var(--color-bg-panel)", borderRadius: 24, boxShadow: "0 20px 80px rgba(0,0,0,0.5)", border: "1px solid var(--color-border)", display: "flex", flexDirection: "row", overflow: "hidden" }}>

                    {/* Left Column: Logo */}
                    <div style={{ flex: "0 0 30%", display: "flex", alignItems: "flex-start", justifyContent: "center", background: "var(--color-bg-deep)", paddingTop: 40 }}>
                        <img src="/logo.png" alt="SimpleCiv Logo" style={{ maxWidth: "80%", maxHeight: "80%", objectFit: "contain" }} />
                    </div>

                    {/* Right Column: Content */}
                    <div style={{ flex: 1, padding: 40, display: "flex", flexDirection: "column", gap: 24, minWidth: 0, overflow: "hidden" }}>

                        {/* Header */}
                        <div>
                            <div style={{ fontSize: 24, fontWeight: 700 }}>Choose your Civilization</div>
                        </div>

                        {/* Civ Grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, flex: 1, overflowY: "auto", minHeight: 0, paddingRight: 8 }}>
                            {CIV_OPTIONS.map((option: CivOption) => {
                                const isSelected = option.id === selectedCiv;
                                return (
                                    <button
                                        key={option.id}
                                        onClick={() => setSelectedCiv(option.id)}
                                        style={{
                                            textAlign: "left",
                                            background: isSelected ? "var(--color-bg-deep)" : "transparent",
                                            border: `2px solid ${isSelected ? "var(--color-highlight)" : "var(--color-border)"}`,
                                            borderRadius: 12,
                                            padding: "16px 16px 8px 16px",
                                            color: "var(--color-text-main)",
                                            cursor: "pointer",
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "flex-start",
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                                            <span style={{ width: 12, height: 12, borderRadius: "50%", background: option.color, display: "inline-block" }} />
                                            <span style={{ fontWeight: 700, fontSize: 16 }}>{option.title}</span>
                                        </div>
                                        <div style={{ fontSize: 14, color: "var(--color-text-muted)", marginBottom: 6 }}>{option.summary}</div>
                                        <div style={{ fontSize: 13, color: "var(--color-highlight)", lineHeight: 1.4, whiteSpace: "normal" }}>{option.perk}</div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Settings & Buttons */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: "auto", flexShrink: 0 }}>

                            {/* Settings Row */}
                            <div style={{ display: "flex", gap: 32, alignItems: "flex-end" }}>
                                {/* Map Size */}
                                <div>
                                    <label style={{ display: "block", fontSize: 14, color: "var(--color-text-muted)", marginBottom: 8 }}>Map Size</label>
                                    <div style={{ display: "flex", gap: 8 }}>
                                        {(Object.keys(MAP_DIMS) as MapSize[]).map((size) => (
                                            <button
                                                key={size}
                                                onClick={() => setSelectedMapSize(size)}
                                                style={{
                                                    padding: "8px 12px",
                                                    fontSize: 14,
                                                    borderRadius: 8,
                                                    border: `1px solid ${selectedMapSize === size ? "var(--color-highlight)" : "var(--color-border)"}`,
                                                    background: selectedMapSize === size ? "rgba(170, 130, 80, 0.2)" : "transparent",
                                                    color: selectedMapSize === size ? "var(--color-highlight)" : "var(--color-text-muted)",
                                                    cursor: "pointer",
                                                }}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Num Civs */}
                                <div>
                                    <label style={{ display: "block", fontSize: 14, color: "var(--color-text-muted)", marginBottom: 8 }}>Number of Civilizations</label>
                                    <div style={{ display: "flex", gap: 8 }}>
                                        {[2, 3, 4, 5, 6].map((count) => {
                                            const maxForMap = MAX_CIVS_BY_MAP_SIZE[selectedMapSize] ?? 4;
                                            const maxForCivs = CIV_OPTIONS.length;
                                            const effectiveMax = Math.min(maxForMap, maxForCivs);
                                            const isDisabled = count > effectiveMax;

                                            return (
                                                <button
                                                    key={count}
                                                    onClick={() => !isDisabled && setNumCivs(count)}
                                                    disabled={isDisabled}
                                                    style={{
                                                        padding: "8px 16px",
                                                        fontSize: 14,
                                                        borderRadius: 8,
                                                        border: `1px solid ${numCivs === count ? "var(--color-highlight)" : "var(--color-border)"}`,
                                                        background: numCivs === count ? "rgba(170, 130, 80, 0.2)" : isDisabled ? "rgba(0,0,0,0.2)" : "transparent",
                                                        color: numCivs === count ? "var(--color-highlight)" : isDisabled ? "rgba(255,255,255,0.2)" : "var(--color-text-muted)",
                                                        cursor: isDisabled ? "not-allowed" : "pointer",
                                                        opacity: isDisabled ? 0.5 : 1,
                                                    }}
                                                >
                                                    {count}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Seed */}
                                <div style={{ width: 80 }}>
                                    <label style={{ display: "block", fontSize: 14, color: "var(--color-text-muted)", marginBottom: 8 }}>Seed</label>
                                    <input
                                        type="text"
                                        value={seedInput}
                                        onChange={e => setSeedInput(e.target.value)}
                                        placeholder="Random"
                                        style={{ width: "100%", padding: "8px 12px", fontSize: 14, borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-bg-deep)", color: "var(--color-text-main)" }}
                                    />
                                </div>
                            </div>

                            {/* Buttons Row */}
                            <div style={{ display: "flex", gap: 16, justifyContent: "space-between", alignItems: "center" }}>
                                <button
                                    onClick={handleStartNewGame}
                                    style={{
                                        flex: 1,
                                        padding: "16px 32px",
                                        borderRadius: 12,
                                        border: "none",
                                        background: "var(--color-highlight-strong)",
                                        color: "var(--color-bg-main)",
                                        fontWeight: 700,
                                        fontSize: 18,
                                        cursor: "pointer",
                                        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                                        textAlign: "center"
                                    }}
                                >
                                    Start Game
                                </button>
                                <button
                                    onClick={handleLoadGame}
                                    style={{ padding: "16px 24px", borderRadius: 12, border: "1px solid var(--color-border)", background: "transparent", color: "var(--color-text-main)", cursor: "pointer", fontWeight: 600, fontSize: 16 }}
                                >
                                    Load Save
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ width: "100vw", height: "100vh", overflow: "hidden", position: "relative" }}>
            <GameMap
                ref={mapRef}
                gameState={gameState}
                onTileClick={handleTileClick}
                selectedCoord={selectedCoord}
                playerId={playerId}
                showShroud={showShroud}
                selectedUnitId={selectedUnitId}
                reachableCoords={reachableCoordSet}
                showTileYields={showTileYields}
                hoveredCoord={hoveredCoord}
                onHoverTile={setHoveredCoord}
                cityToCenter={cityToCenter}
                onViewChange={setMapView}
            />
            <HUD
                gameState={gameState}
                selectedCoord={selectedCoord}
                selectedUnitId={selectedUnitId}
                onAction={handleAction}
                onSelectUnit={setSelectedUnitId}
                onSelectCoord={setSelectedCoord}
                onShowTechTree={() => setShowTechTree(true)}
                playerId={playerId}
                onSave={handleSaveGame}
                onLoad={handleLoadGame}
                onRestart={handleRestart}
                onQuit={() => {
                    clearSession();
                    setSelectedCoord(null);
                    setSelectedUnitId(null);
                    setHoveredCoord(null);
                    setShowTechTree(false);
                    setCityToCenter(null);
                    setMapView(null);
                    setShowTitleScreen(true);
                }}
                showShroud={showShroud}
                onToggleShroud={() => setShowShroud(prev => !prev)}
                showYields={showTileYields}
                onToggleYields={() => setShowTileYields(prev => !prev)}
                onCenterCity={setCityToCenter}
                mapView={mapView}
                onNavigateMap={handleNavigateMapView}
                showGameMenu={showGameMenu}
                onToggleGameMenu={setShowGameMenu}
            />
            {showTechTree && (
                <TechTree
                    gameState={gameState}
                    playerId={playerId}
                    onChooseTech={handleChooseTech}
                    onClose={() => setShowTechTree(false)}
                />
            )}
            {gameState?.winnerId && (
                <VictoryLossScreen
                    winnerId={gameState.winnerId}
                    playerId={playerId}
                    winnerCivName={gameState.players.find((p) => p.id === gameState.winnerId)?.civName ?? "Unknown"}
                    onRestart={handleRestart}
                    onQuit={() => {
                        clearSession();
                        setSelectedCoord(null);
                        setSelectedUnitId(null);
                        setHoveredCoord(null);
                        setShowTechTree(false);
                        setCityToCenter(null);
                        setMapView(null);
                        setShowTitleScreen(true);
                    }}
                />
            )}
            {pendingWarAttack && gameState && (() => {
                const targetPlayer = gameState.players.find(p => p.id === pendingWarAttack.targetPlayerId);
                return targetPlayer ? (
                    <WarDeclarationModal
                        targetCivName={targetPlayer.civName}
                        targetColor={targetPlayer.color}
                        onConfirm={() => {
                            // Declare war first
                            handleAction({ type: "SetDiplomacy", playerId, targetPlayerId: pendingWarAttack.targetPlayerId, state: DiplomacyState.War });
                            // Then execute the attack
                            handleAction(pendingWarAttack.action);
                            setPendingWarAttack(null);
                            setSelectedCoord(null);
                            setSelectedUnitId(null);
                        }}
                        onCancel={() => {
                            setPendingWarAttack(null);
                        }}
                    />
                ) : null;
            })()}
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
}

export default App;
