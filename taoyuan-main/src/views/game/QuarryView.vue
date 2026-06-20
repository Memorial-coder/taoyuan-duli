<template>
  <div>
    <div class="mb-3 flex items-center justify-between">
      <h3 class="text-sm text-accent">
        <Mountain :size="14" class="inline" />
        旧采石场
        <span v-if="quarryStore.isNight" class="ml-1 text-[0.5rem] text-warning">夜晚</span>
      </h3>
      <Button class="py-0 px-1" :icon="Map" @click="showMapModal = true" />
    </div>

    <Transition name="panel-fade">
      <div
        v-if="showMapModal"
        class="game-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3"
        @click.self="showMapModal = false"
      >
        <div class="game-panel relative w-full max-w-xs p-4">
          <Button class="absolute right-2 top-2 py-0 px-1" :icon="X" :icon-size="12" @click="showMapModal = false" />
          <p class="mb-2 text-center text-sm text-accent">采石场地形</p>
          <p class="text-center text-xs leading-4 text-muted">
            旧采石场是露天资源场。石头、矿脉、枯木、宝箱和少量裂隙会直接留在场上；清掉空位后，第二天才有机会长出新的资源。
          </p>
          <p class="mt-2 text-center text-[0.625rem] text-muted">{{ currentDayText }}</p>
        </div>
      </div>
    </Transition>

    <div class="mb-4 rounded-xs border border-accent/20 p-3" data-testid="quarry-panel">
      <div class="mb-2 flex items-center justify-between gap-2">
        <p class="text-sm text-accent">
          <Pickaxe :size="14" class="inline" />
          旧采石场
        </p>
        <span class="text-[0.625rem] text-muted">
          {{ quarryStore.isUnlocked ? `${quarryStore.interactableCellCount}/${quarryStore.totalCellCount} 可清理` : '未复开' }}
        </span>
      </div>

      <div v-if="!quarryStore.isUnlocked">
        <p class="mb-2 text-xs leading-4 text-muted">
          村庄工程“旧采石场复开”完成后开放。复开的采石场会每天在空地上慢慢长出可见资源，并露出一条一次性的采石场矿洞。
        </p>
        <div class="flex flex-col gap-1.5">
          <div
            v-for="requirement in quarryUnlockRequirements"
            :key="requirement.id"
            class="flex min-h-8 items-center justify-between gap-2 rounded-xs border border-accent/10 px-2 py-1.5"
          >
            <span class="min-w-0 truncate text-xs" :class="requirement.met ? 'text-success' : 'text-muted'">
              {{ requirement.label }}
            </span>
            <span class="shrink-0 text-[0.625rem]" :class="requirement.met ? 'text-success' : 'text-muted/60'">
              <Check v-if="requirement.met" :size="12" class="inline" />
              <Lock v-else :size="12" class="inline" />
              {{ requirement.current }}/{{ requirement.target }}
            </span>
          </div>
        </div>
      </div>

      <div v-else>
        <div class="mb-2 grid grid-cols-2 gap-1.5">
          <div class="rounded-xs border border-accent/10 px-2 py-1.5">
            <p class="text-[0.625rem] text-muted">采石场规模</p>
            <p class="text-xs text-accent">{{ quarryStore.activeSize }}×{{ quarryStore.activeSize }}</p>
          </div>
          <div class="rounded-xs border border-accent/10 px-2 py-1.5">
            <p class="text-[0.625rem] text-muted">今日生成</p>
            <p class="text-xs text-accent">{{ quarryStore.lastDailySpawnedCount }}/{{ quarryStore.dailySpawnCap }} 格</p>
          </div>
          <div class="rounded-xs border border-accent/10 px-2 py-1.5">
            <p class="text-[0.625rem] text-muted">可清理资源</p>
            <p class="text-xs text-accent">{{ quarryStore.resourceCellCount + quarryStore.monsterCellCount }} 格</p>
          </div>
          <div class="rounded-xs border border-accent/10 px-2 py-1.5">
            <p class="text-[0.625rem] text-muted">稀有点</p>
            <p class="text-xs text-accent">{{ quarryStore.rareCellCount }} 格</p>
          </div>
          <div class="rounded-xs border border-accent/10 px-2 py-1.5">
            <p class="text-[0.625rem] text-muted">空地</p>
            <p class="text-xs text-accent">{{ quarryStore.emptyCellCount }} 格</p>
          </div>
          <div class="rounded-xs border border-accent/10 px-2 py-1.5">
            <p class="text-[0.625rem] text-muted">清道维护</p>
            <p class="text-xs" :class="quarryStore.maintenanceActive ? 'text-success' : 'text-muted'">
              {{ quarryStore.maintenanceActive ? '生效 +2' : '未生效' }}
            </p>
          </div>
          <div class="rounded-xs border border-accent/10 px-2 py-1.5">
            <p class="text-[0.625rem] text-muted">周清理进度</p>
            <p class="text-xs text-accent">{{ quarryWeeklyProgressText }}</p>
          </div>
        </div>

        <div
          class="quarry-grid"
          :style="{ gridTemplateColumns: `repeat(${quarryStore.activeSize}, minmax(0, 1fr))` }"
          data-testid="quarry-grid"
          aria-label="旧采石场资源网格"
        >
          <button
            v-for="cell in quarryCells"
            :key="cell.index"
            type="button"
            class="quarry-cell"
            :class="getQuarryCellClass(cell)"
            :disabled="!isCellClickable(cell)"
            :title="getQuarryCellLabel(cell)"
            @click="handleQuarryCellClick(cell)"
          >
            <template v-if="cell.state === 'surface'">
              <span class="quarry-cell-icon quarry-cell-icon--surface">◆</span>
            </template>
            <template v-else-if="cell.state === 'monster'">
              <span class="quarry-cell-icon">!</span>
              <span class="quarry-cell-hp-bar">
                <span class="quarry-cell-hp-fill" :style="{ width: monsterHpPercent(cell) + '%' }" />
              </span>
              <span class="quarry-cell-qty">{{ cell.monsterHp ?? 0 }}</span>
            </template>
            <template v-else-if="isCollectableCell(cell)">
              <span class="quarry-cell-resource-node" :class="getQuarryResourceNodeClass(cell)" aria-hidden="true">
                <span class="quarry-cell-resource-mark">{{ getQuarryResourceMark(cell) }}</span>
              </span>
              <span v-if="(cell.quantity ?? 0) > 1" class="quarry-cell-qty">×{{ cell.quantity ?? 1 }}</span>
            </template>
            <template v-else>
              <span class="quarry-cell-icon quarry-cell-icon--empty">·</span>
            </template>
          </button>
        </div>

        <div v-if="quarryStore.expansionInfo.nextStage" class="mt-3 rounded-xs border border-accent/10 px-2 py-1.5">
          <p class="mb-1 text-[0.625rem] text-muted">
            下一次扩建：{{ quarryStore.activeSize }}×{{ quarryStore.activeSize }} →
            {{ quarryStore.expansionInfo.nextStage.toSize }}×{{ quarryStore.expansionInfo.nextStage.toSize }}
          </p>
          <p class="mb-1 text-[0.5625rem] text-muted">{{ quarryStore.expansionInfo.nextStage.description }}</p>
          <p class="mb-1 text-[0.5625rem] text-muted">
            费用：{{ quarryStore.expansionInfo.nextStage.moneyCost.toLocaleString() }} 文 + 材料
          </p>
          <div v-if="!quarryStore.expansionInfo.canExpand" class="mb-1 flex flex-col gap-0.5">
            <p v-for="(req, ri) in quarryStore.expansionInfo.missingRequirements" :key="ri" class="text-[0.5rem] text-danger">
              ✖ {{ req }}
            </p>
          </div>
          <button class="btn mt-1 text-xs" :disabled="!quarryStore.expansionInfo.canExpand" @click="handleExpand">
            扩建
          </button>
        </div>
        <div v-else-if="quarryStore.activeSize >= 32" class="mt-2 text-[0.625rem] text-muted">
          采石场已达最大规模 32×32。
        </div>

        <p class="mt-2 text-[0.625rem] leading-4 text-muted">
          场上资源不会被新刷覆盖；清理越多，第二天可重新生长的空地越多。每周清理满 {{ quarryWeeklyTarget }} 格可获得采石场管护潜能材料；本周最多 {{ quarryStore.weeklyStewardshipProgress.maxClaims }} 次。
        </p>

        <div class="mt-3 rounded-xs border border-accent/10 px-3 py-2" data-testid="quarry-mine-panel">
          <div class="mb-2 flex items-center justify-between gap-2">
            <p class="text-[0.625rem] text-accent">
              <Mountain :size="12" class="inline" />
              采石场矿洞
            </p>
            <span class="text-[0.5625rem] text-muted">{{ quarryMineStatusText }}</span>
          </div>
          <div class="mb-2 flex items-center justify-between gap-2">
            <p class="text-[0.625rem] text-muted">
              {{ quarryStore.quarryMineStatus.clearedCount }}/{{ quarryStore.quarryMineStatus.totalCount }} 段
            </p>
            <button class="btn px-2 py-1 text-[0.625rem]" :disabled="!quarryStore.quarryMineStatus.canEnter" @click="handleEnterQuarryMine">
              进入
            </button>
          </div>
          <div class="quarry-mine-route">
            <button
              v-for="node in quarryStore.quarryMineStatus.nodes"
              :key="node.index"
              type="button"
              class="quarry-mine-node"
              :class="getQuarryMineNodeClass(node)"
              :disabled="!canResolveQuarryMineNode(node)"
              @click="handleQuarryMineNode(node.index)"
            >
              <span class="quarry-mine-node-mark">{{ getQuarryMineNodeMark(node) }}</span>
              <span class="min-w-0 truncate">{{ node.label }}</span>
            </button>
          </div>
        </div>

        <div class="mt-3 rounded-xs border border-accent/10 px-3 py-2">
          <p class="mb-1 text-[0.625rem] text-muted">采石场日志</p>
          <div class="quarry-log">
            <p v-for="(entry, index) in recentLog" :key="index" :class="index === recentLog.length - 1 ? 'text-text' : 'text-muted'">
              {{ entry }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <Transition name="panel-fade">
      <div
        v-if="quarryStore.inCombat"
        class="game-modal-overlay fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/60 p-4"
        data-testid="quarry-combat-dialog"
      >
        <div class="game-panel w-full max-w-xs">
          <div class="mb-2 flex items-center justify-between">
            <p class="text-sm text-danger">遭遇怪物</p>
            <Button class="py-0 px-1" :icon="X" :icon-size="12" @click="handleCombat('flee')" />
          </div>

          <div class="mining-status-strip mb-3" aria-label="采石场战斗状态">
            <div class="mining-status-item">
              <Clock :size="12" aria-hidden="true" />
              <span class="mining-status-label">时间</span>
              <span class="mining-status-value" :class="hudTimeClass">{{ gameStore.timeDisplay }}</span>
            </div>
            <div class="mining-status-item">
              <Zap :size="12" aria-hidden="true" />
              <span class="mining-status-label">体力</span>
              <span class="mining-status-value" :class="hudStaminaClass">{{ playerStore.stamina }}/{{ playerStore.maxStamina }}</span>
            </div>
            <div class="mining-status-item">
              <Heart :size="12" aria-hidden="true" />
              <span class="mining-status-label">HP</span>
              <span class="mining-status-value" :class="hudHpClass">{{ playerStore.hp }}/{{ playerStore.getMaxHp() }}</span>
            </div>
          </div>

          <div class="mb-2 space-y-0.5 border-b border-accent/20 pb-2 text-xs text-muted">
            <p>
              <Swords :size="12" class="inline" />
              {{ weaponDisplayName }}（{{ weaponTypeName }} · 攻击 {{ weaponAttack }} · 暴击 {{ critRateDisplay }}）
            </p>
            <p v-if="weaponAffixSummary" class="text-success">词条：{{ weaponAffixSummary }}</p>
          </div>

          <div class="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
            <div class="rounded-xs border border-accent/10 p-2">
              <p class="mb-1.5 text-center text-xs">你</p>
              <div class="mb-1 h-1.5 rounded-xs bg-bg">
                <div
                  class="h-1.5 rounded-xs transition-all"
                  :class="playerStore.getIsLowHp() ? 'bg-danger' : 'bg-success'"
                  :style="{ width: `${playerStore.getHpPercent()}%` }"
                />
              </div>
              <p class="text-[0.625rem]" :class="playerStore.getIsLowHp() ? 'text-danger' : 'text-muted'">
                {{ playerStore.hp }}/{{ playerStore.getMaxHp() }}
              </p>
            </div>
            <span class="text-[0.625rem] text-muted/40">VS</span>
            <div class="rounded-xs border border-danger/20 p-2">
              <p class="mb-1.5 truncate text-center text-xs text-danger">{{ quarryStore.combatMonster?.name }}</p>
              <div class="mb-1 h-1.5 rounded-xs bg-bg">
                <div
                  class="h-1.5 rounded-xs bg-danger transition-all"
                  :style="{
                    width: `${quarryStore.combatMonster ? (quarryStore.combatMonsterHp / quarryStore.combatMonster.hp) * 100 : 0}%`
                  }"
                />
              </div>
              <p class="text-[0.625rem] text-muted">
                {{ quarryStore.combatMonsterHp }}/{{ quarryStore.combatMonster?.hp }}
              </p>
            </div>
          </div>

          <div class="mb-3 grid grid-cols-3 gap-1">
            <button class="quarry-combat-action" @click="handleCombat('attack')">
              <span class="text-xs">
                <Swords :size="12" class="inline" />
                攻击
              </span>
              <span class="text-[0.625rem] text-muted">{{ weaponAttack }}攻击力</span>
            </button>
            <button class="quarry-combat-action" @click="handleCombat('defend')">
              <span class="text-xs">
                <Shield :size="12" class="inline" />
                防守
              </span>
              <span class="text-[0.625rem] text-muted">减伤并回气</span>
            </button>
            <button class="quarry-combat-action quarry-combat-action--danger" @click="handleCombat('flee')">
              <span class="text-xs">
                <MoveRight :size="12" class="inline" />
                退开
              </span>
              <span class="text-[0.625rem] text-muted">保留当前进度</span>
            </button>
          </div>

          <div class="quarry-combat-log">
            <p
              v-for="(entry, index) in quarryStore.combatLog"
              :key="index"
              :class="index < quarryStore.combatLog.length - 1 ? 'text-muted' : 'text-text'"
            >
              {{ entry }}
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Mountain, Pickaxe, Map, X, Check, Lock, Clock, Zap, Heart, Swords, Shield, MoveRight } from 'lucide-vue-next'
import Button from '@/components/game/Button.vue'
import { useGameStore } from '@/stores/useGameStore'
import { useInventoryStore } from '@/stores/useInventoryStore'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { useQuarryStore } from '@/stores/useQuarryStore'
import { useSkillStore } from '@/stores/useSkillStore'
import { QUARRY_WEEKLY_STEWARDSHIP_TARGET } from '@/data/quarry'
import { formatForgeAffixSummary } from '@/data/forgeAffixes'
import { ACTION_TIME_COSTS } from '@/data/timeConstants'
import { getWeaponById, getWeaponDisplayName, WEAPON_TYPE_NAMES } from '@/data/weapons'
import type { CombatAction, QuarryCell, QuarryMineNode } from '@/types'
import { sfxMine, sfxAttack, sfxHurt, sfxClick, sfxEncounter, sfxDefend, sfxFlee, sfxVictory } from '@/composables/useAudio'
import { useAudio } from '@/composables/useAudio'
import { addLog, showFloat } from '@/composables/useGameLog'
import { handleEndDay } from '@/composables/useEndDay'
import { useKeyboardShortcutActions } from '@/composables/useKeyboardShortcuts'
import { scrollByViewport, useKeyboardShortcutContextActions } from '@/composables/useKeyboardShortcutContextActions'

