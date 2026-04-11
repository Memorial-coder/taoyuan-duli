// === 晨间随机事件数据 ===
// 设计理念：不是系统，是"早晨的一句旁白"

/** 效果类型 */
export type MorningEffect =
  | { type: 'loseCrop' }
  | { type: 'gainItem'; itemId: string; qty: number }
  | { type: 'gainMoney'; amount: number }
  | { type: 'gainFriendship'; amount: number }

/** 小偷/动物旁白（4%） */
export interface MorningNarration {
  message: string
  effect?: MorningEffect
}

/** 带选项事件（0.8%） */
export interface MorningChoiceEvent {
  id: string
  message: string
  choices: {
    label: string
    result: string
    effect?: MorningEffect
  }[]
}

/** 彩蛋旁白（0.2%） */
export interface MorningEasterEgg {
  message: string
  effect?: MorningEffect
}

// ==================== 4% 小偷/动物旁白（25条） ====================

export const MORNING_NARRATIONS: MorningNarration[] = [
  // —— 有轻微损失 ——
  { message: '地里的菜被什么啃了一口，旁边留下一串小爪印。', effect: { type: 'loseCrop' } },
  { message: '一只乌鸦叼走了一颗刚熟的果子，在枝头得意地叫了两声。', effect: { type: 'loseCrop' } },
  { message: '田里有一株作物被连根拔起扔在旁边，像是野猪干的。', effect: { type: 'loseCrop' } },
  { message: '角落里的一棵苗不知被谁踩断了，地上还留着蹄印。', effect: { type: 'loseCrop' } },
  // —— 有轻微收获 ——
  { message: '好像有人摘走了一把野菜，但在门口留了三文钱。', effect: { type: 'gainMoney', amount: 3 } },
  { message: '篱笆外有个草编的小篮子，里面放着几根草药，不知是谁留的。', effect: { type: 'gainItem', itemId: 'herb', qty: 1 } },
  { message: '屋后的柴堆旁多了一小捆竹子，整整齐齐的。大概是哪个好心的樵夫。', effect: { type: 'gainItem', itemId: 'bamboo', qty: 2 } },
  // —— 纯旁白 ——
  { message: '篱笆上挂着几根兔毛，看来夜里有不速之客。' },
  { message: '一只野猫在田埂上打盹，看样子已经赖了一夜了。' },
  { message: '菜地边上发现一堆松鼠藏的坚果壳，它们似乎很喜欢你的农场。' },
  { message: '清晨出门，发现地上有一串小脚印从菜地延伸到篱笆外。' },
  { message: '有只刺猬在堆肥堆里安了家，它看起来很满意现在的住所。' },
  { message: '田边的稻草人歪了，像是被什么撞了一下。大概是夜里路过的野鹿。' },
  { message: '水井旁发现了几根散落的羽毛，可能是野鸡来喝过水。' },
  { message: '屋顶上蹲着一只猫头鹰，正歪头打量你。你一动，它就飞走了。' },
  { message: '田坎边多了一个小洞，看着像是田鼠挖的。好在没伤到作物。' },
  { message: '晨雾散去，篱笆上挂着一张蜘蛛网，露珠在阳光下闪闪发亮。' },
  { message: '几只麻雀在屋檐下吵作一团，不知道在争什么。' },
  { message: '水渠里多了几条小蝌蚪，看来青蛙也喜欢你的农场。' },
  { message: '地头的大石头上趴着一只壁虎，一动不动地晒太阳。' },
  { message: '风吹过来一股桂花香，不知是谁家院子里飘来的。' },
  { message: '你的稻草人歪得更厉害了。说不定它晚上偷偷活动过。' },
  { message: '清晨有只蜻蜓落在你的锄头上，翅膀薄得透光。' },
  { message: '一群蚂蚁正搬着什么东西穿过田埂，队伍长得看不到尾。' },
  { message: '农场角落里多了一个小鸟窝，看来有鸟儿打算在这安家了。' }
]

/** 纯旁白（无 loseCrop）的子集，空农场回退用 */
export const NARRATIONS_NO_LOSS: MorningNarration[] = MORNING_NARRATIONS.filter(n => !n.effect || n.effect.type !== 'loseCrop')

// ==================== 0.8% 带选项事件（15条） ====================

