import type { FishingLocation, Season, Weather } from '@/types'
import type { RegionExpeditionWeather } from '@/types/region'

export interface EnvironmentWindowContext {
  season: Season
  weather: Weather
  day: number
  year?: number
  isFestivalDay?: boolean
}

export interface EnvironmentFishingWindow {
  active: boolean
  label: string
  summary: string
  detailLines: string[]
  affectedLocations: FishingLocation[]
  fishSpeedMultiplier: number
  fishChangeDirMultiplier: number
  junkChanceDelta: number
  treasureChanceBonus: number
  panBonusChance: number
}

export interface EnvironmentMiningWindow {
  active: boolean
  label: string
  summary: string
  detailLines: string[]
  staminaCostMultiplier: number
  oreBonusChance: number
  dangerHint: string
}

export interface EnvironmentForageJourneyWindow {
  active: boolean
  label: string
  summary: string
  detailLines: string[]
  forageChanceMultiplier: number
  journeyRiskWeather?: RegionExpeditionWeather
  journeyDangerDelta: number
  journeyVisibilityDelta: number
  journeyPollutionDelta: number
  journeyAnomalyDelta: number
  festivalDeliveryLine: string
  routeHint: string
}

export interface EnvironmentWindowSnapshot {
  id: string
  label: string
  active: boolean
  fishing: EnvironmentFishingWindow
  mining: EnvironmentMiningWindow
  forage: EnvironmentForageJourneyWindow
}

const DEFAULT_FISHING: EnvironmentFishingWindow = {
  active: false,
  label: '晴稳水面',
  summary: '水面状态稳定，适合按常规鱼池和钓具来规划。',
  detailLines: ['鱼群、垃圾和宝箱概率保持常态。'],
  affectedLocations: ['creek', 'pond', 'river', 'waterfall'],
  fishSpeedMultiplier: 1,
  fishChangeDirMultiplier: 1,
  junkChanceDelta: 0,
  treasureChanceBonus: 0,
  panBonusChance: 0
}

const DEFAULT_MINING: EnvironmentMiningWindow = {
  active: false,
  label: '矿脉常态',
  summary: '矿洞没有明显天气扰动，探索成本和矿石产出维持常态。',
  detailLines: ['矿石、陷阱和视野都按当前楼层规则处理。'],
  staminaCostMultiplier: 1,
  oreBonusChance: 0,
  dangerHint: '常规探索'
}

const DEFAULT_FORAGE: EnvironmentForageJourneyWindow = {
  active: false,
  label: '林路常态',
  summary: '竹林和远征路线没有额外异象。',
  detailLines: ['采集、行旅和节庆交付按基础规则处理。'],
  forageChanceMultiplier: 1,
  journeyDangerDelta: 0,
  journeyVisibilityDelta: 0,
  journeyPollutionDelta: 0,
  journeyAnomalyDelta: 0,
  festivalDeliveryLine: '',
  routeHint: '路线常态'
}

