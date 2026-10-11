import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sampleTechFestOperation } from '../data/sampleTechFest.js';
import { getCollection, getConnectionStatus } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'operations.json');

// Ensure data folder and operations.json exist locally for resilient fallback
function ensureLocalDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = [sampleTechFestOperation];
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

export function readLocalOperations() {
  ensureLocalDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data) || data.length === 0) {
      const initialData = [sampleTechFestOperation];
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
      return initialData;
    }
    return data;
  } catch (err) {
    console.error('[Storage] Error reading local operations.json, reinitializing:', err.message);
    const initialData = [sampleTechFestOperation];
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }
}

export function writeLocalOperations(operations) {
  ensureLocalDataFile();
  const tempFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(operations, null, 2), 'utf-8');
  fs.renameSync(tempFile, DATA_FILE);
  return operations;
}

/**
 * Initializes MongoDB collection with seed data if currently empty
 */
export async function seedMongoIfEmpty() {
  const col = getCollection('operations');
  if (!col) return;
  try {
    const count = await col.countDocuments();
    if (count === 0) {
      const local = readLocalOperations();
      const seedList = local.length > 0 ? local : [sampleTechFestOperation];
      await col.insertMany(seedList.map((op) => ({ ...op })));
      console.log(`[Storage] Seeded MongoDB Atlas "opspilot" collection with ${seedList.length} operation(s).`);
    }
  } catch (err) {
    console.error('[Storage] Error checking/seeding MongoDB collection:', err.message);
  }
}

/**
 * GET all operations (Atlas with fallback to local JSON)
 */
export async function getOperationsList() {
  const col = getCollection('operations');
  if (col) {
    try {
      const ops = await col.find({}, { projection: { _id: 0 } }).toArray();
      if (ops.length > 0) return ops;
      // If collection exists but is empty, seed with sample
      await col.insertOne({ ...sampleTechFestOperation });
      return [sampleTechFestOperation];
    } catch (err) {
      console.warn('[Storage] MongoDB query failed, falling back to local storage:', err.message);
    }
  }
  return readLocalOperations();
}

/**
 * GET single operation by ID
 */
export async function getOperationById(id) {
  const col = getCollection('operations');
  if (col) {
    try {
      const op = await col.findOne({ id }, { projection: { _id: 0 } });
      if (op) return op;
    } catch (err) {
      console.warn('[Storage] MongoDB query by ID failed, falling back to local storage:', err.message);
    }
  }
  const list = readLocalOperations();
  return list.find((op) => op.id === id) || null;
}

/**
 * CREATE operation
 */
export async function createOperation(opData) {
  const newOp = {
    id: `op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: opData.name || 'Untitled Operation',
    goal: opData.goal || '',
    deadline: opData.deadline || '',
    teamMembers: Array.isArray(opData.teamMembers) ? opData.teamMembers : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tasks: opData.tasks || [],
    activityLog: [
      {
        id: `act_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'OPERATION_CREATED',
        message: `Operation "${opData.name}" created`,
        actor: 'User'
      }
    ]
  };

  const col = getCollection('operations');
  if (col) {
    try {
      await col.insertOne({ ...newOp });
    } catch (err) {
      console.error('[Storage] MongoDB insert failed:', err.message);
    }
  }

  // Always keep local JSON updated as backup
  const localOps = readLocalOperations();
  localOps.unshift(newOp);
  writeLocalOperations(localOps);

  return newOp;
}

/**
 * UPDATE operation metadata
 */
export async function updateOperation(id, updates) {
  const col = getCollection('operations');
  let updatedDoc = null;

  const cleanUpdates = { ...updates, updatedAt: new Date().toISOString() };
  delete cleanUpdates._id;

  if (col) {
    try {
      await col.updateOne({ id }, { $set: cleanUpdates });
      updatedDoc = await col.findOne({ id }, { projection: { _id: 0 } });
    } catch (err) {
      console.error('[Storage] MongoDB update failed:', err.message);
    }
  }

  // Also update local copy
  const operations = readLocalOperations();
  const index = operations.findIndex((op) => op.id === id);
  if (index !== -1) {
    operations[index] = {
      ...operations[index],
      ...cleanUpdates
    };
    writeLocalOperations(operations);
    if (!updatedDoc) {
      updatedDoc = operations[index];
    }
  }

  return updatedDoc;
}

