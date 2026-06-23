<template>
  <component
    :is="wizardShell"
    v-bind="wizardShellProps"
    @close="handleClose"
    @cancel="handleCancel"
  >
    <div class="space-y-3" data-testid="online-room-wizard">
      <ol class="grid grid-cols-4 gap-1.5 text-[0.625rem] leading-4" aria-label="创建房间步骤">
        <li
          v-for="(step, index) in steps"
          :key="step.id"
          class="border px-2 py-1.5"
          :class="index === currentStepIndex ? 'border-accent/50 bg-accent/10 text-accent' : 'border-accent/10 text-muted'"
        >
          <span class="block truncate">{{ index + 1 }}. {{ step.label }}</span>
        </li>
      </ol>

      <Transition name="tab-panel-switch" mode="out-in">
      <div :key="activeStepId">
      <section
        v-if="activeStepId === 'gameplay'"
        class="space-y-3"
        data-testid="online-room-wizard-step-gameplay"
        aria-labelledby="online-room-wizard-step-gameplay-title"
      >
        <div class="min-w-0">
          <p id="online-room-wizard-step-gameplay-title" class="text-sm leading-5 text-accent">
            {{ domainCopy.gameplayTitle }}
          </p>
          <p class="mt-1 text-xs leading-5 text-muted">{{ domainCopy.gameplaySummary }}</p>
        </div>

        <div class="grid gap-2 sm:grid-cols-2">
          <button
            v-for="template in templateOptions"
            :key="template.id"
            type="button"
            class="game-panel-muted min-h-[96px] p-3 text-left transition-colors"
            :class="selectedTemplateId === template.id ? 'border-accent/60 bg-accent/10' : 'hover:border-accent/35'"
            :data-testid="`online-room-wizard-template-${template.id}`"
            @click="selectTemplate(template.id)"
          >
            <span class="flex items-center justify-between gap-2">
              <span class="truncate text-xs leading-5 text-accent">{{ template.label }}</span>
              <CheckCircle v-if="selectedTemplateId === template.id" :size="14" class="shrink-0 text-accent" />
            </span>
            <span class="mt-1 block text-[0.625rem] leading-4 text-muted">{{ template.summary }}</span>
            <span class="mt-2 block text-[0.625rem] leading-4 text-muted">
              {{ memberLimitText(template) }}
            </span>
            <span class="mt-2 grid gap-1 text-[0.625rem] leading-4" data-testid="online-room-wizard-template-play-hooks">
              <span class="border border-accent/10 bg-black/10 px-2 py-1 text-muted">{{ templatePlayHint(template) }}</span>
              <span class="border border-accent/10 bg-black/10 px-2 py-1 text-muted">{{ templateEventHint(template) }}</span>
              <span class="border border-accent/10 bg-black/10 px-2 py-1 text-accent">{{ templateRewardHint(template) }}</span>
            </span>
          </button>
        </div>
      </section>

      <section
        v-else-if="activeStepId === 'config'"
        class="space-y-3"
        data-testid="online-room-wizard-step-config"
        aria-labelledby="online-room-wizard-step-config-title"
      >
        <div>
          <p id="online-room-wizard-step-config-title" class="text-sm leading-5 text-accent">
            {{ domainCopy.configTitle }}
          </p>
          <p class="mt-1 text-xs leading-5 text-muted">{{ domainCopy.configSummary }}</p>
        </div>

        <label class="block">
          <span class="text-[0.625rem] leading-4 text-muted">{{ domainCopy.titleLabel }}</span>
          <input
            v-model="draftTitle"
            class="online-input mt-1 w-full"
            data-testid="online-room-wizard-title-input"
            :placeholder="defaultRoomTitle"
            :disabled="busy"
            @input="titleTouched = true"
          />
        </label>

        <label class="block">
          <span class="text-[0.625rem] leading-4 text-muted">{{ domainCopy.modeLabel }}</span>
          <select
            v-model="selectedGameplayId"
            class="online-select mt-1 w-full"
            data-testid="online-room-wizard-gameplay-select"
            :disabled="busy"
          >
            <option v-for="gameplay in recommendedGameplayOptions" :key="gameplay.id" :value="gameplay.id">
              {{ gameplay.label }}
            </option>
          </select>
        </label>

        <div class="space-y-1.5">
          <p class="text-[0.625rem] leading-4 text-muted">{{ domainCopy.memberLimitLabel }}</p>
          <div class="grid grid-cols-2 gap-1.5 sm:grid-cols-4" data-testid="online-room-wizard-member-limit-group">
            <button
              v-for="limit in currentMemberLimitOptions"
              :key="limit"
              type="button"
              class="online-action-btn online-action-btn--compact min-h-[44px] justify-center"
              :class="draftMemberLimit === limit ? 'online-action-btn--primary' : ''"
              :data-testid="`online-room-wizard-member-limit-${limit}`"
              :disabled="busy"
              @click="draftMemberLimit = limit"
            >
              <Users :size="13" />
              {{ limit }} 人
            </button>
          </div>
        </div>

        <div class="space-y-1.5">
          <p class="text-[0.625rem] leading-4 text-muted">{{ domainCopy.visibilityLabel }}</p>
          <div class="grid grid-cols-2 gap-1.5" data-testid="online-room-wizard-visibility-group">
            <button
              type="button"
              class="online-action-btn online-action-btn--compact min-h-[44px] justify-center"
              :class="visibility === 'public' ? 'online-action-btn--primary' : ''"
              data-testid="online-room-wizard-visibility-public"
              :disabled="busy"
              @click="visibility = 'public'"
            >
              <Eye :size="13" />
              公开可见
            </button>
            <button
              type="button"
              class="online-action-btn online-action-btn--compact min-h-[44px] justify-center"
              :class="visibility === 'private' ? 'online-action-btn--primary' : ''"
              data-testid="online-room-wizard-visibility-private"
              :disabled="busy"
              @click="visibility = 'private'"
            >
              <EyeOff :size="13" />
              仅邀请
            </button>
          </div>
        </div>
      </section>

      <section
        v-else-if="activeStepId === 'invite'"
        class="space-y-3"
        data-testid="online-room-wizard-step-invite"
        aria-labelledby="online-room-wizard-step-invite-title"
      >
        <section v-if="inviteCandidateGroups.length > 0" class="space-y-2" aria-labelledby="online-room-wizard-invite-candidates-title">
          <div class="flex items-center justify-between gap-2">
            <p id="online-room-wizard-invite-candidates-title" class="text-[0.625rem] leading-4 text-muted">可直接选择</p>
            <span class="text-[0.625rem] leading-4 text-muted">{{ selectableInviteCandidateCount }} 人可选</span>
          </div>
          <div class="space-y-3" data-testid="online-room-wizard-invite-candidates">
            <section
              v-for="group in inviteCandidateGroups"
              :key="group.id"
              class="space-y-2"
              :data-testid="`online-room-wizard-invite-candidate-group-${group.id}`"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-[0.625rem] leading-4 text-accent">{{ group.label }}</p>
                <span class="text-[0.625rem] leading-4 text-muted">{{ group.players.length }} 人</span>
              </div>
              <div class="grid gap-2 sm:grid-cols-2">
                <button
                  v-for="player in group.players"
                  :key="inviteCandidateKey(player)"
                  type="button"
                  class="game-panel-muted min-h-[60px] p-2 text-left transition-colors"
                  :class="inviteCandidateButtonClass(player)"
                  :disabled="busy || !isInviteCandidateSelectable(player)"
                  :aria-pressed="isInviteCandidateSelected(player)"
                  :data-testid="`online-room-wizard-invite-candidate-${inviteCandidateKey(player)}`"
                  @click="addInviteCandidate(player)"
                >
                  <span class="flex min-w-0 items-start justify-between gap-2">
                    <span class="min-w-0">
                      <span class="block truncate text-xs leading-5 text-accent">{{ player.displayName || player.username }}</span>
                      <span class="mt-0.5 block truncate text-[0.625rem] leading-4 text-muted">
                        {{ player.reason || player.subtitle || player.username }}
                      </span>
                    </span>
                    <span class="shrink-0 border border-accent/15 px-1.5 py-0.5 text-[0.625rem] leading-4 text-muted">
                      {{ inviteCandidateStatusLabel(player) }}
                    </span>
                  </span>
                </button>
              </div>
            </section>
          </div>
        </section>

        <div>
          <p id="online-room-wizard-step-invite-title" class="text-sm leading-5 text-accent">邀请成员</p>
          <p class="mt-1 text-xs leading-5 text-muted">可以先创建房间，也可以稍后在房间里继续邀请。</p>
        </div>

        <label class="block">
          <span class="text-[0.625rem] leading-4 text-muted">玩家用户名</span>
          <textarea
            v-model="inviteInput"
            class="online-textarea mt-1 w-full"
            data-testid="online-room-wizard-invite-input"
            :disabled="busy"
            placeholder="可以用空格、逗号或换行分隔"
          />
        </label>
        <button
          type="button"
          class="online-action-btn online-action-btn--compact min-h-[44px] w-full justify-center"
          data-testid="online-room-wizard-invite-add"
          :disabled="busy || parsedInviteNames.length === 0"
          @click="addInviteNames"
        >
          <UserPlus :size="13" />
          加入邀请名单
        </button>

        <ul class="grid gap-1.5" data-testid="online-room-wizard-invite-list" role="list">
          <li
            v-for="name in inviteUsernames"
            :key="name"
            class="flex min-w-0 items-center justify-between gap-2 border border-accent/10 bg-black/10 px-2 py-1.5 text-[0.625rem] leading-4 text-muted"
          >
            <span class="truncate">{{ name }}</span>
            <button
              type="button"
              class="online-action-btn online-action-btn--compact"
              :data-testid="`online-room-wizard-invite-remove-${name}`"
              :disabled="busy"
              @click="removeInviteName(name)"
            >
              移除
            </button>
          </li>
          <li v-if="inviteUsernames.length === 0" class="border border-accent/10 bg-black/10 px-2 py-2 text-[0.625rem] leading-4 text-muted">
            暂不邀请也可以继续创建。
          </li>
        </ul>
      </section>

      <section
        v-else-if="activeStepId === 'review'"
        class="space-y-3"
        data-testid="online-room-wizard-step-review"
        aria-labelledby="online-room-wizard-step-review-title"
      >
        <div>
          <p id="online-room-wizard-step-review-title" class="text-sm leading-5 text-accent">确认创建</p>
          <p class="mt-1 text-xs leading-5 text-muted">确认后开始创建，若没有成功，已填写内容会保留。</p>
        </div>

        <dl class="grid gap-2 text-[0.625rem] leading-4" data-testid="online-room-wizard-review-summary">
          <div class="game-panel-muted p-2">
            <dt class="text-muted">{{ domainCopy.reviewRoomLabel }}</dt>
            <dd class="mt-1 text-xs text-accent">{{ submitDraft.title }}</dd>
          </div>
          <div class="game-panel-muted p-2">
            <dt class="text-muted">玩法</dt>
            <dd class="mt-1 text-xs text-accent">{{ selectedTemplate?.label || '未选择' }} · {{ selectedGameplay?.label || '未选择' }}</dd>
          </div>
          <div class="game-panel-muted p-2">
            <dt class="text-muted">成员</dt>
            <dd class="mt-1 text-xs text-accent">{{ submitDraft.memberLimit }} 人上限 · 邀请 {{ submitDraft.inviteUsernames.length }} 人</dd>
          </div>
          <div class="game-panel-muted p-2">
            <dt class="text-muted">可见性</dt>
            <dd class="mt-1 text-xs text-accent">{{ visibility === 'public' ? '公开可见' : '仅邀请' }}</dd>
          </div>
        </dl>

        <div v-if="domain === 'expedition'" class="border border-warning/20 bg-warning/5 p-2 text-[0.625rem] leading-5 text-muted" data-testid="online-room-wizard-expedition-rules">
          <p class="text-accent">撤离规则</p>
          <p class="mt-1">远征中途可按玩法规则提前收尾；奖励会按队伍进度、风险和撤离状态结算。</p>
        </div>
        <div class="border border-accent/10 bg-black/10 p-2 text-[0.625rem] leading-5 text-muted" data-testid="online-room-wizard-reward-preview">
          <p class="text-accent">{{ domainCopy.rewardPreviewTitle }}</p>
          <p class="mt-1">{{ selectedGameplay?.summary || selectedTemplate?.summary || domainCopy.rewardPreviewSummary }}</p>
        </div>
      </section>
      </div>
      </Transition>
    </div>

    <template #footer>
      <div class="space-y-3">
        <p v-if="stepError" class="text-[0.625rem] leading-4 text-danger" data-testid="online-room-wizard-step-error">
          {{ stepError }}
        </p>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="online-action-btn online-action-btn--compact justify-center"
            data-testid="online-room-wizard-cancel"
            :disabled="busy"
            @click="handleCancel"
          >
            取消
          </button>
          <button
            v-if="currentStepIndex > 0"
            type="button"
            class="online-action-btn online-action-btn--compact justify-center"
            data-testid="online-room-wizard-back"
            :disabled="busy"
            @click="goBack"
          >
            <ArrowLeft :size="13" />
            上一步
          </button>
          <button
            v-if="activeStepId !== 'review'"
            type="button"
            class="online-action-btn online-action-btn--compact online-action-btn--primary justify-center"
            data-testid="online-room-wizard-next"
            :disabled="busy || !canContinue"
            @click="goNext"
          >
            下一步
            <ArrowRight :size="13" />
          </button>
          <button
            v-else
            type="button"
            class="online-action-btn online-action-btn--compact online-action-btn--primary justify-center"
            data-testid="online-room-wizard-submit"
            :disabled="busy || !canSubmit"
            @click="handleSubmit"
          >
            <Send :size="13" />
            {{ busy ? '创建中' : domainCopy.submitLabel }}
          </button>
        </div>
      </div>
    </template>
  </component>
