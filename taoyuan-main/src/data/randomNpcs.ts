import type { RandomNpcLongStayStoryEventDef, RandomNpcTemplate } from '@/types'

export const RANDOM_NPC_VISITOR_CONFIG = {
  maxActiveVisitors: 2,
  maxRecentSummaries: 8,
  maxLockedArchives: 3,
  maxAcquaintances: 12,
  maxLongStayResidents: 3,
  acquaintanceAffinityThreshold: 40,
  longStayAffinityThreshold: 70
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
    familyTies: [
      { id: 'aunt_tea_keeper', kind: 'distant_relative', name: '陆三娘', relation: '姑母', summary: '南岭茶路上有名的护短掌柜，常用账本考校晚辈。', attitude: 'testing' },
      { id: 'family_tea_shop', kind: 'family_business', name: '陆家小茶铺', relation: '家族产业', summary: '铺子靠桂花窨茶起家，正在等她带回桃源的新茶路。', attitude: 'supportive' },
      { id: 'south_caravan', kind: 'caravan', name: '南岭茶帮', relation: '商队', summary: '商队愿意给新人机会，但也会追问货损和人情账。', attitude: 'testing' }
    ],
    familyCommission: {
      id: 'aunt_tea_gift',
      tieId: 'aunt_tea_keeper',
      title: '姑母的试茶礼',
      summary: '陆三娘想看看桃源茶能不能压得住路上的潮气，请你备一份茶叶和蜂蜜作回礼。',
      requestedItems: [{ itemId: 'tea', quantity: 2 }, { itemId: 'honey', quantity: 1 }],
      rewardSummary: '家族评价提升，并留下茶路铺货的好印象。'
    },
    preferences: {
      loved: ['tea', 'osmanthus'],
      liked: ['honey', 'rice'],
      disliked: ['copper_ore']
    },
    dialogueOpening: '她在村口晒账册，抬头先问你这里秋露重不重。',
    dialogueChoices: [
      { id: 'gentle_route', text: '帮她把茶箱搬到廊下。', response: '她小声道谢，又认真记下你家的屋檐朝向。', affinityChange: 16, relationshipTag: 'acquaintance', relationshipDirection: 'trust' },
      { id: 'business_talk', text: '询问茶路行情。', response: '她一下子精神起来，给你讲了三处驿站的价差。', affinityChange: 12, relationshipTag: 'friend', relationshipDirection: 'trust' },
      { id: 'joke', text: '开玩笑说账册比茶还香。', response: '她愣了愣才笑，说这句话一定不能让姑母听见。', affinityChange: 8, relationshipDirection: 'family_impression' }
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
    familyTies: [
      { id: 'old_shepherd_master', kind: 'mentor', name: '北坡老牧人', relation: '师父', summary: '教她辨认牲畜脾性，也会在信里追问她是否照顾好自己。', attitude: 'supportive' },
      { id: 'herb_debt', kind: 'old_debt', name: '北坡药账', relation: '旧债', summary: '早年救治幼驹欠下的一袋药材人情，迟早要用成事来偿还。', attitude: 'burdened' },
      { id: 'herder_cousin', kind: 'distant_relative', name: '程远山', relation: '远房表兄', summary: '常随牧队远行，偶尔会托人带来动物病案。', attitude: 'distant' }
    ],
    familyCommission: {
      id: 'mentor_calm_pack',
      tieId: 'old_shepherd_master',
      title: '师父的安牧包',
      summary: '北坡老牧人托她回信时带一份温和补给，想确认桃源也懂得照顾长途动物。',
      requestedItems: [{ itemId: 'lotus_seed', quantity: 1 }, { itemId: 'goat_milk', quantity: 1 }],
      rewardSummary: '师门评价提升，并认可你的动物照料方式。'
    },
    preferences: {
      loved: ['lotus_seed', 'goat_milk'],
      liked: ['sesame', 'sweet_potato'],
      disliked: ['chili']
    },
    dialogueOpening: '对方蹲在路边看一串爪印，问你家宠物最近胃口好不好。',
    dialogueChoices: [
      { id: 'pet_story', text: '讲讲自家宠物最近的习惯。', response: '对方听得很专心，还给你补了一句喂食提醒。', affinityChange: 14, relationshipTag: 'acquaintance', relationshipDirection: 'trust' },
      { id: 'offer_help', text: '帮忙整理药袋。', response: '药袋被重新分好格，对方看你的眼神明显柔和许多。', affinityChange: 18, relationshipTag: 'friend', relationshipDirection: 'trust' },
      { id: 'keep_distance', text: '只问是否需要买草药。', response: '对方点点头，把需求写得很清楚，没有多打扰。', affinityChange: 6, relationshipDirection: 'misunderstanding' }
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
    familyTies: [
      { id: 'exam_mother', kind: 'parent', name: '孟氏', relation: '母亲', summary: '把家中最好的米留给他赶考，只盼他别把身体读垮。', attitude: 'supportive' },
      { id: 'sharp_sister', kind: 'sibling', name: '周小霜', relation: '妹妹', summary: '嘴上嫌他迷路，信里却会夹一张自己画的路线图。', attitude: 'testing' },
      { id: 'county_school', kind: 'mentor', name: '临水县学师长', relation: '师门', summary: '希望他把乡土经营写成真策论，不只背书。', attitude: 'testing' }
    ],
    familyCommission: {
      id: 'mother_exam_parcel',
      tieId: 'exam_mother',
      title: '母亲的赶考包',
      summary: '孟氏想给他补一份不显眼的干粮，请你备些米和茶，免得他又空腹赶路。',
      requestedItems: [{ itemId: 'rice', quantity: 2 }, { itemId: 'tea', quantity: 1 }],
      rewardSummary: '家人评价提升，并觉得你照看人很稳妥。'
    },
    preferences: {
      loved: ['rice', 'tea'],
      liked: ['radish', 'bamboo'],
      disliked: ['iron_ore']
    },
    dialogueOpening: '他站在告示牌前把地图拿反了，仍努力装作正在考察民情。',
    dialogueChoices: [
      { id: 'point_way', text: '悄悄帮他把地图转正。', response: '他耳尖发红，却认真向你作了一揖。', affinityChange: 15, relationshipTag: 'acquaintance', relationshipDirection: 'trust' },
      { id: 'ask_article', text: '问他策论打算写什么。', response: '他立刻打开话匣子，说农桑与人情都比书上鲜活。', affinityChange: 12, relationshipTag: 'friend', relationshipDirection: 'family_impression' },
      { id: 'tease', text: '打趣他是不是把村口当考场。', response: '他咳了一声，说“迷路亦是游学之一”。', affinityChange: 7, relationshipTag: 'rival', relationshipDirection: 'misunderstanding' }
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
    familyTies: [
      { id: 'lantern_master', kind: 'mentor', name: '河湾灯坊师父', relation: '师父', summary: '曾在她最穷时收她入坊，留下半册旧灯样。', attitude: 'supportive' },
      { id: 'workshop_debt', kind: 'old_debt', name: '灯坊旧账', relation: '旧债', summary: '旧灯墙修复未完，她总觉得欠师门一个交代。', attitude: 'burdened' },
      { id: 'river_trade_boat', kind: 'caravan', name: '河湾货船', relation: '商队', summary: '偶尔捎来旧灯纸和师门消息，也会催她交新样。', attitude: 'distant' }
    ],
    familyCommission: {
      id: 'master_lantern_materials',
      tieId: 'lantern_master',
      title: '师父的灯样材料',
      summary: '河湾灯坊师父想看她的新灯样，请你备竹子和木材，帮她把灯骨寄回去。',
      requestedItems: [{ itemId: 'bamboo', quantity: 2 }, { itemId: 'wood', quantity: 3 }],
      rewardSummary: '师门评价提升，并认可你对旧灯样的尊重。'
    },
    preferences: {
      loved: ['bamboo', 'pumpkin'],
      liked: ['osmanthus', 'wood'],
      disliked: ['quartz']
    },
    dialogueOpening: '她把一盏破灯挂在树枝上试光，问你觉得这灯还能不能救。',
    dialogueChoices: [
      { id: 'repair_lantern', text: '递上竹篾帮她撑灯骨。', response: '她看你手法稳，立刻让出半张工作凳。', affinityChange: 17, relationshipTag: 'friend', relationshipDirection: 'trust' },
      { id: 'ask_old_style', text: '问这盏灯的旧样式。', response: '她讲起河湾旧节，语气里有一点不肯熄的亮。', affinityChange: 13, relationshipTag: 'acquaintance', relationshipDirection: 'family_impression' },
      { id: 'practical', text: '建议换新灯更省事。', response: '她笑着摇头，说有些旧东西修好才有来处。', affinityChange: 4, relationshipDirection: 'misunderstanding' }
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

export const RANDOM_NPC_LONG_STAY_STORY_EVENTS: RandomNpcLongStayStoryEventDef[] = [
  {
    id: 'business_stage_1_trade_notes',
    route: 'business',
    stage: 1,
    title: '第一封账外信',
    opening: '对方把一页折得很平的账外信放到桌边，想听你怎么看这趟生意该不该继续。',
    choices: [
      { id: 'steady', text: '先问清风险和人情债。', response: '对方松了一口气，说你不像只看利润的人。', affinityChange: 8, relationshipTag: 'friend' },
      { id: 'bold', text: '鼓励对方按自己的判断试一次。', response: '对方把信收进袖中，眼神比刚才亮了些。', affinityChange: 6 },
      { id: 'distance', text: '提醒这不是你的账本。', response: '对方沉默片刻，还是点头说这句也该记下。', affinityChange: 2, relationshipTag: 'acquaintance' }
    ]
  },
  {
    id: 'business_stage_2_village_offer',
    route: 'business',
    stage: 2,
    title: '村口小买卖',
    opening: '对方试着在村口摆出一张小桌，既怕打扰村里，又怕错过真正能留下的机会。',
    choices: [
      { id: 'introduce', text: '介绍熟悉的村民过去看看。', response: '小桌前很快有人停步，对方忙得连道谢都带着笑。', affinityChange: 8, relationshipTag: 'friend' },
      { id: 'help_layout', text: '帮忙把货品摆得更清楚。', response: '对方悄悄记下你的摆法，说这比账册上的格子有人情味。', affinityChange: 6 },
      { id: 'observe', text: '只在旁边看一会儿。', response: '对方有点紧张，但还是努力把第一单做稳。', affinityChange: 3 }
    ]
  },
  {
    id: 'business_stage_3_stay_or_go',
    route: 'business',
    stage: 3,
    title: '去留之间',
    opening: '对方收到远路来的回信，信上催着启程，可桌上还压着一张没写完的桃源清单。',
    choices: [
      { id: 'welcome_back', text: '说桃源也可以是下一趟路的起点。', response: '对方把清单补完，说以后离村也会记得回来交账。', affinityChange: 10, relationshipTag: 'friend' },
      { id: 'promise_letter', text: '约好以后用书信交换消息。', response: '对方认真写下你的地址，像给这段关系盖了一个小印。', affinityChange: 8 },
      { id: 'respect_choice', text: '让对方自己决定去留。', response: '对方笑了笑，说被这样信任，反而更想把桃源当成归处。', affinityChange: 6 }
    ]
  },
  {
    id: 'caregiving_stage_1_pet_notes',
    route: 'caregiving',
    stage: 1,
    title: '夜里的爪印',
    opening: '夜里院边多了一串爪印，对方蹲在灯下辨认，担心是哪只小兽不舒服。',
    choices: [
      { id: 'listen', text: '陪着一起听院外动静。', response: '对方压低声音说，有人愿意慢下来，动物也会安心。', affinityChange: 8, relationshipTag: 'friend' },
      { id: 'prepare_food', text: '去取些温和食物。', response: '食碗被放在墙边，对方记下这份细心。', affinityChange: 7 },
      { id: 'practical', text: '建议明早再找。', response: '对方点头，却还是多看了一眼夜色。', affinityChange: 2, relationshipTag: 'acquaintance' }
    ]
  },
  {
    id: 'caregiving_stage_2_healer_letter',
    route: 'caregiving',
    stage: 2,
    title: '给师父的回信',
    opening: '对方写给师父的信只起了个头，迟迟不知道该不该承认自己想在桃源多住一阵。',
    choices: [
      { id: 'truth', text: '劝对方照实写下牵挂。', response: '对方终于落笔，说牵挂不是软弱，是知道自己想守着什么。', affinityChange: 8, relationshipTag: 'friend' },
      { id: 'share_story', text: '讲一个自己照料宠物的糗事。', response: '对方笑得很轻，信纸上的字也放松了许多。', affinityChange: 6 },
      { id: 'short_note', text: '建议只报平安。', response: '对方照做了，却把没说完的话另夹进札记里。', affinityChange: 3 }
    ]
  },
  {
    id: 'caregiving_stage_3_shared_care',
    route: 'caregiving',
    stage: 3,
    title: '四季食性札记',
    opening: '对方把新写好的札记递给你看，末页空着一栏，标题是“桃源这一家”。',
    choices: [
      { id: 'write_together', text: '一起补上最近的照料观察。', response: '末页多了两种笔迹，对方说这本札记终于不像孤本了。', affinityChange: 10, relationshipTag: 'friend' },
      { id: 'name_pet', text: '提议把宠物习惯也记成小传。', response: '对方认真点头，说每个小生命都该有自己的来历。', affinityChange: 8 },
      { id: 'keep_copy', text: '请对方留一份副本在村里。', response: '对方把副本压在桌上，说这也算住下来的证据。', affinityChange: 6 }
    ]
  },
  {
    id: 'craft_stage_1_old_pattern',
    route: 'craft',
    stage: 1,
    title: '旧灯样',
    opening: '对方摊开一张破旧灯样，灯纸边缘缺了一角，只剩师门印记还能辨认。',
    choices: [
      { id: 'repair', text: '帮忙压住灯纸描边。', response: '对方夸你手稳，说旧东西遇上耐心就还有救。', affinityChange: 8, relationshipTag: 'friend' },
      { id: 'ask_story', text: '问这枚师门印记的来历。', response: '对方讲得很短，却第一次提起师父的名字。', affinityChange: 7 },
      { id: 'new_style', text: '建议直接改成新样式。', response: '对方笑骂你心急，还是在边角试了一笔。', affinityChange: 3 }
    ]
  },
  {
    id: 'craft_stage_2_lantern_wall',
    route: 'craft',
    stage: 2,
    title: '一面花灯墙',
    opening: '对方想在村里试挂一面小花灯墙，却犹豫要写愿望还是写旧灯出处。',
    choices: [
      { id: 'both', text: '提议愿望和出处都留下。', response: '灯墙忽然有了层次，对方说这才像会继续长出来的东西。', affinityChange: 8, relationshipTag: 'friend' },
      { id: 'wish', text: '先写眼前人的愿望。', response: '灯纸被风吹得轻响，对方看着它们笑了很久。', affinityChange: 6 },
      { id: 'origin', text: '先写旧灯来历。', response: '对方把旧账一笔笔写清，像终于还上了什么。', affinityChange: 6 }
    ]
  },
  {
    id: 'craft_stage_3_new_signature',
    route: 'craft',
    stage: 3,
    title: '新落款',
    opening: '新灯样完成了，落款处却空着。对方问你，旧师门之后还该写哪里。',
    choices: [
      { id: 'taoyuan', text: '写下桃源村。', response: '对方郑重落笔，说手艺有了新来处。', affinityChange: 10, relationshipTag: 'friend' },
      { id: 'shared', text: '写下两个人一起修过。', response: '对方笑着补了一笔小小的记号，算是默许。', affinityChange: 8, relationshipTag: 'ambiguous' },
      { id: 'blank', text: '留空，等以后再定。', response: '对方把灯收好，说未完的地方也值得留下。', affinityChange: 6 }
    ]
  },
  {
    id: 'friendship_stage_1_settle_in',
    route: 'friendship',
    stage: 1,
    title: '暂住第一日',
    opening: '对方站在新收拾的小屋前，像是不确定自己是否真的能把这里称作住处。',
    choices: [
      { id: 'neighbor', text: '告诉对方邻里慢慢熟就好。', response: '对方把门前扫得更干净了些，说慢慢来听起来很踏实。', affinityChange: 8, relationshipTag: 'friend' },
      { id: 'help_move', text: '帮忙把行李搬进屋。', response: '对方轻声道谢，把最重要的小物留在桌上。', affinityChange: 7 },
      { id: 'space', text: '让对方先独自安顿。', response: '对方点点头，门没有关严，像给以后留了缝。', affinityChange: 3 }
    ]
  },
  {
    id: 'friendship_stage_2_village_memory',
    route: 'friendship',
    stage: 2,
    title: '村里的第一段记忆',
    opening: '对方说起最近记住的村里声音：鸡鸣、磨坊、雨落瓦檐，还有你路过时的脚步。',
    choices: [
      { id: 'walk', text: '邀请对方一起走一圈村路。', response: '走完一圈后，对方能叫出更多地名，也更像这里的人了。', affinityChange: 8, relationshipTag: 'friend' },
      { id: 'share_place', text: '说一个自己常去的地方。', response: '对方把那个地方记进心里，说下次想自己去看看。', affinityChange: 6 },
      { id: 'joke', text: '打趣脚步声也能认人。', response: '对方笑着说，有些人确实不用看见就知道来了。', affinityChange: 6, relationshipTag: 'ambiguous' }
    ]
  },
  {
    id: 'friendship_stage_3_rooted',
    route: 'friendship',
    stage: 3,
    title: '留下的理由',
    opening: '对方把最初的行囊重新系好，又慢慢解开，说想确认自己留下不是因为无处可去。',
    choices: [
      { id: 'chosen', text: '说留下也可以是一种选择。', response: '对方把行囊放回柜里，说这次是自己选的。', affinityChange: 10, relationshipTag: 'friend' },
      { id: 'future', text: '一起说说以后的日子。', response: '对方没有急着答应什么，却把“以后”两个字重复了一遍。', affinityChange: 8 },
      { id: 'support', text: '承诺需要时会帮一把。', response: '对方认真看着你，说这句话已经很够了。', affinityChange: 7 }
    ]
  }
]
