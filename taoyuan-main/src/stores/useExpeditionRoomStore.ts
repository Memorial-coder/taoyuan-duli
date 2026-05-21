import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  closeExpeditionRoom,
  createExpeditionRoom,
  disconnectExpeditionRoom,
  fetchExpeditionRoomOverview,
  type ExpeditionGameplayTemplate,
  inviteExpeditionRoomMember,
  joinExpeditionRoom,
  leaveExpeditionRoom,
  readyExpeditionRoom,
  reconnectExpeditionRoom,
  settleExpeditionRoom,
  startExpeditionRoomCountdown,
  startExpeditionRoomReadyCheck,
  submitExpeditionRoomGameplayAction,
  type ExpeditionRoomOverview,
  type ExpeditionRoomSnapshot,
  type ExpeditionRoomTemplate,
  unreadyExpeditionRoom,
} from '@/utils/expeditionRoomApi'

export const useExpeditionRoomStore = defineStore('expeditionRoom', () => {
  const loading = ref(false)
  const actionRunning = ref(false)
  const errorMessage = ref('')
  const overview = ref<ExpeditionRoomOverview | null>(null)
  const selectedTemplateId = ref('expedition_outpost')
  const selectedGameplayTemplateId = ref('expedition_roles')
  const draftTitle = ref('')
  const draftInviteUsername = ref('')
  const lastLoadedAt = ref(0)

  const myRoom = computed<ExpeditionRoomSnapshot | null>(() => overview.value?.my_room ?? null)
  const visibleRooms = computed(() => overview.value?.visible_rooms ?? [])
  const invitedRooms = computed(() => overview.value?.invited_rooms ?? [])
  const recentReceipts = computed(() => overview.value?.recent_receipts ?? [])
  const templates = computed<ExpeditionRoomTemplate[]>(() => overview.value?.templates ?? [])
  const gameplayTemplates = computed<ExpeditionGameplayTemplate[]>(() => overview.value?.gameplay_templates ?? [])

  const selectedTemplate = computed(() => templates.value.find(template => template.id === selectedTemplateId.value) ?? templates.value[0] ?? null)
  const selectedGameplayTemplate = computed(() => gameplayTemplates.value.find(template => template.id === selectedGameplayTemplateId.value) ?? gameplayTemplates.value[0] ?? null)
  const recommendedGameplayTemplates = computed(() => {
    const template = selectedTemplate.value
    if (!template) return gameplayTemplates.value
    const recommendedIds = new Set(template.recommended_gameplay_template_ids)
    const recommended = gameplayTemplates.value.filter(item => recommendedIds.has(item.id))
    return recommended.length > 0 ? recommended : gameplayTemplates.value
  })

  const hydrateOverview = (nextOverview: ExpeditionRoomOverview | null) => {
    overview.value = nextOverview
    const nextTemplates = nextOverview?.templates ?? []
    const firstTemplate = nextTemplates[0]
    if (firstTemplate && !nextTemplates.some(template => template.id === selectedTemplateId.value)) {
      selectedTemplateId.value = firstTemplate.id
    }
    const nextGameplayTemplates = nextOverview?.gameplay_templates ?? []
    const fallbackGameplayId = nextTemplates.find(template => template.id === selectedTemplateId.value)?.recommended_gameplay_template_ids?.[0]
      ?? nextGameplayTemplates[0]?.id
      ?? 'expedition_roles'
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
      const nextOverview = await fetchExpeditionRoomOverview()
      hydrateOverview(nextOverview)
      lastLoadedAt.value = Date.now()
      return nextOverview
    } catch (error) {
      if (!options.silent) errorMessage.value = error instanceof Error ? error.message : '获取远征房间失败'
      throw error
    } finally {
      if (!options.silent) loading.value = false
    }
  }

  const applyActionResult = (result: { overview: ExpeditionRoomOverview; room: ExpeditionRoomSnapshot }) => {
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
      errorMessage.value = error instanceof Error ? error.message : '远征房间操作失败'
      throw error
    } finally {
      actionRunning.value = false
    }
  }

  const createRoom = async () =>
    runAction(async () => {
      const result = await createExpeditionRoom({
        template_id: selectedTemplateId.value,
        gameplay_template_id: selectedGameplayTemplateId.value,
        title: draftTitle.value.trim() || undefined,
      })
      draftTitle.value = ''
      return applyActionResult(result)
    })

  const inviteMember = async (roomId: string) =>
    runAction(async () => {
      const target = draftInviteUsername.value.trim()
      if (!target) throw new Error('请先填写要邀请的玩家用户名')
      const result = await inviteExpeditionRoomMember(roomId, target)
      draftInviteUsername.value = ''
      return applyActionResult(result)
    })

  const joinRoom = async (roomId: string) =>
    runAction(async () => applyActionResult(await joinExpeditionRoom(roomId)))

  const leaveRoomAction = async (roomId: string) =>
    runAction(async () => applyActionResult(await leaveExpeditionRoom(roomId)))

  const startReadyCheck = async (roomId: string) =>
    runAction(async () => applyActionResult(await startExpeditionRoomReadyCheck(roomId)))

  const readyRoomAction = async (roomId: string) =>
    runAction(async () => applyActionResult(await readyExpeditionRoom(roomId)))

  const unreadyRoomAction = async (roomId: string) =>
    runAction(async () => applyActionResult(await unreadyExpeditionRoom(roomId)))

  const startCountdown = async (roomId: string) =>
    runAction(async () => applyActionResult(await startExpeditionRoomCountdown(roomId)))

  const disconnectRoomAction = async (roomId: string) =>
    runAction(async () => applyActionResult(await disconnectExpeditionRoom(roomId)))

  const reconnectRoomAction = async (roomId: string) =>
    runAction(async () => applyActionResult(await reconnectExpeditionRoom(roomId)))

  const submitGameplayAction = async (roomId: string, actionId: string) =>
    runAction(async () => applyActionResult(await submitExpeditionRoomGameplayAction(roomId, actionId)))

  const settleRoomAction = async (roomId: string) =>
    runAction(async () => applyActionResult(await settleExpeditionRoom(roomId)))

  const closeRoomAction = async (roomId: string) =>
    runAction(async () => applyActionResult(await closeExpeditionRoom(roomId)))

  return {
    loading,
    actionRunning,
    errorMessage,
    overview,
    myRoom,
    visibleRooms,
    invitedRooms,
    recentReceipts,
    templates,
    gameplayTemplates,
    recommendedGameplayTemplates,
    selectedTemplateId,
    selectedTemplate,
    selectedGameplayTemplateId,
    selectedGameplayTemplate,
    draftTitle,
    draftInviteUsername,
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
  }
})
