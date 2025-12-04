import { useCallback, useEffect, useRef, useState } from "react";
import { GameMap, GameMapHandle, MapViewport } from "./components/GameMap";
import { AppShell } from "./components/AppShell";
import { HUD } from "./components/HUD";
import { TechTree } from "./components/TechTree";
import { TitleScreen } from "./components/TitleScreen";
import { VictoryLossScreen } from "./components/VictoryLossScreen";
import { WarDeclarationModal } from "./components/HUD/sections";
import { Action, HexCoord, MapSize, TechId, MAP_DIMS, MAX_CIVS_BY_MAP_SIZE, DiplomacyState } from "@simple-civ/engine";
import { CIV_OPTIONS, CivId, CivOption, pickAiCiv, pickPlayerColor } from "./data/civs";
import { useGameSession } from "./hooks/useGameSession";
import { useInteractionController } from "./hooks/useInteractionController";
import { useGlobalHotkeys } from "./hooks/useGlobalHotkeys";

function App() {
    const handleSessionRestore = useCallback(() => setShowTitleScreen(false), []);

    const {
        gameState,
        playerId,
        runActions,
        startNewGame,
        restartLastGame,
        saveGame,
        loadGame,
        lastGameSettings,
        clearSession,
        error,
        setError,
    } = useGameSession({ onSessionRestore: handleSessionRestore });
    const mapRef = useRef<GameMapHandle | null>(null);
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
    const [showGameMenu, setShowGameMenu] = useState(false);

    const dispatchAction = useCallback((action: Action) => {
        runActions([action]);
    }, [runActions]);

    const {
        selectedCoord,
        setSelectedCoord,
        selectedUnitId,
        setSelectedUnitId,
        pendingWarAttack,
        setPendingWarAttack,
        handleTileClick,
        reachableCoordSet,
    } = useInteractionController({
        gameState,
        playerId,
        dispatchAction,
        runActions,
    });

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

    const clearSelection = useCallback(() => {
        setSelectedCoord(null);
        setSelectedUnitId(null);
    }, [setSelectedCoord, setSelectedUnitId]);

    const closeTechTree = useCallback(() => setShowTechTree(false), []);
    const closeGameMenu = useCallback(() => setShowGameMenu(false), []);
    const openGameMenu = useCallback(() => setShowGameMenu(true), []);

    useGlobalHotkeys({
        selectedCoord,
        selectedUnitId,
        showTechTree,
        showGameMenu,
        clearSelection,
        closeTechTree,
        closeGameMenu,
        openGameMenu,
    });

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

    const handleAction = useCallback((action: Action) => {
        runActions([action]);
        if (action.type === "SetAutoExplore") {
            setSelectedUnitId(null);
            setSelectedCoord(null);
        }
    }, [runActions, setSelectedCoord, setSelectedUnitId]);

    const handleChooseTech = useCallback((techId: TechId) => {
        handleAction({ type: "ChooseTech", playerId, techId });
        setShowTechTree(false);
    }, [handleAction, playerId]);

    const handleSaveGame = useCallback(() => {
        const saved = saveGame();
        alert(saved ? "Game saved." : "Failed to save game.");
    }, [saveGame]);

    const handleLoadGame = useCallback(() => {
        const success = loadGame();
        if (!success) {
            alert("No saved game found.");
            return;
        }
        setShowTitleScreen(false);
        setSelectedCoord(null);
        setSelectedUnitId(null);
        alert("Loaded saved game.");
    }, [loadGame, setSelectedCoord, setSelectedUnitId]);

    const handleRestart = useCallback(() => {
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
    }, [lastGameSettings, restartLastGame, setSelectedCoord, setSelectedUnitId, setShowTechTree]);

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

    const maxCivsGlobal = Math.max(...Object.values(MAX_CIVS_BY_MAP_SIZE));
    const titleContent = showTitleScreen ? (
        <TitleScreen
            onNewGame={() => setShowTitleScreen(false)}
            onLoadGame={handleLoadGame}
        />
    ) : (
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
                                                border: size === selectedMapSize ? "2px solid var(--color-highlight)" : "1px solid var(--color-border)",
                                                background: size === selectedMapSize ? "var(--color-bg-deep)" : "transparent",
                                                color: "var(--color-text-main)",
                                                cursor: "pointer",
                                            }}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Number of Civs */}
                            <div>
                                <label style={{ display: "block", fontSize: 14, color: "var(--color-text-muted)", marginBottom: 8 }}>Civilizations</label>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(44px, 1fr))", gap: 3, maxWidth: 240 }}>
                                    {Array.from({ length: maxCivsGlobal - 1 }, (_, i) => i + 2).map(count => {
                                        const allowedForMap = MAX_CIVS_BY_MAP_SIZE[selectedMapSize] ?? 4;
                                        const allowed = count <= allowedForMap && count <= CIV_OPTIONS.length;
                                        return (
                                            <button
                                                key={count}
                                                onClick={() => {
                                                    if (!allowed) return;
                                                    setNumCivs(count);
                                                }}
                                                disabled={!allowed}
                                                style={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: 8,
                                                    border: count === numCivs ? "2px solid var(--color-highlight)" : "1px solid var(--color-border)",
                                                    background: count === numCivs ? "var(--color-bg-deep)" : "transparent",
                                                    color: "var(--color-text-main)",
                                                    fontWeight: 600,
                                                    cursor: allowed ? "pointer" : "not-allowed",
                                                    opacity: allowed ? 1 : 0.5
                                                }}
                                            >
                                                {count}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Seed Input */}
                            <div style={{ marginLeft: "auto", minWidth: 40, maxWidth: 60, marginRight: 32 }}>
                                <label style={{ display: "block", fontSize: 14, color: "var(--color-text-muted)", marginBottom: 8 }}>Seed</label>
                                <input
                                    type="text"
                                    value={seedInput}
                                    onChange={(e) => setSeedInput(e.target.value)}
                                    placeholder="Random"
                                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-bg-deep)", color: "var(--color-text-main)" }}
                                />
                            </div>
                        </div>

                        {/* Buttons */}
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <button
                                onClick={handleStartNewGame}
                                    style={{
                                        flex: 1,
                                        padding: "12px",
                                        borderRadius: 10,
                                        border: "none",
                                        background: "var(--color-highlight-strong, #cd8a36)",
                                        color: "white",
                                        fontWeight: 700,
                                        fontSize: 16,
                                    cursor: "pointer",
                                    boxShadow: "0 10px 30px rgba(0,0,0,0.25)"
                                }}
                            >
                                Start Game
                            </button>
                            <button
                                onClick={() => {
                                    setShowTitleScreen(true);
                                    setSelectedCoord(null);
                                    setSelectedUnitId(null);
                                    setHoveredCoord(null);
                                    setShowTechTree(false);
                                    setCityToCenter(null);
                                    setMapView(null);
                                }}
                                style={{
                                    padding: "12px 16px",
                                    borderRadius: 10,
                                    border: "1px solid var(--color-border)",
                                    background: "transparent",
                                    color: "var(--color-text-main)",
                                    cursor: "pointer",
                                    marginRight: 8
                                }}
                            >
                                Back
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
    const gameContent = gameState ? (
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
            {gameState.winnerId && (
                <VictoryLossScreen
                    winnerId={gameState.winnerId}
                    playerId={playerId}
                    winnerCivName={gameState.players.find((p) => p.id === gameState.winnerId)?.civName ?? "Unknown"}
                    onRestart={handleRestart}
                    onQuit={() => {
                        clearSession();
                        setSelectedCoord(null);
                        setSelectedUnitId(null);
                        setShowTechTree(false);
                        setCityToCenter(null);
                        setMapView(null);
                        setShowTitleScreen(true);
                    }}
                />
            )}
            {pendingWarAttack && (() => {
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
    ) : null;

    return (
        <AppShell
            showTitleScreen={!gameState}
            titleContent={titleContent}
            gameContent={gameContent}
        />
    );
}

export default App;
