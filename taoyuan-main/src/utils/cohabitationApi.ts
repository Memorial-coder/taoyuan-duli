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

export interface CohabitationFamilyRoleOption {
  id: string
  label: string
  description: string
  management?: boolean
  permission_focus?: string[]
}

export interface CohabitationFamilyRolePanel {
  contract_id: string
  shared_manor_id: string
  type: string
  type_label: string
  status: string
  role_management_enabled: boolean
  editable_by_actor: boolean
  idempotency_required: boolean
  max_members: number
  member_count: number
  role_options: CohabitationFamilyRoleOption[]
  constraints: Record<string, unknown>
  members: Array<CohabitationMember & {
    manor_role_label?: string
    can_manage_roles: boolean
    permissions: Record<string, Record<string, boolean>>
    permission_focus: string[]
  }>
  recent_role_audits: CohabitationAuditEntry[]
  deferred_operations: string[]
}

export interface CohabitationFamilyOrdersPanel {
  contract_id: string
  shared_manor_id: string
  type: string
  type_label: string
  status: string
  readonly: boolean
  write_enabled: boolean
  writes_enabled: boolean
  settlement_enabled: boolean
  family_orders_enabled: boolean
  generated_at: number
  revision: number
  member_count: number
  max_members: number
  summary: {
    preview_order_count: number
    open_order_count: number
    pending_settlement_count: number
    personal_money_merged: boolean
    personal_inventory_merged: boolean
    shared_fund_spend_enabled: boolean
    warehouse_withdraw_enabled: boolean
    reward_to_shared_fund_enabled: boolean
    reward_to_shared_warehouse_enabled: boolean
    reward_to_shared_fund_candidate_count: number
    reward_to_shared_fund_preview_amount: number
    disabled_reason: string
  }
  actor: (CohabitationMember & {
    manor_role_label?: string
    permission_focus?: string[]
    order_permissions?: Record<string, boolean>
  }) | null
  members: Array<CohabitationMember & {
    manor_role_label?: string
    permission_focus?: string[]
    order_permissions: Record<string, boolean>
  }>
  order_sources: Array<{
    id: string
    label: string
    available: boolean
    binding_enabled: boolean
    visual_board_type?: string
    deferred_operation?: string
    description: string
  }>
  candidate_order_types: Array<{
    id: string
    label: string
    description: string
    preferred_roles: string[]
    compatible_order_types: string[]
  }>
  visual_state_preview: {
    board_type: string
    board_id: string
    revision: number
    selected_visual_id: string
    recent_feedback: string
    async_projects: Array<{
      id: string
      title: string
      status: string
      progress_value: number
      progress_target: number
      stages: Array<{
        id: string
        sequence: number
        title: string
        description: string
        state: string
        progress_value: number
        progress_target: number
        preferred_roles: string[]
        compatible_order_types: string[]
      }>
      milestones: Array<{
        id: string
        label: string
        reached: boolean
        description: string
      }>
      history: Array<Record<string, unknown>>
    }>
  }
  income_preview: {
    candidate_count: number
    open_candidate_count: number
    total_candidate_amount: number
    latest_receipt_at?: number
    candidates?: Array<Record<string, unknown>>
  }
  settlement: Record<string, unknown>
  governance: Record<string, unknown>
  recommended_flow: string[]
  deferred_operations: string[]
}

export interface CohabitationFamilyReputationPanel {
  contract_id: string
  shared_manor_id: string
  type: string
  type_label: string
  status: string
  readonly: boolean
  write_enabled: boolean
  writes_enabled: boolean
  reputation_enabled: boolean
  generated_at: number
  revision: number
  summary: {
    current_points: number
    level: {
      id: string
      label: string
      min_points: number
      next_points: number | null
      progress_to_next: number
    }
    source_count: number
    member_count: number
    max_members: number
    reputation_award_enabled: boolean
    leaderboard_enabled: boolean
    personal_reward_enabled: boolean
    personal_money_merged: boolean
    personal_inventory_merged: boolean
    disabled_reason: string
  }
  actor: (Pick<CohabitationMember, 'username' | 'username_key' | 'display_name' | 'role'> & {
    manor_role: string
    manor_role_label: string
    can_view_reputation: boolean
    can_manage_reputation_rules_preview: boolean
    can_claim_reputation_reward: boolean
  }) | null
  members: Array<CohabitationMember & {
    manor_role_label: string
    warehouse_deposit_count: number
    warehouse_deposit_quantity: number
    fund_contribution_count: number
    fund_contribution_amount: number
    governance_action_count: number
    preview_points: number
  }>
  source_breakdown: Array<{
    id: string
    label: string
    enabled: boolean
    preview_points: number
    evidence_count: number
    audit_required: boolean
    write_enabled: boolean
    deferred_operation?: string
    evidence: Record<string, unknown>
  }>
  governance: Record<string, unknown>
  deferred_operations: string[]
}

