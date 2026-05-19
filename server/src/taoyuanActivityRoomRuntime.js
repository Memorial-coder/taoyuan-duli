const fs = require('fs');
const path = require('path');
const db = require('./db');
const {
  createError,
  getActiveSaveSlot,
  writeJsonFileAtomic,
} = require('./taoyuanSaveRuntime');

const DATA_DIR = process.env.DB_STORAGE
  ? path.dirname(process.env.DB_STORAGE)
  : path.join(__dirname, '../data');

const TAOYUAN_ACTIVITY_ROOM_FILE = path.join(DATA_DIR, 'taoyuan_activity_rooms.json');

const ROOM_STATES = Object.freeze(['created', 'inviting', 'ready_check', 'countdown', 'running', 'paused', 'settling', 'closed', 'aborted']);
const MEMBER_STATES = Object.freeze(['invited', 'joined', 'ready', 'countdown_locked', 'active', 'disconnected', 'reconnecting', 'finished', 'settled', 'left', 'kicked']);
const INVITATION_STATES = Object.freeze(['pending', 'accepted', 'rejected']);
const RECEIPT_STATES = Object.freeze(['created', 'persist_preview']);
const EVENT_LIMIT = 40;
const RECEIPT_LIMIT = 60;
const DEFAULT_COUNTDOWN_SECONDS = 6;
const DEFAULT_RECONNECT_WINDOW_SECONDS = 90;

const ROOM_TEMPLATE_MAP = Object.freeze({
  yuanri_vigil: {
    id: 'yuanri_vigil',
    label: '元日守岁',
    summary: '适合用来承接跨年守岁、公共进度和轻协作开场。',
    default_member_limit: 4,
    opening_title: '守岁开场',
    opening_lines: ['灯火已点，众人入席。', '先确认成员到齐，再一起迎接节会开场。'],
  },
  lantern_fair: {
    id: 'lantern_fair',
    label: '上元灯会',
    summary: '适合灯谜、点灯、巡游这类短时节会房间。',
    default_member_limit: 4,
    opening_title: '灯会点灯',
    opening_lines: ['彩灯排起，街口开始清场。', '等倒计时结束后，全员会一起进入灯会现场。'],
  },
  dragon_boat: {
    id: 'dragon_boat',
    label: '端午赛舟',
    summary: '适合双人或多人小队的同步准备、开场倒计时与结算。',
    default_member_limit: 4,
    opening_title: '赛舟鸣鼓',
    opening_lines: ['鼓点已经就位。', '所有队员锁定后，会统一进入赛舟开场。'],
  },
  qixi_stroll: {
    id: 'qixi_stroll',
    label: '七夕同游',
    summary: '适合同游、合照、轻互动和关系承接型节会房间。',
    default_member_limit: 2,
    opening_title: '同游开场',
    opening_lines: ['桥头已经挂起灯串。', '确认同行人已接入后，再一起进入夜游环节。'],
  },
  mid_autumn_moonwatch: {
    id: 'mid_autumn_moonwatch',
    label: '中秋赏月',
    summary: '适合公共展示、共同进度和合照结算这类房间。',
    default_member_limit: 4,
    opening_title: '赏月入场',
    opening_lines: ['赏月席位已摆好。', '房间开始后，全员会统一进入赏月场景。'],
  },
  laba_cookpot: {
    id: 'laba_cookpot',
    label: '腊八共煮',
    summary: '适合协作筹备、进度共享和多成员收尾结算。',
    default_member_limit: 4,
    opening_title: '共煮开灶',
    opening_lines: ['灶火已经点燃。', '待成员锁定后，就能开始统一推进节会流程。'],
  },
});

const ROOM_STATUS_LABELS = Object.freeze({
  created: '已创建',
  inviting: '邀请中',
  ready_check: '准备确认',
  countdown: '倒计时',
  running: '进行中',
  paused: '已暂停',
  settling: '结算中',
  closed: '已关闭',
  aborted: '已中止',
});

