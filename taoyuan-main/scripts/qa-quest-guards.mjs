/* global console, process, setTimeout, clearTimeout */

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
          const currentRoute = { value: { name: 'quest', path: '/game/quest' } }
          const router = {
            currentRoute,
            push: async () => {},
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
  const makeElement = (tag = 'div') => ({
    tagName: tag.toUpperCase(),
    style: { setProperty: () => {}, removeProperty: () => {} },
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    appendChild: () => {},
    removeChild: () => {},
    setAttribute: () => {},
    removeAttribute: () => {},
    insertBefore: () => {},
    cloneNode: () => makeElement(tag),
    firstChild: null,
    childNodes: [],
    innerHTML: '',
    content: { firstChild: null }
  })
  const documentObj = {
    hidden: false,
    visibilityState: 'visible',
    documentElement: { style: { fontSize: '', setProperty: () => {}, removeProperty: () => {} } },
    body: makeElement('body'),
    createElement: tag => makeElement(tag),
    createElementNS: (_ns, tag) => makeElement(tag),
    createTextNode: text => ({ nodeValue: String(text) }),
    createComment: text => ({ nodeValue: String(text) }),
    querySelector: () => null,
    addEventListener: () => {},
    removeEventListener: () => {}
  }
  const locationObj = {
    hash: '#/game/quest',
    host: 'localhost:4013',
    pathname: '/',
    search: '',
    origin: 'http://localhost:4013',
    assign: () => {},
    replace: () => {}
  }
  const windowObj = {
    location: locationObj,
    history: { state: null, replaceState: () => {}, pushState: () => {} },
    localStorage,
    setTimeout,
    clearTimeout,
    addEventListener: () => {},
    removeEventListener: () => {},
    document: documentObj,
    matchMedia: () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {}
    })
  }
  Object.defineProperty(globalThis, 'window', { value: windowObj, configurable: true })
  Object.defineProperty(globalThis, 'self', { value: windowObj, configurable: true })
  Object.defineProperty(globalThis, 'location', { value: locationObj, configurable: true })
  Object.defineProperty(globalThis, 'history', { value: windowObj.history, configurable: true })
  Object.defineProperty(globalThis, 'localStorage', { value: localStorage, configurable: true })
  Object.defineProperty(globalThis, 'document', { value: documentObj, configurable: true })
  Object.defineProperty(globalThis, 'navigator', { value: { sendBeacon: () => true }, configurable: true })
  Object.defineProperty(globalThis, 'Element', { value: function Element() {}, configurable: true })
  Object.defineProperty(globalThis, 'HTMLElement', { value: function HTMLElement() {}, configurable: true })
  Object.defineProperty(globalThis, 'SVGElement', { value: function SVGElement() {}, configurable: true })
  Object.defineProperty(globalThis, 'fetch', { value: async () => ({ ok: true, json: async () => ({}) }), configurable: true })
}

installBrowserShims()

const { createPinia, setActivePinia } = await import('pinia')
const inventoryStoreModule = await import(pathToFileURL(path.join(projectRoot, 'src/stores/useInventoryStore.ts')).href)
const playerStoreModule = await import(pathToFileURL(path.join(projectRoot, 'src/stores/usePlayerStore.ts')).href)
const questStoreModule = await import(pathToFileURL(path.join(projectRoot, 'src/stores/useQuestStore.ts')).href)
const shopStoreModule = await import(pathToFileURL(path.join(projectRoot, 'src/stores/useShopStore.ts')).href)
const villageProjectStoreModule = await import(pathToFileURL(path.join(projectRoot, 'src/stores/useVillageProjectStore.ts')).href)

const freshStores = () => {
  setActivePinia(createPinia())
  return {
    inventoryStore: inventoryStoreModule.useInventoryStore(),
    playerStore: playerStoreModule.usePlayerStore(),
    questStore: questStoreModule.useQuestStore(),
    shopStore: shopStoreModule.useShopStore(),
    villageProjectStore: villageProjectStoreModule.useVillageProjectStore()
  }
}

