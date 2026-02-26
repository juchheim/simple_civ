import { useEffect } from "react";

export function useAutoClearError(
    error: string | null,
    setError: (error: string | null) => void,
    delayMs = 3000
): void {
    useEffect(() => {
        if (!error) return;

        const timer = setTimeout(() => {
            setError(null);
        }, delayMs);

        return () => clearTimeout(timer);
    }, [delayMs, error, setError]);
}
