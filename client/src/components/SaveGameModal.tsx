import React, { useState } from "react";
import { Modal } from "./Modal";

interface SaveGameModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirmSave: () => void;
}

export const SaveGameModal: React.FC<SaveGameModalProps> = ({ isOpen, onClose, onConfirmSave }) => {
    const [isSaved, setIsSaved] = useState(false);

    const handleSave = () => {
        onConfirmSave();
        setIsSaved(true);
        setTimeout(() => {
            setIsSaved(false);
            onClose();
        }, 1500);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Save Game">
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {isSaved ? (
                    <div style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 16,
                        padding: "20px 0",
                        color: "#10b981"
                    }}>
                        <div style={{ fontSize: 40 }}>✓</div>
                        <div style={{ fontSize: 18, fontWeight: 600 }}>Game Saved Successfully</div>
                    </div>
                ) : (
                    <>
                        <p style={{ margin: 0, color: "var(--color-text-muted, #9ca3af)", lineHeight: 1.5 }}>
                            This will overwrite your previous manual save. Are you sure you want to continue?
                        </p>

                        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
                            <button
                                onClick={onClose}
                                style={{
                                    padding: "10px 16px",
                                    borderRadius: 6,
                                    border: "1px solid var(--color-border, #374151)",
                                    background: "transparent",
                                    color: "var(--color-text-main, #fff)",
                                    cursor: "pointer",
                                    fontSize: 14,
                                    fontWeight: 500,
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                style={{
                                    padding: "10px 20px",
                                    borderRadius: 6,
                                    border: "none",
                                    background: "var(--color-highlight-strong, #cd8a36)",
                                    color: "white",
                                    cursor: "pointer",
                                    fontSize: 14,
                                    fontWeight: 600,
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                                }}
                            >
                                Save Game
                            </button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};
