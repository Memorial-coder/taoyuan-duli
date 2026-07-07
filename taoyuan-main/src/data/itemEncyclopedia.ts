import type { ItemDef } from '@/types'
import type { CollectionPanelLink } from './collectionRegistry'
import { CROPS, getCropById, getCropBySeedId } from './crops'
import { FISH, FISHING_LOCATIONS, getFishById } from './fish'
import { FRUIT_TREE_DEFS } from './fruitTrees'
import { getItemById, getItemSource } from './items'
import {
  PROCESSING_RECIPES,
  PROCESSING_MACHINES,
  SPRINKLERS,
  FERTILIZERS,
  BAITS,
  TACKLES,
  BOMBS,
  ALCHEMY_HEAT_LABELS,
  ALCHEMY_MAIN_DAILY_LIMIT,
  ALCHEMY_NATURE_LABELS,
  ALCHEMY_PILL_ROLE_LABELS,
  ALCHEMY_RESULT_KIND_LABELS,
  ALCHEMY_SUPPORT_DAILY_LIMIT,
  getAlchemyRecipeByOutputItemId
} from './processing'
import { RECIPES, getRecipeCategoryLabels, getRecipeStoryTriggerLabels } from './recipes'
import { getCollectionUsageText, getUndiscoveredCollectionHint } from './collectionRegistry'
import {
  CROP_USE_NATURE_LABELS,
  CROP_USE_RARITY_LABELS,
  CROP_USE_SPIRITUALITY_LABELS,
  getCropUseProfile,
  getCropUseTagLabels,
  getCropUseTagMatches,
  getCropUseTagSearchKeywords
} from './cropUseProfiles'
import { getPetSpecialFeedByItemId, getPetSpecialFeedTasteLabel, getPetSpecialFeedUseText, getPetTypeLabel } from './petFeeds'
import { getItemLinkageUsageLines, getItemLinkageUseLabels } from './itemLinkage'
import { getProcessedItemGroupLabelsForItem } from './processedItemGroups'

const PUBLIC_PROCESSING_RECIPES = PROCESSING_RECIPES.filter(recipe => recipe.visibility !== 'hidden')

export interface ItemEncyclopediaDetail {
  label: string
  value: string
}

const SEASON_LABELS: Record<string, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬'
}

const QUALITY_LABELS: Record<string, string> = {
  normal: '普通',
  fine: '优质',
  excellent: '精品',
  supreme: '极品'
}

const WEATHER_LABELS: Record<string, string> = {
  any: '不限',
  sunny: '晴天',
  rain: '雨天',
  rainy: '雨天',
  storm: '暴雨',
  stormy: '暴雨',
  snowy: '雪天',
  windy: '大风',
  green_rain: '绿雨'
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
  expert: '专家',
  legendary: '传说'
}

const ROD_TIER_LABELS: Record<string, string> = {
  iron: '铁制鱼竿',
  steel: '精钢鱼竿',
  iridium: '铱金鱼竿'
}

const uniqueStrings = (values: string[]): string[] => Array.from(new Set(values.filter(Boolean)))

const pushDetail = (details: ItemEncyclopediaDetail[], label: string, value?: string) => {
  if (!value) return
  if (!details.some(detail => detail.label === label && detail.value === value)) {
    details.push({ label, value })
  }
}

const getItemName = (id: string): string => getItemById(id)?.name ?? id

const getRecipeForFoodItem = (itemId: string) => {
  return RECIPES.find(recipe => `food_${recipe.id}` === itemId || recipe.id === itemId)
}

const getCropRecipeUseEntries = (itemId: string): string[] => {
  const profile = getCropUseProfile(itemId)
  if (!profile) return []

  const entries: string[] = []
  const cookingRecipes = RECIPES.filter(recipe => recipe.ingredients.some(entry => entry.itemId === itemId))
  const cookingTags = getCropUseTagMatches(itemId, ['food'])
  if (cookingRecipes.length > 0 && cookingTags.length > 0) {
    entries.push(`料理按用途标签读取：${cookingRecipes.slice(0, 4).map(recipe => recipe.name).join('、')}`)
  }

  const alchemyRecipes = PUBLIC_PROCESSING_RECIPES.filter(
    recipe => !!recipe.alchemy && (recipe.inputItemId === itemId || recipe.extraInputs?.some(entry => entry.itemId === itemId))
  )
  const alchemyTags = getCropUseTagMatches(itemId, ['alchemy', 'medicine'])
  if (alchemyRecipes.length > 0 && alchemyTags.length > 0) {
    entries.push(`炼丹按用途标签读取：${alchemyRecipes.slice(0, 4).map(recipe => recipe.name).join('、')}`)
  }

  return entries
}

