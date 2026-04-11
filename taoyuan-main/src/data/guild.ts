import type { EconomyBaselineAuditConfig, MonsterGoalDef, GuildShopItemDef, GuildDonationDef, GuildLevelDef } from '@/types'

/** 怪物讨伐目标 */
export const MONSTER_GOALS: MonsterGoalDef[] = [
  // ===== 浅层 =====
  { monsterId: 'mud_worm', monsterName: '泥虫', zone: 'shallow', killTarget: 25, reward: { money: 200 }, description: '清除浅层的泥虫。' },
  {
    monsterId: 'stone_crab',
    monsterName: '石蟹',
    zone: 'shallow',
    killTarget: 25,
    reward: { money: 300 },
    description: '消灭浅层的石蟹。'
  },
  // ===== 冰霜 =====
  { monsterId: 'ice_bat', monsterName: '冰蝠', zone: 'frost', killTarget: 25, reward: { money: 500 }, description: '击落冰霜层的冰蝠。' },
  { monsterId: 'ghost', monsterName: '幽灵', zone: 'frost', killTarget: 25, reward: { money: 500 }, description: '驱散冰霜层的幽灵。' },
  // ===== 熔岩 =====
  { monsterId: 'fire_bat', monsterName: '火蝠', zone: 'lava', killTarget: 50, reward: { money: 800 }, description: '击退熔岩层的火蝠。' },
  {
    monsterId: 'shadow_warrior',
    monsterName: '暗影武士',
    zone: 'lava',
    killTarget: 50,
    reward: { money: 1000 },
    description: '击败熔岩层的暗影武士。'
  },
  // ===== 水晶 =====
  {
    monsterId: 'crystal_golem',
    monsterName: '水晶魔像',
    zone: 'crystal',
    killTarget: 50,
    reward: { money: 1500 },
    description: '粉碎水晶层的魔像。'
  },
  {
    monsterId: 'prism_spider',
    monsterName: '棱镜蛛',
    zone: 'crystal',
    killTarget: 50,
    reward: { money: 1500 },
    description: '消灭水晶层的棱镜蛛。'
  },
  // ===== 暗影 =====
  {
    monsterId: 'shadow_lurker',
    monsterName: '暗影潜伏者',
    zone: 'shadow',
    killTarget: 75,
    reward: { money: 2000 },
    description: '猎杀暗影层的潜伏者。'
  },
  {
    monsterId: 'void_wraith',
    monsterName: '虚空幽魂',
    zone: 'shadow',
    killTarget: 75,
    reward: { money: 2500 },
    description: '净化暗影层的虚空幽魂。'
  },
  // ===== 深渊 =====
  {
    monsterId: 'abyss_serpent',
    monsterName: '深渊巨蟒',
    zone: 'abyss',
    killTarget: 100,
    reward: { money: 3000 },
    description: '讨伐深渊层的巨蟒。'
  },
  {
    monsterId: 'bone_dragon',
    monsterName: '骨龙',
    zone: 'abyss',
    killTarget: 100,
    reward: { money: 4000 },
    description: '击败深渊层的骨龙。'
  },
  // ===== BOSS =====
  {
    monsterId: 'mud_golem',
    monsterName: '泥岩巨兽',
    zone: 'boss',
    killTarget: 3,
    reward: { money: 500, items: [{ itemId: 'copper_bar', quantity: 10 }] },
    description: '三次击败泥岩巨兽。'
  },
  {
    monsterId: 'frost_queen',
    monsterName: '冰霜女王',
    zone: 'boss',
    killTarget: 3,
    reward: { money: 800, items: [{ itemId: 'iron_bar', quantity: 10 }] },
    description: '三次击败冰霜女王。'
  },
  {
    monsterId: 'lava_lord',
    monsterName: '熔岩君主',
    zone: 'boss',
    killTarget: 3,
    reward: { money: 1500, items: [{ itemId: 'gold_bar', quantity: 10 }] },
    description: '三次击败熔岩君主。'
  },
  {
    monsterId: 'crystal_king',
    monsterName: '水晶之王',
    zone: 'boss',
    killTarget: 3,
    reward: { money: 2500, items: [{ itemId: 'moonstone', quantity: 3 }] },
    description: '三次击败水晶之王。'
  },
  {
    monsterId: 'shadow_sovereign',
    monsterName: '暗影君主',
    zone: 'boss',
    killTarget: 3,
    reward: { money: 4000, items: [{ itemId: 'obsidian', quantity: 3 }] },
    description: '三次击败暗影君主。'
  },
  {
    monsterId: 'abyss_dragon',
    monsterName: '深渊龙王',
    zone: 'boss',
    killTarget: 3,
    reward: { money: 6000, items: [{ itemId: 'dragon_jade', quantity: 2 }] },
    description: '三次击败深渊龙王。'
  },
  // ===== 骷髅矿穴 =====
  {
    monsterId: 'iridium_golem',
    monsterName: '铱金魔像',
    zone: 'skull',
    killTarget: 50,
    reward: { money: 3000 },
    description: '在骷髅矿穴中讨伐铱金魔像。'
  },
  {
    monsterId: 'skull_serpent',
    monsterName: '骷髅飞蛇',
    zone: 'skull',
    killTarget: 50,
    reward: { money: 3000 },
    description: '在骷髅矿穴中消灭骷髅飞蛇。'
  },
  {
    monsterId: 'ancient_mummy',
    monsterName: '远古木乃伊',
    zone: 'skull',
    killTarget: 50,
    reward: { money: 5000 },
    description: '在骷髅矿穴中击败远古木乃伊。'
  }
]

