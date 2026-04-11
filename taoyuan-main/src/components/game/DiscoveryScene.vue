<template>
  <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
    <div class="game-panel max-w-lg w-full max-h-[80vh] overflow-y-auto border-accent/40">
      <p class="text-[10px] text-accent/50 mb-1 text-center">{{ phaseLabel }}</p>
      <h3 class="text-accent text-sm mb-3">{{ stepTitle }}</h3>
      <div v-for="(scene, i) in playedScenes" :key="i" class="mb-3">
        <p class="text-xs leading-relaxed">{{ scene.text }}</p>
        <p v-if="scene.chosenResponse" class="text-xs text-accent mt-1 ml-2">→ {{ scene.chosenResponse }}</p>
      </div>
      <div v-if="currentScene">
        <p class="text-xs leading-relaxed mb-3">{{ currentScene.text }}</p>
        <div v-if="currentScene.choices && !hasChosen" class="space-y-2 mt-3">
          <Button v-for="(choice, ci) in currentScene.choices" :key="ci" class="w-full text-left" @click="handleChoice(choice)">
            {{ choice.text }}
          </Button>
        </div>
        <p v-if="choiceResponse" class="text-xs text-accent mt-2 ml-2">→ {{ choiceResponse }}</p>
        <Button v-if="!currentScene.choices || hasChosen" class="mt-3 w-full" @click="nextScene">
          {{ isLastScene ? '结束' : '继续' }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import type { DiscoveryStep, DiscoveryPhase } from '@/types/hiddenNpc'
  import type { HeartEventScene } from '@/types'
  import { getHiddenNpcById } from '@/data/hiddenNpcs'
  import { useHiddenNpcStore } from '@/stores/useHiddenNpcStore'
  import Button from '@/components/game/Button.vue'

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

  const currentIndex = ref(0)
  const playedScenes = ref<{ text: string; chosenResponse?: string }[]>([])
  const hasChosen = ref(false)
  const choiceResponse = ref<string | null>(null)

  const currentScene = computed<HeartEventScene | null>(() => {
    return props.step.scenes[currentIndex.value] ?? null
  })

  const isLastScene = computed(() => {
    return currentIndex.value >= props.step.scenes.length - 1
  })

  const handleChoice = (choice: { text: string; friendshipChange: number; response: string }) => {
    hasChosen.value = true
    choiceResponse.value = choice.response
    if (!props.readonly && choice.friendshipChange !== 0) {
      const hiddenNpcStore = useHiddenNpcStore()
      hiddenNpcStore.addAffinity(props.npcId, choice.friendshipChange)
    }
  }

  const nextScene = () => {
    playedScenes.value.push({
      text: currentScene.value?.text ?? '',
      chosenResponse: choiceResponse.value ?? undefined
    })

    if (isLastScene.value) {
      emit('close')
      return
    }

    currentIndex.value++
    hasChosen.value = false
    choiceResponse.value = null
  }
</script>
