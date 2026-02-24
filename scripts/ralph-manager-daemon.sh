#!/bin/bash
# Ralph Manager Daemon
# Monitors and manages Ralph loop processes
# Kills existing loops if script changes, checks every 5 minutes

set -e

# Configuration
RALPH_MANAGER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$RALPH_MANAGER_DIR/.ralph-manager.pid"
LOG_FILE="$RALPH_MANAGER_DIR/ralph-manager.log"
STATE_FILE="$RALPH_MANAGER_DIR/.ralph-manager-state.json"
CHECK_INTERVAL=300  # 5 minutes

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    local LEVEL="$1"
    local MESSAGE="$2"
    local TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$TIMESTAMP] [$LEVEL] $MESSAGE" >> "$LOG_FILE"
    
    case $LEVEL in
        INFO) echo -e "${BLUE}[INFO]${NC} $MESSAGE" ;;
        SUCCESS) echo -e "${GREEN}[SUCCESS]${NC} $MESSAGE" ;;
        WARNING) echo -e "${YELLOW}[WARNING]${NC} $MESSAGE" ;;
        ERROR) echo -e "${RED}[ERROR]${NC} $MESSAGE" ;;
    esac
}

# Check if already running
check_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            log ERROR "Ralph Manager is already running (PID: $PID)"
            exit 1
        else
            log WARNING "Stale PID file found, removing..."
            rm -f "$PID_FILE"
        fi
    fi
}

# Save PID
save_pid() {
    echo $$ > "$PID_FILE"
    trap 'cleanup' EXIT INT TERM
}

# Cleanup on exit
cleanup() {
    log INFO "Shutting down Ralph Manager..."
    rm -f "$PID_FILE"
    
    # Don't kill managed loops on manager shutdown
    log INFO "Ralph Manager stopped. Managed loops continue running."
    exit 0
}

# Get script checksum
get_script_checksum() {
    local SCRIPT="$1"
    if [ -f "$SCRIPT" ]; then
        md5sum "$SCRIPT" | cut -d' ' -f1
    else
        echo ""
    fi
}

# Find all active Ralph loops
find_ralph_loops() {
    # Find all ralph-loop.sh processes
    pgrep -f "ralph-loop.sh" 2>/dev/null || true
}

# Get loop info by PID
get_loop_info() {
    local PID="$1"
    local CMDLINE=$(cat /proc/$PID/cmdline 2>/dev/null | tr '\0' ' ')
    local SCRIPT_PATH=$(echo "$CMDLINE" | awk '{print $2}')
    local WORK_DIR=$(dirname "$SCRIPT_PATH")
    
    echo "$PID|$SCRIPT_PATH|$WORK_DIR"
}

# Check if script has changed
script_changed() {
    local SCRIPT="$1"
    local STORED_CHECKSUM="$2"
    local CURRENT_CHECKSUM=$(get_script_checksum "$SCRIPT")
    
    if [ "$STORED_CHECKSUM" != "$CURRENT_CHECKSUM" ]; then
        return 0  # Changed
    fi
    return 1  # Not changed
}

# Kill a loop process
kill_loop() {
    local PID="$1"
    local SCRIPT="$2"
    
    if ps -p "$PID" > /dev/null 2>&1; then
        log INFO "Stopping loop (PID: $PID, Script: $SCRIPT)"
        kill -TERM "$PID" 2>/dev/null || true
        
        # Wait for graceful shutdown
        local WAIT=0
        while ps -p "$PID" > /dev/null 2>&1 && [ $WAIT -lt 10 ]; do
            sleep 1
            WAIT=$((WAIT + 1))
        done
        
        # Force kill if still running
        if ps -p "$PID" > /dev/null 2>&1; then
            log WARNING "Force killing loop (PID: $PID)"
            kill -9 "$PID" 2>/dev/null || true
        fi
        
        log SUCCESS "Loop stopped (PID: $PID)"
        return 0
    fi
    return 1
}

# Start a loop
start_loop() {
    local SCRIPT="$1"
    local WORK_DIR="$2"
    
    if [ -x "$SCRIPT" ]; then
        log INFO "Starting loop: $SCRIPT"
        cd "$WORK_DIR"
        nohup "$SCRIPT" >> "$WORK_DIR/ralph-loop.log" 2>&1 &
        local NEW_PID=$!
        log SUCCESS "Loop started (PID: $NEW_PID)"
        echo "$NEW_PID"
    else
        log ERROR "Script not executable: $SCRIPT"
        echo ""
    fi
}

