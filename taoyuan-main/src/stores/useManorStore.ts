import { ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchOwnManorSnapshot, type OnlineManorSnapshot } from '@/utils/onlineProfileApi'

export const useManorStore = defineStore('onlineManor', () => {
  const loading = ref(false)
  const snapshot = ref<OnlineManorSnapshot | null>(null)
  const errorMessage = ref('')

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

  return {
    loading,
    snapshot,
    errorMessage,
    refreshSnapshot,
  }
})
