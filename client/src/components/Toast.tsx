import React, { useEffect, useState } from "react";

export type Toast = {
    id: string;
    message: string;
    icon: string;
    duration?: number;
};

type ToastContainerProps = {
    toasts: Toast[];
    onDismiss: (id: string) => void;
};

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
    return (
        <div
            style={{
                position: "fixed",
                top: 80,
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                zIndex: 1500,
                pointerEvents: "none",
            }}
        >
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
            ))}
        </div>
    );
};

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({
    toast,
    onDismiss,
}) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const duration = toast.duration ?? 3000;
        const exitTimer = setTimeout(() => setIsExiting(true), duration - 300);
        const dismissTimer = setTimeout(() => onDismiss(toast.id), duration);
        return () => {
            clearTimeout(exitTimer);
            clearTimeout(dismissTimer);
        };
    }, [toast.id, toast.duration, onDismiss]);

    return (
        <div
            style={{
                padding: "12px 20px",
                background: "linear-gradient(135deg, rgba(30, 25, 20, 0.95), rgba(20, 15, 10, 0.98))",
                border: "1px solid rgba(205, 138, 54, 0.6)",
                borderRadius: 10,
                backdropFilter: "blur(12px)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                display: "flex",
                alignItems: "center",
                gap: 12,
                animation: isExiting ? "toastExit 0.3s ease-out" : "toastEnter 0.3s ease-out",
                pointerEvents: "auto",
            }}
        >
            <span style={{ fontSize: 24 }}>{toast.icon}</span>
            <span
                style={{
                    color: "#f8f4f0",
                    fontSize: 14,
                    fontWeight: 500,
                    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                }}
            >
                {toast.message}
            </span>
            <style>{`
                @keyframes toastEnter {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes toastExit {
                    from {
                        opacity: 1;
                        transform: translateY(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                }
            `}</style>
        </div>
    );
};
