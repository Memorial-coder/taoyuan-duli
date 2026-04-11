import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getItemById } from '@/data'
import type { EconomySinkCategory, EconomySystemKey, EconomyTelemetryState, Gender, InventoryItem, WealthTierAssessment } from '@/types'
import {
  LATE_NIGHT_RECOVERY_MAX,
  LATE_NIGHT_RECOVERY_MIN,
  PASSOUT_STAMINA_RECOVERY,
  PASSOUT_MONEY_PENALTY_RATE,
  PASSOUT_MONEY_PENALTY_CAP
} from '@/data/timeConstants'
import { useSkillStore } from './useSkillStore'
import { useHomeStore } from './useHomeStore'
import { useInventoryStore } from './useInventoryStore'
import { useAchievementStore } from './useAchievementStore'
import { useHiddenNpcStore } from './useHiddenNpcStore'
import { useMiningStore } from './useMiningStore'
import { useGuildStore } from './useGuildStore'
import { useWarehouseStore } from './useWarehouseStore'
import { useSettingsStore } from './useSettingsStore'
import { useVillageProjectStore } from './useVillageProjectStore'
import { ECONOMY_AUDIT_CONFIG, ECONOMY_TUNING_CONFIG } from '@/data/market'
import type { EconomyDailySnapshot, EconomyFlowKind, EconomyRiskReport } from '@/types'

/** 最大体力阶梯 (5档, 270 起 508 顶) */
const STAMINA_CAPS = [120, 160, 200, 250, 300]

/** HP 常量 */
const BASE_MAX_HP = 100
const HP_PER_COMBAT_LEVEL = 5
const FIGHTER_HP_BONUS = 25
const WARRIOR_HP_BONUS = 40
const ECONOMY_TELEMETRY_SAVE_VERSION = 1
const ECONOMY_RECENT_SNAPSHOT_LIMIT = 14
const ASSET_QUALITY_MULTIPLIERS: Record<'normal' | 'fine' | 'excellent' | 'supreme', number> = {
  normal: 1,
  fine: 1.25,
  excellent: 1.5,
  supreme: 2
}

const createEmptyEconomyTelemetry = (): EconomyTelemetryState => ({
  saveVersion: ECONOMY_TELEMETRY_SAVE_VERSION,
  lastAuditDayTag: '',
  currentSegmentId: 'mid_transition',
  recentSnapshots: [],
  lifetimeIncome: {
    total: 0,
    bySystem: {}
  },
  lifetimeExpense: {
    total: 0,
    bySystem: {}
  },
  lifetimeSinkSpend: {
    total: 0,
    byCategory: {}
  },
  latestRiskReport: null
})

const normalizeEconomyRiskReport = (report: Partial<EconomyRiskReport> | null | undefined): EconomyRiskReport | null => {
  if (!report || typeof report !== 'object') return null
  const level = report.level
  if (level !== 'healthy' && level !== 'watch' && level !== 'warning' && level !== 'critical') return null
  return {
    level,
    triggeredMetricIds: Array.isArray(report.triggeredMetricIds) ? report.triggeredMetricIds.filter((id): id is string => typeof id === 'string') : [],
    summary: typeof report.summary === 'string' ? report.summary : ''
  }
}

