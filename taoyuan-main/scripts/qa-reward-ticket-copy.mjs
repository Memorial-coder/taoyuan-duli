/* global console, process */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const srcRoot = path.join(projectRoot, 'src')

const errors = []

const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const readSource = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

const walkSourceFiles = directory => {
  const result = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      result.push(...walkSourceFiles(fullPath))
    } else if (/\.(ts|vue|js|mjs)$/.test(entry.name)) {
      result.push(fullPath)
    }
  }
  return result
}

const weeklyBudgetsSource = readSource('src/data/weeklyBudgets.ts')
const goalsSource = readSource('src/data/goals.ts')
const walletViewSource = readSource('src/views/game/WalletView.vue')
const lateGameDebugViewSource = readSource('src/views/dev/LateGameDebugView.vue')
const rewardTicketsSource = readSource('src/data/rewardTickets.ts')

const expectedTicketLabels = {
  construction: '建设券',
  exhibit: '展陈券',
  caravan: '商路票',
  research: '研究券',
  guildLogistics: '后勤票',
  familyFavor: '家和券'
}

for (const [ticketType, label] of Object.entries(expectedTicketLabels)) {
  const definitionPattern = new RegExp(`id:\\s*'${ticketType}'[\\s\\S]*?label:\\s*'${label}'`)
  assert(definitionPattern.test(rewardTicketsSource), `${ticketType} 票券的通用展示名必须保持为“${label}”。`)
}

for (const { tierId, ticketType, amount, label } of [
  { tierId: 'trade_tier_1', ticketType: 'caravan', amount: 1, label: '商路票' },
  { tierId: 'trade_tier_2', ticketType: 'caravan', amount: 2, label: '商路票' },
  { tierId: 'trade_tier_3', ticketType: 'caravan', amount: 3, label: '商路票' },
  { tierId: 'museum_tier_1', ticketType: 'exhibit', amount: 1, label: '展陈券' },
  { tierId: 'museum_tier_2', ticketType: 'exhibit', amount: 2, label: '展陈券' },
  { tierId: 'museum_tier_3', ticketType: 'exhibit', amount: 3, label: '展陈券' },
  { tierId: 'academy_tier_1', ticketType: 'research', amount: 1, label: '研究券' },
  { tierId: 'academy_tier_2', ticketType: 'research', amount: 2, label: '研究券' },
  { tierId: 'academy_tier_3', ticketType: 'research', amount: 3, label: '研究券' }
]) {
  const tierPattern = new RegExp(`id:\\s*'${tierId}'[\\s\\S]*?ticketRewards:\\s*\\{\\s*${ticketType}:\\s*${amount}\\s*\\}[\\s\\S]*?获得 ${amount} 张${label}`)
  assert(tierPattern.test(weeklyBudgetsSource), `${tierId} 应继续奖励 ${amount} 张${label}，并在文案里直说“${label}”。`)
}

for (const [ticketType, label] of Object.entries({
  caravan: '商路票',
  exhibit: '展陈券',
  research: '研究券'
})) {
  const walletPattern = new RegExp(`${ticketType}:\\s*'${label}'`)
  assert(walletPattern.test(walletViewSource), `钱包周预算票券摘要里的 ${ticketType} 必须显示为“${label}”。`)
}

assert(walletViewSource.includes('后勤票'), '高地准备提示必须显示为“后勤票”，不要写成“后勤券”。')
assert(lateGameDebugViewSource.includes("guildLogistics: '后勤票'"), '调试面板里的 guildLogistics 必须显示为“后勤票”。')
assert(lateGameDebugViewSource.includes("familyFavor: '家和券'"), '调试面板里的 familyFavor 必须显示为“家和券”。')
assert(goalsSource.includes('少量商路票、补给资格'), '瀚海桥接目标奖励摘要必须使用“商路票”。')
assert(goalsSource.includes('少量商路票、展示资格'), '瀚海结算目标奖励摘要必须使用“商路票”。')

const forbiddenTerms = ['学社票', '学社票券', '学舍票券', '商路票券', '展馆票券', '后勤券', '公会后勤券', '家业情谊券']
for (const sourceFile of walkSourceFiles(srcRoot)) {
  const source = fs.readFileSync(sourceFile, 'utf8')
  for (const term of forbiddenTerms) {
    assert(!source.includes(term), `${path.relative(projectRoot, sourceFile)} 不应再出现误导性的“${term}”。`)
  }
}

if (errors.length > 0) {
  console.error('[qa-reward-ticket-copy] failed')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('[qa-reward-ticket-copy] passed')
