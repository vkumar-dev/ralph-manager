import React, { useState, useEffect, useRef } from 'react';
import { ipcRenderer } from 'electron';

function Terminal() {
  const [output, setOutput] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const outputRef = useRef(null);

  useEffect(() => {
    const handleTerminalOutput = (event, { type, data }) => {
      setOutput(prev => [...prev, { type, data, timestamp: new Date() }]);
      
      if (type === 'close') {
        setIsRunning(false);
      }
    };

    ipcRenderer.on('terminal-output', handleTerminalOutput);

    return () => {
      ipcRenderer.removeListener('terminal-output', handleTerminalOutput);
    };
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const handleClear = () => {
    setOutput([]);
  };

  const getOutputClass = (type) => {
    switch (type) {
      case 'stdout':
        return 'stdout';
      case 'stderr':
        return 'stderr';
      case 'close':
        return 'info';
      default:
        return '';
    }
  };

  const formatOutput = (data) => {
    // Remove ANSI color codes for cleaner display
    return data.replace(/\x1b\[[0-9;]*m/g, '');
  };

  return (
    <div className="terminal-container" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#0d1117',
    }}>
      {/* Terminal Header */}
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
            💻 Terminal Output
          </span>
          {isRunning && (
            <span className="badge badge-success" style={{ fontSize: '11px' }}>
              ● Live
            </span>
          )}
        </div>
        
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleClear}
        >
          🗑 Clear
        </button>
      </div>

      {/* Terminal Output */}
      <div
        ref={outputRef}
        className="terminal-output"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px',
          fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
          fontSize: '13px',
          lineHeight: '1.5',
        }}
      >
        {output.length === 0 ? (
          <div style={{ color: '#8b949e', fontStyle: 'italic' }}>
            No output yet. Start a Ralph loop to see terminal output here.
          </div>
        ) : (
          output.map((line, index) => (
            <div
              key={index}
              className={`terminal-output ${getOutputClass(line.type)}`}
              style={{
                color: line.type === 'stdout' ? '#c9d1d9' :
                       line.type === 'stderr' ? '#ff7b72' :
                       line.type === 'close' ? '#58a6ff' : '#c9d1d9',
                marginBottom: '4px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              <span style={{ color: '#8b949e', marginRight: '8px' }}>
                [{line.timestamp.toLocaleTimeString()}]
              </span>
              {formatOutput(line.data)}
            </div>
          ))
        )}
      </div>

      {/* Terminal Footer */}
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
        <div>
          {output.length} lines
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <span>Output: {output.filter(l => l.type === 'stdout').length}</span>
          <span>Errors: {output.filter(l => l.type === 'stderr').length}</span>
        </div>
      </div>
    </div>
  );
}

export default Terminal;
