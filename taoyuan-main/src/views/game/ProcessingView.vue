<template>
  <div data-testid="processing-view">
    <!-- 标签切换 -->
    <div class="flex space-x-1.5 mb-3">
      <Button
        class="flex-1 justify-center"
        :class="{ '!bg-accent !text-bg': activeTab === 'process' }"
        :icon="Boxes"
        data-testid="processing-tab-process"
        @click="activeTab = 'process'"
      >
        加工区
        <span class="text-[0.625rem] ml-0.5 opacity-70">{{ processingStore.machineCount }}/{{ processingStore.maxMachines }}</span>
      </Button>
      <Button
        class="flex-1 justify-center"
        :class="{ '!bg-accent !text-bg': activeTab === 'craft' }"
        :icon="Hammer"
        data-testid="processing-tab-craft"
        @click="activeTab = 'craft'"
      >
        制造
      </Button>
    </div>

    <!-- 加工区 -->
    <Transition name="tab-panel-switch" mode="out-in">
      <div :key="activeTab">
    <div v-if="activeTab === 'process'" class="border border-accent/20 rounded-xs p-3">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center space-x-1.5 text-sm text-accent">
          <Boxes :size="14" />
          <span>加工区</span>
          <span class="text-[0.625rem] text-muted font-normal">{{ processingStore.machineCount }}/{{ processingStore.maxMachines }}</span>
        </div>
        <button
          v-if="nextUpgrade || processingStore.workshopLevel > 0"
          class="text-[0.625rem] px-2 py-0.5 border rounded-xs"
          :class="nextUpgrade ? 'border-accent/30 text-accent hover:bg-accent/5 cursor-pointer' : 'border-accent/10 text-muted'"
          @click="showUpgradeModal = true"
        >
          <ArrowUpCircle :size="10" class="inline mr-0.5" />
          工坊 Lv.{{ processingStore.workshopLevel }}
          <span v-if="isWorkshopMaxLevel" class="ml-0.5 text-success">满</span>
        </button>
      </div>

      <!-- 只显示可加工 -->
      <label class="flex items-center space-x-1 mb-2 cursor-pointer select-none">
        <input type="checkbox" v-model="onlyAvailable" class="accent-accent" />
        <span class="text-[0.625rem] text-muted">只显示有材料的配方</span>
      </label>

      <div v-if="cookingStore.activeElixir" class="border border-water/20 rounded-xs px-2 py-1.5 mb-2">
        <p class="text-[0.625rem] text-water">
          <FlaskConical :size="12" class="inline mr-0.5" />
          今日丹药：{{ cookingStore.activeElixir.name }}
        </p>
        <p class="text-[0.625rem] text-muted leading-snug mt-0.5">{{ cookingStore.activeElixir.description }}</p>
      </div>

      <!-- 空状态 -->
      <div v-if="processingStore.machines.length === 0" class="flex flex-col items-center justify-center py-8">
        <Boxes :size="36" class="text-accent/20 mb-2" />
        <p class="text-xs text-muted">还没有机器</p>
        <p class="text-[0.625rem] text-muted/50 mt-0.5">切换到「制造」标签制造一台加工机器吧</p>
      </div>

      <!-- 机器列表（按类型分组） -->
      <div
        v-else
        class="processing-machine-group-layout desktop-adaptive-grid--cards"
        data-testid="processing-machine-group-layout"
      >
        <div
          v-for="group in machineGroupsView"
          :key="group.machineType"
          class="processing-machine-group-card border border-accent/10 rounded-xs"
          :data-testid="`processing-machine-group-${group.machineType}`"
        >
          <!-- 分组标题（可折叠） -->
          <div
            class="flex items-center justify-between px-2 py-1.5 cursor-pointer hover:bg-accent/5 select-none"
            @click="toggleGroup(group.machineType)"
          >
            <div class="flex items-center space-x-1">
              <span class="text-xs text-accent">{{ group.name }}</span>
              <span class="text-[0.625rem] text-muted">×{{ group.slots.length }}</span>
              <span v-if="group.hasReady" class="text-[0.625rem] text-success">
                ({{ group.readyCount }}可收取)
              </span>
            </div>
            <span class="text-[0.625rem] text-muted">{{ collapsedGroups.has(group.machineType) ? '▸' : '▾' }}</span>
          </div>

          <div v-if="!collapsedGroups.has(group.machineType)" class="flex flex-wrap gap-1 px-2 pb-2">
            <Button
              v-if="group.idleCount > 0 && !group.isEnchantingForge"
              class="text-[0.625rem]"
              :icon="Boxes"
              :icon-size="10"
              @click.stop="openBatchProcessModal(group.machineType)"
            >
              批量加工
            </Button>
            <Button
              v-if="group.readyCount > 0"
              class="text-[0.625rem] !bg-accent !text-bg"
              :icon="Package"
              :icon-size="10"
              @click.stop="handleCollectGroup(group.machineType)"
            >
              一键收取 {{ group.readyCount }}
            </Button>
            <Button
              v-if="group.processingCount > 0"
              class="text-[0.625rem]"
              :icon="X"
              :icon-size="10"
              @click.stop="handleCancelGroup(group.machineType)"
            >
              全部取消 {{ group.processingCount }}
            </Button>
            <Button
              v-if="group.slots.length > 1"
              class="text-[0.625rem]"
              :icon="Trash2"
              :icon-size="10"
              :data-testid="`processing-batch-remove-${group.machineType}`"
              @click.stop="openBatchRemoveModal(group.machineType)"
            >
              批量拆除 {{ group.slots.length }}
            </Button>
          </div>

          <!-- 展开的机器明细 -->
          <div v-if="!collapsedGroups.has(group.machineType)" class="processing-machine-slot-list px-2 pb-2">
            <div
              v-if="!group.isEnchantingForge && group.recommendationOptions.length > 0"
              class="processing-machine-recommendations rounded-xs border border-accent/15 bg-accent/5 px-2 py-1.5"
            >
              <p class="text-[0.625rem] text-accent mb-1">用途推荐</p>
              <div
                v-for="option in group.recommendationOptions"
                :key="`recommend-${option.key}`"
                class="flex items-start justify-between gap-2 py-0.5"
              >
                <div class="flex min-w-0 items-center gap-2">
                  <ItemIcon :item="option.outputItem" size="xs" :quality="option.quality ?? 'normal'" :silhouette="option.disabled || option.hiddenUndiscovered" />
                  <div class="min-w-0">
                    <p class="text-xs text-text truncate">{{ option.displayName }}</p>
                    <p class="text-[0.625rem] text-muted leading-snug">{{ option.recommendationText }}</p>
                  </div>
                </div>
                <span class="text-[0.625rem] text-accent/80 shrink-0">{{ !option.disabled ? '可开工' : option.alchemyBlocked ? '今日已满' : '缺材料' }}</span>
              </div>
            </div>
            <div
              v-if="!group.isEnchantingForge && group.idleCount > 0 && group.firstIdleSlotIndex !== null"
              class="processing-machine-recipes rounded-xs border border-accent/15 bg-bg/60 p-2"
            >
              <p v-if="group.recipesLoading" class="text-[0.625rem] text-muted mb-1">正在整理配方...</p>
              <template v-if="group.isSeedMaker">
                <div v-if="group.seedRecipeOptions.length > 0" class="processing-option-grid grid gap-1.5">
                  <Button
                    v-for="option in group.seedRecipeOptions"
                    :key="option.key"
                    class="processing-option-card"
                    :class="{ 'processing-option-card--unavailable': option.disabled }"
                    :aria-disabled="option.disabled ? 'true' : 'false'"
                    :data-testid="`processing-recipe-${option.recipeId}`"
                    @click="openGroupProcessingRecipeDetail(group, option)"
                  >
                    <span class="processing-option-card__body">
                      <ItemIcon :item="option.outputItem" size="xs" :quality="option.quality ?? 'normal'" :silhouette="option.disabled || option.hiddenUndiscovered" />
                      <span class="processing-option-card__copy">
                        <span class="processing-option-card__name">
                          {{ option.displayName }}
                          <span
                            v-if="option.qualityLabel"
                            :class="{
                              'text-quality-fine': option.quality === 'fine',
                              'text-quality-excellent': option.quality === 'excellent',
                              'text-quality-supreme': option.quality === 'supreme'
                            }"
                          >
                            {{ option.qualityLabel }}
                          </span>
                        </span>
                        <span class="processing-option-card__meta">{{ option.count }}/{{ option.recipe.inputQuantity }}</span>
                      </span>
                    </span>
                  </Button>
                </div>
                <p v-else-if="!group.recipesLoading" class="text-xs text-muted">{{ group.emptyMessage }}</p>
              </template>
              <template v-else>
                <div v-if="group.recipeOptions.length > 0" class="processing-option-grid grid gap-1.5">
                  <Button
                    v-for="option in group.recipeOptions"
                    :key="option.key"
                    class="processing-option-card"
                    :class="{ 'processing-option-card--unavailable': option.disabled }"
                    :aria-disabled="option.disabled ? 'true' : 'false'"
                    :data-testid="`processing-recipe-${option.recipeId}`"
                    @click="openGroupProcessingRecipeDetail(group, option)"
                  >
                    <span class="processing-option-card__body">
                      <ItemIcon :item="option.outputItem" size="xs" :quality="option.quality ?? 'normal'" :silhouette="option.disabled || option.hiddenUndiscovered" />
                      <span class="processing-option-card__copy">
                        <span class="processing-option-card__name">
                          {{ option.displayName }}
                          <span v-if="option.qualityLabel" class="text-muted">{{ option.qualityLabel }}</span>
                        </span>
                        <span class="processing-option-card__meta">
                          <span v-if="option.inputItemName">
                            {{ option.inputItemName }} {{ option.count }}/{{ option.recipe.inputQuantity }}
                          </span>
                          <span v-else>{{ option.effectiveDays }}天</span>
                          <span v-for="extra in option.extraInputs" :key="extra.key">
                            · {{ extra.itemName }} {{ extra.count }}/{{ extra.quantity }}
                          </span>
                          <span v-if="option.alchemyLimitText"> · {{ option.alchemyLimitText }}</span>
                          <span v-if="option.alchemyMetaText"> · {{ option.alchemyMetaText }}</span>
                          <span v-if="option.cropUseText"> · {{ option.cropUseText }}</span>
                          <span v-if="option.substitutionText" class="text-accent/80"> · {{ option.substitutionText }}</span>
                        </span>
                      </span>
                    </span>
                  </Button>
                </div>
                <p v-else-if="!group.recipesLoading" class="text-xs text-muted">{{ group.emptyMessage }}</p>
              </template>
            </div>
            <div
              v-for="{ slot, originalIndex } in group.slots"
              :key="originalIndex"
              class="processing-machine-slot-card border rounded-xs p-2"
              :class="slot.ready ? 'border-success/30' : 'border-accent/20'"
            >
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-xs" :class="slot.ready ? 'text-success' : 'text-accent'">{{ group.name }}</span>
                <button class="text-muted hover:text-danger" @click="handleRemoveMachine(originalIndex)">
                  <Trash2 :size="12" />
                </button>
              </div>

              <!-- 空闲：选择配方 -->
              <div v-if="!slot.recipeId">
                <Button
                  v-if="group.isEnchantingForge"
                  class="w-full justify-center"
                  :icon="Sparkles"
                  :icon-size="12"
                  data-testid="processing-enchanting-forge-open"
                  @click="openEnchantingForgeModal"
                >
                  打开铸魔炉
                </Button>
                <p v-else class="text-xs text-muted">空闲，使用上方配方列表开工。</p>
              </div>

              <!-- 加工中 -->
              <div v-else-if="!slot.ready" :data-testid="`processing-slot-running-${slot.recipeId}`">
                <div class="flex items-center justify-between text-xs mb-1">
                  <span class="inline-flex min-w-0 items-center gap-1.5 text-muted">
                    <ItemIcon :item="getRecipeOutputItem(slot.recipeId)" size="xs" :show-badge="false" :silhouette="isRecipeHiddenUndiscovered(slot.recipeId)" />
                    <span class="truncate">{{ getRecipeName(slot.recipeId) }}</span>
                  </span>
                  <span class="text-muted">{{ slot.daysProcessed }}/{{ slot.totalDays }}天</span>
                </div>
                <div class="h-1 bg-bg rounded-xs border border-accent/10 mb-1.5">
                  <div
                    class="h-full bg-accent rounded-xs transition-all"
                    :style="{ width: Math.floor((slot.daysProcessed / slot.totalDays) * 100) + '%' }"
                  />
                </div>
                <Button class="w-full justify-center" :icon="X" :icon-size="10" @click="handleCancelProcessing(originalIndex)">
                  取消加工
                </Button>
              </div>

              <!-- 完成 -->
              <div v-else>
                <div
                  v-if="slot.alchemyResult"
                  class="mb-1.5 rounded-xs border border-accent/20 bg-accent/5 px-2 py-1 text-[0.625rem] text-muted"
                >
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-accent">{{ slot.alchemyResult.label }}</span>
                    <span class="inline-flex min-w-0 items-center gap-1">
                      <ItemIcon :item="getItemById(slot.alchemyResult.outputItemId)" size="xs" :show-badge="false" />
                      <span class="truncate">{{ getItemName(slot.alchemyResult.outputItemId) }}×{{ slot.alchemyResult.outputQuantity }}</span>
                    </span>
                  </div>
                  <p class="mt-0.5 leading-snug">{{ slot.alchemyResult.description }}</p>
                </div>
                <Button
                  class="w-full justify-center !bg-accent !text-bg"
                  :icon="Package"
                  :icon-size="12"
                  :data-testid="`processing-collect-${slot.recipeId}`"
                  @click="handleCollect(originalIndex)"
                >
                  <ItemIcon :item="slot.alchemyResult ? getItemById(slot.alchemyResult.outputItemId) : getRecipeOutputItem(slot.recipeId)" size="xs" :show-badge="false" :silhouette="!!slot.recipeId && isRecipeHiddenUndiscovered(slot.recipeId)" />
                  收取 {{ getSlotOutputName(slot) }}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 制造区 -->
    <div v-else-if="activeTab === 'craft'" class="border border-accent/20 rounded-xs p-3">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center space-x-1.5 text-sm text-accent">
          <Hammer :size="14" />
          <span>制造</span>
        </div>
        <span class="text-xs text-muted">机器 {{ processingStore.machineCount }}/{{ processingStore.maxMachines }}</span>
      </div>

      <div>
        <div v-for="cat in craftCategories" :key="cat.id" class="mb-3 last:mb-0">
          <p class="text-xs text-muted mb-1">{{ cat.label }}</p>
          <div class="processing-craft-grid grid grid-cols-3 gap-1.5 md:grid-cols-5">
            <div
              v-for="item in cat.items"
              :key="item.id"
              class="processing-craft-card border border-accent/20 rounded-xs px-2 py-1.5 cursor-pointer hover:bg-accent/5"
              :data-testid="`processing-craft-${item.id}`"
              @click="openCraftModal(item)"
            >
              <div class="processing-craft-card__body">
                <ItemIcon :item="getCraftIconItem(item)" size="xs" :show-badge="false" />
                <span class="processing-craft-card__copy">
                  <span class="processing-craft-card__name">
                    {{ item.name }}
                    <span v-if="item.badge" class="text-muted ml-1">[{{ item.badge }}]</span>
                  </span>
                  <span v-if="item.cost > 0" class="processing-craft-card__meta">{{ item.cost }}文</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 工坊扩建弹窗 -->
      </div>
    </Transition>

    <Transition name="panel-fade">
      <div
        v-if="showUpgradeModal"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="showUpgradeModal = false"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="showUpgradeModal = false">
            <X :size="14" />
          </button>

          <p class="text-sm text-accent mb-2">
            <ArrowUpCircle :size="14" class="inline mr-0.5" />
            工坊信息
          </p>

          <!-- 当前状态 -->
          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">当前等级</span>
              <span class="text-xs text-accent">
                Lv.{{ processingStore.workshopLevel }} / {{ WORKSHOP_MAX_LEVEL }}
                <span v-if="isWorkshopMaxLevel" class="text-[0.625rem] text-success ml-1">满级</span>
              </span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">机器上限</span>
              <span class="text-xs text-text">{{ processingStore.maxMachines }} 台</span>
            </div>
            <div v-if="processingStore.workshopSpeedBonus > 0" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">加工速度</span>
              <span class="text-xs text-success">+{{ Math.round(processingStore.workshopSpeedBonus * 100) }}%</span>
            </div>
            <div v-if="processingStore.workshopDoubleOutputChance > 0" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">双倍产出</span>
              <span class="text-xs text-success">{{ Math.round(processingStore.workshopDoubleOutputChance * 100) }}%</span>
            </div>
          </div>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted mb-1">里程碑奖励</p>
            <div v-for="milestone in workshopMilestones" :key="milestone.id" class="flex items-start justify-between gap-2 py-0.5">
              <span class="text-xs" :class="processingStore.workshopLevel >= milestone.level ? 'text-success' : 'text-muted'">
                Lv.{{ milestone.level }} · {{ milestone.name }}
              </span>
              <span class="text-[0.625rem] text-right" :class="processingStore.workshopLevel >= milestone.level ? 'text-success' : 'text-muted'">
                {{ milestone.description }}
              </span>
            </div>
          </div>

          <!-- 下一级升级 -->
          <template v-if="nextUpgrade">
            <div class="border border-accent/10 rounded-xs p-2 mb-2">
              <p class="text-xs text-muted mb-1">升级至 Lv.{{ processingStore.workshopLevel + 1 }}</p>
              <div class="flex items-center justify-between">
                <span class="text-xs text-muted">机器上限</span>
                <span class="text-xs text-text">{{ processingStore.maxMachines }} → {{ processingStore.maxMachines + 5 }}</span>
              </div>
            </div>

            <!-- 所需材料 -->
            <div class="border border-accent/10 rounded-xs p-2 mb-2">
              <p class="text-xs text-muted mb-1">所需材料</p>
              <div v-for="mat in nextUpgrade.materials" :key="mat.itemId" class="flex items-center justify-between gap-2">
                <span class="flex min-w-0 items-center gap-1.5 text-xs text-muted">
                  <ItemIcon :item="getItemById(mat.itemId)" size="xs" :show-badge="false" />
                  <span class="truncate">{{ getItemById(mat.itemId)?.name }}</span>
                </span>
                <span class="text-xs" :class="getIndexedItemCount(mat.itemId) >= mat.quantity ? '' : 'text-danger'">
                  {{ getIndexedItemCount(mat.itemId) }}/{{ mat.quantity }}
                </span>
              </div>
              <div class="flex items-center justify-between mt-0.5">
                <span class="text-xs text-muted">铜钱</span>
                <span class="text-xs" :class="playerStore.money >= nextUpgrade.cost ? '' : 'text-danger'">{{ nextUpgrade.cost }}文</span>
              </div>
            </div>

            <!-- 扩建按钮 -->
            <Button
              v-if="!showUpgradeConfirm"
              class="w-full justify-center"
              :class="{ '!bg-accent !text-bg': canUpgrade }"
              :icon="ArrowUpCircle"
              :icon-size="12"
              :disabled="!canUpgrade"
              @click="showUpgradeConfirm = true"
            >
              扩建工坊
            </Button>

            <!-- 确认 -->
            <div v-else class="flex space-x-1">
              <Button class="flex-1 justify-center" @click="showUpgradeConfirm = false">取消</Button>
              <Button
                class="flex-1 justify-center !bg-accent !text-bg"
                :icon="ArrowUpCircle"
                :icon-size="12"
                @click="handleUpgradeFromModal"
              >
                确认扩建
              </Button>
            </div>
          </template>

          <div v-else class="border border-success/20 rounded-xs p-2 text-center">
            <p class="text-xs text-success">工坊已达到最高等级 Lv.{{ WORKSHOP_MAX_LEVEL }}</p>
            <p class="text-[0.625rem] text-muted mt-0.5">机器上限 {{ processingStore.maxMachines }} 台，里程碑奖励已全部生效。</p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 铸魔炉弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showEnchantingForgeModal"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        data-testid="processing-enchanting-forge-modal"
        @click.self="closeEnchantingForgeModal"
      >
        <div class="game-panel max-w-lg w-full max-h-[88dvh] overflow-y-auto relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="closeEnchantingForgeModal">
            <X :size="14" />
          </button>

          <p class="text-sm text-accent mb-2">
            <Sparkles :size="14" class="inline mr-0.5" />
            铸魔炉
          </p>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted mb-1">选择类型</p>
            <div class="grid grid-cols-2 md:grid-cols-5 gap-1">
              <button
                v-for="option in enchantingForgeTargetTypeOptions"
                :key="option.id"
                class="btn text-xs justify-between"
                :class="{ '!bg-accent !text-bg': selectedEnchantingForgeTarget === option.id }"
                :data-testid="`processing-enchanting-forge-target-${option.id}`"
                @click="selectedEnchantingForgeTarget = option.id"
              >
                <span>{{ option.label }}</span>
                <span class="text-[0.625rem] opacity-70">{{ option.count }}</span>
              </button>
            </div>
          </div>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted mb-1">选择装备</p>
            <div v-if="enchantingForgeItemOptions.length > 0" class="flex flex-col space-y-1 max-h-36 overflow-y-auto">
              <div
                v-for="option in enchantingForgeItemOptions"
                :key="option.key"
                class="flex items-stretch gap-1 mr-1"
              >
                <button
                  class="btn min-w-0 flex-1 text-xs items-start justify-between gap-2"
                  :class="{ '!bg-accent !text-bg': selectedEnchantingForgeItemIndex === option.index }"
                  :data-testid="`processing-enchanting-forge-item-${option.key}`"
                  @click="selectedEnchantingForgeItemIndex = option.index"
                >
                  <span class="min-w-0 text-left">
                    <span class="block truncate">
                      {{ option.name }}
                      <span v-if="option.equipped" class="text-[0.625rem] opacity-70 ml-1">已装备</span>
                      <span v-if="option.locked" class="text-[0.625rem] opacity-70 ml-1">已锁定</span>
                    </span>
                    <span class="block text-[0.625rem] opacity-70 truncate">{{ option.affixSummary || '无词条' }}</span>
                  </span>
                  <span v-if="option.disabledReason" class="text-[0.625rem] text-danger shrink-0">{{ option.disabledReason }}</span>
                </button>
                <Button
                  v-if="option.locked && option.lockTarget"
                  class="shrink-0 px-2 py-1 text-[0.625rem]"
                  :data-testid="`processing-enchanting-forge-unlock-${option.key}`"
                  @click.stop="handleUnlockEnchantingForgeTarget(option)"
                >
                  解锁
                </Button>
              </div>
            </div>
            <p v-else class="text-xs text-muted">暂无可选目标。</p>
          </div>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted mb-1">选择模式</p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-1">
              <button
                v-for="mode in enchantingForgeModeOptions"
                :key="mode.id"
                class="btn text-xs flex-col items-start"
                :class="{ '!bg-accent !text-bg': selectedEnchantingForgeMode === mode.id }"
                :data-testid="`processing-enchanting-forge-mode-${mode.id}`"
                @click="selectedEnchantingForgeMode = mode.id"
              >
                <span>{{ mode.label }}</span>
                <span class="text-[0.625rem] opacity-70">Lv.{{ mode.minLevel }} · {{ mode.cost }}文</span>
              </button>
            </div>
          </div>

          <div v-if="selectedEnchantingForgeMode === 'directed'" class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted mb-1">选择方向</p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-1">
              <button
                v-for="direction in enchantingForgeDirectionOptions"
                :key="direction.id"
                class="btn text-xs flex-col items-start"
                :class="{ '!bg-accent !text-bg': selectedEnchantingForgeDirectionId === direction.id }"
                :data-testid="`processing-enchanting-forge-direction-${direction.id}`"
                @click="selectedEnchantingForgeDirectionId = direction.id"
              >
                <span>{{ direction.label }}</span>
                <span class="text-[0.625rem] opacity-70">{{ direction.description }}</span>
              </button>
            </div>
            <p v-if="enchantingForgeDirectedTopUpHint" class="text-[0.625rem] text-muted mt-1">
              {{ enchantingForgeDirectedTopUpHint }}
            </p>
          </div>

          <div v-if="selectedEnchantingForgeMode === 'protected'" class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted mb-1">保留词条</p>
            <div v-if="enchantingForgePreserveOptions.length > 0" class="flex flex-col space-y-1">
              <button
                v-for="option in enchantingForgePreserveOptions"
                :key="option.id"
                class="btn text-xs justify-start"
                :class="{ '!bg-accent !text-bg': selectedEnchantingForgePreserveId === option.id }"
                :data-testid="`processing-enchanting-forge-preserve-${option.id}`"
                @click="selectedEnchantingForgePreserveId = option.id"
              >
                {{ option.label }}
              </button>
            </div>
            <p v-else class="text-xs text-muted">目标暂无可保留词条。</p>
          </div>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <div class="flex items-center justify-between gap-2 mb-1">
              <p class="text-xs text-muted">范围与消耗</p>
              <span class="text-[0.625rem] text-accent">{{ enchantingForgeCountHint }}</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-1 max-h-28 overflow-y-auto mb-2">
              <div
                v-for="line in enchantingForgeRangeLines"
                :key="line.id"
                class="rounded-xs border border-accent/10 px-2 py-1"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs text-text">{{ line.name }}</span>
                  <span class="text-xs text-accent">{{ line.range }}</span>
                </div>
                <p class="text-[0.625rem] text-muted truncate">{{ line.description }}</p>
              </div>
            </div>
            <div class="space-y-0.5">
              <div
                v-for="mat in enchantingForgeMaterialLines"
                :key="mat.itemId"
                class="flex items-center justify-between gap-2"
              >
                <span class="flex min-w-0 items-center gap-1.5 text-xs text-muted">
                  <ItemIcon :item="mat.item" size="xs" :show-badge="false" />
                  <span class="truncate">{{ mat.itemName }}</span>
                </span>
                <span class="text-xs" :class="mat.count >= mat.quantity ? '' : 'text-danger'">
                  {{ mat.count }}/{{ mat.quantity }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-muted">铜钱</span>
                <span class="text-xs" :class="playerStore.money >= selectedEnchantingForgeModeDef.cost ? '' : 'text-danger'">
                  {{ selectedEnchantingForgeModeDef.cost }}文
                </span>
              </div>
            </div>
          </div>

          <div v-if="enchantingForgeResultLines.length > 0" class="border border-success/20 rounded-xs p-2 mb-2">
            <p class="text-xs text-success mb-1">本次结果 · {{ enchantingForgeResultLines.length }} 条</p>
            <p
              v-for="line in enchantingForgeResultLines"
              :key="line"
              class="text-xs text-text leading-5"
            >
              {{ line }}
            </p>
          </div>

          <p
            v-if="enchantingForgeBlockReason"
            class="text-[0.625rem] text-danger mb-2"
            data-testid="processing-enchanting-forge-block-reason"
          >
            {{ enchantingForgeBlockReason }}
          </p>

          <Button
            class="w-full justify-center"
            :class="{ '!bg-accent !text-bg': canConfirmEnchantingForge }"
            :icon="Sparkles"
            :icon-size="12"
            :disabled="!canConfirmEnchantingForge"
            data-testid="processing-enchanting-forge-confirm"
            @click="handleConfirmEnchantingForge"
          >
            确认铸魔
          </Button>
        </div>
      </div>
    </Transition>

    <!-- 制造弹窗 -->
    <Transition name="panel-fade">
      <div v-if="craftModal" class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="closeCraftModal">
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="closeCraftModal">
            <X :size="14" />
          </button>

          <p class="text-sm text-accent mb-2">{{ craftModal.name }}</p>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted">{{ craftModal.description }}</p>
            <p v-if="craftModal.badge" class="text-xs text-muted mt-0.5">当前：{{ craftModal.badge }}</p>
          </div>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted mb-1">所需材料</p>
            <div v-for="mat in craftModal.materialLines" :key="mat.itemId" class="flex items-center justify-between gap-2">
              <span class="flex min-w-0 items-center gap-1.5 text-xs text-muted">
                <ItemIcon :item="mat.item" size="xs" :show-badge="false" />
                <span class="truncate">{{ mat.itemName }}</span>
              </span>
              <span class="text-xs" :class="mat.count >= mat.quantity * displayQty ? '' : 'text-danger'">
                {{ mat.count }}/{{ mat.quantity * displayQty }}
              </span>
            </div>
            <div v-if="craftModal.cost > 0" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">铜钱</span>
              <span class="text-xs" :class="playerStore.money >= craftModal.cost * displayQty ? '' : 'text-danger'">
                {{ craftModal.cost * displayQty }}文
              </span>
            </div>
          </div>

          <!-- 批量数量控制 -->
          <div v-if="craftModal.batchable && maxCraftable > 1" class="border border-accent/10 rounded-xs p-2 mb-2">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs text-muted">数量</span>
              <div class="flex items-center space-x-1">
                <Button class="h-6 px-1.5 py-0.5 text-xs justify-center" :disabled="craftQuantity <= 1" @click="addCraftQuantity(-1)">
                  -
                </Button>
                <input
                  type="number"
                  :value="craftQuantity"
                  min="1"
                  :max="maxCraftable"
                  class="w-16 h-6 px-2 py-0.5 bg-bg border border-accent/30 rounded-xs text-xs text-center text-accent outline-none focus:border-accent transition-colors"
                  @input="onCraftQuantityInput"
                />
                <Button
                  class="h-6 px-1.5 py-0.5 text-xs justify-center"
                  :disabled="craftQuantity >= maxCraftable"
                  @click="addCraftQuantity(1)"
                >
                  +
                </Button>
              </div>
            </div>
            <div class="flex space-x-1">
              <Button class="flex-1 justify-center" :disabled="craftQuantity <= 1" @click="setCraftQuantity(1)">最少</Button>
              <Button class="flex-1 justify-center" :disabled="craftQuantity >= maxCraftable" @click="setCraftQuantity(maxCraftable)">
                最多
              </Button>
            </div>
            <div v-if="craftModal.cost > 0" class="flex items-center justify-between mt-1.5">
              <span class="text-xs text-muted">合计</span>
              <span class="text-xs text-accent">{{ craftModal.cost * craftQuantity }}文</span>
            </div>
          </div>

          <Button
            class="w-full justify-center"
            :class="{ '!bg-accent !text-bg': canConfirmCraft }"
            :icon="Hammer"
            :icon-size="12"
            :disabled="!canConfirmCraft"
            @click="handleCraftFromModal"
          >
            {{ craftModal.batchable && craftQuantity > 1 ? `制造 ×${craftQuantity}` : '制造' }}
          </Button>
        </div>
      </div>
    </Transition>

    <!-- 批量加工弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="batchProcessModal"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="batchProcessModal = null"
      >
        <div class="game-panel max-w-sm w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="batchProcessModal = null">
            <X :size="14" />
          </button>

          <p class="text-sm text-accent mb-2">批量加工 · {{ currentBatchMachineName }}</p>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted">空闲机器</span>
              <span>{{ currentBatchGroup?.idleCount ?? 0 }} 台</span>
            </div>
            <div class="flex items-center justify-between text-xs mt-0.5">
              <span class="text-muted">加工中</span>
              <span>{{ currentBatchGroup?.processingCount ?? 0 }} 台</span>
            </div>
            <div class="flex items-center justify-between text-xs mt-0.5">
              <span class="text-muted">已完成</span>
              <span>{{ currentBatchGroup?.readyCount ?? 0 }} 台</span>
            </div>
          </div>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted mb-1">选择配方</p>
            <div v-if="currentBatchGroup?.isSeedMaker" class="flex flex-col space-y-1 max-h-44 overflow-y-auto">
              <button
                v-for="option in currentBatchOptions"
                :key="option.key"
                class="btn text-xs justify-between mr-1"
                :class="{
                  '!bg-accent !text-bg': batchProcessModal.recipeId === option.recipeId && batchProcessModal.quality === option.quality
                }"
                :disabled="option.disabled"
                @click="selectBatchRecipe(option.recipeId, option.quality)"
              >
                <span class="truncate text-left">
                  {{ option.displayName }}
                  <span
                    v-if="option.qualityLabel"
                    :class="{
                      'text-quality-fine': option.quality === 'fine',
                      'text-quality-excellent': option.quality === 'excellent',
                      'text-quality-supreme': option.quality === 'supreme'
                    }"
                  >
                    {{ option.qualityLabel }}
                  </span>
                </span>
                <span class="text-muted ml-2">{{ option.count }}/{{ option.recipe.inputQuantity }}</span>
              </button>
              <p v-if="currentBatchOptions.length === 0" class="text-xs text-muted">
                {{ currentBatchGroup?.emptyMessage }}
              </p>
            </div>
            <div v-else class="flex flex-col space-y-1 max-h-44 overflow-y-auto">
              <button
                v-for="option in currentBatchOptions"
                :key="option.key"
                class="btn text-xs justify-between mr-1"
                :class="{ '!bg-accent !text-bg': batchProcessModal.recipeId === option.recipeId }"
                :disabled="option.disabled"
                @click="selectBatchRecipe(option.recipeId)"
              >
                <span class="truncate text-left">
                  {{ option.displayName }}
                  <span v-if="option.qualityLabel" class="text-muted">{{ option.qualityLabel }}</span>
                  <span v-if="option.alchemyLimitText" class="text-muted">[{{ option.alchemyLimitText }}]</span>
                  <span v-if="option.cropUseText" class="text-muted">{{ option.cropUseText }}</span>
                  <span v-if="option.substitutionText" class="text-accent/80">{{ option.substitutionText }}</span>
                </span>
                <span class="text-muted ml-2 whitespace-nowrap">
                  {{ option.alchemyMetaText || `${option.effectiveDays}天` }}
                </span>
              </button>
              <p v-if="currentBatchOptions.length === 0" class="text-xs text-muted">
                {{ currentBatchGroup?.emptyMessage }}
              </p>
            </div>
          </div>

          <div v-if="currentBatchRecipe" class="border border-accent/10 rounded-xs p-2 mb-2">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs text-muted">批量数量</span>
              <span class="text-xs text-accent">最多 {{ batchMaxCount }} 台</span>
            </div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs">{{ currentBatchOption?.displayName ?? currentBatchRecipe.name }}{{ batchQualityLabel }}</span>
              <span class="text-[0.625rem] text-muted">{{ currentBatchOption?.effectiveDays ?? currentBatchRecipe.processingDays }}天/台</span>
            </div>

            <div class="processing-recipe-material-list mb-1.5" data-testid="processing-batch-recipe-materials">
              <div
                v-for="line in batchRecipeMaterialLines"
                :key="line.key"
                class="processing-recipe-material-row"
              >
                <span class="processing-recipe-material-row__item">
                  <ItemIcon :item="line.item" size="xs" :show-badge="false" />
                  <span class="truncate">{{ line.itemName }}</span>
                </span>
                <span :class="line.fulfilled ? 'text-text' : 'text-danger'">{{ line.count }}/{{ line.quantity }}</span>
              </div>
              <p v-if="batchRecipeMaterialLines.length === 0" class="text-[0.625rem] text-muted">无需投入原料</p>
            </div>

            <div v-if="batchRecipeDetailLines.length > 0" class="text-[0.625rem] text-muted mb-1.5 space-y-0.5">
              <p v-for="line in batchRecipeDetailLines" :key="line">{{ line }}</p>
            </div>
            <div class="flex items-center space-x-1 mb-1.5">
              <Button class="h-6 px-1.5 py-0.5 text-xs justify-center" :disabled="batchQuantity <= 1" @click="addBatchQuantity(-1)">-</Button>
              <input
                type="number"
                :value="batchQuantity"
                min="1"
                :max="batchMaxCount"
                class="w-16 h-6 px-2 py-0.5 bg-bg border border-accent/30 rounded-xs text-xs text-center text-accent outline-none focus:border-accent transition-colors"
                @input="onBatchQuantityInput"
              />
              <Button class="h-6 px-1.5 py-0.5 text-xs justify-center" :disabled="batchQuantity >= batchMaxCount" @click="addBatchQuantity(1)">+
              </Button>
              <Button class="flex-1 justify-center" :disabled="batchQuantity >= batchMaxCount" @click="setBatchQuantity(batchMaxCount)">最多</Button>
            </div>
          </div>

          <Button
            class="w-full justify-center"
            :class="{ '!bg-accent !text-bg': !!currentBatchRecipe && batchMaxCount > 0 }"
            :icon="Boxes"
            :icon-size="12"
            :disabled="!currentBatchRecipe || batchMaxCount <= 0"
            @click="handleStartBatchProcessing"
          >
            开始批量加工{{ currentBatchRecipe ? ` ×${batchQuantity}` : '' }}
          </Button>
        </div>
      </div>
    </Transition>

    <!-- 批量拆除弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="batchRemoveModal"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="closeBatchRemoveModal"
      >
        <div class="game-panel max-w-sm w-full relative" data-testid="processing-batch-remove-modal">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="closeBatchRemoveModal">
            <X :size="14" />
          </button>

          <p class="text-sm text-danger mb-2">批量拆除 · {{ currentBatchRemoveMachineName }}</p>

          <div class="border border-danger/20 rounded-xs p-2 mb-2" data-testid="processing-batch-remove-summary">
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted">将拆除</span>
              <span>{{ batchRemoveModal.preview.total }} 台</span>
            </div>
            <div class="grid grid-cols-3 gap-1 mt-1.5 text-center">
              <div class="rounded-xs border border-accent/10 px-1.5 py-1">
                <p class="text-[0.625rem] text-muted">空闲</p>
                <p class="text-xs text-text">{{ batchRemoveModal.preview.idle }}</p>
              </div>
              <div class="rounded-xs border border-accent/10 px-1.5 py-1">
                <p class="text-[0.625rem] text-muted">加工中</p>
                <p class="text-xs text-text">{{ batchRemoveModal.preview.processing }}</p>
              </div>
              <div class="rounded-xs border border-accent/10 px-1.5 py-1">
                <p class="text-[0.625rem] text-muted">已完成</p>
                <p class="text-xs text-text">{{ batchRemoveModal.preview.ready }}</p>
              </div>
            </div>
          </div>

          <div class="border border-accent/10 rounded-xs p-2 mb-2" data-testid="processing-batch-remove-refunds">
            <div class="flex items-center justify-between gap-2 mb-1">
              <p class="text-xs text-muted">退回背包</p>
              <span v-if="batchRemoveModal.preview.moneyRefund > 0" class="text-[0.625rem] text-accent">
                {{ formatMoney(batchRemoveModal.preview.moneyRefund) }}
              </span>
            </div>
            <div v-if="batchRemoveRefundLines.length > 0" class="processing-recipe-material-list max-h-32 overflow-y-auto">
              <div
                v-for="line in batchRemoveRefundLines"
                :key="line.key"
                class="processing-recipe-material-row"
              >
                <span class="processing-recipe-material-row__item">
                  <ItemIcon :item="line.item" size="xs" :quality="line.quality" :show-badge="false" />
                  <span class="truncate">{{ line.itemName }}{{ formatQualitySuffix(line.quality) }}</span>
                </span>
                <span>×{{ line.quantity }}</span>
              </div>
            </div>
            <p v-else class="text-[0.625rem] text-muted">无需要占用背包的物品。</p>
          </div>

          <div
            v-if="batchRemoveVoidOutputLines.length > 0"
            class="border border-accent/10 rounded-xs p-2 mb-2"
            data-testid="processing-batch-remove-void-outputs"
          >
            <p class="text-xs text-muted mb-1">直接进入虚空成品箱</p>
            <div class="processing-recipe-material-list max-h-24 overflow-y-auto">
              <div
                v-for="line in batchRemoveVoidOutputLines"
                :key="line.key"
                class="processing-recipe-material-row"
              >
                <span class="processing-recipe-material-row__item">
                  <ItemIcon :item="line.item" size="xs" :quality="line.quality" :show-badge="false" />
                  <span class="truncate">{{ line.itemName }}{{ formatQualitySuffix(line.quality) }}</span>
                </span>
                <span>×{{ line.quantity }}</span>
              </div>
            </div>
          </div>

          <p v-if="!batchRemoveModal.preview.canRemove" class="text-[0.625rem] text-danger mb-2">
            背包空间不足，无法完整退回拆除材料与产物。
          </p>

          <Button
            class="w-full justify-center"
            :class="{ '!bg-danger !text-bg': batchRemoveModal.preview.canRemove }"
            :icon="Trash2"
            :icon-size="12"
            :disabled="!batchRemoveModal.preview.canRemove"
            data-testid="processing-batch-remove-confirm"
            @click="handleConfirmBatchRemove"
          >
            确认拆除 {{ batchRemoveModal.preview.total }} 台
          </Button>
        </div>
      </div>
    </Transition>

    <!-- 单机加工配方详情弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="processingRecipeDetail && currentRecipeDetailOption"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="closeProcessingRecipeDetail"
      >
        <div class="game-panel max-w-sm w-full relative" data-testid="processing-recipe-detail-modal">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="closeProcessingRecipeDetail">
            <X :size="14" />
          </button>

          <div class="flex items-start gap-2 pr-6 mb-2">
            <ItemIcon
              :item="currentRecipeDetailOption.outputItem"
              size="sm"
              :quality="currentRecipeDetailOption.quality ?? 'normal'"
              :silhouette="currentRecipeDetailOption.hiddenUndiscovered"
            />
            <div class="min-w-0">
              <p class="text-sm text-accent truncate">
                {{ currentRecipeDetailOption.displayName }}
                <span v-if="currentRecipeDetailOption.qualityLabel" class="text-muted">{{ currentRecipeDetailOption.qualityLabel }}</span>
              </p>
              <p class="text-[0.625rem] text-muted mt-0.5">
                {{ currentRecipeDetailMachineName }} · {{ currentRecipeDetailOption.effectiveDays }}天
              </p>
            </div>
          </div>

          <div class="border border-accent/10 rounded-xs p-2 mb-2" data-testid="processing-recipe-detail-materials">
            <p class="text-xs text-muted mb-1">所需材料</p>
            <div v-if="recipeDetailMaterialLines.length > 0" class="processing-recipe-material-list">
              <div
                v-for="line in recipeDetailMaterialLines"
                :key="line.key"
                class="processing-recipe-material-row"
              >
                <span class="processing-recipe-material-row__item">
                  <ItemIcon :item="line.item" size="xs" :show-badge="false" />
                  <span class="truncate">{{ line.itemName }}</span>
                </span>
                <span :class="line.fulfilled ? 'text-text' : 'text-danger'">{{ line.count }}/{{ line.quantity }}</span>
              </div>
            </div>
            <p v-else class="text-[0.625rem] text-muted">无需投入原料</p>
          </div>

          <div v-if="recipeDetailInfoLines.length > 0" class="border border-accent/10 rounded-xs p-2 mb-2">
            <p
              v-for="line in recipeDetailInfoLines"
              :key="line"
              class="text-[0.625rem] text-muted leading-4"
            >
              {{ line }}
            </p>
          </div>

          <p
            v-if="recipeDetailDisabledReason"
            class="text-[0.625rem] text-danger mb-2"
            data-testid="processing-recipe-detail-disabled-reason"
          >
            {{ recipeDetailDisabledReason }}
          </p>

          <Button
            class="w-full justify-center"
            :class="{ '!bg-accent !text-bg': canConfirmProcessingDetail }"
            :icon="Boxes"
            :icon-size="12"
            :disabled="!canConfirmProcessingDetail"
            data-testid="processing-recipe-detail-start"
            @click="handleConfirmProcessingDetail"
          >
            开始加工
          </Button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, reactive, onBeforeUnmount } from 'vue'
  import { Hammer, Trash2, Package, Boxes, X, ArrowUpCircle, FlaskConical, Sparkles } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import ItemIcon from '@/components/game/ItemIcon.vue'
  import type { ItemDef, MachineType, AnimalBuildingType, ChestTier, ProcessingRecipeDef, ProcessingSlot, Quality, OwnedRing, OwnedHat, OwnedShoe, Tool, ForgeAffixRoll } from '@/types'
  import { QUALITY_NAMES } from '@/composables/useFarmActions'
  import { useAnimalStore } from '@/stores/useAnimalStore'
  import { useCookingStore } from '@/stores/useCookingStore'
  import { useFarmStore } from '@/stores/useFarmStore'
  import { useGameStore } from '@/stores/useGameStore'
  import { useInventoryStore } from '@/stores/useInventoryStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import { WORKSHOP_MAX_LEVEL, WORKSHOP_MILESTONES, useProcessingStore } from '@/stores/useProcessingStore'
  import type { ProcessingMachineRemovalEntry, ProcessingMachineRemovalPreview } from '@/stores/useProcessingStore'
  import { useSkillStore } from '@/stores/useSkillStore'
  import { useWarehouseStore } from '@/stores/useWarehouseStore'
  import { getCombinedItemCount, getCombinedItemCountSignature, hasCombinedItems, removeCombinedItems } from '@/composables/useCombinedInventory'
  import {
    PROCESSING_MACHINES,
    SPRINKLERS,
    FERTILIZERS,
    BAITS,
    TACKLES,
    TAPPER,
    CRAB_POT_CRAFT,
    LIGHTNING_ROD,
    SCARECROW,
    AUTO_PETTER,
    BOMBS,
    ALCHEMY_HEAT_LABELS,
    ALCHEMY_NATURE_LABELS,
    ALCHEMY_PILL_ROLE_LABELS,
    getProcessingRecipeById
  } from '@/data/processing'
  import { getItemById, CHEST_DEFS, CHEST_TIER_ORDER } from '@/data/items'
  import { getCropUseTagMatches } from '@/data/cropUseProfiles'
  import type { CropUseTag } from '@/data/cropUseProfiles'
  import { getWeaponById, getWeaponDisplayName } from '@/data/weapons'
  import { getRingById } from '@/data/rings'
  import { getHatById } from '@/data/hats'
  import { getShoeById } from '@/data/shoes'
  import {
    FORGE_AFFIX_MODE_DEFS,
    FORGE_AFFIX_TARGET_LABELS,
    formatForgeAffixRange,
    formatForgeAffixRoll,
    formatForgeAffixSummary,
    getForgeAffixById,
    getForgeAffixesForTarget,
    getForgeAffixModeById,
    getForgeDirectionsForTarget,
    rollForgeAffixes,
    type ForgeAffixDirectionId,
    type ForgeAffixMode,
    type ForgeAffixTarget
  } from '@/data/forgeAffixes'
  import { TIER_NAMES, TOOL_NAMES } from '@/data/upgrades'
  import { ACTION_TIME_COSTS } from '@/data/timeConstants'
  import { sfxClick } from '@/composables/useAudio'
  import { addLog } from '@/composables/useGameLog'
  import { handleEndDay } from '@/composables/useEndDay'
  import { scrollByViewport, useKeyboardShortcutTabActions } from '@/composables/useKeyboardShortcutContextActions'
  import { buildScopedSingleKey, migrateLegacySingleValue } from '@/utils/accountStorage'
  import {
    formatCropUseSubstitutionSummary,
    getCropUseRequirementAvailableCount,
    type CropUseSubstitutionPlan,
    type CropUseSubstitutionRequirement
  } from '@/utils/cropUseSubstitution'

  const processingStore = useProcessingStore()
  const cookingStore = useCookingStore()
  const inventoryStore = useInventoryStore()
  const playerStore = usePlayerStore()
  const gameStore = useGameStore()
  const farmStore = useFarmStore()
  const animalStore = useAnimalStore()
  const skillStore = useSkillStore()
  const warehouseStore = useWarehouseStore()

  const activeTab = ref<'process' | 'craft'>('process')
  const processingTabs = ['process', 'craft'] as const
  const ONLY_AVAILABLE_STORAGE_KEY = buildScopedSingleKey('taoyuanxiang_processing_only_available_')

  migrateLegacySingleValue('taoyuanxiang_processing_only_available', ONLY_AVAILABLE_STORAGE_KEY)

  const loadOnlyAvailablePreference = () => {
    try {
      const raw = localStorage.getItem(ONLY_AVAILABLE_STORAGE_KEY)
      if (raw === null) return true
      return raw !== '0'
    } catch {
      return true
    }
  }

  const onlyAvailable = ref(loadOnlyAvailablePreference())

  watch(onlyAvailable, value => {
    try {
      localStorage.setItem(ONLY_AVAILABLE_STORAGE_KEY, value ? '1' : '0')
    } catch {
      /* ignore */
    }
  })

  const QUALITY_ORDER: Quality[] = ['normal', 'fine', 'excellent', 'supreme']
  const getQualityRank = (quality: Quality) => QUALITY_ORDER.indexOf(quality)
  const getQualitiesAtLeast = (minQuality: Quality): Quality[] => QUALITY_ORDER.slice(Math.max(0, getQualityRank(minQuality)))

  interface RecipeInputViewModel {
    key: string
    itemId: string
    item?: ItemDef
    itemName: string
    count: number
    quantity: number
  }

  interface ProcessingRecipeMaterialLine extends RecipeInputViewModel {
    fulfilled: boolean
  }

  interface RecipeOptionViewModel {
    key: string
    recipe: ProcessingRecipeDef
    recipeId: string
    quality?: Quality
    count: number
    available: boolean
    disabled: boolean
    outputItem: ItemDef | null
    displayName: string
    qualityLabel: string
    inputItem: ItemDef | null
    inputItemName: string | null
    extraInputs: RecipeInputViewModel[]
    alchemyLimitText: string
    alchemyMetaText: string
    cropUseText: string
    substitutionText: string
    recommendationText: string
    alchemyBlocked: boolean
    hiddenUndiscovered: boolean
    effectiveDays: number
  }

  interface ProcessingRecipeDetailState {
    slotIndex: number
    recipeId: string
    quality?: Quality
    option: RecipeOptionViewModel
  }

  interface MachineSlotViewModel {
    slot: ProcessingSlot
    originalIndex: number
  }

  interface MachineGroupViewModel {
    machineType: MachineType
    name: string
    slots: MachineSlotViewModel[]
    firstIdleSlotIndex: number | null
    idleCount: number
    readyCount: number
    processingCount: number
    hasReady: boolean
    isSeedMaker: boolean
    isEnchantingForge: boolean
    recipeOptions: RecipeOptionViewModel[]
    seedRecipeOptions: RecipeOptionViewModel[]
    recommendationOptions: RecipeOptionViewModel[]
    recipesLoading: boolean
    isEmpty: boolean
    emptyMessage: string
  }

  interface BatchRemoveModalState {
    machineType: MachineType
    preview: ProcessingMachineRemovalPreview
  }

  interface BatchRemoveRefundLine {
    key: string
    itemId: string
    item: ItemDef | undefined
    itemName: string
    quality: Quality
    quantity: number
  }

  type MachineGroupBaseViewModel = Omit<
    MachineGroupViewModel,
    'recipeOptions' | 'seedRecipeOptions' | 'recommendationOptions' | 'recipesLoading' | 'isEmpty' | 'emptyMessage'
  >

  interface AsyncRecipeOptionsState {
    allRecipeOptions: RecipeOptionViewModel[]
    allSeedRecipeOptions: RecipeOptionViewModel[]
    loading: boolean
    token: number
    signature: string
    nextRecipeIndex: number
    completed: boolean
  }

  const getIndexedItemCount = (itemId: string, quality?: Quality): number => {
    return getCombinedItemCount(itemId, quality)
  }

  const hasIndexedItem = (itemId: string, quantity: number = 1, quality?: Quality) => getIndexedItemCount(itemId, quality) >= quantity
  const getIndexedItemCountAtMinQuality = (itemId: string, minQuality: Quality): number =>
    getQualitiesAtLeast(minQuality).reduce((sum, quality) => sum + getIndexedItemCount(itemId, quality), 0)

  const ASYNC_RECIPE_BATCH_SIZE = 8
  const ASYNC_SEED_RECIPE_BATCH_SIZE = 4
  const asyncRecipeOptionsByMachine = reactive<Record<string, AsyncRecipeOptionsState>>({})
  let asyncRecipeToken = 0
  const pendingAsyncRecipeTimers = new Set<ReturnType<typeof setTimeout>>()

  const clearPendingAsyncRecipeTimer = () => {
    for (const timer of pendingAsyncRecipeTimers) {
      clearTimeout(timer)
    }
    pendingAsyncRecipeTimers.clear()
  }

  const scheduleAsyncRecipeStep = (callback: () => void) => {
    const timer = setTimeout(() => {
      pendingAsyncRecipeTimers.delete(timer)
      callback()
    }, 0)
    pendingAsyncRecipeTimers.add(timer)
  }

  const getAsyncRecipeState = (machineType: MachineType): AsyncRecipeOptionsState => {
    const key = machineType as string
    asyncRecipeOptionsByMachine[key] ??= {
      allRecipeOptions: [],
      allSeedRecipeOptions: [],
      loading: false,
      token: 0,
      signature: '',
      nextRecipeIndex: 0,
      completed: false
    }
    return asyncRecipeOptionsByMachine[key]!
  }

  const asyncRecipeSourceSignature = computed(() => {
    const masterySignature = skillStore.masteryRewards.map(entry => `${entry.id}:${entry.unlocked ? 1 : 0}`).join('|')
    const discoverySignature = processingStore.discoveredProcessingRecipeIds.join('|')
    return [
      getCombinedItemCountSignature(),
      processingStore.workshopLevel,
      gameStore.year,
      gameStore.season,
      gameStore.day,
      masterySignature,
      discoverySignature,
      processingStore.getAlchemyDailyLimitSignature()
    ].join('::')
  })

  const uniqueStrings = (values: string[]): string[] => Array.from(new Set(values.filter(Boolean)))

  const formatCropUseTags = (itemIds: string[], tags: CropUseTag[]): string => {
    const labels = uniqueStrings(itemIds.flatMap(itemId => getCropUseTagMatches(itemId, tags).map(match => match.label)))
    return labels.length > 0 ? `用途：${labels.join('、')}` : ''
  }

  const getProcessingRecommendationTags = (recipe: ProcessingRecipeDef): CropUseTag[] => {
    if (recipe.alchemy) return ['alchemy', 'medicine']
    switch (recipe.machineType) {
      case 'oil_press':
        return ['oil', 'food', 'festival', 'order']
      case 'mill':
        return ['flour', 'food', 'pet_feed', 'order']
      case 'wine_workshop':
        return ['wine', 'gift', 'festival', 'online_cost']
      case 'sauce_jar':
        return ['pickle', 'food', 'order']
      case 'sugar_jar':
        return ['pet_feed', 'gift', 'festival', 'food']
      case 'drying_rack':
      case 'dehydrator':
        return ['food', 'medicine', 'order', 'pet_feed']
      case 'tea_maker':
        return ['food', 'gift', 'medicine', 'festival']
      case 'tofu_press':
        return ['food', 'flour', 'order', 'pet_feed']
      case 'herb_grinder':
        return ['medicine', 'alchemy']
      case 'incense_maker':
        return ['gift', 'festival', 'medicine']
      default:
        return []
    }
  }

  const buildProcessingRecommendationText = (
    recipe: ProcessingRecipeDef,
    available: boolean,
    alchemyMetaText: string,
    cropUseText: string
  ): string => {
    if (!available) return ''
    if (recipe.alchemy) {
      const effectText = recipe.alchemy.effect.description
      if (/宠物安抚/.test(effectText)) return `推荐：宠物安抚短效 · ${alchemyMetaText}`
      if (/NPC 对话/.test(effectText)) return `推荐：NPC 文游对话短效 · ${alchemyMetaText}`
      if (/节会奖金/.test(effectText)) return `推荐：节会前服用 · ${alchemyMetaText}`
      if (/送礼/.test(effectText)) return `推荐：送礼拜访前服用 · ${alchemyMetaText}`
      if (/采矿|矿洞/.test(effectText)) return `推荐：矿洞探索前服用 · ${alchemyMetaText}`
      if (/远征|行动/.test(effectText)) return `推荐：行旅或公共订单前服用 · ${alchemyMetaText}`
      return cropUseText ? `推荐：炼丹用途标签匹配 · ${alchemyMetaText}` : ''
    }
    if (!cropUseText) return ''
    if (recipe.machineType === 'oil_press') return '推荐：榨油料理 / 节会备料，可作为订单与家宴消耗。'
    if (recipe.machineType === 'mill') return '推荐：石磨粉料 / 宠物点心前置，可继续进灶台或牧场。'
    if (recipe.machineType === 'wine_workshop') return '推荐：酿酒赠礼 / 节会饮品，可留作拜访和公共消耗。'
    if (recipe.machineType === 'sauce_jar') return '推荐：腌制订单 / 家常配菜，可延长作物消耗链。'
    if (recipe.machineType === 'sugar_jar') return '推荐：灵果点心 / 节会甜品，可接宠物与赠礼。'
    if (recipe.machineType === 'drying_rack' || recipe.machineType === 'dehydrator') return '推荐：风干储备 / 药材订单，可做长期消耗。'
    if (recipe.machineType === 'tea_maker') return '推荐：茶饮赠礼 / 药膳饮品，可接村民关系与节会。'
    if (recipe.machineType === 'tofu_press') return '推荐：豆制料理 / 订单食材，可接灶台与宠物点心。'
    if (recipe.machineType === 'herb_grinder') return '推荐：药材预处理，可继续进入丹炉辅材。'
    if (recipe.machineType === 'incense_maker') return '推荐：制香赠礼 / 节会供品，可接拜访和祭礼。'
    return '推荐：加工用途标签匹配，可作为作物二级消耗路径。'
  }

  const canAffordCraft = (craftCost: { itemId: string; quantity: number }[], craftMoney: number): boolean => {
    if (playerStore.money < craftMoney) return false
    return craftCost.every(cost => hasIndexedItem(cost.itemId, cost.quantity))
  }

  const canCraftCarryItem = (itemId: string, craftCost: { itemId: string; quantity: number }[], craftMoney: number): boolean => {
    return inventoryStore.canAddItem(itemId, 1) && canAffordCraft(craftCost, craftMoney)
  }

  const buildAlchemyRequirement = (
    recipe: ProcessingRecipeDef,
    itemId: string,
    quantity: number,
    quality?: Quality
  ): CropUseSubstitutionRequirement => {
    return {
      itemId,
      quantity,
      tags: ['alchemy', 'medicine'],
      minQuality: itemId === recipe.inputItemId ? recipe.minInputQuality : undefined,
      quality: itemId === recipe.inputItemId ? quality : undefined
    }
  }

  const getAlchemyRequirementTotalCount = (
    recipe: ProcessingRecipeDef,
    itemId: string,
    quantity: number,
    quality?: Quality
  ): number => {
    return getCropUseRequirementAvailableCount(buildAlchemyRequirement(recipe, itemId, quantity, quality), getCombinedItemCount)
  }

  const formatAlchemyPlanSubstitutionText = (plan: CropUseSubstitutionPlan | null): string => {
    return plan ? formatCropUseSubstitutionSummary(plan, getItemName) : ''
  }

  const getCarryItemCraftFailureMessage = (
    itemId: string,
    itemName: string,
    craftCost: { itemId: string; quantity: number }[],
    craftMoney: number
  ): string => {
    if (!inventoryStore.canAddItem(itemId, 1)) return `背包空间不足，无法制作${itemName}。`
    if (!canAffordCraft(craftCost, craftMoney)) return '材料不足。'
    return `制作${itemName}失败，请重试。`
  }

  const buildRecipeOption = (recipe: ProcessingRecipeDef, quality?: Quality): RecipeOptionViewModel => {
    const alchemyPlan = recipe.alchemy ? processingStore.getAlchemyMaterialPlan(recipe.id, 1, quality) : null
    const outputItem = getItemById(recipe.outputItemId) ?? null
    const inputItem = recipe.inputItemId ? getItemById(recipe.inputItemId) ?? null : null
    const count = recipe.inputItemId
      ? recipe.alchemy
        ? getAlchemyRequirementTotalCount(recipe, recipe.inputItemId, recipe.inputQuantity, quality)
        : quality
        ? getIndexedItemCount(recipe.inputItemId, quality)
        : recipe.minInputQuality
          ? getIndexedItemCountAtMinQuality(recipe.inputItemId, recipe.minInputQuality)
          : getIndexedItemCount(recipe.inputItemId)
      : 0
    const inputAvailable =
      recipe.alchemy
        ? !!alchemyPlan?.fulfilled
        : recipe.inputItemId === null ||
      (quality
        ? hasIndexedItem(recipe.inputItemId, recipe.inputQuantity, quality)
        : recipe.minInputQuality
          ? getIndexedItemCountAtMinQuality(recipe.inputItemId, recipe.minInputQuality) >= recipe.inputQuantity
          : hasIndexedItem(recipe.inputItemId, recipe.inputQuantity))
    const extraInputs = (recipe.extraInputs ?? []).map(extra => ({
      key: `${recipe.id}:${extra.itemId}`,
      itemId: extra.itemId,
      item: getItemById(extra.itemId),
      itemName: getItemName(extra.itemId),
      count: recipe.alchemy ? getAlchemyRequirementTotalCount(recipe, extra.itemId, extra.quantity, quality) : getIndexedItemCount(extra.itemId),
      quantity: extra.quantity
    }))
    const available = recipe.alchemy ? !!alchemyPlan?.fulfilled : inputAvailable && extraInputs.every(extra => extra.count >= extra.quantity)
    const alchemyLimit = processingStore.getAlchemyDailyLimitStatus(recipe.id)
    const alchemyLimitText = alchemyLimit ? `${ALCHEMY_PILL_ROLE_LABELS[alchemyLimit.role]} ${alchemyLimit.used}/${alchemyLimit.limit}` : ''
    const alchemyMetaText = recipe.alchemy
      ? `${ALCHEMY_NATURE_LABELS[recipe.alchemy.nature]} · ${ALCHEMY_HEAT_LABELS[recipe.alchemy.heat]} · ${getAlchemyHeatResultHint(recipe.alchemy.heat)}`
      : ''
    const cropUseText = formatCropUseTags(
      [recipe.inputItemId, ...(recipe.extraInputs?.map(extra => extra.itemId) ?? [])].filter((itemId): itemId is string => !!itemId),
      getProcessingRecommendationTags(recipe)
    )
    const substitutionText = recipe.alchemy ? formatAlchemyPlanSubstitutionText(alchemyPlan) : ''
    const recommendationText = buildProcessingRecommendationText(recipe, available && !alchemyLimit?.blocked, alchemyMetaText, cropUseText)
    const hiddenUndiscovered = recipe.visibility === 'hidden' && !processingStore.isHiddenProcessingRecipeDiscovered(recipe.id)

    return {
      key: quality ? `${recipe.id}:${quality}` : recipe.id,
      recipe,
      recipeId: recipe.id,
      quality,
      count,
      available,
      disabled: !available || !!alchemyLimit?.blocked,
      outputItem,
      displayName: hiddenUndiscovered ? recipe.hiddenMeta?.unknownName ?? '未知加工' : recipe.name,
      qualityLabel: quality && quality !== 'normal' ? `[${QUALITY_NAMES[quality]}]` : recipe.minInputQuality ? `[${QUALITY_NAMES[recipe.minInputQuality]}以上]` : '',
      inputItem,
      inputItemName: recipe.inputItemId ? getItemName(recipe.inputItemId) : null,
      extraInputs,
      alchemyLimitText,
      alchemyMetaText,
      cropUseText,
      substitutionText,
      recommendationText,
      alchemyBlocked: !!alchemyLimit?.blocked,
      hiddenUndiscovered,
      effectiveDays: processingStore.getEffectiveProcessingDays(recipe, recipe.machineType)
    }
  }

  const machineTypeOrder = new Map(PROCESSING_MACHINES.map((machine, index) => [machine.id as MachineType, index]))

  const machineGroupsBaseView = computed((): MachineGroupBaseViewModel[] => {
    const groupMap = new Map<MachineType, MachineGroupBaseViewModel>()

    for (let i = 0; i < processingStore.machines.length; i++) {
      const slot = processingStore.machines[i]!
      let group = groupMap.get(slot.machineType)

      if (!group) {
        group = {
          machineType: slot.machineType,
          name: getMachineName(slot.machineType),
          slots: [],
          firstIdleSlotIndex: null,
          idleCount: 0,
          readyCount: 0,
          processingCount: 0,
          hasReady: false,
          isSeedMaker: slot.machineType === 'seed_maker',
          isEnchantingForge: slot.machineType === 'enchanting_forge'
        }
        groupMap.set(slot.machineType, group)
      }

      group.slots.push({ slot, originalIndex: i })

      if (!slot.recipeId) {
        if (group.firstIdleSlotIndex === null) group.firstIdleSlotIndex = i
        group.idleCount++
      } else if (slot.ready) {
        group.readyCount++
      } else {
        group.processingCount++
      }
    }

    const groups = [...groupMap.values()].sort((a, b) => {
      if (a.isEnchantingForge !== b.isEnchantingForge) return a.isEnchantingForge ? -1 : 1
      return (machineTypeOrder.get(a.machineType) ?? 99) - (machineTypeOrder.get(b.machineType) ?? 99)
    })
    for (const group of groups) {
      group.hasReady = group.readyCount > 0
    }

    return groups
  })

  const machineGroupsView = computed((): MachineGroupViewModel[] => machineGroupsBaseView.value.map(group => {
    const asyncRecipeState = getAsyncRecipeState(group.machineType)
    const seedRecipeOptions = onlyAvailable.value ? asyncRecipeState.allSeedRecipeOptions.filter(option => option.count > 0) : asyncRecipeState.allSeedRecipeOptions
    const recipeOptions = onlyAvailable.value ? asyncRecipeState.allRecipeOptions.filter(option => option.available) : asyncRecipeState.allRecipeOptions
    const isEmpty = asyncRecipeState.loading
      ? false
      : group.isSeedMaker
        ? seedRecipeOptions.length === 0
        : recipeOptions.length === 0
    return {
      machineType: group.machineType,
      name: group.name,
      slots: group.slots,
      firstIdleSlotIndex: group.firstIdleSlotIndex,
      idleCount: group.idleCount,
      readyCount: group.readyCount,
      processingCount: group.processingCount,
      hasReady: group.hasReady,
      isSeedMaker: group.isSeedMaker,
      isEnchantingForge: group.isEnchantingForge,
      recipeOptions,
      seedRecipeOptions,
      recommendationOptions: [...recipeOptions, ...seedRecipeOptions]
        .filter(option => option.recommendationText)
        .slice(0, 3),
      recipesLoading: asyncRecipeState.loading,
      isEmpty,
      emptyMessage: asyncRecipeState.loading
        ? '正在整理配方...'
        : onlyAvailable.value
          ? '没有材料足够的配方'
          : '无可用配方'
    }
  }))

  const machineGroupsByType = computed(() => new Map(machineGroupsView.value.map(group => [group.machineType, group])))

  const machineCountByType = computed(() => {
    const counts = new Map<MachineType, number>()
    for (const slot of processingStore.machines) {
      counts.set(slot.machineType, (counts.get(slot.machineType) ?? 0) + 1)
    }
    return counts
  })

  /** 折叠状态：存储已折叠的机器类型 */
  const collapsedGroups = ref(new Set<MachineType>())

  const toggleGroup = (type: MachineType) => {
    if (collapsedGroups.value.has(type)) {
      collapsedGroups.value.delete(type)
    } else {
      collapsedGroups.value.add(type)
    }
  }

  /** 获取某类型机器的已有数量 */
  const getMachineCountByType = (type: MachineType): number => {
    return machineCountByType.value.get(type) ?? 0
  }

  const getExpandedRecipeMachineTypes = (): MachineType[] =>
    machineGroupsBaseView.value
      .filter(group => group.idleCount > 0 && !group.isEnchantingForge && !collapsedGroups.value.has(group.machineType))
      .map(group => group.machineType)

  const resetAsyncRecipeState = (machineType: MachineType, signature: string) => {
    const state = getAsyncRecipeState(machineType)
    state.allRecipeOptions = []
    state.allSeedRecipeOptions = []
    state.loading = true
    state.signature = signature
    state.token = ++asyncRecipeToken
    state.nextRecipeIndex = 0
    state.completed = false
    return state
  }

  const stopAsyncRecipeState = (machineType: MachineType) => {
    const state = getAsyncRecipeState(machineType)
    state.token = ++asyncRecipeToken
    state.loading = false
  }

  const buildAsyncRecipeOptionsForGroup = (machineType: MachineType, signature: string) => {
    const state = getAsyncRecipeState(machineType)
    if (state.signature === signature && (state.loading || state.completed)) return

    const group = machineGroupsBaseView.value.find(entry => entry.machineType === machineType)
    if (!group || group.idleCount <= 0 || collapsedGroups.value.has(machineType)) {
      stopAsyncRecipeState(machineType)
      return
    }

    const nextState = resetAsyncRecipeState(machineType, signature)
    const token = nextState.token
    const recipes = processingStore.getAvailableRecipes(machineType)

    const runStep = () => {
      if (nextState.token !== token || nextState.signature !== signature) return
      if (collapsedGroups.value.has(machineType)) {
        nextState.loading = false
        return
      }

      let built = 0
      const batchSize = group.isSeedMaker ? ASYNC_SEED_RECIPE_BATCH_SIZE : ASYNC_RECIPE_BATCH_SIZE
      while (nextState.nextRecipeIndex < recipes.length && built < batchSize) {
        const recipe = recipes[nextState.nextRecipeIndex]!
        if (group.isSeedMaker) {
          if (recipe.inputItemId) {
            let pushed = false
            for (const quality of QUALITY_ORDER) {
              const option = buildRecipeOption(recipe, quality)
              if (option.count > 0) {
                nextState.allSeedRecipeOptions.push(option)
                pushed = true
              }
            }
            if (!pushed) {
              nextState.allSeedRecipeOptions.push(buildRecipeOption(recipe, 'normal'))
            }
            built++
          }
        } else {
          nextState.allRecipeOptions.push(buildRecipeOption(recipe))
          built++
        }
        nextState.nextRecipeIndex++
      }

      if (nextState.nextRecipeIndex < recipes.length) {
        scheduleAsyncRecipeStep(runStep)
        return
      }

      nextState.loading = false
      nextState.completed = true
    }

    scheduleAsyncRecipeStep(runStep)
  }

  watch(
    () => ({
      signature: asyncRecipeSourceSignature.value,
      expanded: getExpandedRecipeMachineTypes().join('|')
    }),
    ({ signature, expanded }) => {
      const expandedTypes = new Set(expanded.split('|').filter(Boolean) as MachineType[])
      for (const machineType of Object.keys(asyncRecipeOptionsByMachine) as MachineType[]) {
        if (!expandedTypes.has(machineType)) stopAsyncRecipeState(machineType)
      }
      for (const machineType of expandedTypes) {
        buildAsyncRecipeOptionsForGroup(machineType, signature)
      }
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    asyncRecipeToken++
    clearPendingAsyncRecipeTimer()
  })

  const summarizeOutputNames = (outputs: string[]) => {
    const counts = new Map<string, number>()
    for (const outputId of outputs) {
      const name = getItemName(outputId)
      counts.set(name, (counts.get(name) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([name, count]) => (count > 1 ? `${name}×${count}` : name))
      .join('、')
  }

  const handleCollectGroup = (machineType: MachineType) => {
    const result = processingStore.collectProductsByType(machineType)
    if (result.collected > 0) {
      sfxClick()
      addLog(`一键收取了${summarizeOutputNames(result.outputs)}。`)
    }
    if (result.blocked > 0) {
      addLog(`还有${result.blocked}台${getMachineName(machineType)}因背包已满暂时无法收取。`)
    }
  }

  const handleCancelGroup = (machineType: MachineType) => {
    const canceled = processingStore.cancelProcessingByType(machineType)
    if (canceled > 0) {
      addLog(`已取消${canceled}台${getMachineName(machineType)}的加工，原料已退回。`)
    }
  }

  const batchRemoveModal = ref<BatchRemoveModalState | null>(null)

  const aggregateBatchRemoveEntries = (entries: ProcessingMachineRemovalEntry[]): BatchRemoveRefundLine[] => {
    const lineMap = new Map<string, BatchRemoveRefundLine>()
    for (const entry of entries) {
      const quality = entry.quality ?? 'normal'
      const key = `${entry.itemId}:${quality}`
      const existing = lineMap.get(key)
      if (existing) {
        existing.quantity += entry.quantity
      } else {
        lineMap.set(key, {
          key,
          itemId: entry.itemId,
          item: getItemById(entry.itemId),
          itemName: getItemName(entry.itemId),
          quality,
          quantity: entry.quantity
        })
      }
    }
    return [...lineMap.values()]
  }

  const batchRemoveRefundLines = computed(() => aggregateBatchRemoveEntries(batchRemoveModal.value?.preview.refundEntries ?? []))
  const batchRemoveVoidOutputLines = computed(() => aggregateBatchRemoveEntries(batchRemoveModal.value?.preview.voidOutputEntries ?? []))
  const currentBatchRemoveMachineName = computed(() => batchRemoveModal.value ? getMachineName(batchRemoveModal.value.machineType) : '')

  const formatQualitySuffix = (quality: Quality): string => quality === 'normal' ? '' : `（${QUALITY_NAMES[quality]}）`
  const formatMoney = (amount: number): string => `${amount.toLocaleString()}文`

  const openBatchRemoveModal = (machineType: MachineType) => {
    const preview = processingStore.previewRemoveMachinesByType(machineType)
    if (preview.total <= 0) return
    batchRemoveModal.value = { machineType, preview }
  }

  const closeBatchRemoveModal = () => {
    batchRemoveModal.value = null
  }

  const handleConfirmBatchRemove = () => {
    const modal = batchRemoveModal.value
    if (!modal) return
    const result = processingStore.removeMachinesByType(modal.machineType)
    if (result.removed > 0) {
      sfxClick()
      addLog(`批量拆除了${result.removed}台${getMachineName(modal.machineType)}，制作材料与铜钱已退还。`)
      batchRemoveModal.value = null
      return
    }

    batchRemoveModal.value = {
      machineType: modal.machineType,
      preview: processingStore.previewRemoveMachinesByType(modal.machineType)
    }
    addLog('背包空间不足，无法批量拆除机器。')
  }

  const batchProcessModal = ref<{ machineType: MachineType; recipeId: string | null; quality?: Quality } | null>(null)
  const batchQuantity = ref(1)
  const processingRecipeDetail = ref<ProcessingRecipeDetailState | null>(null)

  const openBatchProcessModal = (machineType: MachineType) => {
    batchProcessModal.value = { machineType, recipeId: null }
    batchQuantity.value = 1
  }

  const selectBatchRecipe = (recipeId: string, quality?: Quality) => {
    if (!batchProcessModal.value) return
    batchProcessModal.value = { ...batchProcessModal.value, recipeId, quality }
    batchQuantity.value = 1
  }

  const currentBatchGroup = computed(() => {
    if (!batchProcessModal.value) return null
    return machineGroupsByType.value.get(batchProcessModal.value.machineType) ?? null
  })

  const currentBatchOptions = computed(() => {
    const group = currentBatchGroup.value
    if (!group) return []
    return group.isSeedMaker ? group.seedRecipeOptions : group.recipeOptions
  })

  const currentBatchOption = computed(() => {
    const modal = batchProcessModal.value
    if (!modal?.recipeId) return null
    return currentBatchOptions.value.find(option => option.recipeId === modal.recipeId && option.quality === modal.quality) ?? null
  })

  const currentBatchRecipe = computed(() => currentBatchOption.value?.recipe ?? null)

  const currentBatchMachineName = computed(() => currentBatchGroup.value?.name ?? '')

  const getRecipeOptionBatchLimit = (option: RecipeOptionViewModel | null, idleCount: number): number => {
    if (!option || idleCount <= 0) return 0
    if (option.recipe.alchemy) return processingStore.getBatchProcessLimit(option.recipe.machineType, option.recipe.id, option.quality)

    let limit = idleCount
    if (option.recipe.inputItemId !== null) {
      limit = Math.min(limit, Math.floor(option.count / option.recipe.inputQuantity))
    }

    for (const extra of option.extraInputs) {
      limit = Math.min(limit, Math.floor(extra.count / extra.quantity))
    }
    if (option.recipe.alchemy) {
      limit = Math.min(limit, processingStore.getAlchemyDailyLimitStatus(option.recipe.id)?.remaining ?? 0)
    }

    return Math.max(limit, 0)
  }

  const batchMaxCount = computed(() => getRecipeOptionBatchLimit(currentBatchOption.value, currentBatchGroup.value?.idleCount ?? 0))

  const batchQualityLabel = computed(() => (currentBatchOption.value?.qualityLabel ? ` ${currentBatchOption.value.qualityLabel}` : ''))

  const buildProcessingRecipeMaterialLines = (option: RecipeOptionViewModel | null, quantity = 1): ProcessingRecipeMaterialLine[] => {
    if (!option) return []
    const multiplier = Math.max(1, Math.floor(quantity) || 1)
    const lines: ProcessingRecipeMaterialLine[] = []
    const addLine = (input: RecipeInputViewModel) => {
      const requiredQuantity = input.quantity * multiplier
      lines.push({
        ...input,
        quantity: requiredQuantity,
        fulfilled: input.count >= requiredQuantity
      })
    }

    if (option.recipe.inputItemId !== null) {
      addLine({
        key: `${option.key}:main:${option.recipe.inputItemId}`,
        itemId: option.recipe.inputItemId,
        item: option.inputItem ?? undefined,
        itemName: option.inputItemName ?? getItemName(option.recipe.inputItemId),
        count: option.count,
        quantity: option.recipe.inputQuantity
      })
    }

    for (const extra of option.extraInputs) {
      addLine(extra)
    }

    return lines
  }

  const buildProcessingRecipeDetailLines = (option: RecipeOptionViewModel | null, quantity = 1): string[] => {
    if (!option) return []
    const substitutionText = option.recipe.alchemy
      ? processingStore.getAlchemySubstitutionText(option.recipe.id, quantity, option.quality)
      : option.substitutionText
    return [
      option.qualityLabel ? `品质要求：${option.qualityLabel.replace(/^\[|\]$/g, '')}` : '',
      option.alchemyLimitText,
      option.alchemyMetaText,
      option.cropUseText,
      substitutionText
    ].filter(Boolean)
  }

  const batchRecipeMaterialLines = computed(() => buildProcessingRecipeMaterialLines(currentBatchOption.value, batchQuantity.value))
  const batchRecipeDetailLines = computed(() => buildProcessingRecipeDetailLines(currentBatchOption.value, batchQuantity.value))

  const setBatchQuantity = (value: number) => {
    batchQuantity.value = Math.max(1, Math.min(value, batchMaxCount.value || 1))
  }

  const addBatchQuantity = (delta: number) => {
    setBatchQuantity(batchQuantity.value + delta)
  }

  const onBatchQuantityInput = (e: Event) => {
    const value = parseInt((e.target as HTMLInputElement).value, 10)
    if (!isNaN(value)) setBatchQuantity(value)
  }

  const handleStartBatchProcessing = () => {
    if (!batchProcessModal.value?.recipeId) return
    const recipe = getProcessingRecipeById(batchProcessModal.value.recipeId)
    if (!recipe) return
    const substitutionText = recipe.alchemy
      ? processingStore.getAlchemySubstitutionText(recipe.id, batchQuantity.value, batchProcessModal.value.quality)
      : ''
    const started = processingStore.startProcessingBatch(
      batchProcessModal.value.machineType,
      batchProcessModal.value.recipeId,
      batchQuantity.value,
      batchProcessModal.value.quality
    )
    if (started > 0) {
      sfxClick()
      addLog(`开始批量加工${currentBatchOption.value?.displayName ?? recipe.name}${batchQualityLabel.value} ×${started}。${substitutionText ? ` ${substitutionText}。` : ''}`)
      batchProcessModal.value = null
      return
    }
    if (recipe.alchemy) {
      const status = processingStore.getAlchemyDailyLimitStatus(recipe.id)
      if (status?.blocked) {
        addLog(`今日${ALCHEMY_PILL_ROLE_LABELS[status.role]}炼制次数已达上限。`)
        return
      }
    }
    addLog('空闲机器不足或材料不足，无法开始批量加工。')
  }

  const openProcessingRecipeDetail = (slotIndex: number, option: RecipeOptionViewModel) => {
    processingRecipeDetail.value = { slotIndex, recipeId: option.recipeId, quality: option.quality, option }
  }

  const openGroupProcessingRecipeDetail = (group: MachineGroupViewModel, option: RecipeOptionViewModel) => {
    if (group.firstIdleSlotIndex === null) return
    openProcessingRecipeDetail(group.firstIdleSlotIndex, option)
  }

  const closeProcessingRecipeDetail = () => {
    processingRecipeDetail.value = null
  }

  const currentRecipeDetailSlot = computed(() => {
    const detail = processingRecipeDetail.value
    if (!detail) return null
    return processingStore.machines[detail.slotIndex] ?? null
  })

  const currentRecipeDetailOption = computed(() => {
    const detail = processingRecipeDetail.value
    const slot = currentRecipeDetailSlot.value
    if (!detail || !slot || slot.recipeId) return null
    const recipe = getProcessingRecipeById(detail.recipeId)
    if (!recipe || recipe.machineType !== slot.machineType) return null
    return detail.option
  })

  const currentRecipeDetailMachineName = computed(() => {
    const slot = currentRecipeDetailSlot.value
    return slot ? getMachineName(slot.machineType) : ''
  })

  const recipeDetailMaterialLines = computed(() => buildProcessingRecipeMaterialLines(currentRecipeDetailOption.value))
  const recipeDetailInfoLines = computed(() => buildProcessingRecipeDetailLines(currentRecipeDetailOption.value))

  const getProcessingRecipeDisabledReason = (option: RecipeOptionViewModel | null): string => {
    if (!option?.disabled) return ''
    if (option.alchemyBlocked) return '今日炼制次数已满，暂时无法开工。'
    return '材料不足，暂时无法开工。'
  }

  const recipeDetailDisabledReason = computed(() => getProcessingRecipeDisabledReason(currentRecipeDetailOption.value))
  const canConfirmProcessingDetail = computed(() => {
    const detail = processingRecipeDetail.value
    const option = currentRecipeDetailOption.value
    const slot = currentRecipeDetailSlot.value
    return !!detail && !!option && !!slot && !slot.recipeId && !option.disabled
  })

  // === 工坊升级 ===

  const showUpgradeModal = ref(false)
  const showUpgradeConfirm = ref(false)

  const nextUpgrade = computed(() => processingStore.getNextUpgrade())
  const isWorkshopMaxLevel = computed(() => processingStore.workshopLevel >= WORKSHOP_MAX_LEVEL)
  const workshopMilestones = WORKSHOP_MILESTONES

  const canUpgrade = computed(() => {
    const u = nextUpgrade.value
    if (!u) return false
    return canAffordCraft(u.materials, u.cost)
  })

  const handleUpgradeFromModal = () => {
    const result = processingStore.upgradeWorkshop()
    sfxClick()
    addLog(result.message)
    if (result.success) {
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.craftMachine)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) handleEndDay()
    }
    showUpgradeConfirm.value = false
    showUpgradeModal.value = false
  }

  // === 武器铸魔 ===

  // === 铸魔炉 ===

  interface EnchantingForgeTargetTypeOption {
    id: ForgeAffixTarget
    label: string
    count: number
  }

  type EnchantingForgeLockTarget = 'weapon' | 'ring' | 'hat' | 'shoe'

  interface EnchantingForgeTargetOption {
    key: string
    target: ForgeAffixTarget
    index: number
    name: string
    affixSummary: string
    affixes: ForgeAffixRoll[]
    equipped: boolean
    locked: boolean
    lockTarget: EnchantingForgeLockTarget | null
    disabled: boolean
    disabledReason: string
  }

  interface EnchantingForgeMaterialLine {
    itemId: string
    item: ItemDef | null
    itemName: string
    quantity: number
    count: number
  }

  interface EnchantingForgeRangeLine {
    id: string
    name: string
    range: string
    description: string
  }

  const ENCHANTING_FORGE_TARGETS: ForgeAffixTarget[] = ['weapon', 'pickaxe', 'ring', 'hat', 'shoe']
  const showEnchantingForgeModal = ref(false)
  const selectedEnchantingForgeTarget = ref<ForgeAffixTarget>('weapon')
  const selectedEnchantingForgeItemIndex = ref(0)
  const selectedEnchantingForgeMode = ref<ForgeAffixMode>('random')
  const selectedEnchantingForgeDirectionId = ref<ForgeAffixDirectionId | ''>(getForgeDirectionsForTarget('weapon')[0]?.id ?? '')
  const selectedEnchantingForgePreserveId = ref('')
  const enchantingForgeResult = ref<ForgeAffixRoll[]>([])

  const cloneForgeAffixRolls = (affixes?: ForgeAffixRoll[] | null): ForgeAffixRoll[] =>
    (affixes ?? []).map(roll => ({ id: roll.id, value: roll.value, quality: roll.quality }))

  const hasBuiltEnchantingForge = computed(() => processingStore.machines.some(slot => slot.machineType === 'enchanting_forge'))

  const getEnchantingForgeTargetCount = (target: ForgeAffixTarget): number => {
    if (target === 'weapon') return inventoryStore.ownedWeapons.length
    if (target === 'pickaxe') return inventoryStore.getTool('pickaxe') ? 1 : 0
    if (target === 'ring') return inventoryStore.ownedRings.length
    if (target === 'hat') return inventoryStore.ownedHats.length
    return inventoryStore.ownedShoes.length
  }

  const enchantingForgeTargetTypeOptions = computed<EnchantingForgeTargetTypeOption[]>(() =>
    ENCHANTING_FORGE_TARGETS.map(id => ({
      id,
      label: FORGE_AFFIX_TARGET_LABELS[id],
      count: getEnchantingForgeTargetCount(id)
    }))
  )

  const getDefaultForgeDirectionId = (target: ForgeAffixTarget): ForgeAffixDirectionId | '' =>
    getForgeDirectionsForTarget(target)[0]?.id ?? ''

  const getEquipmentForgeBaseName = (target: ForgeAffixTarget, defId: string): string => {
    if (target === 'ring') return getRingById(defId)?.name ?? defId
    if (target === 'hat') return getHatById(defId)?.name ?? defId
    if (target === 'shoe') return getShoeById(defId)?.name ?? defId
    return defId
  }

  const equipmentForgeDefExists = (target: ForgeAffixTarget, defId: string): boolean => {
    if (target === 'ring') return !!getRingById(defId)
    if (target === 'hat') return !!getHatById(defId)
    if (target === 'shoe') return !!getShoeById(defId)
    return false
  }

  const buildEquipmentForgeOptions = (
    target: 'ring' | 'hat' | 'shoe',
    entries: (OwnedRing | OwnedHat | OwnedShoe)[]
  ): EnchantingForgeTargetOption[] =>
    entries.map((entry, index) => {
      const affixes = cloneForgeAffixRolls(entry.affixes)
      const equipped = target === 'ring'
        ? index === inventoryStore.equippedRingSlot1 || index === inventoryStore.equippedRingSlot2
        : target === 'hat'
          ? index === inventoryStore.equippedHatIndex
          : index === inventoryStore.equippedShoeIndex
      return {
        key: `${target}-${index}`,
        target,
        index,
        name: getEquipmentForgeBaseName(target, entry.defId),
        affixSummary: formatForgeAffixSummary(affixes),
        affixes,
        equipped,
        locked: !!entry.locked,
        lockTarget: target,
        disabled: !!entry.locked || !equipmentForgeDefExists(target, entry.defId),
        disabledReason: entry.locked ? '已锁定' : equipmentForgeDefExists(target, entry.defId) ? '' : '定义缺失'
      }
    })

  const buildPickaxeForgeOption = (tool: Tool): EnchantingForgeTargetOption => {
    const affixes = inventoryStore.getToolAffixes('pickaxe')
    const upgrading = !inventoryStore.isToolAvailable('pickaxe')
    return {
      key: 'pickaxe-0',
      target: 'pickaxe',
      index: 0,
      name: `${TOOL_NAMES.pickaxe} · ${TIER_NAMES[tool.tier]}`,
      affixSummary: formatForgeAffixSummary(affixes),
      affixes,
      equipped: true,
      locked: false,
      lockTarget: null,
      disabled: upgrading,
      disabledReason: upgrading ? '升级中' : ''
    }
  }

  const enchantingForgeItemOptions = computed<EnchantingForgeTargetOption[]>(() => {
    if (selectedEnchantingForgeTarget.value === 'weapon') {
      return inventoryStore.ownedWeapons.map((weapon, index) => {
        const affixes = cloneForgeAffixRolls(weapon.affixes)
        const def = getWeaponById(weapon.defId)
        return {
          key: `weapon-${index}`,
          target: 'weapon',
          index,
          name: def ? getWeaponDisplayName(weapon.defId, weapon.enchantmentId, affixes) : weapon.defId,
          affixSummary: formatForgeAffixSummary(affixes),
          affixes,
          equipped: index === inventoryStore.equippedWeaponIndex,
          locked: !!weapon.locked,
          lockTarget: 'weapon',
          disabled: !!weapon.locked || !def,
          disabledReason: weapon.locked ? '已锁定' : def ? '' : '定义缺失'
        }
      })
    }
    if (selectedEnchantingForgeTarget.value === 'pickaxe') {
      const tool = inventoryStore.getTool('pickaxe')
      return tool ? [buildPickaxeForgeOption(tool)] : []
    }
    if (selectedEnchantingForgeTarget.value === 'ring') return buildEquipmentForgeOptions('ring', inventoryStore.ownedRings)
    if (selectedEnchantingForgeTarget.value === 'hat') return buildEquipmentForgeOptions('hat', inventoryStore.ownedHats)
    return buildEquipmentForgeOptions('shoe', inventoryStore.ownedShoes)
  })

  const selectedEnchantingForgeItem = computed<EnchantingForgeTargetOption | null>(() =>
    enchantingForgeItemOptions.value.find(option => option.index === selectedEnchantingForgeItemIndex.value) ?? null
  )

  const enchantingForgeModeOptions = computed(() =>
    FORGE_AFFIX_MODE_DEFS.map(mode => ({
      ...mode,
      unlocked: processingStore.workshopLevel >= mode.minLevel
    }))
  )

  const selectedEnchantingForgeModeDef = computed(() => getForgeAffixModeById(selectedEnchantingForgeMode.value))
  const enchantingForgeDirectionOptions = computed(() => getForgeDirectionsForTarget(selectedEnchantingForgeTarget.value))
  const selectedEnchantingForgeDirection = computed(() =>
    enchantingForgeDirectionOptions.value.find(direction => direction.id === selectedEnchantingForgeDirectionId.value) ?? null
  )
  const enchantingForgePreserveOptions = computed(() =>
    (selectedEnchantingForgeItem.value?.affixes ?? []).flatMap(roll => {
      const def = getForgeAffixById(roll.id)
      return def
        ? [{
            id: roll.id,
            label: formatForgeAffixRoll(roll),
            name: def.name
          }]
        : []
    })
  )

  const enchantingForgeMaterialLines = computed<EnchantingForgeMaterialLine[]>(() =>
    selectedEnchantingForgeModeDef.value.materials.map(mat => ({
      itemId: mat.itemId,
      item: getItemById(mat.itemId) ?? null,
      itemName: getItemName(mat.itemId),
      quantity: mat.quantity,
      count: getIndexedItemCount(mat.itemId)
    }))
  )

  const enchantingForgeRangeLines = computed<EnchantingForgeRangeLine[]>(() => {
    const target = selectedEnchantingForgeTarget.value
    const directionIds = selectedEnchantingForgeMode.value === 'directed' && selectedEnchantingForgeDirection.value
      ? selectedEnchantingForgeDirection.value.affixIds
      : []
    const ids = directionIds.length > 0
      ? [...directionIds, ...getForgeAffixesForTarget(target).map(affix => affix.id)]
      : getForgeAffixesForTarget(target).map(affix => affix.id)
    const seen = new Set<string>()
    return ids.flatMap(id => {
      if (seen.has(id)) return []
      seen.add(id)
      const def = getForgeAffixById(id)
      return def && def.target === target
        ? [{
            id,
            name: def.name,
            range: formatForgeAffixRange(def),
            description: def.description
          }]
        : []
    })
  })

  const enchantingForgeCountHint = computed(() => {
    if (processingStore.workshopLevel >= 15) return '最终词条数：1/2/3（50%/38%/12%）'
    if (processingStore.workshopLevel >= 10) return '最终词条数：1/2（70%/30%）'
    return '最终词条数：1'
  })

  const enchantingForgeDirectedTopUpHint = computed(() => {
    if (selectedEnchantingForgeMode.value !== 'directed') return ''
    const directionSize = selectedEnchantingForgeDirection.value?.affixIds.length ?? 0
    return processingStore.workshopLevel >= 15 && directionSize < 3
      ? '若最终条数超过方向池容量，额外词条从同类型池补足。'
      : ''
  })

  const enchantingForgeResultLines = computed(() => enchantingForgeResult.value.map(formatForgeAffixRoll))

  const enchantingForgeBlockReason = computed(() => {
    if (!hasBuiltEnchantingForge.value) return '需要先建造铸魔炉。'
    const target = selectedEnchantingForgeTarget.value
    const item = selectedEnchantingForgeItem.value
    const mode = selectedEnchantingForgeModeDef.value
    if (!item) return `缺少可铸魔的${FORGE_AFFIX_TARGET_LABELS[target]}。`
    if (item.locked && target === 'weapon') return '这件武器已锁定，先解锁才能铸魔。'
    if (item.locked) return '这件装备已锁定，先解锁才能铸魔。'
    if (target === 'pickaxe' && item.disabledReason === '升级中') return '镐子正在升级，完成后才能铸魔。'
    if (item.disabled) return item.disabledReason ? `${item.name}${item.disabledReason}，无法铸魔。` : `${item.name}无法铸魔。`
    if (processingStore.workshopLevel < mode.minLevel) return `工坊 Lv.${mode.minLevel} 后开放${mode.label}。`
    if (mode.id === 'directed' && !selectedEnchantingForgeDirection.value) return '请选择定向方向。'
    if (mode.id === 'protected') {
      if (item.affixes.length <= 0) return '保留重铸需要目标已有词条。'
      if (!enchantingForgePreserveOptions.value.some(option => option.id === selectedEnchantingForgePreserveId.value)) return '请选择要保留的词条。'
    }
    if (playerStore.money < mode.cost) return '铜钱不足。'
    if (!hasCombinedItems(mode.materials)) return '材料不足。'
    return ''
  })

  const canConfirmEnchantingForge = computed(() => !enchantingForgeBlockReason.value)

  watch(selectedEnchantingForgeTarget, target => {
    selectedEnchantingForgeItemIndex.value = 0
    selectedEnchantingForgeDirectionId.value = getDefaultForgeDirectionId(target)
    selectedEnchantingForgePreserveId.value = ''
    enchantingForgeResult.value = []
  })

  watch(enchantingForgeItemOptions, options => {
    if (options.length <= 0) {
      selectedEnchantingForgeItemIndex.value = 0
      selectedEnchantingForgePreserveId.value = ''
      return
    }
    if (!options.some(option => option.index === selectedEnchantingForgeItemIndex.value)) {
      selectedEnchantingForgeItemIndex.value = options[0]!.index
    }
  })

  watch(selectedEnchantingForgeMode, () => {
    enchantingForgeResult.value = []
  })

  watch(enchantingForgeDirectionOptions, options => {
    if (options.length <= 0) {
      selectedEnchantingForgeDirectionId.value = ''
      return
    }
    if (!options.some(option => option.id === selectedEnchantingForgeDirectionId.value)) {
      selectedEnchantingForgeDirectionId.value = options[0]!.id
    }
  })

  watch(enchantingForgePreserveOptions, options => {
    if (options.length <= 0) {
      selectedEnchantingForgePreserveId.value = ''
      return
    }
    if (!options.some(option => option.id === selectedEnchantingForgePreserveId.value)) {
      selectedEnchantingForgePreserveId.value = options[0]!.id
    }
  })

  const openEnchantingForgeModal = () => {
    if (!hasBuiltEnchantingForge.value) {
      addLog('需要先建造铸魔炉。')
      return
    }
    enchantingForgeResult.value = []
    showEnchantingForgeModal.value = true
  }

  const closeEnchantingForgeModal = () => {
    showEnchantingForgeModal.value = false
  }

  const handleUnlockEnchantingForgeTarget = (option: EnchantingForgeTargetOption) => {
    if (!option.lockTarget) return
    selectedEnchantingForgeItemIndex.value = option.index
    if (inventoryStore.toggleEquipmentLock(option.lockTarget, option.index)) {
      enchantingForgeResult.value = []
      addLog(`已解锁${option.name}，可以在铸魔炉内继续铸魔。`)
    } else {
      addLog('解锁失败，目标不存在。')
    }
  }

  const setEnchantingForgeAffixes = (
    target: ForgeAffixTarget,
    index: number,
    affixes: ForgeAffixRoll[]
  ): { success: boolean; message: string } => {
    if (target === 'weapon') return inventoryStore.setWeaponAffixes(index, affixes)
    if (target === 'pickaxe') return inventoryStore.setToolAffixes('pickaxe', affixes)
    if (target === 'ring') return inventoryStore.setRingAffixes(index, affixes)
    if (target === 'hat') return inventoryStore.setHatAffixes(index, affixes)
    return inventoryStore.setShoeAffixes(index, affixes)
  }

  const handleConfirmEnchantingForge = () => {
    if (!canConfirmEnchantingForge.value) {
      if (enchantingForgeBlockReason.value) addLog(enchantingForgeBlockReason.value)
      return
    }

    const item = selectedEnchantingForgeItem.value
    if (!item) return
    const mode = selectedEnchantingForgeModeDef.value
    const directionId: ForgeAffixDirectionId | null =
      selectedEnchantingForgeMode.value === 'directed' && selectedEnchantingForgeDirectionId.value
        ? selectedEnchantingForgeDirectionId.value
        : null
    const preserveId = selectedEnchantingForgeMode.value === 'protected' ? selectedEnchantingForgePreserveId.value : null
    const resultAffixes = rollForgeAffixes({
      target: item.target,
      workshopLevel: processingStore.workshopLevel,
      directionId,
      preserveId
    })

    if (resultAffixes.length <= 0) {
      addLog('铸魔失败：没有可用词条。')
      return
    }

    const inventorySnapshot = inventoryStore.serialize()
    const warehouseSnapshot = warehouseStore.serialize()

    if (!playerStore.spendMoney(mode.cost)) {
      addLog('铜钱不足。')
      return
    }
    if (!removeCombinedItems(mode.materials)) {
      playerStore.earnMoney(mode.cost, { countAsEarned: false })
      addLog('材料不足。')
      return
    }

    const result = setEnchantingForgeAffixes(item.target, item.index, resultAffixes)
    if (!result.success) {
      playerStore.earnMoney(mode.cost, { countAsEarned: false })
      inventoryStore.deserialize(inventorySnapshot)
      warehouseStore.deserialize(warehouseSnapshot)
      addLog(result.message)
      return
    }

    const resultSummary = formatForgeAffixSummary(resultAffixes)
    enchantingForgeResult.value = cloneForgeAffixRolls(resultAffixes)
    sfxClick()
    addLog(`铸魔炉完成：${item.name} 获得 ${resultSummary}。`)
    const tr = gameStore.advanceTime(ACTION_TIME_COSTS.craftMachine)
    if (tr.message) addLog(tr.message)
    if (tr.passedOut) handleEndDay()
  }

  interface CraftableItem {
    id: string
    iconItemId?: string
    name: string
    description: string
    materials: { itemId: string; quantity: number }[]
    cost: number
    onCraft: () => void
    canCraft: () => boolean
    badge?: string
    batchable?: boolean
    maxBatch?: () => number
  }

  interface CraftMaterialLine {
    itemId: string
    item: ItemDef | null
    itemName: string
    quantity: number
    count: number
  }

  interface CraftModalView extends CraftableItem {
    materialLines: CraftMaterialLine[]
    maxCraftable: number
    canCraftNow: boolean
  }

  interface CraftCategoryViewModel {
    id: string
    label: string
    items: CraftableItem[]
  }

  const craftModal = ref<CraftModalView | null>(null)
  const craftQuantity = ref(1)

  useKeyboardShortcutTabActions({
    tabs: processingTabs,
    current: activeTab,
    hasBlockingModal: () => (
      batchRemoveModal.value !== null ||
      batchProcessModal.value !== null ||
      processingRecipeDetail.value !== null ||
      showUpgradeModal.value ||
      showUpgradeConfirm.value ||
      showEnchantingForgeModal.value ||
      craftModal.value !== null
    ),
    onPageUp: () => scrollByViewport(-1),
    onPageDown: () => scrollByViewport(1)
  })

  const getCraftMaxBatch = (item: CraftableItem): number => {
    if (!item.batchable) return 1
    let max = 999
    for (const m of item.materials) {
      max = Math.min(max, Math.floor(getIndexedItemCount(m.itemId) / m.quantity))
    }
    if (item.cost > 0) {
      max = Math.min(max, Math.floor(playerStore.money / item.cost))
    }
    if (item.maxBatch) {
      max = Math.min(max, item.maxBatch())
    }
    return Math.max(1, max)
  }

  const buildCraftModalView = (item: CraftableItem): CraftModalView => ({
    ...item,
    materialLines: item.materials.map(mat => ({
      itemId: mat.itemId,
      item: getItemById(mat.itemId) ?? null,
      itemName: getItemName(mat.itemId),
      quantity: mat.quantity,
      count: getIndexedItemCount(mat.itemId)
    })),
    maxCraftable: getCraftMaxBatch(item),
    canCraftNow: item.canCraft()
  })

  const maxCraftable = computed(() => craftModal.value?.maxCraftable ?? 1)

  const displayQty = computed(() => (craftModal.value?.batchable ? craftQuantity.value : 1))
  const canConfirmCraft = computed(() => {
    const item = craftModal.value
    if (!item?.canCraftNow) return false
    return !item.batchable || craftQuantity.value <= item.maxCraftable
  })

  const openCraftModal = (item: CraftableItem) => {
    craftModal.value = buildCraftModalView(item)
    craftQuantity.value = 1
  }

  const closeCraftModal = () => {
    craftModal.value = null
  }

  const getCraftIconItem = (item: CraftableItem): ItemDef => {
    const iconItem = getItemById(item.iconItemId ?? item.id)
    if (iconItem) return iconItem
    return {
      id: item.iconItemId ?? item.id,
      name: item.name,
      category: 'misc',
      description: item.description,
      sellPrice: item.cost,
      edible: false,
    }
  }

  const setCraftQuantity = (val: number) => {
    craftQuantity.value = Math.max(1, Math.min(val, maxCraftable.value))
  }

  const addCraftQuantity = (delta: number) => {
    setCraftQuantity(craftQuantity.value + delta)
  }

  const onCraftQuantityInput = (e: Event) => {
    const val = parseInt((e.target as HTMLInputElement).value, 10)
    if (!isNaN(val)) setCraftQuantity(val)
  }

  const JADE_RING_COST = [
    { itemId: 'jade', quantity: 1 },
    { itemId: 'gold_ore', quantity: 2 }
  ]
  const JADE_RING_MONEY = 500

  const canCraftJadeRing = computed(() => inventoryStore.canAddItem('jade_ring', 1) && canAffordCraft(JADE_RING_COST, JADE_RING_MONEY))

  const STAMINA_FRUIT_COST = [
    { itemId: 'prismatic_shard', quantity: 1 },
    { itemId: 'dragon_jade', quantity: 2 },
    { itemId: 'ginseng', quantity: 5 },
    { itemId: 'iridium_bar', quantity: 3 }
  ]
  const STAMINA_FRUIT_MONEY = 10000

  const allSkillsAbove8 = computed(() => ['farming', 'foraging', 'fishing', 'mining'].every(s => skillStore.getSkill(s as any).level >= 8))
  const canCraftStaminaFruit = computed(
    () =>
      allSkillsAbove8.value &&
      playerStore.staminaCapLevel < 4 &&
      inventoryStore.canAddItem('stamina_fruit', 1) &&
      canAffordCraft(STAMINA_FRUIT_COST, STAMINA_FRUIT_MONEY)
  )

  const craftCategories = computed((): CraftCategoryViewModel[] => {
    const categories: CraftCategoryViewModel[] = [
      {
        id: 'machines',
        label: '加工机器',
        items: PROCESSING_MACHINES.map(m => ({
          id: m.id as string,
          name: m.name,
          description: m.description,
          materials: m.craftCost,
          cost: m.craftMoney,
          onCraft: () => handleCraftMachine(m.id),
          canCraft: () =>
            processingStore.isMachineCraftUnlocked(m.id) &&
            canAffordCraft(m.craftCost, m.craftMoney) &&
            processingStore.machineCount < processingStore.maxMachines,
          badge: processingStore.getMachineCraftLockedReason(m.id) || `已有${getMachineCountByType(m.id)}`,
          batchable: true,
          maxBatch: () => processingStore.maxMachines - processingStore.machineCount
        }))
      }
    ]

    categories.push({
      id: 'farm',
      label: '农场设施',
      items: [
        ...SPRINKLERS.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          materials: s.craftCost,
          cost: s.craftMoney,
          onCraft: () => handleCraftSprinkler(s.id),
          canCraft: () => canCraftCarryItem(s.id, s.craftCost, s.craftMoney),
          batchable: true
        })),
        ...FERTILIZERS.map(f => ({
          id: f.id,
          name: f.name,
          description: f.description,
          materials: f.craftCost,
          cost: f.craftMoney,
          onCraft: () => handleCraftFertilizer(f.id),
          canCraft: () => canCraftCarryItem(f.id, f.craftCost, f.craftMoney),
          batchable: true
        })),
        {
          id: 'tapper',
          name: TAPPER.name,
          description: TAPPER.description,
          materials: TAPPER.craftCost,
          cost: TAPPER.craftMoney,
          onCraft: () => handleCraftTapper(),
          canCraft: () => canCraftCarryItem(TAPPER.id, TAPPER.craftCost, TAPPER.craftMoney),
          batchable: true
        },
        {
          id: 'lightning_rod',
          name: LIGHTNING_ROD.name,
          description: LIGHTNING_ROD.description,
          materials: LIGHTNING_ROD.craftCost,
          cost: LIGHTNING_ROD.craftMoney,
          onCraft: () => handleCraftLightningRod(),
          canCraft: () => canAffordCraft(LIGHTNING_ROD.craftCost, LIGHTNING_ROD.craftMoney),
          badge: `已有${farmStore.lightningRods}`,
          batchable: true
        },
        {
          id: 'scarecrow',
          name: SCARECROW.name,
          description: SCARECROW.description,
          materials: SCARECROW.craftCost,
          cost: SCARECROW.craftMoney,
          onCraft: () => handleCraftScarecrow(),
          canCraft: () => canAffordCraft(SCARECROW.craftCost, SCARECROW.craftMoney),
          badge: `已有${farmStore.scarecrows}`,
          batchable: true
        },
        ...((animalStore.buildings.find(b => b.type === 'coop')?.level ?? 0) >= 2
          ? [
              {
                id: 'auto_petter_coop',
                iconItemId: AUTO_PETTER.id,
                name: `${AUTO_PETTER.name}（鸡舍）`,
                description: AUTO_PETTER.description,
                materials: AUTO_PETTER.craftCost,
                cost: AUTO_PETTER.craftMoney,
                onCraft: () => handleCraftAutoPetter('coop'),
                canCraft: () =>
                  !animalStore.hasAutoPetter('coop') && canAffordCraft(AUTO_PETTER.craftCost, AUTO_PETTER.craftMoney),
                badge: animalStore.hasAutoPetter('coop') ? '已安装' : undefined
              }
            ]
          : []),
        ...((animalStore.buildings.find(b => b.type === 'barn')?.level ?? 0) >= 2
          ? [
              {
                id: 'auto_petter_barn',
                iconItemId: AUTO_PETTER.id,
                name: `${AUTO_PETTER.name}（牧场）`,
                description: AUTO_PETTER.description,
                materials: AUTO_PETTER.craftCost,
                cost: AUTO_PETTER.craftMoney,
                onCraft: () => handleCraftAutoPetter('barn'),
                canCraft: () =>
                  !animalStore.hasAutoPetter('barn') && canAffordCraft(AUTO_PETTER.craftCost, AUTO_PETTER.craftMoney),
                badge: animalStore.hasAutoPetter('barn') ? '已安装' : undefined
              }
            ]
          : [])
      ]
    })
    categories.push({
      id: 'fish',
      label: '渔具',
      items: [
        ...BAITS.map(b => ({
          id: b.id,
          name: b.name,
          description: b.description,
          materials: b.craftCost,
          cost: b.craftMoney,
          onCraft: () => handleCraftBait(b.id),
          canCraft: () => canCraftCarryItem(b.id, b.craftCost, b.craftMoney),
          batchable: true
        })),
        ...TACKLES.map(t => ({
          id: t.id,
          name: t.name,
          description: t.description,
          materials: t.craftCost,
          cost: t.craftMoney,
          onCraft: () => handleCraftTackle(t.id),
          canCraft: () => canCraftCarryItem(t.id, t.craftCost, t.craftMoney),
          batchable: true
        })),
        {
          id: CRAB_POT_CRAFT.id,
          name: CRAB_POT_CRAFT.name,
          description: CRAB_POT_CRAFT.description,
          materials: CRAB_POT_CRAFT.craftCost,
          cost: CRAB_POT_CRAFT.craftMoney,
          onCraft: () => handleCraftCrabPot(),
          canCraft: () => canCraftCarryItem(CRAB_POT_CRAFT.id, CRAB_POT_CRAFT.craftCost, CRAB_POT_CRAFT.craftMoney),
          batchable: true
        }
      ]
    })
    categories.push({
      id: 'other',
      label: '其他',
      items: [
        ...BOMBS.map(b => ({
          id: b.id,
          name: b.name,
          description: b.description,
          materials: b.id === 'mega_bomb' ? [{ itemId: 'mega_bomb_recipe', quantity: 1 }, ...b.craftCost] : b.craftCost,
          cost: b.craftMoney,
          onCraft: () => handleCraftBomb(b.id),
          canCraft: () =>
            (b.id !== 'mega_bomb' || hasIndexedItem('mega_bomb_recipe')) && canCraftCarryItem(b.id, b.craftCost, b.craftMoney),
          batchable: true
        })),
        {
          id: 'jade_ring',
          name: '翡翠戒指',
          description: '用翡翠和金矿制成的戒指，可以用来求婚。',
          materials: JADE_RING_COST,
          cost: JADE_RING_MONEY,
          onCraft: () => handleCraftJadeRing(),
          canCraft: () => canCraftJadeRing.value
        },
        ...(allSkillsAbove8.value
          ? [
              {
                id: 'stamina_fruit',
                name: '仙桃',
                description: '蕴含远古灵气的果实，食用后永久提升体力上限。需要种植/觅食/钓鱼/采矿全部≥8级。',
                materials: STAMINA_FRUIT_COST,
                cost: STAMINA_FRUIT_MONEY,
                onCraft: () => handleCraftStaminaFruit(),
                canCraft: () => canCraftStaminaFruit.value,
                badge: playerStore.staminaCapLevel >= 4 ? '已满级' : `${playerStore.staminaCapLevel}/4`
              }
            ]
          : [])
      ]
    })
    if (warehouseStore.unlocked) {
      categories.push({
        id: 'chest',
        label: '箱子',
        items: CHEST_TIER_ORDER.map(tier => {
          const def = CHEST_DEFS[tier]
          return {
            id: `chest_${tier}`,
            iconItemId: tier === 'wood' ? 'wood' : `${tier}_bar`,
            name: def.name,
            description: def.description,
            materials: def.craftCost,
            cost: def.craftMoney,
            onCraft: () => handleCraftChest(tier),
            canCraft: () =>
              warehouseStore.chests.length < warehouseStore.maxChests && canAffordCraft(def.craftCost, def.craftMoney),
            badge: `${warehouseStore.chests.length}/${warehouseStore.maxChests}`,
            batchable: true,
            maxBatch: () => warehouseStore.maxChests - warehouseStore.chests.length
          }
        })
      })
    }

    return categories
  })

  const handleCraftFromModal = () => {
    if (!craftModal.value) return
    const qty = craftModal.value.batchable ? Math.min(craftQuantity.value, maxCraftable.value) : 1
    const startDay = gameStore.day
    for (let i = 0; i < qty; i++) {
      if (!craftModal.value.canCraft()) break
      craftModal.value.onCraft()
      // 晕倒导致日期变更，停止批量制造
      if (gameStore.day !== startDay) break
    }
    craftModal.value = null
  }

  // === 工具函数 ===

  function getMachineName(type: MachineType): string {
    return PROCESSING_MACHINES.find(m => m.id === type)?.name ?? type
  }

  function getItemName(id: string): string {
    return getItemById(id)?.name ?? id
  }

  function getAlchemyHeatResultHint(heat: NonNullable<ProcessingRecipeDef['alchemy']>['heat']): string {
    if (heat === 'gentle') return '稳成丹'
    if (heat === 'strong') return '易出奇丹'
    return '均衡火候'
  }

  function getRecipeName(recipeId: string): string {
    return processingStore.getProcessingRecipeDisplayName(recipeId)
  }

  function isRecipeHiddenUndiscovered(recipeId: string): boolean {
    const recipe = getProcessingRecipeById(recipeId)
    return recipe?.visibility === 'hidden' && !processingStore.isHiddenProcessingRecipeDiscovered(recipeId)
  }

  function getRecipeOutputName(recipeId: string): string {
    const recipe = getProcessingRecipeById(recipeId)
    if (!recipe) return recipeId
    if (isRecipeHiddenUndiscovered(recipeId)) return recipe.hiddenMeta?.unknownName ?? '未知加工'
    return getItemById(recipe.outputItemId)?.name ?? recipe.name
  }

  function getRecipeOutputItem(recipeId: string): ItemDef | null {
    const recipe = getProcessingRecipeById(recipeId)
    return recipe ? getItemById(recipe.outputItemId) ?? null : null
  }

  function getSlotOutputName(slot: ProcessingSlot): string {
    if (slot.alchemyResult) return getItemName(slot.alchemyResult.outputItemId)
    return slot.recipeId ? getRecipeOutputName(slot.recipeId) : ''
  }

  // === 制造处理 ===

  const handleCraftMachine = (machineType: MachineType) => {
    if (processingStore.craftMachine(machineType)) {
      sfxClick()
      addLog(`制造了${getMachineName(machineType)}并放置到加工区。`)
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.craftMachine)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) {
        handleEndDay()
        return
      }
    } else {
      addLog('材料不足或已达上限。')
    }
  }

  const handleCraftSprinkler = (sprinklerId: string) => {
    const def = SPRINKLERS.find(s => s.id === sprinklerId)
    const name = def?.name ?? sprinklerId
    if (processingStore.craftSprinkler(sprinklerId)) {
      sfxClick()
      addLog(`制造了${name}，已放入背包。去农场放置吧。`)
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.craftMachine)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) {
        handleEndDay()
        return
      }
    } else {
      addLog(getCarryItemCraftFailureMessage(sprinklerId, name, def?.craftCost ?? [], def?.craftMoney ?? 0))
    }
  }

  const handleCraftFertilizer = (fertilizerId: string) => {
    const def = FERTILIZERS.find(f => f.id === fertilizerId)
    const name = def?.name ?? fertilizerId
    if (processingStore.craftFertilizer(fertilizerId)) {
      sfxClick()
      addLog(`制造了${name}，已放入背包。`)
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.craftMachine)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) {
        handleEndDay()
        return
      }
    } else {
      addLog(getCarryItemCraftFailureMessage(fertilizerId, name, def?.craftCost ?? [], def?.craftMoney ?? 0))
    }
  }

  const handleCraftBait = (baitId: string) => {
    const def = BAITS.find(b => b.id === baitId)
    const name = def?.name ?? baitId
    if (processingStore.craftBait(baitId)) {
      sfxClick()
      addLog(`制造了${name}，已放入背包。`)
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.craftMachine)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) {
        handleEndDay()
        return
      }
    } else {
      addLog(getCarryItemCraftFailureMessage(baitId, name, def?.craftCost ?? [], def?.craftMoney ?? 0))
    }
  }

  const handleCraftTackle = (tackleId: string) => {
    const def = TACKLES.find(t => t.id === tackleId)
    const name = def?.name ?? tackleId
    if (processingStore.craftTackle(tackleId)) {
      sfxClick()
      addLog(`制造了${name}，已放入背包。`)
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.craftMachine)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) {
        handleEndDay()
        return
      }
    } else {
      addLog(getCarryItemCraftFailureMessage(tackleId, name, def?.craftCost ?? [], def?.craftMoney ?? 0))
    }
  }

  const handleCraftCrabPot = () => {
    if (processingStore.craftCrabPot()) {
      sfxClick()
      addLog(`制造了${CRAB_POT_CRAFT.name}，已放入背包。`)
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.craftMachine)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) {
        handleEndDay()
        return
      }
    } else {
      addLog(getCarryItemCraftFailureMessage(CRAB_POT_CRAFT.id, CRAB_POT_CRAFT.name, CRAB_POT_CRAFT.craftCost, CRAB_POT_CRAFT.craftMoney))
    }
  }

  const handleCraftTapper = () => {
    if (processingStore.craftTapper()) {
      sfxClick()
      addLog(`制造了采脂器，已放入背包。去农场安装到野树上吧。`)
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.craftMachine)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) {
        handleEndDay()
        return
      }
    } else {
      addLog(getCarryItemCraftFailureMessage(TAPPER.id, TAPPER.name, TAPPER.craftCost, TAPPER.craftMoney))
    }
  }

  const handleCraftLightningRod = () => {
    if (processingStore.consumeCraftMaterials(LIGHTNING_ROD.craftCost, LIGHTNING_ROD.craftMoney)) {
      sfxClick()
      farmStore.lightningRods++
      addLog(`制造了避雷针，已安装到农场。(共${farmStore.lightningRods}根)`)
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.craftMachine)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) {
        handleEndDay()
        return
      }
    } else {
      addLog('材料不足。')
    }
  }

  const handleCraftScarecrow = () => {
    if (processingStore.consumeCraftMaterials(SCARECROW.craftCost, SCARECROW.craftMoney)) {
      sfxClick()
      farmStore.scarecrows++
      addLog(`制造了稻草人，已安装到农场。(共${farmStore.scarecrows}个)`)
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.craftMachine)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) {
        handleEndDay()
        return
      }
    } else {
      addLog('材料不足。')
    }
  }

  const handleCraftAutoPetter = (buildingType: AnimalBuildingType) => {
    if (animalStore.hasAutoPetter(buildingType)) {
      addLog('该畜舍已安装自动抚摸机。')
      return
    }
    if (processingStore.consumeCraftMaterials(AUTO_PETTER.craftCost, AUTO_PETTER.craftMoney)) {
      sfxClick()
      const result = animalStore.installAutoPetter(buildingType)
      addLog(result.message)
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.craftMachine)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) {
        handleEndDay()
        return
      }
    } else {
      addLog('材料不足。')
    }
  }

  const handleCraftBomb = (bombId: string) => {
    const def = BOMBS.find(b => b.id === bombId)
    const name = def?.name ?? bombId
    if (processingStore.craftBomb(bombId)) {
      sfxClick()
      addLog(`制造了${name}，已放入背包。`)
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.craftMachine)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) {
        handleEndDay()
        return
      }
    } else {
      addLog(getCarryItemCraftFailureMessage(bombId, name, def?.craftCost ?? [], def?.craftMoney ?? 0))
    }
  }

  const handleCraftJadeRing = () => {
    if (!canCraftJadeRing.value) return
    if (!inventoryStore.canAddItem('jade_ring', 1)) {
      addLog('背包空间不足，无法制作翡翠戒指。')
      return
    }
    const inventorySnapshot = inventoryStore.serialize()
    const warehouseSnapshot = warehouseStore.serialize()
    if (!playerStore.spendMoney(JADE_RING_MONEY)) return
    if (!removeCombinedItems(JADE_RING_COST)) {
      playerStore.earnMoney(JADE_RING_MONEY, { countAsEarned: false })
      return
    }
    if (!inventoryStore.addItemExact('jade_ring')) {
      playerStore.earnMoney(JADE_RING_MONEY, { countAsEarned: false })
      inventoryStore.deserialize(inventorySnapshot)
      warehouseStore.deserialize(warehouseSnapshot)
      addLog('背包空间不足，翡翠戒指制作已回滚。')
      return
    }
    sfxClick()
    addLog('制造了翡翠戒指！可以用来求婚。')
    const tr = gameStore.advanceTime(ACTION_TIME_COSTS.craftMachine)
    if (tr.message) addLog(tr.message)
    if (tr.passedOut) {
      handleEndDay()
      return
    }
  }

  const handleCraftStaminaFruit = () => {
    if (!canCraftStaminaFruit.value) return
    if (!inventoryStore.canAddItem('stamina_fruit', 1)) {
      addLog('背包空间不足，无法制作仙桃。')
      return
    }
    if (processingStore.consumeCraftMaterials(STAMINA_FRUIT_COST, STAMINA_FRUIT_MONEY)) {
      sfxClick()
      if (!inventoryStore.addItemExact('stamina_fruit')) {
        addLog('背包空间不足，仙桃制作未完成。')
        return
      }
      addLog('制造了仙桃！在背包中使用可永久提升体力上限。')
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.craftMachine)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) {
        handleEndDay()
        return
      }
    } else {
      addLog('材料不足。')
    }
  }

  const handleCraftChest = (tier: ChestTier) => {
    const def = CHEST_DEFS[tier]
    if (warehouseStore.chests.length >= warehouseStore.maxChests) {
      addLog('箱子槽位已满，请先扩建仓库。')
      return
    }
    if (processingStore.consumeCraftMaterials(def.craftCost, def.craftMoney)) {
      sfxClick()
      warehouseStore.addChest(tier)
      addLog(`制造了${def.name}，已放入仓库。`)
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.craftMachine)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) {
        handleEndDay()
        return
      }
    } else {
      addLog('材料不足。')
    }
  }

  // === 加工处理 ===

  const handleStartProcessing = (slotIndex: number, recipeId: string, quality?: Quality): boolean => {
    const recipe = getProcessingRecipeById(recipeId)
    const substitutionText = recipe?.alchemy ? processingStore.getAlchemySubstitutionText(recipeId, 1, quality) : ''
    if (processingStore.startProcessing(slotIndex, recipeId, quality)) {
      sfxClick()
      const qualityLabel = quality && quality !== 'normal' ? `(${QUALITY_NAMES[quality]})` : ''
      addLog(`开始加工${recipe ? processingStore.getProcessingRecipeDisplayName(recipe.id) : recipeId}${qualityLabel}，需要${recipe ? processingStore.getEffectiveProcessingDays(recipe, recipe.machineType) : '?'}天。${substitutionText ? ` ${substitutionText}。` : ''}`)
      return true
    } else {
      if (recipe?.alchemy) {
        const status = processingStore.getAlchemyDailyLimitStatus(recipeId)
        if (status?.blocked) {
          addLog(`今日${ALCHEMY_PILL_ROLE_LABELS[status.role]}炼制次数已达上限。`)
          return false
        }
      }
      addLog('原料不足或机器正在使用。')
      return false
    }
  }

  const handleConfirmProcessingDetail = () => {
    const detail = processingRecipeDetail.value
    if (!detail) return
    if (!canConfirmProcessingDetail.value) {
      const message = recipeDetailDisabledReason.value || '原料不足或机器正在使用。'
      addLog(message)
      return
    }
    if (handleStartProcessing(detail.slotIndex, detail.recipeId, detail.quality)) {
      closeProcessingRecipeDetail()
    }
  }

  const handleCollect = (slotIndex: number) => {
    const outputId = processingStore.collectProduct(slotIndex)
    if (outputId) {
      sfxClick()
      const name = getItemById(outputId)?.name ?? outputId
      addLog(`收取了${name}！`)
    }
  }

  const handleRemoveMachine = (slotIndex: number) => {
    const slot = processingStore.machines[slotIndex]
    if (!slot) return
    const name = getMachineName(slot.machineType)
    if (processingStore.removeMachine(slotIndex)) {
      addLog(`拆除了${name}，制作材料已退还。`)
    }
  }

  const handleCancelProcessing = (slotIndex: number) => {
    const slot = processingStore.machines[slotIndex]
    if (!slot) return
    const name = getMachineName(slot.machineType)
    if (processingStore.cancelProcessing(slotIndex)) {
      addLog(`${name}已停止加工，原料已退回。`)
    }
  }

  if (import.meta.env.DEV) {
    ;(globalThis as any).__TAOYUAN_PROCESSING_DEBUG__ = {
      prepareAlchemySmoke: () => {
        if (!processingStore.machines.some(slot => slot.machineType === 'alchemy_furnace')) {
          processingStore.machines.push({
            machineType: 'alchemy_furnace',
            recipeId: null,
            inputItemId: null,
            daysProcessed: 0,
            totalDays: 0,
            ready: false
          })
        }

        inventoryStore.addItem('radish', 2)
        inventoryStore.addItem('potato', 1)
        inventoryStore.addItem('refined_quartz', 1)
        activeTab.value = 'process'
        onlyAvailable.value = true
        collapsedGroups.value.delete('alchemy_furnace')
        return true
      }
    }
  }
