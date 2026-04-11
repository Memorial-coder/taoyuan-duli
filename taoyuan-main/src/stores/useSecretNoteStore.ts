import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { SECRET_NOTES } from '@/data/secretNotes'
import { usePlayerStore } from './usePlayerStore'
import { useInventoryStore } from './useInventoryStore'
import { addLog } from '@/composables/useGameLog'

export const useSecretNoteStore = defineStore('secretNote', () => {
  /** 已收集的笔记ID列表 */
  const collectedNotes = ref<number[]>([])
  /** 已使用的笔记ID列表（宝藏类） */
  const usedNotes = ref<number[]>([])

  const totalNotes = computed(() => SECRET_NOTES.length)
  const collectedCount = computed(() => collectedNotes.value.length)

  /** 是否已收集某笔记 */
  const isCollected = (noteId: number): boolean => {
    return collectedNotes.value.includes(noteId)
  }

  /** 是否已使用某笔记 */
  const isUsed = (noteId: number): boolean => {
    return usedNotes.value.includes(noteId)
  }

  /** 是否还有未收集的笔记 */
  const hasUncollectedNotes = computed(() => {
    return collectedNotes.value.length < SECRET_NOTES.length
  })

  /** 尝试随机收集一张笔记，返回收集到的笔记ID，或null */
  const tryCollectNote = (): number | null => {
    if (!hasUncollectedNotes.value) return null
    const uncollected = SECRET_NOTES.filter(n => !collectedNotes.value.includes(n.id))
    if (uncollected.length === 0) return null
    const note = uncollected[Math.floor(Math.random() * uncollected.length)]!
    collectedNotes.value.push(note.id)
    addLog(`发现了秘密笔记 #${note.id}：${note.title}`)
    return note.id
  }

  /** 使用宝藏笔记（领取奖励） */
  const useNote = (noteId: number): { success: boolean; message: string } => {
    if (!isCollected(noteId)) return { success: false, message: '尚未获得此笔记。' }
    if (isUsed(noteId)) return { success: false, message: '已经使用过此笔记。' }

    const noteDef = SECRET_NOTES.find(n => n.id === noteId)
    if (!noteDef || !noteDef.usable) return { success: false, message: '此笔记不可使用。' }

    const playerStore = usePlayerStore()
    const inventoryStore = useInventoryStore()
    const rewardItems = (noteDef.reward?.items ?? []).map(item => ({ itemId: item.itemId, quantity: item.quantity, quality: 'normal' as const }))
    if (rewardItems.length > 0 && !inventoryStore.canAddItems(rewardItems)) {
      return { success: false, message: '背包空间不足，无法领取笔记奖励。' }
    }

    usedNotes.value.push(noteId)

    const rewards: string[] = []
    if (noteDef.reward?.money) {
      playerStore.earnMoney(noteDef.reward.money)
      rewards.push(`${noteDef.reward.money}文`)
    }
    if (noteDef.reward?.items) {
      if (inventoryStore.addItemsExact(rewardItems)) {
        for (const item of noteDef.reward.items) {
          rewards.push(`${item.itemId}×${item.quantity}`)
        }
      }
    }

    const rewardText = rewards.join('、')
    addLog(`使用了秘密笔记 #${noteId}，获得了${rewardText}！`)
    return { success: true, message: `获得了${rewardText}！` }
  }

  const serialize = () => ({
    collectedNotes: collectedNotes.value,
    usedNotes: usedNotes.value
  })

  const deserialize = (data: any) => {
    collectedNotes.value = data.collectedNotes ?? []
    usedNotes.value = data.usedNotes ?? []
  }

  return {
    collectedNotes,
    usedNotes,
    totalNotes,
    collectedCount,
    isCollected,
    isUsed,
    hasUncollectedNotes,
    tryCollectNote,
    useNote,
    serialize,
    deserialize
  }
})
