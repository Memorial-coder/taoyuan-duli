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
  Object.defineProperty(globalThis, 'navigator', { value: { sendBeacon: () => true, userAgent: 'qa-new-game-reset-guards' }, configurable: true })
  Object.defineProperty(globalThis, 'Element', { value: function Element() {}, configurable: true })
  Object.defineProperty(globalThis, 'HTMLElement', { value: function HTMLElement() {}, configurable: true })
  Object.defineProperty(globalThis, 'SVGElement', { value: function SVGElement() {}, configurable: true })
  Object.defineProperty(globalThis, 'fetch', { value: async () => ({ ok: true, json: async () => ({}) }), configurable: true })
}

installBrowserShims()

const { createPinia, setActivePinia } = await import('pinia')
setActivePinia(createPinia())

const resetGameModule = await import(pathToFileURL(path.join(srcRoot, 'composables/useResetGame.ts')).href)
const regionMapModule = await import(pathToFileURL(path.join(srcRoot, 'stores/useRegionMapStore.ts')).href)
const frontierChronicleModule = await import(pathToFileURL(path.join(srcRoot, 'stores/useFrontierChronicleStore.ts')).href)
const playerRecordCenterModule = await import(pathToFileURL(path.join(srcRoot, 'stores/usePlayerRecordCenterStore.ts')).href)
const gameStoreModule = await import(pathToFileURL(path.join(srcRoot, 'stores/useGameStore.ts')).href)
const playerStoreModule = await import(pathToFileURL(path.join(srcRoot, 'stores/usePlayerStore.ts')).href)

const { resetAllStoresForNewGame } = resetGameModule
const { useRegionMapStore } = regionMapModule
const { useFrontierChronicleStore } = frontierChronicleModule
const { usePlayerRecordCenterStore } = playerRecordCenterModule
const { useGameStore } = gameStoreModule
const { usePlayerStore } = playerStoreModule

const regionMapStore = useRegionMapStore()
const frontierChronicleStore = useFrontierChronicleStore()
const playerRecordCenterStore = usePlayerRecordCenterStore()
const gameStore = useGameStore()
const playerStore = usePlayerStore()

gameStore.startNewGame('meadowlands')
playerStore.setIdentity('旧档', 'female')

regionMapStore.saveData.activeSession = {
  id: 'old-active-session',
  regionId: 'ancient_road',
  routeId: 'ancient_road_supply_relay',
  bossId: null,
  targetName: '旧档远征',
  status: 'ongoing',
  startedAtDayTag: '2-summer-12'
}
regionMapStore.saveData.journeyHistory = [{ id: 'old-history', title: '旧档路线' }]
regionMapStore.saveData.journeyActionState = { old_action: ['claimed'] }

frontierChronicleStore.recordChronicleEntry({
  entryKey: 'old-chronicle',
  type: 'journey',
  title: '旧档见闻',
  summary: '旧档留下的见闻。',
  detailLines: ['旧档路线详情'],
  regionId: 'ancient_road',
  season: 'summer',
  weather: 'sunny',
  rumorId: null,
  companionNpcId: null,
  companionName: '',
  variantId: null,
  firstRecordedDayTag: '2-summer-12',
  lastRecordedDayTag: '2-summer-12',
  tags: ['旧档']
})
frontierChronicleStore.recordRumorReceipt({
  rumorId: 'old-rumor',
  regionId: 'ancient_road',
  title: '旧传闻',
  sourceNpcId: 'npc_old',
  sourceNpcName: '旧人',
  resolvedDayTag: '2-summer-12',
  summary: '旧档传闻回执。'
})
frontierChronicleStore.recordPhotoMoment({
  chronicleEntryKey: 'old-chronicle',
  label: '旧档留影',
  frameHint: '旧档',
  regionId: 'ancient_road',
  season: 'summer',
  weather: 'sunny',
  capturedDayTag: '2-summer-12'
})
frontierChronicleStore.recordRegionNotable('ancient_road', 'old-notable')

