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
    tags: ['oil', 'home_cooking', 'breakfast', 'processed_sink'],
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
    rewardHint: 'ticket',
    repeatWindow: 'weekly',
    ticketReward: { caravan: 1 }
  },
  {
    id: 'manor_edge_bundle_pet_feed',
    itemId: 'manor_edge_bundle',
    minQuantity: 1,
    maxQuantity: 1,
    systems: ['petFeed'],
    tags: ['manor', 'pet_feed', 'daily_sink', 'weak_item_sink'],
    rewardHint: 'friendship',
    repeatWindow: 'daily'
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