</template>

<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import { ArrowLeft, ArrowRight, CheckCircle, Eye, EyeOff, Send, UserPlus, Users } from 'lucide-vue-next'
  import OnlineActionDialog from './OnlineActionDialog.vue'
  import OnlineBottomSheet from './OnlineBottomSheet.vue'

  export type OnlineRoomWizardDomain = 'festival' | 'expedition'
  export type OnlineRoomVisibility = 'public' | 'private'
  export type OnlineRoomWizardInviteCandidateGroup = 'online-friends' | 'friends' | 'recent' | 'recommended' | 'blocked' | 'other'

  export type OnlineRoomWizardOption = {
    id: string
    label: string
    summary?: string
    default_member_limit?: number
    min_member_limit?: number
    max_member_limit?: number
    defaultMemberLimit?: number
    minMemberLimit?: number
    maxMemberLimit?: number
    recommended_gameplay_template_ids?: string[]
    recommendedGameplayTemplateIds?: string[]
    recommended_room_template_ids?: string[]
  }

  export type OnlineRoomWizardInviteCandidate = {
    id?: string
    username: string
    displayName?: string
    subtitle?: string
    disabled?: boolean
    reason?: string
    group?: OnlineRoomWizardInviteCandidateGroup
    groupLabel?: string
  }

  export type OnlineRoomWizardDraft = {
    domain: OnlineRoomWizardDomain
    templateId: string
    gameplayId: string
    memberLimit: number
    title: string
    visibility: OnlineRoomVisibility
    inviteUsernames: string[]
  }

  type WizardStepId = 'gameplay' | 'config' | 'invite' | 'review'
  type NormalizedWizardOption = {
    id: string
    label: string
    summary: string
    defaultMemberLimit: number
    minMemberLimit: number
    maxMemberLimit: number
    recommendedGameplayIds: string[]
    recommendedRoomTemplateIds: string[]
  }

  const props = withDefaults(defineProps<{
    open: boolean
    domain: OnlineRoomWizardDomain
    initialTemplateId?: string
    initialGameplayId?: string
    initialMemberLimit?: number
    initialTitle?: string
    initialVisibility?: OnlineRoomVisibility | boolean
    templates?: OnlineRoomWizardOption[]
    gameplayTemplates?: OnlineRoomWizardOption[]
    memberLimitOptions?: number[]
    inviteCandidates?: OnlineRoomWizardInviteCandidate[]
    busy?: boolean
    errorMessage?: string
  }>(), {
    initialTemplateId: '',
    initialGameplayId: '',
    initialMemberLimit: 0,
    initialTitle: '',
    initialVisibility: 'public',
    templates: () => [],
    gameplayTemplates: () => [],
    memberLimitOptions: () => [],
    inviteCandidates: () => [],
    busy: false,
    errorMessage: '',
  })

  const emit = defineEmits<{
    submit: [draft: OnlineRoomWizardDraft]
    cancel: []
    close: []
    'draft-change': [draft: OnlineRoomWizardDraft]
  }>()

  const steps: Array<{ id: WizardStepId; label: string }> = [
    { id: 'gameplay', label: '玩法' },
    { id: 'config', label: '配置' },
    { id: 'invite', label: '邀请' },
    { id: 'review', label: '确认' },
  ]

  const fallbackFestivalTemplates: OnlineRoomWizardOption[] = [
    { id: 'lantern_fair', label: '上元灯会', summary: '灯谜竞猜、点灯和花灯巡游集中在同一个热闹短局里。', default_member_limit: 4, min_member_limit: 2, max_member_limit: 8, recommended_gameplay_template_ids: ['quiz_buzz', 'assembly'] },
    { id: 'dragon_boat', label: '端午赛舟', summary: '多人赛舟，按船位和行动节奏推进名次。', default_member_limit: 4, min_member_limit: 2, max_member_limit: 8, recommended_gameplay_template_ids: ['squad_coop', 'gathering'] },
    { id: 'laba_cookpot', label: '腊八共煮', summary: '合备食材和火候，完成节令共灶。', default_member_limit: 4, min_member_limit: 2, max_member_limit: 6, recommended_gameplay_template_ids: ['assembly', 'gathering'] },
    { id: 'mid_autumn_moonwatch', label: '中秋赏月', summary: '组织赏月、合照和公共展示，完成节会纪念。', default_member_limit: 4, min_member_limit: 2, max_member_limit: 6, recommended_gameplay_template_ids: ['public_progress', 'group_photo'] },
  ]

  const fallbackExpeditionTemplates: OnlineRoomWizardOption[] = [
    { id: 'cavern_duo', label: '双人矿洞', summary: '一人探路一人采集，控制风险并可提前撤离。', default_member_limit: 2, min_member_limit: 2, max_member_limit: 2, recommended_gameplay_template_ids: ['expedition_cavern'] },
    { id: 'cavern_quartet', label: '四人矿洞', summary: '四人分工采集、路线标记和危机处理。', default_member_limit: 4, min_member_limit: 2, max_member_limit: 4, recommended_gameplay_template_ids: ['expedition_cavern', 'expedition_escort'] },
    { id: 'escort_convoy', label: '资源护送', summary: '沿路线护送货物，处理风险格和抵运完整度。', default_member_limit: 4, min_member_limit: 2, max_member_limit: 4, recommended_gameplay_template_ids: ['expedition_escort'] },
    { id: 'sea_probe', label: '海域共探', summary: '共同探索海域节点，带回发现与资源。', default_member_limit: 4, min_member_limit: 2, max_member_limit: 4, recommended_gameplay_template_ids: ['expedition_sea'] },
  ]

  const fallbackFestivalGameplay: OnlineRoomWizardOption[] = [
    { id: 'quiz_buzz', label: '灯谜抢答', summary: '2-5 分钟短局，抢答、整理题签和观众秩序会一起影响结算。' },
    { id: 'assembly', label: '花灯拼装', summary: '多人拼装花灯或灶台，部件进度会立刻显示。' },
    { id: 'squad_coop', label: '协作共建', summary: '成员分工行动，合计推进目标。' },
    { id: 'public_progress', label: '公共进度', summary: '所有成员贡献进入同一个进度目标。' },
  ]

  const fallbackExpeditionGameplay: OnlineRoomWizardOption[] = [
    { id: 'expedition_roles', label: '分工远征', summary: '按职责行动，风险、资源和撤离状态会影响结算。' },
    { id: 'expedition_cavern', label: '协作矿洞', summary: '分工采集、路线标记和危机处理都会写入共享进度。' },
    { id: 'expedition_escort', label: '资源护送', summary: '2-5 分钟短局，护送里程、货物完整度和途中事件共同结算。' },
    { id: 'expedition_gathering', label: '协作采集', summary: '把采集、稀有发现和包裹同步做成多人回合。' },
  ]

  const currentStepIndex = ref(0)
  const selectedTemplateId = ref('')
  const selectedGameplayId = ref('')
  const draftMemberLimit = ref(0)
  const draftTitle = ref('')
  const titleTouched = ref(false)
  const visibility = ref<OnlineRoomVisibility>('public')
  const inviteInput = ref('')
  const inviteUsernames = ref<string[]>([])
  const isCompactViewport = ref(false)
  let viewportQuery: MediaQueryList | null = null

  const domainCopy = computed(() => props.domain === 'festival'
    ? {
        title: '创建节会房间',
        description: '选择节会玩法、人数和邀请名单。',
        gameplayTitle: '选择节会玩法',
        gameplaySummary: '先确定这次节会的现场主题，后续配置会继续围绕它展开。',
        configTitle: '配置节会房间',
        configSummary: '填写标题、人数和玩法模式，失败后也能继续调整。',
        titleLabel: '房间标题',
        modeLabel: '玩法模式',
        memberLimitLabel: '人数上限',
        visibilityLabel: '公开可见',
        reviewRoomLabel: '节会房间',
        rewardPreviewTitle: '奖励预览',
        rewardPreviewSummary: '奖励会按节会玩法和成员贡献记录。',
        submitLabel: '创建节会房间',
      }
    : {
        title: '创建远征队伍',
        description: '选择路线模板、风险玩法和邀请名单。',
        gameplayTitle: '选择远征路线',
        gameplaySummary: '先确定这次远征的路线类型，后续配置会继续围绕它展开。',
        configTitle: '配置远征队伍',
        configSummary: '填写队伍标题、人数和风险玩法，失败后也能继续调整。',
        titleLabel: '队伍标题',
        modeLabel: '风险玩法',
        memberLimitLabel: '人数上限',
        visibilityLabel: '队伍可见性',
        reviewRoomLabel: '远征队伍',
        rewardPreviewTitle: '撤离与奖励预览',
        rewardPreviewSummary: '奖励会按路线进度、风险和撤离状态记录。',
        submitLabel: '创建远征队伍',
      })

  const normalizeVisibility = (value: OnlineRoomVisibility | boolean): OnlineRoomVisibility => {
    if (typeof value === 'boolean') return value ? 'public' : 'private'
    return value === 'private' ? 'private' : 'public'
  }

  const normalizeOption = (option: OnlineRoomWizardOption): NormalizedWizardOption => {
    const defaultMemberLimit = Math.max(1, Math.floor(option.default_member_limit ?? option.defaultMemberLimit ?? 4))
    const minMemberLimit = Math.max(1, Math.floor(option.min_member_limit ?? option.minMemberLimit ?? defaultMemberLimit))
    const maxMemberLimit = Math.max(minMemberLimit, Math.floor(option.max_member_limit ?? option.maxMemberLimit ?? defaultMemberLimit))
    return {
      id: option.id,
      label: option.label,
      summary: option.summary || '',
      defaultMemberLimit,
      minMemberLimit,
      maxMemberLimit,
      recommendedGameplayIds: option.recommended_gameplay_template_ids ?? option.recommendedGameplayTemplateIds ?? [],
      recommendedRoomTemplateIds: option.recommended_room_template_ids ?? [],
    }
  }

  const templateOptions = computed(() => {
    const source = props.templates.length > 0
      ? props.templates
      : props.domain === 'festival'
        ? fallbackFestivalTemplates
        : fallbackExpeditionTemplates
    return source.map(normalizeOption)
  })

  const gameplayOptions = computed(() => {
    const source = props.gameplayTemplates.length > 0
      ? props.gameplayTemplates
      : props.domain === 'festival'
        ? fallbackFestivalGameplay
        : fallbackExpeditionGameplay
    return source.map(normalizeOption)
  })

  const selectedTemplate = computed(() => templateOptions.value.find(template => template.id === selectedTemplateId.value) ?? templateOptions.value[0] ?? null)
  const selectedGameplay = computed(() => gameplayOptions.value.find(gameplay => gameplay.id === selectedGameplayId.value) ?? gameplayOptions.value[0] ?? null)
  const recommendedGameplayOptions = computed(() => {
    const template = selectedTemplate.value
    if (!template) return gameplayOptions.value
    const recommendedIds = new Set(template.recommendedGameplayIds)
    const recommended = gameplayOptions.value.filter(gameplay =>
      recommendedIds.has(gameplay.id) || gameplay.recommendedRoomTemplateIds.includes(template.id)
    )
    return recommended.length > 0 ? recommended : gameplayOptions.value
  })

  const currentMemberLimitOptions = computed(() => {
    if (props.memberLimitOptions.length > 0) {
      return [...new Set(props.memberLimitOptions.map(limit => Math.max(1, Math.floor(limit))))].sort((left, right) => left - right)
    }
    const template = selectedTemplate.value
    if (!template) return [Math.max(1, draftMemberLimit.value || 4)]
    const baseOptions = [2, 4, 6, 8].filter(limit => limit >= template.minMemberLimit && limit <= template.maxMemberLimit)
    return [...new Set([...baseOptions, template.defaultMemberLimit])].sort((left, right) => left - right)
  })

  const normalizedMemberLimit = computed(() => {
    const options = currentMemberLimitOptions.value
    if (options.includes(draftMemberLimit.value)) return draftMemberLimit.value
    return options.reduce((nearest, option) =>
      Math.abs(option - draftMemberLimit.value) < Math.abs(nearest - draftMemberLimit.value) ? option : nearest,
    options[0] ?? 2)
  })

  const defaultRoomTitle = computed(() => selectedTemplate.value
    ? `${selectedTemplate.value.label}${props.domain === 'festival' ? '房间' : '队伍'}`
    : domainCopy.value.title)

  const activeStepId = computed<WizardStepId>(() => steps[currentStepIndex.value]?.id ?? 'gameplay')
  const wizardShell = computed(() => isCompactViewport.value ? OnlineBottomSheet : OnlineActionDialog)
  const wizardShellProps = computed(() => isCompactViewport.value
    ? {
        open: props.open,
        title: domainCopy.value.title,
        description: domainCopy.value.description,
        side: 'bottom',
        closeOnBackdrop: false,
      }
    : {
        open: props.open,
        title: domainCopy.value.title,
        description: domainCopy.value.description,
        tone: 'default',
        closeOnBackdrop: false,
      })

  const submitDraft = computed<OnlineRoomWizardDraft>(() => ({
    domain: props.domain,
    templateId: selectedTemplateId.value,
    gameplayId: selectedGameplayId.value,
    memberLimit: normalizedMemberLimit.value,
    title: draftTitle.value.trim() || defaultRoomTitle.value,
    visibility: visibility.value,
    inviteUsernames: [...inviteUsernames.value],
  }))

  const parsedInviteNames = computed(() => inviteInput.value
    .split(/[\s,，]+/g)
    .map(name => name.trim())
    .filter(Boolean)
    .filter((name, index, names) => names.indexOf(name) === index && !inviteUsernames.value.includes(name)))

  const inviteCandidateGroupLabels: Record<OnlineRoomWizardInviteCandidateGroup, string> = {
    'online-friends': '在线好友',
    friends: '好友',
    recent: '近期玩家',
    recommended: '推荐队友',
    blocked: '不可邀请',
    other: '其他',
  }
  const inviteCandidateGroupOrder: OnlineRoomWizardInviteCandidateGroup[] = ['online-friends', 'friends', 'recent', 'recommended', 'other', 'blocked']
  const normalizeInviteName = (value = '') => value.trim().toLowerCase()
  const inviteCandidateKey = (player: OnlineRoomWizardInviteCandidate) =>
    player.id || player.username || player.displayName || 'unknown'
  const isInviteCandidateSelected = (player: OnlineRoomWizardInviteCandidate) => {
    const keys = [player.username, player.displayName].map(value => normalizeInviteName(value || '')).filter(Boolean)
    return inviteUsernames.value.some(name => keys.includes(normalizeInviteName(name)))
  }
  const isInviteCandidateSelectable = (player: OnlineRoomWizardInviteCandidate) =>
    Boolean(player.username.trim()) && !player.disabled && !isInviteCandidateSelected(player)
  const inviteCandidateStatusLabel = (player: OnlineRoomWizardInviteCandidate) => {
    if (isInviteCandidateSelected(player)) return '已加入'
    if (player.disabled) return player.reason || '不可邀请'
    if (player.group === 'online-friends') return '在线'
    if (player.group === 'recent') return '近期'
    return '选择'
  }
  const inviteCandidateButtonClass = (player: OnlineRoomWizardInviteCandidate) => ({
    'border-accent/60 bg-accent/10': isInviteCandidateSelected(player),
    'opacity-60': player.disabled,
    'hover:border-accent/35': isInviteCandidateSelectable(player),
  })
  const selectableInviteCandidateCount = computed(() =>
    props.inviteCandidates.filter(isInviteCandidateSelectable).length
  )
  const inviteCandidateGroups = computed(() => {
    const buckets = new Map<OnlineRoomWizardInviteCandidateGroup, OnlineRoomWizardInviteCandidate[]>()
    const seen = new Set<string>()
    for (const candidate of props.inviteCandidates) {
      const username = candidate.username.trim()
      if (!username) continue
      const key = normalizeInviteName(username)
      if (!key || seen.has(key)) continue
      seen.add(key)
      const group = candidate.group ?? 'other'
      const list = buckets.get(group) ?? []
      list.push(candidate)
      buckets.set(group, list)
    }
    return inviteCandidateGroupOrder
      .map(group => ({
        id: group,
        label: buckets.get(group)?.[0]?.groupLabel || inviteCandidateGroupLabels[group],
        players: buckets.get(group) ?? [],
      }))
      .filter(group => group.players.length > 0)
  })

  const canContinue = computed(() => {
    if (activeStepId.value === 'gameplay') return Boolean(selectedTemplate.value)
    if (activeStepId.value === 'config') return Boolean(submitDraft.value.title && selectedGameplay.value && normalizedMemberLimit.value)
    return true
  })

  const canSubmit = computed(() =>
    Boolean(selectedTemplate.value && selectedGameplay.value && submitDraft.value.title && submitDraft.value.memberLimit)
  )

  const stepError = computed(() => {
    if (props.errorMessage) return props.errorMessage
    if (activeStepId.value === 'gameplay' && !selectedTemplate.value) return '请先选择玩法'
    if (activeStepId.value === 'config' && !submitDraft.value.title) return '请填写标题'
    if (activeStepId.value === 'config' && !selectedGameplay.value) return '请选择玩法模式'
    return ''
  })

  const selectTemplate = (templateId: string) => {
    selectedTemplateId.value = templateId
    if (!titleTouched.value) draftTitle.value = defaultRoomTitle.value
    ensureGameplaySelection()
    ensureMemberLimit()
  }

  const memberLimitText = (template: NormalizedWizardOption) => {
    if (template.minMemberLimit === template.maxMemberLimit) return `${template.defaultMemberLimit} 人上限`
    return `${template.minMemberLimit}-${template.maxMemberLimit} 人`
  }
  const templatePlayHint = (template: NormalizedWizardOption) => {
    if (template.id === 'lantern_fair') return '短局：灯谜竞猜 / 点灯 / 花灯巡游'
    if (template.id === 'escort_convoy') return '短局：资源护送 / 途中事件 / 抵运结算'
    if (template.id.includes('cavern')) return '短局：路线标记 / 分工采集 / 提前撤离'
    if (template.id === 'laba_cookpot') return '短局：备料 / 火候 / 共灶收尾'
    if (template.id === 'dragon_boat') return '短局：同步划桨 / 稳舵 / 冲刺'
    return '短局：2-5 分钟完成一轮协作'
  }
  const templateEventHint = (template: NormalizedWizardOption) => {
    if (template.id === 'lantern_fair') return '事件：NPC 乱入、灯谜连发、花灯缠线'
    if (template.id === 'escort_convoy') return '事件：天气、破车、夜巡和隐藏目标'
    if (template.id.includes('cavern')) return '事件：岔路、坍塌、稀有矿脉'
    if (template.id === 'sea_probe') return '事件：海况变化、航线分歧、海货发现'
    return '事件：季节限定、随机插曲、隐藏目标'
  }
  const templateRewardHint = (template: NormalizedWizardOption) => {
    if (template.id === 'escort_convoy') return '奖励：远征材料、护送评分、失败保底友情点'
    if (template.id === 'lantern_fair') return '奖励：节会票券、纪念册、失败保底协作经验'
    if (template.id.includes('cavern')) return '奖励：矿材、稀有样本、撤离记录'
    return '奖励：每日小奖 + 本周进度 + 纪念记录'
  }

  const ensureGameplaySelection = () => {
    const options = recommendedGameplayOptions.value
    if (options.some(gameplay => gameplay.id === selectedGameplayId.value)) return
    selectedGameplayId.value = options[0]?.id ?? ''
  }

  const ensureMemberLimit = () => {
    draftMemberLimit.value = normalizedMemberLimit.value
  }

  const resetDraft = () => {
    currentStepIndex.value = 0
    selectedTemplateId.value = props.initialTemplateId || templateOptions.value[0]?.id || ''
    ensureGameplaySelection()
    selectedGameplayId.value = props.initialGameplayId || recommendedGameplayOptions.value[0]?.id || gameplayOptions.value[0]?.id || ''
    draftMemberLimit.value = props.initialMemberLimit || selectedTemplate.value?.defaultMemberLimit || currentMemberLimitOptions.value[0] || 4
    draftTitle.value = props.initialTitle || defaultRoomTitle.value
    titleTouched.value = Boolean(props.initialTitle)
    visibility.value = normalizeVisibility(props.initialVisibility)
    inviteInput.value = ''
    inviteUsernames.value = []
    ensureMemberLimit()
  }

  const goBack = () => {
    currentStepIndex.value = Math.max(0, currentStepIndex.value - 1)
  }

  const goNext = () => {
    if (!canContinue.value) return
    currentStepIndex.value = Math.min(steps.length - 1, currentStepIndex.value + 1)
  }

  const addInviteNames = () => {
    if (parsedInviteNames.value.length === 0) return
    inviteUsernames.value = [...inviteUsernames.value, ...parsedInviteNames.value]
    inviteInput.value = ''
  }

  const addInviteCandidate = (player: OnlineRoomWizardInviteCandidate) => {
    if (!isInviteCandidateSelectable(player)) return
    inviteUsernames.value = [...inviteUsernames.value, player.username.trim()]
  }

  const removeInviteName = (name: string) => {
    inviteUsernames.value = inviteUsernames.value.filter(item => item !== name)
  }

  const handleSubmit = () => {
    if (!canSubmit.value || props.busy) return
    emit('submit', submitDraft.value)
  }

  const handleCancel = () => {
    emit('cancel')
    emit('close')
  }

  const handleClose = () => {
    emit('close')
  }

  const updateViewportMode = () => {
    isCompactViewport.value = Boolean(viewportQuery?.matches)
  }

  watch(
    () => props.open,
    async isOpen => {
      if (!isOpen) return
      resetDraft()
      await nextTick()
      emit('draft-change', submitDraft.value)
    }
  )

  watch(
    () => [templateOptions.value, gameplayOptions.value, props.domain],
    () => {
      if (!props.open) return
      if (!templateOptions.value.some(template => template.id === selectedTemplateId.value)) {
        selectedTemplateId.value = templateOptions.value[0]?.id || ''
      }
      ensureGameplaySelection()
      ensureMemberLimit()
    }
  )

  watch(
    () => selectedTemplateId.value,
    () => {
      if (!props.open) return
      if (!titleTouched.value) draftTitle.value = defaultRoomTitle.value
      ensureGameplaySelection()
      ensureMemberLimit()
    }
  )

  watch(
    () => submitDraft.value,
    draft => {
      if (props.open) emit('draft-change', draft)
    },
    { deep: true }
  )

  onMounted(() => {
    if (typeof window === 'undefined') return
    viewportQuery = window.matchMedia('(max-width: 767px)')
    updateViewportMode()
    viewportQuery.addEventListener('change', updateViewportMode)
  })

  onBeforeUnmount(() => {
    viewportQuery?.removeEventListener('change', updateViewportMode)
  })
</script>