const clone = value => JSON.parse(JSON.stringify(value))

const makeFinalStageSpecialOrder = () => ({
  id: 'qa-special-order-final-stage',
  type: 'special_order',
  npcId: 'chen_bo',
  npcName: '陈伯',
  description: 'QA 多阶段特殊订单',
  targetItemId: 'stone',
  targetItemName: '石材',
  targetQuantity: 1,
  collectedQuantity: 0,
  moneyReward: 123,
  friendshipReward: 0,
  daysRemaining: 2,
  accepted: true,
  itemReward: [
    { itemId: 'wood', quantity: 1 },
    { itemId: 'iron_ore', quantity: 1 }
  ],
  orderVersion: '3.0',
  orderStageType: 'multi',
  stageDefinitions: [
    {
      id: 'prepare',
      title: '备料',
      description: '首阶段已完成。',
      phaseType: 'prepare',
      targetItemId: 'wood',
      targetItemName: '木材',
      targetQuantity: 1,
      deliveryMode: 'inventory',
      nextStageTemplateId: 'final'
    },
    {
      id: 'final',
      title: '最终交付',
      description: '交付最终石材。',
      phaseType: 'deliver',
      targetItemId: 'stone',
      targetItemName: '石材',
      targetQuantity: 1,
      deliveryMode: 'inventory'
    }
  ],
  orderProgressState: {
    currentStageIndex: 1,
    completedStageIds: ['prepare'],
    initialDaysRemaining: 3,
    currentRank: 'pending',
    stageProgress: [
      {
        stageId: 'prepare',
        completed: true,
        deliveredQuantity: 1,
        rewardClaimed: true,
        phaseType: 'prepare',
        nextStageTemplateId: 'final'
      },
      {
        stageId: 'final',
        completed: false,
        deliveredQuantity: 0,
        rewardClaimed: false,
        phaseType: 'deliver'
      }
    ],
    stageHistory: [
      {
        stageId: 'prepare',
        phaseType: 'prepare',
        deliveredQuantity: 1,
        resolution: 'advanced',
        summary: '首阶段已完成。'
      }
    ]
  }
})

const fillBagsSoFinalRewardCannotFit = inventoryStore => {
  const save = inventoryStore.serialize()
  inventoryStore.deserialize({
    ...save,
    capacity: 1,
    items: [{ itemId: 'stone', quantity: 1, quality: 'normal' }],
    tempItems: Array.from({ length: 10 }, () => ({
      itemId: 'copper_ore',
      quantity: 999,
      quality: 'normal'
    }))
  })
}

