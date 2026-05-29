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

const readSource = relativePath => readFile(path.join(projectRoot, relativePath), 'utf8')

const [cropUseProfiles, inventoryView, itemEncyclopedia] = await Promise.all([
  readSource('src/data/cropUseProfiles.ts'),
  readSource('src/views/game/InventoryView.vue'),
  readSource('src/data/itemEncyclopedia.ts')
])

const errors = []

const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const assertIncludes = (source, fragment, message) => {
  assert(source.includes(fragment), message)
}

const hookState = {
  registered: false,
  modulesPromise: null
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
    } catch {}
  }
  return null
}

const installTypeScriptHooks = () => {
  if (hookState.registered) return
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
  hookState.registered = true
}

const loadRuntimeModules = async () => {
  if (!hookState.modulesPromise) {
    hookState.modulesPromise = (async () => {
      installTypeScriptHooks()
      const cropUseProfilesModule = await import(pathToFileURL(path.join(projectRoot, 'src/data/cropUseProfiles.ts')).href)
      const cropsModule = await import(pathToFileURL(path.join(projectRoot, 'src/data/crops.ts')).href)
      const itemsModule = await import(pathToFileURL(path.join(projectRoot, 'src/data/items.ts')).href)
      const itemEncyclopediaModule = await import(pathToFileURL(path.join(projectRoot, 'src/data/itemEncyclopedia.ts')).href)

      return {
        CROPS: cropsModule.CROPS,
        getCropUseProfile: cropUseProfilesModule.getCropUseProfile,
        getCropUseTagLabels: cropUseProfilesModule.getCropUseTagLabels,
        getCropUseTagSearchKeywords: cropUseProfilesModule.getCropUseTagSearchKeywords,
        getItemById: itemsModule.getItemById,
        getItemExtraDetails: itemEncyclopediaModule.getItemExtraDetails,
        getItemUsedIn: itemEncyclopediaModule.getItemUsedIn,
        getItemSearchKeywords: itemEncyclopediaModule.getItemSearchKeywords
      }
    })()
  }

  return hookState.modulesPromise
}

const getDetailValue = (details, label) => details.find(detail => detail.label === label)?.value ?? ''

const assertRuntimeIncludes = (values, fragment, message) => {
  assert(values.some(value => String(value).includes(fragment)), message)
}

const requiredTags = [
  'food',
  'alchemy',
  'pet_feed',
  'animal_feed',
  'oil',
  'flour',
  'wine',
  'pickle',
  'gift',
  'festival',
  'order',
  'online_cost',
  'medicine'
]

for (const tag of requiredTags) {
  assertIncludes(cropUseProfiles, `| '${tag}'`, `CropUseTag union 缺少 ${tag}`)
  assertIncludes(cropUseProfiles, `${tag}:`, `用途标签映射缺少 ${tag}`)
}

for (const exportName of [
  'CROP_USE_TAG_LABELS',
  'CROP_USE_TAG_FILTER_HINTS',
  'CROP_USE_TAG_SEARCH_KEYWORDS',
  'getCropUseProfile',
  'getCropUseTagLabels',
  'getCropUseTagSearchKeywords',
  'getCropUseTagMatches'
]) {
  assertIncludes(cropUseProfiles, `export const ${exportName}`, `cropUseProfiles 缺少 ${exportName} 导出`)
}

assertIncludes(inventoryView, 'settingsStore.inventoryCropUseFilter', '背包筛选必须读取 inventoryCropUseFilter')
assertIncludes(inventoryView, 'const CROP_USE_FILTER_TAGS = Object.keys(CROP_USE_TAG_LABELS) as CropUseTag[]', '背包筛选必须从 CROP_USE_TAG_LABELS 枚举用途标签')
assertIncludes(inventoryView, 'const allowedCropUseTags = new Set(settingsStore.inventoryCropUseFilter)', '背包筛选必须建立用途标签筛选集合')
assertIncludes(inventoryView, "if (def.category !== 'crop') return false", '用途筛选必须限制为作物物品')
assertIncludes(inventoryView, 'const profile = getCropUseProfile(def.id)', '背包筛选必须读取 CropUseProfile')
assertIncludes(inventoryView, 'profile.tags.some(tag => allowedCropUseTags.has(tag))', '背包筛选必须按 profile.tags 命中')
assertIncludes(inventoryView, 'const cropUseRecommendations = computed', '背包必须保留库存用途建议')
assertIncludes(inventoryView, 'const activeCropUseProfile = computed', '背包详情必须保留作物用途档案')
assertIncludes(inventoryView, 'return getCropUseTagLabels(activeCropUseProfile.value)', '背包详情必须显示用途标签中文名')
assertIncludes(inventoryView, 'activeCropUseProfile.recommendedUses.join', '背包详情必须显示推荐用途')

