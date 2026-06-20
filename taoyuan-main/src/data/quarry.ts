import type {
  QuarryCell,
  QuarryCellKind,
  QuarryMineNode,
  QuarryMineSaveData,
  QuarryMonsterDef,
  QuarryExpansionStage,
  QuarryResourceDef,
  QuarryResourceKind,
  QuarrySaveData,
  QuarryWeeklyProgress
} from '@/types/quarry'

export const QUARRY_PROJECT_ID = 'quarry_reopening'
export const QUARRY_REQUIRED_PROJECT_ID = 'support_shed'
export const QUARRY_GRID_SIZE = 8
export const QUARRY_TOTAL_CELLS = QUARRY_GRID_SIZE * QUARRY_GRID_SIZE
export const QUARRY_INITIAL_RESOURCE_COUNT = 9
export const QUARRY_DAILY_SPAWN_CHANCE = 0.12
export const QUARRY_DAILY_BASE_CAP = 7
export const QUARRY_DAILY_MAX_CAP = 16
export const QUARRY_MAINTENANCE_SPAWN_BONUS = 2
export const QUARRY_SKULL_DEPTH_BONUS_FLOOR = 150
export const QUARRY_SKULL_DEPTH_SPAWN_BONUS = 2
export const QUARRY_MASTERY_NODE_BONUS_THRESHOLD = 2
export const QUARRY_MASTERY_NODE_SPAWN_BONUS = 1
export const QUARRY_WEEKLY_STEWARDSHIP_TARGET = 12
export const QUARRY_WEEKLY_STEWARDSHIP_MAX_CLAIMS = 2
export const QUARRY_COLLECT_STAMINA_COST = 2
export const QUARRY_DEEP_STAMINA_COST = 5
export const QUARRY_MIN_GRID_SIZE = 8
export const QUARRY_MAX_GRID_SIZE = 32
export const QUARRY_MONSTER_SPAWN_CHANCE = 0.08
export const QUARRY_TREASURE_SPAWN_CHANCE = 0.03
export const QUARRY_ARTIFACT_SPAWN_CHANCE = 0.02
export const QUARRY_NIGHT_MONSTER_HP_MULT = 1.5
export const QUARRY_NIGHT_MONSTER_ATK_MULT = 1.3
export const QUARRY_MONSTER_BASE_EXP = 6
export const QUARRY_RUBBLE_BASE_EXP = 3
export const QUARRY_MINE_FINAL_TRINKET_ID = 'trinket_quarry_shard'
export const QUARRY_MINE_FINAL_UNLOCK_ID = 'trinket_quarry_mine'

export const QUARRY_RESOURCE_CATEGORY_WEIGHTS: Record<QuarryResourceKind, number> = {
  rock: 52,
  ore: 28,
  gem: 10,
  wood: 8,
  deep: 2
}

export const QUARRY_RESOURCE_POOLS: Record<QuarryResourceKind, readonly QuarryResourceDef[]> = {
  rock: [
    { id: 'stone_chunk', label: '碎石堆', kind: 'rock', itemId: 'stone', minQuantity: 2, maxQuantity: 5, weight: 1 }
  ],
  ore: [
    { id: 'copper_vein', label: '铜矿脉', kind: 'ore', itemId: 'copper_ore', minQuantity: 1, maxQuantity: 3, weight: 36 },
    { id: 'iron_vein', label: '铁矿脉', kind: 'ore', itemId: 'iron_ore', minQuantity: 1, maxQuantity: 3, weight: 28 },
    { id: 'gold_vein', label: '金矿脉', kind: 'ore', itemId: 'gold_ore', minQuantity: 1, maxQuantity: 2, weight: 18 },
    { id: 'crystal_vein', label: '水晶矿脉', kind: 'ore', itemId: 'crystal_ore', minQuantity: 1, maxQuantity: 2, weight: 10 },
    { id: 'shadow_vein', label: '暗影矿脉', kind: 'ore', itemId: 'shadow_ore', minQuantity: 1, maxQuantity: 1, weight: 8 }
  ],
  gem: [
    { id: 'quartz_cluster', label: '石英晶簇', kind: 'gem', itemId: 'quartz', minQuantity: 1, maxQuantity: 2, weight: 32 },
    { id: 'jade_cluster', label: '翡翠晶簇', kind: 'gem', itemId: 'jade', minQuantity: 1, maxQuantity: 1, weight: 24 },
    { id: 'ruby_cluster', label: '红宝石晶簇', kind: 'gem', itemId: 'ruby', minQuantity: 1, maxQuantity: 1, weight: 18 },
    { id: 'moonstone_cluster', label: '月光石晶簇', kind: 'gem', itemId: 'moonstone', minQuantity: 1, maxQuantity: 1, weight: 14 },
    { id: 'obsidian_chip', label: '黑曜碎片', kind: 'gem', itemId: 'obsidian', minQuantity: 1, maxQuantity: 1, weight: 12 }
  ],
  wood: [
    { id: 'deadwood_pile', label: '枯木堆', kind: 'wood', itemId: 'wood', minQuantity: 2, maxQuantity: 4, weight: 72 },
    { id: 'bamboo_roots', label: '竹根丛', kind: 'wood', itemId: 'bamboo', minQuantity: 1, maxQuantity: 2, weight: 28 }
  ],
  deep: [
    { id: 'void_deep_vein', label: '虚空深脉', kind: 'deep', itemId: 'void_ore', minQuantity: 1, maxQuantity: 1, weight: 35 },
    { id: 'iridium_deep_vein', label: '铱矿深脉', kind: 'deep', itemId: 'iridium_ore', minQuantity: 1, maxQuantity: 1, weight: 30 },
    { id: 'obsidian_deep_vein', label: '黑曜深脉', kind: 'deep', itemId: 'obsidian', minQuantity: 1, maxQuantity: 1, weight: 25 },
    { id: 'dragon_jade_deep_vein', label: '龙玉深脉', kind: 'deep', itemId: 'dragon_jade', minQuantity: 1, maxQuantity: 1, weight: 10 }
  ]
}

