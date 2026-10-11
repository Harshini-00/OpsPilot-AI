import React from 'react';
import {
  Plus,
  Check,
  Play,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Link2,
  Calendar,
  Zap,
  AlertCircle,
  Clock,
  AlertOctagon,
  CheckCircle2,
  User,
  ArrowRight
} from 'lucide-react';

export default function TaskBoard({
  tasks = [],
  analysis,
  onUpdateStatus,
  onDeleteTask,
  onOpenAddTask,
  onLaunchRecovery
}) {
  const taskRiskMap = analysis?.taskRiskMap || {};
  const blockedTaskIds = new Set(analysis?.blockedTaskIds || []);
  const dependentsMap = analysis?.dependentsMap || {};

  // Task filtering for balanced 4-column kanban
  const blockedTasks = tasks.filter(
    (t) => t.status === 'Blocked' || (blockedTaskIds.has(t.id) && t.status !== 'Completed')
  );
  const todoTasks = tasks.filter(
    (t) => (t.status === 'To Do' || t.status === 'Pending') && !blockedTaskIds.has(t.id) && t.status !== 'Blocked'
  );
  const inProgressTasks = tasks.filter(
    (t) => t.status === 'In Progress' && !blockedTaskIds.has(t.id)
  );
  const completedTasks = tasks.filter((t) => t.status === 'Completed');

  const getPriorityClass = (priority) => {
    if (!priority) return 'p2';
    if (priority.includes('P0')) return 'p0';
    if (priority.includes('P1')) return 'p1';
    if (priority.includes('P2')) return 'p2';
    return 'p3';
  };

  const getPriorityLabel = (priority) => {
    if (!priority) return 'P2 · Medium';
    if (priority.includes('P0')) return 'P0 · Critical';
    if (priority.includes('P1')) return 'P1 · High';
    if (priority.includes('P2')) return 'P2 · Medium';
    return 'P3 · Low';
  };

  const isOverdue = (task) => {
    if (task.status === 'Completed') return false;
    if (!task.dueDate) return false;
    const due = new Date(task.dueDate.split('T')[0]);
    const today = new Date(new Date().toISOString().split('T')[0]);
    return due < today;
  };

  // Identify prerequisite tasks blocking this task
  const getBlockerTasks = (task) => {
    if (!task.dependencies || task.dependencies.length === 0) return [];
    return task.dependencies
      .map((depId) => tasks.find((t) => t.id === depId))
      .filter(Boolean);
  };

  const renderTaskCard = (task) => {
    const overdue = isOverdue(task);
    const blocked = blockedTaskIds.has(task.id) || task.status === 'Blocked';
    const priorityClass = getPriorityClass(task.priority);
    const affected = dependentsMap[task.id] || [];
    const blockerTasks = getBlockerTasks(task);

    return (
      <div
        key={task.id}
        id={`task-card-${task.id}`}
        className={`task-card ${overdue ? 'is-overdue' : ''} ${blocked ? 'is-blocked' : ''}`}
      >
        {/* Card Top: Priority Pill + Task Tag */}
        <div className="task-card-header">
          <span className={`task-priority-pill ${priorityClass}`} title={`Priority: ${task.priority}`}>
            {getPriorityLabel(task.priority)}
          </span>
          <span className="task-id-badge" title={`Milestone ID: ${task.id}`}>
            {task.id.length > 14 ? `${task.id.slice(0, 12)}…` : task.id}
          </span>
        </div>

        {/* Task Title */}
        <h4 className="task-card-title" title={task.title}>
          {task.title}
        </h4>

        {/* Task Description */}
        {task.description && (
          <p className="task-card-desc" title={task.description}>
            {task.description}
          </p>
        )}

        {/* Overdue Breach Alert */}
        {overdue && (
          <div className="task-overdue-banner" title={`Milestone was due on ${task.dueDate}`}>
            <AlertTriangle size={13} className="shrink-0" />
            <span>OVERDUE SCHEDULE BREACH</span>
          </div>
        )}

        {/* Delay Cascade Impact Banner */}
        {overdue && affected.length > 0 && (
          <div className="task-cascade-affected-banner" id={`cascade-banner-${task.id}`}>
            <div className="cascade-title">
              <AlertCircle size={13} className="shrink-0" />
              <span>Delay affects {affected.length} milestone{affected.length > 1 ? 's' : ''}:</span>
            </div>
            <div className="cascade-list">
              {affected.map((aff) => (
                <div key={aff.id} className="cascade-item">
                  • <strong>{aff.title}</strong> ({aff.owner || 'Unassigned'})
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Blocked Explanation with explicit prerequisite titles */}
        {blocked && (
          <div className="task-blocker-banner" title="Waiting on prerequisite milestones to deliver first">
            <Link2 size={13} className="shrink-0" />
            <div className="blocker-content">
              <span className="blocker-title">BLOCKED BY PREREQUISITE</span>
              {blockerTasks.length > 0 ? (
                <div className="blocker-items-list">
                  {blockerTasks.map((b) => (
                    <span key={b.id} className="blocker-item-text">
                      ↳ {b.title} <em className={`blocker-status-tag status-${(b.status || 'todo').toLowerCase().replace(/\s+/g, '-')}`}>[{b.status}]</em>
                    </span>
                  ))}
                </div>
              ) : (
                <span className="blocker-item-text">↳ Waiting on dependency clearance</span>
              )}
            </div>
          </div>
        )}

        {/* Metadata Footer: Owner & Due Date */}
        <div className="task-card-footer">
          <div className="task-owner-info" title={`Assigned to ${task.owner}`}>
            <span className="task-owner-avatar">
              {(task.owner || 'U').charAt(0).toUpperCase()}
            </span>
            <span className="task-owner-name">{task.owner || 'Unassigned'}</span>
          </div>

          <div className={`task-due-date ${overdue ? 'overdue-text' : ''}`} title={`Due: ${task.dueDate}`}>
            <Calendar size={12} className="shrink-0" />
            <span>{task.dueDate || 'No due date'}</span>
          </div>
        </div>

        {/* Suggest Revised Plan Button for Overdue / Cascading Delays */}
        {overdue && onLaunchRecovery && (
          <button
            id={`btn-suggest-replanning-${task.id}`}
            className="btn btn-warning btn-sm btn-replan"
            onClick={onLaunchRecovery}
            title="Evaluate bottleneck and auto-generate AI recovery plan"
          >
            <Zap size={12} />
            <span>Suggest Revised Plan</span>
          </button>
        )}

        {/* Actions & Status Control */}
        <div className="task-card-actions">
          <div className="task-status-row">
            <select
              id={`select-status-${task.id}`}
              className="task-status-dropdown"
              value={task.status}
              onChange={(e) => onUpdateStatus(task.id, e.target.value)}
              title="Change task status directly"
              aria-label={`Change status for ${task.title}`}
            >
              <option value="To Do">Pending / To Do</option>
              <option value="Blocked">Blocked</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>

            {/* Delete button */}
            <button
              className="btn btn-danger btn-sm btn-delete-task"
              onClick={() => onDeleteTask(task.id)}
              title="Delete milestone"
              id={`btn-delete-${task.id}`}
              aria-label={`Delete task ${task.title}`}
            >
              <Trash2 size={13} />
            </button>
          </div>

          {/* Quick Transition Advance Button */}
          <div className="task-quick-action-wrap">
            {task.status === 'Blocked' && (
              <button
                className="btn btn-warning btn-sm btn-full"
                onClick={() => onUpdateStatus(task.id, 'In Progress')}
                title="Force unblock and mark In Progress"
                id={`btn-unblock-${task.id}`}
              >
                <Play size={12} />
                <span>Force Unblock</span>
              </button>
            )}

            {(task.status === 'To Do' || task.status === 'Pending') && (
              <button
                className="btn btn-secondary btn-sm btn-full"
                onClick={() => onUpdateStatus(task.id, 'In Progress')}
                title="Start task (move to In Progress)"
                id={`btn-start-${task.id}`}
              >
                <Play size={12} />
                <span>Start Milestone</span>
              </button>
            )}

            {task.status === 'In Progress' && (
              <button
                className="btn btn-success btn-sm btn-full"
                onClick={() => onUpdateStatus(task.id, 'Completed')}
                title="Mark milestone as Completed"
                id={`btn-complete-${task.id}`}
              >
                <Check size={12} />
                <span>Mark Done</span>
              </button>
            )}

            {task.status === 'Completed' && (
              <button
                className="btn btn-secondary btn-sm btn-full"
                onClick={() => onUpdateStatus(task.id, 'In Progress')}
                title="Reopen milestone"
                id={`btn-reopen-${task.id}`}
              >
                <RotateCcw size={12} />
                <span>Reopen</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="taskboard-container" id="task-board-container">
      {/* Board Header */}
      <div className="taskboard-header">
        <div className="taskboard-title-group">
          <h2>Operations Kanban & Milestone Pipeline</h2>
          <p className="taskboard-sub">
            Balanced 4-stage delivery pipeline tracking dependencies, schedule breaches, and status transitions.
          </p>
        </div>
        <button
          id="btn-open-add-task-modal"
          className="btn btn-primary btn-sm"
          onClick={onOpenAddTask}
          title="Create a new milestone in this operation"
        >
          <Plus size={14} />
          <span>Add Custom Task</span>
        </button>
      </div>

      {/* 4 Balanced Kanban Columns */}
      <div className="columns-wrapper" id="kanban-columns-scroll-area">
        {/* COLUMN 1: PENDING (TO DO) */}
        <div className="task-column column-pending-style" id="column-todo">
          <div className="column-header">
            <span className="column-title">
              <span className="column-indicator-dot dot-pending"></span>
              <Clock size={14} className="column-icon" />
              Pending ({todoTasks.length})
            </span>
            <span className="column-count-badge badge-pending" id="count-todo">{todoTasks.length}</span>
          </div>
          <div className="column-tasks">
            {todoTasks.length > 0 ? (
              todoTasks.map(renderTaskCard)
            ) : (
              <div className="column-empty-state">
                <Clock size={24} className="empty-icon" />
                <p className="empty-title">No pending tasks</p>
                <span className="empty-sub">All planned milestones are active or finished</span>
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 2: BLOCKED */}
        <div className="task-column column-blocked-style" id="column-blocked">
          <div className="column-header">
            <span className="column-title title-blocked">
              <span className="column-indicator-dot dot-blocked"></span>
              <AlertOctagon size={14} className="column-icon" />
              Blocked ({blockedTasks.length})
            </span>
            <span className="column-count-badge badge-blocked" id="count-blocked">{blockedTasks.length}</span>
          </div>
          <div className="column-tasks">
            {blockedTasks.length > 0 ? (
              blockedTasks.map(renderTaskCard)
            ) : (
              <div className="column-empty-state empty-state-positive">
                <CheckCircle2 size={24} className="empty-icon" />
                <p className="empty-title">Zero blocked milestones</p>
                <span className="empty-sub">Dependency critical path is flowing without disruption</span>
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3: IN PROGRESS */}
        <div className="task-column column-inprogress-style" id="column-in-progress">
          <div className="column-header">
            <span className="column-title title-inprogress">
              <span className="column-indicator-dot dot-inprogress"></span>
              <Play size={14} className="column-icon" />
              In Progress ({inProgressTasks.length})
            </span>
            <span className="column-count-badge badge-inprogress" id="count-inprogress">{inProgressTasks.length}</span>
          </div>
          <div className="column-tasks">
            {inProgressTasks.length > 0 ? (
              inProgressTasks.map(renderTaskCard)
            ) : (
              <div className="column-empty-state">
                <Play size={24} className="empty-icon" />
                <p className="empty-title">No active workstreams</p>
                <span className="empty-sub">Dispatch pending tasks to commence execution</span>
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 4: COMPLETED */}
        <div className="task-column column-completed-style" id="column-completed">
          <div className="column-header">
            <span className="column-title title-completed">
              <span className="column-indicator-dot dot-completed"></span>
              <CheckCircle2 size={14} className="column-icon" />
              Completed ({completedTasks.length})
            </span>
            <span className="column-count-badge badge-completed" id="count-completed">{completedTasks.length}</span>
          </div>
          <div className="column-tasks">
            {completedTasks.length > 0 ? (
              completedTasks.map(renderTaskCard)
            ) : (
              <div className="column-empty-state">
                <CheckCircle2 size={24} className="empty-icon" />
                <p className="empty-title">No completed milestones</p>
                <span className="empty-sub">Mark tasks done as objectives are delivered</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
