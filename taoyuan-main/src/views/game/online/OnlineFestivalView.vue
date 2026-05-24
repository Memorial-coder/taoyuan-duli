<template>
  <div class="space-y-3" data-testid="online-festival-page">
    <OnlineModuleShell
      title="在线节会"
      :summary="moduleSummary"
      :meta="refreshStateLabel"
      refresh-label="刷新节会"
      :refresh-running="refreshing"
      :refresh-disabled="refreshing"
      :stats="summaryStats"
      :tabs="tabs"
      :active-tab="activeTab"
      @refresh="refreshFestivalModule"
      @update:active-tab="setActiveTab"
    >
      <template #icon>
        <CalendarDays :size="16" />
      </template>
      <template #errors>
        <div v-if="errorMessages.length > 0" class="grid gap-2">
          <div v-for="message in errorMessages" :key="message" class="border border-red-300/20 bg-red-500/10 px-3 py-2 text-xs text-red-100">
            {{ message }}
          </div>
        </div>
      </template>
    </OnlineModuleShell>

    <section class="space-y-3">
      <div class="game-panel-muted flex flex-col gap-2 p-3 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <p class="text-sm text-accent">{{ activeTabMeta.label }}</p>
          <p class="mt-1 text-xs leading-5 text-muted">{{ activeTabMeta.summary }}</p>
        </div>
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
                        :data-testid="`online-festival-world-contribute-${action.id}`"
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

      <div v-else-if="activeTab === 'festival-room'" class="space-y-3">
        <div class="game-panel-muted p-3">
          <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div class="min-w-0">
              <p class="text-sm text-accent">节会房间</p>
              <p class="mt-1 text-xs leading-5 text-muted">{{ festivalRoomStore.overview?.bulletin || '先从房间底座把创建、邀请、准备、倒计时和结算流程跑通。' }}</p>
            </div>
            <span class="shrink-0 text-[10px] text-muted">{{ festivalRoomStore.loading ? '正在刷新' : '已载入房间摘要' }}</span>
          </div>
        </div>

        <div class="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div class="space-y-3">
            <div class="game-panel-muted p-3" data-testid="online-festival-room-status-panel">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm text-accent">我的节会状态</p>
                <span class="text-[10px] text-muted">{{ festivalRoomStore.myRoom ? festivalRoomStore.myRoom.state_label : '空闲中' }}</span>
              </div>
              <div v-if="festivalRoomStore.myRoom" class="mt-3 space-y-3" data-testid="online-festival-room-my-room">
                <div class="border border-accent/10 bg-black/10 p-2">
                  <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div class="min-w-0">
                      <p class="truncate text-xs text-accent">{{ festivalRoomStore.myRoom.title }}</p>
                      <p class="mt-1 text-[10px] text-muted">
                        {{ festivalRoomStore.myRoom.template_label }} · {{ festivalRoomStore.myRoom.gameplay.template_label }} · {{ festivalRoomStore.myRoom.joined_member_count }}/{{ festivalRoomStore.myRoom.member_limit }} 人
                      </p>
                    </div>
                    <span class="w-fit shrink-0 text-[10px] text-muted">{{ festivalRoomStore.myRoom.state_label }}</span>
                  </div>
                  <p v-if="festivalRoomStore.myRoom.state_reason" class="mt-1 text-[10px] leading-4 text-warning">{{ festivalRoomStore.myRoom.state_reason }}</p>
                  <p v-if="festivalRoomStore.myRoom.opening_ceremony" class="mt-1 text-[10px] leading-4 text-success">
                    {{ festivalRoomStore.myRoom.opening_ceremony.subtitle }}
                  </p>
                </div>

                <div class="border border-accent/10 bg-black/10 p-2">
                  <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div class="min-w-0">
                      <p class="truncate text-xs text-accent">{{ festivalRoomStore.myRoom.gameplay.template_label }}</p>
                      <p class="mt-1 text-[10px] leading-4 text-muted">{{ festivalRoomStore.myRoom.gameplay.template_summary }}</p>
                    </div>
                    <span class="w-fit shrink-0 text-[10px] text-muted">{{ festivalRoomStore.myRoom.gameplay.phase_label }}</span>
                  </div>
                  <p class="mt-2 text-[10px] text-muted">
                    {{ festivalRoomStore.myRoom.gameplay.progress_text }} · {{ festivalRoomStore.myRoom.gameplay.score_label }} {{ festivalRoomStore.myRoom.gameplay.score_value }}
                  </p>
                  <div class="mt-2 h-1.5 overflow-hidden border border-accent/10 bg-bg">
                    <div class="h-full bg-accent/70 transition-all" :style="{ width: `${festivalRoomStore.myRoom.gameplay.progress_percent}%` }" />
                  </div>
                  <p v-if="festivalRoomStore.myRoom.gameplay.last_action_summary" class="mt-2 text-[10px] leading-4 text-success">
                    {{ festivalRoomStore.myRoom.gameplay.last_action_summary }}
                  </p>
                  <div v-if="festivalRoomStore.myRoom.gameplay.contributions.length > 0" class="mt-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto pr-1">
                    <span
                      v-for="contribution in festivalRoomStore.myRoom.gameplay.contributions"
                      :key="`${festivalRoomStore.myRoom.id}-${contribution.username}-gameplay`"
                      class="border border-accent/15 px-1.5 py-0.5 text-[10px] text-muted"
                    >
                      {{ contribution.display_name }} · {{ contribution.action_count }} 次 · {{ contribution.progress_value }} 贡献
                    </span>
                  </div>
                </div>

                <div v-if="festivalRoomStore.myFestivalState" class="space-y-3 border border-accent/10 bg-black/10 p-2">
                  <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div class="min-w-0">
                      <p class="truncate text-xs text-accent">{{ festivalRoomStore.myFestivalState.round_text }}</p>
                      <p class="mt-1 text-[10px] leading-4 text-muted">{{ festivalRoomStore.myFestivalState.current_event.summary }}</p>
                    </div>
                    <span class="w-fit shrink-0 text-[10px] text-muted">压力 {{ festivalRoomStore.myFestivalState.pressure_text }}</span>
                  </div>
                  <div class="grid gap-2 md:grid-cols-2">
                    <div class="border border-accent/10 bg-black/10 p-2">
                      <p class="text-[10px] text-muted">当前事件</p>
                      <p class="mt-1 text-xs text-text">{{ festivalRoomStore.myFestivalState.current_event.label }}</p>
                      <p class="mt-1 text-[10px] leading-4 text-muted">{{ festivalRoomStore.myFestivalState.current_event.pressure_hint }}</p>
                      <p class="mt-1 text-[10px] leading-4 text-muted">{{ festivalRoomStore.myFestivalState.current_event.resource_hint }}</p>
                    </div>
                    <div class="border border-accent/10 bg-black/10 p-2">
                      <p class="text-[10px] text-muted">我的职责</p>
                      <template v-if="festivalRoomStore.myFestivalState.my_role">
                        <p class="mt-1 text-xs text-text">{{ festivalRoomStore.myFestivalState.my_role.role_label }}</p>
                        <p class="mt-1 text-[10px] leading-4 text-muted">{{ festivalRoomStore.myFestivalState.my_role.role_summary }}</p>
                      </template>
                      <p v-else class="mt-1 text-[10px] text-muted">加入房间后会显示本局职责。</p>
                    </div>
                  </div>
                  <div class="flex max-h-20 flex-wrap gap-1.5 overflow-y-auto pr-1">
                    <span
                      v-for="resource in festivalRoomStore.myFestivalState.team_resources"
                      :key="`${festivalRoomStore.myRoom.id}-${resource.id}`"
                      class="border border-accent/15 px-1.5 py-0.5 text-[10px] text-muted"
                    >
                      {{ resource.text }}
                    </span>
                  </div>
                  <div v-if="festivalRoomStore.myFestivalState.role_assignments.length > 0" class="flex max-h-20 flex-wrap gap-1.5 overflow-y-auto pr-1">
                    <span
                      v-for="role in festivalRoomStore.myFestivalState.role_assignments"
                      :key="`${festivalRoomStore.myRoom.id}-${role.username}-festival-role`"
                      class="border border-accent/15 px-1.5 py-0.5 text-[10px] text-muted"
                    >
                      {{ role.display_name }} · {{ role.role_label }}
                    </span>
                  </div>
                  <p v-if="festivalRoomStore.myFestivalState.recent_feedback" class="text-[10px] leading-4 text-success">
                    {{ festivalRoomStore.myFestivalState.recent_feedback }}
                  </p>
                  <div v-if="festivalRoomStore.myFestivalState.round_log.length > 0" class="space-y-1">
                    <p class="text-[10px] text-muted">回合记录</p>
                    <div class="max-h-28 space-y-1 overflow-y-auto pr-1">
                      <p
                        v-for="entry in festivalRoomStore.myFestivalState.round_log.slice(0, 6)"
                        :key="entry.id"
                        class="text-[10px] leading-4 text-muted"
                      >
                        - {{ entry.summary }}
                      </p>
                    </div>
                  </div>
                </div>

                <VisualSceneBoard
                  v-if="showFestivalSceneBoard"
                  :objects="festivalSceneObjects"
                  :selected-object-id="selectedFestivalSceneObjectId"
                  :recent-feedback="festivalSceneFeedback"
                  :action-running="festivalRoomStore.actionRunning"
                  :action-labels="festivalSceneActionLabels"
                  @select-object="selectFestivalVisualObject"
                  @trigger-action="triggerFestivalVisualAction"
                />

                <VisualTrackBoard
                  v-if="showFestivalTrackBoard"
                  :tracks="festivalTracks"
                  :selected-track-id="selectedFestivalTrackId"
                  :selected-cell-id="selectedFestivalTrackCellId"
                  :recent-feedback="festivalTrackFeedback"
                  :action-running="festivalRoomStore.actionRunning"
                  :action-labels="festivalSceneActionLabels"
                  @select-cell="selectFestivalTrackCell"
                  @trigger-action="triggerFestivalTrackAction"
                />
                <div v-if="festivalVisualHighlights.length > 0" class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-xs text-accent">本局高光</p>
                  <div class="mt-2 max-h-24 space-y-1 overflow-y-auto pr-1">
                    <p v-for="highlight in festivalVisualHighlights" :key="highlight.id" class="text-[10px] leading-4 text-muted">
                      {{ highlight.label }} · {{ highlight.summary }}
                    </p>
                  </div>
                </div>

                <div v-if="festivalRoomStore.myRoom.gameplay.available_actions.length > 0" class="space-y-2">
                  <p class="text-[10px] text-muted">玩法动作</p>
                  <div class="grid gap-2 md:grid-cols-2">
                    <div
                      v-for="action in festivalRoomStore.myRoom.gameplay.available_actions"
                      :key="`${festivalRoomStore.myRoom.id}-${action.id}`"
                      class="border border-accent/10 bg-black/10 p-2"
                    >
                      <div class="flex flex-col gap-2 sm:flex-row sm:items-start">
                        <Button
                          class="online-action-btn online-action-btn--compact shrink-0"
                          :data-testid="`online-festival-room-gameplay-action-${action.id}`"
                          :disabled="festivalRoomStore.actionRunning || !action.can_use"
                          @click="playGameplayAction(festivalRoomStore.myRoom.id, action.id)"
                        >
                          {{ action.label }}
                        </Button>
                        <p class="text-[10px] leading-4 text-muted">{{ action.summary }}</p>
                      </div>
                      <div class="mt-2 flex flex-wrap gap-1.5">
                        <span v-if="action.required_role_label" class="border border-accent/15 px-1.5 py-0.5 text-[10px] text-muted">
                          {{ action.required_role_label }}
                        </span>
                        <span v-if="action.once_per_round" class="border border-accent/15 px-1.5 py-0.5 text-[10px] text-muted">
                          每回合一次
                        </span>
                        <span v-if="action.pressure_delta_text" class="border border-accent/15 px-1.5 py-0.5 text-[10px] text-muted">
                          {{ action.pressure_delta_text }}
                        </span>
                        <span v-if="action.resource_delta_text" class="border border-accent/15 px-1.5 py-0.5 text-[10px] text-muted">
                          {{ action.resource_delta_text }}
                        </span>
                      </div>
                      <p v-if="action.round_effect" class="mt-2 text-[10px] leading-4 text-muted">{{ action.round_effect }}</p>
                      <p v-if="!action.can_use && action.disabled_reason" class="mt-1 text-[10px] text-muted">{{ action.disabled_reason }}</p>
                    </div>
                  </div>
                </div>

                <div v-if="festivalRoomStore.myRoom.settlement_receipts.length > 0" class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-xs text-accent">本房结算凭证</p>
                  <div class="mt-2 max-h-36 space-y-1.5 overflow-y-auto pr-1">
                    <p
                      v-for="receipt in festivalRoomStore.myRoom.settlement_receipts"
                      :key="receipt.id"
                      class="text-[10px] leading-4 text-muted"
                    >
                      {{ receipt.target_display_name }} · {{ receipt.status_label }} · {{ receipt.summary }}
                    </p>
                  </div>
                </div>

                <label class="block">
                  <span class="text-[10px] text-muted">邀请玩家</span>
                  <div class="online-action-row mt-1">
                    <input
                      v-model="festivalRoomStore.draftInviteUsername"
                      class="online-input flex-1"
                      data-testid="online-festival-room-invite-username-input"
                      placeholder="输入用户名"
                    />
                    <Button
                      class="online-action-btn online-action-btn--primary"
                      data-testid="online-festival-room-invite-submit"
                      :disabled="festivalRoomStore.actionRunning"
                      @click="inviteMember(festivalRoomStore.myRoom.id)"
                    >
                      邀请
                    </Button>
                  </div>
                </label>

                <div class="grid gap-2 sm:grid-cols-2">
                  <Button
                    v-if="festivalRoomStore.myRoom.can_host_ready_check"
                    class="online-action-btn online-action-btn--compact justify-center"
                    data-testid="online-festival-room-ready-check-submit"
                    :disabled="festivalRoomStore.actionRunning"
                    @click="startReadyCheck(festivalRoomStore.myRoom.id)"
                  >
                    开准备
                  </Button>
                  <Button
                    v-if="festivalRoomStore.myRoom.can_ready"
                    class="online-action-btn online-action-btn--compact justify-center"
                    data-testid="online-festival-room-ready-submit"
                    :disabled="festivalRoomStore.actionRunning"
                    @click="readyRoom(festivalRoomStore.myRoom.id)"
                  >
                    我已准备
                  </Button>
                  <Button v-if="festivalRoomStore.myRoom.can_unready" class="online-action-btn online-action-btn--compact justify-center" :disabled="festivalRoomStore.actionRunning" @click="unreadyRoom(festivalRoomStore.myRoom.id)">
                    取消准备
                  </Button>
                  <Button
                    v-if="festivalRoomStore.myRoom.can_host_start_countdown"
                    class="online-action-btn online-action-btn--compact justify-center"
                    data-testid="online-festival-room-start-submit"
                    :disabled="festivalRoomStore.actionRunning"
                    @click="startCountdown(festivalRoomStore.myRoom.id)"
                  >
                    开倒计时
                  </Button>
                  <Button v-if="festivalRoomStore.myRoom.can_disconnect" class="online-action-btn online-action-btn--compact justify-center" :disabled="festivalRoomStore.actionRunning" @click="disconnectRoom(festivalRoomStore.myRoom.id)">
                    模拟断线
                  </Button>
                  <Button v-if="festivalRoomStore.myRoom.can_reconnect" class="online-action-btn online-action-btn--compact justify-center" :disabled="festivalRoomStore.actionRunning" @click="reconnectRoom(festivalRoomStore.myRoom.id)">
                    恢复连接
                  </Button>
                  <Button
                    v-if="festivalRoomStore.myRoom.can_host_settle"
                    class="online-action-btn online-action-btn--compact justify-center"
                    data-testid="online-festival-room-settle-submit"
                    :disabled="festivalRoomStore.actionRunning"
                    @click="settleRoom(festivalRoomStore.myRoom.id)"
                  >
                    进入结算
                  </Button>
                  <Button
                    v-if="festivalRoomStore.myRoom.can_host_close"
                    class="online-action-btn online-action-btn--compact justify-center"
                    data-testid="online-festival-room-close-submit"
                    :disabled="festivalRoomStore.actionRunning"
                    @click="closeRoom(festivalRoomStore.myRoom.id)"
                  >
                    {{ festivalRoomStore.myRoom.state === 'settling' ? '正式关闭' : '取消房间' }}
                  </Button>
                  <Button v-if="festivalRoomStore.myRoom.can_leave" class="online-action-btn online-action-btn--compact justify-center" :disabled="festivalRoomStore.actionRunning" @click="leaveRoom(festivalRoomStore.myRoom.id)">
                    离开房间
                  </Button>
                </div>
              </div>
              <p v-else class="mt-3 text-xs leading-5 text-muted">当前没有进行中的节会房间。可以先处理邀请，或创建自己的节会房间。</p>
            </div>

            <div class="game-panel-muted p-3">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm text-accent">待处理邀请</p>
                <span class="text-[10px] text-muted">{{ festivalRoomStore.invitedRooms.length }} 条</span>
              </div>
              <div v-if="festivalRoomStore.invitedRooms.length === 0" class="mt-3 text-xs leading-5 text-muted">当前没有待处理的节会邀请。</div>
              <div v-else class="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
                <div v-for="room in festivalRoomStore.invitedRooms" :key="room.id" class="border border-warning/15 bg-warning/5 p-2">
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div class="min-w-0">
                      <p class="truncate text-xs text-text">{{ room.title }}</p>
                      <p class="mt-1 text-[10px] text-muted">{{ room.template_label }} · {{ room.gameplay.template_label }} · 房主 {{ room.host_display_name }}</p>
                    </div>
                    <Button class="online-action-btn online-action-btn--compact shrink-0" :disabled="festivalRoomStore.actionRunning || !room.can_join" @click="joinRoom(room.id)">
                      加入
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <div class="game-panel-muted p-3">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm text-accent">创建节会房间</p>
                <span class="text-[10px] text-muted">房型与玩法</span>
              </div>
              <div class="mt-3 space-y-3">
                <div class="flex flex-wrap gap-2">
                  <Button class="online-action-btn online-action-btn--compact w-fit" :disabled="festivalRoomStore.actionRunning" @click="selectLanternFairDraft">
                    <Lamp :size="13" aria-hidden="true" />
                    灯会共建
                  </Button>
                  <Button class="online-action-btn online-action-btn--compact w-fit" :disabled="festivalRoomStore.actionRunning" @click="selectDragonBoatDraft">
                    <Flag :size="13" aria-hidden="true" />
                    端午赛舟
                  </Button>
                </div>
                <label class="block">
                  <span class="text-[10px] text-muted">节会房型</span>
                  <select v-model="festivalRoomStore.selectedTemplateId" class="online-select mt-1" data-testid="online-festival-room-template-select">
                    <option v-for="template in festivalRoomStore.templates" :key="template.id" :value="template.id">
                      {{ template.label }}
                    </option>
                  </select>
                </label>
                <div v-if="festivalRoomStore.selectedTemplate" class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-xs text-accent">{{ festivalRoomStore.selectedTemplate.label }}</p>
                  <p class="mt-1 text-[10px] leading-4 text-muted">{{ festivalRoomStore.selectedTemplate.summary }}</p>
                  <p class="mt-1 text-[10px] text-muted">默认人数上限：{{ festivalRoomStore.selectedTemplate.default_member_limit }} 人</p>
                  <p v-if="festivalRoomStore.recommendedGameplayTemplates.length > 0" class="mt-1 text-[10px] text-muted">
                    推荐玩法：{{ festivalRoomStore.recommendedGameplayTemplates.map(template => template.label).join(' / ') }}
                  </p>
                </div>
                <label class="block">
                  <span class="text-[10px] text-muted">玩法模板</span>
                  <select v-model="festivalRoomStore.selectedGameplayTemplateId" class="online-select mt-1" data-testid="online-festival-room-gameplay-select">
                    <option v-for="template in festivalRoomStore.gameplayTemplates" :key="template.id" :value="template.id">
                      {{ template.label }}
                    </option>
                  </select>
                </label>
                <div v-if="festivalRoomStore.selectedGameplayTemplate" class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-xs text-accent">{{ festivalRoomStore.selectedGameplayTemplate.label }}</p>
                  <p class="mt-1 text-[10px] leading-4 text-muted">{{ festivalRoomStore.selectedGameplayTemplate.summary }}</p>
                  <p class="mt-1 text-[10px] text-muted">
                    {{ festivalRoomStore.selectedGameplayTemplate.objective_label }} · 目标 {{ festivalRoomStore.selectedGameplayTemplate.default_target }}
                  </p>
                  <div v-if="festivalRoomStore.selectedGameplayTemplate.action_options.length > 0" class="mt-2 flex flex-wrap gap-1.5">
                    <span
                      v-for="action in festivalRoomStore.selectedGameplayTemplate.action_options"
                      :key="action.id"
                      class="border border-accent/15 px-1.5 py-0.5 text-[10px] text-muted"
                    >
                      {{ action.label }}
                    </span>
                  </div>
                </div>
                <label class="block">
                  <span class="text-[10px] text-muted">房间标题</span>
                  <input
                    v-model="festivalRoomStore.draftTitle"
                    maxlength="30"
                    class="online-input mt-1"
                    data-testid="online-festival-room-title-input"
                    placeholder="例如：端午夜练舟"
                  />
                </label>
                <Button
                  class="online-action-btn online-action-btn--primary w-full justify-center"
                  data-testid="online-festival-room-create-submit"
                  :disabled="festivalRoomStore.actionRunning || !festivalRoomStore.selectedTemplate || !festivalRoomStore.selectedGameplayTemplate"
                  @click="createRoom"
                >
                  创建房间
                </Button>
              </div>
            </div>

            <div class="game-panel-muted p-3">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm text-accent">可见房间</p>
                <span class="text-[10px] text-muted">{{ festivalRoomStore.visibleRooms.length }} 间</span>
              </div>
              <div v-if="festivalRoomStore.visibleRooms.length === 0" class="mt-3 text-xs leading-5 text-muted">当前还没有你能查看的节会房间。</div>
              <div v-else class="mt-3 max-h-[34rem] space-y-2 overflow-y-auto pr-1">
                <div v-for="room in festivalRoomStore.visibleRooms" :key="room.id" class="border border-accent/10 bg-black/10 p-2">
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div class="min-w-0">
                      <p class="truncate text-xs text-accent">{{ room.title }}</p>
                      <p class="mt-1 text-[10px] text-muted">
                        {{ room.template_label }} · {{ room.gameplay.template_label }} · {{ room.state_label }} · {{ room.joined_member_count }}/{{ room.member_limit }} 人
                      </p>
                    </div>
                    <div class="flex shrink-0 items-center gap-2">
                      <span class="text-[10px] text-muted">{{ room.ready_member_count }} 已准备</span>
                      <Button v-if="room.can_join" class="online-action-btn online-action-btn--compact" :disabled="festivalRoomStore.actionRunning" @click="joinRoom(room.id)">
                        加入
                      </Button>
                    </div>
                  </div>
                  <p class="mt-2 text-[10px] text-muted">{{ room.gameplay.progress_text }} · {{ room.gameplay.score_label }} {{ room.gameplay.score_value }}</p>
                  <div class="mt-2 h-1.5 overflow-hidden border border-accent/10 bg-bg">
                    <div class="h-full bg-accent/70 transition-all" :style="{ width: `${room.gameplay.progress_percent}%` }" />
                  </div>
                  <div v-if="room.members.length > 0" class="mt-2 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1">
                    <span
                      v-for="member in room.members"
                      :key="`${room.id}-${member.username}`"
                      class="border border-accent/15 px-1.5 py-0.5 text-[10px] text-muted"
                    >
                      {{ member.display_name }} · {{ member.status_label }}
                    </span>
                  </div>
                  <div v-if="room.recent_events.length > 0" class="mt-2 max-h-24 space-y-1 overflow-y-auto pr-1">
                    <p v-for="event in room.recent_events.slice(0, 4)" :key="event.id" class="text-[10px] leading-4 text-muted">
                      - {{ event.summary }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-accent">最近结算凭证</p>
            <span class="text-[10px] text-muted">{{ festivalRoomStore.recentReceipts.length }} 条</span>
          </div>
          <div v-if="festivalRoomStore.recentReceipts.length === 0" class="mt-3 text-xs leading-5 text-muted">当前还没有节会房间结算凭证。</div>
          <div v-else class="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
            <div v-for="receipt in festivalRoomStore.recentReceipts" :key="receipt.id" class="border border-accent/10 bg-black/10 p-2">
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div class="min-w-0">
                  <p class="truncate text-xs text-text">{{ receipt.room_title }}</p>
                  <p class="mt-1 text-[10px] text-muted">{{ receipt.template_label }} · 槽位 {{ receipt.target_slot + 1 }}</p>
                </div>
                <span class="w-fit shrink-0 text-[10px] text-accent">{{ receipt.status_label }}</span>
              </div>
              <p class="mt-2 text-[10px] leading-4 text-muted">{{ receipt.summary }}</p>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'expedition-room'" class="space-y-3">
        <div class="game-panel-muted p-3">
          <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div class="min-w-0">
              <p class="text-sm text-accent">远征房间</p>
              <p class="mt-1 text-xs leading-5 text-muted">
                {{ expeditionRoomStore.overview?.bulletin || '这一页承接远征房间、协作矿洞、组队采集、护送抵运和海域共探的最小闭环。' }}
              </p>
            </div>
            <span class="shrink-0 text-[10px] text-muted">{{ expeditionRoomStore.loading ? '正在刷新' : '已载入远征摘要' }}</span>
          </div>
        </div>

        <div class="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div class="space-y-3">
            <div class="game-panel-muted p-3" data-testid="online-expedition-room-status-panel">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm text-accent">我的远征状态</p>
                <span class="text-[10px] text-muted">{{ expeditionRoomStore.myRoom ? expeditionRoomStore.myRoom.state_label : '空闲中' }}</span>
              </div>
              <div v-if="expeditionRoomStore.myRoom" class="mt-3 space-y-3" data-testid="online-expedition-room-my-room">
                <div class="border border-accent/10 bg-black/10 p-2">
                  <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div class="min-w-0">
                      <p class="truncate text-xs text-accent">{{ expeditionRoomStore.myRoom.title }}</p>
                      <p class="mt-1 text-[10px] text-muted">
                        {{ expeditionRoomStore.myRoom.template_label }} · {{ expeditionRoomStore.myRoom.gameplay.template_label }} · {{ expeditionRoomStore.myRoom.joined_member_count }}/{{ expeditionRoomStore.myRoom.member_limit }} 人
                      </p>
                    </div>
                    <span class="w-fit shrink-0 text-[10px] text-muted">{{ expeditionRoomStore.myRoom.state_label }}</span>
                  </div>
                  <p v-if="expeditionRoomStore.myRoom.state_reason" class="mt-1 text-[10px] leading-4 text-warning">{{ expeditionRoomStore.myRoom.state_reason }}</p>
                  <p v-if="expeditionRoomStore.myRoom.opening_ceremony" class="mt-1 text-[10px] leading-4 text-success">
                    {{ expeditionRoomStore.myRoom.opening_ceremony.subtitle }}
                  </p>
                </div>

                <div class="border border-accent/10 bg-black/10 p-2">
                  <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div class="min-w-0">
                      <p class="truncate text-xs text-accent">{{ expeditionRoomStore.myRoom.gameplay.template_label }}</p>
                      <p class="mt-1 text-[10px] leading-4 text-muted">{{ expeditionRoomStore.myRoom.gameplay.template_summary }}</p>
                    </div>
                    <span class="w-fit shrink-0 text-[10px] text-muted">{{ expeditionRoomStore.myRoom.gameplay.phase_label }}</span>
                  </div>
                  <p class="mt-2 text-[10px] text-muted">
                    {{ expeditionRoomStore.myRoom.gameplay.progress_text }} · {{ expeditionRoomStore.myRoom.gameplay.score_label }} {{ expeditionRoomStore.myRoom.gameplay.score_value }}
                  </p>
                  <div class="mt-2 h-1.5 overflow-hidden border border-accent/10 bg-bg">
                    <div class="h-full bg-accent/70 transition-all" :style="{ width: `${expeditionRoomStore.myRoom.gameplay.progress_percent}%` }" />
                  </div>
                  <p v-if="expeditionRoomStore.myRoom.gameplay.last_action_summary" class="mt-2 text-[10px] leading-4 text-success">
                    {{ expeditionRoomStore.myRoom.gameplay.last_action_summary }}
                  </p>
                  <div v-if="expeditionRoomStore.myRoom.gameplay.contributions.length > 0" class="mt-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto pr-1">
                    <span
                      v-for="contribution in expeditionRoomStore.myRoom.gameplay.contributions"
                      :key="`${expeditionRoomStore.myRoom.id}-${contribution.username}-expedition-gameplay`"
                      class="border border-accent/15 px-1.5 py-0.5 text-[10px] text-muted"
                    >
                      {{ contribution.display_name }} · {{ contribution.action_count }} 次 · {{ contribution.progress_value }} 贡献
                    </span>
                  </div>
                </div>

                <div v-if="expeditionRoomStore.myRoom.gameplay.cavern_state" class="space-y-3">
                  <div class="border border-accent/10 bg-black/10 p-2">
                    <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div class="min-w-0">
                        <p class="truncate text-xs text-accent">{{ expeditionRoomStore.myRoom.gameplay.cavern_state.round_text }}</p>
                        <p class="mt-1 text-[10px] leading-4 text-muted">{{ expeditionRoomStore.myRoom.gameplay.cavern_state.current_event.summary }}</p>
                      </div>
                      <span class="w-fit shrink-0 text-[10px] text-warning">风险 {{ expeditionRoomStore.myRoom.gameplay.cavern_state.risk_text }}</span>
                    </div>
                    <div class="mt-2 grid gap-2 md:grid-cols-2">
                      <div class="border border-accent/10 bg-black/10 p-2">
                        <p class="text-[10px] text-muted">事件卡</p>
                        <p class="mt-1 text-xs text-text">{{ expeditionRoomStore.myRoom.gameplay.cavern_state.current_event.label }}</p>
                        <p class="mt-1 text-[10px] leading-4 text-muted">{{ expeditionRoomStore.myRoom.gameplay.cavern_state.current_event.risk_hint }}</p>
                        <p class="mt-1 text-[10px] leading-4 text-muted">{{ expeditionRoomStore.myRoom.gameplay.cavern_state.current_event.resource_hint }}</p>
                      </div>
                      <div class="border border-accent/10 bg-black/10 p-2">
                        <p class="text-[10px] text-muted">我的职责</p>
                        <template v-if="expeditionRoomStore.myRoom.gameplay.cavern_state.my_role">
                          <p class="mt-1 text-xs text-text">{{ expeditionRoomStore.myRoom.gameplay.cavern_state.my_role.role_label }}</p>
                          <p class="mt-1 text-[10px] leading-4 text-muted">{{ expeditionRoomStore.myRoom.gameplay.cavern_state.my_role.role_summary }}</p>
                        </template>
                        <p v-else class="mt-1 text-[10px] text-muted">加入房间后会显示本局职责。</p>
                      </div>
                    </div>
                    <p v-if="expeditionRoomStore.myRoom.gameplay.cavern_state.recent_feedback" class="mt-2 text-[10px] leading-4 text-success">
                      {{ expeditionRoomStore.myRoom.gameplay.cavern_state.recent_feedback }}
                    </p>
                  </div>

                  <div class="grid gap-2 md:grid-cols-2">
                    <div class="border border-accent/10 bg-black/10 p-2">
                      <p class="text-xs text-accent">队伍资源</p>
                      <div class="mt-2 grid max-h-36 grid-cols-2 gap-2 overflow-y-auto pr-1">
                        <div v-for="resource in expeditionRoomStore.myRoom.gameplay.cavern_state.team_resources" :key="resource.id" class="border border-accent/10 bg-black/10 p-2">
                          <p class="text-[10px] text-accent">{{ resource.label }}</p>
                          <p class="mt-1 text-xs text-text">{{ resource.value }} / {{ resource.max_value }}</p>
                          <p class="mt-1 text-[10px] text-muted">{{ resource.text }}</p>
                        </div>
                      </div>
                    </div>
                    <div class="border border-accent/10 bg-black/10 p-2">
                      <p class="text-xs text-accent">职责分工</p>
                      <div v-if="expeditionRoomStore.myRoom.gameplay.cavern_state.role_assignments.length === 0" class="mt-2 text-[10px] text-muted">当前还没有完成队伍分工。</div>
                      <div v-else class="mt-2 max-h-36 space-y-1.5 overflow-y-auto pr-1">
                        <div v-for="role in expeditionRoomStore.myRoom.gameplay.cavern_state.role_assignments" :key="`${expeditionRoomStore.myRoom.id}-${role.username}-role`" class="flex items-start justify-between gap-2">
                          <span class="min-w-0 truncate text-[10px] text-text">{{ role.display_name }}</span>
                          <span class="shrink-0 text-[10px] text-accent">{{ role.role_label }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-if="expeditionRoomStore.myRoom.gameplay.cavern_state.round_log.length > 0" class="border border-accent/10 bg-black/10 p-2">
                    <p class="text-xs text-accent">回合日志</p>
                    <div class="mt-2 max-h-52 space-y-2 overflow-y-auto pr-1">
                      <div v-for="entry in expeditionRoomStore.myRoom.gameplay.cavern_state.round_log.slice(0, 8)" :key="entry.id" class="border border-accent/10 bg-black/10 p-2">
                        <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                          <p class="min-w-0 truncate text-[10px] text-accent">第 {{ entry.round_number }} 回合 · {{ entry.action_label }}</p>
                          <span v-if="entry.role_label" class="shrink-0 text-[10px] text-muted">{{ entry.role_label }}</span>
                        </div>
                        <p class="mt-1 text-[10px] leading-4 text-muted">{{ entry.summary }}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="expeditionRoomStore.myRoom.gameplay.available_actions.length > 0" class="space-y-2">
                  <p class="text-[10px] text-muted">玩法动作</p>
                  <div class="grid gap-2 md:grid-cols-2">
                    <div
                      v-for="action in expeditionRoomStore.myRoom.gameplay.available_actions"
                      :key="`${expeditionRoomStore.myRoom.id}-${action.id}`"
                      class="border border-accent/10 bg-black/10 p-2"
                    >
                      <div class="flex flex-col gap-2 sm:flex-row sm:items-start">
                        <Button
                          class="online-action-btn online-action-btn--compact shrink-0"
                          :data-testid="`online-expedition-room-gameplay-action-${action.id}`"
                          :disabled="expeditionRoomStore.actionRunning || !action.can_use"
                          @click="playExpeditionGameplayAction(expeditionRoomStore.myRoom.id, action.id)"
                        >
                          {{ action.label }}
                        </Button>
                        <p class="text-[10px] leading-4 text-muted">{{ action.summary }}</p>
                      </div>
                      <div class="mt-2 flex flex-wrap gap-1.5">
                        <span v-if="action.required_role_label" class="border border-accent/15 px-1.5 py-0.5 text-[10px] text-muted">
                          {{ action.required_role_label }}
                        </span>
                        <span v-if="action.once_per_round" class="border border-accent/15 px-1.5 py-0.5 text-[10px] text-muted">
                          每回合一次
                        </span>
                        <span v-if="action.risk_delta_text" class="border border-accent/15 px-1.5 py-0.5 text-[10px] text-muted">
                          {{ action.risk_delta_text }}
                        </span>
                        <span v-if="action.resource_delta_text" class="border border-accent/15 px-1.5 py-0.5 text-[10px] text-muted">
                          {{ action.resource_delta_text }}
                        </span>
                      </div>
                      <p v-if="action.round_effect" class="mt-2 text-[10px] leading-4 text-muted">{{ action.round_effect }}</p>
                      <p v-if="!action.can_use && action.disabled_reason" class="mt-1 text-[10px] text-muted">{{ action.disabled_reason }}</p>
                    </div>
                  </div>
                </div>

                <div v-if="expeditionRoomStore.myRoom.settlement_receipts.length > 0" class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-xs text-accent">本房结算凭证</p>
                  <div class="mt-2 max-h-36 space-y-1.5 overflow-y-auto pr-1">
                    <p
                      v-for="receipt in expeditionRoomStore.myRoom.settlement_receipts"
                      :key="receipt.id"
                      class="text-[10px] leading-4 text-muted"
                    >
                      {{ receipt.target_display_name }} · {{ receipt.status_label }} · {{ receipt.summary }}
                    </p>
                  </div>
                </div>

                <label class="block">
                  <span class="text-[10px] text-muted">邀请玩家</span>
                  <div class="online-action-row mt-1">
                    <input
                      v-model="expeditionRoomStore.draftInviteUsername"
                      class="online-input flex-1"
                      data-testid="online-expedition-room-invite-username-input"
                      placeholder="输入用户名"
                    />
                    <Button
                      class="online-action-btn online-action-btn--primary"
                      data-testid="online-expedition-room-invite-submit"
                      :disabled="expeditionRoomStore.actionRunning"
                      @click="inviteExpeditionMember(expeditionRoomStore.myRoom.id)"
                    >
                      邀请
                    </Button>
                  </div>
                </label>

                <div class="grid gap-2 sm:grid-cols-2">
                  <Button
                    v-if="expeditionRoomStore.myRoom.can_host_ready_check"
                    class="online-action-btn online-action-btn--compact justify-center"
                    data-testid="online-expedition-room-ready-check-submit"
                    :disabled="expeditionRoomStore.actionRunning"
                    @click="startExpeditionReadyCheck(expeditionRoomStore.myRoom.id)"
                  >
                    开始 ready
                  </Button>
                  <Button
                    v-if="expeditionRoomStore.myRoom.can_ready"
                    class="online-action-btn online-action-btn--compact justify-center"
                    data-testid="online-expedition-room-ready-submit"
                    :disabled="expeditionRoomStore.actionRunning"
                    @click="readyExpeditionRoom(expeditionRoomStore.myRoom.id)"
                  >
                    我已准备
                  </Button>
                  <Button v-if="expeditionRoomStore.myRoom.can_unready" class="online-action-btn online-action-btn--compact justify-center" :disabled="expeditionRoomStore.actionRunning" @click="unreadyExpeditionRoom(expeditionRoomStore.myRoom.id)">
                    取消准备
                  </Button>
                  <Button
                    v-if="expeditionRoomStore.myRoom.can_host_start_countdown"
                    class="online-action-btn online-action-btn--compact justify-center"
                    data-testid="online-expedition-room-start-submit"
                    :disabled="expeditionRoomStore.actionRunning"
                    @click="startExpeditionCountdown(expeditionRoomStore.myRoom.id)"
                  >
                    开始倒计时
                  </Button>
                  <Button v-if="expeditionRoomStore.myRoom.can_disconnect" class="online-action-btn online-action-btn--compact justify-center" :disabled="expeditionRoomStore.actionRunning" @click="disconnectExpeditionRoom(expeditionRoomStore.myRoom.id)">
                    模拟断线
                  </Button>
                  <Button v-if="expeditionRoomStore.myRoom.can_reconnect" class="online-action-btn online-action-btn--compact justify-center" :disabled="expeditionRoomStore.actionRunning" @click="reconnectExpeditionRoom(expeditionRoomStore.myRoom.id)">
                    恢复连接
                  </Button>
                  <Button
                    v-if="expeditionRoomStore.myRoom.can_host_settle"
                    class="online-action-btn online-action-btn--compact justify-center"
                    data-testid="online-expedition-room-settle-submit"
                    :disabled="expeditionRoomStore.actionRunning"
                    @click="settleExpeditionRoom(expeditionRoomStore.myRoom.id)"
                  >
                    撤离并结算
                  </Button>
                  <Button
                    v-if="expeditionRoomStore.myRoom.can_host_close"
                    class="online-action-btn online-action-btn--compact justify-center"
                    data-testid="online-expedition-room-close-submit"
                    :disabled="expeditionRoomStore.actionRunning"
                    @click="closeExpeditionRoom(expeditionRoomStore.myRoom.id)"
                  >
                    {{ expeditionRoomStore.myRoom.state === 'settling' ? '正式关闭' : '取消房间' }}
                  </Button>
                  <Button v-if="expeditionRoomStore.myRoom.can_leave" class="online-action-btn online-action-btn--compact justify-center" :disabled="expeditionRoomStore.actionRunning" @click="leaveExpeditionRoom(expeditionRoomStore.myRoom.id)">
                    离开房间
                  </Button>
                </div>
              </div>
              <p v-else class="mt-3 text-xs leading-5 text-muted">当前没有进行中的远征房间。可以先处理邀请，或创建自己的远征房间。</p>
            </div>

            <div class="game-panel-muted p-3">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm text-accent">待处理邀请</p>
                <span class="text-[10px] text-muted">{{ expeditionRoomStore.invitedRooms.length }} 条</span>
              </div>
              <div v-if="expeditionRoomStore.invitedRooms.length === 0" class="mt-3 text-xs leading-5 text-muted">当前没有待处理的远征邀请。</div>
              <div v-else class="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
                <div v-for="room in expeditionRoomStore.invitedRooms" :key="room.id" class="border border-warning/15 bg-warning/5 p-2">
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div class="min-w-0">
                      <p class="truncate text-xs text-text">{{ room.title }}</p>
                      <p class="mt-1 text-[10px] text-muted">{{ room.template_label }} · {{ room.gameplay.template_label }} · 房主 {{ room.host_display_name }}</p>
                    </div>
                    <Button class="online-action-btn online-action-btn--compact shrink-0" :disabled="expeditionRoomStore.actionRunning || !room.can_join" @click="joinExpeditionRoom(room.id)">
                      加入
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <div class="game-panel-muted p-3">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm text-accent">创建远征房间</p>
                <span class="text-[10px] text-muted">远征与玩法</span>
              </div>
              <div class="mt-3 space-y-3">
                <label class="block">
                  <span class="text-[10px] text-muted">远征模板</span>
                  <select v-model="expeditionRoomStore.selectedTemplateId" class="online-select mt-1" data-testid="online-expedition-room-template-select">
                    <option v-for="template in expeditionRoomStore.templates" :key="template.id" :value="template.id">
                      {{ template.label }}
                    </option>
                  </select>
                </label>
                <div v-if="expeditionRoomStore.selectedTemplate" class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-xs text-accent">{{ expeditionRoomStore.selectedTemplate.label }}</p>
                  <p class="mt-1 text-[10px] leading-4 text-muted">{{ expeditionRoomStore.selectedTemplate.summary }}</p>
                  <p class="mt-1 text-[10px] text-muted">默认人数上限：{{ expeditionRoomStore.selectedTemplate.default_member_limit }} 人</p>
                  <p v-if="expeditionRoomStore.recommendedGameplayTemplates.length > 0" class="mt-1 text-[10px] text-muted">
                    推荐玩法：{{ expeditionRoomStore.recommendedGameplayTemplates.map(template => template.label).join(' / ') }}
                  </p>
                </div>
                <label class="block">
                  <span class="text-[10px] text-muted">玩法模板</span>
                  <select v-model="expeditionRoomStore.selectedGameplayTemplateId" class="online-select mt-1" data-testid="online-expedition-room-gameplay-select">
                    <option v-for="template in expeditionRoomStore.gameplayTemplates" :key="template.id" :value="template.id">
                      {{ template.label }}
                    </option>
                  </select>
                </label>
                <div v-if="expeditionRoomStore.selectedGameplayTemplate" class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-xs text-accent">{{ expeditionRoomStore.selectedGameplayTemplate.label }}</p>
                  <p class="mt-1 text-[10px] leading-4 text-muted">{{ expeditionRoomStore.selectedGameplayTemplate.summary }}</p>
                  <p class="mt-1 text-[10px] text-muted">
                    {{ expeditionRoomStore.selectedGameplayTemplate.objective_label }} · 目标 {{ expeditionRoomStore.selectedGameplayTemplate.default_target }}
                  </p>
                  <div v-if="expeditionRoomStore.selectedGameplayTemplate.action_options.length > 0" class="mt-2 flex flex-wrap gap-1.5">
                    <span
                      v-for="action in expeditionRoomStore.selectedGameplayTemplate.action_options"
                      :key="action.id"
                      class="border border-accent/15 px-1.5 py-0.5 text-[10px] text-muted"
                    >
                      {{ action.label }}
                    </span>
                  </div>
                </div>
                <label class="block">
                  <span class="text-[10px] text-muted">房间标题</span>
                  <input
                    v-model="expeditionRoomStore.draftTitle"
                    maxlength="30"
                    class="online-input mt-1"
                    data-testid="online-expedition-room-title-input"
                    placeholder="例如：高地补给接力"
                  />
                </label>
                <Button
                  class="online-action-btn online-action-btn--primary w-full justify-center"
                  data-testid="online-expedition-room-create-submit"
                  :disabled="expeditionRoomStore.actionRunning || !expeditionRoomStore.selectedTemplate || !expeditionRoomStore.selectedGameplayTemplate"
                  @click="createExpeditionRoom"
                >
                  创建远征房间
                </Button>
              </div>
            </div>

            <div class="game-panel-muted p-3">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm text-accent">可见房间</p>
                <span class="text-[10px] text-muted">{{ expeditionRoomStore.visibleRooms.length }} 间</span>
              </div>
              <div v-if="expeditionRoomStore.visibleRooms.length === 0" class="mt-3 text-xs leading-5 text-muted">当前还没有你能查看的远征房间。</div>
              <div v-else class="mt-3 max-h-[34rem] space-y-2 overflow-y-auto pr-1">
                <div v-for="room in expeditionRoomStore.visibleRooms" :key="room.id" class="border border-accent/10 bg-black/10 p-2">
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div class="min-w-0">
                      <p class="truncate text-xs text-accent">{{ room.title }}</p>
                      <p class="mt-1 text-[10px] text-muted">
                        {{ room.template_label }} · {{ room.gameplay.template_label }} · {{ room.state_label }} · {{ room.joined_member_count }}/{{ room.member_limit }} 人
                      </p>
                    </div>
                    <div class="flex shrink-0 items-center gap-2">
                      <span class="text-[10px] text-muted">{{ room.ready_member_count }} 已准备</span>
                      <Button v-if="room.can_join" class="online-action-btn online-action-btn--compact" :disabled="expeditionRoomStore.actionRunning" @click="joinExpeditionRoom(room.id)">
                        加入
                      </Button>
                    </div>
                  </div>
                  <p class="mt-2 text-[10px] text-muted">{{ room.gameplay.progress_text }} · {{ room.gameplay.score_label }} {{ room.gameplay.score_value }}</p>
                  <div class="mt-2 h-1.5 overflow-hidden border border-accent/10 bg-bg">
                    <div class="h-full bg-accent/70 transition-all" :style="{ width: `${room.gameplay.progress_percent}%` }" />
                  </div>
                  <div v-if="room.members.length > 0" class="mt-2 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1">
                    <span
                      v-for="member in room.members"
                      :key="`${room.id}-${member.username}`"
                      class="border border-accent/15 px-1.5 py-0.5 text-[10px] text-muted"
                    >
                      {{ member.display_name }} · {{ member.status_label }}
                    </span>
                  </div>
                  <div v-if="room.recent_events.length > 0" class="mt-2 max-h-24 space-y-1 overflow-y-auto pr-1">
                    <p v-for="event in room.recent_events.slice(0, 4)" :key="event.id" class="text-[10px] leading-4 text-muted">
                      - {{ event.summary }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-accent">最近结算凭证</p>
            <span class="text-[10px] text-muted">{{ expeditionRoomStore.recentReceipts.length }} 条</span>
          </div>
          <div v-if="expeditionRoomStore.recentReceipts.length === 0" class="mt-3 text-xs leading-5 text-muted">当前还没有远征房间结算凭证。</div>
          <div v-else class="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
            <div v-for="receipt in expeditionRoomStore.recentReceipts" :key="receipt.id" class="border border-accent/10 bg-black/10 p-2">
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div class="min-w-0">
                  <p class="truncate text-xs text-text">{{ receipt.room_title }}</p>
                  <p class="mt-1 text-[10px] text-muted">{{ receipt.template_label }} · 槽位 {{ receipt.target_slot + 1 }}</p>
                </div>
                <span class="w-fit shrink-0 text-[10px] text-accent">{{ receipt.status_label }}</span>
              </div>
              <p class="mt-2 text-[10px] leading-4 text-muted">{{ receipt.summary }}</p>
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
  import { CalendarDays, Flag, Lamp } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import OnlineModuleShell from '@/components/game/online/OnlineModuleShell.vue'
  import VisualSceneBoard from '@/components/game/online/VisualSceneBoard.vue'
  import VisualTrackBoard from '@/components/game/online/VisualTrackBoard.vue'
  import { useExpeditionRoomStore } from '@/stores/useExpeditionRoomStore'
  import { useFestivalRoomStore } from '@/stores/useFestivalRoomStore'
  import { useWorldEventStore } from '@/stores/useWorldEventStore'
  import type { OnlineVisualObject, OnlineVisualTrack } from '@/types/onlineVisual'
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
  type FestivalVisualActionPayload = { objectId: string; actionId: string }
  type FestivalTrackCellPayload = { trackId: string; cellId: string }
  type FestivalTrackActionPayload = FestivalTrackCellPayload & { actionId: string }

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
    { key: 'festival-room', label: '节会房间', summary: '创建节会房间，处理邀请、ready、玩法动作和结算凭证。' },
    { key: 'expedition-room', label: '远征房间', summary: '创建远征队伍，处理分工、资源、回合动作、断线恢复和结算。' },
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
  const selectedFestivalVisualObjectId = ref('')
  const selectedFestivalVisualTrackId = ref('')
  const selectedFestivalVisualTrackCellId = ref('')
  const setActiveTab = (tab: string) => {
    activeTab.value = tab as FestivalTabKey
  }
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
  const festivalGameplayActionMap = computed(() =>
    new Map((festivalRoomStore.myRoom?.gameplay.available_actions ?? []).map(action => [action.id, action]))
  )
  const festivalSceneObjects = computed<OnlineVisualObject[]>(() => {
    const visualState = festivalRoomStore.myRoom?.visual_state
    if (visualState?.board_type !== 'scene') return []
    const actionMap = festivalGameplayActionMap.value
    return (visualState.objects ?? []).map(object => ({
      ...object,
      available_action_ids: object.available_action_ids.filter(actionId => actionMap.get(actionId)?.can_use),
    }))
  })
  const festivalTracks = computed<OnlineVisualTrack[]>(() => {
    const visualState = festivalRoomStore.myRoom?.visual_state
    if (visualState?.board_type !== 'track') return []
    const actionMap = festivalGameplayActionMap.value
    return (visualState.tracks ?? []).map(track => ({
      ...track,
      cells: track.cells.map(cell => ({
        ...cell,
        available_action_ids: cell.available_action_ids.filter(actionId => actionMap.get(actionId)?.can_use),
      })),
    }))
  })
  const showFestivalSceneBoard = computed(() => festivalSceneObjects.value.length > 0)
  const showFestivalTrackBoard = computed(() => festivalTracks.value.some(track => track.cells.length > 0))
  const selectedFestivalSceneObjectId = computed(() =>
    selectedFestivalVisualObjectId.value || festivalRoomStore.myRoom?.visual_state.selected_visual_id || ''
  )
  const selectedFestivalTrackId = computed(() =>
    selectedFestivalVisualTrackId.value || festivalTracks.value[0]?.id || ''
  )
  const selectedFestivalTrackCellId = computed(() =>
    selectedFestivalVisualTrackCellId.value || festivalRoomStore.myRoom?.visual_state.selected_visual_id || ''
  )
  const festivalSceneFeedback = computed(() =>
    festivalRoomStore.myRoom?.visual_state.recent_feedback || festivalRoomStore.myFestivalState?.recent_feedback || ''
  )
  const festivalTrackFeedback = computed(() =>
    festivalRoomStore.myRoom?.visual_state.recent_feedback || festivalRoomStore.myFestivalState?.recent_feedback || ''
  )
  const festivalVisualHighlights = computed(() => {
    const visualState = festivalRoomStore.myRoom?.visual_state
    return visualState?.board_type === 'scene' || visualState?.board_type === 'track' ? visualState.highlights.slice(0, 4) : []
  })
  const festivalSceneActionLabels = computed<Record<string, string>>(() =>
    Object.fromEntries(Array.from(festivalGameplayActionMap.value.values()).map(action => [action.id, action.label]))
  )

  const getRouteQueryText = (value: unknown) => {
    const raw = Array.isArray(value) ? value[0] : value
    return typeof raw === 'string' ? raw.trim() : ''
  }
  const applyInviteRouteDraft = () => {
    const targetUsername = getRouteQueryText(route.query.target_username)
    const targetSaveId = getRouteQueryText(route.query.target_save_id)
    if (targetUsername) {
      festivalRoomStore.draftInviteUsername = targetUsername
      expeditionRoomStore.draftInviteUsername = targetUsername
    }
    if (targetSaveId) {
      festivalRoomStore.draftInviteSaveId = targetSaveId
      expeditionRoomStore.draftInviteSaveId = targetSaveId
    }
  }
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
  const createRoom = async () => {
    await festivalRoomStore.createRoom().catch(() => {})
  }
  const selectLanternFairDraft = () => {
    festivalRoomStore.selectedTemplateId = 'lantern_fair'
    festivalRoomStore.selectedGameplayTemplateId = 'assembly'
    if (!festivalRoomStore.draftTitle.trim()) festivalRoomStore.draftTitle = '上元灯会共建'
  }
  const selectDragonBoatDraft = () => {
    festivalRoomStore.selectedTemplateId = 'dragon_boat'
    festivalRoomStore.selectedGameplayTemplateId = 'squad_coop'
    if (!festivalRoomStore.draftTitle.trim()) festivalRoomStore.draftTitle = '端午赛舟演练'
  }
  const inviteMember = async (roomId: string) => {
    await festivalRoomStore.inviteMember(roomId).catch(() => {})
  }
  const joinRoom = async (roomId: string) => {
    await festivalRoomStore.joinRoom(roomId).catch(() => {})
  }
  const leaveRoom = async (roomId: string) => {
    await festivalRoomStore.leaveRoomAction(roomId).catch(() => {})
  }
  const startReadyCheck = async (roomId: string) => {
    await festivalRoomStore.startReadyCheck(roomId).catch(() => {})
  }
  const readyRoom = async (roomId: string) => {
    await festivalRoomStore.readyRoomAction(roomId).catch(() => {})
  }
  const unreadyRoom = async (roomId: string) => {
    await festivalRoomStore.unreadyRoomAction(roomId).catch(() => {})
  }
  const startCountdown = async (roomId: string) => {
    await festivalRoomStore.startCountdown(roomId).catch(() => {})
  }
  const disconnectRoom = async (roomId: string) => {
    await festivalRoomStore.disconnectRoomAction(roomId).catch(() => {})
  }
  const reconnectRoom = async (roomId: string) => {
    await festivalRoomStore.reconnectRoomAction(roomId).catch(() => {})
  }
  const playGameplayAction = async (roomId: string, actionId: string) => {
    await festivalRoomStore.submitGameplayAction(roomId, actionId).catch(() => {})
  }
  const selectFestivalVisualObject = (objectId: string) => {
    selectedFestivalVisualObjectId.value = objectId
  }
  const selectFestivalTrackCell = (payload: FestivalTrackCellPayload) => {
    selectedFestivalVisualTrackId.value = payload.trackId
    selectedFestivalVisualTrackCellId.value = payload.cellId
  }
  const triggerFestivalVisualAction = async (payload: FestivalVisualActionPayload) => {
    selectedFestivalVisualObjectId.value = payload.objectId
    const roomId = festivalRoomStore.myRoom?.id
    if (!roomId) return
    await playGameplayAction(roomId, payload.actionId)
  }
  const triggerFestivalTrackAction = async (payload: FestivalTrackActionPayload) => {
    selectedFestivalVisualTrackId.value = payload.trackId
    selectedFestivalVisualTrackCellId.value = payload.cellId
    const roomId = festivalRoomStore.myRoom?.id
    if (!roomId) return
    await playGameplayAction(roomId, payload.actionId)
  }
  const settleRoom = async (roomId: string) => {
    await festivalRoomStore.settleRoomAction(roomId).catch(() => {})
  }
  const closeRoom = async (roomId: string) => {
    await festivalRoomStore.closeRoomAction(roomId).catch(() => {})
  }
  const createExpeditionRoom = async () => {
    await expeditionRoomStore.createRoom().catch(() => {})
  }
  const inviteExpeditionMember = async (roomId: string) => {
    await expeditionRoomStore.inviteMember(roomId).catch(() => {})
  }
  const joinExpeditionRoom = async (roomId: string) => {
    await expeditionRoomStore.joinRoom(roomId).catch(() => {})
  }
  const leaveExpeditionRoom = async (roomId: string) => {
    await expeditionRoomStore.leaveRoomAction(roomId).catch(() => {})
  }
  const startExpeditionReadyCheck = async (roomId: string) => {
    await expeditionRoomStore.startReadyCheck(roomId).catch(() => {})
  }
  const readyExpeditionRoom = async (roomId: string) => {
    await expeditionRoomStore.readyRoomAction(roomId).catch(() => {})
  }
  const unreadyExpeditionRoom = async (roomId: string) => {
    await expeditionRoomStore.unreadyRoomAction(roomId).catch(() => {})
  }
  const startExpeditionCountdown = async (roomId: string) => {
    await expeditionRoomStore.startCountdown(roomId).catch(() => {})
  }
  const disconnectExpeditionRoom = async (roomId: string) => {
    await expeditionRoomStore.disconnectRoomAction(roomId).catch(() => {})
  }
  const reconnectExpeditionRoom = async (roomId: string) => {
    await expeditionRoomStore.reconnectRoomAction(roomId).catch(() => {})
  }
  const playExpeditionGameplayAction = async (roomId: string, actionId: string) => {
    await expeditionRoomStore.submitGameplayAction(roomId, actionId).catch(() => {})
  }
  const settleExpeditionRoom = async (roomId: string) => {
    await expeditionRoomStore.settleRoomAction(roomId).catch(() => {})
  }
  const closeExpeditionRoom = async (roomId: string) => {
    await expeditionRoomStore.closeRoomAction(roomId).catch(() => {})
  }

  watch(
    () => route.query.tab,
    tab => {
      activeTab.value = normalizeTab(tab)
    }
  )
  watch(
    () => festivalRoomStore.myRoom?.id,
    () => {
      selectedFestivalVisualObjectId.value = ''
      selectedFestivalVisualTrackId.value = ''
      selectedFestivalVisualTrackCellId.value = ''
    }
  )
  watch(
    () => [route.query.target_username, route.query.target_save_id],
    () => {
      applyInviteRouteDraft()
    }
  )

  onMounted(() => {
    applyInviteRouteDraft()
    void refreshFestivalModule()
  })
</script>
