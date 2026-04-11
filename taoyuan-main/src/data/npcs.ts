import type { NpcDef } from '@/types'

/** 所有NPC定义 */
export const NPCS: NpcDef[] = [
  // ============================================================
  // 原有 NPC (6)
  // ============================================================
  {
    id: 'chen_bo',
    name: '陈伯',
    gender: 'male',
    role: '万物铺老板',
    personality: '热心豪爽',
    birthday: { season: 'spring', day: 8 },
    lovedItems: ['tea', 'osmanthus', 'ginseng'],
    likedItems: ['cabbage', 'rice', 'potato', 'goat_milk', 'truffle', 'rabbit_foot', 'hanhai_spice'],
    hatedItems: ['copper_ore', 'quartz'],
    dialogues: {
      stranger: ['客官，初来乍到吧？老朽陈伯，万物铺就是我开的。', '{title}，有什么需要的尽管来，童叟无欺。'],
      acquaintance: ['哈哈，{title}又来了！今天想买点什么？', '最近进了些好货，你来看看。'],
      friendly: ['{player}跟你祖父年轻时一个样，能吃苦。', '有些好东西，我只留给{title}你。'],
      bestFriend: ['{player}，你就像我自己的孩子一样。', '这铺子，将来说不定就交给你了……开个玩笑。']
    }
  },
  {
    id: 'liu_niang',
    name: '柳娘',
    gender: 'female',
    role: '村长的女儿',
    personality: '温柔聪慧',
    birthday: { season: 'summer', day: 14 },
    lovedItems: ['chrysanthemum', 'osmanthus', 'peacock_feather'],
    likedItems: ['tea', 'wintersweet', 'rabbit_fur', 'rabbit_foot', 'hanhai_silk'],
    hatedItems: ['iron_ore', 'firewood'],
    dialogues: {
      stranger: ['你好，你是新来的田庄主人吧？我是柳娘。', '桃源乡很美的，{title}你会喜欢这里。'],
      acquaintance: ['今天天气不错，{title}也出来走走？', '我在读一本古诗集，要不要一起看看？'],
      friendly: ['有{title}在，村子热闹了不少呢。', '我做了些桂花糕，{player}尝一块吧。'],
      bestFriend: ['和{title}聊天总是很开心……', '这朵花送给你，是我在山上找到的。']
    },
    marriageable: true,
    heartEventIds: ['liu_niang_heart_3', 'liu_niang_heart_5', 'liu_niang_heart_8'],
    datingDialogues: [
      '今天想和{player}一起去溪边散步呢。',
      '{title}，我给你绣了个香囊，随身带着吧。',
      '能和{player}在一起的每一天，都像诗里写的那样美好。'
    ],
    zhijiDialogues: [
      '和{player}一起读诗的午后，是我最珍贵的时光。',
      '有些话只想说给知己听……{title}，谢谢你一直在。',
      '红颜知己，一世难求。遇见{player}是我的福气。'
    ],
    zhijiHeartEventIds: ['liu_niang_zhiji_7', 'liu_niang_zhiji_9']
  },
  {
    id: 'a_shi',
    name: '阿石',
    gender: 'male',
    role: '矿工',
    personality: '沉默寡言',
    birthday: { season: 'autumn', day: 5 },
    lovedItems: ['ruby', 'jade', 'hanhai_turquoise'],
    likedItems: ['gold_ore', 'iron_ore', 'potato', 'rabbit_foot'],
    hatedItems: ['chrysanthemum', 'wintersweet'],
    dialogues: {
      stranger: ['……嗯。', '矿洞……{title}小心点。'],
      acquaintance: ['{title}也去挖矿？……带上镐。', '深层有好东西，也有危险。'],
      friendly: ['这块矿石不错，给{title}。', '{player}的镐该升级了，我可以帮你看看。'],
      bestFriend: ['……{player}是我第一个朋友。', '最深处的宝藏……我只告诉{title}。']
    },
    marriageable: true,
    heartEventIds: ['a_shi_heart_3', 'a_shi_heart_5', 'a_shi_heart_8'],
    datingDialogues: [
      '……{player}，这块矿石很漂亮。像你的眼睛。',
      '以前觉得矿洞最好，现在……有{title}在的地方更好。',
      '我不太会说话……但{player}在身边就够了。'
    ],
    zhijiDialogues: ['……有你在旁边挖矿，效率好像变高了。', '{player}，这块矿石……只有知己才配拥有。', '不用说话也很自在……这就是知己吧。'],
    zhijiHeartEventIds: ['a_shi_zhiji_7', 'a_shi_zhiji_9']
  },
  {
    id: 'qiu_yue',
    name: '秋月',
    gender: 'female',
    role: '渔家女',
    personality: '活泼开朗',
    birthday: { season: 'winter', day: 20 },
    lovedItems: ['koi', 'giant_salamander'],
    likedItems: ['crucian', 'carp', 'grass_carp', 'bass', 'rabbit_foot'],
    hatedItems: ['copper_ore', 'iron_ore'],
    dialogues: {
      stranger: ['哎呀，新面孔！{title}你好，我是秋月，最会钓鱼的那个！', '想学钓鱼就来找我呀！'],
      acquaintance: ['今天溪水特别清，肯定能钓到大鱼！', '{title}钓鱼的样子越来越有模有样了嘛。'],
      friendly: ['这是我的私房钓点，只告诉{title}哦。', '我教{player}做红烧鲤鱼吧，超好吃的！'],
      bestFriend: ['以后一起去钓鱼好不好？每天都去！', '{title}是我见过最厉害的钓手！嘿嘿。']
    },
    marriageable: true,
    heartEventIds: ['qiu_yue_heart_3', 'qiu_yue_heart_5', 'qiu_yue_heart_8'],
    datingDialogues: [
      '{player}！今天的夕阳好美，我们一起看嘛！',
      '嘿嘿，{title}是我的了，别人不许抢。',
      '以后每天都一起钓鱼好不好？就我们两个！'
    ],
    zhijiDialogues: [
      '{player}！今天一起去钓鱼吧！只有知己才能去我的秘密钓点！',
      '嘿嘿，有什么心事都可以跟我说！我们可是知己！',
      '以后不管去哪儿，都带上{title}！'
    ],
    zhijiHeartEventIds: ['qiu_yue_zhiji_7', 'qiu_yue_zhiji_9']
  },
  {
    id: 'lin_lao',
    name: '林老',
    gender: 'male',
    role: '老中医',
    personality: '慈祥博学',
    birthday: { season: 'autumn', day: 22 },
    lovedItems: ['herb', 'tea', 'antler_velvet'],
    likedItems: ['winter_bamboo_shoot', 'bamboo', 'yak_milk', 'camel_milk', 'rabbit_foot', 'hanhai_spice'],
    hatedItems: ['ruby', 'gold_ore'],
    dialogues: {
      stranger: ['年轻人，初来此地，水土可还习惯？', '老夫行医数十载，{title}有什么不舒服的尽管说。'],
      acquaintance: ['这草药是好东西，可以入药也可以泡茶。', '{title}的气色比刚来时好多了。'],
      friendly: ['老夫有一剂药膳方子，可以增强体力。', '{player}的祖父……是老夫的故交。'],
      bestFriend: ['这部《本草拾遗》，送给{title}了。好好研读。', '桃源乡的未来，就拜托{player}了。']
    }
  },
  {
    id: 'xiao_man',
    name: '小满',
    gender: 'male',
    role: '木匠学徒',
    personality: '调皮好奇',
    birthday: { season: 'spring', day: 18 },
    lovedItems: ['watermelon', 'sweet_potato'],
    likedItems: ['wood', 'bamboo', 'radish', 'rabbit_foot'],
    hatedItems: ['herb', 'tea'],
    dialogues: {
      stranger: ['哇，你就是那个新来的！我是小满！', '{title}的田庄我去偷看过了，好破啊——啊不是，很有潜力！'],
      acquaintance: ['我最近在练做柜子，{title}要不要来一个？', '师父说我手艺还不行，哼！'],
      friendly: ['我帮{title}修工具吧！保证好使！', '嘿嘿，偷偷给{player}打个折。'],
      bestFriend: ['以后我要盖全村最大的房子！{title}帮我设计？', '{player}是我最好的朋友！……别告诉别人啊。']
    }
  },

  // ============================================================
  // 新增可婚 NPC (9) — 总计 12 可婚
  // ============================================================
  {
    id: 'chun_lan',
    name: '春兰',
    gender: 'female',
    role: '茶庄女主人',
    personality: '温婉端庄',
    birthday: { season: 'spring', day: 3 },
    lovedItems: ['tea', 'osmanthus', 'chrysanthemum'],
    likedItems: ['honey', 'lotus_seed', 'peach', 'rabbit_foot', 'hanhai_silk'],
    hatedItems: ['iron_ore', 'copper_ore'],
    dialogues: {
      stranger: ['请进，喝杯茶吧。我是春兰，这茶庄是祖上传下来的。', '{title}若喜欢喝茶，以后常来坐坐。'],
      acquaintance: ['今日泡的是明前龙井，{title}尝尝？', '采茶要赶在清晨露珠未干时，那时的叶子最嫩。'],
      friendly: ['{player}的口味我记住了，特意留了你喜欢的茶。', '我家有几亩茶园，改天带{title}去看看。'],
      bestFriend: ['和{title}品茶的时光，是我一天中最期待的事。', '这盏茶，只为{player}而泡。']
    },
    marriageable: true,
    heartEventIds: ['chun_lan_heart_3', 'chun_lan_heart_5', 'chun_lan_heart_8'],
    datingDialogues: [
      '这盏茶，是我为{player}特别调配的，尝尝看。',
      '和{title}品茶的午后，是我最珍贵的时光。',
      '{player}，以后的每一天，都愿与你共饮一壶清茶。'
    ],
    zhijiDialogues: [
      '这盏茶，只为知己而沏。{player}请慢用。',
      '茶庄的事，以前只有我一个人扛。有{title}在，轻松了许多。',
      '红颜知己共品茗，人生至乐莫过于此。'
    ],
    zhijiHeartEventIds: ['chun_lan_zhiji_7', 'chun_lan_zhiji_9']
  },
  {
    id: 'xue_qin',
    name: '雪芹',
    gender: 'female',
    role: '画师',
    personality: '孤傲清高',
    birthday: { season: 'winter', day: 10 },
    lovedItems: ['snow_lotus', 'moonstone'],
    likedItems: ['chrysanthemum', 'wintersweet', 'bamboo', 'rabbit_foot', 'hanhai_turquoise'],
    hatedItems: ['pickled_cabbage', 'dried_radish'],
    dialogues: {
      stranger: ['……你挡住我的光了。', '不买画的话，请不要碰那些颜料。'],
      acquaintance: ['{title}对画有兴趣？你眼光倒还行。', '这幅山水画，灵感来自村后的瀑布。'],
      friendly: ['{player}，你的田庄在夕阳下很美，我画了一幅。', '本来不喜欢人多的地方……但{title}来了还好。'],
      bestFriend: ['以前觉得世间无人懂我的画……直到遇见{player}。', '这幅画是为{title}画的，收好。']
    },
    marriageable: true,
    heartEventIds: ['xue_qin_heart_3', 'xue_qin_heart_5', 'xue_qin_heart_8'],
    datingDialogues: [
      '……{player}，你别动，让我画下你现在的样子。',
      '以前只在画里找美，现在……{title}比画更美。',
      '这幅画的名字叫《归处》。因为有你，我有了归处。'
    ],
    zhijiDialogues: [
      '……你是唯一能看我画画不让我烦躁的人。知己就是如此吧。',
      '这幅画的主题是「知音」……灵感来自{player}。',
      '以前觉得世间无人懂我。现在不这么想了。'
    ],
    zhijiHeartEventIds: ['xue_qin_zhiji_7', 'xue_qin_zhiji_9']
  },
  {
    id: 'su_su',
    name: '素素',
    gender: 'female',
    role: '裁缝',
    personality: '娴静手巧',
    birthday: { season: 'summer', day: 3 },
    lovedItems: ['silk', 'wintersweet', 'alpaca_wool', 'peacock_feather'],
    likedItems: ['wool', 'chrysanthemum', 'osmanthus', 'rabbit_fur', 'rabbit_foot'],
    hatedItems: ['iron_ore', 'stone'],
    dialogues: {
      stranger: ['欢迎来到素裁坊，我是素素。', '需要什么衣裳，{title}尽管说。'],
      acquaintance: ['{title}的衣裳破了个口子，让我帮你补补。', '这匹布的花色很特别，适合做春衫。'],
      friendly: ['我给{player}做了件背心，试试合不合身？', '一针一线，都是心意……'],
      bestFriend: ['{player}穿我做的衣服，是我最开心的事。', '以后我只给{title}一个人做衣裳。']
    },
    marriageable: true,
    heartEventIds: ['su_su_heart_3', 'su_su_heart_5', 'su_su_heart_8'],
    datingDialogues: [
      '我在给{player}做一件衣裳，每一针都是心意。',
      '{title}穿上我做的衣服时，是我最幸福的时刻。',
      '以后只给{player}一个人做衣裳……好不好？'
    ],
    zhijiDialogues: [
      '给{player}做的衣裳，每一针都格外用心……因为你是我的知己。',
      '有心事的时候，想到{title}就安心了。',
      '知己之间不需要太多言语……但我还是想多和{player}说说话。'
    ],
    zhijiHeartEventIds: ['su_su_zhiji_7', 'su_su_zhiji_9']
  },
  {
    id: 'hong_dou',
    name: '红豆',
    gender: 'female',
    role: '酒庄女',
    personality: '豪爽大方',
    birthday: { season: 'autumn', day: 10 },
    lovedItems: ['watermelon_wine', 'peach_wine', 'jujube_wine'],
    likedItems: ['watermelon', 'peanut', 'corn', 'rabbit_foot'],
    hatedItems: ['tea', 'herb'],
    dialogues: {
      stranger: ['哟，来一壶？我是红豆，这酒庄的当家人！', '不喝酒也行，进来坐坐，{title}别客气。'],
      acquaintance: ['今年的桃花酿不错，{title}来碗？', '酿酒的秘诀就是——用心！和大量的耐心。'],
      friendly: ['{player}算我的好朋友，这坛子酒送你了！', '下回咱们划拳喝酒，谁输谁请客！'],
      bestFriend: ['全村就{title}你配得上喝我的珍藏。', '{player}在，酒才香。']
    },
    marriageable: true,
    heartEventIds: ['hong_dou_heart_3', 'hong_dou_heart_5', 'hong_dou_heart_8'],
    datingDialogues: [
      '{player}！来，陪我喝一杯！今天的酒特别甜。',
      '嘿，{title}，你是唯一能让我脸红的人。',
      '以后酒庄的酒，全给{player}留着！谁也别想抢！'
    ],
    zhijiDialogues: [
      '{player}！来！知己之间喝酒不用客气！干了！',
      '全天下能跟我拼酒的只有{title}！这就是知己！',
      '有你这个知己，酒再烈也是甜的。'
    ],
    zhijiHeartEventIds: ['hong_dou_zhiji_7', 'hong_dou_zhiji_9']
  },
  {
    id: 'dan_qing',
    name: '丹青',
    gender: 'male',
    role: '书生',
    personality: '儒雅温文',
    birthday: { season: 'spring', day: 22 },
    lovedItems: ['tea', 'bamboo'],
    likedItems: ['chrysanthemum', 'osmanthus', 'pine_cone', 'rabbit_foot'],
    hatedItems: ['copper_ore', 'firewood'],
    dialogues: {
      stranger: ['在下丹青，游学至此，被这桃源胜景留住了脚步。', '{title}也是喜欢读书之人么？'],
      acquaintance: ['今日读了一篇好文章，与{title}分享。', '"山不在高，有仙则名"——桃源乡便是如此。'],
      friendly: ['{player}，改日我为你写一幅字吧。', '有{title}这样的知己，此生无憾。'],
      bestFriend: ['若非遇见{player}，我早已离开此地了。', '笔墨纸砚，不如{title}一笑。']
    },
    marriageable: true,
    heartEventIds: ['dan_qing_heart_3', 'dan_qing_heart_5', 'dan_qing_heart_8'],
    datingDialogues: [
      '今日写了一首词，是关于{player}的……要听吗？',
      '遇见{title}之前，我以为此生只与书卷为伴。',
      '{player}，"执子之手，与子偕老"，愿与你共赴白头。'
    ],
    zhijiDialogues: [
      '高山流水，觅得知音。{player}，你便是我的子期。',
      '今日又写了一篇新文，第一个想给{title}看。',
      '有{player}这般知己，纵使布衣一生，又有何憾？'
    ],
    zhijiHeartEventIds: ['dan_qing_zhiji_7', 'dan_qing_zhiji_9']
  },
  {
    id: 'a_tie',
    name: '阿铁',
    gender: 'male',
    role: '铁匠学徒',
    personality: '憨厚老实',
    birthday: { season: 'autumn', day: 15 },
    lovedItems: ['iron_ore', 'gold_ore'],
    likedItems: ['copper_ore', 'potato', 'corn', 'rabbit_foot'],
    hatedItems: ['chrysanthemum', 'silk'],
    dialogues: {
      stranger: ['啊，你、你好！我是阿铁……孙师父的学徒。', '打铁很累，但很有意思……{title}要看看么？'],
      acquaintance: ['{title}的工具有要修的么？我、我可以帮忙。', '今天打了一把好刀，孙师父居然夸我了！'],
      friendly: ['我偷偷给{player}的工具加了料，更耐用了。', '{title}是唯一不笑话我笨手笨脚的人……'],
      bestFriend: ['{player}……谢谢你一直鼓励我。', '等我出师了，第一件作品送给{title}。']
    },
    marriageable: true,
    heartEventIds: ['a_tie_heart_3', 'a_tie_heart_5', 'a_tie_heart_8'],
    datingDialogues: [
      '我、我给{player}打了个铁花……不好看的话就扔掉吧……',
      '有{title}在旁边看着我打铁，感觉锤子都轻了。',
      '{player}……我会努力出师的，然后……照顾你一辈子。'
    ],
    zhijiDialogues: [
      '有、有{player}在，我打铁更有劲了！知己就是这样吧！',
      '我给你打了个新工具，比、比给别人的都结实！',
      '{title}是我最好的兄弟！……啊不，是知己！'
    ],
    zhijiHeartEventIds: ['a_tie_zhiji_7', 'a_tie_zhiji_9']
  },
  {
    id: 'yun_fei',
    name: '云飞',
    gender: 'male',
    role: '猎人',
    personality: '桀骜不羁',
    birthday: { season: 'summer', day: 8 },
    lovedItems: ['wild_mushroom', 'ginseng'],
    likedItems: ['pine_cone', 'herb', 'wild_berry', 'rabbit_foot'],
    hatedItems: ['gold_ore', 'jade'],
    dialogues: {
      stranger: ['别靠太近，我不喜欢跟人打交道。', '在山里待惯了，村子太吵。'],
      acquaintance: ['……{title}怎么又来了。算了，坐吧。', '这是山里的蘑菇，比你们种的好吃。'],
      friendly: ['{player}，你是少数不让我烦的人。', '以后进山叫上{title}，路我熟。'],
      bestFriend: ['我这辈子不信任何人……除了{player}。', '{title}，跟我一起守这片山林吧。']
    },
    marriageable: true,
    heartEventIds: ['yun_fei_heart_3', 'yun_fei_heart_5', 'yun_fei_heart_8'],
    datingDialogues: [
      '……{player}，今天的月色不错。陪我坐一会儿。',
      '以前我只信自己。现在……也信{title}了。',
      '这座山，以后和{player}一起守。'
    ],
    zhijiDialogues: ['……以前不信任何人。但你不同，{player}。', '进山的路，只带你一个人走过。这就够了。', '知己……比朋友重，不输兄弟。'],
    zhijiHeartEventIds: ['yun_fei_zhiji_7', 'yun_fei_zhiji_9']
  },
  {
    id: 'da_niu',
    name: '大牛',
    gender: 'male',
    role: '牧场小伙',
    personality: '憨直热情',
    birthday: { season: 'winter', day: 3 },
    lovedItems: ['milk', 'hay', 'goat_milk', 'buffalo_milk', 'yak_milk'],
    likedItems: ['egg', 'corn', 'sweet_potato', 'truffle', 'donkey_milk', 'rabbit_foot'],
    hatedItems: ['ruby', 'moonstone'],
    dialogues: {
      stranger: ['嘿！你好你好！我是大牛！我最喜欢牛了！', '{title}养动物了么？我可以教你！'],
      acquaintance: ['我家那头老黄牛今天心情特别好！', '{title}，你摸摸这只小羊，软不软？'],
      friendly: ['{player}的鸡养得真不错，有我当年的风范！', '有空来我家，我给{title}看看新生的小牛犊！'],
      bestFriend: ['{player}是我见过最会照顾动物的人！', '{title}，将来咱们合开一个大牧场怎么样？']
    },
    marriageable: true,
    heartEventIds: ['da_niu_heart_3', 'da_niu_heart_5', 'da_niu_heart_8'],
    datingDialogues: [
      '{player}！今天小牛犊出生了！我第一个想告诉你！',
      '嘿嘿，和{title}在一起比和牛在一起还开心！',
      '以后咱们的牧场一定是全村最大的！{player}你信不信？'
    ],
    zhijiDialogues: [
      '{player}！你是我最铁的兄弟！比福宝还铁！',
      '有你陪我看牛、淋雨、赶羊……比什么都开心！',
      '咱俩以后合开牧场吧！知己搭伙，天下无敌！'
    ],
    zhijiHeartEventIds: ['da_niu_zhiji_7', 'da_niu_zhiji_9']
  },
  {
    id: 'mo_bai',
    name: '墨白',
    gender: 'male',
    role: '乐师',
    personality: '文静忧郁',
    birthday: { season: 'spring', day: 12 },
    lovedItems: ['bamboo', 'moonstone'],
    likedItems: ['tea', 'chrysanthemum', 'pine_cone', 'rabbit_foot'],
    hatedItems: ['iron_ore', 'pickled_cabbage'],
    dialogues: {
      stranger: ['……你好。我在练琴，请不要太大声。', '我叫墨白，流浪至此的乐师。'],
      acquaintance: ['{title}也喜欢听曲子？改天弹一首给你。', '这首曲子叫《秋水》，是为桃源乡写的。'],
      friendly: ['{player}来了，正好，新写了一首曲子，你听听。', '有{title}听我弹琴……心情好了很多。'],
      bestFriend: ['这首曲子没有名字……因为它是为{player}而作的。', '{title}是我的知音。']
    },
    marriageable: true,
    heartEventIds: ['mo_bai_heart_3', 'mo_bai_heart_5', 'mo_bai_heart_8'],
    datingDialogues: [
      '……{player}，这首曲子只弹给你听。',
      '以前总觉得音乐是孤独的……遇见{title}才明白，也可以是温暖的。',
      '为{player}谱一曲，名字就叫——《归人》。'
    ],
    zhijiDialogues: [
      '知音难觅……{player}是唯一能听懂我琴声的人。',
      '为你谱的曲子越来越多了……知己的力量真奇妙。',
      '有{title}在的日子，琴声都变得温暖了。'
    ],
    zhijiHeartEventIds: ['mo_bai_zhiji_7', 'mo_bai_zhiji_9']
  },

  // ============================================================
  // 不可婚 NPC (22) — 总计 22 不可婚
  // ============================================================
  {
    id: 'wang_dashen',
    name: '王大婶',
    gender: 'female',
    role: '村里的厨娘',
    personality: '热心善良',
    birthday: { season: 'summer', day: 18 },
    lovedItems: ['rice', 'sesame_oil'],
    likedItems: ['cabbage', 'radish', 'egg', 'rabbit_foot'],
    hatedItems: ['quartz', 'obsidian'],
    dialogues: {
      stranger: ['哎哟，新来的吧？瘦得跟竹竿似的，来来来，婶子给你盛碗饭！', '我是王大婶，村里红白喜事的大厨！'],
      acquaintance: ['{title}今天吃了没？没吃我给你热碗粥。', '做菜的秘诀就是——盐要少放，爱要多放。'],
      friendly: ['{player}越来越壮实了，看来没少吃婶子做的饭！', '这是婶子的拿手菜，{title}尝尝。'],
      bestFriend: ['{player}就跟我自己孩子似的，看着你忙里忙外，婶子心疼。', '啥时候成家啊？婶子给你操办酒席！']
    }
  },
  {
    id: 'zhao_mujiang',
    name: '赵木匠',
    gender: 'male',
    role: '木匠师傅',
    personality: '严厉认真',
    birthday: { season: 'autumn', day: 1 },
    lovedItems: ['wood', 'bamboo'],
    likedItems: ['pine_resin', 'camphor_oil', 'rabbit_foot'],
    hatedItems: ['watermelon', 'peanut'],
    dialogues: {
      stranger: ['嗯？找我有事？我是赵木匠。手艺的事，直说。', '小满那小子又偷懒了吧……'],
      acquaintance: ['你的农舍结构不错，前人手艺。{title}好好维护。', '木头这东西，跟人一样，要顺着它的纹理来。'],
      friendly: ['{player}不错，做事踏实，不像小满那个猴子。', '有需要修缮的，来找{title}……不，来找我。'],
      bestFriend: ['{player}，你让我想起了我年轻的时候。', '这把刨子跟了我三十年，送给{title}了。']
    }
  },
  {
    id: 'sun_tiejiang',
    name: '孙铁匠',
    gender: 'male',
    role: '铁匠',
    personality: '粗犷豪迈',
    birthday: { season: 'winter', day: 15 },
    lovedItems: ['gold_ore', 'iridium_ore', 'copper_ore'],
    likedItems: ['iron_ore', 'crystal_ore', 'rabbit_foot'],
    hatedItems: ['chrysanthemum', 'silk'],
    dialogues: {
      stranger: ['打铁的活找我就对了！我是孙铁匠！', '阿铁是我徒弟，手艺还嫩着呢。{title}的工具我亲自来。'],
      acquaintance: ['好钢用在刀刃上，{title}的工具该升级了。', '听那锤声——叮叮当当，比唱歌好听！'],
      friendly: ['{player}，这把刀我打了三天三夜，你试试。', '有{title}这样的好主顾，我打铁都更有劲了！'],
      bestFriend: ['全村最好的铁器，都在{player}手里。', '{title}什么时候想打一件神兵利器，跟老孙说！']
    }
  },
  {
    id: 'zhang_popo',
    name: '张婆婆',
    gender: 'female',
    role: '织布老人',
    personality: '慈祥唠叨',
    birthday: { season: 'spring', day: 7 },
    lovedItems: ['wool', 'silk'],
    likedItems: ['tea', 'pumpkin', 'sweet_potato', 'rabbit_foot'],
    hatedItems: ['gold_ore', 'ruby'],
    dialogues: {
      stranger: ['哎呀呀，年轻人来啦？快坐快坐。老婆子我姓张，织了一辈子布。', '你穿的这衣裳不行，回头婆婆给你织一件。'],
      acquaintance: ['{title}来啦？喝口茶。婆婆给你讲讲以前的事。', '我年轻的时候啊，这村子可热闹了……'],
      friendly: ['{player}真是个好孩子。婆婆织了条围巾给你。', '你祖父以前常来找婆婆聊天，你跟他一样和善。'],
      bestFriend: ['有{player}在，婆婆觉得安心。', '老婆子活了这么大岁数，{title}是最让我欣慰的后辈。']
    }
  },
  {
    id: 'li_yu',
    name: '李渔翁',
    gender: 'male',
    role: '老渔翁',
    personality: '淡泊悠闲',
    birthday: { season: 'summer', day: 22 },
    lovedItems: ['koi', 'sturgeon'],
    likedItems: ['crucian', 'bass', 'tea', 'rabbit_foot'],
    hatedItems: ['gold_ore', 'ruby'],
    dialogues: {
      stranger: ['嗬，又来了个钓鱼的。老朽李渔翁，在这溪边坐了二十年了。', '钓鱼么？急不得。'],
      acquaintance: ['鱼竿是手的延伸，心静了鱼自然来。', '{title}今日运气如何？'],
      friendly: ['{player}的钓术进步了，有点老夫当年的意思。', '这个钓法叫"落叶钩"，传给{title}了。'],
      bestFriend: ['一竿一线一壶酒，有{player}作伴，不枉此生。', '老夫的毕生所学，都交给{title}了。']
    }
  },
  {
    id: 'zhou_xiucai',
    name: '周秀才',
    gender: 'male',
    role: '私塾先生',
    personality: '迂腐可爱',
    birthday: { season: 'autumn', day: 18 },
    lovedItems: ['bamboo', 'tea'],
    likedItems: ['chrysanthemum', 'osmanthus', 'rabbit_foot'],
    hatedItems: ['pickled_cabbage', 'corn_wine'],
    dialogues: {
      stranger: ['"有朋自远方来，不亦乐乎"。在下周秀才，此地的私塾先生。', '{title}可曾读过《论语》？'],
      acquaintance: ['子曰：温故而知新。{title}最近可有读书？', '今日教阿花和石头写字，那两个顽童……唉。'],
      friendly: ['{player}虽是农人，却有读书人的气度。', '我新得了一本古籍，{title}有兴趣一起研读么？'],
      bestFriend: ['{player}乃吾之良友也！', '这支毛笔是先师遗物，赠与{title}，望善用之。']
    }
  },
  {
    id: 'wu_shen',
    name: '吴婶',
    gender: 'female',
    role: '杂货帮工',
    personality: '精明世故',
    birthday: { season: 'spring', day: 25 },
    lovedItems: ['honey', 'sesame_oil'],
    likedItems: ['egg', 'rice', 'peanut', 'rabbit_foot'],
    hatedItems: ['wild_mushroom', 'pine_cone'],
    dialogues: {
      stranger: ['新来的？万物铺的事找陈伯，零碎活儿找我就行。', '我是吴婶，在铺子里帮工的。'],
      acquaintance: ['{title}，今天的白菜新鲜着呢，买点？', '陈伯心太软，老是赊账，我可不惯着。'],
      friendly: ['{player}的生意不错啊！偷偷告诉你，下批货我给你留点好的。', '做人啊，精打细算才能过好日子。'],
      bestFriend: ['{player}是我见过最会持家的年轻人。', '有事儿找吴婶，{title}开口我准帮。']
    }
  },
  {
    id: 'ma_liu',
    name: '马六',
    gender: 'male',
    role: '货郎',
    personality: '油嘴滑舌',
    birthday: { season: 'winter', day: 25 },
    lovedItems: ['jade', 'prismatic_shard'],
    likedItems: ['gold_ore', 'honey', 'peach', 'rabbit_foot'],
    hatedItems: ['stone', 'wood'],
    dialogues: {
      stranger: ['哎哟{title}！我是马六，走南闯北的行商！稀罕玩意儿多了去了！', '来来来看看，保证外面买不到！'],
      acquaintance: ['{title}来啦！今天给你看点好东西——独家的！', '做生意讲的是诚信……嘿嘿，当然还有利润。'],
      friendly: ['{player}，老熟客了，给你打个八折！', '我走遍天下，就{title}这村子最让人舒坦。'],
      bestFriend: ['{player}是我最信得过的人，这些好货你先挑。', '别看我油嘴滑舌的，{title}面前我说的都是真心话。']
    }
  },
  {
    id: 'lao_song',
    name: '老宋',
    gender: 'male',
    role: '守夜人',
    personality: '沉稳寡言',
    birthday: { season: 'summer', day: 10 },
    lovedItems: ['tea', 'firewood'],
    likedItems: ['wood', 'pine_resin', 'herb', 'rabbit_foot'],
    hatedItems: ['watermelon', 'peach'],
    dialogues: {
      stranger: ['……嗯。老宋。守夜的。', '夜里有什么动静，{title}别慌。'],
      acquaintance: ['夜深了，{title}早点回去。', '月亮好亮……'],
      friendly: ['{player}是个勤快人，每天起得比鸡早。', '这壶热茶留给{title}了，夜里暖暖。'],
      bestFriend: ['守了二十年的夜，{player}是少数愿意跟我说话的人。', '有{title}在，老宋心里踏实。']
    }
  },
  {
    id: 'pang_shen',
    name: '胖婶',
    gender: 'female',
    role: '豆腐坊老板',
    personality: '泼辣爽快',
    birthday: { season: 'autumn', day: 25 },
    lovedItems: ['broad_bean', 'sesame'],
    likedItems: ['rice', 'peanut', 'cabbage', 'rabbit_foot'],
    hatedItems: ['ruby', 'jade'],
    dialogues: {
      stranger: ['来买豆腐的吧？新鲜的！我是胖婶！', '{title}别看我胖，干活麻利着呢！'],
      acquaintance: ['今天的豆腐脑特别嫩，{title}来一碗？', '做豆腐最重要的是水要好，我们村的泉水一流！'],
      friendly: ['{player}，给你留了块老豆腐，拿去炖汤！', '你是个实在人，不像马六那个滑头。'],
      bestFriend: ['{player}什么时候请婶子吃喜酒啊？', '{title}算是婶子的半个孩子了！']
    }
  },
  {
    id: 'a_hua',
    name: '阿花',
    gender: 'female',
    role: '陈伯的孙女',
    personality: '天真烂漫',
    birthday: { season: 'spring', day: 1 },
    lovedItems: ['watermelon', 'wild_berry'],
    likedItems: ['peach', 'honey', 'peanut', 'rabbit_foot'],
    hatedItems: ['herb', 'ginseng'],
    dialogues: {
      stranger: ['你是谁呀？我叫阿花！爷爷说不能跟陌生人说话……啊我说了！', '{title}你种的什么呀？好看不好看？'],
      acquaintance: ['{title}！今天石头又欺负我了！哼！', '周先生教我写"花"字，可难了。'],
      friendly: ['{player}，给你看我捡的漂亮石头！', '我最喜欢{title}了！比石头好一百倍！'],
      bestFriend: ['{player}，我画了一幅画送给你！你看，这是你在种田。', '长大以后我也要像{title}一样厉害！']
    }
  },
  {
    id: 'shi_tou',
    name: '石头',
    gender: 'male',
    role: '村里顽童',
    personality: '调皮捣蛋',
    birthday: { season: 'summer', day: 25 },
    lovedItems: ['sweet_potato', 'watermelon'],
    likedItems: ['wild_berry', 'corn', 'peanut', 'rabbit_foot'],
    hatedItems: ['tea', 'herb'],
    dialogues: {
      stranger: ['嘿嘿嘿！你就是那个新来的农夫？看起来不怎么厉害嘛！', '我叫石头！全村跑得最快！'],
      acquaintance: ['{title}，要不要比赛跑步？', '我今天往周先生墨汁里加了水，他没发现！嘿嘿！'],
      friendly: ['{player}，教我钓鱼嘛！秋月姐姐老说我太吵！', '偷偷告诉{title}一个秘密——村后面的山洞里有蝙蝠！'],
      bestFriend: ['其实……{player}，我爸妈在外面做工，很久没回来了。', '{title}以后还会在村里吧？别走好不好？']
    }
  },
  {
    id: 'hui_niang',
    name: '慧娘',
    gender: 'female',
    role: '绣庄老板',
    personality: '坚韧温和',
    birthday: { season: 'winter', day: 8 },
    lovedItems: ['silk', 'chrysanthemum', 'alpaca_wool'],
    likedItems: ['wool', 'tea', 'osmanthus', 'rabbit_fur', 'peacock_feather', 'rabbit_foot'],
    hatedItems: ['iron_ore', 'copper_ore'],
    dialogues: {
      stranger: ['你好，我是慧娘。这间绣庄是我丈夫留下的。', '{title}若需要绣品，可以来看看。'],
      acquaintance: ['一个人撑这间绣庄不容易，但总算过来了。', '{title}今日好闲呢。'],
      friendly: ['{player}是个有担当的人，让人放心。', '这条绣帕送给{title}，是我自己绣的。'],
      bestFriend: ['{player}让我明白，一个人也可以活得很好。', '有{title}在，慧娘不觉得孤单了。']
    }
  },
  {
    id: 'lao_lu',
    name: '老陆',
    gender: 'male',
    role: '酒窖老板',
    personality: '嗜酒好客',
    birthday: { season: 'autumn', day: 8 },
    lovedItems: ['watermelon_wine', 'peach_wine'],
    likedItems: ['jujube_wine', 'corn_wine', 'peanut', 'rabbit_foot'],
    hatedItems: ['tea', 'herb'],
    dialogues: {
      stranger: ['来来来！进来喝一杯！我是老陆！', '人生在世，不喝酒多无趣啊！{title}你说是不是？'],
      acquaintance: ['{title}！来来来，今天试试新酿的桃花酒！', '红豆那丫头酿酒天赋比我都高……嘿。'],
      friendly: ['{player}啊，你这人实在，老陆就喜欢跟实在人喝酒。', '这坛三年陈的好酒，给{title}留着呢。'],
      bestFriend: ['能跟{player}对饮，是老陆这辈子的幸事。', '{title}，来，干了这杯！']
    }
  },
  {
    id: 'liu_cunzhang',
    name: '柳村长',
    gender: 'male',
    role: '村长',
    personality: '威严公正',
    birthday: { season: 'summer', day: 5 },
    lovedItems: ['tea', 'ginseng'],
    likedItems: ['herb', 'osmanthus', 'bamboo', 'rabbit_foot'],
    hatedItems: ['pickled_cabbage', 'firewood'],
    dialogues: {
      stranger: ['你就是接手那片田庄的年轻人？我是柳村长。希望你能不辱祖辈留下的基业。', '桃源乡的规矩，不可不守。'],
      acquaintance: ['{title}最近干得不错，村民们都说你勤快。', '柳娘跟我提过你几次……嗯。'],
      friendly: ['{player}，你为村子做的事，老夫都看在眼里。', '当年你祖父也是这般有魄力。'],
      bestFriend: ['{player}是桃源乡之福。', '老夫年事已高，这村子的未来，{title}要多担待了。']
    }
  },
  {
    id: 'qian_niang',
    name: '钱娘',
    gender: 'female',
    role: '药铺学徒',
    personality: '害羞温顺',
    birthday: { season: 'winter', day: 12 },
    lovedItems: ['herb', 'ginseng'],
    likedItems: ['tea', 'chrysanthemum', 'winter_bamboo_shoot', 'rabbit_foot'],
    hatedItems: ['iron_ore', 'gold_ore'],
    dialogues: {
      stranger: ['啊……你好……我、我是钱娘，林老的学徒。', '需要草药的话……可以来找我……'],
      acquaintance: ['{title}好……今天采了些新鲜的草药。', '林老教了我好多方子，我在努力记呢……'],
      friendly: ['{player}，这药丸是我练习做的，你、你试试？', '有{title}来聊天，我就不那么紧张了。'],
      bestFriend: ['和{player}在一起……我好像变勇敢了一点。', '{title}的体力补剂，我一定用心做。']
    }
  },
  {
    id: 'he_zhanggui',
    name: '何掌柜',
    gender: 'male',
    role: '茶楼掌柜',
    personality: '圆滑健谈',
    birthday: { season: 'spring', day: 15 },
    lovedItems: ['tea', 'honey'],
    likedItems: ['osmanthus', 'lotus_seed', 'peanut', 'rabbit_foot'],
    hatedItems: ['iron_ore', 'stone'],
    dialogues: {
      stranger: ['哎哟哟，贵客临门！小店何掌柜，给您沏壶好茶！', '{title}头一回来吧？坐坐坐！'],
      acquaintance: ['{title}的老位子给你留着呢！', '村里的八卦——不是，消息，都在茶楼里传。'],
      friendly: ['{player}啊，你那些农场趣事我都听说了，哈哈哈！', '好茶配好友，{title}你就是我的好友！'],
      bestFriend: ['论起{player}的为人，全村没一个不竖大拇指的。', '{title}的茶钱？免了免了！老朋友还收什么钱。']
    }
  },
  {
    id: 'qin_dashu',
    name: '秦大叔',
    gender: 'male',
    role: '果园主人',
    personality: '朴实勤劳',
    birthday: { season: 'autumn', day: 12 },
    lovedItems: ['peach', 'jujube'],
    likedItems: ['persimmon', 'sweet_potato', 'corn', 'rabbit_foot'],
    hatedItems: ['jade', 'moonstone'],
    dialogues: {
      stranger: ['你好，我姓秦，大伙儿叫我秦大叔。我在村东有片果园。', '果树这东西，种下去就得等。{title}急不得。'],
      acquaintance: ['{title}也种果树了？有不懂的来问我。', '今年的桃子特别甜，给你留了几个。'],
      friendly: ['{player}种地的手艺越来越好了。', '这几棵果苗是我培育的，{title}拿去种。'],
      bestFriend: ['{player}让我想起了我年轻时的干劲。', '我那果园，{title}随时可以来摘果子。']
    }
  },
  {
    id: 'a_fu',
    name: '阿福',
    gender: 'male',
    role: '放牛娃',
    personality: '憨厚乐观',
    birthday: { season: 'winter', day: 5 },
    lovedItems: ['sweet_potato', 'milk', 'goat_milk'],
    likedItems: ['corn', 'hay', 'wild_berry', 'truffle', 'buffalo_milk', 'rabbit_foot'],
    hatedItems: ['jade', 'silk'],
    dialogues: {
      stranger: ['嘿嘿，你好！我是阿福！我帮大牛哥看牛的！', '牛最可爱了，{title}你说对不对！'],
      acquaintance: ['{title}！今天牛又从栅栏里跑出来了，嘿嘿。', '大牛哥说我以后能当牧场主！'],
      friendly: ['{player}家的鸡下蛋了没？我家牛今天产奶了！', '我给{title}编了个草帽，不好看但能遮太阳！'],
      bestFriend: ['{player}对我真好……跟大牛哥一样好。', '等我长大了，也要像{title}一样有出息！']
    }
  }
]

/** 根据ID获取NPC定义 */
export const getNpcById = (id: string): NpcDef | undefined => {
  return NPCS.find(n => n.id === id)
}
