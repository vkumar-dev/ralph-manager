const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const chokidar = require('chokidar');

let mainWindow;
let terminalProcess = null;
let fileWatchers = new Map();

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        backgroundColor: '#0d1117',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        show: false,
    });

    // Load the static HTML file
    const htmlPath = path.join(__dirname, '../../public/index.html');
    mainWindow.loadFile(htmlPath);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
        if (terminalProcess) {
            terminalProcess.kill();
        }
        fileWatchers.forEach(watcher => watcher.close());
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC Handlers

// Read file
ipcMain.handle('read-file', async (event, filePath) => {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return { success: true, content };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Write file
ipcMain.handle('write-file', async (event, filePath, content) => {
    try {
        fs.writeFileSync(filePath, content, 'utf-8');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Select directory
ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
    });
    if (!result.canceled && result.filePaths.length > 0) {
        return { success: true, path: result.filePaths[0] };
    }
    return { success: false };
});

// List directory
ipcMain.handle('list-directory', async (event, dirPath) => {
    try {
        const items = fs.readdirSync(dirPath, { withFileTypes: true });
        const result = items.map(item => ({
            name: item.name,
            path: path.join(dirPath, item.name),
            isDirectory: item.isDirectory(),
            isFile: item.isFile(),
        }));
        return { success: true, items: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Run Ralph loop
ipcMain.handle('run-ralph-loop', async (event, scriptPath, workingDir) => {
    try {
        if (terminalProcess) {
            terminalProcess.kill();
        }

        terminalProcess = spawn('bash', [scriptPath], {
            cwd: workingDir,
            shell: true,
        });

        terminalProcess.stdout.on('data', (data) => {
            mainWindow.webContents.send('terminal-output', {
                type: 'stdout',
                data: data.toString(),
            });
        });

        terminalProcess.stderr.on('data', (data) => {
            mainWindow.webContents.send('terminal-output', {
                type: 'stderr',
                data: data.toString(),
            });
        });

        terminalProcess.on('close', (code) => {
            mainWindow.webContents.send('terminal-output', {
                type: 'close',
                data: `Process exited with code ${code}`,
            });
            terminalProcess = null;
        });

        return { success: true, pid: terminalProcess.pid };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Stop Ralph loop
ipcMain.handle('stop-ralph-loop', async () => {
    try {
        if (terminalProcess) {
            terminalProcess.kill('SIGTERM');
            terminalProcess = null;
            return { success: true };
        }
        return { success: false, error: 'No process running' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Watch file for changes
ipcMain.handle('watch-file', async (event, filePath) => {
    try {
        if (fileWatchers.has(filePath)) {
            fileWatchers.get(filePath).close();
        }

        const watcher = chokidar.watch(filePath, {
            persistent: false,
            ignoreInitial: true,
        });

        watcher.on('change', () => {
            fs.readFile(filePath, 'utf-8', (err, content) => {
                if (!err) {
                    mainWindow.webContents.send('file-changed', {
                        filePath,
                        content,
                    });
                }
            });
        });

        fileWatchers.set(filePath, watcher);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Unwatch file
ipcMain.handle('unwatch-file', async (event, filePath) => {
    try {
        if (fileWatchers.has(filePath)) {
            fileWatchers.get(filePath).close();
            fileWatchers.delete(filePath);
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// GitHub CLI: List repos
ipcMain.handle('gh-list-repos', async () => {
    return new Promise((resolve) => {
        const process = spawn('gh', ['repo', 'list', '--limit', '50', '--json', 'name,owner,description'], {
            shell: true,
        });

        let output = '';
        let errorOutput = '';

        process.stdout.on('data', (data) => {
            output += data.toString();
        });

        process.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        process.on('close', (code) => {
            if (code === 0 && output) {
                try {
                    const repos = JSON.parse(output);
                    resolve({ success: true, repos });
                } catch {
                    resolve({ success: false, error: 'Failed to parse GitHub response' });
                }
            } else {
                resolve({ 
                    success: false, 
                    error: errorOutput || 'Failed to list repositories. Make sure gh CLI is installed and authenticated.' 
                });
            }
        });

        process.on('error', (err) => {
            resolve({ success: false, error: `gh CLI not found: ${err.message}` });
        });
    });
});

// GitHub CLI: Get repo contents
ipcMain.handle('gh-clone-repo', async (event, repoName, targetDir) => {
    return new Promise((resolve) => {
        const process = spawn('gh', ['repo', 'clone', repoName, targetDir], {
            shell: true,
        });

        let output = '';
        let errorOutput = '';

        process.stdout.on('data', (data) => {
            output += data.toString();
        });

        process.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolve({ success: true, message: `Cloned ${repoName} to ${targetDir}` });
            } else {
                resolve({ success: false, error: errorOutput || 'Failed to clone repository' });
            }
        });

        process.on('error', (err) => {
            resolve({ success: false, error: `gh CLI not found: ${err.message}` });
        });
    });
});

// Initialize Ralph project
ipcMain.handle('init-ralph-project', async (event, projectDir, projectName, projectDescription) => {
    try {
        const scriptsDir = path.join(__dirname, '../../scripts');
        const generatorScript = path.join(scriptsDir, 'generate-ralph-loop.sh');

        // Create project directory
        if (!fs.existsSync(projectDir)) {
            fs.mkdirSync(projectDir, { recursive: true });
        }

        // Run generator
        return new Promise((resolve) => {
            const process = spawn('bash', [generatorScript, projectDir], {
                shell: true,
                env: { ...process.env, PROJECT_NAME: projectName },
            });

            let output = '';
            let errorOutput = '';

            process.stdout.on('data', (data) => {
                output += data.toString();
            });

            process.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve({ success: true, message: 'Project initialized successfully' });
                } else {
                    resolve({ success: false, error: errorOutput || 'Failed to initialize project' });
                }
            });

            process.on('error', (err) => {
                resolve({ success: false, error: err.message });
            });
        });
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Open in external editor
ipcMain.handle('open-in-editor', async (event, filePath) => {
    try {
        await shell.openPath(filePath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Get file stats
ipcMain.handle('get-file-stats', async (event, filePath) => {
    try {
        const stats = fs.statSync(filePath);
        return { 
            success: true, 
            stats: {
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
            } 
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});