assertIncludes(itemEncyclopedia, 'getCropUseProfile', '百科必须读取 CropUseProfile')
assertIncludes(itemEncyclopedia, 'getCropUseTagLabels', '百科详情必须显示用途标签')
assertIncludes(itemEncyclopedia, 'getCropUseTagSearchKeywords', '百科搜索必须接入用途标签关键词')
assertIncludes(itemEncyclopedia, "pushDetail(details, '用途标签'", '百科详情必须写入用途标签')
assertIncludes(itemEncyclopedia, "pushDetail(details, '推荐用途'", '百科详情必须写入推荐用途')
assertIncludes(itemEncyclopedia, "'作物用途标签'", '百科搜索必须包含作物用途标签关键词')
assertIncludes(itemEncyclopedia, "'CropUseProfile'", '百科搜索必须包含 CropUseProfile 关键词')
assertIncludes(itemEncyclopedia, '...getCropUseTagSearchKeywords(cropUseProfile.tags)', '百科搜索必须展开用途标签搜索关键词')
assertIncludes(itemEncyclopedia, '...cropUseProfile.recommendedUses', '百科搜索必须收录推荐用途')
assertIncludes(itemEncyclopedia, "'料理读取用途标签'", '百科搜索必须保留料理读取用途标签入口')
assertIncludes(itemEncyclopedia, "'炼丹读取用途标签'", '百科搜索必须保留炼丹读取用途标签入口')
assertIncludes(itemEncyclopedia, "'宠物喂食读取用途标签'", '百科搜索必须保留宠物喂食用途标签入口')
assertIncludes(itemEncyclopedia, "'订单用途筛选'", '百科搜索必须保留订单用途筛选入口')
assertIncludes(itemEncyclopedia, "'节会用途筛选'", '百科搜索必须保留节会用途筛选入口')

const {
  CROPS,
  getCropUseProfile,
  getCropUseTagLabels,
  getCropUseTagSearchKeywords,
  getItemById,
  getItemExtraDetails,
  getItemUsedIn,
  getItemSearchKeywords
} = await loadRuntimeModules()

const cropRuntimeCases = [
  {
    cropId: 'chives',
    tags: ['food', 'medicine', 'festival', 'order'],
    labels: ['料理', '订单', '节会', '药材'],
    recommendedUses: ['韭菜炒蛋'],
    keywordFragments: ['作物用途标签', 'CropUseProfile', '订单用途筛选', '节会用途筛选', 'order 用途标签', 'festival 用途标签'],
    detailFragments: ['韭菜炒蛋', '料理按用途标签读取：韭菜炒蛋']
  },
  {
    cropId: 'hanhai_cactus',
    tags: ['food', 'medicine', 'gift', 'festival', 'order'],
    labels: ['料理', '赠礼', '订单', '节会', '药材'],
    recommendedUses: ['仙人掌汤'],
    keywordFragments: ['作物用途标签', 'CropUseProfile', '仙人掌汤', '料理按用途标签读取：仙人掌汤', '订单用途筛选', '节会用途筛选'],
    detailFragments: ['仙人掌汤', '料理按用途标签读取：仙人掌汤']
  },
  {
    cropId: 'hanhai_date',
    tags: ['food', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    labels: ['料理', '赠礼', '订单', '节会', '联机消耗', '药材'],
    recommendedUses: ['枣糕', '公共仓干粮包'],
    keywordFragments: ['作物用途标签', 'CropUseProfile', '枣糕', '料理按用途标签读取：枣糕', '订单用途筛选', '节会用途筛选', 'online_cost 用途标签'],
    detailFragments: ['枣糕', '公共仓干粮包', '料理按用途标签读取：枣糕']
  },
  {
    cropId: 'lychee',
    tags: ['food', 'gift', 'festival', 'order'],
    labels: ['料理', '赠礼', '订单', '节会'],
    recommendedUses: ['荔枝干', '岭南鲜果赠礼'],
    keywordFragments: ['作物用途标签', 'CropUseProfile', '荔枝干', '岭南鲜果赠礼', '订单用途筛选', '节会用途筛选'],
    detailFragments: ['荔枝干', '岭南鲜果赠礼']
  },
  {
    cropId: 'radish',
    tags: ['food', 'pet_feed', 'animal_feed', 'alchemy', 'order', 'pickle', 'medicine'],
    labels: ['料理', '炼丹', '宠物粮', '动物饲料', '订单', '腌制', '药材'],
    recommendedUses: ['石根护脉丸'],
    keywordFragments: ['炼丹读取用途标签', '炼丹按用途标签读取：石根护脉丸', '宠物喂食读取用途标签', '灵宠', '订单用途筛选'],
    detailFragments: ['石根护脉丸', '炼丹按用途标签读取：石根护脉丸']
  },
  {
    cropId: 'tea',
    tags: ['food', 'alchemy', 'pet_feed', 'gift', 'order', 'medicine'],
    labels: ['料理', '炼丹', '宠物粮', '赠礼', '订单', '药材'],
    recommendedUses: ['茶心凝神丹', '灵宠清茶餐'],
    keywordFragments: ['炼丹读取用途标签', '宠物喂食读取用途标签', '灵宠', '清茶灵叶餐', 'pet_feed 用途标签'],
    detailFragments: ['茶心凝神丹', '宠物偏好', '灵宠']
  },
  {
    cropId: 'pumpkin',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'festival', 'order'],
    labels: ['料理', '炼丹', '宠物粮', '动物饲料', '订单', '节会'],
    recommendedUses: ['南瓜汤', '南瓜聚火丹', '宠物亲密餐'],
    keywordFragments: ['炼丹读取用途标签', '炼丹按用途标签读取：南瓜聚火丹', '宠物喂食读取用途标签', '动物喂食读取用途标签', '订单用途筛选'],
    detailFragments: ['南瓜聚火丹', '炼丹按用途标签读取：南瓜聚火丹', '宠物偏好']
  }
]

