/* global console, process */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const errors = []

const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const source = fs.readFileSync(path.join(projectRoot, 'src/stores/useInventoryStore.ts'), 'utf8')
const farmViewSource = fs.readFileSync(path.join(projectRoot, 'src/views/game/FarmView.vue'), 'utf8')
const farmStoreSource = fs.readFileSync(path.join(projectRoot, 'src/stores/useFarmStore.ts'), 'utf8')
const endDaySource = fs.readFileSync(path.join(projectRoot, 'src/composables/useEndDay.ts'), 'utf8')
const toolUpgradeViewSource = fs.readFileSync(path.join(projectRoot, 'src/views/game/ToolUpgradeView.vue'), 'utf8')

const getSourceBetween = (body, startMarker, endMarker) => {
  const start = body.indexOf(startMarker)
  const end = body.indexOf(endMarker, start + startMarker.length)
  assert(start >= 0, `源码缺少片段：${startMarker}`)
  assert(end > start, `源码缺少片段结束标记：${endMarker}`)
  return start >= 0 && end > start ? body.slice(start, end) : ''
}

assert(source.includes("const TOOL_TIER_ORDER: ToolTier[] = ['basic', 'iron', 'steel', 'iridium']"), '工具 tier 顺序必须集中定义。')
assert(source.includes('const getNextToolTier = (tier: ToolTier): ToolTier | null =>'), '必须提供按当前工具等级计算下一阶的 helper。')
assert(source.includes('const normalizePendingToolUpgrade = (value: unknown) =>'), '读档必须归一化 pendingUpgrade。')
assert(source.includes('pendingUpgrade.value = normalizePendingToolUpgrade((data as any).pendingUpgrade)'), 'deserialize() 必须通过 normalizePendingToolUpgrade() 接收 pendingUpgrade。')
assert(source.includes('if (!nextTier || targetTier !== nextTier) return false'), 'startUpgrade() 必须拒绝与当前工具等级不匹配的 targetTier。')
assert(source.includes('const completedTier = tool ? getNextToolTier(tool.tier) : null'), 'dailyUpgradeUpdate() 必须按完成前的当前工具等级计算真实完成 tier。')
assert(source.includes('return { completed: true, toolType, targetTier: completedTier }'), 'dailyUpgradeUpdate() 返回的 targetTier 必须是实际完成等级。')
assert(toolUpgradeViewSource.includes('const RUSH_UPGRADE_MONEY_MULTIPLIER = 2'), '水壶加急必须使用 2 倍铜钱倍率。')
assert(toolUpgradeViewSource.includes("if (type !== 'wateringCan') return false"), '加急升级必须限制为水壶。')
assert(toolUpgradeViewSource.includes('const handleRushUpgradeAndClose = (type: ToolType) => {'), '工具升级页必须提供水壶加急处理入口。')

const rushUpgradeSource = getSourceBetween(
  toolUpgradeViewSource,
  'const handleRushUpgradeAndClose = (type: ToolType) => {',
  '</script>'
)
assert(rushUpgradeSource.includes('playerStore.spendMoney(rushMoney)'), '水壶加急必须扣除加急铜钱。')
assert(rushUpgradeSource.includes('inventoryStore.upgradeTool(type)'), '水壶加急必须立即完成工具升阶。')
assert(!rushUpgradeSource.includes('inventoryStore.startUpgrade'), '水壶加急不得进入 pendingUpgrade 等待队列。')

const tierOrder = ['basic', 'iron', 'steel', 'iridium']
const toolTypes = ['wateringCan', 'hoe', 'pickaxe', 'fishingRod', 'scythe', 'axe', 'pan']

const getNextTier = tier => {
  const index = tierOrder.indexOf(tier)
  if (index < 0 || index >= tierOrder.length - 1) return null
  return tierOrder[index + 1]
}

const normalizePending = (tools, pending) => {
  if (!pending || typeof pending !== 'object') return null
  if (!toolTypes.includes(pending.toolType)) return null
  const tool = tools.find(entry => entry.type === pending.toolType)
  const nextTier = tool ? getNextTier(tool.tier) : null
  if (!nextTier) return null
  const daysRemaining = Math.max(1, Math.min(2, Math.ceil(Number(pending.daysRemaining) || 1)))
  return { toolType: pending.toolType, targetTier: nextTier, daysRemaining }
}

const mismatchedPending = normalizePending(
  [{ type: 'pickaxe', tier: 'steel' }],
  { toolType: 'pickaxe', targetTier: 'iron', daysRemaining: 0 }
)
assert(mismatchedPending?.targetTier === 'iridium', '异常档：steel 镐的 pendingUpgrade.targetTier 必须修正为 iridium。')
assert(mismatchedPending?.daysRemaining === 1, '异常档：pendingUpgrade.daysRemaining 必须归一化到 1-2 天。')

const maxTierPending = normalizePending(
  [{ type: 'axe', tier: 'iridium' }],
  { toolType: 'axe', targetTier: 'steel', daysRemaining: 1 }
)
assert(maxTierPending === null, '异常档：已满级工具的 pendingUpgrade 必须清空。')

