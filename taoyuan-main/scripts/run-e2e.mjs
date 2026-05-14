import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { findAvailablePort } from './port-utils.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const host = '127.0.0.1'
const preferredPort = Number(process.env.TAOYUAN_E2E_PORT || 4175)
const port = process.env.TAOYUAN_E2E_PORT?.trim() ? preferredPort : await findAvailablePort(host, preferredPort)

process.env.TAOYUAN_E2E_PORT = String(port)

const cliPath = path.resolve(repoRoot, 'node_modules', 'playwright', 'cli.js')
const child = spawn(process.execPath, [cliPath, 'test', ...process.argv.slice(2)], {
  cwd: repoRoot,
  env: process.env,
  stdio: 'inherit',
})

child.on('exit', code => {
  process.exit(code ?? 1)
})