export const MORNING_CHOICE_EVENTS: MorningChoiceEvent[] = [
  {
    id: 'injured_bird',
    message: '清晨，你在田边发现一只受伤的小鸟，它用黑豆般的眼睛望着你。',
    choices: [
      {
        label: '包扎伤口，放它养一阵',
        result: '你小心地包扎了小鸟的翅膀。村民们听说了这件事，都夸你心善。',
        effect: { type: 'gainFriendship', amount: 10 }
      },
      { label: '把它放回树丛', result: '小鸟扑棱着翅膀飞走了，临走前叫了两声，像是在道谢。' }
    ]
  },
  {
    id: 'hungry_traveler',
    message: '农场外来了个风尘仆仆的旅人，看起来又累又饿。',
    choices: [
      {
        label: '请他吃顿饭',
        result: '旅人吃饱后千恩万谢，临走时从包袱里掏出一把草药送你。',
        effect: { type: 'gainItem', itemId: 'herb', qty: 3 }
      },
      { label: '指路给他去村里', result: '旅人朝你鞠了一躬，沿着小路往村子走去了。' }
    ]
  },
  {
    id: 'stealing_child',
    message: '一个小孩正偷偷在你地里拔萝卜，见你出来吓得愣住了。',
    choices: [
      {
        label: '多送他几个',
        result: '小孩红着脸接过菜，鞠了个躬跑了。后来他娘专门来道谢。',
        effect: { type: 'gainFriendship', amount: 15 }
      },
      { label: '假装没看见', result: '你转身回屋，听到身后一阵窸窣声，然后是远去的脚步声。' }
    ]
  },
  {
    id: 'mysterious_cat',
    message: '一只从没见过的黑猫蹲在田里，面前整齐地放着一颗松果。',
    choices: [
      {
        label: '收下松果',
        result: '你弯腰捡起松果，黑猫喵了一声，慢悠悠地消失在晨雾中。',
        effect: { type: 'gainItem', itemId: 'pine_cone', qty: 1 }
      },
      { label: '摸摸它的头', result: '黑猫咕噜咕噜叫了几声，蹭了蹭你的手，然后翻墙走了。' }
    ]
  },
  {
    id: 'old_man_fishing',
    message: '一位白胡子老伯在你农场边的水渠钓鱼，看到你出来笑着打了声招呼。',
    choices: [
      { label: '坐下来聊一会', result: '老伯讲了不少种地的门道。你觉得受益匪浅。', effect: { type: 'gainFriendship', amount: 8 } },
      { label: '给他泡杯茶', result: '老伯高兴地喝了茶，走前留了几条鱼在桶里给你。', effect: { type: 'gainMoney', amount: 50 } }
    ]
  },
  {
    id: 'lost_dog',
    message: '一条脏兮兮的小狗蜷在你家门口，看起来走丢了很久。',
    choices: [
      {
        label: '给它洗个澡喂点吃的',
        result: '小狗摇着尾巴舔你的手。它在你家待了一天，傍晚被主人领走了。主人留了些钱表示感谢。',
        effect: { type: 'gainMoney', amount: 30 }
      },
      {
        label: '带它去村里找主人',
        result: '你带着小狗在村里转了一圈，很快找到了它的主人。大家都说你热心。',
        effect: { type: 'gainFriendship', amount: 8 }
      }
    ]
  },
  {
    id: 'herb_woman',
    message: '一位背着竹篓的老婆婆路过，问你能不能讨碗水喝。',
    choices: [
      {
        label: '端碗水给她',
        result: '老婆婆喝完水道了谢，临走从竹篓里抓了一把草药给你。',
        effect: { type: 'gainItem', itemId: 'herb', qty: 2 }
      },
      {
        label: '请她歇歇脚',
        result: '老婆婆坐了会儿，念叨着年轻人心好。你隐约觉得她有点面善。',
        effect: { type: 'gainFriendship', amount: 5 }
      }
    ]
  },
  {
    id: 'fox_standoff',
    message: '一只狐狸叼着什么东西蹲在菜地里，见你出来也不跑，就那么对视着。',
    choices: [
      { label: '挥挥手赶走它', result: '狐狸不紧不慢地跑了。你检查了一圈，菜地倒是没什么损失。' },
      {
        label: '丢块饼子给它',
        result: '狐狸丢下嘴里的东西，叼起饼跑了。你捡起来一看，是颗松果。',
        effect: { type: 'gainItem', itemId: 'pine_cone', qty: 1 }
      }
    ]
  },
  {
    id: 'broken_fence',
    message: '篱笆有一段被什么拱开了个洞，几只野兔正在田里悠闲地吃草。',
    choices: [
      { label: '先补篱笆', result: '你花了点功夫把篱笆补好了。野兔们慌慌张张地从缺口跑了出去。' },
      { label: '看看它们吃的啥', result: '野兔在啃杂草，没碰作物。你笑了笑，由它们去了。它们反而帮你除了些杂草。' }
    ]
  },
  {
    id: 'rain_mushroom',
    message: '昨夜下过雨，田埂边冒出了几个蘑菇。',
    choices: [
      {
        label: '采一些',
        result: '你认出这是可以吃的野蘑菇，顺手摘了几个。',
        effect: { type: 'gainItem', itemId: 'wild_mushroom', qty: 2 }
      },
      { label: '留着别动', result: '你决定让它们长着。说不定过几天会长更多。' }
    ]
  },
  {
    id: 'painting_visitor',
    message: '一个背着画板的年轻人站在田边，正在画你的农场。',
    choices: [
      {
        label: '过去看看',
        result: '画得还挺好。年轻人说这里的景色让他很有灵感，送了你几个铜板表示感谢。',
        effect: { type: 'gainMoney', amount: 20 }
      },
      {
        label: '送杯茶给他',
        result: '年轻人感激地接过茶。他说会把画寄回来给你。你期待了好一阵。',
        effect: { type: 'gainFriendship', amount: 5 }
      }
    ]
  },
  {
    id: 'snake_shed',
    message: '水渠边发现一条完整的蛇蜕，薄得近乎透明。',
    choices: [
      { label: '收起来', result: '老人说蛇蜕是好兆头。你把它挂在屋檐下，心情不错。' },
      { label: '放回原处', result: '你把蛇蜕放好，转身离开。大自然的东西，还是留在大自然吧。' }
    ]
  },
  {
    id: 'wild_bee_nest',
    message: '屋后的老树上多了个小蜂巢，几只蜜蜂嗡嗡地忙碌着。',
    choices: [
      { label: '让它们待着', result: '蜜蜂对庄稼的授粉有好处。你决定和它们和平共处。' },
      {
        label: '小心地取些蜜',
        result: '你用烟熏法取了一小块蜂蜜。虽然不多，但味道很甜。',
        effect: { type: 'gainItem', itemId: 'honey', qty: 1 }
      }
    ]
  },
  {
    id: 'stone_buddha',
    message: '翻地时挖出一个拳头大的石头，仔细看像个小佛像。',
    choices: [
      {
        label: '擦干净放在田边',
        result: '你把小佛像擦净放好。路过的村民说这是好彩头，大伙儿的运气要好了。',
        effect: { type: 'gainFriendship', amount: 10 }
      },
      { label: '收起来卖掉', result: '你拿去给村里的古董商看了看，换了些铜板。', effect: { type: 'gainMoney', amount: 66 } }
    ]
  },
  {
    id: 'bamboo_shoots',
    message: '昨夜的雨后，篱笆根部冒出了几根竹笋。',
    choices: [
      { label: '挖出来', result: '新鲜的笋子，做菜一定不错。', effect: { type: 'gainItem', itemId: 'bamboo', qty: 3 } },
      { label: '让它们长大', result: '你决定让竹笋长大。过不了多久，这里就会多几根竹子了。' }
    ]
  }
]

