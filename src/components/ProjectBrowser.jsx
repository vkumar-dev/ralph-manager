import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';

function ProjectBrowser({ projectPath, onFileSelect, files = [] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedDirs, setExpandedDirs] = useState(new Set(['codebase']));

  const items = files.length > 0 ? files.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  }) : [];

  const handleDirectoryClick = (item) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(item.path)) {
        next.delete(item.path);
      } else {
        next.add(item.path);
      }
      return next;
    });
  };

  const handleFileClick = (item) => {
    onFileSelect(item);
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    const icons = {
      json: '📋',
      md: '📝',
      txt: '📄',
      sh: '📜',
      bash: '📜',
      js: '📜',
      jsx: '📜',
      ts: '📜',
      tsx: '📜',
      html: '🌐',
      css: '🎨',
      py: '🐍',
      lock: '🔒',
    };
    return icons[ext] || '📄';
  };

  const isRalphFile = (fileName) => {
    return fileName.startsWith('.ralph') || 
           fileName === 'ralph-loop.sh' ||
           fileName === 'prd.json' ||
           fileName === 'progress.txt';
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#8b949e',
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      backgroundColor: '#0d1117',
      padding: '16px',
    }}>
      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: 'rgba(218, 54, 51, 0.15)',
          borderRadius: '6px',
          color: '#ff7b72',
          marginBottom: '16px',
        }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#8b949e',
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          Ralph Files
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {items.filter(item => isRalphFile(item.name)).map(item => (
            <div
              key={item.path}
              onClick={() => item.isFile ? handleFileClick(item) : handleDirectoryClick(item)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: '#161b22',
                border: '1px solid #30363d',
                borderRadius: '6px',
                cursor: item.isFile ? 'pointer' : 'default',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={(e) => item.isFile && (e.currentTarget.style.backgroundColor = '#21262d')}
              onMouseOut={(e) => item.isFile && (e.currentTarget.style.backgroundColor = '#161b22')}
            >
              <span>{getFileIcon(item.name)}</span>
              <span style={{ color: '#c9d1d9', fontSize: '14px' }}>{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#8b949e',
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          Project Structure
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {items.filter(item => !isRalphFile(item.name)).map(item => (
            <div
              key={item.path}
              onClick={() => item.isFile ? handleFileClick(item) : handleDirectoryClick(item)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: item.isDirectory ? 'transparent' : '#161b22',
                border: item.isDirectory ? 'none' : '1px solid #30363d',
                borderRadius: item.isDirectory ? '0' : '6px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={(e) => !item.isDirectory && (e.currentTarget.style.backgroundColor = '#21262d')}
              onMouseOut={(e) => !item.isDirectory && (e.currentTarget.style.backgroundColor = '#161b22')}
            >
              <span style={{ fontSize: '16px' }}>
                {item.isDirectory ? (
                  expandedDirs.has(item.path) ? '📂' : '📁'
                ) : (
                  getFileIcon(item.name)
                )}
              </span>
              <span style={{ color: '#c9d1d9', fontSize: '14px' }}>{item.name}</span>
              {item.isDirectory && item.name === 'codebase' && (
                <span className="badge badge-info" style={{ fontSize: '10px', marginLeft: 'auto' }}>
                  Agent Workspace
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        backgroundColor: '#161b22',
        border: '1px solid #30363d',
        borderRadius: '6px',
      }}>
        <h4 style={{
          fontSize: '13px',
          fontWeight: '600',
          color: '#c9d1d9',
          marginBottom: '12px',
        }}>
          Quick Actions
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={async () => {
              const prdFile = items.find(i => i.name === 'prd.json');
              if (prdFile) onFileSelect(prdFile);
            }}
          >
            📋 Edit PRD
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={async () => {
              const progressFile = items.find(i => i.name === 'progress.txt');
              if (progressFile) onFileSelect(progressFile);
            }}
          >
            📝 View Progress
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={async () => {
              const promptFile = items.find(i => i.name === '.ralph-prompt.md');
              if (promptFile) onFileSelect(promptFile);
            }}
          >
            📜 Edit Prompt
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProjectBrowser;
