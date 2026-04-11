import type {
  MuseumDisplayRatingBandDef,
  MuseumDisplayRatingState,
  MuseumExhibitSlotDef,
  MuseumExhibitSlotState,
  MuseumHallLevelDef,
  MuseumHallProgress,
  MuseumHallZoneId,
  MuseumItemDef,
  MuseumMilestone,
  MuseumOperationalConfig,
  MuseumSaveData,
  MuseumScholarCommissionDef,
  MuseumScholarCommissionState,
  MuseumShrineThemeDef,
  MuseumShrineThemeState,
  MuseumSustainedOperationAuditConfig,
  MuseumTelemetryState,
  MuseumVisitorFlowBandDef,
  MuseumVisitorFlowState
} from '@/types'

/** 博物馆可捐赠物品全目录 */
export const MUSEUM_ITEMS: MuseumItemDef[] = [
  // ===== 矿石 (7) =====
  { id: 'copper_ore', name: '铜矿', category: 'ore', sourceHint: '矿洞浅层采集' },
  { id: 'iron_ore', name: '铁矿', category: 'ore', sourceHint: '矿洞冰霜层采集' },
  { id: 'gold_ore', name: '金矿', category: 'ore', sourceHint: '矿洞熔岩层采集' },
  { id: 'crystal_ore', name: '水晶矿', category: 'ore', sourceHint: '矿洞水晶层采集' },
  { id: 'shadow_ore', name: '暗影矿', category: 'ore', sourceHint: '矿洞暗影层采集' },
  { id: 'void_ore', name: '虚空矿', category: 'ore', sourceHint: '矿洞深渊层采集' },
  { id: 'iridium_ore', name: '铱矿', category: 'ore', sourceHint: '骷髅矿穴采集' },

  // ===== 宝石 (7) =====
  { id: 'quartz', name: '石英', category: 'gem', sourceHint: '矿洞各层采集' },
  { id: 'jade', name: '翡翠', category: 'gem', sourceHint: '矿洞冰霜层以下' },
  { id: 'ruby', name: '红宝石', category: 'gem', sourceHint: '矿洞熔岩层以下' },
  { id: 'moonstone', name: '月光石', category: 'gem', sourceHint: '矿洞水晶层' },
  { id: 'obsidian', name: '黑曜石', category: 'gem', sourceHint: '矿洞暗影层' },
  { id: 'dragon_jade', name: '龙玉', category: 'gem', sourceHint: '矿洞深渊层' },
  { id: 'prismatic_shard', name: '五彩碎片', category: 'gem', sourceHint: '极其稀有，深层宝箱' },

  // ===== 金属锭 (4) =====
  { id: 'copper_bar', name: '铜锭', category: 'bar', sourceHint: '熔炉冶炼铜矿' },
  { id: 'iron_bar', name: '铁锭', category: 'bar', sourceHint: '熔炉冶炼铁矿' },
  { id: 'gold_bar', name: '金锭', category: 'bar', sourceHint: '熔炉冶炼金矿' },
  { id: 'iridium_bar', name: '铱锭', category: 'bar', sourceHint: '熔炉冶炼铱矿' },

  // ===== 化石 (8) =====
  { id: 'trilobite_fossil', name: '三叶虫化石', category: 'fossil', sourceHint: '矿洞浅层/冰霜层宝箱' },
  { id: 'amber', name: '琥珀', category: 'fossil', sourceHint: '矿洞暗河层掉落' },
  { id: 'ammonite_fossil', name: '菊石化石', category: 'fossil', sourceHint: '矿洞熔岩/水晶层宝箱' },
  { id: 'fern_fossil', name: '蕨叶化石', category: 'fossil', sourceHint: '竹林稀有采集' },
  { id: 'shell_fossil', name: '螺壳化石', category: 'fossil', sourceHint: '矿洞浅层/冰霜层宝箱' },
  { id: 'bone_fragment', name: '骨骸碎片', category: 'fossil', sourceHint: '深层怪物稀有掉落' },
  { id: 'petrified_wood', name: '石化木', category: 'fossil', sourceHint: '竹林稀有采集' },
  { id: 'dragon_tooth', name: '龙牙化石', category: 'fossil', sourceHint: '深渊层宝箱或骨龙掉落' },

  // ===== 古物 (10) =====
  { id: 'ancient_pottery', name: '古陶片', category: 'artifact', sourceHint: '竹林稀有采集' },
  { id: 'jade_disc', name: '玉璧残片', category: 'artifact', sourceHint: '水晶层宝箱' },
  { id: 'bronze_mirror', name: '铜镜', category: 'artifact', sourceHint: '熔岩层宝箱' },
  { id: 'ancient_coin', name: '远古铜钱', category: 'artifact', sourceHint: '矿洞暗河层掉落' },
  { id: 'oracle_bone', name: '甲骨片', category: 'artifact', sourceHint: '暗影层宝箱' },
  { id: 'jade_pendant', name: '玉佩', category: 'artifact', sourceHint: '水晶层掉落' },
  { id: 'ancient_seed', name: '远古种子', category: 'artifact', sourceHint: '深层宝箱极稀有' },
  { id: 'bamboo_scroll', name: '竹简', category: 'artifact', sourceHint: '竹林稀有采集' },
  { id: 'stone_axe_head', name: '石斧头', category: 'artifact', sourceHint: '竹林稀有采集' },
  { id: 'painted_pottery', name: '彩陶碎片', category: 'artifact', sourceHint: '熔岩层宝箱' },

  // ===== 仙灵 (4) =====
  { id: 'fox_bead', name: '狐珠', category: 'spirit', sourceHint: '矿洞深处（与狐仙有关的线索）' },
  { id: 'spirit_peach', name: '灵桃', category: 'spirit', sourceHint: '桃夭赐福的桃树概率产出' },
  { id: 'moon_herb', name: '月草', category: 'spirit', sourceHint: '月兔赐福后采集概率获得' },
  { id: 'dream_silk', name: '梦丝', category: 'spirit', sourceHint: '归女赐福后织布机概率产出' }
]

