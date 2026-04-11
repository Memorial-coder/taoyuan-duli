<template>
  <div>
    <h3 class="text-accent text-sm mb-3">
      <Star :size="14" class="inline" />
      技能
    </h3>
    <div class="space-y-3">
      <div v-for="skill in skillStore.skills" :key="skill.type" class="game-panel">
        <!-- 标题行：图标 + 名称等级 + 经验 -->
        <div class="flex justify-between items-center mb-1.5">
          <div class="flex items-center space-x-1.5">
            <component :is="SKILL_ICONS[skill.type]" :size="14" class="text-accent" />
            <span class="text-sm">{{ SKILL_NAMES[skill.type] }}</span>
            <span class="text-xs text-accent">Lv.{{ skill.level }}</span>
          </div>
          <p v-if="expInfo(skill.type)" class="text-[10px] text-muted">
            {{ expInfo(skill.type)!.current }}/{{ expInfo(skill.type)!.required }}
          </p>
          <span v-else class="text-[10px] text-accent border border-accent/30 rounded-xs px-1">MAX</span>
        </div>

        <!-- 经验条 -->
        <div class="bg-bg rounded-xs h-1.5 mb-2">
          <div class="h-full bg-accent rounded-xs transition-all" :style="{ width: expPercent(skill.type) + '%' }" />
        </div>

        <!-- 介绍 + 每级加成 -->
        <div class="border border-accent/20 rounded-xs px-2 py-1.5 mb-2">
          <p class="text-[10px] text-muted leading-relaxed">{{ SKILL_DESCS[skill.type] }}</p>
          <p class="text-[10px] text-muted mt-0.5">每级：体力消耗-1%，{{ SKILL_LEVEL_BONUS[skill.type] }}</p>
        </div>

        <!-- 天赋 -->
        <div v-if="skill.perk5 || skill.perk10 || skill.perk15 || skill.perk20" class="flex flex-col space-y-1">
          <div v-if="skill.perk5" class="flex items-center space-x-1.5 border border-water rounded-xs px-2 py-1">
            <span class="text-[10px] text-water shrink-0">Lv5</span>
            <span class="text-xs text-water shrink-0">{{ PERK_NAMES[skill.perk5] }}</span>
            <span class="text-[10px] text-muted">{{ PERK_DESCS[skill.perk5] }}</span>
          </div>
          <div v-if="skill.perk10" class="flex items-center space-x-1.5 border border-water rounded-xs px-2 py-1">
            <span class="text-[10px] text-water shrink-0">Lv10</span>
            <span class="text-xs text-water shrink-0">{{ PERK_NAMES[skill.perk10] }}</span>
            <span class="text-[10px] text-muted">{{ PERK_DESCS[skill.perk10] }}</span>
          </div>
          <div v-if="skill.perk15" class="flex items-center space-x-1.5 border border-accent rounded-xs px-2 py-1">
            <span class="text-[10px] text-accent shrink-0">Lv15</span>
            <span class="text-xs text-accent shrink-0">{{ PERK_NAMES[skill.perk15] }}</span>
            <span class="text-[10px] text-muted">{{ PERK_DESCS[skill.perk15] }}</span>
          </div>
          <div v-if="skill.perk20" class="flex items-center space-x-1.5 border border-accent rounded-xs px-2 py-1">
            <span class="text-[10px] text-accent shrink-0">Lv20</span>
            <span class="text-xs text-accent shrink-0">{{ PERK_NAMES[skill.perk20] }}</span>
            <span class="text-[10px] text-muted">{{ PERK_DESCS[skill.perk20] }}</span>
          </div>
        </div>
        <p v-else-if="skill.level < 5" class="text-[10px] text-muted">Lv5 / Lv10 / Lv15 / Lv20 时可选择专精天赋</p>
        <p v-else class="text-[10px] text-muted">升级到 Lv{{ !skill.perk5 ? 5 : !skill.perk10 ? 10 : !skill.perk15 ? 15 : 20 }} 后可选择天赋</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { type Component } from 'vue'
  import { Star, Wheat, TreePine, Fish, Pickaxe, Sword } from 'lucide-vue-next'
  import { useSkillStore } from '@/stores/useSkillStore'
  import type { SkillType, SkillPerk5, SkillPerk10, SkillPerk15, SkillPerk20 } from '@/types'

  const skillStore = useSkillStore()

  const SKILL_ICONS: Record<SkillType, Component> = {
    farming: Wheat,
    foraging: TreePine,
    fishing: Fish,
    mining: Pickaxe,
    combat: Sword
  }

  const SKILL_NAMES: Record<SkillType, string> = {
    farming: '农耕',
    foraging: '采集',
    fishing: '钓鱼',
    mining: '挖矿',
    combat: '战斗'
  }

  const SKILL_DESCS: Record<SkillType, string> = {
    farming: '种植作物、收获农产品。等级越高，作物品质越好。',
    foraging: '采集野外资源、伐木。等级越高，采集品质越好。',
    fishing: '在各水域钓鱼。等级越高，钓鱼成功率越高。',
    mining: '在矿洞中采矿和战斗。等级越高，矿石产出越多。',
    combat: '与矿洞中的怪物战斗。等级越高，生命值上限越高。'
  }

  const SKILL_LEVEL_BONUS: Record<SkillType, string> = {
    farming: '作物品质概率提升',
    foraging: '采集品质概率提升',
    fishing: '钓鱼成功率提升',
    mining: '矿石产出提升',
    combat: '生命值上限+5'
  }

  const PERK_DESCS: Record<SkillPerk5 | SkillPerk10 | SkillPerk15 | SkillPerk20, string> = {
    harvester: '作物售价+10%',
    rancher: '畜产品售价+20%',
    lumberjack: '采集时25%概率额外获得木材',
    herbalist: '采集物发现概率+20%',
    fisher: '鱼类售价+25%',
    trapper: '搏鱼成功率+15%',
    miner: '50%概率矿石+1',
    geologist: '稀有矿石概率大幅提升',
    fighter: '受伤减少15%，生命上限+25',
    defender: '防御时恢复5点生命',
    intensive: '20%概率双倍收获',
    artisan: '加工品售价+25%',
    coopmaster: '动物亲密度获取+50%',
    shepherd: '畜产品品质提升一级',
    forester: '采集时必定额外获得木材',
    tracker: '每次采集额外+1物品',
    botanist: '采集物品质必定为优质',
    alchemist: '食物恢复效果+50%',
    angler: '传说鱼出现概率大幅提升',
    aquaculture: '鱼类售价+50%',
    mariner: '钓到的鱼品质至少为优质',
    luremaster: '鱼饵效果翻倍',
    prospector: '15%概率矿石翻倍',
    blacksmith: '金属矿石售价+50%',
    excavator: '使用炸弹时30%概率不消耗',
    mineralogist: '击败怪物额外掉落矿石',
    warrior: '生命上限+40',
    brute: '攻击伤害+25%',
    acrobat: '25%概率闪避并反击',
    tank: '防御时伤害减免70%',
    grandmaster_farmer: '作物售价额外+20%，品质大幅提升',
    estate_owner: '加工品售价+40%，产量+1',
    livestock_baron: '动物产品数量翻倍',
    animal_whisperer: '动物亲密度满后每日额外产出',
    ancient_botanist: '采集物必定神圣品质',
    grand_alchemist: '食物恢复+100%，可叠加效果',
    forest_guardian: '采集时必定获得2份额外木材',
    wilderness_expert: '每次采集额外+2物品',
    legendary_angler: '每次钓鱼有10%概率钓到传说鱼',
    aquatic_merchant: '鱼类售价+80%',
    sea_captain: '钓到的鱼品质必定为神圣',
    bait_master: '鱼饵效果+200%且不消耗',
    vein_seeker: '矿石30%概率翻倍',
    master_smith: '金属矿石售价+80%，冶炼速度+50%',
    deep_excavator: '炸弹不消耗且范围扩大',
    gem_collector: '击败怪物必定掉落宝石',
    sword_saint: '生命上限+80，攻击+15%',
    berserker: '攻击伤害+50%',
    phantom_blade: '50%概率闪避并造成双倍伤害',
    iron_fortress: '防御时伤害减免90%，反弹10%伤害',
    deity_of_harvest: '所有作物售价+50%，品质必定神圣',
    land_god: '所有农产品产量+100%',
    beast_sovereign: '所有动物产品数量×3',
    nature_bond: '动物永远不会不满，产出品质神圣',
    world_tree: '采集物品质神圣，采集量×3',
    philosopher: '食物效果永久，可同时叠加5种',
    forest_spirit: '采集时必定获得3份木材及稀有材料',
    primal_tracker: '每次采集额外+4物品',
    fish_god: '任何时间任何天气均可钓到传说鱼',
    ocean_trader: '所有鱼类售价+150%',
    sea_sovereign: '钓到的鱼必定神圣品质且数量×2',
    lure_deity: '无需鱼饵，自动吸引最稀有的鱼',
    earth_pulse: '矿石50%概率×3产出',
    forge_god: '所有矿石售价+120%，冶炼无需燃料',
    abyss_miner: '炸弹无限使用，范围最大化',
    gem_emperor: '所有宝石必定掉落，售价+100%',
    war_god: '生命上限+150，攻击+30%，受伤-20%',
    slaughter_king: '攻击伤害×2，击杀回复20%生命',
    shadow_sovereign: '80%概率闪避，闪避时造成三倍伤害',
    indestructible: '防御时无敌，反弹全部伤害'
  }

  const PERK_NAMES: Record<SkillPerk5 | SkillPerk10 | SkillPerk15 | SkillPerk20, string> = {
    harvester: '丰收者',
    rancher: '牧人',
    lumberjack: '樵夫',
    herbalist: '药师',
    fisher: '渔夫',
    trapper: '捕手',
    miner: '矿工',
    geologist: '地质学家',
    fighter: '斗士',
    defender: '守护者',
    intensive: '精耕',
    artisan: '匠人',
    coopmaster: '牧场主',
    shepherd: '牧羊人',
    botanist: '植物学家',
    alchemist: '炼金师',
    forester: '伐木工',
    tracker: '追踪者',
    angler: '垂钓大师',
    aquaculture: '水产商',
    mariner: '水手',
    luremaster: '诱饵师',
    prospector: '探矿者',
    blacksmith: '铁匠',
    excavator: '挖掘者',
    mineralogist: '宝石学家',
    warrior: '武者',
    brute: '蛮力者',
    acrobat: '杂技师',
    tank: '重甲者',
    grandmaster_farmer: '宗师农夫',
    estate_owner: '庄园主',
    livestock_baron: '畜牧大亨',
    animal_whisperer: '兽语者',
    ancient_botanist: '远古植物学家',
    grand_alchemist: '大炼金师',
    forest_guardian: '森林守护者',
    wilderness_expert: '荒野专家',
    legendary_angler: '传说垂钓者',
    aquatic_merchant: '水产大商',
    sea_captain: '海上船长',
    bait_master: '诱饵宗师',
    vein_seeker: '矿脉探寻者',
    master_smith: '宗师铁匠',
    deep_excavator: '深渊挖掘者',
    gem_collector: '宝石收藏家',
    sword_saint: '剑圣',
    berserker: '狂战士',
    phantom_blade: '幻影剑客',
    iron_fortress: '铁壁要塞',
    deity_of_harvest: '丰收之神',
    land_god: '土地神',
    beast_sovereign: '兽王',
    nature_bond: '自然契约者',
    world_tree: '世界之树',
    philosopher: '哲学家',
    forest_spirit: '森林精灵',
    primal_tracker: '原始追踪者',
    fish_god: '鱼神',
    ocean_trader: '海洋商人',
    sea_sovereign: '海洋霸主',
    lure_deity: '诱饵神',
    earth_pulse: '地脉感知者',
    forge_god: '锻造神',
    abyss_miner: '深渊矿工',
    gem_emperor: '宝石皇帝',
    war_god: '战神',
    slaughter_king: '屠杀之王',
    shadow_sovereign: '暗影霸主',
    indestructible: '不灭之身'
  }

  const expInfo = (type: SkillType) => {
    return skillStore.getExpToNextLevel(type)
  }

  const expPercent = (type: SkillType): number => {
    const info = skillStore.getExpToNextLevel(type)
    if (!info) return 100
    return Math.round((info.current / info.required) * 100)
  }
</script>
