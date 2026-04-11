import type { SecretNoteDef } from '@/types'

/** 所有秘密笔记 */
export const SECRET_NOTES: SecretNoteDef[] = [
  {
    id: 1,
    type: 'tip',
    title: '残破的纸条',
    content: '桃花林深处似乎藏着什么……春季的桃花落下时，偶尔能在地上发现稀有的东西。',
    usable: false
  },
  {
    id: 2,
    type: 'treasure',
    title: '矿工的遗书',
    content: '我把毕生积蓄藏在矿洞第20层的一个隐秘角落……如果你能找到这封信，这些钱就归你了。',
    usable: true,
    reward: { money: 500 }
  },
  {
    id: 3,
    type: 'npc',
    title: '渔翁的喜好',
    content: '李渔翁最爱锦鲤。他说锦鲤是河中之王，能钓到锦鲤的人，才是真正的渔夫。',
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
    title: '竹林秘图',
    content: '在竹林最茂密的地方，有一块苔藓覆盖的石头，翻开它就能找到一块上好的翡翠。',
    usable: true,
    reward: { items: [{ itemId: 'jade', quantity: 1 }] }
  },
  {
    id: 6,
    type: 'tip',
    title: '钓鱼心得',
    content: '满月的夜晚，水中的鱼儿格外活跃。如果你想钓到稀有的鱼，不妨在月圆之夜试试。',
    usable: false
  },
  {
    id: 7,
    type: 'npc',
    title: '铁匠的秘密',
    content: '孙铁匠虽然整天打铁，但他内心其实很喜欢铜矿石。他说铜是最温暖的金属。',
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
    title: '河边的秘密',
    content: '在小溪拐弯处的大石头下面，我曾经藏了一笔钱。如果你能找到，就拿去用吧。',
    usable: true,
    reward: { money: 800 }
  },
  {
    id: 10,
    type: 'tip',
    title: '采集笔记',
    content: '下雨天的时候，山野间会出现一些平时罕见的采集物。雨后的竹林尤其值得一看。',
    usable: false
  },
  {
    id: 11,
    type: 'npc',
    title: '柳娘的心事',
    content: '柳娘最喜欢桂花。每年秋天，她都会在桂花树下坐上一整天。',
    usable: false
  },
  {
    id: 12,
    type: 'treasure',
    title: '矿洞暗号',
    content: '矿洞暗河层的尽头，有一个被水冲刷出来的洞穴。里面藏着一块珍贵的月光石。',
    usable: true,
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
    title: '厨娘的愿望',
    content: '王大婶一直想做出最完美的米饭。她说，好的大米是一切美食的根基。',
    usable: false
  },
  {
    id: 16,
    type: 'treasure',
    title: '老井传说',
    content: '村口废弃的老井底部，据说藏着建村时埋下的镇村之宝。井虽然干了，宝物应该还在。',
    usable: true,
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
    title: '秀才的癖好',
    content: '周秀才每天都要喝一壶好茶。他说，茶能涤荡心灵，明目醒神。送他好茶准没错。',
    usable: false
  },
  {
    id: 20,
    type: 'treasure',
    title: '桃花林宝藏',
    content: '在桃花林最古老的那棵桃树下，埋着一颗远古种子。据说是建村隐士留下的。',
    usable: true,
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
    title: '陈伯的养生',
    content: '陈伯最看重养生，他说人参是百草之王。如果你送他人参，他一定会非常高兴。',
    usable: false
  },
  {
    id: 24,
    type: 'treasure',
    title: '废弃矿井',
    content: '在矿洞深处有一条被封住的支洞，据说是更古老的矿井遗址。里面不仅有金银，还有珍贵的铱矿石。',
    usable: true,
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
    title: '鳞光下的低语',
    content:
      '据村中老人说，后山瀑布深处栖息着一条翠色灵龙。每逢春雨之夜，水中便会闪烁鳞光。若能钓到传说中的翠龙鱼，或许就能感应到它的存在。',
    usable: false
  },
  {
    id: 27,
    type: 'story',
    title: '玉杵残片',
    content:
      '采药时偶然捡到一块玉白色的残片，形状像是某种杵臼的碎块。老人说，满月之夜的竹林深处，偶尔能听到叮叮当当的捣药声。但没人知道是谁在捣药。',
    usable: false
  },
  {
    id: 28,
    type: 'story',
    title: '金光掠影',
    content:
      '有不止一个村民在黄昏时分看到过一道金光掠过。传闻村子附近的山中住着一只修炼千年的狐狸精——亦正亦邪，喜欢出谜题戏弄路人。据说只有足够富有且人缘好的人才能引起它的注意。',
    usable: false
  }
]
