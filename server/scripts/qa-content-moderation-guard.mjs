import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taoyuan-content-moderation-'));
process.env.DB_STORAGE = path.join(tempDir, 'users.json');
process.env.CONTENT_MODERATION_AUDIT_SALT = 'qa-content-moderation-salt';
process.env.CONTENT_MODERATION_RETENTION_DAYS = '365';

const textModerationModule = await import('../src/taoyuanTextModeration.js');
const auditModule = await import('../src/taoyuanContentModerationAudit.js');
const dbModule = await import('../src/db.js');
const mailboxModule = await import('../src/taoyuanMailbox.js');
const manorModule = await import('../src/taoyuanManorRuntime.js');
const socialModule = await import('../src/taoyuanSocialRuntime.js');
const societyModule = await import('../src/taoyuanSocietyRuntime.js');
const coopOrderModule = await import('../src/taoyuanCoopOrderRuntime.js');
const activityRoomModule = await import('../src/taoyuanActivityRoomRuntime.js');
const cohabitationModule = await import('../src/taoyuanCohabitationRuntime.js');

const { moderateText, moderateCompositeText } = textModerationModule.default || textModerationModule;
const { listContentModerationEvents } = auditModule.default || auditModule;
const db = dbModule.default || dbModule;
const mailbox = mailboxModule.default || mailboxModule;
const manorRuntime = manorModule.default || manorModule;
const socialRuntime = socialModule.default || socialModule;
const societyRuntime = societyModule.default || societyModule;
const coopOrderRuntime = coopOrderModule.default || coopOrderModule;
const activityRoomRuntime = activityRoomModule.default || activityRoomModule;
const cohabitationRuntime = cohabitationModule.default || cohabitationModule;

function expectRejected(label, fn, expectedCode) {
  try {
    fn();
  } catch (error) {
    assert.equal(error.code, expectedCode, `${label} should use ${expectedCode}`);
    assert.ok(error.moderation?.hit_term_hash !== undefined, `${label} should expose only hit term hash field`);
    assert.equal(error.moderation?.hit_term, undefined, `${label} should not expose raw hit term`);
    return error;
  }
  assert.fail(`${label} should be rejected`);
}

async function expectRejectedAsync(label, fn, expectedCode) {
  try {
    await fn();
  } catch (error) {
    assert.equal(error.code, expectedCode, `${label} should use ${expectedCode}`);
    assert.ok(error.moderation?.hit_term_hash !== undefined, `${label} should expose only hit term hash field`);
    assert.equal(error.moderation?.hit_term, undefined, `${label} should not expose raw hit term`);
    return error;
  }
  assert.fail(`${label} should be rejected`);
}

assert.equal(
  moderateText('普通交流内容', {
    scene: 'qa_content',
    field: 'body',
    auditContext: { request_id: 'qa_normal', username: 'qa_user' },
  }),
  '普通交流内容',
);

expectRejected('hard block', () => moderateText('这里包含恐怖袭击内容', {
  scene: 'qa_hall_post',
  field: 'content',
  auditContext: { request_id: 'qa_hard', username: 'qa_user', content_type: 'hall_post' },
}), 'TEXT_BANNED_TERM');

expectRejected('soft block', () => moderateText('加微信领取外挂', {
  scene: 'qa_hall_reply',
  field: 'content',
  auditContext: { request_id: 'qa_soft', username: 'qa_user', content_type: 'hall_reply' },
}), 'TEXT_SUSPICIOUS_PROMOTION');

expectRejected('length guard', () => moderateText('太短', {
  label: '测试字段',
  minLength: 3,
  scene: 'qa_shape',
  field: 'title',
  auditContext: { request_id: 'qa_shape', username: 'qa_user' },
}), 'TEXT_TOO_SHORT');

moderateCompositeText([
  {
    value: '正常标题',
    field: 'title',
    label: '标题',
    maxLength: 20,
    auditContext: { request_id: 'qa_composite', username: 'qa_user' },
  },
], 'qa_composite');

await expectRejectedAsync('register username audit context', () => db.registerUser(
  '台独玩家',
  'secret123',
  '正常昵称',
  { request_id: 'qa_register', scene: 'register', username: '台独玩家', content_type: 'register' },
), 'TEXT_BANNED_TERM');

await db.registerUser('qa_sender_ugc', 'secret123', '发件人', {
  request_id: 'qa_sender',
  scene: 'register',
  username: 'qa_sender_ugc',
});
await db.registerUser('qa_recipient_ugc', 'secret123', '收件人', {
  request_id: 'qa_recipient',
  scene: 'register',
  username: 'qa_recipient_ugc',
});

function writeOfflineQueueFriendshipFixture() {
  const now = Math.floor(Date.now() / 1000);
  fs.writeFileSync(path.join(tempDir, 'taoyuan_social_profiles.json'), JSON.stringify({
    profiles: {},
    friend_requests: [],
    friendships: [
      {
        id: 'qa_friendship_offline_queue',
        username_a: 'qa_sender_ugc',
        username_b: 'qa_recipient_ugc',
        created_at: now,
        updated_at: now,
        last_interaction_at: now,
      },
    ],
    blocks: [],
    neighbor_groups: [],
    neighbor_join_requests: [],
    subscriptions: [],
  }, null, 2));
}

async function createActiveOfflineQueueContractFixture() {
  writeOfflineQueueFriendshipFixture();
  const created = await cohabitationRuntime.createCohabitationContract(
    {
      type: 'lover_cohabitation',
      title: '正常离线队列契约',
      target_username: 'qa_recipient_ugc',
      idempotency_key: 'qa_offline_queue_contract',
    },
    {
      username: 'qa_sender_ugc',
      displayName: '发件人',
      auditContext: { request_id: 'qa_offline_queue_contract', scene: 'cohabitation_contract', content_type: 'cohabitation_contract' },
    },
  );
  const accepted = await cohabitationRuntime.acceptCohabitationContract(
    created.contract.id,
    {
      username: 'qa_recipient_ugc',
      displayName: '收件人',
      auditContext: { request_id: 'qa_offline_queue_contract_accept', scene: 'cohabitation_contract_accept', content_type: 'cohabitation_contract' },
    },
  );
  assert.equal(accepted.contract.status, 'active', 'offline queue fixture contract should be active');
  return accepted.contract.id;
}

async function expectOfflineQueueOperationRejected(label, contractId, requestId, operation) {
  const result = await cohabitationRuntime.mergeCohabitationOfflineQueue(
    contractId,
    {
      idempotency_key: `${requestId}:merge`,
      operations: [operation],
    },
    {
      username: 'qa_sender_ugc',
      displayName: '发件人',
      auditContext: { request_id: requestId, scene: 'cohabitation_offline_queue_merge', content_type: 'cohabitation_offline_operation' },
    },
  );
  assert.equal(result.offline_queue_merge.rejected_count, 1, `${label} should be rejected by offline merge`);
  assert.equal(result.offline_queue_merge.accepted_count, 0, `${label} should not mutate offline merge state`);
  assert.ok(result.offline_queue_merge.rejected[0]?.reason, `${label} should keep rejection evidence`);
  assert.equal(result.offline_queue_merge.rejected[0]?.error_status, 400, `${label} should reject during payload moderation`);
}

const offlineQueueContractId = await createActiveOfflineQueueContractFixture();

function buildOfflineQueueOperation(action, payload = {}) {
  return {
    action,
    operation_id: `qa_offline_queue_${action}_op`,
    payload: {
      ...payload,
      memo: payload.memo ?? `恐怖袭击离线队列 ${action} 备注`,
    },
  };
}

