import React from "react";
import { HexCoord } from "@simple-civ/engine";

type BlockingTask = {
    id: string;
    kind: "research" | "city";
    label: string;
    coord?: HexCoord;
};

type AttentionTask = {
    id: string;
    kind: "unit";
    label: string;
    coord: HexCoord;
    unitId: string;
};

type TurnTasksProps = {
    blockingTasks: BlockingTask[];
    attentionTasks: AttentionTask[];
    isMyTurn: boolean;
    onOpenTechTree: () => void;
    onFocusCity: (coord: HexCoord) => void;
    onFocusUnit: (unitId: string, coord: HexCoord) => void;
};

export const TurnTasks: React.FC<TurnTasksProps> = ({
    blockingTasks,
    attentionTasks,
    isMyTurn,
    onOpenTechTree,
    onFocusCity,
    onFocusUnit,
}) => {
    const [expanded, setExpanded] = React.useState(false);

    React.useEffect(() => {
        if (!isMyTurn) {
            setExpanded(false);
            return;
        }
        if (blockingTasks.length === 0 && attentionTasks.length === 0) {
            setExpanded(false);
            return;
        }
        if (blockingTasks.length > 0 || attentionTasks.length > 0) {
            setExpanded(true);
        }
    }, [blockingTasks.length, attentionTasks.length, isMyTurn]);

    const handleToggle = () => {
        if (!isMyTurn) return;
        setExpanded(prev => !prev);
    };

    const renderBlocking = () => (
        <div className="hud-task-section">
            <div className="hud-task-section__header">
                <span className="hud-task-tag danger">Blocking</span>
                <span className="hud-subtext" style={{ marginTop: 0 }}>{blockingTasks.length} required</span>
            </div>
            {blockingTasks.map(task => (
                <div key={task.id} className="hud-task-row">
                    <div className="hud-task-copy">
                        <p className="hud-title-sm" style={{ margin: "0 0 2px 0" }}>{task.label}</p>
                        <div className="hud-subtext" style={{ marginTop: 0 }}>
                            {task.kind === "research" ? "Pick a new technology." : "Pick a new city production."}
                        </div>
                    </div>
                    {task.kind === "research" ? (
                        <button className="hud-button small pulse" onClick={onOpenTechTree}>Open</button>
                    ) : task.coord ? (
                        <button className="hud-button small pulse" onClick={() => onFocusCity(task.coord!)}>Focus</button>
                    ) : null}
                </div>
            ))}
        </div>
    );

    const renderAttention = () => (
        <div className="hud-task-section">
            <div className="hud-task-section__header">
                <span className="hud-task-tag">Attention</span>
                <span className="hud-subtext" style={{ marginTop: 0 }}>{attentionTasks.length} optional</span>
            </div>
            {attentionTasks.length === 0 && <div className="hud-subtext" style={{ marginTop: 2 }}>Nothing urgent.</div>}
            {attentionTasks.map(task => (
                <div key={task.id} className="hud-task-row">
                    <div className="hud-task-copy">
                        <p className="hud-title-sm" style={{ margin: "0 0 2px 0" }}>{task.label}</p>
                        <div className="hud-subtext" style={{ marginTop: 0 }}>Unit has moves left.</div>
                    </div>
                    <button className="hud-button small ghost" onClick={() => onFocusUnit(task.unitId, task.coord)}>Select</button>
                </div>
            ))}
        </div>
    );

    const pillLabel = blockingTasks.length > 0
        ? `Blocking: ${blockingTasks.length}`
        : "Blocking: 0";

    const attentionLabel = `Attention: ${attentionTasks.length}`;

    return (
        <div className="hud-tasks-wrapper">
            <button className="hud-tasks-pill" onClick={handleToggle} disabled={!isMyTurn}>
                <span className="hud-pill-count">{pillLabel}</span>
                <span className="hud-pill-divider">|</span>
                <span className="hud-pill-count">{attentionLabel}</span>
                <span className={`hud-pill-chevron ${expanded ? "open" : ""}`}>⌃</span>
            </button>
            {expanded && (blockingTasks.length > 0 || attentionTasks.length > 0) && (
                <div className="hud-card hud-tasks-card">
                    {renderBlocking()}
                    <div className="hud-task-divider" />
                    {renderAttention()}
                </div>
            )}
        </div>
    );
};
