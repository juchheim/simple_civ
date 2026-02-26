import { RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import { isSameViewportFrame } from "./map-controller-math";

type ViewportSize = { width: number; height: number };
type ViewportFrame = {
    pan: { x: number; y: number };
    zoom: number;
    size: ViewportSize;
};

export function useMapViewportSize(
    containerRef: RefObject<HTMLDivElement>,
): ViewportSize {
    const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 0, height: 0 });

    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver(entries => {
            const entry = entries[0];
            if (!entry) return;
            const { width, height } = entry.contentRect;
            setViewportSize(previous => {
                if (previous.width === width && previous.height === height) {
                    return previous;
                }
                return { width, height };
            });
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, [containerRef]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        setViewportSize(previous => {
            const width = container.clientWidth;
            const height = container.clientHeight;
            if (previous.width === width && previous.height === height) {
                return previous;
            }
            return { width, height };
        });
    }, [containerRef]);

    return viewportSize;
}

export function useViewportChangeNotifier<T extends ViewportFrame>(
    viewport: T | null,
    onViewChange?: (view: T) => void,
): void {
    const lastViewportRef = useRef<T | null>(null);

    useEffect(() => {
        if (!viewport || !onViewChange) return;
        if (isSameViewportFrame(lastViewportRef.current, viewport)) return;
        lastViewportRef.current = viewport;
        onViewChange(viewport);
    }, [onViewChange, viewport]);
}