const offlineQueueOperationCases = [
  {
    label: 'offline queue shared farm water memo audit context',
    requestId: 'qa_cohab_offline_queue_water_shared_farm',
    operation: buildOfflineQueueOperation('water_shared_farm', { plot_id: 'qa_plot' }),
  },
  {
    label: 'offline queue shared farm care memo audit context',
    requestId: 'qa_cohab_offline_queue_care_shared_farm',
    operation: buildOfflineQueueOperation('care_shared_farm', { plot_id: 'qa_plot', action: 'cure_pests' }),
  },
  {
    label: 'offline queue shared farm plant memo audit context',
    requestId: 'qa_cohab_offline_queue_plant_shared_farm',
    operation: buildOfflineQueueOperation('plant_shared_farm', { plot_id: 'qa_plot', seed_item_id: 'seed_cabbage' }),
  },
  {
    label: 'offline queue shared farm basic fertilize memo audit context',
    requestId: 'qa_cohab_offline_queue_fertilize_shared_farm_basic',
    operation: buildOfflineQueueOperation('fertilize_shared_farm_basic', { plot_id: 'qa_plot' }),
  },
  {
    label: 'offline queue shared farm premium fertilize memo audit context',
    requestId: 'qa_cohab_offline_queue_fertilize_shared_farm_premium',
    operation: buildOfflineQueueOperation('fertilize_shared_farm_premium', { plot_id: 'qa_plot' }),
  },
  {
    label: 'offline queue shared farm harvest memo audit context',
    requestId: 'qa_cohab_offline_queue_harvest_shared_farm',
    operation: buildOfflineQueueOperation('harvest_shared_farm', { plot_id: 'qa_plot' }),
  },
  {
    label: 'offline queue shared animal feed memo audit context',
    requestId: 'qa_cohab_offline_queue_feed_shared_animal',
    operation: buildOfflineQueueOperation('feed_shared_animal', { animal_id: 'qa_animal', feed_item_id: 'hay' }),
  },
  {
    label: 'offline queue shared animal pet memo audit context',
    requestId: 'qa_cohab_offline_queue_pet_shared_animal',
    operation: buildOfflineQueueOperation('pet_shared_animal', { animal_id: 'qa_animal' }),
  },
  {
    label: 'offline queue shared animal product memo audit context',
    requestId: 'qa_cohab_offline_queue_collect_shared_animal_product',
    operation: buildOfflineQueueOperation('collect_shared_animal_product', { animal_id: 'qa_animal' }),
  },
  {
    label: 'offline queue shared animal buy name audit context',
    requestId: 'qa_cohab_offline_queue_buy_shared_animal',
    operation: buildOfflineQueueOperation('buy_shared_animal', { animal_type: 'chicken', name: '台独离线小鸡', memo: '' }),
  },
  {
    label: 'offline queue shared animal sell memo audit context',
    requestId: 'qa_cohab_offline_queue_sell_shared_animal',
    operation: buildOfflineQueueOperation('sell_shared_animal', { animal_id: 'qa_animal' }),
  },
  {
    label: 'offline queue shared pet care memo audit context',
    requestId: 'qa_cohab_offline_queue_care_shared_pet',
    operation: buildOfflineQueueOperation('care_shared_pet', { pet_id: 'qa_pet', care_item_id: 'vitality_feed' }),
  },
  {
    label: 'offline queue shared workshop memo audit context',
    requestId: 'qa_cohab_offline_queue_process_shared_workshop_recipe',
    operation: buildOfflineQueueOperation('process_shared_workshop_recipe', { recipe_id: 'shared_dried_cabbage' }),
  },
  {
    label: 'offline queue shared decoration move memo audit context',
    requestId: 'qa_cohab_offline_queue_move_shared_decoration',
    operation: buildOfflineQueueOperation('move_shared_decoration', { decoration_id: 'qa_decoration', to_location_ref: 'shared_room:qa' }),
  },
  {
    label: 'offline queue rare item delivery receipt memo audit context',
    requestId: 'qa_cohab_offline_queue_record_rare_item_delivery_receipt',
    operation: buildOfflineQueueOperation('record_rare_item_delivery_receipt', { draft_id: 'qa_rare_delivery_draft', receipt_ref: 'qa_rare_delivery_receipt' }),
  },
  {
    label: 'offline queue rare item refund receipt memo audit context',
    requestId: 'qa_cohab_offline_queue_record_rare_item_refund_receipt',
    operation: buildOfflineQueueOperation('record_rare_item_refund_receipt', { draft_id: 'qa_rare_refund_draft', receipt_ref: 'qa_rare_refund_receipt', compensation_plan_acknowledged: true }),
  },
  {
    label: 'offline queue family major event receipt memo audit context',
    requestId: 'qa_cohab_offline_queue_record_family_major_event_receipt',
    operation: buildOfflineQueueOperation('record_family_major_event_receipt', { draft_id: 'qa_family_event_delivery_draft', receipt_ref: 'qa_family_event_delivery_receipt' }),
  },
  {
    label: 'offline queue family major event refund receipt memo audit context',
    requestId: 'qa_cohab_offline_queue_record_family_major_event_refund_receipt',
    operation: buildOfflineQueueOperation('record_family_major_event_refund_receipt', { draft_id: 'qa_family_event_refund_draft', receipt_ref: 'qa_family_event_refund_receipt', compensation_plan_acknowledged: true }),
  },
  {
    label: 'offline queue limited decoration delivery receipt memo audit context',
    requestId: 'qa_cohab_offline_queue_record_limited_decoration_delivery_receipt',
    operation: buildOfflineQueueOperation('record_limited_decoration_delivery_receipt', { draft_id: 'qa_limited_delivery_draft', receipt_ref: 'qa_limited_delivery_receipt' }),
  },
  {
    label: 'offline queue limited decoration refund receipt memo audit context',
    requestId: 'qa_cohab_offline_queue_record_limited_decoration_refund_receipt',
    operation: buildOfflineQueueOperation('record_limited_decoration_refund_receipt', { draft_id: 'qa_limited_refund_draft', receipt_ref: 'qa_limited_refund_receipt', compensation_plan_acknowledged: true }),
  },
  {
    label: 'offline queue shared decoration removal refund memo audit context',
    requestId: 'qa_cohab_offline_queue_record_shared_decoration_removal_refund_receipt',
    operation: buildOfflineQueueOperation('record_shared_decoration_removal_refund_receipt', { draft_id: 'qa_decoration_refund_draft', receipt_ref: 'qa_decoration_refund_receipt', compensation_plan_acknowledged: true }),
  },
  {
    label: 'offline queue shared decoration removal receipt memo audit context',
    requestId: 'qa_cohab_offline_queue_record_shared_decoration_removal_receipt',
    operation: buildOfflineQueueOperation('record_shared_decoration_removal_receipt', { draft_id: 'qa_decoration_receipt_draft', receipt_ref: 'qa_decoration_receipt_ref' }),
  },
  {
    label: 'offline queue daily settle memo audit context',
    requestId: 'qa_cohab_offline_queue_settle_shared_daily',
    operation: buildOfflineQueueOperation('settle_shared_daily'),
  },
  {
    label: 'offline queue auto income memo audit context',
    requestId: 'qa_cohab_offline_queue_collect_offline_auto_income',
    operation: buildOfflineQueueOperation('collect_offline_auto_income', { target_refs: ['shared_farm:qa_plot'] }),
  },
];

