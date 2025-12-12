#!/bin/bash

# Support both command line arg and SIM_SEEDS_COUNT env var
# Priority: $1 > SIM_SEEDS_COUNT > default (1)
COUNT=${1:-${SIM_SEEDS_COUNT:-1}}
TOTAL=$((COUNT * 5))

LOG_FILE="/tmp/sim-progress-flexible.log"
RESULTS_FILE="/tmp/comprehensive-simulation-results.json"

echo "=========================================="
echo "Starting simulation run"
echo "Configuration: $COUNT sims per map size"
echo "Total simulations: $TOTAL"
echo "=========================================="
echo ""

# Start simulation in background using parallel analysis (90% of CPU cores)
cd /Users/ejuchheim/Projects/Simple-Civ/SimpleCiv
# Enable DEBUG_AI_LOGS=true for Titan logging
DEBUG_AI_LOGS=false SIM_SEEDS_COUNT=$COUNT node engine/dist/sim/parallel-analysis.js > "$LOG_FILE" 2>&1 &
SIM_PID=$!
echo "Simulation started with PID: $SIM_PID (parallel - 90% CPUs)"
echo "Logging to: $LOG_FILE"
echo ""

# Monitor loop - update every minute
while kill -0 "$SIM_PID" 2>/dev/null; do
    sleep 10 # Update more frequently (10s) for better feedback
    
    # Get current progress from completed count (parallel-analysis uses "Completed" log pattern)
    COMPLETED=$(grep -c "Completed" "$LOG_FILE" 2>/dev/null | tr -d '\n' || echo "0")
    # Sanitize to ensure it's a number
    COMPLETED=${COMPLETED:-0}
    
    if [ "$COMPLETED" -gt 0 ] 2>/dev/null; then
        PERCENT=$((COMPLETED * 100 / TOTAL))
        echo "[$(date +%H:%M:%S)] Status: $COMPLETED/$TOTAL simulations ($PERCENT%)"
    else
        echo "[$(date +%H:%M:%S)] Status: Starting up..."
    fi
    
    # Check if complete
    if grep -q "ALL SIMULATIONS COMPLETE\|Results written" "$LOG_FILE" 2>/dev/null; then
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
echo "Running AetherianVanguard analysis..."
node engine/src/sim/analyze-aetherian.mjs

echo ""
echo "Extracting Titan Action Logs..."
titan_log="/tmp/titan-actions.log"
grep "TITAN LOG" "$LOG_FILE" > "$titan_log"
# If empty, add a note
if [ ! -s "$titan_log" ]; then
    echo "No Titan logs found." > "$titan_log"
fi

echo "Copying reports..."
cp /tmp/enhanced-analysis-report.md docs/analysis/ 2>/dev/null
cp /tmp/comprehensive-analysis-report.md docs/analysis/ 2>/dev/null
cp /tmp/aetherian-analysis-report.md docs/analysis/ 2>/dev/null
cp "$titan_log" docs/analysis/titan-actions.log 2>/dev/null

echo ""
echo "=========================================="
echo "✓ Complete! Reports saved to docs/analysis/"
echo "✓ Titan logs saved to docs/analysis/titan-actions.log"
echo "=========================================="
