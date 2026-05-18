import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { ensureCurrentAccount } from '@/utils/accountStorage'
import {
  createCoopOrder,
  fetchCoopOrderOverview,
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

  const myOrders = computed(() =>
    (overview.value?.orders || []).filter(entry => entry.owner_username === currentUsername.value)
  )

  const visibleOrders = computed(() =>
    (overview.value?.orders || []).filter(entry => entry.owner_username !== currentUsername.value)
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
    myOrders,
    visibleOrders,
    refreshOverview,
    resetDrafts,
    submitOrder,
  }
})
