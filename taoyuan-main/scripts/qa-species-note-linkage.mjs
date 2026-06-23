/* global console, process */
import fs from 'node:fs'
import path from 'node:path'
import { registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const srcRoot = path.join(projectRoot, 'src')

const resolveSourceFile = candidate => {
  const candidates = [candidate, `${candidate}.ts`, `${candidate}.tsx`, `${candidate}.js`, `${candidate}.mjs`]
  for (const filePath of candidates) {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) return pathToFileURL(filePath).href
  }
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    for (const indexName of ['index.ts', 'index.tsx', 'index.js', 'index.mjs']) {
      const indexPath = path.join(candidate, indexName)
      if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) return pathToFileURL(indexPath).href
    }
  }
  return null
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const resolved = resolveSourceFile(path.join(srcRoot, specifier.slice(2)))
      if (resolved) return { url: resolved, shortCircuit: true }
    }
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      const parentPath = fileURLToPath(context.parentURL)
      const resolved = resolveSourceFile(path.resolve(path.dirname(parentPath), specifier))
      if (resolved) return { url: resolved, shortCircuit: true }
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

const errors = []
const assert = (condition, message) => {
  if (!condition) errors.push(message)
}
const readSource = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

const packageJson = JSON.parse(readSource('package.json'))
const speciesNotesSource = readSource('src/data/speciesNotes.ts')
const fishPondStoreSource = readSource('src/stores/useFishPondStore.ts')
const museumStoreSource = readSource('src/stores/useMuseumStore.ts')
const fishPondViewSource = readSource('src/views/game/FishPondView.vue')
const museumViewSource = readSource('src/views/game/MuseumView.vue')

const {
  SPECIES_NOTE_DEFS,
  buildSpeciesNoteOverview,
  SPECIES_NOTE_TOTAL_POND_BREED_COUNT,
  SPECIES_NOTE_TOTAL_BREEDING_HYBRID_COUNT
} = await import(pathToFileURL(path.join(srcRoot, 'data/speciesNotes.ts')).href)

const expectedIds = [
  'breeding_lineage_notes',
  'fishpond_breed_notes',
  'region_ecology_notes',
  'quarry_relic_notes',
  'museum_showcase_notes'
]
assert(Array.isArray(SPECIES_NOTE_DEFS) && SPECIES_NOTE_DEFS.length === expectedIds.length, 'SPECIES_NOTE_DEFS must define the five first-pass species notes.')
for (const id of expectedIds) {
  assert(SPECIES_NOTE_DEFS.some(def => def.id === id), `SPECIES_NOTE_DEFS must include ${id}.`)
}
for (const token of [
  'HYBRID_DEFS',
  'POND_BREEDS',
  'QUARRY_MUSEUM_ARTIFACT_ITEM_IDS',
  'MUSEUM_EXHIBIT_SETS',
  'buildSpeciesNoteOverview',
  'orderBiasScore',
  'museumExhibitSetIds'
]) {
  assert(speciesNotesSource.includes(token), `speciesNotes.ts must include ${token}.`)
}
assert(SPECIES_NOTE_TOTAL_POND_BREED_COUNT > 0, 'Species note data must expose total pond breed count.')
assert(SPECIES_NOTE_TOTAL_BREEDING_HYBRID_COUNT > 0, 'Species note data must expose total breeding hybrid count.')

const emptyOverview = buildSpeciesNoteOverview()
assert(emptyOverview.completedCount === 0, 'Empty species note overview should not mark notes complete.')
assert(emptyOverview.totalCount === expectedIds.length, 'Species note overview totalCount should match definitions.')
assert(emptyOverview.nextEntry?.id === expectedIds[0], 'Empty species note overview should point to the first incomplete note.')
assert(emptyOverview.entries.every(entry => entry.progress === 0 && entry.progressLabel.startsWith('0/')), 'Empty species note overview should show zero progress.')

const fullInput = {
  breedingHybridIds: Array.from({ length: 20 }, (_, index) => `hybrid_${index}`),
  pondBreedIds: Array.from({ length: 30 }, (_, index) => `pond_${index}`),
  completedRegionIds: ['ancient_road', 'mirage_marsh', 'cloud_highland'],
  discoveredQuarryArtifactItemIds: ['trilobite_fossil', 'ancient_pottery', 'ancient_tablet', 'bronze_mirror'],
  completedMuseumExhibitSetIds: ['local_flavor_showcase', 'deep_vein_quarry_showcase', 'fishpond_species_showcase']
}
const fullOverview = buildSpeciesNoteOverview(fullInput)
assert(fullOverview.entries.every(entry => entry.completed), 'Full species note overview should complete every first-pass note.')
assert(fullOverview.entries.every(entry => entry.progress <= entry.target), 'Species note progress must be clamped to target.')
assert(fullOverview.nextEntry === null, 'Completed species note overview should not expose a nextEntry.')
assert(fullOverview.orderBiasScore >= 3, 'Completed species notes should contribute bounded order-bias score.')
assert(fullOverview.museumExhibitSetIds.includes('fishpond_species_showcase'), 'Species notes should point back to museum exhibit set ids.')

