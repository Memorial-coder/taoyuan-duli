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

const read = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

const packageJson = JSON.parse(read('package.json'))
const booksellerSource = read('src/data/bookseller.ts')
const shopViewSource = read('src/views/game/ShopView.vue')
const gameStoreSource = read('src/stores/useGameStore.ts')

const getRareVisitorEntrySource = start => {
  const nextEntryStart = booksellerSource.indexOf('\n  {', start + 1)
  const visitorsEnd = booksellerSource.indexOf('\n]', start)
  const end = nextEntryStart >= 0 ? nextEntryStart : visitorsEnd
  return end >= 0 ? booksellerSource.slice(start, end) : ''
}

assert(
  packageJson.scripts?.['qa:rare-visitor-rewards'] === 'node scripts/qa-rare-visitor-rewards.mjs',
  'package.json must register qa:rare-visitor-rewards.'
)

assert(
  booksellerSource.includes("export const RARE_VISITOR_SEASON_VISIT_LEDGER_PREFIX = 'rare_visitor_season_visit'"),
  'Rare visitor seasonal visit ledger prefix must stay explicit.'
)
assert(
  booksellerSource.includes('`${RARE_VISITOR_SEASON_VISIT_LEDGER_PREFIX}:${visitorId}:${year}-${season}`'),
  'Rare visitor seasonal visit key must use year-season, not only visitor id or day.'
)

for (const { id, idPattern, tags, rewardPattern } of [
  {
    id: 'bookseller',
    idPattern: 'id: BOOKSELLER_VISITOR_ID',
    tags: ['研究', '见闻'],
    rewardPattern: /ticketRewards:\s*\{\s*research:\s*1\s*\}/
  },
  {
    id: 'festival_merchant',
    idPattern: "id: 'festival_merchant'",
    tags: ['节令', '人情', '陈设'],
    rewardPattern: /ticketRewards:\s*\{\s*exhibit:\s*1\s*\}/
  },
  {
    id: 'wandering_artist',
    idPattern: 'id: WANDERING_ARTIST_VISITOR_ID',
    tags: ['戏棚', '传闻', '气氛'],
    rewardPattern: /type:\s*'action_speed'[\s\S]*value:\s*0\.05[\s\S]*clueId:\s*'rare_visitor:wandering_artist:theater_echo'/
  },
  {
    id: 'outsider_guest',
    idPattern: "id: 'outsider_guest'",
    tags: ['商路', '天气', '远行'],
    rewardPattern: /ticketRewards:\s*\{\s*caravan:\s*1\s*\}/
  }
]) {
  const start = booksellerSource.indexOf(idPattern)
  assert(start >= 0, `${id} must remain in RARE_VISITORS.`)
  const entrySource = start >= 0 ? getRareVisitorEntrySource(start) : ''
  assert(entrySource.includes('personalityTags:'), `${id} must define personalityTags.`)
  assert(entrySource.includes('visitReward:'), `${id} must define visitReward.`)
  for (const tag of tags) {
    assert(entrySource.includes(`'${tag}'`), `${id} personalityTags must include ${tag}.`)
  }
  assert(rewardPattern.test(entrySource), `${id} visitReward must match the approved rare visitor reward.`)
}

assert(
  !shopViewSource.includes(':disabled="hasRecordedRareVisitor(visitor.id)"'),
  'Rare visitor cards must not disable visit buttons from historical rareVisitors records.'
)
assert(
  !shopViewSource.includes('if (hasRecordedRareVisitor(visitorId)) return'),
  'Rare visitor reward handler must not return early from historical rareVisitors records.'
)
assert(shopViewSource.includes('hasClaimedRareVisitorThisSeason'), 'ShopView must gate rare visitor rewards by seasonal claim state.')
assert(shopViewSource.includes('hasClaimedRareVisitorToday'), 'ShopView must distinguish same-day claimed state.')
assert(shopViewSource.includes('rareVisitorVisitButtonLabel'), 'ShopView must compute visit/revisit/today/season button labels.')
assert(shopViewSource.includes("'今日已拜访'"), 'ShopView must show 今日已拜访 for same-day claims.')
assert(shopViewSource.includes("'本季已拜访'"), 'ShopView must show 本季已拜访 for earlier seasonal claims.')
assert(shopViewSource.includes("'再访'"), 'ShopView must show 再访 for historical visitors with no seasonal claim.')
assert(shopViewSource.includes('booksellerRareVisitor'), 'ShopView must expose a bookseller visit button outside book purchases.')
assert(
  shopViewSource.includes("walletStore.addRewardTickets(visitor.visitReward.ticketRewards, { applyMultiplier: false, source: 'rare_visitor_visit' })"),
  'Rare visitor ticket rewards must go straight to the wallet without multipliers.'
)
assert(
  shopViewSource.includes('playerStore.markLifestyleUnlock(seasonVisitLedgerId, currentDayTag.value)'),
  'Rare visitor seasonal reward claims must be recorded in lifestyleUnlocks.'
)
assert(
  shopViewSource.includes('playerStore.recordRareVisitorVisit(visitor.id, currentDayTag.value)'),
  'Rare visitor historical seen records must still be written separately.'
)
assert(
  shopViewSource.includes('playerStore.markSecretLeadUnlocked(visitor.visitReward.clueId, currentDayTag.value)'),
  'Wandering artist visit reward must write a rare visitor clue record.'
)

assert(gameStoreSource.includes('getRareVisitorActionSpeedBonus'), 'useGameStore must include the rare visitor speed source.')
assert(
  gameStoreSource.includes('buildRareVisitorSeasonVisitLedgerId(visitor.id, year.value, season.value)'),
  'Rare visitor speed source must read the current seasonal visit ledger key.'
)
assert(
  gameStoreSource.includes('seasonVisitEntry?.lastSeenDayTag === currentDayTag'),
  'Rare visitor speed source must only apply on the claim day.'
)
assert(
  gameStoreSource.includes('const rareVisitorSpeedBuff = getRareVisitorActionSpeedBonus()'),
  'getActionSpeedReduction must read the rare visitor speed bonus.'
)
assert(
  gameStoreSource.includes('1 - (1 - foodSpeedBuff) * (1 - alchemySpeedBuff) * (1 - rareVisitorSpeedBuff)'),
  'Rare visitor action speed bonus must multiplicatively stack with food and alchemy bonuses.'
)
assert(
  !/activeBuff\.value\s*=|cookingStore\.activeBuff\s*=|activeElixir\.value\s*=|cookingStore\.activeElixir\s*=/.test(gameStoreSource),
  'Rare visitor speed bonus must not overwrite cookingStore.activeBuff or activeElixir.'
)

if (errors.length > 0) {
  console.error('[qa-rare-visitor-rewards] failed')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('[qa-rare-visitor-rewards] passed')