const publicWarehouseRuntimeCases = [
  {
    cropId: 'rice',
    expectedUses: [
      '村社公共仓：稻米入仓',
      '联机节会：节庆宴席备菜消耗公共仓稻米',
      '村社修桥：修桥慰劳饭消耗公共仓稻米'
    ],
    keywordFragments: ['联机消耗', '公共仓消耗', '公共订单', '公共仓粥底', '联机消耗筛选', 'online_cost 用途标签']
  },
  {
    cropId: 'sesame',
    expectedUses: [
      '村社公共仓：芝麻入仓',
      '公共订单：点心订单可消耗公共仓芝麻'
    ],
    keywordFragments: ['联机消耗', '公共仓消耗', '公共订单', '公共仓点心备料', '点心订单', 'online_cost 用途标签']
  },
  {
    cropId: 'sweet_potato',
    expectedUses: [
      '村社公共仓：红薯入仓',
      '公共订单：粗粮包可消耗公共仓红薯'
    ],
    keywordFragments: ['联机消耗', '公共仓消耗', '公共订单', '公共订单粗粮包', '行旅干粮', 'online_cost 用途标签']
  },
  {
    cropId: 'cabbage',
    expectedUses: [
      '村社公共仓：青菜入仓',
      '村社修桥：修桥慰劳饭消耗公共仓青菜'
    ],
    keywordFragments: ['联机消耗', '公共仓消耗', '公共订单', '修桥慰劳饭', '公共仓热饭', 'online_cost 用途标签']
  },
  {
    cropId: 'watermelon',
    expectedUses: ['村社公共仓：西瓜入仓'],
    keywordFragments: ['联机消耗', '公共仓消耗', '公共订单', '公共仓消暑备料', '节会冰镇果盘', 'online_cost 用途标签']
  },
  {
    cropId: 'rapeseed',
    expectedUses: ['村社公共仓：油菜入仓'],
    keywordFragments: ['联机消耗', '公共仓消耗', '公共订单', '公共仓油料订单', '节会备油', 'online_cost 用途标签']
  },
  {
    cropId: 'corn',
    expectedUses: ['村社公共仓：玉米入仓'],
    keywordFragments: ['联机消耗', '公共仓消耗', '公共订单', '公共仓粗粮包', '秋收订单', 'online_cost 用途标签']
  },
  {
    cropId: 'winter_wheat',
    expectedUses: ['村社公共仓：冬小麦入仓'],
    keywordFragments: ['联机消耗', '公共仓消耗', '公共订单', '公共仓面粉包', '年节面食', 'online_cost 用途标签']
  },
  {
    cropId: 'persimmon',
    expectedUses: ['村社公共仓：柿子入仓'],
    keywordFragments: ['联机消耗', '公共仓消耗', '公共订单', '公共仓冬储备料', '柿饼', 'online_cost 用途标签']
  },
  {
    cropId: 'napa_cabbage',
    expectedUses: ['村社公共仓：白菜入仓'],
    keywordFragments: ['联机消耗', '公共仓消耗', '公共订单', '公共仓备菜', '年夜饺', 'online_cost 用途标签']
  },
  {
    cropId: 'hanhai_date',
    expectedUses: ['村社公共仓：椰枣入仓'],
    keywordFragments: ['联机消耗', '公共仓消耗', '公共订单', '公共仓干粮包', '瀚海旅粮', 'online_cost 用途标签']
  }
]

