export type PotentialBranchId = 'body' | 'craft' | 'trail' | 'harmony'

export type PotentialResourceId = 'potential_insight' | 'spirit_breath' | 'artisan_notes' | 'mountain_jade'

export type PotentialNodeId =
  | 'body_vital_root'
  | 'body_stamina_channel'
  | 'body_safe_fall'
  | 'body_short_rest'
  | 'body_low_hp_sense'
  | 'craft_processing_flow'
  | 'craft_tool_rhythm'
  | 'craft_alchemy_patience'
  | 'craft_storage_order'
  | 'craft_workshop_hint'
  | 'trail_hazard_reading'
  | 'trail_mine_entry_hint'
  | 'trail_forage_window'
  | 'trail_expedition_reserve'
  | 'trail_region_marker'
  | 'harmony_quest_bias'
  | 'harmony_festival_supply'
  | 'harmony_gift_hint'
  | 'harmony_society_order'
  | 'harmony_visitor_chance'

export type PotentialEffectKey =
  | 'potential_max_hp_flat'
  | 'potential_max_stamina_flat'
  | 'potential_passout_loss_reduction'
  | 'potential_short_rest_bonus'
  | 'potential_low_hp_hint'
  | 'potential_processing_speed'
  | 'potential_tool_stamina_save'
  | 'potential_alchemy_tolerance'
  | 'potential_storage_efficiency'
  | 'potential_workshop_hint'
  | 'potential_journey_hazard_resist'
  | 'potential_mine_entry_hint'
  | 'potential_forage_window'
  | 'potential_expedition_reserve'
  | 'potential_region_marker'
  | 'potential_quest_bias'
  | 'potential_festival_bonus'
  | 'potential_gift_hint'
  | 'potential_society_order'
  | 'potential_visitor_chance'

export type PotentialEffectMode = 'formula' | 'info' | 'reserved'

export type PotentialSourceId =
  | 'mine_boss_clear'
  | 'journey_high_risk'
  | 'special_order_finish'
  | 'theme_week_settlement'
  | 'museum_hidden_sample'
  | 'festival_spirit_event'

export type PotentialSourcePeriod = 'daily' | 'weekly' | 'seasonal'

export interface PotentialResourceCost {
  resourceId: PotentialResourceId
  amount: number
}

export interface PotentialUnlockCondition {
  kind: 'branchRank' | 'totalRank' | 'skillLevel' | 'masteryNode'
  branchId?: PotentialBranchId
  skillType?: string
  nodeId?: string
  value: number
  label: string
}

export interface PotentialBranchDef {
  id: PotentialBranchId
  label: string
  summary: string
  tone: 'body' | 'craft' | 'trail' | 'harmony'
}

export interface PotentialResourceDef {
  id: PotentialResourceId
  label: string
  summary: string
  branchHints: PotentialBranchId[]
}

export interface PotentialEffectDef {
  key: PotentialEffectKey
  label: string
  mode: PotentialEffectMode
  valuePerRank: number
  cap: number
  unit: 'flat' | 'percent' | 'switch'
  firstVersionConnected: boolean
  playerSummary: string
}

export interface PotentialNodeDef {
  id: PotentialNodeId
  branchId: PotentialBranchId
  label: string
  summary: string
  maxRank: number
  costsByRank: PotentialResourceCost[][]
  unlockConditions: PotentialUnlockCondition[]
  effectKey: PotentialEffectKey
  surface: string
  firstVersionConnected: boolean
}

export interface PotentialSourceRule {
  id: PotentialSourceId
  label: string
  summary: string
  rewards: PotentialResourceCost[]
  cap: {
    period: PotentialSourcePeriod
    maxClaims: number
    maxResourceAmount: number
  }
}

export interface PotentialSourceCapProgress {
  periodKey: string
  claims: number
  resourceAmounts: Partial<Record<PotentialResourceId, number>>
}

export interface PotentialSourceReceipt {
  id: string
  sourceId: PotentialSourceId
  eventKey: string
  periodKey: string
  rewards: PotentialResourceCost[]
  reason: string
  createdAt: string
}

export interface PotentialBranchRespecRecord {
  id: string
  branchId: PotentialBranchId
  refunded: PotentialResourceCost[]
  retainedCost: PotentialResourceCost[]
  createdAt: string
  freeSeasonKey?: string
}

export interface PotentialSaveData {
  resources: Partial<Record<PotentialResourceId, number>>
  nodeRanks: Partial<Record<PotentialNodeId, number>>
  sourceReceipts: Record<string, PotentialSourceReceipt>
  sourceCapProgress: Partial<Record<PotentialSourceId, PotentialSourceCapProgress>>
  branchRespecUsedSeasonKeys: Partial<Record<PotentialBranchId, string[]>>
  branchRespecRecords: PotentialBranchRespecRecord[]
  potentialMigrationLogs?: string[]
}
