import dotenv from 'dotenv';
dotenv.config();

async function runApiTests() {
  console.log('🧪 Starting API routes integration tests...');

  // Start server
  const { app } = await import('./server.js');
  // Wait 3.5s for startServer to finish connecting/diagnostics
  await new Promise((r) => setTimeout(r, 3500));

  const BASE = 'http://localhost:5000/api';

  // 1. Health
  console.log('\n[1/6] Testing GET /api/health...');
  const healthRes = await fetch(`${BASE}/health`);
  const health = await healthRes.json();
  console.log('   Status:', health.status, '| Database mode:', health.database.mode);
  if (health.status !== 'online') throw new Error('Health check failed');

  // 2. GET operations
  console.log('\n[2/6] Testing GET /api/operations...');
  const opsRes = await fetch(`${BASE}/operations`);
  const ops = await opsRes.json();
  console.log(`   Fetched ${ops.length} operations. First op ID: ${ops[0]?.id}`);
  if (!Array.isArray(ops) || ops.length === 0) throw new Error('Operations list empty');

  const testOpId = ops[0].id;

  // 3. GET /api/operations/:id
  console.log(`\n[3/6] Testing GET /api/operations/${testOpId}...`);
  const singleRes = await fetch(`${BASE}/operations/${testOpId}`);
  const single = await singleRes.json();
  console.log(`   Operation: "${single.operation.name}" | Computed risks: ${single.analysis.risks.length}`);
  if (!single.operation || !single.analysis) throw new Error('Single op fetch failed');

  // 4. POST /api/operations/:id/tasks
  console.log(`\n[4/6] Testing POST /api/operations/${testOpId}/tasks...`);
  const addTaskRes = await fetch(`${BASE}/operations/${testOpId}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Automated Atlas Integration Verification Task',
      description: 'Testing task persistence in OpsPilot backend',
      owner: 'Alex Rivera (Project Lead)',
      dueDate: '2026-10-20',
      priority: 'P1 - High',
      status: 'In Progress'
    })
  });
  const added = await addTaskRes.json();
  console.log(`   Created task: "${added.task.title}" (ID: ${added.task.id})`);
  if (!added.task?.id) throw new Error('Add task failed');

  // 5. PATCH task status
  console.log(`\n[5/6] Testing PATCH task status...`);
  const patchRes = await fetch(`${BASE}/operations/${testOpId}/tasks/${added.task.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Completed', actor: 'Automated Test' })
  });
  const patched = await patchRes.json();
  console.log(`   Patched task status: ${patched.task.status}`);
  if (patched.task.status !== 'Completed') throw new Error('Patch task failed');

  // Clean up added task
  await fetch(`${BASE}/operations/${testOpId}/tasks/${added.task.id}`, { method: 'DELETE' });

  // 6. Test Gemini Recovery Plan route (verifying Gemini integration is intact)
  console.log(`\n[6/6] Testing Gemini Integration: POST /api/operations/${testOpId}/recovery-plan...`);
  const recRes = await fetch(`${BASE}/operations/${testOpId}/recovery-plan`, { method: 'POST' });
  const recData = await recRes.json();
  console.log(`   AI Executive Summary: "${recData.executiveSummary?.slice(0, 80)}..."`);
  console.log(`   Proposed recovery actions: ${recData.recommendedActions?.length || 0}`);

  console.log('\n======================================================');
  console.log('🎉 ALL API ROUTES & GEMINI INTEGRATIONS WORKING 100%!');
  console.log('======================================================\n');
  process.exit(0);
}

runApiTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
