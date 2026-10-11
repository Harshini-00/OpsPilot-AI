import React, { useState, useEffect } from 'react';
import { X, Plus, AlertCircle, Calendar, User, Flag, Link2 } from 'lucide-react';

export default function AddTaskModal({
  isOpen,
  onClose,
  onAddTask,
  teamMembers = [],
  existingTasks = []
}) {
  const getDefaultDate = () => {
    return new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  };

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState(teamMembers[0] || 'Operations Lead');
  const [dueDate, setDueDate] = useState(getDefaultDate());
  const [priority, setPriority] = useState('P1 - High');
  const [dependency, setDependency] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync owner and date when modal opens or teamMembers change
  useEffect(() => {
    if (isOpen) {
      if (teamMembers && teamMembers.length > 0) {
        setOwner(teamMembers[0]);
      } else {
        setOwner('Operations Lead');
      }
      setDueDate(getDefaultDate());
      setError('');
    }
  }, [isOpen, teamMembers]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      await onAddTask({
        title: title.trim(),
        description: description.trim(),
        owner: owner || 'Operations Lead',
        dueDate: dueDate || getDefaultDate(),
        priority,
        status: 'To Do',
        dependencies: dependency ? [dependency] : []
      });

      // Reset form fields upon successful addition
      setTitle('');
      setDescription('');
      setDependency('');
      setError('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create task. Please check server connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      id="add-task-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-content" id="add-task-modal-content" role="dialog" aria-modal="true" aria-labelledby="modal-title-add-task">
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 id="modal-title-add-task">
              <Plus size={20} style={{ color: '#818cf8', marginRight: '0.4rem' }} />
              Add Custom Milestone Task
            </h2>
            <p>Create a structured operational milestone and attach dependencies.</p>
          </div>
          <button
            className="modal-close-btn"
            onClick={onClose}
            id="btn-close-add-task-modal"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div
            id="add-task-error-alert"
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              padding: '0.65rem 1rem',
              borderRadius: 8,
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} id="add-task-form">
          <div className="form-group">
            <label className="form-label" htmlFor="input-task-title">
              Task Title *
            </label>
            <input
              id="input-task-title"
              type="text"
              className="form-input"
              placeholder="e.g. Conduct Load Testing, Provision Staging Cluster"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="input-task-desc">
              Description
            </label>
            <textarea
              id="input-task-desc"
              className="form-textarea"
              placeholder="Detailed specifications, criteria of acceptance, scope..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="select-task-owner">
                <User size={13} style={{ display: 'inline', marginRight: 4 }} />
                Assignee / Owner
              </label>
              <select
                id="select-task-owner"
                className="form-select"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
              >
                {teamMembers && teamMembers.length > 0 ? (
                  teamMembers.map((m, i) => (
                    <option key={i} value={m}>
                      {m}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Operations Lead">Operations Lead</option>
                    <option value="DevOps Lead">DevOps Lead</option>
                    <option value="Logistics Lead">Logistics Lead</option>
                    <option value="Event Chair">Event Chair</option>
                  </>
                )}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="select-task-priority">
                <Flag size={13} style={{ display: 'inline', marginRight: 4 }} />
                Priority
              </label>
              <select
                id="select-task-priority"
                className="form-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="P0 - Critical">P0 - Critical (Blocker)</option>
                <option value="P1 - High">P1 - High Priority</option>
                <option value="P2 - Medium">P2 - Medium Priority</option>
                <option value="P3 - Low">P3 - Low Priority</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="input-task-due-date">
                <Calendar size={13} style={{ display: 'inline', marginRight: 4 }} />
                Due Date
              </label>
              <input
                id="input-task-due-date"
                type="date"
                className="form-input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="select-task-dependency">
                <Link2 size={13} style={{ display: 'inline', marginRight: 4 }} />
                Prerequisite Dependency
              </label>
              <select
                id="select-task-dependency"
                className="form-select"
                value={dependency}
                onChange={(e) => setDependency(e.target.value)}
              >
                <option value="">None (Can start immediately)</option>
                {existingTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} [{t.status}]
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              id="btn-submit-add-task"
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  <span>Creating Task...</span>
                </>
              ) : (
                <>
                  <Plus size={16} />
                  <span>Create Task</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
