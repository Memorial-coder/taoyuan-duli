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

const forgeSource = readSource('src/data/forgeAffixes.ts')
const processingViewSource = readSource('src/views/game/ProcessingView.vue')
const quarryStoreSource = readSource('src/stores/useQuarryStore.ts')
const inventoryStoreSource = readSource('src/stores/useInventoryStore.ts')
const packageJson = JSON.parse(readSource('package.json'))

const {
  FORGE_AFFIX_MODE_DEFS,
  FORGE_AFFIX_DIRECTIONS,
  FORGE_AFFIXES,
  rollForgeAffixes
} = await import(pathToFileURL(path.join(srcRoot, 'data/forgeAffixes.ts')).href)

const deepMode = FORGE_AFFIX_MODE_DEFS.find(mode => mode.id === 'deep_refine')
assert(deepMode, 'Forge affix data must define deep_refine mode.')
assert(deepMode?.minLevel === 12, 'deep_refine should unlock at workshop level 12.')
assert(deepMode?.cost === 110000, 'deep_refine should use a distinct late-game money cost.')
const deepModeMaterials = new Map(deepMode?.materials.map(item => [item.itemId, item.quantity]) ?? [])
for (const [itemId, quantity] of Object.entries({ obsidian: 3, dragon_jade: 1, rare_lotus_guard_elixir: 1 })) {
  assert(deepModeMaterials.get(itemId) === quantity, `deep_refine must consume ${itemId} x${quantity}.`)
}

const deepDirection = FORGE_AFFIX_DIRECTIONS.find(direction => direction.id === 'pickaxe_quarry_deep')
assert(deepDirection?.target === 'pickaxe', 'pickaxe_quarry_deep direction must target pickaxe.')
for (const affixId of ['quarry_resonance', 'deep_vein_grip', 'relic_sense']) {
  assert(deepDirection?.affixIds.includes(affixId), `pickaxe_quarry_deep must include ${affixId}.`)
  const affix = FORGE_AFFIXES[affixId]
  assert(affix?.target === 'pickaxe', `${affixId} must target pickaxe.`)
}

assert(
  FORGE_AFFIXES.quarry_resonance?.effectType === 'pickaxe_quarry_double_chance',
  'quarry_resonance must expose pickaxe_quarry_double_chance.'
)
assert(
  FORGE_AFFIXES.deep_vein_grip?.effectType === 'pickaxe_quarry_deep_stamina_reduction',
  'deep_vein_grip must expose pickaxe_quarry_deep_stamina_reduction.'
)
assert(
  FORGE_AFFIXES.relic_sense?.effectType === 'pickaxe_quarry_artifact_chance',
  'relic_sense must expose pickaxe_quarry_artifact_chance.'
)

const deterministicRolls = rollForgeAffixes({
  target: 'pickaxe',
  workshopLevel: 15,
  directionId: 'pickaxe_quarry_deep',
  rng: () => 0
})
assert(
  deterministicRolls.length > 0 && deterministicRolls.every(roll => deepDirection?.affixIds.includes(roll.id)),
  'Rolling pickaxe_quarry_deep must produce only quarry-deep pickaxe affixes while direction pool is sufficient.'
)

for (const marker of [
  "'deep_refine'",
  "'pickaxe_quarry_deep'",
  'pickaxe_quarry_double_chance',
  'pickaxe_quarry_deep_stamina_reduction',
  'pickaxe_quarry_artifact_chance'
]) {
  assert(forgeSource.includes(marker), `forge source must include ${marker}.`)
}
assert(
  processingViewSource.includes("mode.id !== 'deep_refine' || selectedEnchantingForgeTarget.value === 'pickaxe'") &&
    processingViewSource.includes("selectedEnchantingForgeMode.value === 'deep_refine'") &&
    processingViewSource.includes("data-testid=\"processing-enchanting-forge-deep-refine-hint\"") &&
    processingViewSource.includes("? 'pickaxe_quarry_deep'"),
  'ProcessingView must limit deep_refine to pickaxe, show its hint, and roll pickaxe_quarry_deep direction.'
)
assert(
  processingViewSource.includes('removeCombinedItems(mode.materials)') &&
    processingViewSource.includes('setEnchantingForgeAffixes'),
  'deep_refine must reuse the normal transaction that consumes materials and writes affixes.'
)
assert(
  quarryStoreSource.includes("getToolAffixEffectValue('pickaxe', 'pickaxe_quarry_double_chance')") &&
    quarryStoreSource.includes("getToolAffixEffectValue('pickaxe', 'pickaxe_quarry_deep_stamina_reduction')") &&
    quarryStoreSource.includes("getToolAffixEffectValue('pickaxe', 'pickaxe_quarry_artifact_chance')") &&
    quarryStoreSource.includes('rollQuarryAffixArtifactReward') &&
    quarryStoreSource.includes('QUARRY_ARTIFACT_POOL'),
  'Quarry store must read all quarry-deep pickaxe affix effects during real quarry settlement.'
)
assert(
  inventoryStoreSource.includes('migrateLegacyEnchantmentToAffixes') &&
    inventoryStoreSource.includes('setToolAffixes') &&
    inventoryStoreSource.includes('tool.enchantmentId = null'),
  'Inventory store must keep legacy enchantment migration and affix write path intact.'
)
assert(
  packageJson.scripts?.['qa:quarry-forge-linkage'] === 'node scripts/qa-quarry-forge-linkage.mjs',
  'package.json must register qa:quarry-forge-linkage.'
)

if (errors.length > 0) {
  console.error(`qa-quarry-forge-linkage failed (${errors.length})`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-quarry-forge-linkage passed')
