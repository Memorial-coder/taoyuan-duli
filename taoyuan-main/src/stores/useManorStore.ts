import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createManorGuestbookEntry,
  fetchOwnManorSnapshot,
  pinManorGuestbookEntry,
  replyManorGuestbookEntry,
  type OnlineManorSnapshot
} from '@/utils/onlineProfileApi'

export const useManorStore = defineStore('onlineManor', () => {
  const loading = ref(false)
  const snapshot = ref<OnlineManorSnapshot | null>(null)
  const errorMessage = ref('')
  const guestbookDraft = ref('')
  const guestbookReplyDraft = ref<Record<string, string>>({})
  const guestbookActionRunning = ref(false)

  const refreshSnapshot = async () => {
    loading.value = true
    errorMessage.value = ''
    try {
      snapshot.value = await fetchOwnManorSnapshot()
      return snapshot.value
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '获取庄园快照失败'
      throw error
    } finally {
      loading.value = false
    }
  }

  const createGuestbookEntry = async (kind: 'text' | 'blessing' | 'advice' | 'stamp' | 'signature' = 'text') => {
    if (!snapshot.value) return
    const content = guestbookDraft.value.trim()
    if (!content) return
    guestbookActionRunning.value = true
    errorMessage.value = ''
    try {
      await createManorGuestbookEntry({
        target_username: snapshot.value.username,
        kind,
        content,
      })
      guestbookDraft.value = ''
      await refreshSnapshot()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '庄园留言失败'
      throw error
    } finally {
      guestbookActionRunning.value = false
    }
  }

  const replyGuestbookEntry = async (entryId: string) => {
    const replyText = guestbookReplyDraft.value[entryId]?.trim() || ''
    if (!replyText) return
    guestbookActionRunning.value = true
    errorMessage.value = ''
    try {
      await replyManorGuestbookEntry(entryId, replyText)
      guestbookReplyDraft.value = {
        ...guestbookReplyDraft.value,
        [entryId]: '',
      }
      await refreshSnapshot()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '回复庄园留言失败'
      throw error
    } finally {
      guestbookActionRunning.value = false
    }
  }

  const togglePinnedGuestbookEntry = async (entryId: string, pinned: boolean) => {
    guestbookActionRunning.value = true
    errorMessage.value = ''
    try {
      await pinManorGuestbookEntry(entryId, pinned)
      await refreshSnapshot()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '置顶庄园留言失败'
      throw error
    } finally {
      guestbookActionRunning.value = false
    }
  }

  return {
    loading,
    snapshot,
    errorMessage,
    guestbookDraft,
    guestbookReplyDraft,
    guestbookActionRunning,
    refreshSnapshot,
    createGuestbookEntry,
    replyGuestbookEntry,
    togglePinnedGuestbookEntry,
  }
})