/** 公会商店物品 (与镖局互补，不重复) */
export const GUILD_SHOP_ITEMS: GuildShopItemDef[] = [
  // --- 消耗品（铜钱购买，不限购）---
  { itemId: 'combat_tonic', name: '战斗补剂', price: 200, description: '恢复30点HP。' },
  { itemId: 'adventurer_ration', name: '冒险口粮', price: 350, description: '恢复25体力和25HP。', unlockGuildLevel: 2 },
  { itemId: 'fortify_brew', name: '强化药水', price: 500, description: '恢复60点HP。' },
  { itemId: 'ironhide_potion', name: '铁壁药剂', price: 800, description: '恢复全部HP。' },
  { itemId: 'warriors_feast', name: '勇者盛宴', price: 1000, description: '恢复50体力和50HP。', unlockGuildLevel: 5 },
  { itemId: 'slayer_charm', name: '猎魔符', price: 1500, description: '怪物掉落率+20%（当次探索）。', unlockGuildLevel: 3 },
  { itemId: 'stamina_elixir', name: '精力药剂', price: 600, description: '恢复120点体力。', unlockGuildLevel: 4 },
  { itemId: 'monster_lure', name: '怪物诱饵', price: 2000, description: '本层怪物数量翻倍。', unlockGuildLevel: 7 },
  // --- 装备（贡献点+材料，限购1件）---
  {
    itemId: 'guild_war_ring',
    name: '公会战戒',
    price: 0,
    contributionCost: 200,
    description: '攻击+4，防御+6%。',
    unlockGuildLevel: 5,
    totalLimit: 1,
    equipType: 'ring',
    materials: [
      { itemId: 'gold_bar', quantity: 5 },
      { itemId: 'ruby', quantity: 2 }
    ]
  },
  {
    itemId: 'guild_war_helm',
    name: '公会战盔',
    price: 0,
    contributionCost: 250,
    description: '攻击+3，HP+15。',
    unlockGuildLevel: 6,
    totalLimit: 1,
    equipType: 'hat',
    materials: [
      { itemId: 'gold_bar', quantity: 5 },
      { itemId: 'moonstone', quantity: 1 }
    ]
  },
  {
    itemId: 'guild_war_boots',
    name: '公会战靴',
    price: 0,
    contributionCost: 250,
    description: '攻击+2，防御+5%，移速+10%。',
    unlockGuildLevel: 7,
    totalLimit: 1,
    equipType: 'shoe',
    materials: [
      { itemId: 'gold_bar', quantity: 5 },
      { itemId: 'obsidian', quantity: 1 }
    ]
  },
  {
    itemId: 'guild_war_blade',
    name: '公会战刃',
    price: 0,
    contributionCost: 350,
    description: '攻击力36，暴击率10%。',
    unlockGuildLevel: 9,
    totalLimit: 1,
    equipType: 'weapon',
    materials: [
      { itemId: 'gold_bar', quantity: 10 },
      { itemId: 'dragon_jade', quantity: 1 }
    ]
  },
  // --- 永久品（贡献点购买，每日限购）---
  {
    itemId: 'guild_badge',
    name: '公会徽章',
    price: 0,
    contributionCost: 150,
    description: '攻击力永久+3。',
    unlockGuildLevel: 6,
    dailyLimit: 1
  },
  {
    itemId: 'life_talisman',
    name: '生命护符',
    price: 0,
    contributionCost: 200,
    description: '最大生命值永久+15。',
    unlockGuildLevel: 8,
    dailyLimit: 1,
    totalLimit: 100
  },
  {
    itemId: 'defense_charm',
    name: '守护符',
    price: 0,
    contributionCost: 180,
    description: '防御永久+3%。',
    unlockGuildLevel: 7,
    weeklyLimit: 3,
    totalLimit: 10
  },
  {
    itemId: 'lucky_coin',
    name: '幸运铜钱',
    price: 0,
    contributionCost: 300,
    description: '怪物掉落率永久+5%。',
    unlockGuildLevel: 10,
    weeklyLimit: 3,
    totalLimit: 10
  }
]

