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
  EQUIPMENT_ACCESSORY_DEFS,
  EQUIPMENT_ACCESSORY_FAMILIES,
  EQUIPMENT_ACCESSORY_FUSION_RULES,
  EQUIPMENT_ACCESSORY_MATERIAL_ITEM_ID,
  EQUIPMENT_ACCESSORY_PROTECT_ITEM_ID,
  EQUIPMENT_ACCESSORY_QUALITIES,
  EQUIPMENT_ACCESSORY_QUALITY_LABELS,
  EQUIPMENT_ACCESSORY_RECIPES,
  EQUIPMENT_ACCESSORY_SET_BONUSES,
  EQUIPMENT_ACCESSORY_TIERS,
  EQUIPMENT_ACCESSORY_TIER_LABELS,
  EQUIPMENT_ACCESSORY_TUNING_STONE_ITEM_ID,
} from './equipmentAccessories'
import { MYSTERY_BOX_DEFS, MYSTERY_BOX_NAMING_LAYERS, MYSTERY_BOX_SOURCE_HINTS } from './mysteryBoxes'
import { POTENTIAL_BRANCH_DEFS, POTENTIAL_EFFECT_VALUES, POTENTIAL_NODE_DEFS, POTENTIAL_RESOURCE_DEFS, POTENTIAL_SOURCE_RULES, formatPotentialEffectValue } from './potential'
import { PRIZE_TICKET_NAMING_LAYERS, REWARD_TICKET_PRIZE_STAGES, REWARD_TICKET_SOURCE_HINTS } from './prizeTickets'
import { VILLAGE_PROJECT_DEFS } from './villageProjects'
import {
  MAYOR_TICKET_CONVERSION_MONEY_COST,
  MAYOR_TICKET_CONVERSION_NPC_NAME,
  MAYOR_TICKET_CONVERSION_REQUIRED_FRIENDSHIP,
  MAYOR_TICKET_CONVERSION_REQUIRED_VILLAGE_PROJECT_LEVEL,
  MAYOR_TICKET_CONVERSION_SOURCE_TICKET_COST,
  MAYOR_TICKET_CONVERSION_TARGET_TICKET_AMOUNT,
  MAYOR_TICKET_CONVERSION_WEEKLY_LIMIT,
  MAYOR_TICKET_CONVERTIBLE_TYPES,
  REWARD_TICKET_DEFS,
  REWARD_TICKET_EXCHANGE_OFFERS,
  REWARD_TICKET_LABELS,
} from './rewardTickets'
import { WALLET_ARCHETYPES, WALLET_ITEMS } from './wallet'
import { WEEKLY_BUDGET_CHANNELS } from './weeklyBudgets'
import { CROP_USE_NATURE_LABELS, CROP_USE_RARITY_LABELS, CROP_USE_SPIRITUALITY_LABELS, CROP_USE_TAG_LABELS } from './cropUseProfiles'
import {
  getGlossaryEntryIdForItemId,
  getItemExtraDetails,
  getItemRelatedGlossaryEntryIds,
  getItemRelatedPanels,
  getItemSearchKeywords,
  getItemSourceText,
  getItemUsageText,
} from './itemEncyclopedia'

const PUBLIC_PROCESSING_RECIPES = PROCESSING_RECIPES.filter(recipe => recipe.visibility !== 'hidden')

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
  | 'currency'
  | 'system'

export type GlossaryIntentKey = 'acquire' | 'usage' | 'gift' | 'unlock' | 'where' | 'system'

export interface GlossaryDetail {
  label: string
  value: string
}

export interface GlossaryNpcPortrait {
  id?: string
  name?: string
  displayName?: string
  templateId?: string
  assetBase?: string
  fallbackText?: string
}

export interface GlossaryEntry {
  id: string
  itemId?: string
  npcPortrait?: GlossaryNpcPortrait
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
  location: '地点',
  currency: '票券',
  system: '机制'
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
  if (['seed', 'artifact', 'fossil', 'fruit', 'sapling', 'fish', 'crop', 'elixir'].includes(itemCategory)) intents.push('where')
  if (itemCategory === 'gift') intents.push('gift')
  return Array.from(new Set(intents))
}

const existingItemId = (itemId: string | null | undefined): string | undefined =>
  itemId && getItemById(itemId) ? itemId : undefined

const getRewardTicketLabel = (ticketType: string): string =>
  REWARD_TICKET_LABELS[ticketType as keyof typeof REWARD_TICKET_LABELS] ?? ticketType

const getRewardTicketSearchAliases = (label: string): string[] => {
  const aliases = ['票券', '票卷', '奖券', '奖卷', '资源券', '资源卷', label]
  if (label.endsWith('券')) aliases.push(label.replace(/券$/, '卷'))
  if (label.endsWith('卷')) aliases.push(label.replace(/卷$/, '券'))
  return uniqueStrings(aliases)
}

const formatItemRewards = (items: readonly { itemId: string; quantity: number }[]): string =>
  items.map(item => `${getItemById(item.itemId)?.name ?? item.itemId}×${item.quantity}`).join('、')

const formatPotentialRewards = (costs: readonly { resourceId: string; amount: number }[]): string =>
  costs.map(cost => `${POTENTIAL_RESOURCE_DEFS.find(resource => resource.id === cost.resourceId)?.label ?? cost.resourceId}×${cost.amount}`).join('、')

const getPotentialBranchLabel = (branchId: string): string =>
  POTENTIAL_BRANCH_DEFS.find(branch => branch.id === branchId)?.label ?? branchId

const getPrizeStageLabel = (stageId: string | undefined): string =>
  stageId ? REWARD_TICKET_PRIZE_STAGES.find(stage => stage.id === stageId)?.label ?? stageId : ''

const getMysteryBoxLabel = (boxId: string): string =>
  MYSTERY_BOX_DEFS.find(box => box.id === boxId)?.label ?? boxId

const formatMoney = (amount: number): string => `${amount}文`

const PERIOD_LABELS: Record<string, string> = {
  daily: '每日',
  weekly: '每周',
  seasonal: '每季',
}

const POTENTIAL_RESOURCE_GLOSSARY_DESCRIPTIONS: Partial<Record<string, string>> = {
  potential_insight: '通用潜能材料，矿洞首领、旧采石场周清理、高风险行旅、特殊订单、主题周、博物馆考据、仙灵记忆、节日出货箱和节会小游戏等长期结算都会少量沉淀。',
  spirit_breath: '偏向根骨与人和的轻灵潜能材料，主要来自仙灵结缘记忆归档、阿花或石头挚友后的童心甜点委托、日历节日当天的出货箱有效结算，或节会小游戏有效完成。',
  artisan_notes: '偏向巧作的手艺记录，可从特殊订单、博物馆考据和研究券兑换等经营研究线获得。',
  mountain_jade: '偏向山行的山野凭证，主要来自矿洞首领、高层首领、旧采石场管护、高风险行旅和区域首领远征。',
}

const POTENTIAL_RESOURCE_SOURCE_HINTS: Partial<Record<string, string>> = {
  potential_insight: '具体入口：矿洞或骷髅洞首领结算、旧采石场每周清理达标、高风险或精英行旅、特殊订单、主题周结算、博物馆捐赠里程碑/学者委托，以及仙灵记忆归档、节日当天出货箱结算或互动节日小游戏有效完成。',
  spirit_breath: '具体入口：NPC 页「仙灵」里把结缘记忆链推进到可收尾后点归档记忆；阿花或石头达到挚友后，告示板有概率刷出提交桂花糕、红枣糕等甜点的童心灵息委托；也可以在有日历节日的当天让出货箱结算产生收入，或完成互动节日小游戏并取得有效成绩。',
  artisan_notes: '具体入口：完成特殊订单/阶段性订单、领取博物馆捐赠里程碑或学者委托考据奖励；研究券也可在钱包兑换百工札记。',
  mountain_jade: '具体入口：击败矿洞 Boss/骷髅洞高层首领、清理复开的旧采石场，或完成区域地图里的高风险路线、精英路线、区域首领远征。',
}

