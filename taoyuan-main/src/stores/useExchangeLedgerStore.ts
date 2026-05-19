import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  fetchExchangeLedger,
  reportExchangeLedgerDispute,
  type ExchangeLedgerDisputeActionResponse,
  type ExchangeLedgerEntry,
  type ExchangeLedgerOverview
} from '@/utils/exchangeLedgerApi'

export const useExchangeLedgerStore = defineStore('exchangeLedger', () => {
  const ledger = ref<ExchangeLedgerOverview | null>(null)
  const loading = ref(false)
  const actionRunning = ref(false)
  const errorMessage = ref('')
  const lastLoadedAt = ref(0)

  const entries = computed<ExchangeLedgerEntry[]>(() => ledger.value?.entries ?? [])
  const disputes = computed(() => ledger.value?.my_disputes ?? [])
  const summary = computed(() => ledger.value?.summary ?? null)
  const reasonOptions = computed(() => ledger.value?.reason_options ?? [])

  const refreshLedger = async () => {
    loading.value = true
    errorMessage.value = ''
    try {
      ledger.value = await fetchExchangeLedger()
      lastLoadedAt.value = Date.now()
      return ledger.value
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '获取交换记录失败'
      throw error
    } finally {
      loading.value = false
    }
  }

  const createDispute = async (entryId: string, payload: {
    reason_code: string
    note?: string
  }) => {
    actionRunning.value = true
    errorMessage.value = ''
    try {
      const result = await reportExchangeLedgerDispute(entryId, payload)
      ledger.value = result.ledger
      lastLoadedAt.value = Date.now()
      return result as ExchangeLedgerDisputeActionResponse
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '提交交换争议失败'
      throw error
    } finally {
      actionRunning.value = false
    }
  }

  return {
    ledger,
    loading,
    actionRunning,
    errorMessage,
    lastLoadedAt,
    entries,
    disputes,
    summary,
    reasonOptions,
    refreshLedger,
    createDispute,
  }
})
