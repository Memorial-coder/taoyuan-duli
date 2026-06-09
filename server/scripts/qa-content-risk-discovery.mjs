import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taoyuan-content-risk-'));
process.env.DB_STORAGE = path.join(tempDir, 'users.json');
process.env.CONTENT_MODERATION_AUDIT_SALT = 'qa-content-risk-salt';

const textModerationModule = await import('../src/taoyuanTextModeration.js');
const auditModule = await import('../src/taoyuanContentModerationAudit.js');
const hallModule = await import('../src/taoyuanHall.js');
const imageModerationModule = await import('../src/taoyuanImageModeration.js');

const { moderateText } = textModerationModule.default || textModerationModule;
const {
  listContentModerationRiskSignals,
  recordIpHashPublishObservation,
} = auditModule.default || auditModule;
const hall = hallModule.default || hallModule;
const imageModeration = imageModerationModule.default || imageModerationModule;

function expectRejected(label, fn, expectedCode) {
  try {
    fn();
  } catch (error) {
    assert.equal(error.code, expectedCode, `${label} should use ${expectedCode}`);
    return error;
  }
  assert.fail(`${label} should be rejected`);
}

for (let index = 0; index < 3; index += 1) {
  expectRejected(`repeat hard block ${index + 1}`, () => moderateText(`恐怖袭击风险 ${index + 1}`, {
    scene: 'qa_repeat_hard_block',
    field: 'body',
    auditContext: {
      request_id: `qa_repeat_hard_${index + 1}`,
      username: 'qa_repeat_user',
      content_type: 'qa_text',
      content_id: `qa_repeat_${index + 1}`,
    },
  }), 'TEXT_BANNED_TERM');
}

let riskSignals = listContentModerationRiskSignals({ status: 'pending', pageSize: 20 }).signals;
const repeatSignal = riskSignals.find(signal => signal.signal_type === 'repeat_hard_block' && signal.username === 'qa_repeat_user');
assert.ok(repeatSignal, 'repeat hard blocks should create a risk queue signal');
assert.equal(repeatSignal.event_count, 3, 'repeat hard block signal should keep event count');
assert.equal(repeatSignal.scene, 'qa_repeat_hard_block', 'repeat hard block risk signal should keep moderation scene');
assert.ok(repeatSignal.risk_score > 0, 'repeat hard block signal should have risk score for sorting');
assert.ok(!JSON.stringify(repeatSignal).includes('恐怖袭击'), 'repeat hard block signal should not expose raw content');

const postResult = await hall.createPost({
  title: '正常举报测试帖',
  content: '这是一条普通帖子',
  author: 'qa_reported_author',
  authorDisplayName: '被举报作者',
  auditContext: {
    request_id: 'qa_multi_report_post_create',
    username: 'qa_reported_author',
    scene: 'hall_post',
  },
});
const postId = postResult.id;
for (const reporter of ['qa_reporter_a', 'qa_reporter_b', 'qa_reporter_c']) {
  await hall.createReport({
    type: 'post',
    postId,
    reason: '内容不适',
    reporter,
    reporterDisplayName: reporter,
    auditContext: {
      request_id: `qa_multi_report_post_${reporter}`,
      username: reporter,
      scene: 'hall_report',
    },
  });
}

const hiddenPost = hall.listAdminPosts().find(post => post.id === postId);
assert.equal(hiddenPost.hidden, true, 'multi-reported post should be auto hidden');
assert.equal(hall.getPost(postId, 'qa_viewer'), null, 'auto hidden post should not be public');

const replyPost = await hall.createPost({
  title: '正常回复举报测试帖',
  content: '这是一条普通帖子',
  author: 'qa_reply_post_author',
  authorDisplayName: '楼主',
  auditContext: {
    request_id: 'qa_multi_report_reply_post_create',
    username: 'qa_reply_post_author',
    scene: 'hall_post',
  },
});
await hall.addReply({
  postId: replyPost.id,
  content: '这是一条普通回复',
  author: 'qa_reported_reply_author',
  authorDisplayName: '被举报回复者',
  auditContext: {
    request_id: 'qa_multi_report_reply_create',
    username: 'qa_reported_reply_author',
    scene: 'hall_reply',
  },
});
const replyId = hall.getPost(replyPost.id, 'qa_viewer').replies[0].id;
for (const reporter of ['qa_reply_reporter_a', 'qa_reply_reporter_b', 'qa_reply_reporter_c']) {
  await hall.createReport({
    type: 'reply',
    postId: replyPost.id,
    replyId,
    reason: '回复不适',
    reporter,
    reporterDisplayName: reporter,
    auditContext: {
      request_id: `qa_multi_report_reply_${reporter}`,
      username: reporter,
      scene: 'hall_report',
    },
  });
}
const publicReply = hall.getPost(replyPost.id, 'qa_viewer').replies.find(reply => reply.id === replyId);
assert.equal(publicReply.is_hidden, true, 'multi-reported reply should be auto hidden');
assert.equal(publicReply.content, '', 'auto hidden reply should not expose content publicly');

