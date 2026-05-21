import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { forceRefreshCurrentAccountContext } from '@/utils/accountStorage'
import { buildApiUrl } from '@/utils/apiClient'
import { useCoopOrderStore } from '@/stores/useCoopOrderStore'
import { useExpeditionRoomStore } from '@/stores/useExpeditionRoomStore'
import { useFestivalRoomStore } from '@/stores/useFestivalRoomStore'
import { useMailboxStore } from '@/stores/useMailboxStore'
import { useSocialStore } from '@/stores/useSocialStore'
import { useSocietyStore } from '@/stores/useSocietyStore'

type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'closed'

interface RealtimeEnvelope {
  type: string
  payload?: Record<string, unknown>
  sent_at?: number
  queued_event_id?: string
  queued_at?: number
  replayed?: boolean
}

interface PresenceEntry {
  username: string
  display_name?: string
  save_id?: number | null
  save_slot?: number | null
  connection_id?: string
}

const FRIEND_EVENT_TYPES = new Set([
  'friend.request.created',
  'friend.request.accepted',
  'friend.request.rejected',
  'friend.removed'
])
const ACTIVITY_ROOM_EVENT_TYPES = new Set([
  'activity.room.invited',
  'activity.room.updated'
])
export const TAOYUAN_HALL_NOTIFICATION_EVENT = 'taoyuan:hall-notification'
const RECONNECT_BASE_DELAY_MS = 1500
const RECONNECT_MAX_DELAY_MS = 30000
const CLIENT_PING_INTERVAL_MS = 20000

