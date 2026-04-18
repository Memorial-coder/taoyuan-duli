export type DecorationCategory = 'fence' | 'light' | 'plant' | 'stone' | 'water' | 'misc'

export interface DecorationDef {
  id: string
  name: string
  category: DecorationCategory
  description: string
  beautyScore: number
  price: number
  maxCount: number
  unlockBeauty: number
  purchaseMode?: 'direct' | 'catalog'
}

const createCatalogDecoration = (
  id: string,
  name: string,
  category: DecorationCategory,
  description: string,
  beautyScore: number,
  price: number
): DecorationDef => ({
  id,
  name,
  category,
  description,
  beautyScore,
  price,
  maxCount: 1,
  unlockBeauty: 0,
  purchaseMode: 'catalog'
})

export const DECORATIONS: DecorationDef[] = [
  {
    id: 'wood_fence',
    name: '木栅栏',
    category: 'fence',
    description: '简单的木制栅栏，整齐划分农场边界。',
    beautyScore: 3,
    price: 200,
    maxCount: 5,
    unlockBeauty: 0
  },
  {
    id: 'stone_fence',
    name: '青石矮墙',
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
  {
    id: 'flower_pot',
    name: '花盆',
    category: 'plant',
    description: '摆放各色花草的陶土花盆。',
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
    description: '精巧细致的小拱桥，横跨溪流。',
    beautyScore: 20,
    price: 3000,
    maxCount: 1,
    unlockBeauty: 100
  },
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
  },
  createCatalogDecoration('catalog_bamboo_screen', '竹影屏风', 'misc', '来自商店目录的专属陈设，会自动进入家园展示位。', 10, 880),
  createCatalogDecoration('catalog_tea_table', '清茶小案', 'misc', '适合摆放茶具的雅致案几，会自动计入展示收藏。', 8, 760),
  createCatalogDecoration('catalog_clay_vase', '素陶花瓶', 'misc', '商店目录限定的素陶摆件。', 6, 520),
  createCatalogDecoration('catalog_stone_lantern', '庭院石灯', 'stone', '可直接摆入庭院的商店目录石灯。', 14, 1280),
  createCatalogDecoration('catalog_guest_wine_rack', '迎客酒架', 'misc', '适合陈列佳酿与宾客纪念物的小型酒架。', 16, 1580),
  createCatalogDecoration('catalog_scholar_shelf', '书香高架', 'misc', '每周精选中的书卷陈设，会直接补充家园展示分。', 18, 1680),
  createCatalogDecoration('catalog_festival_lantern', '彩绢灯笼', 'light', '节庆限定彩灯，可直接带来家园展示反馈。', 14, 1180),
  createCatalogDecoration('catalog_blossom_arch', '花朝拱门', 'plant', '春日限定拱门，适合作为展示型消费的入口。', 26, 1880),
  createCatalogDecoration('catalog_willow_mat', '柳纹地席', 'misc', '春季目录限定的柳纹地席，适合为屋内增添春日氛围。', 9, 920),
  createCatalogDecoration('catalog_peach_scroll', '桃花挂轴', 'misc', '春桃主题的挂轴，可为家园展示带来更多春日气息。', 11, 960),
  createCatalogDecoration('catalog_lotus_lamp', '荷灯摆台', 'light', '夏夜荷灯主题的陈设，自带节庆氛围和展示分。', 15, 1180),
  createCatalogDecoration('catalog_cool_bench', '纳凉石凳', 'stone', '适合庭院纳凉的石凳组合，可直接提升庭院美观度。', 16, 1440),
  createCatalogDecoration('catalog_bamboo_blind', '青竹帘影', 'misc', '夏日限定的竹帘收藏陈设，适合用于屋内点缀。', 10, 980),
  createCatalogDecoration('catalog_maple_screen', '枫纹屏风', 'misc', '秋日限定屏风陈设，能为居所带来更高展示价值。', 20, 1680),
  createCatalogDecoration('catalog_harvest_banner', '丰收旗帜', 'misc', '秋收节庆旗帜陈设，可直接提升家园节日氛围。', 14, 1260),
  createCatalogDecoration('catalog_moon_set', '望月案设', 'misc', '中秋主题案设陈设，可为展示收藏提供额外加成。', 22, 1760),
  createCatalogDecoration('catalog_brazier', '暖炭火盆', 'light', '冬日限定火盆陈设，可为庭院带来更高的展示热度。', 18, 1580),
  createCatalogDecoration('catalog_plum_frame', '寒梅窗框', 'misc', '冬窗寒梅主题框景，适合用于屋内雅致陈设。', 12, 980),
  createCatalogDecoration('catalog_golden_frame', '金鲤头像框', 'misc', '来自万物铺高价目录的鎏金头像框，会自动纳入家园展示陈设。', 18, 12800),
  createCatalogDecoration('catalog_incense_stand', '梅雪香座', 'misc', '冬日氛围的香座摆件，可直接纳入家园展示分。', 13, 1120),
  createCatalogDecoration('catalog_flower_cart', '花市巡游车', 'plant', '节庆花车陈设，可直接提升家园美观度。', 24, 4200),
  createCatalogDecoration('catalog_courtyard_stage', '绮彩堂台', 'misc', '终局展示型舞台摆设，会显著提升家园展示价值。', 36, 26000)
]

export const DECORATION_CATEGORY_NAMES: Record<DecorationCategory, string> = {
  fence: '围栏',
  light: '灯饰',
  plant: '植物',
  stone: '石材',
  water: '水景',
  misc: '杂项'
}
