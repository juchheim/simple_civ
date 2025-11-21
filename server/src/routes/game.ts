import express from "express";
import { generateWorld, GameState, applyAction, Action } from "@simple-civ/engine";
import { GameModel } from "../db/models";

export const gameRouter = express.Router();

// Create New Game
gameRouter.post("/", async (req, res) => {
    try {
        const { mapSize, players } = req.body;

        // Validate input
        if (!players || !Array.isArray(players) || players.length === 0) {
            return res.status(400).json({ error: "Invalid players" });
        }

        const initialState = generateWorld({
            mapSize: mapSize || "Small",
            players: players,
        });

        const game = new GameModel({ state: initialState });
        await game.save();

        res.status(201).json(game);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to create game" });
    }
});

// Get Game
gameRouter.get("/:id", async (req, res) => {
    try {
        const game = await GameModel.findById(req.params.id);
        if (!game) return res.status(404).json({ error: "Game not found" });
        res.json(game);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch game" });
    }
});

// Submit Action
gameRouter.post("/:id/action", async (req, res) => {
    try {
        const game = await GameModel.findById(req.params.id);
        if (!game) return res.status(404).json({ error: "Game not found" });

        const action = req.body as Action;

        // Apply Action using Engine
        const nextState = applyAction(game.state as GameState, action);

        // Update DB
        game.state = nextState;
        game.markModified("state"); // Mongoose needs this for Mixed types
        await game.save();

        res.json(game);
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }
});