{
  const { inventoryStore, playerStore, questStore } = freshStores()
  fillBagsSoFinalRewardCannotFit(inventoryStore)
  playerStore.money = 0
  const quest = makeFinalStageSpecialOrder()
  questStore.deserialize({
    ...questStore.serialize(),
    activeQuests: [quest],
    completedQuestCount: 0,
    completedQuestHistory: [],
    specialOrderSettlementReceipts: []
  })

  const beforeActiveQuest = clone(questStore.activeQuests[0])
  const beforeInventory = inventoryStore.serialize()
  const failedResult = questStore.submitQuest(quest.id)
  assert(failedResult.success === false, '最终阶段整单奖励满包时提交必须失败。')
  assert(failedResult.message.includes('提交后腾出的空间仍不足'), '最终阶段奖励满包失败应返回容量不足提示。')
  assert(questStore.activeQuests.length === 1, '最终阶段奖励满包失败后订单必须仍在活跃列表。')
  assert(JSON.stringify(questStore.activeQuests[0].orderProgressState?.stageProgress) === JSON.stringify(beforeActiveQuest.orderProgressState.stageProgress), '满包失败不得改写 stageProgress。')
  assert(JSON.stringify(questStore.activeQuests[0].orderProgressState?.stageHistory) === JSON.stringify(beforeActiveQuest.orderProgressState.stageHistory), '满包失败不得追加最终阶段 stageHistory。')
  assert(JSON.stringify(questStore.activeQuests[0].orderProgressState?.completedStageIds) === JSON.stringify(beforeActiveQuest.orderProgressState.completedStageIds), '满包失败不得追加 completedStageIds。')
  assert(JSON.stringify(inventoryStore.serialize().items) === JSON.stringify(beforeInventory.items), '满包失败必须回滚已扣除的最终交付物。')
  assert(JSON.stringify(inventoryStore.serialize().tempItems) === JSON.stringify(beforeInventory.tempItems), '满包失败必须回滚临时背包。')
  assert(playerStore.money === 0, '满包失败不得发放整单铜钱奖励。')
  assert(!questStore.serialize().specialOrderSettlementReceipts.includes(quest.id), '满包失败不得写入特殊订单结算回执。')
  assert(questStore.completedQuestCount === 0 && questStore.completedQuestHistory.length === 0, '满包失败不得写入完成历史。')

  inventoryStore.capacity = 3
  const successResult = questStore.submitQuest(quest.id)
  assert(successResult.success === true, '整理空间后最终阶段应可重新提交成功。')
  assert(questStore.activeQuests.length === 0, '最终阶段成功后订单应移出活跃列表。')
  assert(playerStore.money === 123, '最终阶段整单铜钱奖励只能发放一次。')
  assert(inventoryStore.getItemCount('wood') === 1, '最终阶段整单物品奖励 wood 应发放一次。')
  assert(inventoryStore.getItemCount('iron_ore') === 1, '最终阶段整单物品奖励 iron_ore 应发放一次。')
  assert(inventoryStore.getItemCount('stone') === 0, '最终阶段成功后交付物应被扣除一次。')
  assert(questStore.serialize().specialOrderSettlementReceipts.filter(receiptId => receiptId === quest.id).length === 1, '最终阶段成功后特殊订单回执只能写入一次。')
  assert(questStore.completedQuestCount === 1 && questStore.completedQuestHistory.length === 1, '最终阶段成功后完成历史只能写入一次。')
}

{
  const { inventoryStore, playerStore, questStore, shopStore, villageProjectStore } = freshStores()
  villageProjectStore.getQuestMoneyBonusRate = () => 0.5
  villageProjectStore.getQuestFriendshipBonus = () => 3
  shopStore.getServiceContractEffectSummary = () => ({
    moneyRewardMultiplier: 2,
    reputationRewardMultiplier: 1,
    flatReputationBonus: 0,
    goalReputationFlatBonus: 0,
    dailyQuestBoardBonus: 0,
    museumVisitorBonusRate: 0,
    museumDisplayRatingBonus: 0,
    maintenanceCostRateReduction: 0,
    fishPondDailyOutputBonus: 0,
    ticketRewards: { construction: 2 }
  })

  const quest = {
    id: 'qa-quest-preview-bonus',
    type: 'delivery',
    npcId: 'chen_bo',
    npcName: '陈伯',
    description: 'QA 奖励预览普通委托',
    targetItemId: 'stone',
    targetItemName: '石材',
    targetQuantity: 1,
    collectedQuantity: 0,
    moneyReward: 100,
    friendshipReward: 2,
    daysRemaining: 3,
    accepted: true,
    ticketReward: { construction: 1 }
  }
  inventoryStore.items = [{ itemId: 'stone', quantity: 1, quality: 'normal' }]
  inventoryStore.tempItems = []
  playerStore.money = 0
  questStore.deserialize({
    ...questStore.serialize(),
    activeQuests: [quest],
    completedQuestCount: 0,
    completedQuestHistory: [],
    specialOrderSettlementReceipts: []
  })

  const preview = questStore.getQuestRewardPreviewModel(questStore.activeQuests[0])
  assert(preview.finalMoneyReward === 300, '奖励预览应叠加村庄铜钱加成和服务合同倍率。')
  assert(preview.finalFriendshipReward === 5, '奖励预览应叠加村庄好感加成。')
  assert(preview.finalTicketReward?.construction === 3, '奖励预览应合并基础票券和服务合同票券。')
  const result = questStore.submitQuest(quest.id)
  assert(result.success === true, '普通委托奖励预览回归需要提交成功。')
  assert(playerStore.money === preview.finalMoneyReward, '普通委托提交到账铜钱应与预览一致。')
  assert(result.message.includes(`获得${preview.finalMoneyReward}文`), '普通委托提交日志应与预览铜钱一致。')
}

