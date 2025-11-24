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
        <h4>Diplomacy</h4>
        {rows.map(row => (
            <div key={row.playerId} style={{ marginBottom: 6 }}>
                <div>
                    <span>
                        {row.playerId}: {row.state}
                    </span>
                    {!row.hasContact && (
                        <span style={{ marginLeft: 6, fontSize: 11, color: "#ffd" }}>(No contact)</span>
                    )}
                    <button
                        style={{ marginLeft: 8 }}
                        onClick={() =>
                            onAction({ type: "SetDiplomacy", playerId, targetPlayerId: row.playerId, state: DiplomacyState.War })
                        }
                        disabled={row.state === DiplomacyState.War || !row.hasContact}
                    >
                        {row.state === DiplomacyState.War ? "At War" : "Declare War"}
                    </button>
                    <button
                        style={{ marginLeft: 4 }}
                        onClick={() => onAction({ type: "ProposePeace", playerId, targetPlayerId: row.playerId })}
                        disabled={row.atPeace || row.outgoingPeace || !row.hasContact}
                    >
                        {row.outgoingPeace ? "Peace Proposed" : "Propose Peace"}
                    </button>
                    {row.incomingPeace && row.state === DiplomacyState.War && (
                        <button
                            style={{ marginLeft: 4 }}
                            onClick={() => onAction({ type: "AcceptPeace", playerId, targetPlayerId: row.playerId })}
                        >
                            Accept Peace
                        </button>
                    )}
                </div>
                {row.incomingPeace && row.state === DiplomacyState.War && (
                    <div style={{ fontSize: 11, color: "#ffd" }}>Peace offer received</div>
                )}
                {row.outgoingPeace && row.state === DiplomacyState.War && (
                    <div style={{ fontSize: 11, color: "#9cf" }}>Peace offer sent</div>
                )}
                <div style={{ marginTop: 4 }}>
                    <span style={{ marginRight: 6, fontSize: 12 }}>Vision:</span>
                    <button
                        onClick={() => onAction({ type: "ProposeVisionShare", playerId, targetPlayerId: row.playerId })}
                        disabled={!row.atPeace || row.sharingVision || row.outgoingVision || !row.hasContact}
                        style={{ marginRight: 4 }}
                    >
                        {row.sharingVision ? "Sharing" : row.outgoingVision ? "Vision Proposed" : "Offer Vision Share"}
                    </button>
                    {row.incomingVision && row.atPeace && !row.sharingVision && row.hasContact && (
                        <button
                            onClick={() => onAction({ type: "AcceptVisionShare", playerId, targetPlayerId: row.playerId })}
                            style={{ marginRight: 4 }}
                        >
                            Accept Vision
                        </button>
                    )}
                    {row.sharingVision && (
                        <button onClick={() => onAction({ type: "RevokeVisionShare", playerId, targetPlayerId: row.playerId })}>
                            Revoke
                        </button>
                    )}
                    {row.incomingVision && !row.atPeace && (
                        <span style={{ fontSize: 11, color: "#ffd", marginLeft: 6 }}>Vision offer pending (needs peace)</span>
                    )}
                    {row.sharingVision && (
                        <span style={{ fontSize: 11, color: "#9cf", marginLeft: 6 }}>Map sharing active</span>
                    )}
                    {row.outgoingVision && !row.sharingVision && (
                        <span style={{ fontSize: 11, color: "#9cf", marginLeft: 6 }}>Vision offer sent</span>
                    )}
                </div>
            </div>
        ))}
    </div>
);

