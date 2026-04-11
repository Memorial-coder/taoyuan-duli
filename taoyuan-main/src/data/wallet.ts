import type { WalletArchetypeDef, WalletArchetypeId, WalletItemDef, WalletNodeDef } from '@/types'

/** 钱袋物品定义 */
export const WALLET_ITEMS: WalletItemDef[] = [
  {
    id: 'merchant_seal',
    name: '商人印章',
    description: '商店购物价格降低10%。',
    effect: { type: 'shopDiscount', value: 0.1 },
    unlockCondition: '累计赚取10000文'
  },
  {
    id: 'herb_guide',
    name: '神农本草',
    description: '采集物品质提升1档。',
    effect: { type: 'forageQuality', value: 1 },
    unlockCondition: '采集等级达到8'
  },
  {
    id: 'miners_charm',
    name: '矿工护符',
    description: '挖矿体力消耗降低15%。',
    effect: { type: 'miningStamina', value: 0.15 },
    unlockCondition: '矿洞到达50层'
  },
  {
    id: 'anglers_token',
    name: '钓翁令牌',
    description: '钓鱼小游戏中鱼移动速度降低10%。',
    effect: { type: 'fishingCalm', value: 0.1 },
    unlockCondition: '钓到30种不同的鱼'
  },
  {
    id: 'chefs_hat',
    name: '厨师帽',
    description: '烹饪食物恢复量+25%。',
    effect: { type: 'cookingRestore', value: 0.25 },
    unlockCondition: '烹饪10道不同的食谱'
  },
  {
    id: 'earth_totem',
    name: '土地图腾',
    description: '作物生长速度+10%。',
    effect: { type: 'cropGrowth', value: 0.1 },
    unlockCondition: '收获100次作物'
  }
]

