/* global console, process */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import ts from 'typescript'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const srcRoot = path.join(projectRoot, 'src')

const errors = []
const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const read = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

const tryResolveFile = candidate => {
  const variants = [
    candidate,
    `${candidate}.ts`,
    `${candidate}.tsx`,
    `${candidate}.js`,
    path.join(candidate, 'index.ts'),
    path.join(candidate, 'index.tsx'),
    path.join(candidate, 'index.js')
  ]
  for (const item of variants) {
    try {
      if (fs.statSync(item).isFile()) return item
    } catch {
      // keep trying
    }
  }
  return null
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const resolved = tryResolveFile(path.join(srcRoot, specifier.slice(2)))
      if (!resolved) throw new Error(`Cannot resolve ${specifier}`)
      return { url: pathToFileURL(resolved).href, shortCircuit: true }
    }
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
      const parentPath = fileURLToPath(context.parentURL)
      const resolved = tryResolveFile(path.resolve(path.dirname(parentPath), specifier))
      if (resolved) return { url: pathToFileURL(resolved).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url.startsWith('file:') && /\.(ts|tsx)$/.test(url)) {
      const filePath = fileURLToPath(url)
      const source = fs.readFileSync(filePath, 'utf8')
      const transpiled = ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.Preserve,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true
        },
        fileName: filePath
      })
      return { format: 'module', source: transpiled.outputText, shortCircuit: true }
    }
    return nextLoad(url, context)
  }
})

const data = await import(pathToFileURL(path.join(srcRoot, 'data', 'index.ts')).href)
const npcEffects = await import(pathToFileURL(path.join(srcRoot, 'data', 'npcFunctionEffects.ts')).href)

const packageJson = JSON.parse(read('package.json'))
const todoSource = fs.readFileSync(path.join(projectRoot, '..', '联动todo.md'), 'utf8')
const itemCardSource = read('src/components/game/ItemCard.vue')
const inventorySource = read('src/views/game/InventoryView.vue')
const itemCollectionSource = read('src/components/game/ItemCollectionTab.vue')
const forgeAffixesSource = read('src/data/forgeAffixes.ts')
const goalsSource = read('src/data/goals.ts')
const potentialSource = read('src/data/potential.ts')
const villageProjectsSource = read('src/data/villageProjects.ts')
const npcStoreSource = read('src/stores/useNpcStore.ts')
const onlineOrdersSource = read('src/views/game/online/OnlineOrdersView.vue')
const questStoreSource = read('src/stores/useQuestStore.ts')
const museumStoreSource = read('src/stores/useMuseumStore.ts')
const quarryStoreSource = read('src/stores/useQuarryStore.ts')

assert(
  packageJson.scripts?.['qa:linkage-final-acceptance'] === 'node scripts/qa-linkage-final-acceptance.mjs',
  'package.json must register qa:linkage-final-acceptance.'
)

const requiredLinkedItems = [
  'mixed_seed_oil',
  'manor_edge_bundle',
  'ley_crystal_focus_elixir',
  'wind_core_guard_pill',
  'marsh_luminous_cleansing_elixir',
  'moon_pearl_calm_elixir',
  'jade_orchid_focus_elixir',
  'rare_lotus_guard_elixir',
  'jade_peach_spirit_elixir'
]

for (const itemId of requiredLinkedItems) {
  const linkage = data.ITEM_LINKAGE_DEFS.find(entry => entry.itemId === itemId)
  assert(!!linkage, `Final acceptance item missing from item linkage matrix: ${itemId}`)
  assert((linkage?.repeatableSinks.length ?? 0) + (linkage?.oneTimeSinks.length ?? 0) >= 1, `Final acceptance item needs at least one real sink: ${itemId}`)
  assert((linkage?.currentUseSystems.length ?? 0) >= 2, `Final acceptance item needs at least two connected use systems: ${itemId}`)
  assert(data.getItemLinkageUseTags(itemId).length >= 2, `Final acceptance item needs visible usage tags: ${itemId}`)
  assert(data.LINKAGE_DEMAND_POOL.some(entry => entry.itemId === itemId), `Final acceptance item needs a demand-pool entry: ${itemId}`)
}

let processedGroupsWithTwoExits = 0
for (const group of data.PROCESSED_ITEM_GROUPS) {
  const exitSystems = new Set([
    ...(group.demandSystems ?? []),
    ...(data.getLinkageDemandEntriesByProcessedGroup(group.id).flatMap(entry => entry.systems) ?? [])
  ])
  if (exitSystems.size >= 2) processedGroupsWithTwoExits += 1
}
const processedDoubleSinkRatio = data.PROCESSED_ITEM_GROUPS.length > 0
  ? processedGroupsWithTwoExits / data.PROCESSED_ITEM_GROUPS.length
  : 0
assert(
  processedDoubleSinkRatio >= 0.7,
  `At least 70% of processed item groups need 2+ exits; got ${processedGroupsWithTwoExits}/${data.PROCESSED_ITEM_GROUPS.length}.`
)

