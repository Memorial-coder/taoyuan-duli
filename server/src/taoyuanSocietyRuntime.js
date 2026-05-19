const fs = require('fs');
const path = require('path');
const db = require('./db');
const { createError, writeJsonFileAtomic } = require('./taoyuanSaveRuntime');

const DATA_DIR = process.env.DB_STORAGE
  ? path.dirname(process.env.DB_STORAGE)
  : path.join(__dirname, '../data');

const TAOYUAN_SOCIETY_FILE = path.join(DATA_DIR, 'taoyuan_societies.json');

const SOCIETY_ROLE_LABELS = Object.freeze({
  president: '社长',
  steward: '管事',
  buyer: '采办',
  treasurer: '账房',
  scribe: '记录人',
  member: '普通成员',
});

const SOCIETY_ASSIGNABLE_ROLES = Object.freeze(['steward', 'buyer', 'treasurer', 'scribe', 'member']);
const SOCIETY_MANAGER_ROLES = Object.freeze(['president', 'steward']);
const SOCIETY_NOTICE_EDITOR_ROLES = Object.freeze(['president', 'steward', 'scribe']);
const SOCIETY_PROPOSAL_CLOSER_ROLES = Object.freeze(['president', 'steward', 'scribe']);

const SOCIETY_VISIBILITY_OPTIONS = Object.freeze([
  { id: 'public', label: '公开', summary: '任何玩家都能看到村社卡片与基础信息。' },
  { id: 'semi_public', label: '半公开', summary: '公开展示基础信息，但后续入社仍需要进一步审核。' },
  { id: 'private', label: '私密', summary: '只对内部成员可见，暂不进入公开村社列表。' },
]);

const SOCIETY_THEME_OPTIONS = Object.freeze([
  { id: 'harvest_union', label: '农桑共耕', summary: '偏向种植、仓储与季节备货。' },
  { id: 'festival_hosts', label: '节会主办', summary: '偏向节庆组织、礼仪布置与活动承接。' },
  { id: 'craft_collective', label: '匠作共坊', summary: '偏向工坊、加工与物资周转。' },
  { id: 'trade_circle', label: '行商互济', summary: '偏向交换、慢交易与后勤调度。' },
  { id: 'expedition_camp', label: '远行筹备', summary: '偏向探索、远征与协作补给。' },
  { id: 'archive_hall', label: '史册同修', summary: '偏向纪念、典藏与世界记录。' },
]);

const SOCIETY_EMBLEM_OPTIONS = Object.freeze([
  { id: 'plum_seal', label: '梅印' },
  { id: 'crane_banner', label: '鹤旗' },
  { id: 'grain_knot', label: '禾结' },
  { id: 'brook_mark', label: '溪纹' },
  { id: 'mountain_badge', label: '山徽' },
  { id: 'lantern_medallion', label: '灯章' },
]);

const SOCIETY_CAPACITY_OPTIONS = Object.freeze([
  { value: 12, label: '小型村社（6-12 人）' },
  { value: 24, label: '中型村社（12-24 人）' },
  { value: 48, label: '大型村社（24-48 人）' },
]);

const SOCIETY_JOIN_REQUIREMENT_OPTIONS = Object.freeze([
  { id: 'open', label: '来者皆可', summary: '当前先按公开招募口径展示，后续可进一步审核。' },
  { id: 'friends_recommended', label: '好友推荐优先', summary: '优先欢迎已有好友链或熟人推荐的玩家。' },
  { id: 'neighbor_recommended', label: '邻里互荐优先', summary: '优先吸收已有邻里协作痕迹的玩家。' },
  { id: 'invite_only', label: '仅邀请加入', summary: '当前只接受社内主动发出的邀请。' },
  { id: 'seasoned_farmer', label: '经营进度达标', summary: '建议申请者已经有稳定经营进度与公开档案。' },
]);

const SOCIETY_PROPOSAL_KIND_OPTIONS = Object.freeze([
  { id: 'governance', label: '社务治理', summary: '围绕社内规则、角色安排和治理方式发起提案。' },
  { id: 'festival', label: '节会安排', summary: '围绕节会房间、排班和节庆筹备发起提案。' },
  { id: 'construction', label: '共建筹备', summary: '围绕公共建设、集体物资和工程优先级发起提案。' },
  { id: 'welfare', label: '成员福利', summary: '围绕社内奖励、补给和共享权益发起提案。' },
  { id: 'notice', label: '日常议题', summary: '围绕日常运营、协作节奏和临时决策发起提案。' },
]);

const SOCIETY_PROPOSAL_CHOICE_OPTIONS = Object.freeze([
  { id: 'support', label: '赞成' },
  { id: 'reject', label: '反对' },
  { id: 'abstain', label: '暂缓' },
]);

const SOCIETY_PROPOSAL_RESULT_LABELS = Object.freeze({
  support: '已通过',
  reject: '未通过',
  abstain: '暂缓处理',
  tie: '票数相持',
  pending: '待结论',
});

function createEmptySocietyStore() {
  return {
    societies: [],
    society_join_requests: [],
  };
}

function sanitizeText(value, maxLength) {
  return String(value || '').replace(/\r\n/g, '\n').trim().slice(0, maxLength);
}

