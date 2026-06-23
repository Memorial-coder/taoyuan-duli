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

const villageProjectsSource = readSource('src/data/villageProjects.ts')
const villageProjectStoreSource = readSource('src/stores/useVillageProjectStore.ts')
const villageViewSource = readSource('src/views/game/VillageView.vue')
const quarryStoreSource = readSource('src/stores/useQuarryStore.ts')
const quarrySource = readSource('src/data/quarry.ts')
const villageTypesSource = readSource('src/types/villageProject.ts')
const packageJson = JSON.parse(readSource('package.json'))

const { ITEMS } = await import(pathToFileURL(path.join(srcRoot, 'data/items.ts')).href)
const { QUARRY_PROJECT_ID } = await import(pathToFileURL(path.join(srcRoot, 'data/quarry.ts')).href)
const { VILLAGE_PROJECT_DEFS } = await import(pathToFileURL(path.join(srcRoot, 'data/villageProjects.ts')).href)
const { getQuarryDailySpawnCap, QUARRY_MAINTENANCE_SPAWN_BONUS } = await import(pathToFileURL(path.join(srcRoot, 'data/quarry.ts')).href)

const itemIds = new Set(ITEMS.map(item => item.id))
const quarryProject = VILLAGE_PROJECT_DEFS.find(project => project.id === QUARRY_PROJECT_ID)
assert(quarryProject, 'Village project data must include the quarry reopening project.')
assert(quarryProject?.maintenancePlan?.id === 'quarry_reopening_maintenance', 'Quarry project must keep its timed maintenance plan.')
assert(quarryProject?.maintenancePlan?.cycleDays === 7, 'Quarry maintenance window must remain weekly, not permanent.')
assert(
  quarryProject?.maintenancePlan?.effectSummary.includes('每日生成上限 +2'),
  'Quarry maintenance summary must describe the real daily spawn cap effect.'
)

const donationPlan = quarryProject?.donationPlan
assert(donationPlan?.id === 'quarry_stewardship_supply_drive', 'Quarry project must define the stewardship supply donation plan.')
assert(donationPlan?.repeatable === true, 'Quarry supply drive must be repeatable so it remains a long-term material sink.')
assert(donationPlan?.targetAmount === 16, 'Quarry supply drive should have a finite target amount for repeatable cycles.')
for (const itemId of ['stone', 'wood', 'iron_bar', 'obsidian', 'dragon_jade']) {
  assert(donationPlan?.acceptedItemIds?.includes(itemId), `Quarry supply drive must accept ${itemId}.`)
  assert(itemIds.has(itemId), `Quarry supply item ${itemId} must exist in ITEMS.`)
}

const milestones = donationPlan?.milestones ?? []
assert(milestones.length >= 2, 'Quarry supply drive must expose at least two donation milestones.')
for (const milestone of milestones) {
  assert(
    milestone.activation?.type === 'maintenanceWindow' &&
      milestone.activation.projectId === QUARRY_PROJECT_ID &&
      milestone.activation.durationDays === 7,
    `Quarry donation milestone ${milestone.id} must activate a 7-day quarry maintenance window.`
  )
}
assert(
  milestones.some(milestone => milestone.targetAmount === donationPlan?.targetAmount),
  'One quarry donation milestone must close the repeatable target cycle.'
)

assert(
  villageTypesSource.includes("type: 'maintenanceWindow'") &&
    villageTypesSource.includes('durationDays: number'),
  'Village project milestone type must support maintenanceWindow activation.'
)
assert(
  villageProjectStoreSource.includes('activateDonationMilestoneEffect') &&
    villageProjectStoreSource.includes('activation.type !==') &&
    villageProjectStoreSource.includes('activateMaintenancePlan(activation.projectId, nextDueDayTag)') &&
    villageProjectStoreSource.includes('addDaysToDayTag(getCurrentDayTag(), activation.durationDays)'),
  'Village project store must activate timed maintenance from donation milestone claims.'
)
assert(
  villageProjectStoreSource.includes('inventoryStore.deserialize(inventorySnapshot)') &&
    villageProjectStoreSource.includes('playerStore.deserialize(playerSnapshot)') &&
    villageProjectStoreSource.includes('achievementStore.deserialize(achievementSnapshot)'),
  'Donation milestone claim must keep rollback snapshots for reward or activation failures.'
)
assert(
  villageProjectStoreSource.includes('removeCombinedItem(itemId, amount)') &&
    villageProjectStoreSource.includes('getCombinedItemCount(itemId) < amount'),
  'Village project donation must precheck and consume combined inventory items.'
)
assert(
  villageProjectStoreSource.includes('shouldResetRepeatableCycle') &&
    villageProjectStoreSource.includes('claimedMilestoneIds.includes(milestone.id)'),
  'Repeatable donation cycles must reset only after all milestones are claimed.'
)
assert(
  quarryStoreSource.includes('useVillageProjectStore().isMaintenanceEffectActive(QUARRY_PROJECT_ID)') &&
    quarryStoreSource.includes('maintenanceActive: maintenanceActive.value'),
  'Quarry store must read village-project maintenance state into daily spawn cap.'
)
assert(
  quarrySource.includes('QUARRY_MAINTENANCE_SPAWN_BONUS = 2') &&
    getQuarryDailySpawnCap(1, 1, 8, { maintenanceActive: true }) - getQuarryDailySpawnCap(1, 1, 8, { maintenanceActive: false }) ===
      QUARRY_MAINTENANCE_SPAWN_BONUS,
  'Quarry maintenance effect must produce the documented daily spawn cap bonus.'
)
assert(
  villageViewSource.includes('project.donation.plan.requirementSummary') &&
    villageViewSource.includes('project.donation.plan.rewardSummary') &&
    villageViewSource.includes('project.donation.state.totalAmount') &&
    villageViewSource.includes('project.donation.milestones'),
  'VillageView must show donation requirement, reward, progress, and milestone state.'
)
assert(
  villageProjectsSource.includes('采石场维护供材') &&
    villageProjectsSource.includes('限时 7 天提高每日资源生成上限') &&
    villageProjectsSource.includes('不会永久叠加'),
  'Quarry village-project data must explain timed, non-stacking maintenance use.'
)
assert(
  packageJson.scripts?.['qa:quarry-village-project-linkage'] === 'node scripts/qa-quarry-village-project-linkage.mjs',
  'package.json must register qa:quarry-village-project-linkage.'
)

if (errors.length > 0) {
  console.error(`qa-quarry-village-project-linkage failed (${errors.length})`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-quarry-village-project-linkage passed')