/** 博物馆分类标签 */
export const MUSEUM_CATEGORIES = [
  { key: 'ore' as const, label: '矿石' },
  { key: 'gem' as const, label: '宝石' },
  { key: 'bar' as const, label: '金属锭' },
  { key: 'fossil' as const, label: '化石' },
  { key: 'artifact' as const, label: '古物' },
  { key: 'spirit' as const, label: '仙灵' }
]

/** 博物馆里程碑奖励 */
export const MUSEUM_MILESTONES: MuseumMilestone[] = [
  { count: 5, name: '初窥门径', reward: { money: 300 } },
  { count: 10, name: '小有收藏', reward: { money: 500, items: [{ itemId: 'ancient_seed', quantity: 1 }] } },
  { count: 15, name: '矿石鉴赏家', reward: { money: 1000 } },
  { count: 20, name: '博古通今', reward: { money: 1500, items: [{ itemId: 'prismatic_shard', quantity: 1 }] } },
  { count: 25, name: '文物守护者', reward: { money: 3000 } },
  { count: 30, name: '远古探秘', reward: { money: 5000, items: [{ itemId: 'iridium_bar', quantity: 3 }] } },
  { count: 36, name: '博物馆之星', reward: { money: 10000 } },
  { count: 40, name: '灵物全鉴', reward: { money: 8000, items: [{ itemId: 'moonstone', quantity: 3 }] } }
]

export const MUSEUM_EXHIBIT_SLOTS: MuseumExhibitSlotDef[] = [
  {
    id: 'entry_feature_wall',
    name: '前厅主题墙',
    hallZoneId: 'entry_gallery',
    unlockExhibitLevel: 0,
    categoryWhitelist: ['bar', 'artifact'],
    ratingWeight: 8,
    trafficWeight: 6,
    contentTier: 'P0',
    summary: '用于前厅形象陈列，是最早解锁的综合展示位。'
  },
  {
    id: 'mineral_core_case',
    name: '矿晶核心柜',
    hallZoneId: 'mineral_hall',
    unlockExhibitLevel: 6,
    categoryWhitelist: ['ore', 'gem'],
    ratingWeight: 10,
    trafficWeight: 8,
    contentTier: 'P0',
    summary: '强化矿石与宝石的成组展示，是首轮专题展核心槽位。'
  },
  {
    id: 'fossil_long_table',
    name: '化石长案',
    hallZoneId: 'fossil_hall',
    unlockExhibitLevel: 10,
    categoryWhitelist: ['fossil'],
    ratingWeight: 9,
    trafficWeight: 7,
    contentTier: 'P1',
    summary: '面向学者来访的长案展示位，强调连续收藏与叙事。'
  },
  {
    id: 'artifact_story_corner',
    name: '古物故事角',
    hallZoneId: 'artifact_hall',
    unlockExhibitLevel: 14,
    categoryWhitelist: ['artifact', 'gem'],
    ratingWeight: 12,
    trafficWeight: 8,
    contentTier: 'P1',
    summary: '适配古物主题展与文化建设联动展示。'
  },
  {
    id: 'spirit_blessing_shrine',
    name: '灵物供奉台',
    hallZoneId: 'shrine_courtyard',
    unlockExhibitLevel: 18,
    categoryWhitelist: ['spirit', 'artifact'],
    ratingWeight: 11,
    trafficWeight: 10,
    contentTier: 'P2',
    summary: '面向祠堂主题轮换的高阶槽位，连接供奉主题与参观收益。'
  }
]

