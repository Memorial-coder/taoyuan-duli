import fs from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
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

const assertIncludes = (source, fragment, message) => {
  assert(source.includes(fragment), message)
}

const readSource = relativePath => readFile(path.join(projectRoot, relativePath), 'utf8')

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
    } catch {}
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
      return {
        format: 'module',
        source: transpiled.outputText,
        shortCircuit: true
      }
    }

    return nextLoad(url, context)
  }
})

const [
  recipesSource,
  processingSource,
  itemsSource,
  cookingStoreSource,
  animalStoreSource,
  npcStoreSource,
  regionMapStoreSource,
  questStoreSource,
  dialogsSource,
  cookingViewSource,
  itemEncyclopediaSource
] = await Promise.all([
  readSource('src/data/recipes.ts'),
  readSource('src/data/processing.ts'),
  readSource('src/data/items.ts'),
  readSource('src/stores/useCookingStore.ts'),
  readSource('src/stores/useAnimalStore.ts'),
  readSource('src/stores/useNpcStore.ts'),
  readSource('src/stores/useRegionMapStore.ts'),
  readSource('src/stores/useQuestStore.ts'),
  readSource('src/composables/useDialogs.ts'),
  readSource('src/views/game/CookingView.vue'),
  readSource('src/data/itemEncyclopedia.ts')
])

const recipesModule = await import(pathToFileURL(path.join(projectRoot, 'src/data/recipes.ts')).href)
const processingModule = await import(pathToFileURL(path.join(projectRoot, 'src/data/processing.ts')).href)
const itemsModule = await import(pathToFileURL(path.join(projectRoot, 'src/data/items.ts')).href)
const encyclopediaModule = await import(pathToFileURL(path.join(projectRoot, 'src/data/itemEncyclopedia.ts')).href)
const cropUseProfilesModule = await import(pathToFileURL(path.join(projectRoot, 'src/data/cropUseProfiles.ts')).href)

const {
  RECIPES,
  getRecipeCategoryLabels,
  getRecipeStoryTriggerLabels
} = recipesModule
const { PROCESSING_RECIPES } = processingModule
const { getItemById } = itemsModule
const { getItemExtraDetails, getItemSearchKeywords, getItemUsedIn } = encyclopediaModule
const { getCropUseProfile } = cropUseProfilesModule

const getDetailValue = (details, label) => details.find(detail => detail.label === label)?.value ?? ''
const includesAny = (values, fragment) => values.some(value => String(value).includes(fragment))

const contentCases = [
  {
    cropId: 'yam',
    cookingRecipeId: 'yam_family_porridge',
    cookingName: '山药团圆粥',
    elixirRecipeId: 'alchemy_yam_foundation_elixir',
    elixirItemId: 'yam_foundation_elixir',
    elixirName: '固元山药丹',
    categories: ['家常菜', '宴席菜'],
    triggers: ['家宴团圆', 'NPC 来访话题', '订单委托'],
    effectFragments: ['NPC 对话好感+3', '宠物安抚好感+2']
  },
  {
    cropId: 'garlic',
    cookingRecipeId: 'garlic_radish_side_dish',
    cookingName: '蒜香萝卜',
    elixirRecipeId: 'alchemy_garlic_coldward_elixir',
    elixirItemId: 'garlic_coldward_elixir',
    elixirName: '蒜辛驱寒丹',
    categories: ['家常菜', '节会菜'],
    triggers: ['NPC 来访话题', '节会剧情', '订单委托'],
    effectFragments: ['行动耗时-4%', '受到伤害-5%']
  },
  {
    cropId: 'bitter_gourd',
    cookingRecipeId: 'bitter_gourd_cooling_soup',
    cookingName: '苦瓜清暑汤',
    elixirRecipeId: 'alchemy_bitter_gourd_cooling_elixir',
    elixirItemId: 'bitter_gourd_cooling_elixir',
    elixirName: '苦瓜清暑丹',
    categories: ['家常菜', '节会菜', '旅途干粮'],
    triggers: ['节会剧情', '旅途补给', '订单委托', 'NPC 来访话题'],
    effectFragments: ['远征体力消耗-4%', '采矿体力消耗-5%']
  }
]