function normalizeUsername(value) {
  return String(value || '').normalize('NFKC').trim();
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function ensureSocietyStoreDir() {
  fs.mkdirSync(path.dirname(TAOYUAN_SOCIETY_FILE), { recursive: true });
}

function normalizeSocietyVisibility(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'private') return 'private';
  if (normalized === 'semi_public') return 'semi_public';
  return 'public';
}

function normalizeSocietyRole(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return SOCIETY_ROLE_LABELS[normalized] ? normalized : 'member';
}

function normalizeSocietyTheme(value) {
  const normalized = String(value || '').trim();
  return SOCIETY_THEME_OPTIONS.find(entry => entry.id === normalized)?.id || SOCIETY_THEME_OPTIONS[0].id;
}

function normalizeSocietyEmblem(value) {
  const normalized = String(value || '').trim();
  return SOCIETY_EMBLEM_OPTIONS.find(entry => entry.id === normalized)?.id || SOCIETY_EMBLEM_OPTIONS[0].id;
}

function normalizeSocietyCapacity(value) {
  const numeric = Math.max(6, Math.floor(Number(value) || SOCIETY_CAPACITY_OPTIONS[1].value));
  return SOCIETY_CAPACITY_OPTIONS.find(entry => entry.value === numeric)?.value || SOCIETY_CAPACITY_OPTIONS[1].value;
}

function normalizeJoinRequirementId(value) {
  const normalized = String(value || '').trim();
  return SOCIETY_JOIN_REQUIREMENT_OPTIONS.find(entry => entry.id === normalized)?.id || SOCIETY_JOIN_REQUIREMENT_OPTIONS[0].id;
}

function normalizeProposalKindId(value) {
  const normalized = String(value || '').trim();
  return SOCIETY_PROPOSAL_KIND_OPTIONS.find(entry => entry.id === normalized)?.id || SOCIETY_PROPOSAL_KIND_OPTIONS[0].id;
}

function normalizeProposalChoiceId(value) {
  const normalized = String(value || '').trim();
  return SOCIETY_PROPOSAL_CHOICE_OPTIONS.find(entry => entry.id === normalized)?.id || SOCIETY_PROPOSAL_CHOICE_OPTIONS[0].id;
}

function normalizeProposalResultChoice(value) {
  const normalized = String(value || '').trim();
  return ['support', 'reject', 'abstain', 'tie', 'pending'].includes(normalized) ? normalized : 'pending';
}

function normalizeActivityEntry(entry) {
  return {
    id: sanitizeText(entry?.id || makeId('society_log'), 80),
    type: sanitizeText(entry?.type, 24) || 'activity',
    message: sanitizeText(entry?.message, 120),
    created_at: Math.max(0, Math.floor(Number(entry?.created_at) || nowSeconds())),
  };
}

function normalizeSocietyMember(entry) {
  return {
    username: normalizeUsername(entry?.username),
    display_name: sanitizeText(entry?.display_name, 40),
    role: normalizeSocietyRole(entry?.role),
    joined_at: Math.max(0, Math.floor(Number(entry?.joined_at) || nowSeconds())),
  };
}

function normalizeSocietyJoinRequest(entry) {
  return {
    id: sanitizeText(entry?.id || makeId('society_join'), 80),
    society_id: sanitizeText(entry?.society_id, 80),
    username: normalizeUsername(entry?.username),
    display_name: sanitizeText(entry?.display_name, 40),
    invited_by: normalizeUsername(entry?.invited_by),
    invited_by_display_name: sanitizeText(entry?.invited_by_display_name, 40),
    type: entry?.type === 'invite' ? 'invite' : 'apply',
    status: ['pending', 'accepted', 'rejected'].includes(String(entry?.status)) ? String(entry.status) : 'pending',
    created_at: Math.max(0, Math.floor(Number(entry?.created_at) || nowSeconds())),
    updated_at: Math.max(0, Math.floor(Number(entry?.updated_at) || Number(entry?.created_at) || nowSeconds())),
  };
}

function normalizeSocietyProposalVote(entry) {
  return {
    id: sanitizeText(entry?.id || makeId('society_vote'), 80),
    username: normalizeUsername(entry?.username),
    display_name: sanitizeText(entry?.display_name, 40),
    choice: normalizeProposalChoiceId(entry?.choice),
    voted_at: Math.max(0, Math.floor(Number(entry?.voted_at) || nowSeconds())),
  };
}

function normalizeSocietyProposal(entry) {
  return {
    id: sanitizeText(entry?.id || makeId('society_proposal'), 80),
    title: sanitizeText(entry?.title, 40),
    summary: sanitizeText(entry?.summary, 160),
    kind: normalizeProposalKindId(entry?.kind),
    status: entry?.status === 'closed' ? 'closed' : 'open',
    created_by: normalizeUsername(entry?.created_by),
    created_by_display_name: sanitizeText(entry?.created_by_display_name, 40),
    created_at: Math.max(0, Math.floor(Number(entry?.created_at) || nowSeconds())),
    updated_at: Math.max(0, Math.floor(Number(entry?.updated_at) || Number(entry?.created_at) || nowSeconds())),
    closed_at: Math.max(0, Math.floor(Number(entry?.closed_at) || 0)),
    result_choice: normalizeProposalResultChoice(entry?.result_choice),
    resolution_note: sanitizeText(entry?.resolution_note, 120),
    votes: Array.isArray(entry?.votes)
      ? entry.votes.map(normalizeSocietyProposalVote).filter(vote => vote.username).slice(0, 200)
      : [],
  };
}

