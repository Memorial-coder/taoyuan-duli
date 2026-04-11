import type { ItemCategory, ItemDef } from '@/types'
import type { PanelKey } from '@/composables/useNavigation'

export interface CollectionPanelLink {
  panel: PanelKey
  label: string
}

export interface CollectionUndiscoveredHint {
  summary: string
  clues: string[]
  relatedPanels: CollectionPanelLink[]
}

export interface CollectionMilestoneEffect {
  label: string
  panel?: PanelKey
}

export interface CollectionMilestoneDef {
  count: number
  title: string
  description: string
  effects: CollectionMilestoneEffect[]
}

export const COLLECTION_CATEGORY_NAMES: Record<string, string> = {
  seed: '种子',
  crop: '农作物',
  hybrid: '杂交作物',
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
  shoe: '鞋子'
}

export const COLLECTION_CATEGORY_COLORS: Partial<Record<ItemCategory, string>> = {
  crop: 'text-success',
  fish: 'text-water',
  ore: 'text-earth',
  gem: 'text-quality-supreme',
  food: 'text-quality-fine',
  fruit: 'text-success',
  animal_product: 'text-quality-fine',
  processed: 'text-accent',
  material: 'text-muted',
  misc: 'text-muted',
  gift: 'text-quality-excellent',
  seed: 'text-success/60',
  machine: 'text-muted',
  sprinkler: 'text-water',
  fertilizer: 'text-success/60',
  sapling: 'text-success/60',
  bait: 'text-water',
  tackle: 'text-water',
  bomb: 'text-danger',
  fossil: 'text-earth',
  artifact: 'text-quality-fine',
  weapon: 'text-danger',
  ring: 'text-quality-supreme',
  hat: 'text-accent',
  shoe: 'text-quality-excellent'
}

export const ITEM_USAGE_OVERRIDES: Record<string, string> = {
  rain_totem: '可主动使用，使明天下雨。适合补浇水、配合雨天鱼类或节省体力。',
  fish_feed: '用于鱼塘喂食，维持鱼的健康与产出。',
  water_purifier: '用于改善鱼塘水质，降低鱼类生病概率。',
  animal_medicine: '用于治疗生病的牲畜，使用后立即痊愈。',
  stamina_fruit: '属于永久成长道具，使用后可永久提升体力上限。',
  monster_lure: '在矿洞中使用，可让本层怪物数量增加。',
  slayer_charm: '探索矿洞前使用，可提高怪物掉落收益。',
  guild_badge: '属于永久成长道具，获得后可永久提升攻击力。',
  life_talisman: '属于永久成长道具，获得后可永久提升最大生命值。',
  defense_charm: '属于永久成长道具，获得后可永久提升防御。',
  lucky_coin: '属于永久成长道具，获得后可永久提升怪物掉落收益。',
  hanhai_map: '可在瀚海探宝玩法中使用，用于定位宝藏。',
  mega_bomb_recipe: '属于配方类道具，获得后可解锁巨型炸弹相关制作。',
  jade_ring: '可作为求婚道具使用。',
  silk_ribbon: '可作为约会告白道具使用。',
  zhiji_jade: '可作为结为知己的信物使用。'
}

export const getDefaultCollectionUsageByCategory = (category: ItemCategory, itemId: string): string => {
  switch (category) {
    case 'seed':
      return '可在已开垦地块播种；若是温室则无季节限制。'
    case 'crop':
    case 'fruit':
      return '可直接出售，部分还能食用恢复体力，并可作为加工或任务材料。'
    case 'fish':
      return '可出售、直接食用，部分鱼类还能用于烹饪、烟熏、任务或图鉴收集。'
    case 'food':
      return '可直接食用恢复体力/生命，部分料理还带有临时增益效果。'
    case 'processed':
      return '主要用于出售、送礼、任务或作为更高阶加工链的一部分，部分加工品也可直接食用。'
    case 'material':
      return '主要作为制作、建筑、加工或升级材料使用。'
    case 'machine':
      return itemId === 'crab_pot' ? '可放置在钓鱼地点，配合鱼饵每日自动捕获水产。' : '可在对应场景中放置，用于自动产出或加工其他物品。'
    case 'sprinkler':
      return '可放置在农田中，为周围地块提供自动浇水效果。'
    case 'fertilizer':
      return '可用于已开垦地块，提供品质、生长或保湿加成。'
    case 'bait':
      return '可在钓鱼前装配/消耗，改善鱼类行为或提升特定钓获收益。'
    case 'tackle':
      return '可装配在鱼竿上，提供钓鱼稳定、品质或体力方面的加成。'
    case 'bomb':
      return '主要在矿洞中使用，用于爆破矿石或清理怪物。'
    case 'animal_product':
      return '可出售、部分可食用，也常作为加工链原料。'
    case 'gift':
      return '可用于送礼；部分特殊礼物还能触发约会、求婚或知己系统。'
    case 'weapon':
      return '可装备到角色，提升战斗能力。'
    case 'ring':
    case 'hat':
    case 'shoe':
      return '可装备到角色，提供长期属性或玩法加成。'
    case 'artifact':
    case 'fossil':
      return '主要用于图鉴收集、博物馆/祠堂相关提交或收藏展示。'
    default:
      return '可用于出售、收集或在特定系统中发挥作用。'
  }
}

