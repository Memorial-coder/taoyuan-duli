<template>
  <div class="quarry-page">
    <div class="quarry-topbar">
      <div class="min-w-0">
        <h3 class="quarry-title">
          <Mountain :size="14" aria-hidden="true" />
          <span>旧采石场</span>
          <span class="quarry-day-chip" :class="quarryStore.isNight ? 'quarry-day-chip--night' : 'quarry-day-chip--day'">
            {{ quarryStore.isNight ? '夜晚' : '白日' }}
          </span>
        </h3>
        <p class="quarry-subtitle">{{ currentDayText }}</p>
      </div>
      <Button class="quarry-icon-button" :icon="Map" :aria-label="'查看采石场地形'" @click="showMapModal = true" />
    </div>

    <Transition name="panel-fade">
      <div
        v-if="showMapModal"
        class="game-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3"
        @click.self="showMapModal = false"
      >
        <div class="game-panel quarry-map-modal relative w-full max-w-xs">
          <Button class="absolute right-2 top-2 py-0 px-1" :icon="X" :icon-size="12" :aria-label="'关闭采石场地形'" @click="showMapModal = false" />
          <p class="mb-2 pr-7 text-sm text-accent">
            <Map :size="14" class="inline" aria-hidden="true" />
            采石场地形
          </p>
          <p class="text-xs leading-5 text-muted">
            露天矿面会保留场上的石头、矿脉、枯木、宝箱和裂隙。清出空地后，第二天早晨才会尝试长出新的资源点。
          </p>
          <p class="mt-2 text-[0.625rem] text-muted">{{ currentDayText }}</p>
        </div>
      </div>
    </Transition>

    <section class="quarry-shell" data-testid="quarry-panel">
      <template v-if="!quarryStore.isUnlocked">
        <div class="quarry-locked-scene">
          <div class="quarry-locked-scene__sky" aria-hidden="true" />
          <div class="quarry-locked-scene__gate" aria-hidden="true">
            <Lock :size="24" />
          </div>
          <div class="quarry-locked-scene__copy">
            <p class="text-sm text-accent">山脚支架还没复开</p>
            <p class="mt-2 text-xs leading-5 text-muted">
              完成村庄工程“旧采石场复开”后，这里会成为可见露天资源场，并露出会周期刷新的采石场旧支道。
            </p>
          </div>
        </div>

        <div class="quarry-unlock-list">
          <div
            v-for="requirement in quarryUnlockRequirements"
            :key="requirement.id"
            class="quarry-unlock-row"
            :class="requirement.met ? 'quarry-unlock-row--met' : 'quarry-unlock-row--locked'"
          >
            <span class="min-w-0 truncate text-xs">{{ requirement.label }}</span>
            <span class="quarry-unlock-row__value">
              <Check v-if="requirement.met" :size="12" aria-hidden="true" />
              <Lock v-else :size="12" aria-hidden="true" />
              {{ requirement.current }}/{{ requirement.target }}
            </span>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="quarry-dashboard">
          <section class="quarry-stage">
            <div class="quarry-scene" :class="{ 'quarry-scene--night': quarryStore.isNight }">
              <div class="quarry-scene__ridge" aria-hidden="true" />
              <div class="quarry-scene__header">
                <div class="min-w-0">
                  <p class="quarry-scene__eyebrow">露天矿面</p>
                  <p class="quarry-scene__title">{{ quarryStore.activeSize }}×{{ quarryStore.activeSize }} 采石场</p>
                </div>
                <div class="quarry-scene__badges">
                  <span>{{ quarryStore.interactableCellCount }}/{{ quarryStore.totalCellCount }} 可清理</span>
                  <span :class="quarryStore.maintenanceActive ? 'text-success' : 'text-muted'">
                    {{ quarryStore.maintenanceActive ? '维护 +2' : '未维护' }}
                  </span>
                </div>
              </div>

              <div class="quarry-grid-scroll">
                <div
                  class="quarry-grid"
                  :style="sceneGridStyle"
                  data-testid="quarry-grid"
                  aria-label="旧采石场资源网格"
                >
                  <button
                    v-for="cell in quarryCells"
                    :key="cell.index"
                    type="button"
                    class="quarry-cell"
                    :class="[getQuarryCellClass(cell), { 'quarry-cell--rare': getQuarryCellVisual(cell).isRare }]"
                    :disabled="!isCellClickable(cell)"
                    :title="getQuarryCellLabel(cell)"
                    :aria-label="getQuarryCellVisual(cell).ariaLabel"
                    @click="handleQuarryCellClick(cell)"
                  >
                    <span class="quarry-cell__ground" aria-hidden="true" />
                    <ItemIcon
                      v-if="getQuarryCellItem(cell) && cell.state !== 'surface' && cell.state !== 'monster'"
                      class="quarry-cell__item"
                      :item="getQuarryCellItem(cell)"
                      size="xs"
                      :show-badge="false"
                    />
                    <span v-else class="quarry-cell__fallback" :class="getQuarryCellVisual(cell).iconClass" aria-hidden="true">
                      <component v-if="getQuarryCellVisual(cell).icon" :is="getQuarryCellVisual(cell).icon" :size="14" />
                    </span>
                    <span v-if="cell.state === 'monster'" class="quarry-cell-hp-bar" aria-hidden="true">
                      <span class="quarry-cell-hp-fill" :style="{ width: monsterHpPercent(cell) + '%' }" />
                    </span>
                    <span v-if="cell.state === 'monster'" class="quarry-cell-qty">{{ cell.monsterHp ?? 0 }}</span>
                    <span v-else-if="(cell.quantity ?? 0) > 1" class="quarry-cell-qty">×{{ cell.quantity ?? 1 }}</span>
                  </button>
                </div>
              </div>

              <div class="quarry-scene__legend" aria-label="采石场图例">
                <span><CircleDot :size="10" aria-hidden="true" /> 空地</span>
                <span><Pickaxe :size="10" aria-hidden="true" /> 资源</span>
                <span><Sparkles :size="10" aria-hidden="true" /> 稀有</span>
                <span><ShieldAlert :size="10" aria-hidden="true" /> 怪物</span>
              </div>
            </div>
          </section>

          <aside class="quarry-care-panel">
            <div class="quarry-metric-strip">
              <div class="quarry-metric">
                <span>今日生成</span>
                <strong>{{ quarryStore.lastDailySpawnedCount }}/{{ quarryStore.dailySpawnCap }}</strong>
              </div>
              <div class="quarry-metric">
                <span>可清理</span>
                <strong>{{ quarryStore.resourceCellCount + quarryStore.monsterCellCount }}</strong>
              </div>
              <div class="quarry-metric">
                <span>稀有点</span>
                <strong>{{ quarryStore.rareCellCount }}</strong>
              </div>
              <div class="quarry-metric">
                <span>空地</span>
                <strong>{{ quarryStore.emptyCellCount }}</strong>
              </div>
            </div>

            <section class="quarry-panel-block quarry-weekly-block">
              <div class="quarry-block-title">
                <span>本周管护</span>
                <span>{{ quarryWeeklyProgressText }}</span>
              </div>
              <div class="quarry-progress-track" aria-hidden="true">
                <div class="quarry-progress-fill" :style="{ width: `${quarryStore.weeklyStewardshipProgress.percent}%` }" />
              </div>
              <p class="quarry-block-note">
                已领取 {{ quarryStore.weeklyStewardshipProgress.claimedCount }}/{{ quarryStore.weeklyStewardshipProgress.maxClaims }} 次；
                每 {{ quarryWeeklyTarget }} 格触发一次潜能材料。
              </p>
            </section>

            <section class="quarry-panel-block" data-testid="quarry-mine-panel">
              <div class="quarry-block-title">
                <span>
                  <Mountain :size="12" aria-hidden="true" />
                  旧支道矿洞
                </span>
                <span>{{ quarryMineStatusText }}</span>
              </div>

              <div class="quarry-mine-summary" :class="quarryMineSummaryClass">
                <div class="min-w-0">
                  <p class="quarry-mine-phase">{{ quarryMinePhaseText }}</p>
                  <p class="quarry-mine-summary__title">{{ quarryMineActionTitle }}</p>
                  <p class="quarry-mine-summary__copy">{{ quarryMineActionCopy }}</p>
                </div>
                <button
                  class="btn quarry-mine-primary"
                  :disabled="!quarryMinePrimaryAction.enabled"
                  :aria-label="quarryMinePrimaryAction.ariaLabel"
                  @click="handleQuarryMinePrimaryAction"
                >
                  {{ quarryMinePrimaryAction.label }}
                </button>
              </div>

              <div class="quarry-mine-phase-strip" aria-label="旧支道探索流程">
                <span :class="getQuarryMinePhaseClass('entry')">入洞</span>
                <span :class="getQuarryMinePhaseClass('route')">清段</span>
                <span :class="getQuarryMinePhaseClass('final')">祭台</span>
              </div>

              <div v-if="showQuarryMineModePicker" class="quarry-mine-mode-panel" aria-label="旧支道探索方式">
                <button
                  v-for="mode in quarryMineExploreModes"
                  :key="mode.id"
                  type="button"
                  class="quarry-mine-mode"
                  :class="{ 'quarry-mine-mode--active': selectedQuarryMineMode === mode.id }"
                  :aria-pressed="selectedQuarryMineMode === mode.id"
                  :aria-label="`选择${mode.label}：${mode.effect}`"
                  :title="mode.effect"
                  @click="selectedQuarryMineMode = mode.id"
                >
                  <span class="quarry-mine-mode__head">
                    <component :is="mode.icon" :size="12" aria-hidden="true" />
                    {{ mode.label }}
                  </span>
                  <span class="quarry-mine-mode__cost">{{ mode.cost }}</span>
                  <span class="quarry-mine-mode__effect">{{ mode.effect }}</span>
                </button>
              </div>

              <div v-if="showQuarryMineModePicker" class="quarry-mine-mode-panel" data-testid="quarry-mine-elixir-prep" aria-label="旧支道丹药准备">
                <button
                  type="button"
                  class="quarry-mine-mode"
                  :class="{ 'quarry-mine-mode--active': selectedQuarryMineElixirId === null }"
                  :aria-pressed="selectedQuarryMineElixirId === null"
                  aria-label="不使用旧支道丹药准备"
                  @click="selectedQuarryMineElixirId = null"
                >
                  <span class="quarry-mine-mode__head">
                    <component :is="Shield" :size="12" aria-hidden="true" />
                    不用丹药
                  </span>
                  <span class="quarry-mine-mode__cost">不消耗</span>
                  <span class="quarry-mine-mode__effect">按探索方式结算</span>
                </button>
                <button
                  v-for="option in quarryMineElixirPrepOptions"
                  :key="option.itemId"
                  type="button"
                  class="quarry-mine-mode"
                  :class="{ 'quarry-mine-mode--active': selectedQuarryMineElixirId === option.itemId }"
                  :disabled="option.count <= 0"
                  :aria-pressed="selectedQuarryMineElixirId === option.itemId"
                  :aria-label="`使用${option.name}：${option.effect}，库存${option.count}`"
                  :title="`${option.effect}；库存 ${option.count}`"
                  @click="selectedQuarryMineElixirId = option.itemId"
                >
                  <span class="quarry-mine-mode__head">
                    <component :is="Sparkles" :size="12" aria-hidden="true" />
                    {{ option.name }}
                  </span>
                  <span class="quarry-mine-mode__cost">库存 {{ option.count }}</span>
                  <span class="quarry-mine-mode__effect">{{ option.effect }}</span>
                </button>
              </div>

              <div class="quarry-mine-progress-meta">
                <span>{{ quarryStore.quarryMineStatus.clearedCount }}/{{ quarryStore.quarryMineStatus.totalCount }} 段</span>
                <span>{{ quarryMineProgressText }}</span>
              </div>
              <div class="quarry-mine-progress-track" aria-hidden="true">
                <div class="quarry-mine-progress-fill" :style="{ width: `${quarryMineProgressPercent}%` }" />
              </div>

              <div class="quarry-mine-route">
                <button
                  v-for="node in quarryStore.quarryMineStatus.nodes"
                  :key="node.index"
                  type="button"
                  class="quarry-mine-node"
                  :class="getQuarryMineNodeClass(node)"
                  :disabled="!canResolveQuarryMineNode(node)"
                  :title="node.label"
                  :aria-label="getQuarryMineNodeAriaLabel(node)"
                  @click="handleQuarryMineNode(node.index)"
                >
                  <span class="quarry-mine-node-dot">
                    <component :is="getQuarryMineNodeIcon(node)" :size="12" aria-hidden="true" />
                  </span>
                  <span class="quarry-mine-node-label">{{ getQuarryMineNodeShortLabel(node) }}</span>
                  <span class="quarry-mine-node-state">{{ getQuarryMineNodeStateLabel(node) }}</span>
                </button>
              </div>

              <div class="quarry-mine-focus" :class="quarryMineFocusClass">
                <span class="quarry-mine-focus__icon">
                  <component :is="quarryMineFocusIcon" :size="14" aria-hidden="true" />
                </span>
                <div class="min-w-0">
                  <p class="quarry-mine-focus__title">{{ quarryMineFocusTitle }}</p>
                  <p class="quarry-mine-focus__copy">{{ quarryMineFocusCopy }}</p>
                </div>
              </div>
            </section>

            <section class="quarry-panel-block">
              <div class="quarry-block-title">
                <span>
                  <Hammer :size="12" aria-hidden="true" />
                  扩建
                </span>
                <span v-if="quarryStore.expansionInfo.nextStage">
                  {{ quarryStore.activeSize }}×{{ quarryStore.activeSize }} →
                  {{ quarryStore.expansionInfo.nextStage.toSize }}×{{ quarryStore.expansionInfo.nextStage.toSize }}
                </span>
                <span v-else>已满</span>
              </div>
              <template v-if="quarryStore.expansionInfo.nextStage">
                <p class="quarry-block-note">{{ quarryStore.expansionInfo.nextStage.description }}</p>
                <p class="quarry-block-note">
                  费用：{{ quarryStore.expansionInfo.nextStage.moneyCost.toLocaleString() }} 文 + 材料
                </p>
                <div v-if="!quarryStore.expansionInfo.canExpand" class="quarry-missing-list">
                  <p v-for="(req, ri) in quarryStore.expansionInfo.missingRequirements.slice(0, 4)" :key="ri">
                    {{ req }}
                  </p>
                  <p v-if="quarryStore.expansionInfo.missingRequirements.length > 4">
                    另有 {{ quarryStore.expansionInfo.missingRequirements.length - 4 }} 项条件
                  </p>
                </div>
                <button class="btn quarry-expand-btn" :disabled="!quarryStore.expansionInfo.canExpand" @click="handleExpand">
                  扩建矿面
                </button>
              </template>
              <p v-else class="quarry-block-note">采石场已达最大规模 32×32。</p>
            </section>

            <section class="quarry-panel-block">
              <div class="quarry-block-title">
                <span>采石场日志</span>
                <span>{{ recentLog.length }} 条</span>
              </div>
              <div class="quarry-log">
                <p v-if="recentLog.length <= 0" class="text-muted">今天还没有采石场记录。</p>
                <p
                  v-for="(entry, index) in recentLog"
                  :key="index"
                  :class="index === recentLog.length - 1 ? 'text-text' : 'text-muted'"
                >
                  {{ entry }}
                </p>
              </div>
            </section>
          </aside>
        </div>
      </template>
    </section>

    <Transition name="panel-fade">
      <div
        v-if="quarryStore.inCombat"
        class="game-modal-overlay quarry-combat-overlay fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/70 p-4"
        data-testid="quarry-combat-dialog"
      >
        <div class="game-panel quarry-combat-panel w-full max-w-sm">
          <div class="quarry-combat-header">
            <div class="min-w-0">
              <p class="text-sm text-danger">
                <ShieldAlert :size="14" class="inline" aria-hidden="true" />
                遭遇怪物
              </p>
              <p class="mt-1 truncate text-[0.625rem] text-muted">{{ quarryStore.combatMonster?.name ?? '采石场怪物' }}</p>
            </div>
            <Button class="py-0 px-1" :icon="X" :icon-size="12" :aria-label="'退开采石场战斗'" @click="handleCombat('flee')" />
          </div>

          <div class="mining-status-strip" aria-label="采石场战斗状态">
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

          <div class="quarry-weapon-strip">
            <p>
              <Swords :size="12" class="inline" aria-hidden="true" />
              {{ weaponDisplayName }}（{{ weaponTypeName }} · 攻击 {{ weaponAttack }} · 暴击 {{ critRateDisplay }}）
            </p>
            <p v-if="weaponAffixSummary" class="text-success">词条：{{ weaponAffixSummary }}</p>
          </div>

          <div class="quarry-combat-arena">
            <div class="quarry-combat-side quarry-combat-side--player">
              <p class="text-xs text-accent">你</p>
              <div class="quarry-combat-hp-track">
                <div
                  class="quarry-combat-hp-fill"
                  :class="playerStore.getIsLowHp() ? 'quarry-combat-hp-fill--danger' : 'quarry-combat-hp-fill--safe'"
                  :style="{ width: `${playerStore.getHpPercent()}%` }"
                />
              </div>
              <p class="text-[0.625rem]" :class="playerStore.getIsLowHp() ? 'text-danger' : 'text-muted'">
                {{ playerStore.hp }}/{{ playerStore.getMaxHp() }}
              </p>
            </div>
            <span class="quarry-combat-versus">VS</span>
            <div class="quarry-combat-side quarry-combat-side--monster">
              <p class="truncate text-xs text-danger">{{ quarryStore.combatMonster?.name }}</p>
              <div class="quarry-combat-hp-track">
                <div
                  class="quarry-combat-hp-fill quarry-combat-hp-fill--danger"
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

          <div class="quarry-combat-actions">
            <button class="quarry-combat-action" :aria-label="'攻击采石场怪物'" @click="handleCombat('attack')">
              <span>
                <Swords :size="12" class="inline" aria-hidden="true" />
                攻击
              </span>
              <span>{{ weaponAttack }} 攻击力</span>
            </button>
            <button class="quarry-combat-action" :aria-label="'防守'" @click="handleCombat('defend')">
              <span>
                <Shield :size="12" class="inline" aria-hidden="true" />
                防守
              </span>
              <span>减伤并回气</span>
            </button>
            <button class="quarry-combat-action quarry-combat-action--danger" :aria-label="'退开战斗'" @click="handleCombat('flee')">
              <span>
                <MoveRight :size="12" class="inline" aria-hidden="true" />
                退开
              </span>
              <span>保留进度</span>
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
import {
  Archive,
  CircleDot,
  Gem,
  Hammer,
  Footprints,
  Mountain,
  Package,
  Pickaxe,
  Map,
  X,
  Check,
  Lock,
  Clock,
  Zap,
  Heart,
  Swords,
  Shield,
  MoveRight,
  ShieldAlert,
  Sparkles,
  TreePine
} from 'lucide-vue-next'
import Button from '@/components/game/Button.vue'
import ItemIcon from '@/components/game/ItemIcon.vue'
import { useGameStore } from '@/stores/useGameStore'
import { useInventoryStore } from '@/stores/useInventoryStore'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { useQuarryStore } from '@/stores/useQuarryStore'
import { useSkillStore } from '@/stores/useSkillStore'
import { QUARRY_MINE_REFRESH_DAYS, QUARRY_WEEKLY_STEWARDSHIP_TARGET } from '@/data/quarry'
import { QUARRY_MINE_ELIXIR_PREP_OPTIONS } from '@/data/eliteElixirPrep'
import { formatForgeAffixSummary } from '@/data/forgeAffixes'
import { getItemById } from '@/data/items'
import { ACTION_TIME_COSTS } from '@/data/timeConstants'
import { getWeaponById, getWeaponDisplayName, WEAPON_TYPE_NAMES } from '@/data/weapons'
import type { CombatAction, ItemDef, QuarryCell, QuarryMineExploreMode, QuarryMineNode } from '@/types'
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
const selectedQuarryMineMode = ref<QuarryMineExploreMode>('steady')
const selectedQuarryMineElixirId = ref<string | null>(null)

