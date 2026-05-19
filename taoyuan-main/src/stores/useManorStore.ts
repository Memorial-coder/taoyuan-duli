import { computed, ref } from 'vue'
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
  type ManorTemplateId = 'showcase' | 'operational' | 'festival' | 'collection' | 'story'
  type ManorGuestbookKind = 'text' | 'blessing' | 'advice' | 'stamp' | 'signature'

  const GUESTBOOK_PLACEHOLDERS: Record<ManorGuestbookKind, string> = {
    text: '写下一句参观感受，让这座庄园留下可被回看的来访痕迹。',
    blessing: '写一句节气问候、丰收祝愿，给庄园主留下一点好兆头。',
    advice: '留下一条经营建议，告诉庄园主哪里还能继续打磨。',
    stamp: '留一枚短短的来访图章，例如“春汛见证”或“晚风留印”。',
    signature: '用落款的方式写下你的名字或一句到访签名。',
  }

  const GUESTBOOK_QUICK_PICKS: Record<ManorGuestbookKind, string[]> = {
    text: ['这座庄园的节奏很舒服。', '一路看下来，主题很完整。', '今天这条参观路线安排得很好。'],
    blessing: ['愿你本周丰收顺遂。', '愿这座小院四时有喜。', '愿鱼塘、田地和节庆都顺风顺水。'],
    advice: ['鱼塘区可以再补一个导览点。', '留言墙和主题路线很适合放在同一组故事里。', '如果把本周目标写得更具体，访客会更容易看懂。'],
    stamp: ['来访留章 · 春汛见证', '小院同赏 · 晚风有记', '节气问安 · 丰年留印'],
    signature: ['青篱到此，借一盏晚风。', '山客留名，祝小院常新。', '今日来访，记下这一程丰景。'],
  }

  const GUESTBOOK_SUBMIT_LABELS: Record<ManorGuestbookKind, string> = {
    text: '留下留言',
    blessing: '送上祝福',
    advice: '留下建议',
    stamp: '盖下图章',
    signature: '留下签名',
  }

  const loading = ref(false)
  const snapshot = ref<OnlineManorSnapshot | null>(null)
  const errorMessage = ref('')
  const guestbookKindDraft = ref<ManorGuestbookKind>('text')
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
  const templateIdDraft = ref<ManorTemplateId>('showcase')
  const themeActionRunning = ref(false)
  const guestbookPlaceholder = computed(() => GUESTBOOK_PLACEHOLDERS[guestbookKindDraft.value])
  const guestbookQuickPicks = computed(() => GUESTBOOK_QUICK_PICKS[guestbookKindDraft.value])
  const guestbookSubmitLabel = computed(() => GUESTBOOK_SUBMIT_LABELS[guestbookKindDraft.value])

  const syncThemeDrafts = (nextSnapshot: OnlineManorSnapshot | null) => {
    themeLabelDraft.value = nextSnapshot?.theme_week?.active_theme || nextSnapshot?.showcase_theme || ''
    templateIdDraft.value = nextSnapshot?.theme_week?.template_id || 'showcase'
  }

  const setGuestbookKind = (kind: ManorGuestbookKind) => {
    guestbookKindDraft.value = kind
  }

  const applyGuestbookQuickPick = (content: string) => {
    guestbookDraft.value = content
  }

  const refreshSnapshot = async () => {
    loading.value = true
    errorMessage.value = ''
    try {
      snapshot.value = await fetchOwnManorSnapshot()
      syncThemeDrafts(snapshot.value)
      return snapshot.value
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '获取庄园快照失败'
      throw error
    } finally {
      loading.value = false
    }
  }

  const createGuestbookEntry = async () => {
    if (!snapshot.value) return
    const kind = guestbookKindDraft.value
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
        template_id: templateIdDraft.value,
      })
      snapshot.value = result?.snapshot ?? snapshot.value
      syncThemeDrafts(snapshot.value)
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
    guestbookKindDraft,
    guestbookDraft,
    guestbookReplyDraft,
    guestbookActionRunning,
    guestbookPlaceholder,
    guestbookQuickPicks,
    guestbookSubmitLabel,
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
    templateIdDraft,
    themeActionRunning,
    setGuestbookKind,
    applyGuestbookQuickPick,
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