export interface CohabitationFamilyBuildingsPanel {
  contract_id: string
  shared_manor_id: string
  type: string
  type_label: string
  status: string
  readonly: boolean
  write_enabled: boolean
  writes_enabled: boolean
  family_buildings_enabled: boolean
  build_enabled: boolean
  demolish_enabled: boolean
  generated_at: number
  revision: number
  summary: {
    member_count: number
    max_members: number
    preview_building_count: number
    role_ready_building_count: number
    material_consume_enabled: boolean
    shared_fund_spend_enabled: boolean
    warehouse_withdraw_enabled: boolean
    demolition_enabled: boolean
    construction_ledger_enabled: boolean
    reputation_award_enabled: boolean
    personal_money_merged: boolean
    personal_inventory_merged: boolean
    disabled_reason: string
  }
  actor: (CohabitationMember & {
    manor_role_label?: string
    permission_focus?: string[]
    building_permissions: Record<string, boolean>
  }) | null
  members: Array<CohabitationMember & {
    manor_role_label?: string
    permission_focus?: string[]
    building_permissions: Record<string, boolean>
  }>
  candidate_buildings: Array<{
    id: string
    label: string
    category: string
    visual_kind: string
    summary: string
    available: boolean
    role_ready: boolean
    missing_roles: string[]
    required_roles: string[]
    material_plan: Array<{
      item_id: string
      label: string
      required_quantity: number
      available_quantity: number
      enough: boolean
      consume_enabled: boolean
    }>
    shared_fund_cost: number
    shared_fund_balance_preview: number
    fund_ready_preview: boolean
    stage_count: number
    planning_state: string
    build_enabled: boolean
    demolish_enabled: boolean
    material_consume_enabled: boolean
    shared_fund_spend_enabled: boolean
    disabled_reason: string
  }>
  visual_state_preview: {
    board_type: string
    board_id: string
    revision: number
    selected_visual_id: string
    recent_feedback: string
    scene: Record<string, unknown> | null
    scene_objects: Array<Record<string, unknown>>
  }
  governance: Record<string, unknown>
  asset_boundaries: Record<string, unknown>
  recommended_flow: string[]
  deferred_operations: string[]
}

export interface CohabitationFamilyRelationNode {
  id: string
  node_type: string
  label: string
  state: string
  kind: string
  x: number
  y: number
  username?: string
  username_key?: string
  relation_label?: string
  manor_role?: string
  manor_role_label?: string
  write_enabled: boolean
  privacy?: Record<string, unknown>
}

export interface CohabitationFamilyRelationLink {
  id: string
  from: string
  to: string
  label: string
  kind: string
  state: string
  write_enabled: boolean
}

