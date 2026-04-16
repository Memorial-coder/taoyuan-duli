<template>
  <div>
    <p v-if="tutorialHint" class="tutorial-hint mb-2">{{ tutorialHint }}</p>
    <GuidanceDigestPanel surface-id="shop" title="目录承接引导" />
    <QaGovernancePanel page-id="shop" title="市场治理总览" />

    <!-- 返回按钮（在子商铺时显示） -->
    <Button v-if="shopStore.currentShopId" class="mb-3 w-full md:w-auto" :icon="ChevronLeft" @click="shopStore.currentShopId = null">
      返回商圈
    </Button>

    <!-- 移动端：购买/出售切换 -->
    <div class="flex space-x-1.5 mb-3 md:hidden">
      <Button
        class="flex-1 justify-center"
        :class="{ '!bg-accent !text-bg': mobileTab === 'buy' }"
        :icon="ShoppingCart"
        @click="mobileTab = 'buy'"
      >
        购买
      </Button>
      <Button
        class="flex-1 justify-center"
        :class="{ '!bg-accent !text-bg': mobileTab === 'sell' }"
        :icon="Coins"
        @click="mobileTab = 'sell'"
      >
        出售
      </Button>
    </div>

    <div class="flex flex-col md:flex-row space-x-0 md:space-x-4 md:space-y-6">
      <!-- 左侧：购买区 -->
      <div class="flex-1" :class="{ 'hidden md:block': mobileTab === 'sell' }">
        <!-- 折扣提示 -->
        <p v-if="hasDiscount" class="text-success text-xs mb-3">{{ discountHint }}</p>
        <div v-if="shopStore.currentShopId && currentShopRelationshipHint" class="border border-accent/10 rounded-xs px-2 py-1.5 mb-3">
          <p class="text-[10px] text-accent">{{ currentShopRelationshipHint }}</p>
          <p v-if="currentShopNextBenefitHint" class="text-[10px] text-muted/70 mt-0.5">{{ currentShopNextBenefitHint }}</p>
        </div>

        <div
          v-if="!shopStore.currentShopId"
          class="border border-accent/20 rounded-xs p-3 mb-3"
          :class="promptSectionClass('economy-overview')"
          :data-prompt-focus="buildPromptFocusAttr('economy-overview')"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-1.5 text-sm text-accent">
              <TrendingUp :size="14" />
              <span>经济观测看板</span>
            </div>
            <span class="text-xs" :class="economyRiskClass">{{ economyRiskLabel }}</span>
          </div>
          <p class="text-xs text-muted mb-2">
            {{ economyOverview.currentSegment?.label ?? '经营观察中' }} · {{ economyOverview.currentSegment?.recommendedFocus ?? '优先关注高价 sink 与主题周轮换。' }}
          </p>

          <div class="grid grid-cols-2 gap-2 mb-2">
            <div v-for="metric in economyShopMetricCards" :key="metric.label" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/20">
              <p class="text-[10px] text-muted">{{ metric.label }}</p>
              <p class="text-sm text-accent mt-0.5">{{ metric.value }}</p>
              <p class="text-[10px] text-muted mt-1">{{ metric.hint }}</p>
            </div>
          </div>

          <div v-if="economyOverview.latestRiskReport?.summary" class="border rounded-xs px-2 py-2 mb-2" :class="economyRiskPanelClass">
            <p class="text-[10px] mb-1" :class="economyRiskClass">风险提示</p>
            <p class="text-xs text-muted">{{ economyOverview.latestRiskReport.summary }}</p>
          </div>

          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-[10px] text-accent mb-1">本期推荐消费池</p>
            <div class="space-y-1.5">
              <div v-for="sink in economyShopRecommendedSinks" :key="sink.id" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-xs text-text">{{ sink.name }}</p>
                  <span class="text-[10px] text-accent">{{ sink.priceBandLabel }}</span>
                </div>
                <p class="text-[10px] text-muted mt-1">{{ sink.showcaseHook }}</p>
              </div>
            </div>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <button class="btn prompt-action-cta !px-2 !py-1 text-[10px]" @click="focusShopSection('market-overview', '看市场看板')">看市场看板</button>
            <button class="btn prompt-action-cta !px-2 !py-1 text-[10px]" @click="focusShopSection('recommended-consumption', '看推荐货架')">
              看推荐货架
            </button>
          </div>
        </div>

        <div
          v-if="!shopStore.currentShopId"
          class="border border-warning/20 rounded-xs p-3 mb-3"
          :class="promptSectionClass('market-overview')"
          :data-prompt-focus="buildPromptFocusAttr('market-overview')"
        >
          <div class="flex items-center justify-between mb-2 gap-2">
            <div class="flex items-center gap-1.5 text-sm text-warning">
              <Filter :size="14" />
              <span>市场轮换看板</span>
            </div>
            <span class="text-xs text-muted">{{ marketOverview.phaseLabel }}</span>
          </div>
          <p class="text-xs text-muted mb-2">{{ marketOverview.phaseDescription }}</p>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
            <div class="border border-warning/10 rounded-xs px-2 py-2 bg-bg/20">
              <p class="text-[10px] text-muted">本周热点</p>
              <p class="text-xs text-warning mt-0.5">
                {{ marketOverview.hotspotCategoryLabels.length > 0 ? marketOverview.hotspotCategoryLabels.slice(0, 3).join('、') : '等待热点刷新' }}
              </p>
              <p class="text-[10px] text-muted mt-1">当前热点 {{ marketOverview.hotspotCount }} 项</p>
            </div>
            <div class="border border-warning/10 rounded-xs px-2 py-2 bg-bg/20">
              <p class="text-[10px] text-muted">地区收购</p>
              <p class="text-xs text-text mt-0.5">
                {{ marketRegionalProcurementCards.length > 0 ? marketRegionalProcurementCards.map(item => item.districtLabel).join('、') : '本周暂无地区收购' }}
              </p>
              <p class="text-[10px] text-muted mt-1">活跃合同 {{ marketOverview.regionalProcurementCount }} 份</p>
            </div>
            <div class="border border-warning/10 rounded-xs px-2 py-2 bg-bg/20">
              <p class="text-[10px] text-muted">路线建议</p>
              <p class="text-xs text-success mt-0.5">
                {{ marketRecommendedRouteCards.length > 0 ? marketRecommendedRouteCards.map(route => route.label).join('、') : '先观察热点后再切换出货方向' }}
              </p>
              <p class="text-[10px] text-muted mt-1">过剩压制 {{ marketOverview.overflowPenaltyCount }} 项</p>
            </div>
          </div>

          <div v-if="marketThemeEncouragementSummary" class="border border-success/20 rounded-xs px-2 py-2 mb-2 bg-success/5">
            <div class="flex items-center justify-between gap-2">
              <p class="text-[10px] text-success">主题承接</p>
              <span class="text-[10px] text-muted">×{{ marketThemeEncouragementSummary.rewardMultiplier.toFixed(2) }}</span>
            </div>
            <p class="text-xs text-muted mt-1">
              {{ marketThemeEncouragementSummary.categories.length > 0 ? marketThemeEncouragementSummary.categories.join('、') : '综合品类' }}
            </p>
            <p v-if="marketThemeEncouragementSummary.tags.length > 0" class="text-[10px] text-success/80 mt-1">
              推荐标签：{{ marketThemeEncouragementSummary.tags.slice(0, 4).join('、') }}
            </p>
          </div>

          <div v-if="marketPositiveHighlights.length > 0" class="border border-success/20 rounded-xs px-2 py-2 mb-2 bg-success/5">
            <p class="text-[10px] text-success mb-1">上涨机会</p>
            <div class="flex flex-wrap gap-1.5">
              <span v-for="info in marketPositiveHighlights" :key="`positive-${info.category}`" class="text-[10px] px-1.5 py-0.5 rounded-xs border border-success/20 text-success">
                {{ MARKET_CATEGORY_NAMES[info.category] }} · {{ TREND_NAMES[info.trend] }} ×{{ info.multiplier.toFixed(2) }}
              </span>
            </div>
          </div>

          <div v-if="marketRegionalProcurementCards.length > 0" class="border border-accent/10 rounded-xs p-2 mb-2 bg-bg/10">
            <p class="text-[10px] text-accent mb-1">地区收购详情</p>
            <div class="space-y-1.5">
              <div v-for="entry in marketRegionalProcurementCards" :key="entry.id" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-xs text-text">{{ entry.districtLabel }}</p>
                  <span class="text-[10px] text-accent">×{{ entry.rewardMultiplier.toFixed(2) }}</span>
                </div>
                <p class="text-[10px] text-muted mt-1">需求：{{ entry.targetCategoryLabels.join(' / ') }}</p>
                <p class="text-[10px] text-muted/70 mt-0.5">截至：{{ entry.expiresDayKey }}</p>
              </div>
            </div>
          </div>

          <div v-if="marketOverflowPenaltyCards.length > 0" class="border border-warning/20 rounded-xs p-2 mb-2 bg-warning/5">
            <p class="text-[10px] text-warning mb-1">过剩压制提醒</p>
            <div class="space-y-1.5">
              <div v-for="entry in marketOverflowPenaltyCards" :key="entry.category" class="border border-warning/10 rounded-xs px-2 py-2 bg-bg/10">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-xs text-text">{{ entry.categoryLabel }}</p>
                  <span class="text-[10px] text-warning">×{{ entry.appliedMultiplier.toFixed(2) }}</span>
                </div>
                <p class="text-[10px] text-muted mt-1">压制档位：{{ entry.currentBandId }} · 连续 {{ entry.streakDays }} 天</p>
              </div>
            </div>
          </div>

          <div v-if="marketRiskHighlights.length > 0" class="border border-danger/20 rounded-xs px-2 py-2">
            <p class="text-[10px] text-danger mb-1">下跌风险</p>
            <div class="flex flex-wrap gap-1.5">
              <span v-for="info in marketRiskHighlights" :key="`risk-${info.category}`" class="text-[10px] px-1.5 py-0.5 rounded-xs border border-danger/20 text-danger">
                {{ MARKET_CATEGORY_NAMES[info.category] }} · {{ TREND_NAMES[info.trend] }} ×{{ info.multiplier.toFixed(2) }}
              </span>
            </div>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <button class="btn prompt-action-cta !px-2 !py-1 text-[10px]" @click="focusShopSection('economy-overview', '回经营看板')">回经营看板</button>
            <button class="btn prompt-action-cta !px-2 !py-1 text-[10px]" @click="focusShopSection('recommended-consumption', '看推荐货架')">
              看推荐货架
            </button>
          </div>
        </div>

        <!-- ====== 商圈总览 ====== -->
        <template v-if="!shopStore.currentShopId">
          <h3 class="text-accent text-sm mb-3">
            <Store :size="14" class="inline" />
            桃源商圈
          </h3>
          <p class="text-muted text-xs mb-3">点击商铺进入选购。</p>

          <!-- 旅行商人（仅周五/日） -->
          <div v-if="shopStore.isMerchantHere" class="mb-4">
            <h4 class="text-accent text-sm mb-2">
              <MapPin :size="14" class="inline" />
              旅行商人 · 限时特卖
            </h4>
            <p class="text-muted text-xs mb-2">旅行商人今天在桃源村摆摊，带来了稀有货物！</p>
            <div class="flex flex-col space-y-2">
              <div
                v-for="item in shopStore.travelingStock"
                :key="item.itemId"
                class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2"
                :class="item.quantity > 0 ? 'cursor-pointer hover:bg-accent/5' : 'opacity-50'"
                @click="
                  item.quantity > 0 &&
                  openBatchBuyModal(
                    item.name,
                    getTravelerItemDesc(item.itemId, item.quantity),
                    discounted(item.price),
                    () => handleBuyFromTraveler(item.itemId, item.name, item.price),
                    () => item.quantity > 0 && playerStore.money >= discounted(item.price),
                    count => handleBatchBuyFromTraveler(item.itemId, item.name, item.price, count),
                    () => getMaxBuyable(discounted(item.price), item.quantity),
                    item.itemId
                  )
                "
              >
                <div>
                  <p class="text-sm">{{ item.name }}</p>
                  <p class="text-muted text-xs">{{ getTravelerItemDesc(item.itemId, item.quantity) }}</p>
                </div>
                <span class="text-xs text-accent whitespace-nowrap">{{ discounted(item.price) }}文</span>
              </div>
            </div>
          </div>

          <!-- 六大商铺卡片 -->
          <div class="flex flex-col space-y-2">
            <div
              v-for="shop in SHOPS"
              :key="shop.id"
              class="flex items-center justify-between border rounded-xs px-3 py-2"
              :class="isOpen(shop) ? 'border-accent/30 cursor-pointer hover:bg-accent/5' : 'border-accent/10 opacity-50'"
              @click="isOpen(shop) && enterShop(shop.id)"
            >
              <div>
                <span class="text-sm">{{ shop.name }}</span>
                <span class="text-muted text-xs ml-2">{{ shop.npcName }}</span>
                <span v-if="shopRelationshipDiscountPercent(shop.id) > 0" class="text-success text-[10px] ml-2">
                  熟客价 -{{ shopRelationshipDiscountPercent(shop.id) }}%
                </span>
                <span v-if="!isOpen(shop)" class="text-danger text-xs ml-2">{{ closedReason(shop) }}</span>
              </div>
              <ChevronRight v-if="isOpen(shop)" :size="14" class="text-muted" />
            </div>
          </div>
        </template>

        <!-- ====== 万物铺 ====== -->
        <template v-else-if="shopStore.currentShopId === 'wanwupu'">
          <ShopHeader name="万物铺" npc="陈伯" />

          <div class="border border-accent/20 rounded-xs p-3 mb-4">
            <div class="flex items-center justify-between mb-2 gap-2">
              <div class="flex items-center gap-1.5 text-sm text-accent">
                <Package :size="14" />
                <span>目录运营总览</span>
              </div>
              <span class="text-xs text-muted">{{ shopStore.currentLuxuryAuditSegment?.label ?? '经营观察中' }}</span>
            </div>
            <p class="text-xs text-muted mb-2">
              {{ shopStore.currentLuxuryAuditSegment?.recommendedFocus ?? '优先在周精选、高价长期商品与可复购服务之间建立稳定消费节奏。' }}
            </p>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
              <div v-for="metric in catalogSummaryCards" :key="metric.label" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/20">
                <p class="text-[10px] text-muted">{{ metric.label }}</p>
                <p class="text-sm text-accent mt-0.5">{{ metric.value }}</p>
                <p class="text-[10px] text-muted mt-1">{{ metric.hint }}</p>
              </div>
            </div>

            <div class="border border-accent/10 rounded-xs p-2 bg-bg/10">
              <p class="text-[10px] text-accent mb-1">当前货架摘要</p>
              <p class="text-xs text-muted">{{ currentCatalogPoolSummary }}</p>
              <p class="text-[10px] text-muted/80 mt-1">{{ catalogRefreshHint }}</p>
            </div>

          <div v-if="activeServiceContracts.length > 0" class="border border-warning/20 rounded-xs p-2 mt-2 bg-warning/5">
            <div class="flex items-center justify-between gap-2 mb-1">
              <p class="text-[10px] text-warning">已启用服务合同</p>
              <span class="text-[10px] text-muted">{{ activeServiceContracts.length }} 项</span>
            </div>
            <div class="space-y-1.5">
              <div v-for="contract in activeServiceContracts" :key="contract.offerId" class="border border-warning/10 rounded-xs px-2 py-2 bg-bg/10">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-xs text-text">{{ contract.name }}</p>
                  <span class="text-[10px] text-warning">至 {{ contract.expiresDayKey }}</span>
                </div>
                <p class="text-[10px] text-muted mt-1">{{ contract.effectSummary }}</p>
                <p class="text-[10px] text-warning/80 mt-0.5">周续费 {{ contract.weeklyFee }}文 · 已续费 {{ contract.renewCount }} 次</p>
              </div>
            </div>
          </div>
          </div>

          <div :class="promptSectionClass('recommended-consumption')" :data-prompt-focus="buildPromptFocusAttr('recommended-consumption')">
          <div v-if="shopStore.weeklySurpriseOffer" class="mb-4">
            <h4 class="text-accent text-sm mb-2">
              <Star :size="14" class="inline" />
              周更惊喜
            </h4>
            <p class="text-muted text-xs mb-2">每周会从精选货架中挑出一项本周特别推荐，适合优先关注。</p>
            <div
              class="flex items-center justify-between border border-warning/30 bg-warning/5 rounded-xs px-3 py-2 cursor-pointer hover:bg-warning/10"
              @click="openCatalogOfferModal(shopStore.weeklySurpriseOffer)"
            >
              <div>
                <div class="flex items-center gap-1.5 flex-wrap">
                  <p class="text-sm">{{ shopStore.weeklySurpriseOffer.name }}</p>
                  <span
                    v-if="shopStore.getCatalogOfferBadge(shopStore.weeklySurpriseOffer.id)"
                    class="text-[10px] px-1 rounded-xs border border-warning/30 text-warning"
                  >
                    {{ shopStore.getCatalogOfferBadge(shopStore.weeklySurpriseOffer.id) }}
                  </span>
                </div>
                <p class="text-muted text-xs">{{ shopStore.weeklySurpriseOffer.description }}</p>
                <p class="text-[10px] text-warning mt-0.5">{{ catalogOfferSubtitle(shopStore.weeklySurpriseOffer) }}</p>
                <p v-if="catalogOfferEffectPreview(shopStore.weeklySurpriseOffer)" class="text-[10px] text-muted/70 mt-0.5">
                  {{ catalogOfferEffectPreview(shopStore.weeklySurpriseOffer) }}
                </p>
              </div>
              <span class="text-xs text-accent whitespace-nowrap">{{ discounted(shopStore.weeklySurpriseOffer.price) }}文</span>
            </div>
          </div>

          <div v-if="shopStore.themeWeekRewardPoolOfferRecommendations.length > 0" class="mb-4">
            <h4 class="text-accent text-sm mb-2">
              <Store :size="14" class="inline" />
              主题周承接货架
            </h4>
            <p class="text-muted text-xs mb-2">根据本周主题奖励池与周目标结算建议，优先展示最适合承接本周节奏的货架商品。</p>
            <div class="flex flex-col space-y-2">
              <div
                v-for="offer in shopStore.themeWeekRewardPoolOfferRecommendations"
                :key="`theme-reward-${offer.id}`"
                class="flex items-center justify-between border border-accent/30 bg-accent/5 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/10"
                @click="openCatalogOfferModal(offer)"
              >
                <div>
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <p class="text-sm">{{ offer.name }}</p>
                    <span
                      v-if="shopStore.getCatalogOfferBadge(offer.id)"
                      class="text-[10px] px-1 rounded-xs border border-accent/20 text-accent"
                    >
                      {{ shopStore.getCatalogOfferBadge(offer.id) }}
                    </span>
                  </div>
                  <p class="text-muted text-xs">{{ offer.description }}</p>
                  <p v-if="catalogOfferEffectPreview(offer)" class="text-[10px] text-accent/80 mt-0.5">{{ catalogOfferEffectPreview(offer) }}</p>
                  <p class="text-[10px] text-accent mt-0.5">主题周奖励池推荐承接</p>
                </div>
                <span class="text-xs text-accent whitespace-nowrap">{{ discounted(offer.price) }}文</span>
              </div>
            </div>
          </div>

          <div v-if="shopStore.recommendedCatalogOffers.length > 0" class="mb-4">
            <h4 class="text-accent text-sm mb-2">
              <Store :size="14" class="inline" />
              为你推荐
            </h4>
            <p class="text-muted text-xs mb-2">会根据当前钱包流派偏好，优先展示更适合你路线的货架商品。</p>
            <div class="flex flex-col space-y-2">
              <div
                v-for="offer in shopStore.recommendedCatalogOffers"
                :key="`recommended-${offer.id}`"
                class="flex items-center justify-between border border-success/30 bg-success/5 rounded-xs px-3 py-2 cursor-pointer hover:bg-success/10"
                @click="openCatalogOfferModal(offer)"
              >
                <div>
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <p class="text-sm">{{ offer.name }}</p>
                    <span
                      v-if="shopStore.getCatalogOfferBadge(offer.id)"
                      class="text-[10px] px-1 rounded-xs border border-success/30 text-success"
                    >
                      {{ shopStore.getCatalogOfferBadge(offer.id) }}
                    </span>
                  </div>
                  <p class="text-muted text-xs">{{ offer.description }}</p>
                  <p v-if="catalogOfferEffectPreview(offer)" class="text-[10px] text-muted/70 mt-0.5">{{ catalogOfferEffectPreview(offer) }}</p>
                  <p class="text-[10px] text-success mt-0.5">{{ shopStore.getCatalogOfferPreferenceReason(offer.id) }}</p>
                </div>
                <span class="text-xs text-accent whitespace-nowrap">{{ discounted(offer.price) }}文</span>
              </div>
            </div>
          </div>
          </div>

          <h4 class="text-accent text-sm mb-2">
            <Store :size="14" class="inline" />
            本期货架
          </h4>
          <p class="text-muted text-xs mb-2">给中后期经营准备的消费货架：常驻、每周精选、季节限定、高价长期商品。</p>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-1.5 mb-3">
            <Button
              v-for="pool in catalogPools"
              :key="pool.id"
              class="justify-center"
              :class="{ '!bg-accent !text-bg': featuredPool === pool.id }"
              @click="selectCatalogPool(pool.id)"
            >
              {{ pool.label }}<span v-if="pool.id === 'weekly' && hasNewWeekly" class="ml-1 text-[10px] text-danger font-bold">NEW</span>
            </Button>
          </div>
          <p v-if="featuredPool === 'weekly'" class="text-[10px] text-muted mb-2">{{ shopStore.weeklyCatalogRefreshText }}</p>
          <div class="flex flex-col space-y-2 mb-4">
            <div
              v-for="offer in currentCatalogOffers"
              :key="offer.id"
              class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
              :class="{
                'opacity-60': offer.onceOnly && shopStore.isCatalogOwned(offer.id),
                'border-warning/30 bg-warning/5': isCatalogOfferLocked(offer)
              }"
              @click="openCatalogOfferModal(offer)"
            >
              <div>
                <p class="text-sm flex items-center gap-1.5 flex-wrap">
                  {{ offer.name }}
                  <span v-if="shopStore.getCatalogOfferBadge(offer.id)" class="text-[10px] px-1 rounded-xs border border-accent/20 text-accent">
                    {{ shopStore.getCatalogOfferBadge(offer.id) }}
                  </span>
                  <span v-if="offer.onceOnly && shopStore.isCatalogOwned(offer.id)" class="text-success text-xs ml-1">已拥有</span>
                  <span v-else-if="isCatalogOfferLocked(offer)" class="text-warning text-xs ml-1">图鉴未解锁</span>
                </p>
                <p class="text-muted text-xs">{{ offer.description }}</p>
                <p class="text-[10px] text-muted/70 mt-0.5">{{ catalogOfferSubtitle(offer) }}</p>
                <p v-if="catalogOfferEffectPreview(offer)" class="text-[10px] text-accent/80 mt-0.5">{{ catalogOfferEffectPreview(offer) }}</p>
                <p v-if="shopStore.getCatalogOfferPreferenceReason(offer.id)" class="text-[10px] text-success mt-0.5">
                  {{ shopStore.getCatalogOfferPreferenceReason(offer.id) }}
                </p>
                <p v-if="catalogOfferUnlockHint(offer)" class="text-[10px] text-warning mt-0.5">🔒 {{ catalogOfferUnlockHint(offer) }}</p>
                <p v-if="catalogOfferLimitHint(offer)" class="text-[10px] text-warning mt-0.5">⚠ {{ catalogOfferLimitHint(offer) }}</p>
              </div>
              <span class="text-xs text-accent whitespace-nowrap">{{ discounted(offer.price) }}文</span>
            </div>
            <div v-if="currentCatalogOffers.length === 0" class="flex flex-col items-center justify-center py-4 text-muted">
              <Package :size="24" class="text-muted/30 mb-2" />
              <p class="text-xs">当前货架暂无商品</p>
            </div>
          </div>

          <!-- 当季种子 -->
          <h4 class="text-accent text-sm mb-2 mt-3">
            <Sprout :size="14" class="inline" />
            当季种子
          </h4>
          <div class="flex flex-col space-y-2">
            <div
              v-for="seed in shopStore.availableSeeds"
              :key="seed.seedId"
              class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
              @click="
                openBatchBuyModal(
                  seed.cropName + '种子',
                  `${seed.season.map((s: Season) => SEASON_NAMES[s]).join('/')}季 · ${seed.growthDays}天成熟 → 售${seed.sellPrice}文`,
                  discounted(seed.price),
                  () => handleBuySeed(seed.seedId),
                  () => playerStore.money >= discounted(seed.price),
                  count => handleBatchBuySeed(seed.seedId, count),
                  () => getMaxBuyable(discounted(seed.price)),
                  seed.seedId
                )
              "
            >
              <div>
                <p class="text-sm">
                  {{ seed.cropName }}种子
                  <span v-if="seed.regrowth" class="text-success text-xs ml-1">[多茬]</span>
                </p>
                <p class="text-muted text-xs">
                  {{ seed.season.map((s: Season) => SEASON_NAMES[s]).join('/') }}季 · {{ seed.growthDays }}天{{
                    seed.regrowth ? ` · 每${seed.regrowthDays}天再收` : ''
                  }}
                  → 售{{ seed.sellPrice }}文
                </p>
              </div>
              <span class="text-xs text-accent whitespace-nowrap">{{ discounted(seed.price) }}文</span>
            </div>
            <div v-if="shopStore.availableSeeds.length === 0" class="flex flex-col items-center justify-center py-4 text-muted">
              <Sprout :size="24" class="text-muted/30 mb-2" />
              <p class="text-xs">本季没有种子出售</p>
            </div>
          </div>

          <!-- 杂货 -->
          <h4 class="text-accent text-sm mb-2 mt-4">
            <Package :size="14" class="inline" />
            杂货
          </h4>
          <div class="flex flex-col space-y-2">
            <!-- 背包扩容 -->
            <div
              v-if="inventoryStore.capacity < 120"
              class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
              @click="
                openBuyModal(
                  '背包扩容',
                  `当前${inventoryStore.capacity}格 → ${inventoryStore.capacity + 4}格`,
                  discounted(bagPrice),
                  handleBuyBag,
                  () => playerStore.money >= discounted(bagPrice)
                )
              "
            >
              <div>
                <p class="text-sm">背包扩容</p>
                <p class="text-muted text-xs">当前{{ inventoryStore.capacity }}格 → {{ inventoryStore.capacity + 4 }}格</p>
              </div>
              <span class="text-xs text-accent whitespace-nowrap">{{ discounted(bagPrice) }}文</span>
            </div>

            <div
              v-if="warehouseStore.unlocked && warehouseStore.maxChests < warehouseStore.MAX_CHESTS_CAP"
              class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
              @click="
                openBuyModal(
                  '仓库扩建',
                  `箱子槽位 ${warehouseStore.maxChests} → ${warehouseStore.maxChests + 1}`,
                  discounted(warehouseExpandPrice),
                  handleBuyWarehouseExpand,
                  () => playerStore.money >= discounted(warehouseExpandPrice)
                )
              "
            >
              <div>
                <p class="text-sm">仓库扩建</p>
                <p class="text-muted text-xs">箱子槽位 {{ warehouseStore.maxChests }} → {{ warehouseStore.maxChests + 1 }}</p>
              </div>
              <span class="text-xs text-accent whitespace-nowrap">{{ discounted(warehouseExpandPrice) }}文</span>
            </div>

            <!-- 农场扩建 -->
            <div
              v-if="farmExpandInfo"
              class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
              @click="
                openBuyModal(
                  '农场扩建',
                  `${farmStore.farmSize}×${farmStore.farmSize} → ${farmExpandInfo.newSize}×${farmExpandInfo.newSize}`,
                  discounted(farmExpandInfo.price),
                  handleBuyFarmExpand,
                  () => playerStore.money >= discounted(farmExpandInfo!.price)
                )
              "
            >
              <div>
                <p class="text-sm">农场扩建</p>
                <p class="text-muted text-xs">
                  {{ farmStore.farmSize }}×{{ farmStore.farmSize }} → {{ farmExpandInfo.newSize }}×{{ farmExpandInfo.newSize }}
                </p>
              </div>
              <span class="text-xs text-accent whitespace-nowrap">{{ discounted(farmExpandInfo.price) }}文</span>
            </div>

            <!-- 树苗 -->
            <div
              v-for="tree in FRUIT_TREE_DEFS"
              :key="tree.saplingId"
              class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
              @click="
                openBatchBuyModal(
                  tree.name + '苗',
                  `28天成熟 · ${seasonName(tree.fruitSeason)}季产${tree.fruitName}`,
                  discounted(tree.saplingPrice),
                  () => handleBuySapling(tree.saplingId, tree.saplingPrice, tree.name),
                  () => playerStore.money >= discounted(tree.saplingPrice),
                  count => handleBatchBuySapling(tree.saplingId, tree.saplingPrice, tree.name, count),
                  () => getMaxBuyable(discounted(tree.saplingPrice)),
                  tree.saplingId
                )
              "
            >
              <div>
                <p class="text-sm">{{ tree.name }}苗</p>
                <p class="text-muted text-xs">28天成熟 · {{ seasonName(tree.fruitSeason) }}季产{{ tree.fruitName }}</p>
              </div>
              <span class="text-xs text-accent whitespace-nowrap">{{ discounted(tree.saplingPrice) }}文</span>
            </div>

            <!-- 干草 -->
            <div
              class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
              @click="
                openBatchBuyModal(
                  '干草',
                  '喂养牲畜用',
                  discounted(HAY_PRICE),
                  handleBuyHay,
                  () => playerStore.money >= discounted(HAY_PRICE),
                  count => handleBatchBuyItem('hay', HAY_PRICE, '干草', count),
                  () => getMaxBuyable(discounted(HAY_PRICE)),
                  'hay'
                )
              "
            >
              <div>
                <p class="text-sm">干草</p>
                <p class="text-muted text-xs">喂养牲畜用</p>
              </div>
              <span class="text-xs text-accent whitespace-nowrap">{{ discounted(HAY_PRICE) }}文</span>
            </div>

            <!-- 木材 -->
            <div
              class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
              @click="
                openBatchBuyModal(
                  '木材',
                  '建筑和加工的基础材料',
                  discounted(WOOD_PRICE),
                  () => handleBuyItem('wood', WOOD_PRICE, '木材'),
                  () => playerStore.money >= discounted(WOOD_PRICE),
                  count => handleBatchBuyItem('wood', WOOD_PRICE, '木材', count),
                  () => getMaxBuyable(discounted(WOOD_PRICE)),
                  'wood'
                )
              "
            >
              <div>
                <p class="text-sm">木材</p>
                <p class="text-muted text-xs">建筑和加工的基础材料</p>
              </div>
              <span class="text-xs text-accent whitespace-nowrap">{{ discounted(WOOD_PRICE) }}文</span>
            </div>

            <!-- 雨图腾 -->
            <div
              class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
              @click="
                openBatchBuyModal(
                  '雨图腾',
                  '使用后可以让明天下雨',
                  discounted(RAIN_TOTEM_PRICE),
                  () => handleBuyItem('rain_totem', RAIN_TOTEM_PRICE, '雨图腾'),
                  () => playerStore.money >= discounted(RAIN_TOTEM_PRICE),
                  count => handleBatchBuyItem('rain_totem', RAIN_TOTEM_PRICE, '雨图腾', count),
                  () => getMaxBuyable(discounted(RAIN_TOTEM_PRICE)),
                  'rain_totem'
                )
              "
            >
              <div>
                <p class="text-sm">雨图腾</p>
                <p class="text-muted text-xs">使用后可以让明天下雨</p>
              </div>
              <span class="text-xs text-accent whitespace-nowrap">{{ discounted(RAIN_TOTEM_PRICE) }}文</span>
            </div>
          </div>
        </template>

        <!-- ====== 铁匠铺 ====== -->
        <template v-else-if="shopStore.currentShopId === 'tiejiangpu'">
          <ShopHeader name="铁匠铺" npc="孙铁匠" />

          <div class="flex flex-col space-y-2">
            <div
              v-for="item in shopStore.blacksmithItems"
              :key="item.itemId"
              class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
              @click="
                openBatchBuyModal(
                  item.name,
                  item.description,
                  discounted(item.price),
                  () => handleBuyItem(item.itemId, item.price, item.name),
                  () => playerStore.money >= discounted(item.price),
                  count => handleBatchBuyItem(item.itemId, item.price, item.name, count),
                  () => getMaxBuyable(discounted(item.price)),
                  item.itemId
                )
              "
            >
              <div>
                <p class="text-sm">{{ item.name }}</p>
                <p class="text-muted text-xs">{{ item.description }}</p>
              </div>
              <span class="text-xs text-accent whitespace-nowrap">{{ discounted(item.price) }}文</span>
            </div>
          </div>

          <!-- 戒指合成 -->
          <h4 class="text-accent text-sm mb-2 mt-4">
            <CircleDot :size="14" class="inline" />
            戒指合成
          </h4>
          <div class="flex flex-col space-y-2">
            <div
              v-for="ring in craftableRings"
              :key="ring.id"
              class="flex items-center justify-between border rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
              :class="canCraftRing(ring) ? 'border-success/50 bg-success/5' : 'border-accent/20'"
              @click="openRingModal(ring)"
            >
              <div>
                <p class="text-sm">
                  {{ ring.name }}
                  <span v-if="inventoryStore.hasRing(ring.id)" class="text-success text-xs ml-1">已拥有</span>
                </p>
                <p class="text-muted text-xs">{{ ring.description }}</p>
              </div>
              <span class="text-xs text-accent whitespace-nowrap">{{ ring.recipeMoney }}文</span>
            </div>
            <div v-if="craftableRings.length === 0" class="flex flex-col items-center justify-center py-4 text-muted">
              <CircleDot :size="24" class="text-muted/30 mb-2" />
              <p class="text-xs">没有可合成的戒指</p>
            </div>
          </div>

          <!-- 帽子合成 -->
          <h4 class="text-accent text-sm mb-2 mt-4">
            <Crown :size="14" class="inline" />
            帽子合成
          </h4>
          <div class="flex flex-col space-y-2">
            <div
              v-for="hat in CRAFTABLE_HATS"
              :key="hat.id"
              class="flex items-center justify-between border rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
              :class="canCraftHat(hat) ? 'border-success/50 bg-success/5' : 'border-accent/20'"
              @click="openHatCraftModal(hat)"
            >
              <div>
                <p class="text-sm">
                  {{ hat.name }}
                  <span v-if="inventoryStore.hasHat(hat.id)" class="text-success text-xs ml-1">已拥有</span>
                </p>
                <p class="text-muted text-xs">{{ hat.description }}</p>
              </div>
              <span class="text-xs text-accent whitespace-nowrap">{{ hat.recipeMoney }}文</span>
            </div>
          </div>

          <!-- 鞋子合成 -->
          <h4 class="text-accent text-sm mb-2 mt-4">
            <Footprints :size="14" class="inline" />
            鞋子合成
          </h4>
          <div class="flex flex-col space-y-2">
            <div
              v-for="shoe in CRAFTABLE_SHOES"
              :key="shoe.id"
              class="flex items-center justify-between border rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
              :class="canCraftShoe(shoe) ? 'border-success/50 bg-success/5' : 'border-accent/20'"
              @click="openShoeCraftModal(shoe)"
            >
              <div>
                <p class="text-sm">
                  {{ shoe.name }}
                  <span v-if="inventoryStore.hasShoe(shoe.id)" class="text-success text-xs ml-1">已拥有</span>
                </p>
                <p class="text-muted text-xs">{{ shoe.description }}</p>
              </div>
              <span class="text-xs text-accent whitespace-nowrap">{{ shoe.recipeMoney }}文</span>
            </div>
          </div>
        </template>

        <!-- ====== 镖局 ====== -->
        <template v-else-if="shopStore.currentShopId === 'biaoju'">
          <ShopHeader name="镖局" npc="云飞" />

          <!-- 武器 -->
          <h4 class="text-accent text-sm mb-2">
            <Sword :size="14" class="inline" />
            武器
          </h4>
          <div class="flex flex-col space-y-2">
            <div
              v-for="w in SHOP_WEAPONS"
              :key="w.id"
              class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
              @click="openWeaponModal(w)"
            >
              <div>
                <p class="text-sm">
                  {{ w.name }}
                  <span v-if="inventoryStore.hasWeapon(w.id)" class="text-success text-xs ml-1">已拥有</span>
                </p>
                <p class="text-muted text-xs">{{ WEAPON_TYPE_NAMES[w.type] }} · 攻击{{ w.attack }}</p>
              </div>
              <span class="text-xs text-accent whitespace-nowrap">{{ discounted(w.shopPrice!) }}文</span>
            </div>
          </div>
        </template>

        <!-- ====== 渔具铺 ====== -->
        <template v-else-if="shopStore.currentShopId === 'yugupu'">
          <ShopHeader name="渔具铺" npc="秋月" />

          <!-- 鱼饵 -->
          <h4 class="text-accent text-sm mb-2">
            <Fish :size="14" class="inline" />
            鱼饵
          </h4>
          <div class="flex flex-col space-y-2">
            <div
              v-for="b in shopStore.shopBaits"
              :key="b.id"
              class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
              @click="
                openBatchBuyModal(
                  b.name,
                  b.description,
                  discounted(b.price),
                  () => handleBuyItem(b.id, b.price, b.name),
                  () => playerStore.money >= discounted(b.price),
                  count => handleBatchBuyItem(b.id, b.price, b.name, count),
                  () => getMaxBuyable(discounted(b.price)),
                  b.id
                )
              "
            >
              <div>
                <p class="text-sm">{{ b.name }}</p>
                <p class="text-muted text-xs">{{ b.description }}</p>
              </div>
              <span class="text-xs text-accent whitespace-nowrap">{{ discounted(b.price) }}文</span>
            </div>
          </div>

          <!-- 浮漂 -->
          <h4 class="text-accent text-sm mb-2 mt-4">
            <Fish :size="14" class="inline" />
            浮漂
          </h4>
          <div class="flex flex-col space-y-2">
            <div
              v-for="t in shopStore.shopTackles"
              :key="t.id"
              class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
              @click="
                openBatchBuyModal(
                  t.name,
                  t.description,
                  discounted(t.price),
                  () => handleBuyItem(t.id, t.price, t.name),
                  () => playerStore.money >= discounted(t.price),
                  count => handleBatchBuyItem(t.id, t.price, t.name, count),
                  () => getMaxBuyable(discounted(t.price)),
                  t.id
                )
              "
            >
              <div>
                <p class="text-sm">{{ t.name }}</p>
                <p class="text-muted text-xs">{{ t.description }}</p>
              </div>
              <span class="text-xs text-accent whitespace-nowrap">{{ discounted(t.price) }}文</span>
            </div>
          </div>

          <!-- 其他 -->
          <h4 class="text-accent text-sm mb-2 mt-4">
            <Fish :size="14" class="inline" />
            其他
          </h4>
          <div class="flex flex-col space-y-2">
            <div
              v-for="item in shopStore.fishingShopItems"
              :key="item.itemId"
              class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
              @click="
                openBatchBuyModal(
                  item.name,
                  item.description,
                  discounted(item.price),
                  () => handleBuyItem(item.itemId, item.price, item.name),
                  () => playerStore.money >= discounted(item.price),
                  count => handleBatchBuyItem(item.itemId, item.price, item.name, count),
                  () => getMaxBuyable(discounted(item.price)),
                  item.itemId
                )
              "
            >
              <div>
                <p class="text-sm">{{ item.name }}</p>
                <p class="text-muted text-xs">{{ item.description }}</p>
              </div>
              <span class="text-xs text-accent whitespace-nowrap">{{ discounted(item.price) }}文</span>
            </div>
          </div>
        </template>

        <!-- ====== 药铺 ====== -->
        <template v-else-if="shopStore.currentShopId === 'yaopu'">
          <ShopHeader name="药铺" npc="林老" />

          <!-- 肥料 -->
          <h4 class="text-accent text-sm mb-2">
            <Leaf :size="14" class="inline" />
            肥料
          </h4>
          <div class="flex flex-col space-y-2">
            <div
              v-for="f in shopStore.shopFertilizers"
              :key="f.id"
              class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
              @click="
                openBatchBuyModal(
                  f.name,
                  f.description,
                  discounted(f.price),
                  () => handleBuyItem(f.id, f.price, f.name),
                  () => playerStore.money >= discounted(f.price),
                  count => handleBatchBuyItem(f.id, f.price, f.name, count),
                  () => getMaxBuyable(discounted(f.price)),
                  f.id
                )
              "
            >
              <div>
                <p class="text-sm">{{ f.name }}</p>
                <p class="text-muted text-xs">{{ f.description }}</p>
              </div>
              <span class="text-xs text-accent whitespace-nowrap">{{ discounted(f.price) }}文</span>
            </div>
          </div>

          <!-- 草药 -->
          <h4 class="text-accent text-sm mb-2 mt-4">
            <Sprout :size="14" class="inline" />
            草药
          </h4>
          <div class="flex flex-col space-y-2">
            <div
              v-for="item in shopStore.apothecaryItems"
              :key="item.itemId"
              class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
              @click="
                openBatchBuyModal(
                  item.name,
                  item.description,
                  discounted(item.price),
                  () => handleBuyItem(item.itemId, item.price, item.name),
                  () => playerStore.money >= discounted(item.price),
                  count => handleBatchBuyItem(item.itemId, item.price, item.name, count),
                  () => getMaxBuyable(discounted(item.price)),
                  item.itemId
                )
              "
            >
              <div>
                <p class="text-sm">{{ item.name }}</p>
                <p class="text-muted text-xs">{{ item.description }}</p>
              </div>
              <span class="text-xs text-accent whitespace-nowrap">{{ discounted(item.price) }}文</span>
            </div>
          </div>
        </template>

        <!-- ====== 绸缎庄 ====== -->
        <template v-else-if="shopStore.currentShopId === 'chouduanzhuang'">
          <ShopHeader name="绸缎庄" npc="素素" />

          <div class="flex flex-col space-y-2">
            <div
              v-for="item in shopStore.textileItems"
              :key="item.itemId"
              class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
              @click="
                openBatchBuyModal(
                  item.name,
                  item.description,
                  discounted(item.price),
                  () => handleBuyItem(item.itemId, item.price, item.name),
                  () => playerStore.money >= discounted(item.price),
                  count => handleBatchBuyItem(item.itemId, item.price, item.name, count),
                  () => getMaxBuyable(discounted(item.price)),
                  item.itemId
                )
              "
            >
              <div>
                <p class="text-sm">{{ item.name }}</p>
                <p class="text-muted text-xs">{{ item.description }}</p>
              </div>
              <span class="text-xs text-accent whitespace-nowrap">{{ discounted(item.price) }}文</span>
            </div>
          </div>

          <!-- 帽子 -->
          <h4 class="text-accent text-sm mb-2 mt-4">
            <Crown :size="14" class="inline" />
            帽子
          </h4>
          <div class="flex flex-col space-y-2">
            <div
              v-for="hat in SHOP_HATS"
              :key="hat.id"
              class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
              @click="openHatShopModal(hat)"
            >
              <div>
                <p class="text-sm">
                  {{ hat.name }}
                  <span v-if="inventoryStore.hasHat(hat.id)" class="text-success text-xs ml-1">已拥有</span>
                </p>
                <p class="text-muted text-xs">{{ hat.description }}</p>
              </div>
              <span class="text-xs text-accent whitespace-nowrap">{{ discounted(hat.shopPrice!) }}文</span>
            </div>
          </div>

          <!-- 鞋子 -->
          <h4 class="text-accent text-sm mb-2 mt-4">
            <Footprints :size="14" class="inline" />
            鞋子
          </h4>
          <div class="flex flex-col space-y-2">
            <div
              v-for="shoe in SHOP_SHOES"
              :key="shoe.id"
              class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
              @click="openShoeShopModal(shoe)"
            >
              <div>
                <p class="text-sm">
                  {{ shoe.name }}
                  <span v-if="inventoryStore.hasShoe(shoe.id)" class="text-success text-xs ml-1">已拥有</span>
                </p>
                <p class="text-muted text-xs">{{ shoe.description }}</p>
              </div>
              <span class="text-xs text-accent whitespace-nowrap">{{ discounted(shoe.shopPrice!) }}文</span>
            </div>
          </div>
        </template>

        <!-- ====== 醉桃源酒馆 ====== -->
        <template v-else-if="shopStore.currentShopId === 'jiuguan'">
          <ShopHeader name="醉桃源酒馆" npc="老掌柜" />

          <p class="text-muted text-xs mb-3">酒馆供应自酿酒水与小食，可恢复体力与HP，适合出门前补充。</p>

          <!-- 酒水 -->
          <h4 class="text-accent text-sm mb-2">
            <Droplets :size="14" class="inline" />
            酒水
          </h4>
          <div class="flex flex-col space-y-2">
            <div
              v-for="item in shopStore.tavernItems.filter((i: { itemId: string }) => ['tavern_rice_wine','tavern_plum_wine','tavern_herbal_brew','tavern_premium_brew'].includes(i.itemId))"
              :key="item.itemId"
              class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
              @click="
                openBatchBuyModal(
                  item.name,
                  item.description,
                  discounted(item.price),
                  () => handleBuyItem(item.itemId, item.price, item.name),
                  () => playerStore.money >= discounted(item.price),
                  count => handleBatchBuyItem(item.itemId, item.price, item.name, count),
                  () => getMaxBuyable(discounted(item.price)),
                  item.itemId
                )
              "
            >
              <div>
                <p class="text-sm">{{ item.name }}</p>
                <p class="text-muted text-xs">{{ item.description }}</p>
              </div>
              <span class="text-xs text-accent whitespace-nowrap">{{ discounted(item.price) }}文</span>
            </div>
          </div>

          <!-- 小食 -->
          <h4 class="text-accent text-sm mb-2 mt-4">
            <UtensilsCrossed :size="14" class="inline" />
            小食
          </h4>
          <div class="flex flex-col space-y-2">
            <div
              v-for="item in shopStore.tavernItems.filter((i: { itemId: string }) => ['tavern_snack_plate','tavern_braised_pork'].includes(i.itemId))"
              :key="item.itemId"
              class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
              @click="
                openBatchBuyModal(
                  item.name,
                  item.description,
                  discounted(item.price),
                  () => handleBuyItem(item.itemId, item.price, item.name),
                  () => playerStore.money >= discounted(item.price),
                  count => handleBatchBuyItem(item.itemId, item.price, item.name, count),
                  () => getMaxBuyable(discounted(item.price)),
                  item.itemId
                )
              "
            >
              <div>
                <p class="text-sm">{{ item.name }}</p>
                <p class="text-muted text-xs">{{ item.description }}</p>
              </div>
              <span class="text-xs text-accent whitespace-nowrap">{{ discounted(item.price) }}文</span>
            </div>
          </div>
        </template>
      </div>

      <!-- 右侧：出售区 -->
      <div class="flex-1" :class="{ 'hidden md:block': mobileTab === 'buy' }">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-accent text-sm">
            <TrendingUp :size="14" class="inline" />
            出售物品
          </h3>
          <div class="flex space-x-1.5">
            <Button
              class="py-0 px-1.5"
              :class="{ '!bg-accent !text-bg': isSellFilterActive }"
              :icon="Filter"
              :icon-size="12"
              @click="openSellFilterModal"
            >
              筛选
            </Button>
            <Button v-if="sellableItems.length > 0" class="btn-danger" :icon="Coins" @click="showSellAllConfirm = true">
              一键全部出售
            </Button>
          </div>
        </div>
        <!-- 售价加成提示 -->
        <p v-if="hasSellBonus" class="text-success text-xs mb-2">戒指加成中：所有售价 +{{ sellBonusPercent }}%</p>

        <!-- 今日行情 -->
        <div class="border border-accent/30 rounded-xs p-2 mb-3">
          <p class="text-[10px] text-muted mb-1">今日行情</p>
          <div class="grid grid-cols-4">
            <span v-for="m in todayMarket" :key="m.category" class="text-[10px] whitespace-nowrap mt-2">
              <span class="text-muted">{{ MARKET_CATEGORY_NAMES[m.category] }}</span>
              <span v-if="m.trend === 'stable'" class="text-muted/40 ml-0.5">—</span>
              <span v-else class="ml-0.5" :class="trendColor(m.trend)">
                {{ m.multiplier >= 1 ? '↑' : '↓' }}{{ Math.round(Math.abs(m.multiplier - 1) * 100) }}%
              </span>
            </span>
          </div>
        </div>
        <div class="flex flex-col space-y-2">
          <div
            v-for="item in sellableItems"
            :key="item.originalIndex"
            class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5"
            @click="openSellModal(item.itemId, item.quality, item.originalIndex)"
          >
            <div>
              <span class="text-sm" :class="qualityTextClass(item.quality)">{{ item.def?.name }}</span>
              <span class="text-muted text-xs ml-1">×{{ item.quantity }}</span>
            </div>
            <div class="flex items-center space-x-1">
              <span class="text-xs text-accent whitespace-nowrap">{{ shopStore.calculateSellPrice(item.itemId, 1, item.quality) }}文</span>
              <span v-if="getItemTrend(item.itemId) === 'rising' || getItemTrend(item.itemId) === 'boom'" class="text-[10px] text-success">
                ↑{{ Math.round((getItemMultiplier(item.itemId) - 1) * 100) }}%
              </span>
              <span
                v-else-if="getItemTrend(item.itemId) === 'falling' || getItemTrend(item.itemId) === 'crash'"
                class="text-[10px]"
                :class="getItemTrend(item.itemId) === 'crash' ? 'text-danger' : 'text-warning'"
              >
                ↓{{ Math.round((1 - getItemMultiplier(item.itemId)) * 100) }}%
              </span>
            </div>
          </div>
          <div v-if="sellableItems.length === 0" class="flex flex-col items-center justify-center py-4 text-muted">
            <Package :size="100" class="text-muted/30 my-4" />
            <p class="text-xs">背包中没有可出售的物品</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 出售筛选弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showSellFilterModal"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="showSellFilterModal = false"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="showSellFilterModal = false">
            <X :size="14" />
          </button>
          <p class="text-sm text-accent mb-2">出售筛选</p>
          <p class="text-[10px] text-muted mb-2">选择要显示的分类，不选则显示全部</p>
          <div class="grid grid-cols-3 gap-1.5 mb-3">
            <div
              v-for="cat in SELL_FILTER_CATEGORIES"
              :key="cat"
              class="border rounded-xs px-1.5 py-1 text-center text-xs cursor-pointer transition-colors"
              :class="
                tempSellFilter.has(cat) ? 'border-accent/50 bg-accent/10 text-accent' : 'border-accent/20 text-muted hover:bg-accent/5'
              "
              @click="toggleSellCategory(cat)"
            >
              {{ SELL_CATEGORY_NAMES[cat] }}
            </div>
          </div>
          <div class="flex space-x-1.5">
            <Button class="flex-1 justify-center" @click="handleClearSellFilter">全部显示</Button>
            <Button class="flex-1 justify-center !bg-accent !text-bg" @click="handleSaveSellFilter">保存</Button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 一键出售确认弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showSellAllConfirm"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="showSellAllConfirm = false"
      >
        <div class="game-panel max-w-xs w-full">
          <p class="text-sm text-accent mb-2">确认一键出售</p>
          <p class="text-xs text-muted mb-3">将出售背包中所有未锁定的非种子物品（共{{ sellableItems.length }}种），确定继续？</p>
          <div class="flex space-x-1.5">
            <Button class="flex-1 justify-center" @click="showSellAllConfirm = false">取消</Button>
            <Button class="flex-1 justify-center btn-danger" :icon="Coins" @click="confirmSellAll">确认出售</Button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 商品详情弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="buyModalData || (sellModalData && sellModalItem)"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-40 p-4"
        @click.self="shopModal = null"
      >
        <!-- 购买弹窗 -->
        <div v-if="buyModalData" class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="shopModal = null">
            <X :size="14" />
          </button>
          <p class="text-sm text-accent mb-2 pr-6">{{ buyModalData.name }}</p>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted">{{ buyModalData.description }}</p>
            <p v-for="(line, i) in buyModalData.extraLines" :key="i" class="text-xs text-muted mt-0.5">{{ line }}</p>
          </div>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">{{ buyModalData.batchBuy ? '单价' : '价格' }}</span>
              <span class="text-xs text-accent">{{ buyModalData.price }}文</span>
            </div>
            <div v-if="buyModalData.itemId" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">持有</span>
              <span class="text-xs">{{ inventoryStore.getItemCount(buyModalData.itemId) }}</span>
            </div>
          </div>

          <!-- 批量购买数量选择器 -->
          <div v-if="buyModalData.batchBuy" class="border border-accent/10 rounded-xs p-2 mb-2">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs text-muted">数量</span>
              <div class="flex items-center space-x-1">
                <Button class="h-6 px-1.5 py-0.5 text-xs justify-center" :disabled="buyQuantity <= 1" @click="addBuyQuantity(-1)">-</Button>
                <input
                  type="number"
                  :value="buyQuantity"
                  min="1"
                  :max="maxBuyQuantity"
                  class="w-24 h-6 px-2 py-0.5 bg-bg border border-accent/30 rounded-xs text-xs text-center text-accent outline-none focus:border-accent transition-colors"
                  @input="onBuyQuantityInput"
                />
                <Button
                  class="h-6 px-1.5 py-0.5 text-xs justify-center"
                  :disabled="buyQuantity >= maxBuyQuantity"
                  @click="addBuyQuantity(1)"
                >
                  +
                </Button>
              </div>
            </div>
            <div class="flex space-x-1">
              <Button class="flex-1 justify-center" :disabled="buyQuantity <= 1" @click="setBuyQuantity(1)">最少</Button>
              <Button class="flex-1 justify-center" :disabled="buyQuantity >= maxBuyQuantity" @click="setBuyQuantity(maxBuyQuantity)">
                最多
              </Button>
            </div>
            <div class="flex items-center justify-between mt-1.5">
              <span class="text-xs text-muted">总价</span>
              <span class="text-xs text-accent">{{ buyTotalPrice }}文</span>
            </div>
          </div>

          <div class="flex flex-col space-y-1.5">
            <Button
              v-if="buyModalData.batchBuy"
              class="w-full justify-center"
              :class="{ '!bg-accent !text-bg': buyModalData.canBuy() }"
              :disabled="!buyModalData.canBuy()"
              :icon="ShoppingCart"
              @click="buyModalData.batchBuy!.onBuy(buyQuantity)"
            >
              购买 ×{{ buyQuantity }}
            </Button>
            <Button
              v-else
              class="w-full justify-center"
              :class="{ '!bg-accent !text-bg': buyModalData.canBuy() }"
              :disabled="!buyModalData.canBuy()"
              :icon="buyModalData.buttonText ? Hammer : ShoppingCart"
              @click="buyModalData.onBuy()"
            >
              {{ buyModalData.buttonText ?? '购买' }}
            </Button>
          </div>
        </div>

        <!-- 出售弹窗 -->
        <div v-else-if="sellModalData && sellModalItem && sellModalDef" class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="shopModal = null">
            <X :size="14" />
          </button>
          <p class="text-sm mb-2 pr-6" :class="qualityTextClass(sellModalItem.quality, 'text-accent')">
            {{ sellModalDef.name }}
          </p>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted">{{ sellModalDef.description }}</p>
          </div>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">数量</span>
              <span class="text-xs">×{{ sellModalItem.quantity }}</span>
            </div>
            <div v-if="sellModalItem.quality !== 'normal'" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">品质</span>
              <span class="text-xs" :class="qualityTextClass(sellModalItem.quality)">{{ QUALITY_NAMES[sellModalItem.quality] }}</span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">售价</span>
              <span class="text-xs flex items-center space-x-1">
                <span
                  v-if="getItemTrend(sellModalData!.itemId) && getItemTrend(sellModalData!.itemId) !== 'stable'"
                  class="line-through text-muted/40"
                >
                  {{ shopStore.calculateBaseSellPrice(sellModalData!.itemId, 1, sellModalData!.quality) }}文
                </span>
                <span class="text-accent">{{ shopStore.calculateSellPrice(sellModalData!.itemId, 1, sellModalData!.quality) }}文</span>
              </span>
            </div>
            <div
              v-if="getItemTrend(sellModalData!.itemId) && getItemTrend(sellModalData!.itemId) !== 'stable'"
              class="flex items-center justify-between mt-0.5"
            >
              <span class="text-xs text-muted">行情</span>
              <span class="text-xs" :class="trendColor(getItemTrend(sellModalData!.itemId)!)">
                {{ TREND_NAMES[getItemTrend(sellModalData!.itemId)!] }} ×{{ getItemMultiplier(sellModalData!.itemId) }}
              </span>
            </div>
            <div v-if="hasSellBonus" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">戒指加成</span>
              <span class="text-xs text-success">+{{ sellBonusPercent }}%</span>
            </div>
          </div>

          <div v-if="sellUnitBreakdown" class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-[10px] text-accent mb-1">售价明细</p>
            <div
              v-for="entry in sellUnitBreakdown.entries"
              :key="entry.stepId"
              class="py-1"
              :class="{ 'border-b border-accent/5': entry.stepId !== sellUnitBreakdown.entries[sellUnitBreakdown.entries.length - 1]?.stepId }"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs text-muted">{{ entry.label }}</span>
                <span class="text-xs text-accent whitespace-nowrap">
                  <template v-if="entry.multiplier">×{{ formatPriceMultiplier(entry.multiplier) }} · </template>
                  {{ formatPriceAmount(entry.subtotal) }}文
                </span>
              </div>
              <p v-if="entry.description" class="text-[10px] text-muted/70 mt-0.5">{{ entry.description }}</p>
            </div>
          </div>

          <!-- 数量选择器（物品数量>1时显示） -->
          <div v-if="sellModalItem.quantity > 1" class="border border-accent/10 rounded-xs p-2 mb-2">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs text-muted">出售数量</span>
              <div class="flex items-center space-x-1">
                <Button class="h-6 px-1.5 py-0.5 text-xs justify-center" :disabled="sellQuantity <= 1" @click="addSellQuantity(-1)">
                  -
                </Button>
                <input
                  type="number"
                  :value="sellQuantity"
                  min="1"
                  :max="maxSellQuantity"
                  class="w-24 h-6 px-2 py-0.5 bg-bg border border-accent/30 rounded-xs text-xs text-center text-accent outline-none focus:border-accent transition-colors"
                  @input="onSellQuantityInput"
                />
                <Button
                  class="h-6 px-1.5 py-0.5 text-xs justify-center"
                  :disabled="sellQuantity >= maxSellQuantity"
                  @click="addSellQuantity(1)"
                >
                  +
                </Button>
              </div>
            </div>
            <div class="flex space-x-1">
              <Button class="flex-1 justify-center" :disabled="sellQuantity <= 1" @click="setSellQuantity(1)">最少</Button>
              <Button class="flex-1 justify-center" :disabled="sellQuantity >= maxSellQuantity" @click="setSellQuantity(maxSellQuantity)">
                最多
              </Button>
            </div>
            <div class="flex items-center justify-between mt-1.5">
              <span class="text-xs text-muted">总价</span>
              <span class="text-xs text-accent">{{ sellTotalPrice }}文</span>
            </div>
          </div>

          <div class="flex flex-col space-y-1.5">
            <Button class="w-full justify-center" :icon="Coins" @click="handleModalSell(sellQuantity)">出售 ×{{ sellQuantity }}</Button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import {
    ShoppingCart,
    Coins,
    Sprout,
    Package,
    TrendingUp,
    Fish,
    Leaf,
    Sword,
    MapPin,
    ChevronRight,
    ChevronLeft,
    Store,
    CircleDot,
    Hammer,
    Star,
    X,
    Crown,
    Footprints,
    Filter,
    Droplets,
    UtensilsCrossed
  } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import { useFarmStore } from '@/stores/useFarmStore'
  import { useGameStore, SEASON_NAMES } from '@/stores/useGameStore'
  import { useInventoryStore } from '@/stores/useInventoryStore'
  import { useNpcStore } from '@/stores/useNpcStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import { useShopStore } from '@/stores/useShopStore'
  import { useWarehouseStore } from '@/stores/useWarehouseStore'
  import { useHomeStore } from '@/stores/useHomeStore'
  import { getItemById, getNpcById } from '@/data'
  import { getCropBySeedId } from '@/data/crops'
  import { SHOP_NPC_RELATION_MAP } from '@/data/npcWorld'
  import { SHOPS, isShopAvailable, getShopClosedReason } from '@/data/shops'
  import type { ShopDef } from '@/data/shops'
  import { SHOP_WEAPONS, WEAPON_TYPE_NAMES } from '@/data/weapons'
  import type { SellPriceBreakdown, WeaponDef, RingDef, RingEffectType, Season, Quality, HatDef, ShoeDef, ItemCategory, ShopCatalogOfferDef } from '@/types'
  import { FRUIT_TREE_DEFS } from '@/data/fruitTrees'
  import { CRAFTABLE_RINGS } from '@/data/rings'
  import { SHOP_HATS, CRAFTABLE_HATS } from '@/data/hats'
  import { SHOP_SHOES, CRAFTABLE_SHOES } from '@/data/shoes'
  import { HAY_PRICE } from '@/data/animals'
  import { addLog } from '@/composables/useGameLog'
  import { sfxBuy } from '@/composables/useAudio'
  import { showFloat } from '@/composables/useGameLog'
  import { runPromptAction, usePromptFocusPanel } from '@/composables/usePromptNavigation'
  import { handleBuySeed, handleSellItem, handleSellItemAll, handleSellAll, QUALITY_NAMES } from '@/composables/useFarmActions'
  import { getDailyMarketInfo, MARKET_CATEGORY_NAMES, MARKET_DISTRICT_LABELS, TREND_NAMES } from '@/data/market'
  import type { MarketCategory, MarketTrend } from '@/data/market'
  import { useTutorialStore } from '@/stores/useTutorialStore'
  import { useGoalStore } from '@/stores/useGoalStore'
  import GuidanceDigestPanel from '@/components/game/GuidanceDigestPanel.vue'
  import QaGovernancePanel from '@/components/game/QaGovernancePanel.vue'
  import { useAchievementStore } from '@/stores/useAchievementStore'

  const RAIN_TOTEM_PRICE = 300
  const WOOD_PRICE = 50

  const shopStore = useShopStore()
  const npcStore = useNpcStore()
  const playerStore = usePlayerStore()
  const inventoryStore = useInventoryStore()
  const farmStore = useFarmStore()
  const warehouseStore = useWarehouseStore()
  const gameStore = useGameStore()
  const homeStore = useHomeStore()
  const tutorialStore = useTutorialStore()
  const goalStore = useGoalStore()
  const achievementStore = useAchievementStore()
  const { buildPromptFocusAttr, isPromptFocusActive } = usePromptFocusPanel('shop', {
    handlers: {
      'economy-overview': () => {
        shopStore.currentShopId = null
      },
      'market-overview': () => {
        shopStore.currentShopId = null
      },
      'recommended-consumption': () => {
        shopStore.currentShopId = 'wanwupu'
      }
    }
  })

  const focusShopSection = (focusKey: string, label: string) => {
    runPromptAction({
      id: `shop-${focusKey}`,
      label,
      mode: 'cta',
      panelKey: 'shop',
      focusKey
    })
  }

  const promptSectionClass = (focusKey: string) => (isPromptFocusActive(focusKey) ? 'prompt-focus-target--active' : '')

  const tutorialHint = computed(() => {
    if (!tutorialStore.enabled || gameStore.year > 1) return null
    if (achievementStore.stats.totalCropsHarvested === 0) return '万物铺出售各种种子，购买后去农场种植。上方可以切换「买入」和「卖出」。'
    return null
  })
  const economyOverview = computed(() => playerStore.getEconomyOverview())
  const economyRiskLabel = computed(() => {
    const level = economyOverview.value.latestRiskReport?.level ?? 'healthy'
    if (level === 'critical') return '高风险'
    if (level === 'warning') return '预警中'
    if (level === 'watch') return '观察中'
    return '平稳'
  })
  const economyRiskClass = computed(() => {
    const level = economyOverview.value.latestRiskReport?.level ?? 'healthy'
    if (level === 'critical') return 'text-danger'
    if (level === 'warning') return 'text-warning'
    if (level === 'watch') return 'text-accent'
    return 'text-success'
  })
  const economyRiskPanelClass = computed(() => {
    const level = economyOverview.value.latestRiskReport?.level ?? 'healthy'
    if (level === 'critical') return 'border-danger/30 bg-danger/5'
    if (level === 'warning') return 'border-warning/30 bg-warning/5'
    if (level === 'watch') return 'border-accent/30 bg-accent/5'
    return 'border-success/30 bg-success/5'
  })
  const economyShopMetricCards = computed(() => [
    { label: '通胀压力', value: economyOverview.value.inflationPressure.toFixed(1), hint: '用于判断是否需要更强 sink。' },
    { label: '消耗满足度', value: `${Math.round(economyOverview.value.sinkSatisfaction * 100)}%`, hint: '越低越应主动消费。' },
    { label: '循环多样度', value: String(economyOverview.value.loopDiversity), hint: '建议至少保持 4 条系统联动。' },
    { label: '单系统收入占比', value: `${Math.round(economyOverview.value.dominantIncomeShare * 100)}%`, hint: '过高时应切换主题周经营。' }
  ])
  const economyShopRecommendedSinks = computed(() => {
    return goalStore.recommendedEconomySinks.slice(0, 3).map(item => ({
      ...item,
      priceBandLabel: `${item.priceBand[0]}~${item.priceBand[1]}文`
    }))
  })
  const marketOverview = computed(() => shopStore.marketDynamicsOverview)
  const marketPositiveHighlights = computed(() =>
    [...shopStore.currentMarketPriceInfos]
      .filter(info => info.trend === 'boom' || info.trend === 'rising')
      .sort((a, b) => b.multiplier - a.multiplier)
      .slice(0, 4)
  )
  const marketRiskHighlights = computed(() =>
    [...shopStore.currentMarketPriceInfos]
      .filter(info => info.trend === 'falling' || info.trend === 'crash')
      .sort((a, b) => a.multiplier - b.multiplier)
      .slice(0, 4)
  )
  const marketRegionalProcurementCards = computed(() =>
    shopStore.activeMarketRegionalProcurements.slice(0, 3).map(entry => ({
      id: entry.id,
      districtLabel: MARKET_DISTRICT_LABELS[entry.districtId] ?? entry.districtId,
      targetCategoryLabels: shopStore.getRegionalProcurementSummary(entry.id)?.targetCategoryLabels ?? entry.targetCategories.map((category: MarketCategory) => MARKET_CATEGORY_NAMES[category]),
      rewardMultiplier: entry.rewardMultiplier,
      expiresDayKey: entry.expiresDayKey
    }))
  )
  const marketOverflowPenaltyCards = computed(() =>
    Object.values(shopStore.marketDynamics.overflowPenalties)
      .filter((entry): entry is NonNullable<typeof entry> => !!entry)
      .map(entry => shopStore.getOverflowPenaltySummary(entry.category))
      .filter((entry): entry is NonNullable<ReturnType<typeof shopStore.getOverflowPenaltySummary>> => !!entry)
  )
  const marketThemeEncouragementSummary = computed(() => {
    const entry = shopStore.activeMarketThemeEncouragement
    if (!entry) return null
    return {
      rewardMultiplier: entry.rewardMultiplier,
      categories: entry.encouragedCategories.map((category: MarketCategory) => MARKET_CATEGORY_NAMES[category]),
      tags: [...entry.encouragedTags]
    }
  })
  const marketRecommendedRouteCards = computed(() => shopStore.recommendedMarketDynamicsRoutes.slice(0, 3))

  // === 行情系统 ===

  const todayMarket = computed(() =>
    getDailyMarketInfo(gameStore.year, gameStore.seasonIndex, gameStore.day, shopStore.getRecentShipping())
  )

  const getItemTrend = (itemId: string): MarketTrend | null => {
    const def = getItemById(itemId)
    if (!def) return null
    const info = todayMarket.value.find(m => m.category === def.category)
    return info?.trend ?? null
  }

  const getItemMultiplier = (itemId: string): number => {
    const def = getItemById(itemId)
    if (!def) return 1
    return todayMarket.value.find(m => m.category === def.category)?.multiplier ?? 1
  }

  const trendColor = (trend: MarketTrend): string => {
    if (trend === 'boom') return 'text-danger'
    if (trend === 'rising') return 'text-success'
    if (trend === 'falling') return 'text-warning'
    if (trend === 'crash') return 'text-danger'
    return 'text-muted/40'
  }

  // 每次进入商圈页面，重置到商圈总览（避免跳过营业时间检查）
  shopStore.currentShopId = null

  // === 移动端切换 ===

  const mobileTab = ref<'buy' | 'sell'>('buy')

  // === 一键出售确认 ===

  const showSellAllConfirm = ref(false)
  const featuredPool = ref<'basic' | 'weekly' | 'seasonal' | 'premium'>('basic')

  const hasNewWeekly = computed(() => shopStore.weeklyCatalogOffers.length > 0 && String(shopStore.currentWeekId) !== (window.localStorage.getItem('taoyuan_last_weekly_seen_week') ?? '-1'))

  const catalogPools = [
    { id: 'basic', label: '基础消费池' },
    { id: 'weekly', label: '每周精选' },
    { id: 'seasonal', label: '季节限定' },
    { id: 'premium', label: '高价长期商品' }
  ] as const

  const currentCatalogOffers = computed(() => {
    if (featuredPool.value === 'basic') return shopStore.basicCatalogOffers
    if (featuredPool.value === 'weekly') return shopStore.weeklyCatalogOffers
    if (featuredPool.value === 'seasonal') return shopStore.seasonalCatalogOffers
    return shopStore.premiumCatalogOffers
  })

  const selectCatalogPool = (poolId: typeof featuredPool.value) => {
    featuredPool.value = poolId
    if (poolId === 'weekly') {
      window.localStorage.setItem('taoyuan_last_weekly_seen_week', String(shopStore.currentWeekId))
    }
  }

  const catalogSummaryCards = computed(() => {
    const summary = shopStore.catalogOverviewSummary
    return [
      {
        label: '目录总量',
        value: `${summary.totalOffers}`,
        hint: `已解锁 ${summary.unlockedOffers} · 已拥有 ${summary.ownedOffers}`
      },
      {
        label: '每周精选',
        value: `${summary.weeklyOfferCount}`,
        hint: shopStore.weeklyCatalogRefreshText
      },
      {
        label: '高价长期',
        value: `${summary.premiumOfferCount}`,
        hint: `活跃服务 ${summary.activeEntitlementCount} 项`
      },
      {
        label: '可复购池',
        value: `${summary.repeatableOfferCount}`,
        hint: `P2 内容 ${summary.tierCounts.P2} 项`
      }
    ]
  })

  const currentCatalogPoolSummary = computed(() => {
    const offers = currentCatalogOffers.value
    const unlockedCount = offers.filter(offer => shopStore.isCatalogOfferUnlocked(offer.id)).length
    const ownedCount = offers.filter(offer => shopStore.isCatalogOwned(offer.id)).length
    const poolLabel = catalogPools.find(pool => pool.id === featuredPool.value)?.label ?? '当前货架'
    return `${poolLabel}当前共 ${offers.length} 项，其中已解锁 ${unlockedCount} 项、已拥有 ${ownedCount} 项。建议优先查看带有推荐理由、角标与限制提示的商品。`
  })

  const catalogRefreshHint = computed(() => {
    if (featuredPool.value === 'weekly') {
      return `周精选会随周切换刷新；当前 ${shopStore.weeklyCatalogRefreshText}。若想快速承接资金回收，优先关注“周更惊喜”和“为你推荐”。`
    }
    if (featuredPool.value === 'seasonal') {
      return `${SEASON_NAMES[gameStore.season]}季限定会随季节切换同步更新；适合补节庆礼盒、展示收藏与季节补给。`
    }
    if (featuredPool.value === 'premium') {
      return '高价长期商品更适合后期大额铜钱回收，除温室许可、仓储扩建与终局陈设外，也承担持续续费的服务合同型 sink。'
    }
    return '基础消费池负责中期过渡，适合先补扩容、材料包、渔具补给与轻量仓储服务。'
  })

  const catalogOfferEffectPreview = (offer: ShopCatalogOfferDef): string => {
    const eff = offer.effect
    if (eff.type === 'unlock_decoration') return ''
    if (eff.type === 'expand_inventory_extra') {
      return `购买后背包：${inventoryStore.capacity}格 → ${inventoryStore.capacity + eff.amount}格`
    }
    if (eff.type === 'expand_warehouse') {
      if (warehouseStore.maxChests >= warehouseStore.MAX_CHESTS_CAP) return '仓库箱位已达上限'
      const nextMax = Math.min(warehouseStore.MAX_CHESTS_CAP, warehouseStore.maxChests + eff.amount)
      return `购买后仓库箱位：${warehouseStore.maxChests} → ${nextMax}`
    }
    if (eff.type === 'unlock_greenhouse') {
      return homeStore.greenhouseUnlocked ? '温室已解锁' : '解锁后可在农舍界面使用温室地块'
    }
    if (eff.type === 'grant_chest') {
      return `将新增一个「${eff.label ?? offer.name}」到仓库`
    }
    if (eff.type === 'add_items') {
      const parts = eff.items.map((item: { itemId: string; quantity: number }) => {
        const def = getItemById(item.itemId)
        return `${def?.name ?? item.itemId}×${item.quantity}`
      })
      return `获得：${parts.join('、')}`
    }
    if (eff.type === 'activate_service_contract') {
      return `签约效果：${offer.serviceContractConfig?.effectSummary ?? '激活长期服务合同'} · 周费${offer.serviceContractConfig?.weeklyFee ?? 0}文`
    }
    return ''
  }

  const catalogOfferLimitHint = (offer: ShopCatalogOfferDef): string => shopStore.getCatalogOfferLimitHint(offer.id)

  const catalogOfferSubtitle = (offer: Pick<ShopCatalogOfferDef, 'pool'> & { tags?: string[] }) => {
    const prefix =
      offer.pool === 'weekly'
        ? '每周精选 · 每周一刷新'
        : offer.pool === 'seasonal'
          ? `${SEASON_NAMES[gameStore.season]}季限定`
          : offer.pool === 'premium'
            ? '高价长期商品'
            : '常驻货架'
    return [prefix, ...(offer.tags ?? [])].join(' · ')
  }

  const isCatalogOfferLocked = (offer: ShopCatalogOfferDef) => !shopStore.isCatalogOfferUnlocked(offer.id)

  const catalogOfferUnlockHint = (offer: ShopCatalogOfferDef) => shopStore.getCatalogOfferUnlockHint(offer.id)

  const openCatalogOfferModal = (offer: ShopCatalogOfferDef) => {
    const extraLines: string[] = [catalogOfferSubtitle(offer)]
    const preview = catalogOfferEffectPreview(offer)
    if (preview) extraLines.push(preview)
    const unlockHint = catalogOfferUnlockHint(offer)
    if (unlockHint) extraLines.push(`🔒 ${unlockHint}`)
    const hint = catalogOfferLimitHint(offer)
    if (hint) extraLines.push(`⚠ ${hint}`)
    openBuyModal(
      offer.name,
      offer.description,
      discounted(offer.price),
      () => handleBuyCatalogOffer(offer.id),
      () => shopStore.canPurchaseCatalogOffer(offer.id),
      extraLines,
      unlockHint ? '未解锁' : offer.effect.type === 'unlock_decoration' ? '收藏' : offer.effect.type === 'activate_service_contract' ? '签约' : '购买'
    )
  }

  const activeServiceContracts = computed(() => shopStore.activeServiceContractSummaries)

  const handleBuyCatalogOffer = (offerId: string) => {
    const result = shopStore.purchaseCatalogOffer(offerId)
    if (result.success) {
      sfxBuy()
      showFloat(`-${result.spent ?? 0}文`, 'danger')
      addLog(result.message)
      shopModal.value = null
      return
    }
    addLog(result.message)
  }

  const confirmSellAll = () => {
    showSellAllConfirm.value = false
    handleSellAll(sellFilter.value)
  }

  // === 弹窗系统 ===

  type BuyModalState = {
    type: 'buy'
    name: string
    description: string
    price: number
    onBuy: () => void
    canBuy: () => boolean
    extraLines?: string[]
    buttonText?: string
    itemId?: string
    batchBuy?: {
      onBuy: (count: number) => void
      maxCount: () => number
    }
  }

  type SellModalState = {
    type: 'sell'
    itemId: string
    quality: Quality
    inventoryIndex: number
  }

  const shopModal = ref<BuyModalState | SellModalState | null>(null)

  const buyModalData = computed(() => {
    if (!shopModal.value || shopModal.value.type !== 'buy') return null
    return shopModal.value
  })

  const sellModalData = computed(() => {
    if (!shopModal.value || shopModal.value.type !== 'sell') return null
    return shopModal.value
  })

  const sellModalItem = computed(() => {
    const data = sellModalData.value
    if (!data) return null
    const item = inventoryStore.items[data.inventoryIndex]
    if (item && item.itemId === data.itemId && item.quality === data.quality) return item
    return inventoryStore.items.find(i => i.itemId === data.itemId && i.quality === data.quality) ?? null
  })

  const sellModalDef = computed(() => {
    const data = sellModalData.value
    if (!data) return null
    return getItemById(data.itemId) ?? null
  })

  const buyQuantity = ref(1)

  const buyTotalPrice = computed(() => {
    if (!buyModalData.value) return 0
    return buyModalData.value.price * buyQuantity.value
  })

  const maxBuyQuantity = computed(() => {
    if (!buyModalData.value?.batchBuy) return 1
    return Math.max(1, buyModalData.value.batchBuy.maxCount())
  })

  const setBuyQuantity = (val: number) => {
    buyQuantity.value = Math.max(1, Math.min(val, maxBuyQuantity.value))
  }

  const addBuyQuantity = (delta: number) => {
    setBuyQuantity(buyQuantity.value + delta)
  }

  const onBuyQuantityInput = (e: Event) => {
    const val = parseInt((e.target as HTMLInputElement).value, 10)
    if (!isNaN(val)) setBuyQuantity(val)
  }

  const getMaxBuyable = (unitPrice: number, stockLimit?: number): number => {
    const affordable = unitPrice > 0 ? Math.floor(playerStore.money / unitPrice) : 0
    let max = Math.max(1, affordable)
    if (stockLimit !== undefined) max = Math.min(max, stockLimit)
    return Math.min(max, 999)
  }

  const openBuyModal = (
    name: string,
    description: string,
    price: number,
    onBuy: () => void,
    canBuy: () => boolean,
    extraLines?: string[],
    buttonText?: string,
    itemId?: string
  ) => {
    shopModal.value = { type: 'buy', name, description, price, onBuy, canBuy, extraLines, buttonText, itemId }
  }

  const openBatchBuyModal = (
    name: string,
    description: string,
    unitPrice: number,
    onBuySingle: () => void,
    canBuy: () => boolean,
    batchOnBuy: (count: number) => void,
    batchMaxCount: () => number,
    itemId?: string
  ) => {
    buyQuantity.value = 1
    shopModal.value = {
      type: 'buy',
      name,
      description,
      price: unitPrice,
      onBuy: onBuySingle,
      canBuy,
      batchBuy: { onBuy: batchOnBuy, maxCount: batchMaxCount },
      itemId
    }
  }

  const sellQuantity = ref(1)

  const sellUnitBreakdown = computed<SellPriceBreakdown | null>(() => {
    const data = sellModalData.value
    if (!data) return null
    return shopStore.getSellPriceBreakdown(data.itemId, 1, data.quality)
  })

  const sellQuantityBreakdown = computed<SellPriceBreakdown | null>(() => {
    const data = sellModalData.value
    if (!data) return null
    return shopStore.getSellPriceBreakdown(data.itemId, sellQuantity.value, data.quality)
  })

  const sellTotalPrice = computed(() => {
    return sellQuantityBreakdown.value?.finalTotal ?? 0
  })

  const formatPriceMultiplier = (multiplier: number): string => {
    return Number.isInteger(multiplier) ? String(multiplier) : multiplier.toFixed(2)
  }

  const formatPriceAmount = (amount: number): string => {
    return Number.isInteger(amount) ? String(amount) : amount.toFixed(2)
  }

  const maxSellQuantity = computed(() => {
    const item = sellModalItem.value
    if (!item) return 1
    return item.quantity
  })

  const setSellQuantity = (val: number) => {
    sellQuantity.value = Math.max(1, Math.min(val, maxSellQuantity.value))
  }

  const addSellQuantity = (delta: number) => {
    setSellQuantity(sellQuantity.value + delta)
  }

  const onSellQuantityInput = (e: Event) => {
    const val = parseInt((e.target as HTMLInputElement).value, 10)
    if (!isNaN(val)) setSellQuantity(val)
  }

  const openSellModal = (itemId: string, quality: Quality, inventoryIndex: number) => {
    sellQuantity.value = 1
    shopModal.value = { type: 'sell', itemId, quality, inventoryIndex }
  }

  const openWeaponModal = (w: WeaponDef) => {
    const lines = [`${WEAPON_TYPE_NAMES[w.type]} · 攻击${w.attack} · 暴击${Math.round(w.critRate * 100)}%`]
    if (w.shopMaterials.length > 0) {
      lines.push('需要材料：' + w.shopMaterials.map(m => `${getItemById(m.itemId)?.name ?? m.itemId}×${m.quantity}`).join('、'))
    }
    openBuyModal(
      w.name,
      w.description,
      discounted(w.shopPrice!),
      () => handleBuyWeapon(w),
      () => !inventoryStore.hasWeapon(w.id) && playerStore.money >= discounted(w.shopPrice!) && hasWeaponMaterials(w),
      lines
    )
  }

  const openRingModal = (ring: RingDef) => {
    const lines = [
      '效果：' +
        ring.effects
          .map(eff => RING_EFFECT_LABELS[eff.type] + (eff.value > 0 && eff.value < 1 ? Math.round(eff.value * 100) + '%' : '+' + eff.value))
          .join('、'),
      '材料：' +
        (ring.recipe?.map(m => `${getItemById(m.itemId)?.name ?? m.itemId}×${m.quantity}`).join('、') ?? '') +
        ` + ${ring.recipeMoney}文`
    ]
    openBuyModal(
      ring.name,
      ring.description,
      ring.recipeMoney,
      () => handleCraftRing(ring.id),
      () => canCraftRing(ring),
      lines,
      '合成'
    )
  }

  const handleModalSell = (count: number) => {
    const modal = shopModal.value
    if (!modal || modal.type !== 'sell') return
    if (count === 1) {
      handleSellItem(modal.itemId, modal.quality)
    } else {
      handleSellItemAll(modal.itemId, count, modal.quality)
    }
    // 物品消耗完则关闭弹窗，否则修正出售数量
    const remaining = inventoryStore.items.find(i => i.itemId === modal.itemId && i.quality === modal.quality)
    if (!remaining) {
      shopModal.value = null
    } else if (sellQuantity.value > remaining.quantity) {
      sellQuantity.value = remaining.quantity
    }
  }

  // === 折扣系统 ===

  const hasDiscount = computed(() => shopStore.getDiscountRate() > 0)
  const discountPercent = computed(() => Math.round(shopStore.getDiscountRate() * 100))
  const discountHint = computed(() => {
    const breakdown = shopStore.getDiscountBreakdown()
    const parts: string[] = []
    if (breakdown.walletDiscount > 0) parts.push(`钱庄-${Math.round(breakdown.walletDiscount * 100)}%`)
    if (breakdown.ringDiscount > 0) parts.push(`戒指-${Math.round(breakdown.ringDiscount * 100)}%`)
    if (breakdown.spiritDiscount > 0) parts.push(`仙缘-${Math.round(breakdown.spiritDiscount * 100)}%`)
    if (breakdown.decorationDiscount > 0) parts.push(`农场装饰-${Math.round(breakdown.decorationDiscount * 100)}%`)
    if (breakdown.relationshipDiscount > 0 && breakdown.relationshipNpcName) {
      parts.push(`${breakdown.relationshipNpcName}·${breakdown.relationshipStageText ?? '熟客'} -${Math.round(breakdown.relationshipDiscount * 100)}%`)
    }
    return parts.length > 0 ? `折扣生效中：${parts.join('，')}（合计 -${discountPercent.value}%）` : `折扣生效中：所有购物价格 -${discountPercent.value}%`
  })

  const discounted = (price: number): number => {
    return shopStore.applyDiscount(price)
  }

  const shopRelationshipDiscountPercent = (shopId: string): number => Math.round(shopStore.getRelationshipDiscountRate(shopId) * 100)

  const currentShopOwnerId = computed(() => {
    const shopId = shopStore.currentShopId
    if (!shopId) return null
    return SHOP_NPC_RELATION_MAP[shopId] ?? null
  })

  const currentShopRelationshipHint = computed(() => {
    const ownerId = currentShopOwnerId.value
    if (!ownerId) return ''
    const ownerName = getNpcById(ownerId)?.name ?? ownerId
    const stageText = npcStore.getRelationshipStageText(ownerId)
    const discount = Math.round(shopStore.getRelationshipDiscountRate(shopStore.currentShopId) * 100)
    if (discount > 0) {
      return `${ownerName}把你当${stageText}看待，本店正在享受熟客折扣 -${discount}% 。`
    }
    return `当前你与${ownerName}的关系阶段为「${stageText}」，继续互动可解锁这家店的熟客优惠。`
  })

  const currentShopNextBenefitHint = computed(() => {
    const ownerId = currentShopOwnerId.value
    if (!ownerId) return ''
    const nextBenefits = npcStore.getNextRelationshipBenefits(ownerId)
    if (nextBenefits.length === 0) return ''
    return `下一阶段：${nextBenefits[0]}`
  })

  // === 售价加成 ===

  const hasSellBonus = computed(() => inventoryStore.getRingEffectValue('sell_price_bonus') > 0)
  const sellBonusPercent = computed(() => Math.round(inventoryStore.getRingEffectValue('sell_price_bonus') * 100))

  // === 商铺开放状态 ===

  const isOpen = (shop: ShopDef): boolean => {
    return isShopAvailable(shop, gameStore.day, gameStore.hour, gameStore.weather, gameStore.season)
  }

  const closedReason = (shop: ShopDef): string => {
    return getShopClosedReason(shop, gameStore.day, gameStore.hour, gameStore.weather, gameStore.season)
  }

  const enterShop = (shopId: string) => {
    shopStore.currentShopId = shopId
  }

  // === 旅行商人 ===

  if (shopStore.isMerchantHere) {
    shopStore.refreshMerchantStock()
  }

  const handleBuyFromTraveler = (itemId: string, name: string, originalPrice: number) => {
    const actualPrice = discounted(originalPrice)
    if (shopStore.buyFromTraveler(itemId)) {
      sfxBuy()
      showFloat(`-${actualPrice}文`, 'danger')
      addLog(`从旅行商人处购买了${name}。(-${actualPrice}文)`)
    } else {
      addLog('铜钱不足或背包已满。')
    }
  }

  // === 万物铺 ===

  const bagPrice = computed(() => {
    const level = (inventoryStore.capacity - 24) / 4
    return 500 + level * 500
  })

  const farmExpandInfo = computed(() => {
    const prices: Record<number, { newSize: number; price: number }> = {
      4: { newSize: 6, price: 2000 },
      6: { newSize: 8, price: 5000 }
    }
    return prices[farmStore.farmSize] ?? null
  })

  const handleBuyBag = () => {
    const actualPrice = discounted(bagPrice.value)
    if (!playerStore.spendMoney(actualPrice)) {
      addLog('铜钱不足。')
      return
    }
    if (inventoryStore.expandCapacity()) {
      addLog(`背包扩容至${inventoryStore.capacity}格！(-${actualPrice}文)`)
    } else {
      playerStore.earnMoney(actualPrice, { countAsEarned: false })
      addLog('背包已满级。')
    }
  }

  const warehouseExpandPrice = computed(() => {
    const level = warehouseStore.maxChests - 3
    return 2000 + level * 2000
  })

  const handleBuyWarehouseExpand = () => {
    const actualPrice = discounted(warehouseExpandPrice.value)
    if (!playerStore.spendMoney(actualPrice)) {
      addLog('铜钱不足。')
      return
    }
    if (warehouseStore.expandMaxChests()) {
      addLog(`仓库扩建至${warehouseStore.maxChests}个箱子槽位！(-${actualPrice}文)`)
    } else {
      playerStore.earnMoney(actualPrice, { countAsEarned: false })
      addLog('仓库已满级。')
    }
  }

  const handleBuyFarmExpand = () => {
    const info = farmExpandInfo.value
    if (!info) return
    const actualPrice = discounted(info.price)
    if (!playerStore.spendMoney(actualPrice)) {
      addLog('铜钱不足。')
      return
    }
    const newSize = farmStore.expandFarm()
    if (newSize) {
      addLog(`农场扩建至${newSize}×${newSize}！(-${actualPrice}文)`)
    } else {
      playerStore.earnMoney(actualPrice, { countAsEarned: false })
      addLog('农场已满级。')
    }
  }

  const seasonName = (season: Season): string => {
    return SEASON_NAMES[season] ?? season
  }

  const getTravelerItemDesc = (itemId: string, quantity: number): string => {
    const crop = getCropBySeedId(itemId)
    if (crop) {
      return `${crop.season.map((s: Season) => SEASON_NAMES[s]).join('/')}季 · ${crop.growthDays}天成熟 · 剩余${quantity}个`
    }
    return `剩余${quantity}个`
  }

  const handleBuySapling = (saplingId: string, price: number, treeName: string) => {
    const actualPrice = discounted(price)
    if (!playerStore.spendMoney(actualPrice)) {
      addLog('铜钱不足。')
      return
    }
    if (!inventoryStore.addItem(saplingId)) {
      playerStore.earnMoney(actualPrice, { countAsEarned: false })
      addLog('背包已满，无法购买。')
      return
    }
    addLog(`购买了${treeName}苗。(-${actualPrice}文)`)
  }

  const handleBuyHay = () => {
    const actualPrice = discounted(HAY_PRICE)
    if (!playerStore.spendMoney(actualPrice)) {
      addLog('铜钱不足。')
      return
    }
    if (!inventoryStore.addItem('hay')) {
      playerStore.earnMoney(actualPrice, { countAsEarned: false })
      addLog('背包已满，无法购买。')
      return
    }
    addLog(`购买了干草。(-${actualPrice}文)`)
  }

  // === 批量购买处理 ===

  const handleBatchBuySeed = (seedId: string, count: number) => {
    const seed = shopStore.availableSeeds.find((s: { seedId: string }) => s.seedId === seedId)
    if (!seed) return
    const unitPrice = discounted(seed.price)
    if (shopStore.buySeed(seedId, count)) {
      sfxBuy()
      showFloat(`-${unitPrice * count}文`, 'danger')
      addLog(`购买了${count}个${seed.cropName}种子。(-${unitPrice * count}文)`)
    } else {
      addLog('铜钱不足或背包已满。')
    }
  }

  const handleBatchBuyItem = (itemId: string, price: number, name: string, count: number) => {
    const unitPrice = discounted(price)
    if (shopStore.buyItem(itemId, price, count)) {
      sfxBuy()
      showFloat(`-${unitPrice * count}文`, 'danger')
      addLog(`购买了${count}个${name}。(-${unitPrice * count}文)`)
    } else {
      addLog('铜钱不足或背包已满。')
    }
  }

  const handleBatchBuySapling = (saplingId: string, price: number, treeName: string, count: number) => {
    const unitPrice = discounted(price)
    let bought = 0
    for (let i = 0; i < count; i++) {
      if (!playerStore.spendMoney(unitPrice)) break
      if (!inventoryStore.addItem(saplingId)) {
        playerStore.earnMoney(unitPrice, { countAsEarned: false })
        break
      }
      bought++
    }
    if (bought > 0) {
      sfxBuy()
      showFloat(`-${unitPrice * bought}文`, 'danger')
      addLog(`购买了${bought}个${treeName}苗。(-${unitPrice * bought}文)`)
    } else {
      addLog('铜钱不足或背包已满。')
    }
  }

  const handleBatchBuyFromTraveler = (itemId: string, name: string, originalPrice: number, count: number) => {
    const unitPrice = discounted(originalPrice)
    let bought = 0
    for (let i = 0; i < count; i++) {
      if (!shopStore.buyFromTraveler(itemId)) break
      bought++
    }
    if (bought > 0) {
      sfxBuy()
      showFloat(`-${unitPrice * bought}文`, 'danger')
      addLog(`从旅行商人处购买了${bought}个${name}。(-${unitPrice * bought}文)`)
    } else {
      addLog('铜钱不足或背包已满。')
    }
  }

  // === 镖局 ===

  const hasWeaponMaterials = (w: WeaponDef): boolean => {
    for (const mat of w.shopMaterials) {
      if (inventoryStore.getItemCount(mat.itemId) < mat.quantity) return false
    }
    return true
  }

  const handleBuyWeapon = (w: WeaponDef) => {
    if (inventoryStore.hasWeapon(w.id)) {
      addLog('你已经拥有这把武器了。')
      return
    }
    if (w.shopPrice === null) return
    const actualPrice = discounted(w.shopPrice)
    if (!playerStore.spendMoney(actualPrice)) {
      addLog('铜钱不足。')
      return
    }
    for (const mat of w.shopMaterials) {
      if (!inventoryStore.removeItem(mat.itemId, mat.quantity)) {
        playerStore.earnMoney(actualPrice, { countAsEarned: false })
        addLog('材料不足。')
        return
      }
    }
    inventoryStore.addWeapon(w.id)
    const matStr =
      w.shopMaterials.length > 0 ? ' + ' + w.shopMaterials.map(m => `${getItemById(m.itemId)?.name}×${m.quantity}`).join(' + ') : ''
    addLog(`购买了${w.name}。(-${actualPrice}文${matStr})`)
  }

  // === 戒指合成 ===

  const RING_EFFECT_LABELS: Record<RingEffectType, string> = {
    attack_bonus: '攻击',
    crit_rate_bonus: '暴击',
    defense_bonus: '减伤',
    vampiric: '吸血',
    max_hp_bonus: '生命',
    stamina_reduction: '全局体力减免',
    mining_stamina: '挖矿体力减免',
    farming_stamina: '农耕体力减免',
    fishing_stamina: '钓鱼体力减免',
    crop_quality_bonus: '作物品质',
    crop_growth_bonus: '生长加速',
    fish_quality_bonus: '鱼品质',
    fishing_calm: '鱼速降低',
    sell_price_bonus: '售价加成',
    shop_discount: '商店折扣',
    gift_friendship: '送礼好感',
    monster_drop_bonus: '怪物掉落',
    exp_bonus: '经验加成',
    treasure_find: '宝箱概率',
    ore_bonus: '矿石额外',
    luck: '幸运',
    travel_speed: '旅行加速'
  }

  const craftableRings = computed(() => CRAFTABLE_RINGS)

  const canCraftRing = (ring: RingDef): boolean => {
    if (!ring.recipe) return false
    if (playerStore.money < ring.recipeMoney) return false
    for (const mat of ring.recipe) {
      if (inventoryStore.getItemCount(mat.itemId) < mat.quantity) return false
    }
    return true
  }

  const handleCraftRing = (defId: string) => {
    const result = inventoryStore.craftRing(defId)
    if (result.success) {
      sfxBuy()
      showFloat(result.message, 'success')
      addLog(result.message)
    } else {
      addLog(result.message)
    }
  }

  // === 帽子/鞋子商店 ===

  const formatEffectLabel = (eff: { type: RingEffectType; value: number }): string => {
    const label = RING_EFFECT_LABELS[eff.type]
    return label + (eff.value > 0 && eff.value < 1 ? Math.round(eff.value * 100) + '%' : '+' + eff.value)
  }

  const openHatShopModal = (hat: HatDef) => {
    const lines = ['效果：' + hat.effects.map(formatEffectLabel).join('、')]
    openBuyModal(
      hat.name,
      hat.description,
      discounted(hat.shopPrice!),
      () => handleBuyHat(hat),
      () => !inventoryStore.hasHat(hat.id) && playerStore.money >= discounted(hat.shopPrice!),
      lines
    )
  }

  const openShoeShopModal = (shoe: ShoeDef) => {
    const lines = ['效果：' + shoe.effects.map(formatEffectLabel).join('、')]
    openBuyModal(
      shoe.name,
      shoe.description,
      discounted(shoe.shopPrice!),
      () => handleBuyShoe(shoe),
      () => !inventoryStore.hasShoe(shoe.id) && playerStore.money >= discounted(shoe.shopPrice!),
      lines
    )
  }

  const openHatCraftModal = (hat: HatDef) => {
    const lines = [
      '效果：' + hat.effects.map(formatEffectLabel).join('、'),
      '材料：' +
        (hat.recipe?.map(m => `${getItemById(m.itemId)?.name ?? m.itemId}×${m.quantity}`).join('、') ?? '') +
        ` + ${hat.recipeMoney}文`
    ]
    openBuyModal(
      hat.name,
      hat.description,
      hat.recipeMoney,
      () => handleCraftHat(hat.id),
      () => canCraftHat(hat),
      lines,
      '合成'
    )
  }

  const openShoeCraftModal = (shoe: ShoeDef) => {
    const lines = [
      '效果：' + shoe.effects.map(formatEffectLabel).join('、'),
      '材料：' +
        (shoe.recipe?.map(m => `${getItemById(m.itemId)?.name ?? m.itemId}×${m.quantity}`).join('、') ?? '') +
        ` + ${shoe.recipeMoney}文`
    ]
    openBuyModal(
      shoe.name,
      shoe.description,
      shoe.recipeMoney,
      () => handleCraftShoe(shoe.id),
      () => canCraftShoe(shoe),
      lines,
      '合成'
    )
  }

  const handleBuyHat = (hat: HatDef) => {
    if (inventoryStore.hasHat(hat.id)) {
      addLog('你已经拥有这顶帽子了。')
      return
    }
    if (hat.shopPrice === null) return
    const actualPrice = discounted(hat.shopPrice)
    if (!playerStore.spendMoney(actualPrice)) {
      addLog('铜钱不足。')
      return
    }
    inventoryStore.addHat(hat.id)
    sfxBuy()
    showFloat(`-${actualPrice}文`, 'danger')
    addLog(`购买了${hat.name}。(-${actualPrice}文)`)
  }

  const handleBuyShoe = (shoe: ShoeDef) => {
    if (inventoryStore.hasShoe(shoe.id)) {
      addLog('你已经拥有这双鞋子了。')
      return
    }
    if (shoe.shopPrice === null) return
    const actualPrice = discounted(shoe.shopPrice)
    if (!playerStore.spendMoney(actualPrice)) {
      addLog('铜钱不足。')
      return
    }
    inventoryStore.addShoe(shoe.id)
    sfxBuy()
    showFloat(`-${actualPrice}文`, 'danger')
    addLog(`购买了${shoe.name}。(-${actualPrice}文)`)
  }

  const canCraftHat = (hat: HatDef): boolean => {
    if (!hat.recipe) return false
    if (playerStore.money < hat.recipeMoney) return false
    for (const mat of hat.recipe) {
      if (inventoryStore.getItemCount(mat.itemId) < mat.quantity) return false
    }
    return true
  }

  const canCraftShoe = (shoe: ShoeDef): boolean => {
    if (!shoe.recipe) return false
    if (playerStore.money < shoe.recipeMoney) return false
    for (const mat of shoe.recipe) {
      if (inventoryStore.getItemCount(mat.itemId) < mat.quantity) return false
    }
    return true
  }

  const handleCraftHat = (defId: string) => {
    const result = inventoryStore.craftHat(defId)
    if (result.success) {
      sfxBuy()
      showFloat(result.message, 'success')
      addLog(result.message)
    } else {
      addLog(result.message)
    }
  }

  const handleCraftShoe = (defId: string) => {
    const result = inventoryStore.craftShoe(defId)
    if (result.success) {
      sfxBuy()
      showFloat(result.message, 'success')
      addLog(result.message)
    } else {
      addLog(result.message)
    }
  }

  // === 通用 ===

  const handleBuyItem = (itemId: string, price: number, name: string) => {
    const actualPrice = discounted(price)
    if (shopStore.buyItem(itemId, price)) {
      addLog(`购买了${name}。(-${actualPrice}文)`)
    } else {
      addLog('铜钱不足或背包已满。')
    }
  }

  const qualityTextClass = (q: Quality, fallback = ''): string => {
    if (q === 'fine') return 'text-quality-fine'
    if (q === 'excellent') return 'text-quality-excellent'
    if (q === 'supreme') return 'text-quality-supreme'
    return fallback
  }

  // === 出售筛选 ===

  const SELL_FILTER_CATEGORIES: ItemCategory[] = [
    'crop',
    'fruit',
    'fish',
    'animal_product',
    'processed',
    'food',
    'ore',
    'gem',
    'material',
    'gift',
    'fossil',
    'artifact',
    'misc'
  ]

  const SELL_CATEGORY_NAMES: Partial<Record<ItemCategory, string>> = {
    crop: '作物',
    fruit: '水果',
    fish: '鱼类',
    animal_product: '畜产',
    processed: '加工品',
    food: '料理',
    ore: '矿石',
    gem: '宝石',
    material: '材料',
    gift: '礼物',
    fossil: '化石',
    artifact: '文物',
    misc: '杂货'
  }

  const showSellFilterModal = ref(false)
  const sellFilter = ref<ItemCategory[]>([])
  const tempSellFilter = ref<Set<ItemCategory>>(new Set())

  const isSellFilterActive = computed(() => sellFilter.value.length > 0)

  const openSellFilterModal = () => {
    tempSellFilter.value = new Set(sellFilter.value)
    showSellFilterModal.value = true
  }

  const toggleSellCategory = (cat: ItemCategory) => {
    if (tempSellFilter.value.has(cat)) {
      tempSellFilter.value.delete(cat)
    } else {
      tempSellFilter.value.add(cat)
    }
  }

  const handleSaveSellFilter = () => {
    sellFilter.value = [...tempSellFilter.value]
    showSellFilterModal.value = false
  }

  const handleClearSellFilter = () => {
    tempSellFilter.value = new Set()
  }

  const sellableItems = computed(() => {
    const allowed = sellFilter.value.length > 0 ? new Set(sellFilter.value) : null
    return inventoryStore.items
      .map((inv, index) => {
        const def = getItemById(inv.itemId)
        return { ...inv, def, originalIndex: index }
      })
      .filter(item => item.def && !item.locked && (!allowed || allowed.has(item.def!.category)))
  })
</script>

<!-- ShopHeader 内联子组件 -->
<script lang="ts">
  import { defineComponent, h } from 'vue'

  const ShopHeader = defineComponent({
    name: 'ShopHeader',
    props: {
      name: { type: String, required: true },
      npc: { type: String, required: true }
    },
    setup(props) {
      return () =>
        h('div', { class: 'flex items-center space-x-2 mb-3' }, [
          h('h3', { class: 'text-accent text-sm' }, [`${props.name} · ${props.npc}`])
        ])
    }
  })

  export default { components: { ShopHeader } }
</script>
