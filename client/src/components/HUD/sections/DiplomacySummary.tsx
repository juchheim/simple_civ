import React from "react";
import { Action, DiplomacyState } from "@simple-civ/engine";
import { CityStateRow, DiplomacyRow } from "../helpers";

type DiplomacySummaryProps = {
    rows: DiplomacyRow[];
    cityStateRows?: CityStateRow[];
    playerId: string;
    onAction: (action: Action) => void;
};

export const DiplomacySummary: React.FC<DiplomacySummaryProps> = ({ rows, cityStateRows = [], playerId, onAction }) => (
    <div>
        <div className="hud-section-title">Diplomacy</div>
        <div className="hud-subtext" style={{ marginTop: 0 }}>Only civilizations you have contacted will appear here.</div>
        <div className="hud-menu-scroll">
            {rows.length === 0 && <div className="hud-subtext warn">No civilizations encountered yet.</div>}
            {rows.map(row => {
                const power = Math.round(row.power);
                const selfPower = Math.round(row.selfPower);
                const gap = Math.round(row.powerDelta);
                const gapLabel = gap === 0 ? "Even" : gap > 0 ? `+${gap}` : `${gap}`;
                const pillClass =
                    row.state === DiplomacyState.War
                        ? "hud-pill danger"
                        : row.atPeace
                            ? "hud-pill success"
                            : "hud-pill";
                return (
                    <div key={row.playerId} className="diplomacy-row">
                        <div className="diplomacy-row__header">
                            <p className="hud-title-sm" style={{ margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                                {row.color && <span style={{ width: 10, height: 10, borderRadius: "50%", background: row.color, display: "inline-block" }} />}
                                {row.civTitle}
                            </p>
                            <span className={pillClass}>{row.state}</span>
                        </div>
                        <div className="hud-subtext" style={{ marginTop: 4 }}>
                            Military power: {power} (you: {selfPower}, gap: {gapLabel})
                        </div>
                        <div className="diplomacy-row__actions">
                            <button
                                className={`hud-button small ${row.state === DiplomacyState.War ? "danger" : ""}`}
                                onClick={() =>
                                    onAction({ type: "SetDiplomacy", playerId, targetPlayerId: row.playerId, state: DiplomacyState.War })
                                }
                                disabled={row.state === DiplomacyState.War || !row.hasContact}
                            >
                                {row.state === DiplomacyState.War ? "At War" : "Declare War"}
                            </button>
                            {row.state === DiplomacyState.War && !row.incomingPeace && (
                                <button
                                    className="hud-button small"
                                    onClick={() => onAction({ type: "ProposePeace", playerId, targetPlayerId: row.playerId })}
                                    disabled={row.outgoingPeace || !row.hasContact}
                                >
                                    {row.outgoingPeace ? "Peace Proposed" : "Propose Peace"}
                                </button>
                            )}
                            {row.incomingPeace && row.state === DiplomacyState.War && (
                                <button
                                    className="hud-button small"
                                    onClick={() => onAction({ type: "AcceptPeace", playerId, targetPlayerId: row.playerId })}
                                >
                                    Accept Peace
                                </button>
                            )}
                            {row.outgoingPeace && row.state === DiplomacyState.War && (
                                <button
                                    className="hud-button small ghost"
                                    onClick={() => onAction({ type: "WithdrawPeace", playerId, targetPlayerId: row.playerId })}
                                >
                                    Withdraw Offer
                                </button>
                            )}
                        </div>
                        <div className="diplomacy-row__actions">
                            <button
                                className="hud-button small ghost"
                                onClick={() => onAction({ type: "ProposeVisionShare", playerId, targetPlayerId: row.playerId })}
                                disabled={!row.atPeace || row.sharingVision || row.outgoingVision || !row.hasContact}
                            >
                                {row.sharingVision ? "Sharing Vision" : row.outgoingVision ? "Vision Proposed" : "Offer Vision"}
                            </button>
                            {row.incomingVision && row.atPeace && !row.sharingVision && row.hasContact && (
                                <button
                                    className="hud-button small"
                                    onClick={() => onAction({ type: "AcceptVisionShare", playerId, targetPlayerId: row.playerId })}
                                >
                                    Accept Vision
                                </button>
                            )}
                            {row.sharingVision && (
                                <button
                                    className="hud-button small ghost"
                                    onClick={() => onAction({ type: "RevokeVisionShare", playerId, targetPlayerId: row.playerId })}
                                >
                                    Revoke
                                </button>
                            )}
                        </div>
                        {row.incomingPeace && row.state === DiplomacyState.War && (
                            <div className="hud-subtext warn">Peace offer received</div>
                        )}
                        {row.outgoingPeace && row.state === DiplomacyState.War && (
                            <div className="hud-subtext">Peace offer sent</div>
                        )}
                        {row.incomingVision && !row.atPeace && (
                            <div className="hud-subtext warn">Vision offer pending (requires peace)</div>
                        )}
                        {row.sharingVision && (
                            <div className="hud-subtext">Map sharing active</div>
                        )}
                        {row.outgoingVision && !row.sharingVision && (
                            <div className="hud-subtext">Vision offer sent</div>
                        )}
                    </div>
                );
            })}
            <div className="hud-section-title" style={{ marginTop: 12 }}>City-States</div>
            {cityStateRows.length === 0 && (
                <div className="hud-subtext">No discovered city-states.</div>
            )}
            {cityStateRows.map(row => (
                <div key={row.cityStateId} className="diplomacy-row">
                    <div className="diplomacy-row__header">
                        <p className="hud-title-sm" style={{ margin: 0 }}>{row.name}</p>
                        <span className="hud-pill">{row.yieldType}</span>
                    </div>
                    <div className="hud-subtext" style={{ marginTop: 4 }}>
                        Suzerain: {row.suzerainLabel}
                    </div>
                    <div className="hud-subtext">
                        Influence: you {Math.round(row.myInfluence)} / top {Math.round(row.topInfluence)}
                    </div>
                    <div className="hud-subtext">
                        Standing: {row.entries.map(e => `${e.civTitle} ${Math.round(e.influence)}`).join(" · ")}
                    </div>
                    <div className="diplomacy-row__actions">
                        <button
                            className="hud-button small"
                            onClick={() => onAction({ type: "InvestCityStateInfluence", playerId, cityStateId: row.cityStateId })}
                            disabled={!row.canInvest}
                        >
                            Invest ({row.investCost}G)
                        </button>
                    </div>
                    {!row.canInvest && row.investDisabledReason && (
                        <div className="hud-subtext warn">{row.investDisabledReason}</div>
                    )}
                </div>
            ))}
        </div>
    </div>
);