export const MUSEUM_HALL_LEVELS: MuseumHallLevelDef[] = [
  { hallZoneId: 'entry_gallery', level: 1, unlockExhibitLevel: 0, requiredDonatedCount: 0, requiredCategoryCoverage: 0, slotCapacity: 1, visitorFlowBonusRate: 0, displayRatingBonus: 0, unlockSummary: '默认开放前厅。', contentTier: 'P0' },
  { hallZoneId: 'entry_gallery', level: 2, unlockExhibitLevel: 8, requiredDonatedCount: 8, requiredCategoryCoverage: 3, slotCapacity: 1, visitorFlowBonusRate: 0.05, displayRatingBonus: 3, unlockSummary: '前厅导览完善，提升基础参观热度。', contentTier: 'P1' },
  { hallZoneId: 'mineral_hall', level: 1, unlockExhibitLevel: 6, requiredDonatedCount: 6, requiredCategoryCoverage: 2, slotCapacity: 1, visitorFlowBonusRate: 0.08, displayRatingBonus: 4, unlockSummary: '开放矿晶馆区。', contentTier: 'P0' },
  { hallZoneId: 'mineral_hall', level: 2, unlockExhibitLevel: 16, requiredDonatedCount: 16, requiredCategoryCoverage: 4, slotCapacity: 1, visitorFlowBonusRate: 0.12, displayRatingBonus: 6, unlockSummary: '矿晶馆升级，适配高规格专题展。', contentTier: 'P2' },
  { hallZoneId: 'fossil_hall', level: 1, unlockExhibitLevel: 10, requiredDonatedCount: 10, requiredCategoryCoverage: 3, slotCapacity: 1, visitorFlowBonusRate: 0.06, displayRatingBonus: 4, unlockSummary: '开放化石馆区。', contentTier: 'P1' },
  { hallZoneId: 'artifact_hall', level: 1, unlockExhibitLevel: 14, requiredDonatedCount: 14, requiredCategoryCoverage: 4, slotCapacity: 1, visitorFlowBonusRate: 0.07, displayRatingBonus: 5, unlockSummary: '开放古物馆区。', contentTier: 'P1' },
  { hallZoneId: 'spirit_hall', level: 1, unlockExhibitLevel: 20, requiredDonatedCount: 20, requiredCategoryCoverage: 5, slotCapacity: 0, visitorFlowBonusRate: 0.1, displayRatingBonus: 6, unlockSummary: '灵物展区对外开放。', contentTier: 'P2' },
  { hallZoneId: 'shrine_courtyard', level: 1, unlockExhibitLevel: 18, requiredDonatedCount: 18, requiredCategoryCoverage: 4, slotCapacity: 1, visitorFlowBonusRate: 0.1, displayRatingBonus: 5, unlockSummary: '开放祠堂庭院与供奉轮换。', contentTier: 'P2' }
]

export const MUSEUM_SCHOLAR_COMMISSIONS: MuseumScholarCommissionDef[] = [
  {
    id: 'mineral_catalogue_revision',
    title: '矿晶图录校勘',
    hallZoneId: 'mineral_hall',
    difficulty: 'standard',
    unlockExhibitLevel: 8,
    requiredHallLevel: 1,
    preferredCategories: ['ore', 'gem'],
    requiredDonationCount: 8,
    ratingTarget: 20,
    trafficTarget: 30,
    durationDays: 7,
    reward: { money: 1200, reputation: 1 },
    contentTier: 'P0',
    summary: '围绕矿石与宝石陈列校勘图录，为后续学者来访做第一层数据占位。'
  },
  {
    id: 'fossil_restoration_notes',
    title: '化石修复笔记',
    hallZoneId: 'fossil_hall',
    difficulty: 'advanced',
    unlockExhibitLevel: 14,
    requiredHallLevel: 1,
    preferredCategories: ['fossil'],
    requiredDonationCount: 12,
    ratingTarget: 32,
    trafficTarget: 48,
    durationDays: 10,
    reward: { money: 2200, reputation: 2 },
    contentTier: 'P1',
    summary: '强调连续化石布展和修复故事，预留委托持续经营入口。'
  },
  {
    id: 'ancestral_relic_field_report',
    title: '先民遗珍田野报告',
    hallZoneId: 'artifact_hall',
    difficulty: 'prestige',
    unlockExhibitLevel: 22,
    requiredHallLevel: 1,
    preferredCategories: ['artifact', 'spirit'],
    requiredDonationCount: 18,
    ratingTarget: 48,
    trafficTarget: 70,
    durationDays: 14,
    reward: { money: 3600, reputation: 3 },
    contentTier: 'P2',
    summary: '面向终局展示与祠堂主题共振的高阶学者委托。'
  }
]

export const MUSEUM_SHRINE_THEMES: MuseumShrineThemeDef[] = [
  {
    id: 'ancestral_echo',
    name: '先民回响',
    hallZoneId: 'shrine_courtyard',
    rotation: 'weekly',
    unlockExhibitLevel: 18,
    requiredSpiritDonations: 1,
    favoredCategories: ['artifact', 'fossil'],
    ratingBonus: 6,
    trafficBonusRate: 0.08,
    scholarBonusRate: 0.05,
    contentTier: 'P1',
    summary: '偏向古物与化石叙事，强化博物馆的文化厚度。'
  },
  {
    id: 'moon_prayer',
    name: '月华祈献',
    hallZoneId: 'shrine_courtyard',
    rotation: 'seasonal',
    unlockExhibitLevel: 20,
    requiredSpiritDonations: 2,
    favoredCategories: ['gem', 'spirit'],
    ratingBonus: 8,
    trafficBonusRate: 0.12,
    scholarBonusRate: 0.08,
    contentTier: 'P2',
    summary: '聚焦灵物与宝玉主题，为节庆参观高峰预留配置位。'
  },
  {
    id: 'fox_blessing',
    name: '灵狐赐愿',
    hallZoneId: 'shrine_courtyard',
    rotation: 'weekly',
    unlockExhibitLevel: 24,
    requiredSpiritDonations: 3,
    favoredCategories: ['spirit', 'artifact'],
    ratingBonus: 10,
    trafficBonusRate: 0.15,
    scholarBonusRate: 0.1,
    contentTier: 'P2',
    summary: '为高阶供奉线和主题周联动预留的终局增益主题。'
  }
]

