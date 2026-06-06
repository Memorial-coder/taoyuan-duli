<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-accent text-sm">灶台</h3>
      <button
        class="text-[0.625rem] px-2 py-0.5 border rounded-xs"
        :class="showOnlyMakeable ? 'border-accent text-accent' : 'border-accent/20 text-muted'"
        @click="showOnlyMakeable = !showOnlyMakeable"
      >
        {{ showOnlyMakeable ? '可制作' : '全部' }}
      </button>
    </div>
    <p v-if="tutorialHint" class="tutorial-hint mb-2">{{ tutorialHint }}</p>

    <!-- 当前增益 -->
    <div v-if="cookingStore.activeBuff" class="border border-water/20 rounded-xs px-3 py-1.5 mb-3">
      <p class="text-[0.625rem] text-water">
        <Zap :size="12" class="inline mr-0.5" />
        当前增益：{{ cookingStore.activeBuff.description }}
      </p>
    </div>

    <!-- 最近料理线索 -->
    <div v-if="cookingStore.recentStoryTriggerRecords.length > 0" class="border border-water/20 rounded-xs px-3 py-1.5 mb-3">
      <p class="text-[0.625rem] text-water mb-1">最近料理线索</p>
      <div
        v-for="record in cookingStore.recentStoryTriggerRecords.slice(0, 3)"
        :key="record.id"
        class="flex items-start justify-between gap-2 py-0.5"
      >
        <div class="min-w-0">
          <p class="text-xs text-text truncate">{{ record.recipeName }} ×{{ record.quantity }}</p>
          <p class="text-[0.625rem] text-muted leading-snug">
            {{ record.categoryLabels.join('、') || '料理' }} · {{ record.triggerLabels.join('、') }}
          </p>
        </div>
        <span class="text-[0.625rem] text-water/70 whitespace-nowrap">可回看</span>
      </div>
    </div>

    <!-- 用途推荐 -->
    <div v-if="cookingRecommendations.length > 0" class="border border-accent/20 rounded-xs px-3 py-1.5 mb-3">
      <p class="text-[0.625rem] text-accent mb-1">用途推荐</p>
      <div
        v-for="info in cookingRecommendations"
        :key="`recommend-${info.recipe.id}`"
        class="flex items-start justify-between gap-2 py-0.5"
      >
        <div class="flex min-w-0 items-center gap-2">
          <ItemIcon :item="info.outputItem" size="xs" :quality="info.quality" />
          <div class="min-w-0">
            <p class="text-xs text-text truncate">{{ info.recipe.name }}</p>
            <p class="text-[0.625rem] text-muted leading-snug">{{ info.recommendationText }}</p>
          </div>
        </div>
        <button class="text-[0.625rem] text-accent/80 shrink-0" @click="openModal(info.recipe.id)">查看</button>
      </div>
    </div>

    <!-- 食谱列表 -->
    <div v-if="displayedRecipeInfos.length > 0" class="border border-accent/20 rounded-xs divide-y divide-accent/10 mb-4">
      <div
        v-for="info in displayedRecipeInfos"
        :key="info.recipe.id"
        class="px-3 py-1.5 cursor-pointer hover:bg-accent/5"
        @click="openModal(info.recipe.id)"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="flex min-w-0 items-center gap-2">
            <ItemIcon :item="info.outputItem" size="sm" :quality="info.quality" :silhouette="!info.canCook" />
            <span class="min-w-0 text-xs" :class="info.canCook ? 'text-text' : 'text-muted'">
              <span class="block truncate">{{ info.recipe.name }}</span>
              <span v-if="info.canCook && info.quality !== 'normal'" class="block text-[0.625rem]" :class="qualityTextClass(info.quality)">
                [{{ QUALITY_NAMES[info.quality] }}]
              </span>
            </span>
          </div>
          <span class="text-[0.625rem] whitespace-nowrap ml-2" :class="info.canCook ? 'text-success' : 'text-muted/50'">
            +{{ info.recipe.effect.staminaRestore }}体力
            <span v-if="info.recipe.effect.healthRestore">+{{ info.recipe.effect.healthRestore }}生命</span>
          </span>
        </div>
        <p v-if="info.categoryText" class="text-[0.625rem] text-accent/80 mt-0.5">{{ info.categoryText }}</p>
        <p v-if="info.storyTriggerText" class="text-[0.625rem] text-water/90 mt-0.5">{{ info.storyTriggerText }}</p>
        <p v-if="info.recipe.effect.buff" class="text-[0.625rem] text-water mt-0.5">{{ info.recipe.effect.buff.description }}</p>
        <p v-if="info.cropUseText" class="text-[0.625rem] text-muted mt-0.5">{{ info.cropUseText }}</p>
        <p v-if="info.substitutionText" class="text-[0.625rem] text-accent/80 mt-0.5">{{ info.substitutionText }}</p>
        <p v-if="info.recommendationText" class="text-[0.625rem] text-accent/80 mt-0.5">{{ info.recommendationText }}</p>
      </div>
    </div>
    <div v-else class="flex flex-col items-center justify-center py-8 mb-4">
      <UtensilsCrossed :size="36" class="text-accent/20 mb-2" />
      <p v-if="showOnlyMakeable" class="text-xs text-muted">没有可制作的食谱</p>
      <p v-else-if="cookingStore.recipes.length === 0" class="text-xs text-muted">还没有食谱</p>
      <p v-if="showOnlyMakeable" class="text-[0.625rem] text-muted/50 mt-0.5">取消筛选或收集更多食材</p>
      <p v-else-if="cookingStore.recipes.length === 0" class="text-[0.625rem] text-muted/50 mt-0.5">与村民交好或观看电视可学习食谱</p>
    </div>

    <!-- 烹饪弹窗 -->
    <Transition name="panel-fade">
      <div v-if="modalInfo" class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="closeModal">
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="closeModal">
            <X :size="14" />
          </button>

          <div class="flex items-start gap-2 mb-2 pr-5">
            <ItemIcon :item="modalInfo.outputItem" size="lg" :resolution="256" :quality="modalInfo.quality" />
            <p class="min-w-0 text-sm text-accent">
              <span class="block truncate">{{ modalInfo.recipe.name }}</span>
              <span
                v-if="modalInfo.canCook && modalInfo.quality !== 'normal'"
                class="block text-[0.625rem]"
                :class="qualityTextClass(modalInfo.quality)"
              >
                [{{ QUALITY_NAMES[modalInfo.quality] }}]
              </span>
            </p>
          </div>

          <!-- 功效 -->
          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p v-if="modalInfo.categoryText" class="text-xs text-accent mb-1">分类：{{ modalInfo.categoryText }}</p>
            <p v-if="modalInfo.storyTriggerText" class="text-xs text-water mb-1">剧情：{{ modalInfo.storyTriggerText }}</p>
            <p class="text-xs text-success">
              恢复 {{ modalInfo.recipe.effect.staminaRestore }} 体力
              <span v-if="modalInfo.recipe.effect.healthRestore" class="text-danger ml-1">
                {{ modalInfo.recipe.effect.healthRestore }} 生命值
              </span>
            </p>
            <p v-if="modalInfo.recipe.effect.buff" class="text-xs text-water mt-0.5">
              {{ modalInfo.recipe.effect.buff.description }}
            </p>
            <p v-if="modalInfo.recommendationText" class="text-xs text-accent/80 mt-0.5">
              {{ modalInfo.recommendationText }}
            </p>
          </div>

          <!-- 材料 -->
          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted mb-1">所需材料</p>
            <div v-for="ing in modalInfo.ingredients" :key="ing.itemId" class="py-0.5">
              <div class="flex items-center justify-between gap-2">
                <span class="flex min-w-0 items-center gap-1.5 text-xs text-muted">
                  <ItemIcon :item="ing.item" size="xs" :quality="modalInfo.quality" />
                  <span class="truncate">{{ ing.name }}</span>
                </span>
                <span class="text-xs" :class="ing.enough ? '' : 'text-danger'">{{ ing.available }}/{{ ing.quantity }}</span>
              </div>
              <p v-if="ing.cropUseText" class="text-[0.625rem] text-muted/80 leading-snug">{{ ing.cropUseText }}</p>
              <p v-if="ing.substitutionText" class="text-[0.625rem] text-accent/80 leading-snug">{{ ing.substitutionText }}</p>
            </div>
          </div>

          <!-- 数量选择 -->
          <div v-if="modalInfo.maxQty > 1" class="border border-accent/10 rounded-xs p-2 mb-2">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs text-muted">数量</span>
              <div class="flex items-center space-x-1">
                <Button class="h-6 px-1.5 py-0.5 text-xs justify-center" :disabled="modalQty <= 1" @click="modalQty--">
                  <Minus :size="12" />
                </Button>
                <input
                  type="number"
                  :value="modalQty"
                  min="1"
                  :max="modalInfo.maxQty"
                  class="w-24 h-6 px-2 py-0.5 bg-bg border border-accent/30 rounded-xs text-xs text-center text-accent outline-none focus:border-accent transition-colors"
                  @input="onModalQtyInput"
                />
                <Button class="h-6 px-1.5 py-0.5 text-xs justify-center" :disabled="modalQty >= modalInfo.maxQty" @click="modalQty++">
                  <Plus :size="12" />
                </Button>
              </div>
            </div>
            <div class="flex space-x-1">
              <Button class="flex-1 justify-center" :disabled="modalQty <= 1" @click="modalQty = 1">最少</Button>
              <Button class="flex-1 justify-center" :disabled="modalQty >= modalInfo.maxQty" @click="modalQty = modalInfo.maxQty">
                最多
              </Button>
            </div>
            <div class="flex items-center justify-between mt-1.5">
              <span class="text-xs text-muted">可制作</span>
              <span class="text-xs text-accent">{{ modalInfo.maxQty }} 份</span>
            </div>
          </div>

          <!-- 烹饪按钮 -->
          <Button
            class="w-full justify-center"
            :class="{ '!bg-accent !text-bg': modalInfo.canCook }"
            :icon="UtensilsCrossed"
            :icon-size="12"
            :disabled="!modalInfo.canCook"
            @click="handleCookFromModal"
          >
            烹饪{{ modalQty > 1 ? ` ×${modalQty}` : '' }}
          </Button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { UtensilsCrossed, Zap, X, Minus, Plus } from 'lucide-vue-next'
  import { useAchievementStore } from '@/stores/useAchievementStore'
  import { useCookingStore } from '@/stores/useCookingStore'
  import { useGameStore } from '@/stores/useGameStore'
  import { useTutorialStore } from '@/stores/useTutorialStore'
  import { getItemById } from '@/data'
  import { getCropUseTagMatches } from '@/data/cropUseProfiles'
  import { getRecipeCategoryLabels, getRecipeStoryTriggerLabels } from '@/data/recipes'
  import { ACTION_TIME_COSTS } from '@/data/timeConstants'
  import { sfxClick } from '@/composables/useAudio'
  import { addLog } from '@/composables/useGameLog'
  import { handleEndDay } from '@/composables/useEndDay'
  import { QUALITY_NAMES } from '@/composables/useFarmActions'
  import type { Quality } from '@/types'
  import Button from '@/components/game/Button.vue'
  import ItemIcon from '@/components/game/ItemIcon.vue'

  const cookingStore = useCookingStore()
  const gameStore = useGameStore()
  const achievementStore = useAchievementStore()
  const tutorialStore = useTutorialStore()

  const showOnlyMakeable = ref(false)
  const modalRecipeId = ref<string | null>(null)
  const modalQty = ref(1)

  const uniqueStrings = (values: string[]): string[] => Array.from(new Set(values.filter(Boolean)))
  const getItemName = (itemId: string) => getItemById(itemId)?.name ?? itemId

  const formatIngredientSubstitutionText = (
    entries: ReturnType<typeof cookingStore.getCookingUsePlan>['entries'],
    requirementItemId: string
  ): string => {
    const substitutions = entries.filter(entry => entry.requirementItemId === requirementItemId && entry.substitute)
    if (substitutions.length === 0) return ''
    const summary = new Map<string, number>()
    for (const entry of substitutions) {
      summary.set(entry.itemId, (summary.get(entry.itemId) ?? 0) + entry.quantity)
    }
    return `用途替代：${Array.from(summary.entries()).map(([itemId, quantity]) => `${getItemName(itemId)}×${quantity}`).join('、')}`
  }

  const getCookingCropUseText = (itemId: string): string => {
    const labels = uniqueStrings(getCropUseTagMatches(itemId, ['food']).map(match => match.label))
    return labels.length > 0 ? `用途：${labels.join('、')}` : ''
  }

  const buildCookingRecommendationText = (
    canCook: boolean,
    categoryText: string,
    storyTriggerText: string,
    cropUseText: string
  ): string => {
    if (!canCook) return ''
    const source = `${categoryText} ${storyTriggerText} ${cropUseText}`
    if (/节会|供品/.test(source)) return '推荐：节会前备菜，可转成节会剧情线索。'
    if (/宠物/.test(source)) return '推荐：宠物反馈料理，可用于牧场特别喂食。'
    if (/家宴|团圆/.test(source)) return '推荐：家宴团圆话题，可用于村民闲谈。'
    if (/送礼|好感|伴手礼/.test(source)) return '推荐：送礼话题料理，可辅助 NPC 关系推进。'
    if (/旅途|补给/.test(source)) return '推荐：旅途补给，可用于行旅路线反馈。'
    if (/订单|委托/.test(source)) return '推荐：订单委托备餐，可服务任务交付。'
    return cropUseText ? '推荐：料理用途标签匹配，可作为作物消耗路径。' : ''
  }

  /** 预计算食谱信息（不含数量，避免改数量触发全量重算） */
  const recipeInfos = computed(() => {
    return cookingStore.recipes.map(recipe => {
      const canCook = cookingStore.canCook(recipe.id)
      const maxQty = cookingStore.maxCookable(recipe.id)
      const quality = cookingStore.previewCookQuality(recipe.id)
      const outputItem = getItemById(`food_${recipe.id}`) ?? null
      const cookingPlan = cookingStore.getCookingUsePlan(recipe.id)
      const substitutionText = cookingStore.getCookingSubstitutionText(recipe.id)
      const ingredients = recipe.ingredients.map(ing => {
        const item = getItemById(ing.itemId)
        const available = cookingStore.getCookingIngredientAvailableCount(ing.itemId)
        const cropUseText = getCookingCropUseText(ing.itemId)
        const substitutionText = formatIngredientSubstitutionText(cookingPlan.entries, ing.itemId)
        return {
          itemId: ing.itemId,
          item,
          name: item?.name ?? ing.itemId,
          quantity: ing.quantity,
          available,
          enough: !cookingPlan.missing.some(missing => missing.requirementItemId === ing.itemId),
          cropUseText,
          substitutionText
        }
      })
      const categoryText = getRecipeCategoryLabels(recipe).join('、')
      const storyTriggerText = getRecipeStoryTriggerLabels(recipe).join('、')
      const cropUseLabels = uniqueStrings(ingredients.map(ing => ing.cropUseText.replace(/^用途：/, '')))
      const cropUseText = cropUseLabels.length > 0 ? `用途标签：${cropUseLabels.join('、')}` : ''
      const recommendationText = buildCookingRecommendationText(canCook, categoryText, storyTriggerText, cropUseText)
      return { recipe, outputItem, canCook, maxQty, quality, ingredients, categoryText, storyTriggerText, cropUseText, substitutionText, recommendationText }
    })
  })

  const cookingRecommendations = computed(() => recipeInfos.value.filter(info => info.recommendationText).slice(0, 3))

  const displayedRecipeInfos = computed(() => {
    if (!showOnlyMakeable.value) return recipeInfos.value
    return recipeInfos.value.filter(info => info.canCook)
  })

  /** 当前弹窗对应的食谱信息（响应式，材料变化时自动更新） */
  const modalInfo = computed(() => {
    if (!modalRecipeId.value) return null
    return recipeInfos.value.find(i => i.recipe.id === modalRecipeId.value) ?? null
  })

  const openModal = (recipeId: string) => {
    modalRecipeId.value = recipeId
    modalQty.value = 1
  }

  const closeModal = () => {
    modalRecipeId.value = null
  }

  const onModalQtyInput = (event: Event) => {
    const val = parseInt((event.target as HTMLInputElement).value) || 1
    const max = modalInfo.value?.maxQty ?? 1
    modalQty.value = Math.max(1, Math.min(val, max))
  }

  const qualityTextClass = (quality: Quality): string => {
    const map: Record<Quality, string> = {
      normal: '',
      fine: 'text-water',
      excellent: 'text-purple-400',
      supreme: 'text-accent'
    }
    return map[quality]
  }

  const tutorialHint = computed(() => {
    if (!tutorialStore.enabled || gameStore.year > 1) return null
    if (achievementStore.stats.totalRecipesCooked === 0)
      return '点击食谱查看详情和烹饪。料理可以恢复体力和生命值，高品质材料可做出更好的食物。'
    return null
  })

  const handleCookFromModal = () => {
    if (!modalInfo.value || !modalInfo.value.canCook) return
    if (gameStore.isPastBedtime) {
      addLog('太晚了，没力气做饭了。')
      handleEndDay()
      closeModal()
      return
    }
    const qty = Math.min(modalQty.value, modalInfo.value.maxQty)
    const result = cookingStore.cook(modalInfo.value.recipe.id, qty)
    sfxClick()
    addLog(result.message)
    const tr = gameStore.advanceTime(ACTION_TIME_COSTS.cook * qty)
    if (tr.message) addLog(tr.message)
    closeModal()
    if (tr.passedOut) handleEndDay()
  }
</script>
