<template>
  <div data-testid="npc-view">
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
    <Transition name="tab-panel-switch" mode="out-in">
      <div :key="activeTab">
    <div v-if="activeTab === 'villager'">
      <p v-if="tutorialHint" class="tutorial-hint mb-2">{{ tutorialHint }}</p>
      <!-- 固定村民快捷区：手机端先给聊天和送礼入口，再展示长线关系信息。 -->
      <div class="mb-3" data-testid="npc-quick-grid">
        <div class="grid grid-cols-2 md:grid-cols-3 gap-1.5 md:gap-2">
          <div
            v-for="npc in NPCS"
            :key="npc.id"
            class="relative border border-accent/20 rounded-xs p-2 pr-14 transition-colors min-h-[7.25rem] md:min-h-[5.75rem]"
            :class="[npcAvailable(npc.id) ? 'cursor-pointer hover:bg-accent/5' : 'cursor-pointer opacity-70 hover:bg-accent/5', 'text-center md:text-left']"
            :data-testid="`npc-quick-card-${npc.id}`"
            @click="handleSelectNpc(npc.id)"
          >
            <div class="absolute right-1.5 top-1.5 z-10 flex items-center gap-1">
              <Button
                class="!h-7 !w-7 !px-0 !py-0 justify-center"
                :icon="MessageCircle"
                :icon-size="12"
                :disabled="!canQuickTalkWithNpc(npc.id)"
                :aria-label="`和${npc.name}聊天`"
                :title="`和${npc.name}聊天`"
                :data-testid="`npc-quick-talk-${npc.id}`"
                @click.stop="handleQuickTalkNpc(npc.id)"
              />
              <Button
                class="!h-7 !w-7 !px-0 !py-0 justify-center"
                :icon="Gift"
                :icon-size="12"
                :disabled="!canQuickGiftWithNpc(npc.id)"
                :aria-label="`给${npc.name}送礼`"
                :title="`给${npc.name}送礼`"
                :data-testid="`npc-quick-gift-${npc.id}`"
                @click.stop="handleQuickGiftNpc(npc.id)"
              />
            </div>

            <!-- 移动端：两列卡片，核心状态一眼能扫到。 -->
            <div class="md:hidden">
              <NpcPortrait
                class="mx-auto mb-1"
                :id="npc.id"
                :name="npc.name"
                :fallback-text="npc.name"
                size="xs"
              />
              <p class="text-xs truncate" :class="levelColor(npcStore.getFriendshipLevel(npc.id))">
                {{ npc.name }}
              </p>
              <p class="text-[0.625rem] text-muted truncate">
                {{ npcStore.getRelationshipStageText(npc.id) }} · {{ npcStore.getScheduleStatus(npc.id).location }}
              </p>
              <p class="text-[0.625rem] flex items-center justify-center" :class="heartCount(npc.id) > 0 ? 'text-danger' : 'text-muted/30'">
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

            <!-- 桌面端：保留更完整的信息密度。 -->
            <div class="hidden md:flex items-start gap-2">
              <NpcPortrait
                :id="npc.id"
                :name="npc.name"
                :fallback-text="npc.name"
                size="sm"
              />
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs truncate" :class="levelColor(npcStore.getFriendshipLevel(npc.id))">
                    {{ npc.name }}
                    <span v-if="npcStore.getNpcState(npc.id)?.married" class="text-danger text-[0.625rem] ml-0.5">[伴侣]</span>
                    <span v-else-if="npcStore.getNpcState(npc.id)?.dating" class="text-danger/70 text-[0.625rem] ml-0.5">[约会中]</span>
                    <span v-else-if="npcStore.getNpcState(npc.id)?.zhiji" class="text-accent text-[0.625rem] ml-0.5">[知己]</span>
                  </span>
                </div>
                <p class="text-[0.625rem] text-muted truncate">{{ npc.role }}</p>
                <p class="text-[0.625rem] text-muted/70 truncate">
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
                  <span class="text-[0.625rem] text-muted/50">{{ npcStore.getNpcState(npc.id)?.friendship ?? 0 }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <GuidanceDigestPanel surface-id="npc" title="陪伴关系引导" />
      <QaGovernancePanel page-id="npc" title="陪伴治理总览" />
      <FamilyRelationGraph
        @select-npc="handleSelectNpc"
        @quick-talk-npc="handleQuickTalkNpc"
        @quick-gift-npc="handleQuickGiftNpc"
      />

      <div class="border border-accent/20 rounded-xs p-2 mb-3 bg-accent/5">
        <div class="flex items-center justify-between gap-2">
          <div>
            <p class="text-xs text-accent">陪伴总览</p>
            <p class="text-[0.625rem] text-muted mt-0.5">婚后分工、家庭心愿与挚友协作已经接入统一关系线入口。</p>
          </div>
          <span class="text-[0.625rem] text-muted whitespace-nowrap">{{ relationshipDebugSnapshot.contentTier }}</span>
        </div>
        <div class="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-[0.625rem]">
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
        <p class="text-[0.625rem] text-muted mt-2 leading-4">
          {{
            activeFamilyWishDef
              ? `当前进度：${familyWishOverview.state.progress}/${Math.max(1, familyWishOverview.state.targetValue)}，建议围绕 ${activeFamilyWishDef.title} 安排本周陪伴节奏。`
              : '当前尚未激活家庭心愿；后续页面会优先围绕婚后分工、知己协作与孩子成长组织新一轮家庭目标。'
          }}
        </p>
        <div v-if="activeFamilyWishChain?.steps?.length" class="border border-accent/10 rounded-xs p-2 mt-2 bg-bg/10">
          <p class="text-[0.625rem] text-muted mb-1">家庭事件链</p>
          <div v-for="step in activeFamilyWishChain.steps" :key="step.id" class="flex items-start justify-between gap-2 text-[0.625rem] mt-1 first:mt-0">
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
          <p class="text-[0.625rem] text-muted mb-1">知己协作链</p>
          <p class="text-[0.625rem] text-accent">{{ activeZhijiProjectChain.def.label }} · {{ activeZhijiProjectChain.progressLabel }}</p>
          <div v-for="step in activeZhijiProjectChain.steps" :key="step.id" class="flex items-start justify-between gap-2 text-[0.625rem] mt-1 first:mt-0">
            <div class="min-w-0">
              <p class="text-accent">{{ step.title }}</p>
              <p class="text-muted leading-4 mt-0.5">{{ step.summary }}</p>
            </div>
            <span :class="step.status === 'completed' ? 'text-success' : step.status === 'active' ? 'text-warning' : 'text-muted'">
              {{ step.status === 'completed' ? '已完成' : step.status === 'active' ? '当前步骤' : '待推进' }}
            </span>
          </div>
        </div>
        <div v-if="randomNpcBoard.relationshipMilestoneAudit.length > 0" class="border border-warning/20 rounded-xs p-2 mt-2 bg-warning/5" data-testid="random-npc-relationship-audit">
          <div class="flex items-center justify-between gap-2 mb-1">
            <p class="text-[0.625rem] text-warning">随机来访关系回看</p>
            <span class="text-[0.625rem] text-muted">最近 {{ randomNpcBoard.relationshipMilestoneAudit.length }}/24 条 · 本地存档</span>
          </div>
          <p class="text-[0.625rem] text-muted leading-4">
            本地存档已保留关键关系节点，用于读档后防止重复推进；普通游玩不会公开这些记录。
          </p>
          <div
            v-for="entry in recentRelationshipMilestoneAuditEntries"
            :key="entry.id"
            class="text-[0.625rem] border-t border-warning/10 py-1 mt-1 first:border-t-0 first:pt-0 last:pb-0"
            :data-testid="`random-npc-relationship-audit-${entry.action}`"
          >
            <div class="flex items-start justify-between gap-2">
              <p class="text-warning min-w-0">{{ entry.dayTag }} · {{ entry.npcName }}</p>
              <span class="text-muted shrink-0">{{ getRandomNpcRelationshipAuditActionLabel(entry.action) }}</span>
            </div>
            <p class="text-muted leading-4">{{ getRandomNpcRelationshipAuditSummary(entry) }}</p>
            <OnlineTechnicalDetails
              v-if="saveStore.isBuiltInSampleRuntime"
              class="mt-1"
              title="关系回看核对"
              summary="样例档回看时用于核对本地存档节点，默认不进入玩家主信息层。"
              tone="warning"
              :copyable="[
                `记录编号：${entry.id}`,
                `动作：${getRandomNpcRelationshipAuditActionLabel(entry.action)}`,
                `对象：${entry.npcName}`,
                `校验码：${entry.idempotencyKey}`
              ]"
            >
              <dl class="grid gap-1" data-testid="random-npc-relationship-audit-technical-detail">
                <div>
                  <dt class="text-accent">动作</dt>
                  <dd class="break-all">{{ getRandomNpcRelationshipAuditActionLabel(entry.action) }}</dd>
                </div>
                <div>
                  <dt class="text-accent">对象</dt>
                  <dd class="break-all">{{ entry.npcName }}</dd>
                </div>
                <div>
                  <dt class="text-accent">校验码</dt>
                  <dd class="break-all">{{ entry.idempotencyKey ? '已写入' : '未记录' }}</dd>
                </div>
                <div>
                  <dt class="text-accent">保存范围</dt>
                  <dd class="break-all">仅本地存档</dd>
                </div>
              </dl>
            </OnlineTechnicalDetails>
          </div>
        </div>
      </div>

      <div v-if="randomNpcBoard.generationAnomalyAudit.length > 0" class="border border-danger/20 rounded-xs p-2 mb-3 bg-danger/5" data-testid="random-npc-generation-anomaly-audit">
        <div class="flex items-center justify-between gap-2 mb-1">
          <p class="text-[0.625rem] text-danger">随机来访存档修复</p>
          <span class="text-[0.625rem] text-muted">最近 {{ randomNpcBoard.generationAnomalyAudit.length }}/12 条 · 本地存档</span>
        </div>
        <p class="text-[0.625rem] text-muted leading-4">
          读档时发现来访记录数量或模板引用异常，系统已按本地护栏收束到安全范围。
        </p>
        <div
          v-for="entry in recentGenerationAnomalyAuditEntries"
          :key="entry.id"
          class="text-[0.625rem] border-t border-danger/10 py-1 mt-1 first:border-t-0 first:pt-0 last:pb-0"
          :data-testid="`random-npc-generation-anomaly-${entry.action}`"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="text-danger min-w-0">{{ entry.weekId || entry.dayTag }} · {{ getRandomNpcGenerationAnomalyActionLabel(entry.action) }}</p>
            <span class="text-muted shrink-0">{{ entry.observedCount }}/{{ entry.limit }}</span>
          </div>
          <p class="text-muted leading-4">{{ getRandomNpcGenerationAnomalySummary(entry) }}</p>
          <OnlineTechnicalDetails
            v-if="saveStore.isBuiltInSampleRuntime"
            class="mt-1"
            title="生成修复核对"
            summary="样例档回看时用于核对本地修复证据，默认不进入玩家主信息层。"
            tone="danger"
            :copyable="[
              `记录编号：${entry.id}`,
              `处理：${getRandomNpcGenerationAnomalyActionLabel(entry.action)}`,
              `校验码：${entry.idempotencyKey}`
            ]"
          >
            <dl class="grid gap-1" data-testid="random-npc-generation-anomaly-technical-detail">
              <div>
                <dt class="text-accent">处理</dt>
                <dd class="break-all">{{ getRandomNpcGenerationAnomalyActionLabel(entry.action) }}</dd>
              </div>
              <div>
                <dt class="text-accent">来访记录</dt>
                <dd class="break-all">{{ entry.visitorIds.length || 0 }} 条</dd>
              </div>
              <div>
                <dt class="text-accent">模板记录</dt>
                <dd class="break-all">{{ entry.templateIds.length || 0 }} 条</dd>
              </div>
              <div>
                <dt class="text-accent">校验码</dt>
                <dd class="break-all">{{ entry.idempotencyKey ? '已写入' : '未记录' }}</dd>
              </div>
              <div>
                <dt class="text-accent">保存范围</dt>
                <dd class="break-all">仅本地存档</dd>
              </div>
            </dl>
          </OnlineTechnicalDetails>
        </div>
      </div>

      <div v-if="npcCookingTopicRecords.length > 0" class="border border-water/20 rounded-xs p-2 mb-3 bg-water/5">
        <div class="flex items-center justify-between gap-2 mb-1">
          <div>
            <p class="text-xs text-water">料理话题线索</p>
            <p class="text-[0.625rem] text-muted mt-0.5">最近做过的剧情料理可作为来访闲谈、送礼铺垫或家宴话题。</p>
          </div>
          <span class="text-[0.625rem] text-muted whitespace-nowrap">最近 {{ cookingStore.recentStoryTriggerRecords.length }}/8</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div
            v-for="record in npcCookingTopicRecords"
            :key="`npc-cooking-topic-${record.id}`"
            class="border border-water/15 rounded-xs p-2 bg-bg/10"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-xs text-accent truncate">{{ record.recipeName }} ×{{ record.quantity }}</p>
                <p class="text-[0.625rem] text-muted mt-0.5 truncate">{{ record.categoryLabels.join('、') || '料理' }}</p>
              </div>
              <span class="text-[0.625rem] text-water/80 whitespace-nowrap">{{ getCookingTopicUsageText(record.triggerLabels) }}</span>
            </div>
            <p class="text-[0.625rem] text-muted leading-4 mt-1">{{ record.triggerLabels.join('、') }}</p>
          </div>
        </div>
      </div>

      <div class="border border-accent/20 rounded-xs p-2 mb-3">
        <div class="flex items-center justify-between gap-2 mb-2">
          <div>
            <p class="text-xs text-accent">本周来访</p>
            <p class="text-[0.625rem] text-muted mt-0.5">短访人物只保留本周卡片和最近摘要；喜欢的人可记入熟人册长期回看。</p>
          </div>
          <span class="text-[0.625rem] text-muted whitespace-nowrap">
            熟人 {{ randomNpcBoard.acquaintances.length }}/{{ randomNpcMaxAcquaintances }} · 旧档 {{ randomNpcBoard.recentSummaries.length }}/{{ randomNpcMaxRecentSummaries }} · 锁定 {{ randomNpcLockedArchiveCount }}/{{ randomNpcMaxLockedArchives }}
          </span>
        </div>
        <div v-if="randomNpcBoard.activeVisitors.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div
            v-for="visitor in randomNpcBoard.activeVisitors"
            :key="visitor.id"
            class="border border-accent/10 rounded-xs p-2 bg-bg/10"
            :data-testid="`random-npc-visitor-${visitor.id}`"
          >
            <div class="flex items-start gap-2">
              <NpcPortrait
                class="shrink-0"
                :id="visitor.id"
                :name="visitor.name"
                :display-name="visitor.occupation"
                :template-id="visitor.templateId"
                :fallback-text="visitor.name"
                size="sm"
              />
              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="text-xs text-accent truncate">
                      {{ visitor.name }}
                      <span class="text-[0.625rem] text-muted ml-1">{{ visitor.occupation }}</span>
                    </p>
                    <p class="text-[0.625rem] text-muted mt-0.5 truncate">{{ visitor.origin }} · {{ getRandomNpcAgeBandLabel(visitor.ageBand) }} · {{ getRandomNpcRelationshipLabel(visitor.relationshipTag) }}</p>
                  </div>
                  <span class="text-[0.625rem] shrink-0" :class="visitor.locked ? 'text-warning' : visitor.tier === 'short_visit' ? 'text-muted' : 'text-success'">
                    {{ visitor.locked ? '锁定 · ' : '' }}{{ getRandomNpcVisitTierLabel(visitor.tier) }}
                  </span>
                </div>
                <div class="flex flex-wrap gap-1 mt-1">
                  <span
                    v-for="tag in visitor.personalityTags"
                    :key="`${visitor.id}-${tag}`"
                    class="text-[0.625rem] border border-accent/15 text-accent/80 rounded-xs px-1 py-0.5"
                  >
                    {{ tag }}
                  </span>
                  <span class="text-[0.625rem] border border-warning/20 text-warning rounded-xs px-1 py-0.5">{{ visitor.plotHook }}</span>
                </div>
                <p class="text-[0.625rem] text-muted leading-4 mt-1 line-clamp-2">{{ visitor.dialogueOpening }}</p>
                <p class="text-[0.625rem] text-accent/90 leading-4 mt-1 truncate">{{ getRandomNpcRelationshipSignalText(visitor.relationshipSignals) }}</p>
                <p class="text-[0.625rem] text-muted leading-4 mt-1" :data-testid="`random-npc-last-event-${visitor.id}`">
                  {{ getLastRandomNpcEvent(visitor) }}
                </p>
                <div class="flex items-center justify-end mt-2">
                  <Button
                    class="justify-center !px-2 !py-1"
                    :icon="PanelRightOpen"
                    :data-testid="`random-npc-card-open-visitor-${visitor.id}`"
                    @click="openRandomNpcDetail('visitor', visitor.id, 'story')"
                  >
                    详情
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="randomNpcBoard.acquaintances.length > 0" class="border border-success/20 rounded-xs p-2 mt-2 bg-success/5">
          <div class="flex items-center justify-between gap-2 mb-1">
            <p class="text-[0.625rem] text-success">熟人册</p>
            <span class="text-[0.625rem] text-muted">保留关系、偏好与关键事件</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div
              v-for="acquaintance in randomNpcBoard.acquaintances"
              :key="acquaintance.visitorId"
              class="border border-success/15 rounded-xs p-2 bg-bg/10"
            >
              <div class="flex items-start gap-2">
                <NpcPortrait
                  class="shrink-0"
                  :id="acquaintance.visitorId"
                  :name="acquaintance.name"
                  :display-name="acquaintance.occupation"
                  :template-id="acquaintance.templateId"
                  :fallback-text="acquaintance.name"
                  size="sm"
                />
                <div class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="text-xs text-accent truncate">
                        {{ acquaintance.name }}
                        <span class="text-[0.625rem] text-muted ml-1">{{ acquaintance.occupation }}</span>
                      </p>
                      <p class="text-[0.625rem] text-muted mt-0.5 truncate">
                        {{ acquaintance.origin }} · {{ getRandomNpcAgeBandLabel(acquaintance.ageBand) }} · {{ getRandomNpcRelationshipLabel(acquaintance.relationshipTag) }}
                      </p>
                    </div>
                    <span class="text-[0.625rem] text-success shrink-0">好感 {{ acquaintance.affinity }}</span>
                  </div>
                  <div class="flex flex-wrap gap-1 mt-1">
                    <span
                      v-for="tag in acquaintance.personalityTags"
                      :key="`${acquaintance.visitorId}-${tag}`"
                      class="text-[0.625rem] border border-accent/15 text-accent/80 rounded-xs px-1 py-0.5"
                    >
                      {{ tag }}
                    </span>
                    <span class="text-[0.625rem] border border-warning/20 text-warning rounded-xs px-1 py-0.5">{{ acquaintance.plotHook }}</span>
                  </div>
                  <div class="grid grid-cols-2 gap-1 mt-2 text-[0.625rem]">
                    <div class="border border-accent/10 rounded-xs px-1.5 py-1">
                      <span class="text-muted/60">初见</span>
                      <p class="text-muted mt-0.5 truncate">{{ acquaintance.firstMetDayTag || acquaintance.firstMetWeekId }}</p>
                    </div>
                    <div class="border border-accent/10 rounded-xs px-1.5 py-1">
                      <span class="text-muted/60">最近</span>
                      <p class="text-muted mt-0.5 truncate">{{ acquaintance.lastSeenDayTag || '本周' }}</p>
                    </div>
                  </div>
                  <p class="text-[0.625rem] text-accent/90 leading-4 mt-1 truncate">{{ getRandomNpcRelationshipSignalText(acquaintance.relationshipSignals) }}</p>
                  <p class="text-[0.625rem] text-muted leading-4 mt-1 line-clamp-2">{{ getLastRandomNpcAcquaintanceEvent(acquaintance) }}</p>
                  <div class="flex items-center justify-end mt-2">
                    <Button
                      class="justify-center !px-2 !py-1"
                      :icon="PanelRightOpen"
                      :data-testid="`random-npc-card-open-acquaintance-${acquaintance.visitorId}`"
                      @click="openRandomNpcDetail('acquaintance', acquaintance.visitorId, 'story')"
                    >
                      详情
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="randomNpcBoard.longStayResidents.length > 0" class="border border-accent/20 rounded-xs p-2 mt-2 bg-accent/5">
          <div class="flex items-center justify-between gap-2 mb-1">
            <p class="text-[0.625rem] text-accent">长住 NPC</p>
            <span class="text-[0.625rem] text-muted">长住 {{ randomNpcBoard.longStayResidents.length }}/{{ randomNpcMaxLongStayResidents }}</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div
              v-for="resident in randomNpcBoard.longStayResidents"
              :key="resident.residentId"
              class="border border-accent/15 rounded-xs p-2 bg-bg/10"
            >
              <div class="flex items-start gap-2">
                <NpcPortrait
                  class="shrink-0"
                  :id="resident.residentId"
                  :name="resident.name"
                  :display-name="resident.occupation"
                  :template-id="resident.templateId"
                  :fallback-text="resident.name"
                  size="sm"
                />
                <div class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="text-xs text-accent truncate">
                        {{ resident.name }}
                        <span class="text-[0.625rem] text-muted ml-1">{{ resident.occupation }}</span>
                      </p>
                      <p class="text-[0.625rem] text-muted mt-0.5 truncate">
                        {{ getRandomNpcLongStayRouteLabel(resident.route) }} · {{ resident.origin }} · {{ getRandomNpcRelationshipLabel(resident.relationshipTag) }}
                      </p>
                    </div>
                    <span class="text-[0.625rem] text-success shrink-0">阶段 {{ resident.relationshipEventStage }}/3</span>
                  </div>
                  <div class="flex flex-wrap gap-1 mt-1">
                    <span
                      v-for="tag in resident.personalityTags"
                      :key="`${resident.residentId}-${tag}`"
                      class="text-[0.625rem] border border-accent/15 text-accent/80 rounded-xs px-1 py-0.5"
                    >
                      {{ tag }}
                    </span>
                    <span class="text-[0.625rem] border border-warning/20 text-warning rounded-xs px-1 py-0.5">{{ resident.plotHook }}</span>
                  </div>
                  <p class="text-[0.625rem] text-muted leading-4 mt-1 line-clamp-2">{{ resident.residenceReason }}</p>
                  <p class="text-[0.625rem] text-accent/90 leading-4 mt-1 truncate">{{ getRandomNpcRelationshipSignalText(resident.relationshipSignals) }}</p>
                  <p class="text-[0.625rem] text-success/80 leading-4 mt-1 line-clamp-2">{{ getLastRandomNpcLongStayEvent(resident) }}</p>
                  <div class="flex items-center justify-end mt-2">
                    <Button
                      class="justify-center !px-2 !py-1"
                      :icon="PanelRightOpen"
                      :data-testid="`random-npc-card-open-resident-${resident.residentId}`"
                      @click="openRandomNpcDetail('resident', resident.residentId, 'overview')"
                    >
                      详情
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="randomNpcBoard.recentSummaries.length > 0" class="border border-accent/10 rounded-xs p-2 mt-2">
          <div class="flex flex-wrap items-center justify-between gap-1.5 mb-1">
            <p class="text-[0.625rem] text-muted">旧日来客摘要</p>
            <span class="text-[0.625rem] text-muted">最多 {{ randomNpcMaxRecentSummaries }} 条，锁定 {{ randomNpcMaxLockedArchives }} 条</span>
          </div>
          <div
            v-for="summary in randomNpcBoard.recentSummaries"
            :key="summary.visitorId"
            class="text-[0.625rem] border-t border-accent/10 py-2 first:border-t-0 first:pt-0 last:pb-0"
          >
            <div class="flex flex-col gap-1.5 md:flex-row md:items-start md:justify-between md:gap-2">
              <div class="min-w-0 md:flex-1">
                <p class="text-accent leading-4">
                  {{ summary.name }} · {{ getRandomNpcRelationshipLabel(summary.relationshipTag) }} · {{ summary.affinity }}
                  <span v-if="summary.archivedTier === 'long_stay'" class="text-accent">· 长住旧档</span>
                  <span v-if="summary.locked" class="text-warning">· 已锁定</span>
                </p>
                <p class="text-muted leading-4 mt-0.5">{{ summary.summary }}</p>
              </div>
              <div class="grid grid-cols-2 gap-1 sm:grid-cols-3 md:flex md:shrink-0 md:flex-wrap md:items-center md:justify-end">
                <Button
                  class="w-full justify-center !px-2 !py-1 md:w-auto"
                  :icon="PanelRightOpen"
                  :data-testid="`random-npc-card-open-archive-${summary.visitorId}`"
                  @click="openRandomNpcDetail('archive', summary.visitorId, 'overview')"
                >
                  详情
                </Button>
                <Button
                  class="w-full justify-center !px-2 !py-1 md:w-auto"
                  :icon="Star"
                  :class="{ '!bg-warning !text-bg': summary.locked }"
                  :disabled="!summary.locked && !canLockMoreRandomNpc(summary.visitorId)"
                  :data-testid="`random-npc-archive-lock-${summary.visitorId}`"
                  @click="handleToggleRandomNpcLock(summary.visitorId, !summary.locked)"
                >
                  {{ summary.locked ? '取消' : '锁定' }}
                </Button>
                <Button
                  class="w-full justify-center !px-2 !py-1 md:w-auto"
                  :icon="RotateCcw"
                  :disabled="!canRecallRandomNpcArchive(summary)"
                  :data-testid="`random-npc-archive-recall-${summary.visitorId}`"
                  @click="handleRecallRandomNpcArchive(summary.visitorId)"
                >
                  召回
                </Button>
                <Button
                  class="w-full justify-center !px-2 !py-1 md:w-auto"
                  :icon="Mail"
                  :disabled="!canRecallRandomNpcArchiveByOldLetter(summary)"
                  :data-testid="`random-npc-archive-old-letter-${summary.visitorId}`"
                  @click="handleRecallRandomNpcArchiveByOldLetter(summary.visitorId)"
                >
                  寄旧信
                </Button>
                <Button
                  class="w-full justify-center !px-2 !py-1 md:w-auto"
                  :icon="Package"
                  :disabled="!canRecallRandomNpcArchiveByOldKeepsake(summary)"
                  :data-testid="`random-npc-archive-old-keepsake-${summary.visitorId}`"
                  @click="handleRecallRandomNpcArchiveByOldKeepsake(summary.visitorId)"
                >
                  托旧物
                </Button>
                <Button
                  class="col-span-2 w-full justify-center !px-2 !py-1 sm:col-span-1 md:w-auto"
                  :icon="Sparkles"
                  :disabled="!canRecallRandomNpcArchiveByFestivalReunion(summary)"
                  :data-testid="`random-npc-archive-festival-reunion-${summary.visitorId}`"
                  @click="handleRecallRandomNpcArchiveByFestivalReunion(summary.visitorId)"
                >
                  节会重逢
                </Button>
              </div>
            </div>
            <p class="text-[0.625rem] text-muted leading-4 mt-0.5">
              旧信消耗 {{ randomNpcOldLetterItemName }}×{{ randomNpcOldLetterCostQuantity }}；旧物消耗 {{ randomNpcOldKeepsakeItemName }}×{{ randomNpcOldKeepsakeCostQuantity }}；节会重逢需今日有节会（{{ randomNpcFestivalReunionEventName }}），仍受本周短访 / 长住名额上限约束。
            </p>
          </div>
        </div>
      </div>

      <OnlineBottomSheet
        :open="hasSelectedRandomNpcDetail"
        :title="randomNpcDetailTitle"
        :description="randomNpcDetailDescription"
        :side="randomNpcDetailSheetSide"
        initial-focus="[data-testid='random-npc-detail-primary-action']"
        @close="closeRandomNpcDetail"
      >
        <!-- Guard anchors: getRecentRandomNpcDialogueMemories(visitor.dialogueMemories); getRecentRandomNpcDialogueMemories(acquaintance.dialogueMemories); getRecentRandomNpcDialogueMemories(resident.dialogueMemories); getRecentRandomNpcFamilyReviews(resident); getRecentRandomNpcFamilySpecialEvents(resident). -->
        <div data-testid="random-npc-detail-sheet" class="space-y-3">
          <div class="grid grid-cols-4 gap-1">
            <Button
              v-for="tab in randomNpcDetailTabs"
              :key="tab.id"
              class="justify-center !px-2 !py-1"
              :class="{ '!bg-accent !text-bg': randomNpcDetailTab === tab.id }"
              :data-testid="`random-npc-detail-tab-${tab.id}`"
              @click="randomNpcDetailTab = tab.id"
            >
              {{ tab.label }}
            </Button>
          </div>

          <div v-if="selectedRandomNpcVisitor" class="space-y-2">
            <div v-show="randomNpcDetailTab === 'overview'" class="space-y-2">
              <div class="flex items-start gap-2 border border-accent/10 rounded-xs p-2 bg-bg/10">
                <NpcPortrait
                  class="shrink-0"
                  :id="selectedRandomNpcVisitor.id"
                  :name="selectedRandomNpcVisitor.name"
                  :display-name="selectedRandomNpcVisitor.occupation"
                  :template-id="selectedRandomNpcVisitor.templateId"
                  :fallback-text="selectedRandomNpcVisitor.name"
                  size="sm"
                />
                <div class="min-w-0 flex-1">
                  <p class="text-xs text-accent truncate">{{ selectedRandomNpcVisitor.name }} · {{ selectedRandomNpcVisitor.occupation }}</p>
                  <p class="text-[0.625rem] text-muted mt-0.5 leading-4">{{ selectedRandomNpcVisitor.origin }} · {{ getRandomNpcAgeBandLabel(selectedRandomNpcVisitor.ageBand) }} · {{ getRandomNpcRelationshipLabel(selectedRandomNpcVisitor.relationshipTag) }}</p>
                  <p class="text-[0.625rem] text-muted leading-4 mt-1">{{ selectedRandomNpcVisitor.dialogueOpening }}</p>
                </div>
              </div>
              <div class="border border-accent/10 rounded-xs p-2 text-[0.625rem]">
                <p class="text-muted">人物卡</p>
                <p class="text-accent/90 leading-4 mt-0.5">外貌：{{ selectedRandomNpcVisitor.appearanceKeywords.join('、') }}</p>
                <p class="text-muted leading-4 mt-0.5">来村目的：{{ selectedRandomNpcVisitor.villagePurpose }}</p>
                <p class="text-muted leading-4 mt-0.5">恋爱观：{{ selectedRandomNpcVisitor.romanceView }}</p>
                <p class="text-muted leading-4 mt-0.5">发展路线：{{ getRandomNpcDevelopmentRouteText(selectedRandomNpcVisitor.developmentRoutes) }}</p>
                <p class="text-muted leading-4 mt-0.5">对话场景：{{ getRandomNpcDialogueSceneText(selectedRandomNpcVisitor.dialogueScenes) }}</p>
                <p class="text-muted leading-4 mt-0.5">绑定偏好：{{ getRandomNpcBindingPreferenceText(selectedRandomNpcVisitor.preferences.bindings) }}</p>
              </div>
              <div class="grid grid-cols-2 gap-1 text-[0.625rem]">
                <div class="border border-accent/10 rounded-xs px-1.5 py-1">
                  <span class="text-muted/60">好感</span>
                  <p class="text-accent mt-0.5">{{ selectedRandomNpcVisitor.affinity }}/100</p>
                </div>
                <div class="border border-accent/10 rounded-xs px-1.5 py-1">
                  <span class="text-muted/60">忌讳</span>
                  <p class="text-muted mt-0.5">{{ selectedRandomNpcVisitor.taboo }}</p>
                </div>
              </div>
              <div class="border border-accent/10 rounded-xs p-2 text-[0.625rem]">
                <p class="text-muted">偏好</p>
                <p class="text-accent/90 leading-4 mt-0.5">
                  最爱 {{ getRandomNpcPreferenceNames(selectedRandomNpcVisitor.preferences.loved) }}；喜欢 {{ getRandomNpcPreferenceNames(selectedRandomNpcVisitor.preferences.liked) }}
                </p>
                <p class="text-muted leading-4 mt-0.5">禁忌：{{ selectedRandomNpcVisitor.taboo }}</p>
              </div>
            </div>

            <div v-show="randomNpcDetailTab === 'story'" class="space-y-2">
              <div class="border border-accent/10 rounded-xs p-2">
                <p class="text-[0.625rem] text-muted">文游关键记录</p>
                <p class="text-[0.625rem] text-accent/90 leading-4 mt-0.5">{{ getRandomNpcRelationshipSignalText(selectedRandomNpcVisitor.relationshipSignals) }}</p>
                <div v-if="getRecentRandomNpcDialogueMemories(selectedRandomNpcVisitor.dialogueMemories).length > 0" class="mt-1 space-y-1">
                  <div
                    v-for="memory in getRecentRandomNpcDialogueMemories(selectedRandomNpcVisitor.dialogueMemories)"
                    :key="memory.id"
                    class="text-[0.625rem] border-t border-accent/10 pt-1 first:border-t-0 first:pt-0"
                    :data-testid="`random-npc-dialogue-memory-${selectedRandomNpcVisitor.id}-${memory.choiceId}`"
                  >
                    <p class="text-accent">{{ memory.dayTag }} · {{ getRandomNpcRelationshipDirectionLabel(memory.direction) }} · 好感 {{ memory.affinityChange >= 0 ? '+' : '' }}{{ memory.affinityChange }}</p>
                    <p class="text-muted leading-4">{{ memory.choiceText }}：{{ memory.response }}</p>
                    <p v-if="memory.sceneTitle" class="text-muted leading-4 mt-0.5">触发场景「{{ memory.sceneTitle }}」：{{ memory.sceneSummary }}</p>
                  </div>
                </div>
              </div>
              <div class="space-y-1">
                <Button
                  v-for="choice in selectedRandomNpcVisitor.dialogueChoices"
                  :key="`${selectedRandomNpcVisitor.id}-${choice.id}`"
                  class="w-full justify-start !px-2 !py-1 text-left"
                  :icon="MessageCircle"
                  :disabled="selectedRandomNpcVisitor.talkedToday"
                  :data-testid="`random-npc-choice-${selectedRandomNpcVisitor.id}-${choice.id}`"
                  @click="handleRandomVisitorTalk(selectedRandomNpcVisitor.id, choice.id)"
                >
                  {{ choice.text }}
                </Button>
              </div>
            </div>

            <div v-show="randomNpcDetailTab === 'relationship'" class="space-y-2">
              <div class="border border-accent/10 rounded-xs p-2" :data-testid="`random-npc-growth-preview-${selectedRandomNpcVisitor.id}`">
                <p class="text-[0.625rem] text-muted">自然成长</p>
                <div class="mt-1 space-y-1">
                  <div
                    v-for="beat in getRandomNpcVisitorGrowthPreview(selectedRandomNpcVisitor)"
                    :key="`${selectedRandomNpcVisitor.id}-${beat.id}`"
                    class="text-[0.625rem] border-t border-accent/10 pt-1 first:border-t-0 first:pt-0"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span :class="beat.ready ? 'text-success' : 'text-accent'">{{ beat.title }}</span>
                      <span class="text-muted">{{ beat.progressLabel }}</span>
                    </div>
                    <p class="text-muted leading-4 mt-0.5">{{ beat.sourceSummary }}</p>
                    <p class="text-accent/80 leading-4 mt-0.5">{{ beat.statusLabel }}</p>
                  </div>
                </div>
              </div>
              <div class="border border-accent/10 rounded-xs p-2">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-[0.625rem] text-muted">短线恋爱</p>
                  <span class="text-[0.625rem] text-accent">{{ getRandomNpcShortRomanceStatusText(selectedRandomNpcVisitor.shortRomance) }}</span>
                </div>
                <p class="text-[0.625rem] text-muted leading-4 mt-1">{{ selectedRandomNpcVisitor.shortRomance.note }}</p>
                <div v-if="getRecentRandomNpcShortRomanceHistory(selectedRandomNpcVisitor.shortRomance).length > 0" class="mt-1 space-y-1">
                  <p
                    v-for="event in getRecentRandomNpcShortRomanceHistory(selectedRandomNpcVisitor.shortRomance)"
                    :key="event.id"
                    class="text-[0.625rem] text-muted border-t border-accent/10 pt-1 first:border-t-0 first:pt-0"
                  >
                    {{ event.dayTag }} · {{ event.summary }}
                  </p>
                </div>
                <div class="grid grid-cols-2 gap-1 mt-2">
                  <Button
                    class="justify-center !px-2 !py-1"
                    :disabled="!canStartRandomNpcShortRomance(selectedRandomNpcVisitor.id).success"
                    :data-testid="`random-npc-short-romance-${selectedRandomNpcVisitor.id}`"
                    @click="handleStartRandomNpcShortRomance(selectedRandomNpcVisitor.id)"
                  >
                    暧昧邀约
                  </Button>
                  <Button
                    class="justify-center !px-2 !py-1"
                    :disabled="selectedRandomNpcVisitor.shortRomance.status !== 'invited'"
                    @click="handleEndRandomNpcShortRomance(selectedRandomNpcVisitor.id)"
                  >
                    收束
                  </Button>
                </div>
              </div>
            </div>

            <div v-show="randomNpcDetailTab === 'order'" class="space-y-2">
              <div class="border border-accent/10 rounded-xs p-2">
                <p class="text-[0.625rem] text-muted">小订单：{{ selectedRandomNpcVisitor.smallOrder.title }}</p>
                <p class="text-[0.625rem] text-accent/90 leading-4 mt-0.5">{{ selectedRandomNpcVisitor.smallOrder.summary }}</p>
                <div class="flex flex-wrap gap-1 mt-1">
                  <span
                    v-for="item in selectedRandomNpcVisitor.smallOrder.requestedItems"
                    :key="`${selectedRandomNpcVisitor.id}-${item.itemId}`"
                    class="text-[0.625rem] border border-accent/15 rounded-xs px-1 py-0.5"
                  >
                    {{ getItemById(item.itemId)?.name ?? item.itemId }}×{{ item.quantity }}
                  </span>
                </div>
                <p class="text-[0.625rem] text-success/80 mt-1">{{ selectedRandomNpcVisitor.smallOrder.rewardSummary }}</p>
                <p class="text-[0.625rem] text-muted mt-1">{{ getRandomNpcSmallOrderProgressText(selectedRandomNpcVisitor.smallOrder) }}</p>
                <Button
                  class="w-full justify-center !px-2 !py-1 mt-2"
                  :icon="Package"
                  :disabled="selectedRandomNpcVisitor.smallOrderCompleted || !canFulfillRandomNpcSmallOrder(selectedRandomNpcVisitor.smallOrder)"
                  :data-testid="`random-npc-small-order-${selectedRandomNpcVisitor.id}`"
                  @click="handleFulfillRandomNpcSmallOrder(selectedRandomNpcVisitor.id)"
                >
                  {{ selectedRandomNpcVisitor.smallOrderCompleted ? '已交付' : '交付小订单' }}
                </Button>
              </div>
              <div class="grid grid-cols-1 gap-1">
                <Button
                  class="justify-center !px-2 !py-1"
                  :icon="Star"
                  :class="{ '!bg-warning !text-bg': selectedRandomNpcVisitor.locked }"
                  :disabled="!selectedRandomNpcVisitor.locked && !canLockMoreRandomNpc(selectedRandomNpcVisitor.id)"
                  :data-testid="`random-npc-lock-${selectedRandomNpcVisitor.id}`"
                  @click="handleToggleRandomNpcLock(selectedRandomNpcVisitor.id, !selectedRandomNpcVisitor.locked)"
                >
                  {{ selectedRandomNpcVisitor.locked ? '已锁定' : '锁定' }}
                </Button>
                <Button
                  class="justify-center !px-2 !py-1"
                  :class="{ '!bg-accent !text-bg': selectedRandomNpcVisitor.affinity >= randomNpcAcquaintanceThreshold }"
                  :disabled="selectedRandomNpcVisitor.affinity < randomNpcAcquaintanceThreshold || selectedRandomNpcVisitor.tier !== 'short_visit'"
                  @click="handleAddRandomVisitorToAcquaintance(selectedRandomNpcVisitor.id)"
                >
                  {{ selectedRandomNpcVisitor.tier === 'short_visit' ? '记入熟人册' : '已记录' }}
                </Button>
                <Button
                  v-if="selectedRandomNpcVisitor.tier === 'acquaintance'"
                  class="justify-center !px-2 !py-1"
                  :class="{ '!bg-success !text-bg': selectedRandomNpcVisitor.affinity >= randomNpcLongStayThreshold }"
                  :disabled="selectedRandomNpcVisitor.affinity < randomNpcLongStayThreshold || isRandomNpcLongStay(selectedRandomNpcVisitor.id)"
                  @click="handlePromoteRandomNpcToLongStay(selectedRandomNpcVisitor.id)"
                >
                  {{ isRandomNpcLongStay(selectedRandomNpcVisitor.id) ? '已长住' : '邀长住' }}
                </Button>
              </div>
            </div>
          </div>

          <div v-if="selectedRandomNpcAcquaintance" class="space-y-2">
            <div v-show="randomNpcDetailTab === 'overview'" class="space-y-2">
              <div class="flex items-start gap-2 border border-accent/10 rounded-xs p-2 bg-bg/10">
                <NpcPortrait
                  class="shrink-0"
                  :id="selectedRandomNpcAcquaintance.visitorId"
                  :name="selectedRandomNpcAcquaintance.name"
                  :display-name="selectedRandomNpcAcquaintance.occupation"
                  :template-id="selectedRandomNpcAcquaintance.templateId"
                  :fallback-text="selectedRandomNpcAcquaintance.name"
                  size="sm"
                />
                <div class="min-w-0 flex-1">
                  <p class="text-xs text-accent truncate">{{ selectedRandomNpcAcquaintance.name }} · {{ selectedRandomNpcAcquaintance.occupation }}</p>
                  <p class="text-[0.625rem] text-muted mt-0.5 leading-4">{{ selectedRandomNpcAcquaintance.origin }} · {{ getRandomNpcAgeBandLabel(selectedRandomNpcAcquaintance.ageBand) }} · {{ getRandomNpcRelationshipLabel(selectedRandomNpcAcquaintance.relationshipTag) }}</p>
                  <p class="text-[0.625rem] text-muted leading-4 mt-1">{{ getLastRandomNpcAcquaintanceEvent(selectedRandomNpcAcquaintance) }}</p>
                </div>
              </div>
              <div class="border border-accent/10 rounded-xs p-2 text-[0.625rem]">
                <p class="text-muted">人物卡</p>
                <p class="text-accent/90 leading-4 mt-0.5">外貌：{{ selectedRandomNpcAcquaintance.appearanceKeywords.join('、') }}</p>
                <p class="text-muted leading-4 mt-0.5">来村目的：{{ selectedRandomNpcAcquaintance.villagePurpose }}</p>
                <p class="text-muted leading-4 mt-0.5">恋爱观：{{ selectedRandomNpcAcquaintance.romanceView }}</p>
                <p class="text-muted leading-4 mt-0.5">发展路线：{{ getRandomNpcDevelopmentRouteText(selectedRandomNpcAcquaintance.developmentRoutes) }}</p>
                <p class="text-muted leading-4 mt-0.5">对话场景：{{ getRandomNpcDialogueSceneText(selectedRandomNpcAcquaintance.dialogueScenes) }}</p>
                <p class="text-muted leading-4 mt-0.5">绑定偏好：{{ getRandomNpcBindingPreferenceText(selectedRandomNpcAcquaintance.preferences.bindings) }}</p>
              </div>
              <div class="border border-accent/10 rounded-xs p-2 text-[0.625rem]">
                <p class="text-muted">偏好</p>
                <p class="text-accent/90 leading-4 mt-0.5">
                  最爱 {{ getRandomNpcPreferenceNames(selectedRandomNpcAcquaintance.preferences.loved) }}；喜欢 {{ getRandomNpcPreferenceNames(selectedRandomNpcAcquaintance.preferences.liked) }}
                </p>
                <p class="text-accent/90 leading-4 mt-0.5">绑定偏好：{{ getRandomNpcBindingPreferenceText(selectedRandomNpcAcquaintance.preferences.bindings) }}</p>
                <p class="text-muted leading-4 mt-0.5">家庭线索：{{ selectedRandomNpcAcquaintance.familySeed }}</p>
              </div>
            </div>

            <div v-show="randomNpcDetailTab === 'story'" class="border border-accent/10 rounded-xs p-2">
              <p class="text-[0.625rem] text-muted">文游关键记录</p>
              <p class="text-[0.625rem] text-accent/90 leading-4 mt-0.5">{{ getRandomNpcRelationshipSignalText(selectedRandomNpcAcquaintance.relationshipSignals) }}</p>
              <div v-if="getRecentRandomNpcDialogueMemories(selectedRandomNpcAcquaintance.dialogueMemories).length > 0" class="mt-1 space-y-1">
                <div
                  v-for="memory in getRecentRandomNpcDialogueMemories(selectedRandomNpcAcquaintance.dialogueMemories)"
                  :key="memory.id"
                  class="text-[0.625rem] border-t border-accent/10 pt-1 first:border-t-0 first:pt-0"
                >
                  <p class="text-accent">{{ memory.dayTag }} · {{ getRandomNpcRelationshipDirectionLabel(memory.direction) }}</p>
                  <p class="text-muted leading-4">{{ memory.choiceText }}：{{ memory.response }}</p>
                  <p v-if="memory.sceneTitle" class="text-muted leading-4 mt-0.5">触发场景「{{ memory.sceneTitle }}」：{{ memory.sceneSummary }}</p>
                </div>
              </div>
            </div>

            <div v-show="randomNpcDetailTab === 'relationship'" class="space-y-2">
              <div class="border border-accent/10 rounded-xs p-2" :data-testid="`random-npc-growth-preview-${selectedRandomNpcAcquaintance.visitorId}`">
                <p class="text-[0.625rem] text-muted">自然成长</p>
                <div class="mt-1 space-y-1">
                  <div
                    v-for="beat in getRandomNpcAcquaintanceGrowthPreview(selectedRandomNpcAcquaintance)"
                    :key="`${selectedRandomNpcAcquaintance.visitorId}-${beat.id}`"
                    class="text-[0.625rem] border-t border-accent/10 pt-1 first:border-t-0 first:pt-0"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span :class="beat.ready ? 'text-success' : 'text-accent'">{{ beat.title }}</span>
                      <span class="text-muted">{{ beat.progressLabel }}</span>
                    </div>
                    <p class="text-muted leading-4 mt-0.5">{{ beat.sourceSummary }}</p>
                    <p class="text-accent/80 leading-4 mt-0.5">{{ beat.statusLabel }}</p>
                  </div>
                </div>
              </div>
              <div class="border border-accent/10 rounded-xs p-2">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-[0.625rem] text-muted">短线恋爱</p>
                  <span class="text-[0.625rem] text-accent">{{ getRandomNpcShortRomanceStatusText(selectedRandomNpcAcquaintance.shortRomance) }}</span>
                </div>
                <p class="text-[0.625rem] text-muted leading-4 mt-1">{{ selectedRandomNpcAcquaintance.shortRomance.note }}</p>
                <div v-if="getRecentRandomNpcShortRomanceHistory(selectedRandomNpcAcquaintance.shortRomance).length > 0" class="mt-1 space-y-1">
                  <p
                    v-for="event in getRecentRandomNpcShortRomanceHistory(selectedRandomNpcAcquaintance.shortRomance)"
                    :key="event.id"
                    class="text-[0.625rem] text-muted border-t border-accent/10 pt-1 first:border-t-0 first:pt-0"
                  >
                    {{ event.dayTag }} · {{ event.summary }}
                  </p>
                </div>
                <div class="grid grid-cols-2 gap-1 mt-2">
                  <Button
                    class="justify-center !px-2 !py-1"
                    :disabled="!canStartRandomNpcShortRomance(selectedRandomNpcAcquaintance.visitorId).success"
                    :data-testid="`random-npc-acquaintance-short-romance-${selectedRandomNpcAcquaintance.visitorId}`"
                    @click="handleStartRandomNpcShortRomance(selectedRandomNpcAcquaintance.visitorId)"
                  >
                    暧昧邀约
                  </Button>
                  <Button
                    class="justify-center !px-2 !py-1"
                    :disabled="selectedRandomNpcAcquaintance.shortRomance.status !== 'invited'"
                    @click="handleEndRandomNpcShortRomance(selectedRandomNpcAcquaintance.visitorId)"
                  >
                    收束
                  </Button>
                </div>
              </div>
            </div>

            <div v-show="randomNpcDetailTab === 'order'" class="space-y-2">
              <div class="border border-accent/10 rounded-xs p-2">
                <p class="text-[0.625rem] text-muted">小订单：{{ selectedRandomNpcAcquaintance.smallOrder.title }}</p>
                <p class="text-[0.625rem] text-accent/90 leading-4 mt-0.5">{{ selectedRandomNpcAcquaintance.smallOrder.summary }}</p>
                <p class="text-[0.625rem] text-success/80 mt-1">{{ selectedRandomNpcAcquaintance.smallOrder.rewardSummary }}</p>
                <p class="text-[0.625rem] text-muted mt-1">{{ getRandomNpcSmallOrderProgressText(selectedRandomNpcAcquaintance.smallOrder) }}</p>
                <Button
                  class="w-full justify-center !px-2 !py-1 mt-2"
                  :icon="Package"
                  :disabled="selectedRandomNpcAcquaintance.smallOrderCompleted || !canFulfillRandomNpcSmallOrder(selectedRandomNpcAcquaintance.smallOrder)"
                  :data-testid="`random-npc-acquaintance-small-order-${selectedRandomNpcAcquaintance.visitorId}`"
                  @click="handleFulfillRandomNpcSmallOrder(selectedRandomNpcAcquaintance.visitorId)"
                >
                  {{ selectedRandomNpcAcquaintance.smallOrderCompleted ? '已交付' : '交付小订单' }}
                </Button>
              </div>
              <Button
                class="w-full justify-center !px-2 !py-1"
                :class="{ '!bg-success !text-bg': selectedRandomNpcAcquaintance.affinity >= randomNpcLongStayThreshold }"
                :disabled="selectedRandomNpcAcquaintance.affinity < randomNpcLongStayThreshold || isRandomNpcLongStay(selectedRandomNpcAcquaintance.visitorId)"
                @click="handlePromoteRandomNpcToLongStay(selectedRandomNpcAcquaintance.visitorId)"
              >
                {{ isRandomNpcLongStay(selectedRandomNpcAcquaintance.visitorId) ? '已长住' : '邀为长住' }}
              </Button>
            </div>
          </div>

          <div v-if="selectedRandomNpcResident" class="space-y-2">
            <div v-show="randomNpcDetailTab === 'overview'" class="space-y-2">
              <div class="flex items-start gap-2 border border-accent/10 rounded-xs p-2 bg-bg/10">
                <NpcPortrait
                  class="shrink-0"
                  :id="selectedRandomNpcResident.residentId"
                  :name="selectedRandomNpcResident.name"
                  :display-name="selectedRandomNpcResident.occupation"
                  :template-id="selectedRandomNpcResident.templateId"
                  :fallback-text="selectedRandomNpcResident.name"
                  size="sm"
                />
                <div class="min-w-0 flex-1">
                  <p class="text-xs text-accent truncate">{{ selectedRandomNpcResident.name }} · {{ selectedRandomNpcResident.occupation }}</p>
                  <p class="text-[0.625rem] text-muted mt-0.5 leading-4">
                    {{ getRandomNpcLongStayRouteLabel(selectedRandomNpcResident.route) }} · {{ selectedRandomNpcResident.origin }} · {{ getRandomNpcRelationshipLabel(selectedRandomNpcResident.relationshipTag) }} · {{ selectedRandomNpcResident.plotHook }}
                  </p>
                  <p class="text-[0.625rem] text-muted leading-4 mt-1">{{ selectedRandomNpcResident.residenceReason }}</p>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-1 text-[0.625rem]">
                <div class="border border-accent/10 rounded-xs px-1.5 py-1">
                  <span class="text-muted/60">目标</span>
                  <p class="text-accent mt-0.5">{{ selectedRandomNpcResident.lifeGoal }}</p>
                </div>
                <div class="border border-accent/10 rounded-xs px-1.5 py-1">
                  <span class="text-muted/60">忌讳</span>
                  <p class="text-muted mt-0.5">{{ selectedRandomNpcResident.taboo }}</p>
                </div>
              </div>
              <p class="text-[0.625rem] text-muted leading-4">说话方式：{{ selectedRandomNpcResident.speechStyle }}</p>
              <p class="text-[0.625rem] text-muted leading-4">家庭背景：{{ selectedRandomNpcResident.familySeed }}</p>
              <div class="border border-accent/10 rounded-xs p-2 text-[0.625rem]">
                <p class="text-muted">人物卡</p>
                <p class="text-accent/90 leading-4 mt-0.5">外貌：{{ selectedRandomNpcResident.appearanceKeywords.join('、') }}</p>
                <p class="text-muted leading-4 mt-0.5">来村目的：{{ selectedRandomNpcResident.villagePurpose }}</p>
                <p class="text-muted leading-4 mt-0.5">恋爱观：{{ selectedRandomNpcResident.romanceView }}</p>
                <p class="text-muted leading-4 mt-0.5">发展路线：{{ getRandomNpcDevelopmentRouteText(selectedRandomNpcResident.developmentRoutes) }}</p>
                <p class="text-muted leading-4 mt-0.5">对话场景：{{ getRandomNpcDialogueSceneText(selectedRandomNpcResident.dialogueScenes) }}</p>
                <p class="text-muted leading-4 mt-0.5">绑定偏好：{{ getRandomNpcBindingPreferenceText(selectedRandomNpcResident.preferences.bindings) }}</p>
              </div>
            </div>

            <div v-show="randomNpcDetailTab === 'story'" class="space-y-2">
              <div class="border border-accent/10 rounded-xs p-2">
                <p class="text-[0.625rem] text-muted">长住文游记录</p>
                <p class="text-[0.625rem] text-accent/90 leading-4 mt-0.5">{{ getRandomNpcRelationshipSignalText(selectedRandomNpcResident.relationshipSignals) }}</p>
                <div v-if="getRecentRandomNpcDialogueMemories(selectedRandomNpcResident.dialogueMemories).length > 0" class="mt-1 space-y-1">
                  <div
                    v-for="memory in getRecentRandomNpcDialogueMemories(selectedRandomNpcResident.dialogueMemories)"
                    :key="memory.id"
                    class="text-[0.625rem] border-t border-accent/10 pt-1 first:border-t-0 first:pt-0"
                  >
                    <p class="text-accent">{{ memory.dayTag }} · {{ getRandomNpcRelationshipDirectionLabel(memory.direction) }} · 好感 {{ memory.affinityChange >= 0 ? '+' : '' }}{{ memory.affinityChange }}</p>
                    <p class="text-muted leading-4">{{ memory.choiceText }}：{{ memory.response }}</p>
                    <p v-if="memory.sceneTitle" class="text-muted leading-4 mt-0.5">触发场景「{{ memory.sceneTitle }}」：{{ memory.sceneSummary }}</p>
                  </div>
                </div>
              </div>
              <div v-if="getRandomNpcLongStayStoryEvent(selectedRandomNpcResident)" class="border border-accent/10 rounded-xs p-2">
                <p class="text-[0.625rem] text-accent">{{ getRandomNpcLongStayStoryEvent(selectedRandomNpcResident)?.title }}</p>
                <p class="text-[0.625rem] text-muted leading-4 mt-1">{{ getRandomNpcLongStayStoryEvent(selectedRandomNpcResident)?.opening }}</p>
                <div class="mt-2 space-y-1">
                  <Button
                    v-for="choice in getRandomNpcLongStayStoryChoices(selectedRandomNpcResident)"
                    :key="`${selectedRandomNpcResident.residentId}-${choice.id}`"
                    class="w-full justify-start !px-2 !py-1 text-left"
                    :disabled="selectedRandomNpcResident.lastStoryDayTag === currentNpcDayTag"
                    @click="handleProgressRandomNpcLongStayStory(selectedRandomNpcResident.residentId, choice.id)"
                  >
                    {{ choice.text }}
                  </Button>
                </div>
              </div>
            </div>

            <div v-show="randomNpcDetailTab === 'relationship'" class="space-y-2">
              <div v-if="selectedRandomNpcResident.familyTies.length > 0" class="border border-accent/10 rounded-xs p-2">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-[0.625rem] text-muted">家族节点</p>
                  <span class="text-[0.625rem] text-accent">本地 {{ selectedRandomNpcResident.familyTies.length }}/4</span>
                </div>
                <p class="text-[0.625rem] text-accent/90 leading-4 mt-1">
                  家族节点有什么用：先见面建立家族评价，见过节点后才会点亮家人线、家族委托和核心深线；深线会按节点类型给材料奖励，并把这段关系写进本地记录。
                </p>
                <div class="grid grid-cols-3 gap-1 mt-2">
                  <div class="border border-accent/10 rounded-xs px-2 py-1">
                    <p class="text-[0.625rem] text-muted">见面进度</p>
                    <p class="text-[0.625rem] text-accent">{{ getRandomNpcFamilyMeetingSummary(selectedRandomNpcResident) }}</p>
                  </div>
                  <div class="border border-accent/10 rounded-xs px-2 py-1">
                    <p class="text-[0.625rem] text-muted">深线进度</p>
                    <p class="text-[0.625rem] text-accent">{{ getRandomNpcFamilySpecialSummary(selectedRandomNpcResident) }}</p>
                  </div>
                  <div class="border border-accent/10 rounded-xs px-2 py-1">
                    <p class="text-[0.625rem] text-muted">当前作用</p>
                    <p class="text-[0.625rem] text-accent">{{ getRandomNpcFamilyCurrentUseSummary(selectedRandomNpcResident) }}</p>
                  </div>
                </div>
                <div class="mt-1 space-y-1">
                  <div
                    v-for="tie in selectedRandomNpcResident.familyTies"
                    :key="`${selectedRandomNpcResident.residentId}-${tie.id}`"
                    class="text-[0.625rem] border-t border-accent/10 pt-1 first:border-t-0 first:pt-0"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <p class="text-accent">{{ getRandomNpcFamilyTieKindLabel(tie.kind) }} · {{ tie.relation }} · {{ tie.name }}</p>
                      <span class="shrink-0 text-muted">{{ getRandomNpcFamilyTieProgressText(selectedRandomNpcResident, tie) }}</span>
                    </div>
                    <p class="text-muted leading-4">{{ tie.summary }}（{{ getRandomNpcFamilyTieAttitudeLabel(tie.attitude) }}）</p>
                    <p class="text-accent/80 leading-4 mt-0.5">用途：{{ getRandomNpcFamilyTieUtilityText(selectedRandomNpcResident, tie) }}</p>
                  </div>
                </div>
              </div>
              <div v-if="selectedRandomNpcResident.familyTies.length > 0" class="border border-accent/10 rounded-xs p-2">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-[0.625rem] text-muted">见家人与家族评价</p>
                  <span class="text-[0.625rem] text-accent">评价 {{ selectedRandomNpcResident.familyLine.reputation }}/100</span>
                </div>
                <p class="text-[0.625rem] text-accent/90 leading-4 mt-1">{{ selectedRandomNpcResident.familyLine.lastReview }}</p>
                <p class="text-[0.625rem] text-muted leading-4 mt-1">
                  评价会影响家人线、订婚和婚后家业门槛；按钮灰掉时，按钮文字就是下一步卡点。
                </p>
                <div class="grid grid-cols-2 gap-1 mt-2">
                  <Button
                    v-for="tie in selectedRandomNpcResident.familyTies"
                    :key="`${selectedRandomNpcResident.residentId}-${tie.id}-meeting`"
                    class="justify-center !px-2 !py-1"
                    :disabled="!canMeetRandomNpcFamilyTie(selectedRandomNpcResident, tie.id).success"
                    @click="handleMeetRandomNpcFamilyTie(selectedRandomNpcResident.residentId, tie.id)"
                  >
                    {{ getRandomNpcFamilyMeetingButtonText(selectedRandomNpcResident, tie.id, tie.relation) }}
                  </Button>
                </div>
                <p class="text-[0.625rem] text-muted leading-4 mt-1">
                  每个家族节点最多推进 3 轮见面；同一节点每日只推进 1 轮，记录仍保留在本地随机 NPC 存档。
                </p>
                <div v-if="getSpecialFamilyTies(selectedRandomNpcResident).length > 0" class="border-t border-accent/10 mt-2 pt-2">
                  <p class="text-[0.625rem] text-accent">核心家族深线</p>
                  <p class="text-[0.625rem] text-muted leading-4 mt-1">
                    已见过的核心节点才可推进深线；每段给对应材料，若已开启家人线还会追加差异奖励。
                  </p>
                  <div class="grid grid-cols-1 gap-1 mt-1">
                    <Button
                      v-for="tie in getSpecialFamilyTies(selectedRandomNpcResident)"
                      :key="`${selectedRandomNpcResident.residentId}-${tie.id}-special`"
                      class="justify-center !px-2 !py-1"
                      :disabled="!canProgressRandomNpcFamilySpecialEvent(selectedRandomNpcResident, tie.id).success"
                      :data-testid="`random-npc-family-special-${selectedRandomNpcResident.residentId}-${tie.id}`"
                      @click="handleProgressRandomNpcFamilySpecialEvent(selectedRandomNpcResident.residentId, tie.id)"
                    >
                      {{ getRandomNpcFamilySpecialButtonText(selectedRandomNpcResident, tie.id, tie.relation) }}
                    </Button>
                  </div>
                  <div v-if="getRecentRandomNpcFamilySpecialEvents(selectedRandomNpcResident).length > 0" class="mt-1 space-y-1">
                    <p
                      v-for="event in getRecentRandomNpcFamilySpecialEvents(selectedRandomNpcResident)"
                      :key="event.id"
                      class="text-[0.625rem] text-muted border-t border-accent/10 pt-1 first:border-t-0 first:pt-0"
                    >
                      {{ event.dayTag }} · {{ event.title }} {{ event.stage }}/3：{{ event.summary }}<span v-if="event.rewardSummary">（{{ event.rewardSummary }}）</span>
                    </p>
                  </div>
                  <p class="text-[0.625rem] text-muted leading-4 mt-1">
                    核心家族节点各自最多 3 段，同一节点每日只推进 1 段；记录只保留最近 4 条。
                  </p>
                </div>
                <div v-if="getRecentRandomNpcFamilyReviews(selectedRandomNpcResident).length > 0" class="mt-2 space-y-1">
                  <p
                    v-for="review in getRecentRandomNpcFamilyReviews(selectedRandomNpcResident)"
                    :key="review.id"
                    class="text-[0.625rem] text-muted border-t border-accent/10 pt-1 first:border-t-0 first:pt-0"
                  >
                    {{ review.dayTag }} · {{ getRandomNpcFamilyReviewTypeLabel(review.type) }}：{{ review.summary }}（评价{{ review.reputationDelta >= 0 ? '+' : '' }}{{ review.reputationDelta }}）
                  </p>
                </div>
              </div>
              <div class="border border-accent/10 rounded-xs p-2">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-[0.625rem] text-muted">关系线</p>
                  <span class="text-[0.625rem] text-accent">{{ getRandomNpcRelationLineLabel(selectedRandomNpcResident.relationshipLine.kind) }}</span>
                </div>
                <p class="text-[0.625rem] text-accent/90 leading-4 mt-0.5">{{ selectedRandomNpcResident.relationshipLine.note }}</p>
                <p v-if="selectedRandomNpcResident.relationshipLine.commitmentStatus !== 'none'" class="text-[0.625rem] text-success/90 leading-4 mt-0.5">
                  {{ getRandomNpcCommitmentStatusText(selectedRandomNpcResident) }}
                </p>
                <p v-if="selectedRandomNpcResident.relationshipLine.commitmentStatus === 'married'" class="text-[0.625rem] text-muted leading-4 mt-0.5">
                  婚后日常：{{ selectedRandomNpcResident.relationshipLine.homeLifeNote }}
                </p>
                <p class="text-[0.625rem] text-muted leading-4 mt-0.5">{{ getRandomNpcRelationLineHint(selectedRandomNpcResident) }}</p>
                <div class="border border-accent/10 rounded-xs p-2 mt-2" :data-testid="`random-npc-growth-preview-${selectedRandomNpcResident.residentId}`">
                  <p class="text-[0.625rem] text-muted">日常长出关系线</p>
                  <div class="mt-1 space-y-1">
                    <div
                      v-for="beat in getRandomNpcResidentGrowthPreview(selectedRandomNpcResident)"
                      :key="`${selectedRandomNpcResident.residentId}-${beat.id}`"
                      class="text-[0.625rem] border-t border-accent/10 pt-1 first:border-t-0 first:pt-0"
                    >
                      <div class="flex items-center justify-between gap-2">
                        <span :class="beat.ready ? 'text-success' : 'text-accent'">{{ beat.title }}</span>
                        <span class="text-muted">{{ beat.progressLabel }}</span>
                      </div>
                      <p class="text-muted leading-4 mt-0.5">{{ beat.sourceSummary }}</p>
                      <p class="text-accent/80 leading-4 mt-0.5">{{ beat.statusLabel }}</p>
                    </div>
                  </div>
                </div>
                <div v-if="getRecentRandomNpcRelationLineHistory(selectedRandomNpcResident).length > 0" class="mt-1 space-y-1">
                  <p
                    v-for="event in getRecentRandomNpcRelationLineHistory(selectedRandomNpcResident)"
                    :key="event.id"
                    class="text-[0.625rem] text-muted border-t border-accent/10 pt-1 first:border-t-0 first:pt-0"
                  >
                    {{ event.dayTag }} · {{ getRandomNpcRelationLineLabel(event.kind) }}：{{ event.summary }}
                  </p>
                </div>
                <div class="grid grid-cols-2 gap-1 mt-2">
                  <Button
                    v-for="kind in randomNpcRelationLineActions"
                    :key="`${selectedRandomNpcResident.residentId}-${kind}`"
                    class="justify-center !px-2 !py-1"
                    :disabled="!canStartRandomNpcRelationLine(selectedRandomNpcResident, kind).success"
                    @click="handleStartRandomNpcRelationLine(selectedRandomNpcResident.residentId, kind)"
                  >
                    {{ getRandomNpcRelationLineButtonText(selectedRandomNpcResident, kind) }}
                  </Button>
                </div>
                <Button
                  v-if="selectedRandomNpcResident.relationshipLine.stage > 0"
                  class="w-full justify-center !px-2 !py-1 mt-1 text-danger border-danger/40"
                  @click="handleSeverRandomNpcRelationLine(selectedRandomNpcResident.residentId)"
                >
                  断缘
                </Button>
                <div v-if="selectedRandomNpcResident.relationshipLine.kind === 'romance' && selectedRandomNpcResident.relationshipLine.stage > 0" class="grid grid-cols-3 gap-1 mt-1">
                  <Button class="justify-center !px-2 !py-1" :disabled="!canEngageRandomNpcRelationLine(selectedRandomNpcResident).success" @click="handleEngageRandomNpcRelationLine(selectedRandomNpcResident.residentId)">订婚</Button>
                  <Button class="justify-center !px-2 !py-1" :disabled="!canMarryRandomNpcRelationLine(selectedRandomNpcResident).success" @click="handleMarryRandomNpcRelationLine(selectedRandomNpcResident.residentId)">成婚</Button>
                  <Button class="justify-center !px-2 !py-1" :disabled="selectedRandomNpcResident.relationshipLine.commitmentStatus !== 'married'" @click="handleRecordRandomNpcMarriedLife(selectedRandomNpcResident.residentId)">日常</Button>
                </div>
              </div>
            </div>

            <div v-show="randomNpcDetailTab === 'order'" class="space-y-2">
              <div class="border border-accent/10 rounded-xs p-2">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-[0.625rem] text-accent">{{ selectedRandomNpcResident.smallOrder.title }}</p>
                  <span class="text-[0.625rem]" :class="selectedRandomNpcResident.smallOrderCompleted ? 'text-success' : 'text-muted'">
                    {{ selectedRandomNpcResident.smallOrderCompleted ? '已交付' : '待交付' }}
                  </span>
                </div>
                <p class="text-[0.625rem] text-muted leading-4 mt-1">{{ selectedRandomNpcResident.smallOrder.summary }}</p>
                <p class="text-[0.625rem] text-muted mt-1">{{ getRandomNpcSmallOrderProgressText(selectedRandomNpcResident.smallOrder) }}</p>
                <Button
                  class="w-full justify-center !px-2 !py-1 mt-2"
                  :icon="Package"
                  :disabled="selectedRandomNpcResident.smallOrderCompleted || !canFulfillRandomNpcSmallOrder(selectedRandomNpcResident.smallOrder)"
                  :data-testid="`random-npc-long-stay-small-order-${selectedRandomNpcResident.sourceVisitorId}`"
                  @click="handleFulfillRandomNpcSmallOrder(selectedRandomNpcResident.sourceVisitorId)"
                >
                  {{ selectedRandomNpcResident.smallOrderCompleted ? '已交付' : '交付长住小订单' }}
                </Button>
              </div>
              <div class="border border-accent/10 rounded-xs p-2">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-[0.625rem] text-accent">今日节会同行</p>
                  <span class="text-[0.625rem] text-muted">{{ randomNpcFestivalReunionEventName }}</span>
                </div>
                <p class="text-[0.625rem] text-muted leading-4 mt-1">{{ getRandomNpcFestivalCompanionHint(selectedRandomNpcResident) }}</p>
                <Button
                  class="w-full justify-center !px-2 !py-1 mt-2"
                  :icon="Sparkles"
                  :disabled="!canProgressRandomNpcFestivalCompanion(selectedRandomNpcResident).success"
                  :data-testid="`random-npc-festival-companion-${selectedRandomNpcResident.residentId}`"
                  @click="handleProgressRandomNpcFestivalCompanion(selectedRandomNpcResident.residentId)"
                >
                  节会同行
                </Button>
              </div>
              <div v-if="getRandomNpcFamilyCommission(selectedRandomNpcResident)" class="border border-accent/10 rounded-xs p-2">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-[0.625rem] text-accent">{{ getRandomNpcFamilyCommission(selectedRandomNpcResident)?.title }}</p>
                  <span class="text-[0.625rem]" :class="isRandomNpcFamilyCommissionCompleted(selectedRandomNpcResident) ? 'text-success' : 'text-muted'">
                    {{ isRandomNpcFamilyCommissionCompleted(selectedRandomNpcResident) ? '已评价' : '待交付' }}
                  </span>
                </div>
                <p class="text-[0.625rem] text-muted leading-4 mt-1">{{ getRandomNpcFamilyCommission(selectedRandomNpcResident)?.summary }}</p>
                <p class="text-[0.625rem] text-muted mt-1">{{ getRandomNpcFamilyCommissionProgressText(selectedRandomNpcResident) }}</p>
                <Button
                  class="w-full justify-center !px-2 !py-1 mt-2"
                  :icon="Package"
                  :disabled="!canFulfillRandomNpcFamilyCommission(selectedRandomNpcResident)"
                  :data-testid="`random-npc-family-commission-${selectedRandomNpcResident.residentId}`"
                  @click="handleFulfillRandomNpcFamilyCommission(selectedRandomNpcResident.residentId)"
                >
                  {{ getRandomNpcFamilyCommissionButtonText(selectedRandomNpcResident) }}
                </Button>
              </div>
              <div v-if="selectedRandomNpcResident.relationshipLine.commitmentStatus === 'married'" class="border border-accent/10 rounded-xs p-2">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-[0.625rem] text-accent">婚后家业线</p>
                  <span class="text-[0.625rem] text-muted">阶段 {{ selectedRandomNpcResident.familyLine.familyBusinessStage }}/3</span>
                </div>
                <p class="text-[0.625rem] text-muted leading-4 mt-1">{{ selectedRandomNpcResident.familyLine.familyBusinessNote }}</p>
                <Button class="w-full justify-center !px-2 !py-1 mt-2" :disabled="!canDevelopRandomNpcFamilyBusiness(selectedRandomNpcResident).success" @click="handleDevelopRandomNpcFamilyBusiness(selectedRandomNpcResident.residentId)">
                  推进婚后家业
                </Button>
                <div v-if="npcStore.children.length > 0" class="border border-accent/10 rounded-xs p-2 mt-2">
                  <p class="text-[0.625rem] text-muted">孩子兴趣影响</p>
                  <div class="grid grid-cols-1 gap-1 mt-1">
                    <Button
                      v-for="child in npcStore.children"
                      :key="`${selectedRandomNpcResident.residentId}-child-influence-${child.id}`"
                      class="justify-center !px-2 !py-1"
                      :disabled="!canApplyRandomNpcFamilyInfluenceToChild(child.id, selectedRandomNpcResident).success"
                      :data-testid="`random-npc-child-family-influence-${selectedRandomNpcResident.residentId}-${child.id}`"
                      @click="handleApplyRandomNpcFamilyInfluenceToChild(child.id, selectedRandomNpcResident.residentId)"
                    >
                      {{ child.name }}：{{ getChildFamilyInfluenceButtonText(child, selectedRandomNpcResident) }}
                    </Button>
                    <Button
                      v-for="child in npcStore.children"
                      :key="`${selectedRandomNpcResident.residentId}-child-family-event-${child.id}`"
                      class="justify-center !px-2 !py-1"
                      :disabled="!canProgressRandomNpcChildFamilyEvent(child.id, selectedRandomNpcResident).success"
                      :data-testid="`random-npc-child-family-event-${selectedRandomNpcResident.residentId}-${child.id}`"
                      @click="handleProgressRandomNpcChildFamilyEvent(child.id, selectedRandomNpcResident.residentId)"
                    >
                      {{ child.name }}：{{ getChildFamilyEventButtonText(child, selectedRandomNpcResident) }}
                    </Button>
                  </div>
                  <div v-for="child in npcStore.children" :key="`${selectedRandomNpcResident.residentId}-child-family-event-history-${child.id}`" class="mt-1 space-y-1">
                    <p
                      v-for="event in getRecentChildFamilyEvents(child, selectedRandomNpcResident)"
                      :key="event.id"
                      class="text-[0.625rem] text-muted border-t border-accent/10 pt-1 first:border-t-0 first:pt-0"
                    >
                      {{ child.name }} · {{ event.dayTag }} · {{ event.title }} {{ event.stage }}/3：{{ event.summary }}
                    </p>
                  </div>
                  <p class="text-[0.625rem] text-muted leading-4 mt-1">
                    仅写入本地孩子训练记录；同一孩子、NPC 与兴趣方向最多 3 段，每日限推进 1 段，最近事件最多保留 4 条。
                  </p>
                </div>
                <div v-if="getRecentRandomNpcFamilyBusinessHistory(selectedRandomNpcResident).length > 0" class="mt-2 space-y-1">
                  <p
                    v-for="entry in getRecentRandomNpcFamilyBusinessHistory(selectedRandomNpcResident)"
                    :key="entry.id"
                    class="text-[0.625rem] text-muted border-t border-accent/10 pt-1 first:border-t-0 first:pt-0"
                  >
                    {{ entry.dayTag }} · 阶段 {{ entry.stage }}/3：{{ entry.summary }}<span v-if="entry.rewardSummary">（{{ entry.rewardSummary }}）</span>（评价{{ entry.reputationDelta >= 0 ? '+' : '' }}{{ entry.reputationDelta }}）
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div v-if="selectedRandomNpcArchive" class="space-y-2">
            <div v-show="randomNpcDetailTab === 'overview'" class="border border-accent/10 rounded-xs p-2">
              <p class="text-xs text-accent">{{ selectedRandomNpcArchive.name }} · {{ selectedRandomNpcArchive.occupation }}</p>
              <p class="text-[0.625rem] text-muted leading-4 mt-1">{{ selectedRandomNpcArchive.summary }}</p>
              <p class="text-[0.625rem] text-muted leading-4 mt-1">旧档接续：{{ selectedRandomNpcArchive.archivedTier === 'long_stay' ? '长住旧档' : '短访旧档' }} · 好感 {{ selectedRandomNpcArchive.affinity }}</p>
            </div>
            <div v-show="randomNpcDetailTab === 'story'" class="border border-accent/10 rounded-xs p-2">
              <p class="text-[0.625rem] text-muted">旧日记忆</p>
              <div class="mt-1 space-y-1">
                <p
                  v-for="event in selectedRandomNpcArchive.keyEvents"
                  :key="event"
                  class="text-[0.625rem] text-muted border-t border-accent/10 pt-1 first:border-t-0 first:pt-0"
                >
                  {{ event }}
                </p>
              </div>
            </div>
            <div v-show="randomNpcDetailTab === 'relationship'" class="border border-accent/10 rounded-xs p-2">
              <p class="text-[0.625rem] text-muted">关系摘要</p>
              <p class="text-[0.625rem] text-accent/90 leading-4 mt-1">{{ getRandomNpcRelationshipLabel(selectedRandomNpcArchive.relationshipTag) }} · 好感 {{ selectedRandomNpcArchive.affinity }}</p>
              <p class="text-[0.625rem] text-muted leading-4 mt-1">{{ selectedRandomNpcArchive.locked ? '已锁定，会保留在旧档中。' : '未锁定，后续旧档轮转可能归档更早记录。' }}</p>
            </div>
            <div v-show="randomNpcDetailTab === 'order'" class="grid grid-cols-2 gap-1">
              <Button
                class="justify-center !px-2 !py-1"
                :icon="Star"
                :class="{ '!bg-warning !text-bg': selectedRandomNpcArchive.locked }"
                :disabled="!selectedRandomNpcArchive.locked && !canLockMoreRandomNpc(selectedRandomNpcArchive.visitorId)"
                :data-testid="`random-npc-archive-detail-lock-${selectedRandomNpcArchive.visitorId}`"
                @click="handleToggleRandomNpcLock(selectedRandomNpcArchive.visitorId, !selectedRandomNpcArchive.locked)"
              >
                {{ selectedRandomNpcArchive.locked ? '取消锁定' : '锁定旧档' }}
              </Button>
              <Button class="justify-center !px-2 !py-1" :icon="RotateCcw" :disabled="!canRecallRandomNpcArchive(selectedRandomNpcArchive)" @click="handleRecallRandomNpcArchive(selectedRandomNpcArchive.visitorId)">召回</Button>
              <Button class="justify-center !px-2 !py-1" :icon="Mail" :disabled="!canRecallRandomNpcArchiveByOldLetter(selectedRandomNpcArchive)" @click="handleRecallRandomNpcArchiveByOldLetter(selectedRandomNpcArchive.visitorId)">寄旧信</Button>
              <Button class="justify-center !px-2 !py-1" :icon="Package" :disabled="!canRecallRandomNpcArchiveByOldKeepsake(selectedRandomNpcArchive)" @click="handleRecallRandomNpcArchiveByOldKeepsake(selectedRandomNpcArchive.visitorId)">托旧物</Button>
              <Button class="col-span-2 justify-center !px-2 !py-1" :icon="Sparkles" :disabled="!canRecallRandomNpcArchiveByFestivalReunion(selectedRandomNpcArchive)" @click="handleRecallRandomNpcArchiveByFestivalReunion(selectedRandomNpcArchive.visitorId)">节会重逢</Button>
              <p class="col-span-2 text-[0.625rem] text-muted leading-4">
                旧信消耗 {{ randomNpcOldLetterItemName }}×{{ randomNpcOldLetterCostQuantity }}；旧物消耗 {{ randomNpcOldKeepsakeItemName }}×{{ randomNpcOldKeepsakeCostQuantity }}；节会重逢需今日有节会（{{ randomNpcFestivalReunionEventName }}）。
              </p>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="space-y-1">
            <Button
              class="w-full justify-center !px-2 !py-1"
              :icon="randomNpcDetailPrimaryAction.icon"
              :disabled="randomNpcDetailPrimaryAction.disabled"
              data-testid="random-npc-detail-primary-action"
              @click="handleRandomNpcDetailPrimaryAction"
            >
              {{ randomNpcDetailPrimaryAction.label }}
            </Button>
            <p v-if="randomNpcDetailPrimaryAction.hint" class="text-[0.625rem] text-muted leading-4">
              {{ randomNpcDetailPrimaryAction.hint }}
            </p>
          </div>
        </template>
      </OnlineBottomSheet>

      <div class="border border-accent/20 rounded-xs p-2 mt-3">
        <div class="flex items-center justify-between mb-2">
          <div>
            <p class="text-xs text-accent">村庄建设</p>
            <p class="text-[0.625rem] text-muted mt-0.5">把获得的生活线索真正落成项目，让桃源村逐步有长期建设感。</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[0.625rem] text-muted">已完成 {{ villageProjectStore.villageProjectLevel }}/{{ villageProjectStore.projects.length }}</span>
            <Button class="justify-center !px-2 !py-1" @click="void router.push({ name: 'village-projects' })">建设总览</Button>
          </div>
        </div>

        <div class="flex flex-col space-y-1.5">
          <div v-for="project in villageProjectStore.projects" :key="project.id" class="border rounded-xs p-2" :class="project.completed ? 'border-success/30 bg-success/5' : 'border-accent/10'">
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-xs" :class="project.completed ? 'text-success' : 'text-accent'">{{ project.name }}</p>
                <p class="text-[0.625rem] text-muted mt-0.5 leading-4">{{ project.description }}</p>
              </div>
              <span class="text-[0.625rem] whitespace-nowrap" :class="project.completed ? 'text-success' : project.clueUnlocked ? 'text-accent' : 'text-muted'">
                {{ project.completed ? '已完成' : project.clueUnlocked ? '可建设' : '待线索' }}
              </span>
            </div>

            <p class="text-[0.625rem] text-success/90 mt-1 leading-4">效果：{{ project.benefitSummary }}</p>
            <p v-if="!project.clueUnlocked && project.requiredClueText" class="text-[0.625rem] text-warning mt-1 leading-4">{{ project.requiredClueText }}</p>

            <div v-if="getVillageProjectRequirementProgress(project.id).length > 0" class="border border-accent/10 rounded-xs p-2 mt-2">
              <p class="text-[0.625rem] text-muted mb-1">专项进度</p>
              <div
                v-for="requirement in getVillageProjectRequirementProgress(project.id)"
                :key="`${project.id}-${requirement.type}`"
                class="flex items-center justify-between text-[0.625rem] mt-0.5"
              >
                <span class="text-muted">{{ requirement.displayLabel }}</span>
                <span :class="requirement.met ? 'text-success' : 'text-danger'">{{ requirement.current }}/{{ requirement.target }}</span>
              </div>
            </div>

            <div class="border border-accent/10 rounded-xs p-2 mt-2">
              <div class="flex items-center justify-between text-[0.625rem]">
                <span class="text-muted">铜钱</span>
                <span :class="playerStore.money >= project.moneyCost ? 'text-success' : 'text-danger'">{{ playerStore.money }}/{{ project.moneyCost }}文</span>
              </div>
              <div v-for="mat in project.materials" :key="mat.itemId" class="flex items-center justify-between text-[0.625rem] mt-0.5">
                <span class="text-muted">{{ getItemById(mat.itemId)?.name ?? mat.itemId }}</span>
                <span :class="getProjectItemCount(mat.itemId) >= mat.quantity ? 'text-success' : 'text-danger'">
                  {{ getProjectItemCount(mat.itemId) }}/{{ mat.quantity }}
                </span>
              </div>
            </div>

            <div v-if="project.completed && getVillageProjectMaintenanceSummary(project.id)" class="border border-accent/10 rounded-xs p-2 mt-2 bg-bg/10">
              <div class="flex items-center justify-between gap-2">
                <div>
                  <p class="text-[0.625rem] text-accent">维护状态</p>
                  <p class="text-[0.625rem] text-muted mt-0.5">
                    {{ getVillageProjectMaintenanceSummary(project.id)?.statusLabel }}
                    <span v-if="getVillageProjectMaintenanceSummary(project.id)?.state.nextDueDayTag">
                      · 下次维护日 {{ getVillageProjectMaintenanceSummary(project.id)?.state.nextDueDayTag }}
                    </span>
                  </p>
                </div>
                <span class="text-[0.625rem]" :class="getVillageProjectMaintenanceSummary(project.id)?.active ? 'text-success' : getVillageProjectMaintenanceSummary(project.id)?.overdue ? 'text-warning' : 'text-muted'">
                  {{ getVillageProjectMaintenanceSummary(project.id)?.active ? '增益生效中' : getVillageProjectMaintenanceSummary(project.id)?.overdue ? '增益暂停' : '待启用' }}
                </span>
              </div>
              <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ getVillageProjectMaintenanceSummary(project.id)?.plan.effectSummary }}</p>
              <div class="flex items-center justify-between text-[0.625rem] mt-1">
                <span class="text-muted">维护费</span>
                <span class="text-accent">{{ getVillageProjectMaintenanceSummary(project.id)?.plan.costMoney }}文 / {{ getVillageProjectMaintenanceSummary(project.id)?.plan.cycleDays }}天</span>
              </div>
              <div class="flex items-center justify-between text-[0.625rem] mt-1">
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
              <p class="text-[0.625rem] text-muted leading-4">{{ getVillageProjectHint(project.id) }}</p>
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
    <div v-else-if="activeTab === 'spirit'">
      <div class="border border-accent/20 rounded-xs p-2 mb-3 bg-accent/5">
        <p class="text-xs text-accent mb-1">仙灵指引</p>
        <p class="text-[0.625rem] text-muted/80 leading-4">
          仙灵通常按「传闻 → 惊鸿一瞥 → 初次相遇 → 愿意往来」推进。多留意对应的地点、时间、天气、技能等级和关键物品；
          显现后可通过互动、供奉、求缘、结缘逐步解锁能力与长期加成。
        </p>
      </div>

      <div class="border border-accent/20 rounded-xs p-2 mb-3">
        <div class="flex items-center justify-between gap-2">
          <div>
            <p class="text-xs text-accent">仙缘运营</p>
            <p class="text-[0.625rem] text-muted mt-0.5">共鸣、祝福与结缘记忆会在统一周切换节点推进。</p>
          </div>
          <span class="text-[0.625rem] text-muted">已结缘 {{ spiritBondOverview.bondedCount }}</span>
        </div>
        <div class="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-[0.625rem]">
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
          <div class="flex items-center justify-between text-[0.625rem]">
            <span class="text-muted">当前选中仙灵</span>
            <span class="text-accent">{{ selectedSpiritBlessingSummary.bondTier }}</span>
          </div>
          <p class="text-[0.625rem] text-muted mt-1 leading-4">
            当前祝福：{{ selectedSpiritBlessingSummary.activeBlessing?.label ?? '未启用' }}
          </p>
          <div class="flex flex-wrap gap-1 mt-1">
            <span
              v-for="blessing in selectedSpiritBlessings"
              :key="blessing.id"
              class="text-[0.625rem] px-1 rounded-xs border border-accent/15 text-accent/80"
            >
              {{ blessing.label }}
            </span>
          </div>
        </div>
        <div v-if="selectedSpiritMemoryChain?.steps?.length" class="border border-accent/10 rounded-xs p-2 mt-2 bg-bg/10">
          <p class="text-[0.625rem] text-muted mb-1">结缘记忆链</p>
          <p class="text-[0.625rem] text-accent">{{ selectedSpiritMemoryChain.memoryReward.summary }} · {{ selectedSpiritMemoryChain.progressLabel }}</p>
          <div v-for="step in selectedSpiritMemoryChain.steps" :key="step.id" class="flex items-start justify-between gap-2 text-[0.625rem] mt-1 first:mt-0">
            <div class="min-w-0">
              <p class="text-accent">{{ step.title }}</p>
              <p class="text-muted leading-4 mt-0.5">{{ step.summary }}</p>
            </div>
            <span :class="step.status === 'completed' ? 'text-success' : step.status === 'active' ? 'text-warning' : 'text-muted'">
              {{ step.status === 'completed' ? '已完成' : step.status === 'active' ? '当前步骤' : '待推进' }}
            </span>
          </div>
          <div class="mt-2 flex justify-end">
            <Button
              class="justify-center"
              :disabled="selectedSpiritMemoryChain.progressLabel !== '可收尾'"
              @click="handleClaimBondMemory"
            >
              归档记忆
            </Button>
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
              <NpcPortrait
                class="mx-auto mb-1"
                :id="npc.id"
                :name="npc.name"
                :asset-base="`${npc.name}-${npc.trueName}`"
                :fallback-text="npc.name"
                size="xs"
              />
              <p class="text-xs text-accent truncate">{{ npc.name }}</p>
              <p
                class="text-[0.625rem] flex items-center justify-center"
                :class="hiddenHeartCount(npc.id) > 0 ? 'text-accent' : 'text-muted/30'"
              >
                {{ hiddenHeartCount(npc.id) }}
                <Diamond :size="10" :fill="hiddenHeartCount(npc.id) > 0 ? 'currentColor' : 'none'" />
                <span class="text-muted/50 ml-0.5">{{ hiddenNpcStore.getHiddenNpcState(npc.id)?.affinity ?? 0 }}</span>
              </p>
            </div>
            <!-- 桌面端：显示更多信息 -->
            <div class="hidden md:flex items-start gap-2">
              <NpcPortrait
                :id="npc.id"
                :name="npc.name"
                :asset-base="`${npc.name}-${npc.trueName}`"
                :fallback-text="npc.name"
                size="sm"
              />
              <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between">
                <span class="text-xs text-accent">{{ npc.name }}</span>
                <span class="text-[0.625rem] text-muted/50">{{ getSpiritStageLabel(npc.id) }}</span>
              </div>
              <p class="text-[0.625rem] text-muted truncate">{{ npc.title }}</p>
              <p class="text-[0.625rem] text-success/80 truncate mt-0.5">
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
                <span class="text-[0.625rem] text-muted/50">{{ hiddenNpcStore.getHiddenNpcState(npc.id)?.affinity ?? 0 }}</span>
              </div>
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
            class="border border-muted/10 rounded-xs px-2 py-1.5 text-[0.625rem] text-muted/50 cursor-pointer hover:border-accent/30 hover:text-muted/80 transition-colors"
            @click="() => { const s = getLastDiscoveryStep(npc.id); if (s) reviewingRumorStep = { npcId: npc.id, step: s } }"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-accent/80">{{ npc.name }}</span>
              <span class="text-[0.625rem] border border-accent/15 rounded-xs px-1 text-muted/70">{{ getSpiritStageLabel(npc.id) }}</span>
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
                class="text-[0.625rem] px-1 rounded-xs border border-accent/15 text-accent/80"
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
        <p class="text-[0.625rem] text-muted/60 mt-1 max-w-60 text-center leading-4">
          可先提升农耕 / 采集 / 钓鱼 / 挖矿等级，并在竹林、瀑布、矿洞、村庄等地点留意特殊时间、天气与关键道具线索。
        </p>
      </div>
    </div>

    <!-- 传闻回顾弹窗 -->
      </div>
    </Transition>

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
      <div v-if="selectedNpc" class="game-modal-overlay fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" @click.self="closeSelectedNpc">
        <div class="game-panel max-w-lg w-full max-h-[80vh] overflow-y-auto">
          <!-- 头部：名称 + 关闭 -->
          <div class="flex justify-between items-start mb-2">
            <div class="flex items-start gap-2 min-w-0">
              <div v-if="selectedNpcDef" class="relative shrink-0">
                <button
                  type="button"
                  class="block rounded-md focus:outline-none focus:ring-1 focus:ring-accent/70"
                  aria-label="choose npc portrait"
                  @click.stop="showSelectedNpcPortraitPicker = !showSelectedNpcPortraitPicker"
                >
                  <NpcPortrait
                    :id="selectedNpcDef.id"
                    :name="selectedNpcDef.name"
                    :fallback-text="selectedNpcDef.name"
                    size="lg"
                    :resolution="256"
                  />
                </button>
                <NpcPortraitVariantPicker
                  v-if="showSelectedNpcPortraitPicker"
                  class="absolute left-0 top-full z-20 mt-2"
                  :id="selectedNpcDef.id"
                  :name="selectedNpcDef.name"
                  :fallback-text="selectedNpcDef.name"
                  @selected="showSelectedNpcPortraitPicker = false"
                />
              </div>
              <div class="min-w-0">
                <p class="text-sm text-accent">
                  {{ selectedNpcDef?.name }}
                  <span class="text-xs text-muted ml-0.5">{{ selectedNpcDef?.role }}</span>
                  <span v-if="selectedNpcState?.married" class="text-[0.625rem] text-danger border border-danger/30 rounded-xs px-1 ml-1">
                    伴侣
                  </span>
                  <span v-else-if="selectedNpcState?.dating" class="text-[0.625rem] text-danger/70 border border-danger/20 rounded-xs px-1 ml-1">
                    约会中
                  </span>
                  <span v-else-if="selectedNpcState?.zhiji" class="text-[0.625rem] text-accent border border-accent/30 rounded-xs px-1 ml-1">
                    知己
                  </span>
                </p>
                <p class="text-[0.625rem] text-muted/60 mt-0.5">{{ selectedNpcDef?.personality }}</p>
              </div>
            </div>
            <Button @click="closeSelectedNpc">关闭</Button>
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
            <div class="mt-1.5 grid grid-cols-1 md:grid-cols-2 gap-1.5 text-[0.625rem]">
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
                class="text-[0.625rem] border rounded-xs px-1 flex items-center space-x-0.5"
                :class="selectedNpcState?.talkedToday ? 'text-muted/40 border-muted/10' : 'text-success border-success/30'"
              >
                <MessageCircle :size="10" />
                <span>{{ selectedNpcState?.talkedToday ? '已聊天' : '可聊天' }}</span>
              </span>
              <span class="text-[0.625rem] border rounded-xs px-1 flex items-center space-x-0.5" :class="giftTagClass">
                <Gift :size="10" />
                <span>{{ giftTagText }}</span>
              </span>
              <span
                v-if="selectedNpcDef?.birthday"
                class="text-[0.625rem] border border-muted/10 rounded-xs px-1 text-muted flex items-center space-x-0.5"
              >
                <Cake :size="10" />
                <span>{{ SEASON_NAMES_MAP[selectedNpcDef.birthday.season] }}{{ selectedNpcDef.birthday.day }}日</span>
              </span>
              <span v-if="npcStore.isBirthday(selectedNpc!)" class="text-[0.625rem] text-danger border border-danger/30 rounded-xs px-1">
                生日! 送礼×4
              </span>
            </div>
          </div>

          <div class="grid grid-cols-4 gap-1.5 mb-3 md:hidden" data-testid="npc-detail-tabbar" role="tablist" aria-label="村民详情">
            <button
              v-for="tab in npcDetailTabs"
              :key="tab.id"
              type="button"
              role="tab"
              class="rounded-xs border px-2 py-2 text-xs transition-colors"
              :class="
                selectedNpcDetailTab === tab.id
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-accent/10 bg-bg/10 text-muted hover:bg-accent/5'
              "
              :aria-selected="selectedNpcDetailTab === tab.id"
              :data-testid="`npc-detail-tab-${tab.id}`"
              @click="selectedNpcDetailTab = tab.id"
            >
              <span class="flex items-center justify-center gap-1">
                <component :is="tab.icon" :size="12" />
                <span>{{ tab.label }}</span>
              </span>
            </button>
          </div>

          <div class="flex flex-col gap-3">
            <section data-testid="npc-detail-section-interact" :class="npcDetailSectionClass('interact')">
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
                <p v-if="!canInteractWithSelectedNpc && unavailableInteractionReason" class="text-[0.625rem] text-warning w-full">
                  {{ unavailableInteractionReason }}
                </p>
              </div>

              <div
                v-if="selectedNpc === MAYOR_TICKET_CONVERSION_NPC_ID"
                data-testid="mayor-ticket-conversion-panel"
                class="border border-accent/20 rounded-xs p-2 mb-3"
              >
                <p class="text-xs text-accent/80 mb-1.5 flex items-center space-x-1">
                  <RotateCcw :size="12" />
                  <span>村务票据转换</span>
                </p>
                <p class="text-[0.625rem] text-muted/70 leading-4 mb-2">{{ mayorTicketConversionStatus.hint }}</p>

                <div v-if="!mayorTicketConversionStatus.unlocked" class="flex flex-col space-y-1">
                  <span
                    class="text-[0.625rem] flex items-center space-x-1"
                    :class="mayorTicketConversionStatus.friendshipReady ? 'text-success' : 'text-muted/50'"
                  >
                    <CircleCheck v-if="mayorTicketConversionStatus.friendshipReady" :size="10" />
                    <Circle v-else :size="10" />
                    <span>柳村长关系：{{ mayorTicketConversionStatus.currentFriendship }} / {{ mayorTicketConversionStatus.requiredFriendship }}</span>
                  </span>
                  <span
                    class="text-[0.625rem] flex items-center space-x-1"
                    :class="mayorTicketConversionStatus.villageProjectReady ? 'text-success' : 'text-muted/50'"
                  >
                    <CircleCheck v-if="mayorTicketConversionStatus.villageProjectReady" :size="10" />
                    <Circle v-else :size="10" />
                    <span>村庄建设：{{ mayorTicketConversionStatus.currentVillageProjectLevel }} / {{ mayorTicketConversionStatus.requiredVillageProjectLevel }}</span>
                  </span>
                </div>

                <template v-else>
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2">
                    <div
                      v-for="option in mayorTicketConversionTicketOptions"
                      :key="option.ticketType"
                      class="border border-muted/10 rounded-xs px-2 py-1 flex items-center justify-between text-[0.625rem]"
                    >
                      <span class="text-muted/70">{{ option.label }}</span>
                      <span class="text-accent">×{{ option.balance }}</span>
                    </div>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                    <label class="text-[0.625rem] text-muted/70 flex flex-col space-y-1">
                      <span>来源券</span>
                      <select
                        v-model="mayorTicketConversionSourceType"
                        data-testid="mayor-ticket-conversion-source"
                        class="bg-black/20 border border-muted/20 rounded-xs px-2 py-1.5 text-xs text-foreground outline-none focus:border-accent/50"
                        @change="handleMayorTicketConversionSourceChange"
                      >
                        <option v-for="option in mayorTicketConversionTicketOptions" :key="option.ticketType" :value="option.ticketType">
                          {{ option.label }} ×{{ option.balance }}
                        </option>
                      </select>
                    </label>
                    <label class="text-[0.625rem] text-muted/70 flex flex-col space-y-1">
                      <span>目标券</span>
                      <select
                        v-model="mayorTicketConversionTargetType"
                        data-testid="mayor-ticket-conversion-target"
                        class="bg-black/20 border border-muted/20 rounded-xs px-2 py-1.5 text-xs text-foreground outline-none focus:border-accent/50"
                      >
                        <option v-for="option in mayorTicketConversionTargetOptions" :key="option.ticketType" :value="option.ticketType">
                          {{ option.label }} ×{{ option.balance }}
                        </option>
                      </select>
                    </label>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-1 text-[0.625rem] text-muted/70 mb-2">
                    <span>折损：{{ mayorTicketConversionStatus.sourceTicketCost }} 张换 1 张</span>
                    <span>手续费：{{ mayorTicketConversionStatus.moneyCost }} 文</span>
                    <span>本周剩余：{{ mayorTicketConversionStatus.weeklyRemaining }} / {{ mayorTicketConversionStatus.weeklyLimit }}</span>
                  </div>
                  <p v-if="selectedMayorTicketConversionOffer?.disabledReason" class="text-[0.625rem] text-warning mb-2">
                    {{ selectedMayorTicketConversionOffer.disabledReason }}
                  </p>
                  <Button
                    class="w-full text-accent border-accent/40"
                    :icon="RotateCcw"
                    :disabled="!selectedMayorTicketConversionOffer?.affordable"
                    data-testid="mayor-ticket-conversion-submit"
                    @click="handleMayorTicketConversion"
                  >
                    转换票据
                  </Button>
                </template>
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
                  <p class="text-[0.625rem] text-muted/70 mb-1.5">你们当前是知己关系。若想发展婚缘，请先在下方知己面板中断缘，再回来赠帕开始约会。</p>
                </template>
                <template v-else-if="!selectedNpcState?.dating && !(npcStore.weddingCountdown > 0 && npcStore.weddingNpcId === selectedNpc)">
                  <p v-if="npcStore.npcStates.some(s => s.married)" class="text-[0.625rem] text-muted/50 mb-1">你已有伴侣，无法再赠帕。</p>
                  <template v-else>
                    <div class="flex flex-col space-y-0.5 mb-1.5">
                      <span
                        class="text-[0.625rem] flex items-center space-x-1"
                        :class="(selectedNpcState?.friendship ?? 0) >= 2000 ? 'text-success' : 'text-muted/50'"
                      >
                        <CircleCheck v-if="(selectedNpcState?.friendship ?? 0) >= 2000" :size="10" />
                        <Circle v-else :size="10" />
                        <span>好感≥2000（8心）</span>
                        <span class="text-muted/40">— 当前{{ selectedNpcState?.friendship ?? 0 }}</span>
                      </span>
                      <span
                        class="text-[0.625rem] flex items-center space-x-1"
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
                  <p class="text-[0.625rem] text-danger/60 mb-1">
                    约会中
                    <Heart :size="10" class="inline" />
                  </p>
                  <div class="flex flex-col space-y-0.5 mb-1.5">
                    <span
                      class="text-[0.625rem] flex items-center space-x-0.5"
                      :class="(selectedNpcState?.friendship ?? 0) >= 2500 ? 'text-success' : 'text-muted/50'"
                    >
                      <CircleCheck v-if="(selectedNpcState?.friendship ?? 0) >= 2500" :size="10" />
                      <Circle v-else :size="10" />
                      好感≥2500（10心）
                      <span class="text-muted/40">— 当前{{ selectedNpcState?.friendship ?? 0 }}</span>
                    </span>
                    <span
                      class="text-[0.625rem] flex items-center space-x-0.5"
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
                  <p class="text-[0.625rem] text-accent/60 mb-1">{{ selectedNpcDef.gender === 'male' ? '蓝颜知己' : '红颜知己' }} ♦</p>
                  <Button class="w-full text-danger border-danger/40" @click="showZhijiDissolveConfirm = true">断缘</Button>
                </template>
                <template v-else-if="npcStore.npcStates.some(s => s.zhiji)">
                  <p class="text-[0.625rem] text-muted/50">你已有知己，无法再结缘。</p>
                </template>
                <template v-else>
                  <div class="flex flex-col space-y-0.5 mb-1.5">
                    <span
                      class="text-[0.625rem] flex items-center space-x-0.5"
                      :class="(selectedNpcState?.friendship ?? 0) >= 2000 ? 'text-success' : 'text-muted/50'"
                    >
                      <CircleCheck v-if="(selectedNpcState?.friendship ?? 0) >= 2000" :size="10" />
                      <Circle v-else :size="10" />
                      好感≥2000（8心）
                      <span class="text-muted/40">— 当前{{ selectedNpcState?.friendship ?? 0 }}</span>
                    </span>
                    <span
                      class="text-[0.625rem] flex items-center space-x-0.5"
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
            </section>

            <section data-testid="npc-detail-section-gift" :class="npcDetailSectionClass('gift')">
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
                          v-if="getGiftPreference(item.itemId) !== 'unknown'"
                          class="text-[0.625rem]"
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
            </section>

            <section data-testid="npc-detail-section-relationship" :class="npcDetailSectionClass('relationship')">
              <!-- 村中商业话题 -->
              <div v-if="selectedNpcCommerceFeedbackLines.length > 0" class="border border-accent/10 rounded-xs p-2 mb-2">
                <div class="flex items-center justify-between gap-2 mb-1">
                  <p class="text-xs text-muted">村中话题反馈</p>
                  <span class="text-[0.625rem] text-accent">商圈 / 节庆 / 修复</span>
                </div>
                <p
                  v-for="line in selectedNpcCommerceFeedbackLines"
                  :key="`selected-npc-commerce-${line}`"
                  class="text-[0.625rem] text-muted leading-4 mt-0.5"
                >
                  - {{ line }}
                </p>
              </div>

              <!-- 关系收益 -->
              <div class="border border-accent/10 rounded-xs p-2 mb-2">
                <p class="text-xs text-muted mb-1">当前关系收益</p>
                <div v-if="selectedRelationshipFocusLabels.length > 0" class="mb-2">
                  <p class="text-[0.625rem] text-muted mb-1">职业侧重</p>
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="focus in selectedRelationshipFocusLabels"
                      :key="focus"
                      class="text-[0.625rem] border border-accent/15 text-accent/80 rounded-xs px-1 py-0.5"
                    >
                      {{ focus }}
                    </span>
                  </div>
                </div>
                <div v-if="selectedRelationshipBenefits.length > 0" class="flex flex-wrap gap-1">
                  <span v-for="benefit in selectedRelationshipBenefits" :key="benefit" class="text-[0.625rem] border border-success/20 text-success rounded-xs px-1 py-0.5">
                    {{ benefit }}
                  </span>
                </div>
                <p v-else class="text-[0.625rem] text-muted/60">继续互动后会解锁折扣、回礼、专属委托和线索。</p>

                <div v-if="selectedGiftReturnSummaries.length > 0" class="mt-2">
                  <p class="text-[0.625rem] text-muted mb-1">可能回礼</p>
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="giftSummary in selectedGiftReturnSummaries"
                      :key="giftSummary"
                      class="text-[0.625rem] border border-accent/20 text-accent rounded-xs px-1 py-0.5"
                    >
                      {{ giftSummary }}
                    </span>
                  </div>
                </div>

                <div v-if="selectedNextRelationshipBenefits.length > 0" class="mt-2">
                  <p class="text-[0.625rem] text-muted mb-1">下一阶段可解锁</p>
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="benefit in selectedNextRelationshipBenefits"
                      :key="benefit"
                      class="text-[0.625rem] border border-warning/20 text-warning rounded-xs px-1 py-0.5"
                    >
                      {{ benefit }}
                    </span>
                  </div>
                </div>
              </div>

              <div v-if="selectedRelationshipClues.length > 0" class="border border-accent/10 rounded-xs p-2 mb-2">
                <div class="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <p class="text-xs text-muted mb-1">已获得线索</p>
                    <p class="text-[0.625rem] text-muted/70 mt-0.5">{{ selectedGiftKnowledgeStageText }}</p>
                  </div>
                  <div class="flex flex-wrap justify-end gap-1 text-[0.625rem]">
                    <span class="border border-warning/20 text-warning rounded-xs px-1 py-0.5">模糊 {{ selectedGiftKnowledgeSummary.hintCount }}</span>
                    <span class="border border-accent/20 text-accent rounded-xs px-1 py-0.5">明确 {{ selectedGiftKnowledgeSummary.exactCount }}</span>
                    <span class="border border-success/20 text-success rounded-xs px-1 py-0.5">验证 {{ selectedGiftKnowledgeSummary.confirmedCount }}</span>
                  </div>
                </div>
                <div class="space-y-1">
                  <div v-for="clue in selectedRelationshipClues" :key="clue.clueId" class="border border-accent/10 rounded-xs px-2 py-1.5">
                    <div class="flex flex-wrap items-center gap-1 mb-1 text-[0.625rem]">
                      <span class="border border-accent/20 text-accent rounded-xs px-1 py-0.5">{{ CLUE_KIND_LABELS[clue.kind] }}</span>
                      <span class="border rounded-xs px-1 py-0.5" :class="CLUE_PRECISION_CLASS[clue.precision]">{{ CLUE_PRECISION_LABELS[clue.precision] }}</span>
                      <span class="text-muted/70">{{ CLUE_SOURCE_LABELS[clue.source] }}</span>
                      <span v-if="clue.discoveredDayTag" class="text-muted/50">{{ clue.discoveredDayTag }}</span>
                    </div>
                    <p class="text-[0.625rem] text-accent/90 leading-4">{{ clue.text }}</p>
                  </div>
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
            </section>

            <section data-testid="npc-detail-section-schedule" :class="npcDetailSectionClass('schedule')">
              <!-- 今日行程 / 节日存在感 -->
              <div v-if="selectedScheduleStatus" class="border border-accent/10 rounded-xs p-2 mb-2">
                <div class="flex items-center justify-between mb-1">
                  <p class="text-xs text-muted">今日行程</p>
                  <span class="text-[0.625rem]" :class="selectedScheduleStatus.available ? 'text-success' : 'text-muted/50'">
                    {{ selectedScheduleStatus.available ? '可遇见' : '暂时不在' }}
                  </span>
                </div>
                <p v-if="todayEvent" class="text-[0.625rem] text-danger mb-1">今日节日：{{ todayEvent.name }}</p>
                <p v-if="todayEvent?.variantNotes?.dialogueNotes?.[0]" class="text-[0.625rem] text-warning mb-1">
                  台词变化提示：{{ todayEvent.variantNotes.dialogueNotes[0] }}
                </p>
                <p class="text-xs text-accent">{{ selectedScheduleStatus.location }}</p>
                <p class="text-[0.625rem] text-muted mt-0.5">{{ selectedScheduleStatus.summary }}</p>
                <p v-if="selectedScheduleStatus.reason" class="text-[0.625rem] text-warning mt-1">{{ selectedScheduleStatus.reason }}</p>
                <p v-if="selectedScheduleStatus.specialDialogue" class="text-[0.625rem] text-danger mt-1">节日台词：{{ selectedScheduleStatus.specialDialogue }}</p>
                <p v-if="selectedNextScheduleText" class="text-[0.625rem] text-accent/80 mt-1">下一步：{{ selectedNextScheduleText }}</p>

                <div v-if="selectedScheduleTimeline.length > 0" class="mt-2 border-t border-accent/10 pt-2 space-y-1">
                  <p class="text-[0.625rem] text-muted">今日时间线</p>
                  <div
                    v-for="entry in selectedScheduleTimeline"
                    :key="entry.key"
                    class="rounded-xs border px-2 py-1"
                    :class="entry.active ? 'border-success/30 bg-success/5' : 'border-accent/10'"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-[0.625rem]" :class="entry.active ? 'text-success' : 'text-muted/70'">{{ entry.label }}</span>
                      <div v-if="entry.tags.length > 0" class="flex flex-wrap justify-end gap-1">
                        <span v-for="tag in entry.tags" :key="tag" class="text-[0.625rem] px-1 rounded-xs border border-accent/15 text-accent/80">
                          {{ tag }}
                        </span>
                      </div>
                    </div>
                    <p class="text-[0.625rem] text-accent mt-0.5">{{ entry.location }}</p>
                    <p class="text-[0.625rem] text-muted/70 leading-4">{{ entry.summary }}</p>
                  </div>
                </div>
              </div>
            </section>
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
                    <span class="text-xs text-muted">{{ activeGiftReaction.label }}</span>
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
  import { ref, computed, onBeforeUnmount, onMounted, watchEffect, type Component } from 'vue'
  import { useRouter } from 'vue-router'
  import { MessageCircle, Heart, Gift, Cake, X, Package, Lightbulb, Circle, CircleCheck, Users, Sparkles, Diamond, Star, RotateCcw, Mail, Clock, PanelRightOpen } from 'lucide-vue-next'
  import { useCookingStore } from '@/stores/useCookingStore'
  import { useGameStore } from '@/stores/useGameStore'
  import { useInventoryStore } from '@/stores/useInventoryStore'
  import { useNpcStore } from '@/stores/useNpcStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import { useSaveStore } from '@/stores/useSaveStore'
  import { useTutorialStore } from '@/stores/useTutorialStore'
  import { useWalletStore } from '@/stores/useWalletStore'
  import { useVillageProjectStore } from '@/stores/useVillageProjectStore'
  import { useHiddenNpcStore } from '@/stores/useHiddenNpcStore'
  import { useShopStore } from '@/stores/useShopStore'
  import { useSkillStore } from '@/stores/useSkillStore'
  import { NPCS, getNpcById, getItemById, getHeartEventById, getTodayEvent } from '@/data'
  import { MAYOR_TICKET_CONVERSION_NPC_ID, MAYOR_TICKET_CONVERTIBLE_TYPES } from '@/data/rewardTickets'
  import { getNpcRelationshipFocusLabels } from '@/data/npcWorld'
  import { RANDOM_NPC_VISITOR_CONFIG } from '@/data/randomNpcs'
  import { getHiddenNpcById } from '@/data/hiddenNpcs'
  import { ACTION_TIME_COSTS } from '@/data/timeConstants'
  import { TIP_NPC_LABELS } from '@/data/npcTips'
  import type { TipNpcId } from '@/data/npcTips'
  import { getCombinedItemCount } from '@/composables/useCombinedInventory'
  import { addLog, showFloat } from '@/composables/useGameLog'
  import { triggerHeartEvent } from '@/composables/useDialogs'
  import { handleEndDay } from '@/composables/useEndDay'
  import { buildSeasonEventResolutionContext } from '@/utils/seasonEventContext'
  import type {
    ChildTrainingFamilyEventEntry,
    ChildState,
    FriendshipLevel,
    GiftPreference,
    MayorTicketConversionTicketType,
    Quality,
    RandomNpcAcquaintanceEntry,
    RandomNpcAgeBand,
    RandomNpcArchiveSummary,
    RandomNpcBindingPreferenceDef,
    RandomNpcBindingPreferenceKind,
    RandomNpcDialogueSceneDef,
    RandomNpcDialogueMemoryEntry,
    RandomNpcFamilyCommissionDef,
    RandomNpcFamilyReviewEntry,
    RandomNpcFamilySpecialEventEntry,
    RandomNpcFamilyTieDef,
    RandomNpcFamilyTieKind,
    RandomNpcRelationLineKind,
    RandomNpcLongStayEntry,
    RandomNpcLongStayRoute,
    RandomNpcGenerationAnomalyEntry,
    RandomNpcRelationshipDirection,
    RandomNpcRelationshipMilestoneAuditEntry,
    RandomNpcRelationshipGrowthPreviewEntry,
    RandomNpcRelationshipSignals,
    RandomNpcRelationshipTag,
    RandomNpcShortRomanceState,
    RandomNpcStoryChoiceDef,
    RandomNpcVisitorState,
    RelationshipClueEntry,
    VillageProjectRequirementProgress
  } from '@/types'
  import Button from '@/components/game/Button.vue'
  import GuidanceDigestPanel from '@/components/game/GuidanceDigestPanel.vue'
  import QaGovernancePanel from '@/components/game/QaGovernancePanel.vue'
  import FamilyRelationGraph from '@/components/game/FamilyRelationGraph.vue'
  import NpcPortrait from '@/components/game/NpcPortrait.vue'
  import NpcPortraitVariantPicker from '@/components/game/NpcPortraitVariantPicker.vue'
  import HiddenNpcModal from '@/components/game/HiddenNpcModal.vue'
  import DiscoveryScene from '@/components/game/DiscoveryScene.vue'
  import OnlineBottomSheet from '@/components/game/online/OnlineBottomSheet.vue'
  import OnlineTechnicalDetails from '@/components/game/online/OnlineTechnicalDetails.vue'
  import type { DiscoveryStep } from '@/types/hiddenNpc'
  import type { DiscoveryCondition } from '@/types/hiddenNpc'

  const router = useRouter()
  const npcStore = useNpcStore()
  const inventoryStore = useInventoryStore()
  const cookingStore = useCookingStore()
  const gameStore = useGameStore()
  const playerStore = usePlayerStore()
  const saveStore = useSaveStore()
  const tutorialStore = useTutorialStore()
  const hiddenNpcStore = useHiddenNpcStore()
  const villageProjectStore = useVillageProjectStore()
  const walletStore = useWalletStore()
  const shopStore = useShopStore()
  const skillStore = useSkillStore()

  watchEffect(() => {
    walletStore.syncMayorTicketConversionVillageProjectLevel(villageProjectStore.villageProjectLevel)
  })

  const activeTab = ref<'villager' | 'spirit'>('villager')
  const selectedHiddenNpc = ref<string | null>(null)
  type RandomNpcDetailKind = 'visitor' | 'acquaintance' | 'resident' | 'archive'
  type RandomNpcDetailTabId = 'overview' | 'story' | 'relationship' | 'order'
  type RandomNpcDetailPrimaryAction = {
    label: string
    tab: RandomNpcDetailTabId
    icon: Component
    disabled: boolean
    hint: string
  }

  const randomNpcDetailTabs: Array<{ id: RandomNpcDetailTabId; label: string }> = [
    { id: 'overview', label: '总览' },
    { id: 'story', label: '记忆' },
    { id: 'relationship', label: '关系线' },
    { id: 'order', label: '行动' }
  ]
  const selectedRandomNpcDetail = ref<{ kind: RandomNpcDetailKind; id: string } | null>(null)
  const randomNpcDetailTab = ref<RandomNpcDetailTabId>('overview')
  const randomNpcDetailDesktop = ref(typeof window === 'undefined' ? true : window.innerWidth >= 768)
  const relationshipDebugSnapshot = computed(() => npcStore.getRelationshipDebugSnapshot())
  const familyWishOverview = computed(() => npcStore.getFamilyWishOverview())
  const activeFamilyWishDef = computed(() => familyWishOverview.value.defs.find(def => def.id === familyWishOverview.value.state.activeWishId) ?? null)
  const activeFamilyWishChain = computed(() => npcStore.getFamilyWishChainPreview(activeFamilyWishDef.value?.id ?? ''))
  const activeZhijiProjectChain = computed(() => {
    const project = relationshipDebugSnapshot.value.zhijiCompanionProjects.find(entry => !entry.rewarded) ?? null
    return project ? npcStore.getZhijiProjectChainPreview(project.projectId, project.npcId) : null
  })
  const randomNpcBoard = computed(() => npcStore.getRandomNpcBoard())
  const recentRelationshipMilestoneAuditEntries = computed(() => randomNpcBoard.value.relationshipMilestoneAudit.slice(-6).reverse())
  const recentGenerationAnomalyAuditEntries = computed(() => randomNpcBoard.value.generationAnomalyAudit.slice(-4).reverse())
  const randomNpcAcquaintanceThreshold = RANDOM_NPC_VISITOR_CONFIG.acquaintanceAffinityThreshold
  const randomNpcMaxAcquaintances = RANDOM_NPC_VISITOR_CONFIG.maxAcquaintances
  const randomNpcLongStayThreshold = RANDOM_NPC_VISITOR_CONFIG.longStayAffinityThreshold
  const randomNpcMaxLongStayResidents = RANDOM_NPC_VISITOR_CONFIG.maxLongStayResidents
  const randomNpcMaxRecentSummaries = RANDOM_NPC_VISITOR_CONFIG.maxRecentSummaries
  const randomNpcMaxLockedArchives = RANDOM_NPC_VISITOR_CONFIG.maxLockedArchives
  const randomNpcOldLetterItemId = 'paper'
  const randomNpcOldLetterCostQuantity = 1
  const randomNpcOldLetterItemName = computed(() => getItemById(randomNpcOldLetterItemId)?.name ?? '纸张')
  const randomNpcOldLetterCount = computed(() => inventoryStore.getTotalItemCount(randomNpcOldLetterItemId))
  const randomNpcOldKeepsakeItemId = 'silk_ribbon'
  const randomNpcOldKeepsakeCostQuantity = 1
  const randomNpcOldKeepsakeItemName = computed(() => getItemById(randomNpcOldKeepsakeItemId)?.name ?? '丝帕')
  const randomNpcOldKeepsakeCount = computed(() => inventoryStore.getTotalItemCount(randomNpcOldKeepsakeItemId))
  const selectedRandomNpcVisitor = computed(() =>
    selectedRandomNpcDetail.value?.kind === 'visitor'
      ? randomNpcBoard.value.activeVisitors.find(visitor => visitor.id === selectedRandomNpcDetail.value?.id) ?? null
      : null
  )
  const selectedRandomNpcAcquaintance = computed(() =>
    selectedRandomNpcDetail.value?.kind === 'acquaintance'
      ? randomNpcBoard.value.acquaintances.find(acquaintance => acquaintance.visitorId === selectedRandomNpcDetail.value?.id) ?? null
      : null
  )
  const selectedRandomNpcResident = computed(() =>
    selectedRandomNpcDetail.value?.kind === 'resident'
      ? randomNpcBoard.value.longStayResidents.find(resident => resident.residentId === selectedRandomNpcDetail.value?.id) ?? null
      : null
  )
  const selectedRandomNpcArchive = computed(() =>
    selectedRandomNpcDetail.value?.kind === 'archive'
      ? randomNpcBoard.value.recentSummaries.find(summary => summary.visitorId === selectedRandomNpcDetail.value?.id) ?? null
      : null
  )
  const hasSelectedRandomNpcDetail = computed(() =>
    Boolean(selectedRandomNpcVisitor.value || selectedRandomNpcAcquaintance.value || selectedRandomNpcResident.value || selectedRandomNpcArchive.value)
  )
  const randomNpcDetailSheetSide = computed<'bottom' | 'right'>(() => (randomNpcDetailDesktop.value ? 'right' : 'bottom'))
  const randomNpcDetailTitle = computed(() => {
    const entry = selectedRandomNpcVisitor.value ?? selectedRandomNpcAcquaintance.value ?? selectedRandomNpcResident.value ?? selectedRandomNpcArchive.value
    return entry ? `${entry.name} · ${entry.occupation}` : '随机 NPC'
  })
  const randomNpcDetailDescription = computed(() => {
    const visitor = selectedRandomNpcVisitor.value
    if (visitor) return `${visitor.origin} · ${getRandomNpcVisitTierLabel(visitor.tier)} · 好感 ${visitor.affinity}`
    const acquaintance = selectedRandomNpcAcquaintance.value
    if (acquaintance) return `${acquaintance.origin} · 熟人册 · 好感 ${acquaintance.affinity}`
    const resident = selectedRandomNpcResident.value
    if (resident) return `${getRandomNpcLongStayRouteLabel(resident.route)} · 长住阶段 ${resident.relationshipEventStage}/3 · 好感 ${resident.affinity}`
    const archive = selectedRandomNpcArchive.value
    if (archive) return `旧日来客 · ${getRandomNpcRelationshipLabel(archive.relationshipTag)} · 好感 ${archive.affinity}`
    return ''
  })
  const randomNpcDetailPrimaryAction = computed<RandomNpcDetailPrimaryAction>(() => {
    const visitor = selectedRandomNpcVisitor.value
    if (visitor) {
      if (!visitor.talkedToday) return { label: '去对话选择', tab: 'story', icon: MessageCircle, disabled: false, hint: '' }
      if (!visitor.smallOrderCompleted) return { label: '查看小订单', tab: 'order', icon: Package, disabled: false, hint: '今日已对话，仍可查看订单、锁定或后续关系动作。' }
      return { label: '查看关系推进', tab: 'relationship', icon: Heart, disabled: false, hint: '今日对话与订单都已处理，可看自然成长和短线恋爱。' }
    }

    const acquaintance = selectedRandomNpcAcquaintance.value
    if (acquaintance) {
      if (!acquaintance.smallOrderCompleted) return { label: '查看小订单', tab: 'order', icon: Package, disabled: false, hint: '' }
      if (!isRandomNpcLongStay(acquaintance.visitorId)) return { label: '查看长住邀请', tab: 'order', icon: Users, disabled: false, hint: '好感未达标时，按钮会在行动页显示不可用。' }
      return { label: '查看关系成长', tab: 'relationship', icon: Heart, disabled: false, hint: '已转入长住或订单已处理，可查看关系与自然成长。' }
    }

    const resident = selectedRandomNpcResident.value
    if (resident) {
      if (getRandomNpcLongStayStoryEvent(resident)) return { label: '去文游事件', tab: 'story', icon: MessageCircle, disabled: false, hint: '' }
      if (!resident.smallOrderCompleted) return { label: '查看长住订单', tab: 'order', icon: Package, disabled: false, hint: '' }
      if (resident.familyTies.length > 0) return { label: '查看关系推进', tab: 'relationship', icon: Heart, disabled: false, hint: '' }
      return { label: '查看行动', tab: 'order', icon: Sparkles, disabled: false, hint: '节会同行和家族委托会在可用时点亮。' }
    }

    if (selectedRandomNpcArchive.value) {
      return { label: '查看旧档接续', tab: 'order', icon: RotateCcw, disabled: false, hint: '召回、旧信、旧物和节会重逢仍受名额与材料限制。' }
    }

    return { label: '暂无可用动作', tab: 'overview', icon: PanelRightOpen, disabled: true, hint: '先从随机 NPC 列表中打开一个人物。' }
  })
  const syncRandomNpcDetailViewport = () => {
    randomNpcDetailDesktop.value = typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  }
  const openRandomNpcDetail = (kind: RandomNpcDetailKind, id: string, tab: RandomNpcDetailTabId = 'overview') => {
    selectedRandomNpcDetail.value = { kind, id }
    randomNpcDetailTab.value = tab
  }
  const closeRandomNpcDetail = () => {
    selectedRandomNpcDetail.value = null
  }
  const handleRandomNpcDetailPrimaryAction = () => {
    if (randomNpcDetailPrimaryAction.value.disabled) return
    randomNpcDetailTab.value = randomNpcDetailPrimaryAction.value.tab
  }
  onMounted(() => {
    syncRandomNpcDetailViewport()
    window.addEventListener('resize', syncRandomNpcDetailViewport)
  })
  onBeforeUnmount(() => {
    if (typeof window !== 'undefined') window.removeEventListener('resize', syncRandomNpcDetailViewport)
  })
  const randomNpcLockedArchiveCount = computed(() => {
    const lockedIds = new Set<string>()
    randomNpcBoard.value.activeVisitors.forEach(visitor => {
      if (visitor.locked) lockedIds.add(visitor.id)
    })
    randomNpcBoard.value.recentSummaries.forEach(summary => {
      if (summary.locked) lockedIds.add(summary.visitorId)
    })
    return lockedIds.size
  })
  const NPC_COOKING_TOPIC_LABELS = ['NPC 来访话题', '送礼话题', '家宴团圆']
  const npcCookingTopicRecords = computed(() => {
    const records = cookingStore.recentStoryTriggerRecords
    const npcFocused = records.filter(record => record.triggerLabels.some(label => NPC_COOKING_TOPIC_LABELS.includes(label)))
    return (npcFocused.length > 0 ? npcFocused : records).slice(0, 3)
  })
  const currentNpcDayTag = computed(() => {
    const seasonOrder = ['spring', 'summer', 'autumn', 'winter'] as const
    const absoluteDay = (gameStore.year - 1) * 112 + seasonOrder.indexOf(gameStore.season) * 28 + gameStore.day
    const year = Math.floor((absoluteDay - 1) / 112) + 1
    const dayOfYear = ((absoluteDay - 1) % 112) + 1
    const season = seasonOrder[Math.floor((dayOfYear - 1) / 28)] ?? 'spring'
    const day = ((dayOfYear - 1) % 28) + 1
    return `${year}-${season}-${day}`
  })

  const getCookingTopicUsageText = (triggerLabels: string[]): string => {
    if (triggerLabels.includes('送礼话题')) return '送礼'
    if (triggerLabels.includes('家宴团圆')) return '家宴'
    if (triggerLabels.includes('NPC 来访话题')) return '来访'
    return '话题'
  }
  const spiritBondOverview = computed(() => hiddenNpcStore.spiritBondAuditSnapshot)
  const selectedSpiritBlessingSummary = computed(() => (selectedHiddenNpc.value ? hiddenNpcStore.getSpiritBlessingSummary(selectedHiddenNpc.value) : null))
  const selectedSpiritBlessings = computed(() => (selectedHiddenNpc.value ? hiddenNpcStore.getAvailableSpiritBlessings(selectedHiddenNpc.value) : []))
  const selectedSpiritMemoryChain = computed(() => {
    const summary = selectedSpiritBlessingSummary.value
    const nextMemoryId = summary?.memoryRewards.find(entry => !summary.claimedBondMemoryIds.includes(entry.id))?.id ?? summary?.memoryRewards[0]?.id
    return selectedHiddenNpc.value && nextMemoryId ? hiddenNpcStore.getBondMemoryChainPreview(selectedHiddenNpc.value, nextMemoryId) : null
  })

  const handleClaimBondMemory = () => {
    if (!selectedHiddenNpc.value || !selectedSpiritMemoryChain.value) return
    const result = hiddenNpcStore.claimBondMemory(selectedHiddenNpc.value, selectedSpiritMemoryChain.value.memoryReward.id)
    addLog(result.message)
    if (result.success) {
      dialogueText.value = result.message
    }
  }

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

  const RANDOM_NPC_AGE_BAND_LABELS: Record<RandomNpcAgeBand, string> = {
    young: '青年',
    adult: '成年',
    middle: '中年',
    elder: '长者'
  }

  const RANDOM_NPC_RELATIONSHIP_LABELS: Record<RandomNpcRelationshipTag, string> = {
    passing: '萍水相逢',
    acquaintance: '熟人',
    friend: '可深交',
    ambiguous: '暧昧苗头',
    old_contact: '旧识',
    rival: '轻竞争'
  }
  const RANDOM_NPC_RELATIONSHIP_DIRECTION_LABELS: Record<RandomNpcRelationshipDirection, string> = {
    trust: '信任',
    ambiguity: '暧昧',
    misunderstanding: '误会',
    family_impression: '家族印象'
  }
  const RANDOM_NPC_BINDING_PREFERENCE_LABELS: Record<RandomNpcBindingPreferenceKind, string> = {
    crop: '作物',
    pet: '宠物',
    shop: '店铺',
    manor: '庄园'
  }
  const RANDOM_NPC_FAMILY_TIE_LABELS: Record<RandomNpcFamilyTieKind, string> = {
    parent: '父母',
    sibling: '兄弟姐妹',
    distant_relative: '远亲',
    mentor: '师门',
    caravan: '商队',
    old_debt: '旧债',
    family_business: '家族产业',
    sworn_kin: '义亲',
    old_flame: '前缘',
    child: '孩子'
  }
  const RANDOM_NPC_FAMILY_TIE_ATTITUDE_LABELS = {
    supportive: '支持',
    testing: '考验',
    distant: '疏远',
    burdened: '牵挂'
  } as const
  const RANDOM_NPC_FAMILY_TIE_UTILITY_TEXT: Record<RandomNpcFamilyTieKind, { effect: string; reward: string }> = {
    parent: { effect: '抬高家族认可，支撑家人线与婚约判断', reward: '草药、蜂蜜' },
    sibling: { effect: '补足手足认可，让关系线更像被家里接住', reward: '纸张、野果' },
    distant_relative: { effect: '打开旧家往来，补远亲消息和人情边界', reward: '纸张、木材、翡翠' },
    mentor: { effect: '证明你尊重师门来处，推进手艺与家族印象', reward: '竹子、药材干' },
    caravan: { effect: '接住外路担保，让商路、人情账和消息有来源', reward: '西域香料、丝绸' },
    old_debt: { effect: '把旧债从心结变成可处理的阶段记录', reward: '草药、药材干、翡翠' },
    family_business: { effect: '连接婚后家业与旧业小账，给后续经营留口', reward: '纸张、竹子、布匹' },
    sworn_kin: { effect: '确认义亲边界，稳住结拜与家人线的托付感', reward: '布匹、待客清茶' },
    old_flame: { effect: '收束前缘边界，避免旧情压住新关系', reward: '待客清茶' },
    child: { effect: '给孩子兴趣影响和家庭记录提供来处', reward: '本地成长记录' }
  }
  const RANDOM_NPC_RELATION_LINE_LABELS: Record<RandomNpcRelationLineKind, string> = {
    friend: '只做朋友',
    family: '家人线',
    romance: '恋爱线',
    zhiji: '知己线',
    sworn: '结拜线',
    rivalry: '宿怨线',
    severed: '已断缘'
  }
  const randomNpcRelationLineActions: Exclude<RandomNpcRelationLineKind, 'severed'>[] = ['friend', 'family', 'romance', 'zhiji', 'sworn', 'rivalry']
  const RANDOM_NPC_LONG_STAY_ROUTE_LABELS: Record<RandomNpcLongStayRoute, string> = {
    friendship: '邻里常驻',
    business: '商学暂住',
    caregiving: '照料驻村',
    craft: '手艺驻村'
  }

  const getRandomNpcAgeBandLabel = (ageBand: RandomNpcAgeBand): string => RANDOM_NPC_AGE_BAND_LABELS[ageBand]
  const getRandomNpcRelationshipLabel = (tag: RandomNpcRelationshipTag): string => RANDOM_NPC_RELATIONSHIP_LABELS[tag]
  const getRandomNpcVisitTierLabel = (tier: RandomNpcVisitorState['tier']): string => {
    if (tier === 'long_stay') return '长住'
    if (tier === 'acquaintance') return '熟人册'
    return '短访'
  }
  const getRandomNpcLongStayRouteLabel = (route: RandomNpcLongStayRoute): string => RANDOM_NPC_LONG_STAY_ROUTE_LABELS[route]
  const getRandomNpcDevelopmentRouteText = (routes: RandomNpcLongStayRoute[]): string =>
    routes.map(route => RANDOM_NPC_LONG_STAY_ROUTE_LABELS[route]).join('、') || '待观察'
  const getRandomNpcDialogueSceneText = (scenes: RandomNpcDialogueSceneDef[]): string =>
    scenes.slice(0, 3).map(scene => scene.title).join('、') || '待触发'
  const getRandomNpcBindingPreferenceText = (bindings: RandomNpcBindingPreferenceDef[]): string =>
    bindings.slice(0, 4).map(binding => `${RANDOM_NPC_BINDING_PREFERENCE_LABELS[binding.kind]}：${binding.title}`).join('；') || '待观察'
  const getRandomNpcRelationshipDirectionLabel = (direction: RandomNpcRelationshipDirection): string =>
    RANDOM_NPC_RELATIONSHIP_DIRECTION_LABELS[direction]
  const getRandomNpcFamilyTieKindLabel = (kind: RandomNpcFamilyTieKind): string =>
    RANDOM_NPC_FAMILY_TIE_LABELS[kind]
  const getRandomNpcFamilyTieAttitudeLabel = (attitude: keyof typeof RANDOM_NPC_FAMILY_TIE_ATTITUDE_LABELS): string =>
    RANDOM_NPC_FAMILY_TIE_ATTITUDE_LABELS[attitude]
  const getRandomNpcRelationLineLabel = (kind: RandomNpcRelationLineKind): string =>
    RANDOM_NPC_RELATION_LINE_LABELS[kind]
  const getRandomNpcAuditFamilyTieLabel = (kind?: RandomNpcFamilyTieKind): string =>
    kind ? getRandomNpcFamilyTieKindLabel(kind) : '家族'
  const getRandomNpcAuditRelationLineLabel = (kind?: RandomNpcRelationLineKind): string =>
    kind ? getRandomNpcRelationLineLabel(kind) : '关系线'
  const getRandomNpcRelationshipAuditActionLabel = (action: RandomNpcRelationshipMilestoneAuditEntry['action']): string => {
    switch (action) {
      case 'acquaintance_added':
        return '加入熟人册'
      case 'long_stay_promoted':
        return '转为长住'
      case 'long_stay_story_progressed':
        return '记忆推进'
      case 'family_tie_met':
        return '家族节点见面'
      case 'family_special_event_progressed':
        return '家庭事件推进'
      case 'family_commission_fulfilled':
        return '家族委托完成'
      case 'relation_line_started':
        return '关系线开启'
      case 'relation_line_severed':
        return '关系线收束'
      case 'relation_line_engaged':
        return '婚约记录'
      case 'relation_line_married':
        return '成婚记录'
      case 'married_life_recorded':
        return '婚后日常'
      case 'family_business_progressed':
        return '婚后家业'
      case 'child_family_influence_applied':
        return '孩子兴趣影响'
      case 'child_family_event_progressed':
        return '孩子家庭事件'
    }
  }
  const getRandomNpcRelationshipAuditSummary = (entry: RandomNpcRelationshipMilestoneAuditEntry): string => {
    const stageText = typeof entry.stage === 'number' && entry.stage > 0 ? `第 ${entry.stage} 阶段` : '关键节点'
    const relationLineLabel = getRandomNpcAuditRelationLineLabel(entry.relationLineKind)
    const familyTieLabel = getRandomNpcAuditFamilyTieLabel(entry.familyTieKind)
    switch (entry.action) {
      case 'acquaintance_added':
        return `${entry.npcName} 已加入熟人册，后续来访会保留旧识线索。`
      case 'long_stay_promoted':
        return `${entry.npcName} 已转为长住居民，关系线进入可持续推进状态。`
      case 'long_stay_story_progressed':
        return `${entry.npcName} 的长住记忆已推进到${stageText}。`
      case 'family_tie_met':
        return `${entry.npcName} 已见过${familyTieLabel}相关人物，家族印象推进到${stageText}。`
      case 'family_special_event_progressed':
        return `${entry.npcName} 的${familyTieLabel}家庭事件推进到${stageText}。`
      case 'family_commission_fulfilled':
        return `${entry.npcName} 的${familyTieLabel}家族委托已完成，并写入本地关系回看。`
      case 'relation_line_started':
        return `${entry.npcName} 的${relationLineLabel}已开启。`
      case 'relation_line_severed':
        return `${entry.npcName} 的关系线已收束，旧识记录仍会保留。`
      case 'relation_line_engaged':
        return `${entry.npcName} 的婚约节点已记录。`
      case 'relation_line_married':
        return `${entry.npcName} 的成婚节点已记录。`
      case 'married_life_recorded':
        return `${entry.npcName} 的婚后日常已记录到${relationLineLabel}。`
      case 'family_business_progressed':
        return `${entry.npcName} 的婚后家业推进到${stageText}。`
      case 'child_family_influence_applied':
        return `孩子兴趣已受到 ${entry.npcName} 的家族来处影响。`
      case 'child_family_event_progressed':
        return `孩子家庭事件已随 ${entry.npcName} 的家族线推进到${stageText}。`
    }
  }
  const getRandomNpcGenerationAnomalyActionLabel = (action: RandomNpcGenerationAnomalyEntry['action']): string => {
    switch (action) {
      case 'active_visitor_overflow':
        return '来访人数超限'
      case 'duplicate_visitor_id':
        return '重复来访编号'
      case 'invalid_template_reference':
        return '模板引用异常'
      case 'weekly_generation_overflow':
        return '本周生成超限'
    }
  }
  const getRandomNpcGenerationAnomalySummary = (entry: RandomNpcGenerationAnomalyEntry): string => {
    switch (entry.action) {
      case 'active_visitor_overflow':
        return `当前来访记录超过上限，已收束为最多 ${entry.limit} 名可用来访者。`
      case 'duplicate_visitor_id':
        return `发现重复来访编号，已按本地存档护栏去重。`
      case 'invalid_template_reference':
        return `发现不可用的来访模板引用，已跳过异常模板并保留可恢复记录。`
      case 'weekly_generation_overflow':
        return `本周生成记录超过上限，已保留最近 ${entry.limit} 条安全记录。`
    }
  }
  const getRandomNpcRelationshipSignalText = (signals: RandomNpcRelationshipSignals): string => {
    const entries = (Object.keys(RANDOM_NPC_RELATIONSHIP_DIRECTION_LABELS) as RandomNpcRelationshipDirection[])
      .map(direction => ({ direction, value: signals?.[direction] ?? 0 }))
      .filter(entry => entry.value > 0)
    if (entries.length === 0) return '关系方向尚未形成'
    return entries
      .map(entry => `${getRandomNpcRelationshipDirectionLabel(entry.direction)} ${entry.value}`)
      .join(' / ')
  }
  const getRandomNpcVisitorGrowthPreview = (visitor: RandomNpcVisitorState): RandomNpcRelationshipGrowthPreviewEntry[] =>
    npcStore.getRandomNpcRelationshipGrowthPreview(visitor)
      .filter(beat => beat.kind === 'acquaintance' || beat.kind === 'short_romance')
  const getRandomNpcAcquaintanceGrowthPreview = (acquaintance: RandomNpcAcquaintanceEntry): RandomNpcRelationshipGrowthPreviewEntry[] =>
    npcStore.getRandomNpcRelationshipGrowthPreview(acquaintance)
      .filter(beat => beat.kind === 'long_stay' || beat.kind === 'short_romance')
  const getRandomNpcResidentGrowthPreview = (resident: RandomNpcLongStayEntry): RandomNpcRelationshipGrowthPreviewEntry[] =>
    npcStore.getRandomNpcRelationshipGrowthPreview(resident)
      .filter(beat => beat.kind === 'romance' || beat.kind === 'family')
  const getRecentRandomNpcDialogueMemories = (memories: RandomNpcDialogueMemoryEntry[] = []): RandomNpcDialogueMemoryEntry[] =>
    memories.slice(-3).reverse()
  const getRecentRandomNpcShortRomanceHistory = (line?: RandomNpcShortRomanceState) =>
    (line?.history ?? []).slice(-3).reverse()
  const getRandomNpcShortRomanceStatusText = (line?: RandomNpcShortRomanceState): string => {
    if (line?.status === 'invited') return '短线暧昧中'
    if (line?.status === 'ended') return '已收束'
    return '未开启'
  }
  const canStartRandomNpcShortRomance = (visitorId: string) =>
    npcStore.canStartRandomNpcShortRomance(visitorId)
  const getRecentRandomNpcRelationLineHistory = (resident: RandomNpcLongStayEntry) =>
    resident.relationshipLine.history.slice(-3).reverse()
  const getRecentRandomNpcFamilyReviews = (resident: RandomNpcLongStayEntry) =>
    resident.familyLine.reviewHistory.slice(-3).reverse()
  const getRecentRandomNpcFamilyBusinessHistory = (resident: RandomNpcLongStayEntry) =>
    resident.familyLine.familyBusinessHistory.slice(-3).reverse()
  const getRecentRandomNpcFamilySpecialEvents = (resident: RandomNpcLongStayEntry): RandomNpcFamilySpecialEventEntry[] =>
    [...(resident.familyLine.specialTieEventHistory ?? [])].slice(-3).reverse()
  const getRandomNpcFamilyReviewTypeLabel = (type: RandomNpcFamilyReviewEntry['type']): string => {
    if (type === 'commission') return '家族委托'
    if (type === 'business') return '婚后家业'
    if (type === 'relationship') return '关系触发'
    if (type === 'commitment') return '婚约成婚'
    if (type === 'home') return '婚后日常'
    if (type === 'festival') return '节会同行'
    if (type === 'reunion') return '旧档接续'
    return '见家人'
  }
  const getRandomNpcFamilyCommission = (resident: RandomNpcLongStayEntry): RandomNpcFamilyCommissionDef | null =>
    npcStore.getRandomNpcFamilyCommission(resident.residentId)
  const isRandomNpcFamilyCommissionCompleted = (resident: RandomNpcLongStayEntry): boolean => {
    const commission = getRandomNpcFamilyCommission(resident)
    return !!commission && resident.familyLine.completedCommissionIds.includes(commission.id)
  }
  const canMeetRandomNpcFamilyTie = (resident: RandomNpcLongStayEntry, tieId: string) =>
    npcStore.canMeetRandomNpcFamilyTie(resident.residentId, tieId)
  const isRandomNpcSpecialFamilyTieKind = (kind: RandomNpcFamilyTieKind): boolean =>
    kind === 'parent' ||
    kind === 'sibling' ||
    kind === 'distant_relative' ||
    kind === 'mentor' ||
    kind === 'caravan' ||
    kind === 'old_debt' ||
    kind === 'family_business' ||
    kind === 'sworn_kin' ||
    kind === 'old_flame'
  const getSpecialFamilyTies = (resident: RandomNpcLongStayEntry): RandomNpcFamilyTieDef[] =>
    resident.familyTies.filter(tie => isRandomNpcSpecialFamilyTieKind(tie.kind))
  const canProgressRandomNpcFamilySpecialEvent = (resident: RandomNpcLongStayEntry, tieId: string) =>
    npcStore.canProgressRandomNpcFamilySpecialEvent(resident.residentId, tieId)
  const getRandomNpcFamilyMeetingStage = (resident: RandomNpcLongStayEntry, tieId: string): 0 | 1 | 2 | 3 =>
    resident.familyLine.familyMeetingStages?.[tieId] ?? (resident.familyLine.metTieIds.includes(tieId) ? 1 : 0)
  const getRandomNpcFamilySpecialStage = (resident: RandomNpcLongStayEntry, tieId: string): 0 | 1 | 2 | 3 =>
    resident.familyLine.specialTieEventStages?.[tieId] ?? 0
  const getRandomNpcFamilyMeetingSummary = (resident: RandomNpcLongStayEntry): string => {
    const total = resident.familyTies.length * 3
    const completed = resident.familyTies.reduce((sum, tie) => sum + getRandomNpcFamilyMeetingStage(resident, tie.id), 0)
    return `${completed}/${total}`
  }
  const getRandomNpcFamilySpecialSummary = (resident: RandomNpcLongStayEntry): string => {
    const specialTies = getSpecialFamilyTies(resident)
    if (specialTies.length <= 0) return '无核心节点'
    const total = specialTies.length * 3
    const completed = specialTies.reduce((sum, tie) => sum + getRandomNpcFamilySpecialStage(resident, tie.id), 0)
    return `${completed}/${total}`
  }
  const getRandomNpcFamilyCurrentUseSummary = (resident: RandomNpcLongStayEntry): string => {
    const metCount = resident.familyTies.filter(tie => getRandomNpcFamilyMeetingStage(resident, tie.id) > 0).length
    if (metCount <= 0) return '先见任一节点'
    if (resident.relationshipLine.kind === 'family' && resident.relationshipLine.stage > 0) return '家人线加赠'
    if (resident.familyLine.reputation >= 60) return '可撑婚后家业'
    if (resident.familyLine.reputation >= 55) return '可撑订婚评价'
    return '继续涨评价'
  }
  const getRandomNpcFamilyTieProgressText = (resident: RandomNpcLongStayEntry, tie: RandomNpcFamilyTieDef): string => {
    const meetingStage = getRandomNpcFamilyMeetingStage(resident, tie.id)
    if (!isRandomNpcSpecialFamilyTieKind(tie.kind)) return `见面 ${meetingStage}/3`
    return `见面 ${meetingStage}/3 · 深线 ${getRandomNpcFamilySpecialStage(resident, tie.id)}/3`
  }
  const getRandomNpcFamilyTieUtilityText = (resident: RandomNpcLongStayEntry, tie: RandomNpcFamilyTieDef): string => {
    const utility = RANDOM_NPC_FAMILY_TIE_UTILITY_TEXT[tie.kind]
    const meetingStage = getRandomNpcFamilyMeetingStage(resident, tie.id)
    const specialStage = getRandomNpcFamilySpecialStage(resident, tie.id)
    if (meetingStage <= 0) return `${utility.effect}；先见过这个节点。`
    if (isRandomNpcSpecialFamilyTieKind(tie.kind) && specialStage < 3) {
      return `${utility.effect}；深线奖励：${utility.reward}；下一段 ${specialStage + 1}/3。`
    }
    return `${utility.effect}；已可作为关系回看和后续门槛依据。`
  }
  const getRandomNpcFamilyMeetingButtonText = (
    resident: RandomNpcLongStayEntry,
    tieId: string,
    relation: string
  ): string => {
    const stage = getRandomNpcFamilyMeetingStage(resident, tieId)
    if (stage >= 3) return `${relation}定评完成`
    const guard = canMeetRandomNpcFamilyTie(resident, tieId)
    if (!guard.success) return guard.message
    return stage <= 0 ? `见${relation} 1/3` : `再见${relation} ${stage + 1}/3`
  }
  const getRandomNpcFamilySpecialButtonText = (
    resident: RandomNpcLongStayEntry,
    tieId: string,
    relation: string
  ): string => {
    const stage = getRandomNpcFamilySpecialStage(resident, tieId)
    if (stage >= 3) return `${relation}深线完成`
    const guard = canProgressRandomNpcFamilySpecialEvent(resident, tieId)
    if (!guard.success) return guard.message
    return stage <= 0 ? `推进${relation}深线 1/3` : `继续${relation}深线 ${stage + 1}/3`
  }
  const canFulfillRandomNpcFamilyCommission = (resident: RandomNpcLongStayEntry): boolean => {
    const commission = getRandomNpcFamilyCommission(resident)
    if (!commission || isRandomNpcFamilyCommissionCompleted(resident)) return false
    if (!resident.familyLine.metTieIds.includes(commission.tieId)) return false
    return canFulfillRandomNpcSmallOrder(commission)
  }
  const canDevelopRandomNpcFamilyBusiness = (resident: RandomNpcLongStayEntry) =>
    npcStore.canDevelopRandomNpcFamilyBusiness(resident.residentId)
  const canApplyRandomNpcFamilyInfluenceToChild = (childId: number, resident: RandomNpcLongStayEntry) =>
    npcStore.canApplyRandomNpcFamilyInfluenceToChild(childId, resident.residentId)
  const canProgressRandomNpcChildFamilyEvent = (childId: number, resident: RandomNpcLongStayEntry) =>
    npcStore.canProgressRandomNpcChildFamilyEvent(childId, resident.residentId)
  const getChildFamilyInfluenceButtonText = (child: ChildState, resident: RandomNpcLongStayEntry): string => {
    const guard = canApplyRandomNpcFamilyInfluenceToChild(child.id, resident)
    if (guard.success) return '写入家族影响'
    const latest = child.trainingState.familyInfluenceHistory[child.trainingState.familyInfluenceHistory.length - 1]
    return latest ? `已受${latest.sourceName}影响` : guard.message
  }
  const getChildFamilyEventButtonText = (child: ChildState, resident: RandomNpcLongStayEntry): string => {
    const guard = canProgressRandomNpcChildFamilyEvent(child.id, resident)
    if (guard.success && guard.stage) return `推进兴趣事件 ${guard.stage}/3`
    const latest = getRecentChildFamilyEvents(child, resident)[0]
    return latest ? `${latest.title}已到${latest.stage}/3` : guard.message
  }
  const getRecentChildFamilyEvents = (
    child: ChildState,
    resident: RandomNpcLongStayEntry
  ): ChildTrainingFamilyEventEntry[] =>
    [...(child.trainingState.familyEventHistory ?? [])]
      .filter(event => event.sourceResidentId === resident.residentId)
      .slice(-2)
      .reverse()
  const getRandomNpcFamilyCommissionButtonText = (resident: RandomNpcLongStayEntry): string => {
    const commission = getRandomNpcFamilyCommission(resident)
    if (!commission) return '暂无家族委托'
    if (resident.familyLine.completedCommissionIds.includes(commission.id)) return '已完成家族委托'
    if (!resident.familyLine.metTieIds.includes(commission.tieId)) return '先见对应家人'
    return '交付家族委托'
  }
  const getRandomNpcFamilyCommissionProgressText = (resident: RandomNpcLongStayEntry): string => {
    const commission = getRandomNpcFamilyCommission(resident)
    return commission ? getRandomNpcSmallOrderProgressText(commission) : '暂无材料需求'
  }
  const canStartRandomNpcRelationLine = (
    resident: RandomNpcLongStayEntry,
    kind: Exclude<RandomNpcRelationLineKind, 'severed'>
  ) => npcStore.canStartRandomNpcRelationLine(resident.residentId, kind)
  const canEngageRandomNpcRelationLine = (resident: RandomNpcLongStayEntry) =>
    npcStore.canEngageRandomNpcRelationLine(resident.residentId)
  const canMarryRandomNpcRelationLine = (resident: RandomNpcLongStayEntry) =>
    npcStore.canMarryRandomNpcRelationLine(resident.residentId)
  const getRandomNpcCommitmentStatusText = (resident: RandomNpcLongStayEntry): string => {
    const line = resident.relationshipLine
    if (line.commitmentStatus === 'married') return `已成婚${line.marriedDayTag ? ` · ${line.marriedDayTag}` : ''}`
    if (line.commitmentStatus === 'engaged') return `已订婚${line.commitmentDayTag ? ` · ${line.commitmentDayTag}` : ''}`
    return '未订婚'
  }
  const getRandomNpcRelationLineButtonText = (
    resident: RandomNpcLongStayEntry,
    kind: Exclude<RandomNpcRelationLineKind, 'severed'>
  ): string => resident.relationshipLine.kind === kind && resident.relationshipLine.stage > 0
    ? `已${getRandomNpcRelationLineLabel(kind)}`
    : getRandomNpcRelationLineLabel(kind)
  const getRandomNpcRelationLineHint = (resident: RandomNpcLongStayEntry): string => {
    if (resident.relationshipLine.kind === 'severed') return '断缘后本版不再重新开启关系线，只保留旧识记录。'
    if (resident.relationshipLine.stage > 0) return '当前关系线已锁定；如需更换方向，先断缘再重新选择。'
    const family = canStartRandomNpcRelationLine(resident, 'family')
    const romance = canStartRandomNpcRelationLine(resident, 'romance')
    const zhiji = canStartRandomNpcRelationLine(resident, 'zhiji')
    const rivalry = canStartRandomNpcRelationLine(resident, 'rivalry')
    if (family.success && rivalry.success && (romance.success || zhiji.success)) return '可选择家人、恋爱、知己或宿怨线；家人 / 宿怨不占用恋爱 / 知己名额，但仍需先断缘才能改线。'
    if (family.success) return '可开启家人线：把见家人、家族委托和核心深线作为本地可回看的长期关系，不写入联机公开关系图。'
    if (rivalry.success && (romance.success || zhiji.success)) return '可选择恋爱、知己或宿怨线；恋爱 / 知己互斥，宿怨线只记录误会化解。'
    if (rivalry.success) return '可开启宿怨线：把误会或竞争记录为本地可回看的化解线，不占用恋爱 / 知己名额。'
    if (romance.success || zhiji.success) return '可选择恋爱或知己线；两者会与固定 NPC 婚恋 / 知己互斥。'
    return family.message || rivalry.message || romance.message || zhiji.message || '需要更多好感与关系方向记录。'
  }
  const getLastRandomNpcEvent = (visitor: RandomNpcVisitorState): string => visitor.keyEvents[visitor.keyEvents.length - 1] ?? visitor.dialogueOpening
  const getLastRandomNpcAcquaintanceEvent = (acquaintance: RandomNpcAcquaintanceEntry): string =>
    acquaintance.keyEvents[acquaintance.keyEvents.length - 1] ?? `${acquaintance.name}已记入熟人册。`
  const getLastRandomNpcLongStayEvent = (resident: RandomNpcLongStayEntry): string =>
    resident.keyEvents[resident.keyEvents.length - 1] ?? `${resident.name}正在桃源村暂住。`
  const getRandomNpcLongStayStoryEvent = (resident: RandomNpcLongStayEntry) =>
    npcStore.getNextRandomNpcLongStayStoryEvent(resident)
  const getRandomNpcLongStayStoryChoices = (resident: RandomNpcLongStayEntry): RandomNpcStoryChoiceDef[] =>
    getRandomNpcLongStayStoryEvent(resident)?.choices ?? []
  const canProgressRandomNpcFestivalCompanion = (resident: RandomNpcLongStayEntry) =>
    npcStore.canProgressRandomNpcFestivalCompanion(resident.residentId)
  const getRandomNpcFestivalCompanionHint = (resident: RandomNpcLongStayEntry): string => {
    const guard = canProgressRandomNpcFestivalCompanion(resident)
    if (guard.success) return `今日有${guard.eventName}，同行会写入长住文游记忆，同日只记一次。`
    return guard.message
  }
  const getRandomNpcPreferenceNames = (itemIds: string[]): string =>
    itemIds.map(itemId => getItemById(itemId)?.name ?? itemId).join('、') || '尚未记录'
  const isRandomNpcLongStay = (visitorId: string): boolean =>
    randomNpcBoard.value.longStayResidents.some(resident => resident.sourceVisitorId === visitorId)
  const canLockMoreRandomNpc = (visitorId: string): boolean => {
    const activeVisitor = randomNpcBoard.value.activeVisitors.find(visitor => visitor.id === visitorId)
    const archive = randomNpcBoard.value.recentSummaries.find(summary => summary.visitorId === visitorId)
    if (activeVisitor?.locked || archive?.locked) return true
    return randomNpcLockedArchiveCount.value < randomNpcMaxLockedArchives
  }
  const canRecallRandomNpcArchive = (summary: RandomNpcArchiveSummary): boolean => {
    const hasExistingNpc =
      randomNpcBoard.value.activeVisitors.some(visitor => visitor.id === summary.visitorId) ||
      randomNpcBoard.value.acquaintances.some(acquaintance => acquaintance.visitorId === summary.visitorId) ||
      randomNpcBoard.value.longStayResidents.some(resident => resident.sourceVisitorId === summary.visitorId)
    if (hasExistingNpc) return false
    if (summary.archivedTier === 'long_stay') {
      return randomNpcBoard.value.longStayResidents.length < RANDOM_NPC_VISITOR_CONFIG.maxLongStayResidents
    }
    return randomNpcBoard.value.activeVisitors.length < RANDOM_NPC_VISITOR_CONFIG.maxActiveVisitors
  }
  const canRecallRandomNpcArchiveByOldLetter = (summary: RandomNpcArchiveSummary): boolean =>
    canRecallRandomNpcArchive(summary) && randomNpcOldLetterCount.value >= randomNpcOldLetterCostQuantity
  const canRecallRandomNpcArchiveByOldKeepsake = (summary: RandomNpcArchiveSummary): boolean =>
    canRecallRandomNpcArchive(summary) && randomNpcOldKeepsakeCount.value >= randomNpcOldKeepsakeCostQuantity
  const canRecallRandomNpcArchiveByFestivalReunion = (summary: RandomNpcArchiveSummary): boolean =>
    canRecallRandomNpcArchive(summary) && !!todayEvent.value
  const getRandomNpcSmallOrderItemCount = (itemId: string): number => inventoryStore.getTotalItemCount(itemId)
  const canFulfillRandomNpcSmallOrder = (order: { requestedItems: Array<{ itemId: string; quantity: number }> }): boolean =>
    order.requestedItems.every(item => getRandomNpcSmallOrderItemCount(item.itemId) >= item.quantity)
  const getRandomNpcSmallOrderProgressText = (order: { requestedItems: Array<{ itemId: string; quantity: number }> }): string =>
    order.requestedItems
      .map(item => `${getItemById(item.itemId)?.name ?? item.itemId} ${getRandomNpcSmallOrderItemCount(item.itemId)}/${item.quantity}`)
      .join('、')

  const handleRandomVisitorTalk = (visitorId: string, choiceId: string) => {
    const result = npcStore.talkToRandomVisitor(visitorId, choiceId)
    if (!result.success) {
      showFloat(result.message, 'accent')
      addLog(result.message)
      return
    }
    showFloat(`来访者好感 +${result.affinityChange}`, 'success')
    addLog(`【本周来访】${result.visitor?.name ?? '来访者'}：${result.message}`)
  }

  const handleFulfillRandomNpcSmallOrder = (visitorId: string) => {
    const result = npcStore.fulfillRandomNpcSmallOrder(visitorId)
    showFloat(result.message, result.success ? 'success' : 'accent')
    addLog(`【随机NPC小订单】${result.message}`)
  }

  const handleStartRandomNpcShortRomance = (visitorId: string) => {
    const result = npcStore.startRandomNpcShortRomance(visitorId)
    showFloat(result.message, result.success ? 'success' : 'accent')
    addLog(`【随机NPC短线恋爱】${result.message}`)
  }

  const handleEndRandomNpcShortRomance = (visitorId: string) => {
    const result = npcStore.endRandomNpcShortRomance(visitorId)
    showFloat(result.message, result.success ? 'success' : 'accent')
    addLog(`【随机NPC短线恋爱】${result.message}`)
  }

  const handleMeetRandomNpcFamilyTie = (residentId: string, tieId: string) => {
    const result = npcStore.meetRandomNpcFamilyTie(residentId, tieId)
    showFloat(result.message, result.success ? 'success' : 'accent')
    addLog(`【随机NPC家族】${result.message}`)
  }

  const handleProgressRandomNpcFamilySpecialEvent = (residentId: string, tieId: string) => {
    const result = npcStore.progressRandomNpcFamilySpecialEvent(residentId, tieId)
    showFloat(result.message, result.success ? 'success' : 'accent')
    addLog(`\u3010\u968f\u673aNPC\u5bb6\u65cf\u6df1\u7ebf\u3011${result.message}`)
  }

  const handleFulfillRandomNpcFamilyCommission = (residentId: string) => {
    const result = npcStore.fulfillRandomNpcFamilyCommission(residentId)
    showFloat(result.message, result.success ? 'success' : 'accent')
    addLog(`【随机NPC家族委托】${result.message}`)
  }

  const handleDevelopRandomNpcFamilyBusiness = (residentId: string) => {
    const result = npcStore.developRandomNpcFamilyBusiness(residentId)
    showFloat(result.message, result.success ? 'success' : 'accent')
    addLog(`【随机NPC婚后家业】${result.message}`)
  }

  const handleApplyRandomNpcFamilyInfluenceToChild = (childId: number, residentId: string) => {
    const result = npcStore.applyRandomNpcFamilyInfluenceToChild(childId, residentId)
    showFloat(result.message, result.success ? 'success' : 'accent')
    addLog(`【孩子兴趣】${result.message}`)
  }

  const handleProgressRandomNpcChildFamilyEvent = (childId: number, residentId: string) => {
    const result = npcStore.progressRandomNpcChildFamilyEvent(childId, residentId)
    showFloat(result.message, result.success ? 'success' : 'accent')
    addLog(`【孩子兴趣事件】${result.message}`)
  }

  const handleToggleRandomNpcLock = (visitorId: string, locked: boolean) => {
    const result = npcStore.setRandomNpcLock(visitorId, locked)
    showFloat(result.message, result.success ? 'success' : 'accent')
    addLog(`【随机NPC锁定】${result.message}`)
  }

  const handleRecallRandomNpcArchive = (visitorId: string) => {
    const result = npcStore.recallRandomNpcArchive(visitorId)
    showFloat(result.message, result.success ? 'success' : 'accent')
    addLog(`【随机NPC召回】${result.message}`)
  }
  const handleRecallRandomNpcArchiveByOldLetter = (visitorId: string) => {
    const result = npcStore.recallRandomNpcArchiveByOldLetter(visitorId)
    showFloat(result.message, result.success ? 'success' : 'accent')

    addLog(`【随机NPC旧信】${result.message}`)
  }

  const handleRecallRandomNpcArchiveByOldKeepsake = (visitorId: string) => {
    const result = npcStore.recallRandomNpcArchiveByOldKeepsake(visitorId)
    showFloat(result.message, result.success ? 'success' : 'accent')
    addLog(`【随机NPC旧物】${result.message}`)
  }

  const handleRecallRandomNpcArchiveByFestivalReunion = (visitorId: string) => {
    const result = npcStore.recallRandomNpcArchiveByFestivalReunion(visitorId)
    showFloat(result.message, result.success ? 'success' : 'accent')
    addLog(`【随机NPC节会重逢】${result.message}`)
  }

  if (import.meta.env.DEV) {
    ;(globalThis as any).__TAOYUAN_RANDOM_NPC_DEBUG__ = {
      prepareDialogueSmoke: () => {
        activeTab.value = 'villager'
        const board = npcStore.getRandomNpcBoard()
        const visitor = board.activeVisitors[0]
        const choice = visitor?.dialogueChoices[0]
        if (!visitor || !choice) return null

        visitor.talkedToday = false
        return {
          visitorId: visitor.id,
          visitorName: visitor.name,
          choiceId: choice.id,
          expectedResponse: choice.response
        }
      }
    }
  }

  const handleAddRandomVisitorToAcquaintance = (visitorId: string) => {
    const result = npcStore.addRandomVisitorToAcquaintanceBook(visitorId)
    showFloat(result.message, result.success ? 'success' : 'accent')
    addLog(`【熟人册】${result.message}`)
  }

  const handlePromoteRandomNpcToLongStay = (visitorId: string) => {
    const result = npcStore.promoteRandomNpcAcquaintanceToLongStay(visitorId)
    showFloat(result.message, result.success ? 'success' : 'accent')
    addLog(`【长住NPC】${result.message}`)
  }

  const handleProgressRandomNpcLongStayStory = (residentId: string, choiceId: string) => {
    const result = npcStore.progressRandomNpcLongStayStory(residentId, choiceId)
    showFloat(result.message, result.success ? 'success' : 'accent')
    addLog(`【文游对话】${result.message}`)
  }

  const handleProgressRandomNpcFestivalCompanion = (residentId: string) => {
    const result = npcStore.progressRandomNpcFestivalCompanion(residentId)
    showFloat(result.message, result.success ? 'success' : 'accent')
    addLog(`【随机NPC节会同行】${result.message}`)
  }

  const handleStartRandomNpcRelationLine = (
    residentId: string,
    kind: Exclude<RandomNpcRelationLineKind, 'severed'>
  ) => {
    const result = npcStore.startRandomNpcRelationLine(residentId, kind)
    showFloat(result.message, result.success ? 'success' : 'accent')
    addLog(`【随机NPC关系线】${result.message}`)
  }

  const handleSeverRandomNpcRelationLine = (residentId: string) => {
    const result = npcStore.severRandomNpcRelationLine(residentId)
    showFloat(result.message, result.success ? 'success' : 'accent')
    addLog(`【随机NPC断缘】${result.message}`)
  }

  const handleEngageRandomNpcRelationLine = (residentId: string) => {
    const result = npcStore.engageRandomNpcRelationLine(residentId)
    showFloat(result.message, result.success ? 'success' : 'accent')
    addLog(`【随机NPC婚约】${result.message}`)
  }

  const handleMarryRandomNpcRelationLine = (residentId: string) => {
    const result = npcStore.marryRandomNpcRelationLine(residentId)
    showFloat(result.message, result.success ? 'success' : 'accent')
    addLog(`【随机NPC成婚】${result.message}`)
  }

  const handleRecordRandomNpcMarriedLife = (residentId: string) => {
    const result = npcStore.recordRandomNpcMarriedLife(residentId)
    showFloat(result.message, result.success ? 'success' : 'accent')
    addLog(`【随机NPC婚后日常】${result.message}`)
  }

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

  type NpcDetailTabId = 'interact' | 'gift' | 'relationship' | 'schedule'

  const npcDetailTabs: Array<{ id: NpcDetailTabId; label: string; icon: Component }> = [
    { id: 'interact', label: '互动', icon: MessageCircle },
    { id: 'gift', label: '送礼', icon: Gift },
    { id: 'relationship', label: '关系', icon: Heart },
    { id: 'schedule', label: '行程', icon: Clock }
  ]

  const selectedNpc = ref<string | null>(null)
  const selectedNpcDetailTab = ref<NpcDetailTabId>('interact')
  const dialogueText = ref<string | null>(null)
  const showSelectedNpcPortraitPicker = ref(false)
  const showDivorceConfirm = ref(false)
  const showZhijiDissolveConfirm = ref(false)
  const activeGiftKey = ref<string | null>(null)
  const mayorTicketConversionSourceType = ref<MayorTicketConversionTicketType>('construction')
  const mayorTicketConversionTargetType = ref<MayorTicketConversionTicketType>('exhibit')

  const activeGiftItem = computed(() => {
    if (!activeGiftKey.value) return null
    const [itemId, quality] = activeGiftKey.value.split(':')
    return inventoryStore.visibleItems.find(i => !i.locked && i.itemId === itemId && i.quality === quality) ?? null
  })

  const activeGiftDef = computed(() => {
    if (!activeGiftItem.value) return null
    return getItemById(activeGiftItem.value.itemId) ?? null
  })

  const selectedNpcDef = computed(() => (selectedNpc.value ? getNpcById(selectedNpc.value) : null))
  const selectedNpcState = computed(() => (selectedNpc.value ? npcStore.getNpcState(selectedNpc.value) : null))
  const mayorTicketConversionStatus = computed(() => walletStore.mayorTicketConversionStatus)
  const mayorTicketConversionOffers = computed(() => walletStore.ticketConversionOffers)
  const mayorTicketConversionTicketOptions = computed(() =>
    MAYOR_TICKET_CONVERTIBLE_TYPES.map(ticketType => ({
      ticketType,
      label: walletStore.getTicketLabel(ticketType),
      balance: walletStore.getRewardTicketBalance(ticketType)
    }))
  )
  const mayorTicketConversionTargetOptions = computed(() =>
    mayorTicketConversionTicketOptions.value.filter(option => option.ticketType !== mayorTicketConversionSourceType.value)
  )
  const selectedMayorTicketConversionOffer = computed(() =>
    mayorTicketConversionOffers.value.find(
      offer =>
        offer.sourceType === mayorTicketConversionSourceType.value &&
        offer.targetType === mayorTicketConversionTargetType.value
    ) ?? null
  )
  const selectedScheduleStatus = computed(() => (selectedNpc.value ? npcStore.getScheduleStatus(selectedNpc.value) : null))
  const selectedScheduleTimeline = computed(() => (selectedNpc.value ? npcStore.getScheduleTimeline(selectedNpc.value) : []))
  const selectedNextScheduleText = computed(() => (selectedNpc.value ? npcStore.getNextScheduleText(selectedNpc.value) : null))
  const selectedRelationshipBenefits = computed(() => (selectedNpc.value ? npcStore.getRelationshipBenefits(selectedNpc.value) : []))
  const selectedRelationshipFocusLabels = computed(() => (selectedNpc.value ? getNpcRelationshipFocusLabels(selectedNpc.value) : []))
  const selectedGiftReturnSummaries = computed(() => (selectedNpc.value ? npcStore.getRelationshipGiftReturnSummaries(selectedNpc.value) : []))
  const selectedNextRelationshipBenefits = computed(() => (selectedNpc.value ? npcStore.getNextRelationshipBenefits(selectedNpc.value) : []))
  const selectedRelationshipClues = computed(() => (selectedNpc.value ? npcStore.getRelationshipCluesForNpc(selectedNpc.value) : []))
  const selectedGiftKnowledgeSummary = computed(() =>
    selectedNpc.value ? npcStore.getGiftKnowledgeSummary(selectedNpc.value) : { hintCount: 0, exactCount: 0, confirmedCount: 0 }
  )
  const commerceEcho = computed(() => shopStore.commerceEchoSummary)
  const selectedNpcCommerceFeedbackLines = computed(() => {
    if (!selectedNpcDef.value) return []
    const npcName = selectedNpcDef.value.name
    const lines = [
      `${npcName}听到的商圈话题：${commerceEcho.value.headline}。`,
      commerceEcho.value.longTermCategory
        ? `${npcName}会提起你长期出货的${commerceEcho.value.longTermCategory.categoryLabel}，觉得这已经像村里的一条固定供货线。`
        : `${npcName}还没听出你固定常卖哪类货，等长期出货样本更多后会出现更具体的闲谈。`,
      ...commerceEcho.value.npcFeedbackCards.map((card: { label: string; lines: string[] }) =>
        card.lines[0] ? `${card.label}：${card.lines[0]}` : ''
      )
    ]
    return lines.filter((line): line is string => !!line).slice(0, 5)
  })
  const selectedGiftKnowledgeStageText = computed(() => {
    const summary = selectedGiftKnowledgeSummary.value
    if (summary.confirmedCount > 0) return `已经亲手验证 ${summary.confirmedCount} 条礼物偏好。`
    if (summary.exactCount > 0) return `已经掌握 ${summary.exactCount} 条明确礼物偏好。`
    if (summary.hintCount > 0) return `已经攒下 ${summary.hintCount} 条模糊线索，还需要继续观察。`
    return '暂时还没有摸清礼物偏好，可以通过对话、纸条、节日和送礼继续记录。'
  })
  const todayEvent = computed(() => getTodayEvent(gameStore.season, gameStore.day, buildSeasonEventResolutionContext()) ?? null)
  const randomNpcFestivalReunionEventName = computed(() => todayEvent.value?.name ?? '无节会')

  const canInteractWithNpc = (npcId: string): boolean => {
    const state = npcStore.getNpcState(npcId)
    if (state?.married) return true
    return npcStore.getScheduleStatus(npcId).available
  }

  const getNpcUnavailableReason = (npcId: string): string => {
    if (npcStore.getNpcState(npcId)?.married) return ''
    const scheduleStatus = npcStore.getScheduleStatus(npcId)
    if (scheduleStatus.available) return ''
    return scheduleStatus.reason || `现在不在${scheduleStatus.location}。`
  }

  const canInteractWithSelectedNpc = computed(() => (selectedNpc.value ? canInteractWithNpc(selectedNpc.value) : false))
  const unavailableInteractionReason = computed(() => (selectedNpc.value ? getNpcUnavailableReason(selectedNpc.value) : ''))
  const npcAvailable = (npcId: string): boolean => canInteractWithNpc(npcId)
  const canQuickTalkWithNpc = (npcId: string): boolean => canInteractWithNpc(npcId) && !npcStore.getNpcState(npcId)?.talkedToday
  const canGiftWithNpc = (npcId: string): boolean => {
    const state = npcStore.getNpcState(npcId)
    return canInteractWithNpc(npcId) && !state?.giftedToday && (state?.giftsThisWeek ?? 0) < 2
  }
  const canQuickGiftWithNpc = (npcId: string): boolean => canGiftWithNpc(npcId)
  const npcDetailSectionClass = (tab: NpcDetailTabId): string => (selectedNpcDetailTab.value === tab ? 'block' : 'hidden md:block')

  const openNpcPanel = (npcId: string, tab: NpcDetailTabId = 'interact') => {
    selectedNpc.value = npcId
    selectedNpcDetailTab.value = tab
    dialogueText.value = null
    showSelectedNpcPortraitPicker.value = false
    showDivorceConfirm.value = false
    showZhijiDissolveConfirm.value = false
    activeGiftKey.value = null
  }

  const handleSelectNpc = (npcId: string) => {
    openNpcPanel(npcId, 'interact')
  }

  const handleQuickGiftNpc = (npcId: string) => {
    if (!canQuickGiftWithNpc(npcId)) return
    openNpcPanel(npcId, 'gift')
  }

  const closeSelectedNpc = () => {
    showSelectedNpcPortraitPicker.value = false
    selectedNpcDetailTab.value = 'interact'
    selectedNpc.value = null
  }

  const syncMayorTicketConversionTarget = () => {
    if (mayorTicketConversionTargetType.value !== mayorTicketConversionSourceType.value) return
    const nextTarget = MAYOR_TICKET_CONVERTIBLE_TYPES.find(ticketType => ticketType !== mayorTicketConversionSourceType.value)
    if (nextTarget) {
      mayorTicketConversionTargetType.value = nextTarget
    }
  }

  const handleMayorTicketConversionSourceChange = () => {
    syncMayorTicketConversionTarget()
  }

  const handleMayorTicketConversion = () => {
    const result = walletStore.redeemRewardTicketConversion(
      mayorTicketConversionSourceType.value,
      mayorTicketConversionTargetType.value
    )
    showFloat(result.message, result.success ? 'success' : 'danger')
    addLog(`【村务票据】${result.message}`)
  }

  const notifyMayorTicketConversionFriendshipProgress = (previousFriendship: number) => {
    const status = mayorTicketConversionStatus.value
    if (previousFriendship >= status.requiredFriendship || !status.friendshipReady) return
    const message = status.unlocked
      ? '柳村长已开放村务票据转换。'
      : '村长愿意为你担保票据转换，还差村庄建设条件。'
    showFloat(message, status.unlocked ? 'success' : 'accent')
    addLog(`【村务票据】${message}`)
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
    const filtered = inventoryStore.visibleItems.filter(i => {
      if (i.locked) return false
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

  type KnownGiftPreference = GiftPreference | 'unknown'

  const getGiftPreference = (itemId: string): KnownGiftPreference => {
    if (!selectedNpc.value) return 'unknown'
    return npcStore.getKnownGiftPreference(selectedNpc.value, itemId)
  }

  const GIFT_PREF_LABELS: Record<KnownGiftPreference, string> = {
    loved: '最爱',
    liked: '喜欢',
    hated: '讨厌',
    neutral: '',
    unknown: ''
  }
  const GIFT_PREF_CLASS: Record<KnownGiftPreference, string> = {
    loved: 'text-danger',
    liked: 'text-success',
    hated: 'text-muted',
    neutral: '',
    unknown: ''
  }
  const GIFT_PREF_ORDER: Record<KnownGiftPreference, number> = {
    loved: 0,
    liked: 1,
    unknown: 2,
    neutral: 3,
    hated: 4
  }
  const GIFT_REACTION_TEXT: Record<KnownGiftPreference, string> = {
    loved: '非常喜欢',
    liked: '还不错',
    hated: '讨厌',
    neutral: '一般',
    unknown: '还没摸清'
  }

  const CLUE_KIND_LABELS: Record<RelationshipClueEntry['kind'], string> = {
    gift: '礼物',
    birthday: '生日',
    habit: '习惯',
    festival: '节庆'
  }

  const CLUE_SOURCE_LABELS: Record<RelationshipClueEntry['source'], string> = {
    talk: '日常交谈',
    festival: '节庆观察',
    home: '家中见闻',
    secret_note: '纸条线索',
    shop: '商铺消息',
    rumor: '村中传闻',
    gift_test: '亲手送礼',
    birthday: '生日回响'
  }

  const CLUE_PRECISION_LABELS: Record<RelationshipClueEntry['precision'], string> = {
    hint: '模糊线索',
    exact: '明确偏好',
    confirmed: '已验证'
  }

  const CLUE_PRECISION_CLASS: Record<RelationshipClueEntry['precision'], string> = {
    hint: 'border-warning/20 text-warning',
    exact: 'border-accent/20 text-accent',
    confirmed: 'border-success/20 text-success'
  }

  const activeGiftReaction = computed(() => {
    if (!activeGiftItem.value || !selectedNpcDef.value) return null
    const pref = getGiftPreference(activeGiftItem.value.itemId)
    return {
      label: pref === 'unknown' ? '当前记录' : `${selectedNpcDef.value.name}觉得`,
      text: GIFT_REACTION_TEXT[pref],
      className: GIFT_PREF_CLASS[pref] || 'text-muted'
    }
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

  const performTalkWithNpc = (npcId: string) => {
    const npcName = getNpcById(npcId)?.name ?? '对方'
    const state = npcStore.getNpcState(npcId)
    if (!canInteractWithNpc(npcId)) {
      addLog(getNpcUnavailableReason(npcId) || '现在没找到对方。')
      return
    }
    if (state?.talkedToday) {
      addLog(`今天已经和${npcName}聊过了。`)
      return
    }
    if (gameStore.isPastBedtime) {
      addLog('太晚了，人家都睡了。')
      handleEndDay()
      return
    }
    const mayorFriendshipBefore = npcId === MAYOR_TICKET_CONVERSION_NPC_ID ? state?.friendship ?? 0 : null
    const result = npcStore.talkTo(npcId)
    if (result) {
      dialogueText.value = result.message
      addLog(`与${npcName}聊天。(+${result.friendshipGain}好感)`)
      result.unlockedMessages?.forEach(message => addLog(message))
      if (mayorFriendshipBefore !== null) {
        notifyMayorTicketConversionFriendshipProgress(mayorFriendshipBefore)
      }

      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.talk)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) {
        handleEndDay()
        return
      }

      // 检查心事件触发
      const heartEvent = npcStore.checkHeartEvent(npcId)
      if (heartEvent) {
        triggerHeartEvent(heartEvent)
      }
    }
  }

  const handleQuickTalkNpc = (npcId: string) => {
    openNpcPanel(npcId, 'interact')
    performTalkWithNpc(npcId)
  }

  const handleTalk = () => {
    if (!selectedNpc.value) return
    performTalkWithNpc(selectedNpc.value)
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
    const npcId = selectedNpc.value
    if (!canInteractWithSelectedNpc.value) {
      addLog(unavailableInteractionReason.value || '现在没法把礼物送到对方手里。')
      return
    }
    const cookingGiftBonus = cookingStore.activeBuff?.type === 'giftBonus' ? cookingStore.activeBuff.value : 1
    const alchemyGiftBonus = cookingStore.getActiveAlchemyGiftBonusMultiplier()
    const ringGiftBonus = inventoryStore.getRingEffectValue('gift_friendship')
    const blessingGiftBonus = skillStore.getBlessingEffectValue('gift_friendship')
    const giftMultiplier = cookingGiftBonus * alchemyGiftBonus * (1 + ringGiftBonus + blessingGiftBonus)
    const mayorFriendshipBefore = npcId === MAYOR_TICKET_CONVERSION_NPC_ID ? npcStore.getNpcState(npcId)?.friendship ?? 0 : null
    const result = npcStore.giveGift(npcId, itemId, giftMultiplier, quality)
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
      if (result.birthdayMessage) {
        dialogueText.value = result.birthdayMessage
        addLog(result.birthdayMessage)
      }
      result.unlockedMessages?.forEach(message => addLog(message))
      if (mayorFriendshipBefore !== null) {
        notifyMayorTicketConversionFriendshipProgress(mayorFriendshipBefore)
      }

      // 关闭送礼弹窗
      activeGiftKey.value = null

      // 送礼后也检查心事件
      const heartEvent = npcStore.checkHeartEvent(npcId)
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
