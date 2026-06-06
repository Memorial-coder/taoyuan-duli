<template>
  <section class="visual-track-board" data-testid="visual-track-board">
    <div class="visual-track-board__main">
      <div v-if="visibleTracks.length > 1" class="visual-track-board__track-tabs" aria-label="赛道列表">
        <button
          v-for="track in visibleTracks"
          :key="track.id"
          type="button"
          class="visual-track-board__track-tab"
          :class="{ 'visual-track-board__track-tab--selected': track.id === activeTrackId }"
          @click="selectTrack(track.id)"
        >
          <Flag :size="13" aria-hidden="true" />
          <span>{{ track.label || track.id }}</span>
        </button>
      </div>

      <div
        v-if="activeTrack"
        class="visual-track-board__river"
        role="group"
        aria-label="可视化赛道滚动区"
        data-testid="visual-track-scroll-lane"
      >
        <div class="visual-track-board__river-head">
          <div class="min-w-0">
            <p class="visual-track-board__title">{{ activeTrack.label || activeTrack.id }}</p>
            <p class="visual-track-board__meta">{{ activeTrack.kind || 'track' }} · 第 {{ activeTrack.current_round + 1 }} 回合</p>
          </div>
          <span class="visual-track-board__length">{{ activeCells.length }} / {{ activeTrack.length || activeCells.length }} 格</span>
        </div>

        <div class="visual-track-board__cells" :style="trackGridStyle" data-testid="visual-track-cell-grid">
          <button
            v-for="cell in activeCells"
            :key="cell.id"
            type="button"
            class="visual-track-board__cell"
            :class="[
              `visual-track-board__cell--${cell.kind}`,
              { 'visual-track-board__cell--selected': cell.id === activeCellId },
            ]"
            :data-testid="`visual-track-cell-${cell.id}`"
            :title="cellTooltip(cell)"
            @click="selectCell(activeTrack.id, cell.id)"
          >
            <span class="visual-track-board__cell-index">{{ cell.index + 1 }}</span>
            <component :is="cellIcon(cell)" :size="16" aria-hidden="true" />
            <span class="visual-track-board__cell-label">{{ cell.label || kindLabel(cell.kind) }}</span>
            <span v-if="cell.effect_ids.length > 0" class="visual-track-board__cell-effect">
              {{ effectLabels(cell.effect_ids).join(' / ') }}
            </span>
            <span v-if="teamsForCell(cell).length > 0" class="visual-track-board__markers" aria-label="队伍标记">
              <span
                v-for="team in teamsForCell(cell)"
                :key="`${cell.id}-${team.team_id}`"
                class="visual-track-board__marker"
                :class="`visual-track-board__marker--${team.state}`"
                :title="teamTooltip(team)"
              >
                {{ team.marker || team.label.slice(0, 1) || team.team_id.slice(0, 1) }}
              </span>
            </span>
          </button>
        </div>
      </div>

      <div v-else class="visual-track-board__empty">
        <Flag :size="16" aria-hidden="true" />
        <span>赛道未载入</span>
      </div>
    </div>

    <div class="visual-track-board__side" data-testid="visual-track-side-panel">
      <template v-if="!isCompactViewport">
        <div v-if="selectedCell && activeTrack" class="visual-track-board__detail" data-testid="visual-track-cell-detail">
          <div class="visual-track-board__detail-head">
            <div class="min-w-0">
              <p class="visual-track-board__title">{{ selectedCell.label || kindLabel(selectedCell.kind) }}</p>
              <p class="visual-track-board__meta">第 {{ selectedCell.index + 1 }} 格 · {{ kindLabel(selectedCell.kind) }}</p>
            </div>
            <span v-if="selectedCell.event_id" class="visual-track-board__event">{{ selectedCell.event_id }}</span>
          </div>

          <div v-if="selectedCell.risk_preview || selectedCell.reward_preview" class="visual-track-board__preview-grid">
            <p v-if="selectedCell.risk_preview" class="visual-track-board__preview visual-track-board__preview--risk">
              {{ selectedCell.risk_preview }}
            </p>
            <p v-if="selectedCell.reward_preview" class="visual-track-board__preview visual-track-board__preview--reward">
              {{ selectedCell.reward_preview }}
            </p>
          </div>

          <div v-if="selectedCell.effect_ids.length > 0" class="visual-track-board__effects">
            <span
              v-for="effectId in selectedCell.effect_ids"
              :key="`${selectedCell.id}-${effectId}`"
              class="visual-track-board__effect"
            >
              {{ effectLabel(effectId) }}
            </span>
          </div>

          <div
            v-if="selectedCellFailureReason || selectedCellImpactText"
            class="visual-track-board__readable-feedback"
            data-testid="visual-track-readable-feedback"
          >
            <p v-if="selectedCellFailureReason" class="visual-track-board__readable-line visual-track-board__readable-line--warning">
              失败原因：{{ selectedCellFailureReason }}
            </p>
            <p v-if="selectedCellImpactText" class="visual-track-board__readable-line">
              影响范围：{{ selectedCellImpactText }}
            </p>
          </div>

          <OnlineTechnicalDetails
            v-if="selectedCellTechnicalReason"
            class="visual-track-board__technical-details"
            title="规则细节"
            summary="展开查看赛道格、队伍占位和可行动作判断。"
          >
            <p data-testid="visual-track-technical-reason">{{ selectedCellTechnicalReason }}</p>
          </OnlineTechnicalDetails>

          <div
            v-if="selectedCell.available_action_ids.length > 0"
            class="visual-track-board__actions"
            data-testid="visual-track-action-panel"
          >
            <button
              v-for="actionId in selectedCell.available_action_ids"
              :key="`${selectedCell.id}-${actionId}`"
              type="button"
              class="visual-track-board__action"
              :data-testid="`visual-track-action-${actionId}`"
              :disabled="actionRunning"
              :title="actionId"
              @click="$emit('trigger-action', { trackId: activeTrack.id, cellId: selectedCell.id, actionId })"
            >
              <Play :size="13" aria-hidden="true" />
              <span>{{ actionLabel(actionId) }}</span>
            </button>
          </div>
        </div>

        <div v-else class="visual-track-board__empty">
          <Circle :size="16" aria-hidden="true" />
          <span>选择赛道格</span>
        </div>
      </template>

      <template v-else>
        <button
          v-if="selectedCell && activeTrack"
          type="button"
          class="visual-track-board__mobile-detail-trigger"
          data-testid="visual-track-detail-sheet-trigger"
          @click="openDetailSheet"
        >
          <span>已选择 {{ selectedCell.label || kindLabel(selectedCell.kind) }}</span>
          <small>{{ selectedCell.available_action_ids.length > 0 ? '查看详情和行动' : '查看详情' }}</small>
        </button>

        <div v-else class="visual-track-board__empty">
          <Circle :size="16" aria-hidden="true" />
          <span>选择赛道格</span>
        </div>
      </template>

      <div
        v-if="activeTrack && activeTrack.teams.length > 0"
        class="visual-track-board__teams"
        aria-label="队伍位置"
        data-testid="visual-track-team-standings"
      >
        <div
          v-for="(team, teamIndex) in sortedTeams"
          :key="team.team_id"
          class="visual-track-board__team"
          :data-testid="`visual-track-team-row-${team.team_id}`"
        >
          <span class="visual-track-board__team-marker" :class="`visual-track-board__marker--${team.state}`">
            {{ team.marker || team.label.slice(0, 1) || team.team_id.slice(0, 1) }}
          </span>
          <span class="visual-track-board__team-rank">第 {{ teamIndex + 1 }} 名</span>
          <span class="visual-track-board__team-name">{{ team.label || team.team_id }}</span>
          <span class="visual-track-board__team-state">
            {{ teamStateLabel(team.state) }} · {{ team.last_action_id ? actionLabel(team.last_action_id) : '未行动' }} · {{ team.position_index + 1 }} 格
          </span>
        </div>
      </div>

      <p
        v-if="recentFeedback && !isCompactViewport"
        class="visual-track-board__feedback"
        data-testid="visual-track-action-result"
        aria-live="polite"
      >
        行动结果：{{ recentFeedback }}
      </p>

      <p
        v-if="recentFeedback && isCompactViewport"
        class="visual-track-board__feedback"
        data-testid="visual-track-mobile-action-result"
        aria-live="polite"
      >
        行动结果：{{ recentFeedback }}
      </p>
    </div>

    <OnlineBottomSheet
      v-if="selectedCell && activeTrack && isCompactViewport"
      :open="detailSheetOpen"
      :title="selectedCell.label || kindLabel(selectedCell.kind)"
      :description="`${activeTrack.label || activeTrack.id} · 第 ${selectedCell.index + 1} 格`"
      side="bottom"
      initial-focus=".visual-track-board__action"
      @close="closeDetailSheet"
    >
      <div class="visual-track-board__detail visual-track-board__detail--sheet" data-testid="visual-track-cell-detail">
        <div class="visual-track-board__detail-head">
          <div class="min-w-0">
            <p class="visual-track-board__title">{{ selectedCell.label || kindLabel(selectedCell.kind) }}</p>
            <p class="visual-track-board__meta">第 {{ selectedCell.index + 1 }} 格 · {{ kindLabel(selectedCell.kind) }}</p>
          </div>
          <span v-if="selectedCell.event_id" class="visual-track-board__event">{{ selectedCell.event_id }}</span>
        </div>

        <div v-if="selectedCell.risk_preview || selectedCell.reward_preview" class="visual-track-board__preview-grid">
          <p v-if="selectedCell.risk_preview" class="visual-track-board__preview visual-track-board__preview--risk">
            {{ selectedCell.risk_preview }}
          </p>
          <p v-if="selectedCell.reward_preview" class="visual-track-board__preview visual-track-board__preview--reward">
            {{ selectedCell.reward_preview }}
          </p>
        </div>

        <div v-if="selectedCell.effect_ids.length > 0" class="visual-track-board__effects">
          <span
            v-for="effectId in selectedCell.effect_ids"
            :key="`${selectedCell.id}-${effectId}`"
            class="visual-track-board__effect"
          >
            {{ effectLabel(effectId) }}
          </span>
        </div>

        <div
          v-if="selectedCellFailureReason || selectedCellImpactText"
          class="visual-track-board__readable-feedback"
          data-testid="visual-track-readable-feedback"
        >
          <p v-if="selectedCellFailureReason" class="visual-track-board__readable-line visual-track-board__readable-line--warning">
            失败原因：{{ selectedCellFailureReason }}
          </p>
          <p v-if="selectedCellImpactText" class="visual-track-board__readable-line">
            影响范围：{{ selectedCellImpactText }}
          </p>
        </div>

        <OnlineTechnicalDetails
          v-if="selectedCellTechnicalReason"
          class="visual-track-board__technical-details"
          title="规则细节"
          summary="展开查看赛道格、队伍占位和可行动作判断。"
        >
          <p data-testid="visual-track-technical-reason">{{ selectedCellTechnicalReason }}</p>
        </OnlineTechnicalDetails>

        <div
          v-if="selectedCell.available_action_ids.length > 0"
          class="visual-track-board__actions"
          data-testid="visual-track-action-panel"
        >
          <button
            v-for="actionId in selectedCell.available_action_ids"
            :key="`${selectedCell.id}-${actionId}`"
            type="button"
            class="visual-track-board__action"
            :data-testid="`visual-track-action-${actionId}`"
            :disabled="actionRunning"
            :title="actionId"
            @click="$emit('trigger-action', { trackId: activeTrack.id, cellId: selectedCell.id, actionId })"
          >
            <Play :size="13" aria-hidden="true" />
            <span>{{ actionLabel(actionId) }}</span>
          </button>
        </div>
      </div>

      <p
        v-if="recentFeedback"
        class="visual-track-board__feedback"
        data-testid="visual-track-action-result"
        aria-live="polite"
      >
        行动结果：{{ recentFeedback }}
      </p>
    </OnlineBottomSheet>
  </section>
