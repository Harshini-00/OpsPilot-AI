import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n==============================================================');
console.log('   🚀 OpsPilot AI - Autonomous Operations Agent');
console.log('==============================================================');
console.log('   Backend API:      http://localhost:5000/api');
console.log('   Frontend Website: http://localhost:5173\n');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

// 1. Spawn Backend (spawn node directly without shell so paths with spaces work)
const serverProcess = spawn(process.execPath, ['server.js'], {
  cwd: path.join(__dirname, 'server'),
  stdio: 'inherit',
  shell: false
});

// 2. Spawn Frontend
const clientProcess = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(__dirname, 'client'),
  stdio: 'inherit',
  shell: isWindows
});

function cleanup() {
  console.log('\nShutting down OpsPilot AI services...');
  try { serverProcess.kill(); } catch {}
  try { clientProcess.kill(); } catch {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

serverProcess.on('error', (err) => {
  console.error('[OpsPilot Backend Error]:', err);
});

clientProcess.on('error', (err) => {
  console.error('[OpsPilot Frontend Error]:', err);
});