// ==================== 季节/天气 专属旁白 ====================

/** 春季旁白 */
export const MORNING_NARRATIONS_SPRING: MorningNarration[] = [
  { message: '春雨淅淅沥沥下了一夜，田里的泥土松软得像刚发好的面。' },
  { message: '桃花开了，风一吹，粉色的花瓣漫天飞舞，落进你的头发里。' },
  { message: '清晨的田间雾气未散，远处的山峦若隐若现，美得像一幅水墨画。' },
  { message: '篱笆边不知道什么时候钻出了几朵野蒲公英，黄澄澄的。', effect: { type: 'gainItem', itemId: 'dandelion', qty: 2 } },
  { message: '一只燕子衔着泥在屋檐下筑巢，来来回回忙了一早上。' },
  { message: '春风拂过麦苗，绿浪一波波涌过去，连心情也跟着舒展了。' }
]

/** 夏季旁白 */
export const MORNING_NARRATIONS_SUMMER: MorningNarration[] = [
  { message: '昨夜一场大雨，田埂边的水沟满了，几只青蛙跳进跳出。' },
  { message: '烈日还没出来，空气里已经有了暑意。蝉声从树林里传来，聒噪而热烈。' },
  { message: '荷塘边的荷花开了，粉白相间，蜻蜓停在花蕊上一动不动。' },
  { message: '你在地里翻出了几个大西瓜，圆滚滚的，拍一拍声音很脆。', effect: { type: 'gainItem', itemId: 'melon', qty: 1 } },
  { message: '今早的露水格外多，叶片上的水珠在阳光下折射出七彩光芒。' },
  { message: '热浪滚滚，连稻草人都好像晒蔫了。你给自己灌了两大碗水才出门。' }
]