const getCropDualPathEntries = (itemId: string): string[] => {
  const cookingRecipes = RECIPES.filter(recipe => recipe.ingredients.some(entry => entry.itemId === itemId))
  const alchemyRecipes = PUBLIC_PROCESSING_RECIPES.filter(
    recipe => !!recipe.alchemy && (recipe.inputItemId === itemId || recipe.extraInputs?.some(entry => entry.itemId === itemId))
  )

  if (cookingRecipes.length === 0 || alchemyRecipes.length === 0) return []

  const cookingText = cookingRecipes
    .slice(0, 3)
    .map(recipe => `${recipe.name}（${getRecipeCategoryLabels(recipe).join('、')}；${getRecipeStoryTriggerLabels(recipe).join('、')}）`)
    .join('、')
  const alchemyText = alchemyRecipes
    .slice(0, 3)
    .map(recipe => {
      const meta = recipe.alchemy
      const roleText = meta ? ALCHEMY_PILL_ROLE_LABELS[meta.role] : '丹材'
      const natureText = meta ? ALCHEMY_NATURE_LABELS[meta.nature] : '药性'
      const qualityText = recipe.minInputQuality ? `；${QUALITY_LABELS[recipe.minInputQuality]}及以上` : ''
      return `${recipe.name}（${roleText}；${natureText}${qualityText}）`
    })
    .join('、')

  return [
    `料理价值：${cookingText}`,
    `炼丹价值：${alchemyText}`
  ]
}

const formatPercent = (value: number) => `${Math.round(value * 100)}%`

const formatCraftCost = (entries: { itemId: string; quantity: number }[]) => entries.map(entry => `${getItemName(entry.itemId)}×${entry.quantity}`).join('、')

const formatSeasonLabel = (season: string) => SEASON_LABELS[season] ?? season

const formatSeasonList = (seasons: string[]) => seasons.map(formatSeasonLabel).join('、')

const formatWeatherList = (weatherList: string[]) => weatherList.map(weather => WEATHER_LABELS[weather] ?? weather).join('、')

const PUBLIC_WAREHOUSE_USES: Record<string, string[]> = {
  rice: [
    '村社公共仓：稻米入仓，可用于腊八共灶粥底、节庆宴席备菜和修桥慰劳饭',
    '联机节会：节庆宴席备菜消耗公共仓稻米，不扣个人背包',
    '村社修桥：修桥慰劳饭消耗公共仓稻米，不扣个人背包'
  ],
  sesame: [
    '村社公共仓：芝麻入仓，可用于节会点心、芝麻油备料和公共订单点心包',
    '公共订单：点心订单可消耗公共仓芝麻，不扣个人背包'
  ],
  sweet_potato: [
    '村社公共仓：红薯入仓，可用于公共订单粗粮包、行旅干粮和救济备料',
    '公共订单：粗粮包可消耗公共仓红薯，不扣个人背包'
  ],
  cabbage: [
    '村社公共仓：青菜入仓，可用于修桥慰劳饭',
    '村社修桥：修桥慰劳饭消耗公共仓青菜，不扣个人背包'
  ],
  watermelon: [
    '村社公共仓：西瓜入仓，可用于公共仓消暑备料、节会冰镇果盘和夏日解暑订单'
  ],
  rapeseed: [
    '村社公共仓：油菜入仓，可用于公共仓油料订单、节会备油和菜籽油加工前置'
  ],
  corn: [
    '村社公共仓：玉米入仓，可用于公共仓粗粮包、秋收订单和精饲料备料'
  ],
  winter_wheat: [
    '村社公共仓：冬小麦入仓，可用于公共仓面粉包、年节面食和冬季家畜料'
  ],
  persimmon: [
    '村社公共仓：柿子入仓，可用于公共仓冬储备料、柿饼和年节甜品'
  ],
  napa_cabbage: [
    '村社公共仓：白菜入仓，可用于公共仓备菜、年夜饺和冬储订单'
  ],
  hanhai_date: [
    '村社公共仓：椰枣入仓，可用于公共仓干粮包、瀚海旅粮和商队订单'
  ],
  herb: [
    '村社公共仓：草药入仓，可用于腊八共灶粥底'
  ],
  wintersweet: [
    '村社公共仓：腊梅入仓，可用于节庆宴席备菜茶点香料',
    '联机节会：节庆宴席备菜消耗公共仓腊梅，不扣个人背包'
  ]
}

