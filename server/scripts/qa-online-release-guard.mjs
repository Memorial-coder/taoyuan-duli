import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..')
const apiPath = path.join(serverRoot, 'src', 'routes', 'api.js')
const configPath = path.join(serverRoot, 'src', 'config.js')

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const collectRouteLines = source => source
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(line => /^router\.(?:get|post|delete|put|patch)\(/.test(line))

const assertGuardedRoutes = (routeLines, pathFragment, guardKey) => {
  const missing = routeLines.filter(line =>
    line.includes(pathFragment) && !line.includes(`createOnlineReleaseGuard('${guardKey}')`)
  )
  assert(
    missing.length === 0,
    `${pathFragment} routes missing ${guardKey} release guard:\n${missing.join('\n')}`,
  )
}

const apiSource = await readFile(apiPath, 'utf8')
const configSource = await readFile(configPath, 'utf8')
const routeLines = collectRouteLines(apiSource)

assert(configSource.includes('taoyuan_online_expedition_room_enabled'), 'default config missing expedition room feature flag')
assert(configSource.includes('taoyuan_online_module_switch_expedition'), 'default config missing expedition module switch')
assert(apiSource.includes('expeditionRoomEnabled'), 'online release normalization missing expeditionRoomEnabled')
assert(apiSource.includes('moduleSwitches.expedition'), 'online release module map missing expedition switch')
assert(apiSource.includes('featureFlags.expeditionRoomEnabled'), 'online release feature map missing expedition flag')

assertGuardedRoutes(routeLines, '/taoyuan/online/expedition/rooms', 'expedition')
assertGuardedRoutes(routeLines, '/taoyuan/online/social/neighbors', 'social')
assertGuardedRoutes(routeLines, '/taoyuan/online/social/subscriptions', 'social')

console.log('[qa-online-release-guard] OK')
