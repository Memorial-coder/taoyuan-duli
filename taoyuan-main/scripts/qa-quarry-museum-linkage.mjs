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

const quarrySource = readSource('src/data/quarry.ts')
const museumSource = readSource('src/data/museum.ts')
const museumTypeSource = readSource('src/types/museum.ts')
const museumStoreSource = readSource('src/stores/useMuseumStore.ts')
const museumViewSource = readSource('src/views/game/MuseumView.vue')
const quarryViewSource = readSource('src/views/game/QuarryView.vue')
const packageJson = JSON.parse(readSource('package.json'))

const { QUARRY_ARTIFACT_POOL, QUARRY_MUSEUM_ARTIFACT_ITEM_IDS } = await import(pathToFileURL(path.join(srcRoot, 'data/quarry.ts')).href)
const { MUSEUM_ITEMS, MUSEUM_SCHOLAR_COMMISSIONS } = await import(pathToFileURL(path.join(srcRoot, 'data/museum.ts')).href)

const quarryArtifactItemIds = QUARRY_ARTIFACT_POOL.map(entry => entry.itemId)
assert(
  JSON.stringify(QUARRY_MUSEUM_ARTIFACT_ITEM_IDS) === JSON.stringify(quarryArtifactItemIds),
  'QUARRY_MUSEUM_ARTIFACT_ITEM_IDS must mirror QUARRY_ARTIFACT_POOL item ids.'
)

for (const itemId of quarryArtifactItemIds) {
  const museumItem = MUSEUM_ITEMS.find(item => item.id === itemId)
  assert(museumItem, `Quarry artifact ${itemId} must be registered as a museum item.`)
  assert(
    museumItem?.sourceHint?.includes('旧采石场古物点'),
    `Museum source hint for ${itemId} must mention old quarry artifact nodes.`
  )
}

const quarryLinkedCommissions = MUSEUM_SCHOLAR_COMMISSIONS.filter(commission =>
  commission.linkedRouteLabels?.includes('采石场')
)
assert(quarryLinkedCommissions.length >= 2, 'At least two base scholar commissions should be linked to quarry relics.')
for (const commission of quarryLinkedCommissions) {
  assert(
    Array.isArray(commission.materialRequirements) && commission.materialRequirements.length > 0,
    `Quarry-linked commission ${commission.id} must consume duplicate relic materials.`
  )
  for (const requirement of commission.materialRequirements ?? []) {
    assert(
      quarryArtifactItemIds.includes(requirement.itemId),
      `Commission ${commission.id} material ${requirement.itemId} must come from the quarry artifact pool.`
    )
    assert(requirement.quantity > 0, `Commission ${commission.id} material ${requirement.itemId} must have positive quantity.`)
  }
}

assert(
  museumTypeSource.includes('materialRequirements?: { itemId: string; quantity: number }[]'),
  'MuseumScholarCommissionDef must expose materialRequirements.'
)
assert(
  museumStoreSource.includes('normalizeScholarCommissionMaterialRequirements'),
  'Museum store must normalize scholar commission material requirements.'
)
assert(
  museumStoreSource.includes('getScholarCommissionMaterialStatus') &&
    museumStoreSource.includes('canSupplyScholarCommissionMaterials') &&
    museumStoreSource.includes('getScholarCommissionMaterialBlockedReason'),
  'Museum store must expose material status, availability, and blocked reason helpers.'
)
assert(
  museumStoreSource.includes('inventoryStore.getTotalItemCount(requirement.itemId)') &&
    museumStoreSource.includes('inventoryStore.removeItemAnywhere(requirement.itemId, requirement.quantity)'),
  'Scholar commission reward claim must check and consume duplicate relic materials from inventory/temp inventory.'
)
assert(
  museumStoreSource.includes('consumedMaterials: materialSummary.join') &&
    museumStoreSource.includes('消耗${materialSummary.join'),
  'Scholar commission reward feedback must include consumed materials.'
)
assert(
  !museumStoreSource.includes('donatedItems.value.push(itemId)') ||
    museumStoreSource.includes('const donateItem = (itemId: string): boolean'),
  'Donation path should stay one-time and separate from duplicate scholar material consumption.'
)

assert(
  museumViewSource.includes('getScholarCommissionMaterialSummary(commission.id)') &&
    museumViewSource.includes('研究材料：{{ getScholarCommissionMaterialSummary(commission.id) }}'),
  'MuseumView must render scholar commission material requirements.'
)
assert(
  museumViewSource.includes('museumStore.canSupplyScholarCommissionMaterials(commissionId)') &&
    museumViewSource.includes('museumStore.getScholarCommissionMaterialBlockedReason(commissionId)'),
  'MuseumView must block reward claim when scholar materials are missing.'
)
assert(
  quarryViewSource.includes('data-testid="quarry-museum-linkage"') &&
    quarryViewSource.includes('副本遗物可交给学者委托'),
  'QuarryView must explain first donation and duplicate relic scholar usage.'
)
assert(
  quarrySource.includes('QUARRY_MUSEUM_ARTIFACT_ITEM_IDS'),
  'Quarry data must export a museum-facing artifact list.'
)
assert(
  packageJson.scripts?.['qa:quarry-museum-linkage'] === 'node scripts/qa-quarry-museum-linkage.mjs',
  'package.json must register qa:quarry-museum-linkage.'
)

if (errors.length > 0) {
  console.error(`qa-quarry-museum-linkage failed (${errors.length})`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-quarry-museum-linkage passed')
