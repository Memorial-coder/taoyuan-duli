<template>
  <div class="fixed inset-0 bg-bg/90 flex items-center justify-center z-50 p-8">
    <div class="game-panel max-w-lg w-full max-h-[80vh] overflow-y-auto" :class="seasonBorderClass">
      <h2 class="text-sm mb-1 flex items-center gap-2" :class="seasonTextClass">
        <span>{{ seasonIcon }}</span>
        <span>{{ event.name }}</span>
      </h2>
      <p class="text-xs text-muted mb-4">{{ event.description }}</p>
      <div class="space-y-2 mb-4">
        <p
          v-for="(line, i) in displayedLines"
          :key="i"
          class="text-xs leading-relaxed"
          :class="{ 'text-muted': i < displayedLines.length - 1 }"
        >
          {{ line }}
        </p>
      </div>
      <div class="flex justify-center">
        <Button v-if="!allLinesShown" class="w-full" @click="showNextLine">继续</Button>
        <Button v-else class="w-full" @click="emit('close')">关闭</Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import type { SeasonEventDef } from '@/data/events'
  import Button from '@/components/game/Button.vue'

  const props = defineProps<{
    event: SeasonEventDef
  }>()

  const emit = defineEmits<{
    close: []
  }>()

  const lineIndex = ref(1)

  const displayedLines = computed(() => props.event.narrative.slice(0, lineIndex.value))
  const allLinesShown = computed(() => lineIndex.value >= props.event.narrative.length)

  const showNextLine = () => {
    if (lineIndex.value < props.event.narrative.length) {
      lineIndex.value++
    }
  }

  const seasonIcon = computed(() => {
    const icons: Record<string, string> = {
      spring: '🌸',
      summer: '☀️',
      autumn: '🍂',
      winter: '❄️'
    }
    return icons[props.event.season] ?? '🎉'
  })

  const seasonTextClass = computed(() => {
    const map: Record<string, string> = {
      spring: 'text-green-400',
      summer: 'text-yellow-400',
      autumn: 'text-orange-400',
      winter: 'text-blue-300'
    }
    return map[props.event.season] ?? 'text-accent'
  })

  const seasonBorderClass = computed(() => {
    const map: Record<string, string> = {
      spring: 'border-green-400/40',
      summer: 'border-yellow-400/40',
      autumn: 'border-orange-400/40',
      winter: 'border-blue-300/40'
    }
    return map[props.event.season] ?? ''
  })
</script>