const quarryStore = useQuarryStore()
const gameStore = useGameStore()
const inventoryStore = useInventoryStore()
const playerStore = usePlayerStore()
const skillStore = useSkillStore()
const { startBattleBgm, resumeNormalBgm } = useAudio()

const showMapModal = ref(false)
const exploreLog = ref<string[]>([])
const quarryWeeklyTarget = QUARRY_WEEKLY_STEWARDSHIP_TARGET

quarryStore.ensureUnlockedFromProject()

watch(
  () => exploreLog.value.length,
  length => {
    const overflow = length - 16
    if (overflow > 0) exploreLog.value.splice(0, overflow)
  },
  { flush: 'sync' }
)

const pushExploreLog = (message: string, addToGlobal = true) => {
  if (!message) return
  exploreLog.value.push(message)
  if (addToGlobal) addLog(`【旧采石场】${message}`)
}

const currentDayText = computed(() => `第 ${gameStore.year} 年 · 第 ${gameStore.day} 天`)
const quarryUnlockRequirements = computed(() => quarryStore.unlockStatus.requirements)
const quarryCells = computed(() => quarryStore.cells)
const quarryWeeklyProgressText = computed(() => {
  const progress = quarryStore.weeklyStewardshipProgress
  return `${progress.current}/${progress.target} 格`
})
const recentLog = computed(() => exploreLog.value.slice(-8))
const quarryMineStatusText = computed(() => {
  const status = quarryStore.quarryMineStatus
  if (status.finalRewardClaimed) return '奖励已领取'
  if (status.canClaimFinalReward) return '可领取终点奖励'
  if (status.completed) return '抵达终点'
  if (status.enteredToday) return '今日已进入'
  if (status.entered) return '推进中'
  return '未进入'
})

