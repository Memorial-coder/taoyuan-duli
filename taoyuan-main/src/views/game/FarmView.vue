<template>
  <div data-testid="farm-view">
    <!-- 标签切换 -->
    <div class="flex space-x-1.5 mb-3">
      <Button
        class="flex-1 justify-center"
        :class="{ '!bg-accent !text-bg': farmTab === 'field' }"
        :icon="Sprout"
        @click="farmTab = 'field'"
      >
        田庄
      </Button>
      <Button
        class="flex-1 justify-center"
        :class="{ '!bg-accent !text-bg': farmTab === 'tree' }"
        :icon="TreeDeciduous"
        @click="farmTab = 'tree'"
      >
        林木
      </Button>
      <Button
        v-if="showGreenhouse"
        data-testid="farm-greenhouse-tab"
        class="flex-1 justify-center"
        :class="{ '!bg-accent !text-bg': showGreenhouseModal }"
        :icon="Warehouse"
        :title="greenhouseTabTitle"
        @click="showGreenhouseModal = true"
      >
        <span class="inline-flex min-w-0 items-center justify-center gap-1">
          <span>温室</span>
          <span
            v-if="ghHarvestableCount > 0"
            data-testid="farm-greenhouse-harvest-badge"
            class="rounded-xs border border-current/30 px-1 text-[0.625rem] leading-4"
          >
            可收{{ ghHarvestableCount }}
          </span>
        </span>
      </Button>
    </div>

    <!-- 田庄标签 -->
    <div v-if="farmTab === 'field'" class="space-y-3 xl:space-y-4">
      <section
        class="border border-accent/20 rounded-xs p-3 bg-panel/60"
        data-testid="farm-cohabitation-switch"
        aria-label="共同庄园切换"
      >
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0">
            <p class="text-sm text-accent">
              <Warehouse :size="14" class="inline" />
              共同庄园切换
            </p>
            <p class="text-[0.625rem] text-muted leading-4 mt-1">
              从个人田庄切到共同庄园，只读查看共同农田、协作护理和共同仓库；个人田庄批量操作继续保留在本页。
            </p>
          </div>
          <Button class="w-full justify-center sm:w-auto" :icon="Sprout" :icon-size="12" @click="goToSharedManorMap">
            查看共同农田
          </Button>
        </div>
        <div class="mt-2 flex flex-wrap gap-1 text-[0.625rem] text-muted">
          <span class="border border-accent/10 rounded-xs px-2 py-1">共同农田地图</span>
          <span class="border border-accent/10 rounded-xs px-2 py-1">仓库 / 基金边界</span>
          <span class="border border-accent/10 rounded-xs px-2 py-1">系统记录</span>
        </div>
      </section>

      <div class="mb-1 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div class="flex items-center space-x-1.5 text-sm text-accent">
          <Sprout :size="14" />
          <span>田庄 ({{ farmStore.farmSize }}×{{ farmStore.farmSize }})</span>
        </div>
        <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          <span v-if="farmStore.scarecrows > 0" class="inline-flex items-center space-x-0.5">
            <Bird :size="12" />
            <span>稻草人 {{ farmStore.scarecrows }}</span>
          </span>
          <span v-else class="text-danger/80 inline-flex items-center space-x-0.5">
            <Bird :size="12" />
            <span>无稻草人</span>
          </span>
          <span v-if="farmStore.lightningRods > 0" class="inline-flex items-center space-x-0.5">
            <Zap :size="12" />
            <span>避雷针 {{ farmStore.lightningRods }}</span>
          </span>
        </div>
      </div>

      <!-- 新手引导 -->
      <p v-if="tutorialHint" class="tutorial-hint mb-2">{{ tutorialHint }}</p>

      <!-- 批量操作入口 -->
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <Button class="w-full md:w-auto" :icon-size="12" :icon="Wrench" @click="showBatchActions = true">一键操作</Button>
      </div>

      <!-- 田庄特殊功能 -->
      <div v-if="gameStore.farmMapType === 'riverland' && gameStore.creekCatch.length > 0" class="mb-3">
        <div
          class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
          @click="handleCollectCreekCatch"
        >
          <div>
            <p class="text-xs text-accent">溪流鱼获</p>
            <p class="text-[0.625rem] text-muted">溪流中捕获了{{ gameStore.creekCatch.length }}条鱼</p>
          </div>
          <span class="text-xs text-success">收取</span>
        </div>
      </div>

      <div v-if="gameStore.farmMapType === 'hilltop' && gameStore.surfaceOrePatch" class="mb-3">
        <div
          class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
          @click="handleMineSurfaceOre"
        >
          <div>
            <p class="text-xs text-accent">地表矿脉</p>
            <p class="text-[0.625rem] text-muted">发现{{ surfaceOreName }}&times;{{ gameStore.surfaceOrePatch.quantity }}</p>
          </div>
          <span class="text-xs text-success">开采（-5体力）</span>
        </div>
      </div>

      <!-- 批量操作弹窗 -->
      <Transition name="panel-fade">
        <div
          v-if="showBatchActions"
          class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          @click.self="showBatchActions = false"
        >
          <div class="game-panel max-w-xs w-full relative">
            <button class="absolute top-2 right-2 text-muted hover:text-text" @click="showBatchActions = false">
              <X :size="14" />
            </button>
            <p class="text-accent text-sm mb-2">一键操作</p>
            <div class="flex flex-col space-y-1.5">
              <button class="btn farm-batch-action text-xs" :disabled="unwateredCount === 0" @click="doBatchAction('water')">
                <span class="farm-batch-action__label">
                  <Droplets :size="12" />
                  <span>一键浇水</span>
                </span>
                <span class="farm-batch-action__count">{{ unwateredCount }} 块</span>
              </button>
              <button class="btn farm-batch-action text-xs" :disabled="wastelandCount === 0" @click="doBatchAction('till')">
                <span class="farm-batch-action__label">
                  <Shovel :size="12" />
                  <span>一键开垦</span>
                </span>
                <span class="farm-batch-action__count">{{ wastelandCount }} 块</span>
              </button>
              <button class="btn farm-batch-action text-xs" :disabled="harvestableCount === 0" @click="doBatchAction('harvest')">
                <span class="farm-batch-action__label">
                  <Wheat :size="12" />
                  <span>一键收获</span>
                </span>
                <span class="farm-batch-action__count">{{ harvestableCount }} 块</span>
              </button>
              <button
                class="btn farm-batch-action text-xs"
                :disabled="tilledEmptyCount === 0 || (plantableSeeds.length === 0 && plantableBreedingSeeds.length === 0)"
                @click="doBatchAction('plant')"
              >
                <span class="farm-batch-action__label">
                  <Sprout :size="12" />
                  <span>一键种植</span>
                </span>
                <span class="farm-batch-action__count">{{ tilledEmptyCount }} 块</span>
              </button>
              <button
                class="btn farm-batch-action text-xs"
                :disabled="fertilizableCount === 0 || fertilizerItems.length === 0"
                @click="doBatchAction('fertilize')"
              >
                <span class="farm-batch-action__label">
                  <CirclePlus :size="12" />
                  <span>一键施肥</span>
                </span>
                <span class="farm-batch-action__count">{{ fertilizableCount }} 块</span>
              </button>
              <button class="btn farm-batch-action text-xs" :disabled="infestedCount === 0" @click="doBatchAction('curePest')">
                <span class="farm-batch-action__label">
                  <Bug :size="12" />
                  <span>一键除虫</span>
                </span>
                <span class="farm-batch-action__count">{{ infestedCount }} 块</span>
              </button>
              <button class="btn farm-batch-action text-xs" :disabled="weedyCount === 0" @click="doBatchAction('clearWeed')">
                <span class="farm-batch-action__label">
                  <Leaf :size="12" />
                  <span>一键除草</span>
                </span>
                <span class="farm-batch-action__count">{{ weedyCount }} 块</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 农场网格 -->
      <div class="border border-accent/20 rounded-xs p-2 xl:p-3">
        <div
          class="grid max-w-full gap-0.5 md:gap-1 xl:w-full xl:max-w-none"
          :style="{ gridTemplateColumns: `repeat(${farmStore.farmSize}, minmax(0, 1fr))` }"
        >
          <button
            v-for="plot in farmStore.plots"
            :key="plot.id"
            class="farm-plot rounded-xs cursor-pointer transition-colors relative leading-tight"
            :class="[
              getPlotDisplay(plot).color,
              getPlotDisplay(plot).bg,
              needsWater(plot)
                ? 'border-2 border-danger/50'
                : isSprinklerCovered(plot.id)
                  ? 'border border-water/40'
                  : 'border border-accent/15',
              plot.state === 'harvestable' ? 'hover:border-accent/60' : 'hover:border-accent/40'
            ]"
            :title="getPlotTooltip(plot)"
            @click="activePlotId = plot.id"
          >
            <div class="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center">
              <template v-if="settingsStore.farmPlotDisplayMode === 'image' && plot.cropId">
                <CropImage :crop-id="plot.cropId" :crop-name="getCropName(plot.cropId)" :plot="plot" size="tile" fallback-mode="label" />
              </template>
              <template v-else>
                <component :is="getPlotDisplay(plot).icon" :size="14" />
                <span v-if="plot.cropId" class="text-[0.625rem] opacity-60 truncate max-w-full px-0.5 mt-1">{{ getCropName(plot.cropId) }}</span>
              </template>
              <!-- 角标 -->
              <Droplets
                v-if="(plot.state === 'planted' || plot.state === 'growing') && !plot.watered"
                :size="8"
                class="absolute bottom-0 right-0 text-danger drop-shadow-sm"
              />
              <Droplet v-if="hasSprinkler(plot.id)" :size="8" class="absolute top-0 right-0 text-water drop-shadow-sm" />
              <CirclePlus v-if="plot.fertilizer" :size="8" class="absolute bottom-0 left-0 text-success drop-shadow-sm" />
              <Bug v-if="plot.infested" :size="8" class="absolute top-0 left-0 text-danger drop-shadow-sm" />
              <Leaf
                v-if="plot.weedy"
                :size="8"
                class="absolute top-0 left-0 text-success drop-shadow-sm"
                :class="{ 'left-2': plot.infested }"
              />
            </div>
          </button>
        </div>
      </div>

      <!-- 地块操作弹窗 -->
      <Transition name="panel-fade">
        <div
          v-if="activePlot"
          class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          @click.self="activePlotId = null"
        >
          <div class="game-panel max-w-xs w-full relative">
            <button class="absolute top-2 right-2 text-muted hover:text-text" @click="activePlotId = null">
              <X :size="14" />
            </button>
            <p class="text-accent text-sm mb-2">地块 #{{ activePlot.id + 1 }}</p>
            <p class="text-xs text-muted mb-2">
              {{ plotStateLabel }}
              <template v-if="activePlot.giantCropGroup !== null">（巨型）</template>
              <template v-if="activePlot.cropId">
                · {{ activePlot.giantCropGroup !== null ? '巨型' : '' }}{{ getCropName(activePlot.cropId) }}
                <span v-if="plotCropRegrowth" class="text-success">[多茬 {{ activePlot.harvestCount }}/{{ plotCropMaxHarvests }}]</span>
              </template>
              <template v-if="activePlot.cropId && activePlot.giantCropGroup === null">
                ·
                <span :class="activePlot.watered ? 'text-water' : 'text-danger'">{{ activePlot.watered ? '已浇水' : '未浇水' }}</span>
              </template>
              <template v-if="activePlot.fertilizer">
                ·
                <span class="text-success">{{ plotFertName }}</span>
              </template>
              <template v-if="hasSprinkler(activePlot.id)">
                ·
                <span class="text-water">洒水器</span>
              </template>
              <template v-if="activePlot.infested">
                ·
                <span class="text-danger">虫害({{ activePlot.infestedDays }}天)</span>
              </template>
              <template v-if="activePlot.weedy">
                ·
                <span class="text-success">杂草({{ activePlot.weedyDays }}天)</span>
              </template>
            </p>
            <!-- 生长进度条 -->
            <div v-if="activePlot.cropId && activePlot.state !== 'harvestable'" class="flex items-center space-x-2 mb-2">
              <span class="text-xs text-muted shrink-0">生长</span>
              <div class="flex-1 h-1 bg-bg rounded-xs border border-accent/10">
                <div
                  class="h-full rounded-xs bg-success transition-all"
                  :style="{ width: Math.min(100, Math.floor((activePlot.growthDays / (Number(plotCropGrowthDays) || 1)) * 100)) + '%' }"
                />
              </div>
              <span class="text-xs text-muted whitespace-nowrap">
                {{ Number(activePlot.growthDays.toFixed(2)) }}/{{ plotCropGrowthDays }}天
              </span>
            </div>
            <p v-if="activePlot.giantCropGroup !== null" class="text-xs text-accent mb-2">收获可获得大量作物！</p>
            <div v-if="activePlot.cropId" class="farm-crop-image-detail border border-accent/10 rounded-xs p-2 mb-2">
              <CropImage :crop-id="activePlot.cropId" :crop-name="getCropName(activePlot.cropId)" :plot="activePlot" size="lg" :resolution="256" />
              <div class="min-w-0">
                <p class="text-xs text-muted mb-1">作物图片</p>
                <CropImageVariantPicker :crop-id="activePlot.cropId" :crop-name="getCropName(activePlot.cropId)" :plot="activePlot" />
              </div>
            </div>

            <!-- 操作列表 -->
            <div class="farm-action-list flex flex-col space-y-1 max-h-60 overflow-y-auto overflow-x-hidden pr-1">
              <Button
                v-if="activePlot.state === 'wasteland'"
                class="w-full justify-center shrink-0"
                :icon-size="12"
                :icon="Shovel"
                @click="doTill"
              >
                开垦
              </Button>
              <Button v-if="canWater" class="w-full justify-center shrink-0" :icon-size="12" :icon="Droplets" @click="doWater">浇水</Button>
              <Button
                v-if="activePlot.infested"
                class="w-full justify-center shrink-0 !bg-danger !text-text"
                :icon-size="12"
                :icon="Bug"
                @click="doCurePest"
              >
                除虫
              </Button>
              <Button
                v-if="activePlot.weedy"
                class="w-full justify-center shrink-0 !bg-success !text-bg"
                :icon-size="12"
                :icon="Leaf"
                @click="doClearWeed"
              >
                除草
              </Button>
              <Button
                v-if="activePlot.state === 'harvestable'"
                class="w-full justify-center shrink-0 !bg-accent !text-bg"
                :icon-size="12"
                :icon="Wheat"
                @click="doHarvest"
              >
                收获
              </Button>
              <Button
                v-if="activePlot.state === 'planted' || activePlot.state === 'growing' || activePlot.state === 'harvestable'"
                class="w-full justify-center shrink-0"
                :icon-size="12"
                :icon="Trash2"
                @click="doRemoveCrop"
              >
                铲除
              </Button>
              <template v-if="activePlot.state === 'tilled' && plantableSeeds.length > 0">
                <Divider label="种植" />
                <button
                  v-for="seed in plantableSeeds"
                  :key="seed.cropId + ':' + seed.quality"
                  class="btn text-xs justify-between shrink-0 farm-seed-option"
                  @click="doPlant(seed.cropId, seed.quality)"
                >
                  <span class="farm-seed-option__main">
                    <ItemIcon :item="getSeedItem(seed.seedId)" :quality="seed.quality" size="xs" :show-badge="seed.quality !== 'normal'" />
                    <span class="farm-seed-option__label" :class="seed.colorClass">
                      {{ seed.name }}
                      <span
                        v-if="seed.quality !== 'normal'"
                        :class="{
                          'text-quality-fine': seed.quality === 'fine',
                          'text-quality-excellent': seed.quality === 'excellent',
                          'text-quality-supreme': seed.quality === 'supreme'
                        }"
                        class="ml-0.5"
                      >
                        [{{ QUALITY_NAMES[seed.quality] }}]
                      </span>
                      <span v-if="seed.regrowth" class="text-success ml-1">[多茬]</span>
                    </span>
                  </span>
                  <span class="text-muted farm-seed-option__count">×{{ seed.count }}</span>
                </button>
              </template>
              <template v-if="activePlot.state === 'tilled' && plantableBreedingSeeds.length > 0">
                <Divider label="育种种子" class="!my-2" />
                <button
                  v-for="seed in plantableBreedingSeeds"
                  :key="seed.genetics.id"
                  class="btn text-xs justify-between shrink-0 farm-seed-option"
                  @click="doPlantGeneticSeed(seed.genetics.id)"
                >
                  <span class="farm-seed-option__main">
                    <ItemIcon :item="getSeedItemForCrop(seed.genetics.cropId)" size="xs" :show-badge="false" />
                    <span class="farm-seed-option__label">{{ getCropName(seed.genetics.cropId) }} G{{ seed.genetics.generation }}</span>
                  </span>
                  <span class="text-muted flex items-center space-x-px farm-seed-option__count">
                    <Star v-for="n in getStarRating(seed.genetics)" :key="n" :size="10" />
                  </span>
                </button>
              </template>
              <!-- 种子空状态 -->
              <div
                v-if="activePlot.state === 'tilled' && plantableSeeds.length === 0 && plantableBreedingSeeds.length === 0"
                class="flex flex-col items-center py-4"
              >
                <Sprout :size="32" class="text-muted/30" />
                <p class="text-xs text-muted mt-2">背包中没有当季可种植的种子</p>
                <Button v-if="isWanwupuOpen" class="mt-2" :icon-size="12" :icon="Store" @click="goToShop">前往商店购买</Button>
                <p v-else class="text-[0.625rem] text-muted/60 mt-1">{{ wanwupuClosedReason }}</p>
              </div>
              <template v-if="canFieldFertilizerAction && activePlotFertilizerOptions.length > 0">
                <Divider :label="activePlot.fertilizer ? '替换肥料' : '施肥'" />
                <div v-if="activePlot.fertilizer" class="text-xs text-muted border border-accent/10 rounded-xs p-2">
                  当前：{{ plotFertName }}。替换后旧肥料不返还。
                </div>
                <button
                  v-for="f in activePlotFertilizerOptions"
                  :key="f.itemId"
                  class="btn w-full text-xs justify-between shrink-0"
                  @click="doFertilize(f.type)"
                >
                  <span :class="f.colorClass">{{ activePlot.fertilizer ? `替换为${f.name}` : f.name }}</span>
                  <span class="text-muted">×{{ f.count }}</span>
                </button>
              </template>
              <template v-if="!hasSprinkler(activePlot.id) && sprinklerItems.length > 0">
                <Divider label="洒水器" />
                <button
                  v-for="s in sprinklerItems"
                  :key="s.itemId"
                  class="btn w-full text-xs justify-between shrink-0"
                  @click="doPlaceSprinkler(s.type)"
                >
                  <span :class="s.colorClass">{{ s.name }}</span>
                  <span class="text-muted">×{{ s.count }}</span>
                </button>
              </template>
              <Button v-if="hasSprinkler(activePlot.id)" class="w-full justify-center shrink-0" @click="doRemoveSprinkler">拆除洒水器</Button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 一键种植弹窗 -->
      <Transition name="panel-fade">
        <div
          v-if="showBatchPlant"
          class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          @click.self="showBatchPlant = false"
        >
          <div class="game-panel max-w-xs w-full relative">
            <button class="absolute top-2 right-2 text-muted hover:text-text" @click="showBatchPlant = false">
              <X :size="14" />
            </button>
            <p class="text-accent text-sm mb-2">一键种植</p>
            <p class="text-xs text-muted mb-2">空耕地 {{ tilledEmptyCount }} 块，选择要种植的种子：</p>
            <div class="farm-action-list flex flex-col space-y-1 max-h-[60vh] overflow-y-auto overflow-x-hidden pr-1">
              <button
                v-for="seed in plantableSeeds"
                :key="seed.cropId + ':' + seed.quality"
                class="btn text-xs justify-between shrink-0 farm-seed-option"
                @click="doBatchPlant(seed.cropId, seed.quality)"
              >
                <span class="farm-seed-option__main">
                  <ItemIcon :item="getSeedItem(seed.seedId)" :quality="seed.quality" size="xs" :show-badge="seed.quality !== 'normal'" />
                  <span class="farm-seed-option__label" :class="seed.colorClass">
                    {{ seed.name }}
                    <span v-if="seed.regrowth" class="text-success ml-1">[多茬]</span>
                  </span>
                </span>
                <span class="text-muted farm-seed-option__count">×{{ seed.count }}</span>
              </button>
              <template v-if="batchBreedingSeedGroups.length > 0">
                <Divider label="育种种子" class="!my-2" />
                <button
                  v-for="group in batchBreedingSeedGroups"
                  :key="group.cropId"
                  class="btn text-xs justify-between shrink-0 farm-seed-option"
                  @click="doBatchPlantBreeding(group.cropId)"
                >
                  <span class="farm-seed-option__main">
                    <ItemIcon :item="getSeedItemForCrop(group.cropId)" size="xs" :show-badge="false" />
                    <span class="farm-seed-option__label">
                      {{ group.name }}
                      <span class="text-muted">G{{ group.minGen }}{{ group.minGen !== group.maxGen ? `~${group.maxGen}` : '' }}</span>
                    </span>
                  </span>
                  <span class="text-muted farm-seed-option__count">×{{ group.count }}</span>
                </button>
              </template>
              <div v-if="plantableSeeds.length === 0 && batchBreedingSeedGroups.length === 0" class="flex flex-col items-center py-4">
                <Sprout :size="32" class="text-muted/30" />
                <p class="text-xs text-muted mt-2">没有当季可种植的种子</p>
                <Button v-if="isWanwupuOpen" class="mt-2" :icon-size="12" :icon="Store" @click="goToShop">前往商店购买</Button>
                <p v-else class="text-[0.625rem] text-muted/60 mt-1">{{ wanwupuClosedReason }}</p>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 季末种植确认弹窗 -->
      <Transition name="panel-fade">
        <div
          v-if="plantSeasonRiskConfirm"
          class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-60 p-4"
          @click.self="cancelPlantSeasonRiskConfirm"
        >
          <div class="game-panel max-w-xs w-full relative">
            <button class="absolute top-2 right-2 text-muted hover:text-text" @click="cancelPlantSeasonRiskConfirm">
              <X :size="14" />
            </button>
            <p class="text-danger text-sm mb-2">种植提醒</p>
            <p class="text-xs text-muted leading-5">
              目前季节剩余天数不足以成熟，是否确认种植？
            </p>
            <div class="mt-3 rounded-xs border border-danger/30 bg-danger/10 p-2 text-xs leading-5">
              <div class="flex items-center justify-between gap-2">
                <span class="text-muted">作物</span>
                <span class="text-text">{{ plantSeasonRiskConfirm.cropName }}</span>
              </div>
              <div class="flex items-center justify-between gap-2">
                <span class="text-muted">成熟所需</span>
                <span class="text-danger">{{ plantSeasonRiskConfirm.requiredDays }}天</span>
              </div>
              <div class="flex items-center justify-between gap-2">
                <span class="text-muted">本季剩余</span>
                <span class="text-danger">{{ plantSeasonRiskConfirm.daysLeft }}天</span>
              </div>
            </div>
            <p v-if="plantSeasonRiskConfirm.riskyPlotCount > 1" class="mt-2 text-[0.625rem] text-muted leading-4">
              本次预计有{{ plantSeasonRiskConfirm.riskyPlotCount }}块地无法在本季成熟。
            </p>
            <div class="mt-4 flex gap-2">
              <Button class="flex-1 justify-center" @click="cancelPlantSeasonRiskConfirm">取消</Button>
              <Button class="flex-1 justify-center !bg-danger !text-text" @click="confirmPlantSeasonRisk">确认种植</Button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 一键施肥弹窗 -->
      <Transition name="panel-fade">
        <div
          v-if="showBatchFertilize"
          class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          @click.self="showBatchFertilize = false"
        >
          <div class="game-panel max-w-xs w-full relative">
            <button class="absolute top-2 right-2 text-muted hover:text-text" @click="showBatchFertilize = false">
              <X :size="14" />
            </button>
            <p class="text-accent text-sm mb-2">一键施肥</p>
            <p class="text-xs text-muted mb-2">可施肥地块 {{ fertilizableCount }} 块，选择肥料：</p>
            <div class="farm-action-list flex flex-col space-y-1 max-h-60 overflow-y-auto overflow-x-hidden pr-1">
              <button
                v-for="f in fertilizerItems"
                :key="f.itemId"
                class="btn w-full text-xs justify-between shrink-0"
                @click="doBatchFertilize(f.type)"
              >
                <span :class="f.colorClass">{{ f.name }}</span>
                <span class="text-muted">×{{ f.count }}</span>
              </button>
            </div>
            <div v-if="fertilizerItems.length === 0" class="flex flex-col items-center py-4">
              <CirclePlus :size="32" class="text-muted/30" />
              <p class="text-xs text-muted mt-2">没有可用的肥料</p>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 图例与提示 -->
      <div class="border border-accent/10 rounded-xs p-2 xl:p-3">
        <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted md:grid-cols-4 xl:grid-cols-6">
          <span v-for="(item, i) in PLOT_LEGENDS" :key="i">
            <component :is="item.icon" :size="10" :class="[item.color, 'inline']" />
            {{ item.label }}
          </span>
        </div>
        <div v-if="plotWarnings.length > 0" class="mt-1.5 flex flex-wrap gap-2 border border-accent/20 rounded-xs p-2">
          <span v-for="(w, i) in plotWarnings" :key="i" class="inline-flex items-center space-x-0.5 text-xs" :class="w.color">
            {{ w.text }}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <!-- 出货箱入口 -->
        <div
          data-testid="shipping-box-entry"
          class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
          @click="openShippingBox"
        >
          <div class="flex items-center space-x-1.5">
            <Package :size="14" class="text-accent" />
            <span class="text-sm text-accent">出货箱</span>
            <span v-if="shippingBoxEntries.length > 0" class="text-xs text-muted">{{ shippingBoxEntries.length }}种</span>
          </div>
          <span v-if="shippingBoxTotal > 0" class="text-xs text-accent">≈{{ shippingBoxTotal }}文</span>
          <span v-else class="text-xs text-muted">空</span>
        </div>
      </div>

      <!-- 出货箱弹窗 -->
      <Transition name="panel-fade">
        <div
          v-if="showShippingBox"
          class="game-modal-overlay fixed inset-0 z-50 flex items-end bg-black/60 p-0 md:items-center md:justify-center md:p-4"
          @click.self="showShippingBox = false"
        >
          <div
            class="game-panel shipping-box-modal flex h-[88dvh] max-h-[88dvh] w-full max-w-none flex-col overflow-hidden rounded-t-xs md:h-[82dvh] md:max-h-[82dvh] md:max-w-4xl md:rounded-xs"
            data-testid="shipping-box-modal"
          >
            <div class="shipping-box-modal__header flex shrink-0 items-start justify-between gap-3 border-b border-accent/10 pb-2">
              <div class="min-w-0">
                <div class="shipping-box-title-row text-accent">
                  <span class="shipping-box-title-icon">
                    <Package :size="15" />
                  </span>
                  <span class="shipping-box-title-text">出货箱</span>
                  <span v-if="shippingBoxEntries.length > 0" class="shipping-box-count-chip">{{ shippingBoxEntries.length }}种</span>
                </div>
                <p class="mt-1 text-xs text-muted">放入的物品将在次日结算，当前预计 {{ shippingBoxTotal }} 文。</p>
                <p v-if="inventoryStore.getRingEffectValue('sell_price_bonus') > 0" class="mt-1 text-xs text-success">
                  装备加成中：售价 +{{ Math.round(inventoryStore.getRingEffectValue('sell_price_bonus') * 100) }}%
                </p>
              </div>
              <button class="shipping-box-close shrink-0 text-muted hover:text-text" aria-label="关闭出货箱" @click="showShippingBox = false">
                <X :size="16" />
              </button>
            </div>

            <div class="shipping-box-layout min-h-0 flex-1 pt-3">
              <section class="shipping-box-section shipping-box-section--loaded flex min-h-0 flex-col" data-testid="shipping-box-loaded-section">
                <div class="shipping-box-section-head mb-2 flex shrink-0 items-center justify-between">
                  <p class="text-xs text-muted">已放入</p>
                  <span class="text-xs text-accent">{{ shippingBoxTotal }}文</span>
                </div>
                <div v-if="shippingBoxEntries.length > 0" class="shipping-box-scroll min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
                  <div
                    v-for="(entry, idx) in shippingBoxEntries"
                    :key="`${entry.itemId}-${entry.quality}-${idx}`"
                    class="shipping-box-loaded-card flex min-h-[52px] items-center justify-between gap-2 rounded-xs px-2 py-1.5"
                  >
                    <div class="flex min-w-0 items-center gap-2">
                      <ItemIcon :item="getItemById(entry.itemId)" size="xs" :quality="entry.quality" />
                      <div class="min-w-0">
                        <span class="block truncate text-xs" :class="qualityTextClass(entry.quality)">{{ getItemName(entry.itemId) }}</span>
                        <span class="block text-[0.625rem] text-muted">
                          {{ QUALITY_NAMES[entry.quality] }} · ×{{ entry.quantity }} · ≈{{ calculateShippingPrice(entry.itemId, entry.quantity, entry.quality) }}文
                        </span>
                      </div>
                    </div>
                    <Button class="shipping-box-return-btn shrink-0 px-2 py-1 text-xs" @click="handleRemoveFromBox(entry.itemId, entry.quantity, entry.quality)">
                      取回
                    </Button>
                  </div>
                </div>
                <div v-else class="shipping-box-empty flex flex-1 flex-col items-center justify-center text-muted">
                  <Package :size="36" class="text-muted/30" />
                  <p class="mt-2 text-xs">出货箱是空的</p>
                </div>
              </section>

              <section class="shipping-box-section shipping-box-section--inventory flex min-h-0 flex-col" data-testid="shipping-box-inventory-section">
                <div class="shipping-box-inventory-head">
                  <p class="text-xs text-muted">背包可出货</p>
                  <span class="text-[0.625rem] text-accent">{{ filteredShippableItems.length }}种可选</span>
                </div>
                <div class="shipping-box-filter-bar shrink-0">
                  <label class="shipping-box-search-field">
                    <Search :size="13" class="shipping-box-search-icon" />
                    <input
                      v-model="shippingBoxSearch"
                      data-testid="shipping-box-search"
                      class="online-input shipping-box-control shipping-box-control--search"
                      placeholder="搜索背包物品"
                    />
                  </label>
                  <label class="shipping-box-select-field">
                    <span class="shipping-box-field-label">分类</span>
                    <select
                      v-model="shippingBoxCategory"
                      data-testid="shipping-box-category"
                      class="online-select shipping-box-control"
                    >
                      <option value="all">全部分类</option>
                      <option v-for="cat in SHIPPING_FILTER_CATEGORIES" :key="cat" :value="cat">{{ SHIPPING_CATEGORY_NAMES[cat] }}</option>
                    </select>
                    <ChevronDown :size="13" class="shipping-box-select-icon" />
                  </label>
                  <label class="shipping-box-select-field">
                    <span class="shipping-box-field-label">排序</span>
                    <select
                      v-model="shippingBoxSort"
                      data-testid="shipping-box-sort"
                      class="online-select shipping-box-control"
                    >
                      <option value="price-desc">售价高到低</option>
                      <option value="quantity-desc">数量多到少</option>
                      <option value="name-asc">名称 A-Z</option>
                    </select>
                    <ChevronDown :size="13" class="shipping-box-select-icon" />
                  </label>
                </div>

                <div v-if="filteredShippableItems.length > 0" class="shipping-box-item-list mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
                  <div
                    v-for="item in filteredShippableItems"
                    :key="`${item.itemId}-${item.quality}`"
                    class="shipping-box-item-card grid min-h-[58px] items-center rounded-xs px-2 py-1.5"
                  >
                    <div class="shipping-box-item-main flex min-w-0 items-center gap-2">
                      <ItemIcon :item="item.def" size="xs" :quality="item.quality" />
                      <div class="min-w-0">
                        <span class="shipping-box-item-title block truncate text-xs" :class="qualityTextClass(item.quality)">{{ item.def?.name }}</span>
                        <span class="shipping-box-item-meta text-[0.625rem] text-muted">
                          <span>{{ SHIPPING_CATEGORY_NAMES[item.def.category] ?? item.def.category }}</span>
                          <span>{{ QUALITY_NAMES[item.quality] }}</span>
                          <span>×{{ item.quantity }}</span>
                          <span>≈{{ item.totalPrice }}文</span>
                        </span>
                      </div>
                    </div>
                    <div class="shipping-box-item-actions shrink-0">
                      <Button class="shipping-box-action-btn px-2 py-1 text-xs" data-testid="shipping-box-add-one" @click="handleAddToBox(item.itemId, 1, item.quality)">
                        放入1
                      </Button>
                      <Button
                        v-if="item.quantity > 1"
                        class="shipping-box-action-btn px-2 py-1 text-xs"
                        data-testid="shipping-box-add-five"
                        @click="handleAddToBox(item.itemId, Math.min(5, item.quantity), item.quality)"
                      >
                        放入{{ Math.min(5, item.quantity) }}
                      </Button>
                      <Button
                        v-if="item.quantity > 1"
                        class="shipping-box-action-btn px-2 py-1 text-xs"
                        data-testid="shipping-box-add-all"
                        @click="handleAddToBox(item.itemId, item.quantity, item.quality)"
                      >
                        全部
                      </Button>
                    </div>
                  </div>
                </div>
                <div v-else class="shipping-box-empty shipping-box-empty--inventory flex flex-1 flex-col items-center justify-center text-muted">
                  <Wheat :size="36" class="text-muted/30" />
                  <p class="mt-2 text-xs">没有匹配的可出货物品</p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </Transition>

    </div>

    <!-- 林木标签 -->
    <div v-if="farmTab === 'tree'">
      <!-- 野树区 -->
      <div class="border border-accent/20 rounded-xs p-3">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center space-x-1.5 text-sm text-accent">
            <TreePine :size="14" />
            <span>野树</span>
          </div>
          <span class="text-xs text-muted">{{ farmStore.wildTrees.length }}/{{ MAX_WILD_TREES }}</span>
        </div>
        <div v-if="farmStore.wildTrees.length > 0" class="flex flex-col space-y-1.5 mb-2">
          <div v-for="tree in farmStore.wildTrees" :key="tree.id" class="border border-accent/10 rounded-xs px-3 py-2">
            <!-- 第一行：树名 + 状态标签 -->
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center space-x-1.5">
                <span class="text-xs font-bold" :class="tree.mature ? 'text-accent' : 'text-muted'">{{ getWildTreeName(tree.type) }}</span>
                <span v-if="tree.chopCount > 0" class="text-[0.625rem] text-danger">伐{{ tree.chopCount }}/3</span>
              </div>
              <span v-if="!tree.mature" class="text-[0.625rem] text-muted">生长中</span>
              <span v-else-if="tree.hasTapper && tree.tapReady" class="text-[0.625rem] text-accent">可收取</span>
              <span v-else-if="tree.hasTapper" class="text-[0.625rem] text-muted">采脂中</span>
              <span v-else class="text-[0.625rem] text-success">已成熟</span>
            </div>
            <!-- 第二行：进度/详情 + 操作按钮 -->
            <template v-if="!tree.mature">
              <div class="flex items-center space-x-2 mb-1.5">
                <div class="flex-1 h-1 bg-bg rounded-xs border border-accent/10">
                  <div
                    class="h-full rounded-xs bg-success transition-all"
                    :style="{
                      width: Math.min(100, Math.floor((tree.growthDays / (getWildTreeDef(tree.type)?.growthDays ?? 28)) * 100)) + '%'
                    }"
                  />
                </div>
                <span class="text-[0.625rem] text-muted whitespace-nowrap">
                  {{ tree.growthDays }}/{{ getWildTreeDef(tree.type)?.growthDays ?? '?' }}天
                </span>
              </div>
            </template>
            <template v-else-if="tree.hasTapper">
              <div class="flex items-center space-x-2 mb-1.5">
                <div class="flex-1 h-1 bg-bg rounded-xs border border-accent/10">
                  <div
                    class="h-full rounded-xs transition-all"
                    :class="tree.tapReady ? 'bg-accent' : 'bg-success'"
                    :style="{
                      width: tree.tapReady
                        ? '100%'
                        : Math.floor((tree.tapDaysElapsed / (getWildTreeDef(tree.type)?.tapCycleDays ?? 7)) * 100) + '%'
                    }"
                  />
                </div>
                <span class="text-[0.625rem] text-muted whitespace-nowrap">
                  {{ tree.tapReady ? '已完成' : `${tree.tapDaysElapsed}/${getWildTreeDef(tree.type)?.tapCycleDays ?? '?'}天` }}
                </span>
              </div>
            </template>
            <div class="flex items-center justify-end space-x-1.5">
              <Button
                v-if="tree.mature && tree.hasTapper && tree.tapReady"
                class="!bg-accent !text-bg"
                :icon-size="12"
                :icon="Gift"
                @click.stop="handleCollectTapProduct(tree.id)"
              >
                收取
              </Button>
              <Button
                v-if="tree.mature && !tree.hasTapper && hasTapper"
                :icon-size="12"
                :icon="Wrench"
                @click.stop="handleAttachTapper(tree.id)"
              >
                装采脂器
              </Button>
              <span v-if="tree.mature && !tree.hasTapper && !hasTapper" class="text-[0.625rem] text-muted">需制造采脂器</span>
              <Button v-if="tree.mature" :icon-size="12" :icon="Axe" @click.stop="handleChopTree(tree.id)">伐木</Button>
            </div>
          </div>
        </div>
        <div v-else class="flex flex-col items-center justify-center py-4 text-muted mb-2">
          <TreePine :size="32" class="text-muted/30" />
          <p class="text-xs mt-2">暂无野树</p>
          <p class="text-[0.625rem] text-muted/60 mt-0.5">可使用野树种子种植</p>
        </div>
        <div v-if="plantableWildSeeds.length > 0 && farmStore.wildTrees.length < MAX_WILD_TREES" class="flex space-x-1.5 flex-wrap">
          <Button v-for="s in plantableWildSeeds" :key="s.type" :icon-size="12" :icon="TreePine" @click="handlePlantWildTree(s.type)">
            种{{ s.name }} (×{{ s.count }})
          </Button>
        </div>
      </div>

      <!-- 野树伐木确认弹窗 -->
      <Transition name="panel-fade">
        <div
          v-if="chopWildTreeTarget"
          class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          @click.self="chopWildTreeTarget = null"
        >
          <div class="game-panel max-w-xs w-full relative">
            <button class="absolute top-2 right-2 text-muted hover:text-text" @click="chopWildTreeTarget = null">
              <X :size="14" />
            </button>
            <p class="text-accent text-sm mb-2">伐木</p>
            <p class="text-xs text-text mb-2">
              确定要对
              <span class="text-accent">{{ getWildTreeName(chopWildTreeTarget.type) }}</span>
              伐木吗？
            </p>
            <p class="text-xs text-danger mb-3">
              已伐木 {{ chopWildTreeTarget.chopCount }}/3 次，再伐 {{ 3 - chopWildTreeTarget.chopCount }} 次后树将消失。
            </p>
            <div class="flex space-x-2">
              <Button class="flex-1" @click="chopWildTreeTarget = null">取消</Button>
              <Button
                class="flex-1"
                :class="chopWildTreeTarget.chopCount >= 2 ? '!bg-danger !text-text' : '!bg-accent !text-bg'"
                :icon-size="12"
                :icon="Axe"
                @click="confirmChopWildTree"
              >
                {{ chopWildTreeTarget.chopCount >= 2 ? '确认' : '确认伐木' }}
              </Button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 果树区 -->
      <div class="mt-3 border border-accent/20 rounded-xs p-3">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center space-x-1.5 text-sm text-accent">
            <TreeDeciduous :size="14" />
            <span>果树</span>
          </div>
          <span class="text-xs text-muted">{{ farmStore.fruitTrees.length }}/{{ MAX_FRUIT_TREES }}</span>
        </div>
        <div v-if="farmStore.fruitTrees.length > 0" class="flex flex-col space-y-1.5 mb-2">
          <div v-for="tree in farmStore.fruitTrees" :key="tree.id" class="border border-accent/10 rounded-xs px-3 py-2">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-bold" :class="tree.mature ? 'text-accent' : 'text-muted'">{{ getTreeName(tree.type) }}</span>
              <div v-if="tree.mature" class="flex items-center gap-1 text-[0.625rem]">
                <span class="text-muted">{{ tree.yearAge }}年</span>
                <span :class="qualityTextClass(getFruitTreeQuality(tree.yearAge)) || 'text-muted'">
                  {{ QUALITY_NAMES[getFruitTreeQuality(tree.yearAge)] }}
                </span>
              </div>
            </div>
            <template v-if="!tree.mature">
              <div class="flex items-center space-x-2 mb-1.5">
                <div class="flex-1 h-1 bg-bg rounded-xs border border-accent/10">
                  <div
                    class="h-full rounded-xs bg-success transition-all"
                    :style="{ width: Math.min(100, Math.floor((tree.growthDays / 28) * 100)) + '%' }"
                  />
                </div>
                <span class="text-[0.625rem] text-muted whitespace-nowrap">{{ tree.growthDays }}/28天</span>
              </div>
              <div class="flex justify-end">
                <Button :icon-size="12" :icon="Axe" @click.stop="chopFruitTreeTarget = { id: tree.id, type: tree.type, area: 'outdoor' }">砍伐</Button>
              </div>
            </template>
            <template v-else>
              <div class="flex items-center justify-between">
                <span v-if="tree.todayFruit" class="text-[0.625rem] text-accent">今日已结果 · {{ QUALITY_NAMES[getFruitTreeQuality(tree.yearAge)] }}</span>
                <span v-else class="text-[0.625rem] text-success">{{ getTreeFruitSeason(tree.type) }}产果 · {{ QUALITY_NAMES[getFruitTreeQuality(tree.yearAge)] }}</span>
                <Button :icon-size="12" :icon="Axe" @click.stop="chopFruitTreeTarget = { id: tree.id, type: tree.type, area: 'outdoor' }">砍伐</Button>
              </div>
            </template>
          </div>
        </div>
        <div v-else class="flex flex-col items-center justify-center py-4 text-muted mb-2">
          <TreeDeciduous :size="32" class="text-muted/30" />
          <p class="text-xs mt-2">暂无果树</p>
          <p class="text-[0.625rem] text-muted/60 mt-0.5">可在商店购买树苗种植</p>
        </div>
        <div v-if="plantableSaplings.length > 0 && farmStore.fruitTrees.length < MAX_FRUIT_TREES" class="flex space-x-1.5 flex-wrap">
          <Button v-for="s in plantableSaplings" :key="s.saplingId" :icon-size="12" :icon="TreePine" @click="handlePlantTree(s.type)">
            种{{ s.name }} (×{{ s.count }})
          </Button>
        </div>
      </div>
    </div>

    <!-- 温室弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showGreenhouseModal"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="showGreenhouseModal = false"
      >
        <div class="game-panel max-w-md w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="showGreenhouseModal = false">
            <X :size="14" />
          </button>
          <div class="flex items-center space-x-1.5 text-sm text-accent mb-1">
            <Warehouse :size="14" />
            <span>温室</span>
          </div>
          <p class="text-xs text-muted mb-3">无季节限制 · 自动浇水 · {{ farmStore.greenhousePlots.length }}块地 · 果树{{ ghFruitTreeCount }}/{{ GREENHOUSE_FRUIT_TREE_SLOT_COUNT }}</p>

          <!-- 操作按钮 -->
          <div class="flex flex-wrap gap-2 mb-3">
            <Button
              class="flex-1 min-w-[7.5rem] justify-center"
              :class="{ '!bg-accent !text-bg': ghHarvestableCount > 0 && inventoryStore.isToolAvailable('scythe') }"
              :disabled="ghHarvestableCount === 0 || !inventoryStore.isToolAvailable('scythe')"
              :icon-size="12"
              :icon="Wheat"
              @click="doGhBatchHarvest"
            >
              一键收获{{ ghHarvestableCount > 0 ? ` (${ghHarvestableCount}块)` : '' }}
            </Button>
            <Button
              class="flex-1 min-w-[7.5rem] justify-center"
              :disabled="ghTilledEmptyCount === 0 || (allSeeds.length === 0 && ghBatchBreedingSeedGroups.length === 0)"
              :icon-size="12"
              :icon="Sprout"
              @click="showGhBatchPlant = true"
            >
              一键种植{{ ghTilledEmptyCount > 0 ? ` (${ghTilledEmptyCount}块)` : '' }}
            </Button>
            <Button
              class="flex-1 min-w-[7.5rem] justify-center"
              :disabled="ghFertilizableCount === 0 || fertilizerItems.length === 0"
              :icon-size="12"
              :icon="CirclePlus"
              @click="showGhBatchFertilize = true"
            >
              一键施肥{{ ghFertilizableCount > 0 ? ` (${ghFertilizableCount}块)` : '' }}
            </Button>
            <Button v-if="nextGhUpgrade" class="flex-1 min-w-[7.5rem] justify-center" :icon-size="12" :icon="ArrowUp" @click="showGhUpgradeModal = true">
              升级温室
            </Button>
          </div>

          <!-- 温室果树位 -->
          <div class="border border-accent/10 rounded-xs p-2 mb-3">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center space-x-1.5 text-xs text-accent">
                <TreeDeciduous :size="12" />
                <span>果树位</span>
              </div>
              <span class="text-[0.625rem] text-muted">{{ ghFruitTreeCount }}/{{ GREENHOUSE_FRUIT_TREE_SLOT_COUNT }}</span>
            </div>
            <div class="grid grid-cols-4 gap-1">
              <button
                v-for="slot in greenhouseFruitTreeSlots"
                :key="slot.slotId"
                class="min-h-[4.25rem] rounded-xs border border-accent/20 px-1.5 py-1 text-left text-[0.625rem] transition-colors hover:border-accent/60 hover:bg-panel/80"
                :class="slot.tree ? 'bg-success/5' : 'bg-bg/50 text-muted'"
                @click="slot.tree ? (chopFruitTreeTarget = { id: slot.tree.id, type: slot.tree.type, area: 'greenhouse' }) : (activeGreenhouseFruitTreeSlotId = slot.slotId)"
              >
                <template v-if="slot.tree">
                  <div class="flex items-center justify-between gap-1">
                    <span class="truncate font-bold" :class="slot.tree.mature ? 'text-accent' : 'text-muted'">{{ getTreeName(slot.tree.type) }}</span>
                    <Axe :size="10" class="shrink-0 text-muted" />
                  </div>
                  <div v-if="!slot.tree.mature" class="mt-1 flex items-center gap-1">
                    <div class="h-1 flex-1 rounded-xs border border-accent/10 bg-bg">
                      <div class="h-full rounded-xs bg-success transition-all" :style="{ width: getTreeGrowthProgress(slot.tree) + '%' }" />
                    </div>
                    <span class="shrink-0 text-muted">{{ slot.tree.growthDays }}/28</span>
                  </div>
                  <p v-else-if="slot.tree.todayFruit" class="mt-1 text-accent">今日已结果</p>
                  <p v-else class="mt-1 text-success">全年结果</p>
                  <p
                    v-if="slot.tree.mature"
                    class="mt-0.5"
                    :class="qualityTextClass(getFruitTreeQuality(slot.tree.yearAge)) || 'text-muted'"
                  >
                    {{ slot.tree.yearAge }}年 · {{ QUALITY_NAMES[getFruitTreeQuality(slot.tree.yearAge)] }}
                  </p>
                </template>
                <template v-else>
                  <div class="flex h-full min-h-[3rem] flex-col items-center justify-center text-center">
                    <TreePine :size="16" class="text-muted/40" />
                    <span class="mt-1">空位 #{{ slot.slotId + 1 }}</span>
                  </div>
                </template>
              </button>
            </div>
          </div>

          <!-- 温室地块网格 -->
          <div class="grid gap-1 max-w-full" :style="{ gridTemplateColumns: `repeat(${ghGridCols}, minmax(0, 1fr))` }">
            <button
              v-for="plot in farmStore.greenhousePlots"
              :key="plot.id"
              class="greenhouse-plot relative aspect-square border border-accent/20 rounded-xs flex flex-col items-center justify-center cursor-pointer transition-colors hover:border-accent/60 hover:bg-panel/80 leading-tight"
              :class="getPlotDisplay(plot).color"
              :title="getPlotTooltip(plot)"
              @click="openGhPlot(plot.id)"
            >
              <template v-if="settingsStore.farmPlotDisplayMode === 'image' && plot.cropId">
                <CropImage :crop-id="plot.cropId" :crop-name="getCropName(plot.cropId)" :plot="plot" size="tile" fallback-mode="label" />
              </template>
              <template v-else>
                <component :is="getPlotDisplay(plot).icon" :size="14" />
                <span v-if="plot.cropId" class="text-[0.625rem] opacity-70 truncate max-w-full px-0.5">{{ getCropName(plot.cropId) }}</span>
              </template>
              <CirclePlus v-if="plot.fertilizer" :size="8" class="absolute bottom-0 left-0 text-success drop-shadow-sm" />
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 温室果树种植弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="activeGreenhouseFruitTreeSlotId !== null"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="activeGreenhouseFruitTreeSlotId = null"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="activeGreenhouseFruitTreeSlotId = null">
            <X :size="14" />
          </button>
          <p class="text-accent text-sm mb-2">温室果树位 #{{ activeGreenhouseFruitTreeSlotId + 1 }}</p>
          <p class="text-xs text-muted mb-2">温室果树成熟后全年结果，选择一株树苗种下：</p>
          <div v-if="plantableSaplings.length > 0" class="flex flex-col space-y-1">
            <button
              v-for="s in plantableSaplings"
              :key="s.saplingId"
              class="btn text-xs justify-between"
              @click="handlePlantGreenhouseTree(activeGreenhouseFruitTreeSlotId, s.type)"
            >
              <span class="flex items-center gap-1">
                <TreePine :size="12" />
                <span>{{ s.name }}</span>
              </span>
              <span class="text-muted">×{{ s.count }}</span>
            </button>
          </div>
          <div v-else class="flex flex-col items-center py-4">
            <TreePine :size="32" class="text-muted/30" />
            <p class="text-xs text-muted mt-2">背包中没有树苗</p>
            <Button v-if="isWanwupuOpen" class="mt-2" :icon-size="12" :icon="Store" @click="goToShop">前往商店购买</Button>
            <p v-else class="text-[0.625rem] text-muted/60 mt-1">{{ wanwupuClosedReason }}</p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 温室升级确认弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showGhUpgradeModal && nextGhUpgrade"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="showGhUpgradeModal = false"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="showGhUpgradeModal = false">
            <X :size="14" />
          </button>
          <p class="text-accent text-sm mb-2">{{ nextGhUpgrade.name }}</p>
          <p class="text-xs text-muted mb-3">{{ nextGhUpgrade.description }}</p>

          <div class="border border-accent/10 rounded-xs p-2 mb-3">
            <div class="flex items-center justify-between text-xs mb-1">
              <span class="text-muted">费用</span>
              <span :class="playerStore.money >= nextGhUpgrade.cost ? 'text-success' : 'text-danger'">{{ nextGhUpgrade.cost }}文</span>
            </div>
            <div v-for="mat in nextGhUpgrade.materialCost" :key="mat.itemId" class="flex items-center justify-between gap-2 text-xs">
              <span class="flex min-w-0 items-center gap-1.5 text-muted">
                <ItemIcon :item="getItemById(mat.itemId)" size="xs" :show-badge="false" />
                <span class="truncate">{{ getItemName(mat.itemId) }}</span>
              </span>
              <span :class="getCombinedItemCount(mat.itemId) >= mat.quantity ? 'text-success' : 'text-danger'">
                {{ getCombinedItemCount(mat.itemId) }}/{{ mat.quantity }}
              </span>
            </div>
          </div>

          <div class="flex space-x-2">
            <Button class="flex-1" @click="showGhUpgradeModal = false">取消</Button>
            <Button class="flex-1 !bg-accent !text-bg" :icon-size="12" :icon="ArrowUp" @click="handleGhUpgrade">确认升级</Button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 温室一键种植弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showGhBatchPlant"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="showGhBatchPlant = false"
      >
        <div class="game-panel max-w-sm w-full relative max-h-[88dvh] flex flex-col">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="showGhBatchPlant = false">
            <X :size="14" />
          </button>
          <div class="shrink-0">
            <p class="text-accent text-sm mb-2">温室一键种植</p>
            <p class="text-xs text-muted mb-2">空耕地 {{ ghTilledEmptyCount }} 块，选择要种植的种子：</p>
            <div v-if="allSeeds.length > 0 || ghBatchBreedingSeedGroups.length > 0" class="space-y-2 mb-2">
              <div class="relative">
                <Search :size="12" class="absolute left-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  v-model="ghBatchSeedSearch"
                  class="online-input w-full rounded-xs border border-accent/20 bg-bg/70 py-1.5 pl-7 pr-2 text-xs outline-none focus:border-accent"
                  placeholder="搜索作物或种子"
                />
              </div>
              <div class="grid grid-cols-3 gap-1">
                <button
                  v-for="option in greenhouseSeedFilterOptions"
                  :key="'batch-' + option.value"
                  class="btn text-xs justify-center !px-2 !py-1"
                  :class="{ '!bg-accent !text-bg': ghBatchSeedKindFilter === option.value }"
                  @click="ghBatchSeedKindFilter = option.value"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
          </div>
          <div
            data-testid="greenhouse-batch-seed-scroll"
            class="farm-action-list flex-1 min-h-0 space-y-2 overflow-y-auto overflow-x-hidden pr-1"
          >
            <template v-if="visibleGhBatchSeedGroups.length > 0">
              <Divider label="普通种子" class="!my-2" />
              <div
                v-for="group in visibleGhBatchSeedGroups"
                :key="'batch-seed-group:' + group.cropId"
                class="farm-seed-group"
              >
                <div class="farm-seed-group__head">
                  <span class="farm-seed-option__main">
                    <ItemIcon :item="getSeedItem(group.seedId)" size="xs" :show-badge="false" />
                    <span class="farm-seed-option__label" :class="group.colorClass">
                      {{ group.name }}
                      <span v-if="group.regrowth" class="text-success ml-1">[多茬]</span>
                    </span>
                  </span>
                  <span class="text-muted farm-seed-option__count">×{{ group.totalCount }}</span>
                </div>
                <div class="farm-seed-quality-options" data-testid="greenhouse-seed-quality-options">
                  <button
                    v-for="seed in group.seeds"
                    :key="seed.cropId + ':' + seed.quality"
                    class="btn text-xs farm-seed-quality-button"
                    @click="doGhBatchPlant(seed.cropId, seed.quality)"
                  >
                    <ItemIcon :item="getSeedItem(seed.seedId)" :quality="seed.quality" size="xs" :show-badge="seed.quality !== 'normal'" />
                    <span :class="qualityTextClass(seed.quality) || group.colorClass">{{ QUALITY_NAMES[seed.quality] }}</span>
                    <span class="text-muted">×{{ seed.count }}</span>
                  </button>
                </div>
              </div>
            </template>
            <template v-if="visibleGhBatchBreedingSeedGroups.length > 0">
              <Divider label="育种种子" class="!my-2" />
              <button
                v-for="group in visibleGhBatchBreedingSeedGroups"
                :key="group.cropId"
                class="btn text-xs justify-between shrink-0 farm-seed-option"
                data-testid="greenhouse-batch-breeding-seed-group"
                @click="doGhBatchPlantBreeding(group.cropId)"
              >
                <span class="farm-seed-option__main">
                  <ItemIcon :item="getSeedItemForCrop(group.cropId)" size="xs" :show-badge="false" />
                  <span class="farm-seed-option__label">
                    {{ group.name }}
                    <span class="text-muted">G{{ group.minGen }}{{ group.minGen !== group.maxGen ? `~${group.maxGen}` : '' }}</span>
                    <span class="text-accent ml-1">{{ group.bestStars }}★</span>
                  </span>
                </span>
                <span class="text-muted farm-seed-option__count">×{{ group.count }}</span>
              </button>
            </template>
            <div v-if="greenhouseBatchSeedPickerEmpty" class="flex flex-col items-center py-4">
              <Sprout :size="32" class="text-muted/30" />
              <p class="text-xs text-muted mt-2">{{ greenhouseBatchSeedEmptyText }}</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 温室一键施肥弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showGhBatchFertilize"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="showGhBatchFertilize = false"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="showGhBatchFertilize = false">
            <X :size="14" />
          </button>
          <p class="text-accent text-sm mb-2">温室一键施肥</p>
          <p class="text-xs text-muted mb-2">可施肥地块 {{ ghFertilizableCount }} 块，选择肥料：</p>
          <div class="farm-action-list flex flex-col space-y-1 max-h-60 overflow-y-auto overflow-x-hidden pr-1">
            <button
              v-for="f in fertilizerItems"
              :key="f.itemId"
              class="btn w-full text-xs justify-between shrink-0"
              @click="doGhBatchFertilize(f.type)"
            >
              <span :class="f.colorClass">{{ f.name }}</span>
              <span class="text-muted">×{{ f.count }}</span>
            </button>
          </div>
          <div v-if="fertilizerItems.length === 0" class="flex flex-col items-center py-4">
            <CirclePlus :size="32" class="text-muted/30" />
            <p class="text-xs text-muted mt-2">没有可用的肥料</p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 温室地块操作弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="activeGhPlot"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="activeGhPlotId = null"
      >
        <div class="game-panel max-w-sm w-full relative max-h-[88dvh] flex flex-col">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="activeGhPlotId = null">
            <X :size="14" />
          </button>
          <div class="shrink-0">
            <p class="text-accent text-sm mb-2">温室地块 #{{ activeGhPlot.id + 1 }}</p>

            <div class="border border-accent/10 rounded-xs p-2 mb-2">
              <div class="flex flex-col space-y-1">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-muted">状态</span>
                  <span class="text-xs">{{ ghPlotStateLabel }}</span>
                </div>
                <div v-if="activeGhPlot.cropId" class="flex items-center justify-between">
                  <span class="text-xs text-muted">作物</span>
                  <span class="text-xs">
                    {{ getCropName(activeGhPlot.cropId) }}
                    <span v-if="ghPlotCropRegrowth" class="text-success ml-1">
                      [多茬 {{ activeGhPlot.harvestCount }}/{{ ghPlotCropMaxHarvests }}]
                    </span>
                  </span>
                </div>
                <div v-if="activeGhPlot.cropId && activeGhPlot.state !== 'harvestable'" class="flex items-center space-x-2">
                  <span class="text-xs text-muted shrink-0">生长</span>
                  <div class="flex-1 h-1 bg-bg rounded-xs border border-accent/10">
                    <div
                      class="h-full rounded-xs bg-success transition-all"
                      :style="{
                        width: Math.min(100, Math.floor((activeGhPlot.growthDays / (Number(ghPlotCropGrowthDays) || 1)) * 100)) + '%'
                      }"
                    />
                  </div>
                  <span class="text-xs text-muted whitespace-nowrap">{{ activeGhPlot.growthDays }}/{{ ghPlotCropGrowthDays }}天</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-xs text-muted">特性</span>
                  <span class="text-xs text-water">自动浇水 · 无季节限制</span>
                </div>
                <div v-if="activeGhPlot.fertilizer" class="flex items-center justify-between">
                  <span class="text-xs text-muted">肥料</span>
                  <span class="text-xs text-success">{{ ghPlotFertName }}</span>
                </div>
              </div>
            </div>
            <div v-if="activeGhPlot.cropId" class="farm-crop-image-detail border border-accent/10 rounded-xs p-2 mb-2">
              <CropImage :crop-id="activeGhPlot.cropId" :crop-name="getCropName(activeGhPlot.cropId)" :plot="activeGhPlot" size="lg" :resolution="256" />
              <div class="min-w-0">
                <p class="text-xs text-muted mb-1">作物图片</p>
                <CropImageVariantPicker :crop-id="activeGhPlot.cropId" :crop-name="getCropName(activeGhPlot.cropId)" :plot="activeGhPlot" />
              </div>
            </div>
            <div v-if="activeGhPlot.state === 'tilled' && (allSeeds.length > 0 || ghBatchBreedingSeedGroups.length > 0)" class="space-y-2 mb-2">
              <div class="relative">
                <Search :size="12" class="absolute left-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  v-model="ghSeedSearch"
                  class="online-input w-full rounded-xs border border-accent/20 bg-bg/70 py-1.5 pl-7 pr-2 text-xs outline-none focus:border-accent"
                  placeholder="搜索作物或种子"
                />
              </div>
              <div class="grid grid-cols-3 gap-1">
                <button
                  v-for="option in greenhouseSeedFilterOptions"
                  :key="'single-' + option.value"
                  class="btn text-xs justify-center !px-2 !py-1"
                  :class="{ '!bg-accent !text-bg': ghSeedKindFilter === option.value }"
                  @click="ghSeedKindFilter = option.value"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
          </div>

          <!-- 操作区 -->
          <div
            data-testid="greenhouse-single-seed-scroll"
            class="flex-1 min-h-0 space-y-1.5 overflow-y-auto overflow-x-hidden pr-1"
          >
            <!-- 已耕 → 种植（所有种子） -->
            <template v-if="activeGhPlot.state === 'tilled'">
              <div
                v-if="visibleGhSeedGroups.length > 0"
                class="border border-accent/10 rounded-xs p-2"
              >
                <p class="text-xs text-muted mb-1">普通种子</p>
                <div class="space-y-1.5">
                  <div
                    v-for="group in visibleGhSeedGroups"
                    :key="'single-seed-group:' + group.cropId"
                    class="farm-seed-group"
                  >
                    <div class="farm-seed-group__head">
                      <span class="farm-seed-option__main">
                        <ItemIcon :item="getSeedItem(group.seedId)" size="xs" :show-badge="false" />
                        <span class="farm-seed-option__label" :class="group.colorClass">
                          {{ group.name }}
                          <span v-if="group.regrowth" class="text-success ml-1">[多茬]</span>
                        </span>
                      </span>
                      <span class="text-muted farm-seed-option__count">×{{ group.totalCount }}</span>
                    </div>
                    <div class="farm-seed-quality-options" data-testid="greenhouse-seed-quality-options">
                      <button
                        v-for="seed in group.seeds"
                        :key="seed.cropId + ':' + seed.quality"
                        class="btn text-xs farm-seed-quality-button"
                        @click="doGhPlant(seed.cropId, seed.quality)"
                      >
                        <ItemIcon :item="getSeedItem(seed.seedId)" :quality="seed.quality" size="xs" :show-badge="seed.quality !== 'normal'" />
                        <span :class="qualityTextClass(seed.quality) || group.colorClass">{{ QUALITY_NAMES[seed.quality] }}</span>
                        <span class="text-muted">×{{ seed.count }}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <!-- 已耕 → 育种种子 -->
              <div
                v-if="visibleGhBreedingSeedGroups.length > 0"
                class="border border-accent/10 rounded-xs p-2"
                data-testid="greenhouse-breeding-seed-groups"
              >
                <p class="text-xs text-muted mb-1">育种种子</p>
                <div class="space-y-1.5">
                  <div
                    v-for="group in visibleGhBreedingSeedGroups"
                    :key="group.cropId"
                    class="farm-seed-group"
                  >
                    <button
                      class="btn text-xs justify-between shrink-0 farm-seed-option"
                      @click="toggleGhBreedingGroup(group.cropId)"
                    >
                      <span class="farm-seed-option__main">
                        <component :is="isGhBreedingGroupExpanded(group.cropId) ? ChevronDown : ChevronRight" :size="12" class="shrink-0 text-muted" />
                        <ItemIcon :item="getSeedItemForCrop(group.cropId)" size="xs" :show-badge="false" />
                        <span class="farm-seed-option__label">
                          {{ group.name }}
                          <span class="text-muted">G{{ group.minGen }}{{ group.minGen !== group.maxGen ? `~${group.maxGen}` : '' }}</span>
                          <span class="text-accent ml-1">{{ group.bestStars }}★</span>
                        </span>
                      </span>
                      <span class="text-muted farm-seed-option__count">×{{ group.count }}</span>
                    </button>
                    <div
                      v-if="isGhBreedingGroupExpanded(group.cropId)"
                      class="farm-breeding-seed-options"
                      data-testid="greenhouse-breeding-seed-options"
                    >
                      <button
                        v-for="seed in group.seeds"
                        :key="seed.genetics.id"
                        class="btn text-xs justify-between shrink-0 farm-seed-option"
                        @click="doGhPlantGeneticSeed(seed.genetics.id)"
                      >
                        <span class="farm-seed-option__main">
                          <ItemIcon :item="getSeedItemForCrop(seed.genetics.cropId)" size="xs" :show-badge="false" />
                          <span class="farm-seed-option__label">{{ getCropName(seed.genetics.cropId) }} G{{ seed.genetics.generation }}</span>
                        </span>
                        <span class="text-muted farm-seed-option__count">{{ getBreedingSeedSummary(seed.genetics) }}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <!-- 已耕无种子空状态 -->
              <div v-if="greenhouseSeedPickerEmpty" class="flex flex-col items-center py-4">
                <Sprout :size="32" class="text-muted/30" />
                <p class="text-xs text-muted mt-2">{{ greenhouseSeedEmptyText }}</p>
                <Button v-if="isWanwupuOpen && allSeeds.length === 0 && ghBatchBreedingSeedGroups.length === 0" class="mt-2" :icon-size="12" :icon="Store" @click="goToShop">前往商店购买</Button>
                <p v-else-if="allSeeds.length === 0 && ghBatchBreedingSeedGroups.length === 0" class="text-[0.625rem] text-muted/60 mt-1">{{ wanwupuClosedReason }}</p>
              </div>
            </template>

            <div v-if="canGhFertilizerAction && activeGhPlotFertilizerOptions.length > 0" class="border border-accent/10 rounded-xs p-2">
              <p class="text-xs text-muted mb-1">{{ activeGhPlot.fertilizer ? '替换肥料' : '施肥' }}</p>
              <p v-if="activeGhPlot.fertilizer" class="text-[0.625rem] text-muted mb-1">当前：{{ ghPlotFertName }}。替换后旧肥料不返还。</p>
              <div class="flex flex-wrap gap-1">
                <button
                  v-for="f in activeGhPlotFertilizerOptions"
                  :key="f.itemId"
                  class="btn text-xs farm-seed-chip"
                  @click="doGhFertilize(f.type)"
                >
                  <CirclePlus :size="10" />
                  <span class="farm-seed-chip__label" :class="f.colorClass">{{ activeGhPlot.fertilizer ? `替换为${f.name}` : f.name }}</span>
                  <span class="text-muted">(×{{ f.count }})</span>
                </button>
              </div>
            </div>

            <!-- 可收获 → 收获 -->
            <Button
              v-if="activeGhPlot.state === 'harvestable'"
              class="w-full justify-center !bg-accent !text-bg"
              :icon-size="12"
              :icon="Wheat"
              @click="doGhHarvest"
            >
              收获
            </Button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 砍伐果树确认弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="chopFruitTreeTarget"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4"
        @click.self="chopFruitTreeTarget = null"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="chopFruitTreeTarget = null">
            <X :size="14" />
          </button>
          <p class="text-accent text-sm mb-2">砍伐果树</p>
          <p class="text-xs text-text mb-3">
            确定要砍掉
            <span v-if="chopFruitTreeTarget.area === 'greenhouse'">温室中的</span>
            <span class="text-accent">{{ getTreeName(chopFruitTreeTarget.type) }}</span>
            吗？砍伐后不可恢复。
          </p>
          <div class="flex space-x-2">
            <Button class="flex-1" @click="chopFruitTreeTarget = null">取消</Button>
            <Button class="flex-1 !bg-danger !text-text" :icon-size="12" :icon="Axe" @click="confirmChopFruitTree">确认砍伐</Button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, shallowRef, type Component } from 'vue'
  import { useRouter } from 'vue-router'
  import {
    Droplets,
    Droplet,
    TreePine,
    TreeDeciduous,
    ArrowUp,
    Wrench,
    Gift,
    CirclePlus,
    X,
    Shovel,
    Wheat,
    Sprout,
    Package,
    Warehouse,
    Store,
    Axe,
    Trash2,
    Bug,
    Leaf,
    Star,
    Bird,
    Zap,
    Square,
    Flower2,
    Search,
    ChevronDown,
    ChevronRight
  } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import CropImage from '@/components/game/CropImage.vue'
  import CropImageVariantPicker from '@/components/game/CropImageVariantPicker.vue'
  import ItemIcon from '@/components/game/ItemIcon.vue'
  import Divider from '@/components/game/Divider.vue'
  import { useBreedingStore } from '@/stores/useBreedingStore'
  import { useCookingStore } from '@/stores/useCookingStore'
  import { useFarmStore } from '@/stores/useFarmStore'
  import { useGameStore, SEASON_NAMES } from '@/stores/useGameStore'
  import { useGoalStore } from '@/stores/useGoalStore'
  import { useHiddenNpcStore } from '@/stores/useHiddenNpcStore'
  import { useHomeStore } from '@/stores/useHomeStore'
  import { useInventoryStore } from '@/stores/useInventoryStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import { useSecretNoteStore } from '@/stores/useSecretNoteStore'
  import { useSettingsStore } from '@/stores/useSettingsStore'
  import { useSkillStore } from '@/stores/useSkillStore'
  import { useTutorialStore } from '@/stores/useTutorialStore'
  import { useWalletStore } from '@/stores/useWalletStore'
  import { getCropById, getCropsBySeason, getItemById } from '@/data'
  import { getStarRating } from '@/data/breeding'
  import { FRUIT_TREE_DEFS, MAX_FRUIT_TREES, GREENHOUSE_FRUIT_TREE_SLOT_COUNT } from '@/data/fruitTrees'
  import { GREENHOUSE_UPGRADES } from '@/data/buildings'
  import { WILD_TREE_DEFS, MAX_WILD_TREES, getWildTreeDef } from '@/data/wildTrees'
  import { CROPS } from '@/data/crops'
  import { FERTILIZERS, getFertilizerById } from '@/data/processing'
  import { ACTION_TIME_COSTS } from '@/data/timeConstants'
  import { addLog, showFloat } from '@/composables/useGameLog'
  import { getCombinedItemCount, removeCombinedItems } from '@/composables/useCombinedInventory'
  import { navigateToPanel } from '@/composables/useNavigation'
  import { handleEndDay } from '@/composables/useEndDayLazy'
  import { harvestFarmPlotWithRewards, harvestGreenhousePlotWithRewards } from '@/composables/useFarmHarvest'
  import { getShopById, isShopAvailable, getShopClosedReason } from '@/data/shops'
  import { getCropEffectiveGrowthDays, getPlotEffectiveGrowthDays } from '@/utils/farmGrowth'
  import {
    handlePlotClick,
    useFarmActions,
    handleBatchWater,
    handleBatchTill,
    handleBatchHarvest,
    handleBatchPlant,
    handleBatchFertilize,
    handleRemoveCrop,
    handleCurePest,
    handleBatchCurePest,
    handleClearWeed,
    handleBatchClearWeed,
    getFarmingActionStaminaCost,
    getFarmingStaminaCostLabel,
    QUALITY_NAMES
  } from '@/composables/useFarmActions'
  import type { SprinklerType, FertilizerType, FruitTreeType, WildTreeType, Quality, ItemCategory, ItemDef, BreedingSeed, SeedGenetics } from '@/types'
  import { sfxHarvest, sfxPlant } from '@/composables/useAudio'
  import { scrollByViewport, useKeyboardShortcutTabActions } from '@/composables/useKeyboardShortcutContextActions'

  const router = useRouter()
  const { selectedSeed } = useFarmActions()

  const farmTab = ref<'field' | 'tree'>('field')

  const goToSharedManorMap = () => {
    void router.push({ name: 'online-cohabitation', query: { tab: 'map' } })
  }

  const farmStore = useFarmStore()
  const inventoryStore = useInventoryStore()
  const gameStore = useGameStore()
  const goalStore = useGoalStore()
  const hiddenNpcStore = useHiddenNpcStore()
  const homeStore = useHomeStore()
  const playerStore = usePlayerStore()
  type FarmShopStore = ReturnType<(typeof import('@/stores/useShopStore'))['useShopStore']>
  const shopStore = shallowRef<FarmShopStore | null>(null)
  let shopStorePromise: Promise<FarmShopStore> | null = null

  const getShopStore = async () => {
    if (shopStore.value) return shopStore.value
    shopStorePromise ??= import('@/stores/useShopStore').then(module => module.useShopStore())
    shopStore.value = await shopStorePromise
    return shopStore.value
  }

  const openShippingBox = () => {
    showShippingBox.value = true
    void getShopStore()
  }
  const breedingStore = useBreedingStore()
  const settingsStore = useSettingsStore()
  const walletStore = useWalletStore()

  onMounted(() => {
    farmStore.reconcileMatureCrops(inventoryStore.getRingEffectValue('crop_growth_bonus'))
  })

  // === 田庄特殊功能 ===

  const tutorialStore = useTutorialStore()
  const tutorialHint = computed(() => {
    if (!tutorialStore.enabled || gameStore.year > 1) return null
    if (farmStore.plots.every(p => p.state === 'wasteland')) return '点击下方「一键操作」→「一键开垦」来开垦荒地，或直接点击地块逐一操作。'
    const hasPlanted = farmStore.plots.some(p => p.state === 'planted' || p.state === 'growing' || p.state === 'harvestable')
    if (!hasPlanted && farmStore.plots.some(p => p.state === 'tilled'))
      return '已开垦的地块可以种植作物。使用「一键种植」可批量播种背包中的种子。'
    if (farmStore.plots.some(p => (p.state === 'planted' || p.state === 'growing') && !p.watered) && !gameStore.isRainy)
      return '作物需要每天浇水才会生长。「一键浇水」可一次浇完所有作物。'
    if (farmStore.plots.some(p => p.state === 'harvestable')) return '金色高亮的地块表示作物已成熟，点击「一键收获」即可批量收获。'
    return null
  })

  const surfaceOreName = computed(() => {
    const patch = gameStore.surfaceOrePatch
    if (!patch) return ''
    return getItemById(patch.oreId)?.name ?? '矿石'
  })

  const handleCollectCreekCatch = () => {
    const catches = gameStore.creekCatch
    if (catches.length === 0) return
    const names: string[] = []
    const failed: typeof catches = []
    for (const c of catches) {
      const added = inventoryStore.addItem(c.fishId, 1, c.quality)
      if (added) {
        const fishDef = getItemById(c.fishId)
        if (fishDef) names.push(fishDef.name)
      } else {
        failed.push(c)
      }
    }
    gameStore.creekCatch = failed
    if (names.length > 0) {
      addLog(`收取了溪流鱼获：${names.join('、')}。`)
    }
    if (failed.length > 0) {
      addLog('背包已满，部分鱼获未能收取。')
    }
  }

  const handleMineSurfaceOre = () => {
    const patch = gameStore.surfaceOrePatch
    if (!patch) return
    if (!inventoryStore.canAddItem(patch.oreId, patch.quantity)) {
      addLog('背包已满，无法开采。')
      return
    }
    if (!playerStore.consumeStamina(5, { source: 'tool' })) {
      addLog('体力不足，无法开采。')
      return
    }
    if (!inventoryStore.addItemExact(patch.oreId, patch.quantity)) {
      playerStore.restoreStamina(5)
      addLog('背包已满，无法开采。')
      return
    }
    const oreName = getItemById(patch.oreId)?.name ?? '矿石'
    const skillStore = useSkillStore()
    skillStore.addExp('mining', 8)
    gameStore.surfaceOrePatch = null
    addLog(`开采了地表矿脉，获得了${patch.quantity}个${oreName}。(+8挖矿经验)`)
    const tr = gameStore.advanceTime(1)
    if (tr.message) addLog(tr.message)
    if (tr.passedOut) handleEndDay()
  }

  // === 出货箱 ===

  const showShippingBox = ref(false)
  const shippingBoxSearch = ref('')
  const shippingBoxCategory = ref<'all' | ItemCategory>('all')
  const shippingBoxSort = ref<'price-desc' | 'quantity-desc' | 'name-asc'>('price-desc')
  const showBatchPlant = ref(false)
  const showBatchFertilize = ref(false)
  const showBatchActions = ref(false)
  const showGreenhouseModal = ref(false)
  const showGhUpgradeModal = ref(false)
  const showGhBatchPlant = ref(false)
  const showGhBatchFertilize = ref(false)
  const ghSeedSearch = ref('')
  const ghBatchSeedSearch = ref('')
  type GreenhouseSeedFilter = 'all' | 'ordinary' | 'breeding'
  const ghSeedKindFilter = ref<GreenhouseSeedFilter>('all')
  const ghBatchSeedKindFilter = ref<GreenhouseSeedFilter>('all')
  const expandedGhBreedingCropIds = ref<Set<string>>(new Set())
  const activeGreenhouseFruitTreeSlotId = ref<number | null>(null)
  const chopFruitTreeTarget = ref<{ id: number; type: string; area: 'outdoor' | 'greenhouse' } | null>(null)
  const chopWildTreeTarget = ref<{ id: number; type: string; chopCount: number } | null>(null)

  const farmViewTabs = computed(() => ['field', 'tree'] as const)

  useKeyboardShortcutTabActions({
    tabs: farmViewTabs,
    current: farmTab,
    hasBlockingModal: () => (
      showBatchActions.value ||
      showShippingBox.value ||
      showGreenhouseModal.value ||
      activePlotId.value !== null ||
      activeGhPlotId.value !== null ||
      plantSeasonRiskConfirm.value !== null ||
      chopFruitTreeTarget.value !== null ||
      chopWildTreeTarget.value !== null
    ),
    onPageUp: () => scrollByViewport(-1),
    onPageDown: () => scrollByViewport(1)
  })

  const goToShop = () => {
    if (!isWanwupuOpen.value) {
      showFloat(wanwupuClosedReason.value, 'danger')
      return
    }
    activePlotId.value = null
    activeGhPlotId.value = null
    showBatchPlant.value = false
    showBatchFertilize.value = false
    showBatchActions.value = false
    showGreenhouseModal.value = false
    showGhBatchPlant.value = false
    showGhBatchFertilize.value = false
    activeGreenhouseFruitTreeSlotId.value = null
    navigateToPanel('shop')
  }

  const wanwupu = getShopById('wanwupu')!

  const isWanwupuOpen = computed(() => {
    return isShopAvailable(wanwupu, gameStore.day, gameStore.hour, gameStore.weather, gameStore.season)
  })

  const wanwupuClosedReason = computed(() => {
    return '万物铺' + getShopClosedReason(wanwupu, gameStore.day, gameStore.hour, gameStore.weather, gameStore.season)
  })

  const getItemName = (itemId: string): string => getItemById(itemId)?.name ?? itemId

  const SHIPPING_FILTER_CATEGORIES: ItemCategory[] = [
    'crop',
    'animal_product',
    'fish',
    'ore',
    'gem',
    'processed',
    'food',
    'fruit',
    'material',
    'misc',
    'fossil',
    'artifact',
    'bomb',
    'elixir'
  ]

  const SHIPPING_CATEGORY_NAMES: Partial<Record<ItemCategory, string>> = {
    crop: '作物',
    animal_product: '畜产品',
    fish: '鱼获',
    ore: '矿石',
    gem: '宝石',
    processed: '加工品',
    food: '料理',
    fruit: '水果',
    material: '材料',
    misc: '杂物',
    fossil: '化石',
    artifact: '古物',
    bomb: '炸弹',
    elixir: '丹药',
    gift: '礼物',
    bait: '鱼饵',
    tackle: '钓具'
  }

  const qualityTextClass = (quality: Quality): string => {
    if (quality === 'fine') return 'text-quality-fine'
    if (quality === 'excellent') return 'text-quality-excellent'
    if (quality === 'supreme') return 'text-quality-supreme'
    return ''
  }

  const getFruitTreeQuality = (yearAge: number): Quality => {
    const age = Math.max(0, Math.floor(Number(yearAge) || 0))
    if (age >= 3) return 'supreme'
    if (age >= 2) return 'excellent'
    if (age >= 1) return 'fine'
    return 'normal'
  }

  type ShippableInventoryItem = { itemId: string; quantity: number; quality: Quality; locked?: boolean; origin?: 'shop'; def: ItemDef }

  const shippableItems = computed<ShippableInventoryItem[]>(() => {
    return inventoryStore.items
      .map(inv => ({ ...inv, def: getItemById(inv.itemId) }))
      .filter(
        (item): item is ShippableInventoryItem =>
          !!item.def &&
          !item.locked &&
          item.origin !== 'shop' &&
          item.def.category !== 'seed' &&
          item.def.category !== 'machine' &&
          item.def.category !== 'sprinkler'
      )
  })

  const filteredShippableItems = computed(() => {
    const query = shippingBoxSearch.value.trim().toLocaleLowerCase()
    const category = shippingBoxCategory.value
    const items = shippableItems.value
      .filter(item => {
        if (!item.def) return false
        if (category !== 'all' && item.def.category !== category) return false
        if (!query) return true
        return item.def.name.toLocaleLowerCase().includes(query) || item.itemId.toLocaleLowerCase().includes(query)
      })
      .map(item => ({
        ...item,
        totalPrice: calculateShippingPrice(item.itemId, item.quantity, item.quality)
      }))

    return items.sort((left, right) => {
      if (shippingBoxSort.value === 'quantity-desc') return right.quantity - left.quantity || right.totalPrice - left.totalPrice
      if (shippingBoxSort.value === 'name-asc') return (left.def?.name ?? '').localeCompare(right.def?.name ?? '')
      return right.totalPrice - left.totalPrice || right.quantity - left.quantity
    })
  })

  const shippingBoxEntries = computed(() => shopStore.value?.shippingBox ?? [])
  const calculateShippingPrice = (itemId: string, quantity: number, quality: Quality) =>
    shopStore.value?.calculateSellPrice(itemId, quantity, quality) ?? 0

  const shippingBoxTotal = computed(() => {
    return shippingBoxEntries.value.reduce(
      (sum: number, entry: { itemId: string; quantity: number; quality: Quality }) =>
        sum + calculateShippingPrice(entry.itemId, entry.quantity, entry.quality),
      0
    )
  })

  const handleAddToBox = async (itemId: string, quantity: number, quality: Quality) => {
    const loadedShopStore = await getShopStore()
    if (loadedShopStore.addToShippingBox(itemId, quantity, quality)) {
      const name = getItemName(itemId)
      addLog(`将${name}×${quantity}放入了出货箱。`)
    } else if (inventoryStore.items.some(item => item.itemId === itemId && item.quality === quality && !item.locked && item.origin === 'shop')) {
      addLog('商圈购入品只能商店回购，不能放入出货箱。')
    }
  }

  const handleRemoveFromBox = async (itemId: string, quantity: number, quality: Quality) => {
    const loadedShopStore = await getShopStore()
    if (loadedShopStore.removeFromShippingBox(itemId, quantity, quality)) {
      const name = getItemName(itemId)
      addLog(`从出货箱取出了${name}×${quantity}。`)
    }
  }

  // === 地块弹窗状态 ===

  const activePlotId = ref<number | null>(null)
  const activePlot = computed(() => (activePlotId.value !== null ? (farmStore.plots.find(p => p.id === activePlotId.value) ?? null) : null))

  const activeGhPlotId = ref<number | null>(null)
  const activeGhPlot = computed(() => (activeGhPlotId.value !== null ? (farmStore.greenhousePlots[activeGhPlotId.value] ?? null) : null))

  // === 弹窗显示辅助 ===

  const STATE_LABELS: Record<string, string> = {
    wasteland: '荒地',
    tilled: '已耕',
    planted: '已种',
    growing: '生长中',
    harvestable: '可收获'
  }

  const plotStateLabel = computed(() => (activePlot.value ? (STATE_LABELS[activePlot.value.state] ?? '?') : ''))
  const ghPlotStateLabel = computed(() => (activeGhPlot.value ? (STATE_LABELS[activeGhPlot.value.state] ?? '?') : ''))

  const currentCropGrowthBonus = computed(() => {
    const spiritGrowth = gameStore.season === 'spring' ? hiddenNpcStore.getAbilityValue('tao_yao_2') / 100 : 0
    return walletStore.getCropGrowthBonus() + spiritGrowth + inventoryStore.getRingEffectValue('crop_growth_bonus')
  })

  const formatCropGrowthDays = (days: number | string): string => {
    if (typeof days !== 'number' || !Number.isFinite(days)) return String(days)
    return Number(days.toFixed(2)).toString()
  }

  const plotCropGrowthDays = computed(() => {
    if (!activePlot.value?.cropId) return '?'
    const crop = getCropById(activePlot.value.cropId)
    if (!crop) return '?'
    const fertDef = activePlot.value.fertilizer ? getFertilizerById(activePlot.value.fertilizer) : null
    const speedup = (fertDef?.growthSpeedup ?? 0) + currentCropGrowthBonus.value
    return formatCropGrowthDays(getPlotEffectiveGrowthDays(activePlot.value, crop, speedup))
  })

  const plotCropRegrowth = computed(() => {
    if (!activePlot.value?.cropId) return false
    return getCropById(activePlot.value.cropId)?.regrowth ?? false
  })

  const plotCropMaxHarvests = computed(() => {
    if (!activePlot.value?.cropId) return 0
    return getCropById(activePlot.value.cropId)?.maxHarvests ?? 0
  })

  const ghPlotCropGrowthDays = computed(() => {
    if (!activeGhPlot.value?.cropId) return '?'
    const crop = getCropById(activeGhPlot.value.cropId)
    if (!crop) return '?'
    const fertDef = activeGhPlot.value.fertilizer ? getFertilizerById(activeGhPlot.value.fertilizer) : null
    const speedup = (fertDef?.growthSpeedup ?? 0) + currentCropGrowthBonus.value
    return formatCropGrowthDays(getPlotEffectiveGrowthDays(activeGhPlot.value, crop, speedup))
  })

  const ghPlotCropRegrowth = computed(() => {
    if (!activeGhPlot.value?.cropId) return false
    return getCropById(activeGhPlot.value.cropId)?.regrowth ?? false
  })

  const ghPlotCropMaxHarvests = computed(() => {
    if (!activeGhPlot.value?.cropId) return 0
    return getCropById(activeGhPlot.value.cropId)?.maxHarvests ?? 0
  })

  const plotFertName = computed(() => {
    if (!activePlot.value?.fertilizer) return ''
    return getFertilizerById(activePlot.value.fertilizer)?.name ?? activePlot.value.fertilizer
  })

  const ghPlotFertName = computed(() => {
    if (!activeGhPlot.value?.fertilizer) return ''
    return getFertilizerById(activeGhPlot.value.fertilizer)?.name ?? activeGhPlot.value.fertilizer
  })

  const canWater = computed(() => {
    if (!activePlot.value) return false
    return (activePlot.value.state === 'planted' || activePlot.value.state === 'growing') && !activePlot.value.watered
  })

  const canFertilize = computed(() => {
    const plot = activePlot.value
    if (!plot) return false
    return plot.state !== 'wasteland' && !plot.fertilizer
  })

  const canReplaceFertilizer = computed(() => {
    const plot = activePlot.value
    if (!plot) return false
    return plot.state !== 'wasteland' && !!plot.fertilizer
  })

  const canFieldFertilizerAction = computed(() => canFertilize.value || canReplaceFertilizer.value)

  const canGhFertilize = computed(() => {
    const plot = activeGhPlot.value
    if (!plot) return false
    return plot.state !== 'wasteland' && !plot.fertilizer
  })

  const canGhReplaceFertilizer = computed(() => {
    const plot = activeGhPlot.value
    if (!plot) return false
    return plot.state !== 'wasteland' && !!plot.fertilizer
  })

  const canGhFertilizerAction = computed(() => canGhFertilize.value || canGhReplaceFertilizer.value)

  // === 背包物品列表 ===

  const sprinklerItems = computed(() => {
    const types: { type: SprinklerType; itemId: string; name: string; colorClass: string }[] = [
      { type: 'bamboo_sprinkler', itemId: 'bamboo_sprinkler', name: '竹筒洒水器', colorClass: '' },
      { type: 'copper_sprinkler', itemId: 'copper_sprinkler', name: '铜管洒水器', colorClass: 'text-quality-fine' },
      { type: 'gold_sprinkler', itemId: 'gold_sprinkler', name: '金管洒水器', colorClass: 'text-quality-supreme' }
    ]
    return types.map(s => ({ ...s, count: inventoryStore.getItemCount(s.itemId) })).filter(s => s.count > 0)
  })

  const fertilizerItems = computed(() => {
    return FERTILIZERS.map(f => ({
      type: f.id as FertilizerType,
      itemId: f.id,
      name: f.name,
      count: inventoryStore.getItemCount(f.id),
      colorClass: itemValueColor(f.shopPrice ?? 0)
    })).filter(f => f.count > 0)
  })

  const activePlotFertilizerOptions = computed(() => {
    const current = activePlot.value?.fertilizer ?? null
    return fertilizerItems.value.filter(f => f.type !== current)
  })

  const activeGhPlotFertilizerOptions = computed(() => {
    const current = activeGhPlot.value?.fertilizer ?? null
    return fertilizerItems.value.filter(f => f.type !== current)
  })

  const QUALITY_ORDER: Quality[] = ['normal', 'fine', 'excellent', 'supreme']

  const plantableSeeds = computed(() => {
    const result: {
      cropId: string
      seedId: string
      name: string
      quality: Quality
      count: number
      colorClass: string
      regrowth: boolean
      regrowthDays?: number
    }[] = []
    for (const crop of getCropsBySeason(gameStore.season)) {
      for (const q of QUALITY_ORDER) {
        const count = inventoryStore.getItemCount(crop.seedId, q)
        if (count > 0) {
          result.push({
            cropId: crop.id,
            seedId: crop.seedId,
            name: crop.name,
            quality: q,
            count,
            colorClass: cropValueColor(crop.sellPrice),
            regrowth: crop.regrowth ?? false,
            regrowthDays: crop.regrowthDays
          })
        }
      }
    }
    return result
  })

  /** 当季可种的育种种子 */
  const plantableBreedingSeeds = computed(() => {
    const season = gameStore.season
    return breedingStore.breedingBox.filter(seed => {
      const crop = getCropById(seed.genetics.cropId)
      if (!crop) return false
      return crop.season.includes(season)
    })
  })

  /** 根据作物售价返回品质颜色 */
  const cropValueColor = (sellPrice: number): string => {
    if (sellPrice >= 180) return 'text-quality-supreme'
    if (sellPrice >= 100) return 'text-quality-excellent'
    if (sellPrice >= 60) return 'text-quality-fine'
    return ''
  }

  /** 根据道具价格返回品质颜色 */
  const itemValueColor = (price: number): string => {
    if (price >= 100) return 'text-quality-supreme'
    if (price >= 75) return 'text-quality-excellent'
    if (price >= 40) return 'text-quality-fine'
    return ''
  }

  // === 地块显示 ===

  const getCropName = (cropId: string): string => {
    const crop = getCropById(cropId)
    return crop?.name ?? cropId
  }

  const getSeedItem = (seedId: string) => getItemById(seedId) ?? null

  const getSeedItemForCrop = (cropId: string) => {
    const crop = getCropById(cropId)
    return crop ? getSeedItem(crop.seedId) : null
  }

  const hasSprinkler = (plotId: number): boolean => {
    return farmStore.hasSprinklerAtPlot(plotId)
  }

  const isPlantableTilledPlot = (plot: (typeof farmStore.plots)[number]): boolean => {
    return plot.state === 'tilled'
  }

  const isFertilizablePlot = (plot: (typeof farmStore.plots)[number]): boolean => {
    return plot.state !== 'wasteland' && !plot.fertilizer
  }

  const isGreenhouseFertilizablePlot = (plot: (typeof farmStore.greenhousePlots)[number]): boolean => {
    return plot.state !== 'wasteland' && !plot.fertilizer
  }

  type OutdoorPlot = (typeof farmStore.plots)[number]
  type PlantSeasonRiskAction =
    | { type: 'single'; plotId: number; cropId: string; quality?: Quality }
    | { type: 'singleBreeding'; plotId: number; seedId: string }
    | { type: 'batch'; cropId: string; quality?: Quality }
    | { type: 'batchBreeding'; cropId: string }

  type PlantSeasonRiskConfirm = {
    cropId: string
    cropName: string
    requiredDays: number
    daysLeft: number
    riskyPlotCount: number
    action: PlantSeasonRiskAction
  }

  const OUTDOOR_SEASON_ORDER = ['spring', 'summer', 'autumn', 'winter'] as const
  const DAYS_PER_SEASON = 28
  const plantSeasonRiskConfirm = ref<PlantSeasonRiskConfirm | null>(null)
  const bypassPlantSeasonRiskConfirm = ref(false)

  const getNextOutdoorSeason = () => {
    return OUTDOOR_SEASON_ORDER[(OUTDOOR_SEASON_ORDER.indexOf(gameStore.season) + 1) % OUTDOOR_SEASON_ORDER.length]!
  }

  const getOutdoorCropMaturityDays = (cropId: string, plot: OutdoorPlot): number | null => {
    const crop = getCropById(cropId)
    if (!crop) return null
    const fertDef = plot.fertilizer ? getFertilizerById(plot.fertilizer) : null
    const speedup = (fertDef?.growthSpeedup ?? 0) + currentCropGrowthBonus.value
    return getCropEffectiveGrowthDays(crop, speedup)
  }

  const requestPlantSeasonRiskConfirm = (
    cropId: string,
    plots: OutdoorPlot[],
    action: PlantSeasonRiskAction
  ): boolean => {
    if (bypassPlantSeasonRiskConfirm.value || plots.length === 0) return false
    const crop = getCropById(cropId)
    if (!crop) return false
    if (crop.season.includes(getNextOutdoorSeason())) return false

    const daysLeft = Math.max(0, DAYS_PER_SEASON - gameStore.day)
    const riskyDays = plots
      .map(plot => getOutdoorCropMaturityDays(cropId, plot))
      .filter((days): days is number => days !== null && days > daysLeft)

    if (riskyDays.length === 0) return false

    plantSeasonRiskConfirm.value = {
      cropId,
      cropName: crop.name,
      requiredDays: Number(Math.max(...riskyDays).toFixed(2)),
      daysLeft,
      riskyPlotCount: riskyDays.length,
      action
    }
    return true
  }

  const cancelPlantSeasonRiskConfirm = () => {
    plantSeasonRiskConfirm.value = null
  }

  const confirmPlantSeasonRisk = () => {
    const pending = plantSeasonRiskConfirm.value
    if (!pending) return
    plantSeasonRiskConfirm.value = null
    bypassPlantSeasonRiskConfirm.value = true
    try {
      if (pending.action.type === 'single') {
        activePlotId.value = pending.action.plotId
        doPlant(pending.action.cropId, pending.action.quality)
      } else if (pending.action.type === 'singleBreeding') {
        activePlotId.value = pending.action.plotId
        doPlantGeneticSeed(pending.action.seedId)
      } else if (pending.action.type === 'batch') {
        doBatchPlant(pending.action.cropId, pending.action.quality)
      } else {
        doBatchPlantBreeding(pending.action.cropId)
      }
    } finally {
      bypassPlantSeasonRiskConfirm.value = false
    }
  }

  /** 洒水器覆盖范围（含放置洒水器的地块自身） */
  const sprinklerCoverage = computed(() => farmStore.getAllWateredBySprinklers())

  const isSprinklerCovered = (plotId: number): boolean => sprinklerCoverage.value.has(plotId)

  const needsWater = (plot: (typeof farmStore.plots)[number]): boolean => {
    return (plot.state === 'planted' || plot.state === 'growing') && !plot.watered && !sprinklerCoverage.value.has(plot.id)
  }

  const unwateredCount = computed(() => farmStore.plots.filter(needsWater).length)
  const wastelandCount = computed(() => farmStore.plots.filter(p => p.state === 'wasteland').length)
  const harvestableCount = computed(() => farmStore.plots.filter(p => p.state === 'harvestable').length)
  const tilledEmptyCount = computed(() => farmStore.plots.filter(isPlantableTilledPlot).length)
  const fertilizableCount = computed(() => farmStore.plots.filter(isFertilizablePlot).length)
  const infestedCount = computed(() => farmStore.plots.filter(p => p.infested).length)
  const weedyCount = computed(() => farmStore.plots.filter(p => p.weedy).length)

  const PLOT_LEGENDS: { icon: Component; color: string; label: string }[] = [
    { icon: Shovel, color: 'text-muted', label: '荒地' },
    { icon: Square, color: 'text-earth', label: '已耕' },
    { icon: Sprout, color: 'text-success/60', label: '已种' },
    { icon: Flower2, color: 'text-success', label: '生长中' },
    { icon: Droplets, color: 'text-water', label: '已浇水' },
    { icon: Wheat, color: 'text-accent', label: '可收获' },
    { icon: Star, color: 'text-accent', label: '巨型' },
    { icon: Droplet, color: 'text-water', label: '洒水器' },
    { icon: CirclePlus, color: 'text-success', label: '肥料' },
    { icon: Droplets, color: 'text-danger', label: '需浇水' },
    { icon: Bug, color: 'text-danger', label: '虫害' },
    { icon: Leaf, color: 'text-success', label: '杂草' }
  ]

  const plotWarnings = computed(() => {
    const list: { color: string; text: string }[] = []
    if (unwateredCount.value > 0) list.push({ color: 'text-danger', text: `还有${unwateredCount.value}块需浇水` })
    if (infestedCount.value > 0) list.push({ color: 'text-danger', text: `有${infestedCount.value}块虫害` })
    if (weedyCount.value > 0) list.push({ color: 'text-success', text: `有${weedyCount.value}块杂草` })
    return list
  })

  const doBatchAction = (action: 'water' | 'till' | 'harvest' | 'plant' | 'fertilize' | 'curePest' | 'clearWeed') => {
    showBatchActions.value = false
    if (action === 'water') handleBatchWater()
    else if (action === 'till') handleBatchTill()
    else if (action === 'harvest') handleBatchHarvest()
    else if (action === 'plant') showBatchPlant.value = true
    else if (action === 'fertilize') showBatchFertilize.value = true
    else if (action === 'curePest') handleBatchCurePest()
    else if (action === 'clearWeed') handleBatchClearWeed()
  }
  /** 按cropId分组的当季育种种子（用于一键种植弹窗） */
  const batchBreedingSeedGroups = computed(() => {
    const groups: Record<string, { cropId: string; name: string; count: number; minGen: number; maxGen: number }> = {}
    for (const seed of plantableBreedingSeeds.value) {
      const cid = seed.genetics.cropId
      if (!groups[cid]) {
        groups[cid] = { cropId: cid, name: getCropName(cid), count: 0, minGen: seed.genetics.generation, maxGen: seed.genetics.generation }
      }
      groups[cid]!.count++
      if (seed.genetics.generation < groups[cid]!.minGen) groups[cid]!.minGen = seed.genetics.generation
      if (seed.genetics.generation > groups[cid]!.maxGen) groups[cid]!.maxGen = seed.genetics.generation
    }
    return Object.values(groups)
  })

  const doBatchPlant = (cropId: string, quality?: Quality) => {
    const crop = getCropById(cropId)
    const targets = farmStore.plots
      .filter(isPlantableTilledPlot)
      .slice(0, crop ? inventoryStore.getItemCount(crop.seedId, quality) : 0)
    if (requestPlantSeasonRiskConfirm(cropId, targets, { type: 'batch', cropId, quality })) return
    handleBatchPlant(cropId, quality)
    showBatchPlant.value = false
  }

  const doBatchPlantBreeding = (cropId: string) => {
    if (gameStore.isPastBedtime) {
      addLog('已经凌晨2点了，你必须休息。')
      handleEndDay()
      return
    }
    if (!inventoryStore.isToolAvailable('hoe')) {
      addLog('锄头正在升级中，无法播种。')
      return
    }
    const cookingStore = useCookingStore()
    const targets = farmStore.plots.filter(isPlantableTilledPlot)
    if (targets.length === 0) {
      addLog('没有可种植的空耕地。')
      showBatchPlant.value = false
      return
    }
    const seeds = plantableBreedingSeeds.value.filter(s => s.genetics.cropId === cropId)
    if (requestPlantSeasonRiskConfirm(cropId, targets.slice(0, seeds.length), { type: 'batchBreeding', cropId })) return
    let planted = 0
    let staminaSpent = 0
    const plantRingFarmReduction = inventoryStore.getRingEffectValue('farming_stamina')
    const plantRingGlobalReduction = inventoryStore.getRingEffectValue('stamina_reduction')
    for (const plot of targets) {
      if (seeds.length === 0) break
      const seed = seeds.shift()!
      const farmingBuff = cookingStore.activeBuff?.type === 'farming' ? cookingStore.activeBuff.value / 100 : 0
      const cost = getFarmingActionStaminaCost(3, [
        inventoryStore.getToolStaminaMultiplier('hoe'),
        1 - farmingBuff,
        1 - plantRingFarmReduction,
        1 - plantRingGlobalReduction
      ])
      if (!playerStore.consumeStamina(cost, { source: 'tool' })) break
      if (farmStore.plantGeneticSeed(plot.id, seed.genetics)) {
        breedingStore.removeFromBox(seed.genetics.id)
        planted++
        staminaSpent += cost
      }
    }
    if (planted > 0) {
      addLog(`一键种植了${planted}株育种种子（${getCropName(cropId)}）。${getFarmingStaminaCostLabel(staminaSpent)}`)
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.plant * Math.min(planted, 3))
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) {
        showBatchPlant.value = false
        handleEndDay()
        return
      }
    } else {
      addLog('体力不足，无法种植。')
    }
    showBatchPlant.value = false
  }
  const doBatchFertilize = (type: FertilizerType) => {
    handleBatchFertilize(type)
    showBatchFertilize.value = false
  }

  const doRemoveCrop = () => {
    if (activePlotId.value === null) return
    handleRemoveCrop(activePlotId.value)
    activePlotId.value = null
  }

  const doCurePest = () => {
    if (activePlotId.value === null) return
    handleCurePest(activePlotId.value)
    activePlotId.value = null
  }

  const doClearWeed = () => {
    if (activePlotId.value === null) return
    handleClearWeed(activePlotId.value)
    activePlotId.value = null
  }

  const getPlotDisplay = (plot: (typeof farmStore.plots)[number]): { icon: Component; color: string; bg: string } => {
    // 虫害显示
    if (plot.infested) {
      return { icon: Bug, color: 'text-danger', bg: 'bg-danger/10' }
    }
    // 杂草显示
    if (plot.weedy) {
      return { icon: Leaf, color: 'text-success/70', bg: 'bg-success/10' }
    }
    // 巨型作物特殊显示（仅在已成熟时才显示巨型图标）
    if (plot.giantCropGroup !== null && plot.state === 'harvestable') {
      return { icon: Star, color: 'text-accent', bg: 'bg-accent/10' }
    }
    switch (plot.state) {
      case 'wasteland':
        return { icon: Shovel, color: 'text-muted', bg: 'bg-panel/40' }
      case 'tilled':
        return { icon: Square, color: 'text-earth', bg: 'bg-earth/8' }
      case 'planted':
        return {
          icon: plot.watered ? Droplets : Sprout,
          color: plot.watered ? 'text-water' : 'text-success/60',
          bg: plot.watered ? 'bg-water/8' : 'bg-success/5'
        }
      case 'growing': {
        const crop = getCropById(plot.cropId!)
        const fertDef = plot.fertilizer ? getFertilizerById(plot.fertilizer) : null
        const speedup = (fertDef?.growthSpeedup ?? 0) + currentCropGrowthBonus.value
        const effectiveDays = crop ? getPlotEffectiveGrowthDays(plot, crop, speedup) : 1
        const progress = crop ? Math.floor((plot.growthDays / effectiveDays) * 100) : 0
        return {
          icon: plot.watered ? Droplets : Leaf,
          color: plot.watered ? 'text-water' : progress > 60 ? 'text-success' : 'text-success/80',
          bg: plot.watered ? 'bg-water/8' : 'bg-success/8'
        }
      }
      case 'harvestable':
        return { icon: Wheat, color: 'text-accent', bg: 'bg-accent/15' }
      default:
        return { icon: Square, color: 'text-muted', bg: 'bg-panel/40' }
    }
  }

  const getPlotTooltip = (plot: (typeof farmStore.plots)[number]): string => {
    let tip = ''
    if (plot.state === 'wasteland') tip = '荒地（点击开垦）'
    else if (plot.state === 'tilled') tip = '已耕地（点击播种）'
    else if (plot.state === 'harvestable') {
      const crop = getCropById(plot.cropId!)
      tip = `${crop?.name ?? ''}已成熟（点击收获）`
    } else if (plot.state === 'planted' || plot.state === 'growing') {
      const crop = getCropById(plot.cropId!)
      const fertDef = plot.fertilizer ? getFertilizerById(plot.fertilizer) : null
      const speedup = (fertDef?.growthSpeedup ?? 0) + currentCropGrowthBonus.value
      const effectiveDays = crop ? formatCropGrowthDays(getPlotEffectiveGrowthDays(plot, crop, speedup)) : '?'
      tip = `${crop?.name ?? ''} ${formatCropGrowthDays(plot.growthDays)}/${effectiveDays}天 ${plot.watered ? '已浇水' : '需浇水'}`
    }
    if (hasSprinkler(plot.id)) tip += ' [洒水器]'
    if (plot.fertilizer) {
      const fertDef = getFertilizerById(plot.fertilizer)
      tip += ` [${fertDef?.name ?? plot.fertilizer}]`
    }
    if (plot.infested) tip += ` [虫害${plot.infestedDays}天]`
    if (plot.weedy) tip += ` [杂草${plot.weedyDays}天]`
    return tip
  }

  // === 弹窗操作：农场 ===

  const doTill = () => {
    if (activePlotId.value === null) return
    selectedSeed.value = null
    handlePlotClick(activePlotId.value)
    activePlotId.value = null
  }

  const doPlant = (cropId: string, quality?: Quality) => {
    if (activePlotId.value === null) return
    const plotId = activePlotId.value
    const plot = farmStore.plots.find(p => p.id === plotId)
    if (plot && requestPlantSeasonRiskConfirm(cropId, [plot], { type: 'single', plotId, cropId, quality })) return
    selectedSeed.value = { cropId, quality }
    handlePlotClick(plotId)
    selectedSeed.value = null
    activePlotId.value = null
  }

  const doPlantGeneticSeed = (seedId: string) => {
    if (activePlotId.value === null) return
    if (gameStore.isPastBedtime) {
      addLog('已经凌晨2点了，你必须休息。')
      handleEndDay()
      return
    }
    if (!inventoryStore.isToolAvailable('hoe')) {
      addLog('锄头正在升级中，无法播种。')
      return
    }
    const seed = breedingStore.breedingBox.find(s => s.genetics.id === seedId)
    if (!seed) return
    const plotId = activePlotId.value
    const plot = farmStore.plots.find(p => p.id === plotId)
    if (plot && requestPlantSeasonRiskConfirm(seed.genetics.cropId, [plot], { type: 'singleBreeding', plotId, seedId })) return
    const cookingStore = useCookingStore()
    const farmingBuff = cookingStore.activeBuff?.type === 'farming' ? cookingStore.activeBuff.value / 100 : 0
    const cropRingFarmReduction = inventoryStore.getRingEffectValue('farming_stamina')
    const cropRingGlobalReduction = inventoryStore.getRingEffectValue('stamina_reduction')
    const cost = getFarmingActionStaminaCost(3, [
      inventoryStore.getToolStaminaMultiplier('hoe'),
      1 - farmingBuff,
      1 - cropRingFarmReduction,
      1 - cropRingGlobalReduction
    ])
    if (!playerStore.consumeStamina(cost, { source: 'tool' })) {
      addLog('体力不足，无法播种。')
      return
    }
    if (farmStore.plantGeneticSeed(activePlotId.value, seed.genetics)) {
      breedingStore.removeFromBox(seedId)
      addLog(`种下了育种种子：${getCropName(seed.genetics.cropId)} G${seed.genetics.generation}。${getFarmingStaminaCostLabel(cost)}`)
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.plant)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) {
        activePlotId.value = null
        handleEndDay()
        return
      }
    } else {
      playerStore.restoreStamina(cost)
    }
    activePlotId.value = null
  }

  const doWater = () => {
    if (activePlotId.value === null) return
    selectedSeed.value = null
    handlePlotClick(activePlotId.value)
    activePlotId.value = null
  }

  const doHarvest = () => {
    if (activePlotId.value === null) return
    const result = harvestFarmPlotWithRewards(activePlotId.value)
    if (result.success) {
      sfxHarvest()
      if (result.giant) {
        addLog(`收获了巨型${result.cropName}！获得了${result.quantity}个${result.cropName}！`)
        showFloat(`巨型${result.cropName} ×${result.quantity}`, 'accent')
      } else {
        const qualityLabel = result.quality && result.quality !== 'normal' ? `(${QUALITY_NAMES[result.quality]})` : ''
        const qtyLabel = result.quantity > 1 ? `×${result.quantity}` : ''
        let msg = `收获了${result.cropName}${qtyLabel}${qualityLabel}！`
        if (result.bonusMoney > 0) msg += ` 甜度加成+${result.bonusMoney}文`
        if (result.leveledUp) msg += ` 农耕提升到${result.newLevel}级！`
        addLog(msg)
        showFloat(`+${result.cropName}${qtyLabel}${qualityLabel}`, 'success')
      }
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.harvest)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) {
        activePlotId.value = null
        handleEndDay()
        return
      }
    } else {
      addLog('背包空间不足，无法收获。')
    }
    activePlotId.value = null
  }

  const doFertilize = (type: FertilizerType) => {
    if (activePlotId.value === null) return
    const currentFertilizer = activePlot.value?.fertilizer ?? null
    if (currentFertilizer === type) {
      addLog('该地块已经施了这种肥料。')
      activePlotId.value = null
      return
    }
    if (!inventoryStore.removeItem(type)) {
      addLog('没有该肥料了。')
      return
    }
    const succeeded = currentFertilizer
      ? farmStore.replaceFertilizer(activePlotId.value, type)
      : farmStore.applyFertilizer(activePlotId.value, type)
    if (succeeded) {
      goalStore.recordWeeklyActivityCounter('farm_fertilizer_applied', 1)
      const nextFertDef = getFertilizerById(type)
      if (currentFertilizer) {
        const currentFertDef = getFertilizerById(currentFertilizer)
        addLog(`将${currentFertDef?.name ?? '原肥料'}替换为${nextFertDef?.name ?? '肥料'}，旧肥料未返还。`)
      } else {
        addLog(`施了${nextFertDef?.name ?? '肥料'}。`)
      }
    } else {
      inventoryStore.addItem(type)
      addLog(currentFertilizer ? '无法替换此地块的肥料。' : '无法在此施肥（需要已开垦且未施肥的地块）。')
    }
    activePlotId.value = null
  }

  const doPlaceSprinkler = (type: SprinklerType) => {
    if (activePlotId.value === null) return
    if (!inventoryStore.removeItem(type)) {
      addLog('没有该洒水器了。')
      return
    }
    if (farmStore.placeSprinkler(activePlotId.value, type)) {
      addLog('放置了洒水器，周围地块将自动浇水。')
    } else {
      inventoryStore.addItem(type)
      addLog('无法在此放置洒水器。')
    }
    activePlotId.value = null
  }

  const doRemoveSprinkler = () => {
    if (activePlotId.value === null) return
    const plotId = activePlotId.value
    const type = farmStore.removeSprinkler(plotId)
    if (type) {
      if (inventoryStore.addItem(type)) {
        addLog('拆除了洒水器，已回收到背包。')
      } else {
        // 背包满，放回原处
        farmStore.placeSprinkler(plotId, type)
        addLog('背包已满，无法回收洒水器。')
      }
    }
    activePlotId.value = null
  }

  // === 果树 ===

  const getTreeName = (type: string): string => {
    return FRUIT_TREE_DEFS.find(d => d.type === type)?.name ?? type
  }

  const getTreeFruitSeason = (type: string): string => {
    const def = FRUIT_TREE_DEFS.find(d => d.type === type)
    if (!def) return '?'
    return SEASON_NAMES[def.fruitSeason as keyof typeof SEASON_NAMES]
  }

  const getTreeGrowthDays = (type: string): number => {
    return FRUIT_TREE_DEFS.find(d => d.type === type)?.growthDays ?? 28
  }

  const getTreeGrowthProgress = (tree: { type: string; growthDays: number }): number => {
    return Math.min(100, Math.floor((tree.growthDays / getTreeGrowthDays(tree.type)) * 100))
  }

  const plantableSaplings = computed(() => {
    return FRUIT_TREE_DEFS.filter(d => inventoryStore.hasItem(d.saplingId)).map(d => ({
      type: d.type as FruitTreeType,
      saplingId: d.saplingId,
      name: d.name,
      count: inventoryStore.getItemCount(d.saplingId)
    }))
  })

  const ghFruitTreeCount = computed(() => farmStore.greenhouseFruitTrees.length)

  const greenhouseFruitTreeSlots = computed(() =>
    Array.from({ length: GREENHOUSE_FRUIT_TREE_SLOT_COUNT }, (_, slotId) => ({
      slotId,
      tree: farmStore.getGreenhouseFruitTreeBySlot(slotId) ?? null
    }))
  )

  const plantableWildSeeds = computed(() => {
    return WILD_TREE_DEFS.filter(d => inventoryStore.hasItem(d.seedItemId)).map(d => ({
      type: d.type as WildTreeType,
      seedItemId: d.seedItemId,
      name: d.name,
      count: inventoryStore.getItemCount(d.seedItemId)
    }))
  })

  const hasTapper = computed(() => inventoryStore.getItemCount('tapper') > 0)

  const handlePlantTree = (treeType: FruitTreeType) => {
    const def = FRUIT_TREE_DEFS.find(d => d.type === treeType)
    if (!def) return
    if (!inventoryStore.removeItem(def.saplingId)) {
      addLog('背包中没有该树苗。')
      return
    }
    if (farmStore.plantFruitTree(treeType)) {
      addLog(`种下了${def.name}苗，需28天成熟。`)
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.plantTree)
      if (tr.message) addLog(tr.message)
    } else {
      inventoryStore.addItem(def.saplingId)
      addLog(`果树位已满（最多${MAX_FRUIT_TREES}棵）。`)
    }
  }

  const handlePlantGreenhouseTree = (slotId: number | null, treeType: FruitTreeType) => {
    if (slotId === null) return
    const def = FRUIT_TREE_DEFS.find(d => d.type === treeType)
    if (!def) return
    if (!inventoryStore.removeItem(def.saplingId)) {
      addLog('背包中没有该树苗。')
      return
    }
    if (farmStore.plantGreenhouseFruitTree(slotId, treeType)) {
      addLog(`在温室边缘种下了${def.name}苗，成熟后全年结果。`)
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.plantTree)
      if (tr.message) addLog(tr.message)
    } else {
      inventoryStore.addItem(def.saplingId)
      addLog('这个温室果树位已经被占用了。')
    }
    activeGreenhouseFruitTreeSlotId.value = null
  }

  const confirmChopFruitTree = () => {
    const target = chopFruitTreeTarget.value
    if (!target) return
    chopFruitTreeTarget.value = null
    if (gameStore.isPastBedtime) {
      addLog('太晚了，没法砍伐了。')
      return
    }
    if (!inventoryStore.isToolAvailable('axe')) {
      addLog('斧头正在升级中，无法砍伐。')
      return
    }
    const skillStore = useSkillStore()
    const cost = Math.max(
      1,
      Math.floor(5 * inventoryStore.getToolStaminaMultiplier('axe') * (1 - skillStore.getStaminaReduction('foraging')))
    )
    if (!playerStore.consumeStamina(cost, { source: 'tool' })) {
      addLog('体力不足，无法砍伐。')
      return
    }
    const treeName = getTreeName(target.type)
    const isGreenhouseTree = target.area === 'greenhouse'
    const woodQty = isGreenhouseTree ? farmStore.removeGreenhouseFruitTree(target.id) : farmStore.removeFruitTree(target.id)
    if (woodQty > 0) {
      inventoryStore.addItem('wood', woodQty)
      if (Math.random() < 0.03) {
        useSecretNoteStore().tryCollectNote('tree')
      }
      addLog(`砍掉了${isGreenhouseTree ? '温室中的' : ''}${treeName}，获得${woodQty}个木材。（体力-${cost}）`)
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.chopTree)
      if (tr.message) addLog(tr.message)
    }
  }

  // === 野树 ===

  const getWildTreeName = (type: string): string => {
    return getWildTreeDef(type)?.name ?? type
  }

  const handlePlantWildTree = (treeType: WildTreeType) => {
    const def = WILD_TREE_DEFS.find(d => d.type === treeType)
    if (!def) return
    if (!inventoryStore.removeItem(def.seedItemId)) {
      addLog('背包中没有该种子。')
      return
    }
    if (farmStore.plantWildTree(treeType)) {
      addLog(`种下了${def.name}，需${def.growthDays}天成熟。`)
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.plantTree)
      if (tr.message) addLog(tr.message)
    } else {
      inventoryStore.addItem(def.seedItemId)
      addLog(`野树位已满（最多${MAX_WILD_TREES}棵）。`)
    }
  }

  const handleAttachTapper = (treeId: number) => {
    if (!inventoryStore.removeItem('tapper')) {
      addLog('背包中没有采脂器。')
      return
    }
    if (farmStore.attachTapper(treeId)) {
      addLog('安装了采脂器，将定期产出树脂。')
    } else {
      inventoryStore.addItem('tapper')
      addLog('无法安装采脂器（需要已成熟且未装采脂器的野树）。')
    }
  }

  const handleCollectTapProduct = (treeId: number) => {
    const tree = farmStore.wildTrees.find(t => t.id === treeId)
    const previewProductId = tree ? getWildTreeDef(tree.type)?.tapProduct : null
    if (!previewProductId || !inventoryStore.canAddItem(previewProductId)) {
      addLog('背包空间不足，无法收取采脂产物。')
      return
    }
    const collectedProductId = farmStore.collectTapProduct(treeId)
    if (collectedProductId) {
      inventoryStore.addItemExact(collectedProductId)
      const def = WILD_TREE_DEFS.find(d => d.tapProduct === collectedProductId)
      addLog(`收取了${def?.tapProductName ?? collectedProductId}！`)
    }
  }

  const handleChopTree = (treeId: number) => {
    const tree = farmStore.wildTrees.find(t => t.id === treeId)
    if (!tree) return
    chopWildTreeTarget.value = { id: tree.id, type: tree.type, chopCount: tree.chopCount }
  }

  const confirmChopWildTree = () => {
    const target = chopWildTreeTarget.value
    if (!target) return
    chopWildTreeTarget.value = null
    if (gameStore.isPastBedtime) {
      addLog('太晚了，没法伐木了。')
      return
    }
    if (!inventoryStore.isToolAvailable('axe')) {
      addLog('斧头正在升级中，无法伐木。')
      return
    }
    const skillStore = useSkillStore()
    const cost = Math.max(
      1,
      Math.floor(5 * inventoryStore.getToolStaminaMultiplier('axe') * (1 - skillStore.getStaminaReduction('foraging')))
    )
    if (!playerStore.consumeStamina(cost, { source: 'tool' })) {
      addLog('体力不足，无法伐木。')
      return
    }
    const baseQty = 2
    const hasLumberjack = skillStore.getSkill('foraging').perk5 === 'lumberjack' || skillStore.getSkill('foraging').perk10 === 'forester'
    const qty = baseQty + (hasLumberjack ? 2 : Math.random() < 0.5 ? 1 : 0)
    inventoryStore.addItem('wood', qty)
    const { removed } = farmStore.chopWildTree(target.id)
    const treeName = getWildTreeName(target.type)
    if (Math.random() < 0.03) {
      useSecretNoteStore().tryCollectNote('tree')
    }
    if (removed) {
      addLog(`伐木获得了${qty}个木材，${treeName}已被砍倒消失了。（体力-${cost}）`)
    } else {
      addLog(`伐木获得了${qty}个木材。（体力-${cost}）`)
    }
    const tr = gameStore.advanceTime(ACTION_TIME_COSTS.chopTree)
    if (tr.message) addLog(tr.message)
  }

  // === 温室 ===

  const showGreenhouse = computed(() => homeStore.greenhouseUnlocked)

  const ghHarvestableCount = computed(() => farmStore.greenhousePlots.filter(p => p.state === 'harvestable').length)

  const greenhouseTabTitle = computed(
    () => `温室：${farmStore.greenhousePlots.length}块地 · ${ghHarvestableCount.value}块可收获 · 果树${ghFruitTreeCount.value}/${GREENHOUSE_FRUIT_TREE_SLOT_COUNT}`
  )

  const ghTilledEmptyCount = computed(() => farmStore.greenhousePlots.filter(p => p.state === 'tilled').length)

  const ghFertilizableCount = computed(() => farmStore.greenhousePlots.filter(isGreenhouseFertilizablePlot).length)

  const ghGridCols = computed(() => {
    const upgradeDef = GREENHOUSE_UPGRADES[farmStore.greenhouseLevel - 1]
    return upgradeDef?.gridCols ?? 4
  })

  const nextGhUpgrade = computed(() => GREENHOUSE_UPGRADES[farmStore.greenhouseLevel] ?? null)

  const greenhouseSeedFilterOptions: { value: GreenhouseSeedFilter; label: string }[] = [
    { value: 'all', label: '全部' },
    { value: 'ordinary', label: '普通' },
    { value: 'breeding', label: '育种' }
  ]

  type GreenhouseSeedEntry = {
    cropId: string
    seedId: string
    name: string
    seedName: string
    quality: Quality
    count: number
    colorClass: string
    regrowth: boolean
    seasonLabel: string
  }

  type GreenhouseSeedGroup = {
    cropId: string
    seedId: string
    name: string
    seedName: string
    totalCount: number
    colorClass: string
    regrowth: boolean
    seasonLabel: string
    seeds: GreenhouseSeedEntry[]
  }

  type GreenhouseBreedingSeedGroup = {
    cropId: string
    name: string
    count: number
    minGen: number
    maxGen: number
    bestStars: number
    bestTotalStats: number
    seeds: BreedingSeed[]
  }

  const getCropSeasonLabel = (seasons: readonly string[]): string =>
    seasons.map(season => SEASON_NAMES[season as keyof typeof SEASON_NAMES] ?? season).join('/')

  const getBreedingTotalStats = (genetics: SeedGenetics): number =>
    genetics.sweetness + genetics.yield + genetics.resistance

  const sortBreedingSeedsForPlanting = (left: BreedingSeed, right: BreedingSeed): number => {
    const leftStars = getStarRating(left.genetics)
    const rightStars = getStarRating(right.genetics)
    if (leftStars !== rightStars) return rightStars - leftStars
    if (left.genetics.generation !== right.genetics.generation) return right.genetics.generation - left.genetics.generation
    const totalDelta = getBreedingTotalStats(right.genetics) - getBreedingTotalStats(left.genetics)
    if (totalDelta !== 0) return totalDelta
    return left.genetics.id.localeCompare(right.genetics.id)
  }

  const normalizeSeedSearch = (value: string): string => value.trim().toLocaleLowerCase('zh-CN')

  const allSeeds = computed<GreenhouseSeedEntry[]>(() => {
    return CROPS.flatMap(crop =>
      QUALITY_ORDER.map(quality => ({
        cropId: crop.id,
        seedId: crop.seedId,
        name: crop.name,
        seedName: getSeedItem(crop.seedId)?.name ?? `${crop.name}种子`,
        quality,
        count: inventoryStore.getItemCount(crop.seedId, quality),
        colorClass: cropValueColor(crop.sellPrice),
        regrowth: crop.regrowth ?? false,
        seasonLabel: getCropSeasonLabel(crop.season)
      })).filter(seed => seed.count > 0)
    )
  })

  const greenhouseSeedGroups = computed<GreenhouseSeedGroup[]>(() => {
    const groups = new Map<string, GreenhouseSeedGroup>()
    for (const seed of allSeeds.value) {
      const group = groups.get(seed.cropId)
      if (group) {
        group.totalCount += seed.count
        group.seeds.push(seed)
      } else {
        groups.set(seed.cropId, {
          cropId: seed.cropId,
          seedId: seed.seedId,
          name: seed.name,
          seedName: seed.seedName,
          totalCount: seed.count,
          colorClass: seed.colorClass,
          regrowth: seed.regrowth,
          seasonLabel: seed.seasonLabel,
          seeds: [seed]
        })
      }
    }
    return [...groups.values()]
  })

  const filterGreenhouseSeedGroups = (groups: GreenhouseSeedGroup[], search: string): GreenhouseSeedGroup[] => {
    const query = normalizeSeedSearch(search)
    if (!query) return groups
    return groups.filter(group =>
      [group.name, group.seedName, group.seasonLabel].some(text => normalizeSeedSearch(text).includes(query)) ||
      group.seeds.some(seed => QUALITY_NAMES[seed.quality].includes(query))
    )
  }

  const ghBatchBreedingSeedGroups = computed<GreenhouseBreedingSeedGroup[]>(() => {
    const groups = new Map<string, GreenhouseBreedingSeedGroup>()
    for (const seed of breedingStore.breedingBox) {
      const cid = seed.genetics.cropId
      const totalStats = getBreedingTotalStats(seed.genetics)
      const stars = getStarRating(seed.genetics)
      const group = groups.get(cid)
      if (group) {
        group.count++
        group.seeds.push(seed)
        if (seed.genetics.generation < group.minGen) group.minGen = seed.genetics.generation
        if (seed.genetics.generation > group.maxGen) group.maxGen = seed.genetics.generation
        if (stars > group.bestStars) group.bestStars = stars
        if (totalStats > group.bestTotalStats) group.bestTotalStats = totalStats
      } else {
        groups.set(cid, {
          cropId: cid,
          name: getCropName(cid),
          count: 1,
          minGen: seed.genetics.generation,
          maxGen: seed.genetics.generation,
          bestStars: stars,
          bestTotalStats: totalStats,
          seeds: [seed]
        })
      }
    }
    return [...groups.values()].map(group => ({
      ...group,
      seeds: [...group.seeds].sort(sortBreedingSeedsForPlanting)
    }))
  })

  const filterGreenhouseBreedingSeedGroups = (groups: GreenhouseBreedingSeedGroup[], search: string): GreenhouseBreedingSeedGroup[] => {
    const query = normalizeSeedSearch(search)
    if (!query) return groups
    return groups.filter(group =>
      normalizeSeedSearch(group.name).includes(query) ||
      group.seeds.some(seed =>
        normalizeSeedSearch(seed.label).includes(query) ||
        normalizeSeedSearch(`g${seed.genetics.generation}`).includes(query)
      )
    )
  }

  const visibleGhSeedGroups = computed(() =>
    ghSeedKindFilter.value === 'breeding' ? [] : filterGreenhouseSeedGroups(greenhouseSeedGroups.value, ghSeedSearch.value)
  )

  const visibleGhBatchSeedGroups = computed(() =>
    ghBatchSeedKindFilter.value === 'breeding' ? [] : filterGreenhouseSeedGroups(greenhouseSeedGroups.value, ghBatchSeedSearch.value)
  )

  const visibleGhBreedingSeedGroups = computed(() =>
    ghSeedKindFilter.value === 'ordinary' ? [] : filterGreenhouseBreedingSeedGroups(ghBatchBreedingSeedGroups.value, ghSeedSearch.value)
  )

  const visibleGhBatchBreedingSeedGroups = computed(() =>
    ghBatchSeedKindFilter.value === 'ordinary'
      ? []
      : filterGreenhouseBreedingSeedGroups(ghBatchBreedingSeedGroups.value, ghBatchSeedSearch.value)
  )

  const greenhouseSeedPickerEmpty = computed(() =>
    activeGhPlot.value?.state === 'tilled' &&
    visibleGhSeedGroups.value.length === 0 &&
    visibleGhBreedingSeedGroups.value.length === 0
  )

  const greenhouseBatchSeedPickerEmpty = computed(() =>
    visibleGhBatchSeedGroups.value.length === 0 && visibleGhBatchBreedingSeedGroups.value.length === 0
  )

  const greenhouseSeedEmptyText = computed(() =>
    allSeeds.value.length === 0 && ghBatchBreedingSeedGroups.value.length === 0 ? '背包中没有种子' : '没有匹配的温室种子'
  )

  const greenhouseBatchSeedEmptyText = computed(() =>
    allSeeds.value.length === 0 && ghBatchBreedingSeedGroups.value.length === 0 ? '没有可种植的种子' : '没有匹配的温室种子'
  )

  const toggleGhBreedingGroup = (cropId: string) => {
    const next = new Set(expandedGhBreedingCropIds.value)
    if (next.has(cropId)) next.delete(cropId)
    else next.add(cropId)
    expandedGhBreedingCropIds.value = next
  }

  const isGhBreedingGroupExpanded = (cropId: string): boolean => expandedGhBreedingCropIds.value.has(cropId)

  const getBreedingSeedSummary = (genetics: SeedGenetics): string =>
    `${getStarRating(genetics)}★ · ${getBreedingTotalStats(genetics)}`

  const openGhPlot = (plotId: number) => {
    activeGhPlotId.value = plotId
    expandedGhBreedingCropIds.value = new Set()
  }

  // === 弹窗操作：温室 ===

  const doGhFertilize = (type: FertilizerType) => {
    if (activeGhPlotId.value === null) return
    if (gameStore.isPastBedtime) {
      addLog('已经凌晨2点了，你必须休息。')
      handleEndDay()
      return
    }
    const currentFertilizer = activeGhPlot.value?.fertilizer ?? null
    if (currentFertilizer === type) {
      addLog('该温室地块已经施了这种肥料。')
      activeGhPlotId.value = null
      return
    }
    if (!inventoryStore.removeItem(type)) {
      addLog('没有该肥料了。')
      return
    }
    const succeeded = currentFertilizer
      ? farmStore.replaceGreenhouseFertilizer(activeGhPlotId.value, type)
      : farmStore.applyGreenhouseFertilizer(activeGhPlotId.value, type)
    if (succeeded) {
      const nextFertDef = getFertilizerById(type)
      if (currentFertilizer) {
        const currentFertDef = getFertilizerById(currentFertilizer)
        addLog(`将温室地块的${currentFertDef?.name ?? '原肥料'}替换为${nextFertDef?.name ?? '肥料'}，旧肥料未返还。`)
      } else {
        addLog(`给温室地块施了${nextFertDef?.name ?? '肥料'}。`)
      }
    } else {
      inventoryStore.addItem(type)
      addLog(currentFertilizer ? '无法替换此温室地块的肥料。' : '无法在此施肥（需要已开垦且未施肥的温室地块）。')
    }
    activeGhPlotId.value = null
  }

  const doGhBatchFertilize = (type: FertilizerType) => {
    if (gameStore.isPastBedtime) {
      addLog('已经凌晨2点了，你必须休息。')
      showGhBatchFertilize.value = false
      handleEndDay()
      return
    }
    const fertDef = getFertilizerById(type)
    if (!fertDef) return

    const targets = farmStore.greenhousePlots.filter(isGreenhouseFertilizablePlot)
    if (targets.length === 0) {
      addLog('没有可施肥的温室地块。')
      showGhBatchFertilize.value = false
      return
    }

    let applied = 0
    for (const plot of targets) {
      if (!inventoryStore.hasItem(type)) break
      if (!inventoryStore.removeItem(type)) break
      if (farmStore.applyGreenhouseFertilizer(plot.id, type)) {
        applied++
      } else {
        inventoryStore.addItem(type)
        break
      }
    }

    if (applied > 0) {
      showFloat(`温室施肥 ×${applied}`, 'success')
      addLog(`在温室一键施了${applied}块地的${fertDef.name}。`)
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.plant * Math.min(applied, 3))
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) {
        showGhBatchFertilize.value = false
        handleEndDay()
        return
      }
    } else {
      addLog('肥料不足，无法给温室施肥。')
    }
    showGhBatchFertilize.value = false
  }

  const doGhPlant = (cropId: string, seedQuality: Quality = 'normal') => {
    if (activeGhPlotId.value === null) return
    if (gameStore.isPastBedtime) {
      addLog('已经凌晨2点了，你必须休息。')
      handleEndDay()
      return
    }
    if (!inventoryStore.isToolAvailable('hoe')) {
      addLog('锄头正在升级中，无法播种。')
      return
    }
    const crop = getCropById(cropId)
    if (!crop) return
    if (!inventoryStore.removeItem(crop.seedId, 1, seedQuality)) {
      addLog('背包中没有该种子了。')
      return
    }
    const cookingStore = useCookingStore()
    const farmingBuff = cookingStore.activeBuff?.type === 'farming' ? cookingStore.activeBuff.value / 100 : 0
    const cropRingFarmReduction = inventoryStore.getRingEffectValue('farming_stamina')
    const cropRingGlobalReduction = inventoryStore.getRingEffectValue('stamina_reduction')
    const cost = getFarmingActionStaminaCost(3, [
      inventoryStore.getToolStaminaMultiplier('hoe'),
      1 - farmingBuff,
      1 - cropRingFarmReduction,
      1 - cropRingGlobalReduction
    ])
    if (!playerStore.consumeStamina(cost, { source: 'tool' })) {
      inventoryStore.addItem(crop.seedId, 1, seedQuality)
      addLog('体力不足，无法播种。')
      return
    }
    if (farmStore.greenhousePlantCrop(activeGhPlotId.value, cropId, seedQuality)) {
      addLog(`在温室中播种了${crop.name}。${getFarmingStaminaCostLabel(cost)}`)
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.plant)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) {
        activeGhPlotId.value = null
        handleEndDay()
        return
      }
    } else {
      playerStore.restoreStamina(cost)
      inventoryStore.addItem(crop.seedId, 1, seedQuality)
    }
    activeGhPlotId.value = null
  }

  const doGhPlantGeneticSeed = (seedId: string) => {
    if (activeGhPlotId.value === null) return
    if (gameStore.isPastBedtime) {
      addLog('已经凌晨2点了，你必须休息。')
      handleEndDay()
      return
    }
    if (!inventoryStore.isToolAvailable('hoe')) {
      addLog('锄头正在升级中，无法播种。')
      return
    }
    const seed = breedingStore.breedingBox.find(s => s.genetics.id === seedId)
    if (!seed) return
    const cookingStore = useCookingStore()
    const farmingBuff = cookingStore.activeBuff?.type === 'farming' ? cookingStore.activeBuff.value / 100 : 0
    const cropRingFarmReduction = inventoryStore.getRingEffectValue('farming_stamina')
    const cropRingGlobalReduction = inventoryStore.getRingEffectValue('stamina_reduction')
    const cost = getFarmingActionStaminaCost(3, [
      inventoryStore.getToolStaminaMultiplier('hoe'),
      1 - farmingBuff,
      1 - cropRingFarmReduction,
      1 - cropRingGlobalReduction
    ])
    if (!playerStore.consumeStamina(cost, { source: 'tool' })) {
      addLog('体力不足，无法播种。')
      return
    }
    if (farmStore.greenhousePlantGeneticSeed(activeGhPlotId.value, seed.genetics)) {
      breedingStore.removeFromBox(seedId)
      addLog(`在温室中播种了育种种子：${getCropName(seed.genetics.cropId)} G${seed.genetics.generation}。${getFarmingStaminaCostLabel(cost)}`)
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.plant)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) {
        activeGhPlotId.value = null
        handleEndDay()
        return
      }
    } else {
      playerStore.restoreStamina(cost)
    }
    activeGhPlotId.value = null
  }

  const doGhHarvest = () => {
    if (activeGhPlotId.value === null) return
    if (gameStore.isPastBedtime) {
      addLog('已经凌晨2点了，你必须休息。')
      handleEndDay()
      return
    }
    if (!inventoryStore.isToolAvailable('scythe')) {
      addLog('镰刀正在升级中，无法收获。')
      return
    }
    const result = harvestGreenhousePlotWithRewards(activeGhPlotId.value)
    if (result.success) {
      const qualityLabel = result.quality && result.quality !== 'normal' ? `(${QUALITY_NAMES[result.quality]})` : ''
      const qtyLabel = result.quantity > 1 ? `×${result.quantity}` : ''
      sfxHarvest()
      showFloat(`+${result.cropName}${qtyLabel}${qualityLabel}`, 'success')
      let msg = `在温室收获了${result.cropName}${qtyLabel}${qualityLabel}！`
      if (result.bonusMoney > 0) msg += ` 甜度加成+${result.bonusMoney}文`
      if (result.leveledUp) msg += ` 农耕提升到${result.newLevel}级！`
      addLog(msg)
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.harvest)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) {
        activeGhPlotId.value = null
        handleEndDay()
        return
      }
    } else {
      addLog('背包空间不足，无法收获。')
    }
    activeGhPlotId.value = null
  }

  const doGhBatchHarvest = () => {
    if (gameStore.isPastBedtime) {
      addLog('已经凌晨2点了，你必须休息。')
      handleEndDay()
      return
    }
    if (!inventoryStore.isToolAvailable('scythe')) {
      addLog('镰刀正在升级中，无法收获。')
      return
    }
    let harvested = 0
    let blockedByBag = false
    const targets = farmStore.greenhousePlots.filter(p => p.state === 'harvestable')
    for (const plot of targets) {
      const result = harvestGreenhousePlotWithRewards(plot.id)
      if (!result.success) {
        blockedByBag = true
        continue
      }
      harvested++
    }
    if (harvested > 0) {
      sfxHarvest()
      showFloat(`温室收获 ×${harvested}`, 'success')
      addLog(`在温室一键收获了${harvested}株作物。`)
      const batchSegments = Math.max(1, Math.ceil(harvested / 6))
      const tr = gameStore.advanceTime(
        ACTION_TIME_COSTS.batchHarvest * batchSegments * inventoryStore.getToolStaminaMultiplier('scythe')
      )
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) {
        handleEndDay()
        return
      }
      if (ghHarvestableCount.value > 0) {
        addLog('剩余成熟作物已保留，可稍后继续收获。')
      }
      if (blockedByBag) {
        addLog('部分成熟作物因背包空间不足未收获。')
      }
    } else if (blockedByBag) {
      addLog('背包空间不足，无法收获。')
    }
  }

  const doGhBatchPlant = (cropId: string, seedQuality: Quality = 'normal') => {
    if (gameStore.isPastBedtime) {
      addLog('已经凌晨2点了，你必须休息。')
      handleEndDay()
      return
    }
    if (!inventoryStore.isToolAvailable('hoe')) {
      addLog('锄头正在升级中，无法播种。')
      return
    }
    const crop = getCropById(cropId)
    if (!crop) return
    const targets = farmStore.greenhousePlots.filter(p => p.state === 'tilled')
    if (targets.length === 0) return
    let planted = 0
    let staminaSpent = 0
    const cookingStore = useCookingStore()
    const farmingBuff = cookingStore.activeBuff?.type === 'farming' ? cookingStore.activeBuff.value / 100 : 0
    const plantRingFarmReduction = inventoryStore.getRingEffectValue('farming_stamina')
    const plantRingGlobalReduction = inventoryStore.getRingEffectValue('stamina_reduction')
    for (const plot of targets) {
      if (inventoryStore.getItemCount(crop.seedId, seedQuality) <= 0) break
      const cost = getFarmingActionStaminaCost(3, [
        inventoryStore.getToolStaminaMultiplier('hoe'),
        1 - farmingBuff,
        1 - plantRingFarmReduction,
        1 - plantRingGlobalReduction
      ])
      if (!playerStore.consumeStamina(cost, { source: 'tool' })) break
      if (!inventoryStore.removeItem(crop.seedId, 1, seedQuality)) break
      if (farmStore.greenhousePlantCrop(plot.id, cropId, seedQuality)) {
        planted++
        staminaSpent += cost
      } else {
        playerStore.restoreStamina(cost)
        inventoryStore.addItem(crop.seedId, 1, seedQuality)
        break
      }
    }
    if (planted > 0) {
      sfxPlant()
      showFloat(`温室种植 ${crop.name} ×${planted}`, 'success')
      addLog(`在温室一键种植了${planted}株${crop.name}。${getFarmingStaminaCostLabel(staminaSpent)}`)
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.plant * Math.min(planted, 3))
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) {
        showGhBatchPlant.value = false
        handleEndDay()
        return
      }
    } else {
      addLog('体力不足或种子不够，无法种植。')
    }
    showGhBatchPlant.value = false
  }

  const doGhBatchPlantBreeding = (cropId: string) => {
    if (gameStore.isPastBedtime) {
      addLog('已经凌晨2点了，你必须休息。')
      handleEndDay()
      return
    }
    if (!inventoryStore.isToolAvailable('hoe')) {
      addLog('锄头正在升级中，无法播种。')
      return
    }
    const targets = farmStore.greenhousePlots.filter(p => p.state === 'tilled')
    if (targets.length === 0) return

    const seeds = breedingStore.breedingBox.filter(s => s.genetics.cropId === cropId)
    let planted = 0
    let staminaSpent = 0
    const cookingStore = useCookingStore()
    const farmingBuff = cookingStore.activeBuff?.type === 'farming' ? cookingStore.activeBuff.value / 100 : 0
    const plantRingFarmReduction = inventoryStore.getRingEffectValue('farming_stamina')
    const plantRingGlobalReduction = inventoryStore.getRingEffectValue('stamina_reduction')

    for (const plot of targets) {
      if (seeds.length === 0) break
      const seed = seeds.shift()!
      const cost = getFarmingActionStaminaCost(3, [
        inventoryStore.getToolStaminaMultiplier('hoe'),
        1 - farmingBuff,
        1 - plantRingFarmReduction,
        1 - plantRingGlobalReduction
      ])
      if (!playerStore.consumeStamina(cost, { source: 'tool' })) break
      if (farmStore.greenhousePlantGeneticSeed(plot.id, seed.genetics)) {
        breedingStore.removeFromBox(seed.genetics.id)
        planted++
        staminaSpent += cost
      }
    }

    if (planted > 0) {
      sfxPlant()
      showFloat(`温室育种种植 ${getCropName(cropId)} ×${planted}`, 'success')
      addLog(`在温室一键种植了${planted}株育种种子（${getCropName(cropId)}）。${getFarmingStaminaCostLabel(staminaSpent)}`)
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.plant * Math.min(planted, 3))
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) {
        showGhBatchPlant.value = false
        handleEndDay()
        return
      }
    } else {
      addLog('体力不足，无法种植。')
    }

    showGhBatchPlant.value = false
  }

  const handleGhUpgrade = () => {
    const upgrade = nextGhUpgrade.value
    if (!upgrade) return
    const materialCost = [...upgrade.materialCost.reduce((totals, mat) => {
      totals.set(mat.itemId, (totals.get(mat.itemId) ?? 0) + mat.quantity)
      return totals
    }, new Map<string, number>()).entries()].map(([itemId, quantity]) => ({ itemId, quantity }))
    for (const mat of materialCost) {
      if (getCombinedItemCount(mat.itemId) < mat.quantity) {
        addLog('材料不足，无法升级温室。')
        return
      }
    }
    if (!playerStore.spendMoney(upgrade.cost)) {
      addLog('铜钱不足，无法升级温室。')
      return
    }
    if (!removeCombinedItems(materialCost)) {
      playerStore.earnMoney(upgrade.cost, { countAsEarned: false })
      addLog('材料不足，无法升级温室。')
      return
    }
    farmStore.upgradeGreenhouse(upgrade.plotCount)
    addLog(`温室已升级至${upgrade.name}！（${upgrade.plotCount}个地块）`)
    showGhUpgradeModal.value = false
  }
