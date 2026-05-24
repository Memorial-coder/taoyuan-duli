<template>
  <section class="async-community-board" data-testid="async-community-board">
    <div class="async-community-board__main">
      <div v-if="visibleProjects.length > 1" class="async-community-board__project-tabs" aria-label="公共工程列表">
        <button
          v-for="project in visibleProjects"
          :key="project.id"
          type="button"
          class="async-community-board__project-tab"
          :class="{ 'async-community-board__project-tab--selected': project.id === activeProjectId }"
          @click="selectProject(project.id)"
        >
          <Landmark :size="13" aria-hidden="true" />
          <span>{{ project.label || project.id }}</span>
        </button>
      </div>

      <div v-if="activeProject" class="async-community-board__site" role="group" aria-label="异步共建现场">
        <div class="async-community-board__site-head">
          <div class="min-w-0">
            <p class="async-community-board__title">{{ activeProject.label || activeProject.id }}</p>
            <p class="async-community-board__meta">
              {{ projectKindLabel(activeProject.kind) }} · {{ completedStageCount }}/{{ activeProject.stages.length }} 阶段
            </p>
          </div>
          <span class="async-community-board__percent">{{ activeProjectPercent }}%</span>
        </div>

        <div class="async-community-board__progress" aria-label="公共工程总进度">
          <div class="async-community-board__progress-bar" :style="{ width: `${activeProjectPercent}%` }" />
        </div>

        <div class="async-community-board__scene" :class="`async-community-board__scene--${activeProject.kind || 'project'}`">
          <div class="async-community-board__river" aria-hidden="true" />
          <div class="async-community-board__bridge-line async-community-board__bridge-line--base" aria-hidden="true" />
          <div class="async-community-board__bridge-line async-community-board__bridge-line--deck" :style="{ width: `${activeProjectPercent}%` }" aria-hidden="true" />
          <button
            v-for="marker in stageMarkers"
            :key="marker.id"
            type="button"
            class="async-community-board__stage-marker"
            :class="[
              `async-community-board__stage-marker--${marker.state}`,
              { 'async-community-board__stage-marker--current': marker.stageId === activeProject.current_stage_id },
            ]"
            :style="{ left: `${marker.x}%`, top: `${marker.y}%` }"
            :title="markerTooltip(marker)"
            @click="selectProject(activeProject.id)"
          >
            <component :is="marker.icon" :size="16" aria-hidden="true" />
            <span>{{ marker.label }}</span>
          </button>
        </div>

        <div class="async-community-board__stages" aria-label="工程阶段">
          <div
            v-for="stage in activeProject.stages"
            :key="stage.id"
            class="async-community-board__stage"
            :class="`async-community-board__stage--${stage.state}`"
          >
            <div class="async-community-board__stage-head">
              <span>{{ stage.label || stage.id }}</span>
              <span>{{ stageProgressPercent(stage) }}%</span>
            </div>
            <div class="async-community-board__stage-progress" aria-label="阶段进度">
              <div class="async-community-board__stage-progress-bar" :style="{ width: `${stageProgressPercent(stage)}%` }" />
            </div>
          </div>
        </div>
      </div>

      <div v-else class="async-community-board__empty">
        <Landmark :size="16" aria-hidden="true" />
        <span>公共工程未载入</span>
      </div>
    </div>

    <div class="async-community-board__side">
      <div v-if="activeProject" class="async-community-board__detail" data-testid="async-community-project-detail">
        <div class="async-community-board__detail-head">
          <div class="min-w-0">
            <p class="async-community-board__title">{{ currentStage?.label || '等待阶段' }}</p>
            <p class="async-community-board__meta">
              {{ currentStage ? stageStateLabel(currentStage.state) : '未开始' }} · {{ activeProject.contributors.length }} 名贡献者
            </p>
          </div>
          <span v-if="activeProject.completion_event_id" class="async-community-board__event">已完工</span>
        </div>

        <RouterLink
          v-if="completionRoomTemplateId"
          class="async-community-board__room-link"
          :to="{
            name: 'online-festival',
            query: {
              tab: 'festival-room',
              template: completionRoomTemplateId,
              gameplay: completionRoomGameplayId,
              title: completionRoomTitle,
            },
          }"
          data-testid="async-community-completion-room-link"
        >
          <Sparkles :size="14" aria-hidden="true" />
          <span>{{ completionRoomLabel }}已解锁</span>
          <small>去创建正式节会房间</small>
        </RouterLink>

        <div v-if="availableContributionOptions.length > 0" class="async-community-board__actions">
          <button
            v-for="option in availableContributionOptions"
            :key="`${activeProject.id}-${option.id}`"
            type="button"
            class="async-community-board__action"
            :disabled="actionRunning"
            :title="option.reward_preview || option.id"
            :data-testid="`online-society-async-contribute-${activeProject.id}-${option.id}`"
            @click="$emit('trigger-contribution', { projectId: activeProject.id, optionId: option.id })"
          >
            <PackagePlus :size="13" aria-hidden="true" />
            <span>{{ actionLabel(option.id, option.label) }}</span>
            <small>+{{ option.progress_delta }}</small>
          </button>
        </div>
        <p v-else class="async-community-board__empty">当前阶段暂无可提交贡献。</p>

        <div v-if="milestones.length > 0" class="async-community-board__milestones" aria-label="里程碑">
          <div
            v-for="milestone in milestones"
            :key="milestone.id"
            class="async-community-board__milestone"
            :class="{ 'async-community-board__milestone--reached': milestone.reached }"
          >
            <span>{{ milestone.label }}</span>
            <span>{{ milestone.progress_required }}</span>
          </div>
        </div>
      </div>

      <div v-if="activeProject && activeProject.contributors.length > 0" class="async-community-board__contributors" aria-label="贡献榜">
        <div
          v-for="contributor in activeProject.contributors.slice(0, 5)"
          :key="contributor.username"
          class="async-community-board__contributor"
        >
          <span class="async-community-board__rank">{{ contributor.rank }}</span>
          <span class="async-community-board__contributor-name">{{ contributor.display_name || contributor.username }}</span>
          <span class="async-community-board__contributor-value">{{ contributor.contribution_value }}</span>
        </div>
      </div>

      <div v-if="activeProject && activeProject.history.length > 0" class="async-community-board__history" aria-label="历史纪念">
        <div
          v-for="entry in activeProject.history.slice(0, 5)"
          :key="entry.id"
          class="async-community-board__history-entry"
        >
          <Clock3 :size="12" aria-hidden="true" />
          <span>{{ entry.summary }}</span>
        </div>
      </div>

      <p v-if="recentFeedback" class="async-community-board__feedback">{{ recentFeedback }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { Clock3, Construction, Flag, Hammer, Landmark, Music2, PackagePlus, ScrollText, Sparkles, Tent, Utensils } from 'lucide-vue-next'
  import type { Component } from 'vue'
  import type {
    OnlineVisualAsyncMilestone,
    OnlineVisualAsyncProject,
    OnlineVisualAsyncStage,
    OnlineVisualAsyncStageState,
  } from '@/types/onlineVisual'

  interface StageMarker {
    id: string
    stageId: string
    label: string
    state: OnlineVisualAsyncStageState
    x: number
    y: number
    icon: Component
  }

  const props = withDefaults(defineProps<{
    projects: OnlineVisualAsyncProject[]
    selectedProjectId?: string
    recentFeedback?: string
    actionRunning?: boolean
    actionLabels?: Record<string, string>
  }>(), {
    selectedProjectId: '',
    recentFeedback: '',
    actionRunning: false,
    actionLabels: () => ({}),
  })

  const emit = defineEmits<{
    (event: 'select-project', projectId: string): void
    (event: 'trigger-contribution', payload: { projectId: string, optionId: string }): void
  }>()

  const visibleProjects = computed(() => props.projects.filter(project => project.stages.length > 0))
  const projectById = computed(() => new Map(visibleProjects.value.map(project => [project.id, project])))
  const activeProjectId = computed(() => {
    if (props.selectedProjectId && projectById.value.has(props.selectedProjectId)) return props.selectedProjectId
    return visibleProjects.value.find(project => !project.completion_event_id)?.id || visibleProjects.value[0]?.id || ''
  })
  const activeProject = computed(() => projectById.value.get(activeProjectId.value) || null)
  const currentStage = computed(() => {
    const project = activeProject.value
    if (!project) return null
    return project.stages.find(stage => stage.id === project.current_stage_id)
      || project.stages.find(stage => stage.state === 'active')
      || project.stages.find(stage => stage.state !== 'complete')
      || project.stages[project.stages.length - 1]
      || null
  })
  const activeProjectProgress = computed(() => {
    const project = activeProject.value
    if (!project) return { value: 0, target: 1 }
    return project.stages.reduce((result, stage) => ({
      value: result.value + Math.max(0, stage.progress_value),
      target: result.target + Math.max(0, stage.progress_target),
    }), { value: 0, target: 0 })
  })
  const activeProjectPercent = computed(() => {
    const progress = activeProjectProgress.value
    if (progress.target <= 0) return 0
    return Math.min(100, Math.round((progress.value / progress.target) * 100))
  })
  const completedStageCount = computed(() => activeProject.value?.stages.filter(stage => stage.state === 'complete').length ?? 0)
  const availableContributionOptions = computed(() => currentStage.value?.contribution_options ?? [])
  const completionRoomTemplateId = computed(() => {
    const project = activeProject.value
    if (!project?.completion_event_id) return ''
    return project.completion_room_template_id || ''
  })
  const completionRoomGameplayId = computed(() => {
    if (completionRoomTemplateId.value === 'lantern_fair') return 'assembly'
    return ''
  })
  const completionRoomLabel = computed(() => {
    if (completionRoomTemplateId.value === 'lantern_fair') return '上元灯会房间'
    return completionRoomTemplateId.value.split('_').filter(Boolean).join(' ') || '节会房间'
  })
  const completionRoomTitle = computed(() => {
    if (completionRoomTemplateId.value === 'lantern_fair') return '节庆广场开幕'
    return `${activeProject.value?.label || '公共工程'}庆典`
  })
  const milestones = computed<OnlineVisualAsyncMilestone[]>(() => {
    const stage = currentStage.value || activeProject.value?.stages[0]
    return stage?.milestones ?? []
  })
  const stageMarkers = computed<StageMarker[]>(() => {
    const project = activeProject.value
    if (!project) return []
    return project.stages.flatMap((stage, stageIndex) => {
      const stageBaseX = stageX(stageIndex, project.stages.length)
      const objectIds = stage.object_ids.length > 0 ? stage.object_ids : [stage.id]
      return objectIds.map((objectId, objectIndex) => ({
        id: `${stage.id}-${objectId}`,
        stageId: stage.id,
        label: markerLabel(objectId, stage.label),
        state: stage.state,
        x: clampPercent(stageBaseX + (objectIndex - (objectIds.length - 1) / 2) * 4),
        y: objectY(objectId, objectIndex),
        icon: markerIcon(objectId, stage.state),
      }))
    })
  })

  const selectProject = (projectId: string) => {
    emit('select-project', projectId)
  }

  const clampPercent = (value: number) => Math.max(8, Math.min(92, value))
  const stageX = (index: number, total: number) => {
    if (total <= 1) return 50
    return 16 + (68 * index) / Math.max(1, total - 1)
  }
  const objectY = (objectId: string, objectIndex: number) => {
    if (objectId.includes('lantern_wall_wish') || objectId.includes('friend_note') || objectId.includes('friend_message')) return 34 + objectIndex * 2
    if (objectId.includes('lantern_wall_hang') || objectId.includes('lantern_wall_gift')) return 28 + objectIndex * 3
    if (objectId.includes('lantern_wall_repair')) return 58 + objectIndex * 2
    if (objectId.includes('lantern_wall_memorial') || objectId.includes('lantern_wall_archive')) return 43 + objectIndex * 2
    if (objectId.includes('lantern_wall')) return 50 + objectIndex * 2
    if (objectId.includes('festival_food') || objectId.includes('snack')) return 68 + objectIndex * 2
    if (objectId.includes('festival_stage') || objectId.includes('scene')) return 52
    if (objectId.includes('riddle') || objectId.includes('tag')) return 39 + objectIndex * 2
    if (objectId.includes('program') || objectId.includes('rehearsal') || objectId.includes('drum')) return 45 + objectIndex * 2
    if (objectId.includes('festival_lantern') || objectId.includes('opening') || objectId.includes('crowd') || objectId.includes('photo')) return 27 + objectIndex * 3
    if (objectId.includes('festival_empty') || objectId.includes('festival_material')) return 62 + objectIndex * 2
    if (objectId.includes('lantern') || objectId.includes('memorial')) return 27 + objectIndex * 3
    if (objectId.includes('railing')) return 43
    if (objectId.includes('deck') || objectId.includes('structure')) return 55
    if (objectId.includes('pile') || objectId.includes('scaffold')) return 66
    return 58
  }
  const markerIcon = (objectId: string, state: OnlineVisualAsyncStageState): Component => {
    if (objectId.includes('lantern_wall_wish') || objectId.includes('friend_note') || objectId.includes('friend_message')) return ScrollText
    if (objectId.includes('lantern_wall_hang') || objectId.includes('lantern_wall_gift')) return Sparkles
    if (objectId.includes('lantern_wall_repair')) return Hammer
    if (objectId.includes('lantern_wall_memorial') || objectId.includes('lantern_wall_archive')) return Landmark
    if (objectId.includes('festival_food') || objectId.includes('snack')) return Utensils
    if (objectId.includes('riddle') || objectId.includes('tag')) return ScrollText
    if (objectId.includes('program') || objectId.includes('rehearsal') || objectId.includes('drum')) return Music2
    if (objectId.includes('festival_lantern') || objectId.includes('opening') || objectId.includes('crowd') || objectId.includes('photo')) return Sparkles
    if (state === 'complete') return Flag
    if (objectId.includes('scaffold') || objectId.includes('pile')) return Construction
    if (objectId.includes('lantern') || objectId.includes('memorial')) return Landmark
    if (objectId.includes('deck') || objectId.includes('structure')) return Hammer
    return Tent
  }
  const markerLabel = (objectId: string, fallback: string) => {
    if (objectId.includes('lantern_wall_blank')) return '墙面'
    if (objectId.includes('lantern_wall_wish_tags')) return '愿望签'
    if (objectId.includes('lantern_wall_wish')) return '愿望'
    if (objectId.includes('lantern_wall_friend_messages')) return '好友留言'
    if (objectId.includes('lantern_wall_friend_note')) return '留言'
    if (objectId.includes('lantern_wall_frame')) return '灯架'
    if (objectId.includes('lantern_wall_hung')) return '挂灯'
    if (objectId.includes('lantern_wall_hanging')) return '灯线'
    if (objectId.includes('lantern_wall_repaired')) return '修灯'
    if (objectId.includes('lantern_wall_repair')) return '修灯台'
    if (objectId.includes('lantern_wall_gift')) return '赠灯'
    if (objectId.includes('lantern_wall_memorial')) return '纪念墙'
    if (objectId.includes('lantern_wall_archive')) return '愿望册'
    if (objectId.includes('lantern_wall')) return '花灯墙'
    if (objectId.includes('festival_empty')) return '空场'
    if (objectId.includes('festival_material')) return '备料'
    if (objectId.includes('festival_lantern_crates')) return '灯笼'
    if (objectId.includes('festival_food_table')) return '食案'
    if (objectId.includes('festival_stage')) return '戏台'
    if (objectId.includes('festival_lantern_gate')) return '灯门'
    if (objectId.includes('festival_scene')) return '布景'
    if (objectId.includes('festival_program')) return '节目'
    if (objectId.includes('festival_riddle')) return '题签'
    if (objectId.includes('festival_rehearsal')) return '彩排'
    if (objectId.includes('festival_crowd')) return '人气'
    if (objectId.includes('festival_photo')) return '留影'
    if (objectId.includes('festival_snack')) return '小食'
    if (objectId.includes('festival_opening')) return '开幕'
    if (objectId.includes('order_confirmed')) return '确认'
    if (objectId.includes('order_submitted')) return '交付'
    if (objectId.includes('order_carrier')) return '接力'
    if (objectId.includes('order_waiting')) return '待接'
    if (objectId.includes('order_item_')) return '资源'
    if (objectId.includes('order_task_')) return '任务'
    if (objectId.includes('order_stage_')) return '节点'
    if (objectId.includes('pile')) return '木桩'
    if (objectId.includes('scaffold')) return '脚手'
    if (objectId.includes('deck')) return '桥面'
    if (objectId.includes('railing')) return '栏杆'
    if (objectId.includes('lantern')) return '桥灯'
    if (objectId.includes('memorial')) return '碑记'
    if (objectId.includes('material')) return '料场'
    if (objectId.includes('structure')) return '主体'
    if (objectId.includes('finish')) return '收尾'
    return fallback || objectId
  }
  const stageStateLabel = (state: OnlineVisualAsyncStageState) => ({
    locked: '未开放',
    pending: '待推进',
    active: '进行中',
    complete: '已完成',
  }[state] || state)
  const projectKindLabel = (kind: string) => {
    if (kind === 'village_bridge') return '村社修桥'
    if (kind === 'festival_square') return '节庆筹备'
    if (kind === 'lantern_wall') return '花灯墙'
    if (kind === 'order_relay') return '公共订单接力'
    if (kind === 'society_project') return '公共工程'
    return kind || '公共工程'
  }
  const stageProgressPercent = (stage: OnlineVisualAsyncStage) => {
    if (stage.progress_target <= 0) return stage.state === 'complete' ? 100 : 0
    return Math.min(100, Math.round((Math.max(0, stage.progress_value) / stage.progress_target) * 100))
  }
  const markerTooltip = (marker: StageMarker) => `${marker.label} · ${stageStateLabel(marker.state)}`
  const actionLabel = (actionId: string, fallback: string) => props.actionLabels[actionId] || fallback || actionId.split('_').join(' ')
</script>

<style scoped>
  .async-community-board {
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(14rem, 0.85fr);
    gap: 0.75rem;
    border: 1px solid color-mix(in srgb, var(--color-accent) 16%, transparent);
    background: rgb(var(--color-bg) / 0.16);
    padding: 0.75rem;
  }

  .async-community-board__main,
  .async-community-board__side {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 0.5rem;
  }

  .async-community-board__project-tabs {
    display: flex;
    gap: 0.4rem;
    overflow-x: auto;
    padding-bottom: 0.1rem;
  }

  .async-community-board__project-tab {
    display: inline-flex;
    min-height: 2rem;
    flex: 0 0 auto;
    align-items: center;
    gap: 0.3rem;
    border: 1px solid color-mix(in srgb, var(--color-accent) 18%, transparent);
    background: rgb(0 0 0 / 0.1);
    color: var(--color-muted);
    padding: 0.35rem 0.55rem;
    font-size: 0.7rem;
    line-height: 1.1;
  }

  .async-community-board__project-tab--selected {
    border-color: color-mix(in srgb, var(--color-accent) 68%, transparent);
    color: rgb(var(--color-text));
  }

  .async-community-board__site,
  .async-community-board__detail,
  .async-community-board__empty,
  .async-community-board__feedback,
  .async-community-board__contributors,
  .async-community-board__history {
    border: 1px solid color-mix(in srgb, var(--color-accent) 12%, transparent);
    background: rgb(0 0 0 / 0.1);
    padding: 0.625rem;
  }

  .async-community-board__site-head,
  .async-community-board__detail-head,
  .async-community-board__stage-head,
  .async-community-board__contributor,
  .async-community-board__milestone {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .async-community-board__title {
    min-width: 0;
    overflow: hidden;
    color: var(--color-accent);
    font-size: 0.82rem;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .async-community-board__meta,
  .async-community-board__percent,
  .async-community-board__event,
  .async-community-board__feedback,
  .async-community-board__empty,
  .async-community-board__stage,
  .async-community-board__milestone,
  .async-community-board__history-entry {
    color: var(--color-muted);
    font-size: 0.68rem;
    line-height: 1.45;
  }

  .async-community-board__percent,
  .async-community-board__event {
    flex-shrink: 0;
  }

  .async-community-board__room-link {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.1rem 0.45rem;
    align-items: center;
    border: 1px solid color-mix(in srgb, var(--color-success) 28%, transparent);
    background: color-mix(in srgb, var(--color-success) 12%, transparent);
    color: rgb(var(--color-text));
    margin: 0.5rem 0;
    padding: 0.5rem;
    text-decoration: none;
  }

  .async-community-board__room-link span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .async-community-board__room-link small {
    grid-column: 2;
    color: var(--color-muted);
    font-size: 0.625rem;
    line-height: 1rem;
  }

  .async-community-board__progress,
  .async-community-board__stage-progress {
    height: 0.45rem;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--color-accent) 16%, transparent);
    background: rgb(0 0 0 / 0.16);
  }

  .async-community-board__progress {
    margin-top: 0.625rem;
  }

  .async-community-board__progress-bar,
  .async-community-board__stage-progress-bar {
    height: 100%;
    background: color-mix(in srgb, var(--color-success) 64%, var(--color-accent));
    transition: width 0.18s ease;
  }

  .async-community-board__scene {
    position: relative;
    min-height: 17rem;
    margin-top: 0.625rem;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--color-accent) 12%, transparent);
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--color-success) 8%, transparent), transparent 48%),
      linear-gradient(90deg, rgb(0 0 0 / 0.1), transparent 32%, rgb(0 0 0 / 0.12)),
      rgb(0 0 0 / 0.12);
  }

  .async-community-board__scene--festival_square {
    background:
      radial-gradient(circle at 50% 24%, color-mix(in srgb, #d4976a 18%, transparent), transparent 30%),
      linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 12%, transparent), transparent 48%),
      linear-gradient(90deg, rgb(0 0 0 / 0.08), transparent 42%, rgb(0 0 0 / 0.1)),
      rgb(0 0 0 / 0.12);
  }

  .async-community-board__scene--lantern_wall {
    background:
      radial-gradient(circle at 32% 24%, color-mix(in srgb, #f5c56e 18%, transparent), transparent 24%),
      radial-gradient(circle at 70% 30%, color-mix(in srgb, #e46b88 14%, transparent), transparent 22%),
      linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 10%, transparent), transparent 50%),
      linear-gradient(90deg, rgb(0 0 0 / 0.09), transparent 46%, rgb(0 0 0 / 0.13)),
      rgb(0 0 0 / 0.13);
  }

  .async-community-board__river {
    position: absolute;
    right: -8%;
    bottom: 5%;
    left: -8%;
    height: 36%;
    border-top: 1px solid color-mix(in srgb, var(--color-accent) 18%, transparent);
    background:
      linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-accent) 12%, transparent), transparent),
      rgb(var(--color-bg) / 0.32);
    transform: skewY(-3deg);
  }

  .async-community-board__scene--festival_square .async-community-board__river {
    top: 58%;
    bottom: auto;
    height: 28%;
    border-top: 1px solid color-mix(in srgb, #d4976a 28%, transparent);
    border-bottom: 1px solid color-mix(in srgb, var(--color-accent) 18%, transparent);
    background:
      linear-gradient(90deg, rgb(0 0 0 / 0.08), color-mix(in srgb, #d4976a 13%, transparent), rgb(0 0 0 / 0.1)),
      repeating-linear-gradient(90deg, transparent 0 11%, rgb(255 255 255 / 0.04) 11% 12%);
    transform: none;
  }

  .async-community-board__scene--lantern_wall .async-community-board__river {
    top: 63%;
    bottom: auto;
    height: 22%;
    border-top: 1px solid color-mix(in srgb, #f5c56e 24%, transparent);
    border-bottom: 1px solid color-mix(in srgb, #e46b88 18%, transparent);
    background:
      repeating-linear-gradient(90deg, transparent 0 7%, rgb(255 255 255 / 0.05) 7% 8%),
      linear-gradient(90deg, rgb(0 0 0 / 0.08), color-mix(in srgb, #f5c56e 13%, transparent), rgb(0 0 0 / 0.1));
    transform: none;
  }

  .async-community-board__bridge-line {
    position: absolute;
    left: 10%;
    top: 56%;
    height: 0.7rem;
    border: 1px solid color-mix(in srgb, var(--color-accent) 22%, transparent);
    transform: translateY(-50%) rotate(-2deg);
  }

  .async-community-board__scene--festival_square .async-community-board__bridge-line {
    top: 55%;
    height: 0.45rem;
    border-color: color-mix(in srgb, #d4976a 34%, transparent);
    transform: translateY(-50%);
  }

  .async-community-board__scene--lantern_wall .async-community-board__bridge-line {
    top: 44%;
    height: 0.55rem;
    border-color: color-mix(in srgb, #f5c56e 38%, transparent);
    transform: translateY(-50%);
  }

  .async-community-board__bridge-line--base {
    width: 80%;
    background: rgb(0 0 0 / 0.16);
  }

  .async-community-board__bridge-line--deck {
    max-width: 80%;
    background: color-mix(in srgb, var(--color-success) 35%, var(--color-accent));
  }

  .async-community-board__scene--festival_square .async-community-board__bridge-line--base {
    background: rgb(0 0 0 / 0.12);
  }

  .async-community-board__scene--lantern_wall .async-community-board__bridge-line--base {
    background:
      repeating-linear-gradient(90deg, rgb(255 255 255 / 0.04) 0 6%, transparent 6% 8%),
      rgb(0 0 0 / 0.14);
  }

  .async-community-board__scene--festival_square .async-community-board__bridge-line--deck {
    background: linear-gradient(90deg, color-mix(in srgb, #d4976a 42%, var(--color-accent)), color-mix(in srgb, var(--color-success) 42%, #d4976a));
  }

  .async-community-board__scene--lantern_wall .async-community-board__bridge-line--deck {
    background: linear-gradient(90deg, color-mix(in srgb, #f5c56e 48%, var(--color-accent)), color-mix(in srgb, #e46b88 34%, var(--color-success)));
  }

  .async-community-board__stage-marker {
    position: absolute;
    z-index: 1;
    display: inline-grid;
    min-width: 3.4rem;
    min-height: 2.55rem;
    translate: -50% -50%;
    place-items: center;
    gap: 0.15rem;
    border: 1px solid color-mix(in srgb, var(--color-accent) 30%, transparent);
    background: rgb(var(--color-bg) / 0.9);
    color: rgb(var(--color-text));
    padding: 0.35rem 0.45rem;
    font-size: 0.66rem;
    line-height: 1;
    text-align: center;
    transition: border-color 0.16s ease, background 0.16s ease, transform 0.16s ease;
  }

  .async-community-board__stage-marker:hover,
  .async-community-board__stage-marker:focus-visible {
    border-color: color-mix(in srgb, var(--color-accent) 78%, transparent);
    transform: translateY(-1px);
    outline: none;
  }

  .async-community-board__stage-marker--pending {
    color: var(--color-muted);
  }

  .async-community-board__stage-marker--active,
  .async-community-board__stage-marker--current {
    border-color: color-mix(in srgb, #d4976a 74%, transparent);
    color: #d4976a;
  }

  .async-community-board__stage-marker--complete {
    border-color: color-mix(in srgb, var(--color-success) 72%, transparent);
    color: var(--color-success);
  }

  .async-community-board__stages,
  .async-community-board__actions,
  .async-community-board__milestones,
  .async-community-board__contributors,
  .async-community-board__history {
    display: grid;
    gap: 0.5rem;
  }

  .async-community-board__stages {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    margin-top: 0.625rem;
  }

  .async-community-board__stage {
    border: 1px solid color-mix(in srgb, var(--color-accent) 10%, transparent);
    background: rgb(0 0 0 / 0.08);
    padding: 0.45rem;
  }

  .async-community-board__stage--active {
    border-color: color-mix(in srgb, #d4976a 52%, transparent);
  }

  .async-community-board__stage--complete {
    border-color: color-mix(in srgb, var(--color-success) 45%, transparent);
  }

  .async-community-board__stage-head {
    align-items: center;
    margin-bottom: 0.35rem;
  }

  .async-community-board__action {
    display: grid;
    min-height: 2.15rem;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.35rem;
    border: 1px solid color-mix(in srgb, var(--color-accent) 28%, transparent);
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    color: rgb(var(--color-text));
    padding: 0.35rem 0.55rem;
    font-size: 0.7rem;
    line-height: 1.1;
    text-align: left;
  }

  .async-community-board__action span,
  .async-community-board__contributor-name,
  .async-community-board__history-entry span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .async-community-board__action small,
  .async-community-board__rank,
  .async-community-board__contributor-value {
    flex-shrink: 0;
    color: var(--color-accent);
    font-size: 0.66rem;
  }

  .async-community-board__action:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .async-community-board__milestone,
  .async-community-board__contributor,
  .async-community-board__history-entry {
    align-items: center;
    border: 1px solid color-mix(in srgb, var(--color-accent) 10%, transparent);
    background: transparent;
    padding: 0.35rem 0.45rem;
  }

  .async-community-board__milestone--reached,
  .async-community-board__rank {
    color: var(--color-success);
  }

  .async-community-board__rank {
    display: inline-flex;
    width: 1.25rem;
    height: 1.25rem;
    align-items: center;
    justify-content: center;
    border: 1px solid color-mix(in srgb, var(--color-success) 45%, transparent);
    font-size: 0.66rem;
  }

  .async-community-board__contributor-name {
    flex: 1;
    color: rgb(var(--color-text));
    font-size: 0.7rem;
  }

  .async-community-board__history-entry {
    display: flex;
    justify-content: flex-start;
  }

  .async-community-board__empty {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  @media (max-width: 900px) {
    .async-community-board {
      grid-template-columns: 1fr;
    }

    .async-community-board__stages {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 560px) {
    .async-community-board__scene {
      min-height: 15rem;
      overflow-x: auto;
    }

    .async-community-board__stages {
      grid-template-columns: 1fr;
    }
  }
</style>
