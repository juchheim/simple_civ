import { useCallback, useState } from "react";

type UseSessionModalsResult = {
    showSaveModal: boolean;
    showLoadModal: boolean;
    openSaveModal: () => void;
    closeSaveModal: () => void;
    openLoadModal: () => void;
    closeLoadModal: () => void;
};

export function useSessionModals(): UseSessionModalsResult {
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showLoadModal, setShowLoadModal] = useState(false);

    const openSaveModal = useCallback(() => setShowSaveModal(true), []);
    const closeSaveModal = useCallback(() => setShowSaveModal(false), []);

    const openLoadModal = useCallback(() => setShowLoadModal(true), []);
    const closeLoadModal = useCallback(() => setShowLoadModal(false), []);

    return {
        showSaveModal,
        showLoadModal,
        openSaveModal,
        closeSaveModal,
        openLoadModal,
        closeLoadModal,
    };
}
