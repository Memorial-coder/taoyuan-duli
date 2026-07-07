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

const getObjectBlock = (source, marker) => {
  const start = source.indexOf(marker)
  if (start < 0) return ''
  const end = source.indexOf('\n  },', start)
  return end > start ? source.slice(start, end) : source.slice(start)
}

const typesSource = read('src/types/npc.ts')
assert(typesSource.includes('export interface FamilyWishItemRequirement'), 'missing FamilyWishItemRequirement type')
assert(typesSource.includes('itemRequirements?: FamilyWishItemRequirement[]'), 'FamilyWishDef must declare itemRequirements')
assert(typesSource.includes('demandId?: string'), 'FamilyWishItemRequirement must preserve shared demand id')
assert(typesSource.includes('antiRepeatTags?: string[]'), 'FamilyWishItemRequirement must preserve anti-repeat tags')

const npcDataSource = read('src/data/npcs.ts')
const expectedWishRequirements = {
  wish_shared_breakfast: ['mixed_seed_oil', 'egg'],
  wish_lakeside_outing: ['manor_edge_bundle', 'standard_bait'],
  wish_legacy_archive: ['paper', 'charcoal'],
  wish_market_feast: ['mixed_seed_oil', 'rice_flour'],
  wish_archive_patron: ['paper', 'cloth'],
  wish_pond_moonwatch: ['fish_feed', 'standard_bait'],
  wish_spirit_archive: ['pine_incense', 'paper']
}

const allWishBlocks = Object.entries(expectedWishRequirements).map(([wishId, requiredItemIds]) => {
  const block = getObjectBlock(npcDataSource, `id: '${wishId}'`)
  assert(block.includes('itemRequirements'), `${wishId} missing real item requirements`)
  assert(block.includes('sourceHint'), `${wishId} missing item source hints`)
  for (const itemId of requiredItemIds) {
    assert(block.includes(`itemId: '${itemId}'`), `${wishId} missing expected requirement ${itemId}`)
    assert(/quantity:\s*[1-9]/.test(block), `${wishId} has invalid requirement quantity`)
  }
  return block
})
assert(allWishBlocks.length >= 7, 'family wish pool must include at least 7 audited wishes')
assert(allWishBlocks.filter(block => block.includes('sourceGroupId')).length >= 6, 'family wishes should retain processed/source group ids')

const sharedBreakfastBlock = getObjectBlock(npcDataSource, "id: 'wish_shared_breakfast'")
assert(/itemId:\s*'mixed_seed_oil'[\s\S]*?quantity:\s*1/.test(sharedBreakfastBlock), 'wish_shared_breakfast should consume mixed_seed_oil x1')
assert(/itemId:\s*'egg'[\s\S]*?quantity:\s*2/.test(sharedBreakfastBlock), 'wish_shared_breakfast should consume egg x2')

const marketFeastBlock = getObjectBlock(npcDataSource, "id: 'wish_market_feast'")
assert(/itemId:\s*'mixed_seed_oil'[\s\S]*?quantity:\s*2/.test(marketFeastBlock), 'wish_market_feast should consume mixed_seed_oil x2')
assert(/itemId:\s*'rice_flour'[\s\S]*?quantity:\s*1/.test(marketFeastBlock), 'wish_market_feast should consume rice_flour x1')

const itemsSource = read('src/data/items.ts')
const processingSource = read('src/data/processing.ts')
for (const itemId of new Set(Object.values(expectedWishRequirements).flat())) {
  assert(
    itemsSource.includes(`id: '${itemId}'`) || processingSource.includes(`id: '${itemId}'`),
    `family wish references missing item ${itemId}`
  )
}

const demandPoolSource = read('src/data/linkageDemandPools.ts')
assert(demandPoolSource.includes("tags: ['oil', 'home_cooking', 'family_breakfast'"), 'linkage demand pool must expose family_breakfast tag')
assert(demandPoolSource.includes('getFamilyWishDemandEntries'), 'linkage demand pool must expose family wish lookup')
assert(demandPoolSource.includes('getPublicStorageDemandEntries'), 'linkage demand pool must expose public storage lookup')
assert(demandPoolSource.includes('getFamilyWishDemandAntiRepeatTags'), 'linkage demand pool must expose family wish anti-repeat tags')
for (const marker of [
  "id: 'mixed_seed_oil_home_cooking'",
  "id: 'manor_edge_bundle_family_outing'",
  "id: 'paper_family_archive'",
  "id: 'charcoal_family_archive'",
  "id: 'rice_flour_family_festival_prep'",
  "id: 'cloth_family_archive'",
  "id: 'fish_feed_family_pond'",
  "id: 'standard_bait_family_outing'",
  "id: 'pine_incense_family_spirit_archive'"
]) {
  const block = getObjectBlock(demandPoolSource, marker)
  assert(block.includes("'familyWish'"), `linkage demand pool missing family wish system for ${marker}`)
  assert(block.includes('familyWishIds'), `linkage demand pool missing family wish mapping for ${marker}`)
  assert(block.includes('antiRepeatTags'), `linkage demand pool missing anti-repeat tags for ${marker}`)
}