/** 秋季旁白 */
export const MORNING_NARRATIONS_AUTUMN: MorningNarration[] = [
  { message: '落叶铺满了田间小路，踩上去沙沙作响，空气中有股成熟果实的甜香。' },
  { message: '秋风一来，墙角的枫树红了，像是有人泼了一桶红漆。' },
  { message: '篱笆上挂着晒干的红辣椒和玉米，红黄相间，煞是好看。' },
  { message: '今晨捡到几颗松果，油亮亮的，是松鼠搬运途中遗落的。', effect: { type: 'gainItem', itemId: 'pine_cone', qty: 2 } },
  { message: '菊花悄悄开了，淡黄色的小朵，清雅的香气弥漫在晨雾里。' },
  { message: '大雁排成人字形从头顶飞过，叫声高亢，往南方去了。' }
]

/** 冬季旁白 */
export const MORNING_NARRATIONS_WINTER: MorningNarration[] = [
  { message: '昨夜飘了雪，田间盖了一层薄薄的白。踩上去嘎吱作响，像踩碎了玻璃。' },
  { message: '结了冰的水渠在阳光下闪着光，一只麻雀站在冰面上，小心翼翼地挪步。' },
  { message: '北风呼号，但屋里的炉火烧得正旺。你裹紧棉袄出门，呼出一口白气。' },
  { message: '梅花开了，白雪红梅，不知是谁折了一枝插在你家门口的花瓶里。', effect: { type: 'gainMoney', amount: 30 } },
  { message: '霜冻让地面硬邦邦的，但土下的根茎正在积蓄着来年的力气。' },
  { message: '一只红腹的小鸟在枯枝上啄着什么，被你的脚步声惊飞，留下几根细小的羽毛。' }
]

/** 雨天专属旁白 */
export const MORNING_NARRATIONS_RAINY: MorningNarration[] = [
  { message: '雨声淅沥，打在芭蕉叶上噼啪作响。不用浇水了，今天多睡一会儿也无妨。' },
  { message: '雨后的泥土散发出清新的气息，蚯蚓钻出了地面，鸟儿们纷纷飞来觅食。' },
  { message: '屋檐的雨水串成珠帘滴落，地上积起了小小的水洼，里面映着铅灰色的天空。' },
  { message: '雨中的桃花更娇艳，粉红的花瓣沾着雨露，像是刚被洗过的绸缎。' },
  { message: '水渠涨水了，几条小鱼逆着水流游进来，在浅滩上活泼地跳跃。', effect: { type: 'gainItem', itemId: 'crucian', qty: 1 } },
  { message: '雨还没停，田里的作物喝饱了水，叶片油亮舒展，比昨天精神多了。' }
]

/** 晴天特殊旁白（大风/艳阳） */
export const MORNING_NARRATIONS_SUNNY: MorningNarration[] = [
  { message: '今天天气好得出奇，阳光把露水都晒干了，连空气都是暖的。' },
  { message: '微风送来阵阵花香，不知是哪里的野花开了，隔老远就能闻见。' },
  { message: '蓝天白云，鸟鸣清脆，这样的早晨让人忍不住想多干些活。' }
]

