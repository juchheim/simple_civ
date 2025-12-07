import React from "react";
import "./CombatPreviewModal.css";

interface CombatModifier {
    label: string;
    value: number;
}

interface CombatPreviewUnit {
    name: string;
    atk: number;
    def: number;
    hp: number;
    maxHp: number;
    modifiers: CombatModifier[];
}

interface CombatPreview {
    attacker: CombatPreviewUnit;
    defender: CombatPreviewUnit & { isCity: boolean };
    estimatedDamage: { min: number; max: number; avg: number };
    returnDamage: { min: number; max: number; avg: number } | null;
}

interface CombatPreviewModalProps {
    preview: CombatPreview;
    onConfirm: () => void;
    onCancel: () => void;
    onDisablePreview: () => void;
}

export const CombatPreviewModal: React.FC<CombatPreviewModalProps> = ({
    preview,
    onConfirm,
    onCancel,
    onDisablePreview,
}) => {
    const [dontShowAgain, setDontShowAgain] = React.useState(false);

    // Handle ESC key to close the modal
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onCancel();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onCancel]);

    const handleConfirm = () => {
        if (dontShowAgain) {
            onDisablePreview();
        }
        onConfirm();
    };

    const renderModifiers = (mods: CombatModifier[]) => {
        if (mods.length === 0) return null;
        return (
            <div className="combat-preview__modifiers">
                {mods.map((mod, i) => (
                    <span
                        key={i}
                        className={`combat-preview__modifier ${mod.value >= 0 ? "positive" : "negative"}`}
                    >
                        {mod.value >= 0 ? "+" : ""}{mod.value} {mod.label}
                    </span>
                ))}
            </div>
        );
    };

    // Calculate remaining HP after combat
    const defenderHpAfter = Math.max(0, preview.defender.hp - preview.estimatedDamage.avg);
    const attackerHpAfter = preview.returnDamage
        ? Math.max(0, preview.attacker.hp - preview.returnDamage.avg)
        : preview.attacker.hp;

    const renderHealthBar = (
        label: string,
        currentHp: number,
        hpAfter: number,
        maxHp: number,
        damage: { min: number; max: number } | null
    ) => {
        const remainingPercent = Math.min(100, (hpAfter / maxHp) * 100);
        const currentPercent = Math.min(100, (currentHp / maxHp) * 100);
        const damagePercent = currentPercent - remainingPercent;

        return (
            <div className="combat-preview__health-row">
                <div className="combat-preview__health-label">{label}</div>
                <div className="combat-preview__health-bar-container">
                    {/* Remaining health (green) */}
                    <div
                        className="combat-preview__health-bar remaining"
                        style={{ width: `${remainingPercent}%` }}
                    />
                    {/* Damage taken (red overlay) */}
                    {damagePercent > 0 && (
                        <div
                            className="combat-preview__health-bar damage"
                            style={{
                                left: `${remainingPercent}%`,
                                width: `${damagePercent}%`
                            }}
                        />
                    )}
                </div>
                <div className="combat-preview__health-values">
                    <span className="combat-preview__hp-after">{Math.round(hpAfter)}</span>
                    <span className="combat-preview__hp-max">/{maxHp}</span>
                    {damage && (
                        <span className="combat-preview__damage-text">
                            (-{damage.min === damage.max ? damage.min : `${damage.min}-${damage.max}`})
                        </span>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="combat-preview__overlay">
            <div className="combat-preview__modal hud-card">
                {/* Header */}
                <div className="combat-preview__header">
                    <span className="combat-preview__icon">⚔️</span>
                    <span className="hud-title-sm">Combat Preview</span>
                </div>

                {/* Unit Panels */}
                <div className="combat-preview__panels">
                    {/* Attacker Panel */}
                    <div className="combat-preview__panel">
                        <div className="combat-preview__panel-label">YOUR UNIT</div>
                        <div className="combat-preview__unit-name">{preview.attacker.name}</div>
                        <div className="combat-preview__stats">
                            <span className="combat-preview__stat atk">⚔ {preview.attacker.atk}</span>
                            <span className="combat-preview__stat def">🛡 {preview.attacker.def}</span>
                            <span className="combat-preview__stat hp">❤ {preview.attacker.hp}/{preview.attacker.maxHp}</span>
                        </div>
                        {renderModifiers(preview.attacker.modifiers)}
                    </div>

                    {/* VS Divider */}
                    <div className="combat-preview__vs">VS</div>

                    {/* Defender Panel */}
                    <div className="combat-preview__panel defender">
                        <div className="combat-preview__panel-label">
                            {preview.defender.isCity ? "CITY" : "ENEMY"}
                        </div>
                        <div className="combat-preview__unit-name">{preview.defender.name}</div>
                        <div className="combat-preview__stats">
                            {!preview.defender.isCity && (
                                <span className="combat-preview__stat atk">⚔ {preview.defender.atk}</span>
                            )}
                            <span className="combat-preview__stat def">🛡 {preview.defender.def}</span>
                            <span className="combat-preview__stat hp">❤ {preview.defender.hp}/{preview.defender.maxHp}</span>
                        </div>
                        {renderModifiers(preview.defender.modifiers)}
                    </div>
                </div>

                {/* Combat Outcome */}
                <div className="combat-preview__damage-section">
                    <div className="combat-preview__section-title">AFTER COMBAT</div>
                    {renderHealthBar(
                        preview.defender.isCity ? preview.defender.name : "Enemy",
                        preview.defender.hp,
                        defenderHpAfter,
                        preview.defender.maxHp,
                        preview.estimatedDamage
                    )}
                    {renderHealthBar(
                        "Your Unit",
                        preview.attacker.hp,
                        attackerHpAfter,
                        preview.attacker.maxHp,
                        preview.returnDamage
                    )}
                    {!preview.returnDamage && (
                        <div className="combat-preview__no-return">
                            {preview.defender.isCity && preview.defender.atk === 0
                                ? "Ungarrisoned — no return damage"
                                : "Ranged attack — no return damage"}
                        </div>
                    )}
                </div>

                {/* Don't show again checkbox */}
                <label className="combat-preview__checkbox-label">
                    <input
                        type="checkbox"
                        checked={dontShowAgain}
                        onChange={(e) => setDontShowAgain(e.target.checked)}
                    />
                    Don't show this again
                </label>

                {/* Action Buttons */}
                <div className="combat-preview__actions">
                    <button className="hud-button primary" onClick={handleConfirm}>
                        Confirm Attack
                    </button>
                    <button className="hud-button ghost" onClick={onCancel}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};
