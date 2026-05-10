import type { EquipmentEffectType } from '@/types'

/** 套装奖励档位 */
export interface SetBonusLevel {
  count: 2 | 3 | 4
  effects: { type: EquipmentEffectType; value: number }[]
  description: string
}

/** 装备套装定义 */
export interface EquipmentSetDef {
  id: string
  name: string
  description: string
  pieces: {
    weapon?: string
    ring: string
    hat: string
    shoe: string
  }
  bonuses: SetBonusLevel[]
}

export const EQUIPMENT_SETS: EquipmentSetDef[] = [
  // === 早期（商店可购买） ===
  {
    id: 'miner_set',
    name: '矿工套装',
    description: '专业矿工的标准装备',
    pieces: { ring: 'miners_ring', hat: 'miner_helmet', shoe: 'miner_boots' },
    bonuses: [
      { count: 2, effects: [{ type: 'ore_bonus', value: 1 }], description: '矿石加成+1' },
      { count: 3, effects: [{ type: 'mining_stamina', value: 0.1 }], description: '采矿体力消耗-10%' }
    ]
  },
  {
    id: 'fisher_set',
    name: '渔夫套装',
    description: '老练渔夫的行头',
    pieces: { ring: 'anglers_ring', hat: 'fisher_hat', shoe: 'fishing_waders' },
    bonuses: [
      { count: 2, effects: [{ type: 'fish_quality_bonus', value: 0.1 }], description: '鱼类品质+10%' },
      { count: 3, effects: [{ type: 'fishing_calm', value: 0.1 }], description: '钓鱼稳定+10%' }
    ]
  },

  // === 中期（铁匠铺合成） ===
  {
    id: 'merchant_set',
    name: '商贾套装',
    description: '精明商人的生意行头',
    pieces: { ring: 'merchants_ring', hat: 'merchant_hat', shoe: 'merchant_boots' },
    bonuses: [
      { count: 2, effects: [{ type: 'sell_price_bonus', value: 0.05 }], description: '售价+5%' },
      { count: 3, effects: [{ type: 'shop_discount', value: 0.08 }], description: '商店折扣+8%' }
    ]
  },
  {
    id: 'harvest_set',
    name: '丰收套装',
    description: '丰收季节的农人装束',
    pieces: { ring: 'harvest_moon_ring', hat: 'jade_hairpin', shoe: 'silk_slippers' },
    bonuses: [
      { count: 2, effects: [{ type: 'crop_growth_bonus', value: 0.1 }], description: '作物生长+10%' },
      { count: 3, effects: [{ type: 'crop_quality_bonus', value: 0.1 }], description: '作物品质+10%' }
    ]
  },
  {
    id: 'dragon_warrior_set',
    name: '战龙套装',
    description: '以龙为名的战士铠甲',
    pieces: { ring: 'warlord_ring', hat: 'dragon_helm', shoe: 'dragon_scale_boots' },
    bonuses: [
      { count: 2, effects: [{ type: 'attack_bonus', value: 3 }], description: '攻击力+3' },
      { count: 3, effects: [{ type: 'crit_rate_bonus', value: 0.1 }], description: '暴击率+10%' }
    ]
  },
  {
    id: 'obsidian_set',
    name: '黑曜套装',
    description: '黑曜石锻造的重型护甲',
    pieces: { ring: 'stalwart_ring', hat: 'obsidian_helm', shoe: 'obsidian_greaves' },
    bonuses: [
      { count: 2, effects: [{ type: 'max_hp_bonus', value: 20 }], description: '最大HP+20' },
      { count: 3, effects: [{ type: 'defense_bonus', value: 0.1 }], description: '防御+10%' }
    ]
  },
  {
    id: 'phoenix_set',
    name: '凤凰套装',
    description: '凤凰涅槃，福运加身',
    pieces: { ring: 'fortune_ring', hat: 'phoenix_crown', shoe: 'phoenix_boots' },
    bonuses: [
      { count: 2, effects: [{ type: 'luck', value: 0.05 }], description: '幸运+5%' },
      { count: 3, effects: [{ type: 'exp_bonus', value: 0.15 }], description: '经验加成+15%' }
    ]
  },

  // === 后期（BOSS掉落/怪物掉落） ===
  {
    id: 'shadow_set',
    name: '暗影套装',
    description: '暗影中潜行的刺客装备',
    pieces: { ring: 'shadow_ring', hat: 'shadow_mask', shoe: 'shadow_striders' },
    bonuses: [
      { count: 2, effects: [{ type: 'vampiric', value: 0.05 }], description: '吸血+5%' },
      { count: 3, effects: [{ type: 'monster_drop_bonus', value: 0.15 }], description: '掉落率+15%' }
    ]
  },
  {
    id: 'frost_queen_set',
    name: '冰后套装',
    description: '冰霜女王的遗物',
    pieces: { ring: 'frost_queen_circlet', hat: 'frost_queen_tiara', shoe: 'frost_queen_slippers' },
    bonuses: [
      { count: 2, effects: [{ type: 'fishing_calm', value: 0.1 }], description: '钓鱼稳定+10%' },
      { count: 3, effects: [{ type: 'monster_drop_bonus', value: 0.1 }], description: '掉落率+10%' }
    ]
  },
  {
    id: 'dragon_king_set',
    name: '龙王套装',
    description: '深渊龙王的至高遗产',
    pieces: { ring: 'abyss_dragon_ring', hat: 'abyss_dragon_horns', shoe: 'abyss_dragon_treads' },
    bonuses: [
      { count: 2, effects: [{ type: 'attack_bonus', value: 5 }], description: '攻击力+5' },
      {
        count: 3,
        effects: [
          { type: 'vampiric', value: 0.08 },
          { type: 'defense_bonus', value: 0.08 }
        ],
        description: '吸血+8%，防御+8%'
      }
    ]
  },

  // === 公会专属 ===
  {
    id: 'road_relay_set',
    name: '驿路行军套',
    description: '围绕荒道护送、补给周转与回城承接打造的行旅图套装。',
    pieces: { weapon: 'ancient_road_wayblade', ring: 'relay_command_ring', hat: 'roadwarden_hood', shoe: 'courier_stride_boots' },
    bonuses: [
      { count: 2, effects: [{ type: 'journey_stamina_reduction', value: 0.05 }], description: '行旅图体力消耗 -5%' },
      { count: 3, effects: [{ type: 'journey_carry_bonus', value: 1 }, { type: 'journey_event_bonus', value: 0.08 }], description: '负重 +1，承接效率提升' },
      { count: 4, effects: [{ type: 'camp_recovery_bonus', value: 8 }, { type: 'boss_pressure_resist', value: 0.05 }], description: '扎营恢复增强，首领压力下降' }
    ]
  },
  {
    id: 'marsh_specimen_set',
    name: '泽地样本套',
    description: '围绕样本、夜游和异常观察打造的行旅图套装。',
    pieces: { weapon: 'marsh_whisper_dagger', ring: 'specimen_lens_ring', hat: 'sporeglass_hood', shoe: 'reedstep_waders' },
    bonuses: [
      { count: 2, effects: [{ type: 'journey_scout_bonus', value: 6 }], description: '侦察 +6' },
      { count: 3, effects: [{ type: 'resource_find_bonus', value: 0.12 }, { type: 'journey_event_bonus', value: 0.08 }], description: '样本回收与事件收益提升' },
      { count: 4, effects: [{ type: 'camp_recovery_bonus', value: 10 }, { type: 'journey_hazard_resist', value: 5 }], description: '异常恢复与压险能力提升' }
    ]
  },
  {
    id: 'highland_bastion_set',
    name: '高地壁垒套',
    description: '围绕高压承伤、战备压制和首领收束打造的行旅图套装。',
    pieces: { weapon: 'highland_bastion_maul', ring: 'bulwark_crystal_ring', hat: 'skywatch_helm', shoe: 'stormforged_greaves' },
    bonuses: [
      { count: 2, effects: [{ type: 'journey_hazard_resist', value: 6 }], description: '压险 +6' },
      { count: 3, effects: [{ type: 'boss_pressure_resist', value: 0.08 }, { type: 'journey_carry_bonus', value: 1 }], description: '首领压力下降，负重提升' },
      { count: 4, effects: [{ type: 'resource_find_bonus', value: 0.12 }, { type: 'camp_recovery_bonus', value: 8 }], description: '高地回流与扎营恢复提升' }
    ]
  },
  {
    id: 'guild_champion_set',
    name: '公会勇士套装',
    description: '冒险家公会精英战士的专属装备',
    pieces: { weapon: 'guild_war_blade', ring: 'guild_war_ring', hat: 'guild_war_helm', shoe: 'guild_war_boots' },
    bonuses: [
      { count: 2, effects: [{ type: 'attack_bonus', value: 3 }], description: '攻击力+3' },
      {
        count: 3,
        effects: [
          { type: 'defense_bonus', value: 0.08 },
          { type: 'max_hp_bonus', value: 20 }
        ],
        description: '防御+8%，HP+20'
      },
      {
        count: 4,
        effects: [
          { type: 'vampiric', value: 0.08 },
          { type: 'crit_rate_bonus', value: 0.05 }
        ],
        description: '吸血+8%，暴击率+5%'
      }
    ]
  }
]

/** 根据装备ID查找所属套装 */
export const getSetByPieceId = (defId: string): EquipmentSetDef | undefined => {
  return EQUIPMENT_SETS.find(
    s => s.pieces.weapon === defId || s.pieces.ring === defId || s.pieces.hat === defId || s.pieces.shoe === defId
  )
}
