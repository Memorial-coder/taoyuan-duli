<template>
  <Transition name="panel-fade">
    <div
      v-if="combat && boss && phase"
      class="game-modal-overlay region-boss-combat-overlay fixed inset-0 bg-black/60 flex items-start justify-center overflow-y-auto z-60 p-4"
      data-testid="region-boss-combat-dialog"
    >
      <div class="game-panel max-w-md w-full">
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="min-w-0">
            <p class="text-sm text-danger">首领交战</p>
            <p class="text-lg text-text mt-1 truncate">{{ boss.name }}</p>
            <p class="text-[0.6875rem] text-muted mt-1 leading-5">{{ phase.label }} / 第 {{ combat.round + 1 }} 回合</p>
          </div>
          <span class="text-[0.625rem] text-danger shrink-0">{{ combat.status === 'active' ? '交战中' : combat.status === 'victory' ? '已压制' : '失利' }}</span>
        </div>

        <div class="grid grid-cols-3 gap-2 mb-3 text-[0.625rem]">
          <div class="border border-accent/10 rounded-xs px-2 py-1.5">
            <div class="flex items-center gap-1 text-muted"><Heart :size="12" />生命</div>
            <p class="text-text mt-1">{{ playerHp }}/{{ playerMaxHp }}</p>
          </div>
          <div class="border border-danger/20 rounded-xs px-2 py-1.5">
            <div class="flex items-center gap-1 text-muted"><Zap :size="12" />阶段</div>
            <p class="text-danger mt-1">{{ combat.phaseIndex + 1 }}/{{ boss.phases.length }}</p>
          </div>
          <div class="border border-accent/10 rounded-xs px-2 py-1.5">
            <div class="flex items-center gap-1 text-muted"><Crosshair :size="12" />支援</div>
            <p class="text-accent mt-1 truncate">{{ combat.supportSummary || '无' }}</p>
          </div>
        </div>

        <div class="grid grid-cols-[1fr_auto_1fr] gap-2 mb-3 items-center">
          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-xs text-center mb-2">你</p>
            <div class="bg-bg rounded-xs h-1.5 mb-1">
              <div class="h-1.5 rounded-xs transition-all" :class="playerHpPercent <= 30 ? 'bg-danger' : 'bg-success'" :style="{ width: `${playerHpPercent}%` }" />
            </div>
            <p class="text-[0.625rem]" :class="playerHpPercent <= 30 ? 'text-danger' : 'text-muted'">{{ playerHp }}/{{ playerMaxHp }}</p>
          </div>

          <span class="text-[0.625rem] text-muted/40">VS</span>

          <div class="border border-danger/20 rounded-xs p-2">
            <div class="mb-1.5 flex justify-center">
              <FishBossImage
                kind="regionBoss"
                :id="boss.id"
                :name="boss.name"
                :resolution="256"
                size="md"
              />
            </div>
            <p class="text-xs text-center text-danger mb-2 truncate">{{ phase.label }}</p>
            <div class="bg-bg rounded-xs h-1.5 mb-1">
              <div class="h-1.5 bg-danger rounded-xs transition-all" :style="{ width: `${bossHpPercent}%` }" />
            </div>
            <p class="text-[0.625rem] text-muted">{{ combat.phaseHp }}/{{ combat.phaseMaxHp }}</p>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-1 mb-3">
          <button
            class="border border-accent/20 rounded-xs py-2 text-xs text-accent hover:bg-accent/5 disabled:opacity-50"
            :disabled="actionLocked"
            data-testid="region-boss-combat-action-attack"
            @click="emit('action', 'attack')"
          >
            <Swords :size="12" class="inline" />
            攻击
          </button>
          <button
            class="border border-success/20 rounded-xs py-2 text-xs text-success hover:bg-success/5 disabled:opacity-50"
            :disabled="actionLocked"
            data-testid="region-boss-combat-action-defend"
            @click="emit('action', 'defend')"
          >
            <Shield :size="12" class="inline" />
            防御
          </button>
          <button
            class="border border-danger/20 rounded-xs py-2 text-xs text-danger hover:bg-danger/5 disabled:opacity-50"
            :disabled="actionLocked"
            data-testid="region-boss-combat-action-press"
            @click="emit('action', 'press')"
          >
            <Crosshair :size="12" class="inline" />
            压制
          </button>
        </div>

        <div class="h-32 text-xs space-y-0.5 overflow-y-auto" data-testid="region-boss-combat-log">
          <p
            v-for="(line, index) in combat.log"
            :key="`${combat.combatId}-${index}-${line}`"
            :class="index < combat.log.length - 1 ? 'text-muted' : 'text-text'"
          >
            {{ line }}
          </p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { Crosshair, Heart, Shield, Swords, Zap } from 'lucide-vue-next'
  import FishBossImage from '@/components/game/FishBossImage.vue'
  import type { RegionBossCombatAction, RegionBossCombatState, RegionBossDef } from '@/types/region'

  const props = defineProps<{
    combat: RegionBossCombatState | null
    boss: RegionBossDef | null
    playerHp: number
    playerMaxHp: number
    actionLocked?: boolean
  }>()

  const emit = defineEmits<{
    action: [action: RegionBossCombatAction]
  }>()

  const phase = computed(() =>
    props.boss && props.combat
      ? props.boss.phases[props.combat.phaseIndex] ?? props.boss.phases[0] ?? null
      : null
  )

  const playerHpPercent = computed(() =>
    props.playerMaxHp > 0 ? Math.max(0, Math.min(100, Math.round((props.playerHp / props.playerMaxHp) * 100))) : 0
  )

  const bossHpPercent = computed(() =>
    props.combat && props.combat.phaseMaxHp > 0
      ? Math.max(0, Math.min(100, Math.round((props.combat.phaseHp / props.combat.phaseMaxHp) * 100)))
      : 0
  )
</script>
