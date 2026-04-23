export type BuiltInSampleTier = 'flagship' | 'regression'
export type BuiltInSampleRouteName =
  | 'farm'
  | 'village'
  | 'village-projects'
  | 'shop'
  | 'forage'
  | 'fishing'
  | 'mining'
  | 'cooking'
  | 'workshop'
  | 'upgrade'
  | 'inventory'
  | 'skills'
  | 'achievement'
  | 'glossary'
  | 'wallet'
  | 'quest'
  | 'mail'
  | 'charinfo'
  | 'breeding'
  | 'museum'
  | 'guild'
  | 'hanhai'
  | 'fishpond'
  | 'decoration'
export type BuiltInSampleBoundaryAction =
  | 'none'
  | 'week_rollover'
  | 'breeding_settlement'
  | 'fishpond_rollover'
  | 'theme_week_refresh'

type GoalMetricKey =
  | 'totalMoneyEarned'
  | 'totalCropsHarvested'
  | 'totalFishCaught'
  | 'totalRecipesCooked'
  | 'highestMineFloor'
  | 'friendlyNpcCount'
  | 'farmhouseLevel'
  | 'completedBundles'
  | 'discoveredCount'
  | 'crabPotCount'
  | 'childCount'
  | 'caveUnlocked'
  | 'villageProjectLevel'
  | 'hanhaiContractCompletions'
  | 'museumExhibitLevel'
  | 'familyWishCompletions'
type GoalSource = 'random' | 'season' | 'weekly' | 'archetype_bias'
type SampleSeason = 'spring' | 'summer' | 'autumn' | 'winter'
type SampleLocationGroup = 'farm' | 'village_area' | 'nature' | 'mine' | 'hanhai'
type SampleLocation = 'farm' | 'village' | 'shop' | 'bamboo_forest' | 'creek' | 'mine' | 'home'
type RewardTicketType = 'construction' | 'exhibit' | 'caravan' | 'research' | 'guildLogistics' | 'familyFavor'

export interface BuiltInSampleSmokeCheckDef {
  id: string
  label: string
}

export interface BuiltInSampleRuntimeExpectations {
  player: {
    minMoney: number
    requireEconomyTelemetry?: boolean
  }
  game: {
    currentLocation: SampleLocation
    currentLocationGroup: SampleLocationGroup
  }
  goal?: {
    minDailyGoals?: number
    minSeasonGoals?: number
    minWeeklyGoals?: number
    minLongTermGoals?: number
    minWeeklySnapshots?: number
    requireThemeWeek?: boolean
  }
  breeding?: {
    unlocked?: boolean
    minBreedingBox?: number
    minCompendiumEntries?: number
    minRegisteredSeeds?: number
  }
  fishPond?: {
    built?: boolean
    minFish?: number
    minPendingProducts?: number
    minRegisteredFish?: number
  }
  villageProject?: {
    minCompletedProjects?: number
  }
  museum?: {
    minDonatedItems?: number
  }
  hanhai?: {
    unlocked?: boolean
    minRelicRecords?: number
  }
  wallet?: {
    minTicketTypes?: number
  }
  boundaryAction?: BuiltInSampleBoundaryAction
}

export interface BuiltInSampleSaveDef {
  id: string
  label: string
  description: string
  tags: string[]
  tier: BuiltInSampleTier
  recommendedRouteName: BuiltInSampleRouteName
  focusAreas: string[]
  smokeChecks: BuiltInSampleSmokeCheckDef[]
  runtimeExpectations: BuiltInSampleRuntimeExpectations
  envelope: Record<string, any>
}

const SAVE_VERSION = 4
const DAYS_PER_WEEK = 7
const DAYS_PER_SEASON = 28
const SEASON_ORDER: SampleSeason[] = ['spring', 'summer', 'autumn', 'winter']
const BREEDING_CONTEST_IDS = ['breeding_banquet_showcase', 'breeding_stable_batch', 'breeding_archive_show'] as const
const FISHPOND_CONTEST_IDS = ['pond_showcase_show', 'pond_food_grade', 'pond_rare_breed'] as const

const createPlots = (size: number) =>
  Array.from({ length: size * size }, (_, id) => ({
    id,
    state: 'wasteland',
    cropId: null,
    growthDays: 0,
    watered: false,
    unwateredDays: 0,
    fertilizer: null,
    harvestCount: 0,
    giantCropGroup: null,
    seedGenetics: null,
    infested: false,
    infestedDays: 0,
    weedy: false,
    weedyDays: 0
  }))

const createTools = () => [
  { type: 'wateringCan', tier: 'basic' },
  { type: 'hoe', tier: 'basic' },
  { type: 'pickaxe', tier: 'basic' },
  { type: 'fishingRod', tier: 'basic' },
  { type: 'scythe', tier: 'basic' },
  { type: 'axe', tier: 'basic' },
  { type: 'pan', tier: 'basic' }
]

const createSampleFishGenetics = (
  weight: number,
  growthRate: number,
  diseaseRes: number,
  qualityGene: number,
  mutationRate: number
) => ({
  weight,
  growthRate,
  diseaseRes,
  qualityGene,
  mutationRate
})

const getSeasonIndex = (season: SampleSeason) => SEASON_ORDER.indexOf(season)
const getWeekOfSeason = (day: number) => (Math.floor((Math.max(1, Math.min(DAYS_PER_SEASON, day)) - 1) / DAYS_PER_WEEK) + 1) as 1 | 2 | 3 | 4
const getSeasonWeekId = (year: number, season: SampleSeason, day: number) => `${year}-${season}-week-${getWeekOfSeason(day)}`
const getAbsoluteWeek = (year: number, season: SampleSeason, day: number) =>
  Math.floor((((year - 1) * 112) + getSeasonIndex(season) * DAYS_PER_SEASON + day - 1) / DAYS_PER_WEEK)
const getDayTag = (year: number, season: SampleSeason, day: number) => `${year}-${season}-${day}`
const resolveBreedingContestId = (year: number, season: SampleSeason, day: number) =>
  BREEDING_CONTEST_IDS[Math.abs(getAbsoluteWeek(year, season, day)) % BREEDING_CONTEST_IDS.length]
const resolveFishPondContestId = (year: number, season: SampleSeason, day: number) =>
  FISHPOND_CONTEST_IDS[Math.abs(getAbsoluteWeek(year, season, day)) % FISHPOND_CONTEST_IDS.length]

const createEconomyTelemetry = (
  currentSegmentId: string,
  recentSnapshots: Array<Record<string, any>>,
  incomeTotal: number,
  expenseTotal: number,
  sinkTotal: number
) => ({
  saveVersion: 1,
  lastAuditDayTag: recentSnapshots[recentSnapshots.length - 1]?.dayTag ?? '',
  currentSegmentId,
  recentSnapshots,
  lifetimeIncome: {
    total: incomeTotal,
    bySystem: {
      shop: Math.round(incomeTotal * 0.45),
      quest: Math.round(incomeTotal * 0.2),
      market: Math.round(incomeTotal * 0.25),
      goal: Math.round(incomeTotal * 0.1)
    }
  },
  lifetimeExpense: {
    total: expenseTotal,
    bySystem: {
      shop: Math.round(expenseTotal * 0.35),
      villageProject: Math.round(expenseTotal * 0.25),
      system: Math.round(expenseTotal * 0.2),
      market: Math.round(expenseTotal * 0.2)
    }
  },
  lifetimeSinkSpend: {
    total: sinkTotal,
    byCategory: {
      luxuryCatalog: Math.round(sinkTotal * 0.4),
      maintenance: Math.round(sinkTotal * 0.35),
      service: Math.round(sinkTotal * 0.25)
    }
  },
  latestRiskReport: null
})

const createThemeWeekState = (id: string, year: number, season: SampleSeason, day: number) => {
  const weekOfSeason = getWeekOfSeason(day)
  const startDay = (weekOfSeason - 1) * DAYS_PER_WEEK + 1
  return {
    id,
    weekOfSeason,
    seasonWeekId: `${year}-${season}-week-${weekOfSeason}`,
    startDay,
    endDay: startDay + DAYS_PER_WEEK - 1
  }
}

const createGoalState = (options: {
  id: string
  title: string
  description: string
  metric: GoalMetricKey
  targetValue: number
  reward?: Record<string, any>
  baselineValue?: number
  completed?: boolean
  rewarded?: boolean
  source?: GoalSource
}) => ({
  id: options.id,
  title: options.title,
  description: options.description,
  metric: options.metric,
  targetValue: options.targetValue,
  reward: options.reward ?? {},
  baselineValue: options.baselineValue ?? 0,
  completed: options.completed ?? false,
  rewarded: options.rewarded ?? false,
  source: options.source ?? 'random'
})

const createWeeklyGoalState = (options: {
  id: string
  title: string
  description: string
  metric: GoalMetricKey
  targetValue: number
  reward?: Record<string, any>
  baselineValue?: number
  season: SampleSeason
  day: number
  year: number
  linkedThemeWeekId?: string
}) => ({
  ...createGoalState({
    id: options.id,
    title: options.title,
    description: options.description,
    metric: options.metric,
    targetValue: options.targetValue,
    reward: options.reward,
    baselineValue: options.baselineValue,
    source: 'weekly'
  }),
  season: options.season,
  weekOfSeason: getWeekOfSeason(options.day),
  weekId: getSeasonWeekId(options.year, options.season, options.day),
  linkedThemeWeekId: options.linkedThemeWeekId
})

