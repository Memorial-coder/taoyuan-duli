import type { LateGameFeatureFlag, LateGameFeatureOverrideMap, SystemFlagConfig } from '@/types/game'

export const LATE_GAME_FEATURE_FLAGS: SystemFlagConfig[] = [
  {
    id: 'lateGameBudget',
    label: '周预算系统',
    description: '控制商路预算、展馆预算、学舍预算等周投资入口。',
    category: 'economy',
    defaultEnabled: false,
    introducedSaveVersion: 2
  },
  {
    id: 'lateGameMaintenance',
    label: '维护费系统',
    description: '控制高阶项目维护费、服务续费和相关收益开关。',
    category: 'economy',
    defaultEnabled: false,
    introducedSaveVersion: 2
  },
  {
    id: 'lateGameWeeklyGoals',
    label: '周目标系统',
    description: '控制每日 / 季节 / 长期目标之外的周目标层。',
    category: 'weekly',
    defaultEnabled: false,
    introducedSaveVersion: 2
  },
  {
    id: 'lateGameHanhaiContracts',
    label: '瀚海合同',
    description: '控制瀚海终局合同、商路票和相关结算逻辑。',
    category: 'hanhai',
    defaultEnabled: false,
    introducedSaveVersion: 2
  },
  {
    id: 'lateGameFishPondWeeklyContest',
    label: '鱼塘周赛',
    description: '控制鱼塘报名、评分、结算与奖励邮件。',
    category: 'fishPond',
    defaultEnabled: false,
    introducedSaveVersion: 2
  },
  {
    id: 'lateGameMuseumExhibit',
    label: '博物馆专题展',
    description: '控制展区等级、专题展和相关访客 / 周报逻辑。',
    category: 'museum',
    defaultEnabled: false,
    introducedSaveVersion: 2
  },
  {
    id: 'lateGameVillageProsperity',
    label: '村庄繁荣度',
    description: '控制终局繁荣度、综合评分与建设长期线入口。',
    category: 'village',
    defaultEnabled: false,
    introducedSaveVersion: 2
  },
  {
    id: 'lateGameSocialProgression',
    label: '社交长期线',
    description: '控制家庭愿望、配偶分工、孩子成长和仙灵后期任务链。',
    category: 'social',
    defaultEnabled: false,
    introducedSaveVersion: 2
  },
  {
    id: 'lateGameServiceContracts',
    label: '高价服务合同',
    description: '控制商店中的长期订阅、服务合同与高价消费池。',
    category: 'shop',
    defaultEnabled: false,
    introducedSaveVersion: 2
  },
  {
    id: 'lateGameRegionMap',
    label: '行旅图区域层',
    description: '控制行旅图入口、区域路线与区域周状态骨架。',
    category: 'region',
    defaultEnabled: false,
    introducedSaveVersion: 4
  },
  {
    id: 'lateGameExpeditionBoss',
    label: '远征首领战层',
    description: '控制独立于矿洞普通战斗的远征首领与阶段化挑战入口。',
    category: 'region',
    defaultEnabled: false,
    introducedSaveVersion: 4
  },
  {
    id: 'lateGameRegionalResources',
    label: '区域资源家族',
    description: '控制行旅图区域资源家族、区域资源台账与后续跨系统承接字段。',
    category: 'region',
    defaultEnabled: false,
    introducedSaveVersion: 4
  }
]

export const LATE_GAME_FEATURE_FLAG_CONFIG_MAP: Record<LateGameFeatureFlag, SystemFlagConfig> =
  LATE_GAME_FEATURE_FLAGS.reduce((acc, config) => {
    acc[config.id] = config
    return acc
  }, {} as Record<LateGameFeatureFlag, SystemFlagConfig>)

export const createLateGameFeatureFlagState = (
  saveVersion: number,
  overrides: LateGameFeatureOverrideMap = {}
): Record<LateGameFeatureFlag, boolean> => {
  const normalizedSaveVersion = Number.isFinite(saveVersion) ? saveVersion : Number.MAX_SAFE_INTEGER

  return LATE_GAME_FEATURE_FLAGS.reduce((acc, config) => {
    const baseEnabled = normalizedSaveVersion >= (config.introducedSaveVersion ?? 0) ? config.defaultEnabled : false
    acc[config.id] = overrides[config.id] ?? baseEnabled
    return acc
  }, {} as Record<LateGameFeatureFlag, boolean>)
}

export const normalizeLateGameFeatureOverrides = (
  value: unknown,
  saveVersion: number
): LateGameFeatureOverrideMap => {
  if (!value || typeof value !== 'object') return {}

  const defaults = createLateGameFeatureFlagState(saveVersion)
  const next: LateGameFeatureOverrideMap = {}

  for (const flag of LATE_GAME_FEATURE_FLAGS) {
    const raw = (value as Record<string, unknown>)[flag.id]
    if (typeof raw !== 'boolean') continue
    if (raw !== defaults[flag.id]) {
      next[flag.id] = raw
    }
  }

  return next
}