export const MUSEUM_VISITOR_FLOW_BANDS: MuseumVisitorFlowBandDef[] = [
  { id: 'quiet', name: '清静', minScore: 0, maxScore: 29, trafficMultiplier: 1, displayRatingBonus: 0, summary: '基础参观流量，以捐赠初期自然访客为主。', contentTier: 'P0' },
  { id: 'steady', name: '稳定', minScore: 30, maxScore: 59, trafficMultiplier: 1.12, displayRatingBonus: 2, summary: '形成固定访客群，适合承接首轮专题展。', contentTier: 'P0' },
  { id: 'crowded', name: '热闹', minScore: 60, maxScore: 99, trafficMultiplier: 1.25, displayRatingBonus: 4, summary: '具备明显口碑传播，可支撑学者与订单联动。', contentTier: 'P1' },
  { id: 'festival', name: '盛会', minScore: 100, trafficMultiplier: 1.45, displayRatingBonus: 6, summary: '用于节庆高峰与终局展示周，保留强运营扩展位。', contentTier: 'P2' }
]

export const MUSEUM_DISPLAY_RATING_BANDS: MuseumDisplayRatingBandDef[] = [
  { id: 'plain', name: '朴素', minScore: 0, maxScore: 19, visitorFlowBonusRate: 0, scholarAttractionRate: 0, summary: '基础陈列，主要承担图鉴与早期展示功能。', contentTier: 'P0' },
  { id: 'noted', name: '有名', minScore: 20, maxScore: 39, visitorFlowBonusRate: 0.06, scholarAttractionRate: 0.04, summary: '开始具备口碑，适合作为学者来访门槛。', contentTier: 'P0' },
  { id: 'renowned', name: '闻名', minScore: 40, maxScore: 64, visitorFlowBonusRate: 0.12, scholarAttractionRate: 0.08, summary: '进入后期经营视野，可明显反哺参观与订单。', contentTier: 'P1' },
  { id: 'masterwork', name: '镇馆', minScore: 65, visitorFlowBonusRate: 0.18, scholarAttractionRate: 0.12, summary: '终局展示位，留给高规格专题展与主题周。', contentTier: 'P2' }
]

export const MUSEUM_OPERATIONAL_CONFIG: MuseumOperationalConfig = {
  saveVersion: 2,
  defaultContentTier: 'P0',
  tierLabels: {
    P0: '基础展陈',
    P1: '专题经营',
    P2: '终局展示'
  },
  tierRoadmap: {
    P0: '先锁定展陈槽位、馆区成长、基础流量与展示评分形状。',
    P1: '补齐学者委托、祠堂主题轮换与专题展扩容。',
    P2: '承接节庆高峰、主题周、终局展示与跨系统增益。'
  },
  futureHooks: [
    { id: 'museum_theme_week_bridge', label: '主题周桥接', description: '为 goals / 主题周接入专题展偏置与推荐目标。', targetTier: 'P1' },
    { id: 'museum_scholar_orders', label: '学者订单池', description: '为 quest / 订单系统开放学者相关专属委托。', targetTier: 'P1' },
    { id: 'museum_festival_showcase', label: '节庆展示结算', description: '为节庆与赛季活动预留展示评分结算入口。', targetTier: 'P2' }
  ],
  baseExhibitSlotCapacity: 1,
  defaultHallLevel: 0,
  defaultVisitorFlow: 12,
  defaultDisplayRating: 0,
  defaultScholarProgress: 0,
  defaultShrineFavor: 0,
  exhibitSlots: MUSEUM_EXHIBIT_SLOTS,
  hallLevels: MUSEUM_HALL_LEVELS,
  scholarCommissions: MUSEUM_SCHOLAR_COMMISSIONS,
  shrineThemes: MUSEUM_SHRINE_THEMES,
  visitorFlowBands: MUSEUM_VISITOR_FLOW_BANDS,
  displayRatingBands: MUSEUM_DISPLAY_RATING_BANDS
}

export const getMuseumVisitorFlowBandByScore = (score: number): MuseumVisitorFlowBandDef => {
  const sorted = [...MUSEUM_VISITOR_FLOW_BANDS].sort((a, b) => a.minScore - b.minScore)
  const fallback = sorted[0]
  if (!fallback) {
    throw new Error('MUSEUM_VISITOR_FLOW_BANDS is empty')
  }
  return sorted.reduce((selected, band) => (score >= band.minScore ? band : selected), fallback)
}

export const getMuseumDisplayRatingBandByScore = (score: number): MuseumDisplayRatingBandDef => {
  const sorted = [...MUSEUM_DISPLAY_RATING_BANDS].sort((a, b) => a.minScore - b.minScore)
  const fallback = sorted[0]
  if (!fallback) {
    throw new Error('MUSEUM_DISPLAY_RATING_BANDS is empty')
  }
  return sorted.reduce((selected, band) => (score >= band.minScore ? band : selected), fallback)
}

const MUSEUM_HALL_ZONE_IDS = [...new Set(MUSEUM_HALL_LEVELS.map(level => level.hallZoneId))] as MuseumHallZoneId[]

