import type { LinkageDemandEntry } from '@/types'
import { getProcessedItemDemandCandidates } from './processedItemGroups'

const PROCESSED_GROUP_ORDER_DEMAND_POOL: LinkageDemandEntry[] = getProcessedItemDemandCandidates('quest').map(candidate => ({
  id: `processed_group_${candidate.groupId}_${candidate.itemId}_order`,
  itemId: candidate.itemId,
  processedGroupId: candidate.groupId,
  minQuantity: 1,
  maxQuantity: 4,
  systems: ['quest'],
  tags: ['processed_group', candidate.groupId, 'weekly_order', 'processed_sink'],
  antiRepeatTags: ['processed_group', candidate.groupId, candidate.itemId],
  rewardHint: 'mixed',
  repeatWindow: 'weekly',
  notes: [`来自加工分组「${candidate.groupLabel}」的订单候选。`]
}))

export const LINKAGE_DEMAND_POOL: LinkageDemandEntry[] = [
  {
    id: 'mixed_seed_oil_home_cooking',
    itemId: 'mixed_seed_oil',
    processedGroupId: 'oil',
    minQuantity: 1,
    maxQuantity: 2,
    systems: ['cooking', 'familyWish'],
    tags: ['oil', 'home_cooking', 'family_breakfast', 'breakfast', 'processed_sink'],
    familyWishIds: ['wish_shared_breakfast'],
    antiRepeatTags: ['family_breakfast', 'oil', 'mixed_seed_oil'],
    sourceHint: '油坊榨油或特殊订单备料',
    rewardHint: 'friendship',
    repeatWindow: 'daily',
    notes: ['已接料理和家庭心愿真实扣料，后续可扩到更多早餐/节前备料心愿。']
  },
  {
    id: 'mixed_seed_oil_special_order',
    itemId: 'mixed_seed_oil',
    processedGroupId: 'oil',
    minQuantity: 3,
    maxQuantity: 6,
    systems: ['quest'],
    tags: ['oil', 'weekly_order', 'festival_prep', 'processed_sink'],
    antiRepeatTags: ['festival_prep', 'oil', 'mixed_seed_oil'],
    rewardHint: 'mixed',
    repeatWindow: 'weekly',
    ticketReward: { caravan: 1 }
  },
  {
    id: 'manor_edge_bundle_online_order',
    itemId: 'manor_edge_bundle',
    minQuantity: 3,
    maxQuantity: 5,
    systems: ['onlineOrder'],
    tags: ['manor', 'public_storage', 'weekly_order', 'weak_item_sink'],
    familyWishIds: ['wish_lakeside_outing'],
    antiRepeatTags: ['public_storage', 'manor', 'manor_edge_bundle'],
    rewardHint: 'ticket',
    repeatWindow: 'weekly',
    ticketReward: { caravan: 1 }
  },
  {
    id: 'mixed_seed_oil_online_public_kitchen',
    itemId: 'mixed_seed_oil',
    processedGroupId: 'oil',
    minQuantity: 1,
    maxQuantity: 2,
    systems: ['onlineOrder'],
    tags: ['oil', 'public_storage', 'weekly_order', 'weak_item_sink', 'processed_sink'],
    familyWishIds: ['wish_shared_breakfast', 'wish_market_feast'],
    antiRepeatTags: ['public_storage', 'family_breakfast', 'festival_prep', 'oil', 'mixed_seed_oil'],
    rewardHint: 'ticket',
    repeatWindow: 'weekly',
    ticketReward: { caravan: 1 },
    notes: ['线上公共灶间备油单会真实扣除杂籽油，避免隐藏榨油产物只停留在料理和家庭。']
  },
  {
    id: 'rice_flour_online_pastry_supply',
    itemId: 'rice_flour',
    processedGroupId: 'flour',
    minQuantity: 2,
    maxQuantity: 3,
    systems: ['onlineOrder'],
    tags: ['flour', 'public_storage', 'weekly_order', 'weak_item_sink', 'processed_sink'],
    familyWishIds: ['wish_market_feast'],
    antiRepeatTags: ['public_storage', 'festival_prep', 'flour', 'rice_flour'],
    rewardHint: 'ticket',
    repeatWindow: 'weekly',
    ticketReward: { familyFavor: 1 },
    notes: ['邻里糕点粉料单会真实扣除米粉，作为粉料分组的线上周期出口。']
  },
  {
    id: 'dried_crop_bundle_online_winter_storage',
    itemId: 'dried_crop_bundle',
    processedGroupId: 'dried',
    minQuantity: 2,
    maxQuantity: 3,
    systems: ['onlineOrder'],
    tags: ['dried', 'public_storage', 'weekly_order', 'weak_item_sink', 'processed_sink'],
    antiRepeatTags: ['public_storage', 'dried', 'dried_crop_bundle'],
    rewardHint: 'ticket',
    repeatWindow: 'weekly',
    ticketReward: { caravan: 1 },
    notes: ['冬储田园干货单会真实扣除田园干货包，补公共仓长期备料。']
  },
  {
    id: 'dried_fruit_mix_online_travel_supply',
    itemId: 'dried_fruit_mix',
    processedGroupId: 'dried',
    minQuantity: 1,
    maxQuantity: 2,
    systems: ['onlineOrder'],
    tags: ['dried', 'sweet', 'public_storage', 'weekly_order', 'weak_item_sink', 'processed_sink'],
    antiRepeatTags: ['public_storage', 'festival_prep', 'dried', 'sweet', 'dried_fruit_mix'],
    rewardHint: 'ticket',
    repeatWindow: 'weekly',
    ticketReward: { caravan: 1 },
    notes: ['旅途果干补给单会真实扣除什锦果干，给甜味干货增加线上公共仓出口。']
  },
  {
    id: 'fish_feed_online_pond_supply',
    itemId: 'fish_feed',
    processedGroupId: 'fish_processed',
    minQuantity: 3,
    maxQuantity: 5,
    systems: ['onlineOrder'],
    tags: ['fish_processed', 'fishpond', 'public_storage', 'weekly_order', 'weak_item_sink', 'processed_sink'],
    familyWishIds: ['wish_pond_moonwatch'],
    antiRepeatTags: ['public_storage', 'fishpond', 'fish_processed', 'fish_feed'],
    rewardHint: 'ticket',
    repeatWindow: 'weekly',
    ticketReward: { familyFavor: 1 },
    notes: ['公共鱼塘饲料单会真实扣除鱼饲料，连接鱼塘、家庭和线上公共仓。']
  },
  {
    id: 'standard_bait_online_fishing_supply',
    itemId: 'standard_bait',
    processedGroupId: 'feed',
    minQuantity: 6,
    maxQuantity: 10,
    systems: ['onlineOrder'],
    tags: ['feed', 'fishing', 'public_storage', 'weekly_order', 'weak_item_sink'],
    familyWishIds: ['wish_lakeside_outing', 'wish_pond_moonwatch'],
    antiRepeatTags: ['public_storage', 'fishing', 'feed', 'standard_bait'],
    rewardHint: 'ticket',
    repeatWindow: 'weekly',
    ticketReward: { caravan: 1 },
    notes: ['邻里鱼饵补给单会真实扣除普通鱼饵，给低单价高流量物资一个温和周回收口。']
  },
  {
    id: 'manor_edge_bundle_pet_feed',
    itemId: 'manor_edge_bundle',
    minQuantity: 1,
    maxQuantity: 1,
    systems: ['petFeed'],
    tags: ['manor', 'pet_feed', 'daily_sink', 'weak_item_sink'],
    antiRepeatTags: ['pet_feed', 'manor', 'manor_edge_bundle'],
    rewardHint: 'friendship',
    repeatWindow: 'daily'
  },
  {
    id: 'manor_edge_bundle_family_outing',
    itemId: 'manor_edge_bundle',
    minQuantity: 2,
    maxQuantity: 2,
    systems: ['familyWish'],
    tags: ['manor', 'family_wish', 'outing', 'weak_item_sink'],
    familyWishIds: ['wish_lakeside_outing'],
    antiRepeatTags: ['family_wish', 'outing', 'manor', 'manor_edge_bundle'],
    sourceHint: '线上庄园边角来源',
    rewardHint: 'friendship',
    repeatWindow: 'weekly',
    notes: ['湖畔相伴家庭心愿会真实扣除庄园边角菜包，避免该线上来源只停在宠物和在线订单。']
  },
  {
    id: 'paper_family_archive',
    itemId: 'paper',
    processedGroupId: 'refined_material',
    minQuantity: 2,
    maxQuantity: 4,
    systems: ['familyWish'],
    tags: ['family_wish', 'archive', 'processed_sink'],
    familyWishIds: ['wish_legacy_archive', 'wish_archive_patron', 'wish_spirit_archive'],
    antiRepeatTags: ['family_wish', 'archive', 'refined_material', 'paper'],
    sourceHint: '回收、文书档案整理或工坊造纸',
    rewardHint: 'friendship',
    repeatWindow: 'weekly'
  },
  {
    id: 'charcoal_family_archive',
    itemId: 'charcoal',
    processedGroupId: 'refined_material',
    minQuantity: 2,
    maxQuantity: 2,
    systems: ['familyWish'],
    tags: ['family_wish', 'archive', 'crafting', 'processed_sink'],
    familyWishIds: ['wish_legacy_archive'],
    antiRepeatTags: ['family_wish', 'archive', 'refined_material', 'charcoal'],
    sourceHint: '炭窑烧制',
    rewardHint: 'friendship',
    repeatWindow: 'weekly'
  },
  {
    id: 'rice_flour_family_festival_prep',
    itemId: 'rice_flour',
    processedGroupId: 'flour',
    minQuantity: 1,
    maxQuantity: 1,
    systems: ['familyWish'],
    tags: ['family_wish', 'festival_prep', 'flour', 'processed_sink'],
    familyWishIds: ['wish_market_feast'],
    antiRepeatTags: ['family_wish', 'festival_prep', 'flour', 'rice_flour'],
    sourceHint: '石磨加工',
    rewardHint: 'friendship',
    repeatWindow: 'weekly'
  },
  {
    id: 'cloth_family_archive',
    itemId: 'cloth',
    processedGroupId: 'textile',
    minQuantity: 1,
    maxQuantity: 1,
    systems: ['familyWish'],
    tags: ['family_wish', 'archive', 'textile', 'processed_sink'],
    familyWishIds: ['wish_archive_patron'],
    antiRepeatTags: ['family_wish', 'archive', 'textile', 'cloth'],
    sourceHint: '织布机加工',
    rewardHint: 'friendship',
    repeatWindow: 'weekly'
  },
  {
    id: 'fish_feed_family_pond',
    itemId: 'fish_feed',
    processedGroupId: 'fish_processed',
    minQuantity: 1,
    maxQuantity: 1,
    systems: ['familyWish'],
    tags: ['family_wish', 'fishpond', 'processed_sink'],
    familyWishIds: ['wish_pond_moonwatch'],
    antiRepeatTags: ['family_wish', 'fishpond', 'fish_processed', 'fish_feed'],
    sourceHint: '磨坊、回收站或商店补给',
    rewardHint: 'friendship',
    repeatWindow: 'weekly'
  },
  {
    id: 'standard_bait_family_outing',
    itemId: 'standard_bait',
    processedGroupId: 'feed',
    minQuantity: 2,
    maxQuantity: 2,
    systems: ['familyWish'],
    tags: ['family_wish', 'outing', 'fishing', 'feed'],
    familyWishIds: ['wish_lakeside_outing', 'wish_pond_moonwatch'],
    antiRepeatTags: ['family_wish', 'outing', 'fishing', 'feed', 'standard_bait'],
    sourceHint: '鱼饵机或钓前准备',
    rewardHint: 'friendship',
    repeatWindow: 'weekly'
  },
  {
    id: 'pine_incense_family_spirit_archive',
    itemId: 'pine_incense',
    processedGroupId: 'incense',
    minQuantity: 2,
    maxQuantity: 2,
    systems: ['familyWish'],
    tags: ['family_wish', 'spirit', 'festival_prep', 'incense', 'processed_sink'],
    familyWishIds: ['wish_spirit_archive'],
    antiRepeatTags: ['family_wish', 'spirit', 'festival_prep', 'incense', 'pine_incense'],
    sourceHint: '制香坊合成',
    rewardHint: 'friendship',
    repeatWindow: 'weekly'
  },
  {
    id: 'paper_child_study_training',
    itemId: 'paper',
    processedGroupId: 'refined_material',
    minQuantity: 2,
    maxQuantity: 2,
    systems: ['childTraining'],
    tags: ['child_training', 'study', 'archive', 'daily_sink'],
    rewardHint: 'friendship',
    repeatWindow: 'daily',
    notes: ['小屋学识训练会真实扣除纸张，作为抄写、档案复写和博物馆笔记材料。']
  },
  {
    id: 'food_rice_ball_child_body_training',
    itemId: 'food_rice_ball',
    minQuantity: 1,
    maxQuantity: 1,
    systems: ['childTraining'],
    tags: ['child_training', 'body', 'home_cooking', 'daily_sink'],
    rewardHint: 'friendship',
    repeatWindow: 'daily',
    notes: ['孩子体魄/社交训练会真实扣除饭团，推动基础料理进入家庭长期消耗。']
  },
  {
    id: 'adventurer_ration_child_body_training',
    itemId: 'adventurer_ration',
    minQuantity: 1,
    maxQuantity: 1,
    systems: ['childTraining'],
    tags: ['child_training', 'body', 'guild', 'daily_sink'],
    rewardHint: 'friendship',
    repeatWindow: 'daily',
    notes: ['孩子体魄/社交训练会真实扣除冒险口粮，给公会补给增加家庭用途。']
  },
  {
    id: 'fish_feed_child_nature_training',
    itemId: 'fish_feed',
    processedGroupId: 'fish_processed',
    minQuantity: 1,
    maxQuantity: 1,
    systems: ['childTraining'],
    tags: ['child_training', 'nature', 'fishpond', 'daily_sink'],
    rewardHint: 'friendship',
    repeatWindow: 'daily',
    notes: ['孩子自然训练会真实扣除鱼饲料，承接鱼塘观察和照料练习。']
  },
  {
    id: 'seed_cabbage_child_nature_training',
    itemId: 'seed_cabbage',
    minQuantity: 2,
    maxQuantity: 2,
    systems: ['childTraining'],
    tags: ['child_training', 'nature', 'seed', 'daily_sink'],
    rewardHint: 'friendship',
    repeatWindow: 'daily',
    notes: ['孩子自然训练会真实扣除基础种子，让早期商店种子进入家庭培养循环。']
  },
  {
    id: 'cloth_child_craft_training',
    itemId: 'cloth',
    processedGroupId: 'textile',
    minQuantity: 1,
    maxQuantity: 1,
    systems: ['childTraining'],
    tags: ['child_training', 'craft', 'textile', 'daily_sink'],
    rewardHint: 'friendship',
    repeatWindow: 'daily',
    notes: ['孩子手作训练会真实扣除布匹，连接织布机产物和家庭成长。']
  },
  {
    id: 'wood_child_craft_training',
    itemId: 'wood',
    minQuantity: 8,
    maxQuantity: 8,
    systems: ['childTraining'],
    tags: ['child_training', 'craft', 'material', 'daily_sink'],
    rewardHint: 'friendship',
    repeatWindow: 'daily',
    notes: ['孩子手作训练会真实扣除木材，形成小屋日常材料消耗。']
  },
  {
    id: 'ancient_archive_region_turn_in_waybill',
    itemId: 'ancient_waybill',
    minQuantity: 1,
    maxQuantity: 1,
    systems: ['regionMap'],
    tags: ['region_resource_turn_in', 'ancient_archive', 'archive', 'public_turn_in', 'artifact_sink'],
    antiRepeatTags: ['region_resource_turn_in', 'ancient_archive', 'ancient_waybill'],
    sourceHint: '行旅图·古驿荒道路线、荒道宝箱与区域事件',
    rewardHint: 'mixed',
    repeatWindow: 'weekly',
    notes: ['区域资源整备的古驿残卷交付会真实扣除驿路关券，同时扣减公共资源账本。']
  },
  {
    id: 'ecology_specimen_region_turn_in_algae',
    itemId: 'luminous_algae',
    minQuantity: 1,
    maxQuantity: 1,
    systems: ['regionMap'],
    tags: ['region_resource_turn_in', 'ecology_specimen', 'specimen', 'public_turn_in', 'sample_sink'],
    antiRepeatTags: ['region_resource_turn_in', 'ecology_specimen', 'luminous_algae'],
    sourceHint: '行旅图·蜃潮泽地采样点、样本匣与生态事件',
    rewardHint: 'mixed',
    repeatWindow: 'weekly',
    notes: ['区域资源整备的生态样本交付会真实扣除夜光藻团，同时扣减公共资源账本。']
  },
  {
    id: 'ley_crystal_region_turn_in_shard',
    itemId: 'ley_crystal_shard',
    minQuantity: 1,
    maxQuantity: 1,
    systems: ['regionMap'],
    tags: ['region_resource_turn_in', 'ley_crystal', 'crystal', 'public_turn_in', 'material_sink'],
    antiRepeatTags: ['region_resource_turn_in', 'ley_crystal', 'ley_crystal_shard'],
    sourceHint: '行旅图·云岚高地灵脉采晶、前哨箱与高地事件',
    rewardHint: 'mixed',
    repeatWindow: 'weekly',
    notes: ['区域资源整备的灵脉结晶交付会真实扣除灵脉碎晶，同时扣减公共资源账本。']
  },
  {
    id: 'elite_elixir_inventory_use',
    itemId: 'ley_crystal_focus_elixir',
    processedGroupId: 'medicine_processed',
    minQuantity: 1,
    maxQuantity: 1,
    systems: ['inventoryUse', 'regionMap', 'potential'],
    tags: ['elite_elixir', 'shared_alchemy', 'expedition_supply'],
    rewardHint: 'mixed',
    repeatWindow: 'daily',
    notes: ['可作为行旅图路线/首领远征出发丹药，出发即消耗。']
  },
  {
    id: 'elite_elixir_quarry_guard',
    itemId: 'wind_core_guard_pill',
    processedGroupId: 'medicine_processed',
    minQuantity: 1,
    maxQuantity: 1,
    systems: ['inventoryUse', 'mining', 'quarry'],
    tags: ['elite_elixir', 'shared_alchemy', 'quarry', 'guard'],
    rewardHint: 'mixed',
    repeatWindow: 'daily',
    notes: ['可作为采石场旧支道节点准备物，节点结算时消耗。']
  },
  {
    id: 'elite_elixir_region_cleanse',
    itemId: 'marsh_luminous_cleansing_elixir',
    processedGroupId: 'medicine_processed',
    minQuantity: 1,
    maxQuantity: 1,
    systems: ['inventoryUse', 'regionMap', 'hanhai'],
    tags: ['elite_elixir', 'shared_alchemy', 'cleansing', 'expedition_supply'],
    rewardHint: 'mixed',
    repeatWindow: 'daily',
    notes: ['可作为行旅图路线/首领远征出发丹药，出发即消耗。']
  },
  {
    id: 'elite_elixir_pet_calm',
    itemId: 'moon_pearl_calm_elixir',
    processedGroupId: 'medicine_processed',
    minQuantity: 1,
    maxQuantity: 1,
    systems: ['inventoryUse', 'petFeed', 'regionMap'],
    tags: ['elite_elixir', 'shared_alchemy', 'calm', 'night'],
    rewardHint: 'mixed',
    repeatWindow: 'daily',
    notes: ['可作为行旅图路线/首领远征出发丹药，出发即消耗。']
  },
  {
    id: 'elite_elixir_order_focus',
    itemId: 'jade_orchid_focus_elixir',
    processedGroupId: 'medicine_processed',
    minQuantity: 1,
    maxQuantity: 1,
    systems: ['inventoryUse', 'cooking', 'quest'],
    tags: ['elite_elixir', 'shared_alchemy', 'order', 'festival_prep'],
    rewardHint: 'mixed',
    repeatWindow: 'daily'
  },
  {
    id: 'elite_elixir_long_guard',
    itemId: 'rare_lotus_guard_elixir',
    processedGroupId: 'medicine_processed',
    minQuantity: 1,
    maxQuantity: 1,
    systems: ['inventoryUse', 'quarry', 'petFeed'],
    tags: ['elite_elixir', 'shared_alchemy', 'guard', 'care'],
    rewardHint: 'mixed',
    repeatWindow: 'daily',
    notes: ['可作为采石场旧支道节点准备物，节点结算时消耗。']
  },
  {
    id: 'elite_elixir_social_spirit',
    itemId: 'jade_peach_spirit_elixir',
    processedGroupId: 'medicine_processed',
    minQuantity: 1,
    maxQuantity: 1,
    systems: ['inventoryUse', 'npcFunction', 'quest'],
    tags: ['elite_elixir', 'shared_alchemy', 'social', 'festival_prep'],
    rewardHint: 'mixed',
    repeatWindow: 'daily'
  },
  ...PROCESSED_GROUP_ORDER_DEMAND_POOL
]