// ==================== 季节/天气 专属选择事件 ====================

export const MORNING_CHOICE_EVENTS_SPRING: MorningChoiceEvent[] = [
  {
    id: 'spring_seedling_gift',
    message: '秋月拎着一小篮种子站在田边：「春耕开始了，这是我自己留的种子，送给你。」她有点害羞地低着头。',
    choices: [
      { label: '高兴地接受', result: '你接过种子，秋月嘴角微微上扬。「好好种，秋天我来看成果。」', effect: { type: 'gainItem', itemId: 'seed_cabbage', qty: 3 } },
      { label: '「你自己留着吧」', result: '秋月愣了一下，然后点点头：「那……我送你别的。」第二天门口多了一罐自制果酱。', effect: { type: 'gainMoney', amount: 60 } }
    ]
  },
  {
    id: 'spring_rain_mud',
    message: '春雨把田间小路变成了烂泥地，陈伯正愁眉苦脸地盯着一辆陷进泥坑的推车。',
    choices: [
      { label: '一起去推车', result: '两个人使劲一推，车子出来了。陈伯拍着你的肩膀哈哈大笑，回头塞给你一把种子。', effect: { type: 'gainItem', itemId: 'seed_wheat', qty: 5 } },
      { label: '绕道走', result: '你绕了远路，听说最后是阿石路过帮忙推出来的。' }
    ]
  }
]

export const MORNING_CHOICE_EVENTS_SUMMER: MorningChoiceEvent[] = [
  {
    id: 'summer_drought_water',
    message: '连续几天没下雨，水渠干了一截。林老站在渠边发愁：「再不来雨，这茬庄稼就悬了……」',
    choices: [
      { label: '帮林老疏通另一条水道', result: '两人挖了一上午，引来了上游的水。林老感激地给了你一瓶珍藏药酒。', effect: { type: 'gainMoney', amount: 120 } },
      { label: '「我去问问阿石有没有水桶」', result: '阿石二话不说扛来了几个大木桶，问题暂时解决了。' }
    ]
  },
  {
    id: 'summer_firefly',
    message: '昨夜纳凉时，你在田边看到了漫天的萤火虫。今早，柳娘特地来问：「你昨晚也看到了吗？多少年没见过这么多萤火虫了。」',
    choices: [
      { label: '和她聊了好一会儿', result: '柳娘聊起了年轻时的故事，你们聊到快晌午才散。她心情很好，送了你一些草药。', effect: { type: 'gainItem', itemId: 'herb', qty: 3 } },
      { label: '「是啊，很美。」', result: '柳娘满足地点点头：「你这孩子懂得欣赏，很好。」' }
    ]
  }
]

export const MORNING_CHOICE_EVENTS_AUTUMN: MorningChoiceEvent[] = [
  {
    id: 'autumn_harvest_share',
    message: '丰收宴前，陈伯挑着两筐金灿灿的稻谷来找你：「今年收成好，这是大家凑的，给你送点儿来。」',
    choices: [
      { label: '高兴地收下', result: '你接过稻谷，心里暖暖的。陈伯拍拍手：「邻里相帮，应当的！」', effect: { type: 'gainItem', itemId: 'rice', qty: 5 } },
      { label: '「大家都留着自己用吧」', result: '陈伯愣了一下，然后点点头：「你这孩子实在。等会儿我让柳娘给你送点别的来。」', effect: { type: 'gainFriendship', amount: 15 } }
    ]
  },
  {
    id: 'autumn_mushroom',
    message: '秋雨过后，林老笑眯眯地提着一篮子蘑菇来找你：「山上的蘑菇冒出来了，你去采过吗？」',
    choices: [
      { label: '「还没，带我去看看？」', result: '林老领你上山，采了满满一篮。他边走边讲哪种能吃哪种不能吃，你学到了不少。', effect: { type: 'gainItem', itemId: 'mushroom', qty: 4 } },
      { label: '「我不太认识蘑菇……」', result: '林老哈哈大笑，从篮子里分了一半给你：「学嘛，慢慢来。」', effect: { type: 'gainItem', itemId: 'mushroom', qty: 2 } }
    ]
  }
]

