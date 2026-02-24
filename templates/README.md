# {{PROJECT_NAME}}

{{PROJECT_DESCRIPTION}}

## Project Structure

```
{{PROJECT_NAME}}/
├── prd.json              # Product Requirements Document (tasks)
├── progress.txt          # Progress log (appended each iteration)
├── .ralph-prompt.md      # Agent prompt template
├── ralph-loop.sh         # Ralph loop script
├── codebase/             # Agent writes/edits code here
│   └── ...
├── .ralph-state.json     # Persisted state for resume
├── .ralph-lock           # Prevents multiple instances
├── .ralph-done           # Created when all tasks complete
└── .ralph-pause          # Created to pause the loop
```

## Getting Started

### Initialize Ralph Loop

```bash
# Generate the Ralph loop
./scripts/generate-ralph-loop.sh .

# Or manually create project structure
mkdir -p codebase
```

### Run the Loop

```bash
# Start the Ralph loop
./ralph-loop.sh

# Or use the manager
../scripts/ralph-manager-daemon.sh run ./ralph-loop.sh
```

### Control the Loop

```bash
# Pause the loop
touch .ralph-pause

# Resume the loop
rm .ralph-pause

# Stop the loop
# Press Ctrl+C or kill the process
```

### Manager Commands

```bash
# Start manager daemon
../scripts/ralph-manager-daemon.sh start

# Check status
../scripts/ralph-manager-daemon.sh status

# List managed loops
../scripts/ralph-manager-daemon.sh list

# Stop manager
../scripts/ralph-manager-daemon.sh stop
```

## Workflow

1. **Initialize**: Create project with `prd.json`, `progress.txt`, and prompt
2. **Start Loop**: Run `ralph-loop.sh` or use manager
3. **Agent Works**: Each iteration:
   - Reads PRD and progress
   - Picks one task
   - Implements in `codebase/`
   - Updates files
   - Commits changes
   - Waits 5 minutes
4. **Complete**: When all tasks done, creates `.ralph-done`

## Files

### prd.json

Contains tasks with status:

```json
{
    "tasks": [
        {
            "id": "task-001",
            "description": "Task description",
            "passes": false,
            "notes": "",
            "priority": "high"
        }
    ]
}
```

### progress.txt

Appended log of each iteration:

```
## Iteration 1 - 2026-02-24 10:00:00
Completed task-001: Set up project structure
```

## GitHub Integration

The loop uses `gh` CLI for:
- Discovering projects
- Creating commits
- Syncing with remote (via manager)

Make sure you're authenticated:

```bash
gh auth status
```
