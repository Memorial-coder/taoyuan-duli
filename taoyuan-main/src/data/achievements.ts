import type { AchievementDef, CommunityBundleDef } from '@/types'

/** 成就列表 */
export const ACHIEVEMENTS: AchievementDef[] = [
  // 收集
  {
    id: 'collector_10',
    name: '初出茅庐',
    description: '发现10种不同物品。',
    condition: { type: 'itemCount', count: 10 },
    reward: { money: 200 }
  },
  {
    id: 'collector_30',
    name: '博物学家',
    description: '发现30种不同物品。',
    condition: { type: 'itemCount', count: 30 },
    reward: { money: 500 }
  },
  {
    id: 'collector_60',
    name: '万物通鉴',
    description: '发现60种不同物品。',
    condition: { type: 'itemCount', count: 60 },
    reward: { money: 1500 }
  },
  // 农耕
  {
    id: 'farmer_50',
    name: '辛勤农夫',
    description: '累计收获50次作物。',
    condition: { type: 'cropHarvest', count: 50 },
    reward: { money: 300 }
  },
  {
    id: 'farmer_200',
    name: '丰收之王',
    description: '累计收获200次作物。',
    condition: { type: 'cropHarvest', count: 200 },
    reward: { money: 1000, items: [{ itemId: 'compost', quantity: 10 }] }
  },
  // 钓鱼
  {
    id: 'fisher_20',
    name: '垂钓新手',
    description: '累计钓到20条鱼。',
    condition: { type: 'fishCaught', count: 20 },
    reward: { money: 200 }
  },
  {
    id: 'fisher_100',
    name: '渔翁',
    description: '累计钓到100条鱼。',
    condition: { type: 'fishCaught', count: 100 },
    reward: { money: 800 }
  },
  // 挖矿
  {
    id: 'miner_15',
    name: '矿洞探索者',
    description: '到达矿洞第15层。',
    condition: { type: 'mineFloor', floor: 15 },
    reward: { money: 300 }
  },
  {
    id: 'miner_30',
    name: '深渊矿工',
    description: '到达矿洞第30层。',
    condition: { type: 'mineFloor', floor: 30 },
    reward: { money: 1000, items: [{ itemId: 'gold_ore', quantity: 10 }] }
  },
  {
    id: 'miner_60',
    name: '熔岩征服者',
    description: '到达矿洞第60层。',
    condition: { type: 'mineFloor', floor: 60 },
    reward: { money: 2000, items: [{ itemId: 'gold_ore', quantity: 20 }] }
  },
  {
    id: 'miner_120',
    name: '深渊行者',
    description: '到达矿洞最底层。',
    title: '深渊之主',
    condition: { type: 'mineFloor', floor: 120 },
    reward: { money: 5000, items: [{ itemId: 'void_ore', quantity: 10 }] }
  },
  {
    id: 'skull_25',
    name: '骷髅探险家',
    description: '骷髅矿穴到达第25层。',
    condition: { type: 'skullCavernFloor', floor: 25 },
    reward: { money: 3000, items: [{ itemId: 'iridium_ore', quantity: 5 }] }
  },
  {
    id: 'skull_100',
    name: '深渊勇者',
    description: '骷髅矿穴到达第100层。',
    condition: { type: 'skullCavernFloor', floor: 100 },
    reward: { money: 10000, items: [{ itemId: 'prismatic_shard', quantity: 1 }] }
  },
  // 金钱
  {
    id: 'rich_5000',
    name: '小康之家',
    description: '累计获得5000文。',
    condition: { type: 'moneyEarned', amount: 5000 },
    reward: { money: 500 }
  },
  {
    id: 'rich_20000',
    name: '桃源首富',
    description: '累计获得20000文。',
    condition: { type: 'moneyEarned', amount: 20000 },
    reward: { money: 2000 }
  },
  // 烹饪
  {
    id: 'chef_10',
    name: '厨艺初成',
    description: '累计烹饪10道菜。',
    condition: { type: 'recipesCooked', count: 10 },
    reward: { money: 300 }
  },
  {
    id: 'chef_50',
    name: '美食大师',
    description: '累计烹饪50道菜。',
    condition: { type: 'recipesCooked', count: 50 },
    reward: { money: 1000 }
  },
  // 技能
  {
    id: 'skill_master',
    name: '技艺精通',
    description: '种植技能达到10级。',
    condition: { type: 'skillLevel', skillType: 'farming', level: 10 },
    reward: { money: 2000 }
  },
  // 社交
  {
    id: 'social_friend',
    name: '好人缘',
    description: '与所有村民成为"相识"。',
    condition: { type: 'npcFriendship', level: 'acquaintance' },
    reward: { money: 500 }
  },
  // 任务
  {
    id: 'quest_10',
    name: '乡里热心人',
    description: '累计完成10个委托任务。',
    condition: { type: 'questsCompleted', count: 10 },
    reward: { money: 500 }
  },
  {
    id: 'quest_40',
    name: '有求必应',
    description: '累计完成40个委托任务。',
    condition: { type: 'questsCompleted', count: 40 },
    reward: { money: 2500 }
  },
  // 好感
  {
    id: 'friend_best',
    name: '知己',
    description: '与1位村民成为挚友。',
    condition: { type: 'npcBestFriend', count: 1 },
    reward: { money: 200 }
  },
  {
    id: 'friend_all_friendly',
    name: '桃源之友',
    description: '与所有村民成为朋友。',
    condition: { type: 'npcAllFriendly' },
    reward: { money: 1000, items: [{ itemId: 'jade_ring', quantity: 1 }] }
  },
  // 婚姻 & 子女
  {
    id: 'married',
    name: '百年好合',
    description: '与心仪之人结为夫妇。',
    condition: { type: 'married' },
    reward: { money: 1314 }
  },
  {
    id: 'parent',
    name: '天伦之乐',
    description: '迎来第一个孩子。',
    condition: { type: 'hasChild' },
    reward: { money: 520 }
  },
  // 怪物击杀
  {
    id: 'slayer_50',
    name: '除魔新手',
    description: '累计击杀50只怪物。',
    condition: { type: 'monstersKilled', count: 50 },
    reward: { money: 300 }
  },
  {
    id: 'slayer_200',
    name: '降妖能手',
    description: '累计击杀200只怪物。',
    condition: { type: 'monstersKilled', count: 200 },
    reward: { money: 1000 }
  },
  {
    id: 'slayer_500',
    name: '斩妖除魔',
    description: '累计击杀500只怪物。',
    condition: { type: 'monstersKilled', count: 500 },
    reward: { money: 3000 }
  },
  {
    id: 'slayer_1000',
    name: '万魔之敌',
    description: '累计击杀1000只怪物。',
    condition: { type: 'monstersKilled', count: 1000 },
    reward: { money: 5000, items: [{ itemId: 'prismatic_shard', quantity: 1 }] }
  },
  // 出货
  {
    id: 'shipper_10',
    name: '初入商途',
    description: '出货10种不同物品。',
    condition: { type: 'shippedCount', count: 10 },
    reward: { money: 300 }
  },
  {
    id: 'shipper_30',
    name: '物流达人',
    description: '出货30种不同物品。',
    condition: { type: 'shippedCount', count: 30 },
    reward: { money: 1000 }
  },
  {
    id: 'full_shipment',
    name: '出货全鉴',
    description: '出货所有可出货物品。',
    condition: { type: 'fullShipment' },
    reward: { money: 5000 }
  },
  // 畜牧
  {
    id: 'rancher_5',
    name: '畜牧新手',
    description: '拥有5只牲畜。',
    condition: { type: 'animalCount', count: 5 },
    reward: { money: 500 }
  },
  {
    id: 'rancher_15',
    name: '牧场主',
    description: '拥有15只牲畜。',
    condition: { type: 'animalCount', count: 15 },
    reward: { money: 2000 }
  },
  // 更高金钱
  {
    id: 'rich_50000',
    name: '富甲一方',
    description: '累计获得50000文。',
    condition: { type: 'moneyEarned', amount: 50000 },
    reward: { money: 3000 }
  },
  {
    id: 'rich_200000',
    name: '陶朱之富',
    description: '累计获得200000文。',
    condition: { type: 'moneyEarned', amount: 200000 },
    reward: { money: 10000 }
  },
  // 更多农耕 & 钓鱼
  {
    id: 'farmer_500',
    name: '田园大亨',
    description: '累计收获500次作物。',
    condition: { type: 'cropHarvest', count: 500 },
    reward: { money: 2000 }
  },
  {
    id: 'fisher_200',
    name: '海龙王',
    description: '累计钓到200条鱼。',
    condition: { type: 'fishCaught', count: 200 },
    reward: { money: 2000 }
  },
  // 全技能 & 全祠堂
  {
    id: 'all_skills',
    name: '全能大师',
    description: '所有技能达到20级。',
    condition: { type: 'allSkillsMax' },
    reward: { money: 5000 }
  },
  {
    id: 'all_bundles',
    name: '乡情圆满',
    description: '完成所有祠堂任务。',
    condition: { type: 'allBundlesComplete' },
    reward: { money: 5000 }
  },
  // 更多收集 & 烹饪 & 委托 & 好感
  {
    id: 'collector_100',
    name: '博物全才',
    description: '发现100种不同物品。',
    condition: { type: 'itemCount', count: 100 },
    reward: { money: 3000 }
  },
  {
    id: 'chef_100',
    name: '御厨',
    description: '累计烹饪100道菜。',
    condition: { type: 'recipesCooked', count: 100 },
    reward: { money: 2000 }
  },
  {
    id: 'quest_80',
    name: '百事通',
    description: '累计完成80个委托任务。',
    condition: { type: 'questsCompleted', count: 80 },
    reward: { money: 3000 }
  },
  {
    id: 'friend_all_best',
    name: '人间至友',
    description: '与6位村民成为挚友。',
    condition: { type: 'npcBestFriend', count: 6 },
    reward: { money: 3000, items: [{ itemId: 'jade_ring', quantity: 1 }] }
  },
  // 收集
  {
    id: 'collector_5',
    name: '好奇宝宝',
    description: '发现5种不同物品。',
    condition: { type: 'itemCount', count: 5 },
    reward: { money: 100 }
  },
  {
    id: 'collector_20',
    name: '见多识广',
    description: '发现20种不同物品。',
    condition: { type: 'itemCount', count: 20 },
    reward: { money: 300 }
  },
  {
    id: 'collector_45',
    name: '物华天宝',
    description: '发现45种不同物品。',
    condition: { type: 'itemCount', count: 45 },
    reward: { money: 800 }
  },
  {
    id: 'collector_80',
    name: '百科全书',
    description: '发现80种不同物品。',
    condition: { type: 'itemCount', count: 80 },
    reward: { money: 2000 }
  },
  {
    id: 'collector_120',
    name: '天地万物',
    description: '发现120种不同物品。',
    condition: { type: 'itemCount', count: 120 },
    reward: { money: 5000 }
  },
  {
    id: 'collector_150',
    name: '全知全能',
    description: '发现150种不同物品。',
    condition: { type: 'itemCount', count: 150 },
    reward: { money: 8000, items: [{ itemId: 'prismatic_shard', quantity: 1 }] }
  },

  // 农耕
  {
    id: 'farmer_10',
    name: '新手耕耘',
    description: '累计收获10次作物。',
    condition: { type: 'cropHarvest', count: 10 },
    reward: { money: 100 }
  },
  {
    id: 'farmer_100',
    name: '精耕细作',
    description: '累计收获100次作物。',
    condition: { type: 'cropHarvest', count: 100 },
    reward: { money: 500 }
  },
  {
    id: 'farmer_1000',
    name: '田园传奇',
    description: '累计收获1000次作物。',
    condition: { type: 'cropHarvest', count: 1000 },
    reward: { money: 5000, items: [{ itemId: 'iridium_ore', quantity: 5 }] }
  },

  // 钓鱼
  {
    id: 'fisher_5',
    name: '河边少年',
    description: '累计钓到5条鱼。',
    condition: { type: 'fishCaught', count: 5 },
    reward: { money: 100 }
  },
  {
    id: 'fisher_50',
    name: '钓翁之意',
    description: '累计钓到50条鱼。',
    condition: { type: 'fishCaught', count: 50 },
    reward: { money: 500 }
  },
  {
    id: 'fisher_500',
    name: '鱼龙百变',
    description: '累计钓到500条鱼。',
    condition: { type: 'fishCaught', count: 500 },
    reward: { money: 5000, items: [{ itemId: 'prismatic_shard', quantity: 1 }] }
  },

  // 金钱
  {
    id: 'rich_1000',
    name: '初有积蓄',
    description: '累计获得1000文。',
    condition: { type: 'moneyEarned', amount: 1000 },
    reward: { money: 100 }
  },
  {
    id: 'rich_10000',
    name: '锦衣玉食',
    description: '累计获得10000文。',
    condition: { type: 'moneyEarned', amount: 10000 },
    reward: { money: 1000 }
  },
  {
    id: 'rich_100000',
    name: '家财万贯',
    description: '累计获得100000文。',
    condition: { type: 'moneyEarned', amount: 100000 },
    reward: { money: 5000 }
  },
  {
    id: 'rich_500000',
    name: '富可敌国',
    description: '累计获得500000文。',
    condition: { type: 'moneyEarned', amount: 500000 },
    reward: { money: 15000 }
  },
  {
    id: 'rich_1000000',
    name: '金山银海',
    description: '累计获得1000000文。',
    condition: { type: 'moneyEarned', amount: 1000000 },
    reward: { money: 30000, items: [{ itemId: 'prismatic_shard', quantity: 3 }] }
  },

  // 烹饪
  {
    id: 'chef_5',
    name: '初学厨艺',
    description: '累计烹饪5道菜。',
    condition: { type: 'recipesCooked', count: 5 },
    reward: { money: 100 }
  },
  {
    id: 'chef_25',
    name: '灶前好手',
    description: '累计烹饪25道菜。',
    condition: { type: 'recipesCooked', count: 25 },
    reward: { money: 500 }
  },
  {
    id: 'chef_75',
    name: '食神传人',
    description: '累计烹饪75道菜。',
    condition: { type: 'recipesCooked', count: 75 },
    reward: { money: 1500 }
  },

  // 委托
  {
    id: 'quest_5',
    name: '助人为乐',
    description: '累计完成5个委托任务。',
    condition: { type: 'questsCompleted', count: 5 },
    reward: { money: 200 }
  },
  {
    id: 'quest_20',
    name: '信使达人',
    description: '累计完成20个委托任务。',
    condition: { type: 'questsCompleted', count: 20 },
    reward: { money: 1000 }
  },
  {
    id: 'quest_60',
    name: '使命必达',
    description: '累计完成60个委托任务。',
    condition: { type: 'questsCompleted', count: 60 },
    reward: { money: 2000 }
  },
  {
    id: 'quest_100',
    name: '万事通达',
    description: '累计完成100个委托任务。',
    condition: { type: 'questsCompleted', count: 100 },
    reward: { money: 5000, items: [{ itemId: 'dragon_jade', quantity: 1 }] }
  },

  // 怪物击杀
  {
    id: 'slayer_10',
    name: '初试身手',
    description: '累计击杀10只怪物。',
    condition: { type: 'monstersKilled', count: 10 },
    reward: { money: 100 }
  },
  {
    id: 'slayer_100',
    name: '除暴安良',
    description: '累计击杀100只怪物。',
    condition: { type: 'monstersKilled', count: 100 },
    reward: { money: 500 }
  },
  {
    id: 'slayer_300',
    name: '妖魔克星',
    description: '累计击杀300只怪物。',
    condition: { type: 'monstersKilled', count: 300 },
    reward: { money: 2000 }
  },
  {
    id: 'slayer_2000',
    name: '旷世魔猎',
    description: '累计击杀2000只怪物。',
    condition: { type: 'monstersKilled', count: 2000 },
    reward: { money: 10000, items: [{ itemId: 'dragon_jade', quantity: 2 }] }
  },

  // 出货
  {
    id: 'shipper_5',
    name: '初尝贸易',
    description: '出货5种不同物品。',
    condition: { type: 'shippedCount', count: 5 },
    reward: { money: 100 }
  },
  {
    id: 'shipper_20',
    name: '商路通达',
    description: '出货20种不同物品。',
    condition: { type: 'shippedCount', count: 20 },
    reward: { money: 500 }
  },
  {
    id: 'shipper_50',
    name: '贸易大亨',
    description: '出货50种不同物品。',
    condition: { type: 'shippedCount', count: 50 },
    reward: { money: 2000 }
  },

  // 畜牧
  {
    id: 'rancher_1',
    name: '初养牲畜',
    description: '拥有1只牲畜。',
    condition: { type: 'animalCount', count: 1 },
    reward: { money: 100 }
  },
  {
    id: 'rancher_3',
    name: '小型牧场',
    description: '拥有3只牲畜。',
    condition: { type: 'animalCount', count: 3 },
    reward: { money: 300 }
  },
  {
    id: 'rancher_10',
    name: '畜牧达人',
    description: '拥有10只牲畜。',
    condition: { type: 'animalCount', count: 10 },
    reward: { money: 1000 }
  },
  {
    id: 'rancher_20',
    name: '牧场传奇',
    description: '拥有20只牲畜。',
    condition: { type: 'animalCount', count: 20 },
    reward: { money: 3000, items: [{ itemId: 'iridium_ore', quantity: 3 }] }
  },

  // 矿洞
  {
    id: 'miner_5',
    name: '初入矿洞',
    description: '到达矿洞第5层。',
    condition: { type: 'mineFloor', floor: 5 },
    reward: { money: 100 }
  },
  {
    id: 'miner_45',
    name: '冰霜矿脉',
    description: '到达矿洞第45层。',
    condition: { type: 'mineFloor', floor: 45 },
    reward: { money: 1500, items: [{ itemId: 'iron_ore', quantity: 15 }] }
  },
  {
    id: 'miner_90',
    name: '水晶洞穴',
    description: '到达矿洞第90层。',
    condition: { type: 'mineFloor', floor: 90 },
    reward: { money: 3000, items: [{ itemId: 'crystal_ore', quantity: 10 }] }
  },
  {
    id: 'miner_100',
    name: '百层勇者',
    description: '到达矿洞第100层。',
    condition: { type: 'mineFloor', floor: 100 },
    reward: { money: 4000, items: [{ itemId: 'shadow_ore', quantity: 5 }] }
  },

  // 骷髅矿穴
  {
    id: 'skull_10',
    name: '骷髅初探',
    description: '骷髅矿穴到达第10层。',
    condition: { type: 'skullCavernFloor', floor: 10 },
    reward: { money: 1000 }
  },
  {
    id: 'skull_50',
    name: '深渊跋涉',
    description: '骷髅矿穴到达第50层。',
    condition: { type: 'skullCavernFloor', floor: 50 },
    reward: { money: 5000, items: [{ itemId: 'iridium_ore', quantity: 10 }] }
  },
  {
    id: 'skull_75',
    name: '冥界行者',
    description: '骷髅矿穴到达第75层。',
    condition: { type: 'skullCavernFloor', floor: 75 },
    reward: { money: 8000, items: [{ itemId: 'dragon_jade', quantity: 1 }] }
  },
  {
    id: 'skull_150',
    name: '无尽深渊',
    description: '骷髅矿穴到达第150层。',
    condition: { type: 'skullCavernFloor', floor: 150 },
    reward: { money: 20000, items: [{ itemId: 'prismatic_shard', quantity: 2 }] }
  },

  // 好感
  {
    id: 'friend_best_2',
    name: '二三知己',
    description: '与2位村民成为挚友。',
    condition: { type: 'npcBestFriend', count: 2 },
    reward: { money: 500 }
  },
  {
    id: 'friend_best_3',
    name: '莫逆之交',
    description: '与3位村民成为挚友。',
    condition: { type: 'npcBestFriend', count: 3 },
    reward: { money: 1000 }
  },
  {
    id: 'friend_best_4',
    name: '四海为友',
    description: '与4位村民成为挚友。',
    condition: { type: 'npcBestFriend', count: 4 },
    reward: { money: 2000 }
  },

  // 社交（补充）
  {
    id: 'social_all_friendly',
    name: '广结善缘',
    description: '与所有村民成为"熟识"。',
    condition: { type: 'npcFriendship', level: 'friendly' },
    reward: { money: 2000 }
  },

  // 技能等级
  {
    id: 'farming_5',
    name: '耕种有道',
    description: '种植技能达到5级。',
    condition: { type: 'skillLevel', skillType: 'farming', level: 5 },
    reward: { money: 300 }
  },
  {
    id: 'foraging_5',
    name: '山林之子',
    description: '采集技能达到5级。',
    condition: { type: 'skillLevel', skillType: 'foraging', level: 5 },
    reward: { money: 300 }
  },
  {
    id: 'foraging_10',
    name: '采集宗师',
    description: '采集技能达到10级。',
    condition: { type: 'skillLevel', skillType: 'foraging', level: 10 },
    reward: { money: 2000 }
  },
  {
    id: 'fishing_5',
    name: '钓术入门',
    description: '钓鱼技能达到5级。',
    condition: { type: 'skillLevel', skillType: 'fishing', level: 5 },
    reward: { money: 300 }
  },
  {
    id: 'fishing_10',
    name: '钓鱼宗师',
    description: '钓鱼技能达到10级。',
    condition: { type: 'skillLevel', skillType: 'fishing', level: 10 },
    reward: { money: 2000 }
  },
  {
    id: 'mining_5',
    name: '矿脉感应',
    description: '采矿技能达到5级。',
    condition: { type: 'skillLevel', skillType: 'mining', level: 5 },
    reward: { money: 300 }
  },
  {
    id: 'mining_10',
    name: '采矿宗师',
    description: '采矿技能达到10级。',
    condition: { type: 'skillLevel', skillType: 'mining', level: 10 },
    reward: { money: 2000 }
  },
  {
    id: 'combat_5',
    name: '初涉江湖',
    description: '战斗技能达到5级。',
    condition: { type: 'skillLevel', skillType: 'combat', level: 5 },
    reward: { money: 300 }
  },
  {
    id: 'combat_10',
    name: '武林高手',
    description: '战斗技能达到10级。',
    condition: { type: 'skillLevel', skillType: 'combat', level: 10 },
    reward: { money: 2000 }
  },

  // 育种
  {
    id: 'breeding_1',
    name: '初涉育种',
    description: '完成1次育种。',
    condition: { type: 'breedingsDone', count: 1 },
    reward: { money: 200 }
  },
  {
    id: 'breeding_10',
    name: '育种学徒',
    description: '累计完成10次育种。',
    condition: { type: 'breedingsDone', count: 10 },
    reward: { money: 500 }
  },
  {
    id: 'breeding_50',
    name: '育种专家',
    description: '累计完成50次育种。',
    condition: { type: 'breedingsDone', count: 50 },
    reward: { money: 2000 }
  },
  {
    id: 'breeding_200',
    name: '育种大师',
    description: '累计完成200次育种。',
    condition: { type: 'breedingsDone', count: 200 },
    reward: { money: 5000 }
  },
  {
    id: 'hybrid_1',
    name: '新品诞生',
    description: '发现1个杂交品种。',
    condition: { type: 'hybridsDiscovered', count: 1 },
    reward: { money: 300 }
  },
  {
    id: 'hybrid_5',
    name: '品种收集者',
    description: '发现5个杂交品种。',
    condition: { type: 'hybridsDiscovered', count: 5 },
    reward: { money: 800 }
  },
  {
    id: 'hybrid_20',
    name: '杂交图鉴',
    description: '发现20个杂交品种。',
    condition: { type: 'hybridsDiscovered', count: 20 },
    reward: { money: 2000 }
  },
  {
    id: 'hybrid_50',
    name: '品种宗师',
    description: '发现50个杂交品种。',
    condition: { type: 'hybridsDiscovered', count: 50 },
    reward: { money: 5000 }
  },
  {
    id: 'hybrid_100',
    name: '万种图录',
    description: '发现100个杂交品种。',
    condition: { type: 'hybridsDiscovered', count: 100 },
    reward: { money: 10000, items: [{ itemId: 'prismatic_shard', quantity: 1 }] }
  },
  {
    id: 'tier_3',
    name: '三代突破',
    description: '培育出三代杂交品种。',
    condition: { type: 'hybridTier', tier: 3 },
    reward: { money: 1000 }
  },
  {
    id: 'tier_5',
    name: '五代传承',
    description: '培育出五代杂交品种。',
    condition: { type: 'hybridTier', tier: 5 },
    reward: { money: 3000 }
  },
  {
    id: 'tier_7',
    name: '七代神品',
    description: '培育出七代杂交品种。',
    condition: { type: 'hybridTier', tier: 7 },
    reward: { money: 5000 }
  },
  {
    id: 'tier_10',
    name: '登峰造极',
    description: '培育出十代杂交品种。',
    condition: { type: 'hybridTier', tier: 10 },
    reward: { money: 15000, items: [{ itemId: 'prismatic_shard', quantity: 2 }] }
  },

  // 育种出货
  {
    id: 'hybrid_ship_1',
    name: '杂交初售',
    description: '出货1种杂交作物。',
    condition: { type: 'hybridsShipped', count: 1 },
    reward: { money: 300 }
  },
  {
    id: 'hybrid_ship_5',
    name: '良种外销',
    description: '出货5种杂交作物。',
    condition: { type: 'hybridsShipped', count: 5 },
    reward: { money: 800 }
  },
  {
    id: 'hybrid_ship_15',
    name: '杂交商人',
    description: '出货15种杂交作物。',
    condition: { type: 'hybridsShipped', count: 15 },
    reward: { money: 2000 }
  },
  {
    id: 'hybrid_ship_30',
    name: '良种流通',
    description: '出货30种杂交作物。',
    condition: { type: 'hybridsShipped', count: 30 },
    reward: { money: 5000 }
  },
  {
    id: 'hybrid_ship_50',
    name: '杂交出货全鉴',
    description: '出货50种杂交作物。',
    condition: { type: 'hybridsShipped', count: 50 },
    reward: { money: 10000, items: [{ itemId: 'prismatic_shard', quantity: 1 }] }
  },
  // 博物馆
  {
    id: 'museum_20',
    name: '收藏爱好者',
    description: '向博物馆捐赠20件物品。',
    condition: { type: 'museumDonations', count: 20 },
    reward: { money: 1000 }
  },
  {
    id: 'museum_36',
    name: '博物馆之星',
    description: '向博物馆捐赠36件物品。',
    condition: { type: 'museumDonations', count: 36 },
    reward: { money: 5000, items: [{ itemId: 'prismatic_shard', quantity: 1 }] }
  },
  {
    id: 'museum_40',
    name: '灵物全鉴',
    description: '完成博物馆全部40件收藏（含仙灵物品）。',
    title: '博古通今',
    condition: { type: 'museumDonations', count: 40 },
    reward: { money: 8000 }
  },
  // 冒险家公会
  {
    id: 'guild_5',
    name: '怪物猎人',
    description: '完成5个讨伐目标。',
    condition: { type: 'guildGoalsCompleted', count: 5 },
    reward: { money: 1000 }
  },
  {
    id: 'guild_21',
    name: '屠龙勇士',
    description: '完成全部21个讨伐目标。',
    condition: { type: 'guildGoalsCompleted', count: 21 },
    reward: { money: 10000, items: [{ itemId: 'iridium_bar', quantity: 5 }] }
  },
  // 仙灵
  {
    id: 'spirit_first',
    name: '灵觉初开',
    description: '发现第1位仙灵。',
    condition: { type: 'hiddenNpcRevealed', count: 1 },
    reward: { money: 500 }
  },
  {
    id: 'spirit_three',
    name: '通灵之人',
    description: '发现3位仙灵。',
    condition: { type: 'hiddenNpcRevealed', count: 3 },
    reward: { money: 2000 }
  },
  {
    id: 'spirit_all',
    name: '万灵归心',
    description: '发现全部6位仙灵。',
    condition: { type: 'hiddenNpcRevealed', count: 6 },
    reward: { money: 5000, items: [{ itemId: 'prismatic_shard', quantity: 1 }] }
  },
  {
    id: 'spirit_bonded',
    name: '仙缘天定',
    description: '与一位仙灵结缘。',
    condition: { type: 'hiddenNpcBonded' },
    reward: { money: 1314 }
  },
  {
    id: 'spirit_peach_found',
    name: '灵桃仙味',
    description: '获得灵桃。',
    condition: { type: 'itemDiscovered', itemId: 'spirit_peach' },
    reward: { money: 300 }
  },
  {
    id: 'moon_herb_found',
    name: '月华初采',
    description: '获得月草。',
    condition: { type: 'itemDiscovered', itemId: 'moon_herb' },
    reward: { money: 300 }
  },
  {
    id: 'dream_silk_found',
    name: '梦丝如缎',
    description: '获得梦丝。',
    condition: { type: 'itemDiscovered', itemId: 'dream_silk' },
    reward: { money: 300 }
  },

  // ── 专属称号成就 ──
  {
    id: 'title_fish_god',
    name: '渔神降临',
    description: '钓齐图鉴中全部鱼类。',
    title: '渔神',
    condition: { type: 'fullFishCollection' },
    reward: { money: 10000, items: [{ itemId: 'prismatic_shard', quantity: 1 }] }
  },

  // ── 隐藏成就 ──
  {
    id: 'hidden_rainy_fisher',
    name: '雨中垂钓者',
    description: '在雨天钓到稀有鱼。',
    hidden: true,
    condition: { type: 'fishCaught', count: 1 },
    reward: { money: 500 }
  },
  {
    id: 'hidden_midnight_miner',
    name: '夜枭矿工',
    description: '在矿洞深处发现虚空矿石。',
    hidden: true,
    condition: { type: 'itemDiscovered', itemId: 'void_ore' },
    reward: { money: 800 }
  },
  {
    id: 'hidden_rich_farmer',
    name: '万贯家财',
    description: '累计赚取超过10万文铜钱。',
    hidden: true,
    condition: { type: 'moneyEarned', amount: 100000 },
    reward: { money: 2000 }
  },
  {
    id: 'hidden_skull_legend',
    name: '传说之名',
    description: '在骷髅矿穴中到达第100层。',
    hidden: true,
    condition: { type: 'skullCavernFloor', floor: 100 },
    reward: { money: 15000, items: [{ itemId: 'iridium_ore', quantity: 20 }] }
  },
  {
    id: 'hidden_all_spirits',
    name: '仙缘满载',
    description: '发现全部仙灵并与其中一位结缘。',
    hidden: true,
    condition: { type: 'hiddenNpcBonded' },
    reward: { money: 3000, items: [{ itemId: 'spirit_peach', quantity: 3 }] }
  }
]

