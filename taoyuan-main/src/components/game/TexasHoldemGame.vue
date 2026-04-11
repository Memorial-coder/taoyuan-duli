<template>
  <div class="game-panel max-w-sm w-full">
    <Divider title class="!mb-1">瀚海扑克 · {{ tier.name }}</Divider>
    <div class="flex items-center justify-center space-x-2 mb-2">
      <span class="text-xs text-muted">第 {{ currentRound }}/{{ tier.rounds }} 手</span>
      <span class="text-xs text-muted">入场费 {{ tier.entryFee }}文</span>
      <span class="text-xs text-muted">抽水 {{ tier.rake }}文</span>
    </div>

    <!-- 底池 + 街 -->
    <div class="flex items-center justify-between mb-2">
      <span class="text-xs text-muted">{{ streetLabel }}</span>
      <span class="text-xs text-accent">底池: {{ pot }}</span>
    </div>

    <!-- 公共牌 -->
    <div class="mb-2">
      <p class="text-xs text-muted mb-1">公共牌</p>
      <div class="flex justify-center space-x-1">
        <span
          v-for="(card, i) in currentCommunity"
          :key="i"
          class="poker-card"
          :class="{
            'poker-card-hidden': !isCommunityVisible(i),
            'poker-card-red': isCommunityVisible(i) && isRedSuit(card.suit),
            'poker-card-reveal': isCommunityVisible(i)
          }"
        >
          <template v-if="isCommunityVisible(i)">
            <span class="poker-card-suit">{{ SUIT_LABELS[card.suit] }}</span>
            <span class="poker-card-rank">{{ RANK_LABELS[card.rank] }}</span>
          </template>
          <template v-else>?</template>
        </span>
      </div>
    </div>

    <!-- 玩家手牌 + 筹码 -->
    <div class="mb-2">
      <div class="flex items-center justify-between mb-1">
        <span class="text-xs text-muted">你的手牌</span>
        <span class="text-xs">筹码: {{ playerStack }}</span>
      </div>
      <div class="flex justify-center space-x-1">
        <span
          v-for="(card, i) in currentPlayerHole"
          :key="i"
          class="poker-card poker-card-reveal"
          :class="{ 'poker-card-red': isRedSuit(card.suit) }"
        >
          <span class="poker-card-suit">{{ SUIT_LABELS[card.suit] }}</span>
          <span class="poker-card-rank">{{ RANK_LABELS[card.rank] }}</span>
        </span>
      </div>
      <p v-if="playerHandResult" class="text-xs text-center mt-1 text-accent">{{ playerHandResult.label }}</p>
    </div>

    <!-- 庄家手牌 + 筹码 -->
    <div class="mb-2">
      <div class="flex items-center justify-between mb-1">
        <span class="text-xs text-muted">庄家手牌</span>
        <span class="text-xs">筹码: {{ dealerStack }}</span>
      </div>
      <div class="flex justify-center space-x-1">
        <span
          v-for="(card, i) in currentDealerHole"
          :key="i"
          class="poker-card"
          :class="{
            'poker-card-hidden': !showDealerCards,
            'poker-card-red': showDealerCards && isRedSuit(card.suit),
            'poker-card-reveal': showDealerCards
          }"
        >
          <template v-if="showDealerCards">
            <span class="poker-card-suit">{{ SUIT_LABELS[card.suit] }}</span>
            <span class="poker-card-rank">{{ RANK_LABELS[card.rank] }}</span>
          </template>
          <template v-else>?</template>
        </span>
      </div>
      <p v-if="dealerHandResult" class="text-xs text-center mt-1 text-accent">{{ dealerHandResult.label }}</p>
    </div>

    <!-- 操作按钮 -->
    <div v-if="!handOver && isPlayerTurn && !animating" class="flex flex-wrap space-x-1 mb-2">
      <template v-if="toCall <= 0">
        <Button class="flex-1 justify-center" @click="doCheck">过牌</Button>
        <Button
          v-if="!dealerAllIn && playerStack >= tier.blind * 2"
          class="flex-1 justify-center"
          @click="doRaise(playerBetRound + tier.blind * 2)"
        >
          加注{{ tier.blind * 2 }}
        </Button>
        <Button
          v-if="!dealerAllIn && playerStack >= tier.blind * 4"
          class="flex-1 justify-center"
          @click="doRaise(playerBetRound + tier.blind * 4)"
        >
          加注{{ tier.blind * 4 }}
        </Button>
      </template>
      <template v-else>
        <Button class="flex-1 justify-center" @click="doCall">跟注{{ toCall }}</Button>
        <Button v-if="!dealerAllIn && playerStack > toCall" class="flex-1 justify-center" @click="doRaise(dealerBetRound + tier.blind * 2)">
          加注{{ toCall + tier.blind * 2 }}
        </Button>
      </template>
      <Button v-if="!dealerAllIn" class="flex-1 justify-center" @click="doAllIn">全押</Button>
      <Button class="flex-1 justify-center text-danger" @click="doFold">弃牌</Button>
    </div>

    <!-- 庄家思考中 -->
    <p v-if="!handOver && !isPlayerTurn && animating" class="text-xs text-muted/40 text-center mb-2">庄家思考中…</p>

    <!-- 日志 -->
    <div class="border border-accent/10 rounded-xs p-2 mb-2 max-h-24 overflow-y-auto" ref="logRef">
      <p v-for="(msg, i) in actionLog" :key="i" class="text-xs text-muted leading-relaxed">{{ msg }}</p>
    </div>

    <!-- 最终结算 -->
    <template v-if="sessionOver && finalResult">
      <div class="border border-accent/10 rounded-xs p-3 text-center mb-2">
        <p class="text-sm" :class="finalResult.won ? 'text-success' : finalResult.draw ? 'text-accent' : 'text-danger'">
          {{ finalResult.won ? '你赢了！' : finalResult.draw ? '不赚不亏' : '你输了…' }}
        </p>
        <p class="text-xs mt-0.5" :class="finalResult.netProfit >= 0 ? 'text-success' : 'text-danger'">
          {{ finalResult.netProfit >= 0 ? '+' + finalResult.netProfit + '文' : finalResult.netProfit + '文' }}
        </p>
        <p class="text-xs text-muted mt-0.5">荷官小费 {{ tier.rake }}文</p>
        <p class="text-xs text-muted mt-0.5">共 {{ currentRound }} 手 · 最终筹码 {{ playerStack }}</p>
      </div>
      <Button class="w-full justify-center" @click="emit('complete', playerStack, tier.name)">确定</Button>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, nextTick } from 'vue'
  import { SUIT_LABELS, RANK_LABELS, evaluateBestHand, compareHands, texasDealerAI, dealTexas } from '@/data/hanhai'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import { sfxChipBet, sfxFoldCards, sfxCardFlip, sfxCasinoWin, sfxCasinoLose } from '@/composables/useAudio'
  import Button from '@/components/game/Button.vue'
  import Divider from '@/components/game/Divider.vue'
  import type { TexasSetup, TexasStreet, PokerSuit, PokerHandResult, PokerCard } from '@/types'

  const playerStore = usePlayerStore()

  const props = defineProps<{ setup: TexasSetup }>()
  const emit = defineEmits<{ complete: [finalChips: number, tierName: string] }>()

  const tier = props.setup.tier

  // === 多手牌管理 ===
  const currentRound = ref(1)
  const currentPlayerHole = ref<PokerCard[]>(props.setup.playerHole)
  const currentDealerHole = ref<PokerCard[]>(props.setup.dealerHole)
  const currentCommunity = ref<PokerCard[]>(props.setup.community)

  // === 单手牌状态 ===
  const street = ref<TexasStreet>('preflop')
  const playerStack = ref(tier.entryFee)
  const dealerStack = ref(tier.entryFee)
  const pot = ref(0)
  const playerBetRound = ref(0)
  const dealerBetRound = ref(0)
  const isPlayerTurn = ref(true)
  const animating = ref(false)
  const handOver = ref(false)
  const handResult = ref<'won' | 'draw' | 'lost' | null>(null)
  const playerFolded = ref(false)
  const dealerFolded = ref(false)
  const playerAllIn = ref(false)
  const dealerAllIn = ref(false)
  const showDealerCards = ref(false)
  const playerHandResult = ref<PokerHandResult | null>(null)
  const dealerHandResult = ref<PokerHandResult | null>(null)
  const sessionOver = ref(false)
  const finalResult = ref<{ won: boolean; draw: boolean; netProfit: number } | null>(null)
  const totalInvested = ref(0) // 场外累计投入（不含初始入场费）
  const actionLog = ref<string[]>([])
  const logRef = ref<HTMLElement | null>(null)

  const toCall = computed(() => Math.max(0, dealerBetRound.value - playerBetRound.value))

  const streetLabel = computed(() => {
    const labels: Record<TexasStreet, string> = {
      preflop: '翻牌前',
      flop: '翻牌',
      turn: '转牌',
      river: '河牌',
      showdown: '摊牌'
    }
    return labels[street.value]
  })

  const isRedSuit = (suit: PokerSuit) => suit === 'heart' || suit === 'diamond'

  const isCommunityVisible = (index: number) => {
    if (street.value === 'showdown') return true
    if (index < 3) return street.value === 'flop' || street.value === 'turn' || street.value === 'river'
    if (index === 3) return street.value === 'turn' || street.value === 'river'
    return street.value === 'river'
  }

  const visibleCommunity = computed(() => {
    const s = street.value
    if (s === 'preflop') return []
    if (s === 'flop') return currentCommunity.value.slice(0, 3)
    if (s === 'turn') return currentCommunity.value.slice(0, 4)
    return currentCommunity.value.slice(0, 5)
  })

  const addActionLog = (msg: string) => {
    actionLog.value.push(msg)
    void nextTick(() => {
      if (logRef.value) logRef.value.scrollTop = logRef.value.scrollHeight
    })
  }

  /** 将筹码从一方移入底池 */
  const betFromPlayer = (amount: number) => {
    const actual = Math.min(amount, playerStack.value)
    playerStack.value -= actual
    playerBetRound.value += actual
    if (playerStack.value <= 0) playerAllIn.value = true
    return actual
  }

  const betFromDealer = (amount: number) => {
    const actual = Math.min(amount, dealerStack.value)
    dealerStack.value -= actual
    dealerBetRound.value += actual
    if (dealerStack.value <= 0) dealerAllIn.value = true
    return actual
  }

  /** 收集本轮下注到底池（处理不等额all-in退还多余筹码） */
  const collectBets = () => {
    const pBet = playerBetRound.value
    const dBet = dealerBetRound.value
    const matched = Math.min(pBet, dBet)
    pot.value += matched * 2

    // 退还多余的筹码
    if (pBet > matched) {
      const refund = pBet - matched
      playerStack.value += refund
    }
    if (dBet > matched) {
      const refund = dBet - matched
      dealerStack.value += refund
    }

    playerBetRound.value = 0
    dealerBetRound.value = 0
  }

  /** 进入下一街 */
  const advanceStreet = () => {
    collectBets()
    const order: TexasStreet[] = ['preflop', 'flop', 'turn', 'river', 'showdown']
    const idx = order.indexOf(street.value)
    if (idx >= 3 || street.value === 'river') {
      doShowdown()
      return
    }
    street.value = order[idx + 1]!
    sfxCardFlip()
    addActionLog(`—— ${streetLabel.value} ——`)

    if (playerAllIn.value || dealerAllIn.value) {
      setTimeout(() => advanceStreet(), 600)
      return
    }

    isPlayerTurn.value = true
  }

  /** 检查本轮是否结束 */
  const checkRoundEnd = (playerActed: boolean) => {
    const pBet = playerBetRound.value
    const dBet = dealerBetRound.value
    // 下注匹配，或下注少的一方已all-in（无法再加）
    const settled = pBet === dBet || (pBet < dBet && playerAllIn.value) || (dBet < pBet && dealerAllIn.value)

    if (settled) {
      advanceStreet()
      return
    }

    // 还需要对方行动
    if (playerActed) {
      isPlayerTurn.value = false
      animating.value = true
      setTimeout(() => dealerTurn(), 800)
    } else {
      isPlayerTurn.value = true
      animating.value = false
    }
  }

  // === 玩家操作 ===

  const doCheck = () => {
    sfxChipBet()
    addActionLog('你过牌')
    isPlayerTurn.value = false
    animating.value = true
    setTimeout(() => dealerTurn(), 800)
  }

  const doCall = () => {
    const amount = betFromPlayer(toCall.value)
    sfxChipBet()
    addActionLog(`你跟注 ${amount}`)
    checkRoundEnd(true)
  }

  const doRaise = (total: number) => {
    const needed = total - playerBetRound.value
    const amount = betFromPlayer(needed)
    sfxChipBet()
    addActionLog(`你加注 ${amount}`)
    isPlayerTurn.value = false
    animating.value = true
    setTimeout(() => dealerTurn(), 800)
  }

  const doAllIn = () => {
    const amount = betFromPlayer(playerStack.value)
    sfxChipBet()
    addActionLog(`你全押 ${amount}`)
    playerAllIn.value = true
    isPlayerTurn.value = false
    animating.value = true
    setTimeout(() => dealerTurn(), 800)
  }

  const doFold = () => {
    sfxFoldCards()
    addActionLog('你弃牌')
    playerFolded.value = true
    collectBets()
    endHand('lost')
  }

  // === 庄家AI ===

  const dealerTurn = () => {
    const decision = texasDealerAI(
      currentDealerHole.value,
      visibleCommunity.value,
      street.value,
      pot.value + playerBetRound.value + dealerBetRound.value,
      dealerStack.value,
      playerBetRound.value,
      dealerBetRound.value,
      playerAllIn.value,
      tier.blind
    )

    if (decision.action === 'fold') {
      sfxFoldCards()
      addActionLog('庄家弃牌')
      dealerFolded.value = true
      collectBets()
      animating.value = false
      endHand('won')
      return
    }

    if (decision.action === 'check') {
      sfxChipBet()
      addActionLog('庄家过牌')
      animating.value = false
      checkRoundEnd(false)
      return
    }

    if (decision.action === 'call') {
      const callAmt = playerBetRound.value - dealerBetRound.value
      const amount = betFromDealer(callAmt)
      sfxChipBet()
      addActionLog(`庄家跟注 ${amount}`)
      animating.value = false
      checkRoundEnd(false)
      return
    }

    if (decision.action === 'allin') {
      const amount = betFromDealer(dealerStack.value)
      sfxChipBet()
      addActionLog(`庄家全押 ${amount}`)
      dealerAllIn.value = true
      animating.value = false
      if (dealerBetRound.value > playerBetRound.value && !playerAllIn.value) {
        isPlayerTurn.value = true
      } else {
        checkRoundEnd(false)
      }
      return
    }

    // raise
    const amount = betFromDealer(decision.amount)
    sfxChipBet()
    addActionLog(`庄家加注 ${amount}`)
    animating.value = false
    isPlayerTurn.value = true
  }

  // === Showdown ===

  const doShowdown = () => {
    street.value = 'showdown'
    showDealerCards.value = true
    sfxCardFlip()
    addActionLog('—— 摊牌 ——')

    const allCards = currentCommunity.value
    const pHand = evaluateBestHand([...currentPlayerHole.value, ...allCards])
    const dHand = evaluateBestHand([...currentDealerHole.value, ...allCards])
    playerHandResult.value = pHand
    dealerHandResult.value = dHand

    addActionLog(`你: ${pHand.label}`)
    addActionLog(`庄家: ${dHand.label}`)

    const cmp = compareHands(pHand, dHand)
    const result = cmp > 0 ? 'won' : cmp === 0 ? 'draw' : 'lost'

    setTimeout(() => endHand(result), 800)
  }

  // === 单手结算 ===

  const endHand = (result: 'won' | 'draw' | 'lost') => {
    handOver.value = true
    if (dealerFolded.value || playerFolded.value) {
      showDealerCards.value = true
    }

    // 筹码结算：赢家拿走底池
    if (result === 'won') {
      playerStack.value += pot.value
      sfxCasinoWin()
      addActionLog(`你赢了本手！获得底池 ${pot.value}`)
    } else if (result === 'draw') {
      const half = Math.floor(pot.value / 2)
      playerStack.value += half
      dealerStack.value += pot.value - half
      addActionLog(`平局，底池平分`)
    } else {
      dealerStack.value += pot.value
      sfxCasinoLose()
      addActionLog(`你输了本手，庄家获得底池 ${pot.value}`)
    }
    pot.value = 0
    handResult.value = result

    // 检查是否已打完所有手数，或玩家筹码+场外资金都不够继续
    const playerBroke = playerStack.value <= 0 && playerStore.money <= 0
    if (playerBroke || currentRound.value >= tier.rounds) {
      endSession()
    } else {
      // 还有剩余手数，自动开始下一手
      setTimeout(() => startNextHand(), 1000)
    }
  }

  // === 开始下一手 ===

  const startNextHand = () => {
    currentRound.value++
    const deal = dealTexas()
    currentPlayerHole.value = deal.playerHole
    currentDealerHole.value = deal.dealerHole
    currentCommunity.value = deal.community
    sfxCardFlip()

    // 庄家筹码不足时补充到入场费
    if (dealerStack.value < tier.blind * 2) {
      const refill = tier.entryFee - dealerStack.value
      dealerStack.value = tier.entryFee
      addActionLog(`庄家补充筹码 ${refill}`)
    }

    // 玩家筹码不足时，从场外资金补充
    if (playerStack.value < tier.blind * 2) {
      const needed = tier.entryFee - playerStack.value
      const canAfford = Math.min(needed, playerStore.money)
      if (canAfford > 0) {
        playerStore.spendMoney(canAfford)
        playerStack.value += canAfford
        totalInvested.value += canAfford
        addActionLog(`从场外补充筹码 ${canAfford}`)
      }
    }

    // 重置单手状态
    street.value = 'preflop'
    pot.value = 0
    playerBetRound.value = 0
    dealerBetRound.value = 0
    isPlayerTurn.value = true
    animating.value = false
    handOver.value = false
    handResult.value = null
    playerFolded.value = false
    dealerFolded.value = false
    playerAllIn.value = false
    dealerAllIn.value = false
    showDealerCards.value = false
    playerHandResult.value = null
    dealerHandResult.value = null

    // 下盲注
    betFromPlayer(tier.blind)
    betFromDealer(tier.blind)
    collectBets()
    addActionLog(`—— 第 ${currentRound.value} 手 ——`)
    addActionLog(`双方各下盲注 ${tier.blind}`)
    addActionLog('—— 翻牌前 ——')
    isPlayerTurn.value = true
  }

  // === 整场结算 ===

  const endSession = () => {
    sessionOver.value = true
    // netProfit: 最终筹码 - 初始入场费 - 场外补充 (不含抽水，抽水已在store扣除)
    const net = playerStack.value - tier.entryFee - totalInvested.value
    const won = net > 0
    const draw = net === 0

    finalResult.value = { won, draw, netProfit: net }

    if (won) {
      addActionLog(`场次结束！你赢了！净赚 ${net}`)
    } else if (draw) {
      addActionLog(`场次结束！不赚不亏`)
    } else {
      addActionLog(`场次结束！你输了…净亏 ${Math.abs(net)}`)
    }
  }

  // === 初始化 ===

  onMounted(() => {
    betFromPlayer(tier.blind)
    betFromDealer(tier.blind)
    collectBets()
    addActionLog(`—— 第 1 手 ——`)
    addActionLog(`双方各下盲注 ${tier.blind}`)
    addActionLog('—— 翻牌前 ——')
    isPlayerTurn.value = true
  })
</script>

<style scoped>
  .poker-card {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 3rem;
    border: 1px solid rgba(200, 164, 92, 0.3);
    border-radius: 2px;
    font-weight: bold;
    transition: all 0.3s;
  }

  .poker-card-suit {
    position: absolute;
    top: 2px;
    left: 3px;
    font-size: 0.55rem;
    line-height: 1;
  }

  .poker-card-rank {
    font-size: 0.85rem;
    line-height: 1;
  }

  .poker-card-hidden {
    background: rgba(200, 164, 92, 0.08);
    color: var(--color-muted);
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
  }

  .poker-card-reveal {
    background: rgba(232, 228, 217, 0.08);
    color: rgb(var(--color-text));
    animation: poker-flip 0.4s ease;
  }

  .poker-card-red {
    color: var(--color-danger);
  }

  @keyframes poker-flip {
    0% {
      transform: scaleX(0);
    }
    50% {
      transform: scaleX(0);
    }
    100% {
      transform: scaleX(1);
    }
  }
</style>