export const getCollectionUsageText = (item: ItemDef): string => {
  return ITEM_USAGE_OVERRIDES[item.id] ?? getDefaultCollectionUsageByCategory(item.category, item.id)
}

const getCategoryGuidance = (item: ItemDef): CollectionUndiscoveredHint => {
  switch (item.category) {
    case 'seed':
      return {
        summary: '这是一类尚未入手的种子，多半与商店货架、季节轮换或特殊区域有关。',
        clues: ['先去万物铺查看当季种子货架。', '若普通商店没有，可留意旅行商人或特殊区域商店。', '部分特殊种子需要先解锁对应玩法或地图。'],
        relatedPanels: [{ panel: 'shop', label: '去商圈看看' }, { panel: 'farm', label: '回农场规划播种' }]
      }
    case 'crop':
      return {
        summary: '该条目属于作物类，通常需要先拿到种子，再完成种植与收获。',
        clues: ['优先追查它对应的种子来源。', '留意季节限制，错季时可以考虑温室。', '若长期未见，可能来自育种或特殊作物线。'],
        relatedPanels: [{ panel: 'farm', label: '去农场种植' }, { panel: 'breeding', label: '查看育种图鉴' }]
      }
    case 'fish':
      return {
        summary: '这是未收录的鱼类，多半与出没地点、季节、天气或钓具条件有关。',
        clues: ['先到清溪钓鱼，并准备合适鱼饵/浮漂。', '若普通水域钓不到，可能需要鱼塘、蟹笼或特殊天气。', '可以优先补齐你当前季节尚未钓到的鱼类。'],
        relatedPanels: [{ panel: 'fishing', label: '去清溪钓鱼' }, { panel: 'fishpond', label: '查看鱼塘图鉴' }]
      }
    case 'fruit':
    case 'sapling':
      return {
        summary: '这与果树系统相关，通常需要先购买树苗，再等待成熟与应季结果。',
        clues: ['去万物铺查看是否有对应树苗出售。', '种下后需要等待较长成熟时间。', '只有在对应产果季节才能稳定收获。'],
        relatedPanels: [{ panel: 'shop', label: '去商圈买树苗' }, { panel: 'farm', label: '回农场种果树' }]
      }
    case 'processed':
    case 'machine':
    case 'sprinkler':
    case 'fertilizer':
    case 'bait':
    case 'tackle':
    case 'bomb':
      return {
        summary: '这类条目多半与加工、制作或商店设备相关。',
        clues: ['先检查加工坊与工坊是否已解锁对应功能。', '很多条目需要先收集原料，再制作或投入机器。', '部分进阶设备会在商圈高级货架中出现。'],
        relatedPanels: [{ panel: 'workshop', label: '去加工坊' }, { panel: 'shop', label: '查看商圈货架' }]
      }
    case 'food':
      return {
        summary: '这类条目通常来自烹饪系统。',
        clues: ['检查灶台中已解锁与未解锁的食谱。', '许多料理需要技能、好感或成就解锁。', '提升图鉴进度还能推进部分收藏型食谱解锁。'],
        relatedPanels: [{ panel: 'cooking', label: '去灶台查看' }, { panel: 'village', label: '提升村民关系' }]
      }
    case 'animal_product':
      return {
        summary: '这类条目多半来自牧场动物的日常产出。',
        clues: ['先扩建牧场并购买更多动物。', '不同动物会产出不同蛋、奶、毛或稀有副产物。', '高好感和稳定喂养能提高产出质量。'],
        relatedPanels: [{ panel: 'animal', label: '去牧场查看' }, { panel: 'shop', label: '去商圈补给' }]
      }
    case 'artifact':
    case 'fossil':
      return {
        summary: '该条目偏向收藏/捐赠，多与矿洞深层、特殊掉落或博物馆相关。',
        clues: ['优先深入矿洞并留意特殊层与稀有掉落。', '挖掘类收藏常和高层矿洞、特殊矿脉有关。', '发现后可继续关注博物馆捐赠进度。'],
        relatedPanels: [{ panel: 'mining', label: '去矿洞探索' }, { panel: 'museum', label: '查看博物馆' }]
      }
    case 'weapon':
    case 'ring':
    case 'hat':
    case 'shoe':
      return {
        summary: '这是装备类条目，通常来自商店购买、铁匠铺合成、公会奖励或矿洞掉落。',
        clues: ['先查看铁匠铺、绸缎庄、镖局和公会商店。', '部分装备需要材料合成，先补齐矿石与素材。', '少数高级装备只能在深层矿洞或特殊奖励中获得。'],
        relatedPanels: [{ panel: 'shop', label: '去商圈看装备' }, { panel: 'guild', label: '查看公会奖励' }, { panel: 'mining', label: '去矿洞探索' }]
      }
    case 'gift':
      return {
        summary: '这类条目通常与送礼、关系推进或特殊商店商品相关。',
        clues: ['优先查看绸缎庄与节日/特殊货架。', '部分礼物会在关系系统推进后显得更重要。', '如果和婚恋有关，记得同步推进村民好感。'],
        relatedPanels: [{ panel: 'shop', label: '去商圈买礼物' }, { panel: 'village', label: '去村里社交' }]
      }
    default:
      return {
        summary: '该条目尚未发现，通常可以从探索、经营、制作或商店中继续追查。',
        clues: ['先关注它所属分类的主要玩法入口。', '推进图鉴总进度后，会解锁更多商店货架与联动提示。', '也可结合成就、主线与长期目标，优先补齐缺口较大的分类。'],
        relatedPanels: [{ panel: 'quest', label: '查看目标线索' }, { panel: 'shop', label: '查看商圈' }]
      }
  }
}

