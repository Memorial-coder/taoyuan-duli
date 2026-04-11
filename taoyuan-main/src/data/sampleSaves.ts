export interface BuiltInSampleSaveDef {
  id: string
  label: string
  description: string
  tags: string[]
  envelope: Record<string, any>
}

const SAVE_VERSION = 2

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

const createEconomyTelemetry = (currentSegmentId: string, recentSnapshots: Array<Record<string, any>>, incomeTotal: number, expenseTotal: number, sinkTotal: number) => ({
  saveVersion: 1,
  lastAuditDayTag: recentSnapshots[recentSnapshots.length - 1]?.dayTag ?? '',
  currentSegmentId,
  recentSnapshots,
  lifetimeIncome: { total: incomeTotal, bySystem: { shop: Math.round(incomeTotal * 0.45), quest: Math.round(incomeTotal * 0.2), market: Math.round(incomeTotal * 0.25), goal: Math.round(incomeTotal * 0.1) } },
  lifetimeExpense: { total: expenseTotal, bySystem: { shop: Math.round(expenseTotal * 0.35), villageProject: Math.round(expenseTotal * 0.25), system: Math.round(expenseTotal * 0.2), market: Math.round(expenseTotal * 0.2) } },
  lifetimeSinkSpend: { total: sinkTotal, byCategory: { luxuryCatalog: Math.round(sinkTotal * 0.4), maintenance: Math.round(sinkTotal * 0.35), service: Math.round(sinkTotal * 0.25) } },
  latestRiskReport: null
})

