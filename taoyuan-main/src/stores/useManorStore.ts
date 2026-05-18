import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createManorGuestbookEntry,
  favoriteManor,
  fetchOwnManorSnapshot,
  fetchFavoriteOverview,
  followManor,
  pinManorGuestbookEntry,
  recordManorVisit,
  replyManorGuestbookEntry,
  saveManorGuide,
  saveManorThemeWeek,
  type OnlineManorSnapshot
} from '@/utils/onlineProfileApi'

export const useManorStore = defineStore('onlineManor', () => {
  const loading = ref(false)
  const snapshot = ref<OnlineManorSnapshot | null>(null)
  const errorMessage = ref('')
  const guestbookDraft = ref('')
  const guestbookReplyDraft = ref<Record<string, string>>({})
  const guestbookActionRunning = ref(false)
  const visitSummaryDraft = ref('')
  const visitFeedbackDraft = ref('')
  const visitPurposeDraft = ref<'explore' | 'friend_visit' | 'gift' | 'quest' | 'other'>('explore')
  const visitActionRunning = ref(false)
  const guidePointTitleDraft = ref('')
  const guidePointSummaryDraft = ref('')
  const guideActionRunning = ref(false)
  const favoriteActionRunning = ref(false)
  const favoriteOverview = ref<Awaited<ReturnType<typeof fetchFavoriteOverview>>>(null)
  const themeLabelDraft = ref('')
  const themeActionRunning = ref(false)

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

  const createVisitRecord = async () => {
    if (!snapshot.value) return
    visitActionRunning.value = true
    errorMessage.value = ''
    try {
      await recordManorVisit({
        target_username: snapshot.value.username,
        purpose: visitPurposeDraft.value,
        summary: visitSummaryDraft.value || '前来参观庄园',
        feedback: visitFeedbackDraft.value,
      })
      visitSummaryDraft.value = ''
      visitFeedbackDraft.value = ''
      await refreshSnapshot()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '记录庄园来访失败'
      throw error
    } finally {
      visitActionRunning.value = false
    }
  }

  const saveGuideSnapshot = async () => {
    if (!snapshot.value) return
    const nextPoints = [
      ...(snapshot.value.guide_points || []),
      {
        id: `point_${Date.now()}`,
        title: guidePointTitleDraft.value.trim(),
        summary: guidePointSummaryDraft.value.trim(),
        order: (snapshot.value.guide_points?.length ?? 0) + 1,
      }
    ].filter(entry => entry.title)

    const defaultRouteTitle = snapshot.value.showcase_theme || '本周参观路线'
    guideActionRunning.value = true
    errorMessage.value = ''
    try {
      const result = await saveManorGuide({
        guide_points: nextPoints,
        guide_routes: [
          {
            id: 'default_route',
            title: defaultRouteTitle,
            summary: `围绕「${defaultRouteTitle}」整理出的推荐参观路线。`,
            point_ids: nextPoints.map(entry => entry.id),
          }
        ]
      })
      snapshot.value = result?.snapshot ?? snapshot.value
      guidePointTitleDraft.value = ''
      guidePointSummaryDraft.value = ''
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '保存庄园导览失败'
      throw error
    } finally {
      guideActionRunning.value = false
    }
  }

  const saveThemeWeekSnapshot = async () => {
    if (!snapshot.value) return
    themeActionRunning.value = true
    errorMessage.value = ''
    try {
      const result = await saveManorThemeWeek({
        label: themeLabelDraft.value.trim() || snapshot.value.showcase_theme || '本周主题',
        season: snapshot.value.theme_week?.season || 'spring',
        week_tag: snapshot.value.theme_week?.week_tag || '',
      })
      snapshot.value = result?.snapshot ?? snapshot.value
      themeLabelDraft.value = ''
      await refreshFavoriteOverview()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '保存主题周失败'
      throw error
    } finally {
      themeActionRunning.value = false
    }
  }

  const refreshFavoriteOverview = async () => {
    favoriteOverview.value = await fetchFavoriteOverview()
    return favoriteOverview.value
  }

  const favoriteCurrentManor = async () => {
    if (!snapshot.value) return
    favoriteActionRunning.value = true
    errorMessage.value = ''
    try {
      await favoriteManor(snapshot.value.username, snapshot.value.showcase_theme)
      await refreshSnapshot()
      await refreshFavoriteOverview()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '收藏庄园失败'
      throw error
    } finally {
      favoriteActionRunning.value = false
    }
  }

  const followCurrentManor = async () => {
    if (!snapshot.value) return
    favoriteActionRunning.value = true
    errorMessage.value = ''
    try {
      await followManor(snapshot.value.username)
      await refreshSnapshot()
      await refreshFavoriteOverview()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '关注庄园失败'
      throw error
    } finally {
      favoriteActionRunning.value = false
    }
  }

  return {
    loading,
    snapshot,
    errorMessage,
    guestbookDraft,
    guestbookReplyDraft,
    guestbookActionRunning,
    visitSummaryDraft,
    visitFeedbackDraft,
    visitPurposeDraft,
    visitActionRunning,
    guidePointTitleDraft,
    guidePointSummaryDraft,
    guideActionRunning,
    favoriteActionRunning,
    favoriteOverview,
    themeLabelDraft,
    themeActionRunning,
    refreshSnapshot,
    createGuestbookEntry,
    replyGuestbookEntry,
    togglePinnedGuestbookEntry,
    createVisitRecord,
    saveGuideSnapshot,
    saveThemeWeekSnapshot,
    refreshFavoriteOverview,
    favoriteCurrentManor,
    followCurrentManor,
  }
})