function normalizeSociety(entry) {
  return {
    id: sanitizeText(entry?.id || makeId('society'), 80),
    name: sanitizeText(entry?.name, 24),
    summary: sanitizeText(entry?.summary, 120),
    notice: sanitizeText(entry?.notice, 160),
    emblem: normalizeSocietyEmblem(entry?.emblem),
    theme: normalizeSocietyTheme(entry?.theme),
    visibility: normalizeSocietyVisibility(entry?.visibility),
    capacity: normalizeSocietyCapacity(entry?.capacity),
    join_requirement_id: normalizeJoinRequirementId(entry?.join_requirement_id),
    join_requirement_note: sanitizeText(entry?.join_requirement_note, 80),
    created_by: normalizeUsername(entry?.created_by),
    created_at: Math.max(0, Math.floor(Number(entry?.created_at) || nowSeconds())),
    updated_at: Math.max(0, Math.floor(Number(entry?.updated_at) || Number(entry?.created_at) || nowSeconds())),
    members: Array.isArray(entry?.members)
      ? entry.members.map(normalizeSocietyMember).filter(member => member.username)
      : [],
    activity_log: Array.isArray(entry?.activity_log)
      ? entry.activity_log.map(normalizeActivityEntry).filter(item => item.message).slice(0, 20)
      : [],
    proposals: Array.isArray(entry?.proposals)
      ? entry.proposals.map(normalizeSocietyProposal).filter(proposal => proposal.title).slice(0, 60)
      : [],
  };
}

function loadSocietyStore() {
  ensureSocietyStoreDir();
  try {
    if (!fs.existsSync(TAOYUAN_SOCIETY_FILE)) return createEmptySocietyStore();
    const raw = JSON.parse(fs.readFileSync(TAOYUAN_SOCIETY_FILE, 'utf8'));
    return raw && typeof raw === 'object'
      ? {
          societies: Array.isArray(raw.societies) ? raw.societies : [],
          society_join_requests: Array.isArray(raw.society_join_requests) ? raw.society_join_requests : [],
        }
      : createEmptySocietyStore();
  } catch {
    return createEmptySocietyStore();
  }
}

function saveSocietyStore(store) {
  ensureSocietyStoreDir();
  writeJsonFileAtomic(TAOYUAN_SOCIETY_FILE, {
    societies: Array.isArray(store?.societies) ? store.societies.map(normalizeSociety) : [],
    society_join_requests: Array.isArray(store?.society_join_requests)
      ? store.society_join_requests.map(normalizeSocietyJoinRequest)
      : [],
  });
}

function findSocietyById(store, societyId) {
  const normalizedId = sanitizeText(societyId, 80);
  return (store.societies || [])
    .map(normalizeSociety)
    .find(entry => entry.id === normalizedId) || null;
}

function findMemberSociety(store, username) {
  const normalizedUsername = normalizeUsername(username);
  return (store.societies || [])
    .map(normalizeSociety)
    .find(entry => entry.members.some(member => member.username === normalizedUsername)) || null;
}

function findPendingSocietyRequest(store, societyId, username) {
  const normalizedSocietyId = sanitizeText(societyId, 80);
  const normalizedUsername = normalizeUsername(username);
  return (store.society_join_requests || [])
    .map(normalizeSocietyJoinRequest)
    .find(entry =>
      entry.society_id === normalizedSocietyId &&
      entry.username === normalizedUsername &&
      entry.status === 'pending'
    ) || null;
}

function hasPendingSocietyRequest(store, societyId, username) {
  return !!findPendingSocietyRequest(store, societyId, username);
}

function appendSocietyActivity(society, message, type = 'activity') {
  society.activity_log = [
    normalizeActivityEntry({
      id: makeId('society_log'),
      type,
      message,
      created_at: nowSeconds(),
    }),
    ...(society.activity_log || []).map(normalizeActivityEntry),
  ].slice(0, 20);
  society.updated_at = nowSeconds();
}

function updateSocietyInStore(store, society) {
  store.societies = (store.societies || []).map(entry => {
    const normalized = normalizeSociety(entry);
    return normalized.id === society.id ? society : normalized;
  });
}

function getSocietyMember(society, username) {
  const normalizedUsername = normalizeUsername(username);
  return (society.members || []).find(entry => entry.username === normalizedUsername) || null;
}

function ensureSocietyMemberRole(society, username, allowedRoles, failureMessage, status = 403) {
  const member = getSocietyMember(society, username);
  if (!member || !allowedRoles.includes(member.role)) {
    throw createError(failureMessage, status);
  }
  return member;
}

function computeProposalResultChoice(proposal) {
  const tally = {
    support: 0,
    reject: 0,
    abstain: 0,
  };
  for (const vote of proposal.votes || []) {
    const choice = normalizeProposalChoiceId(vote.choice);
    tally[choice] += 1;
  }
  if (tally.support > tally.reject) return 'support';
  if (tally.reject > tally.support) return 'reject';
  if (tally.support === 0 && tally.reject === 0) return 'abstain';
  return 'tie';
}