const getPublicWarehouseUses = (itemId: string): string[] => {
  const explicitUses = PUBLIC_WAREHOUSE_USES[itemId] ?? []
  const profile = getCropUseProfile(itemId)
  if (!profile?.tags.includes('online_cost')) return explicitUses

  const crop = getCropById(itemId)
  const cropName = crop?.name ?? getItemName(itemId)
  const publicRecommendedUses = profile.recommendedUses.filter(use => use.includes('公共') || use.includes('订单') || use.includes('节会')).slice(0, 4)
  const useText = publicRecommendedUses.length > 0 ? publicRecommendedUses.join('、') : '公共仓备料、公共订单'

  return uniqueStrings([
    ...explicitUses,
    `村社公共仓：${cropName}入仓，可用于${useText}`,
    `公共订单：${cropName}可作为公共仓消耗备料，不扣个人背包`
  ])
}

const ANIMAL_FEED_USES: Record<string, string[]> = {
  rice: ['动物饲料：稻米可作为家畜补料，适合公共仓或牧场日常消耗'],
  sweet_potato: ['动物饲料：红薯可作为家畜越冬料，偏饱腹和耐储'],
  pumpkin: ['动物饲料：南瓜可作为甜口补料，适合秋季牧场和家庭餐桌事件'],
  radish: ['动物饲料：萝卜可作为清辛护院补料，适合低成本日常喂养']
}

const MANOR_CARE_USES: Record<string, string[]> = {
  manor_edge_bundle: [
    '好友庄园照料：收拾掉落物可获得少量边角作物包',
    '作物二级用途：可作为公共订单、宠物点心或节会备料的轻量材料'
  ]
}

const NPC_RECALL_USES: Record<string, string[]> = {
  paper: [
    '随机 NPC 旧信召回：NPC 页旧日来客摘要可消耗纸张寄旧信，召回归档 NPC',
    '文游关系：旧信召回仍受短访 / 长住名额上限约束，并只写入单机随机 NPC 存档'
  ],
  silk_ribbon: [
    '随机 NPC 旧物召回：NPC 页旧日来客摘要可消耗丝帕托付旧物，召回归档 NPC',
    '文游关系：旧物召回仍复用旧档容量、重复对象和长住名额校验，不新增无限信物日志'
  ]
}

export const getItemSourceText = (itemId: string): string => getItemSource(itemId)

export const getItemUsageText = (item: ItemDef): string => getCollectionUsageText(item)

export const getItemRelatedPanels = (item: ItemDef): CollectionPanelLink[] => getUndiscoveredCollectionHint(item).relatedPanels

export const getGlossaryEntryIdForItemId = (itemId: string): string => {
  if (CROPS.some(crop => crop.id === itemId)) return `crop_${itemId}`
  if (FISH.some(fish => fish.id === itemId)) return `fish_${itemId}`
  const item = getItemById(itemId)
  if (item?.category === 'seed') return `seed_${itemId}`
  if (item?.category === 'weapon') return `weapon_${itemId}`
  return `item_${itemId}`
}