const createWeeklyMetricSnapshot = (options: {
  year: number
  season: SampleSeason
  weekOfSeason: 1 | 2 | 3 | 4
  totalIncome: number
  totalExpense: number
  sinkSpend: number
  hanhaiContractCompletions?: number
  fishPondContestScore?: number
  museumExhibitLevel?: number
  socialParticipationScore?: number
  villageProsperityScore?: number
  activeThemeWeekId?: string
}) => {
  const weekStartDay = (options.weekOfSeason - 1) * DAYS_PER_WEEK + 1
  const absoluteWeek = getAbsoluteWeek(options.year, options.season, weekStartDay)
  return {
    weekId: `${options.year}-${options.season}-week-${options.weekOfSeason}`,
    absoluteWeek,
    year: options.year,
    season: options.season,
    weekOfSeason: options.weekOfSeason,
    generatedAtDayTag: getDayTag(options.year, options.season, weekStartDay + DAYS_PER_WEEK - 1),
    periodStartDayTag: getDayTag(options.year, options.season, weekStartDay),
    periodEndDayTag: getDayTag(options.year, options.season, weekStartDay + DAYS_PER_WEEK - 1),
    totalIncome: options.totalIncome,
    totalExpense: options.totalExpense,
    netIncome: options.totalIncome - options.totalExpense,
    sinkSpend: options.sinkSpend,
    ticketBalances: {},
    budgetInvestments: {},
    maintenanceCost: 0,
    serviceContractCount: 0,
    hanhaiContractCompletions: options.hanhaiContractCompletions ?? 0,
    fishPondContestScore: options.fishPondContestScore ?? 0,
    museumExhibitLevel: options.museumExhibitLevel ?? 0,
    socialParticipationScore: options.socialParticipationScore ?? 0,
    villageProsperityScore: options.villageProsperityScore ?? 0,
    sourceSnapshotCount: 7,
    activeThemeWeekId: options.activeThemeWeekId
  }
}

const createWalletState = (rewardTickets: Partial<Record<RewardTicketType, number>>) => ({
  unlockedItems: [],
  currentArchetypeId: null,
  unlockedNodeIds: [],
  rewardTickets
})

const createLateGameSettingsState = (overrides: Record<string, boolean> = {}) => ({
  lateGameFeatureOverrides: {
    lateGameBudget: true,
    lateGameMaintenance: true,
    lateGameWeeklyGoals: true,
    lateGameHanhaiContracts: true,
    lateGameFishPondWeeklyContest: true,
    lateGameMuseumExhibit: true,
    lateGameVillageProsperity: true,
    lateGameSocialProgression: true,
    lateGameServiceContracts: true,
    ...overrides
  },
  lateGameBalanceOverrides: {}
})

const createBaseEnvelope = (options: {
  playerName: string
  gender?: 'male' | 'female'
  money: number
  year: number
  season: SampleSeason
  day: number
  hour?: number
  currentLocation?: SampleLocation
  currentLocationGroup?: SampleLocationGroup
  farmMapType?: 'standard' | 'riverland' | 'forest' | 'hilltop' | 'wilderness'
  inventoryItems?: Array<{ itemId: string; quantity: number; quality?: 'normal' | 'fine' | 'excellent' | 'supreme' }>
  extraData?: Record<string, any>
}) => {
  const size = 4
  return {
    meta: {
      saveVersion: SAVE_VERSION,
      savedAt: '2026-04-20T12:00:00.000Z'
    },
    data: {
      game: {
        year: options.year,
        season: options.season,
        day: options.day,
        hour: options.hour ?? 8,
        weather: 'sunny',
        tomorrowWeather: 'sunny',
        currentLocation: options.currentLocation ?? 'farm',
        currentLocationGroup: options.currentLocationGroup ?? 'farm',
        farmMapType: options.farmMapType ?? 'standard',
        dailyLuck: 0.02,
        surfaceOrePatch: null,
        creekCatch: []
      },
      player: {
        playerName: options.playerName,
        gender: options.gender ?? 'male',
        money: options.money,
        stamina: 220,
        maxStamina: 220,
        staminaCapLevel: 2,
        bonusMaxStamina: 20,
        hp: 120,
        baseMaxHp: 120,
        economyTelemetry: createEconomyTelemetry('mid_transition', [], 0, 0, 0)
      },
      inventory: {
        items: (options.inventoryItems ?? []).map(item => ({
          itemId: item.itemId,
          quantity: item.quantity,
          quality: item.quality ?? 'normal'
        })),
        capacity: 48,
        tempItems: [],
        tools: createTools(),
        ownedWeapons: [{ defId: 'wooden_stick', enchantmentId: null }],
        equippedWeaponIndex: 0,
        pendingUpgrade: null,
        ownedRings: [],
        equippedRingSlot1: -1,
        equippedRingSlot2: -1,
        ownedHats: [],
        equippedHatIndex: -1,
        ownedShoes: [],
        equippedShoeIndex: -1,
        equipmentPresets: [],
        activePresetId: null
      },
      settings: createLateGameSettingsState(),
      farm: {
        farmSize: size,
        plots: createPlots(size),
        sprinklers: [],
        fruitTrees: [],
        greenhousePlots: [],
        greenhouseLevel: 0,
        wildTrees: [],
        nextFruitTreeId: 0,
        nextWildTreeId: 0,
        lightningRods: 0,
        scarecrows: 0,
        giantCropCounter: 0
      },
      ...(options.extraData ?? {})
    }
  }
}

const economySnapshotsLate = [
  { dayTag: '2-autumn-22', disposableMoney: 72000, totalIncome: 9800, totalExpense: 4100, sinkSpend: 2300, dominantIncomeSystem: 'shop', participatingSystems: ['shop', 'market', 'quest'], highValueOrderTypes: 2, incomeBySystem: { shop: 5200, market: 2600, quest: 2000 }, expenseBySystem: { shop: 1800, system: 900, villageProject: 1400 }, activeSinkCategories: ['luxuryCatalog', 'service'] },
  { dayTag: '2-autumn-23', disposableMoney: 75800, totalIncome: 8400, totalExpense: 3600, sinkSpend: 1800, dominantIncomeSystem: 'market', participatingSystems: ['market', 'goal', 'quest'], highValueOrderTypes: 2, incomeBySystem: { market: 4200, shop: 1900, quest: 2300 }, expenseBySystem: { shop: 1200, market: 800, system: 1600 }, activeSinkCategories: ['maintenance'] },
  { dayTag: '2-autumn-24', disposableMoney: 79600, totalIncome: 9100, totalExpense: 4400, sinkSpend: 2400, dominantIncomeSystem: 'shop', participatingSystems: ['shop', 'goal', 'market'], highValueOrderTypes: 3, incomeBySystem: { shop: 4700, market: 2100, goal: 2300 }, expenseBySystem: { shop: 2100, villageProject: 1200, system: 1100 }, activeSinkCategories: ['luxuryCatalog', 'maintenance'] },
  { dayTag: '2-autumn-25', disposableMoney: 83500, totalIncome: 10200, totalExpense: 3900, sinkSpend: 1900, dominantIncomeSystem: 'shop', participatingSystems: ['shop', 'market', 'goal', 'quest'], highValueOrderTypes: 3, incomeBySystem: { shop: 5600, market: 1900, goal: 1100, quest: 1600 }, expenseBySystem: { shop: 1700, system: 900, villageProject: 1300 }, activeSinkCategories: ['service', 'maintenance'] }
]

const createLateEconomyEnvelope = () => {
  const year = 2
  const season: SampleSeason = 'autumn'
  const day = 26
  const weekId = getSeasonWeekId(year, season, day)
  const themeWeekId = 'late_sink_rotation'
  return createBaseEnvelope({
    playerName: '富春',
    money: 86500,
    year,
    season,
    day,
    hour: 9,
    currentLocation: 'village',
    currentLocationGroup: 'village_area',
    farmMapType: 'standard',
    inventoryItems: [
      { itemId: 'wood', quantity: 180 },
      { itemId: 'charcoal', quantity: 60 },
      { itemId: 'gold_ore', quantity: 25 },
      { itemId: 'gold_bar', quantity: 10 },
      { itemId: 'bamboo', quantity: 40 },
      { itemId: 'food_rice_ball', quantity: 8 }
    ],
    extraData: {
      player: {
        playerName: '富春',
        gender: 'male',
        money: 86500,
        stamina: 220,
        maxStamina: 220,
        staminaCapLevel: 2,
        bonusMaxStamina: 20,
        hp: 120,
        baseMaxHp: 120,
        economyTelemetry: createEconomyTelemetry('late_builder', economySnapshotsLate, 149500, 58600, 34200)
      },
      goal: {
        mainQuestStage: 5,
        mainQuestStages: [],
        dailyGoals: [
          createGoalState({
            id: 'daily_autumn_income_sample',
            title: '今日结账',
            description: '今日赚到 1500 文。',
            metric: 'totalMoneyEarned',
            targetValue: 1500,
            reward: { money: 300, reputation: 4 },
            baselineValue: 148000
          })
        ],
        seasonGoals: [
          createGoalState({
            id: 'season_autumn_income_sample',
            title: '秋账丰盈',
            description: '本季赚到 9000 文。',
            metric: 'totalMoneyEarned',
            targetValue: 9000,
            reward: { money: 1500, reputation: 18, items: [{ itemId: 'bamboo', quantity: 5 }] },
            baselineValue: 141000,
            source: 'season'
          })
        ],
        weeklyGoals: [
          createWeeklyGoalState({
            id: 'weekly_autumn_capital_turn_sample',
            title: '本周账本轮转',
            description: '本周累计赚到 12000 文。',
            metric: 'totalMoneyEarned',
            targetValue: 12000,
            reward: { money: 1200, reputation: 18 },
            baselineValue: 137500,
            season,
            day,
            year,
            linkedThemeWeekId: themeWeekId
          }),
          createWeeklyGoalState({
            id: 'weekly_autumn_village_sample',
            title: '本周村庄赞助',
            description: '本周将村庄建设推进到更稳定的阶段。',
            metric: 'villageProjectLevel',
            targetValue: 1,
            reward: { money: 800, reputation: 14 },
            baselineValue: 2,
            season,
            day,
            year,
            linkedThemeWeekId: themeWeekId
          })
        ],
        longTermGoals: [
          createGoalState({
            id: 'long_sink_showcase_sample',
            title: '终局赞助者',
            description: '累计赚到 120000 文，为终局展示与瀚海赞助预留预算。',
            metric: 'totalMoneyEarned',
            targetValue: 120000,
            reward: { money: 10000, reputation: 135 },
            baselineValue: 118000
          })
        ],
        goalReputation: 520,
        lastDailyGoalRefresh: getDayTag(year, season, day),
        lastSeasonGoalRefresh: `${year}-${season}`,
        lastWeeklyGoalRefresh: weekId,
        lastThemeWeekRefresh: weekId,
        currentThemeWeekState: createThemeWeekState(themeWeekId, year, season, day),
        weeklyMetricArchive: {
          version: 1,
          lastGeneratedWeekId: `${year}-${season}-week-3`,
          snapshots: [
            createWeeklyMetricSnapshot({
              year,
              season,
              weekOfSeason: 3,
              totalIncome: 56600,
              totalExpense: 24100,
              sinkSpend: 13100,
              hanhaiContractCompletions: 6,
              museumExhibitLevel: 12,
              socialParticipationScore: 7,
              villageProsperityScore: 29,
              activeThemeWeekId: 'autumn_processing'
            })
          ]
        }
      },
      wallet: createWalletState({
        construction: 2,
        exhibit: 1,
        caravan: 1
      }),
      villageProject: {
        projectStates: {
          caravan_station: { completed: true, completedDayTag: '2-summer-12' },
          village_school: { completed: true, completedDayTag: '2-summer-20' },
          hot_spring: { completed: true, completedDayTag: '2-autumn-6' },
          caravan_station_ii: { completed: true, completedDayTag: '2-autumn-20' }
        }
      },
      museum: {
        donatedItems: ['gold_ore', 'jade', 'quartz', 'emerald', 'ruby', 'sapphire', 'amethyst', 'opal', 'fossil_shell', 'old_coin', 'ancient_tablet', 'spirit_feather'],
        claimedMilestones: [5, 10]
      },
      hanhai: {
        unlocked: true,
        casinoBetsToday: 0,
        weeklyPurchases: {},
        relicRecords: {
          dune_watch: { siteId: 'dune_watch', clears: 3, claimedMilestone: true },
          mirage_ruin: { siteId: 'mirage_ruin', clears: 3, claimedMilestone: false }
        }
      }
    }
  })
}

