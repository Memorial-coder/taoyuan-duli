/** 技能类型 */
export type SkillType = 'farming' | 'foraging' | 'fishing' | 'mining' | 'combat'

/** 技能专精（等级5选择） */
export type SkillPerk5 =
  | 'harvester'
  | 'rancher' // 农耕
  | 'lumberjack'
  | 'herbalist' // 采集
  | 'fisher'
  | 'trapper' // 钓鱼
  | 'miner'
  | 'geologist' // 挖矿
  | 'fighter'
  | 'defender' // 战斗

/** 技能专精（等级10选择，基于等级5分支） */
export type SkillPerk10 =
  | 'intensive'
  | 'artisan' // 农耕: harvester分支
  | 'coopmaster'
  | 'shepherd' // 农耕: rancher分支
  | 'botanist'
  | 'alchemist' // 采集: herbalist分支
  | 'forester'
  | 'tracker' // 采集: lumberjack分支
  | 'angler'
  | 'aquaculture' // 钓鱼: fisher分支
  | 'mariner'
  | 'luremaster' // 钓鱼: trapper分支
  | 'prospector'
  | 'blacksmith' // 挖矿: miner分支
  | 'excavator'
  | 'mineralogist' // 挖矿: geologist分支
  | 'warrior'
  | 'brute' // 战斗: fighter分支
  | 'acrobat'
  | 'tank' // 战斗: defender分支

/** 技能专精（等级15选择，基于等级10分支） */
export type SkillPerk15 =
  | 'grandmaster_farmer'
  | 'estate_owner' // 农耕: intensive/artisan分支
  | 'livestock_baron'
  | 'animal_whisperer' // 农耕: coopmaster/shepherd分支
  | 'ancient_botanist'
  | 'grand_alchemist' // 采集: botanist/alchemist分支
  | 'forest_guardian'
  | 'wilderness_expert' // 采集: forester/tracker分支
  | 'legendary_angler'
  | 'aquatic_merchant' // 钓鱼: angler/aquaculture分支
  | 'sea_captain'
  | 'bait_master' // 钓鱼: mariner/luremaster分支
  | 'vein_seeker'
  | 'master_smith' // 挖矿: prospector/blacksmith分支
  | 'deep_excavator'
  | 'gem_collector' // 挖矿: excavator/mineralogist分支
  | 'sword_saint'
  | 'berserker' // 战斗: warrior/brute分支
  | 'phantom_blade'
  | 'iron_fortress' // 战斗: acrobat/tank分支

/** 技能专精（等级20选择，基于等级15分支） */
export type SkillPerk20 =
  | 'deity_of_harvest'
  | 'land_god' // 农耕: grandmaster_farmer/estate_owner分支
  | 'beast_sovereign'
  | 'nature_bond' // 农耕: livestock_baron/animal_whisperer分支
  | 'world_tree'
  | 'philosopher' // 采集: ancient_botanist/grand_alchemist分支
  | 'forest_spirit'
  | 'primal_tracker' // 采集: forest_guardian/wilderness_expert分支
  | 'fish_god'
  | 'ocean_trader' // 钓鱼: legendary_angler/aquatic_merchant分支
  | 'sea_sovereign'
  | 'lure_deity' // 钓鱼: sea_captain/bait_master分支
  | 'earth_pulse'
  | 'forge_god' // 挖矿: vein_seeker/master_smith分支
  | 'abyss_miner'
  | 'gem_emperor' // 挖矿: deep_excavator/gem_collector分支
  | 'war_god'
  | 'slaughter_king' // 战斗: sword_saint/berserker分支
  | 'shadow_sovereign'
  | 'indestructible' // 战斗: phantom_blade/iron_fortress分支

/** 技能状态 */
export interface SkillState {
  type: SkillType
  exp: number
  level: number
  perk5: SkillPerk5 | null
  perk10: SkillPerk10 | null
  perk15: SkillPerk15 | null
  perk20: SkillPerk20 | null
}

/** 钓鱼小游戏评级 */
export type MiniGameRating = 'perfect' | 'excellent' | 'good' | 'poor'

/** 钓鱼小游戏参数 */
export interface MiniGameParams {
  fishName: string
  difficulty: 'easy' | 'normal' | 'hard' | 'legendary'
  hookHeight: number
  fishSpeed: number
  fishChangeDir: number
  gravity: number
  liftSpeed: number
  scoreGain: number
  scoreLoss: number
  timeLimit: number
}

/** 钓鱼小游戏结果 */
export interface MiniGameResult {
  rating: MiniGameRating
  score: number
  perfect: boolean
}

/** 钓鱼地点 */
export type FishingLocation = 'creek' | 'pond' | 'river' | 'mine' | 'waterfall' | 'swamp'

/** 鱼定义 */
export interface FishDef {
  id: string
  name: string
  season: ('spring' | 'summer' | 'autumn' | 'winter')[]
  weather: ('sunny' | 'rainy' | 'stormy' | 'snowy' | 'windy' | 'any')[]
  difficulty: 'easy' | 'normal' | 'hard' | 'legendary'
  sellPrice: number
  description: string
  /** 钓鱼地点（默认creek） */
  location?: FishingLocation
  /** 小游戏鱼移动速度（覆盖难度默认值） */
  miniGameSpeed?: number
  /** 小游戏鱼改变方向概率（覆盖难度默认值） */
  miniGameDirChange?: number
}

/** 矿洞层定义 */
export interface MineFloorDef {
  floor: number
  zone: 'shallow' | 'frost' | 'lava' | 'crystal' | 'shadow' | 'abyss'
  ores: string[] // 可获得的矿石ID
  monsters: MonsterDef[]
  isSafePoint: boolean // 是否为安全点（每5层）
  specialType: 'mushroom' | 'treasure' | 'infested' | 'dark' | 'boss' | null // 特殊楼层类型
}

/** 怪物定义 */
export interface MonsterDef {
  id: string
  name: string
  hp: number
  attack: number // 造成的HP伤害
  defense: number
  expReward: number // 击杀给予的战斗经验
  drops: { itemId: string; chance: number }[]
  description: string
}

/** 战斗状态 */
export interface CombatState {
  monster: MonsterDef
  monsterHp: number
  round: number
  log: string[]
  isBoss: boolean
}

/** 战斗操作 */
export type CombatAction = 'attack' | 'defend' | 'flee'

/** 食谱定义 */
export interface RecipeDef {
  id: string
  name: string
  ingredients: { itemId: string; quantity: number }[]
  effect: {
    staminaRestore: number
    healthRestore?: number
    buff?: {
      type: 'fishing' | 'mining' | 'giftBonus' | 'speed' | 'defense' | 'luck' | 'farming' | 'stamina' | 'all_skills'
      value: number // 百分比或倍率
      description: string
    }
  }
  unlockSource: string // 解锁来源描述
  description: string
  /** 需要的技能等级才能烹饪 */
  requiredSkill?: { type: SkillType; level: number }
}
