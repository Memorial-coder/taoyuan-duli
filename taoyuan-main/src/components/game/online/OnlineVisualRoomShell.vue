<template>
  <section
    class="space-y-3 border border-accent/15 bg-black/10 p-3"
    data-testid="online-visual-room-shell"
    role="region"
    :aria-label="`${title} 房间状态`"
  >
    <p class="sr-only" data-testid="online-visual-room-screen-reader-summary" aria-live="polite">
      {{ screenReaderSummary }}
    </p>

    <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0 space-y-2">
        <div class="flex flex-wrap items-center gap-2" data-testid="online-visual-room-status-strip">
          <span class="border px-2 py-0.5 text-[0.625rem]" :class="statusClass" data-testid="online-visual-room-status">{{ statusLabel || '未载入' }}</span>
          <span v-if="phaseLabel" class="border border-accent/15 px-2 py-0.5 text-[0.625rem] text-muted" data-testid="online-visual-room-phase">{{ phaseLabel }}</span>
          <span
            v-if="countdownLabel"
            class="border border-warning/25 bg-warning/10 px-2 py-0.5 text-[0.625rem] text-warning"
            data-testid="online-visual-room-countdown"
            aria-live="polite"
          >
            {{ countdownLabel }}
          </span>
        </div>
        <div class="min-w-0">
          <p class="truncate text-sm text-accent" data-testid="online-visual-room-title">{{ title }}</p>
          <p class="mt-1 text-[0.625rem] leading-4 text-muted" data-testid="online-visual-room-subtitle">{{ subtitle }}</p>
        </div>
        <p v-if="stateReason" class="text-[0.625rem] leading-4 text-warning" data-testid="online-visual-room-state-reason">{{ stateReason }}</p>
        <p v-if="actionFeedback" class="text-[0.625rem] leading-4 text-success" data-testid="online-visual-room-action-feedback" aria-live="polite">{{ actionFeedback }}</p>
        <p v-if="connectionLabel" class="text-[0.625rem] leading-4" :class="connectionClass" data-testid="online-visual-room-connection">{{ connectionLabel }}</p>
        <p v-if="conflictMessage" class="text-[0.625rem] leading-4 text-danger" data-testid="online-visual-room-conflict">{{ conflictMessage }}</p>
      </div>

      <div
        v-if="$slots.actions"
        class="grid min-w-[12rem] gap-2 sm:grid-cols-2 lg:max-w-sm"
        data-testid="online-visual-room-actions"
        role="group"
        aria-label="房间操作"
      >
        <slot name="actions" />
      </div>
    </div>

    <div
      v-if="errorMessages.length > 0 || permissionHints.length > 0"
      class="grid gap-2 md:grid-cols-2"
      data-testid="online-visual-room-shell-alerts"
      aria-live="assertive"
    >
      <div v-if="errorMessages.length > 0" class="border border-danger/25 bg-danger/10 p-2">
        <p class="text-[0.625rem] text-danger">错误与冲突</p>
        <ul class="mt-1 space-y-1">
          <li v-for="message in errorMessages" :key="message" class="text-[0.625rem] leading-4 text-muted">{{ message }}</li>
        </ul>
      </div>
      <div v-if="permissionHints.length > 0" class="border border-warning/25 bg-warning/10 p-2">
        <p class="text-[0.625rem] text-warning">权限提示</p>
        <ul class="mt-1 space-y-1">
          <li v-for="hint in permissionHints" :key="hint" class="text-[0.625rem] leading-4 text-muted">{{ hint }}</li>
        </ul>
      </div>
    </div>

    <div
      v-if="showTeamPulse"
      class="border border-accent/15 bg-accent/5 p-2"
      data-testid="online-visual-room-team-pulse"
      aria-live="polite"
    >
      <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <p class="text-[0.625rem] text-accent">队伍脉搏</p>
          <p class="mt-1 text-[0.625rem] leading-4 text-muted" data-testid="online-visual-room-team-pulse-summary">
            {{ teamPulseSummary }}
          </p>
        </div>
        <span
          v-if="teamPulseScoreLabel"
          class="w-fit shrink-0 border border-accent/15 bg-black/10 px-2 py-1 text-[0.625rem] text-accent"
          data-testid="online-visual-room-team-pulse-score"
        >
          {{ teamPulseScoreLabel }}
        </span>
      </div>
      <div class="mt-2 h-1.5 overflow-hidden bg-black/20" aria-hidden="true">
        <div
          class="h-full bg-accent/80 transition-all"
          data-testid="online-visual-room-team-pulse-progress-bar"
          :style="{ width: `${teamPulseProgressPercent}%` }"
        />
      </div>
      <div
        class="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4"
        data-testid="online-visual-room-team-pulse-items"
        role="list"
        aria-label="队伍脉搏"
      >
        <div
          v-for="item in teamPulseItems"
          :key="item.id"
          class="border border-accent/10 bg-black/10 p-2"
          :class="collaborationRhythmBeatClass(item.tone)"
          data-testid="online-visual-room-team-pulse-item"
          role="listitem"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="text-[0.625rem] text-muted">{{ item.label }}</p>
            <span class="shrink-0 text-[0.625rem] text-accent" data-testid="online-visual-room-team-pulse-value">
              {{ item.value }}
            </span>
          </div>
          <p class="mt-1 line-clamp-2 text-[0.625rem] leading-4 text-muted">{{ item.summary }}</p>
        </div>
      </div>
    </div>

    <div
      v-if="focusHints.length > 0"
      class="border border-accent/10 bg-bg/10 p-2"
      data-testid="online-visual-room-shell-focus-guide"
    >
      <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <p class="text-[0.625rem] text-accent">键盘与焦点</p>
          <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ focusGuideSummary }}</p>
        </div>
        <span class="shrink-0 text-[0.625rem] text-muted">Tab / Enter / Space</span>
      </div>
      <ul class="mt-2 grid gap-1 md:grid-cols-2">
        <li v-for="hint in focusHints" :key="hint" class="text-[0.625rem] leading-4 text-muted">{{ hint }}</li>
      </ul>
    </div>

    <div
      class="border border-accent/10 bg-bg/10 p-2"
      data-testid="online-visual-room-entry-readback"
      aria-live="polite"
    >
      <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <p class="text-[0.625rem] text-accent">入口与备用操作</p>
          <p class="mt-1 text-[0.625rem] leading-4 text-muted" data-testid="online-visual-room-primary-entry">
            {{ visualContentLabel }}
          </p>
        </div>
        <span
          class="w-fit shrink-0 border px-1.5 py-0.5 text-[0.625rem]"
          :class="fallbackEntryVisible ? 'border-warning/30 bg-warning/10 text-warning' : 'border-accent/15 bg-accent/5 text-muted'"
          data-testid="online-visual-room-fallback-status"
        >
          {{ fallbackEntryStatus }}
        </span>
      </div>
      <p class="mt-2 text-[0.625rem] leading-4 text-muted" data-testid="online-visual-room-fallback-entry">
        {{ fallbackEntryLabel }}：{{ fallbackEntryHint }}
      </p>
    </div>

    <div
      class="grid gap-1 border border-accent/10 bg-bg/10 p-2 sm:hidden"
      data-testid="online-visual-room-mobile-readback"
      role="list"
      aria-label="移动端房间读回"
    >
      <p class="text-[0.625rem] text-accent">移动端读回</p>
      <div
        v-for="row in mobileReadbackRows"
        :key="row.id"
        class="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-2 border border-accent/10 px-2 py-1 text-[0.625rem] leading-4"
        :data-testid="`online-visual-room-mobile-readback-${row.id}`"
        role="listitem"
      >
        <span class="text-muted">{{ row.label }}</span>
        <span class="min-w-0 whitespace-normal break-words" :class="row.valueClass">{{ row.value }}</span>
      </div>
    </div>

    <div
      v-if="tacticalHud"
      class="grid gap-2 border border-accent/15 bg-accent/5 p-2 md:grid-cols-[minmax(0,1fr)_minmax(12rem,0.45fr)]"
      data-testid="online-visual-room-tactical-hud"
      aria-live="polite"
    >
      <div class="min-w-0">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0">
            <p class="text-[0.625rem] text-accent">本局战术</p>
            <p class="mt-1 text-xs leading-5 text-text" data-testid="online-visual-room-tactical-next-action">
              {{ tacticalHud.nextActionLabel }}
            </p>
            <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ tacticalHud.nextActionSummary }}</p>
          </div>
          <span
            v-if="tacticalHud.urgencyLabel"
            class="w-fit shrink-0 border border-warning/25 bg-warning/10 px-2 py-1 text-[0.625rem] text-warning"
            data-testid="online-visual-room-tactical-urgency"
          >
            {{ tacticalHud.urgencyLabel }}
          </span>
        </div>
        <div class="mt-2 grid gap-1 sm:grid-cols-3">
          <div class="border border-accent/10 bg-black/10 p-2" data-testid="online-visual-room-tactical-role-gap">
            <p class="text-[0.625rem] text-muted">岗位缺口</p>
            <p class="mt-1 truncate text-[0.625rem] leading-4 text-accent">{{ tacticalHud.roleGapLabel }}</p>
          </div>
          <div class="border border-accent/10 bg-black/10 p-2" data-testid="online-visual-room-tactical-reward-cashout">
            <p class="text-[0.625rem] text-muted">奖励落袋</p>
            <p class="mt-1 truncate text-[0.625rem] leading-4 text-success">{{ tacticalHud.rewardCashoutLabel }}</p>
          </div>
          <div class="border border-accent/10 bg-black/10 p-2" data-testid="online-visual-room-tactical-progress">
            <p class="text-[0.625rem] text-muted">共同进度</p>
            <p class="mt-1 truncate text-[0.625rem] leading-4 text-accent">{{ tacticalHud.progressLabel || collaborationProgressLabel || statusLabel }}</p>
          </div>
        </div>
        <div class="mt-2 h-1.5 overflow-hidden bg-black/20" aria-hidden="true">
          <div
            class="h-full bg-accent/80 transition-all"
            data-testid="online-visual-room-tactical-progress-bar"
            :style="{ width: `${safeTacticalProgressPercent}%` }"
          />
        </div>
      </div>
      <div
        v-if="tacticalHud.items?.length"
        class="grid content-start gap-1"
        data-testid="online-visual-room-tactical-items"
        role="list"
      >
        <div
          v-for="item in tacticalHud.items"
          :key="item.id"
          class="flex min-w-0 items-center justify-between gap-2 border border-accent/10 bg-black/10 px-2 py-1 text-[0.625rem] leading-4"
          :class="tacticalItemClass(item.tone)"
          data-testid="online-visual-room-tactical-item"
          role="listitem"
        >
          <span class="min-w-0 truncate text-muted">{{ item.label }}</span>
          <span class="shrink-0 text-accent">{{ item.value }}</span>
        </div>
      </div>
    </div>

    <div
      v-if="showCollaborationPanel"
      class="space-y-2 border border-accent/10 bg-bg/10 p-2"
      data-testid="online-visual-room-collaboration-panel"
      aria-live="polite"
    >
      <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <p class="text-[0.625rem] text-accent">协作推进</p>
          <p class="mt-1 text-[0.625rem] leading-4 text-muted" data-testid="online-visual-room-collaboration-progress">
            {{ collaborationProgressLabel || '等待成员分工后显示共同目标。' }}
          </p>
        </div>
        <span
          v-if="collaborationScoreLabel"
          class="w-fit shrink-0 border border-accent/15 bg-accent/5 px-2 py-1 text-[0.625rem] text-accent"
          data-testid="online-visual-room-collaboration-score"
        >
          {{ collaborationScoreLabel }}
        </span>
      </div>
      <div class="h-1.5 overflow-hidden bg-black/20" aria-hidden="true">
        <div
          class="h-full bg-accent/80 transition-all"
          data-testid="online-visual-room-collaboration-progress-bar"
          :style="{ width: `${safeCollaborationProgressPercent}%` }"
        />
      </div>
      <div
        class="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4"
        data-testid="online-visual-room-collaboration-rhythm"
        role="list"
        aria-label="协作节奏"
      >
        <div
          v-for="beat in collaborationRhythmBeats"
          :key="beat.id"
          class="border border-accent/10 bg-black/10 p-2"
          :class="collaborationRhythmBeatClass(beat.tone)"
          data-testid="online-visual-room-collaboration-rhythm-beat"
          role="listitem"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="text-[0.625rem] text-muted">{{ beat.label }}</p>
            <span class="shrink-0 text-[0.625rem] text-accent">{{ beat.value }}</span>
          </div>
          <p class="mt-1 line-clamp-2 text-[0.625rem] leading-4 text-muted">{{ beat.summary }}</p>
        </div>
      </div>
      <div v-if="collaborationSignals.length > 0" class="flex flex-wrap gap-1.5" data-testid="online-visual-room-collaboration-signals" role="list">
        <span
          v-for="signal in collaborationSignals"
          :key="signal.id"
          class="border px-2 py-1 text-[0.625rem] leading-4"
          :class="collaborationSignalClass(signal.tone)"
          data-testid="online-visual-room-collaboration-signal"
          role="listitem"
        >
          {{ signal.label }}
        </span>
      </div>
      <div v-if="collaborationRoleLanes.length > 0" class="space-y-2" data-testid="online-visual-room-role-lanes">
        <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-[0.625rem] text-accent">四岗位协作线</p>
          <span class="text-[0.625rem] text-muted" data-testid="online-visual-room-role-lanes-summary">{{ collaborationRoleLaneSummary }}</span>
        </div>
        <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" role="list" aria-label="四岗位协作线">
          <article
            v-for="lane in collaborationRoleLanes"
            :key="lane.id"
            class="border border-accent/10 bg-black/10 p-2"
            :class="lane.covered ? 'border-success/20 bg-success/5' : 'border-warning/20 bg-warning/5'"
            :data-testid="`online-visual-room-role-lane-${lane.id}`"
            role="listitem"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="truncate text-xs text-text" data-testid="online-visual-room-role-lane-label">{{ lane.label }}</p>
                <p class="mt-1 truncate text-[0.625rem] text-accent" data-testid="online-visual-room-role-lane-owner">{{ lane.ownerLabel }}</p>
              </div>
              <span class="shrink-0 text-[0.625rem]" :class="lane.covered ? 'text-success' : 'text-warning'" data-testid="online-visual-room-role-lane-status">
                {{ lane.statusLabel }}
              </span>
            </div>
            <p class="mt-2 line-clamp-2 text-[0.625rem] leading-4 text-muted" data-testid="online-visual-room-role-lane-summary">
              {{ lane.summary }}
            </p>
            <p class="mt-2 text-[0.625rem] leading-4 text-accent" data-testid="online-visual-room-role-lane-next-action">
              {{ lane.nextActionLabel }}
            </p>
          </article>
        </div>
      </div>
      <div v-if="collaborationRoles.length > 0" class="space-y-2" data-testid="online-visual-room-collaboration-role-playbook">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[0.625rem] text-accent">队伍分工台</p>
          <span class="text-[0.625rem] text-muted">{{ collaborationRoles.length }} 项职责</span>
        </div>
        <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" data-testid="online-visual-room-collaboration-roles" role="list">
          <article
            v-for="role in collaborationRoles"
            :key="role.id"
            class="border border-accent/10 bg-black/10 p-2"
            data-testid="online-visual-room-collaboration-role"
            role="listitem"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="truncate text-xs text-text">{{ role.label }}</p>
                <p class="mt-1 truncate text-[0.625rem] text-accent">{{ role.ownerLabel }}</p>
              </div>
              <span v-if="role.statusLabel" class="shrink-0 text-[0.625rem] text-muted">{{ role.statusLabel }}</span>
            </div>
            <p class="mt-2 line-clamp-2 text-[0.625rem] leading-4 text-muted">{{ role.summary }}</p>
            <p v-if="role.actionLabel" class="mt-2 text-[0.625rem] leading-4 text-accent" data-testid="online-visual-room-collaboration-role-next-action">
              {{ role.actionLabel }}
            </p>
          </article>
        </div>
      </div>
      <div v-if="teammateLiveHighlights.length > 0" class="space-y-2" data-testid="online-visual-room-teammate-live-feed">
        <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-[0.625rem] text-accent">队友动态高光</p>
          <span class="text-[0.625rem] text-muted" data-testid="online-visual-room-teammate-live-summary">{{ teammateLiveFeedSummary }}</span>
        </div>
        <div class="grid gap-2 md:grid-cols-3" role="list" aria-label="队友动态高光">
          <article
            v-for="highlight in teammateLiveHighlights"
            :key="highlight.id"
            class="border border-accent/10 bg-black/10 p-2"
            :class="collaborationLiveHighlightClass(highlight.tone)"
            :data-testid="`online-visual-room-teammate-live-${highlight.id}`"
            role="listitem"
          >
            <div class="flex items-start justify-between gap-2">
              <p class="text-[0.625rem] text-muted" data-testid="online-visual-room-teammate-live-kind">{{ highlight.kindLabel }}</p>
              <span class="shrink-0 text-[0.625rem] text-accent" data-testid="online-visual-room-teammate-live-value">{{ highlight.valueLabel }}</span>
            </div>
            <p class="mt-1 truncate text-xs text-text" data-testid="online-visual-room-teammate-live-title">{{ highlight.title }}</p>
            <p class="mt-1 line-clamp-2 text-[0.625rem] leading-4 text-muted" data-testid="online-visual-room-teammate-live-summary-text">
              {{ highlight.summary }}
            </p>
          </article>
        </div>
      </div>
      <p v-if="collaborationFeedback.length > 0" class="text-[0.625rem] text-accent" data-testid="online-visual-room-collaboration-feedback-flow">即时反馈</p>
      <div v-if="collaborationFeedback.length > 0" class="grid gap-1 md:grid-cols-2" data-testid="online-visual-room-collaboration-feedback" role="list">
        <p
          v-for="entry in collaborationFeedback"
          :key="entry.id"
          class="border border-accent/10 bg-black/10 px-2 py-1 text-[0.625rem] leading-4 text-muted"
          :class="entry.tone === 'success' ? 'text-success' : entry.tone === 'warning' ? 'text-warning' : ''"
          data-testid="online-visual-room-collaboration-feedback-item"
          role="listitem"
        >
          <span class="text-accent">{{ entry.label }}</span>
          <span v-if="entry.summary"> · {{ entry.summary }}</span>
        </p>
      </div>
    </div>

    <div class="grid gap-2 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div class="border border-accent/10 bg-bg/10 p-2" data-testid="online-visual-room-members">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[0.625rem] text-muted">成员</p>
          <span class="text-[0.625rem] text-accent" data-testid="online-visual-room-ready-summary">{{ readyMemberCount }} / {{ readyMemberDenominator }} 已准备</span>
        </div>
        <div v-if="members.length > 0" class="mt-2 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1" role="list" aria-label="房间成员">
          <span
            v-for="member in members"
            :key="member.username"
            class="border border-accent/15 px-1.5 py-0.5 text-[0.625rem] text-muted"
            :class="member.isHost ? 'bg-accent/10 text-accent' : ''"
            :data-testid="`online-visual-room-member-${member.username}`"
            role="listitem"
          >
            {{ member.displayName }} · {{ member.statusLabel }}<template v-if="member.isHost"> · 房主</template>
          </span>
        </div>
        <p v-else class="mt-2 text-[0.625rem] leading-4 text-muted" data-testid="online-visual-room-members-empty">成员信息载入后会显示准备、离线和房主状态。</p>
      </div>

      <div class="border border-accent/10 bg-bg/10 p-2" data-testid="online-visual-room-reward-preview">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[0.625rem] text-muted">奖励预览</p>
          <span class="text-[0.625rem] text-muted" data-testid="online-visual-room-reward-count">{{ rewardPreview.length }} 项</span>
        </div>
        <div v-if="rewardPreview.length > 0" class="mt-2 max-h-24 space-y-1 overflow-y-auto pr-1" role="list" aria-label="奖励预览">
          <p v-for="reward in rewardPreview" :key="reward" class="text-[0.625rem] leading-4 text-muted" data-testid="online-visual-room-reward-item" role="listitem">{{ reward }}</p>
        </div>
        <p v-else class="mt-2 text-[0.625rem] leading-4 text-muted" data-testid="online-visual-room-reward-empty">结算前会展示行动收益、结算记录或可保留成果。</p>
      </div>
    </div>

    <div
      v-if="settlementRecords.length > 0"
      class="border border-success/20 bg-success/10 p-2"
      data-testid="online-visual-room-settlement-replay"
      aria-live="polite"
    >
      <div class="flex items-center justify-between gap-2">
        <p class="text-[0.625rem] text-success">结算 / 回看记录</p>
        <span class="text-[0.625rem] text-muted" data-testid="online-visual-room-settlement-count">{{ settlementRecords.length }} 条</span>
      </div>
      <div class="mt-2 grid gap-1 md:grid-cols-2" role="list" aria-label="结算和回看记录">
        <article
          v-for="record in settlementRecords"
          :key="record.id"
          class="border border-success/15 bg-bg/20 p-2"
          data-testid="online-visual-room-settlement-item"
          role="listitem"
        >
          <div class="flex items-center justify-between gap-2">
            <p class="truncate text-[0.625rem] text-text">{{ record.targetLabel }}</p>
            <span class="shrink-0 text-[0.625rem] text-success">{{ record.statusLabel }}</span>
          </div>
          <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ record.summary }}</p>
          <p v-if="record.replayLabel" class="mt-1 text-[0.625rem] leading-4 text-accent" data-testid="online-visual-room-replay-label">
            {{ record.replayLabel }}
          </p>
          <p v-if="record.rewardLabel" class="mt-1 text-[0.625rem] leading-4 text-muted" data-testid="online-visual-room-reward-label">
            {{ record.rewardLabel }}
          </p>
          <div
            v-if="record.rewardItems?.length"
            class="mt-1 flex flex-wrap gap-1"
            data-testid="online-visual-room-reward-items"
          >
            <span
              v-for="item in record.rewardItems"
              :key="`${record.id}-${item.itemId}-${item.quantity}`"
              class="inline-flex min-w-0 items-center gap-1 border border-success/15 bg-success/5 px-1.5 py-0.5 text-[0.625rem] text-muted"
            >
              <ItemIcon v-if="getItemById(item.itemId)" :item="getItemById(item.itemId)" size="xs" :show-badge="false" />
              <span class="truncate">{{ getRewardItemLabel(item) }} x{{ item.quantity }}</span>
            </span>
          </div>
        </article>
      </div>
    </div>

    <div
      v-if="$slots.default"
      class="space-y-3"
      data-testid="online-visual-room-content"
      role="group"
      aria-label="房间可视化内容与备用操作"
    >
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import ItemIcon from '@/components/game/ItemIcon.vue'
  import { getItemById } from '@/data/items'

  export interface OnlineVisualRoomShellMember {
    username: string
    displayName: string
    statusLabel: string
    isHost?: boolean
  }

  export interface OnlineVisualRoomShellSettlementRecord {
    id: string
    targetLabel: string
    statusLabel: string
    summary: string
    replayLabel?: string
    rewardLabel?: string
    rewardItems?: Array<{
      itemId: string
      quantity: number
      label?: string
    }>
  }

  export interface OnlineVisualRoomShellCollaborationRole {
    id: string
    label: string
    ownerLabel: string
    summary: string
    statusLabel?: string
    actionLabel?: string
  }

  export interface OnlineVisualRoomShellCollaborationFeedback {
    id: string
    label: string
    summary?: string
    tone?: 'default' | 'success' | 'warning'
  }

  export interface OnlineVisualRoomShellCollaborationSignal {
    id: string
    label: string
    tone?: 'default' | 'success' | 'warning'
  }

  type OnlineVisualRoomShellCollaborationBeat = {
    id: 'roles' | 'action' | 'combo' | 'reward'
    label: string
    value: string
    summary: string
    tone?: 'default' | 'success' | 'warning'
  }
  type OnlineVisualRoomShellRoleLaneId = 'gather' | 'escort' | 'submit' | 'support'
  type OnlineVisualRoomShellRoleLane = {
    id: OnlineVisualRoomShellRoleLaneId
    label: string
    ownerLabel: string
    statusLabel: string
    summary: string
    nextActionLabel: string
    covered: boolean
  }
  type OnlineVisualRoomShellLiveHighlight = {
    id: 'recent-action' | 'combo' | 'score'
    kindLabel: string
    title: string
    valueLabel: string
    summary: string
    tone?: 'default' | 'success' | 'warning'
  }

  export interface OnlineVisualRoomShellTacticalHud {
    nextActionLabel: string
    nextActionSummary: string
    roleGapLabel: string
    rewardCashoutLabel: string
    urgencyLabel?: string
    progressLabel?: string
    progressPercent?: number
    items?: Array<{
      id: string
      label: string
      value: string
      tone?: 'default' | 'success' | 'warning'
    }>
  }
  type OnlineVisualRoomShellTacticalHudItemTone = NonNullable<OnlineVisualRoomShellTacticalHud['items']>[number]['tone']

  const props = withDefaults(defineProps<{
    title: string
    subtitle: string
    statusLabel: string
    phaseLabel?: string
    stateReason?: string
    connectionState?: 'online' | 'disconnected' | 'reconnecting' | 'conflict'
    conflictMessage?: string
    actionFeedback?: string
    errorMessages?: string[]
    permissionHints?: string[]
    focusHints?: string[]
    focusGuideSummary?: string
    visualContentLabel?: string
    fallbackEntryLabel?: string
    fallbackEntryHint?: string
    fallbackEntryVisible?: boolean
    countdownSeconds?: number
    countdownRemainingSeconds?: number
    members: OnlineVisualRoomShellMember[]
    readyMemberCount: number
    joinedMemberCount?: number
    memberLimit: number
    rewardPreview: string[]
    settlementRecords?: OnlineVisualRoomShellSettlementRecord[]
    collaborationProgressLabel?: string
    collaborationProgressPercent?: number
    collaborationScoreLabel?: string
    collaborationSignals?: OnlineVisualRoomShellCollaborationSignal[]
    collaborationRoles?: OnlineVisualRoomShellCollaborationRole[]
    collaborationFeedback?: OnlineVisualRoomShellCollaborationFeedback[]
    tacticalHud?: OnlineVisualRoomShellTacticalHud | null
  }>(), {
    phaseLabel: '',
    stateReason: '',
    connectionState: 'online',
    conflictMessage: '',
    actionFeedback: '',
    errorMessages: () => [],
    permissionHints: () => [],
    focusHints: () => [
      'Tab 切换到成员、地图节点、赛道格或场景物件。',
      'Enter 或 Space 触发当前聚焦按钮，行动结果会回到房间反馈区。',
    ],
    focusGuideSummary: '可视化房间保留原按钮键盘操作，并把行动结果、失败原因和权限提示固定在房间顶部。',
    visualContentLabel: '可视化棋盘、场景或轨道作为主要入口；备用操作会在需要时保留。',
    fallbackEntryLabel: '备用操作',
    fallbackEntryHint: '当主要入口暂时不可用或没有可选动作时，玩家仍可继续提交同一行动。',
    fallbackEntryVisible: false,
    countdownSeconds: 0,
    countdownRemainingSeconds: 0,
    settlementRecords: () => [],
    collaborationProgressLabel: '',
    collaborationProgressPercent: 0,
    collaborationScoreLabel: '',
    collaborationSignals: () => [],
    collaborationRoles: () => [],
    collaborationFeedback: () => [],
    tacticalHud: null,
  })

  const normalizedStatus = computed(() => props.statusLabel.toLowerCase())
  const getRewardItemLabel = (item: { itemId: string; label?: string }) =>
    item.label || getItemById(item.itemId)?.name || item.itemId
  const statusClass = computed(() => {
    if (normalizedStatus.value.includes('结算') || normalizedStatus.value.includes('完成')) return 'border-success/30 bg-success/10 text-success'
    if (normalizedStatus.value.includes('倒计时') || normalizedStatus.value.includes('准备')) return 'border-warning/30 bg-warning/10 text-warning'
    if (normalizedStatus.value.includes('关闭') || normalizedStatus.value.includes('断线')) return 'border-danger/30 bg-danger/10 text-danger'
    return 'border-accent/20 bg-accent/10 text-accent'
  })

  const countdownLabel = computed(() => {
    const remaining = props.countdownRemainingSeconds || props.countdownSeconds
    if (!remaining || remaining <= 0) return ''
    return `倒计时 ${remaining} 秒`
  })

  const connectionLabel = computed(() => {
    if (props.connectionState === 'disconnected') return '连接已断开，可在重连窗口内恢复房间状态。'
    if (props.connectionState === 'reconnecting') return '正在等待重连确认，操作会以最新房间状态为准。'
    if (props.connectionState === 'conflict') return '房间状态需要刷新确认，请刷新后再提交操作。'
    return ''
  })

  const connectionClass = computed(() => {
    if (props.connectionState === 'conflict' || props.connectionState === 'disconnected') return 'text-danger'
    if (props.connectionState === 'reconnecting') return 'text-warning'
    return 'text-muted'
  })

  const fallbackEntryStatus = computed(() =>
    props.fallbackEntryVisible ? '备用入口当前可用' : '主可视化入口优先'
  )

  const showCollaborationPanel = computed(() =>
    Boolean(props.collaborationProgressLabel)
      || props.collaborationSignals.length > 0
      || props.collaborationRoles.length > 0
      || props.collaborationFeedback.length > 0
  )
  const showTeamPulse = computed(() => showCollaborationPanel.value || Boolean(props.tacticalHud))
  const collaborationSignalClass = (tone: OnlineVisualRoomShellCollaborationSignal['tone'] = 'default') => {
    if (tone === 'success') return 'border-success/25 bg-success/10 text-success'
    if (tone === 'warning') return 'border-warning/25 bg-warning/10 text-warning'
    return 'border-accent/15 bg-accent/5 text-muted'
  }
  const collaborationRhythmBeatClass = (tone: OnlineVisualRoomShellCollaborationBeat['tone'] = 'default') => {
    if (tone === 'success') return 'border-success/20 bg-success/5'
    if (tone === 'warning') return 'border-warning/20 bg-warning/5'
    return ''
  }
  const tacticalItemClass = (tone: OnlineVisualRoomShellTacticalHudItemTone = 'default') => {
    if (tone === 'success') return 'border-success/20 bg-success/5'
    if (tone === 'warning') return 'border-warning/20 bg-warning/5'
    return ''
  }
  const collaborationLiveHighlightClass = (tone: OnlineVisualRoomShellLiveHighlight['tone'] = 'default') => {
    if (tone === 'success') return 'border-success/20 bg-success/5'
    if (tone === 'warning') return 'border-warning/20 bg-warning/5'
    return ''
  }
  const safeCollaborationProgressPercent = computed(() =>
    Math.max(0, Math.min(100, Math.round(Number(props.collaborationProgressPercent) || 0)))
  )
  const safeTacticalProgressPercent = computed(() =>
    Math.max(0, Math.min(100, Math.round(Number(props.tacticalHud?.progressPercent ?? props.collaborationProgressPercent) || 0)))
  )
  const collaborationFeedbackLabel = computed(() => {
    const firstFeedback = props.collaborationFeedback[0]
    if (!firstFeedback) return ''
    return [firstFeedback.label, firstFeedback.summary].filter(Boolean).join(' · ')
  })
  const findCollaborationSignalByKeyword = (keywords: string[]) =>
    props.collaborationSignals.find(signal => keywords.some(keyword => signal.label.includes(keyword)))
  const collaborationSignalLabelByKeyword = (keywords: string[]) =>
    findCollaborationSignalByKeyword(keywords)?.label || ''
  const findCollaborationFeedbackByKeyword = (keywords: string[]) =>
    props.collaborationFeedback.find(entry =>
      keywords.some(keyword => [entry.label, entry.summary || ''].join(' ').includes(keyword))
    )
  const teammateLiveHighlights = computed<OnlineVisualRoomShellLiveHighlight[]>(() => {
    const highlights: OnlineVisualRoomShellLiveHighlight[] = []
    const firstFeedback = props.collaborationFeedback[0]
    if (firstFeedback) {
      highlights.push({
        id: 'recent-action',
        kindLabel: '最近行动',
        title: firstFeedback.label || '队友行动',
        valueLabel: firstFeedback.tone === 'warning' ? '需关注' : '已推进',
        summary: firstFeedback.summary || '队友行动已写入本局协作记录。',
        tone: firstFeedback.tone || 'success',
      })
    }
    const comboSignal = findCollaborationSignalByKeyword(['连携', '加成'])
    const comboFeedback = findCollaborationFeedbackByKeyword(['连携', '加成', '组合收益'])
    if (comboSignal || comboFeedback) {
      highlights.push({
        id: 'combo',
        kindLabel: '连携加成',
        title: comboSignal?.label || comboFeedback?.label || '队伍达成连携',
        valueLabel: comboSignal?.tone === 'warning' || comboFeedback?.tone === 'warning' ? '待补位' : '已触发',
        summary: comboFeedback?.summary || comboSignal?.label || '队友行动已触发加成或连携收益。',
        tone: comboSignal?.tone || comboFeedback?.tone || 'success',
      })
    }
    const scoreSignal = findCollaborationSignalByKeyword(['评分', '活跃'])
    if (props.collaborationScoreLabel || scoreSignal) {
      highlights.push({
        id: 'score',
        kindLabel: '协作评分',
        title: props.collaborationScoreLabel || scoreSignal?.label || '今日协作评分提升',
        valueLabel: scoreSignal?.tone === 'warning' ? '待提升' : '已计入',
        summary: scoreSignal?.label || '今日协作评分会随队友行动、分工覆盖和连携反馈提升。',
        tone: scoreSignal?.tone || (props.collaborationScoreLabel ? 'success' : 'default'),
      })
    }
    return highlights.slice(0, 3)
  })
  const teammateLiveFeedSummary = computed(() =>
    `${teammateLiveHighlights.value.length}/3 条高光`
  )
  const roleLaneDefinitions: Array<{
    id: OnlineVisualRoomShellRoleLaneId
    label: string
    keywords: string[]
    fallbackSummary: string
    fallbackAction: string
  }> = [
    {
      id: 'gather',
      label: '采集',
      keywords: ['采集', '供品', '备料', '资源', '探索', '路线标记'],
      fallbackSummary: '负责采集、备料、探索节点和补足队伍资源。',
      fallbackAction: '下一步：找可采集、可探索或可备料的行动。',
    },
    {
      id: 'escort',
      label: '护送/战斗',
      keywords: ['护送', '战斗', '控场', '风险', '遭遇', '秩序', '安全'],
      fallbackSummary: '负责护送安全、遭遇处理、现场控场和风险压制。',
      fallbackAction: '下一步：优先处理风险、护送、遭遇或控场事件。',
    },
    {
      id: 'submit',
      label: '加工/提交',
      keywords: ['加工', '提交', '订单', '整备', '补给', '合成', '目标'],
      fallbackSummary: '负责加工、提交订单、交付目标和整理补给。',
      fallbackAction: '下一步：把已备资源交到目标、订单或撤离节点。',
    },
    {
      id: 'support',
      label: '加成/支援',
      keywords: ['加成', '支援', '连携', '补位', '纪念', '记录', '留影', '降低失败'],
      fallbackSummary: '负责触发加成、支援队友、补位和保留回看成果。',
      fallbackAction: '下一步：寻找加成、支援、连携或补位行动。',
    },
  ]
  const roleMatchesLane = (role: OnlineVisualRoomShellCollaborationRole, keywords: string[]) => {
    const haystack = [role.id, role.label, role.summary, role.actionLabel || ''].join(' ')
    return keywords.some(keyword => haystack.includes(keyword))
  }
  const roleIsUnclaimed = (role: OnlineVisualRoomShellCollaborationRole) =>
    role.ownerLabel.includes('待认领') || role.statusLabel === '待认领'
  const collaborationRoleLanes = computed<OnlineVisualRoomShellRoleLane[]>(() => {
    if (props.collaborationRoles.length === 0) return []
    const usedRoleIds = new Set<string>()
    return roleLaneDefinitions.map((definition, index) => {
      const matchedRole = props.collaborationRoles.find(role =>
        !usedRoleIds.has(role.id) && roleMatchesLane(role, definition.keywords)
      ) ?? props.collaborationRoles.find(role => !usedRoleIds.has(role.id) && props.collaborationRoles.indexOf(role) === index)
      if (matchedRole) usedRoleIds.add(matchedRole.id)
      const covered = Boolean(matchedRole && !roleIsUnclaimed(matchedRole))
      return {
        id: definition.id,
        label: definition.label,
        ownerLabel: matchedRole?.ownerLabel || '待认领',
        statusLabel: covered ? (matchedRole?.statusLabel || '已覆盖') : '待补位',
        summary: matchedRole?.summary || definition.fallbackSummary,
        nextActionLabel: matchedRole?.actionLabel || definition.fallbackAction,
        covered,
      }
    })
  })
  const collaborationRoleLaneSummary = computed(() => {
    const coveredCount = collaborationRoleLanes.value.filter(lane => lane.covered).length
    return `${coveredCount}/${collaborationRoleLanes.value.length} 岗位已覆盖`
  })
  const collaborationMobileLabel = computed(() => {
    if (props.tacticalHud) return `${props.tacticalHud.nextActionLabel} · ${props.tacticalHud.roleGapLabel} · ${collaborationRoleLaneSummary.value}`
    if (props.collaborationProgressLabel) return `${props.collaborationProgressLabel} · ${collaborationRoleLaneSummary.value}`
    if (props.collaborationSignals.length > 0) return props.collaborationSignals[0]?.label || '已有协作态势'
    if (props.collaborationRoles.length > 0) return `已分工 ${props.collaborationRoles.length} 项 · ${collaborationRoleLaneSummary.value}`
    if (props.collaborationFeedback.length > 0) return props.collaborationFeedback[0]?.summary || props.collaborationFeedback[0]?.label || '已有协作反馈'
    return '等待协作信息'
  })
  const collaborationRhythmBeats = computed<OnlineVisualRoomShellCollaborationBeat[]>(() => {
    const missingRoles = props.collaborationRoles.filter(role => role.ownerLabel.includes('待认领') || role.statusLabel === '待认领')
    const roleSummary = missingRoles.length > 0
      ? `还缺 ${missingRoles.slice(0, 2).map(role => role.label).join(' / ')}，先补齐队伍职责。`
      : props.collaborationRoles.length > 0
        ? '采集、护送/控场、加工/提交、加成/支援已有人跟进。'
        : '等待成员加入后分配采集、护送、加工和支援。'
    const comboSignal = collaborationSignalLabelByKeyword(['连携', '加成'])
    const scoreSignal = collaborationSignalLabelByKeyword(['评分', '活跃'])
    const rewardValue = props.tacticalHud?.rewardCashoutLabel
      || (props.settlementRecords.length > 0 ? `${props.settlementRecords.length} 条回看` : props.rewardPreview[0] || '待推进')
    return [
      {
        id: 'roles',
        label: '分工',
        value: props.tacticalHud?.roleGapLabel || (missingRoles.length > 0 ? `缺 ${missingRoles.length} 项` : props.collaborationRoles.length > 0 ? '已覆盖' : '待认领'),
        summary: roleSummary,
        tone: missingRoles.length > 0 || props.collaborationRoles.length === 0 ? 'warning' : 'success',
      },
      {
        id: 'action',
        label: '行动',
        value: props.tacticalHud?.nextActionLabel || props.phaseLabel || '看下一步',
        summary: props.tacticalHud?.nextActionSummary || props.collaborationProgressLabel || '共同进度会随队友行动实时推进。',
        tone: props.tacticalHud?.urgencyLabel ? 'warning' : 'default',
      },
      {
        id: 'combo',
        label: '连携',
        value: comboSignal || scoreSignal || '待触发',
        summary: collaborationFeedbackLabel.value || '队友完成采集、触发加成或达成连携后会写入即时反馈。',
        tone: comboSignal || props.collaborationFeedback.length > 0 ? 'success' : 'default',
      },
      {
        id: 'reward',
        label: '领奖',
        value: rewardValue,
        summary: props.settlementRecords.length > 0
          ? '结算回看已生成，可复盘贡献并继续领奖或再来一局。'
          : props.rewardPreview[0] || '推进目标后会显示奖励预览、失败保底和回看记录。',
        tone: props.settlementRecords.length > 0 || props.tacticalHud?.rewardCashoutLabel === '现在可落袋' ? 'success' : 'default',
      },
    ]
  })
  const collaborationRhythmMobileLabel = computed(() =>
    collaborationRhythmBeats.value.map(beat => `${beat.label}:${beat.value}`).join(' · ')
  )
  const teamPulseItems = computed<OnlineVisualRoomShellCollaborationBeat[]>(() => {
    const beats = collaborationRhythmBeats.value
    return [
      beats.find(beat => beat.id === 'action'),
      beats.find(beat => beat.id === 'roles'),
      beats.find(beat => beat.id === 'combo'),
      beats.find(beat => beat.id === 'reward'),
    ].filter((beat): beat is OnlineVisualRoomShellCollaborationBeat => Boolean(beat))
  })
  const teamPulseScoreLabel = computed(() =>
    props.collaborationScoreLabel || props.tacticalHud?.urgencyLabel || `${props.readyMemberCount}/${readyMemberDenominator.value} 已准备`
  )
  const teamPulseProgressPercent = computed(() =>
    Math.max(0, Math.min(100, Math.round(Number(props.tacticalHud?.progressPercent ?? props.collaborationProgressPercent) || 0)))
  )
  const teamPulseSummary = computed(() => {
    const actionBeat = teamPulseItems.value.find(beat => beat.id === 'action')
    const roleBeat = teamPulseItems.value.find(beat => beat.id === 'roles')
    const comboBeat = teamPulseItems.value.find(beat => beat.id === 'combo')
    return [
      actionBeat ? `下一步：${actionBeat.value}` : '',
      roleBeat ? `分工：${roleBeat.value}` : '',
      comboBeat ? `连携：${comboBeat.value}` : '',
      props.collaborationProgressLabel || props.tacticalHud?.progressLabel || '',
    ].filter(Boolean).join(' · ')
  })

  const mobileFeedbackLabel = computed(() => {
    if (teammateLiveHighlights.value.length > 0) {
      const firstHighlight = teammateLiveHighlights.value[0]
      return `${firstHighlight.kindLabel}：${firstHighlight.title}`
    }
    if (props.actionFeedback) return props.actionFeedback
    if (props.conflictMessage) return props.conflictMessage
    if (connectionLabel.value) return connectionLabel.value
    if (props.stateReason) return props.stateReason
    if (props.errorMessages.length > 0) return props.errorMessages[0]
    if (props.permissionHints.length > 0) return props.permissionHints[0]
    return '暂无新的行动反馈'
  })

  const mobileReplayLabel = computed(() => {
    const firstRecord = props.settlementRecords[0]
    if (firstRecord) {
      return `${props.settlementRecords.length} 条 · ${firstRecord.replayLabel || firstRecord.summary || firstRecord.targetLabel}`
    }
    if (props.rewardPreview.length > 0) return `奖励预览 ${props.rewardPreview.length} 项`
    return '结算后会显示回看记录'
  })

  const mobileReadbackRows = computed(() => [
    {
      id: 'status',
      label: '状态',
      value: props.phaseLabel ? `${props.statusLabel || '未载入'} · ${props.phaseLabel}` : (props.statusLabel || '未载入'),
      valueClass: 'text-accent',
    },
    {
      id: 'entry',
      label: '入口',
      value: props.visualContentLabel,
      valueClass: 'text-muted',
    },
    {
      id: 'collaboration',
      label: '协作',
      value: collaborationMobileLabel.value,
      valueClass: showCollaborationPanel.value ? 'text-accent' : 'text-muted',
    },
    {
      id: 'rhythm',
      label: '节奏',
      value: collaborationRhythmMobileLabel.value,
      valueClass: showCollaborationPanel.value ? 'text-accent' : 'text-muted',
    },
    {
      id: 'fallback',
      label: '备用入口',
      value: `${fallbackEntryStatus.value} · ${props.fallbackEntryLabel}`,
      valueClass: props.fallbackEntryVisible ? 'text-warning' : 'text-muted',
    },
    {
      id: 'feedback',
      label: '反馈',
      value: mobileFeedbackLabel.value,
      valueClass: props.actionFeedback ? 'text-success' : props.conflictMessage || props.errorMessages.length > 0 ? 'text-danger' : 'text-muted',
    },
    {
      id: 'replay',
      label: '回看',
      value: mobileReplayLabel.value,
      valueClass: props.settlementRecords.length > 0 ? 'text-success' : 'text-muted',
    },
  ])

  const readyMemberDenominator = computed(() => {
    const joinedCount = props.joinedMemberCount ?? props.memberLimit
    return Math.max(props.readyMemberCount, Math.min(props.memberLimit || joinedCount || 0, joinedCount))
  })

  const screenReaderSummary = computed(() => {
    const parts = [`${props.title}，状态 ${props.statusLabel || '未载入'}`]
    if (props.phaseLabel) parts.push(`阶段 ${props.phaseLabel}`)
    if (countdownLabel.value) parts.push(countdownLabel.value)
    parts.push(`成员 ${props.readyMemberCount}/${readyMemberDenominator.value} 已准备`)
    if (showCollaborationPanel.value) {
      parts.push(`协作推进 ${props.collaborationProgressLabel || `${props.collaborationRoles.length} 项分工`}`)
      if (collaborationRoleLanes.value.length > 0) parts.push(`四岗位协作线 ${collaborationRoleLaneSummary.value}`)
      parts.push(`协作节奏 ${collaborationRhythmMobileLabel.value}`)
      if (teammateLiveHighlights.value.length > 0) parts.push(`队友动态 ${teammateLiveHighlights.value.map(item => `${item.kindLabel}:${item.title}`).join('，')}`)
      if (props.collaborationFeedback.length > 0) parts.push(`协作反馈 ${props.collaborationFeedback[0]?.label || ''}`)
    }
    if (props.tacticalHud) parts.push(`本局战术 ${props.tacticalHud.nextActionLabel}，${props.tacticalHud.roleGapLabel}，${props.tacticalHud.rewardCashoutLabel}`)
    parts.push(`奖励预览 ${props.rewardPreview.length} 项`)
    if (props.settlementRecords.length > 0) parts.push(`结算回看 ${props.settlementRecords.length} 条`)
    parts.push(`入口 ${props.visualContentLabel}`)
    parts.push(`${props.fallbackEntryLabel}${props.fallbackEntryVisible ? '当前可见' : '作为备用保留'}`)
    if (connectionLabel.value) parts.push(connectionLabel.value)
    if (props.actionFeedback) parts.push(`最近反馈：${props.actionFeedback}`)
    if (props.errorMessages.length > 0) parts.push(`错误 ${props.errorMessages.length} 条`)
    if (props.permissionHints.length > 0) parts.push(`权限提示 ${props.permissionHints.length} 条`)
    return parts.join('。')
  })
</script>
