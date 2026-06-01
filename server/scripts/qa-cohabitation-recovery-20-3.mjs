import assert from 'node:assert/strict'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..')
const tempDir = path.join(serverRoot, `.tmp-cohabitation-recovery-20-3-${process.pid}`)
const storageFile = path.join(tempDir, '.storage.json')
const contractStoreFile = path.join(tempDir, 'taoyuan_cohabitation_contracts.json')

await rm(tempDir, { recursive: true, force: true })
await mkdir(tempDir, { recursive: true })

process.env.DB_STORAGE = storageFile
process.env.QA_ONLINE_SMOKE_FORCE_LOCAL = 'true'
process.env.MYSQL_HOST = ''
process.env.MYSQL_USER = ''
process.env.MYSQL_DATABASE = ''

const require = createRequire(import.meta.url)
const runtime = require('../src/taoyuanCohabitationRuntime')

const now = Math.floor(Date.now() / 1000)
const owner = 'qa_recovery_owner'
const partner = 'qa_recovery_partner'
const actor = username => ({ username, displayName: username })

const members = [
  {
    username: owner,
    username_key: owner,
    display_name: owner,
    role: 'owner',
    status: 'accepted',
    manor_role: '',
    invited_at: now - 120,
    accepted_at: now - 110,
  },
  {
    username: partner,
    username_key: partner,
    display_name: partner,
    role: 'partner',
    status: 'accepted',
    manor_role: '',
    invited_at: now - 120,
    accepted_at: now - 100,
  },
]

const warehouseLedgerEntry = {
  id: 'qa_recovery_warehouse_ledger',
  action: 'deposit',
  item_id: 'rice',
  quality: 'normal',
  quantity: 3,
  actor_username: partner,
  actor_display_name: partner,
  source_owner_username: partner,
  source_owner_display_name: partner,
  source_save_id: 1,
  source_save_slot: 0,
  source_save_revision: 1,
  at: now - 80,
  idempotency_key: 'qa-recovery-warehouse-ledger',
  status: 'committed',
}

const makeBaseContract = id => ({
  id,
  type: 'lover_cohabitation',
  type_label: '恋人同居',
  title: 'QA 恢复契约',
  status: 'active',
  shared_manor_id: `qa_manor_${id}`,
  members,
  shared_fund: {
    balance: 100,
    ledger: [
      {
        id: 'qa_recovery_fund_ledger',
        action: 'contribution',
        amount: 100,
        actor_username: owner,
        actor_display_name: owner,
        source_owner_username: owner,
        source_owner_display_name: owner,
        balance_after: 100,
        at: now - 90,
        idempotency_key: 'qa-recovery-fund-ledger',
        status: 'committed',
      },
    ],
  },
  shared_warehouse: {
    ledger: [warehouseLedgerEntry],
  },
  permissions: {},
  origin_assets: {},
  created_by: owner,
  created_at: now - 120,
  updated_at: now - 80,
  activated_at: now - 100,
  audit_log: [
    {
      id: 'qa_recovery_seed_audit',
      action: 'contract_created',
      actor_username: owner,
      actor_display_name: owner,
      at: now - 120,
      idempotency_key: 'qa-recovery-seed',
      detail: { seeded: true },
    },
  ],
})

const recoveryContractId = 'qa_recovery_contract'
const safeTargetSnapshot = makeBaseContract(recoveryContractId)
const safeCurrentSnapshot = {
  ...makeBaseContract(recoveryContractId),
  title: 'QA 恢复契约 - 异常状态',
  updated_at: now - 20,
  audit_log: [
    {
      id: 'qa_recovery_bad_audit',
      action: 'permissions_updated',
      actor_username: owner,
      actor_display_name: owner,
      at: now - 20,
      idempotency_key: 'qa-recovery-bad-audit',
      detail: { drift: true },
    },
  ],
}
const recoveryContract = {
  ...safeCurrentSnapshot,
  contract_safe_versions: [
    {
      id: 'qa_safe_current',
      created_at: now - 10,
      source_action: 'qa_current',
      actor_username: owner,
      actor_display_name: owner,
      snapshot: safeCurrentSnapshot,
    },
    {
      id: 'qa_safe_target',
      created_at: now - 60,
      source_action: 'qa_target',
      actor_username: owner,
      actor_display_name: owner,
      snapshot: safeTargetSnapshot,
    },
  ],
}

