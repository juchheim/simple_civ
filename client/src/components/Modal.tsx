import React, { useEffect, useState } from "react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
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

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 2000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0, 0, 0, 0.7)",
                opacity: isOpen ? 1 : 0,
                transition: "opacity 0.2s ease-in-out",
                backdropFilter: "blur(4px)",
            }}
            onClick={onClose}
        >
            <div
                style={{
                    position: "relative",
                    width: "min(500px, 90vw)",
                    maxHeight: "80vh",
                    background: "var(--color-bg-panel, #1a1b1e)",
                    borderRadius: 16,
                    border: "1px solid var(--color-border, #374151)",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                    display: "flex",
                    flexDirection: "column",
                    transform: isOpen ? "scale(1) translateY(0)" : "scale(0.95) translateY(10px)",
                    transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                    overflow: "hidden",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                {(title || onClose) && (
                    <div style={{
                        padding: "16px 24px",
                        borderBottom: "1px solid var(--color-border, #374151)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "rgba(255, 255, 255, 0.03)",
                    }}>
                        {title && (
                            <h2 style={{
                                margin: 0,
                                fontSize: 18,
                                fontWeight: 600,
                                color: "var(--color-text-main, #fff)",
                            }}>
                                {title}
                            </h2>
                        )}
                        <button
                            onClick={onClose}
                            style={{
                                background: "transparent",
                                border: "none",
                                color: "var(--color-text-muted, #9ca3af)",
                                cursor: "pointer",
                                fontSize: 20,
                                padding: 4,
                                lineHeight: 1,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: 4,
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                                e.currentTarget.style.color = "white";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = "var(--color-text-muted, #9ca3af)";
                            }}
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* Content */}
                <div style={{ padding: 24, overflowY: "auto" }}>
                    {children}
                </div>
            </div>
        </div>
    );
};