{
  const { inventoryStore, playerStore, questStore, shopStore, villageProjectStore } = freshStores()
  villageProjectStore.getQuestMoneyBonusRate = () => 0
  villageProjectStore.getQuestFriendshipBonus = () => 0
  shopStore.getServiceContractEffectSummary = () => ({
    moneyRewardMultiplier: 1,
    reputationRewardMultiplier: 1,
    flatReputationBonus: 0,
    goalReputationFlatBonus: 0,
    dailyQuestBoardBonus: 0,
    museumVisitorBonusRate: 0,
    museumDisplayRatingBonus: 0,
    maintenanceCostRateReduction: 0,
    fishPondDailyOutputBonus: 0,
    ticketRewards: {}
  })

  const quest = {
    id: 'qa-special-order-preview-s',
    type: 'special_order',
    npcId: 'chen_bo',
    npcName: '陈伯',
    description: 'QA 奖励预览特殊订单 S 档',
    targetItemId: 'stone',
    targetItemName: '石材',
    targetQuantity: 1,
    collectedQuantity: 0,
    moneyReward: 100,
    friendshipReward: 0,
    daysRemaining: 3,
    accepted: true,
    orderVersion: '3.0',
    orderStageType: 'single',
    orderScoreRule: {
      id: 'qa-score-rule',
      label: 'QA 评分',
      description: 'QA',
      factorSummary: [],
      thresholds: [
        { rank: 'C', minScore: 0, label: '合格', rewardMoneyMultiplier: 1, rewardTicketMultiplier: 1 },
        { rank: 'A', minScore: 1, label: '优质', rewardMoneyMultiplier: 1.2, rewardTicketMultiplier: 1.2 },
        { rank: 'S', minScore: 2, label: '样板', rewardMoneyMultiplier: 1.5, rewardTicketMultiplier: 1.5 }
      ]
    }
  }
  inventoryStore.items = [{ itemId: 'stone', quantity: 1, quality: 'normal' }]
  inventoryStore.tempItems = []
  playerStore.money = 0
  questStore.deserialize({
    ...questStore.serialize(),
    activeQuests: [quest],
    completedQuestCount: 0,
    completedQuestHistory: [],
    specialOrderSettlementReceipts: []
  })

  const preview = questStore.getQuestRewardPreviewModel(questStore.activeQuests[0])
  assert(preview.specialOrderRank === 'S', '特殊订单奖励预览应计算当前可提交评分档。')
  assert(preview.specialOrderMoneyMultiplier === 1.5, '特殊订单奖励预览应使用 S 档铜钱倍率。')
  assert(preview.specialOrderMoneyMultiplierRange?.max === 1.5, '特殊订单奖励预览应暴露评分倍率范围。')
  assert(preview.finalMoneyReward === 150, '特殊订单奖励预览应按 S 档倍率计算最终铜钱。')
  const result = questStore.submitQuest(quest.id)
  assert(result.success === true, '特殊订单奖励预览回归需要提交成功。')
  assert(playerStore.money === preview.finalMoneyReward, '特殊订单提交到账铜钱应与预览一致。')
  assert(result.message.includes('订单评分：样板交付'), '特殊订单提交日志应包含 S 档评分结算。')
  assert(result.message.includes(`获得${preview.finalMoneyReward}文`), '特殊订单提交日志应与预览铜钱一致。')
}

if (errors.length > 0) {
  console.error('Quest guard failed:')
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log('Quest guard passed.')
