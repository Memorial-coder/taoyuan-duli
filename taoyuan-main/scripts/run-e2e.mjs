import { spawn, spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { findAvailablePort, isPlaywrightEnvironmentError, isTcpServerReachable, stopWindowsViteProcessesForPort, wait, waitForTcpServer } from './port-utils.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const host = '127.0.0.1'
const preferredPort = Number(process.env.TAOYUAN_E2E_PORT || 4175)
const port = process.env.TAOYUAN_E2E_PORT?.trim() ? preferredPort : await findAvailablePort(host, preferredPort)
const baseURL = `http://${host}:${port}`
const configuredDevServerSettleMs = Number(process.env.TAOYUAN_DEV_SERVER_SETTLE_MS)
const devServerSettleMs = Number.isFinite(configuredDevServerSettleMs) && configuredDevServerSettleMs >= 0
  ? configuredDevServerSettleMs
  : 30_000

process.env.TAOYUAN_E2E_PORT = String(port)
process.env.TAOYUAN_E2E_EXTERNAL_SERVER = '1'

const cliPath = path.resolve(repoRoot, 'node_modules', 'playwright', 'cli.js')
const startDevServer = () => {
  let markReady
  let markFailed
  let readySettled = false
  const ready = new Promise((resolve, reject) => {
    markReady = () => {
      if (readySettled) return
      readySettled = true
      resolve()
    }
    markFailed = error => {
      if (readySettled) return
      readySettled = true
      reject(error)
    }
  })
  const child = process.platform === 'win32'
    ? spawn(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', `npm run dev -- --host ${host} --port ${port} --strictPort`], {
        cwd: repoRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    : spawn('npm', ['run', 'dev', '--', '--host', host, '--port', String(port), '--strictPort'], {
        cwd: repoRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
      })

  child.stdout.on('data', chunk => {
    process.stdout.write(chunk)
    if (/ready in|Local:/i.test(String(chunk))) markReady()
  })
  child.stderr.on('data', chunk => {
    process.stderr.write(chunk)
    if (/ready in|Local:/i.test(String(chunk))) markReady()
  })
  child.once('exit', code => {
    if (!readySettled) markFailed(new Error(`Dev server exited before ready, code=${code ?? 'unknown'}`))
  })

  return { child, ready }
}

const waitForStartedDevServer = async server => {
  if (!server) {
    await waitForTcpServer(baseURL)
    return
  }
  await Promise.race([
    server.ready,
    wait(120_000).then(() => {
      throw new Error(`Timed out waiting for dev server stdout readiness at ${baseURL}`)
    })
  ])
  await wait(devServerSettleMs)
}

let serverProcess = null

const stopProcessTree = child => {
  if (!child || !child.pid) return
  if (process.platform === 'win32') {
    if (!child.killed) {
      spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' })
    }
    stopWindowsViteProcessesForPort(port)
    return
  }
  child.kill('SIGTERM')
}

const stopServer = () => {
  stopProcessTree(serverProcess)
}

const forwardSignal = signal => {
  process.on(signal, () => {
    stopServer()
    process.exit(1)
  })
}

forwardSignal('SIGINT')
forwardSignal('SIGTERM')

const probePlaywrightBrowser = async () => {
  const { chromium } = await import('@playwright/test')
  const browser = await chromium.launch()
  await browser.close()
}

try {
  try {
    await probePlaywrightBrowser()
  } catch (error) {
    if (isPlaywrightEnvironmentError(error)) {
      console.log('[run-e2e] Skipped: current environment cannot launch Playwright Chromium (spawn EPERM).')
      process.exit(0)
    }
    throw error
  }

  const shouldStartDevServer = !(await isTcpServerReachable(baseURL))
  if (shouldStartDevServer) {
    const server = startDevServer()
    serverProcess = server.child
    await waitForStartedDevServer(server)
  } else {
    await waitForStartedDevServer(null)
  }

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
