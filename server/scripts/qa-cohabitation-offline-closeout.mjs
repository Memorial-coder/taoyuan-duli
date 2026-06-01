import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..')
const workspaceRoot = path.resolve(serverRoot, '..')

const readWorkspaceFile = relativePath =>
  readFile(path.join(workspaceRoot, relativePath), 'utf8')

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const assertIncludes = (source, needle, label) => {
  assert(source.includes(needle), `${label} missing ${needle}`)
}

const assertAllIncluded = (source, needles, label) => {
  for (const needle of needles) assertIncludes(source, needle, label)
}

const todoSource = await readWorkspaceFile('0523游戏拓展todo.md')
const rootChangelog = await readWorkspaceFile('CHANGELOG.md')
const mainChangelog = await readWorkspaceFile(path.join('taoyuan-main', 'CHANGELOG.md'))
const runtimeSource = await readWorkspaceFile(path.join('server', 'src', 'taoyuanCohabitationRuntime.js'))
const routeSource = await readWorkspaceFile(path.join('server', 'src', 'routes', 'api.js'))
const contractQaSource = await readWorkspaceFile(path.join('server', 'scripts', 'qa-cohabitation-contract.mjs'))
const frontendApiSource = await readWorkspaceFile(path.join('taoyuan-main', 'src', 'utils', 'cohabitationApi.ts'))
const frontendStoreSource = await readWorkspaceFile(path.join('taoyuan-main', 'src', 'stores', 'useCohabitationStore.ts'))
const frontendViewSource = await readWorkspaceFile(path.join('taoyuan-main', 'src', 'views', 'game', 'online', 'OnlineCohabitationView.vue'))

const todoMatch = todoSource.match(/### 11\.6[\s\S]*?(?=\n### 11\.7|\n## |$)/)
assert(todoMatch, '11.6 offline operation todo block missing')
assert(!/^- \[ \]/m.test(todoMatch[0]), '11.6 offline operation todo block still has unchecked items')
assertAllIncluded(todoMatch[0], [
  'offline_conflict_resolution',
  'offline-conflicts/preflight',
  'offline-conflicts/resolve',
  'purchase_shared_fund_shop_item',
  'sell_shared_warehouse_item',
  'settle_shared_daily',
  'collect_offline_auto_income',
], '11.6 offline operation todo block')

assertAllIncluded(rootChangelog, [
  '11.6',
  'offline_conflict_resolution',
  'purchase_shared_fund_shop_item',
  'sell_shared_warehouse_item',
], 'root changelog offline closeout entry')
assertAllIncluded(mainChangelog, [
  '11.6',
  'offline_conflict_resolution',
  'purchase_shared_fund_shop_item',
  'sell_shared_warehouse_item',
], 'frontend changelog offline closeout entry')

const requiredOfflineQueueActions = [
  'remove_crop_shared_farm',
  'buy_shared_animal',
  'sell_shared_animal',
  'care_shared_pet',
  'process_shared_workshop_recipe',
  'move_shared_decoration',
  'record_rare_item_delivery_receipt',
  'record_rare_item_refund_receipt',
  'record_family_major_event_receipt',
  'record_family_major_event_refund_receipt',
  'record_limited_decoration_delivery_receipt',
  'record_limited_decoration_refund_receipt',
  'record_shared_decoration_removal_receipt',
  'record_shared_decoration_removal_refund_receipt',
  'settle_shared_daily',
  'collect_offline_auto_income',
  'purchase_shared_fund_shop_item',
  'sell_shared_warehouse_item',
]
assertAllIncluded(runtimeSource, requiredOfflineQueueActions.map(action => `'${action}'`), 'server offline queue supported actions')
assertAllIncluded(runtimeSource, [
  'offline_conflict_resolution_enabled: true',
  'offline_conflict_auto_resolve_enabled: true',
  'resolve_offline_conflicts: true',
  'buildOfflineConflictResolutionEvidence',
  'preflightCohabitationOfflineConflicts',
  'resolveCohabitationOfflineConflicts',
  'offline_conflict_auto_resolved',
  'offline_queue_merged',
  'warehouse_ledger_count',
  'fund_ledger_count',
  'shared_farm_ledger_count',
  'shared_animal_ledger_count',
  'shared_pet_ledger_count',
  'shared_decoration_ledger_count',
], 'server offline conflict resolution implementation')

assertAllIncluded(routeSource, [
  '/offline-conflicts/preflight',
  '/offline-conflicts/resolve',
], 'offline conflict routes')

assertAllIncluded(contractQaSource, [
  'offline_conflict_resolution',
  'purchase_shared_fund_shop_item',
  'sell_shared_warehouse_item',
  'settle_shared_daily',
  'collect_offline_auto_income',
  'shared_decoration_ledger_count',
], 'cohabitation contract QA coverage')

assertAllIncluded(frontendApiSource, [
  'CohabitationOfflineConflictResolutionEvidence',
  'preflightCohabitationOfflineConflicts',
  'resolveCohabitationOfflineConflicts',
  'purchase_shared_fund_shop_item',
  'sell_shared_warehouse_item',
  'shared_decoration_ledger_count',
], 'frontend API offline conflict types')
assertAllIncluded(frontendStoreSource, [
  'preflightOfflineConflicts',
  'resolveOfflineConflicts',
  'offlineConflictAutoResolution',
], 'frontend store offline conflict actions')
assertAllIncluded(frontendViewSource, [
  'offlineConflictLedgerDomainLabel',
  'purchase_shared_fund_shop_item',
  'sell_shared_warehouse_item',
  'offline_conflict_auto_resolved',
], 'frontend offline closeout readback')

console.log('[qa-cohabitation-offline-closeout] OK')
