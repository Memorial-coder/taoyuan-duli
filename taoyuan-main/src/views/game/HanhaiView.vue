<template>
  <div>
    <div class="flex items-center justify-between mb-1">
      <div class="flex items-center space-x-1.5 text-sm text-accent">
        <Tent :size="14" />
        <span>瀚海</span>
      </div>
      <span v-if="hanhaiStore.unlocked" class="text-xs text-success">已开通</span>
      <span v-else class="text-xs text-muted">未开通</span>
    </div>

    <!-- 未解锁 -->
    <div v-if="!hanhaiStore.unlocked" class="flex flex-col items-center justify-center py-10 space-y-3">
      <Tent :size="48" class="text-accent/30" />
      <p class="text-sm text-muted">商路尚未开通</p>
      <p class="text-xs text-muted/60 text-center max-w-60">需要击败矿洞第120层BOSS并支付{{ HANHAI_UNLOCK_COST }}文修路费</p>
      <Button v-if="bossDefeated" :class="canUnlock ? '!bg-accent !text-bg' : 'opacity-50'" :disabled="!canUnlock" @click="handleUnlock">
        开通商路 ({{ HANHAI_UNLOCK_COST }}文)
      </Button>
      <p v-if="bossDefeated && !canUnlock" class="text-xs text-danger">金钱不足（需要{{ HANHAI_UNLOCK_COST }}文）</p>
      <p v-if="!bossDefeated" class="text-xs text-danger">需先击败矿洞第120层BOSS</p>
    </div>

    <!-- 已解锁 -->
    <template v-else>
      <!-- 标签页 -->
      <div class="flex space-x-1 mb-3">
        <Button class="flex-1 justify-center" :class="{ '!bg-accent !text-bg': activeTab === 'shop' }" @click="activeTab = 'shop'">
          驿站商店
        </Button>
        <Button class="flex-1 justify-center" :class="{ '!bg-accent !text-bg': activeTab === 'relic' }" @click="activeTab = 'relic'">
          遗迹勘探
        </Button>
        <Button class="flex-1 justify-center" :class="{ '!bg-accent !text-bg': activeTab === 'casino' }" @click="activeTab = 'casino'">
          瀚海赌坊
        </Button>
      </div>

      <div class="border border-accent/20 rounded-xs p-2 mb-3">
        <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mb-2">
          <div class="flex items-center justify-between">
            <span class="text-muted">循环阶段</span>
            <span class="text-accent">{{ hanhaiStore.cycleOverview.progressTier }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted">本周首领</span>
            <span>{{ currentBossLabel }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted">遗迹总勘探</span>
            <span class="text-accent">{{ hanhaiStore.cycleOverview.totalRelicClears }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted">活跃投资</span>
            <span>{{ hanhaiStore.cycleOverview.activeInvestmentCount }}</span>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-2">
          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-xs text-muted mb-1">商路投资</p>
            <div v-for="route in visibleRouteInvestments" :key="route.id" class="flex items-center justify-between text-[10px] mt-0.5">
              <span>{{ route.label }}</span>
              <span class="text-accent">{{ getRouteStateText(route.id) }}</span>
            </div>
          </div>
          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-xs text-muted mb-1">商路合同</p>
            <div v-for="contract in visibleContracts" :key="contract.id" class="mt-1 first:mt-0">
              <p class="text-[10px] text-accent">{{ contract.label }}</p>
              <p class="text-[10px] text-muted leading-4 mt-0.5">{{ contract.rewardSummary }}</p>
            </div>
          </div>
          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-xs text-muted mb-1">遗迹套组 / 轮换货架</p>
            <p class="text-[10px] text-muted leading-4">当前可关注套组：{{ visibleRelicSets.map(setDef => setDef.label).join('、') || '暂无' }}</p>
            <p class="text-[10px] text-accent mt-1">本档货架：{{ currentShopRotation?.label ?? '暂无轮换' }}</p>
          </div>
        </div>
      </div>

      <div class="border border-accent/20 rounded-xs p-2 mb-3">
        <div class="flex items-center justify-between mb-1">
          <p class="text-xs text-muted">经营联动</p>
          <span v-if="hanhaiStore.crossSystemOverview.themeWeekFocus" class="text-[10px] text-accent">
            {{ hanhaiStore.crossSystemOverview.themeWeekFocus.summaryLabel }}
          </span>
        </div>

        <p
          v-if="hanhaiStore.crossSystemOverview.questBoardBiasProfile.boardHint"
          class="text-[10px] text-muted leading-4"
        >
          {{ hanhaiStore.crossSystemOverview.questBoardBiasProfile.boardHint }}
        </p>

        <div
          v-if="hanhaiStore.crossSystemOverview.themeWeekFocus"
          class="border border-accent/10 rounded-xs p-2 mt-2"
        >
          <p class="text-[10px] text-muted mb-1">主题周焦点</p>
          <p class="text-[10px] text-accent leading-4">
            {{ [
              ...(hanhaiStore.crossSystemOverview.themeWeekFocus.routeLabels ?? []),
              ...(hanhaiStore.crossSystemOverview.themeWeekFocus.relicSiteLabels ?? []),
              ...(hanhaiStore.crossSystemOverview.themeWeekFocus.bossCycleLabels ?? [])
            ].slice(0, 4).join('、') || '暂无额外瀚海焦点' }}
          </p>
        </div>

        <div v-if="hanhaiStore.crossSystemOverview.linkedVillageProjects.length" class="border border-accent/10 rounded-xs p-2 mt-2">
          <p class="text-[10px] text-muted mb-1">联动建设</p>
          <div
            v-for="project in hanhaiStore.crossSystemOverview.linkedVillageProjects.slice(0, 2)"
            :key="project.id"
            class="flex items-center justify-between text-[10px] mt-0.5 first:mt-0"
          >
            <span>{{ project.name }}</span>
            <span class="text-accent">{{ project.completed ? '已完成' : project.available ? '可推进' : '未解锁' }}</span>
          </div>
        </div>

        <div v-if="hanhaiStore.crossSystemOverview.recommendedCatalogOffers.length" class="border border-accent/10 rounded-xs p-2 mt-2">
          <p class="text-[10px] text-muted mb-1">目录承接</p>
          <div
            v-for="offer in hanhaiStore.crossSystemOverview.recommendedCatalogOffers"
            :key="offer.id"
            class="flex items-center justify-between text-[10px] mt-0.5 first:mt-0"
          >
            <span>{{ offer.name }}</span>
            <span class="text-accent">{{ offer.price }}文</span>
          </div>
        </div>

        <div v-if="hanhaiStore.crossSystemOverview.recommendedActions.length" class="mt-2">
          <p class="text-[10px] text-muted mb-1">推荐动作</p>
          <ul class="space-y-1">
            <li
              v-for="(action, index) in hanhaiStore.crossSystemOverview.recommendedActions"
              :key="`${index}-${action}`"
              class="text-[10px] text-muted leading-4"
            >
              - {{ action }}
            </li>
          </ul>
        </div>
      </div>

      <!-- 驿站商店 -->
      <template v-if="activeTab === 'shop'">
        <div class="flex flex-col space-y-1 max-h-80 overflow-y-auto">
          <div
            v-for="item in HANHAI_SHOP_ITEMS"
            :key="item.itemId"
            class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-2 cursor-pointer hover:bg-accent/5 transition-colors mr-1"
            @click="shopModalItem = item"
          >
            <div class="flex-1 min-w-0">
              <p class="text-xs truncate">{{ item.name }}</p>
              <p class="text-xs text-muted truncate">{{ item.description }}</p>
            </div>
            <div class="flex flex-col items-end ml-2 shrink-0">
              <span class="text-xs text-accent">{{ item.price }}文</span>
              <span
                v-if="item.weeklyLimit"
                class="text-[10px]"
                :class="hanhaiStore.getWeeklyRemaining(item.itemId) > 0 ? 'text-muted' : 'text-danger'"
              >
                限购 {{ hanhaiStore.getWeeklyRemaining(item.itemId) }}/{{ item.weeklyLimit }}
              </span>
              <span v-if="!inventoryStore.canAddItem(item.itemId, 1)" class="text-[10px] text-danger">背包不足</span>
            </div>
          </div>
        </div>
        <!-- 藏宝图寻宝 -->
        <Button v-if="treasureMapCount > 0" :icon="Map" :icon-size="12" class="w-full justify-center mt-2" @click="handleUseTreasureMap">
          使用藏宝图寻宝（{{ treasureMapCount }}张）
        </Button>
      </template>

      <!-- 遗迹 -->
      <template v-if="activeTab === 'relic'">
        <div class="border border-accent/20 rounded-xs p-2 mb-3">
          <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <div class="flex items-center justify-between">
              <span class="text-muted">本周勘探次数</span>
              <span class="text-accent">{{ hanhaiStore.totalRelicClears }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted">驻点数</span>
              <span>{{ hanhaiStore.relicSites.length }}</span>
            </div>
          </div>
          <p class="text-[10px] text-muted mt-2 leading-4">遗迹勘探会消耗一笔探索费用，但能稳定带回商路遗物、异域素材与藏宝图线索。</p>
        </div>

        <div class="flex flex-col space-y-2 max-h-80 overflow-y-auto pr-1">
          <div v-for="site in hanhaiStore.relicSites" :key="site.id" class="border border-accent/20 rounded-xs p-2">
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-xs text-accent">{{ site.name }}</p>
                <p class="text-[10px] text-muted mt-0.5 leading-4">{{ site.description }}</p>
              </div>
              <span class="text-[10px] whitespace-nowrap" :class="hanhaiStore.getRelicRemaining(site.id) > 0 ? 'text-accent' : 'text-danger'">
                剩余 {{ hanhaiStore.getRelicRemaining(site.id) }}/{{ site.weeklyLimit }}
              </span>
            </div>

            <div class="border border-accent/10 rounded-xs p-2 mt-2 text-[10px]">
              <div class="flex items-center justify-between">
                <span class="text-muted">探索费用</span>
                <span :class="playerStore.money >= site.unlockCost ? 'text-success' : 'text-danger'">{{ site.unlockCost }}文</span>
              </div>
              <div class="flex items-center justify-between mt-0.5">
                <span class="text-muted">遗迹主题</span>
                <span class="text-accent">{{ site.relicTag }}</span>
              </div>
              <p class="text-muted mt-1 leading-4">预计收获：{{ getRelicRewardText(site) }}</p>
            </div>

            <div class="mt-2 flex items-center justify-between gap-2">
              <p class="text-[10px] text-muted leading-4">{{ getRelicHint(site.id) }}</p>
              <div class="flex gap-1 shrink-0">
                <Button
                  class="justify-center"
                  :disabled="!canClaimRelicMilestone(site.id)"
                  @click="handleClaimRelicMilestone(site.id)"
                >
                  驻点奖励
                </Button>
                <Button
                  class="justify-center"
                  :class="{ '!bg-accent !text-bg': canExploreRelic(site.id) }"
                  :disabled="!canExploreRelic(site.id)"
                  @click="handleExploreRelic(site.id)"
                >
                  勘探
                </Button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 赌坊 -->
      <template v-if="activeTab === 'casino'">
        <div class="border border-accent/20 rounded-xs p-2 mb-3">
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted">今日剩余次数</span>
            <span class="text-xs" :class="hanhaiStore.canBet ? 'text-accent' : 'text-danger'">
              {{ hanhaiStore.betsRemaining }}/{{ MAX_DAILY_BETS }}
            </span>
          </div>
        </div>

        <!-- 次数用完 -->
        <div v-if="!hanhaiStore.canBet" class="flex flex-col items-center justify-center py-8 space-y-3">
          <Dices :size="48" class="text-accent/30" />
          <p class="text-sm text-muted">今日赌博次数已用完</p>
          <p class="text-xs text-muted/60">明天再来碰碰运气吧</p>
        </div>

        <div v-else class="flex flex-col space-y-2">
          <!-- 幸运轮盘 -->
          <div class="border border-accent/20 rounded-xs p-2">
            <p class="text-xs text-accent mb-2 flex items-center space-x-1">
              <CircleDot :size="12" />
              <span>幸运轮盘</span>
            </p>
            <p class="text-xs text-muted mb-2">选择投注金额，转动轮盘赢取折算铜钱，并有机会带回票券或异域彩头</p>
            <div class="flex space-x-1">
              <Button
                v-for="tier in ROULETTE_BET_TIERS"
                :key="tier"
                class="flex-1 justify-center"
                :disabled="playerStore.money < tier"
                @click="handleRoulette(tier)"
              >
                {{ tier }}文
              </Button>
            </div>
          </div>

          <!-- 骰子猜大小 -->
          <div class="border border-accent/20 rounded-xs p-2">
            <p class="text-xs text-accent mb-2 flex items-center space-x-1">
              <Dices :size="12" />
              <span>骰子猜大小</span>
            </p>
            <p class="text-xs text-muted mb-2">投注{{ DICE_BET_AMOUNT }}文，猜对可获得折算铜钱，并有机会拿到研究券或香料</p>
            <div class="flex space-x-1">
              <Button class="flex-1 justify-center" :disabled="playerStore.money < DICE_BET_AMOUNT" @click="handleDice(false)">
                猜小 (2-6)
              </Button>
              <Button class="flex-1 justify-center" :disabled="playerStore.money < DICE_BET_AMOUNT" @click="handleDice(true)">
                猜大 (7-12)
              </Button>
            </div>
          </div>

          <!-- 猜杯 -->
          <div class="border border-accent/20 rounded-xs p-2">
            <p class="text-xs text-accent mb-2 flex items-center space-x-1">
              <Trophy :size="12" />
              <span>猜杯</span>
            </p>
            <p class="text-xs text-muted mb-2">投注{{ CUP_BET_AMOUNT }}文，3选1猜中可获得折算铜钱，并可能带回展陈券或丝货</p>
            <div class="flex space-x-1">
              <Button
                v-for="i in 3"
                :key="i"
                class="flex-1 justify-center"
                :disabled="playerStore.money < CUP_BET_AMOUNT"
                @click="handleCup(i - 1)"
              >
                第{{ i }}杯
              </Button>
            </div>
          </div>

          <!-- 斗蛐蛐 -->
          <div class="border border-accent/20 rounded-xs p-2">
            <p class="text-xs text-accent mb-2 flex items-center space-x-1">
              <Bug :size="12" />
              <span>斗蛐蛐</span>
            </p>
            <p class="text-xs text-muted mb-2">投注{{ CRICKET_BET_AMOUNT }}文，选蛐蛐上场对战；现金回报已压低，额外偏向香料与商路票</p>
            <div class="flex space-x-1">
              <Button
                v-for="c in CRICKETS"
                :key="c.id"
                class="flex-1 justify-center"
                :disabled="playerStore.money < CRICKET_BET_AMOUNT"
                @click="handleCricket(c)"
              >
                {{ c.name }}
              </Button>
            </div>
          </div>

          <!-- 翻牌寻宝 -->
          <div class="border border-accent/20 rounded-xs p-2">
            <p class="text-xs text-accent mb-2 flex items-center space-x-1">
              <Gem :size="12" />
              <span>翻牌寻宝</span>
            </p>
            <p class="text-xs text-muted mb-2">投注{{ CARD_BET_AMOUNT }}文，{{ CARD_TOTAL }}张牌中{{ CARD_TREASURE_COUNT }}张有宝；翻中后还可能带回藏宝图、展陈券或绿松石</p>
            <div class="flex space-x-1">
              <Button
                v-for="i in CARD_TOTAL"
                :key="i"
                class="flex-1 justify-center"
                :disabled="playerStore.money < CARD_BET_AMOUNT"
                @click="handleCardFlip(i - 1)"
              >
                {{ i }}
              </Button>
            </div>
          </div>

          <!-- 瀚海扑克 -->
          <div class="border border-accent/20 rounded-xs p-2">
            <p class="text-xs text-accent mb-2 flex items-center space-x-1">
              <Spade :size="12" />
              <span>瀚海扑克</span>
            </p>
            <p class="text-xs text-muted mb-2">选择场次入场，收桌时会按折算规则返还筹码，并可能追加票券或藏宝图线索</p>
            <div class="flex flex-col space-y-1">
              <div
                v-for="t in TEXAS_TIERS"
                :key="t.id"
                class="flex items-center justify-between border border-accent/10 rounded-xs px-2 py-1.5"
              >
                <div class="flex-1 min-w-0">
                  <p class="text-xs">{{ t.name }}</p>
                  <p class="text-xs text-muted">入场{{ t.entryFee }}文 + 抽水{{ t.rake }}文 · 盲注{{ t.blind }} · {{ t.rounds }}手</p>
                </div>
                <Button class="ml-2 shrink-0" :disabled="playerStore.money < t.minMoney" @click="handleTexas(t.id)">
                  {{ playerStore.money < t.minMoney ? `需${t.minMoney}文` : '入场' }}
                </Button>
              </div>
            </div>
          </div>

          <!-- 恶魔轮盘 -->
          <div class="border border-accent/20 rounded-xs p-2">
            <p class="text-xs text-accent mb-2 flex items-center space-x-1">
              <Crosshair :size="12" />
              <span>恶魔轮盘</span>
            </p>
            <p class="text-xs text-muted mb-2">投注{{ BUCKSHOT_BET_AMOUNT }}文，与庄家轮流开枪；高风险局更偏向研究券、绿松石与藏宝图彩头</p>
            <Button class="w-full justify-center" :disabled="playerStore.money < BUCKSHOT_BET_AMOUNT" @click="handleBuckshot">挑战</Button>
          </div>
        </div>
      </template>

      <!-- 底部统计 -->
      <div class="mt-3 border border-accent/20 rounded-xs p-2">
        <div class="grid grid-cols-2 gap-x-3 gap-y-0.5">
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted">持有金钱</span>
            <span class="text-xs">{{ playerStore.money }}文</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted">今日赌博</span>
            <span class="text-xs">{{ MAX_DAILY_BETS - hanhaiStore.betsRemaining }}/{{ MAX_DAILY_BETS }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- 商品购买弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="shopModalItem"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="shopModalItem = null"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="shopModalItem = null">
            <X :size="14" />
          </button>

          <p class="text-sm text-accent mb-2">{{ shopModalItem.name }}</p>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted">{{ shopModalItem.description }}</p>
          </div>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">价格</span>
              <span class="text-xs text-accent">{{ shopModalItem.price }}文</span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">持有</span>
              <span class="text-xs">{{ playerStore.money }}文</span>
            </div>
            <div v-if="shopModalItem.weeklyLimit" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">本周限购</span>
              <span class="text-xs" :class="hanhaiStore.getWeeklyRemaining(shopModalItem.itemId) > 0 ? '' : 'text-danger'">
                剩余 {{ hanhaiStore.getWeeklyRemaining(shopModalItem.itemId) }}/{{ shopModalItem.weeklyLimit }}
              </span>
            </div>
          </div>

          <Button
            class="w-full justify-center !bg-accent !text-bg"
            :disabled="!canBuyShopItem(shopModalItem.itemId)"
            @click="handleBuyItem(shopModalItem.itemId)"
          >
            {{ hanhaiStore.getWeeklyRemaining(shopModalItem.itemId) <= 0 ? '本周已售罄' : '购买' }}
          </Button>
        </div>
      </div>
    </Transition>

    <!-- 幸运轮盘弹窗 -->
    <Transition name="panel-fade">
      <div v-if="showRouletteModal" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div class="game-panel max-w-xs w-full">
          <p class="text-sm text-accent text-center mb-1">幸运轮盘</p>
          <p class="text-xs text-muted text-center mb-3">投注 {{ rouletteBetAmount }}文</p>

          <!-- 转盘格子 -->
          <div class="flex flex-col space-y-1 mb-3">
            <div
              v-for="(outcome, i) in ROULETTE_OUTCOMES"
              :key="i"
              class="border rounded-xs px-3 py-1.5 text-xs text-center transition-all duration-100"
              :class="rouletteHighlight === i ? 'border-accent bg-accent/15 text-accent' : 'border-accent/10 text-muted/40'"
            >
              {{ outcome.label }}
              <span class="ml-1 opacity-60">×{{ outcome.multiplier }}</span>
            </div>
          </div>

          <!-- 结果 -->
          <template v-if="roulettePhase === 'done' && rouletteAnimResult">
            <div class="border border-accent/10 rounded-xs p-3 text-center mb-3">
              <p class="text-sm mb-0.5" :class="rouletteAnimResult.multiplier > 0 ? 'text-success' : 'text-danger'">
                {{ rouletteAnimResult.multiplier > 0 ? '大赢！' : '落空…' }}
              </p>
              <p v-if="rouletteAnimResult.multiplier > 0" class="text-xs text-success">+{{ rouletteAnimResult.winnings }}文</p>
              <p v-else class="text-xs text-danger">-{{ rouletteBetAmount }}文</p>
            </div>
            <Button class="w-full justify-center" @click="showRouletteModal = false">确定</Button>
          </template>
        </div>
      </div>
    </Transition>

    <!-- 骰子弹窗 -->
    <Transition name="panel-fade">
      <div v-if="showDiceModal" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div class="game-panel max-w-xs w-full">
          <p class="text-sm text-accent text-center mb-1">骰子猜大小</p>
          <p class="text-xs text-muted text-center mb-4">
            你猜
            <span class="text-accent">{{ diceGuessIsBig ? '大 (7-12)' : '小 (2-6)' }}</span>
          </p>

          <!-- 骰子面 -->
          <div class="flex justify-center space-x-4 mb-3">
            <div v-for="(val, di) in diceDisplay" :key="di" class="dice-face" :class="{ 'dice-rolling': dicePhase === 'rolling' }">
              <div v-for="pos in 9" :key="pos" class="flex items-center justify-center">
                <div
                  v-if="DICE_DOTS[val]?.includes(pos - 1)"
                  class="w-2.5 h-2.5 rounded-full transition-colors"
                  :class="dicePhase === 'rolling' ? 'bg-muted/60' : 'bg-text'"
                />
              </div>
            </div>
          </div>

          <!-- 点数 -->
          <p v-if="dicePhase !== 'rolling'" class="text-xs text-center mb-3">
            <span class="text-muted">{{ diceDisplay[0] }} + {{ diceDisplay[1] }} =</span>
            <span class="text-accent">{{ diceSum }}</span>
            <span class="text-muted">（{{ diceSum >= 7 ? '大' : '小' }}）</span>
          </p>
          <p v-else class="text-xs text-muted/40 text-center mb-3">掷骰中…</p>

          <!-- 结果 -->
          <template v-if="dicePhase === 'done' && diceAnimResult">
            <div class="border border-accent/10 rounded-xs p-3 text-center mb-3">
              <p class="text-sm" :class="diceAnimResult.won ? 'text-success' : 'text-danger'">
                {{ diceAnimResult.won ? '猜对了！' : '猜错了…' }}
              </p>
              <p class="text-xs mt-0.5" :class="diceAnimResult.won ? 'text-success' : 'text-danger'">
                {{ diceAnimResult.won ? '+' + diceAnimResult.winnings + '文' : '-' + DICE_BET_AMOUNT + '文' }}
              </p>
            </div>
            <Button class="w-full justify-center" @click="showDiceModal = false">确定</Button>
          </template>
        </div>
      </div>
    </Transition>

    <!-- 猜杯弹窗 -->
    <Transition name="panel-fade">
      <div v-if="showCupModal" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div class="game-panel max-w-xs w-full">
          <p class="text-sm text-accent text-center mb-1">猜杯</p>
          <p class="text-xs text-muted text-center mb-4">你选了第{{ cupGuess + 1 }}杯</p>

          <!-- 三个杯子 -->
          <div class="flex justify-center space-x-3 mb-3">
            <div
              v-for="i in 3"
              :key="i"
              class="cup-box"
              :class="{
                'cup-highlight': cupPhase === 'shuffling' && cupShuffleIndex === i - 1,
                'cup-correct': cupPhase === 'done' && cupAnimResult && cupAnimResult.correctCup === i - 1,
                'cup-picked': cupPhase === 'done' && cupGuess === i - 1 && cupAnimResult && !cupAnimResult.won
              }"
            >
              <div class="cup-body" :class="{ 'cup-shake': cupPhase === 'shuffling' }">
                <Trophy :size="20" class="text-accent/60" />
              </div>
              <p
                class="text-xs text-center mt-1"
                :class="cupPhase === 'done' && cupAnimResult?.correctCup === i - 1 ? 'text-accent' : 'text-muted/40'"
              >
                {{ i }}
              </p>
              <div
                v-if="cupPhase === 'done' && cupAnimResult?.correctCup === i - 1"
                class="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-success flex items-center justify-center"
              >
                <Check :size="10" class="text-bg" />
              </div>
            </div>
          </div>

          <p v-if="cupPhase === 'shuffling'" class="text-xs text-muted/40 text-center mb-3">洗杯中…</p>

          <!-- 结果 -->
          <template v-if="cupPhase === 'done' && cupAnimResult">
            <div class="border border-accent/10 rounded-xs p-3 text-center mb-3">
              <p class="text-sm" :class="cupAnimResult.won ? 'text-success' : 'text-danger'">
                {{ cupAnimResult.won ? '猜中了！' : '猜错了…' }}
              </p>
              <p class="text-xs mt-0.5" :class="cupAnimResult.won ? 'text-success' : 'text-danger'">
                {{ cupAnimResult.won ? '+' + cupAnimResult.winnings + '文' : '-' + CUP_BET_AMOUNT + '文' }}
              </p>
            </div>
            <Button class="w-full justify-center" @click="showCupModal = false">确定</Button>
          </template>
        </div>
      </div>
    </Transition>

    <!-- 斗蛐蛐弹窗 -->
    <Transition name="panel-fade">
      <div v-if="showCricketModal" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div class="game-panel max-w-xs w-full">
          <p class="text-sm text-accent text-center mb-1">斗蛐蛐</p>
          <p class="text-xs text-muted text-center mb-4">
            你的蛐蛐：
            <span class="text-accent">{{ cricketChoiceName }}</span>
          </p>

          <!-- 对战面板 -->
          <div class="flex items-center justify-between space-x-2 mb-3">
            <!-- 我方 -->
            <div class="flex-1 text-center">
              <p class="text-xs text-accent mb-1">{{ cricketChoiceName }}</p>
              <div class="border border-accent/20 rounded-xs p-2">
                <div class="cricket-icon" :class="{ 'cricket-fight': cricketPhase === 'fighting' }">
                  <Bug :size="24" class="text-accent" />
                </div>
                <div class="mt-1 h-1.5 bg-panel rounded-full overflow-hidden">
                  <div
                    class="h-full transition-all duration-500"
                    :class="
                      cricketPhase === 'fighting'
                        ? 'bg-accent/40'
                        : cricketAnimResult && cricketAnimResult.won
                          ? 'bg-success'
                          : cricketAnimResult && cricketAnimResult.draw
                            ? 'bg-accent'
                            : 'bg-danger'
                    "
                    :style="{
                      width:
                        cricketPhase === 'fighting'
                          ? (cricketDisplayPower[0] ?? 5) * 10 + '%'
                          : (cricketAnimResult?.playerPower ?? 0) * 10 + '%'
                    }"
                  />
                </div>
                <p class="text-xs mt-0.5" :class="cricketPhase === 'fighting' ? 'text-muted/40' : 'text-accent'">
                  {{ cricketPhase === 'fighting' ? '?' : cricketAnimResult?.playerPower }}
                </p>
              </div>
            </div>

            <span class="text-xs text-muted/40">VS</span>

            <!-- 对方 -->
            <div class="flex-1 text-center">
              <p class="text-xs text-danger mb-1">对手</p>
              <div class="border border-danger/20 rounded-xs p-2">
                <div class="cricket-icon" :class="{ 'cricket-fight': cricketPhase === 'fighting' }">
                  <Bug :size="24" class="text-danger -scale-x-100" />
                </div>
                <div class="mt-1 h-1.5 bg-panel rounded-full overflow-hidden">
                  <div
                    class="h-full transition-all duration-500"
                    :class="
                      cricketPhase === 'fighting'
                        ? 'bg-danger/40'
                        : cricketAnimResult && !cricketAnimResult.won && !cricketAnimResult.draw
                          ? 'bg-success'
                          : cricketAnimResult && cricketAnimResult.draw
                            ? 'bg-accent'
                            : 'bg-danger'
                    "
                    :style="{
                      width:
                        cricketPhase === 'fighting'
                          ? (cricketDisplayPower[1] ?? 5) * 10 + '%'
                          : (cricketAnimResult?.opponentPower ?? 0) * 10 + '%'
                    }"
                  />
                </div>
                <p class="text-xs mt-0.5" :class="cricketPhase === 'fighting' ? 'text-muted/40' : 'text-danger'">
                  {{ cricketPhase === 'fighting' ? '?' : cricketAnimResult?.opponentPower }}
                </p>
              </div>
            </div>
          </div>

          <p v-if="cricketPhase === 'fighting'" class="text-xs text-muted/40 text-center mb-3">对战中…</p>

          <!-- 结果 -->
          <template v-if="cricketPhase === 'done' && cricketAnimResult">
            <div class="border border-accent/10 rounded-xs p-3 text-center mb-3">
              <p class="text-sm" :class="cricketAnimResult.won ? 'text-success' : cricketAnimResult.draw ? 'text-accent' : 'text-danger'">
                {{ cricketAnimResult.won ? '大获全胜！' : cricketAnimResult.draw ? '势均力敌' : '败下阵来…' }}
              </p>
              <p
                class="text-xs mt-0.5"
                :class="cricketAnimResult.won ? 'text-success' : cricketAnimResult.draw ? 'text-muted' : 'text-danger'"
              >
                {{
                  cricketAnimResult.won
                    ? '+' + cricketAnimResult.winnings + '文'
                    : cricketAnimResult.draw
                      ? '退还' + CRICKET_BET_AMOUNT + '文'
                      : '-' + CRICKET_BET_AMOUNT + '文'
                }}
              </p>
            </div>
            <Button class="w-full justify-center" @click="showCricketModal = false">确定</Button>
          </template>
        </div>
      </div>
    </Transition>

    <!-- 翻牌寻宝弹窗 -->
    <Transition name="panel-fade">
      <div v-if="showCardModal" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div class="game-panel max-w-xs w-full">
          <p class="text-sm text-accent text-center mb-1">翻牌寻宝</p>
          <p class="text-xs text-muted text-center mb-4">你选了第{{ cardPick + 1 }}张</p>

          <!-- 牌面 -->
          <div class="flex justify-center space-x-2 mb-3">
            <div
              v-for="i in CARD_TOTAL"
              :key="i"
              class="card-tile"
              :class="{
                'card-flipping': cardPhase === 'flipping' && cardFlipIndex === i - 1,
                'card-treasure': cardPhase === 'done' && cardAnimResult && cardAnimResult.treasures.includes(i - 1),
                'card-empty': cardPhase === 'done' && cardAnimResult && !cardAnimResult.treasures.includes(i - 1),
                'card-picked': cardPick === i - 1
              }"
            >
              <template v-if="cardPhase === 'done' && cardAnimResult">
                <Gem v-if="cardAnimResult.treasures.includes(i - 1)" :size="16" class="text-success" />
                <X v-else :size="14" class="text-muted/30" />
              </template>
              <template v-else>
                <span class="text-sm" :class="cardPhase === 'flipping' && cardFlipIndex === i - 1 ? 'text-accent' : 'text-muted/30'">
                  ?
                </span>
              </template>
              <p class="text-xs mt-0.5" :class="cardPick === i - 1 ? 'text-accent' : 'text-muted/30'">{{ i }}</p>
            </div>
          </div>

          <p v-if="cardPhase === 'flipping'" class="text-xs text-muted/40 text-center mb-3">翻牌中…</p>

          <!-- 结果 -->
          <template v-if="cardPhase === 'done' && cardAnimResult">
            <div class="border border-accent/10 rounded-xs p-3 text-center mb-3">
              <p class="text-sm" :class="cardAnimResult.won ? 'text-success' : 'text-danger'">
                {{ cardAnimResult.won ? '翻到宝了！' : '空牌…' }}
              </p>
              <p class="text-xs mt-0.5" :class="cardAnimResult.won ? 'text-success' : 'text-danger'">
                {{ cardAnimResult.won ? '+' + cardAnimResult.winnings + '文' : '-' + CARD_BET_AMOUNT + '文' }}
              </p>
            </div>
            <Button class="w-full justify-center" @click="showCardModal = false">确定</Button>
          </template>
        </div>
      </div>
    </Transition>

    <!-- 瀚海扑克弹窗 -->
    <Transition name="panel-fade">
      <div v-if="showTexasModal && texasSetup" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <TexasHoldemGame :setup="texasSetup" @complete="handleTexasComplete" />
      </div>
    </Transition>

    <!-- 恶魔轮盘弹窗 -->
    <Transition name="panel-fade">
      <div v-if="showBuckshotModal && buckshotSetup" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <BuckshotRouletteGame :setup="buckshotSetup" @complete="handleBuckshotComplete" />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted } from 'vue'
  import { Tent, X, Dices, Trophy, Bug, Gem, Check, CircleDot, Spade, Crosshair, Map } from 'lucide-vue-next'
  import { useHanhaiStore } from '@/stores/useHanhaiStore'
  import { getItemById } from '@/data'
  import { useInventoryStore } from '@/stores/useInventoryStore'
  import { useMiningStore } from '@/stores/useMiningStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import {
    HANHAI_SHOP_ITEMS,
    HANHAI_BOSS_CYCLE_DEFS,
    HANHAI_CARAVAN_CONTRACT_DEFS,
    HANHAI_RELIC_SET_DEFS,
    HANHAI_ROUTE_INVESTMENTS,
    HANHAI_SHOP_ROTATIONS,
    ROULETTE_BET_TIERS,
    ROULETTE_OUTCOMES,
    DICE_BET_AMOUNT,
    MAX_DAILY_BETS,
    HANHAI_UNLOCK_COST,
    CUP_BET_AMOUNT,
    CRICKET_BET_AMOUNT,
    CRICKET_WIN_MULTIPLIER,
    CRICKETS,
    CARD_BET_AMOUNT,
    CARD_TOTAL,
    CARD_TREASURE_COUNT,
    TEXAS_TIERS,
    BUCKSHOT_BET_AMOUNT,
    BUCKSHOT_WIN_MULTIPLIER
  } from '@/data/hanhai'
  import type { HanhaiShopItemDef, CricketDef, TexasSetup, TexasTierId, BuckshotSetup, HanhaiRelicSiteDef } from '@/types'
  import { addLog } from '@/composables/useGameLog'
  import { useAudio } from '@/composables/useAudio'
  import {
    sfxRouletteSpin,
    sfxRouletteStop,
    sfxRouletteTick,
    sfxDiceRoll,
    sfxDiceLand,
    sfxDiceTick,
    sfxCupShuffle,
    sfxCupReveal,
    sfxCupTick,
    sfxCricketChirp,
    sfxCricketClash,
    sfxCricketTick,
    sfxCardFlip,
    sfxCasinoWin,
    sfxCasinoLose,
    sfxBuy
  } from '@/composables/useAudio'
  import TexasHoldemGame from '@/components/game/TexasHoldemGame.vue'
  import BuckshotRouletteGame from '@/components/game/BuckshotRouletteGame.vue'
  import Button from '@/components/game/Button.vue'

  // suppress unused warnings for template-only refs
  void CRICKET_WIN_MULTIPLIER
  void CARD_TREASURE_COUNT
  void BUCKSHOT_WIN_MULTIPLIER

  const hanhaiStore = useHanhaiStore()
  const playerStore = usePlayerStore()
  const { startHanhaiBgm, endHanhaiBgm } = useAudio()
  const activeTab = ref<'shop' | 'relic' | 'casino'>('shop')
  const shopModalItem = ref<HanhaiShopItemDef | null>(null)

  const tierRank = { P0: 0, P1: 1, P2: 2 } as const
  const isTierUnlocked = (unlockTier: 'P0' | 'P1' | 'P2') => tierRank[hanhaiStore.cycleOverview.progressTier] >= tierRank[unlockTier]
  const visibleRouteInvestments = computed(() => HANHAI_ROUTE_INVESTMENTS.filter(route => isTierUnlocked(route.unlockTier)))
  const visibleContracts = computed(() => HANHAI_CARAVAN_CONTRACT_DEFS.filter(contract => isTierUnlocked(contract.unlockTier)).slice(0, 3))
  const visibleRelicSets = computed(() => HANHAI_RELIC_SET_DEFS.filter(setDef => isTierUnlocked(setDef.unlockTier)).slice(0, 3))
  const currentBossLabel = computed(() => HANHAI_BOSS_CYCLE_DEFS.find(boss => boss.id === hanhaiStore.cycleOverview.bossCycleId)?.label ?? '待刷新')
  const currentShopRotation = computed(() => {
    const unlockedRotations = HANHAI_SHOP_ROTATIONS.filter(rotation => isTierUnlocked(rotation.unlockTier))
    return unlockedRotations[unlockedRotations.length - 1] ?? null
  })
  const getRouteStateText = (routeId: string) => {
    const state = hanhaiStore.cycleState.routeInvestments[routeId]
    if (!state) return '未投入'
    return `投入${state.totalInvested} / 周期${state.tripsCompleted}`
  }

  onMounted(() => {
    startHanhaiBgm()
  })

  onUnmounted(() => {
    endHanhaiBgm()
  })

  // === 解锁逻辑 ===
  const miningStore = useMiningStore()
  const bossDefeated = computed(() => miningStore.defeatedBosses.includes('abyss_dragon'))
  const canUnlock = computed(() => bossDefeated.value && playerStore.money >= HANHAI_UNLOCK_COST)
  const handleUnlock = () => {
    const result = hanhaiStore.unlockHanhai()
    if (!result.success) addLog(result.message)
  }

  // === 轮盘动画状态 ===
  const showRouletteModal = ref(false)
  const roulettePhase = ref<'spinning' | 'done'>('spinning')
  const rouletteHighlight = ref(0)
  const rouletteAnimResult = ref<{ multiplier: number; winnings: number } | null>(null)
  const rouletteBetAmount = ref(0)

  // === 骰子动画状态 ===
  const showDiceModal = ref(false)
  const dicePhase = ref<'rolling' | 'done'>('rolling')
  const diceDisplay = ref<number[]>([1, 1])
  const diceAnimResult = ref<{ won: boolean; winnings: number } | null>(null)
  const diceGuessIsBig = ref(false)

  const diceSum = computed(() => (diceDisplay.value[0] ?? 0) + (diceDisplay.value[1] ?? 0))

  /** 骰面点位 (3×3 grid, 0-indexed) */
  const DICE_DOTS: Record<number, number[]> = {
    1: [4],
    2: [2, 6],
    3: [2, 4, 6],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8]
  }

  // === 猜杯动画状态 ===
  const showCupModal = ref(false)
  const cupPhase = ref<'shuffling' | 'done'>('shuffling')
  const cupGuess = ref(0)
  const cupShuffleIndex = ref(0)
  const cupAnimResult = ref<{ correctCup: number; won: boolean; winnings: number } | null>(null)

  // === 斗蛐蛐动画状态 ===
  const showCricketModal = ref(false)
  const cricketPhase = ref<'fighting' | 'done'>('fighting')
  const cricketChoiceName = ref('')
  const cricketDisplayPower = ref<number[]>([5, 5])
  const cricketAnimResult = ref<{ playerPower: number; opponentPower: number; won: boolean; draw: boolean; winnings: number } | null>(null)

  // === 翻牌动画状态 ===
  const showCardModal = ref(false)
  const cardPhase = ref<'flipping' | 'done'>('flipping')
  const cardPick = ref(0)
  const cardFlipIndex = ref(-1)
  const cardAnimResult = ref<{ treasures: number[]; won: boolean; winnings: number } | null>(null)

  const handleBuyItem = (itemId: string) => {
    const result = hanhaiStore.buyShopItem(itemId)
    if (result.success) {
      sfxBuy()
      addLog(result.message)
      shopModalItem.value = null
    } else {
      addLog(result.message)
    }
  }

  const canBuyShopItem = (itemId: string): boolean => {
    const item = HANHAI_SHOP_ITEMS.find(entry => entry.itemId === itemId)
    if (!item) return false
    return playerStore.money >= item.price && hanhaiStore.getWeeklyRemaining(itemId) > 0 && inventoryStore.canAddItem(itemId, 1)
  }

  // === 藏宝图 ===
  const inventoryStore = useInventoryStore()
  const treasureMapCount = computed(() => inventoryStore.getItemCount('hanhai_map'))
  const handleUseTreasureMap = () => {
    const result = hanhaiStore.useTreasureMap()
    if (result.success) {
      sfxCasinoWin()
    } else {
      addLog(result.message)
    }
  }

  const canReceiveRelicExploreRewards = (site: HanhaiRelicSiteDef): boolean => {
    const rewardItems = (site.rewards.items ?? []).map(item => ({
      itemId: item.itemId,
      quantity: item.quantity,
      quality: 'normal' as const
    }))
    return rewardItems.length === 0 || inventoryStore.canAddItems(rewardItems)
  }

  const canReceiveRelicMilestoneRewards = (): boolean => {
    return inventoryStore.canAddItems([{ itemId: 'hanhai_map', quantity: 1, quality: 'normal' as const }])
  }

  const getRelicRewardText = (site: HanhaiRelicSiteDef): string => {
    const rewards: string[] = []
    if (site.rewards.money) rewards.push(`${site.rewards.money}文`)
    for (const item of site.rewards.items ?? []) {
      rewards.push(`${getItemById(item.itemId)?.name ?? item.itemId}×${item.quantity}`)
    }
    return rewards.join('、')
  }

  const canExploreRelic = (siteId: string): boolean => {
    const site = hanhaiStore.relicSites.find(entry => entry.id === siteId)
    if (!site) return false
    return hanhaiStore.getRelicRemaining(siteId) > 0 && playerStore.money >= site.unlockCost && canReceiveRelicExploreRewards(site)
  }

  const canClaimRelicMilestone = (siteId: string): boolean => {
    const site = hanhaiStore.relicSites.find(entry => entry.id === siteId)
    if (!site) return false
    const record = hanhaiStore.getRelicRecord(siteId)
    return !record.claimedMilestone && record.clears >= site.weeklyLimit && canReceiveRelicMilestoneRewards()
  }

  const getRelicHint = (siteId: string): string => {
    const site = hanhaiStore.relicSites.find(entry => entry.id === siteId)
    if (!site) return '遗迹信息缺失。'

    const record = hanhaiStore.getRelicRecord(siteId)
    if (record.claimedMilestone) return '本周驻点奖励已领取，等下周再来。'
    if (record.clears >= site.weeklyLimit && !canReceiveRelicMilestoneRewards()) return '背包空间不足，暂时无法领取驻点奖励。'
    if (record.clears >= site.weeklyLimit) return '已完成本周全部勘探，可领取驻点奖励。'
    if (playerStore.money < site.unlockCost) return `金钱不足，还差 ${site.unlockCost - playerStore.money} 文探索费用。`
    if (!canReceiveRelicExploreRewards(site)) return '背包空间不足，暂时无法进行这处遗迹勘探。'
    return `本周已勘探 ${record.clears}/${site.weeklyLimit} 次。`
  }

  const handleExploreRelic = (siteId: string) => {
    const result = hanhaiStore.exploreRelicSite(siteId)
    if (!result.success) addLog(result.message)
  }

  const handleClaimRelicMilestone = (siteId: string) => {
    const result = hanhaiStore.claimRelicMilestone(siteId)
    if (!result.success) addLog(result.message)
  }

  // === 轮盘逻辑 ===
  const startRouletteSpin = (targetIndex: number) => {
    const len = ROULETTE_OUTCOMES.length
    const fullCycles = 3 + Math.floor(Math.random() * 2) // 3~4 圈增加随机感
    const totalSteps = fullCycles * len + targetIndex
    let step = 0

    const tick = () => {
      rouletteHighlight.value = step % len
      sfxRouletteTick()

      if (step >= totalSteps) {
        // 动画结束，停在 targetIndex 上，延迟显示结果
        sfxRouletteStop()
        setTimeout(() => {
          roulettePhase.value = 'done'
          if (rouletteAnimResult.value && rouletteAnimResult.value.multiplier > 0) sfxCasinoWin()
          else sfxCasinoLose()
        }, 400)
        return
      }

      step++
      const remaining = totalSteps - step
      let delay: number
      if (remaining > 10) delay = 60
      else if (remaining > 6) delay = 120
      else if (remaining > 3) delay = 200
      else if (remaining > 1) delay = 350
      else delay = 500

      setTimeout(tick, delay)
    }

    setTimeout(tick, 60)
  }

  const handleRoulette = (betTier: number) => {
    const result = hanhaiStore.playRoulette(betTier)
    if (!result.success) {
      addLog(result.message)
      return
    }

    rouletteBetAmount.value = betTier
    rouletteAnimResult.value = { multiplier: result.multiplier, winnings: result.winnings }
    roulettePhase.value = 'spinning'
    rouletteHighlight.value = 0
    showRouletteModal.value = true
    sfxRouletteSpin()

    const targetIndex = ROULETTE_OUTCOMES.findIndex(o => o.multiplier === result.multiplier)
    startRouletteSpin(targetIndex >= 0 ? targetIndex : 0)
  }

  // === 骰子逻辑 ===
  const startDiceRoll = (finalDice1: number, finalDice2: number) => {
    let step = 0
    const totalSteps = 14

    const tick = () => {
      if (step < totalSteps) {
        diceDisplay.value = [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1]
        sfxDiceTick()
        step++
        const delay = step < 8 ? 80 : step < 11 ? 150 : 250
        setTimeout(tick, delay)
      } else {
        diceDisplay.value = [finalDice1, finalDice2]
        sfxDiceLand()
        setTimeout(() => {
          dicePhase.value = 'done'
          if (diceAnimResult.value?.won) sfxCasinoWin()
          else sfxCasinoLose()
        }, 500)
      }
    }

    tick()
  }

  const handleDice = (guessBig: boolean) => {
    const result = hanhaiStore.playDice(guessBig)
    if (!result.success) {
      addLog(result.message)
      return
    }

    diceGuessIsBig.value = guessBig
    diceAnimResult.value = { won: result.won, winnings: result.winnings }
    dicePhase.value = 'rolling'
    diceDisplay.value = [1, 1]
    showDiceModal.value = true
    sfxDiceRoll()

    startDiceRoll(result.dice1, result.dice2)
  }

  // === 猜杯逻辑 ===
  const startCupShuffle = () => {
    let step = 0
    const totalSteps = 12

    const tick = () => {
      if (step < totalSteps) {
        cupShuffleIndex.value = Math.floor(Math.random() * 3)
        sfxCupTick()
        step++
        const delay = step < 6 ? 100 : step < 10 ? 180 : 300
        setTimeout(tick, delay)
      } else {
        cupShuffleIndex.value = -1
        sfxCupReveal()
        setTimeout(() => {
          cupPhase.value = 'done'
          if (cupAnimResult.value?.won) sfxCasinoWin()
          else sfxCasinoLose()
        }, 400)
      }
    }

    tick()
  }

  const handleCup = (guess: number) => {
    const result = hanhaiStore.playCup(guess)
    if (!result.success) {
      addLog(result.message)
      return
    }

    cupGuess.value = guess
    cupAnimResult.value = { correctCup: result.correctCup, won: result.won, winnings: result.winnings }
    cupPhase.value = 'shuffling'
    cupShuffleIndex.value = 0
    showCupModal.value = true
    sfxCupShuffle()

    startCupShuffle()
  }

  // === 斗蛐蛐逻辑 ===
  const startCricketFight = () => {
    let step = 0
    const totalSteps = 12

    const tick = () => {
      if (step < totalSteps) {
        cricketDisplayPower.value = [Math.floor(Math.random() * 10) + 1, Math.floor(Math.random() * 10) + 1]
        sfxCricketTick()
        step++
        const delay = step < 6 ? 120 : step < 10 ? 200 : 350
        setTimeout(tick, delay)
      } else {
        sfxCricketClash()
        setTimeout(() => {
          cricketPhase.value = 'done'
          if (cricketAnimResult.value?.won) sfxCasinoWin()
          else if (!cricketAnimResult.value?.draw) sfxCasinoLose()
        }, 400)
      }
    }

    tick()
  }

  const handleCricket = (cricket: CricketDef) => {
    const result = hanhaiStore.playCricketFight(cricket.name)
    if (!result.success) {
      addLog(result.message)
      return
    }

    cricketChoiceName.value = cricket.name
    cricketAnimResult.value = {
      playerPower: result.playerPower,
      opponentPower: result.opponentPower,
      won: result.won,
      draw: result.draw,
      winnings: result.winnings
    }
    cricketPhase.value = 'fighting'
    cricketDisplayPower.value = [5, 5]
    showCricketModal.value = true
    sfxCricketChirp()

    startCricketFight()
  }

  // === 翻牌逻辑 ===
  const startCardFlip = (pickIndex: number) => {
    let step = 0
    const order: number[] = []
    // Flip picked card first, then others
    order.push(pickIndex)
    for (let i = 0; i < CARD_TOTAL; i++) {
      if (i !== pickIndex) order.push(i)
    }

    const tick = () => {
      if (step < order.length) {
        cardFlipIndex.value = order[step]!
        sfxCardFlip()
        step++
        const delay = step === 1 ? 600 : 300
        setTimeout(tick, delay)
      } else {
        cardFlipIndex.value = -1
        setTimeout(() => {
          cardPhase.value = 'done'
          if (cardAnimResult.value?.won) sfxCasinoWin()
          else sfxCasinoLose()
        }, 200)
      }
    }

    tick()
  }

  const handleCardFlip = (pick: number) => {
    const result = hanhaiStore.playCardFlip(pick)
    if (!result.success) {
      addLog(result.message)
      return
    }

    cardPick.value = pick
    cardAnimResult.value = { treasures: result.treasures, won: result.won, winnings: result.winnings }
    cardPhase.value = 'flipping'
    cardFlipIndex.value = -1
    showCardModal.value = true

    startCardFlip(pick)
  }

  // === 瀚海扑克 ===
  const showTexasModal = ref(false)
  const texasSetup = ref<TexasSetup | null>(null)

  const handleTexas = (tierId: TexasTierId) => {
    const result = hanhaiStore.startTexas(tierId)
    if (!result.success) {
      addLog(result.message)
      return
    }
    texasSetup.value = result as TexasSetup
    showTexasModal.value = true
  }

  const handleTexasComplete = (finalChips: number, tierName: string) => {
    hanhaiStore.endTexas(finalChips, tierName)
    showTexasModal.value = false
  }

  // === 恶魔轮盘 ===
  const showBuckshotModal = ref(false)
  const buckshotSetup = ref<BuckshotSetup | null>(null)

  const handleBuckshot = () => {
    const result = hanhaiStore.startBuckshot()
    if (!result.success) {
      addLog(result.message)
      return
    }
    buckshotSetup.value = result as BuckshotSetup
    showBuckshotModal.value = true
  }

  const handleBuckshotComplete = (won: boolean, draw: boolean) => {
    hanhaiStore.endBuckshot(won, draw)
    showBuckshotModal.value = false
  }
