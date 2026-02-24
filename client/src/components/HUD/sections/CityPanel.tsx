import React from "react";
import { City, GameState, HexCoord, Unit, getCityYields, getTileYields, getCityCenterYields, isTileAdjacentToRiver, UNITS, BUILDINGS, PROJECTS, UnitType, BuildingType, ProjectId, getProjectCost, getUnitCost, ECONOMIC_BUILDING_SUPPLY_BONUS, OverlayType } from "@simple-civ/engine";
import { hexDistance } from "../../../utils/hex";
import { getTerrainColor, hexToPixel } from "../../GameMap/geometry";
import { CityBuildOptions } from "../hooks";
import { useTutorial } from "../../../contexts/TutorialContext";

const formatBuildId = (id: string) => {
    return id
        .replace(/_/g, " ")
        .replace(/([A-Z])/g, " $1")
        .trim();
};

const getCityUpkeep = (city: City): number => {
    return city.buildings.reduce((sum, building) => sum + (BUILDINGS[building]?.maintenance ?? 0), 0);
};

const getCityRushBuyDiscountPct = (city: City): number => {
    return city.buildings.reduce((maxDiscount, building) => {
        return Math.max(maxDiscount, BUILDINGS[building]?.rushBuyDiscountPct ?? 0);
    }, 0);
};

const getCityRushBuyGoldCost = (city: City, remainingProduction: number): number => {
    const remaining = Math.max(0, Math.floor(remainingProduction));
    if (remaining <= 0) return 0;
    const discountPct = getCityRushBuyDiscountPct(city);
    if (discountPct <= 0) return remaining;
    return Math.max(0, Math.ceil(remaining * (1 - discountPct / 100)));
};

const isProgressProject = (projectId: string): boolean => {
    return projectId === ProjectId.Observatory || projectId === ProjectId.GrandAcademy || projectId === ProjectId.GrandExperiment;
};

const isUniqueCompletionBuild = (type: "Unit" | "Building" | "Project", id: string): boolean => {
    if (type === "Building") {
        return id === BuildingType.JadeGranary || id === BuildingType.Bulwark || id === BuildingType.TitansCore;
    }
    if (type === "Project") {
        const data = PROJECTS[id as ProjectId];
        return !!data?.oncePerCiv;
    }
    return false;
};

const buildUnitTooltip = (unitId: UnitType, turn: number): string => {
    const stats = UNITS[unitId];
    if (!stats) return "";
    const actualCost = getUnitCost(unitId, turn);
    const lines: string[] = [];
    if (actualCost !== stats.cost) {
        lines.push(`Cost: ${actualCost} Production (base: ${stats.cost})`);
    } else {
        lines.push(`Cost: ${stats.cost} Production`);
    }
    lines.push(`Attack: ${stats.atk} | Defense: ${stats.def} | HP: ${stats.hp}`);
    lines.push(`Move: ${stats.move} | Range: ${stats.rng} | Vision: ${stats.vision}`);
    if (stats.canCaptureCity) lines.push("Can capture cities");
    return lines.join("\n");
};

const getGoldConditionalBonus = (buildingId: BuildingType, city: City, gameState: GameState): { active: boolean; bonus: number } | null => {
    if (buildingId === BuildingType.TradingPost) {
        const active = isTileAdjacentToRiver(gameState.map, city.coord);
        return { active, bonus: active ? 1 : 0 };
    }
    if (buildingId === BuildingType.MarketHall) {
        const active = city.pop >= 5;
        return { active, bonus: active ? 1 : 0 };
    }
    if (buildingId === BuildingType.Bank) {
        const active = city.workedTiles.some(coord => {
            const tile = gameState.map.tiles.find(t => t.coord.q === coord.q && t.coord.r === coord.r);
            return !!tile?.overlays.includes(OverlayType.OreVein);
        });
        return { active, bonus: active ? 1 : 0 };
    }
    return null;
};

