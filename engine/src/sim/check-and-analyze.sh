#!/bin/bash

LOG_FILE="/tmp/sim-progress-v097.log"
RESULTS_FILE="/tmp/comprehensive-simulation-results.json"

while true; do
    sleep 30
    
    # Check if simulation is complete
    if grep -q "ALL SIMULATIONS COMPLETE\|Results written" "$LOG_FILE" 2>/dev/null; then
        echo ""
        echo "=========================================="
        echo "✓ Simulation Complete! Running analysis..."
        echo "=========================================="
        echo ""
        
        # Wait a moment for file to be fully written
        sleep 2
        
        # Verify results file exists
        if [ ! -f "$RESULTS_FILE" ]; then
            echo "Error: Results file not found!"
            exit 1
        fi
        
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
        echo "✓ Analysis Complete!"
        echo "=========================================="
        echo ""
        echo "Reports saved to docs/analysis/"
        
        exit 0
    fi
    
    # Show progress
    COMPLETED=$(grep -c "✓ Completed in" "$LOG_FILE" 2>/dev/null || echo "0")
    CURRENT=$(grep "\[[0-9]*/50\]" "$LOG_FILE" | tail -1 | grep -o "\[[0-9]*/50\]" | grep -o "[0-9]*" | head -1 || echo "0")
    
    if [ "$CURRENT" != "0" ]; then
        echo "[$(date +%H:%M:%S)] Progress: $CURRENT/50 simulations ($COMPLETED completed)"
    fi
    
    # Check if process is still running
    if [ $(ps aux | grep -c "[n]ode.*comprehensive-analysis") -eq 0 ]; then
        echo ""
        echo "Process ended. Checking completion status..."
        if grep -q "Results written" "$LOG_FILE" 2>/dev/null; then
            echo "✓ Simulation completed successfully!"
            # Trigger analysis
            continue
        else
            echo "⚠ Process ended but may not have completed properly"
            echo "Last 5 lines of log:"
            tail -5 "$LOG_FILE"
            exit 1
        fi
    fi
done