</template>

<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
  import { AlertTriangle, ChevronsRight, Circle, Flag, Play, Shield, Sparkles } from 'lucide-vue-next'
  import OnlineBottomSheet from '@/components/game/online/OnlineBottomSheet.vue'
  import OnlineTechnicalDetails from '@/components/game/online/OnlineTechnicalDetails.vue'
  import type { Component } from 'vue'
  import type {
    OnlineVisualTrack,
    OnlineVisualTrackCell,
    OnlineVisualTrackCellKind,
    OnlineVisualTrackEffect,
    OnlineVisualTrackTeam,
    OnlineVisualTrackTeamState,
  } from '@/types/onlineVisual'

  const props = withDefaults(defineProps<{
    tracks: OnlineVisualTrack[]
    selectedTrackId?: string
    selectedCellId?: string
    recentFeedback?: string
    actionRunning?: boolean
    actionLabels?: Record<string, string>
  }>(), {
    selectedTrackId: '',
    selectedCellId: '',
    recentFeedback: '',
    actionRunning: false,
    actionLabels: () => ({}),
  })

  const emit = defineEmits<{
    (event: 'select-cell', payload: { trackId: string, cellId: string }): void
    (event: 'trigger-action', payload: { trackId: string, cellId: string, actionId: string }): void
  }>()

  const visibleTracks = computed<OnlineVisualTrack[]>(() => props.tracks
    .filter(track => track.cells.length > 0)
    .map(track => ({
      ...track,
      cells: [...track.cells].sort((a, b) => a.index - b.index),
      teams: [...track.teams],
    })))
  const trackById = computed(() => new Map(visibleTracks.value.map(track => [track.id, track])))
  const detailSheetOpen = ref(false)
  const isCompactViewport = ref(false)
  let viewportQuery: MediaQueryList | null = null
  const activeTrackId = computed(() => {
    if (props.selectedTrackId && trackById.value.has(props.selectedTrackId)) return props.selectedTrackId
    return visibleTracks.value[0]?.id || ''
  })
  const activeTrack = computed(() => trackById.value.get(activeTrackId.value) || null)
  const activeCells = computed(() => activeTrack.value?.cells ?? [])
  const cellById = computed(() => new Map(activeCells.value.map(cell => [cell.id, cell])))
  const activeCellId = computed(() => {
    if (props.selectedCellId && cellById.value.has(props.selectedCellId)) return props.selectedCellId
    const occupiedCell = activeCells.value.find(cell => teamsForCell(cell).length > 0)
    return occupiedCell?.id || activeCells.value[0]?.id || ''
  })
  const selectedCell = computed(() => cellById.value.get(activeCellId.value) || null)
  const sortedTeams = computed(() => [...(activeTrack.value?.teams ?? [])].sort((a, b) => b.position_index - a.position_index))
  const selectedCellFailureReason = computed(() => {
    const cell = selectedCell.value
    if (!cell) return ''
    if (cell.available_action_ids.length > 0) return ''
    if (cell.kind === 'finish') return '终点格只用于结算回看，不能重复提交推进行动。'
    if (cell.occupant_team_ids.length === 0) return '当前没有队伍位于该格，请选择队伍所在格。'
    return '当前赛道格没有可用行动，需刷新房间或选择队伍所在格。'
  })
  const selectedCellTechnicalReason = computed(() => {
    const cell = selectedCell.value
    const track = activeTrack.value
    if (!cell || cell.available_action_ids.length > 0) return ''
    const occupants = cell.occupant_team_ids.length > 0 ? cell.occupant_team_ids.join(', ') : 'none'
    return `track_id=${track?.id || 'none'}; cell_id=${cell.id}; kind=${cell.kind}; available_action_ids=${cell.available_action_ids.length}; occupant_team_ids=${occupants}; current_round=${track?.current_round ?? 0}`
  })
  const selectedCellImpactText = computed(() => {
    const cell = selectedCell.value
    if (!cell) return ''
    const teams = teamsForCell(cell).map(team => team.label || team.team_id).join('、')
    const parts = [
      cell.risk_preview ? `风险：${cell.risk_preview}` : '',
      cell.reward_preview ? `收益：${cell.reward_preview}` : '',
      cell.effect_ids.length > 0 ? `效果：${effectLabels(cell.effect_ids).join(' / ')}` : '',
      teams ? `影响队伍：${teams}` : '',
    ].filter(Boolean)
    return parts.join('；')
  })
  const trackGridStyle = computed(() => ({
    gridTemplateColumns: `repeat(${Math.max(activeCells.value.length, 1)}, minmax(3.7rem, 1fr))`,
  }))

  const selectTrack = (trackId: string) => {
    const track = trackById.value.get(trackId)
    const cellId = track?.cells[0]?.id || ''
    if (cellId) {
      emit('select-cell', { trackId, cellId })
      if (isCompactViewport.value) detailSheetOpen.value = true
    }
  }

  const selectCell = (trackId: string, cellId: string) => {
    emit('select-cell', { trackId, cellId })
    if (isCompactViewport.value) detailSheetOpen.value = true
  }

  const openDetailSheet = () => {
    detailSheetOpen.value = true
  }

  const closeDetailSheet = () => {
    detailSheetOpen.value = false
  }

  const updateViewportMode = () => {
    isCompactViewport.value = Boolean(viewportQuery?.matches)
    if (!isCompactViewport.value) closeDetailSheet()
  }

  const kindLabel = (kind: OnlineVisualTrackCellKind) => ({
    normal: '水道',
    boost: '冲刺',
    risk: '横流',
    turn: '弯道',
    finish: '终点',
  }[kind] || kind)

  const teamStateLabel = (state: OnlineVisualTrackTeamState) => ({
    idle: '待命',
    advancing: '推进',
    retreating: '后退',
    boosted: '加速',
    blocked: '受阻',
    protected: '受护',
    finished: '完赛',
  }[state] || state)

  const effectLabel = (effect: OnlineVisualTrackEffect) => ({
    advance: '前进',
    retreat: '后退',
    boost: '加速',
    blocked: '受阻',
    protect: '保护',
  }[effect] || effect)

  const effectLabels = (effects: OnlineVisualTrackEffect[]) => effects.map(effectLabel)

  const cellIcon = (cell: OnlineVisualTrackCell): Component => {
    if (cell.kind === 'finish') return Flag
    if (cell.kind === 'boost') return ChevronsRight
    if (cell.kind === 'risk') return AlertTriangle
    if (cell.effect_ids.includes('protect')) return Shield
    if (cell.effect_ids.includes('boost')) return Sparkles
    return Circle
  }

  const teamsForCell = (cell: OnlineVisualTrackCell) => {
    const teamMap = new Map<string, OnlineVisualTrackTeam>()
    const occupantIds = new Set(cell.occupant_team_ids || [])
    for (const team of activeTrack.value?.teams ?? []) {
      if (occupantIds.has(team.team_id) || team.position_index === cell.index) {
        teamMap.set(team.team_id, team)
      }
    }
    return Array.from(teamMap.values())
  }

  const cellTooltip = (cell: OnlineVisualTrackCell) => {
    const label = cell.label || kindLabel(cell.kind)
    const effects = cell.effect_ids.length > 0 ? ` · ${effectLabels(cell.effect_ids).join(' / ')}` : ''
    return `${label} · 第 ${cell.index + 1} 格 · ${kindLabel(cell.kind)}${effects}`
  }

  const teamTooltip = (team: OnlineVisualTrackTeam) => {
    const action = team.last_action_id ? ` · ${actionLabel(team.last_action_id)}` : ''
    return `${team.label || team.team_id} · ${teamStateLabel(team.state)}${action}`
  }

  const actionLabel = (actionId: string) => props.actionLabels[actionId] || actionId.split('_').join(' ')

  onMounted(() => {
    if (typeof window === 'undefined') return
    viewportQuery = window.matchMedia('(max-width: 760px)')
    updateViewportMode()
    viewportQuery.addEventListener('change', updateViewportMode)
  })

  onBeforeUnmount(() => {
    viewportQuery?.removeEventListener('change', updateViewportMode)
  })