const hudTimeClass = computed(() => (gameStore.isLateNight ? 'text-danger mining-status-critical' : 'text-accent'))
const hudStaminaClass = computed(() => {
  const pct = playerStore.staminaPercent
  if (pct <= 12) return 'text-danger mining-status-critical'
  if (pct <= 35) return 'text-danger'
  if (pct <= 60) return 'text-accent'
  return 'text-success'
})
const hudHpClass = computed(() => {
  const pct = playerStore.getHpPercent()
  if (pct <= 25) return 'text-danger mining-status-critical'
  if (pct <= 60) return 'text-danger'
  return 'text-success'
})

const weaponDisplayName = computed(() => {
  const owned = inventoryStore.getEquippedWeapon()
  return getWeaponDisplayName(owned.defId, owned.enchantmentId, owned.affixes)
})
const weaponTypeName = computed(() => {
  const owned = inventoryStore.getEquippedWeapon()
  const def = getWeaponById(owned.defId)
  return def ? WEAPON_TYPE_NAMES[def.type] : '未知'
})
const weaponAttack = computed(
  () =>
    inventoryStore.getWeaponAttack() +
    skillStore.combatLevel * 2 +
    inventoryStore.getRingEffectValue('attack_bonus')
)
const critRateDisplay = computed(
  () => `${Math.round((inventoryStore.getWeaponCritRate() + inventoryStore.getRingEffectValue('crit_rate_bonus')) * 100)}%`
)
const weaponAffixSummary = computed(() => {
  const owned = inventoryStore.getEquippedWeapon()
  return formatForgeAffixSummary(owned.affixes)
})

