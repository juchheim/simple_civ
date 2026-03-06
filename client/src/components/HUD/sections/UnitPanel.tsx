import React from "react";
import { Unit, UnitType, GameState, getUnitCombatStats, UnitState, UNITS, UnitDomain } from "@simple-civ/engine";
import { getUnitDisplayName } from "../../../assets";
import { useTutorial } from "../../../contexts/TutorialContext";
import { Modal } from "../../Modal";

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
    onDisbandUnit: () => void;
    onCancelMovement: () => void;
    gameState: GameState;
    commandPoints?: number;
    onGrantCP: (unitId: string) => void;
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
    onDisbandUnit,
    onCancelMovement,
    gameState,
    commandPoints,
    onGrantCP,
}) => {
    const stats = React.useMemo(() => getUnitCombatStats(unit, gameState), [unit, gameState]);
    const tutorial = useTutorial();

    const owner = gameState.players.find(p => p.id === unit.ownerId);
    const isFriendly = unit.ownerId === gameState.currentPlayerId;
    const canFortify = isMyTurn && unit.movesLeft > 0 && unit.type !== UnitType.Settler && unit.state !== UnitState.Fortified;

    // Mark milestone when settler is selected
    React.useEffect(() => {
        if (unit.type === UnitType.Settler && isFriendly) {
            tutorial.markComplete("selectedSettler");
        }
    }, [unit.type, isFriendly, tutorial]);

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
                    onDisbandUnit={onDisbandUnit}
                    tutorial={tutorial}
                    commandPoints={commandPoints}
                    onGrantCP={onGrantCP}
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
    onDisbandUnit: () => void;
    onCancelMovement: () => void;
    tutorial: ReturnType<typeof useTutorial>;
    commandPoints?: number;
    onGrantCP: (unitId: string) => void;
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
    onDisbandUnit,
    onCancelMovement,
    tutorial,
    commandPoints,
    onGrantCP,
}) => {
    const isMilitary = unit.type !== UnitType.Settler && unit.type !== UnitType.Scout;

    const canUseCP = isMyTurn &&
        isMilitary &&
        (unit.movesLeft <= 0 || unit.hasAttacked) &&
        !unit.hasUsedCP &&
        !unit.cpGranted;

    const [showCPModal, setShowCPModal] = React.useState(false);

    // Handle button clicks with milestone tracking
    const handleFoundCity = () => {
        tutorial.markComplete("foundedFirstCity");
        onFoundCity();
    };

    const handleFortify = () => {
        tutorial.markComplete("fortifiedUnit");
        onFortifyUnit();
    };

    const handleLink = () => {
        tutorial.markComplete("linkedUnits");
        onLinkUnits();
    };

    const handleAutoExplore = () => {
        tutorial.markComplete("usedAutoExplore");
        onToggleAutoExplore();
    };

    return (
        <>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                <button
                    className={`hud-button small ${canLinkUnits && tutorial.shouldPulse("linkedUnits") ? "pulse" : ""}`}
                    onClick={handleLink}
                    disabled={!canLinkUnits}
                    title={tutorial.getTooltip("linkedUnits")}
                >
                    Link
                </button>
                <button className="hud-button small ghost" onClick={onUnlinkUnits} disabled={!canUnlinkUnits}>
                    Unlink
                </button>
                <button
                    className={`hud-button small ${canFortify && isMilitary && tutorial.shouldPulse("fortifiedUnit") ? "pulse" : ""}`}
                    onClick={handleFortify}
                    disabled={!canFortify}
                    title={tutorial.getTooltip("fortifiedUnit")}
                >
                    Fortify
                </button>
            </div>
            {isMyTurn && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                    {unit.type === UnitType.Settler && (
                        <button
                            className={`hud-button small primary ${tutorial.shouldPulse("foundedFirstCity") ? "pulse" : ""}`}
                            onClick={handleFoundCity}
                            title={tutorial.getTooltip("selectedSettler")}
                        >
                            Found City
                        </button>
                    )}
                    {(unit.type === UnitType.Scout || UNITS[unit.type].domain === UnitDomain.Naval) && (
                        <button
                            className={`hud-button small ${tutorial.shouldPulse("usedAutoExplore") ? "pulse" : ""}`}
                            onClick={handleAutoExplore}
                            title={tutorial.getTooltip("usedAutoExplore")}
                        >
                            {unit.isAutoExploring ? "Stop Auto Explore" : "Auto Explore"}
                        </button>
                    )}
                    {unit.autoMoveTarget && (
                        <button className="hud-button small ghost" onClick={onCancelMovement}>
                            Cancel Movement
                        </button>
                    )}
                    <button className="hud-button small danger" onClick={onDisbandUnit}>
                        Disband
                    </button>
                    {canUseCP && (
                        <button
                            className="hud-button small primary pulse"
                            disabled={(commandPoints ?? 0) === 0}
                            onClick={() => setShowCPModal(true)}
                            title={(commandPoints ?? 0) === 0 ? "No Command Points available." : "Spend 1 Command Point to act again"}
                        >
                            Spend CP
                        </button>
                    )}
                </div>
            )}

            {showCPModal && (
                <Modal
                    isOpen={showCPModal}
                    onClose={() => setShowCPModal(false)}
                    title="Spend Command Point"
                >
                    <p style={{ margin: "0 0 16px 0", color: "var(--color-text-main)" }}>
                        Spend 1 Command Point to grant {getUnitDisplayName(unit.type)} an extra action this turn? ({commandPoints} CP remaining)
                    </p>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <button className="hud-button ghost" onClick={() => setShowCPModal(false)}>
                            Cancel
                        </button>
                        <button
                            className="hud-button primary"
                            onClick={() => {
                                setShowCPModal(false);
                                onGrantCP(unit.id);
                            }}
                        >
                            Confirm Spend
                        </button>
                    </div>
                </Modal>
            )}
        </>
    );
};