# Load state
load_state() {
    if [ -f "$STATE_FILE" ]; then
        cat "$STATE_FILE"
    else
        echo "{}"
    fi
}

# Save state
save_state() {
    local STATE="$1"
    echo "$STATE" > "$STATE_FILE"
}

# Manage loops - main logic
manage_loops() {
    log INFO "Checking Ralph loops..."
    
    local STATE=$(load_state)
    local MANAGED_LOOPS=$(echo "$STATE" | jq -r '.loops // {}')
    
    # Check existing loops for script changes
    for PID in $(find_ralph_loops); do
        local LOOP_INFO=$(get_loop_info "$PID")
        local SCRIPT_PATH=$(echo "$LOOP_INFO" | cut -d'|' -f2)
        local WORK_DIR=$(echo "$LOOP_INFO" | cut -d'|' -f3)
        
        if [ -n "$SCRIPT_PATH" ] && [ -f "$SCRIPT_PATH" ]; then
            local CHECKSUM_KEY=$(echo "$SCRIPT_PATH" | md5sum | cut -d' ' -f1)
            local STORED_CHECKSUM=$(echo "$MANAGED_LOOPS" | jq -r --arg key "$CHECKSUM_KEY" '.[$key].checksum // ""')
            
            if script_changed "$SCRIPT_PATH" "$STORED_CHECKSUM"; then
                log INFO "Script changed detected: $SCRIPT_PATH"
                
                # Kill the existing loop
                kill_loop "$PID" "$SCRIPT_PATH"
                
                # Update state
                local CURRENT_CHECKSUM=$(get_script_checksum "$SCRIPT_PATH")
                MANAGED_LOOPS=$(echo "$MANAGED_LOOPS" | jq \
                    --arg key "$CHECKSUM_KEY" \
                    --arg checksum "$CURRENT_CHECKSUM" \
                    --arg pid "" \
                    '.[$key] = {"checksum": $checksum, "pid": $pid, "script": $key}')
                
                # Restart the loop
                local NEW_PID=$(start_loop "$SCRIPT_PATH" "$WORK_DIR")
                if [ -n "$NEW_PID" ]; then
                    MANAGED_LOOPS=$(echo "$MANAGED_LOOPS" | jq \
                        --arg key "$CHECKSUM_KEY" \
                        --arg pid "$NEW_PID" \
                        '.[$key].pid = $pid')
                fi
            else
                log INFO "Loop running unchanged: $SCRIPT_PATH (PID: $PID)"
            fi
        fi
    done
    
    # Save state
    STATE=$(echo "$STATE" | jq --argjson loops "$MANAGED_LOOPS" '.loops = $loops')
    save_state "$STATE"
    
    log SUCCESS "Loop check complete"
}

# Start a new managed loop
start_managed_loop() {
    local SCRIPT="$1"
    local WORK_DIR="$2"
    
    if [ ! -f "$SCRIPT" ]; then
        log ERROR "Script not found: $SCRIPT"
        return 1
    fi
    
    # Check if already running
    for PID in $(find_ralph_loops); do
        local LOOP_INFO=$(get_loop_info "$PID")
        local LOOP_SCRIPT=$(echo "$LOOP_INFO" | cut -d'|' -f2)
        if [ "$LOOP_SCRIPT" = "$SCRIPT" ]; then
            log WARNING "Loop already running: $SCRIPT (PID: $PID)"
            return 0
        fi
    done
    
    # Start the loop
    local NEW_PID=$(start_loop "$SCRIPT" "$WORK_DIR")
    if [ -n "$NEW_PID" ]; then
        local STATE=$(load_state)
        local CHECKSUM_KEY=$(echo "$SCRIPT" | md5sum | cut -d' ' -f1)
        local CHECKSUM=$(get_script_checksum "$SCRIPT")
        
        STATE=$(echo "$STATE" | jq \
            --arg key "$CHECKSUM_KEY" \
            --arg checksum "$CHECKSUM" \
            --arg pid "$NEW_PID" \
            --arg script "$SCRIPT" \
            '.loops[$key] = {"checksum": $checksum, "pid": $pid, "script": $script}')
        
        save_state "$STATE"
        log SUCCESS "Loop managed: $SCRIPT (PID: $NEW_PID)"
        return 0
    fi
    
    return 1
}