function getProposalStatusLabel(status) {
  return status === 'closed' ? '已归档' : '投票中';
}

function getProposalResultLabel(resultChoice) {
  return SOCIETY_PROPOSAL_RESULT_LABELS[resultChoice] || SOCIETY_PROPOSAL_RESULT_LABELS.pending;
}

async function resolveDisplayName(username) {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) return '';
  try {
    const user = await db.getUser(normalizedUsername);
    return sanitizeText(user?.display_name || user?.displayName || normalizedUsername, 40) || normalizedUsername;
  } catch {
    return normalizedUsername;
  }
}

async function ensureTargetUserExists(username) {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) throw createError('目标玩家不存在', 404);
  const user = await db.getUser(normalizedUsername);
  if (!user) throw createError('目标玩家不存在', 404);
  return user;
}

async function hydrateMembers(members = []) {
  return Promise.all((members || []).map(async entry => {
    const normalized = normalizeSocietyMember(entry);
    return {
      ...normalized,
      display_name: normalized.display_name || await resolveDisplayName(normalized.username),
    };
  }));
}

async function buildProposalSnapshot(proposal, viewerUsername, viewerIsMember, viewerCanClose) {
  const normalized = normalizeSocietyProposal(proposal);
  const kindEntry = SOCIETY_PROPOSAL_KIND_OPTIONS.find(entry => entry.id === normalized.kind) || SOCIETY_PROPOSAL_KIND_OPTIONS[0];
  const votes = (normalized.votes || []).map(normalizeSocietyProposalVote);
  const vote_counts = {
    support: votes.filter(entry => entry.choice === 'support').length,
    reject: votes.filter(entry => entry.choice === 'reject').length,
    abstain: votes.filter(entry => entry.choice === 'abstain').length,
  };
  const myVote = votes.find(entry => entry.username === normalizeUsername(viewerUsername)) || null;
  const resultChoice = normalized.status === 'closed' ? normalizeProposalResultChoice(normalized.result_choice || computeProposalResultChoice(normalized)) : 'pending';
  return {
    id: normalized.id,
    title: normalized.title,
    summary: normalized.summary,
    kind: normalized.kind,
    kind_label: kindEntry.label,
    status: normalized.status,
    status_label: getProposalStatusLabel(normalized.status),
    created_by: normalized.created_by,
    created_by_display_name: normalized.created_by_display_name || await resolveDisplayName(normalized.created_by),
    created_at: normalized.created_at,
    updated_at: normalized.updated_at,
    closed_at: normalized.closed_at,
    vote_counts,
    total_vote_count: vote_counts.support + vote_counts.reject + vote_counts.abstain,
    my_vote_choice: myVote?.choice || '',
    can_vote: viewerIsMember && normalized.status === 'open',
    can_close: viewerCanClose && normalized.status === 'open',
    result_choice: resultChoice,
    result_label: getProposalResultLabel(resultChoice),
    resolution_note: normalized.resolution_note,
    choice_options: SOCIETY_PROPOSAL_CHOICE_OPTIONS,
    votes: votes.map(entry => ({
      username: entry.username,
      display_name: entry.display_name || entry.username,
      choice: entry.choice,
      choice_label: SOCIETY_PROPOSAL_CHOICE_OPTIONS.find(option => option.id === entry.choice)?.label || entry.choice,
      voted_at: entry.voted_at,
    })),
  };
}

async function buildSocietyJoinRequestSnapshot(request, store) {
  const normalized = normalizeSocietyJoinRequest(request);
  const society = findSocietyById(store, normalized.society_id);
  return {
    ...normalized,
    type_label: normalized.type === 'invite' ? '邀请加入' : '申请加入',
    society_name: society?.name || '未命名村社',
    display_name: normalized.display_name || await resolveDisplayName(normalized.username),
    invited_by_display_name: normalized.invited_by_display_name || await resolveDisplayName(normalized.invited_by),
  };
}

