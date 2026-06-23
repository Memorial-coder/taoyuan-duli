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
    `${candidate}.js`,
    path.join(candidate, 'index.ts'),
    path.join(candidate, 'index.js')
  ]
  for (const item of variants) {
    try {
      if (fs.statSync(item).isFile()) return item
    } catch {
      // try the next candidate
    }
  }
  return null
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const resolved = tryResolveFile(path.join(srcRoot, specifier.slice(2)))
      if (!resolved) throw new Error(`Cannot resolve module: ${specifier}`)
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

const {
  ITEMS,
  LINKAGE_DEMAND_POOL,
  PET_SPECIAL_FEEDS,
  getAvailablePetSpecialFeeds,
  getItemLinkageDef,
  getItemLinkageUseLabels,
  getItemLinkageUseTags
} = data

const packageJson = JSON.parse(read('package.json'))
assert(
  packageJson.scripts?.['qa:pet-feed-consumption'] === 'node scripts/qa-pet-feed-consumption.mjs',
  'package.json must register qa:pet-feed-consumption'
)

const manorEdgeItem = ITEMS.find(item => item.id === 'manor_edge_bundle')
assert(!!manorEdgeItem, 'manor_edge_bundle item must exist')

const manorEdgeFeed = PET_SPECIAL_FEEDS.find(feed => feed.id === 'manor_edge_pet_bowl')
assert(!!manorEdgeFeed, 'manor_edge_bundle must have a pet special feed entry')
assert(manorEdgeFeed?.itemId === 'manor_edge_bundle', 'manor_edge_pet_bowl must consume manor_edge_bundle')
assert(manorEdgeFeed?.taste === 'filling', 'manor_edge_pet_bowl should be a filling feed')
for (const petType of ['cat', 'dog', 'spirit']) {
  assert(manorEdgeFeed?.preferredPetTypes.includes(petType), `manor_edge_pet_bowl should support ${petType}`)
}
assert((manorEdgeFeed?.friendshipGain ?? 0) > 0, 'manor_edge_pet_bowl must grant a small friendship gain')
assert((manorEdgeFeed?.preferredBonus ?? 0) >= 0, 'manor_edge_pet_bowl preferred bonus must be non-negative')
assert((manorEdgeFeed?.rareFindChance ?? 1) <= 0.03, 'manor_edge_pet_bowl rare-find chance must stay low')
assert((manorEdgeFeed?.rareFindPool.length ?? 0) >= 1, 'manor_edge_pet_bowl must have a small rare-find pool')

const visibleFeeds = getAvailablePetSpecialFeeds(itemId => (itemId === 'manor_edge_bundle' ? 2 : 0))
assert(
  visibleFeeds.some(feed => feed.id === 'manor_edge_pet_bowl' && feed.count === 2),
  'manor_edge_pet_bowl must appear when manor_edge_bundle is available'
)
const hiddenFeeds = getAvailablePetSpecialFeeds(() => 0)
assert(
  !hiddenFeeds.some(feed => feed.id === 'manor_edge_pet_bowl'),
  'manor_edge_pet_bowl must not appear without inventory'
)

const demandEntry = LINKAGE_DEMAND_POOL.find(entry => entry.id === 'manor_edge_bundle_pet_feed')
assert(!!demandEntry, 'demand pool must include manor_edge_bundle_pet_feed')
assert(demandEntry?.itemId === 'manor_edge_bundle', 'pet feed demand must consume manor_edge_bundle')
assert(demandEntry?.systems.includes('petFeed'), 'pet feed demand must target petFeed')
assert(demandEntry?.tags.includes('pet_feed'), 'pet feed demand must carry pet_feed tag')
assert(demandEntry?.tags.includes('weak_item_sink'), 'pet feed demand must carry weak_item_sink tag')
assert(demandEntry?.repeatWindow === 'daily', 'pet feed demand must be daily limited')
assert((demandEntry?.minQuantity ?? 0) === 1, 'pet feed demand must consume one item')

