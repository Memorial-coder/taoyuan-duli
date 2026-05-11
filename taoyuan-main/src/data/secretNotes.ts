import type { SecretNoteDef } from '@/types'

// WS04 anchor: secret notes are the base layer for future clue -> verification ->
// record chains, including gift hints, hidden leads, and discovery callbacks.

/** 所有秘密笔记 */
export const SECRET_NOTES: SecretNoteDef[] = [
  {
    id: 1,
    type: 'tip',
    category: 'location',
    title: '残破的纸条',
    content: '桃花林深处似乎藏着什么……春季的桃花落下时，偶尔能在地上发现稀有的东西。',
    sourceHints: ['tree', 'resource'],
    usable: false,
    verification: {
      summary: '春季前往竹林采集，留意桃花落下时的地面异样。',
      hint: '这更像一条地点线索，不会立刻给奖励。',
      successText: '你循着纸条上的描述在落花间翻找，果然找到了一份被掩住的小收获。',
      recordText: '你验证了桃花林落花时的隐藏地点线索。',
      requiredSeason: 'spring',
      requiredPanel: 'forage'
    }
  },
  {
    id: 2,
    type: 'treasure',
    category: 'treasure',
    title: '矿工的遗书',
    content: '我把毕生积蓄藏在矿洞第20层的一个隐秘角落……如果你能找到这封信，这些钱就归你了。',
    sourceHints: ['mining', 'monster'],
    usable: true,
    verification: {
      summary: '进入矿洞 20 层后再尝试兑现。',
      hint: '纸条先记下了地点，真正到达矿层后才能取出遗产。',
      successText: '你在矿洞第20层摸到了藏匿的钱袋，遗书里的积蓄终于重见天日。',
      recordText: '你兑现了矿工遗书对应的矿洞藏宝。',
      requiredPanel: 'mining',
      requiredMineFloor: 20
    },
    reward: { money: 500 }
  },
  {
    id: 3,
    type: 'npc',
    category: 'gift',
    title: '渔翁的喜好',
    content: '李渔翁最爱锦鲤。他说锦鲤是河中之王，能钓到锦鲤的人，才是真正的渔夫。',
    sourceHints: ['fishing'],
    usable: false
  },
  {
    id: 4,
    type: 'story',
    title: '桃源志·上',
    content: '百年前，一位隐士发现了这片与世隔绝的山谷。谷中桃花遍野，溪水潺潺，宛如世外桃源。他便在此建村定居，取名"桃源乡"。',
    usable: false
  },
  {
    id: 5,
    type: 'treasure',
    category: 'treasure',
    title: '竹林秘图',
    content: '在竹林最茂密的地方，有一块苔藓覆盖的石头，翻开它就能找到一块上好的翡翠。',
    sourceHints: ['resource', 'tree'],
    usable: true,
    verification: {
      summary: '前往竹林采集区，按线索寻找苔石。',
      hint: '纸条提到的是一处地点，不是在背包里直接打开。',
      successText: '你在最茂密的竹影间翻开苔石，摸出了一块被藏好的翡翠。',
      recordText: '你找到了竹林秘图标记的苔石藏点。',
      requiredPanel: 'forage'
    },
    reward: { items: [{ itemId: 'jade', quantity: 1 }] }
  },
  {
    id: 6,
    type: 'tip',
    category: 'location',
    title: '钓鱼心得',
    content: '满月的夜晚，水中的鱼儿格外活跃。如果你想钓到稀有的鱼，不妨在月圆之夜试试。',
    sourceHints: ['fishing'],
    usable: false,
    verification: {
      summary: '夜晚前往钓鱼点，再来验证这条纸条的说法。',
      hint: '这条笔记会记录夜钓见闻，不会直接发钱。',
      successText: '夜色落下后，水面确实比白天更躁动，你把这条纸条记成了可靠的夜钓经验。',
      recordText: '你验证了夜钓活跃时段的纸条见闻。',
      requiredPanel: 'fishing',
      requiredHourMin: 20,
      requiredHourMax: 24
    }
  },
  {
    id: 7,
    type: 'npc',
    category: 'gift',
    title: '铁匠的秘密',
    content: '孙铁匠虽然整天打铁，但他内心其实很喜欢铜矿石。他说铜是最温暖的金属。',
    sourceHints: ['mining'],
    usable: false
  },
  {
    id: 8,
    type: 'story',
    title: '桃源志·下',
    content: '隐士去世后，村民们世代守护着这片土地。他们定下规矩：不许砍伐桃花林，不许污染溪水。桃源乡就这样安静地度过了百年时光。',
    usable: false
  },
  {
    id: 9,
    type: 'treasure',
    category: 'treasure',
    title: '河边的秘密',
    content: '在小溪拐弯处的大石头下面，我曾经藏了一笔钱。如果你能找到，就拿去用吧。',
    sourceHints: ['fishing', 'resource'],
    usable: true,
    verification: {
      summary: '去钓鱼区河湾处核对这条河边线索。',
      hint: '这是一条地点藏宝，需要到河边再确认。',
      successText: '你在河湾大石下摸到一个小布包，里面果然塞着被人遗忘的钱。',
      recordText: '你兑现了河边秘密留下的藏宝线索。',
      requiredPanel: 'fishing'
    },
    reward: { money: 800 }
  },
  {
    id: 10,
    type: 'tip',
    category: 'location',
    title: '采集笔记',
    content: '下雨天的时候，山野间会出现一些平时罕见的采集物。雨后的竹林尤其值得一看。',
    sourceHints: ['resource', 'tree'],
    usable: false,
    verification: {
      summary: '雨天前往竹林采集，确认这条天气线索。',
      hint: '需要把天气和地点对上，才算真正验证。',
      successText: '雨后的竹林确实多了平日少见的草木气息，你把这条天气经验记进了见闻。',
      recordText: '你验证了雨后竹林更易出现稀有采集物。',
      requiredWeather: 'rainy',
      requiredPanel: 'forage'
    }
  },
  {
    id: 11,
    type: 'npc',
    category: 'gift',
    title: '柳娘的心事',
    content: '柳娘最喜欢桂花。每年秋天，她都会在桂花树下坐上一整天。',
    sourceHints: ['tree', 'resource'],
    usable: false
  },
  {
    id: 12,
    type: 'treasure',
    category: 'treasure',
    title: '矿洞暗号',
    content: '矿洞暗河层的尽头，有一个被水冲刷出来的洞穴。里面藏着一块珍贵的月光石。',
    sourceHints: ['mining', 'monster'],
    usable: true,
    verification: {
      summary: '深入矿洞更深层，再去找暗河尽头的冲刷洞穴。',
      hint: '只有真正深入矿层后，这条暗号才有意义。',
      successText: '你顺着暗河的回声找到了被水冲开的洞口，月光石就躺在里面。',
      recordText: '你找到了矿洞暗号指向的暗河洞穴。',
      requiredPanel: 'mining',
      requiredMineFloor: 40
    },
    reward: { items: [{ itemId: 'moonstone', quantity: 1 }] }
  },
  {
    id: 13,
    type: 'story',
    title: '瀚海商路',
    content: '很久以前，桃源乡并非与世隔绝。一条商路穿过西边的荒原，连接着远方的异域。商人们称那片荒原为"瀚海"，因为沙石浩瀚如海。',
    usable: false
  },
  {
    id: 14,
    type: 'tip',
    title: '种植心得',
    content: '作物的品质受到很多因素影响：土地肥力、浇水频率、季节适宜度……甚至每天的运势都可能有影响。',
    usable: false
  },
  {
    id: 15,
    type: 'npc',
    category: 'gift',
    title: '厨娘的愿望',
    content: '王大婶一直想做出最完美的米饭。她说，好的大米是一切美食的根基。',
    sourceHints: ['resource'],
    usable: false
  },
  {
    id: 16,
    type: 'treasure',
    category: 'treasure',
    title: '老井传说',
    content: '村口废弃的老井底部，据说藏着建村时埋下的镇村之宝。井虽然干了，宝物应该还在。',
    sourceHints: ['digging', 'resource'],
    usable: true,
    verification: {
      summary: '等村口环境修整后，再回村里核对老井传说。',
      hint: '纸条里的字迹提到旧井，但现在还得先让村里把入口修整到能查的程度。',
      successText: '你终于在修整后的旧井旁找到暗格，把那份镇村旧宝带了出来。',
      recordText: '你验证了老井传说对应的村口藏宝。',
      requiredPanel: 'village',
      requiredVillageProjectLevel: 1,
      readableProjectLevel: 1,
      readableHint: '字迹里提到井口和石砖，但村口还没整理到能看清方位。'
    },
    reward: { money: 1500 }
  },
  {
    id: 17,
    type: 'story',
    title: '公会往事',
    content: '冒险家公会最初只是猎人们聚集的小屋。后来矿洞里的怪物越来越多，猎人们组建了公会，专门负责清剿怪物、保护村民。',
    usable: false
  },
  {
    id: 18,
    type: 'tip',
    title: '雷暴矿洞',
    content: '闪电天气进入矿洞时，据说矿石的品质会更高。或许是电流激活了什么……',
    usable: false
  },
  {
    id: 19,
    type: 'npc',
    category: 'gift',
    title: '秀才的癖好',
    content: '周秀才每天都要喝一壶好茶。他说，茶能涤荡心灵，明目醒神。送他好茶准没错。',
    sourceHints: ['resource'],
    usable: false
  },
  {
    id: 20,
    type: 'treasure',
    category: 'treasure',
    title: '桃花林宝藏',
    content: '在桃花林最古老的那棵桃树下，埋着一颗远古种子。据说是建村隐士留下的。',
    sourceHints: ['tree', 'resource'],
    usable: true,
    verification: {
      summary: '春季再去竹林采集区，按“最古老的桃树”寻找埋藏点。',
      hint: '这颗种子需要你在对的季节自己找出来。',
      successText: '你在最古老的桃树根边挖出了一枚被岁月包裹的远古种子。',
      recordText: '你兑现了桃花林宝藏对应的古树埋藏点。',
      requiredSeason: 'spring',
      requiredPanel: 'forage'
    },
    reward: { items: [{ itemId: 'ancient_seed', quantity: 1 }] }
  },
  {
    id: 21,
    type: 'story',
    title: '博物馆秘闻',
    content:
      '博物馆原本是村里的祠堂。后来有学者建议把村民们挖到的化石和古物集中保存，祠堂便改建成了博物馆。据说收集齐所有展品后，会有奇迹发生。',
    usable: false
  },
  {
    id: 22,
    type: 'tip',
    title: '温室秘诀',
    content: '冬季万物凋零，但温室里四季如春。如果你有温室，冬天也可以继续种植。',
    usable: false
  },
  {
    id: 23,
    type: 'npc',
    category: 'gift',
    title: '陈伯的养生',
    content: '陈伯最看重养生，他说人参是百草之王。如果你送他人参，他一定会非常高兴。',
    sourceHints: ['resource'],
    usable: false
  },
  {
    id: 24,
    type: 'treasure',
    category: 'treasure',
    title: '废弃矿井',
    content: '在矿洞深处有一条被封住的支洞，据说是更古老的矿井遗址。里面不仅有金银，还有珍贵的铱矿石。',
    sourceHints: ['mining', 'monster'],
    usable: true,
    verification: {
      summary: '更深入的矿层与更高的建设进度，才能支撑这条旧矿井线索。',
      hint: '纸条说的是废弃支洞，不是拿到纸条立刻就能兑奖。',
      successText: '你在更深的矿层撬开旧支洞入口，终于把那块珍贵的铱矿石带了出来。',
      recordText: '你找到了废弃矿井的旧支洞藏宝。',
      requiredPanel: 'mining',
      requiredMineFloor: 80,
      requiredVillageProjectLevel: 2
    },
    reward: { money: 2000, items: [{ itemId: 'iridium_ore', quantity: 1 }] }
  },
  {
    id: 25,
    type: 'story',
    title: '桃源秘事',
    content:
      '桃源乡的地底深处，据说封印着远古的力量。建村隐士之所以选择此地，并非偶然——他是这股力量的守护者。如今守护者已去，力量渐渐苏醒……这或许就是矿洞中怪物越来越多的原因。',
    usable: false
  },
  // 仙灵线索
  {
    id: 26,
    type: 'story',
    category: 'rumor',
    title: '鳞光下的低语',
    content:
      '据村中老人说，后山瀑布深处栖息着一条翠色灵龙。每逢春雨之夜，水中便会闪烁鳞光。若能钓到传说中的翠龙鱼，或许就能感应到它的存在。',
    sourceHints: ['fishing'],
    usable: false,
    verification: {
      summary: '带着翠龙鱼相关见闻，在春雨夜前往钓鱼区域再确认一次。',
      hint: '这不是普通世界观碎片，它会变成一条真正的仙灵前置信号。',
      successText: '春雨夜的水面确实闪过了一抹鳞光，你第一次把“龙灵”当成了可追寻的线索。',
      recordText: '你把鳞光下的低语写进了仙缘前置信号。',
      requiredSeason: 'spring',
      requiredWeather: 'rainy',
      requiredPanel: 'fishing',
      requiredItemId: 'jade_dragon',
      unlockHiddenNpcId: 'long_ling'
    }
  },
  {
    id: 27,
    type: 'story',
    category: 'character',
    title: '玉杵残片',
    content:
      '采药时偶然捡到一块玉白色的残片，形状像是某种杵臼的碎块。老人说，满月之夜的竹林深处，偶尔能听到叮叮当当的捣药声。但没人知道是谁在捣药。',
    sourceHints: ['resource', 'tree'],
    usable: false,
    verification: {
      summary: '带着草药再去竹林深处，留意夜里的捣药声。',
      hint: '这会接到一条隐藏角色前置信号，不会直接给物品。',
      successText: '你在竹影与药香之间重新听见了捣药声，这块残片终于有了真正的指向。',
      recordText: '你确认了玉杵残片与竹林药声之间的联系。',
      requiredPanel: 'forage',
      requiredHourMin: 20,
      requiredHourMax: 24,
      requiredItemId: 'ginseng',
      unlockHiddenNpcId: 'yue_tu'
    }
  },
  {
    id: 28,
    type: 'story',
    category: 'character',
    title: '金光掠影',
    content:
      '有不止一个村民在黄昏时分看到过一道金光掠过。传闻村子附近的山中住着一只修炼千年的狐狸精——亦正亦邪，喜欢出谜题戏弄路人。据说只有足够富有且人缘好的人才能引起它的注意。',
    sourceHints: ['monster', 'resource'],
    usable: false,
    verification: {
      summary: '黄昏时带着足够的家底回村里，看看这条传闻是不是只在戏弄你。',
      hint: '这条纸条要到特定时段与状态下才看得明白。',
      successText: '黄昏时分，你果然在村边瞥见一抹金光掠过，狐狸传闻第一次像真的一样落到了眼前。',
      recordText: '你把金光掠影验证成了一条真正的狐仙前置信号。',
      requiredPanel: 'village',
      requiredHourMin: 17,
      requiredHourMax: 19,
      requiredMoney: 100000,
      requiredFestivalId: 'zhong_qiu',
      unlockHiddenNpcId: 'hu_xian'
    }
  }
]
