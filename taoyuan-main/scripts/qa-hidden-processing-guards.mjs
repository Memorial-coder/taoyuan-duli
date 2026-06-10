/* global console, process */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import ts from 'typescript'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const workspaceRoot = path.resolve(projectRoot, '..')
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

const { ITEMS, PROCESSING_RECIPES, getItemById, getCropUseProfile } = data

const inputSignature = recipe => {
  const extras = (recipe.extraInputs || [])
    .map(extra => `${extra.itemId}:${extra.quantity}`)
    .sort()
    .join(',')
  return `${recipe.machineType}|${recipe.inputItemId || 'none'}|${extras}`
}

const hiddenRecipes = PROCESSING_RECIPES.filter(recipe => recipe.visibility === 'hidden')
const hiddenById = new Map(hiddenRecipes.map(recipe => [recipe.id, recipe]))
const allBySignature = new Map()

for (const recipe of PROCESSING_RECIPES) {
  const signature = inputSignature(recipe)
  if (!allBySignature.has(signature)) {
    allBySignature.set(signature, [])
  }
  allBySignature.get(signature).push(recipe)
}

const duplicateHiddenInputs = [...allBySignature.entries()]
  .map(([signature, recipes]) => ({
    signature,
    hidden: recipes.filter(recipe => recipe.visibility === 'hidden'),
    publicRecipe: recipes.find(recipe => recipe.visibility !== 'hidden')
  }))
  .filter(entry => entry.hidden.length > 1 || (entry.hidden.length > 0 && entry.publicRecipe))

assert(duplicateHiddenInputs.length === 0, `隐藏配方存在重复或覆盖显式配方：${duplicateHiddenInputs.map(entry => entry.signature).join(', ')}`)

for (const recipe of hiddenRecipes) {
  assert(!!recipe.hiddenMeta?.unknownName, `${recipe.id} 缺少 hiddenMeta.unknownName`)
  assert(!!recipe.hiddenMeta?.familyId, `${recipe.id} 缺少 hiddenMeta.familyId`)
  assert(recipe.hiddenMeta?.revealOn === 'collect', `${recipe.id} revealOn 必须为 collect`)
  assert(!!getItemById(recipe.outputItemId), `${recipe.id} 缺少输出物品：${recipe.outputItemId}`)
  if (recipe.inputItemId) assert(!!getItemById(recipe.inputItemId), `${recipe.id} 缺少输入物品：${recipe.inputItemId}`)
  for (const extra of recipe.extraInputs || []) {
    assert(!!getItemById(extra.itemId), `${recipe.id} 缺少副材料物品：${extra.itemId}`)
  }
}

const ancientWine = hiddenById.get('hidden_wine_ancient_fruit')
assert(!!ancientWine, '缺少远古水果隐藏酿酒配方 hidden_wine_ancient_fruit')
assert(ancientWine?.machineType === 'wine_workshop', '远古水果隐藏配方必须属于酒坊')
assert(ancientWine?.inputItemId === 'ancient_fruit', '远古水果隐藏配方输入必须为 ancient_fruit')
assert(ancientWine?.outputItemId === 'ancient_fruit_wine', '远古水果隐藏配方输出必须为 ancient_fruit_wine')
assert(ancientWine?.hiddenMeta?.gate?.workshopLevel === 2, '远古水果隐藏配方需要工坊 Lv.2 门槛')
assert(ancientWine?.hiddenMeta?.gate?.requiredItemId === 'ancient_fruit', '远古水果隐藏配方需要持有 ancient_fruit 才出现')

const ancientProfile = getCropUseProfile('ancient_fruit')
assert(ancientProfile?.tags.includes('wine'), '远古水果用途档案必须包含 wine')
assert(ancientProfile?.tags.includes('alchemy'), '远古水果用途档案必须包含 alchemy')
assert(ancientProfile?.tags.includes('gift'), '远古水果用途档案必须包含 gift')
assert(ancientProfile?.tags.includes('festival'), '远古水果用途档案必须包含 festival')
assert(ancientProfile?.tags.includes('online_cost'), '远古水果用途档案必须包含 online_cost')

for (const itemId of [
  'mixed_fruit_wine',
  'seasonal_fruit_wine',
  'spirit_fruit_brew',
  'ancient_fruit_wine',
  'mixed_pickles',
  'root_pickles',
  'mixed_flour',
  'fine_flour',
  'medicinal_powder',
  'wildflower_honey'
]) {
  assert(ITEMS.some(item => item.id === itemId), `缺少隐藏加工通用产物：${itemId}`)
}

const processingStoreSource = fs.readFileSync(path.join(srcRoot, 'stores', 'useProcessingStore.ts'), 'utf8')
assert(processingStoreSource.includes('discoveredProcessingRecipeIds'), 'processing store 必须序列化 discoveredProcessingRecipeIds')
assert(processingStoreSource.includes('normalizeDiscoveredProcessingRecipeIds'), 'processing store 必须清理非法隐藏配方发现 ID')
assert(processingStoreSource.includes('discoverProcessingRecipe(recipe.id)'), '收取成品时必须发现隐藏配方')

const cohabitationRuntimeSource = fs.readFileSync(path.join(workspaceRoot, 'server', 'src', 'taoyuanCohabitationRuntime.js'), 'utf8')
assert(cohabitationRuntimeSource.includes('shared_hidden_wine_ancient_fruit'), '共同工坊必须登记远古果酒隐藏共享配方')
assert(cohabitationRuntimeSource.includes("local_processing_recipe_id: 'hidden_wine_ancient_fruit'"), '共同远古果酒必须映射本地隐藏配方 ID')
assert(cohabitationRuntimeSource.includes('shared_hidden_medicine_ginger'), '共同工坊必须登记至少一个普通隐藏通配样本')

const onlineCohabitationViewSource = fs.readFileSync(path.join(srcRoot, 'views', 'game', 'online', 'OnlineCohabitationView.vue'), 'utf8')
assert(onlineCohabitationViewSource.includes('sharedWorkshopRecipeDisplayLabel'), '共同工坊前端必须按发现状态显示隐藏配方名称')
assert(onlineCohabitationViewSource.includes('processingStore.discoverProcessingRecipe(localProcessingRecipeId)'), '共同工坊成功处理隐藏配方后必须写入本地发现状态')

if (errors.length > 0) {
  console.error('隐藏加工配方 QA 失败：')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`隐藏加工配方 QA 通过：${hiddenRecipes.length} 条隐藏配方，${PROCESSING_RECIPES.length} 条总加工配方。`)
