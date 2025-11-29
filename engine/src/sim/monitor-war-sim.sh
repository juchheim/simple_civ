#!/bin/bash

LOG_FILE="/tmp/sim-war.log"
RESULTS_FILE="/tmp/war-simulation-results.json"

# Start simulation in background
echo "Starting simulation..."
cd /Users/ejuchheim/Projects/Simple-Civ/SimpleCiv
npx tsx engine/src/sim/war-analysis.ts > "$LOG_FILE" 2>&1 &
SIM_PID=$!
echo "Simulation started with PID: $SIM_PID"
echo ""

# Monitor loop - update every minute
while kill -0 "$SIM_PID" 2>/dev/null; do
    sleep 5
    
    # Get current progress
    CURRENT=$(grep "\[[0-9]*/1\]" "$LOG_FILE" 2>/dev/null | tail -1 | grep -o "\[[0-9]*/1\]" | grep -o "[0-9]*" | head -1 || echo "0")
    
    if [ "$CURRENT" != "0" ]; then
        echo "[$(date +%H:%M:%S)] Status: $CURRENT/1 simulations"
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
echo "✓ Complete! Results saved to $RESULTS_FILE"
echo "=========================================="
