import React, { useState, useMemo } from 'react';
import {
  History,
  ShieldCheck,
  Zap,
  PlusCircle,
  CheckCircle,
  Bot,
  BrainCircuit,
  UserCheck,
  Filter,
  AlertTriangle,
  Search,
  X,
  FileText,
  Clock
} from 'lucide-react';

export default function ActivityLog({ activityLog = [] }) {
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'AGENT' | 'HUMAN' | 'TASKS' | 'RECOVERY'
  const [searchQuery, setSearchQuery] = useState('');

  // Chronological order: newest events first
  const reversedLogs = useMemo(() => {
    return [...activityLog].reverse();
  }, [activityLog]);

  const isSimulatedAction = (log) =>
    Boolean(
      log.isSimulated ||
      log.type?.startsWith('AI_') ||
      log.type === 'SIMULATION_RESET' ||
      log.actor?.includes('Agent') ||
      log.message?.includes('SIMULATED')
    );

  const isHumanDecision = (log) =>
    Boolean(
      log.type?.includes('HUMAN') ||
      log.type === 'RECOVERY_APPLIED' ||
      log.actor?.includes('Ops Lead') ||
      log.actor?.includes('User')
    );

  const isTaskEvent = (log) =>
    Boolean(
      log.type?.includes('TASK') ||
      log.type?.includes('STATUS') ||
      log.type === 'OPERATION_CREATED'
    );

  const isRecoveryEvent = (log) =>
    Boolean(
      log.type === 'RECOVERY_APPLIED' ||
      log.type === 'AI_PLAN_GENERATED' ||
      log.message?.includes('Recovery')
    );

  // Filter and search computation
  const filteredLogs = useMemo(() => {
    return reversedLogs.filter((log) => {
      // 1. Category Filter
      if (filterType === 'AGENT' && !isSimulatedAction(log)) return false;
      if (filterType === 'HUMAN' && !isHumanDecision(log)) return false;
      if (filterType === 'TASKS' && !isTaskEvent(log)) return false;
      if (filterType === 'RECOVERY' && !isRecoveryEvent(log)) return false;

      // 2. Text Search Filter
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const msgMatch = (log.message || '').toLowerCase().includes(q);
        const actorMatch = (log.actor || '').toLowerCase().includes(q);
        const typeMatch = (log.type || '').toLowerCase().includes(q);
        const reasonMatch = (log.agentRationale || '').toLowerCase().includes(q);
        return msgMatch || actorMatch || typeMatch || reasonMatch;
      }

      return true;
    });
  }, [reversedLogs, filterType, searchQuery]);

  const getLogCategoryBadge = (log) => {
    const type = log.type;
    const isSim = isSimulatedAction(log);

    if (type === 'HUMAN_APPROVAL') {
      return (
        <span className="log-badge badge-human-approved" title="Approved by human operations lead">
          <UserCheck size={11} />
          <span>HUMAN SIGN-OFF</span>
        </span>
      );
    }
    if (type === 'HUMAN_REJECTION') {
      return (
        <span className="log-badge badge-human-override" title="Overridden by human operator">
          <AlertTriangle size={11} />
          <span>HUMAN OVERRIDE</span>
        </span>
      );
    }
    if (type === 'RECOVERY_APPLIED') {
      return (
        <span className="log-badge badge-recovery" title="Approved recovery action executed">
          <Zap size={11} />
          <span>RECOVERY EXECUTED</span>
        </span>
      );
    }
    if (isSim) {
      return (
        <span className="log-badge badge-simulated" title="Automated agent orchestration step">
          <Bot size={11} />
          <span>AGENT DISPATCH</span>
        </span>
      );
    }
    if (type === 'TASK_COMPLETED') {
      return (
        <span className="log-badge badge-completed" title="Task finished">
          <CheckCircle size={11} />
          <span>COMPLETED</span>
        </span>
      );
    }
    if (type === 'STATUS_UPDATED') {
      return (
        <span className="log-badge badge-status" title="Status updated">
          <Clock size={11} />
          <span>STATUS CHANGE</span>
        </span>
      );
    }
    if (type === 'TASK_CREATED' || type === 'OPERATION_CREATED') {
      return (
        <span className="log-badge badge-created" title="Item created">
          <PlusCircle size={11} />
          <span>CREATED</span>
        </span>
      );
    }
    return (
      <span className="log-badge badge-system" title="System event">
        <FileText size={11} />
        <span>AUDIT EVENT</span>
      </span>
    );
  };

  const formatTimestamp = (isoString) => {
    if (!isoString) return 'Just now';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
      return `${timeStr} · ${dateStr}`;
    } catch {
      return isoString;
    }
  };

  return (
    <div className="glass-panel activity-feed-panel" id="activity-log-feed">
      {/* Header */}
      <div className="activity-feed-header">
        <div className="activity-title-wrap">
          <div className="activity-icon-box">
            <History size={16} />
          </div>
          <div>
            <h3>Operations Audit Trail & Decision Log</h3>
            <span className="activity-count-badge">
              {activityLog.length} recorded event{activityLog.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="activity-search-bar">
        <Search size={14} className="search-icon" />
        <input
          type="text"
          className="activity-search-input"
          placeholder="Filter audit logs by keyword, task, or actor..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search audit events"
        />
        {searchQuery && (
          <button
            className="search-clear-btn"
            onClick={() => setSearchQuery('')}
            title="Clear search filter"
            aria-label="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Responsive Filter Chips */}
      <div className="activity-filter-scroll-wrapper">
        <div className="activity-filter-tabs" role="tablist">
          <button
            className={`act-tab ${filterType === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilterType('ALL')}
            title="All recorded events"
            role="tab"
            aria-selected={filterType === 'ALL'}
          >
            All ({reversedLogs.length})
          </button>
          <button
            className={`act-tab ${filterType === 'AGENT' ? 'active' : ''}`}
            onClick={() => setFilterType('AGENT')}
            title="Automated agent orchestration events"
            role="tab"
            aria-selected={filterType === 'AGENT'}
          >
            🤖 Agent ({reversedLogs.filter(isSimulatedAction).length})
          </button>
          <button
            className={`act-tab ${filterType === 'HUMAN' ? 'active' : ''}`}
            onClick={() => setFilterType('HUMAN')}
            title="Human sign-offs & approvals"
            role="tab"
            aria-selected={filterType === 'HUMAN'}
          >
            🛡️ Human ({reversedLogs.filter(isHumanDecision).length})
          </button>
          <button
            className={`act-tab ${filterType === 'TASKS' ? 'active' : ''}`}
            onClick={() => setFilterType('TASKS')}
            title="Task updates and milestone completions"
            role="tab"
            aria-selected={filterType === 'TASKS'}
          >
            📋 Tasks ({reversedLogs.filter(isTaskEvent).length})
          </button>
          <button
            className={`act-tab ${filterType === 'RECOVERY' ? 'active' : ''}`}
            onClick={() => setFilterType('RECOVERY')}
            title="Recovery actions & replanning events"
            role="tab"
            aria-selected={filterType === 'RECOVERY'}
          >
            ⚡ Recovery ({reversedLogs.filter(isRecoveryEvent).length})
          </button>
        </div>
      </div>

      {/* Timeline Event Feed (Scrollable with controlled height) */}
      <div className="activity-timeline" id="activity-timeline-list">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log) => {
            const simulated = isSimulatedAction(log);
            const humanApproved = log.type === 'HUMAN_APPROVAL';
            const humanOverride = log.type === 'HUMAN_REJECTION';

            return (
              <div
                key={log.id}
                className={`activity-item ${simulated ? 'is-simulated' : ''} ${humanApproved ? 'is-human-approved' : ''} ${humanOverride ? 'is-human-override' : ''}`}
                id={`log-${log.id}`}
              >
                {/* Event Badge & Actor */}
                <div className="activity-item-header">
                  {getLogCategoryBadge(log)}
                  <span className="activity-actor-tag" title={`Action source: ${log.actor}`}>
                    {log.actor || 'System'}
                  </span>
                </div>

                {/* Primary Message */}
                <p className="activity-msg">{log.message}</p>

                {/* Decision Rationale Callout when available */}
                {log.agentRationale && (
                  <div className="log-rationale-box">
                    <div className="log-rationale-title">
                      <BrainCircuit size={12} className="shrink-0" />
                      <span>Decision Logic & "Why":</span>
                    </div>
                    <p className="log-rationale-text">{log.agentRationale}</p>
                  </div>
                )}

                {/* Timestamp & Scenario Tag */}
                <div className="activity-meta">
                  <span className="activity-time" title={log.timestamp}>
                    <Clock size={11} className="shrink-0" />
                    {formatTimestamp(log.timestamp)}
                  </span>
                  {simulated && (
                    <span className="activity-sim-indicator">
                      (Simulation Replay Event)
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="activity-empty-state">
            <History size={28} className="empty-icon" />
            <p className="empty-title">
              {searchQuery ? `No events match "${searchQuery}"` : 'No audit records in this view'}
            </p>
            <span className="empty-sub">
              {searchQuery ? 'Try clearing your search query or switching categories.' : 'New operational actions will appear here in real-time.'}
            </span>
            {(searchQuery || filterType !== 'ALL') && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSearchQuery('');
                  setFilterType('ALL');
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