const createBreedingSpecialistEnvelope = () => {
  const year = 2
  const season: SampleSeason = 'summer'
  const day = 14
  const weekId = getSeasonWeekId(year, season, day)
  const themeWeekId = 'summer_fishing'
  return createBaseEnvelope({
    playerName: '青穗',
    gender: 'female',
    money: 36200,
    year,
    season,
    day,
    hour: 10,
    currentLocation: 'farm',
    currentLocationGroup: 'farm',
    farmMapType: 'forest',
    inventoryItems: [
      { itemId: 'wood', quantity: 90 },
      { itemId: 'charcoal', quantity: 20 },
      { itemId: 'herb', quantity: 18 },
      { itemId: 'food_rice_ball', quantity: 6 }
    ],
    extraData: {
      player: {
        playerName: '青穗',
        gender: 'female',
        money: 36200,
        stamina: 220,
        maxStamina: 220,
        staminaCapLevel: 2,
        bonusMaxStamina: 20,
        hp: 120,
        baseMaxHp: 120,
        economyTelemetry: createEconomyTelemetry(
          'collection_breeder',
          [
            { dayTag: '2-summer-11', disposableMoney: 32800, totalIncome: 4200, totalExpense: 1800, sinkSpend: 700, dominantIncomeSystem: 'quest', participatingSystems: ['quest', 'market'], highValueOrderTypes: 1, incomeBySystem: { quest: 2200, market: 2000 }, expenseBySystem: { system: 900, shop: 900 }, activeSinkCategories: ['service'] },
            { dayTag: '2-summer-12', disposableMoney: 34100, totalIncome: 3600, totalExpense: 1300, sinkSpend: 500, dominantIncomeSystem: 'market', participatingSystems: ['market', 'quest'], highValueOrderTypes: 1, incomeBySystem: { market: 2100, quest: 1500 }, expenseBySystem: { system: 600, shop: 700 }, activeSinkCategories: ['service'] },
            { dayTag: '2-summer-13', disposableMoney: 35200, totalIncome: 4100, totalExpense: 1500, sinkSpend: 650, dominantIncomeSystem: 'quest', participatingSystems: ['quest', 'goal'], highValueOrderTypes: 1, incomeBySystem: { quest: 2600, goal: 1500 }, expenseBySystem: { shop: 900, system: 600 }, activeSinkCategories: ['maintenance'] }
          ],
          82000,
          29400,
          12800
        )
      },
      goal: {
        mainQuestStage: 4,
        mainQuestStages: [],
        dailyGoals: [
          createGoalState({
            id: 'daily_summer_income_sample',
            title: '今日大卖',
            description: '今日赚到 1200 文。',
            metric: 'totalMoneyEarned',
            targetValue: 1200,
            reward: { money: 260, reputation: 3 },
            baselineValue: 80400
          })
        ],
        seasonGoals: [
          createGoalState({
            id: 'season_summer_income_sample',
            title: '暑月进账',
            description: '本季赚到 6000 文。',
            metric: 'totalMoneyEarned',
            targetValue: 6000,
            reward: { money: 1200, reputation: 15 },
            baselineValue: 76300,
            source: 'season'
          })
        ],
        weeklyGoals: [
          createWeeklyGoalState({
            id: 'weekly_summer_breeding_cash_sample',
            title: '本周育种回款',
            description: '本周靠育种与订单累计赚到 7000 文。',
            metric: 'totalMoneyEarned',
            targetValue: 7000,
            reward: { money: 900, reputation: 12 },
            baselineValue: 78100,
            season,
            day,
            year,
            linkedThemeWeekId: themeWeekId
          })
        ],
        longTermGoals: [
          createGoalState({
            id: 'long_collect_breeding_sample',
            title: '见闻渐丰',
            description: '累计发现 30 种物品与高代杂交样本。',
            metric: 'discoveredCount',
            targetValue: 30,
            reward: { money: 1800, reputation: 35 },
            baselineValue: 24
          })
        ],
        goalReputation: 210,
        lastDailyGoalRefresh: getDayTag(year, season, day),
        lastSeasonGoalRefresh: `${year}-${season}`,
        lastWeeklyGoalRefresh: weekId,
        lastThemeWeekRefresh: weekId,
        currentThemeWeekState: createThemeWeekState(themeWeekId, year, season, day),
        weeklyMetricArchive: {
          version: 1,
          lastGeneratedWeekId: weekId,
          snapshots: [
            createWeeklyMetricSnapshot({
              year,
              season,
              weekOfSeason: getWeekOfSeason(day),
              totalIncome: 18200,
              totalExpense: 9100,
              sinkSpend: 3200,
              museumExhibitLevel: 4,
              socialParticipationScore: 3,
              villageProsperityScore: 7,
              activeThemeWeekId: themeWeekId
            })
          ]
        }
      },
      wallet: createWalletState({
        research: 2,
        construction: 1
      }),
      breeding: {
        unlocked: true,
        seedBoxLevel: 1,
        stationCount: 2,
        researchLevel: 2,
        favoriteSeedIds: ['seed_jade_tea_g10'],
        breedingBox: [
          { label: '月光稻 G8', genetics: { id: 'seed_moonlight_rice_g8', cropId: 'moonlight_rice', generation: 8, sweetness: 46, yield: 42, resistance: 35, stability: 72, mutationRate: 12, parentA: null, parentB: null, isHybrid: true, hybridId: 'moonlight_rice', lineageParents: [] } },
          { label: '金蜜瓜 G9', genetics: { id: 'seed_golden_melon_g9', cropId: 'golden_melon', generation: 9, sweetness: 49, yield: 41, resistance: 30, stability: 74, mutationRate: 10, parentA: null, parentB: null, isHybrid: true, hybridId: 'golden_melon', lineageParents: [] } },
          { label: '翡翠茶 G10', genetics: { id: 'seed_jade_tea_g10', cropId: 'jade_tea', generation: 10, sweetness: 55, yield: 36, resistance: 34, stability: 78, mutationRate: 8, parentA: null, parentB: null, isHybrid: true, hybridId: 'jade_tea', lineageParents: [] } }
        ],
        stations: [
          { parentA: null, parentB: null, daysProcessed: 0, totalDays: 0, result: null, ready: false },
          { parentA: null, parentB: null, daysProcessed: 0, totalDays: 0, result: null, ready: false }
        ],
        compendium: [
          { hybridId: 'moonlight_rice', discoveredYear: 2, bestTotalStats: 123, bestSweetness: 46, bestYield: 42, bestResistance: 35, bestGeneration: 8, lineageCropIds: ['moonlight_rice'], timesGrown: 3 },
          { hybridId: 'golden_melon', discoveredYear: 2, bestTotalStats: 120, bestSweetness: 49, bestYield: 41, bestResistance: 30, bestGeneration: 9, lineageCropIds: ['golden_melon'], timesGrown: 2 },
          { hybridId: 'jade_tea', discoveredYear: 2, bestTotalStats: 125, bestSweetness: 55, bestYield: 36, bestResistance: 34, bestGeneration: 10, lineageCropIds: ['jade_tea'], timesGrown: 4 }
        ],
        breedingContestState: {
          weekId,
          contestId: resolveBreedingContestId(year, season, day),
          registeredSeedIds: ['seed_moonlight_rice_g8', 'seed_jade_tea_g10'],
          settled: false,
          lastSettlementDayTag: ''
        },
        lastBreedingContestSettlement: null
      }
    }
  })
}