const POTENTIAL_SOURCE_ENTRY_HINTS: Partial<Record<string, string>> = {
  mine_boss_clear: '击败矿洞 Boss 或骷髅洞高层首领后，在战斗结算中少量获得。',
  quarry_stewardship: '旧采石场复开后，在独立采石场页面清理露天可见资源、少量裂隙惊喜与采石场矿洞外围点位；每周累计清理满 12 格触发一次管护潜能奖励。',
  journey_high_risk: '完成区域地图里的高风险路线、精英路线或区域首领远征后获得。',
  special_order_finish: '在告示板完成特殊订单或阶段性订单提交时获得。',
  theme_week_settlement: '在目标页完成主题周或周目标收尾结算时，按表现发放。',
  museum_hidden_sample: '领取博物馆捐赠里程碑，或完成学者委托考据领奖时获得。',
  festival_spirit_event: '仙灵结缘后，在 NPC 页「仙灵」把结缘记忆链推进到“可收尾”并归档；也可以在有日历节日的当天，让出货箱结算收入大于 0。',
  festival_minigame_clear: '端午赛龙舟、钓鱼大赛、斗茶、灯谜、投壶、包饺子、烟花会、风筝会或农展会等互动节日小游戏结算奖金大于 0 时获得。',
  child_spirit_sweets: '阿花或石头达到挚友后，告示板有概率刷出提交桂花糕、红枣糕等甜点/糕点的童心灵息委托；完成后获得灵息×1。',
}

const WALLET_MODULE_LABELS: Record<string, string> = {
  shop: '商店',
  goal: '目标',
  farming: '农耕',
  fishing: '钓鱼',
  mining: '采矿',
  cooking: '烹饪',
}

const WALLET_SHOP_LABELS: Record<string, string> = {
  wanwupu: '万物铺',
  tiejiangpu: '铁匠铺',
  yugupu: '渔具铺',
  yaopu: '药铺',
  chouduanzhuang: '绸缎庄',
  jiuguan: '醉桃源酒馆',
  biaoju: '镖局',
}

const WALLET_GOAL_BIAS_LABELS: Record<string, string> = {
  cashflow: '现金流',
  farming: '农耕',
  fishing: '钓鱼',
  mining: '采矿',
  cooking: '烹饪',
  social: '社交',
  discovery: '探索见闻',
}

const WALLET_POOL_LABELS: Record<string, string> = {
  basic: '基础消费池',
  weekly: '每周精选',
  seasonal: '季节限定',
  premium: '高价长期商品',
}

const LINKED_SYSTEM_LABELS: Record<string, string> = {
  quest: '告示板',
  goal: '目标',
  museum: '博物馆',
  guild: '公会',
  hanhai: '瀚海',
  farm: '农场',
  shop: '商圈',
  village: '桃源村',
  wallet: '钱包',
}

const formatPercent = (value: number): string => `${Math.round(value * 100)}%`

const formatDecimal = (value: number): string =>
  Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '')

const formatAccessoryEffectValue = (value: number, unit: 'flat' | 'percent' | 'hint'): string => {
  if (unit === 'percent') return `${formatDecimal(value * 100)}%`
  return formatDecimal(value)
}

const summarizeWalletEffect = (effect: {
  shopDiscount?: number
  shopDiscountByShopId?: Partial<Record<string, number>>
  goalWeights?: Partial<Record<string, number>>
  catalogPoolWeights?: Partial<Record<string, number>>
  catalogTagWeights?: Partial<Record<string, number>>
}): string[] => {
  const summaries: string[] = []
  if ((effect.shopDiscount ?? 0) > 0) summaries.push(`通用购物折扣 ${formatPercent(effect.shopDiscount ?? 0)}`)

  const shopDiscounts = Object.entries(effect.shopDiscountByShopId ?? {}).filter(([, value]) => (value ?? 0) > 0)
  if (shopDiscounts.length > 0) {
    summaries.push(`指定商店折扣：${shopDiscounts.map(([shopId, value]) => `${WALLET_SHOP_LABELS[shopId] ?? shopId} ${formatPercent(value ?? 0)}`).join('、')}`)
  }

  const goalWeights = Object.entries(effect.goalWeights ?? {}).filter(([, value]) => (value ?? 0) > 0)
  if (goalWeights.length > 0) {
    summaries.push(`目标偏好：${goalWeights.map(([key]) => WALLET_GOAL_BIAS_LABELS[key] ?? key).join('、')}`)
  }

  const catalogPools = Object.entries(effect.catalogPoolWeights ?? {}).filter(([, value]) => (value ?? 0) > 0)
  if (catalogPools.length > 0) {
    summaries.push(`货架偏好：${catalogPools.map(([key]) => WALLET_POOL_LABELS[key] ?? key).join('、')}`)
  }

  const catalogTags = Object.entries(effect.catalogTagWeights ?? {}).filter(([, value]) => (value ?? 0) > 0)
  if (catalogTags.length > 0) {
    summaries.push(`推荐标签：${catalogTags.slice(0, 6).map(([key]) => key).join('、')}`)
  }

  return summaries
}

const getOfferRewardDetails = (offer: (typeof REWARD_TICKET_EXCHANGE_OFFERS)[number]): string[] => {
  const rewards: string[] = []
  const itemRewards = formatItemRewards(offer.rewardItems)
  if (itemRewards) rewards.push(itemRewards)
  const mysteryBoxRewards = (offer.rewardMysteryBoxes ?? []).map(box => `${getMysteryBoxLabel(box.boxId)}×${box.quantity}`).join('、')
  if (mysteryBoxRewards) rewards.push(mysteryBoxRewards)
  const potentialRewards = formatPotentialRewards(offer.rewardPotentialResources ?? [])
  if (potentialRewards) rewards.push(potentialRewards)
  return rewards
}

const getOfferRelatedEntryIds = (offer: (typeof REWARD_TICKET_EXCHANGE_OFFERS)[number]): string[] => uniqueStrings([
  `reward_ticket_${offer.ticketType}`,
  ...(offer.rewardItems ?? []).map(item => getGlossaryEntryIdForItemId(item.itemId)),
  ...(offer.rewardMysteryBoxes ?? []).map(box => `mystery_box_${box.boxId}`),
  ...(offer.rewardPotentialResources ?? []).map(resource => `potential_resource_${resource.resourceId}`),
  ...(offer.poolStageId ? [`reward_ticket_stage_${offer.poolStageId}`] : []),
])

const formatTicketLedger = (ledger: Partial<Record<string, number>> | undefined): string =>
  Object.entries(ledger ?? {})
    .filter(([, amount]) => (amount ?? 0) > 0)
    .map(([ticketType, amount]) => `${getRewardTicketLabel(ticketType)}×${amount}`)
    .join('、')

const formatLinkedSystems = (systems: readonly string[] | undefined): string =>
  uniqueStrings([...(systems ?? [])].map(system => LINKED_SYSTEM_LABELS[system] ?? system)).join('、')

const formatProjectMaterials = (materials: readonly { itemId: string; quantity: number }[]): string =>
  materials.map(material => `${getItemById(material.itemId)?.name ?? material.itemId}×${material.quantity}`).join('、')

