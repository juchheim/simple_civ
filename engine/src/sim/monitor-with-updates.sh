#!/bin/bash

LOG_FILE="/tmp/sim-progress-v097.log"
RESULTS_FILE="/tmp/comprehensive-simulation-results.json"

# Start simulation in background
echo "Starting simulation..."
cd /Users/ejuchheim/Projects/Simple-Civ/SimpleCiv
node engine/dist/sim/comprehensive-analysis.js > "$LOG_FILE" 2>&1 &
SIM_PID=$!
echo "Simulation started with PID: $SIM_PID"
echo ""

# Monitor loop - update every minute
while kill -0 "$SIM_PID" 2>/dev/null; do
    sleep 60
    
    # Get current progress
    CURRENT=$(grep "\[[0-9]*/50\]" "$LOG_FILE" 2>/dev/null | tail -1 | grep -o "\[[0-9]*/50\]" | grep -o "[0-9]*" | head -1 || echo "0")
    COMPLETED=$(grep -c "✓ Completed in" "$LOG_FILE" 2>/dev/null || echo "0")
    
    if [ "$CURRENT" != "0" ]; then
        PERCENT=$((CURRENT * 100 / 50))
        echo "[$(date +%H:%M:%S)] Status: $CURRENT/50 simulations ($PERCENT%) - $COMPLETED completed"
    else
        echo "[$(date +%H:%M:%S)] Status: Starting up... ($COMPLETED completed)"
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
echo "Running city-state analysis..."
node engine/src/sim/analyze-city-states.mjs

echo ""
echo "Copying reports..."
cp /tmp/enhanced-analysis-report.md docs/analysis/ 2>/dev/null
cp /tmp/comprehensive-analysis-report.md docs/analysis/ 2>/dev/null
cp /tmp/city-state-report.md docs/analysis/ 2>/dev/null

echo ""
echo "=========================================="
echo "✓ Complete! Reports saved to docs/analysis/"
echo "=========================================="