export const QUARRY_RARE_TRANSMUTE_UPGRADES: Record<string, string> = {
  copper_ore: 'iron_ore',
  iron_ore: 'gold_ore',
  gold_ore: 'crystal_ore',
  crystal_ore: 'shadow_ore',
  shadow_ore: 'void_ore',
  void_ore: 'iridium_ore'
}

export const QUARRY_MONSTERS: QuarryMonsterDef[] = [
  { id: 'quarry_bee', name: '野蜂群', hp: 12, attack: 3, defense: 0, expReward: 5, drops: [{ itemId: 'honey', chance: 0.3 }], nightHpBonus: 8, nightAttackBonus: 4, description: '采石场裂缝中的野蜂，白天较温顺。' },
  { id: 'quarry_crab', name: '碎石蟹', hp: 20, attack: 5, defense: 3, expReward: 8, drops: [{ itemId: 'stone', chance: 0.5 }, { itemId: 'crab', chance: 0.1 }], nightHpBonus: 12, nightAttackBonus: 6, description: '裹着碎石外壳的甲壳生物，夜间更凶猛。' },
  { id: 'quarry_shadow_bug', name: '暗影虫', hp: 15, attack: 7, defense: 1, expReward: 10, drops: [{ itemId: 'void_ore', chance: 0.08 }], nightHpBonus: 15, nightAttackBonus: 8, description: '在暗处出没的甲虫，夜间攻击力显著提升。' },
  { id: 'quarry_snake', name: '塌方蛇', hp: 25, attack: 9, defense: 2, expReward: 14, drops: [{ itemId: 'iridium_ore', chance: 0.05 }, { itemId: 'shadow_ore', chance: 0.15 }], nightHpBonus: 18, nightAttackBonus: 10, description: '在碎石下伏击猎物的毒蛇，夜间极度危险。' }
]

export const QUARRY_TREASURE_POOL: { itemId: string; quantity: number; chance: number }[] = [
  { itemId: 'jade', quantity: 2, chance: 0.25 },
  { itemId: 'ruby', quantity: 1, chance: 0.20 },
  { itemId: 'moonstone', quantity: 1, chance: 0.18 },
  { itemId: 'gold_ore', quantity: 5, chance: 0.15 },
  { itemId: 'iridium_ore', quantity: 1, chance: 0.10 },
  { itemId: 'dragon_jade', quantity: 1, chance: 0.07 },
  { itemId: 'obsidian', quantity: 1, chance: 0.05 }
]

export const QUARRY_ARTIFACT_POOL: { itemId: string; quantity: number; chance: number }[] = [
  { itemId: 'trilobite_fossil', quantity: 1, chance: 0.30 },
  { itemId: 'ancient_pottery', quantity: 1, chance: 0.25 },
  { itemId: 'ancient_tablet', quantity: 1, chance: 0.20 },
  { itemId: 'bronze_mirror', quantity: 1, chance: 0.15 },
  { itemId: 'oracle_bone', quantity: 1, chance: 0.10 }
]

