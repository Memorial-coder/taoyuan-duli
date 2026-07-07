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
const questViewSource = fs.readFileSync(path.join(srcRoot, 'views/game/QuestView.vue'), 'utf8')
const goalsViewSource = fs.readFileSync(path.join(srcRoot, 'views/game/GoalsView.vue'), 'utf8')
const questOperationHintsSource = fs.readFileSync(path.join(srcRoot, 'components/game/QuestBoardOperationHints.vue'), 'utf8')
const questDataSource = fs.readFileSync(path.join(srcRoot, 'data/quests.ts'), 'utf8')
const questStoreSource = fs.readFileSync(path.join(srcRoot, 'stores/useQuestStore.ts'), 'utf8')

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
    if (specifier === 'file-saver') return { url: 'qa:file-saver', shortCircuit: true }
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
    if (url === 'qa:file-saver') {
      return {
        format: 'module',
        source: 'export const saveAs = () => {}; export default { saveAs };',
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
    documentElement: {
      style: { fontSize: '', setProperty: () => {}, removeProperty: () => {} },
      setAttribute: () => {},
      removeAttribute: () => {}
    },
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

const questDetailModalLine = questViewSource
  .split('\n')
  .find(line => line.includes('data-testid="quest-detail-modal"')) ?? ''

const getStringLiteralValue = node =>
  node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : null

const getObjectPropertyName = prop => {
  if (!prop.name) return ''
  if (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)) return prop.name.text
  return ''
}

const assertQuestItemDisplayNamesMatchItems = () => {
  const sourcePath = path.join(srcRoot, 'data', 'quests.ts')
  const source = questDataSource
  const sourceFile = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true)
  const mismatches = []

  const visit = node => {
    if (ts.isObjectLiteralExpression(node)) {
      const props = new Map()
      for (const prop of node.properties) {
        if (ts.isPropertyAssignment(prop)) props.set(getObjectPropertyName(prop), prop.initializer)
      }

      const pairs = []
      if (props.has('itemId')) {
        pairs.push({ idExpr: props.get('itemId'), nameExpr: props.get('itemName') ?? props.get('name') })
      }
      if (props.has('targetItemId') && props.has('targetItemName')) {
        pairs.push({ idExpr: props.get('targetItemId'), nameExpr: props.get('targetItemName') })
      }

      for (const pair of pairs) {
        const itemId = getStringLiteralValue(pair.idExpr)
        const displayName = getStringLiteralValue(pair.nameExpr)
        if (!itemId || !displayName) continue
        const item = getItemById(itemId)
        if (!item || item.name !== displayName) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
          mismatches.push(`${line + 1}:${itemId}:${displayName}->${item?.name ?? 'missing'}`)
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  assert(mismatches.length === 0, `Quest item display names must match item definitions: ${mismatches.join(', ')}`)
}

const getArrayLiteralByName = (sourceFile, name) => {
  let result = null
  const visit = node => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === name &&
      node.initializer &&
      ts.isArrayLiteralExpression(node.initializer)
    ) {
      result = node.initializer
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return result
}

const getObjectLiteralStringProp = (node, propName) => {
  if (!ts.isObjectLiteralExpression(node)) return null
  for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop) || getObjectPropertyName(prop) !== propName) continue
    return getStringLiteralValue(prop.initializer)
  }
  return null
}

