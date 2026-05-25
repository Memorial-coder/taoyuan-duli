import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  acceptCohabitationContract,
  applyCohabitationFamilyBuildingRealBuild,
  confirmCohabitationFundLargeSpendDraft,
  consumeCohabitationFamilyBuildingMaterials,
  contributeCohabitationFund,
  createCohabitationContract,
  createCohabitationFundLargeSpendDraft,
  createCohabitationSeparationPreview,
  depositCohabitationWarehouseItem,
  executeCohabitationFundLargeSpendDraft,
  fetchCohabitationFamilyBuildings,
  fetchCohabitationFamilyFestivalSeats,
  fetchCohabitationFamilyOrders,
  fetchCohabitationFamilyRelations,
  fetchCohabitationFamilyReputation,
  fetchCohabitationFamilyRoles,
  fetchCohabitationFamilyVisibility,
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
  type CohabitationContract,
  type CohabitationContractCreatePayload,
  type CohabitationFamilyBuildingsPanel,
  type CohabitationFamilyFestivalSeatsPanel,
  type CohabitationFamilyOrdersPanel,
  type CohabitationFamilyRelationsPanel,
  type CohabitationFamilyReputationPanel,
  type CohabitationFamilyRolePanel,
  type CohabitationFamilyVisibilityPanel,
  type CohabitationFundSnapshot,
  type CohabitationOfflineStatus,
  type CohabitationOverviewResponse,
  type CohabitationPermissionsPanel,
  type CohabitationSeparationPreviewPayload,
  type CohabitationSharedMap,
  type CohabitationWarehouseSnapshot,
} from '@/utils/cohabitationApi'
import { ensureCurrentAccount } from '@/utils/accountStorage'

