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

const errors = []
const assert = (condition, message) => {
  if (!condition) errors.push(message)
}
const readSource = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

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

const packageJson = JSON.parse(readSource('package.json'))
const linkageDemandSource = readSource('src/data/linkageDemandPools.ts')
const regionStoreSource = readSource('src/stores/useRegionMapStore.ts')
const regionResourcePanelSource = readSource('src/components/game/regionMap/RegionResourcePrepPanel.vue')
const regionViewSource = readSource('src/views/game/RegionMapView.vue')

const { getItemById } = await import(pathToFileURL(path.join(srcRoot, 'data/items.ts')).href)
const { getRegionResourceTurnInDemandEntries } = await import(pathToFileURL(path.join(srcRoot, 'data/linkageDemandPools.ts')).href)

const entries = getRegionResourceTurnInDemandEntries()
const requiredEntries = [
  ['ancient_archive_region_turn_in_waybill', 'ancient_waybill', 'ancient_archive'],
  ['ecology_specimen_region_turn_in_algae', 'luminous_algae', 'ecology_specimen'],
  ['ley_crystal_region_turn_in_shard', 'ley_crystal_shard', 'ley_crystal']
]

assert(entries.length >= 3, 'Region map demand pool must expose at least three public turn-in entries.')

for (const [entryId, itemId, familyTag] of requiredEntries) {
  const entry = entries.find(candidate => candidate.id === entryId)
  assert(entry, `Region resource demand pool is missing ${entryId}.`)
  assert(entry?.itemId === itemId, `${entryId} must consume ${itemId}.`)
  assert(entry?.systems.includes('regionMap'), `${entryId} must be registered for regionMap.`)
  assert(entry?.tags.includes('region_resource_turn_in'), `${entryId} must use the region_resource_turn_in tag.`)
  assert(entry?.tags.includes(familyTag), `${entryId} must include the ${familyTag} family tag.`)
  assert(entry?.minQuantity === 1 && entry?.maxQuantity === 1, `${entryId} must consume exactly one item per turn-in.`)
  assert(getItemById(itemId), `${itemId} must exist in item data.`)
}

for (const token of [
  'getRegionResourceTurnInDemandEntries',
  'REGION_RESOURCE_TURN_IN_DEMAND_IDS',
  'buildResourceTurnInRequirementPreview',
  'turnInRequirement',
  'turnInAvailable',
  'getTotalItemCount(demand.itemId)',
  'inventoryStore.serialize()',
  'const previousLedger = saveData.value.resourceLedger[familyId]',
  'consumeFamilyResources(familyId, normalized)',
  'removeItemAnywhere(requirement.itemId, requirement.required)',
  'inventoryStore.deserialize(inventorySnapshot)',
  'region_resource_turn_in_sink',
  'consumedItems'
]) {
  assert(regionStoreSource.includes(token), `Region map store must include ${token}.`)
}

assert(
  /const recordResourceTurnIn = \(familyId: RegionalResourceFamilyId, amount = 1\): RegionResourceTurnInResult/.test(regionStoreSource),
  'recordResourceTurnIn must return a structured result.'
)
assert(
  regionStoreSource.indexOf('consumeFamilyResources(familyId, normalized)') <
    regionStoreSource.indexOf('removeItemAnywhere(requirement.itemId, requirement.required)'),
  'recordResourceTurnIn must consume family ledger and real inventory items in one transaction.'
)

for (const token of [
  'data-testid="region-resource-turn-in-demand"',
  'entry.turnInRequirement.itemId',
  'entry.turnInRequirement.owned',
  'entry.turnInRequirement.required',
  'entry.turnInRequirement.sourceHint',
  '!entry.turnInAvailable'
]) {
  assert(regionResourcePanelSource.includes(token), `Region resource panel must include ${token}.`)
}

for (const token of [
  'const result = regionMapStore.recordResourceTurnIn(familyId, 1)',
  'result.consumedItems',
  'result.success ? successMessage : failureMessage'
]) {
  assert(regionViewSource.includes(token), `Region map view must include ${token}.`)
}
assert(!/const ok = regionMapStore\.recordResourceTurnIn/.test(regionViewSource), 'Region map view must not treat recordResourceTurnIn as a boolean.')

assert(
  packageJson.scripts?.['qa:region-demand-pool-sinks'] === 'node scripts/qa-region-demand-pool-sinks.mjs',
  'package.json must register qa:region-demand-pool-sinks.'
)
assert(
  linkageDemandSource.includes('getRegionResourceTurnInDemandEntries'),
  'linkage demand pool must export getRegionResourceTurnInDemandEntries.'
)

if (errors.length > 0) {
  console.error(`qa-region-demand-pool-sinks failed (${errors.length})`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`qa-region-demand-pool-sinks passed (${entries.length} region turn-in entries).`)