export const WALLET_ARCHETYPES: WalletArchetypeDef[] = [
  {
    id: 'merchant',
    name: '商贾流',
    title: '货通四海，利随心动',
    description: '偏向消费与现金流，擅长从商店折扣、每周精选和盈利目标中榨取更高收益。',
    unlockRequirement: { type: 'money_earned', value: 5000, label: '累计赚取 5000 文' },
    primaryModules: ['shop', 'goal'],
    mainEffectText: '常驻购物折扣 +5%，每日目标更容易出现现金流与社交经营方向。',
    nodeUnlockText: '后续节点将强化每周精选、万物铺采购和高价经营路线。',
    recommendedShops: ['wanwupu', 'chouduanzhuang', 'jiuguan'],
    effect: {
      shopDiscount: 0.05,
      goalWeights: {
        cashflow: 2,
        social: 1
      },
      catalogPoolWeights: {
        weekly: 2,
        premium: 1
      },
      catalogTagWeights: {
        '每周精选': 3,
        '高价长期商品': 1,
        '功能商品': 1,
        '牧场': 1,
        '仓储': 2,
        '服务契约': 2,
        '节庆': 1,
        '收藏': 1
      }
    },
    nodes: [
      {
        id: 'merchant_weekly_eye',
        name: '行商眼光',
        description: '进一步偏好每周精选和功能型货架，商店更容易出现适合冲收益的推荐包。',
        modules: ['shop'],
        unlockRequirement: { type: 'discoveries', value: 18, label: '图鉴发现达到 18 种' },
        effect: {
          catalogPoolWeights: { weekly: 2 },
          catalogTagWeights: {
            '每周精选': 2,
            '功能商品': 1,
            '材料包': 1,
            '补给包': 2,
            '仓储': 1
          }
        }
      },
      {
        id: 'merchant_profit_instinct',
        name: '逐利本能',
        description: '更偏向现金流、社交与长期经营目标。',
        modules: ['goal'],
        unlockRequirement: { type: 'friendly_npcs', value: 2, label: '达到友好的村民达到 2 位' },
        effect: {
          goalWeights: {
            cashflow: 2,
            social: 1,
            discovery: 1
          }
        }
      }
    ]
  },
  {
    id: 'artisan',
    name: '匠营流',
    title: '田工炉火，稳步扩产',
    description: '偏向农耕、加工和矿冶建设，适合想围绕田地、工坊与基础设施推进的玩家。',
    unlockRequirement: { type: 'recipes_cooked', value: 3, label: '累计完成 3 次烹饪' },
    primaryModules: ['farming', 'mining', 'goal', 'shop'],
    mainEffectText: '万物铺、铁匠铺、药铺的经营类采购更适合你，每日目标更偏向农耕、采矿与烹饪。',
    nodeUnlockText: '后续节点将强化材料补给、灌溉建设与工坊发展方向。',
    recommendedShops: ['wanwupu', 'tiejiangpu', 'yaopu'],
    effect: {
      goalWeights: {
        farming: 2,
        mining: 2,
        cooking: 1
      },
      catalogTagWeights: {
        '灌溉': 2,
        '功能商品': 1,
        '矿洞': 2,
        '材料包': 2,
        '自动化': 2,
        '仓储': 1
      },
      catalogPoolWeights: {
        basic: 1,
        weekly: 1
      },
      shopDiscountByShopId: {
        tiejiangpu: 0.04,
        yaopu: 0.04
      }
    },
    nodes: [
      {
        id: 'artisan_supply_chain',
        name: '工坊筹备',
        description: '更容易获得矿洞、灌溉和材料补给推荐。',
        modules: ['shop'],
        unlockRequirement: { type: 'mine_floor', value: 20, label: '矿洞到达 20 层' },
        effect: {
          catalogTagWeights: {
            '矿洞': 2,
            '灌溉': 2,
            '材料包': 2,
            '自动化': 2,
            '补给包': 1
          }
        }
      },
      {
        id: 'artisan_work_ethic',
        name: '匠心日课',
        description: '每日目标进一步偏向农耕、烹饪与采矿。',
        modules: ['goal'],
        unlockRequirement: { type: 'money_earned', value: 12000, label: '累计赚取 12000 文' },
        effect: {
          goalWeights: {
            farming: 2,
            cooking: 2,
            mining: 1
          }
        }
      }
    ]
  },
  {
    id: 'wanderer',
    name: '游历流',
    title: '随行随遇，广见广闻',
    description: '偏向钓鱼、探索、见闻与外出补给，更适合喜欢四处游历、收集和发现新内容的玩家。',
    unlockRequirement: { type: 'fish_caught', value: 12, label: '累计钓到 12 条鱼' },
    primaryModules: ['fishing', 'goal', 'shop'],
    mainEffectText: '渔具铺与旅行式补给更贴合你的路线，每日目标更容易出现钓鱼、探索与见闻方向。',
    nodeUnlockText: '后续节点将强化鱼塘养护、探索补给与季节限定采购。',
    recommendedShops: ['yugupu', 'jiuguan', 'biaoju'],
    effect: {
      goalWeights: {
        fishing: 2,
        discovery: 2,
        social: 1
      },
      catalogTagWeights: {
        '渔具': 2,
        '鱼塘': 2,
        '季节限定': 2,
        '功能商品': 1,
        '补给包': 2,
        '节庆': 1,
        '收藏': 1
      },
      catalogPoolWeights: {
        seasonal: 2,
        weekly: 1
      },
      shopDiscountByShopId: {
        yugupu: 0.05,
        jiuguan: 0.03
      }
    },
    nodes: [
      {
        id: 'wanderer_supply_sense',
        name: '行囊直觉',
        description: '更容易获得鱼塘、渔具和季节限定补给推荐。',
        modules: ['shop'],
        unlockRequirement: { type: 'discoveries', value: 24, label: '图鉴发现达到 24 种' },
        effect: {
          catalogTagWeights: {
            '渔具': 2,
            '鱼塘': 2,
            '季节限定': 2,
            '补给包': 2,
            '节庆': 1
          }
        }
      },
      {
        id: 'wanderer_curiosity',
        name: '好奇心',
        description: '每日目标进一步偏向钓鱼、见闻和社交互动。',
        modules: ['goal'],
        unlockRequirement: { type: 'friendly_npcs', value: 3, label: '达到友好的村民达到 3 位' },
        effect: {
          goalWeights: {
            fishing: 2,
            discovery: 1,
            social: 1
          }
        }
      }
    ]
  }
]

export const getWalletItemById = (id: string): WalletItemDef | undefined => {
  return WALLET_ITEMS.find(w => w.id === id)
}

export const getWalletArchetypeById = (id: WalletArchetypeId): WalletArchetypeDef | undefined => {
  return WALLET_ARCHETYPES.find(archetype => archetype.id === id)
}

export const getWalletNodeById = (id: string): WalletNodeDef | undefined => {
  for (const archetype of WALLET_ARCHETYPES) {
    const node = archetype.nodes.find(entry => entry.id === id)
    if (node) return node
  }
  return undefined
}
