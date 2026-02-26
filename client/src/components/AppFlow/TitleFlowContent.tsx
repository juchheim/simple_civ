import React from "react";
import { DifficultyLevel, MapSize } from "@simple-civ/engine";
import { CivId } from "../../data/civs";
import { TitleScreen } from "../TitleScreen";
import { CivSelectionScreen } from "./CivSelectionScreen";

type TitleFlowContentProps = {
    showTitleScreen: boolean;
    onShowSetup: () => void;
    onLoadGame: () => void;
    selectedCiv: CivId;
    selectedMapSize: MapSize;
    numCivs: number;
    selectedDifficulty: DifficultyLevel;
    onSelectCiv: (civId: CivId) => void;
    onSelectMapSize: (mapSize: MapSize) => void;
    onSelectNumCivs: (numCivs: number) => void;
    onSelectDifficulty: (difficulty: DifficultyLevel) => void;
    onStartGame: () => void;
    onBack: () => void;
};

export const TitleFlowContent: React.FC<TitleFlowContentProps> = ({
    showTitleScreen,
    onShowSetup,
    onLoadGame,
    selectedCiv,
    selectedMapSize,
    numCivs,
    selectedDifficulty,
    onSelectCiv,
    onSelectMapSize,
    onSelectNumCivs,
    onSelectDifficulty,
    onStartGame,
    onBack,
}) => {
    if (showTitleScreen) {
        return (
            <TitleScreen
                onNewGame={onShowSetup}
                onLoadGame={onLoadGame}
            />
        );
    }

    return (
        <CivSelectionScreen
            selectedCiv={selectedCiv}
            selectedMapSize={selectedMapSize}
            numCivs={numCivs}
            selectedDifficulty={selectedDifficulty}
            onSelectCiv={onSelectCiv}
            onSelectMapSize={onSelectMapSize}
            onSelectNumCivs={onSelectNumCivs}
            onSelectDifficulty={onSelectDifficulty}
            onStartGame={onStartGame}
            onBack={onBack}
        />
    );
};
