/// <reference types="vite/client" />

interface ImportMeta {
    glob<T = string>(
        pattern: string,
        options?: {
            as?: "raw" | "url";
            eager?: boolean;
            import?: string;
            query?: string | Record<string, string | boolean>;
        },
    ): Record<string, T>;
}

