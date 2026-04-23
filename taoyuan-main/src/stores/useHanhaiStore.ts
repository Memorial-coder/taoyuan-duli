import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  HANHAI_CASINO_SIDE_REWARD_DEFS,
  HANHAI_BOSS_CYCLE_DEFS,
  HANHAI_CARAVAN_CONTRACT_DEFS,
  HANHAI_OPERATION_TUNING_CONFIG,
  HANHAI_RELIC_SET_DEFS,
  WS14_HANHAI_BOSS_CYCLE_DEFS,
  WS14_HANHAI_CARAVAN_CONTRACT_DEFS,
  WS14_HANHAI_RELIC_SET_DEFS,
  WS14_HANHAI_RELIC_SITES,
  WS14_HANHAI_ROUTE_INVESTMENTS,
  WS14_HANHAI_SHOP_ROTATIONS,
  HANHAI_ROUTE_INVESTMENTS,
  HANHAI_SHOP_ITEMS,
  HANHAI_SHOP_ROTATIONS,
  HANHAI_RELIC_SITES,
  HANHAI_TREASURE_MAP_REWARDS,
  MAX_DAILY_BETS,
  HANHAI_UNLOCK_COST,
  pickWeightedRewardBundle,
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
  compareHands,
  evaluateBestHand,
  getTexasTier,
  dealTexas,
  texasDealerAI,
  BUCKSHOT_BET_AMOUNT,
  BUCKSHOT_WIN_MULTIPLIER,
  BUCKSHOT_PLAYER_HP,
  BUCKSHOT_DEALER_HP,
  loadShotgun,
  dealerDecide
} from '@/data/hanhai'
import { getItemById } from '@/data'
import { addLog } from '@/composables/useGameLog'
import type {
  BuckshotSetup,
  BuckshotPlayerAction,
  CasinoGameType,
  HanhaiActiveBuckshotSession,
  HanhaiActiveTexasSession,
  HanhaiCycleOverview,
  HanhaiCasinoRewardTrigger,
  HanhaiProgressTier,
  HanhaiCycleState,
  HanhaiDebugSnapshot,
  HanhaiRelicRecord,
  HanhaiRewardBundle,
  HanhaiRelicSiteSummary,
  HanhaiSaveData,
  HanhaiShopItemSummary,
  TexasHandSetup,
  TexasSessionReport,
  RewardTicketType,
  TexasSetup,
  TexasStreet,
  TexasTierId
} from '@/types'
import { useInventoryStore } from './useInventoryStore'
import { useGameStore } from './useGameStore'
import { usePlayerStore } from './usePlayerStore'
import { useSettingsStore } from './useSettingsStore'
import { useWalletStore } from './useWalletStore'
import { useGoalStore } from './useGoalStore'
import { useShopStore } from './useShopStore'
import { useVillageProjectStore } from './useVillageProjectStore'
import { getWeekCycleInfo } from '@/utils/weekCycle'

const dedupeList = <T,>(items: T[]): T[] => Array.from(new Set(items))
type HanhaiQuestMarketCategory = 'crop' | 'fruit' | 'ore' | 'gem' | 'processed' | 'fish'
type HanhaiQuestType = 'delivery' | 'gathering' | 'mining' | 'fishing'
type ActiveTexasSession = HanhaiActiveTexasSession
type ActiveBuckshotSession = HanhaiActiveBuckshotSession

const hanhaiTuning = HANHAI_OPERATION_TUNING_CONFIG
const hanhaiFeatureFlags = hanhaiTuning.featureFlags
const hanhaiDisplayConfig = hanhaiTuning.display
const hanhaiProgressionConfig = hanhaiTuning.progression
const hanhaiRewardConfig = hanhaiTuning.rewards
const hanhaiOperationsConfig = hanhaiTuning.operations

const HANHAI_TIER_RANK: Record<HanhaiProgressTier, number> = { P0: 0, P1: 1, P2: 2 }
const ALL_HANHAI_ROUTE_INVESTMENTS = [...HANHAI_ROUTE_INVESTMENTS, ...WS14_HANHAI_ROUTE_INVESTMENTS]
const ALL_HANHAI_RELIC_SITES = [...HANHAI_RELIC_SITES, ...WS14_HANHAI_RELIC_SITES]
const ALL_HANHAI_RELIC_SET_DEFS = [...HANHAI_RELIC_SET_DEFS, ...WS14_HANHAI_RELIC_SET_DEFS]
const ALL_HANHAI_BOSS_CYCLE_DEFS = [...HANHAI_BOSS_CYCLE_DEFS, ...WS14_HANHAI_BOSS_CYCLE_DEFS]
const ALL_HANHAI_CARAVAN_CONTRACT_DEFS = [...HANHAI_CARAVAN_CONTRACT_DEFS, ...WS14_HANHAI_CARAVAN_CONTRACT_DEFS]
const ALL_HANHAI_SHOP_ROTATIONS = [...HANHAI_SHOP_ROTATIONS, ...WS14_HANHAI_SHOP_ROTATIONS]

const HANHAI_ROUTE_TO_QUEST_MARKET_CATEGORIES: Record<string, HanhaiQuestMarketCategory[]> = {
  westbound_silk_route: ['processed', 'crop', 'fruit'],
  turquoise_exchange_route: ['ore', 'gem', 'processed'],
  moon_sand_ceremony_route: ['processed', 'gem', 'fruit'],
  oasis_exchange_route: ['processed', 'fish', 'gem'],
  starfall_patron_route: ['processed', 'gem', 'fish']
}

const HANHAI_RELIC_SITE_TO_QUEST_MARKET_CATEGORIES: Record<string, HanhaiQuestMarketCategory[]> = {
  sunset_ruins: ['processed'],
  turquoise_pit: ['ore', 'gem'],
  moon_sand_shrine: ['processed', 'fruit', 'gem'],
  mirage_observatory: ['processed', 'gem'],
  stormglass_catacomb: ['ore', 'gem', 'processed']
}

const HANHAI_SET_TO_QUEST_MARKET_CATEGORIES: Record<string, HanhaiQuestMarketCategory[]> = {
  merchant_ledger_set: ['processed', 'ore'],
  desert_ritual_set: ['processed', 'fruit'],
  sun_moon_trade_set: ['processed', 'ore', 'gem'],
  oasis_exchange_set: ['processed', 'gem'],
  stormglass_relic_set: ['ore', 'gem', 'processed']
}

const HANHAI_BOSS_TO_QUEST_MARKET_CATEGORIES: Record<string, HanhaiQuestMarketCategory[]> = {
  dune_revenant: ['processed'],
  glass_scorpion: ['ore', 'gem'],
  sunken_colossus: ['processed', 'gem'],
  sandstorm_wyrm: ['ore', 'gem', 'processed'],
  mirage_judge: ['processed', 'gem'],
  starfall_leviathan: ['ore', 'gem', 'processed']
}

const HANHAI_CONTRACT_TO_QUEST_MARKET_CATEGORIES: Record<string, HanhaiQuestMarketCategory[]> = {
  contract_silk_relay: ['processed', 'crop'],
  contract_turquoise_exchange: ['ore', 'gem', 'processed'],
  contract_moon_sand_patronage: ['processed', 'fruit', 'gem'],
  contract_koi_showcase_relay: ['fish', 'processed'],
  contract_coldchain_specimen_route: ['fish', 'processed', 'gem'],
  contract_oasis_archive_route: ['processed', 'gem', 'fish'],
  contract_starfall_patronage: ['processed', 'gem']
}

const HANHAI_ITEM_TO_QUEST_MARKET_CATEGORIES: Record<string, HanhaiQuestMarketCategory[]> = {
  hanhai_cactus_seed: ['crop'],
  hanhai_date_seed: ['fruit'],
  hanhai_spice: ['processed'],
  hanhai_silk: ['processed'],
  hanhai_turquoise: ['ore', 'gem'],
  hanhai_map: ['processed'],
  mega_bomb_recipe: ['ore', 'processed']
}

const resolveBuckshotOutcome = (
  session: ActiveBuckshotSession,
  playerActions: BuckshotPlayerAction[]
): { won: boolean; draw: boolean; valid: boolean; reason?: string } => {
  let shellIndex = 0
  let playerHP = BUCKSHOT_PLAYER_HP
  let dealerHP = BUCKSHOT_DEALER_HP
  let isPlayerTurn = session.playerFirst
  let actionIndex = 0

  const finalize = () => {
    if (playerHP <= 0) return { won: false, draw: false, valid: true }
    if (dealerHP <= 0) return { won: true, draw: false, valid: true }
    if (shellIndex >= session.shells.length) {
      if (playerHP > dealerHP) return { won: true, draw: false, valid: true }
      if (playerHP < dealerHP) return { won: false, draw: false, valid: true }
      return { won: false, draw: true, valid: true }
    }
    return null
  }

  while (true) {
    const completed = finalize()
    if (completed) return completed

    const shell = session.shells[shellIndex]
    if (!shell) {
      return { won: false, draw: false, valid: false, reason: '弹仓记录不完整' }
    }
    shellIndex++

    if (isPlayerTurn) {
      const action = playerActions[actionIndex]
      actionIndex++
      if (action !== 'self' && action !== 'opponent') {
        return { won: false, draw: false, valid: false, reason: '玩家操作轨迹不完整' }
      }
      if (action === 'opponent') {
        if (shell === 'live') dealerHP = Math.max(0, dealerHP - 1)
        isPlayerTurn = false
      } else if (shell === 'live') {
        playerHP = Math.max(0, playerHP - 1)
        isPlayerTurn = false
      } else {
        isPlayerTurn = true
      }
      continue
    }

    const decision = dealerDecide(session.shells, shellIndex - 1, false)
    if (decision === 'opponent') {
      if (shell === 'live') playerHP = Math.max(0, playerHP - 1)
      isPlayerTurn = true
    } else if (shell === 'live') {
      dealerHP = Math.max(0, dealerHP - 1)
      isPlayerTurn = true
    } else {
      isPlayerTurn = false
    }
  }
}

const TEXAS_STREET_ORDER: TexasStreet[] = ['preflop', 'flop', 'turn', 'river', 'showdown']

const getVisibleTexasCommunity = (street: TexasStreet, community: TexasHandSetup['community']) => {
  if (street === 'preflop') return []
  if (street === 'flop') return community.slice(0, 3)
  if (street === 'turn') return community.slice(0, 4)
  return community.slice(0, 5)
}

