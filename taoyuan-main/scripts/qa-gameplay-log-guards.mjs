/* global console, process */

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
      // ignore missing candidate
    }
  }
  return null
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'qmsg') return { url: 'qa:qmsg', shortCircuit: true }
    if (specifier.startsWith('@/')) {
      const resolved = tryResolveFile(path.join(srcRoot, specifier.slice(2)))
      if (!resolved) throw new Error(`无法解析模块：${specifier}`)
      return { url: pathToFileURL(resolved).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url === 'qa:qmsg') {
      return {
        format: 'module',
        source: 'const noop = () => {}; const Qmsg = { config: noop, info: noop, success: noop, warning: noop, error: noop, closeAll: noop }; export default Qmsg;',
        shortCircuit: true
      }
    }
    if (url.startsWith('file:') && /\.(ts|tsx)$/.test(url)) {
      const filePath = fileURLToPath(url)
      const transpiled = ts.transpileModule(fs.readFileSync(filePath, 'utf8'), {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
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

const storage = new Map()
const timerIds = new Set()
let nextTimerId = 1
let fetchCalls = 0

globalThis.window = {
  location: { hash: '#/game/mining' },
  localStorage: {
    getItem: key => storage.get(String(key)) ?? null,
    setItem: (key, value) => storage.set(String(key), String(value)),
    removeItem: key => storage.delete(String(key)),
    clear: () => storage.clear()
  },
  setTimeout: () => {
    const id = nextTimerId++
    timerIds.add(id)
    return id
  },
  clearTimeout: id => {
    timerIds.delete(id)
  },
  addEventListener: () => {}
}

Object.defineProperty(globalThis, 'navigator', {
  value: { sendBeacon: () => true },
  configurable: true
})

globalThis.fetch = async () => {
  fetchCalls += 1
  return { ok: false, status: 503 }
}

const logModule = await import(pathToFileURL(path.join(srcRoot, 'composables', 'useGameLog.ts')).href)
const {
  addLog,
  resetLogs,
  logHistory,
  GAME_LOG_HISTORY_LIMIT,
  GAMEPLAY_LOG_QUEUE_LIMIT,
  _flushGameplayLogQueueForQa,
  _getGameplayLogDebugState,
  setQmsgParent
} = logModule

resetLogs()
for (let index = 0; index < GAME_LOG_HISTORY_LIMIT + 160; index += 1) {
  addLog(`矿洞探索日志 ${index}`)
}
assert(logHistory.value.length === GAME_LOG_HISTORY_LIMIT, 'logHistory 必须按上限裁剪')
assert(_getGameplayLogDebugState().queueLength === GAMEPLAY_LOG_QUEUE_LIMIT, 'gameplayLogQueue 必须按上限裁剪')

resetLogs()
for (let index = 0; index < 5; index += 1) addLog('重复的挖矿日志')
assert(logHistory.value.length === 1, '短时间重复日志应折叠为一条历史记录')
assert(logHistory.value[0]?.meta?.repeat_count === 5, '重复日志应记录 repeat_count')
assert(_getGameplayLogDebugState().queueLength === 1, '短时间重复日志应折叠为一条待上报记录')

resetLogs()
for (let index = 0; index < 60; index += 1) addLog(`离线战斗日志 ${index}`)
for (let index = 0; index < 4; index += 1) {
  await _flushGameplayLogQueueForQa()
}
assert(fetchCalls >= 4, '失败 flush 应检查 response.ok 并触发有限重试')
assert(_getGameplayLogDebugState().queueLength <= 10, '超过最大重试次数的日志必须从队列丢弃')

resetLogs()
for (let index = 0; index < 20; index += 1) addLog(`待清理日志 ${index}`)
resetLogs()
assert(_getGameplayLogDebugState().queueLength === 0, 'resetLogs 必须同步清理待上报队列')

const gameLogSource = fs.readFileSync(path.join(srcRoot, 'composables', 'useGameLog.ts'), 'utf8')
const gameLayoutSource = fs.readFileSync(path.join(srcRoot, 'views', 'GameLayout.vue'), 'utf8')
assert(/export const setQmsgParent =/.test(gameLogSource), 'useGameLog must expose a Qmsg parent sync helper.')
assert(/QMSG_CONTAINER_SELECTOR = '\.qmsg-shadow-container'/.test(gameLogSource), 'Qmsg parent sync must target the shared Qmsg container.')
assert(/Qmsg\.config\(\{\s*parent: resolvedParent,\s*useShadowRoot: false\s*\}\)/.test(gameLogSource), 'Qmsg parent sync must update the configured parent.')
assert(/existingContainer\.parentNode !== resolvedParent[\s\S]*resolvedParent\.appendChild\(existingContainer\)/.test(gameLogSource), 'Qmsg parent sync must move the existing container into the active parent.')
assert(/import \{(?=[^}]*\baddLog\b)(?=[^}]*\bsetQmsgParent\b)(?=[^}]*\b_registerDayLabelGetter\b)[^}]*\} from '@\/composables\/useGameLog'/.test(gameLayoutSource), 'GameLayout must import the Qmsg parent sync helper.')
assert(/const syncGameLogToastParent = \(\) => \{[\s\S]*setQmsgParent\(shouldMountInGameRoot \? root : null\)/.test(gameLayoutSource), 'GameLayout must mount Qmsg under the fullscreen game root.')
assert(/const syncFullscreenState = \(\) => \{[\s\S]*syncGameLogToastParent\(\)/.test(gameLayoutSource), 'Fullscreen state sync must also sync the Qmsg parent.')
assert(/onUnmounted\(\(\) => \{[\s\S]*setQmsgParent\(null\)/.test(gameLayoutSource), 'GameLayout unmount must restore Qmsg to the default parent.')

const createQmsgParent = () => ({
  children: [],
  appendChild(child) {
    child.parentNode = this
    this.children.push(child)
  }
})
const defaultQmsgParent = createQmsgParent()
const fullscreenQmsgParent = createQmsgParent()
const existingQmsgContainer = { parentNode: defaultQmsgParent }
globalThis.document = {
  body: defaultQmsgParent,
  documentElement: defaultQmsgParent,
  querySelector: selector => (selector === '.qmsg-shadow-container' ? existingQmsgContainer : null)
}
setQmsgParent(fullscreenQmsgParent)
assert(existingQmsgContainer.parentNode === fullscreenQmsgParent, 'setQmsgParent must move existing Qmsg container into fullscreen parent.')
setQmsgParent(null)
assert(existingQmsgContainer.parentNode === defaultQmsgParent, 'setQmsgParent(null) must restore Qmsg container to the default parent.')
delete globalThis.document

const miningStoreSource = fs.readFileSync(path.join(srcRoot, 'stores', 'useMiningStore.ts'), 'utf8')
assert(/const MINING_COMBAT_LOG_LIMIT = 120/.test(miningStoreSource), 'useMiningStore 必须定义 combatLog 上限')
assert(/watch\(\s*\(\) => combatLog\.value\.length[\s\S]*combatLog\.value\.splice\(0, overflow\)/.test(miningStoreSource), 'combatLog 必须按长度同步裁剪')

const miningViewSource = fs.readFileSync(path.join(srcRoot, 'views', 'game', 'MiningView.vue'), 'utf8')
assert(/const MINING_EXPLORE_LOG_LIMIT = 120/.test(miningViewSource), 'MiningView 必须定义 exploreLog 上限')
assert(/watch\(\s*\(\) => exploreLog\.value\.length[\s\S]*exploreLog\.value\.splice\(0, overflow\)/.test(miningViewSource), 'exploreLog 必须按长度同步裁剪')
assert(/data-testid="mining-explore-dialog"/.test(miningViewSource), 'MiningView should expose the mining explore dialog test id.')
assert(/class="game-modal-overlay fixed inset-0 bg-black\/60 flex items-start justify-center overflow-y-auto z-50 p-4"/.test(miningViewSource), 'mining explore dialog should stay top anchored when log height changes.')
assert(/class="h-24 text-xs text-muted space-y-0\.5 overflow-y-auto"/.test(miningViewSource), 'mining explore log area should reserve a stable height.')
assert(/data-testid="mining-combat-dialog"/.test(miningViewSource), 'MiningView should expose the mining combat dialog test id.')
assert(/class="game-modal-overlay fixed inset-0 bg-black\/60 flex items-start justify-center overflow-y-auto z-60 p-4"/.test(miningViewSource), 'mining combat dialog should stay top anchored when combat log height changes.')
assert(/class="h-28 text-xs space-y-0\.5 overflow-y-auto"/.test(miningViewSource), 'mining combat log area should reserve a stable height.')

assert(/type MineRewardDisplayEntry = \{ itemId: string; quantity: number; quality\?: Quality; label: string \}/.test(miningStoreSource), '矿洞动作结果必须提供奖励展示条目类型')
assert(/const recentRewards = ref<MineRewardDisplayEntry\[\]>\(\[\]\)/.test(miningStoreSource), 'useMiningStore 必须记录最近获得的具体奖励')
assert(/const buildRewardDisplayEntries = \(entries: InventoryRewardEntry\[\]\): MineRewardDisplayEntry\[\]/.test(miningStoreSource), '矿洞奖励必须通过统一 helper 生成具体物品名和数量')
assert(/label: `\$\{name\}×\$\{entry\.quantity\}`/.test(miningStoreSource), '矿洞奖励展示标签必须包含物品名和数量')
assert(/挖到了\$\{formatRewardLabels\(rewards\)\}/.test(miningStoreSource), '挖矿日志必须显示具体挖到的物品和数量')
assert(/刚获得：\$\{formatRewardLabels\(rewards\)\}/.test(miningStoreSource), '矿洞宝箱或炸弹日志必须显示刚获得的具体奖励')
assert(/掉落：\$\{formatRewardLabels\(rewards\)\}/.test(miningStoreSource), '战斗掉落日志必须显示具体物品名和数量')
assert(/data-testid="mine-recent-rewards"/.test(miningViewSource), 'MiningView 必须渲染矿洞“刚获得”奖励区')
assert(/reward\.label/.test(miningViewSource), '矿洞“刚获得”奖励区必须展示具体奖励标签')

if (errors.length > 0) {
  console.error('qa-gameplay-log-guards 失败:')
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log('qa-gameplay-log-guards 通过')
}
