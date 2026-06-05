/* global console, process, setTimeout, clearTimeout, setInterval, clearInterval */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import ts from 'typescript'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const srcRoot = path.join(projectRoot, 'src')

const errors = []

const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

const tryResolveFile = candidate => {
  const variants = [
    candidate,
    `${candidate}.ts`,
    `${candidate}.js`,
    path.join(candidate, 'index.ts'),
    path.join(candidate, 'index.js')
  ]
  for (const item of variants) {
    try {
      if (fs.statSync(item).isFile()) return item
    } catch {
      // Candidate path does not exist.
    }
  }
  return null
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'file-saver') return { url: 'qa:file-saver', shortCircuit: true }
    if (specifier === 'qmsg') return { url: 'qa:qmsg', shortCircuit: true }
    if (specifier === '@/router') return { url: 'qa:router', shortCircuit: true }
    if (specifier.startsWith('@/')) {
      const resolved = tryResolveFile(path.join(srcRoot, specifier.slice(2)))
      if (!resolved) throw new Error(`无法解析模块：${specifier}`)
      return { url: pathToFileURL(resolved).href, shortCircuit: true }
    }
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
      const parentPath = fileURLToPath(context.parentURL)
      const resolved = tryResolveFile(path.resolve(path.dirname(parentPath), specifier))
      if (resolved) return { url: pathToFileURL(resolved).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url === 'qa:file-saver') {
      return {
        format: 'module',
        source: 'export const saveAs = () => {}',
        shortCircuit: true
      }
    }
    if (url === 'qa:qmsg') {
      return {
        format: 'module',
        source: 'const noop = () => {}; const Qmsg = { config: noop, info: noop, success: noop, warning: noop, error: noop, closeAll: noop }; export default Qmsg;',
        shortCircuit: true
      }
    }
    if (url === 'qa:router') {
      return {
        format: 'module',
        source: `
          const currentRoute = { value: { name: 'farm', path: '/game/farm' } }
          const router = {
            currentRoute,
            push: async location => {
              currentRoute.value = { name: location?.name ?? currentRoute.value.name, path: '/game/mock' }
            },
            replace: async () => {},
            back: () => {},
            beforeEach: () => {},
            afterEach: () => {}
          }
          export default router
        `,
        shortCircuit: true
      }
    }
    if (url.startsWith('file:') && /\.(ts|tsx)$/.test(url)) {
      const filePath = fileURLToPath(url)
      const source = fs
        .readFileSync(filePath, 'utf8')
        .replace(/import\.meta\.env/g, 'globalThis.__QA_IMPORT_META_ENV__')
      const transpiled = ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.Preserve,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true
        },
        fileName: filePath
      })
      return { format: 'module', source: transpiled.outputText, shortCircuit: true }
    }
    return nextLoad(url, context)
  }
})

const installBrowserShims = () => {
  globalThis.__QA_IMPORT_META_ENV__ = { DEV: true, PROD: false }
  const storage = new Map()
  const localStorage = {
    getItem: key => storage.get(String(key)) ?? null,
    setItem: (key, value) => storage.set(String(key), String(value)),
    removeItem: key => storage.delete(String(key)),
    clear: () => storage.clear()
  }
  const documentObj = {
    hidden: false,
    visibilityState: 'visible',
    documentElement: { style: { fontSize: '', setProperty: () => {}, removeProperty: () => {} } },
    body: { appendChild: () => {}, removeChild: () => {} },
    createElement: () => ({ style: {}, classList: { add: () => {}, remove: () => {} } }),
    querySelector: () => null,
    addEventListener: () => {},
    removeEventListener: () => {}
  }
  const windowObj = {
    localStorage,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    history: { state: null, pushState: () => {}, replaceState: () => {}, back: () => {} },
    matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
    addEventListener: () => {},
    removeEventListener: () => {}
  }
  const locationObj = { href: 'http://localhost/#/game/farm', hash: '#/game/farm', pathname: '/', search: '' }

  Object.defineProperty(globalThis, 'window', { value: windowObj, configurable: true })
  Object.defineProperty(globalThis, 'self', { value: windowObj, configurable: true })
  Object.defineProperty(globalThis, 'location', { value: locationObj, configurable: true })
  Object.defineProperty(globalThis, 'history', { value: windowObj.history, configurable: true })
  Object.defineProperty(globalThis, 'localStorage', { value: localStorage, configurable: true })
  Object.defineProperty(globalThis, 'document', { value: documentObj, configurable: true })
  Object.defineProperty(globalThis, 'navigator', { value: { sendBeacon: () => true, userAgent: 'qa-navigation-clock-guards' }, configurable: true })
  Object.defineProperty(globalThis, 'Element', { value: function Element() {}, configurable: true })
  Object.defineProperty(globalThis, 'HTMLElement', { value: function HTMLElement() {}, configurable: true })
  Object.defineProperty(globalThis, 'SVGElement', { value: function SVGElement() {}, configurable: true })
  Object.defineProperty(globalThis, 'fetch', { value: async () => ({ ok: true, json: async () => ({}) }), configurable: true })
}