const duplicateOverview = buildSpeciesNoteOverview({
  breedingHybridIds: ['same', 'same'],
  pondBreedIds: ['same', 'same']
})
assert(
  duplicateOverview.entries.find(entry => entry.id === 'breeding_lineage_notes')?.progress === 1,
  'Species note breeding progress should count unique hybrid ids.'
)
assert(
  duplicateOverview.entries.find(entry => entry.id === 'fishpond_breed_notes')?.progress === 1,
  'Species note fishpond progress should count unique pond breed ids.'
)

for (const token of [
  'buildSpeciesNoteOverview',
  'speciesNoteOverview',
  'pondBreedIds: [...discoveredBreeds.value]',
  'speciesNoteOverview,'
]) {
  assert(fishPondStoreSource.includes(token), `Fish pond store must include ${token}.`)
}
const fishPondSpeciesSegmentStart = fishPondStoreSource.indexOf('const speciesNoteOverview = computed')
const fishPondSpeciesSegmentEnd = fishPondStoreSource.indexOf('const pruneDisplayEntries')
const fishPondSpeciesSegment = fishPondSpeciesSegmentStart >= 0 && fishPondSpeciesSegmentEnd > fishPondSpeciesSegmentStart
  ? fishPondStoreSource.slice(fishPondSpeciesSegmentStart, fishPondSpeciesSegmentEnd)
  : ''
assert(fishPondSpeciesSegment.length > 0, 'Fish pond species note computed segment must be detectable.')
for (const forbidden of ['removeFish(', 'removeItem(', 'removeItemAnywhere', 'submitEligibleFishForOrder', 'collectProducts(']) {
  assert(!fishPondSpeciesSegment.includes(forbidden), `Fish pond species notes must not consume or remove rewards via ${forbidden}.`)
}

for (const token of [
  'buildSpeciesNoteOverview',
  'QUARRY_MUSEUM_ARTIFACT_ITEM_IDS',
  'useBreedingStore',
  'useFishPondStore',
  'SPECIES_NOTE_REGION_IDS',
  'breedingStore.compendium.map(entry => entry.hybridId)',
  'pondBreedIds: [...fishPondStore.discoveredBreeds]',
  'regionMapStore.getRegionCompletedRouteCount(regionId)',
  'QUARRY_MUSEUM_ARTIFACT_ITEM_IDS.filter(itemId => isDonated(itemId))',
  'completedMuseumExhibitSetIds: exhibitSetOverview.value.filter(set => set.completed).map(set => set.id)',
  'speciesNotes: speciesNoteOverview.value',
  'speciesNoteOverview,'
]) {
  assert(museumStoreSource.includes(token), `Museum store must include ${token}.`)
}
const museumSpeciesSegmentStart = museumStoreSource.indexOf('const speciesNoteOverview = computed')
const museumSpeciesSegmentEnd = museumStoreSource.indexOf('const getCurrentDayTag')
const museumSpeciesSegment = museumSpeciesSegmentStart >= 0 && museumSpeciesSegmentEnd > museumSpeciesSegmentStart
  ? museumStoreSource.slice(museumSpeciesSegmentStart, museumSpeciesSegmentEnd)
  : ''
assert(museumSpeciesSegment.length > 0, 'Museum species note computed segment must be detectable.')
for (const forbidden of ['removeItem(', 'removeItemAnywhere', 'donatedItems.value.push', 'submitMuseumExhibitSetItem(']) {
  assert(!museumSpeciesSegment.includes(forbidden), `Museum species notes must not consume or mutate rewards via ${forbidden}.`)
}

for (const token of [
  'data-testid="fishpond-species-note-panel"',
  'data-testid="fishpond-species-note-entry"',
  'fishPondSpeciesNoteEntries',
  'getSpeciesNoteProgressPercent(entry.progress, entry.target)'
]) {
  assert(fishPondViewSource.includes(token), `FishPondView must include ${token}.`)
}
for (const token of [
  'data-testid="museum-species-note-panel"',
  'data-testid="museum-species-note-entry"',
  'museumStore.speciesNoteOverview.entries',
  'museumStore.speciesNoteOverview.orderBiasScore',
  'getSpeciesNoteSourceLabel',
  'getSpeciesNoteRewardLabel'
]) {
  assert(museumViewSource.includes(token), `MuseumView must include ${token}.`)
}

assert(
  packageJson.scripts?.['qa:species-note-linkage'] === 'node scripts/qa-species-note-linkage.mjs',
  'package.json must register qa:species-note-linkage.'
)

if (errors.length > 0) {
  console.error(`qa-species-note-linkage failed (${errors.length})`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-species-note-linkage passed')
