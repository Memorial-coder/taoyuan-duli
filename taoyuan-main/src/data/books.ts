import type { SkillType } from '@/types'

export type BooksellerBookType = 'skill' | 'insight' | 'clue' | 'festival'

export interface BooksellerBookDef {
  id: string
  name: string
  type: BooksellerBookType
  price: number
  description: string
  effectSummary: string
  bonusMaxStamina?: number
  skillExp?: {
    type: SkillType
    amount: number
  }
  tags?: string[]
}

export const BOOK_TYPE_LABELS: Record<BooksellerBookType, string> = {
  skill: '技艺书',
  insight: '见闻书',
  clue: '线索书',
  festival: '节令书'
}

export const BOOKS: BooksellerBookDef[] = [
  {
    id: 'book_field_notes',
    name: '田畴手记',
    type: 'skill',
    price: 980,
    description: '记着土性、轮作与节气心得的薄册，翻得很旧。',
    effectSummary: '永久增加 4 点体力上限，并获得耕种经验。',
    bonusMaxStamina: 4,
    skillExp: { type: 'farming', amount: 90 },
    tags: ['农事', '春耕', '温室']
  },
  {
    id: 'book_stream_almanac',
    name: '溪汛水历',
    type: 'festival',
    price: 1160,
    description: '专记鱼汛、潮时与夜钓时机的行旅札记。',
    effectSummary: '获得钓鱼经验，并让节庆前的钓鱼准备更清晰。',
    skillExp: { type: 'fishing', amount: 110 },
    tags: ['鱼汛周', '夜钓会', '水域']
  },
  {
    id: 'book_mountain_paths',
    name: '山径图抄',
    type: 'insight',
    price: 1020,
    description: '里面夹着多条山间捷径与采集路线的批注。',
    effectSummary: '获得采集经验，并将一条生活发现记入长期记录。',
    skillExp: { type: 'foraging', amount: 90 },
    tags: ['捷径', '采集周', '花期']
  },
  {
    id: 'book_miner_log',
    name: '井下录',
    type: 'skill',
    price: 1280,
    description: '矿工留下的笔记，记录了支撑棚与矿脉变化。',
    effectSummary: '获得采矿经验，并为后续精通成长预留记录。',
    skillExp: { type: 'mining', amount: 110 },
    tags: ['矿井', '支撑棚', '铱矿']
  },
  {
    id: 'book_lantern_rumors',
    name: '灯市传闻抄',
    type: 'clue',
    price: 860,
    description: '纸页间尽是村民口耳相传的灯市、来访与礼物偏好。',
    effectSummary: '会把一条稀有访客与礼物观察记入发现记录。',
    tags: ['礼物', '访客', '节庆商人']
  },
  {
    id: 'book_festival_ledger',
    name: '乡宴备办录',
    type: 'festival',
    price: 1240,
    description: '专门写给操办节庆的人，连该备什么食材都列得清楚。',
    effectSummary: '获得耕种经验，并强化节日前备货提示的参考价值。',
    skillExp: { type: 'farming', amount: 80 },
    tags: ['节庆', '备货', '农展会']
  },
  {
    id: 'book_guest_roll',
    name: '四方客名录',
    type: 'insight',
    price: 1080,
    description: '一本记着商队、游艺人与异乡客习性的册子。',
    effectSummary: '会把稀有来访节奏写入长期记录，便于后续规划。',
    tags: ['行脚书生', '巡回艺人', '异乡客']
  },
  {
    id: 'book_household_tales',
    name: '家常异闻',
    type: 'clue',
    price: 940,
    description: '夹着宠物轶事、家庭回响与村里小秘密的短篇合集。',
    effectSummary: '会把一条生活层解锁记入长期记录，并获得少量采集经验。',
    skillExp: { type: 'foraging', amount: 60 },
    tags: ['宠物', '家居', '家庭']
  }
]

export const getBookById = (id: string): BooksellerBookDef | undefined => BOOKS.find(book => book.id === id)
