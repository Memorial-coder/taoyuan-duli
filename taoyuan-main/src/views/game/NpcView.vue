<template>
  <div>
    <!-- Tab 切换按钮 -->
    <h3 class="text-accent text-sm mb-3">桃源村</h3>

    <div class="flex space-x-1.5 mb-3">
      <Button
        class="flex-1 justify-center"
        :class="{ '!bg-accent !text-bg': activeTab === 'villager' }"
        :icon="Users"
        @click="activeTab = 'villager'"
      >
        村民
      </Button>
      <Button
        class="flex-1 justify-center"
        :class="{ '!bg-accent !text-bg': activeTab === 'spirit' }"
        :icon="Sparkles"
        @click="activeTab = 'spirit'"
      >
        仙灵
      </Button>
    </div>

    <!-- 村民 Tab -->
    <div v-if="activeTab === 'villager'">
      <p v-if="tutorialHint" class="tutorial-hint mb-2">{{ tutorialHint }}</p>
      <GuidanceDigestPanel surface-id="npc" title="陪伴关系引导" />
      <QaGovernancePanel page-id="npc" title="陪伴治理总览" />

      <div class="border border-accent/20 rounded-xs p-2 mb-3 bg-accent/5">
        <div class="flex items-center justify-between gap-2">
          <div>
            <p class="text-xs text-accent">陪伴总览</p>
            <p class="text-[10px] text-muted mt-0.5">婚后分工、家庭心愿与挚友协作已经接入统一关系线入口。</p>
          </div>
          <span class="text-[10px] text-muted whitespace-nowrap">{{ relationshipDebugSnapshot.contentTier }}</span>
        </div>
        <div class="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-[10px]">
          <div class="flex items-center justify-between">
            <span class="text-muted">当前家庭心愿</span>
            <span class="text-accent">{{ activeFamilyWishDef?.title ?? '未激活' }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted">婚后分工数</span>
            <span>{{ relationshipDebugSnapshot.householdAssignments.length }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted">挚友项目数</span>
            <span>{{ relationshipDebugSnapshot.zhijiCompanionProjects.length }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted">孩子数量</span>
            <span>{{ relationshipDebugSnapshot.childCount }}</span>
          </div>
        </div>
        <p class="text-[10px] text-muted mt-2 leading-4">
          {{
            activeFamilyWishDef
              ? `当前进度：${familyWishOverview.state.progress}/${Math.max(1, familyWishOverview.state.targetValue)}，建议围绕 ${activeFamilyWishDef.title} 安排本周陪伴节奏。`
              : '当前尚未激活家庭心愿；后续页面会优先围绕婚后分工、知己协作与孩子成长组织新一轮家庭目标。'
          }}
        </p>
        <div v-if="activeFamilyWishChain?.steps?.length" class="border border-accent/10 rounded-xs p-2 mt-2 bg-bg/10">
          <p class="text-[10px] text-muted mb-1">家庭事件链</p>
          <div v-for="step in activeFamilyWishChain.steps" :key="step.id" class="flex items-start justify-between gap-2 text-[10px] mt-1 first:mt-0">
            <div class="min-w-0">
              <p class="text-accent">{{ step.title }}</p>
              <p class="text-muted leading-4 mt-0.5">{{ step.summary }}</p>
            </div>
            <span :class="step.status === 'completed' ? 'text-success' : step.status === 'active' ? 'text-warning' : 'text-muted'">
              {{ step.status === 'completed' ? '已完成' : step.status === 'active' ? '当前步骤' : '待推进' }}
            </span>
          </div>
        </div>
        <div v-if="activeZhijiProjectChain?.steps?.length" class="border border-accent/10 rounded-xs p-2 mt-2">
          <p class="text-[10px] text-muted mb-1">知己协作链</p>
          <p class="text-[10px] text-accent">{{ activeZhijiProjectChain.def.label }} · {{ activeZhijiProjectChain.progressLabel }}</p>
          <div v-for="step in activeZhijiProjectChain.steps" :key="step.id" class="flex items-start justify-between gap-2 text-[10px] mt-1 first:mt-0">
            <div class="min-w-0">
              <p class="text-accent">{{ step.title }}</p>
              <p class="text-muted leading-4 mt-0.5">{{ step.summary }}</p>
            </div>
            <span :class="step.status === 'completed' ? 'text-success' : step.status === 'active' ? 'text-warning' : 'text-muted'">
              {{ step.status === 'completed' ? '已完成' : step.status === 'active' ? '当前步骤' : '待推进' }}
            </span>
          </div>
        </div>
      </div>

      <!-- NPC 网格：移动端紧凑，桌面端详细 -->
      <div class="grid grid-cols-4 md:grid-cols-3 gap-1.5 md:gap-2">
        <div
          v-for="npc in NPCS"
          :key="npc.id"
          class="border border-accent/20 rounded-xs p-1.5 md:p-2 transition-colors"
          :class="[npcAvailable(npc.id) ? 'cursor-pointer hover:bg-accent/5' : 'opacity-50', 'text-center md:text-left']"
          @click="handleSelectNpc(npc.id)"
        >
          <!-- 移动端：紧凑布局 -->
          <div class="md:hidden">
            <p class="text-xs truncate" :class="levelColor(npcStore.getFriendshipLevel(npc.id))">
              {{ npc.name }}
            </p>
            <p class="text-[10px] text-muted truncate">
              {{ npcStore.getRelationshipStageText(npc.id) }} · {{ npcStore.getScheduleStatus(npc.id).location }}
            </p>
            <p class="text-[10px] flex items-center justify-center" :class="heartCount(npc.id) > 0 ? 'text-danger' : 'text-muted/30'">
              {{ heartCount(npc.id) }}
              <Heart :size="10" :fill="heartCount(npc.id) > 0 ? 'currentColor' : 'none'" />
              <span class="text-muted/50 ml-0.5">{{ npcStore.getNpcState(npc.id)?.friendship ?? 0 }}</span>
            </p>
            <div class="flex items-center justify-center space-x-1 mt-0.5 min-h-3.5">
              <MessageCircle :size="10" :class="npcStore.getNpcState(npc.id)?.talkedToday ? 'text-muted/20' : 'text-success'" />
              <Gift :size="10" :class="npcGiftClass(npc.id)" />
              <Heart v-if="npcStore.getNpcState(npc.id)?.married" :size="10" class="text-danger" />
              <Heart v-else-if="npcStore.getNpcState(npc.id)?.dating" :size="10" class="text-danger/50" />
              <Heart v-else-if="npcStore.getNpcState(npc.id)?.zhiji" :size="10" class="text-accent" />
              <Heart v-else-if="npc.marriageable" :size="10" class="text-muted/30" />
              <Cake v-if="npcStore.isBirthday(npc.id)" :size="10" class="text-danger" />
            </div>
          </div>
          <!-- 桌面端：显示更多信息 -->
          <div class="hidden md:block">
            <div class="flex items-center justify-between">
              <span class="text-xs" :class="levelColor(npcStore.getFriendshipLevel(npc.id))">
                {{ npc.name }}
                <span v-if="npcStore.getNpcState(npc.id)?.married" class="text-danger text-[10px] ml-0.5">[伴侣]</span>
                <span v-else-if="npcStore.getNpcState(npc.id)?.dating" class="text-danger/70 text-[10px] ml-0.5">[约会中]</span>
                <span v-else-if="npcStore.getNpcState(npc.id)?.zhiji" class="text-accent text-[10px] ml-0.5">[知己]</span>
              </span>
              <div class="flex items-center space-x-1">
                <MessageCircle :size="10" :class="npcStore.getNpcState(npc.id)?.talkedToday ? 'text-muted/20' : 'text-success'" />
                <Gift :size="10" :class="npcGiftClass(npc.id)" />
                <span v-if="npc.marriageable" class="text-danger/50">
                  <Heart :size="10" />
                </span>
                <Cake v-if="npcStore.isBirthday(npc.id)" :size="10" class="text-danger" />
              </div>
            </div>
            <p class="text-[10px] text-muted truncate">{{ npc.role }}</p>
            <p class="text-[10px] text-muted/70 truncate">
              {{ npcStore.getRelationshipStageText(npc.id) }} · {{ npcStore.getScheduleStatus(npc.id).location }}
            </p>
            <div class="flex items-center justify-between mt-0.5">
              <div class="flex items-center space-x-px">
                <Heart
                  v-for="h in 10"
                  :key="h"
                  :size="10"
                  class="flex-shrink-0"
                  :class="(npcStore.getNpcState(npc.id)?.friendship ?? 0) >= h * 250 ? 'text-danger' : 'text-muted/30'"
                  :fill="(npcStore.getNpcState(npc.id)?.friendship ?? 0) >= h * 250 ? 'currentColor' : 'none'"
                />
              </div>
              <span class="text-[10px] text-muted/50">{{ npcStore.getNpcState(npc.id)?.friendship ?? 0 }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="border border-accent/20 rounded-xs p-2 mt-3">
        <div class="flex items-center justify-between mb-2">
          <div>
            <p class="text-xs text-accent">村庄建设</p>
            <p class="text-[10px] text-muted mt-0.5">把获得的生活线索真正落成项目，让桃源村逐步有长期建设感。</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] text-muted">已完成 {{ villageProjectStore.villageProjectLevel }}/{{ villageProjectStore.projects.length }}</span>
            <Button class="justify-center !px-2 !py-1" @click="void router.push({ name: 'village-projects' })">建设总览</Button>
          </div>
        </div>

        <div class="flex flex-col space-y-1.5">
          <div v-for="project in villageProjectStore.projects" :key="project.id" class="border rounded-xs p-2" :class="project.completed ? 'border-success/30 bg-success/5' : 'border-accent/10'">
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-xs" :class="project.completed ? 'text-success' : 'text-accent'">{{ project.name }}</p>
                <p class="text-[10px] text-muted mt-0.5 leading-4">{{ project.description }}</p>
              </div>
              <span class="text-[10px] whitespace-nowrap" :class="project.completed ? 'text-success' : project.clueUnlocked ? 'text-accent' : 'text-muted'">
                {{ project.completed ? '已完成' : project.clueUnlocked ? '可建设' : '待线索' }}
              </span>
            </div>

            <p class="text-[10px] text-success/90 mt-1 leading-4">效果：{{ project.benefitSummary }}</p>
            <p v-if="!project.clueUnlocked && project.requiredClueText" class="text-[10px] text-warning mt-1 leading-4">{{ project.requiredClueText }}</p>

            <div v-if="getVillageProjectRequirementProgress(project.id).length > 0" class="border border-accent/10 rounded-xs p-2 mt-2">
              <p class="text-[10px] text-muted mb-1">专项进度</p>
              <div
                v-for="requirement in getVillageProjectRequirementProgress(project.id)"
                :key="`${project.id}-${requirement.type}`"
                class="flex items-center justify-between text-[10px] mt-0.5"
              >
                <span class="text-muted">{{ requirement.displayLabel }}</span>
                <span :class="requirement.met ? 'text-success' : 'text-danger'">{{ requirement.current }}/{{ requirement.target }}</span>
              </div>
            </div>

            <div class="border border-accent/10 rounded-xs p-2 mt-2">
              <div class="flex items-center justify-between text-[10px]">
                <span class="text-muted">铜钱</span>
                <span :class="playerStore.money >= project.moneyCost ? 'text-success' : 'text-danger'">{{ playerStore.money }}/{{ project.moneyCost }}文</span>
              </div>
              <div v-for="mat in project.materials" :key="mat.itemId" class="flex items-center justify-between text-[10px] mt-0.5">
                <span class="text-muted">{{ getItemById(mat.itemId)?.name ?? mat.itemId }}</span>
                <span :class="getProjectItemCount(mat.itemId) >= mat.quantity ? 'text-success' : 'text-danger'">
                  {{ getProjectItemCount(mat.itemId) }}/{{ mat.quantity }}
                </span>
              </div>
            </div>

            <div v-if="project.completed && getVillageProjectMaintenanceSummary(project.id)" class="border border-accent/10 rounded-xs p-2 mt-2 bg-bg/10">
              <div class="flex items-center justify-between gap-2">
                <div>
                  <p class="text-[10px] text-accent">维护状态</p>
                  <p class="text-[10px] text-muted mt-0.5">
                    {{ getVillageProjectMaintenanceSummary(project.id)?.statusLabel }}
                    <span v-if="getVillageProjectMaintenanceSummary(project.id)?.state.nextDueDayTag">
                      · 下次维护日 {{ getVillageProjectMaintenanceSummary(project.id)?.state.nextDueDayTag }}
                    </span>
                  </p>
                </div>
                <span class="text-[10px]" :class="getVillageProjectMaintenanceSummary(project.id)?.active ? 'text-success' : getVillageProjectMaintenanceSummary(project.id)?.overdue ? 'text-warning' : 'text-muted'">
                  {{ getVillageProjectMaintenanceSummary(project.id)?.active ? '增益生效中' : getVillageProjectMaintenanceSummary(project.id)?.overdue ? '增益暂停' : '待启用' }}
                </span>
              </div>
              <p class="text-[10px] text-muted mt-1 leading-4">{{ getVillageProjectMaintenanceSummary(project.id)?.plan.effectSummary }}</p>
              <div class="flex items-center justify-between text-[10px] mt-1">
                <span class="text-muted">维护费</span>
                <span class="text-accent">{{ getVillageProjectMaintenanceSummary(project.id)?.plan.costMoney }}文 / {{ getVillageProjectMaintenanceSummary(project.id)?.plan.cycleDays }}天</span>
              </div>
              <div class="flex items-center justify-between text-[10px] mt-1">
                <span class="text-muted">自动续费</span>
                <Button class="!px-2 !py-1 justify-center" @click="handleToggleVillageProjectMaintenanceAutoRenew(project.id)">
                  {{ getVillageProjectMaintenanceSummary(project.id)?.state.autoRenew ? '已开启' : '未开启' }}
                </Button>
              </div>
              <div class="mt-2 flex justify-end">
                <Button
                  v-if="!getVillageProjectMaintenanceSummary(project.id)?.active"
                  class="justify-center"
                  :class="playerStore.money >= (getVillageProjectMaintenanceSummary(project.id)?.plan.costMoney ?? 0) ? '!bg-accent !text-bg' : ''"
                  :disabled="playerStore.money < (getVillageProjectMaintenanceSummary(project.id)?.plan.costMoney ?? 0)"
                  @click="handlePayVillageProjectMaintenance(project.id)"
                >
                  {{ getVillageProjectMaintenanceSummary(project.id)?.overdue ? '补缴维护' : '启用维护' }}
                </Button>
              </div>
            </div>

            <div class="mt-2 flex items-center justify-between gap-2">
              <p class="text-[10px] text-muted leading-4">{{ getVillageProjectHint(project.id) }}</p>
              <Button
                v-if="!project.completed"
                class="shrink-0 justify-center"
                :class="{ '!bg-accent !text-bg': villageProjectStore.canCompleteProject(project.id).ok }"
                :disabled="!villageProjectStore.canCompleteProject(project.id).ok"
                @click="handleCompleteVillageProject(project.id)"
              >
                建设
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 仙灵 Tab -->
    <div v-if="activeTab === 'spirit'">
      <div class="border border-accent/20 rounded-xs p-2 mb-3 bg-accent/5">
        <p class="text-xs text-accent mb-1">仙灵指引</p>
        <p class="text-[10px] text-muted/80 leading-4">
          仙灵通常按「传闻 → 惊鸿一瞥 → 初次相遇 → 愿意往来」推进。多留意对应的地点、时间、天气、技能等级和关键物品；
          显现后可通过互动、供奉、求缘、结缘逐步解锁能力与长期加成。
        </p>
      </div>

      <div class="border border-accent/20 rounded-xs p-2 mb-3">
        <div class="flex items-center justify-between gap-2">
          <div>
            <p class="text-xs text-accent">仙缘运营</p>
            <p class="text-[10px] text-muted mt-0.5">共鸣、祝福与结缘记忆会在统一周切换节点推进。</p>
          </div>
          <span class="text-[10px] text-muted">已结缘 {{ spiritBondOverview.bondedCount }}</span>
        </div>
        <div class="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-[10px]">
          <div class="flex items-center justify-between">
            <span class="text-muted">已显现仙灵</span>
            <span>{{ spiritBondOverview.revealedNpcCount }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted">待跟进传闻</span>
            <span>{{ spiritBondOverview.rumorNpcCount }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted">总共鸣点</span>
            <span class="text-accent">{{ spiritBondOverview.totalAffinity }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted">已解锁能力</span>
            <span>{{ spiritBondOverview.totalUnlockedAbilityCount }}</span>
          </div>
        </div>
        <div v-if="selectedSpiritBlessingSummary" class="border border-accent/10 rounded-xs p-2 mt-2">
          <div class="flex items-center justify-between text-[10px]">
            <span class="text-muted">当前选中仙灵</span>
            <span class="text-accent">{{ selectedSpiritBlessingSummary.bondTier }}</span>
          </div>
          <p class="text-[10px] text-muted mt-1 leading-4">
            当前祝福：{{ selectedSpiritBlessingSummary.activeBlessing?.label ?? '未启用' }}
          </p>
          <div class="flex flex-wrap gap-1 mt-1">
            <span
              v-for="blessing in selectedSpiritBlessings"
              :key="blessing.id"
              class="text-[10px] px-1 rounded-xs border border-accent/15 text-accent/80"
            >
              {{ blessing.label }}
            </span>
          </div>
        </div>
        <div v-if="selectedSpiritMemoryChain?.steps?.length" class="border border-accent/10 rounded-xs p-2 mt-2 bg-bg/10">
          <p class="text-[10px] text-muted mb-1">结缘记忆链</p>
          <p class="text-[10px] text-accent">{{ selectedSpiritMemoryChain.memoryReward.summary }} · {{ selectedSpiritMemoryChain.progressLabel }}</p>
          <div v-for="step in selectedSpiritMemoryChain.steps" :key="step.id" class="flex items-start justify-between gap-2 text-[10px] mt-1 first:mt-0">
            <div class="min-w-0">
              <p class="text-accent">{{ step.title }}</p>
              <p class="text-muted leading-4 mt-0.5">{{ step.summary }}</p>
            </div>
            <span :class="step.status === 'completed' ? 'text-success' : step.status === 'active' ? 'text-warning' : 'text-muted'">
              {{ step.status === 'completed' ? '已完成' : step.status === 'active' ? '当前步骤' : '待推进' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 已显现的仙灵 -->
      <template v-if="revealedHiddenNpcs.length > 0">
        <div class="grid grid-cols-4 md:grid-cols-3 gap-1.5 md:gap-2">
          <div
            v-for="npc in revealedHiddenNpcs"
            :key="npc.id"
            class="border border-accent/20 rounded-xs p-1.5 md:p-2 cursor-pointer hover:bg-accent/5 text-center md:text-left"
            @click="selectedHiddenNpc = npc.id"
          >
            <!-- 移动端：紧凑布局 -->
            <div class="md:hidden">
              <p class="text-xs text-accent truncate">{{ npc.name }}</p>
              <p
                class="text-[10px] flex items-center justify-center"
                :class="hiddenHeartCount(npc.id) > 0 ? 'text-accent' : 'text-muted/30'"
              >
                {{ hiddenHeartCount(npc.id) }}
                <Diamond :size="10" :fill="hiddenHeartCount(npc.id) > 0 ? 'currentColor' : 'none'" />
                <span class="text-muted/50 ml-0.5">{{ hiddenNpcStore.getHiddenNpcState(npc.id)?.affinity ?? 0 }}</span>
              </p>
            </div>
            <!-- 桌面端：显示更多信息 -->
            <div class="hidden md:block">
              <div class="flex items-center justify-between">
                <span class="text-xs text-accent">{{ npc.name }}</span>
                <span class="text-[10px] text-muted/50">{{ getSpiritStageLabel(npc.id) }}</span>
              </div>
              <p class="text-[10px] text-muted truncate">{{ npc.title }}</p>
              <p class="text-[10px] text-success/80 truncate mt-0.5">
                {{ getRevealedSpiritGuide(npc.id) }}
              </p>
              <div class="flex items-center justify-between mt-0.5">
                <div class="flex items-center space-x-px">
                  <Diamond
                    v-for="d in 12"
                    :key="d"
                    :size="8"
                    class="flex-shrink-0"
                    :class="(hiddenNpcStore.getHiddenNpcState(npc.id)?.affinity ?? 0) >= d * 250 ? 'text-accent' : 'text-muted/20'"
                    :fill="(hiddenNpcStore.getHiddenNpcState(npc.id)?.affinity ?? 0) >= d * 250 ? 'currentColor' : 'none'"
                  />
                </div>
                <span class="text-[10px] text-muted/50">{{ hiddenNpcStore.getHiddenNpcState(npc.id)?.affinity ?? 0 }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 线索区（显示 rumor / glimpse / encounter 阶段的线索） -->
      <div v-if="rumorHiddenNpcs.length > 0" :class="{ 'mt-4': revealedHiddenNpcs.length > 0 }">
        <h3 class="text-muted/60 text-sm mb-2">线索与踪迹</h3>
        <div class="flex flex-col space-y-1">
          <div v-for="npc in rumorHiddenNpcs" :key="npc.id"
            class="border border-muted/10 rounded-xs px-2 py-1.5 text-[10px] text-muted/50 cursor-pointer hover:border-accent/30 hover:text-muted/80 transition-colors"
            @click="() => { const s = getLastDiscoveryStep(npc.id); if (s) reviewingRumorStep = { npcId: npc.id, step: s } }"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-accent/80">{{ npc.name }}</span>
              <span class="text-[10px] border border-accent/15 rounded-xs px-1 text-muted/70">{{ getSpiritStageLabel(npc.id) }}</span>
            </div>
            <p class="mt-0.5 leading-4">
              <span v-if="hiddenNpcStore.getHiddenNpcState(npc.id)?.discoveryPhase === 'rumor'">
                {{ getLastDiscoveryLog(npc.id) ?? '似乎有什么隐约的传说……' }}
              </span>
              <span v-else-if="hiddenNpcStore.getHiddenNpcState(npc.id)?.discoveryPhase === 'encounter'">
                {{ getLastDiscoveryLog(npc.id) ?? '你们已经见过一面了，也许还差最后一步。' }}
              </span>
              <span v-else>
                {{ getLastDiscoveryLog(npc.id) ?? '你曾看到某种异象……' }}
              </span>
            </p>
            <p class="mt-1 text-accent/80 leading-4">下一步建议：{{ getSpiritNextHint(npc.id) }}</p>
            <div v-if="getSpiritHintTags(npc.id).length > 0" class="flex flex-wrap gap-1 mt-1">
              <span
                v-for="tag in getSpiritHintTags(npc.id)"
                :key="tag"
                class="text-[10px] px-1 rounded-xs border border-accent/15 text-accent/80"
              >
                {{ tag }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 仙灵空状态 -->
      <div
        v-if="revealedHiddenNpcs.length === 0 && rumorHiddenNpcs.length === 0"
        class="flex flex-col items-center justify-center py-12 text-muted"
      >
        <Sparkles :size="32" class="mb-2" />
        <p class="text-xs">尚未发现任何仙灵的踪迹。</p>
        <p class="text-[10px] text-muted/60 mt-1 max-w-60 text-center leading-4">
          可先提升农耕 / 采集 / 钓鱼 / 挖矿等级，并在竹林、瀑布、矿洞、村庄等地点留意特殊时间、天气与关键道具线索。
        </p>
      </div>
    </div>

    <!-- 传闻回顾弹窗 -->
    <Transition name="panel-fade">
      <DiscoveryScene
        v-if="reviewingRumorStep"
        :key="`${reviewingRumorStep.npcId}:${reviewingRumorStep.step.id}`"
        :npc-id="reviewingRumorStep.npcId"
        :step="reviewingRumorStep.step"
        :readonly="true"
        @close="reviewingRumorStep = null"
      />
    </Transition>

    <!-- 仙灵交互弹窗 -->
    <Transition name="panel-fade">
      <HiddenNpcModal v-if="selectedHiddenNpc" :npc-id="selectedHiddenNpc" @close="selectedHiddenNpc = null" />
    </Transition>

    <!-- NPC 交互弹窗 -->
    <Transition name="panel-fade">
      <div v-if="selectedNpc" class="game-modal-overlay fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" @click.self="selectedNpc = null">
        <div class="game-panel max-w-lg w-full max-h-[80vh] overflow-y-auto">
          <!-- 头部：名称 + 关闭 -->
          <div class="flex justify-between items-start mb-2">
            <div>
              <p class="text-sm text-accent">
                {{ selectedNpcDef?.name }}
                <span class="text-xs text-muted ml-0.5">{{ selectedNpcDef?.role }}</span>
                <span v-if="selectedNpcState?.married" class="text-[10px] text-danger border border-danger/30 rounded-xs px-1 ml-1">
                  伴侣
                </span>
                <span v-else-if="selectedNpcState?.dating" class="text-[10px] text-danger/70 border border-danger/20 rounded-xs px-1 ml-1">
                  约会中
                </span>
                <span v-else-if="selectedNpcState?.zhiji" class="text-[10px] text-accent border border-accent/30 rounded-xs px-1 ml-1">
                  知己
                </span>
              </p>
              <p class="text-[10px] text-muted/60 mt-0.5">{{ selectedNpcDef?.personality }}</p>
            </div>
            <Button @click="selectedNpc = null">关闭</Button>
          </div>

          <!-- 好感度条 -->
          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center space-x-px">
                <Heart
                  v-for="h in 10"
                  :key="h"
                  :size="12"
                  class="flex-shrink-0"
                  :class="(selectedNpcState?.friendship ?? 0) >= h * 250 ? 'text-danger' : 'text-muted/20'"
                  :fill="(selectedNpcState?.friendship ?? 0) >= h * 250 ? 'currentColor' : 'none'"
                />
              </div>
              <span class="text-xs" :class="levelColor(npcStore.getFriendshipLevel(selectedNpc!))">
                {{ selectedNpcState?.friendship ?? 0 }}
                <span class="text-muted/40">/{{ nextHeartThreshold }}</span>
              </span>
            </div>
            <div class="mt-1.5 grid grid-cols-1 md:grid-cols-2 gap-1.5 text-[10px]">
              <div class="border border-accent/10 rounded-xs px-1.5 py-1">
                <span class="text-muted/60">关系阶段</span>
                <p class="text-accent mt-0.5">{{ npcStore.getRelationshipStageText(selectedNpc!) }}</p>
                <p class="text-muted/60 mt-0.5 leading-4">{{ npcStore.getRelationshipStageDescription(selectedNpc!) }}</p>
              </div>
              <div class="border border-accent/10 rounded-xs px-1.5 py-1">
                <span class="text-muted/60">下一颗心</span>
                <p class="mt-0.5">{{ nextHeartThreshold }}</p>
              </div>
            </div>
            <!-- 状态标签 -->
            <div class="flex items-center space-x-1.5 flex-wrap">
              <span
                class="text-[10px] border rounded-xs px-1 flex items-center space-x-0.5"
                :class="selectedNpcState?.talkedToday ? 'text-muted/40 border-muted/10' : 'text-success border-success/30'"
              >
                <MessageCircle :size="10" />
                <span>{{ selectedNpcState?.talkedToday ? '已聊天' : '可聊天' }}</span>
              </span>
              <span class="text-[10px] border rounded-xs px-1 flex items-center space-x-0.5" :class="giftTagClass">
                <Gift :size="10" />
                <span>{{ giftTagText }}</span>
              </span>
              <span
                v-if="selectedNpcDef?.birthday"
                class="text-[10px] border border-muted/10 rounded-xs px-1 text-muted flex items-center space-x-0.5"
              >
                <Cake :size="10" />
                <span>{{ SEASON_NAMES_MAP[selectedNpcDef.birthday.season] }}{{ selectedNpcDef.birthday.day }}日</span>
              </span>
              <span v-if="npcStore.isBirthday(selectedNpc!)" class="text-[10px] text-danger border border-danger/30 rounded-xs px-1">
                生日! 送礼×4
              </span>
            </div>
          </div>

          <!-- 今日行程 / 节日存在感 -->
          <div v-if="selectedScheduleStatus" class="border border-accent/10 rounded-xs p-2 mb-2">
            <div class="flex items-center justify-between mb-1">
              <p class="text-xs text-muted">今日行程</p>
              <span class="text-[10px]" :class="selectedScheduleStatus.available ? 'text-success' : 'text-muted/50'">
                {{ selectedScheduleStatus.available ? '可遇见' : '暂时不在' }}
              </span>
            </div>
            <p v-if="todayEvent" class="text-[10px] text-danger mb-1">今日节日：{{ todayEvent.name }}</p>
            <p class="text-xs text-accent">{{ selectedScheduleStatus.location }}</p>
            <p class="text-[10px] text-muted mt-0.5">{{ selectedScheduleStatus.summary }}</p>
            <p v-if="selectedScheduleStatus.reason" class="text-[10px] text-warning mt-1">{{ selectedScheduleStatus.reason }}</p>
            <p v-if="selectedScheduleStatus.specialDialogue" class="text-[10px] text-danger mt-1">节日台词：{{ selectedScheduleStatus.specialDialogue }}</p>
            <p v-if="selectedNextScheduleText" class="text-[10px] text-accent/80 mt-1">下一步：{{ selectedNextScheduleText }}</p>

            <div v-if="selectedScheduleTimeline.length > 0" class="mt-2 border-t border-accent/10 pt-2 space-y-1">
              <p class="text-[10px] text-muted">今日时间线</p>
              <div
                v-for="entry in selectedScheduleTimeline"
                :key="entry.key"
                class="rounded-xs border px-2 py-1"
                :class="entry.active ? 'border-success/30 bg-success/5' : 'border-accent/10'"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[10px]" :class="entry.active ? 'text-success' : 'text-muted/70'">{{ entry.label }}</span>
                  <div v-if="entry.tags.length > 0" class="flex flex-wrap justify-end gap-1">
                    <span v-for="tag in entry.tags" :key="tag" class="text-[10px] px-1 rounded-xs border border-accent/15 text-accent/80">
                      {{ tag }}
                    </span>
                  </div>
                </div>
                <p class="text-[10px] text-accent mt-0.5">{{ entry.location }}</p>
                <p class="text-[10px] text-muted/70 leading-4">{{ entry.summary }}</p>
              </div>
            </div>
          </div>

          <!-- 关系收益 -->
          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted mb-1">当前关系收益</p>
            <div v-if="selectedRelationshipFocusLabels.length > 0" class="mb-2">
              <p class="text-[10px] text-muted mb-1">职业侧重</p>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="focus in selectedRelationshipFocusLabels"
                  :key="focus"
                  class="text-[10px] border border-accent/15 text-accent/80 rounded-xs px-1 py-0.5"
                >
                  {{ focus }}
                </span>
              </div>
            </div>
            <div v-if="selectedRelationshipBenefits.length > 0" class="flex flex-wrap gap-1">
              <span v-for="benefit in selectedRelationshipBenefits" :key="benefit" class="text-[10px] border border-success/20 text-success rounded-xs px-1 py-0.5">
                {{ benefit }}
              </span>
            </div>
            <p v-else class="text-[10px] text-muted/60">继续互动后会解锁折扣、回礼、专属委托和线索。</p>

            <div v-if="selectedGiftReturnSummaries.length > 0" class="mt-2">
              <p class="text-[10px] text-muted mb-1">可能回礼</p>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="giftSummary in selectedGiftReturnSummaries"
                  :key="giftSummary"
                  class="text-[10px] border border-accent/20 text-accent rounded-xs px-1 py-0.5"
                >
                  {{ giftSummary }}
                </span>
              </div>
            </div>

            <div v-if="selectedNextRelationshipBenefits.length > 0" class="mt-2">
              <p class="text-[10px] text-muted mb-1">下一阶段可解锁</p>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="benefit in selectedNextRelationshipBenefits"
                  :key="benefit"
                  class="text-[10px] border border-warning/20 text-warning rounded-xs px-1 py-0.5"
                >
                  {{ benefit }}
                </span>
              </div>
            </div>
          </div>

          <div v-if="selectedRelationshipClues.length > 0" class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted mb-1">已获得线索</p>
            <div class="space-y-1">
              <p v-for="clue in selectedRelationshipClues" :key="clue.clueId" class="text-[10px] text-accent/90 leading-4">
                {{ clue.text }}
              </p>
            </div>
          </div>

          <!-- 已触发的心事件 -->
          <div v-if="selectedNpcState && selectedNpcState.triggeredHeartEvents.length > 0" class="mb-3">
            <p class="text-xs text-muted mb-1">回忆：</p>
            <div class="flex space-x-1 flex-wrap">
              <span v-for="eid in selectedNpcState.triggeredHeartEvents" :key="eid" class="text-xs border border-accent/20 rounded-xs px-1">
                {{ getHeartEventTitle(eid) }}
              </span>
            </div>
          </div>

          <!-- 对话 -->
          <div class="mb-3 flex space-y-2 flex-wrap">
            <Button class="w-full" :icon="MessageCircle" :disabled="selectedNpcState?.talkedToday || !canInteractWithSelectedNpc" @click="handleTalk">
              {{ selectedNpcState?.talkedToday ? '今天已聊过' : '聊天' }}
            </Button>
            <!-- 每日提示按钮 -->
            <Button
              v-if="selectedNpc && npcStore.hasDailyTip(selectedNpc)"
              class="w-full text-success border-success/40"
              :icon="Lightbulb"
              :disabled="!!(selectedNpc && npcStore.isTipGivenToday(selectedNpc)) || !canInteractWithSelectedNpc"
              @click="handleDailyTip"
            >
              {{ selectedNpc && npcStore.isTipGivenToday(selectedNpc) ? '今天已提示' : TIP_NPC_LABELS[selectedNpc as TipNpcId] }}
            </Button>
            <!-- 离婚按钮 -->
            <Button v-if="selectedNpcState?.married" class="w-full text-danger border-danger/40" @click="showDivorceConfirm = true">
              休书
            </Button>
            <p v-if="!canInteractWithSelectedNpc && unavailableInteractionReason" class="text-[10px] text-warning w-full">
              {{ unavailableInteractionReason }}
            </p>
          </div>

          <!-- 婚礼倒计时 -->
          <p v-if="npcStore.weddingCountdown > 0 && npcStore.weddingNpcId === selectedNpc" class="text-xs text-accent mb-3">
            婚礼将在 {{ npcStore.weddingCountdown }} 天后举行！
          </p>

          <!-- 恋爱/求婚面板 -->
          <div
            v-if="selectedNpcDef?.marriageable && !selectedNpcState?.married && npcStore.canPursueMarriageWithNpc(selectedNpc)"
            class="border border-danger/20 rounded-xs p-2 mb-3"
          >
            <p class="text-xs text-danger/80 mb-1.5 flex items-center space-x-1">
              <Heart :size="12" />
              <span>姻缘</span>
            </p>
            <template v-if="selectedNpcState?.zhiji">
              <p class="text-[10px] text-muted/70 mb-1.5">你们当前是知己关系。若想发展婚缘，请先在下方知己面板中断缘，再回来赠帕开始约会。</p>
            </template>
            <template v-else-if="!selectedNpcState?.dating && !(npcStore.weddingCountdown > 0 && npcStore.weddingNpcId === selectedNpc)">
              <p v-if="npcStore.npcStates.some(s => s.married)" class="text-[10px] text-muted/50 mb-1">你已有伴侣，无法再赠帕。</p>
              <template v-else>
                <div class="flex flex-col space-y-0.5 mb-1.5">
                  <span
                    class="text-[10px] flex items-center space-x-1"
                    :class="(selectedNpcState?.friendship ?? 0) >= 2000 ? 'text-success' : 'text-muted/50'"
                  >
                    <CircleCheck v-if="(selectedNpcState?.friendship ?? 0) >= 2000" :size="10" />
                    <Circle v-else :size="10" />
                    <span>好感≥2000（8心）</span>
                    <span class="text-muted/40">— 当前{{ selectedNpcState?.friendship ?? 0 }}</span>
                  </span>
                  <span
                    class="text-[10px] flex items-center space-x-1"
                    :class="inventoryStore.hasItem('silk_ribbon') ? 'text-success' : 'text-muted/50'"
                  >
                    <CircleCheck v-if="inventoryStore.hasItem('silk_ribbon')" :size="10" />
                    <Circle v-else :size="10" />
                    <span>持有丝帕</span>
                    <span class="text-muted/40">— 绸缎庄有售</span>
                  </span>
                </div>
                <Button class="w-full text-danger border-danger/40" :icon="Heart" :disabled="!canInteractWithSelectedNpc || !canStartDating" @click="handleStartDating">
                  赠帕（开始约会）
                </Button>
              </template>
            </template>
            <template v-else-if="selectedNpcState?.dating">
              <p class="text-[10px] text-danger/60 mb-1">
                约会中
                <Heart :size="10" class="inline" />
              </p>
              <div class="flex flex-col space-y-0.5 mb-1.5">
                <span
                  class="text-[10px] flex items-center space-x-0.5"
                  :class="(selectedNpcState?.friendship ?? 0) >= 2500 ? 'text-success' : 'text-muted/50'"
                >
                  <CircleCheck v-if="(selectedNpcState?.friendship ?? 0) >= 2500" :size="10" />
                  <Circle v-else :size="10" />
                  好感≥2500（10心）
                  <span class="text-muted/40">— 当前{{ selectedNpcState?.friendship ?? 0 }}</span>
                </span>
                <span
                  class="text-[10px] flex items-center space-x-0.5"
                  :class="inventoryStore.hasItem('jade_ring') ? 'text-success' : 'text-muted/50'"
                >
                  <CircleCheck v-if="inventoryStore.hasItem('jade_ring')" :size="10" />
                  <Circle v-else :size="10" />
                  持有翡翠戒指
                  <span class="text-muted/40">— 绸缎庄有售</span>
                </span>
              </div>
              <Button class="w-full text-danger border-danger/40" :icon="Heart" :disabled="!canInteractWithSelectedNpc || !canPropose" @click="handlePropose">求婚</Button>
            </template>
          </div>

          <!-- 知己面板（同性可婚NPC，未约会/未结婚） -->
          <div
            v-if="
              selectedNpcDef?.marriageable &&
              !selectedNpcState?.married &&
              !selectedNpcState?.dating &&
              selectedNpcDef.gender === playerStore.gender
            "
            class="border border-accent/20 rounded-xs p-2 mb-3"
          >
            <p class="text-xs text-accent/80 mb-1.5 flex items-center space-x-1">
              <Heart :size="12" />
              <span>知己</span>
            </p>
            <template v-if="selectedNpcState?.zhiji">
              <p class="text-[10px] text-accent/60 mb-1">{{ selectedNpcDef.gender === 'male' ? '蓝颜知己' : '红颜知己' }} ♦</p>
              <Button class="w-full text-danger border-danger/40" @click="showZhijiDissolveConfirm = true">断缘</Button>
            </template>
            <template v-else-if="npcStore.npcStates.some(s => s.zhiji)">
              <p class="text-[10px] text-muted/50">你已有知己，无法再结缘。</p>
            </template>
            <template v-else>
              <div class="flex flex-col space-y-0.5 mb-1.5">
                <span
                  class="text-[10px] flex items-center space-x-0.5"
                  :class="(selectedNpcState?.friendship ?? 0) >= 2000 ? 'text-success' : 'text-muted/50'"
                >
                  <CircleCheck v-if="(selectedNpcState?.friendship ?? 0) >= 2000" :size="10" />
                  <Circle v-else :size="10" />
                  好感≥2000（8心）
                  <span class="text-muted/40">— 当前{{ selectedNpcState?.friendship ?? 0 }}</span>
                </span>
                <span
                  class="text-[10px] flex items-center space-x-0.5"
                  :class="inventoryStore.hasItem('zhiji_jade') ? 'text-success' : 'text-muted/50'"
                >
                  <CircleCheck v-if="inventoryStore.hasItem('zhiji_jade')" :size="10" />
                  <Circle v-else :size="10" />
                  持有知己玉佩
                  <span class="text-muted/40">— 绸缎庄有售</span>
                </span>
              </div>
              <Button class="w-full text-accent border-accent/40" :icon="Heart" :disabled="!canInteractWithSelectedNpc || !canBecomeZhiji" @click="handleBecomeZhiji">
                赠玉（结为知己）
              </Button>
            </template>
          </div>

          <!-- 断缘确认 -->
          <div v-if="showZhijiDissolveConfirm" class="game-panel mb-3 border-accent/40">
            <p class="text-xs text-danger mb-2">确定要与{{ selectedNpcDef?.name }}断缘吗？（花费10000文）</p>
            <div class="flex space-x-2">
              <Button class="text-danger" @click="handleDissolveZhiji">确认</Button>
              <Button @click="showZhijiDissolveConfirm = false">取消</Button>
            </div>
          </div>

          <!-- 离婚确认 -->
          <div v-if="showDivorceConfirm" class="game-panel mb-3 border-danger/40">
            <p class="text-xs text-danger mb-2">确定要与{{ selectedNpcDef?.name }}和离吗？（花费30000文）</p>
            <div class="flex space-x-2">
              <Button class="text-danger" @click="handleDivorce">确认</Button>
              <Button @click="showDivorceConfirm = false">取消</Button>
            </div>
          </div>

          <!-- 对话内容 -->
          <div v-if="dialogueText" class="game-panel mb-3 text-xs">
            <p class="text-accent mb-1">「{{ selectedNpcDef?.name }}」</p>
            <p>{{ dialogueText }}</p>
          </div>

          <!-- 送礼 -->
          <div>
            <p class="text-xs text-muted mb-2">
              送礼（选择背包中的物品）
              <span v-if="npcStore.isBirthday(selectedNpc!)" class="text-danger">— 生日加成中!</span>
            </p>
            <template v-if="selectedNpcState?.giftedToday">
              <div class="flex flex-col items-center justify-center py-6 text-muted">
                <Gift :size="32" class="mb-2" />
                <p class="text-xs">今天已送过礼物了。</p>
              </div>
            </template>
            <template v-else-if="(selectedNpcState?.giftsThisWeek ?? 0) >= 2">
              <div class="flex flex-col items-center justify-center py-6 text-muted">
                <Gift :size="32" class="mb-2" />
                <p class="text-xs">本周已送过2次礼物了。</p>
              </div>
            </template>
            <template v-else>
              <div class="flex flex-col space-y-1 max-h-40 overflow-y-auto">
                <div
                  v-for="item in giftableItems"
                  :key="`${item.itemId}_${item.quality ?? 'normal'}`"
                  class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-1.5 cursor-pointer hover:bg-accent/5 mr-1"
                  @click="activeGiftKey = item.itemId + ':' + item.quality"
                >
                  <span class="flex items-center space-x-1">
                    <span class="text-xs" :class="qualityTextClass(item.quality)">
                      {{ getItemById(item.itemId)?.name }}
                    </span>
                    <span
                      v-if="getGiftPreference(item.itemId) !== 'neutral'"
                      class="text-[10px]"
                      :class="GIFT_PREF_CLASS[getGiftPreference(item.itemId)]"
                    >
                      {{ GIFT_PREF_LABELS[getGiftPreference(item.itemId)] }}
                    </span>
                  </span>
                  <Gift :size="12" class="text-muted" />
                </div>
              </div>
              <div v-if="giftableItems.length === 0" class="flex flex-col items-center justify-center py-6 text-muted">
                <Package :size="32" class="mb-2" />
                <p class="text-xs">背包为空</p>
              </div>
            </template>
          </div>

          <!-- 送礼物品详情弹窗 -->
          <Transition name="panel-fade">
            <div
              v-if="activeGiftItem && activeGiftDef"
              class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-60 p-4"
              @click.self="activeGiftKey = null"
            >
              <div class="game-panel max-w-xs w-full relative">
                <button class="absolute top-2 right-2 text-muted hover:text-text" @click="activeGiftKey = null">
                  <X :size="14" />
                </button>
                <p class="text-sm mb-2 pr-6" :class="qualityTextClass(activeGiftItem.quality, 'text-accent')">
                  {{ activeGiftDef.name }}
                </p>
                <div class="border border-accent/10 rounded-xs p-2 mb-2">
                  <p class="text-xs text-muted">{{ activeGiftDef.description }}</p>
                </div>
                <div class="border border-accent/10 rounded-xs p-2 mb-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-muted">数量</span>
                    <span class="text-xs">&times;{{ activeGiftItem.quantity }}</span>
                  </div>
                  <div v-if="activeGiftItem.quality !== 'normal'" class="flex items-center justify-between mt-0.5">
                    <span class="text-xs text-muted">品质</span>
                    <span class="text-xs" :class="qualityTextClass(activeGiftItem.quality)">
                      {{ QUALITY_NAMES[activeGiftItem.quality] }}
                    </span>
                  </div>
                </div>
                <div v-if="activeGiftReaction" class="border border-accent/10 rounded-xs p-2 mb-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-muted">{{ selectedNpcDef?.name }}觉得</span>
                    <span class="text-xs" :class="activeGiftReaction.className">
                      {{ activeGiftReaction.text }}
                    </span>
                  </div>
                </div>
                <div class="flex flex-col space-y-1.5">
                  <Button :icon="Gift" class="w-full justify-center" @click="handleGift(activeGiftItem!.itemId, activeGiftItem!.quality)">
                    赠送给{{ selectedNpcDef?.name }}
                  </Button>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { MessageCircle, Heart, Gift, Cake, X, Package, Lightbulb, Circle, CircleCheck, Users, Sparkles, Diamond } from 'lucide-vue-next'
  import { useCookingStore } from '@/stores/useCookingStore'
  import { useGameStore } from '@/stores/useGameStore'
  import { useInventoryStore } from '@/stores/useInventoryStore'
  import { useNpcStore } from '@/stores/useNpcStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import { useTutorialStore } from '@/stores/useTutorialStore'
  import { useVillageProjectStore } from '@/stores/useVillageProjectStore'
  import { useHiddenNpcStore } from '@/stores/useHiddenNpcStore'
  import { NPCS, getNpcById, getItemById, getHeartEventById, getTodayEvent } from '@/data'
  import { getNpcRelationshipFocusLabels } from '@/data/npcWorld'
  import { getHiddenNpcById } from '@/data/hiddenNpcs'
  import { ACTION_TIME_COSTS } from '@/data/timeConstants'
  import { TIP_NPC_LABELS } from '@/data/npcTips'
  import type { TipNpcId } from '@/data/npcTips'
  import { getCombinedItemCount } from '@/composables/useCombinedInventory'
  import { addLog, showFloat } from '@/composables/useGameLog'
  import { triggerHeartEvent } from '@/composables/useDialogs'
  import { handleEndDay } from '@/composables/useEndDay'
  import type { FriendshipLevel, Quality, VillageProjectRequirementProgress } from '@/types'
  import Button from '@/components/game/Button.vue'
  import GuidanceDigestPanel from '@/components/game/GuidanceDigestPanel.vue'
  import QaGovernancePanel from '@/components/game/QaGovernancePanel.vue'
  import HiddenNpcModal from '@/components/game/HiddenNpcModal.vue'
  import DiscoveryScene from '@/components/game/DiscoveryScene.vue'
  import type { DiscoveryStep } from '@/types/hiddenNpc'
  import type { DiscoveryCondition } from '@/types/hiddenNpc'

  const router = useRouter()
  const npcStore = useNpcStore()
  const inventoryStore = useInventoryStore()
  const cookingStore = useCookingStore()
  const gameStore = useGameStore()
  const playerStore = usePlayerStore()
  const tutorialStore = useTutorialStore()
  const hiddenNpcStore = useHiddenNpcStore()
  const villageProjectStore = useVillageProjectStore()

  const activeTab = ref<'villager' | 'spirit'>('villager')
  const selectedHiddenNpc = ref<string | null>(null)
  const relationshipDebugSnapshot = computed(() => npcStore.getRelationshipDebugSnapshot())
  const familyWishOverview = computed(() => npcStore.getFamilyWishOverview())
  const activeFamilyWishDef = computed(() => familyWishOverview.value.defs.find(def => def.id === familyWishOverview.value.state.activeWishId) ?? null)
  const activeFamilyWishChain = computed(() => npcStore.getFamilyWishChainPreview(activeFamilyWishDef.value?.id ?? ''))
  const activeZhijiProjectChain = computed(() => {
    const project = relationshipDebugSnapshot.value.zhijiCompanionProjects.find(entry => !entry.rewarded) ?? null
    return project ? npcStore.getZhijiProjectChainPreview(project.projectId, project.npcId) : null
  })
  const spiritBondOverview = computed(() => hiddenNpcStore.spiritBondAuditSnapshot)
  const selectedSpiritBlessingSummary = computed(() => (selectedHiddenNpc.value ? hiddenNpcStore.getSpiritBlessingSummary(selectedHiddenNpc.value) : null))
  const selectedSpiritBlessings = computed(() => (selectedHiddenNpc.value ? hiddenNpcStore.getAvailableSpiritBlessings(selectedHiddenNpc.value) : []))
  const selectedSpiritMemoryChain = computed(() => {
    const summary = selectedSpiritBlessingSummary.value
    const nextMemoryId = summary?.memoryRewards.find(entry => !summary.claimedBondMemoryIds.includes(entry.id))?.id ?? summary?.memoryRewards[0]?.id
    return selectedHiddenNpc.value && nextMemoryId ? hiddenNpcStore.getBondMemoryChainPreview(selectedHiddenNpc.value, nextMemoryId) : null
  })

  const revealedHiddenNpcs = computed(() => hiddenNpcStore.getRevealedNpcs)
    const rumorHiddenNpcs = computed(() => hiddenNpcStore.getRumorNpcs)

  const hiddenHeartCount = (npcId: string): number => {
    const affinity = hiddenNpcStore.getHiddenNpcState(npcId)?.affinity ?? 0
    return Math.min(12, Math.floor(affinity / 250))
  }

  const getLastDiscoveryLog = (npcId: string): string | null => {
    const npcDef = getHiddenNpcById(npcId)
    const state = hiddenNpcStore.getHiddenNpcState(npcId)
    if (!npcDef || !state) return null
    const lastStepId = state.completedSteps[state.completedSteps.length - 1]
    const step = npcDef.discoverySteps.find(s => s.id === lastStepId)
    return step?.logMessage ?? null
  }

  const getLastDiscoveryStep = (npcId: string): DiscoveryStep | null => {
    const npcDef = getHiddenNpcById(npcId)
    const state = hiddenNpcStore.getHiddenNpcState(npcId)
    if (!npcDef || !state) return null
    const lastStepId = state.completedSteps[state.completedSteps.length - 1]
    return npcDef.discoverySteps.find(s => s.id === lastStepId) ?? null
  }

  const getNextDiscoveryStep = (npcId: string): DiscoveryStep | null => {
    const npcDef = getHiddenNpcById(npcId)
    const state = hiddenNpcStore.getHiddenNpcState(npcId)
    if (!npcDef || !state) return null
    return npcDef.discoverySteps.find(step => !state.completedSteps.includes(step.id)) ?? null
  }

  const SPIRIT_STAGE_LABELS = {
    unknown: '未闻其名',
    rumor: '传闻',
    glimpse: '惊鸿一瞥',
    encounter: '初次相遇',
    revealed: '愿意往来'
  } as const

  const getSpiritStageLabel = (npcId: string): string => {
    const phase = hiddenNpcStore.getHiddenNpcState(npcId)?.discoveryPhase ?? 'unknown'
    return SPIRIT_STAGE_LABELS[phase]
  }

  const formatDiscoveryCondition = (cond: DiscoveryCondition): string => {
    switch (cond.type) {
      case 'season':
        return `${SEASON_NAMES_MAP[cond.season] ?? cond.season}季`
      case 'weather': {
        const weatherMap: Record<string, string> = {
          sunny: '晴天',
          rainy: '雨天',
          stormy: '雷雨',
          snowy: '雪天',
          windy: '大风',
          green_rain: '绿雨'
        }
        return weatherMap[cond.weather] ?? cond.weather
      }
      case 'timeRange':
        return `${cond.minHour}:00-${cond.maxHour}:00`
      case 'location': {
        const locationMap: Record<string, string> = {
          fishing: '去钓鱼区域',
          forage: '去竹林采集',
          farm: '去农场',
          mining: '去矿洞',
          village: '去村中'
        }
        return locationMap[cond.panel] ?? `前往${cond.panel}`
      }
      case 'item': {
        const name = getItemById(cond.itemId)?.name ?? cond.itemId
        return `准备${name}${cond.quantity && cond.quantity > 1 ? `×${cond.quantity}` : ''}`
      }
      case 'skill': {
        const skillMap: Record<string, string> = {
          farming: '农耕',
          foraging: '采集',
          fishing: '钓鱼',
          mining: '挖矿'
        }
        return `${skillMap[cond.skillType] ?? cond.skillType}Lv${cond.minLevel}`
      }
      case 'npcFriendship': {
        const npcName = getNpcById(cond.npcId)?.name ?? cond.npcId
        return `${npcName}好感≥${cond.minFriendship}`
      }
      case 'questComplete':
        return '推进主线'
      case 'mineFloor':
        return `矿洞到达${cond.minFloor}层`
      case 'fishCaught': {
        const fishName = getItemById(cond.fishId)?.name ?? cond.fishId
        return `钓到${fishName}`
      }
      case 'money':
        return `持有${cond.minAmount}文`
      case 'yearMin':
        return `第${cond.year}年起`
      case 'day':
        return `${cond.day}日`
      default:
        return '满足特殊条件'
    }
  }

  const getSpiritHintTags = (npcId: string): string[] => {
    const step = getNextDiscoveryStep(npcId)
    if (!step) return []
    return step.conditions.map(formatDiscoveryCondition).slice(0, 5)
  }

  const getSpiritNextHint = (npcId: string): string => {
    const step = getNextDiscoveryStep(npcId)
    if (!step) return '已完成发现链，可以开始互动、供奉与推进仙缘。'

    const location = step.conditions.find(c => c.type === 'location')
    const timeRange = step.conditions.find(c => c.type === 'timeRange')
    const season = step.conditions.find(c => c.type === 'season')
    const weather = step.conditions.find(c => c.type === 'weather')
    const item = step.conditions.find(c => c.type === 'item')
    const skill = step.conditions.find(c => c.type === 'skill')

    const parts: string[] = []
    if (season) parts.push(formatDiscoveryCondition(season))
    if (weather) parts.push(formatDiscoveryCondition(weather))
    if (timeRange) parts.push(formatDiscoveryCondition(timeRange))
    if (location) parts.push(formatDiscoveryCondition(location))
    if (item) parts.push(formatDiscoveryCondition(item))
    if (skill) parts.push(formatDiscoveryCondition(skill))

    return parts.length > 0 ? parts.join('，') : '继续探索相关地点并留意剧情线索。'
  }

  const getRevealedSpiritGuide = (npcId: string): string => {
    const def = getHiddenNpcById(npcId)
    const state = hiddenNpcStore.getHiddenNpcState(npcId)
    if (!def || !state) return '可通过互动与供奉提升缘分。'
    if (!state.courting && state.affinity < def.courtshipThreshold) return '优先通过互动与供奉提升缘分。'
    if (!state.courting) return '已可求缘，记得准备求缘信物。'
    if (!state.bonded && state.affinity < def.bondThreshold) return '求缘后继续提升缘分，准备结缘信物。'
    if (!state.bonded) return '已满足结缘门槛，可尝试结缘。'
    return '已结缘，仙灵能力与结缘加成生效中。'
  }

  const tutorialHint = computed(() => {
    if (!tutorialStore.enabled || gameStore.year > 1) return null
    if (npcStore.npcStates.every(n => n.friendship === 0)) return '点击村民头像可以聊天和送礼，经常互动能增进友好度。'
    return null
  })

  const getProjectItemCount = (itemId: string) => getCombinedItemCount(itemId)

  const getVillageProjectRequirementProgress = (projectId: string): VillageProjectRequirementProgress[] => {
    return villageProjectStore.getProjectRequirementProgresses(projectId)
  }

  const getVillageProjectMaintenanceSummary = (projectId: string) => {
    return villageProjectStore.getProjectMaintenanceSummary(projectId)
  }

  const getVillageProjectHint = (projectId: string): string => {
    const project = villageProjectStore.projects.find(entry => entry.id === projectId)
    if (project?.completed) {
      const maintenanceSummary = getVillageProjectMaintenanceSummary(projectId)
      if (!maintenanceSummary) return '已完工，长期加成已生效。'
      if (maintenanceSummary.active) return '已完工，维护已启用，相关增益生效中。'
      if (maintenanceSummary.overdue) return '已完工，但维护已逾期；相关增益暂停，补缴后恢复。'
      return '已完工，但尚未启用维护；启用后对应增益才会生效。'
    }

    const result = villageProjectStore.canCompleteProject(projectId)
    if (result.ok) return '材料齐备，可以开始动工。'

    switch (result.code) {
      case 'missing_clue':
        return project?.requiredClueText ?? result.reason ?? '尚未获得对应建设线索。'
      case 'missing_project':
        return result.reason ?? '需要先完成前置建设项目。'
      case 'money':
        return project ? `还差 ${Math.max(0, project.moneyCost - playerStore.money)} 文工费。` : (result.reason ?? '金钱不足。')
      case 'material': {
        const itemName = getItemById(result.missingItemId ?? '')?.name ?? result.missingItemId ?? '材料'
        return `材料不足：${itemName} 还缺 ${result.missingAmount ?? 0}。`
      }
      case 'requirement':
        return result.unmetRequirement ? `专项进度未达标：${result.unmetRequirement.displayLabel}。` : (result.reason ?? '专项进度尚未达标。')
      case 'completed':
        return '已完工，长期加成已生效。'
      default:
        return result.reason ?? '当前还不能建设。'
    }
  }

  const handleCompleteVillageProject = (projectId: string) => {
    const result = villageProjectStore.completeProject(projectId)
    if (!result.success) addLog(result.message)
  }

  const handlePayVillageProjectMaintenance = (projectId: string) => {
    const result = villageProjectStore.payProjectMaintenance(projectId)
    if (!result.success) {
      showFloat(result.message, 'danger')
      addLog(result.message)
      return
    }
    showFloat(result.message, 'success')
  }

  const handleToggleVillageProjectMaintenanceAutoRenew = (projectId: string) => {
    const summary = getVillageProjectMaintenanceSummary(projectId)
    if (!summary) return
    villageProjectStore.setMaintenanceAutoRenew(projectId, !summary.state.autoRenew)
    showFloat(summary.state.autoRenew ? '已关闭自动续费' : '已开启自动续费', 'accent')
    addLog(`【村庄建设】${summary.plan.label}${summary.state.autoRenew ? '已关闭' : '已开启'}自动续费。`)
  }

  const reviewingRumorStep = ref<{ npcId: string; step: DiscoveryStep } | null>(null)

  const selectedNpc = ref<string | null>(null)
  const dialogueText = ref<string | null>(null)
  const showDivorceConfirm = ref(false)
  const showZhijiDissolveConfirm = ref(false)
  const activeGiftKey = ref<string | null>(null)

  const activeGiftItem = computed(() => {
    if (!activeGiftKey.value) return null
    const [itemId, quality] = activeGiftKey.value.split(':')
    return inventoryStore.items.find(i => i.itemId === itemId && i.quality === quality) ?? null
  })

  const activeGiftDef = computed(() => {
    if (!activeGiftItem.value) return null
    return getItemById(activeGiftItem.value.itemId) ?? null
  })

  const selectedNpcDef = computed(() => (selectedNpc.value ? getNpcById(selectedNpc.value) : null))
  const selectedNpcState = computed(() => (selectedNpc.value ? npcStore.getNpcState(selectedNpc.value) : null))
  const selectedScheduleStatus = computed(() => (selectedNpc.value ? npcStore.getScheduleStatus(selectedNpc.value) : null))
  const selectedScheduleTimeline = computed(() => (selectedNpc.value ? npcStore.getScheduleTimeline(selectedNpc.value) : []))
  const selectedNextScheduleText = computed(() => (selectedNpc.value ? npcStore.getNextScheduleText(selectedNpc.value) : null))
  const selectedRelationshipBenefits = computed(() => (selectedNpc.value ? npcStore.getRelationshipBenefits(selectedNpc.value) : []))
  const selectedRelationshipFocusLabels = computed(() => (selectedNpc.value ? getNpcRelationshipFocusLabels(selectedNpc.value) : []))
  const selectedGiftReturnSummaries = computed(() => (selectedNpc.value ? npcStore.getRelationshipGiftReturnSummaries(selectedNpc.value) : []))
  const selectedNextRelationshipBenefits = computed(() => (selectedNpc.value ? npcStore.getNextRelationshipBenefits(selectedNpc.value) : []))
  const selectedRelationshipClues = computed(() => (selectedNpc.value ? npcStore.getRelationshipCluesForNpc(selectedNpc.value) : []))
  const todayEvent = computed(() => getTodayEvent(gameStore.season, gameStore.day) ?? null)
  const canInteractWithSelectedNpc = computed(() => {
    if (!selectedNpc.value) return false
    if (selectedNpcState.value?.married) return true
    return selectedScheduleStatus.value?.available ?? true
  })
  const unavailableInteractionReason = computed(() => {
    if (!selectedScheduleStatus.value || selectedScheduleStatus.value.available) return ''
    return selectedScheduleStatus.value.reason || `现在不在${selectedScheduleStatus.value.location}。`
  })

  const npcAvailable = (npcId: string): boolean => {
    const state = npcStore.getNpcState(npcId)
    if (state?.married) return true
    return npcStore.getScheduleStatus(npcId).available
  }

  const handleSelectNpc = (npcId: string) => {
    selectedNpc.value = npcId
    dialogueText.value = null
    showDivorceConfirm.value = false
    showZhijiDissolveConfirm.value = false
  }

  const heartCount = (npcId: string): number => {
    const friendship = npcStore.getNpcState(npcId)?.friendship ?? 0
    return Math.min(10, Math.floor(friendship / 250))
  }

  const npcGiftClass = (npcId: string): string => {
    const state = npcStore.getNpcState(npcId)
    if ((state?.giftsThisWeek ?? 0) >= 2) return 'text-muted/20'
    if (state?.giftedToday) return 'text-muted/20'
    return 'text-accent'
  }

  /** 弹窗中下一颗心的阈值 */
  const nextHeartThreshold = computed(() => {
    const f = selectedNpcState.value?.friendship ?? 0
    const hearts = Math.min(10, Math.floor(f / 250))
    return hearts >= 10 ? 2500 : (hearts + 1) * 250
  })

  /** 弹窗中送礼标签样式 */
  const giftTagClass = computed(() => {
    const state = selectedNpcState.value
    if ((state?.giftsThisWeek ?? 0) >= 2) return 'text-muted/40 border-muted/10'
    if (state?.giftedToday) return 'text-muted/40 border-muted/10'
    return 'text-accent border-accent/30'
  })

  /** 弹窗中送礼标签文字 */
  const giftTagText = computed(() => {
    const state = selectedNpcState.value
    if ((state?.giftsThisWeek ?? 0) >= 2) return '本周已送满'
    if (state?.giftedToday) return '今日已送'
    return `可送礼 ${state?.giftsThisWeek ?? 0}/2`
  })

  const giftableItems = computed(() => {
    const filtered = inventoryStore.items.filter(i => {
      const def = getItemById(i.itemId)
      return def && def.category !== 'seed'
    })
    if (!selectedNpcDef.value) return filtered
    return [...filtered].sort((a, b) => GIFT_PREF_ORDER[getGiftPreference(a.itemId)] - GIFT_PREF_ORDER[getGiftPreference(b.itemId)])
  })

  /** 是否可以赠帕开始约会 */
  const canStartDating = computed(() => {
    if (!selectedNpcDef.value?.marriageable) return false
    if (!npcStore.canPursueMarriageWithNpc(selectedNpc.value)) return false
    if (selectedNpcState.value?.dating) return false
    if (selectedNpcState.value?.married) return false
    if (selectedNpcState.value?.zhiji) return false
    if (npcStore.npcStates.some(s => s.married)) return false
    if ((selectedNpcState.value?.friendship ?? 0) < 2000) return false
    if (!inventoryStore.hasItem('silk_ribbon')) return false
    return true
  })

  /** 是否可以求婚 */
  const canPropose = computed(() => {
    if (!selectedNpcDef.value?.marriageable) return false
    if (!npcStore.canPursueMarriageWithNpc(selectedNpc.value)) return false
    if (!selectedNpcState.value?.dating) return false
    if (selectedNpcState.value?.married) return false
    if (selectedNpcState.value?.zhiji) return false
    if (npcStore.npcStates.some(s => s.married)) return false
    if (npcStore.weddingCountdown > 0) return false
    if ((selectedNpcState.value?.friendship ?? 0) < 2500) return false
    if (!inventoryStore.hasItem('jade_ring')) return false
    return true
  })

  /** 是否可以结为知己 */
  const canBecomeZhiji = computed(() => {
    if (!selectedNpcDef.value?.marriageable) return false
    if (selectedNpcDef.value.gender !== playerStore.gender) return false
    if (selectedNpcState.value?.zhiji || selectedNpcState.value?.dating || selectedNpcState.value?.married) return false
    if (npcStore.npcStates.some(s => s.zhiji)) return false
    if ((selectedNpcState.value?.friendship ?? 0) < 2000) return false
    if (!inventoryStore.hasItem('zhiji_jade')) return false
    return true
  })

  const SEASON_NAMES_MAP: Record<string, string> = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' }

  const qualityTextClass = (q: Quality, fallback = ''): string => {
    if (q === 'fine') return 'text-quality-fine'
    if (q === 'excellent') return 'text-quality-excellent'
    if (q === 'supreme') return 'text-quality-supreme'
    return fallback
  }

  const QUALITY_NAMES: Record<Quality, string> = {
    normal: '普通',
    fine: '优良',
    excellent: '精品',
    supreme: '极品'
  }

  // === 送礼偏好 ===

  type GiftPreference = 'loved' | 'liked' | 'hated' | 'neutral'

  const getGiftPreference = (itemId: string): GiftPreference => {
    const npcDef = selectedNpcDef.value
    if (!npcDef) return 'neutral'
    if (npcDef.lovedItems.includes(itemId)) return 'loved'
    if (npcDef.likedItems.includes(itemId)) return 'liked'
    if (npcDef.hatedItems.includes(itemId)) return 'hated'
    return 'neutral'
  }

  const GIFT_PREF_LABELS: Record<GiftPreference, string> = {
    loved: '最爱',
    liked: '喜欢',
    hated: '讨厌',
    neutral: ''
  }
  const GIFT_PREF_CLASS: Record<GiftPreference, string> = {
    loved: 'text-danger',
    liked: 'text-success',
    hated: 'text-muted',
    neutral: ''
  }
  const GIFT_PREF_ORDER: Record<GiftPreference, number> = {
    loved: 0,
    liked: 1,
    neutral: 2,
    hated: 3
  }
  const GIFT_REACTION_TEXT: Record<GiftPreference, string> = {
    loved: '非常喜欢',
    liked: '还不错',
    hated: '讨厌',
    neutral: '一般'
  }

  const activeGiftReaction = computed(() => {
    if (!activeGiftItem.value || !selectedNpcDef.value) return null
    const pref = getGiftPreference(activeGiftItem.value.itemId)
    return { text: GIFT_REACTION_TEXT[pref], className: GIFT_PREF_CLASS[pref] }
  })

  const levelColor = (level: FriendshipLevel): string => {
    switch (level) {
      case 'stranger':
        return 'text-muted'
      case 'acquaintance':
        return 'text-water'
      case 'friendly':
        return 'text-success'
      case 'bestFriend':
        return 'text-accent'
    }
  }

  const getHeartEventTitle = (eventId: string): string => {
    return getHeartEventById(eventId)?.title ?? eventId
  }

  const handleTalk = () => {
    if (!selectedNpc.value) return
    if (!canInteractWithSelectedNpc.value) {
      addLog(unavailableInteractionReason.value || '现在没找到对方。')
      return
    }
    if (gameStore.isPastBedtime) {
      addLog('太晚了，人家都睡了。')
      handleEndDay()
      return
    }
    const result = npcStore.talkTo(selectedNpc.value)
    if (result) {
      dialogueText.value = result.message
      addLog(`与${selectedNpcDef.value?.name}聊天。(+${result.friendshipGain}好感)`)
      result.unlockedMessages?.forEach(message => addLog(message))

      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.talk)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) {
        handleEndDay()
        return
      }

      // 检查心事件触发
      const heartEvent = npcStore.checkHeartEvent(selectedNpc.value)
      if (heartEvent) {
        triggerHeartEvent(heartEvent)
      }
    }
  }

  const handleDailyTip = () => {
    if (!selectedNpc.value) return
    if (!canInteractWithSelectedNpc.value) {
      addLog(unavailableInteractionReason.value || '现在没找到对方。')
      return
    }
    const tip = npcStore.getDailyTip(selectedNpc.value)
    if (tip) {
      dialogueText.value = tip
      addLog(`${selectedNpcDef.value?.name}告诉了你一些有用的信息。`)
    }
  }

  const handleGift = (itemId: string, quality: Quality = 'normal') => {
    if (!selectedNpc.value) return
    if (!canInteractWithSelectedNpc.value) {
      addLog(unavailableInteractionReason.value || '现在没法把礼物送到对方手里。')
      return
    }
    const cookingGiftBonus = cookingStore.activeBuff?.type === 'giftBonus' ? cookingStore.activeBuff.value : 1
    const ringGiftBonus = inventoryStore.getRingEffectValue('gift_friendship')
    const giftMultiplier = cookingGiftBonus * (1 + ringGiftBonus)
    const result = npcStore.giveGift(selectedNpc.value, itemId, giftMultiplier, quality)
    if (result) {
      const itemName = getItemById(itemId)?.name ?? itemId
      const npcName = selectedNpcDef.value?.name
      if (result.gain > 0) {
        addLog(`送给${npcName}${itemName}，${npcName}觉得${result.reaction}。(+${result.gain}好感)`)
      } else if (result.gain < 0) {
        addLog(`送给${npcName}${itemName}，${npcName}${result.reaction}这个……(${result.gain}好感)`)
      } else {
        addLog(`送给${npcName}${itemName}，${npcName}觉得${result.reaction}。`)
      }

      if (result.returnedGift) {
        addLog(result.returnedGift.summary)
      }
      result.unlockedMessages?.forEach(message => addLog(message))

      // 关闭送礼弹窗
      activeGiftKey.value = null

      // 送礼后也检查心事件
      const heartEvent = npcStore.checkHeartEvent(selectedNpc.value)
      if (heartEvent) {
        triggerHeartEvent(heartEvent)
      }
    }
  }

  const handlePropose = () => {
    if (!selectedNpc.value) return
    if (!canInteractWithSelectedNpc.value) {
      addLog(unavailableInteractionReason.value || '现在没找到对方。')
      return
    }
    const result = npcStore.propose(selectedNpc.value)
    if (result.success) {
      dialogueText.value = result.message
      addLog(result.message)
      result.unlockedMessages?.forEach(message => addLog(message))
    } else {
      addLog(result.message)
    }
  }

  const handleStartDating = () => {
    if (!selectedNpc.value) return
    if (!canInteractWithSelectedNpc.value) {
      addLog(unavailableInteractionReason.value || '现在没找到对方。')
      return
    }
    const result = npcStore.startDating(selectedNpc.value)
    if (result.success) {
      dialogueText.value = result.message
      addLog(result.message)
      result.unlockedMessages?.forEach(message => addLog(message))
    } else {
      addLog(result.message)
    }
  }

  const handleBecomeZhiji = () => {
    if (!selectedNpc.value) return
    if (!canInteractWithSelectedNpc.value) {
      addLog(unavailableInteractionReason.value || '现在没找到对方。')
      return
    }
    const result = npcStore.becomeZhiji(selectedNpc.value)
    if (result.success) {
      dialogueText.value = result.message
      addLog(result.message)
      result.unlockedMessages?.forEach(message => addLog(message))
    } else {
      addLog(result.message)
    }
  }

  const handleDissolveZhiji = () => {
    const result = npcStore.dissolveZhiji()
    if (result.success) {
      addLog(result.message)
      dialogueText.value = result.message
    } else {
      addLog(result.message)
    }
    showZhijiDissolveConfirm.value = false
  }

  const handleDivorce = () => {
    const result = npcStore.divorce()
    if (result.success) {
      addLog(result.message)
      dialogueText.value = result.message
    } else {
      addLog(result.message)
    }
    showDivorceConfirm.value = false
  }
</script>
