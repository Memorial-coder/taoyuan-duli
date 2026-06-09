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
      <div v-else class="flex flex-col space-y-2">
        <div
          v-for="group in machineGroupsView"
          :key="group.machineType"
          class="border border-accent/10 rounded-xs"
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
              v-if="group.idleCount > 0"
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
          </div>

          <!-- 展开的机器明细 -->
          <div v-if="!collapsedGroups.has(group.machineType)" class="flex flex-col space-y-1.5 px-2 pb-2">
            <div
              v-if="group.recommendationOptions.length > 0"
              class="rounded-xs border border-accent/15 bg-accent/5 px-2 py-1.5"
            >
              <p class="text-[0.625rem] text-accent mb-1">用途推荐</p>
              <div
                v-for="option in group.recommendationOptions"
                :key="`recommend-${option.key}`"
                class="flex items-start justify-between gap-2 py-0.5"
              >
                <div class="flex min-w-0 items-center gap-2">
                  <ItemIcon :item="option.outputItem" size="xs" :quality="option.quality ?? 'normal'" :silhouette="option.disabled" />
                  <div class="min-w-0">
                    <p class="text-xs text-text truncate">{{ option.displayName }}</p>
                    <p class="text-[0.625rem] text-muted leading-snug">{{ option.recommendationText }}</p>
                  </div>
                </div>
                <span class="text-[0.625rem] text-accent/80 shrink-0">{{ !option.disabled ? '可开工' : option.alchemyBlocked ? '今日已满' : '缺材料' }}</span>
              </div>
            </div>
            <div
              v-for="{ slot, originalIndex } in group.slots"
              :key="originalIndex"
              class="border rounded-xs p-2"
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
                <!-- 种子制造机：按品质展开 -->
                <template v-if="group.isSeedMaker">
                  <div v-if="group.seedRecipeOptions.length > 0" class="processing-option-grid grid grid-cols-3 gap-1.5 md:grid-cols-5">
                    <Button
                      v-for="option in group.seedRecipeOptions"
                      :key="option.key"
                      class="processing-option-card"
                      :disabled="option.disabled"
                      :data-testid="`processing-recipe-${option.recipeId}`"
                      @click="handleStartProcessing(originalIndex, option.recipeId, option.quality)"
                    >
                      <span class="processing-option-card__body">
                        <ItemIcon :item="option.outputItem" size="xs" :quality="option.quality ?? 'normal'" :silhouette="option.disabled" />
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
                  <p v-else class="text-xs text-muted">{{ group.emptyMessage }}</p>
                </template>
                <!-- 其他机器：普通配方列表 -->
                <template v-else>
                  <div v-if="group.recipeOptions.length > 0" class="processing-option-grid grid grid-cols-3 gap-1.5 md:grid-cols-5">
                    <Button
                      v-for="option in group.recipeOptions"
                      :key="option.key"
                      class="processing-option-card"
                      :disabled="option.disabled"
                      :data-testid="`processing-recipe-${option.recipeId}`"
                      @click="handleStartProcessing(originalIndex, option.recipeId)"
                    >
                      <span class="processing-option-card__body">
                        <ItemIcon :item="option.outputItem" size="xs" :quality="option.quality ?? 'normal'" :silhouette="option.disabled" />
                        <span class="processing-option-card__copy">
                          <span class="processing-option-card__name">
                            {{ option.displayName }}
                            <span v-if="option.qualityLabel" class="text-muted">{{ option.qualityLabel }}</span>
                          </span>
                          <span class="processing-option-card__meta">
                            <span v-if="option.inputItemName">
                              {{ option.inputItemName }} {{ option.count }}/{{ option.recipe.inputQuantity }}
                            </span>
                            <span v-else>{{ option.recipe.processingDays }}天</span>
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
                  <p v-else class="text-xs text-muted">{{ group.emptyMessage }}</p>
                </template>
              </div>

              <!-- 加工中 -->
              <div v-else-if="!slot.ready" :data-testid="`processing-slot-running-${slot.recipeId}`">
                <div class="flex items-center justify-between text-xs mb-1">
                  <span class="inline-flex min-w-0 items-center gap-1.5 text-muted">
                    <ItemIcon :item="getRecipeOutputItem(slot.recipeId)" size="xs" :show-badge="false" />
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
                  <ItemIcon :item="slot.alchemyResult ? getItemById(slot.alchemyResult.outputItemId) : getRecipeOutputItem(slot.recipeId)" size="xs" :show-badge="false" />
                  收取 {{ getSlotOutputName(slot) }}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 制造区 -->
    <div v-if="activeTab === 'craft'" class="border border-accent/20 rounded-xs p-3">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center space-x-1.5 text-sm text-accent">
          <Hammer :size="14" />
          <span>制造</span>
        </div>
        <span class="text-xs text-muted">机器 {{ processingStore.machineCount }}/{{ processingStore.maxMachines }}</span>
      </div>

      <div v-for="cat in craftCategories" :key="cat.label" class="mb-3 last:mb-0">
        <p class="text-xs text-muted mb-1">{{ cat.label }}</p>
        <div class="processing-craft-grid grid grid-cols-3 gap-1.5 max-h-60 overflow-y-auto pr-1 md:grid-cols-5">
          <div
            v-for="item in cat.items"
            :key="item.id"
            class="processing-craft-card border border-accent/20 rounded-xs px-2 py-1.5 cursor-pointer hover:bg-accent/5"
            :data-testid="`processing-craft-${item.id}`"
            @click="openCraftModal(item)"
          >
            <div class="processing-craft-card__name">
              {{ item.name }}
              <span v-if="item.badge" class="text-muted ml-1">[{{ item.badge }}]</span>
            </div>
            <span v-if="item.cost > 0" class="processing-craft-card__meta">{{ item.cost }}文</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 工坊扩建弹窗 -->
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
              <span class="text-xs text-accent">Lv.{{ processingStore.workshopLevel }}</span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">机器上限</span>
              <span class="text-xs text-text">{{ processingStore.maxMachines }} 台</span>
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

          <p v-else class="text-[0.625rem] text-muted text-center">工坊已达到最高等级。</p>
        </div>
      </div>
    </Transition>

    <!-- 制造弹窗 -->
    <Transition name="panel-fade">
      <div v-if="craftModal" class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="craftModal = null">
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="craftModal = null">
            <X :size="14" />
          </button>

          <p class="text-sm text-accent mb-2">{{ craftModal.name }}</p>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted">{{ craftModal.description }}</p>
            <p v-if="craftModal.badge" class="text-xs text-muted mt-0.5">当前：{{ craftModal.badge }}</p>
          </div>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted mb-1">所需材料</p>
            <div v-for="mat in craftModal.materials" :key="mat.itemId" class="flex items-center justify-between gap-2">
              <span class="flex min-w-0 items-center gap-1.5 text-xs text-muted">
                <ItemIcon :item="getItemById(mat.itemId)" size="xs" :show-badge="false" />
                <span class="truncate">{{ getItemName(mat.itemId) }}</span>
              </span>
              <span class="text-xs" :class="getIndexedItemCount(mat.itemId) >= mat.quantity * displayQty ? '' : 'text-danger'">
                {{ getIndexedItemCount(mat.itemId) }}/{{ mat.quantity * displayQty }}
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
            :class="{ '!bg-accent !text-bg': craftModal.canCraft() }"
            :icon="Hammer"
            :icon-size="12"
            :disabled="!craftModal.canCraft()"
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
                  {{ option.alchemyMetaText || `${option.recipe.processingDays}天` }}
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
              <span class="text-xs">{{ currentBatchRecipe.name }}{{ batchQualityLabel }}</span>
              <span class="text-[0.625rem] text-muted">{{ currentBatchRecipe.processingDays }}天/台</span>
            </div>
            <div v-if="currentBatchOption?.alchemyLimitText" class="text-[0.625rem] text-muted mb-1.5">
              {{ [currentBatchOption.alchemyLimitText, currentBatchOption.alchemyMetaText, currentBatchOption.cropUseText, currentBatchOption.substitutionText].filter(Boolean).join(' · ') }}
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
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { Hammer, Trash2, Package, Boxes, X, ArrowUpCircle, FlaskConical } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import ItemIcon from '@/components/game/ItemIcon.vue'
  import type { ItemDef, MachineType, AnimalBuildingType, ChestTier, ProcessingRecipeDef, ProcessingSlot, Quality } from '@/types'
  import { QUALITY_NAMES } from '@/composables/useFarmActions'
  import { useAnimalStore } from '@/stores/useAnimalStore'
  import { useCookingStore } from '@/stores/useCookingStore'
  import { useFarmStore } from '@/stores/useFarmStore'
  import { useGameStore } from '@/stores/useGameStore'
  import { useInventoryStore } from '@/stores/useInventoryStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import { useProcessingStore } from '@/stores/useProcessingStore'
  import { useSkillStore } from '@/stores/useSkillStore'
  import { useWarehouseStore } from '@/stores/useWarehouseStore'
  import { getCombinedItemCount, hasCombinedItem, removeCombinedItem } from '@/composables/useCombinedInventory'
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
  import { ACTION_TIME_COSTS } from '@/data/timeConstants'
  import { sfxClick } from '@/composables/useAudio'
  import { addLog } from '@/composables/useGameLog'
  import { handleEndDay } from '@/composables/useEndDay'
  import { buildScopedSingleKey, migrateLegacySingleValue } from '@/utils/accountStorage'

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

  interface CombinedInventoryIndex {
    totalByItemId: Map<string, number>
    totalByItemAndQuality: Map<string, number>
  }

  interface RecipeInputViewModel {
    key: string
    itemId: string
    item?: ItemDef
    itemName: string
    count: number
    quantity: number
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
  }

  interface MachineSlotViewModel {
    slot: ProcessingSlot
    originalIndex: number
  }

  interface MachineGroupViewModel {
    machineType: MachineType
    name: string
    slots: MachineSlotViewModel[]
    idleCount: number
    readyCount: number
    processingCount: number
    hasReady: boolean
    isSeedMaker: boolean
    recipeOptions: RecipeOptionViewModel[]
    seedRecipeOptions: RecipeOptionViewModel[]
    recommendationOptions: RecipeOptionViewModel[]
    isEmpty: boolean
    emptyMessage: string
  }

  const getInventoryQualityKey = (itemId: string, quality: Quality) => `${itemId}::${quality}`

  const combinedInventoryIndex = computed<CombinedInventoryIndex>(() => {
    const totalByItemId = new Map<string, number>()
    const totalByItemAndQuality = new Map<string, number>()
    const addItemCount = (itemId: string, quantity: number, quality: Quality = 'normal') => {
      if (quantity <= 0) return
      totalByItemId.set(itemId, (totalByItemId.get(itemId) ?? 0) + quantity)
      const qualityKey = getInventoryQualityKey(itemId, quality)
      totalByItemAndQuality.set(qualityKey, (totalByItemAndQuality.get(qualityKey) ?? 0) + quantity)
    }

    for (const item of inventoryStore.items) {
      addItemCount(item.itemId, item.quantity, item.quality ?? 'normal')
    }

    for (const item of inventoryStore.tempItems) {
      addItemCount(item.itemId, item.quantity, item.quality ?? 'normal')
    }

    if (warehouseStore.unlocked) {
      for (const chest of warehouseStore.chests) {
        for (const item of chest.items) {
          addItemCount(item.itemId, item.quantity, item.quality ?? 'normal')
        }
      }
    }

    return {
      totalByItemId,
      totalByItemAndQuality
    }
  })

  const getIndexedItemCount = (itemId: string, quality?: Quality): number => {
    if (quality) {
      return combinedInventoryIndex.value.totalByItemAndQuality.get(getInventoryQualityKey(itemId, quality)) ?? 0
    }
    return combinedInventoryIndex.value.totalByItemId.get(itemId) ?? 0
  }

  const hasIndexedItem = (itemId: string, quantity: number = 1, quality?: Quality) => getIndexedItemCount(itemId, quality) >= quantity
  const getIndexedItemCountAtMinQuality = (itemId: string, minQuality: Quality): number =>
    getQualitiesAtLeast(minQuality).reduce((sum, quality) => sum + getIndexedItemCount(itemId, quality), 0)

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
        ? processingStore.getAlchemyRequirementAvailableCount(recipe.id, recipe.inputItemId, quality)
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
      count: recipe.alchemy ? processingStore.getAlchemyRequirementAvailableCount(recipe.id, extra.itemId, quality) : getIndexedItemCount(extra.itemId),
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
    const substitutionText = recipe.alchemy ? processingStore.getAlchemySubstitutionText(recipe.id, 1, quality) : ''
    const recommendationText = buildProcessingRecommendationText(recipe, available && !alchemyLimit?.blocked, alchemyMetaText, cropUseText)

    return {
      key: quality ? `${recipe.id}:${quality}` : recipe.id,
      recipe,
      recipeId: recipe.id,
      quality,
      count,
      available,
      disabled: !available || !!alchemyLimit?.blocked,
      outputItem,
      displayName: recipe.name,
      qualityLabel: quality && quality !== 'normal' ? `[${QUALITY_NAMES[quality]}]` : recipe.minInputQuality ? `[${QUALITY_NAMES[recipe.minInputQuality]}以上]` : '',
      inputItem,
      inputItemName: recipe.inputItemId ? getItemName(recipe.inputItemId) : null,
      extraInputs,
      alchemyLimitText,
      alchemyMetaText,
      cropUseText,
      substitutionText,
      recommendationText,
      alchemyBlocked: !!alchemyLimit?.blocked
    }
  }

  const machineTypeOrder = new Map(PROCESSING_MACHINES.map((machine, index) => [machine.id as MachineType, index]))

  const getSeedRecipeOptions = (machineType: MachineType): RecipeOptionViewModel[] => {
    const result: RecipeOptionViewModel[] = []

    for (const recipe of processingStore.getAvailableRecipes(machineType)) {
      if (!recipe.inputItemId) continue

      let hasAnyQuality = false
      for (const quality of QUALITY_ORDER) {
        const option = buildRecipeOption(recipe, quality)
        if (option.count > 0) {
          hasAnyQuality = true
          result.push(option)
        }
      }

      if (!hasAnyQuality && !onlyAvailable.value) {
        result.push(buildRecipeOption(recipe, 'normal'))
      }
    }

    return result
  }

  const getRecipeOptions = (machineType: MachineType): RecipeOptionViewModel[] => {
    const options = processingStore.getAvailableRecipes(machineType).map(recipe => buildRecipeOption(recipe))
    return onlyAvailable.value ? options.filter(option => option.available) : options
  }

  const machineGroupsView = computed((): MachineGroupViewModel[] => {
    const groupMap = new Map<MachineType, MachineGroupViewModel>()

    for (let i = 0; i < processingStore.machines.length; i++) {
      const slot = processingStore.machines[i]!
      let group = groupMap.get(slot.machineType)

      if (!group) {
        group = {
          machineType: slot.machineType,
          name: getMachineName(slot.machineType),
          slots: [],
          idleCount: 0,
          readyCount: 0,
          processingCount: 0,
          hasReady: false,
          isSeedMaker: slot.machineType === 'seed_maker',
          recipeOptions: [],
          seedRecipeOptions: [],
          recommendationOptions: [],
          isEmpty: false,
          emptyMessage: onlyAvailable.value ? '没有材料足够的配方' : '无可用配方'
        }
        groupMap.set(slot.machineType, group)
      }

      group.slots.push({ slot, originalIndex: i })

      if (!slot.recipeId) {
        group.idleCount++
      } else if (slot.ready) {
        group.readyCount++
      } else {
        group.processingCount++
      }
    }

    for (const group of groupMap.values()) {
      group.hasReady = group.readyCount > 0
      group.emptyMessage = onlyAvailable.value ? '没有材料足够的配方' : '无可用配方'

      if (group.idleCount <= 0) continue

      if (group.isSeedMaker) {
        group.seedRecipeOptions = getSeedRecipeOptions(group.machineType)
        group.isEmpty = group.seedRecipeOptions.length === 0
      } else {
        group.recipeOptions = getRecipeOptions(group.machineType)
        group.isEmpty = group.recipeOptions.length === 0
      }
      group.recommendationOptions = [...group.recipeOptions, ...group.seedRecipeOptions]
        .filter(option => option.recommendationText)
        .slice(0, 3)
    }

    return [...groupMap.values()].sort((a, b) => (machineTypeOrder.get(a.machineType) ?? 99) - (machineTypeOrder.get(b.machineType) ?? 99))
  })

  const machineGroupsByType = computed(() => new Map(machineGroupsView.value.map(group => [group.machineType, group])))

  /** 种子制造机：按品质展开配方列表 */
  const getSeedMakerQualityRecipes = (machineType: MachineType) => {
    const recipes = processingStore.getAvailableRecipes(machineType)
    const result: { recipe: (typeof recipes)[number]; quality: Quality; count: number; available: boolean }[] = []
    for (const recipe of recipes) {
      if (!recipe.inputItemId) continue
      let hasAny = false
      for (const q of QUALITY_ORDER) {
        const count = getCombinedItemCount(recipe.inputItemId, q)
        if (count > 0) {
          hasAny = true
          result.push({ recipe, quality: q, count, available: count >= recipe.inputQuantity })
        }
      }
      // 无任何品质库存时，仅在非筛选模式下显示一条（普通品质，不可用）
      if (!hasAny && !onlyAvailable.value) {
        result.push({ recipe, quality: 'normal' as Quality, count: 0, available: false })
      }
    }
    return result
  }

  // === 机器分组（相同设备排到一起，可折叠） ===

  interface MachineGroup {
    machineType: MachineType
    name: string
    slots: { slot: (typeof processingStore.machines)[number]; originalIndex: number }[]
  }

  const machineGroups = computed((): MachineGroup[] => {
    const groupMap = new Map<MachineType, MachineGroup>()
    // 按 PROCESSING_MACHINES 定义顺序作为排序基准
    const typeOrder = new Map(PROCESSING_MACHINES.map((m, i) => [m.id as MachineType, i]))
    for (let i = 0; i < processingStore.machines.length; i++) {
      const slot = processingStore.machines[i]!
      let group = groupMap.get(slot.machineType)
      if (!group) {
        group = { machineType: slot.machineType, name: getMachineName(slot.machineType), slots: [] }
        groupMap.set(slot.machineType, group)
      }
      group.slots.push({ slot, originalIndex: i })
    }
    return [...groupMap.values()].sort((a, b) => (typeOrder.get(a.machineType) ?? 99) - (typeOrder.get(b.machineType) ?? 99))
  })

  /** 折叠状态：存储已折叠的机器类型 */
  const collapsedGroups = ref(new Set<MachineType>())

  const getGroupIdleCount = (machineType: MachineType) => processingStore.machines.filter(slot => slot.machineType === machineType && !slot.recipeId).length

  const getGroupReadyCount = (machineType: MachineType) =>
    processingStore.machines.filter(slot => slot.machineType === machineType && !!slot.recipeId && slot.ready).length

  const getGroupProcessingCount = (machineType: MachineType) =>
    processingStore.machines.filter(slot => slot.machineType === machineType && !!slot.recipeId && !slot.ready).length

  const toggleGroup = (type: MachineType) => {
    if (collapsedGroups.value.has(type)) {
      collapsedGroups.value.delete(type)
    } else {
      collapsedGroups.value.add(type)
    }
  }

  /** 获取某类型机器的已有数量 */
  const getMachineCountByType = (type: MachineType): number => {
    return machineGroupsByType.value.get(type)?.slots.length ?? 0
  }

  const canProcessRecipe = (recipe: ReturnType<typeof processingStore.getAvailableRecipes>[number]) =>
    (recipe.inputItemId === null || hasCombinedItem(recipe.inputItemId, recipe.inputQuantity)) &&
    (recipe.extraInputs?.every(e => hasCombinedItem(e.itemId, e.quantity)) ?? true)

  void [getSeedMakerQualityRecipes, machineGroups, getGroupIdleCount, getGroupReadyCount, getGroupProcessingCount, canProcessRecipe]

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

  const batchProcessModal = ref<{ machineType: MachineType; recipeId: string | null; quality?: Quality } | null>(null)
  const batchQuantity = ref(1)

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
      addLog(`开始批量加工${recipe.name}${batchQualityLabel.value} ×${started}。${substitutionText ? ` ${substitutionText}。` : ''}`)
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

  // === 工坊升级 ===

  const showUpgradeModal = ref(false)
  const showUpgradeConfirm = ref(false)

  const nextUpgrade = computed(() => processingStore.getNextUpgrade())

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

  // === 制造弹窗 ===

  interface CraftableItem {
    id: string
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

  const craftModal = ref<CraftableItem | null>(null)
  const craftQuantity = ref(1)

  const maxCraftable = computed(() => {
    const item = craftModal.value
    if (!item?.batchable) return 1
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
  })

  const displayQty = computed(() => (craftModal.value?.batchable ? craftQuantity.value : 1))

  const openCraftModal = (item: CraftableItem) => {
    craftModal.value = item
    craftQuantity.value = 1
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

  const craftCategories = computed((): { label: string; items: CraftableItem[] }[] => [
    {
      label: '加工机器',
      items: PROCESSING_MACHINES.map(m => ({
        id: m.id as string,
        name: m.name,
        description: m.description,
        materials: m.craftCost,
        cost: m.craftMoney,
        onCraft: () => handleCraftMachine(m.id),
        canCraft: () => canAffordCraft(m.craftCost, m.craftMoney) && processingStore.machineCount < processingStore.maxMachines,
        badge: `已有${getMachineCountByType(m.id)}`,
        batchable: true,
        maxBatch: () => processingStore.maxMachines - processingStore.machineCount
      }))
    },
    {
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
    },
    {
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
    },
    {
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
    },
    ...(warehouseStore.unlocked
      ? [
          {
            label: '箱子',
            items: CHEST_TIER_ORDER.map(tier => {
              const def = CHEST_DEFS[tier]
              return {
                id: `chest_${tier}`,
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
          }
        ]
      : [])
  ])

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

  const getMachineName = (type: MachineType): string => {
    return PROCESSING_MACHINES.find(m => m.id === type)?.name ?? type
  }

  const getItemName = (id: string): string => {
    return getItemById(id)?.name ?? id
  }

  const getAlchemyHeatResultHint = (heat: NonNullable<ProcessingRecipeDef['alchemy']>['heat']): string => {
    if (heat === 'gentle') return '稳成丹'
    if (heat === 'strong') return '易出奇丹'
    return '均衡火候'
  }

  const getRecipeName = (recipeId: string): string => {
    return getProcessingRecipeById(recipeId)?.name ?? recipeId
  }

  const getRecipeOutputName = (recipeId: string): string => {
    const recipe = getProcessingRecipeById(recipeId)
    if (!recipe) return recipeId
    return getItemById(recipe.outputItemId)?.name ?? recipe.name
  }

  const getRecipeOutputItem = (recipeId: string): ItemDef | null => {
    const recipe = getProcessingRecipeById(recipeId)
    return recipe ? getItemById(recipe.outputItemId) ?? null : null
  }

  const getSlotOutputName = (slot: ProcessingSlot): string => {
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
    if (!playerStore.spendMoney(JADE_RING_MONEY)) return
    for (const c of JADE_RING_COST) {
      if (!removeCombinedItem(c.itemId, c.quantity)) {
        playerStore.earnMoney(JADE_RING_MONEY)
        return
      }
    }
    if (!inventoryStore.addItemExact('jade_ring')) {
      playerStore.earnMoney(JADE_RING_MONEY)
      for (const c of JADE_RING_COST) {
        inventoryStore.addItem(c.itemId, c.quantity)
      }
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

  const handleStartProcessing = (slotIndex: number, recipeId: string, quality?: Quality) => {
    const recipe = getProcessingRecipeById(recipeId)
    const substitutionText = recipe?.alchemy ? processingStore.getAlchemySubstitutionText(recipeId, 1, quality) : ''
    if (processingStore.startProcessing(slotIndex, recipeId, quality)) {
      sfxClick()
      const qualityLabel = quality && quality !== 'normal' ? `(${QUALITY_NAMES[quality]})` : ''
      addLog(`开始加工${recipe?.name ?? recipeId}${qualityLabel}，需要${recipe?.processingDays ?? '?'}天。${substitutionText ? ` ${substitutionText}。` : ''}`)
    } else {
      if (recipe?.alchemy) {
        const status = processingStore.getAlchemyDailyLimitStatus(recipeId)
        if (status?.blocked) {
          addLog(`今日${ALCHEMY_PILL_ROLE_LABELS[status.role]}炼制次数已达上限。`)
          return
        }
      }
      addLog('原料不足或机器正在使用。')
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

  .processing-option-card {
    min-width: 0;
    min-height: 58px;
    justify-content: flex-start;
    padding: 6px;
    text-align: left;
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

  .processing-option-card__copy,
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
</style>
