import React from "react";
import { City } from "@simple-civ/engine";
import { cityImages } from "../../assets";
import { CITY_IMAGE_SIZE, CITY_LABEL_OFFSET } from "./constants";

export type CityOverlayDescriptor = {
    key: string;
    position: { x: number; y: number };
    city: City;
};

type CityLayerProps = {
    overlays: CityOverlayDescriptor[];
    hexPoints: string;
};

export const CityLayer: React.FC<CityLayerProps> = React.memo(({ overlays, hexPoints }) => {
    const imageOffset = CITY_IMAGE_SIZE / 2;

    return (
        <g style={{ pointerEvents: "none" }}>
            {overlays.map(overlay => {
                const cityLevel = Math.min(overlay.city.pop, 7);
                const cityImg = cityImages[cityLevel];

                return (
                    <g key={`city-${overlay.key}`} transform={`translate(${overlay.position.x},${overlay.position.y})`}>
                        <polygon
                            points={hexPoints}
                            fill="none"
                            stroke="#00ffff"
                            strokeWidth={15}
                        />
                        <image
                            href={cityImg}
                            x={-imageOffset}
                            y={-imageOffset}
                            width={CITY_IMAGE_SIZE}
                            height={CITY_IMAGE_SIZE}
                        />
                        <text
                            x={0}
                            y={-CITY_LABEL_OFFSET}
                            textAnchor="middle"
                            fill="white"
                            fontSize={24}
                            style={{
                                pointerEvents: "none",
                                fontWeight: "bold",
                                textShadow: "2px 2px 4px #000, -2px -2px 4px #000, 2px -2px 4px #000, -2px 2px 4px #000"
                            }}
                        >
                            {overlay.city.name} {overlay.city.pop}
                        </text>
                    </g>
                );
            })}
        </g>
    );
});

