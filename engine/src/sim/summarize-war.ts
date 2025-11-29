import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync('./war-results-tuned.json', 'utf-8'));

data.forEach((sim: any, index: number) => {
    console.log(`\nSimulation ${index + 1} (Winner: ${sim.winner?.civ || 'None'})`);

    const events = sim.events;
    const wars = events.filter((e: any) => e.type === 'WarDeclaration');

    if (wars.length === 0) {
        console.log('  No wars declared.');
        return;
    }

    wars.forEach((war: any) => {
        console.log(`  War: ${war.initiator} vs ${war.target} (Turn ${war.turn})`);
        console.log(`    Power: ${war.initiator} (${war.initiatorPower.toFixed(1)}) vs ${war.target} (${war.targetPower.toFixed(1)})`);

        // Find events during this war
        const warEnd = events.find((e: any) =>
            (e.type === 'PeaceTreaty' && ((e.civ1 === war.initiator && e.civ2 === war.target) || (e.civ1 === war.target && e.civ2 === war.initiator))) ||
            (e.type === 'Elimination' && (e.eliminated === war.initiator || e.eliminated === war.target))
        );

        const endTurn = warEnd ? warEnd.turn : sim.turnReached;

        const captures = events.filter((e: any) =>
            e.type === 'CityCapture' &&
            e.turn >= war.turn &&
            e.turn <= endTurn &&
            ((e.from === war.initiator && e.to === war.target) || (e.from === war.target && e.to === war.initiator))
        );

        console.log(`    Duration: ${endTurn - war.turn} turns`);
        console.log(`    City Captures: ${captures.length}`);
        captures.forEach((c: any) => {
            console.log(`      Turn ${c.turn}: ${c.from} -> ${c.to} (Capital: ${c.isCapital})`);
        });

        // Check for stalling
        const actions = events.filter((e: any) =>
            e.type === 'WarAction' &&
            e.turn >= war.turn &&
            e.turn <= endTurn &&
            (e.civ === war.initiator || e.civ === war.target)
        );

        // Sample a few actions
        if (actions.length > 0) {
            console.log(`    Unit Activity Sample:`);
            // Log first, middle, last
            [actions[0], actions[Math.floor(actions.length / 2)], actions[actions.length - 1]].forEach(a => {
                if (a) console.log(`      Turn ${a.turn} (${a.civ}): ${a.details}`);
            });
        }

        if (warEnd) {
            console.log(`    Ended by: ${warEnd.type} (Turn ${warEnd.turn})`);
        } else {
            console.log(`    Ongoing at simulation end.`);
        }
    });
});
