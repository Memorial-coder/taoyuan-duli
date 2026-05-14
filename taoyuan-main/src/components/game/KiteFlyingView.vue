<template>
  <div class="game-panel max-w-sm w-full">
    <h3 class="text-accent text-sm mb-3 flex items-center space-x-1">
      <Wind :size="14" />
      <span>秋风筝会</span>
    </h3>

    <!-- 准备 -->
    <div v-if="phase === 'ready'">
      <p class="text-xs text-muted mb-3">
        秋风中放飞风筝！风会不断把风筝吹向两侧，点「拉左」或「拉右」把风筝拉回中间。保持风筝在绿色区域内可以持续得分，坚持25秒！
      </p>
      <Button class="w-full" @click="startGame">放风筝！</Button>
    </div>

    <!-- 游戏中 -->
    <div v-else-if="phase === 'playing'">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-muted">
          剩余：
          <span class="text-accent">{{ timeLeft }}</span>
          秒
        </p>
        <p class="text-xs text-muted">
          得分：
          <span class="text-accent">{{ score }}</span>
        </p>
      </div>

      <!-- 风向提示 -->
      <div class="text-center mb-2">
        <p class="text-xs" :class="windDirection > 0 ? 'text-success' : 'text-danger'">
          {{ windDirection > 0 ? '→ 东风 →' : '← 西风 ←' }}
          {{ windLabel }}
        </p>
      </div>

      <!-- 风筝位置条 -->
      <div class="relative h-10 bg-bg border border-accent/20 mb-3">
        <!-- 安全区域 (中间36%) -->
        <div class="absolute top-0 bottom-0 left-[32%] w-[36%] bg-success/10 border-x border-success/30" />
        <!-- 中心线 -->
        <div class="absolute top-0 bottom-0 left-1/2 w-px bg-accent/20" />
        <!-- 风筝 -->
        <div
          class="absolute top-1 bottom-1 flex items-center justify-center"
          :style="{ left: `calc(${kitePosition}% - 10px)`, transition: 'none' }"
        >
          <span class="text-lg" :class="inSafeZone ? 'kite-float' : 'kite-shake'">🪁</span>
        </div>
        <!-- 区域标签 -->
        <div class="absolute bottom-0 w-full flex text-center" style="font-size: 9px">
          <span class="flex-32 text-danger/40">危险</span>
          <span class="flex-36 text-success/40">安全</span>
          <span class="flex-32 text-danger/40">危险</span>
        </div>
      </div>

      <!-- 控制按钮 -->
      <div class="flex space-x-2">
        <Button class="flex-1 py-2" :icon="ArrowLeft" @click="pullLeft">拉左</Button>
        <Button class="flex-1 py-2" @click="pullRight">
          拉右
          <ArrowRight :size="14" />
        </Button>
      </div>

      <!-- 连续稳定加分提示 -->
      <div v-if="combo >= 3" class="text-center mt-2">
        <p class="text-xs text-accent combo-pulse">稳定飞行 ×{{ combo }}</p>
      </div>
    </div>

    <!-- 结果 -->
    <div v-else>
      <p class="text-xs text-muted mb-2">风筝会结束！</p>

      <div class="border border-accent/20 p-2 mb-3 text-center">
        <p
          class="text-sm mb-2"
          :class="{
            'text-accent': score >= 200,
            'text-success': score >= 120 && score < 200,
            'text-muted': score < 120
          }"
        >
          {{ score >= 200 ? '御风高手！风筝稳如泰山！' : score >= 120 ? '不错的技巧，风筝飞得很高。' : '风太大了，下次再接再厉。' }}
        </p>
        <p class="text-xs text-muted mb-1">最长连续稳定：{{ maxCombo }} 次</p>
        <p class="text-xs mb-1">
          总分：
          <span class="text-accent">{{ score }}</span>
        </p>
        <p class="text-xs">
          奖金：
          <span class="text-accent">{{ displayPrize }}</span>
          文
          <span v-if="props.bonusMoney > 0" class="text-success">（含年度追加{{ props.bonusMoney }}文）</span>
        </p>
      </div>
      <Button class="w-full" @click="handleClaim">领取奖励</Button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onUnmounted } from 'vue'
  import { Wind, ArrowLeft, ArrowRight } from 'lucide-vue-next'
  import {
    sfxGameStart,
    sfxRewardClaim,
    sfxCountdownTick,
    sfxCountdownFinal,
    sfxKitePull,
    sfxWindGust,
    sfxRankFirst,
    sfxRankSecond,
    sfxRankThird
  } from '@/composables/useAudio'
  import Button from '@/components/game/Button.vue'

  const props = withDefaults(
    defineProps<{
      bonusMoney?: number
    }>(),
    {
      bonusMoney: 0
    }
  )

  const emit = defineEmits<{ complete: [prize: number] }>()

  type Phase = 'ready' | 'playing' | 'finished'

  const phase = ref<Phase>('ready')
  const score = ref(0)
  const kitePosition = ref(50) // 0-100, 50=中心
  const timeLeft = ref(25)
  const windDirection = ref(1) // 1=右, -1=左
  const windStrength = ref(1)
  const combo = ref(0)
  const maxCombo = ref(0)
  const windLabel = ref('微风')

  /** 风筝速度（单位：%/秒），正=向右，负=向左 */
  let kiteVelocity = 0
  let rafId: number | null = null
  let lastFrameTime = 0
  let scoreTick = 0 // 累计安全区时间（秒），每0.5秒得分
  let countdownTimer: ReturnType<typeof setInterval> | null = null
  let windChangeTimer: ReturnType<typeof setTimeout> | null = null

  const inSafeZone = computed(() => kitePosition.value >= 32 && kitePosition.value <= 68)

  const prize = computed(() => {
    if (score.value >= 200) return 800
    if (score.value >= 120) return 500
    if (score.value >= 60) return 200
    return 50
  })
  const displayPrize = computed(() => prize.value + props.bonusMoney)

  /** requestAnimationFrame 主循环 */
  const gameLoop = (timestamp: number) => {
    if (phase.value !== 'playing') return

    const dt = lastFrameTime === 0 ? 0.016 : Math.min((timestamp - lastFrameTime) / 1000, 0.05)
    lastFrameTime = timestamp

    // 风力作为持续加速度（单位：%/秒²）
    const windAccel = windDirection.value * windStrength.value * 22
    kiteVelocity += windAccel * dt

    // 随机阵风：突然的额外冲量，让风筝难以预测
    if (Math.random() < dt * 1.5) {
      const gustForce = (Math.random() - 0.4) * windStrength.value * 18
      kiteVelocity += gustForce
    }

    // 阻尼：速度自然衰减，使风筝不会无限加速
    kiteVelocity *= Math.pow(0.95, dt * 60)

    // 更新位置
    kitePosition.value += kiteVelocity * dt
    // 边界弹回
    if (kitePosition.value <= 0) {
      kitePosition.value = 0
      kiteVelocity = Math.abs(kiteVelocity) * 0.3
    } else if (kitePosition.value >= 100) {
      kitePosition.value = 100
      kiteVelocity = -Math.abs(kiteVelocity) * 0.3
    }

    // 在安全区内得分
    if (inSafeZone.value) {
      combo.value++
      if (combo.value > maxCombo.value) maxCombo.value = combo.value
      scoreTick += dt
      if (scoreTick >= 0.5) {
        scoreTick -= 0.5
        const comboBonus = Math.min(Math.floor(combo.value / 60), 2)
        score.value += 1 + comboBonus
      }
    } else {
      combo.value = 0
      scoreTick = 0
    }

    rafId = requestAnimationFrame(gameLoop)
  }

  const startGame = () => {
    sfxGameStart()
    score.value = 0
    kitePosition.value = 50
    kiteVelocity = 0
    timeLeft.value = 25
    windDirection.value = Math.random() > 0.5 ? 1 : -1
    windStrength.value = 1.0
    windLabel.value = '微风'
    combo.value = 0
    maxCombo.value = 0
    scoreTick = 0
    lastFrameTime = 0
    phase.value = 'playing'

    // 启动 RAF 主循环
    rafId = requestAnimationFrame(gameLoop)

    // 倒计时
    countdownTimer = setInterval(() => {
      timeLeft.value--
      if (timeLeft.value <= 3 && timeLeft.value > 0) sfxCountdownFinal()
      else if (timeLeft.value > 3) sfxCountdownTick()
      if (timeLeft.value <= 0) {
        endGame()
      }
    }, 1000)

    // 风向/风力变化
    scheduleWindChange()
  }

  const scheduleWindChange = () => {
    const delay = 2000 + Math.random() * 1500
    windChangeTimer = setTimeout(() => {
      if (phase.value !== 'playing') return

      // 可能换方向（后期更频繁换向）
      const elapsed = 25 - timeLeft.value
      const flipChance = 0.35 + elapsed * 0.01
      if (Math.random() < flipChance) {
        windDirection.value *= -1
        sfxWindGust()
      }

      // 风力变化，随时间增强
      const minStrength = 1.0 + elapsed * 0.1
      const maxStrength = 2.0 + elapsed * 0.15
      windStrength.value = minStrength + Math.random() * (maxStrength - minStrength)

      if (windStrength.value < 2) windLabel.value = '微风'
      else if (windStrength.value < 3.5) windLabel.value = '清风'
      else windLabel.value = '强风'

      scheduleWindChange()
    }, delay) as unknown as ReturnType<typeof setTimeout>
  }

  /** 拉左：施加一个向左的冲量 */
  const pullLeft = () => {
    if (phase.value !== 'playing') return
    sfxKitePull()
    kiteVelocity -= 42
  }

  /** 拉右：施加一个向右的冲量 */
  const pullRight = () => {
    if (phase.value !== 'playing') return
    sfxKitePull()
    kiteVelocity += 42
  }

  const endGame = () => {
    if (rafId !== null) cancelAnimationFrame(rafId)
    if (countdownTimer) clearInterval(countdownTimer)
    if (windChangeTimer) clearTimeout(windChangeTimer)
    rafId = null
    countdownTimer = null
    windChangeTimer = null
    phase.value = 'finished'

    // 结算音效
    if (score.value >= 200) sfxRankFirst()
    else if (score.value >= 120) sfxRankSecond()
    else sfxRankThird()
  }

  const handleClaim = () => {
    sfxRewardClaim()
    emit('complete', prize.value)
  }

  onUnmounted(() => {
    if (rafId !== null) cancelAnimationFrame(rafId)
    if (countdownTimer) clearInterval(countdownTimer)
    if (windChangeTimer) clearTimeout(windChangeTimer)
  })
</script>

<style scoped>
  .kite-float {
    animation: kite-float 2s ease-in-out infinite;
  }

  @keyframes kite-float {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-3px);
    }
  }

  .kite-shake {
    animation: kite-shake 0.3s ease-in-out infinite;
  }

  @keyframes kite-shake {
    0%,
    100% {
      transform: rotate(0deg);
    }
    25% {
      transform: rotate(-8deg);
    }
    75% {
      transform: rotate(8deg);
    }
  }

  .combo-pulse {
    animation: combo-pulse 0.8s ease-in-out infinite;
  }

  @keyframes combo-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.6;
    }
  }
</style>