const addRewardTicketGlossaryEntries = (entries: GlossaryEntry[]) => {
  const ticketPanels: CollectionPanelLink[] = [
    { panel: 'wallet', label: '去钱包看票券' },
    { panel: 'quest', label: '看告示板奖励' },
    { panel: 'goals', label: '看周目标' },
  ]

  entries.push(makeEntry({
    id: 'system_reward_ticket_prize_pool',
    name: '奖券命名与奖池阶段',
    category: 'currency',
    categoryLabel: '奖券',
    description: '委托、节庆、周赛和阶段成果会把奖励写入钱包票券，并按累计入账推进奖池层级。',
    details: [
      { label: '命名层', value: PRIZE_TICKET_NAMING_LAYERS.map(layer => `${layer.label}：${layer.summary}`).join('；') },
      { label: '阶段', value: REWARD_TICKET_PRIZE_STAGES.map(stage => `${stage.label}（累计${stage.unlockLifetimeTickets}张）：${stage.summary}`).join('；') },
      { label: '常见来源', value: REWARD_TICKET_SOURCE_HINTS.join('；') },
    ],
    source: '普通委托、特殊订单、节庆、周赛、主题周和阶段性交付会产出票券。具体余额在钱包页查看。',
    usage: '累计票券会推进初阶赏格、安居赏格、见闻赏契和高阶赏契；当前余额可在祠堂赏格或村衙赏契兑换补给、密匣或潜能材料。',
    relatedPanels: ticketPanels,
    relatedEntryIds: [
      ...REWARD_TICKET_DEFS.map(def => `reward_ticket_${def.id}`),
      ...REWARD_TICKET_PRIZE_STAGES.map(stage => `reward_ticket_stage_${stage.id}`),
    ],
    keywords: [
      '乡约牌',
      '祠堂赏格',
      '村衙赏契',
      '奖券',
      '票券',
      '资源券',
      '兑奖台',
      '奖池',
      '累计奖券',
      ...PRIZE_TICKET_NAMING_LAYERS.map(layer => layer.label),
      ...REWARD_TICKET_PRIZE_STAGES.map(stage => stage.label),
    ],
    intents: ['acquire', 'usage', 'system'],
  }))

  for (const stage of REWARD_TICKET_PRIZE_STAGES) {
    entries.push(makeEntry({
      id: `reward_ticket_stage_${stage.id}`,
      name: stage.label,
      category: 'currency',
      categoryLabel: '奖池阶段',
      description: stage.summary,
      details: [
        { label: '解锁门槛', value: `累计入账 ${stage.unlockLifetimeTickets} 张票券` },
        { label: '关联票券', value: stage.linkedTicketTypes.map(getRewardTicketLabel).join('、') },
        { label: '代表奖励', value: stage.spotlightRewards.join('、') },
        { label: '说明', value: stage.notes.join('；') },
      ],
      source: '由钱包中的票券累计入账推进，消费当前余额不会倒退已解锁阶段。',
      usage: '决定祠堂赏格、村衙赏契等兑换池更偏向补给、安居、见闻还是高阶长期奖励。',
      relatedPanels: ticketPanels,
      relatedEntryIds: ['system_reward_ticket_prize_pool', ...stage.linkedTicketTypes.map(ticketType => `reward_ticket_${ticketType}`)],
      keywords: ['奖池阶段', '累计票券', '赏格', '赏契', ...stage.spotlightRewards, ...stage.linkedTicketTypes.map(getRewardTicketLabel)],
      intents: ['unlock', 'usage', 'system'],
    }))
  }

  for (const def of REWARD_TICKET_DEFS) {
    const relatedOffers = REWARD_TICKET_EXCHANGE_OFFERS.filter(offer => offer.ticketType === def.id)
    const convertible = MAYOR_TICKET_CONVERTIBLE_TYPES.some(ticketType => ticketType === def.id)
    entries.push(makeEntry({
      id: `reward_ticket_${def.id}`,
      name: def.label,
      category: 'currency',
      categoryLabel: '票券',
      description: def.description,
      details: [
        { label: '底层类型', value: def.id },
        { label: '可兑换项目', value: relatedOffers.map(offer => offer.label).join('、') },
        { label: '村务转换', value: convertible ? `柳村长可按 ${MAYOR_TICKET_CONVERSION_SOURCE_TICKET_COST} 张换 ${MAYOR_TICKET_CONVERSION_TARGET_TICKET_AMOUNT} 张同阶目标券，另需 ${MAYOR_TICKET_CONVERSION_MONEY_COST} 文。` : '当前不参与柳村长的村务票据转换。' },
      ],
      source: '来自任务、周目标、特殊订单、周赛、节庆或部分瀚海/鱼塘/育种结算。',
      usage: relatedOffers.length > 0
        ? `在钱包页兑换：${relatedOffers.map(offer => `${offer.label}（${offer.costTickets}张）`).join('、')}。`
        : '当前主要作为钱包余额与后续系统预留凭证使用。',
      relatedPanels: ticketPanels,
      relatedEntryIds: [
        'system_reward_ticket_prize_pool',
        ...relatedOffers.map(offer => `reward_ticket_offer_${offer.id}`),
        ...REWARD_TICKET_PRIZE_STAGES.filter(stage => stage.linkedTicketTypes.includes(def.id)).map(stage => `reward_ticket_stage_${stage.id}`),
      ],
      keywords: getRewardTicketSearchAliases(def.label),
      intents: ['acquire', 'usage', 'system'],
    }))
  }

  for (const offer of REWARD_TICKET_EXCHANGE_OFFERS) {
    const rewardDetails = getOfferRewardDetails(offer)
    const counterLabel = offer.counterLabel ?? '兑奖台'
    const poolTags = offer.poolTags ?? []
    entries.push(makeEntry({
      id: `reward_ticket_offer_${offer.id}`,
      name: offer.label,
      category: 'currency',
      categoryLabel: '兑奖',
      description: offer.description,
      details: [
        { label: '消耗', value: `${getRewardTicketLabel(offer.ticketType)}×${offer.costTickets}` },
        { label: '奖池层', value: getPrizeStageLabel(offer.poolStageId) },
        { label: '兑奖台', value: counterLabel },
        { label: '兑换内容', value: rewardDetails.join('、') },
        { label: '标签', value: poolTags.join('、') },
      ],
      source: `在钱包页的${counterLabel}消耗${getRewardTicketLabel(offer.ticketType)}兑换。`,
      usage: rewardDetails.length > 0 ? `兑换后获得：${rewardDetails.join('、')}。` : '兑换后按奖池配置发放奖励。',
      relatedPanels: [{ panel: 'wallet', label: '去钱包兑换' }],
      relatedEntryIds: getOfferRelatedEntryIds(offer),
      keywords: [
        offer.label,
        offer.id,
        counterLabel,
        getRewardTicketLabel(offer.ticketType),
        ...getRewardTicketSearchAliases(getRewardTicketLabel(offer.ticketType)),
        ...poolTags,
        ...rewardDetails,
      ],
      intents: ['acquire', 'usage', 'system'],
    }))
  }

  entries.push(makeEntry({
    id: 'system_mayor_ticket_conversion',
    name: '村务票据转换',
    category: 'currency',
    categoryLabel: '票券',
    description: `柳村长开放的专项票券互转服务，用来把多余的建设券、展陈券、商路票和研究券调成当前更缺的方向。`,
    details: [
      { label: '负责人', value: MAYOR_TICKET_CONVERSION_NPC_NAME },
      { label: '开放条件', value: `村庄建设完成 ${MAYOR_TICKET_CONVERSION_REQUIRED_VILLAGE_PROJECT_LEVEL} 项，且柳村长好感达到 ${MAYOR_TICKET_CONVERSION_REQUIRED_FRIENDSHIP}。` },
      { label: '兑换成本', value: `${MAYOR_TICKET_CONVERSION_SOURCE_TICKET_COST} 张来源券 + ${MAYOR_TICKET_CONVERSION_MONEY_COST} 文，换 ${MAYOR_TICKET_CONVERSION_TARGET_TICKET_AMOUNT} 张目标券。` },
      { label: '周上限', value: `每周最多 ${MAYOR_TICKET_CONVERSION_WEEKLY_LIMIT} 次。` },
      { label: '可转换类型', value: MAYOR_TICKET_CONVERTIBLE_TYPES.map(getRewardTicketLabel).join('、') },
    ],
    source: '推进村庄建设并提升柳村长好感后，在钱包票券区查看转换项目。',
    usage: '用于补齐当前玩法线缺口，例如把暂时富余的展示/商路方向票券转给扩建、研究或供货线。',
    relatedPanels: [
      { panel: 'wallet', label: '去钱包看转换' },
      { panel: 'village', label: '去桃源村找柳村长' },
    ],
    relatedEntryIds: MAYOR_TICKET_CONVERTIBLE_TYPES.map(ticketType => `reward_ticket_${ticketType}`),
    keywords: ['柳村长', '村务票据', '票据转换', '票券转换', '换券', ...MAYOR_TICKET_CONVERTIBLE_TYPES.map(getRewardTicketLabel)],
    intents: ['unlock', 'usage', 'system'],
  }))
}

