#!/bin/bash

# Monitor simulation and run analysis when complete

LOG_FILE="/tmp/sim-progress-v097.log"
PID_FILE="/tmp/sim-pid.txt"
RESULTS_FILE="/tmp/comprehensive-simulation-results.json"

echo "Monitoring simulation progress..."

# Wait for process to start
sleep 2

# Check if PID file exists
if [ ! -f "$PID_FILE" ]; then
    echo "Error: PID file not found. Simulation may not have started."
    exit 1
fi

PID=$(cat "$PID_FILE")

# Monitor until process completes
while kill -0 "$PID" 2>/dev/null; do
    sleep 30
    if [ -f "$LOG_FILE" ]; then
        COMPLETED=$(grep -c "Completed simulation" "$LOG_FILE" 2>/dev/null || echo "0")
        echo "[$(date +%H:%M:%S)] Progress: $COMPLETED/50 simulations"
        
        # Check if it's actually done (file written)
        if grep -q "Results written" "$LOG_FILE" 2>/dev/null; then
            echo "Simulation appears complete!"
            break
        fi
    fi
done

# Wait a moment for file to be fully written
sleep 2

# Verify results file exists and is recent
if [ ! -f "$RESULTS_FILE" ]; then
    echo "Error: Results file not found!"
    exit 1
fi

echo ""
echo "=========================================="
echo "Simulation Complete! Running analysis..."
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
echo "Analysis Complete!"
echo "=========================================="
echo ""
echo "Reports saved to docs/analysis/"
