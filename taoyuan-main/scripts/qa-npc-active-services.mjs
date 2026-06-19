/* global console */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

const read = (...parts) => fs.readFileSync(path.join(projectRoot, ...parts), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}
const assertIncludes = (source, needle, message) => {
  assert(source.includes(needle), message)
}
const assertNotIncludes = (source, needle, message) => {
  assert(!source.includes(needle), message)
}

const packageJson = JSON.parse(read('package.json'))
const npcWorldSource = read('src', 'data', 'npcWorld.ts')
const npcTypeSource = read('src', 'types', 'npc.ts')
const npcStoreSource = read('src', 'stores', 'useNpcStore.ts')
const endDaySource = read('src', 'composables', 'useEndDay.ts')
const npcViewSource = read('src', 'views', 'game', 'NpcView.vue')

assert(
  packageJson.scripts?.['qa:npc-active-services'] === 'node scripts/qa-npc-active-services.mjs',
  'package.json should register qa:npc-active-services.'
)

assertIncludes(npcWorldSource, 'export interface NpcActiveServiceDef', 'NPC active service type should exist.')
assertIncludes(npcWorldSource, 'export const NPC_ACTIVE_SERVICE_DEFS', 'NPC active service data should exist.')
assertIncludes(npcWorldSource, 'export const getNpcActiveServiceDefs', 'NPC active service lookup should be exported.')
assertIncludes(
  npcWorldSource,
  'service.legacyUnlocked === true || npcHasT1Unlock',
  'NPC active service visibility should require T1 unlock unless the service is explicitly legacy unlocked.'
)

const serviceBlockStart = npcWorldSource.indexOf('export const NPC_ACTIVE_SERVICE_DEFS')
const serviceBlockEnd = npcWorldSource.indexOf('export const getNpcActiveServiceDefs')
assert(serviceBlockStart >= 0 && serviceBlockEnd > serviceBlockStart, 'NPC active service block should be parseable.')
const serviceBlock = npcWorldSource.slice(serviceBlockStart, serviceBlockEnd)
const serviceNpcIds = Array.from(serviceBlock.matchAll(/npcId:\s*'([^']+)'/g)).map(match => match[1])
const uniqueNpcIds = new Set(serviceNpcIds)
assert(uniqueNpcIds.size >= 12, `NPC active services should cover most fixed villagers; found ${uniqueNpcIds.size}.`)
assert(!uniqueNpcIds.has('xiao_man'), 'Xiao Man already has tool-upgrade utility and should not be made stronger by this pass.')
assert(!uniqueNpcIds.has('liu_cunzhang'), 'Liu Cunzhang already owns mayor ticket conversion and should stay on that dedicated path.')

for (const token of [
  'costMoney:',
  'minStage:',
  'itemRewards:',
  'ticketRewards:',
  "ticketRewards: { construction: 1 }",
  "ticketRewards: { exhibit: 1 }",
  "ticketRewards: { caravan: 1 }",
  "ticketRewards: { research: 1 }",
  "ticketRewards: { familyFavor: 1 }"
]) {
  assertIncludes(serviceBlock, token, `NPC active service block should include ${token}.`)
}

assertIncludes(npcTypeSource, 'activeServiceTalksThisWeek: number', 'NPC state should persist weekly active-service talk progress.')
assertIncludes(npcTypeSource, 'pendingActiveServices: NpcPendingActiveService[]', 'NPC state should persist deferred active-service requests.')
assertIncludes(npcTypeSource, 'export interface NpcPendingActiveService', 'Pending NPC active service type should be explicit.')
assertIncludes(npcTypeSource, 'requestedDayTag: string', 'Pending NPC active services should remember the request day.')
assertIncludes(npcTypeSource, 'costMoney: number', 'Pending NPC active services should remember refundable cost.')

