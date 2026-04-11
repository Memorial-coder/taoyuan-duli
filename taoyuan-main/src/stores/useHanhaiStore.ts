import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  HANHAI_SHOP_ITEMS,
  HANHAI_RELIC_SITES,
  MAX_DAILY_BETS,
  HANHAI_UNLOCK_COST,
  spinRoulette,
  rollDice,
  ROULETTE_BET_TIERS,
  DICE_BET_AMOUNT,
  CUP_BET_AMOUNT,
  CUP_WIN_MULTIPLIER,
  playCupRound,
  CRICKET_BET_AMOUNT,
  CRICKET_WIN_MULTIPLIER,
  fightCricket,
  CARD_BET_AMOUNT,
  CARD_WIN_MULTIPLIER,
  dealCards,
  getTexasTier,
  dealTexas,
  BUCKSHOT_BET_AMOUNT,
  BUCKSHOT_WIN_MULTIPLIER,
  BUCKSHOT_PLAYER_HP,
  BUCKSHOT_DEALER_HP,
  loadShotgun
} from '@/data/hanhai'
import { getItemById } from '@/data'
import { addLog } from '@/composables/useGameLog'
import type {
  BuckshotSetup,
  HanhaiCycleOverview,
  HanhaiProgressTier,
  HanhaiCycleState,
  HanhaiDebugSnapshot,
  HanhaiRelicRecord,
  HanhaiRelicSiteSummary,
  HanhaiSaveData,
  HanhaiShopItemSummary,
  TexasSetup,
  TexasTierId
} from '@/types'
import { useGameStore } from './useGameStore'
import { useInventoryStore } from './useInventoryStore'
import { usePlayerStore } from './usePlayerStore'

