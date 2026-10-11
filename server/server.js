import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  getOperationsList,
  getOperationById,
  createOperation,
  updateOperation,
  deleteOperation,
  addTaskToOperation,
  updateTaskInOperation,
  deleteTaskFromOperation,
  resetToSampleOperation,
  seedMongoIfEmpty
} from './services/storage.js';
import { connectDB, getConnectionStatus } from './services/db.js';
import { analyzeOperationRisks } from './services/riskEngine.js';
import { generateOperationPlan, generateRecoveryPlan, simulateAgentStep } from './services/gemini.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health & System Configuration status (Never exposes secret credentials)
app.get('/api/health', (req, res) => {
  const hasKey = Boolean(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY.trim().length > 10 &&
    !process.env.GEMINI_API_KEY.includes('your_gemini_api_key')
  );
  const dbStatus = getConnectionStatus();

  res.json({
    status: 'online',
    appName: 'OpsPilot AI',
    timestamp: new Date().toISOString(),
    geminiConfigured: hasKey,
    database: {
      connected: dbStatus.isConnected,
      name: 'opspilot',
      cluster: dbStatus.cluster,
      error: dbStatus.error,
      diagnostic: dbStatus.diagnostic,
      mode: dbStatus.isConnected ? 'MongoDB Atlas' : 'Local JSON Fallback'
    },
    storage: dbStatus.isConnected
      ? 'MongoDB Atlas (opspilot database)'
      : 'Local JSON persistence (operations.json fallback)'
  });
});

// GET all operations with computed risks
app.get('/api/operations', async (req, res) => {
  try {
    const operations = await getOperationsList();
    const enriched = operations.map((op) => {
      const riskAnalysis = analyzeOperationRisks(op);
      return {
        ...op,
        metrics: riskAnalysis.metrics,
        overallRisk: riskAnalysis.overallRisk
      };
    });
    res.json(enriched);
  } catch (err) {
    console.error('Error fetching operations:', err);
    res.status(500).json({ error: 'Failed to fetch operations' });
  }
});

// GET single operation with full risk audit
app.get('/api/operations/:id', async (req, res) => {
  try {
    const op = await getOperationById(req.params.id);
    if (!op) {
      return res.status(404).json({ error: 'Operation not found' });
    }
    const riskAnalysis = analyzeOperationRisks(op);
    res.json({
      operation: op,
      analysis: riskAnalysis
    });
  } catch (err) {
    console.error('Error fetching operation details:', err);
    res.status(500).json({ error: 'Failed to fetch operation details' });
  }
});

// CREATE new operation (Manual or AI-planned via Gemini)
app.post('/api/operations', async (req, res) => {
  try {
    const { name, goal, deadline, teamMembers, useAiPlan } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Operation name is required' });
    }

    let initialTasks = [];
    let aiSummary = null;

    if (useAiPlan) {
      const planResult = await generateOperationPlan({
        name,
        goal,
        deadline,
        teamMembers: Array.isArray(teamMembers) ? teamMembers : []
      });
      initialTasks = planResult.tasks;
      aiSummary = planResult.summary;
    }

    const newOp = await createOperation({
      name: name.trim(),
      goal: goal || '',
      deadline: deadline || '',
      teamMembers: Array.isArray(teamMembers) ? teamMembers : [],
      tasks: initialTasks
    });

    if (aiSummary) {
      newOp.activityLog.push({
        id: `act_${Date.now()}_ai`,
        timestamp: new Date().toISOString(),
        type: 'AI_PLAN_GENERATED',
        message: `Gemini AI synthesized ${initialTasks.length} structured milestones with dependency sequencing.`,
        actor: 'OpsPilot Gemini AI'
      });
      await updateOperation(newOp.id, { activityLog: newOp.activityLog });
    }

    const riskAnalysis = analyzeOperationRisks(newOp);
    res.status(201).json({
      operation: newOp,
      analysis: riskAnalysis,
      aiSummary
    });
  } catch (err) {
    console.error('Error creating operation:', err);
    res.status(500).json({ error: err.message || 'Failed to create operation' });
  }
});

// UPDATE operation metadata
app.put('/api/operations/:id', async (req, res) => {
  try {
    const updated = await updateOperation(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Operation not found' });
    }
    const riskAnalysis = analyzeOperationRisks(updated);
    res.json({ operation: updated, analysis: riskAnalysis });
  } catch (err) {
    console.error('Error updating operation:', err);
    res.status(500).json({ error: 'Failed to update operation' });
  }
});