export const getItemExtraDetails = (item: ItemDef): ItemEncyclopediaDetail[] => {
  const details: ItemEncyclopediaDetail[] = []

  if (item.category === 'crop') {
    const crop = getCropById(item.id)
    if (crop) {
      pushDetail(details, '对应种子', getItemName(crop.seedId))
      pushDetail(details, '适种季节', formatSeasonList(crop.season))
      pushDetail(details, '生长天数', `${crop.growthDays}天`)
      pushDetail(details, '播种价格', `${crop.seedPrice}文`)
      pushDetail(details, '深度灌溉', crop.deepWatering ? '需要' : '不需要')
      if (crop.regrowth && crop.regrowthDays) pushDetail(details, '多次收获', `是（间隔${crop.regrowthDays}天）`)
      if (crop.maxHarvests) pushDetail(details, '最多收获', `${crop.maxHarvests}次`)
      if (crop.giantCropEligible) pushDetail(details, '巨型作物', '可形成巨型作物')
      const profile = getCropUseProfile(item.id)
      if (profile) {
        pushDetail(details, '用途标签', getCropUseTagLabels(profile).join('、'))
        pushDetail(details, '风味', profile.flavor.join('、'))
        pushDetail(details, '药性', CROP_USE_NATURE_LABELS[profile.nature])
        pushDetail(details, '灵性', CROP_USE_SPIRITUALITY_LABELS[profile.spirituality])
        pushDetail(details, '消耗定位', CROP_USE_RARITY_LABELS[profile.rarityUse])
        pushDetail(details, '推荐用途', profile.recommendedUses.join('、'))
        const recipeUseEntries = getCropRecipeUseEntries(item.id)
        if (recipeUseEntries.length > 0) {
          pushDetail(details, '配方入口', recipeUseEntries.join('；'))
        }
        const dualPathEntries = getCropDualPathEntries(item.id)
        if (dualPathEntries.length > 0) {
          pushDetail(details, '料理 / 炼丹双路径', dualPathEntries.join('；'))
        }
      }
      const petFeed = getPetSpecialFeedByItemId(item.id)
      if (petFeed) {
        pushDetail(details, '宠物口味', getPetSpecialFeedTasteLabel(petFeed.taste))
        pushDetail(details, '宠物偏好', petFeed.preferredPetTypes.map(getPetTypeLabel).join('、'))
        pushDetail(details, '宠物反馈', petFeed.description)
      }
    }
  } else if (item.category === 'seed') {
    const crop = getCropBySeedId(item.id)
    if (crop) {
      pushDetail(details, '对应作物', crop.name)
      pushDetail(details, '适种季节', formatSeasonList(crop.season))
      pushDetail(details, '成熟时间', `${crop.growthDays}天`)
      pushDetail(details, '深度灌溉', crop.deepWatering ? '需要' : '不需要')
      if (crop.regrowth && crop.regrowthDays) pushDetail(details, '多次收获', `是（间隔${crop.regrowthDays}天）`)
      if (crop.maxHarvests) pushDetail(details, '最多收获', `${crop.maxHarvests}次`)
      if (crop.giantCropEligible) pushDetail(details, '巨型作物', '可形成巨型作物')
    }
  } else if (item.category === 'fish') {
    const fish = getFishById(item.id)
    if (fish) {
      pushDetail(details, '出没地点', FISHING_LOCATIONS.find(location => location.id === fish.location)?.name ?? (fish.location ?? '溪流'))
      pushDetail(details, '出没季节', formatSeasonList(fish.season))
      pushDetail(details, '天气需求', fish.weather.includes('any') ? '不限' : formatWeatherList(fish.weather))
      pushDetail(details, '难度', DIFFICULTY_LABELS[fish.difficulty] ?? fish.difficulty)
    }
  } else if (item.category === 'fruit') {
    const tree = FRUIT_TREE_DEFS.find(entry => entry.fruitId === item.id)
    if (tree) {
      pushDetail(details, '来源果树', tree.name)
      pushDetail(details, '结果季节', formatSeasonLabel(tree.fruitSeason))
      pushDetail(details, '树苗', getItemName(tree.saplingId))
      pushDetail(details, '成熟时间', `${tree.growthDays}天`)
    }
  } else if (item.category === 'sapling') {
    const tree = FRUIT_TREE_DEFS.find(entry => entry.saplingId === item.id)
    if (tree) {
      pushDetail(details, '对应果树', tree.name)
      pushDetail(details, '成熟时间', `${tree.growthDays}天`)
      pushDetail(details, '产果季节', formatSeasonLabel(tree.fruitSeason))
      pushDetail(details, '产出果实', tree.fruitName)
    }
  } else if (item.category === 'machine') {
    const machineId = item.id.startsWith('machine_') ? item.id.replace(/^machine_/, '') : item.id
    const machine = PROCESSING_MACHINES.find(entry => entry.id === machineId)
    if (machine) {
      pushDetail(details, '制作费用', `${machine.craftMoney}文`)
      pushDetail(details, '制作材料', formatCraftCost(machine.craftCost))
    }
  } else if (item.category === 'sprinkler') {
    const sprinkler = SPRINKLERS.find(entry => entry.id === item.id)
    if (sprinkler) {
      pushDetail(details, '覆盖范围', `${sprinkler.range}格`)
      pushDetail(details, '制作费用', `${sprinkler.craftMoney}文`)
      pushDetail(details, '制作材料', formatCraftCost(sprinkler.craftCost))
    }
  } else if (item.category === 'fertilizer') {
    const fertilizer = FERTILIZERS.find(entry => entry.id === item.id)
    if (fertilizer) {
      if (fertilizer.qualityBonus) pushDetail(details, '品质加成', formatPercent(fertilizer.qualityBonus))
      if (fertilizer.growthSpeedup) pushDetail(details, '生长加速', formatPercent(fertilizer.growthSpeedup))
      if (fertilizer.retainChance !== undefined) pushDetail(details, '保湿概率', formatPercent(fertilizer.retainChance))
      pushDetail(details, '商店价格', `${fertilizer.shopPrice}文`)
    }
  } else if (item.category === 'bait') {
    const bait = BAITS.find(entry => entry.id === item.id)
    if (bait) {
      if (bait.shopPrice !== undefined) pushDetail(details, '商店价格', `${bait.shopPrice}文`)
      if (bait.doubleCatchChance) pushDetail(details, '双倍鱼获', formatPercent(bait.doubleCatchChance))
      if (bait.ignoresSeason) pushDetail(details, '季节限制', '可无视季节限制')
    }
  } else if (item.category === 'tackle') {
    const tackle = TACKLES.find(entry => entry.id === item.id)
    if (tackle) {
      pushDetail(details, '耐久', `${tackle.maxDurability}`)
      pushDetail(details, '需求鱼竿', ROD_TIER_LABELS[tackle.requiredRodTier] ?? tackle.requiredRodTier)
      if (tackle.shopPrice !== undefined) pushDetail(details, '商店价格', `${tackle.shopPrice}文`)
    }
  } else if (item.category === 'bomb') {
    const bomb = BOMBS.find(entry => entry.id === item.id)
    if (bomb) {
      pushDetail(details, '矿石倍率', `${bomb.oreMultiplier}倍`)
      pushDetail(details, '清除普通怪物', bomb.clearsMonster ? '是' : '否')
    }
  } else if (item.category === 'food') {
    const recipe = getRecipeForFoodItem(item.id)
    if (recipe) {
      pushDetail(details, '料理分类', getRecipeCategoryLabels(recipe).join('、'))
      pushDetail(details, '剧情触发', getRecipeStoryTriggerLabels(recipe).join('、'))
      pushDetail(details, '烹饪入口', `灶台：${recipe.name}`)
      pushDetail(details, '所需材料', formatCraftCost(recipe.ingredients))
      pushDetail(details, '解锁来源', recipe.unlockSource)
    }
  } else if (item.category === 'elixir') {
    pushDetail(details, '丹药定位', '丹炉炼制的短效经营准备品')
    const alchemyRecipe = getAlchemyRecipeByOutputItemId(item.id)
    if (alchemyRecipe?.alchemy) {
      const meta = alchemyRecipe.alchemy
      const limit = meta.role === 'main' ? ALCHEMY_MAIN_DAILY_LIMIT : ALCHEMY_SUPPORT_DAILY_LIMIT
      pushDetail(details, '丹药类型', ALCHEMY_PILL_ROLE_LABELS[meta.role])
      pushDetail(details, '药性', ALCHEMY_NATURE_LABELS[meta.nature])
      pushDetail(details, '主材', getItemName(meta.mainMaterialId))
      if (alchemyRecipe.minInputQuality) {
        pushDetail(details, '主材品质', `${QUALITY_LABELS[alchemyRecipe.minInputQuality]}及以上`)
      }
      pushDetail(details, '辅材', meta.supportMaterialIds.map(getItemName).join('、'))
      pushDetail(details, '引子', getItemName(meta.primerItemId))
      pushDetail(details, '火候', ALCHEMY_HEAT_LABELS[meta.heat])
      pushDetail(details, '每日限制', `每日最多炼制${limit}次${ALCHEMY_PILL_ROLE_LABELS[meta.role]}`)
      pushDetail(details, '短效定位', meta.shortEffect)
      pushDetail(details, '丹药效果', meta.effect.description)
      if (meta.results?.length) {
        pushDetail(
          details,
          '炼丹结果',
          meta.results.map(result => `${ALCHEMY_RESULT_KIND_LABELS[result.kind]}：${getItemName(result.outputItemId)}`).join('、')
        )
      }
    }
    pushDetail(details, '当前限制', '丹炉按每日主丹/辅丹限制开炉；背包服用后当日只保留一枚丹药效果')
  }

  const alchemyResultRecipes = PUBLIC_PROCESSING_RECIPES.filter(recipe => recipe.alchemy?.results?.some(result => result.outputItemId === item.id))
  if (alchemyResultRecipes.length > 0 && item.category !== 'elixir') {
    const resultLabels = uniqueStrings(
      alchemyResultRecipes.flatMap(recipe =>
        recipe.alchemy?.results
          ?.filter(result => result.outputItemId === item.id)
          .map(result => ALCHEMY_RESULT_KIND_LABELS[result.kind]) ?? []
      )
    )
    pushDetail(details, '炼丹结果', resultLabels.join('、'))
    pushDetail(details, '来源丹方', alchemyResultRecipes.slice(0, 5).map(recipe => recipe.name).join('、'))
  }

  const petFeed = getPetSpecialFeedByItemId(item.id)
  if (petFeed) {
    pushDetail(details, '宠物点心等级', petFeed.tier === 'advanced' ? '高阶点心' : '日常喂食')
    pushDetail(details, '宠物口味', getPetSpecialFeedTasteLabel(petFeed.taste))
    pushDetail(details, '宠物偏好', petFeed.preferredPetTypes.map(getPetTypeLabel).join('、'))
    pushDetail(details, '宠物用途标签', getPetSpecialFeedUseText(item.id))
    pushDetail(details, '宠物反馈', petFeed.description)
  }
  const linkageUseLabels = getItemLinkageUseLabels(item.id)
  if (linkageUseLabels.length > 0) {
    pushDetail(details, '联动用途', linkageUseLabels.join('、'))
  }
  const processedGroupLabels = getProcessedItemGroupLabelsForItem(item.id)
  if (processedGroupLabels.length > 0) {
    pushDetail(details, '加工分组', processedGroupLabels.join('、'))
  }

  return details
}

