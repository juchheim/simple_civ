import mongoose, { Schema, Document } from "mongoose";
import { GameState } from "@simple-civ/engine";

export interface IGame extends Document {
    state: GameState;
    createdAt: Date;
    updatedAt: Date;
}

const GameSchema: Schema = new Schema(
    {
        state: { type: Object, required: true },
    },
    { timestamps: true }
);

export const GameModel = mongoose.model<IGame>("Game", GameSchema);
