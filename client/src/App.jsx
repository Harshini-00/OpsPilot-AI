import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import MetricsBar from './components/MetricsBar';
import RiskRadar from './components/RiskRadar';
import TaskBoard from './components/TaskBoard';
import ActivityLog from './components/ActivityLog';
import GoalPromptBar from './components/GoalPromptBar';
import CreateOpModal from './components/CreateOpModal';
import RecoveryModal from './components/RecoveryModal';
import AddTaskModal from './components/AddTaskModal';
import AgentSimulator from './components/AgentSimulator';
import {
  fetchHealth,
  fetchOperations,
  fetchOperationById,
  createOperation,
  addTask,
  updateTask,
  deleteTask,
  requestRecoveryPlan,
  applyRecoveryAction,
  seedSampleOperation,
  simulateStep,
  simulateApprove,
  simulateReset
} from './api';

export default function App() {
  const [operations, setOperations] = useState([]);
  const [activeOpId, setActiveOpId] = useState(null);
  const [activeOperation, setActiveOperation] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingOp, setIsCreatingOp] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);

  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [recoveryData, setRecoveryData] = useState(null);
  const [isGeneratingRecovery, setIsGeneratingRecovery] = useState(false);
  const [applyingActionId, setApplyingActionId] = useState(null);
  const [isResetting, setIsResetting] = useState(false);

  // Autonomous Agent Simulation Mode State
  const [isSimulationActive, setIsSimulationActive] = useState(true);
  const [simulationState, setSimulationState] = useState({
    phase: 0,
    simulatedDay: 1,
    perception: 'Agent initialized. Operational dependencies mapped across 6 workstreams.',
    reasoning: 'Ready to commence autonomous execution and milestone dispatch.',
    actionSummary: 'Simulator standing by.'
  });
  const [isAdvancingSim, setIsAdvancingSim] = useState(false);
  const [isApprovingSim, setIsApprovingSim] = useState(false);
  const [pendingSimAction, setPendingSimAction] = useState(null);

  // Initial Load
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [health, ops] = await Promise.all([
        fetchHealth().catch(() => null),
        fetchOperations()
      ]);

      setSystemHealth(health);
      setOperations(ops);

      if (ops.length > 0) {
        const initialId = ops[0].id;
        setActiveOpId(initialId);
        await loadOperationDetails(initialId);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
      setError('Could not connect to OpsPilot backend. Please ensure the backend server is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const loadOperationDetails = async (id) => {
    try {
      const data = await fetchOperationById(id);
      setActiveOperation(data.operation);
      setAnalysis(data.analysis);
      setPendingSimAction(null);
    } catch (err) {
      console.error('Failed to load operation:', err);
    }
  };

  const handleSelectOperation = async (id) => {
    setActiveOpId(id);
    await loadOperationDetails(id);
    setSimulationState({
      phase: 0,
      simulatedDay: 1,
      perception: 'Loaded operational context. Scanning milestones and dependency graph.',
      reasoning: 'Ready for simulated autonomous execution.',
      actionSummary: 'Operation selected.'
    });
    setPendingSimAction(null);
  };

  const handleCreateOperation = async (payload, startSimulation = true) => {
    try {
      setIsCreatingOp(true);
      const res = await createOperation(payload);
      setOperations((prev) => [res.operation, ...prev]);
      setActiveOpId(res.operation.id);
      setActiveOperation(res.operation);
      setAnalysis(res.analysis);
      setIsCreateModalOpen(false);

      if (startSimulation) {
        setIsSimulationActive(true);
        setSimulationState({
          phase: 0,
          simulatedDay: 1,
          perception: `AI Operations plan formulated for "${res.operation.name}". ${res.operation.tasks?.length || 0} milestones structured.`,
          reasoning: 'Kickoff milestones ready for autonomous dispatch.',
          actionSummary: 'Plan synthesized and staged for simulation.'
        });
        setPendingSimAction(null);
      }
    } catch (err) {
      console.error('Failed to create operation:', err);
      alert(`Error creating operation: ${err.message}`);
    } finally {
      setIsCreatingOp(false);
    }
  };

  // Simulation Handlers
  const handleAdvanceSimulation = async (phase) => {
    if (!activeOpId) return;
    try {
      setIsAdvancingSim(true);
      const res = await simulateStep(activeOpId, phase);
      setActiveOperation(res.operation);
      setAnalysis(res.analysis);
      setSimulationState(res.simulation);

      if (res.simulation?.pendingApprovalAction) {
        setPendingSimAction(res.simulation.pendingApprovalAction);
      } else {
        setPendingSimAction(null);
      }
    } catch (err) {
      console.error('Failed to advance simulation:', err);
      alert(`Simulation step failed: ${err.message}`);
    } finally {
      setIsAdvancingSim(false);
    }
  };

  const handleApproveSimAction = async (action, approved) => {
    if (!activeOpId) return;
    try {
      setIsApprovingSim(true);
      const res = await simulateApprove(activeOpId, {
        actionId: action.id,
        approved,
        action
      });
      setActiveOperation(res.operation);
      setAnalysis(res.analysis);
      setPendingSimAction(null);

      // If approved, advance to the final delivery stage
      if (approved) {
        await handleAdvanceSimulation(3);
      }
    } catch (err) {
      console.error('Failed to execute approval action:', err);
      alert(`Approval error: ${err.message}`);
    } finally {
      setIsApprovingSim(false);
    }
  };

  const handleResetSimulation = async () => {
    if (!activeOpId) return;
    try {
      setIsAdvancingSim(true);
      const res = await simulateReset(activeOpId);
      setActiveOperation(res.operation);
      setAnalysis(res.analysis);
      setSimulationState({
        phase: 0,
        simulatedDay: 1,
        perception: 'Timeline reset to Day 1 baseline.',
        reasoning: 'All workstreams restored for clean simulation replay.',
        actionSummary: 'Environment reset to Day 1.'
      });
      setPendingSimAction(null);
    } catch (err) {
      console.error('Failed to reset simulation:', err);
    } finally {
      setIsAdvancingSim(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    if (!activeOpId) return;
    try {
      const res = await updateTask(activeOpId, taskId, { status: newStatus }, 'User');
      setActiveOperation(res.operation);
      setAnalysis(res.analysis);
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleAddTask = async (taskPayload) => {
    if (!activeOpId) return;
    try {
      const res = await addTask(activeOpId, taskPayload);
      setActiveOperation(res.operation);
      setAnalysis(res.analysis);
      return res;
    } catch (err) {
      console.error('Failed to add task:', err);
      throw err;
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!activeOpId) return;
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await deleteTask(activeOpId, taskId);
      setActiveOperation(res.operation);
      setAnalysis(res.analysis);
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleLaunchRecovery = async () => {
    if (!activeOpId) return;
    try {
      setIsGeneratingRecovery(true);
      const plan = await requestRecoveryPlan(activeOpId);
      setRecoveryData(plan);
      setIsRecoveryModalOpen(true);
    } catch (err) {
      console.error('Failed to get recovery plan:', err);
      alert(`Could not generate recovery plan: ${err.message}`);
    } finally {
      setIsGeneratingRecovery(false);
    }
  };

  const handleApplyRecoveryAction = async (action) => {
    if (!activeOpId) return;
    try {
      setApplyingActionId(action.id);
      const res = await applyRecoveryAction(activeOpId, {
        actionId: action.id,
        actionType: action.actionType,
        targetTaskId: action.targetTaskId,
        proposedChanges: action.proposedChanges,
        actor: 'Ops Lead (Human Approval)'
      });

      setActiveOperation(res.operation);
      setAnalysis(res.analysis);
    } catch (err) {
      console.error('Failed to apply recovery action:', err);
      alert(`Failed to apply action: ${err.message}`);
      throw err;
    } finally {
      setApplyingActionId(null);
    }
  };

  const handleResetSample = async () => {
    try {
      setIsResetting(true);
      const res = await seedSampleOperation();
      const updatedOps = await fetchOperations();
      setOperations(updatedOps);
      setActiveOpId(res.operation.id);
      setActiveOperation(res.operation);
      setAnalysis(res.analysis);
      setPendingSimAction(null);
      setSimulationState({
        phase: 0,
        simulatedDay: 1,
        perception: 'Flagship TechFest 2026 dataset loaded with active critical-path bottleneck.',
        reasoning: 'Ready to demonstrate delay detection and recovery.',
        actionSummary: 'TechFest scenario initialized.'
      });
    } catch (err) {
      console.error('Failed to reset sample:', err);
      alert('Failed to reset sample operation.');
    } finally {
      setIsResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading-container">
          <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }}></div>
          <p className="loading-text">Initializing OpsPilot AI Agent & Risk Engine...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container">
        <div className="loading-container" style={{ color: '#f87171' }}>
          <h2>Connection Error</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadInitialData}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Navbar
        operations={operations}
        activeOpId={activeOpId}
        onSelectOp={handleSelectOperation}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onResetSample={handleResetSample}
        systemHealth={systemHealth}
        isResetting={isResetting}
      />

      {/* Main Dashboard Content */}
      <main className="dashboard-main" id="dashboard-main-content">
        {/* Prominent AI Operations Goal Dispatcher Bar */}
        <GoalPromptBar
          onGeneratePlan={handleCreateOperation}
          isGenerating={isCreatingOp}
        />

        {activeOperation ? (
          <>
            {/* AUTONOMOUS AGENT SIMULATOR DECK */}
            {isSimulationActive && (
              <AgentSimulator
                operation={activeOperation}
                simulationState={simulationState}
                onAdvanceStep={handleAdvanceSimulation}
                onApproveAction={handleApproveSimAction}
                onResetSimulation={handleResetSimulation}
                isAdvancing={isAdvancingSim}
                isApproving={isApprovingSim}
                pendingAction={pendingSimAction}
              />
            )}

            {/* KPI Metrics & Hero */}
            <MetricsBar
              operation={activeOperation}
              analysis={analysis}
            />

            {/* Risk Radar Section */}
            <RiskRadar
              analysis={analysis}
              onLaunchRecovery={handleLaunchRecovery}
              isGeneratingRecovery={isGeneratingRecovery}
            />

            {/* Two Column Section: Kanban Board + Activity Log */}
            <div className="dashboard-grid">
              <TaskBoard
                tasks={activeOperation.tasks || []}
                analysis={analysis}
                onUpdateStatus={handleUpdateTaskStatus}
                onDeleteTask={handleDeleteTask}
                onOpenAddTask={() => setIsAddTaskModalOpen(true)}
                onLaunchRecovery={handleLaunchRecovery}
              />

              <ActivityLog
                activityLog={activeOperation.activityLog || []}
              />
            </div>
          </>
        ) : (
          <div className="empty-state">
            <h3>No operations found</h3>
            <p>Launch your first autonomous operation to get started.</p>
            <button
              className="btn btn-primary"
              onClick={() => setIsCreateModalOpen(true)}
            >
              Launch Operation
            </button>
          </div>
        )}
      </main>

      {/* Modals */}
      <CreateOpModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateOperation={handleCreateOperation}
        isCreating={isCreatingOp}
      />

      <AddTaskModal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        onAddTask={handleAddTask}
        teamMembers={activeOperation?.teamMembers || []}
        existingTasks={activeOperation?.tasks || []}
      />

      <RecoveryModal
        isOpen={isRecoveryModalOpen}
        onClose={() => setIsRecoveryModalOpen(false)}
        recoveryData={recoveryData}
        onApplyAction={handleApplyRecoveryAction}
        applyingActionId={applyingActionId}
      />
    </div>
  );
}
