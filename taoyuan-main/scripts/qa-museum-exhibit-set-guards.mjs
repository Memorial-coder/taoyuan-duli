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
const museumSource = readSource('src/data/museum.ts')
const museumTypeSource = readSource('src/types/museum.ts')
const museumStoreSource = readSource('src/stores/useMuseumStore.ts')
const museumViewSource = readSource('src/views/game/MuseumView.vue')

const { MUSEUM_EXHIBIT_SETS, createDefaultMuseumSaveData, normalizeMuseumSaveData } = await import(pathToFileURL(path.join(srcRoot, 'data/museum.ts')).href)
const { getItemById } = await import(pathToFileURL(path.join(srcRoot, 'data/items.ts')).href)

const expectedSetIds = [
  'local_flavor_showcase',
  'deep_vein_quarry_showcase',
  'fishpond_species_showcase',
  'spirit_offering_showcase'
]
assert(Array.isArray(MUSEUM_EXHIBIT_SETS) && MUSEUM_EXHIBIT_SETS.length >= 4, 'MUSEUM_EXHIBIT_SETS must define at least four museum exhibit sets.')
for (const setId of expectedSetIds) {
  assert(MUSEUM_EXHIBIT_SETS.some(set => set.id === setId), `MUSEUM_EXHIBIT_SETS must include ${setId}.`)
}

for (const set of MUSEUM_EXHIBIT_SETS) {
  assert(set.hallZoneId, `Exhibit set ${set.id} must target a hallZoneId.`)
  assert(Number.isFinite(set.unlockExhibitLevel) && set.unlockExhibitLevel >= 0, `Exhibit set ${set.id} must have a valid unlockExhibitLevel.`)
  assert(Array.isArray(set.requirements) && set.requirements.length > 0, `Exhibit set ${set.id} must have item requirements.`)
  assert(Array.isArray(set.rewards) && set.rewards.length > 0, `Exhibit set ${set.id} must have rewards.`)
  for (const requirement of set.requirements) {
    assert(requirement.itemId && getItemById(requirement.itemId), `Exhibit set ${set.id} requirement ${requirement.itemId} must reference an existing item.`)
    assert(Number.isFinite(requirement.quantity) && requirement.quantity > 0, `Exhibit set ${set.id} requirement ${requirement.itemId} must have a positive quantity.`)
    assert(typeof requirement.sourceHint === 'string' && requirement.sourceHint.length > 0, `Exhibit set ${set.id} requirement ${requirement.itemId} must expose a sourceHint.`)
  }
  for (const reward of set.rewards) {
    assert(Number.isFinite(reward.value) && reward.value > 0, `Exhibit set ${set.id} reward ${reward.kind} must have a positive value.`)
  }
}

const defaultSave = createDefaultMuseumSaveData()
const normalizedSave = normalizeMuseumSaveData({
  exhibitSetStates: {
    local_flavor_showcase: {
      submittedItems: { mixed_seed_oil: 99 },
      completed: true,
      rewardClaimed: true,
      lastSubmittedDayTag: '1-spring-2',
      completedDayTag: '1-spring-2'
    }
  }
})
assert(defaultSave.exhibitSetStates && typeof defaultSave.exhibitSetStates === 'object', 'Default museum save data must include exhibitSetStates.')
assert(
  expectedSetIds.every(setId => defaultSave.exhibitSetStates[setId]),
  'Default museum save data must initialize every expected exhibit set state.'
)
assert(
  normalizedSave.exhibitSetStates.local_flavor_showcase?.submittedItems?.mixed_seed_oil === 2,
  'normalizeMuseumSaveData must clamp exhibit set submitted item counts to the requirement quantity.'
)
assert(
  normalizedSave.exhibitSetStates.local_flavor_showcase?.rewardClaimed === true,
  'normalizeMuseumSaveData must preserve exhibit set rewardClaimed state.'
)

for (const token of ['MuseumExhibitSetDef', 'MuseumExhibitSetState', 'MuseumExhibitSetRequirement', 'MuseumExhibitSetReward', 'exhibitSetStates']) {
  assert(museumTypeSource.includes(token), `Museum types must expose ${token}.`)
}
for (const token of ['MUSEUM_EXHIBIT_SETS', 'createDefaultExhibitSetStateRecord', 'normalizeExhibitSetStates', 'getMuseumExhibitSetById']) {
  assert(museumSource.includes(token), `Museum data must expose ${token}.`)
}

for (const token of [
  'exhibitSetOverview',
  'completedExhibitSetCount',
  'claimableExhibitSetCount',
  'getExhibitSetRequirementStatus',
  'getExhibitSetBlockedReason',
  'submitMuseumExhibitSetItem',
  'claimExhibitSetReward',
  'removeCombinedItem(itemId, submitQuantity)',
  'exhibitSetStates.value = data.exhibitSetStates',
  'exhibitSetStates: exhibitSetStates.value'
]) {
  assert(museumStoreSource.includes(token), `Museum store must include ${token}.`)
}
assert(
  museumStoreSource.includes("reward.kind !== 'display_rating'") && museumStoreSource.includes("reward.kind === 'visitor_flow'"),
  'Completed exhibit sets must feed display rating and visitor flow telemetry.'
)
assert(
  museumStoreSource.includes('duplicateReady') && museumStoreSource.includes('展组只收副本'),
  'Duplicate-only exhibit set requirements must be blocked until the first museum donation exists.'
)
const submitFunctionStart = museumStoreSource.indexOf('const submitMuseumExhibitSetItem')
const submitFunctionEnd = museumStoreSource.indexOf('const claimExhibitSetReward')
const submitFunctionSource = submitFunctionStart >= 0 && submitFunctionEnd > submitFunctionStart
  ? museumStoreSource.slice(submitFunctionStart, submitFunctionEnd)
  : ''
