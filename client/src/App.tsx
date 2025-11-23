import { useState, useEffect, useRef } from "react";
import { GameMap } from "./components/GameMap";
import { HUD } from "./components/HUD";
import { TechTree } from "./components/TechTree";
import { GameState, Action, HexCoord, TechId } from "@simple-civ/engine";
import { applyAction } from "./utils/turn-loop";
import { generateWorld } from "./utils/map-generator";
import { hexEquals, hexDistance } from "./utils/hex";
import { runAiTurn } from "./utils/ai";
import { UNITS } from "./utils/constants";

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
            const state = generateWorld({ mapSize: "Small", players: INITIAL_PLAYERS, seed: 41839, });
            console.info("[World] seed", state.seed);
            setGameState(state);
            // Show tech tree on turn 1
            setShowTechTree(true);
        } catch (error) {
            console.error("App: Error generating world:", error);
            alert(`Failed to initialize game: ${error}`);
        }
    }, []);

    const handleAction = (action: Action) => {
        if (!gameState) return;
        try {
            const nextState = applyAction(gameState, action);
            setGameState(nextState);

            const nextPlayer = nextState.players.find(p => p.id === nextState.currentPlayerId);
            if (nextPlayer && !nextPlayer.isAI && nextState.currentPlayerId !== playerId) {
                setPlayerId(nextState.currentPlayerId);
            }
        } catch (e: any) {
            alert(e.message);
        }
    };

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
                if (targetCity && targetCity.ownerId !== playerId) {
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

                // Move
                // Only if not clicking self
                if (!hexEquals(coord, selectedCoord)) {
                    handleAction({
                        type: "MoveUnit",
                        playerId,
                        unitId: unit.id,
                        to: coord
                    });
                    setSelectedCoord(null); // Deselect after move
                    setSelectedUnitId(null);
                    return;
                }
            }
        }

        // Select - set coord and clear unit selection (HUD will handle unit selection)
        setSelectedCoord(coord);
        setSelectedUnitId(null);
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
