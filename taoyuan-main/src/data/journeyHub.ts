import type {
  JourneyAwakeningDef,
  JourneyCampModuleDef,
  JourneyCraftingRecipeDef,
  JourneyRoutePermitDef
} from '@/types/region'

export const JOURNEY_CRAFTING_RECIPES: JourneyCraftingRecipeDef[] = [
  {
    id: 'ancient_road_wayblade_recipe',
    regionId: 'ancient_road',
    name: '古驿行军剑',
    description: '围绕古驿押运与护送节奏锻出的稳定长剑，适合把荒道推进接进护送与首领压制线。',
    requiredItems: [
      { itemId: 'archive_rubbing', quantity: 2 },
      { itemId: 'ancient_waybill', quantity: 2 },
      { itemId: 'iron_bar', quantity: 4 }
    ],
    requiredMoney: 1800,
    reward: { kind: 'weapon', defId: 'ancient_road_wayblade', enchantmentId: 'sturdy' },
    unlockRouteIds: ['ancient_road_convoy_risk'],
    tags: ['护送', '稳推进', '首领前置']
  },
  {
    id: 'relay_command_ring_recipe',
    regionId: 'ancient_road',
    name: '驿传统筹戒',
    description: '把驿券、残卷和调度经验锻进戒环，强化远征统筹、负重与事件承接。',
    requiredItems: [
      { itemId: 'ancient_waybill', quantity: 2 },
      { itemId: 'archive_rubbing', quantity: 1 },
      { itemId: 'jade', quantity: 1 }
    ],
    requiredMoney: 1200,
    reward: { kind: 'ring', defId: 'relay_command_ring' },
    unlockRouteIds: ['ancient_road_watchtower_scout'],
    tags: ['负重', '承接', '荒道']
  },
  {
    id: 'courier_stride_boots_recipe',
    regionId: 'ancient_road',
    name: '邮驿疾行靴',
    description: '强调赶路、转运与侦察节奏的靴子，让荒道回流更快接成下一趟出发。',
    requiredItems: [
      { itemId: 'ancient_waybill', quantity: 2 },
      { itemId: 'archive_rubbing', quantity: 1 },
      { itemId: 'silk_cloth', quantity: 2 }
    ],
    requiredMoney: 1000,
    reward: { kind: 'shoe', defId: 'courier_stride_boots' },
    unlockRouteIds: ['ancient_road_supply_relay'],
    tags: ['减耗', '侦察', '荒道']
  },
  {
    id: 'marsh_whisper_dagger_recipe',
    regionId: 'mirage_marsh',
    name: '泽雾低语匕',
    description: '把夜游与样本线的轻快节奏压进匕首，适合先手、分支和样本回收。',
    requiredItems: [
      { itemId: 'luminous_algae', quantity: 2 },
      { itemId: 'marsh_spore_sample', quantity: 2 },
      { itemId: 'crystal_ore', quantity: 3 }
    ],
    requiredMoney: 2000,
    reward: { kind: 'weapon', defId: 'marsh_whisper_dagger', enchantmentId: 'precise' },
    unlockRouteIds: ['mirage_marsh_ecology_alert'],
    tags: ['分支', '样本', '泽地']
  },
  {
    id: 'specimen_lens_ring_recipe',
    regionId: 'mirage_marsh',
    name: '样本折光戒',
    description: '围绕观察、记录和展陈准备打造的戒指，强化样本发现与事件兑现。',
    requiredItems: [
      { itemId: 'marsh_spore_sample', quantity: 2 },
      { itemId: 'luminous_algae', quantity: 1 },
      { itemId: 'moonstone', quantity: 1 }
    ],
    requiredMoney: 1400,
    reward: { kind: 'ring', defId: 'specimen_lens_ring' },
    unlockRouteIds: ['mirage_marsh_specimen_drive'],
    tags: ['侦察', '样本', '泽地']
  },
  {
    id: 'reedstep_waders_recipe',
    regionId: 'mirage_marsh',
    name: '芦迹涉行靴',
    description: '在泽地里稳住节奏、压住异常的轻便涉水靴，适合长线样本回流。',
    requiredItems: [
      { itemId: 'marsh_spore_sample', quantity: 1 },
      { itemId: 'luminous_algae', quantity: 2 },
      { itemId: 'silk_cloth', quantity: 2 }
    ],
    requiredMoney: 1200,
    reward: { kind: 'shoe', defId: 'reedstep_waders' },
    unlockRouteIds: ['mirage_marsh_reed_drift'],
    tags: ['恢复', '异常', '泽地']
  },
  {
    id: 'highland_bastion_maul_recipe',
    regionId: 'cloud_highland',
    name: '云岚壁垒锤',
    description: '把高地战备、破障与压制节奏压进重锤，最适合高压承伤和首领前推。',
    requiredItems: [
      { itemId: 'wind_etched_core', quantity: 2 },
      { itemId: 'ley_crystal_shard', quantity: 2 },
      { itemId: 'void_ore', quantity: 3 }
    ],
    requiredMoney: 2400,
    reward: { kind: 'weapon', defId: 'highland_bastion_maul', enchantmentId: 'fierce' },
    unlockRouteIds: ['cloud_highland_patrol'],
    tags: ['压制', '战备', '高地']
  },
  {
    id: 'bulwark_crystal_ring_recipe',
    regionId: 'cloud_highland',
    name: '灵脉壁垒戒',
    description: '把高地晶体战备压成防线核心，能明显缓和高压远征的首领压力。',
    requiredItems: [
      { itemId: 'ley_crystal_shard', quantity: 2 },
      { itemId: 'wind_etched_core', quantity: 1 },
      { itemId: 'obsidian', quantity: 1 }
    ],
    requiredMoney: 1600,
    reward: { kind: 'ring', defId: 'bulwark_crystal_ring' },
    unlockRouteIds: ['cloud_highland_supply_push'],
    tags: ['承伤', '高地', '首领']
  },
  {
    id: 'skywatch_helm_recipe',
    regionId: 'cloud_highland',
    name: '天巡哨盔',
    description: '兼顾高地巡路、观察和压制节奏的哨盔，让高地回流更稳地接回公会。',
    requiredItems: [
      { itemId: 'wind_etched_core', quantity: 2 },
      { itemId: 'ley_crystal_shard', quantity: 1 },
      { itemId: 'iron_bar', quantity: 4 }
    ],
    requiredMoney: 1500,
    reward: { kind: 'hat', defId: 'skywatch_helm' },
    unlockRouteIds: ['cloud_highland_skybridge_watch'],
    tags: ['侦察', '公会', '高地']
  },
  {
    id: 'roadwarden_hood_recipe',
    regionId: 'ancient_road',
    name: '驿路统御兜帽',
    description: '荒道首领线开放后的统御兜帽，进一步放大荒道总调度与回城承接能力。',
    requiredItems: [
      { itemId: 'archive_rubbing', quantity: 3 },
      { itemId: 'ancient_waybill', quantity: 2 },
      { itemId: 'silk_cloth', quantity: 3 }
    ],
    requiredMoney: 2200,
    reward: { kind: 'hat', defId: 'roadwarden_hood' },
    unlockBossIds: ['ancient_road_overseer'],
    tags: ['荒道首领', '承接', '统筹']
  },
  {
    id: 'sporeglass_hood_recipe',
    regionId: 'mirage_marsh',
    name: '孢镜夜巡兜帽',
    description: '泽地主线成熟后开放的观察兜帽，强化样本、异常和夜游节奏。',
    requiredItems: [
      { itemId: 'luminous_algae', quantity: 3 },
      { itemId: 'marsh_spore_sample', quantity: 2 },
      { itemId: 'silk_cloth', quantity: 3 }
    ],
    requiredMoney: 2200,
    reward: { kind: 'hat', defId: 'sporeglass_hood' },
    unlockBossIds: ['mirage_marsh_devourer'],
    tags: ['泽地首领', '夜游', '样本']
  },
  {
    id: 'stormforged_greaves_recipe',
    regionId: 'cloud_highland',
    name: '风铸壁行胫甲',
    description: '高地首领线开放后的重甲靴，专门为高压远征和回城战备收束设计。',
    requiredItems: [
      { itemId: 'wind_etched_core', quantity: 3 },
      { itemId: 'ley_crystal_shard', quantity: 2 },
      { itemId: 'obsidian', quantity: 2 }
    ],
    requiredMoney: 2400,
    reward: { kind: 'shoe', defId: 'stormforged_greaves' },
    unlockBossIds: ['cloud_highland_warden'],
    tags: ['高地首领', '承伤', '战备']
  }
]