assert(submitFunctionSource.length > 0, 'submitMuseumExhibitSetItem source segment must be detectable.')
assert(
  !submitFunctionSource.includes('donatedItems.value.push'),
  'Exhibit set submission must not mutate donatedItems or bypass one-time donation rules.'
)
assert(
  submitFunctionSource.includes('const museumSnapshot = cloneMuseumSaveData(serialize())') &&
    submitFunctionSource.includes('const exhibitSetSnapshot = museumSnapshot.exhibitSetStates') &&
    submitFunctionSource.includes('const telemetrySnapshot = museumSnapshot.telemetry') &&
    submitFunctionSource.includes('const goalSnapshot = goalStore.serialize()'),
  'Exhibit set submission must snapshot exhibit set state, telemetry, and goal counters before consuming materials.'
)
assert(
  submitFunctionSource.indexOf('const museumSnapshot = cloneMuseumSaveData(serialize())') < submitFunctionSource.indexOf('removeCombinedItem(itemId, submitQuantity)') &&
    submitFunctionSource.includes('const warehouseSnapshot = warehouseStore.serialize()'),
  'Exhibit set submission snapshots must be created before combined inventory consumes materials.'
)
assert(
  submitFunctionSource.includes('telemetry.value = telemetrySnapshot') &&
    submitFunctionSource.includes('goalStore.deserialize(goalSnapshot)') &&
    submitFunctionSource.includes('warehouseStore.deserialize(warehouseSnapshot)'),
  'Exhibit set submission failure must roll back telemetry and goal activity counters as well as materials.'
)
const refreshTelemetryStart = museumStoreSource.indexOf('const refreshOperationalTelemetry')
const refreshTelemetryEnd = museumStoreSource.indexOf('const rotateShrineTheme')
const refreshTelemetrySource = refreshTelemetryStart >= 0 && refreshTelemetryEnd > refreshTelemetryStart
  ? museumStoreSource.slice(refreshTelemetryStart, refreshTelemetryEnd)
  : ''
assert(refreshTelemetrySource.length > 0, 'refreshOperationalTelemetry source segment must be detectable.')
assert(
  !refreshTelemetrySource.replace('const refreshOperationalTelemetry = () =>', '').includes('refreshOperationalTelemetry()'),
  'refreshOperationalTelemetry must update telemetry directly instead of recursively calling itself.'
)
assert(
  refreshTelemetrySource.includes('telemetry.value = {') &&
    refreshTelemetrySource.includes('visitorFlow: visitorTelemetry') &&
    refreshTelemetrySource.includes('displayRating: displayTelemetry'),
  'refreshOperationalTelemetry must persist rebuilt display rating and visitor flow telemetry.'
)
const claimFunctionStart = museumStoreSource.indexOf('const claimExhibitSetReward')
const claimFunctionEnd = museumStoreSource.indexOf('const claimMilestone')
const claimFunctionSource = claimFunctionStart >= 0 && claimFunctionEnd > claimFunctionStart
  ? museumStoreSource.slice(claimFunctionStart, claimFunctionEnd)
  : ''
assert(claimFunctionSource.length > 0, 'claimExhibitSetReward source segment must be detectable.')
assert(
  claimFunctionSource.includes('const failExhibitSetRewardClaim = (message: string)') &&
    claimFunctionSource.includes('addLog(') &&
    claimFunctionSource.includes("tags: ['museum_exhibit_set', 'late_game_cycle', 'resource_sink']"),
  'Exhibit set reward claim failures must be logged instead of silently returning false.'
)
assert(
  claimFunctionSource.includes('const museumSnapshot = cloneMuseumSaveData(serialize())') &&
    claimFunctionSource.includes('const exhibitSetSnapshot = museumSnapshot.exhibitSetStates') &&
    claimFunctionSource.includes('const telemetrySnapshot = museumSnapshot.telemetry'),
  'Exhibit set reward claim must snapshot exhibit set state and telemetry before marking rewards claimed.'
)
assert(
  claimFunctionSource.indexOf('const museumSnapshot = cloneMuseumSaveData(serialize())') < claimFunctionSource.indexOf('setExhibitSetState(setId, { rewardClaimed: true })'),
  'Exhibit set reward claim snapshot must be created before rewardClaimed is mutated.'
)
assert(
  claimFunctionSource.includes('telemetry.value = telemetrySnapshot'),
  'Exhibit set reward claim failure must roll back telemetry after refresh failures.'
)
assert(
  museumStoreSource.includes('const donateItem = (itemId: string): boolean') &&
    museumStoreSource.includes('donatedItems.value.push(itemId)'),
  'One-time donation path must remain in donateItem.'
)

for (const token of [
  'data-testid="museum-exhibit-set-panel"',
  'data-testid="museum-exhibit-set-card"',
  'data-testid="museum-exhibit-set-requirement"',
  'data-testid="museum-exhibit-set-submit"',
  'data-testid="museum-exhibit-set-claim"',
  'featuredExhibitSetOverview',
  'handleSubmitExhibitSetItem',
  'handleClaimExhibitSetReward'
]) {
  assert(museumViewSource.includes(token), `MuseumView must include ${token}.`)
}

assert(
  packageJson.scripts?.['qa:museum-exhibit-set-guards'] === 'node scripts/qa-museum-exhibit-set-guards.mjs',
  'package.json must register qa:museum-exhibit-set-guards.'
)

if (errors.length > 0) {
  console.error(`qa-museum-exhibit-set-guards failed (${errors.length})`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-museum-exhibit-set-guards passed')
