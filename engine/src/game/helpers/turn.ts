import { GameState, Player, TechId } from "../../core/types.js";
import { TECHS } from "../../core/constants.js";

export function ensureTechSelected(state: GameState, player: Player) {
    if (!player.currentTech) {
        const autoTech = pickBestAvailableTech(player);
        if (autoTech) {
            player.currentTech = { id: autoTech, progress: 0, cost: TECHS[autoTech].cost };
        }
    }
}

export function pickBestAvailableTech(player: Player): TechId | null {
    const allTechs = Object.keys(TECHS) as TechId[];

    const available = allTechs.filter(techId => {
        if (player.techs.includes(techId)) return false;
        const tech = TECHS[techId];

        const hearthCount = player.techs.filter(t => TECHS[t].era === "Hearth").length;
        const bannerCount = player.techs.filter(t => TECHS[t].era === "Banner").length;
        if (tech.era === "Banner" && hearthCount < 2) return false;
        if (tech.era === "Engine" && bannerCount < 2) return false;

        return tech.prereqTechs.every(prereq => player.techs.includes(prereq));
    });

    if (available.length === 0) return null;

    const priorityOrder: TechId[] = [
        TechId.StarCharts,
        TechId.ScholarCourts,
        TechId.SignalRelay,
        TechId.ScriptLore,
    ];

    for (const techId of priorityOrder) {
        if (available.includes(techId)) return techId;
    }

    const engine = available.find(t => TECHS[t].era === "Engine");
    if (engine) return engine;
    const banner = available.find(t => TECHS[t].era === "Banner");
    if (banner) return banner;
    return available[0];
}