const quarryMineExploreModes: Array<{
  id: QuarryMineExploreMode
  label: string
  cost: string
  effect: string
  icon: typeof Shield
}> = [
  { id: 'steady', label: '稳进', cost: '体力 2', effect: '伤害更低，收益正常', icon: Shield },
  { id: 'force', label: '强攻', cost: '体力 3', effect: '矿点多挖一点，遭遇更痛', icon: Swords },
  { id: 'search', label: '细搜', cost: '体力 4', effect: '矿点和旧箱收益提高', icon: Sparkles }
]

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
const sceneGridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${quarryStore.activeSize}, minmax(0, 1fr))`,
  '--quarry-cell-size': `clamp(13px, ${Math.max(0.9, 3.5 - quarryStore.activeSize * 0.06).toFixed(2)}vw, ${quarryStore.activeSize > 20 ? 28 : 36}px)`
}))
const quarryMineStatusText = computed(() => {
  const status = quarryStore.quarryMineStatus
  if (status.completed) return status.daysUntilRefresh > 0 ? `${status.daysUntilRefresh} 天后刷新` : '等待刷新'
  if (status.canClaimFinalReward) return status.finalRewardClaimed ? '可领取终点补给' : '可领取灵器碎片'
  if (status.enteredToday) return '今日已进入'
  if (status.entered) return '推进中'
  if (status.canEnter && status.finalRewardClaimed) return '新路线可进'
  return '未进入'
})
const quarryMineCurrentNode = computed(() => {
  const status = quarryStore.quarryMineStatus
  return status.nodes.find(node => node.index === status.nextNodeIndex) ?? null
})
const quarryMineSelectedMode = computed(() => quarryMineExploreModes.find(mode => mode.id === selectedQuarryMineMode.value) ?? quarryMineExploreModes[0]!)
const quarryMineElixirPrepOptions = computed(() =>
  QUARRY_MINE_ELIXIR_PREP_OPTIONS.map(option => ({
    ...option,
    name: getItemById(option.itemId)?.name ?? option.label,
    count: inventoryStore.getTotalItemCount(option.itemId)
  }))
)
const showQuarryMineModePicker = computed(() => {
  const status = quarryStore.quarryMineStatus
  const node = quarryMineCurrentNode.value
  return !!node && node.kind !== 'final' && status.enteredToday && canResolveQuarryMineNode(node)
})
const quarryMineProgressPercent = computed(() => {
  const status = quarryStore.quarryMineStatus
  if (status.totalCount <= 0) return 0
  return Math.round((status.clearedCount / status.totalCount) * 100)
})
const quarryMineProgressText = computed(() => {
  const status = quarryStore.quarryMineStatus
  if (status.completed) {
    return status.daysUntilRefresh > 0
      ? `岩层稳定中：${status.daysUntilRefresh}/${status.refreshDayCount} 天`
      : '明早刷新路线'
  }
  if (status.canClaimFinalReward) return status.finalRewardClaimed ? '终点补给可领' : '灵器碎片可取'
  if (status.enteredToday && quarryMineCurrentNode.value) return `下一段：${quarryMineCurrentNode.value.label}`
  if (status.entered) return '明日可继续下洞'
  if (status.finalRewardClaimed) return `第 ${status.runId + 1} 轮待进入`
  return '等待进入'
})
const quarryMinePhaseText = computed(() => {
  const status = quarryStore.quarryMineStatus
  if (status.completed) return '岩层稳定中'
  if (status.canClaimFinalReward) return '终点祭台'
  if (status.enteredToday) return '今日支道'
  if (status.entered) return '支道中继'
  if (status.finalRewardClaimed) return '刷新支道'
  return '入口待命'
})
const quarryMineActionTitle = computed(() => {
  const status = quarryStore.quarryMineStatus
  const node = quarryMineCurrentNode.value
  if (status.completed) return status.daysUntilRefresh > 0 ? '本轮路线已清空' : '旧支道即将刷新'
  if (status.canClaimFinalReward) return status.finalRewardClaimed ? '终点补给已经够得着' : '终点祭台已经够得着'
  if (node && status.enteredToday) return node.label
  if (status.entered) return '今天入口已经走过'
  if (status.finalRewardClaimed) return '新一轮旧支道露出'
  return '旧支道入口露出'
})
const quarryMineActionCopy = computed(() => {
  const status = quarryStore.quarryMineStatus
  const node = quarryMineCurrentNode.value
  if (status.completed) {
    return status.daysUntilRefresh > 0
      ? `本轮旧支道已完成，岩层还要 ${status.daysUntilRefresh} 天稳定后刷新。`
      : '岩层已经稳定，下一次日更会重新露出路线。'
  }
  if (status.canClaimFinalReward) {
    return status.finalRewardClaimed
      ? '前面的支道已经清完，终点留下的是本轮补给。'
      : '前面的碎矿、怪物和旧箱都已处理，下一步就是取走灵器碎片。'
  }
  if (node && status.enteredToday) return `${getQuarryMineNodeActionCopy(node)} 当前方式：${quarryMineSelectedMode.value.label}，${quarryMineSelectedMode.value.effect}。`
  if (status.entered) return '采石场矿洞每天只能进入一次，明天可以继续沿旧支道推进。'
  if (status.finalRewardClaimed) return '岩层刷新出新的岔路，可再次入洞清段；首通灵器不会重复出现。'
  return '进入后会从最靠近入口的一段开始，按路线逐段处理。'
})
const quarryMineSummaryClass = computed(() => {
  const status = quarryStore.quarryMineStatus
  if (status.completed) return 'quarry-mine-summary--done'
  if (status.canClaimFinalReward) return 'quarry-mine-summary--final'
  if (status.enteredToday) return 'quarry-mine-summary--active'
  return 'quarry-mine-summary--entry'
})
const quarryMinePrimaryAction = computed(() => {
  const status = quarryStore.quarryMineStatus
  const node = quarryMineCurrentNode.value
  if (status.completed) {
    return {
      label: status.daysUntilRefresh > 0 ? '等待刷新' : '即将刷新',
      enabled: false,
      ariaLabel: `采石场矿洞本轮已完成，${status.daysUntilRefresh} 天后刷新`
    }
  }
  if ((status.canClaimFinalReward || node?.kind === 'final') && node) {
    return {
      label: status.finalRewardClaimed ? '领取补给' : '领取奖励',
      enabled: canResolveQuarryMineNode(node),
      ariaLabel: status.finalRewardClaimed ? '领取采石场矿洞终点补给' : '领取采石场矿洞终点奖励'
    }
  }
  if (node && status.enteredToday) {
    return {
      label: `${quarryMineSelectedMode.value.label}处理`,
      enabled: canResolveQuarryMineNode(node),
      ariaLabel: `${quarryMineSelectedMode.value.label}${getQuarryMineNodeActionLabel(node)}：${node.label}`
    }
  }
  if (status.canEnter) {
    return { label: '进入旧支道', enabled: true, ariaLabel: '进入采石场矿洞' }
  }
  if (status.entered) {
    return { label: '明日继续', enabled: false, ariaLabel: '今日已经进入过采石场矿洞' }
  }
  return { label: '暂不可进', enabled: false, ariaLabel: '采石场矿洞暂不可进入' }
})
const quarryMineFocusTitle = computed(() => {
  const status = quarryStore.quarryMineStatus
  const node = quarryMineCurrentNode.value
  if (status.completed) return '本轮探索完成'
  if (status.canClaimFinalReward) return status.finalRewardClaimed ? '终点补给待取' : '终点奖励待取'
  if (node) return node.label
  return '入口情况'
})
const quarryMineFocusCopy = computed(() => {
  const status = quarryStore.quarryMineStatus
  const node = quarryMineCurrentNode.value
  if (status.completed) return `旧支道会在岩层稳定后刷新，周期为 ${QUARRY_MINE_REFRESH_DAYS} 天。`
  if (status.canClaimFinalReward) return status.finalRewardClaimed ? '领取补给后，本轮路线进入刷新等待。' : '领取灵器碎片后，后续刷新只会给普通矿洞补给。'
  if (node) return getQuarryMineNodeActionCopy(node)
  if (status.canEnter) return status.finalRewardClaimed ? '新路线已经可进入，准备好体力和背包空间后下洞。' : '准备好体力和背包空间后，从入口进入。'
  return '今日入口不可用时，路线仅显示当前进度。'
})
const quarryMineFocusClass = computed(() => {
  const status = quarryStore.quarryMineStatus
  const node = quarryMineCurrentNode.value
  if (status.completed) return 'quarry-mine-focus--done'
  if (status.canClaimFinalReward || node?.kind === 'final') return 'quarry-mine-focus--final'
  if (node?.kind === 'monster') return 'quarry-mine-focus--danger'
  if (node?.kind === 'chest') return 'quarry-mine-focus--treasure'
  return 'quarry-mine-focus--route'
})
const quarryMineFocusIcon = computed(() => {
  const status = quarryStore.quarryMineStatus
  const node = quarryMineCurrentNode.value
  if (status.completed) return Clock
  if (status.canClaimFinalReward || node?.kind === 'final') return Sparkles
  if (node?.kind === 'monster') return ShieldAlert
  if (node?.kind === 'chest') return Package
  if (node?.kind === 'ore') return Pickaxe
  return Footprints
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

type QuarryCellVisualTone = 'empty' | 'surface' | 'rock' | 'ore' | 'gem' | 'wood' | 'deep' | 'treasure' | 'artifact' | 'monster'

const getQuarryCellItem = (cell: QuarryCell): ItemDef | null => {
  const itemId = cell.itemId ?? cell.treasureItems?.[0]?.itemId
  return itemId ? getItemById(itemId) ?? null : null
}

const getQuarryCellVisual = (cell: QuarryCell): {
  tone: QuarryCellVisualTone
  label: string
  ariaLabel: string
  isRare: boolean
  icon: typeof Pickaxe | null
  iconClass: string
} => {
  if (cell.state === 'surface') {
    return {
      tone: 'surface',
      label: '深脉石壳',
      ariaLabel: `第 ${cell.index + 1} 格，深脉石壳，点击凿开`,
      isRare: true,
      icon: Pickaxe,
      iconClass: 'quarry-cell__fallback--surface'
    }
  }

  if (cell.state === 'monster') {
    return {
      tone: 'monster',
      label: '怪物',
      ariaLabel: `第 ${cell.index + 1} 格，怪物，HP ${cell.monsterHp ?? 0}，点击交战`,
      isRare: true,
      icon: ShieldAlert,
      iconClass: 'quarry-cell__fallback--monster'
    }
  }

  if (cell.state === 'treasure') {
    return {
      tone: 'treasure',
      label: '旧宝箱',
      ariaLabel: `第 ${cell.index + 1} 格，旧宝箱，点击收取`,
      isRare: true,
      icon: Package,
      iconClass: 'quarry-cell__fallback--treasure'
    }
  }

  if (cell.state === 'artifact') {
    return {
      tone: 'artifact',
      label: '古物点',
      ariaLabel: `第 ${cell.index + 1} 格，古物点，点击收取`,
      isRare: true,
      icon: Archive,
      iconClass: 'quarry-cell__fallback--artifact'
    }
  }

  if (cell.state === 'deep') {
    return {
      tone: 'deep',
      label: '深脉点',
      ariaLabel: `第 ${cell.index + 1} 格，深脉点，高体力消耗，点击收取`,
      isRare: true,
      icon: Sparkles,
      iconClass: 'quarry-cell__fallback--deep'
    }
  }

  if (cell.state === 'ore') {
    return {
      tone: 'ore',
      label: '矿脉',
      ariaLabel: `第 ${cell.index + 1} 格，矿脉，点击采集`,
      isRare: false,
      icon: Gem,
      iconClass: 'quarry-cell__fallback--ore'
    }
  }

  if (cell.state === 'gem') {
    return {
      tone: 'gem',
      label: '宝石点',
      ariaLabel: `第 ${cell.index + 1} 格，宝石点，点击采集`,
      isRare: true,
      icon: Gem,
      iconClass: 'quarry-cell__fallback--gem'
    }
  }

  if (cell.state === 'wood') {
    return {
      tone: 'wood',
      label: '枯木竹根',
      ariaLabel: `第 ${cell.index + 1} 格，枯木竹根，点击收取`,
      isRare: false,
      icon: TreePine,
      iconClass: 'quarry-cell__fallback--wood'
    }
  }

  if (cell.state === 'rock') {
    return {
      tone: 'rock',
      label: '碎石堆',
      ariaLabel: `第 ${cell.index + 1} 格，碎石堆，点击采集`,
      isRare: false,
      icon: Pickaxe,
      iconClass: 'quarry-cell__fallback--rock'
    }
  }

  return {
    tone: 'empty',
    label: '空地',
    ariaLabel: `第 ${cell.index + 1} 格，空地`,
    isRare: false,
    icon: CircleDot,
    iconClass: 'quarry-cell__fallback--empty'
  }
}

const getQuarryCellLabel = (cell: QuarryCell) => {
  const visual = getQuarryCellVisual(cell)
  return visual.tone === 'empty' ? visual.label : `${visual.label}（${isCellClickable(cell) ? '点击处理' : '空地'}）`
}

const getQuarryCellClass = (cell: QuarryCell) => {
  if (cell.state === 'surface') return 'quarry-cell--surface'
  if (cell.state === 'monster') return 'quarry-cell--monster'
  if (isCollectableCell(cell)) {
    return `quarry-cell--resource quarry-cell--resource-${cell.kind ?? cell.state}`
  }
  return 'quarry-cell--empty'
}

const getQuarryMineNodeIcon = (node: QuarryMineNode) => {
  if (node.state === 'cleared') return Check
  if (node.kind === 'monster') return ShieldAlert
  if (node.kind === 'chest') return Package
  if (node.kind === 'final') return Sparkles
  return Pickaxe
}

const getQuarryMineNodeShortLabel = (node: QuarryMineNode) => {
  if (node.kind === 'monster') return '遭遇'
  if (node.kind === 'chest') return '旧箱'
  if (node.kind === 'final') return '终点'
  return '矿点'
}

const getQuarryMineNodeStateLabel = (node: QuarryMineNode) => {
  if (node.state === 'cleared') return '已清'
  if (canResolveQuarryMineNode(node)) return '当前'
  return '待前进'
}

const getQuarryMineNodeActionLabel = (node: QuarryMineNode) => {
  if (node.kind === 'monster') return '处理遭遇'
  if (node.kind === 'chest') return '开启旧箱'
  if (node.kind === 'final') return quarryStore.quarryMineStatus.finalRewardClaimed ? '领取补给' : '领取奖励'
  return '清理矿点'
}

const getQuarryMineNodeActionCopy = (node: QuarryMineNode) => {
  if (node.kind === 'monster') return '这一段有怪物拦路，稳进更安全，强攻更疼，细搜会多耗体力确认岔口。'
  if (node.kind === 'chest') return '旧矿工箱里的东西会先进背包，细搜能多翻出一点，背包满时会保留在原地。'
  if (node.kind === 'final') return quarryStore.quarryMineStatus.finalRewardClaimed ? '这是本轮终点补给，领取后旧支道进入刷新等待。' : '这是首通灵器碎片，领取后后续旧支道会周期刷新。'
  return '清掉这段碎矿会获得材料；强攻会多凿一点，细搜会多查矿缝。'
}

const getQuarryMineNodeAriaLabel = (node: QuarryMineNode) =>
  `${node.label}，${getQuarryMineNodeStateLabel(node)}，${getQuarryMineNodeActionLabel(node)}`

const getQuarryMineNodeClass = (node: QuarryMineNode) => {
  const stateClass = node.state === 'cleared' ? 'quarry-mine-node--cleared' : 'quarry-mine-node--available'
  const currentClass = canResolveQuarryMineNode(node) ? 'quarry-mine-node--current' : ''
  return `${stateClass} ${currentClass} quarry-mine-node--${node.kind}`
}

const canResolveQuarryMineNode = (node: QuarryMineNode) => {
  const status = quarryStore.quarryMineStatus
  if (node.state === 'cleared') return false
  if (node.kind === 'final') return status.canClaimFinalReward || status.nextNodeIndex === node.index
  return status.enteredToday && status.nextNodeIndex === node.index
}

const getQuarryMinePhaseClass = (phase: 'entry' | 'route' | 'final') => {
  const status = quarryStore.quarryMineStatus
  const active =
    (phase === 'entry' && !status.entered && !status.completed) ||
    (phase === 'route' && status.entered && !status.completed && !status.canClaimFinalReward) ||
    (phase === 'final' && (status.completed || status.canClaimFinalReward))
  const done =
    (phase === 'entry' && (status.entered || status.completed)) ||
    (phase === 'route' && (status.completed || status.canClaimFinalReward)) ||
    (phase === 'final' && status.completed)
  return {
    'quarry-mine-phase-chip': true,
    'quarry-mine-phase-chip--active': active,
    'quarry-mine-phase-chip--done': done
  }
}

const handleQuarryMinePrimaryAction = () => {
  const status = quarryStore.quarryMineStatus
  const node = quarryMineCurrentNode.value
  if (node && canResolveQuarryMineNode(node)) {
    handleQuarryMineNode(node.index)
    return
  }
  if (status.canEnter) handleEnterQuarryMine()
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
  const usedElixirId = selectedQuarryMineElixirId.value
  const result = quarryStore.resolveQuarryMineNode(index, selectedQuarryMineMode.value, usedElixirId)
  if (!result.success) {
    sfxClick()
    showFloat(result.message, 'danger')
    return
  }
  sfxMine()
  pushExploreLog(result.message)
  if (usedElixirId && inventoryStore.getTotalItemCount(usedElixirId) <= 0) selectedQuarryMineElixirId.value = null
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
    showFloat(`-${dealtDamage}`, 'accent')
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
.quarry-page {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.quarry-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.quarry-title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
  color: rgb(var(--color-accent-rgb));
  font-size: 0.875rem;
  line-height: 1.2;
}

.quarry-subtitle {
  margin-top: 3px;
  color: rgb(var(--color-muted-rgb));
  font-size: 0.625rem;
  line-height: 1.2;
}

.quarry-day-chip {
  display: inline-flex;
  align-items: center;
  border: 1px solid rgb(var(--color-accent-rgb) / 0.18);
  border-radius: 2px;
  padding: 1px 4px;
  font-size: 0.5rem;
  line-height: 1.3;
}

.quarry-day-chip--day {
  color: rgb(var(--color-success-rgb));
}

.quarry-day-chip--night {
  border-color: rgb(var(--color-warning-rgb) / 0.28);
  color: rgb(var(--color-warning-rgb));
}

.quarry-icon-button {
  min-height: 24px;
  padding: 2px 6px;
}

.quarry-map-modal {
  background:
    linear-gradient(145deg, rgb(var(--color-panel)), rgb(var(--color-bg) / 0.96)),
    rgb(var(--color-panel));
}

.quarry-shell {
  overflow: hidden;
  border: 1px solid rgb(var(--color-accent-rgb) / 0.24);
  border-radius: 2px;
  background:
    linear-gradient(180deg, rgb(var(--color-accent-rgb) / 0.05), transparent 28%),
    rgb(var(--color-panel) / 0.82);
}

.quarry-locked-scene {
  position: relative;
  min-height: 220px;
  overflow: hidden;
  border-bottom: 1px solid rgb(var(--color-accent-rgb) / 0.16);
  background:
    linear-gradient(180deg, rgb(var(--color-water-rgb) / 0.16), transparent 36%),
    radial-gradient(circle at 18% 12%, rgb(var(--color-accent-rgb) / 0.18), transparent 22%),
    linear-gradient(145deg, rgb(24 21 18), rgb(var(--color-bg)));
}

.quarry-locked-scene__sky {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(150deg, transparent 50%, rgb(var(--color-text) / 0.08) 51%, transparent 53%),
    linear-gradient(28deg, transparent 60%, rgb(var(--color-accent-rgb) / 0.1) 61%, transparent 63%);
  opacity: 0.7;
}

.quarry-locked-scene__gate {
  position: absolute;
  left: 50%;
  top: 34%;
  display: flex;
  width: 86px;
  height: 64px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(var(--color-accent-rgb) / 0.26);
  background:
    linear-gradient(90deg, rgb(var(--color-accent-rgb) / 0.18) 1px, transparent 1px),
    linear-gradient(180deg, rgb(var(--color-bg) / 0.92), rgb(var(--color-panel) / 0.5));
  background-size: 18px 100%, 100% 100%;
  color: rgb(var(--color-muted-rgb));
  transform: translate(-50%, -50%);
}

.quarry-locked-scene__copy {
  position: relative;
  z-index: 1;
  margin-left: auto;
  margin-right: auto;
  max-width: 420px;
  padding: 134px 18px 18px;
  text-align: center;
}

.quarry-unlock-list {
  display: grid;
  gap: 6px;
  padding: 12px;
}

.quarry-unlock-row {
  display: flex;
  min-height: 34px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid rgb(var(--color-accent-rgb) / 0.12);
  border-radius: 2px;
  padding: 6px 8px;
  background: rgb(var(--color-bg) / 0.22);
}

.quarry-unlock-row--met {
  border-color: rgb(var(--color-success-rgb) / 0.22);
  color: rgb(var(--color-success-rgb));
}

.quarry-unlock-row--locked {
  color: rgb(var(--color-muted-rgb));
}

.quarry-unlock-row__value {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
  font-size: 0.625rem;
}

.quarry-dashboard {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
  padding: 10px;
}

.quarry-stage,
.quarry-care-panel {
  min-width: 0;
}

.quarry-scene {
  position: relative;
  overflow: hidden;
  border: 1px solid rgb(var(--color-accent-rgb) / 0.2);
  border-radius: 2px;
  background:
    radial-gradient(circle at 12% 8%, rgb(var(--color-highlight-rgb) / 0.16), transparent 18%),
    radial-gradient(circle at 85% 18%, rgb(var(--color-water-rgb) / 0.14), transparent 24%),
    linear-gradient(180deg, rgb(68 57 43 / 0.5), rgb(var(--color-bg) / 0.88) 46%, rgb(35 31 27));
  box-shadow: inset 0 0 0 1px rgb(var(--color-text) / 0.03);
}

.quarry-scene--night {
  background:
    radial-gradient(circle at 78% 12%, rgb(var(--color-warning-rgb) / 0.16), transparent 14%),
    linear-gradient(180deg, rgb(24 28 43 / 0.86), rgb(var(--color-bg) / 0.92) 52%, rgb(20 19 23));
}

.quarry-scene__ridge {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(150deg, transparent 48%, rgb(var(--color-text) / 0.06) 49%, transparent 51%),
    linear-gradient(25deg, transparent 68%, rgb(var(--color-accent-rgb) / 0.07) 69%, transparent 71%),
    radial-gradient(ellipse at 50% 112%, rgb(var(--color-bg) / 0.86), transparent 56%);
}

.quarry-scene__header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 10px;
}

.quarry-scene__eyebrow {
  color: rgb(var(--color-muted-rgb));
  font-size: 0.5625rem;
  line-height: 1.2;
}

.quarry-scene__title {
  margin-top: 2px;
  color: rgb(var(--color-accent-rgb));
  font-size: 0.875rem;
  line-height: 1.2;
}

.quarry-scene__badges {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
}

.quarry-scene__badges span {
  border: 1px solid rgb(var(--color-accent-rgb) / 0.16);
  border-radius: 2px;
  background: rgb(var(--color-bg) / 0.35);
  padding: 3px 5px;
  color: rgb(var(--color-muted-rgb));
  font-size: 0.5625rem;
  line-height: 1;
}

.quarry-grid-scroll {
  position: relative;
  z-index: 1;
  overflow: auto;
  padding: 0 10px 10px;
  scrollbar-width: thin;
}

.quarry-grid {
  --quarry-cell-size: 28px;
  display: grid;
  width: max-content;
  min-width: 100%;
  gap: 3px;
  margin: 0 auto;
  border: 1px solid rgb(var(--color-bg) / 0.58);
  border-radius: 2px;
  padding: 6px;
  background:
    linear-gradient(90deg, rgb(var(--color-text) / 0.035) 1px, transparent 1px),
    linear-gradient(180deg, rgb(var(--color-text) / 0.025) 1px, transparent 1px),
    rgb(43 35 28 / 0.72);
  background-size: calc(var(--quarry-cell-size) + 3px) calc(var(--quarry-cell-size) + 3px);
  box-shadow: inset 0 0 24px rgb(0 0 0 / 0.22);
}

.quarry-cell {
  position: relative;
  display: flex;
  width: var(--quarry-cell-size);
  min-width: 0;
  aspect-ratio: 1 / 1;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid rgb(var(--color-accent-rgb) / 0.1);
  border-radius: 2px;
  padding: 0;
  background: rgb(var(--color-bg) / 0.48);
  box-shadow:
    inset 0 1px 0 rgb(var(--color-text) / 0.04),
    inset 0 -6px 10px rgb(0 0 0 / 0.12);
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
}

.quarry-cell__ground {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.quarry-cell__ground::before,
.quarry-cell__ground::after {
  content: '';
  position: absolute;
  inset: 0;
}

.quarry-cell__ground::before {
  background:
    linear-gradient(145deg, transparent 18%, rgb(var(--color-text) / 0.045) 19%, transparent 24%),
    linear-gradient(32deg, transparent 58%, rgb(var(--color-accent-rgb) / 0.055) 59%, transparent 64%);
}

.quarry-cell__ground::after {
  opacity: 0;
}

.quarry-cell--empty {
  border-color: rgb(var(--color-accent-rgb) / 0.06);
  background: rgb(39 33 27 / 0.68);
}

.quarry-cell--empty .quarry-cell__ground::before {
  opacity: 0.38;
}

.quarry-cell--surface {
  border-color: rgb(var(--color-danger-rgb) / 0.34);
  background: linear-gradient(180deg, rgb(var(--color-danger-rgb) / 0.14), rgb(var(--color-bg) / 0.76));
}

.quarry-cell--surface .quarry-cell__ground::after,
.quarry-cell--resource-deep .quarry-cell__ground::after {
  opacity: 1;
  background:
    linear-gradient(130deg, transparent 45%, rgb(var(--color-danger-rgb) / 0.28) 46%, transparent 50%),
    linear-gradient(40deg, transparent 62%, rgb(var(--color-warning-rgb) / 0.18) 63%, transparent 66%);
}

.quarry-cell--monster {
  border-color: rgb(var(--color-danger-rgb) / 0.42);
  background: linear-gradient(180deg, rgb(var(--color-danger-rgb) / 0.18), rgb(var(--color-bg) / 0.78));
}

.quarry-cell--resource {
  border-color: rgb(var(--color-accent-rgb) / 0.2);
  background: linear-gradient(180deg, rgb(var(--color-accent-rgb) / 0.1), rgb(var(--color-bg) / 0.72));
}

.quarry-cell--resource-ore {
  border-color: rgb(var(--color-warning-rgb) / 0.28);
}

.quarry-cell--resource-gem {
  border-color: rgb(168 196 212 / 0.36);
}

.quarry-cell--resource-wood {
  border-color: rgb(var(--color-success-rgb) / 0.32);
  background: linear-gradient(180deg, rgb(var(--color-success-rgb) / 0.1), rgb(var(--color-bg) / 0.72));
}

.quarry-cell--resource-deep {
  border-color: rgb(var(--color-danger-rgb) / 0.44);
}

.quarry-cell--resource-treasure {
  border-color: rgb(var(--color-warning-rgb) / 0.46);
}

.quarry-cell--resource-artifact {
  border-color: rgb(var(--color-water-rgb) / 0.44);
}

.quarry-cell--rare {
  box-shadow:
    inset 0 1px 0 rgb(var(--color-text) / 0.05),
    0 0 0 1px rgb(var(--color-highlight-rgb) / 0.06),
    0 0 12px rgb(var(--color-highlight-rgb) / 0.06);
}

.quarry-cell:disabled {
  cursor: default;
}

.quarry-cell:not(:disabled):hover {
  z-index: 3;
  border-color: rgb(var(--color-accent-rgb) / 0.58);
  transform: translateY(-1px);
}

.quarry-cell__item,
.quarry-cell__fallback,
.quarry-cell-qty,
.quarry-cell-hp-bar {
  position: relative;
  z-index: 1;
}

.quarry-cell__item {
  width: min(82%, 28px) !important;
  height: min(82%, 28px) !important;
  border-color: rgb(var(--color-accent-rgb) / 0.12);
  background: rgb(var(--color-bg) / 0.2);
}

.quarry-cell__fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 70%;
  height: 70%;
  border: 1px solid rgb(var(--color-accent-rgb) / 0.12);
  border-radius: 2px;
  background: rgb(var(--color-bg) / 0.18);
}

.quarry-cell__fallback--empty {
  color: rgb(var(--color-muted-rgb) / 0.42);
  background: transparent;
  border-color: transparent;
}

.quarry-cell__fallback--surface,
.quarry-cell__fallback--deep {
  color: rgb(var(--color-danger-rgb));
}

.quarry-cell__fallback--monster {
  color: rgb(var(--color-danger-rgb));
}

.quarry-cell__fallback--treasure {
  color: rgb(var(--color-warning-rgb));
}

.quarry-cell__fallback--artifact {
  color: rgb(var(--color-water-rgb));
}

.quarry-cell__fallback--wood {
  color: rgb(var(--color-success-rgb));
}

.quarry-cell__fallback--ore,
.quarry-cell__fallback--gem,
.quarry-cell__fallback--rock {
  color: rgb(var(--color-accent-rgb));
}

.quarry-cell-qty {
  position: absolute;
  right: 2px;
  bottom: 1px;
  z-index: 2;
  border: 1px solid rgb(var(--color-bg) / 0.4);
  background: rgb(var(--color-bg) / 0.72);
  color: rgb(var(--color-text));
  font-size: 0.5rem;
  line-height: 1;
  padding: 1px 2px;
}

.quarry-cell-hp-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2;
  height: 3px;
  background: rgb(var(--color-bg) / 0.58);
}

.quarry-cell-hp-fill {
  display: block;
  height: 100%;
  background: rgb(var(--color-danger-rgb));
  transition: width 0.2s ease;
}

.quarry-scene__legend {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 0 10px 10px;
}

.quarry-scene__legend span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  border: 1px solid rgb(var(--color-accent-rgb) / 0.12);
  background: rgb(var(--color-bg) / 0.34);
  padding: 3px 5px;
  color: rgb(var(--color-muted-rgb));
  font-size: 0.5625rem;
  line-height: 1;
}

.quarry-care-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quarry-metric-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.quarry-metric {
  min-width: 0;
  border: 1px solid rgb(var(--color-accent-rgb) / 0.12);
  border-radius: 2px;
  background: rgb(var(--color-bg) / 0.24);
  padding: 6px 7px;
}

.quarry-metric span {
  display: block;
  color: rgb(var(--color-muted-rgb));
  font-size: 0.5625rem;
  line-height: 1.2;
}

.quarry-metric strong {
  display: block;
  margin-top: 3px;
  color: rgb(var(--color-accent-rgb));
  font-size: 0.8125rem;
  line-height: 1.1;
}

.quarry-panel-block {
  border: 1px solid rgb(var(--color-accent-rgb) / 0.13);
  border-radius: 2px;
  background: rgb(var(--color-bg) / 0.18);
  padding: 8px;
}

.quarry-weekly-block {
  background:
    linear-gradient(90deg, rgb(var(--color-success-rgb) / 0.05), transparent),
    rgb(var(--color-bg) / 0.18);
}

.quarry-block-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: rgb(var(--color-accent-rgb));
  font-size: 0.6875rem;
  line-height: 1.2;
}

.quarry-block-title span {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 4px;
}

.quarry-block-title span:last-child {
  flex: 0 0 auto;
  color: rgb(var(--color-muted-rgb));
  font-size: 0.5625rem;
}

.quarry-block-note {
  margin-top: 6px;
  color: rgb(var(--color-muted-rgb));
  font-size: 0.625rem;
  line-height: 1.55;
}

.quarry-progress-track {
  height: 6px;
  margin-top: 8px;
  overflow: hidden;
  border: 1px solid rgb(var(--color-accent-rgb) / 0.12);
  border-radius: 2px;
  background: rgb(var(--color-bg) / 0.48);
}

.quarry-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, rgb(var(--color-success-rgb)), rgb(var(--color-accent-rgb)));
  transition: width 0.2s ease;
}

.quarry-mine-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  border: 1px solid rgb(var(--color-accent-rgb) / 0.14);
  border-radius: 2px;
  background:
    linear-gradient(135deg, rgb(var(--color-accent-rgb) / 0.06), transparent 62%),
    rgb(var(--color-bg) / 0.25);
  padding: 8px;
}

.quarry-mine-summary--active {
  border-color: rgb(var(--color-accent-rgb) / 0.28);
  background:
    linear-gradient(135deg, rgb(var(--color-accent-rgb) / 0.12), transparent 64%),
    rgb(var(--color-bg) / 0.32);
}

.quarry-mine-summary--final {
  border-color: rgb(var(--color-warning-rgb) / 0.28);
  background:
    linear-gradient(135deg, rgb(var(--color-warning-rgb) / 0.1), transparent 64%),
    rgb(var(--color-bg) / 0.28);
}

.quarry-mine-summary--done {
  border-color: rgb(var(--color-success-rgb) / 0.18);
  background:
    linear-gradient(135deg, rgb(var(--color-success-rgb) / 0.07), transparent 64%),
    rgb(var(--color-bg) / 0.18);
}

.quarry-mine-phase {
  color: rgb(var(--color-muted-rgb));
  font-size: 0.5625rem;
  line-height: 1.2;
}

.quarry-mine-summary__title {
  margin-top: 2px;
  color: rgb(var(--color-text));
  font-size: 0.75rem;
  line-height: 1.25;
}

.quarry-mine-summary__copy {
  margin-top: 3px;
  color: rgb(var(--color-muted-rgb));
  font-size: 0.5625rem;
  line-height: 1.4;
}

.quarry-mine-primary,
.quarry-expand-btn {
  min-height: 26px;
  padding: 4px 8px;
  font-size: 0.625rem;
}

.quarry-mine-primary {
  min-width: 74px;
  white-space: nowrap;
}

.quarry-expand-btn {
  width: 100%;
  margin-top: 8px;
}

.quarry-mine-phase-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  margin-top: 8px;
}

.quarry-mine-phase-chip {
  position: relative;
  min-width: 0;
  border: 1px solid rgb(var(--color-accent-rgb) / 0.1);
  border-radius: 2px;
  background: rgb(var(--color-bg) / 0.18);
  padding: 4px 3px;
  color: rgb(var(--color-muted-rgb));
  font-size: 0.5625rem;
  line-height: 1;
  text-align: center;
}

.quarry-mine-phase-chip--active {
  border-color: rgb(var(--color-accent-rgb) / 0.35);
  color: rgb(var(--color-accent-rgb));
}

.quarry-mine-phase-chip--done {
  border-color: rgb(var(--color-success-rgb) / 0.22);
  color: rgb(var(--color-success-rgb));
}

.quarry-mine-mode-panel {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
  margin-top: 8px;
}

.quarry-mine-mode {
  display: grid;
  min-width: 0;
  gap: 3px;
  border: 1px solid rgb(var(--color-accent-rgb) / 0.13);
  border-radius: 2px;
  padding: 6px 5px;
  background: rgb(var(--color-bg) / 0.2);
  color: rgb(var(--color-muted-rgb));
  text-align: left;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.quarry-mine-mode:hover {
  border-color: rgb(var(--color-accent-rgb) / 0.32);
  background: rgb(var(--color-accent-rgb) / 0.06);
}

.quarry-mine-mode:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.quarry-mine-mode--active {
  border-color: rgb(var(--color-accent-rgb) / 0.46);
  background:
    linear-gradient(135deg, rgb(var(--color-accent-rgb) / 0.13), transparent 68%),
    rgb(var(--color-bg) / 0.32);
  color: rgb(var(--color-accent-rgb));
}

.quarry-mine-mode__head {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 4px;
  font-size: 0.625rem;
  line-height: 1.15;
}

.quarry-mine-mode__cost {
  color: rgb(var(--color-text));
  font-size: 0.5625rem;
  line-height: 1.15;
}

.quarry-mine-mode__effect {
  color: rgb(var(--color-muted-rgb));
  font-size: 0.5rem;
  line-height: 1.3;
}

.quarry-mine-progress-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
  color: rgb(var(--color-muted-rgb));
  font-size: 0.5625rem;
  line-height: 1.2;
}

.quarry-mine-progress-meta span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quarry-mine-progress-track {
  height: 5px;
  margin-top: 5px;
  overflow: hidden;
  border: 1px solid rgb(var(--color-accent-rgb) / 0.12);
  border-radius: 2px;
  background: rgb(var(--color-bg) / 0.44);
}

.quarry-mine-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, rgb(var(--color-accent-rgb)), rgb(var(--color-success-rgb)));
  transition: width 0.2s ease;
}

.quarry-mine-route {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 5px;
  margin-top: 10px;
  padding-top: 2px;
}

.quarry-mine-route::before {
  content: '';
  position: absolute;
  left: 12px;
  right: 12px;
  top: 15px;
  height: 1px;
  background:
    linear-gradient(90deg, rgb(var(--color-success-rgb) / 0.34), rgb(var(--color-accent-rgb) / 0.18)),
    rgb(var(--color-accent-rgb) / 0.12);
}

.quarry-mine-node {
  position: relative;
  z-index: 1;
  display: flex;
  width: 42px;
  min-width: 0;
  flex: 1 1 0;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  border: 0;
  padding: 0;
  background: transparent;
  color: rgb(var(--color-muted-rgb));
  font-size: 0.5625rem;
  line-height: 1.1;
  transition:
    color 0.15s ease,
    transform 0.15s ease;
}

.quarry-mine-node:not(:disabled):hover {
  color: rgb(var(--color-accent-rgb));
  transform: translateY(-1px);
}

.quarry-mine-node:disabled {
  cursor: default;
}

.quarry-mine-node-dot {
  display: inline-flex;
  width: 26px;
  height: 26px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(var(--color-accent-rgb) / 0.16);
  border-radius: 999px;
  background: rgb(var(--color-panel) / 0.9);
  color: rgb(var(--color-muted-rgb));
  box-shadow: 0 0 0 2px rgb(var(--color-bg) / 0.72);
}

.quarry-mine-node-label,
.quarry-mine-node-state {
  display: block;
  max-width: 46px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quarry-mine-node-state {
  color: rgb(var(--color-muted-rgb) / 0.7);
  font-size: 0.5rem;
}

.quarry-mine-node--cleared .quarry-mine-node-dot {
  border-color: rgb(var(--color-success-rgb) / 0.28);
  background: rgb(var(--color-success-rgb) / 0.12);
  color: rgb(var(--color-success-rgb));
}

.quarry-mine-node--available.quarry-mine-node--monster {
  color: rgb(var(--color-danger-rgb) / 0.86);
}

.quarry-mine-node--available.quarry-mine-node--chest,
.quarry-mine-node--available.quarry-mine-node--final {
  color: rgb(var(--color-warning-rgb) / 0.88);
}

.quarry-mine-node--current .quarry-mine-node-dot {
  border-color: rgb(var(--color-accent-rgb) / 0.55);
  background:
    radial-gradient(circle, rgb(var(--color-accent-rgb) / 0.2), rgb(var(--color-bg) / 0.72));
  color: rgb(var(--color-accent-rgb));
  box-shadow:
    0 0 0 2px rgb(var(--color-bg) / 0.72),
    0 0 14px rgb(var(--color-accent-rgb) / 0.18);
}

.quarry-mine-node--current .quarry-mine-node-label,
.quarry-mine-node--current .quarry-mine-node-state {
  color: rgb(var(--color-accent-rgb));
}

.quarry-mine-focus {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 7px;
  margin-top: 10px;
  border: 1px solid rgb(var(--color-accent-rgb) / 0.12);
  border-radius: 2px;
  background: rgb(var(--color-bg) / 0.22);
  padding: 7px;
}

.quarry-mine-focus__icon {
  display: inline-flex;
  width: 26px;
  height: 26px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(var(--color-accent-rgb) / 0.16);
  border-radius: 2px;
  background: rgb(var(--color-bg) / 0.34);
  color: rgb(var(--color-accent-rgb));
}

.quarry-mine-focus__title {
  color: rgb(var(--color-accent-rgb));
  font-size: 0.6875rem;
  line-height: 1.25;
}

.quarry-mine-focus__copy {
  margin-top: 2px;
  color: rgb(var(--color-muted-rgb));
  font-size: 0.5625rem;
  line-height: 1.45;
}

.quarry-mine-focus--danger {
  border-color: rgb(var(--color-danger-rgb) / 0.2);
}

.quarry-mine-focus--danger .quarry-mine-focus__icon,
.quarry-mine-focus--danger .quarry-mine-focus__title {
  color: rgb(var(--color-danger-rgb));
}

.quarry-mine-focus--treasure,
.quarry-mine-focus--final {
  border-color: rgb(var(--color-warning-rgb) / 0.22);
}

.quarry-mine-focus--treasure .quarry-mine-focus__icon,
.quarry-mine-focus--treasure .quarry-mine-focus__title,
.quarry-mine-focus--final .quarry-mine-focus__icon,
.quarry-mine-focus--final .quarry-mine-focus__title {
  color: rgb(var(--color-warning-rgb));
}

.quarry-mine-focus--done {
  border-color: rgb(var(--color-success-rgb) / 0.16);
}

.quarry-mine-focus--done .quarry-mine-focus__icon,
.quarry-mine-focus--done .quarry-mine-focus__title {
  color: rgb(var(--color-success-rgb));
}

.quarry-missing-list {
  display: grid;
  gap: 3px;
  margin-top: 7px;
}

.quarry-missing-list p {
  color: rgb(var(--color-danger-rgb));
  font-size: 0.5625rem;
  line-height: 1.35;
}

.quarry-log,
.quarry-combat-log {
  display: flex;
  max-height: 6.5rem;
  flex-direction: column;
  gap: 3px;
  overflow-y: auto;
  font-size: 0.6875rem;
  line-height: 1.45;
}

.quarry-log {
  margin-top: 8px;
}

.quarry-combat-overlay {
  padding-top: calc(16px + env(safe-area-inset-top, 0px));
}

.quarry-combat-panel {
  display: flex;
  max-height: calc(100dvh - 32px);
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgb(var(--color-danger-rgb) / 0.08), transparent 24%),
    rgb(var(--color-panel));
}

.quarry-combat-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.quarry-weapon-strip {
  border-top: 1px solid rgb(var(--color-accent-rgb) / 0.14);
  border-bottom: 1px solid rgb(var(--color-accent-rgb) / 0.14);
  padding: 7px 0;
  color: rgb(var(--color-muted-rgb));
  font-size: 0.6875rem;
  line-height: 1.45;
}

.quarry-combat-arena {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 7px;
}

.quarry-combat-side {
  min-width: 0;
  border: 1px solid rgb(var(--color-accent-rgb) / 0.13);
  border-radius: 2px;
  background: rgb(var(--color-bg) / 0.25);
  padding: 8px;
  text-align: center;
}

.quarry-combat-side--monster {
  border-color: rgb(var(--color-danger-rgb) / 0.24);
}

.quarry-combat-hp-track {
  height: 7px;
  margin: 7px 0 5px;
  overflow: hidden;
  border: 1px solid rgb(var(--color-accent-rgb) / 0.1);
  border-radius: 2px;
  background: rgb(var(--color-bg) / 0.58);
}

.quarry-combat-hp-fill {
  height: 100%;
  transition: width 0.18s ease;
}

.quarry-combat-hp-fill--safe {
  background: rgb(var(--color-success-rgb));
}

.quarry-combat-hp-fill--danger {
  background: rgb(var(--color-danger-rgb));
}

.quarry-combat-versus {
  color: rgb(var(--color-muted-rgb) / 0.6);
  font-size: 0.625rem;
}

.quarry-combat-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.quarry-combat-action {
  display: flex;
  min-height: 52px;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border: 1px solid rgb(var(--color-accent-rgb) / 0.18);
  border-radius: 2px;
  padding: 6px 4px;
  background: rgb(var(--color-bg) / 0.24);
  color: rgb(var(--color-text));
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.quarry-combat-action span:first-child {
  font-size: 0.75rem;
}

.quarry-combat-action span:last-child {
  color: rgb(var(--color-muted-rgb));
  font-size: 0.5625rem;
  line-height: 1.25;
}

.quarry-combat-action:hover {
  border-color: rgb(var(--color-accent-rgb) / 0.38);
  background: rgb(var(--color-accent-rgb) / 0.08);
}

.quarry-combat-action--danger {
  border-color: rgb(var(--color-danger-rgb) / 0.28);
}

.quarry-combat-action--danger:hover {
  background: rgb(var(--color-danger-rgb) / 0.08);
}

.quarry-combat-log {
  min-height: 0;
  max-height: none;
  border: 1px solid rgb(var(--color-accent-rgb) / 0.12);
  border-radius: 2px;
  background: rgb(var(--color-bg) / 0.22);
  padding: 7px;
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

@media (min-width: 900px) {
  .quarry-dashboard {
    grid-template-columns: minmax(0, 1fr) minmax(250px, 0.42fr);
    align-items: start;
  }

  .quarry-metric-strip {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .quarry-dashboard {
    padding: 8px;
  }

  .quarry-scene__header {
    flex-direction: column;
  }

  .quarry-scene__badges {
    justify-content: flex-start;
  }

  .quarry-grid {
    gap: 2px;
    padding: 5px;
  }

  .quarry-cell__fallback svg {
    width: 11px;
    height: 11px;
  }

  .quarry-cell__item {
    width: min(86%, 24px) !important;
    height: min(86%, 24px) !important;
  }

  .quarry-mine-summary {
    grid-template-columns: minmax(0, 1fr);
  }

  .quarry-mine-primary {
    width: 100%;
  }

  .quarry-mine-mode-panel {
    grid-template-columns: minmax(0, 1fr);
  }

  .quarry-mine-mode {
    grid-template-columns: auto auto minmax(0, 1fr);
    align-items: center;
  }

  .quarry-mine-mode__effect {
    text-align: right;
  }
}

@media (max-width: 360px) {
  .mining-status-label {
    display: none;
  }

  .quarry-combat-actions {
    gap: 4px;
  }

  .quarry-combat-action {
    padding-right: 2px;
    padding-left: 2px;
  }
}
</style>
