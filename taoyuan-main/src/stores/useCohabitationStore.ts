import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  fetchCohabitationFund,
  fetchCohabitationOfflineStatus,
  fetchCohabitationOverview,
  fetchCohabitationPermissions,
  fetchCohabitationSharedMap,
  fetchCohabitationWarehouse,
  spendCohabitationFund,
  type CohabitationFundSnapshot,
  type CohabitationOfflineStatus,
  type CohabitationOverviewResponse,
  type CohabitationPermissionsPanel,
  type CohabitationSharedMap,
  type CohabitationWarehouseSnapshot,
} from '@/utils/cohabitationApi'

export const useCohabitationStore = defineStore('onlineCohabitation', () => {
  const overview = ref<CohabitationOverviewResponse | null>(null)
  const activeContractId = ref('')
  const loading = ref(false)
  const detailsLoading = ref(false)
  const actionLoading = ref(false)
  const errorMessage = ref('')

  const sharedMap = ref<CohabitationSharedMap | null>(null)
  const warehouse = ref<CohabitationWarehouseSnapshot | null>(null)
  const fund = ref<CohabitationFundSnapshot | null>(null)
  const permissionsPanel = ref<CohabitationPermissionsPanel | null>(null)
  const offlineStatus = ref<CohabitationOfflineStatus | null>(null)

  const contracts = computed(() => overview.value?.contracts ?? [])
  const summary = computed(() => overview.value?.summary ?? {
    total: 0,
    pending: 0,
    active: 0,
    separation_previews: 0,
  })
  const activeContracts = computed(() => contracts.value.filter(contract => contract.status === 'active'))
  const selectedContract = computed(() => contracts.value.find(contract => contract.id === activeContractId.value) ?? null)
  const canOpenSelectedContract = computed(() => selectedContract.value?.status === 'active')

  const clearDetails = () => {
    sharedMap.value = null
    warehouse.value = null
    fund.value = null
    permissionsPanel.value = null
    offlineStatus.value = null
  }

  const pickDefaultContract = () => {
    if (activeContractId.value && contracts.value.some(contract => contract.id === activeContractId.value)) return
    activeContractId.value = activeContracts.value[0]?.id || contracts.value[0]?.id || ''
  }

  const refreshSelectedDetails = async (options: { silent?: boolean } = {}) => {
    const contractId = activeContractId.value
    const contract = selectedContract.value
    if (!contractId || contract?.status !== 'active') {
      clearDetails()
      return null
    }
    if (!options.silent) {
      detailsLoading.value = true
      errorMessage.value = ''
    }
    try {
      const [mapResult, warehouseResult, fundResult, permissionsResult, offlineResult] = await Promise.all([
        fetchCohabitationSharedMap(contractId),
        fetchCohabitationWarehouse(contractId),
        fetchCohabitationFund(contractId),
        fetchCohabitationPermissions(contractId),
        fetchCohabitationOfflineStatus(contractId),
      ])
      sharedMap.value = mapResult?.shared_map ?? null
      warehouse.value = warehouseResult?.warehouse ?? null
      fund.value = fundResult?.fund ?? null
      permissionsPanel.value = permissionsResult?.permissions_panel ?? null
      offlineStatus.value = offlineResult?.offline_status ?? null
      return {
        sharedMap: sharedMap.value,
        warehouse: warehouse.value,
        fund: fund.value,
        permissionsPanel: permissionsPanel.value,
        offlineStatus: offlineStatus.value,
      }
    } catch (error) {
      if (!options.silent) {
        errorMessage.value = error instanceof Error ? error.message : '获取共同庄园详情失败'
      }
      clearDetails()
      throw error
    } finally {
      if (!options.silent) detailsLoading.value = false
    }
  }

  const refreshOverview = async (options: { silent?: boolean } = {}) => {
    if (!options.silent) {
      loading.value = true
      errorMessage.value = ''
    }
    try {
      overview.value = await fetchCohabitationOverview()
      pickDefaultContract()
      if (canOpenSelectedContract.value) {
        await refreshSelectedDetails({ silent: true })
      } else {
        clearDetails()
      }
      return overview.value
    } catch (error) {
      if (!options.silent) {
        overview.value = null
        clearDetails()
        errorMessage.value = error instanceof Error ? error.message : '获取共同庄园契约失败'
      }
      throw error
    } finally {
      if (!options.silent) loading.value = false
    }
  }

  const selectContract = async (contractId: string) => {
    activeContractId.value = contractId
    await refreshSelectedDetails().catch(() => {})
  }

  const refreshAll = async () => {
    await refreshOverview().catch(() => {})
  }

  const spendSharedFund = async (payload: {
    amount: number
    purpose: string
    target_ref?: string
    auto_pay?: boolean
    memo?: string
    idempotency_key: string
  }) => {
    if (!activeContractId.value || !canOpenSelectedContract.value) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await spendCohabitationFund(activeContractId.value, payload)
      if (result?.fund) fund.value = result.fund
      if (result?.contract && overview.value) {
        overview.value = {
          ...overview.value,
          contracts: overview.value.contracts.map(contract => contract.id === result.contract.id ? result.contract : contract),
        }
      }
      await refreshSelectedDetails({ silent: true })
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '共同基金支出失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  return {
    overview,
    activeContractId,
    loading,
    detailsLoading,
    actionLoading,
    errorMessage,
    sharedMap,
    warehouse,
    fund,
    permissionsPanel,
    offlineStatus,
    contracts,
    summary,
    activeContracts,
    selectedContract,
    canOpenSelectedContract,
    refreshOverview,
    refreshSelectedDetails,
    selectContract,
    refreshAll,
    spendSharedFund,
  }
})
