import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readSource = relativePath => readFileSync(resolve(root, relativePath), 'utf8')

const fishPondStore = readSource('src/stores/useFishPondStore.ts')
const fishPondView = readSource('src/views/game/FishPondView.vue')
const inventoryStore = readSource('src/stores/useInventoryStore.ts')
const itemTypes = readSource('src/types/item.ts')

assert.match(
  fishPondStore,
  /const recipe = findBreedByParents\(parentA\.breedId, parentB\.breedId\)[\s\S]*childBreedId = recipe\.breedId/,
  'Fishpond breeding should keep exact breed recipes as the only upgrade path.'
)
assert.match(
  fishPondStore,
  /const parentGen = Math\.min\(parentABreed\?\.generation \?\? 1, parentBBreed\?\.generation \?\? 1\)[\s\S]*const sameGenBreeds = getBreedsByGeneration\(parentGen\)/,
  'Fishpond non-recipe breeding should remain same-generation inheritance instead of silently promising upgrades.'
)
assert.match(
  fishPondStore,
  /generationScore \* 0\.24[\s\S]*generationScore \* 0\.1/,
  'Fishpond generation should keep affecting show and food rating values.'
)
assert.match(
  fishPondStore,
  /if \(options\.generationMin && getFishBreedGeneration\(fish\) < options\.generationMin\) return false/,
  'Fishpond generation should keep gating pond order submissions.'
)

assert.match(fishPondView, /getFishGenerationLabel\(fish\)/, 'Fish list should show each pond fish generation.')
assert.match(fishPondView, /data-testid="fishpond-breeding-preview"/, 'Fish detail should expose a selected-pair breeding preview.')
assert.match(fishPondView, /findBreedByParents/, 'Breeding preview should use the same recipe lookup as the store.')
assert.match(fishPondView, /可升代/, 'Breeding preview should explicitly label upgrade pairings.')
assert.match(fishPondView, /保代滚基因/, 'Breeding preview should explicitly label non-upgrade pairings.')
assert.match(fishPondView, /升代取决于品系配方/, 'Empty breeding state should not imply every same-species pair upgrades generation.')
assert.match(fishPondView, /inventoryStore\.getUnlockedItemCount\(def\.fishId\)/, 'Fishpond stocking list should only count fish slots that can actually be consumed.')

assert.match(itemTypes, /export interface InventoryPondFishMeta/, 'Inventory items should persist fishpond individual metadata.')
assert.match(itemTypes, /pondFish\?: InventoryPondFishMeta/, 'InventoryItem should be able to carry one returned pond fish.')
assert.match(inventoryStore, /'pondFish'/, 'Inventory stack metadata should include pondFish.')
assert.match(inventoryStore, /getInventoryPondFishStackKey\(leftMeta\.pondFish\) === getInventoryPondFishStackKey\(rightMeta\.pondFish\)/, 'Returned pond fish should not merge with unrelated fish stacks.')
assert.match(inventoryStore, /if \(normalizedMeta\.pondFish\?\.fishId !== itemId\)[\s\S]*delete normalizedMeta\.pondFish/, 'Inventory should drop mismatched pondFish metadata.')
assert.doesNotMatch(fishPondStore, /returnedFishPool/, 'Fishpond should not keep detached returned-fish state after fish leave inventory.')
assert.match(fishPondStore, /buildInventoryPondFishMeta\(fish\)/, 'Removing a pond fish should attach its individual state to the inventory slot.')
assert.match(fishPondStore, /removeUnlockedItemAtIndex\(slotIndex, 1\)/, 'Adding fish to the pond should consume the exact selected inventory slot.')
assert.match(fishPondStore, /removed\.pondFish\?\.fishId === fishId \? removed\.pondFish : null/, 'Adding fish to the pond should restore metadata only from the consumed slot.')
