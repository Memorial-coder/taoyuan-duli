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

const readSource = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

const goalsSource = readSource('src/data/goals.ts')
const goalStoreSource = readSource('src/stores/useGoalStore.ts')
const economyTypesSource = readSource('src/types/economy.ts')
const topGoalsPanelSource = readSource('src/components/game/TopGoalsPanel.vue')
const walletViewSource = readSource('src/views/game/WalletView.vue')

const expectedTiers = [
  { label: '初闻其名', minReputation: 0, weeklyBudgetDiscountRate: 0, weeklyBudgetDiscountCap: 0 },
  { label: '村中有名', minReputation: 100, weeklyBudgetDiscountRate: 0.02, weeklyBudgetDiscountCap: 80 },
  { label: '乡里称许', minReputation: 300, weeklyBudgetDiscountRate: 0.04, weeklyBudgetDiscountCap: 160 },
  { label: '桃源名望', minReputation: 600, weeklyBudgetDiscountRate: 0.06, weeklyBudgetDiscountCap: 280 },
  { label: '远近传扬', minReputation: 1000, weeklyBudgetDiscountRate: 0.08, weeklyBudgetDiscountCap: 420 },
  { label: '世外盛名', minReputation: 1500, weeklyBudgetDiscountRate: 0.1, weeklyBudgetDiscountCap: 600 }
]

const resolveTier = reputation => {
  let current = expectedTiers[0]
  for (const tier of expectedTiers) {
    if (reputation >= tier.minReputation) current = tier
  }
  return current
}

const previewDiscount = (costMoney, reputation) => {
  const tier = resolveTier(reputation)
  const discountMoney = Math.min(
    Math.floor(costMoney * tier.weeklyBudgetDiscountRate),
    tier.weeklyBudgetDiscountCap,
    costMoney
  )
  return {
    tier,
    baseCostMoney: costMoney,
    paidCostMoney: costMoney - discountMoney,
    discountMoney
  }
}

assert(goalsSource.includes('export const GOAL_REPUTATION_TIER_DEFS'), '目标声望阶位必须集中定义在 data/goals.ts。')

for (const tier of expectedTiers) {
  assert(goalsSource.includes(`label: '${tier.label}'`), `缺少目标声望阶位“${tier.label}”。`)
  assert(goalsSource.includes(`minReputation: ${tier.minReputation}`), `阶位“${tier.label}”的阈值应为 ${tier.minReputation}。`)
  assert(
    goalsSource.includes(`weeklyBudgetDiscountRate: ${tier.weeklyBudgetDiscountRate}`),
    `阶位“${tier.label}”的周预算减免率应为 ${tier.weeklyBudgetDiscountRate}。`
  )
  assert(
    goalsSource.includes(`weeklyBudgetDiscountCap: ${tier.weeklyBudgetDiscountCap}`),
    `阶位“${tier.label}”的周预算减免上限应为 ${tier.weeklyBudgetDiscountCap}。`
  )
}

for (const [reputation, costMoney, expectedLabel, expectedDiscount] of [
  [0, 5200, '初闻其名', 0],
  [99, 5200, '初闻其名', 0],
  [100, 5200, '村中有名', 80],
  [300, 5200, '乡里称许', 160],
  [600, 5200, '桃源名望', 280],
  [1000, 5200, '远近传扬', 416],
  [1500, 5200, '世外盛名', 520],
  [1500, 900, '世外盛名', 90]
]) {
  const preview = previewDiscount(costMoney, reputation)
  assert(preview.tier.label === expectedLabel, `${reputation} 声望应处于“${expectedLabel}”。`)
  assert(preview.discountMoney === expectedDiscount, `${reputation} 声望、${costMoney} 文预算应减免 ${expectedDiscount} 文。`)
  assert(preview.paidCostMoney === costMoney - expectedDiscount, '声望减免后实付金额必须等于原价减免额。')
}

assert(goalStoreSource.includes('goalReputationStatus'), 'useGoalStore 必须导出目标声望状态，供目标面板展示阶位。')
assert(goalStoreSource.includes('getWeeklyBudgetReputationDiscount'), 'useGoalStore 必须提供周预算声望减免预览。')
assert(goalStoreSource.includes('playerStore.spendMoney(costPreview.paidCostMoney'), '周预算扣款必须使用声望减免后的实付金额。')
assert(goalStoreSource.includes('playerStore.recordSinkSpend(costPreview.paidCostMoney'), '经济 sink 统计必须记录实际支出，不记录原价。')
assert(goalStoreSource.includes('discountSourceTierId'), '周预算选择必须记录减免来源阶位，方便存档与回看。')
assert(economyTypesSource.includes('baseCostMoney?: number'), 'WeeklyBudgetSelection 必须保留原价字段。')
assert(economyTypesSource.includes('discountMoney?: number'), 'WeeklyBudgetSelection 必须保留减免金额字段。')
assert(topGoalsPanelSource.includes('goalReputationChipText'), '目标面板必须显示目标声望阶位与下阶距离。')
assert(walletViewSource.includes('目标声望「'), '钱包周预算入口必须显示目标声望减免说明。')
assert(walletViewSource.includes('formatWeeklyBudgetSelectionCost'), '已投入预算必须显示实付和原价。')

if (errors.length > 0) {
  console.error('[qa-goal-reputation-utility] failed')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('[qa-goal-reputation-utility] passed')
