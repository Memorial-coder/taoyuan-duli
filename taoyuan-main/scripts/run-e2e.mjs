import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { findAvailablePort, isServerReachable, waitForServer } from './port-utils.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const host = '127.0.0.1'
const preferredPort = Number(process.env.TAOYUAN_E2E_PORT || 4175)
const port = process.env.TAOYUAN_E2E_PORT?.trim() ? preferredPort : await findAvailablePort(host, preferredPort)
const baseURL = `http://${host}:${port}`

process.env.TAOYUAN_E2E_PORT = String(port)
process.env.TAOYUAN_E2E_EXTERNAL_SERVER = '1'

const cliPath = path.resolve(repoRoot, 'node_modules', 'playwright', 'cli.js')
const startDevServer = () => (
  process.platform === 'win32'
    ? spawn(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', `npm run dev -- --host ${host} --port ${port} --strictPort`], {
        cwd: repoRoot,
        stdio: 'inherit',
      })
    : spawn('npm', ['run', 'dev', '--', '--host', host, '--port', String(port), '--strictPort'], {
        cwd: repoRoot,
        stdio: 'inherit',
      })
)

let serverProcess = null

const stopServer = () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill('SIGTERM')
  }
}

const forwardSignal = signal => {
  process.on(signal, () => {
    stopServer()
    process.exit(1)
  })
}

forwardSignal('SIGINT')
forwardSignal('SIGTERM')

try {
  const shouldStartDevServer = !(await isServerReachable(baseURL))
  if (shouldStartDevServer) {
    serverProcess = startDevServer()
  }
  await waitForServer(baseURL)

  const child = spawn(process.execPath, [cliPath, 'test', ...process.argv.slice(2)], {
    cwd: repoRoot,
    env: process.env,
    stdio: 'inherit',
  })

  child.on('exit', code => {
    stopServer()
    process.exit(code ?? 1)
  })
} catch (error) {
  stopServer()
  console.error(error)
  process.exit(1)
}