export const JOURNEY_AWAKENINGS: JourneyAwakeningDef[] = [
  {
    id: 'ancient_road_archivist_stride',
    regionId: 'ancient_road',
    skillType: 'foraging',
    name: '档案行脚',
    description: '把荒道残卷的线索追踪能力接到采集与侦察节奏上。',
    requiredFamilyId: 'ancient_archive',
    requiredFamilyAmount: 4,
    requiredRouteCompletions: 2,
    modifiers: {
      scoutBonus: 10,
      eventBonus: 0.12,
      knowledgeBonus: 0.15
    },
    summaryLines: ['荒道采集与勘明更容易看见支线与回城承接。']
  },
  {
    id: 'ancient_road_convoy_guard',
    regionId: 'ancient_road',
    skillType: 'combat',
    name: '护送镇线',
    description: '把护送、压险和站线经验转成荒道远征的稳定性。',
    requiredFamilyId: 'ancient_archive',
    requiredFamilyAmount: 5,
    requiredRouteCompletions: 3,
    modifiers: {
      carryBonus: 1,
      hazardResist: 6,
      bossPressureResist: 0.08
    },
    summaryLines: ['荒道精英线与首领线更容易稳住前线节奏。']
  },
  {
    id: 'mirage_marsh_specimen_reader',
    regionId: 'mirage_marsh',
    skillType: 'foraging',
    name: '样本读解',
    description: '强化样本鉴别、分支观察和泽地见闻兑现。',
    requiredFamilyId: 'ecology_specimen',
    requiredFamilyAmount: 4,
    requiredRouteCompletions: 2,
    modifiers: {
      scoutBonus: 8,
      resourceFindBonus: 0.14,
      knowledgeBonus: 0.12
    },
    summaryLines: ['泽地样本更容易转成有效研究与高质量回流。']
  },
  {
    id: 'mirage_marsh_calm_water',
    regionId: 'mirage_marsh',
    skillType: 'fishing',
    name: '静水夜巡',
    description: '把鱼塘与夜游经验接到泽地异常处理和营地恢复上。',
    requiredFamilyId: 'ecology_specimen',
    requiredFamilyAmount: 5,
    requiredRouteCompletions: 3,
    modifiers: {
      campRecoveryBonus: 12,
      eventBonus: 0.1,
      hazardResist: 5
    },
    summaryLines: ['泽地夜巡与异常线更容易稳住节奏并回收样本。']
  },
  {
    id: 'cloud_highland_ley_forge',
    regionId: 'cloud_highland',
    skillType: 'mining',
    name: '灵脉锻线',
    description: '把高地晶采、破障与战备压成采矿系的高地被动。',
    requiredFamilyId: 'ley_crystal',
    requiredFamilyAmount: 4,
    requiredRouteCompletions: 2,
    modifiers: {
      resourceFindBonus: 0.16,
      carryBonus: 1,
      hazardResist: 5
    },
    summaryLines: ['高地晶体与补给素材回流更快形成战备价值。']
  },
  {
    id: 'cloud_highland_quartermaster',
    regionId: 'cloud_highland',
    skillType: 'farming',
    name: '前线军需',
    description: '把口粮、补给与战备收束挂进高地长线推进。',
    requiredFamilyId: 'ley_crystal',
    requiredFamilyAmount: 5,
    requiredRouteCompletions: 3,
    modifiers: {
      staminaCostReduction: 0.08,
      campRecoveryBonus: 8,
      rewardMultiplier: 0.1,
      supplyBonus: { rations: 1, medicine: 0, utility: 0 }
    },
    summaryLines: ['高地远征更省补给，也更容易把收获转成下轮准备。']
  }
]