const createFishpondOperatorEnvelope = () => {
  const year = 2
  const season: SampleSeason = 'summer'
  const day = 26
  const weekId = getSeasonWeekId(year, season, day)
  const themeWeekId = 'summer_pond_showcase'
  return createBaseEnvelope({
    playerName: '渔歌',
    money: 28400,
    year,
    season,
    day,
    hour: 11,
    currentLocation: 'creek',
    currentLocationGroup: 'nature',
    farmMapType: 'riverland',
    inventoryItems: [
      { itemId: 'fish_feed', quantity: 40 },
      { itemId: 'water_purifier', quantity: 6 },
      { itemId: 'crab_pot', quantity: 3 },
      { itemId: 'food_rice_ball', quantity: 5 }
    ],
    extraData: {
      player: {
        playerName: '渔歌',
        gender: 'male',
        money: 28400,
        stamina: 210,
        maxStamina: 220,
        staminaCapLevel: 2,
        bonusMaxStamina: 20,
        hp: 120,
        baseMaxHp: 120,
        economyTelemetry: createEconomyTelemetry(
          'late_builder',
          [
            { dayTag: '2-summer-23', disposableMoney: 25100, totalIncome: 3300, totalExpense: 1100, sinkSpend: 600, dominantIncomeSystem: 'market', participatingSystems: ['market', 'goal'], highValueOrderTypes: 1, incomeBySystem: { market: 2500, goal: 800 }, expenseBySystem: { shop: 700, system: 400 }, activeSinkCategories: ['maintenance'] },
            { dayTag: '2-summer-24', disposableMoney: 26300, totalIncome: 2900, totalExpense: 900, sinkSpend: 400, dominantIncomeSystem: 'market', participatingSystems: ['market'], highValueOrderTypes: 1, incomeBySystem: { market: 2900 }, expenseBySystem: { shop: 500, system: 400 }, activeSinkCategories: ['service'] },
            { dayTag: '2-summer-25', disposableMoney: 27400, totalIncome: 3100, totalExpense: 1000, sinkSpend: 550, dominantIncomeSystem: 'market', participatingSystems: ['market', 'goal'], highValueOrderTypes: 1, incomeBySystem: { market: 2300, goal: 800 }, expenseBySystem: { shop: 600, system: 400 }, activeSinkCategories: ['maintenance'] }
          ],
          63500,
          22100,
          9300
        )
      },
      goal: {
        mainQuestStage: 4,
        mainQuestStages: [],
        dailyGoals: [
          createGoalState({
            id: 'daily_summer_fish_sample',
            title: '今日鱼获',
            description: '今日钓到 3 条鱼。',
            metric: 'totalFishCaught',
            targetValue: 3,
            reward: { money: 180, reputation: 2 },
            baselineValue: 46
          })
        ],
        seasonGoals: [
          createGoalState({
            id: 'season_summer_fish_sample',
            title: '夏日垂钓',
            description: '本季钓到 10 条鱼。',
            metric: 'totalFishCaught',
            targetValue: 10,
            reward: { money: 750, reputation: 10 },
            baselineValue: 39,
            source: 'season'
          })
        ],
        weeklyGoals: [
          createWeeklyGoalState({
            id: 'weekly_summer_showcase_pond_sample',
            title: '本周观赏鱼评分',
            description: '本周累计准备 2 条可用于展示的成熟鱼。',
            metric: 'totalFishCaught',
            targetValue: 8,
            reward: { money: 900, reputation: 12 },
            baselineValue: 42,
            season,
            day,
            year,
            linkedThemeWeekId: themeWeekId
          })
        ],
        longTermGoals: [
          createGoalState({
            id: 'long_fish_2_sample',
            title: '桃源渔翁',
            description: '累计钓到 80 条鱼。',
            metric: 'totalFishCaught',
            targetValue: 80,
            reward: { money: 4500, reputation: 60 },
            baselineValue: 61
          })
        ],
        goalReputation: 240,
        lastDailyGoalRefresh: getDayTag(year, season, day),
        lastSeasonGoalRefresh: `${year}-${season}`,
        lastWeeklyGoalRefresh: weekId,
        lastThemeWeekRefresh: weekId,
        currentThemeWeekState: createThemeWeekState(themeWeekId, year, season, day),
        weeklyMetricArchive: {
          version: 1,
          lastGeneratedWeekId: weekId,
          snapshots: [
            createWeeklyMetricSnapshot({
              year,
              season,
              weekOfSeason: getWeekOfSeason(day),
              totalIncome: 14100,
              totalExpense: 5200,
              sinkSpend: 1900,
              fishPondContestScore: 2,
              museumExhibitLevel: 2,
              socialParticipationScore: 4,
              villageProsperityScore: 6,
              activeThemeWeekId: themeWeekId
            })
          ]
        }
      },
      wallet: createWalletState({
        exhibit: 1,
        caravan: 2
      }),
      fishPond: {
        pond: {
          built: true,
          level: 3,
          fish: [
            { id: 'pf_1', fishId: 'carp', name: '锦鳞鲤鱼', genetics: createSampleFishGenetics(78, 72, 68, 76, 10), daysInPond: 9, mature: true, sick: false, sickDays: 0, breedId: 'g3_005' },
            { id: 'pf_2', fishId: 'bass', name: '深碧鲈鱼', genetics: createSampleFishGenetics(74, 65, 62, 70, 8), daysInPond: 7, mature: true, sick: false, sickDays: 0, breedId: 'g3_025' },
            { id: 'pf_3', fishId: 'carp', name: '锦鳞鲤鱼', genetics: createSampleFishGenetics(76, 70, 66, 74, 9), daysInPond: 8, mature: true, sick: false, sickDays: 0, breedId: 'g3_006' }
          ],
          waterQuality: 86,
          fedToday: true,
          breeding: null,
          collectedToday: false
        },
        pendingProducts: [{ itemId: 'carp', quality: 'fine' }, { itemId: 'bass', quality: 'excellent' }],
        discoveredBreeds: ['koi_carp', 'deep_bass'],
        returnedFishPool: {},
        pondContestState: {
          weekId,
          contestId: resolveFishPondContestId(year, season, day),
          registeredFishIds: ['pf_1', 'pf_2'],
          settled: false,
          lastSettlementDayTag: ''
        },
        displayEntries: [
          {
            pondFishId: 'pf_1',
            fishId: 'carp',
            fishName: '锦鳞鲤鱼',
            breedId: 'g3_005',
            snapshotScore: 82,
            snapshotShowValue: 88,
            snapshotGeneration: 3,
            assignedAtDayTag: getDayTag(year, season, day)
          }
        ],
        maintenanceState: {
          ornamentalFeedBuffDays: 2,
          quarantineShieldDays: 1,
          lastOrnamentalFeedDayTag: getDayTag(year, season, day - 1),
          lastAdvancedPurifierDayTag: getDayTag(year, season, day - 1)
        }
      }
    }
  })
}

