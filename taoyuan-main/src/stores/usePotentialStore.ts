import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  CONNECTED_POTENTIAL_EFFECT_KEYS,
  POTENTIAL_BRANCH_DEFS,
  POTENTIAL_EFFECT_VALUES,
  POTENTIAL_NODE_DEF_BY_ID,
  POTENTIAL_NODE_DEFS,
  POTENTIAL_RESOURCE_DEFS,
  POTENTIAL_SOURCE_RULE_BY_ID,
  getPotentialNodesByBranch
} from '@/data/potential'
import type {
  PotentialBranchId,
  PotentialBranchRespecRecord,
  PotentialEffectKey,
  PotentialNodeDef,
  PotentialNodeId,
  PotentialResourceCost,
  PotentialResourceId,
  PotentialSaveData,
  PotentialSourceCapProgress,
  PotentialSourceId,
  PotentialSourceReceipt
} from '@/types/potential'
import { useGameStore } from './useGameStore'
import { useNpcStore } from './useNpcStore'
import { useSkillStore } from './useSkillStore'

const POTENTIAL_MAX_RESOURCE_AMOUNT = 9999
const POTENTIAL_REFUND_RATE = 0.8

const clampInteger = (value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number => {
  const number = Math.floor(Number(value))
  if (!Number.isFinite(number)) return min
  return Math.min(max, Math.max(min, number))
}

const createDefaultResourceState = (): Record<PotentialResourceId, number> =>
  Object.fromEntries(POTENTIAL_RESOURCE_DEFS.map(resource => [resource.id, 0])) as Record<PotentialResourceId, number>

const createDefaultNodeRanks = (): Record<PotentialNodeId, number> =>
  Object.fromEntries(POTENTIAL_NODE_DEFS.map(node => [node.id, 0])) as Record<PotentialNodeId, number>

const normalizeCostList = (costs: PotentialResourceCost[]): PotentialResourceCost[] =>
  costs
    .map(cost => ({
      resourceId: cost.resourceId,
      amount: clampInteger(cost.amount)
    }))
    .filter(cost => POTENTIAL_RESOURCE_DEFS.some(resource => resource.id === cost.resourceId) && cost.amount > 0)

const mergeCosts = (entries: PotentialResourceCost[]): PotentialResourceCost[] => {
  const merged = createDefaultResourceState()
  for (const entry of entries) {
    merged[entry.resourceId] += clampInteger(entry.amount)
  }
  return Object.entries(merged)
    .map(([resourceId, amount]) => ({ resourceId: resourceId as PotentialResourceId, amount }))
    .filter(entry => entry.amount > 0)
}

const subtractCosts = (base: PotentialResourceCost[], subtract: PotentialResourceCost[]): PotentialResourceCost[] => {
  const merged = createDefaultResourceState()
  for (const entry of base) merged[entry.resourceId] += clampInteger(entry.amount)
  for (const entry of subtract) merged[entry.resourceId] -= clampInteger(entry.amount)
  return Object.entries(merged)
    .map(([resourceId, amount]) => ({ resourceId: resourceId as PotentialResourceId, amount: Math.max(0, amount) }))
    .filter(entry => entry.amount > 0)
}

const getBranchLabel = (branchId: PotentialBranchId): string =>
  POTENTIAL_BRANCH_DEFS.find(branch => branch.id === branchId)?.label ?? branchId

export const usePotentialStore = defineStore('potential', () => {
  const resources = ref<Record<PotentialResourceId, number>>(createDefaultResourceState())
  const nodeRanks = ref<Record<PotentialNodeId, number>>(createDefaultNodeRanks())
  const sourceReceipts = ref<Record<string, PotentialSourceReceipt>>({})
  const sourceCapProgress = ref<Partial<Record<PotentialSourceId, PotentialSourceCapProgress>>>({})
  const branchRespecUsedSeasonKeys = ref<Partial<Record<PotentialBranchId, string[]>>>({})
  const branchRespecRecords = ref<PotentialBranchRespecRecord[]>([])
  const potentialMigrationLogs = ref<string[]>([])

  const totalRank = computed(() => Object.values(nodeRanks.value).reduce((sum, rank) => sum + rank, 0))

  const getBranchRank = (branchId: PotentialBranchId): number =>
    getPotentialNodesByBranch(branchId).reduce((sum, node) => sum + (nodeRanks.value[node.id] ?? 0), 0)

  const branchSummaries = computed(() =>
    POTENTIAL_BRANCH_DEFS.map(branch => ({
      ...branch,
      rank: getBranchRank(branch.id),
      maxRank: getPotentialNodesByBranch(branch.id).reduce((sum, node) => sum + node.maxRank, 0)
    }))
  )

  const getNodeRank = (nodeId: PotentialNodeId): number => nodeRanks.value[nodeId] ?? 0

  const getNodeDef = (nodeId: PotentialNodeId): PotentialNodeDef | undefined => POTENTIAL_NODE_DEF_BY_ID.get(nodeId)

  const getBranchNodes = (branchId: PotentialBranchId): readonly PotentialNodeDef[] => getPotentialNodesByBranch(branchId)

  const getPotentialResource = (resourceId: PotentialResourceId): number => resources.value[resourceId] ?? 0

  const getCurrentDailyPeriodKey = (): string => {
    const gameStore = useGameStore()
    return `y${gameStore.year}-${gameStore.season}-d${gameStore.day}`
  }

  const getCurrentWeeklyPeriodKey = (): string => {
    const gameStore = useGameStore()
    const week = Math.max(1, Math.ceil(gameStore.day / 7))
    return `y${gameStore.year}-${gameStore.season}-w${week}`
  }

  const getCurrentSeasonKey = (): string => {
    const gameStore = useGameStore()
    return `y${gameStore.year}-${gameStore.season}`
  }

  const getPeriodKeyForSource = (sourceId: PotentialSourceId, override?: string): string => {
    if (override) return override
    const rule = POTENTIAL_SOURCE_RULE_BY_ID.get(sourceId)
    if (rule?.cap.period === 'seasonal') return getCurrentSeasonKey()
    if (rule?.cap.period === 'weekly') return getCurrentWeeklyPeriodKey()
    return getCurrentDailyPeriodKey()
  }

  const addPotentialResource = (resourceId: PotentialResourceId, amount: number): number => {
    if (!POTENTIAL_RESOURCE_DEFS.some(resource => resource.id === resourceId)) return 0
    const normalizedAmount = clampInteger(amount)
    if (normalizedAmount <= 0) return 0
    const before = resources.value[resourceId] ?? 0
    const next = Math.min(POTENTIAL_MAX_RESOURCE_AMOUNT, before + normalizedAmount)
    resources.value[resourceId] = next
    return next - before
  }

  const spendPotentialResources = (costs: PotentialResourceCost[]): boolean => {
    const normalizedCosts = normalizeCostList(costs)
    if (normalizedCosts.some(cost => getPotentialResource(cost.resourceId) < cost.amount)) return false
    for (const cost of normalizedCosts) {
      resources.value[cost.resourceId] = Math.max(0, getPotentialResource(cost.resourceId) - cost.amount)
    }
    return true
  }

  const getNodeNextCost = (nodeId: PotentialNodeId): PotentialResourceCost[] => {
    const node = getNodeDef(nodeId)
    if (!node) return []
    const rank = getNodeRank(nodeId)
    if (rank >= node.maxRank) return []
    return normalizeCostList(node.costsByRank[rank] ?? [])
  }

  const getRandomNpcUnlockConditionProgress = (condition: PotentialNodeDef['unlockConditions'][number]) => {
    if (condition.kind !== 'randomNpcMilestone' || !condition.milestone) return null
    const npcStore = useNpcStore()
    return npcStore.getRandomNpcPotentialMilestoneProgress(condition.milestone, condition.value)
  }

  const isUnlockConditionMet = (condition: PotentialNodeDef['unlockConditions'][number]): boolean => {
    if (condition.kind === 'branchRank') return getBranchRank(condition.branchId ?? 'body') >= condition.value
    if (condition.kind === 'totalRank') return totalRank.value >= condition.value
    if (condition.kind === 'randomNpcMilestone') return getRandomNpcUnlockConditionProgress(condition)?.ready ?? false
    if (condition.kind === 'skillLevel' && condition.skillType) {
      const skillStore = useSkillStore()
      const skill = skillStore.skills.find(entry => entry.type === condition.skillType)
      return (skill?.level ?? 0) >= condition.value
    }
    if (condition.kind === 'masteryNode' && condition.nodeId) {
      const skillStore = useSkillStore()
      return condition.value <= 0 || skillStore.hasSkillMasteryNode(condition.nodeId as any)
    }
    return true
  }

  const getUnlockConditionDisplay = (condition: PotentialNodeDef['unlockConditions'][number]): string => {
    const randomNpcProgress = getRandomNpcUnlockConditionProgress(condition)
    if (!randomNpcProgress) return condition.label
    const current = Math.min(randomNpcProgress.current, randomNpcProgress.target)
    if (randomNpcProgress.ready) return `${condition.label}（当前 ${current}/${randomNpcProgress.target}）`
    return `${condition.label}（当前 ${current}/${randomNpcProgress.target}，${randomNpcProgress.hint}）`
  }

  const getPotentialNodeUpgradeReason = (nodeId: PotentialNodeId): string => {
    const node = getNodeDef(nodeId)
    if (!node) return '没有找到这项潜能。'
    const rank = getNodeRank(nodeId)
    if (rank >= node.maxRank) return '已经修满。'
    if (!node.firstVersionConnected) return '这项潜能暂未开放。'
    const unmet = node.unlockConditions.find(condition => !isUnlockConditionMet(condition))
    if (unmet) return getUnlockConditionDisplay(unmet)
    const missing = getNodeNextCost(node.id).find(cost => getPotentialResource(cost.resourceId) < cost.amount)
    if (missing) {
      const resourceLabel = POTENTIAL_RESOURCE_DEFS.find(resource => resource.id === missing.resourceId)?.label ?? missing.resourceId
      return `${resourceLabel}不足。`
    }
    return ''
  }

  const canUpgradePotentialNode = (nodeId: PotentialNodeId): boolean => getPotentialNodeUpgradeReason(nodeId) === ''

  const upgradePotentialNode = (nodeId: PotentialNodeId): { success: boolean; message: string } => {
    const node = getNodeDef(nodeId)
    if (!node) return { success: false, message: '没有找到这项潜能。' }
    const reason = getPotentialNodeUpgradeReason(nodeId)
    if (reason) return { success: false, message: reason }
    if (!spendPotentialResources(getNodeNextCost(nodeId))) return { success: false, message: '材料不足。' }
    nodeRanks.value[nodeId] = Math.min(node.maxRank, getNodeRank(nodeId) + 1)
    return { success: true, message: `${getBranchLabel(node.branchId)}·${node.label}提升到 ${nodeRanks.value[nodeId]}/${node.maxRank}。` }
  }

  const getPotentialEffectValue = (effectKey: PotentialEffectKey): number => {
    const effect = POTENTIAL_EFFECT_VALUES[effectKey]
    if (!effect) return 0
    let value = 0
    for (const node of POTENTIAL_NODE_DEFS) {
      if (node.effectKey !== effectKey) continue
      const rank = getNodeRank(node.id)
      if (rank <= 0) continue
      value += effect.valuePerRank * rank
    }
    if (effect.unit === 'switch') return value > 0 ? 1 : 0
    return Math.min(effect.cap, Math.max(0, value))
  }

  const connectedEffectSummary = computed(() =>
    Array.from(CONNECTED_POTENTIAL_EFFECT_KEYS)
      .map(effectKey => {
        const effect = POTENTIAL_EFFECT_VALUES[effectKey]
        const value = getPotentialEffectValue(effectKey)
        return { effect, value }
      })
      .filter(entry => entry.value > 0)
  )

  const getPotentialSourceProgress = (sourceId: PotentialSourceId) => {
    const rule = POTENTIAL_SOURCE_RULE_BY_ID.get(sourceId)
    if (!rule) {
      return {
        periodKey: '',
        claims: 0,
        maxClaims: 0,
        percent: 0
      }
    }
    const periodKey = getPeriodKeyForSource(sourceId)
    const progress = sourceCapProgress.value[sourceId]
    const claims = progress?.periodKey === periodKey ? clampInteger(progress.claims, 0, rule.cap.maxClaims) : 0
    return {
      periodKey,
      claims,
      maxClaims: rule.cap.maxClaims,
      percent: rule.cap.maxClaims > 0 ? Math.min(100, Math.round((claims / rule.cap.maxClaims) * 100)) : 0
    }
  }

  const claimPotentialSourceReward = (
    sourceId: PotentialSourceId,
    eventKey: string,
    options: { periodKey?: string; reason?: string; createdAt?: string } = {}
  ): { success: boolean; rewards: PotentialResourceCost[]; message: string } => {
    const rule = POTENTIAL_SOURCE_RULE_BY_ID.get(sourceId)
    if (!rule) return { success: false, rewards: [], message: '没有找到这类潜能来源。' }
    const normalizedEventKey = String(eventKey || '').trim()
    if (!normalizedEventKey) return { success: false, rewards: [], message: '缺少结算凭据。' }
    const periodKey = getPeriodKeyForSource(sourceId, options.periodKey)
    const receiptId = `${sourceId}:${periodKey}:${normalizedEventKey}`
    if (sourceReceipts.value[receiptId]) return { success: false, rewards: [], message: '这次结算已经领取过潜能材料。' }

    const progress = sourceCapProgress.value[sourceId]
    const currentProgress: PotentialSourceCapProgress =
      progress?.periodKey === periodKey
        ? {
            periodKey,
            claims: clampInteger(progress.claims),
            resourceAmounts: { ...(progress.resourceAmounts ?? {}) }
          }
        : {
            periodKey,
            claims: 0,
            resourceAmounts: {}
          }

    if (currentProgress.claims >= rule.cap.maxClaims) {
      return { success: false, rewards: [], message: `${rule.label}本期潜能材料已达上限。` }
    }

    const granted: PotentialResourceCost[] = []
    for (const reward of rule.rewards) {
      const used = clampInteger(currentProgress.resourceAmounts[reward.resourceId])
      const remaining = Math.max(0, rule.cap.maxResourceAmount - used)
      const amount = Math.min(remaining, clampInteger(reward.amount))
      if (amount <= 0) continue
      const actual = addPotentialResource(reward.resourceId, amount)
      if (actual <= 0) continue
      currentProgress.resourceAmounts[reward.resourceId] = used + actual
      granted.push({ resourceId: reward.resourceId, amount: actual })
    }

    if (granted.length === 0) return { success: false, rewards: [], message: `${rule.label}本期材料数量已达上限。` }
    currentProgress.claims += 1
    sourceCapProgress.value[sourceId] = currentProgress
    sourceReceipts.value[receiptId] = {
      id: receiptId,
      sourceId,
      eventKey: normalizedEventKey,
      periodKey,
      rewards: granted,
      reason: options.reason ?? rule.label,
      createdAt: options.createdAt ?? new Date().toISOString()
    }
    return { success: true, rewards: granted, message: `${rule.label}获得潜能材料。` }
  }

  const getBranchSpentCosts = (branchId: PotentialBranchId): PotentialResourceCost[] => {
    const costs: PotentialResourceCost[] = []
    for (const node of getBranchNodes(branchId)) {
      const rank = getNodeRank(node.id)
      for (let index = 0; index < rank; index += 1) {
        costs.push(...normalizeCostList(node.costsByRank[index] ?? []))
      }
    }
    return mergeCosts(costs)
  }

  const isFreeBranchRespecAvailable = (branchId: PotentialBranchId, seasonKey = getCurrentSeasonKey()): boolean =>
    !(branchRespecUsedSeasonKeys.value[branchId] ?? []).includes(seasonKey)

  const getPotentialBranchRefundPreview = (branchId: PotentialBranchId, seasonKey = getCurrentSeasonKey()) => {
    const spent = getBranchSpentCosts(branchId)
    const free = isFreeBranchRespecAvailable(branchId, seasonKey)
    const refunded = spent
      .map(cost => ({
        resourceId: cost.resourceId,
        amount: free ? cost.amount : Math.floor(cost.amount * POTENTIAL_REFUND_RATE)
      }))
      .filter(cost => cost.amount > 0)
    return {
      branchId,
      spent,
      refunded,
      retainedCost: subtractCosts(spent, refunded),
      freeSeasonKey: free ? seasonKey : undefined,
      canRefund: spent.length > 0
    }
  }

  const refundPotentialBranch = (branchId: PotentialBranchId): { success: boolean; message: string; refunded: PotentialResourceCost[] } => {
    const preview = getPotentialBranchRefundPreview(branchId)
    if (!preview.canRefund) return { success: false, message: `${getBranchLabel(branchId)}还没有可重修的潜能。`, refunded: [] }
    for (const cost of preview.refunded) addPotentialResource(cost.resourceId, cost.amount)
    for (const node of getBranchNodes(branchId)) nodeRanks.value[node.id] = 0
    if (preview.freeSeasonKey) {
      branchRespecUsedSeasonKeys.value[branchId] = [...(branchRespecUsedSeasonKeys.value[branchId] ?? []), preview.freeSeasonKey]
    }
    const record: PotentialBranchRespecRecord = {
      id: `${branchId}:${Date.now()}:${branchRespecRecords.value.length}`,
      branchId,
      refunded: preview.refunded,
      retainedCost: preview.retainedCost,
      createdAt: new Date().toISOString(),
      freeSeasonKey: preview.freeSeasonKey
    }
    branchRespecRecords.value = [record, ...branchRespecRecords.value].slice(0, 20)
    return {
      success: true,
      message: `${getBranchLabel(branchId)}已重修，返还大部分材料。`,
      refunded: preview.refunded
    }
  }

  const serialize = (): PotentialSaveData => ({
    resources: { ...resources.value },
    nodeRanks: { ...nodeRanks.value },
    sourceReceipts: Object.fromEntries(Object.entries(sourceReceipts.value).map(([id, receipt]) => [id, { ...receipt, rewards: [...receipt.rewards] }])),
    sourceCapProgress: Object.fromEntries(
      Object.entries(sourceCapProgress.value).map(([sourceId, progress]) => [
        sourceId,
        {
          periodKey: progress?.periodKey ?? '',
          claims: clampInteger(progress?.claims),
          resourceAmounts: { ...(progress?.resourceAmounts ?? {}) }
        }
      ])
    ),
    branchRespecUsedSeasonKeys: Object.fromEntries(
      Object.entries(branchRespecUsedSeasonKeys.value).map(([branchId, keys]) => [branchId, Array.isArray(keys) ? [...new Set(keys)] : []])
    ),
    branchRespecRecords: branchRespecRecords.value.map(record => ({
      ...record,
      refunded: [...record.refunded],
      retainedCost: [...record.retainedCost]
    })),
    potentialMigrationLogs: [...potentialMigrationLogs.value]
  })

  const deserialize = (data?: Partial<PotentialSaveData> | null) => {
    potentialMigrationLogs.value = []
    const nextResources = createDefaultResourceState()
    for (const resource of POTENTIAL_RESOURCE_DEFS) {
      const rawAmount = data?.resources?.[resource.id]
      const normalized = clampInteger(rawAmount, 0, POTENTIAL_MAX_RESOURCE_AMOUNT)
      if (rawAmount !== undefined && rawAmount !== normalized) {
        potentialMigrationLogs.value.push(`${resource.label}数量已修正。`)
      }
      nextResources[resource.id] = normalized
    }
    resources.value = nextResources

    const nextRanks = createDefaultNodeRanks()
    for (const node of POTENTIAL_NODE_DEFS) {
      const rawRank = data?.nodeRanks?.[node.id]
      const normalized = clampInteger(rawRank, 0, node.maxRank)
      if (rawRank !== undefined && rawRank !== normalized) {
        potentialMigrationLogs.value.push(`${node.label}阶数已修正。`)
      }
      nextRanks[node.id] = normalized
    }
    if (data?.nodeRanks && typeof data.nodeRanks === 'object') {
      for (const nodeId of Object.keys(data.nodeRanks)) {
        if (!POTENTIAL_NODE_DEF_BY_ID.has(nodeId as PotentialNodeId)) {
          potentialMigrationLogs.value.push(`移除无效潜能节点 ${nodeId}。`)
        }
      }
    }
    nodeRanks.value = nextRanks

    const nextReceipts: Record<string, PotentialSourceReceipt> = {}
    for (const [id, receipt] of Object.entries(data?.sourceReceipts ?? {})) {
      if (!receipt || typeof receipt !== 'object') continue
      if (!POTENTIAL_SOURCE_RULE_BY_ID.has(receipt.sourceId)) continue
      const rewards = normalizeCostList(Array.isArray(receipt.rewards) ? receipt.rewards : [])
      nextReceipts[id] = {
        id,
        sourceId: receipt.sourceId,
        eventKey: typeof receipt.eventKey === 'string' ? receipt.eventKey : '',
        periodKey: typeof receipt.periodKey === 'string' ? receipt.periodKey : '',
        rewards,
        reason: typeof receipt.reason === 'string' ? receipt.reason : '',
        createdAt: typeof receipt.createdAt === 'string' ? receipt.createdAt : ''
      }
    }
    sourceReceipts.value = nextReceipts

    const nextCapProgress: Partial<Record<PotentialSourceId, PotentialSourceCapProgress>> = {}
    for (const [sourceId, progress] of Object.entries(data?.sourceCapProgress ?? {})) {
      if (!POTENTIAL_SOURCE_RULE_BY_ID.has(sourceId as PotentialSourceId) || !progress || typeof progress !== 'object') continue
      const resourceAmounts: Partial<Record<PotentialResourceId, number>> = {}
      for (const resource of POTENTIAL_RESOURCE_DEFS) {
        resourceAmounts[resource.id] = clampInteger(progress.resourceAmounts?.[resource.id])
      }
      nextCapProgress[sourceId as PotentialSourceId] = {
        periodKey: typeof progress.periodKey === 'string' ? progress.periodKey : '',
        claims: clampInteger(progress.claims),
        resourceAmounts
      }
    }
    sourceCapProgress.value = nextCapProgress

    branchRespecUsedSeasonKeys.value = Object.fromEntries(
      POTENTIAL_BRANCH_DEFS.map(branch => [
        branch.id,
        [...new Set((data?.branchRespecUsedSeasonKeys?.[branch.id] ?? []).filter((key): key is string => typeof key === 'string'))]
      ])
    )

    branchRespecRecords.value = Array.isArray(data?.branchRespecRecords)
      ? data.branchRespecRecords
          .filter(record => record && POTENTIAL_BRANCH_DEFS.some(branch => branch.id === record.branchId))
          .map(record => ({
            id: typeof record.id === 'string' ? record.id : `${record.branchId}:${Date.now()}`,
            branchId: record.branchId,
            refunded: normalizeCostList(record.refunded ?? []),
            retainedCost: normalizeCostList(record.retainedCost ?? []),
            createdAt: typeof record.createdAt === 'string' ? record.createdAt : '',
            freeSeasonKey: typeof record.freeSeasonKey === 'string' ? record.freeSeasonKey : undefined
          }))
          .slice(0, 20)
      : []
  }

  return {
    resources,
    nodeRanks,
    sourceReceipts,
    sourceCapProgress,
    branchRespecUsedSeasonKeys,
    branchRespecRecords,
    potentialMigrationLogs,
    totalRank,
    branchSummaries,
    connectedEffectSummary,
    getBranchRank,
    getNodeRank,
    getNodeDef,
    getBranchNodes,
    getPotentialResource,
    getNodeNextCost,
    getPotentialSourceProgress,
    addPotentialResource,
    spendPotentialResources,
    canUpgradePotentialNode,
    getPotentialNodeUpgradeReason,
    upgradePotentialNode,
    getPotentialEffectValue,
    claimPotentialSourceReward,
    getBranchSpentCosts,
    isFreeBranchRespecAvailable,
    getPotentialBranchRefundPreview,
    refundPotentialBranch,
    serialize,
    deserialize
  }
})
