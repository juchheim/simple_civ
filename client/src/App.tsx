import { useState, useEffect, useRef, useMemo } from "react";
import { GameMap } from "./components/GameMap";
import { HUD } from "./components/HUD";
import { TechTree } from "./components/TechTree";
import { GameState, Action, HexCoord, TechId, applyAction, generateWorld, runAiTurn, UNITS } from "@simple-civ/engine";
import { getNeighbors, hexEquals, hexDistance, hexToString } from "./utils/hex";

// Mock initial setup for single player
const INITIAL_PLAYERS = [
    { id: "p1", civName: "Red Empire", color: "red" },
    { id: "p2", civName: "Blue Republic", color: "blue", ai: true }
];

function App() {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [selectedCoord, setSelectedCoord] = useState<HexCoord | null>(null);
    const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
    const [showTechTree, setShowTechTree] = useState(false);
    const [showShroud, setShowShroud] = useState(true);
    const [playerId, setPlayerId] = useState("p1"); // Local player
    const SAVE_KEY = "simple-civ-save";

    const initRef = useRef(false);

    useEffect(() => {
        if (initRef.current) return;
        initRef.current = true;
        // Init Game
        try {
            // const state = generateWorld({ mapSize: "Small", players: INITIAL_PLAYERS });
            const state = generateWorld({ mapSize: "Small", players: INITIAL_PLAYERS, }); // seed: 41839,
            console.info("[World] seed", state.seed);
            setGameState(state);
            // Show tech tree on turn 1
            setShowTechTree(true);
        } catch (error) {
            console.error("App: Error generating world:", error);
            alert(`Failed to initialize game: ${error}`);
        }
    }, []);

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
                    setSelectedCoord(coord);
                    setSelectedUnitId(unit.id);
                    return;
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

    const handleSave = () => {
        if (!gameState) return;
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
            alert("Game saved.");
        } catch (e) {
            alert("Failed to save game.");
        }
    };

    const handleLoad = () => {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) {
                alert("No saved game found.");
                return;
            }
            const parsed = JSON.parse(raw) as GameState;
            setGameState(parsed);
            const currentPlayer = parsed.players.find(p => p.id === parsed.currentPlayerId);
            const fallbackPlayer = parsed.players.find(p => !p.isAI);
            const nextPlayerId = currentPlayer && !currentPlayer.isAI
                ? parsed.currentPlayerId
                : fallbackPlayer?.id ?? parsed.currentPlayerId;
            setPlayerId(nextPlayerId);
            setSelectedCoord(null);
            setSelectedUnitId(null);
        } catch (e) {
            alert("Failed to load game.");
        }
    };

    if (!gameState) return <div>Loading...</div>;

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
            />
            <div style={{ position: "absolute", top: 10, left: 10, padding: "10px 12px", background: "rgba(0,0,0,0.65)", color: "#fff", borderRadius: 6, fontSize: 12, lineHeight: 1.4, minWidth: 200 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Vision Key</div>
                <div><span style={{ display: "inline-block", width: 12, height: 12, background: "#86efac", marginRight: 6 }} />Visible</div>
                <div><span style={{ display: "inline-block", width: 12, height: 12, background: "#86efac", marginRight: 6, opacity: 0.45, border: "1px solid #111" }} />Fogged (seen, not visible)</div>
                <div><span style={{ display: "inline-block", width: 12, height: 12, background: "#050505", marginRight: 6, border: "1px dashed #555" }} />Shroud (unseen)</div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 11 }}>
                    <input type="checkbox" checked={showShroud} onChange={e => setShowShroud(e.target.checked)} />
                    Show unseen shroud
                </label>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <button onClick={handleSave} style={{ fontSize: 11 }}>Save</button>
                    <button onClick={handleLoad} style={{ fontSize: 11 }}>Load</button>
                </div>
            </div>
            <HUD
                gameState={gameState}
                selectedCoord={selectedCoord}
                selectedUnitId={selectedUnitId}
                onAction={handleAction}
                onSelectUnit={setSelectedUnitId}
                onShowTechTree={() => setShowTechTree(true)}
                playerId={playerId}
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
