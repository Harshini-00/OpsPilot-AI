const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Failed to reach OpsPilot backend');
  return res.json();
}

export async function fetchOperations() {
  const res = await fetch(`${API_BASE}/operations`);
  if (!res.ok) throw new Error('Failed to fetch operations');
  return res.json();
}

export async function fetchOperationById(id) {
  const res = await fetch(`${API_BASE}/operations/${id}`);
  if (!res.ok) throw new Error('Failed to fetch operation details');
  return res.json();
}

export async function createOperation(payload) {
  const res = await fetch(`${API_BASE}/operations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create operation');
  }
  return res.json();
}

export async function addTask(operationId, taskPayload) {
  const res = await fetch(`${API_BASE}/operations/${operationId}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(taskPayload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to add task');
  }
  return res.json();
}

export async function updateTask(operationId, taskId, updates, actor = 'User') {
  const res = await fetch(`${API_BASE}/operations/${operationId}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...updates, actor }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update task');
  }
  return res.json();
}

export async function deleteTask(operationId, taskId) {
  const res = await fetch(`${API_BASE}/operations/${operationId}/tasks/${taskId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete task');
  }
  return res.json();
}

export async function requestRecoveryPlan(operationId) {
  const res = await fetch(`${API_BASE}/operations/${operationId}/recovery-plan`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate recovery plan');
  }
  return res.json();
}

export async function applyRecoveryAction(operationId, payload) {
  const res = await fetch(`${API_BASE}/operations/${operationId}/apply-recovery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to apply recovery action');
  }
  return res.json();
}

export async function seedSampleOperation() {
  const res = await fetch(`${API_BASE}/operations/seed-sample`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to reset sample operation');
  }
  return res.json();
}

export async function simulateStep(operationId, currentPhase) {
  const res = await fetch(`${API_BASE}/operations/${operationId}/simulate-step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPhase }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to advance simulation step');
  }
  return res.json();
}

export async function simulateApprove(operationId, payload) {
  const res = await fetch(`${API_BASE}/operations/${operationId}/simulate-approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to approve simulation action');
  }
  return res.json();
}

export async function simulateReset(operationId) {
  const res = await fetch(`${API_BASE}/operations/${operationId}/simulate-reset`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to reset simulation');
  }
  return res.json();
}

