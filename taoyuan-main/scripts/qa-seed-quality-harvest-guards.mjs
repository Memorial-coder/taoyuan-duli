/* global console, process */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const readSource = (...parts) => fs.readFileSync(path.join(projectRoot, ...parts), 'utf8')

const errors = []
const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const countOccurrences = (source, needle) => source.split(needle).length - 1

const farmTypesSource = readSource('src', 'types', 'farm.ts')
const farmStoreSource = readSource('src', 'stores', 'useFarmStore.ts')
const farmActionsSource = readSource('src', 'composables', 'useFarmActions.ts')
const farmHarvestSource = readSource('src', 'composables', 'useFarmHarvest.ts')
const farmViewSource = readSource('src', 'views', 'game', 'FarmView.vue')
const saveStoreSource = readSource('src', 'stores', 'useSaveStore.ts')
const sampleSavesSource = readSource('src', 'data', 'sampleSaves.ts')

assert(farmTypesSource.includes("import type { Quality } from './item'"), 'FarmPlot type must import Quality.')
assert(farmTypesSource.includes('seedQuality: Quality | null'), 'FarmPlot must persist seedQuality.')

assert(
  farmStoreSource.includes('const plantCrop = (plotId: number, cropId: string, seedQuality: Quality | null = null): boolean => {') &&
    farmStoreSource.includes('plot.seedQuality = seedQuality'),
  'field planting must accept and store seedQuality.'
)
assert(
  farmStoreSource.includes('const greenhousePlantCrop = (plotId: number, cropId: string, seedQuality: Quality | null = null): boolean => {') &&
    farmStoreSource.includes('plot.seedQuality = seedQuality'),
  'greenhouse planting must accept and store seedQuality.'
)
assert(countOccurrences(farmStoreSource, 'seedQuality: null') >= 3, 'default farm and greenhouse plot creation must initialize seedQuality.')
assert(countOccurrences(farmStoreSource, 'plot.seedQuality = null') >= 4, 'harvest/remove/genetic planting paths must clear seedQuality.')
assert(farmStoreSource.includes('seedQuality: (p as any).seedQuality ?? null'), 'field plot deserialization must migrate missing seedQuality.')
assert(farmStoreSource.includes('seedQuality: p.seedQuality ?? null'), 'greenhouse plot deserialization must migrate missing seedQuality.')

assert(farmActionsSource.includes('fine: 0.06'), 'fine seed bonus must stay +0.06.')
assert(farmActionsSource.includes('excellent: 0.12'), 'excellent seed bonus must stay +0.12.')
assert(farmActionsSource.includes('supreme: 0.2'), 'supreme seed bonus must stay +0.20.')
assert(farmActionsSource.includes('export const getSeedQualityBonus'), 'seed quality bonus helper must be exported.')
assert(
  farmActionsSource.includes('farmStore.plantCrop(plotId, cropDef.id, plantQuality)') &&
    farmActionsSource.includes('farmStore.plantCrop(plot.id, cropDef.id, currentSeedQuality)'),
  'field single and batch planting must pass consumed seed quality to the farm store.'
)
assert(
  countOccurrences(farmActionsSource, '+ seedQualityBonus +') >= 2,
  'field harvest and batch harvest must add seed quality bonus to crop quality rolls.'
)
assert(
  farmActionsSource.includes('inventoryStore.addItem(cropDef.seedId, 1, currentSeedQuality)'),
  'field batch planting rollback must refund the consumed seed quality.'
)

assert(farmHarvestSource.includes("import { getSeedQualityBonus } from './useFarmActions'"), 'shared harvest composable must use seed quality bonus helper.')
assert(countOccurrences(farmHarvestSource, '+ seedQualityBonus +') >= 2, 'field and greenhouse harvest composables must add seed quality bonus.')

assert(farmViewSource.includes('@click="doBatchPlant(seed.cropId, seed.quality)"'), 'field batch plant UI must preserve selected seed quality.')
assert(farmViewSource.includes('QUALITY_ORDER.map(quality => ({'), 'greenhouse seed list must split stacks by seed quality.')
assert(farmViewSource.includes('@click="doGhPlant(seed.cropId, seed.quality)"'), 'greenhouse single planting UI must preserve selected seed quality.')
assert(farmViewSource.includes('@click="doGhBatchPlant(seed.cropId, seed.quality)"'), 'greenhouse batch planting UI must preserve selected seed quality.')
assert(farmViewSource.includes('farmStore.greenhousePlantCrop(activeGhPlotId.value, cropId, seedQuality)'), 'greenhouse single planting must pass seed quality.')
assert(farmViewSource.includes('farmStore.greenhousePlantCrop(plot.id, cropId, seedQuality)'), 'greenhouse batch planting must pass seed quality.')

assert(saveStoreSource.includes('seedQuality: null'), 'runtime reset save state must initialize seedQuality.')
assert(sampleSavesSource.includes('seedQuality: null'), 'sample saves must initialize seedQuality.')

if (errors.length > 0) {
  console.error('qa-seed-quality-harvest-guards failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-seed-quality-harvest-guards passed')
