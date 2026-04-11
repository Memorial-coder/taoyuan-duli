<template>
  <div class="game-panel max-w-sm w-full">
    <h3 class="text-accent text-sm mb-3 flex items-center space-x-1">
      <Coffee :size="14" />
      <span>斗茶大会</span>
    </h3>

    <!-- 准备 -->
    <div v-if="phase === 'ready'">
      <p class="text-xs text-muted mb-3">
        品茗斗茶，考的是功夫！共3轮，每轮需依次完成三步：控温、投茶、出汤。条子会从左往右填充，在目标标记附近按下按钮！越精准得分越高！
      </p>
      <Button class="w-full" @click="startGame">开始斗茶！</Button>
    </div>

    <!-- 泡茶进行中 -->
    <div v-else-if="phase === 'brewing'">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-muted">第 {{ roundIndex + 1 }} / 3 轮</p>
        <p class="text-xs text-muted">
          总分：
          <span class="text-accent">{{ totalScore }}</span>
        </p>
      </div>

      <!-- 轮次进度点 -->
      <div class="flex justify-center space-x-1.5 mb-3">
        <div v-for="i in 3" :key="i" class="w-2 h-2" :class="roundDotClass(i - 1)" />
      </div>

      <!-- 步骤进度 -->
      <div class="flex justify-center space-x-1 mb-2">
        <div
          v-for="(s, i) in BREW_STEPS"
          :key="i"
          class="text-xs px-2 py-0.5 border"
          :class="{
            'border-accent bg-accent/15 text-accent': brewStep === i,
            'border-success/50 bg-success/5 text-success': i < brewStep,
            'border-accent/15 text-muted': i > brewStep
          }"
        >
          <Check v-if="i < brewStep" :size="10" class="inline -mt-0.5 mr-0.5" />
          {{ s.shortLabel }}
        </div>
      </div>

      <!-- 当前步骤标题 -->
      <p class="text-xs text-accent text-center mb-2">{{ currentStepDef.label }} — {{ currentStepDef.hint }}</p>

      <!-- 填充条 -->
      <div class="relative h-10 bg-bg border border-accent/20 mb-3">
        <!-- 目标标记 -->
        <div
          class="absolute top-0 bottom-0 w-6 border-x border-success/50 bg-success/15"
          :style="{ left: `calc(${targetPosition}% - 12px)` }"
        />
        <div class="absolute top-0 bottom-0 w-1 bg-accent/40" :style="{ left: `${targetPosition}%` }" />
        <!-- 目标标签 -->
        <span class="absolute -top-3.5 text-success" style="font-size: 8px" :style="{ left: `calc(${targetPosition}% - 6px)` }">目标</span>
        <!-- 填充 -->
        <div
          class="absolute top-0 bottom-0 left-0 transition-none"
          :class="fillPct > 95 ? 'bg-danger/40' : 'bg-accent/30'"
          :style="{ width: `${fillPct}%` }"
        />
        <!-- 当前位置指针 -->
        <div class="absolute top-0 bottom-0 w-0.5 bg-text" :style="{ left: `${fillPct}%`, transition: 'none' }" />
        <!-- 区域标签 -->
        <div class="absolute bottom-0 left-1 right-1 flex justify-between" style="font-size: 8px">
          <span class="text-muted">{{ currentStepDef.lowLabel }}</span>
          <span class="text-muted">{{ currentStepDef.highLabel }}</span>
        </div>
      </div>

      <Button class="w-full py-2" :icon="Droplets" @click="lockStep">{{ currentStepDef.action }}</Button>
    </div>

    <!-- 单步结果反馈 -->
    <div v-else-if="phase === 'step_result'" class="text-center py-2">
      <div class="flex justify-center space-x-1.5 mb-2">
        <div v-for="i in 3" :key="i" class="w-2 h-2" :class="roundDotClass(i - 1)" />
      </div>
      <div :class="lastStepGrade === 'perfect' ? 'step-perfect' : lastStepGrade === 'good' ? '' : 'step-miss'">
        <p
          class="text-xs"
          :class="{
            'text-accent': lastStepGrade === 'perfect',
            'text-success': lastStepGrade === 'good',
            'text-muted': lastStepGrade === 'poor'
          }"
        >
          {{ lastStepGrade === 'perfect' ? '精准！' : lastStepGrade === 'good' ? '还行。' : '偏了…' }}
          +{{ lastStepScore }}分
        </p>
      </div>
    </div>

    <!-- 单轮总结 -->
    <div v-else-if="phase === 'round_result'" class="text-center py-2">
      <div class="flex justify-center space-x-1.5 mb-3">
        <div v-for="i in 3" :key="i" class="w-2 h-2" :class="roundDotClass(i - 1)" />
      </div>
      <div :class="lastRoundGrade === 'perfect' ? 'pot-hit' : lastRoundGrade === 'good' ? '' : 'wrong-shake'">
        <p
          class="text-sm mb-1"
          :class="{
            'text-accent': lastRoundGrade === 'perfect',
            'text-success': lastRoundGrade === 'good',
            'text-danger': lastRoundGrade === 'poor'
          }"
        >
          {{ lastRoundGrade === 'perfect' ? '绝品好茶！' : lastRoundGrade === 'good' ? '茶味尚可。' : '这泡砸了…' }}
        </p>
        <p class="text-xs text-muted">本轮得分：{{ roundScore }}分</p>
      </div>
    </div>

    <!-- 最终结果 -->
    <div v-else-if="phase === 'finished'">
      <p class="text-xs text-muted mb-2">斗茶结束！</p>

      <div class="flex justify-center space-x-1.5 mb-3">
        <div v-for="i in 3" :key="i" class="w-2 h-2" :class="roundDotClass(i - 1)" />
      </div>

      <div class="border border-accent/20 p-2 mb-3">
        <div
          v-for="(r, i) in roundResults"
          :key="i"
          class="flex items-center justify-between text-xs py-0.5 border-b border-accent/10 last:border-0"
        >
          <span class="text-muted">第{{ i + 1 }}泡</span>
          <span
            :class="{
              'text-accent': r.grade === 'perfect',
              'text-success': r.grade === 'good',
              'text-danger': r.grade === 'poor'
            }"
          >
            {{ r.grade === 'perfect' ? '绝品' : r.grade === 'good' ? '尚可' : '失手' }}
          </span>
          <span class="text-muted">{{ r.score }}分</span>
        </div>
      </div>

      <div class="border border-accent/20 p-2 mb-3 text-center">
        <p class="text-xs mb-1">
          总分：
          <span class="text-accent">{{ totalScore }}</span>
          / 450
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
  import { Coffee, Droplets, Check } from 'lucide-vue-next'
  import {
    sfxGameStart,
    sfxRewardClaim,
    sfxTeaPour,
    sfxTeaBell,
    sfxMiniGood,
    sfxMiniPoor,
    sfxMiniPerfect,
    sfxMiniFail,
    sfxRankFirst,
    sfxRankSecond
  } from '@/composables/useAudio'
  import Button from '@/components/game/Button.vue'

  const emit = defineEmits<{ complete: [prize: number] }>()

  type Phase = 'ready' | 'brewing' | 'step_result' | 'round_result' | 'finished'
  type Grade = 'perfect' | 'good' | 'poor'

  const BREW_STEPS = [
    { label: '控制水温', shortLabel: '温', hint: '将水烧到合适温度', action: '定温！', lowLabel: '凉', highLabel: '烫' },
    { label: '投茶', shortLabel: '茶', hint: '放入适量茶叶', action: '放茶！', lowLabel: '少', highLabel: '多' },
    { label: '出汤时机', shortLabel: '汤', hint: '在最佳时机出汤', action: '出汤！', lowLabel: '淡', highLabel: '苦' }
  ]

  const phase = ref<Phase>('ready')
  const roundIndex = ref(0)
  const brewStep = ref(0)
  const fillPct = ref(0)
  const targetPosition = ref(50)
  const totalScore = ref(0)
  const roundScore = ref(0)
  const lastStepScore = ref(0)
  const lastStepGrade = ref<Grade>('poor')
  const lastRoundGrade = ref<Grade>('poor')
  const roundResults = ref<{ grade: Grade; score: number }[]>([])

  let fillTimer: ReturnType<typeof setInterval> | null = null
  let phaseTimeout: ReturnType<typeof setTimeout> | null = null

  // 填充速度随轮次和步骤增加
  const getFillSpeed = () => {
    const roundBonus = roundIndex.value * 0.4
    const stepBonus = brewStep.value * 0.2
    return 1.0 + roundBonus + stepBonus
  }

  const prize = computed(() => {
    if (totalScore.value >= 400) return 800
    if (totalScore.value >= 270) return 500
    if (totalScore.value >= 150) return 200
    return 50
  })

  const currentStepDef = computed(() => BREW_STEPS[brewStep.value]!)

  const roundDotClass = (idx: number) => {
    if (idx >= roundResults.value.length) {
      if (idx === roundIndex.value && phase.value !== 'finished') return 'bg-accent dot-pulse'
      return 'bg-accent/20'
    }
    const r = roundResults.value[idx]!
    if (r.grade === 'perfect') return 'bg-accent'
    if (r.grade === 'good') return 'bg-success'
    return 'bg-danger'
  }

  const startGame = () => {
    sfxGameStart()
    roundIndex.value = 0
    totalScore.value = 0
    roundScore.value = 0
    roundResults.value = []
    startBrewStep()
  }

  const startBrewStep = () => {
    phase.value = 'brewing'
    fillPct.value = 0
    // 随机目标位置 (25-80范围)
    targetPosition.value = 25 + Math.random() * 55

    const speed = getFillSpeed()
    fillTimer = setInterval(() => {
      fillPct.value = Math.min(100, fillPct.value + speed)
      if (fillPct.value >= 100) {
        // 自动超时，强制结算（最差分数）
        lockStep()
      }
    }, 50)
  }

  const lockStep = () => {
    sfxTeaPour()
    if (fillTimer) clearInterval(fillTimer)
    fillTimer = null

    const offset = Math.abs(fillPct.value - targetPosition.value)
    let grade: Grade
    let score: number

    if (offset <= 4) {
      grade = 'perfect'
      score = 50
    } else if (offset <= 12) {
      grade = 'good'
      score = 30
    } else {
      grade = 'poor'
      score = 10
    }

    // 步骤判定音效
    setTimeout(() => {
      if (grade === 'perfect') sfxTeaBell()
      else if (grade === 'good') sfxMiniGood()
      else sfxMiniPoor()
    }, 100)

    lastStepGrade.value = grade
    lastStepScore.value = score
    roundScore.value += score
    totalScore.value += score

    phase.value = 'step_result'
    phaseTimeout = setTimeout(() => {
      brewStep.value++
      if (brewStep.value >= 3) {
        // 本轮结束
        let roundGrade: Grade = 'poor'
        if (roundScore.value >= 120) roundGrade = 'perfect'
        else if (roundScore.value >= 70) roundGrade = 'good'

        lastRoundGrade.value = roundGrade
        roundResults.value.push({ grade: roundGrade, score: roundScore.value })

        // 轮次结果音效
        if (roundGrade === 'perfect') sfxMiniPerfect()
        else if (roundGrade === 'poor') sfxMiniFail()

        phase.value = 'round_result'
        phaseTimeout = setTimeout(() => {
          roundIndex.value++
          if (roundIndex.value >= 3) {
            phase.value = 'finished'
          } else {
            brewStep.value = 0
            roundScore.value = 0
            startBrewStep()
          }
        }, 1500)
      } else {
        startBrewStep()
      }
    }, 800)
  }

  const handleClaim = () => {
    if (totalScore.value >= 400) sfxRankFirst()
    else if (totalScore.value >= 270) sfxRankSecond()
    else sfxRewardClaim()
    emit('complete', prize.value)
  }

  onUnmounted(() => {
    if (fillTimer) clearInterval(fillTimer)
    if (phaseTimeout) clearTimeout(phaseTimeout)
  })
</script>

<style scoped>
  .step-perfect {
    animation: step-perfect 0.4s ease-out;
  }

  @keyframes step-perfect {
    0% {
      transform: scale(0.9);
    }
    50% {
      transform: scale(1.1);
    }
    100% {
      transform: scale(1);
    }
  }

  .step-miss {
    animation: step-miss 0.3s ease-in-out;
  }

  @keyframes step-miss {
    0%,
    100% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(-2px);
    }
    75% {
      transform: translateX(2px);
    }
  }

  .pot-hit {
    animation: pot-hit 0.4s ease-in-out;
  }

  @keyframes pot-hit {
    0% {
      transform: scale(1);
    }
    30% {
      transform: scale(1.1);
    }
    60% {
      transform: scale(0.95);
    }
    100% {
      transform: scale(1);
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

  .dot-pulse {
    animation: dot-pulse 1s ease-in-out infinite;
  }

  @keyframes dot-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }
</style>
