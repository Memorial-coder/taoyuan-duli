export interface MysteryBoxRewardEntry {
  id: string
  label: string
  rewardItems: { itemId: string; quantity: number }[]
  summary: string
}

export interface MysteryBoxDef {
  id: string
  label: string
  aliasLabel: string
  openingLabel: string
  sourceHints: string[]
  rewardEntries: MysteryBoxRewardEntry[]
}

export const MYSTERY_BOX_NAMING_LAYERS = [
  { id: 'mystic_cache', label: '密匣', summary: '最通用的一档，把钓鱼、采集和杂项奖池慢慢收进来。' },
  { id: 'marsh_relic_case', label: '山泽遗箱', summary: '偏向山野与遗迹见闻，会混入更像传闻和深层准备的内容。' },
  { id: 'spirit_seal_crate', label: '灵物封匣', summary: '偏向高阶段生活物与稀有收藏，用于后续节庆和研究扩线。' }
] as const

export const MYSTERY_BOX_SOURCE_HINTS = [
  '钓鱼与鱼汛周会开始混入少量密匣掉落。',
  '挖矿、怪物和深层资源点会更偏向山泽遗箱。',
  '书商、节庆与奖券赏格会把灵物封匣接成低频惊喜来源。'
] as const

export const MYSTERY_BOX_DEFS: MysteryBoxDef[] = [
  {
    id: 'mystic_cache',
    label: '密匣',
    aliasLabel: '山门小匣',
    openingLabel: '祠后开匣案',
    sourceHints: ['钓鱼', '采集', '奖券赏格'],
    rewardEntries: [
      {
        id: 'mystic_cache_field',
        label: '田作补线',
        rewardItems: [
          { itemId: 'seed_garlic', quantity: 2 },
          { itemId: 'quality_fertilizer', quantity: 2 }
        ],
        summary: '偏种植和功能性种子。'
      },
      {
        id: 'mystic_cache_social',
        label: '人情小礼',
        rewardItems: [
          { itemId: 'osmanthus_tea', quantity: 1 },
          { itemId: 'pine_incense', quantity: 1 }
        ],
        summary: '偏关系和节前走动。'
      }
    ]
  },
  {
    id: 'marsh_relic_case',
    label: '山泽遗箱',
    aliasLabel: '旧路遗箱',
    openingLabel: '祠后开匣案',
    sourceHints: ['挖矿', '怪物', '节庆'],
    rewardEntries: [
      {
        id: 'marsh_relic_case_research',
        label: '见闻样件',
        rewardItems: [
          { itemId: 'quartz', quantity: 4 },
          { itemId: 'battery', quantity: 1 }
        ],
        summary: '偏研究和深层探索准备。'
      },
      {
        id: 'marsh_relic_case_home',
        label: '家园耐用品',
        rewardItems: [
          { itemId: 'cloth', quantity: 1 },
          { itemId: 'wood', quantity: 10 }
        ],
        summary: '偏家居补材和耐用品。'
      }
    ]
  },
  {
    id: 'spirit_seal_crate',
    label: '灵物封匣',
    aliasLabel: '灵封重匣',
    openingLabel: '祠后开匣案',
    sourceHints: ['书商', '奖券赏格', '后期节庆'],
    rewardEntries: [
      {
        id: 'spirit_seal_crate_gift',
        label: '珍礼匣',
        rewardItems: [
          { itemId: 'camphor_incense', quantity: 1 },
          { itemId: 'silk_ribbon', quantity: 1 }
        ],
        summary: '偏高价值礼物和节庆陈设。'
      },
      {
        id: 'spirit_seal_crate_supply',
        label: '战备匣',
        rewardItems: [
          { itemId: 'iron_bar', quantity: 2 },
          { itemId: 'charcoal', quantity: 6 }
        ],
        summary: '偏后期工料和战备准备。'
      }
    ]
  }
]

export const getMysteryBoxDef = (boxId: string) => MYSTERY_BOX_DEFS.find(def => def.id === boxId) ?? null
