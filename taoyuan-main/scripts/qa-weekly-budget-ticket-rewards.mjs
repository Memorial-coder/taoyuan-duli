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

const goalStoreSource = readSource('src/stores/useGoalStore.ts')
const weeklyBudgetsSource = readSource('src/data/weeklyBudgets.ts')

const mergeTicketRewards = (...ledgers) => {
  const result = {}
  for (const ledger of ledgers) {
    for (const [ticketType, amount] of Object.entries(ledger)) {
      result[ticketType] = (result[ticketType] ?? 0) + Math.max(0, Number(amount) || 0)
    }
  }
  return result
}

assert(
  JSON.stringify(mergeTicketRewards({ caravan: 3, exhibit: 3, research: 3 }, { caravan: 1, exhibit: 1, research: 1 })) ===
    JSON.stringify({ caravan: 4, exhibit: 4, research: 4 }),
  'ticket reward merge fixture should accumulate matching ticket types.'
)

assert(
  !goalStoreSource.includes('Object.entries({ ...weeklyBudgetEffect.ticketRewards, ...grantedServiceContractTickets })'),
  'goal reward ticket copy must not merge ledgers with object spread because service tickets can overwrite weekly budget tickets.'
)

assert(
  goalStoreSource.includes('const combinedTicketRewards = [grantedRewardTickets, weeklyBudgetEffect.ticketRewards, grantedServiceContractTickets].reduce'),
  'goal reward ticket copy should combine base goal tickets, weekly budget tickets, and service contract tickets with an accumulator.'
)

assert(
  goalStoreSource.includes('for (const [ticketType, amount] of Object.entries(ticketRewards))'),
  'goal reward ticket accumulator should iterate every ticket ledger entry.'
)

for (const { tierId, ticketType } of [
  { tierId: 'trade_tier_3', ticketType: 'caravan' },
  { tierId: 'museum_tier_3', ticketType: 'exhibit' },
  { tierId: 'academy_tier_3', ticketType: 'research' }
]) {
  const tierPattern = new RegExp(`id:\\s*'${tierId}'[\\s\\S]*?ticketRewards:\\s*\\{\\s*${ticketType}:\\s*3\\s*\\}`)
  assert(tierPattern.test(weeklyBudgetsSource), `${tierId} must still grant 3 ${ticketType} tickets.`)
}

if (errors.length > 0) {
  console.error('[qa-weekly-budget-ticket-rewards] failed')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('[qa-weekly-budget-ticket-rewards] passed')
