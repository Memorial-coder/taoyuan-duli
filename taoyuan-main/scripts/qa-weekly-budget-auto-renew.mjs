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

const economyTypesSource = readSource('src/types/economy.ts')
const goalStoreSource = readSource('src/stores/useGoalStore.ts')
const walletViewSource = readSource('src/views/game/WalletView.vue')
const endDaySource = readSource('src/composables/useEndDay.ts')

const selectionTypeBlock = economyTypesSource.match(/export interface WeeklyBudgetSelection \{[\s\S]*?\n\}/)?.[0] ?? ''

assert(
  selectionTypeBlock.includes('autoRenew?: boolean'),
  'WeeklyBudgetSelection should persist the per-channel auto-renew toggle.'
)

assert(
  goalStoreSource.includes('const createWeeklyBudgetSelection = ('),
  'Weekly budget selection creation should be shared by manual activation and auto-renew.'
)

assert(
  goalStoreSource.includes('autoRenew: raw.autoRenew === true'),
  'Weekly budget normalization should preserve only explicit auto-renew opt-ins.'
)

assert(
  goalStoreSource.includes('const setWeeklyBudgetAutoRenew = (channelId: WeeklyBudgetChannelId, autoRenew: boolean)'),
  'Goal store should expose a weekly budget auto-renew toggle action.'
)

assert(
  goalStoreSource.includes('const autoRenewSelections = activeSelections.filter(selection => selection.autoRenew === true)'),
  'Weekly budget reset should carry forward only selections with auto-renew enabled.'
)

assert(
  goalStoreSource.includes("if (!playerStore.spendMoney(costPreview.paidCostMoney, 'goal'))"),
  'Weekly budget auto-renew should charge the new weekly paid cost and fail if money is insufficient.'
)

assert(
  goalStoreSource.includes("tags: ['weekly_budget_auto_renewed', 'late_game_cycle']"),
  'Successful weekly budget auto-renew should write a cycle log tag.'
)

assert(
  goalStoreSource.includes("tags: ['weekly_budget_auto_renew_failed', 'late_game_cycle']"),
  'Failed weekly budget auto-renew should write a cycle log tag.'
)

assert(
  walletViewSource.includes('type="checkbox"') &&
    walletViewSource.includes('自动续投') &&
    walletViewSource.includes('handleSetWeeklyBudgetAutoRenew'),
  'Wallet weekly budget cards should expose an auto-renew checkbox.'
)

assert(
  endDaySource.includes('已自动续投：') &&
    endDaySource.includes('failedRenewSummary') &&
    endDaySource.includes('部分周预算已自动续投'),
  'End-day weekly budget reset copy should distinguish renewed, manual, and failed slots.'
)

if (errors.length > 0) {
  console.error('[qa-weekly-budget-auto-renew] failed')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('[qa-weekly-budget-auto-renew] passed')