const createEndgameShowcaseEnvelope = () => {
  const year = 4
  const season: SampleSeason = 'winter'
  const day = 27
  const weekId = getSeasonWeekId(year, season, day)
  const themeWeekId = 'winter_mining'
  return createBaseEnvelope({
    playerName: '桃隐',
    money: 188000,
    year,
    season,
    day,
    hour: 13,
    currentLocation: 'mine',
    currentLocationGroup: 'mine',
    farmMapType: 'hilltop',
    inventoryItems: [
      { itemId: 'gold_bar', quantity: 28 },
      { itemId: 'wood', quantity: 240 },
      { itemId: 'charcoal', quantity: 80 },
      { itemId: 'fish_feed', quantity: 50 },
      { itemId: 'water_purifier', quantity: 10 },
      { itemId: 'food_rice_ball', quantity: 12 }
    ],
    extraData: {
      player: {
        playerName: '桃隐',
        gender: 'male',
        money: 188000,
        stamina: 260,
        maxStamina: 260,
        staminaCapLevel: 3,
        bonusMaxStamina: 10,
        hp: 150,
        baseMaxHp: 130,
        economyTelemetry: createEconomyTelemetry('endgame_tycoon', economySnapshotsLate, 286000, 118000, 74200)
      },
      goal: {
        mainQuestStage: 6,
        mainQuestStages: [],
        dailyGoals: [
          createGoalState({
            id: 'daily_winter_mine_sample',
            title: '今日探矿',
            description: '今日将矿洞最高层推进 5 层。',
            metric: 'highestMineFloor',
            targetValue: 5,
            reward: { money: 260, reputation: 4 },
            baselineValue: 118
          })
        ],
        seasonGoals: [
          createGoalState({
            id: 'season_winter_mine_sample',
            title: '冬季探矿',
            description: '本季将矿洞最高层再推进 10 层。',
            metric: 'highestMineFloor',
            targetValue: 10,
            reward: { money: 1300, reputation: 15 },
            baselineValue: 110,
            source: 'season'
          })
        ],
        weeklyGoals: [
          createWeeklyGoalState({
            id: 'weekly_winter_deep_mine_sample',
            title: '本周深层推进',
            description: '本周把矿洞收益、展示与预算调度串起来。',
            metric: 'highestMineFloor',
            targetValue: 8,
            reward: { money: 1500, reputation: 18 },
            baselineValue: 114,
            season,
            day,
            year,
            linkedThemeWeekId: themeWeekId
          }),
          createWeeklyGoalState({
            id: 'weekly_winter_endgame_budget_sample',
            title: '本周终局预算',
            description: '本周累计赚到 16000 文。',
            metric: 'totalMoneyEarned',
            targetValue: 16000,
            reward: { money: 1800, reputation: 22 },
            baselineValue: 268000,
            season,
            day,
            year,
            linkedThemeWeekId: themeWeekId
          })
        ],
        longTermGoals: [
          createGoalState({
            id: 'long_sink_showcase_endgame_sample',
            title: '终局赞助者',
            description: '累计赚到 120000 文，为终局展示与瀚海赞助预留预算。',
            metric: 'totalMoneyEarned',
            targetValue: 120000,
            reward: { money: 10000, reputation: 135 },
            baselineValue: 252000
          })
        ],
        goalReputation: 860,
        lastDailyGoalRefresh: getDayTag(year, season, day),
        lastSeasonGoalRefresh: `${year}-${season}`,
        lastWeeklyGoalRefresh: weekId,
        lastThemeWeekRefresh: weekId,
        currentThemeWeekState: createThemeWeekState(themeWeekId, year, season, day),
        weeklyMetricArchive: {
          version: 1,
          lastGeneratedWeekId: `${year}-${season}-week-3`,
          snapshots: [
            createWeeklyMetricSnapshot({
              year,
              season,
              weekOfSeason: 3,
              totalIncome: 78200,
              totalExpense: 31600,
              sinkSpend: 22500,
              hanhaiContractCompletions: 8,
              fishPondContestScore: 2,
              museumExhibitLevel: 14,
              socialParticipationScore: 10,
              villageProsperityScore: 42,
              activeThemeWeekId: 'winter_pond_maintenance'
            })
          ]
        }
      },
      wallet: createWalletState({
        construction: 3,
        exhibit: 2,
        research: 2,
        caravan: 1
      }),
      breeding: {
        unlocked: true,
        seedBoxLevel: 2,
        stationCount: 3,
        researchLevel: 3,
        favoriteSeedIds: ['seed_jade_tea_showcase'],
        breedingBox: [
          { label: '翡翠茶 G12', genetics: { id: 'seed_jade_tea_showcase', cropId: 'jade_tea', generation: 12, sweetness: 60, yield: 40, resistance: 38, stability: 82, mutationRate: 7, parentA: null, parentB: null, isHybrid: true, hybridId: 'jade_tea', lineageParents: [] } }
        ],
        stations: [
          { parentA: null, parentB: null, daysProcessed: 0, totalDays: 0, result: null, ready: false },
          { parentA: null, parentB: null, daysProcessed: 0, totalDays: 0, result: null, ready: false },
          { parentA: null, parentB: null, daysProcessed: 0, totalDays: 0, result: null, ready: false }
        ],
        compendium: [
          { hybridId: 'jade_tea', discoveredYear: 3, bestTotalStats: 138, bestSweetness: 60, bestYield: 40, bestResistance: 38, bestGeneration: 12, lineageCropIds: ['jade_tea'], timesGrown: 6 },
          { hybridId: 'moonlight_rice', discoveredYear: 3, bestTotalStats: 129, bestSweetness: 48, bestYield: 44, bestResistance: 37, bestGeneration: 10, lineageCropIds: ['moonlight_rice'], timesGrown: 5 }
        ],
        breedingContestState: {
          weekId,
          contestId: resolveBreedingContestId(year, season, day),
          registeredSeedIds: ['seed_jade_tea_showcase'],
          settled: false,
          lastSettlementDayTag: ''
        }
      },
      fishPond: {
        pond: {
          built: true,
          level: 4,
          fish: [
            { id: 'pf_showcase_1', fishId: 'carp', name: '锦鳞鲤鱼', genetics: createSampleFishGenetics(86, 80, 78, 88, 12), daysInPond: 12, mature: true, sick: false, sickDays: 0, breedId: 'g3_005' },
            { id: 'pf_showcase_2', fishId: 'bass', name: '深碧鲈鱼', genetics: createSampleFishGenetics(82, 74, 76, 84, 10), daysInPond: 11, mature: true, sick: false, sickDays: 0, breedId: 'g3_025' }
          ],
          waterQuality: 90,
          fedToday: true,
          breeding: null,
          collectedToday: false
        },
        pendingProducts: [{ itemId: 'carp', quality: 'fine' }, { itemId: 'bass', quality: 'fine' }],
        discoveredBreeds: ['koi_carp', 'deep_bass'],
        returnedFishPool: {},
        pondContestState: {
          weekId,
          contestId: resolveFishPondContestId(year, season, day),
          registeredFishIds: ['pf_showcase_1'],
          settled: false,
          lastSettlementDayTag: ''
        }
      },
      villageProject: {
        projectStates: {
          caravan_station: { completed: true, completedDayTag: '3-spring-10' },
          village_school: { completed: true, completedDayTag: '3-summer-8' },
          hot_spring: { completed: true, completedDayTag: '3-autumn-15' },
          caravan_station_ii: { completed: true, completedDayTag: '4-spring-6' },
          village_school_ii: { completed: true, completedDayTag: '4-summer-12' }
        }
      },
      museum: {
        donatedItems: ['gold_ore', 'jade', 'quartz', 'emerald', 'ruby', 'sapphire', 'amethyst', 'opal', 'fossil_shell', 'old_coin', 'ancient_tablet', 'spirit_feather', 'ancient_vase', 'moon_shard'],
        claimedMilestones: [5, 10]
      },
      hanhai: {
        unlocked: true,
        casinoBetsToday: 0,
        weeklyPurchases: {},
        relicRecords: {
          dune_watch: { siteId: 'dune_watch', clears: 3, claimedMilestone: true },
          mirage_ruin: { siteId: 'mirage_ruin', clears: 3, claimedMilestone: true },
          obsidian_gate: { siteId: 'obsidian_gate', clears: 2, claimedMilestone: false }
        }
      }
    }
  })
}

const createWeeklyRolloverEveEnvelope = () => {
  const year = 2
  const season: SampleSeason = 'autumn'
  const day = 21
  const weekId = getSeasonWeekId(year, season, day)
  const themeWeekId = 'autumn_processing'
  return createBaseEnvelope({
    playerName: '巡周',
    money: 64000,
    year,
    season,
    day,
    hour: 25,
    currentLocation: 'village',
    currentLocationGroup: 'village_area',
    farmMapType: 'standard',
    inventoryItems: [
      { itemId: 'wood', quantity: 120 },
      { itemId: 'charcoal', quantity: 36 },
      { itemId: 'food_rice_ball', quantity: 5 }
    ],
    extraData: {
      player: {
        playerName: '巡周',
        gender: 'female',
        money: 64000,
        stamina: 180,
        maxStamina: 220,
        staminaCapLevel: 2,
        bonusMaxStamina: 20,
        hp: 120,
        baseMaxHp: 120,
        economyTelemetry: createEconomyTelemetry('late_builder', economySnapshotsLate.slice(0, 3), 126000, 47200, 19100)
      },
      goal: {
        mainQuestStage: 4,
        mainQuestStages: [],
        dailyGoals: [
          createGoalState({
            id: 'daily_autumn_rollover_sample',
            title: '今日备账',
            description: '今日赚到 1200 文。',
            metric: 'totalMoneyEarned',
            targetValue: 1200,
            reward: { money: 260, reputation: 3 },
            baselineValue: 124000
          })
        ],
        seasonGoals: [
          createGoalState({
            id: 'season_autumn_rollover_sample',
            title: '秋账总览',
            description: '本季赚到 9000 文。',
            metric: 'totalMoneyEarned',
            targetValue: 9000,
            reward: { money: 1500, reputation: 18 },
            baselineValue: 118000,
            source: 'season'
          })
        ],
        weeklyGoals: [
          createWeeklyGoalState({
            id: 'weekly_rollover_income_sample',
            title: '本周账本收束',
            description: '本周累计赚到 10000 文。',
            metric: 'totalMoneyEarned',
            targetValue: 10000,
            reward: { money: 1000, reputation: 14 },
            baselineValue: 121000,
            season,
            day,
            year,
            linkedThemeWeekId: themeWeekId
          })
        ],
        longTermGoals: [
          createGoalState({
            id: 'long_rollover_budget_sample',
            title: '经营有章',
            description: '累计赚到 15000 文，为 weekly loop 做好预算缓冲。',
            metric: 'totalMoneyEarned',
            targetValue: 15000,
            reward: { money: 1800, reputation: 28 },
            baselineValue: 110000
          })
        ],
        goalReputation: 300,
        lastDailyGoalRefresh: getDayTag(year, season, day),
        lastSeasonGoalRefresh: `${year}-${season}`,
        lastWeeklyGoalRefresh: weekId,
        lastThemeWeekRefresh: weekId,
        currentThemeWeekState: createThemeWeekState(themeWeekId, year, season, day),
        weeklyMetricArchive: {
          version: 1,
          lastGeneratedWeekId: `${year}-${season}-week-2`,
          snapshots: [
            createWeeklyMetricSnapshot({
              year,
              season,
              weekOfSeason: 2,
              totalIncome: 42200,
              totalExpense: 17800,
              sinkSpend: 6500,
              museumExhibitLevel: 8,
              socialParticipationScore: 4,
              villageProsperityScore: 18,
              activeThemeWeekId: 'autumn_harvest'
            })
          ]
        }
      },
      wallet: createWalletState({
        construction: 1
      })
    }
  })
}

