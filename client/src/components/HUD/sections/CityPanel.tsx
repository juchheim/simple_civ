import React from "react";
import { City, GameState, HexCoord, Unit, getCityYields, getTileYields, getCityCenterYields, isTileAdjacentToRiver, UNITS, BUILDINGS, PROJECTS, UnitType, BuildingType, ProjectId, getProjectCost, getUnitCost } from "@simple-civ/engine";
import { hexDistance } from "../../../utils/hex";
import { getTerrainColor, hexToPixel } from "../../GameMap/geometry";
import { CityBuildOptions } from "../hooks";

const formatBuildId = (id: string) => {
    return id
        .replace(/_/g, " ")
        .replace(/([A-Z])/g, " $1")
        .trim();
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

const buildBuildingTooltip = (buildingId: BuildingType): string => {
    const data = BUILDINGS[buildingId];
    if (!data) return "";
    const lines = [`Cost: ${data.cost} Production`];
    const yields = [];
    if (data.yieldFlat?.F) yields.push(`+${data.yieldFlat.F} Food`);
    if (data.yieldFlat?.P) yields.push(`+${data.yieldFlat.P} Production`);
    if (data.yieldFlat?.S) yields.push(`+${data.yieldFlat.S} Science`);
    if (yields.length > 0) lines.push(yields.join(", "));
    if (data.defenseBonus) lines.push(`+${data.defenseBonus} City Defense`);
    if (data.cityAttackBonus) lines.push(`+${data.cityAttackBonus} City Attack`);
    if (data.growthMult) lines.push(`${Math.round((1 - data.growthMult) * 100)}% faster growth`);
    if (data.conditional) lines.push(data.conditional);
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
    onRazeCity,
    // onCityAttack,
    onSetWorkedTiles,
    onSelectUnit,
    onClose,
}) => {
    const [localWorked, setLocalWorked] = React.useState<HexCoord[]>(city.workedTiles);

    React.useEffect(() => {
        setLocalWorked(city.workedTiles);
    }, [city.id, city.workedTiles]);

    const ownedTiles = React.useMemo(() => getOwnedTilesForCity(city, gameState.map.tiles), [city, gameState.map.tiles]);

    const yields = getCityYields(city, gameState);
    const civ = gameState.players.find(p => p.id === city.ownerId)?.civName;
    const scholarActive = civ === "ScholarKingdoms" && city.pop >= 3;

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
                <span className="hud-chip">Yields: {yields.F}F / {yields.P}P / {yields.S}S</span>
                <span className="hud-chip">Worked: {workedCount}/{city.pop}</span>
                <span className="hud-chip">Build: {city.currentBuild ? formatBuildId(city.currentBuild.id) : "Idle"}</span>
            </div>

            <div className="city-panel__grid">
                <ProductionSection
                    city={city}
                    isMyTurn={isMyTurn}
                    buildOptions={buildOptions}
                    onBuild={onBuild}
                    turn={gameState.turn}
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
                            const isGarrison = unit.type !== "Settler";
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
    buildOptions: CityBuildOptions;
    onBuild: (type: "Unit" | "Building" | "Project", id: string) => void;
    turn: number;
};

const ProductionSection: React.FC<ProductionSectionProps> = ({ city, isMyTurn, buildOptions, onBuild, turn }) => (
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
                    Progress: {city.buildProgress}/{city.currentBuild.cost}
                </div>
            </>
        ) : (
            <div className="hud-subtext" style={{ marginBottom: 6 }}>Choose what to produce.</div>
        )}
        {isMyTurn && (
            <div className="city-panel__build-grid" style={{ marginTop: 6 }}>
                {buildOptions.units.map(unit => {
                    const key = `Unit:${unit.id}`;
                    const saved = city.savedProduction?.[key];
                    return (
                        <div key={unit.id} className="production-button-wrapper">
                            <button className="hud-button small" onClick={() => onBuild("Unit", unit.id)} style={{ width: "100%" }}>
                                Train {unit.name}
                                {saved ? <span style={{ fontSize: "0.8em", opacity: 0.7, marginLeft: 4 }}>({saved} prod)</span> : null}
                            </button>
                            <div className="production-tooltip">{buildUnitTooltip(unit.id as UnitType, turn)}</div>
                        </div>
                    );
                })}
                {buildOptions.buildings.map(building => {
                    const key = `Building:${building.id}`;
                    const saved = city.savedProduction?.[key];
                    return (
                        <div key={building.id} className="production-button-wrapper">
                            <button className="hud-button small" onClick={() => onBuild("Building", building.id)} style={{ width: "100%" }}>
                                Construct {building.name}
                                {saved ? <span style={{ fontSize: "0.8em", opacity: 0.7, marginLeft: 4 }}>({saved} prod)</span> : null}
                            </button>
                            <div className="production-tooltip">{buildBuildingTooltip(building.id as BuildingType)}</div>
                        </div>
                    );
                })}
                {buildOptions.projects.map(project => {
                    const key = `Project:${project.id}`;
                    const saved = city.savedProduction?.[key];
                    return (
                        <div key={project.id} className="production-button-wrapper">
                            <button className="hud-button small" onClick={() => onBuild("Project", project.id)} style={{ width: "100%" }}>
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
            Tap owned hexes to focus citizens; the layout scales as {city.name} claims more land.
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
    const hasGarrison = unitsAtCity.some(u => u.type !== "Settler");

    return (
        <div className="city-panel__section">
            <h5>Defense & Actions</h5>
            <div className="hud-chip-row" style={{ marginBottom: 8, flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                {unitsAtCity.length === 0 ? (
                    <span className="hud-chip warn">No units in city</span>
                ) : (
                    <>
                        {unitsAtCity.map(unit => {
                            const isGarrison = unit.type !== "Settler";
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
                        {!hasGarrison && <span className="hud-chip warn" style={{ marginTop: 4 }}>No garrison (Settlers cannot garrison)</span>}
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
    yields: { F: number; P: number; S: number };
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
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
