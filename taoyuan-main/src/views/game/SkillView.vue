<template>
  <div>
    <div class="mb-3 flex items-center justify-between gap-2">
      <h3 class="text-accent text-sm">
        <Star :size="14" class="inline" />
        技能
      </h3>
      <button class="inline-flex items-center gap-1 rounded-xs border border-accent/20 px-2 py-1 text-xs text-accent hover:bg-accent/5" @click="navigateToPanel('potential')">
        <Sparkles :size="12" />
        <span>潜能</span>
      </button>
    </div>
    <!-- WS06 anchor: this skill/perk panel is the existing base for future
         mastery-style endgame growth that converges multiple progression lines. -->
    <div class="desktop-adaptive-grid--cards" data-testid="skill-layout-grid">
      <div v-for="skill in skillStore.skills" :key="skill.type" class="game-panel">
        <!-- 标题行：图标 + 名称等级 + 经验 -->
        <div class="flex justify-between items-center mb-1.5">
          <div class="flex items-center space-x-1.5">
            <component :is="SKILL_ICONS[skill.type]" :size="14" class="text-accent" />
            <span class="text-sm">{{ SKILL_NAMES[skill.type] }}</span>
            <span class="text-xs text-accent">Lv.{{ skill.level }}</span>
          </div>
          <p v-if="expInfo(skill.type)" class="text-[0.625rem] text-muted">
            {{ expInfo(skill.type)!.current }}/{{ expInfo(skill.type)!.required }}
          </p>
          <span v-else class="text-[0.625rem] text-accent border border-accent/30 rounded-xs px-1">MAX</span>
        </div>

        <!-- 经验条 -->
        <div class="bg-bg rounded-xs h-1.5 mb-2">
          <div class="h-full bg-accent rounded-xs transition-all" :style="{ width: expPercent(skill.type) + '%' }" />
        </div>

        <!-- 介绍 + 每级加成 -->
        <div class="border border-accent/20 rounded-xs px-2 py-1.5 mb-2">
          <p class="text-[0.625rem] text-muted leading-relaxed">{{ SKILL_DESCS[skill.type] }}</p>
          <p class="text-[0.625rem] text-muted mt-0.5">每级：体力消耗-1%，{{ SKILL_LEVEL_BONUS[skill.type] }}</p>
        </div>

        <!-- 天赋 -->
        <div v-if="skill.perk5 || skill.perk10 || skill.perk15 || skill.perk20" class="flex flex-col space-y-1">
          <div v-if="skill.perk5" class="flex items-center gap-1.5 border border-water rounded-xs px-2 py-1">
            <span class="text-[0.625rem] text-water shrink-0">Lv5</span>
            <span class="text-xs text-water shrink-0">{{ PERK_NAMES[skill.perk5] }}</span>
            <span class="text-[0.625rem] text-muted min-w-0 flex-1">{{ PERK_DESCS[skill.perk5] }}</span>
            <button type="button" class="inline-flex shrink-0 items-center gap-1 rounded-xs border border-warning/30 px-1.5 py-0.5 text-[0.625rem] text-warning hover:bg-warning/10" @click="openPerkRespec(skill.type, 5)">
              <RotateCcw :size="10" />
              <span>重修</span>
            </button>
          </div>
          <div v-if="skill.perk10" class="flex items-center gap-1.5 border border-water rounded-xs px-2 py-1">
            <span class="text-[0.625rem] text-water shrink-0">Lv10</span>
            <span class="text-xs text-water shrink-0">{{ PERK_NAMES[skill.perk10] }}</span>
            <span class="text-[0.625rem] text-muted min-w-0 flex-1">{{ PERK_DESCS[skill.perk10] }}</span>
            <button type="button" class="inline-flex shrink-0 items-center gap-1 rounded-xs border border-warning/30 px-1.5 py-0.5 text-[0.625rem] text-warning hover:bg-warning/10" @click="openPerkRespec(skill.type, 10)">
              <RotateCcw :size="10" />
              <span>重修</span>
            </button>
          </div>
          <div v-if="skill.perk15" class="flex items-center gap-1.5 border border-accent rounded-xs px-2 py-1">
            <span class="text-[0.625rem] text-accent shrink-0">Lv15</span>
            <span class="text-xs text-accent shrink-0">{{ PERK_NAMES[skill.perk15] }}</span>
            <span class="text-[0.625rem] text-muted min-w-0 flex-1">{{ PERK_DESCS[skill.perk15] }}</span>
            <button type="button" class="inline-flex shrink-0 items-center gap-1 rounded-xs border border-warning/30 px-1.5 py-0.5 text-[0.625rem] text-warning hover:bg-warning/10" @click="openPerkRespec(skill.type, 15)">
              <RotateCcw :size="10" />
              <span>重修</span>
            </button>
          </div>
          <div v-if="skill.perk20" class="flex items-center gap-1.5 border border-accent rounded-xs px-2 py-1">
            <span class="text-[0.625rem] text-accent shrink-0">Lv20</span>
            <span class="text-xs text-accent shrink-0">{{ PERK_NAMES[skill.perk20] }}</span>
            <span class="text-[0.625rem] text-muted min-w-0 flex-1">{{ PERK_DESCS[skill.perk20] }}</span>
            <button type="button" class="inline-flex shrink-0 items-center gap-1 rounded-xs border border-warning/30 px-1.5 py-0.5 text-[0.625rem] text-warning hover:bg-warning/10" @click="openPerkRespec(skill.type, 20)">
              <RotateCcw :size="10" />
              <span>重修</span>
            </button>
          </div>
        </div>
        <p v-else-if="skill.level < 5" class="text-[0.625rem] text-muted">Lv5 / Lv10 / Lv15 / Lv20 时可选择专精天赋</p>
        <p v-else class="text-[0.625rem] text-muted">升级到 Lv{{ !skill.perk5 ? 5 : !skill.perk10 ? 10 : !skill.perk15 ? 15 : 20 }} 后可选择天赋</p>

        <div v-if="skill.level >= 20" class="border border-accent/20 rounded-xs px-2 py-2 mt-2 bg-accent/5">
          <div class="flex items-center justify-between gap-2 mb-1.5">
            <div class="flex items-center gap-1.5">
              <Sparkles :size="12" class="text-accent" />
              <span class="text-xs text-accent">后20级精研</span>
            </div>
            <span class="text-[0.625rem] text-accent">通用精通点 {{ skillStore.masteryPool.points }}</span>
          </div>
          <div class="bg-bg rounded-xs h-1.5 border border-accent/10">
            <div class="h-full bg-accent rounded-xs transition-all" :style="{ width: masteryPercent(skill.type) + '%' }" />
          </div>
          <p class="text-[0.625rem] text-muted mt-1">
            {{ skillStore.getSkillMasteryProgress(skill.type)?.current ?? 0 }}/{{ skillStore.getSkillMasteryProgress(skill.type)?.required ?? skillStore.skillMasteryExpPerPoint }}
          </p>

          <div class="space-y-1 mt-2">
            <div v-for="node in skillStore.getSkillMasteryNodes(skill.type)" :key="node.id" class="border border-accent/10 rounded-xs px-2 py-1.5 bg-bg/20">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-xs" :class="skillStore.hasSkillMasteryNode(node.id) ? 'text-success' : 'text-text'">{{ node.label }}</p>
                  <p class="text-[0.625rem] text-muted mt-0.5 leading-relaxed">{{ node.summary }}</p>
                  <p class="text-[0.625rem] text-muted/80 mt-0.5">费用 {{ node.cost }} 通用点 · 已接入：{{ SKILL_MASTERY_NODE_SURFACES[node.id] }}</p>
                </div>
                <span v-if="skillStore.hasSkillMasteryNode(node.id)" class="inline-flex shrink-0 items-center gap-1 text-[0.625rem] text-success">
                  <CheckCircle2 :size="12" />
                  已解锁
                </span>
                <button
                  v-else
                  class="inline-flex shrink-0 items-center gap-1 rounded-xs border px-2 py-1 text-[0.625rem] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  :class="skillStore.canUnlockSkillMasteryNode(skill.type, node.id) ? 'border-accent/40 text-accent hover:bg-accent/10' : 'border-accent/10 text-muted'"
                  :disabled="!skillStore.canUnlockSkillMasteryNode(skill.type, node.id)"
                  @click="skillStore.unlockSkillMasteryNode(skill.type, node.id)"
                >
                  <Unlock :size="12" />
                  <span>解锁</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="game-panel desktop-adaptive-span-all" data-testid="skill-mastery-summary">
        <div class="flex items-center justify-between mb-2">
          <div>
            <p class="text-sm text-accent">终局精通</p>
            <p class="text-[0.625rem] text-muted mt-0.5">把五系技能练满后，开始解锁真正跨系统的长期成长。</p>
          </div>
          <span class="text-xs text-accent">通用精通点 {{ skillStore.masteryPool.points }}</span>
        </div>

        <div class="border border-accent/20 rounded-xs px-2 py-2 mb-2">
          <div class="flex items-center justify-between gap-2 mb-1.5">
            <span class="text-[0.625rem] text-muted">通用精通池</span>
            <span class="text-[0.625rem] text-accent">{{ skillStore.masteryPool.exp }}/{{ skillStore.masteryPool.expPerPoint }}</span>
          </div>
          <div class="bg-bg rounded-xs h-1.5 border border-accent/10">
            <div class="h-full bg-accent rounded-xs transition-all" :style="{ width: masteryPoolPercent + '%' }" />
          </div>
        </div>

        <div class="border border-accent/20 rounded-xs px-2 py-2 mb-2">
          <p class="text-[0.625rem] text-muted mb-1">主技能精通 · 里程碑 {{ skillStore.masteryPoints }}</p>
          <div class="space-y-1">
            <div v-for="entry in skillStore.primaryMasteries" :key="entry.id" class="border border-accent/10 rounded-xs px-2 py-1.5">
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs" :class="entry.unlocked ? 'text-accent' : 'text-text'">{{ entry.label }}</p>
                <span class="text-[0.625rem]" :class="entry.unlocked ? 'text-success' : 'text-muted'">
                  {{ entry.unlocked ? '已解锁' : `Lv.${entry.level}/${entry.requirementLevel}` }}
                </span>
              </div>
              <p class="text-[0.625rem] text-muted mt-0.5">{{ entry.rewardSummary }}</p>
              <p class="text-[0.625rem] text-muted/80 mt-0.5">{{ entry.flavor }}</p>
            </div>
          </div>
        </div>

        <div class="border border-accent/20 rounded-xs px-2 py-2">
          <p class="text-[0.625rem] text-muted mb-1">混合精通</p>
          <div class="space-y-1">
            <div v-for="entry in skillStore.hybridMasteries" :key="entry.id" class="border border-accent/10 rounded-xs px-2 py-1.5">
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs" :class="entry.unlocked ? 'text-accent' : 'text-text'">{{ entry.label }}</p>
                <span class="text-[0.625rem]" :class="entry.unlocked ? 'text-success' : 'text-muted'">{{ entry.unlocked ? '已解锁' : '未完成' }}</span>
              </div>
              <p class="text-[0.625rem] text-muted mt-0.5">{{ entry.rewardSummary }}</p>
              <p class="text-[0.625rem] text-muted/80 mt-0.5">{{ entry.flavor }}</p>
              <p class="text-[0.625rem] text-muted mt-1">{{ entry.progressLines.join(' · ') }}</p>
            </div>
          </div>
        </div>

        <div class="border border-accent/20 rounded-xs px-2 py-2 mt-2">
          <p class="text-[0.625rem] text-muted mb-1">功能性精通奖励</p>
          <div class="space-y-1">
            <div v-for="reward in skillStore.masteryRewards" :key="reward.id" class="border border-accent/10 rounded-xs px-2 py-1.5">
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs" :class="reward.unlocked ? 'text-accent' : 'text-text'">{{ reward.label }}</p>
                <span class="text-[0.625rem]" :class="reward.unlocked ? 'text-success' : 'text-muted'">{{ reward.unlocked ? '已解锁' : '待解锁' }}</span>
              </div>
              <p class="text-[0.625rem] text-muted mt-0.5">{{ reward.summary }}</p>
              <p class="text-[0.625rem] text-muted/80 mt-0.5">挂接页：{{ reward.panelHint }}</p>
            </div>
          </div>
          <div v-if="skillStore.dailyBlessingPreview" class="border border-accent/10 rounded-xs px-2 py-2 mt-2 bg-accent/5">
            <p class="text-[0.625rem] text-muted">今日祝福预告</p>
            <p class="text-xs text-accent mt-0.5">{{ skillStore.dailyBlessingPreview.label }}</p>
            <p class="text-[0.625rem] text-muted mt-0.5">{{ skillStore.dailyBlessingPreview.sourceLabel }} · {{ skillStore.dailyBlessingPreview.sourceSummary }}</p>
            <p class="text-[0.625rem] text-muted mt-0.5">{{ skillStore.dailyBlessingPreview.summary }}</p>
          </div>
        </div>
      </div>
    </div>

    <Transition name="panel-fade">
      <div v-if="pendingRespec && respecPreview" class="game-modal-overlay fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" @click.self="closePerkRespec">
        <div class="game-panel max-w-sm w-full relative">
          <button type="button" class="absolute right-2 top-2 text-muted hover:text-text" aria-label="关闭" @click="closePerkRespec">
            <X :size="14" />
          </button>
          <div class="pr-6">
            <p class="text-sm text-warning">重修专精</p>
            <p class="text-xs text-muted mt-1">{{ respecSkillLabel }} Lv{{ pendingRespec.level }} 起的专精将重新选择。</p>
          </div>

          <div class="border border-warning/20 rounded-xs bg-warning/5 px-2 py-2 mt-3 space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <span class="text-[0.625rem] text-muted">清空层级</span>
              <span class="text-xs text-warning">{{ respecAffectedLevelLabel }}</span>
            </div>
            <div class="flex items-center justify-between gap-2">
              <span class="text-[0.625rem] text-muted">花费</span>
              <span class="text-xs text-warning">{{ respecPreview.costMoney }} 文</span>
            </div>
            <div class="flex items-center justify-between gap-2">
              <span class="text-[0.625rem] text-muted">本季限制</span>
              <span class="text-xs" :class="respecPreview.usedThisSeason ? 'text-danger' : 'text-success'">
                {{ respecPreview.usedThisSeason ? '已重修过' : '可重修' }}
              </span>
            </div>
          </div>

          <p class="text-[0.625rem] text-muted leading-5 mt-2">
            重修会清空所选层级及其下游分支，不返还已获得收益；确认后会立刻打开天赋选择。
          </p>
          <p v-if="respecPreview.reason" class="text-[0.625rem] text-danger leading-5 mt-2">{{ respecPreview.reason }}</p>

          <div class="flex justify-end gap-2 mt-3">
            <button type="button" class="rounded-xs border border-accent/20 px-2 py-1 text-xs text-muted hover:bg-accent/5" @click="closePerkRespec">取消</button>
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-xs border px-2 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              :class="respecPreview.canRespec ? 'border-warning/40 text-warning hover:bg-warning/10' : 'border-accent/10 text-muted'"
              :disabled="!respecPreview.canRespec"
              @click="confirmPerkRespec"
            >
              <RotateCcw :size="12" />
              <span>确认重修</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref, type Component } from 'vue'
  import { Star, Wheat, TreePine, Fish, Pickaxe, Sword, Sparkles, Unlock, CheckCircle2, RotateCcw, X } from 'lucide-vue-next'
  import { navigateToPanel } from '@/composables/useNavigation'
  import { addLog } from '@/composables/useGameLog'
  import { requestPerkSelection } from '@/composables/useDialogs'
  import { useSkillStore } from '@/stores/useSkillStore'
  import type { SkillType, SkillPerk5, SkillPerk10, SkillPerk15, SkillPerk20, SkillPerkLevel, SkillMasteryNodeId } from '@/types'

  const skillStore = useSkillStore()
  const pendingRespec = ref<{ skillType: SkillType; level: SkillPerkLevel } | null>(null)

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

  const SKILL_MASTERY_NODE_SURFACES: Record<SkillMasteryNodeId, string> = {
    farming_batch_irrigation: '农田一键浇水',
    farming_festival_supply: '节庆日出货箱',
    farming_processing_flow: '工坊加工耗时',
    farming_seed_recovery: '作物收获返种',
    farming_order_deed: '任务页作物订单',
    farming_soil_calendar: '轮作提示预留',
    farming_storage_plan: '仓储整理预留',
    foraging_rare_signal: '采集页稀有物',
    foraging_journey_scout: '行旅构筑侦察',
    foraging_weather_window: '采集环境窗口',
    foraging_mountain_hunch: '采集页稀有提示',
    foraging_herb_sample: '采集见闻账本',
    foraging_route_cache: '路线藏点预留',
    foraging_specimen_map: '博物馆样本预留',
    fishing_tide_marker: '钓鱼页传说鱼提示',
    fishing_pond_link: '鱼塘每日产出',
    fishing_legend_weight: '传说鱼经验结算',
    fishing_pond_pedigree: '鱼塘详情谱系',
    fishing_tide_notebook: '钓鱼上钩权重',
    fishing_bait_journal: '鱼饵提示预留',
    fishing_contest_prep: '周赛备钓预留',
    mining_floor_intel: '矿洞层位提示',
    mining_bomb_efficiency: '矿洞炸弹返还',
    mining_rare_transmute: '手动采矿奖励',
    mining_vein_marker: '矿洞进层提示',
    mining_stabilized_blasting: '矿洞空爆返还',
    mining_safety_rope: '深层撤退预留',
    mining_smelter_notes: '冶炼排程预留',
    combat_boss_pressure: 'Boss 战奖励',
    combat_escort_margin: '行旅构筑压险',
    combat_trinket_tuning: '饰品效果汇总',
    combat_boss_dossier: 'Boss 战开场日志',
    combat_escort_discipline: '远征失败结算',
    combat_guard_form: '防御提示预留',
    combat_supply_route: '补给检查预留'
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
    botanist: '采集物品质至少为优质',
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
    acrobat: '25%概率闪避怪物反击',
    tank: '防御时伤害减免70%',
    grandmaster_farmer: '作物售价额外+20%，品质大幅提升',
    estate_owner: '作物售价+20%，加工品售价+40%，并保留 20% 双倍收成机会',
    livestock_baron: '动物产品售价+30%',
    animal_whisperer: '动物每天自动+1心',
    ancient_botanist: '采集物50%概率为极品，否则优质；植物学家路线提升至75%',
    grand_alchemist: '食物恢复+100%，可叠加效果',
    forest_guardian: '采集时必定获得2份额外木材',
    wilderness_expert: '每次采集额外+2物品',
    legendary_angler: '传说鱼出现率再大幅提升',
    aquatic_merchant: '鱼类售价再+30%',
    sea_captain: '钓鱼体力消耗-50%',
    bait_master: '鱼饵效果再翻倍',
    vein_seeker: '矿石30%概率翻倍',
    master_smith: '金属矿石售价+80%，冶炼速度+50%',
    deep_excavator: '炸弹50%概率不消耗',
    gem_collector: '击败怪物必定掉落宝石',
    sword_saint: '生命上限+80，攻击伤害+35%，暴击率+15%，20%概率追击',
    berserker: '生命上限+80，攻击伤害+55%，击杀回复10%生命',
    phantom_blade: '闪避率40%，生命上限+40，防御后恢复15HP',
    iron_fortress: '防御时伤害减免85%，生命上限+40，防御后恢复15HP',
    deity_of_harvest: '所有作物售价+50%，品质必定神圣',
    land_god: '所有农产品产量+100%',
    beast_sovereign: '动物产品数量×2，动物产品售价+50%',
    nature_bond: '动物永远不会不满，产出品质神圣',
    world_tree: '采集物必定极品，采集量×3',
    philosopher: '食物恢复效果+200%，料理增益不会因日切而清空',
    forest_spirit: '采集时必定获得3份木材及稀有材料',
    primal_tracker: '每次采集额外+4物品',
    fish_god: '传说鱼窗口内出现率大幅提升，钓鱼体力消耗清零',
    ocean_trader: '所有鱼售价+100%',
    sea_sovereign: '钓鱼体力消耗清零，钓到的鱼品质至少为精品',
    lure_deity: '鱼饵效果×8，且不消耗鱼饵',
    earth_pulse: '矿石50%概率×3产出',
    forge_god: '所有矿石售价+120%，冶炼无需燃料',
    abyss_miner: '每层首次炸弹必定返还，之后60%概率返还',
    gem_emperor: '所有宝石必定掉落，售价+100%',
    war_god: '生命上限+150，攻击伤害+80%，暴击率+25%，30%概率强力追击',
    slaughter_king: '生命上限+150，攻击伤害×2，击杀回复20%生命',
    shadow_sovereign: '闪避率80%，生命上限+80，防御时伤害减免95%，防御后恢复15%生命',
    indestructible: '生命上限+80，防御时伤害减免95%，防御后恢复15%生命'
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
    livestock_baron: '牲畜大亨',
    animal_whisperer: '动物语者',
    ancient_botanist: '远古植物学家',
    grand_alchemist: '大炼金师',
    forest_guardian: '森林守护者',
    wilderness_expert: '荒野专家',
    legendary_angler: '传说垂钓者',
    aquatic_merchant: '水产巨商',
    sea_captain: '海洋船长',
    bait_master: '诱饵大师',
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
    ocean_trader: '海洋贸易商',
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

  const masteryPercent = (type: SkillType): number => {
    const info = skillStore.getSkillMasteryProgress(type)
    if (!info) return 0
    return Math.min(100, Math.round((info.current / info.required) * 100))
  }

  const masteryPoolPercent = computed(() =>
    Math.min(100, Math.round((skillStore.masteryPool.exp / skillStore.masteryPool.expPerPoint) * 100))
  )

  const respecPreview = computed(() =>
    pendingRespec.value
      ? skillStore.getSkillPerkRespecPreview(pendingRespec.value.skillType, pendingRespec.value.level)
      : null
  )

  const respecSkillLabel = computed(() =>
    pendingRespec.value ? SKILL_NAMES[pendingRespec.value.skillType] : ''
  )

  const respecAffectedLevelLabel = computed(() =>
    respecPreview.value?.affectedLevels.length
      ? respecPreview.value.affectedLevels.map(level => `Lv${level}`).join(' / ')
      : '无'
  )

  const openPerkRespec = (skillType: SkillType, level: SkillPerkLevel) => {
    pendingRespec.value = { skillType, level }
  }

  const closePerkRespec = () => {
    pendingRespec.value = null
  }

  const confirmPerkRespec = () => {
    const request = pendingRespec.value
    if (!request) return
    const skillLabel = SKILL_NAMES[request.skillType]
    const result = skillStore.respecPerks(request.skillType, request.level)
    closePerkRespec()
    addLog(`【技能】${skillLabel}${result.message}`)
    if (result.success && result.nextPendingLevel) {
      requestPerkSelection(request.skillType, result.nextPendingLevel)
    }
  }
</script>