const createDefaultHallProgressRecord = (): Record<MuseumHallZoneId, MuseumHallProgress> => {
  const record = {} as Record<MuseumHallZoneId, MuseumHallProgress>
  for (const hallZoneId of MUSEUM_HALL_ZONE_IDS) {
    const baseLevel = MUSEUM_HALL_LEVELS.filter(level => level.hallZoneId === hallZoneId && level.unlockExhibitLevel === 0)
      .sort((a, b) => a.level - b.level)[0]
    record[hallZoneId] = {
      hallZoneId,
      level: baseLevel?.level ?? MUSEUM_OPERATIONAL_CONFIG.defaultHallLevel
    }
  }
  return record
}

const createDefaultExhibitSlotStateRecord = (): Record<string, MuseumExhibitSlotState> => {
  return Object.fromEntries(
    MUSEUM_EXHIBIT_SLOTS.map(slot => [
      slot.id,
      {
        slotId: slot.id,
        unlocked: slot.unlockExhibitLevel <= 0,
        assignedItemIds: [],
        featuredThemeId: null
      }
    ])
  )
}

const createDefaultScholarCommissionStateRecord = (): Record<string, MuseumScholarCommissionState> => {
  return Object.fromEntries(
    MUSEUM_SCHOLAR_COMMISSIONS.map(commission => [
      commission.id,
      {
        id: commission.id,
        progress: 0,
        completed: false,
        rewarded: false,
        expired: false
      }
    ])
  )
}

const createDefaultShrineThemeState = (): MuseumShrineThemeState => ({
  unlockedThemeIds: MUSEUM_SHRINE_THEMES.filter(theme => theme.unlockExhibitLevel <= 0).map(theme => theme.id),
  activeThemeId: null,
  lastRotationDayTag: '',
  activationCounts: Object.fromEntries(MUSEUM_SHRINE_THEMES.map(theme => [theme.id, 0]))
})

const createDefaultVisitorFlowState = (): MuseumVisitorFlowState => {
  const score = MUSEUM_OPERATIONAL_CONFIG.defaultVisitorFlow
  return {
    score,
    bandId: getMuseumVisitorFlowBandByScore(score).id,
    baseVisitors: score,
    bonusVisitors: 0
  }
}

const createDefaultDisplayRatingState = (): MuseumDisplayRatingState => {
  const score = MUSEUM_OPERATIONAL_CONFIG.defaultDisplayRating
  return {
    score,
    bandId: getMuseumDisplayRatingBandByScore(score).id,
    breakdown: []
  }
}

const createDefaultTelemetryState = (): MuseumTelemetryState => ({
  saveVersion: MUSEUM_OPERATIONAL_CONFIG.saveVersion,
  visitorFlow: createDefaultVisitorFlowState(),
  displayRating: createDefaultDisplayRatingState(),
  scholarProgress: MUSEUM_OPERATIONAL_CONFIG.defaultScholarProgress,
  shrineFavor: MUSEUM_OPERATIONAL_CONFIG.defaultShrineFavor
})

export const createDefaultMuseumSaveData = (): MuseumSaveData => ({
  saveVersion: MUSEUM_OPERATIONAL_CONFIG.saveVersion,
  donatedItems: [],
  claimedMilestones: [],
  exhibitSlotStates: createDefaultExhibitSlotStateRecord(),
  hallProgress: createDefaultHallProgressRecord(),
  scholarCommissionStates: createDefaultScholarCommissionStateRecord(),
  shrineThemeState: createDefaultShrineThemeState(),
  telemetry: createDefaultTelemetryState()
})

const normalizeUniqueStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((entry): entry is string => typeof entry === 'string'))]
}

const normalizeUniqueNumberArray = (value: unknown): number[] => {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((entry): entry is number => typeof entry === 'number' && Number.isFinite(entry)))]
}

const normalizeExhibitSlotStates = (raw: any, defaults: MuseumSaveData): Record<string, MuseumExhibitSlotState> => {
  const next = createDefaultExhibitSlotStateRecord()
  const legacyUnlockedIds = new Set(normalizeUniqueStringArray(raw?.unlockedExhibitSlotIds))
  const source = raw?.exhibitSlotStates && typeof raw.exhibitSlotStates === 'object' ? raw.exhibitSlotStates : {}

  for (const slot of MUSEUM_EXHIBIT_SLOTS) {
    const current = source[slot.id]
    next[slot.id] = {
      slotId: slot.id,
      unlocked: typeof current?.unlocked === 'boolean' ? current.unlocked : legacyUnlockedIds.has(slot.id) || defaults.exhibitSlotStates[slot.id]?.unlocked || false,
      assignedItemIds: normalizeUniqueStringArray(current?.assignedItemIds).filter(itemId => MUSEUM_ITEMS.some(item => item.id === itemId)),
      featuredThemeId: typeof current?.featuredThemeId === 'string' ? current.featuredThemeId : null
    }
  }

  return next
}

const normalizeHallProgress = (raw: any): Record<MuseumHallZoneId, MuseumHallProgress> => {
  const next = createDefaultHallProgressRecord()
  const source = raw?.hallProgress && typeof raw.hallProgress === 'object' ? raw.hallProgress : {}

  for (const hallZoneId of MUSEUM_HALL_ZONE_IDS) {
    const current = source[hallZoneId]
    const level = typeof current?.level === 'number' && Number.isFinite(current.level) ? Math.max(0, Math.floor(current.level)) : next[hallZoneId].level
    next[hallZoneId] = {
      hallZoneId,
      level,
      lastUpgradeDayTag: typeof current?.lastUpgradeDayTag === 'string' ? current.lastUpgradeDayTag : undefined
    }
  }

  return next
}