</script>

<style scoped>
  .processing-option-grid,
  .processing-craft-grid {
    grid-auto-rows: minmax(58px, auto);
  }

  .processing-option-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .processing-machine-recipes {
    max-height: min(380px, 48vh);
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .processing-machine-group-card,
  .processing-machine-recipes,
  .processing-machine-recommendations {
    min-width: 0;
  }

  .processing-machine-slot-list {
    display: grid;
    min-width: 0;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 10rem), 1fr));
    gap: 0.375rem;
  }

  .processing-machine-recipes,
  .processing-machine-recommendations {
    grid-column: 1 / -1;
  }

  .processing-machine-slot-card {
    min-width: 0;
    min-height: 5.25rem;
  }

  .processing-option-card {
    min-width: 0;
    min-height: 58px;
    justify-content: flex-start;
    padding: 6px;
    text-align: left;
  }

  .processing-option-card--unavailable {
    opacity: 0.58;
  }

  .processing-option-card--unavailable:hover {
    opacity: 0.76;
  }

  .processing-option-card :deep(> span) {
    min-width: 0;
    flex: 1 1 auto;
  }

  .processing-option-card__body {
    display: flex;
    width: 100%;
    min-width: 0;
    align-items: center;
    gap: 6px;
  }

  .processing-craft-card__body {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 6px;
  }

  .processing-option-card__copy,
  .processing-craft-card__copy,
  .processing-craft-card {
    display: flex;
    min-width: 0;
    flex-direction: column;
    justify-content: center;
  }

  .processing-option-card__copy {
    flex: 1 1 auto;
    gap: 3px;
  }

  .processing-craft-card__copy {
    flex: 1 1 auto;
    gap: 3px;
  }

  .processing-option-card__name,
  .processing-option-card__meta,
  .processing-craft-card__name,
  .processing-craft-card__meta {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .processing-option-card__name,
  .processing-craft-card__name {
    font-size: 0.6875rem;
    line-height: 1.2;
  }

  .processing-option-card__meta,
  .processing-craft-card__meta {
    color: var(--color-muted);
    font-size: 0.625rem;
    line-height: 1.1;
  }

  .processing-craft-card {
    min-height: 58px;
    gap: 3px;
    transition: border-color 0.16s ease, background-color 0.16s ease;
  }

  .processing-recipe-material-list {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 0.25rem;
  }

  .processing-recipe-material-row {
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 0.75rem;
  }

  .processing-recipe-material-row__item {
    display: inline-flex;
    min-width: 0;
    align-items: center;
    gap: 0.375rem;
    color: var(--color-muted);
  }

  @media (min-width: 1280px) {
    :global(html[data-desktop-layout-mode='adaptive'] #app:not(.app-shell--admin) .processing-option-grid) {
      grid-template-columns: repeat(5, minmax(0, 1fr));
    }

    :global(html[data-desktop-layout-mode='adaptive'] #app:not(.app-shell--admin) .processing-craft-grid) {
      grid-template-columns: repeat(6, minmax(0, 1fr));
    }
  }

  @media (min-width: 1920px) {
    :global(html[data-desktop-layout-mode='adaptive'] #app:not(.app-shell--admin) .processing-option-grid) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    :global(html[data-desktop-layout-mode='adaptive'] #app:not(.app-shell--admin) .processing-craft-grid) {
      grid-template-columns: repeat(8, minmax(0, 1fr));
    }
  }
</style>
