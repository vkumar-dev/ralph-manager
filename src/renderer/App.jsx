import React, { useState, useEffect, useCallback } from 'react';
import { ipcRenderer } from 'electron';
import FileEditor from '../components/FileEditor';
import Terminal from '../components/Terminal';
import ProjectBrowser from '../components/ProjectBrowser';
import GitHubIntegration from '../components/GitHubIntegration';

function App() {
  const [projectPath, setProjectPath] = useState(null);
  const [activeTab, setActiveTab] = useState('browser');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoopRunning, setIsLoopRunning] = useState(false);
  const [loopStatus, setLoopStatus] = useState('stopped');
  const [projectFiles, setProjectFiles] = useState([]);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  useEffect(() => {
    const handleTerminalOutput = (event, { type, data }) => {
      console.log('Terminal output:', type, data);
    };

    const handleFileChanged = (event, { filePath, content }) => {
      if (filePath === selectedFile?.path) {
        // File changed externally
      }
    };

    ipcRenderer.on('terminal-output', handleTerminalOutput);
    ipcRenderer.on('file-changed', handleFileChanged);

    return () => {
      ipcRenderer.removeListener('terminal-output', handleTerminalOutput);
      ipcRenderer.removeListener('file-changed', handleFileChanged);
    };
  }, [selectedFile]);

  const loadProjectFiles = useCallback(async (dirPath) => {
    try {
      const result = await ipcRenderer.invoke('list-directory', dirPath);
      if (result.success) {
        setProjectFiles(result.items);
      }
    } catch (err) {
      console.error('Failed to load files:', err);
    }
  }, []);

  const handleSelectDirectory = async () => {
    const result = await ipcRenderer.invoke('select-directory');
    if (result.success) {
      setProjectPath(result.path);
      loadProjectFiles(result.path);
      setActiveTab('browser');
    }
  };

  const handleCreateNewProject = async () => {
    if (!newProjectName.trim()) return;

    const result = await ipcRenderer.invoke('select-directory');
    if (result.success) {
      const projectDir = `${result.path}/${newProjectName.trim()}`;
      const initResult = await ipcRenderer.invoke('init-ralph-project', projectDir, newProjectName, newProjectDesc);
      
      if (initResult.success) {
        setProjectPath(projectDir);
        loadProjectFiles(projectDir);
        setShowNewProjectModal(false);
        setNewProjectName('');
        setNewProjectDesc('');
        setActiveTab('browser');
      } else {
        alert('Failed to create project: ' + initResult.error);
      }
    }
  };

  const handleRunLoop = async () => {
    if (!projectPath) return;

    const scriptPath = `${projectPath}/ralph-loop.sh`;
    const result = await ipcRenderer.invoke('run-ralph-loop', scriptPath, projectPath);

    if (result.success) {
      setIsLoopRunning(true);
      setLoopStatus('running');
      setActiveTab('terminal');
    } else {
      alert('Failed to start loop: ' + result.error);
    }
  };

  const handleStopLoop = async () => {
    const result = await ipcRenderer.invoke('stop-ralph-loop');
    if (result.success) {
      setIsLoopRunning(false);
      setLoopStatus('stopped');
    }
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setActiveTab('editor');
  };

  const hasRalphLoop = projectFiles.some(f => f.name === 'ralph-loop.sh');

  return (
    <div className="app" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: '#0d1117',
    }}>
      {/* Title Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        backgroundColor: '#161b22',
        borderBottom: '1px solid #30363d',
        WebkitAppRegion: 'drag',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '18px', fontWeight: '600', color: '#c9d1d9' }}>
            🔄 Ralph Manager
          </span>
          {projectPath && (
            <span style={{ fontSize: '12px', color: '#8b949e' }}>
              {projectPath}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', WebkitAppRegion: 'no-drag' }}>
          {loopStatus === 'running' ? (
            <span className="badge badge-success">
              <span>●</span> Running
            </span>
          ) : (
            <span className="badge badge-info">
              <span>●</span> Stopped
            </span>
          )}

          <button
            className={`btn ${isLoopRunning ? 'btn-danger' : 'btn-primary'} ${!hasRalphLoop ? 'disabled' : ''}`}
            onClick={isLoopRunning ? handleStopLoop : handleRunLoop}
            disabled={!projectPath || !hasRalphLoop}
            title={!hasRalphLoop ? 'No ralph-loop.sh found in this project' : ''}
          >
            {isLoopRunning ? '⏹ Stop Loop' : '▶ Start Loop'}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 20px',
        backgroundColor: '#0d1117',
        borderBottom: '1px solid #30363d',
        WebkitAppRegion: 'no-drag',
      }}>
        <button className="btn btn-primary" onClick={handleSelectDirectory}>
          📁 Open Project
        </button>
        <button className="btn btn-secondary" onClick={() => setShowNewProjectModal(true)}>
          ✨ New Project
        </button>
        {projectPath && (
          <>
            <span style={{ color: '#30363d' }}>|</span>
            <button className="btn btn-secondary btn-sm" onClick={() => loadProjectFiles(projectPath)}>
              🔄 Refresh
            </button>
            <span style={{ color: '#8b949e', fontSize: '13px' }}>
              {projectPath}
            </span>
            {!hasRalphLoop && (
              <span className="badge badge-warning" style={{ marginLeft: '8px' }}>
                ⚠ No ralph-loop.sh
              </span>
            )}
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'browser' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('browser')}
        >
          📂 Project Files
        </button>
        <button
          className={`tab ${activeTab === 'editor' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('editor')}
          disabled={!selectedFile}
        >
          📝 Editor
          {selectedFile && ` - ${selectedFile.name}`}
        </button>
        <button
          className={`tab ${activeTab === 'terminal' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('terminal')}
        >
          💻 Terminal
        </button>
        <button
          className={`tab ${activeTab === 'github' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('github')}
        >
          🐙 GitHub
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {!projectPath ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#8b949e',
          }}>
            <span style={{ fontSize: '64px', marginBottom: '20px' }}>🔄</span>
            <h2 style={{ fontSize: '24px', marginBottom: '12px', color: '#c9d1d9' }}>
              Welcome to Ralph Manager
            </h2>
            <p style={{ marginBottom: '24px', textAlign: 'center', maxWidth: '500px' }}>
              Open an existing Ralph project or create a new one to get started
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-primary" onClick={handleSelectDirectory}>
                📁 Open Project
              </button>
              <button className="btn btn-secondary" onClick={() => setShowNewProjectModal(true)}>
                ✨ New Project
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'browser' && (
              <ProjectBrowser
                projectPath={projectPath}
                onFileSelect={handleFileSelect}
                files={projectFiles}
              />
            )}
            {activeTab === 'editor' && selectedFile && (
              <FileEditor file={selectedFile} />
            )}
            {activeTab === 'terminal' && (
              <Terminal isRunning={isLoopRunning} />
            )}
            {activeTab === 'github' && (
              <GitHubIntegration projectPath={projectPath} />
            )}
          </>
        )}
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '8px',
            padding: '24px',
            minWidth: '400px',
          }}>
            <h3 style={{ fontSize: '18px', color: '#c9d1d9', marginBottom: '16px' }}>
              Create New Ralph Project
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#8b949e', fontSize: '13px', marginBottom: '6px' }}>
                Project Name
              </label>
              <input
                type="text"
                className="input"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="my-awesome-project"
                style={{ width: '100%' }}
                autoFocus
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#8b949e', fontSize: '13px', marginBottom: '6px' }}>
                Description (optional)
              </label>
              <input
                type="text"
                className="input"
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                placeholder="What will you build?"
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowNewProjectModal(false);
                  setNewProjectName('');
                  setNewProjectDesc('');
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateNewProject}
                disabled={!newProjectName.trim()}
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