export const resolveEnvironmentWindow = (context: EnvironmentWindowContext): EnvironmentWindowSnapshot => {
  const base: EnvironmentWindowSnapshot = {
    id: `env:${context.season}:${context.weather}:${context.day}`,
    label: DEFAULT_FISHING.label,
    active: false,
    fishing: { ...DEFAULT_FISHING },
    mining: { ...DEFAULT_MINING },
    forage: { ...DEFAULT_FORAGE }
  }

  if (context.weather === 'rainy') {
    return {
      ...base,
      label: '涨溪雨窗',
      active: true,
      fishing: {
        active: true,
        label: '涨溪雨窗',
        summary: '雨水抬高溪河水位，溪流、江河和瀑布的鱼更容易靠岸。',
        detailLines: ['鱼速略降，垃圾率降低，淘金更容易带出矿砂。', '适合补鱼、跑雨天鱼池和顺手淘金。'],
        affectedLocations: ['creek', 'river', 'waterfall'],
        fishSpeedMultiplier: 0.96,
        fishChangeDirMultiplier: 0.98,
        junkChanceDelta: -0.02,
        treasureChanceBonus: 0.02,
        panBonusChance: 0.06
      },
      mining: {
        active: true,
        label: '湿石回响',
        summary: '雨声让浅层岩壁更容易辨认空鼓矿脉。',
        detailLines: ['挖矿体力消耗略有上升，但矿石格有小概率多出一份矿石。'],
        staminaCostMultiplier: 1.03,
        oreBonusChance: 0.08,
        dangerHint: '湿滑岩面'
      },
      forage: {
        active: true,
        label: '雨后新芽',
        summary: '雨后竹林新芽冒头，采集更容易有收获。',
        detailLines: ['采集概率略升，远征视野略降。', '若今天有节庆委托，湿润天气会让鲜货交付更对口。'],
        forageChanceMultiplier: 1.05,
        journeyRiskWeather: 'fog',
        journeyDangerDelta: 1,
        journeyVisibilityDelta: -2,
        journeyPollutionDelta: 0,
        journeyAnomalyDelta: 1,
        festivalDeliveryLine: '雨后鲜货正赶上节庆筹备，村民会觉得这批物资更应景。',
        routeHint: '雨雾压低视野，适合带侦察或保守推进。'
      }
    }
  }

  if (context.weather === 'stormy') {
    return {
      ...base,
      label: '雷雨震脉',
      active: true,
      fishing: {
        active: true,
        label: '雷雨震脉',
        summary: '雷声会惊动深水鱼，稀有鱼和宝箱机会更明显，但鱼更躁动。',
        detailLines: ['鱼速和变向略升，宝箱概率提高。', '适合有好鱼竿和浮漂时冲难鱼。'],
        affectedLocations: ['river', 'waterfall', 'swamp'],
        fishSpeedMultiplier: 1.06,
        fishChangeDirMultiplier: 1.08,
        junkChanceDelta: -0.01,
        treasureChanceBonus: 0.04,
        panBonusChance: 0.08
      },
      mining: {
        active: true,
        label: '雷雨震脉',
        summary: '雷雨震动矿脉，矿石更松，但矿洞行动更吃体力。',
        detailLines: ['矿石格有更高概率多出一份矿石。', '探索体力消耗略升，适合带足补给后下矿。'],
        staminaCostMultiplier: 1.08,
        oreBonusChance: 0.12,
        dangerHint: '震动矿脉'
      },
      forage: {
        active: true,
        label: '雷雨异响',
        summary: '雷雨把竹林和远路都搅得不安，收益与风险一起抬高。',
        detailLines: ['采集略有提升，远征更容易进入风暴态。', '节庆交付会被视作冒雨送达的及时物资。'],
        forageChanceMultiplier: 1.08,
        journeyRiskWeather: 'storm',
        journeyDangerDelta: 4,
        journeyVisibilityDelta: -3,
        journeyPollutionDelta: 1,
        journeyAnomalyDelta: 3,
        festivalDeliveryLine: '雷雨天送到的节庆物资显得格外及时，委托反馈会更强。',
        routeHint: '风暴压线，激进远征收益高但危险抬升。'
      }
    }
  }

  if (context.weather === 'snowy') {
    return {
      ...base,
      label: '雪静回声',
      active: true,
      fishing: {
        active: true,
        label: '雪静回声',
        summary: '雪天水面更安静，鱼的挣扎节奏会稍微慢下来。',
        detailLines: ['鱼速下降，但可用鱼池仍受冬季和地点限制。'],
        affectedLocations: ['creek', 'pond', 'river', 'mine'],
        fishSpeedMultiplier: 0.94,
        fishChangeDirMultiplier: 0.96,
        junkChanceDelta: 0,
        treasureChanceBonus: 0.01,
        panBonusChance: 0
      },
      mining: {
        active: true,
        label: '霜裂矿纹',
        summary: '寒霜让矿壁裂纹更明显，矿石偶尔会顺着纹理多掉一份。',
        detailLines: ['矿石格小概率额外产出，行动节奏不变。'],
        staminaCostMultiplier: 1,
        oreBonusChance: 0.06,
        dangerHint: '霜裂矿纹'
      },
      forage: {
        active: true,
        label: '雪迹显路',
        summary: '雪迹会把一些被遮住的路径和枝下采集物显出来。',
        detailLines: ['采集略升，远征视野受雪雾影响。'],
        forageChanceMultiplier: 1.05,
        journeyRiskWeather: 'fog',
        journeyDangerDelta: 2,
        journeyVisibilityDelta: -3,
        journeyPollutionDelta: 0,
        journeyAnomalyDelta: 2,
        festivalDeliveryLine: '雪天送来的节庆物资带着保温与储备价值，村里会特别记住。',
        routeHint: '雪雾遮路，适合稳步推进或提前扎营。'
      }
    }
  }

  if (context.weather === 'windy') {
    return {
      ...base,
      label: '大风寻迹',
      active: true,
      fishing: {
        active: true,
        label: '大风寻迹',
        summary: '大风把水面吹乱，鱼更容易变向，但风也会把漂浮物推向岸边。',
        detailLines: ['鱼变向略升，宝箱机会略升。', '更适合有铅坠浮漂或高等级鱼竿时尝试。'],
        affectedLocations: ['river', 'waterfall', 'swamp'],
        fishSpeedMultiplier: 1.02,
        fishChangeDirMultiplier: 1.1,
        junkChanceDelta: 0,
        treasureChanceBonus: 0.02,
        panBonusChance: 0.02
      },
      mining: {
        active: true,
        label: '风砂入洞',
        summary: '风砂灌入洞口，浅层行动更耗神，但也会露出矿壁边缘。',
        detailLines: ['矿石格小概率额外产出，探索体力消耗略升。'],
        staminaCostMultiplier: 1.04,
        oreBonusChance: 0.05,
        dangerHint: '风砂视野'
      },
      forage: {
        active: true,
        label: '风落枝影',
        summary: '大风会吹落枝果，也会改变远征路线的视野判断。',
        detailLines: ['采集概率提升，远征更容易进入劲风态。'],
        forageChanceMultiplier: 1.1,
        journeyRiskWeather: 'wind',
        journeyDangerDelta: 2,
        journeyVisibilityDelta: 1,
        journeyPollutionDelta: 0,
        journeyAnomalyDelta: 1,
        festivalDeliveryLine: '风天赶到的节庆物资像是抢在摊位收拢前送达，反馈更鲜明。',
        routeHint: '劲风会改变路线判断，适合追踪传闻或支线侧探。'
      }
    }
  }

  if (context.weather === 'green_rain') {
    return {
      ...base,
      label: '绿雨异象',
      active: true,
      fishing: {
        active: true,
        label: '绿雨异象',
        summary: '绿雨让水色发亮，鱼群靠近浅岸，宝箱和稀有窗口更明显。',
        detailLines: ['鱼速下降、垃圾率下降，宝箱和淘金机会提高。', '这是适合集中处理钓鱼与水边采样的强窗口。'],
        affectedLocations: ['creek', 'river', 'waterfall', 'swamp'],
        fishSpeedMultiplier: 0.9,
        fishChangeDirMultiplier: 0.94,
        junkChanceDelta: -0.04,
        treasureChanceBonus: 0.05,
        panBonusChance: 0.1
      },
      mining: {
        active: true,
        label: '绿雨渗脉',
        summary: '绿雨渗进矿缝，矿石更容易显形，但深处异象也更活跃。',
        detailLines: ['矿石格更容易额外产出，探索体力消耗略升。'],
        staminaCostMultiplier: 1.05,
        oreBonusChance: 0.1,
        dangerHint: '绿雨渗脉'
      },
      forage: {
        active: true,
        label: '绿雨疯长',
        summary: '绿雨会让竹林采集和远征异象同时变得强烈。',
        detailLines: ['采集大幅提升，远征污染与异变压力明显抬升。', '节庆交付会被视作稀有天气下的特别物资。'],
        forageChanceMultiplier: 1.25,
        journeyRiskWeather: 'fog',
        journeyDangerDelta: 3,
        journeyVisibilityDelta: -1,
        journeyPollutionDelta: 6,
        journeyAnomalyDelta: 8,
        festivalDeliveryLine: '绿雨天送达的节庆物资带着少见异象，村里会把这批货单独提起。',
        routeHint: '绿雨让资源窗口变强，也会显著推高污染与异变。'
      }
    }
  }

  return base
}
