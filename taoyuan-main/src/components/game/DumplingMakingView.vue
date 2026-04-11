<template>
  <div class="game-panel max-w-sm w-full">
    <h3 class="text-accent text-sm mb-3 flex items-center space-x-1">
      <ChefHat :size="14" />
      <span>冬至包饺子</span>
    </h3>

    <!-- 准备 -->
    <div v-if="phase === 'ready'">
      <p class="text-xs text-muted mb-3">25秒内包尽可能多的饺子！每个饺子需要三步：擀皮 → 放馅 → 捏合。按顺序点击对应按钮！</p>
      <Button class="w-full" @click="startGame">开始包饺子！</Button>
    </div>

    <!-- 制作中 -->
    <div v-else-if="phase === 'making'">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-muted">
          已完成：
          <span class="text-accent">{{ dumplingCount }}</span>
          个
        </p>
        <p class="text-xs" :class="timeLeft <= 5 ? 'text-danger time-pulse' : 'text-accent'">
          <Timer :size="12" class="inline -mt-0.5" />
          {{ timeLeft }}s
        </p>
      </div>

      <!-- 倒计时条 -->
      <div class="h-1 bg-bg border border-accent/20 mb-3">
        <div
          class="h-full transition-all duration-1000 ease-linear"
          :class="timeLeft <= 5 ? 'bg-danger/60' : 'bg-accent/60'"
          :style="{ width: `${(timeLeft / 25) * 100}%` }"
        />
      </div>

      <!-- 饺子计数器 -->
      <div v-if="dumplingCount > 0" class="flex flex-wrap space-x-1 mb-2 justify-center">
        <Cookie v-for="i in Math.min(dumplingCount, 10)" :key="i" :size="14" class="text-accent dumpling-icon" />
        <span v-if="dumplingCount > 10" class="text-xs text-muted">+{{ dumplingCount - 10 }}</span>
      </div>

      <!-- 当前饺子状态 -->
      <div class="border border-accent/20 p-3 mb-3 text-center">
        <p class="text-xs text-muted mb-2">第 {{ dumplingCount + 1 }} 个饺子</p>

        <!-- 步骤指示 -->
        <div class="flex justify-center space-x-1 mb-3">
          <div
            v-for="(s, i) in steps"
            :key="i"
            class="text-xs px-3 py-1 border transition-all duration-150"
            :class="{
              'border-accent bg-accent/15 text-accent scale-105': currentStep === i,
              'border-success/50 bg-success/5 text-success': i < currentStep,
              'border-accent/15 text-muted': i > currentStep
            }"
          >
            <Check v-if="i < currentStep" :size="10" class="inline -mt-0.5 mr-0.5" />
            {{ s.label }}
          </div>
        </div>

        <!-- 动画区域 -->
        <div class="h-16 flex items-center justify-center relative">
          <div
            v-if="currentStep === 0"
            :class="{ 'dough-roll': animating }"
            class="w-12 h-12 border-2 border-accent/50 rounded-full flex items-center justify-center text-sm text-muted"
          >
            皮
          </div>
          <div
            v-else-if="currentStep === 1"
            :class="{ 'fill-drop': animating }"
            class="w-12 h-12 border-2 border-success/50 rounded-full flex items-center justify-center text-sm text-muted"
          >
            馅
          </div>
          <div v-else-if="currentStep === 2" :class="{ 'pinch-close': animating }" class="flex items-center space-x-1">
            <div class="w-6 h-9 border-2 border-accent/50 rounded-l-full" />
            <div class="w-6 h-9 border-2 border-accent/50 rounded-r-full" />
          </div>
        </div>

        <!-- 错误提示 -->
        <p v-if="showError" class="text-danger text-xs mt-1 wrong-shake">顺序不对！重来！</p>

        <!-- 完成动画 -->
        <div v-if="showComplete" class="dumpling-done text-sm text-success mt-1 flex items-center justify-center space-x-1">
          饺子完成！
          <Cookie :size="14" />
        </div>
      </div>

      <!-- 顺序变更提示 -->
      <p v-if="showShuffle" class="text-accent text-xs mb-2 text-center shuffle-flash">按钮顺序变了！注意看！</p>

      <!-- 操作按钮 -->
      <div class="flex space-x-2">
        <button
          v-for="idx in buttonOrder"
          :key="idx"
          class="btn text-xs flex-1 py-2 transition-all duration-100"
          :class="{
            '!bg-accent/20 !border-accent/50': currentStep === idx,
            'opacity-60': currentStep !== idx
          }"
          @click="doStep(idx)"
        >
          {{ steps[idx]!.action }}
        </button>
      </div>
    </div>

    <!-- 结束 -->
    <div v-else>
      <p class="text-xs text-muted mb-2">时间到！</p>

      <!-- 饺子展示 -->
      <div v-if="dumplingCount > 0" class="flex flex-wrap space-x-1 mb-3 justify-center border border-accent/20 p-2">
        <Cookie v-for="i in Math.min(dumplingCount, 10)" :key="i" :size="16" class="text-accent" />
        <span v-if="dumplingCount > 10" class="text-xs text-muted self-center">+{{ dumplingCount - 10 }}</span>
      </div>

      <div class="border border-accent/20 p-2 mb-3 text-center">
        <p class="text-xs mb-1">
          共包了
          <span class="text-accent">{{ dumplingCount }}</span>
          个饺子！
        </p>
        <p class="text-xs">
          奖金：
          <span class="text-accent">{{ prize }}</span>
          文
        </p>
      </div>
      <Button class="w-full" @click="handleClaim">领取奖励</Button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onUnmounted } from 'vue'
  import { ChefHat, Timer, Check, Cookie } from 'lucide-vue-next'
  import {
    sfxGameStart,
    sfxRewardClaim,
    sfxCountdownTick,
    sfxCountdownFinal,
    sfxDoughStep,
    sfxDumplingDone,
    sfxMiniFail,
    sfxRankFirst,
    sfxRankSecond
  } from '@/composables/useAudio'
  import Button from '@/components/game/Button.vue'

  const emit = defineEmits<{ complete: [prize: number] }>()

  type Phase = 'ready' | 'making' | 'finished'
  const phase = ref<Phase>('ready')

  const steps = [
    { label: '擀皮', action: '擀皮' },
    { label: '放馅', action: '放馅' },
    { label: '捏合', action: '捏合' }
  ]

  const timeLeft = ref(25)
  const dumplingCount = ref(0)
  const currentStep = ref(0)
  const animating = ref(false)
  const showError = ref(false)
  const showComplete = ref(false)
  const buttonOrder = ref([0, 1, 2])
  const showShuffle = ref(false)

  let countdownTimer: ReturnType<typeof setInterval> | null = null
  let animTimeout: ReturnType<typeof setTimeout> | null = null
  let errorTimeout: ReturnType<typeof setTimeout> | null = null
  let completeTimeout: ReturnType<typeof setTimeout> | null = null
  let shuffleTimeout: ReturnType<typeof setTimeout> | null = null

  const prize = computed(() => Math.min(1000, dumplingCount.value * 100))

  /** 打乱按钮顺序：随机交换1-3个位置 */
  const shuffleButtons = () => {
    const order = [...buttonOrder.value]
    const swapCount = 1 + Math.floor(Math.random() * 3) // 1-3次交换
    for (let s = 0; s < swapCount; s++) {
      const i = Math.floor(Math.random() * 3)
      let j = Math.floor(Math.random() * 3)
      while (j === i) j = Math.floor(Math.random() * 3)
      const tmp = order[i]!
      order[i] = order[j]!
      order[j] = tmp
    }
    // 确保确实变了
    if (order.every((v, idx) => v === buttonOrder.value[idx])) {
      // 如果没变就强制交换前两个
      const tmp = order[0]!
      order[0] = order[1]!
      order[1] = tmp
    }
    buttonOrder.value = order
    sfxCountdownFinal()
    showShuffle.value = true
    if (shuffleTimeout) clearTimeout(shuffleTimeout)
    shuffleTimeout = setTimeout(() => {
      showShuffle.value = false
    }, 1200)
  }

  const startGame = () => {
    sfxGameStart()
    phase.value = 'making'
    timeLeft.value = 25
    dumplingCount.value = 0
    currentStep.value = 0
    buttonOrder.value = [0, 1, 2]
    showShuffle.value = false

    countdownTimer = setInterval(() => {
      timeLeft.value--
      if (timeLeft.value <= 5 && timeLeft.value > 0) sfxCountdownFinal()
      else if (timeLeft.value > 5) sfxCountdownTick()
      if (timeLeft.value <= 0) {
        endGame()
      }
    }, 1000)
  }

  const doStep = (stepIdx: number) => {
    if (phase.value !== 'making') return

    if (stepIdx !== currentStep.value) {
      // 错误步骤
      sfxMiniFail()
      showError.value = true
      currentStep.value = 0
      if (errorTimeout) clearTimeout(errorTimeout)
      errorTimeout = setTimeout(() => {
        showError.value = false
      }, 800)
      return
    }

    showError.value = false
    animating.value = true
    if (animTimeout) clearTimeout(animTimeout)
    animTimeout = setTimeout(() => {
      animating.value = false
    }, 300)

    if (currentStep.value === 2) {
      // 完成一个饺子
      sfxDumplingDone()
      dumplingCount.value++
      showComplete.value = true
      if (completeTimeout) clearTimeout(completeTimeout)
      completeTimeout = setTimeout(() => {
        showComplete.value = false
        currentStep.value = 0
        // 包到3个及以上后，每完成一个有概率打乱按钮顺序
        if (dumplingCount.value >= 3) {
          shuffleButtons()
        }
      }, 500)
    } else {
      sfxDoughStep()
      currentStep.value++
    }
  }

  const endGame = () => {
    if (countdownTimer) clearInterval(countdownTimer)
    countdownTimer = null
    phase.value = 'finished'

    // 结算音效
    if (dumplingCount.value >= 8) sfxRankFirst()
    else if (dumplingCount.value >= 5) sfxRankSecond()
  }

  const handleClaim = () => {
    sfxRewardClaim()
    emit('complete', prize.value)
  }

  onUnmounted(() => {
    if (countdownTimer) clearInterval(countdownTimer)
    if (animTimeout) clearTimeout(animTimeout)
    if (errorTimeout) clearTimeout(errorTimeout)
    if (completeTimeout) clearTimeout(completeTimeout)
    if (shuffleTimeout) clearTimeout(shuffleTimeout)
  })