const assertVillagerQuestPoolDiversity = () => {
  const sourcePath = path.join(srcRoot, 'data', 'quests.ts')
  const sourceFile = ts.createSourceFile(sourcePath, questDataSource, ts.ScriptTarget.Latest, true)
  const array = getArrayLiteralByName(sourceFile, 'VILLAGER_QUEST_TEMPLATES')
  assert(!!array, 'Village quest templates must remain statically inspectable.')
  if (!array) return

  const templates = array.elements.filter(ts.isObjectLiteralExpression)
  const targetIds = templates.map(node => getObjectLiteralStringProp(node, 'targetItemId')).filter(Boolean)
  const rumorTargetIds = templates
    .filter(node => getObjectLiteralStringProp(node, 'category') === 'rumor')
    .map(node => getObjectLiteralStringProp(node, 'targetItemId'))
    .filter(Boolean)
  const formalTargetIds = templates
    .filter(node => getObjectLiteralStringProp(node, 'category') !== 'rumor')
    .map(node => getObjectLiteralStringProp(node, 'targetItemId'))
    .filter(Boolean)

  assert(new Set(targetIds).size >= 32, 'Village daily quest pool should cover at least 32 unique requested items.')
  assert(new Set(formalTargetIds).size >= 28, 'Formal villager quest pool should cover at least 28 unique requested items.')
  assert(new Set(rumorTargetIds).size >= 14, 'Rumor quest pool should cover at least 14 unique requested items.')
  for (const requiredItemId of [
    'egg',
    'milk',
    'honey',
    'firewood',
    'wild_mushroom',
    'fish_feed',
    'green_tea_drink',
    'processed_osmanthus_tea',
    'iron_bar',
    'mayonnaise',
    'cheese',
    'wool',
    'rabbit_fur'
  ]) {
    assert(targetIds.includes(requiredItemId), `Village daily quest pool should include ${requiredItemId}.`)
  }

  assert(
    questDataSource.includes("template.category !== 'rumor' && !profile.categories.includes(template.category)"),
    'Rumor quests must bypass formal NPC category filters so the daily rumor slot can actually rotate.'
  )
  assert(
    questDataSource.includes('recentSameSignature') &&
      questDataSource.includes('recentSameTarget') &&
      questDataSource.includes('repeatPenalty'),
    'Village quest generation should penalize recently completed same NPC/item templates.'
  )
  assert(
    questDataSource.includes("const VILLAGER_CATEGORY_LABELS: Record<VillagerQuestCategory, string>") &&
      questDataSource.includes("rumor: '传闻请托'"),
    'Village quest category labels should include rumor requests.'
  )
  assert(
    questStoreSource.includes("'festival_prep', 'rumor'") &&
      questStoreSource.includes("sourceLabel: typeof quest.sourceLabel === 'string' ? quest.sourceLabel : undefined") &&
      questStoreSource.includes('rumorTask: quest.rumorTask === true ? true : undefined'),
    'Quest save normalization must preserve rumor category, source label and lightweight quest marker.'
  )
}

const dataForItemNames = await import(pathToFileURL(path.join(projectRoot, 'src/data/index.ts')).href)
const {
  CHILD_SPIRIT_SPECIAL_ORDER_ACTIVITY_SOURCE_ID,
  generateSpecialOrder,
  getItemById
} = dataForItemNames
assertQuestItemDisplayNamesMatchItems()
assertVillagerQuestPoolDiversity()