export const QUARRY_EXPANSION_STAGES: QuarryExpansionStage[] = [
  { fromSize: 8, toSize: 9, moneyCost: 5000, materialCosts: [{ itemId: 'stone', quantity: 200 }, { itemId: 'wood', quantity: 100 }], requiredClearedCount: 30, requiredDeepClearCount: 0, requiredMineFloor: 120, requiredSkullFloor: 100, requiredMiningLevel: 20, description: '清理东侧塌方，开辟新的开采区。' },
  { fromSize: 9, toSize: 10, moneyCost: 8000, materialCosts: [{ itemId: 'stone', quantity: 300 }, { itemId: 'copper_ore', quantity: 50 }], requiredClearedCount: 60, requiredDeepClearCount: 5, requiredMineFloor: 120, requiredSkullFloor: 100, requiredMiningLevel: 20, description: '打通南侧碎石堆，拓展采矿面。' },
  { fromSize: 10, toSize: 11, moneyCost: 12000, materialCosts: [{ itemId: 'iron_ore', quantity: 80 }, { itemId: 'stone', quantity: 400 }], requiredClearedCount: 100, requiredDeepClearCount: 10, requiredMineFloor: 130, requiredSkullFloor: 110, requiredMiningLevel: 20, description: '加固西侧支撑，扩大作业面积。' },
  { fromSize: 11, toSize: 12, moneyCost: 18000, materialCosts: [{ itemId: 'gold_ore', quantity: 30 }, { itemId: 'iron_ore', quantity: 60 }], requiredClearedCount: 150, requiredDeepClearCount: 20, requiredMineFloor: 140, requiredSkullFloor: 120, requiredMiningLevel: 20, description: '爆破北侧岩壁，连通深层矿脉。' },
  { fromSize: 12, toSize: 13, moneyCost: 25000, materialCosts: [{ itemId: 'crystal_ore', quantity: 40 }, { itemId: 'gold_ore', quantity: 25 }], requiredClearedCount: 220, requiredDeepClearCount: 35, requiredMineFloor: 150, requiredSkullFloor: 130, requiredMiningLevel: 20, description: '疏通积水坑道，露出地下矿层。' },
  { fromSize: 13, toSize: 14, moneyCost: 35000, materialCosts: [{ itemId: 'shadow_ore', quantity: 30 }, { itemId: 'crystal_ore', quantity: 35 }], requiredClearedCount: 300, requiredDeepClearCount: 50, requiredMineFloor: 160, requiredSkullFloor: 140, requiredMiningLevel: 20, description: '凿开暗影矿层入口，扩展到深层。' },
  { fromSize: 14, toSize: 15, moneyCost: 48000, materialCosts: [{ itemId: 'shadow_ore', quantity: 40 }, { itemId: 'void_ore', quantity: 15 }], requiredClearedCount: 400, requiredDeepClearCount: 70, requiredMineFloor: 170, requiredSkullFloor: 150, requiredMiningLevel: 20, description: '打通虚空裂隙通道，开采稀有矿脉。' },
  { fromSize: 15, toSize: 16, moneyCost: 65000, materialCosts: [{ itemId: 'void_ore', quantity: 25 }, { itemId: 'shadow_ore', quantity: 35 }], requiredClearedCount: 520, requiredDeepClearCount: 90, requiredMineFloor: 180, requiredSkullFloor: 160, requiredMiningLevel: 20, description: '稳定虚空矿区结构，扩大安全开采范围。' },
  { fromSize: 16, toSize: 17, moneyCost: 85000, materialCosts: [{ itemId: 'void_ore', quantity: 30 }, { itemId: 'iridium_ore', quantity: 10 }], requiredClearedCount: 660, requiredDeepClearCount: 115, requiredMineFloor: 190, requiredSkullFloor: 170, requiredMiningLevel: 20, description: '开拓铱矿深层区域。' },
  { fromSize: 17, toSize: 18, moneyCost: 110000, materialCosts: [{ itemId: 'iridium_ore', quantity: 20 }, { itemId: 'void_ore', quantity: 25 }], requiredClearedCount: 820, requiredDeepClearCount: 145, requiredMineFloor: 200, requiredSkullFloor: 180, requiredMiningLevel: 20, description: '爆破深层岩层，连通铱矿富集带。' },
  { fromSize: 18, toSize: 19, moneyCost: 140000, materialCosts: [{ itemId: 'iridium_ore', quantity: 30 }, { itemId: 'obsidian', quantity: 15 }], requiredClearedCount: 1000, requiredDeepClearCount: 180, requiredMineFloor: 210, requiredSkullFloor: 190, requiredMiningLevel: 20, description: '清理黑曜岩层塌方，露出古老矿脉。' },
  { fromSize: 19, toSize: 20, moneyCost: 180000, materialCosts: [{ itemId: 'obsidian', quantity: 25 }, { itemId: 'iridium_ore', quantity: 35 }], requiredClearedCount: 1200, requiredDeepClearCount: 220, requiredMineFloor: 220, requiredSkullFloor: 200, requiredMiningLevel: 20, description: '打通龙玉矿脉通道，开辟珍贵矿区。' },
  { fromSize: 20, toSize: 21, moneyCost: 230000, materialCosts: [{ itemId: 'dragon_jade', quantity: 10 }, { itemId: 'obsidian', quantity: 20 }], requiredClearedCount: 1450, requiredDeepClearCount: 270, requiredMineFloor: 230, requiredSkullFloor: 210, requiredMiningLevel: 20, description: '稳固龙玉矿区结构。' },
  { fromSize: 21, toSize: 22, moneyCost: 290000, materialCosts: [{ itemId: 'dragon_jade', quantity: 15 }, { itemId: 'iridium_ore', quantity: 40 }], requiredClearedCount: 1720, requiredDeepClearCount: 320, requiredMineFloor: 240, requiredSkullFloor: 220, requiredMiningLevel: 20, description: '扩展龙玉开采面积。' },
  { fromSize: 22, toSize: 23, moneyCost: 360000, materialCosts: [{ itemId: 'dragon_jade', quantity: 20 }, { itemId: 'obsidian', quantity: 30 }], requiredClearedCount: 2020, requiredDeepClearCount: 380, requiredMineFloor: 250, requiredSkullFloor: 230, requiredMiningLevel: 20, description: '打通深层龙玉矿脉连接。' },
  { fromSize: 23, toSize: 24, moneyCost: 440000, materialCosts: [{ itemId: 'dragon_jade', quantity: 25 }, { itemId: 'iridium_ore', quantity: 50 }], requiredClearedCount: 2350, requiredDeepClearCount: 450, requiredMineFloor: 260, requiredSkullFloor: 240, requiredMiningLevel: 20, description: '稳定深层矿脉结构。' },
  { fromSize: 24, toSize: 25, moneyCost: 530000, materialCosts: [{ itemId: 'dragon_jade', quantity: 30 }, { itemId: 'obsidian', quantity: 35 }], requiredClearedCount: 2700, requiredDeepClearCount: 530, requiredMineFloor: 270, requiredSkullFloor: 250, requiredMiningLevel: 20, description: '开拓深层岩层最后的安全区域。' },
  { fromSize: 25, toSize: 26, moneyCost: 630000, materialCosts: [{ itemId: 'dragon_jade', quantity: 35 }, { itemId: 'iridium_ore', quantity: 60 }], requiredClearedCount: 3080, requiredDeepClearCount: 620, requiredMineFloor: 280, requiredSkullFloor: 260, requiredMiningLevel: 20, description: '凿开最深处的岩层屏障。' },
  { fromSize: 26, toSize: 27, moneyCost: 740000, materialCosts: [{ itemId: 'dragon_jade', quantity: 40 }, { itemId: 'obsidian', quantity: 40 }], requiredClearedCount: 3480, requiredDeepClearCount: 720, requiredMineFloor: 290, requiredSkullFloor: 270, requiredMiningLevel: 20, description: '打通地下暗河通道。' },
  { fromSize: 27, toSize: 28, moneyCost: 860000, materialCosts: [{ itemId: 'dragon_jade', quantity: 45 }, { itemId: 'iridium_ore', quantity: 70 }], requiredClearedCount: 3900, requiredDeepClearCount: 830, requiredMineFloor: 300, requiredSkullFloor: 280, requiredMiningLevel: 20, description: '加固暗河区域支撑结构。' },
  { fromSize: 28, toSize: 29, moneyCost: 990000, materialCosts: [{ itemId: 'dragon_jade', quantity: 50 }, { itemId: 'obsidian', quantity: 45 }], requiredClearedCount: 4350, requiredDeepClearCount: 950, requiredMineFloor: 310, requiredSkullFloor: 290, requiredMiningLevel: 20, description: '开拓暗河对岸的矿脉。' },
  { fromSize: 29, toSize: 30, moneyCost: 1130000, materialCosts: [{ itemId: 'dragon_jade', quantity: 55 }, { itemId: 'iridium_ore', quantity: 80 }], requiredClearedCount: 4820, requiredDeepClearCount: 1080, requiredMineFloor: 320, requiredSkullFloor: 300, requiredMiningLevel: 20, description: '凿通龙脉核心区域外围。' },
  { fromSize: 30, toSize: 31, moneyCost: 1280000, materialCosts: [{ itemId: 'dragon_jade', quantity: 60 }, { itemId: 'obsidian', quantity: 50 }], requiredClearedCount: 5320, requiredDeepClearCount: 1220, requiredMineFloor: 330, requiredSkullFloor: 310, requiredMiningLevel: 20, description: '打通龙脉核心入口。' },
  { fromSize: 31, toSize: 32, moneyCost: 1450000, materialCosts: [{ itemId: 'dragon_jade', quantity: 70 }, { itemId: 'iridium_ore', quantity: 100 }, { itemId: 'obsidian', quantity: 55 }], requiredClearedCount: 5850, requiredDeepClearCount: 1380, requiredMineFloor: 340, requiredSkullFloor: 320, requiredMiningLevel: 20, description: '完成龙脉核心区域的最终开拓，采石场达到最大规模。' }
]

