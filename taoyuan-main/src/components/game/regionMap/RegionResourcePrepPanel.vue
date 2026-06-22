<script setup lang="ts">
  import ItemIcon from '@/components/game/ItemIcon.vue'
  import { getItemById } from '@/data/items'

  type Fn = (...args: any[]) => any

  defineProps<{
    isCompactMobile: boolean
    mobileLedgerExpanded: boolean
    resourceLedgerEntries: any[]
    resourceFeatureEnabled: boolean
    visibleJourneyCraftingEntries: any[]
    visibleJourneyAwakeningEntries: any[]
    visibleJourneyCampModuleEntries: any[]
    visibleJourneyRoutePermitEntries: any[]
    getJourneyRecipeStatus: Fn
    formatJourneyRecipeMaterials: Fn
    canUnlockJourneyAwakening: Fn
    canUnlockJourneyCampModule: Fn
    canUnlockJourneyRoutePermit: Fn
    getResourceFamilyLabel: Fn
  }>()

  const emit = defineEmits<{
    'update:mobileLedgerExpanded': [value: boolean]
    navigate: [panelKey: any]
    turnIn: [familyId: any]
    craft: [recipeId: string]
    unlockAwakening: [awakeningId: string]
    unlockCampModule: [moduleId: string]
    unlockRoutePermit: [permitId: string]
  }>()
</script>

