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

const packageJsonSource = readSource('package.json')
const rewardTicketsSource = readSource('src/data/rewardTickets.ts')
const economyTypesSource = readSource('src/types/economy.ts')
const walletStoreSource = readSource('src/stores/useWalletStore.ts')
const npcViewSource = readSource('src/views/game/NpcView.vue')
const villageViewSource = readSource('src/views/game/VillageView.vue')

const convertibleTypesMatch = rewardTicketsSource.match(/MAYOR_TICKET_CONVERTIBLE_TYPES:[^\n=]+=\s*\[([^\]]+)\]/)
const convertibleTypes = convertibleTypesMatch
  ? convertibleTypesMatch[1]
      .split(',')
      .map(entry => entry.trim().replaceAll("'", ''))
      .filter(Boolean)
  : []
const expectedConvertibleTypes = ['construction', 'exhibit', 'caravan', 'research']

assert(
  JSON.stringify([...convertibleTypes].sort()) === JSON.stringify([...expectedConvertibleTypes].sort()),
  'mayor conversion should only expose construction/exhibit/caravan/research tickets.'
)
assert(!convertibleTypes.includes('guildLogistics'), 'mayor conversion must not include guildLogistics in first release.')
assert(!convertibleTypes.includes('familyFavor'), 'mayor conversion must not include familyFavor in first release.')

for (const snippet of [
  'MAYOR_TICKET_CONVERSION_NPC_ID = \'liu_cunzhang\'',
  'MAYOR_TICKET_CONVERSION_REQUIRED_RELATIONSHIP = \'friendly\'',
  'MAYOR_TICKET_CONVERSION_REQUIRED_FRIENDSHIP = 1000',
  'MAYOR_TICKET_CONVERSION_REQUIRED_VILLAGE_PROJECT_LEVEL = 2',
  'MAYOR_TICKET_CONVERSION_SOURCE_TICKET_COST = 3',
  'MAYOR_TICKET_CONVERSION_MONEY_COST = 1200',
  'MAYOR_TICKET_CONVERSION_WEEKLY_LIMIT = 6'
]) {
  assert(rewardTicketsSource.includes(snippet), `rewardTickets.ts missing conversion config: ${snippet}`)
}

for (const typeName of [
  'MayorTicketConversionTicketType',
  'RewardTicketConversionUsage',
  'MayorTicketConversionStatus',
  'MayorTicketConversionOffer',
  'MayorTicketConversionResult'
]) {
  assert(economyTypesSource.includes(typeName), `economy.ts should export ${typeName}.`)
}

for (const snippet of [
  'rewardTicketConversionUsage',
  'getWeekCycleInfo(gameStore.year, gameStore.season, gameStore.day).seasonWeekId',
  'mayorTicketConversionStatus',
  'ticketConversionOffers',
  'redeemRewardTicketConversion',
  'playerStore.spendMoney(MAYOR_TICKET_CONVERSION_MONEY_COST, \'wallet\')',
  'addRewardTicketsToBalanceOnly({ [targetType]: MAYOR_TICKET_CONVERSION_TARGET_TICKET_AMOUNT })'
]) {
  assert(walletStoreSource.includes(snippet), `useWalletStore.ts missing conversion behavior: ${snippet}`)
}

const conversionFunctionMatch = walletStoreSource.match(/const redeemRewardTicketConversion[\s\S]*?\n  const addMysteryBoxes/)
assert(!!conversionFunctionMatch, 'useWalletStore.ts should define redeemRewardTicketConversion before mystery boxes.')
assert(
  conversionFunctionMatch && !conversionFunctionMatch[0].includes('rewardTicketLifetimeEarned.value'),
  'ticket conversion must not write rewardTicketLifetimeEarned.'
)

for (const snippet of [
  'data-testid="mayor-ticket-conversion-panel"',
  'data-testid="mayor-ticket-conversion-source"',
  'data-testid="mayor-ticket-conversion-target"',
  'data-testid="mayor-ticket-conversion-submit"',
  'MAYOR_TICKET_CONVERSION_NPC_ID',
  '柳村长关系',
  '村庄建设',
  '村长愿意为你担保票据转换',
  '柳村长已开放村务票据转换',
  'notifyMayorTicketConversionFriendshipProgress'
]) {
  assert(npcViewSource.includes(snippet), `NpcView.vue missing mayor conversion UI/feedback entry: ${snippet}`)
}

for (const snippet of [
  'notifyMayorTicketConversionVillageProgress',
  'completedProjectsBefore',
  '村务票据转换已具备建设条件',
  '柳村长已开放村务票据转换'
]) {
  assert(villageViewSource.includes(snippet), `VillageView.vue missing mayor conversion build-condition feedback: ${snippet}`)
}

assert(
  packageJsonSource.includes('"qa:mayor-ticket-conversion": "node scripts/qa-mayor-ticket-conversion.mjs"'),
  'package.json should expose qa:mayor-ticket-conversion.'
)

if (errors.length > 0) {
  console.error('[qa-mayor-ticket-conversion] failed')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('[qa-mayor-ticket-conversion] passed')
