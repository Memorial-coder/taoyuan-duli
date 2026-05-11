export type HomeRenovationCategory = 'room' | 'corner' | 'display'

export interface HomeRenovationDef {
  id: string
  name: string
  category: HomeRenovationCategory
  description: string
  requiredFarmhouseLevel: 1 | 2 | 3
  cost: number
  materialCost: { itemId: string; quantity: number }[]
  featureLabels: string[]
}

export const HOME_RENOVATIONS: HomeRenovationDef[] = [
  {
    id: 'scholar_room',
    name: '书房偏厢',
    category: 'room',
    description: '把宅院侧厢改成静室书房，腾出新的藏书与阅读空间。',
    requiredFarmhouseLevel: 2,
    cost: 4200,
    materialCost: [
      { itemId: 'wood', quantity: 40 },
      { itemId: 'paper', quantity: 12 },
      { itemId: 'bamboo', quantity: 16 }
    ],
    featureLabels: ['新房间', '书架位']
  },
  {
    id: 'tea_corner',
    name: '待客茶角',
    category: 'corner',
    description: '在主屋腾出一块待客茶角，用来摆纪念物、见闻册和节日回响。',
    requiredFarmhouseLevel: 2,
    cost: 3000,
    materialCost: [
      { itemId: 'bamboo', quantity: 18 },
      { itemId: 'stone', quantity: 24 },
      { itemId: 'firewood', quantity: 10 }
    ],
    featureLabels: ['功能角', '纪念物位']
  },
  {
    id: 'ancestral_display_wall',
    name: '祠前陈设墙',
    category: 'display',
    description: '在家中立起一面可陈列祝福、奖杯与收藏纪念的展示墙。',
    requiredFarmhouseLevel: 3,
    cost: 5600,
    materialCost: [
      { itemId: 'wood', quantity: 52 },
      { itemId: 'stone', quantity: 36 },
      { itemId: 'paper', quantity: 18 }
    ],
    featureLabels: ['祝福位', '奖杯位', '纪念物位']
  }
]
