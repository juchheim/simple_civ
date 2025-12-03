import { readFileSync } from 'fs';

const results = JSON.parse(readFileSync('/tmp/comprehensive-simulation-results.json', 'utf8'));

console.log(`Analyzing ${results.length} simulations...`);

const titanGames = results.filter(sim =>
    sim.events.some(e => e.type === "TitanSpawn")
);

console.log(`Found ${titanGames.length} games with a Titan.`);

titanGames.forEach(sim => {
    const spawnEvent = sim.events.find(e => e.type === "TitanSpawn");
    const spawnTurn = spawnEvent.turn;
    const aetherianId = spawnEvent.owner;
    const aetherianCiv = sim.participatingCivs.find(c => c.id === aetherianId);

    const isWinner = sim.winner?.id === aetherianId;
    const victoryType = sim.victoryType;
    const winnerName = sim.winner?.civ || "None";

    const deathEvent = sim.events.find(e => e.type === "TitanDeath" && e.owner === aetherianId);
    const isDead = !!deathEvent;

    // Count captures by Aetherian AFTER spawn
    const captures = sim.events.filter(e =>
        e.type === "CityCapture" &&
        e.to === aetherianId &&
        e.turn > spawnTurn
    ).length;

    const totalTurns = sim.turnReached;
    const turnsActive = (isDead ? deathEvent.turn : totalTurns) - spawnTurn;

    console.log(`\nGame Seed: ${sim.seed} (${sim.mapSize})`);
    console.log(`- Titan Spawned: Turn ${spawnTurn}`);
    console.log(`- Game Ended: Turn ${totalTurns} (Winner: ${winnerName}, Type: ${victoryType})`);
    console.log(`- Result: ${isWinner ? "WON" : "LOST"}`);
    console.log(`- Titan Status: ${isDead ? `DIED on turn ${deathEvent.turn}` : "ALIVE"}`);
    console.log(`- Turns Active: ${turnsActive}`);
    console.log(`- Cities Captured after Spawn: ${captures}`);

    if (!isWinner) {
        // Why did they lose?
        if (victoryType === "Progress") {
            console.log(`  -> Lost to Science Race.`);
        } else if (victoryType === "Conquest") {
            console.log(`  -> Lost to another Conquest.`);
        } else {
            console.log(`  -> Stalled / Turn Limit.`);
        }

        // Check remaining enemies
        const enemies = sim.finalState.civs.filter(c => c.id !== aetherianId && !c.isEliminated);
        console.log(`  -> Remaining Enemies: ${enemies.length} (${enemies.map(c => c.civName).join(", ")})`);
    }
});