const createBaseEnvelope = (options: {
  playerName: string
  gender?: 'male' | 'female'
  money: number
  year: number
  season: 'spring' | 'summer' | 'autumn' | 'winter'
  day: number
  farmMapType?: 'standard' | 'riverland' | 'forest' | 'hilltop' | 'wilderness'
  inventoryItems?: Array<{ itemId: string; quantity: number; quality?: 'normal' | 'fine' | 'excellent' | 'supreme' }>
  extraData?: Record<string, any>
}) => {
  const size = 4
  return {
    meta: {
      saveVersion: SAVE_VERSION,
      savedAt: '2026-04-10T12:00:00.000Z'
    },
    data: {
      game: {
        year: options.year,
        season: options.season,
        day: options.day,
        hour: 8,
        weather: 'sunny',
        tomorrowWeather: 'sunny',
        currentLocation: 'farm',
        currentLocationGroup: 'farm',
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
        items: (options.inventoryItems ?? []).map(item => ({ itemId: item.itemId, quantity: item.quantity, quality: item.quality ?? 'normal' })),
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
  { dayTag: '2-autumn-15', disposableMoney: 72000, totalIncome: 9800, totalExpense: 4100, sinkSpend: 2300, dominantIncomeSystem: 'shop', participatingSystems: ['shop', 'market', 'quest'], highValueOrderTypes: 2, incomeBySystem: { shop: 5200, market: 2600, quest: 2000 }, expenseBySystem: { shop: 1800, system: 900, villageProject: 1400 }, activeSinkCategories: ['luxuryCatalog', 'service'] },
  { dayTag: '2-autumn-16', disposableMoney: 75800, totalIncome: 8400, totalExpense: 3600, sinkSpend: 1800, dominantIncomeSystem: 'market', participatingSystems: ['market', 'goal', 'quest'], highValueOrderTypes: 2, incomeBySystem: { market: 4200, shop: 1900, quest: 2300 }, expenseBySystem: { shop: 1200, market: 800, system: 1600 }, activeSinkCategories: ['maintenance'] },
  { dayTag: '2-autumn-17', disposableMoney: 79600, totalIncome: 9100, totalExpense: 4400, sinkSpend: 2400, dominantIncomeSystem: 'shop', participatingSystems: ['shop', 'goal', 'market'], highValueOrderTypes: 3, incomeBySystem: { shop: 4700, market: 2100, goal: 2300 }, expenseBySystem: { shop: 2100, villageProject: 1200, system: 1100 }, activeSinkCategories: ['luxuryCatalog', 'maintenance'] },
  { dayTag: '2-autumn-18', disposableMoney: 83500, totalIncome: 10200, totalExpense: 3900, sinkSpend: 1900, dominantIncomeSystem: 'shop', participatingSystems: ['shop', 'market', 'goal', 'quest'], highValueOrderTypes: 3, incomeBySystem: { shop: 5600, market: 1900, goal: 1100, quest: 1600 }, expenseBySystem: { shop: 1700, system: 900, villageProject: 1300 }, activeSinkCategories: ['service', 'maintenance'] }
]

export const BUILT_IN_SAMPLE_SAVES: BuiltInSampleSaveDef[] = [
  {
    id: 'late_economy_foundation',
    label: '后期富裕经营档',
    description: '面向后期经济治理、周快照、村庄建设与瀚海联动验证的富裕样例。',
    tags: ['late-game', 'economy', 'weekly-metrics', 'village', 'hanhai'],
    envelope: (() => {
      const envelope = createBaseEnvelope({
        playerName: '富春',
        money: 86500,
        year: 2,
        season: 'autumn',
        day: 19,
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
            mainQuestStage: 4,
            mainQuestStages: [],
            dailyGoals: [],
            seasonGoals: [],
            longTermGoals: [],
            goalReputation: 520,
            lastDailyGoalRefresh: '2-autumn-19',
            lastSeasonGoalRefresh: '2-autumn',
            lastThemeWeekRefresh: '2-autumn-week-3',
            currentThemeWeekState: { id: 'late_sink_rotation', startDay: 15, endDay: 21 },
            weeklyMetricArchive: {
              version: 1,
              lastGeneratedWeekId: '2-autumn-week-2',
              snapshots: [
                {
                  weekId: '2-autumn-week-2',
                  absoluteWeek: 9,
                  year: 2,
                  season: 'autumn',
                  weekOfSeason: 2,
                  generatedAtDayTag: '2-autumn-15',
                  periodStartDayTag: '2-autumn-8',
                  periodEndDayTag: '2-autumn-14',
                  totalIncome: 56600,
                  totalExpense: 24100,
                  netIncome: 32500,
                  sinkSpend: 13100,
                  ticketBalances: {},
                  budgetInvestments: {},
                  maintenanceCost: 0,
                  serviceContractCount: 0,
                  hanhaiContractCompletions: 6,
                  fishPondContestScore: 0,
                  museumExhibitLevel: 12,
                  socialParticipationScore: 7,
                  villageProsperityScore: 29,
                  sourceSnapshotCount: 7,
                  activeThemeWeekId: 'late_sink_rotation'
                }
              ]
            }
          },
          villageProject: {
            projectStates: {
              caravan_station: { completed: true, completedDayTag: '2-summer-12' },
              village_school: { completed: true, completedDayTag: '2-summer-20' },
              hot_spring: { completed: true, completedDayTag: '2-autumn-6' }
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
      return envelope
    })()
  },
  {
    id: 'breeding_specialist',
    label: '育种专项档',
    description: '面向育种图鉴、主题周育种单与高代品系验证的专项样例。',
    tags: ['late-game', 'breeding', 'quest', 'theme-week'],
    envelope: createBaseEnvelope({
      playerName: '青禾',
      gender: 'female',
      money: 36200,
      year: 2,
      season: 'summer',
      day: 14,
      farmMapType: 'forest',
      inventoryItems: [
        { itemId: 'wood', quantity: 90 },
        { itemId: 'charcoal', quantity: 20 },
        { itemId: 'herb', quantity: 18 },
        { itemId: 'food_rice_ball', quantity: 6 }
      ],
      extraData: {
        goal: {
          mainQuestStage: 3,
          mainQuestStages: [],
          dailyGoals: [],
          seasonGoals: [],
          longTermGoals: [],
          goalReputation: 210,
          lastDailyGoalRefresh: '2-summer-14',
          lastSeasonGoalRefresh: '2-summer',
          lastThemeWeekRefresh: '2-summer-week-2',
          currentThemeWeekState: { id: 'summer_fishing', startDay: 8, endDay: 14 },
          weeklyMetricArchive: { version: 1, lastGeneratedWeekId: '', snapshots: [] }
        },
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
          ]
        }
      }
    })
  },
  {
    id: 'fishpond_operator',
    label: '鱼塘经营档',
    description: '面向鱼塘养殖、成熟鱼群、待收取产物与周赛代理值验证的专项样例。',
    tags: ['late-game', 'fishpond', 'weekly-cycle', 'quest'],
    envelope: createBaseEnvelope({
      playerName: '渔歌',
      money: 28400,
      year: 2,
      season: 'summer',
      day: 21,
      farmMapType: 'riverland',
      inventoryItems: [
        { itemId: 'fish_feed', quantity: 40 },
        { itemId: 'water_purifier', quantity: 6 },
        { itemId: 'crab_pot', quantity: 3 },
        { itemId: 'food_rice_ball', quantity: 5 }
      ],
      extraData: {
        fishPond: {
          pond: {
            built: true,
            level: 3,
            fish: [
              { id: 'pf_1', fishId: 'carp', name: '锦鲤鲤鱼', genetics: { growthRate: 1.1, diseaseResist: 1.05, rareChance: 1.1 }, daysInPond: 9, mature: true, sick: false, sickDays: 0, breedId: 'koi_carp' },
              { id: 'pf_2', fishId: 'bass', name: '深鳞鲈鱼', genetics: { growthRate: 1.0, diseaseResist: 1.0, rareChance: 1.05 }, daysInPond: 7, mature: true, sick: false, sickDays: 0, breedId: 'deep_bass' },
              { id: 'pf_3', fishId: 'carp', name: '锦鲤鲤鱼', genetics: { growthRate: 1.08, diseaseResist: 1.03, rareChance: 1.08 }, daysInPond: 8, mature: true, sick: false, sickDays: 0, breedId: 'koi_carp' }
            ],
            waterQuality: 86,
            fedToday: true,
            breeding: null,
            collectedToday: false
          },
          pendingProducts: [{ itemId: 'roe', quantity: 3, quality: 'fine' }],
          discoveredBreeds: ['koi_carp', 'deep_bass'],
          returnedFishPool: {}
        },
        goal: {
          mainQuestStage: 3,
          mainQuestStages: [],
          dailyGoals: [],
          seasonGoals: [],
          longTermGoals: [],
          goalReputation: 160,
          lastDailyGoalRefresh: '2-summer-21',
          lastSeasonGoalRefresh: '2-summer',
          lastThemeWeekRefresh: '2-summer-week-3',
          currentThemeWeekState: { id: 'summer_fishing', startDay: 15, endDay: 21 },
          weeklyMetricArchive: { version: 1, lastGeneratedWeekId: '', snapshots: [] }
        }
      }
    })
  },
  {
    id: 'endgame_showcase',
    label: '终局综合档',
    description: '面向中后期多系统联动、日志、周快照、瀚海、博物馆与村庄繁荣度验证的综合样例。',
    tags: ['endgame', 'economy', 'breeding', 'fishpond', 'museum', 'hanhai', 'village'],
    envelope: createBaseEnvelope({
      playerName: '桃隐',
      money: 188000,
      year: 4,
      season: 'winter',
      day: 20,
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
          ]
        },
        fishPond: {
          pond: {
            built: true,
            level: 4,
            fish: [
              { id: 'pf_showcase_1', fishId: 'carp', name: '锦鲤鲤鱼', genetics: { growthRate: 1.1, diseaseResist: 1.06, rareChance: 1.12 }, daysInPond: 12, mature: true, sick: false, sickDays: 0, breedId: 'koi_carp' },
              { id: 'pf_showcase_2', fishId: 'bass', name: '深鳞鲈鱼', genetics: { growthRate: 1.04, diseaseResist: 1.04, rareChance: 1.08 }, daysInPond: 11, mature: true, sick: false, sickDays: 0, breedId: 'deep_bass' }
            ],
            waterQuality: 90,
            fedToday: true,
            breeding: null,
            collectedToday: false
          },
          pendingProducts: [{ itemId: 'roe', quantity: 4, quality: 'fine' }],
          discoveredBreeds: ['koi_carp', 'deep_bass'],
          returnedFishPool: {}
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
        },
        goal: {
          mainQuestStage: 6,
          mainQuestStages: [],
          dailyGoals: [],
          seasonGoals: [],
          longTermGoals: [],
          goalReputation: 860,
          lastDailyGoalRefresh: '4-winter-20',
          lastSeasonGoalRefresh: '4-winter',
          lastThemeWeekRefresh: '4-winter-week-3',
          currentThemeWeekState: { id: 'winter_mining', startDay: 15, endDay: 21 },
          weeklyMetricArchive: {
            version: 1,
            lastGeneratedWeekId: '4-winter-week-2',
            snapshots: [
              {
                weekId: '4-winter-week-2',
                absoluteWeek: 25,
                year: 4,
                season: 'winter',
                weekOfSeason: 2,
                generatedAtDayTag: '4-winter-15',
                periodStartDayTag: '4-winter-8',
                periodEndDayTag: '4-winter-14',
                totalIncome: 78200,
                totalExpense: 31600,
                netIncome: 46600,
                sinkSpend: 22500,
                ticketBalances: {},
                budgetInvestments: {},
                maintenanceCost: 0,
                serviceContractCount: 0,
                hanhaiContractCompletions: 8,
                fishPondContestScore: 2,
                museumExhibitLevel: 14,
                socialParticipationScore: 10,
                villageProsperityScore: 42,
                sourceSnapshotCount: 7,
                activeThemeWeekId: 'winter_mining'
              }
            ]
          }
        }
      }
    })
  }
]
