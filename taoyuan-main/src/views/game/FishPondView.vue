<template>
  <div>
    <GuidanceDigestPanel surface-id="fishpond" title="鱼塘经营引导" />
    <QaGovernancePanel page-id="fishpond" title="鱼塘治理总览" />
    <!-- 标题 -->
    <div class="flex items-center justify-between mb-1">
      <div class="flex items-center space-x-1.5 text-sm text-accent">
        <Waves :size="14" />
        <span>鱼塘</span>
      </div>
      <span v-if="!fishPondStore.pond.built" class="text-xs text-muted">{{ fishPondStore.fishCount }}/{{ fishPondStore.capacity }}</span>
    </div>

    <!-- 未建造 -->
    <div v-if="!fishPondStore.pond.built" class="border border-accent/10 rounded-xs py-6 flex flex-col items-center space-y-2">
      <Waves :size="32" class="text-muted/30" />
      <p class="text-xs text-muted">尚未建造鱼塘</p>
      <p class="text-xs text-muted/60">建造鱼塘后可养殖鱼类、繁殖收获</p>
      <Button :icon="Hammer" :icon-size="12" @click="pondModal = 'build'">建造鱼塘</Button>
    </div>

    <!-- 已建造 -->
    <template v-else>
      <!-- 两栏切换 -->
      <div class="flex space-x-1 mb-3">
        <Button class="flex-1 justify-center" :class="{ '!bg-accent !text-bg': currentTab === 'pond' }" @click="currentTab = 'pond'">
          鱼塘
        </Button>
        <Button
          class="flex-1 justify-center"
          :class="{ '!bg-accent !text-bg': currentTab === 'compendium' }"
          @click="currentTab = 'compendium'"
        >
          图鉴 {{ fishPondStore.discoveredBreeds.size }}/{{ totalBreedCount }}
        </Button>
      </div>

      <!-- ===== 鱼塘 Tab ===== -->
      <template v-if="currentTab === 'pond'">
        <!-- 状态总览 -->
        <div class="mb-3">
          <div class="flex items-center justify-between mb-1.5">
            <Divider>鱼塘 Lv.{{ fishPondStore.pond.level }}</Divider>
            <div class="flex items-center space-x-2">
              <span class="text-xs text-muted">{{ fishPondStore.fishCount }}/{{ fishPondStore.capacity }}</span>
              <Button v-if="fishPondStore.pond.level < 5" :icon="ArrowUp" :icon-size="12" @click="pondModal = 'upgrade'">升级</Button>
            </div>
          </div>

          <!-- 水质条 -->
          <div class="border border-accent/20 rounded-xs px-3 py-2">
            <div class="flex items-center space-x-2 mb-1.5">
              <span class="text-xs text-muted shrink-0">水质</span>
              <div class="flex-1 h-1 bg-bg rounded-xs border border-accent/10">
                <div
                  class="h-full rounded-xs transition-all"
                  :class="waterQualityColor"
                  :style="{ width: fishPondStore.pond.waterQuality + '%' }"
                />
              </div>
              <span class="text-xs whitespace-nowrap" :class="waterQualityTextColor">{{ fishPondStore.pond.waterQuality }}%</span>
            </div>
            <!-- 操作按钮 -->
            <div class="flex flex-wrap space-x-1">
              <Button
                :icon="Droplets"
                :icon-size="12"
                :disabled="fishPondStore.pond.fedToday || fishPondStore.pond.fish.length === 0"
                @click="handleFeed"
              >
                {{ fishPondStore.pond.fedToday ? '已喂食' : '喂食' }}
              </Button>
              <Button :icon="Sparkles" :icon-size="12" @click="handleClean">改良水质</Button>
              <Button v-if="fishPondStore.sickFish.length > 0" :icon="HeartPulse" :icon-size="12" @click="handleTreat">
                治疗 ({{ fishPondStore.sickFish.length }})
              </Button>
              <Button
                v-if="fishPondStore.pendingProducts.length > 0"
                :icon="Package"
                :icon-size="12"
                :disabled="fishPondStore.pond.collectedToday"
                @click="handleCollect"
              >
                收获 ({{ fishPondStore.pendingProducts.length }})
              </Button>
            </div>
          </div>

          <div v-if="fishPondStore.currentPondContestDef" class="border border-accent/20 rounded-xs px-3 py-2 mt-2 bg-accent/5">
            <div class="flex items-center justify-between gap-2">
              <div>
                <p class="text-xs text-accent">本周鱼塘周赛</p>
                <p class="text-[10px] text-muted mt-0.5">{{ fishPondStore.currentPondContestDef.label }} · {{ fishPondStore.currentPondContestDef.description }}</p>
              </div>
              <span class="text-[10px] text-muted">已报名 {{ fishPondStore.pondContestState.registeredFishIds.length }}</span>
            </div>
            <p class="text-[10px] text-muted mt-2">
              评分维度：{{ fishPondStore.currentPondContestDef.scoringMetric }} ·
              {{ fishPondStore.currentPondContestDef.requireMature ? '需成熟' : '不要求成熟' }} ·
              {{ fishPondStore.currentPondContestDef.requireHealthy ? '需健康' : '不要求健康' }}
            </p>
            <p v-if="fishPondStore.lastPondContestSettlement?.weekId" class="text-[10px] text-accent mt-1">
              上周结算：{{ fishPondStore.lastPondContestSettlement.weekId }} · 冠军 {{ fishPondStore.lastPondContestSettlement.winner?.fishName ?? '无' }}
            </p>
          </div>

          <div v-if="fishPondStore.currentThemeWeekPondFocus" class="border border-success/20 rounded-xs px-3 py-2 mt-2 bg-success/5">
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs text-success">主题周承接</p>
              <span class="text-[10px] text-muted">{{ fishPondStore.currentThemeWeekPondFocus.name }}</span>
            </div>
            <p class="text-[10px] text-muted mt-1">{{ fishPondStore.currentThemeWeekPondFocus.summary }}</p>
          </div>

          <div class="border border-accent/20 rounded-xs px-3 py-2 mt-2">
            <div class="flex items-center justify-between gap-2">
              <div>
                <p class="text-xs text-accent">高阶养护</p>
                <p class="text-[10px] text-muted mt-0.5">高评分样鱼会额外消耗水质承压，观赏饲料与高级净水剂会直接影响周赛和展示表现。</p>
              </div>
              <span class="text-[10px] text-muted">高阶样鱼 {{ fishPondStore.highTierFishRatings.length }}</span>
            </div>
            <p class="text-[10px] text-muted mt-2">
              观赏饲料：{{ fishPondStore.maintenanceState.ornamentalFeedBuffDays > 0 ? '生效中' : '未启用' }}
              <span class="text-accent/60"> · </span>
              隔离净水：{{ fishPondStore.maintenanceState.quarantineShieldDays > 0 ? `${fishPondStore.maintenanceState.quarantineShieldDays} 天` : '未启用' }}
            </p>
            <div class="flex flex-wrap gap-1 mt-2">
              <Button :icon="Star" :icon-size="12" @click="handleOrnamentalFeed">使用观赏饲料</Button>
              <Button :icon="Sparkles" :icon-size="12" @click="handleAdvancedPurifier">使用高级净水剂</Button>
            </div>
          </div>

          <div class="border border-accent/20 rounded-xs px-3 py-2 mt-2">
            <div class="flex items-center justify-between gap-2">
              <div>
                <p class="text-xs text-accent">展示池 / 观赏缸</p>
                <p class="text-[10px] text-muted mt-0.5">展示池记录镜像快照，不移动原鱼对象；展示中的样鱼会反向抬高周赛与博物馆展陈收益。</p>
              </div>
              <span class="text-[10px] text-muted">{{ fishPondStore.displayOverview.entryCount }}/{{ fishPondStore.displayOverview.slotLimit }}</span>
            </div>
            <p class="text-[10px] text-success mt-2">
              博物馆展陈加分 {{ fishPondStore.displayOverview.museumDisplayBonus }} · 展示总观赏值 {{ fishPondStore.displayOverview.totalShowValue }}
            </p>
            <div v-if="fishPondStore.displayEntries.length > 0" class="space-y-1 mt-2">
              <div v-for="entry in fishPondStore.displayEntries" :key="`display-${entry.pondFishId}`" class="border border-accent/10 rounded-xs px-2 py-1.5 bg-bg/10">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs text-text">{{ entry.fishName }}</span>
                  <span class="text-[10px] text-accent">观赏 {{ entry.snapshotShowValue }} / 总评 {{ entry.snapshotScore }}</span>
                </div>
                <p class="text-[10px] text-muted mt-1">快照代数 {{ entry.snapshotGeneration }} · 录入于 {{ entry.assignedAtDayTag || '当日' }}</p>
              </div>
            </div>
            <p v-else class="text-[10px] text-muted mt-2">还没有放入展示池的样鱼，可在鱼详情中把高评分成熟样鱼挂上展示。</p>
          </div>

          <div v-if="pondEligibilityCards.length > 0" class="border border-accent/20 rounded-xs px-3 py-2 mt-2">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs text-accent">经营评级 / 资格快照</span>
              <span class="text-[10px] text-muted">按当前鱼塘个体自动汇总</span>
            </div>
            <div class="space-y-1.5">
              <div v-for="entry in pondEligibilityCards" :key="`eligibility-${entry.fishId}`" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs text-text">{{ entry.fishName }}</span>
                  <span class="text-[10px] text-accent">最高 {{ entry.bestTotalScore }}</span>
                </div>
                <p class="text-[10px] text-muted mt-1">
                  成熟/健康 {{ entry.matureCount }}/{{ entry.healthyCount }} · 可直接交付 {{ entry.matureHealthyCount }} · 观赏 {{ entry.bestShowValue }} · 食用 {{ entry.bestFoodValue }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- 塘中鱼类 -->
        <div class="mb-3">
          <Divider label="塘中鱼类" />

          <!-- 空状态 -->
          <div
            v-if="fishPondStore.pond.fish.length === 0"
            class="border border-accent/10 rounded-xs py-6 flex flex-col items-center space-y-2"
          >
            <Fish :size="32" class="text-muted/30" />
            <p class="text-xs text-muted">鱼塘空空如也</p>
            <p class="text-xs text-muted/60">从背包中放入鱼苗开始养殖</p>
          </div>

          <!-- 鱼列表 -->
          <div v-else class="flex flex-col space-y-1.5 max-h-80 overflow-auto">
            <div
              v-for="fish in fishPondStore.pond.fish"
              :key="fish.id"
              class="border rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5 transition-colors mr-1"
              :class="
                fish.sick ? 'border-danger/30' : selectedBreedingFish?.id === fish.id ? 'border-accent bg-accent/10' : 'border-accent/20'
              "
              @click="openFishDetail(fish)"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-1.5">
                  <Waves v-if="fish.mature && !fish.sick" :size="12" class="text-success" />
                  <HeartPulse v-else-if="fish.sick" :size="12" class="text-danger" />
                  <Fish v-else :size="12" class="text-muted/40" />
                  <span class="text-xs" :class="fish.sick ? 'text-danger' : fish.mature ? 'text-text' : 'text-muted'">
                    {{ fish.name }}
                  </span>
                  <span v-if="fish.sick" class="text-[10px] text-danger">[病]</span>
                  <span v-if="!fish.mature" class="text-[10px] text-muted">[幼]</span>
                </div>
                <div class="flex items-center space-x-2">
                  <span class="text-[10px] text-accent flex items-center space-x-px">
                    <Star v-for="n in fishPondStore.getGeneticStarRating(fish.genetics)" :key="n" :size="10" />
                  </span>
                  <span class="text-[10px] text-accent/80">总评 {{ getFishRating(fish)?.totalScore ?? 0 }}</span>
                  <span class="text-[10px] text-muted">{{ fish.daysInPond }}天</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 放入鱼苗 -->
        <div class="mb-3">
          <Divider label="放入鱼苗" />
          <div v-if="pondableFishInBag.length > 0" class="flex flex-col space-y-1.5 max-h-80 overflow-auto">
            <div
              v-for="item in pondableFishInBag"
              :key="item.itemId"
              class="border border-accent/20 rounded-xs px-3 py-2 flex items-center justify-between mr-1"
            >
              <span class="text-xs">
                {{ item.name }}
                <span class="text-muted">&times;{{ item.count }}</span>
              </span>
              <Button :icon-size="12" @click="handleAddFish(item.itemId)">放入</Button>
            </div>
          </div>
          <div v-else class="border border-accent/10 rounded-xs py-6 flex flex-col items-center space-y-2">
            <Package :size="32" class="text-muted/30" />
            <p class="text-xs text-muted">背包中没有可养殖的鱼</p>
            <p class="text-xs text-muted/60">在清溪钓鱼后可放入鱼塘养殖</p>
          </div>
        </div>

        <!-- 繁殖 -->
        <div class="mb-3">
          <Divider label="繁殖" />
          <!-- 繁殖中 -->
          <div v-if="fishPondStore.pond.breeding" class="border border-accent/20 rounded-xs px-3 py-2">
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center space-x-1.5">
                <Heart :size="12" class="text-accent" />
                <span class="text-xs text-accent">繁殖中</span>
              </div>
              <span class="text-xs text-muted">{{ fishPondStore.pond.breeding.daysLeft }}/{{ breedingTotalDays }}天</span>
            </div>
            <div class="h-1 bg-bg rounded-xs border border-accent/10">
              <div class="h-full rounded-xs bg-accent transition-all" :style="{ width: breedingProgress + '%' }" />
            </div>
            <p class="text-[10px] text-muted mt-1">品种：{{ getPondableFishName(fishPondStore.pond.breeding.fishId) }}</p>
          </div>
          <!-- 已选择一条 -->
          <div v-else-if="selectedBreedingFish" class="border border-accent/20 rounded-xs px-3 py-2">
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center space-x-1.5">
                <Heart :size="12" class="text-muted/40" />
                <span class="text-xs">
                  已选：{{ selectedBreedingFish.name }}
                  <span class="text-accent inline-flex items-center space-x-px">
                    <Star v-for="n in fishPondStore.getGeneticStarRating(selectedBreedingFish.genetics)" :key="n" :size="10" />
                  </span>
                </span>
              </div>
              <Button @click="selectedBreedingFish = null">取消</Button>
            </div>
            <p class="text-[10px] text-muted">请从鱼列表中点击同种成熟鱼进行配对</p>
          </div>
          <!-- 空状态 -->
          <div v-else class="border border-accent/10 rounded-xs py-6 flex flex-col items-center space-y-2">
            <Heart :size="32" class="text-muted/30" />
            <p class="text-xs text-muted">选择两条同种成熟鱼开始繁殖</p>
            <p class="text-xs text-muted/60">需要鱼塘有空余容量</p>
          </div>
        </div>
      </template>

      <!-- ===== 图鉴 Tab ===== -->
      <template v-if="currentTab === 'compendium'">
        <!-- 代数筛选 -->
        <div class="grid grid-cols-5 space-x-1 mb-2">
          <Button
            v-for="g in 5"
            :key="g"
            class="grow shrink-0 basis-[calc(20%-3px)] justify-center"
            :class="{ '!bg-accent !text-bg': compendiumGen === g }"
            @click="compendiumGen = g as 1 | 2 | 3 | 4 | 5"
          >
            {{ g }}代
          </Button>
        </div>

        <!-- 进度 -->
        <p class="text-xs text-muted mb-2">已发现 {{ discoveredCountByGen(compendiumGen) }}/{{ BREED_COUNTS[compendiumGen] }}</p>

        <!-- 提示 -->
        <div v-if="compendiumGen > 1" class="border border-accent/10 rounded-xs p-2 mb-2">
          <p class="text-xs text-muted leading-relaxed">
            <span class="text-accent">{{ compendiumGen }}代</span>
            品种需要配对特定的
            <span class="text-accent">{{ compendiumGen - 1 }}代</span>
            品种繁殖获得。
          </p>
        </div>

        <!-- 品种网格 -->
        <div class="grid grid-cols-5 gap-1 p-2 max-h-[50vh] overflow-auto">
          <div
            v-for="breed in currentGenBreeds"
            :key="breed.breedId"
            class="border rounded-xs p-1.5 text-xs text-center transition-colors truncate"
            :class="isDiscovered(breed.breedId) ? 'border-accent/20 ' + genColor(compendiumGen) : 'border-accent/10 text-muted/30'"
          >
            <template v-if="isDiscovered(breed.breedId)">{{ breed.name }}</template>
            <Lock v-else :size="12" class="mx-auto text-muted/30" />
          </div>
        </div>

        <!-- 完成度 -->
        <div class="mt-3 border border-accent/20 rounded-xs p-2">
          <div class="flex items-center space-x-2 text-xs mb-1.5">
            <span class="text-xs text-muted shrink-0">完成度</span>
            <div class="flex-1 h-1 bg-bg rounded-xs border border-accent/10">
              <div class="h-full bg-accent rounded-xs transition-all" :style="{ width: completionPercent + '%' }" />
            </div>
            <span class="text-xs text-accent whitespace-nowrap">{{ fishPondStore.discoveredBreeds.size }}/{{ totalBreedCount }}</span>
          </div>
          <div class="grid grid-cols-2 gap-x-3 gap-y-0.5">
            <div v-for="g in 5" :key="g" class="flex items-center justify-between">
              <span class="text-xs text-muted">{{ g }}代</span>
              <span class="text-xs">{{ discoveredCountByGen(g) }}/{{ BREED_COUNTS[g] }}</span>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- 鱼详情弹窗 -->
    <Transition name="panel-fade">
      <div v-if="detailFish" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="detailFish = null">
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="detailFish = null">
            <X :size="14" />
          </button>

          <p class="text-sm text-accent mb-2">{{ detailFish.name }}</p>
          <p class="text-xs mb-2 flex items-center space-x-1">
            <span class="text-accent flex items-center space-x-px">
              <Star v-for="n in fishPondStore.getGeneticStarRating(detailFish.genetics)" :key="n" :size="10" />
            </span>
            <span class="text-muted">·</span>
            <span class="text-muted">第{{ detailFish.daysInPond }}天</span>
            <span v-if="detailFish.sick" class="text-danger">· 生病中</span>
            <span v-if="!detailFish.mature" class="text-muted">· 未成熟</span>
          </p>

          <!-- 基因条 -->
          <div class="flex flex-col space-y-1 mb-3">
            <div v-for="attr in fishAttributes" :key="attr.key" class="flex items-center space-x-2">
              <span class="text-xs text-muted w-10 shrink-0">{{ attr.label }}</span>
              <div class="flex-1 h-1.5 bg-bg rounded-xs border border-accent/10">
                <div class="h-full rounded-xs transition-all" :class="attr.barClass" :style="{ width: attr.value + '%' }" />
              </div>
              <span class="text-xs w-6 text-right">{{ attr.value }}</span>
            </div>
          </div>

          <div v-if="detailFishRating" class="border border-accent/10 rounded-xs p-2 mb-3 bg-bg/10">
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs text-accent">统一评级</p>
              <span class="text-[10px] text-muted">总评 {{ detailFishRating.totalScore }}</span>
            </div>
            <div class="grid grid-cols-2 gap-2 mt-2">
              <div class="text-[10px] text-muted">世代：<span class="text-accent">{{ detailFishRating.generation }}</span></div>
              <div class="text-[10px] text-muted">稳定：<span class="text-accent">{{ detailFishRating.stabilityScore }}</span></div>
              <div class="text-[10px] text-muted">观赏：<span class="text-accent">{{ detailFishRating.showValue }}</span></div>
              <div class="text-[10px] text-muted">食用：<span class="text-accent">{{ detailFishRating.foodValue }}</span></div>
              <div class="text-[10px] text-muted col-span-2">健康：<span class="text-accent">{{ detailFishRating.healthScore }}</span></div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="flex flex-col space-y-1">
            <Button
              v-if="detailFishContestEligible"
              class="w-full justify-center"
              :icon="Star"
              :icon-size="12"
              @click="handleToggleContestRegistration"
            >
              {{ fishPondStore.pondContestState.registeredFishIds.includes(detailFish.id) ? '取消周赛报名' : '报名本周周赛' }}
            </Button>
            <Button
              v-if="detailFish.mature && !detailFish.sick"
              class="w-full justify-center"
              :class="{ '!bg-accent !text-bg': !fishPondStore.pond.breeding }"
              :icon="Heart"
              :icon-size="12"
              :disabled="!!fishPondStore.pond.breeding"
              @click="handleDetailBreed"
            >
              选为繁殖亲本
            </Button>
            <Button
              v-if="detailFishRating"
              class="w-full justify-center"
              :icon="Sparkles"
              :icon-size="12"
              @click="handleToggleDisplayFish"
            >
              {{ fishPondStore.displayEntries.some(entry => entry.pondFishId === detailFish?.id) ? '移出展示池' : '加入展示池' }}
            </Button>
            <Button class="w-full justify-center" :icon="ArrowUp" :icon-size="12" @click="handleDetailRemove">取出到背包</Button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 建造/升级弹窗 -->
    <Transition name="panel-fade">
      <div v-if="pondModal" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="pondModal = null">
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="pondModal = null">
            <X :size="14" />
          </button>

          <p class="text-sm text-accent mb-2">{{ modalTitle }}</p>

          <!-- 等级信息 -->
          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">{{ pondModal === 'build' ? '等级' : '当前等级' }}</span>
              <span class="text-xs">Lv.{{ modalCurrentLevel }}</span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">{{ pondModal === 'build' ? '初始容量' : '当前容量' }}</span>
              <span class="text-xs">{{ modalCurrentCapacity }}</span>
            </div>
          </div>

          <!-- 升级后信息（仅升级时显示） -->
          <div v-if="pondModal === 'upgrade'" class="border border-accent/10 rounded-xs p-2 mb-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">升级至</span>
              <span class="text-xs text-accent">Lv.{{ modalTargetLevel }}</span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">升级后容量</span>
              <span class="text-xs text-accent">{{ modalTargetCapacity }}</span>
            </div>
          </div>

          <!-- 所需材料 -->
          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted mb-1">所需材料</p>
            <div v-for="mat in modalMaterials" :key="mat.itemId" class="flex items-center justify-between mt-0.5">
              <span class="text-xs">{{ mat.name }}</span>
              <span class="text-xs" :class="mat.enough ? 'text-success' : 'text-danger'">{{ mat.owned }}/{{ mat.required }}</span>
            </div>
          </div>

          <!-- 费用 -->
          <div class="border border-accent/10 rounded-xs p-2 mb-3">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">费用</span>
              <span class="text-xs" :class="playerStore.money >= modalMoney ? 'text-accent' : 'text-danger'">{{ modalMoney }}文</span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">当前持有</span>
              <span class="text-xs">{{ playerStore.money }}文</span>
            </div>
          </div>

          <Button
            class="w-full justify-center"
            :class="{ '!bg-accent !text-bg': canConfirmModal }"
            :icon="pondModal === 'build' ? Hammer : ArrowUp"
            :icon-size="12"
            :disabled="!canConfirmModal"
            @click="handleModalConfirm"
          >
            {{ pondModal === 'build' ? '确认建造' : '确认升级' }}
          </Button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { Waves, Droplets, Sparkles, HeartPulse, Package, ArrowUp, Hammer, Lock, Fish, Heart, X, Star } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import Divider from '@/components/game/Divider.vue'
  import GuidanceDigestPanel from '@/components/game/GuidanceDigestPanel.vue'
  import QaGovernancePanel from '@/components/game/QaGovernancePanel.vue'
  import { useFishPondStore } from '@/stores/useFishPondStore'
  import { useInventoryStore } from '@/stores/useInventoryStore'
  import { useGameStore } from '@/stores/useGameStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import { addLog, showFloat } from '@/composables/useGameLog'
  import { handleEndDay } from '@/composables/useEndDay'
  import { ACTION_TIME_COSTS } from '@/data/timeConstants'
  import { POND_BUILD_COST, POND_UPGRADE_COSTS, POND_CAPACITY, PONDABLE_FISH, getPondableFish, FISH_BREEDING_DAYS } from '@/data/fishPond'
  import { getBreedsByGeneration, BREED_COUNTS } from '@/data/pondBreeds'
  import { getItemById } from '@/data/items'
  import type { PondFish } from '@/types/fishPond'

  const fishPondStore = useFishPondStore()
  const inventoryStore = useInventoryStore()
  const gameStore = useGameStore()
  const playerStore = usePlayerStore()

  const currentTab = ref<'pond' | 'compendium'>('pond')
  const selectedBreedingFish = ref<PondFish | null>(null)
  const detailFish = ref<PondFish | null>(null)
  const compendiumGen = ref<1 | 2 | 3 | 4 | 5>(1)

  /** 建造/升级统一弹窗 */
  const pondModal = ref<'build' | 'upgrade' | null>(null)

  const getItemName = (itemId: string): string => getItemById(itemId)?.name ?? itemId
  const getPondableFishName = (fishId: string): string => getPondableFish(fishId)?.name ?? fishId

  const totalBreedCount = 400

  const isDiscovered = (breedId: string): boolean => fishPondStore.discoveredBreeds.has(breedId)

  const discoveredCountByGen = (gen: number): number => {
    const breeds = getBreedsByGeneration(gen as 1 | 2 | 3 | 4 | 5)
    return breeds.filter(b => fishPondStore.discoveredBreeds.has(b.breedId)).length
  }

  const currentGenBreeds = computed(() => getBreedsByGeneration(compendiumGen.value))

  /** 图鉴完成度 */
  const completionPercent = computed(() => {
    return Math.floor((fishPondStore.discoveredBreeds.size / totalBreedCount) * 100)
  })

  /** 代数颜色 */
  const genColor = (gen: number): string => {
    if (gen >= 5) return 'text-quality-supreme'
    if (gen >= 4) return 'text-quality-excellent'
    if (gen >= 3) return 'text-quality-fine'
    return 'text-accent'
  }

  /** 水质条颜色 */
  const waterQualityColor = computed(() => {
    const wq = fishPondStore.pond.waterQuality
    if (wq >= 70) return 'bg-success'
    if (wq >= 30) return 'bg-accent'
    return 'bg-danger'
  })

  /** 水质文字颜色 */
  const waterQualityTextColor = computed(() => {
    const wq = fishPondStore.pond.waterQuality
    if (wq >= 70) return 'text-success'
    if (wq >= 30) return 'text-accent'
    return 'text-danger'
  })

  /** 繁殖进度 */
  const breedingTotalDays = FISH_BREEDING_DAYS
  const breedingProgress = computed(() => {
    if (!fishPondStore.pond.breeding) return 0
    return ((breedingTotalDays - fishPondStore.pond.breeding.daysLeft) / breedingTotalDays) * 100
  })

  // === 建造/升级统一弹窗 ===

  const upgradeNextLevel = computed(() => Math.min(fishPondStore.pond.level + 1, 5) as 2 | 3 | 4 | 5)

  const modalTitle = computed(() => (pondModal.value === 'build' ? '建造鱼塘' : '鱼塘升级'))

  const modalCurrentLevel = computed(() => (pondModal.value === 'build' ? 1 : fishPondStore.pond.level))

  const modalCurrentCapacity = computed(() => (pondModal.value === 'build' ? POND_CAPACITY[1] : fishPondStore.capacity))

  const modalTargetLevel = computed(() => upgradeNextLevel.value)

  const modalTargetCapacity = computed(() => POND_CAPACITY[upgradeNextLevel.value])

  const modalMoney = computed(() =>
    pondModal.value === 'build' ? POND_BUILD_COST.money : POND_UPGRADE_COSTS[upgradeNextLevel.value].money
  )

  const modalMaterials = computed(() => {
    const mats = pondModal.value === 'build' ? POND_BUILD_COST.materials : POND_UPGRADE_COSTS[upgradeNextLevel.value].materials
    return mats.map(m => ({
      itemId: m.itemId,
      name: getItemName(m.itemId),
      required: m.quantity,
      owned: inventoryStore.getItemCount(m.itemId),
      enough: inventoryStore.getItemCount(m.itemId) >= m.quantity
    }))
  })

  const canConfirmModal = computed(() => {
    if (playerStore.money < modalMoney.value) return false
    return modalMaterials.value.every(m => m.enough)
  })

  const handleModalConfirm = () => {
    if (pondModal.value === 'build') {
      if (fishPondStore.buildPond()) {
        addLog('鱼塘建造完成！')
        showFloat('鱼塘建造完成！', 'success')
        pondModal.value = null
      } else {
        addLog('材料或铜钱不足，无法建造鱼塘。')
      }
    } else {
      const nextLevel = (fishPondStore.pond.level + 1) as 2 | 3 | 4 | 5
      if (fishPondStore.upgradePond()) {
        addLog(`鱼塘升级到 Lv.${nextLevel}！容量提升。`)
        showFloat(`鱼塘升级 Lv.${nextLevel}`, 'success')
        pondModal.value = null
      } else {
        addLog('材料或铜钱不足，无法升级。')
      }
    }
  }

  /** 背包中可放入鱼塘的鱼 */
  const pondableFishInBag = computed(() => {
    const result: { itemId: string; name: string; count: number }[] = []
    for (const def of PONDABLE_FISH) {
      const count = inventoryStore.getItemCount(def.fishId)
      if (count > 0) {
        result.push({ itemId: def.fishId, name: def.name, count })
      }
    }
    return result
  })

  const pondEligibilityCards = computed(() => fishPondStore.pondEligibilitySnapshots.slice(0, 3))
  const detailFishRating = computed(() => (detailFish.value ? fishPondStore.getPondFishRatingSnapshot(detailFish.value.id) : null))
  const getFishRating = (fish: PondFish) => fishPondStore.getPondFishRatingSnapshot(fish.id)
  const detailFishContestEligible = computed(() => (detailFish.value ? fishPondStore.contestEligibleFish.some(entry => entry.fishInstanceId === detailFish.value?.id) : false))

  /** 鱼详情弹窗属性条 */
  const fishAttributes = computed(() => {
    if (!detailFish.value) return []
    const g = detailFish.value.genetics
    return [
      { key: 'weight', label: '体重', value: g.weight, barClass: 'bg-accent' },
      { key: 'growthRate', label: '生长', value: g.growthRate, barClass: 'bg-success' },
      { key: 'diseaseRes', label: '抗病', value: g.diseaseRes, barClass: 'bg-water' },
      { key: 'qualityGene', label: '品质', value: g.qualityGene, barClass: 'bg-quality-fine' },
      { key: 'mutationRate', label: '变异', value: g.mutationRate, barClass: 'bg-danger' }
    ]
  })

  /** 打开鱼详情 */
  const openFishDetail = (fish: PondFish) => {
    detailFish.value = fish
  }

  /** 弹窗内选为繁殖亲本 */
  const handleDetailBreed = () => {
    if (!detailFish.value) return
    handleSelectForBreeding(detailFish.value)
    detailFish.value = null
  }

  /** 弹窗内取出到背包 */
  const handleDetailRemove = () => {
    if (!detailFish.value) return
    handleRemoveFish(detailFish.value.id)
    detailFish.value = null
  }

  const handleToggleContestRegistration = () => {
    if (!detailFish.value) return
    const registered = fishPondStore.pondContestState.registeredFishIds.includes(detailFish.value.id)
    const ok = registered ? fishPondStore.unregisterContestFish(detailFish.value.id) : fishPondStore.registerContestFish(detailFish.value.id)
    if (ok) {
      showFloat(registered ? '已取消周赛报名' : '已报名本周周赛', 'success')
    } else {
      showFloat('当前样本不满足本周周赛报名条件', 'danger')
    }
  }

  const handleToggleDisplayFish = () => {
    if (!detailFish.value) return
    const assigned = fishPondStore.displayEntries.some(entry => entry.pondFishId === detailFish.value?.id)
    const ok = assigned ? fishPondStore.removeDisplayFish(detailFish.value.id) : fishPondStore.assignDisplayFish(detailFish.value.id)
    if (ok) {
      showFloat(assigned ? '已移出展示池' : '已加入展示池', 'success')
    } else {
      showFloat('当前样鱼暂不满足展示池条件', 'danger')
    }
  }

  // === 操作 ===

  const handleOrnamentalFeed = () => {
    const ok = fishPondStore.useOrnamentalFeed()
    if (ok) {
      addLog('已为高评分样鱼投喂观赏饲料，本日周赛与展示表现会更稳定。')
      showFloat('观赏饲料生效', 'success')
    } else {
      addLog('当前没有可承接高阶养护的样鱼，或今日已使用过观赏饲料。')
    }
  }

  const handleAdvancedPurifier = () => {
    const ok = fishPondStore.useAdvancedPurifier()
    if (ok) {
      addLog('已投入高级净水剂，高评分样鱼的隔离与水质压力暂时缓解。')
      showFloat('高级净水剂生效', 'success')
    } else {
      addLog('当前没有可承接高阶养护的样鱼，或今日已使用过高级净水剂。')
    }
  }

  const handleFeed = () => {
    if (fishPondStore.feedFish()) {
      addLog('喂食了鱼塘中的鱼。')
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.feedFish)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) handleEndDay()
    } else if (fishPondStore.pond.fedToday) {
      addLog('今天已经喂过了。')
    } else {
      addLog('没有鱼饲料，无法喂食。')
    }
  }

  const handleClean = () => {
    if (fishPondStore.cleanPond()) {
      addLog('使用水质改良剂清理了鱼塘。')
      showFloat('+水质', 'success')
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.cleanPond)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) handleEndDay()
    } else {
      addLog('没有水质改良剂。')
    }
  }

  const handleTreat = () => {
    const count = fishPondStore.treatSickFish()
    if (count > 0) {
      addLog(`治疗了${count}条生病的鱼。`)
      showFloat(`治疗${count}条鱼`, 'success')
    } else {
      addLog('没有兽药或没有生病的鱼。')
    }
  }

  const handleCollect = () => {
    const pending = [...fishPondStore.pendingProducts]
    let collectCount = 0
    const bundle: { itemId: string; quantity: number; quality?: any }[] = []
    for (const p of pending) {
      bundle.push({ itemId: p.itemId, quantity: 1, quality: p.quality })
      if (!inventoryStore.canAddItems(bundle)) break
      collectCount++
    }
    if (collectCount <= 0) {
      addLog('背包空间不足，无法收获。')
      return
    }
    const products = fishPondStore.collectProducts(collectCount)
    if (products.length > 0) {
      for (const p of products) {
        inventoryStore.addItemExact(p.itemId, 1, p.quality)
      }
      const names = products.map(p => getItemName(p.itemId)).join('、')
      addLog(`收获了${names}。`)
      if (collectCount < pending.length) addLog('背包空间不足，剩余产物已保留在鱼塘中。')
      showFloat(`+${products.length}件水产`, 'success')
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.collectFishProducts)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) handleEndDay()
    } else {
      addLog('没有可收获的产出。')
    }
  }

  const handleAddFish = (fishId: string) => {
    const added = fishPondStore.addFish(fishId, 1)
    if (added > 0) {
      const name = getPondableFishName(fishId)
      addLog(`放入了${added}条${name}。`)
    } else if (fishPondStore.isFull) {
      addLog('鱼塘已满，无法放入更多鱼。')
    } else {
      addLog('背包中没有这种鱼。')
    }
  }

  const handleRemoveFish = (pondFishId: string) => {
    if (fishPondStore.removeFish(pondFishId)) {
      addLog('取出了一条鱼。')
      selectedBreedingFish.value = null
    } else {
      addLog('背包已满，无法取出。')
    }
  }

  const handleSelectForBreeding = (fish: PondFish) => {
    if (!selectedBreedingFish.value) {
      selectedBreedingFish.value = fish
      return
    }

    if (selectedBreedingFish.value.id === fish.id) {
      selectedBreedingFish.value = null
      return
    }

    // 尝试配对
    if (fishPondStore.startBreeding(selectedBreedingFish.value.id, fish.id)) {
      addLog(`${fish.name}开始繁殖，${fishPondStore.pond.breeding!.daysLeft}天后出结果。`)
      showFloat('开始繁殖', 'success')
      selectedBreedingFish.value = null
    } else {
      if (selectedBreedingFish.value.fishId !== fish.fishId) {
        addLog('只能配对同种鱼。')
      } else if (fishPondStore.isFull) {
        addLog('鱼塘已满，无法繁殖。')
      } else {
        addLog('无法配对，请确认鱼已成熟且未生病。')
      }
      selectedBreedingFish.value = null
    }
  }
</script>