export const createEmptyQuarryCells = (): QuarryCell[] =>
  Array.from({ length: QUARRY_TOTAL_CELLS }, (_, index) => ({
    index,
    state: 'empty' as const,
    kind: 'empty' as const,
    isActiveSite: false,
    revealed: true
  }))

export const createEmptyQuarryCellsSized = (size: number): QuarryCell[] =>
  Array.from({ length: size * size }, (_, index) => ({
    index,
    state: 'empty' as const,
    kind: 'empty' as const,
    isActiveSite: false,
    revealed: true
  }))

export const createDefaultQuarryWeeklyProgress = (weekKey = ''): QuarryWeeklyProgress => ({
  weekKey,
  clearedCount: 0,
  claimedMilestoneKeys: []
})

export const createDefaultQuarryMineNodes = (): QuarryMineNode[] => [
  { index: 0, kind: 'ore', state: 'available', label: '入口碎矿', itemId: 'stone', quantity: 10 },
  { index: 1, kind: 'monster', state: 'available', label: '碎石蟹巢', monsterId: 'quarry_crab' },
  { index: 2, kind: 'ore', state: 'available', label: '铜铁矿脉', itemId: 'iron_ore', quantity: 4 },
  { index: 3, kind: 'monster', state: 'available', label: '塌方蛇道', monsterId: 'quarry_snake' },
  {
    index: 4,
    kind: 'chest',
    state: 'available',
    label: '旧矿工箱',
    treasureItems: [
      { itemId: 'gold_ore', quantity: 6 },
      { itemId: 'jade', quantity: 2 }
    ]
  },
  { index: 5, kind: 'final', state: 'available', label: '灵器碎片祭台' }
]

