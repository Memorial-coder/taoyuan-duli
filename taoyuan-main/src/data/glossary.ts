import { ITEMS, getItemById } from './items'
import { CROPS } from './crops'
import { FISH, FISHING_LOCATIONS } from './fish'
import { NPCS } from './npcs'
import { HIDDEN_NPCS } from './hiddenNpcs'
import { ANIMAL_DEFS, ANIMAL_BUILDINGS } from './animals'
import { RECIPES } from './recipes'
import { PROCESSING_MACHINES } from './processing'
import { RINGS } from './rings'
import { HATS } from './hats'
import { SHOES } from './shoes'
import { WEAPONS, ENCHANTMENTS } from './weapons'

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
  | 'item'
  | 'location'

export interface GlossaryEntry {
  id: string
  name: string
  category: GlossaryCategory
  categoryLabel: string
  description: string
  details: { label: string; value: string }[]
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
  item: '物品',
  location: '地点',
}

const SEASON_NAMES: Record<string, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
}

const DIFFICULTY_NAMES: Record<string, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
  expert: '专家',
  legendary: '传说',
}

function buildGlossary(): GlossaryEntry[] {
  const entries: GlossaryEntry[] = []

  // 作物
  for (const crop of CROPS) {
    const details: { label: string; value: string }[] = [
      { label: '季节', value: crop.season.map(s => SEASON_NAMES[s] ?? s).join('、') },
      { label: '生长天数', value: `${crop.growthDays}天` },
      { label: '售价', value: `${crop.sellPrice}文` },
    ]
    if (crop.seedPrice) details.push({ label: '种子价格', value: `${crop.seedPrice}文` })
    entries.push({
      id: `crop_${crop.id}`,
      name: crop.name,
      category: 'crop',
      categoryLabel: '作物',
      description: crop.description ?? '',
      details,
    })
  }

  // 鱼类
  for (const fish of FISH) {
    const details: { label: string; value: string }[] = [
      { label: '地点', value: fish.location ? (FISHING_LOCATIONS.find(l => l.id === fish.location)?.name ?? fish.location) : '溪流' },
      { label: '季节', value: fish.season.map(s => SEASON_NAMES[s] ?? s).join('、') },
      { label: '难度', value: DIFFICULTY_NAMES[fish.difficulty] ?? fish.difficulty },
      { label: '售价', value: `${fish.sellPrice}文` },
    ]
    if (fish.weather && !fish.weather.includes('any')) {
      const WEATHER_NAMES: Record<string, string> = { sunny: '晴天', rainy: '雨天', stormy: '雷暴', snowy: '雪天', windy: '大风', green_rain: '绿雨' }
      details.push({ label: '天气', value: fish.weather.map(w => WEATHER_NAMES[w] ?? w).join('、') })
    }
    entries.push({
      id: `fish_${fish.id}`,
      name: fish.name,
      category: 'fish',
      categoryLabel: '鱼类',
      description: fish.description ?? '',
      details,
    })
  }

  // 村民 NPC
  for (const npc of NPCS) {
    const details: { label: string; value: string }[] = [
      { label: '身份', value: npc.role },
      { label: '性格', value: npc.personality },
      { label: '生日', value: npc.birthday ? `${SEASON_NAMES[npc.birthday.season] ?? npc.birthday.season}季第${npc.birthday.day}天` : '不详' },
    ]
    if (npc.lovedItems.length > 0) {
      const names = npc.lovedItems.map(id => getItemById(id)?.name ?? id).join('、')
      details.push({ label: '最爱礼物', value: names })
    }
    if (npc.likedItems.length > 0) {
      const names = npc.likedItems.map(id => getItemById(id)?.name ?? id).join('、')
      details.push({ label: '喜欢礼物', value: names })
    }
    if (npc.hatedItems && npc.hatedItems.length > 0) {
      const names = npc.hatedItems.map(id => getItemById(id)?.name ?? id).join('、')
      details.push({ label: '讨厌礼物', value: names })
    }
    entries.push({
      id: `npc_${npc.id}`,
      name: npc.name,
      category: 'npc',
      categoryLabel: '村民',
      description: `${npc.role}，${npc.personality}`,
      details,
    })
  }

  // 动物
  for (const animal of ANIMAL_DEFS) {
    const building = ANIMAL_BUILDINGS.find(b => b.type === animal.building)
    const details: { label: string; value: string }[] = [
      { label: '饲养场所', value: building?.name ?? animal.building },
      { label: '产品', value: animal.productName },
      { label: '产出周期', value: `${animal.produceDays}天/次` },
      { label: '购买价格', value: `${animal.cost}文` },
    ]
    entries.push({
      id: `animal_${animal.type}`,
      name: animal.name,
      category: 'animal',
      categoryLabel: '动物',
      description: `饲养在${building?.name ?? animal.building}中，每${animal.produceDays}天产出${animal.productName}。`,
      details,
    })
  }

  // 食谱
  for (const recipe of RECIPES) {
    const ingredients = recipe.ingredients.map(i => {
      const itemName = getItemById(i.itemId)?.name ?? i.itemId
      return `${itemName}×${i.quantity}`
    }).join('、')
    const details: { label: string; value: string }[] = [
      { label: '食材', value: ingredients },
      { label: '解锁方式', value: recipe.unlockSource ?? '未知' },
    ]
    if (recipe.effect.staminaRestore) details.push({ label: '体力回复', value: `+${recipe.effect.staminaRestore}` })
    if (recipe.effect.healthRestore) details.push({ label: 'HP回复', value: `+${recipe.effect.healthRestore}` })
    if (recipe.effect.buff) details.push({ label: '增益效果', value: recipe.effect.buff.description })
    entries.push({
      id: `recipe_${recipe.id}`,
      name: recipe.name,
      category: 'recipe',
      categoryLabel: '食谱',
      description: recipe.description ?? '',
      details,
    })
  }

  // 加工机器
  for (const machine of PROCESSING_MACHINES) {
    const cost = machine.craftCost.map(c => {
      const itemName = getItemById(c.itemId)?.name ?? c.itemId
      return `${itemName}×${c.quantity}`
    }).join('、')
    const details: { label: string; value: string }[] = [
      { label: '制作材料', value: cost },
      { label: '制作费用', value: `${machine.craftMoney}文` },
    ]
    entries.push({
      id: `machine_${machine.id}`,
      name: machine.name,
      category: 'machine',
      categoryLabel: '机器',
      description: machine.description ?? '',
      details,
    })
  }

  // 戒指/帽子/鞋子共用效果名称映射
  const EQUIP_EFFECT_NAMES: Record<string, string> = {
    defense_bonus: '减伤', attack_bonus: '攻击力', stamina_bonus: '体力上限',
    farming_stamina: '农耕体力消耗', sell_bonus: '售价加成', shop_discount: '商店折扣',
    gift_friendship: '送礼好感', exp_bonus: '经验加成', luck: '幸运', ore_bonus: '额外矿石',
    fishing_bonus: '钓鱼技能', mining_bonus: '挖矿技能', max_hp_bonus: '最大HP',
    stamina_reduction: '体力消耗', treasure_find: '宝箱发现率', monster_drop_bonus: '怪物掉落',
    travel_speed: '旅行加速',
  }
  const EQUIP_FLAT_EFFECTS = new Set(['attack_bonus', 'max_hp_bonus', 'ore_bonus'])

  // 戒指
  for (const ring of RINGS) {
    const effectStr = ring.effects.map(e => {
      const name = EQUIP_EFFECT_NAMES[e.type] ?? e.type
      const val = EQUIP_FLAT_EFFECTS.has(e.type) ? `+${e.value}` : `+${Math.round(e.value * 100)}%`
      return `${name}${val}`
    }).join('、')
    const details: { label: string; value: string }[] = [
      { label: '效果', value: effectStr },
      { label: '获取方式', value: ring.obtainSource },
      { label: '售价', value: `${ring.sellPrice}文` },
    ]
    entries.push({
      id: `ring_${ring.id}`,
      name: ring.name,
      category: 'ring',
      categoryLabel: '戒指',
      description: ring.description ?? '',
      details,
    })
  }

  // 帽子
  for (const hat of HATS) {
    const effectStr = hat.effects.map(e => {
      const name = EQUIP_EFFECT_NAMES[e.type] ?? e.type
      const val = EQUIP_FLAT_EFFECTS.has(e.type) ? `+${e.value}` : `+${Math.round(e.value * 100)}%`
      return `${name}${val}`
    }).join('、')
    const details: { label: string; value: string }[] = [
      { label: '效果', value: effectStr },
      { label: '获取方式', value: hat.obtainSource },
      { label: '售价', value: `${hat.sellPrice}文` },
    ]
    entries.push({
      id: `hat_${hat.id}`,
      name: hat.name,
      category: 'hat',
      categoryLabel: '帽子',
      description: hat.description ?? '',
      details,
    })
  }

  // 武器
  const WEAPON_TYPE_NAMES: Record<string, string> = { sword: '剑', dagger: '匕首', club: '锤' }
  for (const weapon of Object.values(WEAPONS)) {
    const details: { label: string; value: string }[] = [
      { label: '类型', value: WEAPON_TYPE_NAMES[weapon.type] ?? weapon.type },
      { label: '攻击力', value: `${weapon.attack}` },
      { label: '暴击率', value: `${Math.round(weapon.critRate * 100)}%` },
    ]
    if (weapon.shopPrice !== null) details.push({ label: '购买价格', value: `${weapon.shopPrice}文` })
    if (weapon.fixedEnchantment) details.push({ label: '固定附魔', value: ENCHANTMENTS[weapon.fixedEnchantment]?.name ?? weapon.fixedEnchantment })
    entries.push({
      id: `weapon_${weapon.id}`,
      name: weapon.name,
      category: 'item',
      categoryLabel: '武器',
      description: weapon.description ?? '',
      details,
    })
  }

  // 通用物品（排除已被专项分类的）
  const ITEM_CATEGORY_NAMES: Record<string, string> = {
    seed: '种子', crop: '农作物', fish: '鱼类', animal_product: '畜产品', processed: '加工品',
    fruit: '水果', ore: '矿石', gem: '宝石', material: '材料', misc: '杂货', food: '料理',
    gift: '礼品', machine: '机器', sprinkler: '洒水器', fertilizer: '肥料', sapling: '树苗',
    bait: '鱼饵', tackle: '浮漂', bomb: '炸弹', fossil: '化石', artifact: '古物',
    weapon: '武器', ring: '戒指', hat: '帽子', shoe: '鞋子',
  }
  const specialItemIds = new Set([
    ...CROPS.map(c => c.id),
    ...FISH.map(f => f.id),
  ])
  for (const item of ITEMS) {
    if (specialItemIds.has(item.id)) continue
    if (['weapon', 'ring', 'hat', 'shoe'].includes(item.category)) continue
    const details: { label: string; value: string }[] = [
      { label: '分类', value: ITEM_CATEGORY_NAMES[item.category] ?? item.category },
      { label: '售价', value: `${item.sellPrice}文` },
    ]
    if (item.edible && item.staminaRestore) details.push({ label: '体力回复', value: `+${item.staminaRestore}` })
    if (item.edible && item.healthRestore) details.push({ label: 'HP回复', value: `+${item.healthRestore}` })
    entries.push({
      id: `item_${item.id}`,
      name: item.name,
      category: 'item',
      categoryLabel: ITEM_CATEGORY_NAMES[item.category] ?? '物品',
      description: item.description ?? '',
      details,
    })
  }

  // 鞋子
  for (const shoe of SHOES) {
    const effectStr = shoe.effects.map(e => {
      const name = EQUIP_EFFECT_NAMES[e.type] ?? e.type
      const val = EQUIP_FLAT_EFFECTS.has(e.type) ? `+${e.value}` : `+${Math.round(e.value * 100)}%`
      return `${name}${val}`
    }).join('、')
    const details: { label: string; value: string }[] = [
      { label: '效果', value: effectStr },
      { label: '获取方式', value: shoe.obtainSource },
      { label: '售价', value: `${shoe.sellPrice}文` },
    ]
    entries.push({
      id: `shoe_${shoe.id}`,
      name: shoe.name,
      category: 'shoe',
      categoryLabel: '鞋子',
      description: shoe.description ?? '',
      details,
    })
  }

  // 隐藏NPC（仙灵）
  for (const hnpc of HIDDEN_NPCS) {
    const details: { label: string; value: string }[] = [
      { label: '称号', value: hnpc.title },
      { label: '性格', value: hnpc.personality },
    ]
    if (hnpc.resonantOfferings.length > 0) {
      const names = hnpc.resonantOfferings.map(id => getItemById(id)?.name ?? id).join('、')
      details.push({ label: '灵犀供奉', value: names })
    }
    if (hnpc.pleasedOfferings.length > 0) {
      const names = hnpc.pleasedOfferings.map(id => getItemById(id)?.name ?? id).join('、')
      details.push({ label: '合意供奉', value: names })
    }
    entries.push({
      id: `hnpc_${hnpc.id}`,
      name: `${hnpc.name}（${hnpc.trueName}）`,
      category: 'npc',
      categoryLabel: '仙灵',
      description: hnpc.origin,
      details,
    })
  }

  // 钓鱼地点
  for (const loc of FISHING_LOCATIONS) {
    entries.push({
      id: `location_${loc.id}`,
      name: loc.name,
      category: 'location',
      categoryLabel: '地点',
      description: loc.description,
      details: [],
    })
  }

  return entries
}

export const GLOSSARY: GlossaryEntry[] = buildGlossary()
