import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  AlertTriangle,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  Link2,
  Clock,
  Sparkles,
  CheckCircle2,
  Lightbulb
} from 'lucide-react';

export default function RiskRadar({ analysis, onLaunchRecovery, isGeneratingRecovery }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!analysis) return null;

  const { overallRisk, risks = [], blockedTaskIds = [] } = analysis;
  const level = overallRisk?.level || 'LOW';
  const score = overallRisk?.score ?? 0;
  const riskClass = level.toLowerCase();

  // Sort risks: Blocked dependencies & Critical severity first
  const sortedRisks = useMemo(() => {
    return [...risks].sort((a, b) => {
      const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const scoreA = (severityOrder[a.severity] || 0) + (a.type?.includes('BLOCKED') ? 10 : 0) + (a.type?.includes('OVERDUE') ? 5 : 0);
      const scoreB = (severityOrder[b.severity] || 0) + (b.type?.includes('BLOCKED') ? 10 : 0) + (b.type?.includes('OVERDUE') ? 5 : 0);
      return scoreB - scoreA;
    });
  }, [risks]);

  // Display top 3 by default, or all if expanded
  const visibleRisks = isExpanded ? sortedRisks : sortedRisks.slice(0, 3);
  const hasHiddenRisks = sortedRisks.length > 3;

  const getRiskIcon = (type, severity) => {
    if (type?.includes('BLOCKED')) return <Link2 size={14} className="shrink-0" />;
    if (type?.includes('OVERDUE')) return <Clock size={14} className="shrink-0" />;
    if (severity === 'CRITICAL') return <AlertOctagon size={14} className="shrink-0" />;
    return <AlertTriangle size={14} className="shrink-0" />;
  };

  const getScoreColor = () => {
    if (level === 'CRITICAL') return '#ef4444';
    if (level === 'HIGH') return '#f97316';
    if (level === 'MEDIUM') return '#facc15';
    return '#10b981';
  };

  return (
    <div className={`glass-panel risk-radar-card risk-${riskClass}`} id="risk-radar-section">
      {/* Top Header & Prominent Score Display */}
      <div className="risk-radar-header">
        <div className="risk-title-area">
          <div className="risk-icon-shield" style={{ color: getScoreColor() }}>
            {level === 'LOW' ? <ShieldCheck size={26} /> : <ShieldAlert size={26} />}
          </div>
          <div className="risk-title-details">
            <div className="risk-heading-row">
              <h2>Deterministic Risk Radar & Health Check</h2>
              <span className={`risk-badge ${riskClass}`} id="overall-risk-level-badge">
                {level} RISK · {score}/100 SCORE
              </span>
            </div>
            <p className="risk-summary-text" id="risk-summary-message">
              {overallRisk?.summary || 'Deterministic operational risk analysis across dependencies and deadlines.'}
            </p>
          </div>
        </div>

        {/* AI Recovery Action Launch Button */}
        {risks.length > 0 && (
          <div className="risk-action-group">
            <button
              id="btn-launch-ai-recovery"
              className="btn btn-primary btn-launch-recovery"
              onClick={onLaunchRecovery}
              disabled={isGeneratingRecovery}
              title="Activate AI Recovery Planner to calculate optimal milestone rescheduling"
            >
              <Zap size={15} className={isGeneratingRecovery ? 'spinner' : ''} />
              <span>{isGeneratingRecovery ? 'Synthesizing Recovery...' : 'Launch AI Recovery Planner'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Prominent Risk Meter Gauge Bar */}
      <div className="risk-meter-wrapper" title={`Systemic Risk: ${score}% (${level})`}>
        <div className="risk-meter-labels">
          <span className="risk-meter-label-left">
            Operational Health Meter: <strong>{100 - score}% Clean Flow</strong>
          </span>
          <span className="risk-meter-label-right" style={{ color: getScoreColor() }}>
            {score}% Risk Exposure ({risks.length} active risk flag{risks.length === 1 ? '' : 's'})
          </span>
        </div>
        <div className="risk-meter-track">
          <div
            className={`risk-meter-fill fill-${riskClass}`}
            style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
          ></div>
        </div>
      </div>

      {/* Risk Items Cards (Prioritizes Blocked Dependencies & Critical Milestones First) */}
      {sortedRisks.length > 0 ? (
        <div className="risk-body-section">
          <div className="risk-items-grid">
            {visibleRisks.map((risk, index) => {
              const isBlocked = risk.type?.includes('BLOCKED');
              const isOverdue = risk.type?.includes('OVERDUE');

              return (
                <div
                  key={risk.id || `risk-${index}`}
                  className={`risk-item-card ${isBlocked ? 'card-blocked-risk' : ''} ${isOverdue ? 'card-overdue-risk' : ''}`}
                  id={`risk-item-${risk.id || index}`}
                >
                  <div className="risk-item-top">
                    <span className="risk-item-type-badge">
                      {getRiskIcon(risk.type, risk.severity)}
                      <span>{risk.type?.replace(/_/g, ' ') || 'RISK EVENT'}</span>
                    </span>
                    <span className={`risk-badge badge-sm ${risk.severity?.toLowerCase() || 'medium'}`}>
                      {risk.severity}
                    </span>
                  </div>

                  <div className="risk-item-msg">
                    {risk.taskTitle && (
                      <strong className="risk-task-highlight">
                        [{risk.taskTitle}]
                      </strong>
                    )}{' '}
                    <span>{risk.message}</span>
                  </div>

                  {risk.remedyRecommendation && (
                    <div className="risk-item-remedy-box">
                      <div className="remedy-header">
                        <Lightbulb size={12} className="shrink-0" />
                        <span>Recommended Remediation:</span>
                      </div>
                      <p className="remedy-text">{risk.remedyRecommendation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Expand/Collapse Toggle for Remaining Risks */}
          {hasHiddenRisks && (
            <div className="risk-expand-row">
              <button
                className="btn btn-secondary btn-sm btn-risk-expand"
                onClick={() => setIsExpanded(!isExpanded)}
                id="btn-toggle-all-risks"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp size={14} />
                    <span>Show Top Critical Only (3 of {sortedRisks.length})</span>
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} />
                    <span>Show All {sortedRisks.length} Detected Risks (+{sortedRisks.length - 3} more)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="risk-optimized-box">
          <CheckCircle2 size={18} style={{ color: '#34d399' }} />
          <span>
            <strong>Operational Critical Path is Fully Optimized:</strong> Zero overdue milestones, dependency deadlocks, or critical vulnerabilities detected.
          </span>
        </div>
      )}
    </div>
  );
}
