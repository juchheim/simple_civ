#!/bin/bash

# Support both command line arg and SIM_SEEDS_COUNT env var
# Priority: $1 > SIM_SEEDS_COUNT > default (1)
COUNT=${1:-${SIM_SEEDS_COUNT:-1}}
TOTAL=$((COUNT * 5))

LOG_FILE="/tmp/sim-progress-flexible.log"
RESULTS_FILE="/tmp/comprehensive-simulation-results.json"
PROJECT_ROOT="/Users/ejuchheim/Projects/Simple-Civ/SimpleCiv"
REPORTS_DIR="$PROJECT_ROOT/docs/analysis"

run_analysis() {
    local label="$1"
    local script="$2"
    local required="$3"

    echo ""
    echo "Running $label analysis..."
    node "$script"
    local exit_code=$?
    if [ "$exit_code" -ne 0 ]; then
        if [ "$required" = "required" ]; then
            echo "Error: $label analysis failed (exit $exit_code)."
            exit 1
        fi
        echo "Warning: $label analysis failed (exit $exit_code). Continuing."
    fi
}

copy_report() {
    local src="$1"
    local dst="$2"
    local required="$3"

    if [ ! -f "$src" ]; then
        if [ "$required" = "required" ]; then
            echo "Error: Missing required report: $src"
            exit 1
        fi
        echo "Warning: Optional report not found: $src"
        return
    fi

    cp "$src" "$dst"
    local exit_code=$?
    if [ "$exit_code" -ne 0 ]; then
        if [ "$required" = "required" ]; then
            echo "Error: Failed to copy required report: $src -> $dst"
            exit 1
        fi
        echo "Warning: Failed to copy optional report: $src -> $dst"
    fi
}

echo "=========================================="
echo "Starting simulation run"
echo "Configuration: $COUNT sims per map size"
echo "Total simulations: $TOTAL"
echo "=========================================="
echo ""

cd "$PROJECT_ROOT"

# Ensure engine build is up to date (parallel-analysis runs from engine/dist)
echo "Compiling engine..."
npx tsc -p engine/tsconfig.json
if [ $? -ne 0 ]; then
    echo "Engine build failed. Aborting simulation run."
    exit 1
fi
echo ""

# Start simulation in background using parallel analysis (90% of CPU cores)
# Enable DEBUG_AI_LOGS=true for Titan logging
# Enable DEBUG_AI_LOGS=true for Titan logging
# v6.0: Pass ENABLE_AETHER_ERA if set in environment (defaulting to existing env or false if unset, though constants.ts handles default)
DEBUG_AI_LOGS=false SIM_QUIET=true SIM_SEEDS_COUNT=$COUNT ENABLE_AETHER_ERA=${ENABLE_AETHER_ERA:-test} node engine/dist/sim/parallel-analysis.js > "$LOG_FILE" 2>&1 &
SIM_PID=$!
echo "Simulation started with PID: $SIM_PID (parallel - 90% CPUs)"
echo "Logging to: $LOG_FILE"
echo ""

# Monitor loop - update every minute
while kill -0 "$SIM_PID" 2>/dev/null; do
    sleep 10 # Update more frequently (10s) for better feedback
    
    # Get current progress from completed count (parallel-analysis uses "Completed" log pattern)
    COMPLETED=$(grep -c "Completed [A-Za-z]* (Seed" "$LOG_FILE" 2>/dev/null | tr -d '\n' || echo "0")
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
cd "$PROJECT_ROOT"
mkdir -p "$REPORTS_DIR"

run_analysis "comprehensive" "engine/src/sim/analyze-comprehensive.mjs" "optional"
run_analysis "enhanced" "engine/src/sim/analyze-enhanced.mjs" "optional"
run_analysis "AetherianVanguard" "engine/src/sim/analyze-aetherian.mjs" "optional"
run_analysis "ScholarKingdoms" "engine/src/sim/analyze-scholar.mjs" "optional"
run_analysis "StarborneSeekers" "engine/src/sim/analyze-starborne.mjs" "optional"
run_analysis "Aether Era" "engine/src/sim/analyze-aether.mjs" "optional"
run_analysis "Tech Path" "engine/src/sim/analyze-tech-paths.mjs" "optional"
run_analysis "Economy" "engine/src/sim/analyze-economy.mjs" "required"

echo ""
echo "Extracting Titan Action Logs..."
titan_log="/tmp/titan-actions.log"
grep "TITAN LOG" "$LOG_FILE" > "$titan_log"
# If empty, add a note
if [ ! -s "$titan_log" ]; then
    echo "No Titan logs found." > "$titan_log"
fi

echo "Copying reports..."
copy_report "/tmp/enhanced-analysis-report.md" "$REPORTS_DIR/enhanced-analysis-report.md" "optional"
copy_report "/tmp/comprehensive-analysis-report.md" "$REPORTS_DIR/comprehensive-analysis-report.md" "optional"
copy_report "/tmp/aetherian-analysis-report.md" "$REPORTS_DIR/aetherian-analysis-report.md" "optional"
copy_report "/tmp/scholar-kingdoms-analysis.md" "$REPORTS_DIR/scholar-kingdoms-analysis.md" "optional"
copy_report "/tmp/starborne-seekers-analysis.md" "$REPORTS_DIR/starborne-seekers-analysis.md" "optional"
copy_report "/tmp/aether-analysis-report.md" "$REPORTS_DIR/aether-analysis-report.md" "optional"
copy_report "/tmp/tech-path-analysis-report.md" "$REPORTS_DIR/tech-path-analysis-report.md" "optional"
copy_report "/tmp/economic-balance-report.md" "$REPORTS_DIR/economic-balance-report.md" "required"
copy_report "$titan_log" "$REPORTS_DIR/titan-actions.log" "optional"

echo ""
echo "=========================================="
echo "✓ Complete! Reports saved to docs/analysis/"
echo "✓ Economy report saved to docs/analysis/economic-balance-report.md"
echo "✓ Titan logs saved to docs/analysis/titan-actions.log"
echo "=========================================="