const isCollectableCell = (cell: QuarryCell) =>
  cell.state === 'rock' ||
  cell.state === 'ore' ||
  cell.state === 'gem' ||
  cell.state === 'wood' ||
  cell.state === 'deep' ||
  cell.state === 'treasure' ||
  cell.state === 'artifact'

const isCellClickable = (cell: QuarryCell) => cell.state === 'surface' || cell.state === 'monster' || isCollectableCell(cell)

const monsterHpPercent = (cell: QuarryCell) => {
  const max = cell.monsterMaxHp ?? 1
  const current = cell.monsterHp ?? 0
  return Math.max(0, Math.min(100, Math.round((current / max) * 100)))
}

const getQuarryCellLabel = (cell: QuarryCell) => {
  if (cell.state === 'surface') return '深脉石壳（点击凿开）'
  if (cell.state === 'monster') return `怪物（HP: ${cell.monsterHp ?? 0}，点击交战）`
  if (cell.state === 'deep') return '深脉点（高体力消耗，点击收取）'
  if (cell.state === 'treasure') return '旧宝箱（点击收取）'
  if (cell.state === 'artifact') return '古物点（点击收取）'
  if (isCollectableCell(cell)) return '可见资源（点击采集）'
  return '空地'
}

const getQuarryCellClass = (cell: QuarryCell) => {
  if (cell.state === 'surface') return 'quarry-cell--surface'
  if (cell.state === 'monster') return 'quarry-cell--monster'
  if (isCollectableCell(cell)) {
    return `quarry-cell--resource quarry-cell--resource-${cell.kind ?? cell.state}`
  }
  return 'quarry-cell--empty'
}