export const getUndiscoveredCollectionHint = (item: ItemDef): CollectionUndiscoveredHint => getCategoryGuidance(item)

export const COLLECTION_MILESTONES: CollectionMilestoneDef[] = [
  {
    count: 10,
    title: '见闻初开',
    description: '图鉴发现达到 10 种后，可在万物铺每周精选中解锁更实用的便携商品。',
    effects: [{ label: '商圈解锁：竹编行囊', panel: 'shop' }, { label: '更适合前中期扩容经营' }]
  },
  {
    count: 20,
    title: '乡野识物',
    description: '图鉴发现达到 20 种后，万物铺会开始提供更偏经营补给向的周货。',
    effects: [{ label: '商圈解锁：百草收纳盒', panel: 'shop' }, { label: '长期目标与主线的图鉴分支更值得优先推进', panel: 'quest' }]
  },
  {
    count: 40,
    title: '经营眼界',
    description: '图鉴发现达到 40 种后，可接触更高阶的灌溉型经营货架。',
    effects: [{ label: '商圈解锁：匠心灌溉箱', panel: 'shop' }, { label: '农田自动化路线进一步打开', panel: 'home' }]
  },
  {
    count: 50,
    title: '收藏达人',
    description: '图鉴发现达到 50 种后，可解锁收藏型奖励食谱，并推动主线后段收集目标。',
    effects: [{ label: '料理解锁：收藏家宴（次日结算触发）', panel: 'cooking' }, { label: '主线/长期目标中的图鉴条件会进入关键推进区', panel: 'quest' }]
  },
  {
    count: 60,
    title: '博闻强记',
    description: '图鉴发现达到 60 种后，万物铺高价长期商品会开放更强的渔具补给。',
    effects: [{ label: '商圈解锁：垂钓大师礼盒', panel: 'shop' }, { label: '钓鱼与鱼塘经营的补给成型', panel: 'fishing' }]
  },
  {
    count: 80,
    title: '万物通鉴',
    description: '图鉴发现达到 80 种后，可在高价长期商品中解锁温室特许状。',
    effects: [{ label: '商圈解锁：温室特许状', panel: 'shop' }, { label: '农场全年经营路线进一步打开', panel: 'farm' }]
  }
]