</script>

<style scoped>
  .visual-track-board {
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(14rem, 0.85fr);
    gap: 0.75rem;
    border: 1px solid color-mix(in srgb, var(--color-accent) 16%, transparent);
    background: rgb(var(--color-bg) / 0.16);
    padding: 0.75rem;
  }

  .visual-track-board__main,
  .visual-track-board__side {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 0.5rem;
  }

  .visual-track-board__track-tabs {
    display: flex;
    gap: 0.4rem;
    overflow-x: auto;
    padding-bottom: 0.1rem;
  }

  .visual-track-board__track-tab {
    display: inline-flex;
    min-height: var(--online-visual-touch-target, 44px);
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

  .visual-track-board__track-tab--selected {
    border-color: color-mix(in srgb, var(--color-accent) 68%, transparent);
    color: rgb(var(--color-text));
  }

  .visual-track-board__river,
  .visual-track-board__detail,
  .visual-track-board__empty,
  .visual-track-board__feedback,
  .visual-track-board__mobile-detail-trigger,
  .visual-track-board__teams {
    border: 1px solid color-mix(in srgb, var(--color-accent) 12%, transparent);
    background: rgb(0 0 0 / 0.1);
    padding: 0.625rem;
  }

  .visual-track-board__mobile-detail-trigger {
    display: flex;
    min-height: var(--online-visual-touch-target, 44px);
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    color: rgb(var(--color-text));
    text-align: left;
  }

  .visual-track-board__mobile-detail-trigger small {
    flex-shrink: 0;
    color: var(--color-accent);
    font-size: 0.68rem;
    line-height: 1.2;
  }

  .visual-track-board__river {
    overflow-x: auto;
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 10%, transparent), transparent 48%),
      linear-gradient(90deg, rgb(0 0 0 / 0.16), transparent 30%, rgb(0 0 0 / 0.14)),
      rgb(0 0 0 / 0.12);
  }

  .visual-track-board__river-head,
  .visual-track-board__detail-head,
  .visual-track-board__team {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .visual-track-board__title {
    min-width: 0;
    overflow: hidden;
    color: var(--color-accent);
    font-size: 0.82rem;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .visual-track-board__meta,
  .visual-track-board__length,
  .visual-track-board__event,
  .visual-track-board__feedback,
  .visual-track-board__team-state {
    color: var(--color-muted);
    font-size: 0.68rem;
    line-height: 1.45;
  }

  .visual-track-board__length,
  .visual-track-board__event {
    flex-shrink: 0;
  }

  .visual-track-board__cells {
    display: grid;
    min-width: max(100%, 32rem);
    gap: 0.35rem;
    margin-top: 0.625rem;
  }

  .visual-track-board__cell {
    position: relative;
    display: grid;
    min-height: 7.25rem;
    align-content: start;
    justify-items: center;
    gap: 0.25rem;
    border: 1px solid color-mix(in srgb, var(--color-accent) 22%, transparent);
    background: rgb(var(--color-bg) / 0.86);
    color: rgb(var(--color-text));
    padding: 0.45rem 0.4rem 2rem;
    font-size: 0.68rem;
    line-height: 1.1;
    text-align: center;
    transition: border-color 0.16s ease, background 0.16s ease, transform 0.16s ease;
  }

  .visual-track-board__cell:hover,
  .visual-track-board__cell:focus-visible {
    border-color: color-mix(in srgb, var(--color-accent) 80%, transparent);
    transform: translateY(-1px);
    outline: none;
  }

  .visual-track-board__cell--selected {
    border-color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 16%, rgb(var(--color-bg)));
  }

  .visual-track-board__cell--boost {
    border-color: color-mix(in srgb, var(--color-success) 62%, transparent);
    color: var(--color-success);
  }

  .visual-track-board__cell--risk {
    border-color: color-mix(in srgb, #d4976a 74%, transparent);
    color: #d4976a;
  }

  .visual-track-board__cell--turn {
    border-color: color-mix(in srgb, var(--color-accent) 48%, transparent);
  }

  .visual-track-board__cell--finish {
    border-color: color-mix(in srgb, var(--color-success) 82%, transparent);
    background: color-mix(in srgb, var(--color-success) 10%, rgb(var(--color-bg)));
  }

  .visual-track-board__cell-index {
    color: var(--color-muted);
    font-size: 0.62rem;
  }

  .visual-track-board__cell-label,
  .visual-track-board__team-name {
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .visual-track-board__cell-effect {
    color: var(--color-muted);
    font-size: 0.62rem;
  }

  .visual-track-board__markers {
    position: absolute;
    right: 0.35rem;
    bottom: 0.35rem;
    left: 0.35rem;
    display: flex;
    min-height: 1.3rem;
    align-items: center;
    justify-content: center;
    gap: 0.2rem;
  }

  .visual-track-board__marker,
  .visual-track-board__team-marker {
    display: inline-flex;
    width: 1.3rem;
    height: 1.3rem;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    border: 1px solid color-mix(in srgb, var(--color-accent) 46%, transparent);
    background: rgb(0 0 0 / 0.22);
    color: rgb(var(--color-text));
    font-size: 0.68rem;
    line-height: 1;
  }

  .visual-track-board__marker--advancing,
  .visual-track-board__marker--boosted,
  .visual-track-board__marker--finished {
    border-color: color-mix(in srgb, var(--color-success) 78%, transparent);
    color: var(--color-success);
  }

  .visual-track-board__marker--retreating,
  .visual-track-board__marker--blocked {
    border-color: color-mix(in srgb, #d4976a 78%, transparent);
    color: #d4976a;
  }

  .visual-track-board__marker--protected {
    border-color: color-mix(in srgb, var(--color-accent) 78%, transparent);
    color: var(--color-accent);
  }

  .visual-track-board__preview-grid,
  .visual-track-board__effects,
  .visual-track-board__readable-feedback,
  .visual-track-board__actions {
    display: grid;
    gap: 0.5rem;
    margin-top: 0.625rem;
  }

  .visual-track-board__preview {
    font-size: 0.68rem;
    line-height: 1.5;
  }

  .visual-track-board__preview--risk {
    color: #d4976a;
  }

  .visual-track-board__preview--reward {
    color: var(--color-success);
  }

  .visual-track-board__effects {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .visual-track-board__effect {
    border: 1px solid color-mix(in srgb, var(--color-accent) 14%, transparent);
    color: var(--color-muted);
    padding: 0.2rem 0.35rem;
    font-size: 0.65rem;
  }

  .visual-track-board__readable-feedback {
    border: 1px solid color-mix(in srgb, var(--color-accent) 12%, transparent);
    background: rgb(0 0 0 / 0.1);
    padding: 0.45rem;
  }

  .visual-track-board__readable-line {
    color: var(--color-muted);
    font-size: 0.68rem;
    line-height: 1.45;
  }

  .visual-track-board__readable-line--warning {
    color: #d4976a;
  }

  .visual-track-board__technical-details {
    margin-top: 0.625rem;
  }

  .visual-track-board__actions {
    grid-template-columns: 1fr;
  }

  .visual-track-board__action {
    display: inline-flex;
    min-height: var(--online-visual-touch-target, 44px);
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    border: 1px solid color-mix(in srgb, var(--color-accent) 28%, transparent);
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    color: rgb(var(--color-text));
    padding: 0.35rem 0.55rem;
    font-size: 0.7rem;
    line-height: 1.1;
  }

  .visual-track-board__action:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .visual-track-board__empty {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    color: var(--color-muted);
    font-size: 0.75rem;
  }

  .visual-track-board__teams {
    display: grid;
    gap: 0.45rem;
  }

  .visual-track-board__team {
    align-items: center;
    border: 1px solid color-mix(in srgb, var(--color-accent) 10%, transparent);
    background: transparent;
    padding: 0.35rem 0.45rem;
  }

  .visual-track-board__team-name {
    flex: 1;
    color: rgb(var(--color-text));
    font-size: 0.7rem;
  }

  .visual-track-board__team-rank {
    flex-shrink: 0;
    color: var(--color-accent);
    font-size: 0.68rem;
    line-height: 1.2;
  }

  @media (max-width: 760px) {
    .visual-track-board {
      grid-template-columns: 1fr;
    }

    .visual-track-board__main {
      order: 1;
    }

    .visual-track-board__side {
      order: 2;
    }

    .visual-track-board__action {
      width: 100%;
    }

    .visual-track-board__cells {
      min-width: 34rem;
    }
  }
</style>
