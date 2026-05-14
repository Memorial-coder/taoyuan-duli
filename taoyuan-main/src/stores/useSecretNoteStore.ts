import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { SECRET_NOTES, getItemById, getTodayEvent } from '@/data'
import type { SecretNoteCategory, SecretNoteDef, SecretNoteSource } from '@/types'
import { useGameStore } from './useGameStore'
import { useHiddenNpcStore } from './useHiddenNpcStore'
import { useInventoryStore } from './useInventoryStore'
import { useMiningStore } from './useMiningStore'
import { useNpcStore } from './useNpcStore'
import { usePlayerStore } from './usePlayerStore'
import { useVillageProjectStore } from './useVillageProjectStore'
import { addLog } from '@/composables/useGameLog'

type SecretLeadState = {
  noteId: number
  source: SecretNoteSource | ''
  unlockedDayTag: string
  resolvedDayTag: string
  recordText: string
}

type SecretNoteVerificationStatus = 'untracked' | 'tracked' | 'ready' | 'resolved'

const mapNoteTypeToCategory = (note: SecretNoteDef): SecretNoteCategory => {
  if (note.category) return note.category
  switch (note.type) {
    case 'treasure':
      return 'treasure'
    case 'npc':
      return 'gift'
    case 'story':
      return 'rumor'
    case 'tip':
    default:
      return 'location'
  }
}

const buildCurrentDayTag = () => {
  const gameStore = useGameStore()
  return `${gameStore.year}-${gameStore.season}-${gameStore.day}`
}