export const useRealtimeStore = defineStore('taoyuanRealtime', () => {
  const status = ref<RealtimeStatus>('idle')
  const connectionId = ref('')
  const username = ref('')
  const saveId = ref<number | null>(null)
  const saveSlot = ref<number | null>(null)
  const lastEventType = ref('')
  const lastEventAt = ref(0)
  const lastError = ref('')
  const reconnectAttempt = ref(0)
  const onlinePresence = ref<PresenceEntry[]>([])

  let socket: WebSocket | null = null
  let reconnectTimer: number | null = null
  let pingTimer: number | null = null
  let relationshipRefreshTimer: number | null = null
  let festivalRoomRefreshTimer: number | null = null
  let expeditionRoomRefreshTimer: number | null = null
  let mailboxRefreshTimer: number | null = null
  let societyRefreshTimer: number | null = null
  let coopOrderRefreshTimer: number | null = null
  let manuallyStopped = true

  const isConnected = computed(() => status.value === 'connected')

  const clearReconnectTimer = () => {
    if (reconnectTimer === null) return
    window.clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  const clearPingTimer = () => {
    if (pingTimer === null) return
    window.clearInterval(pingTimer)
    pingTimer = null
  }

  const resolveRealtimeUrl = (): string => {
    const apiUrl = buildApiUrl('/api/taoyuan/online/realtime')
    const baseUrl = typeof window !== 'undefined' ? window.location.href : 'http://127.0.0.1/'
    const parsed = new URL(apiUrl, baseUrl)
    parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:'
    return parsed.toString()
  }

  const send = (type: string, payload: Record<string, unknown> = {}) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return false
    socket.send(JSON.stringify({ type, payload }))
    return true
  }

  const startPing = () => {
    clearPingTimer()
    pingTimer = window.setInterval(() => {
      send('ping')
    }, CLIENT_PING_INTERVAL_MS)
  }

  const queueRelationshipRefresh = () => {
    if (relationshipRefreshTimer !== null) return
    relationshipRefreshTimer = window.setTimeout(() => {
      relationshipRefreshTimer = null
      void useSocialStore().refreshRelationships({ silent: true }).catch(error => {
        lastError.value = error instanceof Error ? error.message : '实时好友关系刷新失败'
      })
    }, 300)
  }

  const queueFestivalRoomRefresh = () => {
    if (festivalRoomRefreshTimer !== null) return
    festivalRoomRefreshTimer = window.setTimeout(() => {
      festivalRoomRefreshTimer = null
      void useFestivalRoomStore().refreshOverview({ silent: true }).catch(error => {
        lastError.value = error instanceof Error ? error.message : '实时节会房间刷新失败'
      })
    }, 300)
  }

  const queueExpeditionRoomRefresh = () => {
    if (expeditionRoomRefreshTimer !== null) return
    expeditionRoomRefreshTimer = window.setTimeout(() => {
      expeditionRoomRefreshTimer = null
      void useExpeditionRoomStore().refreshOverview({ silent: true }).catch(error => {
        lastError.value = error instanceof Error ? error.message : '实时远征房间刷新失败'
      })
    }, 300)
  }

  const queueMailboxRefresh = () => {
    if (mailboxRefreshTimer !== null) return
    mailboxRefreshTimer = window.setTimeout(() => {
      mailboxRefreshTimer = null
      void useMailboxStore().refreshList({ silent: true }).catch(error => {
        lastError.value = error instanceof Error ? error.message : '实时邮箱刷新失败'
      })
    }, 300)
  }

  const queueSocietyRefresh = () => {
    if (societyRefreshTimer !== null) return
    societyRefreshTimer = window.setTimeout(() => {
      societyRefreshTimer = null
      void useSocietyStore().refreshOverview({ silent: true }).catch(error => {
        lastError.value = error instanceof Error ? error.message : '实时村社刷新失败'
      })
    }, 300)
  }

  const queueCoopOrderRefresh = () => {
    if (coopOrderRefreshTimer !== null) return
    coopOrderRefreshTimer = window.setTimeout(() => {
      coopOrderRefreshTimer = null
      void useCoopOrderStore().refreshOverview({ silent: true }).catch(error => {
        lastError.value = error instanceof Error ? error.message : '实时求助单刷新失败'
      })
    }, 300)
  }

  const dispatchHallNotification = (payload: Record<string, unknown> | undefined) => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent(TAOYUAN_HALL_NOTIFICATION_EVENT, {
      detail: payload ?? {}
    }))
  }

  const queueActivityRoomRefresh = (payload: Record<string, unknown> | undefined) => {
    const domain = typeof payload?.domain === 'string' ? payload.domain : ''
    if (domain === 'festival') {
      queueFestivalRoomRefresh()
    } else if (domain === 'expedition') {
      queueExpeditionRoomRefresh()
    } else {
      queueFestivalRoomRefresh()
      queueExpeditionRoomRefresh()
    }
  }

  const upsertPresence = (entry: PresenceEntry) => {
    const nextKey = `${entry.username}:${entry.save_id ?? 'account'}`
    onlinePresence.value = [
      ...onlinePresence.value.filter(item => `${item.username}:${item.save_id ?? 'account'}` !== nextKey),
      entry
    ]
  }

  const removePresence = (entry: PresenceEntry) => {
    const nextKey = `${entry.username}:${entry.save_id ?? 'account'}`
    onlinePresence.value = onlinePresence.value.filter(item => `${item.username}:${item.save_id ?? 'account'}` !== nextKey)
  }

  const toPresenceEntry = (payload: Record<string, unknown> | undefined): PresenceEntry | null => {
    const rawUsername = typeof payload?.username === 'string' ? payload.username.trim() : ''
    if (!rawUsername) return null
    return {
      username: rawUsername,
      display_name: typeof payload?.display_name === 'string' ? payload.display_name : undefined,
      save_id: typeof payload?.save_id === 'number' ? payload.save_id : null,
      save_slot: typeof payload?.save_slot === 'number' ? payload.save_slot : null,
      connection_id: typeof payload?.connection_id === 'string' ? payload.connection_id : undefined
    }
  }

  const applyPresenceSnapshot = (payload: Record<string, unknown> | undefined) => {
    const entries = Array.isArray(payload?.online) ? payload.online : []
    onlinePresence.value = entries
      .map(entry => (entry && typeof entry === 'object' ? toPresenceEntry(entry as Record<string, unknown>) : null))
      .filter((entry): entry is PresenceEntry => !!entry)
  }

  const handleReady = (payload: Record<string, unknown> | undefined) => {
    connectionId.value = typeof payload?.connection_id === 'string' ? payload.connection_id : ''
    username.value = typeof payload?.username === 'string' ? payload.username : ''
    saveId.value = typeof payload?.save_id === 'number' ? payload.save_id : null
    saveSlot.value = typeof payload?.save_slot === 'number' ? payload.save_slot : null
    send('presence.snapshot')
    queueRelationshipRefresh()
  }

  const handleEnvelope = (envelope: RealtimeEnvelope) => {
    if (!envelope.type) return
    lastEventType.value = envelope.type
    lastEventAt.value = Date.now()

    if (envelope.type === 'realtime.ready') {
      handleReady(envelope.payload)
      return
    }
    if (envelope.type === 'presence.snapshot') {
      applyPresenceSnapshot(envelope.payload)
      return
    }
    if (envelope.type === 'presence.online') {
      const entry = toPresenceEntry(envelope.payload)
      if (entry) upsertPresence(entry)
      return
    }
    if (envelope.type === 'presence.offline') {
      const entry = toPresenceEntry(envelope.payload)
      if (entry) removePresence(entry)
      return
    }
    if (FRIEND_EVENT_TYPES.has(envelope.type)) {
      queueRelationshipRefresh()
      return
    }
    if (ACTIVITY_ROOM_EVENT_TYPES.has(envelope.type)) {
      queueActivityRoomRefresh(envelope.payload)
      return
    }
    if (envelope.type === 'notification.created') {
      const category = typeof envelope.payload?.category === 'string' ? envelope.payload.category : ''
      if (category === 'mail') queueMailboxRefresh()
      if (category === 'hall') dispatchHallNotification(envelope.payload)
      if (category === 'society') queueSocietyRefresh()
      if (category === 'coop_order') queueCoopOrderRefresh()
    }
  }

  const acknowledgeQueuedEnvelope = (envelope: RealtimeEnvelope) => {
    const queuedEventId = typeof envelope.queued_event_id === 'string' ? envelope.queued_event_id.trim() : ''
    if (!queuedEventId) return
    send('notification.ack', { id: queuedEventId })
  }

  const scheduleReconnect = () => {
    if (manuallyStopped || reconnectTimer !== null) return
    status.value = 'reconnecting'
    reconnectAttempt.value += 1
    const delay = Math.min(RECONNECT_MAX_DELAY_MS, RECONNECT_BASE_DELAY_MS * 2 ** Math.max(0, reconnectAttempt.value - 1))
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null
      void start()
    }, delay)
  }

  const start = async () => {
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined') return
    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) return

    clearReconnectTimer()
    manuallyStopped = false
    status.value = reconnectAttempt.value > 0 ? 'reconnecting' : 'connecting'
    lastError.value = ''

    const account = await forceRefreshCurrentAccountContext()
    if (!account.loggedIn) {
      status.value = 'idle'
      manuallyStopped = true
      return
    }
    if (manuallyStopped) return

    const nextSocket = new WebSocket(resolveRealtimeUrl())
    socket = nextSocket

    nextSocket.onopen = () => {
      if (socket !== nextSocket) return
      status.value = 'connected'
      reconnectAttempt.value = 0
      lastError.value = ''
      startPing()
    }

    nextSocket.onmessage = event => {
      if (typeof event.data !== 'string') return
      try {
        const envelope = JSON.parse(event.data) as RealtimeEnvelope
        handleEnvelope(envelope)
        acknowledgeQueuedEnvelope(envelope)
      } catch {
        lastError.value = '实时消息解析失败'
      }
    }

    nextSocket.onerror = () => {
      if (socket !== nextSocket) return
      lastError.value = '实时连接异常'
    }

    nextSocket.onclose = () => {
      if (socket !== nextSocket) return
      socket = null
      clearPingTimer()
      connectionId.value = ''
      if (manuallyStopped) {
        status.value = 'closed'
        return
      }
      scheduleReconnect()
    }
  }

  const stop = () => {
    manuallyStopped = true
    clearReconnectTimer()
    clearPingTimer()
    if (relationshipRefreshTimer !== null) {
      window.clearTimeout(relationshipRefreshTimer)
      relationshipRefreshTimer = null
    }
    if (festivalRoomRefreshTimer !== null) {
      window.clearTimeout(festivalRoomRefreshTimer)
      festivalRoomRefreshTimer = null
    }
    if (expeditionRoomRefreshTimer !== null) {
      window.clearTimeout(expeditionRoomRefreshTimer)
      expeditionRoomRefreshTimer = null
    }
    if (mailboxRefreshTimer !== null) {
      window.clearTimeout(mailboxRefreshTimer)
      mailboxRefreshTimer = null
    }
    if (societyRefreshTimer !== null) {
      window.clearTimeout(societyRefreshTimer)
      societyRefreshTimer = null
    }
    if (coopOrderRefreshTimer !== null) {
      window.clearTimeout(coopOrderRefreshTimer)
      coopOrderRefreshTimer = null
    }
    if (socket) {
      const currentSocket = socket
      socket = null
      currentSocket.close()
    }
    status.value = 'closed'
    connectionId.value = ''
  }

  return {
    status,
    isConnected,
    connectionId,
    username,
    saveId,
    saveSlot,
    lastEventType,
    lastEventAt,
    lastError,
    reconnectAttempt,
    onlinePresence,
    start,
    stop,
    send
  }
})
