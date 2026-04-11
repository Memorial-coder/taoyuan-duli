import { ITEMS, getItemSource } from '@/data/items'
import { WEAPONS, MONSTER_DROP_WEAPONS, BOSS_DROP_WEAPONS, TREASURE_DROP_WEAPONS } from '@/data/weapons'
import { RINGS } from '@/data/rings'
import { HATS } from '@/data/hats'
import { SHOES } from '@/data/shoes'

export type RewardCatalogType = 'item' | 'seed' | 'weapon' | 'ring' | 'hat' | 'shoe'

export interface RewardCatalogEntry {
  type: RewardCatalogType
  id: string
  name: string
  description: string
  subtitle: string
  primaryFilterKey: string
  primaryFilterLabel: string
}

export interface RewardFilterOption {
  value: string
  label: string
}

const ITEM_CATEGORY_LABELS: Record<string, string> = {
  seed: '种子',
  crop: '作物',
  fish: '鱼类',
  ore: '矿石',
  gem: '宝石',
  gift: '礼物',
  food: '食物',
  material: '材料',
  misc: '杂项',
  processed: '加工品',
  machine: '机器',
  sprinkler: '洒水器',
  fertilizer: '肥料',
  animal_product: '动物产物',
  sapling: '树苗',
  fruit: '水果',
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

const buildSourceGroup = (rawText: string) => {
  const text = String(rawText || '')
  if (/BOSS|首杀/i.test(text)) return { key: 'boss', label: 'BOSS' }
  if (/宝箱/.test(text)) return { key: 'treasure', label: '宝箱' }
  if (/怪物|掉落/.test(text)) return { key: 'monster', label: '怪物掉落' }
  if (/公会/.test(text)) return { key: 'guild', label: '公会' }
  if (/商店|购买|店/.test(text)) return { key: 'shop', label: '商店' }
  if (/合成|制作/.test(text)) return { key: 'craft', label: '合成' }
  if (/矿洞|采矿|挖掘/.test(text)) return { key: 'mine', label: '矿洞' }
  if (/钓鱼|鱼/.test(text)) return { key: 'fish', label: '钓鱼' }
  if (/种植|收获|树|田/.test(text)) return { key: 'farm', label: '种植' }
  if (/采集|野/.test(text)) return { key: 'forage', label: '采集' }
  return { key: 'other', label: '其他' }
}

const weaponMonsterIds = new Set(Object.values(MONSTER_DROP_WEAPONS).flat().map(item => item.weaponId))
const weaponBossIds = new Set(Object.values(BOSS_DROP_WEAPONS))
const weaponTreasureIds = new Set(Object.values(TREASURE_DROP_WEAPONS).flat().map(item => item.weaponId))

const buildWeaponSource = (id: string, shopPrice: number | null) => {
  if (weaponBossIds.has(id)) return { key: 'boss', label: 'BOSS' }
  if (weaponTreasureIds.has(id)) return { key: 'treasure', label: '宝箱' }
  if (weaponMonsterIds.has(id)) return { key: 'monster', label: '怪物掉落' }
  if (shopPrice !== null) return { key: 'shop', label: '商店' }
  return { key: 'other', label: '其他' }
}

const itemCatalog: RewardCatalogEntry[] = ITEMS
  .filter(item => item.category !== 'seed' && item.category !== 'weapon' && item.category !== 'ring' && item.category !== 'hat' && item.category !== 'shoe')
  .map(item => ({
    type: 'item' as const,
    id: item.id,
    name: item.name,
    description: item.description,
    subtitle: `${ITEM_CATEGORY_LABELS[item.category] || item.category} · ${getItemSource(item.id)}`,
    primaryFilterKey: item.category,
    primaryFilterLabel: ITEM_CATEGORY_LABELS[item.category] || item.category,
  }))

const seedCatalog: RewardCatalogEntry[] = ITEMS
  .filter(item => item.category === 'seed')
  .map(item => {
    const source = buildSourceGroup(getItemSource(item.id))
    return {
      type: 'seed' as const,
      id: item.id,
      name: item.name,
      description: item.description,
      subtitle: `种子 · ${getItemSource(item.id)}`,
      primaryFilterKey: source.key,
      primaryFilterLabel: source.label,
    }
  })

const weaponCatalog: RewardCatalogEntry[] = Object.values(WEAPONS).map(item => {
  const source = buildWeaponSource(item.id, item.shopPrice)
  return {
    type: 'weapon' as const,
    id: item.id,
    name: item.name,
    description: item.description,
    subtitle: `${source.label} · 攻击 ${item.attack}`,
    primaryFilterKey: source.key,
    primaryFilterLabel: source.label,
  }
})

const ringCatalog: RewardCatalogEntry[] = RINGS.map(item => {
  const source = buildSourceGroup(item.obtainSource)
  return {
    type: 'ring' as const,
    id: item.id,
    name: item.name,
    description: item.description,
    subtitle: `${source.label} · 戒指`,
    primaryFilterKey: source.key,
    primaryFilterLabel: source.label,
  }
})

const hatCatalog: RewardCatalogEntry[] = HATS.map(item => {
  const source = buildSourceGroup(item.obtainSource)
  return {
    type: 'hat' as const,
    id: item.id,
    name: item.name,
    description: item.description,
    subtitle: `${source.label} · 帽子`,
    primaryFilterKey: source.key,
    primaryFilterLabel: source.label,
  }
})

const shoeCatalog: RewardCatalogEntry[] = SHOES.map(item => {
  const source = buildSourceGroup(item.obtainSource)
  return {
    type: 'shoe' as const,
    id: item.id,
    name: item.name,
    description: item.description,
    subtitle: `${source.label} · 鞋子`,
    primaryFilterKey: source.key,
    primaryFilterLabel: source.label,
  }
})

const catalogMap: Record<RewardCatalogType, RewardCatalogEntry[]> = {
  item: itemCatalog,
  seed: seedCatalog,
  weapon: weaponCatalog,
  ring: ringCatalog,
  hat: hatCatalog,
  shoe: shoeCatalog,
}

export const getRewardCatalogByType = (type: RewardCatalogType) => {
  return catalogMap[type]
}

export const getRewardFilterOptions = (type: RewardCatalogType): RewardFilterOption[] => {
  const seen = new Set<string>()
  const options: RewardFilterOption[] = [{ value: '', label: '全部' }]
  for (const entry of catalogMap[type]) {
    if (seen.has(entry.primaryFilterKey)) continue
    seen.add(entry.primaryFilterKey)
    options.push({
      value: entry.primaryFilterKey,
      label: entry.primaryFilterLabel,
    })
  }
  return options
}

export const filterRewardCatalog = (type: RewardCatalogType, keyword: string, primaryFilter: string) => {
  const normalizedKeyword = keyword.trim().toLowerCase()
  return catalogMap[type].filter(entry => {
    if (primaryFilter && entry.primaryFilterKey !== primaryFilter) return false
    if (!normalizedKeyword) return true
    const haystack = `${entry.name} ${entry.id} ${entry.description} ${entry.subtitle}`.toLowerCase()
    return haystack.includes(normalizedKeyword)
  })
}

export const getRewardCatalogEntry = (type: RewardCatalogType, id: string) => {
  return catalogMap[type].find(entry => entry.id === id) || null
}