export const JOURNEY_CAMP_MODULES: JourneyCampModuleDef[] = [
  {
    id: 'field_kitchen',
    regionId: 'ancient_road',
    name: '前线火灶',
    description: '让口粮和休整在行旅图里更有存在感。',
    requiredFamilyId: 'ancient_archive',
    requiredFamilyAmount: 3,
    modifiers: {
      campRecoveryBonus: 8,
      staminaCostReduction: 0.04
    },
    supplyBonus: { rations: 1 }
  },
  {
    id: 'specimen_case',
    regionId: 'mirage_marsh',
    name: '标本保鲜箱',
    description: '在泽地远征里为样本、观察和异常处理争取更稳的操作空间。',
    requiredFamilyId: 'ecology_specimen',
    requiredFamilyAmount: 3,
    modifiers: {
      scoutBonus: 6,
      eventBonus: 0.08,
      resourceFindBonus: 0.08
    },
    supplyBonus: { utility: 1 }
  },
  {
    id: 'crystal_battery',
    regionId: 'cloud_highland',
    name: '晶脉蓄能匣',
    description: '把高地晶体直接接进营地供能与高压战备准备。',
    requiredFamilyId: 'ley_crystal',
    requiredFamilyAmount: 3,
    modifiers: {
      hazardResist: 4,
      bossPressureResist: 0.06
    },
    supplyBonus: { medicine: 1, utility: 1 }
  }
]

