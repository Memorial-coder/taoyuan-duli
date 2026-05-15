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

export const isPlaywrightEnvironmentError = error =>
  /browserType\.launch: spawn EPERM|spawn EPERM/i.test(String(error?.stack || error?.message || error || ''))
