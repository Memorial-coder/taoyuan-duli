import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
  cwd: repoRoot,
  stdio: 'inherit',
  shell: false,
})

child.on('exit', code => {
  process.exit(code ?? 1)
})
