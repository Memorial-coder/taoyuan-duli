<template>
  <div class="game-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
    <div class="game-panel flex max-h-[80vh] w-full max-w-lg flex-col border-accent/40">
      <div ref="contentEl" class="min-h-0 overflow-y-auto pr-1">
        <p class="mb-1 text-center text-[10px] text-accent/50">{{ phaseLabel }}</p>
        <h3 class="mb-3 text-sm text-accent">{{ stepTitle }}</h3>

        <div v-for="(scene, index) in playedScenes" :key="index" class="mb-3">
          <p class="text-xs leading-relaxed">{{ scene.text }}</p>
          <p v-if="scene.chosenResponse" class="ml-2 mt-1 text-xs text-accent">-> {{ scene.chosenResponse }}</p>
        </div>

        <div v-if="currentScene">
          <p class="text-xs leading-relaxed">{{ currentScene.text }}</p>
          <p v-if="choiceResponse" class="ml-2 mt-2 text-xs text-accent">-> {{ choiceResponse }}</p>
        </div>
      </div>

      <div class="mt-3 shrink-0 border-t border-accent/10 pt-3">
        <div v-if="hasChoices && !hasChosen" class="space-y-2">
          <Button
            v-for="(choice, index) in currentScene?.choices ?? []"
            :key="index"
            class="w-full text-left"
            @click="handleChoice(choice)"
          >
            {{ choice.text }}
          </Button>
        </div>
        <Button v-else class="w-full justify-center" @click="nextScene">
          {{ actionLabel }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, nextTick, onMounted, ref, watch } from 'vue'
  import type { HeartEventScene } from '@/types'
  import type { DiscoveryPhase, DiscoveryStep } from '@/types/hiddenNpc'
  import { getHiddenNpcById } from '@/data/hiddenNpcs'
  import { useHiddenNpcStore } from '@/stores/useHiddenNpcStore'
  import Button from '@/components/game/Button.vue'

  type SceneChoice = NonNullable<HeartEventScene['choices']>[number]

  const props = defineProps<{
    npcId: string
    step: DiscoveryStep
    readonly?: boolean
  }>()

  const emit = defineEmits<{
    close: []
  }>()

  const PHASE_LABELS: Record<DiscoveryPhase, string> = {
    unknown: '',
    rumor: '—— 传闻 ——',
    glimpse: '—— 惊鸿一瞥 ——',
    encounter: '—— 邂逅 ——',
    revealed: '—— 显现 ——'
  }

  const npcDef = computed(() => getHiddenNpcById(props.npcId))
  const phaseLabel = computed(() => PHASE_LABELS[props.step.phase])
  const stepTitle = computed(() => {
    if (props.step.phase === 'revealed' && npcDef.value) return `${npcDef.value.name}显现了真容`
    if (props.step.phase === 'encounter' && npcDef.value) return `与${npcDef.value.name}的邂逅`
    return props.step.logMessage ?? '神秘的异象'
  })

  const contentEl = ref<HTMLDivElement | null>(null)
  const currentIndex = ref(0)
  const playedScenes = ref<{ text: string; chosenResponse?: string }[]>([])
  const hasChosen = ref(false)
  const choiceResponse = ref<string | null>(null)

  const currentScene = computed<HeartEventScene | null>(() => props.step.scenes[currentIndex.value] ?? null)
  const hasChoices = computed(() => (currentScene.value?.choices?.length ?? 0) > 0)
  const isLastScene = computed(() => currentIndex.value >= props.step.scenes.length - 1)
  const actionLabel = computed(() => {
    if (!currentScene.value) return '关闭'
    return isLastScene.value ? '结束' : '继续'
  })

  const scrollToBottom = () => {
    const el = contentEl.value
    if (!el) return
    el.scrollTop = el.scrollHeight
  }

  const resetState = () => {
    currentIndex.value = 0
    playedScenes.value = []
    hasChosen.value = false
    choiceResponse.value = null
  }

  const syncSceneState = async () => {
    resetState()
    await nextTick()
    scrollToBottom()
  }

  const handleChoice = (choice: SceneChoice) => {
    hasChosen.value = true
    choiceResponse.value = choice.response

    if (!props.readonly && choice.friendshipChange !== 0) {
      const hiddenNpcStore = useHiddenNpcStore()
      hiddenNpcStore.addAffinity(props.npcId, choice.friendshipChange)
    }
  }

  const nextScene = () => {
    if (!currentScene.value) {
      emit('close')
      return
    }

    playedScenes.value.push({
      text: currentScene.value.text,
      chosenResponse: choiceResponse.value ?? undefined
    })

    if (isLastScene.value) {
      emit('close')
      return
    }

    currentIndex.value += 1
    hasChosen.value = false
    choiceResponse.value = null
  }

  watch(
    () => `${props.npcId}:${props.step.id}`,
    () => {
      void syncSceneState()
    }
  )

  watch(
    [currentIndex, choiceResponse],
    async () => {
      await nextTick()
      scrollToBottom()
    },
    { flush: 'post' }
  )

  onMounted(() => {
    void syncSceneState()
  })
</script>
