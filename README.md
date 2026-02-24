# 🔄 Ralph Manager

A comprehensive GUI and CLI system for managing AI agent loops with file-based state. Ralph Manager enables autonomous AI coding agents to work on tasks iteratively, committing changes and syncing with GitHub between each iteration.

## Features

- **🖥️ Dark-themed GUI** - Modern, easy-on-the-eyes interface for managing projects
- **📁 Project Browser** - Navigate and edit PRD, progress, and loop scripts
- **💻 Terminal Streaming** - Real-time output from running Ralph loops
- **🐙 GitHub Integration** - Clone repos and manage projects with gh CLI
- **🔄 Auto-commit & Sync** - Automatic git commits and remote sync between iterations
- **⚙️ Background Daemon** - Monitors and manages loop processes, restarts on script changes
- **⏱️ 5-Minute Intervals** - Configurable wait time between loop iterations

## Project Structure

```
project-name/
├── prd.json              # Product Requirements Document (tasks)
├── progress.txt          # Progress log (appended each iteration)
├── .ralph-prompt.md      # Agent prompt template
├── ralph-loop.sh         # Ralph loop script
├── codebase/             # Agent writes/edits code here
├── .ralph-state.json     # Persisted state for resume
├── .ralph-lock           # Prevents multiple instances
├── .ralph-done           # Created when all tasks complete
└── .ralph-pause          # Created to pause the loop
```

## Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn
- GitHub CLI (gh) - optional but recommended
- Git

### Install Dependencies

```bash
npm install
```

### Install GitHub CLI (Optional)

```bash
# macOS
brew install gh

# Linux
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update && sudo apt install gh -y

# Authenticate
gh auth login
```

## Usage

### Start the GUI

```bash
npm start
```

### CLI Commands

#### Generate Ralph Loop

```bash
./scripts/generate-ralph-loop.sh /path/to/project
```

#### Run Ralph Manager Daemon

```bash
# Start daemon
./scripts/ralph-manager-daemon.sh start

# Check status
./scripts/ralph-manager-daemon.sh status

# List managed loops
./scripts/ralph-manager-daemon.sh list

# Run a specific loop
./scripts/ralph-manager-daemon.sh run /path/to/ralph-loop.sh

# Stop a loop
./scripts/ralph-manager-daemon.sh stop-loop /path/to/ralph-loop.sh

# Stop daemon
./scripts/ralph-manager-daemon.sh stop
```

### Direct Loop Execution

```bash
cd /path/to/project
./ralph-loop.sh
```

## GUI Features

![Ralph Manager GUI](public/screenshot.png)

### 1. Project Browser
- Browse all project files
- Quick access to Ralph-specific files (PRD, progress, prompt)
- View codebase directory

### 2. File Editor
- Edit PRD, progress, and scripts
- Syntax highlighting indicators
- Auto-save with Ctrl+S
- File change watching

### 3. Terminal
- Real-time output streaming
- Color-coded output (info, success, error)
- Clear and scroll functionality

### 4. GitHub Integration
- List your repositories
- Clone repos directly
- Initialize new Ralph projects
- Auto-commit and sync

## Ralph Loop Workflow

1. **Initialize** - Create project with PRD, progress file, and prompt
2. **Start Loop** - Click "Start Loop" in GUI or run script
3. **Agent Iteration**:
   - Reads PRD and selects one incomplete task
   - Implements task in `codebase/` folder
   - Updates PRD (marks task as complete)
   - Appends to progress log
   - Commits all changes
   - Waits 5 minutes
4. **Repeat** - Continues until all tasks complete
5. **Complete** - Creates `.ralph-done` file

## Control the Loop

### Pause/Resume

```bash
# Pause
touch .ralph-pause

# Resume
rm .ralph-pause
```

### Stop

- Press `Ctrl+C` in terminal
- Click "Stop Loop" in GUI
- Kill the process

## Configuration

### Loop Interval

Edit `ralph-loop.sh` to change the wait time:

```bash
LOOP_INTERVAL=300  # 5 minutes (in seconds)
```

### Prompt Template

Customize `.ralph-prompt.md` to change agent behavior:

```markdown
# Ralph Agent Prompt

READ all of prd.json and progress.txt...
```

### PRD Format

```json
{
    "title": "Project Name",
    "description": "Project description",
    "tasks": [
        {
            "id": "task-001",
            "description": "Task description",
            "passes": false,
            "notes": "",
            "priority": "high",
            "risk": "medium"
        }
    ]
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Ralph Manager GUI                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │  Browser │ │  Editor  │ │ Terminal │ │ GitHub   │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
└─────────────────────────────────────────────────────────┘
                            │
                            │ IPC
                            │
┌─────────────────────────────────────────────────────────┐
│                   Electron Main Process                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │File Ops  │ │PTY/Spawn │ │ Git Ops  │ │ gh CLI   │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
└─────────────────────────────────────────────────────────┘
                            │
                            │
┌─────────────────────────────────────────────────────────┐
│                    Ralph Loop Scripts                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│  │ralph-loop│ │ Manager  │ │ Project  │                │
│  │  Script  │ │  Daemon  │ │  Files   │                │
│  └──────────┘ └──────────┘ └──────────┘                │
└─────────────────────────────────────────────────────────┘
```

## Development

### Run in Development Mode

```bash
npm run dev
```

### Build

```bash
npm run build
npm run build:electron
```

### Test

```bash
npm test
```

## Troubleshooting

### gh CLI Not Found

```bash
# Check installation
gh --version

# Install if needed
# See installation steps above
```

### Loop Not Starting

1. Check script is executable: `chmod +x ralph-loop.sh`
2. Check dependencies: `jq` is required
3. Check git is configured

### GUI Not Loading

1. Install dependencies: `npm install`
2. Check Node.js version: `node --version` (18+)
3. Clear cache: `rm -rf node_modules && npm install`

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Acknowledgments

- Inspired by [Ralph Loop](https://github.com/iannuttall/ralph) pattern
- Built with [Electron](https://www.electronjs.org/), [React](https://react.dev/), and [Vite](https://vitejs.dev/)
