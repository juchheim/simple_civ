import { useCallback, useEffect, useState } from "react";
import { DifficultyLevel, MapSize, MAX_CIVS_BY_MAP_SIZE } from "@simple-civ/engine";
import { CIV_OPTIONS, CivId, pickAiCiv, pickPlayerColor } from "../data/civs";

export type SetupPlayer = {
    id: string;
    civName: CivId;
    color: string;
    ai?: boolean;
};

type UseGameSetupConfigResult = {
    selectedCiv: CivId;
    setSelectedCiv: (civId: CivId) => void;
    selectedMapSize: MapSize;
    setSelectedMapSize: (mapSize: MapSize) => void;
    numCivs: number;
    setNumCivs: (count: number) => void;
    selectedDifficulty: DifficultyLevel;
    setSelectedDifficulty: (difficulty: DifficultyLevel) => void;
    buildPlayers: (parsedSeed?: number) => SetupPlayer[];
};

export function useGameSetupConfig(): UseGameSetupConfigResult {
    const [selectedCiv, setSelectedCiv] = useState<CivId>(CIV_OPTIONS[0].id);
    const [selectedMapSize, setSelectedMapSize] = useState<MapSize>("Standard");
    const [numCivs, setNumCivs] = useState(4);
    const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>("Normal");

    useEffect(() => {
        const maxForMap = MAX_CIVS_BY_MAP_SIZE[selectedMapSize] ?? 4;
        const maxForCivs = CIV_OPTIONS.length;
        const effectiveMax = Math.min(maxForMap, maxForCivs);
        if (numCivs > effectiveMax) {
            setNumCivs(effectiveMax);
        }
    }, [selectedMapSize, numCivs]);

    const buildPlayers = useCallback((parsedSeed?: number): SetupPlayer[] => {
        const usedColors = new Set<string>();
        const chosenCivs: CivId[] = [selectedCiv];
        const humanColor = pickPlayerColor(selectedCiv, usedColors);
        const players: SetupPlayer[] = [{ id: "p1", civName: selectedCiv, color: humanColor }];

        for (let i = 1; i < numCivs; i++) {
            const aiCiv = pickAiCiv(chosenCivs, parsedSeed ? parsedSeed + i : undefined);
            const aiColor = pickPlayerColor(aiCiv.id, usedColors);
            players.push({ id: `p${i + 1}`, civName: aiCiv.id, color: aiColor, ai: true });
            chosenCivs.push(aiCiv.id);
        }

        return players;
    }, [numCivs, selectedCiv]);

    return {
        selectedCiv,
        setSelectedCiv,
        selectedMapSize,
        setSelectedMapSize,
        numCivs,
        setNumCivs,
        selectedDifficulty,
        setSelectedDifficulty,
        buildPlayers,
    };
}
