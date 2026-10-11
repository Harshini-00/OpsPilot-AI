import React, { useState } from 'react';
import { X, Zap, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, Check } from 'lucide-react';

export default function RecoveryModal({
  isOpen,
  onClose,
  recoveryData,
  onApplyAction,
  applyingActionId
}) {
  const [appliedActions, setAppliedActions] = useState(new Set());

  if (!isOpen || !recoveryData) return null;

  const { diagnosis, actions = [], source } = recoveryData;

  const handleApply = async (action) => {
    try {
      await onApplyAction(action);
      setAppliedActions((prev) => new Set(prev).add(action.id));
    } catch (err) {
      console.error('Failed to apply recovery action:', err);
    }
  };

  return (
    <div className="modal-overlay" id="recovery-modal-overlay">
      <div className="modal-content" style={{ maxWidth: 760 }} id="recovery-modal-content">
        <div className="modal-header">
          <div>
            <h2>
              <Zap size={22} style={{ color: '#818cf8' }} />
              OpsPilot AI Recovery Navigator
            </h2>
            <p>
              Autonomous corrective remedies designed by <strong>{source || 'Gemini Recovery Engine'}</strong>.
              Review and approve proposed actions before execution.
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose} id="btn-close-recovery-modal">
            <X size={20} />
          </button>
        </div>

        {/* Diagnosis Box */}
        <div
          style={{
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: 10,
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            fontSize: '0.88rem',
            lineHeight: 1.5,
            color: '#e0e7ff'
          }}
        >
          <strong style={{ color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <AlertTriangle size={15} />
            Autonomous Root Cause Diagnosis:
          </strong>
          {diagnosis}
        </div>

        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.9rem', color: '#f1f5f9' }}>
          Recommended Corrective Actions ({actions.length})
        </h3>

        {actions.length === 0 ? (
          <div className="empty-state">
            <ShieldCheck size={32} style={{ color: '#4ade80' }} />
            <p>No corrective interventions required at this moment.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {actions.map((act) => {
              const isApplied = appliedActions.has(act.id);
              const isProcessing = applyingActionId === act.id;

              return (
                <div
                  key={act.id}
                  className="recovery-action-card"
                  id={`recovery-action-${act.id}`}
                  style={{
                    borderColor: isApplied ? 'rgba(16, 185, 129, 0.4)' : undefined,
                    background: isApplied ? 'rgba(16, 185, 129, 0.05)' : undefined
                  }}
                >
                  <div className="rec-action-top">
                    <span className="rec-action-badge">{act.actionType}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                      Target: {act.targetTaskTitle}
                    </span>
                  </div>

                  {/* Proposed Changes Diff */}
                  <div className="rec-diff-box">
                    {act.proposedChanges?.newDueDate && (
                      <div className="rec-diff-line add">
                        <span>→ Adjust Deadline:</span>
                        <strong>{act.proposedChanges.newDueDate}</strong>
                      </div>
                    )}
                    {act.proposedChanges?.newOwner && (
                      <div className="rec-diff-line add">
                        <span>→ Reassign Owner:</span>
                        <strong>{act.proposedChanges.newOwner}</strong>
                      </div>
                    )}
                    {act.proposedChanges?.newPriority && (
                      <div className="rec-diff-line add">
                        <span>→ Elevate Priority:</span>
                        <strong>{act.proposedChanges.newPriority}</strong>
                      </div>
                    )}
                    {act.proposedChanges?.removeDependencyId && (
                      <div className="rec-diff-line add">
                        <span>→ Decouple Blocker:</span>
                        <strong>Prerequisite unblocked (parallelize track)</strong>
                      </div>
                    )}
                  </div>

                  <p className="rec-reason">{act.reason}</p>
                  <div className="rec-impact">
                    Operational Impact: {act.impact}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    {isApplied ? (
                      <span
                        className="btn btn-success btn-sm"
                        style={{ cursor: 'default' }}
                      >
                        <Check size={14} />
                        <span>Action Approved & Applied</span>
                      </span>
                    ) : (
                      <button
                        id={`btn-approve-recovery-${act.id}`}
                        className="btn btn-primary btn-sm"
                        onClick={() => handleApply(act)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <>
                            <div className="spinner" style={{ width: 14, height: 14 }}></div>
                            <span>Applying Action...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={14} />
                            <span>Approve & Execute Action</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid var(--bg-glass-border)', paddingTop: '1rem' }}>
          <button className="btn btn-secondary" onClick={onClose} id="btn-done-recovery">
            Close Recovery Navigator
          </button>
        </div>
      </div>
    </div>
  );
}
