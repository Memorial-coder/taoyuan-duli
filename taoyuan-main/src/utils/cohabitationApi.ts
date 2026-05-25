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
  spend_category?: string
  spend_tier?: string
  spend_purpose_label?: string
  target_item_id?: string
  target_quantity?: number
  target_unit_price?: number
  balance_after?: number
  confirmation_required?: boolean
  confirmation_status?: string
  reversible?: boolean
  compensation_hint?: string
  idempotency_key: string
  status: string
  created_at: number
}

export interface CohabitationFundLargeSpendDraftConfirmationEvent {
  actor_username: string
  actor_display_name: string
  confirmed_at: number
  idempotency_key: string
  memo: string
}

export interface CohabitationFundLargeSpendDraft {
  id: string
  contract_id: string
  state: 'pending_confirmation' | 'ready_to_execute' | 'executed' | 'expired' | 'cancelled' | string
  requested_by: string
  requested_by_key: string
  amount: number
  purpose: string
  purpose_label: string
  spend_category: string
  target_ref: string
  memo: string
  balance_snapshot: number
  projected_balance_after: number
  current_balance_snapshot: number
  projected_current_balance_after: number
  balance_sufficient: boolean
  required_member_usernames: string[]
  confirmed_member_usernames: string[]
  pending_member_usernames: string[]
  confirmation_events: CohabitationFundLargeSpendDraftConfirmationEvent[]
  confirmation_state: {
    required_member_usernames: string[]
    confirmed_member_usernames: string[]
    pending_member_usernames: string[]
    requester_auto_confirmed: boolean
    requires_all_members: boolean
    all_members_confirmed: boolean
    ready_for_execution_request: boolean
    last_confirmed_by: string
    last_confirmed_at: number
    can_execute_now: boolean
    execution_enabled: boolean
    policy: string
    [key: string]: unknown
  }
  created_at: number
  expires_at: number
  ready_at: number
  confirmed_at: number
  executed_at: number
  executed_by: string
  last_confirmed_by: string
  last_confirmed_at: number
  idempotency_key: string
  confirmation_required: boolean
  confirmation_status: string
  execution_enabled: boolean
  final_spend_ledger_id: string
  compensation_policy: string
  deferred_operations: string[]
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
  large_spend_drafts: CohabitationFundLargeSpendDraft[]
  summary: {
    balance: number
    ledger_count: number
    personal_money_merged: boolean
    contribution_enabled: boolean
    spend_enabled: boolean
    small_spend_enabled?: boolean
    medium_spend_enabled?: boolean
    large_spend_enabled?: boolean
    large_spend_draft_enabled?: boolean
    large_spend_execution_enabled?: boolean
    small_spend_max_amount?: number
    medium_spend_max_amount?: number
    large_spend_max_amount?: number
    allowed_small_spend_purposes?: Array<{
      id: string
      label: string
      category: string
      max_amount: number
      auto_pay_eligible: boolean
    }>
    allowed_medium_spend_purposes?: Array<{
      id: string
      label: string
      category: string
      max_amount: number
      auto_pay_eligible: boolean
    }>
    allowed_large_spend_purposes?: Array<{
      id: string
      label: string
      category: string
      max_amount: number
      confirmation_required: boolean
    }>
    pending_large_spend_draft_count?: number
    ready_large_spend_draft_count?: number
    executed_large_spend_draft_count?: number
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

export interface CohabitationFamilyBuildingLedgerEntry {
  id: string
  contract_id: string
  action: string
  purpose: string
  purpose_label: string
  spend_category: string
  target_ref: string
  building_id: string | null
  project_id: string | null
  draft_id: string | null
  fund_ledger_id: string | null
  actor_username: string
  actor_display_name: string
  actor_manor_role: string
  actor_manor_role_label: string
  amount: number
  shared_fund_balance_before: number
  shared_fund_balance_after: number
  shared_fund_deducted: boolean
  shared_warehouse_materials_consumed: boolean
  personal_money_merged: boolean
  personal_inventory_merged: boolean
  real_build_applied: boolean
  apply_idempotency_key: string
  applied_at: number
  applied_by_username: string
  applied_by_display_name: string
  real_build_ref: string
  materials_idempotency_key: string
  materials_consumed_at: number
  materials_consumed_by_username: string
  materials_consumed_by_display_name: string
  material_ledger_ids: string[]
  material_consumptions: Array<{
    item_id: string
    label: string
    quantity: number
    quality: string
    warehouse_ledger_ids: string[]
  }>
  rollback_idempotency_key: string
  reverted_at: number
  reverted_by_username: string
  reverted_by_display_name: string
  rollback_reason: string
  rollback_policy: string
  compensation_required: boolean
  compensation_hint: string
  deferred_operations: string[]
  at: number
  created_at: number
  idempotency_key: string
  reversible: boolean
  status: string
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
    construction_ledger_count: number
    latest_construction_ledger_id: string | null
    real_build_applied_count: number
    warehouse_material_consumed_count: number
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
    real_build_applied: boolean
    shared_warehouse_materials_consumed: boolean
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
  construction_ledger: CohabitationFamilyBuildingLedgerEntry[]
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

export interface CohabitationFamilyVisibilityMember extends CohabitationMember {
  manor_role: string
  manor_role_label: string
  visibility_permissions: Record<string, boolean | string>
}

export interface CohabitationFamilyVisibilityScope {
  id: string
  label: string
  enabled: boolean
  summary: string
  write_enabled: boolean
}

export interface CohabitationFamilyVisibilityDataCategory {
  id: string
  label: string
  online_visible: boolean
  publication_allowed: boolean
  source: string
  write_enabled: boolean
}

export interface CohabitationFamilyVisibilityPanel {
  contract_id: string
  shared_manor_id: string
  type: string
  type_label: string
  status: string
  readonly: boolean
  write_enabled: boolean
  writes_enabled: boolean
  visibility_settings_enabled: boolean
  generated_at: number
  revision: number
  summary: {
    default_scope: string
    member_count: number
    accepted_member_count: number
    max_members: number
    public_profile_enabled: boolean
    festival_room_binding_enabled: boolean
    local_graph_publication_enabled: boolean
    personal_graph_auto_publish_enabled: boolean
    consent_required: boolean
    visibility_audit_enabled: boolean
    rollback_enabled: boolean
    disabled_reason: string
  }
  actor: CohabitationFamilyVisibilityMember | null
  members: CohabitationFamilyVisibilityMember[]
  visibility_scopes: CohabitationFamilyVisibilityScope[]
  data_categories: CohabitationFamilyVisibilityDataCategory[]
  default_policy: Record<string, unknown>
  privacy_guards: Record<string, unknown>
  governance: Record<string, unknown>
  deferred_operations: string[]
}

export interface CohabitationFamilyFestivalSeatMember extends CohabitationMember {
  manor_role: string
  manor_role_label: string
  seat_id: string
  seat_index: number
  seat_label: string
  festival_role: string
  seat_summary: string
  seat_state: string
  seat_permissions: Record<string, boolean>
}

export interface CohabitationFamilyFestivalSeatTemplate {
  id: string
  label: string
  visual_type: string
  member_limit: number
  family_compatible: boolean
  available: boolean
  binding_enabled: boolean
  room_create_enabled: boolean
  reward_enabled: boolean
  unlock_source: string
  recommended_roles: string[]
  summary: string
  disabled_reason: string
}

export interface CohabitationFamilyFestivalSeatSceneObject {
  id: string
  label: string
  kind: string
  state: string
  x: number
  y: number
  linked_template_ids?: string[]
  linked_role_ids?: string[]
  seat_count?: number
  available_action_ids: string[]
}

export interface CohabitationFamilyFestivalSeatsPanel {
  contract_id: string
  shared_manor_id: string
  type: string
  type_label: string
  status: string
  readonly: boolean
  write_enabled: boolean
  writes_enabled: boolean
  festival_seats_enabled: boolean
  seat_reservation_enabled: boolean
  festival_room_binding_enabled: boolean
  generated_at: number
  revision: number
  summary: {
    member_count: number
    max_members: number
    preview_seat_count: number
    available_template_count: number
    festival_room_create_enabled: boolean
    festival_room_invite_enabled: boolean
    settlement_enabled: boolean
    reward_enabled: boolean
    reputation_award_enabled: boolean
    shared_fund_spend_enabled: boolean
    shared_warehouse_consume_enabled: boolean
    festival_ticket_spend_enabled: boolean
    personal_money_merged: boolean
    personal_inventory_merged: boolean
    disabled_reason: string
  }
  actor: CohabitationFamilyFestivalSeatMember | null
  members: CohabitationFamilyFestivalSeatMember[]
  candidate_templates: CohabitationFamilyFestivalSeatTemplate[]
  visual_state_preview: {
    board_type: string
    board_id: string
    revision: number
    selected_visual_id: string
    recent_feedback: string
    scene: Record<string, unknown> | null
    scene_objects: CohabitationFamilyFestivalSeatSceneObject[]
    seats: Array<{
      seat_id: string
      seat_index: number
      seat_label: string
      username: string
      display_name: string
      manor_role: string
      manor_role_label: string
      festival_role: string
      state: string
    }>
  }
  governance: Record<string, unknown>
  settlement: Record<string, unknown>
  recommended_flow: string[]
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
  confirmation_state?: {
    state?: string
    required_member_usernames?: string[]
    confirmed_by?: string[]
    pending_member_usernames?: string[]
    all_members_confirmed?: boolean
    ready_for_execution_request?: boolean
    can_execute_now?: boolean
    execution_enabled?: boolean
    execution_request?: {
      id?: string
      status?: string
      requested_by?: string
      requested_at?: number
      asset_return_executed?: boolean
      asset_return_recorded_at?: number
      asset_return_recorded_by?: string
      execution_ledger_id?: string
      personal_save_written?: boolean
      personal_save_written_at?: number
      personal_save_written_by?: string
      personal_save_receipts?: Array<Record<string, unknown>>
      family_story_resolved?: boolean
      family_story_resolved_at?: number
      family_story_resolved_by?: string
      family_story_resolution?: Record<string, unknown>
      personal_story_receipts_written?: boolean
      personal_story_receipts_written_at?: number
      personal_story_receipts_written_by?: string
      personal_story_receipts?: Array<Record<string, unknown>>
      child_arrangement_resolved?: boolean
      child_arrangement_resolved_at?: number
      child_arrangement_resolved_by?: string
      child_arrangement_resolution?: Record<string, unknown>
      personal_family_receipts_written?: boolean
      personal_family_receipts_written_at?: number
      personal_family_receipts_written_by?: string
      personal_family_receipts?: Array<Record<string, unknown>>
      decorations_buildings_split?: boolean
      decorations_buildings_split_at?: number
      decorations_buildings_split_by?: string
      decoration_building_split_receipts?: Array<Record<string, unknown>>
      execution_enabled?: boolean
      next_required_operations?: string[]
      [key: string]: unknown
    }
    [key: string]: unknown
  }
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

export interface CohabitationFundLargeSpendDraftPayload {
  amount: number
  purpose: string
  target_ref: string
  memo?: string
  idempotency_key: string
}

export interface CohabitationFundLargeSpendDraftConfirmPayload {
  memo?: string
  idempotency_key: string
}

export interface CohabitationFundLargeSpendDraftExecutePayload {
  memo?: string
  idempotency_key: string
}

export interface CohabitationFamilyBuildingLedgerPayload {
  building_ledger_id: string
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

export interface CohabitationContractCreatePayload {
  type: string
  title?: string
  target_usernames: string[]
  idempotency_key: string
}

export interface CohabitationSeparationPreviewPayload {
  reason?: string
  idempotency_key: string
}

export interface CohabitationSeparationPreviewConfirmPayload {
  memo?: string
  idempotency_key: string
}

export interface CohabitationSeparationExecutionRequestPayload {
  memo?: string
  idempotency_key: string
}

export interface CohabitationSeparationAssetReturnExecutePayload {
  execution_request_id?: string
  plot_return_manifest_hash?: string
  memo?: string
  idempotency_key: string
}

export interface CohabitationSeparationPersonalFarmWritePayload {
  execution_ledger_id?: string
  plot_return_manifest_hash?: string
  memo?: string
  idempotency_key: string
}

export interface CohabitationSeparationSharedFundRefundPayload {
  execution_ledger_id?: string
  plot_return_manifest_hash?: string
  memo?: string
  idempotency_key: string
}

export interface CohabitationSeparationSharedWarehouseReturnPayload {
  execution_ledger_id?: string
  plot_return_manifest_hash?: string
  memo?: string
  idempotency_key: string
}

export interface CohabitationSeparationDecorationBuildingSplitPayload {
  execution_ledger_id?: string
  plot_return_manifest_hash?: string
  decoration_split_manifest_hash?: string
  building_split_manifest_hash?: string
  memo?: string
  idempotency_key: string
}

export interface CohabitationSeparationFamilyStoryResolvePayload {
  execution_ledger_id?: string
  plot_return_manifest_hash?: string
  resolution_choice?: 'peaceful_separation' | 'cooling_off' | 'family_meeting' | 'manual_review' | string
  memo?: string
  idempotency_key: string
}

export interface CohabitationSeparationPersonalStoryReceiptsPayload {
  execution_ledger_id?: string
  plot_return_manifest_hash?: string
  memo?: string
  idempotency_key: string
}

export interface CohabitationSeparationChildArrangementResolvePayload {
  execution_ledger_id?: string
  plot_return_manifest_hash?: string
  arrangement_choice?: 'shared_care_pending_personal_saves' | 'owner_care_pending_personal_saves' | 'manual_family_review' | string
  memo?: string
  idempotency_key: string
}

export interface CohabitationSeparationPersonalFamilyReceiptsPayload {
  execution_ledger_id?: string
  plot_return_manifest_hash?: string
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

export interface CohabitationFundLargeSpendDraftResponse extends CohabitationDetailResponse {
  fund?: CohabitationFundSnapshot
  draft: CohabitationFundLargeSpendDraft
  ledger_entry?: CohabitationFundLedgerEntry
  building_ledger_entry?: CohabitationFamilyBuildingLedgerEntry
  idempotent?: boolean
  already_executed?: boolean
  shared_fund?: {
    balance_before?: number
    balance_after?: number
    projected_balance_after?: number
    deducted_amount?: number
    personal_money_merged: boolean
    confirmation_required: boolean
    confirmation_status?: string
    execution_enabled?: boolean
    building_ledger_written?: boolean
  }
}

export interface CohabitationFamilyBuildingLedgerActionResponse extends CohabitationDetailResponse {
  family_buildings_panel?: CohabitationFamilyBuildingsPanel
  warehouse?: CohabitationWarehouseSnapshot
  fund?: CohabitationFundSnapshot
  building_ledger_entry?: CohabitationFamilyBuildingLedgerEntry
  material_ledger_entries?: CohabitationWarehouseLedgerEntry[]
  idempotent?: boolean
  already_applied?: boolean
  already_consumed?: boolean
  already_reverted?: boolean
  rollback?: {
    shared_fund_refunded?: boolean
    shared_warehouse_restored?: boolean
    personal_money_merged?: boolean
    personal_inventory_merged?: boolean
  }
  shared_warehouse?: {
    consumed_quantity?: number
    material_count?: number
    personal_inventory_merged?: boolean
  }
  shared_fund?: {
    deducted_amount?: number
    balance_after?: number
    personal_money_merged?: boolean
  }
}

export interface CohabitationContractActionResponse extends CohabitationDetailResponse {
  idempotent?: boolean
}

export interface CohabitationSeparationPreviewResponse extends CohabitationDetailResponse {
  preview: CohabitationSeparationPreview
  idempotent?: boolean
}

export interface CohabitationSeparationSharedFundRefundResponse extends CohabitationSeparationPreviewResponse {
  fund?: CohabitationFundSnapshot
  receipts?: Array<Record<string, unknown>>
  fund_ledger_entries?: CohabitationFundLedgerEntry[]
  already_refunded?: boolean
  shared_fund?: {
    refund_total?: number
    balance_before?: number
    balance_after?: number
    personal_money_merged?: boolean
  }
}

export interface CohabitationSeparationSharedWarehouseReturnResponse extends CohabitationSeparationPreviewResponse {
  warehouse?: CohabitationWarehouseSnapshot
  receipts?: Array<Record<string, unknown>>
  warehouse_ledger_entries?: CohabitationWarehouseLedgerEntry[]
  already_returned?: boolean
  shared_warehouse?: {
    returned_quantity?: number
    personal_inventory_merged?: boolean
  }
}

export interface CohabitationSeparationDecorationBuildingSplitResponse extends CohabitationSeparationPreviewResponse {
  execution_ledger?: Record<string, unknown>
  receipts?: Array<Record<string, unknown>>
  already_split?: boolean
}

export interface CohabitationSeparationFamilyStoryResolveResponse extends CohabitationSeparationPreviewResponse {
  execution_ledger?: Record<string, unknown>
  story_resolution?: Record<string, unknown> | null
  already_resolved?: boolean
}

export interface CohabitationSeparationPersonalStoryReceiptsResponse extends CohabitationSeparationPreviewResponse {
  execution_ledger?: Record<string, unknown>
  receipts?: Array<Record<string, unknown>>
  already_written?: boolean
}

export interface CohabitationSeparationChildArrangementResolveResponse extends CohabitationSeparationPreviewResponse {
  execution_ledger?: Record<string, unknown>
  child_arrangement?: Record<string, unknown> | null
  already_resolved?: boolean
}

export interface CohabitationSeparationPersonalFamilyReceiptsResponse extends CohabitationSeparationPreviewResponse {
  execution_ledger?: Record<string, unknown>
  receipts?: Array<Record<string, unknown>>
  already_written?: boolean
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

export const createCohabitationContract = async (payload: CohabitationContractCreatePayload) => {
  return postCohabitationJson<CohabitationContractActionResponse>(
    '/api/taoyuan/online/cohabitation/contracts',
    payload as unknown as Record<string, unknown>,
    '创建共同庄园契约失败'
  )
}

export const acceptCohabitationContract = async (contractId: string) => {
  return postCohabitationJson<CohabitationContractActionResponse>(
    contractPath(contractId, '/accept'),
    {},
    '接受共同庄园契约失败'
  )
}

export const createCohabitationSeparationPreview = async (contractId: string, payload: CohabitationSeparationPreviewPayload) => {
  return postCohabitationJson<CohabitationSeparationPreviewResponse>(
    contractPath(contractId, '/separation-preview'),
    payload as unknown as Record<string, unknown>,
    '生成分居预览失败'
  )
}

export const confirmCohabitationSeparationPreview = async (contractId: string, previewId: string, payload: CohabitationSeparationPreviewConfirmPayload) => {
  return postCohabitationJson<CohabitationSeparationPreviewResponse>(
    contractPath(contractId, `/separation-previews/${encodeURIComponent(previewId)}/confirm`),
    payload as unknown as Record<string, unknown>,
    '确认分居预览失败'
  )
}

export const requestCohabitationSeparationExecution = async (contractId: string, previewId: string, payload: CohabitationSeparationExecutionRequestPayload) => {
  return postCohabitationJson<CohabitationSeparationPreviewResponse>(
    contractPath(contractId, `/separation-previews/${encodeURIComponent(previewId)}/request-execution`),
    payload as unknown as Record<string, unknown>,
    '请求分居执行失败'
  )
}

export const executeCohabitationSeparationAssetReturn = async (contractId: string, previewId: string, payload: CohabitationSeparationAssetReturnExecutePayload) => {
  return postCohabitationJson<CohabitationSeparationPreviewResponse>(
    contractPath(contractId, `/separation-previews/${encodeURIComponent(previewId)}/execute-asset-return`),
    payload as unknown as Record<string, unknown>,
    '记录分居返还执行失败'
  )
}

export const writeCohabitationSeparationPersonalFarmReturns = async (contractId: string, previewId: string, payload: CohabitationSeparationPersonalFarmWritePayload) => {
  return postCohabitationJson<CohabitationSeparationPreviewResponse>(
    contractPath(contractId, `/separation-previews/${encodeURIComponent(previewId)}/write-personal-farm-returns`),
    payload as unknown as Record<string, unknown>,
    '写回分居来源田区失败'
  )
}

export const refundCohabitationSeparationSharedFund = async (contractId: string, previewId: string, payload: CohabitationSeparationSharedFundRefundPayload) => {
  return postCohabitationJson<CohabitationSeparationSharedFundRefundResponse>(
    contractPath(contractId, `/separation-previews/${encodeURIComponent(previewId)}/refund-shared-fund`),
    payload as unknown as Record<string, unknown>,
    '返还分居共同基金失败'
  )
}

export const returnCohabitationSeparationSharedWarehouse = async (contractId: string, previewId: string, payload: CohabitationSeparationSharedWarehouseReturnPayload) => {
  return postCohabitationJson<CohabitationSeparationSharedWarehouseReturnResponse>(
    contractPath(contractId, `/separation-previews/${encodeURIComponent(previewId)}/return-shared-warehouse`),
    payload as unknown as Record<string, unknown>,
    '返还分居共同仓库失败'
  )
}

export const splitCohabitationSeparationDecorationsBuildings = async (contractId: string, previewId: string, payload: CohabitationSeparationDecorationBuildingSplitPayload) => {
  return postCohabitationJson<CohabitationSeparationDecorationBuildingSplitResponse>(
    contractPath(contractId, `/separation-previews/${encodeURIComponent(previewId)}/split-decorations-buildings`),
    payload as unknown as Record<string, unknown>,
    '记录分居装饰 / 建筑拆分失败'
  )
}

export const resolveCohabitationSeparationFamilyStory = async (contractId: string, previewId: string, payload: CohabitationSeparationFamilyStoryResolvePayload) => {
  return postCohabitationJson<CohabitationSeparationFamilyStoryResolveResponse>(
    contractPath(contractId, `/separation-previews/${encodeURIComponent(previewId)}/resolve-family-story`),
    payload as unknown as Record<string, unknown>,
    '记录分居剧情拆分失败'
  )
}

export const writeCohabitationSeparationPersonalStoryReceipts = async (contractId: string, previewId: string, payload: CohabitationSeparationPersonalStoryReceiptsPayload) => {
  return postCohabitationJson<CohabitationSeparationPersonalStoryReceiptsResponse>(
    contractPath(contractId, `/separation-previews/${encodeURIComponent(previewId)}/write-personal-story-receipts`),
    payload as unknown as Record<string, unknown>,
    '写入分居个人剧情回执失败'
  )
}

export const resolveCohabitationSeparationChildArrangement = async (contractId: string, previewId: string, payload: CohabitationSeparationChildArrangementResolvePayload) => {
  return postCohabitationJson<CohabitationSeparationChildArrangementResolveResponse>(
    contractPath(contractId, `/separation-previews/${encodeURIComponent(previewId)}/resolve-child-arrangement`),
    payload as unknown as Record<string, unknown>,
    '记录分居孩子安排失败'
  )
}

export const writeCohabitationSeparationPersonalFamilyReceipts = async (contractId: string, previewId: string, payload: CohabitationSeparationPersonalFamilyReceiptsPayload) => {
  return postCohabitationJson<CohabitationSeparationPersonalFamilyReceiptsResponse>(
    contractPath(contractId, `/separation-previews/${encodeURIComponent(previewId)}/write-personal-family-receipts`),
    payload as unknown as Record<string, unknown>,
    '写入分居个人家庭回执失败'
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

export const createCohabitationFundLargeSpendDraft = async (contractId: string, payload: CohabitationFundLargeSpendDraftPayload) => {
  return postCohabitationJson<CohabitationFundLargeSpendDraftResponse>(
    contractPath(contractId, '/fund/large-spend-draft'),
    payload as unknown as Record<string, unknown>,
    '创建共同基金大额草案失败'
  )
}

export const confirmCohabitationFundLargeSpendDraft = async (contractId: string, draftId: string, payload: CohabitationFundLargeSpendDraftConfirmPayload) => {
  return postCohabitationJson<CohabitationFundLargeSpendDraftResponse>(
    contractPath(contractId, `/fund/large-spend-drafts/${encodeURIComponent(draftId)}/confirm`),
    payload as unknown as Record<string, unknown>,
    '确认共同基金大额草案失败'
  )
}

export const executeCohabitationFundLargeSpendDraft = async (contractId: string, draftId: string, payload: CohabitationFundLargeSpendDraftExecutePayload) => {
  return postCohabitationJson<CohabitationFundLargeSpendDraftResponse>(
    contractPath(contractId, `/fund/large-spend-drafts/${encodeURIComponent(draftId)}/execute`),
    payload as unknown as Record<string, unknown>,
    '执行共同基金大额草案扣款失败'
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

export const applyCohabitationFamilyBuildingRealBuild = async (contractId: string, payload: CohabitationFamilyBuildingLedgerPayload) => {
  return postCohabitationJson<CohabitationFamilyBuildingLedgerActionResponse>(
    contractPath(contractId, '/family-buildings/real-build-apply'),
    payload as unknown as Record<string, unknown>,
    '家族建筑真实落账失败'
  )
}

export const consumeCohabitationFamilyBuildingMaterials = async (contractId: string, payload: CohabitationFamilyBuildingLedgerPayload) => {
  return postCohabitationJson<CohabitationFamilyBuildingLedgerActionResponse>(
    contractPath(contractId, '/family-buildings/materials/consume'),
    payload as unknown as Record<string, unknown>,
    '消耗家族建筑共同仓库材料失败'
  )
}

export const rollbackCohabitationFamilyBuilding = async (contractId: string, payload: CohabitationFamilyBuildingLedgerPayload) => {
  return postCohabitationJson<CohabitationFamilyBuildingLedgerActionResponse>(
    contractPath(contractId, '/family-buildings/rollback'),
    payload as unknown as Record<string, unknown>,
    '记录家族建筑回滚失败'
  )
}

export const fetchCohabitationFamilyRelations = async (contractId: string) => {
  return fetchCohabitationJson<CohabitationDetailResponse & {
    family_relations_panel?: CohabitationFamilyRelationsPanel
  }>(contractPath(contractId, '/family-relations'), '获取家族关系图预备面板失败')
}

export const fetchCohabitationFamilyVisibility = async (contractId: string) => {
  return fetchCohabitationJson<CohabitationDetailResponse & {
    family_visibility_panel?: CohabitationFamilyVisibilityPanel
  }>(contractPath(contractId, '/family-visibility'), '获取家族关系公开设置预备面板失败')
}

export const fetchCohabitationFamilyFestivalSeats = async (contractId: string) => {
  return fetchCohabitationJson<CohabitationDetailResponse & {
    family_festival_seats_panel?: CohabitationFamilyFestivalSeatsPanel
  }>(contractPath(contractId, '/family-festival-seats'), '获取家族节会席位预备面板失败')
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