const addWeeklyBudgetGlossaryEntries = (entries: GlossaryEntry[]) => {
  entries.push(makeEntry({
    id: 'system_weekly_budget',
    name: '周预算',
    category: 'currency',
    categoryLabel: '票券',
    description: '每周把铜钱投入商路、展馆或学舍方向，让本周目标结算获得更高收益和专项票券。',
    details: [
      { label: '渠道', value: WEEKLY_BUDGET_CHANNELS.map(channel => channel.label).join('、') },
      { label: '续投规则', value: '每周开始后投入，当周有效；开启自动续投的槽位会在跨周时尝试同档位续投。' },
      { label: '票券方向', value: '商路预算产出商路票，展馆预算产出展陈券，学舍预算产出研究券。' },
    ],
    source: '在钱包页配置周预算，随后通过目标结算回收收益。',
    usage: '用于把本周日常目标引向现金、声望或研究积累，并稳定产出票券。',
    relatedPanels: [
      { panel: 'wallet', label: '去钱包配预算' },
      { panel: 'goals', label: '去目标页结算' },
    ],
    relatedEntryIds: WEEKLY_BUDGET_CHANNELS.map(channel => `weekly_budget_channel_${channel.channelId}`),
    keywords: ['周预算', '每周预算', '预算', '自动续投', '目标结算', '商路预算', '展馆预算', '学舍预算'],
    intents: ['acquire', 'usage', 'system'],
  }))

  for (const channel of WEEKLY_BUDGET_CHANNELS) {
    const tierEntryIds = channel.tiers.map(tier => `weekly_budget_tier_${tier.id}`)
    const ticketTypes = uniqueStrings(channel.tiers.flatMap(tier => Object.keys(tier.effect.ticketRewards ?? {})))
    entries.push(makeEntry({
      id: `weekly_budget_channel_${channel.channelId}`,
      name: channel.label,
      category: 'currency',
      categoryLabel: '周预算',
      description: channel.description,
      details: [
        { label: '简称', value: channel.shortLabel },
        { label: '生效规则', value: channel.resetRule },
        { label: '预算档位', value: channel.tiers.map(tier => `${tier.label}（${formatMoney(tier.costMoney)}）`).join('、') },
        { label: '票券产出', value: ticketTypes.map(getRewardTicketLabel).join('、') },
      ],
      source: '在钱包页选择预算渠道与档位后投入铜钱。',
      usage: `本周目标结算会读取${channel.label}效果：${channel.tiers.map(tier => `${tier.label}：${tier.effect.summary}`).join('；')}`,
      relatedPanels: [
        { panel: 'wallet', label: '去钱包配预算' },
        { panel: 'goals', label: '去目标页结算' },
      ],
      relatedEntryIds: ['system_weekly_budget', ...tierEntryIds, ...ticketTypes.map(ticketType => `reward_ticket_${ticketType}`)],
      keywords: [
        channel.label,
        channel.shortLabel,
        channel.description,
        channel.resetRule,
        '周预算',
        '预算档',
        '自动续投',
        ...channel.tiers.flatMap(tier => [tier.label, tier.effect.summary, formatTicketLedger(tier.effect.ticketRewards)]),
      ],
      intents: ['acquire', 'usage', 'system'],
    }))

    for (const tier of channel.tiers) {
      const ticketSummary = formatTicketLedger(tier.effect.ticketRewards)
      entries.push(makeEntry({
        id: `weekly_budget_tier_${tier.id}`,
        name: `${channel.label}·${tier.label}`,
        category: 'currency',
        categoryLabel: '预算档位',
        description: tier.effect.summary,
        details: [
          { label: '所属渠道', value: channel.label },
          { label: '投入成本', value: formatMoney(tier.costMoney) },
          { label: '预计价值', value: formatMoney(tier.projectedValue) },
          { label: '票券产出', value: ticketSummary },
          { label: '档位编号', value: `${tier.tier}` },
        ],
        source: `在钱包页选择${channel.label}的${tier.label}并投入${formatMoney(tier.costMoney)}。`,
        usage: tier.effect.summary,
        relatedPanels: [
          { panel: 'wallet', label: '去钱包配预算' },
          { panel: 'goals', label: '去目标页结算' },
        ],
        relatedEntryIds: [
          'system_weekly_budget',
          `weekly_budget_channel_${channel.channelId}`,
          ...Object.keys(tier.effect.ticketRewards ?? {}).map(ticketType => `reward_ticket_${ticketType}`),
        ],
        keywords: [
          channel.label,
          channel.shortLabel,
          tier.label,
          tier.id,
          tier.effect.summary,
          ticketSummary,
          '周预算',
          '预算档位',
          '目标结算',
        ],
        intents: ['acquire', 'usage', 'system'],
      }))
    }
  }
}

const addMysteryBoxGlossaryEntries = (entries: GlossaryEntry[]) => {
  entries.push(makeEntry({
    id: 'system_mystery_box_reward_pool',
    name: '密匣与神秘箱奖池',
    category: 'system',
    categoryLabel: '机制',
    description: '神秘箱是低频奖励容器，会把钓鱼、采集、挖矿、书商、节庆和奖券赏格中的小惊喜统一进钱包管理。',
    details: [
      { label: '命名层', value: MYSTERY_BOX_NAMING_LAYERS.map(layer => `${layer.label}：${layer.summary}`).join('；') },
      { label: '常见来源', value: MYSTERY_BOX_SOURCE_HINTS.join('；') },
      { label: '已接入箱体', value: MYSTERY_BOX_DEFS.map(box => `${box.label} / ${box.aliasLabel}`).join('、') },
    ],
    source: '来自钓鱼、采集、挖矿、怪物、书商、节庆或票券兑换。',
    usage: '在钱包页打开后，奖励会直接进入普通背包，并显示具体物品、数量和背包分类去向。',
    relatedPanels: [
      { panel: 'wallet', label: '去钱包开匣' },
      { panel: 'fishing', label: '去清溪钓鱼' },
      { panel: 'mining', label: '去矿洞探索' },
    ],
    relatedEntryIds: MYSTERY_BOX_DEFS.map(box => `mystery_box_${box.id}`),
    keywords: ['神秘箱', '密匣', '山泽遗箱', '灵物封匣', '开匣', '祠后开匣案', ...MYSTERY_BOX_NAMING_LAYERS.map(layer => layer.label)],
    intents: ['acquire', 'usage', 'system'],
  }))

  for (const box of MYSTERY_BOX_DEFS) {
    const rewardItemIds = box.rewardEntries.flatMap(entry => entry.rewardItems.map(item => item.itemId))
    entries.push(makeEntry({
      id: `mystery_box_${box.id}`,
      name: box.label,
      category: 'system',
      categoryLabel: '密匣',
      description: `${box.aliasLabel}，开启入口为${box.openingLabel}。`,
      details: [
        { label: '别名', value: box.aliasLabel },
        { label: '开启入口', value: box.openingLabel },
        { label: '来源提示', value: box.sourceHints.join('、') },
        { label: '可能奖励', value: box.rewardEntries.map(entry => `${entry.label}：${formatItemRewards(entry.rewardItems)}（${entry.summary}）`).join('；') },
      ],
      source: box.sourceHints.join('、'),
      usage: '在钱包页开启后，会把抽到的具体物品放入背包，并在日志中写明奖励去向。',
      relatedPanels: [{ panel: 'wallet', label: '去钱包开匣' }],
      relatedEntryIds: ['system_mystery_box_reward_pool', ...uniqueStrings(rewardItemIds).map(getGlossaryEntryIdForItemId)],
      keywords: [
        box.label,
        box.aliasLabel,
        box.openingLabel,
        box.id,
        ...box.sourceHints,
        ...box.rewardEntries.flatMap(entry => [entry.label, entry.summary, formatItemRewards(entry.rewardItems)]),
      ],
      intents: ['acquire', 'usage', 'system'],
    }))
  }
}

