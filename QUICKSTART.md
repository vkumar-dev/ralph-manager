# Quick Start Guide

## Getting Started with Ralph Manager

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the GUI

```bash
npm run dev
```

Or use the alias (after running `source ~/.bash_alias`):
```bash
ralph
```

### 3. Open or Create a Project

- Click "Open Project" in the GUI
- Select an existing Ralph project directory OR
- Go to the GitHub tab and create a new Ralph project

### 4. Start the Ralph Loop

- Click "▶ Start Loop" button
- Watch the terminal output in the Terminal tab
- Edit PRD, progress, or prompt files as needed

## CLI Usage

### Generate a Ralph Loop

```bash
./scripts/generate-ralph-loop.sh /path/to/project
```

### Run Ralph Manager Daemon

```bash
# Start
./scripts/ralph-manager-daemon.sh start

# Status
./scripts/ralph-manager-daemon.sh status

# Stop
./scripts/ralph-manager-daemon.sh stop
```

## Project Structure

When you generate a Ralph loop, you get:

```
project/
├── prd.json              # Edit your tasks here
├── progress.txt          # View progress log
├── .ralph-prompt.md      # Customize agent prompt
├── ralph-loop.sh         # The loop script
└── codebase/             # Agent works here
```

## Editing Tasks

1. Open `prd.json` in the editor
2. Add or modify tasks:

```json
{
    "tasks": [
        {
            "id": "task-001",
            "description": "Your task description",
            "passes": false,
            "priority": "high"
        }
    ]
}
```

3. Save (Ctrl+S)
4. Start the loop

## Controlling the Loop

### Pause
```bash
touch /path/to/project/.ralph-pause
```

### Resume
```bash
rm /path/to/project/.ralph-pause
```

### Stop
- Click "⏹ Stop Loop" in GUI, or
- Press Ctrl+C in terminal

## GitHub Integration

1. Make sure `gh` CLI is installed and authenticated
2. Go to GitHub tab in GUI
3. Click "Refresh Repos"
4. Clone a repo or create new Ralph project

## Tips

- **Edit PRD**: Add clear, specific tasks
- **Monitor Progress**: Check progress.txt regularly
- **Customize Prompt**: Edit .ralph-prompt.md for agent behavior
- **Wait Time**: Default 5 minutes between iterations (configurable)
- **Auto-commit**: Each task completion is committed automatically

## Troubleshooting

### Loop doesn't start
- Make sure script is executable: `chmod +x ralph-loop.sh`
- Check `jq` is installed: `jq --version`

### GitHub features don't work
- Install gh CLI: https://cli.github.com/
- Authenticate: `gh auth login`

### GUI doesn't start
- Install dependencies: `npm install`
- Check Node.js version: 18+ required