installBrowserShims()

const { createPinia, setActivePinia } = await import('pinia')
setActivePinia(createPinia())

const navigationModule = await import(pathToFileURL(path.join(srcRoot, 'composables/useNavigation.ts')).href)
const clockModule = await import(pathToFileURL(path.join(srcRoot, 'composables/useGameClock.ts')).href)
const gameStoreModule = await import(pathToFileURL(path.join(srcRoot, 'stores/useGameStore.ts')).href)

const { isNavigationClockPausedRoute, syncNavigationClockPauseForRoute } = navigationModule
const { useGameClock } = clockModule
const { useGameStore } = gameStoreModule

const clock = useGameClock()
const gameStore = useGameStore()

const expectRoutePaused = routeName => {
  assert(isNavigationClockPausedRoute(routeName), `${routeName} 应判定为 navigation 暂停页`)
}

const expectRouteRunning = routeName => {
  assert(!isNavigationClockPausedRoute(routeName), `${routeName} 应判定为可恢复时钟的地点`)
}

expectRoutePaused('inventory')
expectRoutePaused('skills')
expectRoutePaused('online')
expectRoutePaused('online-festival')
expectRoutePaused('online-manor')
expectRoutePaused('expedition-room')
expectRoutePaused('wallet')

expectRouteRunning('farm')
expectRouteRunning('mining')
expectRouteRunning('workshop')
expectRouteRunning('processing')
expectRouteRunning('village-projects')
expectRouteRunning('region-map')

clock.stopClock()
clock.resumeClock('manual')
gameStore.hour = 6
clock.startClock()

syncNavigationClockPauseForRoute('inventory')
assert(clock.hasPauseReason('navigation'), 'farm -> inventory 后应写入 navigation 暂停原因')
assert(clock.isPaused.value, 'inventory 暂停页应暂停时钟')
await wait(850)
const pausedHour = gameStore.hour
assert(Math.abs(pausedHour - 6) < 0.001, 'inventory 暂停页不应推进游戏时间')

syncNavigationClockPauseForRoute('farm')
assert(!clock.hasPauseReason('navigation'), 'inventory -> farm 后应清理 navigation 暂停原因')
assert(!clock.isPaused.value, '无其他暂停原因时 farm 应恢复时钟')
await wait(850)
assert(gameStore.hour > pausedHour, '返回 farm 后游戏时间应继续增长')

syncNavigationClockPauseForRoute('skills')
assert(clock.hasPauseReason('navigation'), 'skills 应写入 navigation 暂停原因')
syncNavigationClockPauseForRoute('farm')
assert(!clock.hasPauseReason('navigation'), 'skills -> farm 后应清理 navigation 暂停原因')

syncNavigationClockPauseForRoute('online-festival')
assert(clock.hasPauseReason('navigation'), 'online 子路由应写入 navigation 暂停原因')
syncNavigationClockPauseForRoute('farm')
assert(!clock.hasPauseReason('navigation'), 'online -> farm 后应清理 navigation 暂停原因')

clock.pauseClock('manual')
syncNavigationClockPauseForRoute('skills')
syncNavigationClockPauseForRoute('farm')
assert(clock.hasPauseReason('manual'), '返回 farm 不应清理手动暂停')
assert(!clock.hasPauseReason('navigation'), '返回 farm 应只清理 navigation 暂停')
assert(clock.isPaused.value, '手动暂停仍存在时应继续暂停')
clock.resumeClock('manual')

clock.pauseClock('navigation')
clock.pauseClock('modal')
clock.pauseClock('settings')
clock.pauseClock('visibility')
clock.pauseClock('manual')
clock.stopClock()
assert(clock.hasPauseReason('manual'), 'stopClock 应保留手动暂停原因')
assert(!clock.hasPauseReason('navigation'), 'stopClock 应清理 navigation 暂停原因')
assert(!clock.hasPauseReason('modal'), 'stopClock 应清理 modal 暂停原因')
assert(!clock.hasPauseReason('settings'), 'stopClock 应清理 settings 暂停原因')
assert(!clock.hasPauseReason('visibility'), 'stopClock 应清理 visibility 暂停原因')
clock.resumeClock('manual')
clock.stopClock()

if (errors.length > 0) {
  console.error('qa-navigation-clock-guards 失败:')
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log('qa-navigation-clock-guards 通过')
}
