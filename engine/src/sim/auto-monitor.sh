#!/bin/bash

LOG_FILE="/tmp/sim-progress-v097.log"
RESULTS_FILE="/tmp/comprehensive-simulation-results.json"
PID_FILE="/tmp/sim-pid.txt"

echo "Auto-monitoring simulations for completion..."
echo "Will automatically run analysis when complete."
echo ""

while true; do
    # Check if simulation process is still running
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ! ps -p "$PID" > /dev/null 2>&1; then
            # Process ended, check if it completed successfully
            if grep -q "ALL SIMULATIONS COMPLETE\|Results written" "$LOG_FILE" 2>/dev/null; then
                echo ""
                echo "[$(date +%H:%M:%S)] ✓ Simulations completed!"
                break
            else
                echo "[$(date +%H:%M:%S)] Process ended but no completion message found. Checking results file..."
                sleep 2
                if [ -f "$RESULTS_FILE" ]; then
                    # Check if file was recently updated (within last 10 seconds)
                    FILE_AGE=$(($(date +%s) - $(stat -f "%m" "$RESULTS_FILE" 2>/dev/null || echo "0")))
                    if [ "$FILE_AGE" -lt 10 ]; then
                        echo "[$(date +%H:%M:%S)] Results file recently updated, assuming complete."
                        break
                    fi
                fi
            fi
        fi
    fi
    
    # Check log for completion message
    if grep -q "ALL SIMULATIONS COMPLETE\|Results written" "$LOG_FILE" 2>/dev/null; then
        echo ""
        echo "[$(date +%H:%M:%S)] ✓ Completion detected in log!"
        break
    fi
    
    # Show progress every 30 seconds
    sleep 30
    COMPLETED=$(grep -c "✓ Completed in" "$LOG_FILE" 2>/dev/null || echo "0")
    echo "[$(date +%H:%M:%S)] Progress: $COMPLETED/50 simulations"
done

echo ""
echo "[$(date +%H:%M:%S)] Running analysis..."
echo ""

cd /Users/ejuchheim/Projects/Simple-Civ/SimpleCiv

# Run both analysis scripts
node engine/src/sim/analyze-comprehensive.mjs
node engine/src/sim/analyze-enhanced.mjs

# Copy reports
cp /tmp/enhanced-analysis-report.md docs/analysis/enhanced-analysis-report.md
cp /tmp/comprehensive-analysis-report.md docs/analysis/comprehensive-analysis-report.md

echo ""
echo "[$(date +%H:%M:%S)] ✓ Analysis complete! Reports saved to docs/analysis/"
echo ""
echo "Files updated:"
echo "  - docs/analysis/comprehensive-analysis-report.md"
echo "  - docs/analysis/enhanced-analysis-report.md"
echo ""

