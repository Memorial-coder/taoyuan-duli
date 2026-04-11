export type DecorationCategory = 'fence' | 'light' | 'plant' | 'stone' | 'water' | 'misc'

export interface DecorationDef {
  id: string
  name: string
  category: DecorationCategory
  description: string
  beautyScore: number
  /** 购买价格（文） */
  price: number
  /** 最大放置数量 */
  maxCount: number
  /** 解锁所需美观度（0=初始可购） */
  unlockBeauty: number
}

export const DECORATIONS: DecorationDef[] = [
  // === 围栏类 ===
  {
    id: 'wood_fence',
    name: '木栅栏',
    category: 'fence',
    description: '简朴的木制围栏，整齐划分农场边界。',
    beautyScore: 3,
    price: 200,
    maxCount: 5,
    unlockBeauty: 0
  },
  {
    id: 'stone_fence',
    name: '石砌矮墙',
    category: 'fence',
    description: '用青石砌成的矮墙，古朴典雅。',
    beautyScore: 6,
    price: 500,
    maxCount: 4,
    unlockBeauty: 20
  },
  {
    id: 'bamboo_fence',
    name: '竹篱笆',
    category: 'fence',
    description: '翠绿的竹子编成的篱笆，清新雅致。',
    beautyScore: 5,
    price: 350,
    maxCount: 5,
    unlockBeauty: 0
  },
  // === 灯饰类 ===
  {
    id: 'paper_lantern',
    name: '红灯笼',
    category: 'light',
    description: '喜庆的红灯笼，夜晚灯火通明。',
    beautyScore: 5,
    price: 300,
    maxCount: 6,
    unlockBeauty: 0
  },
  {
    id: 'stone_lamp',
    name: '石灯',
    category: 'light',
    description: '古典石制路灯，庄重而温馨。',
    beautyScore: 8,
    price: 800,
    maxCount: 4,
    unlockBeauty: 30
  },
  {
    id: 'firefly_jar',
    name: '萤火虫灯',
    category: 'light',
    description: '装着萤火虫的玻璃罐，闪烁着梦幻光芒。',
    beautyScore: 10,
    price: 1200,
    maxCount: 3,
    unlockBeauty: 60
  },
  // === 植物类 ===
  {
    id: 'flower_pot',
    name: '花盆',
    category: 'plant',
    description: '摆放各色花卉的陶土花盆。',
    beautyScore: 4,
    price: 250,
    maxCount: 8,
    unlockBeauty: 0
  },
  {
    id: 'bonsai',
    name: '盆景',
    category: 'plant',
    description: '精心修剪的松树盆景，意境深远。',
    beautyScore: 12,
    price: 1500,
    maxCount: 3,
    unlockBeauty: 50
  },
  {
    id: 'bamboo_grove',
    name: '竹丛',
    category: 'plant',
    description: '一簇翠竹，风过有声，生机盎然。',
    beautyScore: 9,
    price: 900,
    maxCount: 4,
    unlockBeauty: 40
  },
  {
    id: 'wisteria_arch',
    name: '紫藤花架',
    category: 'plant',
    description: '紫藤缠绕的拱门，春日繁花如瀑。',
    beautyScore: 15,
    price: 2000,
    maxCount: 2,
    unlockBeauty: 80
  },
  // === 石材类 ===
  {
    id: 'stepping_stone',
    name: '汀步石',
    category: 'stone',
    description: '铺设在小径上的天然石板。',
    beautyScore: 4,
    price: 300,
    maxCount: 6,
    unlockBeauty: 0
  },
  {
    id: 'stone_lantern',
    name: '石灯笼',
    category: 'stone',
    description: '庭院中的石制灯笼，静谧古朴。',
    beautyScore: 10,
    price: 1000,
    maxCount: 3,
    unlockBeauty: 40
  },
  {
    id: 'stone_bridge',
    name: '拱桥',
    category: 'stone',
    description: '精雕细琢的小拱桥，横跨溪流。',
    beautyScore: 20,
    price: 3000,
    maxCount: 1,
    unlockBeauty: 100
  },
  // === 水景类 ===
  {
    id: 'stone_basin',
    name: '石水盆',
    category: 'water',
    description: '盛满清水的石质水盆，映照天光。',
    beautyScore: 7,
    price: 600,
    maxCount: 3,
    unlockBeauty: 20
  },
  {
    id: 'koi_pond',
    name: '锦鲤池',
    category: 'water',
    description: '养着锦鲤的小水池，色彩斑斓。',
    beautyScore: 18,
    price: 2500,
    maxCount: 1,
    unlockBeauty: 90
  },
  // === 杂项类 ===
  {
    id: 'wind_chime',
    name: '风铃',
    category: 'misc',
    description: '竹制风铃，随风叮当作响。',
    beautyScore: 4,
    price: 200,
    maxCount: 5,
    unlockBeauty: 0
  },
  {
    id: 'scarecrow_deco',
    name: '彩绘稻草人',
    category: 'misc',
    description: '身着彩衣的装饰稻草人，活泼可爱。',
    beautyScore: 6,
    price: 400,
    maxCount: 3,
    unlockBeauty: 10
  },
  {
    id: 'sundial',
    name: '日晷',
    category: 'misc',
    description: '古典铜制日晷，记录时光流逝。',
    beautyScore: 14,
    price: 1800,
    maxCount: 1,
    unlockBeauty: 70
  },
  {
    id: 'pavilion',
    name: '凉亭',
    category: 'misc',
    description: '木制六角凉亭，供人休憩赏景。',
    beautyScore: 25,
    price: 5000,
    maxCount: 1,
    unlockBeauty: 150
  }
]

export const DECORATION_CATEGORY_NAMES: Record<DecorationCategory, string> = {
  fence: '围栏',
  light: '灯饰',
  plant: '植物',
  stone: '石材',
  water: '水景',
  misc: '杂项'
}
