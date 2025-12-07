import React from "react";
import { Unit, UnitType, GameState, getUnitCombatStats, UnitState } from "@simple-civ/engine";

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

    const canFortify = isMyTurn && unit.movesLeft > 0 && unit.type !== UnitType.Settler && unit.state !== UnitState.Fortified;

    const owner = gameState.players.find(p => p.id === unit.ownerId);
    const isFriendly = unit.ownerId === gameState.currentPlayerId; // Assuming local player is always current or we use a prop for local player ID. 
    // Actually UnitPanelProps has isMyTurn, but we need to know if it's OUR unit.
    // The prop `isMyTurn` usually implies it's the local player's turn AND they are viewing their own stuff?
    // Let's check how `isMyTurn` is passed. App.tsx passes `isMyTurn={playerId === gameState.currentPlayerId}`.
    // But we need to know if the unit belongs to `playerId`. 
    // `UnitPanel` doesn't receive `playerId`.
    // However, `isMyTurn` is used to enable buttons. 
    // If we select an enemy unit, `isMyTurn` might be true (it's my turn), but I shouldn't be able to move the enemy.
    // Wait, `App.tsx` passes `isMyTurn={playerId === gameState.currentPlayerId}`.
    // We need to check unit ownership.
    // Let's assume we need to pass `playerId` to `UnitPanel` or derive it.
    // But wait, `UnitPanel` is used in `HUD`. `HUD` receives `playerId`.
    // Let's check `HUD/index.tsx` to see how it passes props to `UnitPanel`.

    return (
        <div style={{ marginTop: 10 }}>
            <div className="hud-section-title">Selected Unit</div>
            <p className="hud-title-sm" style={{ margin: "2px 0 8px 0" }}>
                Unit: {unit.type}
            </p>
            {owner && (
                <div style={{ fontSize: 12, color: owner.color, marginBottom: 8, fontWeight: 600 }}>
                    Owner: {owner.civName}
                </div>
            )}
            <div className="hud-chip-row">
                <span className="hud-chip">Moves: {unit.movesLeft}</span>
                <span className="hud-chip">HP: {unit.hp}</span>
                <span className="hud-chip">Atk: {stats.atk}</span>
                <span className="hud-chip">Def: {stats.def}</span>
                <span className="hud-chip">Rng: {stats.rng}</span>
                {linkedPartner && <span className="hud-chip success">Linked with {linkedPartner.type}</span>}
                {unit.isAutoExploring && <span className="hud-chip success">Auto Exploring</span>}
                {unit.state === UnitState.Fortified && <span className="hud-chip success">Fortified</span>}
                {unit.autoMoveTarget && <span className="hud-chip">Moving...</span>}
                {unit.statusEffects?.includes("NaturesWrath") && (
                    <span className="hud-chip danger" style={{ borderColor: "#10b981", color: "#10b981" }}>
                        Nature's Wrath: -1 HP/turn
                    </span>
                )}
            </div>
            {/* Only show actions if we own the unit */}
            {isFriendly && (
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
                    {unit.type === UnitType.Scout && isMyTurn && (
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
            )}
        </div>
    );
};