// DELETE operation
app.delete('/api/operations/:id', async (req, res) => {
  try {
    const success = await deleteOperation(req.params.id);
    res.json({ success });
  } catch (err) {
    console.error('Error deleting operation:', err);
    res.status(500).json({ error: 'Failed to delete operation' });
  }
});

// ADD task to operation
app.post('/api/operations/:id/tasks', async (req, res) => {
  try {
    const { title, description, owner, dueDate, priority, status, dependencies } = req.body;
    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const result = await addTaskToOperation(req.params.id, {
      title: title.trim(),
      description,
      owner,
      dueDate,
      priority,
      status,
      dependencies
    });

    if (!result) {
      return res.status(404).json({ error: 'Operation not found' });
    }

    const riskAnalysis = analyzeOperationRisks(result.op);
    res.status(201).json({
      operation: result.op,
      task: result.task,
      analysis: riskAnalysis
    });
  } catch (err) {
    console.error('Error adding task:', err);
    res.status(500).json({ error: 'Failed to add task' });
  }
});

// UPDATE task (status change, fields, etc.)
app.patch('/api/operations/:id/tasks/:taskId', async (req, res) => {
  try {
    const { actor = 'User', ...updates } = req.body;
    const result = await updateTaskInOperation(req.params.id, req.params.taskId, updates, actor);

    if (!result) {
      return res.status(404).json({ error: 'Operation or task not found' });
    }

    const riskAnalysis = analyzeOperationRisks(result.op);
    res.json({
      operation: result.op,
      task: result.task,
      analysis: riskAnalysis
    });
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE task
app.delete('/api/operations/:id/tasks/:taskId', async (req, res) => {
  try {
    const updatedOp = await deleteTaskFromOperation(req.params.id, req.params.taskId);
    if (!updatedOp) {
      return res.status(404).json({ error: 'Operation not found' });
    }
    const riskAnalysis = analyzeOperationRisks(updatedOp);
    res.json({
      operation: updatedOp,
      analysis: riskAnalysis
    });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// GENERATE AI RECOVERY PLAN
app.post('/api/operations/:id/recovery-plan', async (req, res) => {
  try {
    const op = await getOperationById(req.params.id);
    if (!op) {
      return res.status(404).json({ error: 'Operation not found' });
    }

    const riskAnalysis = analyzeOperationRisks(op);
    const recoveryResult = await generateRecoveryPlan({
      operation: op,
      risks: riskAnalysis.risks,
      blockedTaskIds: riskAnalysis.blockedTaskIds
    });

    res.json({
      operationId: op.id,
      operationName: op.name,
      ...recoveryResult
    });
  } catch (err) {
    console.error('Error generating recovery plan:', err);
    res.status(500).json({ error: err.message || 'Failed to generate recovery plan' });
  }
});

// APPLY APPROVED RECOVERY ACTION (Human-in-the-loop confirmation)
app.post('/api/operations/:id/apply-recovery', async (req, res) => {
  try {
    const { actionId, actionType, targetTaskId, proposedChanges, actor = 'Ops Lead' } = req.body;

    const op = await getOperationById(req.params.id);
    if (!op) {
      return res.status(404).json({ error: 'Operation not found' });
    }

    const task = op.tasks.find((t) => t.id === targetTaskId);
    if (!task) {
      return res.status(404).json({ error: 'Target task for recovery not found' });
    }

    const taskUpdates = {};
    const changeNotes = [];

    if (proposedChanges.newDueDate) {
      changeNotes.push(`due date adjusted to ${proposedChanges.newDueDate}`);
      taskUpdates.dueDate = proposedChanges.newDueDate;
    }

    if (proposedChanges.newOwner) {
      changeNotes.push(`owner reassigned to ${proposedChanges.newOwner}`);
      taskUpdates.owner = proposedChanges.newOwner;
    }

    if (proposedChanges.newPriority) {
      changeNotes.push(`priority updated to ${proposedChanges.newPriority}`);
      taskUpdates.priority = proposedChanges.newPriority;
    }

    if (proposedChanges.removeDependencyId) {
      taskUpdates.dependencies = (task.dependencies || []).filter(
        (d) => d !== proposedChanges.removeDependencyId
      );
      changeNotes.push(`decoupled blocker dependency (${proposedChanges.removeDependencyId})`);
    }

    // Apply the updates safely
    await updateTaskInOperation(op.id, targetTaskId, taskUpdates, actor);

    // Record human-in-the-loop approval in activity log
    const updatedOp = await getOperationById(op.id);
    updatedOp.activityLog.push({
      id: `act_${Date.now()}_rec`,
      timestamp: new Date().toISOString(),
      type: 'RECOVERY_APPLIED',
      message: `Approved Recovery (${actionType}): for "${task.title}" - ${changeNotes.join(', ')}`,
      actor
    });
    await updateOperation(op.id, { activityLog: updatedOp.activityLog });

    const finalOp = await getOperationById(op.id);
    const freshAnalysis = analyzeOperationRisks(finalOp);

    res.json({
      success: true,
      message: `Successfully executed approved recovery action on "${task.title}".`,
      operation: finalOp,
      analysis: freshAnalysis
    });
  } catch (err) {
    console.error('Error applying recovery action:', err);
    res.status(500).json({ error: err.message || 'Failed to apply recovery action' });
  }
});

// SEED / RESET SAMPLE TECHFEST OPERATION
app.post('/api/operations/seed-sample', async (req, res) => {
  try {
    const operations = await resetToSampleOperation();
    const active = operations[0];
    const riskAnalysis = analyzeOperationRisks(active);
    res.json({
      operation: active,
      analysis: riskAnalysis,
      message: 'Demo dataset reset to flagship TechFest 2026 operation.'
    });
  } catch (err) {
    console.error('Error seeding sample:', err);
    res.status(500).json({ error: 'Failed to reset sample operation' });
  }
});

// SIMULATION: ADVANCE AUTONOMOUS AGENT SIMULATION STEP
app.post('/api/operations/:id/simulate-step', async (req, res) => {
  try {
    const op = await getOperationById(req.params.id);
    if (!op) {
      return res.status(404).json({ error: 'Operation not found' });
    }

    const currentPhase = parseInt(req.body.currentPhase ?? 0, 10);
    const simulationResult = await simulateAgentStep({
      operation: op,
      currentPhase
    });

    // Update tasks and append new activity events
    op.tasks = simulationResult.updatedTasks;
    if (Array.isArray(simulationResult.newActivityEvents)) {
      op.activityLog = op.activityLog || [];
      op.activityLog.push(...simulationResult.newActivityEvents);
    }
    op.updatedAt = new Date().toISOString();

    await updateOperation(op.id, {
      tasks: op.tasks,
      activityLog: op.activityLog,
      updatedAt: op.updatedAt
    });

    const freshOp = await getOperationById(op.id);
    const riskAnalysis = analyzeOperationRisks(freshOp);

    res.json({
      operation: freshOp,
      analysis: riskAnalysis,
      simulation: {
        phase: simulationResult.phase,
        nextPhase: simulationResult.nextPhase,
        phaseName: simulationResult.phaseName,
        simulatedDay: simulationResult.simulatedDay,
        perception: simulationResult.perception,
        reasoning: simulationResult.reasoning,
        actionSummary: simulationResult.actionSummary,
        requiresHumanApproval: simulationResult.requiresHumanApproval,
        pendingApprovalAction: simulationResult.pendingApprovalAction
      }
    });
  } catch (err) {
    console.error('Error advancing simulation step:', err);
    res.status(500).json({ error: err.message || 'Failed to simulate step' });
  }
});

// SIMULATION: HUMAN-IN-THE-LOOP APPROVAL / REJECTION OF CONSEQUENTIAL ACTION
app.post('/api/operations/:id/simulate-approve', async (req, res) => {
  try {
    const { actionId, approved, action, notes } = req.body;
    const op = await getOperationById(req.params.id);
    if (!op) {
      return res.status(404).json({ error: 'Operation not found' });
    }

    const proposed = action?.proposedChanges || {};
    const targetTaskId = action?.targetTaskId;

    if (approved) {
      // Apply proposed changes safely
      if (targetTaskId) {
        const task = op.tasks.find((t) => t.id === targetTaskId);
        if (task) {
          if (proposed.newOwner) task.owner = proposed.newOwner;
          if (proposed.newDueDate) task.dueDate = proposed.newDueDate;
          if (task.status === 'Blocked') task.status = 'In Progress';
        }
      }

      // If decoupling specified, remove the blocker dependency
      if (proposed.decoupleTaskId && proposed.removeDependencyId) {
        const stalled = op.tasks.find((t) => t.id === proposed.decoupleTaskId);
        if (stalled && Array.isArray(stalled.dependencies)) {
          stalled.dependencies = stalled.dependencies.filter((d) => d !== proposed.removeDependencyId);
          if (stalled.status === 'Blocked') stalled.status = 'In Progress';
        }
      }

      op.activityLog.push({
        id: `act_${Date.now()}_human_approved`,
        timestamp: new Date().toISOString(),
        type: 'HUMAN_APPROVAL',
        message: `[HUMAN SIGN-OFF] Ops Lead APPROVED consequential recovery: Reallocated ${proposed.newOwner || 'teammate'} & decoupled dependency on "${action?.targetTaskTitle}".`,
        actor: 'Ops Lead (Human Approval)',
        isSimulated: false,
        agentRationale: action?.agentRationale || 'Human approval granted. Agent proceeded with execution.'
      });
    } else {
      op.activityLog.push({
        id: `act_${Date.now()}_human_rejected`,
        timestamp: new Date().toISOString(),
        type: 'HUMAN_REJECTION',
        message: `[HUMAN SIGN-OFF] Ops Lead REJECTED/OVERRODE proposed action on "${action?.targetTaskTitle}". Existing schedule preserved.`,
        actor: 'Ops Lead (Human Override)',
        isSimulated: false,
        agentRationale: 'Human operator overrode autonomous proposal. Agent holding current configuration.'
      });
    }

    op.updatedAt = new Date().toISOString();
    await updateOperation(op.id, { tasks: op.tasks, activityLog: op.activityLog, updatedAt: op.updatedAt });

    const freshOp = await getOperationById(op.id);
    const riskAnalysis = analyzeOperationRisks(freshOp);

    res.json({
      success: true,
      approved,
      operation: freshOp,
      analysis: riskAnalysis,
      message: approved ? 'Consequential action approved and applied.' : 'Action rejected by human operator.'
    });
  } catch (err) {
    console.error('Error approving simulation action:', err);
    res.status(500).json({ error: err.message || 'Failed to approve action' });
  }
});

// SIMULATION: RESET TO BASELINE
app.post('/api/operations/:id/simulate-reset', async (req, res) => {
  try {
    const op = await getOperationById(req.params.id);
    if (!op) {
      return res.status(404).json({ error: 'Operation not found' });
    }

    // Reset task statuses back to baseline
    op.tasks.forEach((t, i) => {
      if (i === 0) {
        t.status = 'In Progress';
      } else if (t.dependencies && t.dependencies.length > 0) {
        t.status = 'Blocked';
      } else {
        t.status = 'To Do';
      }
    });

    op.activityLog.push({
      id: `act_${Date.now()}_sim_reset`,
      timestamp: new Date().toISOString(),
      type: 'SIMULATION_RESET',
      message: '[SIMULATED AGENT ACTION] Simulation timeline reset to Day 1 baseline.',
      actor: 'OpsPilot Autonomous Agent',
      isSimulated: true,
      agentRationale: 'Resetting operational environment to initial baseline for replay demonstration.'
    });

    await updateOperation(op.id, { tasks: op.tasks, activityLog: op.activityLog, updatedAt: new Date().toISOString() });

    const freshOp = await getOperationById(op.id);
    const riskAnalysis = analyzeOperationRisks(freshOp);

    res.json({
      operation: freshOp,
      analysis: riskAnalysis,
      message: 'Simulation reset to Day 1 baseline.'
    });
  } catch (err) {
    console.error('Error resetting simulation:', err);
    res.status(500).json({ error: err.message || 'Failed to reset simulation' });
  }
});

function startServer() {
  const server = app.listen(PORT, () => {
    console.log(`[OpsPilot AI Server] 🚀 Running on http://localhost:${PORT}`);
    console.log(`[OpsPilot AI Server] 📁 Reliable Local JSON Persistence active (operations.json)`);
  });

  // Non-blocking background attempt to connect to MongoDB Atlas
  connectDB()
    .then(async (db) => {
      if (db) {
        await seedMongoIfEmpty();
        console.log(`[OpsPilot AI Server] ✅ Connected to MongoDB Atlas ("opspilot")`);
      } else {
        console.log(`[OpsPilot AI Server] ℹ️  Operating reliably in local JSON fallback mode.`);
      }
    })
    .catch(() => {
      console.log(`[OpsPilot AI Server] ℹ️  Operating reliably in local JSON fallback mode.`);
    });

  return server;
}

startServer();
