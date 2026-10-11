import React from 'react';
import { Layers, Plus, Sparkles, RefreshCw, Cpu, Activity, Database } from 'lucide-react';

export default function Navbar({
  operations,
  activeOpId,
  onSelectOp,
  onOpenCreateModal,
  onResetSample,
  systemHealth,
  isResetting
}) {
  const isGeminiActive = systemHealth?.geminiConfigured;
  const isMongoConnected = systemHealth?.database?.connected;

  return (
    <nav className="navbar" id="navbar-header">
      {/* Brand */}
      <div className="nav-brand">
        <div className="brand-logo-icon">
          <Layers size={22} />
        </div>
        <div className="brand-titles">
          <h1>
            OpsPilot AI
            <span className="brand-badge">Agentic v2.5</span>
          </h1>
          <span className="brand-subtitle">Autonomous Operations & Risk Recovery</span>
        </div>
      </div>

      {/* Center: Operation Selector & Status Badges */}
      <div className="nav-center">
        {operations && operations.length > 0 && (
          <div className="op-selector-wrapper" title="Switch active operation">
            <Activity size={15} style={{ color: '#818cf8', flexShrink: 0 }} />
            <select
              id="operation-select-dropdown"
              className="op-select"
              value={activeOpId || ''}
              onChange={(e) => onSelectOp(e.target.value)}
              aria-label="Switch active operation"
            >
              {operations.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Gemini AI Engine Status */}
        <div
          id="engine-status-indicator"
          className={`engine-status-tag ${isGeminiActive ? 'active' : 'mock'}`}
          title={isGeminiActive ? 'Google Gemini AI live integration active' : 'Running in Offline Heuristic Mode'}
        >
          <span className="pulse-dot"></span>
          <Cpu size={13} />
          <span>{isGeminiActive ? 'Gemini AI Live' : 'AI Offline Mode'}</span>
        </div>

        {/* Data Persistence Status Indicator */}
        <div
          id="storage-status-indicator"
          className={`storage-status-tag ${isMongoConnected ? 'mongo' : 'local'}`}
          title={isMongoConnected ? 'Connected to MongoDB Atlas cloud database' : 'Persisting reliably to local operations.json'}
        >
          <Database size={12} />
          <span>{isMongoConnected ? 'Atlas Cloud' : 'Local JSON'}</span>
        </div>
      </div>

      {/* Right Actions */}
      <div className="nav-actions">
        <button
          id="btn-reset-techfest-sample"
          className="btn btn-secondary btn-sm"
          onClick={onResetSample}
          disabled={isResetting}
          title="Reload TechFest 2026 Hackathon sample dataset"
          aria-label="Reload TechFest demo data"
        >
          <RefreshCw size={14} className={isResetting ? 'spinner' : ''} />
          <span>{isResetting ? 'Resetting...' : 'Seed TechFest Demo'}</span>
        </button>

        <button
          id="btn-open-create-operation"
          className="btn btn-primary btn-sm"
          onClick={onOpenCreateModal}
          title="Create a new operations initiative"
          aria-label="Create new operation"
        >
          <Sparkles size={15} />
          <span>New Operation</span>
        </button>
      </div>
    </nav>
  );
}
