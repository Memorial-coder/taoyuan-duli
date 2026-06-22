/* global console, process */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import ts from 'typescript'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const srcRoot = path.join(projectRoot, 'src')

const errors = []

const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const read = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

const tryResolveFile = candidate => {
  const variants = [
    candidate,
    `${candidate}.ts`,
    `${candidate}.js`,
    path.join(candidate, 'index.ts'),
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
      if (!resolved) throw new Error(`无法解析模块：${specifier}`)
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

const data = await import(pathToFileURL(path.join(srcRoot, 'data', 'index.ts')).href)

const {
  ITEM_LINKAGE_DEFS,
  QUARRY_MINE_ELIXIR_PREP_OPTIONS,
  REGION_EXPEDITION_ELIXIR_PREP_OPTIONS
} = data

const quarryPrepIds = ['wind_core_guard_pill', 'rare_lotus_guard_elixir']
const regionPrepIds = ['ley_crystal_focus_elixir', 'marsh_luminous_cleansing_elixir', 'moon_pearl_calm_elixir']

assert(QUARRY_MINE_ELIXIR_PREP_OPTIONS.length === quarryPrepIds.length, '采石场旧支道丹药准备选项数量不正确')
assert(REGION_EXPEDITION_ELIXIR_PREP_OPTIONS.length === regionPrepIds.length, '行旅图远征丹药准备选项数量不正确')
for (const itemId of quarryPrepIds) {
  const option = QUARRY_MINE_ELIXIR_PREP_OPTIONS.find(entry => entry.itemId === itemId)
  assert(!!option, `采石场准备物缺少：${itemId}`)
  assert(option?.staminaReduction > 0, `采石场准备物没有体力减免：${itemId}`)
  assert(option?.monsterDamageMultiplier < 1, `采石场准备物没有伤害减免：${itemId}`)
  const linkage = ITEM_LINKAGE_DEFS.find(entry => entry.itemId === itemId)
  assert(linkage?.repeatableSinks.includes('quarry'), `联动矩阵未把 ${itemId} 标记为采石场重复消耗口`)
}
for (const itemId of regionPrepIds) {
  const option = REGION_EXPEDITION_ELIXIR_PREP_OPTIONS.find(entry => entry.itemId === itemId)
  assert(!!option, `远征准备物缺少：${itemId}`)
  assert((option?.journalEffects?.length ?? 0) >= 2, `远征准备物缺少可见日志效果：${itemId}`)
  const linkage = ITEM_LINKAGE_DEFS.find(entry => entry.itemId === itemId)
  assert(linkage?.repeatableSinks.includes('regionMap'), `联动矩阵未把 ${itemId} 标记为行旅图重复消耗口`)
}

const quarryStoreSource = read('src/stores/useQuarryStore.ts')
assert(quarryStoreSource.includes('getQuarryMineElixirPrepOption'), '采石场 store 未读取丹药准备表')
assert(quarryStoreSource.includes('prepItemId: string | null = null'), 'resolveQuarryMineNode 未暴露可选丹药参数')
assert(quarryStoreSource.includes('inventoryStore.getTotalItemCount(elixirPrep.itemId) < 1'), '采石场旧支道缺少丹药库存前置检查')
assert(quarryStoreSource.includes('inventoryStore.removeItemAnywhere(elixirPrep.itemId, 1)'), '采石场旧支道没有真实扣除丹药')
assert(quarryStoreSource.includes('elixirPrep.logEffect'), '采石场旧支道日志缺少丹药效果说明')

const quarryViewSource = read('src/views/game/QuarryView.vue')
assert(quarryViewSource.includes('data-testid="quarry-mine-elixir-prep"'), '采石场页面缺少丹药准备入口')
assert(quarryViewSource.includes('selectedQuarryMineElixirId'), '采石场页面缺少丹药选择状态')
assert(quarryViewSource.includes('resolveQuarryMineNode(index, selectedQuarryMineMode.value, usedElixirId)'), '采石场页面没有把选中丹药传入节点结算')
assert(quarryViewSource.includes(':disabled="option.count <= 0"'), '采石场丹药库存不足时未禁用按钮')

const regionStoreSource = read('src/stores/useRegionMapStore.ts')
assert(regionStoreSource.includes('getRegionExpeditionElixirPrepOption'), '行旅图 store 未读取丹药准备表')
assert(regionStoreSource.includes('applyRegionExpeditionElixirPrep'), '行旅图远征缺少丹药效果应用函数')
assert(regionStoreSource.includes('startRouteExpeditionSession') && regionStoreSource.includes('prepItemId: string | null = null'), '路线远征未暴露可选丹药参数')
assert(regionStoreSource.includes('startBossExpeditionSession') && regionStoreSource.match(/prepItemId: string \| null = null/g)?.length >= 2, '首领远征未暴露可选丹药参数')
assert(regionStoreSource.includes('inventoryStore.removeItemAnywhere(elixirPrep.itemId, 1)'), '行旅图远征没有真实扣除丹药')
assert(regionStoreSource.includes('appendSessionJournal(') && regionStoreSource.includes('prep.journalEffects'), '行旅图远征缺少旅程日志效果')
assert(regionStoreSource.includes('elixirItemId: elixirPrep?.itemId ?? null'), '行旅图发起日志缺少丹药 meta')

const regionViewSource = read('src/views/game/RegionMapView.vue')
assert(regionViewSource.includes('data-testid="region-expedition-elixir-prep"'), '行旅图桌面筹备面板缺少丹药入口')
assert(regionViewSource.includes('selectedExpeditionElixirId'), '行旅图页面缺少丹药选择状态')
assert(regionViewSource.includes('startRouteExpeditionSession(routeId, currentDayTag.value, selectedApproach.value, selectedRetreatRule.value, selectedExpeditionElixirId.value)'), '路线远征发起未传入选中丹药')
assert(regionViewSource.includes('startBossExpeditionSession(regionId, currentDayTag.value, selectedApproach.value, selectedRetreatRule.value, selectedExpeditionElixirId.value)'), '首领远征发起未传入选中丹药')
assert(regionViewSource.includes(':disabled="option.count <= 0"'), '行旅图丹药库存不足时未禁用按钮')

if (errors.length > 0) {
  console.error('qa-elite-elixir-expedition-consumption failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`qa-elite-elixir-expedition-consumption passed (${quarryPrepIds.length} quarry prep elixirs, ${regionPrepIds.length} expedition prep elixirs).`)