export const getItemProducedBy = (itemId: string): string[] => {
  return PUBLIC_PROCESSING_RECIPES.filter(recipe =>
    recipe.outputItemId === itemId || recipe.alchemy?.results?.some(result => result.outputItemId === itemId)
  ).map(recipe => {
    const machine = PROCESSING_MACHINES.find(entry => entry.id === recipe.machineType)
    const result = recipe.alchemy?.results?.find(entry => entry.outputItemId === itemId)
    const resultText = result ? `（${ALCHEMY_RESULT_KIND_LABELS[result.kind]}：${result.description}）` : ''
    return `${machine?.name ?? recipe.machineType}：${recipe.description}${resultText}`
  })
}

export const getItemUsedIn = (itemId: string): string[] => {
  const processingUses = PUBLIC_PROCESSING_RECIPES.filter(recipe => recipe.outputItemId && (recipe.inputItemId === itemId || recipe.extraInputs?.some(entry => entry.itemId === itemId))).map(recipe => {
    const machine = PROCESSING_MACHINES.find(entry => entry.id === recipe.machineType)
    return `${machine?.name ?? recipe.machineType}：${recipe.name} → ${getItemName(recipe.outputItemId!)}`
  })
  const cookingUses = RECIPES.filter(recipe => recipe.ingredients.some(entry => entry.itemId === itemId)).map(recipe => `料理：${recipe.name}`)
  const publicWarehouseUses = getPublicWarehouseUses(itemId)
  const animalFeedUses = ANIMAL_FEED_USES[itemId] ?? []
  const manorCareUses = MANOR_CARE_USES[itemId] ?? []
  const npcRecallUses = NPC_RECALL_USES[itemId] ?? []
  const linkageUses = getItemLinkageUsageLines(itemId)

  return uniqueStrings([...processingUses, ...cookingUses, ...publicWarehouseUses, ...animalFeedUses, ...manorCareUses, ...npcRecallUses, ...linkageUses])
}

