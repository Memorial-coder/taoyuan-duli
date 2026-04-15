import type { CollectionPanelLink } from './collectionRegistry'
import { ITEMS, getItemById } from './items'
import { CROPS } from './crops'
import { FISH, FISHING_LOCATIONS } from './fish'
import { NPCS } from './npcs'
import { HIDDEN_NPCS } from './hiddenNpcs'
import { ANIMAL_DEFS, ANIMAL_BUILDINGS } from './animals'
import { RECIPES } from './recipes'
import { PROCESSING_MACHINES, PROCESSING_RECIPES } from './processing'
import { RINGS } from './rings'
import { HATS } from './hats'
import { SHOES } from './shoes'
import { WEAPONS, ENCHANTMENTS } from './weapons'
import {
  getGlossaryEntryIdForItemId,
  getItemExtraDetails,
  getItemRelatedGlossaryEntryIds,
  getItemRelatedPanels,
  getItemSearchKeywords,
  getItemSourceText,
  getItemUsageText,
} from './itemEncyclopedia'

export type GlossaryCategory =
  | 'crop'
  | 'fish'
  | 'npc'
  | 'animal'
  | 'recipe'
  | 'machine'
  | 'ring'
  | 'hat'
  | 'shoe'
  | 'seed'
  | 'weapon'
  | 'item'
  | 'location'

export type GlossaryIntentKey = 'acquire' | 'usage' | 'gift' | 'unlock' | 'where' | 'system'

export interface GlossaryDetail {
  label: string
  value: string
}

export interface GlossaryEntry {
  id: string
  name: string
  category: GlossaryCategory
  categoryLabel: string
  description: string
  details: GlossaryDetail[]
  source?: string
  usage?: string
  relatedPanels: CollectionPanelLink[]
  relatedEntryIds: string[]
  keywords: string[]
  intents: GlossaryIntentKey[]
  searchText: string
  spoiler?: boolean
}

export interface GlossaryOpenPreset {
  search?: string
  category?: GlossaryCategory | 'all'
  intent?: GlossaryIntentKey | 'all'
  includeSpoilers?: boolean
}

export const GLOSSARY_CATEGORY_LABELS: Record<GlossaryCategory, string> = {
  crop: '作物',
  fish: '鱼类',
  npc: '村民',
  animal: '动物',
  recipe: '食谱',
  machine: '机器',
  ring: '戒指',
  hat: '帽子',
  shoe: '鞋子',
  seed: '种子',
  weapon: '武器',
  item: '物品',
  location: '地点'
}

export const GLOSSARY_INTENT_LABELS: Record<GlossaryIntentKey, string> = {
  acquire: '怎么获得',
  usage: '有什么用',
  gift: '查送礼',
  unlock: '查解锁',
  where: '看地点/条件',
  system: '看相关系统'
}

const INTENT_KEYWORDS: Record<GlossaryIntentKey, string[]> = {
  acquire: ['怎么获得', '如何获得', '获取方式', '来源', '在哪里买', '哪里买', '怎么拿'],
  usage: ['有什么用', '用途', '怎么用', '作用', '能干嘛', '使用方式'],
  gift: ['送礼', '礼物', '喜欢什么', '最爱礼物', '礼物偏好', '讨厌什么'],
  unlock: ['怎么解锁', '解锁条件', '开启条件', '开放条件', '什么时候解锁'],
  where: ['哪里能钓', '在哪出现', '地点', '天气', '季节', '位置', '出现条件'],
  system: ['相关系统', '去哪', '前往', '入口', '在哪个面板']
}

const SEASON_NAMES: Record<string, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬'
}

const uniqueStrings = (values: string[]): string[] => Array.from(new Set(values.filter(Boolean)))

