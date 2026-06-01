import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useNpcStore } from '@/stores/useNpcStore'
import {
  closeFestivalRoom,
  createFestivalRoom,
  disconnectFestivalRoom,
  fetchFestivalFriendMemorials,
  type FestivalFriendMemorialOverview,
  fetchFestivalRoomOverview,
  type FestivalGameplayTemplate,
  inviteFestivalRoomMember,
  joinFestivalRoom,
  leaveFestivalRoom,
  readyFestivalRoom,
  reconnectFestivalRoom,
  settleFestivalRoom,
  startFestivalRoomCountdown,
  startFestivalRoomReadyCheck,
  submitFestivalRoomGameplayAction,
  type FestivalRoomOverview,
  type FestivalRoomSnapshot,
  type FestivalRoomTemplate,
  unreadyFestivalRoom,
} from '@/utils/festivalRoomApi'

export const useFestivalRoomStore = defineStore('festivalRoom', () => {
  const loading = ref(false)
  const actionRunning = ref(false)
  const errorMessage = ref('')
  const overview = ref<FestivalRoomOverview | null>(null)
  const selectedTemplateId = ref('dragon_boat')
  const selectedGameplayTemplateId = ref('squad_coop')
  const draftMemberLimit = ref(4)
  const draftTitle = ref('')
  const draftSourceLabel = ref('')
  const draftSourceFeedback = ref('')
  const draftSourceContextSummary = ref('')
  const draftInviteUsername = ref('')
  const draftInviteSaveId = ref('')
  const draftFriendMemorialUsername = ref('')
  const friendMemorialOverview = ref<FestivalFriendMemorialOverview | null>(null)
  const lastLoadedAt = ref(0)

  const myRoom = computed<FestivalRoomSnapshot | null>(() => overview.value?.my_room ?? null)
  const myFestivalState = computed(() => myRoom.value?.gameplay?.festival_state ?? null)
  const visibleRooms = computed(() => overview.value?.visible_rooms ?? [])
  const invitedRooms = computed(() => overview.value?.invited_rooms ?? [])
  const recentMemorials = computed(() => overview.value?.recent_memorials ?? [])
  const friendMemorials = computed(() => friendMemorialOverview.value?.memorials ?? [])
  const recentReceipts = computed(() => overview.value?.recent_receipts ?? [])
  const templates = computed<FestivalRoomTemplate[]>(() => overview.value?.templates ?? [])
  const gameplayTemplates = computed<FestivalGameplayTemplate[]>(() => overview.value?.gameplay_templates ?? [])

  const selectedTemplate = computed(() => templates.value.find(template => template.id === selectedTemplateId.value) ?? templates.value[0] ?? null)
  const selectedGameplayTemplate = computed(() => gameplayTemplates.value.find(template => template.id === selectedGameplayTemplateId.value) ?? gameplayTemplates.value[0] ?? null)
  const memberLimitOptions = computed(() => {
    const template = selectedTemplate.value
    const minLimit = Math.max(2, Math.floor(template?.min_member_limit ?? 2))
    const maxLimit = Math.max(minLimit, Math.floor(template?.max_member_limit ?? template?.default_member_limit ?? 4))
    const baseOptions = [2, 4, 6, 8].filter(limit => limit >= minLimit && limit <= maxLimit)
    const defaultLimit = Math.max(minLimit, Math.min(maxLimit, Math.floor(template?.default_member_limit ?? minLimit)))
    return [...new Set([...baseOptions, defaultLimit])].sort((left, right) => left - right)
  })
  const normalizedDraftMemberLimit = computed(() => {
    const options = memberLimitOptions.value
    if (options.includes(draftMemberLimit.value)) return draftMemberLimit.value
    return options.reduce((nearest, option) =>
      Math.abs(option - draftMemberLimit.value) < Math.abs(nearest - draftMemberLimit.value) ? option : nearest,
    options[0] ?? 2)
  })
  const recommendedGameplayTemplates = computed(() => {
    const template = selectedTemplate.value
    if (!template) return gameplayTemplates.value
    const recommendedIds = new Set(template.recommended_gameplay_template_ids)
    const recommended = gameplayTemplates.value.filter(item => recommendedIds.has(item.id))
    return recommended.length > 0 ? recommended : gameplayTemplates.value
  })

  const syncRandomNpcOnlineFestivalRoomTriggers = (nextOverview: FestivalRoomOverview | null) => {
    if (!nextOverview) return
    const npcStore = useNpcStore()
    for (const receipt of nextOverview.recent_receipts ?? []) {
      npcStore.recordRandomNpcOnlineFestivalRoomDialogue({
        trigger: 'recent_receipt',
        roomId: receipt.room_id,
        roomTitle: receipt.room_title,
        templateId: receipt.template_id,
        templateLabel: receipt.template_label,
        receiptId: receipt.id,
        receiptSummary: receipt.summary,
        replayTitle: receipt.route_replay?.title
      })
    }
    const room = nextOverview.my_room
    if (!room) return
    for (const receipt of room.settlement_receipts ?? []) {
      npcStore.recordRandomNpcOnlineFestivalRoomDialogue({
        trigger: 'settlement_receipt',
        roomId: room.id,
        roomTitle: room.title,
        templateId: room.template_id,
        templateLabel: room.template_label,
        receiptId: receipt.id,
        receiptSummary: receipt.summary,
        replayTitle: receipt.route_replay?.title
      })
    }
  }

  const hydrateOverview = (nextOverview: FestivalRoomOverview | null) => {
    overview.value = nextOverview
    syncRandomNpcOnlineFestivalRoomTriggers(nextOverview)
    const nextTemplates = nextOverview?.templates ?? []
    const firstTemplate = nextTemplates[0]
    if (firstTemplate && !nextTemplates.some(template => template.id === selectedTemplateId.value)) {
      selectedTemplateId.value = firstTemplate.id
    }
    const nextGameplayTemplates = nextOverview?.gameplay_templates ?? []
    const fallbackGameplayId = nextTemplates.find(template => template.id === selectedTemplateId.value)?.recommended_gameplay_template_ids?.[0]
      ?? nextGameplayTemplates[0]?.id
      ?? 'public_progress'
    if (!nextGameplayTemplates.some(template => template.id === selectedGameplayTemplateId.value)) {
      selectedGameplayTemplateId.value = fallbackGameplayId
    }
  }

  const refreshOverview = async (options: { silent?: boolean } = {}) => {
    if (!options.silent) {
      loading.value = true
      errorMessage.value = ''
    }
    try {
      const nextOverview = await fetchFestivalRoomOverview()
      hydrateOverview(nextOverview)
      lastLoadedAt.value = Date.now()
      return nextOverview
    } catch (error) {
      if (!options.silent) errorMessage.value = error instanceof Error ? error.message : '获取节会房间失败'
      throw error
    } finally {
      if (!options.silent) loading.value = false
    }
  }

  const applyActionResult = (result: { overview: FestivalRoomOverview; room: FestivalRoomSnapshot }) => {
    hydrateOverview(result.overview)
    lastLoadedAt.value = Date.now()
    return result.room
  }

  const runAction = async <T>(runner: () => Promise<T>) => {
    actionRunning.value = true
    errorMessage.value = ''
    try {
      return await runner()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '节会房间操作失败'
      throw error
    } finally {
      actionRunning.value = false
    }
  }

  const createRoom = async () =>
    runAction(async () => {
      const result = await createFestivalRoom({
        template_id: selectedTemplateId.value,
        gameplay_template_id: selectedGameplayTemplateId.value,
        title: draftTitle.value.trim() || undefined,
        member_limit: normalizedDraftMemberLimit.value,
        source_label: draftSourceLabel.value.trim() || undefined,
        source_feedback: draftSourceFeedback.value.trim() || undefined,
        source_context_summary: draftSourceContextSummary.value.trim() || undefined,
      })
      draftTitle.value = ''
      draftSourceLabel.value = ''
      draftSourceFeedback.value = ''
      draftSourceContextSummary.value = ''
      return applyActionResult(result)
    })

  const inviteMember = async (roomId: string) =>
    runAction(async () => {
      const target = draftInviteUsername.value.trim()
      const targetSaveIdDraft = draftInviteSaveId.value.trim()
      const targetSaveId = Number(targetSaveIdDraft)
      const hasTargetSaveId = !!targetSaveIdDraft && Number.isInteger(targetSaveId)
      if (!target && !hasTargetSaveId) throw new Error('请先填写要邀请的玩家用户名或存档 ID')
      const result = await inviteFestivalRoomMember(roomId, {
        target_username: target || undefined,
        target_save_id: hasTargetSaveId ? targetSaveId : undefined,
      })
      draftInviteUsername.value = ''
      draftInviteSaveId.value = ''
      return applyActionResult(result)
    })

  const joinRoom = async (roomId: string) =>
    runAction(async () => {
      const result = await joinFestivalRoom(roomId)
      return applyActionResult(result)
    })

  const leaveRoomAction = async (roomId: string) =>
    runAction(async () => {
      const result = await leaveFestivalRoom(roomId)
      return applyActionResult(result)
    })

  const startReadyCheck = async (roomId: string) =>
    runAction(async () => applyActionResult(await startFestivalRoomReadyCheck(roomId)))

  const readyRoomAction = async (roomId: string) =>
    runAction(async () => applyActionResult(await readyFestivalRoom(roomId)))

  const unreadyRoomAction = async (roomId: string) =>
    runAction(async () => applyActionResult(await unreadyFestivalRoom(roomId)))

  const startCountdown = async (roomId: string) =>
    runAction(async () => applyActionResult(await startFestivalRoomCountdown(roomId)))

  const disconnectRoomAction = async (roomId: string) =>
    runAction(async () => applyActionResult(await disconnectFestivalRoom(roomId)))

  const reconnectRoomAction = async (roomId: string) =>
    runAction(async () => applyActionResult(await reconnectFestivalRoom(roomId)))

  const submitGameplayAction = async (roomId: string, actionId: string) =>
    runAction(async () => applyActionResult(await submitFestivalRoomGameplayAction(roomId, actionId)))

  const settleRoomAction = async (roomId: string) =>
    runAction(async () => applyActionResult(await settleFestivalRoom(roomId)))

  const closeRoomAction = async (roomId: string) =>
    runAction(async () => applyActionResult(await closeFestivalRoom(roomId)))

  const loadFriendMemorials = async () =>
    runAction(async () => {
      const result = await fetchFestivalFriendMemorials(draftFriendMemorialUsername.value)
      friendMemorialOverview.value = result
      return result
    })

  return {
    loading,
    actionRunning,
    errorMessage,
    overview,
    myRoom,
    myFestivalState,
    visibleRooms,
    invitedRooms,
    recentMemorials,
    friendMemorialOverview,
    friendMemorials,
    recentReceipts,
    templates,
    gameplayTemplates,
    recommendedGameplayTemplates,
    selectedTemplateId,
    selectedTemplate,
    selectedGameplayTemplateId,
    selectedGameplayTemplate,
    draftMemberLimit,
    memberLimitOptions,
    normalizedDraftMemberLimit,
    draftTitle,
    draftSourceLabel,
    draftSourceFeedback,
    draftSourceContextSummary,
    draftInviteUsername,
    draftInviteSaveId,
    draftFriendMemorialUsername,
    lastLoadedAt,
    refreshOverview,
    createRoom,
    inviteMember,
    joinRoom,
    leaveRoomAction,
    startReadyCheck,
    readyRoomAction,
    unreadyRoomAction,
    startCountdown,
    disconnectRoomAction,
    reconnectRoomAction,
    submitGameplayAction,
    settleRoomAction,
    closeRoomAction,
    loadFriendMemorials,
  }
})
