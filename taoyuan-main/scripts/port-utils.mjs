/* global fetch, process, setTimeout, URL */

import { spawnSync } from 'node:child_process'
import net from 'node:net'

export const canListenOnPort = (host, port) =>
  new Promise(resolve => {
    const server = net.createServer()
    server.unref()
    server.once('error', () => resolve(false))
    server.listen({ host, port }, () => {
      server.close(() => resolve(true))
    })
  })

export const findAvailablePort = async (host, preferredPort, attempts = 20) => {
  for (let port = preferredPort; port < preferredPort + attempts; port += 1) {
    if (await canListenOnPort(host, port)) return port
  }
  return preferredPort
}

export const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

export async function isServerReachable(url) {
  try {
    const response = await fetch(url)
    return response.ok
  } catch {
    return false
  }
}

export async function waitForServer(url, timeoutMs = 120_000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerReachable(url)) return
    await wait(1000)
  }
  throw new Error(`Timed out waiting for dev server at ${url}`)
}

const getTcpEndpoint = url => {
  const parsed = new URL(url)
  const port = Number(parsed.port || (parsed.protocol === 'https:' ? 443 : 80))
  return { host: parsed.hostname, port }
}

export const isTcpServerReachable = (url, timeoutMs = 1000) =>
  new Promise(resolve => {
    const { host, port } = getTcpEndpoint(url)
    const socket = net.createConnection({ host, port })
    const done = reachable => {
      socket.removeAllListeners()
      socket.destroy()
      resolve(reachable)
    }
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => done(true))
    socket.once('timeout', () => done(false))
    socket.once('error', () => done(false))
  })

export async function waitForTcpServer(url, timeoutMs = 120_000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (await isTcpServerReachable(url)) return
    await wait(1000)
  }
  throw new Error(`Timed out waiting for dev server TCP port at ${url}`)
}

const listWindowsViteProcessIdsForPort = port => {
  const targetPort = String(port).replace(/'/g, "''")
  const script = [
    `$port = '${targetPort}'`,
    'Get-CimInstance Win32_Process | Where-Object { $_.Name -eq "node.exe" -and $_.CommandLine -like "*vite*" -and ($_.CommandLine -like "*--port $port*" -or $_.CommandLine -like "*--port=$port*") } | ForEach-Object { $_.ProcessId }'
  ].join('; ')
  const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', script], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  })
  return String(result.stdout || '')
    .split(/\s+/)
    .map(value => value.trim())
    .filter(value => /^\d+$/.test(value))
}

export function stopWindowsViteProcessesForPort(port, attempts = 20) {
  if (process.platform !== 'win32') return
  let sawProcess = false
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const pids = listWindowsViteProcessIdsForPort(port)
    if (pids.length > 0) {
      sawProcess = true
      for (const pid of pids) {
        spawnSync('taskkill.exe', ['/pid', pid, '/t', '/f'], { stdio: 'ignore' })
      }
    } else if (sawProcess) {
      return
    }
    spawnSync('powershell.exe', ['-NoProfile', '-Command', 'Start-Sleep -Milliseconds 750'], { stdio: 'ignore' })
  }
}

export const isPlaywrightEnvironmentError = error =>
  /browserType\.launch: spawn EPERM|spawn EPERM|Invalid file descriptor to ICU data/i.test(String(error?.stack || error?.message || error || ''))
