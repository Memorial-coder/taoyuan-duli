import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { ensureCurrentAccount } from '@/utils/accountStorage'
import {
  acceptCoopOrder,
  cancelAcceptedCoopOrder,
  confirmCoopOrderDelivery,
  createCoopOrder,
  fetchCoopOrderOverview,
  retryCoopOrderCompensation,
  submitCoopOrderDelivery,
  type OnlineCoopOrderOverviewResponse,
  type OnlineCoopOrderScope,
  type OnlineCoopOrderType,
  type OnlineCoopRewardType,
} from '@/utils/onlineProfileApi'

const buildDefaultDeadlineInput = () => {
  const date = new Date(Date.now() + 48 * 60 * 60 * 1000)
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000)
  return localDate.toISOString().slice(0, 16)
}

export const useCoopOrderStore = defineStore('onlineCoopOrder', () => {
  const loading = ref(false)
  const actionRunning = ref(false)
  const errorMessage = ref('')
  const overview = ref<OnlineCoopOrderOverviewResponse | null>(null)
  const currentUsername = ref('')

  const titleDraft = ref('')
  const descriptionDraft = ref('')
  const orderTypeDraft = ref<OnlineCoopOrderType>('material_help')
  const scopeDraft = ref<OnlineCoopOrderScope>('public')
  const rewardTypeDraft = ref<OnlineCoopRewardType>('money')
  const rewardValueDraft = ref(200)
  const rewardLabelDraft = ref('铜钱回报')
  const deadlineAtDraft = ref(buildDefaultDeadlineInput())
  const deliveryDrafts = ref<Record<string, { itemId: string; quantity: number; note: string }>>({})

  const myOrders = computed(() =>
    (overview.value?.orders || []).filter(entry => entry.owner_username === currentUsername.value)
  )

  const myAcceptedOrders = computed(() =>
    (overview.value?.orders || []).filter(entry => entry.assignee_username === currentUsername.value)
  )

  const visibleOrders = computed(() =>
    (overview.value?.orders || []).filter(entry => entry.owner_username !== currentUsername.value)
  )

  const myReceipts = computed(() =>
    overview.value?.receipts || []
  )

  const myCompensations = computed(() =>
    overview.value?.compensations || []
  )

  const reputationSummary = computed(() =>
    overview.value?.reputation_summary || {
      total: 0,
      by_order_type: {},
      completed_count: 0,
      updated_at: 0,
      trust_level: { id: 'new', label: '初识互助' },
      specialty_ranks: [],
      top_helped_targets: [],
      top_helpers: [],
    }
  )

  const refreshOverview = async () => {
    loading.value = true
    errorMessage.value = ''
    try {
      const account = await ensureCurrentAccount()
      currentUsername.value = account && account !== 'guest' ? account : ''
      overview.value = await fetchCoopOrderOverview()
      return overview.value
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '获取求助单列表失败'
      throw error
    } finally {
      loading.value = false
    }
  }

  const resetDrafts = () => {
    titleDraft.value = ''
    descriptionDraft.value = ''
    orderTypeDraft.value = 'material_help'
    scopeDraft.value = 'public'
    rewardTypeDraft.value = 'money'
    rewardValueDraft.value = 200
    rewardLabelDraft.value = '铜钱回报'
    deadlineAtDraft.value = buildDefaultDeadlineInput()
  }

  const submitOrder = async () => {
    const parsedDate = new Date(deadlineAtDraft.value)
    if (Number.isNaN(parsedDate.getTime())) {
      errorMessage.value = '请先填写有效的截止时间'
      return
    }

    actionRunning.value = true
    errorMessage.value = ''
    try {
      await createCoopOrder({
        title: titleDraft.value.trim(),
        description: descriptionDraft.value.trim(),
        order_type: orderTypeDraft.value,
        scope: scopeDraft.value,
        deadline_at: Math.floor(parsedDate.getTime() / 1000),
        reward_type: rewardTypeDraft.value,
        reward_value: Math.max(1, Math.floor(Number(rewardValueDraft.value) || 0)),
        reward_label: rewardLabelDraft.value.trim(),
      })
      resetDrafts()
      await refreshOverview()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '发布求助单失败'
      throw error
    } finally {
      actionRunning.value = false
    }
  }

  const acceptOrder = async (orderId: string) => {
    actionRunning.value = true
    errorMessage.value = ''
    try {
      await acceptCoopOrder(orderId)
      await refreshOverview()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '接单失败'
      throw error
    } finally {
      actionRunning.value = false
    }
  }

  const cancelAcceptedOrder = async (orderId: string) => {
    actionRunning.value = true
    errorMessage.value = ''
    try {
      await cancelAcceptedCoopOrder(orderId)
      await refreshOverview()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '取消接单失败'
      throw error
    } finally {
      actionRunning.value = false
    }
  }

  const ensureDeliveryDraft = (orderId: string): { itemId: string; quantity: number; note: string } => {
    if (!deliveryDrafts.value[orderId]) {
      deliveryDrafts.value = {
        ...deliveryDrafts.value,
        [orderId]: {
          itemId: '',
          quantity: 1,
          note: '',
        },
      }
    }
    return deliveryDrafts.value[orderId]!
  }

  const submitDelivery = async (orderId: string) => {
    const draft = ensureDeliveryDraft(orderId)
    actionRunning.value = true
    errorMessage.value = ''
    try {
      await submitCoopOrderDelivery(orderId, {
        delivered_items: draft.itemId.trim()
          ? [{ item_id: draft.itemId.trim(), quantity: Math.max(1, Math.floor(Number(draft.quantity) || 1)) }]
          : [],
        result_note: draft.note.trim(),
      })
      deliveryDrafts.value = {
        ...deliveryDrafts.value,
        [orderId]: {
          itemId: '',
          quantity: 1,
          note: '',
        },
      }
      await refreshOverview()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '提交交付失败'
      throw error
    } finally {
      actionRunning.value = false
    }
  }

  const confirmDelivery = async (orderId: string) => {
    actionRunning.value = true
    errorMessage.value = ''
    try {
      await confirmCoopOrderDelivery(orderId)
      await refreshOverview()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '确认交付失败'
      throw error
    } finally {
      actionRunning.value = false
    }
  }

  const retryCompensation = async (compensationId: string) => {
    actionRunning.value = true
    errorMessage.value = ''
    try {
      await retryCoopOrderCompensation(compensationId)
      await refreshOverview()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '补偿重试失败'
      throw error
    } finally {
      actionRunning.value = false
    }
  }

  return {
    loading,
    actionRunning,
    errorMessage,
    overview,
    currentUsername,
    titleDraft,
    descriptionDraft,
    orderTypeDraft,
    scopeDraft,
    rewardTypeDraft,
    rewardValueDraft,
    rewardLabelDraft,
    deadlineAtDraft,
    deliveryDrafts,
    myOrders,
    myAcceptedOrders,
    visibleOrders,
    myReceipts,
    myCompensations,
    reputationSummary,
    refreshOverview,
    resetDrafts,
    submitOrder,
    acceptOrder,
    cancelAcceptedOrder,
    ensureDeliveryDraft,
    submitDelivery,
    confirmDelivery,
    retryCompensation,
  }
})