export const useSecretNoteStore = defineStore('secretNote', () => {
  const collectedNotes = ref<number[]>([])
  const usedNotes = ref<number[]>([])
  const noteLeadStates = ref<Record<number, SecretLeadState>>({})
  const validNoteIds = new Set(SECRET_NOTES.map(note => note.id))

  const totalNotes = computed(() => SECRET_NOTES.length)
  const collectedCount = computed(() => collectedNotes.value.length)
  const trackedLeadCount = computed(() => Object.keys(noteLeadStates.value).length)

  const getNoteDef = (noteId: number) => SECRET_NOTES.find(note => note.id === noteId) ?? null

  const isCollected = (noteId: number): boolean => collectedNotes.value.includes(noteId)
  const isUsed = (noteId: number): boolean => usedNotes.value.includes(noteId)
  const hasUncollectedNotes = computed(() => collectedNotes.value.length < SECRET_NOTES.length)

  const getLeadState = (noteId: number): SecretLeadState | null => noteLeadStates.value[noteId] ?? null

  const ensureLeadTracked = (noteId: number, source: SecretNoteSource | '' = '') => {
    const current = noteLeadStates.value[noteId]
    const unlockedDayTag = current?.unlockedDayTag || buildCurrentDayTag()
    noteLeadStates.value = {
      ...noteLeadStates.value,
      [noteId]: {
        noteId,
        source: current?.source || source,
        unlockedDayTag,
        resolvedDayTag: current?.resolvedDayTag || '',
        recordText: current?.recordText || ''
      }
    }
  }

  const resolveLead = (noteId: number, recordText = '') => {
    const current = getLeadState(noteId)
    if (!current) {
      ensureLeadTracked(noteId)
    }
    noteLeadStates.value = {
      ...noteLeadStates.value,
      [noteId]: {
        ...(noteLeadStates.value[noteId] ?? {
          noteId,
          source: '',
          unlockedDayTag: buildCurrentDayTag(),
          resolvedDayTag: '',
          recordText: ''
        }),
        resolvedDayTag: buildCurrentDayTag(),
        recordText: recordText || noteLeadStates.value[noteId]?.recordText || ''
      }
    }
  }

  const evaluateVerification = (note: SecretNoteDef) => {
    const verification = note.verification
    if (!verification) {
      return {
        readable: true,
        readableReason: '',
        ready: false,
        unmetConditions: [] as string[]
      }
    }

    const gameStore = useGameStore()
    const villageProjectStore = useVillageProjectStore()
    const npcStore = useNpcStore()
    const inventoryStore = useInventoryStore()
    const playerStore = usePlayerStore()
    const unmetConditions: string[] = []

    if ((verification.readableProjectLevel ?? 0) > villageProjectStore.villageProjectLevel) {
      return {
        readable: false,
        readableReason: verification.readableHint || '这张纸条里提到的地貌和设施还对不上，暂时看不明白。',
        ready: false,
        unmetConditions
      }
    }

    if (verification.requiredSeason && gameStore.season !== verification.requiredSeason) {
      unmetConditions.push(`需在${verification.requiredSeason === 'spring' ? '春季' : verification.requiredSeason === 'summer' ? '夏季' : verification.requiredSeason === 'autumn' ? '秋季' : '冬季'}验证`)
    }
    if (verification.requiredWeather && gameStore.weather !== verification.requiredWeather) {
      const weatherLabelMap: Record<string, string> = {
        sunny: '晴天',
        rainy: '雨天',
        stormy: '雷雨',
        snowy: '雪天',
        windy: '大风',
        green_rain: '绿雨'
      }
      unmetConditions.push(`需在${weatherLabelMap[verification.requiredWeather] ?? verification.requiredWeather}验证`)
    }
    if (verification.requiredPanel && gameStore.currentLocationGroup !== verification.requiredPanel) {
      const panelLabelMap: Record<string, string> = {
        farm: '农场',
        forage: '竹林',
        fishing: '钓鱼点',
        mining: '矿洞',
        village: '村里'
      }
      unmetConditions.push(`需前往${panelLabelMap[verification.requiredPanel] ?? verification.requiredPanel}`)
    }
    if (typeof verification.requiredHourMin === 'number' && gameStore.hour < verification.requiredHourMin) {
      unmetConditions.push(`需在${verification.requiredHourMin}:00之后`)
    }
    if (typeof verification.requiredHourMax === 'number' && gameStore.hour > verification.requiredHourMax) {
      unmetConditions.push(`需在${verification.requiredHourMax}:00之前`)
    }
    if (typeof verification.requiredMineFloor === 'number') {
      const currentFloor = Number(useMiningStore().currentFloor ?? 0)
      if (currentFloor < verification.requiredMineFloor) {
        unmetConditions.push(`需抵达矿洞${verification.requiredMineFloor}层`)
      }
    }
    if (typeof verification.requiredVillageProjectLevel === 'number' && villageProjectStore.villageProjectLevel < verification.requiredVillageProjectLevel) {
      unmetConditions.push(`需村庄建设达到 ${verification.requiredVillageProjectLevel} 级`)
    }
    if (verification.requiredFestivalId) {
      const todayEvent = getTodayEvent(gameStore.season, gameStore.day, gameStore.year)
      if (todayEvent?.id !== verification.requiredFestivalId) {
        unmetConditions.push('需在指定节日当天验证')
      }
    }
    if (verification.requiredNpcId && typeof verification.requiredFriendship === 'number') {
      const friendship = npcStore.getNpcState(verification.requiredNpcId)?.friendship ?? 0
      if (friendship < verification.requiredFriendship) {
        const npcName = npcStore.getNpcState(verification.requiredNpcId)?.npcId ?? verification.requiredNpcId
        unmetConditions.push(`${npcName}好感需达到 ${verification.requiredFriendship}`)
      }
    }
    if (verification.requiredItemId) {
      const requiredCount = Math.max(1, verification.requiredItemCount ?? 1)
      const hasInventoryItem = inventoryStore.getItemCount(verification.requiredItemId) >= requiredCount
      if (!hasInventoryItem) {
        const itemName = getItemById(verification.requiredItemId)?.name ?? verification.requiredItemId
        unmetConditions.push(`需随身带着${itemName}${requiredCount > 1 ? `×${requiredCount}` : ''}`)
      }
    }
    if (typeof verification.requiredMoney === 'number' && playerStore.money < verification.requiredMoney) {
      unmetConditions.push(`需持有 ${verification.requiredMoney} 文`)
    }

    return {
      readable: true,
      readableReason: '',
      ready: unmetConditions.length === 0,
      unmetConditions
    }
  }

  const getVerificationPreview = (noteId: number) => {
    const note = getNoteDef(noteId)
    if (!note) return null
    const verification = note.verification
    const evaluation = evaluateVerification(note)
    const status: SecretNoteVerificationStatus = isUsed(noteId)
      ? 'resolved'
      : !isCollected(noteId)
        ? 'untracked'
        : verification && evaluation.ready
          ? 'ready'
          : 'tracked'
    return {
      noteId,
      category: mapNoteTypeToCategory(note),
      status,
      readable: evaluation.readable,
      readableReason: evaluation.readableReason,
      summary: verification?.summary ?? '这是一张以阅读和记录为主的纸条。',
      hint: verification?.hint ?? '继续留意相关地点、人物和时机。',
      unmetConditions: evaluation.unmetConditions,
      resolvedDayTag: getLeadState(noteId)?.resolvedDayTag ?? '',
      recordText: status === 'resolved' ? getLeadState(noteId)?.recordText || verification?.recordText || '' : ''
    }
  }

  const tryCollectNote = (source: SecretNoteSource = 'resource'): number | null => {
    if (!hasUncollectedNotes.value) return null
    const uncollected = SECRET_NOTES.filter(note => !collectedNotes.value.includes(note.id))
    if (uncollected.length === 0) return null
    const sourceMatched = uncollected.filter(note => !note.sourceHints || note.sourceHints.includes(source))
    const pool = sourceMatched.length > 0 ? sourceMatched : uncollected.filter(note => !note.sourceHints || note.sourceHints.length === 0)
    if (pool.length === 0) return null
    const note = pool[Math.floor(Math.random() * pool.length)]!
    collectedNotes.value.push(note.id)
    if (note.verification) {
      ensureLeadTracked(note.id, source)
      usePlayerStore().markSecretLeadUnlocked(`note:${note.id}`, buildCurrentDayTag())
    }
    addLog(`发现了秘密笔记 #${note.id}：${note.title}`)
    return note.id
  }

  const useNote = (noteId: number): { success: boolean; message: string } => {
    if (!isCollected(noteId)) return { success: false, message: '尚未获得此笔记。' }
    if (isUsed(noteId)) return { success: false, message: '这条线索已经验证过了。' }

    const noteDef = getNoteDef(noteId)
    if (!noteDef) return { success: false, message: '找不到这张笔记。' }

    const evaluation = evaluateVerification(noteDef)
    if (!evaluation.readable) {
      return { success: false, message: evaluation.readableReason }
    }

    if (noteDef.verification && !evaluation.ready) {
      return {
        success: false,
        message: evaluation.unmetConditions.length > 0 ? `还不能验证：${evaluation.unmetConditions.join('，')}` : noteDef.verification.hint
      }
    }

    if (!noteDef.usable && !noteDef.verification) {
      return { success: false, message: '这张笔记更适合先当作线索阅读。' }
    }

    const playerStore = usePlayerStore()
    const inventoryStore = useInventoryStore()
    const rewardItems = (noteDef.reward?.items ?? []).map(item => ({ itemId: item.itemId, quantity: item.quantity, quality: 'normal' as const }))
    if (rewardItems.length > 0 && !inventoryStore.canAddItems(rewardItems)) {
      return { success: false, message: '背包空间不足，无法领取笔记奖励。' }
    }

    usedNotes.value.push(noteId)
    resolveLead(noteId, noteDef.verification?.recordText ?? '')

    const rewards: string[] = []
    if (noteDef.reward?.money) {
      playerStore.earnMoney(noteDef.reward.money)
      rewards.push(`${noteDef.reward.money}文`)
    }
    if (noteDef.reward?.items?.length) {
      if (inventoryStore.addItemsExact(rewardItems)) {
        for (const item of noteDef.reward.items) {
          const itemName = getItemById(item.itemId)?.name ?? item.itemId
          rewards.push(`${itemName}×${item.quantity}`)
        }
      }
    }

    if (noteDef.verification?.unlockHiddenNpcId) {
      useHiddenNpcStore().unlockRumorLead(noteDef.verification.unlockHiddenNpcId)
    }

    const resultText = rewards.length > 0 ? `获得了${rewards.join('、')}。` : '这条线索被你正式写进了见闻记录。'
    const successText = noteDef.verification?.successText ?? '你顺着笔记上的线索完成了一次验证。'
    if (noteDef.verification?.recordText) {
      playerStore.markSecretLeadUnlocked(`record:${noteId}`, buildCurrentDayTag())
      addLog(noteDef.verification.recordText)
    }
    addLog(`秘密笔记 #${noteId} 验证成功：${successText}`)
    if (rewards.length > 0) {
      addLog(`使用了秘密笔记 #${noteId}，获得了${rewards.join('、')}！`)
    }
    return { success: true, message: `${successText}${resultText}` }
  }

  const serialize = () => ({
    collectedNotes: collectedNotes.value,
    usedNotes: usedNotes.value,
    noteLeadStates: noteLeadStates.value
  })

  const deserialize = (data: any) => {
    const normalizeNoteIds = (value: unknown): number[] => {
      if (!Array.isArray(value)) return []
      const uniqueIds = new Set<number>()
      for (const noteId of value) {
        if (typeof noteId !== 'number' || !Number.isInteger(noteId) || !validNoteIds.has(noteId)) continue
        uniqueIds.add(noteId)
      }
      return [...uniqueIds]
    }

    const normalizeLeadStates = (value: unknown): Record<number, SecretLeadState> => {
      if (!value || typeof value !== 'object') return {}
      const entries = Object.entries(value)
        .map(([key, raw]) => {
          const noteId = Number(key)
          if (!Number.isInteger(noteId) || !validNoteIds.has(noteId) || !raw || typeof raw !== 'object') return null
          const source = typeof (raw as any).source === 'string' ? (raw as any).source : ''
          return [
            noteId,
            {
              noteId,
              source: source === 'tree' || source === 'mining' || source === 'fishing' || source === 'digging' || source === 'monster' || source === 'resource' ? source : '',
              unlockedDayTag: typeof (raw as any).unlockedDayTag === 'string' ? (raw as any).unlockedDayTag : '',
              resolvedDayTag: typeof (raw as any).resolvedDayTag === 'string' ? (raw as any).resolvedDayTag : '',
              recordText: typeof (raw as any).recordText === 'string' ? (raw as any).recordText : ''
            }
          ] as const
        })
        .filter((entry): entry is readonly [number, SecretLeadState] => Boolean(entry))
      return Object.fromEntries(entries)
    }

    collectedNotes.value = normalizeNoteIds(data?.collectedNotes)
    const collectedSet = new Set(collectedNotes.value)
    usedNotes.value = normalizeNoteIds(data?.usedNotes).filter(noteId => collectedSet.has(noteId))
    noteLeadStates.value = normalizeLeadStates(data?.noteLeadStates)
  }

  return {
    collectedNotes,
    usedNotes,
    noteLeadStates,
    totalNotes,
    collectedCount,
    trackedLeadCount,
    isCollected,
    isUsed,
    hasUncollectedNotes,
    getNoteDef,
    getLeadState,
    getVerificationPreview,
    tryCollectNote,
    useNote,
    serialize,
    deserialize
  }
})
