/* global console, process */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import ts from 'typescript'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const srcRoot = path.join(projectRoot, 'src')

const readSource = (...segments) => fs.readFileSync(path.join(srcRoot, ...segments), 'utf8')

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
      // keep trying
    }
  }
  return null
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const resolved = tryResolveFile(path.join(srcRoot, specifier.slice(2)))
      if (!resolved) throw new Error(`Unable to resolve module: ${specifier}`)
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

const combinedInventorySource = readSource('composables', 'useCombinedInventory.ts')
assert.match(combinedInventorySource, /normalizeCombinedItemRequirements/, 'combined inventory should aggregate duplicate material requirements')
assert.match(combinedInventorySource, /export const removeCombinedItems/, 'combined inventory should expose atomic grouped removal')
assert.match(combinedInventorySource, /const inventorySnapshot = inv\.serialize\(\)/, 'grouped removal should snapshot inventory')
assert.match(combinedInventorySource, /const warehouseSnapshot = wh\.serialize\(\)/, 'grouped removal should snapshot warehouse')

const processingSource = readSource('stores', 'useProcessingStore.ts')
assert.match(processingSource, /return hasCombinedItems\(craftCost\)/, 'processing craft checks should aggregate material costs')
assert.match(processingSource, /removeCombinedItems\(craftCost\)/, 'processing craft should consume grouped material costs')
assert.match(processingSource, /removeCombinedItems\(materialPlan\.entries\)/, 'alchemy processing should consume resolved materials as a group')
assert.match(processingSource, /hasCombinedItems\(recipe\.extraInputs\)/, 'processing extra inputs should be checked as a group')
assert.match(processingSource, /removeCombinedItems\(recipe\.extraInputs\)/, 'processing extra inputs should be consumed as a group')

const regionMapSource = readSource('stores', 'useRegionMapStore.ts')
assert.match(regionMapSource, /normalizeJourneyRequiredItems/, 'journey crafting should aggregate required items')
assert.match(regionMapSource, /removeJourneyRequiredItems\(recipe\.requiredItems\)/, 'journey crafting should consume grouped required items')

const toolUpgradeSource = readSource('views', 'game', 'ToolUpgradeView.vue')
assert.match(toolUpgradeSource, /removeCombinedItems\(cost\.materials\)/, 'tool upgrades should consume grouped materials')
assert.match(toolUpgradeSource, /inventoryStore\.startUpgrade\(type, cost\.toTier\)/, 'normal tool upgrade should verify queue creation')
assert.match(toolUpgradeSource, /inventoryStore\.upgradeTool\(type\)/, 'rush tool upgrade should verify immediate upgrade')

const breedingViewSource = readSource('views', 'game', 'BreedingView.vue')
assert.match(breedingViewSource, /materials => removeCombinedItems\(materials\)/, 'breeding upgrades should consume grouped materials')

const homeViewSource = readSource('views', 'game', 'HomeView.vue')
assert.match(homeViewSource, /removeCombinedItems\(WAREHOUSE_UNLOCK_MATERIALS\)/, 'warehouse unlock should consume grouped materials')
assert.match(homeViewSource, /playerStore\.earnMoney\(warehouseStore\.UNLOCK_COST, \{ countAsEarned: false \}\)/, 'warehouse unlock should refund money if material consumption fails')

const processingViewSource = readSource('views', 'game', 'ProcessingView.vue')
assert.match(processingViewSource, /removeCombinedItems\(JADE_RING_COST\)/, 'jade ring crafting should consume grouped materials')
assert.match(processingViewSource, /warehouseStore\.deserialize\(warehouseSnapshot\)/, 'jade ring crafting should restore warehouse materials on rollback')

const inventoryStoreSource = readSource('stores', 'useInventoryStore.ts')
assert.match(inventoryStoreSource, /removeItemsWithRollback/, 'equipment crafting should have grouped rollback removal')
assert.match(inventoryStoreSource, /const recipe = normalizeItemRequirements\(def\.recipe\)/, 'equipment crafting should aggregate duplicate recipe items')