export const useCohabitationStore = defineStore('onlineCohabitation', () => {
  const overview = ref<CohabitationOverviewResponse | null>(null)
  const activeContractId = ref('')
  const currentAccount = ref('')
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
  const familyFestivalSeatsPanel = ref<CohabitationFamilyFestivalSeatsPanel | null>(null)
  const familyOrdersPanel = ref<CohabitationFamilyOrdersPanel | null>(null)
  const familyRelationsPanel = ref<CohabitationFamilyRelationsPanel | null>(null)
  const familyReputationPanel = ref<CohabitationFamilyReputationPanel | null>(null)
  const familyVisibilityPanel = ref<CohabitationFamilyVisibilityPanel | null>(null)
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
    familyFestivalSeatsPanel.value = null
    familyOrdersPanel.value = null
    familyRelationsPanel.value = null
    familyReputationPanel.value = null
    familyVisibilityPanel.value = null
    offlineStatus.value = null
  }

  const pickDefaultContract = () => {
    if (activeContractId.value && contracts.value.some(contract => contract.id === activeContractId.value)) return
    activeContractId.value = activeContracts.value[0]?.id || contracts.value[0]?.id || ''
  }

  const syncOverviewContract = (contract: CohabitationContract) => {
    if (!overview.value) return
    const exists = overview.value.contracts.some(entry => entry.id === contract.id)
    const nextContracts = exists
      ? overview.value.contracts.map(entry => entry.id === contract.id ? contract : entry)
      : [contract, ...overview.value.contracts]
    overview.value = {
      ...overview.value,
      contracts: nextContracts,
      summary: {
        ...overview.value.summary,
        total: nextContracts.length,
        pending: nextContracts.filter(entry => entry.status === 'pending_acceptance').length,
        active: nextContracts.filter(entry => entry.status === 'active').length,
        separation_previews: nextContracts.reduce((sum, entry) => sum + (entry.separation_previews?.length || 0), 0),
      },
    }
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
      const [mapResult, warehouseResult, fundResult, permissionsResult, roleResult, familyBuildingsResult, familyFestivalSeatsResult, familyOrdersResult, familyRelationsResult, familyReputationResult, familyVisibilityResult, offlineResult] = await Promise.all([
        fetchCohabitationSharedMap(contractId),
        fetchCohabitationWarehouse(contractId),
        fetchCohabitationFund(contractId),
        fetchCohabitationPermissions(contractId),
        fetchCohabitationFamilyRoles(contractId),
        fetchCohabitationFamilyBuildings(contractId),
        fetchCohabitationFamilyFestivalSeats(contractId),
        fetchCohabitationFamilyOrders(contractId),
        fetchCohabitationFamilyRelations(contractId),
        fetchCohabitationFamilyReputation(contractId),
        fetchCohabitationFamilyVisibility(contractId),
        fetchCohabitationOfflineStatus(contractId),
      ])
      sharedMap.value = mapResult?.shared_map ?? null
      warehouse.value = warehouseResult?.warehouse ?? null
      fund.value = fundResult?.fund ?? null
      permissionsPanel.value = permissionsResult?.permissions_panel ?? null
      rolePanel.value = roleResult?.role_panel ?? null
      familyBuildingsPanel.value = familyBuildingsResult?.family_buildings_panel ?? null
      familyFestivalSeatsPanel.value = familyFestivalSeatsResult?.family_festival_seats_panel ?? null
      familyOrdersPanel.value = familyOrdersResult?.family_orders_panel ?? null
      familyRelationsPanel.value = familyRelationsResult?.family_relations_panel ?? null
      familyReputationPanel.value = familyReputationResult?.family_reputation_panel ?? null
      familyVisibilityPanel.value = familyVisibilityResult?.family_visibility_panel ?? null
      offlineStatus.value = offlineResult?.offline_status ?? null
      return {
        sharedMap: sharedMap.value,
        warehouse: warehouse.value,
        fund: fund.value,
        permissionsPanel: permissionsPanel.value,
        rolePanel: rolePanel.value,
        familyBuildingsPanel: familyBuildingsPanel.value,
        familyFestivalSeatsPanel: familyFestivalSeatsPanel.value,
        familyOrdersPanel: familyOrdersPanel.value,
        familyRelationsPanel: familyRelationsPanel.value,
        familyReputationPanel: familyReputationPanel.value,
        familyVisibilityPanel: familyVisibilityPanel.value,
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
      currentAccount.value = await ensureCurrentAccount()
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

  const acceptContract = async (contractId: string) => {
    if (!contractId) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await acceptCohabitationContract(contractId)
      if (result?.contract) {
        activeContractId.value = result.contract.id
        syncOverviewContract(result.contract)
        if (result.contract.status === 'active') {
          await refreshSelectedDetails({ silent: true })
        } else {
          clearDetails()
        }
      }
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '接受共同庄园契约失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const createContract = async (payload: CohabitationContractCreatePayload) => {
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await createCohabitationContract(payload)
      if (result?.contract) {
        activeContractId.value = result.contract.id
        syncOverviewContract(result.contract)
        if (result.contract.status === 'active') {
          await refreshSelectedDetails({ silent: true })
        } else {
          clearDetails()
        }
      }
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '创建共同庄园契约失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const createSeparationPreview = async (payload: CohabitationSeparationPreviewPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await createCohabitationSeparationPreview(activeContractId.value, payload)
      if (result?.contract) {
        syncOverviewContract(result.contract)
        await refreshSelectedDetails({ silent: true })
      }
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '生成分居预览失败'
      throw error
    } finally {
      actionLoading.value = false
    }
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

  const createSharedFundLargeSpendDraft = async (payload: {
    amount: number
    purpose: string
    target_ref: string
    memo?: string
    idempotency_key: string
  }) => {
    if (!activeContractId.value || !canOpenSelectedContract.value) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await createCohabitationFundLargeSpendDraft(activeContractId.value, payload)
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
      errorMessage.value = error instanceof Error ? error.message : '创建共同基金大额草案失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const confirmSharedFundLargeSpendDraft = async (draftId: string, payload: {
    memo?: string
    idempotency_key: string
  }) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !draftId) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await confirmCohabitationFundLargeSpendDraft(activeContractId.value, draftId, payload)
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
      errorMessage.value = error instanceof Error ? error.message : '确认共同基金大额草案失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const executeSharedFundLargeSpendDraft = async (draftId: string, payload: {
    memo?: string
    idempotency_key: string
  }) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !draftId) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await executeCohabitationFundLargeSpendDraft(activeContractId.value, draftId, payload)
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
      errorMessage.value = error instanceof Error ? error.message : '执行共同基金大额草案扣款失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const applyFamilyBuildingRealBuild = async (payload: {
    building_ledger_id: string
    memo?: string
    idempotency_key: string
  }) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.building_ledger_id) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await applyCohabitationFamilyBuildingRealBuild(activeContractId.value, payload)
      if (result?.family_buildings_panel) familyBuildingsPanel.value = result.family_buildings_panel
      if (result?.contract && overview.value) {
        overview.value = {
          ...overview.value,
          contracts: overview.value.contracts.map(contract => contract.id === result.contract.id ? result.contract : contract),
        }
      }
      await refreshSelectedDetails({ silent: true })
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '家族建筑真实落账失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const consumeFamilyBuildingMaterials = async (payload: {
    building_ledger_id: string
    memo?: string
    idempotency_key: string
  }) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.building_ledger_id) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await consumeCohabitationFamilyBuildingMaterials(activeContractId.value, payload)
      if (result?.family_buildings_panel) familyBuildingsPanel.value = result.family_buildings_panel
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
      errorMessage.value = error instanceof Error ? error.message : '消耗家族建筑共同仓库材料失败'
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
    currentAccount,
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
    familyFestivalSeatsPanel,
    familyOrdersPanel,
    familyRelationsPanel,
    familyReputationPanel,
    familyVisibilityPanel,
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
    acceptContract,
    createContract,
    createSeparationPreview,
    contributeSharedFund,
    spendSharedFund,
    createSharedFundLargeSpendDraft,
    confirmSharedFundLargeSpendDraft,
    executeSharedFundLargeSpendDraft,
    applyFamilyBuildingRealBuild,
    consumeFamilyBuildingMaterials,
    depositSharedWarehouseItem,
    sellSharedWarehouseItem,
    withdrawSharedWarehouseItem,
    updateMemberPermissions,
    updateMemberRole,
  }
})