const MEMBER_STATUS_LABELS = Object.freeze({
  invited: '已邀请',
  joined: '已加入',
  ready: '已准备',
  countdown_locked: '倒计时锁定',
  active: '活动中',
  disconnected: '暂时断线',
  reconnecting: '恢复中',
  finished: '待结算确认',
  settled: '已完成结算',
  left: '已离开',
  kicked: '已移出',
});

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function sanitizeText(value, maxLength = 80) {
  return String(value || '').replace(/\r\n/g, '\n').trim().slice(0, maxLength);
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function ensureStoreDir() {
  fs.mkdirSync(path.dirname(TAOYUAN_ACTIVITY_ROOM_FILE), { recursive: true });
}

function createEmptyStore() {
  return {
    rooms: [],
    receipts: [],
  };
}

function loadStore() {
  ensureStoreDir();
  try {
    if (!fs.existsSync(TAOYUAN_ACTIVITY_ROOM_FILE)) return createEmptyStore();
    const raw = JSON.parse(fs.readFileSync(TAOYUAN_ACTIVITY_ROOM_FILE, 'utf8'));
    return raw && typeof raw === 'object'
      ? {
          rooms: Array.isArray(raw.rooms) ? raw.rooms : [],
          receipts: Array.isArray(raw.receipts) ? raw.receipts : [],
        }
      : createEmptyStore();
  } catch {
    return createEmptyStore();
  }
}

function saveStore(store) {
  ensureStoreDir();
  writeJsonFileAtomic(TAOYUAN_ACTIVITY_ROOM_FILE, {
    rooms: Array.isArray(store?.rooms) ? store.rooms : [],
    receipts: Array.isArray(store?.receipts) ? store.receipts : [],
  });
}

function normalizeRoomState(value) {
  const normalized = String(value || '').trim();
  return ROOM_STATES.includes(normalized) ? normalized : 'created';
}

function normalizeMemberState(value) {
  const normalized = String(value || '').trim();
  return MEMBER_STATES.includes(normalized) ? normalized : 'invited';
}

function normalizeInvitationState(value) {
  const normalized = String(value || '').trim();
  return INVITATION_STATES.includes(normalized) ? normalized : 'pending';
}

function normalizeReceiptState(value) {
  const normalized = String(value || '').trim();
  return RECEIPT_STATES.includes(normalized) ? normalized : 'created';
}

function getRoomTemplate(templateId) {
  const normalized = sanitizeText(templateId, 40);
  return ROOM_TEMPLATE_MAP[normalized] || ROOM_TEMPLATE_MAP.yuanri_vigil;
}

function listRoomTemplates() {
  return Object.values(ROOM_TEMPLATE_MAP).map(template => ({
    id: template.id,
    label: template.label,
    summary: template.summary,
    default_member_limit: template.default_member_limit,
    opening_title: template.opening_title,
  }));
}

function normalizeRoomEvent(entry) {
  return {
    id: String(entry?.id || makeId('activity_room_event')),
    event: sanitizeText(entry?.event, 40),
    actor_username: sanitizeText(entry?.actor_username, 40),
    actor_display_name: sanitizeText(entry?.actor_display_name, 40),
    summary: sanitizeText(entry?.summary, 160),
    created_at: Math.max(0, Math.floor(Number(entry?.created_at) || nowSeconds())),
  };
}

function normalizeRoomInvitation(entry) {
  return {
    id: String(entry?.id || makeId('activity_room_invite')),
    room_id: sanitizeText(entry?.room_id, 40),
    inviter_username: sanitizeText(entry?.inviter_username, 40),
    inviter_display_name: sanitizeText(entry?.inviter_display_name, 40),
    target_username: sanitizeText(entry?.target_username, 40),
    target_display_name: sanitizeText(entry?.target_display_name, 40),
    status: normalizeInvitationState(entry?.status),
    created_at: Math.max(0, Math.floor(Number(entry?.created_at) || nowSeconds())),
    updated_at: Math.max(0, Math.floor(Number(entry?.updated_at) || nowSeconds())),
    responded_at: Math.max(0, Math.floor(Number(entry?.responded_at) || 0)),
  };
}

function normalizeRoomMember(entry) {
  return {
    username: sanitizeText(entry?.username, 40),
    display_name: sanitizeText(entry?.display_name, 40),
    role: sanitizeText(entry?.role, 20) || 'member',
    status: normalizeMemberState(entry?.status),
    resume_status: sanitizeText(entry?.resume_status, 24) || '',
    invited_at: Math.max(0, Math.floor(Number(entry?.invited_at) || 0)),
    joined_at: Math.max(0, Math.floor(Number(entry?.joined_at) || 0)),
    ready_at: Math.max(0, Math.floor(Number(entry?.ready_at) || 0)),
    disconnected_at: Math.max(0, Math.floor(Number(entry?.disconnected_at) || 0)),
    reconnected_at: Math.max(0, Math.floor(Number(entry?.reconnected_at) || 0)),
    left_at: Math.max(0, Math.floor(Number(entry?.left_at) || 0)),
    last_seen_at: Math.max(0, Math.floor(Number(entry?.last_seen_at) || nowSeconds())),
    active_receipt_id: sanitizeText(entry?.active_receipt_id, 60),
  };
}

function normalizeRoomReceipt(entry) {
  return {
    id: String(entry?.id || makeId('festival_room_receipt')),
    room_id: sanitizeText(entry?.room_id, 40),
    room_title: sanitizeText(entry?.room_title, 60),
    template_id: sanitizeText(entry?.template_id, 40),
    template_label: sanitizeText(entry?.template_label, 40),
    target_username: sanitizeText(entry?.target_username, 40),
    target_display_name: sanitizeText(entry?.target_display_name, 40),
    target_slot: Number.isInteger(Number(entry?.target_slot)) ? Number(entry.target_slot) : 0,
    status: normalizeReceiptState(entry?.status),
    idempotency_key: sanitizeText(entry?.idempotency_key, 120),
    reward_payload: entry?.reward_payload && typeof entry.reward_payload === 'object'
      ? {
          money: Math.max(0, Math.floor(Number(entry.reward_payload.money) || 0)),
          reward_tickets: Math.max(0, Math.floor(Number(entry.reward_payload.reward_tickets) || 0)),
          items: Array.isArray(entry.reward_payload.items)
            ? entry.reward_payload.items.map(item => ({
                item_id: sanitizeText(item?.item_id, 40),
                quantity: Math.max(1, Math.floor(Number(item?.quantity) || 1)),
              })).filter(item => item.item_id)
            : [],
        }
      : { money: 0, reward_tickets: 0, items: [] },
    summary: sanitizeText(entry?.summary, 160),
    settlement_version: Math.max(1, Math.floor(Number(entry?.settlement_version) || 1)),
    created_at: Math.max(0, Math.floor(Number(entry?.created_at) || nowSeconds())),
    updated_at: Math.max(0, Math.floor(Number(entry?.updated_at) || nowSeconds())),
  };
}

function normalizeRoom(entry) {
  const template = getRoomTemplate(entry?.template_id);
  return {
    id: String(entry?.id || makeId('festival_room')),
    template_id: template.id,
    title: sanitizeText(entry?.title, 60) || template.label,
    host_username: sanitizeText(entry?.host_username, 40),
    host_display_name: sanitizeText(entry?.host_display_name, 40) || sanitizeText(entry?.host_username, 40),
    member_limit: Math.min(4, Math.max(2, Math.floor(Number(entry?.member_limit) || template.default_member_limit || 4))),
    countdown_seconds: Math.min(30, Math.max(1, Math.floor(Number(entry?.countdown_seconds) || DEFAULT_COUNTDOWN_SECONDS))),
    reconnect_window_seconds: Math.min(600, Math.max(10, Math.floor(Number(entry?.reconnect_window_seconds) || DEFAULT_RECONNECT_WINDOW_SECONDS))),
    state: normalizeRoomState(entry?.state),
    state_reason: sanitizeText(entry?.state_reason, 120),
    paused_from_state: sanitizeText(entry?.paused_from_state, 24),
    created_at: Math.max(0, Math.floor(Number(entry?.created_at) || nowSeconds())),
    updated_at: Math.max(0, Math.floor(Number(entry?.updated_at) || nowSeconds())),
    ready_check_started_at: Math.max(0, Math.floor(Number(entry?.ready_check_started_at) || 0)),
    countdown_started_at: Math.max(0, Math.floor(Number(entry?.countdown_started_at) || 0)),
    countdown_ends_at: Math.max(0, Math.floor(Number(entry?.countdown_ends_at) || 0)),
    running_started_at: Math.max(0, Math.floor(Number(entry?.running_started_at) || 0)),
    settled_at: Math.max(0, Math.floor(Number(entry?.settled_at) || 0)),
    closed_at: Math.max(0, Math.floor(Number(entry?.closed_at) || 0)),
    aborted_at: Math.max(0, Math.floor(Number(entry?.aborted_at) || 0)),
    settlement_version: Math.max(0, Math.floor(Number(entry?.settlement_version) || 0)),
    members: Array.isArray(entry?.members) ? entry.members.map(normalizeRoomMember).filter(member => member.username) : [],
    invitations: Array.isArray(entry?.invitations) ? entry.invitations.map(normalizeRoomInvitation).filter(invite => invite.target_username) : [],
    events: Array.isArray(entry?.events) ? entry.events.map(normalizeRoomEvent).slice(0, EVENT_LIMIT) : [],
    settlement_receipt_ids: Array.isArray(entry?.settlement_receipt_ids)
      ? entry.settlement_receipt_ids.map(item => sanitizeText(item, 60)).filter(Boolean).slice(0, RECEIPT_LIMIT)
      : [],
  };
}

function getReceiptListForRoom(store, room) {
  const allowedIds = new Set(room.settlement_receipt_ids || []);
  return (store.receipts || [])
    .map(normalizeRoomReceipt)
    .filter(receipt => allowedIds.has(receipt.id))
    .sort((left, right) => (right.created_at || 0) - (left.created_at || 0));
}

function recordRoomEvent(room, event, actor, summary) {
  room.events = [normalizeRoomEvent({
    event,
    actor_username: actor?.username,
    actor_display_name: actor?.displayName || actor?.username,
    summary,
    created_at: nowSeconds(),
  }), ...(room.events || []).map(normalizeRoomEvent)].slice(0, EVENT_LIMIT);
}

function getRoomMember(room, username) {
  const normalizedUsername = sanitizeText(username, 40);
  return (room.members || []).find(member => member.username === normalizedUsername) || null;
}

function getRoomInvitation(room, username) {
  const normalizedUsername = sanitizeText(username, 40);
  return (room.invitations || []).find(invite => invite.target_username === normalizedUsername && invite.status === 'pending') || null;
}

function isMemberParticipating(member) {
  return ['joined', 'ready', 'countdown_locked', 'active', 'disconnected', 'reconnecting', 'finished', 'settled'].includes(member?.status);
}

function getJoinedMembers(room) {
  return (room.members || []).filter(isMemberParticipating);
}

function ensureRoomExists(store, roomId) {
  const room = (store.rooms || []).map(normalizeRoom).find(entry => entry.id === String(roomId || '').trim());
  if (!room) throw createError('节会房间不存在', 404);
  return room;
}

function replaceRoom(store, room) {
  store.rooms = (store.rooms || [])
    .map(normalizeRoom)
    .filter(entry => entry.id !== room.id);
  store.rooms.unshift(normalizeRoom(room));
}

function touchRoom(room) {
  room.updated_at = nowSeconds();
}

function updateRoomState(room, nextState, reason = '') {
  room.state = normalizeRoomState(nextState);
  room.state_reason = sanitizeText(reason, 120);
  touchRoom(room);
}

function materializeCountdownState(room) {
  if (room.state !== 'countdown') return false;
  if ((room.countdown_ends_at || 0) > nowSeconds()) return false;
  room.members = (room.members || []).map(member => {
    const normalized = normalizeRoomMember(member);
    if (normalized.status === 'countdown_locked') {
      normalized.status = 'active';
      normalized.last_seen_at = nowSeconds();
    }
    return normalized;
  });
  room.running_started_at = room.countdown_ends_at || nowSeconds();
  room.countdown_ends_at = 0;
  updateRoomState(room, 'running', '');
  recordRoomEvent(room, 'room.start', {
    username: room.host_username,
    displayName: room.host_display_name,
  }, `${getRoomTemplate(room.template_id).label} 已正式开场`);
  return true;
}

function ensureRoomNotFinished(room) {
  if (['settling', 'closed', 'aborted'].includes(room.state)) {
    throw createError('当前房间已经进入收尾状态，不能继续修改成员流程');
  }
}

function ensureHost(room, username) {
  if (room.host_username !== sanitizeText(username, 40)) {
    throw createError('只有房主可以执行这个节会房间操作', 403);
  }
}

function ensureViewerCanSeeRoom(room, username) {
  const normalizedUsername = sanitizeText(username, 40);
  if (room.host_username === normalizedUsername) return;
  if (getRoomMember(room, normalizedUsername)) return;
  if (getRoomInvitation(room, normalizedUsername)) return;
  throw createError('你当前无权查看这个节会房间', 403);
}

function ensureNoOtherActiveRoom(store, username) {
  const normalizedUsername = sanitizeText(username, 40);
  const activeRoom = (store.rooms || [])
    .map(normalizeRoom)
    .find(room => {
      if (['closed', 'aborted'].includes(room.state)) return false;
      const member = getRoomMember(room, normalizedUsername);
      return Boolean(member && isMemberParticipating(member));
    });
  if (activeRoom) {
    throw createError('当前账号还有未结束的节会房间，请先回到原房间收尾');
  }
}

function getViewerSaveSlot(username) {
  const slot = getActiveSaveSlot(username);
  return Number.isInteger(Number(slot)) && Number(slot) >= 0 ? Number(slot) : 0;
}

function canStartReadyCheck(room) {
  const joinedMembers = getJoinedMembers(room).filter(member => ['joined', 'ready'].includes(member.status));
  return ['created', 'inviting', 'ready_check'].includes(room.state) && joinedMembers.length >= 2;
}

function canStartCountdown(room) {
  if (room.state !== 'ready_check') return false;
  const joinedMembers = getJoinedMembers(room).filter(member => ['joined', 'ready'].includes(member.status));
  return joinedMembers.length >= 2 && joinedMembers.every(member => member.status === 'ready');
}

function buildOpeningCeremony(room) {
  const template = getRoomTemplate(room.template_id);
  if (room.state === 'countdown') {
    return {
      stage: 'countdown',
      title: template.opening_title,
      subtitle: `倒计时还剩 ${Math.max(0, room.countdown_ends_at - nowSeconds())} 秒`,
      lines: [...template.opening_lines],
      countdown_remaining_seconds: Math.max(0, room.countdown_ends_at - nowSeconds()),
    };
  }
  if (room.state === 'running' && room.running_started_at > 0 && nowSeconds() - room.running_started_at <= 6) {
    return {
      stage: 'running_intro',
      title: template.opening_title,
      subtitle: '开场已完成，全员进入节会房间',
      lines: [...template.opening_lines],
      countdown_remaining_seconds: 0,
    };
  }
  return null;
}

function buildRoomSnapshot(store, room, viewerUsername) {
  materializeCountdownState(room);
  const template = getRoomTemplate(room.template_id);
  const viewerMember = getRoomMember(room, viewerUsername);
  const viewerInvitation = getRoomInvitation(room, viewerUsername);
  const joinedMembers = getJoinedMembers(room);
  const participatingCount = joinedMembers.length;
  const readyCount = joinedMembers.filter(member => member.status === 'ready').length;
  const settlementReceipts = getReceiptListForRoom(store, room);
  return {
    id: room.id,
    title: room.title,
    template_id: template.id,
    template_label: template.label,
    template_summary: template.summary,
    host_username: room.host_username,
    host_display_name: room.host_display_name,
    state: room.state,
    state_label: ROOM_STATUS_LABELS[room.state] || room.state,
    state_reason: room.state_reason,
    member_limit: room.member_limit,
    countdown_seconds: room.countdown_seconds,
    reconnect_window_seconds: room.reconnect_window_seconds,
    created_at: room.created_at,
    updated_at: room.updated_at,
    ready_check_started_at: room.ready_check_started_at,
    countdown_started_at: room.countdown_started_at,
    countdown_ends_at: room.countdown_ends_at,
    running_started_at: room.running_started_at,
    settled_at: room.settled_at,
    closed_at: room.closed_at,
    aborted_at: room.aborted_at,
    settlement_version: room.settlement_version,
    members: (room.members || []).map(member => ({
      username: member.username,
      display_name: member.display_name,
      role: member.role,
      status: member.status,
      status_label: MEMBER_STATUS_LABELS[member.status] || member.status,
      invited_at: member.invited_at,
      joined_at: member.joined_at,
      ready_at: member.ready_at,
      disconnected_at: member.disconnected_at,
      reconnected_at: member.reconnected_at,
      left_at: member.left_at,
      active_receipt_id: member.active_receipt_id,
    })),
    invitations: (room.invitations || []).map(invite => ({
      id: invite.id,
      target_username: invite.target_username,
      target_display_name: invite.target_display_name,
      status: invite.status,
      created_at: invite.created_at,
      responded_at: invite.responded_at,
    })),
    recent_events: (room.events || []).map(normalizeRoomEvent).slice(0, 8),
    settlement_receipts: settlementReceipts.map(receipt => ({
      id: receipt.id,
      target_username: receipt.target_username,
      target_display_name: receipt.target_display_name,
      target_slot: receipt.target_slot,
      status: receipt.status,
      status_label: receipt.status === 'persist_preview' ? '已生成回写预览' : '已生成凭证',
      reward_payload: receipt.reward_payload,
      summary: receipt.summary,
      created_at: receipt.created_at,
    })),
    opening_ceremony: buildOpeningCeremony(room),
    joined_member_count: participatingCount,
    ready_member_count: readyCount,
    my_member_status: viewerMember?.status || '',
    invitation_id: viewerInvitation?.id || '',
    can_join: Boolean(
      viewerInvitation &&
      (!viewerMember || ['invited', 'left'].includes(viewerMember.status)) &&
      ['created', 'inviting', 'ready_check'].includes(room.state) &&
      participatingCount < room.member_limit
    ),
    can_leave: Boolean(viewerMember && ['joined', 'ready', 'countdown_locked', 'active', 'disconnected', 'reconnecting'].includes(viewerMember.status) && !['settling', 'closed', 'aborted'].includes(room.state)),
    can_ready: Boolean(viewerMember && room.state === 'ready_check' && viewerMember.status === 'joined'),
    can_unready: Boolean(viewerMember && room.state === 'ready_check' && viewerMember.status === 'ready'),
    can_disconnect: Boolean(viewerMember && ['countdown', 'running', 'paused'].includes(room.state) && ['countdown_locked', 'active', 'reconnecting'].includes(viewerMember.status)),
    can_reconnect: Boolean(viewerMember && viewerMember.status === 'disconnected' && room.state === 'paused'),
    can_host_ready_check: room.host_username === sanitizeText(viewerUsername, 40) && canStartReadyCheck(room),
    can_host_start_countdown: room.host_username === sanitizeText(viewerUsername, 40) && canStartCountdown(room),
    can_host_settle: room.host_username === sanitizeText(viewerUsername, 40) && ['running', 'paused'].includes(room.state),
    can_host_close: room.host_username === sanitizeText(viewerUsername, 40) && !['closed'].includes(room.state),
  };
}

function buildOverview(store, viewerUsername) {
  const normalizedViewer = sanitizeText(viewerUsername, 40);
  let changed = false;
  const rooms = (store.rooms || []).map(room => {
    const normalized = normalizeRoom(room);
    if (materializeCountdownState(normalized)) changed = true;
    return normalized;
  });
  if (changed) {
    store.rooms = rooms;
    saveStore(store);
  }

  const visibleRooms = rooms
    .filter(room => room.host_username === normalizedViewer || getRoomMember(room, normalizedViewer) || getRoomInvitation(room, normalizedViewer))
    .sort((left, right) => (right.updated_at || 0) - (left.updated_at || 0));

  const currentRoom = visibleRooms.find(room => {
    if (['closed', 'aborted'].includes(room.state)) return false;
    const member = getRoomMember(room, normalizedViewer);
    return Boolean(member && isMemberParticipating(member));
  }) || null;

  const invitedRooms = visibleRooms
    .filter(room => room.id !== currentRoom?.id && Boolean(getRoomInvitation(room, normalizedViewer)))
    .map(room => buildRoomSnapshot(store, room, normalizedViewer));

  const recentReceipts = (store.receipts || [])
    .map(normalizeRoomReceipt)
    .filter(receipt => receipt.target_username === normalizedViewer)
    .sort((left, right) => (right.created_at || 0) - (left.created_at || 0))
    .slice(0, 8)
    .map(receipt => ({
      id: receipt.id,
      room_id: receipt.room_id,
      room_title: receipt.room_title,
      template_id: receipt.template_id,
      template_label: receipt.template_label,
      target_slot: receipt.target_slot,
      status: receipt.status,
      status_label: receipt.status === 'persist_preview' ? '已生成回写预览' : '已生成凭证',
      reward_payload: receipt.reward_payload,
      summary: receipt.summary,
      created_at: receipt.created_at,
    }));

  return {
    bulletin: '节会房间第一轮已支持开房、邀请、加入、准备、倒计时、开场演出、结算凭证和断线重连；具体小游戏场景会在后续节会阶段继续接入。',
    templates: listRoomTemplates(),
    my_room: currentRoom ? buildRoomSnapshot(store, currentRoom, normalizedViewer) : null,
    invited_rooms: invitedRooms,
    visible_rooms: visibleRooms.map(room => buildRoomSnapshot(store, room, normalizedViewer)),
    recent_receipts: recentReceipts,
  };
}

async function createFestivalRoom(payload = {}, actor = {}) {
  const username = sanitizeText(actor.username, 40);
  const displayName = sanitizeText(actor.displayName, 40) || username;
  if (!username) throw createError('未登录账号不能创建节会房间', 401);
  const store = loadStore();
  ensureNoOtherActiveRoom(store, username);
  const template = getRoomTemplate(payload.template_id);
  const room = normalizeRoom({
    id: makeId('festival_room'),
    template_id: template.id,
    title: sanitizeText(payload.title, 60) || template.label,
    host_username: username,
    host_display_name: displayName,
    member_limit: payload.member_limit || template.default_member_limit,
    countdown_seconds: payload.countdown_seconds || DEFAULT_COUNTDOWN_SECONDS,
    reconnect_window_seconds: DEFAULT_RECONNECT_WINDOW_SECONDS,
    state: 'created',
    created_at: nowSeconds(),
    updated_at: nowSeconds(),
    members: [{
      username,
      display_name: displayName,
      role: 'host',
      status: 'joined',
      joined_at: nowSeconds(),
      last_seen_at: nowSeconds(),
    }],
    invitations: [],
    settlement_receipt_ids: [],
    events: [],
  });
  recordRoomEvent(room, 'room.create', actor, `创建了 ${template.label} 房间《${room.title}》`);
  replaceRoom(store, room);
  saveStore(store);
  return {
    room: buildRoomSnapshot(store, room, username),
    overview: buildOverview(store, username),
  };
}

async function inviteFestivalRoomMember(roomId, payload = {}, actor = {}) {
  const username = sanitizeText(actor.username, 40);
  const displayName = sanitizeText(actor.displayName, 40) || username;
  const targetUsername = sanitizeText(payload.target_username, 40);
  if (!targetUsername) throw createError('请输入要邀请的玩家用户名');
  if (targetUsername === username) throw createError('不能邀请自己加入节会房间');
  const targetUser = await db.getUser(targetUsername);
  if (!targetUser) throw createError('目标玩家不存在或已失效');
  const store = loadStore();
  const room = ensureRoomExists(store, roomId);
  materializeCountdownState(room);
  ensureHost(room, username);
  ensureRoomNotFinished(room);
  if (!['created', 'inviting', 'ready_check'].includes(room.state)) {
    throw createError('当前房间阶段不再允许发送新邀请');
  }
  if ((room.members || []).some(member => member.username === targetUsername && !['left', 'kicked'].includes(member.status))) {
    throw createError('该玩家已经在房间成员列表里了');
  }
  if (getJoinedMembers(room).length >= room.member_limit) {
    throw createError(`房间人数已满，当前最多支持 ${room.member_limit} 人`);
  }
  room.invitations = [normalizeRoomInvitation({
    id: makeId('activity_room_invite'),
    room_id: room.id,
    inviter_username: username,
    inviter_display_name: displayName,
    target_username: targetUser.username,
    target_display_name: targetUser.display_name || targetUser.username,
    status: 'pending',
    created_at: nowSeconds(),
    updated_at: nowSeconds(),
  }), ...(room.invitations || []).filter(invite => !(invite.target_username === targetUser.username && invite.status === 'pending')).map(normalizeRoomInvitation)];
  const existingMember = getRoomMember(room, targetUser.username);
  if (existingMember) {
    existingMember.status = 'invited';
    existingMember.role = existingMember.role || 'member';
    existingMember.display_name = targetUser.display_name || targetUser.username;
    existingMember.invited_at = nowSeconds();
    existingMember.last_seen_at = nowSeconds();
  } else {
    room.members = [...(room.members || []).map(normalizeRoomMember), normalizeRoomMember({
      username: targetUser.username,
      display_name: targetUser.display_name || targetUser.username,
      role: 'member',
      status: 'invited',
      invited_at: nowSeconds(),
      last_seen_at: nowSeconds(),
    })];
  }
  updateRoomState(room, 'inviting', '');
  recordRoomEvent(room, 'room.invite', actor, `邀请了 ${targetUser.display_name || targetUser.username} 进入房间`);
  replaceRoom(store, room);
  saveStore(store);
  return {
    room: buildRoomSnapshot(store, room, username),
    overview: buildOverview(store, username),
  };
}

async function joinFestivalRoom(roomId, actor = {}) {
  const username = sanitizeText(actor.username, 40);
  const displayName = sanitizeText(actor.displayName, 40) || username;
  if (!username) throw createError('未登录账号不能加入节会房间', 401);
  const store = loadStore();
  ensureNoOtherActiveRoom(store, username);
  const room = ensureRoomExists(store, roomId);
  materializeCountdownState(room);
  const invitation = getRoomInvitation(room, username);
  if (!invitation && room.host_username !== username) {
    throw createError('当前房间仅支持受邀成员加入', 403);
  }
  if (getJoinedMembers(room).length >= room.member_limit && !getRoomMember(room, username)) {
    throw createError('当前节会房间已满，稍后再试');
  }
  const member = getRoomMember(room, username);
  if (member && !['invited', 'left'].includes(member.status)) {
    throw createError('你已经在这个节会房间里了');
  }
  if (member) {
    member.status = 'joined';
    member.joined_at = nowSeconds();
    member.last_seen_at = nowSeconds();
    member.left_at = 0;
  } else {
    room.members = [...(room.members || []).map(normalizeRoomMember), normalizeRoomMember({
      username,
      display_name: displayName,
      role: room.host_username === username ? 'host' : 'member',
      status: 'joined',
      joined_at: nowSeconds(),
      last_seen_at: nowSeconds(),
    })];
  }
  if (invitation) {
    invitation.status = 'accepted';
    invitation.responded_at = nowSeconds();
    invitation.updated_at = nowSeconds();
  }
  updateRoomState(room, 'inviting', '');
  recordRoomEvent(room, 'room.join', actor, `${displayName} 已加入房间`);
  replaceRoom(store, room);
  saveStore(store);
  return {
    room: buildRoomSnapshot(store, room, username),
    overview: buildOverview(store, username),
  };
}

async function leaveFestivalRoom(roomId, actor = {}) {
  const username = sanitizeText(actor.username, 40);
  const store = loadStore();
  const room = ensureRoomExists(store, roomId);
  materializeCountdownState(room);
  ensureViewerCanSeeRoom(room, username);
  const member = getRoomMember(room, username);
  if (!member) throw createError('你当前不在这个节会房间里');
  if (member.role === 'host' && !['settling', 'closed', 'aborted'].includes(room.state)) {
    throw createError('房主不能直接离开房间，请先取消房间或完成结算');
  }
  if (['joined', 'ready'].includes(member.status)) {
    member.status = 'left';
    member.left_at = nowSeconds();
    member.last_seen_at = nowSeconds();
    recordRoomEvent(room, 'room.leave', actor, `${member.display_name} 已离开房间`);
  } else if (member.status === 'disconnected') {
    member.status = 'left';
    member.left_at = nowSeconds();
    recordRoomEvent(room, 'room.leave', actor, `${member.display_name} 放弃了这场节会房间`);
  } else {
    throw createError('当前状态不能直接离开节会房间');
  }
  if (getJoinedMembers(room).filter(entry => entry.role !== 'host').length <= 0 && ['inviting', 'ready_check'].includes(room.state)) {
    updateRoomState(room, 'created', '其余成员已离开，房间回到待邀请状态');
  }
  replaceRoom(store, room);
  saveStore(store);
  return {
    room: buildRoomSnapshot(store, room, username),
    overview: buildOverview(store, username),
  };
}

async function startFestivalRoomReadyCheck(roomId, actor = {}) {
  const username = sanitizeText(actor.username, 40);
  const store = loadStore();
  const room = ensureRoomExists(store, roomId);
  materializeCountdownState(room);
  ensureHost(room, username);
  ensureRoomNotFinished(room);
  if (!canStartReadyCheck(room)) {
    throw createError('至少要有 2 名已加入成员后，才能进入准备确认');
  }
  room.ready_check_started_at = nowSeconds();
  room.members = (room.members || []).map(member => {
    const normalized = normalizeRoomMember(member);
    if (normalized.status === 'ready') normalized.status = 'joined';
    return normalized;
  });
  updateRoomState(room, 'ready_check', '');
  recordRoomEvent(room, 'room.ready_check', actor, '房主发起了准备确认');
  replaceRoom(store, room);
  saveStore(store);
  return {
    room: buildRoomSnapshot(store, room, username),
    overview: buildOverview(store, username),
  };
}

async function setFestivalRoomReady(roomId, ready, actor = {}) {
  const username = sanitizeText(actor.username, 40);
  const displayName = sanitizeText(actor.displayName, 40) || username;
  const store = loadStore();
  const room = ensureRoomExists(store, roomId);
  materializeCountdownState(room);
  ensureViewerCanSeeRoom(room, username);
  if (room.state !== 'ready_check') {
    throw createError('当前房间还没有进入准备确认阶段');
  }
  const member = getRoomMember(room, username);
  if (!member || !['joined', 'ready'].includes(member.status)) {
    throw createError('当前成员状态不能切换准备');
  }
  member.status = ready ? 'ready' : 'joined';
  member.ready_at = ready ? nowSeconds() : 0;
  member.last_seen_at = nowSeconds();
  recordRoomEvent(room, ready ? 'room.ready' : 'room.unready', actor, `${displayName}${ready ? ' 已准备完毕' : ' 取消了准备状态'}`);
  replaceRoom(store, room);
  saveStore(store);
  return {
    room: buildRoomSnapshot(store, room, username),
    overview: buildOverview(store, username),
  };
}

async function startFestivalRoomCountdown(roomId, actor = {}) {
  const username = sanitizeText(actor.username, 40);
  const store = loadStore();
  const room = ensureRoomExists(store, roomId);
  materializeCountdownState(room);
  ensureHost(room, username);
  ensureRoomNotFinished(room);
  if (!canStartCountdown(room)) {
    throw createError('所有已加入成员都完成准备后，才能进入倒计时');
  }
  room.countdown_started_at = nowSeconds();
  room.countdown_ends_at = room.countdown_started_at + room.countdown_seconds;
  room.members = (room.members || []).map(member => {
    const normalized = normalizeRoomMember(member);
    if (['joined', 'ready'].includes(normalized.status)) {
      normalized.status = 'countdown_locked';
      normalized.last_seen_at = nowSeconds();
    }
    return normalized;
  });
  updateRoomState(room, 'countdown', '');
  recordRoomEvent(room, 'room.countdown.start', actor, `房间进入 ${room.countdown_seconds} 秒倒计时`);
  replaceRoom(store, room);
  saveStore(store);
  return {
    room: buildRoomSnapshot(store, room, username),
    overview: buildOverview(store, username),
  };
}

async function disconnectFestivalRoom(roomId, actor = {}) {
  const username = sanitizeText(actor.username, 40);
  const displayName = sanitizeText(actor.displayName, 40) || username;
  const store = loadStore();
  const room = ensureRoomExists(store, roomId);
  materializeCountdownState(room);
  const member = getRoomMember(room, username);
  if (!member) throw createError('你当前不在这个节会房间里');
  if (!['countdown', 'running', 'paused'].includes(room.state) || !['countdown_locked', 'active', 'reconnecting'].includes(member.status)) {
    throw createError('当前阶段不能触发断线恢复流程');
  }
  const previousRoomState = room.state === 'paused' ? (room.paused_from_state || 'running') : room.state;
  member.resume_status = member.status;
  member.status = 'disconnected';
  member.disconnected_at = nowSeconds();
  member.last_seen_at = nowSeconds();
  room.paused_from_state = previousRoomState;
  updateRoomState(room, 'paused', '有成员断线，等待恢复');
  recordRoomEvent(room, 'room.pause', actor, `${displayName} 暂时断线，房间进入暂停保护`);
  replaceRoom(store, room);
  saveStore(store);
  return {
    room: buildRoomSnapshot(store, room, username),
    overview: buildOverview(store, username),
  };
}

async function reconnectFestivalRoom(roomId, actor = {}) {
  const username = sanitizeText(actor.username, 40);
  const displayName = sanitizeText(actor.displayName, 40) || username;
  const store = loadStore();
  const room = ensureRoomExists(store, roomId);
  materializeCountdownState(room);
  const member = getRoomMember(room, username);
  if (!member) throw createError('你当前不在这个节会房间里');
  if (member.status !== 'disconnected') {
    throw createError('当前成员不在断线恢复状态里');
  }
  member.status = member.resume_status === 'countdown_locked' ? 'countdown_locked' : 'active';
  member.reconnected_at = nowSeconds();
  member.last_seen_at = nowSeconds();
  member.resume_status = '';
  const hasDisconnectedMembers = (room.members || []).some(entry => normalizeRoomMember(entry).status === 'disconnected');
  if (!hasDisconnectedMembers && room.state === 'paused') {
    updateRoomState(room, room.paused_from_state || 'running', '');
    room.paused_from_state = '';
    recordRoomEvent(room, 'room.resume', actor, `${displayName} 已恢复连接，房间继续推进`);
  } else {
    touchRoom(room);
    recordRoomEvent(room, 'room.reconnect', actor, `${displayName} 已恢复连接`);
  }
  replaceRoom(store, room);
  saveStore(store);
  return {
    room: buildRoomSnapshot(store, room, username),
    overview: buildOverview(store, username),
  };
}

async function settleFestivalRoom(roomId, actor = {}) {
  const username = sanitizeText(actor.username, 40);
  const store = loadStore();
  const room = ensureRoomExists(store, roomId);
  materializeCountdownState(room);
  ensureHost(room, username);
  if (!['running', 'paused'].includes(room.state)) {
    throw createError('只有进行中的节会房间才能进入结算');
  }
  if ((room.settlement_receipt_ids || []).length > 0) {
    throw createError('当前房间已经生成过结算凭证了');
  }
  room.settlement_version = Math.max(1, room.settlement_version + 1);
  const joinedMembers = getJoinedMembers(room);
  const nextReceipts = joinedMembers.map(member => normalizeRoomReceipt({
    id: makeId('festival_room_receipt'),
    room_id: room.id,
    room_title: room.title,
    template_id: room.template_id,
    template_label: getRoomTemplate(room.template_id).label,
    target_username: member.username,
    target_display_name: member.display_name,
    target_slot: getViewerSaveSlot(member.username),
    status: 'persist_preview',
    idempotency_key: `festival_room:${room.id}:${room.settlement_version}:${member.username}:slot${getViewerSaveSlot(member.username)}`,
    reward_payload: {
      money: 0,
      reward_tickets: 0,
      items: [],
    },
    summary: `已为 ${getRoomTemplate(room.template_id).label} 房间生成第一轮节会结算凭证；具体玩法奖励会在后续场景阶段继续接入。`,
    settlement_version: room.settlement_version,
    created_at: nowSeconds(),
    updated_at: nowSeconds(),
  }));
  store.receipts = [...nextReceipts, ...(store.receipts || []).map(normalizeRoomReceipt)].slice(0, 400);
  room.settlement_receipt_ids = nextReceipts.map(receipt => receipt.id);
  room.members = (room.members || []).map(member => {
    const normalized = normalizeRoomMember(member);
    if (isMemberParticipating(normalized)) {
      normalized.status = 'finished';
      normalized.active_receipt_id = nextReceipts.find(receipt => receipt.target_username === normalized.username)?.id || '';
    }
    return normalized;
  });
  room.settled_at = nowSeconds();
  updateRoomState(room, 'settling', '');
  recordRoomEvent(room, 'room.settle', actor, `已为 ${nextReceipts.length} 名成员生成结算凭证`);
  replaceRoom(store, room);
  saveStore(store);
  return {
    room: buildRoomSnapshot(store, room, username),
    overview: buildOverview(store, username),
  };
}

async function closeFestivalRoom(roomId, actor = {}) {
  const username = sanitizeText(actor.username, 40);
  const store = loadStore();
  const room = ensureRoomExists(store, roomId);
  materializeCountdownState(room);
  ensureHost(room, username);
  if (room.state === 'closed') {
    throw createError('当前房间已经关闭了');
  }
  if (room.state === 'settling') {
    room.members = (room.members || []).map(member => {
      const normalized = normalizeRoomMember(member);
      if (normalized.status === 'finished') normalized.status = 'settled';
      return normalized;
    });
    room.closed_at = nowSeconds();
    updateRoomState(room, 'closed', '');
    recordRoomEvent(room, 'room.close', actor, '房间结算已完成，正式关闭');
  } else {
    room.aborted_at = nowSeconds();
    updateRoomState(room, 'aborted', '房主主动取消了当前节会房间');
    recordRoomEvent(room, 'room.abort', actor, '房主取消了当前节会房间');
  }
  replaceRoom(store, room);
  saveStore(store);
  return {
    room: buildRoomSnapshot(store, room, username),
    overview: buildOverview(store, username),
  };
}

async function listFestivalRoomOverview(username) {
  const normalizedUsername = sanitizeText(username, 40);
  if (!normalizedUsername) throw createError('请先登录后再查看节会房间', 401);
  const store = loadStore();
  return buildOverview(store, normalizedUsername);
}

module.exports = {
  listFestivalRoomOverview,
  createFestivalRoom,
  inviteFestivalRoomMember,
  joinFestivalRoom,
  leaveFestivalRoom,
  startFestivalRoomReadyCheck,
  setFestivalRoomReady,
  startFestivalRoomCountdown,
  disconnectFestivalRoom,
  reconnectFestivalRoom,
  settleFestivalRoom,
  closeFestivalRoom,
};