const assertChildSpiritSpecialOrderGeneration = () => {
  assert(
    questDataSource.includes("export const CHILD_SPIRIT_SPECIAL_ORDER_ACTIVITY_SOURCE_ID = 'child_spirit_sweets'"),
    'Child-spirit special orders must expose a shared activity source id.'
  )
  assert(
    questStoreSource.includes('getActivityWindowAllowedSpecialOrderSourceIds') &&
      questStoreSource.includes('CHILD_SPIRIT_SPECIAL_ORDER_ACTIVITY_SOURCE_ID'),
    'Limited activity windows must not filter out best-friend child-spirit special orders.'
  )
  assert(
    questDataSource.includes('blockedAntiRepeatTags?: string[]') &&
      questDataSource.includes('const antiRepeatFiltered = blockedAntiRepeatTags.size > 0'),
    'Special order generation should filter cooling anti-repeat tags before selecting a template.'
  )

  const baseOptions = {
    npcFriendshipLevels: {
      a_hua: 'bestFriend',
      shi_tou: 'bestFriend'
    },
    allowedActivitySourceIds: [CHILD_SPIRIT_SPECIAL_ORDER_ACTIVITY_SOURCE_ID]
  }
  const childSpiritOrder = generateSpecialOrder('spring', 2, baseOptions)
  assert(childSpiritOrder?.activitySourceId === CHILD_SPIRIT_SPECIAL_ORDER_ACTIVITY_SOURCE_ID, 'Best-friend Ahua/Shitou child-spirit orders must enter the allowed special-order candidate pool.')
  assert(childSpiritOrder?.requiredNpcFriendshipLevel === 'bestFriend', 'Child-spirit orders must preserve the best-friend gate on generated quests.')
  assert(childSpiritOrder?.spiritBreathReward === true, 'Child-spirit orders must preserve the spirit-breath reward flag on generated quests.')

  const blockedWithoutFriendship = generateSpecialOrder('spring', 2, {
    npcFriendshipLevels: {
      a_hua: 'friendly',
      shi_tou: 'friendly'
    },
    allowedActivitySourceIds: [CHILD_SPIRIT_SPECIAL_ORDER_ACTIVITY_SOURCE_ID]
  })
  assert(blockedWithoutFriendship === null, 'Child-spirit orders must stay out of the pool before Ahua/Shitou reach best-friend.')

  const cooledPoolOrder = generateSpecialOrder('spring', 2, {
    npcFriendshipLevels: {
      a_hua: 'bestFriend',
      shi_tou: 'bestFriend'
    },
    blockedAntiRepeatTags: ['child_spirit', 'spirit_breath', 'a_hua', 'shi_tou']
  })
  assert(cooledPoolOrder?.activitySourceId !== CHILD_SPIRIT_SPECIAL_ORDER_ACTIVITY_SOURCE_ID, 'Cooling child-spirit anti-repeat tags should make the generator pick another available tier-2 order.')
}

assertChildSpiritSpecialOrderGeneration()

assert(questDetailModalLine.includes('max-h-[calc(100dvh-2rem)]'), 'Quest detail modal must fit inside the mobile viewport.')
assert(questDetailModalLine.includes('md:max-h-[calc(100dvh-3rem)]'), 'Quest detail modal must fit inside the desktop overlay padding.')
assert(questDetailModalLine.includes('overflow-y-auto'), 'Quest detail modal must expose vertical scrolling.')
assert(questDetailModalLine.includes('overscroll-contain'), 'Quest detail modal scroll should stay contained in the overlay.')
assert(!questViewSource.includes('QuestBoardOperationHints'), 'QuestView must not render the operation hints; they belong on the Goals page only.')
assert(!questViewSource.includes('GuidanceDigestPanel'), 'QuestView must not render the route guidance digest; it belongs on the Goals page only.')
assert(goalsViewSource.includes('QuestBoardOperationHints'), 'GoalsView must render the shared quest board operation hints.')
assert(goalsViewSource.includes('GuidanceDigestPanel'), 'GoalsView must render the route guidance digest.')
assert(goalsViewSource.includes('GuidanceDigestPanel surface-id="quest"'), 'GoalsView route guidance digest must keep the quest surface id for persisted digest state.')
assert(questOperationHintsSource.includes('data-testid="quest-operation-hints"'), 'Shared operation hints need a stable test id.')
assert(questOperationHintsSource.includes('weeklyPlanSnapshot.primaryRouteLabel'), 'Shared operation hints must show the weekly route from goalStore.')
assert(questOperationHintsSource.includes('questStore.specialOrder'), 'Shared operation hints must carry quest board special order direction.')
assert(
  /id:\s*'chen_bo_errand_stock'[\s\S]*?minQuality:\s*'fine'/.test(questDataSource) &&
    /id:\s*'chen_bo_firewood_stock'[\s\S]*?minQuality:\s*'fine'/.test(questDataSource) &&
    /id:\s*'xiao_man_festival_carpentry'[\s\S]*?minQuality:\s*'fine'/.test(questDataSource) &&
    /id:\s*'zhao_mujiang_workbench'[\s\S]*?minQuality:\s*'excellent'/.test(questDataSource) &&
    /id:\s*'xue_qin_festival_decor'[\s\S]*?minQuality:\s*'excellent'/.test(questDataSource),
  'Selected formal villager quests should carry the planned minimum quality gates.'
)
assert(
  questDataSource.includes("id: 'combo_scene_bamboo', itemId: 'bamboo', itemName: '竹子', quantity: 6, minQuality: 'excellent'"),
  'Street-scene special order bamboo combo requirement should require excellent-or-better bamboo.'
)
assert(
  questDataSource.includes('const qualityRewardMultiplier = getQuestQualityRewardMultiplier(template.minQuality)') &&
    questDataSource.includes('Math.floor(template.moneyReward * qualityRewardMultiplier)') &&
    questDataSource.includes('Math.floor(TIER_FRIENDSHIP[clampedTier - 1]! * qualityRewardMultiplier)'),
  'Quality-gated quests should use the shared quest quality reward multiplier for generated base rewards.'
)
assert(
  questStoreSource.includes('getQuestInventoryCount') &&
    questStoreSource.includes('getCombinedItemCountAtLeast') &&
    questStoreSource.includes('removeCombinedItemAtLeast'),
  'Quest submission should count and consume minimum-quality combined inventory through shared helpers.'
)
assert(
  questViewSource.includes('formatQuestRequirementTarget') &&
    questViewSource.includes('getQuestCarriedCount(quest)') &&
    questViewSource.includes('getQuestQualitySuffix'),
  'Quest UI should display minimum-quality requirements and matching carried counts.'
)