const addPotentialGlossaryEntries = (entries: GlossaryEntry[]) => {
  for (const branch of POTENTIAL_BRANCH_DEFS) {
    const branchNodes = POTENTIAL_NODE_DEFS.filter(node => node.branchId === branch.id)
    entries.push(makeEntry({
      id: `potential_branch_${branch.id}`,
      name: branch.label,
      category: 'system',
      categoryLabel: '潜能分支',
      description: branch.summary,
      details: [
        { label: '分支 ID', value: branch.id },
        { label: '节点', value: branchNodes.map(node => node.label).join('、') },
        { label: '主要材料', value: uniqueStrings(branchNodes.flatMap(node => node.costsByRank[0]?.map(cost => cost.resourceId) ?? [])).map(resourceId => POTENTIAL_RESOURCE_DEFS.find(resource => resource.id === resourceId)?.label ?? resourceId).join('、') },
      ],
      source: '在潜能页选择分支后查看和参悟。',
      usage: '用于规划角色长期成长方向。分支总阶会影响后续节点解锁。',
      relatedPanels: [{ panel: 'potential', label: '去潜能页' }],
      relatedEntryIds: branchNodes.map(node => `potential_node_${node.id}`),
      keywords: ['潜能', '潜能分支', branch.label, branch.id, ...branchNodes.map(node => node.label)],
      intents: ['unlock', 'usage', 'system'],
    }))
  }

  for (const resource of POTENTIAL_RESOURCE_DEFS) {
    const usedNodes = POTENTIAL_NODE_DEFS.filter(node => node.costsByRank.some(costs => costs.some(cost => cost.resourceId === resource.id)))
    const sourceRules = POTENTIAL_SOURCE_RULES.filter(rule => rule.rewards.some(reward => reward.resourceId === resource.id))
    entries.push(makeEntry({
      id: `potential_resource_${resource.id}`,
      name: resource.label,
      category: 'system',
      categoryLabel: '潜能材料',
      description: POTENTIAL_RESOURCE_GLOSSARY_DESCRIPTIONS[resource.id] ?? resource.summary,
      details: [
        { label: '适用分支', value: resource.branchHints.map(getPotentialBranchLabel).join('、') },
        { label: '获得方式', value: POTENTIAL_RESOURCE_SOURCE_HINTS[resource.id] ?? (sourceRules.length > 0 ? sourceRules.map(rule => `${rule.label}：${POTENTIAL_SOURCE_ENTRY_HINTS[rule.id] ?? rule.summary}`).join('；') : '来自潜能页列出的长期结算来源。') },
        { label: '常见来源', value: sourceRules.map(rule => rule.label).join('、') },
        { label: '消耗节点', value: usedNodes.slice(0, 8).map(node => node.label).join('、') },
      ],
      source: POTENTIAL_RESOURCE_SOURCE_HINTS[resource.id] ?? (sourceRules.length > 0 ? sourceRules.map(rule => `${rule.label}：${POTENTIAL_SOURCE_ENTRY_HINTS[rule.id] ?? rule.summary}`).join('；') : '来自潜能页列出的长期结算来源。'),
      usage: usedNodes.length > 0 ? `用于参悟：${usedNodes.slice(0, 8).map(node => node.label).join('、')}。` : '用于潜能参悟和后续成长节点。',
      relatedPanels: [{ panel: 'potential', label: '去潜能页' }],
      relatedEntryIds: [
        ...resource.branchHints.map(branchId => `potential_branch_${branchId}`),
        ...usedNodes.slice(0, 8).map(node => `potential_node_${node.id}`),
        ...sourceRules.map(rule => `potential_source_${rule.id}`),
      ],
      keywords: ['潜能材料', '潜能资源', resource.id, resource.label, POTENTIAL_RESOURCE_SOURCE_HINTS[resource.id] ?? '', ...resource.branchHints.map(getPotentialBranchLabel), ...sourceRules.map(rule => rule.label)],
      intents: ['acquire', 'usage', 'system'],
    }))
  }

  for (const node of POTENTIAL_NODE_DEFS) {
    const effect = POTENTIAL_EFFECT_VALUES[node.effectKey]
    entries.push(makeEntry({
      id: `potential_node_${node.id}`,
      name: node.label,
      category: 'system',
      categoryLabel: '潜能节点',
      description: node.summary,
      details: [
        { label: '所属分支', value: getPotentialBranchLabel(node.branchId) },
        { label: '上限', value: `${node.maxRank} 阶` },
        { label: '消耗示例', value: formatPotentialRewards(node.costsByRank[0] ?? []) },
        { label: '解锁条件', value: node.unlockConditions.length > 0 ? node.unlockConditions.map(condition => condition.label).join('、') : '默认开放' },
        { label: '作用面', value: node.surface },
        { label: '效果', value: effect ? `${effect.label}：${effect.playerSummary}；封顶 ${formatPotentialEffectValue(effect, effect.cap)}` : node.effectKey },
      ],
      source: `在潜能页的${getPotentialBranchLabel(node.branchId)}分支参悟。`,
      usage: effect?.playerSummary ?? node.surface,
      relatedPanels: [{ panel: 'potential', label: '去潜能页' }],
      relatedEntryIds: [
        `potential_branch_${node.branchId}`,
        ...uniqueStrings(node.costsByRank[0]?.map(cost => `potential_resource_${cost.resourceId}`) ?? []),
      ],
      keywords: [
        '潜能节点',
        '参悟',
        node.id,
        node.label,
        node.summary,
        node.surface,
        getPotentialBranchLabel(node.branchId),
        effect?.label ?? '',
        effect?.playerSummary ?? '',
        ...node.unlockConditions.map(condition => condition.label),
      ],
      intents: ['unlock', 'usage', 'system'],
    }))
  }

  for (const rule of POTENTIAL_SOURCE_RULES) {
    entries.push(makeEntry({
      id: `potential_source_${rule.id}`,
      name: rule.label,
      category: 'system',
      categoryLabel: '潜能来源',
      description: POTENTIAL_SOURCE_ENTRY_HINTS[rule.id] ?? rule.summary,
      details: [
        { label: '奖励', value: formatPotentialRewards(rule.rewards) },
        { label: '具体入口', value: POTENTIAL_SOURCE_ENTRY_HINTS[rule.id] ?? rule.summary },
        { label: '上限', value: `${PERIOD_LABELS[rule.cap.period] ?? rule.cap.period}最多 ${rule.cap.maxClaims} 次 / ${rule.cap.maxResourceAmount} 份材料` },
      ],
      source: POTENTIAL_SOURCE_ENTRY_HINTS[rule.id] ?? rule.summary,
      usage: '通过统一潜能来源结算发放，带周期上限和凭据去重。',
      relatedPanels: [{ panel: 'potential', label: '去潜能页' }],
      relatedEntryIds: rule.rewards.map(reward => `potential_resource_${reward.resourceId}`),
      keywords: ['潜能来源', rule.id, rule.label, rule.summary, POTENTIAL_SOURCE_ENTRY_HINTS[rule.id] ?? '', ...rule.rewards.map(reward => POTENTIAL_RESOURCE_DEFS.find(resource => resource.id === reward.resourceId)?.label ?? reward.resourceId)],
      intents: ['acquire', 'usage', 'system'],
    }))
  }
}

