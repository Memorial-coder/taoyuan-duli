<template>
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-40">
    <div class="game-panel max-w-md w-full">
      <h3 class="text-accent text-sm mb-2">{{ SKILL_NAMES[skillType] }} 达到{{ level }}级！</h3>
      <p class="text-xs text-muted mb-4">选择一个专精方向：</p>

      <div class="flex flex-col space-y-3">
        <button
          v-for="option in options"
          :key="option.id"
          class="btn text-xs text-left flex flex-col space-y-1 py-3"
          @click="handleSelect(option.id)"
        >
          <span class="text-accent">{{ option.name }}</span>
          <span class="text-muted">{{ option.description }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type { SkillType, SkillPerk5, SkillPerk10, SkillPerk15, SkillPerk20 } from '@/types'
  import { useSkillStore } from '@/stores/useSkillStore'

  const props = defineProps<{
    skillType: SkillType
    level: 5 | 10 | 15 | 20
  }>()

  const emit = defineEmits<{
    select: [perk: SkillPerk5 | SkillPerk10 | SkillPerk15 | SkillPerk20]
  }>()

  const skillStore = useSkillStore()

  const SKILL_NAMES: Record<SkillType, string> = {
    farming: '农耕',
    foraging: '采集',
    fishing: '钓鱼',
    mining: '挖矿',
    combat: '战斗'
  }

  interface PerkOption {
    id: SkillPerk5 | SkillPerk10 | SkillPerk15 | SkillPerk20
    name: string
    description: string
  }

  const PERK5_OPTIONS: Record<SkillType, PerkOption[]> = {
    farming: [
      { id: 'harvester', name: '丰收者', description: '作物售价+10%' },
      { id: 'rancher', name: '牧人', description: '动物产品售价+20%' }
    ],
    foraging: [
      { id: 'lumberjack', name: '樵夫', description: '采集时25%概率额外获得木材' },
      { id: 'herbalist', name: '药师', description: '采集物品概率+20%' }
    ],
    fishing: [
      { id: 'fisher', name: '渔夫', description: '鱼售价+25%' },
      { id: 'trapper', name: '捕手', description: '挣扎时成功率+15%' }
    ],
    mining: [
      { id: 'miner', name: '矿工', description: '50%概率矿石+1' },
      { id: 'geologist', name: '地质学家', description: '稀有矿石概率大幅提升' }
    ],
    combat: [
      { id: 'fighter', name: '斗士', description: '受伤-15%，+25最大生命值' },
      { id: 'defender', name: '守护者', description: '防御时恢复5HP' }
    ]
  }

  /** Lv10 专精按 Lv5 分支分组 */
  const PERK10_BRANCHES: Record<SkillType, Record<string, PerkOption[]>> = {
    farming: {
      harvester: [
        { id: 'artisan', name: '匠人', description: '加工品售价+25%' },
        { id: 'intensive', name: '精耕', description: '收获时20%概率双倍' }
      ],
      rancher: [
        { id: 'coopmaster', name: '牧场主', description: '动物亲密度获取+50%' },
        { id: 'shepherd', name: '牧羊人', description: '动物产品品质提升一档' }
      ]
    },
    foraging: {
      lumberjack: [
        { id: 'forester', name: '伐木工', description: '采集时必定获得额外木材' },
        { id: 'tracker', name: '追踪者', description: '每次采集额外获得1件物品' }
      ],
      herbalist: [
        { id: 'botanist', name: '植物学家', description: '采集物必定优良品质' },
        { id: 'alchemist', name: '炼金师', description: '食物恢复+50%' }
      ]
    },
    fishing: {
      fisher: [
        { id: 'angler', name: '垂钓大师', description: '传说鱼出现率大幅提升' },
        { id: 'aquaculture', name: '水产商', description: '鱼售价+50%' }
      ],
      trapper: [
        { id: 'mariner', name: '水手', description: '钓上的鱼品质至少为优良' },
        { id: 'luremaster', name: '诱饵师', description: '鱼饵效果翻倍' }
      ]
    },
    mining: {
      miner: [
        { id: 'prospector', name: '探矿者', description: '矿石15%概率双倍' },
        { id: 'blacksmith', name: '铁匠', description: '金属矿石售价+50%' }
      ],
      geologist: [
        { id: 'excavator', name: '挖掘者', description: '使用炸弹时30%概率不消耗' },
        { id: 'mineralogist', name: '宝石学家', description: '击败怪物额外掉落矿石' }
      ]
    },
    combat: {
      fighter: [
        { id: 'warrior', name: '武者', description: '+40最大生命值' },
        { id: 'brute', name: '蛮力者', description: '攻击伤害+25%' }
      ],
      defender: [
        { id: 'acrobat', name: '杂技师', description: '25%概率闪避反击' },
        { id: 'tank', name: '重甲者', description: '防御时伤害减少70%' }
      ]
    }
  }

  type Perk15Branches = Partial<Record<SkillPerk10, PerkOption[]>>
  const PERK15_BRANCHES: Record<SkillType, Perk15Branches> = {
    farming: {
      intensive: [
        { id: 'grandmaster_farmer', name: '农耕宗师', description: '所有作物售价额外+20%' },
        { id: 'estate_owner', name: '庄园主', description: '可同时管理的地块+4' }
      ],
      artisan: [
        { id: 'grandmaster_farmer', name: '农耕宗师', description: '所有作物售价额外+20%' },
        { id: 'estate_owner', name: '庄园主', description: '可同时管理的地块+4' }
      ],
      coopmaster: [
        { id: 'livestock_baron', name: '牲畜大亨', description: '动物产品售价+30%' },
        { id: 'animal_whisperer', name: '动物语者', description: '动物每天自动+1心' }
      ],
      shepherd: [
        { id: 'livestock_baron', name: '牲畜大亨', description: '动物产品售价+30%' },
        { id: 'animal_whisperer', name: '动物语者', description: '动物每天自动+1心' }
      ]
    },
    foraging: {
      botanist: [
        { id: 'ancient_botanist', name: '上古植物学家', description: '采集物50%概率为极品品质' },
        { id: 'grand_alchemist', name: '大炼金师', description: '食物恢复效果再+50%' }
      ],
      alchemist: [
        { id: 'ancient_botanist', name: '上古植物学家', description: '采集物50%概率为极品品质' },
        { id: 'grand_alchemist', name: '大炼金师', description: '食物恢复效果再+50%' }
      ],
      forester: [
        { id: 'forest_guardian', name: '森林守护者', description: '采集时额外木材翻倍' },
        { id: 'wilderness_expert', name: '荒野专家', description: '每次采集额外获得2件物品' }
      ],
      tracker: [
        { id: 'forest_guardian', name: '森林守护者', description: '采集时额外木材翻倍' },
        { id: 'wilderness_expert', name: '荒野专家', description: '每次采集额外获得2件物品' }
      ]
    },
    fishing: {
      angler: [
        { id: 'legendary_angler', name: '传说垂钓者', description: '传说鱼出现率再大幅提升' },
        { id: 'aquatic_merchant', name: '水产巨商', description: '鱼类售价再+30%' }
      ],
      aquaculture: [
        { id: 'legendary_angler', name: '传说垂钓者', description: '传说鱼出现率再大幅提升' },
        { id: 'aquatic_merchant', name: '水产巨商', description: '鱼类售价再+30%' }
      ],
      mariner: [
        { id: 'sea_captain', name: '海洋船长', description: '钓鱼体力消耗-50%' },
        { id: 'bait_master', name: '诱饵大师', description: '鱼饵效果再翻倍' }
      ],
      luremaster: [
        { id: 'sea_captain', name: '海洋船长', description: '钓鱼体力消耗-50%' },
        { id: 'bait_master', name: '诱饵大师', description: '鱼饵效果再翻倍' }
      ]
    },
    mining: {
      prospector: [
        { id: 'vein_seeker', name: '矿脉探寻者', description: '矿石30%概率双倍' },
        { id: 'master_smith', name: '铁匠大师', description: '金属矿石售价再+50%' }
      ],
      blacksmith: [
        { id: 'vein_seeker', name: '矿脉探寻者', description: '矿石30%概率双倍' },
        { id: 'master_smith', name: '铁匠大师', description: '金属矿石售价再+50%' }
      ],
      excavator: [
        { id: 'deep_excavator', name: '深渊挖掘者', description: '炸弹50%概率不消耗' },
        { id: 'gem_collector', name: '宝石收藏家', description: '击败怪物必定掉落矿石' }
      ],
      mineralogist: [
        { id: 'deep_excavator', name: '深渊挖掘者', description: '炸弹50%概率不消耗' },
        { id: 'gem_collector', name: '宝石收藏家', description: '击败怪物必定掉落矿石' }
      ]
    },
    combat: {
      warrior: [
        { id: 'sword_saint', name: '剑圣', description: '攻击必定触发暴击概率+20%' },
        { id: 'berserker', name: '狂战士', description: '攻击伤害再+30%，但防御-10%' }
      ],
      brute: [
        { id: 'sword_saint', name: '剑圣', description: '攻击必定触发暴击概率+20%' },
        { id: 'berserker', name: '狂战士', description: '攻击伤害再+30%，但防御-10%' }
      ],
      acrobat: [
        { id: 'phantom_blade', name: '幻影剑客', description: '闪避率提升至40%' },
        { id: 'iron_fortress', name: '铁壁', description: '防御时伤害减免80%' }
      ],
      tank: [
        { id: 'phantom_blade', name: '幻影剑客', description: '闪避率提升至40%' },
        { id: 'iron_fortress', name: '铁壁', description: '防御时伤害减免80%' }
      ]
    }
  }

  type Perk20Branches = Partial<Record<SkillPerk15, PerkOption[]>>
  const PERK20_BRANCHES: Record<SkillType, Perk20Branches> = {
    farming: {
      grandmaster_farmer: [
        { id: 'deity_of_harvest', name: '丰收之神', description: '作物收获时50%概率双倍，售价再+15%' },
        { id: 'land_god', name: '土地神', description: '农田自动浇水，体力消耗归零' }
      ],
      estate_owner: [
        { id: 'deity_of_harvest', name: '丰收之神', description: '作物收获时50%概率双倍，售价再+15%' },
        { id: 'land_god', name: '土地神', description: '农田自动浇水，体力消耗归零' }
      ],
      livestock_baron: [
        { id: 'beast_sovereign', name: '兽王', description: '动物产品售价+50%，品质必定极品' },
        { id: 'nature_bond', name: '自然契约', description: '动物每天自动+3心且永不生病' }
      ],
      animal_whisperer: [
        { id: 'beast_sovereign', name: '兽王', description: '动物产品售价+50%，品质必定极品' },
        { id: 'nature_bond', name: '自然契约', description: '动物每天自动+3心且永不生病' }
      ]
    },
    foraging: {
      ancient_botanist: [
        { id: 'world_tree', name: '世界树', description: '采集物必定极品，数量+3' },
        { id: 'philosopher', name: '炼金哲人', description: '食物恢复效果+200%' }
      ],
      grand_alchemist: [
        { id: 'world_tree', name: '世界树', description: '采集物必定极品，数量+3' },
        { id: 'philosopher', name: '炼金哲人', description: '食物恢复效果+200%' }
      ],
      forest_guardian: [
        { id: 'forest_spirit', name: '森林精灵', description: '采集额外木材量翻4倍' },
        { id: 'primal_tracker', name: '原始追踪者', description: '每次采集额外获得4件物品' }
      ],
      wilderness_expert: [
        { id: 'forest_spirit', name: '森林精灵', description: '采集额外木材量翻4倍' },
        { id: 'primal_tracker', name: '原始追踪者', description: '每次采集额外获得4件物品' }
      ]
    },
    fishing: {
      legendary_angler: [
        { id: 'fish_god', name: '鱼神', description: '传说鱼必定出现，钓鱼体力消耗清零' },
        { id: 'ocean_trader', name: '海洋贸易商', description: '所有鱼售价+100%' }
      ],
      aquatic_merchant: [
        { id: 'fish_god', name: '鱼神', description: '传说鱼必定出现，钓鱼体力消耗清零' },
        { id: 'ocean_trader', name: '海洋贸易商', description: '所有鱼售价+100%' }
      ],
      sea_captain: [
        { id: 'sea_sovereign', name: '海洋霸主', description: '钓鱼体力消耗清零，必定优质鱼' },
        { id: 'lure_deity', name: '诱饵神', description: '鱼饵效果×8，且永不消耗' }
      ],
      bait_master: [
        { id: 'sea_sovereign', name: '海洋霸主', description: '钓鱼体力消耗清零，必定优质鱼' },
        { id: 'lure_deity', name: '诱饵神', description: '鱼饵效果×8，且永不消耗' }
      ]
    },
    mining: {
      vein_seeker: [
        { id: 'earth_pulse', name: '大地脉动', description: '矿石必定双倍，稀有矿概率大幅提升' },
        { id: 'forge_god', name: '锻造之神', description: '金属矿石售价×3' }
      ],
      master_smith: [
        { id: 'earth_pulse', name: '大地脉动', description: '矿石必定双倍，稀有矿概率大幅提升' },
        { id: 'forge_god', name: '锻造之神', description: '金属矿石售价×3' }
      ],
      deep_excavator: [
        { id: 'abyss_miner', name: '深渊矿工', description: '炸弹永不消耗，爆炸范围+1' },
        { id: 'gem_emperor', name: '宝石皇帝', description: '击败怪物必定掉落稀有矿石' }
      ],
      gem_collector: [
        { id: 'abyss_miner', name: '深渊矿工', description: '炸弹永不消耗，爆炸范围+1' },
        { id: 'gem_emperor', name: '宝石皇帝', description: '击败怪物必定掉落稀有矿石' }
      ]
    },
    combat: {
      sword_saint: [
        { id: 'war_god', name: '战神', description: '攻击伤害×2，暴击率+30%' },
        { id: 'slaughter_king', name: '杀戮之王', description: '击杀敌人时恢复10%最大生命值' }
      ],
      berserker: [
        { id: 'war_god', name: '战神', description: '攻击伤害×2，暴击率+30%' },
        { id: 'slaughter_king', name: '杀戮之王', description: '击杀敌人时恢复10%最大生命值' }
      ],
      phantom_blade: [
        { id: 'shadow_sovereign', name: '暗影霸主', description: '闪避率60%，闪避后必定暴击' },
        { id: 'indestructible', name: '不灭之躯', description: '受到致命伤时保留1HP，冷却60s' }
      ],
      iron_fortress: [
        { id: 'shadow_sovereign', name: '暗影霸主', description: '闪避率60%，闪避后必定暴击' },
        { id: 'indestructible', name: '不灭之躯', description: '受到致命伤时保留1HP，冷却60s' }
      ]
    }
  }

  const options = computed<PerkOption[]>(() => {
    const skill = skillStore.getSkill(props.skillType)
    if (props.level === 5) return PERK5_OPTIONS[props.skillType]
    if (props.level === 10) {
      const perk5 = skill.perk5
      if (perk5) return PERK10_BRANCHES[props.skillType][perk5] ?? []
      return []
    }
    if (props.level === 15) {
      const perk10 = skill.perk10
      if (perk10) return PERK15_BRANCHES[props.skillType][perk10] ?? []
      return []
    }
    if (props.level === 20) {
      const perk15 = skill.perk15
      if (perk15) return PERK20_BRANCHES[props.skillType][perk15] ?? []
      return []
    }
    return []
  })

  const handleSelect = (perkId: SkillPerk5 | SkillPerk10 | SkillPerk15 | SkillPerk20) => {
    emit('select', perkId)
  }
</script>