const buildBuildingTooltip = (buildingId: BuildingType, city: City, gameState: GameState): string => {
    const data = BUILDINGS[buildingId];
    if (!data) return "";
    const lines = [`Cost: ${data.cost} Production`];
    const baseGold = data.yieldFlat?.G ?? 0;
    const upkeep = data.maintenance ?? 0;
    const yields = [];
    if (data.yieldFlat?.F) yields.push(`+${data.yieldFlat.F} Food`);
    if (data.yieldFlat?.P) yields.push(`+${data.yieldFlat.P} Production`);
    if (data.yieldFlat?.S) yields.push(`+${data.yieldFlat.S} Science`);
    if (yields.length > 0) lines.push(yields.join(", "));
    if (baseGold > 0) {
        const baseNetGold = baseGold - upkeep;
        lines.push(`Gold: ${baseNetGold >= 0 ? "+" : ""}${baseNetGold} net/turn`);
        if (upkeep > 0) {
            lines.push(`Breakdown: +${baseGold} income, -${upkeep} upkeep`);
        }
    } else if (upkeep > 0) {
        lines.push(`Upkeep: ${upkeep} Gold/turn`);
    }
    const supplyBonus = ECONOMIC_BUILDING_SUPPLY_BONUS[buildingId] ?? 0;
    if (supplyBonus > 0) lines.push(`+${supplyBonus} Free Military Supply`);
    if (data.rushBuyDiscountPct) lines.push(`Rush-Buy Discount: -${data.rushBuyDiscountPct}% in this city`);
    if (data.defenseBonus) lines.push(`+${data.defenseBonus} City Defense`);
    if (data.cityAttackBonus) lines.push(`+${data.cityAttackBonus} City Attack`);
    if (data.growthMult) lines.push(`${Math.round((1 - data.growthMult) * 100)}% faster growth`);
    if (data.conditional) lines.push(data.conditional);

    const conditional = getGoldConditionalBonus(buildingId, city, gameState);
    if (conditional) {
        lines.push(`Conditional now: ${conditional.active ? "Active" : "Inactive"} (${conditional.bonus > 0 ? "+" : ""}${conditional.bonus} Gold)`);
        const netGoldNow = baseGold + conditional.bonus - upkeep;
        lines.push(`Gold now: ${netGoldNow >= 0 ? "+" : ""}${netGoldNow} net/turn`);
    }

    return lines.join("\n");
};

const buildProjectTooltip = (projectId: ProjectId, turn: number): string => {
    const data = PROJECTS[projectId];
    if (!data) return "";
    const actualCost = getProjectCost(projectId, turn);
    const lines: string[] = [];
    if (data.scalesWithTurn && actualCost !== data.cost) {
        lines.push(`Cost: ${actualCost} Production (base: ${data.cost})`);
    } else {
        lines.push(`Cost: ${data.cost} Production`);
    }
    const effect = data.onComplete;
    if (effect.type === "Milestone") {
        if (effect.payload.scienceBonusCity) lines.push(`+${effect.payload.scienceBonusCity} Science in this city`);
        if (effect.payload.scienceBonusPerCity) lines.push(`+${effect.payload.scienceBonusPerCity} Science per city`);
        if (effect.payload.unlock) lines.push(`Unlocks: ${formatBuildId(effect.payload.unlock)}`);
    } else if (effect.type === "Victory") {
        lines.push("Completes Progress Victory!");
    } else if (effect.type === "Transform") {
        lines.push(`Upgrades ${formatBuildId(effect.payload.baseUnit)} to ${formatBuildId(effect.payload.armyUnit)}`);
    } else if (effect.type === "GrantYield") {
        const grant = effect.payload;
        if (grant.F) lines.push(`Grants +${grant.F} Food`);
        if (grant.S) lines.push(`Grants +${grant.S} Science`);
    }
    return lines.join("\n");
};

const getOwnedTilesForCity = (city: City, tiles: GameState["map"]["tiles"]) => {
    const byCityClaim = tiles.filter(tile => tile.ownerCityId === city.id);
    const fallbackRange = tiles.filter(tile => tile.ownerId === city.ownerId && hexDistance(tile.coord, city.coord) <= 2);
    const tilesForMap = byCityClaim.length > 0 ? byCityClaim : fallbackRange;
    const hasCenter = tilesForMap.some(t => t.coord.q === city.coord.q && t.coord.r === city.coord.r);
    if (hasCenter) return tilesForMap;

    const centerTile = tiles.find(t => t.coord.q === city.coord.q && t.coord.r === city.coord.r);
    return centerTile ? [centerTile, ...tilesForMap] : tilesForMap;
};

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

