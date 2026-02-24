#!/bin/bash
# Ralph Loop Script Generator
# Generates a custom Ralph loop script based on project configuration

set -e

PROJECT_DIR="${1:-.}"
PROJECT_NAME=$(basename "$PROJECT_DIR")

echo "🔄 Generating Ralph Loop for project: $PROJECT_NAME"

# Create the main Ralph loop script
cat > "$PROJECT_DIR/ralph-loop.sh" << 'RALPH_LOOP_EOF'
#!/bin/bash
# Ralph Loop - AI Agent Autonomous Coding Loop
# This script runs the AI agent in a loop, completing tasks one by one

set -e

# Configuration
PROJECT_DIR="${PROJECT_DIR:-$(pwd)}"
PRD_FILE="$PROJECT_DIR/prd.json"
PROGRESS_FILE="$PROJECT_DIR/progress.txt"
PROMPT_FILE="$PROJECT_DIR/.ralph-prompt.md"
STATE_FILE="$PROJECT_DIR/.ralph-state.json"
LOCK_FILE="$PROJECT_DIR/.ralph-lock"
DONE_FILE="$PROJECT_DIR/.ralph-done"
PAUSE_FILE="$PROJECT_DIR/.ralph-pause"
CODEBASE_DIR="$PROJECT_DIR/codebase"
LOOP_INTERVAL=300  # 5 minutes between loops
MAX_RETRIES=3
RETRY_DELAY=10

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Check if another instance is running
check_lock() {
    if [ -f "$LOCK_FILE" ]; then
        PID=$(cat "$LOCK_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            log_error "Another instance is already running (PID: $PID)"
            exit 1
        else
            log_warning "Stale lock file found, removing..."
            rm -f "$LOCK_FILE"
        fi
    fi
    echo $$ > "$LOCK_FILE"
    trap 'rm -f "$LOCK_FILE"' EXIT
}

# Check if all tasks are complete
check_done() {
    if [ -f "$DONE_FILE" ]; then
        log_info "All tasks completed. Exiting."
        exit 0
    fi
}

# Check if paused
check_pause() {
    if [ -f "$PAUSE_FILE" ]; then
        log_info "Loop is paused. Waiting..."
        while [ -f "$PAUSE_FILE" ]; do
            sleep 5
        done
        log_info "Loop resumed."
    fi
}

# Initialize progress file if not exists
init_progress() {
    if [ ! -f "$PROGRESS_FILE" ]; then
        echo "# Ralph Loop Progress Log" > "$PROGRESS_FILE"
        echo "Project: $PROJECT_NAME" >> "$PROGRESS_FILE"
        echo "Started: $(date)" >> "$PROGRESS_FILE"
        echo "" >> "$PROGRESS_FILE"
    fi
}

# Load state for resume
load_state() {
    if [ -f "$STATE_FILE" ]; then
        log_info "Resuming from previous state..."
        CURRENT_ITERATION=$(jq -r '.iteration // 0' "$STATE_FILE")
        COMPLETED_TASKS=$(jq -r '.completed_tasks // []' "$STATE_FILE")
    else
        CURRENT_ITERATION=0
        COMPLETED_TASKS="[]"
    fi
}

# Save state for resume
save_state() {
    cat > "$STATE_FILE" << EOF
{
    "iteration": $CURRENT_ITERATION,
    "completed_tasks": $COMPLETED_TASKS,
    "last_updated": "$(date -Iseconds)"
}
EOF
}

# Get next task from PRD
get_next_task() {
    if [ ! -f "$PRD_FILE" ]; then
        log_error "PRD file not found: $PRD_FILE"
        return 1
    fi
    
    # Find first task with passes=false
    NEXT_TASK=$(jq -r '.tasks[] | select(.passes == false) | @base64' "$PRD_FILE" | head -n 1)
    
    if [ -z "$NEXT_TASK" ]; then
        log_success "All tasks completed!"
        touch "$DONE_FILE"
        return 1
    fi
    
    echo "$NEXT_TASK"
}

# Run AI agent with prompt
run_agent() {
    local TASK="$1"
    local RETRY_COUNT=0
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        log_info "Running AI agent (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)..."
        
        # Read the prompt template
        if [ -f "$PROMPT_FILE" ]; then
            PROMPT=$(cat "$PROMPT_FILE")
        else
            PROMPT="Complete the task from the PRD. Read prd.json and progress.txt for context."
        fi
        
        # Run the AI agent using gh cli or other configured agent
        # This is where you integrate with your preferred AI agent
        if command -v gh &> /dev/null; then
            log_info "Using GitHub CLI for agent execution..."
            # Example: gh copilot suggest "$PROMPT"
            # Replace with actual agent integration
            echo "Agent execution placeholder - integrate your AI agent here"
        else
            log_warning "GitHub CLI not found. Using placeholder agent..."
            echo "Placeholder agent execution"
        fi
        
        if [ $? -eq 0 ]; then
            return 0
        fi
        
        RETRY_COUNT=$((RETRY_COUNT + 1))
        log_warning "Agent failed, retrying in ${RETRY_DELAY}s..."
        sleep $RETRY_DELAY
    done
    
    log_error "Agent failed after $MAX_RETRIES attempts"
    return 1
}

# Update PRD with task completion
update_prd() {
    local TASK_ID="$1"
    local NOTES="$2"
    
    if [ -f "$PRD_FILE" ]; then
        # Mark task as passes=true and add notes
        jq --arg id "$TASK_ID" --arg notes "$NOTES" \
           '.tasks = [.tasks[] | if .id == $id then .passes = true | .notes = ($notes // "") else . end]' \
           "$PRD_FILE" > "$PRD_FILE.tmp" && mv "$PRD_FILE.tmp" "$PRD_FILE"
        log_success "PRD updated"
    fi
}

# Append to progress log
log_progress() {
    local ENTRY="$1"
    echo "" >> "$PROGRESS_FILE"
    echo "## Iteration $CURRENT_ITERATION - $(date)" >> "$PROGRESS_FILE"
    echo "$ENTRY" >> "$PROGRESS_FILE"
    echo "" >> "$PROGRESS_FILE"
    log_info "Progress logged"
}

# Commit changes
commit_changes() {
    local MESSAGE="$1"
    
    cd "$PROJECT_DIR"
    
    if git status --porcelain | grep -q .; then
        git add -A
        git commit -m "[Ralph] $MESSAGE"
        log_success "Changes committed: $MESSAGE"
    else
        log_info "No changes to commit"
    fi
}

# Sync with remote (optional push)
sync_remote() {
    if command -v gh &> /dev/null && git remote -v | grep -q github; then
        log_info "Syncing with remote..."
        git push origin HEAD 2>/dev/null || log_warning "Push failed, continuing..."
    fi
}

# Main loop
main() {
    log_info "🚀 Starting Ralph Loop"
    log_info "Project Directory: $PROJECT_DIR"
    
    check_lock
    check_done
    init_progress
    load_state
    
    while true; do
        check_pause
        check_done
        
        CURRENT_ITERATION=$((CURRENT_ITERATION + 1))
        log_info "╔════════════════════════════════════════╗"
        log_info "║  Loop Iteration: $CURRENT_ITERATION"
        log_info "╚════════════════════════════════════════╝"
        
        # Get next task
        TASK=$(get_next_task)
        if [ $? -ne 0 ]; then
            log_success "🎉 All tasks completed!"
            commit_changes "All tasks completed"
            sync_remote
            break
        fi
        
        # Decode task
        TASK_JSON=$(echo "$TASK" | base64 -d)
        TASK_ID=$(echo "$TASK_JSON" | jq -r '.id')
        TASK_DESC=$(echo "$TASK_JSON" | jq -r '.description')
        
        log_info "Task ID: $TASK_ID"
        log_info "Task: $TASK_DESC"
        
        # Run agent
        if run_agent "$TASK_JSON"; then
            log_success "Task completed successfully"
            
            # Update PRD
            update_prd "$TASK_ID" "Completed in iteration $CURRENT_ITERATION"
            
            # Update completed tasks
            COMPLETED_TASKS=$(echo "$COMPLETED_TASKS" | jq --arg id "$TASK_ID" '. + [$id]')
            
            # Log progress
            log_progress "Completed task $TASK_ID: $TASK_DESC"
            
            # Commit changes
            commit_changes "Complete task $TASK_ID"
            
            # Save state
            save_state
            
            # Sync remote
            sync_remote
        else
            log_error "Task failed: $TASK_ID"
            log_progress "FAILED task $TASK_ID: $TASK_DESC"
        fi
        
        # Wait before next iteration
        log_info "Waiting ${LOOP_INTERVAL}s before next iteration..."
        sleep $LOOP_INTERVAL
    done
    
    log_success "🎉 Ralph Loop completed successfully!"
}

# Handle signals
trap 'log_info "Interrupted, exiting..."; exit 0' INT TERM

# Run main
main "$@"
RALPH_LOOP_EOF

chmod +x "$PROJECT_DIR/ralph-loop.sh"

# Create default PRD if not exists
if [ ! -f "$PROJECT_DIR/prd.json" ]; then
    cat > "$PROJECT_DIR/prd.json" << 'PRD_EOF'
{
    "title": "Project PRD",
    "description": "Product Requirements Document",
    "created_at": "$(date -Iseconds)",
    "tasks": [
        {
            "id": "task-001",
            "description": "Set up project structure",
            "passes": false,
            "notes": "",
            "priority": "high"
        },
        {
            "id": "task-002",
            "description": "Implement core functionality",
            "passes": false,
            "notes": "",
            "priority": "medium"
        }
    ]
}
PRD_EOF
    echo "✅ Created default prd.json"
fi

# Create default prompt template if not exists
if [ ! -f "$PROJECT_DIR/.ralph-prompt.md" ]; then
    cat > "$PROJECT_DIR/.ralph-prompt.md" << 'PROMPT_EOF'
# Ralph Agent Prompt

READ all of prd.json and progress.txt. Pick ONE task with passes=false 
(prefer highest-risk/highest-impact). Keep changes small: one logical 
change per commit. Update prd.json by setting passes=true and adding 
notes or steps as needed. Append a brief entry to progress.txt with 
what changed and why.

## Instructions:
1. Read the full PRD and progress log
2. Select one incomplete task
3. Implement the task in the codebase folder
4. Test your changes
5. Update prd.json (set passes=true, add notes)
6. Append to progress.txt
7. Commit all changes together
8. Wait for next iteration

## Quality Bar:
- Production code
- Maintainable and clean
- Tests when appropriate
- Update AGENTS.md for critical learnings

When ALL tasks complete, create .ralph-done file and output:
<promise>COMPLETE</promise>

NEVER GIT PUSH. ONLY COMMIT. The manager handles syncing.
PROMPT_EOF
    echo "✅ Created default .ralph-prompt.md"
fi

# Create codebase directory
mkdir -p "$PROJECT_DIR/codebase"
echo "✅ Created codebase directory"

echo ""
echo "🎉 Ralph Loop generated successfully!"
echo "   Location: $PROJECT_DIR/ralph-loop.sh"
echo ""
echo "To run the loop:"
echo "   cd $PROJECT_DIR && ./ralph-loop.sh"
echo ""
echo "To control the loop:"
echo "   - Pause: touch $PROJECT_DIR/.ralph-pause"
echo "   - Resume: rm $PROJECT_DIR/.ralph-pause"
echo "   - Stop: Ctrl+C or kill the process"
