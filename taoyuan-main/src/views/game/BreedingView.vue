<template>
  <div data-testid="breeding-view">
    <!-- 标题 -->
    <div class="flex flex-col gap-2 mb-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center space-x-1.5 text-sm text-accent">
          <FlaskConical :size="14" />
          <span>育种</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <span class="game-chip">种子箱 {{ breedingStore.boxCount }}/{{ breedingStore.maxSeedBox }}</span>
          <span class="game-chip">育种台 {{ breedingStore.stationCount }}/{{ MAX_BREEDING_STATIONS }}</span>
          <span class="game-chip">图鉴 {{ totalDiscovered }}/{{ HYBRID_DEFS.length }}</span>
        </div>
      </div>
      <p class="game-section-desc">先看推荐目标，再决定是提升现有种子属性，还是直接尝试新品种杂交。</p>
    </div>

    <!-- 教程提示 -->
    <p v-if="tutorialHint" class="tutorial-hint mb-3">{{ tutorialHint }}</p>

    <!-- 两栏切换 -->
    <GuidanceDigestPanel surface-id="breeding" title="成长承接引导" />
    <QaGovernancePanel page-id="breeding" title="育种治理总览" />

    <div class="flex gap-1 mb-3">
      <Button class="flex-1 justify-center" :class="{ '!bg-accent !text-bg': tab === 'breeding' }" @click="tab = 'breeding'">育种台</Button>
      <Button class="flex-1 justify-center" :class="{ '!bg-accent !text-bg': tab === 'compendium' }" @click="tab = 'compendium'">
        图鉴
      </Button>
    </div>

    <!-- ===== 育种台 Tab ===== -->
    <template v-if="tab === 'breeding'">
      <!-- 育种台区 -->
      <div class="mb-3 game-panel-muted p-3">
        <div class="flex items-center justify-between mb-1.5">
          <div>
            <p class="text-xs text-accent">育种台</p>
            <p class="text-[10px] text-muted mt-0.5">先选择空闲育种台，再放入两颗种子开始培育。</p>
          </div>
          <Button v-if="breedingStore.stationCount < MAX_BREEDING_STATIONS" :icon="Plus" :icon-size="12" @click="showCraftModal = true">
            建造
          </Button>
        </div>

        <!-- 无育种台空状态 -->
        <div v-if="breedingStore.stationCount === 0" class="border border-accent/10 rounded-xs py-6 flex flex-col items-center space-y-2">
          <Dna :size="32" class="text-muted/30" />
          <p class="text-xs text-muted">尚未建造育种台</p>
          <p class="text-xs text-muted/60">建造育种台后可进行杂交育种</p>
        </div>

        <!-- 育种台列表 -->
        <div v-else class="flex flex-col space-y-1.5">
          <div v-for="(slot, idx) in breedingStore.stations" :key="idx" class="border border-accent/20 rounded-xs px-3 py-2">
            <!-- 空闲 -->
            <template v-if="!slot.parentA && !slot.ready">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-1.5">
                  <FlaskConical :size="12" class="text-muted/40" />
                  <span class="text-xs text-muted">育种台 #{{ idx + 1 }} · 空闲</span>
                </div>
                <Button :icon="Dna" :icon-size="12" :disabled="breedingStore.boxCount < 2" @click="openBreedingSelect(idx)">育种</Button>
              </div>
            </template>
            <!-- 加工中 -->
            <template v-else-if="slot.parentA && !slot.ready">
              <div class="flex items-center justify-between mb-1">
                <div class="flex items-center space-x-1.5">
                  <FlaskConical :size="12" class="text-accent" />
                  <span class="text-xs text-accent">育种台 #{{ idx + 1 }} · 培育中</span>
                </div>
                <span class="text-xs text-muted">{{ slot.daysProcessed }}/{{ slot.totalDays }}天</span>
              </div>
              <div class="h-1 bg-bg rounded-xs border border-accent/10">
                <div
                  class="h-full rounded-xs bg-accent transition-all"
                  :style="{ width: (slot.daysProcessed / slot.totalDays) * 100 + '%' }"
                />
              </div>
            </template>
            <!-- 完成 -->
            <template v-else-if="slot.ready">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-1.5">
                  <Sprout :size="12" class="text-success" />
                  <span class="text-xs text-success">育种台 #{{ idx + 1 }} · 完成</span>
                </div>
                <Button :icon="Check" :icon-size="12" @click="handleCollect(idx)">收取</Button>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- 种子箱 -->
      <div class="game-panel-muted p-3">
        <div class="flex items-center justify-between mb-1.5">
          <div>
            <p class="text-xs text-accent">种子箱</p>
            <p class="text-[10px] text-muted mt-0.5">优先用排序和筛选缩小范围，再查看种子详情与谱系。</p>
          </div>
          <button
            v-if="nextSeedBoxUpgrade || breedingStore.seedBoxLevel > 0"
            class="text-[10px] px-2 py-0.5 border rounded-xs"
            :class="nextSeedBoxUpgrade ? 'border-accent/30 text-accent hover:bg-accent/5 cursor-pointer' : 'border-accent/10 text-muted'"
            @click="showSeedBoxUpgradeModal = true"
          >
            <ArrowUpCircle :size="10" class="inline mr-0.5" />
            Lv.{{ breedingStore.seedBoxLevel }}
          </button>
        </div>
        <!-- 空状态 -->
        <div v-if="breedingStore.boxCount === 0" class="border border-accent/10 rounded-xs py-6 flex flex-col items-center space-y-2">
          <PackageOpen :size="32" class="text-muted/30" />
          <p class="text-xs text-muted">种子箱为空</p>
          <p class="text-xs text-muted/60">通过种子制造机收取产物时有概率获得育种种子</p>
        </div>
        <template v-if="breedingStore.boxCount > 0">
          <div class="flex flex-wrap gap-1 mb-1.5">
            <button
              v-for="opt in SEED_SORT_OPTIONS"
              :key="opt.value"
              class="text-[10px] px-2 py-0.5 border rounded-xs"
              :class="breedingStore.seedSortKey === opt.value ? 'border-accent text-accent bg-accent/10' : 'border-accent/20 text-muted hover:bg-accent/5'"
              @click="breedingStore.setSeedSortKey(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
          <div class="flex flex-wrap gap-1 mb-2">
            <button
              v-for="opt in SEED_FILTER_OPTIONS"
              :key="opt.value"
              class="text-[10px] px-2 py-0.5 border rounded-xs"
              :class="breedingStore.seedFilterKey === opt.value ? 'border-accent text-accent bg-accent/10' : 'border-accent/20 text-muted hover:bg-accent/5'"
              @click="breedingStore.setSeedFilterKey(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
          <div v-if="displayedBreedingSeeds.length === 0" class="border border-accent/10 rounded-xs py-4 text-center text-xs text-muted">
            当前筛选下没有符合条件的育种种子。
          </div>
          <div v-else class="grid grid-cols-3 md:grid-cols-5 gap-1 max-h-60 overflow-y-auto">
          <button
            v-for="seed in displayedBreedingSeeds"
            :key="seed.genetics.id"
            class="relative border rounded-xs px-1 py-1.5 text-center cursor-pointer hover:bg-accent/5 transition-colors mr-1"
            :class="selectedSeedIds.includes(seed.genetics.id) ? 'border-accent bg-accent/10' : 'border-accent/20'"
            @click="openSeedDetail(seed)"
          >
            <Heart v-if="breedingStore.isFavorite(seed.genetics.id)" :size="10" class="absolute top-1 right-1 text-danger fill-current" />
            <p class="text-xs truncate" :class="seedStarColor(seed.genetics)">{{ getCropName(seed.genetics.cropId) }}</p>
            <p class="text-xs text-muted">G{{ seed.genetics.generation }}</p>
            <p class="text-xs flex items-center justify-center space-x-px" :class="seedStarColor(seed.genetics)">
              <Star v-for="n in getStarRating(seed.genetics)" :key="n" :size="10" />
            </p>
          </button>
          </div>
        </template>
      </div>

      <!-- 育种研究 -->
      <div v-if="breedingStore.unlocked" class="mt-3 border border-accent/20 rounded-xs p-2">
        <div class="flex items-center justify-between mb-1">
          <p class="text-xs text-accent">育种研究</p>
          <span class="text-[10px] text-muted">Lv.{{ breedingStore.researchLevel }}</span>
        </div>
        <div class="flex flex-col space-y-0.5 text-[10px] text-muted mb-2">
          <p>· 接近可成识别范围：甜度/产量各差 ≤ {{ breedingStore.researchLevel >= 1 ? 20 : 15 }}</p>
          <p>· 高代速育门槛：最低世代 ≥ {{ breedingStore.researchLevel >= 2 ? 8 : 10 }} 时，育种耗时缩短 1 天</p>
          <p>· 失败杂交属性损耗：{{ breedingStore.researchLevel >= 2 ? 3 : 5 }} 点</p>
          <p>· 持久谱系深度：{{ breedingStore.researchLevel >= 3 ? 3 : 2 }} 层</p>
        </div>

        <div v-if="nextResearchUpgrade" class="border border-accent/10 rounded-xs p-2 mb-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-accent">下一阶段：{{ nextResearchUpgrade.name }}</span>
            <span class="text-[10px] text-muted">Lv.{{ nextResearchUpgrade.level }}</span>
          </div>
          <p class="text-[10px] text-muted mt-1">{{ nextResearchUpgrade.description }}</p>
          <div class="mt-1.5 flex flex-col space-y-0.5">
            <div v-for="mat in nextResearchUpgrade.materials" :key="mat.itemId" class="flex items-center justify-between text-[10px]">
              <span class="text-muted">{{ getItemById(mat.itemId)?.name ?? mat.itemId }}</span>
              <span :class="getCombinedItemCount(mat.itemId) >= mat.quantity ? 'text-success' : 'text-danger'">
                {{ getCombinedItemCount(mat.itemId) }}/{{ mat.quantity }}
              </span>
            </div>
            <div class="flex items-center justify-between text-[10px]">
              <span class="text-muted">铜钱</span>
              <span :class="playerStore.money >= nextResearchUpgrade.cost ? 'text-success' : 'text-danger'">
                {{ playerStore.money }}/{{ nextResearchUpgrade.cost }}文
              </span>
            </div>
          </div>
        </div>
        <div v-else class="text-[10px] text-success mb-2">育种研究已完成全部阶段。</div>

        <Button
          v-if="nextResearchUpgrade"
          class="w-full justify-center"
          :class="{ '!bg-accent !text-bg': canUpgradeResearch }"
          :icon="ArrowUpCircle"
          :icon-size="12"
          :disabled="!canUpgradeResearch"
          @click="handleUpgradeResearch"
        >
          升级研究
        </Button>

        <div class="border border-accent/10 rounded-xs p-2 mt-2">
          <p class="text-xs text-muted mb-1">育种大师化</p>
          <div class="flex flex-col space-y-1">
            <div v-for="perk in breedingStore.breedingMasteryPerks" :key="perk.id" class="flex items-start justify-between gap-2">
              <div>
                <p class="text-[10px]" :class="perk.unlocked ? 'text-accent' : 'text-muted'">{{ perk.name }}</p>
                <p class="text-[10px] text-muted/80 leading-relaxed">{{ perk.description }}</p>
              </div>
              <span class="text-[10px] whitespace-nowrap" :class="perk.unlocked ? 'text-success' : 'text-muted'">
                {{ perk.unlocked ? '已解锁' : '未解锁' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ===== 图鉴 Tab ===== -->
    <template v-if="tab === 'compendium'">
      <div v-if="breedingStore.currentBreedingContestDef" class="border border-accent/20 rounded-xs p-2 mb-2 bg-accent/5">
        <div class="flex items-center justify-between gap-2">
          <div>
            <p class="text-xs text-accent">本周育种周赛</p>
            <p class="text-[10px] text-muted mt-0.5">{{ breedingStore.currentBreedingContestDef.label }} · {{ breedingStore.currentBreedingContestDef.description }}</p>
          </div>
          <span class="text-[10px] text-muted">已报名 {{ breedingStore.breedingContestState.registeredSeedIds.length }}</span>
        </div>
        <p v-if="breedingStore.lastBreedingContestSettlement?.weekId" class="text-[10px] text-accent mt-1">
          上周结算：{{ lastBreedingContestWeekLabel }} · 冠军 {{ breedingStore.lastBreedingContestSettlement.winner?.label ?? '无' }}
        </p>
      </div>

      <div class="border border-accent/10 rounded-xs p-2 mb-2 game-panel-muted">
        <div class="flex items-center justify-between mb-1">
          <div>
            <p class="text-xs text-accent">育种规划器 2.0</p>
            <p class="text-[10px] text-muted mt-0.5">把本周订单、下周主题周和图鉴缺口合在一起看，先决定该养哪条线。</p>
          </div>
          <span class="text-[10px] text-muted">建议 {{ planningSuggestions.length }}</span>
        </div>
        <p class="text-[10px] text-muted leading-4">
          本周：{{ goalStore.currentThemeWeek?.name ?? '常规周' }}
          <span class="text-accent/70"> · </span>
          下周：{{ goalStore.nextThemeWeekPreview?.name ?? '待刷新' }}
        </p>
        <p v-if="goalStore.nextThemeWeekPreview?.breedingFocusHybridIds?.length" class="text-[10px] text-success mt-1">
          下周重点：{{ goalStore.nextThemeWeekPreview.breedingFocusHybridIds.map(getCropName).join('、') }}
        </p>
        <p v-if="breedingStore.lastFailureSalvage?.summary" class="text-[10px] text-warning mt-1 leading-4">
          最近失败回收：{{ breedingStore.lastFailureSalvage.summary }}
        </p>
        <div v-if="planningSuggestions.length === 0" class="text-[10px] text-muted mt-2">
          暂时没有明确的高优先目标，先继续补齐亲本种子和基础图鉴。
        </div>
        <div v-else class="space-y-2 mt-2">
          <div v-for="suggestion in planningSuggestions" :key="suggestion.hybridId" class="border border-accent/10 rounded-xs p-2 bg-bg/10">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs text-text">{{ suggestion.targetLabel }}</span>
              <span
                class="text-[10px]"
                :class="suggestion.readiness === 'ready' ? 'text-success' : suggestion.readiness === 'near' ? 'text-accent' : 'text-muted'"
              >
                {{ suggestion.readiness === 'ready' ? '可直接推进' : suggestion.readiness === 'near' ? '接近可成' : '先补亲本' }}
              </span>
            </div>
            <p class="text-[10px] text-muted mt-1 leading-4">{{ suggestion.currentGapSummary }}</p>
            <p v-if="suggestion.reasonLines.length" class="text-[10px] text-accent mt-1 leading-4">
              为什么做：{{ suggestion.reasonLines.join('；') }}
            </p>
            <p v-if="suggestion.expectedUseLines.length" class="text-[10px] text-success mt-1 leading-4">
              预计用途：{{ suggestion.expectedUseLines.join('；') }}
            </p>
            <p v-if="suggestion.parentLines.length" class="text-[10px] text-muted mt-1 leading-4">
              推荐亲本：{{ suggestion.parentLines.join('；') }}
            </p>
            <p v-if="suggestion.logisticsNeeds.length" class="text-[10px] text-warning mt-1 leading-4">
              物流补材：
              {{ suggestion.logisticsNeeds.map(need => `${need.itemName} ${need.owned}/${need.quantity}`).join('、') }}
            </p>
          </div>
        </div>
      </div>

      <div class="border border-accent/10 rounded-xs p-2 mb-2 game-panel-muted" v-if="goalStore.currentThemeWeek?.breedingFocusLabel || currentSpecialOrder">
        <div class="flex items-center justify-between mb-1">
          <p class="text-xs text-accent">经营型育种提醒</p>
          <span class="text-[10px] text-muted">订单 / 主题周</span>
        </div>
        <p v-if="goalStore.currentThemeWeek?.breedingFocusLabel" class="text-xs text-accent/90">
          {{ goalStore.currentThemeWeek.breedingFocusLabel }}
        </p>
        <p v-if="goalStore.currentThemeWeek?.breedingFocusDescription" class="text-[10px] text-muted mt-1 leading-4">
          {{ goalStore.currentThemeWeek.breedingFocusDescription }}
        </p>
        <p v-if="goalStore.currentThemeWeek?.breedingFocusHybridIds?.length" class="text-[10px] text-success mt-1">
          本周建议：{{ goalStore.currentThemeWeek.breedingFocusHybridIds.map(getCropName).join('、') }}
        </p>
        <p v-if="currentSpecialOrder" class="text-[10px] text-muted mt-2 leading-4">
          当前特殊订单：{{ currentSpecialOrder.targetItemName }} × {{ currentSpecialOrder.targetQuantity }}
          <span v-if="currentSpecialOrder.demandHint"> · {{ currentSpecialOrder.demandHint }}</span>
        </p>
        <p v-if="currentSpecialOrder?.recommendedHybridIds?.length" class="text-[10px] text-accent mt-1">
          订单建议：{{ currentSpecialOrder.recommendedHybridIds.map(getCropName).join('、') }}
        </p>
      </div>
      <div class="border border-accent/10 rounded-xs p-2 mb-2 game-panel-muted">
        <div class="flex items-center justify-between mb-1">
          <p class="text-xs text-accent">陪伴承接建议</p>
          <span class="text-[10px] text-muted">家庭 / 挚友</span>
        </div>
        <p class="text-[10px] text-muted leading-4">{{ breedingStore.companionshipBreedingFocus.summary }}</p>
        <p v-if="breedingStore.companionshipBreedingFocus.activeFamilyWish" class="text-[10px] text-accent mt-1">
          当前心愿：{{ breedingStore.companionshipBreedingFocus.activeFamilyWish.title }}
        </p>
        <p v-if="breedingStore.companionshipBreedingFocus.recommendedHybridIds.length" class="text-[10px] text-success mt-1">
          陪伴建议：{{ breedingStore.companionshipBreedingFocus.recommendedHybridIds.map(getCropName).join('、') }}
        </p>
      </div>
      <div class="border border-accent/10 rounded-xs p-0 mb-2 game-panel-muted overflow-hidden">
        <button class="w-full flex items-center justify-between p-2 text-xs text-accent hover:bg-accent/5" @click="showRules = !showRules">
          <span>育种规则</span>
          <ChevronDown :size="12" :class="{ 'transform rotate-180': showRules }" />
        </button>
        <div v-if="showRules" class="px-2 pb-2 border-t border-accent/10">
          <ul class="text-xs text-muted leading-relaxed mt-1.5 flex flex-col space-y-1">
            <li>
              · 使用种子制造机加工作物时，有
              <span class="text-accent">30%+种植等级×3%</span>
              概率额外获得育种种子
            </li>
            <li>· 育种种子拥有独立遗传属性（甜度/产量/抗性），与物品品质无关</li>
            <li>
              ·
              <span class="text-accent">同种培育</span>
              ：两颗相同作物的育种种子杂交，可提升后代遗传属性
            </li>
            <li>
              ·
              <span class="text-accent">异种杂交</span>
              ：两颗不同作物的育种种子杂交，当亲本平均属性达标时可发现新品种
            </li>
            <li>· 先通过同种培育提升属性，再尝试异种杂交效果更佳</li>
          </ul>
        </div>
      </div>
      <!-- 说明提示 -->
      <div v-if="totalDiscovered === 0" class="border border-accent/10 rounded-xs p-2 mb-2">
        <p class="text-xs text-muted leading-relaxed">
          图鉴收录通过
          <span class="text-accent">异种杂交</span>
          发现的新品种。将两种
          <span class="text-accent">不同作物</span>
          的育种种子放入育种台，当亲本平均属性达标时即可发现杂交品种。
        </p>
        <p class="text-xs text-muted mt-1 leading-relaxed">
          提示：先通过
          <span class="text-accent">同种培育</span>
          提升种子的甜度和产量属性，再尝试异种杂交。
        </p>
      </div>
      <div class="border border-accent/10 rounded-xs p-2 mb-2 game-panel-muted">
        <div class="flex items-center justify-between mb-1">
          <p class="text-xs text-accent">当前推荐目标</p>
          <span class="text-[10px] text-muted">优先展示最接近达成的 {{ recommendedTargetLimit }} 个目标</span>
        </div>
        <div v-if="recommendedHybridEntries.length === 0" class="text-xs text-muted">
          暂无可推荐目标。先多收集不同作物的育种种子，或继续培育已有亲本。
        </div>
        <div v-else class="flex flex-col space-y-1.5">
          <button
            v-for="entry in recommendedHybridEntries"
            :key="entry.hybrid.id"
            class="border border-accent/10 rounded-xs px-2 py-1.5 text-left hover:bg-accent/5"
            @click="activeHybrid = entry.hybrid"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs" :class="tierColor(entry.hybrid.id)">{{ entry.hybrid.name }}</span>
              <span class="text-[10px]" :class="entry.availability.status === 'discoverable' ? 'text-success' : entry.availability.status === 'near' ? 'text-accent' : 'text-muted'">
                {{ entry.availability.status === 'discoverable' ? '可杂交' : entry.availability.status === 'near' ? '接近达成' : '待培育' }}
              </span>
            </div>
            <p class="text-[10px] text-muted mt-0.5">
              {{ getCropName(entry.hybrid.parentCropA) }} × {{ getCropName(entry.hybrid.parentCropB) }}
            </p>
            <p class="text-[10px] text-muted mt-0.5">{{ entry.availability.recommendation }}</p>
          </button>
        </div>
      </div>
      <!-- 阶层筛选 -->
      <div class="flex flex-wrap mb-1">
        <Button
          v-for="tf in TIER_FILTERS"
          :key="tf.value"
          class="grow shrink-0 basis-[calc(25%-4px)] md:grow-0 md:shrink md:basis-auto justify-center mr-1 mb-1"
          :class="{ '!bg-accent !text-bg': tierFilter === tf.value }"
          @click="tierFilter = tf.value"
        >
          {{ tf.label }}
        </Button>
      </div>
      <div class="flex flex-wrap mb-2">
        <Button
          v-for="sf in HYBRID_STATUS_FILTERS"
          :key="sf.value"
          class="grow shrink-0 basis-[calc(25%-4px)] md:grow-0 md:shrink md:basis-auto justify-center mr-1 mb-1"
          :class="{ '!bg-accent !text-bg': breedingStore.hybridStatusFilter === sf.value }"
          @click="breedingStore.setHybridStatusFilter(sf.value)"
        >
          {{ sf.label }}
        </Button>
      </div>

      <!-- 进度 -->
      <p class="text-xs text-muted mb-2">已发现 {{ filteredDiscoveredCount }}/{{ filteredHybrids.length }}</p>

      <!-- 图鉴网格 -->
      <div class="grid grid-cols-3 md:grid-cols-5 gap-1 max-h-72 overflow-y-auto">
        <div
          v-for="hybrid in filteredHybrids"
          :key="hybrid.id"
          class="border rounded-xs p-1.5 text-xs text-center transition-colors truncate mr-1"
          :class="
            isDiscovered(hybrid.id)
              ? 'border-accent/20 cursor-pointer hover:bg-accent/5 ' + tierColor(hybrid.id)
              : 'border-accent/10 text-muted/30 group relative'
          "
          @click="isDiscovered(hybrid.id) && (activeHybrid = hybrid)"
        >
          <template v-if="isDiscovered(hybrid.id)">{{ hybrid.name }}</template>
          <template v-else>
            <Lock :size="12" class="mx-auto text-muted/30" />
            <!-- C: 悬停线索提示 -->
            <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:flex bg-bg border border-accent/20 rounded-xs px-1.5 py-1 text-[10px] text-muted whitespace-nowrap z-10 flex-col items-center space-y-0.5 pointer-events-none">
              <span>{{ getCropName(hybrid.parentCropA) }}</span>
              <span class="text-accent/50">×</span>
              <span>{{ getCropName(hybrid.parentCropB) }}</span>
            </div>
          </template>
        </div>
      </div>

      <!-- 图鉴完成度 -->
      <div class="mt-3 border border-accent/20 rounded-xs p-2">
        <div class="flex items-center space-x-2 text-xs mb-1.5">
          <span class="text-xs text-muted shrink-0">完成度</span>
          <div class="flex-1 h-1 bg-bg rounded-xs border border-accent/10">
            <div class="h-full bg-accent rounded-xs transition-all" :style="{ width: completionPercent + '%' }" />
          </div>
          <span class="text-xs text-accent whitespace-nowrap">{{ totalDiscovered }}/{{ HYBRID_DEFS.length }}</span>
        </div>
        <div class="grid grid-cols-2 gap-x-3 gap-y-0.5">
          <div v-for="ts in tierStats" :key="ts.tier" class="flex items-center justify-between">
            <span class="text-xs text-muted">{{ ts.label }}</span>
            <span class="text-xs">{{ ts.discovered }}/{{ ts.total }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- 建造确认弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showCraftModal"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="showCraftModal = false"
      >
        <div class="game-panel max-w-sm w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="showCraftModal = false">
            <X :size="14" />
          </button>

          <p class="text-sm text-accent mb-2">建造育种台</p>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted mb-1">所需材料</p>
            <div v-for="mat in craftMaterials" :key="mat.itemId" class="flex items-center justify-between mt-0.5">
              <span class="text-xs">{{ mat.name }}</span>
              <span class="text-xs" :class="mat.enough ? 'text-success' : 'text-danger'">{{ mat.owned }}/{{ mat.required }}</span>
            </div>
          </div>

          <div class="border border-accent/10 rounded-xs p-2 mb-3">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">费用</span>
              <span class="text-xs" :class="playerStore.money >= BREEDING_STATION_COST.money ? 'text-accent' : 'text-danger'">
                {{ BREEDING_STATION_COST.money }}文
              </span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">当前持有</span>
              <span class="text-xs">{{ playerStore.money }}文</span>
            </div>
          </div>

          <Button
            class="w-full justify-center"
            :class="{ '!bg-accent !text-bg': canCraftStation }"
            :icon="Plus"
            :icon-size="12"
            :disabled="!canCraftStation"
            @click="handleCraftStation"
          >
            确认建造
          </Button>
        </div>
      </div>
    </Transition>

    <!-- 种子详情弹窗 -->
    <Transition name="panel-fade">
      <div v-if="detailSeed" class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="detailSeed = null">
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="detailSeed = null">
            <X :size="14" />
          </button>

          <p class="text-sm text-accent mb-2">{{ getCropName(detailSeed.genetics.cropId) }} · G{{ detailSeed.genetics.generation }}</p>
          <p class="text-xs mb-2 flex items-center space-x-1" :class="seedStarColor(detailSeed.genetics)">
            <span class="flex items-center space-x-px">
              <Star v-for="n in getStarRating(detailSeed.genetics)" :key="n" :size="10" />
            </span>
            <span>（总{{ getTotalStats(detailSeed.genetics) }}）</span>
          </p>

          <!-- 属性条 -->
          <div class="flex flex-col space-y-1 mb-3">
            <div v-for="attr in seedAttributes" :key="attr.key" class="flex items-center space-x-2">
              <span class="text-xs text-muted w-10 shrink-0">{{ attr.label }}</span>
              <div class="flex-1 h-1.5 bg-bg rounded-xs border border-accent/10">
                <div class="h-full rounded-xs transition-all" :class="attr.barClass" :style="{ width: attr.value + '%' }" />
              </div>
              <span class="text-xs w-6 text-right">{{ attr.value }}</span>
            </div>
          </div>

          <!-- B: 亲本谱系树 -->
          <div v-if="detailSeed.genetics.parentA || detailSeed.genetics.parentB" class="border border-accent/10 rounded-xs p-2 mb-3">
            <p class="text-xs text-muted mb-1">亲本溯源</p>
            <div class="flex flex-col space-y-0.5">
              <div v-for="ancestor in getAncestorChain(detailSeed.genetics)" :key="ancestor.id" class="flex items-center space-x-1" :style="{ paddingLeft: ancestor.depth * 10 + 'px' }">
                <span class="text-muted/40 text-[10px] shrink-0">{{ ancestor.depth > 0 ? '└' : '' }}</span>
                <span class="text-[10px]" :class="seedStarColor(ancestor)">{{ getCropName(ancestor.cropId) }} G{{ ancestor.generation }}</span>
                <span class="text-[10px] text-muted">（{{ ancestor.lineageTotal ?? getTotalStats(ancestor) }}）</span>
              </div>
            </div>
          </div>

          <div v-if="detailSeedScoreBreakdown" class="border border-accent/10 rounded-xs p-2 mb-3 bg-bg/10">
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs text-accent">统一评分</p>
              <span class="text-[10px] text-muted">总分 {{ detailSeedScoreBreakdown.totalScore }} · {{ breedingStabilityRankLabel }}</span>
            </div>
            <div v-if="detailSeedScoreBreakdown.commercialTags.length > 0" class="flex flex-wrap gap-1 mt-2">
              <span v-for="tag in detailSeedScoreBreakdown.commercialTags" :key="tag" class="text-[10px] px-1.5 py-0.5 rounded-xs border border-accent/20 text-accent">
                {{ breedingCommercialTagLabels[tag] ?? tag }}
              </span>
            </div>
            <div class="space-y-1 mt-2">
              <div v-for="entry in detailSeedScoreBreakdown.entries" :key="entry.key" class="flex items-center justify-between text-[10px]">
                <span class="text-muted">{{ entry.label }}</span>
                <span class="text-accent">{{ entry.value }} · 权重 {{ Math.round(entry.weight * 100) }}%</span>
              </div>
            </div>
            <div class="mt-2 text-[10px] text-muted">
              展陈价值：<span class="text-accent">{{ detailSeedScoreBreakdown.exhibitWorth }}</span>
            </div>
            <div v-if="detailSeedScoreBreakdown.showcaseTags.length > 0" class="flex flex-wrap gap-1 mt-2">
              <span v-for="tag in detailSeedScoreBreakdown.showcaseTags" :key="tag" class="text-[10px] px-1.5 py-0.5 rounded-xs border border-success/20 text-success">
                {{ breedingShowcaseTagLabels[tag] ?? tag }}
              </span>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="flex flex-col space-y-1">
            <Button
              v-if="detailSeedContestEligible"
              class="w-full justify-center"
              :icon="Star"
              :icon-size="12"
              @click="handleToggleBreedingContestRegistration"
            >
              {{ breedingStore.breedingContestState.registeredSeedIds.includes(detailSeed.genetics.id) ? '取消周赛报名' : '报名本周周赛' }}
            </Button>
            <Button class="w-full justify-center" :icon="Heart" :icon-size="12" @click="handleToggleFavorite">
              {{ breedingStore.isFavorite(detailSeed.genetics.id) ? '取消收藏' : '收藏种子' }}
            </Button>
            <Button class="w-full justify-center text-danger" :icon="Trash2" :icon-size="12" @click="handleDiscard">丢弃</Button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 图鉴详情弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="activeHybrid"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="activeHybrid = null"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="activeHybrid = null">
            <X :size="14" />
          </button>

          <p class="text-sm mb-2" :class="tierColor(activeHybrid.id)">{{ activeHybrid.name }}</p>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted">{{ activeHybrid.discoveryText }}</p>
          </div>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">阶层</span>
              <span class="text-xs">{{ TIER_LABELS[getHybridTier(activeHybrid.id)] ?? '一' }}代</span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">亲本A</span>
              <span class="text-xs">{{ getCropName(activeHybrid.parentCropA) }}</span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">亲本B</span>
              <span class="text-xs">{{ getCropName(activeHybrid.parentCropB) }}</span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">甜度要求</span>
              <span class="text-xs text-accent">≥{{ activeHybrid.minSweetness }}</span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">产量要求</span>
              <span class="text-xs text-accent">≥{{ activeHybrid.minYield }}</span>
            </div>
          </div>

          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-xs text-muted mb-1">基础属性</p>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">甜度</span>
              <span class="text-xs">{{ activeHybrid.baseGenetics.sweetness }}</span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">产量</span>
              <span class="text-xs">{{ activeHybrid.baseGenetics.yield }}</span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">抗性</span>
              <span class="text-xs">{{ activeHybrid.baseGenetics.resistance }}</span>
            </div>
            <div v-if="getCompendiumEntry(activeHybrid.id)" class="flex items-center justify-between mt-1 pt-1 border-t border-accent/10">
              <span class="text-xs text-muted">种植次数</span>
              <span class="text-xs">{{ getCompendiumEntry(activeHybrid.id)?.timesGrown ?? 0 }}</span>
            </div>
            <div v-if="getCertificationRecord(activeHybrid.id)" class="flex items-center justify-between mt-1 pt-1 border-t border-accent/10">
              <span class="text-xs text-muted">谱系认证</span>
              <span class="text-xs text-success">已认证 · G{{ getCertificationRecord(activeHybrid.id)?.bestGeneration }}</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 种子箱升级弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showSeedBoxUpgradeModal"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="showSeedBoxUpgradeModal = false"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="showSeedBoxUpgradeModal = false">
            <X :size="14" />
          </button>

          <p class="text-sm text-accent mb-2">
            <ArrowUpCircle :size="14" class="inline mr-0.5" />
            种子箱信息
          </p>

          <!-- 当前状态 -->
          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">当前等级</span>
              <span class="text-xs text-accent">Lv.{{ breedingStore.seedBoxLevel }}</span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">容量上限</span>
              <span class="text-xs text-text">{{ breedingStore.maxSeedBox }} 格</span>
            </div>
          </div>

          <!-- 下一级升级 -->
          <template v-if="nextSeedBoxUpgrade">
            <div class="border border-accent/10 rounded-xs p-2 mb-2">
              <p class="text-xs text-muted mb-1">升级至 Lv.{{ breedingStore.seedBoxLevel + 1 }}</p>
              <div class="flex items-center justify-between">
                <span class="text-xs text-muted">容量上限</span>
                <span class="text-xs text-text">
                  {{ breedingStore.maxSeedBox }} → {{ breedingStore.maxSeedBox + SEED_BOX_UPGRADE_INCREMENT }}
                </span>
              </div>
            </div>

            <!-- 所需材料 -->
            <div class="border border-accent/10 rounded-xs p-2 mb-2">
              <p class="text-xs text-muted mb-1">所需材料</p>
              <div v-for="mat in nextSeedBoxUpgrade.materials" :key="mat.itemId" class="flex items-center justify-between">
                <span class="text-xs text-muted">{{ getItemById(mat.itemId)?.name }}</span>
                <span class="text-xs" :class="getCombinedItemCount(mat.itemId) >= mat.quantity ? '' : 'text-danger'">
                  {{ getCombinedItemCount(mat.itemId) }}/{{ mat.quantity }}
                </span>
              </div>
              <div class="flex items-center justify-between mt-0.5">
                <span class="text-xs text-muted">铜钱</span>
                <span class="text-xs" :class="playerStore.money >= nextSeedBoxUpgrade.cost ? '' : 'text-danger'">
                  {{ nextSeedBoxUpgrade.cost }}文
                </span>
              </div>
            </div>

            <!-- 扩容按钮 -->
            <Button
              v-if="!showSeedBoxUpgradeConfirm"
              class="w-full justify-center"
              :class="{ '!bg-accent !text-bg': canUpgradeSeedBox }"
              :icon="ArrowUpCircle"
              :icon-size="12"
              :disabled="!canUpgradeSeedBox"
              @click="showSeedBoxUpgradeConfirm = true"
            >
              扩容种子箱
            </Button>

            <!-- 确认 -->
            <div v-else class="flex space-x-1">
              <Button class="flex-1 justify-center" @click="showSeedBoxUpgradeConfirm = false">取消</Button>
              <Button class="flex-1 justify-center !bg-accent !text-bg" :icon="ArrowUpCircle" :icon-size="12" @click="handleSeedBoxUpgrade">
                确认扩容
              </Button>
            </div>
          </template>

          <p v-else class="text-[10px] text-muted text-center">种子箱已达到最高等级。</p>
        </div>
      </div>
    </Transition>

    <!-- 育种选种弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="breedingSelectSlot !== null"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="cancelBreedingSelect"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="cancelBreedingSelect">
            <X :size="14" />
          </button>

          <p class="text-sm text-accent mb-1">选择两颗种子</p>
          <p class="text-xs text-muted mb-2">已选 {{ selectedSeedIds.length }}/2，优先从高星或推荐亲本开始。</p>

          <div class="flex flex-wrap gap-2 mb-3">
            <span class="game-chip">当前育种台 #{{ (breedingSelectSlot ?? 0) + 1 }}</span>
            <span class="game-chip">已筛出 {{ displayedBreedingSeeds.length }} 颗种子</span>
          </div>

          <div class="flex flex-col space-y-1 max-h-60 overflow-y-auto mb-3">
            <button
              v-for="seed in displayedBreedingSeeds"
              :key="seed.genetics.id"
              class="flex items-center justify-between px-2 py-1 border rounded-xs text-xs cursor-pointer hover:bg-accent/5"
              :class="selectedSeedIds.includes(seed.genetics.id) ? 'border-accent bg-accent/10' : 'border-accent/20'"
              @click="toggleSeedSelect(seed.genetics.id)"
            >
              <span :class="seedStarColor(seed.genetics)">{{ getCropName(seed.genetics.cropId) }} G{{ seed.genetics.generation }}</span>
              <span class="text-muted flex items-center space-x-1">
                <span class="flex items-center space-x-px">
                  <Star v-for="n in getStarRating(seed.genetics)" :key="n" :size="10" />
                </span>
                <span>{{ getTotalStats(seed.genetics) }}</span>
              </span>
            </button>
          </div>

          <!-- 杂交配方提示 -->
          <div
            v-if="crossBreedHint"
            class="border rounded-xs p-2 mb-3"
            :class="crossBreedHint.type === 'recipe' && crossBreedHint.canSucceed ? 'border-success/30' : 'border-accent/10'"
          >
            <template v-if="crossBreedHint.type === 'same'">
              <p class="text-xs text-muted">同种培育：提升后代属性，不会产生新品种。</p>
            </template>
            <template v-else-if="crossBreedHint.type === 'no_recipe'">
              <p class="text-xs text-muted">这两个品种没有已知的杂交配方。</p>
            </template>
            <template v-else-if="crossBreedHint.type === 'recipe'">
              <p class="text-xs text-accent mb-1">可杂交：{{ crossBreedHint.name }}</p>
              <div class="flex items-center justify-between">
                <span class="text-xs text-muted">甜度</span>
                <span class="text-xs" :class="crossBreedHint.sweetOk ? 'text-success' : 'text-danger'">
                  {{ crossBreedHint.avgSweet }} / {{ crossBreedHint.minSweet }}
                  <template v-if="!crossBreedHint.sweetOk">（差{{ crossBreedHint.sweetGap }}）</template>
                </span>
              </div>
              <div class="flex items-center justify-between mt-0.5">
                <span class="text-xs text-muted">产量</span>
                <span class="text-xs" :class="crossBreedHint.yieldOk ? 'text-success' : 'text-danger'">
                  {{ crossBreedHint.avgYield }} / {{ crossBreedHint.minYield }}
                  <template v-if="!crossBreedHint.yieldOk">（差{{ crossBreedHint.yieldGap }}）</template>
                </span>
              </div>
              <p v-if="!crossBreedHint.canSucceed" class="text-xs text-danger mt-1">属性未达标，杂交将失败。</p>
              <p v-if="!crossBreedHint.canSucceed" class="text-xs text-muted mt-1">{{ crossBreedHint.recommendation }}</p>
              <p v-else class="text-xs text-success mt-1">属性达标，可以杂交成功！</p>
            </template>
          </div>

          <!-- E: 预期后代属性范围 -->
          <div v-if="offspringPreview" class="border border-accent/10 rounded-xs p-2 mb-3">
            <p class="text-xs text-muted mb-1">预期后代属性（均值 ± 波动）</p>
            <p class="text-xs text-accent mb-2">预计后代：{{ offspringPreview.name }}</p>
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">甜度</span>
              <span class="text-xs">{{ offspringPreview.sweetness[0] }} ~ {{ offspringPreview.sweetness[1] }}</span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">产量</span>
              <span class="text-xs">{{ offspringPreview.yield[0] }} ~ {{ offspringPreview.yield[1] }}</span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">抗性</span>
              <span class="text-xs">{{ offspringPreview.resistance[0] }} ~ {{ offspringPreview.resistance[1] }}</span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">稳定度</span>
              <span class="text-xs">{{ offspringPreview.stability }}</span>
            </div>
          </div>

          <Button
            class="w-full justify-center"
            :class="{ '!bg-accent !text-bg': selectedSeedIds.length === 2 }"
            :icon="Dna"
            :icon-size="12"
            :disabled="selectedSeedIds.length !== 2"
            @click="handleStartBreeding"
          >
            开始育种
          </Button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { FlaskConical, Plus, Check, ChevronDown, X, Dna, Trash2, Sprout, PackageOpen, Star, Lock, ArrowUpCircle, Heart } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import GuidanceDigestPanel from '@/components/game/GuidanceDigestPanel.vue'
  import QaGovernancePanel from '@/components/game/QaGovernancePanel.vue'
  import { useBreedingStore } from '@/stores/useBreedingStore'
  import { useGameStore, SEASON_NAMES } from '@/stores/useGameStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import { getCombinedItemCount, removeCombinedItem } from '@/composables/useCombinedInventory'
  import { getCropById } from '@/data/crops'
  import { getItemById } from '@/data/items'
  import {
    MAX_BREEDING_STATIONS,
    BREEDING_STATION_COST,
    SEED_BOX_UPGRADE_INCREMENT,
    getStarRating,
    getTotalStats,
    HYBRID_DEFS,
    getHybridTier,
    findPossibleHybrid
  } from '@/data/breeding'
  import { ACTION_TIME_COSTS } from '@/data/timeConstants'
  import { addLog, showFloat } from '@/composables/useGameLog'
  import { handleEndDay } from '@/composables/useEndDay'
  import { useTutorialStore } from '@/stores/useTutorialStore'
  import { useGoalStore } from '@/stores/useGoalStore'
  import { useQuestStore } from '@/stores/useQuestStore'
  import type {
    BreedingCommercialTag,
    BreedingPlanningSuggestion,
    BreedingSeed,
    BreedingShowcaseTag,
    HybridDef,
    SeedGenetics,
    SeedLineageNode
  } from '@/types/breeding'

  const breedingStore = useBreedingStore()
  const playerStore = usePlayerStore()
  const gameStore = useGameStore()
  const tutorialStore = useTutorialStore()
  const goalStore = useGoalStore()
  const questStore = useQuestStore()

  const currentSpecialOrder = computed(() => {
    const activeBreedingOrder = questStore.activeQuests.find(quest => quest.themeTag === 'breeding')
    const pendingBreedingOrder = questStore.specialOrder?.themeTag === 'breeding' ? questStore.specialOrder : null
    return activeBreedingOrder ?? pendingBreedingOrder ?? null
  })

  const tutorialHint = computed(() => {
    if (!tutorialStore.enabled || gameStore.year > 1) return null
    if (!breedingStore.unlocked) return '使用种子制造机加工作物时，有概率额外获得育种种子。首次获得后会解锁育种功能。'
    if (breedingStore.boxCount === 0) return '种子箱为空。多使用种子制造机加工并留意日志提示，就有机会获得新的育种种子。'
    if (breedingStore.stationCount === 0) return '有育种种子了！点击上方「建造」来搭建育种台，才能开始杂交培育。'
    if (breedingStore.boxCount < 2) return '再多收集一颗育种种子，就可以开始同种培育提升属性了。'
    if (breedingStore.compendium.length === 0) {
      const box = breedingStore.breedingBox
      const hasHighStat = box.some(s => s.genetics.sweetness >= 40 && s.genetics.yield >= 40)
      if (!hasHighStat) return '先进行同种培育（两颗相同作物的种子），多培育几代提升甜度和产量，再尝试异种杂交。'
      return '属性不错了！试试把两种不同作物的育种种子放入育种台，达到属性要求可以发现新品种。'
    }
    return null
  })

  // === Tabs ===

  type Tab = 'breeding' | 'compendium'
  const tab = ref<Tab>('breeding')

  const BREEDING_STABILITY_RANK_LABELS = {
    volatile: '波动品系',
    emerging: '成型中',
    stable: '稳定品系',
    certified: '认证谱系'
  } as const

  const formatWeekId = (weekId: string): string => {
    const matched = weekId.match(/^(\d+)-(spring|summer|autumn|winter)-week-(\d+)$/)
    if (!matched) return weekId
    const [, year, season, week] = matched
    return `第${year}年${SEASON_NAMES[season as keyof typeof SEASON_NAMES]}季第${week}周`
  }

  // === 育种规则展示 ===
  const showRules = ref(false)

  const SEED_SORT_OPTIONS = [
    { value: 'default', label: '默认' },
    { value: 'total', label: '总属性' },
    { value: 'sweetness', label: '甜度' },
    { value: 'yield', label: '产量' },
    { value: 'resistance', label: '抗性' },
    { value: 'generation', label: '世代' }
  ] as const

  const SEED_FILTER_OPTIONS = [
    { value: 'all', label: '全部' },
    { value: 'hybrid', label: '杂交种' },
    { value: 'nonHybrid', label: '普通种' },
    { value: 'highStar', label: '高星' },
    { value: 'favorite', label: '收藏' }
  ] as const

  const HYBRID_STATUS_FILTERS = [
    { value: 'all', label: '全部目标' },
    { value: 'discovered', label: '已发现' },
    { value: 'discoverable', label: '可合成' },
    { value: 'near', label: '接近可成' }
  ] as const

  // === 图鉴阶层筛选 ===

  const TIER_LABELS: Record<number, string> = {
    1: '一',
    2: '二',
    3: '三',
    4: '四',
    5: '五',
    6: '六',
    7: '七',
    8: '八',
    9: '九',
    10: '十'
  }

  const TIER_FILTERS = [
    { value: 0, label: '全部' },
    { value: 1, label: '一代' },
    { value: 2, label: '二代' },
    { value: 3, label: '三代' },
    { value: 4, label: '四代' },
    { value: 5, label: '五代' },
    { value: 6, label: '六代' },
    { value: 7, label: '七代' },
    { value: 8, label: '八代' },
    { value: 9, label: '九代' },
    { value: 10, label: '十代' }
  ]

  const tierFilter = ref(0)

  const filteredHybrids = computed(() => {
    return HYBRID_DEFS.filter(h => {
      const tierMatch = tierFilter.value === 0 || getHybridTier(h.id) === tierFilter.value
      if (!tierMatch) return false
      switch (breedingStore.hybridStatusFilter) {
        case 'discovered':
          return isDiscovered(h.id)
        case 'discoverable':
          return breedingStore.hybridAvailabilityMap[h.id]?.status === 'discoverable'
        case 'near':
          return breedingStore.hybridAvailabilityMap[h.id]?.status === 'near'
        default:
          return true
      }
    })
  })

  const displayedBreedingSeeds = computed(() => breedingStore.visibleBreedingBox)

  const recommendedHybridEntries = computed(() => breedingStore.recommendedHybrids)
  const recommendedTargetLimit = computed(() => (breedingStore.researchLevel >= 1 ? 5 : 3))
  const planningSuggestions = computed<BreedingPlanningSuggestion[]>(() => {
    const planningTargets = new Map<string, { reasons: Set<string>; uses: Set<string> }>()
    const addTarget = (hybridId: string | undefined, reason?: string, useLine?: string) => {
      if (!hybridId) return
      const next = planningTargets.get(hybridId) ?? { reasons: new Set<string>(), uses: new Set<string>() }
      if (reason) next.reasons.add(reason)
      if (useLine) next.uses.add(useLine)
      planningTargets.set(hybridId, next)
    }

    if (currentSpecialOrder.value?.requiredHybridId) {
      addTarget(
        currentSpecialOrder.value.requiredHybridId,
        '当前已接或待接订单正在直接点名该品系。',
        `承接订单：${currentSpecialOrder.value.targetItemName}`
      )
    }
    for (const hybridId of currentSpecialOrder.value?.recommendedHybridIds ?? []) {
      addTarget(hybridId, '当前订单把它列为推荐供货线。', `订单建议：${currentSpecialOrder.value?.targetItemName ?? '当前特殊订单'}`)
    }
    for (const hybridId of goalStore.currentThemeWeek?.breedingFocusHybridIds ?? []) {
      addTarget(hybridId, `本周主题「${goalStore.currentThemeWeek?.name ?? '主题周'}」正在放大该品系。`, `本周主题：${goalStore.currentThemeWeek?.name ?? '主题周'}`)
    }
    for (const hybridId of goalStore.nextThemeWeekPreview?.breedingFocusHybridIds ?? []) {
      addTarget(hybridId, `下周主题「${goalStore.nextThemeWeekPreview?.name ?? '下一主题周'}」会继续放大该品系。`, `下周主题：${goalStore.nextThemeWeekPreview?.name ?? '下一主题周'}`)
    }
    for (const entry of recommendedHybridEntries.value.slice(0, 3)) {
      addTarget(entry.hybrid.id, '这是当前最接近落地的图鉴缺口之一。', '图鉴补全 / 后续特殊订单')
    }

    const relatedBreedingOrders = [
      ...questStore.activeQuests.filter(quest => quest.themeTag === 'breeding'),
      ...(questStore.specialOrder?.themeTag === 'breeding' ? [questStore.specialOrder] : [])
    ]

    const findBestSeedLine = (cropId: string) => {
      const bestSeed = breedingStore.breedingBox
        .filter(seed => seed.genetics.cropId === cropId)
        .sort((left, right) => getTotalStats(right.genetics) - getTotalStats(left.genetics))[0]
      if (!bestSeed) return `${getCropName(cropId)}：当前还没有可用亲本`
      return `${getCropName(cropId)}：${bestSeed.label}（总属性 ${getTotalStats(bestSeed.genetics)}）`
    }

    return [...planningTargets.entries()]
      .map(([hybridId, meta]) => {
        const hybrid = HYBRID_DEFS.find(entry => entry.id === hybridId)
        const availability = breedingStore.hybridAvailabilityMap[hybridId]
        const relatedOrders = relatedBreedingOrders.filter(
          quest => quest.requiredHybridId === hybridId || quest.recommendedHybridIds?.includes(hybridId)
        )
        const logisticsNeedMap = new Map<string, { itemId: string; itemName: string; quantity: number; owned: number }>()

        for (const requirement of relatedOrders.flatMap(quest => quest.comboRequirements ?? [])) {
          if (hybrid && requirement.itemId === hybrid.resultCropId) continue
          const existing = logisticsNeedMap.get(requirement.itemId)
          const quantity = requirement.quantity
          logisticsNeedMap.set(requirement.itemId, {
            itemId: requirement.itemId,
            itemName: requirement.itemName,
            quantity: Math.max(existing?.quantity ?? 0, quantity),
            owned: getCombinedItemCount(requirement.itemId)
          })
        }

        return {
          hybridId,
          targetLabel: hybrid?.name ?? getCropName(hybridId),
          readiness:
            availability?.status === 'discoverable'
              ? 'ready'
              : availability?.status === 'near'
                ? 'near'
                : 'prep',
          currentGapSummary: availability?.recommendation ?? '当前更适合作为稳定量产或认证品系继续推进。',
          reasonLines: [...meta.reasons].slice(0, 3),
          expectedUseLines: [...meta.uses].slice(0, 3),
          parentLines: hybrid ? [findBestSeedLine(hybrid.parentCropA), findBestSeedLine(hybrid.parentCropB)] : [],
          logisticsNeeds: [...logisticsNeedMap.values()]
        } satisfies BreedingPlanningSuggestion
      })
      .sort((left, right) => {
        const weight = (status: BreedingPlanningSuggestion['readiness']) =>
          status === 'ready' ? 0 : status === 'near' ? 1 : 2
        const readinessDiff = weight(left.readiness) - weight(right.readiness)
        if (readinessDiff !== 0) return readinessDiff
        return right.reasonLines.length - left.reasonLines.length
      })
      .slice(0, 4)
  })

  const filteredDiscoveredCount = computed(() => {
    return filteredHybrids.value.filter(h => isDiscovered(h.id)).length
  })

  const totalDiscovered = computed(() => {
    return breedingStore.compendium.length
  })

  const completionPercent = computed(() => {
    if (HYBRID_DEFS.length === 0) return 0
    return Math.floor((totalDiscovered.value / HYBRID_DEFS.length) * 100)
  })

  const tierStats = computed(() => {
    const stats: { tier: number; label: string; total: number; discovered: number }[] = []
    for (let t = 1; t <= 10; t++) {
      const hybrids = HYBRID_DEFS.filter(h => getHybridTier(h.id) === t)
      const discovered = hybrids.filter(h => isDiscovered(h.id)).length
      stats.push({ tier: t, label: `${TIER_LABELS[t]}代`, total: hybrids.length, discovered })
    }
    return stats
  })

  /** 根据阶层给已发现品种上色 */
  const TIER_COLOR_MAP: Record<number, string> = {
    1: 'text-accent',
    2: 'text-quality-fine',
    3: 'text-accent',
    4: 'text-quality-fine',
    5: 'text-quality-excellent',
    6: 'text-quality-excellent',
    7: 'text-quality-supreme',
    8: 'text-quality-supreme',
    9: 'text-quality-supreme',
    10: 'text-quality-supreme'
  }

  const tierColor = (hybridId: string): string => {
    return TIER_COLOR_MAP[getHybridTier(hybridId)] ?? 'text-accent'
  }

  // === 图鉴详情 ===

  const activeHybrid = ref<HybridDef | null>(null)

  // === 种子详情 ===

  const detailSeed = ref<BreedingSeed | null>(null)
  const breedingCommercialTagLabels: Record<BreedingCommercialTag, string> = {
    banquet: '宴席型',
    bulk_supply: '量产型',
    showcase: '展示型',
    storage: '储运型',
    research: '研究型',
    luxury: '高端型'
  }
  const breedingShowcaseTagLabels: Record<BreedingShowcaseTag, string> = {
    tea_showcase: '茶肆陈列',
    festival_display: '节庆展示',
    archive_display: '图鉴档案',
    luxury_display: '高端陈设'
  }

  const openSeedDetail = (seed: BreedingSeed) => {
    detailSeed.value = seed
  }

  const seedAttributes = computed(() => {
    if (!detailSeed.value) return []
    const g = detailSeed.value.genetics
    return [
      { key: 'sweetness', label: '甜度', value: g.sweetness, barClass: 'bg-accent' },
      { key: 'yield', label: '产量', value: g.yield, barClass: 'bg-success' },
      { key: 'resistance', label: '抗性', value: g.resistance, barClass: 'bg-water' },
      { key: 'stability', label: '稳定', value: g.stability, barClass: 'bg-muted' },
      { key: 'mutationRate', label: '变异', value: g.mutationRate, barClass: 'bg-danger' }
    ]
  })
  const detailSeedScoreBreakdown = computed(() => (detailSeed.value ? breedingStore.getBreedingScoreBreakdown(detailSeed.value.genetics) : null))
  const breedingStabilityRankLabel = computed(() => {
    const rank = detailSeedScoreBreakdown.value?.stabilityRank
    return rank ? BREEDING_STABILITY_RANK_LABELS[rank] ?? rank : '未评级'
  })
  const detailSeedContestEligible = computed(() => (detailSeed.value ? breedingStore.contestEligibleSeeds.some(seed => seed.genetics.id === detailSeed.value?.genetics.id) : false))
  const lastBreedingContestWeekLabel = computed(() => {
    const weekId = breedingStore.lastBreedingContestSettlement?.weekId
    return weekId ? formatWeekId(weekId) : ''
  })

  const handleDiscard = () => {
    if (!detailSeed.value) return
    breedingStore.removeFromBox(detailSeed.value.genetics.id)
    addLog('丢弃了一颗育种种子。')
    detailSeed.value = null
  }

  const handleToggleFavorite = () => {
    if (!detailSeed.value) return
    const favorited = breedingStore.toggleFavorite(detailSeed.value.genetics.id)
    addLog(favorited ? '已收藏这颗育种种子。' : '已取消收藏这颗育种种子。')
  }

  const handleToggleBreedingContestRegistration = () => {
    if (!detailSeed.value) return
    const registered = breedingStore.breedingContestState.registeredSeedIds.includes(detailSeed.value.genetics.id)
    const ok = registered
      ? breedingStore.unregisterContestSeed(detailSeed.value.genetics.id)
      : breedingStore.registerContestSeed(detailSeed.value.genetics.id)
    showFloat(ok ? (registered ? '已取消育种周赛报名' : '已报名本周育种周赛') : '当前种子不满足本周育种周赛条件', ok ? 'success' : 'danger')
  }

  // === 育种选种 ===

  const breedingSelectSlot = ref<number | null>(null)
  const selectedSeedIds = ref<string[]>([])

  const openBreedingSelect = (slotIdx: number) => {
    breedingSelectSlot.value = slotIdx
    selectedSeedIds.value = []
  }

  const cancelBreedingSelect = () => {
    breedingSelectSlot.value = null
    selectedSeedIds.value = []
  }

  const toggleSeedSelect = (id: string) => {
    const idx = selectedSeedIds.value.indexOf(id)
    if (idx >= 0) {
      selectedSeedIds.value.splice(idx, 1)
    } else if (selectedSeedIds.value.length < 2) {
      selectedSeedIds.value.push(id)
    }
  }

  /** E: 预期后代属性范围（均值 ± 最大波动） */
  const offspringPreview = computed(() => {
    if (selectedSeedIds.value.length !== 2) return null
    const seedA = breedingStore.breedingBox.find(s => s.genetics.id === selectedSeedIds.value[0])
    const seedB = breedingStore.breedingBox.find(s => s.genetics.id === selectedSeedIds.value[1])
    if (!seedA || !seedB) return null
    const a = seedA.genetics
    const b = seedB.genetics
    const hybrid = a.cropId === b.cropId ? null : findPossibleHybrid(a.cropId, b.cropId)
    const avgSweet = (a.sweetness + b.sweetness) / 2
    const avgYield = (a.yield + b.yield) / 2
    const avgRes = (a.resistance + b.resistance) / 2
    if (hybrid && (avgSweet < hybrid.minSweetness || avgYield < hybrid.minYield)) return null
    const avgStability = (a.stability + b.stability) / 2
    const avgMutationRate = (a.mutationRate + b.mutationRate) / 2
    const fluctuationScale = (avgMutationRate / 50) * (1 - avgStability / 100)
    const maxFluctuation = Math.round(8 * fluctuationScale)
    const midSweet = hybrid
      ? Math.round(hybrid.baseGenetics.sweetness * 0.6 + avgSweet * 0.4)
      : Math.round(avgSweet)
    const midYield = hybrid
      ? Math.round(hybrid.baseGenetics.yield * 0.6 + avgYield * 0.4)
      : Math.round(avgYield)
    const midRes = hybrid
      ? Math.round(hybrid.baseGenetics.resistance * 0.6 + avgRes * 0.4)
      : Math.round(avgRes)
    const newStability = Math.min(Math.round(avgStability) + 3, 95)
    return {
      name: hybrid?.name ?? getCropName(a.cropId),
      sweetness: [Math.max(0, midSweet - maxFluctuation), Math.min(100, midSweet + maxFluctuation)],
      yield: [Math.max(0, midYield - maxFluctuation), Math.min(100, midYield + maxFluctuation)],
      resistance: [Math.max(0, midRes - maxFluctuation), Math.min(100, midRes + maxFluctuation)],
      stability: newStability
    }
  })

  /** B: 从种子箱中递归构建亲本谱系链（最深3代，避免过长） */
  const fromLineageNode = (node: SeedLineageNode, depth: number): (SeedGenetics & { depth: number; lineageTotal?: number })[] => {
    const current: SeedGenetics & { depth: number; lineageTotal?: number } = {
      id: node.id,
      cropId: node.cropId,
      generation: node.generation,
      sweetness: 0,
      yield: 0,
      resistance: 0,
      stability: 0,
      mutationRate: 0,
      parentA: null,
      parentB: null,
      isHybrid: Boolean(node.hybridId),
      hybridId: node.hybridId,
      lineageTotal: node.totalStats,
      depth
    }
    const chain = [current]
    if (depth >= 3) return chain
    for (const parent of node.parents ?? []) {
      chain.push(...fromLineageNode(parent, depth + 1))
    }
    return chain
  }

  const getAncestorChain = (g: SeedGenetics, depth = 0): (SeedGenetics & { depth: number; lineageTotal?: number })[] => {
    if (depth >= 3) return []
    const result: (SeedGenetics & { depth: number; lineageTotal?: number })[] = [{ ...g, depth, lineageTotal: getTotalStats(g) }]
    if (g.lineageParents?.length) {
      for (const parent of g.lineageParents) {
        result.push(...fromLineageNode(parent, depth + 1))
      }
      return result
    }
    if (g.parentA) {
      const pa = breedingStore.breedingBox.find(s => s.genetics.id === g.parentA)
      if (pa) result.push(...getAncestorChain(pa.genetics, depth + 1))
    }
    if (g.parentB) {
      const pb = breedingStore.breedingBox.find(s => s.genetics.id === g.parentB)
      if (pb) result.push(...getAncestorChain(pb.genetics, depth + 1))
    }
    return result
  }

  /** 选中两颗种子时，检查是否存在杂交配方并显示属性要求 */
  const crossBreedHint = computed(() => {
    if (selectedSeedIds.value.length !== 2) return null
    const seedA = breedingStore.breedingBox.find(s => s.genetics.id === selectedSeedIds.value[0])
    const seedB = breedingStore.breedingBox.find(s => s.genetics.id === selectedSeedIds.value[1])
    if (!seedA || !seedB) return null
    const a = seedA.genetics
    const b = seedB.genetics
    if (a.cropId === b.cropId) return { type: 'same' as const }
    const hybrid = findPossibleHybrid(a.cropId, b.cropId)
    if (!hybrid) return { type: 'no_recipe' as const }
    const avgSweet = Math.round((a.sweetness + b.sweetness) / 2)
    const avgYield = Math.round((a.yield + b.yield) / 2)
    const sweetOk = avgSweet >= hybrid.minSweetness
    const yieldOk = avgYield >= hybrid.minYield
    const sweetGap = Math.max(0, hybrid.minSweetness - avgSweet)
    const yieldGap = Math.max(0, hybrid.minYield - avgYield)
    const recommendation = sweetGap > 0 && yieldGap > 0
      ? `甜度还差${sweetGap}点、产量还差${yieldGap}点。建议先继续同种培育 1~2 代后再尝试。`
      : sweetGap > 0
        ? `甜度还差${sweetGap}点。建议优先选择高甜度亲本，继续同种培育提升甜度。`
        : yieldGap > 0
          ? `产量还差${yieldGap}点。建议优先选择高产量亲本，继续同种培育提升产量。`
          : '属性已达标。'
    return {
      type: 'recipe' as const,
      name: hybrid.name,
      avgSweet,
      avgYield,
      minSweet: hybrid.minSweetness,
      minYield: hybrid.minYield,
      sweetGap,
      yieldGap,
      sweetOk,
      yieldOk,
      canSucceed: sweetOk && yieldOk,
      recommendation
    }
  })

  const handleStartBreeding = () => {
    if (breedingSelectSlot.value === null || selectedSeedIds.value.length !== 2) return
    const ok = breedingStore.startBreeding(breedingSelectSlot.value, selectedSeedIds.value[0]!, selectedSeedIds.value[1]!)
    if (ok) {
      const totalDays = breedingStore.stations[breedingSelectSlot.value]?.totalDays ?? 2
      addLog(`育种开始，${totalDays}天后可收取结果。`)
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.breeding)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) {
        handleEndDay()
      }
    } else {
      addLog('育种启动失败。')
    }
    cancelBreedingSelect()
  }

  const handleCollect = (slotIdx: number) => {
    const result = breedingStore.collectResult(slotIdx)
    if (result) {
      const crop = getCropById(result.cropId)
      const stars = getStarRating(result)
      addLog(`收取了育种种子：${crop?.name ?? result.cropId}（${stars}星）。`)
    }
  }

  // === 制造育种台 ===

  const showCraftModal = ref(false)

  const canCraftStation = computed(() => {
    return breedingStore.canCraftStation(playerStore.money, (id: string) => getCombinedItemCount(id))
  })

  const craftMaterials = computed(() => {
    return BREEDING_STATION_COST.materials.map(m => ({
      itemId: m.itemId,
      name: getItemById(m.itemId)?.name ?? m.itemId,
      required: m.quantity,
      owned: getCombinedItemCount(m.itemId),
      enough: getCombinedItemCount(m.itemId) >= m.quantity
    }))
  })

  const handleCraftStation = () => {
    if (!canCraftStation.value) return
    breedingStore.craftStation(
      (amount: number) => playerStore.spendMoney(amount),
      (id: string, qty: number) => removeCombinedItem(id, qty)
    )
    addLog('建造了一台育种台。')
    showCraftModal.value = false
    const tr = gameStore.advanceTime(ACTION_TIME_COSTS.breeding)
    if (tr.message) addLog(tr.message)
    if (tr.passedOut) {
      handleEndDay()
    }
  }

  // === 种子箱升级 ===

  const showSeedBoxUpgradeModal = ref(false)
  const showSeedBoxUpgradeConfirm = ref(false)

  const nextSeedBoxUpgrade = computed(() => breedingStore.getNextSeedBoxUpgrade())
  const nextResearchUpgrade = computed(() => breedingStore.getNextResearchUpgrade())

  const canUpgradeSeedBox = computed(() => {
    return breedingStore.canUpgradeSeedBox(playerStore.money, (id: string) => getCombinedItemCount(id))
  })

  const canUpgradeResearch = computed(() => {
    return breedingStore.canUpgradeResearch(playerStore.money, (id: string) => getCombinedItemCount(id))
  })

  const handleSeedBoxUpgrade = () => {
    const result = breedingStore.upgradeSeedBox(
      (amount: number) => playerStore.spendMoney(amount),
      (id: string, qty: number) => removeCombinedItem(id, qty)
    )
    addLog(result.message)
    if (result.success) {
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.breeding)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) handleEndDay()
    }
    showSeedBoxUpgradeConfirm.value = false
    showSeedBoxUpgradeModal.value = false
  }

  const handleUpgradeResearch = () => {
    const result = breedingStore.upgradeResearch(
      (amount: number) => playerStore.spendMoney(amount),
      (id: string, qty: number) => removeCombinedItem(id, qty)
    )
    addLog(result.message)
    if (result.success) {
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.breeding)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) handleEndDay()
    }
  }

  // === 图鉴 ===

  const isDiscovered = (hybridId: string): boolean => {
    return breedingStore.compendium.some(e => e.hybridId === hybridId)
  }

  const getCompendiumEntry = (hybridId: string) => {
    return breedingStore.compendium.find(e => e.hybridId === hybridId) ?? null
  }
  const getCertificationRecord = (hybridId: string) => breedingStore.getCertificationRecord(hybridId)

  // === 辅助 ===

  const getCropName = (cropId: string): string => {
    return getCropById(cropId)?.name ?? cropId
  }

  const seedStarColor = (g: { sweetness: number; yield: number; resistance: number }): string => {
    const total = g.sweetness + g.yield + g.resistance
    if (total >= 250) return 'text-quality-supreme'
    if (total >= 200) return 'text-quality-excellent'
    if (total >= 150) return 'text-quality-fine'
    return ''
  }
</script>
