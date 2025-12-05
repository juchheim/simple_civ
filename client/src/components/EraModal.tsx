import React, { useEffect, useState } from "react";
import { EraId } from "@simple-civ/engine";
import hearthBg from "../assets/images/eras/hearth.png";
import bannerBg from "../assets/images/eras/banner.png";
import engineBg from "../assets/images/eras/engine.png";

interface EraModalProps {
    era: EraId;
    isOpen: boolean;
    onClose: () => void;
}

const ERA_CONFIG: Record<EraId, { title: string; description: string; image: string }> = {
    [EraId.Hearth]: {
        title: "The Age of Hearth",
        description: "From the first spark of fire, we forge our destiny.",
        image: hearthBg,
    },
    [EraId.Banner]: {
        title: "The Age of Banners",
        description: "Nations rise, borders expand, and our banner flies high.",
        image: bannerBg,
    },
    [EraId.Engine]: {
        title: "The Age of the Engine",
        description: "Steam and steel drive us forward into a new dawn.",
        image: engineBg,
    },
};

export const EraModal: React.FC<EraModalProps> = ({ era, isOpen, onClose }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setVisible(true);
        } else {
            const timer = setTimeout(() => setVisible(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!visible && !isOpen) return null;

    const config = ERA_CONFIG[era];
    if (!config) return null;

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 2000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0, 0, 0, 0.8)",
                opacity: isOpen ? 1 : 0,
                transition: "opacity 0.3s ease-in-out",
                backdropFilter: "blur(5px)",
            }}
        >
            <div
                style={{
                    position: "relative",
                    width: "min(900px, 90vw)",
                    height: "min(500px, 60vh)",
                    borderRadius: 24,
                    overflow: "hidden",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
                    transform: isOpen ? "scale(1) translateY(0)" : "scale(0.95) translateY(20px)",
                    transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
            >
                {/* Background Image */}
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        backgroundImage: `url(${config.image})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        filter: "brightness(0.6)",
                    }}
                />

                {/* Content Overlay */}
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 40,
                        textAlign: "center",
                        color: "white",
                        background: "linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.6))",
                    }}
                >
                    <div
                        style={{
                            fontSize: 16,
                            textTransform: "uppercase",
                            letterSpacing: "0.2em",
                            marginBottom: 16,
                            color: "rgba(255, 255, 255, 0.8)",
                            textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                        }}
                    >
                        New Era Reached
                    </div>
                    <h1
                        style={{
                            fontSize: 48,
                            fontWeight: 800,
                            marginBottom: 24,
                            textShadow: "0 4px 12px rgba(0,0,0,0.6)",
                            background: "linear-gradient(to bottom, #fff, #ddd)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                        }}
                    >
                        {config.title}
                    </h1>
                    <p
                        style={{
                            fontSize: 20,
                            maxWidth: 600,
                            lineHeight: 1.6,
                            marginBottom: 48,
                            color: "rgba(255, 255, 255, 0.9)",
                            textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                            fontStyle: "italic",
                        }}
                    >
                        "{config.description}"
                    </p>

                    <button
                        onClick={onClose}
                        style={{
                            padding: "16px 48px",
                            fontSize: 18,
                            fontWeight: 600,
                            color: "white",
                            background: "rgba(255, 255, 255, 0.1)",
                            border: "1px solid rgba(255, 255, 255, 0.3)",
                            borderRadius: 12,
                            cursor: "pointer",
                            backdropFilter: "blur(10px)",
                            transition: "all 0.2s ease",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                            e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                            e.currentTarget.style.transform = "translateY(0)";
                        }}
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
};