const addVillageProjectGlossaryEntries = (entries: GlossaryEntry[]) => {
  entries.push(makeEntry({
    id: 'system_village_projects',
    name: '村庄建设',
    category: 'system',
    categoryLabel: '机制',
    description: '村庄建设是把铜钱、材料、线索和跨系统进度转成长期村庄功能的恢复线。',
    details: [
      { label: '项目数', value: `${VILLAGE_PROJECT_DEFS.length} 项` },
      { label: '常见门槛', value: '项目线索、前置建设、委托 / 订单、博物馆、瀚海、公会和社区目标。' },
      { label: '常见回报', value: '任务容量、委托奖励、恢复设施、区域入口、展示/捐赠位和长期维护计划。' },
    ],
    source: '从设施页或村庄相关入口查看，部分项目需要先拿到 NPC/公告板线索。',
    usage: '用于承接中后期铜钱和材料，并把村庄从一次性建造扩展成持续经营网络。',
    relatedPanels: [
      { panel: 'village', label: '去桃源村' },
      { panel: 'home', label: '去设施页' },
      { panel: 'quest', label: '看公告板线索' },
    ],
    relatedEntryIds: VILLAGE_PROJECT_DEFS.map(project => `village_project_${project.id}`),
    keywords: ['村庄建设', '建设项目', '建设线索', '村建', '扩建', '维护', '捐献', ...VILLAGE_PROJECT_DEFS.map(project => project.name)],
    intents: ['unlock', 'usage', 'system'],
  }))

  for (const project of VILLAGE_PROJECT_DEFS) {
    const requirements = project.requirements ?? []
    const worldChanges = project.restorationProfile?.worldChanges ?? []
    const linkedSystems = formatLinkedSystems(project.linkedSystems)
    const maintenance = project.maintenancePlan
    const donation = project.donationPlan
    const stageConfig = project.stageConfig
    entries.push(makeEntry({
      id: `village_project_${project.id}`,
      name: project.name,
      category: 'system',
      categoryLabel: '村庄建设',
      description: project.description,
      details: [
        { label: '铜钱成本', value: formatMoney(project.moneyCost) },
        { label: '材料', value: formatProjectMaterials(project.materials) },
        { label: '建设收益', value: project.benefitSummary },
        { label: '线索条件', value: project.requiredClueText ?? '' },
        { label: '前置条件', value: requirements.map(requirement => requirement.label).join('、') },
        { label: '前置建设', value: project.requiredProjectText ?? '' },
        { label: '阶段', value: stageConfig ? `${stageConfig.stageLabel}（${stageConfig.stageIndex}/${stageConfig.totalStages}）：${stageConfig.gateSummary}` : project.fundingPhase },
        { label: '联动系统', value: linkedSystems },
        { label: '维护计划', value: maintenance ? `${maintenance.label}：每 ${maintenance.cycleDays} 天 ${formatMoney(maintenance.costMoney)}；${maintenance.effectSummary}` : '' },
        { label: '捐献计划', value: donation ? `${donation.label}：${donation.requirementSummary}；${donation.rewardSummary}` : '' },
        { label: '世界变化', value: worldChanges.map(change => `${change.title}：${change.summary}`).join('；') },
      ],
      source: project.requiredClueText
        ? `${project.requiredClueText}；满足材料与铜钱后可开工。`
        : '满足项目条件、材料与铜钱后可开工。',
      usage: `${project.benefitSummary}${worldChanges.length > 0 ? `；完成后：${worldChanges.map(change => change.summary).join('；')}` : ''}`,
      relatedPanels: [
        { panel: 'village', label: '去桃源村' },
        { panel: 'home', label: '去设施页' },
        { panel: 'quest', label: '看公告板线索' },
      ],
      relatedEntryIds: uniqueStrings([
        'system_village_projects',
        ...(project.materials ?? []).map(material => getGlossaryEntryIdForItemId(material.itemId)),
        ...(donation?.acceptedItemIds ?? []).map(getGlossaryEntryIdForItemId),
        ...(project.requiredProjectId ? [`village_project_${project.requiredProjectId}`] : []),
        ...(stageConfig?.previousStageProjectId ? [`village_project_${stageConfig.previousStageProjectId}`] : []),
        ...(stageConfig?.nextStageProjectId ? [`village_project_${stageConfig.nextStageProjectId}`] : []),
      ]),
      keywords: [
        '村庄建设',
        '建设项目',
        '村建',
        '建设线索',
        '扩建',
        '维护',
        '捐献',
        project.id,
        project.name,
        project.description,
        project.benefitSummary,
        project.requiredClueText ?? '',
        project.requiredProjectText ?? '',
        project.fundingPhase,
        project.contentTier ?? '',
        stageConfig?.stageLabel ?? '',
        stageConfig?.gateSummary ?? '',
        maintenance?.label ?? '',
        donation?.label ?? '',
        linkedSystems,
        ...requirements.map(requirement => requirement.label ?? ''),
        ...project.materials.map(material => getItemById(material.itemId)?.name ?? material.itemId),
        ...worldChanges.flatMap(change => [change.title, change.summary]),
      ],
      intents: ['unlock', 'usage', 'system'],
    }))
  }
}

const addWalletGlossaryEntries = (entries: GlossaryEntry[]) => {
  for (const item of WALLET_ITEMS) {
    entries.push(makeEntry({
      id: `wallet_item_${item.id}`,
      name: item.name,
      category: 'system',
      categoryLabel: '钱包物',
      description: item.description,
      details: [
        { label: '解锁条件', value: item.unlockCondition },
        { label: '效果类型', value: item.effect.type },
        { label: '效果数值', value: typeof item.effect.value === 'number' && item.effect.value < 1 ? formatPercent(item.effect.value) : `${item.effect.value}` },
      ],
      source: item.unlockCondition,
      usage: item.description,
      relatedPanels: [{ panel: 'wallet', label: '去钱包查看' }],
      relatedEntryIds: [],
      keywords: ['钱包物', '旧钱包', item.id, item.name, item.unlockCondition, item.description],
      intents: ['unlock', 'usage', 'system'],
    }))
  }

  for (const archetype of WALLET_ARCHETYPES) {
    entries.push(makeEntry({
      id: `wallet_archetype_${archetype.id}`,
      name: archetype.name,
      category: 'system',
      categoryLabel: '钱包流派',
      description: `${archetype.title}：${archetype.description}`,
      details: [
        { label: '解锁条件', value: archetype.unlockRequirement.label },
        { label: '主模块', value: archetype.primaryModules.map(module => WALLET_MODULE_LABELS[module] ?? module).join('、') },
        { label: '推荐商店', value: (archetype.recommendedShops ?? []).map(shopId => WALLET_SHOP_LABELS[shopId] ?? shopId).join('、') },
        { label: '主效果', value: archetype.mainEffectText },
        { label: '效果摘要', value: summarizeWalletEffect(archetype.effect).join('；') },
        { label: '后续节点', value: archetype.nodes.map(node => node.name).join('、') },
      ],
      source: archetype.unlockRequirement.label,
      usage: archetype.mainEffectText,
      relatedPanels: [{ panel: 'wallet', label: '去钱包选流派' }],
      relatedEntryIds: archetype.nodes.map(node => `wallet_node_${node.id}`),
      keywords: [
        '钱包流派',
        '经营流派',
        archetype.id,
        archetype.name,
        archetype.title,
        archetype.description,
        archetype.unlockRequirement.label,
        ...archetype.nodes.map(node => node.name),
      ],
      intents: ['unlock', 'usage', 'system'],
    }))

    for (const node of archetype.nodes) {
      entries.push(makeEntry({
        id: `wallet_node_${node.id}`,
        name: node.name,
        category: 'system',
        categoryLabel: '钱包节点',
        description: node.description,
        details: [
          { label: '所属流派', value: archetype.name },
          { label: '解锁条件', value: node.unlockRequirement.label },
          { label: '作用模块', value: node.modules.map(module => WALLET_MODULE_LABELS[module] ?? module).join('、') },
          { label: '效果摘要', value: summarizeWalletEffect(node.effect).join('；') },
        ],
        source: `选择${archetype.name}后，满足${node.unlockRequirement.label}。`,
        usage: node.description,
        relatedPanels: [{ panel: 'wallet', label: '去钱包看节点' }],
        relatedEntryIds: [`wallet_archetype_${archetype.id}`],
        keywords: ['钱包节点', node.id, node.name, node.description, archetype.name, node.unlockRequirement.label],
        intents: ['unlock', 'usage', 'system'],
      }))
    }
  }
}

