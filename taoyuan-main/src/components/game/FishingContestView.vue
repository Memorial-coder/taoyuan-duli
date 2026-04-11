<template>
  <div class="game-panel max-w-sm w-full">
    <h3 class="text-accent text-sm mb-3 flex items-center space-x-1">
      <Fish :size="14" />
      <span>钓鱼大赛</span>
    </h3>

    <!-- 准备 -->
    <div v-if="phase === 'ready'">
      <p class="text-xs text-muted mb-3">
        钓鱼大赛共3轮！抛竿后等待鱼上钩，然后注意张力条——在绿色区域时收竿能钓到最好的鱼！张力太高鱼线会断！
      </p>

      <div v-if="catches.length > 0" class="border border-accent/20 p-2 mb-3">
        <p class="text-xs text-muted mb-1">你的收获：</p>
        <div
          v-for="(c, i) in catches"
          :key="i"
          class="flex items-center justify-between text-xs py-0.5 border-b border-accent/10 last:border-0"
        >
          <span class="text-accent">{{ c.name }}</span>
          <span class="text-muted">{{ c.weight }}斤 · +{{ c.score }}分</span>
        </div>
        <div class="flex items-center justify-between text-xs mt-1.5 pt-1">
          <span class="text-muted">当前总分</span>
          <span class="text-accent">{{ playerTotal }} 分</span>
        </div>
      </div>

      <p class="text-xs text-muted mb-2">第 {{ currentRound }} / 3 轮</p>
      <Button class="w-full" @click="castLine">下竿！</Button>
    </div>

    <!-- 抛竿动画 -->
    <div v-else-if="phase === 'casting'" class="flex flex-col items-center py-8">
      <div class="cast-anim">
        <Fish :size="28" class="text-accent" />
      </div>
      <p class="text-xs text-muted mt-3">抛竿中...</p>
    </div>

    <!-- 等待上钩 -->
    <div v-else-if="phase === 'waiting'" class="flex flex-col items-center py-6">
      <div class="float-bob mb-2">
        <Waves :size="28" class="text-accent/50" />
      </div>
      <p class="text-xs text-muted">等待鱼上钩...</p>
      <div class="flex justify-center space-x-1.5 mt-2">
        <span class="w-1.5 h-1.5 bg-accent/40 dot-loading" />
        <span class="w-1.5 h-1.5 bg-accent/40 dot-loading" style="animation-delay: 0.2s" />
        <span class="w-1.5 h-1.5 bg-accent/40 dot-loading" style="animation-delay: 0.4s" />
      </div>
    </div>

    <!-- 鱼上钩了! 张力游戏 -->
    <div v-else-if="phase === 'tension'">
      <p class="text-xs text-center mb-2 text-accent bite-flash">鱼上钩了！注意张力！</p>

      <div class="flex space-x-3 items-stretch mb-3">
        <!-- 张力条 (竖条) -->
        <div class="w-8 h-44 bg-bg border border-accent/30 relative overflow-hidden shrink-0">
          <!-- 最佳区 60-72% -->
          <div class="absolute left-0 right-0 bg-success/15 border-y border-success/30" style="bottom: 60%; height: 12%" />
          <!-- 危险区 85%+ -->
          <div class="absolute left-0 right-0 bg-danger/15 border-b border-danger/30" style="bottom: 85%; height: 15%" />
          <!-- 填充 -->
          <div
            class="absolute bottom-0 left-0 right-0 transition-none"
            :class="tensionPct > 85 ? 'bg-danger/70' : tensionPct >= 55 ? 'bg-success/60' : 'bg-accent/40'"
            :style="{ height: `${tensionPct}%` }"
          />
          <!-- 标签 -->
          <span class="absolute text-center w-full" style="bottom: 65%; font-size: 8px; color: var(--color-success)">佳</span>
          <span class="absolute text-center w-full" style="bottom: 88%; font-size: 8px; color: var(--color-danger)">断</span>
        </div>

        <!-- 水域 (鱼移动区) -->
        <div class="flex-1 h-44 bg-bg border border-accent/20 relative overflow-hidden">
          <div class="absolute inset-0 opacity-10 water-ripple" />
          <!-- 鱼 -->
          <div class="absolute transition-none" :style="{ top: `${fishVisualY}%`, left: `${fishVisualX}%` }">
            <Fish :size="18" class="text-accent fish-thrash" />
          </div>
          <span class="absolute bottom-0.5 right-1 text-muted" style="font-size: 9px">第{{ currentRound }}轮</span>
        </div>
      </div>

      <Button class="w-full py-2.5" :icon="ArrowUp" @click="pullRod">收竿！</Button>
      <p class="text-xs text-muted text-center mt-1">绿色区域收竿效果最佳，红色区域鱼线会断！</p>
    </div>

    <!-- 单轮结果 -->
    <div v-else-if="phase === 'round_result'" class="text-center py-4">
      <div :class="resultAnimClass">
        <p
          class="text-sm mb-1"
          :class="{
            'text-accent': lastGrade === 'perfect',
            'text-success': lastGrade === 'good',
            'text-danger': lastGrade === 'escaped',
            'text-muted': lastGrade === 'poor'
          }"
        >
          {{ gradeText }}
        </p>
        <div v-if="lastGrade !== 'escaped'" class="mt-2">
          <p class="text-accent text-xs">{{ catches[catches.length - 1]?.name }}</p>
          <p class="text-xs text-muted">{{ catches[catches.length - 1]?.weight }}斤 · +{{ catches[catches.length - 1]?.score }}分</p>
        </div>
        <div v-else class="mt-2">
          <p class="text-xs text-danger">张力太大，鱼线断了！</p>
        </div>
      </div>
    </div>

    <!-- 比赛结束 -->
    <div v-else>
      <p class="text-xs text-muted mb-2">比赛结束！</p>

      <div class="border border-accent/20 p-2 mb-3">
        <p class="text-xs text-muted mb-1">最终排名：</p>
        <div
          v-for="(entry, i) in rankings"
          :key="entry.name"
          class="flex items-center justify-between text-xs py-0.5 border-b border-accent/10 last:border-0"
        >
          <div>
            <span class="mr-2" :class="{ 'text-accent': i === 0, 'text-success': entry.name === '你' }">第{{ i + 1 }}名</span>
            <span :class="{ 'text-success': entry.name === '你' }">{{ entry.name }}</span>
          </div>
          <span class="text-muted">{{ entry.score }} 分</span>
        </div>
      </div>

      <div v-if="catches.length > 0" class="border border-accent/20 p-2 mb-3">
        <p class="text-xs text-muted mb-1">你的收获：</p>
        <div
          v-for="(c, i) in catches"
          :key="i"
          class="flex items-center justify-between text-xs py-0.5 border-b border-accent/10 last:border-0"
        >
          <span class="text-accent">{{ c.name }}</span>
          <span class="text-muted">{{ c.weight }}斤 · +{{ c.score }}分</span>
        </div>
      </div>

      <div class="mb-3 text-xs text-center border border-accent/20 p-2">
        <span v-if="playerRank === 1" class="text-accent">恭喜你获得冠军！奖金 500文</span>
        <span v-else-if="playerRank === 2" class="text-success">你获得了亚军！奖金 200文</span>
        <span v-else-if="playerRank === 3" class="text-success">你获得了季军！奖金 100文</span>
        <span v-else class="text-muted">很遗憾，没有获得名次。下次再努力吧！</span>
      </div>

      <Button class="w-full" @click="handleClaim">领取奖励</Button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onUnmounted } from 'vue'
  import { Fish, ArrowUp, Waves } from 'lucide-vue-next'
  import {
    sfxGameStart,
    sfxCastLine,
    sfxFishBite,
    sfxMiniPerfect,
    sfxMiniGood,
    sfxMiniPoor,
    sfxMiniFail,
    sfxRankFirst,
    sfxRankSecond,
    sfxRankThird,
    sfxRankLose
  } from '@/composables/useAudio'
  import Button from '@/components/game/Button.vue'

  const emit = defineEmits<{ complete: [prize: number] }>()

  type Phase = 'ready' | 'casting' | 'waiting' | 'tension' | 'round_result' | 'finished'
  type CatchGrade = 'perfect' | 'good' | 'poor' | 'escaped'

  /** 鱼的三个等级池 */
  const FISH_TIERS = {
    perfect: [
      { name: '锦鲤', minW: 2.0, maxW: 5.0, baseScore: 50 },
      { name: '桂花鱼', minW: 1.5, maxW: 4.0, baseScore: 45 },
      { name: '鲟鱼', minW: 3.0, maxW: 8.0, baseScore: 55 }
    ],
    good: [
      { name: '鲈鱼', minW: 1.5, maxW: 4.0, baseScore: 30 },
      { name: '鲶鱼', minW: 2.0, maxW: 5.0, baseScore: 25 },
      { name: '鲤鱼', minW: 1.0, maxW: 3.5, baseScore: 20 }
    ],
    poor: [
      { name: '鲫鱼', minW: 0.5, maxW: 2.0, baseScore: 8 },
      { name: '草鱼', minW: 1.0, maxW: 3.0, baseScore: 12 }
    ]
  }

  interface CatchRecord {
    name: string
    weight: number
    score: number
  }

  interface Participant {
    name: string
    score: number
  }

  const phase = ref<Phase>('ready')
  const currentRound = ref(1)
  const catches = ref<CatchRecord[]>([])
  const rankings = ref<Participant[]>([])
  const lastGrade = ref<CatchGrade>('poor')

  // 张力游戏状态
  const tensionPct = ref(0)
  const fishVisualX = ref(40)
  const fishVisualY = ref(40)

  let tensionTimer: ReturnType<typeof setInterval> | null = null
  let fishMoveTimer: ReturnType<typeof setInterval> | null = null
  let phaseTimeout: ReturnType<typeof setTimeout> | null = null

  const playerTotal = computed(() => catches.value.reduce((sum, c) => sum + c.score, 0))

  const playerRank = computed(() => {
    const idx = rankings.value.findIndex(e => e.name === '你')
    return idx === -1 ? 99 : idx + 1
  })

  const gradeText = computed(() => {
    switch (lastGrade.value) {
      case 'perfect':
        return '完美收竿！大鱼上钩！'
      case 'good':
        return '不错的收获！'
      case 'poor':
        return '鱼太小了…'
      case 'escaped':
        return '鱼线断了！'
    }
  })

  const resultAnimClass = computed(() => {
    switch (lastGrade.value) {
      case 'perfect':
        return 'catch-perfect'
      case 'good':
        return 'catch-good'
      default:
        return 'catch-poor'
    }
  })

  /** 根据等级随机生成一条鱼 */
  const randomFish = (grade: 'perfect' | 'good' | 'poor'): CatchRecord => {
    const pool = FISH_TIERS[grade]
    const fish = pool[Math.floor(Math.random() * pool.length)]!
    const weight = +(fish.minW + Math.random() * (fish.maxW - fish.minW)).toFixed(1)
    // 权重乘数封顶1.8，避免极端高分
    const weightMult = Math.min(1.8, weight / fish.minW)
    const score = Math.round(fish.baseScore * weightMult)
    return { name: fish.name, weight, score }
  }

  const castLine = () => {
    if (currentRound.value === 1) sfxGameStart()
    sfxCastLine()
    phase.value = 'casting'
    phaseTimeout = setTimeout(() => {
      phase.value = 'waiting'
      // 1-3秒后鱼上钩
      const waitTime = 1000 + Math.random() * 2000
      phaseTimeout = setTimeout(() => {
        startTension()
      }, waitTime)
    }, 800)
  }

  const startTension = () => {
    sfxFishBite()
    phase.value = 'tension'
    tensionPct.value = 0
    fishVisualX.value = 30 + Math.random() * 40
    fishVisualY.value = 20 + Math.random() * 60

    // 张力上升速度随轮次大幅增加
    const baseSpeed = [1.2, 1.8, 2.6][currentRound.value - 1] ?? 1.2
    let tickCount = 0

    tensionTimer = setInterval(() => {
      tickCount++
      // 大幅随机波动模拟鱼的挣扎（偏正向）
      const fluctuation = (Math.random() - 0.25) * 0.8
      let speed = Math.max(0.3, baseSpeed + fluctuation)

      // 随机张力突刺：每隔一段时间可能出现突然的张力飙升
      if (tickCount % 20 === 0 && Math.random() < 0.4) {
        speed += 2.0 + Math.random() * 2.0
      }

      tensionPct.value = Math.min(100, tensionPct.value + speed)

      if (tensionPct.value >= 100) {
        stopTimers()
        lastGrade.value = 'escaped'
        phase.value = 'round_result'
        advanceRound()
      }
    }, 50)

    // 鱼的视觉移动
    fishMoveTimer = setInterval(() => {
      fishVisualX.value = Math.max(5, Math.min(75, fishVisualX.value + (Math.random() - 0.5) * 15))
      fishVisualY.value = Math.max(5, Math.min(75, fishVisualY.value + (Math.random() - 0.5) * 15))
    }, 200)
  }

  const pullRod = () => {
    if (phase.value !== 'tension') return
    stopTimers()

    const pct = tensionPct.value
    let grade: CatchGrade

    if (pct >= 60 && pct <= 72) {
      grade = 'perfect'
    } else if ((pct >= 40 && pct < 60) || (pct > 72 && pct <= 85)) {
      grade = 'good'
    } else if (pct > 85) {
      grade = 'escaped'
    } else {
      grade = 'poor'
    }

    lastGrade.value = grade

    // 按等级播放不同音效
    if (grade === 'perfect') sfxMiniPerfect()
    else if (grade === 'good') sfxMiniGood()
    else if (grade === 'poor') sfxMiniPoor()
    else sfxMiniFail()

    if (grade !== 'escaped') {
      const fishGrade = grade === 'perfect' ? 'perfect' : grade === 'good' ? 'good' : 'poor'
      const fish = randomFish(fishGrade)
      catches.value.push(fish)
    }

    phase.value = 'round_result'
    advanceRound()
  }

  const advanceRound = () => {
    phaseTimeout = setTimeout(() => {
      if (currentRound.value >= 3) {
        finishContest()
      } else {
        currentRound.value++
        phase.value = 'ready'
      }
    }, 1800)
  }

  const finishContest = () => {
    // 每个NPC有不同实力：秋月是高手，陈伯经验丰富，小满运气型
    const npcProfiles: { name: string; perfectRate: number; goodRate: number }[] = [
      { name: '秋月', perfectRate: 0.55, goodRate: 0.9 },
      { name: '陈伯', perfectRate: 0.45, goodRate: 0.85 },
      { name: '小满', perfectRate: 0.35, goodRate: 0.8 }
    ]
    const npcScores = npcProfiles.map(({ name, perfectRate, goodRate }) => {
      let total = 0
      for (let i = 0; i < 3; i++) {
        const r = Math.random()
        const grade = r < perfectRate ? 'perfect' : r < goodRate ? 'good' : ('poor' as const)
        total += randomFish(grade).score
      }
      // NPC额外基础分加成（模拟NPC稳定发挥）
      total += 15 + Math.floor(Math.random() * 20)
      return { name, score: total }
    })

    const player: Participant = { name: '你', score: playerTotal.value }
    const all = [...npcScores, player]
    all.sort((a, b) => b.score - a.score)
    rankings.value = all
    phase.value = 'finished'
  }

  const stopTimers = () => {
    if (tensionTimer) clearInterval(tensionTimer)
    if (fishMoveTimer) clearInterval(fishMoveTimer)
    tensionTimer = null
    fishMoveTimer = null
  }

  const handleClaim = () => {
    const rank = playerRank.value
    if (rank === 1) sfxRankFirst()
    else if (rank === 2) sfxRankSecond()
    else if (rank === 3) sfxRankThird()
    else sfxRankLose()
    const prizes: Record<number, number> = { 1: 500, 2: 200, 3: 100 }
    emit('complete', prizes[playerRank.value] ?? 0)
  }

  onUnmounted(() => {
    stopTimers()
    if (phaseTimeout) clearTimeout(phaseTimeout)
  })
