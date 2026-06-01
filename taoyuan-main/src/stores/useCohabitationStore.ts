import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { isProtectedApiError } from '@/utils/protectedApi'
import {
  acceptCohabitationContract,
  acceptCohabitationFamilyOrder,
  applyCohabitationFamilyBuildingRealBuild,
  approveCohabitationFamilyBuildingRealDemolitionReview,
  awardCohabitationFamilyReputation,
  bindCohabitationFamilyBuildingRealDemolitionMainStateExactTargets,
  buyCohabitationSharedAnimal,
  claimCohabitationFamilyReputationReward,
  confirmCohabitationFundLargeSpendDraft,
  confirmCohabitationSeparationSharedFundDelta,
  confirmCohabitationWarehouseHighValueWithdrawalDraft,
  confirmCohabitationSeparationPreview,
  consumeCohabitationFamilyBuildingMaterials,
  consumeCohabitationFamilyFestivalSupplies,
  contributeCohabitationFund,
  careCohabitationSharedPlot,
  careCohabitationSharedPet,
  collectCohabitationOfflineAutoIncome,
  collectCohabitationSharedAnimalProduct,
  createCohabitationContract,
  createCohabitationFamilyFestivalRoom,
  createCohabitationFamilyOrder,
  createCohabitationFundLargeSpendDraft,
  createCohabitationWarehouseHighValueWithdrawalDraft,
  createCohabitationSeparationPreview,
  depositCohabitationWarehouseItem,
  deliverCohabitationFamilyOrder,
  executeCohabitationFamilyBuildingRealDemolitionMainStateExactMutation,
  executeCohabitationFamilyBuildingRealDemolitionMainStateExactTargets,
  executeCohabitationFamilyBuildingRealDemolitionMainStateMutation,
  executeCohabitationWarehouseHighValueWithdrawalDraft,
  executeCohabitationSeparationAssetReturn,
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
  fetchCohabitationSharedAnimals,
  fetchCohabitationSharedMap,
  fetchCohabitationSharedPets,
  fetchCohabitationWarehouse,
  fetchCohabitationWarehouseHighValueWithdrawalCompensationAuditBundle,
  feedCohabitationSharedAnimal,
  fertilizeCohabitationSharedPlot,
  guardCohabitationFamilyBuildingRealDemolitionMainStateMutation,
  mergeCohabitationOfflineQueue,
  harvestCohabitationSharedPlot,
  petCohabitationSharedAnimal,
  preflightCohabitationOfflineConflicts,
  resolveCohabitationOfflineConflicts,
  previewCohabitationFamilyBuildingRealDemolitionMainState,
  plantCohabitationSharedPlot,
  processCohabitationSharedWorkshopRecipe,
  recordCohabitationSeparationStoryCinematicPlayback,
  recordCohabitationFundHighRiskReceipt,
  recordCohabitationFamilyChildCare,
  recordCohabitationWarehouseHighValueWithdrawalCompensationExecution,
  recordCohabitationWarehouseHighValueWithdrawalCompensationPreflight,
  recordCohabitationWarehouseHighValueWithdrawalManualAppealResolution,
  recordCohabitationWarehouseHighValueWithdrawalOperatorReceiptAuditReview,
  recoverCohabitationWarehouseGovernance,
  refundCohabitationFamilyBuildingFund,
  refundCohabitationSeparationSharedFund,
  rejectCohabitationFamilyBuildingRealDemolitionReview,
  replayCohabitationFamilyBuildingCompensation,
  requestCohabitationFamilyBuildingRealDemolitionExecution,
  requestCohabitationFamilyBuildingRealDemolitionReview,
  requestCohabitationSeparationExecution,
  resolveCohabitationSeparationChildArrangement,
  resolveCohabitationSeparationFamilyStory,
  resolveCohabitationFamilyBuildingRealDemolitionMainStateExactTargets,
  restoreCohabitationDefaultPermissions,
  restoreCohabitationFamilyBuildingMaterials,
  reserveCohabitationFamilyFestivalSeats,
  rollbackCohabitationContractSafeVersion,
  rollbackCohabitationFamilyBuilding,
  rollbackCohabitationFamilyVisibility,
  rollbackCohabitationWarehouseHighValueWithdrawalDraft,
  returnCohabitationSeparationSharedWarehouse,
  sellCohabitationSharedAnimal,
  sellCohabitationWarehouseItem,
  settleCohabitationDailyBonus,
  settleCohabitationFamilyFestivalRewards,
  settleCohabitationFamilyOrder,
  splitCohabitationSeparationDecorationsBuildings,
  spendCohabitationFund,
  submitCohabitationRecoveryAppeal,
  submitCohabitationFamilyWish,
  purchaseCohabitationSharedFundShopItem,
  updateCohabitationFamilyVisibility,
  updateCohabitationFamilyRole,
  updateCohabitationPermissions,
  verifyCohabitationFamilyBuildingRealDemolitionMainStateMapping,
  waterCohabitationSharedPlot,
  writeCohabitationFamilyBuildingRealDemolitionPersonalSave,
  writeCohabitationSeparationPersonalFarmReturns,
  writeCohabitationSeparationPersonalFamilyReceipts,
  writeCohabitationSeparationPersonalStoryReceipts,
  withdrawCohabitationWarehouseItem,
  type CohabitationContract,
  type CohabitationContractCreatePayload,
  type CohabitationDailySettlePayload,
  type CohabitationSharedFarmCarePayload,
  type CohabitationFamilyBuildingsPanel,
  type CohabitationFamilyBuildingMainStateExecutePayload,
  type CohabitationFamilyBuildingMainStateExactExecutePayload,
  type CohabitationFamilyBuildingMainStateExactMutationPayload,
  type CohabitationFamilyBuildingMainStateExactTargetResolutionPayload,
  type CohabitationFamilyBuildingMainStateExactTargetPayload,
  type CohabitationFamilyBuildingMainStateMutationGuardPayload,
  type CohabitationFamilyBuildingMainStateMappingPayload,
  type CohabitationFamilyFestivalRoomPayload,
  type CohabitationFamilyFestivalSeatReservePayload,
  type CohabitationFamilyFestivalSeatsPanel,
  type CohabitationFamilyFestivalSettlePayload,
  type CohabitationFamilyFestivalSuppliesPayload,
  type CohabitationFamilyChildCarePayload,
  type CohabitationFamilyOrderActionPayload,
  type CohabitationFamilyOrderCreatePayload,
  type CohabitationFamilyOrdersPanel,
  type CohabitationFamilyRelationsPanel,
  type CohabitationFamilyReputationAwardPayload,
  type CohabitationFamilyReputationPanel,
  type CohabitationFamilyReputationRewardClaimPayload,
  type CohabitationFamilyRolePanel,
  type CohabitationFamilyVisibilityRollbackPayload,
  type CohabitationFamilyVisibilityPanel,
  type CohabitationFamilyVisibilityUpdatePayload,
  type CohabitationFamilyWishSubmitPayload,
  type CohabitationFundShopPurchasePayload,
  type CohabitationFundSnapshot,
  type CohabitationFundHighRiskReceiptPayload,
  type CohabitationOfflineStatus,
  type CohabitationOfflineAutoIncomeCollectPayload,
  type CohabitationOfflineConflictAutoResolutionSummary,
  type CohabitationOfflineConflictPreflightPayload,
  type CohabitationOfflineConflictPreflightSummary,
  type CohabitationOfflineConflictResolvePayload,
  type CohabitationOfflineQueueMergePayload,
  type CohabitationOfflineQueueMergeSummary,
  type CohabitationOverviewResponse,
  type CohabitationPermissionsPanel,
  type CohabitationPermissionDefaultRestorePayload,
  type CohabitationRecoveryAppealPayload,
  type CohabitationContractSafeVersionRollbackPayload,
  type CohabitationSeparationAssetReturnExecutePayload,
  type CohabitationSeparationChildArrangementResolvePayload,
  type CohabitationSeparationDecorationBuildingSplitPayload,
  type CohabitationSeparationExecutionRequestPayload,
  type CohabitationSeparationFamilyStoryResolvePayload,
  type CohabitationSeparationStoryCinematicPlaybackPayload,
  type CohabitationSeparationPersonalFarmWritePayload,
  type CohabitationSeparationPersonalFamilyReceiptsPayload,
  type CohabitationSeparationPersonalStoryReceiptsPayload,
  type CohabitationSeparationPreviewConfirmPayload,
  type CohabitationSeparationPreviewPayload,
  type CohabitationSeparationSharedFundDeltaConfirmPayload,
  type CohabitationSeparationSharedFundRefundPayload,
  type CohabitationSeparationSharedWarehouseReturnPayload,
  type CohabitationWarehouseHighValueWithdrawalConfirmPayload,
  type CohabitationWarehouseHighValueWithdrawalDraftPayload,
  type CohabitationWarehouseHighValueWithdrawalExecutePayload,
  type CohabitationWarehouseHighValueWithdrawalRollbackPayload,
  type CohabitationWarehouseCompensationAuditBundle,
  type CohabitationWarehouseCompensationExecutionPayload,
  type CohabitationWarehouseCompensationPreflightPayload,
  type CohabitationWarehouseManualAppealResolutionPayload,
  type CohabitationWarehouseOperatorReceiptAuditReviewPayload,
  type CohabitationWarehouseGovernanceRecoveryPayload,
  type CohabitationSharedAnimalBuyPayload,
  type CohabitationSharedAnimalFeedPayload,
  type CohabitationSharedAnimalPetPayload,
  type CohabitationSharedAnimalProductPayload,
  type CohabitationSharedAnimalSellPayload,
  type CohabitationSharedAnimals,
  type CohabitationSharedPetCarePayload,
  type CohabitationSharedPets,
  type CohabitationSharedFarmHarvestPayload,
  type CohabitationSharedFarmFertilizePayload,
  type CohabitationSharedFarmPlantPayload,
  type CohabitationSharedFarmWaterPayload,
  type CohabitationSharedWorkshopProcessPayload,
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
  const sharedAnimals = ref<CohabitationSharedAnimals | null>(null)
  const sharedPets = ref<CohabitationSharedPets | null>(null)
  const warehouse = ref<CohabitationWarehouseSnapshot | null>(null)
  const warehouseCompensationAuditBundle = ref<CohabitationWarehouseCompensationAuditBundle | null>(null)
  const fund = ref<CohabitationFundSnapshot | null>(null)
  const permissionsPanel = ref<CohabitationPermissionsPanel | null>(null)
  const rolePanel = ref<CohabitationFamilyRolePanel | null>(null)
  const familyBuildingsPanel = ref<CohabitationFamilyBuildingsPanel | null>(null)
  const familyFestivalSeatsPanel = ref<CohabitationFamilyFestivalSeatsPanel | null>(null)
  const familyOrdersPanel = ref<CohabitationFamilyOrdersPanel | null>(null)
  const familyRelationsPanel = ref<CohabitationFamilyRelationsPanel | null>(null)
  const familyReputationPanel = ref<CohabitationFamilyReputationPanel | null>(null)
  const familyVisibilityPanel = ref<CohabitationFamilyVisibilityPanel | null>(null)
  const offlineQueueMerge = ref<CohabitationOfflineQueueMergeSummary | null>(null)
  const offlineConflictPreflight = ref<CohabitationOfflineConflictPreflightSummary | null>(null)
  const offlineConflictAutoResolution = ref<CohabitationOfflineConflictAutoResolutionSummary | null>(null)
  const offlineStatus = ref<CohabitationOfflineStatus | null>(null)
  const dailySettlement = ref<Record<string, unknown> | null>(null)

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
    sharedAnimals.value = null
    sharedPets.value = null
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
    offlineQueueMerge.value = null
    offlineConflictPreflight.value = null
    offlineConflictAutoResolution.value = null
    offlineStatus.value = null
    dailySettlement.value = null
    warehouseCompensationAuditBundle.value = null
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

  const syncFamilyManorWriteResult = async (result: {
    contract?: CohabitationContract
    family_orders_panel?: CohabitationFamilyOrdersPanel
    family_reputation_panel?: CohabitationFamilyReputationPanel
    family_visibility_panel?: CohabitationFamilyVisibilityPanel
    family_festival_seats_panel?: CohabitationFamilyFestivalSeatsPanel
    fund?: CohabitationFundSnapshot
    warehouse?: CohabitationWarehouseSnapshot
  } | null | undefined) => {
    if (result?.contract) syncOverviewContract(result.contract)
    if (result?.family_orders_panel) familyOrdersPanel.value = result.family_orders_panel
    if (result?.family_reputation_panel) familyReputationPanel.value = result.family_reputation_panel
    if (result?.family_visibility_panel) familyVisibilityPanel.value = result.family_visibility_panel
    if (result?.family_festival_seats_panel) familyFestivalSeatsPanel.value = result.family_festival_seats_panel
    if (result?.fund) fund.value = result.fund
    if (result?.warehouse) warehouse.value = result.warehouse
    await refreshSelectedDetails({ silent: true })
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
      const [mapResult, animalsResult, petsResult, warehouseResult, fundResult, permissionsResult, roleResult, familyBuildingsResult, familyFestivalSeatsResult, familyOrdersResult, familyRelationsResult, familyReputationResult, familyVisibilityResult, offlineResult] = await Promise.all([
        fetchCohabitationSharedMap(contractId),
        fetchCohabitationSharedAnimals(contractId),
        fetchCohabitationSharedPets(contractId),
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
      sharedAnimals.value = animalsResult?.shared_animals ?? null
      sharedPets.value = petsResult?.shared_pets ?? null
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
        sharedAnimals: sharedAnimals.value,
        sharedPets: sharedPets.value,
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
    warehouseCompensationAuditBundle.value = null
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

  const confirmSeparationPreview = async (previewId: string, payload: CohabitationSeparationPreviewConfirmPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !previewId) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await confirmCohabitationSeparationPreview(activeContractId.value, previewId, payload)
      if (result?.contract) {
        syncOverviewContract(result.contract)
        await refreshSelectedDetails({ silent: true })
      }
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '确认分居预览失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const requestSeparationExecution = async (previewId: string, payload: CohabitationSeparationExecutionRequestPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !previewId) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await requestCohabitationSeparationExecution(activeContractId.value, previewId, payload)
      if (result?.contract) {
        syncOverviewContract(result.contract)
        await refreshSelectedDetails({ silent: true })
      }
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '请求分居执行失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const executeSeparationAssetReturn = async (previewId: string, payload: CohabitationSeparationAssetReturnExecutePayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !previewId) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await executeCohabitationSeparationAssetReturn(activeContractId.value, previewId, payload)
      if (result?.contract) {
        syncOverviewContract(result.contract)
        await refreshSelectedDetails({ silent: true })
      }
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '记录分居返还执行失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const writeSeparationPersonalFarmReturns = async (previewId: string, payload: CohabitationSeparationPersonalFarmWritePayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !previewId) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await writeCohabitationSeparationPersonalFarmReturns(activeContractId.value, previewId, payload)
      if (result?.contract) {
        syncOverviewContract(result.contract)
        await refreshSelectedDetails({ silent: true })
      }
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '写回分居来源田区失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const confirmSeparationSharedFundDelta = async (previewId: string, payload: CohabitationSeparationSharedFundDeltaConfirmPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !previewId) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await confirmCohabitationSeparationSharedFundDelta(activeContractId.value, previewId, payload)
      if (result?.fund) fund.value = result.fund
      if (result?.contract) {
        syncOverviewContract(result.contract)
        await refreshSelectedDetails({ silent: true })
      }
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '确认分居共同基金消费差额失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const refundSeparationSharedFund = async (previewId: string, payload: CohabitationSeparationSharedFundRefundPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !previewId) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await refundCohabitationSeparationSharedFund(activeContractId.value, previewId, payload)
      if (result?.fund) fund.value = result.fund
      if (result?.contract) {
        syncOverviewContract(result.contract)
        await refreshSelectedDetails({ silent: true })
      }
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '返还分居共同基金失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const returnSeparationSharedWarehouse = async (previewId: string, payload: CohabitationSeparationSharedWarehouseReturnPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !previewId) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await returnCohabitationSeparationSharedWarehouse(activeContractId.value, previewId, payload)
      if (result?.warehouse) warehouse.value = result.warehouse
      if (result?.contract) {
        syncOverviewContract(result.contract)
        await refreshSelectedDetails({ silent: true })
      }
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '返还分居共同仓库失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const splitSeparationDecorationsBuildings = async (previewId: string, payload: CohabitationSeparationDecorationBuildingSplitPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !previewId) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await splitCohabitationSeparationDecorationsBuildings(activeContractId.value, previewId, payload)
      if (result?.contract) {
        syncOverviewContract(result.contract)
        await refreshSelectedDetails({ silent: true })
      }
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '记录分居装饰 / 建筑拆分失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const resolveSeparationFamilyStory = async (previewId: string, payload: CohabitationSeparationFamilyStoryResolvePayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !previewId) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await resolveCohabitationSeparationFamilyStory(activeContractId.value, previewId, payload)
      if (result?.contract) {
        syncOverviewContract(result.contract)
        await refreshSelectedDetails({ silent: true })
      }
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '记录分居剧情拆分失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const recordSeparationStoryCinematicPlayback = async (previewId: string, payload: CohabitationSeparationStoryCinematicPlaybackPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !previewId) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await recordCohabitationSeparationStoryCinematicPlayback(activeContractId.value, previewId, payload)
      if (result?.contract) {
        syncOverviewContract(result.contract)
        await refreshSelectedDetails({ silent: true })
      }
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '记录分居剧情演出播放失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const writeSeparationPersonalStoryReceipts = async (previewId: string, payload: CohabitationSeparationPersonalStoryReceiptsPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !previewId) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await writeCohabitationSeparationPersonalStoryReceipts(activeContractId.value, previewId, payload)
      if (result?.contract) {
        syncOverviewContract(result.contract)
        await refreshSelectedDetails({ silent: true })
      }
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '写入分居个人剧情回执失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const resolveSeparationChildArrangement = async (previewId: string, payload: CohabitationSeparationChildArrangementResolvePayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !previewId) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await resolveCohabitationSeparationChildArrangement(activeContractId.value, previewId, payload)
      if (result?.contract) {
        syncOverviewContract(result.contract)
        await refreshSelectedDetails({ silent: true })
      }
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '记录分居孩子安排失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const writeSeparationPersonalFamilyReceipts = async (previewId: string, payload: CohabitationSeparationPersonalFamilyReceiptsPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !previewId) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await writeCohabitationSeparationPersonalFamilyReceipts(activeContractId.value, previewId, payload)
      if (result?.contract) {
        syncOverviewContract(result.contract)
        await refreshSelectedDetails({ silent: true })
      }
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '写入分居个人家庭回执失败'
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

  const purchaseSharedFundShopItem = async (payload: CohabitationFundShopPurchasePayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await purchaseCohabitationSharedFundShopItem(activeContractId.value, payload)
      if (result?.fund) fund.value = result.fund
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
      errorMessage.value = error instanceof Error ? error.message : 'shared fund shop purchase failed'
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

  const recordSharedFundHighRiskReceipt = async (draftId: string, payload: CohabitationFundHighRiskReceiptPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !draftId) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await recordCohabitationFundHighRiskReceipt(activeContractId.value, draftId, payload)
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
      errorMessage.value = error instanceof Error ? error.message : '记录共同基金高风险回执失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const createFamilyOrder = async (payload: CohabitationFamilyOrderCreatePayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await createCohabitationFamilyOrder(activeContractId.value, payload)
      await syncFamilyManorWriteResult(result)
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '创建家族订单失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const acceptFamilyOrder = async (orderId: string, payload: CohabitationFamilyOrderActionPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !orderId) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await acceptCohabitationFamilyOrder(activeContractId.value, orderId, payload)
      await syncFamilyManorWriteResult(result)
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '接取家族订单失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const deliverFamilyOrder = async (orderId: string, payload: CohabitationFamilyOrderActionPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !orderId) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await deliverCohabitationFamilyOrder(activeContractId.value, orderId, payload)
      await syncFamilyManorWriteResult(result)
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '交付家族订单失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const settleFamilyOrder = async (orderId: string, payload: CohabitationFamilyOrderActionPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !orderId) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await settleCohabitationFamilyOrder(activeContractId.value, orderId, payload)
      await syncFamilyManorWriteResult(result)
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '结算家族订单失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const awardFamilyReputation = async (payload: CohabitationFamilyReputationAwardPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await awardCohabitationFamilyReputation(activeContractId.value, payload)
      await syncFamilyManorWriteResult(result)
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '发放家族声望失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const claimFamilyReputationReward = async (payload: CohabitationFamilyReputationRewardClaimPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await claimCohabitationFamilyReputationReward(activeContractId.value, payload)
      await syncFamilyManorWriteResult(result)
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '领取家族声望奖励失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const updateFamilyVisibility = async (payload: CohabitationFamilyVisibilityUpdatePayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await updateCohabitationFamilyVisibility(activeContractId.value, payload)
      await syncFamilyManorWriteResult(result)
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '更新家族公开设置失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const rollbackFamilyVisibility = async (payload: CohabitationFamilyVisibilityRollbackPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await rollbackCohabitationFamilyVisibility(activeContractId.value, payload)
      await syncFamilyManorWriteResult(result)
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '回滚家族公开设置失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const reserveFamilyFestivalSeats = async (payload: CohabitationFamilyFestivalSeatReservePayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await reserveCohabitationFamilyFestivalSeats(activeContractId.value, payload)
      await syncFamilyManorWriteResult(result)
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '锁定家族节会席位失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const createFamilyFestivalRoom = async (payload: CohabitationFamilyFestivalRoomPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await createCohabitationFamilyFestivalRoom(activeContractId.value, payload)
      await syncFamilyManorWriteResult(result)
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '创建家族节会房间失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const consumeFamilyFestivalSupplies = async (payload: CohabitationFamilyFestivalSuppliesPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await consumeCohabitationFamilyFestivalSupplies(activeContractId.value, payload)
      await syncFamilyManorWriteResult(result)
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '消耗家族节会供品失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const settleFamilyFestivalRewards = async (payload: CohabitationFamilyFestivalSettlePayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await settleCohabitationFamilyFestivalRewards(activeContractId.value, payload)
      await syncFamilyManorWriteResult(result)
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '结算家族节会奖励失败'
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
    medium_fund_ledger_id?: string
    budget_fund_ledger_id?: string
    budget_ledger_id?: string
    materials_fund_ledger_id?: string
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

  const rollbackFamilyBuilding = async (payload: {
    building_ledger_id: string
    memo?: string
    idempotency_key: string
  }) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.building_ledger_id) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await rollbackCohabitationFamilyBuilding(activeContractId.value, payload)
      if (result?.family_buildings_panel) familyBuildingsPanel.value = result.family_buildings_panel
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
      errorMessage.value = error instanceof Error ? error.message : '记录家族建筑回滚失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const refundFamilyBuildingFund = async (payload: {
    building_ledger_id: string
    memo?: string
    idempotency_key: string
  }) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.building_ledger_id) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await refundCohabitationFamilyBuildingFund(activeContractId.value, payload)
      if (result?.family_buildings_panel) familyBuildingsPanel.value = result.family_buildings_panel
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
      errorMessage.value = error instanceof Error ? error.message : '退回家族建筑共同基金失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const restoreFamilyBuildingMaterials = async (payload: {
    building_ledger_id: string
    memo?: string
    idempotency_key: string
  }) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.building_ledger_id) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await restoreCohabitationFamilyBuildingMaterials(activeContractId.value, payload)
      if (result?.family_buildings_panel) familyBuildingsPanel.value = result.family_buildings_panel
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
      errorMessage.value = error instanceof Error ? error.message : '恢复家族建筑共同仓库材料失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const replayFamilyBuildingCompensation = async (payload: {
    building_ledger_id: string
    memo?: string
    idempotency_key: string
  }) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.building_ledger_id) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await replayCohabitationFamilyBuildingCompensation(activeContractId.value, payload)
      if (result?.family_buildings_panel) familyBuildingsPanel.value = result.family_buildings_panel
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
      errorMessage.value = error instanceof Error ? error.message : '收口家族建筑补偿重放失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const requestFamilyBuildingRealDemolitionReview = async (payload: {
    building_ledger_id: string
    memo?: string
    idempotency_key: string
  }) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.building_ledger_id) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await requestCohabitationFamilyBuildingRealDemolitionReview(activeContractId.value, payload)
      if (result?.family_buildings_panel) familyBuildingsPanel.value = result.family_buildings_panel
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
      errorMessage.value = error instanceof Error ? error.message : '请求家族建筑真实拆除复核失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const approveFamilyBuildingRealDemolitionReview = async (payload: {
    building_ledger_id: string
    memo?: string
    idempotency_key: string
  }) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.building_ledger_id) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await approveCohabitationFamilyBuildingRealDemolitionReview(activeContractId.value, payload)
      if (result?.family_buildings_panel) familyBuildingsPanel.value = result.family_buildings_panel
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
      errorMessage.value = error instanceof Error ? error.message : '批准家族建筑真实拆除复核失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const rejectFamilyBuildingRealDemolitionReview = async (payload: {
    building_ledger_id: string
    memo?: string
    idempotency_key: string
  }) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.building_ledger_id) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await rejectCohabitationFamilyBuildingRealDemolitionReview(activeContractId.value, payload)
      if (result?.family_buildings_panel) familyBuildingsPanel.value = result.family_buildings_panel
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
      errorMessage.value = error instanceof Error ? error.message : '驳回家族建筑真实拆除复核失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const requestFamilyBuildingRealDemolitionExecution = async (payload: {
    building_ledger_id: string
    memo?: string
    idempotency_key: string
  }) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.building_ledger_id) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await requestCohabitationFamilyBuildingRealDemolitionExecution(activeContractId.value, payload)
      if (result?.family_buildings_panel) familyBuildingsPanel.value = result.family_buildings_panel
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
      errorMessage.value = error instanceof Error ? error.message : '请求家族建筑真实拆除执行失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const writeFamilyBuildingRealDemolitionPersonalSave = async (payload: {
    building_ledger_id: string
    memo?: string
    idempotency_key: string
  }) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.building_ledger_id) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await writeCohabitationFamilyBuildingRealDemolitionPersonalSave(activeContractId.value, payload)
      if (result?.family_buildings_panel) familyBuildingsPanel.value = result.family_buildings_panel
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
      errorMessage.value = error instanceof Error ? error.message : '写回家族建筑真实拆除个人存档失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const previewFamilyBuildingRealDemolitionMainState = async (payload: {
    building_ledger_id: string
    memo?: string
    idempotency_key: string
  }) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.building_ledger_id) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await previewCohabitationFamilyBuildingRealDemolitionMainState(activeContractId.value, payload)
      if (result?.family_buildings_panel) familyBuildingsPanel.value = result.family_buildings_panel
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
      errorMessage.value = error instanceof Error ? error.message : '预览家族建筑真实拆除个人主状态失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const verifyFamilyBuildingRealDemolitionMainStateMapping = async (payload: CohabitationFamilyBuildingMainStateMappingPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.building_ledger_id) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await verifyCohabitationFamilyBuildingRealDemolitionMainStateMapping(activeContractId.value, payload)
      if (result?.family_buildings_panel) familyBuildingsPanel.value = result.family_buildings_panel
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
      errorMessage.value = error instanceof Error ? error.message : '记录家族建筑真实拆除个人主状态映射证明失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const guardFamilyBuildingRealDemolitionMainStateMutation = async (payload: CohabitationFamilyBuildingMainStateMutationGuardPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.building_ledger_id) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await guardCohabitationFamilyBuildingRealDemolitionMainStateMutation(activeContractId.value, payload)
      if (result?.family_buildings_panel) familyBuildingsPanel.value = result.family_buildings_panel
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
      errorMessage.value = error instanceof Error ? error.message : '记录家族建筑真实拆除个人主状态变更安全阀失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const executeFamilyBuildingRealDemolitionMainStateMutation = async (payload: CohabitationFamilyBuildingMainStateExecutePayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.building_ledger_id) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await executeCohabitationFamilyBuildingRealDemolitionMainStateMutation(activeContractId.value, payload)
      if (result?.family_buildings_panel) familyBuildingsPanel.value = result.family_buildings_panel
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
      errorMessage.value = error instanceof Error ? error.message : '执行家族建筑真实拆除个人主状态变更失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const bindFamilyBuildingRealDemolitionMainStateExactTargets = async (payload: CohabitationFamilyBuildingMainStateExactTargetPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.building_ledger_id) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await bindCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(activeContractId.value, payload)
      if (result?.family_buildings_panel) familyBuildingsPanel.value = result.family_buildings_panel
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
      errorMessage.value = error instanceof Error ? error.message : '绑定家族建筑真实拆除个人主状态精确目标失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const executeFamilyBuildingRealDemolitionMainStateExactTargets = async (payload: CohabitationFamilyBuildingMainStateExactExecutePayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.building_ledger_id) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await executeCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(activeContractId.value, payload)
      if (result?.family_buildings_panel) familyBuildingsPanel.value = result.family_buildings_panel
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
      errorMessage.value = error instanceof Error ? error.message : '执行家族建筑真实拆除个人主状态精确目标失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const resolveFamilyBuildingRealDemolitionMainStateExactTargets = async (payload: CohabitationFamilyBuildingMainStateExactTargetResolutionPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.building_ledger_id) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await resolveCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(activeContractId.value, payload)
      if (result?.family_buildings_panel) familyBuildingsPanel.value = result.family_buildings_panel
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
      errorMessage.value = error instanceof Error ? error.message : '人工解析家族建筑真实拆除个人主状态精确目标失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const executeFamilyBuildingRealDemolitionMainStateExactMutation = async (payload: CohabitationFamilyBuildingMainStateExactMutationPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.building_ledger_id) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await executeCohabitationFamilyBuildingRealDemolitionMainStateExactMutation(activeContractId.value, payload)
      if (result?.family_buildings_panel) familyBuildingsPanel.value = result.family_buildings_panel
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
      errorMessage.value = error instanceof Error ? error.message : '执行家族建筑真实拆除个人主状态精确变更失败'
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

  const createWarehouseHighValueWithdrawalDraft = async (payload: CohabitationWarehouseHighValueWithdrawalDraftPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await createCohabitationWarehouseHighValueWithdrawalDraft(activeContractId.value, payload)
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
      errorMessage.value = error instanceof Error ? error.message : '创建共同仓库高价值取出草案失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const confirmWarehouseHighValueWithdrawalDraft = async (draftId: string, payload: CohabitationWarehouseHighValueWithdrawalConfirmPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !draftId) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await confirmCohabitationWarehouseHighValueWithdrawalDraft(activeContractId.value, draftId, payload)
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
      errorMessage.value = error instanceof Error ? error.message : '确认共同仓库高价值取出草案失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const executeWarehouseHighValueWithdrawalDraft = async (draftId: string, payload: CohabitationWarehouseHighValueWithdrawalExecutePayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !draftId) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await executeCohabitationWarehouseHighValueWithdrawalDraft(activeContractId.value, draftId, payload)
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
      errorMessage.value = error instanceof Error ? error.message : '执行共同仓库高价值取出草案失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const rollbackWarehouseHighValueWithdrawalDraft = async (draftId: string, payload: CohabitationWarehouseHighValueWithdrawalRollbackPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !draftId) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await rollbackCohabitationWarehouseHighValueWithdrawalDraft(activeContractId.value, draftId, payload)
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
      errorMessage.value = error instanceof Error ? error.message : '回滚共同仓库高价值取出草案失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const fetchWarehouseHighValueWithdrawalCompensationAuditBundle = async (draftId: string) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !draftId) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await fetchCohabitationWarehouseHighValueWithdrawalCompensationAuditBundle(activeContractId.value, draftId)
      warehouseCompensationAuditBundle.value = result?.compensation_audit_bundle ?? null
      if (result?.warehouse) warehouse.value = result.warehouse
      if (result?.contract) syncOverviewContract(result.contract)
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '获取共同仓库高价值取出补偿审计失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const recordWarehouseHighValueWithdrawalCompensationPreflight = async (draftId: string, payload: CohabitationWarehouseCompensationPreflightPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !draftId) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await recordCohabitationWarehouseHighValueWithdrawalCompensationPreflight(activeContractId.value, draftId, payload)
      if (result?.warehouse) warehouse.value = result.warehouse
      if (result?.contract) syncOverviewContract(result.contract)
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '记录共同仓库高价值取出补偿预检失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const recordWarehouseHighValueWithdrawalCompensationExecution = async (draftId: string, payload: CohabitationWarehouseCompensationExecutionPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !draftId) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await recordCohabitationWarehouseHighValueWithdrawalCompensationExecution(activeContractId.value, draftId, payload)
      if (result?.warehouse) warehouse.value = result.warehouse
      if (result?.contract) syncOverviewContract(result.contract)
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '记录共同仓库高价值取出补偿回执失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const recordWarehouseHighValueWithdrawalManualAppealResolution = async (draftId: string, payload: CohabitationWarehouseManualAppealResolutionPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !draftId) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await recordCohabitationWarehouseHighValueWithdrawalManualAppealResolution(activeContractId.value, draftId, payload)
      if (result?.warehouse) warehouse.value = result.warehouse
      if (result?.contract) syncOverviewContract(result.contract)
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '记录共同仓库高价值取出人工申诉恢复失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const recordWarehouseHighValueWithdrawalOperatorReceiptAuditReview = async (draftId: string, payload: CohabitationWarehouseOperatorReceiptAuditReviewPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !draftId) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await recordCohabitationWarehouseHighValueWithdrawalOperatorReceiptAuditReview(activeContractId.value, draftId, payload)
      if (result?.warehouse) warehouse.value = result.warehouse
      if (result?.contract) syncOverviewContract(result.contract)
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '记录共同仓库高价值取出操作回执审计复核失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const recoverWarehouseGovernance = async (payload: CohabitationWarehouseGovernanceRecoveryPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await recoverCohabitationWarehouseGovernance(activeContractId.value, payload)
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
      errorMessage.value = error instanceof Error ? error.message : '恢复共同仓库治理阻断失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const waterSharedFarmPlot = async (payload: CohabitationSharedFarmWaterPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.plot_id) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await waterCohabitationSharedPlot(activeContractId.value, payload)
      if (result?.shared_map) sharedMap.value = result.shared_map
      if (result?.warehouse) warehouse.value = result.warehouse
      if (result?.contract) syncOverviewContract(result.contract)
      await refreshSelectedDetails({ silent: true })
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '浇水共同农田失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const careSharedFarmPlot = async (payload: CohabitationSharedFarmCarePayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.plot_id) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await careCohabitationSharedPlot(activeContractId.value, payload)
      if (result?.shared_map) sharedMap.value = result.shared_map
      if (result?.warehouse) warehouse.value = result.warehouse
      if (result?.contract) syncOverviewContract(result.contract)
      await refreshSelectedDetails({ silent: true })
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '管护共同农田失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const plantSharedFarmPlot = async (payload: CohabitationSharedFarmPlantPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.plot_id) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await plantCohabitationSharedPlot(activeContractId.value, payload)
      if (result?.shared_map) sharedMap.value = result.shared_map
      if (result?.warehouse) warehouse.value = result.warehouse
      if (result?.contract) syncOverviewContract(result.contract)
      await refreshSelectedDetails({ silent: true })
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '种植共同农田失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const fertilizeSharedFarmPlot = async (payload: CohabitationSharedFarmFertilizePayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.plot_id) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await fertilizeCohabitationSharedPlot(activeContractId.value, payload)
      if (result?.shared_map) sharedMap.value = result.shared_map
      if (result?.warehouse) warehouse.value = result.warehouse
      if (result?.contract) syncOverviewContract(result.contract)
      await refreshSelectedDetails({ silent: true })
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '共同农田施肥失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const harvestSharedFarmPlot = async (payload: CohabitationSharedFarmHarvestPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.plot_id) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await harvestCohabitationSharedPlot(activeContractId.value, payload)
      if (result?.shared_map) sharedMap.value = result.shared_map
      if (result?.warehouse) warehouse.value = result.warehouse
      if (result?.contract) syncOverviewContract(result.contract)
      await refreshSelectedDetails({ silent: true })
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '收获共同农田失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const feedSharedAnimal = async (payload: CohabitationSharedAnimalFeedPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.animal_id) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await feedCohabitationSharedAnimal(activeContractId.value, payload)
      if (result?.shared_animals) sharedAnimals.value = result.shared_animals
      if (result?.warehouse) warehouse.value = result.warehouse
      if (result?.contract) syncOverviewContract(result.contract)
      await refreshSelectedDetails({ silent: true })
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '喂食共同动物失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const buySharedAnimal = async (payload: CohabitationSharedAnimalBuyPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.animal_type) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await buyCohabitationSharedAnimal(activeContractId.value, payload)
      if (result?.shared_animals) sharedAnimals.value = result.shared_animals
      if (result?.fund) fund.value = result.fund
      if (result?.contract) syncOverviewContract(result.contract)
      await refreshSelectedDetails({ silent: true })
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '购买共同动物失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const sellSharedAnimal = async (payload: CohabitationSharedAnimalSellPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.animal_id) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await sellCohabitationSharedAnimal(activeContractId.value, payload)
      if (result?.shared_animals) sharedAnimals.value = result.shared_animals
      if (result?.fund) fund.value = result.fund
      if (result?.contract) syncOverviewContract(result.contract)
      await refreshSelectedDetails({ silent: true })
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '出售共同动物失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const petSharedAnimal = async (payload: CohabitationSharedAnimalPetPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.animal_id) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await petCohabitationSharedAnimal(activeContractId.value, payload)
      if (result?.shared_animals) sharedAnimals.value = result.shared_animals
      if (result?.contract) syncOverviewContract(result.contract)
      await refreshSelectedDetails({ silent: true })
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '抚摸共同动物失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const collectSharedAnimalProduct = async (payload: CohabitationSharedAnimalProductPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.animal_id) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await collectCohabitationSharedAnimalProduct(activeContractId.value, payload)
      if (result?.shared_animals) sharedAnimals.value = result.shared_animals
      if (result?.warehouse) warehouse.value = result.warehouse
      if (result?.contract) syncOverviewContract(result.contract)
      await refreshSelectedDetails({ silent: true })
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '收取共同动物产物失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const careSharedPet = async (payload: CohabitationSharedPetCarePayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.pet_id) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await careCohabitationSharedPet(activeContractId.value, payload)
      if (result?.shared_pets) sharedPets.value = result.shared_pets
      if (result?.warehouse) warehouse.value = result.warehouse
      if (result?.contract) syncOverviewContract(result.contract)
      await refreshSelectedDetails({ silent: true })
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '照料共同宠物失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const processSharedWorkshopRecipe = async (payload: CohabitationSharedWorkshopProcessPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.recipe_id) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await processCohabitationSharedWorkshopRecipe(activeContractId.value, payload)
      if (result?.warehouse) warehouse.value = result.warehouse
      if (result?.contract) syncOverviewContract(result.contract)
      await refreshSelectedDetails({ silent: true })
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '处理共同工坊配方失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const mergeOfflineQueue = async (payload: CohabitationOfflineQueueMergePayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.operations.length) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await mergeCohabitationOfflineQueue(activeContractId.value, payload)
      offlineQueueMerge.value = result?.offline_queue_merge ?? null
      if (result?.offline_status) offlineStatus.value = result.offline_status
      if (result?.contract) syncOverviewContract(result.contract)
      await refreshSelectedDetails({ silent: true })
      return result
    } catch (error) {
      if (isProtectedApiError(error) && error.data && typeof error.data === 'object') {
        const data = error.data as {
          offline_queue_merge?: CohabitationOfflineQueueMergeSummary
          offline_status?: CohabitationOfflineStatus
          contract?: CohabitationContract
        }
        offlineQueueMerge.value = data.offline_queue_merge ?? offlineQueueMerge.value
        if (data.offline_status) offlineStatus.value = data.offline_status
        if (data.contract) syncOverviewContract(data.contract)
      }
      errorMessage.value = error instanceof Error ? error.message : '合并离线经营队列失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const preflightOfflineConflicts = async (payload: CohabitationOfflineConflictPreflightPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await preflightCohabitationOfflineConflicts(activeContractId.value, payload)
      offlineConflictPreflight.value = result?.offline_conflict_preflight ?? null
      if (result?.offline_status) offlineStatus.value = result.offline_status
      if (result?.contract) syncOverviewContract(result.contract)
      await refreshSelectedDetails({ silent: true })
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '预检离线经营冲突失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const resolveOfflineConflicts = async (payload: CohabitationOfflineConflictResolvePayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value || !payload.operations.length) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await resolveCohabitationOfflineConflicts(activeContractId.value, payload)
      offlineQueueMerge.value = result?.offline_queue_merge ?? null
      offlineConflictPreflight.value = result?.offline_conflict_preflight ?? offlineConflictPreflight.value
      offlineConflictAutoResolution.value = result?.offline_conflict_auto_resolution ?? null
      if (result?.offline_status) offlineStatus.value = result.offline_status
      if (result?.contract) syncOverviewContract(result.contract)
      await refreshSelectedDetails({ silent: true })
      return result
    } catch (error) {
      if (isProtectedApiError(error) && error.data && typeof error.data === 'object') {
        const data = error.data as {
          offline_queue_merge?: CohabitationOfflineQueueMergeSummary
          offline_conflict_preflight?: CohabitationOfflineConflictPreflightSummary
          offline_conflict_auto_resolution?: CohabitationOfflineConflictAutoResolutionSummary
          offline_status?: CohabitationOfflineStatus
          contract?: CohabitationContract
        }
        offlineQueueMerge.value = data.offline_queue_merge ?? offlineQueueMerge.value
        offlineConflictPreflight.value = data.offline_conflict_preflight ?? offlineConflictPreflight.value
        offlineConflictAutoResolution.value = data.offline_conflict_auto_resolution ?? offlineConflictAutoResolution.value
        if (data.offline_status) offlineStatus.value = data.offline_status
        if (data.contract) syncOverviewContract(data.contract)
      }
      errorMessage.value = error instanceof Error ? error.message : '自动解决离线经营冲突失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const collectOfflineAutoIncome = async (payload: CohabitationOfflineAutoIncomeCollectPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await collectCohabitationOfflineAutoIncome(activeContractId.value, payload)
      if (result?.offline_status) offlineStatus.value = result.offline_status
      if (result?.shared_map) sharedMap.value = result.shared_map
      if (result?.shared_animals) sharedAnimals.value = result.shared_animals
      if (result?.warehouse) warehouse.value = result.warehouse
      if (result?.contract) syncOverviewContract(result.contract)
      await refreshSelectedDetails({ silent: true })
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '领取离线自动收益失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const settleDailyBonus = async (payload: CohabitationDailySettlePayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await settleCohabitationDailyBonus(activeContractId.value, payload)
      dailySettlement.value = result?.daily_settlement ?? null
      if (result?.offline_status) offlineStatus.value = result.offline_status
      if (result?.shared_map) sharedMap.value = result.shared_map
      if (result?.shared_animals) sharedAnimals.value = result.shared_animals
      if (result?.contract) syncOverviewContract(result.contract)
      await refreshSelectedDetails({ silent: true })
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '共同庄园日结失败'
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

  const restoreMemberDefaultPermissions = async (payload: CohabitationPermissionDefaultRestorePayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await restoreCohabitationDefaultPermissions(activeContractId.value, payload)
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
      errorMessage.value = error instanceof Error ? error.message : '恢复共同庄园默认权限失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const submitRecoveryAppeal = async (payload: CohabitationRecoveryAppealPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await submitCohabitationRecoveryAppeal(activeContractId.value, payload)
      if (result?.contract && overview.value) {
        overview.value = {
          ...overview.value,
          contracts: overview.value.contracts.map(contract => contract.id === result.contract.id ? result.contract : contract),
        }
      }
      await refreshSelectedDetails({ silent: true })
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '提交共同庄园恢复申诉失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const rollbackContractSafeVersion = async (payload: CohabitationContractSafeVersionRollbackPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await rollbackCohabitationContractSafeVersion(activeContractId.value, payload)
      if (result?.contract && overview.value) {
        overview.value = {
          ...overview.value,
          contracts: overview.value.contracts.map(contract => contract.id === result.contract.id ? result.contract : contract),
        }
      }
      await refreshSelectedDetails({ silent: true })
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '回滚同居契约安全版本失败'
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

  const submitFamilyWish = async (payload: CohabitationFamilyWishSubmitPayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await submitCohabitationFamilyWish(activeContractId.value, payload)
      if (result?.contract && overview.value) {
        overview.value = {
          ...overview.value,
          contracts: overview.value.contracts.map(contract => contract.id === result.contract.id ? result.contract : contract),
        }
      }
      await refreshSelectedDetails({ silent: true })
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '提交共同家庭心愿失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  const recordFamilyChildCare = async (payload: CohabitationFamilyChildCarePayload) => {
    if (!activeContractId.value || !canOpenSelectedContract.value) return null
    actionLoading.value = true
    errorMessage.value = ''
    try {
      const result = await recordCohabitationFamilyChildCare(activeContractId.value, payload)
      if (result?.contract && overview.value) {
        overview.value = {
          ...overview.value,
          contracts: overview.value.contracts.map(contract => contract.id === result.contract.id ? result.contract : contract),
        }
      }
      await refreshSelectedDetails({ silent: true })
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '记录共同孩子照料失败'
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
    warehouseCompensationAuditBundle,
    errorMessage,
    sharedMap,
    sharedAnimals,
    sharedPets,
    warehouse,
    fund,
    permissionsPanel,
    rolePanel,
    familyBuildingsPanel,
    familyFestivalSeatsPanel,
    offlineQueueMerge,
    offlineConflictPreflight,
    offlineConflictAutoResolution,
    familyOrdersPanel,
    familyRelationsPanel,
    familyReputationPanel,
    familyVisibilityPanel,
    offlineStatus,
    purchaseSharedFundShopItem,
    dailySettlement,
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
    confirmSeparationPreview,
    requestSeparationExecution,
    executeSeparationAssetReturn,
    writeSeparationPersonalFarmReturns,
    confirmSeparationSharedFundDelta,
    refundSeparationSharedFund,
    returnSeparationSharedWarehouse,
    splitSeparationDecorationsBuildings,
    resolveSeparationFamilyStory,
    recordSeparationStoryCinematicPlayback,
    writeSeparationPersonalStoryReceipts,
    resolveSeparationChildArrangement,
    writeSeparationPersonalFamilyReceipts,
    contributeSharedFund,
    spendSharedFund,
    createSharedFundLargeSpendDraft,
    confirmSharedFundLargeSpendDraft,
    executeSharedFundLargeSpendDraft,
    recordSharedFundHighRiskReceipt,
    createFamilyOrder,
    acceptFamilyOrder,
    deliverFamilyOrder,
    settleFamilyOrder,
    awardFamilyReputation,
    claimFamilyReputationReward,
    updateFamilyVisibility,
    rollbackFamilyVisibility,
    reserveFamilyFestivalSeats,
    createFamilyFestivalRoom,
    consumeFamilyFestivalSupplies,
    settleFamilyFestivalRewards,
    applyFamilyBuildingRealBuild,
    consumeFamilyBuildingMaterials,
    rollbackFamilyBuilding,
    refundFamilyBuildingFund,
    restoreFamilyBuildingMaterials,
    replayFamilyBuildingCompensation,
    requestFamilyBuildingRealDemolitionReview,
    approveFamilyBuildingRealDemolitionReview,
    rejectFamilyBuildingRealDemolitionReview,
    requestFamilyBuildingRealDemolitionExecution,
    writeFamilyBuildingRealDemolitionPersonalSave,
    previewFamilyBuildingRealDemolitionMainState,
    verifyFamilyBuildingRealDemolitionMainStateMapping,
    guardFamilyBuildingRealDemolitionMainStateMutation,
    executeFamilyBuildingRealDemolitionMainStateMutation,
    bindFamilyBuildingRealDemolitionMainStateExactTargets,
    executeFamilyBuildingRealDemolitionMainStateExactTargets,
    resolveFamilyBuildingRealDemolitionMainStateExactTargets,
    mergeOfflineQueue,
    preflightOfflineConflicts,
    resolveOfflineConflicts,
    collectOfflineAutoIncome,
    settleDailyBonus,
    executeFamilyBuildingRealDemolitionMainStateExactMutation,
    depositSharedWarehouseItem,
    sellSharedWarehouseItem,
    withdrawSharedWarehouseItem,
    createWarehouseHighValueWithdrawalDraft,
    confirmWarehouseHighValueWithdrawalDraft,
    executeWarehouseHighValueWithdrawalDraft,
    rollbackWarehouseHighValueWithdrawalDraft,
    recoverWarehouseGovernance,
    fetchWarehouseHighValueWithdrawalCompensationAuditBundle,
    recordWarehouseHighValueWithdrawalCompensationPreflight,
    recordWarehouseHighValueWithdrawalCompensationExecution,
    recordWarehouseHighValueWithdrawalManualAppealResolution,
    recordWarehouseHighValueWithdrawalOperatorReceiptAuditReview,
    waterSharedFarmPlot,
    careSharedFarmPlot,
    plantSharedFarmPlot,
    fertilizeSharedFarmPlot,
    harvestSharedFarmPlot,
    feedSharedAnimal,
    buySharedAnimal,
    sellSharedAnimal,
    petSharedAnimal,
    collectSharedAnimalProduct,
    careSharedPet,
    processSharedWorkshopRecipe,
    updateMemberPermissions,
    restoreMemberDefaultPermissions,
    submitRecoveryAppeal,
    rollbackContractSafeVersion,
    updateMemberRole,
    recordFamilyChildCare,
    submitFamilyWish,
  }
})
