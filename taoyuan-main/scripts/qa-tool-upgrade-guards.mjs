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

const greenhouseHarvestSource = getSourceBetween(farmViewSource, 'const doGhHarvest = () => {', '  const doGhBatchHarvest = () => {')
const greenhouseBatchHarvestSource = getSourceBetween(farmViewSource, 'const doGhBatchHarvest = () => {', '  const doGhBatchPlant = (cropId: string) => {')
for (const [label, block] of [
  ['温室单块收获', greenhouseHarvestSource],
  ['温室一键收获', greenhouseBatchHarvestSource]
]) {
  assert(!block.includes("isToolAvailable('scythe')"), `${label}不应因镰刀升级阻止成熟作物收获。`)
  assert(!block.includes('consumeStamina(') && !block.includes('restoreStamina('), `${label}应与普通地块手动收获一致，不消耗体力。`)
}

if (errors.length > 0) {
  console.error('工具升级守卫失败：')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('工具升级守卫通过：pendingUpgrade 会按当前工具等级归一化，并按实际完成 tier 记录日结。')
