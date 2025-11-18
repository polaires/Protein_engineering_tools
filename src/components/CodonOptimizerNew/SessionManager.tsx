/**
 * Session Manager Component
 * Handles saving and loading optimization sessions
 */

import React, { useState, useEffect } from 'react';
import { Save, FolderOpen, Trash2 } from 'lucide-react';
import { OptimizationResponse, SavedSession } from '../../types/codon';

interface SessionManagerProps {
  result: OptimizationResponse | null;
  onLoadSession: (result: OptimizationResponse) => void;
}

const MAX_SESSIONS = 5;
const STORAGE_KEY = 'codon_optimizer_sessions';

export const SessionManager: React.FC<SessionManagerProps> = ({ result, onLoadSession }) => {
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [sessionToReplace, setSessionToReplace] = useState<string | null>(null);

  // Load sessions from localStorage on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSessions(parsed);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const saveSessions = (newSessions: SavedSession[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSessions));
      setSessions(newSessions);
    } catch (error) {
      console.error('Failed to save sessions:', error);
    }
  };

  const handleSaveClick = () => {
    if (!result) return;

    if (sessions.length >= MAX_SESSIONS) {
      setShowWarning(true);
      setShowSaveModal(true);
    } else {
      setShowWarning(false);
      setShowSaveModal(true);
    }
    setSessionName('');
  };

  const handleSaveSession = () => {
    if (!result || !sessionName.trim()) return;

    const newSession: SavedSession = {
      id: Date.now().toString(),
      name: sessionName.trim(),
      timestamp: Date.now(),
      result: result,
    };

    let updatedSessions: SavedSession[];

    if (sessions.length >= MAX_SESSIONS) {
      // Replace oldest session or specified session
      const indexToReplace = sessionToReplace
        ? sessions.findIndex(s => s.id === sessionToReplace)
        : 0; // Replace oldest (first) session

      updatedSessions = [...sessions];
      updatedSessions[indexToReplace] = newSession;
    } else {
      // Add new session
      updatedSessions = [newSession, ...sessions];
    }

    saveSessions(updatedSessions);
    setShowSaveModal(false);
    setSessionToReplace(null);
  };

  const handleLoadSession = (session: SavedSession) => {
    onLoadSession(session.result);
  };

  const handleDeleteSession = (id: string) => {
    const updatedSessions = sessions.filter(s => s.id !== id);
    saveSessions(updatedSessions);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="session-manager">
      <h4>Optimization Sessions</h4>

      <div className="session-buttons">
        <button
          className="action-btn"
          onClick={handleSaveClick}
          disabled={!result}
          title="Save current optimization"
        >
          <Save size={16} />
          Save Session
        </button>
        <button
          className="action-btn-compact"
          onClick={loadSessions}
          title="Refresh session list"
        >
          <FolderOpen size={16} />
          Refresh
        </button>
      </div>

      {sessions.length > 0 && (
        <div className="session-list">
          {sessions.map((session) => (
            <div key={session.id} className="session-item">
              <div className="session-info">
                <div className="session-name">{session.name}</div>
                <div className="session-date">{formatDate(session.timestamp)}</div>
                <div className="session-metrics">
                  <span>CAI: {session.result.final_cai.toFixed(4)}</span>
                  <span>GC: {(session.result.gc_content_final * 100).toFixed(2)}%</span>
                  <span>Changes: {session.result.changes.length}</span>
                </div>
              </div>
              <div className="session-actions">
                <button
                  className="session-btn session-btn-load"
                  onClick={() => handleLoadSession(session)}
                  title="Load this session"
                >
                  Load
                </button>
                <button
                  className="session-btn session-btn-delete"
                  onClick={() => handleDeleteSession(session.id)}
                  title="Delete this session"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sessions.length === 0 && (
        <p style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
          No saved sessions yet. Save your first optimization above!
        </p>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-header">Save Optimization Session</h3>

            {showWarning && (
              <div className="session-limit-warning">
                <strong>Session Limit Reached ({MAX_SESSIONS})</strong>
                {sessionToReplace ? (
                  <span>The selected session will be replaced.</span>
                ) : (
                  <span>The oldest session will be replaced unless you select one below.</span>
                )}
              </div>
            )}

            <div className="modal-body">
              <label>
                Session Name:
                <input
                  type="text"
                  className="modal-input"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="Enter a name for this session"
                  autoFocus
                />
              </label>

              {showWarning && (
                <div style={{ marginTop: '15px' }}>
                  <label style={{ fontSize: '14px', color: '#666', display: 'block', marginBottom: '8px' }}>
                    Replace session (optional):
                  </label>
                  <select
                    className="modal-input"
                    value={sessionToReplace || ''}
                    onChange={(e) => setSessionToReplace(e.target.value || null)}
                  >
                    <option value="">Oldest session (default)</option>
                    {sessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="modal-buttons">
              <button
                className="modal-btn modal-btn-secondary"
                onClick={() => {
                  setShowSaveModal(false);
                  setSessionToReplace(null);
                }}
              >
                Cancel
              </button>
              <button
                className="modal-btn modal-btn-primary"
                onClick={handleSaveSession}
                disabled={!sessionName.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
