import { useState, useEffect, useMemo } from "react";
import { GameMap } from "./components/GameMap";
import { HUD } from "./components/HUD";
import { TechTree } from "./components/TechTree";
import { TitleScreen } from "./components/TitleScreen";
import { GameState, Action, HexCoord, TechId, applyAction, generateWorld, runAiTurn, UNITS, MapSize, MAP_DIMS, MAX_CIVS_BY_MAP_SIZE, findPath } from "@simple-civ/engine";
import { getNeighbors, hexEquals, hexDistance, hexToString } from "./utils/hex";
import { CIV_OPTIONS, CivId, CivOption, pickAiCiv, pickPlayerColor } from "./data/civs";


function App() {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [selectedCoord, setSelectedCoord] = useState<HexCoord | null>(null);
    const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
    const [hoveredCoord, setHoveredCoord] = useState<HexCoord | null>(null);
    const [showTechTree, setShowTechTree] = useState(false);
    const [showShroud, setShowShroud] = useState(true);
    const [showTileYields, setShowTileYields] = useState(false);
    const [playerId, setPlayerId] = useState("p1"); // Local player
    const [selectedCiv, setSelectedCiv] = useState<CivId>(CIV_OPTIONS[0].id);
    const [selectedMapSize, setSelectedMapSize] = useState<MapSize>("Small");
    const [numCivs, setNumCivs] = useState(2);
    const [seedInput, setSeedInput] = useState("");
    const [showTitleScreen, setShowTitleScreen] = useState(true);
    const SAVE_KEY = "simple-civ-save";
    const AUTOSAVE_KEY = "simple-civ-autosave";
    const SESSION_SAVE_KEY = "simple-civ-session";

    interface SavedGame {
        timestamp: number;
        gameState: GameState;
    }

    // Enforce constraints when map size changes
    useEffect(() => {
        const maxForMap = MAX_CIVS_BY_MAP_SIZE[selectedMapSize] ?? 4;
        const maxForCivs = CIV_OPTIONS.length;
        const effectiveMax = Math.min(maxForMap, maxForCivs);
        if (numCivs > effectiveMax) {
            setNumCivs(effectiveMax);
        }
    }, [selectedMapSize, numCivs]);

    // Session persistence: Save on every state change
    useEffect(() => {
        if (gameState) {
            localStorage.setItem(SESSION_SAVE_KEY, JSON.stringify(gameState));
        }
    }, [gameState]);

    // Session persistence: Load on mount
    useEffect(() => {
        const sessionData = localStorage.getItem(SESSION_SAVE_KEY);
        if (sessionData) {
            try {
                const parsedState = JSON.parse(sessionData);
                setGameState(parsedState);
                setShowTitleScreen(false);

                // Restore player ID
                const currentPlayer = parsedState.players.find((p: any) => p.id === parsedState.currentPlayerId);
                const fallbackPlayer = parsedState.players.find((p: any) => !p.isAI);
                const nextPlayerId = currentPlayer && !currentPlayer.isAI
                    ? parsedState.currentPlayerId
                    : fallbackPlayer?.id ?? parsedState.currentPlayerId;
                setPlayerId(nextPlayerId);
            } catch (e) {
                console.warn("Failed to restore session", e);
                localStorage.removeItem(SESSION_SAVE_KEY);
            }
        }
    }, []);

    const startNewGame = () => {
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
            const state = generateWorld(settings);
            console.info("[World] seed", state.seed);
            setGameState(state);
            setPlayerId("p1");
            setShowTechTree(true);
        } catch (error: any) {
            console.error("App: Error generating world:", error);
            alert(`Failed to start game: ${error?.message ?? error}`);
        }
    };

    const reachablePaths = useMemo(() => {
        if (!gameState || !selectedUnitId) return {};
        const selectedUnit = gameState.units.find(u => u.id === selectedUnitId);
        if (!selectedUnit || selectedUnit.ownerId !== playerId || selectedUnit.movesLeft <= 0) {
            return {};
        }
        try {
            return computeReachablePaths(gameState, playerId, selectedUnitId);
        } catch (err) {
            console.warn("[Movement] failed to compute reachable tiles", err);
            return {};
        }
    }, [gameState, playerId, selectedUnitId]);

    const reachableCoordSet = useMemo(() => new Set(Object.keys(reachablePaths)), [reachablePaths]);

    const syncState = (nextState: GameState) => {
        setGameState(nextState);
        setPlayerId(prev => {
            const nextPlayer = nextState.players.find(p => p.id === nextState.currentPlayerId);
            if (nextPlayer && !nextPlayer.isAI && nextState.currentPlayerId !== prev) {
                return nextState.currentPlayerId;
            }
            return prev;
        });
    };

    const runActions = (actions: Action[]) => {
        if (!gameState || actions.length === 0) return;
        try {
            let nextState = gameState;
            for (const action of actions) {
                nextState = applyAction(nextState, action);
            }
            syncState(nextState);
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleAction = (action: Action) => runActions([action]);

    const handleChooseTech = (techId: TechId) => {
        handleAction({ type: "ChooseTech", playerId, techId });
        setShowTechTree(false);
    };

    const handleTileClick = (coord: HexCoord) => {
        if (!gameState) return;

        // If unit selected and clicking another tile -> Move?
        if (selectedCoord && selectedUnitId) {
            const unit = gameState.units.find(u => u.id === selectedUnitId);
            if (unit && unit.ownerId === playerId) {
                // Try to move
                // Or Attack?
                // Simple heuristic: if enemy unit on target -> Attack. Else -> Move.
                const targetUnit = gameState.units.find(u => hexEquals(u.coord, coord));

                if (targetUnit && targetUnit.ownerId !== playerId) {
                    handleAction({
                        type: "Attack",
                        playerId,
                        attackerId: unit.id,
                        targetId: targetUnit.id,
                        targetType: "Unit"
                    });
                    setSelectedCoord(null);
                    setSelectedUnitId(null);
                    return;
                }

                // Check for enemy city attack
                const targetCity = gameState.cities.find(c => hexEquals(c.coord, coord));
                if (targetCity && targetCity.ownerId !== playerId && targetCity.hp > 0) {
                    const unitStats = UNITS[unit.type];
                    const dist = hexDistance(unit.coord, coord);
                    if (dist <= unitStats.rng) {
                        handleAction({
                            type: "Attack",
                            playerId,
                            attackerId: unit.id,
                            targetId: targetCity.id,
                            targetType: "City"
                        });
                        setSelectedCoord(null);
                        setSelectedUnitId(null);
                        return;
                    }
                }
                // Check if clicking on a friendly unit (that isn't self) -> Select it instead of moving
                const friendlyUnitOnTile = gameState.units.find(u => hexEquals(u.coord, coord) && u.ownerId === playerId);
                if (friendlyUnitOnTile && friendlyUnitOnTile.id !== unit.id) {
                    // Fall through to selection logic
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
    };

    // Autoskip AI turns
    useEffect(() => {
        if (!gameState) return;
        let next = gameState;
        const current = () => next.players.find(p => p.id === next.currentPlayerId);
        let safety = 0;
        while (current()?.isAI && safety < 10) {
            next = runAiTurn(next, next.currentPlayerId);
            safety++;
        }
        if (next !== gameState) {
            setGameState(next);
            const nextPlayer = next.players.find(p => p.id === next.currentPlayerId);
            if (nextPlayer && !nextPlayer.isAI && next.currentPlayerId !== playerId) {
                setPlayerId(next.currentPlayerId);
            }
        }
    }, [gameState, playerId]);

    // Autosave every 5th turn
    useEffect(() => {
        if (!gameState) return;
        if (gameState.turn > 0 && gameState.turn % 5 === 0 && gameState.currentPlayerId === playerId) {
            const saveData: SavedGame = {
                timestamp: Date.now(),
                gameState: gameState,
            };
            try {
                localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(saveData));
                console.log("Autosave created at turn", gameState.turn);
            } catch (e) {
                console.warn("Failed to autosave", e);
            }
        }
    }, [gameState?.turn, gameState?.currentPlayerId, playerId]);

    const handleSave = () => {
        if (!gameState) return;
        try {
            const saveData: SavedGame = {
                timestamp: Date.now(),
                gameState: gameState,
            };
            localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
            alert("Game saved.");
        } catch (e) {
            alert("Failed to save game.");
        }
    };

    const handleLoad = () => {
        try {
            const rawManual = localStorage.getItem(SAVE_KEY);
            const rawAuto = localStorage.getItem(AUTOSAVE_KEY);

            if (!rawManual && !rawAuto) {
                alert("No saved game found.");
                return;
            }

            let manualSave: SavedGame | null = null;
            let autoSave: SavedGame | null = null;

            if (rawManual) {
                try {
                    const parsed = JSON.parse(rawManual);
                    // Handle legacy saves without timestamp
                    if (!parsed.timestamp) {
                        manualSave = { timestamp: 0, gameState: parsed };
                    } else {
                        manualSave = parsed;
                    }
                } catch (e) {
                    console.warn("Failed to parse manual save");
                }
            }

            if (rawAuto) {
                try {
                    const parsed = JSON.parse(rawAuto);
                    if (!parsed.timestamp) {
                        autoSave = { timestamp: 0, gameState: parsed };
                    } else {
                        autoSave = parsed;
                    }
                } catch (e) {
                    console.warn("Failed to parse autosave");
                }
            }

            let bestSave = manualSave;
            if (autoSave) {
                if (!manualSave || autoSave.timestamp > manualSave.timestamp) {
                    bestSave = autoSave;
                }
            }

            if (!bestSave) {
                alert("Failed to load any valid save.");
                return;
            }

            setGameState(bestSave.gameState);
            const parsed = bestSave.gameState;
            const currentPlayer = parsed.players.find(p => p.id === parsed.currentPlayerId);
            const fallbackPlayer = parsed.players.find(p => !p.isAI);
            const nextPlayerId = currentPlayer && !currentPlayer.isAI
                ? parsed.currentPlayerId
                : fallbackPlayer?.id ?? parsed.currentPlayerId;
            setPlayerId(nextPlayerId);
            setSelectedCoord(null);
            setSelectedUnitId(null);
            setPlayerId(nextPlayerId);
            setSelectedCoord(null);
            setSelectedUnitId(null);
            setShowTitleScreen(false);
            alert(`Loaded game (Turn ${parsed.turn})`);
        } catch (e) {
            alert("Failed to load game.");
        }
    };

    if (!gameState) {
        if (showTitleScreen) {
            return (
                <TitleScreen
                    onNewGame={() => setShowTitleScreen(false)}
                    onLoadGame={handleLoad}
                />
            );
        }

        return (
            <div style={{ width: "100vw", height: "100vh", background: "#0b1021", color: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
                <div style={{ width: "min(960px, 100%)", background: "#111827", borderRadius: 12, padding: 24, boxShadow: "0 20px 80px rgba(0,0,0,0.35)", border: "1px solid #1f2937" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                        <div style={{ flex: "1 1 320px" }}>
                            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Choose your Civilization</div>
                            <div style={{ color: "#cbd5e1", fontSize: 14, marginBottom: 12 }}>
                                Pick a civ, optionally enter a seed, then start. The AI will grab a different civ automatically.
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                                {CIV_OPTIONS.map((option: CivOption) => {
                                    const isSelected = option.id === selectedCiv;
                                    return (
                                        <button
                                            key={option.id}
                                            onClick={() => setSelectedCiv(option.id)}
                                            style={{
                                                textAlign: "left",
                                                background: isSelected ? "#1f2937" : "#0f172a",
                                                border: `2px solid ${isSelected ? option.color : "#1f2937"}`,
                                                borderRadius: 10,
                                                padding: "10px 12px",
                                                color: "#e5e7eb",
                                                cursor: "pointer",
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                                <span style={{ width: 10, height: 10, borderRadius: "50%", background: option.color, display: "inline-block" }} />
                                                <span style={{ fontWeight: 700 }}>{option.title}</span>
                                            </div>
                                            <div style={{ fontSize: 12, color: "#cbd5e1", marginBottom: 4 }}>{option.summary}</div>
                                            <div style={{ fontSize: 12, color: "#a5b4fc" }}>{option.perk}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div style={{ width: 280, flex: "0 0 auto" }}>
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 6 }}>Optional seed</label>
                                <input
                                    type="text"
                                    value={seedInput}
                                    onChange={e => setSeedInput(e.target.value)}
                                    placeholder="e.g. 83755"
                                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #1f2937", background: "#0f172a", color: "#e5e7eb" }}
                                />
                                <div style={{ marginTop: 6, fontSize: 12, color: "#94a3b8" }}>
                                    Keep blank for a random seed. AI civ draw uses this seed too.
                                </div>
                            </div>
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 6 }}>Map Size</label>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                    {(Object.keys(MAP_DIMS) as MapSize[]).map((size) => (
                                        <button
                                            key={size}
                                            onClick={() => setSelectedMapSize(size)}
                                            style={{
                                                padding: "6px 10px",
                                                fontSize: 12,
                                                borderRadius: 6,
                                                border: `1px solid ${selectedMapSize === size ? "#3b82f6" : "#1f2937"}`,
                                                background: selectedMapSize === size ? "#1e3a8a" : "#0f172a",
                                                color: selectedMapSize === size ? "#93c5fd" : "#94a3b8",
                                                cursor: "pointer",
                                            }}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ display: "block", fontSize: 13, color: "#cbd5e1", marginBottom: 6 }}>Number of Civilizations</label>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
                                                    padding: "6px 12px",
                                                    fontSize: 12,
                                                    borderRadius: 6,
                                                    border: `1px solid ${numCivs === count ? "#3b82f6" : "#1f2937"}`,
                                                    background: numCivs === count ? "#1e3a8a" : isDisabled ? "#111827" : "#0f172a",
                                                    color: numCivs === count ? "#93c5fd" : isDisabled ? "#4b5563" : "#94a3b8",
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
                            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                                <button
                                    onClick={startNewGame}
                                    style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "none", background: "#22c55e", color: "#0b1021", fontWeight: 700, cursor: "pointer" }}
                                >
                                    Start Game
                                </button>
                                <button
                                    onClick={handleLoad}
                                    style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #1f2937", background: "#0f172a", color: "#e5e7eb", cursor: "pointer" }}
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
            />
            <HUD
                gameState={gameState}
                selectedCoord={selectedCoord}
                selectedUnitId={selectedUnitId}
                onAction={handleAction}
                onSelectUnit={setSelectedUnitId}
                onShowTechTree={() => setShowTechTree(true)}
                playerId={playerId}
                onSave={handleSave}
                onLoad={handleLoad}
                onQuit={() => {
                    setGameState(null);
                    setShowTitleScreen(true);
                    localStorage.removeItem(SESSION_SAVE_KEY);
                }}
                showShroud={showShroud}
                onToggleShroud={() => setShowShroud(prev => !prev)}
                showYields={showTileYields}
                onToggleYields={() => setShowTileYields(prev => !prev)}
            />
            {showTechTree && (
                <TechTree
                    gameState={gameState}
                    playerId={playerId}
                    onChooseTech={handleChooseTech}
                    onClose={() => setShowTechTree(false)}
                />
            )}
        </div>
    );
}

export default App;

type PathInfo = { path: HexCoord[]; movesLeft: number };
type PathMap = Record<string, PathInfo>;

function computeReachablePaths(state: GameState, playerId: string, unitId: string): PathMap {
    const unit = state.units.find(u => u.id === unitId);
    if (!unit || unit.ownerId !== playerId || unit.movesLeft <= 0) {
        return {};
    }

    const results: PathMap = {};
    type QueueNode = { state: GameState; path: HexCoord[] };
    const queue: QueueNode[] = [{ state, path: [] }];
    const bestStateSeen = new Map<string, number>();

    while (queue.length) {
        const node = queue.shift()!;
        const currentUnit = node.state.units.find(u => u.id === unitId);
        if (!currentUnit) {
            continue;
        }
        const partner = currentUnit.linkedUnitId
            ? node.state.units.find(u => u.id === currentUnit.linkedUnitId)
            : undefined;
        const signature = serializeUnitState(currentUnit, partner);
        const prevBest = bestStateSeen.get(signature);
        if (prevBest !== undefined && prevBest >= currentUnit.movesLeft) {
            continue;
        }
        bestStateSeen.set(signature, currentUnit.movesLeft);

        if (node.path.length > 0) {
            const key = hexToString(currentUnit.coord);
            const existing = results[key];
            if (!existing || existing.movesLeft < currentUnit.movesLeft) {
                results[key] = { path: [...node.path], movesLeft: currentUnit.movesLeft };
            }
        }

        if (currentUnit.movesLeft <= 0) {
            continue;
        }

        for (const neighbor of getNeighbors(currentUnit.coord)) {
            try {
                const nextState = applyAction(node.state, {
                    type: "MoveUnit",
                    playerId,
                    unitId,
                    to: neighbor,
                });
                queue.push({
                    state: nextState,
                    path: [...node.path, neighbor],
                });
            } catch {
                // Ignore invalid moves
            }
        }
    }

    return results;
}

function serializeUnitState(unit: GameState["units"][number], partner?: GameState["units"][number]) {
    const base = `${unit.id}:${unit.coord.q},${unit.coord.r}:${unit.movesLeft}`;
    if (!partner) return base;
    return `${base}|${partner.id}:${partner.coord.q},${partner.coord.r}:${partner.movesLeft}`;
}
