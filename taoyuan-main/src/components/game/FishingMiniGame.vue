<template>
  <div>
    <p class="text-xs text-accent mb-2">
      <Fish :size="14" class="inline" />
      实时钓鱼 — {{ fishName }}
    </p>

    <div class="flex space-x-2 items-end justify-center">
      <!-- 进度条 (左侧竖条) -->
      <div
        class="w-3 bg-bg border border-accent/30 rounded-xs relative overflow-hidden"
        :style="{ height: CONTAINER_HEIGHT + 'px' }"
        style="box-sizing: content-box"
      >
        <div class="absolute bottom-0 w-full bg-success rounded-[1px]" :style="{ height: score + '%' }" />
      </div>

      <!-- 钓鱼区 -->
      <div
        class="w-10 bg-water/20 border border-accent/30 rounded-xs relative overflow-hidden select-none"
        :style="{ height: CONTAINER_HEIGHT + 'px' }"
        style="touch-action: none; box-sizing: content-box"
        @mousedown.prevent="startHold"
        @mouseup.prevent="stopHold"
        @mouseleave="stopHold"
        @touchstart="startHold"
        @touchend="stopHold"
      >
        <!-- 钩子（底层） -->
        <div
          class="absolute w-full rounded-[1px]"
          :class="isOverlap ? 'bg-success/80' : 'bg-success/40'"
          :style="{ top: CONTAINER_HEIGHT - hookPos - hookHeight + 'px', height: hookHeight + 'px' }"
        />
        <!-- 鱼（顶层，始终可见） -->
        <div class="absolute w-full bg-accent/60 rounded-[1px]" :style="{ top: fishPos + 'px', height: FISH_HEIGHT + 'px' }" />
      </div>

      <!-- 倒计时+分数 -->
      <div class="text-xs text-muted w-8 text-center">
        <p>{{ Math.ceil(timeLeft) }}s</p>
        <p class="text-accent">{{ Math.round(score) }}%</p>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex space-x-2 mt-3 justify-center">
      <button
        class="btn text-xs flex-1"
        style="touch-action: none"
        @mousedown.prevent="startHold"
        @mouseup.prevent="stopHold"
        @mouseleave="stopHold"
        @touchstart="startHold"
        @touchend="stopHold"
      >
        <ArrowUp :size="14" />
        <span>长按收线</span>
      </button>
    </div>
    <p class="text-xs text-muted text-center mt-1">按住空格键或↑键也可收线</p>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, onUnmounted } from 'vue'
  import { ArrowUp, Fish } from 'lucide-vue-next'
  import type { MiniGameResult, MiniGameRating } from '@/types'

  const props = defineProps<{
    fishName: string
    difficulty: 'easy' | 'normal' | 'hard' | 'legendary'
    hookHeight: number
    fishSpeed: number
    fishChangeDir: number
    gravity: number
    liftSpeed: number
    scoreGain: number
    scoreLoss: number
    timeLimit: number
  }>()

  const emit = defineEmits<{
    complete: [result: MiniGameResult]
  }>()

  const CONTAINER_HEIGHT = 250
  const FISH_HEIGHT = 25

  // Reactive game state (drives template)
  const fishPos = ref(CONTAINER_HEIGHT / 2 - FISH_HEIGHT / 2)
  const hookPos = ref(0)
  const score = ref(0)
  const timeLeft = ref(props.timeLimit)
  const isHolding = ref(false)
  const isOverlap = ref(false)
  const gameActive = ref(false)

  // Internal tracking (non-reactive for performance)
  let isPerfect = true
  let peakScore = 0
  let fishVelocity = 0
  let targetDirection = 0
  let animationId = 0
  let startTime = 0

  const startHold = () => {
    isHolding.value = true
  }
  const stopHold = () => {
    isHolding.value = false
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault()
      isHolding.value = true
    }
  }

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      isHolding.value = false
    }
  }

  const endGame = (rating: MiniGameRating) => {
    gameActive.value = false
    cancelAnimationFrame(animationId)
    emit('complete', {
      rating,
      score: score.value,
      perfect: isPerfect && rating === 'perfect'
    })
  }

  const gameLoop = (timestamp: number) => {
    if (!gameActive.value) return

    // Timer
    const elapsed = (timestamp - startTime) / 1000
    timeLeft.value = Math.max(props.timeLimit - elapsed, 0)

    // 1. Update hook position
    if (isHolding.value) {
      hookPos.value = Math.min(hookPos.value + props.liftSpeed, CONTAINER_HEIGHT - props.hookHeight)
    } else {
      hookPos.value = Math.max(hookPos.value - props.gravity, 0)
    }

    // 2. Update fish position
    if (Math.random() < props.fishChangeDir) {
      targetDirection = (Math.random() - 0.5) * props.fishSpeed * 2
    }
    fishVelocity += (targetDirection - fishVelocity) * 0.05
    fishPos.value += fishVelocity

    const maxFishPos = CONTAINER_HEIGHT - FISH_HEIGHT
    if (fishPos.value <= 0) {
      fishPos.value = 0
      targetDirection = Math.abs(targetDirection)
      fishVelocity = Math.abs(fishVelocity) * 0.5
    }
    if (fishPos.value >= maxFishPos) {
      fishPos.value = maxFishPos
      targetDirection = -Math.abs(targetDirection)
      fishVelocity = -Math.abs(fishVelocity) * 0.5
    }

    // 3. Overlap detection
    // Hook is positioned from bottom: CSS bottom = hookPos
    // So hook occupies Y range: (CONTAINER_HEIGHT - hookPos - hookHeight) to (CONTAINER_HEIGHT - hookPos)
    // Fish is positioned from top: CSS top = fishPos
    // So fish occupies Y range: fishPos to (fishPos + FISH_HEIGHT)
    const hookTop = CONTAINER_HEIGHT - hookPos.value - props.hookHeight
    const hookBottom = CONTAINER_HEIGHT - hookPos.value
    const fishTop = fishPos.value
    const fishBottom = fishPos.value + FISH_HEIGHT
    isOverlap.value = !(hookBottom <= fishTop || hookTop >= fishBottom)

    // 4. Update score
    if (isOverlap.value) {
      score.value = Math.min(score.value + props.scoreGain, 100)
    } else {
      score.value = Math.max(score.value - props.scoreLoss, 0)
      if (score.value < peakScore) isPerfect = false
    }
    peakScore = Math.max(peakScore, score.value)

    // 5. Check win (progress reaches 100%)
    if (score.value >= 100) {
      endGame(isPerfect ? 'perfect' : 'excellent')
      return
    }

    // 6. Check timeout
    if (timeLeft.value <= 0) {
      endGame(score.value >= 60 ? 'good' : 'poor')
      return
    }

    animationId = requestAnimationFrame(gameLoop)
  }

  const startGame = () => {
    gameActive.value = true
    startTime = performance.now()
    fishPos.value = CONTAINER_HEIGHT / 2 - FISH_HEIGHT / 2
    hookPos.value = 0
    score.value = 0
    timeLeft.value = props.timeLimit
    isPerfect = true
    peakScore = 0
    fishVelocity = 0
    targetDirection = (Math.random() - 0.5) * props.fishSpeed
    animationId = requestAnimationFrame(gameLoop)
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    startGame()
  })

  onUnmounted(() => {
    gameActive.value = false
    cancelAnimationFrame(animationId)
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
  })
</script>