for (const { label, requestId, operation } of offlineQueueOperationCases) {
  await expectOfflineQueueOperationRejected(label, offlineQueueContractId, requestId, operation);
}

await expectRejectedAsync('player letter audit context', () => mailbox.sendPlayerLetter(
  {
    target_username: 'qa_recipient_ugc',
    title: '正常标题',
    content: '这里包含恐怖袭击内容',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_player_letter', scene: 'player_letter', content_type: 'player_letter' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('player gift package audit context', () => mailbox.sendPlayerGiftPackage(
  {
    target_username: 'qa_recipient_ugc',
    title: '正常包裹',
    content: '这里包含恐怖袭击内容',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_player_gift', scene: 'player_gift_package', content_type: 'player_gift_package' },
  },
), 'TEXT_BANNED_TERM');

const adminMailCampaign = await mailbox.saveAdminCampaign(
  {
    title: '活动通知',
    content: '加微信领取外挂',
    recipient_rule: { mode: 'all' },
  },
  {
    username: 'qa_admin',
    displayName: '管理员',
    auditContext: { request_id: 'qa_admin_mail', scene: 'admin_mail_campaign', content_type: 'admin_mail_campaign' },
  },
  'draft',
  { skipPendingCampaigns: true },
);
assert.equal(adminMailCampaign.status, 'draft', 'admin mail campaign should allow suspicious-promotion text with audit review');

await expectRejectedAsync('manor guestbook audit context', () => manorRuntime.leaveGuestbookEntry(
  {
    target_username: 'qa_recipient_ugc',
    content: '这里包含恐怖袭击内容',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_manor_guestbook', scene: 'manor_guestbook', content_type: 'manor_guestbook' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('social profile audit context', () => socialRuntime.updateOwnProfile(
  'qa_sender_ugc',
  { public_intro: '加微信领取外挂' },
  { request_id: 'qa_social_profile', scene: 'online_profile', username: 'qa_sender_ugc', content_type: 'online_profile' },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('neighbor group audit context', () => socialRuntime.createNeighborGroup(
  'qa_sender_ugc',
  { name: '正常邻里', summary: '加微信领取外挂' },
  { request_id: 'qa_neighbor_group', scene: 'neighbor_group', username: 'qa_sender_ugc', content_type: 'neighbor_group' },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('society create audit context', () => societyRuntime.createSociety(
  { name: '台独村社' },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_society_create', scene: 'society_create', content_type: 'society' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('coop order audit context', () => coopOrderRuntime.createCoopOrder(
  {
    title: '正常求助单',
    description: '这里包含恐怖袭击内容',
    deadline_at: Math.floor(Date.now() / 1000) + 3600,
    reward_value: 1,
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_coop_order', scene: 'coop_order', content_type: 'coop_order' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('festival room title audit context', () => activityRoomRuntime.createFestivalRoom(
  {
    template_id: 'lantern_fair',
    title: '台独灯会房',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_festival_room_title', scene: 'festival_room', content_type: 'festival_room' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('expedition room source feedback audit context', () => activityRoomRuntime.createExpeditionRoom(
  {
    template_id: 'expedition_cavern',
    title: '正常远征房',
    source_feedback: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_expedition_room_source', scene: 'expedition_room', content_type: 'expedition_room' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation contract title audit context', () => cohabitationRuntime.createCohabitationContract(
  {
    type: 'lover_cohabitation',
    title: '台独同居契约',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_contract_title', scene: 'cohabitation_contract', content_type: 'cohabitation_contract' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation family order memo audit context', () => cohabitationRuntime.createCohabitationFamilyOrder(
  'qa_contract',
  {
    idempotency_key: 'qa_family_order',
    title: '正常家族订单',
    memo: '加微信领取外挂',
    reward_amount: 1,
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_family_order', scene: 'cohabitation_family_order', content_type: 'cohabitation_family_order' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation family wish title audit context', () => cohabitationRuntime.submitCohabitationFamilyWish(
  'qa_contract',
  {
    idempotency_key: 'qa_family_wish',
    wish_ref: 'qa_wish',
    title: '恐怖袭击心愿',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_family_wish', scene: 'cohabitation_family_wish', content_type: 'cohabitation_family_wish' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation recovery appeal note audit context', () => cohabitationRuntime.submitCohabitationRecoveryAppeal(
  'qa_contract',
  {
    idempotency_key: 'qa_recovery_appeal',
    note: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_recovery_appeal', scene: 'cohabitation_recovery_appeal', content_type: 'cohabitation_recovery_appeal' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation family festival room title audit context', () => cohabitationRuntime.createCohabitationFamilyFestivalRoom(
  'qa_contract',
  {
    idempotency_key: 'qa_family_festival_room',
    title: '台独家族灯会',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_family_festival_room', scene: 'cohabitation_family_festival_room', content_type: 'cohabitation_family_festival_room' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation separation preview reason audit context', () => cohabitationRuntime.createSeparationPreview(
  'qa_contract',
  {
    reason: '恐怖袭击内容',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_separation_preview', scene: 'cohabitation_separation_preview', content_type: 'cohabitation_separation_preview' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation separation failure reason audit context', () => cohabitationRuntime.recordSeparationExecutionFailure(
  'qa_contract',
  'qa_preview',
  {
    idempotency_key: 'qa_separation_failure',
    failure_reason: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_separation_failure', scene: 'cohabitation_separation_failure', content_type: 'cohabitation_separation_failure' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation separation preview confirm memo audit context', () => cohabitationRuntime.confirmSeparationPreview(
  'qa_contract',
  'qa_preview',
  {
    idempotency_key: 'qa_separation_preview_confirm',
    memo: '恐怖袭击确认备注',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_separation_preview_confirm', scene: 'cohabitation_separation_preview_confirm', content_type: 'cohabitation_separation_preview' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation separation execution request memo audit context', () => cohabitationRuntime.requestSeparationExecution(
  'qa_contract',
  'qa_preview',
  {
    idempotency_key: 'qa_separation_execution_request',
    memo: '恐怖袭击执行请求备注',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_separation_execution_request', scene: 'cohabitation_separation_execution_request', content_type: 'cohabitation_separation_execution' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation separation asset return memo audit context', () => cohabitationRuntime.executeSeparationAssetReturn(
  'qa_contract',
  'qa_preview',
  {
    idempotency_key: 'qa_separation_asset_return',
    memo: '恐怖袭击资产返还备注',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_separation_asset_return', scene: 'cohabitation_separation_asset_return_execute', content_type: 'cohabitation_separation_asset_return' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation separation personal farm write memo audit context', () => cohabitationRuntime.writeSeparationPersonalFarmReturns(
  'qa_contract',
  'qa_preview',
  {
    idempotency_key: 'qa_separation_personal_farm',
    memo: '恐怖袭击个人田区写回备注',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_separation_personal_farm', scene: 'cohabitation_separation_personal_farm_write', content_type: 'cohabitation_separation_asset_return' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation separation shared fund delta memo audit context', () => cohabitationRuntime.confirmSeparationSharedFundDelta(
  'qa_contract',
  'qa_preview',
  {
    idempotency_key: 'qa_separation_shared_fund_delta',
    memo: '恐怖袭击共同基金差额备注',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_separation_shared_fund_delta', scene: 'cohabitation_separation_shared_fund_delta_confirm', content_type: 'cohabitation_separation_asset_return' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation separation shared fund refund memo audit context', () => cohabitationRuntime.refundSeparationSharedFund(
  'qa_contract',
  'qa_preview',
  {
    idempotency_key: 'qa_separation_shared_fund_refund',
    memo: '恐怖袭击共同基金返还备注',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_separation_shared_fund_refund', scene: 'cohabitation_separation_shared_fund_refund', content_type: 'cohabitation_separation_asset_return' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation separation shared warehouse return memo audit context', () => cohabitationRuntime.returnSeparationSharedWarehouse(
  'qa_contract',
  'qa_preview',
  {
    idempotency_key: 'qa_separation_shared_warehouse',
    memo: '恐怖袭击共同仓库返还备注',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_separation_shared_warehouse', scene: 'cohabitation_separation_shared_warehouse_return', content_type: 'cohabitation_separation_asset_return' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation separation decoration split memo audit context', () => cohabitationRuntime.splitSeparationDecorationsAndBuildings(
  'qa_contract',
  'qa_preview',
  {
    idempotency_key: 'qa_separation_decoration_split',
    memo: '恐怖袭击装饰建筑拆分备注',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_separation_decoration_split', scene: 'cohabitation_separation_decorations_buildings_split', content_type: 'cohabitation_separation_asset_return' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation separation family story memo audit context', () => cohabitationRuntime.resolveSeparationFamilyStory(
  'qa_contract',
  'qa_preview',
  {
    idempotency_key: 'qa_separation_family_story',
    memo: '恐怖袭击剧情拆分备注',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_separation_family_story', scene: 'cohabitation_separation_family_story_resolve', content_type: 'cohabitation_separation_story' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation separation story cinematic memo audit context', () => cohabitationRuntime.recordSeparationStoryCinematicPlayback(
  'qa_contract',
  'qa_preview',
  {
    idempotency_key: 'qa_separation_story_cinematic',
    memo: '恐怖袭击剧情演出备注',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_separation_story_cinematic', scene: 'cohabitation_separation_story_cinematic_record', content_type: 'cohabitation_separation_story' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation separation story cinematic confirmation audit context', () => cohabitationRuntime.recordSeparationStoryCinematicPlayback(
  'qa_contract',
  'qa_preview',
  {
    idempotency_key: 'qa_separation_story_cinematic_confirm',
    confirmation_text: '恐怖袭击确认文本',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_separation_story_cinematic_confirm', scene: 'cohabitation_separation_story_cinematic_record', content_type: 'cohabitation_separation_story' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation separation personal story receipts memo audit context', () => cohabitationRuntime.writeSeparationPersonalStoryReceipts(
  'qa_contract',
  'qa_preview',
  {
    idempotency_key: 'qa_separation_personal_story',
    memo: '恐怖袭击个人剧情回执备注',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_separation_personal_story', scene: 'cohabitation_separation_personal_story_receipts_write', content_type: 'cohabitation_separation_story' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation separation child arrangement memo audit context', () => cohabitationRuntime.resolveSeparationChildArrangement(
  'qa_contract',
  'qa_preview',
  {
    idempotency_key: 'qa_separation_child_arrangement',
    memo: '恐怖袭击孩子安排备注',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_separation_child_arrangement', scene: 'cohabitation_separation_child_arrangement_resolve', content_type: 'cohabitation_separation_child_arrangement' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation separation personal family receipts memo audit context', () => cohabitationRuntime.writeSeparationPersonalFamilyReceipts(
  'qa_contract',
  'qa_preview',
  {
    idempotency_key: 'qa_separation_personal_family',
    memo: '恐怖袭击个人家庭回执备注',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_separation_personal_family', scene: 'cohabitation_separation_personal_family_receipts_write', content_type: 'cohabitation_separation_child_arrangement' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation daily settle memo audit context', () => cohabitationRuntime.settleCohabitationDailyBonus(
  'qa_contract',
  {
    idempotency_key: 'qa_daily_settle',
    memo: '恐怖袭击日结备注',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_daily_settle', scene: 'cohabitation_daily_settle', content_type: 'cohabitation_daily_settlement' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation family role update note audit context', () => cohabitationRuntime.updateCohabitationFamilyRole(
  'qa_contract',
  {
    idempotency_key: 'qa_family_role_update',
    target_username: 'qa_member',
    manor_role: 'steward',
    note: '恐怖袭击职位备注',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_family_role_update', scene: 'cohabitation_family_role_update', content_type: 'cohabitation_family_role' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation fund freeze reason audit context', () => cohabitationRuntime.freezeCohabitationFundAbnormality(
  'qa_contract',
  {
    idempotency_key: 'qa_fund_freeze',
    reason: '恐怖袭击冻结原因',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_fund_freeze', scene: 'cohabitation_fund_freeze', content_type: 'cohabitation_fund_freeze' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation fund unfreeze reason audit context', () => cohabitationRuntime.unfreezeCohabitationFundAbnormality(
  'qa_contract',
  {
    idempotency_key: 'qa_fund_unfreeze',
    reason: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_fund_unfreeze', scene: 'cohabitation_fund_unfreeze', content_type: 'cohabitation_fund_unfreeze' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation safe version rollback reason audit context', () => cohabitationRuntime.rollbackCohabitationContractSafeVersion(
  'qa_contract',
  {
    idempotency_key: 'qa_safe_rollback',
    safe_version_id: 'qa_safe_version',
    reason: '恐怖袭击回滚原因',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_safe_rollback', scene: 'cohabitation_safe_version_rollback', content_type: 'cohabitation_safe_version_rollback' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation family order accept note audit context', () => cohabitationRuntime.acceptCohabitationFamilyOrder(
  'qa_contract',
  'qa_order',
  {
    idempotency_key: 'qa_order_accept',
    note: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_order_accept', scene: 'cohabitation_family_order_accept', content_type: 'cohabitation_family_order_action' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation family order deliver note audit context', () => cohabitationRuntime.deliverCohabitationFamilyOrder(
  'qa_contract',
  'qa_order',
  {
    idempotency_key: 'qa_order_deliver',
    note: '恐怖袭击交付备注',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_order_deliver', scene: 'cohabitation_family_order_deliver', content_type: 'cohabitation_family_order_action' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation family order settle note audit context', () => cohabitationRuntime.settleCohabitationFamilyOrder(
  'qa_contract',
  'qa_order',
  {
    idempotency_key: 'qa_order_settle',
    note: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_order_settle', scene: 'cohabitation_family_order_settle', content_type: 'cohabitation_family_order_action' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation family reputation award memo audit context', () => cohabitationRuntime.awardCohabitationFamilyReputation(
  'qa_contract',
  {
    idempotency_key: 'qa_reputation_award',
    memo: '恐怖袭击声望备注',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_reputation_award', scene: 'cohabitation_family_reputation', content_type: 'cohabitation_family_reputation' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation family reputation reward memo audit context', () => cohabitationRuntime.claimCohabitationFamilyReputationReward(
  'qa_contract',
  {
    idempotency_key: 'qa_reputation_reward',
    memo: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_reputation_reward', scene: 'cohabitation_family_reputation_reward', content_type: 'cohabitation_family_reputation_reward' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation family visibility memo audit context', () => cohabitationRuntime.updateCohabitationFamilyVisibility(
  'qa_contract',
  {
    idempotency_key: 'qa_visibility_update',
    memo: '恐怖袭击公开备注',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_visibility_update', scene: 'cohabitation_family_visibility', content_type: 'cohabitation_family_visibility' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation family visibility rollback memo audit context', () => cohabitationRuntime.rollbackCohabitationFamilyVisibility(
  'qa_contract',
  {
    idempotency_key: 'qa_visibility_rollback',
    audit_id: 'qa_visibility_audit',
    memo: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_visibility_rollback', scene: 'cohabitation_family_visibility_rollback', content_type: 'cohabitation_family_visibility_rollback' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation family festival reserve memo audit context', () => cohabitationRuntime.reserveCohabitationFamilyFestivalSeats(
  'qa_contract',
  {
    idempotency_key: 'qa_festival_reserve',
    memo: '恐怖袭击席位备注',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_festival_reserve', scene: 'cohabitation_family_festival_reserve', content_type: 'cohabitation_family_festival_reserve' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation family festival supplies memo audit context', () => cohabitationRuntime.consumeCohabitationFamilyFestivalSupplies(
  'qa_contract',
  {
    idempotency_key: 'qa_festival_supplies',
    memo: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_festival_supplies', scene: 'cohabitation_family_festival_supplies', content_type: 'cohabitation_family_festival_supplies' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation family festival settle memo audit context', () => cohabitationRuntime.settleCohabitationFamilyFestivalRewards(
  'qa_contract',
  {
    idempotency_key: 'qa_festival_settle',
    memo: '恐怖袭击结算备注',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_festival_settle', scene: 'cohabitation_family_festival_settle', content_type: 'cohabitation_family_festival_settle' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation shared farm water memo audit context', () => cohabitationRuntime.waterCohabitationSharedFarmPlot(
  'qa_contract',
  {
    idempotency_key: 'qa_farm_water',
    plot_id: 'qa_plot',
    memo: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_farm_water', scene: 'cohabitation_shared_farm_water', content_type: 'cohabitation_shared_farm' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation shared farm care memo audit context', () => cohabitationRuntime.careCohabitationSharedFarmPlot(
  'qa_contract',
  {
    idempotency_key: 'qa_farm_care',
    plot_id: 'qa_plot',
    action: 'cure_pests',
    memo: '恐怖袭击管护备注',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_farm_care', scene: 'cohabitation_shared_farm_care', content_type: 'cohabitation_shared_farm' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation shared farm plant memo audit context', () => cohabitationRuntime.plantCohabitationSharedFarmPlot(
  'qa_contract',
  {
    idempotency_key: 'qa_farm_plant',
    plot_id: 'qa_plot',
    memo: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_farm_plant', scene: 'cohabitation_shared_farm_plant', content_type: 'cohabitation_shared_farm' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation shared farm fertilize memo audit context', () => cohabitationRuntime.fertilizeCohabitationSharedFarmPlot(
  'qa_contract',
  {
    idempotency_key: 'qa_farm_fertilize',
    plot_id: 'qa_plot',
    memo: '恐怖袭击施肥备注',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_farm_fertilize', scene: 'cohabitation_shared_farm_fertilize', content_type: 'cohabitation_shared_farm' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation shared farm harvest memo audit context', () => cohabitationRuntime.harvestCohabitationSharedFarmPlot(
  'qa_contract',
  {
    idempotency_key: 'qa_farm_harvest',
    plot_id: 'qa_plot',
    memo: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_farm_harvest', scene: 'cohabitation_shared_farm_harvest', content_type: 'cohabitation_shared_farm' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation shared animal feed memo audit context', () => cohabitationRuntime.feedCohabitationSharedAnimal(
  'qa_contract',
  {
    idempotency_key: 'qa_animal_feed',
    animal_id: 'qa_animal',
    memo: '恐怖袭击喂食备注',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_animal_feed', scene: 'cohabitation_shared_animal_feed', content_type: 'cohabitation_shared_animal' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation shared animal purchase name audit context', () => cohabitationRuntime.buyCohabitationSharedAnimal(
  'qa_contract',
  {
    idempotency_key: 'qa_animal_purchase',
    animal_type: 'chicken',
    name: '台独小鸡',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_animal_purchase', scene: 'cohabitation_shared_animal_purchase', content_type: 'cohabitation_shared_animal' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation shared animal pet memo audit context', () => cohabitationRuntime.petCohabitationSharedAnimal(
  'qa_contract',
  {
    idempotency_key: 'qa_animal_pet',
    animal_id: 'qa_animal',
    memo: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_animal_pet', scene: 'cohabitation_shared_animal_pet', content_type: 'cohabitation_shared_animal' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation shared animal product memo audit context', () => cohabitationRuntime.collectCohabitationSharedAnimalProduct(
  'qa_contract',
  {
    idempotency_key: 'qa_animal_product',
    animal_id: 'qa_animal',
    memo: '恐怖袭击收集备注',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_animal_product', scene: 'cohabitation_shared_animal_product', content_type: 'cohabitation_shared_animal' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation shared animal sale memo audit context', () => cohabitationRuntime.sellCohabitationSharedAnimal(
  'qa_contract',
  {
    idempotency_key: 'qa_animal_sale',
    animal_id: 'qa_animal',
    memo: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_animal_sale', scene: 'cohabitation_shared_animal_sale', content_type: 'cohabitation_shared_animal' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation shared pet care memo audit context', () => cohabitationRuntime.careCohabitationSharedPet(
  'qa_contract',
  {
    idempotency_key: 'qa_pet_care',
    pet_id: 'qa_pet',
    memo: '恐怖袭击宠物备注',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_pet_care', scene: 'cohabitation_shared_pet_care', content_type: 'cohabitation_shared_pet' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation shared workshop memo audit context', () => cohabitationRuntime.processCohabitationSharedWorkshopRecipe(
  'qa_contract',
  {
    idempotency_key: 'qa_workshop_process',
    recipe_id: 'shared_dried_cabbage',
    memo: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_workshop_process', scene: 'cohabitation_shared_workshop_process', content_type: 'cohabitation_shared_workshop' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation warehouse high-value draft reason audit context', () => cohabitationRuntime.createCohabitationWarehouseHighValueWithdrawalDraft(
  'qa_contract',
  {
    idempotency_key: 'qa_wh_high_value_draft',
    item_id: 'golden_melon',
    quantity: 1,
    quality: 'normal',
    reason: '恐怖袭击高价值取出原因',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_wh_high_value_draft', scene: 'cohabitation_warehouse_high_value_draft', content_type: 'cohabitation_warehouse_high_value' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation warehouse high-value confirm reason audit context', () => cohabitationRuntime.confirmCohabitationWarehouseHighValueWithdrawalDraft(
  'qa_contract',
  'qa_draft',
  {
    idempotency_key: 'qa_wh_high_value_confirm',
    freeze_acknowledged: true,
    rollback_plan_acknowledged: true,
    reason: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_wh_high_value_confirm', scene: 'cohabitation_warehouse_high_value_confirm', content_type: 'cohabitation_warehouse_high_value' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation warehouse high-value execute reason audit context', () => cohabitationRuntime.executeCohabitationWarehouseHighValueWithdrawalDraft(
  'qa_contract',
  'qa_draft',
  {
    idempotency_key: 'qa_wh_high_value_execute',
    reason: '恐怖袭击执行说明',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_wh_high_value_execute', scene: 'cohabitation_warehouse_high_value_execute', content_type: 'cohabitation_warehouse_high_value' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation warehouse high-value rollback reason audit context', () => cohabitationRuntime.rollbackCohabitationWarehouseHighValueWithdrawalDraft(
  'qa_contract',
  'qa_draft',
  {
    idempotency_key: 'qa_wh_high_value_rollback',
    reason: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_wh_high_value_rollback', scene: 'cohabitation_warehouse_high_value_rollback', content_type: 'cohabitation_warehouse_high_value' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation warehouse compensation review reason audit context', () => cohabitationRuntime.requestCohabitationWarehouseHighValueWithdrawalCompensationReview(
  'qa_contract',
  'qa_draft',
  {
    idempotency_key: 'qa_wh_comp_review',
    reason: '恐怖袭击补偿复核原因',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_wh_comp_review', scene: 'cohabitation_warehouse_compensation_review', content_type: 'cohabitation_warehouse_compensation' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation warehouse compensation resolve note audit context', () => cohabitationRuntime.resolveCohabitationWarehouseHighValueWithdrawalCompensationReview(
  'qa_contract',
  'qa_draft',
  {
    idempotency_key: 'qa_wh_comp_resolve',
    decision: 'approved',
    resolution_note: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_wh_comp_resolve', scene: 'cohabitation_warehouse_compensation_resolve', content_type: 'cohabitation_warehouse_compensation' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation warehouse compensation preflight note audit context', () => cohabitationRuntime.recordCohabitationWarehouseHighValueWithdrawalCompensationPreflight(
  'qa_contract',
  'qa_draft',
  {
    idempotency_key: 'qa_wh_comp_preflight',
    operator_note: '恐怖袭击补偿预检说明',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_wh_comp_preflight', scene: 'cohabitation_warehouse_compensation_preflight', content_type: 'cohabitation_warehouse_compensation' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation warehouse compensation auto block note audit context', () => cohabitationRuntime.recordCohabitationWarehouseHighValueWithdrawalCompensationExecution(
  'qa_contract',
  'qa_draft',
  {
    idempotency_key: 'qa_wh_comp_auto_block',
    execution_action: 'auto_restore_shared_warehouse',
    execution_note: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_wh_comp_auto_block', scene: 'cohabitation_warehouse_compensation_auto_block', content_type: 'cohabitation_warehouse_compensation' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation warehouse compensation execution note audit context', () => cohabitationRuntime.recordCohabitationWarehouseHighValueWithdrawalCompensationExecution(
  'qa_contract',
  'qa_draft',
  {
    idempotency_key: 'qa_wh_comp_execution',
    execution_action: 'manual_restore_recorded',
    execution_receipt: 'qa_receipt',
    confirmation_text: 'CONFIRM_MANUAL_COMPENSATION_RECORDED',
    preflight_idempotency_key: 'qa_preflight',
    execution_note: '恐怖袭击补偿执行说明',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_wh_comp_execution', scene: 'cohabitation_warehouse_compensation_execution', content_type: 'cohabitation_warehouse_compensation' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation warehouse manual appeal resolution note audit context', () => cohabitationRuntime.recordCohabitationWarehouseHighValueWithdrawalManualAppealResolution(
  'qa_contract',
  'qa_draft',
  {
    idempotency_key: 'qa_wh_manual_appeal',
    resolution_action: 'manual_appeal_restored',
    resolution_receipt: 'qa_receipt',
    confirmation_text: 'CONFIRM_MANUAL_APPEAL_RESOLUTION_RECORDED',
    execution_idempotency_key: 'qa_execution',
    resolution_note: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_wh_manual_appeal', scene: 'cohabitation_warehouse_manual_appeal_resolution', content_type: 'cohabitation_warehouse_compensation' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation warehouse operator receipt audit note audit context', () => cohabitationRuntime.recordCohabitationWarehouseHighValueWithdrawalOperatorReceiptAuditReview(
  'qa_contract',
  'qa_draft',
  {
    idempotency_key: 'qa_wh_operator_receipt',
    audit_action: 'operator_receipt_verified',
    audit_receipt: 'qa_receipt',
    confirmation_text: 'CONFIRM_OPERATOR_RECEIPT_AUDIT_REVIEWED',
    execution_idempotency_key: 'qa_execution',
    audit_note: '恐怖袭击票据审计说明',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_wh_operator_receipt', scene: 'cohabitation_warehouse_operator_receipt_audit', content_type: 'cohabitation_warehouse_compensation' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation warehouse governance appeal reason audit context', () => cohabitationRuntime.submitCohabitationWarehouseGovernanceAppeal(
  'qa_contract',
  {
    idempotency_key: 'qa_wh_governance_appeal',
    direction: 'all',
    reason: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_wh_governance_appeal', scene: 'cohabitation_warehouse_governance_appeal', content_type: 'cohabitation_warehouse_governance' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation warehouse governance recovery reason audit context', () => cohabitationRuntime.recoverCohabitationWarehouseGovernance(
  'qa_contract',
  {
    idempotency_key: 'qa_wh_governance_recovery',
    direction: 'all',
    reason: '恐怖袭击恢复原因',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_wh_governance_recovery', scene: 'cohabitation_warehouse_governance_recovery', content_type: 'cohabitation_warehouse_governance' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation offline auto income memo audit context', () => cohabitationRuntime.collectCohabitationOfflineAutoIncome(
  'qa_contract',
  {
    idempotency_key: 'qa_offline_auto_income',
    memo: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_offline_auto_income', scene: 'cohabitation_offline_auto_income', content_type: 'cohabitation_offline_operation' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation offline conflict preflight memo audit context', () => cohabitationRuntime.preflightCohabitationOfflineConflicts(
  'qa_contract',
  {
    idempotency_key: 'qa_offline_preflight',
    actions: ['water_shared_farm'],
    memo: '恐怖袭击离线预检备注',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_offline_preflight', scene: 'cohabitation_offline_conflict_preflight', content_type: 'cohabitation_offline_operation' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation offline conflict resolve memo audit context', () => cohabitationRuntime.resolveCohabitationOfflineConflicts(
  'qa_contract',
  {
    idempotency_key: 'qa_offline_resolve',
    operations: [{ action: 'water_shared_farm', payload: { idempotency_key: 'qa_offline_resolve_op', plot_id: 'qa_plot' } }],
    memo: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_offline_resolve', scene: 'cohabitation_offline_conflict_resolve', content_type: 'cohabitation_offline_operation' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation shared decoration move memo audit context', () => cohabitationRuntime.moveCohabitationSharedDecoration(
  'qa_contract',
  {
    idempotency_key: 'qa_decoration_move',
    decoration_id: 'qa_decoration',
    memo: '恐怖袭击装修移动备注',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_decoration_move', scene: 'cohabitation_shared_decoration_move', content_type: 'cohabitation_shared_decoration' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation permissions update note audit context', () => cohabitationRuntime.updateCohabitationPermissions(
  'qa_contract',
  {
    idempotency_key: 'qa_permissions_update',
    note: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_permissions_update', scene: 'cohabitation_permissions_update', content_type: 'cohabitation_permissions' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation permissions default restore note audit context', () => cohabitationRuntime.restoreCohabitationDefaultPermissions(
  'qa_contract',
  {
    idempotency_key: 'qa_permissions_default_restore',
    note: '恐怖袭击默认权限恢复备注',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_permissions_default_restore', scene: 'cohabitation_permissions_default_restore', content_type: 'cohabitation_permissions' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation family child care memo audit context', () => cohabitationRuntime.recordCohabitationFamilyChildCare(
  'qa_contract',
  {
    idempotency_key: 'qa_family_child_care',
    care_ref: 'qa_child_care',
    memo: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_family_child_care', scene: 'cohabitation_family_child_care', content_type: 'cohabitation_family_child_care' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation large fund execute memo audit context', () => cohabitationRuntime.executeCohabitationFundLargeSpendDraft(
  'qa_contract',
  'qa_large_fund_draft',
  {
    idempotency_key: 'qa_large_fund_execute',
    memo: '恐怖袭击扣款备注',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_large_fund_execute', scene: 'cohabitation_fund_large_spend_execute', content_type: 'cohabitation_fund_large_spend' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation high risk receipt memo audit context', () => cohabitationRuntime.recordCohabitationFundHighRiskReceipt(
  'qa_contract',
  'qa_large_fund_draft',
  {
    idempotency_key: 'qa_high_risk_receipt',
    outcome: 'delivered',
    receipt_ref: 'qa_receipt',
    memo: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_high_risk_receipt', scene: 'cohabitation_fund_high_risk_receipt', content_type: 'cohabitation_fund_high_risk_receipt' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation family building real build memo audit context', () => cohabitationRuntime.applyCohabitationFamilyBuildingRealBuild(
  'qa_contract',
  {
    idempotency_key: 'qa_family_build_real_build',
    memo: '恐怖袭击落账备注',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_family_build_real_build', scene: 'cohabitation_family_building_real_build', content_type: 'cohabitation_family_building' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation family building materials consume memo audit context', () => cohabitationRuntime.consumeCohabitationFamilyBuildingMaterials(
  'qa_contract',
  {
    idempotency_key: 'qa_family_build_materials_consume',
    memo: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_family_build_materials_consume', scene: 'cohabitation_family_building_materials_consume', content_type: 'cohabitation_family_building' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation family building rollback reason audit context', () => cohabitationRuntime.rollbackCohabitationFamilyBuilding(
  'qa_contract',
  {
    idempotency_key: 'qa_family_build_rollback',
    reason: '恐怖袭击回滚原因',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_family_build_rollback', scene: 'cohabitation_family_building_rollback', content_type: 'cohabitation_family_building' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation family building fund refund reason audit context', () => cohabitationRuntime.refundCohabitationFamilyBuildingFund(
  'qa_contract',
  {
    idempotency_key: 'qa_family_build_fund_refund',
    reason: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_family_build_fund_refund', scene: 'cohabitation_family_building_fund_refund', content_type: 'cohabitation_family_building' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation family building materials restore reason audit context', () => cohabitationRuntime.restoreCohabitationFamilyBuildingMaterials(
  'qa_contract',
  {
    idempotency_key: 'qa_family_build_materials_restore',
    reason: '恐怖袭击材料恢复原因',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_family_build_materials_restore', scene: 'cohabitation_family_building_materials_restore', content_type: 'cohabitation_family_building' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation family building compensation replay reason audit context', () => cohabitationRuntime.replayCohabitationFamilyBuildingCompensation(
  'qa_contract',
  {
    idempotency_key: 'qa_family_build_comp_replay',
    reason: '恐怖袭击补偿重放原因',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_family_build_comp_replay', scene: 'cohabitation_family_building_compensation_replay', content_type: 'cohabitation_family_building' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation real demolition request reason audit context', () => cohabitationRuntime.requestCohabitationFamilyBuildingRealDemolitionReview(
  'qa_contract',
  {
    idempotency_key: 'qa_real_demolition_request',
    reason: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_real_demolition_request', scene: 'cohabitation_family_building_real_demolition_request', content_type: 'cohabitation_family_building_real_demolition' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation real demolition reject reason audit context', () => cohabitationRuntime.rejectCohabitationFamilyBuildingRealDemolitionReview(
  'qa_contract',
  {
    idempotency_key: 'qa_real_demolition_reject',
    reason: '恐怖袭击驳回原因',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_real_demolition_reject', scene: 'cohabitation_family_building_real_demolition_reject', content_type: 'cohabitation_family_building_real_demolition' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation real demolition approve reason audit context', () => cohabitationRuntime.approveCohabitationFamilyBuildingRealDemolitionReview(
  'qa_contract',
  {
    idempotency_key: 'qa_real_demolition_approve',
    reason: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_real_demolition_approve', scene: 'cohabitation_family_building_real_demolition_approve', content_type: 'cohabitation_family_building_real_demolition' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation real demolition execution request reason audit context', () => cohabitationRuntime.requestCohabitationFamilyBuildingRealDemolitionExecution(
  'qa_contract',
  {
    idempotency_key: 'qa_real_demolition_execution_request',
    reason: '恐怖袭击执行请求原因',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_real_demolition_execution_request', scene: 'cohabitation_family_building_real_demolition_execution_request', content_type: 'cohabitation_family_building_real_demolition' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation real demolition personal save reason audit context', () => cohabitationRuntime.writeCohabitationFamilyBuildingRealDemolitionPersonalSave(
  'qa_contract',
  {
    idempotency_key: 'qa_real_demolition_personal_save',
    reason: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_real_demolition_personal_save', scene: 'cohabitation_family_building_real_demolition_personal_save', content_type: 'cohabitation_family_building_real_demolition' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation real demolition main state preview reason audit context', () => cohabitationRuntime.previewCohabitationFamilyBuildingRealDemolitionMainState(
  'qa_contract',
  {
    idempotency_key: 'qa_real_demolition_preview',
    reason: '恐怖袭击预览原因',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_real_demolition_preview', scene: 'cohabitation_family_building_real_demolition_main_state_preview', content_type: 'cohabitation_family_building_real_demolition' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation real demolition main state mapping reason audit context', () => cohabitationRuntime.verifyCohabitationFamilyBuildingRealDemolitionMainStateMapping(
  'qa_contract',
  {
    idempotency_key: 'qa_real_demolition_mapping',
    reason: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_real_demolition_mapping', scene: 'cohabitation_family_building_real_demolition_main_state_mapping', content_type: 'cohabitation_family_building_real_demolition' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation real demolition main state guard reason audit context', () => cohabitationRuntime.guardCohabitationFamilyBuildingRealDemolitionMainStateMutation(
  'qa_contract',
  {
    idempotency_key: 'qa_real_demolition_guard',
    reason: '恐怖袭击安全阀原因',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_real_demolition_guard', scene: 'cohabitation_family_building_real_demolition_main_state_guard', content_type: 'cohabitation_family_building_real_demolition' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation real demolition main state execute reason audit context', () => cohabitationRuntime.executeCohabitationFamilyBuildingRealDemolitionMainStateMutation(
  'qa_contract',
  {
    idempotency_key: 'qa_real_demolition_execute',
    reason: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_real_demolition_execute', scene: 'cohabitation_family_building_real_demolition_main_state_execute', content_type: 'cohabitation_family_building_real_demolition' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation real demolition exact target reason audit context', () => cohabitationRuntime.bindCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(
  'qa_contract',
  {
    idempotency_key: 'qa_real_demolition_exact_target',
    reason: '恐怖袭击精确目标原因',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_real_demolition_exact_target', scene: 'cohabitation_family_building_real_demolition_exact_target', content_type: 'cohabitation_family_building_real_demolition' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation real demolition exact execute reason audit context', () => cohabitationRuntime.executeCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(
  'qa_contract',
  {
    idempotency_key: 'qa_real_demolition_exact_execute',
    reason: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_real_demolition_exact_execute', scene: 'cohabitation_family_building_real_demolition_exact_execute', content_type: 'cohabitation_family_building_real_demolition' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation real demolition exact resolution reason audit context', () => cohabitationRuntime.resolveCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(
  'qa_contract',
  {
    idempotency_key: 'qa_real_demolition_exact_resolution',
    reason: '恐怖袭击解析原因',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_real_demolition_exact_resolution', scene: 'cohabitation_family_building_real_demolition_exact_resolution', content_type: 'cohabitation_family_building_real_demolition' },
  },
), 'TEXT_BANNED_TERM');

await expectRejectedAsync('cohabitation real demolition exact mutation reason audit context', () => cohabitationRuntime.executeCohabitationFamilyBuildingRealDemolitionMainStateExactMutationAdapter(
  'qa_contract',
  {
    idempotency_key: 'qa_real_demolition_exact_mutation',
    reason: '加微信领取外挂',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_real_demolition_exact_mutation', scene: 'cohabitation_family_building_real_demolition_exact_mutation', content_type: 'cohabitation_family_building_real_demolition' },
  },
), 'TEXT_SUSPICIOUS_PROMOTION');

await expectRejectedAsync('cohabitation shared decoration removal main state reason audit context', () => cohabitationRuntime.executeCohabitationSharedDecorationRemovalMainStateMutation(
  'qa_contract',
  {
    idempotency_key: 'qa_decoration_removal_main_state',
    reason: '恐怖袭击装修拆除主状态原因',
  },
  {
    username: 'qa_sender_ugc',
    displayName: '发件人',
    auditContext: { request_id: 'qa_cohab_decoration_removal_main_state', scene: 'cohabitation_shared_decoration_removal_main_state', content_type: 'cohabitation_shared_decoration_removal' },
  },
), 'TEXT_BANNED_TERM');

const firstEventPage = listContentModerationEvents({ pageSize: 100 });
const events = [...firstEventPage.events];
const totalEventPages = Math.max(1, Math.ceil(firstEventPage.total / firstEventPage.pageSize));
for (let page = 2; page <= totalEventPages && events.length < firstEventPage.total; page += 1) {
  events.push(...listContentModerationEvents({ page, pageSize: 100 }).events);
}
const expectedEventRequestIds = [
  'qa_hard',
  'qa_soft',
  'qa_shape',
  'qa_register',
  'qa_player_letter',
  'qa_player_gift',
  'qa_admin_mail',
  'qa_manor_guestbook',
  'qa_social_profile',
  'qa_neighbor_group',
  'qa_society_create',
  'qa_coop_order',
  'qa_festival_room_title',
  'qa_expedition_room_source',
  'qa_cohab_contract_title',
  'qa_cohab_family_order',
  'qa_cohab_family_wish',
  'qa_cohab_recovery_appeal',
  'qa_cohab_family_festival_room',
  'qa_cohab_separation_preview',
  'qa_cohab_separation_failure',
  'qa_cohab_separation_preview_confirm',
  'qa_cohab_separation_execution_request',
  'qa_cohab_separation_asset_return',
  'qa_cohab_separation_personal_farm',
  'qa_cohab_separation_shared_fund_delta',
  'qa_cohab_separation_shared_fund_refund',
  'qa_cohab_separation_shared_warehouse',
  'qa_cohab_separation_decoration_split',
  'qa_cohab_separation_family_story',
  'qa_cohab_separation_story_cinematic',
  'qa_cohab_separation_story_cinematic_confirm',
  'qa_cohab_separation_personal_story',
  'qa_cohab_separation_child_arrangement',
  'qa_cohab_separation_personal_family',
  'qa_cohab_daily_settle',
  'qa_cohab_family_role_update',
  ...offlineQueueOperationCases.map(({ requestId }) => requestId),
  'qa_cohab_fund_freeze',
  'qa_cohab_fund_unfreeze',
  'qa_cohab_safe_rollback',
  'qa_cohab_order_accept',
  'qa_cohab_order_deliver',
  'qa_cohab_order_settle',
  'qa_cohab_reputation_award',
  'qa_cohab_reputation_reward',
  'qa_cohab_visibility_update',
  'qa_cohab_visibility_rollback',
  'qa_cohab_festival_reserve',
  'qa_cohab_festival_supplies',
  'qa_cohab_festival_settle',
  'qa_cohab_farm_water',
  'qa_cohab_farm_care',
  'qa_cohab_farm_plant',
  'qa_cohab_farm_fertilize',
  'qa_cohab_farm_harvest',
  'qa_cohab_animal_feed',
  'qa_cohab_animal_purchase',
  'qa_cohab_animal_pet',
  'qa_cohab_animal_product',
  'qa_cohab_animal_sale',
  'qa_cohab_pet_care',
  'qa_cohab_workshop_process',
  'qa_cohab_wh_high_value_draft',
  'qa_cohab_wh_high_value_confirm',
  'qa_cohab_wh_high_value_execute',
  'qa_cohab_wh_high_value_rollback',
  'qa_cohab_wh_comp_review',
  'qa_cohab_wh_comp_resolve',
  'qa_cohab_wh_comp_preflight',
  'qa_cohab_wh_comp_auto_block',
  'qa_cohab_wh_comp_execution',
  'qa_cohab_wh_manual_appeal',
  'qa_cohab_wh_operator_receipt',
  'qa_cohab_wh_governance_appeal',
  'qa_cohab_wh_governance_recovery',
  'qa_cohab_offline_auto_income',
  'qa_cohab_offline_preflight',
  'qa_cohab_offline_resolve',
  'qa_cohab_decoration_move',
  'qa_cohab_permissions_update',
  'qa_cohab_permissions_default_restore',
  'qa_cohab_family_child_care',
  'qa_cohab_large_fund_execute',
  'qa_cohab_high_risk_receipt',
  'qa_cohab_family_build_real_build',
  'qa_cohab_family_build_materials_consume',
  'qa_cohab_family_build_rollback',
  'qa_cohab_family_build_fund_refund',
  'qa_cohab_family_build_materials_restore',
  'qa_cohab_family_build_comp_replay',
  'qa_cohab_real_demolition_request',
  'qa_cohab_real_demolition_reject',
  'qa_cohab_real_demolition_approve',
  'qa_cohab_real_demolition_execution_request',
  'qa_cohab_real_demolition_personal_save',
  'qa_cohab_real_demolition_preview',
  'qa_cohab_real_demolition_mapping',
  'qa_cohab_real_demolition_guard',
  'qa_cohab_real_demolition_execute',
  'qa_cohab_real_demolition_exact_target',
  'qa_cohab_real_demolition_exact_execute',
  'qa_cohab_real_demolition_exact_resolution',
  'qa_cohab_real_demolition_exact_mutation',
  'qa_cohab_decoration_removal_main_state',
];
assert.equal(firstEventPage.total, expectedEventRequestIds.length, 'all rejected submissions should create audit events');
assert.equal(events.length, expectedEventRequestIds.length, 'all rejected submissions should be readable through paginated audit events');
assert.ok(events.every(event => event.content_hash), 'events should keep content hash');
assert.ok(events.every(event => event.content_excerpt.length <= 80), 'events should keep short excerpt only');
assert.ok(events.every(event => !event.matched_term), 'events should not keep raw matched term');
assert.ok(events.some(event => event.action === 'hard_block' && event.rule_version), 'hard block should include rule version');
assert.ok(events.some(event => event.action === 'soft_block'), 'soft block should be classified');
assert.ok(events.some(event => event.request_id === 'qa_admin_mail' && event.action === 'soft_review' && event.outcome === 'allowed_with_review'), 'admin mail soft matches should be allowed but queued for review');
assert.ok(events.some(event => event.action === 'shape_reject'), 'shape reject should be classified');
for (const requestId of expectedEventRequestIds) {
  assert.ok(events.some(event => event.request_id === requestId), `${requestId} should create an audit event`);
}

fs.rmSync(tempDir, { recursive: true, force: true });
console.log('qa-content-moderation-guard passed');
