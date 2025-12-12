
import fs from 'fs';

const logFile = 'docs/analysis/titan-actions.log';
if (!fs.existsSync(logFile)) {
    console.error("Log file not found:", logFile);
    process.exit(1);
}

const content = fs.readFileSync(logFile, 'utf8');
const lines = content.split('\n');

// interface Engagement removed

const engagements = [];
let currentEngagement = null;
let currentTurn = 0;

for (const line of lines) {
    if (line.includes('[TITAN LOG] Turn')) {
        const match = line.match(/Turn (\d+)/);
        if (match) currentTurn = parseInt(match[1]);
    }

    if (line.includes('Target:')) {
        // [TITAN LOG] Target: CityName (HP:20) at dist X
        const match = line.match(/Target: (.+) \(HP:(\d+)\)/);
        if (match) {
            const cityName = match[1];
            const hp = parseInt(match[2]);

            // If new target or same target
            if (!currentEngagement || currentEngagement.city !== cityName) {
                // If previous engagement exists, close it
                if (currentEngagement) {
                    currentEngagement.endTurn = currentTurn;
                    // Infer status: If last HP seen was small (<5) or we switched, assumed captured?
                    // Better heuristic: If we switch targets, did we capture?
                    // We don't verify capture from this log line alone. 
                    // But usually switching means done.
                    if (currentEngagement.endHp <= 5) currentEngagement.status = 'Captured'; // Guess
                    else currentEngagement.status = 'Abandoned';
                    engagements.push(currentEngagement);
                }

                // Start new
                currentEngagement = {
                    city: cityName,
                    startTurn: currentTurn,
                    endTurn: currentTurn,
                    startHp: hp,
                    endHp: hp,
                    status: 'Ongoing',
                    logCount: 1
                };
            } else {
                // Update existing
                currentEngagement.endTurn = currentTurn;
                currentEngagement.endHp = hp;
                currentEngagement.logCount++;
            }
        }
    }
}

// Push last
if (currentEngagement) {
    engagements.push(currentEngagement);
}

console.log("=== TITAN ENGAGEMENT ANALYSIS ===");
console.log(`Total Engagements: ${engagements.length}`);

let totalTurns = 0;
let capturedCount = 0;

engagements.forEach(e => {
    const duration = e.endTurn - e.startTurn + 1; // +1 inclusive? Or delta?
    // If start=118, end=118, duration=1 turn? Yes.
    // Actually if it ends on 118, it took 1 turn.

    // Use heuristic for Capture: End HP <= 0 OR (End HP low and switched)
    const isCapture = e.endHp <= 0 || (e.endHp <= 10 && e.status !== 'Ongoing');
    const status = isCapture ? 'CAPTURED' : 'ABANDONED/ONGOING';

    if (isCapture) {
        totalTurns += duration;
        capturedCount++;
    }

    console.log(`[${e.city}] Start: ${e.startTurn}, End: ${e.endTurn} (${duration} turns). Final HP: ${e.endHp}. Status: ${status}`);
});

if (capturedCount > 0) {
    console.log(`\nAverage Turns Per Capture: ${(totalTurns / capturedCount).toFixed(1)}`);
} else {
    console.log("\nNo Captures detected.");
}