async function buildSocietySnapshot(society, viewerUsername = '', viewerHasSociety = false, store = null) {
  const normalized = normalizeSociety(society);
  const members = await hydrateMembers(normalized.members);
  const leader = members.find(entry => entry.role === 'president') || members[0] || null;
  const viewerMember = members.find(entry => entry.username === normalizeUsername(viewerUsername)) || null;
  const viewerRole = viewerMember?.role || '';
  const visibilityEntry = SOCIETY_VISIBILITY_OPTIONS.find(entry => entry.id === normalized.visibility) || SOCIETY_VISIBILITY_OPTIONS[0];
  const themeEntry = SOCIETY_THEME_OPTIONS.find(entry => entry.id === normalized.theme) || SOCIETY_THEME_OPTIONS[0];
  const emblemEntry = SOCIETY_EMBLEM_OPTIONS.find(entry => entry.id === normalized.emblem) || SOCIETY_EMBLEM_OPTIONS[0];
  const joinRequirementEntry = SOCIETY_JOIN_REQUIREMENT_OPTIONS.find(entry => entry.id === normalized.join_requirement_id) || SOCIETY_JOIN_REQUIREMENT_OPTIONS[0];
  const canReviewRequests = SOCIETY_MANAGER_ROLES.includes(viewerRole);
  const canCloseProposal = SOCIETY_PROPOSAL_CLOSER_ROLES.includes(viewerRole);
  const canApply = !viewerMember &&
    !viewerHasSociety &&
    normalized.visibility !== 'private' &&
    normalized.join_requirement_id !== 'invite_only' &&
    !(store && hasPendingSocietyRequest(store, normalized.id, viewerUsername));
  const activeProposals = normalized.proposals
    .map(normalizeSocietyProposal)
    .filter(entry => entry.status === 'open')
    .sort((left, right) => right.updated_at - left.updated_at);
  const proposalHistory = normalized.proposals
    .map(normalizeSocietyProposal)
    .filter(entry => entry.status === 'closed')
    .sort((left, right) => right.closed_at - left.closed_at)
    .slice(0, 12);

  return {
    id: normalized.id,
    name: normalized.name,
    summary: normalized.summary,
    notice: normalized.notice,
    emblem: normalized.emblem,
    emblem_label: emblemEntry.label,
    theme: normalized.theme,
    theme_label: themeEntry.label,
    visibility: normalized.visibility,
    visibility_label: visibilityEntry.label,
    capacity: normalized.capacity,
    member_count: members.length,
    leader_username: leader?.username || normalized.created_by,
    leader_display_name: leader?.display_name || await resolveDisplayName(normalized.created_by),
    join_requirement_id: normalized.join_requirement_id,
    join_requirement_label: joinRequirementEntry.label,
    join_requirement_summary: joinRequirementEntry.summary,
    join_requirement_note: normalized.join_requirement_note,
    created_at: normalized.created_at,
    updated_at: normalized.updated_at,
    my_role: viewerRole,
    my_role_label: viewerRole ? SOCIETY_ROLE_LABELS[viewerRole] || viewerRole : '',
    can_apply: canApply,
    can_invite: SOCIETY_MANAGER_ROLES.includes(viewerRole),
    can_review_requests: canReviewRequests,
    can_manage_roles: viewerRole === 'president',
    can_manage_notice: SOCIETY_NOTICE_EDITOR_ROLES.includes(viewerRole),
    can_create_proposal: !!viewerMember,
    can_close_proposal: canCloseProposal,
    members: members.map(entry => ({
      username: entry.username,
      display_name: entry.display_name,
      role: entry.role,
      role_label: SOCIETY_ROLE_LABELS[entry.role] || entry.role,
      joined_at: entry.joined_at,
    })),
    activity_log: normalized.activity_log.map(normalizeActivityEntry),
    active_proposals: await Promise.all(activeProposals.map(entry => buildProposalSnapshot(entry, viewerUsername, !!viewerMember, canCloseProposal))),
    proposal_history: await Promise.all(proposalHistory.map(entry => buildProposalSnapshot(entry, viewerUsername, !!viewerMember, false))),
  };
}

async function buildOverview(store, username) {
  const viewerUsername = normalizeUsername(username);
  const mySociety = findMemberSociety(store, viewerUsername);
  const viewerHasSociety = !!mySociety;
  const myRole = mySociety ? getSocietyMember(mySociety, viewerUsername)?.role || '' : '';
  const canReviewRequests = SOCIETY_MANAGER_ROLES.includes(myRole);

  const visibleSocieties = (store.societies || [])
    .map(normalizeSociety)
    .filter(entry => entry.id !== mySociety?.id)
    .filter(entry => entry.visibility === 'public' || entry.visibility === 'semi_public')
    .sort((left, right) => {
      const memberDiff = right.members.length - left.members.length;
      if (memberDiff !== 0) return memberDiff;
      return right.updated_at - left.updated_at;
    });

  const incomingInvites = await Promise.all(
    (store.society_join_requests || [])
      .map(normalizeSocietyJoinRequest)
      .filter(entry => entry.type === 'invite' && entry.username === viewerUsername && entry.status === 'pending')
      .sort((left, right) => right.created_at - left.created_at)
      .map(entry => buildSocietyJoinRequestSnapshot(entry, store))
  );

  const myPendingRequests = await Promise.all(
    (store.society_join_requests || [])
      .map(normalizeSocietyJoinRequest)
      .filter(entry => entry.type === 'apply' && entry.username === viewerUsername && entry.status === 'pending')
      .sort((left, right) => right.created_at - left.created_at)
      .map(entry => buildSocietyJoinRequestSnapshot(entry, store))
  );

  const managedRequests = mySociety && canReviewRequests
    ? await Promise.all(
        (store.society_join_requests || [])
          .map(normalizeSocietyJoinRequest)
          .filter(entry => entry.society_id === mySociety.id && entry.status === 'pending')
          .sort((left, right) => right.created_at - left.created_at)
          .map(entry => buildSocietyJoinRequestSnapshot(entry, store))
      )
    : [];

  return {
    bulletin: '村社当前已支持创建、申请、邀请、职位治理、公告更新与提案投票骨架，后续会继续补公共建设、福利与专属节会。',
    my_society: mySociety ? await buildSocietySnapshot(mySociety, viewerUsername, true, store) : null,
    visible_societies: await Promise.all(visibleSocieties.map(entry => buildSocietySnapshot(entry, viewerUsername, viewerHasSociety, store))),
    incoming_invites: incomingInvites,
    my_pending_requests: myPendingRequests,
    managed_requests: managedRequests,
    visibility_options: SOCIETY_VISIBILITY_OPTIONS,
    theme_options: SOCIETY_THEME_OPTIONS,
    emblem_options: SOCIETY_EMBLEM_OPTIONS,
    capacity_options: SOCIETY_CAPACITY_OPTIONS,
    join_requirement_options: SOCIETY_JOIN_REQUIREMENT_OPTIONS,
    role_options: Object.entries(SOCIETY_ROLE_LABELS).map(([id, label]) => ({ id, label })),
    proposal_kind_options: SOCIETY_PROPOSAL_KIND_OPTIONS,
  };
}