const normalizeEconomyTelemetry = (data: Partial<EconomyTelemetryState> | undefined): EconomyTelemetryState => {
  const fallback = createEmptyEconomyTelemetry()
  const normalizeSystems = (input: unknown) => {
    if (!input || typeof input !== 'object') return {} as Partial<Record<EconomySystemKey, number>>
    return Object.fromEntries(
      Object.entries(input)
        .filter(([key, value]) => typeof key === 'string' && Number.isFinite(Number(value)))
        .map(([key, value]) => [key, Math.max(0, Number(value))])
    ) as Partial<Record<EconomySystemKey, number>>
  }
  const normalizeSinks = (input: unknown) => {
    if (!input || typeof input !== 'object') return {} as Partial<Record<EconomySinkCategory, number>>
    return Object.fromEntries(
      Object.entries(input)
        .filter(([key, value]) => typeof key === 'string' && Number.isFinite(Number(value)))
        .map(([key, value]) => [key, Math.max(0, Number(value))])
    ) as Partial<Record<EconomySinkCategory, number>>
  }

  return {
    saveVersion: ECONOMY_TELEMETRY_SAVE_VERSION,
    lastAuditDayTag: typeof data?.lastAuditDayTag === 'string' ? data.lastAuditDayTag : fallback.lastAuditDayTag,
    currentSegmentId: typeof data?.currentSegmentId === 'string' ? data.currentSegmentId : fallback.currentSegmentId,
    recentSnapshots: Array.isArray(data?.recentSnapshots)
      ? data.recentSnapshots
          .filter(snapshot => snapshot && typeof snapshot === 'object')
          .map(snapshot => {
            const raw = snapshot as EconomyTelemetryState['recentSnapshots'][number]
            return {
              dayTag: typeof raw.dayTag === 'string' ? raw.dayTag : '',
              disposableMoney: Math.max(0, Number(raw.disposableMoney) || 0),
              totalIncome: Math.max(0, Number(raw.totalIncome) || 0),
              totalExpense: Math.max(0, Number(raw.totalExpense) || 0),
              sinkSpend: Math.max(0, Number(raw.sinkSpend) || 0),
              dominantIncomeSystem: raw.dominantIncomeSystem,
              participatingSystems: Array.isArray(raw.participatingSystems)
                ? raw.participatingSystems.filter((system): system is EconomySystemKey => typeof system === 'string')
                : [],
              highValueOrderTypes: Math.max(0, Number(raw.highValueOrderTypes) || 0),
              incomeBySystem: normalizeSystems(raw.incomeBySystem),
              expenseBySystem: normalizeSystems(raw.expenseBySystem),
              activeSinkCategories: Array.isArray(raw.activeSinkCategories)
                ? raw.activeSinkCategories.filter((category): category is EconomySinkCategory => typeof category === 'string')
                : []
            }
          })
          .slice(-ECONOMY_RECENT_SNAPSHOT_LIMIT)
      : fallback.recentSnapshots,
    lifetimeIncome: {
      total: Math.max(0, Number(data?.lifetimeIncome?.total) || 0),
      bySystem: normalizeSystems(data?.lifetimeIncome?.bySystem)
    },
    lifetimeExpense: {
      total: Math.max(0, Number(data?.lifetimeExpense?.total) || 0),
      bySystem: normalizeSystems(data?.lifetimeExpense?.bySystem)
    },
    lifetimeSinkSpend: {
      total: Math.max(0, Number(data?.lifetimeSinkSpend?.total) || 0),
      byCategory: normalizeSinks(data?.lifetimeSinkSpend?.byCategory)
    },
    latestRiskReport: normalizeEconomyRiskReport(data?.latestRiskReport)
  }
}