export interface CohabitationFamilyRelationsPanel {
  contract_id: string
  shared_manor_id: string
  type: string
  type_label: string
  status: string
  readonly: boolean
  write_enabled: boolean
  writes_enabled: boolean
  family_relations_enabled: boolean
  generated_at: number
  revision: number
  summary: {
    member_count: number
    accepted_member_count: number
    pending_member_count: number
    max_members: number
    role_management_enabled: boolean
    local_save_family_graph_included: boolean
    graph_node_count: number
    graph_link_count: number
    private_single_player_graph_exposed: boolean
    local_npc_nodes_exposed: boolean
    random_npc_nodes_exposed: boolean
    children_nodes_exposed: boolean
    pets_exposed: boolean
    personal_money_merged: boolean
    personal_inventory_merged: boolean
    relationship_write_enabled: boolean
    disabled_reason: string
  }
  actor: (CohabitationFamilyRelationNode & {
    display_name: string
    role: string
    status: string
    permissions_summary: Record<string, boolean>
  }) | null
  members: Array<CohabitationMember & {
    manor_role: string
    manor_role_label: string
    relation_label: string
    node_group: string
    x: number
    y: number
    permissions_summary: Record<string, boolean>
    privacy: Record<string, unknown>
  }>
  graph: {
    root_node_id: string
    layout: string
    revision: number
    nodes: CohabitationFamilyRelationNode[]
    links: CohabitationFamilyRelationLink[]
  }
  visual_state_preview: {
    board_type: string
    board_id: string
    revision: number
    selected_visual_id: string
    recent_feedback: string
    nodes: Array<{
      id: string
      label: string
      kind: string
      x: number
      y: number
      state: string
      connected_node_ids: string[]
      available_action_ids: string[]
    }>
    highlights: Array<Record<string, unknown>>
  }
  constraints: Record<string, unknown>
  recent_role_audits: CohabitationAuditEntry[]
  privacy: Record<string, unknown>
  governance: Record<string, unknown>
  asset_boundaries: Record<string, unknown>
  local_graph_compatibility: Record<string, unknown>
  deferred_operations: string[]
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

export interface CohabitationPermissionUpdatePayload {
  target_username: string
  permissions: Record<string, Record<string, boolean>>
  note?: string
  idempotency_key: string
}

export interface CohabitationPermissionUpdateResponse extends CohabitationDetailResponse {
  permissions_panel?: CohabitationPermissionsPanel
  changed_fields?: Array<{
    group: string
    key: string
    before: boolean
    after: boolean
  }>
  audit_entry?: CohabitationAuditEntry
  idempotent?: boolean
}

export interface CohabitationFamilyRoleUpdatePayload {
  target_username: string
  manor_role: string
  note?: string
  idempotency_key: string
}

export interface CohabitationFamilyRoleUpdateResponse extends CohabitationDetailResponse {
  role_panel?: CohabitationFamilyRolePanel
  changed_fields?: Array<{
    group: string
    key: string
    before: boolean
    after: boolean
  }>
  audit_entry?: CohabitationAuditEntry
  idempotent?: boolean
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

export const depositCohabitationWarehouseItem = async (contractId: string, payload: CohabitationWarehouseItemPayload) => {
  return postCohabitationJson<CohabitationWarehouseItemResponse>(
    contractPath(contractId, '/warehouse/deposit'),
    payload as unknown as Record<string, unknown>,
    '放入共同仓库物品失败'
  )
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

export const updateCohabitationPermissions = async (contractId: string, payload: CohabitationPermissionUpdatePayload) => {
  return postCohabitationJson<CohabitationPermissionUpdateResponse>(
    contractPath(contractId, '/permissions'),
    payload as unknown as Record<string, unknown>,
    '更新共同庄园权限失败'
  )
}

export const fetchCohabitationFamilyRoles = async (contractId: string) => {
  return fetchCohabitationJson<CohabitationDetailResponse & {
    role_panel?: CohabitationFamilyRolePanel
  }>(contractPath(contractId, '/roles'), '获取家族庄园职位失败')
}

export const fetchCohabitationFamilyOrders = async (contractId: string) => {
  return fetchCohabitationJson<CohabitationDetailResponse & {
    family_orders_panel?: CohabitationFamilyOrdersPanel
  }>(contractPath(contractId, '/family-orders'), '获取家族订单预备面板失败')
}

export const fetchCohabitationFamilyReputation = async (contractId: string) => {
  return fetchCohabitationJson<CohabitationDetailResponse & {
    family_reputation_panel?: CohabitationFamilyReputationPanel
  }>(contractPath(contractId, '/family-reputation'), '获取家族声望预备面板失败')
}

export const fetchCohabitationFamilyBuildings = async (contractId: string) => {
  return fetchCohabitationJson<CohabitationDetailResponse & {
    family_buildings_panel?: CohabitationFamilyBuildingsPanel
  }>(contractPath(contractId, '/family-buildings'), '获取家族建筑预备面板失败')
}

export const fetchCohabitationFamilyRelations = async (contractId: string) => {
  return fetchCohabitationJson<CohabitationDetailResponse & {
    family_relations_panel?: CohabitationFamilyRelationsPanel
  }>(contractPath(contractId, '/family-relations'), '获取家族关系图预备面板失败')
}

export const updateCohabitationFamilyRole = async (contractId: string, payload: CohabitationFamilyRoleUpdatePayload) => {
  return postCohabitationJson<CohabitationFamilyRoleUpdateResponse>(
    contractPath(contractId, '/roles'),
    payload as unknown as Record<string, unknown>,
    '调整家族庄园职位失败'
  )
}

export const fetchCohabitationOfflineStatus = async (contractId: string) => {
  return fetchCohabitationJson<CohabitationDetailResponse & {
    offline_status?: CohabitationOfflineStatus
  }>(contractPath(contractId, '/offline-status'), '获取离线经营状态失败')
}
