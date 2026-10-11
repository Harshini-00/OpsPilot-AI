import React from 'react';
import { Calendar, Users, Target, CheckCircle2, Clock, AlertTriangle, BarChart3, TrendingUp } from 'lucide-react';

export default function MetricsBar({ operation, analysis }) {
  if (!operation) return null;

  const metrics = analysis?.metrics || {
    totalTasks: operation.tasks?.length || 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueCount: 0,
    progressPercent: 0
  };

  const deadlineFormatted = operation.deadline
    ? new Date(operation.deadline).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'No deadline set';

  return (
    <div>
      {/* Operation Hero Card */}
      <div className="glass-panel op-hero" id="operation-hero-banner">
        <div className="op-hero-info">
          <h2 className="op-hero-title" id="operation-title-text">{operation.name}</h2>
          <p className="op-hero-goal" id="operation-goal-text">{operation.goal || 'No specific objective provided.'}</p>
          <div className="op-hero-meta">
            <div className="meta-item">
              <Calendar size={15} style={{ color: '#818cf8' }} />
              <span>Target: <strong>{deadlineFormatted}</strong></span>
            </div>
            <div className="meta-item">
              <Users size={15} style={{ color: '#818cf8' }} />
              <span>Team:</span>
              <div className="team-pill-list">
                {operation.teamMembers && operation.teamMembers.length > 0 ? (
                  operation.teamMembers.map((member, i) => (
                    <span key={i} className="team-pill">
                      {member}
                    </span>
                  ))
                ) : (
                  <span className="team-pill">Self-directed</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5 Core Metric Cards */}
      <div className="metrics-grid" id="dashboard-kpi-grid">
        {/* Total Tasks */}
        <div className="glass-panel metric-card accent-purple" id="metric-card-total">
          <div className="metric-header">
            <span className="metric-label">Total Workstreams</span>
            <div className="metric-icon-wrap" style={{ color: '#a5b4fc' }}>
              <Target size={18} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-value" id="kpi-total-tasks">{metrics.totalTasks}</span>
            <span className="metric-caption">tasks planned</span>
          </div>
        </div>

        {/* Progress % */}
        <div className="glass-panel metric-card accent-blue" id="metric-card-progress">
          <div className="metric-header">
            <span className="metric-label">Operational Progress</span>
            <div className="metric-icon-wrap" style={{ color: '#38bdf8' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-value" id="kpi-progress-percent">{metrics.progressPercent}%</span>
            <span className="metric-caption">completion rate</span>
          </div>
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{ width: `${Math.min(100, Math.max(0, metrics.progressPercent))}%` }}
            ></div>
          </div>
        </div>

        {/* Completed */}
        <div className="glass-panel metric-card accent-green" id="metric-card-completed">
          <div className="metric-header">
            <span className="metric-label">Completed</span>
            <div className="metric-icon-wrap" style={{ color: '#34d399' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-value" id="kpi-completed-tasks">{metrics.completedTasks}</span>
            <span className="metric-caption">delivered milestones</span>
          </div>
        </div>

        {/* Pending */}
        <div className="glass-panel metric-card accent-yellow" id="metric-card-pending">
          <div className="metric-header">
            <span className="metric-label">In Flight / Pending</span>
            <div className="metric-icon-wrap" style={{ color: '#facc15' }}>
              <Clock size={18} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-value" id="kpi-pending-tasks">{metrics.pendingTasks}</span>
            <span className="metric-caption">active workstreams</span>
          </div>
        </div>

        {/* Overdue / Critical */}
        <div className="glass-panel metric-card accent-red" id="metric-card-overdue">
          <div className="metric-header">
            <span className="metric-label">Overdue & Blocked</span>
            <div className="metric-icon-wrap" style={{ color: '#f87171' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-value" id="kpi-overdue-tasks" style={{ color: metrics.overdueCount > 0 ? '#f87171' : '#ffffff' }}>
              {metrics.overdueCount}
            </span>
            <span className="metric-caption">
              {metrics.overdueCount > 0 ? 'schedule breaches' : 'all on schedule'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