export const createDefaultQuarryMineSaveData = (): QuarryMineSaveData => ({
  unlocked: false,
  entered: false,
  completed: false,
  finalRewardClaimed: false,
  lastRunDayTag: '',
  nodes: createDefaultQuarryMineNodes()
})

export const createDefaultQuarrySaveData = (): QuarrySaveData => ({
  unlockedAtDayTag: '',
  unlockYear: 1,
  activeSize: QUARRY_MIN_GRID_SIZE,
  lifetimeClearedCount: 0,
  deepClearCount: 0,
  cells: createEmptyQuarryCells(),
  lastRefreshDayTag: '',
  weeklyProgress: createDefaultQuarryWeeklyProgress(),
  quarryMine: createDefaultQuarryMineSaveData()
})

const clampInteger = (value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number => {
  const parsed = Math.floor(Number(value))
  if (!Number.isFinite(parsed)) return min
  return Math.min(max, Math.max(min, parsed))
}

const isQuarryCellKind = (value: unknown): value is QuarryCellKind =>
  value === 'rock' || value === 'ore' || value === 'gem' || value === 'wood' || value === 'deep'

const getResourceById = (resourceId?: string): QuarryResourceDef | undefined => {
  if (!resourceId) return undefined
  return Object.values(QUARRY_RESOURCE_POOLS).flatMap(pool => [...pool]).find(resource => resource.id === resourceId)
}

export const getQuarryResourceDef = (resourceId?: string): QuarryResourceDef | undefined => getResourceById(resourceId)

const rollWeightedEntry = <T extends { weight: number }>(entries: readonly T[], rng: () => number): T => {
  const totalWeight = entries.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0)
  if (totalWeight <= 0) return entries[0]!
  let roll = rng() * totalWeight
  for (const entry of entries) {
    roll -= Math.max(0, entry.weight)
    if (roll <= 0) return entry
  }
  return entries[entries.length - 1]!
}

const rollQuantity = (resource: QuarryResourceDef, rng: () => number): number => {
  const min = Math.max(1, Math.floor(resource.minQuantity))
  const max = Math.max(min, Math.floor(resource.maxQuantity))
  return min + Math.floor(rng() * (max - min + 1))
}

export const rollQuarryResource = (rng: () => number = Math.random): QuarryResourceDef => {
  const categoryEntries = Object.entries(QUARRY_RESOURCE_CATEGORY_WEIGHTS).map(([kind, weight]) => ({
    kind: kind as QuarryResourceKind,
    weight
  }))
  const category = rollWeightedEntry(categoryEntries, rng).kind
  return rollWeightedEntry(QUARRY_RESOURCE_POOLS[category], rng)
}

export const rollQuarryMonster = (rng: () => number = Math.random): QuarryMonsterDef => {
  const index = Math.floor(rng() * QUARRY_MONSTERS.length)
  return QUARRY_MONSTERS[index]!
}

export const rollQuarryTreasure = (rng: () => number = Math.random): { itemId: string; quantity: number }[] => {
  const totalWeight = QUARRY_TREASURE_POOL.reduce((sum, entry) => sum + entry.chance, 0)
  let roll = rng() * totalWeight
  for (const entry of QUARRY_TREASURE_POOL) {
    roll -= entry.chance
    if (roll <= 0) return [{ itemId: entry.itemId, quantity: entry.quantity }]
  }
  const last = QUARRY_TREASURE_POOL[QUARRY_TREASURE_POOL.length - 1]!
  return [{ itemId: last.itemId, quantity: last.quantity }]
}