const createBreedingContestSettlementEveEnvelope = () => {
  const year = 2
  const season: SampleSeason = 'autumn'
  const day = 21
  const weekId = getSeasonWeekId(year, season, day)
  const themeWeekId = 'autumn_processing'
  return createBaseEnvelope({
    playerName: '试育',
    gender: 'female',
    money: 54000,
    year,
    season,
    day,
    hour: 25,
    currentLocation: 'farm',
    currentLocationGroup: 'farm',
    farmMapType: 'forest',
    inventoryItems: [
      { itemId: 'wood', quantity: 110 },
      { itemId: 'charcoal', quantity: 30 },
      { itemId: 'food_rice_ball', quantity: 6 }
    ],
    extraData: {
      player: {
        playerName: '试育',
        gender: 'female',
        money: 54000,
        stamina: 210,
        maxStamina: 220,
        staminaCapLevel: 2,
        bonusMaxStamina: 20,
        hp: 120,
        baseMaxHp: 120,
        economyTelemetry: createEconomyTelemetry('late_builder', economySnapshotsLate.slice(0, 3), 118000, 43200, 16600)
      },
      goal: {
        mainQuestStage: 4,
        mainQuestStages: [],
        dailyGoals: [
          createGoalState({
            id: 'daily_breeding_settlement_sample',
            title: '今日试育',
            description: '今日赚到 1200 文。',
            metric: 'totalMoneyEarned',
            targetValue: 1200,
            reward: { money: 260, reputation: 3 },
            baselineValue: 113200
          })
        ],
        seasonGoals: [
          createGoalState({
            id: 'season_breeding_settlement_sample',
            title: '秋季加工回款',
            description: '本季赚到 9000 文。',
            metric: 'totalMoneyEarned',
            targetValue: 9000,
            reward: { money: 1500, reputation: 18 },
            baselineValue: 107500,
            source: 'season'
          })
        ],
        weeklyGoals: [
          createWeeklyGoalState({
            id: 'weekly_breeding_settlement_sample',
            title: '本周育种评分',
            description: '本周保留 2 份高代样本参赛。',
            metric: 'discoveredCount',
            targetValue: 2,
            reward: { money: 800, reputation: 12 },
            baselineValue: 38,
            season,
            day,
            year,
            linkedThemeWeekId: themeWeekId
          })
        ],
        longTermGoals: [
          createGoalState({
            id: 'long_breeding_archive_sample',
            title: '见闻渐丰',
            description: '累计发现 30 种物品与育种样本。',
            metric: 'discoveredCount',
            targetValue: 30,
            reward: { money: 1800, reputation: 35 },
            baselineValue: 29
          })
        ],
        goalReputation: 340,
        lastDailyGoalRefresh: getDayTag(year, season, day),
        lastSeasonGoalRefresh: `${year}-${season}`,
        lastWeeklyGoalRefresh: weekId,
        lastThemeWeekRefresh: weekId,
        currentThemeWeekState: createThemeWeekState(themeWeekId, year, season, day),
        weeklyMetricArchive: {
          version: 1,
          lastGeneratedWeekId: `${year}-${season}-week-2`,
          snapshots: [
            createWeeklyMetricSnapshot({
              year,
              season,
              weekOfSeason: 2,
              totalIncome: 39800,
              totalExpense: 15500,
              sinkSpend: 5200,
              museumExhibitLevel: 5,
              socialParticipationScore: 4,
              villageProsperityScore: 10,
              activeThemeWeekId: 'autumn_harvest'
            })
          ]
        }
      },
      breeding: {
        unlocked: true,
        seedBoxLevel: 1,
        stationCount: 2,
        researchLevel: 2,
        favoriteSeedIds: ['seed_jade_tea_reg'],
        breedingBox: [
          { label: '翡翠茶 G9', genetics: { id: 'seed_jade_tea_reg', cropId: 'jade_tea', generation: 9, sweetness: 54, yield: 34, resistance: 33, stability: 76, mutationRate: 8, parentA: null, parentB: null, isHybrid: true, hybridId: 'jade_tea', lineageParents: [] } },
          { label: '月光稻 G8', genetics: { id: 'seed_moonlight_rice_reg', cropId: 'moonlight_rice', generation: 8, sweetness: 45, yield: 43, resistance: 35, stability: 73, mutationRate: 9, parentA: null, parentB: null, isHybrid: true, hybridId: 'moonlight_rice', lineageParents: [] } },
          { label: '金蜜瓜 G9', genetics: { id: 'seed_golden_melon_reg', cropId: 'golden_melon', generation: 9, sweetness: 48, yield: 40, resistance: 32, stability: 74, mutationRate: 10, parentA: null, parentB: null, isHybrid: true, hybridId: 'golden_melon', lineageParents: [] } }
        ],
        stations: [
          { parentA: null, parentB: null, daysProcessed: 0, totalDays: 0, result: null, ready: false },
          { parentA: null, parentB: null, daysProcessed: 0, totalDays: 0, result: null, ready: false }
        ],
        compendium: [
          { hybridId: 'jade_tea', discoveredYear: 2, bestTotalStats: 121, bestSweetness: 54, bestYield: 34, bestResistance: 33, bestGeneration: 9, lineageCropIds: ['jade_tea'], timesGrown: 3 },
          { hybridId: 'moonlight_rice', discoveredYear: 2, bestTotalStats: 123, bestSweetness: 45, bestYield: 43, bestResistance: 35, bestGeneration: 8, lineageCropIds: ['moonlight_rice'], timesGrown: 4 },
          { hybridId: 'golden_melon', discoveredYear: 2, bestTotalStats: 120, bestSweetness: 48, bestYield: 40, bestResistance: 32, bestGeneration: 9, lineageCropIds: ['golden_melon'], timesGrown: 2 }
        ],
        breedingContestState: {
          weekId,
          contestId: resolveBreedingContestId(year, season, day),
          registeredSeedIds: ['seed_jade_tea_reg', 'seed_moonlight_rice_reg'],
          settled: false,
          lastSettlementDayTag: ''
        }
      }
    }
  })
}

const createFishpondCycleEveEnvelope = () => {
  const year = 2
  const season: SampleSeason = 'winter'
  const day = 21
  const weekId = getSeasonWeekId(year, season, day)
  const themeWeekId = 'winter_pond_maintenance'
  return createBaseEnvelope({
    playerName: '试塘',
    money: 47000,
    year,
    season,
    day,
    hour: 25,
    currentLocation: 'creek',
    currentLocationGroup: 'nature',
    farmMapType: 'riverland',
    inventoryItems: [
      { itemId: 'fish_feed', quantity: 28 },
      { itemId: 'water_purifier', quantity: 4 },
      { itemId: 'food_rice_ball', quantity: 4 }
    ],
    extraData: {
      player: {
        playerName: '试塘',
        gender: 'male',
        money: 47000,
        stamina: 200,
        maxStamina: 220,
        staminaCapLevel: 2,
        bonusMaxStamina: 20,
        hp: 120,
        baseMaxHp: 120,
        economyTelemetry: createEconomyTelemetry('late_builder', economySnapshotsLate.slice(0, 3), 110000, 40600, 15400)
      },
      goal: {
        mainQuestStage: 4,
        mainQuestStages: [],
        dailyGoals: [
          createGoalState({
            id: 'daily_winter_pond_sample',
            title: '今日冰钓',
            description: '今日钓到 2 条鱼。',
            metric: 'totalFishCaught',
            targetValue: 2,
            reward: { money: 180, reputation: 2 },
            baselineValue: 57
          })
        ],
        seasonGoals: [
          createGoalState({
            id: 'season_winter_pond_sample',
            title: '冬日冰钓',
            description: '本季钓到 8 条鱼。',
            metric: 'totalFishCaught',
            targetValue: 8,
            reward: { money: 850, reputation: 12 },
            baselineValue: 51,
            source: 'season'
          })
        ],
        weeklyGoals: [
          createWeeklyGoalState({
            id: 'weekly_fishpond_rollover_sample',
            title: '本周鱼塘评分',
            description: '本周保留 2 条高分成熟鱼用于周赛。',
            metric: 'totalFishCaught',
            targetValue: 6,
            reward: { money: 900, reputation: 12 },
            baselineValue: 54,
            season,
            day,
            year,
            linkedThemeWeekId: themeWeekId
          })
        ],
        longTermGoals: [
          createGoalState({
            id: 'long_fishpond_showcase_sample',
            title: '桃源渔翁',
            description: '累计钓到 80 条鱼，为鱼塘与展示线提供样本。',
            metric: 'totalFishCaught',
            targetValue: 80,
            reward: { money: 4500, reputation: 60 },
            baselineValue: 67
          })
        ],
        goalReputation: 280,
        lastDailyGoalRefresh: getDayTag(year, season, day),
        lastSeasonGoalRefresh: `${year}-${season}`,
        lastWeeklyGoalRefresh: weekId,
        lastThemeWeekRefresh: weekId,
        currentThemeWeekState: createThemeWeekState(themeWeekId, year, season, day),
        weeklyMetricArchive: {
          version: 1,
          lastGeneratedWeekId: `${year}-${season}-week-2`,
          snapshots: [
            createWeeklyMetricSnapshot({
              year,
              season,
              weekOfSeason: 2,
              totalIncome: 36100,
              totalExpense: 14000,
              sinkSpend: 4800,
              fishPondContestScore: 1,
              museumExhibitLevel: 4,
              socialParticipationScore: 5,
              villageProsperityScore: 8,
              activeThemeWeekId: 'winter_scholar'
            })
          ]
        }
      },
      fishPond: {
        pond: {
          built: true,
          level: 3,
          fish: [
            { id: 'pf_cycle_1', fishId: 'carp', name: '锦鳞鲤鱼', genetics: createSampleFishGenetics(80, 72, 70, 82, 11), daysInPond: 10, mature: true, sick: false, sickDays: 0, breedId: 'g2_009' },
            { id: 'pf_cycle_2', fishId: 'bass', name: '深碧鲈鱼', genetics: createSampleFishGenetics(78, 69, 71, 76, 9), daysInPond: 9, mature: true, sick: false, sickDays: 0, breedId: 'g2_049' },
            { id: 'pf_cycle_3', fishId: 'carp', name: '锦鳞鲤鱼', genetics: createSampleFishGenetics(74, 68, 66, 72, 8), daysInPond: 8, mature: true, sick: false, sickDays: 0, breedId: 'g2_010' }
          ],
          waterQuality: 88,
          fedToday: true,
          breeding: null,
          collectedToday: false
        },
        pendingProducts: [
          { itemId: 'carp', quality: 'fine' },
          { itemId: 'bass', quality: 'excellent' }
        ],
        discoveredBreeds: ['koi_carp', 'deep_bass'],
        returnedFishPool: {},
        pondContestState: {
          weekId,
          contestId: resolveFishPondContestId(year, season, day),
          registeredFishIds: ['pf_cycle_1', 'pf_cycle_2'],
          settled: false,
          lastSettlementDayTag: ''
        },
        displayEntries: [
          {
            pondFishId: 'pf_cycle_1',
            fishId: 'carp',
            fishName: '锦鳞鲤鱼',
            breedId: 'g2_009',
            snapshotScore: 86,
            snapshotShowValue: 90,
            snapshotGeneration: 3,
            assignedAtDayTag: getDayTag(year, season, day)
          }
        ],
        maintenanceState: {
          ornamentalFeedBuffDays: 1,
          quarantineShieldDays: 1,
          lastOrnamentalFeedDayTag: getDayTag(year, season, day),
          lastAdvancedPurifierDayTag: getDayTag(year, season, day)
        }
      }
    }
  })
}