const npcStoreSource = read('src/stores/useNpcStore.ts')
assert(npcStoreSource.includes('normalizeFamilyWishItemRequirements'), 'useNpcStore missing family wish requirement normalization')
assert(npcStoreSource.includes('getFamilyWishDemandEntries(wishDef.id)'), 'family wish normalization must read shared demand pool')
assert(npcStoreSource.includes('getLinkageDemandAntiRepeatTags(demandEntry)'), 'family wish normalization must keep shared anti-repeat tags')
assert(npcStoreSource.includes('getFamilyWishItemRequirementStatus'), 'useNpcStore missing family wish inventory status')
assert(npcStoreSource.includes('getFamilyWishCompletionBlockReason'), 'useNpcStore missing family wish completion block reason')
assert(npcStoreSource.includes('getFamilyWishMissingRequirementSummary'), 'useNpcStore missing weekly missing-material summary')
assert(npcStoreSource.includes('removeCombinedItemAtLeast'), 'family wish consumption must support min quality across combined inventory')
assert(npcStoreSource.includes('removeCombinedItem(requirement.itemId'), 'family wish consumption must remove real combined inventory items')
assert(npcStoreSource.includes('sourceGroupId: entry.sourceGroupId'), 'requirement normalization must preserve sourceGroupId')
assert(npcStoreSource.includes('demandId: demandEntry?.id'), 'requirement normalization must preserve demandId')
assert(npcStoreSource.includes('demandTags: demandEntry?.tags'), 'requirement normalization must preserve demand tags')

const completeBlock = npcStoreSource.slice(
  npcStoreSource.indexOf('const completeFamilyWish'),
  npcStoreSource.indexOf('const getEligibleFamilyWishDefs')
)
assert(completeBlock.includes('missingRequirements'), 'completeFamilyWish must check missing requirements before completion')
assert(completeBlock.includes('const inventorySnapshot = inventoryStore.serialize()'), 'completeFamilyWish must snapshot inventory before consuming')
assert(completeBlock.includes('inventoryStore.deserialize(inventorySnapshot)'), 'completeFamilyWish must roll back inventory on failure')
assert(completeBlock.includes('const warehouseSnapshot = warehouseStore.serialize()'), 'completeFamilyWish must snapshot warehouse before consuming')
assert(completeBlock.includes('warehouseStore.deserialize(warehouseSnapshot)'), 'completeFamilyWish must roll back warehouse on failure')
assert(
  completeBlock.indexOf('consumeFamilyWishItemRequirements(wishDef)') >= 0 &&
  completeBlock.indexOf('grantRelationshipReward') >= 0 &&
  completeBlock.indexOf('consumeFamilyWishItemRequirements(wishDef)') < completeBlock.indexOf('grantRelationshipReward'),
  'family wish must consume items before granting rewards'
)
assert(npcStoreSource.includes('进度已满，但还缺'), 'weekly auto settlement must log concrete missing materials')

const cottageSource = read('src/views/game/CottageView.vue')
assert(cottageSource.includes('data-testid="cottage-family-wish-panel"'), 'CottageView missing family wish panel')
assert(cottageSource.includes('data-testid="cottage-family-wish-requirements"'), 'CottageView missing active requirements block')
assert(cottageSource.includes('data-testid="cottage-family-wish-requirement-row"'), 'CottageView missing requirement rows')
assert(cottageSource.includes('data-testid="cottage-family-wish-next-requirements"'), 'CottageView missing next wish requirement preview')
assert(cottageSource.includes('familyWishRequirementRows'), 'CottageView must read requirement inventory status')
assert(cottageSource.includes('familyWishCompletionBlockReason'), 'CottageView must show completion block reason')
assert(cottageSource.includes('row.sourceHint'), 'CottageView must show requirement source hints')
assert(cottageSource.includes('npcStore.completeFamilyWish(wishId)'), 'CottageView complete button must call completeFamilyWish')
assert(cottageSource.includes('activateNextFamilyWishForCurrentDay'), 'CottageView must keep wish activation entry')

const itemLinkageSource = read('src/data/itemLinkage.ts')
const mixedOilBlock = getObjectBlock(itemLinkageSource, "itemId: 'mixed_seed_oil'")
assert(mixedOilBlock.includes("'familyWish'"), 'mixed_seed_oil linkage must include familyWish')
assert(mixedOilBlock.includes('repeatableSinks') && mixedOilBlock.includes("'familyWish'"), 'mixed_seed_oil repeatable sinks must include familyWish')
const manorEdgeBlock = getObjectBlock(itemLinkageSource, "itemId: 'manor_edge_bundle'")
assert(manorEdgeBlock.includes('currentUseSystems') && manorEdgeBlock.includes("'familyWish'"), 'manor_edge_bundle current uses must include familyWish')
assert(manorEdgeBlock.includes('repeatableSinks') && manorEdgeBlock.includes("'familyWish'"), 'manor_edge_bundle repeatable sinks must include familyWish')

if (errors.length > 0) {
  console.error('qa-family-wish-consumption failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`qa-family-wish-consumption passed (${allWishBlocks.length} wishes, atomic consumption, Cottage UI).`)
