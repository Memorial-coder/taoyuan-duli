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

const quarryDataSource = readSource('src/data/quarry.ts')
const potentialDataSource = readSource('src/data/potential.ts')
const potentialTypeSource = readSource('src/types/potential.ts')
const quarryStoreSource = readSource('src/stores/useQuarryStore.ts')
const quarryViewSource = readSource('src/views/game/QuarryView.vue')
const potentialViewSource = readSource('src/views/game/PotentialView.vue')
const packageJson = JSON.parse(readSource('package.json'))

const { QUARRY_WEEKLY_STEWARDSHIP_TARGET, QUARRY_WEEKLY_STEWARDSHIP_MAX_CLAIMS } = await import(pathToFileURL(path.join(srcRoot, 'data/quarry.ts')).href)
const { POTENTIAL_SOURCE_RULE_BY_ID } = await import(pathToFileURL(path.join(srcRoot, 'data/potential.ts')).href)

const quarryRule = POTENTIAL_SOURCE_RULE_BY_ID.get('quarry_stewardship')
assert(QUARRY_WEEKLY_STEWARDSHIP_TARGET === 12, 'Quarry weekly stewardship target must stay at 12 cleared cells per claim.')
assert(QUARRY_WEEKLY_STEWARDSHIP_MAX_CLAIMS === 2, 'Quarry weekly stewardship must stay capped at two claims.')
assert(quarryRule?.cap.period === 'weekly', 'Quarry potential source must be weekly.')
assert(quarryRule?.cap.maxClaims === QUARRY_WEEKLY_STEWARDSHIP_MAX_CLAIMS, 'Quarry potential source max claims must match quarry weekly cap.')
assert(
  quarryRule?.rewards.some(reward => reward.resourceId === 'potential_insight' && reward.amount === 1) &&
    quarryRule?.rewards.some(reward => reward.resourceId === 'mountain_jade' && reward.amount === 1),
  'Quarry potential source must reward potential_insight and mountain_jade.'
)
assert(quarryRule?.routeName === 'quarry', 'Quarry potential source must route back to the quarry panel.')

assert(
  quarryDataSource.includes('QUARRY_WEEKLY_STEWARDSHIP_TARGET = 12') &&
    quarryDataSource.includes('QUARRY_WEEKLY_STEWARDSHIP_MAX_CLAIMS = 2'),
  'Quarry data must keep explicit weekly target and max claim constants.'
)
assert(
  quarryStoreSource.includes("claimPotentialSourceReward('quarry_stewardship'") &&
    quarryStoreSource.includes('periodKey: weeklyProgress.value.weekKey') &&
    quarryStoreSource.includes("reason: '旧采石场周清理'"),
  'Quarry store must grant weekly stewardship via the unified potential source helper.'
)
assert(
  quarryStoreSource.includes('if (result.success)') &&
    quarryStoreSource.includes('nextClaimedKeys.add(milestoneKey)') &&
    quarryStoreSource.indexOf('if (result.success)') < quarryStoreSource.indexOf('nextClaimedKeys.add(milestoneKey)'),
  'Quarry store must only mark stewardship milestones claimed after successful potential reward grants.'
)
assert(
  quarryViewSource.includes('quarryWeeklyRewardText') &&
    quarryViewSource.includes('quarryWeeklyNextStepText') &&
    quarryViewSource.includes('潜能心得 + 山野玉') &&
    quarryViewSource.includes('距离下一次潜能奖励还差'),
  'QuarryView must show weekly potential reward contents and remaining cleared-cell requirement.'
)
assert(
  potentialTypeSource.includes('routeName?: string') &&
    potentialTypeSource.includes('routeLabel?: string'),
  'Potential source rule type must support route hints.'
)
assert(
  potentialDataSource.includes("id: 'quarry_stewardship'") &&
    potentialDataSource.includes("routeName: 'quarry'") &&
    potentialDataSource.includes("routeLabel: '去旧采石场'"),
  'Potential source data must point quarry stewardship back to the quarry page.'
)
assert(
  potentialViewSource.includes('potential-source-route-${source.id}') &&
    potentialViewSource.includes('navigateToPanel(source.routeName)') &&
    potentialViewSource.includes('source.routeLabel'),
  'PotentialView must render source route actions for quarry stewardship.'
)
assert(
  packageJson.scripts?.['qa:quarry-potential-linkage'] === 'node scripts/qa-quarry-potential-linkage.mjs',
  'package.json must register qa:quarry-potential-linkage.'
)

if (errors.length > 0) {
  console.error(`qa-quarry-potential-linkage failed (${errors.length})`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-quarry-potential-linkage passed')
