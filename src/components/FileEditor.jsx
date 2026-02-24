import React, { useState, useEffect, useCallback } from 'react';
import { ipcRenderer } from 'electron';

function FileEditor({ file }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [fileStats, setFileStats] = useState(null);

  useEffect(() => {
    loadFile();
    return () => {
      ipcRenderer.invoke('unwatch-file', file.path);
    };
  }, [file]);

  useEffect(() => {
    const handleFileChanged = (event, { filePath, content: newContent }) => {
      if (filePath === file.path && !unsavedChanges) {
        setContent(newContent);
      }
    };

    ipcRenderer.on('file-changed', handleFileChanged);
    return () => {
      ipcRenderer.removeListener('file-changed', handleFileChanged);
    };
  }, [file, unsavedChanges]);

  const loadFile = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await ipcRenderer.invoke('read-file', file.path);
      if (result.success) {
        setContent(result.content);
        
        const statsResult = await ipcRenderer.invoke('get-file-stats', file.path);
        if (statsResult.success) {
          setFileStats(statsResult.stats);
        }
        
        await ipcRenderer.invoke('watch-file', file.path);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const result = await ipcRenderer.invoke('write-file', file.path, content);
      if (result.success) {
        setUnsavedChanges(false);
        await loadFile();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [content, file.path]);

  const handleContentChange = (e) => {
    setContent(e.target.value);
    setUnsavedChanges(true);
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  const getLanguageMode = () => {
    const ext = file.name.split('.').pop().toLowerCase();
    const modes = {
      json: 'JSON',
      js: 'JavaScript',
      jsx: 'JavaScript',
      ts: 'TypeScript',
      tsx: 'TypeScript',
      md: 'Markdown',
      txt: 'Text',
      sh: 'Shell',
      bash: 'Shell',
      html: 'HTML',
      css: 'CSS',
      py: 'Python',
      rb: 'Ruby',
      go: 'Go',
      rs: 'Rust',
    };
    return modes[ext] || 'Text';
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
    <div className="editor-container" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#0d1117',
    }}>
      {/* Editor Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        backgroundColor: '#161b22',
        borderBottom: '1px solid #30363d',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#c9d1d9', fontWeight: '500' }}>
            {file.name}
          </span>
          <span className="badge badge-info" style={{ fontSize: '11px' }}>
            {getLanguageMode()}
          </span>
          {unsavedChanges && (
            <span className="badge badge-warning" style={{ fontSize: '11px' }}>
              ● Unsaved
            </span>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {fileStats && (
            <span style={{ fontSize: '12px', color: '#8b949e' }}>
              {(fileStats.size / 1024).toFixed(1)} KB
            </span>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => ipcRenderer.invoke('open-in-editor', file.path)}
          >
            Open Externally
          </button>
          <button
            className={`btn btn-primary btn-sm ${saving ? 'disabled' : ''}`}
            onClick={handleSave}
            disabled={saving || !unsavedChanges}
          >
            {saving ? 'Saving...' : '💾 Save'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: 'rgba(218, 54, 51, 0.15)',
          borderBottom: '1px solid #30363d',
          color: '#ff7b72',
          fontSize: '13px',
        }}>
          {error}
        </div>
      )}

      {/* Editor */}
      <textarea
        className="editor-textarea"
        value={content}
        onChange={handleContentChange}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        style={{ flex: 1 }}
      />

      {/* Status Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 16px',
        backgroundColor: '#161b22',
        borderTop: '1px solid #30363d',
        fontSize: '12px',
        color: '#8b949e',
      }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>Lines: {content.split('\n').length}</span>
          <span>Characters: {content.length}</span>
        </div>
        <div>
          {unsavedChanges ? (
            <span style={{ color: '#d29922' }}>Press Ctrl+S to save</span>
          ) : (
            <span style={{ color: '#3fb950' }}>Saved</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default FileEditor;