await imageModeration.registerUploadedImage({
  url: '/api/taoyuan/hall/uploads/qa-risk-image.png',
  stored_name: 'qa-risk-image.png',
  filename: 'qa-risk-image.png',
  alt: '普通图片',
  mime: 'image/png',
  size_bytes: 128,
  sha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  usage: 'hall_post',
  uploader_username: 'qa_image_author',
  uploader_display_name: '图片作者',
});
for (const reporter of ['qa_image_reporter_a', 'qa_image_reporter_b', 'qa_image_reporter_c']) {
  await imageModeration.createImageReport({
    image_url: '/api/taoyuan/hall/uploads/qa-risk-image.png',
    reason: '图片不适',
    reporter,
    reporter_display_name: reporter,
    auditContext: {
      request_id: `qa_multi_report_image_${reporter}`,
      username: reporter,
      scene: 'image_report',
    },
  });
}
const hiddenAsset = imageModeration.listImageAssets().find(asset => asset.stored_name === 'qa-risk-image.png');
assert.equal(hiddenAsset.status, 'hidden', 'multi-reported image should be auto hidden');

await assert.rejects(
  () => imageModeration.registerUploadedImage({
    url: '/api/taoyuan/hall/uploads/qa-risk-image-reused.png',
    stored_name: 'qa-risk-image-reused.png',
    filename: 'qa-risk-image-reused.png',
    alt: '重复图片',
    mime: 'image/png',
    size_bytes: 128,
    sha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    usage: 'hall_post',
    uploader_username: 'qa_image_reuse_author',
    uploader_display_name: '重复图片作者',
  }),
  error => error?.code === 'IMAGE_HASH_PREVIOUSLY_DISPOSED',
  'disposed image hash reuse should be rejected',
);

for (const username of ['qa_ip_user_a', 'qa_ip_user_b', 'qa_ip_user_c']) {
  for (let index = 0; index < 2; index += 1) {
    recordIpHashPublishObservation({
      ip_hash: 'qa_ip_hash_only_no_plain_ip',
      username,
      route_key: index % 2 === 0 ? 'hall_write' : 'mail_write',
      request_id: `qa_ip_${username}_${index}`,
    });
  }
}

riskSignals = listContentModerationRiskSignals({ status: 'pending', pageSize: 20 }).signals;
assert.ok(riskSignals.some(signal => signal.signal_type === 'multi_report_auto_hide' && signal.target_type === 'hall_post' && signal.reporter_count === 3), 'post multi-report should create risk signal');
assert.ok(riskSignals.some(signal => signal.signal_type === 'multi_report_auto_hide' && signal.target_type === 'hall_reply' && signal.reporter_count === 3), 'reply multi-report should create risk signal');
assert.ok(riskSignals.some(signal => signal.signal_type === 'multi_report_auto_hide' && signal.target_type === 'image_asset' && signal.image_hash_prefix === '0123456789abcdef'), 'image multi-report should create risk signal with hash prefix');
assert.ok(riskSignals.some(signal => signal.signal_type === 'duplicate_image_hash_reuse' && signal.username === 'qa_image_reuse_author' && signal.outcome === 'upload_rejected'), 'disposed image hash reuse should create risk signal');
assert.ok(riskSignals.some(signal => signal.signal_type === 'multi_account_ip_publish' && signal.ip_hash === 'qa_ip_hash_only_no_plain_ip' && signal.usernames.length === 3 && signal.route_keys.includes('hall_write')), 'multi-account IP hash publishing should create risk signal');
assert.ok(riskSignals.some(signal => signal.signal_type === 'multi_report_auto_hide' && signal.target_type === 'hall_post' && signal.scene === 'hall_post_report'), 'post multi-report risk signal should keep scene');
assert.ok(riskSignals.some(signal => signal.signal_type === 'multi_report_auto_hide' && signal.target_type === 'hall_reply' && signal.scene === 'hall_reply_report'), 'reply multi-report risk signal should keep scene');
assert.ok(riskSignals.some(signal => signal.signal_type === 'multi_report_auto_hide' && signal.target_type === 'image_asset' && signal.scene === 'image_report'), 'image multi-report risk signal should keep scene');
assert.ok(riskSignals.some(signal => signal.signal_type === 'duplicate_image_hash_reuse' && signal.scene === 'image_hash_reuse'), 'duplicate image hash risk signal should keep scene');
assert.ok(listContentModerationRiskSignals({ status: 'pending', scene: 'hall_post_report', pageSize: 20 }).signals.some(signal => signal.target_type === 'hall_post'), 'risk signals should support scene filtering');
assert.equal(listContentModerationRiskSignals({ status: 'pending', scene: 'missing_scene', pageSize: 20 }).signals.length, 0, 'risk scene filtering should exclude unrelated scenes');
const futureSeconds = Math.floor(Date.now() / 1000) + 60;
assert.equal(listContentModerationRiskSignals({ status: 'pending', created_from: futureSeconds, pageSize: 20 }).signals.length, 0, 'risk signals should support created_from filtering');
assert.ok(riskSignals.every(signal => Number.isInteger(signal.risk_score) && signal.risk_score >= 0 && signal.risk_score <= 100), 'risk score should be bounded and sortable');
assert.ok(!JSON.stringify(riskSignals).includes('内容不适'), 'risk signals should not expose report reason text');
assert.ok(!JSON.stringify(riskSignals).includes('图片不适'), 'risk signals should not expose image report reason text');
assert.ok(!JSON.stringify(riskSignals).includes('127.0.0.1'), 'risk signals should not expose raw IP text');

fs.rmSync(tempDir, { recursive: true, force: true });
console.log('qa-content-risk-discovery passed');