async function listSocietyOverview(username) {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) throw createError('请先登录后再查看村社', 401);
  const store = loadSocietyStore();
  return buildOverview(store, normalizedUsername);
}

async function createSociety(payload = {}, actor = {}) {
  const username = normalizeUsername(actor.username);
  const displayName = sanitizeText(actor.displayName, 40) || await resolveDisplayName(username) || username;
  if (!username) throw createError('未登录账号不能创建村社', 401);
  const store = loadSocietyStore();
  if (findMemberSociety(store, username)) throw createError('你已经加入一个村社了');

  const name = sanitizeText(payload.name, 24);
  if (name.length < 2) throw createError('村社名称至少 2 个字');
  const duplicated = (store.societies || [])
    .map(normalizeSociety)
    .some(entry => entry.name === name);
  if (duplicated) throw createError('这个村社名称已经被占用了');

  const society = normalizeSociety({
    id: makeId('society'),
    name,
    summary: payload.summary,
    notice: payload.notice,
    emblem: payload.emblem,
    theme: payload.theme,
    visibility: payload.visibility,
    capacity: payload.capacity,
    join_requirement_id: payload.join_requirement_id,
    join_requirement_note: payload.join_requirement_note,
    created_by: username,
    created_at: nowSeconds(),
    updated_at: nowSeconds(),
    members: [
      {
        username,
        display_name: displayName,
        role: 'president',
        joined_at: nowSeconds(),
      },
    ],
    activity_log: [],
    proposals: [],
  });

  appendSocietyActivity(society, `${displayName}创建了村社「${society.name}」`, 'create');
  store.societies = [...(store.societies || []), society];
  saveSocietyStore(store);

  return {
    society: await buildSocietySnapshot(society, username, true, store),
    overview: await buildOverview(store, username),
  };
}

async function applyToSociety(username, societyId) {
  const store = loadSocietyStore();
  const applicant = normalizeUsername(username);
  const society = findSocietyById(store, societyId);
  if (!society) throw createError('村社不存在', 404);
  if (findMemberSociety(store, applicant)) throw createError('你已经加入其他村社了');
  if (society.visibility === 'private') throw createError('当前村社暂不开放公开申请', 403);
  if (society.join_requirement_id === 'invite_only') throw createError('当前村社仅接受邀请加入', 403);
  if (getSocietyMember(society, applicant)) throw createError('你已经是这个村社的成员了');
  if (hasPendingSocietyRequest(store, society.id, applicant)) throw createError('你已经提交过申请或收到邀请了');

  const request = normalizeSocietyJoinRequest({
    id: makeId('society_join'),
    society_id: society.id,
    username: applicant,
    display_name: await resolveDisplayName(applicant),
    type: 'apply',
    status: 'pending',
    created_at: nowSeconds(),
    updated_at: nowSeconds(),
  });
  store.society_join_requests = [...(store.society_join_requests || []), request];
  saveSocietyStore(store);
  return {
    request: await buildSocietyJoinRequestSnapshot(request, store),
    overview: await buildOverview(store, applicant),
  };
}

async function inviteToSociety(payload = {}, actor = {}) {
  const store = loadSocietyStore();
  const inviter = normalizeUsername(actor.username);
  const inviterDisplayName = sanitizeText(actor.displayName, 40) || await resolveDisplayName(inviter) || inviter;
  const society = findMemberSociety(store, inviter);
  if (!society) throw createError('你当前没有加入村社');
  ensureSocietyMemberRole(society, inviter, SOCIETY_MANAGER_ROLES, '只有社长或管事可以邀请成员');
  if ((society.members || []).length >= society.capacity) throw createError('当前村社人数已满');

  const targetUsername = normalizeUsername(payload.target_username);
  if (!targetUsername) throw createError('请先填写要邀请的玩家');
  if (targetUsername === inviter) throw createError('不能邀请自己');
  await ensureTargetUserExists(targetUsername);
  if (findMemberSociety(store, targetUsername)) throw createError('对方已经加入其他村社');
  if (hasPendingSocietyRequest(store, society.id, targetUsername)) throw createError('该玩家已有待处理的申请或邀请');

  const request = normalizeSocietyJoinRequest({
    id: makeId('society_join'),
    society_id: society.id,
    username: targetUsername,
    display_name: await resolveDisplayName(targetUsername),
    invited_by: inviter,
    invited_by_display_name: inviterDisplayName,
    type: 'invite',
    status: 'pending',
    created_at: nowSeconds(),
    updated_at: nowSeconds(),
  });
  store.society_join_requests = [...(store.society_join_requests || []), request];
  saveSocietyStore(store);
  return {
    request: await buildSocietyJoinRequestSnapshot(request, store),
    overview: await buildOverview(store, inviter),
  };
}

