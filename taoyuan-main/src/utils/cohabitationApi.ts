import { ensureCurrentAccount, ensureCurrentCsrfToken } from '@/utils/accountStorage'
import { fetchProtectedJson } from '@/utils/protectedApi'

export type CohabitationContractStatus = 'pending_acceptance' | 'active' | 'separation_pending' | 'closed' | 'declined'
export type CohabitationRelationType =
  | 'lover_cohabitation'
  | 'marriage_home'
  | 'bosom_partner'
  | 'oath_manor'
  | 'business_partner'
  | 'seasonal_cofarm'

export interface CohabitationRelationOption {
  id: CohabitationRelationType | string
  label: string
  title: string
  min_members: number
  max_members: number
  romance_only: boolean
}

export interface CohabitationMember {
  username: string
  username_key: string
  display_name: string
  role: 'owner' | 'member' | string
  status: 'accepted' | 'pending' | 'declined' | 'left' | string
  manor_role?: string
  save_id?: number
  save_slot?: number | null
  invited_at?: number
  accepted_at?: number
  last_active_at?: number
  last_action?: string
}

export interface CohabitationAuditEntry {
  id: string
  action: string
  actor_username: string
  actor_display_name: string
  detail: Record<string, unknown>
  idempotency_key: string
  at: number
}

export interface CohabitationFundLedgerEntry {
  id: string
  action: string
  amount: number
  actor_username: string
  actor_display_name: string
  source_owner_username: string
  source_owner_display_name: string
  memo: string
  purpose: string
  target_ref?: string
  target_item_id?: string
  target_quantity?: number
  target_unit_price?: number
  idempotency_key: string
  status: string
  created_at: number
}

export interface CohabitationWarehouseLedgerEntry {
  id: string
  action: string
  item_id: string
  quantity: number
  quality: string
  actor_username: string
  actor_display_name: string
  source_owner_username: string
  source_owner_display_name: string
  source_save_id: number
  source_save_slot: number | null
  idempotency_key: string
  status: string
  created_at: number
}

export interface CohabitationContract {
  id: string
  type: CohabitationRelationType | string
  type_label: string
  title: string
  status: CohabitationContractStatus | string
  shared_manor_id: string
  members: CohabitationMember[]
  shared_fund: {
    balance: number
    ledger: CohabitationFundLedgerEntry[]
  }
  shared_warehouse: {
    items: CohabitationWarehouseItem[]
    ledger: CohabitationWarehouseLedgerEntry[]
  }
  audit_log: CohabitationAuditEntry[]
  separation_previews?: CohabitationSeparationPreview[]
  created_at: number
  updated_at: number
  activated_at?: number
}

export interface CohabitationOverviewResponse {
  ok: boolean
  relation_options: CohabitationRelationOption[]
  contracts: CohabitationContract[]
  summary: {
    total: number
    pending: number
    active: number
    separation_previews: number
  }
  msg?: string
}

export interface CohabitationSharedPlot {
  id: string
  source_area: string
  source_plot_id: number
  origin_owner_id: string
  origin_save_id: number
  origin_owner_username: string
  origin_owner_display_name: string
  origin_owner_key: string
  origin_owner_manor_role?: string
  origin_owner_manor_role_label?: string
  current_steward_username: string
  current_steward_display_name: string
  permission_mode: string
  x: number
  y: number
  row: number
  col: number
  local_row: number
  local_col: number
  readonly: boolean
  plot_state: {
    state: string
    crop_id: string | null
    growth_days: number
    watered: boolean
    unwatered_days: number
    fertilizer: string | null
    harvest_count: number
    infested: boolean
    infested_days: number
    weedy: boolean
    weedy_days: number
  }
}

export interface CohabitationSharedRegion {
  region_index: number
  member_username: string
  member_username_key: string
  member_display_name: string
  member_role: string
  manor_role?: string
  manor_role_label?: string
  origin_owner_id: string
  origin_save_id: number
  x: number
  y: number
  width: number
  height: number
  available: boolean
  unavailable_reason?: string
  field_plot_count: number
  permission_mode: string
}

export interface CohabitationSharedMap {
  contract_id: string
  shared_manor_id: string
  status: string
  readonly: boolean
  writes_enabled: boolean
  generated_at: number
  revision: number
  layout: {
    columns: number
    rows: number
    regions: CohabitationSharedRegion[]
    arrangement: string
    strategy: string
    stitch_axis: string
    summary: Record<string, unknown>
  }
  members: Array<CohabitationMember & {
    available: boolean
    unavailable_reason: string
    farm_size: number
    field_plot_count: number
    greenhouse_plot_count: number
    fruit_tree_count: number
  }>
  plots: CohabitationSharedPlot[]
  summary: {
    member_count: number
    available_member_count: number
    total_plots: number
    active_plots: number
    harvestable_plots: number
    waterable_plots: number
    origin_owner_count: number
    layout_region_count: number
    multi_member_layout: boolean
    max_members: number
    personal_money_merged: boolean
    origin_trace_enabled: boolean
    shared_fund_balance: number
    deferred_writes: string[]
  }
}