const createThemeWeekRefreshEdgeEnvelope = () => {
  const year = 3
  const season: SampleSeason = 'spring'
  const day = 21
  const weekId = getSeasonWeekId(year, season, day)
  const themeWeekId = 'spring_scholar'
  return createBaseEnvelope({
    playerName: '试题',
    gender: 'female',
    money: 72000,
    year,
    season,
    day,
    hour: 25,
    currentLocation: 'village',
    currentLocationGroup: 'village_area',
    farmMapType: 'standard',
    inventoryItems: [
      { itemId: 'wood', quantity: 140 },
      { itemId: 'charcoal', quantity: 45 },
      { itemId: 'food_rice_ball', quantity: 7 }
    ],
    extraData: {
      player: {
        playerName: '试题',
        gender: 'female',
        money: 72000,
        stamina: 205,
        maxStamina: 220,
        staminaCapLevel: 2,
        bonusMaxStamina: 20,
        hp: 120,
        baseMaxHp: 120,
        economyTelemetry: createEconomyTelemetry('late_builder', economySnapshotsLate.slice(0, 3), 132000, 48800, 17600)
      },
      goal: {
        mainQuestStage: 5,
        mainQuestStages: [],
        dailyGoals: [
          createGoalState({
            id: 'daily_theme_refresh_sample',
            title: '今日见闻',
            description: '今日发现 1 种新物品。',
            metric: 'discoveredCount',
            targetValue: 1,
            reward: { money: 180, reputation: 3 },
            baselineValue: 48
          })
        ],
        seasonGoals: [
          createGoalState({
            id: 'season_theme_refresh_sample',
            title: '春日结识',
            description: '本季新增 1 位友好村民。',
            metric: 'friendlyNpcCount',
            targetValue: 1,
            reward: { money: 600, reputation: 12 },
            baselineValue: 5,
            source: 'season'
          })
        ],
        weeklyGoals: [
          createWeeklyGoalState({
            id: 'weekly_theme_refresh_sample',
            title: '本周布展筹备',
            description: '本周累计发现 3 种可用于展示的物品。',
            metric: 'discoveredCount',
            targetValue: 3,
            reward: { money: 900, reputation: 12 },
            baselineValue: 46,
            season,
            day,
            year,
            linkedThemeWeekId: themeWeekId
          })
        ],
        longTermGoals: [
          createGoalState({
            id: 'long_theme_refresh_social_sample',
            title: '村中熟面孔',
            description: '让 4 位村民达到友好。',
            metric: 'friendlyNpcCount',
            targetValue: 4,
            reward: { money: 1800, reputation: 35 },
            baselineValue: 3
          })
        ],
        goalReputation: 410,
        lastDailyGoalRefresh: getDayTag(year, season, day),
        lastSeasonGoalRefresh: `${year}-${season}`,
        lastWeeklyGoalRefresh: weekId,
        lastThemeWeekRefresh: weekId,
        currentThemeWeekState: createThemeWeekState(themeWeekId, year, season, day),
        weeklyMetricArchive: {
          version: 1,
          lastGeneratedWeekId: `${year}-${season}-week-2`,
          snapshots: [
            createWeeklyMetricSnapshot({
              year,
              season,
              weekOfSeason: 2,
              totalIncome: 37800,
              totalExpense: 16100,
              sinkSpend: 5400,
              museumExhibitLevel: 7,
              socialParticipationScore: 6,
              villageProsperityScore: 16,
              activeThemeWeekId: 'spring_market'
            })
          ]
        }
      },
      wallet: createWalletState({
        research: 1
      })
    }
  })
}

