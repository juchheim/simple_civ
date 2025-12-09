/**
 * AI Debug Logging Module
 * 
 * Controls whether AI debug messages are output to console.
 * Disabled during simulations for performance (console.log is synchronous and slow).
 */

let debugEnabled = true;

/**
 * Enable or disable AI debug logging.
 * Call setAiDebug(false) before running simulations for ~10x speedup.
 */
export function setAiDebug(enabled: boolean): void {
    debugEnabled = enabled;
}

/**
 * Check if AI debug logging is enabled.
 */
export function isAiDebugEnabled(): boolean {
    return debugEnabled;
}

/**
 * Log an AI debug message (only if debug is enabled).
 * Use this instead of console.log for AI-related debugging.
 */
export function aiLog(...args: unknown[]): void {
    if (debugEnabled) {
        console.log(...args);
    }
}

/**
 * Log an AI info message (only if debug is enabled).
 * Use this instead of console.info for AI-related info.
 */
export function aiInfo(...args: unknown[]): void {
    if (debugEnabled) {
        console.info(...args);
    }
}

/**
 * Log an AI warning (always output, not suppressed).
 */
export function aiWarn(...args: unknown[]): void {
    console.warn(...args);
}