async function respondSocietyRequest(requestId, decision, actor = {}) {
  const store = loadSocietyStore();
  const actorUsername = normalizeUsername(actor.username);
  const normalizedDecision = decision === 'accept' ? 'accept' : 'reject';
  const request = (store.society_join_requests || [])
    .map(normalizeSocietyJoinRequest)
    .find(entry => entry.id === sanitizeText(requestId, 80));
  if (!request || request.status !== 'pending') throw createError('村社申请不存在或已失效', 404);

  const society = findSocietyById(store, request.society_id);
  if (!society) throw createError('村社不存在', 404);

  const actorMember = getSocietyMember(society, actorUsername);
  const canManage = actorMember && SOCIETY_MANAGER_ROLES.includes(actorMember.role);
  const canSelfRespondInvite = request.type === 'invite' && request.username === actorUsername;
  if (!canManage && !canSelfRespondInvite) throw createError('你无权处理这条村社申请', 403);

  request.status = normalizedDecision === 'accept' ? 'accepted' : 'rejected';
  request.updated_at = nowSeconds();

  if (normalizedDecision === 'accept') {
    if ((society.members || []).length >= society.capacity) throw createError('当前村社人数已满');
    if (findMemberSociety(store, request.username)) throw createError('该玩家已经加入其他村社');
    const targetDisplayName = request.display_name || await resolveDisplayName(request.username);
    society.members = [
      ...(society.members || []),
      normalizeSocietyMember({
        username: request.username,
        display_name: targetDisplayName,
        role: 'member',
        joined_at: nowSeconds(),
      }),
    ];
    appendSocietyActivity(society, `${targetDisplayName}加入了村社「${society.name}」`, 'join');
    updateSocietyInStore(store, society);
  }

  store.society_join_requests = (store.society_join_requests || []).map(entry => {
    const normalized = normalizeSocietyJoinRequest(entry);
    return normalized.id === request.id ? request : normalized;
  });
  saveSocietyStore(store);
  return {
    request: await buildSocietyJoinRequestSnapshot(request, store),
    overview: await buildOverview(store, actorUsername),
  };
}

async function updateSocietyMemberRole(payload = {}, actor = {}) {
  const store = loadSocietyStore();
  const actorUsername = normalizeUsername(actor.username);
  const targetUsername = normalizeUsername(payload.target_username);
  const nextRole = normalizeSocietyRole(payload.role);
  if (!targetUsername) throw createError('请先指定要调整的成员');
  if (!SOCIETY_ASSIGNABLE_ROLES.includes(nextRole)) throw createError('当前职位暂不支持直接分配');

  const society = findMemberSociety(store, actorUsername);
  if (!society) throw createError('你当前没有加入村社');
  ensureSocietyMemberRole(society, actorUsername, ['president'], '只有社长可以调整职位');

  const targetMember = getSocietyMember(society, targetUsername);
  if (!targetMember) throw createError('目标成员不存在', 404);
  if (targetMember.role === 'president') throw createError('不能修改社长职位');

  targetMember.role = nextRole;
  const targetDisplayName = targetMember.display_name || await resolveDisplayName(targetUsername);
  appendSocietyActivity(society, `${targetDisplayName}现在担任${SOCIETY_ROLE_LABELS[nextRole]}`, 'role');
  updateSocietyInStore(store, society);
  saveSocietyStore(store);
  return {
    society: await buildSocietySnapshot(society, actorUsername, true, store),
    overview: await buildOverview(store, actorUsername),
  };
}

async function updateSocietyNotice(payload = {}, actor = {}) {
  const store = loadSocietyStore();
  const actorUsername = normalizeUsername(actor.username);
  const actorDisplayName = sanitizeText(actor.displayName, 40) || await resolveDisplayName(actorUsername) || actorUsername;
  const society = findMemberSociety(store, actorUsername);
  if (!society) throw createError('你当前没有加入村社');
  ensureSocietyMemberRole(society, actorUsername, SOCIETY_NOTICE_EDITOR_ROLES, '只有社长、管事或记录人可以更新公告');
  society.notice = sanitizeText(payload.notice, 160);
  appendSocietyActivity(society, `${actorDisplayName}更新了村社公告`, 'notice');
  updateSocietyInStore(store, society);
  saveSocietyStore(store);
  return {
    society: await buildSocietySnapshot(society, actorUsername, true, store),
    overview: await buildOverview(store, actorUsername),
  };
}