const { createPinia, setActivePinia } = await import('pinia')
const inventoryStoreModule = await import(pathToFileURL(path.join(projectRoot, 'src/stores/useInventoryStore.ts')).href)
const npcStoreModule = await import(pathToFileURL(path.join(projectRoot, 'src/stores/useNpcStore.ts')).href)
const playerStoreModule = await import(pathToFileURL(path.join(projectRoot, 'src/stores/usePlayerStore.ts')).href)
const potentialStoreModule = await import(pathToFileURL(path.join(projectRoot, 'src/stores/usePotentialStore.ts')).href)
const questStoreModule = await import(pathToFileURL(path.join(projectRoot, 'src/stores/useQuestStore.ts')).href)
const shopStoreModule = await import(pathToFileURL(path.join(projectRoot, 'src/stores/useShopStore.ts')).href)
const villageProjectStoreModule = await import(pathToFileURL(path.join(projectRoot, 'src/stores/useVillageProjectStore.ts')).href)

const freshStores = () => {
  setActivePinia(createPinia())
  return {
    inventoryStore: inventoryStoreModule.useInventoryStore(),
    npcStore: npcStoreModule.useNpcStore(),
    playerStore: playerStoreModule.usePlayerStore(),
    potentialStore: potentialStoreModule.usePotentialStore(),
    questStore: questStoreModule.useQuestStore(),
    shopStore: shopStoreModule.useShopStore(),
    villageProjectStore: villageProjectStoreModule.useVillageProjectStore()
  }
}