export const rollQuarryArtifact = (rng: () => number = Math.random): { itemId: string; quantity: number }[] => {
  const totalWeight = QUARRY_ARTIFACT_POOL.reduce((sum, entry) => sum + entry.chance, 0)
  let roll = rng() * totalWeight
  for (const entry of QUARRY_ARTIFACT_POOL) {
    roll -= entry.chance
    if (roll <= 0) return [{ itemId: entry.itemId, quantity: entry.quantity }]
  }
  const last = QUARRY_ARTIFACT_POOL[QUARRY_ARTIFACT_POOL.length - 1]!
  return [{ itemId: last.itemId, quantity: last.quantity }]
}

export const createQuarryResourceCell = (index: number, rng: () => number = Math.random): QuarryCell => {
  const resource = rollQuarryResource(rng)
  return {
    index,
    state: resource.kind,
    isActiveSite: true,
    resourceId: resource.id,
    kind: resource.kind,
    itemId: resource.itemId,
    quantity: rollQuantity(resource, rng)
  }
}

export const createQuarryVisibleCell = (index: number, rng: () => number = Math.random): QuarryCell => {
  const roll = rng()
  if (roll < QUARRY_MONSTER_SPAWN_CHANCE) {
    const monster = rollQuarryMonster(rng)
    return {
      index,
      state: 'monster',
      kind: 'monster',
      isActiveSite: true,
      monsterId: monster.id,
      monsterHp: monster.hp,
      monsterMaxHp: monster.hp
    }
  }
  if (roll < QUARRY_MONSTER_SPAWN_CHANCE + QUARRY_TREASURE_SPAWN_CHANCE) {
    return {
      index,
      state: 'treasure',
      kind: 'treasure',
      isActiveSite: true,
      treasureItems: rollQuarryTreasure(rng)
    }
  }
  if (roll < QUARRY_MONSTER_SPAWN_CHANCE + QUARRY_TREASURE_SPAWN_CHANCE + QUARRY_ARTIFACT_SPAWN_CHANCE) {
    return {
      index,
      state: 'artifact',
      kind: 'artifact',
      isActiveSite: true,
      treasureItems: rollQuarryArtifact(rng)
    }
  }
  return createQuarryResourceCell(index, rng)
}

const shuffle = <T>(items: readonly T[], rng: () => number): T[] => {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1))
    const current = result[index]!
    result[index] = result[swapIndex]!
    result[swapIndex] = current
  }
  return result
}

export const seedInitialQuarryCells = (rng: () => number = Math.random): QuarryCell[] => {
  const cells = createEmptyQuarryCells()
  const indices = shuffle(cells.map(cell => cell.index), rng).slice(0, QUARRY_INITIAL_RESOURCE_COUNT)
  for (const index of indices) {
    cells[index] = createQuarryVisibleCell(index, rng)
  }
  return cells
}