const resolveTexasSessionOutcome = (
  session: ActiveTexasSession,
  report: TexasSessionReport
): { valid: boolean; finalChips?: number; totalInvested?: number; reason?: string } => {
  const tier = getTexasTier(session.tierId)
  const actions = Array.isArray(report.playerActions) ? report.playerActions : []
  const firstHand = session.hands[0]
  if (!firstHand) {
    return { valid: false, reason: '牌局配置缺失' }
  }
  let actionIndex = 0
  let currentRound = 1
  let playerStack = tier.entryFee
  let dealerStack = tier.entryFee
  let pot = 0
  let playerBetRound = 0
  let dealerBetRound = 0
  let playerAllIn = false
  let dealerAllIn = false
  let street: TexasStreet = 'preflop'
  let totalInvested = 0
  let reserveMoney = session.reserveMoney
  let sessionOver = false
  let currentHand: TexasHandSetup = firstHand

  const betFromPlayer = (amount: number) => {
    const actual = Math.min(Math.max(0, Math.floor(Number(amount) || 0)), playerStack)
    playerStack -= actual
    playerBetRound += actual
    if (playerStack <= 0) playerAllIn = true
    return actual
  }

  const betFromDealer = (amount: number) => {
    const actual = Math.min(Math.max(0, Math.floor(Number(amount) || 0)), dealerStack)
    dealerStack -= actual
    dealerBetRound += actual
    if (dealerStack <= 0) dealerAllIn = true
    return actual
  }

  const collectBets = () => {
    const matched = Math.min(playerBetRound, dealerBetRound)
    pot += matched * 2
    if (playerBetRound > matched) playerStack += playerBetRound - matched
    if (dealerBetRound > matched) dealerStack += dealerBetRound - matched
    playerBetRound = 0
    dealerBetRound = 0
  }

  const doShowdown = () => {
    street = 'showdown'
    const pHand = evaluateBestHand([...currentHand.playerHole, ...currentHand.community])
    const dHand = evaluateBestHand([...currentHand.dealerHole, ...currentHand.community])
    const cmp = compareHands(pHand, dHand)
    endHand(cmp > 0 ? 'won' : cmp === 0 ? 'draw' : 'lost')
  }

  const startNextHand = () => {
    currentRound += 1
    const nextHand = session.hands[currentRound - 1]
    if (!nextHand) {
      sessionOver = true
      return
    }
    currentHand = nextHand
    if (dealerStack < tier.blind * 2) {
      dealerStack = tier.entryFee
    }
    if (playerStack < tier.blind * 2) {
      const needed = tier.entryFee - playerStack
      const canAfford = Math.min(needed, reserveMoney)
      reserveMoney -= canAfford
      playerStack += canAfford
      totalInvested += canAfford
    }
    street = 'preflop'
    pot = 0
    playerBetRound = 0
    dealerBetRound = 0
    playerAllIn = false
    dealerAllIn = false
    betFromPlayer(tier.blind)
    betFromDealer(tier.blind)
    collectBets()
  }

  const endHand = (result: 'won' | 'draw' | 'lost') => {
    if (result === 'won') {
      playerStack += pot
    } else if (result === 'draw') {
      const half = Math.floor(pot / 2)
      playerStack += half
      dealerStack += pot - half
    } else {
      dealerStack += pot
    }
    pot = 0

    const playerBroke = playerStack <= 0 && reserveMoney <= 0
    if (playerBroke || currentRound >= tier.rounds) {
      sessionOver = true
      return
    }
    startNextHand()
  }

  const advanceStreet = () => {
    collectBets()
    const streetIndex = TEXAS_STREET_ORDER.indexOf(street)
    if (streetIndex < 0) {
      sessionOver = true
      return
    }
    if (street === 'river' || streetIndex >= TEXAS_STREET_ORDER.indexOf('river')) {
      doShowdown()
      return
    }
    street = TEXAS_STREET_ORDER[streetIndex + 1] ?? 'showdown'
    if (playerAllIn || dealerAllIn) {
      advanceStreet()
    }
  }

  const checkRoundEnd = (playerActed: boolean) => {
    const settled = playerBetRound === dealerBetRound || (playerBetRound < dealerBetRound && playerAllIn) || (dealerBetRound < playerBetRound && dealerAllIn)
    if (settled) {
      advanceStreet()
      return
    }
    if (playerActed) {
      dealerTurn()
    }
  }

  const dealerTurn = () => {
    const decision = texasDealerAI(
      currentHand.dealerHole,
      getVisibleTexasCommunity(street, currentHand.community),
      street,
      pot + playerBetRound + dealerBetRound,
      dealerStack,
      playerBetRound,
      dealerBetRound,
      playerAllIn,
      tier.blind
    )

    if (decision.action === 'fold') {
      collectBets()
      endHand('won')
      return
    }
    if (decision.action === 'check') {
      checkRoundEnd(false)
      return
    }
    if (decision.action === 'call') {
      betFromDealer(playerBetRound - dealerBetRound)
      checkRoundEnd(false)
      return
    }
    if (decision.action === 'allin') {
      betFromDealer(dealerStack)
      dealerAllIn = true
      if (!(dealerBetRound > playerBetRound && !playerAllIn)) {
        checkRoundEnd(false)
      }
      return
    }
    betFromDealer(decision.amount)
  }

  betFromPlayer(tier.blind)
  betFromDealer(tier.blind)
  collectBets()

  while (!sessionOver) {
    const action = actions[actionIndex]
    if (!action) {
      return { valid: false, reason: '玩家操作轨迹不完整' }
    }
    if (action.round !== currentRound || action.street !== street) {
      return { valid: false, reason: '玩家操作轨迹与当前牌局阶段不匹配' }
    }
    actionIndex += 1

    if (action.action === 'check') {
      dealerTurn()
      continue
    }
    if (action.action === 'call') {
      betFromPlayer(Math.max(0, dealerBetRound - playerBetRound))
      checkRoundEnd(true)
      continue
    }
    if (action.action === 'raise') {
      const total = Math.max(0, Math.floor(Number(action.total) || 0))
      if (total <= playerBetRound) {
        return { valid: false, reason: '玩家加注轨迹无效' }
      }
      betFromPlayer(total - playerBetRound)
      dealerTurn()
      continue
    }
    if (action.action === 'allin') {
      betFromPlayer(playerStack)
      playerAllIn = true
      dealerTurn()
      continue
    }
    if (action.action === 'fold') {
      collectBets()
      endHand('lost')
      continue
    }
    return { valid: false, reason: '存在未知的玩家操作' }
  }

  if (actionIndex !== actions.length) {
    return { valid: false, reason: '玩家操作轨迹存在多余步骤' }
  }

  return {
    valid: true,
    finalChips: Math.max(0, Math.floor(playerStack)),
    totalInvested: Math.max(0, Math.floor(totalInvested))
  }
}

const mapHanhaiCategoriesToQuestTypes = (categories: HanhaiQuestMarketCategory[]): HanhaiQuestType[] => {
  const questTypes: HanhaiQuestType[] = []
  if (categories.some(category => category === 'ore' || category === 'gem')) questTypes.push('mining')
  if (categories.some(category => category === 'processed')) questTypes.push('gathering')
  if (categories.some(category => category === 'fish')) questTypes.push('fishing')
  if (categories.some(category => category === 'crop' || category === 'fruit')) questTypes.push('delivery')
  return dedupeList(questTypes)
}