</script>

<style scoped>
  .cast-anim {
    animation: cast-anim 0.8s ease-out;
  }
  @keyframes cast-anim {
    0% {
      transform: translateY(0) rotate(0deg);
    }
    40% {
      transform: translateY(-20px) rotate(-30deg);
    }
    100% {
      transform: translateY(10px) rotate(0deg);
    }
  }

  .float-bob {
    animation: float-bob 1.5s ease-in-out infinite;
  }
  @keyframes float-bob {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-6px);
    }
  }

  .dot-loading {
    animation: dot-loading 1s ease-in-out infinite;
  }
  @keyframes dot-loading {
    0%,
    100% {
      opacity: 0.3;
    }
    50% {
      opacity: 1;
    }
  }

  .bite-flash {
    animation: bite-flash 0.5s ease-in-out infinite;
  }
  @keyframes bite-flash {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }

  .fish-thrash {
    animation: fish-thrash 0.3s ease-in-out infinite;
  }
  @keyframes fish-thrash {
    0%,
    100% {
      transform: scaleX(1);
    }
    50% {
      transform: scaleX(-1);
    }
  }

  .water-ripple {
    background: repeating-linear-gradient(0deg, transparent, transparent 6px, var(--color-accent) 6px, var(--color-accent) 7px);
    animation: water-ripple 3s linear infinite;
  }
  @keyframes water-ripple {
    0% {
      transform: translateY(0);
    }
    100% {
      transform: translateY(14px);
    }
  }

  .catch-perfect {
    animation: catch-perfect 0.5s ease-out;
  }
  @keyframes catch-perfect {
    0% {
      transform: scale(0.8);
      opacity: 0;
    }
    50% {
      transform: scale(1.1);
      opacity: 1;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  .catch-good {
    animation: catch-good 0.4s ease-out;
  }
  @keyframes catch-good {
    0% {
      transform: translateY(5px);
      opacity: 0;
    }
    100% {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .catch-poor {
    animation: catch-poor 0.4s ease-in-out;
  }
  @keyframes catch-poor {
    0%,
    100% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(-3px);
    }
    75% {
      transform: translateX(3px);
    }
  }
</style>