export const normalizeQuarryCell = (rawCell: Partial<QuarryCell> | undefined, index: number): QuarryCell => {
  if (!rawCell) return { index, state: 'empty', kind: 'empty', isActiveSite: false, revealed: true }
  const rawState = rawCell.state

  if (rawState === 'monster' || rawCell.kind === 'monster') {
    return {
      index,
      state: 'monster',
      kind: 'monster',
      isActiveSite: true,
      monsterId: rawCell.monsterId,
      monsterHp: clampInteger(rawCell.monsterHp, 0, 999),
      monsterMaxHp: clampInteger(rawCell.monsterMaxHp, 0, 999),
      treasureItems: rawCell.treasureItems
    }
  }

  if (rawState === 'hidden' || rawState === 'rubble') {
    if (rawCell.kind === 'treasure' || rawCell.kind === 'artifact') {
      return {
        index,
        state: rawCell.kind,
        kind: rawCell.kind,
        isActiveSite: rawCell.isActiveSite ?? true,
        treasureItems: rawCell.treasureItems
      }
    }
    if (rawCell.kind === 'empty') {
      return {
        index,
        state: 'empty',
        kind: 'empty',
        isActiveSite: false,
        revealed: true
      }
    }
    const resource = getResourceById(rawCell.resourceId)
    const kind = isQuarryCellKind(rawCell.kind) ? rawCell.kind : resource?.kind
    const itemId = typeof rawCell.itemId === 'string' && rawCell.itemId.length > 0 ? rawCell.itemId : resource?.itemId
    if (!kind || !itemId) return { index, state: 'empty', kind: 'empty', isActiveSite: false, revealed: true }
    return {
      index,
      state: kind,
      isActiveSite: rawCell.isActiveSite ?? true,
      resourceId: resource?.id ?? rawCell.resourceId,
      kind,
      itemId,
      quantity: clampInteger(rawCell.quantity, 0, 99),
      revealed: true
    }
  }

  if (rawState === 'empty') {
    return {
      index,
      state: 'empty',
      kind: 'empty',
      isActiveSite: false,
      revealed: true
    }
  }

  if (rawState === 'surface') {
    const resource = getResourceById(rawCell.resourceId)
    const kind = isQuarryCellKind(rawCell.kind) ? rawCell.kind : resource?.kind
    const itemId = typeof rawCell.itemId === 'string' && rawCell.itemId.length > 0 ? rawCell.itemId : resource?.itemId
    if (!kind || !itemId) return { index, state: 'empty', kind: 'empty', isActiveSite: false, revealed: true }
    return {
      index,
      state: kind === 'deep' ? 'surface' : kind,
      isActiveSite: true,
      resourceId: resource?.id ?? rawCell.resourceId,
      kind,
      itemId,
      quantity: clampInteger(rawCell.quantity, 1, 99)
    }
  }

  if (rawState === 'treasure' || rawState === 'artifact') {
    return {
      index,
      state: rawState,
      kind: rawState,
      isActiveSite: true,
      treasureItems: rawCell.treasureItems
    }
  }
  if (rawState !== 'resource' && rawState !== 'rock' && rawState !== 'ore' && rawState !== 'gem' && rawState !== 'wood' && rawState !== 'deep') {
    return { index, state: 'empty', kind: 'empty', isActiveSite: false, revealed: true }
  }
  if (rawCell.kind === 'treasure' || rawCell.kind === 'artifact') {
    return {
      index,
      state: rawCell.kind,
      kind: rawCell.kind,
      isActiveSite: true,
      treasureItems: rawCell.treasureItems
    }
  }
  const resource = getResourceById(rawCell.resourceId)
  const kind = isQuarryCellKind(rawCell.kind) ? rawCell.kind : isQuarryCellKind(rawState) ? rawState : resource?.kind
  const itemId = typeof rawCell.itemId === 'string' && rawCell.itemId.length > 0 ? rawCell.itemId : resource?.itemId
  if (!kind || !itemId) return { index, state: 'empty', kind: 'empty', isActiveSite: false, revealed: true }
  return {
    index,
    state: kind,
    isActiveSite: true,
    resourceId: resource?.id ?? rawCell.resourceId,
    kind,
    itemId,
    quantity: clampInteger(rawCell.quantity, 1, 99)
  }
}

const normalizeQuarryMineNode = (rawNode: Partial<QuarryMineNode> | undefined, index: number): QuarryMineNode => {
  const fallback = createDefaultQuarryMineNodes()[index]
  if (!fallback) {
    return {
      index,
      kind: 'ore',
      state: 'cleared',
      label: `废弃支道 ${index + 1}`,
      itemId: 'stone',
      quantity: 1
    }
  }
  const state = rawNode?.state === 'cleared' ? 'cleared' : 'available'
  return {
    ...fallback,
    ...rawNode,
    index,
    kind: fallback.kind,
    label: fallback.label,
    state,
    itemId: rawNode?.itemId ?? fallback.itemId,
    quantity: clampInteger(rawNode?.quantity, fallback.quantity ?? 0, 99),
    monsterId: rawNode?.monsterId ?? fallback.monsterId,
    treasureItems: Array.isArray(rawNode?.treasureItems) ? rawNode.treasureItems : fallback.treasureItems
  }
}

export const normalizeQuarryMineSaveData = (
  data?: Partial<QuarryMineSaveData> | null,
  unlocked = false
): QuarryMineSaveData => {
  const defaults = createDefaultQuarryMineSaveData()
  const rawNodes = Array.isArray(data?.nodes) ? data.nodes : []
  const nodes = defaults.nodes.map((_, index) => normalizeQuarryMineNode(rawNodes[index], index))
  const completed = !!data?.completed || nodes.every(node => node.state === 'cleared')
  return {
    unlocked: !!data?.unlocked || unlocked,
    entered: !!data?.entered,
    completed,
    finalRewardClaimed: !!data?.finalRewardClaimed,
    lastRunDayTag: typeof data?.lastRunDayTag === 'string' ? data.lastRunDayTag : '',
    nodes
  }
}