export const MORNING_CHOICE_EVENTS_WINTER: MorningChoiceEvent[] = [
  {
    id: 'winter_frozen_water',
    message: '清早出门，发现水渠结冰了，林老正拿着锄头凿冰，累得直喘气。',
    choices: [
      { label: '接过锄头帮他凿', result: '你接过锄头，没一会儿就凿开了。林老摆摆手：「年轻人力气足，谢了。」他塞给你一包草药。', effect: { type: 'gainItem', itemId: 'herb', qty: 2 } },
      { label: '回屋拿热水来', result: '一桶热水浇下去，冰块哗哗融化。林老直夸你机灵。', effect: { type: 'gainFriendship', amount: 10 } }
    ]
  },
  {
    id: 'winter_new_year_prep',
    message: '除夕将近，柳娘在门口张贴春联，一边嘴里嘟囔着哪幅字好看。看到你出来，她问：「你觉得这幅怎么样？」',
    choices: [
      { label: '「很好！字写得漂亮。」', result: '柳娘高兴得眯起眼：「你这孩子嘴甜！」顺手塞给你一把炒瓜子。', effect: { type: 'gainMoney', amount: 30 } },
      { label: '「换那幅更喜庆。」', result: '柳娘看了看，点点头换上了另一幅：「还是你眼光好。」' }
    ]
  }
]

export const MORNING_CHOICE_EVENTS_RAINY: MorningChoiceEvent[] = [
  {
    id: 'rainy_shelter_traveler',
    message: '大雨倾盆，一个淋成落汤鸡的路人跑来敲你的门，想借雨具或避避雨。',
    choices: [
      { label: '请他进来躲雨喝茶', result: '路人暖和过来后，从包里掏出一块碎银表示感谢。「多谢好心人！」', effect: { type: 'gainMoney', amount: 80 } },
      { label: '借他一把斗笠', result: '路人连声道谢，冒雨走了。第二天有人把斗笠挂回你家门上，还压了几文钱。', effect: { type: 'gainMoney', amount: 20 } }
    ]
  }
]

/** 雪天专属旁白 */
export const MORNING_NARRATIONS_SNOWY: MorningNarration[] = [
  { message: '今早推开门，雪光刺眼，整个世界都被盖上了白色的棉被。' },
  { message: '雪地里留着一串动物的爪印，一直延伸到田垄深处，不知是谁走过。' },
  { message: '屋顶积了厚厚的雪，不时有大块的雪扑簌簌落下来，落在门口的台阶上。' },
  { message: '田间一片寂静，连鸟声都没了。只有远处炊烟袅袅，飘着腊肉的香气。' }
]

// ==================== 0.2% 彩蛋（10条） ====================

export const MORNING_EASTER_EGGS: MorningEasterEgg[] = [
  {
    message: '翻地时挖出了一枚古铜钱，上面的字迹已模糊不清，但隐约透着光泽。',
    effect: { type: 'gainItem', itemId: 'ancient_coin', qty: 1 }
  },
  { message: '一只金色的蝴蝶在田间飞舞，绕了你三圈后朝远山飞去。据说看到它的人会走好运。' },
  { message: '夜里似乎下了一场花瓣雨，整个农场弥漫着淡淡的花香。谁也说不清花从哪来的。' },
  { message: '你在水井底看到了自己的倒影，但倒影似乎对你笑了一下。大概是没睡醒吧。' },
  { message: '清晨推门，发现门口放着一束不知名的野花，用草绳扎得整整齐齐。没人知道是谁放的。', effect: { type: 'gainMoney', amount: 88 } },
  { message: '一只白鹤从天边飞来，在你的田里停了片刻，然后振翅而去。古人说白鹤是仙人的坐骑。' },
  { message: '今天早上，所有的作物似乎都比昨天精神了一些。也许是你的错觉，也许不是。' },
  {
    message: '你在枕头底下发现了一枚不知道从哪来的铜板。仔细想想，昨晚好像做了个关于财神的梦。',
    effect: { type: 'gainMoney', amount: 66 }
  },
  { message: '稻草人今天面朝了一个不同的方向。你确定昨天它不是这样放的。……确定吗？' },
  { message: '天还没亮时你听到远处传来几声笛声，悠扬得不像是凡人吹的。等你开门去看，什么也没有。' }
]
