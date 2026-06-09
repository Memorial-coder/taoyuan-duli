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
const wildTrees = await import(pathToFileURL(path.join(srcRoot, 'data', 'wildTrees.ts')).href)

const {
  ITEMS,
  getItemById,
  migrateLegacyItemId,
  LEGACY_AMBIGUOUS_ITEM_ID_COMPATIBILITY,
  PROCESSING_RECIPES,
  FRUIT_TREE_DEFS,
  FORAGE_ITEMS,
  HIDDEN_NPCS,
  ANIMAL_DEFS,
  FEED_DEFS
} = data
const { WILD_TREE_DEFS } = wildTrees

const duplicateIds = [...ITEMS.reduce((acc, item) => {
  const next = (acc.get(item.id) ?? 0) + 1
  acc.set(item.id, next)
  return acc
}, new Map()).entries()]
  .filter(([, count]) => count > 1)
  .map(([id, count]) => `${id}×${count}`)

assert(duplicateIds.length === 0, `ITEMS 存在重复 ID：${duplicateIds.join(', ')}`)

const expectItem = (id, expected) => {
  const item = getItemById(id)
  assert(!!item, `缺少物品定义：${id}`)
  if (!item) return
  for (const [key, value] of Object.entries(expected)) {
    assert(item[key] === value, `${id}.${key} 应为 ${String(value)}，实际为 ${String(item[key])}`)
  }
}

expectItem('osmanthus_tea', { category: 'crop', sellPrice: 420, edible: true })
expectItem('processed_osmanthus_tea', { category: 'processed', sellPrice: 780, edible: true })
expectItem('dragon_pearl', { category: 'crop', sellPrice: 900, edible: true })
expectItem('spirit_dragon_pearl', { category: 'misc', sellPrice: 0, edible: false })
expectItem('lychee', { category: 'crop', sellPrice: 270, edible: true })
expectItem('tree_lychee', { category: 'fruit', sellPrice: 120, edible: true })
expectItem('persimmon', { category: 'crop', sellPrice: 225, edible: true })
expectItem('tree_persimmon', { category: 'fruit', sellPrice: 127, edible: true })
expectItem('mulberry', { category: 'crop', sellPrice: 60, edible: true })
expectItem('wild_mulberry', { category: 'misc', sellPrice: 25, edible: true })
expectItem('quail_egg', { category: 'animal_product', sellPrice: 65 })
expectItem('pigeon_egg', { category: 'animal_product', sellPrice: 140 })
expectItem('duck_egg', { category: 'animal_product', sellPrice: 180 })
expectItem('rabbit_fur', { category: 'animal_product', sellPrice: 330 })
expectItem('goat_milk', { category: 'animal_product', sellPrice: 240 })
expectItem('buffalo_milk', { category: 'animal_product', sellPrice: 230 })
expectItem('donkey_milk', { category: 'animal_product', sellPrice: 300 })
expectItem('ostrich_egg', { category: 'animal_product', sellPrice: 520 })
expectItem('antler_velvet', { category: 'animal_product', sellPrice: 900 })

const hayFeedPrice = FEED_DEFS.find(feed => feed.id === 'hay')?.price ?? 50
for (const animal of ANIMAL_DEFS) {
  if (!animal.productId || animal.produceDays <= 0) continue
  const product = getItemById(animal.productId)
  assert(!!product, `${animal.type} 产物缺少物品定义：${animal.productId}`)
  if (!product) continue
  const normalCycleProfit = product.sellPrice - hayFeedPrice * animal.produceDays
  assert(
    normalCycleProfit >= 0,
    `${animal.type} 普通品质基础喂养不应亏本：${animal.productId} ${product.sellPrice} - 干草 ${hayFeedPrice}×${animal.produceDays}`
  )
}

const recipeById = id => PROCESSING_RECIPES.find(recipe => recipe.id === id)
assert(recipeById('brew_osmanthus')?.outputItemId === 'processed_osmanthus_tea', 'brew_osmanthus 应产出 processed_osmanthus_tea')
assert(recipeById('spirit_forge_dragon_pearl')?.outputItemId === 'spirit_dragon_pearl', 'spirit_forge_dragon_pearl 应产出 spirit_dragon_pearl')
assert(HIDDEN_NPCS.find(npc => npc.id === 'long_ling')?.bondItemId === 'spirit_dragon_pearl', '龙灵结缘应消耗 spirit_dragon_pearl')
assert(FRUIT_TREE_DEFS.find(tree => tree.type === 'lychee_tree')?.fruitId === 'tree_lychee', '荔枝树应产出 tree_lychee')
assert(FRUIT_TREE_DEFS.find(tree => tree.type === 'persimmon_tree')?.fruitId === 'tree_persimmon', '柿树应产出 tree_persimmon')
assert(FORAGE_ITEMS.some(item => item.itemId === 'wild_mulberry'), '觅食表应产出 wild_mulberry')
assert(WILD_TREE_DEFS.find(tree => tree.type === 'mulberry')?.seedItemId === 'wild_mulberry', '桑树种植应消耗 wild_mulberry')

assert(migrateLegacyItemId('osmanthus_tea', 'quest_reward') === 'processed_osmanthus_tea', '任务奖励旧桂花茶应迁移到加工茶')
assert(migrateLegacyItemId('osmanthus_tea', 'general') === 'osmanthus_tea', '通用旧桂花茶应保留作物身份')
assert(migrateLegacyItemId('dragon_pearl', 'hidden_npc_bond') === 'spirit_dragon_pearl', '结缘旧龙珠应迁移到信物')
assert(
  LEGACY_AMBIGUOUS_ITEM_ID_COMPATIBILITY.length >= 5,
  '旧歧义 ID 兼容策略应覆盖五个高风险 ID'
)

const manifestPath = path.join(projectRoot, 'public', 'item', 'item-icon-manifest.json')
const qaReportPath = path.join(projectRoot, 'public', 'item', 'item-icon-qa-report.json')
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  for (const itemId of ['processed_osmanthus_tea', 'spirit_dragon_pearl', 'tree_lychee', 'tree_persimmon', 'wild_mulberry']) {
    assert(!!manifest.byId?.[itemId], `item-icon-manifest 缺少 ${itemId}`)
  }
}
if (fs.existsSync(qaReportPath)) {
  const qaReport = JSON.parse(fs.readFileSync(qaReportPath, 'utf8'))
  const runtimeDuplicates = qaReport.idMapping?.runtimeDuplicateIds ?? []
  assert(runtimeDuplicates.length === 0, `item-icon QA 仍存在运行时重复 ID：${runtimeDuplicates.map(entry => entry.id).join(', ')}`)
}

if (errors.length > 0) {
  console.error('qa:item-data-guards failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa:item-data-guards passed')