for (const testCase of contentCases) {
  const cookingRecipe = RECIPES.find(recipe => recipe.id === testCase.cookingRecipeId)
  assert(!!cookingRecipe, `${testCase.cookingName} 食谱缺失`)
  if (cookingRecipe) {
    assert(cookingRecipe.effect.staminaRestore <= 40, `${testCase.cookingName} 恢复量不应压过剧情用途`)
    assert(cookingRecipe.effect.buff?.value <= 6, `${testCase.cookingName} buff 必须保持轻量`)
    const categoryLabels = getRecipeCategoryLabels(cookingRecipe)
    const triggerLabels = getRecipeStoryTriggerLabels(cookingRecipe)
    for (const label of testCase.categories) {
      assert(categoryLabels.includes(label), `${testCase.cookingName} 缺少分类 ${label}`)
    }
    for (const label of testCase.triggers) {
      assert(triggerLabels.includes(label), `${testCase.cookingName} 缺少剧情触发 ${label}`)
    }
  }

  assertIncludes(cookingStoreSource, `'${testCase.cookingRecipeId}'`, `${testCase.cookingName} 必须在灶台默认可见`)

  const elixirRecipe = PROCESSING_RECIPES.find(recipe => recipe.id === testCase.elixirRecipeId)
  assert(!!elixirRecipe?.alchemy, `${testCase.elixirName} 丹方缺少炼丹结构`)
  if (elixirRecipe?.alchemy) {
    assert(elixirRecipe.inputItemId === testCase.cropId, `${testCase.elixirName} 必须以 ${testCase.cropId} 作为主材`)
    assert(elixirRecipe.alchemy.mainMaterialId === testCase.cropId, `${testCase.elixirName} alchemy.mainMaterialId 不一致`)
    assert(elixirRecipe.alchemy.role === 'support', `${testCase.elixirName} 应保持辅丹定位`)
    assert(elixirRecipe.alchemy.results?.length === 4, `${testCase.elixirName} 必须保留成丹 / 偏丹 / 废丹 / 奇丹四分支`)
    for (const fragment of testCase.effectFragments) {
      assert(elixirRecipe.alchemy.effect.description.includes(fragment), `${testCase.elixirName} 效果缺少 ${fragment}`)
    }
  }

  const elixirItem = getItemById(testCase.elixirItemId)
  assert(elixirItem?.category === 'elixir', `${testCase.elixirName} 必须进入丹药物品表`)

  const profile = getCropUseProfile(testCase.cropId)
  assert(profile?.recommendedUses.includes(testCase.cookingName), `${testCase.cropId} 推荐用途缺少料理 ${testCase.cookingName}`)
  assert(profile?.recommendedUses.includes(testCase.elixirName), `${testCase.cropId} 推荐用途缺少丹药 ${testCase.elixirName}`)

  const cropItem = getItemById(testCase.cropId)
  assert(!!cropItem, `${testCase.cropId} 物品缺失`)
  if (cropItem) {
    const details = getItemExtraDetails(cropItem)
    const dualPath = getDetailValue(details, '料理 / 炼丹双路径')
    assert(dualPath.includes(testCase.cookingName), `${testCase.cropId} 双路径缺少料理 ${testCase.cookingName}`)
    assert(dualPath.includes(testCase.elixirName), `${testCase.cropId} 双路径缺少丹药 ${testCase.elixirName}`)
    assert(dualPath.includes('料理价值') && dualPath.includes('炼丹价值'), `${testCase.cropId} 双路径必须区分料理价值 / 炼丹价值`)

    const usedInEntries = getItemUsedIn(testCase.cropId)
    assert(includesAny(usedInEntries, `料理：${testCase.cookingName}`), `${testCase.cropId} 可用于缺少料理入口`)
    assert(includesAny(usedInEntries, `丹炉：${testCase.elixirName}`), `${testCase.cropId} 可用于缺少丹炉入口`)

    const keywords = getItemSearchKeywords(cropItem)
    for (const fragment of ['同一种作物不同价值', '作物消耗路径对比', '料理价值', '炼丹价值']) {
      assert(includesAny(keywords, fragment), `${testCase.cropId} 搜索缺少 ${fragment}`)
    }
  }

  const foodItem = getItemById(`food_${testCase.cookingRecipeId}`)
  assert(foodItem?.category === 'food', `${testCase.cookingName} 必须生成料理物品`)
  if (foodItem) {
    const foodDetails = getItemExtraDetails(foodItem)
    assert(getDetailValue(foodDetails, '剧情触发').length > 0, `${testCase.cookingName} 百科必须显示剧情触发`)
    assertIncludes(
      getItemSearchKeywords(foodItem).join('\n'),
      '剧情触发',
      `${testCase.cookingName} 搜索必须可按剧情触发找到`
    )
  }
}

