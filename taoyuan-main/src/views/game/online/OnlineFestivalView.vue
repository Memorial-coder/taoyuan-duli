<template>
  <div class="space-y-3" data-testid="online-festival-page">
    <section class="game-panel space-y-3">
      <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <div class="flex items-center gap-2 text-accent">
            <CalendarDays :size="16" />
            <h2 class="game-section-title">在线节会</h2>
          </div>
          <p class="mt-1 text-xs leading-5 text-muted">{{ moduleSummary }}</p>
          <p class="mt-1 text-[10px] leading-4 text-muted">{{ refreshStateLabel }}</p>
        </div>
        <div class="flex shrink-0 flex-wrap gap-2">
          <button
            class="online-action-btn online-action-btn--compact"
            type="button"
            :disabled="refreshing"
            @click="refreshFestivalModule"
          >
            <RefreshCw :size="12" :class="{ 'animate-spin': refreshing }" />
            {{ refreshing ? '刷新中' : '刷新节会' }}
          </button>
          <RouterLink class="online-action-btn online-action-btn--compact" :to="{ name: 'online' }">
            <ArrowLeft :size="12" />
            在线中心
          </RouterLink>
        </div>
      </div>

      <div v-if="errorMessages.length > 0" class="grid gap-2">
        <div v-for="message in errorMessages" :key="message" class="border border-red-300/20 bg-red-500/10 px-3 py-2 text-xs text-red-100">
          {{ message }}
        </div>
      </div>

      <div class="grid gap-2 text-xs md:grid-cols-4">
        <div v-for="stat in summaryStats" :key="stat.label" class="game-panel-muted px-2 py-2">
          <p class="truncate text-[10px] text-muted">{{ stat.label }}</p>
          <p class="mt-1 truncate text-xs text-accent">{{ stat.value }}</p>
        </div>
      </div>

      <div class="flex gap-2 overflow-x-auto pb-1">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="shrink-0 border px-3 py-2 text-xs transition-colors"
          :class="activeTab === tab.key ? 'border-accent/50 bg-accent/10 text-accent' : 'border-accent/15 text-muted hover:border-accent/30 hover:text-accent'"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>
    </section>

    <section class="space-y-3">
      <div class="game-panel-muted flex flex-col gap-2 p-3 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <p class="text-sm text-accent">{{ activeTabMeta.label }}</p>
          <p class="mt-1 text-xs leading-5 text-muted">{{ activeTabMeta.summary }}</p>
        </div>
        <RouterLink
          v-if="activeTab !== 'world' && activeTab !== 'memorials'"
          class="online-action-btn online-action-btn--compact shrink-0"
          :to="legacyRouteForActiveTab"
        >
          <ExternalLink :size="12" />
          {{ legacyRouteLabel }}
        </RouterLink>
      </div>

      <div v-if="activeTab === 'world'" class="space-y-3">
        <div class="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)]">
          <div class="game-panel-muted p-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm text-accent">当前季节大事件</p>
              <span class="text-[10px] text-muted">{{ worldEventStore.currentEvent?.state_label || '未开放' }}</span>
            </div>
            <div v-if="worldEventStore.currentEvent" class="mt-3 space-y-3">
              <div class="border border-accent/10 bg-black/10 p-2">
                <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div class="min-w-0">
                    <p class="truncate text-xs text-accent">{{ worldEventStore.currentEvent.label }}</p>
                    <p class="mt-1 text-[10px] text-muted">{{ worldEventStore.currentEvent.scope_label }} · {{ worldEventStore.currentEvent.season_label }}</p>
                  </div>
                  <span class="w-fit shrink-0 text-[10px] text-muted">{{ worldEventStore.currentEvent.progress_text }}</span>
                </div>
                <p class="mt-2 text-[10px] leading-4 text-muted">{{ worldEventStore.currentEvent.summary }}</p>
                <div class="mt-2 h-2 overflow-hidden border border-accent/10 bg-bg">
                  <div class="h-full bg-accent/70 transition-all" :style="{ width: `${worldEventStore.currentEvent.progress_percent}%` }" />
                </div>
                <p class="mt-2 text-[10px] text-muted">
                  {{ worldEventStore.currentEvent.objective_label }} · {{ worldEventStore.currentEvent.progress_text }} · 基础回礼 {{ worldEventStore.currentEvent.reward_money_hint }} 铜钱起
                </p>
                <p v-if="worldEventStore.currentEvent.locked_reason" class="mt-1 text-[10px] leading-4 text-warning">
                  {{ worldEventStore.currentEvent.locked_reason }}
                </p>
                <p v-else-if="worldEventStore.currentEvent.completion_text" class="mt-1 text-[10px] leading-4 text-success">
                  {{ worldEventStore.currentEvent.completion_text }}
                </p>
              </div>

              <div v-if="worldEventStore.currentEvent.contribution_actions.length > 0" class="space-y-2">
                <p class="text-[10px] text-muted">可提交贡献</p>
                <div class="grid gap-2 md:grid-cols-2">
                  <div
                    v-for="action in worldEventStore.currentEvent.contribution_actions"
                    :key="`${worldEventStore.currentEvent.id}-${action.id}`"
                    class="border border-accent/10 bg-black/10 p-2"
                  >
                    <div class="flex flex-col gap-2 sm:flex-row sm:items-start">
                      <Button
                        class="online-action-btn online-action-btn--compact shrink-0"
                        :disabled="worldEventStore.actionRunning || !action.can_use"
                        @click="contributeWorldEventAction(worldEventStore.currentEvent.id, action.id)"
                      >
                        {{ action.label }}
                      </Button>
                      <p class="text-[10px] leading-4 text-muted">{{ action.summary }}</p>
                    </div>
                    <p class="mt-2 text-[10px] text-muted">工钱 {{ action.cost_money }} 铜钱 · 推进 {{ action.progress_delta }} 点</p>
                    <p v-if="!action.can_use && action.disabled_reason" class="mt-1 text-[10px] text-muted">{{ action.disabled_reason }}</p>
                  </div>
                </div>
              </div>

              <div class="grid gap-3 md:grid-cols-2">
                <div class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-xs text-accent">当前贡献榜</p>
                  <div v-if="worldEventStore.currentEvent.contributors.length === 0" class="mt-2 text-[10px] text-muted">当前还没有人提交季节贡献。</div>
                  <div v-else class="mt-2 max-h-36 space-y-1.5 overflow-y-auto pr-1">
                    <p v-for="contributor in worldEventStore.currentEvent.contributors" :key="`${worldEventStore.currentEvent.id}-${contributor.username}`" class="text-[10px] leading-4 text-muted">
                      {{ contributor.rank }}. {{ contributor.display_name }} · {{ contributor.progress_value }} 点 · {{ contributor.action_count }} 次
                    </p>
                  </div>
                </div>

                <div class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-xs text-accent">我的季节记录</p>
                  <div v-if="!worldEventStore.currentEvent.my_contribution" class="mt-2 text-[10px] text-muted">你本季还没有提交贡献。</div>
                  <div v-else class="mt-2 space-y-1.5">
                    <p class="text-[10px] text-muted">当前排名：第 {{ worldEventStore.currentEvent.my_contribution.rank }} 名</p>
                    <p class="text-[10px] text-muted">累计贡献：{{ worldEventStore.currentEvent.my_contribution.progress_value }} 点</p>
                    <p class="text-[10px] text-muted">提交次数：{{ worldEventStore.currentEvent.my_contribution.action_count }} 次</p>
                    <p v-if="worldEventStore.currentEvent.my_contribution.last_action_label" class="text-[10px] text-muted">
                      最近动作：{{ worldEventStore.currentEvent.my_contribution.last_action_label }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <p v-else class="mt-3 text-xs leading-5 text-muted">当前季节大事件还没有载入成功，可以刷新页面后再试。</p>
          </div>

          <div class="space-y-3">
            <div v-if="worldEventStore.publicGoal" class="game-panel-muted p-3">
              <p class="text-sm text-accent">公共目标</p>
              <p class="mt-2 text-[10px] leading-5 text-muted">{{ worldEventStore.publicGoal.summary }}</p>
              <div class="mt-2 flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-xs text-text">{{ worldEventStore.publicGoal.label }}</p>
                  <p class="mt-1 text-[10px] text-muted">{{ worldEventStore.publicGoal.progress_text }}</p>
                </div>
                <span class="w-fit shrink-0 text-[10px] text-accent">{{ worldEventStore.publicGoal.phase_reward_label }}</span>
              </div>
              <div class="mt-2 h-1.5 overflow-hidden border border-accent/10 bg-bg">
                <div class="h-full bg-accent/70 transition-all" :style="{ width: `${worldEventStore.publicGoal.progress_percent}%` }" />
              </div>
              <div v-if="worldEventStore.publicGoal.milestones.length > 0" class="mt-3 max-h-44 space-y-2 overflow-y-auto pr-1">
                <div v-for="milestone in worldEventStore.publicGoal.milestones" :key="milestone.id" class="border border-accent/10 bg-black/10 p-2">
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-[10px] text-text">{{ milestone.label }}</p>
                    <span class="text-[10px]" :class="milestone.reached ? 'text-success' : 'text-muted'">{{ milestone.progress_text }}</span>
                  </div>
                  <p class="mt-1 text-[10px] leading-4 text-muted">{{ milestone.summary }}</p>
                  <p class="mt-1 text-[10px] text-muted">阶段奖励：{{ milestone.reward_label }}</p>
                </div>
              </div>
            </div>

            <div class="game-panel-muted p-3">
              <p class="text-sm text-accent">我的世界贡献</p>
              <p class="mt-2 text-[10px] text-muted">累计贡献：{{ worldEventStore.overview?.total_contribution_points || 0 }} 点</p>
              <div v-if="worldEventStore.myRecords.length === 0" class="mt-2 text-xs leading-5 text-muted">当前账号还没有完成过四季大事件结算。</div>
              <div v-else class="mt-3 max-h-44 space-y-2 overflow-y-auto pr-1">
                <div v-for="record in worldEventStore.myRecords.slice(0, 4)" :key="record.record_id" class="border border-accent/10 bg-black/10 p-2">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="truncate text-xs text-text">{{ record.event_label }}</p>
                      <p class="mt-1 text-[10px] text-muted">{{ record.season_label }} · 第 {{ record.rank }} 名</p>
                    </div>
                    <span class="w-fit shrink-0 text-[10px] text-success">+{{ record.reward_money }} 铜钱</span>
                  </div>
                  <p class="mt-2 text-[10px] leading-4 text-muted">{{ record.reward_summary }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div class="game-panel-muted p-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm text-accent">世界事件列表</p>
              <span class="text-[10px] text-muted">{{ worldEventStore.worldEvents.length }} 条</span>
            </div>
            <p v-if="worldEventStore.worldEvents.length > 0" class="mt-2 text-[10px] text-muted">
              当前可推进 {{ worldEventStore.currentWorldEvents.length }} 条作用域事件。
            </p>
            <div v-if="worldEventStore.worldEvents.length === 0" class="mt-3 text-xs leading-5 text-muted">当前还没有载入其它世界事件。</div>
            <div v-else class="mt-3 max-h-[34rem] space-y-2 overflow-y-auto pr-1">
              <div v-for="event in worldEventStore.worldEvents" :key="event.id" class="border border-accent/10 bg-black/10 p-2">
                <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div class="min-w-0">
                    <p class="truncate text-xs text-text">{{ event.label }}</p>
                    <p class="mt-1 text-[10px] text-muted">{{ event.scope_label }} · {{ event.state_label }}</p>
                  </div>
                  <span class="w-fit shrink-0 text-[10px] text-accent">{{ event.progress_text }}</span>
                </div>
                <p class="mt-2 text-[10px] leading-4 text-muted">{{ event.summary }}</p>
                <p class="mt-1 text-[10px] text-muted">范围：{{ event.scope_value || event.scope_label }}</p>
                <div class="mt-2 h-1.5 overflow-hidden border border-accent/10 bg-bg">
                  <div class="h-full bg-accent/70 transition-all" :style="{ width: `${event.progress_percent}%` }" />
                </div>
                <div v-if="event.contribution_actions.length > 0" class="mt-2 flex flex-wrap gap-1.5">
                  <Button
                    v-for="action in event.contribution_actions"
                    :key="`${event.id}-${action.id}`"
                    class="online-action-btn online-action-btn--compact"
                    :disabled="worldEventStore.actionRunning || !action.can_use"
                    @click="contributeWorldEventAction(event.id, action.id)"
                  >
                    {{ action.label }}
                  </Button>
                </div>
                <p v-if="event.locked_reason" class="mt-2 text-[10px] leading-4 text-muted">{{ event.locked_reason }}</p>
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <div class="game-panel-muted p-3">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm text-accent">最近史册</p>
                <span class="text-[10px] text-muted">{{ worldEventStore.recentAnnals.length }} 条</span>
              </div>
              <div v-if="worldEventStore.recentAnnals.length === 0" class="mt-3 text-xs leading-5 text-muted">当前还没有完成并归档的四季大事件。</div>
              <div v-else class="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                <div v-for="annal in worldEventStore.recentAnnals" :key="annal.id" class="border border-accent/10 bg-black/10 p-2">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="truncate text-xs text-text">{{ annal.event_label }}</p>
                      <p class="mt-1 text-[10px] text-muted">{{ annal.season_label }} · {{ annal.cycle_key }}</p>
                    </div>
                    <span class="w-fit shrink-0 text-[10px] text-accent">{{ annal.contributor_count }} 人</span>
                  </div>
                  <p class="mt-2 text-[10px] leading-4 text-muted">{{ annal.summary }}</p>
                  <p v-if="annal.top_contributor_display_name" class="mt-1 text-[10px] leading-4 text-muted">
                    领头贡献：{{ annal.top_contributor_display_name }}
                  </p>
                </div>
              </div>
            </div>

            <div class="game-panel-muted p-3">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm text-accent">世界纪年</p>
                <span class="text-[10px] text-muted">{{ worldEventStore.recentChronicles.length }} 条</span>
              </div>
              <div v-if="worldEventStore.recentChronicles.length === 0" class="mt-3 text-xs leading-5 text-muted">当前还没有生成世界纪年摘要。</div>
              <div v-else class="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                <div v-for="chronicle in worldEventStore.recentChronicles" :key="chronicle.cycle_key" class="border border-accent/10 bg-black/10 p-2">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="truncate text-xs text-text">{{ chronicle.year }} 年 · {{ chronicle.cycle_key }}</p>
                      <p class="mt-1 text-[10px] text-muted">
                        公共进度 {{ chronicle.public_goal_progress }} / {{ chronicle.public_goal_target }} · 已完成事件 {{ chronicle.total_completed_events }}
                      </p>
                    </div>
                    <span class="w-fit shrink-0 text-[10px] text-accent">{{ chronicle.total_contribution_points }} 点</span>
                  </div>
                  <p v-if="chronicle.annual_society_champion" class="mt-2 text-[10px] leading-4 text-muted">
                    年度冠军村社：{{ chronicle.annual_society_champion.society_name }} · 贡献 {{ chronicle.annual_society_champion.contribution_score }}
                  </p>
                  <p v-if="chronicle.annal_summaries.length > 0" class="mt-1 text-[10px] leading-4 text-muted">
                    世界史册：{{ chronicle.annal_summaries[0] }}
                  </p>
                  <p v-if="hasDivisionFirstCompletions(chronicle)" class="mt-1 text-[10px] leading-4 text-muted">
                    分区首个完成者：{{ formatChronicleDivisionFirsts(chronicle) }}
                  </p>
                  <p v-if="chronicle.famous_manors.length > 0" class="mt-1 text-[10px] leading-4 text-muted">
                    著名庄园：{{ formatChronicleFamousManors(chronicle) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'festival-room'" class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-accent">节会房间状态</p>
            <span class="text-[10px] text-muted">{{ festivalRoomStore.myRoom?.state_label || '空闲中' }}</span>
          </div>
          <div v-if="festivalRoomStore.myRoom" class="mt-3 border border-accent/10 bg-black/10 p-2">
            <p class="truncate text-xs text-accent">{{ festivalRoomStore.myRoom.title }}</p>
            <p class="mt-1 text-[10px] leading-4 text-muted">
              {{ festivalRoomStore.myRoom.template_label }} · {{ festivalRoomStore.myRoom.joined_member_count }}/{{ festivalRoomStore.myRoom.member_limit }} 人
            </p>
            <p class="mt-1 text-[10px] text-muted">{{ festivalRoomStore.myRoom.gameplay.template_label }} · {{ festivalRoomStore.myRoom.gameplay.progress_text }}</p>
          </div>
          <p v-else class="mt-3 text-xs leading-5 text-muted">当前没有自己的节会房间。创建、邀请、ready 和结算操作先保留在旧节会页，后续 F2 再完整迁入。</p>
        </div>

        <div class="game-panel-muted p-3">
          <p class="text-sm text-accent">房间摘要</p>
          <div class="mt-3 grid gap-2 text-xs">
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[10px] text-muted">邀请</p>
              <p class="mt-1 text-accent">{{ festivalRoomStore.invitedRooms.length }} 条</p>
            </div>
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[10px] text-muted">可见房间</p>
              <p class="mt-1 text-accent">{{ festivalRoomStore.visibleRooms.length }} 间</p>
            </div>
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[10px] text-muted">结算凭证</p>
              <p class="mt-1 text-accent">{{ festivalRoomStore.recentReceipts.length }} 条</p>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'expedition-room'" class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-accent">远征房间状态</p>
            <span class="text-[10px] text-muted">{{ expeditionRoomStore.myRoom?.state_label || '空闲中' }}</span>
          </div>
          <div v-if="expeditionRoomStore.myRoom" class="mt-3 border border-accent/10 bg-black/10 p-2">
            <p class="truncate text-xs text-accent">{{ expeditionRoomStore.myRoom.title }}</p>
            <p class="mt-1 text-[10px] leading-4 text-muted">
              {{ expeditionRoomStore.myRoom.template_label }} · {{ expeditionRoomStore.myRoom.joined_member_count }}/{{ expeditionRoomStore.myRoom.member_limit }} 人
            </p>
            <p class="mt-1 text-[10px] text-muted">{{ expeditionRoomStore.myRoom.gameplay.template_label }} · {{ expeditionRoomStore.myRoom.gameplay.progress_text }}</p>
          </div>
          <p v-else class="mt-3 text-xs leading-5 text-muted">当前没有自己的远征房间。远征创建、邀请、倒计时、断线恢复、回合动作和结算先由旧远征页承接。</p>
        </div>

        <div class="game-panel-muted p-3">
          <p class="text-sm text-accent">远征摘要</p>
          <div class="mt-3 grid gap-2 text-xs">
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[10px] text-muted">邀请</p>
              <p class="mt-1 text-accent">{{ expeditionRoomStore.invitedRooms.length }} 条</p>
            </div>
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[10px] text-muted">可见房间</p>
              <p class="mt-1 text-accent">{{ expeditionRoomStore.visibleRooms.length }} 间</p>
            </div>
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[10px] text-muted">结算凭证</p>
              <p class="mt-1 text-accent">{{ expeditionRoomStore.recentReceipts.length }} 条</p>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="grid gap-3 lg:grid-cols-2">
        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-accent">节会纪念</p>
            <span class="text-[10px] text-muted">{{ festivalRoomStore.recentMemorials.length }} 条</span>
          </div>
          <div v-if="festivalRoomStore.recentMemorials.length === 0" class="mt-3 text-xs text-muted">当前没有节会纪念记录。</div>
          <div v-else class="mt-3 max-h-[24rem] space-y-2 overflow-y-auto pr-1">
            <div v-for="memorial in festivalRoomStore.recentMemorials.slice(0, 6)" :key="memorial.memorial_id" class="border border-accent/10 bg-black/10 p-2">
              <p class="truncate text-xs text-accent">{{ memorial.label }}</p>
              <p class="mt-1 text-[10px] leading-4 text-muted">{{ memorial.template_label }} · {{ memorial.gameplay_template_label }}</p>
              <p class="mt-1 text-[10px] text-muted">{{ memorial.reward_summary }}</p>
            </div>
          </div>
        </div>

        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-accent">最近结算凭证</p>
            <span class="text-[10px] text-muted">{{ recentReceiptCards.length }} 条</span>
          </div>
          <div v-if="recentReceiptCards.length === 0" class="mt-3 text-xs text-muted">当前没有节会或远征结算凭证。</div>
          <div v-else class="mt-3 max-h-[24rem] space-y-2 overflow-y-auto pr-1">
            <div v-for="receipt in recentReceiptCards" :key="receipt.id" class="border border-accent/10 bg-black/10 p-2">
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div class="min-w-0">
                  <p class="truncate text-xs text-accent">{{ receipt.roomTitle }}</p>
                  <p class="mt-1 text-[10px] text-muted">{{ receipt.domainLabel }} · {{ receipt.templateLabel }}</p>
                </div>
                <span class="w-fit shrink-0 text-[10px] text-muted">{{ receipt.statusLabel }}</span>
              </div>
              <p class="mt-2 text-[10px] leading-4 text-muted">{{ receipt.summary }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import { ArrowLeft, CalendarDays, ExternalLink, RefreshCw } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import { useExpeditionRoomStore } from '@/stores/useExpeditionRoomStore'
  import { useFestivalRoomStore } from '@/stores/useFestivalRoomStore'
  import { useWorldEventStore } from '@/stores/useWorldEventStore'
  import type { WorldEventOverview } from '@/utils/worldEventApi'

  type FestivalTabKey = 'world' | 'festival-room' | 'expedition-room' | 'memorials'
  type FestivalTabMeta = { key: FestivalTabKey; label: string; summary: string }
  type ReceiptCard = {
    id: string
    roomTitle: string
    templateLabel: string
    domainLabel: string
    statusLabel: string
    summary: string
  }

  const route = useRoute()
  const worldEventStore = useWorldEventStore()
  const festivalRoomStore = useFestivalRoomStore()
  const expeditionRoomStore = useExpeditionRoomStore()
  type ChronicleSnapshot = WorldEventOverview['recent_chronicles'][number]

  const hasDivisionFirstCompletions = (chronicle: ChronicleSnapshot) =>
    Object.keys(chronicle.first_completed_divisions || {}).length > 0
  const formatChronicleDivisionFirsts = (chronicle: ChronicleSnapshot) =>
    Object.entries(chronicle.first_completed_divisions || {})
      .slice(0, 2)
      .map(([divisionLabel, entry]) => `${divisionLabel} - ${entry.top_contributor_display_name || '待记录'}`)
      .join(' / ')
  const formatChronicleFamousManors = (chronicle: ChronicleSnapshot) =>
    chronicle.famous_manors.map(manor => `${manor.display_name}（${manor.favorite_count} 收藏）`).join('、')

  const tabs: FestivalTabMeta[] = [
    { key: 'world', label: '世界事件', summary: '查看当前季节大事件、公共目标和世界纪年入口。' },
    { key: 'festival-room', label: '节会房间', summary: '查看我的节会房间、邀请、可见房间和结算摘要。' },
    { key: 'expedition-room', label: '远征房间', summary: '从节会模块进入远征房间，保留组队、ready、断线恢复和结算旧入口。' },
    { key: 'memorials', label: '纪念记录', summary: '集中查看节会纪念、结算凭证和后续纪年记录入口。' },
  ]

  const normalizeTab = (value: unknown): FestivalTabKey => {
    const raw = Array.isArray(value) ? value[0] : value
    if (raw === 'festival' || raw === 'festival-room') return 'festival-room'
    if (raw === 'expedition' || raw === 'expedition-room') return 'expedition-room'
    if (raw === 'memorials') return 'memorials'
    return 'world'
  }

  const activeTab = ref<FestivalTabKey>(normalizeTab(route.query.tab))
  const lastRefreshAttemptAt = ref(0)
  const refreshing = computed(() => worldEventStore.loading || festivalRoomStore.loading || expeditionRoomStore.loading)
  const activeTabMeta = computed(() => tabs.find(tab => tab.key === activeTab.value) ?? tabs[0]!)
  const moduleSummary = computed(() => {
    const season = worldEventStore.overview?.current_season_label || '世界事件未载入'
    const festivalStatus = festivalRoomStore.myRoom?.state_label || `${festivalRoomStore.visibleRooms.length} 间可见节会房`
    const expeditionStatus = expeditionRoomStore.myRoom?.state_label || `${expeditionRoomStore.visibleRooms.length} 间可见远征房`
    return `${season}；节会房间 ${festivalStatus}；远征房间 ${expeditionStatus}。`
  })
  const refreshStateLabel = computed(() => {
    if (refreshing.value) return '正在刷新节会模块摘要'
    if (!lastRefreshAttemptAt.value) return '尚未刷新'
    const time = new Date(lastRefreshAttemptAt.value).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
    return `上次刷新 ${time}`
  })
  const errorMessages = computed(() =>
    [worldEventStore.errorMessage, festivalRoomStore.errorMessage, expeditionRoomStore.errorMessage].filter(Boolean)
  )
  const summaryStats = computed(() => [
    { label: '当前事件', value: worldEventStore.currentEvent?.label || '未载入' },
    { label: '节会房间', value: festivalRoomStore.myRoom?.state_label || `${festivalRoomStore.visibleRooms.length} 可见` },
    { label: '远征房间', value: expeditionRoomStore.myRoom?.state_label || `${expeditionRoomStore.visibleRooms.length} 可见` },
    { label: '纪念与凭证', value: `${festivalRoomStore.recentMemorials.length + festivalRoomStore.recentReceipts.length + expeditionRoomStore.recentReceipts.length} 条` },
  ])
  const legacyRouteForActiveTab = computed(() =>
    activeTab.value === 'expedition-room' ? { name: 'expedition' } : { name: 'festival' }
  )
  const legacyRouteLabel = computed(() => activeTab.value === 'expedition-room' ? '打开远征旧页' : '打开节会旧页')
  const recentReceiptCards = computed<ReceiptCard[]>(() => [
    ...festivalRoomStore.recentReceipts.map(receipt => ({
      id: `festival-${receipt.id}`,
      roomTitle: receipt.room_title,
      templateLabel: receipt.template_label,
      domainLabel: '节会',
      statusLabel: receipt.status_label,
      summary: receipt.summary,
    })),
    ...expeditionRoomStore.recentReceipts.map(receipt => ({
      id: `expedition-${receipt.id}`,
      roomTitle: receipt.room_title,
      templateLabel: receipt.template_label,
      domainLabel: '远征',
      statusLabel: receipt.status_label,
      summary: receipt.summary,
    })),
  ].slice(0, 8))

  const refreshFestivalModule = async () => {
    await Promise.all([
      worldEventStore.refreshOverview().catch(() => {}),
      festivalRoomStore.refreshOverview().catch(() => {}),
      expeditionRoomStore.refreshOverview().catch(() => {}),
    ])
    lastRefreshAttemptAt.value = Date.now()
  }
  const contributeWorldEventAction = async (eventId: string, actionId: string) => {
    await worldEventStore.contribute(eventId, actionId).catch(() => {})
  }

  watch(
    () => route.query.tab,
    tab => {
      activeTab.value = normalizeTab(tab)
    }
  )

  onMounted(() => {
    void refreshFestivalModule()
  })
</script>
