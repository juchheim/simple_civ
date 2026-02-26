import React from "react";
import { City, GameState, HexCoord, Unit, getCityYields } from "@simple-civ/engine";
import { CityBuildOptions } from "../hooks";
import { useTutorial } from "../../../contexts/TutorialContext";
import {
    CityInfoHeader,
    DefenseSection,
    EnemyCityPanel,
    ProductionSection,
    WorkedTilesSection
} from "./CityPanelSections";
import {
    formatBuildId,
    getCityUpkeep,
    getOwnedTilesForCity,
} from "./city-panel-helpers";

type CityPanelProps = {
    city: City;
    isMyTurn: boolean;
    playerId: string;
    gameState: GameState;
    units: Unit[];
    buildOptions: CityBuildOptions;
    onBuild: (type: "Unit" | "Building" | "Project", id: string) => void;
    onRushBuy: (cityId: string) => void;
    onRazeCity: () => void;
    // onCityAttack: (targetUnitId: string) => void;
    onSetWorkedTiles: (cityId: string, tiles: HexCoord[]) => void;
    onSelectUnit: (unitId: string) => void;
    onClose: () => void;
};

export const CityPanel: React.FC<CityPanelProps> = ({
    city,
    isMyTurn,
    playerId,
    gameState,
    units,
    buildOptions,
    onBuild,
    onRushBuy,
    onRazeCity,
    // onCityAttack,
    onSetWorkedTiles,
    onSelectUnit,
    onClose,
}) => {
    const [localWorked, setLocalWorked] = React.useState<HexCoord[]>(city.workedTiles);
    const tutorial = useTutorial();

    React.useEffect(() => {
        setLocalWorked(city.workedTiles);
    }, [city.id, city.workedTiles]);

    // Mark milestone when city is selected
    React.useEffect(() => {
        tutorial.markComplete("selectedFirstCity");
    }, [tutorial]);

    const ownedTiles = React.useMemo(() => getOwnedTilesForCity(city, gameState.map.tiles), [city, gameState.map.tiles]);

    const yields = getCityYields(city, gameState);
    const civ = gameState.players.find(p => p.id === city.ownerId)?.civName;
    const scholarActive = civ === "ScholarKingdoms" && city.pop >= 3;
    const activePlayer = gameState.players.find(p => p.id === playerId);
    const cityUpkeep = getCityUpkeep(city);

    const garrison = units.find(u => u.ownerId === playerId && u.coord.q === city.coord.q && u.coord.r === city.coord.r);

    const workedCount = localWorked.length;

    const isEnemyCity = city.ownerId !== playerId;

    if (isEnemyCity) {
        const unitsAtCity = units.filter(u => u.coord.q === city.coord.q && u.coord.r === city.coord.r);
        return (
            <EnemyCityPanel
                city={city}
                civ={civ}
                unitsAtCity={unitsAtCity}
                onSelectUnit={onSelectUnit}
                onClose={onClose}
            />
        );
    }

    return (
        <div>
            <CityInfoHeader
                city={city}
                civ={civ}
                scholarActive={scholarActive}
            />

            <div className="city-panel__stats">
                <span className="hud-chip">Yields: {yields.F}F / {yields.P}P / {yields.S}S / {yields.G}G</span>
                <span className="hud-chip">Upkeep: -{cityUpkeep}G</span>
                <span className="hud-chip">Treasury: {activePlayer?.treasury ?? 0}G</span>
                <span className="hud-chip">Worked: {workedCount}/{city.pop}</span>
                <span className="hud-chip">Build: {city.currentBuild ? formatBuildId(city.currentBuild.id) : "Idle"}</span>
            </div>

            <div className="city-panel__grid">
                <ProductionSection
                    city={city}
                    isMyTurn={isMyTurn}
                    gameState={gameState}
                    buildOptions={buildOptions}
                    onBuild={onBuild}
                    onRushBuy={onRushBuy}
                    turn={gameState.turn}
                    tutorial={tutorial}
                    productionPerTurn={yields.P}
                    treasury={activePlayer?.treasury ?? 0}
                    austerityActive={!!activePlayer?.austerityActive}
                />
                <WorkedTilesSection
                    city={city}
                    workedCount={workedCount}
                    ownedTiles={ownedTiles}
                    gameMap={gameState.map}
                    localWorked={localWorked}
                    onLocalWorkedChange={setLocalWorked}
                    onSetWorkedTiles={onSetWorkedTiles}
                />
                <DefenseSection
                    city={city}
                    isMyTurn={isMyTurn}
                    playerId={playerId}
                    units={units}
                    garrison={garrison}
                    onSelectUnit={onSelectUnit}
                    onClose={onClose}
                    onRazeCity={onRazeCity}
                />
            </div>
        </div>
    );
};
