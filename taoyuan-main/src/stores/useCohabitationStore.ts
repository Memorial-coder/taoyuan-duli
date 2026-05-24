import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  contributeCohabitationFund,
  depositCohabitationWarehouseItem,
  fetchCohabitationFamilyBuildings,
  fetchCohabitationFamilyOrders,
  fetchCohabitationFamilyRelations,
  fetchCohabitationFamilyReputation,
  fetchCohabitationFamilyRoles,
  fetchCohabitationFund,
  fetchCohabitationOfflineStatus,
  fetchCohabitationOverview,
  fetchCohabitationPermissions,
  fetchCohabitationSharedMap,
  fetchCohabitationWarehouse,
  sellCohabitationWarehouseItem,
  spendCohabitationFund,
  updateCohabitationFamilyRole,
  updateCohabitationPermissions,
  withdrawCohabitationWarehouseItem,
  type CohabitationFamilyBuildingsPanel,
  type CohabitationFamilyOrdersPanel,
  type CohabitationFamilyRelationsPanel,
  type CohabitationFamilyReputationPanel,
  type CohabitationFamilyRolePanel,
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
  const rolePanel = ref<CohabitationFamilyRolePanel | null>(null)
  const familyBuildingsPanel = ref<CohabitationFamilyBuildingsPanel | null>(null)
  const familyOrdersPanel = ref<CohabitationFamilyOrdersPanel | null>(null)
  const familyRelationsPanel = ref<CohabitationFamilyRelationsPanel | null>(null)
  const familyReputationPanel = ref<CohabitationFamilyReputationPanel | null>(null)
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
    rolePanel.value = null
    familyBuildingsPanel.value = null
    familyOrdersPanel.value = null
    familyRelationsPanel.value = null
    familyReputationPanel.value = null
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
      const [mapResult, warehouseResult, fundResult, permissionsResult, roleResult, familyBuildingsResult, familyOrdersResult, familyRelationsResult, familyReputationResult, offlineResult] = await Promise.all([
        fetchCohabitationSharedMap(contractId),
        fetchCohabitationWarehouse(contractId),
        fetchCohabitationFund(contractId),
        fetchCohabitationPermissions(contractId),
        fetchCohabitationFamilyRoles(contractId),
        fetchCohabitationFamilyBuildings(contractId),
        fetchCohabitationFamilyOrders(contractId),
        fetchCohabitationFamilyRelations(contractId),
        fetchCohabitationFamilyReputation(contractId),
        fetchCohabitationOfflineStatus(contractId),
      ])
      sharedMap.value = mapResult?.shared_map ?? null
      warehouse.value = warehouseResult?.warehouse ?? null
      fund.value = fundResult?.fund ?? null
      permissionsPanel.value = permissionsResult?.permissions_panel ?? null
      rolePanel.value = roleResult?.role_panel ?? null
      familyBuildingsPanel.value = familyBuildingsResult?.family_buildings_panel ?? null
      familyOrdersPanel.value = familyOrdersResult?.family_orders_panel ?? null
      familyRelationsPanel.value = familyRelationsResult?.family_relations_panel ?? null
      familyReputationPanel.value = familyReputationResult?.family_reputation_panel ?? null
      offlineStatus.value = offlineResult?.offline_status ?? null
      return {
        sharedMap: sharedMap.value,
        warehouse: warehouse.value,
        fund: fund.value,
        permissionsPanel: permissionsPanel.value,
        rolePanel: rolePanel.value,
        familyBuildingsPanel: familyBuildingsPanel.value,
        familyOrdersPanel: familyOrdersPanel.value,
        familyRelationsPanel: familyRelationsPanel.value,
        familyReputationPanel: familyReputationPanel.value,
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

  const contributeSharedFund = async (payload: {
    amount: number
    purpose?: string
    memo?: string
    idempotency_key: string
  }) => {
    if (!activeContractId.value || !canOpenSelectedContract.value) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await contributeCohabitationFund(activeContractId.value, payload)
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
      errorMessage.value = error instanceof Error ? error.message : '共同基金注资失败'
      throw error
    } finally {
      actionLoading.value = false
    }
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

  const depositSharedWarehouseItem = async (payload: {
    item_id: string
    quantity: number
    quality?: string
    idempotency_key: string
  }) => {
    if (!activeContractId.value || !canOpenSelectedContract.value) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await depositCohabitationWarehouseItem(activeContractId.value, payload)
      if (result?.warehouse) warehouse.value = result.warehouse
      if (result?.contract && overview.value) {
        overview.value = {
          ...overview.value,
          contracts: overview.value.contracts.map(contract => contract.id === result.contract.id ? result.contract : contract),
        }
      }
      await refreshSelectedDetails({ silent: true })
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '放入共同仓库物品失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const sellSharedWarehouseItem = async (payload: {
    item_id: string
    quantity: number
    quality?: string
    memo?: string
    idempotency_key: string
  }) => {
    if (!activeContractId.value || !canOpenSelectedContract.value) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await sellCohabitationWarehouseItem(activeContractId.value, payload)
      if (result?.warehouse) warehouse.value = result.warehouse
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
      errorMessage.value = error instanceof Error ? error.message : '卖出共同仓库物品失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const withdrawSharedWarehouseItem = async (payload: {
    item_id: string
    quantity: number
    quality?: string
    idempotency_key: string
  }) => {
    if (!activeContractId.value || !canOpenSelectedContract.value) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await withdrawCohabitationWarehouseItem(activeContractId.value, payload)
      if (result?.warehouse) warehouse.value = result.warehouse
      if (result?.contract && overview.value) {
        overview.value = {
          ...overview.value,
          contracts: overview.value.contracts.map(contract => contract.id === result.contract.id ? result.contract : contract),
        }
      }
      await refreshSelectedDetails({ silent: true })
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '取出共同仓库物品失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const updateMemberPermissions = async (payload: {
    target_username: string
    permissions: Record<string, Record<string, boolean>>
    note?: string
    idempotency_key: string
  }) => {
    if (!activeContractId.value || !canOpenSelectedContract.value) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await updateCohabitationPermissions(activeContractId.value, payload)
      if (result?.permissions_panel) permissionsPanel.value = result.permissions_panel
      if (result?.contract && overview.value) {
        overview.value = {
          ...overview.value,
          contracts: overview.value.contracts.map(contract => contract.id === result.contract.id ? result.contract : contract),
        }
      }
      await refreshSelectedDetails({ silent: true })
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '更新共同庄园权限失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const updateMemberRole = async (payload: {
    target_username: string
    manor_role: string
    note?: string
    idempotency_key: string
  }) => {
    if (!activeContractId.value || !canOpenSelectedContract.value) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await updateCohabitationFamilyRole(activeContractId.value, payload)
      if (result?.role_panel) rolePanel.value = result.role_panel
      if (result?.contract && overview.value) {
        overview.value = {
          ...overview.value,
          contracts: overview.value.contracts.map(contract => contract.id === result.contract.id ? result.contract : contract),
        }
      }
      await refreshSelectedDetails({ silent: true })
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '调整家族庄园职位失败'
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
    rolePanel,
    familyBuildingsPanel,
    familyOrdersPanel,
    familyRelationsPanel,
    familyReputationPanel,
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
    contributeSharedFund,
    spendSharedFund,
    depositSharedWarehouseItem,
    sellSharedWarehouseItem,
    withdrawSharedWarehouseItem,
    updateMemberPermissions,
    updateMemberRole,
  }
})
