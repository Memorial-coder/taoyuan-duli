/* global console, process */

import fs from 'node:fs'
import path from 'node:path'
import { createRequire, registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const srcRoot = path.join(projectRoot, 'src')
const require = createRequire(import.meta.url)

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

const packageJson = JSON.parse(read('package.json'))
const saveStoreSource = read('src/stores/useSaveStore.ts')
const npcStoreSource = read('src/stores/useNpcStore.ts')
const museumSource = read('src/data/museum.ts')
const museumStoreSource = read('src/stores/useMuseumStore.ts')
const quarrySource = read('src/data/quarry.ts')
const quarryStoreSource = read('src/stores/useQuarryStore.ts')
const npcFunctionEffectsSource = read('src/data/npcFunctionEffects.ts')
const speciesNotesSource = read('src/data/speciesNotes.ts')
const itemLinkageSource = read('src/data/itemLinkage.ts')
const itemLinkageTypeSource = read('src/types/itemLinkage.ts')

const {
  MUSEUM_EXHIBIT_SETS,
  createDefaultMuseumSaveData,
  normalizeMuseumSaveData
} = await import(pathToFileURL(path.join(srcRoot, 'data/museum.ts')).href)
const {
  createDefaultQuarrySaveData,
  normalizeQuarryMineSaveData,
  normalizeQuarrySaveData
} = await import(pathToFileURL(path.join(srcRoot, 'data/quarry.ts')).href)
const {
  getNpcFunctionEffectSummaries,
  getNpcFunctionEffectValue,
  isNpcFunctionEffectActive
} = await import(pathToFileURL(path.join(srcRoot, 'data/npcFunctionEffects.ts')).href)
const {
  SPECIES_NOTE_DEFS,
  buildSpeciesNoteOverview
} = await import(pathToFileURL(path.join(srcRoot, 'data/speciesNotes.ts')).href)
const {
  detectGameplaySaveFieldAnomalies
} = require(path.join(projectRoot, '..', 'server', 'src', 'taoyuanSaveRuntime.js'))

assert(
  packageJson.scripts?.['qa:linkage-save-compatibility'] === 'node scripts/qa-linkage-save-compatibility.mjs',
  'package.json must register qa:linkage-save-compatibility.'
)

// itemLinkage is a static linkage catalog. Save migration should not persist it as a mutable player-save field.
assert(itemLinkageSource.includes('export const ITEM_LINKAGE'), 'itemLinkage must remain a static exported data catalog.')
assert(itemLinkageTypeSource.includes('export interface ItemLinkageDef'), 'itemLinkage types must remain data-entry types, not save-state types.')
assert(!saveStoreSource.includes('itemLinkage:'), 'Save payload must not add an itemLinkage runtime field.')
assert(!saveStoreSource.includes('itemLinkageState'), 'Save payload must not add itemLinkageState.')

// Family wishes are saved as board progress only; itemRequirements are recovered from static definitions and the demand pool.
assert(
  saveStoreSource.includes('familyWishBoard: next.npc.familyWishBoard ?? undefined'),
  'Save migration must preserve optional npc.familyWishBoard without requiring new fields in old saves.'
)
assert(
  npcStoreSource.includes('if (!raw || typeof raw !== \'object\') return createDefaultFamilyWishBoardState()'),
  'Npc deserialize must default missing familyWishBoard for old saves.'
)
for (const token of ['completedWishIds', 'rewardClaimed', 'activeWishId', 'targetValue']) {
  assert(npcStoreSource.includes(token), `Npc familyWishBoard deserialize/serialize must keep ${token}.`)
}
assert(
  npcStoreSource.includes('const normalizeFamilyWishItemRequirements') &&
    npcStoreSource.includes('getFamilyWishDemandEntries(wishDef.id)') &&
    npcStoreSource.includes('wishDef?.itemRequirements ?? []'),
  'Family wish item requirements must be reconstructed from static wish definitions and linkage demand pools.'
)
assert(
  !saveStoreSource.includes('itemRequirements: next.npc.familyWishBoard'),
  'Family wish itemRequirements must not become a required save field.'
)

// Museum exhibit sets and species notes must normalize/read through existing state instead of inventing unsafe save fields.
const defaultMuseumSave = createDefaultMuseumSaveData()
assert(defaultMuseumSave.exhibitSetStates && typeof defaultMuseumSave.exhibitSetStates === 'object', 'Default museum save must include exhibitSetStates.')
assert(
  MUSEUM_EXHIBIT_SETS.every(set => defaultMuseumSave.exhibitSetStates[set.id]),
  'Default museum save must initialize all exhibit set states.'
)
const normalizedEmptyMuseum = normalizeMuseumSaveData({})
assert(
  MUSEUM_EXHIBIT_SETS.every(set => normalizedEmptyMuseum.exhibitSetStates[set.id]),
  'normalizeMuseumSaveData({}) must backfill every exhibit set state for old saves.'
)
const firstExhibitSet = MUSEUM_EXHIBIT_SETS[0]
const firstRequirement = firstExhibitSet.requirements[0]
const normalizedMuseumWithBadCounts = normalizeMuseumSaveData({
  exhibitSetStates: {
    [firstExhibitSet.id]: {
      submittedItems: {
        [firstRequirement.itemId]: firstRequirement.quantity + 99,
        not_a_requirement: 999
      },
      completed: false,
      rewardClaimed: true,
      lastSubmittedDayTag: '2-summer-3',
      completedDayTag: '2-summer-3'
    }
  }
})
assert(
  normalizedMuseumWithBadCounts.exhibitSetStates[firstExhibitSet.id]?.submittedItems?.[firstRequirement.itemId] === firstRequirement.quantity,
  'Museum exhibit set submittedItems must clamp to the requirement quantity during normalization.'
)
assert(
  !('not_a_requirement' in (normalizedMuseumWithBadCounts.exhibitSetStates[firstExhibitSet.id]?.submittedItems ?? {})),
  'Museum exhibit set normalization must drop submittedItems that are not requirements.'
)
assert(
  normalizedMuseumWithBadCounts.exhibitSetStates[firstExhibitSet.id]?.rewardClaimed === true,
  'Museum exhibit set normalization must preserve rewardClaimed as a boolean.'
)
assert(
  museumSource.includes('const normalizeExhibitSetStates') &&
    museumSource.includes('MUSEUM_EXHIBIT_SETS.map') &&
    museumSource.includes('rewardClaimed: current?.rewardClaimed === true'),
  'Museum data must normalize exhibitSetStates from static set definitions.'
)
assert(
  museumStoreSource.includes('const deserialize =') &&
    museumStoreSource.includes('normalizeMuseumSaveData(dataLike)') &&
    museumStoreSource.includes('exhibitSetStates: exhibitSetStates.value'),
  'Museum store serialize/deserialize must pass through normalizeMuseumSaveData.'
)
assert(
  SPECIES_NOTE_DEFS.length >= 5 &&
    speciesNotesSource.includes('export const buildSpeciesNoteOverview') &&
    museumStoreSource.includes('buildSpeciesNoteOverview'),
  'Species notes must stay derived from existing progress snapshots instead of a standalone save block.'
)
const emptySpeciesOverview = buildSpeciesNoteOverview()
assert(emptySpeciesOverview.totalCount === SPECIES_NOTE_DEFS.length, 'Empty species-note overview must be buildable for old saves.')
assert(emptySpeciesOverview.completedCount === 0, 'Empty species-note overview must not require migration-time state.')

// Quarry mine linkage state is nested in quarry save data and old unlocked quarry saves should auto-open the mine route.
const defaultQuarrySave = createDefaultQuarrySaveData()
assert(defaultQuarrySave.quarryMine && Array.isArray(defaultQuarrySave.quarryMine.nodes), 'Default quarry save must include quarryMine nodes.')
const normalizedLockedQuarry = normalizeQuarrySaveData({})
assert(normalizedLockedQuarry.quarryMine.unlocked === false, 'Locked old quarry saves must keep quarryMine locked by default.')
assert(Array.isArray(normalizedLockedQuarry.quarryMine.nodes) && normalizedLockedQuarry.quarryMine.nodes.length > 0, 'Locked old quarry saves still need normalized quarryMine nodes.')
const normalizedUnlockedQuarry = normalizeQuarrySaveData({ unlockedAtDayTag: '2-autumn-7' })
assert(normalizedUnlockedQuarry.quarryMine.unlocked === true, 'Unlocked old quarry saves without quarryMine must auto-unlock quarryMine.')
assert(Array.isArray(normalizedUnlockedQuarry.quarryMine.nodes) && normalizedUnlockedQuarry.quarryMine.nodes.length > 0, 'Unlocked old quarry saves must backfill quarryMine nodes.')
const normalizedBadMine = normalizeQuarryMineSaveData({
  unlocked: true,
  completed: true,
  finalRewardClaimed: true,
  runId: 3,
  nodes: [{ index: 0, state: 'cleared', kind: 'bad_kind', label: 'bad' }],
  lastRunDayTag: '2-winter-1'
})
assert(normalizedBadMine.runId === 3, 'Quarry mine normalization must preserve valid runId.')
assert(normalizedBadMine.lastCompletedDayTag === '2-winter-1', 'Quarry mine normalization must infer lastCompletedDayTag for completed old route saves.')
assert(normalizedBadMine.nodes.every((node, index) => node.index === index), 'Quarry mine normalization must rebuild node indexes.')
assert(
  quarrySource.includes('export const normalizeQuarryMineSaveData') &&
    quarrySource.includes('quarryMine: normalizeQuarryMineSaveData(data?.quarryMine, !!data?.unlockedAtDayTag)'),
  'Quarry data must normalize nested quarryMine state and unlock it for already unlocked old saves.'
)
assert(
  quarryStoreSource.includes('const deserialize =') &&
    quarryStoreSource.includes('const normalized = normalizeQuarrySaveData(data)') &&
    quarryStoreSource.includes('quarryMine.value ='),
  'Quarry store deserialize must route saves through normalizeQuarrySaveData.'
)

// NPC function effects must be optional-safe: unknown or locked effects read as false/0.
assert(getNpcFunctionEffectValue('__unknown_linkage_effect__') === 0, 'Unknown NPC function effect value must fall back to 0.')
assert(isNpcFunctionEffectActive('__unknown_linkage_effect__') === false, 'Unknown NPC function effect active state must fall back to false.')
assert(getNpcFunctionEffectSummaries({ unlockedFunctionDefs: [{ id: 'legacy', title: 'Legacy Effect', effectType: '__legacy__', effectPayload: { value: 2 } }] }).at(0)?.system === 'legacy', 'Unknown NPC function effect summaries must fall back to legacy system labels.')
assert(
  npcFunctionEffectsSource.includes('if (values.length === 0) return 0') &&
    npcFunctionEffectsSource.includes('): boolean => getNpcFunctionEffectSources(effectType, context).length > 0') &&
    npcFunctionEffectsSource.includes("system: effectDef?.system ?? 'legacy'"),
  'NPC function effect helpers must keep 0/false/legacy fallbacks.'
)

// Server save anomaly checks must not reject the new linkage containers when they are present in gameplay data.
const linkageGameplayData = {
  npc: {
    householdDivision: {},
    familyWishBoard: {},
    completedFamilyWishIds: []
  },
  museum: {
    exhibitSetStates: {},
    shrineThemeState: {}
  },
  quarry: {
    quarryMine: {
      unlocked: true,
      nodes: []
    }
  },
  quest: {
    processedOrderSubmissionCount: 1,
    npcFunctionAdvancedOrderCompletionCount: 1,
    specialOrderSettlementReceipts: ['qa']
  }
}
const linkageAnomalies = detectGameplaySaveFieldAnomalies(linkageGameplayData)
assert(linkageAnomalies.length === 0, `Server save anomaly guard must accept linkage save containers: ${JSON.stringify(linkageAnomalies)}`)
const illegalControlSave = {
  game: {
    year: 1,
    season: 'monsoon',
    day: 99
  }
}
const controlAnomalies = detectGameplaySaveFieldAnomalies(illegalControlSave)
assert(controlAnomalies.some(anomaly => anomaly.field_path === 'game.season'), 'Server anomaly guard control case must still catch invalid enums.')
assert(controlAnomalies.some(anomaly => anomaly.field_path === 'game.day'), 'Server anomaly guard control case must still catch out-of-range numbers.')

if (errors.length > 0) {
  console.error(`qa-linkage-save-compatibility failed (${errors.length})`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-linkage-save-compatibility passed')
