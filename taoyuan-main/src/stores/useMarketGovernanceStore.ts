import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchMarketGovernance, type MarketGovernancePublicSnapshot } from '@/utils/marketGovernanceApi'

export const useMarketGovernanceStore = defineStore('marketGovernance', () => {
  const governance = ref<MarketGovernancePublicSnapshot | null>(null)
  const loading = ref(false)
  const errorMessage = ref('')
  const lastLoadedAt = ref(0)

  const sources = computed(() => governance.value?.sources ?? [])

  const refreshGovernance = async (options: { silent?: boolean } = {}) => {
    if (!options.silent) {
      loading.value = true
      errorMessage.value = ''
    }
    try {
      governance.value = await fetchMarketGovernance()
      lastLoadedAt.value = Date.now()
      return governance.value
    } catch (error) {
      if (!options.silent) {
        errorMessage.value = error instanceof Error ? error.message : '获取集市调控失败'
      }
      throw error
    } finally {
      if (!options.silent) loading.value = false
    }
  }

  return {
    governance,
    loading,
    errorMessage,
    lastLoadedAt,
    sources,
    refreshGovernance,
  }
})