</script>

<style scoped>
  .time-pulse {
    animation: time-pulse 0.5s ease-in-out infinite;
  }

  @keyframes time-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .dumpling-icon {
    animation: dumpling-appear 0.3s ease-out;
  }

  @keyframes dumpling-appear {
    0% {
      transform: scale(0);
      opacity: 0;
    }
    60% {
      transform: scale(1.2);
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  .dough-roll {
    animation: dough-roll 0.3s ease-out;
  }

  @keyframes dough-roll {
    0% {
      transform: scale(0.5);
    }
    60% {
      transform: scale(1.15);
    }
    100% {
      transform: scale(1);
    }
  }

  .fill-drop {
    animation: fill-drop 0.3s ease-in;
  }

  @keyframes fill-drop {
    0% {
      transform: translateY(-12px);
      opacity: 0.3;
    }
    100% {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .pinch-close {
    animation: pinch-close 0.3s ease-in-out;
  }

  @keyframes pinch-close {
    0% {
      margin: 8px;
    }
    100% {
      margin: 4px;
    }
  }

  .dumpling-done {
    animation: dumpling-done 0.5s ease-out;
  }

  @keyframes dumpling-done {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.3) translateY(-5px);
      opacity: 1;
    }
    100% {
      transform: scale(0.8) translateY(-15px);
      opacity: 0;
    }
  }

  .wrong-shake {
    animation: wrong-shake 0.4s ease-in-out;
  }

  @keyframes wrong-shake {
    0%,
    100% {
      transform: translateX(0);
    }
    20% {
      transform: translateX(-3px);
    }
    40% {
      transform: translateX(3px);
    }
    60% {
      transform: translateX(-2px);
    }
    80% {
      transform: translateX(2px);
    }
  }

  .shuffle-flash {
    animation: shuffle-flash 0.6s ease-in-out infinite;
  }

  @keyframes shuffle-flash {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }
</style>