<template>
  <div class="space-y-3">
    <div class="border border-accent/20 rounded-xs p-3">
            <div class="flex items-start justify-between gap-3 mb-2">
              <div class="min-w-0">
                <p class="text-xs text-muted">资源家族总览</p>
                <p class="text-[0.625rem] text-muted mt-1 leading-4">把远征回流带来的库存集中看，避免首屏堆太多资源说明。</p>
              </div>
              <button
                v-if="isCompactMobile"
                class="border border-accent/20 rounded-xs px-2 py-1 text-[0.625rem] text-accent hover:bg-accent/5 shrink-0"
                @click="emit('update:mobileLedgerExpanded', !mobileLedgerExpanded)"
              >
                {{ mobileLedgerExpanded ? '收起' : `展开 ${resourceLedgerEntries.length} 组` }}
              </button>
            </div>
            <div v-if="!isCompactMobile || mobileLedgerExpanded" class="space-y-2">
              <div v-for="entry in resourceLedgerEntries" :key="entry.id" class="border border-accent/10 rounded-xs px-3 py-2">
                <div class="flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-xs text-accent">{{ entry.label }}</p>
                    <p class="text-[0.625rem] text-muted mt-0.5 leading-4">{{ entry.description }}</p>
                  </div>
                  <span class="text-xs shrink-0">{{ entry.quantity }}</span>
                </div>
                <div class="flex flex-wrap gap-2 mt-2">
                  <button
                    class="border border-success/20 rounded-xs px-2 py-1 text-[0.625rem] text-success hover:bg-success/5"
                    :disabled="entry.quantity <= 0 || !resourceFeatureEnabled"
                    @click="emit('turnIn', entry.id)"
                  >
                    交付 1 份
                  </button>
                </div>
              </div>
    
              <div v-if="visibleJourneyCraftingEntries.length > 0" class="border border-accent/10 rounded-xs px-3 py-3 bg-bg/40">
                <div class="flex items-center justify-between gap-3 mb-2">
                  <div class="min-w-0">
                    <p class="text-xs text-accent">旅程锻造</p>
                    <p class="text-[0.625rem] text-muted mt-1 leading-4">区域素材与首领解锁会在这里汇总成旅装、武器与套装件。</p>
                  </div>
                  <button class="border border-accent/20 rounded-xs px-2 py-1 text-[0.625rem] text-accent hover:bg-accent/5" @click="emit('navigate', 'inventory')">
                    去背包
                  </button>
                </div>
                <div class="space-y-2">
                  <div v-for="recipe in visibleJourneyCraftingEntries" :key="recipe.id" class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/60">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <p class="text-xs text-accent">{{ recipe.name }}</p>
                        <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ recipe.description }}</p>
                        <div class="mt-1 flex flex-wrap gap-1.5 text-[0.625rem] text-muted">
                          <span class="shrink-0">材料：</span>
                          <span v-for="item in recipe.requiredItems" :key="`${recipe.id}-${item.itemId}`" class="inline-flex min-w-0 items-center gap-1">
                            <ItemIcon :item="getItemById(item.itemId)" size="xs" :show-badge="false" />
                            <span class="truncate">{{ getItemById(item.itemId)?.name ?? item.itemId }} x{{ item.quantity }}</span>
                          </span>
                        </div>
                        <p class="text-[0.625rem] text-muted mt-1 leading-4">铜钱：{{ recipe.requiredMoney }}</p>
                        <p v-if="!getJourneyRecipeStatus(recipe.id).ok" class="text-[0.625rem] text-warning mt-1 leading-4">
                          {{ getJourneyRecipeStatus(recipe.id).reason }}
                        </p>
                      </div>
                      <span class="text-[0.625rem] shrink-0" :class="recipe.crafted ? 'text-success' : 'text-muted'">
                        {{ recipe.crafted ? '已完成' : '可锻造' }}
                      </span>
                    </div>
                    <div class="flex flex-wrap gap-2 mt-2">
                      <button
                        class="border border-success/20 rounded-xs px-2 py-1 text-[0.625rem] text-success hover:bg-success/5"
                        :disabled="recipe.crafted || !getJourneyRecipeStatus(recipe.id).ok"
                        @click="emit('craft', recipe.id)"
                      >
                        {{ recipe.crafted ? '已锻造' : '执行锻造' }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
    
              <div v-if="visibleJourneyAwakeningEntries.length > 0" class="border border-accent/10 rounded-xs px-3 py-3 bg-bg/40">
                <div class="flex items-center justify-between gap-3 mb-2">
                  <div class="min-w-0">
                    <p class="text-xs text-accent">技能觉醒</p>
                    <p class="text-[0.625rem] text-muted mt-1 leading-4">区域账本会反哺现有五技能，不额外切出第六基础技能。</p>
                  </div>
                  <button class="border border-accent/20 rounded-xs px-2 py-1 text-[0.625rem] text-accent hover:bg-accent/5" @click="emit('navigate', 'skills')">
                    去技能
                  </button>
                </div>
                <div class="space-y-2">
                  <div v-for="entry in visibleJourneyAwakeningEntries" :key="entry.id" class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/60">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <p class="text-xs text-accent">{{ entry.name }}</p>
                        <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ entry.description }}</p>
                        <p class="text-[0.625rem] text-muted mt-1 leading-4">需要 {{ entry.requiredFamilyAmount }} 份{{ getResourceFamilyLabel(entry.requiredFamilyId) }} / {{ entry.requiredRouteCompletions }} 条区域路线。</p>
                        <p v-if="!canUnlockJourneyAwakening(entry).ok" class="text-[0.625rem] text-warning mt-1 leading-4">
                          {{ canUnlockJourneyAwakening(entry).reason }}
                        </p>
                      </div>
                      <span class="text-[0.625rem] shrink-0" :class="entry.unlocked ? 'text-success' : 'text-muted'">
                        {{ entry.unlocked ? '已激活' : '待激活' }}
                      </span>
                    </div>
                    <div class="flex flex-wrap gap-2 mt-2">
                      <button
                        class="border border-success/20 rounded-xs px-2 py-1 text-[0.625rem] text-success hover:bg-success/5"
                        :disabled="entry.unlocked || !canUnlockJourneyAwakening(entry).ok"
                        @click="emit('unlockAwakening', entry.id)"
                      >
                        {{ entry.unlocked ? '已激活' : '激活觉醒' }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
    
              <div v-if="visibleJourneyCampModuleEntries.length > 0 || visibleJourneyRoutePermitEntries.length > 0" class="grid grid-cols-1 xl:grid-cols-2 gap-3">
                <div v-if="visibleJourneyCampModuleEntries.length > 0" class="border border-accent/10 rounded-xs px-3 py-3 bg-bg/40">
                  <p class="text-xs text-accent">营地模组</p>
                  <p class="text-[0.625rem] text-muted mt-1 mb-2 leading-4">把区域账本继续沉淀成前线模组，直接影响扎营与长线推进。</p>
                  <div class="space-y-2">
                    <div v-for="entry in visibleJourneyCampModuleEntries" :key="entry.id" class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/60">
                      <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                          <p class="text-xs text-accent">{{ entry.name }}</p>
                          <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ entry.description }}</p>
                          <p class="text-[0.625rem] text-muted mt-1 leading-4">需要 {{ entry.requiredFamilyAmount }} 份{{ getResourceFamilyLabel(entry.requiredFamilyId) }}</p>
                          <p v-if="!canUnlockJourneyCampModule(entry).ok" class="text-[0.625rem] text-warning mt-1 leading-4">
                            {{ canUnlockJourneyCampModule(entry).reason }}
                          </p>
                        </div>
                        <span class="text-[0.625rem] shrink-0" :class="entry.level > 0 ? 'text-success' : 'text-muted'">
                          {{ entry.level > 0 ? `Lv.${entry.level}` : '未安装' }}
                        </span>
                      </div>
                      <div class="flex flex-wrap gap-2 mt-2">
                        <button
                          class="border border-success/20 rounded-xs px-2 py-1 text-[0.625rem] text-success hover:bg-success/5"
                          :disabled="entry.level > 0 || !canUnlockJourneyCampModule(entry).ok"
                          @click="emit('unlockCampModule', entry.id)"
                        >
                          {{ entry.level > 0 ? '已安装' : '安装模组' }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
    
                <div v-if="visibleJourneyRoutePermitEntries.length > 0" class="border border-accent/10 rounded-xs px-3 py-3 bg-bg/40">
                  <p class="text-xs text-accent">许可证与捷径精通</p>
                  <p class="text-[0.625rem] text-muted mt-1 mb-2 leading-4">把区域账本转成路线许可证，强化后续熟路与路线掌控。</p>
                  <div class="space-y-2">
                    <div v-for="entry in visibleJourneyRoutePermitEntries" :key="entry.id" class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/60">
                      <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                          <p class="text-xs text-accent">{{ entry.name }}</p>
                          <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ entry.description }}</p>
                          <p class="text-[0.625rem] text-muted mt-1 leading-4">需要 {{ entry.requiredFamilyAmount }} 份{{ getResourceFamilyLabel(entry.requiredFamilyId) }}</p>
                          <p v-if="!canUnlockJourneyRoutePermit(entry).ok" class="text-[0.625rem] text-warning mt-1 leading-4">
                            {{ canUnlockJourneyRoutePermit(entry).reason }}
                          </p>
                        </div>
                        <span class="text-[0.625rem] shrink-0" :class="entry.level > 0 ? 'text-success' : 'text-muted'">
                          {{ entry.level > 0 ? `Lv.${entry.level}` : '未签发' }}
                        </span>
                      </div>
                      <div class="flex flex-wrap gap-2 mt-2">
                        <button
                          class="border border-success/20 rounded-xs px-2 py-1 text-[0.625rem] text-success hover:bg-success/5"
                          :disabled="entry.level > 0 || !canUnlockJourneyRoutePermit(entry).ok"
                          @click="emit('unlockRoutePermit', entry.id)"
                        >
                          {{ entry.level > 0 ? '已签发' : '签发许可证' }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
  </div>
</template>
