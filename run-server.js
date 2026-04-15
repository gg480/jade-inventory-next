const { spawn } = require('child_process');
const path = require('path');

const server = spawn('node', [
  path.join(__dirname, 'node_modules/.bin/next'),
  'start', '-p', '3000'
], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=2048' },
  detached: true
});

server.stdout.on('data', (data) => {
  process.stdout.write(data);
});

server.stderr.on('data', (data) => {
  process.stderr.write(data);
});

server.on('close', (code, signal) => {
  console.log(`Server exited with code ${code} signal ${signal}`);
  process.exit(code || 0);
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

console.log(`Server started with PID ${server.pid}`);

// Keep the process alive
setInterval(() => {
  // heartbeat
}, 30000);