playerRecordCenterStore.recordDailyDigest({
  dayTag: '2-summer-12',
  title: '旧档日报',
  sections: [
    {
      sectionId: 'journey',
      title: '旧档远征',
      tone: 'success',
      headline: '旧档路线完成',
      detailLines: ['旧档日志'],
      priority: 5
    }
  ],
  alerts: [{ message: '旧档提示', tone: 'warning' }],
  createdAt: 123
})
playerRecordCenterStore.markDailyDigestRead('2-summer-12')
playerRecordCenterStore.setLastOpenTab('chronicle')

assert(regionMapStore.saveData.activeSession !== null, '预置旧档 activeSession 失败')
assert(regionMapStore.saveData.journeyHistory.length > 0, '预置旧档 journeyHistory 失败')
assert(frontierChronicleStore.serialize().chronicleEntries.length > 0, '预置旧档见闻失败')
assert(frontierChronicleStore.serialize().rumorReceipts.length > 0, '预置旧档传闻失败')
assert(frontierChronicleStore.serialize().photoMoments.length > 0, '预置旧档留影失败')
assert(playerRecordCenterStore.serialize().dailyDigests.length > 0, '预置旧档日报失败')

try {
  resetAllStoresForNewGame()
} catch (error) {
  errors.push(`resetAllStoresForNewGame 抛错：${error instanceof Error ? error.message : String(error)}`)
}

let regionSave = null
try {
  regionSave = regionMapStore.serialize()
} catch (error) {
  errors.push(`区域远征 reset 后序列化失败：${error instanceof Error ? error.message : String(error)}`)
}
const chronicleSave = frontierChronicleStore.serialize()
const recordSave = playerRecordCenterStore.serialize()

assert(!!regionSave && regionSave.activeSession === null, '新游戏 reset 后不应保留区域远征 activeSession')
assert(!!regionSave && regionSave.journeyHistory.length === 0, '新游戏 reset 后不应保留区域远征历史')
assert(!!regionSave && Object.keys(regionSave.journeyActionState).length === 0, '新游戏 reset 后不应保留区域远征动作状态')

assert(chronicleSave.chronicleEntries.length === 0, '新游戏 reset 后不应保留前线纪事条目')
assert(chronicleSave.rumorReceipts.length === 0, '新游戏 reset 后不应保留前线传闻回执')
assert(chronicleSave.photoMoments.length === 0, '新游戏 reset 后不应保留前线留影')
assert(Object.values(chronicleSave.regionNotables).every(entries => entries.length === 0), '新游戏 reset 后不应保留区域 notable')

assert(recordSave.dailyDigests.length === 0, '新游戏 reset 后不应保留玩家记录中心日报')
assert(recordSave.lastViewedDigestDayTag === '', '新游戏 reset 后不应保留已读日报标记')
assert(recordSave.lastOpenTab === 'daily', '新游戏 reset 后记录中心默认标签应回到 daily')

if (errors.length === 0) {
  gameStore.startNewGame('standard')
  const newGameRegionSave = regionMapStore.serialize()
  const newGameChronicleSave = frontierChronicleStore.serialize()
  const newGameRecordSave = playerRecordCenterStore.serialize()

  assert(newGameRegionSave.activeSession === null, '新角色开始后仍不应保留旧远征会话')
  assert(newGameRegionSave.journeyHistory.length === 0, '新角色开始后仍不应保留旧远征历史')
  assert(newGameChronicleSave.chronicleEntries.length === 0, '新角色开始后仍不应保留旧纪事')
  assert(newGameRecordSave.dailyDigests.length === 0, '新角色开始后仍不应保留旧日报')
}

if (errors.length > 0) {
  console.error('qa-new-game-reset-guards 失败:')
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log('qa-new-game-reset-guards 通过')
}