const buildGlossary = (): GlossaryEntry[] => {
  const entries: GlossaryEntry[] = []

  for (const crop of CROPS) {
    const item = getItemById(crop.id)
    if (!item) continue
    entries.push(makeEntry({
      id: `crop_${crop.id}`,
      itemId: crop.id,
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
      itemId: fish.id,
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
    const details: GlossaryDetail[] = [
      { label: '身份', value: npc.role },
      { label: '性格', value: npc.personality },
      { label: '生日', value: npc.birthday ? `${SEASON_NAMES[npc.birthday.season] ?? npc.birthday.season}季第${npc.birthday.day}天` : '不详' },
      { label: '送礼研究', value: '礼物偏好需通过对话、纸条、节日观察与亲自送礼逐步记录。' },
    ]

    entries.push(makeEntry({
      id: `npc_${npc.id}`,
      name: npc.name,
      npcPortrait: {
        id: npc.id,
        name: npc.name,
        fallbackText: npc.name,
      },
      category: 'npc',
      categoryLabel: '村民',
      description: `${npc.role}，${npc.personality}`,
      details,
      usage: '通过送礼、交谈和事件推进关系，可解锁剧情、配方、邮件或特殊奖励。',
      relatedPanels: [
        { panel: 'village', label: '去桃源村社交' },
        { panel: 'quest', label: '看告示板与委托' },
      ],
      relatedEntryIds: [],
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
      itemId: existingItemId(`food_${recipe.id}`),
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
    const relatedEntryIds = uniqueStrings(PUBLIC_PROCESSING_RECIPES.filter(recipe => recipe.machineType === machine.id).flatMap(recipe => [
      ...(recipe.inputItemId ? [getGlossaryEntryIdForItemId(recipe.inputItemId)] : []),
      ...(recipe.outputItemId ? [getGlossaryEntryIdForItemId(recipe.outputItemId)] : []),
    ]))
    entries.push(makeEntry({
      id: `machine_${machine.id}`,
      itemId: existingItemId(machine.id),
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
      itemId: existingItemId(ring.id),
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
      itemId: existingItemId(hat.id),
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
      itemId: existingItemId(weapon.id),
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

  const accessoryMaterialEntryIds = [
    EQUIPMENT_ACCESSORY_MATERIAL_ITEM_ID,
    EQUIPMENT_ACCESSORY_TUNING_STONE_ITEM_ID,
    EQUIPMENT_ACCESSORY_PROTECT_ITEM_ID,
  ].map(getGlossaryEntryIdForItemId)
  const accessoryTierText = EQUIPMENT_ACCESSORY_TIERS.map(tier => EQUIPMENT_ACCESSORY_TIER_LABELS[tier]).join('、')
  const accessoryQualityText = EQUIPMENT_ACCESSORY_QUALITIES.map(quality => EQUIPMENT_ACCESSORY_QUALITY_LABELS[quality]).join('、')
  const accessoryFusionText = EQUIPMENT_ACCESSORY_FUSION_RULES
    .slice(0, 3)
    .map(rule => `${EQUIPMENT_ACCESSORY_QUALITY_LABELS[rule.fromQuality]}→${EQUIPMENT_ACCESSORY_QUALITY_LABELS[rule.toQuality]}保底${rule.pityThreshold}`)
    .join('、')

  for (const accessory of EQUIPMENT_ACCESSORY_DEFS) {
    const family = EQUIPMENT_ACCESSORY_FAMILIES.find(entry => entry.id === accessory.familyId)
    const setBonus = EQUIPMENT_ACCESSORY_SET_BONUSES.find(entry => entry.familyId === accessory.familyId)
    const recipeTiers = EQUIPMENT_ACCESSORY_RECIPES
      .filter(recipe => recipe.defId === accessory.id)
      .map(recipe => `${EQUIPMENT_ACCESSORY_TIER_LABELS[recipe.tier]}${recipe.unlock === 'blueprint' ? '蓝图' : recipe.unlock === 'workshop_advanced' ? '进阶工坊' : '工坊'}`)
      .join('、')
    const effectText = accessory.effects
      .map(effect => `${effect.label}：每级${formatAccessoryEffectValue(effect.basePerLevel, effect.unit)}，上限${formatAccessoryEffectValue(effect.maxValue, effect.unit)}`)
      .join('、')
    const setEffectText = setBonus?.effects
      .map(effect => `${effect.label}：每级${formatAccessoryEffectValue(effect.basePerLevel, effect.unit)}，上限${formatAccessoryEffectValue(effect.maxValue, effect.unit)}`)
      .join('、') ?? ''

    entries.push(makeEntry({
      id: `equipment_accessory_${accessory.id}`,
      name: accessory.name,
      category: 'system',
      categoryLabel: '配件',
      description: accessory.description,
      details: [
        { label: '配件线', value: family ? `${family.label}：${family.description}` : accessory.familyId },
        { label: '槽位', value: accessory.shortName },
        { label: '单件效果', value: effectText },
        { label: '阶级', value: accessoryTierText },
        { label: '品质', value: accessoryQualityText },
        { label: '制作入口', value: recipeTiers || '主要来自矿洞、深层矿洞、蓝图或特殊奖励。' },
        { label: '合成规则', value: `同名、同阶、同品质 3 件升为更高品质；${accessoryFusionText}；稳固石可在失败时保住 1 件材料配件。` },
        { label: '套装效果', value: setBonus ? `${setBonus.label}：${setBonus.description}${setEffectText ? `（${setEffectText}）` : ''}` : '' },
      ],
      source: '在铁匠铺的配件页定向打造，或从矿洞、深层矿洞、四阶蓝图和后续 NPC / 公会奖励中取得。',
      usage: '装入对应配件槽后提供单件基础效果；同一条线三槽齐备会触发三件套，套装阶级按三件中的最低阶计算，品质按平均品质向下取整。',
      relatedPanels: [
        { panel: 'upgrade', label: '去铁匠铺调校配件' },
        { panel: 'mining', label: '去矿洞获取配件' },
        { panel: 'quarry', label: '去采石场补材料' },
      ],
      relatedEntryIds: accessoryMaterialEntryIds,
      keywords: [
        '配件',
        '装备配件',
        '铁匠铺配件',
        '配件调校',
        '配件升级',
        '配件合成',
        '稳固石',
        '调校石',
        '配件材料',
        '一阶',
        '二阶',
        '三阶',
        '四阶',
        '普通',
        '精良',
        '卓越',
        '极品',
        '三件套',
        '套装效果',
        '矿洞掉落',
        '高级蓝图',
        accessory.id,
        accessory.shortName,
        family?.label ?? '',
        family?.description ?? '',
        effectText,
        setBonus?.label ?? '',
        setBonus?.description ?? '',
      ],
      intents: ['acquire', 'usage', 'unlock', 'where', 'system'],
    }))
  }

  const ITEM_CATEGORY_NAMES: Record<string, string> = {
    seed: '种子',
    crop: '农作物',
    fish: '鱼类',
    animal_product: '畜产品',
    processed: '加工品',
    elixir: '丹药',
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
      itemId: item.id,
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
      itemId: existingItemId(shoe.id),
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
      npcPortrait: {
        id: hiddenNpc.id,
        name: hiddenNpc.name,
        assetBase: `${hiddenNpc.name}-${hiddenNpc.trueName}`,
        fallbackText: hiddenNpc.name,
      },
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

  addRewardTicketGlossaryEntries(entries)
  addWeeklyBudgetGlossaryEntries(entries)
  addMysteryBoxGlossaryEntries(entries)
  addPotentialGlossaryEntries(entries)
  addVillageProjectGlossaryEntries(entries)
  addWalletGlossaryEntries(entries)

  entries.push(makeEntry({
    id: 'system_crop_use_profile',
    name: '作物用途标签',
    category: 'item',
    categoryLabel: '机制',
    description: 'CropUseProfile 会为每种作物标记非卖钱用途、风味、药性、灵性、消耗定位和推荐消耗场景，背包详情、作物图鉴和百科搜索共用同一份资料。',
    details: [
      { label: '用途标签', value: Object.entries(CROP_USE_TAG_LABELS).map(([key, label]) => `${key}/${label}`).join('、') },
      { label: '风味', value: '甜、鲜、辛、香、土、苦' },
      { label: '药性', value: Object.entries(CROP_USE_NATURE_LABELS).map(([key, label]) => `${key}/${label}`).join('、') },
      { label: '灵性', value: Object.entries(CROP_USE_SPIRITUALITY_LABELS).map(([key, label]) => `${key}/${label}`).join('、') },
      { label: '消耗定位', value: Object.entries(CROP_USE_RARITY_LABELS).map(([key, label]) => `${key}/${label}`).join('、') },
      { label: '覆盖范围', value: '首批核心作物保留人工档案，其余作物按名称、ID、描述和价格自动派生兜底档案。' },
    ],
    source: '作物数据、背包详情、作物图鉴和百科搜索。',
    usage: '用于判断作物适合料理、炼丹、宠物粮、榨油、制粉、酿酒、腌制、赠礼、节会、订单或药材储备，避免作物只剩出售换铜币。',
    relatedPanels: [
      { panel: 'farm', label: '回农场规划种植' },
      { panel: 'workshop', label: '去加工坊' },
      { panel: 'cooking', label: '去灶台查看' },
      { panel: 'animal', label: '去牧场查看' },
    ],
    relatedEntryIds: ['crop_rice', 'crop_sesame', 'crop_lotus_seed', 'crop_osmanthus', 'crop_tea', 'crop_chili'],
    keywords: [
      '作物用途标签',
      '作物用途',
      'CropUseProfile',
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
      'medicine',
      '料理',
      '炼丹',
      '宠物粮',
      '动物饲料',
      '榨油',
      '制粉',
      '酿酒',
      '腌制',
      '赠礼',
      '节会',
      '订单',
      '联机消耗',
      '药材',
      '甜',
      '鲜',
      '辛',
      '香',
      '土',
      '苦',
      '清凉',
      '温补',
      '中性',
      '灵性',
      '作物灵性',
      '凡品',
      '地气',
      '灵息',
      '玄妙',
      'mundane',
      'earth',
      'spirit',
      'mystic',
      'daily',
      'stable',
      'seasonal',
      'valuable',
    ],
    intents: ['usage', 'system'],
  }))

  entries.push(makeEntry({
    id: 'system_hidden_processing_recipe',
    name: '隐藏加工配方',
    category: 'item',
    categoryLabel: '机制',
    description: '工坊中的实验型加工配方。未发现前会以未知酿造、未知腌制、未知压榨等名称出现，首次收取成品后才记录为当前存档已发现配方。',
    details: [
      { label: '显示规则', value: '公开配方直接显示真名；隐藏配方未发现时显示未知名和剪影，收取后显示真实配方名。' },
      { label: '材料族', value: '酒坊读酿酒用途，酱缸读腌制用途，油坊读油料用途，石磨读制粉用途，药碾读药材用途，其他机器按花、甜果、鱼类、豆类等家族扩展。' },
      { label: '高阶门槛', value: '远古水果等专属隐藏配方需要工坊等级和持有稀有原料后才会出现。' },
      { label: '共同工坊', value: '共同工坊仍由服务端白名单控制，不接受任意客户端输入输出。' },
    ],
    source: '在工坊加工区选择未知配方并收取成品后发现。',
    usage: '用于给远古水果和大量用途明确的作物补充二级消耗出口，让中后期材料有更多加工路线。',
    relatedPanels: [
      { panel: 'workshop', label: '去工坊实验' },
      { panel: 'online', label: '去共同庄园' },
    ],
    relatedEntryIds: ['system_crop_use_profile', 'crop_ancient_fruit'],
    keywords: ['隐藏配方', '隐藏加工', '未知加工', '未知酿造', '未知腌制', '未知压榨', '通配配方', '实验配方', '远古果酒', 'ancient_fruit_wine', 'hidden processing recipe'],
    intents: ['unlock', 'usage', 'system'],
  }))

  entries.push(makeEntry({
    id: 'system_shared_fund_medium_spend',
    name: '共同基金中额支出',
    category: 'item',
    categoryLabel: '机制',
    description: '共同庄园中用于加工材料和建材预算的中额共同基金用途，走服务端权限、幂等、流水与审计。',
    details: [
      { label: '权限', value: '需要 fund.spend_medium；没有中额权限的成员会被服务端拒绝。' },
      { label: '加工用途', value: 'processing_materials / 中额加工材料，单次上限 600 文。' },
      { label: '建材用途', value: 'building_materials / 中额建材预算，单次上限 1200 文。' },
      { label: '边界', value: '不自动发物、不动个人铜币、不绕过大额双方确认；误操作按基金 ledger 人工补偿或后续返还流程处理。' },
    ],
    source: '在共同庄园的共同基金服务端支出链路中使用。',
    usage: '适合后续接工坊加工、共同建材和家族建筑预备流程；当前先作为可审计预算支出闭环。',
    relatedPanels: [
      { panel: 'online', label: '去共同庄园' },
      { panel: 'workshop', label: '查看工坊加工' },
    ],
    relatedEntryIds: [],
    keywords: ['共同基金', '中额支出', '中额加工材料', '中额建材预算', 'processing_materials', 'building_materials', '同居', '家族庄园'],
    intents: ['usage', 'system'],
  }))

  entries.push(makeEntry({
    id: 'system_shared_fund_large_confirmation',
    name: '共同基金大额确认',
    category: 'item',
    categoryLabel: '机制',
    description: '共同庄园中用于大额家族建筑和庄园扩建的共同基金确认草案，先走权限、余额、幂等、成员确认与审计，全部确认后可由有权限成员执行扣款。',
    details: [
      { label: '权限', value: '需要 fund.spend_large；大额确认安全阀 large_fund_spend_requires_both 保持强制开启。' },
      { label: '建筑用途', value: 'family_building / 大额家族建筑，草案阶段只记录目标、金额和确认成员。' },
      { label: '扩建用途', value: 'manor_expansion / 大额庄园扩建，执行扣款后会先写家族建筑流水，真实建造落账另走 real_build_apply。' },
      { label: '成员确认', value: '必需确认成员可提交 confirm；全部确认后草案进入 ready_to_execute。' },
      { label: '执行扣款', value: '有 fund.spend_large 的成员可提交 execute；成功写共同基金 spend ledger 与家族建筑流水，记录 final_spend_ledger_id / final_building_ledger_id。' },
      { label: '真实落账', value: 'real_build_apply 只能引用已扣款的建筑流水，把同一条 family_building_ledger 标记为 build_applied，不重复扣共同基金。' },
      { label: '材料消耗', value: 'materials/consume 只能引用已真实落账的建筑流水，按建筑材料计划扣共同仓库普通材料，并把 material_ledger_ids 回写到同一条建筑流水。' },
      { label: '边界', value: '草案和成员确认不扣款；执行只扣共同基金并写建筑流水；真实落账和材料消耗不改个人铜币，重复 idempotency_key 不会重复扣款、重复落账或重复扣材料。' },
    ],
    source: '在共同庄园的共同基金大额确认草案链路中使用。',
    usage: '适合后续接家族建筑、庄园扩建和高价值共同资产确认流程；当前已具备确认草案、成员确认、基金执行扣款、家族建筑流水记录、真实建造落账标记和共同仓库材料消耗落账，拆除、扩建细分和补偿重放仍待接入。',
    relatedPanels: [
      { panel: 'online', label: '去共同庄园' },
      { panel: 'workshop', label: '查看工坊加工' },
    ],
    relatedEntryIds: ['system_shared_fund_medium_spend'],
    keywords: ['共同基金', '大额确认', '大额建筑', '扩建', '双方确认', '成员确认', '确认提交', '执行扣款', '真实建造落账', '真实落账', '材料消耗', '共同仓库材料', 'ready_to_execute', 'executed', 'build_applied', 'materials_consumed', 'real_build_apply', 'materials/consume', 'large-spend-drafts', 'confirm', 'execute', 'spend_tier=large', 'fund_large_spend_draft_executed', 'family_building', 'manor_expansion', 'spend_large', '建筑 ledger', '家族建筑流水', '建筑流水', 'family_building_ledger', 'construction_ledger', 'final_building_ledger_id', 'apply_idempotency_key', 'materials_idempotency_key', 'material_ledger_ids', 'family_building_materials_consumed', '同居', '家族庄园'],
    intents: ['usage', 'system'],
  }))

  return entries
}

export const GLOSSARY: GlossaryEntry[] = buildGlossary()
