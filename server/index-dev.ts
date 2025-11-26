// Stub for Next.js migration - run Next.js dev server
console.log('Starting Next.js development server...');
const { spawn } = require('child_process');
const path = require('path');

const nextDev = spawn('npx', ['next', 'dev', '-p', '5000'], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
});

nextDev.on('error', (err: any) => {
  console.error('Failed to start Next.js:', err);
  process.exit(1);
});