export interface CohabitationWarehouseItem {
  item_id: string
  quantity: number
  quality: string
  label?: string
  source_owner_username?: string
  source_owner_display_name?: string
}

export interface CohabitationWarehouseSnapshot {
  contract_id: string
  shared_manor_id: string
  status: string
  items: CohabitationWarehouseItem[]
  ledger: CohabitationWarehouseLedgerEntry[]
  summary: {
    item_count: number
    total_quantity: number
    ledger_count: number
    personal_money_merged: boolean
    deposit_enabled: boolean
    withdraw_enabled: boolean
    sell_enabled: boolean
    idempotency_required: boolean
    compensation_policy: string
  }
  permissions: Record<string, boolean>
  family_warehouse?: Record<string, unknown>
}

export interface CohabitationFundSnapshot {
  contract_id: string
  shared_manor_id: string
  status: string
  balance: number
  ledger: CohabitationFundLedgerEntry[]
  summary: {
    balance: number
    ledger_count: number
    personal_money_merged: boolean
    contribution_enabled: boolean
    spend_enabled: boolean
    small_spend_enabled?: boolean
    small_spend_max_amount?: number
    allowed_small_spend_purposes?: Array<{
      id: string
      label: string
      category: string
      max_amount: number
      auto_pay_eligible: boolean
    }>
    idempotency_required: boolean
    large_spend_requires_both: boolean
    compensation_policy: string
  }
  permissions: Record<string, boolean>
}

export interface CohabitationPermissionsPanel {
  contract_id: string
  shared_manor_id: string
  status: string
  editable_by_actor: boolean
  idempotency_required: boolean
  safety_rails: Record<string, boolean>
  groups: Array<{
    id: string
    keys: string[]
  }>
  members: Array<CohabitationMember & {
    can_manage_permissions: boolean
    permissions: Record<string, Record<string, boolean>>
  }>
  recent_permission_audits: CohabitationAuditEntry[]
}

export interface CohabitationOfflineStatus {
  contract_id: string
  shared_manor_id: string
  status: string
  summary: {
    server_authoritative: boolean
    member_online_required: boolean
    offline_member_blocks_operations: boolean
    independent_operations_enabled: boolean
    personal_money_merged: boolean
    shared_log_available: boolean
    auto_offline_income_enabled: boolean
    conflict_policy: string
  }
  members: Array<CohabitationMember & {
    online_state: string
    offline_seconds: number | null
    can_operate_independently: boolean
  }>
  actor_capabilities: Record<string, boolean>
  recent_shared_log: CohabitationAuditEntry[]
  deferred_operations: string[]
}

export interface CohabitationSeparationPreview {
  id: string
  version: number
  state: string
  summary: string
  created_at: number
  expires_at: number
  confirm_after_at: number
  asset_return: Record<string, unknown>
  compensation_plan: Array<Record<string, unknown>>
  safety_checks: Array<Record<string, unknown>>
  deferred_operations: string[]
}

export interface CohabitationDetailResponse {
  ok: boolean
  contract: CohabitationContract
  msg?: string
  [key: string]: unknown
}

export interface CohabitationFundSpendPayload {
  amount: number
  purpose: string
  target_ref?: string
  auto_pay?: boolean
  memo?: string
  idempotency_key: string
}

export interface CohabitationFundContributionPayload {
  amount: number
  purpose?: string
  memo?: string
  idempotency_key: string
}

export interface CohabitationWarehouseItemPayload {
  item_id: string
  quantity: number
  quality?: string
  save_slot?: number | null
  memo?: string
  idempotency_key: string
}

export interface CohabitationWarehouseItemResponse extends CohabitationDetailResponse {
  warehouse?: CohabitationWarehouseSnapshot
  fund?: CohabitationFundSnapshot
  ledger_entry?: CohabitationWarehouseLedgerEntry | null
  ledger_entries?: CohabitationWarehouseLedgerEntry[]
  fund_ledger_entry?: CohabitationFundLedgerEntry | null
  personal_inventory?: Record<string, unknown>
  sale?: {
    item_id: string
    quality: string
    quantity: number
    unit_price: number
    total_amount: number
    balance_before?: number
    balance_after?: number
    target_ref?: string
    personal_money_merged: boolean
  }
}

