#!/bin/bash

LOG_FILE="/tmp/parallel-sim.log"
RESULTS_FILE="/tmp/comprehensive-simulation-results.json"
export SIM_SEEDS_COUNT=${SIM_SEEDS_COUNT:-100}

# Start simulation in background
echo "Starting PARALLEL simulation..."

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

# Monitor loop - update every 10 seconds (faster updates for parallel)
while kill -0 "$SIM_PID" 2>/dev/null; do
    sleep 10
    
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

# Wait a moment for file to be fully written
sleep 2

# Verify results file exists
if [ ! -f "$RESULTS_FILE" ]; then
    echo "Error: Results file not found!"
    exit 1
fi

echo ""
echo "=========================================="
echo "Running analysis..."
echo "=========================================="
echo ""

# Run analysis scripts
cd /Users/ejuchheim/Projects/Simple-Civ/SimpleCiv

echo "Running comprehensive analysis..."
node engine/src/sim/analyze-comprehensive.mjs

echo ""
echo "Running enhanced analysis..."
node engine/src/sim/analyze-enhanced.mjs

echo ""
echo "Copying reports..."
cp /tmp/enhanced-analysis-report.md docs/analysis/ 2>/dev/null
cp /tmp/comprehensive-analysis-report.md docs/analysis/ 2>/dev/null

echo ""
echo "=========================================="
echo "✓ Complete! Reports saved to docs/analysis/"
echo "=========================================="
