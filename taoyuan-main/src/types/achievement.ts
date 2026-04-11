import type { SkillType } from './skill'

/** 成就条件类型 */
export type AchievementCondition =
  | { type: 'itemCount'; count: number }
  | { type: 'cropHarvest'; count: number }
  | { type: 'fishCaught'; count: number }
  | { type: 'moneyEarned'; amount: number }
  | { type: 'mineFloor'; floor: number }
  | { type: 'skullCavernFloor'; floor: number }
  | { type: 'recipesCooked'; count: number }
  | { type: 'npcFriendship'; level: string }
  | { type: 'skillLevel'; skillType: SkillType; level: number }
  | { type: 'questsCompleted'; count: number }
  | { type: 'npcBestFriend'; count: number }
  | { type: 'npcAllFriendly' }
  | { type: 'married' }
  | { type: 'hasChild' }
  | { type: 'monstersKilled'; count: number }
  | { type: 'shippedCount'; count: number }
  | { type: 'fullShipment' }
  | { type: 'animalCount'; count: number }
  | { type: 'allSkillsMax' }
  | { type: 'allBundlesComplete' }
  | { type: 'hybridsDiscovered'; count: number }
  | { type: 'breedingsDone'; count: number }
  | { type: 'hybridTier'; tier: number }
  | { type: 'hybridsShipped'; count: number }
  | { type: 'museumDonations'; count: number }
  | { type: 'guildGoalsCompleted'; count: number }
  | { type: 'hiddenNpcRevealed'; count: number }
  | { type: 'hiddenNpcBonded' }
  | { type: 'itemDiscovered'; itemId: string }
  | { type: 'fullFishCollection' }

/** 成就定义 */
export interface AchievementDef {
  id: string
  name: string
  description: string
  /** 解锁后授予角色的专属称号 */
  title?: string
  /** 隐藏成就：条件不预先显示，完成后才解锁可见 */
  hidden?: boolean
  condition: AchievementCondition
  reward: {
    money?: number
    items?: { itemId: string; quantity: number }[]
  }
}

/** 祠堂任务定义 */
export interface CommunityBundleDef {
  id: string
  name: string
  description: string
  requiredItems: { itemId: string; quantity: number }[]
  reward: {
    money?: number
    items?: { itemId: string; quantity: number }[]
    description: string
  }
}