const getQuarryResourceNodeClass = (cell: QuarryCell) => {
  if (cell.kind === 'deep') return 'quarry-cell-resource-node--deep'
  if (cell.kind === 'treasure') return 'quarry-cell-resource-node--treasure'
  if (cell.kind === 'artifact') return 'quarry-cell-resource-node--artifact'
  if (cell.kind === 'wood') return 'quarry-cell-resource-node--wood'
  if (cell.kind === 'gem') return 'quarry-cell-resource-node--gem'
  if (cell.kind === 'ore') return 'quarry-cell-resource-node--ore'
  return 'quarry-cell-resource-node--rock'
}

const getQuarryResourceMark = (cell: QuarryCell) => {
  if (cell.kind === 'deep') return '✹'
  if (cell.kind === 'treasure') return '★'
  if (cell.kind === 'artifact') return '✶'
  if (cell.kind === 'wood') return '≡'
  if (cell.kind === 'gem') return '✦'
  if (cell.kind === 'ore') return '◈'
  return '◆'
}

const getQuarryMineNodeMark = (node: QuarryMineNode) => {
  if (node.kind === 'monster') return '!'
  if (node.kind === 'chest') return '★'
  if (node.kind === 'final') return '✹'
  return '◈'
}

const getQuarryMineNodeClass = (node: QuarryMineNode) => {
  const stateClass = node.state === 'cleared' ? 'quarry-mine-node--cleared' : 'quarry-mine-node--available'
  return `${stateClass} quarry-mine-node--${node.kind}`
}

const canResolveQuarryMineNode = (node: QuarryMineNode) => {
  const status = quarryStore.quarryMineStatus
  if (node.state === 'cleared') return false
  if (node.kind === 'final') return status.canClaimFinalReward || status.nextNodeIndex === node.index
  return status.enteredToday && status.nextNodeIndex === node.index
}

const advanceQuarryTime = (hours: number) => {
  if (hours <= 0) return
  const result = gameStore.advanceTime(hours)
  if (result.message) addLog(result.message)
  if (result.passedOut) handleEndDay()
}

const handleQuarryCellClick = (cell: QuarryCell) => {
  if (gameStore.isPastBedtime) {
    addLog('太晚了，没法继续清理旧采石场了。')
    handleEndDay()
    return
  }

  if (cell.state === 'surface') {
    const result = quarryStore.clearRubble(cell.index)
    if (!result.success) {
      sfxClick()
      showFloat(result.message, 'danger')
      return
    }
    sfxMine()
    pushExploreLog(result.message)
    advanceQuarryTime(ACTION_TIME_COSTS.mineOre * inventoryStore.getToolWorkTimeMultiplier('pickaxe'))
    return
  }

  if (cell.state === 'monster') {
    const result = quarryStore.fightMonster(cell.index)
    if (!result.success) {
      sfxClick()
      showFloat(result.message, 'danger')
      return
    }
    pushExploreLog(result.message)
    startBattleBgm()
    sfxEncounter()
    return
  }

  if (isCollectableCell(cell)) {
    const result = quarryStore.collectCell(cell.index)
    if (!result.success) {
      sfxClick()
      showFloat(result.message, 'danger')
      return
    }
    sfxMine()
    pushExploreLog(result.message)
    const timeCost =
      cell.kind === 'wood'
        ? ACTION_TIME_COSTS.forage
        : cell.kind === 'treasure' || cell.kind === 'artifact'
          ? ACTION_TIME_COSTS.revealTile
          : ACTION_TIME_COSTS.mineOre
    advanceQuarryTime(timeCost * inventoryStore.getToolWorkTimeMultiplier('pickaxe'))
  }
}