const normalizeScholarCommissionStates = (raw: any): Record<string, MuseumScholarCommissionState> => {
  const next = createDefaultScholarCommissionStateRecord()
  const source = raw?.scholarCommissionStates && typeof raw.scholarCommissionStates === 'object' ? raw.scholarCommissionStates : {}

  for (const commission of MUSEUM_SCHOLAR_COMMISSIONS) {
    const current = source[commission.id]
    next[commission.id] = {
      id: commission.id,
      acceptedDayTag: typeof current?.acceptedDayTag === 'string' ? current.acceptedDayTag : undefined,
      progress: typeof current?.progress === 'number' && Number.isFinite(current.progress) ? Math.max(0, current.progress) : 0,
      completed: Boolean(current?.completed),
      rewarded: Boolean(current?.rewarded),
      expired: Boolean(current?.expired)
    }
  }

  return next
}

const normalizeShrineThemeState = (raw: any): MuseumShrineThemeState => {
  const defaults = createDefaultShrineThemeState()
  const current = raw?.shrineThemeState && typeof raw.shrineThemeState === 'object' ? raw.shrineThemeState : {}
  const unlockedThemeIds = normalizeUniqueStringArray(current.unlockedThemeIds).filter(themeId => MUSEUM_SHRINE_THEMES.some(theme => theme.id === themeId))
  const activeThemeId = typeof current.activeThemeId === 'string' && MUSEUM_SHRINE_THEMES.some(theme => theme.id === current.activeThemeId)
    ? current.activeThemeId
    : null

  return {
    unlockedThemeIds: unlockedThemeIds.length > 0 ? unlockedThemeIds : defaults.unlockedThemeIds,
    activeThemeId,
    lastRotationDayTag: typeof current.lastRotationDayTag === 'string' ? current.lastRotationDayTag : defaults.lastRotationDayTag,
    activationCounts: Object.fromEntries(
      MUSEUM_SHRINE_THEMES.map(theme => {
        const count = current?.activationCounts?.[theme.id]
        return [theme.id, typeof count === 'number' && Number.isFinite(count) ? Math.max(0, Math.floor(count)) : defaults.activationCounts[theme.id] ?? 0]
      })
    )
  }
}

const normalizeVisitorFlowState = (telemetry: any): MuseumVisitorFlowState => {
  const defaults = createDefaultVisitorFlowState()
  const raw = telemetry?.visitorFlow
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const score = Math.max(0, raw)
    return {
      score,
      bandId: getMuseumVisitorFlowBandByScore(score).id,
      baseVisitors: score,
      bonusVisitors: 0
    }
  }

  if (!raw || typeof raw !== 'object') return defaults
  const score = typeof raw.score === 'number' && Number.isFinite(raw.score) ? Math.max(0, raw.score) : defaults.score
  return {
    score,
    bandId: MUSEUM_VISITOR_FLOW_BANDS.some(band => band.id === raw.bandId) ? raw.bandId : getMuseumVisitorFlowBandByScore(score).id,
    baseVisitors: typeof raw.baseVisitors === 'number' && Number.isFinite(raw.baseVisitors) ? Math.max(0, raw.baseVisitors) : defaults.baseVisitors,
    bonusVisitors: typeof raw.bonusVisitors === 'number' && Number.isFinite(raw.bonusVisitors) ? Math.max(0, raw.bonusVisitors) : defaults.bonusVisitors
  }
}

const normalizeDisplayRatingState = (telemetry: any): MuseumDisplayRatingState => {
  const defaults = createDefaultDisplayRatingState()
  const raw = telemetry?.displayRating
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const score = Math.max(0, raw)
    return {
      score,
      bandId: getMuseumDisplayRatingBandByScore(score).id,
      breakdown: []
    }
  }

  if (!raw || typeof raw !== 'object') return defaults
  const score = typeof raw.score === 'number' && Number.isFinite(raw.score) ? Math.max(0, raw.score) : defaults.score
  return {
    score,
    bandId: MUSEUM_DISPLAY_RATING_BANDS.some(band => band.id === raw.bandId) ? raw.bandId : getMuseumDisplayRatingBandByScore(score).id,
    breakdown: Array.isArray(raw.breakdown)
      ? raw.breakdown
          .filter((entry: any): entry is { key: string; label: string; value: number } => typeof entry?.key === 'string' && typeof entry?.label === 'string' && typeof entry?.value === 'number' && Number.isFinite(entry.value))
          .map((entry: { key: string; label: string; value: number }) => ({ key: entry.key, label: entry.label, value: entry.value }))
      : defaults.breakdown
  }
}