export const getItemRelatedGlossaryEntryIds = (item: ItemDef): string[] => {
  const relatedIds: string[] = []

  if (item.category === 'crop') {
    const crop = getCropById(item.id)
    if (crop) relatedIds.push(getGlossaryEntryIdForItemId(crop.seedId))
  }

  if (item.category === 'seed') {
    const crop = getCropBySeedId(item.id)
    if (crop) relatedIds.push(`crop_${crop.id}`)
  }

  if (item.category === 'fish') {
    const fish = getFishById(item.id)
    if (fish?.location) relatedIds.push(`location_${fish.location}`)
  }

  if (item.category === 'fruit') {
    const tree = FRUIT_TREE_DEFS.find(entry => entry.fruitId === item.id)
    if (tree) relatedIds.push(getGlossaryEntryIdForItemId(tree.saplingId))
  }

  if (item.category === 'sapling') {
    const tree = FRUIT_TREE_DEFS.find(entry => entry.saplingId === item.id)
    if (tree) relatedIds.push(getGlossaryEntryIdForItemId(tree.fruitId))
  }

  if (item.category === 'machine') {
    const machineId = item.id.startsWith('machine_') ? item.id.replace(/^machine_/, '') : item.id
    PUBLIC_PROCESSING_RECIPES.filter(recipe => recipe.machineType === machineId)
      .slice(0, 6)
      .forEach(recipe => {
        if (recipe.outputItemId) relatedIds.push(getGlossaryEntryIdForItemId(recipe.outputItemId))
        recipe.alchemy?.results?.forEach(result => relatedIds.push(getGlossaryEntryIdForItemId(result.outputItemId)))
        if (recipe.inputItemId) relatedIds.push(getGlossaryEntryIdForItemId(recipe.inputItemId))
      })
  }

  PUBLIC_PROCESSING_RECIPES.filter(recipe => recipe.outputItemId === item.id || recipe.alchemy?.results?.some(result => result.outputItemId === item.id))
    .slice(0, 4)
    .forEach(recipe => {
      if (recipe.inputItemId) relatedIds.push(getGlossaryEntryIdForItemId(recipe.inputItemId))
    })

  PUBLIC_PROCESSING_RECIPES.filter(recipe => recipe.inputItemId === item.id || recipe.extraInputs?.some(entry => entry.itemId === item.id))
    .slice(0, 4)
    .forEach(recipe => {
      if (recipe.outputItemId) relatedIds.push(getGlossaryEntryIdForItemId(recipe.outputItemId))
      recipe.alchemy?.results?.forEach(result => relatedIds.push(getGlossaryEntryIdForItemId(result.outputItemId)))
    })

  RECIPES.filter(recipe => recipe.ingredients.some(entry => entry.itemId === item.id))
    .slice(0, 4)
    .forEach(recipe => {
      relatedIds.push(getGlossaryEntryIdForItemId(`food_${recipe.id}`))
    })

  return uniqueStrings(relatedIds.filter(id => id !== getGlossaryEntryIdForItemId(item.id)))
}