export interface CohabitationFundContributionResponse extends CohabitationDetailResponse {
  fund?: CohabitationFundSnapshot
  ledger_entry?: CohabitationFundLedgerEntry
  personal_money?: {
    before_money?: number
    remaining_money?: number
    deducted_amount?: number
    personal_money_merged: boolean
  }
}

export interface CohabitationFundSpendResponse extends CohabitationDetailResponse {
  fund?: CohabitationFundSnapshot
  ledger_entry?: CohabitationFundLedgerEntry
  purchase?: {
    item_id: string
    quantity: number
    quality: string
    unit_price: number
    total_amount: number
    target_save_id?: number
    target_save_slot?: number | null
  } | null
}

const fetchCohabitationJson = async <T>(path: string, fallbackMessage: string): Promise<T | null> => {
  const account = await ensureCurrentAccount()
  if (!account || account === 'guest') return null
  const { data } = await fetchProtectedJson<T>(() => fetch(path, {
    credentials: 'include',
  }), {
    fallbackMessage,
    networkErrorMessage: '共同庄园服务连接失败，请检查网络或稍后重试',
  })
  return data ?? null
}

const postCohabitationJson = async <T>(path: string, payload: Record<string, unknown>, fallbackMessage: string): Promise<T | null> => {
  const account = await ensureCurrentAccount()
  if (!account || account === 'guest') return null
  const csrfToken = await ensureCurrentCsrfToken()
  const { data } = await fetchProtectedJson<T>(() => fetch(path, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(payload),
  }), {
    fallbackMessage,
    networkErrorMessage: '共同庄园服务连接失败，请检查网络或稍后重试',
  })
  return data ?? null
}

const contractPath = (contractId: string, tail: string) =>
  `/api/taoyuan/online/cohabitation/contracts/${encodeURIComponent(contractId)}${tail}`

export const fetchCohabitationOverview = async (): Promise<CohabitationOverviewResponse | null> => {
  return fetchCohabitationJson<CohabitationOverviewResponse>(
    '/api/taoyuan/online/cohabitation/contracts',
    '获取共同庄园契约失败'
  )
}

export const fetchCohabitationSharedMap = async (contractId: string) => {
  return fetchCohabitationJson<CohabitationDetailResponse & {
    shared_map?: CohabitationSharedMap
  }>(contractPath(contractId, '/shared-map'), '获取共同农田地图失败')
}

export const fetchCohabitationWarehouse = async (contractId: string) => {
  return fetchCohabitationJson<CohabitationDetailResponse & {
    warehouse?: CohabitationWarehouseSnapshot
  }>(contractPath(contractId, '/warehouse'), '获取共同仓库失败')
}

export const sellCohabitationWarehouseItem = async (contractId: string, payload: CohabitationWarehouseItemPayload) => {
  return postCohabitationJson<CohabitationWarehouseItemResponse>(
    contractPath(contractId, '/warehouse/sell'),
    payload as unknown as Record<string, unknown>,
    '卖出共同仓库物品失败'
  )
}

export const withdrawCohabitationWarehouseItem = async (contractId: string, payload: CohabitationWarehouseItemPayload) => {
  return postCohabitationJson<CohabitationWarehouseItemResponse>(
    contractPath(contractId, '/warehouse/withdraw'),
    payload as unknown as Record<string, unknown>,
    '取出共同仓库物品失败'
  )
}

export const fetchCohabitationFund = async (contractId: string) => {
  return fetchCohabitationJson<CohabitationDetailResponse & {
    fund?: CohabitationFundSnapshot
  }>(contractPath(contractId, '/fund'), '获取共同基金失败')
}

export const contributeCohabitationFund = async (contractId: string, payload: CohabitationFundContributionPayload) => {
  return postCohabitationJson<CohabitationFundContributionResponse>(
    contractPath(contractId, '/fund/contribute'),
    payload as unknown as Record<string, unknown>,
    '共同基金注资失败'
  )
}

export const spendCohabitationFund = async (contractId: string, payload: CohabitationFundSpendPayload) => {
  return postCohabitationJson<CohabitationFundSpendResponse>(
    contractPath(contractId, '/fund/spend'),
    payload as unknown as Record<string, unknown>,
    '共同基金支出失败'
  )
}

export const fetchCohabitationPermissions = async (contractId: string) => {
  return fetchCohabitationJson<CohabitationDetailResponse & {
    permissions_panel?: CohabitationPermissionsPanel
  }>(contractPath(contractId, '/permissions'), '获取共同庄园权限失败')
}

export const fetchCohabitationOfflineStatus = async (contractId: string) => {
  return fetchCohabitationJson<CohabitationDetailResponse & {
    offline_status?: CohabitationOfflineStatus
  }>(contractPath(contractId, '/offline-status'), '获取离线经营状态失败')
}
