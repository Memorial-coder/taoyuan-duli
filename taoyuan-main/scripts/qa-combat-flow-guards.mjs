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
          const currentRoute = { value: { name: 'mining', path: '/game/mining' } }
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
    style: {
      setProperty: () => {},
      removeProperty: () => {}
    },
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false
    },
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
      style: {
        fontSize: '',
        setProperty: () => {},
        removeProperty: () => {}
      }
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
    hash: '#/game/mining',
    host: 'localhost:4013',
    pathname: '/',
    search: '',
    origin: 'http://localhost:4013',
    assign: () => {},
    replace: () => {}
  }
  const windowObj = {
    location: locationObj,
    history: {
      state: null,
      replaceState: () => {},
      pushState: () => {}
    },
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
const combatRuntime = await import(pathToFileURL(path.join(projectRoot, 'src/utils/combatRuntime.ts')).href)
const playerStoreModule = await import(pathToFileURL(path.join(projectRoot, 'src/stores/usePlayerStore.ts')).href)
const inventoryStoreModule = await import(pathToFileURL(path.join(projectRoot, 'src/stores/useInventoryStore.ts')).href)
const skillStoreModule = await import(pathToFileURL(path.join(projectRoot, 'src/stores/useSkillStore.ts')).href)
const miningStoreModule = await import(pathToFileURL(path.join(projectRoot, 'src/stores/useMiningStore.ts')).href)
const regionStoreModule = await import(pathToFileURL(path.join(projectRoot, 'src/stores/useRegionMapStore.ts')).href)
const fishingStoreModule = await import(pathToFileURL(path.join(projectRoot, 'src/stores/useFishingStore.ts')).href)
const journeyBuildModule = await import(pathToFileURL(path.join(projectRoot, 'src/stores/journeyBuild.ts')).href)
const regionsModule = await import(pathToFileURL(path.join(projectRoot, 'src/data/regions.ts')).href)
const mineModule = await import(pathToFileURL(path.join(projectRoot, 'src/data/mine.ts')).href)
const recipesModule = await import(pathToFileURL(path.join(projectRoot, 'src/data/recipes.ts')).href)

const freshStores = () => {
  setActivePinia(createPinia())
  return {
    playerStore: playerStoreModule.usePlayerStore(),
    inventoryStore: inventoryStoreModule.useInventoryStore(),
    skillStore: skillStoreModule.useSkillStore(),
    miningStore: miningStoreModule.useMiningStore(),
    regionMapStore: regionStoreModule.useRegionMapStore()
  }
}

const withMockedRandom = (values, runner) => {
  const originalRandom = Math.random
  const queue = [...values]
  Math.random = () => (queue.length > 0 ? queue.shift() : 0.99)
  try {
    return runner()
  } finally {
    Math.random = originalRandom
  }
}

const fixedRng = values => {
  const queue = [...values]
  return () => (queue.length > 0 ? queue.shift() : 0.99)
}

const makeMonster = overrides => ({
  id: 'qa_monster',
  name: 'QA 怪',
  hp: 100,
  attack: 1,
  defense: 0,
  expReward: 0,
  drops: [],
  description: 'QA fixture',
  ...overrides
})

const baseCombatRuntimeInput = overrides => ({
  weaponAttack: 20,
  weaponCritRate: 0,
  weaponType: 'sword',
  enchantSpecial: null,
  combatLevel: 20,
  allSkillsBuff: 0,
  ringAttackBonus: 0,
  ringCritBonus: 0,
  ringLuck: 0,
  ringDefenseBonus: 0,
  ringVampiric: 0,
  guildAttackBonus: 0,
  guildBadgeBonusAttack: 0,
  guildDefenseBonus: 0,
  cookingDefenseReduction: 0,
  cookingDefenseFlatBonus: 0,
  perk5: null,
  perk10: null,
  perk15: null,
  perk20: null,
  ...overrides
})

const fillAllInventoryCapacity = inventoryStore => {
  inventoryStore.capacity = 0
  inventoryStore.items = []
  inventoryStore.tempItems = Array.from({ length: 10 }, () => ({
    itemId: 'copper_ore',
    quantity: 999,
    quality: 'normal'
  }))
}

const clearInventoryCapacity = inventoryStore => {
  inventoryStore.capacity = 24
  inventoryStore.items = []
  inventoryStore.tempItems = []
}

{
  const baseChance = fishingStoreModule.getFishingTreasureChestChance({ fishingLevel: 0 })
  const luck25Chance = fishingStoreModule.getFishingTreasureChestChance({
    fishingLevel: 0,
    activeBuff: { type: 'luck', value: 25 }
  })
  const luck5Chance = fishingStoreModule.getFishingTreasureChestChance({
    fishingLevel: 0,
    activeBuff: { type: 'luck', value: 5 }
  })
  assert(Math.abs(fishingStoreModule.getFishingLuckBuffChance({ type: 'luck', value: 25 }) - 0.25) < 0.000001, '幸运料理 value=25 应解释为宝箱概率 +25%。')
  assert(Math.abs(fishingStoreModule.getFishingLuckBuffChance({ type: 'luck', value: 5 }) - 0.05) < 0.000001, '幸运料理 value=5 应解释为宝箱概率 +5%。')
  assert(Math.abs(luck25Chance - baseChance - 0.25) < 0.000001, '钓鱼宝箱应按实际 luck Buff 值增加概率。')
  assert(Math.abs(luck5Chance - baseChance - 0.05) < 0.000001, '钓鱼宝箱低值 luck Buff 不应被固定放大到 5% 以外。')
  const luckRecipes = recipesModule.RECIPES.filter(recipe => recipe.effect.buff?.type === 'luck')
  for (const recipe of luckRecipes) {
    assert(recipe.effect.buff.description.includes(`${recipe.effect.buff.value}%`), `幸运料理 ${recipe.id} 文案应按百分比描述实际 Buff 值。`)
  }
}

{
  const baseOutcome = journeyBuildModule.createEmptyJourneyOutcomeModifiers()
  baseOutcome.bossPressureResist = 0.18
  const noGuildOutcome = journeyBuildModule.applyJourneyGuildOutcomePatch(baseOutcome, {
    guildAttackBonus: 0,
    guildBadgeBonusAttack: 0,
    guildBonusDefense: 0
  })
  assert(Math.abs(noGuildOutcome.bossPressureResist - 0.18) < 0.000001, '无公会加成时首领抗压不得重复叠加已有值。')
  const guildOutcome = journeyBuildModule.applyJourneyGuildOutcomePatch(baseOutcome, {
    guildAttackBonus: 12,
    guildBadgeBonusAttack: 22,
    guildBonusDefense: 0.5
  })
  const expectedGuildBossResist = 0.18 + 12 / 120 + 22 / 220 + 0.5 * 0.16
  assert(Math.abs(guildOutcome.bossPressureResist - expectedGuildBossResist) < 0.000001, '首领抗压应只增加公会、徽章和防御贡献。')
}

{
  const skillViewSource = fs.readFileSync(path.join(srcRoot, 'views/game/SkillView.vue'), 'utf8')
  const perkDialogSource = fs.readFileSync(path.join(srcRoot, 'components/game/PerkSelectDialog.vue'), 'utf8')
  const combatPerkUiSource = `${skillViewSource}\n${perkDialogSource}`
  for (const forbiddenText of ['闪避并反击', '闪避后必定暴击', '致命伤时保留', '反弹全部伤害', '闪避时造成三倍伤害', '反弹10%伤害']) {
    assert(!combatPerkUiSource.includes(forbiddenText), `战斗专精 UI 不应继续承诺未实现效果：${forbiddenText}`)
  }
}

{
  const { skillStore } = freshStores()
  const combatSkill = skillStore.getSkill('combat')
  combatSkill.level = 20
  assert(skillStore.setPerk5('combat', 'harvester') === false, '战斗技能不得写入农耕 Lv5 专精。')
  assert(skillStore.setPerk10('combat', 'brute') === false, '缺少 Lv5 分支时不得写入 Lv10 专精。')
  assert(skillStore.setPerk5('combat', 'defender') === true, '合法战斗 Lv5 专精应能写入。')
  assert(skillStore.setPerk10('combat', 'brute') === false, '战斗 Lv10 专精不得跨 Lv5 分支写入。')
  assert(skillStore.setPerk10('combat', 'acrobat') === true, '合法战斗 Lv10 分支应能写入。')
  assert(skillStore.setPerk15('combat', 'sword_saint') === false, '战斗 Lv15 专精不得跨 Lv10 分支写入。')
  assert(skillStore.setPerk15('combat', 'phantom_blade') === true, '合法战斗 Lv15 分支应能写入。')
  assert(skillStore.setPerk20('combat', 'war_god') === false, '战斗 Lv20 专精不得跨 Lv15 分支写入。')
  assert(skillStore.setPerk20('combat', 'shadow_sovereign') === true, '合法战斗 Lv20 分支应能写入。')
}

{
  const { skillStore } = freshStores()
  skillStore.deserialize({
    skills: [
      {
        type: 'combat',
        exp: 0,
        level: 20,
        perk5: 'defender',
        perk10: 'brute',
        perk15: 'sword_saint',
        perk20: 'war_god'
      }
    ]
  })
  const combatSkill = skillStore.getSkill('combat')
  assert(combatSkill.perk5 === 'defender', '读档应保留合法战斗 Lv5 专精。')
  assert(combatSkill.perk10 === null, '读档应清理跨分支战斗 Lv10 专精。')
  assert(combatSkill.perk15 === null, '读档应清理失去上游分支的战斗 Lv15 专精。')
  assert(combatSkill.perk20 === null, '读档应清理失去上游分支的战斗 Lv20 专精。')
}

{
  const acrobatRuntime = combatRuntime.buildPlayerCombatRuntime(baseCombatRuntimeInput({ perk10: 'acrobat' }))
  const phantomRuntime = combatRuntime.buildPlayerCombatRuntime(baseCombatRuntimeInput({ perk15: 'phantom_blade' }))
  const shadowRuntime = combatRuntime.buildPlayerCombatRuntime(baseCombatRuntimeInput({ perk20: 'shadow_sovereign' }))
  const ironRuntime = combatRuntime.buildPlayerCombatRuntime(baseCombatRuntimeInput({ perk15: 'iron_fortress' }))
  const indestructibleRuntime = combatRuntime.buildPlayerCombatRuntime(baseCombatRuntimeInput({ perk20: 'indestructible' }))
  assert(acrobatRuntime.defense.dodgeRate === 0.25, '杂技师运行时闪避率应为 25%。')
  assert(phantomRuntime.defense.dodgeRate === 0.4, '幻影剑客运行时闪避率应为 40%。')
  assert(shadowRuntime.defense.dodgeRate === 0.8, '暗影霸主运行时闪避率应为 80%。')
  assert(Math.abs((ironRuntime.defendDefense.damageMultipliers?.[0] ?? 1) - 0.15) < 0.000001, '铁壁运行时防御承伤应为 15%。')
  assert(ironRuntime.defendHealFlat === 15, '铁壁运行时防御后应恢复 15HP。')
  assert(Math.abs((indestructibleRuntime.defendDefense.damageMultipliers?.[0] ?? 1) - 0.05) < 0.000001, '不灭之躯运行时防御承伤应为 5%。')
  assert(indestructibleRuntime.defendHealRatio === 0.15, '不灭之躯运行时防御后应恢复 15% 最大生命。')
}

{
  const { playerStore, skillStore, miningStore } = freshStores()
  const combatSkill = skillStore.getSkill('combat')
  combatSkill.level = 20
  assert(skillStore.setPerk5('combat', 'defender') === true, '不灭之躯测试需要合法 Lv5 分支。')
  assert(skillStore.setPerk10('combat', 'tank') === true, '不灭之躯测试需要合法 Lv10 分支。')
  assert(skillStore.setPerk15('combat', 'iron_fortress') === true, '不灭之躯测试需要合法 Lv15 分支。')
  assert(skillStore.setPerk20('combat', 'indestructible') === true, '不灭之躯测试需要合法 Lv20 分支。')
  playerStore.hp = 1
  miningStore.inCombat = true
  miningStore.isExploring = true
  miningStore.combatMonster = makeMonster({ attack: 9999 })
  miningStore.combatMonsterHp = 100
  miningStore.combatIsBoss = false

  const result = miningStore.combatAction('defend')
  assert(result.combatOver === true && result.won === false, '不灭之躯不再承诺致命保命，防御致死仍应失败。')
}

{
  const outcome = combatRuntime.rollAttackOutcome(
    { attack: 100, critRate: 0, extraStrikeChance: 1, extraStrikeMultiplier: 0.5 },
    0,
    fixedRng([0.99, 0, 0.99])
  )
  assert(outcome.damage === 100, '固定 RNG 主段伤害应为 100。')
  assert(outcome.extraDamage === 50, '固定 RNG 追击伤害应为 50。')
  assert(outcome.totalDamage === 150, '结构化总伤害应包含追击段。')
  const effective = combatRuntime.getEffectiveDamage(1, outcome.totalDamage)
  assert(effective === 1, '有效伤害必须按目标受击前 HP 截断。')
  assert(combatRuntime.getLifestealHeal(effective, 0.1) === 0, '吸血回血不得按 150 点溢出总伤害结算。')
}

{
  const { playerStore, skillStore, miningStore } = freshStores()
  playerStore.hp = 1
  playerStore.money = 0
  const combatSkill = skillStore.getSkill('combat')
  combatSkill.level = 5
  combatSkill.perk5 = 'defender'
  miningStore.inCombat = true
  miningStore.isExploring = true
  miningStore.combatMonster = makeMonster({ attack: 999 })
  miningStore.combatMonsterHp = 100
  miningStore.combatIsBoss = false

  const result = miningStore.combatAction('defend')
  assert(result.combatOver === true && result.won === false, '防御致死应立即结束战斗并失败。')
  assert(miningStore.inCombat === false, '防御致死后不得保留在战斗中。')
  assert(!miningStore.combatLog.some(line => line.includes('防守回气')), '防御致死后不得先执行防守回血日志。')
}

{
  const { playerStore, inventoryStore, miningStore } = freshStores()
  playerStore.hp = 40
  inventoryStore.ownedWeapons = [{ defId: 'mud_king_fang', enchantmentId: 'vampiric' }]
  inventoryStore.equippedWeaponIndex = 0
  miningStore.inCombat = true
  miningStore.isExploring = true
  miningStore.combatMonster = makeMonster({ hp: 1, attack: 0 })
  miningStore.combatMonsterHp = 1

  const result = withMockedRandom([0.99, 0.99, 0.99], () => miningStore.combatAction('attack'))
  assert(result.combatOver === true && result.won === true, '残血怪受击后应被击败。')
  assert(result.effectiveDamage === 1, '吸血有效伤害应为怪物受击前剩余 HP。')
  assert(playerStore.hp === 40, '吸血不应按溢出总伤害恢复 HP。')
}

{
  const { playerStore, inventoryStore, miningStore } = freshStores()
  playerStore.hp = 100
  inventoryStore.ownedWeapons = [{ defId: 'bone_dagger', enchantmentId: null }]
  inventoryStore.equippedWeaponIndex = 0
  miningStore.inCombat = true
  miningStore.isExploring = true
  miningStore.combatMonster = makeMonster({ hp: 100, attack: 1 })
  miningStore.combatMonsterHp = 100

  const hpBefore = miningStore.combatMonsterHp
  const result = withMockedRandom([0.99, 0, 0.99, 0.99], () => miningStore.combatAction('attack'))
  assert(result.extraDamage > 0, '固定 RNG 应触发匕首追击。')
  assert(result.dealtDamage === result.mainDamage + result.extraDamage, '结构化浮字伤害应等于主段加追击段。')
  assert(hpBefore - miningStore.combatMonsterHp === result.totalDamage, '怪物 HP 扣减应与结构化总伤害一致。')
}

{
  const { playerStore, regionMapStore } = freshStores()
  const route = regionsModule.REGION_ROUTE_DEFS[0]
  const saveData = regionsModule.createDefaultRegionMapSaveData()
  saveData.unlockStates[route.regionId] = {
    unlocked: true,
    unlockedAtDayTag: 'qa-day',
    unlockSource: 'qa'
  }
  saveData.activeSession = {
    sessionId: 'qa-session',
    mode: 'route',
    regionId: route.regionId,
    routeId: route.id,
    bossId: null,
    targetName: route.name,
    startedAtDayTag: 'qa-day',
    approach: 'balanced',
    retreatRule: 'balanced',
    status: 'ongoing',
    progressStep: 1,
    totalSteps: 3,
    carryLoad: 0,
    maxCarryLoad: 6,
    carryItems: [],
    visibility: 50,
    morale: 50,
    danger: 20,
    findings: 0,
    frontlinePrep: 0,
    riskState: { weather: 'clear', pollution: 0, alertness: 0, anomaly: 0 },
    campUsed: false,
    supplies: regionsModule.createDefaultRegionExpeditionSupplyState(),
    pendingRewardFamilyId: null,
    pendingRewardAmount: 0,
    pendingRewardItems: [],
    pendingEncounter: {
      id: 'qa-hazard',
      step: 1,
      kind: 'hazard',
      title: 'QA 险段',
      summary: '固定致死 hazard。',
      detailLines: [],
      risk: 'high',
      sourceEventId: null,
      rewardFamilyId: null,
      rewardAmount: 9,
      rewardItems: [{ itemId: 'wood', quantity: 1 }],
      options: [
        { id: 'cautious', label: '谨慎', summary: '轻伤', tone: 'accent' },
        { id: 'balanced', label: '均衡', summary: '中伤', tone: 'success' },
        { id: 'bold', label: '强攻', summary: '重伤', tone: 'danger' }
      ]
    },
    queuedEncounterKind: null,
    campState: null,
    encounteredEventIds: [],
    encounterMemory: [],
    nodeHistory: [],
    journal: [],
    recommendedRouteId: null
  }
  regionMapStore.deserialize(saveData)
  playerStore.hp = 1

  const result = regionMapStore.resolveActiveEncounter('bold', 'qa-day')
  assert(result.success === false && result.title === '远征失利', 'hazard 致死遭遇应返回失败态。')
  assert(regionMapStore.saveData.activeSession.status === 'failure', 'hazard 致死后 activeSession 必须进入 failure。')
  assert(regionMapStore.saveData.activeSession.pendingEncounter === null, 'hazard 致死后不应保留待处理遭遇。')
  assert(regionMapStore.saveData.activeSession.pendingRewardAmount === 0, 'hazard 致死后不得继续按成功遭遇累加奖励。')
}

{
  const { playerStore, inventoryStore, miningStore } = freshStores()
  fillAllInventoryCapacity(inventoryStore)
  playerStore.money = 0
  miningStore.isExploring = true
  miningStore.isInSkullCavern = false
  miningStore.currentFloor = 20
  miningStore.stairsFound = true
  miningStore.stairsUsable = true
  miningStore.totalMonstersOnFloor = 1
  miningStore.monstersDefeatedCount = 1

  const nextResult = miningStore.goNextFloor()
  assert(nextResult.success === false, '满包 Boss 奖励未领取时应阻止直接下层。')
  assert(/暂存/.test(nextResult.message), '满包 Boss 奖励应提示已暂存，而不是要求困在当前层。')
  assert(miningStore.pendingMineRewards.length === 1, '满包 Boss 奖励应写入待领取队列。')
  const pending = miningStore.pendingMineRewards[0]
  assert(pending.kind === 'main_mine_boss' && pending.floorNum === 20, 'Boss 待领取队列应记录楼层和来源。')
  assert(playerStore.money === 0, 'Boss 待领取奖励入队时不得先发铜钱。')
  assert(inventoryStore.getItemCount('copper_ore') === 0, 'Boss 待领取奖励入队时不得先发矿石。')

  const leaveMessage = miningStore.leaveMine()
  assert(/离开了矿洞/.test(leaveMessage), '满包 Boss 奖励暂存后应允许离开矿洞。')
  assert(miningStore.isExploring === false, '满包 Boss 奖励暂存后离开应结束探索状态。')
  assert(miningStore.safePointFloor >= 20, 'Boss 已击败且奖励暂存后应保留安全点进度。')

  clearInventoryCapacity(inventoryStore)
  const claimResult = miningStore.claimPendingMineRewards()
  assert(claimResult.success === true, '整理背包后应能领取 Boss 暂存奖励。')
  assert(miningStore.pendingMineRewards.length === 0, 'Boss 暂存奖励领取后应移除队列。')
  assert(playerStore.money === pending.money, 'Boss 暂存奖励铜钱只能在领取时发放一次。')
  for (const item of pending.itemRewards) {
    assert(inventoryStore.getItemCount(item.itemId) === item.quantity, `Boss 暂存奖励 ${item.itemId} 数量不正确。`)
  }
  const moneyAfterClaim = playerStore.money
  const itemCountsAfterClaim = new Map(pending.itemRewards.map(item => [item.itemId, inventoryStore.getItemCount(item.itemId)]))
  const replayResult = miningStore.claimPendingMineRewards()
  assert(replayResult.success === false, 'Boss 暂存奖励领取后重复领取应失败。')
  assert(playerStore.money === moneyAfterClaim, 'Boss 暂存奖励不得重复发铜钱。')
  for (const item of pending.itemRewards) {
    assert(inventoryStore.getItemCount(item.itemId) === itemCountsAfterClaim.get(item.itemId), `Boss 暂存奖励 ${item.itemId} 不得重复发放。`)
  }
}

{
  const { playerStore, inventoryStore, miningStore } = freshStores()
  const infestedFloor = Array.from({ length: 120 }, (_, index) => index + 1).find(floor => mineModule.getFloor(floor)?.specialType === 'infested')
  assert(Number.isFinite(infestedFloor), '测试需要至少一个感染层配置。')
  fillAllInventoryCapacity(inventoryStore)
  playerStore.money = 0
  miningStore.isExploring = true
  miningStore.isInSkullCavern = false
  miningStore.currentFloor = infestedFloor
  miningStore.stairsFound = true
  miningStore.stairsUsable = true
  miningStore.totalMonstersOnFloor = 1
  miningStore.monstersDefeatedCount = 1

  const nextResult = withMockedRandom([0], () => miningStore.goNextFloor())
  assert(nextResult.success === false, '满包感染层奖励未领取时应阻止直接下层。')
  assert(/暂存/.test(nextResult.message), '满包感染层奖励应提示已暂存。')
  assert(miningStore.pendingMineRewards.length === 1, '满包感染层奖励应写入待领取队列。')
  const pending = miningStore.pendingMineRewards[0]
  assert(pending.kind === 'infested_clear' && pending.floorNum === infestedFloor, '感染层待领取队列应记录楼层和来源。')
  assert(playerStore.money === 0, '感染层待领取奖励入队时不得先发铜钱。')

  const leaveMessage = miningStore.leaveMine()
  assert(/离开了矿洞/.test(leaveMessage), '满包感染层奖励暂存后应允许离开矿洞。')
  assert(miningStore.isExploring === false, '满包感染层奖励暂存后离开应结束探索状态。')

  clearInventoryCapacity(inventoryStore)
  const claimResult = miningStore.claimPendingMineRewards()
  assert(claimResult.success === true, '整理背包后应能领取感染层暂存奖励。')
  assert(miningStore.pendingMineRewards.length === 0, '感染层暂存奖励领取后应移除队列。')
  assert(playerStore.money === pending.money, '感染层暂存奖励铜钱必须使用入队快照。')
  for (const item of pending.itemRewards) {
    assert(inventoryStore.getItemCount(item.itemId) === item.quantity, `感染层暂存奖励 ${item.itemId} 数量不正确。`)
  }
}

if (errors.length > 0) {
  console.error('Combat flow guard failed:')
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log('Combat flow guard passed.')
