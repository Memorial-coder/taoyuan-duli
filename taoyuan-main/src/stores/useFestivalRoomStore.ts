import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  closeFestivalRoom,
  createFestivalRoom,
  disconnectFestivalRoom,
  fetchFestivalRoomOverview,
  inviteFestivalRoomMember,
  joinFestivalRoom,
  leaveFestivalRoom,
  readyFestivalRoom,
  reconnectFestivalRoom,
  settleFestivalRoom,
  startFestivalRoomCountdown,
  startFestivalRoomReadyCheck,
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
  const draftTitle = ref('')
  const draftInviteUsername = ref('')
  const lastLoadedAt = ref(0)

  const myRoom = computed<FestivalRoomSnapshot | null>(() => overview.value?.my_room ?? null)
  const visibleRooms = computed(() => overview.value?.visible_rooms ?? [])
  const invitedRooms = computed(() => overview.value?.invited_rooms ?? [])
  const recentReceipts = computed(() => overview.value?.recent_receipts ?? [])
  const templates = computed<FestivalRoomTemplate[]>(() => overview.value?.templates ?? [])

  const selectedTemplate = computed(() => templates.value.find(template => template.id === selectedTemplateId.value) ?? templates.value[0] ?? null)

  const hydrateOverview = (nextOverview: FestivalRoomOverview | null) => {
    overview.value = nextOverview
    const nextTemplates = nextOverview?.templates ?? []
    const firstTemplate = nextTemplates[0]
    if (firstTemplate && !nextTemplates.some(template => template.id === selectedTemplateId.value)) {
      selectedTemplateId.value = firstTemplate.id
    }
  }

  const refreshOverview = async () => {
    loading.value = true
    errorMessage.value = ''
    try {
      const nextOverview = await fetchFestivalRoomOverview()
      hydrateOverview(nextOverview)
      lastLoadedAt.value = Date.now()
      return nextOverview
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '获取节会房间失败'
      throw error
    } finally {
      loading.value = false
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
        title: draftTitle.value.trim() || undefined,
      })
      draftTitle.value = ''
      return applyActionResult(result)
    })

  const inviteMember = async (roomId: string) =>
    runAction(async () => {
      const target = draftInviteUsername.value.trim()
      if (!target) throw new Error('请先填写要邀请的玩家用户名')
      const result = await inviteFestivalRoomMember(roomId, target)
      draftInviteUsername.value = ''
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

  const settleRoomAction = async (roomId: string) =>
    runAction(async () => applyActionResult(await settleFestivalRoom(roomId)))

  const closeRoomAction = async (roomId: string) =>
    runAction(async () => applyActionResult(await closeFestivalRoom(roomId)))

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
    selectedTemplateId,
    selectedTemplate,
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
    settleRoomAction,
    closeRoomAction,
  }
})