const storyConsumptionGuards = [
  [cookingViewSource, 'recentStoryTriggerRecords', '灶台必须展示最近料理线索'],
  [cookingStoreSource, 'storyTriggerRecords', '料理存档必须保留剧情触发记录'],
  [cookingStoreSource, 'consumeStoryTriggerRecord', '料理记录必须可被剧情消费'],
  [npcStoreSource, 'FIXED_NPC_TALK_COOKING_TOPIC_LABELS', '固定 NPC 聊天必须消费料理线索'],
  [npcStoreSource, 'FIXED_NPC_GIFT_COOKING_TOPIC_LABELS', '固定 NPC 送礼必须消费料理线索'],
  [npcStoreSource, 'RANDOM_NPC_COOKING_TOPIC_LABELS', '随机 NPC 对话必须消费料理线索'],
  [animalStoreSource, 'PET_COOKING_TOPIC_LABELS', '宠物特别喂食必须消费料理线索'],
  [dialogsSource, 'FESTIVAL_COOKING_TOPIC_LABELS', '节会结算必须消费料理线索'],
  [regionMapStoreSource, 'JOURNEY_COOKING_TOPIC_LABELS', '行旅路线必须消费料理线索'],
  [questStoreSource, 'ORDER_COOKING_TOPIC_LABELS', '任务 / 订单必须消费料理线索'],
  [itemEncyclopediaSource, "'温和 buff'", '百科搜索必须保留温和 buff 入口']
]

for (const [source, fragment, message] of storyConsumptionGuards) {
  assertIncludes(source, fragment, message)
}

const cookingModalTimeGuards = [
  [cookingViewSource, '制作耗时', '灶台烹饪弹窗必须显示制作耗时'],
  [cookingViewSource, 'modalCookingTimeLabel', '灶台烹饪弹窗耗时必须随数量响应式更新'],
  [cookingViewSource, 'getCookingTimeCostHours(qty)', '灶台烹饪执行耗时必须复用弹窗显示计算']
]

for (const [source, fragment, message] of cookingModalTimeGuards) {
  assertIncludes(source, fragment, message)
}

for (const fragment of ['山药团圆粥', '蒜香萝卜', '苦瓜清暑汤', '固元山药丹', '蒜辛驱寒丹', '苦瓜清暑丹']) {
  assertIncludes(
    recipesSource + '\n' + processingSource + '\n' + itemsSource + '\n' + cookingStoreSource + '\n' + itemEncyclopediaSource,
    fragment,
    `内容表搜索源缺少 ${fragment}`
  )
}

if (errors.length > 0) {
  console.error('[qa-alchemy-cooking-content-table] FAILED')
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log('[qa-alchemy-cooking-content-table] OK')
