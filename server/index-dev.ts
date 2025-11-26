// Stub for Next.js migration - run Next.js dev server
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('Starting Next.js development server...')

const nextDev = spawn('npx', ['next', 'dev', '-p', '5000'], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
})

nextDev.on('error', (err: any) => {
  console.error('Failed to start Next.js:', err)
  process.exit(1)
})

process.on('SIGINT', () => {
  nextDev.kill()
  process.exit(0)
})
