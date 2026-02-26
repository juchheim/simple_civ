import { useAppCoreState } from "./useAppCoreState";
import { useAppPresenterModel } from "./useAppPresenterModel";

/**
 * Top-level App view model: compose core app orchestration with presenter props assembly.
 */
export function useAppViewModel() {
    const core = useAppCoreState();
    return useAppPresenterModel(core);
}
