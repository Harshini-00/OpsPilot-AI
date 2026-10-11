import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Sparkles,
  Bot,
  BrainCircuit,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  UserCheck,
  Zap,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function AgentSimulator({
  operation,
  simulationState,
  onAdvanceStep,
  onApproveAction,
  onResetSimulation,
  isAdvancing,
  isApproving,
  pendingAction
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const currentPhase = simulationState?.phase ?? 0;
  const currentDay = simulationState?.simulatedDay ?? 1;

  // Auto-play interval
  useEffect(() => {
    let timer = null;
    if (isPlaying && !isAdvancing && !pendingAction) {
      timer = setTimeout(() => {
        if (currentPhase >= 4) {
          setIsPlaying(false);
        } else {
          onAdvanceStep(currentPhase);
        }
      }, 3500);
    }

    if (pendingAction) {
      // Pause automatically when human authorization is needed
      setIsPlaying(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isPlaying, isAdvancing, currentPhase, pendingAction, onAdvanceStep]);

  const stages = [
    { num: 1, label: 'Day 1: Kickoff & Dispatch', desc: 'Scan dependencies & assign initial milestones' },
    { num: 2, label: 'Day 3: Velocity Check', desc: 'Prerequisite delivery & unblock downstream work' },
    { num: 3, label: 'Day 5: Delay Injection', desc: 'Detect vendor schedule breach & cascading block' },
    { num: 4, label: 'Day 7: Consequential Recovery', desc: 'Synthesize recovery plan (Awaiting Human Approval)' },
    { num: 5, label: 'Day 10: Final Delivery', desc: 'All milestones finalized & risk restored to 0' }
  ];

  return (
    <div className="glass-panel agent-simulator-deck" id="agent-simulator-panel">
      {/* Deck Header */}
      <div className="simulator-header">
        <div className="simulator-title-group">
          <div className="simulator-bot-icon">
            <Bot size={22} />
          </div>
          <div>
            <div className="simulator-heading-row">
              <h3>Autonomous Operations Agent Deck</h3>
              <span className="simulator-live-tag">
                <span className="pulse-dot"></span>
                <span>SIMULATION AUTO-PILOT</span>
              </span>
              <span className="sim-day-badge">Day {currentDay} of 10</span>
            </div>
            <p className="simulator-subtitle">
              Simulates real-world operational execution, autonomous task orchestration, disruption handling, and human-in-the-loop governance.
            </p>
          </div>
        </div>

        <div className="simulator-header-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse simulator deck' : 'Expand simulator deck'}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            <span>{isExpanded ? 'Minimize' : 'Expand'}</span>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="simulator-body">
          {/* Stepper / Timeline Bar */}
          <div className="simulator-timeline-wrapper">
            <div className="simulator-timeline-track">
              {stages.map((stg, idx) => {
                const isPassed = currentPhase > idx;
                const isCurrent = currentPhase === idx;

                return (
                  <div
                    key={stg.num}
                    className={`timeline-step-node ${isPassed ? 'completed' : ''} ${isCurrent ? 'active' : ''}`}
                    onClick={() => !isAdvancing && !pendingAction && onAdvanceStep(idx)}
                    title={stg.desc}
                  >
                    <div className="step-node-circle">
                      {isPassed ? <CheckCircle2 size={14} /> : <span>{stg.num}</span>}
                    </div>
                    <div className="step-node-text">
                      <span className="step-node-title">{stg.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Playback Controls & Action Buttons */}
          <div className="simulator-controls-bar">
            <div className="sim-controls-left">
              <button
                id="btn-sim-play-pause"
                className={`btn btn-sm ${isPlaying ? 'btn-warning' : 'btn-primary'}`}
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={isAdvancing || Boolean(pendingAction)}
                title={isPlaying ? 'Pause Auto-Pilot' : 'Run Auto-Pilot continuously'}
              >
                {isPlaying ? (
                  <>
                    <Pause size={14} />
                    <span>Pause Auto-Pilot</span>
                  </>
                ) : (
                  <>
                    <Play size={14} />
                    <span>Play Auto-Pilot</span>
                  </>
                )}
              </button>

              <button
                id="btn-sim-step-next"
                className="btn btn-secondary btn-sm"
                onClick={() => onAdvanceStep(currentPhase)}
                disabled={isAdvancing || Boolean(pendingAction) || isPlaying}
                title="Advance simulation by one phase"
              >
                {isAdvancing ? (
                  <>
                    <div className="spinner" style={{ width: 14, height: 14 }}></div>
                    <span>Agent Thinking...</span>
                  </>
                ) : (
                  <>
                    <SkipForward size={14} />
                    <span>Advance Next Phase</span>
                  </>
                )}
              </button>

              <button
                id="btn-sim-reset"
                className="btn btn-secondary btn-sm"
                onClick={onResetSimulation}
                disabled={isAdvancing || isApproving}
                title="Reset simulation timeline back to Day 1"
              >
                <RotateCcw size={14} />
                <span>Reset Simulation</span>
              </button>
            </div>

            <div className="sim-controls-right">
              <span className="sim-indicator-label">Agent State:</span>
              <span className={`sim-state-chip ${pendingAction ? 'state-awaiting' : currentPhase === 2 ? 'state-alert' : 'state-running'}`}>
                {pendingAction
                  ? 'Awaiting Human Approval'
                  : currentPhase === 2
                  ? 'Bottleneck Detected'
                  : currentPhase === 4
                  ? 'Goal Delivered'
                  : isPlaying
                  ? 'Auto-Pilot Active'
                  : 'Ready for Next Step'}
              </span>
            </div>
          </div>

          {/* Pending Consequential Human Approval Banner */}
          {pendingAction && (
            <div className="human-approval-gate-card" id="sim-human-approval-gate">
              <div className="approval-gate-header">
                <div className="approval-gate-badge">
                  <ShieldAlert size={16} />
                  <span>Consequential Action Requires Human Governance</span>
                </div>
                <span className="approval-paused-notice">Simulation Paused</span>
              </div>

              <div className="approval-gate-content">
                <h4 className="approval-action-title">{pendingAction.title}</h4>
                <p className="approval-action-desc">
                  The autonomous agent proposes to reallocate personnel and decouple dependency blockers on{' '}
                  <strong>"{pendingAction.targetTaskTitle}"</strong> to recover lost velocity.
                </p>

                {/* Proposed Changes Diff */}
                <div className="approval-diff-box">
                  {pendingAction.proposedChanges?.newOwner && (
                    <div className="approval-diff-line">
                      <span className="diff-label">Reassign / Pair Owner:</span>
                      <strong className="diff-val highlight-green">{pendingAction.proposedChanges.newOwner}</strong>
                    </div>
                  )}
                  {pendingAction.proposedChanges?.newDueDate && (
                    <div className="approval-diff-line">
                      <span className="diff-label">Adjust Due Date:</span>
                      <strong className="diff-val highlight-green">{pendingAction.proposedChanges.newDueDate}</strong>
                    </div>
                  )}
                  {pendingAction.proposedChanges?.decoupleTaskId && (
                    <div className="approval-diff-line">
                      <span className="diff-label">Decouple Prerequisite Blocker:</span>
                      <strong className="diff-val highlight-green">Parallelize downstream stream immediately</strong>
                    </div>
                  )}
                </div>

                <div className="approval-rationale-box">
                  <div className="rationale-header">
                    <BrainCircuit size={14} />
                    <span>Agent Decision Rationale ("Why"):</span>
                  </div>
                  <p>{pendingAction.agentRationale}</p>
                </div>

                <div className="approval-impact-tag">
                  <Zap size={14} />
                  <span>Expected Impact: {pendingAction.expectedImpact}</span>
                </div>

                {/* Human Decision Buttons */}
                <div className="approval-buttons-row">
                  <button
                    id="btn-sim-reject-action"
                    className="btn btn-secondary btn-sm"
                    onClick={() => onApproveAction(pendingAction, false)}
                    disabled={isApproving}
                  >
                    <AlertTriangle size={14} />
                    <span>Reject / Override Action</span>
                  </button>

                  <button
                    id="btn-sim-approve-action"
                    className="btn btn-primary btn-sm btn-approve"
                    onClick={() => onApproveAction(pendingAction, true)}
                    disabled={isApproving}
                  >
                    {isApproving ? (
                      <>
                        <div className="spinner" style={{ width: 14, height: 14 }}></div>
                        <span>Executing Approval...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        <span>Approve & Execute (Human Sign-off)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Agent Live Decision Reasoning Stream */}
          <div className="agent-thought-stream" id="sim-thought-stream">
            <div className="thought-stream-header">
              <BrainCircuit size={16} style={{ color: '#818cf8' }} />
              <h4>Live Agent Decision Feed</h4>
              <span className="thought-stream-source">Powered by Gemini AI Operations Engine</span>
            </div>

            <div className="thought-stream-content">
              {/* Perception */}
              <div className="thought-block perception">
                <div className="thought-tag">
                  <Clock size={13} />
                  <span>Agent Perception:</span>
                </div>
                <p>
                  {simulationState?.perception ||
                    `Observing operational state of "${operation?.name}". Scanning dependencies, milestone deadlines, and team capacity.`}
                </p>
              </div>

              {/* Reasoning */}
              <div className="thought-block reasoning">
                <div className="thought-tag">
                  <BrainCircuit size={13} />
                  <span>Decision Logic & "Why":</span>
                </div>
                <p>
                  {simulationState?.reasoning ||
                    `Dependencies must be resolved sequentially. Unblocked kickoff milestones are dispatched first to maintain high initial velocity.`}
                </p>
              </div>

              {/* Action output */}
              <div className="thought-block action">
                <div className="thought-tag">
                  <Zap size={13} />
                  <span>Action Executed:</span>
                </div>
                <p>
                  {simulationState?.actionSummary ||
                    `Phase ${currentPhase + 1} synchronized with operations engine.`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
