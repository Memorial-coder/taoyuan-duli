export interface QuarryMineElixirPrepOption {
  itemId: string
  label: string
  effect: string
  staminaReduction: number
  monsterDamageMultiplier: number
  logEffect: string
}

export interface RegionExpeditionElixirPrepOption {
  itemId: string
  label: string
  effect: string
  visibilityBonus?: number
  findingsBonus?: number
  moraleBonus?: number
  dangerReduction?: number
  medicineBonus?: number
  utilityBonus?: number
  pollutionReduction?: number
  anomalyReduction?: number
  alertnessReduction?: number
  journalTitle: string
  journalSummary: string
  journalEffects: string[]
}

export const QUARRY_MINE_ELIXIR_PREP_OPTIONS: QuarryMineElixirPrepOption[] = [
  {
    itemId: 'wind_core_guard_pill',
    label: '风蚀护脉丹',
    effect: '本段体力 -1，遭遇伤害降低 40%',
    staminaReduction: 1,
    monsterDamageMultiplier: 0.6,
    logEffect: '本段体力压力降低，遭遇伤害降低 40%'
  },
  {
    itemId: 'rare_lotus_guard_elixir',
    label: '稀莲守息露',
    effect: '本段体力 -1，遭遇伤害降低 55%',
    staminaReduction: 1,
    monsterDamageMultiplier: 0.45,
    logEffect: '莲息护住旧支道，遭遇伤害降低 55%'
  }
]

export const REGION_EXPEDITION_ELIXIR_PREP_OPTIONS: RegionExpeditionElixirPrepOption[] = [
  {
    itemId: 'ley_crystal_focus_elixir',
    label: '灵脉晶辉凝神露',
    effect: '视野 +10，发现 +2，工具补给 +1',
    visibilityBonus: 10,
    findingsBonus: 2,
    utilityBonus: 1,
    journalTitle: '丹药准备：晶辉定向',
    journalSummary: '灵脉晶辉在地图边缘标出可疑回路，队伍出发时更容易保持方向。',
    journalEffects: ['开局视野 +10', '发现线索 +2', '工具补给 +1']
  },
  {
    itemId: 'marsh_luminous_cleansing_elixir',
    label: '沼光净息露',
    effect: '危险 -8，污染 -12，异常 -8，药品 +1',
    dangerReduction: 8,
    pollutionReduction: 12,
    anomalyReduction: 8,
    medicineBonus: 1,
    journalTitle: '丹药准备：净息护队',
    journalSummary: '沼光净息露提前压住湿地瘴气和异常残响，前线压力随之下降。',
    journalEffects: ['初始危险 -8', '污染 -12', '异常 -8', '药品 +1']
  },
  {
    itemId: 'moon_pearl_calm_elixir',
    label: '月珠安神露',
    effect: '士气 +10，危险 -4，药品 +1',
    moraleBonus: 10,
    dangerReduction: 4,
    medicineBonus: 1,
    journalTitle: '丹药准备：月珠安神',
    journalSummary: '月珠安神露让队伍在夜巡和长线推进中保持节奏，撤退判断更稳定。',
    journalEffects: ['开局士气 +10', '初始危险 -4', '药品 +1']
  }
]

export const getQuarryMineElixirPrepOption = (itemId: string | null | undefined): QuarryMineElixirPrepOption | null =>
  itemId ? QUARRY_MINE_ELIXIR_PREP_OPTIONS.find(option => option.itemId === itemId) ?? null : null

export const getRegionExpeditionElixirPrepOption = (itemId: string | null | undefined): RegionExpeditionElixirPrepOption | null =>
  itemId ? REGION_EXPEDITION_ELIXIR_PREP_OPTIONS.find(option => option.itemId === itemId) ?? null : null