for (const runtimeCase of cropRuntimeCases) {
  const profile = getCropUseProfile(runtimeCase.cropId)
  assert(!!profile, `运行态缺少 ${runtimeCase.cropId} CropUseProfile`)
  if (!profile) continue

  const item = getItemById(runtimeCase.cropId)
  assert(item?.category === 'crop', `运行态 ${runtimeCase.cropId} 必须能作为作物物品进入百科`)
  if (!item) continue

  for (const tag of runtimeCase.tags) {
    assert(profile.tags.includes(tag), `运行态 ${runtimeCase.cropId} 缺少用途标签 ${tag}`)
  }

  for (const recommendedUse of runtimeCase.recommendedUses) {
    assert(profile.recommendedUses.includes(recommendedUse), `运行态 ${runtimeCase.cropId} 推荐用途缺少 ${recommendedUse}`)
  }

  const tagLabels = getCropUseTagLabels(profile)
  for (const label of runtimeCase.labels) {
    assert(tagLabels.includes(label), `运行态 ${runtimeCase.cropId} 标签中文名缺少 ${label}`)
  }

  const tagSearchKeywords = getCropUseTagSearchKeywords(profile.tags)
  for (const tag of runtimeCase.tags) {
    assertRuntimeIncludes(tagSearchKeywords, tag, `运行态 ${runtimeCase.cropId} 标签搜索关键词缺少 ${tag}`)
  }

  const extraDetails = getItemExtraDetails(item)
  assert(getDetailValue(extraDetails, '用途标签').length > 0, `运行态 ${runtimeCase.cropId} 百科详情缺少用途标签`)
  assert(getDetailValue(extraDetails, '推荐用途').length > 0, `运行态 ${runtimeCase.cropId} 百科详情缺少推荐用途`)
  const detailValues = extraDetails.flatMap(detail => [detail.label, detail.value])
  for (const fragment of runtimeCase.detailFragments) {
    assertRuntimeIncludes(detailValues, fragment, `运行态 ${runtimeCase.cropId} 百科详情缺少 ${fragment}`)
  }

  const searchKeywords = getItemSearchKeywords(item)
  for (const fragment of runtimeCase.keywordFragments) {
    assertRuntimeIncludes(searchKeywords, fragment, `运行态 ${runtimeCase.cropId} 百科搜索缺少 ${fragment}`)
  }
}

for (const runtimeCase of publicWarehouseRuntimeCases) {
  const profile = getCropUseProfile(runtimeCase.cropId)
  assert(!!profile, `运行态 ${runtimeCase.cropId} 公共仓校验缺少 CropUseProfile`)
  if (!profile) continue
  assert(profile.tags.includes('online_cost'), `运行态 ${runtimeCase.cropId} 公共仓校验缺少 online_cost 标签`)

  const item = getItemById(runtimeCase.cropId)
  assert(item?.category === 'crop', `运行态 ${runtimeCase.cropId} 公共仓校验必须能作为作物物品进入百科`)
  if (!item) continue

  const usedInEntries = getItemUsedIn(item.id)
  for (const fragment of runtimeCase.expectedUses) {
    assertRuntimeIncludes(usedInEntries, fragment, `运行态 ${runtimeCase.cropId} 可用于列表缺少 ${fragment}`)
  }

  const searchKeywords = getItemSearchKeywords(item)
  for (const fragment of runtimeCase.keywordFragments) {
    assertRuntimeIncludes(searchKeywords, fragment, `运行态 ${runtimeCase.cropId} 公共仓搜索缺少 ${fragment}`)
  }
}

for (const crop of CROPS) {
  const profile = getCropUseProfile(crop.id)
  if (!profile?.tags.includes('online_cost')) continue

  const item = getItemById(crop.id)
  assert(item?.category === 'crop', `运行态 ${crop.id} online_cost 作物必须能作为物品进入百科`)
  if (!item) continue

  const usedInEntries = getItemUsedIn(item.id)
  assertRuntimeIncludes(usedInEntries, '村社公共仓', `运行态 ${crop.id} online_cost 作物缺少公共仓可用于入口`)
  assertRuntimeIncludes(usedInEntries, crop.name, `运行态 ${crop.id} online_cost 公共仓入口缺少作物名 ${crop.name}`)

  const searchKeywords = getItemSearchKeywords(item)
  assertRuntimeIncludes(searchKeywords, '联机消耗', `运行态 ${crop.id} online_cost 作物搜索缺少联机消耗`)
  assertRuntimeIncludes(searchKeywords, '公共仓消耗', `运行态 ${crop.id} online_cost 作物搜索缺少公共仓消耗`)
  assertRuntimeIncludes(searchKeywords, '公共订单', `运行态 ${crop.id} online_cost 作物搜索缺少公共订单`)
  assertRuntimeIncludes(searchKeywords, 'online_cost 用途标签', `运行态 ${crop.id} online_cost 作物搜索缺少 online_cost 用途标签`)
}

if (errors.length > 0) {
  console.error('[qa-crop-use-entry-guard] FAILED')
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log('[qa-crop-use-entry-guard] OK')
