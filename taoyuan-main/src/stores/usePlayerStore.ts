import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getItemById } from '@/data'
import type { EconomySinkCategory, EconomySystemKey, EconomyTelemetryState, Gender, InventoryItem, QaGovernanceRuntimeState, WealthTierAssessment } from '@/types'
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
import {
  WS12_AUTOMATED_REGRESSION_SUITES,
  WS12_COMPENSATION_MAIL_PRESETS,
  WS12_QA_GOVERNANCE_BASELINE_AUDIT,
  WS12_QA_GOVERNANCE_CONTENT_TIERS,
  WS12_QA_GOVERNANCE_FEATURE_FLAGS,
  WS12_QA_GOVERNANCE_TUNING_CONFIG,
  WS12_SAVE_MIGRATION_PROFILES,
  createDefaultQaGovernanceRuntimeState
} from '@/data/goals'
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
const normalizeNonNegativeInteger = (value: unknown, fallback = 0) => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return Math.max(0, Math.floor(fallback))
  return Math.max(0, Math.floor(numericValue))
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
  const temporaryFoodMaxStaminaBonus = ref(0)

  // HP 系统
  const hp = ref(BASE_MAX_HP)
  const baseMaxHp = ref(BASE_MAX_HP)
  const economyTelemetry = ref<EconomyTelemetryState>(createEmptyEconomyTelemetry())
  const qaGovernanceRuntimeState = ref<QaGovernanceRuntimeState>(createDefaultQaGovernanceRuntimeState())
  const qaGovernanceActionLocks = ref<string[]>([])
  const qaGovernanceTuning = WS12_QA_GOVERNANCE_TUNING_CONFIG

  const isExhausted = computed(() => stamina.value <= 5)
  const staminaPercent = computed(() => Math.round((stamina.value / Math.max(1, maxStamina.value)) * 100))
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

  const recomputeMaxStamina = () => {
    maxStamina.value = (STAMINA_CAPS[staminaCapLevel.value] ?? 120) + bonusMaxStamina.value + temporaryFoodMaxStaminaBonus.value
    stamina.value = Math.min(Math.max(0, stamina.value), maxStamina.value)
  }

  /** 消耗体力（含仙缘灵护减免），返回是否成功 */
  const consumeStamina = (amount: number): boolean => {
    const normalizedAmount = Number(amount)
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) return true
    // 仙缘结缘：灵护（spirit_shield）体力消耗减免
    const spiritShield2 = useHiddenNpcStore().getBondBonusByType('spirit_shield')
    const spiritSave = spiritShield2?.type === 'spirit_shield' ? spiritShield2.staminaSave / 100 : 0
    const effectiveAmount = Math.max(1, Math.floor(normalizedAmount * (1 - spiritSave)))
    if (stamina.value < effectiveAmount) return false
    stamina.value -= effectiveAmount
    return true
  }

  /** 恢复体力 */
  const restoreStamina = (amount: number) => {
    const normalizedAmount = normalizeNonNegativeInteger(amount)
    if (normalizedAmount <= 0) return
    stamina.value = Math.min(stamina.value + normalizedAmount, maxStamina.value)
  }

  /** 受到伤害（扣 HP），返回实际伤害值 */
  const takeDamage = (amount: number): number => {
    const normalizedAmount = normalizeNonNegativeInteger(amount)
    if (normalizedAmount <= 0) return 0
    const actual = Math.min(normalizedAmount, hp.value)
    hp.value -= actual
    return actual
  }

  /** 恢复生命值 */
  const restoreHealth = (amount: number) => {
    const normalizedAmount = normalizeNonNegativeInteger(amount)
    if (normalizedAmount <= 0) return
    hp.value = Math.min(hp.value + normalizedAmount, getMaxHp())
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
    let appliedRecoveryPct = 1
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
        appliedRecoveryPct = Math.min(recoveryPct, 1)
        stamina.value = Math.floor(maxStamina.value * appliedRecoveryPct)
        break
      }
      case 'passout': {
        const homeStore2 = useHomeStore()
        const staminaBonus2 = homeStore2.getStaminaRecoveryBonus()
        const villageBonus2 = useVillageProjectStore().getDailyRecoveryBonus()
        recoveryPct = PASSOUT_STAMINA_RECOVERY + staminaBonus2 + villageBonus2
        appliedRecoveryPct = Math.min(recoveryPct, 1)
        stamina.value = Math.floor(maxStamina.value * appliedRecoveryPct)
        moneyLost = Math.min(Math.floor(money.value * PASSOUT_MONEY_PENALTY_RATE), PASSOUT_MONEY_PENALTY_CAP)
        money.value -= moneyLost
        recordEconomyFlow('expense', moneyLost, 'system')
        break
      }
    }
    // HP 每天都回满
    hp.value = getMaxHp()
    return { moneyLost, recoveryPct: appliedRecoveryPct }
  }

  /** 提升体力上限 */
  const upgradeMaxStamina = (): boolean => {
    if (staminaCapLevel.value >= STAMINA_CAPS.length - 1) return false
    staminaCapLevel.value++
    recomputeMaxStamina()
    return true
  }

  /** 增加额外体力上限加成（仙翁金丹等） */
  const addBonusMaxStamina = (amount: number) => {
    bonusMaxStamina.value += amount
    recomputeMaxStamina()
  }

  const setTemporaryFoodMaxStaminaBonus = (amount: number) => {
    temporaryFoodMaxStaminaBonus.value = normalizeNonNegativeInteger(amount)
    recomputeMaxStamina()
  }

  /** 花费铜钱，返回是否成功 */
  const spendMoney = (amount: number, system: EconomySystemKey = 'system'): boolean => {
    const rawAmount = Number(amount)
    if (!Number.isFinite(rawAmount) || rawAmount < 0) return false
    const normalizedAmount = normalizeNonNegativeInteger(amount)
    if (normalizedAmount <= 0) return true
    if (money.value < normalizedAmount) return false
    money.value -= normalizedAmount
    economyTelemetry.value.lifetimeExpense.total += normalizedAmount
    economyTelemetry.value.lifetimeExpense.bySystem[system] = (economyTelemetry.value.lifetimeExpense.bySystem[system] ?? 0) + normalizedAmount
    return true
  }

  const recordSinkSpend = (amount: number, category: EconomySinkCategory) => {
    const normalizedAmount = normalizeNonNegativeInteger(amount)
    if (normalizedAmount <= 0) return
    economyTelemetry.value.lifetimeSinkSpend.total += normalizedAmount
    economyTelemetry.value.lifetimeSinkSpend.byCategory[category] = (economyTelemetry.value.lifetimeSinkSpend.byCategory[category] ?? 0) + normalizedAmount
  }

  const recordEconomyFlow = (kind: EconomyFlowKind, amount: number, system: EconomySystemKey) => {
    const normalizedAmount = normalizeNonNegativeInteger(amount)
    if (normalizedAmount <= 0) return
    const bucket = kind === 'income' ? economyTelemetry.value.lifetimeIncome : economyTelemetry.value.lifetimeExpense
    bucket.total += normalizedAmount
    bucket.bySystem[system] = (bucket.bySystem[system] ?? 0) + normalizedAmount
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

  const qaGovernanceBaselineAudit = WS12_QA_GOVERNANCE_BASELINE_AUDIT
  const qaGovernanceOverview = computed(() => {
    const overview = getEconomyOverview()
    const recentSnapshots = getRecentEconomySnapshots(14)
    const activeIncomeSystems = Object.keys(economyTelemetry.value.lifetimeIncome.bySystem)
    const activeExpenseSystems = Object.keys(economyTelemetry.value.lifetimeExpense.bySystem)
    return {
      baselineAudit: qaGovernanceBaselineAudit,
      featureFlags: WS12_QA_GOVERNANCE_FEATURE_FLAGS,
      contentTiers: WS12_QA_GOVERNANCE_CONTENT_TIERS,
      tuning: qaGovernanceTuning,
      runtimeState: qaGovernanceRuntimeState.value,
      regressionSuiteCount: WS12_AUTOMATED_REGRESSION_SUITES.length,
      compensationPresetCount: WS12_COMPENSATION_MAIL_PRESETS.length,
      activeGovernanceLockCount: qaGovernanceActionLocks.value.length,
      telemetrySaveVersion: economyTelemetry.value.saveVersion,
      lastAuditDayTag: economyTelemetry.value.lastAuditDayTag,
      recentSnapshotCount: recentSnapshots.length,
      latestRiskLevel: economyTelemetry.value.latestRiskReport?.level ?? 'healthy',
      latestRiskSummary: economyTelemetry.value.latestRiskReport?.summary ?? '',
      currentSegmentId: overview.currentSegment?.id ?? null,
      guardrailNetInflowRatio: overview.guardrailNetInflowRatio,
      sinkCoverage: overview.sinkCoverage,
      activeIncomeSystems,
      activeExpenseSystems
    }
  })

  const getQaGovernanceDebugSnapshot = () => ({
    featureFlags: WS12_QA_GOVERNANCE_FEATURE_FLAGS,
    contentTierIds: WS12_QA_GOVERNANCE_CONTENT_TIERS.map(tier => tier.id),
    runtimeState: { ...qaGovernanceRuntimeState.value },
    activeLockIds: [...qaGovernanceActionLocks.value],
    telemetrySaveVersion: economyTelemetry.value.saveVersion,
    lastAuditDayTag: economyTelemetry.value.lastAuditDayTag,
    recentSnapshotCount: economyTelemetry.value.recentSnapshots.length,
    latestRiskReport: economyTelemetry.value.latestRiskReport,
    currentSegmentId: economyTelemetry.value.currentSegmentId,
    lifetimeIncomeSystems: Object.keys(economyTelemetry.value.lifetimeIncome.bySystem),
    lifetimeExpenseSystems: Object.keys(economyTelemetry.value.lifetimeExpense.bySystem),
    lifetimeSinkCategories: Object.keys(economyTelemetry.value.lifetimeSinkSpend.byCategory)
  })

  const getQaGovernanceMigrationProfile = () =>
    WS12_SAVE_MIGRATION_PROFILES.find(profile => profile.id === qaGovernanceRuntimeState.value.activeMigrationProfileId) ??
    WS12_SAVE_MIGRATION_PROFILES[0] ??
    null

  const createQaGovernanceRuntimeSnapshot = (): QaGovernanceRuntimeState => ({
    ...qaGovernanceRuntimeState.value,
    completedRegressionSuiteIds: [...qaGovernanceRuntimeState.value.completedRegressionSuiteIds],
    claimedCompensationMailIds: [...qaGovernanceRuntimeState.value.claimedCompensationMailIds]
  })

  const rollbackQaGovernanceRuntime = (snapshot: QaGovernanceRuntimeState) => {
    qaGovernanceRuntimeState.value = snapshot
  }

  const beginQaGovernanceAction = (lockId: string) => {
    if (qaGovernanceActionLocks.value.includes(lockId)) return false
    qaGovernanceActionLocks.value = [...qaGovernanceActionLocks.value, lockId]
    return true
  }

  const finishQaGovernanceAction = (lockId: string) => {
    qaGovernanceActionLocks.value = qaGovernanceActionLocks.value.filter(id => id !== lockId)
  }

  const setQaGovernanceMigrationProfile = (profileId: string) => {
    const lockId = `qa_migration_profile_${profileId}`
    if (!beginQaGovernanceAction(lockId)) return false
    const snapshot = createQaGovernanceRuntimeSnapshot()
    try {
      const profile = WS12_SAVE_MIGRATION_PROFILES.find(entry => entry.id === profileId)
      if (!profile) return false
      qaGovernanceRuntimeState.value.activeMigrationProfileId = profile.id
      return true
    } catch {
      rollbackQaGovernanceRuntime(snapshot)
      return false
    } finally {
      finishQaGovernanceAction(lockId)
    }
  }

  const setQaGovernanceGrayReleaseChannel = (channel: QaGovernanceRuntimeState['activeGrayReleaseChannel']) => {
    const nextChannel = channel === 'canary' ? 'canary' : 'stable'
    const lockId = `qa_gray_release_${nextChannel}`
    if (!beginQaGovernanceAction(lockId)) return qaGovernanceRuntimeState.value.activeGrayReleaseChannel
    const snapshot = createQaGovernanceRuntimeSnapshot()
    try {
      qaGovernanceRuntimeState.value.activeGrayReleaseChannel = nextChannel
      return qaGovernanceRuntimeState.value.activeGrayReleaseChannel
    } catch {
      rollbackQaGovernanceRuntime(snapshot)
      return snapshot.activeGrayReleaseChannel
    } finally {
      finishQaGovernanceAction(lockId)
    }
  }

  const recordQaGovernanceRollbackTrigger = (count = 1) => {
    const lockId = 'qa_record_rollback'
    if (!beginQaGovernanceAction(lockId)) return qaGovernanceRuntimeState.value.rollbackTriggerCount
    const snapshot = createQaGovernanceRuntimeSnapshot()
    try {
      qaGovernanceRuntimeState.value.rollbackTriggerCount += Math.max(0, Math.floor(count))
      return qaGovernanceRuntimeState.value.rollbackTriggerCount
    } catch {
      rollbackQaGovernanceRuntime(snapshot)
      return snapshot.rollbackTriggerCount
    } finally {
      finishQaGovernanceAction(lockId)
    }
  }

  const recordQaGovernanceHotfixIncident = (count = 1) => {
    const lockId = 'qa_record_hotfix'
    if (!beginQaGovernanceAction(lockId)) return qaGovernanceRuntimeState.value.postReleaseHotfixCount
    const snapshot = createQaGovernanceRuntimeSnapshot()
    try {
      qaGovernanceRuntimeState.value.postReleaseHotfixCount += Math.max(0, Math.floor(count))
      return qaGovernanceRuntimeState.value.postReleaseHotfixCount
    } catch {
      rollbackQaGovernanceRuntime(snapshot)
      return snapshot.postReleaseHotfixCount
    } finally {
      finishQaGovernanceAction(lockId)
    }
  }

  const markQaGovernanceRegressionSuiteCompleted = (suiteId: string, dayTag = economyTelemetry.value.lastAuditDayTag) => {
    const lockId = `qa_regression_${suiteId}`
    if (!beginQaGovernanceAction(lockId)) return false
    const snapshot = createQaGovernanceRuntimeSnapshot()
    try {
      if (!WS12_AUTOMATED_REGRESSION_SUITES.some(suite => suite.id === suiteId)) return false
      if (!qaGovernanceRuntimeState.value.completedRegressionSuiteIds.includes(suiteId)) {
        qaGovernanceRuntimeState.value.completedRegressionSuiteIds = [...qaGovernanceRuntimeState.value.completedRegressionSuiteIds, suiteId]
      }
      qaGovernanceRuntimeState.value.lastCompatibilityAuditDayTag = dayTag
      return true
    } catch {
      rollbackQaGovernanceRuntime(snapshot)
      return false
    } finally {
      finishQaGovernanceAction(lockId)
    }
  }

  const markQaGovernanceCompensationMailClaimed = (presetId: string) => {
    const lockId = `qa_compensation_${presetId}`
    if (!beginQaGovernanceAction(lockId)) return false
    const snapshot = createQaGovernanceRuntimeSnapshot()
    try {
      if (!WS12_COMPENSATION_MAIL_PRESETS.some(preset => preset.id === presetId)) return false
      if (qaGovernanceRuntimeState.value.claimedCompensationMailIds.includes(presetId)) return false
      qaGovernanceRuntimeState.value.claimedCompensationMailIds = [...qaGovernanceRuntimeState.value.claimedCompensationMailIds, presetId]
      return true
    } catch {
      rollbackQaGovernanceRuntime(snapshot)
      return false
    } finally {
      finishQaGovernanceAction(lockId)
    }
  }

  const resetQaGovernanceRuntimeState = () => {
    const lockId = 'qa_reset_runtime'
    if (!beginQaGovernanceAction(lockId)) return
    try {
      qaGovernanceRuntimeState.value = createDefaultQaGovernanceRuntimeState()
    } finally {
      finishQaGovernanceAction(lockId)
    }
  }

  const appendEconomySnapshot = (snapshot: EconomyDailySnapshot) => {
    economyTelemetry.value.lastAuditDayTag = snapshot.dayTag
    economyTelemetry.value.recentSnapshots = [...economyTelemetry.value.recentSnapshots, snapshot].slice(-ECONOMY_RECENT_SNAPSHOT_LIMIT)
  }

  /** 获得铜钱 */
  const earnMoney = (amount: number, options?: { countAsEarned?: boolean; system?: EconomySystemKey }) => {
    const normalizedAmount = normalizeNonNegativeInteger(amount)
    if (normalizedAmount <= 0) return
    money.value += normalizedAmount
    recordEconomyFlow('income', normalizedAmount, options?.system ?? 'system')
    if (options?.countAsEarned ?? true) {
      useAchievementStore().recordMoneyEarned(normalizedAmount)
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

  const normalizeDerivedState = () => {
    const expectedMax = (STAMINA_CAPS[staminaCapLevel.value] ?? 120) + bonusMaxStamina.value + temporaryFoodMaxStaminaBonus.value
    if (maxStamina.value !== expectedMax) {
      maxStamina.value = expectedMax
    }
    stamina.value = Math.min(Math.max(0, stamina.value), maxStamina.value)
    hp.value = Math.min(Math.max(0, hp.value), getMaxHp())
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
      economyTelemetry: normalizeEconomyTelemetry(economyTelemetry.value),
      qaGovernanceRuntimeState: {
        ...qaGovernanceRuntimeState.value,
        completedRegressionSuiteIds: [...qaGovernanceRuntimeState.value.completedRegressionSuiteIds],
        claimedCompensationMailIds: [...qaGovernanceRuntimeState.value.claimedCompensationMailIds]
      }
    }
  }

  const deserialize = (data: ReturnType<typeof serialize>) => {
    const hasIdentity = (data as any).playerName != null
    playerName.value = (data as any).playerName ?? '未命名'
    gender.value = (data as any).gender ?? 'male'
    needsIdentitySetup.value = !hasIdentity
    const rawPlayerName = typeof (data as any).playerName === 'string' ? (data as any).playerName.trim() : ''
    const rawGender = (data as any).gender
    const hasGender = rawGender === 'male' || rawGender === 'female'
    playerName.value = rawPlayerName || playerName.value
    gender.value = hasGender ? rawGender : 'male'
    needsIdentitySetup.value = !(rawPlayerName.length > 0 && hasGender)
    money.value = normalizeNonNegativeInteger(data.money, 500)
    staminaCapLevel.value = Math.min(STAMINA_CAPS.length - 1, normalizeNonNegativeInteger(data.staminaCapLevel, 0))
    bonusMaxStamina.value = normalizeNonNegativeInteger((data as any).bonusMaxStamina ?? 0)
    temporaryFoodMaxStaminaBonus.value = 0
    maxStamina.value = normalizeNonNegativeInteger(data.maxStamina, STAMINA_CAPS[staminaCapLevel.value] ?? 120)
    stamina.value = normalizeNonNegativeInteger(data.stamina, maxStamina.value)
    // 旧存档兼容：如果没有 bonusMaxStamina 字段，从 maxStamina 和 staminaCapLevel 推算
    if ((data as any).bonusMaxStamina == null) {
      const exactCapIndex = STAMINA_CAPS.findIndex(cap => cap === maxStamina.value)
      if (exactCapIndex >= 0) {
        staminaCapLevel.value = exactCapIndex
        bonusMaxStamina.value = 0
      } else {
        const inferredBaseIndex = [...STAMINA_CAPS]
          .map((cap, index) => ({ cap, index }))
          .reverse()
          .find(entry => maxStamina.value >= entry.cap)?.index ?? 0
        staminaCapLevel.value = inferredBaseIndex
        const expectedBase = STAMINA_CAPS[staminaCapLevel.value] ?? 120
        const diff = maxStamina.value - expectedBase
        if (diff > 0) bonusMaxStamina.value = diff
      }
    }
    // 确保 maxStamina 与 staminaCapLevel + bonusMaxStamina 一致（修复旧存档）
    const expectedMax = (STAMINA_CAPS[staminaCapLevel.value] ?? 120) + bonusMaxStamina.value + temporaryFoodMaxStaminaBonus.value
    if (maxStamina.value !== expectedMax) {
      maxStamina.value = expectedMax
    }
    stamina.value = Math.min(stamina.value, maxStamina.value)
    baseMaxHp.value = Math.max(BASE_MAX_HP, normalizeNonNegativeInteger((data as any).baseMaxHp ?? BASE_MAX_HP, BASE_MAX_HP))
    hp.value = Math.max(0, normalizeNonNegativeInteger((data as any).hp ?? BASE_MAX_HP, BASE_MAX_HP))
    economyTelemetry.value = normalizeEconomyTelemetry((data as any).economyTelemetry)
    qaGovernanceRuntimeState.value = (() => {
      const raw = (data as any).qaGovernanceRuntimeState
      const fallback = createDefaultQaGovernanceRuntimeState()
      if (!raw || typeof raw !== 'object') return fallback
      return {
        version: Math.max(1, Number(raw.version) || fallback.version),
        activeMigrationProfileId: typeof raw.activeMigrationProfileId === 'string' ? raw.activeMigrationProfileId : fallback.activeMigrationProfileId,
        activeGrayReleaseChannel: raw.activeGrayReleaseChannel === 'canary' ? 'canary' : 'stable',
        rollbackTriggerCount: Math.max(0, Number(raw.rollbackTriggerCount) || 0),
        postReleaseHotfixCount: Math.max(0, Number(raw.postReleaseHotfixCount) || 0),
        completedRegressionSuiteIds: Array.isArray(raw.completedRegressionSuiteIds)
          ? raw.completedRegressionSuiteIds.filter((id: unknown) => typeof id === 'string')
          : [],
        claimedCompensationMailIds: Array.isArray(raw.claimedCompensationMailIds)
          ? raw.claimedCompensationMailIds.filter((id: unknown) => typeof id === 'string')
          : [],
        lastCompatibilityAuditDayTag: typeof raw.lastCompatibilityAuditDayTag === 'string' ? raw.lastCompatibilityAuditDayTag : ''
      }
    })()
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
    temporaryFoodMaxStaminaBonus,
    hp,
    baseMaxHp,
    economyTelemetry,
    qaGovernanceRuntimeState,
    qaGovernanceActionLocks,
    qaGovernanceTuning,
    qaGovernanceBaselineAudit,
    qaGovernanceOverview,
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
    setTemporaryFoodMaxStaminaBonus,
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
    getQaGovernanceMigrationProfile,
    setQaGovernanceMigrationProfile,
    setQaGovernanceGrayReleaseChannel,
    recordQaGovernanceRollbackTrigger,
    recordQaGovernanceHotfixIncident,
    markQaGovernanceRegressionSuiteCompleted,
    markQaGovernanceCompensationMailClaimed,
    resetQaGovernanceRuntimeState,
    getQaGovernanceDebugSnapshot,
    appendEconomySnapshot,
    earnMoney,
    setMoney,
    setIdentity,
    normalizeDerivedState,
    serialize,
    deserialize
  }
})
