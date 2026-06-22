import type { RewardTicketType } from './economy'
import type { Quality } from './item'
import type { SkillType } from './skill'

export type LinkageSystemId =
  | 'farm'
  | 'animal'
  | 'cooking'
  | 'processing'
  | 'quest'
  | 'onlineOrder'
  | 'festival'
  | 'familyWish'
  | 'petFeed'
  | 'museum'
  | 'decoration'
  | 'villageProject'
  | 'quarry'
  | 'mining'
  | 'fishing'
  | 'fishPond'
  | 'breeding'
  | 'guild'
  | 'hanhai'
  | 'regionMap'
  | 'potential'
  | 'shop'
  | 'npcFunction'
  | 'equipment'
  | 'trinket'
  | 'inventoryUse'

export type ItemLinkageStatus =
  | 'complete'
  | 'weak'
  | 'orphan'
  | 'display_only'
  | 'source_only'
  | 'intentional_vendor_good'

export type ProcessedItemGroupId =
  | 'oil'
  | 'flour'
  | 'pickled'
  | 'dried'
  | 'sweet'
  | 'animal_processed'
  | 'fish_processed'
  | 'medicine_processed'
  | 'fermented'
  | 'tea'
  | 'tofu'
  | 'feed'
  | 'textile'
  | 'incense'
  | 'refined_material'
  | 'spirit_craft'

export interface ProcessedItemGroupDef {
  id: ProcessedItemGroupId
  label: string
  summary: string
  itemIds: string[]
  demandSystems: LinkageSystemId[]
  demandTags: string[]
  orderCandidateItemIds?: string[]
  familyWishCandidateItemIds?: string[]
  festivalCandidateItemIds?: string[]
}

export interface ItemLinkageDef {
  itemId: string
  sourceSystems: LinkageSystemId[]
  currentUseSystems: LinkageSystemId[]
  plannedUseSystems: LinkageSystemId[]
  repeatableSinks: LinkageSystemId[]
  oneTimeSinks: LinkageSystemId[]
  demandTags: string[]
  status: ItemLinkageStatus
  priority: 'P0' | 'P1' | 'P2'
  notes?: string[]
}

export interface ItemLinkageUsageLine {
  system: LinkageSystemId
  label: string
  detail: string
}

export interface LinkageDemandEntry {
  id: string
  itemId: string
  processedGroupId?: ProcessedItemGroupId
  minQuantity: number
  maxQuantity: number
  minQuality?: Quality
  systems: LinkageSystemId[]
  tags: string[]
  unlock?: {
    minYear?: number
    minSkillLevel?: Partial<Record<SkillType, number>>
    requiredQuestIds?: string[]
    requiredNpcFunctionIds?: string[]
    requiredVillageProjectIds?: string[]
  }
  rewardHint: 'money' | 'ticket' | 'potential' | 'recipe' | 'friendship' | 'decoration' | 'museum' | 'mixed'
  repeatWindow: 'daily' | 'weekly' | 'seasonal' | 'one_off'
  ticketReward?: Partial<Record<RewardTicketType, number>>
  notes?: string[]
}
