import type { MainQuestDef } from '@/types'

/** 章节标题 */
export const CHAPTER_TITLES: Record<number, string> = {
  1: '初入桃源',
  2: '扎根大地',
  3: '名扬四乡',
  4: '风云际会',
  5: '桃源之主'
}

/** 50个主线任务定义，分5章每章10个 */
export const STORY_QUESTS: MainQuestDef[] = [
  // ============================================================
  // 第1章「初入桃源」— 新手引导
  // ============================================================
  {
    id: 'main_1_1',
    chapter: 1,
    order: 1,
    title: '新的开始',
    description: '柳村长说，想在桃源乡立足，先从种地开始吧。试着收获5次作物。',
    npcId: 'liu_cunzhang',
    objectives: [{ type: 'harvestCrops', label: '累计收获5次作物', target: 5 }],
    moneyReward: 300,
    friendshipReward: [{ npcId: 'liu_cunzhang', amount: 20 }]
  },
  {
    id: 'main_1_2',
    chapter: 1,
    order: 2,
    title: '远亲不如近邻',
    description: '陈伯是村里万物铺的老板，多和他打打交道吧。',
    npcId: 'chen_bo',
    objectives: [{ type: 'npcFriendship', label: '与陈伯成为相识', npcId: 'chen_bo', friendshipLevel: 'acquaintance' }],
    moneyReward: 200,
    friendshipReward: [{ npcId: 'chen_bo', amount: 20 }]
  },
  {
    id: 'main_1_3',
    chapter: 1,
    order: 3,
    title: '溪边垂钓',
    description: '秋月是村里最会钓鱼的姑娘，她邀你去溪边试试身手。',
    npcId: 'qiu_yue',
    objectives: [{ type: 'catchFish', label: '累计钓到5条鱼', target: 5 }],
    moneyReward: 300,
    itemReward: [{ itemId: 'standard_bait', quantity: 10 }],
    friendshipReward: [{ npcId: 'qiu_yue', amount: 20 }]
  },
  {
    id: 'main_1_4',
    chapter: 1,
    order: 4,
    title: '初探矿洞',
    description: '阿石说矿洞里有好东西，但也有危险。先探到第5层试试。',
    npcId: 'a_shi',
    objectives: [{ type: 'reachMineFloor', label: '矿洞到达第5层', target: 5 }],
    moneyReward: 500,
    friendshipReward: [{ npcId: 'a_shi', amount: 20 }]
  },
  {
    id: 'main_1_5',
    chapter: 1,
    order: 5,
    title: '乡间美味',
    description: '王大婶说，种地辛苦，学做几道菜犒劳自己吧。',
    npcId: 'wang_dashen',
    objectives: [{ type: 'cookRecipes', label: '累计烹饪3道菜', target: 3 }],
    moneyReward: 300,
    friendshipReward: [{ npcId: 'wang_dashen', amount: 20 }]
  },
  {
    id: 'main_1_6',
    chapter: 1,
    order: 6,
    title: '广结善缘',
    description: '柳村长希望你多认识村里的人，同时也帮乡亲们办办事。',
    npcId: 'liu_cunzhang',
    objectives: [{ type: 'completeQuests', label: '累计完成3个委托', target: 3 }],
    moneyReward: 500,
    friendshipReward: [{ npcId: 'liu_cunzhang', amount: 20 }]
  },
  {
    id: 'main_1_7',
    chapter: 1,
    order: 7,
    title: '木匠的考验',
    description: '小满说他师父赵木匠急需一批木材，帮忙送去30个木材吧。',
    npcId: 'xiao_man',
    objectives: [{ type: 'deliverItem', label: '交付木材×30', itemId: 'wood', itemQuantity: 30 }],
    moneyReward: 500,
    itemReward: [{ itemId: 'basic_fertilizer', quantity: 5 }],
    friendshipReward: [{ npcId: 'xiao_man', amount: 30 }]
  },
  {
    id: 'main_1_8',
    chapter: 1,
    order: 8,
    title: '林老的嘱托',
    description: '林老要配一副药方，需要一些草药，帮他收集10个草药吧。',
    npcId: 'lin_lao',
    objectives: [{ type: 'deliverItem', label: '交付草药×10', itemId: 'herb', itemQuantity: 10 }],
    moneyReward: 500,
    friendshipReward: [{ npcId: 'lin_lao', amount: 30 }]
  },
  {
    id: 'main_1_9',
    chapter: 1,
    order: 9,
    title: '初露锋芒',
    description: '柳村长对你的表现很满意。继续努力，让积蓄再多一些吧。',
    npcId: 'liu_cunzhang',
    objectives: [{ type: 'earnMoney', label: '累计获得5000文', target: 5000 }],
    moneyReward: 800,
    friendshipReward: [{ npcId: 'liu_cunzhang', amount: 20 }]
  },
  {
    id: 'main_1_10',
    chapter: 1,
    order: 10,
    title: '扎根桃源',
    description: '要在桃源乡真正站稳脚跟，农耕技能必须过硬。把农耕练到3级吧。',
    npcId: 'liu_cunzhang',
    objectives: [{ type: 'skillLevel', label: '农耕技能达到3级', skillType: 'farming', target: 3 }],
    moneyReward: 1000,
    itemReward: [{ itemId: 'quality_fertilizer', quantity: 5 }],
    friendshipReward: [{ npcId: 'liu_cunzhang', amount: 30 }]
  },

  // ============================================================
  // 第2章「扎根大地」— 中前期
  // ============================================================
  {
    id: 'main_2_1',
    chapter: 2,
    order: 1,
    title: '丰收之路',
    description: '柳娘说你的农场越来越像样了，继续加油收获更多作物吧。',
    npcId: 'liu_niang',
    objectives: [{ type: 'harvestCrops', label: '累计收获50次作物', target: 50 }],
    moneyReward: 800,
    friendshipReward: [{ npcId: 'liu_niang', amount: 20 }]
  },
  {
    id: 'main_2_2',
    chapter: 2,
    order: 2,
    title: '矿洞深处',
    description: '阿石说矿洞20层以下有铁矿脉，深入探索一下吧。',
    npcId: 'a_shi',
    objectives: [{ type: 'reachMineFloor', label: '矿洞到达第20层', target: 20 }],
    moneyReward: 1000,
    itemReward: [{ itemId: 'iron_ore', quantity: 10 }],
    friendshipReward: [{ npcId: 'a_shi', amount: 20 }]
  },
  {
    id: 'main_2_3',
    chapter: 2,
    order: 3,
    title: '渔翁之道',
    description: '李渔翁说，钓鱼讲究心境。多钓几条鱼，领悟其中奥妙。',
    npcId: 'li_yu',
    objectives: [{ type: 'catchFish', label: '累计钓到30条鱼', target: 30 }],
    moneyReward: 800,
    friendshipReward: [{ npcId: 'li_yu', amount: 20 }]
  },
  {
    id: 'main_2_4',
    chapter: 2,
    order: 4,
    title: '乡情初绽',
    description: '柳村长说村里祠堂有一块任务板，去图鉴中的「祠堂」看看，完成一个任务为村子做点贡献。',
    npcId: 'liu_cunzhang',
    objectives: [{ type: 'completeBundles', label: '完成1个祠堂任务', target: 1 }],
    moneyReward: 1000,
    friendshipReward: [{ npcId: 'liu_cunzhang', amount: 30 }]
  },
  {
    id: 'main_2_5',
    chapter: 2,
    order: 5,
    title: '铁匠的友谊',
    description: '孙铁匠需要一批铁矿来打造农具，送去15个铁矿表达心意。',
    npcId: 'sun_tiejiang',
    objectives: [
      { type: 'npcFriendship', label: '与孙铁匠成为相识', npcId: 'sun_tiejiang', friendshipLevel: 'acquaintance' },
      { type: 'deliverItem', label: '交付铁矿×15', itemId: 'iron_ore', itemQuantity: 15 }
    ],
    moneyReward: 1000,
    friendshipReward: [{ npcId: 'sun_tiejiang', amount: 30 }]
  },
  {
    id: 'main_2_6',
    chapter: 2,
    order: 6,
    title: '牧场之梦',
    description: '大牛说养动物是件快乐的事，试着养3只牲畜吧。',
    npcId: 'da_niu',
    objectives: [{ type: 'ownAnimals', label: '拥有3只牲畜', target: 3 }],
    moneyReward: 1000,
    friendshipReward: [{ npcId: 'da_niu', amount: 30 }]
  },
  {
    id: 'main_2_7',
    chapter: 2,
    order: 7,
    title: '厨艺精进',
    description: '王大婶对你的厨艺赞不绝口，再多学几道菜吧。',
    npcId: 'wang_dashen',
    objectives: [{ type: 'cookRecipes', label: '累计烹饪15道菜', target: 15 }],
    moneyReward: 800,
    friendshipReward: [{ npcId: 'wang_dashen', amount: 20 }]
  },
  {
    id: 'main_2_8',
    chapter: 2,
    order: 8,
    title: '村里的委托',
    description: '柳村长说你帮了不少乡亲的忙，继续做下去吧。',
    npcId: 'liu_cunzhang',
    objectives: [{ type: 'completeQuests', label: '累计完成10个委托', target: 10 }],
    moneyReward: 1000,
    friendshipReward: [{ npcId: 'liu_cunzhang', amount: 20 }]
  },
  {
    id: 'main_2_9',
    chapter: 2,
    order: 9,
    title: '四季物产',
    description: '陈伯说桃源乡物产丰富，多发现一些不同的物品吧。',
    npcId: 'chen_bo',
    objectives: [{ type: 'discoverItems', label: '发现30种不同物品', target: 30 }],
    moneyReward: 1200,
    friendshipReward: [{ npcId: 'chen_bo', amount: 20 }]
  },
  {
    id: 'main_2_10',
    chapter: 2,
    order: 10,
    title: '小有名气',
    description: '你在桃源乡已经小有名气了。继续积累财富，证明自己的实力。',
    npcId: 'liu_cunzhang',
    objectives: [{ type: 'earnMoney', label: '累计获得15000文', target: 15000 }],
    moneyReward: 1500,
    itemReward: [{ itemId: 'seed_peach', quantity: 3 }],
    friendshipReward: [{ npcId: 'liu_cunzhang', amount: 30 }]
  },

  // ============================================================
  // 第3章「名扬四乡」— 中期
  // ============================================================
  {
    id: 'main_3_1',
    chapter: 3,
    order: 1,
    title: '深渊挑战',
    description: '阿石说矿洞40层以下有金矿脉，但怪物也更凶猛了。',
    npcId: 'a_shi',
    objectives: [{ type: 'reachMineFloor', label: '矿洞到达第40层', target: 40 }],
    moneyReward: 1500,
    itemReward: [{ itemId: 'gold_ore', quantity: 10 }],
    friendshipReward: [{ npcId: 'a_shi', amount: 20 }]
  },
  {
    id: 'main_3_2',
    chapter: 3,
    order: 2,
    title: '百事通',
    description: '柳村长说你已经成了村里的大忙人，继续帮助乡亲们吧。',
    npcId: 'liu_cunzhang',
    objectives: [{ type: 'completeQuests', label: '累计完成25个委托', target: 25 }],
    moneyReward: 1500,
    friendshipReward: [{ npcId: 'liu_cunzhang', amount: 20 }]
  },
  {
    id: 'main_3_3',
    chapter: 3,
    order: 3,
    title: '万物通鉴',
    description: '周秀才对你的见识很感兴趣，希望你能发现更多桃源乡的物产。',
    npcId: 'zhou_xiucai',
    objectives: [{ type: 'discoverItems', label: '发现50种不同物品', target: 50 }],
    moneyReward: 1500,
    friendshipReward: [{ npcId: 'zhou_xiucai', amount: 20 }]
  },
  {
    id: 'main_3_4',
    chapter: 3,
    order: 4,
    title: '美食家',
    description: '胖婶说你的厨艺越来越好了，再接再厉！',
    npcId: 'pang_shen',
    objectives: [{ type: 'cookRecipes', label: '累计烹饪30道菜', target: 30 }],
    moneyReward: 1200,
    friendshipReward: [{ npcId: 'pang_shen', amount: 20 }]
  },
  {
    id: 'main_3_5',
    chapter: 3,
    order: 5,
    title: '人缘好',
    description: '柳村长希望你能和村里所有人都混个脸熟。',
    npcId: 'liu_cunzhang',
    objectives: [{ type: 'npcAllFriendly', label: '与所有村民成为相识', friendshipLevel: 'acquaintance' }],
    moneyReward: 2000,
    friendshipReward: [{ npcId: 'liu_cunzhang', amount: 30 }]
  },
  {
    id: 'main_3_6',
    chapter: 3,
    order: 6,
    title: '牧场扩张',
    description: '大牛对你的牧场很感兴趣，把牲畜养到8只吧。',
    npcId: 'da_niu',
    objectives: [{ type: 'ownAnimals', label: '拥有8只牲畜', target: 8 }],
    moneyReward: 1500,
    friendshipReward: [{ npcId: 'da_niu', amount: 20 }]
  },
  {
    id: 'main_3_7',
    chapter: 3,
    order: 7,
    title: '渔王初成',
    description: '秋月说你的钓术已经相当不错了，继续精进！',
    npcId: 'qiu_yue',
    objectives: [{ type: 'catchFish', label: '累计钓到80条鱼', target: 80 }],
    moneyReward: 1500,
    friendshipReward: [{ npcId: 'qiu_yue', amount: 20 }]
  },
  {
    id: 'main_3_8',
    chapter: 3,
    order: 8,
    title: '出货达人',
    description: '何掌柜说你的出货种类越来越多，继续拓展销路。',
    npcId: 'he_zhanggui',
    objectives: [{ type: 'shipItems', label: '出货15种不同物品', target: 15 }],
    moneyReward: 2000,
    friendshipReward: [{ npcId: 'he_zhanggui', amount: 20 }]
  },
  {
    id: 'main_3_9',
    chapter: 3,
    order: 9,
    title: '技艺精通',
    description: '林老说人要有一技之长，把任意一项技能练到7级。',
    npcId: 'lin_lao',
    objectives: [{ type: 'skillLevel', label: '任意技能达到7级', target: 7 }],
    moneyReward: 2000,
    friendshipReward: [{ npcId: 'lin_lao', amount: 20 }]
  },
  {
    id: 'main_3_10',
    chapter: 3,
    order: 10,
    title: '声名远播',
    description: '你的名声已经传到了邻村。继续积累财富，成为桃源乡的骄傲。',
    npcId: 'liu_cunzhang',
    objectives: [{ type: 'earnMoney', label: '累计获得40000文', target: 40000 }],
    moneyReward: 2500,
    itemReward: [{ itemId: 'jade', quantity: 2 }],
    friendshipReward: [{ npcId: 'liu_cunzhang', amount: 30 }]
  },

  // ============================================================
  // 第4章「风云际会」— 中后期
  // ============================================================
  {
    id: 'main_4_1',
    chapter: 4,
    order: 1,
    title: '深渊征服者',
    description: '阿石说矿洞最深处隐藏着强大的boss，到达第80层吧。',
    npcId: 'a_shi',
    objectives: [{ type: 'reachMineFloor', label: '矿洞到达第80层', target: 80 }],
    moneyReward: 3000,
    itemReward: [{ itemId: 'gold_ore', quantity: 15 }],
    friendshipReward: [{ npcId: 'a_shi', amount: 20 }]
  },
  {
    id: 'main_4_2',
    chapter: 4,
    order: 2,
    title: '降妖除魔',
    description: '云飞说山里的怪物越来越多了，需要有人出手清理。',
    npcId: 'yun_fei',
    objectives: [{ type: 'killMonsters', label: '累计击杀150只怪物', target: 150 }],
    moneyReward: 2500,
    friendshipReward: [{ npcId: 'yun_fei', amount: 30 }]
  },
  {
    id: 'main_4_3',
    chapter: 4,
    order: 3,
    title: '乡情圆满',
    description: '柳村长希望你能为村子完成更多祠堂任务。前往图鉴中的「祠堂」查看并提交所需物品。',
    npcId: 'liu_cunzhang',
    objectives: [{ type: 'completeBundles', label: '完成4个祠堂任务', target: 4 }],
    moneyReward: 3000,
    friendshipReward: [{ npcId: 'liu_cunzhang', amount: 30 }]
  },
  {
    id: 'main_4_4',
    chapter: 4,
    order: 4,
    title: '百年好合',
    description: '柳村长笑着说，是时候成个家了吧？',
    npcId: 'liu_cunzhang',
    objectives: [{ type: 'married', label: '与心仪之人结婚' }],
    moneyReward: 2000,
    friendshipReward: [{ npcId: 'liu_cunzhang', amount: 30 }]
  },
  {
    id: 'main_4_5',
    chapter: 4,
    order: 5,
    title: '大厨之路',
    description: '王大婶说你的厨艺已经超过她了，继续挑战更多菜品。',
    npcId: 'wang_dashen',
    objectives: [{ type: 'cookRecipes', label: '累计烹饪50道菜', target: 50 }],
    moneyReward: 2500,
    friendshipReward: [{ npcId: 'wang_dashen', amount: 20 }]
  },
  {
    id: 'main_4_6',
    chapter: 4,
    order: 6,
    title: '博物全才',
    description: '周秀才说你的见识已经超越了大部分人，继续探索。',
    npcId: 'zhou_xiucai',
    objectives: [{ type: 'discoverItems', label: '发现80种不同物品', target: 80 }],
    moneyReward: 3000,
    friendshipReward: [{ npcId: 'zhou_xiucai', amount: 20 }]
  },
  {
    id: 'main_4_7',
    chapter: 4,
    order: 7,
    title: '物流大亨',
    description: '何掌柜惊叹于你的出货规模，继续扩大出货种类。',
    npcId: 'he_zhanggui',
    objectives: [{ type: 'shipItems', label: '出货30种不同物品', target: 30 }],
    moneyReward: 3000,
    friendshipReward: [{ npcId: 'he_zhanggui', amount: 20 }]
  },
  {
    id: 'main_4_8',
    chapter: 4,
    order: 8,
    title: '知己之交',
    description: '人生得一知己足矣。和一位村民成为挚友吧。',
    npcId: 'lin_lao',
    objectives: [{ type: 'npcFriendship', label: '与任意村民成为挚友', npcId: '_any', friendshipLevel: 'bestFriend' }],
    moneyReward: 2500,
    friendshipReward: [{ npcId: 'lin_lao', amount: 20 }]
  },
  {
    id: 'main_4_9',
    chapter: 4,
    order: 9,
    title: '丰收大亨',
    description: '柳娘说你的农场是桃源乡产量最高的，继续保持。',
    npcId: 'liu_niang',
    objectives: [{ type: 'harvestCrops', label: '累计收获300次作物', target: 300 }],
    moneyReward: 3000,
    friendshipReward: [{ npcId: 'liu_niang', amount: 20 }]
  },
  {
    id: 'main_4_10',
    chapter: 4,
    order: 10,
    title: '富甲一方',
    description: '你的财富已经名闻乡里。柳村长说你是桃源乡的骄傲。',
    npcId: 'liu_cunzhang',
    objectives: [{ type: 'earnMoney', label: '累计获得100000文', target: 100000 }],
    moneyReward: 5000,
    itemReward: [{ itemId: 'prismatic_shard', quantity: 1 }],
    friendshipReward: [{ npcId: 'liu_cunzhang', amount: 30 }]
  },

  // ============================================================
  // 第5章「桃源之主」— 后期/终章
  // ============================================================
  {
    id: 'main_5_1',
    chapter: 5,
    order: 1,
    title: '矿洞之底',
    description: '阿石说矿洞最底层沉睡着古老的秘密，到达第120层揭开谜底。',
    npcId: 'a_shi',
    objectives: [{ type: 'reachMineFloor', label: '矿洞到达第120层', target: 120 }],
    moneyReward: 5000,
    friendshipReward: [{ npcId: 'a_shi', amount: 30 }]
  },
  {
    id: 'main_5_2',
    chapter: 5,
    order: 2,
    title: '骷髅深渊',
    description: '阿石说矿洞尽头通往骷髅矿穴，那里有更珍贵的矿石。',
    npcId: 'a_shi',
    objectives: [{ type: 'reachSkullFloor', label: '骷髅矿穴到达第50层', target: 50 }],
    moneyReward: 5000,
    itemReward: [{ itemId: 'iridium_ore', quantity: 5 }],
    friendshipReward: [{ npcId: 'a_shi', amount: 30 }]
  },
  {
    id: 'main_5_3',
    chapter: 5,
    order: 3,
    title: '万魔之敌',
    description: '云飞说你已经是桃源乡最强的战士了，但怪物还在不断出现。',
    npcId: 'yun_fei',
    objectives: [{ type: 'killMonsters', label: '累计击杀500只怪物', target: 500 }],
    moneyReward: 5000,
    friendshipReward: [{ npcId: 'yun_fei', amount: 30 }]
  },
  {
    id: 'main_5_4',
    chapter: 5,
    order: 4,
    title: '全能大师',
    description: '林老说真正的大师是样样精通。把所有技能都提升到8级。',
    npcId: 'lin_lao',
    objectives: [{ type: 'allSkillsLevel', label: '所有技能达到8级', target: 8 }],
    moneyReward: 5000,
    friendshipReward: [{ npcId: 'lin_lao', amount: 30 }]
  },
  {
    id: 'main_5_5',
    chapter: 5,
    order: 5,
    title: '御厨',
    description: '王大婶说你的厨艺已臻化境，向着百菜目标前进！',
    npcId: 'wang_dashen',
    objectives: [{ type: 'cookRecipes', label: '累计烹饪80道菜', target: 80 }],
    moneyReward: 3000,
    friendshipReward: [{ npcId: 'wang_dashen', amount: 30 }]
  },
  {
    id: 'main_5_6',
    chapter: 5,
    order: 6,
    title: '天伦之乐',
    description: '柳村长笑着说，成家之后也该添个孩子了。',
    npcId: 'liu_cunzhang',
    objectives: [{ type: 'hasChild', label: '迎来第一个孩子' }],
    moneyReward: 3000,
    friendshipReward: [{ npcId: 'liu_cunzhang', amount: 30 }]
  },
  {
    id: 'main_5_7',
    chapter: 5,
    order: 7,
    title: '桃源之友',
    description: '柳村长希望你能和村里每一个人都成为朋友。',
    npcId: 'liu_cunzhang',
    objectives: [{ type: 'npcAllFriendly', label: '与所有村民成为相知', friendshipLevel: 'friendly' }],
    moneyReward: 5000,
    friendshipReward: [{ npcId: 'liu_cunzhang', amount: 30 }]
  },
  {
    id: 'main_5_8',
    chapter: 5,
    order: 8,
    title: '出货全鉴',
    description: '何掌柜希望你能把桃源乡所有物产都出货一遍。',
    npcId: 'he_zhanggui',
    objectives: [{ type: 'shipItems', label: '出货50种不同物品', target: 50 }],
    moneyReward: 5000,
    friendshipReward: [{ npcId: 'he_zhanggui', amount: 30 }]
  },
  {
    id: 'main_5_9',
    chapter: 5,
    order: 9,
    title: '祠堂圆满',
    description: '柳村长说祠堂任务板上的所有任务都靠你了。前往图鉴中的「祠堂」完成剩余任务。',
    npcId: 'liu_cunzhang',
    objectives: [{ type: 'completeBundles', label: '完成全部6个祠堂任务', target: 6 }],
    moneyReward: 8000,
    friendshipReward: [{ npcId: 'liu_cunzhang', amount: 30 }]
  },
  {
    id: 'main_5_10',
    chapter: 5,
    order: 10,
    title: '桃源之主',
    description: '你已经成为桃源乡真正的主人。所有技能满级，财富冠绝乡里。这是最终的挑战。',
    npcId: 'liu_cunzhang',
    objectives: [
      { type: 'earnMoney', label: '累计获得300000文', target: 300000 },
      { type: 'allSkillsLevel', label: '所有技能达到10级', target: 10 }
    ],
    moneyReward: 10000,
    itemReward: [{ itemId: 'prismatic_shard', quantity: 1 }],
    friendshipReward: [{ npcId: 'liu_cunzhang', amount: 50 }]
  }
]

/** 根据ID获取主线任务 */
export const getStoryQuestById = (id: string): MainQuestDef | undefined => {
  return STORY_QUESTS.find(q => q.id === id)
}

/** 根据章节和序号获取主线任务 */
export const getStoryQuestByOrder = (chapter: number, order: number): MainQuestDef | undefined => {
  return STORY_QUESTS.find(q => q.chapter === chapter && q.order === order)
}

/** 获取下一个主线任务 */
export const getNextStoryQuest = (currentId: string): MainQuestDef | undefined => {
  const idx = STORY_QUESTS.findIndex(q => q.id === currentId)
  if (idx === -1 || idx >= STORY_QUESTS.length - 1) return undefined
  return STORY_QUESTS[idx + 1]
}

/** 获取某章的所有主线任务 */
export const getChapterQuests = (chapter: number): MainQuestDef[] => {
  return STORY_QUESTS.filter(q => q.chapter === chapter)
}

/** 获取第一个主线任务 */
export const getFirstStoryQuest = (): MainQuestDef => {
  return STORY_QUESTS[0]!
}
