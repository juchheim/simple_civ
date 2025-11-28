import React from "react";
import { Unit, UnitType } from "@simple-civ/engine";
import { unitImages } from "../../assets";
import { HEX_SIZE, UNIT_IMAGE_SIZE } from "./constants";

export type UnitDescriptor = {
    unit: Unit;
    position: { x: number; y: number };
    isSelected: boolean;
    isLinkedPartner: boolean;
    showLinkIcon: boolean;
    color: string;
    isOnCityHex?: boolean;
};

type UnitLayerProps = {
    units: UnitDescriptor[];
};

const UnitSprite: React.FC<UnitDescriptor> = React.memo(({ unit, position, isSelected, isLinkedPartner, showLinkIcon, color }) => {
    const unitImageOffset = UNIT_IMAGE_SIZE / 2;
    const hpPct = Math.max(0, Math.min(1, unit.hp / unit.maxHp));

    return (
        <g
            style={{
                pointerEvents: "none",
                transform: `translate(${position.x}px, ${position.y}px)`,
                transition: "transform 200ms linear",
            }}
        >
            {(isSelected || isLinkedPartner) && (
                <circle
                    cx={0}
                    cy={0}
                    r={HEX_SIZE * 0.75}
                    stroke={isSelected ? "#facc15" : "#38bdf8"}
                    strokeWidth={4}
                    fill="none"
                    strokeDasharray={isLinkedPartner && !isSelected ? "6 4" : undefined}
                />
            )}

            {/* Civilization color circle - always visible */}
            <circle
                cx={0}
                cy={0}
                r={UNIT_IMAGE_SIZE * 0.5}
                fill={color}
                opacity={0.8}
            />

            <image
                href={unitImages[unit.type] || ""}
                x={-unitImageOffset}
                y={-unitImageOffset}
                width={UNIT_IMAGE_SIZE}
                height={UNIT_IMAGE_SIZE}
            />

            {showLinkIcon && (
                <g transform={`translate(${unitImageOffset * 0.45}, ${-unitImageOffset * 0.6})`}>
                    <circle cx={0} cy={0} r={9} stroke="#fef3c7" strokeWidth={2} fill="rgba(17,24,39,0.75)" />
                    <circle cx={12} cy={6} r={9} stroke="#bfdbfe" strokeWidth={2} fill="rgba(17,24,39,0.9)" />
                    <path d="M-4,0 L16,10" stroke="#fef3c7" strokeWidth={2} />
                </g>
            )}

            {unit.type !== UnitType.Settler && (
                <g>
                    <rect
                        x={-30}
                        y={-unitImageOffset - 15}
                        width={60}
                        height={8}
                        fill="#333"
                        stroke="black"
                        strokeWidth={1}
                    />
                    <rect
                        x={-30}
                        y={-unitImageOffset - 15}
                        width={60 * hpPct}
                        height={8}
                        fill={hpPct > 0.5 ? "#22c55e" : hpPct > 0.25 ? "#eab308" : "#ef4444"}
                    />
                </g>
            )}
        </g>
    );
});

export const UnitLayer: React.FC<UnitLayerProps> = React.memo(({ units }) => {
    return (
        <g style={{ pointerEvents: "none" }}>
            {units.map(descriptor => (
                <UnitSprite
                    key={descriptor.unit.id}
                    {...descriptor}
                />
            ))}
        </g>
    );
});

