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
assert(ancientWine?.outputItemId === 'celestial_fruit_wine', '远古水果隐藏配方应进入通用果酒顶档 celestial_fruit_wine')
assert(ancientWine?.hiddenMeta?.gate?.workshopLevel === 2, '远古水果隐藏配方需要工坊 Lv.2 门槛')
assert(ancientWine?.hiddenMeta?.gate?.requiredItemId === 'ancient_fruit', '远古水果隐藏配方需要持有 ancient_fruit 才出现')

const ancientFruitItem = getItemById('ancient_fruit')
const ancientWineItem = getItemById(ancientWine?.outputItemId ?? '')
assert(!!ancientFruitItem, '缺少远古水果物品定义 ancient_fruit')
assert(!!ancientWineItem, '缺少远古水果隐藏酿酒产物定义')
assert(ancientWine?.inputQuantity === 1, 'ancient fruit wine should consume exactly 1 ancient fruit.')
assert(ancientWine?.outputQuantity === 1, 'ancient fruit wine should produce exactly 1 bottle.')
assert(ancientWine?.processingDays === 4, 'ancient fruit hidden wine should follow valuable crop 4-day brewing.')
assert(
  ancientWineItem?.sellPrice === 28000,
  `ancient fruit hidden wine output should match celestial fruit wine price: ${ancientWineItem?.sellPrice ?? 0}`
)
assert(
  ancientWineItem?.staminaRestore === 720,
  `ancient fruit hidden wine stamina should match celestial fruit wine: ${ancientWineItem?.staminaRestore ?? 0}`
)
assert(
  ancientWineItem?.healthRestore === 360,
  `ancient fruit hidden wine health should match celestial fruit wine: ${ancientWineItem?.healthRestore ?? 0}`
)

const ancientProfile = getCropUseProfile('ancient_fruit')
assert(ancientProfile?.tags.includes('wine'), '远古水果用途档案必须包含 wine')
assert(ancientProfile?.tags.includes('alchemy'), '远古水果用途档案必须包含 alchemy')
assert(ancientProfile?.tags.includes('gift'), '远古水果用途档案必须包含 gift')
assert(ancientProfile?.tags.includes('festival'), '远古水果用途档案必须包含 festival')
assert(ancientProfile?.tags.includes('online_cost'), '远古水果用途档案必须包含 online_cost')

const hiddenBalanceMachineTypes = new Set([
  'wine_workshop',
  'sauce_jar',
  'sugar_jar',
  'bee_house',
  'oil_press',
  'smoker',
  'drying_rack',
  'dehydrator',
  'mill',
  'tea_maker',
  'tofu_press',
  'herb_grinder',
  'incense_maker'
])
const publicBalanceMachineTypes = hiddenBalanceMachineTypes

const getRecipeInputEntries = recipe => {
  const entries = []
  if (recipe.inputItemId) entries.push({ itemId: recipe.inputItemId, quantity: recipe.inputQuantity })
  for (const extra of recipe.extraInputs || []) entries.push(extra)
  return entries
}

const getRecipeInputValue = recipe => getRecipeInputEntries(recipe)
  .reduce((total, entry) => total + (getItemById(entry.itemId)?.sellPrice ?? 0) * entry.quantity, 0)

const getRecipeOutputValue = recipe => (getItemById(recipe.outputItemId)?.sellPrice ?? 0) * recipe.outputQuantity

const getRecipeInputRecovery = recipe => getRecipeInputEntries(recipe).reduce((total, entry) => {
  const item = getItemById(entry.itemId)
  return {
    stamina: total.stamina + (item?.staminaRestore ?? 0) * entry.quantity,
    health: total.health + (item?.healthRestore ?? 0) * entry.quantity
  }
}, { stamina: 0, health: 0 })

const getRecipeOutputRecovery = recipe => {
  const item = getItemById(recipe.outputItemId)
  return {
    edible: !!item?.edible,
    stamina: (item?.staminaRestore ?? 0) * recipe.outputQuantity,
    health: (item?.healthRestore ?? 0) * recipe.outputQuantity
  }
}

const getHiddenProcessingMinimumMultiplier = recipe => {
  if (recipe.machineType === 'wine_workshop') return 3 + Math.max(0, recipe.processingDays - 3) * 0.5
  if (recipe.machineType === 'smoker') return 2
  if (['oil_press', 'mill', 'herb_grinder', 'tofu_press'].includes(recipe.machineType)) return 1.1
  if (recipe.machineType === 'bee_house') return 1.5
  return 1.25
}

for (const recipe of hiddenRecipes) {
  if (!hiddenBalanceMachineTypes.has(recipe.machineType)) continue

  const inputValue = getRecipeInputValue(recipe)
  const outputValue = getRecipeOutputValue(recipe)
  const minimumValue = Math.ceil(inputValue * getHiddenProcessingMinimumMultiplier(recipe))
  if (recipe.id !== 'hidden_wine_ancient_fruit') {
    assert(
      outputValue >= minimumValue,
      `${recipe.id} 隐藏加工收益倒挂：${outputValue} < ${minimumValue}（投入 ${inputValue}，产物 ${recipe.outputItemId}）`
    )
  }

  const inputRecovery = getRecipeInputRecovery(recipe)
  const outputRecovery = getRecipeOutputRecovery(recipe)
  if (outputRecovery.edible) {
    assert(
      outputRecovery.stamina >= inputRecovery.stamina,
      `${recipe.id} 隐藏加工体力恢复倒挂：${outputRecovery.stamina} < ${inputRecovery.stamina}（产物 ${recipe.outputItemId}）`
    )
    assert(
      outputRecovery.health >= inputRecovery.health,
      `${recipe.id} 隐藏加工生命恢复倒挂：${outputRecovery.health} < ${inputRecovery.health}（产物 ${recipe.outputItemId}）`
    )
  }
}