/**
 * DELETE operation
 */
export async function deleteOperation(id) {
  const col = getCollection('operations');
  if (col) {
    try {
      await col.deleteOne({ id });
      const count = await col.countDocuments();
      if (count === 0) {
        await col.insertOne({ ...sampleTechFestOperation });
      }
    } catch (err) {
      console.error('[Storage] MongoDB delete failed:', err.message);
    }
  }

  const operations = readLocalOperations();
  const filtered = operations.filter((op) => op.id !== id);
  if (filtered.length === 0) {
    filtered.push(sampleTechFestOperation);
  }
  writeLocalOperations(filtered);
  return true;
}

/**
 * ADD task to operation
 */
export async function addTaskToOperation(operationId, taskData) {
  const op = await getOperationById(operationId);
  if (!op) return null;

  const newTask = {
    id: `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title: taskData.title || 'New Task',
    description: taskData.description || '',
    owner: taskData.owner || (op.teamMembers[0] || 'Unassigned'),
    dueDate: taskData.dueDate || op.deadline,
    priority: taskData.priority || 'P2 - Medium',
    status: taskData.status || 'To Do',
    dependencies: Array.isArray(taskData.dependencies) ? taskData.dependencies : []
  };

  const tasks = Array.isArray(op.tasks) ? [...op.tasks, newTask] : [newTask];
  const activityLog = Array.isArray(op.activityLog) ? [...op.activityLog] : [];
  activityLog.push({
    id: `act_${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'TASK_CREATED',
    message: `Created task "${newTask.title}" assigned to ${newTask.owner}`,
    actor: 'User'
  });

  const updatedOp = await updateOperation(operationId, { tasks, activityLog });
  return { op: updatedOp, task: newTask };
}

/**
 * UPDATE task inside operation
 */
export async function updateTaskInOperation(operationId, taskId, updates, actor = 'User') {
  const op = await getOperationById(operationId);
  if (!op || !Array.isArray(op.tasks)) return null;

  const taskIndex = op.tasks.findIndex((t) => t.id === taskId);
  if (taskIndex === -1) return null;

  const oldTask = op.tasks[taskIndex];
  const updatedTask = {
    ...oldTask,
    ...updates
  };

  const tasks = [...op.tasks];
  tasks[taskIndex] = updatedTask;

  const activityLog = Array.isArray(op.activityLog) ? [...op.activityLog] : [];
  if (updates.status && updates.status !== oldTask.status) {
    activityLog.push({
      id: `act_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'STATUS_UPDATED',
      message: `Task "${updatedTask.title}" moved from ${oldTask.status} to ${updates.status}`,
      actor
    });
  } else {
    activityLog.push({
      id: `act_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'TASK_UPDATED',
      message: `Task "${updatedTask.title}" updated`,
      actor
    });
  }

  const updatedOp = await updateOperation(operationId, { tasks, activityLog });
  return { op: updatedOp, task: updatedTask };
}

/**
 * DELETE task from operation
 */
export async function deleteTaskFromOperation(operationId, taskId) {
  const op = await getOperationById(operationId);
  if (!op || !Array.isArray(op.tasks)) return null;

  const taskToDelete = op.tasks.find((t) => t.id === taskId);
  let tasks = op.tasks.filter((t) => t.id !== taskId);

  // Clean dependencies referencing this task
  tasks = tasks.map((t) => ({
    ...t,
    dependencies: (t.dependencies || []).filter((d) => d !== taskId)
  }));

  const activityLog = Array.isArray(op.activityLog) ? [...op.activityLog] : [];
  activityLog.push({
    id: `act_${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'TASK_DELETED',
    message: `Deleted task "${taskToDelete ? taskToDelete.title : taskId}"`,
    actor: 'User'
  });

  const updatedOp = await updateOperation(operationId, { tasks, activityLog });
  return updatedOp;
}

/**
 * RESET sample TechFest operation
 */
export async function resetToSampleOperation() {
  const col = getCollection('operations');
  if (col) {
    try {
      await col.deleteMany({});
      await col.insertOne({ ...sampleTechFestOperation });
    } catch (err) {
      console.error('[Storage] MongoDB reset failed:', err.message);
    }
  }

  const operations = [sampleTechFestOperation];
  writeLocalOperations(operations);
  return operations;
}