export const usePlayerStore = defineStore('player', () => {
  const playerName = ref('未命名')
  const gender = ref<Gender>('male')
  const inventoryStore = useInventoryStore()
  const warehouseStore = useWarehouseStore()
  /** 旧存档加载后需要设置身份（不持久化） */
  const needsIdentitySetup = ref(false)
  const money = ref(500)
  const stamina = ref(120)
  const maxStamina = ref(120)
  const staminaCapLevel = ref(0) // 0=120, 1=160, 2=200, 3=250, 4=300
  /** 额外体力上限加成（仙翁金丹等），不受仙桃阶梯覆盖 */
  const bonusMaxStamina = ref(0)

  // HP 系统
  const hp = ref(BASE_MAX_HP)
  const baseMaxHp = ref(BASE_MAX_HP)
  const economyTelemetry = ref<EconomyTelemetryState>(createEmptyEconomyTelemetry())

  const isExhausted = computed(() => stamina.value <= 5)
  const staminaPercent = computed(() => Math.round((stamina.value / maxStamina.value) * 100))
  /** NPC 用来称呼玩家的称谓 */
  const honorific = computed(() => (gender.value === 'male' ? '小哥' : '姑娘'))

  /** 计算当前最大 HP（基础 + 战斗等级 + 专精加成 + 仙缘加成 + 公会加成） */
  const getMaxHp = (): number => {
    const skillStore = useSkillStore()
    let bonus = skillStore.combatLevel * HP_PER_COMBAT_LEVEL
    const combatSkill = skillStore.getSkill('combat')
    const perk5 = combatSkill.perk5
    const perk10 = combatSkill.perk10
    const perk15 = combatSkill.perk15
    const perk20 = combatSkill.perk20
    if (perk5 === 'fighter') bonus += FIGHTER_HP_BONUS
    if (perk10 === 'warrior') bonus += WARRIOR_HP_BONUS
    if (perk15 === 'sword_saint' || perk15 === 'berserker') bonus += 80
    if (perk15 === 'phantom_blade' || perk15 === 'iron_fortress') bonus += 40
    if (perk20 === 'war_god' || perk20 === 'slaughter_king') bonus += 150
    if (perk20 === 'shadow_sovereign' || perk20 === 'indestructible') bonus += 80
    const ringHpBonus = useInventoryStore().getRingEffectValue('max_hp_bonus')
    // 仙缘结缘：灵护（spirit_shield）HP 加成
    const spiritShield = useHiddenNpcStore().getBondBonusByType('spirit_shield')
    const spiritHpBonus = spiritShield?.type === 'spirit_shield' ? spiritShield.hpBonus : 0
    // 公会加成：生命护符永久 + 等级被动
    const guildHpBonus = useMiningStore().guildBonusMaxHp
    const guildLevelHpBonus = useGuildStore().getGuildHpBonus()
    return baseMaxHp.value + bonus + ringHpBonus + spiritHpBonus + guildHpBonus + guildLevelHpBonus
  }

  const getHpPercent = (): number => {
    return Math.round((hp.value / getMaxHp()) * 100)
  }

  const getIsLowHp = (): boolean => {
    return hp.value <= getMaxHp() * 0.25
  }

  /** 消耗体力（含仙缘灵护减免），返回是否成功 */
  const consumeStamina = (amount: number): boolean => {
    // 仙缘结缘：灵护（spirit_shield）体力消耗减免
    const spiritShield2 = useHiddenNpcStore().getBondBonusByType('spirit_shield')
    const spiritSave = spiritShield2?.type === 'spirit_shield' ? spiritShield2.staminaSave / 100 : 0
    const effectiveAmount = Math.max(1, Math.floor(amount * (1 - spiritSave)))
    if (stamina.value < effectiveAmount) return false
    stamina.value -= effectiveAmount
    return true
  }

  /** 恢复体力 */
  const restoreStamina = (amount: number) => {
    stamina.value = Math.min(stamina.value + amount, maxStamina.value)
  }

  /** 受到伤害（扣 HP），返回实际伤害值 */
  const takeDamage = (amount: number): number => {
    const actual = Math.min(amount, hp.value)
    hp.value -= actual
    return actual
  }

  /** 恢复生命值 */
  const restoreHealth = (amount: number) => {
    hp.value = Math.min(hp.value + amount, getMaxHp())
  }

  /**
   * 每日重置
   * - 正常：满体力 + 满HP
   * - 晚睡：渐进恢复 (24时90%→25时60%) + 满HP
   * - 昏倒：50% 体力 + 满HP + 扣10%铜钱
   */
  const dailyReset = (mode: 'normal' | 'late' | 'passout', bedHour?: number): { moneyLost: number; recoveryPct: number } => {
    let moneyLost = 0
    let recoveryPct = 1
    switch (mode) {
      case 'normal':
        stamina.value = maxStamina.value
        break
      case 'late': {
        // 渐进式恢复：24时→90%, 25时→60%, 线性插值
        const homeStore = useHomeStore()
        const staminaBonus = homeStore.getStaminaRecoveryBonus()
        const villageBonus = useVillageProjectStore().getDailyRecoveryBonus()
        const t = Math.min(Math.max((bedHour ?? 24) - 24, 0), 1)
        recoveryPct = LATE_NIGHT_RECOVERY_MAX - t * (LATE_NIGHT_RECOVERY_MAX - LATE_NIGHT_RECOVERY_MIN) + staminaBonus + villageBonus
        stamina.value = Math.floor(maxStamina.value * Math.min(recoveryPct, 1))
        break
      }
      case 'passout': {
        const homeStore2 = useHomeStore()
        const staminaBonus2 = homeStore2.getStaminaRecoveryBonus()
        const villageBonus2 = useVillageProjectStore().getDailyRecoveryBonus()
        recoveryPct = PASSOUT_STAMINA_RECOVERY + staminaBonus2 + villageBonus2
        stamina.value = Math.floor(maxStamina.value * Math.min(recoveryPct, 1))
        moneyLost = Math.min(Math.floor(money.value * PASSOUT_MONEY_PENALTY_RATE), PASSOUT_MONEY_PENALTY_CAP)
        money.value -= moneyLost
        recordEconomyFlow('expense', moneyLost, 'system')
        break
      }
    }
    // HP 每天都回满
    hp.value = getMaxHp()
    return { moneyLost, recoveryPct }
  }

  /** 提升体力上限 */
  const upgradeMaxStamina = (): boolean => {
    if (staminaCapLevel.value >= STAMINA_CAPS.length - 1) return false
    staminaCapLevel.value++
    maxStamina.value = STAMINA_CAPS[staminaCapLevel.value]! + bonusMaxStamina.value
    return true
  }

  /** 增加额外体力上限加成（仙翁金丹等） */
  const addBonusMaxStamina = (amount: number) => {
    bonusMaxStamina.value += amount
    maxStamina.value = STAMINA_CAPS[staminaCapLevel.value]! + bonusMaxStamina.value
  }

  /** 花费铜钱，返回是否成功 */
  const spendMoney = (amount: number, system: EconomySystemKey = 'system'): boolean => {
    if (money.value < amount) return false
    money.value -= amount
    economyTelemetry.value.lifetimeExpense.total += amount
    economyTelemetry.value.lifetimeExpense.bySystem[system] = (economyTelemetry.value.lifetimeExpense.bySystem[system] ?? 0) + amount
    return true
  }

  const recordSinkSpend = (amount: number, category: EconomySinkCategory) => {
    if (amount <= 0) return
    economyTelemetry.value.lifetimeSinkSpend.total += amount
    economyTelemetry.value.lifetimeSinkSpend.byCategory[category] = (economyTelemetry.value.lifetimeSinkSpend.byCategory[category] ?? 0) + amount
  }

  const recordEconomyFlow = (kind: EconomyFlowKind, amount: number, system: EconomySystemKey) => {
    if (amount <= 0) return
    const bucket = kind === 'income' ? economyTelemetry.value.lifetimeIncome : economyTelemetry.value.lifetimeExpense
    bucket.total += amount
    bucket.bySystem[system] = (bucket.bySystem[system] ?? 0) + amount
  }

  const setEconomyRiskReport = (report: EconomyRiskReport | null) => {
    economyTelemetry.value.latestRiskReport = report ? normalizeEconomyRiskReport(report) : null
  }

  const getRecentEconomySnapshots = (days = ECONOMY_RECENT_SNAPSHOT_LIMIT) => {
    return economyTelemetry.value.recentSnapshots.slice(-Math.max(1, days))
  }

  const getRecentNetIncome = (days = 7) => {
    return getRecentEconomySnapshots(days).reduce((sum, snapshot) => sum + snapshot.totalIncome - snapshot.totalExpense, 0)
  }

  const getRecentAverageNetIncome = (days = 14) => {
    const snapshots = getRecentEconomySnapshots(days)
    if (snapshots.length === 0) return 0
    return getRecentNetIncome(days) / snapshots.length
  }

  const getInflationPressureIndex = (days = 14) => {
    const averageNetIncome = getRecentAverageNetIncome(days)
    return averageNetIncome <= 0 ? money.value : money.value / Math.max(1, averageNetIncome)
  }

  const getSinkSatisfactionRatio = (days = 14) => {
    const snapshots = getRecentEconomySnapshots(days)
    const totalIncome = snapshots.reduce((sum, snapshot) => sum + snapshot.totalIncome, 0)
    const sinkSpend = snapshots.reduce((sum, snapshot) => sum + snapshot.sinkSpend, 0)
    return totalIncome <= 0 ? 0 : sinkSpend / totalIncome
  }

  const getLoopDiversityScore = (days = 7) => {
    const snapshots = getRecentEconomySnapshots(days)
    const participatingSystems = new Set<EconomySystemKey>()
    let highValueOrderTypes = 0
    for (const snapshot of snapshots) {
      snapshot.participatingSystems.forEach(system => participatingSystems.add(system))
      highValueOrderTypes = Math.max(highValueOrderTypes, snapshot.highValueOrderTypes ?? 0)
    }
    return participatingSystems.size + highValueOrderTypes
  }

  const getDominantIncomeShare = (days = 7) => {
    const totals: Partial<Record<EconomySystemKey, number>> = {}
    let overall = 0
    for (const snapshot of getRecentEconomySnapshots(days)) {
      for (const [system, amount] of Object.entries(snapshot.incomeBySystem ?? {})) {
        const numericAmount = Math.max(0, Number(amount) || 0)
        totals[system as EconomySystemKey] = (totals[system as EconomySystemKey] ?? 0) + numericAmount
        overall += numericAmount
      }
    }
    if (overall <= 0) return 0
    const dominant = Object.values(totals).reduce((max, value) => Math.max(max, value ?? 0), 0)
    return dominant / overall
  }

  const getInventoryAssetValue = (slots: InventoryItem[]) => {
    return slots.reduce((sum, slot) => {
      const itemDef = getItemById(slot.itemId)
      if (!itemDef) return sum
      const multiplier = ASSET_QUALITY_MULTIPLIERS[slot.quality] ?? 1
      return sum + itemDef.sellPrice * slot.quantity * multiplier
    }, 0)
  }

  const getTotalAssetValue = () => {
    const inventoryAssetValue = getInventoryAssetValue(inventoryStore.items)
    const tempInventoryAssetValue = getInventoryAssetValue(inventoryStore.tempItems ?? [])
    const warehouseAssetValue = warehouseStore.chests.reduce((sum: number, chest: { items?: InventoryItem[] }) => sum + getInventoryAssetValue(chest.items ?? []), 0)
    return money.value + inventoryAssetValue + tempInventoryAssetValue + warehouseAssetValue
  }

  const getCurrentWealthTier = (): WealthTierAssessment | null => {
    const balanceConfig = useSettingsStore().getLateGameBalanceConfig()
    const recent7DayNetIncome = getRecentNetIncome(7)
    const totalAssetValue = getTotalAssetValue()
    const matchedTier =
      [...balanceConfig.wealthTiers]
        .reverse()
        .find(tier =>
          money.value >= tier.minCashOnHand &&
          recent7DayNetIncome >= tier.minRecent7DayNetIncome &&
          totalAssetValue >= tier.minTotalAssetValue
        ) ?? balanceConfig.wealthTiers[0] ?? null

    if (!matchedTier) return null

    return {
      id: matchedTier.id,
      label: matchedTier.label,
      description: matchedTier.description,
      cashOnHand: money.value,
      recent7DayNetIncome,
      totalAssetValue,
      goalCashRewardMultiplier: matchedTier.goalCashRewardMultiplier,
      recommendationWeight: matchedTier.recommendationWeight,
      preferredSinkCategories: [...matchedTier.preferredSinkCategories],
      recommendedFocus: matchedTier.recommendedFocus
    }
  }

  const getCurrentEconomySegment = () => {
    const inflationPressure = getInflationPressureIndex()
    const matchedSegment =
      [...ECONOMY_AUDIT_CONFIG.playerSegments]
        .reverse()
        .find(segment => money.value >= segment.disposableMoneyMin && inflationPressure >= segment.inflationPressureMin) ??
      ECONOMY_AUDIT_CONFIG.playerSegments[0]
    if (matchedSegment) {
      economyTelemetry.value.currentSegmentId = matchedSegment.id
    }
    return matchedSegment ?? null
  }

  const getEconomyOverview = () => {
    const inflationPressure = getInflationPressureIndex()
    const sinkSatisfaction = getSinkSatisfactionRatio()
    const loopDiversity = getLoopDiversityScore()
    const dominantIncomeShare = getDominantIncomeShare()
    const recent7DayNetIncome = getRecentNetIncome(7)
    const totalAssetValue = getTotalAssetValue()
    const wealthTier = getCurrentWealthTier()
    const guardrailNetInflowRatio = money.value <= 0 ? 0 : getRecentNetIncome(7) / Math.max(1, money.value)
    const activeSinkCategories = new Set<EconomySinkCategory>()
    for (const snapshot of getRecentEconomySnapshots(14)) {
      snapshot.activeSinkCategories?.forEach(category => activeSinkCategories.add(category))
    }
    const sinkCoverage = activeSinkCategories.size / Math.max(1, ECONOMY_AUDIT_CONFIG.linkedSystems.length)
    const riskReportEnabled = ECONOMY_TUNING_CONFIG.riskReportEnabled

    return {
      currentSegment: getCurrentEconomySegment(),
      wealthTier,
      inflationPressure,
      sinkSatisfaction,
      loopDiversity,
      dominantIncomeShare,
      recent7DayNetIncome,
      totalAssetValue,
      guardrailNetInflowRatio,
      sinkCoverage,
      riskReportEnabled,
      latestRiskReport: riskReportEnabled ? economyTelemetry.value.latestRiskReport : null
    }
  }

  const appendEconomySnapshot = (snapshot: EconomyDailySnapshot) => {
    economyTelemetry.value.lastAuditDayTag = snapshot.dayTag
    economyTelemetry.value.recentSnapshots = [...economyTelemetry.value.recentSnapshots, snapshot].slice(-ECONOMY_RECENT_SNAPSHOT_LIMIT)
  }

  /** 获得铜钱 */
  const earnMoney = (amount: number, options?: { countAsEarned?: boolean; system?: EconomySystemKey }) => {
    money.value += amount
    recordEconomyFlow('income', amount, options?.system ?? 'system')
    if (options?.countAsEarned ?? true) {
      useAchievementStore().recordMoneyEarned(amount)
    }
  }

  /** 直接设置铜钱（用于额度兑换等同步场景） */
  const setMoney = (amount: number) => {
    money.value = Math.max(0, Math.floor(amount))
  }

  /** 设置玩家身份（新游戏或旧存档迁移时调用） */
  const setIdentity = (name: string, g: Gender) => {
    playerName.value = name
    gender.value = g
    needsIdentitySetup.value = false
  }

  const serialize = () => {
    return {
      playerName: playerName.value,
      gender: gender.value,
      money: money.value,
      stamina: stamina.value,
      maxStamina: maxStamina.value,
      staminaCapLevel: staminaCapLevel.value,
      bonusMaxStamina: bonusMaxStamina.value,
      hp: hp.value,
      baseMaxHp: baseMaxHp.value,
      economyTelemetry: economyTelemetry.value
    }
  }

  const deserialize = (data: ReturnType<typeof serialize>) => {
    const hasIdentity = (data as any).playerName != null
    playerName.value = (data as any).playerName ?? '未命名'
    gender.value = (data as any).gender ?? 'male'
    needsIdentitySetup.value = !hasIdentity
    money.value = data.money
    stamina.value = data.stamina
    maxStamina.value = data.maxStamina
    staminaCapLevel.value = data.staminaCapLevel
    bonusMaxStamina.value = (data as any).bonusMaxStamina ?? 0
    // 旧存档兼容：如果没有 bonusMaxStamina 字段，从 maxStamina 和 staminaCapLevel 推算
    if ((data as any).bonusMaxStamina == null) {
      const expectedBase = STAMINA_CAPS[staminaCapLevel.value] ?? 120
      const diff = maxStamina.value - expectedBase
      if (diff > 0) bonusMaxStamina.value = diff
    }
    // 确保 maxStamina 与 staminaCapLevel + bonusMaxStamina 一致（修复旧存档）
    const expectedMax = (STAMINA_CAPS[staminaCapLevel.value] ?? 120) + bonusMaxStamina.value
    if (maxStamina.value !== expectedMax) {
      maxStamina.value = expectedMax
    }
    hp.value = (data as any).hp ?? BASE_MAX_HP
    baseMaxHp.value = (data as any).baseMaxHp ?? BASE_MAX_HP
    economyTelemetry.value = normalizeEconomyTelemetry((data as any).economyTelemetry)
  }

  return {
    playerName,
    gender,
    needsIdentitySetup,
    honorific,
    money,
    stamina,
    maxStamina,
    staminaCapLevel,
    bonusMaxStamina,
    hp,
    baseMaxHp,
    economyTelemetry,
    isExhausted,
    staminaPercent,
    getMaxHp,
    getHpPercent,
    getIsLowHp,
    consumeStamina,
    restoreStamina,
    takeDamage,
    restoreHealth,
    dailyReset,
    upgradeMaxStamina,
    addBonusMaxStamina,
    spendMoney,
    recordSinkSpend,
    recordEconomyFlow,
    setEconomyRiskReport,
    getRecentEconomySnapshots,
    getRecentNetIncome,
    getRecentAverageNetIncome,
    getInflationPressureIndex,
    getSinkSatisfactionRatio,
    getLoopDiversityScore,
    getDominantIncomeShare,
    getTotalAssetValue,
    getCurrentWealthTier,
    getCurrentEconomySegment,
    getEconomyOverview,
    appendEconomySnapshot,
    earnMoney,
    setMoney,
    setIdentity,
    serialize,
    deserialize
  }
})