/** 捐献物品表 */
export const GUILD_DONATIONS: GuildDonationDef[] = [
  // 矿石
  { itemId: 'copper_ore', points: 2 },
  { itemId: 'iron_ore', points: 4 },
  { itemId: 'gold_ore', points: 8 },
  { itemId: 'crystal_ore', points: 12 },
  { itemId: 'shadow_ore', points: 18 },
  { itemId: 'void_ore', points: 25 },
  { itemId: 'iridium_ore', points: 35 },
  // 宝石
  { itemId: 'quartz', points: 4 },
  { itemId: 'jade', points: 12 },
  { itemId: 'ruby', points: 18 },
  { itemId: 'moonstone', points: 25 },
  { itemId: 'obsidian', points: 35 },
  { itemId: 'dragon_jade', points: 50 },
  { itemId: 'prismatic_shard', points: 80 }
]

/** 公会等级表（10级） */
export const GUILD_LEVELS: GuildLevelDef[] = [
  { level: 1, expRequired: 100 },
  { level: 2, expRequired: 300 },
  { level: 3, expRequired: 600 },
  { level: 4, expRequired: 1000 },
  { level: 5, expRequired: 1500 },
  { level: 6, expRequired: 2200 },
  { level: 7, expRequired: 3000 },
  { level: 8, expRequired: 4000 },
  { level: 9, expRequired: 5500 },
  { level: 10, expRequired: 7500 }
]

/** 每公会等级的被动增益 */
export const GUILD_BONUS_PER_LEVEL = {
  attack: 1, // 每级+1攻击力
  maxHp: 5 // 每级+5最大生命值
}

