<template>
  <div class="space-y-3">
    <div class="border border-success/20 rounded-xs p-3 bg-success/5">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-[0.625rem] tracking-[0.24em] text-success/70">四季大事件</p>
          <p class="text-sm text-success mt-1">世界进度与季节共同目标</p>
          <p class="text-xs text-muted mt-2 leading-5">{{ worldEventStore.overview?.bulletin || '先把当前季节事件独立跑在世界事件层里，再逐步往更完整的全服事件与世界纪年扩。' }}</p>
        </div>
        <div class="text-right shrink-0">
          <p class="text-[0.625rem] text-muted">当前季节</p>
          <p class="text-xs text-success mt-1">{{ worldEventStore.overview?.current_season_label || '未载入' }}</p>
        </div>
      </div>
      <p v-if="worldEventStore.errorMessage" class="text-xs text-danger mt-3">{{ worldEventStore.errorMessage }}</p>
    </div>

    <div class="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div class="border border-success/20 rounded-xs p-3 bg-bg/10">
        <div class="flex items-center justify-between gap-2 mb-2">
          <p class="text-sm text-success">当前季节大事件</p>
          <span class="text-[0.625rem] text-muted">{{ worldEventStore.currentEvent?.state_label || '未开放' }}</span>
        </div>
        <div v-if="worldEventStore.currentEvent" class="space-y-3">
          <div class="border border-success/10 rounded-xs px-2 py-2 bg-bg/10">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-xs text-success">{{ worldEventStore.currentEvent.label }}</p>
                <p class="text-[0.625rem] text-muted mt-1">{{ worldEventStore.currentEvent.scope_label }} · {{ worldEventStore.currentEvent.season_label }}</p>
              </div>
              <span class="text-[0.625rem] text-muted">{{ worldEventStore.currentEvent.progress_text }}</span>
            </div>
            <p class="text-[0.625rem] text-muted mt-2 leading-4">{{ worldEventStore.currentEvent.summary }}</p>
            <div class="mt-2 h-2 rounded-xs bg-bg overflow-hidden border border-success/10">
              <div
                class="h-full bg-success/70 transition-all"
                :style="{ width: `${worldEventStore.currentEvent.progress_percent}%` }"
              />
            </div>
            <p class="text-[0.625rem] text-muted mt-2">
              {{ worldEventStore.currentEvent.objective_label }} · {{ worldEventStore.currentEvent.progress_text }} · 完成基础回礼 {{ worldEventStore.currentEvent.reward_money_hint }} 铜钱起
            </p>
            <p v-if="worldEventStore.currentEvent.locked_reason" class="text-[0.625rem] text-warning mt-1 leading-4">{{ worldEventStore.currentEvent.locked_reason }}</p>
            <p v-else-if="worldEventStore.currentEvent.completion_text" class="text-[0.625rem] text-success mt-1 leading-4">{{ worldEventStore.currentEvent.completion_text }}</p>
          </div>

          <div v-if="worldEventStore.currentEvent.contribution_actions.length > 0" class="space-y-2">
            <p class="text-[0.625rem] text-muted">可提交贡献</p>
            <div class="space-y-2">
              <div
                v-for="action in worldEventStore.currentEvent.contribution_actions"
                :key="`${worldEventStore.currentEvent.id}-${action.id}`"
                class="border border-success/10 rounded-xs px-2 py-2 bg-bg/10"
              >
                <div class="flex items-center gap-2">
                  <Button
                    :disabled="worldEventStore.actionRunning || !action.can_use"
                    @click="contributeWorldEventAction(worldEventStore.currentEvent.id, action.id)"
                  >
                    {{ action.label }}
                  </Button>
                  <p class="text-[0.625rem] text-muted leading-4">{{ action.summary }}</p>
                </div>
                <p class="text-[0.625rem] text-muted mt-1">工钱 {{ action.cost_money }} 铜钱 · 推进 {{ action.progress_delta }} 点</p>
                <p v-if="!action.can_use && action.disabled_reason" class="text-[0.625rem] text-muted mt-1">{{ action.disabled_reason }}</p>
              </div>
            </div>
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            <div class="border border-success/10 rounded-xs px-2 py-2 bg-bg/10">
              <p class="text-xs text-success">当前贡献榜</p>
              <div v-if="worldEventStore.currentEvent.contributors.length === 0" class="text-[0.625rem] text-muted mt-2">当前还没有人提交季节贡献。</div>
              <div v-else class="space-y-1.5 mt-2">
                <p v-for="contributor in worldEventStore.currentEvent.contributors" :key="`${worldEventStore.currentEvent.id}-${contributor.username}`" class="text-[0.625rem] text-muted leading-4">
                  {{ contributor.rank }}. {{ contributor.display_name }} · {{ contributor.progress_value }} 点 · {{ contributor.action_count }} 次
                </p>
              </div>
            </div>

            <div class="border border-success/10 rounded-xs px-2 py-2 bg-bg/10">
              <p class="text-xs text-success">我的季节记录</p>
              <div v-if="!worldEventStore.currentEvent.my_contribution" class="text-[0.625rem] text-muted mt-2">你本季还没有提交贡献。</div>
              <div v-else class="space-y-1.5 mt-2">
                <p class="text-[0.625rem] text-muted">当前排名：第 {{ worldEventStore.currentEvent.my_contribution.rank }} 名</p>
                <p class="text-[0.625rem] text-muted">累计贡献：{{ worldEventStore.currentEvent.my_contribution.progress_value }} 点</p>
                <p class="text-[0.625rem] text-muted">提交次数：{{ worldEventStore.currentEvent.my_contribution.action_count }} 次</p>
                <p v-if="worldEventStore.currentEvent.my_contribution.last_action_label" class="text-[0.625rem] text-muted">最近动作：{{ worldEventStore.currentEvent.my_contribution.last_action_label }}</p>
              </div>
            </div>
          </div>
        </div>
        <p v-else class="text-xs text-muted leading-5">当前季节大事件还没有载入成功，可以刷新页面后再试。</p>
      </div>

      <div class="space-y-3">
        <div v-if="worldEventStore.publicGoal" class="border border-success/20 rounded-xs p-3 bg-bg/10">
          <p class="text-sm text-success mb-2">L92 公共目标</p>
          <p class="text-[0.625rem] text-muted leading-5">{{ worldEventStore.publicGoal.summary }}</p>
          <div class="mt-2 flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="text-xs text-text">{{ worldEventStore.publicGoal.label }}</p>
              <p class="text-[0.625rem] text-muted mt-1">{{ worldEventStore.publicGoal.progress_text }}</p>
            </div>
            <span class="text-[0.625rem] text-success">{{ worldEventStore.publicGoal.phase_reward_label }}</span>
          </div>
          <div class="mt-2 h-1.5 rounded-xs bg-bg overflow-hidden border border-success/10">
            <div class="h-full bg-success/70 transition-all" :style="{ width: `${worldEventStore.publicGoal.progress_percent}%` }" />
          </div>
          <div v-if="worldEventStore.publicGoal.milestones.length > 0" class="space-y-2 mt-3">
            <p class="text-[0.625rem] text-muted">阶段里程碑</p>
            <div class="space-y-2">
              <div v-for="milestone in worldEventStore.publicGoal.milestones" :key="milestone.id" class="border border-success/10 rounded-xs px-2 py-2 bg-bg/10">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-[0.625rem] text-text">{{ milestone.label }}</p>
                  <span class="text-[0.625rem]" :class="milestone.reached ? 'text-success' : 'text-muted'">{{ milestone.progress_text }}</span>
                </div>
                <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ milestone.summary }}</p>
                <p class="text-[0.625rem] text-muted mt-1">阶段奖励：{{ milestone.reward_label }}</p>
              </div>
            </div>
          </div>
          <div v-if="worldEventStore.publicGoal.division_awards.length > 0" class="space-y-2 mt-3">
            <p class="text-[0.625rem] text-muted">分区奖章</p>
            <div class="space-y-2">
              <div v-for="award in worldEventStore.publicGoal.division_awards" :key="award.event_id" class="border border-success/10 rounded-xs px-2 py-2 bg-bg/10">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-[0.625rem] text-text">第 {{ award.rank }} 位 · {{ award.division_label }}</p>
                  <span class="text-[0.625rem] text-success">{{ award.progress_text }}</span>
                </div>
                <p class="text-[0.625rem] text-muted mt-1">{{ award.badge_label }} · 领头贡献 {{ award.top_contributor_display_name || '待产生' }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="border border-success/20 rounded-xs p-3 bg-bg/10">
          <p class="text-sm text-success mb-2">L91 世界事件</p>
          <p v-if="worldEventStore.worldEvents.length > 0" class="text-[0.625rem] text-muted mb-2">
            当前可推进 {{ worldEventStore.currentWorldEvents.length }} 条，已载入 {{ worldEventStore.worldEvents.length }} 条作用域事件。
          </p>
          <div v-if="worldEventStore.worldEvents.length === 0" class="text-xs text-muted leading-5">当前还没有载入其它世界事件。</div>
          <div v-else class="space-y-2">
            <div v-for="event in worldEventStore.worldEvents" :key="event.id" class="border border-success/10 rounded-xs px-2 py-2 bg-bg/10">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-xs text-text">{{ event.label }}</p>
                  <p class="text-[0.625rem] text-muted mt-1">{{ event.scope_label }} · {{ event.state_label }}</p>
                </div>
                <span class="text-[0.625rem] text-success">{{ event.progress_text }}</span>
              </div>
              <p class="text-[0.625rem] text-muted mt-2 leading-4">{{ event.summary }}</p>
              <p class="text-[0.625rem] text-muted mt-1">范围：{{ event.scope_value || event.scope_label }}</p>
              <div class="mt-2 h-1.5 rounded-xs bg-bg overflow-hidden border border-success/10">
                <div class="h-full bg-success/70 transition-all" :style="{ width: `${event.progress_percent}%` }" />
              </div>
              <div class="flex flex-wrap gap-1.5 mt-2">
                <Button
                  v-for="action in event.contribution_actions"
                  :key="`${event.id}-${action.id}`"
                  :disabled="worldEventStore.actionRunning || !action.can_use"
                  @click="contributeWorldEventAction(event.id, action.id)"
                >
                  {{ action.label }}
                </Button>
              </div>
              <p v-if="event.locked_reason" class="text-[0.625rem] text-muted mt-2 leading-4">{{ event.locked_reason }}</p>
            </div>
          </div>
        </div>

        <div class="border border-success/20 rounded-xs p-3 bg-bg/10">
          <p class="text-sm text-success mb-2">最近史册</p>
          <div v-if="worldEventStore.recentAnnals.length === 0" class="text-xs text-muted leading-5">当前还没有完成并归档的四季大事件。等到某一季全服目标被推满后，这里会留下第一条世界纪年摘要。</div>
          <div v-else class="space-y-2">
            <div v-for="annal in worldEventStore.recentAnnals" :key="annal.id" class="border border-success/10 rounded-xs px-2 py-2 bg-bg/10">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-xs text-text">{{ annal.event_label }}</p>
                  <p class="text-[0.625rem] text-muted mt-1">{{ annal.season_label }} · {{ annal.cycle_key }}</p>
                </div>
                <span class="text-[0.625rem] text-success">{{ annal.contributor_count }} 人</span>
              </div>
              <p class="text-[0.625rem] text-muted mt-2 leading-4">{{ annal.summary }}</p>
              <p v-if="annal.top_contributor_display_name" class="text-[0.625rem] text-muted mt-1 leading-4">领头贡献：{{ annal.top_contributor_display_name }}</p>
            </div>
          </div>
        </div>

        <div class="border border-success/20 rounded-xs p-3 bg-bg/10">
          <p class="text-sm text-success mb-2">L93 世界纪年</p>
          <div v-if="worldEventStore.recentChronicles.length === 0" class="text-xs text-muted leading-5">当前还没有生成世界纪年摘要，随着公共目标与作用域事件持续推进，这里会开始沉淀年度村社、著名庄园与分区首个完成者。</div>
          <div v-else class="space-y-2">
            <div v-for="chronicle in worldEventStore.recentChronicles" :key="chronicle.cycle_key" class="border border-success/10 rounded-xs px-2 py-2 bg-bg/10">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-xs text-text">{{ chronicle.year }} 年 · {{ chronicle.cycle_key }}</p>
                  <p class="text-[0.625rem] text-muted mt-1">公共进度 {{ chronicle.public_goal_progress }} / {{ chronicle.public_goal_target }} · 已完成事件 {{ chronicle.total_completed_events }}</p>
                </div>
                <span class="text-[0.625rem] text-success">{{ chronicle.total_contribution_points }} 点</span>
              </div>
              <p v-if="chronicle.annual_society_champion" class="text-[0.625rem] text-muted mt-2 leading-4">
                年度冠军村社：{{ chronicle.annual_society_champion.society_name }} · 贡献 {{ chronicle.annual_society_champion.contribution_score }}
              </p>
              <p v-if="chronicle.annal_summaries.length > 0" class="text-[0.625rem] text-muted mt-1 leading-4">
                世界史册：{{ chronicle.annal_summaries[0] }}
              </p>
              <p v-if="hasDivisionFirstCompletions(chronicle)" class="text-[0.625rem] text-muted mt-1 leading-4">
                分区首个完成者：{{ formatChronicleDivisionFirsts(chronicle) }}
              </p>
              <p v-if="chronicle.famous_manors.length > 0" class="text-[0.625rem] text-muted mt-1 leading-4">
                著名庄园：{{ formatChronicleFamousManors(chronicle) }}
              </p>
            </div>
          </div>
        </div>

        <div class="border border-success/20 rounded-xs p-3 bg-bg/10">
          <p class="text-sm text-success mb-2">我的世界贡献</p>
          <p class="text-[0.625rem] text-muted">累计贡献：{{ worldEventStore.overview?.total_contribution_points || 0 }} 点</p>
          <div v-if="worldEventStore.myRecords.length === 0" class="text-xs text-muted leading-5 mt-2">当前账号还没有完成过四季大事件结算，完成后这里会保留你的季节结算与奖励摘要。</div>
          <div v-else class="space-y-2 mt-2">
            <div v-for="record in worldEventStore.myRecords.slice(0, 4)" :key="record.record_id" class="border border-success/10 rounded-xs px-2 py-2 bg-bg/10">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-xs text-text">{{ record.event_label }}</p>
                  <p class="text-[0.625rem] text-muted mt-1">{{ record.season_label }} · 第 {{ record.rank }} 名</p>
                </div>
                <span class="text-[0.625rem] text-success">+{{ record.reward_money }} 铜钱</span>
              </div>
              <p class="text-[0.625rem] text-muted mt-2 leading-4">{{ record.reward_summary }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="border border-accent/20 rounded-xs p-3 bg-bg/20">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-[0.625rem] tracking-[0.24em] text-accent/70">节会房间</p>
          <p class="text-sm text-accent mt-1">同场联机与玩法模板</p>
          <p class="text-xs text-muted mt-2 leading-5">{{ festivalRoomStore.overview?.bulletin || '先从房间底座把创建、邀请、准备、倒计时和结算流程跑通。' }}</p>
        </div>
        <Button class="shrink-0" :disabled="festivalRoomStore.loading || festivalRoomStore.actionRunning" @click="refreshOverview">
          刷新
        </Button>
      </div>
      <p v-if="festivalRoomStore.errorMessage" class="text-xs text-danger mt-3">{{ festivalRoomStore.errorMessage }}</p>
    </div>

    <div class="grid gap-3 md:grid-cols-2">
      <div class="border border-accent/20 rounded-xs p-3 bg-bg/10">
        <div class="flex items-center justify-between gap-2 mb-2">
          <p class="text-sm text-accent">创建节会房间</p>
          <span class="text-[0.625rem] text-muted">L60-L62 第一轮</span>
        </div>
        <div class="space-y-3">
          <label class="block">
            <span class="text-[0.625rem] text-muted">节会房型</span>
            <select v-model="festivalRoomStore.selectedTemplateId" class="online-select mt-1">
              <option v-for="template in festivalRoomStore.templates" :key="template.id" :value="template.id">
                {{ template.label }}
              </option>
            </select>
          </label>
          <div v-if="festivalRoomStore.selectedTemplate" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <p class="text-xs text-accent">{{ festivalRoomStore.selectedTemplate.label }}</p>
            <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ festivalRoomStore.selectedTemplate.summary }}</p>
            <p class="text-[0.625rem] text-muted mt-1">默认人数上限：{{ festivalRoomStore.selectedTemplate.default_member_limit }} 人</p>
            <p v-if="festivalRoomStore.recommendedGameplayTemplates.length > 0" class="text-[0.625rem] text-muted mt-1">
              推荐玩法：{{ festivalRoomStore.recommendedGameplayTemplates.map(template => template.label).join(' / ') }}
            </p>
          </div>
          <label class="block">
            <span class="text-[0.625rem] text-muted">玩法模板</span>
            <select v-model="festivalRoomStore.selectedGameplayTemplateId" class="online-select mt-1">
              <option v-for="template in festivalRoomStore.gameplayTemplates" :key="template.id" :value="template.id">
                {{ template.label }}
              </option>
            </select>
          </label>
          <div v-if="festivalRoomStore.selectedGameplayTemplate" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <p class="text-xs text-accent">{{ festivalRoomStore.selectedGameplayTemplate.label }}</p>
            <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ festivalRoomStore.selectedGameplayTemplate.summary }}</p>
            <p class="text-[0.625rem] text-muted mt-1">{{ festivalRoomStore.selectedGameplayTemplate.objective_label }} · 目标 {{ festivalRoomStore.selectedGameplayTemplate.default_target }}</p>
            <div v-if="festivalRoomStore.selectedGameplayTemplate.action_options.length > 0" class="flex flex-wrap gap-1.5 mt-2">
              <span
                v-for="action in festivalRoomStore.selectedGameplayTemplate.action_options"
                :key="action.id"
                class="text-[0.625rem] px-1.5 py-0.5 rounded-xs border border-accent/15 text-muted"
              >
                {{ action.label }}
              </span>
            </div>
          </div>
          <label class="block">
            <span class="text-[0.625rem] text-muted">房间标题</span>
            <input
              v-model="festivalRoomStore.draftTitle"
              maxlength="30"
              class="online-input mt-1"
              placeholder="例如：端午夜练舟"
            />
          </label>
          <Button class="online-action-btn online-action-btn--primary w-full" :disabled="festivalRoomStore.actionRunning" @click="createRoom">
            创建房间
          </Button>
        </div>
      </div>

      <div class="border border-accent/20 rounded-xs p-3 bg-bg/10">
        <div class="flex items-center justify-between gap-2 mb-2">
          <p class="text-sm text-accent">我的节会状态</p>
          <span class="text-[0.625rem] text-muted">{{ festivalRoomStore.myRoom ? festivalRoomStore.myRoom.state_label : '空闲中' }}</span>
        </div>
        <div v-if="festivalRoomStore.myRoom" class="space-y-2">
          <div class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-xs text-accent">{{ festivalRoomStore.myRoom.title }}</p>
                <p class="text-[0.625rem] text-muted mt-1">{{ festivalRoomStore.myRoom.template_label }} · {{ festivalRoomStore.myRoom.gameplay.template_label }} · {{ festivalRoomStore.myRoom.joined_member_count }}/{{ festivalRoomStore.myRoom.member_limit }} 人</p>
              </div>
              <span class="text-[0.625rem] text-muted">{{ festivalRoomStore.myRoom.state_label }}</span>
            </div>
            <p v-if="festivalRoomStore.myRoom.state_reason" class="text-[0.625rem] text-warning mt-1">{{ festivalRoomStore.myRoom.state_reason }}</p>
            <p v-if="festivalRoomStore.myRoom.opening_ceremony" class="text-[0.625rem] text-success mt-1">
              {{ festivalRoomStore.myRoom.opening_ceremony.subtitle }}
            </p>
          </div>

          <div class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-xs text-accent">{{ festivalRoomStore.myRoom.gameplay.template_label }}</p>
                <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ festivalRoomStore.myRoom.gameplay.template_summary }}</p>
              </div>
              <span class="text-[0.625rem] text-muted">{{ festivalRoomStore.myRoom.gameplay.phase_label }}</span>
            </div>
            <p class="text-[0.625rem] text-muted mt-2">{{ festivalRoomStore.myRoom.gameplay.progress_text }} · {{ festivalRoomStore.myRoom.gameplay.score_label }} {{ festivalRoomStore.myRoom.gameplay.score_value }}</p>
            <p v-if="festivalRoomStore.myRoom.gameplay.last_action_summary" class="text-[0.625rem] text-success mt-1 leading-4">
              {{ festivalRoomStore.myRoom.gameplay.last_action_summary }}
            </p>
            <div v-if="festivalRoomStore.myRoom.gameplay.contributions.length > 0" class="flex flex-wrap gap-1.5 mt-2">
              <span
                v-for="contribution in festivalRoomStore.myRoom.gameplay.contributions"
                :key="`${festivalRoomStore.myRoom.id}-${contribution.username}-gameplay`"
                class="text-[0.625rem] px-1.5 py-0.5 rounded-xs border border-accent/15 text-muted"
              >
                {{ contribution.display_name }} · {{ contribution.action_count }} 次 · {{ contribution.progress_value }} 贡献
              </span>
            </div>
          </div>

          <div v-if="festivalRoomStore.myFestivalState" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10 space-y-3">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-xs text-accent">{{ festivalRoomStore.myFestivalState.round_text }}</p>
                <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ festivalRoomStore.myFestivalState.current_event.summary }}</p>
              </div>
              <span class="text-[0.625rem] text-muted">压力 {{ festivalRoomStore.myFestivalState.pressure_text }}</span>
            </div>
            <div class="grid gap-2 md:grid-cols-2">
              <div class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
                <p class="text-[0.625rem] text-muted">当前事件</p>
                <p class="text-xs text-text mt-1">{{ festivalRoomStore.myFestivalState.current_event.label }}</p>
                <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ festivalRoomStore.myFestivalState.current_event.pressure_hint }}</p>
                <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ festivalRoomStore.myFestivalState.current_event.resource_hint }}</p>
              </div>
              <div class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
                <p class="text-[0.625rem] text-muted">我的职责</p>
                <template v-if="festivalRoomStore.myFestivalState.my_role">
                  <p class="text-xs text-text mt-1">{{ festivalRoomStore.myFestivalState.my_role.role_label }}</p>
                  <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ festivalRoomStore.myFestivalState.my_role.role_summary }}</p>
                </template>
                <p v-else class="text-[0.625rem] text-muted mt-1">加入房间后会显示本局职责。</p>
              </div>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="resource in festivalRoomStore.myFestivalState.team_resources"
                :key="`${festivalRoomStore.myRoom.id}-${resource.id}`"
                class="text-[0.625rem] px-1.5 py-0.5 rounded-xs border border-accent/15 text-muted"
              >
                {{ resource.text }}
              </span>
            </div>
            <div v-if="festivalRoomStore.myFestivalState.role_assignments.length > 0" class="flex flex-wrap gap-1.5">
              <span
                v-for="role in festivalRoomStore.myFestivalState.role_assignments"
                :key="`${festivalRoomStore.myRoom.id}-${role.username}-festival-role`"
                class="text-[0.625rem] px-1.5 py-0.5 rounded-xs border border-accent/15 text-muted"
              >
                {{ role.display_name }} · {{ role.role_label }}
              </span>
            </div>
            <p v-if="festivalRoomStore.myFestivalState.recent_feedback" class="text-[0.625rem] text-success leading-4">
              {{ festivalRoomStore.myFestivalState.recent_feedback }}
            </p>
            <div v-if="festivalRoomStore.myFestivalState.round_log.length > 0" class="space-y-1">
              <p class="text-[0.625rem] text-muted">回合记录</p>
              <p
                v-for="entry in festivalRoomStore.myFestivalState.round_log.slice(0, 4)"
                :key="entry.id"
                class="text-[0.625rem] text-muted leading-4"
              >
                - {{ entry.summary }}
              </p>
            </div>
          </div>

          <div v-if="festivalRoomStore.myRoom.gameplay.available_actions.length > 0" class="space-y-2">
            <p class="text-[0.625rem] text-muted">玩法动作</p>
            <div class="space-y-2">
              <div
                v-for="action in festivalRoomStore.myRoom.gameplay.available_actions"
                :key="`${festivalRoomStore.myRoom.id}-${action.id}`"
                class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10"
              >
                <div class="flex items-center gap-2">
                  <Button :disabled="festivalRoomStore.actionRunning || !action.can_use" @click="playGameplayAction(festivalRoomStore.myRoom.id, action.id)">
                    {{ action.label }}
                  </Button>
                  <p class="text-[0.625rem] text-muted leading-4">{{ action.summary }}</p>
                </div>
                <div class="flex flex-wrap gap-1.5 mt-2">
                  <span v-if="action.required_role_label" class="text-[0.625rem] px-1.5 py-0.5 rounded-xs border border-accent/15 text-muted">
                    {{ action.required_role_label }}
                  </span>
                  <span v-if="action.once_per_round" class="text-[0.625rem] px-1.5 py-0.5 rounded-xs border border-accent/15 text-muted">
                    每回合一次
                  </span>
                  <span v-if="action.pressure_delta_text" class="text-[0.625rem] px-1.5 py-0.5 rounded-xs border border-accent/15 text-muted">
                    {{ action.pressure_delta_text }}
                  </span>
                  <span v-if="action.resource_delta_text" class="text-[0.625rem] px-1.5 py-0.5 rounded-xs border border-accent/15 text-muted">
                    {{ action.resource_delta_text }}
                  </span>
                </div>
                <p v-if="action.round_effect" class="text-[0.625rem] text-muted mt-2 leading-4">{{ action.round_effect }}</p>
                <p v-if="!action.can_use && action.disabled_reason" class="text-[0.625rem] text-muted mt-1">{{ action.disabled_reason }}</p>
              </div>
            </div>
          </div>

          <label class="block">
            <span class="text-[0.625rem] text-muted">邀请玩家</span>
            <div class="online-action-row mt-1">
              <input
                v-model="festivalRoomStore.draftInviteUsername"
                class="online-input flex-1"
                placeholder="输入用户名"
              />
              <Button class="online-action-btn online-action-btn--primary" :disabled="festivalRoomStore.actionRunning" @click="inviteMember(festivalRoomStore.myRoom.id)">
                邀请
              </Button>
            </div>
          </label>

          <div class="grid grid-cols-2 gap-2">
            <Button v-if="festivalRoomStore.myRoom.can_host_ready_check" :disabled="festivalRoomStore.actionRunning" @click="startReadyCheck(festivalRoomStore.myRoom.id)">
              开准备
            </Button>
            <Button v-if="festivalRoomStore.myRoom.can_ready" :disabled="festivalRoomStore.actionRunning" @click="readyRoom(festivalRoomStore.myRoom.id)">
              我已准备
            </Button>
            <Button v-if="festivalRoomStore.myRoom.can_unready" :disabled="festivalRoomStore.actionRunning" @click="unreadyRoom(festivalRoomStore.myRoom.id)">
              取消准备
            </Button>
            <Button v-if="festivalRoomStore.myRoom.can_host_start_countdown" :disabled="festivalRoomStore.actionRunning" @click="startCountdown(festivalRoomStore.myRoom.id)">
              开倒计时
            </Button>
            <Button v-if="festivalRoomStore.myRoom.can_reconnect" :disabled="festivalRoomStore.actionRunning" @click="reconnectRoom(festivalRoomStore.myRoom.id)">
              恢复连接
            </Button>
            <Button v-if="festivalRoomStore.myRoom.can_host_settle" :disabled="festivalRoomStore.actionRunning" @click="settleRoom(festivalRoomStore.myRoom.id)">
              进入结算
            </Button>
            <Button v-if="festivalRoomStore.myRoom.can_host_close" :disabled="festivalRoomStore.actionRunning" @click="closeRoom(festivalRoomStore.myRoom.id)">
              {{ festivalRoomStore.myRoom.state === 'settling' ? '正式关闭' : '取消房间' }}
            </Button>
            <Button v-if="festivalRoomStore.myRoom.can_leave" :disabled="festivalRoomStore.actionRunning" @click="leaveRoom(festivalRoomStore.myRoom.id)">
              离开房间
            </Button>
          </div>
          <OnlineTechnicalDetails
            v-if="festivalRoomStore.myRoom.can_disconnect"
            title="调试操作"
            summary="用于 QA 复核网络异常恢复，默认不进入玩家主路径。"
          >
            <Button
              :disabled="festivalRoomStore.actionRunning"
              data-testid="festival-room-disconnect-submit"
              @click="disconnectRoom(festivalRoomStore.myRoom.id)"
            >
              网络异常测试
            </Button>
          </OnlineTechnicalDetails>
        </div>
        <p v-else class="text-xs text-muted leading-5">当前没有进行中的节会房间。可以先创建自己的房间，或从下方待邀列表加入别人发来的节会邀请。</p>
      </div>
    </div>

    <div v-if="festivalRoomStore.invitedRooms.length > 0" class="border border-warning/20 rounded-xs p-3 bg-warning/5">
      <p class="text-sm text-warning mb-2">待处理邀请</p>
      <div class="space-y-2">
        <div v-for="room in festivalRoomStore.invitedRooms" :key="room.id" class="border border-warning/15 rounded-xs px-2 py-2 bg-bg/10">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="text-xs text-text">{{ room.title }}</p>
              <p class="text-[0.625rem] text-muted mt-1">{{ room.template_label }} · {{ room.gameplay.template_label }} · 房主 {{ room.host_display_name }}</p>
            </div>
            <Button :disabled="festivalRoomStore.actionRunning || !room.can_join" @click="joinRoom(room.id)">
              加入
            </Button>
          </div>
        </div>
      </div>
    </div>

    <div class="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div class="border border-accent/20 rounded-xs p-3 bg-bg/10">
        <p class="text-sm text-accent mb-2">可见房间</p>
        <div v-if="festivalRoomStore.visibleRooms.length === 0" class="text-xs text-muted">当前还没有你能查看的节会房间。</div>
        <div v-else class="space-y-2">
          <div v-for="room in festivalRoomStore.visibleRooms" :key="room.id" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-xs text-accent">{{ room.title }}</p>
                <p class="text-[0.625rem] text-muted mt-1">{{ room.template_label }} · {{ room.gameplay.template_label }} · {{ room.state_label }} · {{ room.joined_member_count }}/{{ room.member_limit }} 人</p>
              </div>
              <span class="text-[0.625rem] text-muted">{{ room.ready_member_count }} 已准备</span>
            </div>
            <p class="text-[0.625rem] text-muted mt-2">{{ room.gameplay.progress_text }} · {{ room.gameplay.score_label }} {{ room.gameplay.score_value }}</p>
            <div v-if="room.members.length > 0" class="flex flex-wrap gap-1.5 mt-2">
              <span
                v-for="member in room.members"
                :key="`${room.id}-${member.username}`"
                class="text-[0.625rem] px-1.5 py-0.5 rounded-xs border border-accent/15 text-muted"
              >
                {{ member.display_name }} · {{ member.status_label }}
              </span>
            </div>
            <div v-if="room.recent_events.length > 0" class="mt-2 space-y-1">
              <p v-for="event in room.recent_events.slice(0, 3)" :key="event.id" class="text-[0.625rem] text-muted leading-4">
                - {{ event.summary }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <div class="border border-accent/20 rounded-xs p-3 bg-bg/10">
          <p class="text-sm text-accent mb-2">最近结算凭证</p>
          <div v-if="festivalRoomStore.recentReceipts.length === 0" class="text-xs text-muted leading-5">节会结算目前先生成凭证预览，用来证明房间生命周期、逐成员凭证和关闭流程已经打通。后续具体小游戏奖励会继续接到这里。</div>
          <div v-else class="space-y-2">
            <div v-for="receipt in festivalRoomStore.recentReceipts" :key="receipt.id" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-xs text-text">{{ receipt.room_title }}</p>
                  <p class="text-[0.625rem] text-muted mt-1">{{ receipt.template_label }} · 槽位 {{ receipt.target_slot + 1 }}</p>
                </div>
                <span class="text-[0.625rem] text-accent">{{ receipt.status_label }}</span>
              </div>
              <p class="text-[0.625rem] text-muted mt-2 leading-4">{{ receipt.summary }}</p>
            </div>
          </div>
        </div>

        <div class="border border-accent/20 rounded-xs p-3 bg-bg/10">
          <p class="text-sm text-accent mb-2">最近纪念册</p>
          <div v-if="festivalRoomStore.recentMemorials.length === 0" class="text-xs text-muted leading-5">节会纪念册会按最近结算顺序留档，记录你参加过哪些节会、拿到哪些奖励、和谁同场，以及这场节会的合影文案。</div>
          <div v-else class="space-y-2">
            <div v-for="memorial in festivalRoomStore.recentMemorials" :key="memorial.memorial_id" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-xs text-text">{{ memorial.label }}</p>
                  <p class="text-[0.625rem] text-muted mt-1">{{ memorial.template_label }} · {{ memorial.gameplay_template_label }}</p>
                </div>
                <span class="text-[0.625rem] text-accent">{{ memorial.photo_taken ? '已留档' : '未留影' }}</span>
              </div>
              <p class="text-[0.625rem] text-muted mt-2 leading-4">{{ memorial.reward_summary }}</p>
              <p v-if="memorial.squadmate_display_names.length > 0" class="text-[0.625rem] text-muted mt-1 leading-4">同场成员：{{ memorial.squadmate_display_names.join('、') }}</p>
              <p v-if="memorial.squadmate_friend_display_names.length > 0" class="text-[0.625rem] text-success mt-1 leading-4">同场好友：{{ memorial.squadmate_friend_display_names.join('、') }}</p>
              <p v-if="memorial.photo_line" class="text-[0.625rem] text-muted mt-1 leading-4">{{ memorial.photo_line }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import Button from '@/components/game/Button.vue'
  import OnlineTechnicalDetails from '@/components/game/online/OnlineTechnicalDetails.vue'
  import { useFestivalRoomStore } from '@/stores/useFestivalRoomStore'
  import { useWorldEventStore } from '@/stores/useWorldEventStore'
  import type { WorldEventOverview } from '@/utils/worldEventApi'

  const route = useRoute()
  const festivalRoomStore = useFestivalRoomStore()
  const worldEventStore = useWorldEventStore()

  type ChronicleSnapshot = WorldEventOverview['recent_chronicles'][number]

  const hasDivisionFirstCompletions = (chronicle: ChronicleSnapshot) =>
    Object.keys(chronicle.first_completed_divisions || {}).length > 0

  const formatChronicleDivisionFirsts = (chronicle: ChronicleSnapshot) =>
    Object.entries(chronicle.first_completed_divisions || {})
      .slice(0, 2)
      .map(([divisionLabel, entry]) => `${divisionLabel} - ${entry.top_contributor_display_name || '待记录'}`)
      .join(' / ')

  const formatChronicleFamousManors = (chronicle: ChronicleSnapshot) =>
    chronicle.famous_manors
      .map(manor => `${manor.display_name}（${manor.favorite_count} 收藏）`)
      .join('、')

  const refreshOverview = async () => {
    await festivalRoomStore.refreshOverview().catch(() => {})
    await worldEventStore.refreshOverview().catch(() => {})
  }

  const getRouteQueryText = (value: unknown) => {
    const raw = Array.isArray(value) ? value[0] : value
    return typeof raw === 'string' ? raw.trim() : ''
  }

  const applyInviteRouteDraft = () => {
    const targetUsername = getRouteQueryText(route.query.target_username)
    const targetSaveId = getRouteQueryText(route.query.target_save_id)
    if (targetUsername) festivalRoomStore.draftInviteUsername = targetUsername
    if (targetSaveId) festivalRoomStore.draftInviteSaveId = targetSaveId
  }

  const createRoom = async () => {
    await festivalRoomStore.createRoom().catch(() => {})
  }

  const contributeWorldEventAction = async (eventId: string, actionId: string) => {
    await worldEventStore.contribute(eventId, actionId).catch(() => {})
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

  const settleRoom = async (roomId: string) => {
    await festivalRoomStore.settleRoomAction(roomId).catch(() => {})
  }

  const closeRoom = async (roomId: string) => {
    await festivalRoomStore.closeRoomAction(roomId).catch(() => {})
  }

  onMounted(() => {
    applyInviteRouteDraft()
    void refreshOverview()
  })

  watch(
    () => [route.query.target_username, route.query.target_save_id],
    () => {
      applyInviteRouteDraft()
    }
  )
</script>