export const getItemSearchKeywords = (item: ItemDef): string[] => {
  const hint = getUndiscoveredCollectionHint(item)
  const extraDetails = getItemExtraDetails(item)
  const cropUseProfile = item.category === 'crop' ? getCropUseProfile(item.id) : undefined
  const keywords: string[] = [item.name, item.category, hint.summary, getItemSourceText(item.id), getItemUsageText(item)]

  extraDetails.forEach(detail => {
    keywords.push(detail.label, detail.value)
  })

  hint.clues.forEach(clue => keywords.push(clue))
  hint.relatedPanels.forEach(panel => keywords.push(panel.label))

  switch (item.category) {
    case 'crop':
      keywords.push('作物', '种植', '播种', '收获')
      if (cropUseProfile) {
        keywords.push(
          '作物用途标签',
          'CropUseProfile',
          ...cropUseProfile.tags,
          ...getCropUseTagLabels(cropUseProfile),
          ...getCropUseTagSearchKeywords(cropUseProfile.tags),
          ...cropUseProfile.flavor,
          cropUseProfile.nature,
          CROP_USE_NATURE_LABELS[cropUseProfile.nature],
          cropUseProfile.spirituality,
          CROP_USE_SPIRITUALITY_LABELS[cropUseProfile.spirituality],
          '作物灵性',
          '灵性字段',
          cropUseProfile.rarityUse,
          CROP_USE_RARITY_LABELS[cropUseProfile.rarityUse],
          ...cropUseProfile.recommendedUses,
        )
        const recipeUseEntries = getCropRecipeUseEntries(item.id)
        recipeUseEntries.forEach(entry => keywords.push(entry))
        if (recipeUseEntries.some(entry => entry.startsWith('料理'))) {
          keywords.push('料理读取用途标签', '料理用途入口', 'food 用途标签')
        }
        if (recipeUseEntries.some(entry => entry.startsWith('炼丹'))) {
          keywords.push('炼丹读取用途标签', '炼丹用途入口', 'alchemy 用途标签', 'medicine 用途标签')
        }
        if (cropUseProfile.tags.includes('pet_feed')) {
          keywords.push('宠物喂食读取用途标签', '灵宠喂食用途标签', 'pet_feed 用途标签')
        }
        if (cropUseProfile.tags.includes('animal_feed')) {
          keywords.push('动物喂食读取用途标签', 'animal_feed 用途标签')
        }
        if (cropUseProfile.tags.includes('order')) {
          keywords.push('订单用途筛选', '订单交付作物', '村民订单作物', 'order 用途标签')
        }
        if (cropUseProfile.tags.includes('festival')) {
          keywords.push('节会用途筛选', '节会供品作物', '节庆宴席备菜', 'festival 用途标签')
        }
        const dualPathEntries = getCropDualPathEntries(item.id)
        if (dualPathEntries.length > 0) {
          keywords.push('料理炼丹双路径', '同一种作物不同价值', '作物消耗路径对比', '料理价值', '炼丹价值', ...dualPathEntries)
        }
      }
      break
    case 'seed':
      keywords.push('种子', '播种', '育苗', '怎么种')
      break
    case 'fish':
      keywords.push('钓鱼', '鱼塘', '哪里能钓', '出现条件')
      break
    case 'food':
      keywords.push('料理', '烹饪', '恢复', '增益', '温和 buff', '剧情触发', '料理分类', '家常菜', '节会菜', '宠物餐', '旅途干粮', '宴席菜')
      {
        const recipe = getRecipeForFoodItem(item.id)
        if (recipe) {
          keywords.push(...getRecipeCategoryLabels(recipe), ...getRecipeStoryTriggerLabels(recipe), recipe.name, recipe.unlockSource, recipe.description)
          recipe.ingredients.forEach(entry => keywords.push(getItemName(entry.itemId)))
        }
      }
      break
    case 'gift':
      keywords.push('送礼', '好感', '关系')
      break
    case 'animal_product':
      keywords.push('牧场', '产出', '畜产品')
      break
    case 'processed':
      keywords.push('加工', '制作', '机器')
      break
    case 'material':
      keywords.push('材料', '制作', '加工')
      if (PUBLIC_PROCESSING_RECIPES.some(recipe => recipe.alchemy?.results?.some(result => result.outputItemId === item.id))) {
        keywords.push('炼丹结果', '成丹', '偏丹', '废丹', '奇丹', '丹炉', '丹材回收')
      }
      break
    case 'elixir':
      keywords.push('丹药', '炼丹', '丹炉', '短效增益', '探索', '社交', '行动效率', '每日主丹', '每日辅丹', '不无限叠')
      PUBLIC_PROCESSING_RECIPES.filter(recipe => recipe.outputItemId === item.id && recipe.alchemy).forEach(recipe => {
        const meta = recipe.alchemy!
        keywords.push(
          ALCHEMY_PILL_ROLE_LABELS[meta.role],
          ALCHEMY_NATURE_LABELS[meta.nature],
          ALCHEMY_HEAT_LABELS[meta.heat],
          getItemName(meta.mainMaterialId),
          ...meta.supportMaterialIds.map(getItemName),
          getItemName(meta.primerItemId),
          meta.shortEffect,
          meta.effect.description,
          '服用',
          '不叠加'
        )
        if (meta.results?.length) {
          keywords.push(
            '炼丹结果',
            '成丹',
            '偏丹',
            '废丹',
            '奇丹',
            ...meta.results.map(result => ALCHEMY_RESULT_KIND_LABELS[result.kind]),
            ...meta.results.map(result => getItemName(result.outputItemId)),
            ...meta.results.map(result => result.description)
          )
        }
        if (recipe.minInputQuality) {
          keywords.push('高阶丹药', '高品质作物', `${QUALITY_LABELS[recipe.minInputQuality]}及以上`, '优质作物')
        }
        if (meta.nature === 'spirit_fruit') {
          keywords.push('灵果药性', '灵果', '灵桃', '高阶丹药')
        }
      })
      break
    case 'machine':
      keywords.push('机器', '工坊', '加工')
      break
    case 'fertilizer':
      keywords.push('肥料', '田地', '种植加成')
      break
    case 'bait':
    case 'tackle':
      keywords.push('钓具', '鱼竿', '钓鱼')
      break
    case 'bomb':
      keywords.push('矿洞', '爆破', '采矿')
      break
    case 'artifact':
    case 'fossil':
      keywords.push('博物馆', '捐赠', '收藏')
      break
    case 'weapon':
      keywords.push('武器', '战斗', '攻击')
      break
    case 'ring':
    case 'hat':
    case 'shoe':
      keywords.push('装备', '穿戴', '属性')
      break
  }

  getItemProducedBy(item.id).forEach(entry => keywords.push(entry))
  getItemUsedIn(item.id).forEach(entry => keywords.push(entry))
  const processedGroupLabels = getProcessedItemGroupLabelsForItem(item.id)
  if (processedGroupLabels.length > 0) {
    keywords.push('加工分组', '加工品消耗池', ...processedGroupLabels)
  }
  const petFeed = getPetSpecialFeedByItemId(item.id)
  if (petFeed) {
    keywords.push(
      '宠物',
      '宠物粮',
      '宠物点心',
      '特别喂食',
      petFeed.label,
      petFeed.shortLabel,
      getPetSpecialFeedTasteLabel(petFeed.taste),
      getPetSpecialFeedUseText(item.id),
      ...petFeed.preferredPetTypes.map(getPetTypeLabel),
      petFeed.description,
      '宠物喂食读取用途标签',
      'pet_feed 用途标签',
    )
    if (petFeed.tier === 'advanced') {
      keywords.push('高阶宠物点心', '高阶宠物粮', '高级宠物点心', '宠物点心第一批', '加工宠物点心')
    }
    if (petFeed.taste === 'spirit_fruit' || petFeed.preferredPetTypes.includes('spirit')) {
      keywords.push('灵宠', '灵果', '丹材', '稀有采集物')
    }
  }
  const animalFeedKeywords = ANIMAL_FEED_USES[item.id] ?? []
  if (animalFeedKeywords.length > 0) {
    keywords.push('动物饲料', '家畜饲料', '牧场补料', ...animalFeedKeywords)
  }
  const publicWarehouseKeywords = getPublicWarehouseUses(item.id)
  if (publicWarehouseKeywords.length > 0) {
    keywords.push('联机消耗', '公共仓消耗', '公共订单', ...publicWarehouseKeywords)
  }
  const npcRecallKeywords = NPC_RECALL_USES[item.id] ?? []
  if (npcRecallKeywords.length > 0) {
    keywords.push('随机 NPC', '旧信召回', '旧物召回', '旧日来客', '归档召回', '文游关系', ...npcRecallKeywords)
  }

  return uniqueStrings(keywords)
}