export const GUILD_SEASON_PVE_AUDIT: EconomyBaselineAuditConfig = {
  id: 'ws07_t061_guild_season_pve_audit',
  workstreamId: 'WS07-T061',
  label: '公会赛季化与轻竞争 PVE 基线审计',
  summary: '以现有讨伐目标、公会商店与捐献循环为基线，为赛季讨伐、荣誉称号、异步排行、结算邮件和全服共建里程碑建立统一 KPI 口径，并确保轻竞争不破坏单机主进度公平。',
  focusAreas: ['赛季周活', '赛季完成率', '异步榜参与度', '公会商店回收', '公平护栏与单一路线风险'],
  coreMetrics: [
    {
      id: 'ws07_weekly_active_guild_hunters',
      label: '公会周活率',
      description: '衡量进入公会中后期后，玩家是否持续把讨伐、捐献、公会商店与周目标当作稳定周循环，而不是只在解锁时短暂体验。',
      formula: '近7日内满足任一公会行为（recordKill、claimGoal、donateItem、buyShopItem、完成公会主题 goal）的玩家数 ÷ 近7日内后期公会样本玩家数',
      direction: 'lower_is_worse',
      dataSources: ['useGuildStore.monsterKills', 'useGuildStore.claimedGoals', 'useGuildStore.contributionPoints', 'useGoalStore.currentGoals', 'useAchievementStore.stats.totalMoneyEarned'],
      thresholds: { watch: 0.62, warning: 0.5, critical: 0.38 },
      anomalyRule: '若样本量少于20个存档，仅做趋势观察；若版本首周碰到季节切换或矿洞阶段性卡层，需拆分新老后期样本分别看。'
    },
    {
      id: 'ws07_season_hunt_completion_rate',
      label: '赛季讨伐完成率',
      description: '验证赛季讨伐目标是否清晰、可准备、可在单机节奏内完成，避免赛季只停留在口号层。',
      formula: '近28日内已达成赛季讨伐目标并领取阶段奖励的玩家数 ÷ 近28日内进入对应赛季公会循环的玩家数',
      direction: 'lower_is_worse',
      dataSources: ['useGuildStore.claimedGoals', 'useGuildStore.completedGoalCount', 'MONSTER_GOALS.killTarget', 'useGoalStore.weeklyMetricArchive'],
      thresholds: { watch: 0.58, warning: 0.45, critical: 0.32 },
      anomalyRule: '若当期新增 boss / skull 档目标占比超过50%，需拆分浅层、中层、深层三档完成率，避免难度抬升误判整体表现。'
    },
    {
      id: 'ws07_async_rank_participation_rate',
      label: '异步榜参与率',
      description: '衡量轻排行是否真正吸引玩家参与周度比拼，同时保持单机与轻竞争边界，不演化成强制实时对抗。',
      formula: '近14日内至少在2个不同周窗中留下有效公会积分快照的玩家数 ÷ 近14日内后期公会样本玩家数',
      direction: 'lower_is_worse',
      dataSources: ['useGuildStore.monsterKills', 'useGuildStore.guildExp', 'useGoalStore.weeklyMetricArchive', 'useQuestStore.completedQuestCount'],
      thresholds: { watch: 0.42, warning: 0.3, critical: 0.22 },
      anomalyRule: '若周结窗口缩短、测试存档批量导入或只统计到单周数据，应标记为低可信榜单样本，不直接据此改奖励。'
    },
    {
      id: 'ws07_guild_shop_sink_absorption_rate',
      label: '公会商店回收量',
      description: '衡量贡献点、铜钱与高阶矿物是否通过公会商店形成稳定回收，而不是奖励发完后再次堆积。',
      formula: '近14日 guild 商店消费的 contributionCost 折算值 + 铜钱 price 总额 + 材料折算值 ÷ 近14日公会循环总产出价值',
      direction: 'target_range',
      dataSources: ['GUILD_SHOP_ITEMS.price', 'GUILD_SHOP_ITEMS.contributionCost', 'GUILD_SHOP_ITEMS.materials', 'useGuildStore.buyShopItem', 'useMiningStore.sessionLoot'],
      thresholds: { targetMin: 0.22, targetMax: 0.46, warning: 0.56, critical: 0.68 },
      anomalyRule: '低于目标下限说明商店吸引力不足或贡献点出口太少；高于 warning 说明公会商店可能挤压任务、主题周与普通成长线资源。'
    }
  ],
  guardrailMetrics: [
    {
      id: 'ws07_mining_monopoly_rate',
      label: '矿洞垄断占比',
      description: '防止公会赛季化把玩家重新推回单刷矿洞的唯一最优解，削弱目标、委托与成就协同。',
      formula: '近14日公会相关收益中来自 useMiningStore 战斗/掉落/ boss 奖励的价值 ÷ 近14日公会循环总收益价值',
      direction: 'higher_is_worse',
      dataSources: ['useMiningStore.sessionLoot', 'useGuildStore.claimGoal', 'useQuestStore.activeQuests', 'useAchievementStore.stats.totalMonstersKilled'],
      thresholds: { watch: 0.7, warning: 0.8, critical: 0.88 },
      anomalyRule: '若新赛季首周主推讨伐主题，可接受一次 watch；连续两周达到 warning 需补任务、成就或商店侧联动，不应继续加纯击杀奖励。'
    },
    {
      id: 'ws07_fairness_reward_gap_rate',
      label: '轻竞争公平差',
      description: '确保异步排行和赛季称号提供的是荣誉与轻度经营偏置，而不是拉大单机主进度差距。',
      formula: '近28日榜单前10%玩家与后50%玩家的公会额外收益差值 ÷ 后50%玩家近28日主线经营总收益',
      direction: 'higher_is_worse',
      dataSources: ['useGuildStore.buyShopItem', 'useGuildStore.getGuildAttackBonus', 'useGuildStore.getGuildHpBonus', 'useGoalStore.currentThemeWeek', 'useQuestStore.completedQuestCount'],
      thresholds: { watch: 0.18, warning: 0.26, critical: 0.35 },
      anomalyRule: '若差值主要来自一次性首通 boss 或永久装备首购，要剔除首通红利后再看；连续超标说明奖励越界到主进度。'
    }
  ],
  playerSegments: [
    {
      id: 'ws07_segment_midcore_commissioner',
      label: '中期公会委托玩家',
      description: '已解锁稳定矿洞循环和任务板，开始把讨伐奖励、捐献与补给采购串成每周节奏。',
      disposableMoneyMin: 12000,
      inflationPressureMin: 4,
      recommendedFocus: '优先观察周活率与商店回收量，确认公会入口能否成为稳定周目标，而不是一次性领奖点。'
    },
    {
      id: 'ws07_segment_late_honor_builder',
      label: '后期荣誉构筑玩家',
      description: '已经进入深层矿洞与高阶装备阶段，愿意为称号、榜单留名与阶段荣誉投入材料和时间。',
      disposableMoneyMin: 35000,
      inflationPressureMin: 9,
      recommendedFocus: '重点看赛季讨伐完成率、异步榜参与率，以及奖励是否仍保持轻竞争而不破坏单机主线。'
    },
    {
      id: 'ws07_segment_endgame_pve_captain',
      label: '终局轻竞争 PVE 玩家',
      description: '已能稳定处理 boss / skull 档讨伐，更关注跨周累积、异步排行与多系统联动，而非单次收益。',
      disposableMoneyMin: 70000,
      inflationPressureMin: 14,
      recommendedFocus: '重点看矿洞垄断占比与公平差，确保终局赛季化是在放大长期追求，而不是制造强制内卷。'
    }
  ],
  rollbackRules: [
    {
      id: 'ws07_guild_season_soft_rollback',
      label: '公会赛季化软回滚',
      condition: '连续2个周结窗口中 ws07_season_hunt_completion_rate ≤ 0.32，且 ws07_fairness_reward_gap_rate ≥ 0.35',
      fallbackAction: '暂停赛季榜单额外奖励与高梯度 boss 讨伐权重，回退到常驻公会讨伐 + 低梯度周目标池，仅保留称号展示和已获得奖励，不追缴已发放资源。'
    }
  ],
  linkedSystems: ['goal', 'quest', 'achievement', 'system'],
  linkedSystemRefs: [
    {
      system: 'goal',
      storeId: 'useGoalStore',
      touchpoints: ['currentThemeWeek', 'currentGoals', 'weeklyMetricArchive'],
      rationale: '公会赛季周活、异步榜参与和讨伐主题周的节奏都需要目标系统提供周窗、主题偏置与周结快照口径。'
    },
    {
      system: 'quest',
      storeId: 'useQuestStore',
      touchpoints: ['activeQuests', 'completedQuestCount', 'generateSpecialOrder / 任务板节奏'],
      rationale: 'T061 需要验证公会赛季化是否真的带动委托参与和周目标切换，而不是把玩家从任务系统完全吸走。'
    },
    {
      system: 'system',
      storeId: 'useMiningStore',
      touchpoints: ['recordMonsterKill / sessionLoot', 'boss / skull 档推进', '公会讨伐目标击杀来源'],
      rationale: '公会讨伐的基础供给来自矿洞战斗，因此要同时监控矿洞垄断风险，防止季节化后重新出现单刷最优解。'
    },
    {
      system: 'achievement',
      storeId: 'useAchievementStore',
      touchpoints: ['stats.totalMonstersKilled', 'guildGoalsCompleted 条件', 'totalMoneyEarned / highestMineFloor 统计'],
      rationale: '样本分层、长期进度和跨系统完成证明都依赖成就统计口径，便于后续统一比较赛季前后行为变化。'
    }
  ]
}

/** 根据怪物ID查找讨伐目标 */
export const getMonsterGoal = (monsterId: string): MonsterGoalDef | undefined => MONSTER_GOALS.find(g => g.monsterId === monsterId)
