import { runSimulation } from './dist/sim/ai-autoplay.js';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { cpus } from 'os';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { fileURLToPath } from 'url';

const NUM_SIMS = 200;
const MAP_SIZE = 'Large';
const TURN_LIMIT = 401;
const PLAYER_COUNT = 6;

if (isMainThread) {
    const outputDir = process.argv[2] || '/tmp/sim-results';
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

    const resultsFile = `${outputDir}/results.jsonl`;
    writeFileSync(resultsFile, ''); // Clear

    const numCPUs = cpus().length;
    const workerCount = Math.max(1, Math.floor(numCPUs * 0.8));

    // Build task queue
    const tasks = [];
    for (let i = 0; i < NUM_SIMS; i++) {
        tasks.push({ seed: 1001 + i });
    }

    let completed = 0;
    const allResults = [];
    const startTime = performance.now();
    let activeWorkers = 0;

    console.log(`Running ${NUM_SIMS} Large-map sims with ${workerCount} parallel workers...`);

    const startWorker = () => {
        if (tasks.length === 0) return;
        const task = tasks.shift();
        activeWorkers++;

        const worker = new Worker(fileURLToPath(import.meta.url), { workerData: task });

        worker.on('message', (result) => {
            allResults.push(JSON.stringify(result));
            completed++;
            const elapsed = ((performance.now() - startTime) / 1000).toFixed(0);
            const pct = Math.round(completed / NUM_SIMS * 100);
            if (completed % 10 === 0 || completed === NUM_SIMS) {
                console.log(`  [${completed}/${NUM_SIMS}] ${pct}% complete (${elapsed}s elapsed)`);
            }
        });

        worker.on('exit', () => {
            activeWorkers--;
            if (tasks.length > 0) {
                startWorker();
            } else if (activeWorkers === 0) {
                // All done - write results
                writeFileSync(resultsFile, allResults.join('\n') + '\n');
                const totalTime = ((performance.now() - startTime) / 1000).toFixed(0);
                console.log(`\nDone! ${allResults.length} simulations in ${totalTime}s`);
                console.log(`Results: ${resultsFile}`);
            }
        });

        worker.on('error', (err) => {
            console.error(`Worker error:`, err.message);
        });
    };

    for (let i = 0; i < workerCount; i++) startWorker();

} else {
    // Worker thread
    const { seed } = workerData;
    try {
        const result = runSimulation(seed, MAP_SIZE, TURN_LIMIT, false, PLAYER_COUNT);
        parentPort.postMessage({
            seed: result.seed,
            mapSize: result.mapSize,
            turnReached: result.turnReached,
            winTurn: result.winTurn,
            winner: result.winner,
            victoryType: result.victoryType,
        });
    } catch (err) {
        parentPort.postMessage({ seed, error: err.message, victoryType: 'Error' });
    }
}
