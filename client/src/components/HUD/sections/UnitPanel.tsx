import React from "react";
import { Unit, UnitType, GameState, getUnitCombatStats, UnitState, UNITS, UnitDomain } from "@simple-civ/engine";
import { getUnitDisplayName } from "../../../assets";

type UnitPanelProps = {
    unit: Unit;
    linkedPartner: Unit | null;
    canLinkUnits: boolean;
    canUnlinkUnits: boolean;
    isMyTurn: boolean;
    onLinkUnits: () => void;
    onUnlinkUnits: () => void;
    onFoundCity: () => void;
    onToggleAutoExplore: () => void;
    onFortifyUnit: () => void;
    onCancelMovement: () => void;
    gameState: GameState;
};

export const UnitPanel: React.FC<UnitPanelProps> = ({
    unit,
    linkedPartner,
    canLinkUnits,
    canUnlinkUnits,
    isMyTurn,
    onLinkUnits,
    onUnlinkUnits,
    onFoundCity,
    onToggleAutoExplore,
    onFortifyUnit,
    onCancelMovement,
    gameState,
}) => {
    const stats = React.useMemo(() => getUnitCombatStats(unit, gameState), [unit, gameState]);

    const owner = gameState.players.find(p => p.id === unit.ownerId);
    const isFriendly = unit.ownerId === gameState.currentPlayerId;
    const canFortify = isMyTurn && unit.movesLeft > 0 && unit.type !== UnitType.Settler && unit.state !== UnitState.Fortified;

    return (
        <div style={{ marginTop: 10 }}>
            <div className="hud-section-title">Selected Unit</div>
            <p className="hud-title-sm" style={{ margin: "2px 0 8px 0" }}>
                Unit: {getUnitDisplayName(unit.type)}
            </p>
            {owner && (
                <div style={{ fontSize: 12, color: owner.color, marginBottom: 8, fontWeight: 600 }}>
                    Owner: {owner.civName}
                </div>
            )}
            {!owner && unit.ownerId === "natives" && (
                <div style={{ fontSize: 12, color: "#f97316", marginBottom: 8, fontWeight: 600 }}>
                    Native Unit
                </div>
            )}
            <UnitStatusChips
                unit={unit}
                stats={stats}
                linkedPartner={linkedPartner}
            />
            {/* Only show actions if we own the unit */}
            {isFriendly && (
                <UnitActions
                    unit={unit}
                    isMyTurn={isMyTurn}
                    canFortify={canFortify}
                    canLinkUnits={canLinkUnits}
                    canUnlinkUnits={canUnlinkUnits}
                    onLinkUnits={onLinkUnits}
                    onUnlinkUnits={onUnlinkUnits}
                    onFortifyUnit={onFortifyUnit}
                    onFoundCity={onFoundCity}
                    onToggleAutoExplore={onToggleAutoExplore}
                    onCancelMovement={onCancelMovement}
                />
            )}
        </div>
    );
};

type UnitStatusChipsProps = {
    unit: Unit;
    stats: ReturnType<typeof getUnitCombatStats>;
    linkedPartner: Unit | null;
};

const UnitStatusChips: React.FC<UnitStatusChipsProps> = ({ unit, stats, linkedPartner }) => (
    <div className="hud-chip-row">
        <span className="hud-chip">Moves: {unit.movesLeft}</span>
        <span className="hud-chip">HP: {unit.hp}</span>
        <span className="hud-chip">Atk: {stats.atk}</span>
        <span className="hud-chip">Def: {stats.def}</span>
        {linkedPartner && <span className="hud-chip success">Linked with {getUnitDisplayName(linkedPartner.type)}</span>}
        {unit.isAutoExploring && <span className="hud-chip success">Auto Exploring</span>}
        {unit.state === UnitState.Fortified && <span className="hud-chip success">Fortified</span>}
        {unit.autoMoveTarget && <span className="hud-chip">Moving...</span>}
        {unit.statusEffects?.includes("NaturesWrath") && (
            <span className="hud-chip danger" style={{ borderColor: "#10b981", color: "#10b981" }}>
                Nature's Wrath: -1 HP/turn
            </span>
        )}
    </div>
);

type UnitActionsProps = {
    unit: Unit;
    isMyTurn: boolean;
    canFortify: boolean;
    canLinkUnits: boolean;
    canUnlinkUnits: boolean;
    onLinkUnits: () => void;
    onUnlinkUnits: () => void;
    onFoundCity: () => void;
    onToggleAutoExplore: () => void;
    onFortifyUnit: () => void;
    onCancelMovement: () => void;
};

const UnitActions: React.FC<UnitActionsProps> = ({
    unit,
    isMyTurn,
    canFortify,
    canLinkUnits,
    canUnlinkUnits,
    onLinkUnits,
    onUnlinkUnits,
    onFoundCity,
    onToggleAutoExplore,
    onFortifyUnit,
    onCancelMovement,
}) => (
    <>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            <button className="hud-button small" onClick={onLinkUnits} disabled={!canLinkUnits}>
                Link
            </button>
            <button className="hud-button small ghost" onClick={onUnlinkUnits} disabled={!canUnlinkUnits}>
                Unlink
            </button>
            <button className="hud-button small" onClick={onFortifyUnit} disabled={!canFortify}>
                Fortify
            </button>
        </div>
        {unit.type === UnitType.Settler && isMyTurn && (
            <button className="hud-button small primary" style={{ marginTop: 8 }} onClick={onFoundCity}>
                Found City
            </button>
        )}
        {(unit.type === UnitType.Scout || UNITS[unit.type].domain === UnitDomain.Naval) && isMyTurn && (
            <button className="hud-button small" style={{ marginTop: 8 }} onClick={onToggleAutoExplore}>
                {unit.isAutoExploring ? "Stop Auto Explore" : "Auto Explore"}
            </button>
        )}
        {unit.autoMoveTarget && isMyTurn && (
            <button className="hud-button small ghost" style={{ marginTop: 8 }} onClick={onCancelMovement}>
                Cancel Movement
            </button>
        )}
    </>
);