{
  const { inventoryStore, npcStore, potentialStore, questStore } = freshStores()
  const save = questStore.serialize()
  questStore.deserialize({
    ...save,
    specialOrder: null,
    activeQuests: [],
    completedQuestCount: 0,
    completedQuestHistory: [],
    specialOrderSettlementReceipts: [],
    recentSpecialOrderTagHistory: [],
    weeklySpecialOrderState: {
      lastRefreshWeekId: '',
      refreshMode: 'weekly'
    },
    activityQuestWindowState: {
      version: 1,
      activeCampaignId: 'ws10_limited_theme_rotation',
      activeQuestTemplateIds: ['ws10_theme_rotation'],
      lastRefreshDayTag: '1-spring-8',
      nextRefreshDayTag: '1-spring-15',
      completedWindowIds: [],
      claimedRewardMailIds: []
    }
  })

  const aHuaState = npcStore.npcStates.find(state => state.npcId === 'a_hua')
  const shiTouState = npcStore.npcStates.find(state => state.npcId === 'shi_tou')
  if (aHuaState) aHuaState.friendship = 2000
  if (shiTouState) shiTouState.friendship = 2000

  questStore.generateSpecialOrder('spring', 2, {
    weekId: 'qa-child-spirit-window',
    absoluteWeek: 8
  })

  const generatedOrder = questStore.specialOrder
  assert(generatedOrder?.activitySourceId === CHILD_SPIRIT_SPECIAL_ORDER_ACTIVITY_SOURCE_ID, 'Activity windows should still generate best-friend child-spirit orders when the active campaign whitelist does not include them.')
  assert(generatedOrder?.requiredNpcFriendshipLevel === 'bestFriend', 'Generated child-spirit orders should keep their friendship requirement in runtime store state.')
  assert(generatedOrder?.spiritBreathReward === true, 'Generated child-spirit orders should keep the runtime spirit-breath reward flag.')
  assert(
    questStore.lastSpecialOrderGenerationTrace?.attemptsDetail?.[0]?.candidates?.every(candidate => candidate.activitySourceId === CHILD_SPIRIT_SPECIAL_ORDER_ACTIVITY_SOURCE_ID),
    'Activity-window generation trace should show child-spirit candidates are admitted through the runtime whitelist.'
  )

  inventoryStore.items = [
    { itemId: 'food_osmanthus_cake', quantity: 2, quality: 'normal' },
    { itemId: 'food_jujube_cake', quantity: 2, quality: 'normal' }
  ]
  inventoryStore.tempItems = []
  const acceptResult = questStore.acceptSpecialOrder()
  assert(acceptResult.success === true, 'Generated child-spirit special order should be accepted.')
  const acceptedOrder = questStore.activeQuests.find(quest => quest.activitySourceId === CHILD_SPIRIT_SPECIAL_ORDER_ACTIVITY_SOURCE_ID)
  assert(acceptedOrder, 'Accepted child-spirit order should move into active quests.')
  assert(acceptedOrder && questStore.canSubmitQuest(acceptedOrder), 'Accepted child-spirit order should be submittable when the matching sweet is carried.')

  const beforeSpiritBreath = potentialStore.getPotentialResource('spirit_breath')
  const acceptedOrderId = acceptedOrder?.id ?? ''
  const submitResult = questStore.submitQuest(acceptedOrderId)
  const potentialSave = potentialStore.serialize()
  const questSave = questStore.serialize()
  assert(submitResult.success === true, 'Submitting a carried child-spirit special order should succeed.')
  assert(potentialStore.getPotentialResource('spirit_breath') === beforeSpiritBreath + 1, 'Child-spirit special order completion should grant spirit breath through the potential store.')
  assert(Object.keys(potentialSave.sourceReceipts).some(receiptId => receiptId.startsWith('child_spirit_sweets:')), 'Child-spirit completion should write a potential source receipt.')
  assert(questSave.completedQuestHistory[0]?.activitySourceLabel === generatedOrder?.activitySourceLabel, 'Child-spirit completion history should preserve the activity source label.')
  assert(questSave.completedQuestHistory[0]?.rewardSummary.includes('\u7075\u606f'), 'Child-spirit completion history should mention the spirit-breath reward.')
  assert(questSave.specialOrderSettlementReceipts.includes(acceptedOrderId), 'Child-spirit special order completion should write the special-order settlement receipt.')
  assert(questSave.recentSpecialOrderTagHistory.some(entry => entry.endsWith('|child_spirit')), 'Generating child-spirit orders should write anti-repeat history for the child_spirit tag.')
}

