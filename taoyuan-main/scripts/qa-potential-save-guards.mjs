/* global console, process */

import fs from 'node:fs'
import path from 'node:path'
import { createRequire, registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const srcRoot = path.join(projectRoot, 'src')
const require = createRequire(import.meta.url)

const tryResolveFile = candidate => {
  const variants = [candidate, `${candidate}.ts`, `${candidate}.js`, path.join(candidate, 'index.ts'), path.join(candidate, 'index.js')]
  for (const item of variants) {
    try {
      if (fs.statSync(item).isFile()) return item
    } catch {
      // Try the next import shape.
    }
  }
  return null
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'file-saver') return { url: 'qa:file-saver', shortCircuit: true }
    if (specifier === 'qmsg') return { url: 'qa:qmsg', shortCircuit: true }
    if (specifier === '@/router') return { url: 'qa:router', shortCircuit: true }
    if (specifier === '@/composables/useAudio' || specifier === './useAudio') return { url: 'qa:audio', shortCircuit: true }
    if (specifier.startsWith('@/')) {
      const resolved = tryResolveFile(path.join(srcRoot, specifier.slice(2)))
      if (!resolved) throw new Error(`无法解析模块：${specifier}`)
      return { url: pathToFileURL(resolved).href, shortCircuit: true }
    }
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
      const resolved = tryResolveFile(path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier))
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
        source: 'export default { push() {}, replace() {}, currentRoute: { value: { name: "game" } } }',
        shortCircuit: true
      }
    }
    if (url === 'qa:audio') {
      return {
        format: 'module',
        source: `
          const noop = () => {}
          const asyncNoop = async () => {}
          const makeRef = value => ({ value })
          const sfxEnabled = makeRef(false)
          const bgmEnabled = makeRef(false)
          export const useAudio = () => ({
            sfxEnabled,
            bgmEnabled,
            toggleSfx: noop,
            toggleBgm: noop,
            startBgm: asyncNoop,
            stopBgm: noop,
            switchToSeasonalBgm: asyncNoop,
            startFestivalBgm: asyncNoop,
            endFestivalBgm: noop,
            startMinigameBgm: asyncNoop,
            endMinigameBgm: noop,
            startHanhaiBgm: asyncNoop,
            endHanhaiBgm: noop
          })
          export const sfxClick = noop
          export const sfxWater = noop
          export const sfxPlant = noop
          export const sfxHarvest = noop
          export const sfxDig = noop
          export const sfxBuy = noop
          export const sfxCoin = noop
          export const sfxLevelUp = noop
          export const sfxAttack = noop
          export const sfxHurt = noop
          export const sfxEncounter = noop
          export const sfxDefend = noop
          export const sfxFlee = noop
          export const sfxVictory = noop
          export const sfxReel = noop
          export const sfxFishCatch = noop
          export const sfxLineBroken = noop
          export const sfxMine = noop
          export const sfxSleep = noop
          export const sfxError = noop
          export const sfxForage = noop
          export const sfxGameStart = noop
          export const sfxCountdownTick = noop
          export const sfxCountdownFinal = noop
          export const sfxGameAction = noop
          export const sfxRewardClaim = noop
          export const sfxMiniPerfect = noop
          export const sfxMiniGood = noop
          export const sfxMiniPoor = noop
          export const sfxMiniFail = noop
          export const sfxRankFirst = noop
          export const sfxRankSecond = noop
          export const sfxRankThird = noop
          export const sfxRankLose = noop
          export const sfxGameActionLight = noop
          export const sfxFishBite = noop
          export const sfxCastLine = noop
          export const sfxPaddle = noop
          export const sfxRaceFinish = noop
          export const sfxRiddleReveal = noop
          export const sfxRiddleWrong = noop
          export const sfxTeaPour = noop
          export const sfxTeaBell = noop
          export const sfxItemSelect = noop
          export const sfxJudging = noop
          export const sfxArrowFly = noop
          export const sfxPotClang = noop
          export const sfxWindGust = noop
          export const sfxKitePull = noop
          export const sfxDoughStep = noop
          export const sfxDumplingDone = noop
          export const sfxFireworkLaunch = noop
          export const sfxFireworkBoom = noop
          export const sfxRouletteTick = noop
          export const sfxRouletteSpin = noop
          export const sfxRouletteStop = noop
          export const sfxDiceTick = noop
          export const sfxDiceRoll = noop
          export const sfxDiceLand = noop
          export const sfxCupTick = noop
          export const sfxCupShuffle = noop
          export const sfxCupReveal = noop
          export const sfxCricketTick = noop
          export const sfxCricketChirp = noop
          export const sfxCricketClash = noop
          export const sfxCardFlip = noop
          export const sfxChipBet = noop
          export const sfxFoldCards = noop
          export const sfxGunshot = noop
          export const sfxGunEmpty = noop
          export const sfxCasinoWin = noop
          export const sfxCasinoLose = noop
        `,
        shortCircuit: true
      }
    }
    if (url.startsWith('file:') && /\.(ts|tsx)$/.test(url)) {
      const filePath = fileURLToPath(url)
      const source = fs.readFileSync(filePath, 'utf8')
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

const errors = []
const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const { createPinia, setActivePinia } = await import('pinia')
setActivePinia(createPinia())

const { POTENTIAL_NODE_DEFS, POTENTIAL_NODE_MAX_RANK, POTENTIAL_RESOURCE_DEFS } = await import(pathToFileURL(path.join(srcRoot, 'data/potential.ts')).href)
const { usePotentialStore } = await import(pathToFileURL(path.join(srcRoot, 'stores/usePotentialStore.ts')).href)
const { applyGameplaySaveFieldRepairs, detectGameplaySaveFieldAnomalies } = require(path.join(projectRoot, '..', 'server', 'src', 'taoyuanSaveRuntime.js'))

const store = usePotentialStore()

assert(POTENTIAL_RESOURCE_DEFS.length === 4, '潜能正式版必须保留 4 类资源。')
assert(POTENTIAL_NODE_DEFS.length === 20, '潜能正式版必须保留 20 个节点。')
assert(new Set(POTENTIAL_NODE_DEFS.map(node => node.id)).size === POTENTIAL_NODE_DEFS.length, '潜能节点 ID 不得重复。')
assert(POTENTIAL_NODE_MAX_RANK === 30, '潜能正式版节点上限必须是 30 阶。')
assert(POTENTIAL_NODE_DEFS.every(node => node.maxRank === POTENTIAL_NODE_MAX_RANK), '每个潜能节点都必须开放 30 阶。')
assert(POTENTIAL_NODE_DEFS.every(node => node.firstVersionConnected), '每个潜能节点都必须正式开放。')
assert(POTENTIAL_NODE_DEFS.every(node => node.costsByRank.length === node.maxRank), '每个潜能节点必须为每一阶配置成本。')

const serverMaxRankSave = {
  potential: {
    nodeRanks: Object.fromEntries(POTENTIAL_NODE_DEFS.map(node => [node.id, node.maxRank]))
  }
}
const serverMaxRankAnomalies = detectGameplaySaveFieldAnomalies(serverMaxRankSave)
assert(
  !serverMaxRankAnomalies.some(anomaly => String(anomaly.field_path).startsWith('potential.nodeRanks.')),
  'server save field validation must accept official 30-rank potential nodes.'
)
const serverMaxResourceSave = {
  potential: {
    resources: Object.fromEntries(POTENTIAL_RESOURCE_DEFS.map(resource => [resource.id, 9999]))
  }
}
const serverMaxResourceAnomalies = detectGameplaySaveFieldAnomalies(serverMaxResourceSave)
assert(
  !serverMaxResourceAnomalies.some(anomaly => String(anomaly.field_path).startsWith('potential.resources.')),
  'server save field validation must accept all official potential resources at 9999.'
)
const serverLongRunningSave = {
  game: {
    year: 100,
    season: 'spring',
    day: 1
  }
}
const serverLongRunningAnomalies = detectGameplaySaveFieldAnomalies(serverLongRunningSave)
assert(
  !serverLongRunningAnomalies.some(anomaly => anomaly.field_path === 'game.year'),
  'server save field validation must not clamp legitimate year 100 long-running saves.'
)
const serverOverflowSave = {
  gameplayData: {
    potential: {
      nodeRanks: {
        craft_processing_flow: POTENTIAL_NODE_MAX_RANK + 9
      }
    }
  }
}
const serverOverflowRepair = applyGameplaySaveFieldRepairs(serverOverflowSave, 'qa_potential_save_guards')
assert(serverOverflowRepair.repaired, 'server save repair must handle potential node ranks above 30.')
assert(
  serverOverflowSave.gameplayData.potential.nodeRanks.craft_processing_flow === POTENTIAL_NODE_MAX_RANK,
  'server save repair must clamp potential node ranks to the official 30-rank cap.'
)

store.deserialize({
  resources: {
    potential_insight: -3,
    spirit_breath: 100000,
    artisan_notes: 2.8
  },
  nodeRanks: {
    body_vital_root: 99,
    body_low_hp_sense: 99,
    trail_mine_entry_hint: 1,
    invalid_node: 2
  },
  sourceReceipts: {
    broken: {
      id: 'broken',
      sourceId: 'mine_boss_clear',
      eventKey: 'bad',
      periodKey: 'p',
      rewards: [{ resourceId: 'potential_insight', amount: -10 }],
      reason: 'bad',
      createdAt: 'bad'
    }
  },
  sourceCapProgress: {
    mine_boss_clear: {
      periodKey: 'd',
      claims: 99,
      resourceAmounts: {
        potential_insight: -1,
        mountain_jade: 3.8
      }
    }
  },
  branchRespecUsedSeasonKeys: {
    body: ['y1-spring', 'y1-spring', 3]
  },
  branchRespecRecords: [
    {
      id: 1,
      branchId: 'body',
      refunded: [{ resourceId: 'potential_insight', amount: 2.5 }],
      retainedCost: [{ resourceId: 'spirit_breath', amount: -1 }],
      createdAt: 3
    },
    { id: 'bad', branchId: 'bad_branch' }
  ]
})

assert(store.getPotentialResource('potential_insight') === 0, '负数潜能资源必须归零。')
assert(store.getPotentialResource('spirit_breath') === 9999, '潜能资源必须封顶到 9999。')
assert(store.getPotentialResource('artisan_notes') === 2, '潜能资源必须按整数归一化。')
assert(store.getNodeRank('body_vital_root') === POTENTIAL_NODE_MAX_RANK, '潜能节点阶数不得超过正式版 maxRank。')
assert(store.getNodeRank('body_low_hp_sense') === POTENTIAL_NODE_MAX_RANK, '旧档高阶潜能节点必须封顶到正式版 maxRank。')
assert(store.potentialMigrationLogs.length >= 3, '异常潜能旧档必须留下迁移修正记录。')
assert((store.branchRespecUsedSeasonKeys.body ?? []).length === 1, '重修季节记录必须去重并过滤非法值。')
assert(store.branchRespecRecords.length === 1, '重修记录必须过滤非法分线。')

store.deserialize({})
store.addPotentialResource('potential_insight', 10)
store.addPotentialResource('spirit_breath', 5)
assert(store.canUpgradePotentialNode('body_vital_root'), '资源充足时根骨首节点必须可升级。')
const upgraded = store.upgradePotentialNode('body_vital_root')
assert(upgraded.success, '潜能升级 action 必须成功消耗材料并升阶。')
assert(store.getNodeRank('body_vital_root') === 1, '潜能升级后节点阶数必须增加。')
const duplicateReceiptA = store.claimPotentialSourceReward('mine_boss_clear', 'qa-boss')
const duplicateReceiptB = store.claimPotentialSourceReward('mine_boss_clear', 'qa-boss')
assert(duplicateReceiptA.success, '首次来源结算应发放潜能材料。')
assert(!duplicateReceiptB.success, '同一来源结算凭据不得重复发放。')
const preview = store.getPotentialBranchRefundPreview('body')
assert(preview.canRefund && preview.refunded.length > 0, '已投入分线必须可预览重修返还。')
const refunded = store.refundPotentialBranch('body')
assert(refunded.success && store.getNodeRank('body_vital_root') === 0, '分线重修必须清空本线节点并返还资源。')

if (errors.length > 0) {
  console.error(`qa-potential-save-guards failed (${errors.length})`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-potential-save-guards passed')