# Stop a managed loop
stop_managed_loop() {
    local SCRIPT="$1"
    
    for PID in $(find_ralph_loops); do
        local LOOP_INFO=$(get_loop_info "$PID")
        local LOOP_SCRIPT=$(echo "$LOOP_INFO" | cut -d'|' -f2)
        if [ "$LOOP_SCRIPT" = "$SCRIPT" ]; then
            kill_loop "$PID" "$SCRIPT"
            
            # Remove from state
            local STATE=$(load_state)
            local CHECKSUM_KEY=$(echo "$SCRIPT" | md5sum | cut -d' ' -f1)
            STATE=$(echo "$STATE" | jq --arg key "$CHECKSUM_KEY" 'del(.loops[$key])')
            save_state "$STATE"
            
            return 0
        fi
    done
    
    log WARNING "Loop not found: $SCRIPT"
    return 1
}

# List managed loops
list_loops() {
    local STATE=$(load_state)
    local LOOPS=$(echo "$STATE" | jq -r '.loops // {}')
    
    echo ""
    echo "Managed Ralph Loops:"
    echo "═══════════════════════════════════════════════════════"
    
    echo "$LOOPS" | jq -r 'to_entries[] | "PID: \(.value.pid) | Script: \(.value.script)"' 2>/dev/null || echo "No managed loops"
    
    echo ""
    echo "Active Ralph Processes:"
    echo "═══════════════════════════════════════════════════════"
    
    for PID in $(find_ralph_loops); do
        local LOOP_INFO=$(get_loop_info "$PID")
        local SCRIPT_PATH=$(echo "$LOOP_INFO" | cut -d'|' -f2)
        local WORK_DIR=$(echo "$LOOP_INFO" | cut -d'|' -f3)
        echo "PID: $PID | Script: $SCRIPT_PATH | Dir: $WORK_DIR"
    done
}

# Main daemon loop
daemon_loop() {
    log SUCCESS "Ralph Manager started (PID: $$)"
    log INFO "Checking for script changes every ${CHECK_INTERVAL}s"
    
    while true; do
        manage_loops
        sleep $CHECK_INTERVAL
    done
}

# Show usage
usage() {
    echo "Ralph Manager - Manage Ralph Loop processes"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  start           Start the manager daemon"
    echo "  stop            Stop the manager daemon"
    echo "  restart         Restart the manager daemon"
    echo "  status          Show manager and loop status"
    echo "  run <script>    Start a managed loop"
    echo "  stop-loop <script>  Stop a managed loop"
    echo "  list            List all managed loops"
    echo "  check           Run a single check (no daemon)"
    echo ""
    echo "Options:"
    echo "  -h, --help      Show this help"
    echo ""
}

# Main
case "${1:-start}" in
    start)
        check_running
        save_pid
        log INFO "Starting Ralph Manager daemon..."
        daemon_loop
        ;;
    stop)
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            log INFO "Stopping Ralph Manager (PID: $PID)"
            kill "$PID" 2>/dev/null || true
            rm -f "$PID_FILE"
            log SUCCESS "Ralph Manager stopped"
        else
            log WARNING "Ralph Manager is not running"
        fi
        ;;
    restart)
        "$0" stop
        sleep 2
        "$0" start
        ;;
    status)
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if ps -p "$PID" > /dev/null 2>&1; then
                log SUCCESS "Ralph Manager is running (PID: $PID)"
            else
                log WARNING "Ralph Manager PID file exists but process not running"
            fi
        else
            log INFO "Ralph Manager is not running"
        fi
        list_loops
        ;;
    run)
        if [ -z "$2" ]; then
            log ERROR "Please provide script path"
            exit 1
        fi
        SCRIPT=$(realpath "$2")
        WORK_DIR=$(dirname "$SCRIPT")
        start_managed_loop "$SCRIPT" "$WORK_DIR"
        ;;
    stop-loop)
        if [ -z "$2" ]; then
            log ERROR "Please provide script path"
            exit 1
        fi
        SCRIPT=$(realpath "$2")
        stop_managed_loop "$SCRIPT"
        ;;
    list)
        list_loops
        ;;
    check)
        manage_loops
        ;;
    -h|--help)
        usage
        ;;
    *)
        log ERROR "Unknown command: $1"
        usage
        exit 1
        ;;
esac