const farmViewSource = readSource('views', 'game', 'FarmView.vue')
assert.match(farmViewSource, /if \(farmStore\.greenhousePlantCrop\(plot\.id, cropId\)\) \{\s*planted\+\+/s, 'greenhouse batch planting should only count successful plant calls')
assert.match(farmViewSource, /playerStore\.restoreStamina\(cost\)\s*inventoryStore\.addItem\(crop\.seedId\)/s, 'greenhouse batch planting should refund failed plant attempts')

const farmActionsSource = readSource('composables', 'useFarmActions.ts')
assert.match(farmActionsSource, /if \(farmStore\.plantCrop\(plot\.id, cropDef\.id\)\) \{\s*planted\+\+/s, 'field batch planting should only count successful plant calls')
assert.match(farmActionsSource, /playerStore\.restoreStamina\(cost\)\s*inventoryStore\.addItem\(cropDef\.seedId\)/s, 'field batch planting should refund failed plant attempts')

const fishingViewSource = readSource('views', 'game', 'FishingView.vue')
assert.match(
  fishingViewSource,
  /const PAN_BASE_QUANTITY_BY_TIER: Record<ToolTier, number> = \{\s*basic: 2,\s*iron: 3,\s*steel: 3,\s*iridium: 4\s*\}/,
  'rain-gated panning should pay at least two resources and scale with pan tier'
)
assert.match(fishingViewSource, /let qty = baseQuantity/, 'panning rewards should start from tier-based base quantity')
assert.match(
  fishingViewSource,
  /qty \+= Math\.random\(\) < fishingStore\.environmentWindow\.fishing\.panBonusChance \? 1 : 0/,
  'panning rewards should apply the active weather window pan bonus chance'
)
assert.match(fishingViewSource, /const rewardLabel = `\$\{name\}×\$\{qty\}`/, 'panning logs should show reward quantity')
assert.doesNotMatch(fishingViewSource, /淘金获得了\$\{name\}/, 'panning logs should not hide multi-item quantities')

const processing = await import(pathToFileURL(path.join(srcRoot, 'data', 'processing.ts')).href)
const journeyHub = await import(pathToFileURL(path.join(srcRoot, 'data', 'journeyHub.ts')).href)
const upgrades = await import(pathToFileURL(path.join(srcRoot, 'data', 'upgrades.ts')).href)
const rings = await import(pathToFileURL(path.join(srcRoot, 'data', 'rings.ts')).href)
const hats = await import(pathToFileURL(path.join(srcRoot, 'data', 'hats.ts')).href)
const shoes = await import(pathToFileURL(path.join(srcRoot, 'data', 'shoes.ts')).href)
const buildings = await import(pathToFileURL(path.join(srcRoot, 'data', 'buildings.ts')).href)
const homeRenovations = await import(pathToFileURL(path.join(srcRoot, 'data', 'homeRenovations.ts')).href)
const animals = await import(pathToFileURL(path.join(srcRoot, 'data', 'animals.ts')).href)
const fishPond = await import(pathToFileURL(path.join(srcRoot, 'data', 'fishPond.ts')).href)
const breeding = await import(pathToFileURL(path.join(srcRoot, 'data', 'breeding.ts')).href)

const duplicateMaterialIssues = []

const checkDuplicateItems = (label, id, entries = []) => {
  const counts = new Map()
  for (const entry of entries) {
    if (!entry?.itemId) continue
    counts.set(entry.itemId, (counts.get(entry.itemId) ?? 0) + 1)
  }
  for (const [itemId, count] of counts) {
    if (count > 1) duplicateMaterialIssues.push(`${label}:${id}:${itemId} x${count}`)
  }
}

for (const recipe of processing.PROCESSING_RECIPES) {
  checkDuplicateItems('processing.extraInputs', recipe.id, recipe.extraInputs ?? [])
  assert.ok(
    !recipe.inputItemId || !(recipe.extraInputs ?? []).some(extra => extra.itemId === recipe.inputItemId),
    `processing recipe ${recipe.id} should not reuse the main input as an extra input`
  )
}
for (const machine of processing.PROCESSING_MACHINES) checkDuplicateItems('processing.machine', machine.id, machine.craftCost)
for (const recipe of journeyHub.JOURNEY_CRAFTING_RECIPES) checkDuplicateItems('journey.requiredItems', recipe.id, recipe.requiredItems)
for (const [toolType, costs] of Object.entries(upgrades.TOOL_UPGRADE_COSTS)) {
  for (const cost of costs) checkDuplicateItems('tool.materials', `${toolType}:${cost.fromTier}->${cost.toTier}`, cost.materials)
}
for (const def of rings.RINGS) checkDuplicateItems('ring.recipe', def.id, def.recipe ?? [])
for (const def of hats.HATS) checkDuplicateItems('hat.recipe', def.id, def.recipe ?? [])
for (const def of shoes.SHOES) checkDuplicateItems('shoe.recipe', def.id, def.recipe ?? [])
for (const upgrade of buildings.FARMHOUSE_UPGRADES) checkDuplicateItems('farmhouse.materialCost', upgrade.level, upgrade.materialCost)
checkDuplicateItems('greenhouse.unlock', 'unlock', buildings.GREENHOUSE_MATERIAL_COST)
checkDuplicateItems('warehouse.unlock', 'unlock', buildings.WAREHOUSE_UNLOCK_MATERIALS)
for (const upgrade of buildings.GREENHOUSE_UPGRADES) checkDuplicateItems('greenhouse.upgrade', upgrade.level, upgrade.materialCost)
for (const renovation of homeRenovations.HOME_RENOVATIONS) checkDuplicateItems('home.renovation', renovation.id, renovation.materialCost)
for (const building of animals.ANIMAL_BUILDINGS) checkDuplicateItems('animal.build', building.type, building.materialCost)
for (const upgrade of animals.BUILDING_UPGRADES) checkDuplicateItems('animal.upgrade', `${upgrade.type}:${upgrade.level}`, upgrade.materialCost)
checkDuplicateItems('pond.build', 'build', fishPond.POND_BUILD_COST.materials)
for (const [level, cost] of Object.entries(fishPond.POND_UPGRADE_COSTS)) checkDuplicateItems('pond.upgrade', level, cost.materials)
checkDuplicateItems('breeding.station', 'station', breeding.BREEDING_STATION_COST.materials)
for (const upgrade of breeding.BREEDING_RESEARCH_UPGRADES) checkDuplicateItems('breeding.research', upgrade.level, upgrade.materials)
for (const upgrade of breeding.SEED_BOX_UPGRADES) checkDuplicateItems('breeding.seedBox', upgrade.level, upgrade.materials)

assert.deepEqual(duplicateMaterialIssues, [], `duplicate material entries found:\n${duplicateMaterialIssues.join('\n')}`)

console.log('qa-resource-consumption-guards passed')