export const useHanhaiStore = defineStore('hanhai', () => {
  const goalStore = useGoalStore()
  const shopStore = useShopStore()
  const villageProjectStore = useVillageProjectStore()
  const unlocked = ref(false)
  const casinoBetsToday = ref(0)
  const weeklyPurchases = ref<Record<string, number>>({})
  const relicRecords = ref<Record<string, HanhaiRelicRecord>>({})
  const hanhaiActionLocks = ref<string[]>([])
  const cycleState = ref<HanhaiCycleState>({
    saveVersion: 1,
    progressTier: 'P0',
    routeInvestments: {},
    setCollections: {},
    bossCycleId: '',
    lastWeeklyResetDayTag: ''
  })
  const activeTexasSession = ref<ActiveTexasSession | null>(null)
  const activeBuckshotSession = ref<ActiveBuckshotSession | null>(null)
  const hasActiveCasinoSession = computed(() =>
    !!(activeTexasSession.value && !activeTexasSession.value.settled)
    || !!(activeBuckshotSession.value && !activeBuckshotSession.value.settled)
  )

  const getItemName = (itemId: string): string => getItemById(itemId)?.name ?? itemId
  const getScaledShopWeeklyLimit = (weeklyLimit?: number) => {
    if (!weeklyLimit) return undefined
    return Math.max(0, Math.floor(weeklyLimit * hanhaiRewardConfig.shopWeeklyLimitMultiplier))
  }
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
  const refreshProgressTier = () => {
    cycleState.value = {
      ...cycleState.value,
      progressTier: mergeProgressTier(cycleState.value.progressTier, resolveProgressTier())
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
  const getCurrentDayTag = () => {
    const gameStore = useGameStore()
    return `${gameStore.year}-${gameStore.season}-${gameStore.day}`
  }
  const getCurrentWeekInfo = () => {
    const gameStore = useGameStore()
    return getWeekCycleInfo(gameStore.year, gameStore.season, gameStore.day)
  }
  const createCasinoSessionId = (prefix: 'texas' | 'buckshot') => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const cloneTexasHandSetup = (value: Partial<TexasHandSetup> | null | undefined): TexasHandSetup | null => {
    if (!value || !Array.isArray(value.playerHole) || !Array.isArray(value.dealerHole) || !Array.isArray(value.community)) {
      return null
    }

    const playerHole = value.playerHole.filter(card => card && typeof card === 'object').map(card => ({ ...card }))
    const dealerHole = value.dealerHole.filter(card => card && typeof card === 'object').map(card => ({ ...card }))
    const community = value.community.filter(card => card && typeof card === 'object').map(card => ({ ...card }))

    if (playerHole.length < 2 || dealerHole.length < 2 || community.length < 5) return null
    return { playerHole, dealerHole, community }
  }

  const cloneActiveTexasSession = (value: Partial<ActiveTexasSession> | null | undefined): ActiveTexasSession | null => {
    if (!value || typeof value.sessionId !== 'string' || !value.sessionId || !Array.isArray(value.hands)) return null
    const tierId = value.tierId
    if (tierId !== 'beginner' && tierId !== 'normal' && tierId !== 'expert') return null
    const hands = value.hands.map(hand => cloneTexasHandSetup(hand)).filter((hand): hand is TexasHandSetup => !!hand)
    if (hands.length <= 0) return null
    return {
      sessionId: value.sessionId,
      tierId,
      tierName: typeof value.tierName === 'string' && value.tierName ? value.tierName : getTexasTier(tierId)?.name ?? tierId,
      entryFee: Math.max(0, Math.floor(Number(value.entryFee) || 0)),
      startedAtDayTag: typeof value.startedAtDayTag === 'string' ? value.startedAtDayTag : '',
      reserveMoney: Math.max(0, Math.floor(Number(value.reserveMoney) || 0)),
      hands,
      settled: !!value.settled
    }
  }

  const cloneActiveBuckshotSession = (value: Partial<ActiveBuckshotSession> | null | undefined): ActiveBuckshotSession | null => {
    if (!value || typeof value.sessionId !== 'string' || !value.sessionId || !Array.isArray(value.shells)) return null
    const shells = value.shells.filter(shell => shell === 'live' || shell === 'blank')
    if (shells.length <= 0) return null
    return {
      sessionId: value.sessionId,
      startedAtDayTag: typeof value.startedAtDayTag === 'string' ? value.startedAtDayTag : '',
      shells: [...shells],
      playerFirst: !!value.playerFirst,
      settled: !!value.settled
    }
  }

  const beginHanhaiAction = (lockId: string): boolean => {
    if (!hanhaiFeatureFlags.hanhaiActionGuardEnabled) return true
    if (hanhaiActionLocks.value.includes(lockId)) return false
    hanhaiActionLocks.value = [...hanhaiActionLocks.value, lockId]
    return true
  }

  const finishHanhaiAction = (lockId: string) => {
    if (!hanhaiFeatureFlags.hanhaiActionGuardEnabled) return
    hanhaiActionLocks.value = hanhaiActionLocks.value.filter(entry => entry !== lockId)
  }

  const createHanhaiActionSnapshots = () => {
    const playerStore = usePlayerStore()
    const inventoryStore = useInventoryStore()
    const walletStore = useWalletStore()
    return {
      player: playerStore.serialize(),
      inventory: inventoryStore.serialize(),
      wallet: walletStore.serialize(),
      hanhai: serialize()
    }
  }

  const rollbackHanhaiAction = (snapshots: ReturnType<typeof createHanhaiActionSnapshots>) => {
    const playerStore = usePlayerStore()
    const inventoryStore = useInventoryStore()
    const walletStore = useWalletStore()
    playerStore.deserialize(snapshots.player)
    inventoryStore.deserialize(snapshots.inventory)
    walletStore.deserialize(snapshots.wallet)
    deserialize(snapshots.hanhai)
  }

  const getCasinoCashMultiplier = () => {
    const multiplier = useSettingsStore().getLateGameBalanceConfig().casinoCashExpectationMultiplier
    return Math.max(0, Math.min(1, Number.isFinite(Number(multiplier)) ? Number(multiplier) : 1))
  }

  const scaleCasinoCashReward = (amount: number): number => {
    return Math.max(0, Math.floor(Math.max(0, Number(amount) || 0) * getCasinoCashMultiplier()))
  }

  const resolveBundleItemEntries = (bundle: HanhaiRewardBundle | undefined) =>
    (bundle?.items ?? []).map(item => ({
      itemId: item.itemId,
      quantity: Math.max(0, Math.floor(Number(item.quantity) || 0)),
      quality: 'normal' as const
    })).filter(item => item.quantity > 0)

  const grantRewardBundle = (
    bundle: HanhaiRewardBundle | undefined,
    options?: { ticketSource?: string }
  ): {
    money: number
    items: { itemId: string; quantity: number; name: string }[]
    tickets: { ticketType: RewardTicketType; quantity: number; name: string }[]
    skippedItems: { itemId: string; quantity: number; name: string }[]
  } => {
    const playerStore = usePlayerStore()
    const inventoryStore = useInventoryStore()
    const walletStore = useWalletStore()
    const grantedItems: { itemId: string; quantity: number; name: string }[] = []
    const grantedTickets: { ticketType: RewardTicketType; quantity: number; name: string }[] = []
    const skippedItems: { itemId: string; quantity: number; name: string }[] = []
    const moneyReward = Math.max(0, Math.floor(Number(bundle?.money) || 0))
    const itemRewards = resolveBundleItemEntries(bundle)

    if (moneyReward > 0) {
      playerStore.earnMoney(moneyReward)
    }

    if (itemRewards.length > 0) {
      if (inventoryStore.canAddItems(itemRewards)) {
        inventoryStore.addItemsExact(itemRewards)
        grantedItems.push(...itemRewards.map(item => ({
          itemId: item.itemId,
          quantity: item.quantity,
          name: getItemName(item.itemId)
        })))
      } else {
        skippedItems.push(...itemRewards.map(item => ({
          itemId: item.itemId,
          quantity: item.quantity,
          name: getItemName(item.itemId)
        })))
      }
    }

    const grantedTicketLedger = walletStore.addRewardTickets(bundle?.ticketRewards, {
      source: options?.ticketSource ?? 'hanhai'
    })
    grantedTickets.push(
      ...Object.entries(grantedTicketLedger).map(([ticketType, quantity]) => ({
        ticketType: ticketType as RewardTicketType,
        quantity: Math.max(0, Math.floor(Number(quantity) || 0)),
        name: walletStore.getTicketLabel(ticketType as RewardTicketType)
      })).filter(ticket => ticket.quantity > 0)
    )

    return {
      money: moneyReward,
      items: grantedItems,
      tickets: grantedTickets,
      skippedItems
    }
  }

  const summarizeGrantedRewards = (reward: {
    money: number
    items: { itemId: string; quantity: number; name: string }[]
    tickets: { ticketType: RewardTicketType; quantity: number; name: string }[]
    skippedItems: { itemId: string; quantity: number; name: string }[]
  }) => {
    const grantedTexts: string[] = []
    const skippedTexts: string[] = []

    if (reward.money > 0) grantedTexts.push(`${reward.money}文`)
    for (const item of reward.items) {
      grantedTexts.push(`${item.name}${item.quantity > 1 ? `×${item.quantity}` : ''}`)
    }
    for (const ticket of reward.tickets) {
      grantedTexts.push(`${ticket.name}${ticket.quantity > 1 ? `×${ticket.quantity}` : ''}`)
    }
    for (const item of reward.skippedItems) {
      skippedTexts.push(`${item.name}${item.quantity > 1 ? `×${item.quantity}` : ''}`)
    }

    return {
      grantedTexts,
      skippedTexts
    }
  }

  const pickCasinoSideReward = (gameType: CasinoGameType, trigger: HanhaiCasinoRewardTrigger) => {
    return pickWeightedRewardBundle(
      HANHAI_CASINO_SIDE_REWARD_DEFS.filter(def => def.gameType === gameType && def.trigger === trigger)
    )
  }

  const settleCasinoRewards = (gameType: CasinoGameType, trigger: HanhaiCasinoRewardTrigger, baseCashReward: number) => {
    const directMoney = scaleCasinoCashReward(baseCashReward)
    const sideRewardDef = pickCasinoSideReward(gameType, trigger)
    const rewardSummary = grantRewardBundle(
      {
        money: directMoney,
        items: sideRewardDef?.rewards.items,
        ticketRewards: sideRewardDef?.rewards.ticketRewards
      },
      { ticketSource: `hanhai_${gameType}_${trigger}` }
    )

    return {
      directMoney,
      sideRewardDef,
      rewardSummary,
      rewardTexts: summarizeGrantedRewards(rewardSummary)
    }
  }

  const canBet = computed(() => casinoBetsToday.value < MAX_DAILY_BETS)
  const betsRemaining = computed(() => MAX_DAILY_BETS - casinoBetsToday.value)
  const relicSites = computed(() => ALL_HANHAI_RELIC_SITES)
  const totalRelicClears = computed(() => Object.values(relicRecords.value).reduce((sum, record) => sum + record.clears, 0))
  const relicSiteSummaries = computed<HanhaiRelicSiteSummary[]>(() =>
    ALL_HANHAI_RELIC_SITES.map(site => {
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
    HANHAI_SHOP_ITEMS.map(item => {
      const weeklyLimit = getScaledShopWeeklyLimit(item.weeklyLimit)
      return {
        itemId: item.itemId,
        name: item.name,
        weeklyLimit,
        remaining: weeklyLimit !== undefined ? Math.max(0, weeklyLimit - (weeklyPurchases.value[item.itemId] ?? 0)) : Infinity,
        canPurchase: weeklyLimit === undefined || (weeklyPurchases.value[item.itemId] ?? 0) < weeklyLimit
      }
    })
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

  const isTierUnlocked = (tier: HanhaiProgressTier) => HANHAI_TIER_RANK[cycleState.value.progressTier] >= HANHAI_TIER_RANK[tier]

  const resolveFocusLabels = <T extends { id: string }>(
    ids: string[],
    defs: T[],
    labelGetter: (entry: T) => string
  ) => ids.map(id => defs.find(entry => entry.id === id)).filter((entry): entry is T => !!entry).map(labelGetter).slice(0, hanhaiDisplayConfig.themeFocusLabelLimit)

  const currentThemeWeekHanhaiFocus = computed(() => {
    if (!hanhaiFeatureFlags.themeWeekFocusEnabled) return null
    const themeWeek = goalStore.currentThemeWeek
    if (!themeWeek) return null

    const routeIds = themeWeek.hanhaiFocusRouteIds ?? []
    const relicSiteIds = themeWeek.hanhaiFocusRelicSiteIds ?? []
    const bossCycleIds = themeWeek.hanhaiFocusBossCycleIds ?? []
    const contractIds = themeWeek.hanhaiFocusContractIds ?? []
    const relicSetIds = themeWeek.hanhaiFocusRelicSetIds ?? []
    const shopRotationIds = themeWeek.hanhaiFocusShopRotationIds ?? []

    return {
      id: themeWeek.id,
      name: themeWeek.name,
      summaryLabel: themeWeek.ui?.summaryLabel ?? themeWeek.name,
      routeIds,
      relicSiteIds,
      bossCycleIds,
      contractIds,
      relicSetIds,
      shopRotationIds,
      routeLabels: resolveFocusLabels(routeIds, ALL_HANHAI_ROUTE_INVESTMENTS, entry => entry.label),
      relicSiteLabels: resolveFocusLabels(relicSiteIds, ALL_HANHAI_RELIC_SITES, entry => entry.name),
      bossCycleLabels: resolveFocusLabels(bossCycleIds, ALL_HANHAI_BOSS_CYCLE_DEFS, entry => entry.label),
      contractLabels: resolveFocusLabels(contractIds, ALL_HANHAI_CARAVAN_CONTRACT_DEFS, entry => entry.label),
      relicSetLabels: resolveFocusLabels(relicSetIds, ALL_HANHAI_RELIC_SET_DEFS, entry => entry.label),
      shopRotationLabels: resolveFocusLabels(shopRotationIds, ALL_HANHAI_SHOP_ROTATIONS, entry => entry.label)
    }
  })

  const linkedVillageProjects = computed(() => {
    if (!hanhaiFeatureFlags.linkedVillageProjectLinkEnabled) return []
    return (villageProjectStore.getLinkedProjectSummaries('hanhai') as Array<Record<string, any>> | undefined) ?? []
  })

  const featuredRouteInvestments = computed(() => {
    const focusedIds = new Set(currentThemeWeekHanhaiFocus.value?.routeIds ?? [])
    return [...ALL_HANHAI_ROUTE_INVESTMENTS]
      .filter(route => isTierUnlocked(route.unlockTier) || focusedIds.has(route.id))
      .map(route => {
        const state = cycleState.value.routeInvestments[route.id]
        return {
          ...route,
          active: Boolean(state),
          totalInvested: state?.totalInvested ?? 0,
          tripsCompleted: state?.tripsCompleted ?? 0,
          focused: focusedIds.has(route.id)
        }
      })
      .sort((left, right) => {
        const leftWeight = (left.active ? 4 : 0) + (left.focused ? 2 : 0) + HANHAI_TIER_RANK[left.unlockTier]
        const rightWeight = (right.active ? 4 : 0) + (right.focused ? 2 : 0) + HANHAI_TIER_RANK[right.unlockTier]
        return rightWeight - leftWeight
      })
      .slice(0, hanhaiDisplayConfig.featuredRouteLimit)
  })

  const featuredCaravanContracts = computed(() => {
    const focusedIds = new Set(currentThemeWeekHanhaiFocus.value?.contractIds ?? [])
    return [...ALL_HANHAI_CARAVAN_CONTRACT_DEFS]
      .filter(contract => isTierUnlocked(contract.unlockTier) || focusedIds.has(contract.id))
      .sort((left, right) => {
        const leftWeight = (focusedIds.has(left.id) ? 2 : 0) + HANHAI_TIER_RANK[left.unlockTier]
        const rightWeight = (focusedIds.has(right.id) ? 2 : 0) + HANHAI_TIER_RANK[right.unlockTier]
        return rightWeight - leftWeight
      })
      .slice(0, hanhaiDisplayConfig.featuredContractLimit)
  })

  const featuredRelicSets = computed(() => {
    const focusedIds = new Set(currentThemeWeekHanhaiFocus.value?.relicSetIds ?? [])
    return [...ALL_HANHAI_RELIC_SET_DEFS]
      .filter(setDef => isTierUnlocked(setDef.unlockTier) || focusedIds.has(setDef.id))
      .map(setDef => {
        const state = cycleState.value.setCollections[setDef.id]
        return {
          ...setDef,
          completed: Boolean(state?.completed),
          collectedRelicTags: [...(state?.collectedRelicTags ?? [])],
          focused: focusedIds.has(setDef.id)
        }
      })
      .sort((left, right) => {
        const leftWeight = (left.completed ? 3 : 0) + (left.focused ? 2 : 0) + HANHAI_TIER_RANK[left.unlockTier]
        const rightWeight = (right.completed ? 3 : 0) + (right.focused ? 2 : 0) + HANHAI_TIER_RANK[right.unlockTier]
        return rightWeight - leftWeight
      })
      .slice(0, hanhaiDisplayConfig.featuredRelicSetLimit)
  })

  const activeBossCycleOverview = computed(() => {
    const focusedIds = new Set(currentThemeWeekHanhaiFocus.value?.bossCycleIds ?? [])
    const currentBoss = ALL_HANHAI_BOSS_CYCLE_DEFS.find(boss => boss.id === cycleState.value.bossCycleId) ?? null
    if (currentBoss) {
      return {
        ...currentBoss,
        focused: focusedIds.has(currentBoss.id)
      }
    }
    const focusedBoss = ALL_HANHAI_BOSS_CYCLE_DEFS.find(boss => focusedIds.has(boss.id) && isTierUnlocked(boss.unlockTier))
    return focusedBoss ? { ...focusedBoss, focused: true } : null
  })

  const activeShopRotationOverview = computed(() => {
    const focusedIds = new Set(currentThemeWeekHanhaiFocus.value?.shopRotationIds ?? [])
    const unlockedRotations = ALL_HANHAI_SHOP_ROTATIONS.filter(rotation => isTierUnlocked(rotation.unlockTier))
    const activeRotation =
      unlockedRotations.find(rotation => focusedIds.has(rotation.id)) ??
      unlockedRotations[unlockedRotations.length - 1] ??
      null

    if (!activeRotation) return null
    return {
      ...activeRotation,
      focused: focusedIds.has(activeRotation.id),
      featuredItemLabels: activeRotation.featuredItemIds.map(itemId => getItemById(itemId)?.name ?? itemId)
    }
  })

  const recommendedCatalogOffers = computed(() => {
    if (!hanhaiFeatureFlags.recommendedCatalogEnabled) return []
    const preferredCategories = new Set<HanhaiQuestMarketCategory>([
      ...featuredRouteInvestments.value.flatMap(route => HANHAI_ROUTE_TO_QUEST_MARKET_CATEGORIES[route.id] ?? []),
      ...featuredCaravanContracts.value.flatMap(contract => HANHAI_CONTRACT_TO_QUEST_MARKET_CATEGORIES[contract.id] ?? []),
      ...(activeBossCycleOverview.value ? (HANHAI_BOSS_TO_QUEST_MARKET_CATEGORIES[activeBossCycleOverview.value.id] ?? []) : []),
      ...(activeShopRotationOverview.value?.featuredItemIds ?? []).flatMap(itemId => HANHAI_ITEM_TO_QUEST_MARKET_CATEGORIES[itemId] ?? [])
    ])

    return shopStore.recommendedCatalogOffers
      .filter(offer => {
        const tags = offer.tags ?? []
        if (offer.linkedSystems.includes('quest') || offer.linkedSystems.includes('museum') || offer.linkedSystems.includes('goal')) return true
        if (preferredCategories.has('ore') || preferredCategories.has('gem')) {
          if (tags.includes('矿洞') || tags.includes('每周精选')) return true
        }
        if (preferredCategories.has('processed')) {
          if (tags.includes('功能商品') || tags.includes('材料包')) return true
        }
        if (preferredCategories.has('crop') || preferredCategories.has('fruit')) {
          if (tags.includes('功能商品') || tags.includes('灌溉')) return true
        }
        return false
      })
      .slice(0, hanhaiDisplayConfig.recommendedCatalogOfferLimit)
  })

  const questBoardBiasProfile = computed(() => {
    if (!hanhaiFeatureFlags.questBoardBiasEnabled) {
      return {
        preferredMarketCategories: [] as HanhaiQuestMarketCategory[],
        preferredQuestTypes: [] as HanhaiQuestType[],
        preferredVillagerCategory: null,
        biasStrength: 0,
        boardHint: '',
        specialOrderHint: '',
        focusLabels: [] as string[],
        activeBossLabel: null,
        activeShopRotationLabel: null
      }
    }
    const preferredMarketCategories = dedupeList<HanhaiQuestMarketCategory>([
      ...featuredRouteInvestments.value.flatMap(route => HANHAI_ROUTE_TO_QUEST_MARKET_CATEGORIES[route.id] ?? []),
      ...(currentThemeWeekHanhaiFocus.value?.relicSiteIds ?? []).flatMap(siteId => HANHAI_RELIC_SITE_TO_QUEST_MARKET_CATEGORIES[siteId] ?? []),
      ...featuredRelicSets.value.flatMap(setDef => HANHAI_SET_TO_QUEST_MARKET_CATEGORIES[setDef.id] ?? []),
      ...(activeBossCycleOverview.value ? (HANHAI_BOSS_TO_QUEST_MARKET_CATEGORIES[activeBossCycleOverview.value.id] ?? []) : []),
      ...featuredCaravanContracts.value.flatMap(contract => HANHAI_CONTRACT_TO_QUEST_MARKET_CATEGORIES[contract.id] ?? []),
      ...(activeShopRotationOverview.value?.featuredItemIds ?? []).flatMap(itemId => HANHAI_ITEM_TO_QUEST_MARKET_CATEGORIES[itemId] ?? [])
    ])
    const preferredQuestTypes = mapHanhaiCategoriesToQuestTypes(preferredMarketCategories)
    const preferredVillagerCategory =
      preferredMarketCategories.includes('fish')
        ? 'fishing'
        : preferredMarketCategories.includes('ore') || preferredMarketCategories.includes('gem')
          ? 'gathering'
          : preferredMarketCategories.includes('processed')
            ? 'cooking'
            : preferredMarketCategories.includes('crop') || preferredMarketCategories.includes('fruit')
              ? 'gathering'
              : null
    const focusLabels = dedupeList([
      ...(currentThemeWeekHanhaiFocus.value?.routeLabels ?? []),
      ...(currentThemeWeekHanhaiFocus.value?.relicSiteLabels ?? []),
      ...(currentThemeWeekHanhaiFocus.value?.contractLabels ?? []),
      activeBossCycleOverview.value?.label ?? '',
      activeShopRotationOverview.value?.label ?? ''
    ].filter(Boolean)).slice(0, hanhaiDisplayConfig.themeFocusLabelLimit)
    const biasStrength = Math.min(
      hanhaiOperationsConfig.maxQuestBiasStrength,
      preferredMarketCategories.length +
        (linkedVillageProjects.value.some(project => !project.completed && project.available) ? hanhaiOperationsConfig.linkedVillageProjectBiasBonus : 0) +
        (recommendedCatalogOffers.value.length > 0 ? hanhaiOperationsConfig.recommendedCatalogTagMatchBonus : 0) +
        (activeBossCycleOverview.value ? hanhaiOperationsConfig.activeBossQuestBiasBonus : 0)
    )

    return {
      preferredMarketCategories,
      preferredQuestTypes,
      preferredVillagerCategory,
      biasStrength,
      boardHint:
        focusLabels.length > 0
          ? `【瀚海联动】本周沙海筹备更偏向 ${focusLabels.slice(0, 3).join('、')}，告示板会更关注矿藏、补给与异域供货。`
          : '',
      specialOrderHint:
        activeBossCycleOverview.value || activeShopRotationOverview.value
          ? `瀚海联动：当前首领「${activeBossCycleOverview.value?.label ?? '待刷新'}」与货架「${activeShopRotationOverview.value?.label ?? '未轮换'}」会放大 ${preferredMarketCategories.join(' / ')} 相关筹备需求。`
          : '',
      focusLabels,
      activeBossLabel: activeBossCycleOverview.value?.label ?? null,
      activeShopRotationLabel: activeShopRotationOverview.value?.label ?? null
    }
  })

  const crossSystemOverview = computed(() => {
    if (!hanhaiFeatureFlags.crossSystemOverviewEnabled) {
      return {
        themeWeekFocus: null,
        linkedVillageProjects: [],
        featuredRouteInvestments: [],
        featuredCaravanContracts: [],
        featuredRelicSets: [],
        activeBossCycle: null,
        activeShopRotation: null,
        questBoardBiasProfile: questBoardBiasProfile.value,
        recommendedCatalogOffers: [],
        recommendedActions: []
      }
    }
    const recommendedActions: string[] = []
    if (goalStore.currentEventCampaign) {
      recommendedActions.push(`当前活动「${goalStore.currentEventCampaign.label}」正在放大瀚海承接，优先把商路、首领和目录消耗纳入同一轮活动节奏。`)
    }
    if (currentThemeWeekHanhaiFocus.value) {
      const labels = dedupeList([
        ...(currentThemeWeekHanhaiFocus.value.routeLabels ?? []),
        ...(currentThemeWeekHanhaiFocus.value.relicSiteLabels ?? []),
        ...(currentThemeWeekHanhaiFocus.value.bossCycleLabels ?? [])
      ]).slice(0, hanhaiDisplayConfig.themeFocusLabelLimit)
      if (labels.length > 0) {
        recommendedActions.push(`本周主题周额外关注 ${labels.join('、')}，把瀚海推进与主线周筹备串成同一条经营路线。`)
      }
    }
    if (linkedVillageProjects.value.some(project => !project.completed && project.available)) {
      recommendedActions.push('推进带有“瀚海”联动的村庄建设，可同步放大商路承接、告示板容量与终局投资出口。')
    }
    if (featuredRelicSets.value.some(setDef => !setDef.completed)) {
      const targetSet = featuredRelicSets.value.find(setDef => !setDef.completed)
      if (targetSet) {
        recommendedActions.push(`围绕「${targetSet.label}」补齐遗迹主题，可把瀚海产出反向转成博物馆展示与主题周目标价值。`)
      }
    }
    if (recommendedCatalogOffers.value.length > 0) {
      recommendedActions.push(`可优先把瀚海收益转进 ${recommendedCatalogOffers.value.map(offer => offer.name).join('、')} 等目录项，避免瀚海利润继续停留在裸现金。`)
    }
    if (activeBossCycleOverview.value) {
      recommendedActions.push(`当前首领「${activeBossCycleOverview.value.label}」更适合承接 ${questBoardBiasProfile.value.preferredMarketCategories.join(' / ')} 相关委托，可反向提升告示板质量。`)
    }

    return {
      themeWeekFocus: currentThemeWeekHanhaiFocus.value,
      linkedVillageProjects: linkedVillageProjects.value,
      featuredRouteInvestments: featuredRouteInvestments.value,
      featuredCaravanContracts: featuredCaravanContracts.value,
      featuredRelicSets: featuredRelicSets.value,
      activeBossCycle: activeBossCycleOverview.value,
      activeShopRotation: activeShopRotationOverview.value,
      questBoardBiasProfile: questBoardBiasProfile.value,
      recommendedCatalogOffers: recommendedCatalogOffers.value,
      recommendedActions: dedupeList(recommendedActions).slice(0, hanhaiDisplayConfig.recommendedActionLimit)
    }
  })

  const resolveProgressTier = (): HanhaiProgressTier => {
    const completedCollectionCount = Object.values(cycleState.value.setCollections).filter(collection => collection.completed).length
    const activeInvestmentCount = Object.keys(cycleState.value.routeInvestments).length
    if (
      completedCollectionCount >= hanhaiProgressionConfig.tierUnlockSetCompletionCountP2 ||
      totalRelicClears.value >= hanhaiProgressionConfig.tierUnlockRelicClearsP2
    ) return 'P2'
    if (
      activeInvestmentCount >= hanhaiProgressionConfig.tierUnlockInvestmentCountP1 ||
      totalRelicClears.value >= hanhaiProgressionConfig.tierUnlockRelicClearsP1 ||
      unlocked.value
    ) return 'P1'
    return 'P0'
  }

  const mergeProgressTier = (left: HanhaiProgressTier, right: HanhaiProgressTier): HanhaiProgressTier => {
    const rank = { P0: 0, P1: 1, P2: 2 } as const
    return rank[left] >= rank[right] ? left : right
  }

  const resolveBossCycleId = (weekOfSeason: number) => {
    const bossCycleIds = hanhaiProgressionConfig.bossCycleOrder.filter(bossId =>
      ALL_HANHAI_BOSS_CYCLE_DEFS.some(def => def.id === bossId)
    )
    return bossCycleIds[Math.max(0, Math.min(bossCycleIds.length - 1, weekOfSeason - 1))] ?? bossCycleIds[0]!
  }

  const syncCycleStateToCurrentWeek = () => {
    const weekInfo = getCurrentWeekInfo()
    cycleState.value = {
      ...cycleState.value,
      progressTier: mergeProgressTier(cycleState.value.progressTier, resolveProgressTier()),
      bossCycleId: resolveBossCycleId(weekInfo.weekOfSeason),
      lastWeeklyResetDayTag: cycleState.value.lastWeeklyResetDayTag || getCurrentDayTag()
    }
  }

  const unlockHanhai = (): { success: boolean; message: string } => {
    const lockId = 'unlock_hanhai'
    if (!beginHanhaiAction(lockId)) return { success: false, message: '瀚海商路正在开通中，请勿重复点击。' }

    const snapshots = createHanhaiActionSnapshots()
    const playerStore = usePlayerStore()
    try {
      if (unlocked.value) return { success: false, message: '瀚海已经解锁。' }
      if (!playerStore.spendMoney(HANHAI_UNLOCK_COST)) {
        return { success: false, message: `金钱不足（需要${HANHAI_UNLOCK_COST}文）。` }
      }
      unlocked.value = true
      syncCycleStateToCurrentWeek()
      addLog('修通了前往瀚海的商路！新的冒险等待着你。')
      return { success: true, message: '瀚海商路已开通！' }
    } catch {
      rollbackHanhaiAction(snapshots)
      return { success: false, message: '瀚海商路开通失败，已回滚，请稍后再试。' }
    } finally {
      finishHanhaiAction(lockId)
    }
  }

  const investInRoute = (routeId: string): { success: boolean; message: string } => {
    const lockId = `invest_route:${routeId}`
    if (!beginHanhaiAction(lockId)) return { success: false, message: '该商路投资正在处理中，请勿重复点击。' }

    const snapshots = createHanhaiActionSnapshots()
    try {
      const route = ALL_HANHAI_ROUTE_INVESTMENTS.find(entry => entry.id === routeId)
      if (!route) return { success: false, message: '商路不存在。' }
      if (!unlocked.value) return { success: false, message: '瀚海尚未开通。' }
      if (!isTierUnlocked(route.unlockTier)) return { success: false, message: `${route.label} 尚未解锁。` }
      if (cycleState.value.routeInvestments[routeId]) return { success: false, message: `${route.label} 已在运转中。` }

      const playerStore = usePlayerStore()
      if (!playerStore.spendMoney(route.costMoney)) {
        return { success: false, message: '金钱不足。' }
      }

      updateCycleState({
        routeInvestments: {
          ...cycleState.value.routeInvestments,
          [routeId]: {
            routeId,
            totalInvested: route.costMoney,
            tripsCompleted: 0
          }
        }
      })
      refreshProgressTier()
      addLog(`【瀚海】已向「${route.label}」投入 ${route.costMoney} 文，商路开始运转。`, {
        category: 'hanhai',
        tags: ['hanhai_route_investment', 'late_game_cycle'],
        meta: { routeId, costMoney: route.costMoney }
      })
      return { success: true, message: `已投入${route.costMoney}文，${route.label}开始运转。` }
    } catch {
      rollbackHanhaiAction(snapshots)
      return { success: false, message: '商路投资失败，已回滚，请稍后再试。' }
    } finally {
      finishHanhaiAction(lockId)
    }
  }

  const getWeeklyRemaining = (itemId: string): number => {
    const item = HANHAI_SHOP_ITEMS.find(i => i.itemId === itemId)
    const weeklyLimit = getScaledShopWeeklyLimit(item?.weeklyLimit)
    if (weeklyLimit === undefined) return Infinity
    return Math.max(0, weeklyLimit - (weeklyPurchases.value[itemId] ?? 0))
  }

  const buyShopItem = (itemId: string): { success: boolean; message: string } => {
    const lockId = `buy_shop_item:${itemId}`
    if (!beginHanhaiAction(lockId)) return { success: false, message: '该瀚海商品正在结算中，请勿重复点击。' }

    const snapshots = createHanhaiActionSnapshots()
    try {
      const item = HANHAI_SHOP_ITEMS.find(i => i.itemId === itemId)
      if (!item) return { success: false, message: '商品不存在。' }
      const weeklyLimit = getScaledShopWeeklyLimit(item.weeklyLimit)
      if (weeklyLimit !== undefined && (weeklyPurchases.value[itemId] ?? 0) >= weeklyLimit) {
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

      for (const cost of extraCosts) {
        if (!inventoryStore.removeItemAnywhere(cost.itemId, cost.quantity)) {
          rollbackHanhaiAction(snapshots)
          return { success: false, message: `${getItemName(cost.itemId)}不足，无法兑换${item.name}。` }
        }
      }

      if (!inventoryStore.addItemsExact(rewardItems)) {
        rollbackHanhaiAction(snapshots)
        return { success: false, message: '背包已满，无法购买。' }
      }

      weeklyPurchases.value[itemId] = (weeklyPurchases.value[itemId] ?? 0) + 1
      return { success: true, message: `购买了${item.name}${quantity > 1 ? `×${quantity}` : ''}。` }
    } catch {
      rollbackHanhaiAction(snapshots)
      return { success: false, message: '瀚海商店结算失败，已回滚，请稍后再试。' }
    } finally {
      finishHanhaiAction(lockId)
    }
  }

  const getRelicRecord = (siteId: string): HanhaiRelicRecord => {
    return relicRecords.value[siteId] ?? { siteId, clears: 0, claimedMilestone: false }
  }

  const getRelicRemaining = (siteId: string): number => {
    const site = ALL_HANHAI_RELIC_SITES.find(entry => entry.id === siteId)
    if (!site) return 0
    return Math.max(0, site.weeklyLimit - getRelicRecord(siteId).clears)
  }

  const exploreRelicSite = (siteId: string): { success: boolean; message: string } => {
    const lockId = `explore_relic:${siteId}`
    if (!beginHanhaiAction(lockId)) return { success: false, message: '该遗迹正在勘探处理中，请勿重复点击。' }

    const snapshots = createHanhaiActionSnapshots()
    try {
      const site = ALL_HANHAI_RELIC_SITES.find(entry => entry.id === siteId)
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
        rollbackHanhaiAction(snapshots)
        return { success: false, message: '背包空间不足，暂时无法探索。' }
      }

      if (site.rewards.money) {
        playerStore.earnMoney(Math.floor(site.rewards.money * hanhaiRewardConfig.relicExploreMoneyMultiplier), { countAsEarned: false })
      }
      if (rewardItems.length > 0) {
        inventoryStore.addItemsExact(rewardItems)
      }

      relicRecords.value[siteId] = {
        ...getRelicRecord(siteId),
        siteId,
        clears: getRelicRecord(siteId).clears + 1
      }
      let completedSetLabel = ''
      const nextSetCollections = { ...cycleState.value.setCollections }
      for (const setDef of ALL_HANHAI_RELIC_SET_DEFS) {
        if (!setDef.requiredRelicTags.includes(site.relicTag)) continue
        const currentState = nextSetCollections[setDef.id] ?? {
          setId: setDef.id,
          collectedRelicTags: [],
          completed: false
        }
        const collectedRelicTags = dedupeList([...currentState.collectedRelicTags, site.relicTag])
        const completed = setDef.requiredRelicTags.every(tag => collectedRelicTags.includes(tag))
        nextSetCollections[setDef.id] = {
          setId: setDef.id,
          collectedRelicTags,
          completed
        }
        if (completed && !currentState.completed) {
          completedSetLabel = setDef.label
        }
      }
      updateCycleState({ setCollections: nextSetCollections })
      refreshProgressTier()
      const explorationSummary = completedSetLabel
        ? `你探索了${site.name}，带回了${site.relicTag}与一批异域收获，并完成了套组「${completedSetLabel}」。`
        : `你探索了${site.name}，带回了${site.relicTag}与一批异域收获。`
      addLog(explorationSummary, {
        category: 'hanhai',
        tags: ['hanhai_relic_exploration'],
        meta: {
          siteId,
          clears: relicRecords.value[siteId]?.clears ?? 0,
          completedSetLabel: completedSetLabel || undefined
        }
      })
      return { success: true, message: `探索${site.name}成功。` }
    } catch {
      rollbackHanhaiAction(snapshots)
      return { success: false, message: '遗迹勘探结算失败，已回滚，请稍后再试。' }
    } finally {
      finishHanhaiAction(lockId)
    }
  }

  const claimRelicMilestone = (siteId: string): { success: boolean; message: string } => {
    const lockId = `claim_relic_milestone:${siteId}`
    if (!beginHanhaiAction(lockId)) return { success: false, message: '该驻点奖励正在结算中，请勿重复点击。' }

    const snapshots = createHanhaiActionSnapshots()
    try {
      const site = ALL_HANHAI_RELIC_SITES.find(entry => entry.id === siteId)
      if (!site) return { success: false, message: '遗迹不存在。' }

      const record = getRelicRecord(siteId)
      if (record.claimedMilestone) return { success: false, message: '已领取过驻点奖励。' }
      if (record.clears < site.weeklyLimit) return { success: false, message: '还未完成本周全部勘探。' }

      const inventoryStore = useInventoryStore()
      const rewardItems = [{
        itemId: 'hanhai_map',
        quantity: Math.max(0, Math.floor(hanhaiRewardConfig.relicMilestoneMapRewardQuantity)),
        quality: 'normal' as const
      }].filter(item => item.quantity > 0)
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
    } catch {
      rollbackHanhaiAction(snapshots)
      return { success: false, message: '驻点奖励结算失败，已回滚，请稍后再试。' }
    } finally {
      finishHanhaiAction(lockId)
    }
  }

  const useTreasureMap = (): { success: boolean; message: string; rewards: { name: string; quantity: number }[] } => {
    const lockId = 'use_treasure_map'
    if (!beginHanhaiAction(lockId)) return { success: false, message: '藏宝图寻宝正在结算中，请勿重复点击。', rewards: [] }

    const snapshots = createHanhaiActionSnapshots()
    try {
      const inventoryStore = useInventoryStore()
      const bundle = pickWeightedRewardBundle(HANHAI_TREASURE_MAP_REWARDS)
      if (!bundle) {
        return { success: false, message: '藏宝图奖励配置缺失。', rewards: [] }
      }

      const itemRewards = resolveBundleItemEntries(bundle.rewards)
      if (itemRewards.length > 0 && !inventoryStore.canAddItems(itemRewards)) {
        return { success: false, message: '背包空间不足，暂时无法使用藏宝图。', rewards: [] }
      }
      if (!inventoryStore.removeItem('hanhai_map')) {
        return { success: false, message: '没有藏宝图。', rewards: [] }
      }

      const rewardSummary = grantRewardBundle({
        ...bundle.rewards,
        money: Math.floor((bundle.rewards.money ?? 0) * hanhaiRewardConfig.treasureMapMoneyMultiplier)
      }, { ticketSource: 'hanhai_treasure_map' })
      const rewardTexts = summarizeGrantedRewards(rewardSummary)
      const rewards: { name: string; quantity: number }[] = []
      if (rewardSummary.money > 0) {
        rewards.push({ name: `${rewardSummary.money}文`, quantity: 1 })
      }
      rewards.push(...rewardSummary.items.map(item => ({ name: item.name, quantity: item.quantity })))
      rewards.push(...rewardSummary.tickets.map(ticket => ({ name: ticket.name, quantity: ticket.quantity })))

      const rewardText = rewardTexts.grantedTexts.join('、') || bundle.label
      const skippedText = rewardTexts.skippedTexts.length > 0 ? ` 背包已满，未带走${rewardTexts.skippedTexts.join('、')}。` : ''
      addLog(`使用藏宝图寻宝，发现了：${rewardText}！${skippedText}`, {
        category: 'hanhai',
        tags: ['hanhai_treasure_map'],
        meta: { rewardCount: rewards.length, moneyReward: rewardSummary.money, rewardBundleId: bundle.id }
      })
      return {
        success: true,
        message: `寻宝成功！获得：${rewardText}${skippedText}`,
        rewards
      }
    } catch {
      rollbackHanhaiAction(snapshots)
      return { success: false, message: '藏宝图结算失败，已回滚，请稍后再试。', rewards: [] }
    } finally {
      finishHanhaiAction(lockId)
    }
  }

  const playRoulette = (betTier: number): { success: boolean; message: string; multiplier: number; winnings: number } => {
    const lockId = 'casino_roulette'
    if (!beginHanhaiAction(lockId)) return { success: false, message: '轮盘结算中，请勿重复点击。', multiplier: 0, winnings: 0 }

    const snapshots = createHanhaiActionSnapshots()
    try {
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
      const settlement = settleCasinoRewards('roulette', outcome.multiplier > 0 ? 'win' : 'lose', Math.floor(betTier * outcome.multiplier))
      const winnings = settlement.directMoney

      if (outcome.multiplier === 0) {
        const extraText = settlement.rewardTexts.grantedTexts.length > 0 ? ` 安慰收获：${settlement.rewardTexts.grantedTexts.join('、')}。` : ''
        const skippedText = settlement.rewardTexts.skippedTexts.length > 0 ? ` 背包已满，未带走${settlement.rewardTexts.skippedTexts.join('、')}。` : ''
        addLog(`轮盘停在了"${outcome.label}"，损失了${betTier}文。${extraText}${skippedText}`)
      } else {
        const extraRewardTexts = settlement.rewardTexts.grantedTexts.filter(text => text !== `${winnings}文`)
        const extraText = extraRewardTexts.length > 0 ? ` 另得${extraRewardTexts.join('、')}。` : ''
        const skippedText = settlement.rewardTexts.skippedTexts.length > 0 ? ` 背包已满，未带走${settlement.rewardTexts.skippedTexts.join('、')}。` : ''
        addLog(`轮盘停在了"${outcome.label}"！按赌坊折算赢得${winnings}文！${extraText}${skippedText}`)
      }
      return { success: true, message: `轮盘停在了"${outcome.label}"`, multiplier: outcome.multiplier, winnings }
    } catch {
      rollbackHanhaiAction(snapshots)
      return { success: false, message: '轮盘结算失败，已回滚，请稍后再试。', multiplier: 0, winnings: 0 }
    } finally {
      finishHanhaiAction(lockId)
    }
  }

  const playDice = (
    guessBig: boolean
  ): { success: boolean; message: string; dice1: number; dice2: number; won: boolean; winnings: number } => {
    const lockId = 'casino_dice'
    if (!beginHanhaiAction(lockId)) return { success: false, message: '骰子结算中，请勿重复点击。', dice1: 0, dice2: 0, won: false, winnings: 0 }

    const snapshots = createHanhaiActionSnapshots()
    try {
      if (!canBet.value) return { success: false, message: '今天的赌博次数已用完。', dice1: 0, dice2: 0, won: false, winnings: 0 }
      const playerStore = usePlayerStore()
      if (!playerStore.spendMoney(DICE_BET_AMOUNT)) {
        return { success: false, message: '金钱不足。', dice1: 0, dice2: 0, won: false, winnings: 0 }
      }
      casinoBetsToday.value++
      const result = rollDice()
      const won = guessBig === result.isBig
      const settlement = settleCasinoRewards('dice', won ? 'win' : 'lose', won ? DICE_BET_AMOUNT * 2 : 0)
      const winnings = settlement.directMoney
      const guessText = guessBig ? '大' : '小'
      const resultText = result.isBig ? '大' : '小'
      if (won) {
        const extraRewardTexts = settlement.rewardTexts.grantedTexts.filter(text => text !== `${winnings}文`)
        const extraText = extraRewardTexts.length > 0 ? ` 另得${extraRewardTexts.join('、')}。` : ''
        const skippedText = settlement.rewardTexts.skippedTexts.length > 0 ? ` 背包已满，未带走${settlement.rewardTexts.skippedTexts.join('、')}。` : ''
        addLog(`骰子${result.dice1}+${result.dice2}=${result.total}（${resultText}），你猜${guessText}——按赌坊折算赢了${winnings}文！${extraText}${skippedText}`)
      } else {
        const extraText = settlement.rewardTexts.grantedTexts.length > 0 ? ` 安慰收获：${settlement.rewardTexts.grantedTexts.join('、')}。` : ''
        addLog(`骰子${result.dice1}+${result.dice2}=${result.total}（${resultText}），你猜${guessText}——输了${DICE_BET_AMOUNT}文。${extraText}`)
      }
      return { success: true, message: won ? '赢了！' : '输了…', dice1: result.dice1, dice2: result.dice2, won, winnings }
    } catch {
      rollbackHanhaiAction(snapshots)
      return { success: false, message: '骰子结算失败，已回滚，请稍后再试。', dice1: 0, dice2: 0, won: false, winnings: 0 }
    } finally {
      finishHanhaiAction(lockId)
    }
  }

  const playCup = (guess: number): { success: boolean; message: string; correctCup: number; won: boolean; winnings: number } => {
    const lockId = 'casino_cup'
    if (!beginHanhaiAction(lockId)) return { success: false, message: '猜杯结算中，请勿重复点击。', correctCup: 0, won: false, winnings: 0 }

    const snapshots = createHanhaiActionSnapshots()
    try {
      if (!canBet.value) return { success: false, message: '今天的赌博次数已用完。', correctCup: 0, won: false, winnings: 0 }
      const playerStore = usePlayerStore()
      if (!playerStore.spendMoney(CUP_BET_AMOUNT)) {
        return { success: false, message: '金钱不足。', correctCup: 0, won: false, winnings: 0 }
      }
      casinoBetsToday.value++
      const result = playCupRound()
      const won = guess === result.correctCup
      const settlement = settleCasinoRewards('cup', won ? 'win' : 'lose', won ? Math.floor(CUP_BET_AMOUNT * CUP_WIN_MULTIPLIER) : 0)
      const winnings = settlement.directMoney
      if (won) {
        const extraRewardTexts = settlement.rewardTexts.grantedTexts.filter(text => text !== `${winnings}文`)
        const extraText = extraRewardTexts.length > 0 ? ` 另得${extraRewardTexts.join('、')}。` : ''
        const skippedText = settlement.rewardTexts.skippedTexts.length > 0 ? ` 背包已满，未带走${settlement.rewardTexts.skippedTexts.join('、')}。` : ''
        addLog(`猜杯猜中了第${guess + 1}号杯！按赌坊折算赢得${winnings}文！${extraText}${skippedText}`)
      } else {
        const extraText = settlement.rewardTexts.grantedTexts.length > 0 ? ` 留下了${settlement.rewardTexts.grantedTexts.join('、')}。` : ''
        addLog(`猜杯猜错了，球在第${result.correctCup + 1}号杯下，损失了${CUP_BET_AMOUNT}文。${extraText}`)
      }
      return { success: true, message: won ? '猜中了！' : '猜错了…', correctCup: result.correctCup, won, winnings }
    } catch {
      rollbackHanhaiAction(snapshots)
      return { success: false, message: '猜杯结算失败，已回滚，请稍后再试。', correctCup: 0, won: false, winnings: 0 }
    } finally {
      finishHanhaiAction(lockId)
    }
  }

  const playCricketFight = (
    cricketId: string
  ): { success: boolean; message: string; playerPower: number; opponentPower: number; won: boolean; draw: boolean; winnings: number } => {
    const lockId = 'casino_cricket'
    if (!beginHanhaiAction(lockId)) {
      return { success: false, message: '斗蛐蛐结算中，请勿重复点击。', playerPower: 0, opponentPower: 0, won: false, draw: false, winnings: 0 }
    }

    const snapshots = createHanhaiActionSnapshots()
    try {
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
      const settlement = settleCasinoRewards('cricket', won ? 'win' : draw ? 'draw' : 'lose', won ? Math.floor(CRICKET_BET_AMOUNT * CRICKET_WIN_MULTIPLIER) : draw ? CRICKET_BET_AMOUNT : 0)
      const winnings = settlement.directMoney
      if (won) {
        const extraRewardTexts = settlement.rewardTexts.grantedTexts.filter(text => text !== `${winnings}文`)
        const extraText = extraRewardTexts.length > 0 ? ` 另得${extraRewardTexts.join('、')}。` : ''
        addLog(`斗蛐蛐（${cricketId}）：力量${result.playerPower}对${result.opponentPower}，大获全胜！按赌坊折算赢得${winnings}文！${extraText}`)
      } else if (draw) {
        const extraRewardTexts = settlement.rewardTexts.grantedTexts.filter(text => text !== `${winnings}文`)
        const extraText = extraRewardTexts.length > 0 ? ` 另得${extraRewardTexts.join('、')}。` : ''
        addLog(`斗蛐蛐（${cricketId}）：力量${result.playerPower}对${result.opponentPower}，平局，按赌坊折算退还${winnings}文。${extraText}`)
      } else {
        const extraText = settlement.rewardTexts.grantedTexts.length > 0 ? ` 安慰收获：${settlement.rewardTexts.grantedTexts.join('、')}。` : ''
        addLog(`斗蛐蛐（${cricketId}）：力量${result.playerPower}对${result.opponentPower}，败下阵来，损失${CRICKET_BET_AMOUNT}文。${extraText}`)
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
    } catch {
      rollbackHanhaiAction(snapshots)
      return { success: false, message: '斗蛐蛐结算失败，已回滚，请稍后再试。', playerPower: 0, opponentPower: 0, won: false, draw: false, winnings: 0 }
    } finally {
      finishHanhaiAction(lockId)
    }
  }

  const playCardFlip = (pick: number): { success: boolean; message: string; treasures: number[]; won: boolean; winnings: number } => {
    const lockId = 'casino_cardflip'
    if (!beginHanhaiAction(lockId)) return { success: false, message: '翻牌结算中，请勿重复点击。', treasures: [], won: false, winnings: 0 }

    const snapshots = createHanhaiActionSnapshots()
    try {
      if (!canBet.value) return { success: false, message: '今天的赌博次数已用完。', treasures: [], won: false, winnings: 0 }
      const playerStore = usePlayerStore()
      if (!playerStore.spendMoney(CARD_BET_AMOUNT)) {
        return { success: false, message: '金钱不足。', treasures: [], won: false, winnings: 0 }
      }
      casinoBetsToday.value++
      const result = dealCards()
      const won = result.treasures.includes(pick)
      const settlement = settleCasinoRewards('cardflip', won ? 'win' : 'lose', won ? Math.floor(CARD_BET_AMOUNT * CARD_WIN_MULTIPLIER) : 0)
      const winnings = settlement.directMoney
      if (won) {
        const extraRewardTexts = settlement.rewardTexts.grantedTexts.filter(text => text !== `${winnings}文`)
        const extraText = extraRewardTexts.length > 0 ? ` 另得${extraRewardTexts.join('、')}。` : ''
        addLog(`翻牌寻宝翻到了宝牌！按赌坊折算赢得${winnings}文！${extraText}`)
      } else {
        const extraText = settlement.rewardTexts.grantedTexts.length > 0 ? ` 安慰收获：${settlement.rewardTexts.grantedTexts.join('、')}。` : ''
        addLog(`翻牌寻宝翻到了空牌，损失了${CARD_BET_AMOUNT}文。${extraText}`)
      }
      return { success: true, message: won ? '翻到宝了！' : '空牌…', treasures: result.treasures, won, winnings }
    } catch {
      rollbackHanhaiAction(snapshots)
      return { success: false, message: '翻牌结算失败，已回滚，请稍后再试。', treasures: [], won: false, winnings: 0 }
    } finally {
      finishHanhaiAction(lockId)
    }
  }

  const startTexas = (tierId: TexasTierId): { success: boolean; message: string } & Partial<TexasSetup> => {
    const lockId = 'casino_texas_start'
    if (!beginHanhaiAction(lockId)) return { success: false, message: '瀚海扑克正在入场结算中，请勿重复点击。' }

    const snapshots = createHanhaiActionSnapshots()
    try {
      if (activeTexasSession.value && !activeTexasSession.value.settled) {
        return { success: false, message: '已有一局瀚海扑克尚未结算，请先完成当前牌局。' }
      }
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
      const hands = Array.from({ length: tier.rounds }, () => dealTexas()).map(hand => ({
        playerHole: hand.playerHole.map(card => ({ ...card })),
        dealerHole: hand.dealerHole.map(card => ({ ...card })),
        community: hand.community.map(card => ({ ...card }))
      }))
      const sessionId = createCasinoSessionId('texas')
      activeTexasSession.value = {
        sessionId,
        tierId,
        tierName: tier.name,
        entryFee: tier.entryFee,
        startedAtDayTag: getCurrentDayTag(),
        reserveMoney: playerStore.money,
        hands,
        settled: false
      }
      return {
        success: true,
        message: `${tier.name}开始！`,
        sessionId,
        reserveMoney: playerStore.money,
        hands,
        tier
      }
    } catch {
      rollbackHanhaiAction(snapshots)
      return { success: false, message: '瀚海扑克入场失败，已回滚，请稍后再试。' }
    } finally {
      finishHanhaiAction(lockId)
    }
  }

  const endTexas = (report: TexasSessionReport) => {
    const lockId = 'casino_texas_end'
    if (!beginHanhaiAction(lockId)) {
      addLog('瀚海扑克结算中，请勿重复提交结果。')
      return
    }

    const snapshots = createHanhaiActionSnapshots()
    try {
      const session = activeTexasSession.value
      if (!session || session.settled) {
        addLog('瀚海扑克结算失败：当前没有可结算的牌局。')
        return
      }
      if (!report?.sessionId || session.sessionId !== report.sessionId) {
        addLog('瀚海扑克结算失败：牌局凭证无效。')
        return
      }
      if (session.startedAtDayTag !== getCurrentDayTag()) {
        addLog('瀚海扑克结算失败：牌局已跨日失效。')
        activeTexasSession.value = null
        return
      }
      if (session.tierName !== report.tierName) {
        addLog('瀚海扑克结算失败：场次信息不匹配。')
        return
      }
      const tier = getTexasTier(session.tierId)
      const resolved = resolveTexasSessionOutcome(session, report)
      if (!resolved.valid) {
        addLog(`瀚海扑克结算失败：${resolved.reason ?? '对局轨迹校验失败'}。`)
        return
      }
      const normalizedFinalChips = Math.max(0, Math.floor(Number(resolved.finalChips) || 0))
      const totalInvested = Math.max(0, Math.floor(Number(resolved.totalInvested) || 0))
      const playerStore = usePlayerStore()
      const maxTheoreticalFinalChips = session.entryFee + totalInvested + tier.entryFee * tier.rounds
      if (normalizedFinalChips > maxTheoreticalFinalChips) {
        addLog(`瀚海扑克结算失败：筹码结果超出本局理论上限（上限 ${maxTheoreticalFinalChips}）。`)
        return
      }
      activeTexasSession.value = {
        ...session,
        settled: true
      }
      if (totalInvested > 0 && !playerStore.spendMoney(totalInvested)) {
        addLog('瀚海扑克结算失败：场外补注扣款失败。')
        activeTexasSession.value = null
        return
      }
      const trigger: HanhaiCasinoRewardTrigger = normalizedFinalChips > tier.entryFee ? 'win' : normalizedFinalChips > 0 ? 'draw' : 'lose'
      const settlement = settleCasinoRewards('texas', trigger, normalizedFinalChips)
      const extraRewardTexts = settlement.rewardTexts.grantedTexts.filter(text => text !== `${settlement.directMoney}文`)
      const extraText = extraRewardTexts.length > 0 ? ` 另得${extraRewardTexts.join('、')}。` : ''
      const skippedText = settlement.rewardTexts.skippedTexts.length > 0 ? ` 背包已满，未带走${settlement.rewardTexts.skippedTexts.join('、')}。` : ''
      addLog(`瀚海扑克（${report.tierName}）结束，按赌坊折算结算${settlement.directMoney}文。${extraText}${skippedText}`)
      activeTexasSession.value = null
    } catch {
      rollbackHanhaiAction(snapshots)
      activeTexasSession.value = null
      addLog('瀚海扑克结算失败，已自动回滚。')
    } finally {
      finishHanhaiAction(lockId)
    }
  }

  const startBuckshot = (): { success: boolean; message: string } & Partial<BuckshotSetup> => {
    const lockId = 'casino_buckshot_start'
    if (!beginHanhaiAction(lockId)) return { success: false, message: '恶魔轮盘正在入场结算中，请勿重复点击。' }

    const snapshots = createHanhaiActionSnapshots()
    try {
      if (activeBuckshotSession.value && !activeBuckshotSession.value.settled) {
        return { success: false, message: '已有一局恶魔轮盘尚未结算，请先完成当前赌局。' }
      }
      if (!canBet.value) return { success: false, message: '今天的赌博次数已用完。' }
      const playerStore = usePlayerStore()
      if (!playerStore.spendMoney(BUCKSHOT_BET_AMOUNT)) {
        return { success: false, message: '金钱不足。' }
      }
      casinoBetsToday.value++
      const sessionId = createCasinoSessionId('buckshot')
      const shells = loadShotgun()
      const playerFirst = Math.random() < 0.5
      activeBuckshotSession.value = {
        sessionId,
        startedAtDayTag: getCurrentDayTag(),
        shells: [...shells],
        playerFirst,
        settled: false
      }
      return {
        success: true,
        message: '恶魔轮盘开始！',
        sessionId,
        shells,
        playerHP: BUCKSHOT_PLAYER_HP,
        dealerHP: BUCKSHOT_DEALER_HP,
        playerFirst
      }
    } catch {
      rollbackHanhaiAction(snapshots)
      return { success: false, message: '恶魔轮盘入场失败，已回滚，请稍后再试。' }
    } finally {
      finishHanhaiAction(lockId)
    }
  }

  const endBuckshot = (playerActions: BuckshotPlayerAction[], sessionId?: string) => {
    const lockId = 'casino_buckshot_end'
    if (!beginHanhaiAction(lockId)) {
      addLog('恶魔轮盘结算中，请勿重复提交结果。')
      return
    }

    const snapshots = createHanhaiActionSnapshots()
    try {
      const session = activeBuckshotSession.value
      if (!session || session.settled) {
        addLog('恶魔轮盘结算失败：当前没有可结算的赌局。')
        return
      }
      if (!sessionId || session.sessionId !== sessionId) {
        addLog('恶魔轮盘结算失败：赌局凭证无效。')
        return
      }
      if (session.startedAtDayTag !== getCurrentDayTag()) {
        addLog('恶魔轮盘结算失败：赌局已跨日失效。')
        activeBuckshotSession.value = null
        return
      }
      const outcome = resolveBuckshotOutcome(session, playerActions)
      if (!outcome.valid) {
        addLog(`恶魔轮盘结算失败：${outcome.reason ?? '操作轨迹校验失败'}。`)
        activeBuckshotSession.value = null
        return
      }
      activeBuckshotSession.value = {
        ...session,
        settled: true
      }
      const trigger: HanhaiCasinoRewardTrigger = outcome.won ? 'win' : outcome.draw ? 'draw' : 'lose'
      const baseReward = outcome.won ? BUCKSHOT_BET_AMOUNT * BUCKSHOT_WIN_MULTIPLIER : outcome.draw ? BUCKSHOT_BET_AMOUNT : 0
      const settlement = settleCasinoRewards('buckshot', trigger, baseReward)
      if (outcome.won) {
        const extraRewardTexts = settlement.rewardTexts.grantedTexts.filter(text => text !== `${settlement.directMoney}文`)
        const extraText = extraRewardTexts.length > 0 ? ` 另得${extraRewardTexts.join('、')}。` : ''
        addLog(`恶魔轮盘胜利！按赌坊折算赢得${settlement.directMoney}文！${extraText}`)
      } else if (outcome.draw) {
        const extraRewardTexts = settlement.rewardTexts.grantedTexts.filter(text => text !== `${settlement.directMoney}文`)
        const extraText = extraRewardTexts.length > 0 ? ` 另得${extraRewardTexts.join('、')}。` : ''
        addLog(`恶魔轮盘平局，按赌坊折算退还${settlement.directMoney}文。${extraText}`)
      } else {
        const extraText = settlement.rewardTexts.grantedTexts.length > 0 ? ` 安慰收获：${settlement.rewardTexts.grantedTexts.join('、')}。` : ''
        addLog(`恶魔轮盘落败，损失了${BUCKSHOT_BET_AMOUNT}文。${extraText}`)
      }
      activeBuckshotSession.value = null
    } catch {
      rollbackHanhaiAction(snapshots)
      activeBuckshotSession.value = null
      addLog('恶魔轮盘结算失败，已自动回滚。')
    } finally {
      finishHanhaiAction(lockId)
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
    weeklyPurchases: { ...weeklyPurchases.value },
    relicRecords: Object.fromEntries(
      Object.entries(relicRecords.value).map(([siteId, record]) => [siteId, { ...record }])
    ),
    cycleState: {
      ...cycleState.value,
      routeInvestments: Object.fromEntries(
        Object.entries(cycleState.value.routeInvestments).map(([routeId, state]) => [routeId, { ...state }])
      ),
      setCollections: Object.fromEntries(
        Object.entries(cycleState.value.setCollections).map(([setId, state]) => [
          setId,
          { ...state, collectedRelicTags: [...state.collectedRelicTags] }
        ])
      )
    },
    activeTexasSession: cloneActiveTexasSession(activeTexasSession.value),
    activeBuckshotSession: cloneActiveBuckshotSession(activeBuckshotSession.value)
  })

  const deserialize = (data: Partial<HanhaiSaveData>) => {
    unlocked.value = data?.unlocked ?? false
    casinoBetsToday.value = data?.casinoBetsToday ?? 0
    weeklyPurchases.value = { ...(data?.weeklyPurchases ?? {}) }
    relicRecords.value = Object.fromEntries(
      Object.entries(data?.relicRecords ?? {}).map(([siteId, record]) => [siteId, { ...record }])
    )
    hanhaiActionLocks.value = []
    cycleState.value = {
      saveVersion: data?.cycleState?.saveVersion ?? 1,
      progressTier: data?.cycleState?.progressTier ?? 'P0',
      routeInvestments: Object.fromEntries(
        Object.entries(data?.cycleState?.routeInvestments ?? {}).map(([routeId, state]) => [routeId, { ...state }])
      ),
      setCollections: Object.fromEntries(
        Object.entries(data?.cycleState?.setCollections ?? {}).map(([setId, state]) => [
          setId,
          { ...state, collectedRelicTags: [...(state.collectedRelicTags ?? [])] }
        ])
      ),
      bossCycleId: data?.cycleState?.bossCycleId ?? '',
      lastWeeklyResetDayTag: data?.cycleState?.lastWeeklyResetDayTag ?? ''
    }
    if (unlocked.value) syncCycleStateToCurrentWeek()
    activeTexasSession.value = cloneActiveTexasSession(data?.activeTexasSession)
    activeBuckshotSession.value = cloneActiveBuckshotSession(data?.activeBuckshotSession)
  }

  const reset = () => {
    unlocked.value = false
    casinoBetsToday.value = 0
    weeklyPurchases.value = {}
    relicRecords.value = {}
    activeTexasSession.value = null
    activeBuckshotSession.value = null
    hanhaiActionLocks.value = []
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
    activeTexasSession,
    activeBuckshotSession,
    hasActiveCasinoSession,
    totalRelicClears,
    currentThemeWeekHanhaiFocus,
    questBoardBiasProfile,
    crossSystemOverview,
    unlockHanhai,
    getWeeklyRemaining,
    getRelicSiteSummary,
    getShopItemSummary,
    updateCycleState,
    getDebugSnapshot,
    buyShopItem,
    investInRoute,
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
