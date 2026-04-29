<template>
  <div>
    <!-- 标题 -->
    <div class="flex items-center justify-between mb-1">
      <div class="flex items-center space-x-1.5 text-sm text-accent">
        <Wallet :size="14" />
        <span>钱袋</span>
      </div>
      <span class="text-xs text-muted">{{ unlockedCount }}/{{ WALLET_ITEMS.length }}</span>
    </div>
    <p v-if="!isCompactMobile" class="text-xs text-muted mb-3">永久被动加成，满足条件后自动解锁。</p>

    <div v-if="isCompactMobile" class="border border-accent/20 rounded-xs p-3 mb-3 bg-bg/70" data-testid="wallet-primary-action-card">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-[10px] tracking-[0.24em] text-accent/70">当前推荐动作</p>
          <p class="text-sm text-accent mt-1">{{ walletPrimaryActionCard.title }}</p>
          <p class="text-xs text-muted mt-2 leading-5">{{ walletPrimaryActionCard.summary }}</p>
        </div>
        <span class="text-[10px] shrink-0" :class="walletPrimaryActionCard.statusToneClass">{{ walletPrimaryActionCard.statusLabel }}</span>
      </div>
      <div v-if="walletPrimaryActionCard.detailLines.length > 0" class="mt-3 space-y-1">
        <p v-for="line in walletPrimaryActionCard.detailLines" :key="`wallet-primary-action-${line}`" class="text-xs text-muted leading-5">
          · {{ line }}
        </p>
      </div>
      <button class="mt-3 w-full border border-accent/20 rounded-xs px-3 py-2 text-xs text-accent hover:bg-accent/5" @click="handleWalletPrimaryAction">
        {{ walletPrimaryActionCard.ctaLabel }}
      </button>
    </div>

    <div v-if="isCompactMobile" class="border border-accent/15 rounded-xs px-3 py-2 mb-3 bg-bg/10">
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="text-xs text-accent">钱袋提示</p>
          <p class="text-xs text-muted mt-1 leading-5">先看本周预算和当前资金去向，需要时再展开高地战备、经济摘要和商圈豪华消费路线。</p>
        </div>
        <button class="btn !px-2 !py-1 text-xs shrink-0" @click="walletPreludeExpanded = !walletPreludeExpanded">
          {{ walletPreludeExpanded || walletPreludeForceOpen ? '收起' : '展开' }}
        </button>
      </div>
    </div>

    <template v-if="!isCompactMobile || walletPreludeExpanded || walletPreludeForceOpen">
    <div v-if="cloudHighlandWalletPrep" class="border border-accent/20 rounded-xs p-3 mb-3 bg-accent/5">
      <div class="flex items-center justify-between gap-2">
        <p class="text-xs text-accent">云岚高地战备</p>
        <span class="text-[10px] text-muted">行旅图 -> 高阶准备</span>
      </div>
      <p class="text-xs text-muted mt-1 leading-5">
        当前灵脉结晶库存 {{ cloudHighlandWalletPrep.leyQty }} 份，建设券 {{ cloudHighlandWalletPrep.constructionTickets }}，后勤券 {{ cloudHighlandWalletPrep.guildLogisticsTickets }}。
      </p>
      <p class="text-xs text-muted mt-1 leading-5">
        建议先确认高地巡路和首领前的预算、票券和背包余量，再继续冲下一轮高地战备。
      </p>
      <div class="mt-2 flex flex-wrap gap-2">
        <button class="btn prompt-action-cta !px-2 !py-1 text-[10px]" @click="navigateToPanel('region-map')">去行旅图</button>
        <button class="btn prompt-action-cta !px-2 !py-1 text-[10px]" @click="navigateToPanel('guild')">去公会</button>
      </div>
    </div>

    <div
      class="border border-accent/20 rounded-xs p-3 mb-3"
      :class="promptSectionClass('economy-overview')"
      :data-prompt-focus="buildPromptFocusAttr('economy-overview')"
    >
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-1.5 text-sm text-accent">
          <TrendingUp :size="14" />
          <span>后期经济观测</span>
        </div>
        <span class="text-xs" :class="economyRiskClass">{{ economyRiskLabel }}</span>
      </div>
      <p class="text-xs text-muted mb-2">
        {{ economyOverview.currentSegment?.label ?? '经营观察中' }}
        <span v-if="economyOverview.currentSegment">· {{ economyOverview.currentSegment.recommendedFocus }}</span>
      </p>

      <div class="grid grid-cols-2 gap-2 mb-2">
        <div v-for="metric in economyMetricCards" :key="metric.label" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/20">
          <p class="text-[10px] text-muted">{{ metric.label }}</p>
          <p class="text-sm text-accent mt-0.5">{{ metric.value }}</p>
          <p class="text-[10px] text-muted mt-1">{{ metric.hint }}</p>
        </div>
      </div>

      <div v-if="economyOverview.latestRiskReport?.summary" class="border rounded-xs px-2 py-2 mb-2" :class="economyRiskPanelClass">
        <div class="flex items-center gap-1 text-[10px] mb-1" :class="economyRiskClass">
          <AlertTriangle :size="12" />
          <span>风险提示</span>
        </div>
        <p class="text-xs text-muted">{{ economyOverview.latestRiskReport.summary }}</p>
      </div>

      <div class="border border-accent/10 rounded-xs p-2">
        <p class="text-[10px] text-accent mb-1">推荐资金去向</p>
        <div class="space-y-1.5">
          <div v-for="sink in economyRecommendedSinks" :key="sink.id" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs text-text">{{ sink.name }}</p>
              <span class="text-[10px] text-accent">{{ sink.priceBandLabel }}</span>
            </div>
            <p class="text-[10px] text-muted mt-1">{{ sink.showcaseHook }}</p>
            <p class="text-[10px] text-muted/80 mt-1">联动：{{ sink.linkedSystemsLabel }}</p>
          </div>
        </div>
      </div>
      <div class="mt-3 flex flex-wrap gap-2">
        <button class="btn prompt-action-cta !px-2 !py-1 text-[10px]" @click="focusWalletSection('weekly-budget', '看周预算')">看周预算</button>
        <button class="btn prompt-action-cta !px-2 !py-1 text-[10px]" @click="openShopPromptTarget('recommended-consumption', '去商圈推荐区')">
          去商圈推荐区
        </button>
      </div>
    </div>

    <GuidanceDigestPanel surface-id="wallet" title="资金去向引导" />
    <QaGovernancePanel page-id="wallet" title="QA 治理总览" />

    <div
      class="border border-accent/20 rounded-xs p-3 mb-3"
      :class="promptSectionClass('recommended-consumption')"
      :data-prompt-focus="buildPromptFocusAttr('recommended-consumption')"
    >
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-1.5 text-sm text-accent">
          <Store :size="14" />
          <span>商店豪华消费路线</span>
        </div>
        <span class="text-xs text-muted">{{ shopStore.currentLuxuryAuditSegment?.label ?? '经营观察中' }}</span>
      </div>
      <p class="text-xs text-muted mb-2">
        {{ shopStore.currentLuxuryAuditSegment?.recommendedFocus ?? '优先在每周精选、高价长期商品与可复购服务间建立稳定投入。' }}
      </p>

      <div class="grid grid-cols-2 gap-2 mb-2">
        <div v-for="metric in walletCatalogMetricCards" :key="metric.label" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/20">
          <p class="text-[10px] text-muted">{{ metric.label }}</p>
          <p class="text-sm text-accent mt-0.5">{{ metric.value }}</p>
          <p class="text-[10px] text-muted mt-1">{{ metric.hint }}</p>
        </div>
      </div>

      <div v-if="shopStore.weeklySurpriseOffer" class="border border-warning/20 rounded-xs p-2 mb-2 bg-warning/5">
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs text-warning">本周精选提醒</p>
          <span class="text-[10px] text-warning">{{ shopStore.weeklyCatalogRefreshText }}</span>
        </div>
        <p class="text-xs text-text mt-1">{{ shopStore.weeklySurpriseOffer.name }}</p>
        <p class="text-[10px] text-muted mt-0.5">{{ shopStore.weeklySurpriseOffer.description }}</p>
        <p class="text-[10px] text-success mt-1">{{ walletCatalogFeaturedReason }}</p>
      </div>

      <div class="border border-accent/10 rounded-xs p-2 bg-bg/10">
        <p class="text-[10px] text-accent mb-1">与你当前路线更契合的货架</p>
        <div class="space-y-1.5">
          <div v-for="offer in walletCatalogRecommendedOffers" :key="offer.id" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs text-text">{{ offer.name }}</p>
              <span class="text-[10px] text-accent">{{ shopStore.applyDiscount(offer.price) }}文</span>
            </div>
            <p class="text-[10px] text-muted mt-0.5">{{ offer.description }}</p>
            <p class="text-[10px] text-success mt-1">{{ shopStore.getCatalogOfferPreferenceReason(offer.id) }}</p>
          </div>
          <p v-if="walletCatalogRecommendedOffers.length === 0" class="text-[10px] text-muted">当前暂无额外推荐，先完成图鉴、主题周或流派节点解锁可获得更明确的商店路线提示。</p>
        </div>
      </div>
      <div class="mt-3 flex flex-wrap gap-2">
        <button class="btn prompt-action-cta !px-2 !py-1 text-[10px]" @click="openShopPromptTarget('recommended-consumption', '去万物铺推荐区')">
          去万物铺推荐区
        </button>
        <button class="btn prompt-action-cta !px-2 !py-1 text-[10px]" @click="focusWalletSection('weekly-budget', '回看周预算')">回看周预算</button>
      </div>
    </div>
    </template>

    <div
      class="border border-accent/20 rounded-xs p-3 mb-3"
      :class="promptSectionClass('weekly-budget')"
      :data-prompt-focus="buildPromptFocusAttr('weekly-budget')"
    >
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-accent">周预算系统</span>
        <span class="text-xs text-muted">{{ weeklyBudgetActiveCount }}/{{ weeklyBudgetChannels.length }} 槽</span>
      </div>
      <p class="text-xs text-muted mb-2">每周可分别为商路、展馆、学舍投入预算；当周目标收益立即生效，下周开始自动失效并重新选择。</p>

      <div class="border border-accent/10 rounded-xs p-2 mb-2 bg-bg/10">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs text-muted">当前周次</span>
          <span class="text-xs text-accent">{{ weeklyBudgetWeekLabel }}</span>
        </div>
        <div class="flex items-center justify-between gap-2 mt-1">
          <span class="text-xs text-muted">本周已结算目标</span>
          <span class="text-xs text-accent">{{ weeklyBudgetPlan.completedGoalCount }} 次</span>
        </div>
        <div class="mt-1">
          <p class="text-xs text-muted">本周票券累计</p>
          <p class="text-[10px] text-muted/80 mt-0.5">{{ weeklyBudgetTicketSummary }}</p>
        </div>
      </div>

      <div class="space-y-2">
        <div v-for="entry in weeklyBudgetChannelEntries" :key="entry.channel.channelId" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
          <div class="flex items-center justify-between gap-2">
            <div>
              <p class="text-xs text-text">{{ entry.channel.label }}</p>
              <p class="text-[10px] text-muted mt-0.5">{{ entry.channel.description }}</p>
            </div>
            <span class="text-[10px]" :class="entry.selection ? 'text-success' : 'text-muted'">
              {{ entry.selection ? `已投入 · ${entry.selection.tierLabel}` : '本周未投入' }}
            </span>
          </div>

          <div v-if="entry.selection" class="border border-success/20 rounded-xs p-2 mt-2 bg-success/5">
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs text-success">{{ entry.selection.tierLabel }}</p>
              <span class="text-[10px] text-success">{{ entry.selection.costMoney }}文</span>
            </div>
            <p class="text-[10px] text-muted mt-1">{{ entry.selection.effect.summary }}</p>
          </div>

          <div v-else class="grid grid-cols-1 gap-2 mt-2">
            <button
              v-for="tier in entry.channel.tiers"
              :key="tier.id"
              class="border border-accent/10 rounded-xs px-2 py-2 text-left hover:bg-accent/5 transition-colors"
              @click="handleActivateWeeklyBudget(entry.channel.channelId, tier.id)"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs text-accent">{{ tier.label }}</p>
                <span class="text-[10px] text-accent">{{ tier.costMoney }}文</span>
              </div>
              <p class="text-[10px] text-muted mt-1">{{ tier.effect.summary }}</p>
              <p class="text-[10px] text-muted/70 mt-1">预计周回报参考：{{ tier.projectedValue }}文</p>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      class="border border-accent/20 rounded-xs p-3 mb-3"
      :class="promptSectionClass('reward-ticket')"
      :data-prompt-focus="buildPromptFocusAttr('reward-ticket')"
    >
      <div class="flex items-center justify-between gap-3 mb-2">
        <div class="min-w-0">
          <span class="text-sm text-accent">资源券 / 凭证</span>
          <p v-if="isCompactMobile && !isWalletSectionOpen('reward-ticket')" class="mt-1 text-xs text-muted leading-5">
            先看当前哪些票券已经到账，需要时再展开兑换列表。
          </p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="text-xs text-muted">{{ rewardTicketFilledCount }}/{{ rewardTicketEntries.length }} 已入账</span>
          <button
            v-if="isCompactMobile"
            class="border border-accent/20 rounded-xs px-2 py-1 text-xs text-accent hover:bg-accent/5"
            @click="toggleWalletSection('reward-ticket')"
          >
            {{ isWalletSectionOpen('reward-ticket') ? '收起' : '展开' }}
          </button>
        </div>
      </div>
      <template v-if="!isCompactMobile || isWalletSectionOpen('reward-ticket')">
      <p class="text-xs text-muted mb-2">高阶经营奖励会逐步改为票券发放，可在这里查看余额并兑换对应的专项补给。</p>

      <div class="space-y-2 mb-3">
        <div
          v-for="entry in rewardTicketEntries"
          :key="entry.id"
          class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10"
        >
          <div class="flex items-center justify-between gap-2">
            <div>
              <p class="text-xs text-text">{{ entry.label }}</p>
              <p class="text-[10px] text-muted mt-0.5">{{ entry.description }}</p>
            </div>
            <span class="text-xs" :class="entry.balance > 0 ? 'text-success' : 'text-muted'">{{ entry.balance }}</span>
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <div
          v-for="offer in rewardTicketExchangeOffers"
          :key="offer.id"
          class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10"
        >
          <div class="flex items-center justify-between gap-2">
            <div>
              <p class="text-xs text-accent">{{ offer.label }}</p>
              <p class="text-[10px] text-muted mt-0.5">{{ offer.description }}</p>
            </div>
            <span class="text-[10px] text-muted">{{ offer.balance }}/{{ offer.costTickets }}</span>
          </div>
          <p class="text-[10px] text-muted mt-1">兑换内容：{{ offer.rewardSummary }}</p>
          <button
            class="mt-2 border border-accent/20 rounded-xs px-2 py-1 text-[10px] transition-colors"
            :class="offer.affordable ? 'text-accent hover:bg-accent/5' : 'text-muted opacity-50 cursor-not-allowed'"
            :disabled="!offer.affordable"
            @click="handleRedeemRewardTicketOffer(offer.id)"
          >
            消耗 {{ offer.costTickets }} {{ offer.ticketLabel }}兑换
          </button>
        </div>
      </div>
      </template>
    </div>

    <div
      class="border border-accent/20 rounded-xs p-3 mb-3"
      :class="promptSectionClass('quota-exchange')"
      :data-prompt-focus="buildPromptFocusAttr('quota-exchange')"
    >
      <div class="flex items-center justify-between gap-3 mb-2">
        <div class="min-w-0">
          <span class="text-sm text-accent">额度兑换</span>
          <p v-if="isCompactMobile && !isWalletSectionOpen('quota-exchange')" class="mt-1 text-xs text-muted leading-5">
            需要时再展开额度明细和双向兑换操作。
          </p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="text-xs text-muted">{{ playerStore.money }}文</span>
          <button
            v-if="isCompactMobile"
            class="border border-accent/20 rounded-xs px-2 py-1 text-xs text-accent hover:bg-accent/5"
            @click="toggleWalletSection('quota-exchange')"
          >
            {{ isWalletSectionOpen('quota-exchange') ? '收起' : '展开' }}
          </button>
        </div>
      </div>
      <template v-if="!isCompactMobile || isWalletSectionOpen('quota-exchange')">
      <p class="text-xs text-muted mb-2">桃源铜钱可与账号额度双向兑换，汇率由管理员统一配置。</p>

      <div class="border border-accent/10 rounded-xs p-2 mb-2">
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted">当前账号额度</span>
          <span class="text-xs" :class="exchangeContext.loggedIn ? 'text-accent' : 'text-muted'">
            {{ exchangeContext.loggedIn ? `${quotaDisplay} quota / $${dollarsDisplay}` : '未登录' }}
          </span>
        </div>
        <div class="flex items-center justify-between mt-0.5">
          <span class="text-xs text-muted">兑换汇率</span>
          <span class="text-xs text-accent">1文 = ${{ exchangeContext.exchangeRateDollarPerMoney.toFixed(6) }}</span>
        </div>
        <div class="flex items-center justify-between mt-0.5">
          <span class="text-xs text-muted">参考</span>
          <span class="text-xs text-muted">{{ moneyPerDollarLabel }}</span>
        </div>
        <div class="flex items-center justify-between mt-0.5">
          <span class="text-xs text-muted">今日转入（额度→铜钱）</span>
          <span class="text-xs" :class="importLimitReached ? 'text-warning' : 'text-muted'">{{ dailyImportUsageLabel }}</span>
        </div>
        <div class="flex items-center justify-between mt-0.5">
          <span class="text-xs text-muted">今日提现（铜钱→额度）</span>
          <span class="text-xs" :class="exportLimitReached ? 'text-warning' : 'text-muted'">{{ dailyExportUsageLabel }}</span>
        </div>
      </div>

      <div class="border border-accent/10 rounded-xs p-2 mb-2">
        <p class="text-xs text-muted mb-1">兑换铜钱</p>
        <input
          v-model.number="exchangeMoney"
          type="number"
          min="1"
          step="1"
          class="w-full px-2 py-1.5 bg-bg border border-accent/30 rounded-xs text-xs text-text focus:border-accent outline-none"
          placeholder="请输入要兑换的铜钱数量"
        />
        <p class="text-[10px] text-muted mt-1">{{ exchangePreviewLabel }}</p>
        <p v-if="!hasServerExchangeSession" class="text-[10px] text-warning mt-1">
          {{ exchangeSessionHint }}
        </p>
        <p v-if="importLimitReached || exportLimitReached" class="text-[10px] text-warning mt-1">
          {{ importLimitReached ? '今日转入额度已达上限。' : '' }}{{ exportLimitReached ? '今日提现额度已达上限。' : '' }}
        </p>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <button
          class="btn text-xs justify-center"
          :class="canImport ? '' : 'opacity-50 cursor-not-allowed'"
          :disabled="!canImport || importing"
          @click="handleImport"
        >
          {{ importing ? '导入中...' : '导入额度→铜钱' }}
        </button>
        <button
          class="btn text-xs justify-center"
          :class="canExport ? '' : 'opacity-50 cursor-not-allowed'"
          :disabled="!canExport || exporting"
          @click="handleExport"
        >
          {{ exporting ? '导出中...' : '导出铜钱→额度' }}
        </button>
      </div>
      </template>
    </div>

    <div
      class="border border-accent/20 rounded-xs p-3 mb-3"
      :class="promptSectionClass('archetype-overview')"
      :data-prompt-focus="buildPromptFocusAttr('archetype-overview')"
    >
      <div class="flex items-center justify-between gap-3 mb-2">
        <div class="min-w-0">
          <span class="text-sm text-accent">钱包流派</span>
          <p v-if="isCompactMobile && !isWalletSectionOpen('archetype-overview')" class="mt-1 text-xs text-muted leading-5">
            需要时再展开流派列表和节点路线。
          </p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="text-xs text-muted">{{ walletStore.currentArchetype ? '已选择' : '未选择' }}</span>
          <button
            v-if="isCompactMobile"
            class="border border-accent/20 rounded-xs px-2 py-1 text-xs text-accent hover:bg-accent/5"
            @click="toggleWalletSection('archetype-overview')"
          >
            {{ isWalletSectionOpen('archetype-overview') ? '收起' : '展开' }}
          </button>
        </div>
      </div>
      <template v-if="!isCompactMobile || isWalletSectionOpen('archetype-overview')">
      <p class="text-xs text-muted mb-3">在旧钱包被动之外，可额外选择一个经营流派，影响目标偏好与商店推荐。</p>

      <div class="grid grid-cols-1 gap-2 mb-3">
        <button
          v-for="archetype in walletStore.archetypes"
          :key="archetype.id"
          class="border rounded-xs px-3 py-2 text-left transition-colors"
          :class="walletStore.currentArchetypeId === archetype.id ? 'border-accent bg-accent/5' : walletStore.canUnlockArchetype(archetype.id) ? 'border-accent/20 hover:bg-accent/5' : 'border-accent/10 opacity-70'"
          @click="handleSelectArchetype(archetype.id)"
        >
          <div class="flex items-center justify-between gap-2">
            <div>
              <p class="text-sm" :class="walletStore.currentArchetypeId === archetype.id ? 'text-accent' : ''">{{ archetype.name }}</p>
              <p class="text-[10px] text-muted mt-0.5">{{ archetype.title }}</p>
            </div>
            <span class="text-[10px]" :class="walletStore.canUnlockArchetype(archetype.id) ? 'text-success' : 'text-warning'">
              {{ walletStore.canUnlockArchetype(archetype.id) ? (walletStore.currentArchetypeId === archetype.id ? '使用中' : '可选择') : '未解锁' }}
            </span>
          </div>
          <p class="text-xs text-muted mt-1">{{ archetype.description }}</p>
          <p class="text-[10px] text-muted mt-1">{{ walletStore.getArchetypeUnlockHint(archetype.id) }}</p>
        </button>
      </div>

      <div v-if="walletStore.currentArchetype" class="border border-accent/10 rounded-xs p-2 mb-2">
        <div class="flex items-center justify-between gap-2 mb-1">
          <p class="text-xs text-accent">{{ walletStore.currentArchetype.name }} · 当前效果</p>
          <button class="text-[10px] text-warning hover:text-warning/80" @click="openResetArchetypeConfirm">重置流派</button>
        </div>
        <p class="text-xs text-muted">{{ walletStore.getArchetypeDescriptionText(walletStore.currentArchetype.id) }}</p>
        <div class="border border-accent/10 rounded-xs p-2 mt-2 bg-bg/20">
          <p class="text-[10px] text-accent mb-1">主效果</p>
          <p class="text-xs text-muted">{{ walletStore.currentArchetypeMainEffectText }}</p>
          <ul v-if="walletStore.currentArchetypeMainEffectSummary.length > 0" class="mt-2 space-y-1">
            <li v-for="summary in walletStore.currentArchetypeMainEffectSummary" :key="summary" class="text-[10px] text-muted">• {{ summary }}</li>
          </ul>
        </div>
        <div v-if="walletStore.currentArchetypeNodeEffects.length > 0" class="border border-success/20 rounded-xs p-2 mt-2 bg-success/5">
          <p class="text-[10px] text-success mb-1">已激活节点效果</p>
          <div class="space-y-1.5">
            <div v-for="nodeEffect in walletStore.currentArchetypeNodeEffects" :key="nodeEffect.id" class="border border-success/10 rounded-xs px-2 py-2 bg-bg/10">
              <div class="flex items-center justify-between gap-2">
                <p class="text-[10px] text-text">{{ nodeEffect.name }}</p>
                <div class="flex flex-wrap gap-1 justify-end">
                  <span v-for="label in nodeEffect.moduleLabels" :key="`${nodeEffect.id}-${label}`" class="text-[10px] px-1 rounded-xs border border-success/20 text-success">
                    {{ label }}
                  </span>
                </div>
              </div>
              <ul v-if="nodeEffect.summaries.length > 0" class="mt-1 space-y-1">
                <li v-for="summary in nodeEffect.summaries" :key="`${nodeEffect.id}-${summary}`" class="text-[10px] text-muted">• {{ summary }}</li>
              </ul>
            </div>
          </div>
        </div>
        <ul class="mt-2 space-y-1">
          <li v-for="summary in walletStore.getCurrentArchetypeSummary()" :key="summary" class="text-[10px] text-muted">• {{ summary }}</li>
        </ul>
      </div>

      <div v-if="walletStore.currentArchetypeNodes.length > 0" class="space-y-2">
        <p class="text-xs text-accent">流派节点</p>
        <div
          v-for="node in walletStore.currentArchetypeNodes"
          :key="node.id"
          class="border rounded-xs px-3 py-2"
          :class="walletStore.isNodeUnlocked(node.id) ? 'border-success/30 bg-success/5' : 'border-accent/10'"
        >
          <div class="flex items-center justify-between gap-2">
            <div>
              <p class="text-xs">{{ node.name }}</p>
              <p class="text-[10px] text-muted mt-0.5">{{ node.description }}</p>
              <div class="flex flex-wrap gap-1 mt-1">
                <span
                  v-for="label in walletStore.getNodeModuleLabels(node.id)"
                  :key="`${node.id}-${label}`"
                  class="text-[10px] px-1 rounded-xs border border-accent/20 text-accent"
                >
                  {{ label }}
                </span>
              </div>
            </div>
            <button
              class="btn !px-2 !py-1 text-[10px]"
              :class="walletStore.canUnlockNode(node.id) ? '' : 'opacity-50 cursor-not-allowed'"
              :disabled="walletStore.isNodeUnlocked(node.id) || !walletStore.canUnlockNode(node.id)"
              @click="handleUnlockNode(node.id)"
            >
              {{ walletStore.isNodeUnlocked(node.id) ? '已解锁' : '解锁' }}
            </button>
          </div>
          <ul v-if="walletStore.getNodeEffectSummary(node.id).length > 0" class="mt-1 space-y-1">
            <li v-for="summary in walletStore.getNodeEffectSummary(node.id)" :key="`${node.id}-${summary}`" class="text-[10px] text-muted">• {{ summary }}</li>
          </ul>
          <p class="text-[10px] text-muted mt-1">条件：{{ walletStore.getNodeUnlockHint(node.id) }}</p>
        </div>
      </div>
      </template>
    </div>

    <div class="flex flex-col space-y-1.5">
      <div
        v-for="item in WALLET_ITEMS"
        :key="item.id"
        class="border rounded-xs px-3 py-1.5 cursor-pointer hover:bg-accent/5"
        :class="walletStore.has(item.id) ? 'border-accent/20' : 'border-accent/10 opacity-50'"
        @click="selectedItem = item"
      >
        <div class="flex items-center justify-between">
          <span class="text-sm" :class="walletStore.has(item.id) ? 'text-accent' : 'text-muted'">
            {{ item.name }}
          </span>
          <CircleCheck v-if="walletStore.has(item.id)" :size="14" class="text-success shrink-0" />
          <Lock v-else :size="14" class="text-muted shrink-0" />
        </div>
        <p class="text-xs text-muted mt-0.5">{{ item.description }}</p>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="selectedItem"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="selectedItem = null"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="selectedItem = null">
            <X :size="14" />
          </button>
          <p class="text-sm mb-2" :class="walletStore.has(selectedItem.id) ? 'text-accent' : 'text-muted'">
            {{ selectedItem.name }}
          </p>
          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted mb-1">效果</p>
            <p class="text-xs">{{ selectedItem.description }}</p>
          </div>
          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted mb-1">解锁条件</p>
            <p class="text-xs">{{ selectedItem.unlockCondition }}</p>
          </div>
          <div class="border rounded-xs p-2" :class="walletStore.has(selectedItem.id) ? 'border-success/30' : 'border-accent/10'">
            <div class="flex items-center justify-center space-x-1">
              <CircleCheck v-if="walletStore.has(selectedItem.id)" :size="12" class="text-success" />
              <Lock v-else :size="12" class="text-muted" />
              <span class="text-xs" :class="walletStore.has(selectedItem.id) ? 'text-success' : 'text-muted'">
                {{ walletStore.has(selectedItem.id) ? '已解锁' : '未解锁' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="panel-fade">
      <div
        v-if="showResetArchetypeConfirm"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="showResetArchetypeConfirm = false"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="showResetArchetypeConfirm = false">
            <X :size="14" />
          </button>
          <p class="text-sm text-warning mb-2">重置钱包流派</p>
          <p class="text-xs text-muted leading-relaxed mb-2">
            确认后将清空当前已选择的流派与已解锁节点进度，此操作无法撤销。
          </p>
          <div class="border border-warning/20 rounded-xs p-2 mb-3 bg-warning/5">
            <p class="text-xs text-warning">{{ walletStore.currentArchetype?.name ?? '当前流派' }}</p>
            <p class="text-[10px] text-muted mt-1">已解锁节点 {{ unlockedArchetypeNodeCount }} 个</p>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <button class="btn text-xs justify-center" @click="showResetArchetypeConfirm = false">取消</button>
            <button class="btn text-xs justify-center !bg-warning !text-bg" @click="handleResetArchetype">确认重置</button>
          </div>
        </div>
      </div>
    </Transition>
    <Transition name="panel-fade">
      <div
        v-if="showSwitchArchetypeConfirm && pendingArchetypeId"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="cancelSwitchArchetype"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="cancelSwitchArchetype">
            <X :size="14" />
          </button>
          <p class="text-sm text-warning mb-2">切换钱包流派</p>
          <p class="text-xs text-muted leading-relaxed mb-2">
            切换后会清空当前流派已解锁的节点进度，确认要从「{{ walletStore.currentArchetype?.name ?? '当前流派' }}」切到「{{ getArchetypeName(pendingArchetypeId) }}」吗？
          </p>
          <div class="border border-warning/20 rounded-xs p-2 mb-3 bg-warning/5">
            <p class="text-xs text-warning">当前已解锁节点 {{ unlockedArchetypeNodeCount }} 个</p>
            <p class="text-[10px] text-muted mt-1">该操作不会影响旧钱袋被动，只会重置当前流派路线。</p>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <button class="btn text-xs justify-center" @click="cancelSwitchArchetype">取消</button>
            <button class="btn text-xs justify-center !bg-warning !text-bg" @click="confirmSwitchArchetype">确认切换</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted } from 'vue'
  import { Wallet, CircleCheck, Lock, X, TrendingUp, AlertTriangle, Store } from 'lucide-vue-next'
  import { navigateToPanel } from '@/composables/useNavigation'
  import { runPromptAction, usePromptFocusPanel } from '@/composables/usePromptNavigation'
  import GuidanceDigestPanel from '@/components/game/GuidanceDigestPanel.vue'
  import QaGovernancePanel from '@/components/game/QaGovernancePanel.vue'
  import { useGoalStore } from '@/stores/useGoalStore'
  import { useRegionMapStore } from '@/stores/useRegionMapStore'
  import { useShopStore } from '@/stores/useShopStore'
  import { useWalletStore } from '@/stores/useWalletStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import { useSaveStore } from '@/stores/useSaveStore'
  import { WALLET_ITEMS } from '@/data/wallet'
  import type { WalletArchetypeId, WalletItemDef, WeeklyBudgetChannelId } from '@/types'
  import { addLog, showFloat } from '@/composables/useGameLog'
  import { exportTaoyuanToQuota, fetchTaoyuanExchangeContext, importQuotaToTaoyuan } from '@/utils/quotaExchangeApi'

  const goalStore = useGoalStore()
  const shopStore = useShopStore()
  const walletStore = useWalletStore()
  const playerStore = usePlayerStore()
  const regionMapStore = useRegionMapStore()
  const saveStore = useSaveStore()
  const { buildPromptFocusAttr, isPromptFocusActive } = usePromptFocusPanel('wallet')
  const isCompactMobile = ref(false)
  const walletPreludeExpanded = ref(false)
  const walletSectionExpandedState = ref<Record<string, boolean>>({})
  const syncCompactViewportMode = () => {
    isCompactMobile.value = typeof window !== 'undefined' ? window.innerWidth < 768 : false
  }
  const walletPreludeForceOpen = computed(() =>
    ['economy-overview', 'recommended-consumption'].some(key => isPromptFocusActive(key))
  )
  const isWalletSectionOpen = (sectionKey: string) =>
    !isCompactMobile.value || walletSectionExpandedState.value[sectionKey] || isPromptFocusActive(sectionKey)
  const toggleWalletSection = (sectionKey: string) => {
    walletSectionExpandedState.value = {
      ...walletSectionExpandedState.value,
      [sectionKey]: !isWalletSectionOpen(sectionKey)
    }
  }

  const selectedItem = ref<WalletItemDef | null>(null)
  const showResetArchetypeConfirm = ref(false)
  const showSwitchArchetypeConfirm = ref(false)
  const pendingArchetypeId = ref<WalletArchetypeId | null>(null)
  const exchangeMoney = ref(100)
  const importing = ref(false)
  const exporting = ref(false)
  const exchangeContext = ref({
    exchangeRateDollarPerMoney: 0.0002,
    exchangeRateQuotaPerMoney: 100,
    accountExchangeRate: 500000,
    dailyImportLimitMoney: 0,
    dailyExportLimitMoney: 0,
    todayImportedMoney: 0,
    todayExportedMoney: 0,
    quota: null as number | null,
    dollars: null as number | null,
    loggedIn: false,
    returnButtonEnabled: true,
    returnButtonText: '返回首页',
    returnButtonUrl: '/',
    aboutButtonEnabled: true,
    aboutButtonText: '关于游戏',
    aboutDialogTitle: '关于桃源乡',
    aboutDialogContent: '',
  })

  const focusWalletSection = (focusKey: string, label: string) => {
    runPromptAction({
      id: `wallet-${focusKey}`,
      label,
      mode: 'cta',
      panelKey: 'wallet',
      focusKey
    })
  }

  const openShopPromptTarget = (focusKey: string, label: string) => {
    runPromptAction({
      id: `shop-${focusKey}`,
      label,
      mode: 'cta',
      panelKey: 'shop',
      focusKey
    })
  }

  const promptSectionClass = (focusKey: string) => (isPromptFocusActive(focusKey) ? 'prompt-focus-target--active' : '')

  const cloudHighlandWalletPrep = computed(() => {
    const leyQty = regionMapStore.getFamilyResourceQuantity('ley_crystal')
    const isFocused = regionMapStore.currentWeeklyFocus.focusedRegionId === 'cloud_highland'
    if (!regionMapStore.regionIntegrationEnabled || (!isFocused && leyQty <= 0)) return null
    return {
      leyQty,
      constructionTickets: walletStore.getRewardTicketBalance('construction'),
      guildLogisticsTickets: walletStore.getRewardTicketBalance('guildLogistics')
    }
  })

  const unlockedCount = computed(() => WALLET_ITEMS.filter(i => walletStore.has(i.id)).length)
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
  const economyMetricCards = computed(() => [
    {
      label: '通胀压力',
      value: economyOverview.value.inflationPressure.toFixed(1),
      hint: '越高越需要新 sink 承接资产'
    },
    {
      label: '消耗满足度',
      value: `${Math.round(economyOverview.value.sinkSatisfaction * 100)}%`,
      hint: '越低越说明花钱出口不足'
    },
    {
      label: '循环多样度',
      value: String(economyOverview.value.loopDiversity),
      hint: '越低越容易陷入单一路线'
    },
    {
      label: '单系统收入占比',
      value: `${Math.round(economyOverview.value.dominantIncomeShare * 100)}%`,
      hint: '过高时应主动切换经营方向'
    }
  ])
  const economyRecommendedSinks = computed(() => {
    return goalStore.recommendedEconomySinks.slice(0, 3).map(item => ({
      ...item,
      priceBandLabel: `${item.priceBand[0]}~${item.priceBand[1]}文`,
      linkedSystemsLabel: item.linkedSystems.join(' / ')
    }))
  })
  const walletCatalogMetricCards = computed(() => {
    const summary = shopStore.catalogOverviewSummary
    return [
      {
        label: '已解锁目录',
        value: `${summary.unlockedOffers}/${summary.totalOffers}`,
        hint: `已拥有 ${summary.ownedOffers} 项`
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
  const walletCatalogRecommendedOffers = computed(() => shopStore.recommendedCatalogOffers.slice(0, 3))
  const walletCatalogFeaturedReason = computed(() => {
    const offer = shopStore.weeklySurpriseOffer
    if (!offer) return '本周尚未生成精选推荐。'
    return shopStore.getCatalogOfferPreferenceReason(offer.id) || '本周优先关注周精选货架，适合作为当前经营路线的快速消费入口。'
  })
  const weeklyBudgetChannels = computed(() => goalStore.weeklyBudgetChannels)
  const weeklyBudgetPlan = computed(() => goalStore.weeklyBudgetPlan)
  const weeklyBudgetActiveCount = computed(() => Object.keys(weeklyBudgetPlan.value.selections).length)
  const rewardTicketEntries = computed(() => walletStore.rewardTicketEntries)
  const rewardTicketFilledCount = computed(() => rewardTicketEntries.value.filter(entry => entry.balance > 0).length)
  const rewardTicketExchangeOffers = computed(() =>
    walletStore.ticketExchangeOffers.map(offer => ({
      ...offer,
      ticketLabel: walletStore.getTicketLabel(offer.ticketType)
    }))
  )
  const weeklyBudgetChannelEntries = computed(() =>
    weeklyBudgetChannels.value.map(channel => ({
      channel,
      selection: goalStore.getWeeklyBudgetSelection(channel.channelId)
    }))
  )
  const WEEKLY_BUDGET_TICKET_LABELS: Record<string, string> = {
    caravan: '商路票券',
    exhibit: '展馆票券',
    research: '学舍票券'
  }
  const weeklyBudgetTicketSummary = computed(() => {
    const entries = Object.entries(weeklyBudgetPlan.value.ticketBalances)
      .filter(([, amount]) => (Number(amount) || 0) > 0)
      .map(([ticketType, amount]) => `${WEEKLY_BUDGET_TICKET_LABELS[ticketType] ?? ticketType}×${amount}`)
    return entries.length > 0 ? entries.join('、') : '本周尚未累计预算票券'
  })
  const weeklyBudgetWeekLabel = computed(() => {
    const weekId = weeklyBudgetPlan.value.weekId
    if (!weekId) return '本周待激活'
    return weekId.replace('-week-', ' · 第') + '周'
  })
  const unlockedArchetypeNodeCount = computed(() => walletStore.currentArchetypeNodes.filter(node => walletStore.isNodeUnlocked(node.id)).length)
  const sanitizedExchangeMoney = computed(() => Math.max(0, Math.floor(Number(exchangeMoney.value) || 0)))
  const runtimeServerSlot = computed(() =>
    saveStore.runtimeSessionMode === 'server' && saveStore.runtimeSessionSlot >= 0 ? saveStore.runtimeSessionSlot : null
  )
  const runtimeServerSessionHasPendingCopy = computed(() =>
    runtimeServerSlot.value !== null ? saveStore.hasPendingServerSave(runtimeServerSlot.value) : false
  )
  const hasServerExchangeSession = computed(() =>
    exchangeContext.value.loggedIn &&
    saveStore.storageMode === 'server' &&
    runtimeServerSlot.value !== null &&
    !runtimeServerSessionHasPendingCopy.value
  )
  const exchangeSessionHint = computed(() => {
    if (!exchangeContext.value.loggedIn) return '请先登录账号后再进行额度兑换。'
    if (saveStore.storageMode !== 'server') return '请先切换到服务端持久化模式，并载入目标存档后再兑换。'
    if (runtimeServerSlot.value === null) return '请先载入一个服务端存档，再进行额度兑换。'
    if (runtimeServerSessionHasPendingCopy.value) return '当前服务端会话还有待同步的本地副本，请等同步完成后再进行额度兑换。'
    return ''
  })
  const quotaDisplay = computed(() => exchangeContext.value.quota ?? 0)
  const dollarsDisplay = computed(() => {
    const value = exchangeContext.value.dollars ?? 0
    return value.toFixed(4)
  })
  const moneyPerDollarLabel = computed(() => {
    const dollarPerMoney = exchangeContext.value.exchangeRateDollarPerMoney || 0.0002
    const moneyPerDollar = Math.max(1, Math.round(1 / dollarPerMoney))
    return `${moneyPerDollar}文 ≈ $1.00`
  })
  const dailyImportUsageLabel = computed(() => {
    const used = exchangeContext.value.todayImportedMoney || 0
    const limit = exchangeContext.value.dailyImportLimitMoney || 0
    return limit > 0 ? `${used} / ${limit} 文` : `${used} / 不限`
  })
  const dailyExportUsageLabel = computed(() => {
    const used = exchangeContext.value.todayExportedMoney || 0
    const limit = exchangeContext.value.dailyExportLimitMoney || 0
    return limit > 0 ? `${used} / ${limit} 文` : `${used} / 不限`
  })
  const importLimitReached = computed(() => {
    const limit = exchangeContext.value.dailyImportLimitMoney || 0
    return limit > 0 && (exchangeContext.value.todayImportedMoney || 0) >= limit
  })
  const exportLimitReached = computed(() => {
    const limit = exchangeContext.value.dailyExportLimitMoney || 0
    return limit > 0 && (exchangeContext.value.todayExportedMoney || 0) >= limit
  })
  const exchangePreviewLabel = computed(() => {
    if (!hasServerExchangeSession.value) return exchangeSessionHint.value || '请先绑定当前服务端存档。'
    const money = sanitizedExchangeMoney.value
    if (money <= 0) return '请输入大于 0 的铜钱数量。'
    const dollars = money * exchangeContext.value.exchangeRateDollarPerMoney
    const quota = Math.round(dollars * (exchangeContext.value.accountExchangeRate || 500000))
    const importLimit = exchangeContext.value.dailyImportLimitMoney || 0
    const exportLimit = exchangeContext.value.dailyExportLimitMoney || 0
    const importNext = (exchangeContext.value.todayImportedMoney || 0) + money
    const exportNext = (exchangeContext.value.todayExportedMoney || 0) + money
    if (importLimit > 0 && importNext > importLimit) {
      return `${money}文 转入后将超出今日转入限额（${importNext}/${importLimit}文）`
    }
    if (exportLimit > 0 && exportNext > exportLimit) {
      return `${money}文 提现后将超出今日提现限额（${exportNext}/${exportLimit}文）`
    }
    return `${money}文 ⇄ $${dollars.toFixed(4)} ⇄ ${quota} quota`
  })
  const canImport = computed(() => {
    if (!hasServerExchangeSession.value || sanitizedExchangeMoney.value <= 0) return false
    const limit = exchangeContext.value.dailyImportLimitMoney || 0
    if (limit <= 0) return true
    return (exchangeContext.value.todayImportedMoney || 0) + sanitizedExchangeMoney.value <= limit
  })
  const canExport = computed(() => {
    if (!hasServerExchangeSession.value || sanitizedExchangeMoney.value <= 0) return false
    if (playerStore.money < sanitizedExchangeMoney.value) return false
    const limit = exchangeContext.value.dailyExportLimitMoney || 0
    if (limit <= 0) return true
    return (exchangeContext.value.todayExportedMoney || 0) + sanitizedExchangeMoney.value <= limit
  })
  const walletPrimaryActionCard = computed(() => {
    if (cloudHighlandWalletPrep.value) {
      return {
        action: 'weekly-budget',
        title: '先看高地战备预算',
        summary: '这批高地收益先和周预算、票券余量对上，再决定是继续补前置还是直接回高地推进。',
        detailLines: [
          `灵脉结晶 ${cloudHighlandWalletPrep.value.leyQty} 份`,
          `建设券 ${cloudHighlandWalletPrep.value.constructionTickets} / 后勤券 ${cloudHighlandWalletPrep.value.guildLogisticsTickets}`
        ],
        statusLabel: '高地战备',
        statusToneClass: 'text-accent',
        ctaLabel: '看周预算'
      }
    }
    if (weeklyBudgetActiveCount.value < weeklyBudgetChannels.value.length) {
      return {
        action: 'weekly-budget',
        title: '先补本周预算',
        summary: '本周预算槽还没配满，先定资金去向，后面的商圈投入、票券积累和流派收益都会更稳。',
        detailLines: [
          `已投入 ${weeklyBudgetActiveCount.value}/${weeklyBudgetChannels.value.length} 槽`,
          weeklyBudgetTicketSummary.value
        ],
        statusLabel: '待投入',
        statusToneClass: 'text-warning',
        ctaLabel: '看周预算'
      }
    }
    const affordableTicketOffer = rewardTicketExchangeOffers.value.find(offer => offer.affordable)
    if (affordableTicketOffer) {
      return {
        action: 'reward-ticket',
        title: '先兑一轮票券补给',
        summary: '当前手里已经有能立刻兑现的票券，先换成专项补给，再决定后面把钱压去哪条线更直观。',
        detailLines: [`可兑：${affordableTicketOffer.label}`, `消耗 ${affordableTicketOffer.costTickets} ${affordableTicketOffer.ticketLabel}`],
        statusLabel: '可兑换',
        statusToneClass: 'text-success',
        ctaLabel: '看票券兑换'
      }
    }
    if (walletCatalogRecommendedOffers.value.length > 0 || shopStore.weeklySurpriseOffer) {
      return {
        action: 'shop-recommend',
        title: '先看商圈豪华消费路线',
        summary: '这页里最容易马上产生体感变化的，通常是推荐货架和每周精选，先看这里再决定要不要切别的投入线。',
        detailLines: [
          shopStore.weeklySurpriseOffer ? `本周精选：${shopStore.weeklySurpriseOffer.name}` : '已有推荐货架可承接当前路线',
          `目录推荐 ${walletCatalogRecommendedOffers.value.length} 项`
        ],
        statusLabel: '消费路线',
        statusToneClass: 'text-accent',
        ctaLabel: '去商圈推荐区'
      }
    }
    if (!walletStore.currentArchetype) {
      return {
        action: 'archetype-overview',
        title: '先定钱包流派',
        summary: '还没选流派时，钱袋更像纯被动页；先定一条经营偏好，后面的商店和目标推荐才会更集中。',
        detailLines: ['先挑一个当前最想放大的经营方向，再往下解节点。'],
        statusLabel: '未选择',
        statusToneClass: 'text-warning',
        ctaLabel: '看钱包流派'
      }
    }
    return {
      action: 'quota-exchange',
      title: '先核对额度兑换条件',
      summary: '预算、票券和流派都已经在跑时，下一步更像是确认当前服务端会话和额度上下文是否就绪。',
      detailLines: [exchangePreviewLabel.value],
      statusLabel: hasServerExchangeSession.value ? '可兑换' : '待绑定',
      statusToneClass: hasServerExchangeSession.value ? 'text-success' : 'text-muted',
      ctaLabel: '看额度兑换'
    }
  })

  const handleWalletPrimaryAction = () => {
    switch (walletPrimaryActionCard.value.action) {
      case 'weekly-budget':
        focusWalletSection('weekly-budget', '看周预算')
        break
      case 'reward-ticket':
        focusWalletSection('reward-ticket', '看票券兑换')
        break
      case 'shop-recommend':
        openShopPromptTarget('recommended-consumption', '去商圈推荐区')
        break
      case 'archetype-overview':
        focusWalletSection('archetype-overview', '看钱包流派')
        break
      default:
        focusWalletSection('quota-exchange', '看额度兑换')
        break
    }
  }

  const refreshExchangeContext = async () => {
    exchangeContext.value = await fetchTaoyuanExchangeContext()
  }

  const applyExchangeResultContext = (result: {
    exchangeRateDollarPerMoney: number
    exchangeRateQuotaPerMoney: number
    dailyImportLimitMoney: number
    dailyExportLimitMoney: number
    todayImportedMoney: number
    todayExportedMoney: number
    quota: number | null
    dollars: number | null
  }) => {
    exchangeContext.value = {
      ...exchangeContext.value,
      exchangeRateDollarPerMoney: result.exchangeRateDollarPerMoney,
      exchangeRateQuotaPerMoney: result.exchangeRateQuotaPerMoney,
      dailyImportLimitMoney: result.dailyImportLimitMoney,
      dailyExportLimitMoney: result.dailyExportLimitMoney,
      todayImportedMoney: result.todayImportedMoney,
      todayExportedMoney: result.todayExportedMoney,
      quota: result.quota ?? exchangeContext.value.quota,
      dollars: result.dollars ?? exchangeContext.value.dollars,
      loggedIn: true,
    }
  }

  const openResetArchetypeConfirm = () => {
    if (!walletStore.currentArchetype) return
    showResetArchetypeConfirm.value = true
  }

  const applyArchetypeSelection = (archetypeId: WalletArchetypeId) => {
    if (!walletStore.selectArchetype(archetypeId)) {
      showFloat(walletStore.getArchetypeUnlockHint(archetypeId), 'danger')
      return
    }
    showFloat(`已切换为${walletStore.currentArchetype?.name ?? '该流派'}`, 'accent')
    addLog(`你选择了钱包流派「${walletStore.currentArchetype?.name ?? archetypeId}」。`)
  }

  const cancelSwitchArchetype = () => {
    showSwitchArchetypeConfirm.value = false
    pendingArchetypeId.value = null
  }

  const confirmSwitchArchetype = () => {
    if (!pendingArchetypeId.value) return
    const nextId = pendingArchetypeId.value
    cancelSwitchArchetype()
    applyArchetypeSelection(nextId)
  }

  const handleSelectArchetype = (archetypeId: WalletArchetypeId) => {
    if (
      walletStore.currentArchetypeId &&
      walletStore.currentArchetypeId !== archetypeId &&
      unlockedArchetypeNodeCount.value > 0
    ) {
      pendingArchetypeId.value = archetypeId
      showSwitchArchetypeConfirm.value = true
      return
    }
    applyArchetypeSelection(archetypeId)
  }

  const handleUnlockNode = (nodeId: string) => {
    if (!walletStore.unlockNode(nodeId)) {
      showFloat(walletStore.getNodeUnlockHint(nodeId), 'danger')
      return
    }
    const node = walletStore.currentArchetypeNodes.find(entry => entry.id === nodeId)
    showFloat(`已解锁 ${node?.name ?? '节点'}`, 'success')
    addLog(`钱包流派节点「${node?.name ?? nodeId}」已解锁。`)
  }

  const handleResetArchetype = () => {
    const prev = walletStore.currentArchetype?.name
    walletStore.resetArchetype()
    showResetArchetypeConfirm.value = false
    showFloat('已重置钱包流派', 'danger')
    addLog(`已重置钱包流派${prev ? `「${prev}」` : ''}。`)
  }

  const getArchetypeName = (archetypeId: WalletArchetypeId) => {
    return walletStore.archetypes.find(archetype => archetype.id === archetypeId)?.name ?? archetypeId
  }

  const handleActivateWeeklyBudget = (channelId: WeeklyBudgetChannelId, tierId: string) => {
    goalStore.activateWeeklyBudget(channelId, tierId)
  }

  const handleRedeemRewardTicketOffer = (offerId: string) => {
    const result = walletStore.redeemRewardTicketOffer(offerId)
    showFloat(result.message, result.success ? 'success' : 'danger')
    addLog(`【票券兑换】${result.message}`)
  }

  const persistExchangeResult = async (rollbackMoney: number) => {
    if (runtimeServerSlot.value === null || runtimeServerSessionHasPendingCopy.value) {
      playerStore.setMoney(rollbackMoney)
      try {
        await refreshExchangeContext()
      } catch {
        void 0
      }
      showFloat('额度已变更，但当前没有可写回的服务端存档，已回滚本地铜钱。', 'danger')
      addLog('额度兑换成功，但当前存档不可写回；已回滚本地铜钱。')
      return false
    }
    const ok = await saveStore.autoSave()
    if (!ok) {
      playerStore.setMoney(rollbackMoney)
      try {
        await refreshExchangeContext()
      } catch {
        void 0
      }
      showFloat('额度已变更，但当前存档写回失败，已回滚本地铜钱并刷新额度。', 'danger')
      addLog('额度兑换成功，但存档写回失败；已回滚当前会话的铜钱并刷新额度。')
      return false
    }
    return true
    /* if (saveStore.activeSlot < 0) {
      addLog('兑换结果已更新到当前进度，请记得手动保存存档。')
      return
    } */
    /* const ok = await saveStore.autoSave()
    if (!ok) {
      showFloat('兑换成功，但自动存档失败', 'danger')
      addLog('额度兑换成功，但自动存档失败。')
    } */
  }

  const handleImport = async () => {
    if (!hasServerExchangeSession.value) {
      showFloat(exchangeSessionHint.value || '请先载入服务端存档。', 'danger')
      return
    }
    if (!canImport.value) return
    importing.value = true
    try {
      const previousMoney = playerStore.money
      const result = await importQuotaToTaoyuan(sanitizedExchangeMoney.value)
      playerStore.setMoney(previousMoney + (result.moneyReceived ?? 0))
      applyExchangeResultContext(result)
      const persisted = await persistExchangeResult(previousMoney)
      if (!persisted) return
      showFloat(`+${result.moneyReceived ?? 0}文`, 'accent')
      addLog(`从账号额度导入了${result.moneyReceived ?? 0}文。`)
    } catch (error) {
      showFloat(error instanceof Error ? error.message : '导入额度失败', 'danger')
    } finally {
      importing.value = false
    }
  }

  const handleExport = async () => {
    if (!hasServerExchangeSession.value) {
      showFloat(exchangeSessionHint.value || '请先载入服务端存档。', 'danger')
      return
    }
    if (!canExport.value) return
    exporting.value = true
    try {
      const previousMoney = playerStore.money
      const result = await exportTaoyuanToQuota(sanitizedExchangeMoney.value)
      playerStore.setMoney(previousMoney - (result.moneySpent ?? 0))
      applyExchangeResultContext(result)
      const persisted = await persistExchangeResult(previousMoney)
      if (!persisted) return
      showFloat(`+${result.quotaGained ?? 0}quota`, 'success')
      addLog(`导出了${result.moneySpent ?? 0}文，获得 ${result.quotaGained ?? 0} quota。`)
    } catch (error) {
      showFloat(error instanceof Error ? error.message : '导出额度失败', 'danger')
    } finally {
      exporting.value = false
    }
  }

  onMounted(() => {
    syncCompactViewportMode()
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', syncCompactViewportMode)
    }
    void refreshExchangeContext()
  })

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', syncCompactViewportMode)
    }
  })
</script>