/** 祠堂任务板 */
export const COMMUNITY_BUNDLES: CommunityBundleDef[] = [
  {
    id: 'spring_bundle',
    name: '春耕之礼',
    description: '春季物产合集。',
    requiredItems: [
      { itemId: 'cabbage', quantity: 5 },
      { itemId: 'radish', quantity: 5 },
      { itemId: 'bamboo_shoot', quantity: 3 },
      { itemId: 'tea', quantity: 2 }
    ],
    reward: { money: 500, items: [{ itemId: 'seed_peach', quantity: 3 }], description: '500文 + 桃种子×3' }
  },
  {
    id: 'summer_bundle',
    name: '盛夏之礼',
    description: '夏季物产合集。',
    requiredItems: [
      { itemId: 'watermelon', quantity: 3 },
      { itemId: 'rice', quantity: 5 },
      { itemId: 'lotus_root', quantity: 2 },
      { itemId: 'chili', quantity: 3 }
    ],
    reward: { money: 800, items: [{ itemId: 'seed_lotus_seed', quantity: 2 }], description: '800文 + 莲子种子×2' }
  },
  {
    id: 'autumn_bundle',
    name: '金秋之礼',
    description: '秋季物产合集。',
    requiredItems: [
      { itemId: 'pumpkin', quantity: 3 },
      { itemId: 'osmanthus', quantity: 2 },
      { itemId: 'jujube', quantity: 3 },
      { itemId: 'persimmon', quantity: 2 }
    ],
    reward: { money: 800, items: [{ itemId: 'seed_snow_lotus', quantity: 1 }], description: '800文 + 雪莲种子×1' }
  },
  {
    id: 'winter_bundle',
    name: '严冬之礼',
    description: '冬季物产合集。',
    requiredItems: [
      { itemId: 'winter_bamboo_shoot', quantity: 5 },
      { itemId: 'winter_wheat', quantity: 3 },
      { itemId: 'garlic', quantity: 3 },
      { itemId: 'ginger', quantity: 2 }
    ],
    reward: { money: 1000, description: '1000文' }
  },
  {
    id: 'artisan_bundle',
    name: '匠心之礼',
    description: '各种加工品合集。',
    requiredItems: [
      { itemId: 'watermelon_wine', quantity: 1 },
      { itemId: 'pickled_cabbage', quantity: 1 },
      { itemId: 'honey', quantity: 2 },
      { itemId: 'sesame_oil', quantity: 1 },
      { itemId: 'peach_wine', quantity: 1 }
    ],
    reward: { money: 2000, description: '2000文' }
  },
  {
    id: 'friendship_bundle',
    name: '乡情之礼',
    description: '与所有村民建立友善关系。',
    requiredItems: [
      { itemId: 'wintersweet', quantity: 2 },
      { itemId: 'chrysanthemum', quantity: 2 },
      { itemId: 'osmanthus', quantity: 2 }
    ],
    reward: { money: 1500, description: '1500文' }
  },
  // 渔获
  {
    id: 'fish_bundle',
    name: '渔获之礼',
    description: '各地水域的鱼获合集。',
    requiredItems: [
      { itemId: 'crucian', quantity: 3 },
      { itemId: 'carp', quantity: 3 },
      { itemId: 'bass', quantity: 2 },
      { itemId: 'catfish', quantity: 1 }
    ],
    reward: { money: 1000, description: '1000文' }
  },
  {
    id: 'rare_fish_bundle',
    name: '珍鲜之礼',
    description: '难得一见的珍稀鱼类。',
    requiredItems: [
      { itemId: 'sturgeon', quantity: 1 },
      { itemId: 'mandarin_fish', quantity: 1 },
      { itemId: 'koi', quantity: 1 },
      { itemId: 'eel', quantity: 1 }
    ],
    reward: { money: 2500, items: [{ itemId: 'iridium_ore', quantity: 3 }], description: '2500文 + 铱矿×3' }
  },
  // 矿石与宝石
  {
    id: 'ore_bundle',
    name: '矿石之礼',
    description: '矿洞中采集的各类矿石。',
    requiredItems: [
      { itemId: 'copper_ore', quantity: 10 },
      { itemId: 'iron_ore', quantity: 5 },
      { itemId: 'gold_ore', quantity: 3 },
      { itemId: 'quartz', quantity: 3 }
    ],
    reward: { money: 1000, description: '1000文' }
  },
  {
    id: 'gem_bundle',
    name: '珍宝之礼',
    description: '光彩夺目的宝石收藏。',
    requiredItems: [
      { itemId: 'jade', quantity: 2 },
      { itemId: 'ruby', quantity: 1 },
      { itemId: 'moonstone', quantity: 1 },
      { itemId: 'obsidian', quantity: 1 }
    ],
    reward: { money: 3000, items: [{ itemId: 'dragon_jade', quantity: 1 }], description: '3000文 + 龙玉×1' }
  },
  // 畜产品
  {
    id: 'animal_bundle',
    name: '牧场之礼',
    description: '牧场动物们的馈赠。',
    requiredItems: [
      { itemId: 'egg', quantity: 5 },
      { itemId: 'milk', quantity: 3 },
      { itemId: 'duck_egg', quantity: 2 },
      { itemId: 'wool', quantity: 2 }
    ],
    reward: { money: 1500, description: '1500文' }
  },
  {
    id: 'egg_bundle',
    name: '百蛋之礼',
    description: '收集各种珍禽的蛋。',
    requiredItems: [
      { itemId: 'egg', quantity: 3 },
      { itemId: 'duck_egg', quantity: 2 },
      { itemId: 'goose_egg', quantity: 1 },
      { itemId: 'quail_egg', quantity: 2 },
      { itemId: 'silkie_egg', quantity: 1 }
    ],
    reward: { money: 1200, description: '1200文' }
  },
  {
    id: 'milk_bundle',
    name: '乳品之礼',
    description: '各种新鲜的乳制品。',
    requiredItems: [
      { itemId: 'milk', quantity: 3 },
      { itemId: 'goat_milk', quantity: 2 },
      { itemId: 'buffalo_milk', quantity: 1 },
      { itemId: 'yak_milk', quantity: 1 }
    ],
    reward: { money: 1500, description: '1500文' }
  },
  // 加工品
  {
    id: 'wine_bundle',
    name: '佳酿之礼',
    description: '精心酿造的美酒。',
    requiredItems: [
      { itemId: 'watermelon_wine', quantity: 1 },
      { itemId: 'peach_wine', quantity: 1 },
      { itemId: 'jujube_wine', quantity: 1 },
      { itemId: 'osmanthus_wine', quantity: 1 },
      { itemId: 'corn_wine', quantity: 1 }
    ],
    reward: { money: 2500, description: '2500文' }
  },
  {
    id: 'tea_bundle',
    name: '茶道之礼',
    description: '品味四季的香茗。',
    requiredItems: [
      { itemId: 'green_tea_drink', quantity: 2 },
      { itemId: 'chrysanthemum_tea', quantity: 2 },
      { itemId: 'osmanthus_tea', quantity: 1 },
      { itemId: 'ginseng_tea', quantity: 1 }
    ],
    reward: { money: 1500, description: '1500文' }
  },
  {
    id: 'pickle_bundle',
    name: '腌制之礼',
    description: '各种腌制风味小食。',
    requiredItems: [
      { itemId: 'pickled_cabbage', quantity: 2 },
      { itemId: 'pickled_chili', quantity: 2 },
      { itemId: 'pickled_ginger', quantity: 2 },
      { itemId: 'dried_radish', quantity: 2 }
    ],
    reward: { money: 1000, description: '1000文' }
  },
  {
    id: 'smoked_bundle',
    name: '熏制之礼',
    description: '烟熏风味的鱼鲜。',
    requiredItems: [
      { itemId: 'smoked_crucian', quantity: 1 },
      { itemId: 'smoked_carp', quantity: 1 },
      { itemId: 'smoked_bass', quantity: 1 },
      { itemId: 'smoked_eel', quantity: 1 },
      { itemId: 'smoked_sturgeon', quantity: 1 }
    ],
    reward: { money: 2000, description: '2000文' }
  },
  {
    id: 'honey_bundle',
    name: '蜂蜜之礼',
    description: '百花酿成的甜蜜。',
    requiredItems: [
      { itemId: 'honey', quantity: 3 },
      { itemId: 'chrysanthemum_honey', quantity: 1 },
      { itemId: 'osmanthus_honey', quantity: 1 },
      { itemId: 'rapeseed_honey', quantity: 1 }
    ],
    reward: { money: 1800, description: '1800文' }
  },
  {
    id: 'cheese_bundle',
    name: '芝士之礼',
    description: '各种风味的奶酪。',
    requiredItems: [
      { itemId: 'cheese', quantity: 2 },
      { itemId: 'goat_cheese', quantity: 1 },
      { itemId: 'buffalo_cheese', quantity: 1 },
      { itemId: 'yak_cheese', quantity: 1 }
    ],
    reward: { money: 1500, description: '1500文' }
  },
  {
    id: 'bar_bundle',
    name: '百工之礼',
    description: '金属锭与基础材料。',
    requiredItems: [
      { itemId: 'copper_bar', quantity: 5 },
      { itemId: 'iron_bar', quantity: 3 },
      { itemId: 'gold_bar', quantity: 2 },
      { itemId: 'charcoal', quantity: 5 }
    ],
    reward: { money: 2000, items: [{ itemId: 'iridium_bar', quantity: 1 }], description: '2000文 + 铱锭×1' }
  },
  // 育种
  {
    id: 'hybrid_spring_bundle',
    name: '春华杂交',
    description: '春季杂交作物的初步收获。',
    requiredItems: [
      { itemId: 'emerald_radish', quantity: 2 },
      { itemId: 'jade_shoot', quantity: 2 },
      { itemId: 'peach_blossom_tea', quantity: 1 },
      { itemId: 'twin_bean', quantity: 2 }
    ],
    reward: { money: 1500, description: '1500文' }
  },
  {
    id: 'hybrid_summer_bundle',
    name: '夏实杂交',
    description: '夏季杂交作物的丰硕之果。',
    requiredItems: [
      { itemId: 'purple_melon', quantity: 2 },
      { itemId: 'golden_rice', quantity: 2 },
      { itemId: 'double_lotus', quantity: 1 },
      { itemId: 'fire_sesame', quantity: 2 }
    ],
    reward: { money: 1500, description: '1500文' }
  },
  {
    id: 'hybrid_autumn_bundle',
    name: '秋韵杂交',
    description: '秋季杂交作物的丰收之味。',
    requiredItems: [
      { itemId: 'amber_yam', quantity: 2 },
      { itemId: 'twin_blossom', quantity: 1 },
      { itemId: 'golden_persimmon', quantity: 2 },
      { itemId: 'autumn_gem', quantity: 1 }
    ],
    reward: { money: 1500, description: '1500文' }
  },
  {
    id: 'hybrid_winter_bundle',
    name: '冬藏杂交',
    description: '冬季杂交作物的严寒之珍。',
    requiredItems: [
      { itemId: 'jade_white', quantity: 2 },
      { itemId: 'garlic_cabbage', quantity: 2 },
      { itemId: 'evergreen_herb', quantity: 2 },
      { itemId: 'allium_king', quantity: 1 }
    ],
    reward: { money: 1500, description: '1500文' }
  },
  {
    id: 'hybrid_elite_bundle',
    name: '二代珍品',
    description: '二代杂交品种的珍稀收藏。',
    requiredItems: [
      { itemId: 'melon_tea_fruit', quantity: 1 },
      { itemId: 'dragon_fire', quantity: 1 },
      { itemId: 'celestial_rice', quantity: 1 },
      { itemId: 'ice_lotus', quantity: 1 },
      { itemId: 'golden_dragon', quantity: 1 }
    ],
    reward: { money: 5000, items: [{ itemId: 'iridium_ore', quantity: 5 }], description: '5000文 + 铱矿×5' }
  },
  {
    id: 'hybrid_legendary_bundle',
    name: '传奇良种',
    description: '高阶杂交品种的传世之作。',
    requiredItems: [
      { itemId: 'dragon_pearl', quantity: 1 },
      { itemId: 'immortal_flower', quantity: 1 },
      { itemId: 'jade_golden_melon', quantity: 1 },
      { itemId: 'moonlight_frost', quantity: 1 }
    ],
    reward: { money: 8000, items: [{ itemId: 'prismatic_shard', quantity: 1 }], description: '8000文 + 棱彩碎片×1' }
  }
]

export const getAchievementById = (id: string): AchievementDef | undefined => {
  return ACHIEVEMENTS.find(a => a.id === id)
}

export const getBundleById = (id: string): CommunityBundleDef | undefined => {
  return COMMUNITY_BUNDLES.find(b => b.id === id)
}