const invalidToolPending = normalizePending(
  [{ type: 'pickaxe', tier: 'steel' }],
  { toolType: 'hammer', targetTier: 'iridium', daysRemaining: 1 }
)
assert(invalidToolPending === null, '异常档：非法工具类型的 pendingUpgrade 必须清空。')

const simulateDailyUpdate = (tool, pending) => {
  const nextPending = { ...pending, daysRemaining: pending.daysRemaining - 1 }
  if (nextPending.daysRemaining > 0) return { completed: false, tool, pending: nextPending }
  const completedTier = getNextTier(tool.tier)
  if (!completedTier) return { completed: false, tool, pending: null }
  return {
    completed: true,
    tool: { ...tool, tier: completedTier },
    pending: null,
    result: { completed: true, toolType: pending.toolType, targetTier: completedTier }
  }
}

const dailyResult = simulateDailyUpdate(
  { type: 'pickaxe', tier: 'steel' },
  { toolType: 'pickaxe', targetTier: 'iron', daysRemaining: 1 }
)
assert(dailyResult.completed, '日结模型：剩余 1 天的 pendingUpgrade 应完成。')
assert(dailyResult.tool.tier === 'iridium', '日结模型：实际工具等级必须升到下一阶。')
assert(dailyResult.result?.targetTier === 'iridium', '日结模型：返回日志 tier 必须等于实际完成 tier，而不是异常存档 targetTier。')

const rushMoney = baseMoney => baseMoney * 2
assert(rushMoney(1200) === 2400, '水壶初始加急必须收取 2400 文。')
assert(rushMoney(5000) === 10000, '水壶精钢前加急必须收取 10000 文。')

const simulateRushUpgrade = (tool, pending = null) => {
  if (pending) return { completed: false, tool, pending }
  const nextTier = getNextTier(tool.tier)
  if (!nextTier) return { completed: false, tool, pending: null }
  return { completed: true, tool: { ...tool, tier: nextTier }, pending: null }
}

const rushResult = simulateRushUpgrade({ type: 'wateringCan', tier: 'basic' })
assert(rushResult.completed, '水壶加急模型：应立即完成。')
assert(rushResult.tool.tier === 'iron', '水壶加急模型：实际工具等级必须升到下一阶。')
assert(rushResult.pending === null, '水壶加急模型：不应留下 pendingUpgrade。')

const greenhouseHarvestSource = getSourceBetween(farmViewSource, 'const doGhHarvest = () => {', '  const doGhBatchHarvest = () => {')
const greenhouseBatchHarvestSource = getSourceBetween(farmViewSource, 'const doGhBatchHarvest = () => {', '  const doGhBatchPlant = (cropId: string) => {')
for (const [label, block] of [
  ['温室单块收获', greenhouseHarvestSource],
  ['温室一键收获', greenhouseBatchHarvestSource]
]) {
  assert(block.includes("isToolAvailable('scythe')"), `${label}必须在镰刀升级中阻止成熟作物收获。`)
  assert(!block.includes('consumeStamina(') && !block.includes('restoreStamina('), `${label}应与普通地块手动收获一致，不消耗体力。`)
}
assert(
  farmViewSource.includes(':disabled="ghHarvestableCount === 0 || !inventoryStore.isToolAvailable(\'scythe\')"'),
  'greenhouse batch harvest button should be disabled while scythe upgrades.'
)
assert(
  greenhouseBatchHarvestSource.includes('ACTION_TIME_COSTS.batchHarvest') &&
    /Math\.ceil\(harvested\s*\/\s*6\)/.test(greenhouseBatchHarvestSource),
  'greenhouse batch harvest should use the same 6-crop batch timing model as outdoor batch harvest.'
)
assert(
  !/ACTION_TIME_COSTS\.harvest\s*\*\s*harvested/.test(greenhouseBatchHarvestSource),
  'greenhouse batch harvest should not charge per harvested crop.'
)
assert(
  farmStoreSource.includes('const greenhouseDailyUpdate = (extraGrowthProgress: number = 0): void =>') &&
    farmStoreSource.includes('const currentCropGrowth = getCurrentCropGrowthBonus()') &&
    farmStoreSource.includes('plot.growthDays += 1 + progressBonus'),
  'greenhouse crop daily growth should share global crop speedup and accept extra ring growth progress.'
)
assert(
  endDaySource.includes('farmStore.greenhouseDailyUpdate(ringGrowthBonus)'),
  'end-day flow should pass crop growth ring progress into greenhouse daily growth.'
)
assert(
  farmViewSource.includes('const currentCropGrowthBonus = computed(() =>') &&
    farmViewSource.includes('hiddenNpcStore.getAbilityValue') &&
    farmViewSource.includes('walletStore.getCropGrowthBonus() + spiritGrowth'),
  'farm growth displays should use the same wallet and spirit crop growth speedup as store growth logic.'
)

if (errors.length > 0) {
  console.error('工具升级守卫失败：')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('工具升级守卫通过：pendingUpgrade 会按当前工具等级归一化，并按实际完成 tier 记录日结。')
