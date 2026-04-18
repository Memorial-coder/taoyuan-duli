import type { ItemDef } from '@/types'
import type { CollectionPanelLink } from './collectionRegistry'
import { CROPS, getCropById, getCropBySeedId } from './crops'
import { FISH, FISHING_LOCATIONS, getFishById } from './fish'
import { FRUIT_TREE_DEFS } from './fruitTrees'
import { getItemById, getItemSource } from './items'
import { PROCESSING_RECIPES, PROCESSING_MACHINES, SPRINKLERS, FERTILIZERS, BAITS, TACKLES, BOMBS } from './processing'
import { getCollectionUsageText, getUndiscoveredCollectionHint } from './collectionRegistry'

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

const formatPercent = (value: number) => `${Math.round(value * 100)}%`

const formatCraftCost = (entries: { itemId: string; quantity: number }[]) => entries.map(entry => `${getItemName(entry.itemId)}×${entry.quantity}`).join('、')

const formatSeasonLabel = (season: string) => SEASON_LABELS[season] ?? season

const formatSeasonList = (seasons: string[]) => seasons.map(formatSeasonLabel).join('、')

const formatWeatherList = (weatherList: string[]) => weatherList.map(weather => WEATHER_LABELS[weather] ?? weather).join('、')

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
      pushDetail(details, '清除怪物', bomb.clearsMonster ? '是' : '否')
    }
  }

  return details
}

export const getItemProducedBy = (itemId: string): string[] => {
  return PROCESSING_RECIPES.filter(recipe => recipe.outputItemId === itemId).map(recipe => {
    const machine = PROCESSING_MACHINES.find(entry => entry.id === recipe.machineType)
    return `${machine?.name ?? recipe.machineType}：${recipe.description}`
  })
}

export const getItemUsedIn = (itemId: string): string[] => {
  return PROCESSING_RECIPES.filter(recipe => recipe.inputItemId === itemId || recipe.extraInputs?.some(entry => entry.itemId === itemId)).map(recipe => {
    const machine = PROCESSING_MACHINES.find(entry => entry.id === recipe.machineType)
    return `${machine?.name ?? recipe.machineType}：${recipe.name} → ${getItemName(recipe.outputItemId)}`
  })
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
    PROCESSING_RECIPES.filter(recipe => recipe.machineType === machineId)
      .slice(0, 6)
      .forEach(recipe => {
        relatedIds.push(getGlossaryEntryIdForItemId(recipe.outputItemId))
        if (recipe.inputItemId) relatedIds.push(getGlossaryEntryIdForItemId(recipe.inputItemId))
      })
  }

  PROCESSING_RECIPES.filter(recipe => recipe.outputItemId === item.id)
    .slice(0, 4)
    .forEach(recipe => {
      if (recipe.inputItemId) relatedIds.push(getGlossaryEntryIdForItemId(recipe.inputItemId))
    })

  PROCESSING_RECIPES.filter(recipe => recipe.inputItemId === item.id || recipe.extraInputs?.some(entry => entry.itemId === item.id))
    .slice(0, 4)
    .forEach(recipe => {
      relatedIds.push(getGlossaryEntryIdForItemId(recipe.outputItemId))
    })

  return uniqueStrings(relatedIds.filter(id => id !== getGlossaryEntryIdForItemId(item.id)))
}

export const getItemSearchKeywords = (item: ItemDef): string[] => {
  const hint = getUndiscoveredCollectionHint(item)
  const extraDetails = getItemExtraDetails(item)
  const keywords: string[] = [item.name, item.category, hint.summary, getItemSourceText(item.id), getItemUsageText(item)]

  extraDetails.forEach(detail => {
    keywords.push(detail.label, detail.value)
  })

  hint.clues.forEach(clue => keywords.push(clue))
  hint.relatedPanels.forEach(panel => keywords.push(panel.label))

  switch (item.category) {
    case 'crop':
      keywords.push('作物', '种植', '播种', '收获')
      break
    case 'seed':
      keywords.push('种子', '播种', '育苗', '怎么种')
      break
    case 'fish':
      keywords.push('钓鱼', '鱼塘', '哪里能钓', '出现条件')
      break
    case 'food':
      keywords.push('料理', '烹饪', '恢复', '增益')
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

  return uniqueStrings(keywords)
}
