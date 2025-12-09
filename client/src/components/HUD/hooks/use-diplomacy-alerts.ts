import { useEffect, useRef, useState } from "react";
import { GameState, DiplomacyState, DiplomacyOffer } from "@simple-civ/engine";

export type DiplomacyAlert = {
    id: string; // Unique ID for the alert
    type: "WarDeclared" | "PeaceOffered" | "ProgressRace" | "CapitalCaptured" | "UniqueBuilding" | "EraTransition" | "CityRazed" | "CivDefeated";
    otherPlayerId: string;
    civName: string;
    progressMilestone?: "Observatory" | "GrandAcademy" | "GrandExperiment";
    buildingType?: "TitansCore" | "SpiritObservatory" | "JadeGranary";
    buildingStatus?: "Started" | "Completed";
    capitalCount?: number; // Total capitals captured by this civ
    cityName?: string; // Name of captured/razed city
    era?: string; // Era entered
};

export function useDiplomacyAlerts(gameState: GameState, playerId: string) {
    const [alerts, setAlerts] = useState<DiplomacyAlert[]>([]);

    // Track previous state to detect changes
    const prevDiplomacyRef = useRef<Record<string, Record<string, DiplomacyState>>>(gameState.diplomacy);
    const prevOffersRef = useRef<DiplomacyOffer[]>(gameState.diplomacyOffers);
    // Skip first run to avoid alerting on offers that existed before we started tracking
    const isFirstRunRef = useRef(true);

    useEffect(() => {
        // Skip the first run - we don't want to alert on pre-existing offers
        if (isFirstRunRef.current) {
            isFirstRunRef.current = false;
            prevDiplomacyRef.current = gameState.diplomacy;
            prevOffersRef.current = gameState.diplomacyOffers;
            return;
        }

        const newAlerts: DiplomacyAlert[] = [];
        const currentDiplomacy = gameState.diplomacy;
        const prevDiplomacy = prevDiplomacyRef.current;

        // Check for new wars
        // We only care about wars involving us
        // diplomacy[A][B]

        // Iterate over all players to see if anyone declared war on us
        for (const otherPlayer of gameState.players) {
            if (otherPlayer.id === playerId) continue;

            // Check if state changed to War
            const wasWar = prevDiplomacy[otherPlayer.id]?.[playerId] === DiplomacyState.War;
            const isWar = currentDiplomacy[otherPlayer.id]?.[playerId] === DiplomacyState.War;

            // Also check the reverse direction just in case, though usually symmetric
            // But "Declared War" implies they initiated it? 
            // The engine usually sets both sides to War.
            // We just want to know if we are NOW at war and WEREN'T before.

            if (isWar && !wasWar) {
                // War declared!
                newAlerts.push({
                    id: `war-${otherPlayer.id}-${Date.now()}`,
                    type: "WarDeclared",
                    otherPlayerId: otherPlayer.id,
                    civName: otherPlayer.civName,
                });
            }
        }

        // Check for new peace offers
        // We look for offers where to === playerId
        const currentOffers = gameState.diplomacyOffers;

        // We need to identify *new* offers. 
        // Since offers don't have IDs, we can use a composite key: from-to-type
        // But if an offer is rejected and re-sent, it might look the same.
        // However, offers are usually transient or persistent until resolved.
        // Let's check if the offer exists in current but not in processed set (or not in prev).

        // Better approach:
        // Identify offers in current that are for us.
        // If we haven't seen this specific offer configuration before (or if it's new in the list).
        // Since the list can change (offers removed), simple index comparison is risky.
        // But we can assume if an offer is in the list, it's active.
        // We want to alert only when it *appears*.

        const myOffers = currentOffers.filter(o => o.to === playerId && o.type === "Peace");

        for (const offer of myOffers) {
            // Check if we already had this offer from this player

            // If this offer was NOT in the previous list, it's new.
            const wasInPrev = prevOffersRef.current.some(o =>
                o.from === offer.from && o.to === offer.to && o.type === offer.type
            );

            if (!wasInPrev) {
                const sender = gameState.players.find(p => p.id === offer.from);
                if (sender) {
                    newAlerts.push({
                        id: `peace-${offer.from}-${Date.now()}`,
                        type: "PeaceOffered",
                        otherPlayerId: offer.from,
                        civName: sender.civName,
                    });
                }
            }
        }

        if (newAlerts.length > 0) {
            setAlerts(prev => [...prev, ...newAlerts]);
        }

        // Update refs
        prevDiplomacyRef.current = currentDiplomacy;
        prevOffersRef.current = currentOffers;

    }, [gameState, playerId]);

    const dismissAlert = (id: string) => {
        setAlerts(prev => prev.filter(a => a.id !== id));
    };

    return {
        activeAlert: alerts.length > 0 ? alerts[0] : null,
        dismissAlert
    };
}
