/** 公会赛季阶段 */
export type GuildSeasonPhase = 'p0_commission' | 'p1_ranked_hunt' | 'p2_world_milestone'

/** 公会赛季排行档位 */
export type GuildRankBand = 'novice' | 'veteran' | 'elite' | 'legend'

export interface GuildSeasonConfig {
  saveVersion: number
  defaultPhase: GuildSeasonPhase
  phaseLabels: Record<GuildSeasonPhase, string>
  rankBands: GuildRankBand[]
}

export interface GuildSeasonSnapshot {
  seasonId: string
  weekId: string
  contributionGained: number
  goalClaims: number
  bossClears: number
  rankBand: GuildRankBand
}

export interface GuildSeasonOverview {
  currentSeasonId: string
  currentPhase: GuildSeasonPhase
  asyncRankScore: number
  rankBand: GuildRankBand
  snapshotCount: number
  completedGoalCount: number
  claimableGoalCount: number
  contributionPoints: number
  guildLevel: number
}

export interface GuildGoalSummary {
  monsterId: string
  monsterName: string
  zone: string
  killTarget: number
  currentKills: number
  completed: boolean
  claimed: boolean
  claimable: boolean
}

export interface GuildSeasonState {
  saveVersion: number
  currentSeasonId: string
  currentPhase: GuildSeasonPhase
  asyncRankScore: number
  rankBand: GuildRankBand
  lastSnapshotWeekId: string
  snapshots: GuildSeasonSnapshot[]
}

export interface GuildSeasonOverview {
  currentSeasonId: string
  currentPhase: GuildSeasonPhase
  asyncRankScore: number
  rankBand: GuildRankBand
  snapshotCount: number
  completedGoalCount: number
  claimableGoalCount: number
  contributionPoints: number
  guildLevel: number
}

export interface GuildGoalSummary {
  monsterId: string
  monsterName: string
  zone: string
  killTarget: number
  currentKills: number
  completed: boolean
  claimed: boolean
  claimable: boolean
}

/** 怪物讨伐目标定义 */
export interface MonsterGoalDef {
  monsterId: string
  monsterName: string
  zone: string
  killTarget: number
  reward: {
    money?: number
    items?: { itemId: string; quantity: number }[]
  }
  description: string
}

/** 捐献物品定义 */
export interface GuildDonationDef {
  itemId: string
  points: number
}

/** 公会等级定义 */
export interface GuildLevelDef {
  level: number
  expRequired: number
}

/** 公会商店物品定义 */
export interface GuildShopItemDef {
  itemId: string
  name: string
  price: number
  contributionCost?: number
  description: string
  /** 解锁所需公会等级 */
  unlockGuildLevel?: number
  /** 每日限购数 */
  dailyLimit?: number
  /** 每周限购数 */
  weeklyLimit?: number
  /** 永久总购买上限 */
  totalLimit?: number
  /** 装备类型（购买后加入对应装备栏） */
  equipType?: 'weapon' | 'ring' | 'hat' | 'shoe'
  /** 合成材料 */
  materials?: { itemId: string; quantity: number }[]
}