export const BUILT_IN_SAMPLE_SAVES: BuiltInSampleSaveDef[] = [
  {
    id: 'late_economy_foundation',
    label: '后期富裕经营档',
    description: '高保真的经济治理样例，能直接检查经济遥测、村庄建设、博物馆、瀚海与周快照。',
    tags: ['late-game', 'economy', 'weekly-metrics', 'village', 'hanhai'],
    tier: 'flagship',
    recommendedRouteName: 'village-projects',
    focusAreas: ['经济遥测', '村庄建设', '博物馆捐赠', '瀚海经营', '周快照'],
    smokeChecks: [
      { id: 'open_route', label: '载入后直接进入村庄建设页，确认不是先落回农场。' },
      { id: 'check_wallet', label: '切到钱包页，检查票券、经济分层与高价 sink 预期是否成立。' },
      { id: 'cross_system', label: '查看村庄、博物馆和瀚海状态，确认主样例是可继续玩的后期局。' }
    ],
    runtimeExpectations: {
      player: { minMoney: 86500, requireEconomyTelemetry: true },
      game: { currentLocation: 'village', currentLocationGroup: 'village_area' },
      goal: { minDailyGoals: 1, minSeasonGoals: 1, minWeeklyGoals: 2, minLongTermGoals: 1, minWeeklySnapshots: 1, requireThemeWeek: true },
      villageProject: { minCompletedProjects: 3 },
      museum: { minDonatedItems: 2 },
      hanhai: { unlocked: true, minRelicRecords: 2 },
      wallet: { minTicketTypes: 2 },
      boundaryAction: 'none'
    },
    envelope: createLateEconomyEnvelope()
  },
  {
    id: 'breeding_specialist',
    label: '育种专项档',
    description: '高保真的育种与主题周样例，带现成参赛样本、图鉴和育种周赛状态。',
    tags: ['late-game', 'breeding', 'quest', 'theme-week'],
    tier: 'flagship',
    recommendedRouteName: 'breeding',
    focusAreas: ['育种箱', '图鉴', '主题周', '周赛参赛状态', '研究票券'],
    smokeChecks: [
      { id: 'open_route', label: '载入后直接进入育种页，确认样本、站位和图鉴都可见。' },
      { id: 'contest_state', label: '检查当前周赛报名状态，确保样例不是空档而是真实可联调局。' },
      { id: 'theme_focus', label: '确认主题周与育种焦点、票券状态能形成一条明确推进线。' }
    ],
    runtimeExpectations: {
      player: { minMoney: 36200, requireEconomyTelemetry: true },
      game: { currentLocation: 'farm', currentLocationGroup: 'farm' },
      goal: { minDailyGoals: 1, minSeasonGoals: 1, minWeeklyGoals: 1, minLongTermGoals: 1, minWeeklySnapshots: 1, requireThemeWeek: true },
      breeding: { unlocked: true, minBreedingBox: 3, minCompendiumEntries: 3 },
      wallet: { minTicketTypes: 1 },
      boundaryAction: 'none'
    },
    envelope: createBreedingSpecialistEnvelope()
  },
  {
    id: 'fishpond_operator',
    label: '鱼塘经营档',
    description: '高保真的鱼塘与展示样例，带成熟鱼群、待领取产物、展示槽和鱼塘周赛状态。',
    tags: ['late-game', 'fishpond', 'weekly-cycle', 'quest', 'showcase'],
    tier: 'flagship',
    recommendedRouteName: 'fishpond',
    focusAreas: ['鱼塘养殖', '展示鱼', '待领取产物', '鱼塘周赛', '养护状态'],
    smokeChecks: [
      { id: 'open_route', label: '载入后直接进入鱼塘页，确认不是先回农场再手动找入口。' },
      { id: 'pond_state', label: '检查成熟鱼、展示槽、待领取产物和养护 buff 是否都在位。' },
      { id: 'contest_state', label: '检查鱼塘周赛报名状态，确认这是一套可继续推进的运营局。' }
    ],
    runtimeExpectations: {
      player: { minMoney: 28400, requireEconomyTelemetry: true },
      game: { currentLocation: 'creek', currentLocationGroup: 'nature' },
      goal: { minDailyGoals: 1, minSeasonGoals: 1, minWeeklyGoals: 1, minLongTermGoals: 1, minWeeklySnapshots: 1, requireThemeWeek: true },
      fishPond: { built: true, minFish: 3, minPendingProducts: 1, minRegisteredFish: 2 },
      wallet: { minTicketTypes: 1 },
      boundaryAction: 'none'
    },
    envelope: createFishpondOperatorEnvelope()
  },
  {
    id: 'endgame_showcase',
    label: '终局综合档',
    description: '多系统综合联动样例，导入后即可继续跑矿洞、票券、村庄、鱼塘、瀚海和博物馆的后期局。',
    tags: ['endgame', 'economy', 'breeding', 'fishpond', 'museum', 'hanhai', 'village', 'mining'],
    tier: 'flagship',
    recommendedRouteName: 'mining',
    focusAreas: ['终局预算', '矿洞推进', '票券链', '村庄繁荣', '瀚海遗迹', '鱼塘展示'],
    smokeChecks: [
      { id: 'open_route', label: '载入后直接进入矿洞页，确认综合局默认落点是可验的主链路。' },
      { id: 'cross_system', label: '切看钱包、鱼塘、村庄、瀚海和博物馆，确认关键 store 都已带内容。' },
      { id: 'long_run', label: '不用额外补钱或补状态，就能继续做多页面联调。' }
    ],
    runtimeExpectations: {
      player: { minMoney: 188000, requireEconomyTelemetry: true },
      game: { currentLocation: 'mine', currentLocationGroup: 'mine' },
      goal: { minDailyGoals: 1, minSeasonGoals: 1, minWeeklyGoals: 2, minLongTermGoals: 1, minWeeklySnapshots: 1, requireThemeWeek: true },
      breeding: { unlocked: true, minBreedingBox: 1, minCompendiumEntries: 2 },
      fishPond: { built: true, minFish: 2, minPendingProducts: 1, minRegisteredFish: 1 },
      villageProject: { minCompletedProjects: 5 },
      museum: { minDonatedItems: 2 },
      hanhai: { unlocked: true, minRelicRecords: 3 },
      wallet: { minTicketTypes: 3 },
      boundaryAction: 'none'
    },
    envelope: createEndgameShowcaseEnvelope()
  },
  {
    id: 'weekly_rollover_eve',
    label: '周切换前夜',
    description: '窄场景回归样例，卡在周三段结束前夜，用来验证 `handleEndDay()` 后的周切换与周结算。',
    tags: ['regression', 'weekly', 'boundary', 'theme-week'],
    tier: 'regression',
    recommendedRouteName: 'quest',
    focusAreas: ['周切换', '周目标结算', '主题周切换'],
    smokeChecks: [
      { id: 'load_state', label: '确认当前是第三周最后一夜，周快照与周目标都已经在位。' },
      { id: 'advance_once', label: '执行一次日结，验证周 ID、主题周和周结算摘要发生切换。' }
    ],
    runtimeExpectations: {
      player: { minMoney: 64000, requireEconomyTelemetry: true },
      game: { currentLocation: 'village', currentLocationGroup: 'village_area' },
      goal: { minDailyGoals: 1, minSeasonGoals: 1, minWeeklyGoals: 1, minLongTermGoals: 1, minWeeklySnapshots: 1, requireThemeWeek: true },
      wallet: { minTicketTypes: 1 },
      boundaryAction: 'week_rollover'
    },
    envelope: createWeeklyRolloverEveEnvelope()
  },
  {
    id: 'breeding_contest_settlement_eve',
    label: '育种周赛结算前夜',
    description: '窄场景回归样例，卡在育种周赛结算点，用来验证周切换时的育种周赛结算与刷新。',
    tags: ['regression', 'breeding', 'contest', 'boundary'],
    tier: 'regression',
    recommendedRouteName: 'breeding',
    focusAreas: ['育种周赛结算', '报名样本保留', '主题周联动'],
    smokeChecks: [
      { id: 'contest_ready', label: '确认周赛报名样本、图鉴和当前周主题都已就绪。' },
      { id: 'advance_once', label: '执行一次日结，验证育种周赛结算摘要生成且切到新一周。' }
    ],
    runtimeExpectations: {
      player: { minMoney: 54000, requireEconomyTelemetry: true },
      game: { currentLocation: 'farm', currentLocationGroup: 'farm' },
      goal: { minDailyGoals: 1, minSeasonGoals: 1, minWeeklyGoals: 1, minLongTermGoals: 1, minWeeklySnapshots: 1, requireThemeWeek: true },
      breeding: { unlocked: true, minBreedingBox: 3, minCompendiumEntries: 3, minRegisteredSeeds: 2 },
      boundaryAction: 'breeding_settlement'
    },
    envelope: createBreedingContestSettlementEveEnvelope()
  },
  {
    id: 'fishpond_cycle_eve',
    label: '鱼塘周循环前夜',
    description: '窄场景回归样例，卡在鱼塘产物与鱼塘周赛共同推进的边界点。',
    tags: ['regression', 'fishpond', 'weekly', 'boundary'],
    tier: 'regression',
    recommendedRouteName: 'fishpond',
    focusAreas: ['鱼塘周赛结算', '待领取产物', '养护状态'],
    smokeChecks: [
      { id: 'pond_ready', label: '确认成熟鱼、待领取产物、展示槽和周赛报名状态都在位。' },
      { id: 'advance_once', label: '执行一次日结，验证鱼塘周赛结算与下一周刷新不互相打断。' }
    ],
    runtimeExpectations: {
      player: { minMoney: 47000, requireEconomyTelemetry: true },
      game: { currentLocation: 'creek', currentLocationGroup: 'nature' },
      goal: { minDailyGoals: 1, minSeasonGoals: 1, minWeeklyGoals: 1, minLongTermGoals: 1, minWeeklySnapshots: 1, requireThemeWeek: true },
      fishPond: { built: true, minFish: 3, minPendingProducts: 2, minRegisteredFish: 2 },
      boundaryAction: 'fishpond_rollover'
    },
    envelope: createFishpondCycleEveEnvelope()
  },
  {
    id: 'theme_week_refresh_edge',
    label: '主题周刷新边界',
    description: '窄场景回归样例，卡在主题周即将切换的最后一夜，用来验证刷新后的推荐焦点是否重建。',
    tags: ['regression', 'theme-week', 'boundary', 'quest'],
    tier: 'regression',
    recommendedRouteName: 'quest',
    focusAreas: ['主题周刷新', '周目标重建', '跨周引导切换'],
    smokeChecks: [
      { id: 'theme_ready', label: '确认当前主题周、周目标和周快照都对应旧周。' },
      { id: 'advance_once', label: '执行一次日结，验证主题周切到下一周且不保留旧周焦点。' }
    ],
    runtimeExpectations: {
      player: { minMoney: 72000, requireEconomyTelemetry: true },
      game: { currentLocation: 'village', currentLocationGroup: 'village_area' },
      goal: { minDailyGoals: 1, minSeasonGoals: 1, minWeeklyGoals: 1, minLongTermGoals: 1, minWeeklySnapshots: 1, requireThemeWeek: true },
      wallet: { minTicketTypes: 1 },
      boundaryAction: 'theme_week_refresh'
    },
    envelope: createThemeWeekRefreshEdgeEnvelope()
  },
  {
    id: 'ws13_activity_midcycle',
    label: 'WS13 活动编排中局样例',
    description: '用于验证第二批活动编排、邮件节奏和商店承接包是否在中局阶段同时可见。',
    tags: ['ws13', 'activity', 'mail', 'shop', 'quest'],
    tier: 'regression',
    recommendedRouteName: 'mail',
    focusAreas: ['活动摘要', '邮件节奏', '目录承接'],
    smokeChecks: [
      { id: 'campaign_visible', label: '确认当前活动、邮件节奏和推荐路线都能在 Mail / Quest / TopGoals 看到。' },
      { id: 'mail_preview', label: '确认预告类邮件模板和当前活动模板可被同一轮活动读取。' }
    ],
    runtimeExpectations: {
      player: { minMoney: 64000, requireEconomyTelemetry: true },
      game: { currentLocation: 'village', currentLocationGroup: 'village_area' },
      goal: { minDailyGoals: 1, minSeasonGoals: 1, minWeeklyGoals: 1, minLongTermGoals: 1, minWeeklySnapshots: 1, requireThemeWeek: true },
      wallet: { minTicketTypes: 1 },
      boundaryAction: 'none'
    },
    envelope: createLateEconomyEnvelope()
  },
  {
    id: 'ws14_competition_boundary',
    label: 'WS14 竞赛结算边界样例',
    description: '用于验证第二批鱼塘 / 育种周赛规则变体在结算前夜仍能稳定承接报名与奖励。',
    tags: ['ws14', 'contest', 'breeding', 'fishpond', 'boundary'],
    tier: 'regression',
    recommendedRouteName: 'breeding',
    focusAreas: ['育种周赛', '鱼塘周赛', '结算前夜'],
    smokeChecks: [
      { id: 'breeding_ready', label: '确认育种周赛报名样本、评分维度和奖励档都可见。' },
      { id: 'fishpond_ready', label: '确认鱼塘周赛报名样本、待领取产物和活动承接都可见。' }
    ],
    runtimeExpectations: {
      player: { minMoney: 54000, requireEconomyTelemetry: true },
      game: { currentLocation: 'farm', currentLocationGroup: 'farm' },
      goal: { minDailyGoals: 1, minSeasonGoals: 1, minWeeklyGoals: 1, minLongTermGoals: 1, minWeeklySnapshots: 1, requireThemeWeek: true },
      breeding: { unlocked: true, minBreedingBox: 3, minCompendiumEntries: 3, minRegisteredSeeds: 2 },
      boundaryAction: 'breeding_settlement'
    },
    envelope: createBreedingContestSettlementEveEnvelope()
  },
  {
    id: 'ws14_museum_hanhai_bridge',
    label: 'WS14 博物馆 / 瀚海承接样例',
    description: '用于验证第二批馆务委托、瀚海活动承接和跨系统推荐能在同一档中成立。',
    tags: ['ws14', 'museum', 'hanhai', 'showcase', 'late-game'],
    tier: 'flagship',
    recommendedRouteName: 'museum',
    focusAreas: ['馆务委托', '瀚海承接', '跨系统推荐'],
    smokeChecks: [
      { id: 'museum_focus', label: '确认馆区焦点、学者委托和活动承接提示都可见。' },
      { id: 'hanhai_focus', label: '确认商路、遗迹和活动推荐路线能同时成立。' }
    ],
    runtimeExpectations: {
      player: { minMoney: 188000, requireEconomyTelemetry: true },
      game: { currentLocation: 'mine', currentLocationGroup: 'mine' },
      goal: { minDailyGoals: 1, minSeasonGoals: 1, minWeeklyGoals: 2, minLongTermGoals: 1, minWeeklySnapshots: 1, requireThemeWeek: true },
      museum: { minDonatedItems: 2 },
      hanhai: { unlocked: true, minRelicRecords: 3 },
      wallet: { minTicketTypes: 3 },
      boundaryAction: 'none'
    },
    envelope: createEndgameShowcaseEnvelope()
  },
  {
    id: 'ws15_relationship_event_chain',
    label: 'WS15 关系线联动样例',
    description: '用于验证第二批家庭 / 知己 / 仙灵事件链和活动焦点、任务承接、邮件预告能否同时成立。',
    tags: ['ws15', 'family', 'zhiji', 'spirit', 'activity'],
    tier: 'flagship',
    recommendedRouteName: 'village',
    focusAreas: ['家庭心愿', '知己协作', '仙灵记忆', '活动联动'],
    smokeChecks: [
      { id: 'relationship_focus', label: '确认家庭心愿、知己项目和仙灵焦点都在页面中可见。' },
      { id: 'activity_bridge', label: '确认关系线能反向影响任务板、摘要或预告。' }
    ],
    runtimeExpectations: {
      player: { minMoney: 86500, requireEconomyTelemetry: true },
      game: { currentLocation: 'village', currentLocationGroup: 'village_area' },
      goal: { minDailyGoals: 1, minSeasonGoals: 1, minWeeklyGoals: 2, minLongTermGoals: 1, minWeeklySnapshots: 1, requireThemeWeek: true },
      museum: { minDonatedItems: 2 },
      wallet: { minTicketTypes: 2 },
      boundaryAction: 'none'
    },
    envelope: createLateEconomyEnvelope()
  }
]
