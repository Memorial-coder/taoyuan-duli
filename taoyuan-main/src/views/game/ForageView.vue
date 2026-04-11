<template>
  <div>
    <h3 class="text-accent text-sm mb-3">
      <TreePine :size="14" class="inline" />
      竹林采集
    </h3>

    <!-- 采集操作 -->
    <div class="border border-accent/20 rounded-xs p-3 mb-4">
      <div class="flex items-center justify-between mb-2">
        <p class="text-sm text-accent">采集</p>
        <span class="text-xs text-muted">消耗 {{ forageCost }} 体力 · {{ forageTimeLabel }}</span>
      </div>
      <p class="text-xs text-muted mb-2">使用斧头在竹林中搜寻各类物资。</p>
      <div
        class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-1.5 cursor-pointer hover:bg-accent/5"
        @click="handleForage"
      >
        <span class="text-xs">采集一次</span>
        <span class="text-xs text-muted">{{ playerStore.stamina }}/{{ playerStore.maxStamina }} 体力</span>
      </div>
      <!-- 天气/加成提示 -->
      <div class="flex flex-wrap space-x-3 mt-2">
        <span v-if="weatherMod !== 1" class="text-[10px]" :class="weatherMod > 1 ? 'text-success' : 'text-danger'">
          {{ weatherModLabel }}
        </span>
        <span v-if="hasHerbalistPerk" class="text-[10px] text-success">药师：概率+20%</span>
        <span v-if="hasLumberjackPerk" class="text-[10px] text-success">
          {{ foragingSkill.perk10 === 'forester' ? '伐木工：必得木材' : '樵夫：25%额外木材' }}
        </span>
        <span v-if="foragingSkill.perk10 === 'tracker'" class="text-[10px] text-success">追踪者：额外+1物品</span>
        <span v-if="cookingLuckBuff > 0" class="text-[10px] text-success">料理运气+{{ cookingLuckBuff }}%</span>
        <span v-if="isForestFarm" class="text-[10px] text-success">森林农场：经验×1.25</span>
      </div>
    </div>

    <!-- 采集结果 -->
    <div class="border border-accent/20 rounded-xs p-3 mb-4">
      <p class="text-sm text-accent mb-2">
        <Search :size="14" class="inline" />
        采集结果
      </p>
      <div v-if="lastResults.length > 0" class="flex flex-col space-y-1">
        <div
          v-for="(r, i) in lastResults"
          :key="i"
          class="flex items-center justify-between border border-accent/10 rounded-xs px-3 py-1.5"
          :class="r.itemId ? 'cursor-pointer hover:bg-accent/5' : ''"
          @click="r.itemId && (selectedResult = r)"
        >
          <span class="text-xs" :class="r.quality ? QUALITY_COLORS[r.quality] : ''">{{ r.label }}</span>
          <span v-if="r.itemId" class="text-xs text-muted/50">详情 ›</span>
        </div>
      </div>
      <div v-else class="flex flex-col items-center justify-center py-6 text-muted">
        <Search :size="32" class="mb-2" />
        <p class="text-xs">还没有采集过，去试试吧。</p>
      </div>
    </div>

    <!-- 采集物详情弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="selectedResult && selectedResultDef"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="selectedResult = null"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="selectedResult = null">
            <X :size="14" />
          </button>

          <p class="text-sm mb-2" :class="selectedResult.quality ? QUALITY_COLORS[selectedResult.quality] : 'text-accent'">
            {{ selectedResultDef.name }}
            <span v-if="selectedResult.quantity > 1" class="text-muted">×{{ selectedResult.quantity }}</span>
          </p>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted">{{ selectedResultDef.description }}</p>
          </div>

          <div class="border border-accent/10 rounded-xs p-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">分类</span>
              <span class="text-xs">{{ CATEGORY_NAMES[selectedResultDef.category] ?? selectedResultDef.category }}</span>
            </div>
            <div v-if="selectedResult.quality && selectedResult.quality !== 'normal'" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">品质</span>
              <span class="text-xs" :class="QUALITY_COLORS[selectedResult.quality]">{{ QUALITY_NAMES[selectedResult.quality] }}</span>
            </div>
            <div v-if="selectedResultDef.sellPrice > 0" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">售价</span>
              <span class="text-xs text-accent">{{ selectedResultDef.sellPrice }}文</span>
            </div>
            <div v-if="selectedResultDef.edible" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">食用效果</span>
              <span class="text-xs text-success">
                {{ selectedResultDef.staminaRestore ? `体力+${selectedResultDef.staminaRestore}` : '' }}
                {{ selectedResultDef.healthRestore ? `HP+${selectedResultDef.healthRestore}` : '' }}
              </span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">来源</span>
              <span class="text-xs">{{ getItemSource(selectedResult.itemId!) }}</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 当季采集物 -->
    <div class="border border-accent/20 rounded-xs p-3">
      <div class="flex items-center justify-between mb-2">
        <p class="text-sm text-accent">当季采集物</p>
        <span class="text-xs text-muted">{{ SEASON_NAMES[gameStore.season] }}季</span>
      </div>
      <div class="flex flex-col space-y-1">
        <div
          v-for="item in currentForage"
          :key="item.itemId"
          class="flex items-center justify-between border border-accent/10 rounded-xs px-3 py-1.5"
        >
          <div>
            <span class="text-xs">{{ item.name }}</span>
            <span class="text-[10px] text-muted ml-2">+{{ item.expReward }}经验</span>
          </div>
          <span class="text-xs text-muted">{{ Math.round(item.chance * 100) }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { TreePine, Search, X } from 'lucide-vue-next'
  import { useAchievementStore } from '@/stores/useAchievementStore'
  import { useCookingStore } from '@/stores/useCookingStore'
  import { useGameStore, SEASON_NAMES } from '@/stores/useGameStore'
  import { useInventoryStore } from '@/stores/useInventoryStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import { useQuestStore } from '@/stores/useQuestStore'
  import { useSkillStore } from '@/stores/useSkillStore'
  import { useWalletStore } from '@/stores/useWalletStore'
  import type { Quality } from '@/types'
  import { getForageItems, getItemById, getItemSource } from '@/data'
  import { WEATHER_FORAGE_MODIFIER } from '@/data/forage'
  import { ACTION_TIME_COSTS, TOOL_TIME_SAVINGS, SKILL_TIME_REDUCTION_PER_LEVEL, MIN_ACTION_MINUTES } from '@/data/timeConstants'
  import { sfxForage } from '@/composables/useAudio'
  import { addLog } from '@/composables/useGameLog'
  import { handleEndDay } from '@/composables/useEndDay'
  import { useHiddenNpcStore } from '@/stores/useHiddenNpcStore'

  const playerStore = usePlayerStore()
  const inventoryStore = useInventoryStore()
  const skillStore = useSkillStore()
  const gameStore = useGameStore()
  const achievementStore = useAchievementStore()
  const cookingStore = useCookingStore()
  const walletStore = useWalletStore()

  interface ForageResult {
    label: string
    itemId?: string
    quantity: number
    quality?: Quality
  }

  const QUALITY_COLORS: Record<Quality, string> = {
    normal: '',
    fine: 'text-quality-fine',
    excellent: 'text-quality-excellent',
    supreme: 'text-quality-supreme'
  }

  const QUALITY_NAMES: Record<Quality, string> = {
    normal: '普通',
    fine: '优质',
    excellent: '精品',
    supreme: '极品'
  }

  const CATEGORY_NAMES: Record<string, string> = {
    seed: '种子',
    crop: '农作物',
    fish: '鱼类',
    ore: '矿石',
    gem: '宝石',
    gift: '礼物',
    food: '食物',
    material: '材料',
    misc: '杂项',
    processed: '加工品',
    machine: '机器',
    sprinkler: '洒水器',
    fertilizer: '肥料',
    animal_product: '畜产品',
    sapling: '树苗',
    fruit: '水果',
    bait: '鱼饵',
    tackle: '钓具',
    bomb: '炸弹',
    fossil: '化石',
    artifact: '文物',
    weapon: '武器',
    ring: '戒指',
    hat: '帽子',
    shoe: '鞋子'
  }

  const lastResults = ref<ForageResult[]>([])
  const selectedResult = ref<ForageResult | null>(null)

  const selectedResultDef = computed(() => {
    if (!selectedResult.value?.itemId) return null
    return getItemById(selectedResult.value.itemId) ?? null
  })

  const currentForage = computed(() => getForageItems(gameStore.season))
  const foragingSkill = computed(() => skillStore.getSkill('foraging'))

  const forageCost = computed(() =>
    Math.max(1, Math.floor(5 * inventoryStore.getToolStaminaMultiplier('axe') * (1 - skillStore.getStaminaReduction('foraging'))))
  )

  /** 采集耗时（小时），受工具和技能减免 */
  const forageTime = computed(() => {
    const baseMin = ACTION_TIME_COSTS.forage * 60
    const toolTier = inventoryStore.getTool('axe')?.tier ?? 'basic'
    const saving = TOOL_TIME_SAVINGS[toolTier] ?? 0
    const skillReduction = skillStore.getSkill('foraging').level * SKILL_TIME_REDUCTION_PER_LEVEL
    return Math.max(MIN_ACTION_MINUTES, Math.round((baseMin - saving) * (1 - skillReduction))) / 60
  })

  const forageTimeLabel = computed(() => `${Math.round(forageTime.value * 60)}分钟`)

  const weatherMod = computed(() => WEATHER_FORAGE_MODIFIER[gameStore.weather] ?? 1)

  const WEATHER_MOD_LABELS: Record<string, string> = {
    rainy: '雨天：概率+15%',
    stormy: '雷雨：概率-20%',
    snowy: '雪天：概率-10%',
    windy: '大风：概率+10%',
    green_rain: '绿雨：概率+50%'
  }

  const weatherModLabel = computed(() => WEATHER_MOD_LABELS[gameStore.weather] ?? '')

  const hasHerbalistPerk = computed(() => foragingSkill.value.perk5 === 'herbalist')
  const hasLumberjackPerk = computed(() => foragingSkill.value.perk5 === 'lumberjack' || foragingSkill.value.perk10 === 'forester')
  const isForestFarm = computed(() => gameStore.farmMapType === 'forest')
  const cookingLuckBuff = computed(() => (cookingStore.activeBuff?.type === 'luck' ? cookingStore.activeBuff.value : 0))

  const handleForage = () => {
    if (gameStore.isPastBedtime) {
      addLog('太晚了，没法采集了。')
      handleEndDay()
      return
    }

    if (!inventoryStore.isToolAvailable('axe')) {
      addLog('斧头正在升级中，无法采集。')
      return
    }

    const cost = forageCost.value
    if (!playerStore.consumeStamina(cost)) {
      addLog('体力不足，无法采集。')
      return
    }

    sfxForage()

    const items = currentForage.value
    const gathered: ForageResult[] = []
    const skill = foragingSkill.value
    const forestFarm = isForestFarm.value
    const forestXpBonus = forestFarm ? 1.25 : 1.0
    const hiddenNpcStore = useHiddenNpcStore()
    const herbDouble = hiddenNpcStore.isAbilityActive('yue_tu_1')
    const moonHerbChance = hiddenNpcStore.isAbilityActive('yue_tu_3')

    for (const item of items) {
      const herbalistBonus = skill.perk5 === 'herbalist' ? 1.2 : 1.0
      const cookingBuff = cookingStore.activeBuff?.type === 'luck' ? cookingStore.activeBuff.value / 100 : 0
      const adjustedChance = Math.min(
        1,
        item.chance * (WEATHER_FORAGE_MODIFIER[gameStore.weather] ?? 1) * herbalistBonus * (1 + cookingBuff)
      )
      if (Math.random() < adjustedChance) {
        const forageAllSkillsBuff = cookingStore.activeBuff?.type === 'all_skills' ? cookingStore.activeBuff.value : 0
        let quality = skillStore.rollForageQuality(forageAllSkillsBuff)
        const walletBoost = walletStore.getForageQualityBoost()
        if (walletBoost > 0) {
          const qualityOrder: Quality[] = ['normal', 'fine', 'excellent', 'supreme']
          const idx = qualityOrder.indexOf(quality)
          const newIdx = Math.min(idx + walletBoost, qualityOrder.length - 1)
          quality = qualityOrder[newIdx]!
        }
        // perk20: 世界之树 采集量×3
        const worldTreeMult = skill.perk20 === 'world_tree' ? 3 : 1
        const qty = (forestFarm && Math.random() < 0.2 ? 2 : 1) * worldTreeMult
        // 仙缘能力：药知（yue_tu_1）草药采集双倍
        const finalQty = herbDouble && (item.itemId === 'herb' || item.itemId === 'ginseng') ? qty * 2 : qty
        inventoryStore.addItem(item.itemId, finalQty, quality)
        achievementStore.discoverItem(item.itemId)
        useQuestStore().onItemObtained(item.itemId, finalQty)
        const itemDef = getItemById(item.itemId)
        const name = itemDef?.name ?? item.itemId
        gathered.push({ label: `获得了${finalQty > 1 ? `${name}×${finalQty}` : name}`, itemId: item.itemId, quantity: finalQty, quality })
        skillStore.addExp('foraging', Math.floor(item.expReward * forestXpBonus))
      }
    }

    if (skill.perk15 === 'forest_guardian' || skill.perk20 === 'forest_spirit') {
      const woodQty = skill.perk20 === 'forest_spirit' ? 3 : 2
      inventoryStore.addItem('wood', woodQty)
      gathered.push({ label: `获得了木材×${woodQty}`, itemId: 'wood', quantity: woodQty })
    } else if (skill.perk10 === 'forester') {
      inventoryStore.addItem('wood')
      gathered.push({ label: '获得了木材', itemId: 'wood', quantity: 1 })
    } else if (skill.perk5 === 'lumberjack' && Math.random() < 0.25) {
      inventoryStore.addItem('wood')
      gathered.push({ label: '获得了木材', itemId: 'wood', quantity: 1 })
    }

    const extraItemQty = skill.perk20 === 'primal_tracker' ? 4 : skill.perk15 === 'wilderness_expert' ? 2 : skill.perk10 === 'tracker' ? 1 : 0
    if (extraItemQty > 0 && items.length > 0) {
      const randomItem = items[Math.floor(Math.random() * items.length)]!
      const trackerAllSkillsBuff = cookingStore.activeBuff?.type === 'all_skills' ? cookingStore.activeBuff.value : 0
      const quality = skillStore.rollForageQuality(trackerAllSkillsBuff)
      inventoryStore.addItem(randomItem.itemId, extraItemQty, quality)
      achievementStore.discoverItem(randomItem.itemId)
      const itemDef = getItemById(randomItem.itemId)
      const name = itemDef?.name ?? randomItem.itemId
      gathered.push({ label: `获得了${extraItemQty > 1 ? `${name}×${extraItemQty}` : name}`, itemId: randomItem.itemId, quantity: extraItemQty, quality })
    }

    // 仙缘能力：月华（yue_tu_3）采集8%概率获得月草
    if (moonHerbChance && Math.random() < 0.08) {
      inventoryStore.addItem('moon_herb', 1)
      achievementStore.discoverItem('moon_herb')
      gathered.push({ label: '获得了月草', itemId: 'moon_herb', quantity: 1 })
      skillStore.addExp('foraging', 15)
    }

    if (gathered.length === 0) {
      gathered.push({ label: '什么也没找到……', quantity: 0 })
    }

    lastResults.value = gathered
    const { leveledUp, newLevel } = skillStore.addExp('foraging', 0)
    const names = gathered
      .filter(g => g.itemId)
      .map(g => {
        const def = getItemById(g.itemId!)
        const name = def?.name ?? g.itemId!
        return g.quantity > 1 ? `${name}×${g.quantity}` : name
      })
    let msg = `在竹林中采集，获得了${names.join('、') || '空气'}。(-${cost}体力)`
    if (leveledUp) msg += ` 采集提升到${newLevel}级！`
    addLog(msg)

    const tr = gameStore.advanceTime(forageTime.value)
    if (tr.message) addLog(tr.message)
    if (tr.passedOut) handleEndDay()
  }
</script>