const clone = value => JSON.parse(JSON.stringify(value))

{
  const { inventoryStore, questStore } = freshStores()
  const firstQuest = {
    id: 'qa-crucian-seven',
    type: 'fishing',
    npcId: 'chen_bo',
    npcName: 'Chen Bo',
    description: 'QA crucian delivery 7',
    targetItemId: 'crucian',
    targetItemName: 'Crucian',
    targetQuantity: 7,
    collectedQuantity: 7,
    moneyReward: 70,
    friendshipReward: 0,
    daysRemaining: 2,
    accepted: true
  }
  const secondQuest = {
    id: 'qa-crucian-four',
    type: 'fishing',
    npcId: 'chen_bo',
    npcName: 'Chen Bo',
    description: 'QA crucian delivery 4',
    targetItemId: 'crucian',
    targetItemName: 'Crucian',
    targetQuantity: 4,
    collectedQuantity: 4,
    moneyReward: 40,
    friendshipReward: 0,
    daysRemaining: 2,
    accepted: true
  }

  inventoryStore.items = [{ itemId: 'crucian', quantity: 7, quality: 'normal' }]
  inventoryStore.tempItems = []
  questStore.deserialize({
    ...questStore.serialize(),
    activeQuests: [firstQuest, secondQuest],
    completedQuestCount: 0,
    completedQuestHistory: [],
    specialOrderSettlementReceipts: []
  })

  assert(questStore.canSubmitQuest(questStore.activeQuests[0]), 'A same-item fishing quest should be submittable while enough fish are carried.')
  assert(questStore.canSubmitQuest(questStore.activeQuests[1]), 'The smaller same-item quest is individually submittable before the shared stack is consumed.')

  const result = questStore.submitQuest(firstQuest.id)
  assert(result.success === true, 'Submitting the larger same-item fishing quest should succeed.')
  const remainingQuest = questStore.activeQuests.find(quest => quest.id === secondQuest.id)
  assert(remainingQuest, 'The smaller same-item fishing quest should remain active after the larger one is submitted.')
  assert(inventoryStore.getTotalItemCount('crucian') === 0, 'The shared crucian stack should be consumed by the larger quest.')
  if (remainingQuest) {
    assert(questStore.getQuestEffectiveProgress(remainingQuest) === 0, 'Same-item quest progress must reflect current inventory after another quest consumes the shared stack.')
    assert(!questStore.canSubmitQuest(remainingQuest), 'Same-item quest submit state must clear when current inventory is no longer enough.')
  }
}

