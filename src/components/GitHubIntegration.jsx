import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';

function GitHubIntegration({ projectPath }) {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cloningRepo, setCloningRepo] = useState(null);
  const [ghInstalled, setGhInstalled] = useState(true);

  useEffect(() => {
    checkGhInstalled();
  }, []);

  const checkGhInstalled = async () => {
    try {
      const result = await ipcRenderer.invoke('gh-list-repos');
      if (result.success) {
        setGhInstalled(true);
        setRepos(result.repos);
      } else if (result.error.includes('not found')) {
        setGhInstalled(false);
      } else {
        setRepos([]);
      }
    } catch {
      setGhInstalled(false);
    }
  };

  const handleLoadRepos = async () => {
    setLoading(true);
    setError(null);
    
    const result = await ipcRenderer.invoke('gh-list-repos');
    
    if (result.success) {
      setRepos(result.repos);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleCloneRepo = async (repoName) => {
    setCloningRepo(repoName);
    setError(null);
    
    const repoNameOnly = repoName.split('/').pop();
    const targetDir = `${projectPath}/${repoNameOnly}`;
    
    const result = await ipcRenderer.invoke('gh-clone-repo', repoName, targetDir);
    
    if (result.success) {
      alert(`Successfully cloned ${repoName}`);
    } else {
      setError(result.error);
    }
    
    setCloningRepo(null);
  };

  const handleInitRalphProject = async () => {
    const projectName = prompt('Enter project name:');
    if (!projectName) return;
    
    const projectDescription = prompt('Enter project description:') || '';
    
    const result = await ipcRenderer.invoke(
      'init-ralph-project',
      projectPath,
      projectName,
      projectDescription
    );
    
    if (result.success) {
      alert('Ralph project initialized successfully!');
    } else {
      setError(result.error);
    }
  };

  if (!ghInstalled) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '40px',
        textAlign: 'center',
      }}>
        <span style={{ fontSize: '64px', marginBottom: '20px' }}>🐙</span>
        <h2 style={{ fontSize: '24px', marginBottom: '12px', color: '#c9d1d9' }}>
          GitHub CLI Required
        </h2>
        <p style={{ color: '#8b949e', marginBottom: '24px', maxWidth: '500px' }}>
          Ralph Manager uses the GitHub CLI (gh) for repository management and AI agent integration.
          Please install gh CLI and authenticate to use GitHub features.
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <a
            href="https://cli.github.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ textDecoration: 'none' }}
          >
            Install gh CLI
          </a>
          <button
            className="btn btn-secondary"
            onClick={checkGhInstalled}
          >
            Check Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      backgroundColor: '#0d1117',
      padding: '24px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
      }}>
        <div>
          <h2 style={{ fontSize: '20px', color: '#c9d1d9', marginBottom: '4px' }}>
            🐙 GitHub Integration
          </h2>
          <p style={{ color: '#8b949e', fontSize: '14px' }}>
            Manage repositories and initialize Ralph projects
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-primary"
            onClick={handleInitRalphProject}
          >
            ✨ New Ralph Project
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleLoadRepos}
            disabled={loading}
          >
            {loading ? 'Loading...' : '🔄 Refresh Repos'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: 'rgba(218, 54, 51, 0.15)',
          borderRadius: '6px',
          color: '#ff7b72',
          marginBottom: '24px',
        }}>
          {error}
        </div>
      )}

      {/* Repositories */}
      <div className="card">
        <div className="card-header">
          Your Repositories ({repos.length})
        </div>
        
        {repos.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#8b949e',
          }}>
            <p>No repositories found. Click "Refresh Repos" to load.</p>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxHeight: '500px',
            overflowY: 'auto',
          }}>
            {repos.map((repo, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  backgroundColor: '#0d1117',
                  border: '1px solid #30363d',
                  borderRadius: '6px',
                }}
              >
                <span style={{ fontSize: '20px' }}>📦</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#c9d1d9', fontWeight: '500' }}>
                    {repo.name_with_owner || `${repo.owner?.login}/${repo.name}`}
                  </div>
                  {repo.description && (
                    <div style={{ color: '#8b949e', fontSize: '13px', marginTop: '4px' }}>
                      {repo.description}
                    </div>
                  )}
                </div>
                <button
                  className={`btn btn-primary btn-sm ${cloningRepo === repo.name_with_owner ? 'disabled' : ''}`}
                  onClick={() => handleCloneRepo(repo.name_with_owner)}
                  disabled={cloningRepo === repo.name_with_owner}
                >
                  {cloningRepo === repo.name_with_owner ? 'Cloning...' : '📥 Clone'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        backgroundColor: 'rgba(88, 166, 255, 0.15)',
        border: '1px solid #30363d',
        borderRadius: '6px',
      }}>
        <h4 style={{ color: '#58a6ff', marginBottom: '8px' }}>
          ℹ️ How it works
        </h4>
        <ul style={{ color: '#8b949e', fontSize: '13px', lineHeight: '1.8', margin: 0, paddingLeft: '20px' }}>
          <li>Clone a repository or create a new Ralph project</li>
          <li>The project will have prd.json, progress.txt, and ralph-loop.sh</li>
          <li>Click "Start Loop" to begin autonomous task execution</li>
          <li>Each iteration completes one task, commits, and waits 5 minutes</li>
          <li>Monitor progress in the Terminal tab</li>
        </ul>
      </div>
    </div>
  );
}

export default GitHubIntegration;
