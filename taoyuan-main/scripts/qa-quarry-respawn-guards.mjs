/* global console, process */
import fs from 'node:fs'
import path from 'node:path'
import { registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const srcRoot = path.join(projectRoot, 'src')

const resolveSourceFile = candidate => {
  const candidates = [candidate, `${candidate}.ts`, `${candidate}.tsx`, `${candidate}.js`, `${candidate}.mjs`]
  for (const filePath of candidates) {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) return pathToFileURL(filePath).href
  }
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    for (const indexName of ['index.ts', 'index.tsx', 'index.js', 'index.mjs']) {
      const indexPath = path.join(candidate, indexName)
      if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) return pathToFileURL(indexPath).href
    }
  }
  return null
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const resolved = resolveSourceFile(path.join(srcRoot, specifier.slice(2)))
      if (resolved) return { url: resolved, shortCircuit: true }
    }
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      const parentPath = fileURLToPath(context.parentURL)
      const resolved = resolveSourceFile(path.resolve(path.dirname(parentPath), specifier))
      if (resolved) return { url: resolved, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
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
const readSource = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')
const countActiveSites = cells => cells.filter(cell => cell.isActiveSite).length
const visibleResourceStates = new Set(['rock', 'ore', 'gem', 'wood', 'deep', 'treasure', 'artifact', 'monster'])
const countVisibleResources = cells => cells.filter(cell => visibleResourceStates.has(cell.state)).length

const quarrySource = readSource('src/data/quarry.ts')
const quarryStoreSource = readSource('src/stores/useQuarryStore.ts')
const quarryViewSource = readSource('src/views/game/QuarryView.vue')
const miningViewSource = readSource('src/views/game/MiningView.vue')
const villageProjectStoreSource = readSource('src/stores/useVillageProjectStore.ts')
const saveStoreSource = readSource('src/stores/useSaveStore.ts')
const endDaySource = readSource('src/composables/useEndDay.ts')
const routerSource = readSource('src/router/index.ts')
const navigationSource = readSource('src/composables/useNavigation.ts')
const timeSource = readSource('src/data/timeConstants.ts')
const mobileMapSource = readSource('src/components/game/MobileMapMenu.vue')
const inventorySource = readSource('src/stores/useInventoryStore.ts')
const trinketSource = readSource('src/data/trinkets.ts')
const packageJson = JSON.parse(readSource('package.json'))

const {
  QUARRY_PROJECT_ID,
  QUARRY_REQUIRED_PROJECT_ID,
  QUARRY_GRID_SIZE,
  QUARRY_TOTAL_CELLS,
  QUARRY_MIN_GRID_SIZE,
  QUARRY_MAX_GRID_SIZE,
  QUARRY_INITIAL_RESOURCE_COUNT,
  QUARRY_DAILY_SPAWN_CHANCE,
  QUARRY_DAILY_BASE_CAP,
  QUARRY_DAILY_MAX_CAP,
  QUARRY_DAILY_AREA_EXPONENT,
  QUARRY_ARTIFACT_SPAWN_CHANCE,
  QUARRY_ARTIFACT_POOL,
  QUARRY_TREASURE_POOL,
  QUARRY_RARE_TRANSMUTE_UPGRADES,
  QUARRY_RESOURCE_CATEGORY_WEIGHTS,
  QUARRY_RESOURCE_POOLS,
  QUARRY_WEEKLY_STEWARDSHIP_TARGET,
  QUARRY_WEEKLY_STEWARDSHIP_MAX_CLAIMS,
  QUARRY_MONSTERS,
  QUARRY_MINE_FINAL_TRINKET_ID,
  QUARRY_MINE_FINAL_UNLOCK_ID,
  QUARRY_MINE_REFRESH_DAYS,
  QUARRY_MINE_REPEAT_FINAL_REWARDS,
  QUARRY_EXPANSION_STAGES,
  createDefaultQuarrySaveData,
  createDefaultQuarryMineSaveData,
  createRefreshedQuarryMineNodes,
  createQuarryVisibleCell,
  getQuarryDailySpawnCap,
  normalizeQuarrySaveData,
  seedInitialQuarryCells,
  spawnQuarryDailyResources
} = await import(pathToFileURL(path.join(srcRoot, 'data/quarry.ts')).href)
const { getItemById } = await import(pathToFileURL(path.join(srcRoot, 'data/items.ts')).href)
const { VILLAGE_PROJECT_DEFS } = await import(pathToFileURL(path.join(srcRoot, 'data/villageProjects.ts')).href)

const project = VILLAGE_PROJECT_DEFS.find(entry => entry.id === QUARRY_PROJECT_ID)

assert(QUARRY_PROJECT_ID === 'quarry_reopening', '采石场工程 ID 必须保持 quarry_reopening。')
assert(QUARRY_REQUIRED_PROJECT_ID === 'support_shed', '采石场工程必须以前置 support_shed 为基础。')
assert(project?.fundingPhase === 'endgame', '旧采石场复开必须属于 endgame 阶段。')
assert(project?.moneyCost === 80000, '旧采石场复开费用必须是 80000 文。')

const materialMap = new Map(project?.materials.map(item => [item.itemId, item.quantity]) ?? [])
for (const [itemId, quantity] of Object.entries({
  stone: 500,
  wood: 200,
  iron_ore: 100,
  gold_ore: 60,
  iridium_ore: 20,
  void_ore: 10
})) {
  assert(materialMap.get(itemId) === quantity, `旧采石场复开材料必须包含 ${itemId}×${quantity}。`)
}

const requirementTypes = new Set(project?.requirements?.map(requirement => requirement.type) ?? [])
for (const type of ['mineFloor', 'skullCavernFloor', 'skillLevel', 'skillMasteryNodeCount', 'villageProjectLevel']) {
  assert(requirementTypes.has(type), `旧采石场复开必须包含门槛：${type}。`)
}

assert(QUARRY_GRID_SIZE === 8 && QUARRY_TOTAL_CELLS === 64, '采石场初始尺寸必须是 8x8。')
assert(QUARRY_MIN_GRID_SIZE === 8 && QUARRY_MAX_GRID_SIZE === 32, '采石场必须从 8x8 扩展到 32x32。')
assert(QUARRY_INITIAL_RESOURCE_COUNT === 9, '采石场解锁当天必须初始化 9 个可见资源点。')
assert(QUARRY_DAILY_SPAWN_CHANCE === 0.12, '采石场每天空格生成概率必须是 12%。')
assert(
  QUARRY_DAILY_BASE_CAP === 7 && QUARRY_DAILY_MAX_CAP === 64 && QUARRY_DAILY_AREA_EXPONENT === 1.5,
  '采石场每日生成上限必须从 7 起，按面积递增并封顶 64。'
)
assert(QUARRY_ARTIFACT_SPAWN_CHANCE === 0.02, '采石场古物点应保持低频惊喜产出。')
assert(
  QUARRY_WEEKLY_STEWARDSHIP_TARGET === 12 && QUARRY_WEEKLY_STEWARDSHIP_MAX_CLAIMS === 2,
  '采石场周管护必须每 12 格一次、每周最多 2 次。'
)
assert(
  JSON.stringify(QUARRY_RESOURCE_CATEGORY_WEIGHTS) === JSON.stringify({ rock: 52, ore: 28, gem: 10, wood: 8, deep: 2 }),
  '采石场资源大类权重必须为 52/28/10/8/2。'
)

const allQuarryItemIds = Object.values(QUARRY_RESOURCE_POOLS).flatMap(pool => pool.map(entry => entry.itemId))
assert(!allQuarryItemIds.includes('prismatic_shard'), '采石场资源池不得放入五彩碎片。')
for (const itemId of ['void_ore', 'iridium_ore', 'obsidian', 'dragon_jade']) {
  assert(QUARRY_RESOURCE_POOLS.deep.some(entry => entry.itemId === itemId), `深脉点必须包含 ${itemId}。`)
}
const quarryRewardItemIds = [
  ...Object.values(QUARRY_RESOURCE_POOLS).flatMap(pool => pool.map(entry => entry.itemId)),
  ...QUARRY_TREASURE_POOL.map(entry => entry.itemId),
  ...QUARRY_ARTIFACT_POOL.map(entry => entry.itemId),
  ...Object.values(QUARRY_RARE_TRANSMUTE_UPGRADES)
]
const missingQuarryRewardItemIds = [...new Set(quarryRewardItemIds)].filter(itemId => !getItemById(itemId))
assert(
  missingQuarryRewardItemIds.length === 0,
  `采石场奖励池不得引用未注册物品，否则会被误报为空间不足：${missingQuarryRewardItemIds.join(', ')}`
)

assert(Array.isArray(QUARRY_MONSTERS) && QUARRY_MONSTERS.length >= 3, '采石场必须定义至少 3 种怪物。')
assert(QUARRY_MINE_FINAL_TRINKET_ID === 'trinket_quarry_shard', '采石场矿洞终点奖励必须指向灵器碎片·山鸣。')
assert(QUARRY_MINE_FINAL_UNLOCK_ID === 'trinket_quarry_mine', '采石场矿洞终点必须写入独立解锁凭据。')
assert(QUARRY_MINE_REFRESH_DAYS === 3, '旧支道矿洞首通/本轮完成后必须 3 天刷新。')
assert(
  Array.isArray(QUARRY_MINE_REPEAT_FINAL_REWARDS) && QUARRY_MINE_REPEAT_FINAL_REWARDS.length >= 2,
  '旧支道重复刷新终点必须有普通补给奖励，不能重复发灵器。'
)
assert(
  Array.isArray(QUARRY_EXPANSION_STAGES) &&
    QUARRY_EXPANSION_STAGES[0]?.fromSize === 8 &&
    QUARRY_EXPANSION_STAGES[0]?.toSize === 9,
  '扩建必须从 8x8 到 9x9。'
)
assert(QUARRY_EXPANSION_STAGES.at(-1)?.toSize === 32, '扩建最后必须到 32x32。')
assert(
  QUARRY_EXPANSION_STAGES.every(
    stage => stage.moneyCost > 0 && stage.materialCosts.length > 0 && stage.requiredClearedCount >= 0
  ),
  '每个扩建阶段必须有金钱、材料和进度门槛。'
)

const defaultMine = createDefaultQuarryMineSaveData()
assert(defaultMine.unlocked === false && defaultMine.nodes.length >= 5, '默认采石场矿洞必须存在首通短路线。')
assert(defaultMine.nodes.at(-1)?.kind === 'final', '采石场矿洞短路线终点必须是 final 节点。')
assert(defaultMine.runId === 0 && defaultMine.lastCompletedDayTag === '', '默认采石场矿洞必须从首轮、未完成状态开始。')
const refreshedMineNodes = createRefreshedQuarryMineNodes(1)
assert(refreshedMineNodes.length === defaultMine.nodes.length, '旧支道刷新路线必须保持与 UI 路线节点数兼容。')
assert(refreshedMineNodes.at(-1)?.kind === 'final', '旧支道刷新路线终点仍必须是 final 节点。')
assert(!refreshedMineNodes.some(node => node.label.includes('灵器碎片')), '刷新路线不得再展示灵器碎片首通文案。')

const defaultSave = createDefaultQuarrySaveData()
assert(defaultSave.activeSize === 8 && defaultSave.cells.length === 64, '默认采石场必须是 8x8。')
assert(defaultSave.lifetimeClearedCount === 0 && defaultSave.deepClearCount === 0, '默认采石场扩建进度必须为 0。')
assert(
  defaultSave.cells.every(cell => cell.state === 'empty' && cell.kind === 'empty' && cell.isActiveSite === false),
  '默认采石场必须是可见空地，不得整盘未探明。'
)
assert(defaultSave.quarryMine.nodes.length === defaultMine.nodes.length, '采石场存档必须包含 quarryMine 小块。')

const normalizedOldSave = normalizeQuarrySaveData({})
assert(
  normalizedOldSave.activeSize === 8 &&
    normalizedOldSave.cells.length === 64 &&
    normalizedOldSave.cells.every(cell => cell.state === 'empty' && cell.kind === 'empty'),
  '旧档缺字段必须归一化为 8x8 可见空地。'
)

const expandedSave = normalizeQuarrySaveData({ activeSize: 32, cells: [] })
assert(expandedSave.cells.length === 1024, '32x32 采石场必须归一化为 1024 格。')
assert(expandedSave.cells.every(cell => cell.state === 'empty'), '扩建区域默认必须是可见空地。')

const migratedOldHiddenEmpty = normalizeQuarrySaveData({
  cells: [{ index: 0, state: 'hidden', kind: 'empty' }]
})
assert(
  migratedOldHiddenEmpty.cells[0]?.state === 'empty' &&
    migratedOldHiddenEmpty.cells[0]?.kind === 'empty' &&
    migratedOldHiddenEmpty.cells[0]?.isActiveSite === false,
  '旧版 hidden + empty 必须迁移成可见空地。'
)

const migratedOldHiddenResource = normalizeQuarrySaveData({
  cells: [
    {
      index: 0,
      state: 'hidden',
      kind: 'ore',
      resourceId: 'iron_vein',
      itemId: 'iron_ore',
      quantity: 2,
      isActiveSite: true
    }
  ]
})
assert(
  migratedOldHiddenResource.cells[0]?.state === 'ore' &&
    migratedOldHiddenResource.cells[0]?.kind === 'ore' &&
    migratedOldHiddenResource.cells[0]?.itemId === 'iron_ore',
  '旧版 hidden 真实载荷必须迁移成对应可见资源。'
)

const normalizedUnlockedMissingMine = normalizeQuarrySaveData({ unlockedAtDayTag: '1-spring-1' })
assert(normalizedUnlockedMissingMine.quarryMine.unlocked === true, '已解锁采石场的旧档必须自动开放 quarryMine 入口。')

const initialCells = seedInitialQuarryCells(() => 0)
assert(initialCells.filter(cell => cell.state === 'hidden').length === 0, '采石场解锁当天不得出现整盘 hidden。')
assert(countActiveSites(initialCells) === 9, '采石场解锁当天必须生成 9 个真实可见资源点。')
assert(countVisibleResources(initialCells) === 9, '采石场解锁当天 9 个真实点必须直接可见。')
assert(initialCells.filter(cell => cell.state === 'empty').length === 55, '采石场解锁当天其余格必须是可见空地。')

assert(
  getQuarryDailySpawnCap(1, 1, 8) === 7 &&
    getQuarryDailySpawnCap(1, 1, 16) === 20 &&
    getQuarryDailySpawnCap(1, 1, 24) === 36 &&
    getQuarryDailySpawnCap(1, 1, 32) === 56,
  '采石场每日上限必须按面积规模从 8x8 的 7 增长到 32x32 的 56。'
)
assert(getQuarryDailySpawnCap(2, 1, 8) === 9, '同尺寸采石场每日上限仍必须按年份增长。')
assert(getQuarryDailySpawnCap(1, 1, 8, { maintenanceActive: true }) === 9, '采石场维护生效必须每日上限 +2。')
assert(getQuarryDailySpawnCap(1, 1, 8, { skullCavernBestFloor: 150 }) === 9, '骷髅矿穴 150 层必须每日上限 +2。')
assert(getQuarryDailySpawnCap(1, 1, 8, { miningMasteryNodeCount: 2 }) === 8, '采矿精研节点数 >= 2 必须每日上限 +1。')
assert(getQuarryDailySpawnCap(9, 1, 32, { maintenanceActive: true, skullCavernBestFloor: 150, miningMasteryNodeCount: 2 }) === 64, '32x32 后期采石场每日上限必须受 64 封顶保护。')

const emptyDailyResult = spawnQuarryDailyResources(defaultSave.cells, 7, () => 0)
assert(
  emptyDailyResult.spawnedCount === 7 &&
    countVisibleResources(emptyDailyResult.cells) === 7 &&
    emptyDailyResult.cells.filter(cell => cell.state === 'hidden').length === 0,
  '每日刷新必须在可见空地里生成受上限限制的可见资源。'
)

const fullCells = defaultSave.cells.map((cell, index) => ({
  ...cell,
  index,
  state: 'rock',
  resourceId: 'stone_chunk',
  kind: 'rock',
  itemId: 'stone',
  quantity: 1,
  isActiveSite: true
}))
const fullDailyResult = spawnQuarryDailyResources(fullCells, 16, () => 0)
assert(fullDailyResult.spawnedCount === 0 && fullDailyResult.attemptedCount === 0, '满格采石场不得继续生成资源。')

const blockedCellResult = spawnQuarryDailyResources(
  [{ ...fullCells[0], state: 'rock' }, ...defaultSave.cells.slice(1)],
  64,
  () => 0
)
assert(blockedCellResult.cells[0]?.state === 'rock', '已有资源必须阻挡新刷，不得被日刷覆盖。')
assert(blockedCellResult.spawnedCount === 63, '日刷只能落在其余空格。')

const respawnOnEmpty = spawnQuarryDailyResources(
  [
    { index: 0, state: 'empty', kind: 'empty', revealed: true },
    ...fullCells.slice(1)
  ],
  1,
  () => 0
)
assert(
  visibleResourceStates.has(respawnOnEmpty.cells[0]?.state) && respawnOnEmpty.cells[0]?.isActiveSite === true,
  '已清空地重新长出资源后必须直接成为可见资源点。'
)

const visibleMonster = createQuarryVisibleCell(0, () => 0)
assert(visibleMonster.state === 'monster' && visibleMonster.kind === 'monster', '裂隙怪物点必须可见，而不是隐藏载荷。')

assert(quarrySource.includes('rng() >= QUARRY_DAILY_SPAWN_CHANCE'), '每日刷新必须按每个空格 12% 独立判定。')
assert(quarrySource.includes('createQuarryVisibleCell'), '每日刷新必须生成可见资源点。')
assert(!quarrySource.includes('QUARRY_EMPTY_SITE_CHANCE'), '开放资源场不应再保留空洞假点位概率。')
assert(!quarrySource.includes('createQuarryRubbleCell'), '开放资源场不应再用隐藏石层载荷创建器。')
assert(quarrySource.includes('QUARRY_TREASURE_POOL') && quarrySource.includes('QUARRY_ARTIFACT_POOL'), '采石场必须有宝箱和古物池。')
assert(quarrySource.includes('normalizeQuarryMineSaveData'), '采石场存档必须归一化 quarryMine。')
assert(quarrySource.includes('QUARRY_MINE_FINAL_TRINKET_ID'), '采石场矿洞终点奖励常量必须存在。')
assert(quarrySource.includes('createRefreshedQuarryMineNodes'), '采石场数据层必须提供旧支道刷新路线。')

assert(quarryStoreSource.includes('lastRefreshDayTag.value === dayTag'), '采石场每日刷新必须用 dayTag 幂等。')
assert(quarryStoreSource.includes('lastDailySpawnedCount'), '采石场 UI 必须能展示今日已生成数量。')
assert(
  quarryStoreSource.includes('exploreCell') &&
    quarryStoreSource.includes('clearRubble') &&
    quarryStoreSource.includes('collectCell') &&
    quarryStoreSource.includes('combatAction') &&
    quarryStoreSource.includes('expandQuarry'),
  '采石场 store 必须保留勘探兼容、深脉处理、直接收集、弹窗战斗和扩建。'
)
assert(
  quarryStoreSource.includes('enterQuarryMine') &&
    quarryStoreSource.includes('resolveQuarryMineNode') &&
    quarryStoreSource.includes('claimQuarryMineFinalReward') &&
    quarryStoreSource.includes('quarryMineStatus'),
  '采石场 store 必须暴露矿洞入口、节点处理、终点奖励和状态。'
)
assert(quarryStoreSource.includes('refreshQuarryMineIfReady'), '采石场 store 必须在每日流程中刷新旧支道矿洞。')
assert(
  quarryStoreSource.includes('resolveQuarryMineNode = (index: number, mode: QuarryMineExploreMode') ||
    quarryStoreSource.includes('resolveQuarryMineNode = (index: number, mode: QuarryMineExploreMode ='),
  '旧支道节点处理必须接收探索方式参数。'
)
assert(quarryStoreSource.includes('getQuarryMineModeStaminaCost'), '旧支道探索方式必须影响体力或处理代价。')
assert(quarryStoreSource.includes('lastCompletedDayTag') && quarryStoreSource.includes('daysUntilRefresh'), '旧支道状态必须暴露完成日期和刷新倒计时。')
assert(
  quarryStoreSource.includes('playerStore.markLifestyleUnlock(QUARRY_MINE_FINAL_UNLOCK_ID') &&
    quarrySource.includes("QUARRY_MINE_FINAL_UNLOCK_ID = 'trinket_quarry_mine'"),
  '采石场矿洞终点必须写入饰物解锁凭据。'
)
assert(
  !quarryStoreSource.includes("if (quarryMine.value.finalRewardClaimed) {\n      return { success: false, message: '采石场矿洞的终点奖励已经取走"),
  '旧支道入口不得因首通奖励已领取而永久关闭。'
)
assert(quarryStoreSource.includes('lastRunDayTag === getCurrentDayTag()'), '采石场矿洞必须限制同日重复进入。')
assert(
  quarryStoreSource.includes('buildPlayerCombatRuntime') && quarryStoreSource.includes('inCombat'),
  '采石场怪物必须接入矿洞式战斗运行时。'
)
assert(quarryStoreSource.includes('if (!cell.isActiveSite) return false'), '普通空地不得推进周清理或扩建累计清理。')
assert(
  quarryStoreSource.includes('QUARRY_NIGHT_MONSTER_ATK_MULT') && quarryStoreSource.includes("gameStore.timePeriod === 'night'"),
  '采石场必须有夜间怪物增强。'
)
assert(quarryStoreSource.includes('materialCosts'), '扩建必须消耗材料。')
assert(quarryStoreSource.includes('spendMoney'), '扩建必须消耗铜钱。')

assert(
  trinketSource.includes("'quarry_mine'") &&
    trinketSource.includes("id: 'trinket_quarry_shard'") &&
    trinketSource.includes("unlockRule: 'quarry_mine'"),
  '灵器碎片·山鸣必须可由采石场矿洞终点解锁。'
)
assert(
  inventorySource.includes("case 'quarry_mine'") &&
    inventorySource.includes("hasLifestyleDiscovery('lifestyleUnlocks', 'trinket_quarry_mine')"),
  '饰物解锁列表必须识别采石场矿洞凭据。'
)

assert(
  villageProjectStoreSource.includes("case 'mineFloor'") && villageProjectStoreSource.includes("case 'skullCavernFloor'"),
  '村建需求必须支持矿洞层数门槛。'
)
assert(villageProjectStoreSource.includes('useQuarryStore().unlockFromProject'), '村建完工必须主动初始化采石场。')
assert(
  saveStoreSource.includes('createDefaultQuarrySaveData') &&
    saveStoreSource.includes('quarry: quarryStore.serialize()') &&
    saveStoreSource.includes('quarryStore.deserialize(payload.quarry ?? {})'),
  '存档必须支持 quarry 块和旧档默认值。'
)
assert(endDaySource.includes('quarryStore.dailyUpdate(currentDayTag)'), '每日流程必须在日期推进后刷新采石场。')

assert(
  !miningViewSource.includes('data-testid="quarry-panel"') && !miningViewSource.includes('data-testid="quarry-grid"'),
  '矿洞页不应再展示采石场面板。'
)
assert(
  quarryViewSource.includes('data-testid="quarry-panel"') &&
    quarryViewSource.includes('data-testid="quarry-grid"') &&
    quarryViewSource.includes('data-testid="quarry-combat-dialog"') &&
    quarryViewSource.includes('data-testid="quarry-mine-panel"'),
  '采石场页必须展示独立面板、资源网格、战斗弹窗和矿洞入口。'
)
assert(
  quarryViewSource.includes('gridTemplateColumns') && quarryViewSource.includes('quarryStore.activeSize'),
  '采石场网格必须支持动态尺寸。'
)
assert(!quarryViewSource.includes("cell.state === 'hidden'"), '采石场 UI 不得继续渲染整盘 hidden 格。')
assert(!quarryViewSource.includes("cell.state === 'resource'"), '采石场 UI 不得继续依赖旧 resource 聚合状态。')
assert(!quarryViewSource.includes('未探明石层') && !quarryViewSource.includes('整盘盲探'), '采石场 UI 文案不得强调未探明/整盘盲探。')
assert(
  quarryViewSource.includes('isCollectableCell') &&
    quarryViewSource.includes('quarryStore.resourceCellCount') &&
    quarryViewSource.includes('quarryStore.rareCellCount') &&
    quarryViewSource.includes('quarryStore.emptyCellCount') &&
    quarryViewSource.includes('quarryStore.lastDailySpawnedCount'),
  '采石场 UI 必须按可见资源、稀有点、空地和今日生成显示统计。'
)
assert(
  quarryViewSource.includes('handleEnterQuarryMine') &&
    quarryViewSource.includes('handleQuarryMineNode') &&
    quarryViewSource.includes('quarryMineStatus'),
  '采石场 UI 必须接入采石场矿洞入口和节点处理。'
)
assert(
  quarryViewSource.includes('selectedQuarryMineMode') &&
    quarryViewSource.includes('quarryMineExploreModes') &&
    quarryViewSource.includes('resolveQuarryMineNode(index, selectedQuarryMineMode.value, usedElixirId)'),
  '采石场 UI 必须提供旧支道探索方式选择，并传给节点处理，且允许传入可选丹药准备物。'
)
assert(
  !quarryViewSource.includes('支道已封存') && !quarryViewSource.includes('这条旧支道不会再展开成可操作列表'),
  '采石场 UI 不得继续把旧支道描述为永久封存。'
)

assert(routerSource.includes("path: 'quarry'") && routerSource.includes('QuarryView.vue'), '路由必须注册独立采石场页面。')
assert(navigationSource.includes("'quarry'") && navigationSource.includes('Mountain'), '导航必须包含采石场入口。')
assert(timeSource.includes("quarry: 'mine'"), '采石场必须归入 mine 地点组。')
assert(mobileMapSource.includes("'quarry'") && mobileMapSource.includes("'采石场': 'quarry'"), '移动地图菜单必须包含采石场入口。')
assert(packageJson.scripts?.['qa:quarry-respawn-guards'] === 'node scripts/qa-quarry-respawn-guards.mjs', 'package.json 必须登记 qa:quarry-respawn-guards。')

if (errors.length > 0) {
  console.error(`qa-quarry-respawn-guards failed (${errors.length})`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-quarry-respawn-guards passed')