export const normalizeMuseumSaveData = (raw: Partial<MuseumSaveData> | Record<string, any> | undefined | null): MuseumSaveData => {
  const defaults = createDefaultMuseumSaveData()
  const donatedItems = normalizeUniqueStringArray(raw?.donatedItems).filter(itemId => MUSEUM_ITEMS.some(item => item.id === itemId))
  const claimedMilestones = normalizeUniqueNumberArray(raw?.claimedMilestones).filter(count => MUSEUM_MILESTONES.some(milestone => milestone.count === count))
  const telemetrySource = raw?.telemetry && typeof raw.telemetry === 'object' ? raw.telemetry : raw

  return {
    saveVersion: MUSEUM_OPERATIONAL_CONFIG.saveVersion,
    donatedItems,
    claimedMilestones,
    exhibitSlotStates: normalizeExhibitSlotStates(raw, defaults),
    hallProgress: normalizeHallProgress(raw),
    scholarCommissionStates: normalizeScholarCommissionStates(raw),
    shrineThemeState: normalizeShrineThemeState(raw),
    telemetry: {
      saveVersion: MUSEUM_OPERATIONAL_CONFIG.saveVersion,
      visitorFlow: normalizeVisitorFlowState(telemetrySource),
      displayRating: normalizeDisplayRatingState(telemetrySource),
      scholarProgress: typeof telemetrySource?.scholarProgress === 'number' && Number.isFinite(telemetrySource.scholarProgress)
        ? Math.max(0, telemetrySource.scholarProgress)
        : defaults.telemetry.scholarProgress,
      shrineFavor: typeof telemetrySource?.shrineFavor === 'number' && Number.isFinite(telemetrySource.shrineFavor)
        ? Math.max(0, telemetrySource.shrineFavor)
        : defaults.telemetry.shrineFavor
    }
  }
}

