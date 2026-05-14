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