async function createSocietyProposal(payload = {}, actor = {}) {
  const store = loadSocietyStore();
  const actorUsername = normalizeUsername(actor.username);
  const actorDisplayName = sanitizeText(actor.displayName, 40) || await resolveDisplayName(actorUsername) || actorUsername;
  const society = findMemberSociety(store, actorUsername);
  if (!society) throw createError('你当前没有加入村社');
  ensureSocietyMemberRole(society, actorUsername, Object.keys(SOCIETY_ROLE_LABELS), '只有成员可以发起提案');

  const title = sanitizeText(payload.title, 40);
  if (title.length < 2) throw createError('提案标题至少 2 个字');

  const proposal = normalizeSocietyProposal({
    id: makeId('society_proposal'),
    title,
    summary: payload.summary,
    kind: payload.kind,
    status: 'open',
    created_by: actorUsername,
    created_by_display_name: actorDisplayName,
    created_at: nowSeconds(),
    updated_at: nowSeconds(),
    closed_at: 0,
    result_choice: 'pending',
    resolution_note: '',
    votes: [],
  });
  society.proposals = [proposal, ...(society.proposals || []).map(normalizeSocietyProposal)].slice(0, 60);
  appendSocietyActivity(society, `${actorDisplayName}发起了提案「${proposal.title}」`, 'proposal');
  updateSocietyInStore(store, society);
  saveSocietyStore(store);
  return {
    proposal: await buildProposalSnapshot(proposal, actorUsername, true, SOCIETY_PROPOSAL_CLOSER_ROLES.includes(getSocietyMember(society, actorUsername)?.role || '')),
    society: await buildSocietySnapshot(society, actorUsername, true, store),
    overview: await buildOverview(store, actorUsername),
  };
}

async function voteSocietyProposal(proposalId, payload = {}, actor = {}) {
  const store = loadSocietyStore();
  const actorUsername = normalizeUsername(actor.username);
  const actorDisplayName = sanitizeText(actor.displayName, 40) || await resolveDisplayName(actorUsername) || actorUsername;
  const choice = normalizeProposalChoiceId(payload.choice);
  const society = findMemberSociety(store, actorUsername);
  if (!society) throw createError('你当前没有加入村社');
  ensureSocietyMemberRole(society, actorUsername, Object.keys(SOCIETY_ROLE_LABELS), '只有成员可以参与投票');

  const proposal = (society.proposals || []).map(normalizeSocietyProposal).find(entry => entry.id === sanitizeText(proposalId, 80));
  if (!proposal) throw createError('提案不存在', 404);
  if (proposal.status !== 'open') throw createError('这条提案已经归档，不能继续投票');

  const existingVote = (proposal.votes || []).map(normalizeSocietyProposalVote).find(entry => entry.username === actorUsername);
  if (existingVote) {
    existingVote.choice = choice;
    existingVote.display_name = actorDisplayName;
    existingVote.voted_at = nowSeconds();
    proposal.votes = (proposal.votes || []).map(entry => {
      const normalized = normalizeSocietyProposalVote(entry);
      return normalized.username === actorUsername ? existingVote : normalized;
    });
  } else {
    proposal.votes = [
      ...(proposal.votes || []).map(normalizeSocietyProposalVote),
      normalizeSocietyProposalVote({
        id: makeId('society_vote'),
        username: actorUsername,
        display_name: actorDisplayName,
        choice,
        voted_at: nowSeconds(),
      }),
    ];
  }
  proposal.updated_at = nowSeconds();
  society.proposals = (society.proposals || []).map(entry => {
    const normalized = normalizeSocietyProposal(entry);
    return normalized.id === proposal.id ? proposal : normalized;
  });
  updateSocietyInStore(store, society);
  saveSocietyStore(store);
  return {
    proposal: await buildProposalSnapshot(proposal, actorUsername, true, SOCIETY_PROPOSAL_CLOSER_ROLES.includes(getSocietyMember(society, actorUsername)?.role || '')),
    overview: await buildOverview(store, actorUsername),
  };
}

async function closeSocietyProposal(proposalId, payload = {}, actor = {}) {
  const store = loadSocietyStore();
  const actorUsername = normalizeUsername(actor.username);
  const actorDisplayName = sanitizeText(actor.displayName, 40) || await resolveDisplayName(actorUsername) || actorUsername;
  const society = findMemberSociety(store, actorUsername);
  if (!society) throw createError('你当前没有加入村社');
  ensureSocietyMemberRole(society, actorUsername, SOCIETY_PROPOSAL_CLOSER_ROLES, '只有社长、管事或记录人可以归档提案');

  const proposal = (society.proposals || []).map(normalizeSocietyProposal).find(entry => entry.id === sanitizeText(proposalId, 80));
  if (!proposal) throw createError('提案不存在', 404);
  if (proposal.status !== 'open') throw createError('这条提案已经归档了');

  proposal.status = 'closed';
  proposal.closed_at = nowSeconds();
  proposal.updated_at = nowSeconds();
  proposal.result_choice = computeProposalResultChoice(proposal);
  proposal.resolution_note = sanitizeText(payload.resolution_note, 120);
  society.proposals = (society.proposals || []).map(entry => {
    const normalized = normalizeSocietyProposal(entry);
    return normalized.id === proposal.id ? proposal : normalized;
  });
  appendSocietyActivity(society, `${actorDisplayName}归档了提案「${proposal.title}」`, 'proposal_close');
  updateSocietyInStore(store, society);
  saveSocietyStore(store);
  return {
    proposal: await buildProposalSnapshot(proposal, actorUsername, true, true),
    society: await buildSocietySnapshot(society, actorUsername, true, store),
    overview: await buildOverview(store, actorUsername),
  };
}

module.exports = {
  listSocietyOverview,
  createSociety,
  applyToSociety,
  inviteToSociety,
  respondSocietyRequest,
  updateSocietyMemberRole,
  updateSocietyNotice,
  createSocietyProposal,
  voteSocietyProposal,
  closeSocietyProposal,
};