export const normalizeQuarrySaveData = (data?: Partial<QuarrySaveData> | null): QuarrySaveData => {
  const defaults = createDefaultQuarrySaveData()
  const activeSize = clampInteger(data?.activeSize, QUARRY_MIN_GRID_SIZE, QUARRY_MAX_GRID_SIZE) || QUARRY_MIN_GRID_SIZE
  const totalCells = activeSize * activeSize
  const rawCells = Array.isArray(data?.cells) ? data.cells : []
  const cells = Array.from({ length: totalCells }, (_, index) => normalizeQuarryCell(rawCells[index], index))
  const rawWeeklyProgress = data?.weeklyProgress
  return {
    unlockedAtDayTag: typeof data?.unlockedAtDayTag === 'string' ? data.unlockedAtDayTag : defaults.unlockedAtDayTag,
    unlockYear: clampInteger(data?.unlockYear, defaults.unlockYear, 999),
    activeSize,
    lifetimeClearedCount: clampInteger(data?.lifetimeClearedCount),
    deepClearCount: clampInteger(data?.deepClearCount),
    cells,
    lastRefreshDayTag: typeof data?.lastRefreshDayTag === 'string' ? data.lastRefreshDayTag : '',
    weeklyProgress: {
      weekKey: typeof rawWeeklyProgress?.weekKey === 'string' ? rawWeeklyProgress.weekKey : '',
      clearedCount: clampInteger(rawWeeklyProgress?.clearedCount),
      claimedMilestoneKeys: Array.isArray(rawWeeklyProgress?.claimedMilestoneKeys)
        ? [...new Set(rawWeeklyProgress.claimedMilestoneKeys.filter((key): key is string => typeof key === 'string'))]
        : []
    },
    quarryMine: normalizeQuarryMineSaveData(data?.quarryMine, !!data?.unlockedAtDayTag)
  }
}

export const getQuarryDailySpawnCap = (
  year: number,
  unlockYear: number,
  options: { maintenanceActive?: boolean; skullCavernBestFloor?: number; miningMasteryNodeCount?: number } = {}
): number => {
  const yearDelta = Math.max(0, clampInteger(year, 1, 999) - clampInteger(unlockYear, 1, 999))
  const bonus =
    (options.maintenanceActive ? QUARRY_MAINTENANCE_SPAWN_BONUS : 0) +
    ((options.skullCavernBestFloor ?? 0) >= QUARRY_SKULL_DEPTH_BONUS_FLOOR ? QUARRY_SKULL_DEPTH_SPAWN_BONUS : 0) +
    ((options.miningMasteryNodeCount ?? 0) >= QUARRY_MASTERY_NODE_BONUS_THRESHOLD ? QUARRY_MASTERY_NODE_SPAWN_BONUS : 0)
  return Math.min(QUARRY_DAILY_MAX_CAP, QUARRY_DAILY_BASE_CAP + yearDelta * 2 + bonus)
}

export const spawnQuarryDailyResources = (
  cells: QuarryCell[],
  cap: number,
  rng: () => number = Math.random
): { cells: QuarryCell[]; spawnedCount: number; attemptedCount: number } => {
  const nextCells = cells.map((cell, index) => normalizeQuarryCell(cell, index))
  const emptyIndices = shuffle(nextCells.filter(cell => cell.state === 'empty').map(cell => cell.index), rng)
  let spawnedCount = 0
  let attemptedCount = 0
  for (const index of emptyIndices) {
    if (spawnedCount >= cap) break
    attemptedCount += 1
    if (rng() >= QUARRY_DAILY_SPAWN_CHANCE) continue
    nextCells[index] = createQuarryVisibleCell(index, rng)
    spawnedCount += 1
  }
  return { cells: nextCells, spawnedCount, attemptedCount }
}

export const getQuarryExpansionStage = (currentSize: number): QuarryExpansionStage | null => {
  return QUARRY_EXPANSION_STAGES.find(stage => stage.fromSize === currentSize) ?? null
}

export const getQuarryExpansionInfo = (
  currentSize: number,
  lifetimeClearedCount: number,
  deepClearCount: number,
  highestMineFloor: number,
  skullCavernBestFloor: number,
  miningLevel: number
): { nextStage: QuarryExpansionStage | null; canExpand: boolean; missingRequirements: string[] } => {
  const nextStage = getQuarryExpansionStage(currentSize)
  if (!nextStage) return { nextStage: null, canExpand: false, missingRequirements: ['已达最大规模'] }
  const missing: string[] = []
  if (lifetimeClearedCount < nextStage.requiredClearedCount) missing.push(`累计清理 ${lifetimeClearedCount}/${nextStage.requiredClearedCount}`)
  if (deepClearCount < nextStage.requiredDeepClearCount) missing.push(`深脉清理 ${deepClearCount}/${nextStage.requiredDeepClearCount}`)
  if (highestMineFloor < nextStage.requiredMineFloor) missing.push(`主矿洞 ${highestMineFloor}/${nextStage.requiredMineFloor} 层`)
  if (skullCavernBestFloor < nextStage.requiredSkullFloor) missing.push(`骷髅矿穴 ${skullCavernBestFloor}/${nextStage.requiredSkullFloor} 层`)
  if (miningLevel < nextStage.requiredMiningLevel) missing.push(`采矿等级 ${miningLevel}/${nextStage.requiredMiningLevel}`)
  return { nextStage, canExpand: missing.length === 0, missingRequirements: missing }
}