const storyContractId = 'qa_recovery_story_contract'
const plotHash = 'a'.repeat(64)
const storyContract = {
  ...makeBaseContract(storyContractId),
  separation_previews: [
    {
      id: 'qa_story_preview',
      contract_id: storyContractId,
      requested_by: owner,
      state: 'confirmed',
      version: 1,
      created_at: now - 70,
      expires_at: now + 3600,
      confirm_after_at: now - 60,
      asset_return: {
        plot_return_manifest: [],
        plot_return_manifest_hash: plotHash,
      },
      confirmation_state: {
        all_members_confirmed: true,
        execution_request: {
          status: 'family_story_resolved',
          execution_ledger_id: 'qa_story_ledger',
          family_story_resolution: {
            relation_type: 'lover_cohabitation',
            relationship_story_rule: 'lover_farewell_moveout_record',
            story_event_kind: 'lover_farewell_moveout',
            dialogue_event_id: 'separation_lover_farewell_dialogue',
            animation_event_id: 'separation_lover_moveout_animation',
            frontend_cinematic_pending: true,
            story_content_version: 1,
            dialogue_lines: [
              { line_id: 'qa_line', speaker_role: 'member_a', text: '确认前先回看。' },
            ],
            animation_cues: [
              { cue_id: 'qa_cue', stage: 'gate', action: 'part', duration_ms: 800 },
            ],
          },
        },
      },
    },
  ],
  separation_execution_ledger: [
    {
      id: 'qa_story_ledger',
      preview_id: 'qa_story_preview',
      preview_version: 1,
      status: 'family_story_resolved',
      plot_return_manifest_hash: plotHash,
      family_story_resolved: true,
      family_story_resolution: {
        relation_type: 'lover_cohabitation',
        relationship_story_rule: 'lover_farewell_moveout_record',
        story_event_kind: 'lover_farewell_moveout',
        dialogue_event_id: 'separation_lover_farewell_dialogue',
        animation_event_id: 'separation_lover_moveout_animation',
        frontend_cinematic_pending: true,
        story_content_version: 1,
        dialogue_lines: [
          { line_id: 'qa_line', speaker_role: 'member_a', text: '确认前先回看。' },
        ],
        animation_cues: [
          { cue_id: 'qa_cue', stage: 'gate', action: 'part', duration_ms: 800 },
        ],
        personal_story_write_required: true,
        contract_record_only: true,
      },
      next_required_operations: ['write_personal_story_receipts'],
    },
  ],
}

const disputeContractId = 'qa_recovery_dispute_contract'
const disputeContract = {
  ...makeBaseContract(disputeContractId),
  origin_assets: {
    decorations: [
      {
        id: 'qa_decoration_asset',
        decoration_id: 'qa_screen',
        decoration_label: 'QA shared screen',
        origin_owner_username: partner,
        origin_owner_key: partner,
        source_ledger_id: 'qa_decoration_ledger',
        fund_ledger_id: 'qa_recovery_fund_ledger',
        quantity: 1,
      },
    ],
  },
  shared_warehouse_withdrawal_drafts: [
    {
      id: 'qa_high_value_draft',
      state: 'pending_confirmation',
      item_id: 'rice',
      quality: 'fine',
      quantity: 1,
      frozen_quantity: 1,
      requester_username: owner,
      required_member_usernames: [owner, partner],
      source_allocations: [
        {
          source_ledger_ids: ['qa_recovery_warehouse_ledger'],
          quantity: 1,
        },
      ],
      created_at: now - 40,
      idempotency_key: 'qa-high-value-draft',
    },
  ],
  fund_large_spend_drafts: [
    {
      id: 'qa_decoration_removal_draft',
      purpose: 'shared_decoration_removal',
      state: 'executed',
      amount: 20,
      requested_by: owner,
      executed_by: owner,
      executed_at: now - 35,
      target_ref: 'shared_decoration:qa_screen',
      final_spend_ledger_id: 'qa_recovery_fund_ledger',
      high_risk_receipt_status: 'pending',
      idempotency_key: 'qa-decoration-removal-draft',
    },
  ],
  family_building_ledger: [
    {
      id: 'qa_family_building_ledger',
      target_ref: 'family_building:qa_hall',
      building_id: 'qa_hall',
      project_id: 'qa_hall_project',
      amount: 50,
      fund_ledger_id: 'qa_recovery_fund_ledger',
      material_ledger_ids: ['qa_building_material_ledger'],
      shared_fund_deducted: true,
      shared_warehouse_materials_consumed: true,
      at: now - 30,
    },
  ],
}

await writeFile(contractStoreFile, JSON.stringify({
  version: 1,
  contracts: [recoveryContract, storyContract, disputeContract],
}, null, 2))

const disputePreview = await runtime.createSeparationPreview(disputeContractId, {
  reason: 'QA separation dispute source list',
  idempotency_key: 'qa-dispute-source-preview',
}, actor(owner))
const disputeSourceRows = disputePreview.preview.asset_return.separation_asset_dispute_source_rows
assert.ok(Array.isArray(disputeSourceRows), 'separation preview should expose dispute source rows')
assert.ok(disputeSourceRows.some(row => row.category === 'warehouse_high_value_withdrawal_dispute' && row.ledger_ids.includes('qa_recovery_warehouse_ledger')), 'source list should include high-value warehouse draft and source ledger')
assert.ok(disputeSourceRows.some(row => row.category === 'shared_decoration_removal_dispute' && row.ledger_ids.includes('qa_recovery_fund_ledger')), 'source list should include shared decoration removal fund ledger')
assert.ok(disputeSourceRows.some(row => row.category === 'family_building_source' && row.ledger_ids.includes('qa_family_building_ledger')), 'source list should include family building ledger')
assert.ok(disputeSourceRows.some(row => row.category === 'relationship_story_review'), 'source list should include relationship story review row')
assert.ok(disputePreview.preview.asset_return.separation_asset_dispute_source_summary.row_count >= 4, 'source summary should count dispute rows')
assert.ok(disputePreview.contract.audit_log.find(entry => entry.action === 'separation_preview_created')?.detail?.separation_asset_dispute_source_row_count >= 4, 'preview audit should include dispute source row count')