export const JOURNEY_ROUTE_PERMITS: JourneyRoutePermitDef[] = [
  {
    id: 'ancient_road_caravan_writ',
    regionId: 'ancient_road',
    name: '古驿商队通牒',
    description: '让荒道远征更偏向稳定护送和负重统筹。',
    requiredFamilyId: 'ancient_archive',
    requiredFamilyAmount: 4,
    requiredRouteIds: ['ancient_road_supply_relay', 'ancient_road_watchtower_scout'],
    modifiers: {
      staminaCostReduction: 0.06,
      carryBonus: 1,
      rewardMultiplier: 0.08
    }
  },
  {
    id: 'mirage_marsh_specimen_pass',
    regionId: 'mirage_marsh',
    name: '泽地样本通行证',
    description: '让泽地样本与见闻更快形成可回收价值。',
    requiredFamilyId: 'ecology_specimen',
    requiredFamilyAmount: 4,
    requiredRouteIds: ['mirage_marsh_night_watch', 'mirage_marsh_reed_drift'],
    modifiers: {
      scoutBonus: 5,
      eventBonus: 0.1,
      rewardMultiplier: 0.08
    }
  },
  {
    id: 'cloud_highland_supply_sigil',
    regionId: 'cloud_highland',
    name: '高地军需符印',
    description: '让高地回流更稳定地变成战备、建设和首领压制准备。',
    requiredFamilyId: 'ley_crystal',
    requiredFamilyAmount: 4,
    requiredRouteIds: ['cloud_highland_ley_crack', 'cloud_highland_skybridge_watch'],
    modifiers: {
      hazardResist: 5,
      bossPressureResist: 0.08,
      resourceFindBonus: 0.1
    }
  }
]