export const MUSEUM_SUSTAINED_OPERATION_AUDIT_CONFIG: MuseumSustainedOperationAuditConfig = {
  baselineSummary: {
    currentState: [
      '当前博物馆主循环以一次性捐赠与里程碑领奖为主，展陈槽位、馆区等级、学者委托、供奉主题与参观收益尚未形成日常经营反馈。',
      'museumExhibitLevel 目前直接复用累计捐赠数，适合作为首轮成长代理值，但需要为后续专题展与祠堂主题供奉预留独立口径。'
    ],
    targetPlayers: [
      '已完成中期采集 / 挖矿 / 图鉴拓展，希望把收藏转成长期展示收益的非战斗后期玩家。',
      '具备稳定供货能力、愿意围绕专题展和祠堂主题调配资源的经营型玩家。'
    ],
    painPoints: [
      '捐完即结束，缺少“继续回来维护展陈”的理由。',
      '展示反馈弱，玩家难感知博物馆对订单、村庄建设、NPC 关系和目标系统的反向影响。',
      '如果后续只追加材料消耗，会把系统做成第二个纯材料坑。'
    ],
    successSignals: [
      '玩家完成首批捐赠后仍持续参与专题展、祠堂供奉或学者来访相关循环。',
      '博物馆经营能稳定拉动 quest / villageProject / npc / goal 至少两条旧系统。'
    ]
  },
  coreMetrics: [
    {
      id: 'donation_return_rate_14d',
      label: '捐赠后 14 日回流率',
      description: '衡量玩家完成首批捐赠后，是否继续回到博物馆 / 祠堂线进行维护、补展或主题经营。',
      formula: 'activePlayersWithMuseumOpsWithin14Days / max(1, playersWithFirstDonationTriggered)',
      direction: 'higher_is_better',
      dataSources: ['useMuseumStore.donatedItems', 'museumTelemetry.dailySnapshots', 'museumTelemetry.operationLog'],
      thresholds: { watch: 0.45, warning: 0.35, critical: 0.25 },
      anomalyRule: '若样本仍停留在首日首周灰度期，则只展示趋势，不触发失败判定。'
    },
    {
      id: 'special_exhibit_participation_rate',
      label: '专题展参与率',
      description: '衡量已进入展陈经营阶段的玩家中，有多少人参与专题展或祠堂主题供奉。',
      formula: 'playersJoiningExhibitThemeWindow / max(1, eligibleExhibitPlayers)',
      direction: 'higher_is_better',
      dataSources: ['museumTelemetry.dailySnapshots', 'museumTelemetry.operationLog', 'useGoalStore.currentThemeWeek'],
      thresholds: { watch: 0.4, warning: 0.3, critical: 0.2 },
      anomalyRule: '若专题展未开启或供奉主题尚未投放，则使用“待观测”标记并跳过告警。'
    },
    {
      id: 'museum_linked_order_share',
      label: '博物馆带来的订单占比',
      description: '衡量博物馆经营是否真实反哺订单 / 委托系统，而不是停留在收藏面板。',
      formula: 'museumLinkedQuestOrOrderCount / max(1, totalLateGameQuestOrOrderCount)',
      direction: 'higher_is_better',
      dataSources: ['museumTelemetry.dailySnapshots', 'museumTelemetry.linkedSystemSignals', 'useQuestStore'],
      thresholds: { watch: 0.18, warning: 0.12, critical: 0.08 },
      anomalyRule: '若当期总订单样本极低，则按周窗口补样，不用单日结果直接定性。'
    },
    {
      id: 'non_combat_retention_share',
      label: '非战斗后期留存占比',
      description: '衡量博物馆 / 祠堂线是否为后期玩家提供了非战斗持续目标。',
      formula: 'lateGamePlayersUsingMuseumLoopWithoutCombatDominance / max(1, totalLateGameActivePlayers)',
      direction: 'higher_is_better',
      dataSources: ['museumTelemetry.dailySnapshots', 'museumTelemetry.operationLog', 'useGoalStore', 'useNpcStore'],
      thresholds: { watch: 0.28, warning: 0.2, critical: 0.12 },
      anomalyRule: '若玩家同时参与多线经营，则按“主导时间 / 主导次数”归因，避免把复合玩法误记为战斗流失。'
    }
  ],
  guardrailMetrics: [
    {
      id: 'display_feedback_visibility_score',
      label: '展示反馈可见度',
      description: '作为体验护栏，衡量玩家是否能在经营后收到参观、评分、来访或供奉反馈。',
      formula: 'daysWithMuseumFeedbackPrompt / max(1, museumOperationDays)',
      direction: 'lower_is_worse',
      dataSources: ['museumTelemetry.dailySnapshots', 'museumTelemetry.feedbackEvents'],
      thresholds: { watch: 0.75, warning: 0.6, critical: 0.45 },
      anomalyRule: '若功能尚未接入 UI，只允许作为开发护栏，不得用于玩家惩罚。'
    },
    {
      id: 'material_sink_pressure_ratio',
      label: '材料消耗压力比',
      description: '防止博物馆演变成纯材料坑，衡量材料要求是否明显超过展示 / 叙事 / 订单回报。',
      formula: 'museumMaterialSpendValue / max(1, museumShowcaseAndOrderValue)',
      direction: 'higher_is_worse',
      dataSources: ['museumTelemetry.resourceSpend', 'museumTelemetry.dailySnapshots', 'museumTelemetry.linkedSystemSignals'],
      thresholds: { watch: 1.2, warning: 1.5, critical: 1.8 },
      anomalyRule: '若展示收益仍在首轮标定阶段，则以 linked order / feedback 事件代理展示价值，不直接拉高材料成本。'
    }
  ],
  playerSegments: [
    {
      id: 'collection_starter',
      label: '收藏起步玩家',
      description: '刚形成基础捐赠习惯，需要被引导看见专题展和供奉主题价值。',
      donatedCountMin: 5,
      categoryCoverageMin: 2,
      spiritDonationMin: 0,
      recommendedFocus: '优先推荐低门槛专题展与首个祠堂主题，让一次性捐赠转成回访。'
    },
    {
      id: 'curation_builder',
      label: '布展经营玩家',
      description: '已覆盖多类藏品，适合承接学者来访、展示评分与馆区成长。',
      donatedCountMin: 18,
      categoryCoverageMin: 4,
      spiritDonationMin: 1,
      recommendedFocus: '优先投放馆区等级、学者委托与 villageProject 联动需求。'
    },
    {
      id: 'shrine_showcase_master',
      label: '祠堂与展示大师',
      description: '高覆盖高完成玩家，需要跨系统收益与长期荣誉目标来维持热度。',
      donatedCountMin: 32,
      categoryCoverageMin: 6,
      spiritDonationMin: 3,
      recommendedFocus: '优先开放高规格专题展、供奉增益轮换与 NPC / 目标系统联动加成。'
    }
  ],
  rollbackRules: [
    {
      id: 'ws06_feedback_drop_guardrail',
      label: '展示反馈断层时暂停扩量',
      condition: 'display_feedback_visibility_score < 0.45 且 material_sink_pressure_ratio > 1.5',
      fallbackAction: '暂停继续追加专题展成本与材料需求，只保留基线观测、成长展示和叙事反馈补强；回退过高供奉消耗或维护要求。'
    }
  ],
  linkedSystems: [
    {
      key: 'quest',
      label: '委托 / 订单系统',
      relationship: '博物馆专题展与学者来访应反向生成指定藏品、布展材料和展示主题相关订单。',
      primarySignals: ['museumLinkedQuestOrOrderCount', 'scholarVisitOrderCount', 'specialExhibitQuestCompletionRate']
    },
    {
      key: 'villageProject',
      label: '村庄建设系统',
      relationship: '馆区等级与村庄文化建设共享需求，建设完成后应抬升展陈容量、参观热度或主题槽位。',
      primarySignals: ['museumDrivenVillageProjectCount', 'culturalProjectUnlockCount', 'exhibitCapacityGain']
    },
    {
      key: 'npc',
      label: 'NPC / 关系系统',
      relationship: '学者来访、村民参观和祠堂供奉主题应影响 NPC 对话、关系成长或来访频率。',
      primarySignals: ['museumNpcVisitCount', 'scholarAffinityGainEvents', 'shrineThemeFeedbackCount']
    },
    {
      key: 'goal',
      label: '目标 / 主题周系统',
      relationship: '专题展与供奉主题应进入主题周推荐与长期目标，给玩家明确的阶段性经营目标。',
      primarySignals: ['museumThemeWeekGoalCount', 'museumFocusedGoalCompletionRate', 'museumExhibitLevelMilestones']
    }
  ]
}

/** 根据ID查找博物馆物品 */
export const getMuseumItemById = (id: string): MuseumItemDef | undefined => MUSEUM_ITEMS.find(item => item.id === id)

/** 根据ID查找学者委托 */
export const getMuseumScholarCommissionById = (id: string): MuseumScholarCommissionDef | undefined => MUSEUM_SCHOLAR_COMMISSIONS.find(item => item.id === id)

/** 根据ID查找祠堂主题 */
export const getMuseumShrineThemeById = (id: string): MuseumShrineThemeDef | undefined => MUSEUM_SHRINE_THEMES.find(item => item.id === id)
