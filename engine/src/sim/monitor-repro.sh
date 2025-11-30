#!/bin/bash

export SIM_SEEDS_COUNT=1
export SIM_SEED_OVERRIDE=101001
LOG_FILE="/tmp/repro-sim.log"
RESULTS_FILE="/tmp/comprehensive-simulation-results.json"

# Start simulation in background
echo "Starting REPRODUCTION simulation for Seed 101001..."

# Cleanup any existing instances
pkill -f "node engine/dist/sim/parallel-analysis.js" 2>/dev/null

cd /Users/ejuchheim/Projects/Simple-Civ/SimpleCiv

# Trap interrupts to kill the background process
trap "kill \$SIM_PID 2>/dev/null; exit" INT TERM EXIT

# Compile the TS file first (just in case)
echo "Compiling parallel-analysis.ts..."
npx tsc -p engine/tsconfig.json

# Fix pathing issue (tsc creates nested structure)
if [ -f "engine/dist/sim/sim/parallel-analysis.js" ]; then
    mv engine/dist/sim/sim/parallel-analysis.js engine/dist/sim/parallel-analysis.js
fi

# Run the compiled JS
node engine/dist/sim/parallel-analysis.js > "$LOG_FILE" 2>&1 &
SIM_PID=$!
echo "Simulation started with PID: $SIM_PID"
echo "Logs: $LOG_FILE"
echo ""

# Monitor loop - update every 5 seconds
while kill -0 "$SIM_PID" 2>/dev/null; do
    sleep 5
    
    # Get current progress
    # Look for the last progress line
    PROGRESS_LINE=$(grep "Progress:" "$LOG_FILE" 2>/dev/null | tail -1)
    
    if [ ! -z "$PROGRESS_LINE" ]; then
        echo "[$(date +%H:%M:%S)] $PROGRESS_LINE"
    else
        echo "[$(date +%H:%M:%S)] Status: Starting up..."
    fi
    
    # Check if complete
    if grep -q "ALL SIMULATIONS COMPLETE" "$LOG_FILE" 2>/dev/null; then
        echo ""
        echo "✓ Simulation complete detected!"
        break
    fi
done

# Wait for process to fully exit
wait "$SIM_PID" 2>/dev/null

echo ""
echo "=========================================="
echo "Repro Sim Complete"
echo "=========================================="
