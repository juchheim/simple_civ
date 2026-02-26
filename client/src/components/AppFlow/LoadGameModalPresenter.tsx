import React from "react";
import { LoadGameModal } from "../LoadGameModal";

type SavedGameInfo = {
    timestamp: number;
    turn: number;
    civName: string;
};

type SaveSlots = {
    manual: SavedGameInfo | null;
    auto: SavedGameInfo | null;
};

type LoadGameModalPresenterProps = {
    isOpen: boolean;
    onClose: () => void;
    listSaves: () => SaveSlots;
    onLoad: (slot: "manual" | "auto") => void;
};

export const LoadGameModalPresenter: React.FC<LoadGameModalPresenterProps> = ({
    isOpen,
    onClose,
    listSaves,
    onLoad,
}) => {
    return (
        <LoadGameModal
            isOpen={isOpen}
            onClose={onClose}
            saves={listSaves()}
            onLoad={onLoad}
        />
    );
};
