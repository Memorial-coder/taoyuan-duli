import { ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  NpcState,
  FriendshipLevel,
  RelationshipStage,
  HeartEventDef,
  Quality,
  ChildState,
  PregnancyState,
  PregnancyStage,
  ProposalResponse,
  FarmHelperTask,
  HiredHelper
} from '@/types'
import { NPCS, getNpcById, getHeartEventsForNpc, RECIPES, getTodayEvent } from '@/data'
import { WEATHER_TIPS, getFortuneTip, getLivingTip, getRecipeTipMessage, NO_RECIPE_TIP, TIP_NPC_IDS } from '@/data/npcTips'
import {
  getNpcBenefitSummaries,
  getNpcGiftReturn,
  getNpcGiftReturnSummaries,
  getNpcNextBenefitSummaries,
  getNpcNextScheduleText,
  getNpcScheduleStatus,
  getNpcScheduleTimeline,
  getNpcShopDiscount,
  getRelationshipStageFromState,
  getRelationshipStageLabel,
  NPC_RELATIONSHIP_BENEFITS,
  RELATIONSHIP_STAGE_META
} from '@/data/npcWorld'
import { getItemById } from '@/data/items'
import { useInventoryStore } from './useInventoryStore'
import { useGameStore } from './useGameStore'
import { usePlayerStore } from './usePlayerStore'
import { useCookingStore } from './useCookingStore'
import { useFarmStore } from './useFarmStore'
import { useAnimalStore } from './useAnimalStore'
import { useFishPondStore } from './useFishPondStore'
import { useDecorationStore } from './useDecorationStore'
import { harvestFarmPlotWithRewards } from '@/composables/useFarmHarvest'

/** 好感度上限：未婚 2500（10心），已婚 4000；美观度≥100额外+250 */
const getFriendshipCap = (state: { married: boolean }, beautyCapBonus = 0): number =>
  (state.married ? 4000 : 2500) + beautyCapBonus

/** 好感等级阈值 (10心制, 每心250点, 上限2500) */
const FRIENDSHIP_THRESHOLDS: { level: FriendshipLevel; min: number }[] = [
  { level: 'bestFriend', min: 2000 },
  { level: 'friendly', min: 1000 },
  { level: 'acquaintance', min: 500 },
  { level: 'stranger', min: 0 }
]

