import React from "react";
import { BuildingType, City, GameState, HexCoord, ProjectId, Unit, UnitType } from "@simple-civ/engine";
import { CityBuildOptions } from "../hooks";
import { TutorialMilestone } from "../../../hooks/useTutorialProgress";
import { WorkedTilesMap } from "./CityPanelWorkedTilesMap";
import {
    buildBuildingTooltip,
    buildProjectTooltip,
    buildUnitTooltip,
    formatBuildId,
    getCityRushBuyDiscountPct,
    getCityRushBuyGoldCost,
    isProgressProject,
    isUniqueCompletionBuild,
} from "./city-panel-helpers";

type TutorialApi = {
    getTooltip: (milestone: TutorialMilestone) => string | undefined;
    isComplete: (milestone: TutorialMilestone) => boolean;
    markComplete: (milestone: TutorialMilestone) => string | null;
    shouldPulse: (milestone: TutorialMilestone) => boolean;
};

type EnemyCityPanelProps = {
    city: City;
    civ?: string;
    unitsAtCity: Unit[];
    onSelectUnit: (unitId: string) => void;
    onClose: () => void;
};

export const EnemyCityPanel: React.FC<EnemyCityPanelProps> = ({ city, civ, unitsAtCity, onSelectUnit, onClose }) => (
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

export const CityInfoHeader: React.FC<CityInfoHeaderProps> = ({ city, civ, scholarActive }) => (
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
    tutorial: TutorialApi;
    productionPerTurn: number;
    treasury: number;
    austerityActive: boolean;
};

export const ProductionSection: React.FC<ProductionSectionProps> = ({
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

export const WorkedTilesSection: React.FC<WorkedTilesSectionProps> = ({
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

export const DefenseSection: React.FC<DefenseSectionProps> = ({
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
                    {!garrison && <div className="hud-subtext warn">Station a unit to enable attacks.</div>}
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
