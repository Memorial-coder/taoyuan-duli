import type { RandomNpcLongStayStoryEventDef, RandomNpcTemplate } from '@/types'

export const RANDOM_NPC_VISITOR_CONFIG = {
  maxActiveVisitors: 2,
  maxRecentSummaries: 8,
  maxLockedArchives: 3,
  maxAcquaintances: 12,
  maxLongStayResidents: 3,
  maxWeeklyReunionVisitors: 1,
  weeklyReunionCooldownDays: 7,
  acquaintanceColdArchiveDays: 28,
  longStayColdArchiveDays: 56,
  longStayDeepArchiveDays: 112,
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
    appearanceKeywords: ['茶色短披风', '随身账册', '桂花茶香'],
    taboo: '不喜欢别人把茶叶和普通草料混放。',
    lifeGoal: '想独立跑完一趟茶路，证明自己能接住家里的铺子。',
    currentTrouble: '货箱受潮，急需能压住湿气的香料和茶点。',
    villagePurpose: '试走桃源到南岭的新茶路，评估村中作物能否稳定供货。',
    romanceView: '慢热重信，先看对方是否守约、懂分寸。',
    developmentRoutes: ['business', 'friendship'],
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
    dialogueScenes: [
      { id: 'tea_first_meeting', kind: 'first_meeting', title: '村口晒账', summary: '初见时围绕茶箱、账册和秋露试探彼此做事是否稳妥。', triggerHint: '首次来访或旧日召回后优先出现。', relationshipDirection: 'trust' },
      { id: 'tea_gift_check', kind: 'gift', title: '试茶回礼', summary: '收到茶叶、桂花或蜂蜜时，会把礼物与姑母试茶礼联系起来。', triggerHint: '送礼或小订单交付后出现。', relationshipDirection: 'family_impression' },
      { id: 'tea_reunion', kind: 'reunion', title: '旧路重逢', summary: '久别后重提茶路价差和桃源供货，判断关系是否还能续上。', triggerHint: '旧日摘要召回或长期未见后出现。', relationshipDirection: 'trust' }
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
    appearanceKeywords: ['分格药袋', '鹿皮绳', '温和眼神'],
    taboo: '讨厌拿宠物开粗鲁玩笑。',
    lifeGoal: '想整理一本四季宠物食性札记。',
    currentTrouble: '随身药袋快空了，需要安神又不刺激的食材。',
    villagePurpose: '记录桃源灵宠与家畜的四季食性，寻找可长期观察的样本。',
    romanceView: '先能照顾彼此，再谈更近的承诺。',
    developmentRoutes: ['caregiving', 'friendship'],
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
    dialogueScenes: [
      { id: 'healer_pet_daily', kind: 'daily', title: '爪印问诊', summary: '日常聊宠物胃口、牲畜脾性和温和喂食，偏向照料信任。', triggerHint: '宠物喂食、动物照料或普通聊天后出现。', relationshipDirection: 'trust' },
      { id: 'healer_rain_shelter', kind: 'rain', title: '雨棚听诊', summary: '雨天一起听棚外动静，讨论潮湿天气对动物和草药的影响。', triggerHint: '雨天或潮湿季节来访时出现。', relationshipDirection: 'trust' },
      { id: 'healer_night_search', kind: 'night', title: '夜里寻踪', summary: '夜访时追一串爪印，决定是陪她寻找还是劝她先休息。', triggerHint: '长住夜间事件或夜访扩展时出现。', relationshipDirection: 'ambiguity' }
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
    appearanceKeywords: ['折皱地图', '旧书箱', '墨痕袖口'],
    taboo: '不愿被当众说方向感差。',
    lifeGoal: '赶在秋试前完成一篇关于乡土经营的策论。',
    currentTrouble: '盘缠紧张，想用村中见闻换一顿热饭和一点干粮。',
    villagePurpose: '考察桃源的农桑、人情和村社经营，补完秋试策论。',
    romanceView: '含蓄但重承诺，认定前会先把前路说清。',
    developmentRoutes: ['friendship', 'business'],
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
    dialogueScenes: [
      { id: 'scholar_misread_map', kind: 'misunderstanding', title: '地图拿反', summary: '误会和玩笑容易让他逞强，也可能把竞争感转成旧识话题。', triggerHint: '误会方向分较高或打趣选项后出现。', relationshipDirection: 'misunderstanding' },
      { id: 'scholar_request_notes', kind: 'request', title: '热饭换见闻', summary: '求助整理村中农桑见闻，用米饭和茶换一段策论素材。', triggerHint: '小订单、求助或订单委托关联时出现。', relationshipDirection: 'family_impression' },
      { id: 'scholar_farewell_exam', kind: 'farewell', title: '赶考临别', summary: '离村前谈赶考路、家书和是否把桃源写进策论。', triggerHint: '归档、长住阶段收束或离别事件时出现。', relationshipDirection: 'trust' }
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
    appearanceKeywords: ['灯纸剪痕', '竹篾工具包', '旧灯油香'],
    taboo: '不喜欢别人嫌旧物不值钱。',
    lifeGoal: '想把各地旧灯样式收成一本灯谱。',
    currentTrouble: '灯骨缺轻竹，染纸也少一味暖色材料。',
    villagePurpose: '收集桃源旧灯样，修一面能留住节会记忆的花灯墙。',
    romanceView: '看重一起修旧事，愿意把来处和去处都讲明白。',
    developmentRoutes: ['craft', 'friendship'],
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
    dialogueScenes: [
      { id: 'lantern_festival_wall', kind: 'festival', title: '灯墙留名', summary: '节会前后聊旧灯、愿望和桃源灯墙的新署名。', triggerHint: '节会、花灯布置或长住手艺线出现。', relationshipDirection: 'family_impression' },
      { id: 'lantern_request_frame', kind: 'request', title: '旧灯补骨', summary: '求助竹篾、木料或南瓜灯材，完成后可接到师门评价。', triggerHint: '小订单、加工材料或家族委托后出现。', relationshipDirection: 'trust' },
      { id: 'lantern_reunion_old_style', kind: 'reunion', title: '旧样重修', summary: '久别重逢时重提未完旧灯样，确认彼此是否仍愿意修下去。', triggerHint: '旧日召回、节会重逢或长住回归后出现。', relationshipDirection: 'ambiguity' }
    ],
    smallOrder: {
      id: 'old_lantern_frame',
      title: '旧灯补骨',
      summary: '想收竹子和南瓜，做一批暖色灯骨样品。',
      requestedItems: [{ itemId: 'bamboo', quantity: 2 }, { itemId: 'pumpkin', quantity: 1 }],
      rewardSummary: '可回赠花灯墙修补心得和节会布置建议。'
    }
  },
  {
    id: 'river_oath_weaver',
    nameSeeds: ['沈织', '柳阿澄', '乔晚灯'],
    ageBand: 'adult',
    gender: 'female',
    occupation: '河湾织补师',
    origin: '旧渡织坊',
    personalityTags: ['克制', '护短', '记恩'],
    speechStyle: '说话像收针脚一样慢，提到旧事时会先把线头捻平。',
    appearanceKeywords: ['青布针包', '旧渡护符', '细密补线'],
    taboo: '不喜欢别人把义亲和血亲分出轻重。',
    lifeGoal: '想攒够布料和路费，把义女接到一个安稳地方读书。',
    currentTrouble: '旧渡来信说义女要换季衣裳，她手边缺耐用布料和暖食。',
    villagePurpose: '来桃源找一处能稳定接织补活的地方，也想确认旧日承诺是否还算数。',
    romanceView: '愿意重新相信人，但要先看对方能否尊重她的旧缘和孩子牵挂。',
    developmentRoutes: ['craft', 'friendship'],
    plotHook: '避祸',
    familySeed: '她有一位结义兄长、一个远在旧渡的义女，以及一段不愿仓促重提的前缘。',
    familyTies: [
      { id: 'oath_brother_ferryman', kind: 'sworn_kin', name: '何渡', relation: '结义兄长', summary: '旧渡摆渡人，曾在水灾夜里替她守过织坊门。', attitude: 'supportive' },
      { id: 'adopted_daughter_qing', kind: 'child', name: '小青', relation: '义女', summary: '被她收养的孩子，正在旧渡读书，来信总把想念写得很小心。', attitude: 'distant' },
      { id: 'unfinished_betrothal', kind: 'old_flame', name: '裴照', relation: '旧日婚约', summary: '旧年未成的婚约，对方后来从商远行，留下的不是怨而是难说清的牵挂。', attitude: 'burdened' },
      { id: 'old_ferry_looms', kind: 'family_business', name: '旧渡织坊', relation: '旧业', summary: '织坊仍挂着她的旧名，也等着她决定要不要把新布样寄回去。', attitude: 'testing' }
    ],
    familyCommission: {
      id: 'daughter_winter_bundle',
      tieId: 'adopted_daughter_qing',
      title: '义女的换季包',
      summary: '小青要入冬换衣，她想备一份结实布料和暖食寄回旧渡。',
      requestedItems: [{ itemId: 'bamboo', quantity: 1 }, { itemId: 'rice', quantity: 2 }],
      rewardSummary: '家族评价提升，并让她相信桃源能接住孩子牵挂。'
    },
    preferences: {
      loved: ['rice', 'osmanthus'],
      liked: ['bamboo', 'tea'],
      disliked: ['chili']
    },
    dialogueOpening: '她坐在桥边补一只旧布包，针线停在半空，问你桃源有没有能寄信的熟路。',
    dialogueChoices: [
      { id: 'ask_child', text: '问那只布包是不是给孩子的。', response: '她愣了一下，随后把针线放软，说孩子长得快，衣裳总追不上。', affinityChange: 15, relationshipTag: 'acquaintance', relationshipDirection: 'family_impression' },
      { id: 'offer_route', text: '帮她打听去旧渡的稳妥路。', response: '她认真记下路线，说愿意欠你一次正经人情。', affinityChange: 16, relationshipTag: 'friend', relationshipDirection: 'trust' },
      { id: 'avoid_old_story', text: '只夸她针脚细密。', response: '她笑了笑，没有追问你为什么避开旧事，只把线头收得更整齐。', affinityChange: 8, relationshipDirection: 'ambiguity' }
    ],
    dialogueScenes: [
      { id: 'weaver_first_bridge', kind: 'first_meeting', title: '桥边补包', summary: '初见时围绕旧渡来信、义女衣裳和桃源寄信路试探彼此分寸。', triggerHint: '首次来访或旧日召回后出现。', relationshipDirection: 'family_impression' },
      { id: 'weaver_request_bundle', kind: 'request', title: '换季包裹', summary: '求助准备米粮和耐用材料，寄给远在旧渡的义女。', triggerHint: '小订单或家族委托后出现。', relationshipDirection: 'trust' },
      { id: 'weaver_old_flame_rain', kind: 'rain', title: '雨中旧约', summary: '雨天提起旧日婚约和未寄出的回信，决定是放下还是把话说清。', triggerHint: '雨天、暧昧方向或前缘节点会面后出现。', relationshipDirection: 'ambiguity' },
      { id: 'weaver_farewell_letter', kind: 'farewell', title: '未封的信', summary: '离别时把给义女和旧人的信分开，确认桃源这一页是否还要留白。', triggerHint: '归档、长住收束或离别事件时出现。', relationshipDirection: 'trust' }
    ],
    smallOrder: {
      id: 'ferry_letter_bundle',
      title: '旧渡信包',
      summary: '想收米和桂花，做一份能随信寄走的温和小包。',
      requestedItems: [{ itemId: 'rice', quantity: 2 }, { itemId: 'osmanthus', quantity: 1 }],
      rewardSummary: '可回赠织补心得和一段旧渡人情线索。'
    }
  },
  {
    id: 'missing_sister_apothecary',
    nameSeeds: ['许寻', '阿灯', '白小蓁'],
    ageBand: 'young',
    gender: 'male',
    occupation: '寻亲药童',
    origin: '西坡药棚',
    personalityTags: ['谨慎', '记路', '怕欠人情'],
    speechStyle: '说话会先确认地名和药名，像怕把重要线索听岔。',
    appearanceKeywords: ['旧药篓', '半张寻人纸', '草木灰袖口'],
    taboo: '不喜欢别人把寻亲当成茶余饭后的奇闻。',
    lifeGoal: '想找到随药队走失的妹妹，也想把母亲留下的药方补全。',
    currentTrouble: '寻人纸被雨泡坏，需要能稳住心神的药材和一顿热饭。',
    villagePurpose: '听说桃源有人见过相似药铃，来村里核对药队去向和旧路标记。',
    romanceView: '先要确认彼此能不能守住秘密，感情不能拿寻亲线索交换。',
    developmentRoutes: ['caregiving', 'friendship'],
    plotHook: '寻亲',
    familySeed: '母亲早年行医未归，妹妹跟药队走散，只剩师父偶尔寄来含糊线索。',
    familyTies: [
      { id: 'missing_mother_healer', kind: 'parent', name: '许兰舟', relation: '母亲', summary: '曾沿西坡药路行医，失踪前留下半张安神方。', attitude: 'distant' },
      { id: 'lost_sister_bell', kind: 'sibling', name: '小铃', relation: '妹妹', summary: '随药队走失的孩子，药铃声是他最确定的线索。', attitude: 'distant' },
      { id: 'apothecary_master', kind: 'mentor', name: '西坡药师', relation: '师父', summary: '教他认药，也提醒他别把全部人生都押在一张旧纸上。', attitude: 'testing' }
    ],
    familyCommission: {
      id: 'sister_clue_tonic',
      tieId: 'lost_sister_bell',
      title: '药铃线索汤',
      summary: '他想备一份温和药汤寄给带来线索的药队，请你帮忙准备草药和莲子。',
      requestedItems: [{ itemId: 'herb', quantity: 2 }, { itemId: 'lotus_seed', quantity: 1 }],
      rewardSummary: '家族评价提升，并让寻亲线索从传闻变成可继续追的方向。'
    },
    preferences: {
      loved: ['herb', 'lotus_seed'],
      liked: ['tea', 'honey'],
      disliked: ['copper_ore']
    },
    dialogueOpening: '他在井边摊开半张寻人纸，先问你有没有听过一串细小的药铃声。',
    dialogueChoices: [
      { id: 'protect_secret', text: '答应先替他保密。', response: '他把寻人纸折得更平，说能守口的人比路标更难得。', affinityChange: 16, relationshipTag: 'acquaintance', relationshipDirection: 'trust' },
      { id: 'ask_medicine_route', text: '问清药队经过的路线。', response: '他立刻在地上画出三条岔路，眼神终于有了焦点。', affinityChange: 13, relationshipTag: 'friend', relationshipDirection: 'family_impression' },
      { id: 'doubt_story', text: '提醒他线索也许只是误传。', response: '他沉默很久，说误传也得亲自确认过才算结束。', affinityChange: 5, relationshipTag: 'rival', relationshipDirection: 'misunderstanding' }
    ],
    dialogueScenes: [
      { id: 'apothecary_first_notice', kind: 'first_meeting', title: '半张寻人纸', summary: '初见时围绕药铃、旧纸和是否保密建立第一层信任。', triggerHint: '首次来访或旧日召回后出现。', relationshipDirection: 'trust' },
      { id: 'apothecary_request_tonic', kind: 'request', title: '线索药汤', summary: '用草药和莲子备一份温和汤剂，换取药队线索继续推进。', triggerHint: '小订单、家族委托或药材充足时出现。', relationshipDirection: 'family_impression' },
      { id: 'apothecary_reunion_bell', kind: 'reunion', title: '药铃再响', summary: '久别重逢时重听药铃传闻，确认寻亲线是否还愿意一起追。', triggerHint: '旧日召回或跨周重逢时出现。', relationshipDirection: 'trust' }
    ],
    smallOrder: {
      id: 'rain_damaged_notice',
      title: '雨泡寻人纸',
      summary: '想收草药和茶叶，重新誊写一份不易被潮气毁掉的寻人纸。',
      requestedItems: [{ itemId: 'herb', quantity: 2 }, { itemId: 'tea', quantity: 1 }],
      rewardSummary: '可回赠一段药路线索和安神方残页。'
    }
  },
  {
    id: 'runaway_betrothal_tailor',
    nameSeeds: ['纪鸢', '阿缎', '沈棠'],
    ageBand: 'young',
    gender: 'female',
    occupation: '逃婚绣娘',
    origin: '东市绣坊',
    personalityTags: ['倔强', '手快', '怕被安排'],
    speechStyle: '话说得轻，但每句都像已经在心里拆过线。',
    appearanceKeywords: ['素色盖头布', '藏针袖袋', '未拆红线'],
    taboo: '不喜欢别人替她决定婚嫁或去留。',
    lifeGoal: '想用自己的绣样换一份正经生计，而不是被一纸婚约卖掉。',
    currentTrouble: '追来的媒人快到邻镇，她需要能改装行囊的布料和隐蔽落脚处。',
    villagePurpose: '想在桃源暂避旧婚约，也试着接几单绣活证明自己能养活自己。',
    romanceView: '最怕被承诺捆住，若要靠近，必须先尊重她的选择权。',
    developmentRoutes: ['craft', 'friendship'],
    plotHook: '逃婚',
    familySeed: '家中父亲重名声，兄长暗中帮她逃出东市，旧婚约对象仍在找她。',
    familyTies: [
      { id: 'strict_tailor_father', kind: 'parent', name: '纪掌柜', relation: '父亲', summary: '东市绣坊掌柜，把家业和婚约绑在同一张账上。', attitude: 'testing' },
      { id: 'helper_elder_brother', kind: 'sibling', name: '纪衡', relation: '兄长', summary: '嘴硬心软，偷偷把她的针包塞进行囊。', attitude: 'supportive' },
      { id: 'unwanted_betrothal', kind: 'old_flame', name: '许二郎', relation: '旧婚约', summary: '未必恶毒，却从没真正问过她愿不愿意。', attitude: 'burdened' },
      { id: 'east_market_embroidery', kind: 'family_business', name: '东市绣坊', relation: '家业', summary: '绣坊靠嫁衣闻名，她却想做自己的花样。', attitude: 'testing' }
    ],
    familyCommission: {
      id: 'brother_hidden_parcel',
      tieId: 'helper_elder_brother',
      title: '兄长的暗线包',
      summary: '纪衡托人带来一封短笺，请你备布匹和桂花，帮她把行囊改得不显眼。',
      requestedItems: [{ itemId: 'cloth', quantity: 1 }, { itemId: 'osmanthus', quantity: 1 }],
      rewardSummary: '家人评价提升，并让她确认桃源不是另一处牢笼。'
    },
    preferences: {
      loved: ['cloth', 'silk_ribbon'],
      liked: ['osmanthus', 'tea'],
      disliked: ['chili']
    },
    dialogueOpening: '她把一截红线绕在指尖又松开，问你这里有没有不查来历的绣活。',
    dialogueChoices: [
      { id: 'respect_choice', text: '先问她想不想留下。', response: '她抬眼看你，像终于听到一个没有安排好的问题。', affinityChange: 17, relationshipTag: 'friend', relationshipDirection: 'trust' },
      { id: 'offer_workbench', text: '借她一张安静的工作台。', response: '针脚很快落稳，她说有活干时，人就不那么像逃犯。', affinityChange: 14, relationshipTag: 'acquaintance', relationshipDirection: 'family_impression' },
      { id: 'ask_betrothal', text: '追问婚约细节。', response: '她把红线收进袖口，说有些话不是不能讲，是不能被逼着讲。', affinityChange: 4, relationshipDirection: 'misunderstanding' }
    ],
    dialogueScenes: [
      { id: 'tailor_first_red_thread', kind: 'first_meeting', title: '未拆红线', summary: '初见围绕红线、绣活和是否尊重选择权展开。', triggerHint: '首次来访或逃婚线索出现时触发。', relationshipDirection: 'trust' },
      { id: 'tailor_night_hideout', kind: 'night', title: '夜改行囊', summary: '夜里改装行囊，决定是继续逃、暂住还是写信把话说清。', triggerHint: '夜访、暧昧方向或旧婚约节点后出现。', relationshipDirection: 'ambiguity' },
      { id: 'tailor_misread_promise', kind: 'misunderstanding', title: '承诺误听', summary: '任何替她决定的承诺都会变成误会，需要用尊重化解。', triggerHint: '误会方向较高或追问婚约后出现。', relationshipDirection: 'misunderstanding' }
    ],
    smallOrder: {
      id: 'plain_travel_cloak',
      title: '素面行衣',
      summary: '想收一匹布和一份茶叶，做一件不起眼的赶路外衣。',
      requestedItems: [{ itemId: 'cloth', quantity: 1 }, { itemId: 'tea', quantity: 1 }],
      rewardSummary: '可回赠绣样和一段旧婚约线索。'
    }
  },
  {
    id: 'wandering_map_painter',
    nameSeeds: ['唐野', '叶行川', '阿路'],
    ageBand: 'adult',
    gender: 'male',
    occupation: '游历绘图人',
    origin: '四海道',
    personalityTags: ['爱看热闹', '记性好', '不爱久留'],
    speechStyle: '说话常把方位和故事混在一起，像在口头画地图。',
    appearanceKeywords: ['旧地图筒', '磨破草鞋', '竹片量尺'],
    taboo: '不喜欢别人把游历说成无所事事。',
    lifeGoal: '想画一张能标出人情而不只标出道路的桃源周边图。',
    currentTrouble: '地图筒裂了，最近又缺能当路粮的清淡食物。',
    villagePurpose: '途经桃源时发现村路和人情比官道更难画，决定停几日补图。',
    romanceView: '不轻易许诺久留，但会认真记住愿意同行的人。',
    developmentRoutes: ['business', 'friendship'],
    plotHook: '游历',
    familySeed: '他跟着商队长大，有一位远亲在驿站收信，也欠旧路向导一份人情。',
    familyTies: [
      { id: 'post_station_cousin', kind: 'distant_relative', name: '唐小驿', relation: '远亲', summary: '在驿站替他收信，嘴上嫌他漂泊，仍会留一盏灯。', attitude: 'supportive' },
      { id: 'four_seas_caravan', kind: 'caravan', name: '四海道商队', relation: '商队', summary: '给他看过很多路，也会催他把地图卖出个价钱。', attitude: 'testing' },
      { id: 'old_guide_debt', kind: 'old_debt', name: '旧路向导', relation: '旧债', summary: '曾在山雾里救过他，他一直想画一张能还人情的路图。', attitude: 'burdened' }
    ],
    familyCommission: {
      id: 'guide_map_case',
      tieId: 'old_guide_debt',
      title: '旧向导的地图筒',
      summary: '他想寄回一只结实地图筒，请你备竹子和木材，好把新图送到旧路口。',
      requestedItems: [{ itemId: 'bamboo', quantity: 2 }, { itemId: 'wood', quantity: 2 }],
      rewardSummary: '商队和旧债评价提升，并让桃源路图多一条可回看的来路。'
    },
    preferences: {
      loved: ['peach', 'tea'],
      liked: ['bamboo', 'rice'],
      disliked: ['quartz']
    },
    dialogueOpening: '他蹲在村口量路宽，抬头问你桃源哪条小路最容易让人走着走着就熟了。',
    dialogueChoices: [
      { id: 'show_shortcut', text: '带他看一条田埂近路。', response: '他把田埂画得很细，说这条路不该只叫近路。', affinityChange: 15, relationshipTag: 'acquaintance', relationshipDirection: 'trust' },
      { id: 'ask_map_price', text: '问他的地图卖给谁。', response: '他笑着说卖给想来的人，也卖给想回去的人。', affinityChange: 11, relationshipTag: 'friend', relationshipDirection: 'family_impression' },
      { id: 'tease_wander', text: '打趣他是不是哪里都留不住。', response: '他没有生气，只在地图边角写下“未必”。', affinityChange: 7, relationshipDirection: 'ambiguity' }
    ],
    dialogueScenes: [
      { id: 'map_first_field_path', kind: 'first_meeting', title: '田埂量路', summary: '初见时一起确认村路、近路和人情路的差别。', triggerHint: '首次来访或游历钩子出现时触发。', relationshipDirection: 'trust' },
      { id: 'map_festival_crowd', kind: 'festival', title: '集市人流图', summary: '节会或集市前后记录人流、货摊和愿意停步的人。', triggerHint: '节会、订单或集市相关线索后出现。', relationshipDirection: 'family_impression' },
      { id: 'map_farewell_margin', kind: 'farewell', title: '地图边角', summary: '离别时在地图边角留下桃源注记，决定这条路是否会再回来。', triggerHint: '归档、长住收束或离别事件时出现。', relationshipDirection: 'ambiguity' }
    ],
    smallOrder: {
      id: 'road_food_map_case',
      title: '路粮和地图筒',
      summary: '想收米和竹子，修好地图筒后再备一份轻便路粮。',
      requestedItems: [{ itemId: 'rice', quantity: 2 }, { itemId: 'bamboo', quantity: 1 }],
      rewardSummary: '可回赠一段桃源周边路图和商队消息。'
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
