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

const hanhaiSource = readSource('src/data/hanhai.ts')
const hanhaiTypesSource = readSource('src/types/hanhai.ts')
const hanhaiStoreSource = readSource('src/stores/useHanhaiStore.ts')
const hanhaiViewSource = readSource('src/views/game/HanhaiView.vue')
const packageJson = JSON.parse(readSource('package.json'))

const { getItemById } = await import(pathToFileURL(path.join(srcRoot, 'data/items.ts')).href)
const { HANHAI_TRAVEL_PREP_DEFS } = await import(pathToFileURL(path.join(srcRoot, 'data/hanhai.ts')).href)

assert(Array.isArray(HANHAI_TRAVEL_PREP_DEFS) && HANHAI_TRAVEL_PREP_DEFS.length >= 4, 'Hanhai must define at least four optional travel prep sinks.')

const requiredPrepIds = [
  'frontier_ration_bundle',
  'artisan_preserve_crate',
  'elixir_survey_kit',
  'deep_vein_anchor'
]
for (const prepId of requiredPrepIds) {
  const prep = HANHAI_TRAVEL_PREP_DEFS.find(entry => entry.id === prepId)
  assert(prep, `Hanhai travel prep must include ${prepId}.`)
  assert((prep?.successRateBonus ?? 0) > 0, `${prepId} must expose a success-rate bonus.`)
  assert((prep?.riskReduction ?? 0) > 0, `${prepId} must expose a risk reduction.`)
  assert(prep?.costItems?.length > 0, `${prepId} must consume at least one real item.`)
  for (const cost of prep?.costItems ?? []) {
    assert(getItemById(cost.itemId), `${prepId} cost item ${cost.itemId} must exist.`)
    assert(Number.isInteger(cost.quantity) && cost.quantity > 0, `${prepId} cost ${cost.itemId} must have positive quantity.`)
  }
}

const consumedItemIds = new Set(HANHAI_TRAVEL_PREP_DEFS.flatMap(prep => prep.costItems.map(cost => cost.itemId)))
for (const itemId of [
  'adventurer_ration',
  'herbal_paste',
  'green_tea_drink',
  'fine_pickles',
  'ley_crystal_focus_elixir',
  'obsidian',
  'dragon_jade'
]) {
  assert(consumedItemIds.has(itemId), `Hanhai travel prep must consume ${itemId}.`)
}

for (const token of [
  'export type HanhaiTravelPrepSource',
  'export interface HanhaiTravelPrepDef',
  'export interface HanhaiTravelPrepPreview',
  'successRateBonus: number',
  'riskReduction: number',
  'extraTicketRewards?: RewardTicketLedger'
]) {
  assert(hanhaiTypesSource.includes(token), `Hanhai types must include ${token}.`)
}

for (const token of [
  'HANHAI_TRAVEL_PREP_DEFS',
  "source: 'ration'",
  "source: 'artisan'",
  "source: 'elixir'",
  "source: 'deep_vein'",
  "itemId: 'ley_crystal_focus_elixir'",
  "itemId: 'dragon_jade'"
]) {
  assert(hanhaiSource.includes(token), `Hanhai data must include ${token}.`)
}

for (const token of [
  'travelPrepPreviews',
  'resolveTravelPrepForUse',
  'getRelicExploreCost',
  'getRelicPreparedRewardBundle',
  'applyTravelPrepToRewards',
  'mergeTicketRewards',
  'removeCombinedItems(travelPrep.def.costItems)',
  "'hanhai_travel_prep_sink'",
  'prepCostSummary',
  'successRateBonus',
  'riskReduction'
]) {
  assert(hanhaiStoreSource.includes(token), `Hanhai store must include ${token}.`)
}

assert(
  /const exploreRelicSite = \(siteId: string, prepId\?: string \| null\)/.test(hanhaiStoreSource),
  'exploreRelicSite must accept an optional prep id.'
)
assert(
  /return prepId \? \{ success: false, message: '出行准备物不存在。' \} : \{ success: true, prep: null \}/.test(hanhaiStoreSource),
  'No-prep relic exploration must remain valid so prep never becomes mandatory.'
)
assert(
  /if \(!playerStore\.spendMoney\(exploreCost\)\)/.test(hanhaiStoreSource),
  'Relic exploration must use the prepared exploration cost.'
)
assert(
  /const preparedRewards = getRelicPreparedRewardBundle\(siteId, travelPrep\?\.def\.id \?\? null\)/.test(hanhaiStoreSource),
  'Relic exploration must preview and grant prepared rewards.'
)

for (const token of [
  'data-testid="hanhai-travel-prep-panel"',
  'data-testid="hanhai-travel-prep-option"',
  'selectedTravelPrepId',
  'selectedUsableTravelPrepId',
  'getPreparedRelicCost(site.id)',
  'getPreparedRelicRewardText(site.id)',
  '可选消耗，不带也能出发',
  'hanhaiStore.exploreRelicSite(siteId, selectedUsableTravelPrepId.value)'
]) {
  assert(hanhaiViewSource.includes(token), `Hanhai view must include ${token}.`)
}

assert(
  packageJson.scripts?.['qa:hanhai-travel-prep-sinks'] === 'node scripts/qa-hanhai-travel-prep-sinks.mjs',
  'package.json must register qa:hanhai-travel-prep-sinks.'
)

if (errors.length > 0) {
  console.error(`qa-hanhai-travel-prep-sinks failed (${errors.length})`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-hanhai-travel-prep-sinks passed')
