import type { RandomNpcTemplate } from '@/types'

export const RANDOM_NPC_VISITOR_CONFIG = {
  maxActiveVisitors: 2,
  maxRecentSummaries: 8,
  maxAcquaintances: 12,
  acquaintanceAffinityThreshold: 40
} as const

export const RANDOM_NPC_TEMPLATES: RandomNpcTemplate[] = [
  {
    id: 'tea_caravan_apprentice',
    nameSeeds: ['陆青', '谢小茶', '苏闻'],
    ageBand: 'young',
    gender: 'female',
    occupation: '行脚茶商学徒',
    origin: '南岭茶路',
    personalityTags: ['谨慎', '好学', '记账认真'],
    speechStyle: '说话前会先把账册合上，句尾常带一句“我记下了”。',
    taboo: '不喜欢别人把茶叶和普通草料混放。',
    lifeGoal: '想独立跑完一趟茶路，证明自己能接住家里的铺子。',
    currentTrouble: '货箱受潮，急需能压住湿气的香料和茶点。',
    plotHook: '经商',
    familySeed: '家中长辈经营小茶铺，有一位严厉但护短的姑母。',
    preferences: {
      loved: ['tea', 'osmanthus'],
      liked: ['honey', 'rice'],
      disliked: ['copper_ore']
    },
    dialogueOpening: '她在村口晒账册，抬头先问你这里秋露重不重。',
    dialogueChoices: [
      { id: 'gentle_route', text: '帮她把茶箱搬到廊下。', response: '她小声道谢，又认真记下你家的屋檐朝向。', affinityChange: 16, relationshipTag: 'acquaintance' },
      { id: 'business_talk', text: '询问茶路行情。', response: '她一下子精神起来，给你讲了三处驿站的价差。', affinityChange: 12, relationshipTag: 'friend' },
      { id: 'joke', text: '开玩笑说账册比茶还香。', response: '她愣了愣才笑，说这句话一定不能让姑母听见。', affinityChange: 8 }
    ],
    smallOrder: {
      id: 'dry_tea_bundle',
      title: '回潮茶箱',
      summary: '想收一份茶叶和桂花，试着重新窨香救回受潮的货箱。',
      requestedItems: [{ itemId: 'tea', quantity: 2 }, { itemId: 'osmanthus', quantity: 1 }],
      rewardSummary: '可回赠少量商路情报和茶点。'
    }
  },
  {
    id: 'traveling_pet_healer',
    nameSeeds: ['程鹿', '阿眠', '白芷'],
    ageBand: 'adult',
    gender: 'female',
    occupation: '游方兽医',
    origin: '北坡牧道',
    personalityTags: ['温和', '观察敏锐', '喜欢动物'],
    speechStyle: '说话慢，常把人的心情和动物的耳朵一起观察。',
    taboo: '讨厌拿宠物开粗鲁玩笑。',
    lifeGoal: '想整理一本四季宠物食性札记。',
    currentTrouble: '随身药袋快空了，需要安神又不刺激的食材。',
    plotHook: '学艺',
    familySeed: '曾跟一位老牧人学艺，师徒像家人一样通信。',
    preferences: {
      loved: ['lotus_seed', 'goat_milk'],
      liked: ['sesame', 'sweet_potato'],
      disliked: ['chili']
    },
    dialogueOpening: '对方蹲在路边看一串爪印，问你家宠物最近胃口好不好。',
    dialogueChoices: [
      { id: 'pet_story', text: '讲讲自家宠物最近的习惯。', response: '对方听得很专心，还给你补了一句喂食提醒。', affinityChange: 14, relationshipTag: 'acquaintance' },
      { id: 'offer_help', text: '帮忙整理药袋。', response: '药袋被重新分好格，对方看你的眼神明显柔和许多。', affinityChange: 18, relationshipTag: 'friend' },
      { id: 'keep_distance', text: '只问是否需要买草药。', response: '对方点点头，把需求写得很清楚，没有多打扰。', affinityChange: 6 }
    ],
    smallOrder: {
      id: 'calm_pet_pouch',
      title: '安神食袋',
      summary: '想收莲子和芝麻，做一包适合长途动物休息的小食袋。',
      requestedItems: [{ itemId: 'lotus_seed', quantity: 1 }, { itemId: 'sesame', quantity: 2 }],
      rewardSummary: '可回赠宠物喂食札记和少量照料建议。'
    }
  },
  {
    id: 'lost_exam_scholar',
    nameSeeds: ['周砚', '林小卷', '孟行舟'],
    ageBand: 'young',
    gender: 'male',
    occupation: '迷路书生',
    origin: '临水县学',
    personalityTags: ['要面子', '好奇', '容易紧张'],
    speechStyle: '常先引用半句书，再承认自己其实有点迷路。',
    taboo: '不愿被当众说方向感差。',
    lifeGoal: '赶在秋试前完成一篇关于乡土经营的策论。',
    currentTrouble: '盘缠紧张，想用村中见闻换一顿热饭和一点干粮。',
    plotHook: '科考',
    familySeed: '家里有盼他成才的母亲和总爱拆台的妹妹。',
    preferences: {
      loved: ['rice', 'tea'],
      liked: ['radish', 'bamboo'],
      disliked: ['iron_ore']
    },
    dialogueOpening: '他站在告示牌前把地图拿反了，仍努力装作正在考察民情。',
    dialogueChoices: [
      { id: 'point_way', text: '悄悄帮他把地图转正。', response: '他耳尖发红，却认真向你作了一揖。', affinityChange: 15, relationshipTag: 'acquaintance' },
      { id: 'ask_article', text: '问他策论打算写什么。', response: '他立刻打开话匣子，说农桑与人情都比书上鲜活。', affinityChange: 12, relationshipTag: 'friend' },
      { id: 'tease', text: '打趣他是不是把村口当考场。', response: '他咳了一声，说“迷路亦是游学之一”。', affinityChange: 7, relationshipTag: 'rival' }
    ],
    smallOrder: {
      id: 'warm_meal_notes',
      title: '热饭换见闻',
      summary: '想收米和萝卜，换他整理的一页村庄经营札记。',
      requestedItems: [{ itemId: 'rice', quantity: 2 }, { itemId: 'radish', quantity: 1 }],
      rewardSummary: '可回赠一条村中订单灵感。'
    }
  },
  {
    id: 'lantern_wall_artisan',
    nameSeeds: ['顾灯', '梅三娘', '宋巧'],
    ageBand: 'middle',
    gender: 'female',
    occupation: '花灯修补匠',
    origin: '河湾灯坊',
    personalityTags: ['爽快', '手巧', '念旧'],
    speechStyle: '说话像剪灯纸一样利落，夸人也不绕弯。',
    taboo: '不喜欢别人嫌旧物不值钱。',
    lifeGoal: '想把各地旧灯样式收成一本灯谱。',
    currentTrouble: '灯骨缺轻竹，染纸也少一味暖色材料。',
    plotHook: '报恩',
    familySeed: '年轻时受过灯坊师父照拂，一直把师门旧账带在身边。',
    preferences: {
      loved: ['bamboo', 'pumpkin'],
      liked: ['osmanthus', 'wood'],
      disliked: ['quartz']
    },
    dialogueOpening: '她把一盏破灯挂在树枝上试光，问你觉得这灯还能不能救。',
    dialogueChoices: [
      { id: 'repair_lantern', text: '递上竹篾帮她撑灯骨。', response: '她看你手法稳，立刻让出半张工作凳。', affinityChange: 17, relationshipTag: 'friend' },
      { id: 'ask_old_style', text: '问这盏灯的旧样式。', response: '她讲起河湾旧节，语气里有一点不肯熄的亮。', affinityChange: 13, relationshipTag: 'acquaintance' },
      { id: 'practical', text: '建议换新灯更省事。', response: '她笑着摇头，说有些旧东西修好才有来处。', affinityChange: 4 }
    ],
    smallOrder: {
      id: 'old_lantern_frame',
      title: '旧灯补骨',
      summary: '想收竹子和南瓜，做一批暖色灯骨样品。',
      requestedItems: [{ itemId: 'bamboo', quantity: 2 }, { itemId: 'pumpkin', quantity: 1 }],
      rewardSummary: '可回赠花灯墙修补心得和节会布置建议。'
    }
  }
]
