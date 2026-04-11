<template>
  <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" @click.self="emit('close')">
    <div class="game-panel max-w-lg w-full max-h-[80vh] overflow-y-auto">
      <!-- 头部 -->
      <div class="flex justify-between items-start mb-2">
        <div>
          <p class="text-sm text-accent">
            {{ npcDef.name }}
            <span class="text-xs text-muted ml-0.5">{{ npcDef.title }}</span>
            <span v-if="state.bonded" class="text-[10px] text-accent border border-accent/30 rounded-xs px-1 ml-1">已结缘</span>
            <span v-else-if="state.courting" class="text-[10px] text-accent/70 border border-accent/20 rounded-xs px-1 ml-1">求缘中</span>
          </p>
          <p class="text-[10px] text-muted/60 mt-0.5">{{ npcDef.personality }}</p>
          <p v-if="showTrueName" class="text-[10px] text-accent/60 mt-0.5">真名：{{ npcDef.trueName }}</p>
        </div>
        <Button @click="emit('close')">关闭</Button>
      </div>

      <!-- 缘分菱形条 -->
      <div class="border border-accent/10 rounded-xs p-2 mb-2">
        <div class="flex items-center justify-between mb-1">
          <div class="flex items-center space-x-px">
            <Diamond
              v-for="d in 12"
              :key="d"
              :size="10"
              class="flex-shrink-0"
              :class="state.affinity >= d * 250 ? 'text-accent' : 'text-muted/20'"
              :fill="state.affinity >= d * 250 ? 'currentColor' : 'none'"
            />
          </div>
          <span class="text-xs" :class="affinityLevelColor">
            {{ state.affinity }}
            <span class="text-muted/40">/3000</span>
          </span>
        </div>
        <div class="flex items-center space-x-1.5 flex-wrap">
          <span class="text-[10px] border rounded-xs px-1" :class="affinityLevelColor">
            {{ AFFINITY_LEVEL_NAMES[hiddenNpcStore.getAffinityLevel(npcId)] }}
          </span>
          <span
            class="text-[10px] border rounded-xs px-1 flex items-center space-x-0.5"
            :class="state.interactedToday ? 'text-muted/40 border-muted/10' : 'text-success border-success/30'"
          >
            <span>{{ state.interactedToday ? '今日已互动' : '可互动' }}</span>
          </span>
          <span
            class="text-[10px] border rounded-xs px-1 flex items-center space-x-0.5"
            :class="state.offeredToday ? 'text-muted/40 border-muted/10' : 'text-accent border-accent/30'"
          >
            <span>供奉 {{ state.offersThisWeek }}/3</span>
          </span>
          <span v-if="hiddenNpcStore.isManifestationDay(npcId)" class="text-[10px] text-accent border border-accent/30 rounded-xs px-1">
            显灵日! 供奉×3
          </span>
        </div>
      </div>

      <!-- 对话 -->
      <div v-if="dialogueText" class="game-panel mb-3 text-xs">
        <p class="text-accent mb-1">「{{ npcDef.name }}」</p>
        <p>{{ dialogueText }}</p>
      </div>

      <!-- 独特互动 -->
      <div class="mb-3">
        <Button class="w-full" :disabled="state.interactedToday || state.specialInteractionCooldown > 0" @click="handleInteraction">
          {{ INTERACTION_NAMES[npcDef.interactionType] }}
          <span v-if="state.specialInteractionCooldown > 0" class="text-muted ml-1">(冷却{{ state.specialInteractionCooldown }}天)</span>
        </Button>
      </div>

      <div class="border border-accent/10 rounded-xs p-2 mb-3 bg-accent/5">
        <p class="text-xs text-accent mb-1">如何推进这位仙灵</p>
        <ul class="text-[10px] text-muted/80 leading-4 space-y-0.5 pl-4 list-disc">
          <li>每天优先做 1 次互动，再决定是否供奉。</li>
          <li>供奉更适合冲缘分门槛；显灵日供奉收益会更高。</li>
          <li>达到求缘 / 结缘门槛后，需要额外准备对应信物。</li>
          <li>“仙缘能力”是缘分达标后逐步解锁；“结缘加成”则是在结缘后长期生效。</li>
        </ul>
      </div>

      <!-- 求缘/结缘面板 -->
      <div v-if="npcDef.bondable" class="border border-accent/20 rounded-xs p-2 mb-3">
        <p class="text-xs text-accent/80 mb-1.5 flex items-center space-x-1">
          <Diamond :size="12" />
          <span>仙缘</span>
        </p>
        <template v-if="state.bonded">
          <p class="text-[10px] text-accent/60 mb-1">永世仙缘 ◆</p>
          <Button class="w-full text-danger border-danger/40" @click="showDissolveConfirm = true">断缘（10000文）</Button>
        </template>
        <template v-else-if="state.courting">
          <p class="text-[10px] text-accent/60 mb-1">求缘中 ◇</p>
          <div class="flex flex-col space-y-0.5 mb-1.5">
            <span
              class="text-[10px] flex items-center space-x-0.5"
              :class="state.affinity >= npcDef.bondThreshold ? 'text-success' : 'text-muted/50'"
            >
              <CircleCheck v-if="state.affinity >= npcDef.bondThreshold" :size="10" />
              <Circle v-else :size="10" />
              缘分≥{{ npcDef.bondThreshold }}
              <span class="text-muted/40">— 当前{{ state.affinity }}</span>
            </span>
            <span
              class="text-[10px] flex items-center space-x-0.5"
              :class="inventoryStore.hasItem(npcDef.bondItemId) ? 'text-success' : 'text-muted/50'"
            >
              <CircleCheck v-if="inventoryStore.hasItem(npcDef.bondItemId)" :size="10" />
              <Circle v-else :size="10" />
              持有{{ getItemById(npcDef.bondItemId)?.name ?? npcDef.bondItemId }}
              <span class="text-muted/40">— {{ getBondItemHint }}</span>
            </span>
          </div>
          <Button class="w-full text-accent border-accent/40" :disabled="!canBond" @click="handleBond">结缘</Button>
        </template>
        <template v-else>
          <div class="flex flex-col space-y-0.5 mb-1.5">
            <span
              class="text-[10px] flex items-center space-x-0.5"
              :class="state.affinity >= npcDef.courtshipThreshold ? 'text-success' : 'text-muted/50'"
            >
              <CircleCheck v-if="state.affinity >= npcDef.courtshipThreshold" :size="10" />
              <Circle v-else :size="10" />
              缘分≥{{ npcDef.courtshipThreshold }}
              <span class="text-muted/40">— 当前{{ state.affinity }}</span>
            </span>
            <span
              class="text-[10px] flex items-center space-x-0.5"
              :class="inventoryStore.hasItem(npcDef.courtshipItemId) ? 'text-success' : 'text-muted/50'"
            >
              <CircleCheck v-if="inventoryStore.hasItem(npcDef.courtshipItemId)" :size="10" />
              <Circle v-else :size="10" />
              持有{{ getItemById(npcDef.courtshipItemId)?.name ?? npcDef.courtshipItemId }}
              <span class="text-muted/40">— {{ getCourtshipItemHint }}</span>
            </span>
          </div>
          <Button class="w-full text-accent border-accent/40" :disabled="!canCourt" @click="handleCourt">求缘</Button>
        </template>
      </div>

      <!-- 断缘确认 -->
      <div v-if="showDissolveConfirm" class="game-panel mb-3 border-accent/40">
        <p class="text-xs text-danger mb-2">确定要与{{ npcDef.name }}断缘吗？（花费10000文）</p>
        <div class="flex space-x-2">
          <Button class="text-danger" @click="handleDissolve">确认</Button>
          <Button @click="showDissolveConfirm = false">取消</Button>
        </div>
      </div>

      <!-- 能力列表 -->
      <div v-if="npcDef.abilities.length > 0" class="mb-3">
        <p class="text-xs text-muted mb-1">仙缘能力：</p>
        <div class="flex flex-col space-y-0.5">
          <div
            v-for="ability in npcDef.abilities"
            :key="ability.id"
            class="text-[10px] border border-accent/10 rounded-xs px-2 py-0.5 flex items-center justify-between"
            :class="state.unlockedAbilities.includes(ability.id) ? 'text-accent' : 'text-muted/40'"
          >
            <span>{{ ability.name }} — {{ ability.description }}</span>
            <span v-if="state.unlockedAbilities.includes(ability.id)" class="text-success">已激活</span>
            <span v-else>缘分{{ ability.affinityRequired }}</span>
          </div>
        </div>
      </div>

      <div v-if="npcDef.bondBonuses.length > 0" class="mb-3">
        <p class="text-xs text-muted mb-1">结缘后加成：</p>
        <div class="flex flex-col space-y-0.5">
          <div
            v-for="(bonus, index) in npcDef.bondBonuses"
            :key="`${npcDef.id}_bond_${index}`"
            class="text-[10px] border border-accent/10 rounded-xs px-2 py-0.5 flex items-center justify-between"
            :class="state.bonded ? 'text-accent' : 'text-muted/50'"
          >
            <span>{{ describeBondBonus(bonus) }}</span>
            <span v-if="state.bonded" class="text-success">生效中</span>
            <span v-else>结缘后解锁</span>
          </div>
        </div>
      </div>

      <!-- 供奉区 -->
      <div>
        <p class="text-xs text-muted mb-2">供奉（选择背包中的物品）</p>
        <template v-if="state.offeredToday">
          <div class="flex flex-col items-center justify-center py-6 text-muted">
            <Diamond :size="32" class="mb-2" />
            <p class="text-xs">今日已供奉过了。</p>
          </div>
        </template>
        <template v-else-if="state.offersThisWeek >= 3">
          <div class="flex flex-col items-center justify-center py-6 text-muted">
            <Diamond :size="32" class="mb-2" />
            <p class="text-xs">本周供奉次数已满。</p>
          </div>
        </template>
        <template v-else>
          <div class="flex flex-col space-y-1 max-h-40 overflow-y-auto">
            <div
              v-for="item in offerableItems"
              :key="`${item.itemId}_${item.quality ?? 'normal'}`"
              class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-1.5 cursor-pointer hover:bg-accent/5"
              @click="handleOffer(item.itemId, item.quality)"
            >
              <span class="flex items-center space-x-1">
                <span class="text-xs" :class="qualityTextClass(item.quality)">
                  {{ getItemById(item.itemId)?.name }}
                </span>
                <span
                  v-if="getOfferingPreference(npcId, item.itemId) !== 'neutral'"
                  class="text-[10px]"
                  :class="OFFERING_PREF_CLASS[getOfferingPreference(npcId, item.itemId)]"
                >
                  {{ OFFERING_PREF_LABELS[getOfferingPreference(npcId, item.itemId)] }}
                </span>
              </span>
              <Diamond :size="12" class="text-muted" />
            </div>
          </div>
          <div v-if="offerableItems.length === 0" class="flex flex-col items-center justify-center py-6 text-muted">
            <Package :size="32" class="mb-2" />
            <p class="text-xs">背包为空</p>
          </div>
        </template>
      </div>

      <!-- 背景故事 -->
      <div class="mt-3 border-t border-accent/10 pt-2">
        <p class="text-[10px] text-muted/50 leading-relaxed">{{ npcDef.origin }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { Diamond, Package, Circle, CircleCheck } from 'lucide-vue-next'
  import { useHiddenNpcStore } from '@/stores/useHiddenNpcStore'
  import { useInventoryStore } from '@/stores/useInventoryStore'
  import { useGameStore } from '@/stores/useGameStore'
  import { getHiddenNpcById } from '@/data/hiddenNpcs'
  import { getItemById, getItemSource } from '@/data'
  import { INTERACTION_NAMES } from '@/types/hiddenNpc'
  import type { AffinityLevel, BondBonusType } from '@/types/hiddenNpc'
  import type { Quality } from '@/types'
  import {
    doOffering,
    doSpecialInteraction,
    doCourting,
    doBond,
    doDissolve,
    getOfferingPreference,
    OFFERING_PREF_LABELS,
    OFFERING_PREF_CLASS,
    OFFERING_PREF_ORDER
  } from '@/composables/useHiddenNpcActions'
  import { triggerHeartEvent } from '@/composables/useDialogs'
  import { addLog } from '@/composables/useGameLog'
  import { handleEndDay } from '@/composables/useEndDay'
  import Button from '@/components/game/Button.vue'

  const props = defineProps<{
    npcId: string
  }>()

  const emit = defineEmits<{
    close: []
  }>()

  const hiddenNpcStore = useHiddenNpcStore()
  const inventoryStore = useInventoryStore()
  const gameStore = useGameStore()

  const npcDef = computed(() => getHiddenNpcById(props.npcId)!)
  const state = computed(() => hiddenNpcStore.getHiddenNpcState(props.npcId)!)

  const AFFINITY_LEVEL_NAMES: Record<AffinityLevel, string> = {
    wary: '警惕',
    curious: '好奇',
    trusting: '信赖',
    devoted: '虔诚',
    eternal: '永恒'
  }

  const affinityLevelColor = computed(() => {
    const level = hiddenNpcStore.getAffinityLevel(props.npcId)
    switch (level) {
      case 'wary':
        return 'text-muted'
      case 'curious':
        return 'text-water'
      case 'trusting':
        return 'text-success'
      case 'devoted':
        return 'text-accent'
      case 'eternal':
        return 'text-accent'
    }
  })

  const showTrueName = computed(() => state.value.affinity >= 2500)

  const dialogueText = ref<string | null>(null)

  const showDissolveConfirm = ref(false)

  const getCourtshipItemHint = computed(() => getItemSource(npcDef.value.courtshipItemId) || '需制作')
  const getBondItemHint = computed(() => getItemSource(npcDef.value.bondItemId) || '需制作')

  const describeBondBonus = (bonus: BondBonusType): string => {
    switch (bonus.type) {
      case 'weather_control':
        return `有${Math.round(bonus.chance * 100)}%概率调控次日天气`
      case 'crop_blessing':
        return `作物有${Math.round(bonus.chance * 100)}%概率获得仙灵祝福`
      case 'animal_blessing':
        return `动物产品有${Math.round(bonus.chance * 100)}%概率提升品质`
      case 'stamina_restore':
        return `每天恢复${bonus.amount}点体力`
      case 'fish_attraction':
        return `有${Math.round(bonus.chance * 100)}%概率吸引灵鱼`
      case 'spirit_shield':
        return `体力消耗-${bonus.staminaSave}% ，最大HP+${bonus.hpBonus}`
      case 'sell_bonus':
        return `出售价格+${bonus.percent}%`
    }

    return '结缘后获得特殊加成'
  }

  const canCourt = computed(() => {
    const s = state.value
    const d = npcDef.value
    if (!d.bondable || s.courting || s.bonded) return false
    if (s.affinity < d.courtshipThreshold) return false
    if (!inventoryStore.hasItem(d.courtshipItemId)) return false
    const existingBond = hiddenNpcStore.hiddenNpcStates.find(st => st.bonded || st.courting)
    if (existingBond && existingBond.npcId !== props.npcId) return false
    return true
  })

  const canBond = computed(() => {
    const s = state.value
    const d = npcDef.value
    if (!s.courting || s.bonded) return false
    if (s.affinity < d.bondThreshold) return false
    if (!inventoryStore.hasItem(d.bondItemId)) return false
    return true
  })

  const qualityTextClass = (q: Quality, fallback = ''): string => {
    if (q === 'fine') return 'text-quality-fine'
    if (q === 'excellent') return 'text-quality-excellent'
    if (q === 'supreme') return 'text-quality-supreme'
    return fallback
  }

  const offerableItems = computed(() => {
    const filtered = inventoryStore.items.filter(i => {
      const def = getItemById(i.itemId)
      return def && def.category !== 'seed'
    })
    return [...filtered].sort(
      (a, b) =>
        (OFFERING_PREF_ORDER[getOfferingPreference(props.npcId, a.itemId)] ?? 2) -
        (OFFERING_PREF_ORDER[getOfferingPreference(props.npcId, b.itemId)] ?? 2)
    )
  })

  /** 检查心事件并触发 */
  const checkAndTriggerHeartEvent = () => {
    const heartEvent = hiddenNpcStore.checkHeartEvent(props.npcId)
    if (heartEvent) {
      triggerHeartEvent(heartEvent)
    }
  }

  /** 检查是否因时间推进需要结束当天 */
  const checkPassout = () => {
    if (gameStore.isPastBedtime) {
      addLog('太晚了，你精疲力竭地回到了家。')
      emit('close')
      handleEndDay()
    }
  }

  const handleInteraction = () => {
    const success = doSpecialInteraction(props.npcId)
    if (success) {
      const level = hiddenNpcStore.getAffinityLevel(props.npcId)
      const dialogues = npcDef.value.dialogues[level]
      dialogueText.value = dialogues[Math.floor(Math.random() * dialogues.length)] ?? null
      checkAndTriggerHeartEvent()
      checkPassout()
    }
  }

  const handleOffer = (itemId: string, quality: Quality) => {
    const success = doOffering(props.npcId, itemId, quality)
    if (success) {
      checkAndTriggerHeartEvent()
      checkPassout()
    }
  }

  const handleCourt = () => {
    doCourting(props.npcId)
  }

  const handleBond = () => {
    doBond(props.npcId)
  }

  const handleDissolve = () => {
    doDissolve(props.npcId)
    showDissolveConfirm.value = false
  }
</script>