for (const recipe of PROCESSING_RECIPES) {
  if (recipe.visibility === 'hidden' || !publicBalanceMachineTypes.has(recipe.machineType)) continue

  const inputValue = getRecipeInputValue(recipe)
  const outputValue = getRecipeOutputValue(recipe)
  if (inputValue <= 0 || outputValue <= 0) continue

  assert(
    outputValue >= inputValue,
    `${recipe.id} public processing value loss: ${outputValue} < ${inputValue} (${recipe.outputItemId})`
  )

  const inputRecovery = getRecipeInputRecovery(recipe)
  const outputRecovery = getRecipeOutputRecovery(recipe)
  if (outputRecovery.edible) {
    assert(
      outputRecovery.stamina >= inputRecovery.stamina,
      `${recipe.id} public processing stamina loss: ${outputRecovery.stamina} < ${inputRecovery.stamina} (${recipe.outputItemId})`
    )
    assert(
      outputRecovery.health >= inputRecovery.health,
      `${recipe.id} public processing health loss: ${outputRecovery.health} < ${inputRecovery.health} (${recipe.outputItemId})`
    )
  }
}

for (const itemId of [
  'mixed_fruit_wine',
  'seasonal_fruit_wine',
  'spirit_fruit_brew',
  'mystic_fruit_wine',
  'celestial_fruit_wine',
  'ancient_fruit_wine',
  'mixed_pickles',
  'root_pickles',
  'fine_pickles',
  'spirit_pickles',
  'celestial_pickles',
  'artisan_seed_oil',
  'spirit_seed_oil',
  'celestial_seed_oil',
  'mixed_flour',
  'fine_flour',
  'premium_flour',
  'spirit_flour',
  'celestial_flour',
  'medicinal_powder',
  'fine_medicinal_powder',
  'spirit_medicinal_powder',
  'celestial_medicinal_powder',
  'candied_fruit_mix',
  'fine_candied_fruit',
  'spirit_candied_fruit',
  'mystic_candied_fruit',
  'celestial_candied_fruit',
  'wildflower_honey',
  'fine_wildflower_honey',
  'spirit_wildflower_honey',
  'celestial_wildflower_honey',
  'dried_crop_bundle',
  'fine_dried_crop_bundle',
  'spirit_dried_crop_bundle',
  'celestial_dried_crop_bundle',
  'dried_fruit_mix',
  'fine_dried_fruit_mix',
  'spirit_dried_fruit_mix',
  'celestial_dried_fruit_mix',
  'herbal_tea_blend',
  'fine_herbal_tea_blend',
  'spirit_herbal_tea_blend',
  'celestial_herbal_tea_blend',
  'mixed_tofu',
  'firm_mixed_tofu',
  'spirit_tofu',
  'celestial_tofu',
  'rustic_incense',
  'refined_incense',
  'spirit_incense',
  'celestial_incense',
  'smoked_fish',
  'smoked_prime_fish',
  'smoked_legendary_fish'
]) {
  assert(ITEMS.some(item => item.id === itemId), `缺少隐藏加工通用产物：${itemId}`)
}

const processingStoreSource = fs.readFileSync(path.join(srcRoot, 'stores', 'useProcessingStore.ts'), 'utf8')
assert(processingStoreSource.includes('discoveredProcessingRecipeIds'), 'processing store 必须序列化 discoveredProcessingRecipeIds')
assert(processingStoreSource.includes('normalizeDiscoveredProcessingRecipeIds'), 'processing store 必须清理非法隐藏配方发现 ID')
assert(processingStoreSource.includes('discoverProcessingRecipe(recipe.id)'), '收取成品时必须发现隐藏配方')
const workshopUpgradeStart = processingStoreSource.indexOf('const WORKSHOP_UPGRADES = [')
const workshopUpgradeEnd = processingStoreSource.indexOf('export const WORKSHOP_MAX_LEVEL')
const workshopUpgradeBlock = workshopUpgradeStart >= 0 && workshopUpgradeEnd > workshopUpgradeStart
  ? processingStoreSource.slice(workshopUpgradeStart, workshopUpgradeEnd)
  : ''
const workshopUpgradeLevels = [...workshopUpgradeBlock.matchAll(/level:\s*(\d+)/g)].map(match => Number(match[1]))
const workshopMaterialIds = [...workshopUpgradeBlock.matchAll(/itemId:\s*'([^']+)'/g)].map(match => match[1])
assert(workshopUpgradeLevels.join(',') === '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15', `工坊扩建等级必须连续到 Lv.15：${workshopUpgradeLevels.join(',')}`)
assert(processingStoreSource.includes('const maxMachines = computed(() => 15 + workshopLevel.value * 5)'), '工坊机器上限公式必须保持 Lv.15 可达 90 台')
assert(15 + Math.max(...workshopUpgradeLevels, 0) * 5 === 90, '工坊最高等级必须提供 90 台机器上限')
assert(workshopMaterialIds.includes('bronze_bar'), 'workshop upgrades should consume bronze_bar')
assert(workshopMaterialIds.includes('mythril_bar'), 'workshop upgrades should consume mythril_bar')
for (const itemId of workshopMaterialIds) {
  assert(!!getItemById(itemId), `工坊扩建材料缺少物品定义：${itemId}`)
}

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