const linkage = getItemLinkageDef('manor_edge_bundle')
assert(linkage?.currentUseSystems.includes('petFeed'), 'manor_edge_bundle linkage must include petFeed current use')
assert(linkage?.repeatableSinks.includes('petFeed'), 'manor_edge_bundle linkage must include petFeed repeatable sink')
assert(linkage?.demandTags.includes('pet_feed'), 'manor_edge_bundle linkage must carry pet_feed demand tag')
assert(getItemLinkageUseLabels('manor_edge_bundle').includes('宠物'), 'manor_edge_bundle usage labels must show pet feed')
assert(
  getItemLinkageUseTags('manor_edge_bundle').some(tag => tag.label === '宠物' && tag.panelKey === 'cottage'),
  'manor_edge_bundle pet usage tag must jump to the cottage/pet route'
)

const animalStoreSource = read('src/stores/useAnimalStore.ts')
const feedPetSpecialStart = animalStoreSource.indexOf('const feedPetSpecial')
const feedPetSpecialEnd = animalStoreSource.indexOf('/** 每日宠物更新 */', feedPetSpecialStart)
const feedPetSpecialBlock = feedPetSpecialStart >= 0 && feedPetSpecialEnd > feedPetSpecialStart
  ? animalStoreSource.slice(feedPetSpecialStart, feedPetSpecialEnd)
  : ''
assert(feedPetSpecialBlock.includes('clearStalePetSpecialFeed(companion, dayTag)'), 'pet feed must clear stale daily feed state')
assert(feedPetSpecialBlock.includes('if (companion.specialFedToday)'), 'pet feed must enforce daily limit before consumption')
assert(feedPetSpecialBlock.includes('getCombinedItemCount(feed.itemId)'), 'pet feed availability must read combined inventory')
assert(feedPetSpecialBlock.includes('removeCombinedItem(feed.itemId, 1)'), 'pet feed must remove exactly one real item')
assert(feedPetSpecialBlock.includes('companion.specialFedToday = true'), 'successful pet feed must mark daily state')
assert(feedPetSpecialBlock.includes('companion.specialFeedItemId = feed.itemId'), 'successful pet feed must record consumed item')
assert(feedPetSpecialBlock.includes('companion.specialFeedDayTag = dayTag'), 'successful pet feed must record the day tag')
assert(feedPetSpecialBlock.includes('recordPetMilestones(companion, previousFriendship)'), 'pet feed must still route friendship milestones')
assert(
  feedPetSpecialBlock.indexOf('if (companion.specialFedToday)') >= 0 &&
    feedPetSpecialBlock.indexOf('removeCombinedItem(feed.itemId, 1)') >= 0 &&
    feedPetSpecialBlock.indexOf('if (companion.specialFedToday)') < feedPetSpecialBlock.indexOf('removeCombinedItem(feed.itemId, 1)'),
  'daily pet feed limit must be checked before item removal'
)
assert(
  feedPetSpecialBlock.indexOf('removeCombinedItem(feed.itemId, 1)') >= 0 &&
    feedPetSpecialBlock.indexOf('companion.specialFedToday = true') >= 0 &&
    feedPetSpecialBlock.indexOf('removeCombinedItem(feed.itemId, 1)') < feedPetSpecialBlock.indexOf('companion.specialFedToday = true'),
  'pet feed must remove the item before success state changes'
)

const animalViewSource = read('src/views/game/AnimalView.vue')
assert(animalViewSource.includes('petSpecialFeedOptions.length > 0'), 'pet feed UI must hide options when no feed is available')
assert(animalViewSource.includes('v-for="feed in petSpecialFeedOptions"'), 'pet feed UI must render available feed options')
assert(animalViewSource.includes(':data-testid="`pet-special-feed-${companion.id}-${feed.id}`"'), 'pet feed UI must expose stable feed test ids')
assert(animalViewSource.includes(':disabled="isPetSpecialFedToday(companion)"'), 'pet feed UI must respect the daily limit')
assert(animalViewSource.includes('@click="handleFeedPetSpecial(companion.id, feed.id)"'), 'pet feed UI must call the pet feed action')
assert(animalViewSource.includes('animalStore.feedPetSpecial(petId, feedId)'), 'pet feed handler must call the store action')
assert(animalViewSource.includes('addLog(result.message)'), 'pet feed handler must log success/failure feedback')

if (errors.length > 0) {
  console.error('qa-pet-feed-consumption failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-pet-feed-consumption passed (manor_edge_bundle pet feed visibility, daily limit, real consumption).')