</script>

<style scoped>
  .dice-face {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    width: 3.5rem;
    height: 3.5rem;
    border: 1px solid rgba(200, 164, 92, 0.3);
    border-radius: 2px;
    padding: 6px;
    margin: 2px;
  }

  .dice-rolling {
    animation: dice-shake 0.1s infinite;
  }

  @keyframes dice-shake {
    0%,
    100% {
      transform: translate(0, 0);
    }
    25% {
      transform: translate(-1px, 1px);
    }
    50% {
      transform: translate(1px, -1px);
    }
    75% {
      transform: translate(-1px, -1px);
    }
  }

  /* 猜杯 */
  .cup-box {
    position: relative;
    width: 4rem;
    height: 4rem;
    border: 1px solid rgba(200, 164, 92, 0.2);
    border-radius: 2px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .cup-highlight {
    border-color: rgba(200, 164, 92, 0.6);
    background: rgba(200, 164, 92, 0.1);
  }

  .cup-correct {
    border-color: rgba(90, 158, 111, 0.6);
    background: rgba(90, 158, 111, 0.1);
  }

  .cup-picked {
    border-color: rgba(195, 64, 67, 0.4);
  }

  .cup-shake {
    animation: cup-wobble 0.15s infinite alternate;
  }

  @keyframes cup-wobble {
    0% {
      transform: translateY(0);
    }
    100% {
      transform: translateY(-2px);
    }
  }

  /* 斗蛐蛐 */
  .cricket-icon {
    display: flex;
    justify-content: center;
    line-height: 1;
  }

  .cricket-fight {
    animation: cricket-bounce 0.2s infinite alternate;
  }

  @keyframes cricket-bounce {
    0% {
      transform: translateX(-2px);
    }
    100% {
      transform: translateX(2px);
    }
  }

  /* 翻牌 */
  .card-tile {
    width: 3rem;
    height: 3.5rem;
    border: 1px solid rgba(200, 164, 92, 0.2);
    border-radius: 2px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transition: all 0.3s;
  }

  .card-flipping {
    border-color: rgba(200, 164, 92, 0.6);
    background: rgba(200, 164, 92, 0.1);
    animation: card-flip 0.4s ease;
  }

  .card-treasure {
    border-color: rgba(90, 158, 111, 0.6);
    background: rgba(90, 158, 111, 0.08);
  }

  .card-empty {
    border-color: rgba(200, 164, 92, 0.1);
    opacity: 0.5;
  }

  .card-picked {
    border-width: 2px;
  }

  @keyframes card-flip {
    0% {
      transform: scaleX(1);
    }
    50% {
      transform: scaleX(0);
    }
    100% {
      transform: scaleX(1);
    }
  }
</style>
