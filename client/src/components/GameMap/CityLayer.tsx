import React from "react";
import { City } from "@simple-civ/engine";
import { cityImages } from "../../assets";
import { CITY_IMAGE_SIZE, CITY_LABEL_OFFSET } from "./constants";

export type CityOverlayDescriptor = {
    key: string;
    position: { x: number; y: number };
    city: City;
    strokeColor: string;
};

type CityLayerProps = {
    overlays: CityOverlayDescriptor[];
    hexPoints: string;
};


const darkenColor = (color: string, amount: number = 0.3): string => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const newR = Math.max(0, Math.floor(r * (1 - amount)));
    const newG = Math.max(0, Math.floor(g * (1 - amount)));
    const newB = Math.max(0, Math.floor(b * (1 - amount)));

    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

export const CityImageLayer: React.FC<CityLayerProps> = React.memo(({ overlays, hexPoints }) => {
    const imageOffset = CITY_IMAGE_SIZE / 2;

    return (
        <g style={{ pointerEvents: "none" }}>
            {overlays.map(overlay => {
                const cityLevel = Math.min(overlay.city.pop, 7);
                const cityImg = cityImages[cityLevel];

                return (
                    <g key={`city-image-${overlay.key}`} transform={`translate(${overlay.position.x},${overlay.position.y})`}>
                        <polygon
                            points={hexPoints}
                            fill="none"
                            stroke={overlay.strokeColor}
                            strokeWidth={15}
                        />
                        <image
                            href={cityImg}
                            x={-imageOffset}
                            y={-imageOffset}
                            width={CITY_IMAGE_SIZE}
                            height={CITY_IMAGE_SIZE}
                        />
                    </g>
                );
            })}
        </g>
    );
});

export const CityLabelLayer: React.FC<CityLayerProps> = React.memo(({ overlays }) => {
    return (
        <g style={{ pointerEvents: "none" }}>
            {overlays.map(overlay => {
                const darkColor = darkenColor(overlay.strokeColor, 0.5);

                return (
                    <g key={`city-label-${overlay.key}`} transform={`translate(${overlay.position.x},${overlay.position.y})`}>
                        {/* Health Bar */}
                        <g transform={`translate(0, ${-CITY_LABEL_OFFSET - 55})`}>
                            {/* Background */}
                            <rect
                                x={-20}
                                y={0}
                                width={40}
                                height={6}
                                fill="#333"
                                stroke="black"
                                strokeWidth={1}
                            />
                            {/* Health */}
                            <rect
                                x={-19}
                                y={1}
                                width={Math.max(0, (38 * overlay.city.hp) / overlay.city.maxHp)}
                                height={4}
                                fill={overlay.city.hp > overlay.city.maxHp * 0.5 ? "#4ade80" : "#ef4444"}
                            />
                        </g>

                        {/* Capital Star */}
                        {overlay.city.isCapital && (
                            <text
                                x={0}
                                y={-CITY_LABEL_OFFSET - 65}
                                textAnchor="middle"
                                fill="#FFD700" // Gold
                                fontSize={24}
                                style={{
                                    pointerEvents: "none",
                                    filter: "drop-shadow(0px 0px 2px black)"
                                }}
                            >
                                ★
                            </text>
                        )}

                        <circle
                            cx={0}
                            cy={-CITY_LABEL_OFFSET - 30}
                            r={20}
                            fill={darkColor}
                            stroke="white"
                            strokeWidth={2}
                        />
                        <text
                            x={0}
                            y={-CITY_LABEL_OFFSET - 22}
                            textAnchor="middle"
                            fill="white"
                            fontSize={22}
                            style={{
                                pointerEvents: "none",
                                fontWeight: "bold"
                            }}
                        >
                            {overlay.city.pop}
                        </text>
                        <text
                            x={0}
                            y={-CITY_LABEL_OFFSET + 5}
                            textAnchor="middle"
                            fill="white"
                            fontSize={24}
                            style={{
                                pointerEvents: "none",
                                fontWeight: "bold",
                                textShadow: "2px 2px 4px #000, -2px -2px 4px #000, 2px -2px 4px #000, -2px 2px 4px #000"
                            }}
                        >
                            {overlay.city.name}
                        </text>
                    </g>
                );
            })}
        </g>
    );
});

// Keep the old CityLayer for backwards compatibility, but it's now just a composition
export const CityLayer: React.FC<CityLayerProps> = React.memo(({ overlays, hexPoints }) => {
    return (
        <>
            <CityImageLayer overlays={overlays} hexPoints={hexPoints} />
            <CityLabelLayer overlays={overlays} hexPoints={hexPoints} />
        </>
    );
});