{
  const { inventoryStore, questStore } = freshStores()
  const quest = {
    id: 'qa-fine-wood-delivery',
    type: 'delivery',
    npcId: 'chen_bo',
    npcName: '陈伯',
    description: 'QA 良品木材委托',
    targetItemId: 'wood',
    targetItemName: '木材',
    targetQuantity: 2,
    minQuality: 'fine',
    collectedQuantity: 0,
    moneyReward: 0,
    friendshipReward: 0,
    daysRemaining: 2,
    accepted: true
  }

  inventoryStore.items = [{ itemId: 'wood', quantity: 5, quality: 'normal' }]
  inventoryStore.tempItems = []
  questStore.deserialize({
    ...questStore.serialize(),
    activeQuests: [quest],
    completedQuestCount: 0,
    completedQuestHistory: [],
    specialOrderSettlementReceipts: []
  })

  assert(questStore.getQuestEffectiveProgress(questStore.activeQuests[0]) === 0, 'Normal wood should not count toward a fine-or-better delivery quest.')
  assert(!questStore.canSubmitQuest(questStore.activeQuests[0]), 'Fine-or-better delivery quest should not be submittable with normal wood only.')

  inventoryStore.items = [
    { itemId: 'wood', quantity: 5, quality: 'normal' },
    { itemId: 'wood', quantity: 1, quality: 'fine' },
    { itemId: 'wood', quantity: 1, quality: 'excellent' }
  ]
  inventoryStore.tempItems = [{ itemId: 'wood', quantity: 1, quality: 'supreme' }]

  assert(questStore.getQuestEffectiveProgress(questStore.activeQuests[0]) === 2, 'Fine and higher wood should count toward the quality-gated quest progress.')
  assert(questStore.canSubmitQuest(questStore.activeQuests[0]), 'Fine-or-better delivery quest should be submittable when enough eligible stacks are carried.')
  const result = questStore.submitQuest(quest.id)
  assert(result.success === true, 'Submitting a fine-or-better delivery quest should succeed with fine and excellent stacks.')
  assert(inventoryStore.getItemCount('wood', 'normal') === 5, 'Quality-gated quest submission must not consume lower-quality normal wood.')
  assert(inventoryStore.getItemCount('wood', 'fine') === 0, 'Quality-gated quest submission should consume fine wood first.')
  assert(inventoryStore.getItemCount('wood', 'excellent') === 0, 'Quality-gated quest submission should continue into excellent wood when needed.')
  assert(inventoryStore.getTempItemCount('wood', 'supreme') === 1, 'Quality-gated quest submission should leave supreme wood if fine/excellent satisfy the order.')
}

{
  const { inventoryStore, questStore } = freshStores()
  const quest = {
    id: 'qa-excellent-bamboo-combo',
    type: 'special_order',
    npcId: 'xue_qin',
    npcName: '雪芹',
    description: 'QA 精品竹子组合订单',
    targetItemId: 'bamboo',
    targetItemName: '竹子',
    targetQuantity: 2,
    collectedQuantity: 0,
    moneyReward: 0,
    friendshipReward: 0,
    daysRemaining: 3,
    accepted: true,
    orderVersion: '3.0',
    orderStageType: 'combo',
    comboRequirements: [
      { id: 'qa_combo_bamboo', itemId: 'bamboo', itemName: '竹子', quantity: 2, minQuality: 'excellent' }
    ]
  }

  inventoryStore.items = [
    { itemId: 'bamboo', quantity: 4, quality: 'normal' },
    { itemId: 'bamboo', quantity: 3, quality: 'fine' },
    { itemId: 'bamboo', quantity: 1, quality: 'excellent' }
  ]
  inventoryStore.tempItems = [{ itemId: 'bamboo', quantity: 1, quality: 'supreme' }]
  questStore.deserialize({
    ...questStore.serialize(),
    activeQuests: [quest],
    completedQuestCount: 0,
    completedQuestHistory: [],
    specialOrderSettlementReceipts: []
  })

  assert(questStore.getQuestEffectiveProgress(questStore.activeQuests[0]) === 2, 'Excellent-or-better combo requirement should count excellent and supreme bamboo only.')
  assert(questStore.canSubmitQuest(questStore.activeQuests[0]), 'Excellent-or-better combo order should be submittable when excellent and supreme stacks are carried.')
  const result = questStore.submitQuest(quest.id)
  assert(result.success === true, 'Submitting an excellent-or-better combo order should succeed with excellent and supreme bamboo.')
  assert(inventoryStore.getItemCount('bamboo', 'normal') === 4, 'Excellent combo submission must not consume normal bamboo.')
  assert(inventoryStore.getItemCount('bamboo', 'fine') === 3, 'Excellent combo submission must not consume fine bamboo.')
  assert(inventoryStore.getItemCount('bamboo', 'excellent') === 0, 'Excellent combo submission should consume excellent bamboo first.')
  assert(inventoryStore.getTempItemCount('bamboo', 'supreme') === 0, 'Excellent combo submission should continue into supreme bamboo when excellent is insufficient.')
}

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