export const getLinkageDemandEntriesForItem = (itemId: string): LinkageDemandEntry[] =>
  LINKAGE_DEMAND_POOL.filter(entry => entry.itemId === itemId)

export const getLinkageDemandEntriesByTag = (tag: string): LinkageDemandEntry[] =>
  LINKAGE_DEMAND_POOL.filter(entry => entry.tags.includes(tag))

export const getLinkageDemandEntriesByProcessedGroup = (processedGroupId: string): LinkageDemandEntry[] =>
  LINKAGE_DEMAND_POOL.filter(entry => entry.processedGroupId === processedGroupId)

export const getFamilyWishDemandEntries = (wishId: string): LinkageDemandEntry[] =>
  LINKAGE_DEMAND_POOL.filter(entry =>
    entry.systems.includes('familyWish') &&
    (entry.familyWishIds ?? []).includes(wishId)
  )

export const getPublicStorageDemandEntries = (): LinkageDemandEntry[] =>
  LINKAGE_DEMAND_POOL.filter(entry => entry.tags.includes('public_storage'))

export const getRegionResourceTurnInDemandEntries = (): LinkageDemandEntry[] =>
  LINKAGE_DEMAND_POOL.filter(entry =>
    entry.systems.includes('regionMap') &&
    entry.tags.includes('region_resource_turn_in')
  )

export const getLinkageDemandAntiRepeatTags = (entry?: LinkageDemandEntry | null): string[] => {
  if (!entry) return []
  return [...new Set([
    ...(entry.antiRepeatTags ?? []),
    entry.itemId,
    ...(entry.processedGroupId ? [entry.processedGroupId] : []),
    ...entry.tags.filter(tag =>
      tag === 'family_breakfast' ||
      tag === 'public_storage' ||
      tag === 'festival_prep' ||
      tag === 'family_wish' ||
      tag === 'weak_item_sink' ||
      tag.endsWith('_sink')
    )
  ].filter(Boolean))]
}

export const getFamilyWishDemandAntiRepeatTags = (wishId: string): string[] =>
  [...new Set(getFamilyWishDemandEntries(wishId).flatMap(getLinkageDemandAntiRepeatTags))]
