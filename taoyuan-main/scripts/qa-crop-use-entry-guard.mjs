import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

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

if (errors.length > 0) {
  console.error('[qa-crop-use-entry-guard] FAILED')
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log('[qa-crop-use-entry-guard] OK')