type EnemyCityPanelProps = {
    city: City;
    civ?: string;
    unitsAtCity: Unit[];
    onSelectUnit: (unitId: string) => void;
    onClose: () => void;
};

const EnemyCityPanel: React.FC<EnemyCityPanelProps> = ({ city, civ, unitsAtCity, onSelectUnit, onClose }) => (
    <div>
        <div className="hud-section-title">City</div>
        <div className="hud-menu-header" style={{ alignItems: "flex-start", marginBottom: 6 }}>
            <div>
                <p className="hud-title" style={{ margin: "0 0 4px 0" }}>{city.name}</p>
                <div className="hud-subtext" style={{ marginTop: 0 }}>
                    {civ} · Pop {city.pop} · HP {city.hp}/{city.maxHp}
                </div>
            </div>
        </div>

        <div className="city-panel__section">
            <h5>Stationed Units</h5>
            <div className="hud-chip-row" style={{ marginBottom: 8, flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                {unitsAtCity.length === 0 ? (
                    <span className="hud-chip warn">No units in city</span>
                ) : (
                    <>
                        {unitsAtCity.map(unit => {
                            const isGarrison = unit.type !== "Settler" && unit.type !== "Scout";
                            return (
                                <button
                                    key={unit.id}
                                    className={`hud-chip clickable ${isGarrison ? "success" : ""}`}
                                    onClick={() => {
                                        onSelectUnit(unit.id);
                                        onClose();
                                    }}
                                    style={{
                                        cursor: "pointer",
                                        border: isGarrison ? "1px solid var(--color-success)" : "1px solid var(--color-border)",
                                        background: isGarrison ? "rgba(34, 197, 94, 0.1)" : "rgba(255, 255, 255, 0.05)",
                                        width: "100%",
                                        textAlign: "left"
                                    }}
                                >
                                    {isGarrison ? "Garrison: " : "Unit: "}{unit.type}
                                    <span style={{ float: "right", opacity: 0.7 }}>{unit.hp}/{unit.maxHp} HP</span>
                                </button>
                            );
                        })}
                    </>
                )}
            </div>
        </div>
    </div>
);

type CityInfoHeaderProps = {
    city: City;
    civ?: string;
    scholarActive: boolean;
};

const CityInfoHeader: React.FC<CityInfoHeaderProps> = ({ city, civ, scholarActive }) => (
    <>
        <div className="hud-section-title">City</div>
        <div className="hud-menu-header" style={{ alignItems: "flex-start", marginBottom: 6 }}>
            <div>
                <p className="hud-title" style={{ margin: "0 0 4px 0" }}>{city.name}</p>
                <div className="hud-subtext" style={{ marginTop: 0 }}>
                    Pop {city.pop} · HP {city.hp}/{city.maxHp}
                </div>
                {civ === "ScholarKingdoms" && (
                    <div className="hud-subtext" style={{ color: scholarActive ? "#a7f3d0" : "#fcd34d" }}>
                        Scholar Kingdoms: +1 Science at pop 3+ ({scholarActive ? "active" : "inactive"})
                    </div>
                )}
            </div>
            <div className="hud-chip-row" style={{ justifyContent: "flex-end" }}>
                <span className="hud-chip">Stored Food: {city.storedFood}</span>
                {city.storedProduction >= 1 && (
                    <span className="hud-chip">Stored Prod: {city.storedProduction}</span>
                )}
            </div>
        </div>
    </>
);

type ProductionSectionProps = {
    city: City;
    isMyTurn: boolean;
    gameState: GameState;
    buildOptions: CityBuildOptions;
    onBuild: (type: "Unit" | "Building" | "Project", id: string) => void;
    onRushBuy: (cityId: string) => void;
    turn: number;
    tutorial: ReturnType<typeof useTutorial>;
    productionPerTurn: number;
    treasury: number;
    austerityActive: boolean;
};

const ProductionSection: React.FC<ProductionSectionProps> = ({
    city,
    isMyTurn,
    gameState,
    buildOptions,
    onBuild,
    onRushBuy,
    turn,
    tutorial,
    productionPerTurn,
    treasury,
    austerityActive,
}) => {
    const handleBuild = (type: "Unit" | "Building" | "Project", id: string) => {
        tutorial.markComplete("startedProduction");
        if (type === "Project") {
            tutorial.markComplete("startedProject");
        }
        if (type === "Unit" && id === "Settler") {
            tutorial.markComplete("builtFirstSettler");
        }
        if (type === "Building") {
            tutorial.markComplete("builtFirstBuilding");
        }
        onBuild(type, id);
    };

    // Pulse the first available production option if no build is set
    const shouldPulseProduction = !city.currentBuild && tutorial.shouldPulse("startedProduction");
    const hasAnyOptions = buildOptions.units.length > 0 || buildOptions.buildings.length > 0 || buildOptions.projects.length > 0;
    const remainingProduction = city.currentBuild
        ? Math.max(0, city.currentBuild.cost - city.buildProgress)
        : 0;
    const rushBuyDiscountPct = city.currentBuild ? getCityRushBuyDiscountPct(city) : 0;
    const rushBuyGoldCost = city.currentBuild ? getCityRushBuyGoldCost(city, remainingProduction) : 0;
    const rushBuyLabel = rushBuyDiscountPct > 0 ? `${rushBuyGoldCost}G (-${rushBuyDiscountPct}%)` : `${rushBuyGoldCost}G`;

    const rushBuyDisabledReason = (() => {
        if (!isMyTurn) return "You can only rush-buy on your turn.";
        if (!city.currentBuild) return "City is not currently building anything.";
        if (austerityActive) return "Rush-buy is disabled during austerity.";
        if (city.currentBuild.type === "Project" && isProgressProject(city.currentBuild.id)) {
            return "Progress projects cannot be rush-bought.";
        }
        if (isUniqueCompletionBuild(city.currentBuild.type, city.currentBuild.id)) {
            return "Unique completion builds cannot be rush-bought.";
        }
        if (remainingProduction <= 0) return "Current build is already complete.";
        if (treasury < rushBuyGoldCost) return `Need ${rushBuyGoldCost}G (Treasury: ${treasury}G).`;
        return null;
    })();
    const canRushBuy = !rushBuyDisabledReason;

    return (
        <div className="city-panel__section">
            <h5>Production</h5>
            {city.currentBuild ? (
                <>
                    <div className="hud-subtext">Building {formatBuildId(city.currentBuild.id)}</div>
                    <div className="hud-progress" style={{ marginTop: 6 }}>
                        <div
                            className="hud-progress-fill"
                            style={{
                                width: `${Math.min(100, Math.round((city.buildProgress / city.currentBuild.cost) * 100))}%`,
                            }}
                        />
                    </div>
                    <div className="hud-subtext">
                        {(() => {
                            const remaining = city.currentBuild.cost - city.buildProgress;
                            const turnsRemaining = productionPerTurn > 0 ? Math.ceil(remaining / productionPerTurn) : Infinity;
                            const turnsText = turnsRemaining === Infinity ? "∞ turns" : `${turnsRemaining} turn${turnsRemaining !== 1 ? "s" : ""}`;
                            return `${turnsText} (${city.buildProgress}/${city.currentBuild.cost})`;
                        })()}
                    </div>
                    <button
                        className="hud-button small"
                        style={{ marginTop: 8, width: "100%", opacity: canRushBuy ? 1 : 0.65 }}
                        onClick={() => onRushBuy(city.id)}
                        disabled={!canRushBuy}
                        title={rushBuyDisabledReason ?? (
                            rushBuyDiscountPct > 0
                                ? `Spend ${rushBuyGoldCost} Gold to complete instantly (base ${remainingProduction}G, -${rushBuyDiscountPct}% discount).`
                                : `Spend ${rushBuyGoldCost} Gold to complete instantly.`
                        )}
                    >
                        Rush-Buy ({rushBuyLabel})
                    </button>
                </>
            ) : (
                <div className="hud-subtext" style={{ marginBottom: 6 }}>
                    {city.lastCompletedBuild
                        ? `${formatBuildId(city.lastCompletedBuild.id)} completed. Choose what to produce.`
                        : "Choose what to produce."}
                </div>
            )}
            {isMyTurn && (
                <div className="city-panel__build-grid" style={{ marginTop: 6 }}>
                    {buildOptions.units.map((unit, idx) => {
                        const key = `Unit:${unit.id}`;
                        const saved = city.savedProduction?.[key];
                        // Pulse first production button OR pulse Settler after grewFirstCity
                        const isSettler = unit.id === "Settler";
                        const shouldPulseSettler = isSettler && tutorial.isComplete("grewFirstCity") && tutorial.shouldPulse("builtFirstSettler");
                        const shouldPulse = (shouldPulseProduction && idx === 0 && hasAnyOptions) || shouldPulseSettler;
                        return (
                            <div key={unit.id} className="production-button-wrapper">
                                <button
                                    className={`hud-button small ${shouldPulse ? "pulse" : ""}`}
                                    onClick={() => handleBuild("Unit", unit.id)}
                                    style={{ width: "100%" }}
                                    title={shouldPulseSettler ? "Build a Settler to found new cities!" : (shouldPulse ? tutorial.getTooltip("startedProduction") : undefined)}
                                >
                                    Train {unit.name}
                                    {saved ? <span style={{ fontSize: "0.8em", opacity: 0.7, marginLeft: 4 }}>({saved} prod)</span> : null}
                                </button>
                                <div className="production-tooltip">{buildUnitTooltip(unit.id as UnitType, turn)}</div>
                            </div>
                        );
                    })}
                    {buildOptions.buildings.map((building, idx) => {
                        const key = `Building:${building.id}`;
                        const saved = city.savedProduction?.[key];
                        const shouldPulse = shouldPulseProduction && buildOptions.units.length === 0 && idx === 0;
                        return (
                            <div key={building.id} className="production-button-wrapper">
                                <button
                                    className={`hud-button small ${shouldPulse ? "pulse" : ""}`}
                                    onClick={() => handleBuild("Building", building.id)}
                                    style={{ width: "100%" }}
                                >
                                    Construct {building.name}
                                    {saved ? <span style={{ fontSize: "0.8em", opacity: 0.7, marginLeft: 4 }}>({saved} prod)</span> : null}
                                </button>
                                <div className="production-tooltip">{buildBuildingTooltip(building.id as BuildingType, city, gameState)}</div>
                            </div>
                        );
                    })}
                    {buildOptions.projects.map(project => {
                        const key = `Project:${project.id}`;
                        const saved = city.savedProduction?.[key];
                        return (
                            <div key={project.id} className="production-button-wrapper">
                                <button className="hud-button small" onClick={() => handleBuild("Project", project.id)} style={{ width: "100%" }}>
                                    Launch {project.name}
                                    {saved ? <span style={{ fontSize: "0.8em", opacity: 0.7, marginLeft: 4 }}>({saved} prod)</span> : null}
                                </button>
                                <div className="production-tooltip">{buildProjectTooltip(project.id as ProjectId, turn)}</div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};


type WorkedTilesSectionProps = {
    city: City;
    workedCount: number;
    ownedTiles: GameState["map"]["tiles"];
    gameMap: GameState["map"];
    localWorked: HexCoord[];
    onLocalWorkedChange: (tiles: HexCoord[]) => void;
    onSetWorkedTiles: (cityId: string, tiles: HexCoord[]) => void;
};

const WorkedTilesSection: React.FC<WorkedTilesSectionProps> = ({
    city,
    workedCount,
    ownedTiles,
    gameMap,
    localWorked,
    onLocalWorkedChange,
    onSetWorkedTiles,
}) => (
    <div className="city-panel__section">
        <div className="city-panel__section-head">
            <h5>Worked Tiles</h5>
            <span className="hud-chip">Assigned {workedCount}/{city.pop}</span>
        </div>
        <div className="hud-subtext" style={{ marginTop: 0 }}>
            Once a city has 2 or more population, tap owned hexes to unassign/reassign citizens.
        </div>
        <WorkedTilesMap
            city={city}
            map={gameMap}
            tiles={ownedTiles}
            workedTiles={localWorked}
            onSetWorkedTiles={onSetWorkedTiles}
            onLocalChange={onLocalWorkedChange}
        />
        <div className="hud-subtext" style={{ marginTop: 6 }}>
            City center is always assigned. Unseen or enemy tiles cannot be worked.
        </div>
    </div>
);

type DefenseSectionProps = {
    city: City;
    isMyTurn: boolean;
    playerId: string;
    units: Unit[];
    garrison?: Unit;
    onSelectUnit: (unitId: string) => void;
    onClose: () => void;
    onRazeCity: () => void;
};

const DefenseSection: React.FC<DefenseSectionProps> = ({
    city,
    isMyTurn,
    playerId,
    units,
    garrison,
    onSelectUnit,
    onClose,
    onRazeCity,
}) => {
    const unitsAtCity = units.filter(u => u.ownerId === playerId && u.coord.q === city.coord.q && u.coord.r === city.coord.r);
    const hasGarrison = unitsAtCity.some(u => u.type !== "Settler" && u.type !== "Scout");

    return (
        <div className="city-panel__section">
            <h5>Defense & Actions</h5>
            <div className="hud-chip-row" style={{ marginBottom: 8, flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                {unitsAtCity.length === 0 ? (
                    <span className="hud-chip warn">No units in city</span>
                ) : (
                    <>
                        {unitsAtCity.map(unit => {
                            const isGarrison = unit.type !== "Settler" && unit.type !== "Scout";
                            return (
                                <button
                                    key={unit.id}
                                    className={`hud-chip clickable ${isGarrison ? "success" : ""}`}
                                    onClick={() => {
                                        onSelectUnit(unit.id);
                                        onClose();
                                    }}
                                    style={{
                                        cursor: "pointer",
                                        border: isGarrison ? "1px solid var(--color-success)" : "1px solid var(--color-border)",
                                        background: isGarrison ? "rgba(34, 197, 94, 0.1)" : "rgba(255, 255, 255, 0.05)",
                                        width: "100%",
                                        textAlign: "left"
                                    }}
                                >
                                    {isGarrison ? "Garrison: " : "Unit: "}{unit.type}
                                    <span style={{ float: "right", opacity: 0.7 }}>{unit.hp}/{unit.maxHp} HP</span>
                                </button>
                            );
                        })}
                        {!hasGarrison && <span className="hud-chip warn" style={{ marginTop: 4 }}>No garrison (Settlers/Scouts cannot garrison)</span>}
                    </>
                )}
                {city.hasFiredThisTurn && <span className="hud-chip warn">City fired this turn</span>}
            </div>
            {isMyTurn && city.ownerId === playerId && (
                <>
                    {/* <div className="hud-subtext" style={{ marginTop: 0 }}>City attack range 2</div> */}
                    {!garrison && <div className="hud-subtext warn">Station a unit to enable attacks.</div>}
                    {/* City attack code omitted */}
                    {!city.isCapital && (
                        <button className="hud-button small danger" style={{ marginTop: 10 }} onClick={onRazeCity}>
                            Raze City
                        </button>
                    )}
                </>
            )}
            {!isMyTurn && <div className="hud-subtext">Wait for your turn to manage city actions.</div>}
        </div>
    );
};

type WorkedTilesMapProps = {
    city: City;
    map: GameState["map"];
    tiles: GameState["map"]["tiles"];
    workedTiles: HexCoord[];
    onSetWorkedTiles: (cityId: string, tiles: HexCoord[]) => void;
    onLocalChange: (tiles: HexCoord[]) => void;
};

const HEX_SIZE = 36;
const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
const HEX_HEIGHT = 2 * HEX_SIZE;
const HEX_PADDING = 30;

type WorkedTileNode = {
    tile: GameState["map"]["tiles"][number];
    yields: { F: number; P: number; S: number; G: number };
    isWorked: boolean;
    isCenter: boolean;
    isLocked: boolean;
    position: { x: number; y: number };
    terrainColor: string;
};

const WorkedTilesMap: React.FC<WorkedTilesMapProps> = ({ city, map, tiles, workedTiles, onSetWorkedTiles, onLocalChange }) => {
    const nodes: WorkedTileNode[] = React.useMemo(() => {
        return tiles.map(tile => {
            const isWorked = workedTiles.some(w => w.q === tile.coord.q && w.r === tile.coord.r);
            const isCenter = tile.coord.q === city.coord.q && tile.coord.r === city.coord.r;
            const canAdd = workedTiles.length < city.pop;
            const isLocked = (!isWorked && !canAdd) || !tile.ownerId || (city.ownerId !== tile.ownerId && !isWorked) || isCenter;

            let tileYields = isCenter ? getCityCenterYields(city, tile) : getTileYields(tile);
            if (isTileAdjacentToRiver(map, tile.coord)) {
                tileYields = { ...tileYields, F: tileYields.F + 1 };
            }

            const position = hexToPixel(
                { q: tile.coord.q - city.coord.q, r: tile.coord.r - city.coord.r },
                HEX_SIZE,
            );

            return {
                tile,
                yields: tileYields,
                isWorked,
                isCenter,
                isLocked,
                position,
                terrainColor: getTerrainColor(tile.terrain),
            };
        });
    }, [city, map, tiles, workedTiles]);

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    nodes.forEach(node => {
        const left = node.position.x - HEX_WIDTH / 2;
        const right = node.position.x + HEX_WIDTH / 2;
        const top = node.position.y - HEX_HEIGHT / 2;
        const bottom = node.position.y + HEX_HEIGHT / 2;
        minX = Math.min(minX, left);
        maxX = Math.max(maxX, right);
        minY = Math.min(minY, top);
        maxY = Math.max(maxY, bottom);
    });

    if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
        minX = -HEX_WIDTH / 2;
        maxX = HEX_WIDTH / 2;
        minY = -HEX_HEIGHT / 2;
        maxY = HEX_HEIGHT / 2;
    }

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const viewWidth = Math.max(320, Math.round(contentWidth + HEX_PADDING * 2));
    const viewHeight = Math.max(240, Math.round(contentHeight + HEX_PADDING * 2));
    const extraX = Math.max(0, viewWidth - (contentWidth + HEX_PADDING * 2));
    const extraY = Math.max(0, viewHeight - (contentHeight + HEX_PADDING * 2));
    const offsetX = HEX_PADDING - minX + extraX / 2;
    const offsetY = HEX_PADDING - minY + extraY / 2;

    return (
        <div className="city-panel__hex-map" style={{ minHeight: viewHeight }}>
            <div className="city-panel__hex-layer" style={{ width: viewWidth, height: viewHeight }}>
                {nodes.map(node => {
                    const { tile, isWorked, isCenter, isLocked, yields, terrainColor } = node;
                    const left = offsetX + node.position.x - HEX_WIDTH / 2;
                    const top = offsetY + node.position.y - HEX_HEIGHT / 2;


                    return (
                        <button
                            key={`${tile.coord.q},${tile.coord.r}`}
                            className={`city-panel__hex-button${isWorked ? " is-worked" : ""}${isCenter ? " is-center" : ""}${isLocked && !isCenter ? " is-locked" : ""}`}
                            style={{
                                left,
                                top,
                                width: HEX_WIDTH,
                                height: HEX_HEIGHT,
                                ["--terrain-tint" as string]: `${terrainColor}55`,
                            }}
                            disabled={isLocked}
                            aria-label={`Tile ${tile.coord.q},${tile.coord.r} (${tile.terrain})`}
                            title={
                                isCenter
                                    ? "City center must always be worked"
                                    : isWorked
                                        ? "Unassign tile"
                                        : isLocked
                                            ? "No citizens available"
                                            : `Assign tile (${workedTiles.length}/${city.pop})`
                            }
                            onClick={() => {
                                if (isLocked && !isWorked) return;
                                let nextWorked = workedTiles.filter(w => !(w.q === tile.coord.q && w.r === tile.coord.r));
                                if (!isWorked) {
                                    nextWorked = [...nextWorked, tile.coord];
                                }
                                if (!nextWorked.some(w => w.q === city.coord.q && w.r === city.coord.r)) {
                                    nextWorked.unshift(city.coord);
                                }
                                nextWorked = nextWorked.slice(0, Math.max(1, city.pop));
                                onLocalChange(nextWorked);
                                onSetWorkedTiles(city.id, nextWorked);
                            }}
                        >
                            <div className="city-panel__hex-yields">
                                <span className="city-panel__yield city-panel__yield--food">F{yields.F}</span>
                                <span className="city-panel__yield city-panel__yield--prod">P{yields.P}</span>
                                <span className="city-panel__yield city-panel__yield--science">S{yields.S}</span>
                                <span className="city-panel__yield">G{yields.G}</span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
