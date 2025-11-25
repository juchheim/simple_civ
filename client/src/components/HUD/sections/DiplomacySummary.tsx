import React from "react";
import { Action, DiplomacyState } from "@simple-civ/engine";
import { DiplomacyRow } from "../helpers";

type DiplomacySummaryProps = {
    rows: DiplomacyRow[];
    playerId: string;
    onAction: (action: Action) => void;
};

export const DiplomacySummary: React.FC<DiplomacySummaryProps> = ({ rows, playerId, onAction }) => (
    <div>
        <div className="hud-section-title">Diplomacy</div>
        <div className="hud-subtext" style={{ marginTop: 0 }}>Only civilizations you have contacted will appear here.</div>
        <div className="hud-menu-scroll">
            {rows.length === 0 && <div className="hud-subtext warn">No civilizations encountered yet.</div>}
            {rows.map(row => {
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
                            <button
                                className="hud-button small"
                                onClick={() => onAction({ type: "ProposePeace", playerId, targetPlayerId: row.playerId })}
                                disabled={row.atPeace || row.outgoingPeace || !row.hasContact}
                            >
                                {row.outgoingPeace ? "Peace Proposed" : "Propose Peace"}
                            </button>
                            {row.incomingPeace && row.state === DiplomacyState.War && (
                                <button
                                    className="hud-button small"
                                    onClick={() => onAction({ type: "AcceptPeace", playerId, targetPlayerId: row.playerId })}
                                >
                                    Accept Peace
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
        </div>
    </div>
);
