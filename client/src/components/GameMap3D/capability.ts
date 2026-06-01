let cachedCapability: boolean | null = null;

export function detect3DCapability(): boolean {
    if (cachedCapability !== null) return cachedCapability;
    if (typeof document === "undefined") return false;
    if (typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("jsdom")) {
        return false;
    }

    try {
        const canvas = document.createElement("canvas");
        cachedCapability = Boolean(
            canvas.getContext("webgl2") ||
            canvas.getContext("webgl") ||
            canvas.getContext("experimental-webgl"),
        );
    } catch {
        cachedCapability = false;
    }

    return cachedCapability;
}

export function reset3DCapabilityCache(): void {
    cachedCapability = null;
}
