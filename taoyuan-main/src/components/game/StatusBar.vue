<template>
  <div class="border-b border-accent/30 pb-2 md:pb-3 flex flex-col space-y-1" data-testid="status-bar">
    <!-- 第一行：日期时间天气 + 铜钱 -->
    <div class="flex items-center justify-between text-xs md:text-sm">
      <div class="flex items-center space-x-2 md:space-x-3">
        <span class="text-accent font-bold">桃源乡</span>
        <span class="text-muted text-xs max-w-16 truncate">{{ playerStore.playerName }}</span>
        <span class="hidden md:inline">第{{ gameStore.year }}年</span>
        <span>{{ SEASON_NAMES[gameStore.season] }} 第{{ gameStore.day }}天</span>
        <span class="text-muted hidden md:inline">({{ gameStore.weekdayName }})</span>
        <span :class="{ 'text-danger': gameStore.isLateNight }">{{ gameStore.timeDisplay }}</span>
        <span class="text-muted">{{ WEATHER_NAMES[gameStore.weather] }}</span>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button class="border border-accent/30 rounded-xs px-2 py-0.5 text-[10px] md:text-xs text-accent hover:bg-accent/10" @click="handleQuickSave">
          保存
        </button>
        <button class="border border-accent/30 rounded-xs px-2 py-0.5 text-[10px] md:text-xs text-accent hover:bg-accent/10" @click="handleSaveAndReturn">
          保存并返回
        </button>
        <span class="text-accent shrink-0">
          <Coins :size="12" class="inline" />
          {{ playerStore.money }}文
        </span>
      </div>
    </div>

    <!-- 第二行：市场行情摘要（仅显示异常行情） -->
    <div v-if="notableMarket.length > 0" class="status-market-strip flex items-center space-x-2 text-[10px] md:text-xs overflow-x-auto whitespace-nowrap">
      <span class="text-muted shrink-0">今日行情</span>
      <span v-for="m in notableMarket" :key="m.category" class="shrink-0" :class="{
        'text-danger': m.trend === 'boom' || m.trend === 'crash',
        'text-success': m.trend === 'rising',
        'text-warning': m.trend === 'falling'
      }">
        {{ MARKET_CATEGORY_NAMES[m.category] }}{{ m.trend === 'boom' || m.trend === 'rising' ? '↑' : '↓' }}{{ TREND_NAMES[m.trend] }}
      </span>
    </div>

    <!-- 第三行：状态条 + 音频控制 -->
    <div class="flex items-center justify-between text-xs flex-wrap">
      <div class="flex items-center space-x-2 md:space-x-4 flex-wrap">
        <!-- 体力 -->
        <div class="flex items-center space-x-1">
          <span :class="{ 'text-danger stamina-critical': playerStore.isExhausted }">
            <Zap :size="12" class="inline" />
            {{ playerStore.stamina }}/{{ playerStore.maxStamina }}
          </span>
          <div class="w-14 md:w-20 h-2 bg-bg rounded-xs border border-accent/20">
            <div
              class="h-full rounded-xs transition-all duration-300"
              :class="staminaBarColor"
              :style="{ width: playerStore.staminaPercent + '%' }"
            />
          </div>
        </div>
        <!-- HP（矿洞或受伤时显示） -->
        <div v-if="showHpBar" class="flex items-center space-x-1">
          <span :class="{ 'text-danger stamina-critical': playerStore.getIsLowHp() }">
            <Heart :size="12" class="inline" />
            {{ playerStore.hp }}/{{ playerStore.getMaxHp() }}
          </span>
          <div class="w-12 md:w-16 h-2 bg-bg rounded-xs border border-accent/20">
            <div
              class="h-full rounded-xs transition-all duration-300"
              :class="hpBarColor"
              :style="{ width: playerStore.getHpPercent() + '%' }"
            />
          </div>
        </div>
        <!-- 剩余时间 -->
        <div class="flex items-center space-x-1">
          <Clock :size="12" class="tinline" />
          <div class="w-12 md:w-16 h-2 bg-bg rounded-xs border border-accent/20">
            <div class="h-full rounded-xs transition-all duration-300" :class="timeBarColor" :style="{ width: timePercent + '%' }" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { useGameStore, SEASON_NAMES, WEATHER_NAMES } from '@/stores/useGameStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import { useShopStore } from '@/stores/useShopStore'
  import { DAY_START_HOUR, DAY_END_HOUR } from '@/data/timeConstants'
  import { getDailyMarketInfo, MARKET_CATEGORY_NAMES, TREND_NAMES } from '@/data/market'
  import { Zap, Heart, Clock, Coins } from 'lucide-vue-next'

  const emit = defineEmits<{ requestSleep: []; requestSaveManager: [payload: { intent: 'save' | 'save-return'; returnUrl: string }] }>()

  const gameStore = useGameStore()
  const playerStore = usePlayerStore()
  const shopStore = useShopStore()
  const returnUrl = ref('/')

  const notableMarket = computed(() => {
    const info = getDailyMarketInfo(gameStore.year, gameStore.seasonIndex, gameStore.day, shopStore.getRecentShipping())
    return info.filter(m => m.trend !== 'stable')
  })

  const loadReturnUrl = async () => {
    try {
      const res = await fetch('/api/public-config', { credentials: 'include' })
      const data = await res.json()
      if (data?.ok && typeof data.taoyuan_return_button_url === 'string' && data.taoyuan_return_button_url.trim()) {
        returnUrl.value = data.taoyuan_return_button_url
      }
    } catch {
      returnUrl.value = '/'
    }
  }

  const handleQuickSave = async () => {
    emit('requestSaveManager', { intent: 'save', returnUrl: returnUrl.value || '/' })
  }

  const handleSaveAndReturn = async () => {
    emit('requestSaveManager', { intent: 'save-return', returnUrl: returnUrl.value || '/' })
  }

  const staminaBarColor = computed(() => {
    const pct = playerStore.staminaPercent
    if (pct <= 12) return 'bg-danger stamina-critical'
    if (pct <= 35) return 'bg-danger'
    if (pct <= 60) return 'bg-accent'
    return 'bg-success'
  })

  /** HP 条是否显示：在矿洞中或HP不满 */
  const showHpBar = computed(() => {
    return gameStore.currentLocationGroup === 'mine' || playerStore.hp < playerStore.getMaxHp()
  })

  const hpBarColor = computed(() => {
    const pct = playerStore.getHpPercent()
    if (pct <= 25) return 'bg-danger stamina-critical'
    if (pct <= 60) return 'bg-danger'
    return 'bg-success'
  })

  /** 剩余时间百分比 */
  const timePercent = computed(() => {
    const total = DAY_END_HOUR - DAY_START_HOUR // 20 hours
    const remaining = DAY_END_HOUR - gameStore.hour
    return Math.max(0, Math.round((remaining / total) * 100))
  })

  const timeBarColor = computed(() => {
    if (gameStore.isLateNight) return 'bg-danger'
    if (timePercent.value <= 25) return 'bg-danger'
    if (timePercent.value <= 50) return 'bg-accent'
    return 'bg-success'
  })

  onMounted(() => {
    void loadReturnUrl()
  })
</script>

<style scoped>
  /* 体力条闪烁 */
  @keyframes staminaPulse {
    0%,
    100% {
      opacity: 1;
    }

    50% {
      opacity: 0.4;
    }
  }

  .stamina-critical {
    animation: staminaPulse 1s ease-in-out infinite;
  }

  .status-market-strip {
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;
    padding-bottom: 2px;
    mask-image: linear-gradient(to right, transparent 0, black 8px, black calc(100% - 8px), transparent 100%);
    -webkit-mask-image: linear-gradient(to right, transparent 0, black 8px, black calc(100% - 8px), transparent 100%);
  }

  .status-market-strip::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
  }
</style>