assertIncludes(npcStoreSource, 'const NPC_ACTIVE_SERVICE_REQUIRED_WEEKLY_TALKS = 3', 'NPC active services should require three weekly talks.')
assertIncludes(npcStoreSource, 'activeServiceTalksThisWeek: 0', 'Default NPC state should initialize active-service talk progress.')
assertIncludes(npcStoreSource, 'pendingActiveServices: []', 'Default NPC state should initialize pending active services.')
assertIncludes(npcStoreSource, 'state.activeServiceTalksThisWeek = Math.min(', 'Talking to an NPC should advance active-service weekly progress.')
assertIncludes(npcStoreSource, 'NPC_ACTIVE_SERVICE_REQUIRED_WEEKLY_TALKS', 'NPC store should expose the weekly talk requirement.')
assertIncludes(npcStoreSource, 'getNpcActiveServiceLedgerId', 'NPC store should own the weekly active-service ledger key.')
assertIncludes(npcStoreSource, 'hasPendingNpcActiveService', 'NPC store should expose pending active-service checks.')
assertIncludes(npcStoreSource, 'const requestNpcActiveService = (', 'NPC store should own active-service requests.')
assertIncludes(npcStoreSource, 'const processPendingNpcActiveServices = (currentDayTag: string): string[]', 'NPC store should own deferred active-service settlement.')
assertIncludes(npcStoreSource, 'playerStore.hasLifestyleDiscovery(\'lifestyleUnlocks\', ledgerId)', 'NPC active services should block already-settled weekly ledgers.')
assertIncludes(npcStoreSource, 'hasPendingNpcActiveService(npcId, serviceId, weekId)', 'NPC active services should block duplicate pending requests.')
assertIncludes(npcStoreSource, '(state.activeServiceTalksThisWeek ?? 0) < NPC_ACTIVE_SERVICE_REQUIRED_WEEKLY_TALKS', 'NPC active services should enforce three weekly talks before request.')
assertIncludes(npcStoreSource, 'playerStore.spendMoney(service.costMoney, \'system\')', 'NPC active service requests should charge when accepted.')
assertIncludes(npcStoreSource, 'state.pendingActiveServices = [', 'NPC active service requests should queue deferred settlement.')
assertIncludes(npcStoreSource, 'entry.requestedDayTag === currentDayTag', 'NPC active services should not settle on the request day.')
assertIncludes(npcStoreSource, 'const inventorySnapshot = inventoryStore.serialize()', 'NPC active service settlement should snapshot inventory before item delivery.')
assertIncludes(npcStoreSource, 'inventoryStore.addItemsExact(service.itemRewards ?? [])', 'NPC active service settlement should grant item rewards atomically.')
assertIncludes(npcStoreSource, 'inventoryStore.deserialize(inventorySnapshot)', 'NPC active service settlement should roll back inventory on failed delivery.')
assertIncludes(npcStoreSource, 'playerStore.earnMoney(entry.costMoney, { countAsEarned: false })', 'NPC active service settlement should refund failed deliveries.')
assertIncludes(
  npcStoreSource,
  "walletStore.addRewardTickets(service.ticketRewards, { applyMultiplier: false, source: 'npc_active_service' })",
  'NPC active service settlement should grant wallet tickets without late-game multipliers.'
)
assertIncludes(npcStoreSource, 'playerStore.markLifestyleUnlock(ledgerId, entry.weekId)', 'NPC active service settlement should mark the weekly ledger after delivery.')
assertIncludes(npcStoreSource, 'logs.push(`', 'NPC active service settlement should write logs.')
assertIncludes(npcStoreSource, 'entry.costMoney}文。`)', 'NPC active service settlement logs should include refund money.')
assertIncludes(npcStoreSource, 'state.activeServiceTalksThisWeek = 0', 'NPC active-service talk progress should reset weekly.')
assertIncludes(npcStoreSource, 'pendingActiveServices: Array.isArray(s.pendingActiveServices)', 'NPC save migration should normalize pending active services.')

assertIncludes(endDaySource, 'npcStore.processPendingNpcActiveServices(currentDayTag)', 'End-day flow should settle pending NPC active services on the next day.')

assertIncludes(npcViewSource, 'data-testid="npc-active-services-panel"', 'NPC page should render the active service panel.')
assertIncludes(npcViewSource, 'data-testid="npc-active-service-talk-progress"', 'NPC page should show weekly active-service talk progress.')
assertIncludes(npcViewSource, ':data-testid="`npc-active-service-${service.id}`"', 'NPC active service buttons should have stable test ids.')
assertIncludes(npcViewSource, 'getNpcActiveServiceDefs(selectedNpc.value)', 'NPC page should read service defs for the selected NPC.')
assertIncludes(npcViewSource, 'getRelationshipStageFromState(state.friendship', 'NPC active services should evaluate relationship stage from current state.')
assertIncludes(npcViewSource, 'isRelationshipStageAtLeast(selectedNpcRelationshipStage.value, service.minStage)', 'NPC active services should enforce relationship gates.')
assertIncludes(npcViewSource, 'getWeekCycleInfo(gameStore.year, gameStore.season, gameStore.day).seasonWeekId', 'NPC active services should derive the current week id.')
assertIncludes(npcViewSource, 'npcStore.hasPendingNpcActiveService(service.npcId, service.id, currentNpcServiceWeekId.value)', 'NPC page should reflect pending active services.')
assertIncludes(npcViewSource, 'selectedNpcActiveServiceTalksThisWeek.value < npcStore.NPC_ACTIVE_SERVICE_REQUIRED_WEEKLY_TALKS', 'NPC page should block requests before three weekly talks.')
assertIncludes(npcViewSource, 'playerStore.money < service.costMoney', 'NPC page should still block unaffordable requests.')
assertIncludes(npcViewSource, 'isNpcActiveServicePending(service) ? ', 'NPC page should branch button text for deferred delivery state.')
assertIncludes(npcViewSource, 'npcStore.requestNpcActiveService(', 'NPC page should request active service through the store.')
assertIncludes(npcViewSource, 'currentNpcServiceDayTag.value', 'NPC page should pass the request day to the store.')
assertIncludes(npcViewSource, 'addLog(`', 'NPC page should log active-service request feedback.')
assertIncludes(npcViewSource, '${result.message}`)', 'NPC page should include request result in active-service log feedback.')

assertNotIncludes(
  npcViewSource,
  'playerStore.markLifestyleUnlock(getNpcActiveServiceLedgerId(service), currentNpcServiceWeekId.value)',
  'NPC page should not mark the weekly active-service ledger immediately.'
)
assertNotIncludes(
  npcViewSource,
  'inventoryStore.addItemsExact(service.itemRewards ?? [])',
  'NPC page should not grant active-service item rewards immediately.'
)
assertNotIncludes(
  npcViewSource,
  "walletStore.addRewardTickets(service.ticketRewards, { applyMultiplier: false, source: 'npc_active_service' })",
  'NPC page should not grant active-service tickets immediately.'
)

console.log('qa-npc-active-services passed')