const uniquePanels = (panels: CollectionPanelLink[]): CollectionPanelLink[] => {
  const seen = new Set<string>()
  return panels.filter(panel => {
    const key = `${panel.panel}:${panel.label}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const normalizeSearchText = (value: string): string => value.toLowerCase().replace(/\s+/g, ' ').trim()

const makeEntry = (entry: Omit<GlossaryEntry, 'searchText'>): GlossaryEntry => {
  const details = entry.details.filter(detail => detail.value)
  const relatedPanels = uniquePanels(entry.relatedPanels)
  const relatedEntryIds = uniqueStrings(entry.relatedEntryIds)
  const keywords = uniqueStrings(entry.keywords)
  const searchText = normalizeSearchText([
    entry.name,
    entry.categoryLabel,
    GLOSSARY_CATEGORY_LABELS[entry.category],
    entry.description,
    entry.source ?? '',
    entry.usage ?? '',
    ...details.flatMap(detail => [detail.label, detail.value]),
    ...keywords,
    ...entry.intents.flatMap(intent => INTENT_KEYWORDS[intent]),
  ].join(' '))

  return {
    ...entry,
    details,
    relatedPanels,
    relatedEntryIds,
    keywords,
    searchText,
  }
}

const buildItemIntents = (itemCategory: string): GlossaryIntentKey[] => {
  const intents: GlossaryIntentKey[] = ['acquire', 'usage', 'system']
  if (['seed', 'artifact', 'fossil', 'fruit', 'sapling', 'fish', 'crop'].includes(itemCategory)) intents.push('where')
  if (itemCategory === 'gift') intents.push('gift')
  return Array.from(new Set(intents))
}

const buildGlossary = (): GlossaryEntry[] => {
  const entries: GlossaryEntry[] = []

  for (const crop of CROPS) {
    const item = getItemById(crop.id)
    if (!item) continue
    entries.push(makeEntry({
      id: `crop_${crop.id}`,
      name: crop.name,
      category: 'crop',
      categoryLabel: '作物',
      description: crop.description ?? '',
      details: [{ label: '售价', value: `${item.sellPrice}文` }, ...getItemExtraDetails(item)],
      source: getItemSourceText(item.id),
      usage: getItemUsageText(item),
      relatedPanels: getItemRelatedPanels(item),
      relatedEntryIds: getItemRelatedGlossaryEntryIds(item),
      keywords: [...getItemSearchKeywords(item), '作物', '种植', '收获', '播种'],
      intents: ['acquire', 'usage', 'where', 'system'],
    }))
  }

  for (const fish of FISH) {
    const item = getItemById(fish.id)
    if (!item) continue
    entries.push(makeEntry({
      id: `fish_${fish.id}`,
      name: fish.name,
      category: 'fish',
      categoryLabel: '鱼类',
      description: fish.description ?? '',
      details: [{ label: '售价', value: `${item.sellPrice}文` }, ...getItemExtraDetails(item)],
      source: getItemSourceText(item.id),
      usage: getItemUsageText(item),
      relatedPanels: getItemRelatedPanels(item),
      relatedEntryIds: getItemRelatedGlossaryEntryIds(item),
      keywords: [...getItemSearchKeywords(item), '鱼类', '钓鱼', '鱼塘'],
      intents: ['acquire', 'usage', 'where', 'system'],
    }))
  }

  for (const npc of NPCS) {
    const relatedEntryIds = uniqueStrings([
      ...npc.lovedItems.map(getGlossaryEntryIdForItemId),
      ...npc.likedItems.map(getGlossaryEntryIdForItemId),
      ...(npc.hatedItems ?? []).map(getGlossaryEntryIdForItemId),
    ])
    const details: GlossaryDetail[] = [
      { label: '身份', value: npc.role },
      { label: '性格', value: npc.personality },
      { label: '生日', value: npc.birthday ? `${SEASON_NAMES[npc.birthday.season] ?? npc.birthday.season}季第${npc.birthday.day}天` : '不详' },
    ]

    if (npc.lovedItems.length > 0) {
      details.push({ label: '最爱礼物', value: npc.lovedItems.map(id => getItemById(id)?.name ?? id).join('、') })
    }
    if (npc.likedItems.length > 0) {
      details.push({ label: '喜欢礼物', value: npc.likedItems.map(id => getItemById(id)?.name ?? id).join('、') })
    }
    if (npc.hatedItems && npc.hatedItems.length > 0) {
      details.push({ label: '讨厌礼物', value: npc.hatedItems.map(id => getItemById(id)?.name ?? id).join('、') })
    }

    entries.push(makeEntry({
      id: `npc_${npc.id}`,
      name: npc.name,
      category: 'npc',
      categoryLabel: '村民',
      description: `${npc.role}，${npc.personality}`,
      details,
      usage: '通过送礼、交谈和事件推进关系，可解锁剧情、配方、邮件或特殊奖励。',
      relatedPanels: [
        { panel: 'village', label: '去桃源村社交' },
        { panel: 'quest', label: '看告示板与委托' },
      ],
      relatedEntryIds,
      keywords: ['村民', '送礼', '好感', '礼物偏好', npc.role, npc.personality],
      intents: ['gift', 'system'],
    }))
  }

  for (const animal of ANIMAL_DEFS) {
    const building = ANIMAL_BUILDINGS.find(entry => entry.type === animal.building)
    entries.push(makeEntry({
      id: `animal_${animal.type}`,
      name: animal.name,
      category: 'animal',
      categoryLabel: '动物',
      description: `饲养在${building?.name ?? animal.building}中，每${animal.produceDays}天产出${animal.productName}。`,
      details: [
        { label: '饲养场所', value: building?.name ?? animal.building },
        { label: '产品', value: animal.productName },
        { label: '产出周期', value: `${animal.produceDays}天/次` },
        { label: '购买价格', value: `${animal.cost}文` },
      ],
      source: `扩建${building?.name ?? animal.building}后即可购买。`,
      usage: '用于稳定产出蛋、奶、毛等牧场资源，也是加工链与送礼资源的重要来源。',
      relatedPanels: [
        { panel: 'animal', label: '去牧场查看' },
        { panel: 'shop', label: '去商圈补给' },
      ],
      relatedEntryIds: animal.productId ? [getGlossaryEntryIdForItemId(animal.productId)] : [],
      keywords: ['动物', '牧场', '养殖', animal.productName, building?.name ?? animal.building],
      intents: ['acquire', 'usage', 'system'],
    }))
  }

  for (const recipe of RECIPES) {
    const ingredientNames = recipe.ingredients.map(ingredient => `${getItemById(ingredient.itemId)?.name ?? ingredient.itemId}×${ingredient.quantity}`).join('、')
    const relatedEntryIds = uniqueStrings([
      ...recipe.ingredients.map(ingredient => getGlossaryEntryIdForItemId(ingredient.itemId)),
      getGlossaryEntryIdForItemId(`food_${recipe.id}`),
    ])
    const relatedPanels: CollectionPanelLink[] = [{ panel: 'cooking', label: '去灶台查看' }]

    if (/好感|结婚/.test(recipe.unlockSource ?? '')) relatedPanels.push({ panel: 'village', label: '去村里推进关系' })
    if (/成就|发现/.test(recipe.unlockSource ?? '')) relatedPanels.push({ panel: 'achievement', label: '查看图鉴与成就' })
    if (/奖励|节/.test(recipe.unlockSource ?? '')) relatedPanels.push({ panel: 'quest', label: '关注活动与目标' })

    entries.push(makeEntry({
      id: `recipe_${recipe.id}`,
      name: recipe.name,
      category: 'recipe',
      categoryLabel: '食谱',
      description: recipe.description ?? '',
      details: [
        { label: '食材', value: ingredientNames },
        { label: '解锁方式', value: recipe.unlockSource ?? '未知' },
        ...(recipe.effect.staminaRestore ? [{ label: '体力回复', value: `+${recipe.effect.staminaRestore}` }] : []),
        ...(recipe.effect.healthRestore ? [{ label: 'HP回复', value: `+${recipe.effect.healthRestore}` }] : []),
        ...(recipe.effect.buff ? [{ label: '增益效果', value: recipe.effect.buff.description }] : []),
      ],
      source: recipe.unlockSource ?? '未知',
      usage: '在灶台制作后可恢复体力/生命，部分料理还能提供临时增益效果。',
      relatedPanels,
      relatedEntryIds,
      keywords: ['食谱', '料理', '烹饪', recipe.unlockSource ?? '', ingredientNames],
      intents: ['unlock', 'usage', 'system'],
    }))
  }

  for (const machine of PROCESSING_MACHINES) {
    const relatedEntryIds = uniqueStrings(PROCESSING_RECIPES.filter(recipe => recipe.machineType === machine.id).flatMap(recipe => [
      ...(recipe.inputItemId ? [getGlossaryEntryIdForItemId(recipe.inputItemId)] : []),
      getGlossaryEntryIdForItemId(recipe.outputItemId),
    ]))
    entries.push(makeEntry({
      id: `machine_${machine.id}`,
      name: machine.name,
      category: 'machine',
      categoryLabel: '机器',
      description: machine.description ?? '',
      details: [
        { label: '制作材料', value: machine.craftCost.map(cost => `${getItemById(cost.itemId)?.name ?? cost.itemId}×${cost.quantity}`).join('、') },
        { label: '制作费用', value: `${machine.craftMoney}文` },
      ],
      source: '可在工坊制作，部分相关设备也会与商圈货架联动出现。',
      usage: '用于把原料加工成更高价值的商品，或提供自动化经营能力。',
      relatedPanels: [
        { panel: 'workshop', label: '去工坊制作' },
        { panel: 'shop', label: '去商圈看设备' },
      ],
      relatedEntryIds,
      keywords: ['机器', '工坊', '加工', machine.name, machine.description ?? ''],
      intents: ['acquire', 'usage', 'system'],
    }))
  }

  const EQUIP_EFFECT_NAMES: Record<string, string> = {
    defense_bonus: '减伤',
    attack_bonus: '攻击力',
    stamina_bonus: '体力上限',
    farming_stamina: '农耕体力消耗',
    sell_bonus: '售价加成',
    shop_discount: '商店折扣',
    gift_friendship: '送礼好感',
    exp_bonus: '经验加成',
    luck: '幸运',
    ore_bonus: '额外矿石',
    fishing_bonus: '钓鱼技能',
    mining_bonus: '挖矿技能',
    max_hp_bonus: '最大HP',
    stamina_reduction: '体力消耗',
    treasure_find: '宝箱发现率',
    monster_drop_bonus: '怪物掉落',
    travel_speed: '旅行加速',
  }
  const EQUIP_FLAT_EFFECTS = new Set(['attack_bonus', 'max_hp_bonus', 'ore_bonus'])
  const buildEquipEffectText = (effects: { type: string; value: number }[]) =>
    effects.map(effect => {
      const label = EQUIP_EFFECT_NAMES[effect.type] ?? effect.type
      const value = EQUIP_FLAT_EFFECTS.has(effect.type) ? `+${effect.value}` : `+${Math.round(effect.value * 100)}%`
      return `${label}${value}`
    }).join('、')

  for (const ring of RINGS) {
    entries.push(makeEntry({
      id: `ring_${ring.id}`,
      name: ring.name,
      category: 'ring',
      categoryLabel: '戒指',
      description: ring.description ?? '',
      details: [
        { label: '效果', value: buildEquipEffectText(ring.effects) },
        { label: '获取方式', value: ring.obtainSource },
        { label: '售价', value: `${ring.sellPrice}文` },
      ],
      source: ring.obtainSource,
      usage: '装备后可提供长期属性或玩法加成，适合针对当前经营路线和战斗需求搭配。',
      relatedPanels: [
        { panel: 'shop', label: '去商圈看装备' },
        { panel: 'guild', label: '去公会看奖励' },
        { panel: 'mining', label: '去矿洞补材料' },
      ],
      relatedEntryIds: uniqueStrings((ring.recipe ?? []).map(cost => getGlossaryEntryIdForItemId(cost.itemId))),
      keywords: ['戒指', '装备', ring.obtainSource, buildEquipEffectText(ring.effects)],
      intents: ['acquire', 'usage', 'system'],
    }))
  }

  for (const hat of HATS) {
    entries.push(makeEntry({
      id: `hat_${hat.id}`,
      name: hat.name,
      category: 'hat',
      categoryLabel: '帽子',
      description: hat.description ?? '',
      details: [
        { label: '效果', value: buildEquipEffectText(hat.effects) },
        { label: '获取方式', value: hat.obtainSource },
        { label: '售价', value: `${hat.sellPrice}文` },
      ],
      source: hat.obtainSource,
      usage: '装备后可提供稳定的经营或战斗加成，适合与戒指、鞋子搭配成套考虑。',
      relatedPanels: [
        { panel: 'shop', label: '去商圈看穿戴' },
        { panel: 'village', label: '去村里推进服饰线' },
      ],
      relatedEntryIds: uniqueStrings((hat.recipe ?? []).map(cost => getGlossaryEntryIdForItemId(cost.itemId))),
      keywords: ['帽子', '装备', hat.obtainSource, buildEquipEffectText(hat.effects)],
      intents: ['acquire', 'usage', 'system'],
    }))
  }

  const WEAPON_TYPE_NAMES: Record<string, string> = { sword: '剑', dagger: '匕首', club: '锤' }
  for (const weapon of Object.values(WEAPONS)) {
    entries.push(makeEntry({
      id: `weapon_${weapon.id}`,
      name: weapon.name,
      category: 'weapon',
      categoryLabel: '武器',
      description: weapon.description ?? '',
      details: [
        { label: '类型', value: WEAPON_TYPE_NAMES[weapon.type] ?? weapon.type },
        { label: '攻击力', value: `${weapon.attack}` },
        { label: '暴击率', value: `${Math.round(weapon.critRate * 100)}%` },
        ...(weapon.shopPrice !== null ? [{ label: '购买价格', value: `${weapon.shopPrice}文` }] : []),
        ...(weapon.fixedEnchantment ? [{ label: '固定附魔', value: ENCHANTMENTS[weapon.fixedEnchantment]?.name ?? weapon.fixedEnchantment }] : []),
      ],
      source: weapon.shopPrice !== null ? '可在商圈购买，或通过战斗线推进取得更高阶装备。' : '多来自战斗线、公会奖励或深层探索。',
      usage: '装备后直接提升战斗能力，是矿洞推进与怪物讨伐的核心配置。',
      relatedPanels: [
        { panel: 'shop', label: '去商圈看武器' },
        { panel: 'guild', label: '去公会看战斗线' },
        { panel: 'mining', label: '去矿洞测试配置' },
      ],
      relatedEntryIds: [],
      keywords: ['武器', '战斗', WEAPON_TYPE_NAMES[weapon.type] ?? weapon.type, weapon.description ?? ''],
      intents: ['acquire', 'usage', 'system'],
    }))
  }

  const ITEM_CATEGORY_NAMES: Record<string, string> = {
    seed: '种子',
    crop: '农作物',
    fish: '鱼类',
    animal_product: '畜产品',
    processed: '加工品',
    fruit: '水果',
    ore: '矿石',
    gem: '宝石',
    material: '材料',
    misc: '杂货',
    food: '料理',
    gift: '礼品',
    machine: '机器',
    sprinkler: '洒水器',
    fertilizer: '肥料',
    sapling: '树苗',
    bait: '鱼饵',
    tackle: '浮漂',
    bomb: '炸弹',
    fossil: '化石',
    artifact: '古物',
    weapon: '武器',
    ring: '戒指',
    hat: '帽子',
    shoe: '鞋子',
  }

  const specialItemIds = new Set([
    ...CROPS.map(crop => crop.id),
    ...FISH.map(fish => fish.id),
  ])

  for (const item of ITEMS) {
    if (specialItemIds.has(item.id)) continue
    if (['weapon', 'ring', 'hat', 'shoe'].includes(item.category)) continue

    const glossaryCategory: GlossaryCategory = item.category === 'seed' ? 'seed' : 'item'
    const baseDetails: GlossaryDetail[] = [
      { label: '分类', value: ITEM_CATEGORY_NAMES[item.category] ?? item.category },
      { label: '售价', value: `${item.sellPrice}文` },
      ...(item.edible && item.staminaRestore ? [{ label: '体力回复', value: `+${item.staminaRestore}` }] : []),
      ...(item.edible && item.healthRestore ? [{ label: 'HP回复', value: `+${item.healthRestore}` }] : []),
    ]

    entries.push(makeEntry({
      id: glossaryCategory === 'seed' ? `seed_${item.id}` : `item_${item.id}`,
      name: item.name,
      category: glossaryCategory,
      categoryLabel: ITEM_CATEGORY_NAMES[item.category] ?? '物品',
      description: item.description ?? '',
      details: [...baseDetails, ...getItemExtraDetails(item)],
      source: getItemSourceText(item.id),
      usage: getItemUsageText(item),
      relatedPanels: getItemRelatedPanels(item),
      relatedEntryIds: getItemRelatedGlossaryEntryIds(item),
      keywords: [...getItemSearchKeywords(item), ITEM_CATEGORY_NAMES[item.category] ?? item.category],
      intents: buildItemIntents(item.category),
    }))
  }

  for (const shoe of SHOES) {
    entries.push(makeEntry({
      id: `shoe_${shoe.id}`,
      name: shoe.name,
      category: 'shoe',
      categoryLabel: '鞋子',
      description: shoe.description ?? '',
      details: [
        { label: '效果', value: buildEquipEffectText(shoe.effects) },
        { label: '获取方式', value: shoe.obtainSource },
        { label: '售价', value: `${shoe.sellPrice}文` },
      ],
      source: shoe.obtainSource,
      usage: '装备后可提供移动、经营或探索加成，适合和当前跑图/玩法目标一起搭配。',
      relatedPanels: [
        { panel: 'shop', label: '去商圈看穿戴' },
        { panel: 'forage', label: '去竹林/野外测试跑图' },
      ],
      relatedEntryIds: uniqueStrings((shoe.recipe ?? []).map(cost => getGlossaryEntryIdForItemId(cost.itemId))),
      keywords: ['鞋子', '装备', shoe.obtainSource, buildEquipEffectText(shoe.effects)],
      intents: ['acquire', 'usage', 'system'],
    }))
  }

  for (const hiddenNpc of HIDDEN_NPCS) {
    const relatedEntryIds = uniqueStrings([
      ...hiddenNpc.resonantOfferings.map(getGlossaryEntryIdForItemId),
      ...hiddenNpc.pleasedOfferings.map(getGlossaryEntryIdForItemId),
    ])
    entries.push(makeEntry({
      id: `hnpc_${hiddenNpc.id}`,
      name: `${hiddenNpc.name}（${hiddenNpc.trueName}）`,
      category: 'npc',
      categoryLabel: '仙灵',
      description: hiddenNpc.origin,
      details: [
        { label: '称号', value: hiddenNpc.title },
        { label: '性格', value: hiddenNpc.personality },
        ...(hiddenNpc.resonantOfferings.length > 0 ? [{ label: '灵犀供奉', value: hiddenNpc.resonantOfferings.map(id => getItemById(id)?.name ?? id).join('、') }] : []),
        ...(hiddenNpc.pleasedOfferings.length > 0 ? [{ label: '合意供奉', value: hiddenNpc.pleasedOfferings.map(id => getItemById(id)?.name ?? id).join('、') }] : []),
      ],
      usage: '推进隐藏线、供奉与特殊事件时会用到这类资料，建议按需查阅。',
      relatedPanels: [
        { panel: 'village', label: '去村里打听线索' },
        { panel: 'quest', label: '查看长期目标' },
      ],
      relatedEntryIds,
      keywords: ['仙灵', '隐藏角色', '供奉', hiddenNpc.title, hiddenNpc.personality],
      intents: ['gift', 'system'],
      spoiler: true,
    }))
  }

  for (const location of FISHING_LOCATIONS) {
    const relatedEntryIds = uniqueStrings(FISH.filter(fish => fish.location === location.id).slice(0, 8).map(fish => `fish_${fish.id}`))
    entries.push(makeEntry({
      id: `location_${location.id}`,
      name: location.name,
      category: 'location',
      categoryLabel: '地点',
      description: location.description,
      details: [
        { label: '可查资料', value: '钓点说明、鱼类分布、季节与天气条件' },
        ...(relatedEntryIds.length > 0 ? [{ label: '代表鱼类', value: relatedEntryIds.map(id => {
          const fishId = id.replace(/^fish_/, '')
          return getItemById(fishId)?.name ?? fishId
        }).join('、') }] : []),
      ],
      usage: '适合搭配鱼类词条一起查，先确认地点，再回头筛季节和天气条件。',
      relatedPanels: [{ panel: 'fishing', label: '去清溪钓鱼' }],
      relatedEntryIds,
      keywords: ['地点', '位置', '在哪', '钓点', location.name, location.description],
      intents: ['where', 'system'],
    }))
  }

  return entries
}

export const GLOSSARY: GlossaryEntry[] = buildGlossary()