export const useHanhaiStore = defineStore('hanhai', () => {
  const unlocked = ref(false)
  const casinoBetsToday = ref(0)
  const weeklyPurchases = ref<Record<string, number>>({})
  const relicRecords = ref<Record<string, HanhaiRelicRecord>>({})
  const cycleState = ref<HanhaiCycleState>({
    saveVersion: 1,
    progressTier: 'P0',
    routeInvestments: {},
    setCollections: {},
    bossCycleId: '',
    lastWeeklyResetDayTag: ''
  })

  const getItemName = (itemId: string): string => getItemById(itemId)?.name ?? itemId
  const getRelicSiteSummary = (siteId: string) => relicSiteSummaries.value.find(site => site.siteId === siteId)
  const getShopItemSummary = (itemId: string) => shopItemSummaries.value.find(item => item.itemId === itemId)
  const updateCycleState = (patch: Partial<HanhaiCycleState>) => {
    cycleState.value = {
      ...cycleState.value,
      ...patch,
      routeInvestments: patch.routeInvestments ?? cycleState.value.routeInvestments,
      setCollections: patch.setCollections ?? cycleState.value.setCollections
    }
  }
  const getDebugSnapshot = (): HanhaiDebugSnapshot => ({
    unlocked: unlocked.value,
    casinoBetsToday: casinoBetsToday.value,
    weeklyPurchases: { ...weeklyPurchases.value },
    relicRecords: { ...relicRecords.value },
    cycleState: {
      ...cycleState.value,
      routeInvestments: { ...cycleState.value.routeInvestments },
      setCollections: { ...cycleState.value.setCollections }
    }
  })

  const canBet = computed(() => casinoBetsToday.value < MAX_DAILY_BETS)
  const betsRemaining = computed(() => MAX_DAILY_BETS - casinoBetsToday.value)
  const relicSites = computed(() => HANHAI_RELIC_SITES)
  const totalRelicClears = computed(() => Object.values(relicRecords.value).reduce((sum, record) => sum + record.clears, 0))
  const relicSiteSummaries = computed<HanhaiRelicSiteSummary[]>(() =>
    HANHAI_RELIC_SITES.map(site => {
      const record = relicRecords.value[site.id] ?? { siteId: site.id, clears: 0, claimedMilestone: false }
      return {
        siteId: site.id,
        name: site.name,
        weeklyLimit: site.weeklyLimit,
        clears: record.clears,
        remaining: Math.max(0, site.weeklyLimit - record.clears),
        claimedMilestone: record.claimedMilestone,
        relicTag: site.relicTag
      }
    })
  )
  const shopItemSummaries = computed<HanhaiShopItemSummary[]>(() =>
    HANHAI_SHOP_ITEMS.map(item => ({
      itemId: item.itemId,
      name: item.name,
      weeklyLimit: item.weeklyLimit,
      remaining: item.weeklyLimit ? Math.max(0, item.weeklyLimit - (weeklyPurchases.value[item.itemId] ?? 0)) : Infinity,
      canPurchase: !item.weeklyLimit || (weeklyPurchases.value[item.itemId] ?? 0) < item.weeklyLimit
    }))
  )
  const cycleOverview = computed<HanhaiCycleOverview>(() => ({
    unlocked: unlocked.value,
    progressTier: cycleState.value.progressTier,
    totalRelicClears: totalRelicClears.value,
    activeInvestmentCount: Object.keys(cycleState.value.routeInvestments).length,
    completedCollectionCount: Object.values(cycleState.value.setCollections).filter(collection => collection.completed).length,
    bossCycleId: cycleState.value.bossCycleId,
    betsRemaining: betsRemaining.value
  }))

  const resolveProgressTier = (): HanhaiProgressTier => {
    const completedCollectionCount = Object.values(cycleState.value.setCollections).filter(collection => collection.completed).length
    const activeInvestmentCount = Object.keys(cycleState.value.routeInvestments).length
    if (completedCollectionCount > 0 || totalRelicClears.value >= 6) return 'P2'
    if (activeInvestmentCount > 0 || totalRelicClears.value >= 2 || unlocked.value) return 'P1'
    return 'P0'
  }

  const mergeProgressTier = (left: HanhaiProgressTier, right: HanhaiProgressTier): HanhaiProgressTier => {
    const rank = { P0: 0, P1: 1, P2: 2 } as const
    return rank[left] >= rank[right] ? left : right
  }

  const resolveBossCycleId = (weekOfSeason: number) => {
    const bossCycleIds = ['dune_revenant', 'glass_scorpion', 'sunken_colossus', 'sandstorm_wyrm']
    return bossCycleIds[Math.max(0, Math.min(bossCycleIds.length - 1, weekOfSeason - 1))] ?? bossCycleIds[0]!
  }

  const unlockHanhai = (): { success: boolean; message: string } => {
    if (unlocked.value) return { success: false, message: '瀚海已经解锁。' }
    const playerStore = usePlayerStore()
    if (!playerStore.spendMoney(HANHAI_UNLOCK_COST)) {
      return { success: false, message: `金钱不足（需要${HANHAI_UNLOCK_COST}文）。` }
    }
    unlocked.value = true
    addLog('修通了前往瀚海的商路！新的冒险等待着你。')
    return { success: true, message: '瀚海商路已开通！' }
  }

  const getWeeklyRemaining = (itemId: string): number => {
    const item = HANHAI_SHOP_ITEMS.find(i => i.itemId === itemId)
    if (!item?.weeklyLimit) return Infinity
    return Math.max(0, item.weeklyLimit - (weeklyPurchases.value[itemId] ?? 0))
  }

  const buyShopItem = (itemId: string): { success: boolean; message: string } => {
    const item = HANHAI_SHOP_ITEMS.find(i => i.itemId === itemId)
    if (!item) return { success: false, message: '商品不存在。' }
    if (item.weeklyLimit && (weeklyPurchases.value[itemId] ?? 0) >= item.weeklyLimit) {
      return { success: false, message: `${item.name}本周限购已达上限。` }
    }

    const inventoryStore = useInventoryStore()
    const quantity = item.quantity ?? 1
    const rewardItems = [{ itemId: item.itemId, quantity, quality: 'normal' as const }]
    if (!inventoryStore.canAddItems(rewardItems)) {
      return { success: false, message: '背包已满，无法购买。' }
    }

    const extraCosts = item.costItems ?? []
    const lackingCost = extraCosts.find(cost => inventoryStore.getTotalItemCount(cost.itemId) < cost.quantity)
    if (lackingCost) {
      return {
        success: false,
        message: `${getItemName(lackingCost.itemId)}不足，无法兑换${item.name}。`
      }
    }

    const playerStore = usePlayerStore()
    if (!playerStore.spendMoney(item.price)) {
      return { success: false, message: '金钱不足。' }
    }

    const inventorySnapshot = inventoryStore.serialize()
    for (const cost of extraCosts) {
      if (!inventoryStore.removeItemAnywhere(cost.itemId, cost.quantity)) {
        inventoryStore.deserialize(inventorySnapshot)
        playerStore.earnMoney(item.price, { countAsEarned: false })
        return { success: false, message: `${getItemName(cost.itemId)}不足，无法兑换${item.name}。` }
      }
    }

    if (!inventoryStore.addItemsExact(rewardItems)) {
      inventoryStore.deserialize(inventorySnapshot)
      playerStore.earnMoney(item.price, { countAsEarned: false })
      return { success: false, message: '背包已满，无法购买。' }
    }

    weeklyPurchases.value[itemId] = (weeklyPurchases.value[itemId] ?? 0) + 1
    return { success: true, message: `购买了${item.name}${quantity > 1 ? `×${quantity}` : ''}。` }
  }

  const getRelicRecord = (siteId: string): HanhaiRelicRecord => {
    return relicRecords.value[siteId] ?? { siteId, clears: 0, claimedMilestone: false }
  }

  const getRelicRemaining = (siteId: string): number => {
    const site = HANHAI_RELIC_SITES.find(entry => entry.id === siteId)
    if (!site) return 0
    return Math.max(0, site.weeklyLimit - getRelicRecord(siteId).clears)
  }

  const exploreRelicSite = (siteId: string): { success: boolean; message: string } => {
    const site = HANHAI_RELIC_SITES.find(entry => entry.id === siteId)
    if (!site) return { success: false, message: '遗迹不存在。' }
    if (getRelicRemaining(siteId) <= 0) {
      return { success: false, message: `${site.name}本周已经探查完毕。` }
    }

    const playerStore = usePlayerStore()
    if (!playerStore.spendMoney(site.unlockCost)) {
      return { success: false, message: '金钱不足。' }
    }

    const inventoryStore = useInventoryStore()
    const rewardItems = (site.rewards.items ?? []).map(item => ({
      itemId: item.itemId,
      quantity: item.quantity,
      quality: 'normal' as const
    }))

    if (rewardItems.length > 0 && !inventoryStore.canAddItems(rewardItems)) {
      playerStore.earnMoney(site.unlockCost, { countAsEarned: false })
      return { success: false, message: '背包空间不足，暂时无法探索。' }
    }

    if (site.rewards.money) {
      playerStore.earnMoney(site.rewards.money, { countAsEarned: false })
    }
    if (rewardItems.length > 0) {
      inventoryStore.addItemsExact(rewardItems)
    }

    relicRecords.value[siteId] = {
      ...getRelicRecord(siteId),
      siteId,
      clears: getRelicRecord(siteId).clears + 1
    }
    addLog(`你探索了${site.name}，带回了${site.relicTag}与一批异域收获。`, {
      category: 'hanhai',
      tags: ['hanhai_relic_exploration'],
      meta: { siteId, clears: relicRecords.value[siteId]?.clears ?? 0 }
    })
    return { success: true, message: `探索${site.name}成功。` }
  }

  const claimRelicMilestone = (siteId: string): { success: boolean; message: string } => {
    const site = HANHAI_RELIC_SITES.find(entry => entry.id === siteId)
    if (!site) return { success: false, message: '遗迹不存在。' }

    const record = getRelicRecord(siteId)
    if (record.claimedMilestone) return { success: false, message: '已领取过驻点奖励。' }
    if (record.clears < site.weeklyLimit) return { success: false, message: '还未完成本周全部勘探。' }

    const inventoryStore = useInventoryStore()
    const rewardItems = [{ itemId: 'hanhai_map', quantity: 1, quality: 'normal' as const }]
    if (!inventoryStore.canAddItems(rewardItems)) {
      return { success: false, message: '背包空间不足，无法领取驻点奖励。' }
    }

    inventoryStore.addItemsExact(rewardItems)
    relicRecords.value[siteId] = { ...record, claimedMilestone: true }
    addLog(`你完成了${site.name}的本周勘探，额外获得一张藏宝图。`, {
      category: 'hanhai',
      tags: ['hanhai_relic_milestone'],
      meta: { siteId }
    })
    return { success: true, message: `领取了${site.name}的驻点奖励。` }
  }

  const useTreasureMap = (): { success: boolean; message: string; rewards: { name: string; quantity: number }[] } => {
    const inventoryStore = useInventoryStore()
    const roll = Math.random()
    const rewards: { itemId: string; name: string; quantity: number }[] = []
    const itemRewards: { itemId: string; quantity: number; quality: 'normal' }[] = []
    let moneyReward = 0

    if (roll < 0.05) {
      moneyReward = 5000
      rewards.push({ itemId: '', name: '5000文', quantity: 1 })
      rewards.push({ itemId: 'hanhai_turquoise', name: '绿松石', quantity: 2 })
      itemRewards.push({ itemId: 'hanhai_turquoise', quantity: 2, quality: 'normal' })
    } else if (roll < 0.2) {
      moneyReward = 2000
      rewards.push({ itemId: '', name: '2000文', quantity: 1 })
      rewards.push({ itemId: 'hanhai_spice', name: '西域香料', quantity: 3 })
      itemRewards.push({ itemId: 'hanhai_spice', quantity: 3, quality: 'normal' })
    } else if (roll < 0.45) {
      moneyReward = 1000
      rewards.push({ itemId: '', name: '1000文', quantity: 1 })
      rewards.push({ itemId: 'hanhai_silk', name: '丝绸', quantity: 1 })
      itemRewards.push({ itemId: 'hanhai_silk', quantity: 1, quality: 'normal' })
    } else {
      moneyReward = 500
      rewards.push({ itemId: '', name: '500文', quantity: 1 })
    }

    if (itemRewards.length > 0 && !inventoryStore.canAddItems(itemRewards)) {
      return { success: false, message: '背包空间不足，暂时无法使用藏宝图。', rewards: [] }
    }
    if (!inventoryStore.removeItem('hanhai_map')) {
      return { success: false, message: '没有藏宝图。', rewards: [] }
    }

    const playerStore = usePlayerStore()
    if (moneyReward > 0) playerStore.earnMoney(moneyReward)
    if (itemRewards.length > 0) inventoryStore.addItemsExact(itemRewards)

    const rewardText = rewards.map(r => r.name + (r.quantity > 1 ? `×${r.quantity}` : '')).join('、')
    addLog(`使用藏宝图寻宝，发现了：${rewardText}！`, {
      category: 'hanhai',
      tags: ['hanhai_treasure_map'],
      meta: { rewardCount: rewards.length, moneyReward }
    })
    return { success: true, message: `寻宝成功！获得：${rewardText}`, rewards }
  }

  const playRoulette = (betTier: number): { success: boolean; message: string; multiplier: number; winnings: number } => {
    if (!canBet.value) return { success: false, message: '今天的赌博次数已用完。', multiplier: 0, winnings: 0 }
    if (!ROULETTE_BET_TIERS.includes(betTier as (typeof ROULETTE_BET_TIERS)[number])) {
      return { success: false, message: '无效的投注金额。', multiplier: 0, winnings: 0 }
    }

    const playerStore = usePlayerStore()
    if (!playerStore.spendMoney(betTier)) {
      return { success: false, message: '金钱不足。', multiplier: 0, winnings: 0 }
    }

    casinoBetsToday.value++
    const outcome = spinRoulette()
    const winnings = Math.floor(betTier * outcome.multiplier)
    if (winnings > 0) playerStore.earnMoney(winnings)

    if (outcome.multiplier === 0) {
      addLog(`轮盘停在了"${outcome.label}"，损失了${betTier}文。`)
    } else {
      addLog(`轮盘停在了"${outcome.label}"！赢得${winnings}文！`)
    }
    return { success: true, message: `轮盘停在了"${outcome.label}"`, multiplier: outcome.multiplier, winnings }
  }

  const playDice = (
    guessBig: boolean
  ): { success: boolean; message: string; dice1: number; dice2: number; won: boolean; winnings: number } => {
    if (!canBet.value) return { success: false, message: '今天的赌博次数已用完。', dice1: 0, dice2: 0, won: false, winnings: 0 }
    const playerStore = usePlayerStore()
    if (!playerStore.spendMoney(DICE_BET_AMOUNT)) {
      return { success: false, message: '金钱不足。', dice1: 0, dice2: 0, won: false, winnings: 0 }
    }
    casinoBetsToday.value++
    const result = rollDice()
    const won = guessBig === result.isBig
    const winnings = won ? DICE_BET_AMOUNT * 2 : 0
    if (won) playerStore.earnMoney(winnings)
    const guessText = guessBig ? '大' : '小'
    const resultText = result.isBig ? '大' : '小'
    if (won) {
      addLog(`骰子${result.dice1}+${result.dice2}=${result.total}（${resultText}），你猜${guessText}——赢了${winnings}文！`)
    } else {
      addLog(`骰子${result.dice1}+${result.dice2}=${result.total}（${resultText}），你猜${guessText}——输了${DICE_BET_AMOUNT}文。`)
    }
    return { success: true, message: won ? '赢了！' : '输了…', dice1: result.dice1, dice2: result.dice2, won, winnings }
  }

  const playCup = (guess: number): { success: boolean; message: string; correctCup: number; won: boolean; winnings: number } => {
    if (!canBet.value) return { success: false, message: '今天的赌博次数已用完。', correctCup: 0, won: false, winnings: 0 }
    const playerStore = usePlayerStore()
    if (!playerStore.spendMoney(CUP_BET_AMOUNT)) {
      return { success: false, message: '金钱不足。', correctCup: 0, won: false, winnings: 0 }
    }
    casinoBetsToday.value++
    const result = playCupRound()
    const won = guess === result.correctCup
    const winnings = won ? Math.floor(CUP_BET_AMOUNT * CUP_WIN_MULTIPLIER) : 0
    if (won) {
      playerStore.earnMoney(winnings)
      addLog(`猜杯猜中了第${guess + 1}号杯！赢得${winnings}文！`)
    } else {
      addLog(`猜杯猜错了，球在第${result.correctCup + 1}号杯下，损失了${CUP_BET_AMOUNT}文。`)
    }
    return { success: true, message: won ? '猜中了！' : '猜错了…', correctCup: result.correctCup, won, winnings }
  }

  const playCricketFight = (
    cricketId: string
  ): { success: boolean; message: string; playerPower: number; opponentPower: number; won: boolean; draw: boolean; winnings: number } => {
    if (!canBet.value) {
      return { success: false, message: '今天的赌博次数已用完。', playerPower: 0, opponentPower: 0, won: false, draw: false, winnings: 0 }
    }
    const playerStore = usePlayerStore()
    if (!playerStore.spendMoney(CRICKET_BET_AMOUNT)) {
      return { success: false, message: '金钱不足。', playerPower: 0, opponentPower: 0, won: false, draw: false, winnings: 0 }
    }
    casinoBetsToday.value++
    const result = fightCricket()
    const won = result.playerPower > result.opponentPower
    const draw = result.playerPower === result.opponentPower
    const winnings = won ? Math.floor(CRICKET_BET_AMOUNT * CRICKET_WIN_MULTIPLIER) : draw ? CRICKET_BET_AMOUNT : 0
    if (won || draw) playerStore.earnMoney(winnings)
    if (won) {
      addLog(`斗蛐蛐（${cricketId}）：力量${result.playerPower}对${result.opponentPower}，大获全胜！赢得${winnings}文！`)
    } else if (draw) {
      addLog(`斗蛐蛐（${cricketId}）：力量${result.playerPower}对${result.opponentPower}，平局，退还${CRICKET_BET_AMOUNT}文。`)
    } else {
      addLog(`斗蛐蛐（${cricketId}）：力量${result.playerPower}对${result.opponentPower}，败下阵来，损失${CRICKET_BET_AMOUNT}文。`)
    }
    return {
      success: true,
      message: won ? '赢了！' : draw ? '平局' : '输了…',
      playerPower: result.playerPower,
      opponentPower: result.opponentPower,
      won,
      draw,
      winnings
    }
  }

  const playCardFlip = (pick: number): { success: boolean; message: string; treasures: number[]; won: boolean; winnings: number } => {
    if (!canBet.value) return { success: false, message: '今天的赌博次数已用完。', treasures: [], won: false, winnings: 0 }
    const playerStore = usePlayerStore()
    if (!playerStore.spendMoney(CARD_BET_AMOUNT)) {
      return { success: false, message: '金钱不足。', treasures: [], won: false, winnings: 0 }
    }
    casinoBetsToday.value++
    const result = dealCards()
    const won = result.treasures.includes(pick)
    const winnings = won ? Math.floor(CARD_BET_AMOUNT * CARD_WIN_MULTIPLIER) : 0
    if (won) {
      playerStore.earnMoney(winnings)
      addLog(`翻牌寻宝翻到了宝牌！赢得${winnings}文！`)
    } else {
      addLog(`翻牌寻宝翻到了空牌，损失了${CARD_BET_AMOUNT}文。`)
    }
    return { success: true, message: won ? '翻到宝了！' : '空牌…', treasures: result.treasures, won, winnings }
  }

  const startTexas = (tierId: TexasTierId): { success: boolean; message: string } & Partial<TexasSetup> => {
    if (!canBet.value) return { success: false, message: '今天的赌博次数已用完。' }
    const tier = getTexasTier(tierId)
    const playerStore = usePlayerStore()
    if (playerStore.money < tier.minMoney) {
      return { success: false, message: `需要至少持有${tier.minMoney}文才能入场。` }
    }
    const totalCost = tier.entryFee + tier.rake
    if (!playerStore.spendMoney(totalCost)) {
      return { success: false, message: '金钱不足。' }
    }
    casinoBetsToday.value++
    const deal = dealTexas()
    return {
      success: true,
      message: `${tier.name}开始！`,
      playerHole: deal.playerHole,
      dealerHole: deal.dealerHole,
      community: deal.community,
      tier
    }
  }

  const endTexas = (finalChips: number, tierName: string) => {
    const playerStore = usePlayerStore()
    if (finalChips > 0) playerStore.earnMoney(finalChips)
    addLog(`瀚海扑克（${tierName}）结束，收回筹码${finalChips}文。`)
  }

  const startBuckshot = (): { success: boolean; message: string } & Partial<BuckshotSetup> => {
    if (!canBet.value) return { success: false, message: '今天的赌博次数已用完。' }
    const playerStore = usePlayerStore()
    if (!playerStore.spendMoney(BUCKSHOT_BET_AMOUNT)) {
      return { success: false, message: '金钱不足。' }
    }
    casinoBetsToday.value++
    return {
      success: true,
      message: '恶魔轮盘开始！',
      shells: loadShotgun(),
      playerHP: BUCKSHOT_PLAYER_HP,
      dealerHP: BUCKSHOT_DEALER_HP
    }
  }

  const endBuckshot = (won: boolean, draw: boolean) => {
    const playerStore = usePlayerStore()
    if (won) {
      playerStore.earnMoney(BUCKSHOT_BET_AMOUNT * BUCKSHOT_WIN_MULTIPLIER)
      addLog(`恶魔轮盘胜利！赢得${BUCKSHOT_BET_AMOUNT * BUCKSHOT_WIN_MULTIPLIER}文！`)
    } else if (draw) {
      playerStore.earnMoney(BUCKSHOT_BET_AMOUNT)
      addLog(`恶魔轮盘平局，退还${BUCKSHOT_BET_AMOUNT}文。`)
    } else {
      addLog(`恶魔轮盘落败，损失了${BUCKSHOT_BET_AMOUNT}文。`)
    }
  }

  const processCycleTick = (payload: {
    currentDayTag: string
    currentWeekId: string
    weekOfSeason: number
    startedNewWeek: boolean
  }) => {
    const logs: string[] = []
    casinoBetsToday.value = 0

    const derivedTier = resolveProgressTier()
    let nextCycleState: HanhaiCycleState = {
      ...cycleState.value,
      progressTier: mergeProgressTier(cycleState.value.progressTier, derivedTier)
    }

    if (payload.startedNewWeek) {
      weeklyPurchases.value = {}
      relicRecords.value = {}
      nextCycleState = {
        ...nextCycleState,
        bossCycleId: resolveBossCycleId(payload.weekOfSeason),
        lastWeeklyResetDayTag: payload.currentDayTag,
        routeInvestments: Object.fromEntries(
          Object.entries(nextCycleState.routeInvestments).map(([routeId, state]) => [
            routeId,
            {
              ...state,
              tripsCompleted: state.tripsCompleted + 1
            }
          ])
        )
      }
      logs.push(`【瀚海】新一周的沙海循环已刷新，本周首领：${nextCycleState.bossCycleId}。`)
    }

    cycleState.value = nextCycleState

    for (const message of logs) {
      addLog(message, {
        category: 'hanhai',
        tags: ['hanhai_cycle_tick', 'late_game_cycle'],
        meta: {
          weekId: payload.currentWeekId,
          bossCycleId: nextCycleState.bossCycleId,
          progressTier: nextCycleState.progressTier
        }
      })
    }

    return {
      logs,
      cycleState: nextCycleState
    }
  }

  const resetDailyBets = () => {
    casinoBetsToday.value = 0
  }

  const serialize = (): HanhaiSaveData => ({
    unlocked: unlocked.value,
    casinoBetsToday: casinoBetsToday.value,
    weeklyPurchases: weeklyPurchases.value,
    relicRecords: relicRecords.value,
    cycleState: cycleState.value
  })

  const deserialize = (data: Partial<HanhaiSaveData>) => {
    unlocked.value = data?.unlocked ?? false
    casinoBetsToday.value = data?.casinoBetsToday ?? 0
    weeklyPurchases.value = data?.weeklyPurchases ?? {}
    relicRecords.value = data?.relicRecords ?? {}
    cycleState.value = {
      saveVersion: data?.cycleState?.saveVersion ?? 1,
      progressTier: data?.cycleState?.progressTier ?? 'P0',
      routeInvestments: data?.cycleState?.routeInvestments ?? {},
      setCollections: data?.cycleState?.setCollections ?? {},
      bossCycleId: data?.cycleState?.bossCycleId ?? '',
      lastWeeklyResetDayTag: data?.cycleState?.lastWeeklyResetDayTag ?? ''
    }
  }

  const reset = () => {
    unlocked.value = false
    casinoBetsToday.value = 0
    weeklyPurchases.value = {}
    relicRecords.value = {}
    cycleState.value = {
      saveVersion: 1,
      progressTier: 'P0',
      routeInvestments: {},
      setCollections: {},
      bossCycleId: '',
      lastWeeklyResetDayTag: ''
    }
  }

  const $reset = () => {
    reset()
  }

  return {
    unlocked,
    casinoBetsToday,
    weeklyPurchases,
    relicRecords,
    cycleState,
    canBet,
    betsRemaining,
    cycleOverview,
    relicSiteSummaries,
    shopItemSummaries,
    relicSites,
    totalRelicClears,
    unlockHanhai,
    getWeeklyRemaining,
    getRelicSiteSummary,
    getShopItemSummary,
    updateCycleState,
    getDebugSnapshot,
    buyShopItem,
    getRelicRecord,
    getRelicRemaining,
    exploreRelicSite,
    claimRelicMilestone,
    useTreasureMap,
    playRoulette,
    playDice,
    playCup,
    playCricketFight,
    playCardFlip,
    startTexas,
    endTexas,
    startBuckshot,
    endBuckshot,
    processCycleTick,
    resetDailyBets,
    serialize,
    deserialize,
    reset,
    $reset
  }
})