const handleEnterQuarryMine = () => {
  const result = quarryStore.enterQuarryMine()
  if (!result.success) {
    sfxClick()
    showFloat(result.message, 'danger')
    return
  }
  sfxMine()
  pushExploreLog(result.message)
  advanceQuarryTime(ACTION_TIME_COSTS.revealTile * inventoryStore.getToolWorkTimeMultiplier('pickaxe'))
}

const handleQuarryMineNode = (index: number) => {
  const result = quarryStore.resolveQuarryMineNode(index)
  if (!result.success) {
    sfxClick()
    showFloat(result.message, 'danger')
    return
  }
  sfxMine()
  pushExploreLog(result.message)
  advanceQuarryTime(ACTION_TIME_COSTS.mineOre * inventoryStore.getToolWorkTimeMultiplier('pickaxe'))
}

const handleCombat = (action: CombatAction) => {
  const result = quarryStore.combatAction(action)
  const parsedDamage = Array.from(result.message.matchAll(/受到(\d+)点伤害/g)).reduce((sum, match) => sum + Number(match[1] ?? 0), 0)
  const dealtDamage = result.dealtDamage ?? Array.from(result.message.matchAll(/造成(\d+)点伤害/g)).reduce((sum, match) => sum + Number(match[1] ?? 0), 0)

  if (action === 'attack') sfxAttack()
  if (action === 'defend') sfxDefend()
  if (action === 'flee') sfxFlee()
  if ((result.takenDamage ?? parsedDamage) > 0) sfxHurt()

  addLog(`【旧采石场】${result.message}`)
  advanceQuarryTime(result.timeCostHours * inventoryStore.getToolWorkTimeMultiplier('pickaxe'))

  if (result.combatOver) {
    if (result.won) {
      sfxVictory()
      pushExploreLog(result.message, false)
    } else {
      pushExploreLog(result.message, false)
    }
    resumeNormalBgm()
  } else if (dealtDamage > 0) {
    showFloat(`-${dealtDamage}`, 'warning')
  }
}

  useKeyboardShortcutActions([
    {
      id: 'miningAttack',
      priority: 100,
      canRun: () => quarryStore.inCombat,
      run: () => handleCombat('attack')
    },
    {
      id: 'miningDefend',
      priority: 100,
      canRun: () => quarryStore.inCombat,
      run: () => handleCombat('defend')
    },
    {
      id: 'miningFlee',
      priority: 100,
      canRun: () => quarryStore.inCombat,
      run: () => handleCombat('flee')
    }
  ])

  useKeyboardShortcutContextActions({
    onPageUp: () => scrollByViewport(-1),
    onPageDown: () => scrollByViewport(1)
  })

  const handleExpand = () => {
  const result = quarryStore.expandQuarry()
  if (result.success) {
    sfxMine()
    pushExploreLog(result.message)
  } else {
    sfxClick()
    showFloat(result.message, 'danger')
  }
}
</script>

<style scoped>
.quarry-grid {
  display: grid;
  gap: 3px;
}

.quarry-cell {
  position: relative;
  display: flex;
  min-width: 0;
  aspect-ratio: 1 / 1;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-width: 1px;
  border-style: solid;
  border-radius: 2px;
  padding: 0;
  background: rgb(var(--color-bg) / 0.78);
  box-shadow: inset 0 1px 0 rgb(var(--color-text) / 0.04);
  transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}

.quarry-cell::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.quarry-cell--surface {
  border-color: rgb(var(--color-accent-rgb) / 0.22);
  background: linear-gradient(180deg, rgb(var(--color-accent-rgb) / 0.1), rgb(var(--color-bg) / 0.9));
}

.quarry-cell--surface::before {
  background:
    linear-gradient(150deg, transparent 44%, rgb(var(--color-text) / 0.06) 45%, transparent 47%),
    linear-gradient(30deg, transparent 68%, rgb(var(--color-accent-rgb) / 0.08) 69%, transparent 71%);
}

.quarry-cell--monster {
  border-color: rgb(var(--color-danger-rgb) / 0.34);
  background: linear-gradient(180deg, rgb(var(--color-danger-rgb) / 0.14), rgb(var(--color-bg) / 0.9));
  color: rgb(var(--color-danger-rgb));
}

.quarry-cell--monster::before {
  background: linear-gradient(180deg, transparent, rgb(var(--color-danger-rgb) / 0.06));
}