const connectedNpcEffectTypes = [
  'shop_discount_bonus',
  'rare_commission',
  'bulk_buy',
  'rare_shop_stock',
  'caravan_preorder',
  'proxy_buy',
  'mine_extra_node',
  'mine_floor_hint',
  'zhiji_mine_boost',
  'forge_success_boost',
  'premium_forge',
  'free_tool_repair',
  'forge_speed',
  'tool_upgrade_speed',
  'tool_bonus_slot',
  'fish_odds_display',
  'tackle_maintain',
  'spouse_fishing_boost',
  'fishing_easy',
  'secret_fishing_style',
  'deep_water_spot',
  'cook_success_boost',
  'secret_recipes',
  'daily_tofu',
  'tofu_workshop',
  'festival_tofu_feast',
  'wine_cellar',
  'wine_aging_boost',
  'rare_wine',
  'tea_ceremony',
  'private_tea',
  'herb_preorder',
  'herb_craft_boost',
  'rare_herb_channel',
  'farmhouse_portrait',
  'scenic_paintings',
  'calligraphy',
  'letter_writing',
  'festival_music',
  'special_perform',
  'custom_furniture'
]
const registeredNpcEffectTypes = new Set(npcEffects.getRegisteredNpcFunctionEffectTypes())
const existingConnectedNpcEffectTypes = connectedNpcEffectTypes.filter(effectType => registeredNpcEffectTypes.has(effectType))
assert(existingConnectedNpcEffectTypes.length >= 10, `At least 10 NPC effect types must be connected; got ${existingConnectedNpcEffectTypes.length}.`)

const quarryConnectedSystems = new Set()
if (data.MUSEUM_EXHIBIT_SETS?.some(set => set.id === 'deep_vein_quarry_showcase')) quarryConnectedSystems.add('museum')
if (forgeAffixesSource.includes("id: 'deep_refine'")) quarryConnectedSystems.add('forge')
if (villageProjectsSource.includes("donationPlan:") && villageProjectsSource.includes("id: 'quarry_stewardship_supply_drive'")) quarryConnectedSystems.add('villageProject')
if (potentialSource.includes("id: 'quarry_stewardship'")) quarryConnectedSystems.add('potential')
if (goalsSource.includes("metric: 'quarryWeeklyClaims'") && goalsSource.includes("metric: 'quarryLifetimeClears'")) quarryConnectedSystems.add('goal')
assert(quarryConnectedSystems.size >= 3, `Quarry must connect to at least 3 downstream systems; got ${[...quarryConnectedSystems].join(', ')}.`)

const familyWishesWithItemRequirements = [...data.WS09_FAMILY_WISH_DEFS, ...data.WS15_FAMILY_WISH_DEFS]
  .filter(wish => (wish.itemRequirements ?? []).length > 0)
assert(familyWishesWithItemRequirements.length >= 5, `At least 5 family wishes must consume real items; got ${familyWishesWithItemRequirements.length}.`)
assert(
  npcStoreSource.includes('inventoryStore.removeItemAnywhere') &&
    npcStoreSource.includes('inventoryStore.deserialize(inventorySnapshot)') &&
    npcStoreSource.includes('familyWishBoard.value.completedWishIds.includes(wishId)'),
  'Family wish completion must consume real items, rollback on failure, and block duplicate claims.'
)

assert(
  data.getOnlineWeakItemOrderPool().length >= 1 &&
    onlineOrdersSource.includes('inventoryStore.removeUnlockedItem(order.itemId, order.quantity)') &&
    onlineOrdersSource.includes('weakItemOrderCompleted.value') &&
    onlineOrdersSource.includes('markLifestyleUnlock(weakItemOrderLockId.value'),
  'Online weak-item orders must exist, consume real items, and enforce weekly duplicate locks.'
)

assert(
  itemCardSource.includes('getItemLinkageUseTags') &&
    itemCardSource.includes("usage-click', tag") &&
    inventorySource.includes('show-usage-tags') &&
    inventorySource.includes('handleInventoryUsageTagClick') &&
    itemCollectionSource.includes('show-usage-tags') &&
    itemCollectionSource.includes('handleCollectionUsageTagClick'),
  'Item cards must display and navigate through real linkage usage tags.'
)

for (const requiredQa of [
  'qa:item-linkage-matrix',
  'qa:processed-item-groups',
  'qa:family-wish-consumption',
  'qa:online-order-weak-item-sinks',
  'qa:museum-exhibit-set-guards',
  'qa:species-note-linkage',
  'qa:hanhai-travel-prep-sinks',
  'qa:region-demand-pool-sinks',
  'qa:goal-guild-life-linkage',
  'qa:linkage-settlement-log-feedback',
  'qa:linkage-economy-guards',
  'qa:linkage-save-compatibility'
]) {
  assert(packageJson.scripts?.[requiredQa], `Final acceptance QA depends on missing script: ${requiredQa}`)
}

assert(
  questStoreSource.includes('specialOrderSettlementReceipts') &&
    museumStoreSource.includes('rewardClaimed') &&
    quarryStoreSource.includes('finalRewardClaimed'),
  'Settlement paths must retain duplicate-claim guards for orders, museum sets, and quarry final rewards.'
)

assert(
  todoSource.includes('- [x] LINK-101：旧档兼容。') &&
    todoSource.includes('## 20. 最终验收标准'),
  '联动todo.md must keep LINK-101 complete and final acceptance criteria visible.'
)

if (errors.length > 0) {
  console.error(`qa-linkage-final-acceptance failed (${errors.length})`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(
  `qa-linkage-final-acceptance passed (${requiredLinkedItems.length} priority items, ${processedGroupsWithTwoExits}/${data.PROCESSED_ITEM_GROUPS.length} processed groups with 2+ exits, ${existingConnectedNpcEffectTypes.length} NPC effects, ${quarryConnectedSystems.size} quarry links).`
)