</script>

<style scoped>
  .farm-plot {
    height: 0;
    padding-bottom: 100%;
  }

  .farm-plot :deep(.crop-image--tile),
  .greenhouse-plot :deep(.crop-image--tile) {
    width: 98% !important;
    height: 98% !important;
    border: 0;
    border-radius: 2px;
    background: transparent;
  }

  .farm-crop-image-detail {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgb(var(--color-bg) / 0.26);
  }

  .farm-crop-image-detail :deep(.crop-image-variant-picker__button) {
    min-width: 42px;
    min-height: 42px;
  }

  .farm-seed-option {
    width: 100%;
    min-height: 42px;
    gap: 8px;
    padding-inline: 8px;
  }

  .farm-seed-option__main {
    display: inline-flex;
    min-width: 0;
    align-items: center;
    gap: 8px;
    text-align: left;
  }

  .farm-seed-option__label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .farm-seed-option__count {
    flex: 0 0 auto;
    margin-left: auto;
  }

  .farm-seed-group {
    width: 100%;
    border: 1px solid rgb(var(--color-accent) / 0.1);
    border-radius: 2px;
    background: rgb(var(--color-bg) / 0.42);
    padding: 6px;
  }

  .farm-seed-group__head {
    display: flex;
    min-height: 32px;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .farm-seed-quality-options,
  .farm-breeding-seed-options {
    margin-top: 6px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));
    gap: 4px;
  }

  .farm-seed-quality-button {
    min-height: 34px;
    justify-content: flex-start;
    gap: 6px;
    overflow: hidden;
  }

  .farm-seed-chip {
    min-height: 40px;
    gap: 6px;
    padding-inline: 8px;
  }

  .farm-seed-chip__label {
    min-width: 0;
  }

  .farm-seed-option :deep(.item-icon--xs),
  .farm-seed-chip :deep(.item-icon--xs) {
    width: 28px !important;
    height: 28px !important;
  }

  .farm-batch-action {
    width: 100%;
    min-height: 40px;
    justify-content: space-between;
    gap: 12px;
    text-align: left;
  }

  .farm-batch-action__label {
    display: inline-flex;
    min-width: 0;
    align-items: center;
    gap: 6px;
    color: rgb(var(--color-text));
  }

  .farm-batch-action__count {
    flex-shrink: 0;
    color: var(--color-accent);
    font-weight: 600;
  }

  .farm-batch-action:disabled {
    opacity: 0.52;
    filter: grayscale(1);
    cursor: not-allowed;
    color: rgb(var(--color-muted));
    background-color: rgba(var(--color-bg), 0.58);
    border-color: rgba(107, 114, 128, 0.38);
    -webkit-text-fill-color: rgb(var(--color-muted));
  }

  .farm-batch-action:disabled:hover {
    background-color: rgba(var(--color-bg), 0.58);
    color: rgb(var(--color-muted));
    -webkit-text-fill-color: rgb(var(--color-muted));
  }

  .farm-batch-action:disabled .farm-batch-action__label,
  .farm-batch-action:disabled .farm-batch-action__count {
    color: rgb(var(--color-muted));
    opacity: 1;
    font-weight: 400;
    -webkit-text-fill-color: rgb(var(--color-muted));
  }

  .shipping-box-modal {
    padding: 10px;
  }

  .shipping-box-modal__header {
    padding-bottom: 9px;
  }

  .shipping-box-title-row {
    display: flex;
    min-width: 0;
    min-height: 30px;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .shipping-box-title-icon {
    display: inline-flex;
    width: 28px;
    height: 28px;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    border: 1px solid rgb(var(--color-accent-rgb) / 0.32);
    border-radius: 2px;
    background: rgb(var(--color-accent-rgb) / 0.08);
  }

  .shipping-box-title-text {
    font-size: 0.875rem;
    line-height: 1.2;
  }

  .shipping-box-count-chip {
    display: inline-flex;
    align-items: center;
    min-height: 20px;
    padding: 2px 6px;
    border: 1px solid rgb(var(--color-accent-rgb) / 0.2);
    border-radius: 2px;
    color: rgb(var(--color-muted-rgb));
    font-size: 0.625rem;
    line-height: 1;
  }

  .shipping-box-close {
    display: inline-flex;
    width: 32px;
    height: 32px;
    align-items: center;
    justify-content: center;
    border: 1px solid rgb(var(--color-accent-rgb) / 0.14);
    border-radius: 2px;
    background: rgb(var(--color-bg) / 0.22);
  }

  .shipping-box-layout {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 10px;
  }

  .shipping-box-section {
    overflow: hidden;
    border: 1px solid rgb(var(--color-accent-rgb) / 0.12);
    border-radius: 2px;
    background: rgb(var(--color-bg) / 0.2);
    padding: 8px;
  }

  .shipping-box-section--loaded {
    max-height: min(28dvh, 210px);
  }

  .shipping-box-section--inventory {
    min-height: 0;
  }

  .shipping-box-section-head {
    min-height: 22px;
  }

  .shipping-box-scroll,
  .shipping-box-item-list {
    scrollbar-gutter: stable;
  }

  .shipping-box-loaded-card,
  .shipping-box-item-card {
    border: 1px solid rgb(var(--color-accent-rgb) / 0.12);
    background: rgb(var(--color-bg) / 0.18);
    transition:
      border-color 0.15s ease,
      background-color 0.15s ease;
  }

  .shipping-box-loaded-card:hover,
  .shipping-box-item-card:hover {
    border-color: rgb(var(--color-accent-rgb) / 0.28);
    background: rgb(var(--color-accent-rgb) / 0.06);
  }

  .shipping-box-empty {
    min-height: 92px;
    border: 1px dashed rgb(var(--color-accent-rgb) / 0.14);
    border-radius: 2px;
    background: rgb(var(--color-bg) / 0.14);
  }

  .shipping-box-empty--inventory {
    min-height: 180px;
  }

  .shipping-box-inventory-head {
    display: flex;
    min-height: 24px;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 7px;
  }

  .shipping-box-filter-bar {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
    padding: 7px;
    border: 1px solid rgb(var(--color-accent-rgb) / 0.14);
    border-radius: 2px;
    background: rgb(var(--color-bg) / 0.34);
  }

  .shipping-box-search-field,
  .shipping-box-select-field {
    position: relative;
    display: block;
    min-width: 0;
  }

  .shipping-box-search-field {
    grid-column: 1 / -1;
  }

  .shipping-box-search-icon,
  .shipping-box-select-icon {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    color: rgb(var(--color-muted-rgb) / 0.82);
    pointer-events: none;
  }

  .shipping-box-search-icon {
    left: 10px;
  }

  .shipping-box-select-icon {
    right: 9px;
  }

  .shipping-box-field-label {
    position: absolute;
    top: 5px;
    left: 10px;
    z-index: 1;
    color: rgb(var(--color-muted-rgb) / 0.82);
    font-size: 0.5625rem;
    line-height: 1;
    pointer-events: none;
  }

  .shipping-box-control {
    width: 100%;
    min-width: 0 !important;
    min-height: 42px;
    border-color: rgb(var(--color-accent-rgb) / 0.16);
    background: rgb(var(--color-bg) / 0.62);
    font-size: 0.6875rem;
  }

  .shipping-box-control--search {
    padding-left: 30px;
  }

  .shipping-box-select-field .shipping-box-control {
    appearance: none;
    padding: 16px 28px 5px 10px;
  }

  .shipping-box-item-card {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }

  .shipping-box-item-main {
    min-width: 0;
  }

  .shipping-box-item-title {
    max-width: 100%;
  }

  .shipping-box-item-meta {
    display: flex;
    min-width: 0;
    flex-wrap: wrap;
    column-gap: 8px;
    row-gap: 1px;
    line-height: 1.55;
  }

  .shipping-box-item-meta > span {
    white-space: nowrap;
  }

  .shipping-box-item-actions {
    display: grid;
    width: 100%;
    grid-template-columns: repeat(auto-fit, minmax(72px, 1fr));
    gap: 6px;
  }

  .shipping-box-action-btn,
  .shipping-box-return-btn {
    min-height: 34px;
    white-space: nowrap;
  }

  .shipping-box-action-btn {
    width: 100%;
    padding-inline: 8px;
  }

  @media (min-width: 768px) {
    .shipping-box-modal {
      padding: 12px;
    }

    .shipping-box-layout {
      grid-template-columns: minmax(0, 0.86fr) minmax(0, 1.44fr);
      grid-template-rows: minmax(0, 1fr);
      gap: 12px;
    }

    .shipping-box-section {
      padding: 10px;
    }

    .shipping-box-section--loaded {
      max-height: none;
    }

    .shipping-box-empty {
      min-height: 180px;
    }

    .shipping-box-filter-bar {
      grid-template-columns: minmax(220px, 1fr) minmax(118px, 0.44fr) minmax(132px, 0.5fr);
      gap: 0;
      padding: 0;
      overflow: hidden;
      background: rgb(var(--color-bg) / 0.44);
    }

    .shipping-box-search-field {
      grid-column: auto;
    }

    .shipping-box-search-field,
    .shipping-box-select-field {
      border-right: 1px solid rgb(var(--color-accent-rgb) / 0.12);
    }

    .shipping-box-select-field:last-child {
      border-right: 0;
    }

    .shipping-box-control {
      min-height: 48px;
      border: 0;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
    }

    .shipping-box-control:focus {
      box-shadow: inset 0 0 0 1px rgb(var(--color-accent-rgb) / 0.42);
    }

    .shipping-box-item-card {
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
    }

    .shipping-box-item-actions {
      display: flex;
      width: auto;
      align-items: center;
      gap: 5px;
    }

    .shipping-box-action-btn {
      width: auto;
      min-width: 72px;
    }
  }

  @media (max-width: 767px) {
    .shipping-box-modal__header {
      padding-bottom: 8px;
    }

    .shipping-box-title-icon {
      width: 26px;
      height: 26px;
    }

    .shipping-box-title-text {
      font-size: 0.8125rem;
    }

    .shipping-box-close {
      width: 30px;
      height: 30px;
    }

    .shipping-box-section {
      padding: 7px;
    }

    .shipping-box-loaded-card {
      min-height: 48px;
    }

    .shipping-box-item-card {
      padding: 8px;
    }

    .shipping-box-item-main :deep(.item-icon--xs),
    .shipping-box-loaded-card :deep(.item-icon--xs) {
      width: 32px !important;
      height: 32px !important;
      flex: 0 0 auto;
    }
  }
</style>