const appeal = await runtime.submitCohabitationRecoveryAppeal(recoveryContractId, {
  issue_type: 'warehouse_misoperation',
  target_ref: 'qa_recovery_warehouse_ledger',
  note: 'QA player appeal keeps ledger and safe version locator',
  idempotency_key: 'qa-recovery-appeal',
}, actor(partner))
assert.equal(appeal.idempotent, false, 'first appeal should write once')
assert.ok(appeal.appeal.warehouse_ledger_ids.includes('qa_recovery_warehouse_ledger'), 'appeal should include warehouse ledger evidence')
assert.ok(appeal.contract.recovery_appeals.find(entry => entry.idempotency_key === 'qa-recovery-appeal'), 'public contract should expose recovery appeal list')
assert.ok(appeal.audit_entry.detail.support_locator.shared_log_available, 'appeal audit should include support locator')

const duplicateAppeal = await runtime.submitCohabitationRecoveryAppeal(recoveryContractId, {
  issue_type: 'warehouse_misoperation',
  idempotency_key: 'qa-recovery-appeal',
}, actor(partner))
assert.equal(duplicateAppeal.idempotent, true, 'duplicate appeal should be idempotent')

await assert.rejects(
  () => runtime.rollbackCohabitationContractSafeVersion(recoveryContractId, {
    safe_version_id: 'qa_safe_target',
    reason: 'missing confirmation',
    confirmation_text: 'wrong',
    idempotency_key: 'qa-safe-rollback-denied',
  }, actor(owner)),
  error => error?.status === 409,
  'safe-version rollback should require confirmation text'
)

const rollback = await runtime.rollbackCohabitationContractSafeVersion(recoveryContractId, {
  safe_version_id: 'qa_safe_target',
  reason: 'QA restore safe contract state',
  confirmation_text: '确认回滚到安全版本',
  idempotency_key: 'qa-safe-rollback',
}, actor(owner))
assert.equal(rollback.idempotent, false, 'first rollback should write once')
assert.equal(rollback.contract.title, 'QA 恢复契约', 'rollback should restore target safe-version snapshot')
assert.ok(rollback.contract.audit_log.find(entry => entry.action === 'contract_safe_version_rolled_back'), 'rollback should be audited')
assert.ok(rollback.contract.recovery_appeals.find(entry => entry.idempotency_key === 'qa-recovery-appeal'), 'rollback should preserve recovery appeal list')

await assert.rejects(
  () => runtime.recordSeparationStoryCinematicPlayback(storyContractId, 'qa_story_preview', {
    execution_ledger_id: 'qa_story_ledger',
    plot_return_manifest_hash: plotHash,
    story_event_kind: 'lover_farewell_moveout',
    dialogue_event_id: 'separation_lover_farewell_dialogue',
    animation_event_id: 'separation_lover_moveout_animation',
    playback_state: 'played',
    idempotency_key: 'qa-story-playback-denied',
  }, actor(owner)),
  error => error?.status === 409,
  'relationship cinematic playback should require confirmation before pending story'
)

const storyPlayback = await runtime.recordSeparationStoryCinematicPlayback(storyContractId, 'qa_story_preview', {
  execution_ledger_id: 'qa_story_ledger',
  plot_return_manifest_hash: plotHash,
  story_event_kind: 'lover_farewell_moveout',
  dialogue_event_id: 'separation_lover_farewell_dialogue',
  animation_event_id: 'separation_lover_moveout_animation',
  playback_state: 'played',
  confirmation_text: '确认播放关系破裂剧情',
  idempotency_key: 'qa-story-playback',
}, actor(owner))
assert.equal(storyPlayback.story_resolution.frontend_cinematic_confirmation_matched, true, 'story playback should keep confirmation evidence')
assert.equal(storyPlayback.cinematic_receipt.confirmation_matched, true, 'story cinematic receipt should expose confirmation evidence')
assert.equal(storyPlayback.contract.audit_log.find(entry => entry.action === 'separation_story_cinematic_played')?.detail?.confirmation_matched, true, 'story playback audit should include confirmation evidence')

await rm(tempDir, { recursive: true, force: true })
console.log('[qa-cohabitation-recovery-20-3] OK')