.quarry-cell--resource {
  border-color: rgb(var(--color-accent-rgb) / 0.22);
  background: linear-gradient(180deg, rgb(var(--color-accent-rgb) / 0.08), rgb(var(--color-bg) / 0.86));
}

.quarry-cell--resource-deep {
  border-color: rgb(var(--color-danger-rgb) / 0.36);
  background: linear-gradient(180deg, rgb(var(--color-danger-rgb) / 0.14), rgb(var(--color-bg) / 0.9));
}

.quarry-cell--resource-treasure {
  border-color: rgb(var(--color-warning-rgb) / 0.38);
  background: linear-gradient(180deg, rgb(var(--color-warning-rgb) / 0.14), rgb(var(--color-bg) / 0.84));
}

.quarry-cell--resource-artifact {
  border-color: rgb(168 85 247 / 0.36);
  background: linear-gradient(180deg, rgb(168 85 247 / 0.14), rgb(var(--color-bg) / 0.86));
}

.quarry-cell--resource-wood {
  border-color: rgb(var(--color-success-rgb) / 0.28);
  background: linear-gradient(180deg, rgb(var(--color-success-rgb) / 0.1), rgb(var(--color-bg) / 0.86));
}

.quarry-cell--resource-gem {
  border-color: rgb(var(--color-warning-rgb) / 0.28);
  background: linear-gradient(180deg, rgb(var(--color-warning-rgb) / 0.1), rgb(var(--color-bg) / 0.86));
}

.quarry-cell--empty {
  border-color: rgb(var(--color-accent-rgb) / 0.08);
  background: rgb(var(--color-bg) / 0.9);
}

.quarry-cell:disabled {
  cursor: default;
  opacity: 0.82;
}

.quarry-cell:not(:disabled):hover {
  transform: translateY(-1px);
}

.quarry-cell-resource-node,
.quarry-cell-icon,
.quarry-cell-qty,
.quarry-cell-hp-bar {
  position: relative;
  z-index: 1;
}

.quarry-cell-resource-node {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quarry-cell-resource-node::before,
.quarry-cell-resource-node::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.quarry-cell-resource-node--rock::before {
  background:
    linear-gradient(145deg, transparent 22%, rgb(var(--color-text) / 0.08) 23%, transparent 28%),
    linear-gradient(32deg, transparent 60%, rgb(var(--color-accent-rgb) / 0.08) 61%, transparent 66%);
}

.quarry-cell-resource-node--ore::before {
  background:
    linear-gradient(145deg, transparent 20%, rgb(var(--color-warning-rgb) / 0.22) 21%, transparent 27%),
    linear-gradient(35deg, transparent 54%, rgb(var(--color-warning-rgb) / 0.18) 55%, transparent 61%),
    linear-gradient(172deg, transparent 70%, rgb(var(--color-text) / 0.08) 71%, transparent 76%);
}

.quarry-cell-resource-node--gem::before {
  background:
    linear-gradient(145deg, transparent 26%, rgb(168 85 247 / 0.2) 27%, transparent 34%),
    linear-gradient(32deg, transparent 55%, rgb(var(--color-warning-rgb) / 0.16) 56%, transparent 63%);
}

.quarry-cell-resource-node--wood::before {
  background:
    linear-gradient(180deg, transparent 24%, rgb(var(--color-success-rgb) / 0.16) 25%, transparent 28%),
    linear-gradient(180deg, transparent 48%, rgb(var(--color-success-rgb) / 0.12) 49%, transparent 52%),
    linear-gradient(180deg, transparent 72%, rgb(var(--color-success-rgb) / 0.14) 73%, transparent 76%);
}

.quarry-cell-resource-node--deep::before {
  background:
    linear-gradient(145deg, transparent 18%, rgb(var(--color-danger-rgb) / 0.24) 19%, transparent 25%),
    linear-gradient(35deg, transparent 54%, rgb(var(--color-danger-rgb) / 0.18) 55%, transparent 61%);
}

.quarry-cell-resource-node--treasure::before {
  background:
    linear-gradient(180deg, transparent 34%, rgb(var(--color-warning-rgb) / 0.2) 35%, transparent 40%),
    linear-gradient(90deg, transparent 48%, rgb(var(--color-warning-rgb) / 0.16) 49%, transparent 53%);
}

.quarry-cell-resource-node--artifact::before {
  background:
    linear-gradient(180deg, transparent 30%, rgb(168 85 247 / 0.16) 31%, transparent 36%),
    linear-gradient(145deg, transparent 58%, rgb(var(--color-text) / 0.08) 59%, transparent 64%);
}

.quarry-cell-resource-mark {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 1.35rem;
  line-height: 1;
  font-weight: 700;
  text-shadow: 0 1px 0 rgb(var(--color-bg));
}

.quarry-cell-resource-node--rock .quarry-cell-resource-mark {
  color: rgb(var(--color-text) / 0.74);
}

.quarry-cell-resource-node--ore .quarry-cell-resource-mark {
  color: rgb(var(--color-warning-rgb) / 0.86);
}

.quarry-cell-resource-node--gem .quarry-cell-resource-mark {
  color: rgb(216 180 255 / 0.92);
}

.quarry-cell-resource-node--wood .quarry-cell-resource-mark {
  color: rgb(var(--color-success-rgb) / 0.82);
}

.quarry-cell-resource-node--deep .quarry-cell-resource-mark {
  color: rgb(var(--color-danger-rgb) / 0.92);
}

.quarry-cell-resource-node--treasure .quarry-cell-resource-mark {
  color: rgb(var(--color-warning-rgb) / 0.94);
}

.quarry-cell-resource-node--artifact .quarry-cell-resource-mark {
  color: rgb(208 150 255 / 0.92);
}

.quarry-cell-icon {
  font-size: 1rem;
  line-height: 1;
  text-shadow: 0 1px 0 rgb(var(--color-bg));
}

.quarry-cell-icon--surface {
  color: rgb(var(--color-text) / 0.54);
  font-size: 0.9rem;
}

.quarry-cell-icon--empty {
  color: rgb(var(--color-muted-rgb) / 0.46);
  font-size: 0.9rem;
}

.quarry-cell-qty {
  position: absolute;
  right: 2px;
  bottom: 1px;
  z-index: 2;
  color: rgb(var(--color-text));
  font-size: 0.5625rem;
  line-height: 1;
  text-shadow: 0 1px 0 rgb(var(--color-bg));
}

.quarry-cell-hp-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2;
  height: 3px;
  background: rgb(var(--color-bg) / 0.5);
}