export const useNpcStore = defineStore('npc', () => {
  const validNpcIds = new Set(NPCS.map(npc => npc.id))

  const buildDefaultNpcState = (npcId: string): NpcState => ({
    npcId,
    friendship: 0,
    talkedToday: false,
    giftedToday: false,
    giftsThisWeek: 0,
    dating: false,
    married: false,
    zhiji: false,
    triggeredHeartEvents: [],
    unlockedPerks: []
  })

  const npcStates = ref<NpcState[]>(
    NPCS.map(npc => buildDefaultNpcState(npc.id))
  )

  /** 每日提示NPC是否已给过提示 */
  const tipGivenToday = ref<Record<string, boolean>>({})

  /** 子女列表 */
  const children = ref<ChildState[]>([])

  /** 子女ID自增计数器（避免释放后ID冲突） */
  const nextChildId = ref<number>(0)

  /** 结婚天数计数 */
  const daysMarried = ref<number>(0)

  /** 知己天数计数 */
  const daysZhiji = ref<number>(0)

  /** 孕期状态（null = 无孕期） */
  const pregnancy = ref<PregnancyState | null>(null)

  /** 配偶是否已提议要孩子（等待玩家回应） */
  const childProposalPending = ref<boolean>(false)

  /** 提议被拒绝次数（影响再次提议冷却） */
  const childProposalDeclinedCount = ref<number>(0)

  /** 距上次拒绝/等待的天数 */
  const daysSinceProposalDecline = ref<number>(0)

  /** 婚礼倒计时 (0=无婚礼待举行) */
  const weddingCountdown = ref<number>(0)

  /** 婚礼对象NPC ID */
  const weddingNpcId = ref<string | null>(null)

  /** 已获得的建筑/生活线索 */
  const relationshipClues = ref<{ npcId: string; clueId: string; text: string }[]>([])

  // ============================================================
  // 雇工系统
  // ============================================================

  const hiredHelpers = ref<HiredHelper[]>([])
  const MAX_HELPERS = 2

  /** 雇工日薪 */
  const HELPER_WAGES: Record<FarmHelperTask, number> = {
    water: 100,
    feed: 150,
    harvest: 200,
    weed: 100
  }

  /** 雇工任务名称 */
  const HELPER_TASK_NAMES: Record<FarmHelperTask, string> = {
    water: '浇水',
    feed: '喂食',
    harvest: '收获',
    weed: '除草除虫'
  }

  /** 可雇佣的NPC列表（好感>=1000 且 未被雇佣 且 非配偶/知己） */
  const getHireableNpcs = (): { npcId: string; name: string; friendship: number }[] => {
    return npcStates.value
      .filter(s => {
        if (s.friendship < 1000) return false
        if (s.married || s.zhiji) return false
        if (hiredHelpers.value.some(h => h.npcId === s.npcId)) return false
        return true
      })
      .map(s => {
        const def = getNpcById(s.npcId)
        return { npcId: s.npcId, name: def?.name ?? s.npcId, friendship: s.friendship }
      })
  }

  /** 雇佣NPC */
  const hireHelper = (npcId: string, task: FarmHelperTask): { success: boolean; message: string } => {
    const state = getNpcState(npcId)
    if (!state) return { success: false, message: 'NPC不存在。' }
    if (state.friendship < 1000) return { success: false, message: '好感度不足（需要4心/1000）。' }
    if (state.married || state.zhiji) return { success: false, message: '伴侣和知己不可雇佣。' }
    if (hiredHelpers.value.length >= MAX_HELPERS) return { success: false, message: `最多雇佣${MAX_HELPERS}名帮手。` }
    if (hiredHelpers.value.some(h => h.npcId === npcId)) return { success: false, message: '此人已被雇佣。' }

    const npcDef = getNpcById(npcId)
    const name = npcDef?.name ?? npcId
    hiredHelpers.value.push({ npcId, task, dailyWage: HELPER_WAGES[task] })
    return { success: true, message: `${name}开始帮你${HELPER_TASK_NAMES[task]}了！(日薪${HELPER_WAGES[task]}文)` }
  }

  /** 解雇 */
  const dismissHelper = (npcId: string): { success: boolean; message: string } => {
    const idx = hiredHelpers.value.findIndex(h => h.npcId === npcId)
    if (idx < 0) return { success: false, message: '此人未被雇佣。' }

    const npcDef = getNpcById(npcId)
    const name = npcDef?.name ?? npcId
    hiredHelpers.value.splice(idx, 1)
    return { success: true, message: `${name}已离开。` }
  }

  /** 每日雇工结算（useEndDay调用） */
  const processDailyHelpers = (taskFilter?: FarmHelperTask[]): { messages: string[]; dismissedNpcs: string[]; allFed: boolean } => {
    const playerStore = usePlayerStore()
    const farmStore = useFarmStore()
    const animalStore = useAnimalStore()
    const messages: string[] = []
    const dismissed: string[] = []
    let allFed = false

    for (const helper of [...hiredHelpers.value]) {
      // 按任务类型过滤
      if (taskFilter && !taskFilter.includes(helper.task)) continue

      const npcDef = getNpcById(helper.npcId)
      const name = npcDef?.name ?? '雇工'
      const state = getNpcState(helper.npcId)

      // 已变为配偶/知己 → 自动解雇（不收工资）
      if (state && (state.married || state.zhiji)) {
        hiredHelpers.value = hiredHelpers.value.filter(h => h.npcId !== helper.npcId)
        messages.push(`${name}已成为你的${state.married ? '伴侣' : '知己'}，不再担任雇工。`)
        dismissed.push(helper.npcId)
        continue
      }

      const efficiency = state && state.friendship >= 2000 ? 1.5 : 1.0

      // 扣工资
      if (!playerStore.spendMoney(helper.dailyWage)) {
        hiredHelpers.value = hiredHelpers.value.filter(h => h.npcId !== helper.npcId)
        messages.push(`付不起${name}的工资，${name}不干了。`)
        dismissed.push(helper.npcId)
        continue
      }

      switch (helper.task) {
        case 'water': {
          const unwatered = farmStore.plots.filter(p => (p.state === 'planted' || p.state === 'growing') && !p.watered)
          const count = Math.min(unwatered.length, Math.floor(4 * efficiency) + Math.floor(Math.random() * 3))
          for (let i = 0; i < count; i++) farmStore.waterPlot(unwatered[i]!.id)
          if (count > 0) messages.push(`${name}帮你浇了${count}块地。(-${helper.dailyWage}文)`)
          else messages.push(`${name}今天没什么可浇的。(-${helper.dailyWage}文)`)
          break
        }
        case 'feed': {
          const result = animalStore.feedAll()
          const fishPondStore = useFishPondStore()
          const fedFish = fishPondStore.pond.built && !fishPondStore.pond.fedToday ? fishPondStore.feedFish() : false
          allFed = result.noFeedCount === 0 && result.fedCount > 0
          if (result.fedCount > 0 && fedFish) {
            messages.push(`${name}帮你喂了${result.fedCount}只牲畜和鱼塘的鱼。(-${helper.dailyWage}文)`)
          } else if (result.fedCount > 0) {
            messages.push(`${name}帮你喂了${result.fedCount}只牲畜。(-${helper.dailyWage}文)`)
          } else if (fedFish) {
            messages.push(`${name}帮你喂了鱼塘的鱼。(-${helper.dailyWage}文)`)
          } else if (result.noFeedCount > 0) {
            messages.push(`${name}发现草料不足，${result.noFeedCount}只牲畜未能喂食。(-${helper.dailyWage}文)`)
          } else {
            messages.push(`${name}今天没什么需要喂的。(-${helper.dailyWage}文)`)
          }
          break
        }
        case 'harvest': {
          const harvestable = farmStore.plots.filter(p => p.state === 'harvestable')
          const count = Math.min(harvestable.length, Math.floor(5 * efficiency))
          let harvested = 0
          for (let i = 0; i < count; i++) {
            const targetPlot = harvestable[i]!
            const result = harvestFarmPlotWithRewards(targetPlot.id, { qualityOverride: 'normal' })
            if (result.success) harvested += result.harvestedPlots
          }
          if (harvested > 0) messages.push(`${name}帮你收了${harvested}块地的庄稼。(-${helper.dailyWage}文)`)
          else messages.push(`${name}今天没什么可收的。(-${helper.dailyWage}文)`)
          break
        }
        case 'weed': {
          let cleared = 0
          for (const plot of farmStore.plots) {
            if (plot.weedy) {
              farmStore.clearWeed(plot.id)
              cleared++
            }
            if (plot.infested) {
              farmStore.curePest(plot.id)
              cleared++
            }
          }
          if (cleared > 0) messages.push(`${name}清理了${cleared}处杂草和虫害。(-${helper.dailyWage}文)`)
          else messages.push(`${name}今天田里挺干净的。(-${helper.dailyWage}文)`)
          break
        }
      }
    }
    return { messages, dismissedNpcs: dismissed, allFed }
  }

  /** 子女名字池（按性别） */
  const CHILD_NAMES_MALE = ['小龙', '小宝', '团子', '年年']
  const CHILD_NAMES_FEMALE = ['小凤', '阿花', '豆豆', '圆圆']

  /** 获取NPC状态 */
  const getNpcState = (npcId: string): NpcState | undefined => {
    return npcStates.value.find(s => s.npcId === npcId)
  }

  /** 获取好感等级 */
  const getFriendshipLevel = (npcId: string): FriendshipLevel => {
    const state = getNpcState(npcId)
    if (!state) return 'stranger'
    for (const t of FRIENDSHIP_THRESHOLDS) {
      if (state.friendship >= t.min) return t.level
    }
    return 'stranger'
  }

  /** 获取更完整的关系阶段 */
  const getRelationshipStage = (npcId: string): RelationshipStage => {
    const state = getNpcState(npcId)
    if (!state) return 'recognize'
    const hasChild = state.married && children.value.length > 0 && getSpouse()?.npcId === npcId
    return getRelationshipStageFromState(state.friendship, {
      dating: state.dating,
      married: state.married,
      zhiji: state.zhiji,
      hasChild
    })
  }

  const getRelationshipStageText = (npcId: string): string => getRelationshipStageLabel(getRelationshipStage(npcId))

  const getRelationshipStageDescription = (npcId: string): string => RELATIONSHIP_STAGE_META[getRelationshipStage(npcId)].description

  const getRelationshipBenefits = (npcId: string): string[] => {
    return getNpcBenefitSummaries(npcId, getRelationshipStage(npcId))
  }

  const getRelationshipGiftReturnSummaries = (npcId: string): string[] => {
    return getNpcGiftReturnSummaries(npcId, getRelationshipStage(npcId))
  }

  const getNextRelationshipBenefits = (npcId: string): string[] => {
    return getNpcNextBenefitSummaries(npcId, getRelationshipStage(npcId))
  }

  const getRelationshipCluesForNpc = (npcId: string) => {
    return relationshipClues.value.filter(clue => clue.npcId === npcId)
  }

  const getShopDiscountBonus = (npcId: string): number => {
    return getNpcShopDiscount(npcId, getRelationshipStage(npcId))
  }

  const addRelationshipClue = (npcId: string, clueId: string, text: string): boolean => {
    if (relationshipClues.value.some(clue => clue.clueId === clueId)) return false
    relationshipClues.value.push({ npcId, clueId, text })
    return true
  }

  const getScheduleStatus = (npcId: string) => {
    const gameStore = useGameStore()
    const todayEvent = getTodayEvent(gameStore.season, gameStore.day)

    return getNpcScheduleStatus(npcId, {
      season: gameStore.season,
      day: gameStore.day,
      hour: gameStore.hour,
      weather: gameStore.weather,
      festivalId: todayEvent?.id ?? null
    })
  }

  const getScheduleTimeline = (npcId: string) => {
    const gameStore = useGameStore()
    const todayEvent = getTodayEvent(gameStore.season, gameStore.day)

    return getNpcScheduleTimeline(npcId, {
      season: gameStore.season,
      day: gameStore.day,
      hour: gameStore.hour,
      weather: gameStore.weather,
      festivalId: todayEvent?.id ?? null
    })
  }

  const getNextScheduleText = (npcId: string): string | null => {
    const gameStore = useGameStore()
    const todayEvent = getTodayEvent(gameStore.season, gameStore.day)

    return getNpcNextScheduleText(npcId, {
      season: gameStore.season,
      day: gameStore.day,
      hour: gameStore.hour,
      weather: gameStore.weather,
      festivalId: todayEvent?.id ?? null
    })
  }

  /** 同步关系奖励（兼容旧存档缺字段；返回提示日志） */
  const syncRelationshipPerks = (
    targetNpcId?: string,
    options: { grantInventoryRewards?: boolean; emitMessages?: boolean } = {}
  ): string[] => {
    const inventoryStore = useInventoryStore()
    const cookingStore = useCookingStore()
    const grantInventoryRewards = options.grantInventoryRewards ?? true
    const emitMessages = options.emitMessages ?? true
    const messages: string[] = []
    const targets = targetNpcId ? npcStates.value.filter(state => state.npcId === targetNpcId) : npcStates.value

    for (const state of targets) {
      state.unlockedPerks = state.unlockedPerks ?? []
      const stage = getRelationshipStage(state.npcId)
      const npcName = getNpcById(state.npcId)?.name ?? state.npcId
      const benefits = NPC_RELATIONSHIP_BENEFITS.filter(benefit => benefit.npcId === state.npcId)
      for (const benefit of benefits) {
        const stageReached = getRelationshipStageFromState(state.friendship, {
          dating: state.dating,
          married: state.married,
          zhiji: state.zhiji,
          hasChild: state.married && children.value.length > 0 && getSpouse()?.npcId === state.npcId
        })
        if (state.unlockedPerks.includes(benefit.id)) continue
        const reached = ['recognize', 'familiar', 'friend', 'bestie', 'romance', 'married', 'family'].indexOf(stageReached) >=
          ['recognize', 'familiar', 'friend', 'bestie', 'romance', 'married', 'family'].indexOf(benefit.minStage)
        if (!reached) continue

        let shouldMarkUnlocked = false

        if (benefit.type === 'recipe' && benefit.recipeId) {
          shouldMarkUnlocked = true
          const recipeUnlocked = cookingStore.unlockRecipe(benefit.recipeId)
          if (emitMessages) {
            messages.push(recipeUnlocked ? `${npcName}愿意把新的食谱教给你了。` : `${npcName}正式认可了你们的交情。`)
          }
        }

        else if (benefit.type === 'item' && benefit.itemReward) {
          if (!grantInventoryRewards) continue
          if (!inventoryStore.canAddItem(benefit.itemReward.itemId, benefit.itemReward.quantity)) {
            if (emitMessages) {
              const itemName = getItemById(benefit.itemReward.itemId)?.name ?? benefit.itemReward.itemId
              messages.push(`${npcName}想送你${itemName}×${benefit.itemReward.quantity}，但背包空间不足。`)
            }
            continue
          }
          if (!inventoryStore.addItemExact(benefit.itemReward.itemId, benefit.itemReward.quantity)) continue
          shouldMarkUnlocked = true
          if (emitMessages) {
            const itemName = getItemById(benefit.itemReward.itemId)?.name ?? benefit.itemReward.itemId
            messages.push(`${npcName}送来了${itemName}×${benefit.itemReward.quantity}。`)
          }
        }

        else if (benefit.type === 'clue' && benefit.clueText) {
          shouldMarkUnlocked = true
          if (addRelationshipClue(state.npcId, benefit.id, benefit.clueText) && emitMessages) {
            messages.push(`${npcName}向你透露了一条新的生活线索。`)
          }
        }

        else if (benefit.type === 'shop_discount') {
          shouldMarkUnlocked = true
          if (emitMessages) messages.push(`${npcName}把你当自己人了：${benefit.summary}。`)
        }

        else if (benefit.type === 'quest_unlock') {
          shouldMarkUnlocked = true
          if (emitMessages) messages.push(`${npcName}开始愿意把更私人的委托交给你。`)
        }

        if (shouldMarkUnlocked) state.unlockedPerks.push(benefit.id)
      }

      const stageLabel = RELATIONSHIP_STAGE_META[stage].label
      const stageMarker = `stage:${state.npcId}:${stage}`
      if (!state.unlockedPerks.includes(stageMarker)) {
        state.unlockedPerks.push(stageMarker)
        if (emitMessages && stage !== 'recognize') {
          messages.push(`${npcName}和你的关系进入了「${stageLabel}」阶段。`)
        }
      }
    }

    return messages
  }

  /** 检查NPC今天是否生日 */
  const isBirthday = (npcId: string): boolean => {
    const npcDef = getNpcById(npcId)
    if (!npcDef?.birthday) return false
    const gameStore = useGameStore()
    return npcDef.birthday.season === gameStore.season && npcDef.birthday.day === gameStore.day
  }

  /** 获取今天过生日的NPC (null if none) */
  const getTodayBirthdayNpc = (): string | null => {
    const gameStore = useGameStore()
    for (const npc of NPCS) {
      if (npc.birthday && npc.birthday.season === gameStore.season && npc.birthday.day === gameStore.day) {
        return npc.id
      }
    }
    return null
  }

  /** 检查是否有可触发的心事件（对话后调用） */
  const checkHeartEvent = (npcId: string): HeartEventDef | null => {
    const state = getNpcState(npcId)
    if (!state) return null
    const events = getHeartEventsForNpc(npcId)
    for (const event of events) {
      // 知己事件仅知己触发
      if (event.requiresZhiji && !state.zhiji) continue
      // 已婚后不再触发普通婚前心事件
      if (state.married && !event.requiresZhiji) continue
      // 知己不触发恋爱告白（heart_8）
      if (!event.requiresZhiji && state.zhiji && event.id.endsWith('_heart_8')) continue
      if (state.friendship >= event.requiredFriendship && !state.triggeredHeartEvents.includes(event.id)) {
        return event
      }
    }
    return null
  }

  /** 标记心事件为已触发 */
  const markHeartEventTriggered = (npcId: string, eventId: string) => {
    const state = getNpcState(npcId)
    if (state && !state.triggeredHeartEvents.includes(eventId)) {
      state.triggeredHeartEvents.push(eventId)
    }
  }

  /** 调整好感度（心事件选择结果） */
  const adjustFriendship = (npcId: string, amount: number): string[] => {
    const state = getNpcState(npcId)
    if (state) {
      state.friendship = Math.min(Math.max(0, state.friendship + amount), getFriendshipCap(state))
      return syncRelationshipPerks(npcId)
    }
    return []
  }

  /** 替换对话中的占位符 */
  const replaceDialoguePlaceholders = (text: string): string => {
    const playerStore = usePlayerStore()
    return text.replace(/\{player\}/g, playerStore.playerName).replace(/\{title\}/g, playerStore.honorific)
  }

  /** 与NPC对话 (+20好感) */
  const talkTo = (npcId: string): { message: string; friendshipGain: number; unlockedMessages?: string[] } | null => {
    const state = getNpcState(npcId)
    if (!state) return null
    if (state.talkedToday) return null

    state.talkedToday = true
    state.friendship = Math.min(state.friendship + 20, getFriendshipCap(state))
    const unlockedMessages = syncRelationshipPerks(npcId)

    const npcDef = getNpcById(npcId)
    if (!npcDef) return null

    const scheduleStatus = getScheduleStatus(npcId)
    if (scheduleStatus.specialDialogue) {
      return { message: replaceDialoguePlaceholders(scheduleStatus.specialDialogue), friendshipGain: 20, unlockedMessages }
    }

    // 已婚NPC有特殊对话
    if (state.married) {
      const playerStore = usePlayerStore()
      const gameStore = useGameStore()
      const name = playerStore.playerName

      const marriedDialogues = [
        `${name}，今天辛苦了，早点回来吃饭。`,
        `我给${name}留了饭菜，还热着呢。`,
        '田里的活干完了吗？别太累了。',
        `有${name}在身边，每天都很开心。`,
        '今天想吃什么？我去准备。',
        '家里收拾好了，你歇会儿吧。',
        `和${name}在一起的日子，真好。`,
        `${name}，今天精神不错嘛。`
      ]

      const seasonDialogues: Record<string, string[]> = {
        spring: [`春天到了，院子里的花都开了呢。`, `${name}，春播忙完了吗？`],
        summer: [`好热啊……${name}多喝水。`, '夏天的西瓜最解暑了。'],
        autumn: [`秋天的风真舒服。${name}，要不要一起散步？`, '丰收的季节，辛苦种的东西都有了回报。'],
        winter: [`外面好冷，${name}快进屋暖和暖和。`, '冬天就该窝在家里喝热茶。']
      }

      const weatherDialogues: Record<string, string | null> = {
        rainy: '下雨了，田里不用浇水，在家歇歇吧。',
        stormy: '外面风雨好大，今天别出远门了。',
        snowy: '下雪了呢，外面白茫茫的，真好看。',
        windy: '风好大，出门小心别着凉了。',
        sunny: null,
        cloudy: null,
        green_rain: null
      }

      const pool = [...marriedDialogues, ...(seasonDialogues[gameStore.season] ?? [])]
      const weatherLine = weatherDialogues[gameStore.weather]
      if (weatherLine) pool.push(weatherLine)

      const message = pool[Math.floor(Math.random() * pool.length)]!
      return { message, friendshipGain: 20, unlockedMessages }
    }

    // 知己NPC使用知己专属对话
    if (state.zhiji && npcDef.zhijiDialogues?.length) {
      const raw = npcDef.zhijiDialogues[Math.floor(Math.random() * npcDef.zhijiDialogues.length)]!
      const message = replaceDialoguePlaceholders(raw)
      return { message, friendshipGain: 20, unlockedMessages }
    }

    // 约会中NPC使用约会对话
    if (state.dating && npcDef.datingDialogues && npcDef.datingDialogues.length > 0) {
      const raw = npcDef.datingDialogues[Math.floor(Math.random() * npcDef.datingDialogues.length)]!
      const message = replaceDialoguePlaceholders(raw)
      return { message, friendshipGain: 20, unlockedMessages }
    }

    const level = getFriendshipLevel(npcId)
    const dialogues = npcDef.dialogues[level]
    const raw = dialogues[Math.floor(Math.random() * dialogues.length)]!
    const message = replaceDialoguePlaceholders(raw)

    return { message, friendshipGain: 20, unlockedMessages }
  }

  /** 送礼给NPC (每天1次, 每周2次) */
  const giveGift = (
    npcId: string,
    itemId: string,
    giftBonusMultiplier: number = 1,
    quality: Quality = 'normal'
  ): { gain: number; reaction: string; returnedGift?: { itemId: string; quantity: number; summary: string }; unlockedMessages?: string[] } | null => {
    const state = getNpcState(npcId)
    if (!state) return null
    if (state.giftedToday) return null
    if (state.giftsThisWeek >= 2) return null

    const inventoryStore = useInventoryStore()
    if (!inventoryStore.removeItem(itemId, 1, quality)) return null

    state.giftedToday = true
    state.giftsThisWeek++
    const npcDef = getNpcById(npcId)
    if (!npcDef) return null

    let gain: number
    let reaction: string

    if (npcDef.lovedItems.includes(itemId)) {
      gain = 80
      reaction = '非常喜欢'
    } else if (npcDef.likedItems.includes(itemId)) {
      gain = 45
      reaction = '还不错'
    } else if (npcDef.hatedItems.includes(itemId)) {
      gain = -40
      reaction = '讨厌'
    } else {
      gain = 20
      reaction = '一般'
    }

    // 品质加成
    const qualityMultiplier: Record<Quality, number> = { normal: 1.0, fine: 1.25, excellent: 1.5, supreme: 2.0 }
    // 生日加成 (4倍)
    const birthdayMultiplier = isBirthday(npcId) ? 4 : 1

    gain = Math.floor(gain * qualityMultiplier[quality] * birthdayMultiplier * giftBonusMultiplier)
    state.friendship = Math.min(Math.max(0, state.friendship + gain), getFriendshipCap(state))
    const unlockedMessages = syncRelationshipPerks(npcId)
    const giftReturn = getNpcGiftReturn(npcId, getRelationshipStage(npcId))
    const returnedGift =
      giftReturn && inventoryStore.canAddItem(giftReturn.itemId, giftReturn.quantity)
        ? (inventoryStore.addItemExact(giftReturn.itemId, giftReturn.quantity)
            ? { itemId: giftReturn.itemId, quantity: giftReturn.quantity, summary: giftReturn.summary }
            : undefined)
        : undefined
    if (giftReturn && !returnedGift) {
      unlockedMessages.push('背包空间不足，未能收下对方回礼。')
    }

    return {
      gain,
      reaction,
      returnedGift,
      unlockedMessages
    }
  }

  /** 赠帕开启约会 (需2000好感/8心) */
  const startDating = (npcId: string): { success: boolean; message: string; unlockedMessages?: string[] } => {
    const state = getNpcState(npcId)
    if (!state) return { success: false, message: 'NPC不存在。' }

    const npcDef = getNpcById(npcId)
    if (!npcDef?.marriageable) return { success: false, message: '无法与此人约会。' }

    const playerStore = usePlayerStore()
    if (npcDef.gender === playerStore.gender) {
      return { success: false, message: '只能向异性赠帕。' }
    }

    if (state.dating) return { success: false, message: '你们已经在约会了。' }
    if (state.married) return { success: false, message: '你们已经结婚了。' }
    if (npcStates.value.some(s => s.married)) return { success: false, message: '你已经结婚了。' }
    if (state.friendship < 2000) return { success: false, message: '好感度不足（需要8心/2000）。' }

    const inventoryStore = useInventoryStore()
    if (!inventoryStore.removeItem('silk_ribbon')) {
      return { success: false, message: '需要一条丝帕。' }
    }

    state.dating = true
    state.friendship = Math.min(state.friendship + 160, getFriendshipCap(state))
    return {
      success: true,
      message: `${npcDef.name}羞红了脸，接过了你的丝帕……你们开始约会了！`,
      unlockedMessages: syncRelationshipPerks(npcId)
    }
  }

  /** 求婚 (需2500好感/10心) */
  const propose = (npcId: string): { success: boolean; message: string; unlockedMessages?: string[] } => {
    const state = getNpcState(npcId)
    if (!state) return { success: false, message: 'NPC不存在。' }

    const npcDef = getNpcById(npcId)
    if (!npcDef?.marriageable) return { success: false, message: '这个人无法求婚。' }

    // 只允许异性求婚
    const playerStore = usePlayerStore()
    if (npcDef.gender === playerStore.gender) {
      return { success: false, message: '只能向异性求婚。' }
    }

    // 检查是否已有配偶
    const alreadyMarried = npcStates.value.some(s => s.married)
    if (alreadyMarried) return { success: false, message: '你已经结婚了。' }

    // 检查是否正在筹备婚礼
    if (weddingCountdown.value > 0) return { success: false, message: '婚礼正在筹备中。' }

    // 需要先约会
    if (!state.dating) return { success: false, message: '需要先赠帕约会。' }

    if (state.friendship < 2500) return { success: false, message: '好感度不足（需要10心/2500）。' }

    const inventoryStore = useInventoryStore()
    if (!inventoryStore.removeItem('jade_ring')) {
      return { success: false, message: '需要一枚翡翠戒指。' }
    }

    // 设置婚礼倒计时而非立即结婚
    weddingCountdown.value = 3
    weddingNpcId.value = npcId
    state.friendship = Math.min(state.friendship + 400, getFriendshipCap(state))
    return {
      success: true,
      message: `${npcDef.name}含泪接受了你的翡翠戒指……婚礼将在3天后举行！`,
      unlockedMessages: syncRelationshipPerks(npcId)
    }
  }

  /** 获取已婚配偶状态 */
  const getSpouse = (): NpcState | null => {
    return npcStates.value.find(s => s.married) ?? null
  }

  /** 获取知己状态 */
  const getZhiji = (): NpcState | null => {
    return npcStates.value.find(s => s.zhiji) ?? null
  }

  /** 赠玉结为知己 (需同性+2000好感) */
  const becomeZhiji = (npcId: string): { success: boolean; message: string; unlockedMessages?: string[] } => {
    const state = getNpcState(npcId)
    if (!state) return { success: false, message: 'NPC不存在。' }

    const npcDef = getNpcById(npcId)
    if (!npcDef?.marriageable) return { success: false, message: '无法与此人结为知己。' }

    const playerStore = usePlayerStore()
    if (npcDef.gender !== playerStore.gender) {
      return { success: false, message: '只能与同性结为知己。' }
    }

    if (state.zhiji) return { success: false, message: '你们已经是知己了。' }
    if (state.dating || state.married) return { success: false, message: '无法与恋人或伴侣结为知己。' }
    if (npcStates.value.some(s => s.zhiji)) return { success: false, message: '你已经有知己了。' }
    if (state.friendship < 2000) return { success: false, message: '好感度不足（需要8心/2000）。' }

    const inventoryStore = useInventoryStore()
    if (!inventoryStore.removeItem('zhiji_jade')) {
      return { success: false, message: '需要一块知己玉佩。' }
    }

    state.zhiji = true
    state.friendship = Math.min(state.friendship + 160, getFriendshipCap(state))
    const label = playerStore.gender === 'male' ? '蓝颜知己' : '红颜知己'
    return {
      success: true,
      message: `${npcDef.name}郑重地接过了玉佩……你们结为了${label}！`,
      unlockedMessages: syncRelationshipPerks(npcId)
    }
  }

  /** 断绝知己之缘 */
  const dissolveZhiji = (): { success: boolean; message: string } => {
    const zhijiState = getZhiji()
    if (!zhijiState) return { success: false, message: '你还没有知己。' }

    const playerStore = usePlayerStore()
    if (!playerStore.spendMoney(10000)) {
      return { success: false, message: '金钱不足（需要10000文）。' }
    }

    const npcDef = getNpcById(zhijiState.npcId)
    zhijiState.zhiji = false
    zhijiState.friendship = 1000
    daysZhiji.value = 0

    return { success: true, message: `你和${npcDef?.name ?? '知己'}的知己之缘已断。` }
  }

  /** 每日婚礼倒计时更新 */
  const dailyWeddingUpdate = (): { weddingToday: boolean; npcId: string | null; unlockedMessages?: string[] } => {
    if (weddingCountdown.value <= 0 || !weddingNpcId.value) {
      return { weddingToday: false, npcId: null }
    }
    weddingCountdown.value--
    if (weddingCountdown.value <= 0) {
      const npcId = weddingNpcId.value
      const state = getNpcState(npcId)
      if (state) {
        state.married = true
        state.dating = false
        state.friendship = Math.max(state.friendship, 3500)
      }
      weddingNpcId.value = null
      return { weddingToday: true, npcId, unlockedMessages: syncRelationshipPerks(npcId) }
    }
    return { weddingToday: false, npcId: null, unlockedMessages: [] }
  }

  /** 取消婚礼 */
  const cancelWedding = () => {
    weddingCountdown.value = 0
    weddingNpcId.value = null
  }

  /** 离婚 */
  const divorce = (): { success: boolean; message: string } => {
    const spouse = getSpouse()
    if (!spouse) return { success: false, message: '你还没有结婚。' }

    const playerStore = usePlayerStore()
    if (!playerStore.spendMoney(30000)) {
      return { success: false, message: '金钱不足（需要30000文）。' }
    }

    const npcDef = getNpcById(spouse.npcId)
    spouse.married = false
    spouse.dating = false
    spouse.friendship = 1000
    pregnancy.value = null
    childProposalPending.value = false
    daysMarried.value = 0
    cancelWedding()

    return { success: true, message: `你和${npcDef?.name ?? '配偶'}的婚姻结束了。` }
  }

  /** 放生子女 */
  const releaseChild = (childId: number): { success: boolean; message: string } => {
    const child = children.value.find(c => c.id === childId)
    if (!child) return { success: false, message: '找不到这个孩子。' }

    const playerStore = usePlayerStore()
    if (!playerStore.spendMoney(10000)) {
      return { success: false, message: '金钱不足（需要10000文）。' }
    }

    const name = child.name
    children.value = children.value.filter(c => c.id !== childId)
    return { success: true, message: `${name}被送往了远方亲戚家。` }
  }

  // ============================================================
  // 孕期养成系统
  // ============================================================

  const PREGNANCY_STAGE_CONFIG: Record<PregnancyStage, { days: number; label: string }> = {
    early: { days: 5, label: '初期' },
    mid: { days: 5, label: '中期' },
    late: { days: 5, label: '后期' },
    ready: { days: 3, label: '待产期' }
  }

  const STAGE_ORDER: PregnancyStage[] = ['early', 'mid', 'late', 'ready']

  const MEDICAL_PLANS = {
    normal: { cost: 1000, successRate: 0.8, label: '普通接生' },
    advanced: { cost: 5000, successRate: 0.95, label: '高级接生' },
    luxury: { cost: 15000, successRate: 1.0, label: '豪华接生' }
  } as const

  /** 检查配偶是否应提议要孩子（每日调用） */
  const checkChildProposal = (): boolean => {
    const spouse = getSpouse()
    if (!spouse) return false
    if (children.value.length >= 2) return false
    if (pregnancy.value !== null) return false
    if (childProposalPending.value) return false
    if (daysMarried.value < 7) return false
    if (spouse.friendship < 3000) return false
    // 拒绝冷却：7天基础 + 每次拒绝额外7天
    if (childProposalDeclinedCount.value > 0) {
      const cooldownDays = 7 + childProposalDeclinedCount.value * 7
      if (daysSinceProposalDecline.value < cooldownDays) return false
    }
    return Math.random() < 0.05
  }

  /** 触发提议（设置等待标记） */
  const triggerChildProposal = () => {
    childProposalPending.value = true
  }

  /** 玩家回应提议 */
  const respondToChildProposal = (response: ProposalResponse): { message: string; friendshipChange: number } => {
    childProposalPending.value = false
    const spouse = getSpouse()

    switch (response) {
      case 'accept':
        pregnancy.value = {
          stage: 'early',
          daysInStage: 0,
          stageDays: PREGNANCY_STAGE_CONFIG.early.days,
          careScore: 50,
          caredToday: false,
          giftedForPregnancy: false,
          companionToday: false,
          medicalPlan: null
        }
        if (spouse) spouse.friendship = Math.min(spouse.friendship + 100, getFriendshipCap(spouse))
        childProposalDeclinedCount.value = 0
        daysSinceProposalDecline.value = 0
        return { message: '你们决定迎接新的家庭成员。', friendshipChange: 100 }

      case 'decline':
        if (spouse) spouse.friendship = Math.max(0, spouse.friendship - 50)
        childProposalDeclinedCount.value++
        daysSinceProposalDecline.value = 0
        return { message: '你委婉地拒绝了。', friendshipChange: -50 }

      case 'wait':
        daysSinceProposalDecline.value = 0
        childProposalDeclinedCount.value++ // 也计入冷却
        return { message: '你说了再等等看。', friendshipChange: 0 }
    }
  }

  /** 孕期照料操作 */
  const performPregnancyCare = (
    action: 'gift' | 'companion' | 'supplement' | 'rest'
  ): { success: boolean; message: string; careGain: number } => {
    if (!pregnancy.value) return { success: false, message: '没有待产。', careGain: 0 }
    if (pregnancy.value.caredToday) return { success: false, message: '今天已经照料过了。', careGain: 0 }

    let careGain = 0
    let message = ''

    switch (action) {
      case 'gift': {
        if (pregnancy.value.giftedForPregnancy) {
          return { success: false, message: '今天已经送过礼物了。', careGain: 0 }
        }
        pregnancy.value.giftedForPregnancy = true
        careGain = pregnancy.value.stage === 'early' ? 5 : 3
        message = '你送了一份贴心的礼物。'
        break
      }
      case 'companion': {
        if (pregnancy.value.companionToday) {
          return { success: false, message: '今天已经陪伴过了。', careGain: 0 }
        }
        pregnancy.value.companionToday = true
        careGain = pregnancy.value.stage === 'mid' ? 5 : 3
        message = '你陪伴了一会儿，聊了很多。'
        break
      }
      case 'supplement': {
        const inventoryStore = useInventoryStore()
        const supplementItems: { id: string; gain: number }[] = [
          { id: 'ginseng', gain: 6 },
          { id: 'ginseng_tea', gain: 5 },
          { id: 'herb', gain: 3 },
          { id: 'green_tea_drink', gain: 3 },
          { id: 'chrysanthemum_tea', gain: 3 },
          { id: 'osmanthus_tea', gain: 3 }
        ]
        let found = false
        for (const si of supplementItems) {
          if (inventoryStore.removeItem(si.id, 1)) {
            found = true
            careGain = si.gain
            const itemDef = getItemById(si.id)
            message = `服用了${itemDef?.name ?? '补品'}。`
            break
          }
        }
        if (!found) {
          return { success: false, message: '没有合适的补品（人参/草药/茶饮）。', careGain: 0 }
        }
        break
      }
      case 'rest': {
        careGain = pregnancy.value.stage === 'late' ? 5 : 2
        message = '你让配偶好好休息了一天。'
        break
      }
    }

    pregnancy.value.careScore = Math.min(100, pregnancy.value.careScore + careGain)
    pregnancy.value.caredToday = true
    return { success: true, message, careGain }
  }

  /** 选择接生方式（仅待产期） */
  const chooseMedicalPlan = (plan: 'normal' | 'advanced' | 'luxury'): { success: boolean; message: string } => {
    if (!pregnancy.value) return { success: false, message: '没有待产。' }
    if (pregnancy.value.stage !== 'ready') return { success: false, message: '还没到待产期。' }

    const planInfo = MEDICAL_PLANS[plan]
    const playerStore = usePlayerStore()
    if (!playerStore.spendMoney(planInfo.cost)) {
      return { success: false, message: `金钱不足（需要${planInfo.cost}文）。` }
    }

    pregnancy.value.medicalPlan = plan
    return { success: true, message: `选择了${planInfo.label}（${planInfo.cost}文）。` }
  }

  /** 分娩处理（内部方法） */
  const handleDelivery = (): {
    born?: { name: string; quality: 'normal' | 'premature' | 'healthy' }
    miscarriage?: boolean
    unlockedMessages?: string[]
  } => {
    if (!pregnancy.value) return {}

    const spouse = getSpouse()

    const plan = pregnancy.value.medicalPlan ?? 'normal'
    const planInfo = MEDICAL_PLANS[plan]

    // 成功率 = 医疗方案基础率 + 安产分加成（最高+15%）
    const careBonus = (pregnancy.value.careScore / 100) * 0.15
    const totalSuccessRate = Math.min(1.0, planInfo.successRate + careBonus)

    const success = Math.random() < totalSuccessRate

    if (!success) {
      pregnancy.value = null
      const spouse = getSpouse()
      if (spouse) {
        spouse.friendship = Math.max(0, spouse.friendship - 200)
      }
      return { miscarriage: true }
    }

    // 根据安产分决定出生品质
    const birthQuality: 'normal' | 'premature' | 'healthy' =
      pregnancy.value.careScore >= 80 ? 'healthy' : pregnancy.value.careScore < 40 ? 'premature' : 'normal'

    const isBoy = Math.random() < 0.5
    const namePool = isBoy ? CHILD_NAMES_MALE : CHILD_NAMES_FEMALE
    const usedNames = children.value.map(c => c.name)
    const availableNames = namePool.filter(n => !usedNames.includes(n))
    const name = availableNames[Math.floor(Math.random() * availableNames.length)] ?? '小宝'

    children.value.push({
      id: nextChildId.value++,
      name,
      daysOld: 0,
      stage: 'baby',
      friendship: birthQuality === 'healthy' ? 30 : 0,
      interactedToday: false,
      birthQuality
    })

    pregnancy.value = null
    return { born: { name, quality: birthQuality }, unlockedMessages: spouse ? syncRelationshipPerks(spouse.npcId) : [] }
  }

  /** 每日孕期更新 */
  const dailyPregnancyUpdate = (): {
    stageChanged?: { from: PregnancyStage; to: PregnancyStage }
    born?: { name: string; quality: 'normal' | 'premature' | 'healthy' }
    miscarriage?: boolean
    unlockedMessages?: string[]
  } => {
    // 结婚天数递增
    if (getSpouse()) daysMarried.value++

    // 拒绝冷却计时递增
    if (childProposalDeclinedCount.value > 0) {
      daysSinceProposalDecline.value++
    }

    if (!pregnancy.value) return { unlockedMessages: [] }

    // 重置每日照料标记
    pregnancy.value.caredToday = false
    pregnancy.value.giftedForPregnancy = false
    pregnancy.value.companionToday = false

    pregnancy.value.daysInStage++

    // 检查阶段完成
    if (pregnancy.value.daysInStage >= pregnancy.value.stageDays) {
      const currentStageIndex = STAGE_ORDER.indexOf(pregnancy.value.stage)

      if (pregnancy.value.stage === 'ready') {
        // 分娩
        return handleDelivery()
      }

      // 进入下一阶段
      const from = pregnancy.value.stage
      const nextStage = STAGE_ORDER[currentStageIndex + 1]!
      pregnancy.value.stage = nextStage
      pregnancy.value.daysInStage = 0
      pregnancy.value.stageDays = PREGNANCY_STAGE_CONFIG[nextStage].days

      return { stageChanged: { from, to: nextStage }, unlockedMessages: [] }
    }

    return { unlockedMessages: [] }
  }

  /** 每日子女成长更新（仅已出生子女） */
  const dailyChildUpdate = () => {
    for (const child of children.value) {
      child.daysOld++
      child.interactedToday = false
      if (child.stage === 'baby' && child.daysOld >= 14) {
        child.stage = 'toddler'
      } else if (child.stage === 'toddler' && child.daysOld >= 28) {
        child.stage = 'child'
      } else if (child.stage === 'child' && child.daysOld >= 56) {
        child.stage = 'teen'
      }
    }
  }

  /** 与子女互动 */
  const interactWithChild = (childId: number): { message: string; item?: string } | null => {
    const child = children.value.find(c => c.id === childId)
    if (!child) return null
    if (child.interactedToday) return null
    if (child.stage === 'baby') return null

    child.interactedToday = true
    child.friendship = Math.min(300, child.friendship + 2)

    if (child.stage === 'child' && Math.random() < 0.1) {
      const finds = ['wood', 'herb', 'pine_cone', 'wild_berry']
      const item = finds[Math.floor(Math.random() * finds.length)]!
      return { message: `${child.name}递给你一个东西。`, item }
    }

    return { message: `你和${child.name}玩了一会儿。(+2好感)` }
  }

  /** 检查NPC是否有每日提示功能 */
  const hasDailyTip = (npcId: string): boolean => {
    return (TIP_NPC_IDS as readonly string[]).includes(npcId)
  }

  /** 检查NPC今天是否已给过提示 */
  const isTipGivenToday = (npcId: string): boolean => {
    return tipGivenToday.value[npcId] ?? false
  }

  /** 获取NPC的每日提示 */
  const getDailyTip = (npcId: string): string | null => {
    if (!hasDailyTip(npcId)) return null
    if (tipGivenToday.value[npcId]) return null

    tipGivenToday.value[npcId] = true
    const gameStore = useGameStore()

    switch (npcId) {
      case 'li_yu':
        return WEATHER_TIPS[gameStore.tomorrowWeather]
      case 'zhou_xiucai':
        return getFortuneTip(gameStore.dailyLuck)
      case 'wang_dashen': {
        const cookingStore = useCookingStore()
        const unlockedRecipes = RECIPES.filter(r => cookingStore.unlockedRecipes.includes(r.id))
        if (unlockedRecipes.length === 0) return NO_RECIPE_TIP
        // 每周推荐一个固定食谱（基于年+周数的种子）
        const weekIndex = Math.floor((gameStore.day - 1) / 7)
        const seed = (gameStore.year - 1) * 16 + ['spring', 'summer', 'autumn', 'winter'].indexOf(gameStore.season) * 4 + weekIndex
        const recipe = unlockedRecipes[seed % unlockedRecipes.length]!
        const ingredientNames = recipe.ingredients.map(ing => {
          const item = getItemById(ing.itemId)
          return item ? `${item.name}×${ing.quantity}` : ing.itemId
        })
        return getRecipeTipMessage(recipe.name, ingredientNames)
      }
      case 'liu_cunzhang':
        return getLivingTip(gameStore.day, gameStore.year)
      default:
        return null
    }
  }

  /** 每日重置对话和送礼状态 + 伴侣好感衰减 */
  const dailyReset = () => {
    const gameStore = useGameStore()

    // 重置每日提示
    tipGivenToday.value = {}

    for (const state of npcStates.value) {
      // 只有已婚伴侣不聊天才会掉好感，普通NPC不衰减
      if (!state.talkedToday && state.married) {
        state.friendship = Math.max(0, state.friendship - 10)
      }
      // 知己不聊天也会掉好感（衰减较少）
      if (!state.talkedToday && state.zhiji) {
        state.friendship = Math.max(0, state.friendship - 5)
      }
      state.talkedToday = false
      state.giftedToday = false
      // 每周日重置周送礼计数 (day 7,14,21,28)
      if (gameStore.day % 7 === 0) {
        state.giftsThisWeek = 0
      }
    }

    // 美观度好感加成
    const decorationStore = useDecorationStore()
    const beautyBonus = decorationStore.dailyFriendshipBonus
    const beautyCapBonus = decorationStore.beautyScore >= 100 ? 250 : 0
    if (beautyBonus > 0) {
      for (const state of npcStates.value) {
        const cap = getFriendshipCap(state, beautyCapBonus)
        state.friendship = Math.min(cap, state.friendship + beautyBonus)
      }
    }

    // 知己天数递增
    if (getZhiji()) daysZhiji.value++
  }

  const serialize = () => {
    return {
      npcStates: npcStates.value,
      relationshipClues: relationshipClues.value,
      children: children.value,
      nextChildId: nextChildId.value,
      daysMarried: daysMarried.value,
      daysZhiji: daysZhiji.value,
      pregnancy: pregnancy.value,
      childProposalPending: childProposalPending.value,
      childProposalDeclinedCount: childProposalDeclinedCount.value,
      daysSinceProposalDecline: daysSinceProposalDecline.value,
      // 旧字段保留以兼容
      pendingChild: false,
      childCountdown: 0,
      weddingCountdown: weddingCountdown.value,
      weddingNpcId: weddingNpcId.value,
      hiredHelpers: hiredHelpers.value,
      friendshipVersion: 2
    }
  }

  const deserialize = (data: ReturnType<typeof serialize>) => {
    const isOldScale = !(data as any).friendshipVersion || (data as any).friendshipVersion < 2
    const rawStates = Array.isArray((data as any)?.npcStates) ? (data as any).npcStates : []
    const savedStates: NpcState[] = rawStates
      .filter((s: any) => s && typeof s === 'object' && typeof s.npcId === 'string' && validNpcIds.has(s.npcId))
      .map((s: any): NpcState => ({
        ...buildDefaultNpcState(s.npcId),
        ...s,
        // 旧存档好感度迁移: ×8 (300制→2500制)
        friendship: Math.max(0, isOldScale ? Math.round((Number(s.friendship) || 0) * 8) : Number(s.friendship) || 0),
        talkedToday: !!s.talkedToday,
        giftedToday: !!s.giftedToday,
        married: !!s.married,
        dating: !!s.dating,
        zhiji: !!s.zhiji,
        giftsThisWeek: Math.max(0, Number(s.giftsThisWeek) || 0),
        triggeredHeartEvents: Array.isArray(s.triggeredHeartEvents) ? s.triggeredHeartEvents.filter((id: unknown) => typeof id === 'string') : [],
        unlockedPerks: Array.isArray(s.unlockedPerks) ? s.unlockedPerks.filter((id: unknown) => typeof id === 'string') : []
      }))
    // 合并：保留已保存的状态，为新增NPC补充默认状态
    const savedIds = new Set(savedStates.map(s => s.npcId))
    const newNpcStates: NpcState[] = NPCS.filter(npc => !savedIds.has(npc.id)).map(npc => buildDefaultNpcState(npc.id))
    npcStates.value = [...savedStates, ...newNpcStates]
    relationshipClues.value = (Array.isArray((data as any).relationshipClues) ? (data as any).relationshipClues : [])
      .filter((clue: any) => clue && typeof clue === 'object' && clue?.clueId && clue?.text)
      .map((clue: any) => ({
        npcId: typeof clue.npcId === 'string' ? clue.npcId : '',
        clueId: String(clue.clueId),
        text: String(clue.text)
      }))
    children.value = (Array.isArray((data as any).children) ? (data as any).children : [])
      .filter((c: any) => c && typeof c === 'object')
      .map((c: any) => ({
        id: Number(c.id) || 0,
        name: typeof c.name === 'string' ? c.name : '小宝',
        daysOld: Math.max(0, Number(c.daysOld) || 0),
        stage: ['baby', 'toddler', 'child', 'teen'].includes(c.stage) ? c.stage : 'baby',
        friendship: Math.max(0, Number(c.friendship) || 0),
        interactedToday: !!c.interactedToday,
        birthQuality: ['normal', 'premature', 'healthy'].includes(c.birthQuality) ? c.birthQuality : 'normal'
      }))
    // 旧存档无 nextChildId → 从已有子女推算
    nextChildId.value = Math.max(
      0,
      Number((data as any).nextChildId) || (children.value.length > 0 ? Math.max(...children.value.map((c: ChildState) => c.id)) + 1 : 0)
    )
    daysMarried.value = (data as any).daysMarried ?? 0
    daysZhiji.value = (data as any).daysZhiji ?? 0

    // 新孕期系统
    pregnancy.value = (() => {
      const rawPregnancy = (data as any).pregnancy
      if (!rawPregnancy || typeof rawPregnancy !== 'object') return null
      const pregnancyStages: PregnancyStage[] = ['early', 'mid', 'late', 'ready']
      const stage: PregnancyStage = pregnancyStages.includes(rawPregnancy.stage as PregnancyStage) ? (rawPregnancy.stage as PregnancyStage) : 'early'
      return {
        stage,
        daysInStage: Math.max(0, Number(rawPregnancy.daysInStage) || 0),
        stageDays: Math.max(1, Number(rawPregnancy.stageDays) || PREGNANCY_STAGE_CONFIG[stage].days),
        careScore: Math.max(0, Math.min(100, Number(rawPregnancy.careScore) || 0)),
        caredToday: !!rawPregnancy.caredToday,
        giftedForPregnancy: !!rawPregnancy.giftedForPregnancy,
        companionToday: !!rawPregnancy.companionToday,
        medicalPlan: ['normal', 'advanced', 'luxury'].includes(rawPregnancy.medicalPlan) ? rawPregnancy.medicalPlan : null
      }
    })()
    childProposalPending.value = (data as any).childProposalPending ?? false
    childProposalDeclinedCount.value = (data as any).childProposalDeclinedCount ?? 0
    daysSinceProposalDecline.value = (data as any).daysSinceProposalDecline ?? 0

    // 旧存档迁移：pendingChild → pregnancy
    if ((data as any).pendingChild && !pregnancy.value) {
      const oldCountdown: number = (data as any).childCountdown ?? 0
      let stage: PregnancyStage = 'early'
      if (oldCountdown <= 3) stage = 'ready'
      else if (oldCountdown <= 8) stage = 'late'
      else if (oldCountdown <= 13) stage = 'mid'
      pregnancy.value = {
        stage,
        daysInStage: 0,
        stageDays: PREGNANCY_STAGE_CONFIG[stage].days,
        careScore: 50,
        caredToday: false,
        giftedForPregnancy: false,
        companionToday: false,
        medicalPlan: null
      }
    }

    weddingCountdown.value = (data as any).weddingCountdown ?? 0
    weddingNpcId.value = (data as any).weddingNpcId ?? null
    hiredHelpers.value = (Array.isArray((data as any).hiredHelpers) ? (data as any).hiredHelpers : [])
      .filter((helper: any) => helper && typeof helper === 'object' && typeof helper.npcId === 'string' && validNpcIds.has(helper.npcId))
      .map((helper: any) => {
        const task: FarmHelperTask = ['water', 'feed', 'harvest', 'weed'].includes(helper.task) ? helper.task : 'water'
        return {
          npcId: helper.npcId,
          task,
          dailyWage: Math.max(0, Number(helper.dailyWage) || HELPER_WAGES[task])
        }
      })
  }

  const rehydrateRelationshipPerks = (options: { grantInventoryRewards?: boolean; emitMessages?: boolean } = {}) => {
    return syncRelationshipPerks(undefined, {
      grantInventoryRewards: options.grantInventoryRewards ?? true,
      emitMessages: options.emitMessages ?? false
    })
  }

  return {
    npcStates,
    children,
    nextChildId,
    daysMarried,
    daysZhiji,
    pregnancy,
    childProposalPending,
    childProposalDeclinedCount,
    daysSinceProposalDecline,
    weddingCountdown,
    weddingNpcId,
    hiredHelpers,
    HELPER_WAGES,
    HELPER_TASK_NAMES,
    getNpcState,
    getFriendshipLevel,
    getRelationshipStage,
    getRelationshipStageText,
    getRelationshipStageDescription,
    getRelationshipBenefits,
    getRelationshipGiftReturnSummaries,
    getNextRelationshipBenefits,
    getRelationshipCluesForNpc,
    getShopDiscountBonus,
    addRelationshipClue,
    getScheduleStatus,
    getScheduleTimeline,
    getNextScheduleText,
    syncRelationshipPerks,
    relationshipClues,
    isBirthday,
    getTodayBirthdayNpc,
    checkHeartEvent,
    markHeartEventTriggered,
    adjustFriendship,
    talkTo,
    giveGift,
    startDating,
    propose,
    getSpouse,
    getZhiji,
    becomeZhiji,
    dissolveZhiji,
    dailyWeddingUpdate,
    cancelWedding,
    divorce,
    releaseChild,
    getHireableNpcs,
    hireHelper,
    dismissHelper,
    processDailyHelpers,
    checkChildProposal,
    triggerChildProposal,
    respondToChildProposal,
    performPregnancyCare,
    chooseMedicalPlan,
    dailyPregnancyUpdate,
    interactWithChild,
    dailyChildUpdate,
    dailyReset,
    hasDailyTip,
    isTipGivenToday,
    getDailyTip,
    tipGivenToday,
    PREGNANCY_STAGE_CONFIG,
    MEDICAL_PLANS,
    rehydrateRelationshipPerks,
    serialize,
    deserialize
  }
})
