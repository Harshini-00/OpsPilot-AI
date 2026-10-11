import React, { useState } from 'react';
import { X, Sparkles, Layers, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CreateOpModal({ isOpen, onClose, onCreateOperation, isCreating }) {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [deadline, setDeadline] = useState('');
  const [teamMembersInput, setTeamMembersInput] = useState('Alex Rivera (Lead), Sarah Chen (DevOps), Marcus Brody (Logistics), Elena Rostova (QA)');
  const [useAiPlan, setUseAiPlan] = useState(true);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide an Operation Name');
      return;
    }

    const teamMembers = teamMembersInput
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);

    setError('');
    onCreateOperation({
      name: name.trim(),
      goal: goal.trim(),
      deadline: deadline || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      teamMembers,
      useAiPlan
    });
  };

  return (
    <div className="modal-overlay" id="create-op-modal-overlay">
      <div className="modal-content" id="create-op-modal-content">
        <div className="modal-header">
          <div>
            <h2>
              <Sparkles size={20} style={{ color: '#818cf8' }} />
              Launch New AI Operation
            </h2>
            <p>Define the objective and let OpsPilot AI build an execution plan.</p>
          </div>
          <button className="modal-close-btn" onClick={onClose} id="btn-close-create-modal">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.6rem 0.9rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} id="create-operation-form">
          <div className="form-group">
            <label className="form-label">Operation Name *</label>
            <input
              id="input-op-name"
              type="text"
              className="form-input"
              placeholder="e.g. InnovateX AI Hackathon, Cloud Migration Q4, Product Launch"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Strategic Objective / Goal</label>
            <textarea
              id="input-op-goal"
              className="form-textarea"
              placeholder="Describe the target outcome, scope, requirements, or deliverables..."
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Target Deadline</label>
              <input
                id="input-op-deadline"
                type="date"
                className="form-input"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Assigned Team Members</label>
              <input
                id="input-op-team"
                type="text"
                className="form-input"
                placeholder="Comma separated names..."
                value={teamMembersInput}
                onChange={(e) => setTeamMembersInput(e.target.value)}
              />
            </div>
          </div>

          {/* AI Planner Toggle */}
          <div className="ai-toggle-box">
            <div className="ai-toggle-left">
              <Sparkles size={22} style={{ color: '#818cf8' }} />
              <div>
                <div className="ai-toggle-title">Gemini AI Auto-Planner</div>
                <div className="ai-toggle-sub">
                  Automatically decomposes objective into prioritized sequential milestones and dependencies.
                </div>
              </div>
            </div>
            <input
              id="checkbox-use-ai-plan"
              type="checkbox"
              checked={useAiPlan}
              onChange={(e) => setUseAiPlan(e.target.checked)}
              style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#6366f1' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              id="btn-submit-create-op"
              type="submit"
              className="btn btn-primary"
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <div className="spinner"></div>
                  <span>Synthesizing Plan...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>{useAiPlan ? 'Generate with AI Planner' : 'Create Operation'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