.quarry-cell-hp-fill {
  display: block;
  height: 100%;
  background: rgb(var(--color-danger-rgb));
  transition: width 0.2s ease;
}

.quarry-log,
.quarry-combat-log {
  max-height: 6rem;
  overflow-y: auto;
  font-size: 0.75rem;
  line-height: 1.35;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.quarry-mine-route {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.quarry-mine-node {
  display: grid;
  min-height: 30px;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: center;
  gap: 6px;
  border: 1px solid rgb(var(--color-accent-rgb) / 0.14);
  border-radius: 2px;
  padding: 4px 6px;
  background: rgb(var(--color-panel) / 0.34);
  color: rgb(var(--color-text));
  font-size: 0.625rem;
  line-height: 1.1;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.quarry-mine-node:not(:disabled):hover {
  border-color: rgb(var(--color-accent-rgb) / 0.28);
  background: rgb(var(--color-accent-rgb) / 0.08);
}

.quarry-mine-node:disabled {
  cursor: default;
  opacity: 0.72;
}

.quarry-mine-node--cleared {
  border-color: rgb(var(--color-success-rgb) / 0.16);
  color: rgb(var(--color-muted-rgb));
}

.quarry-mine-node--available.quarry-mine-node--monster {
  border-color: rgb(var(--color-danger-rgb) / 0.26);
}

.quarry-mine-node--available.quarry-mine-node--chest,
.quarry-mine-node--available.quarry-mine-node--final {
  border-color: rgb(var(--color-warning-rgb) / 0.28);
}

.quarry-mine-node-mark {
  display: inline-flex;
  min-width: 18px;
  justify-content: center;
  color: rgb(var(--color-accent-rgb));
  font-weight: 700;
}

.quarry-combat-action {
  display: flex;
  min-height: 48px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: 1px solid rgb(var(--color-accent-rgb) / 0.18);
  border-radius: 2px;
  padding: 6px 4px;
  background: rgb(var(--color-panel) / 0.55);
}

.quarry-combat-action:hover {
  background: rgb(var(--color-accent-rgb) / 0.08);
}

.quarry-combat-action--danger {
  border-color: rgb(var(--color-danger-rgb) / 0.24);
}

.quarry-combat-action--danger:hover {
  background: rgb(var(--color-danger-rgb) / 0.08);
}

.mining-status-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  padding: 4px;
  border: 1px solid rgb(var(--color-accent-rgb) / 0.18);
  border-radius: 2px;
  background: rgb(var(--color-bg) / 0.26);
}

.mining-status-item {
  display: flex;
  min-width: 0;
  min-height: 28px;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 3px 4px;
  border: 1px solid rgb(var(--color-accent-rgb) / 0.12);
  border-radius: 2px;
  background: rgb(var(--color-panel) / 0.36);
  font-size: 0.625rem;
  line-height: 1;
}

.mining-status-label,
.mining-status-value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mining-status-label {
  color: rgb(var(--color-muted-rgb));
}

.mining-status-value {
  font-weight: 600;
}

@keyframes quarryStatusPulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}

.mining-status-critical {
  animation: quarryStatusPulse 1s ease-in-out infinite;
}

@media (max-width: 360px) {
  .quarry-grid {
    gap: 2px;
  }
}
</style>
