<template>
  <div ref="mailViewRoot">
    <GuidanceDigestPanel surface-id="mail" title="活动邮件引导" />

    <div class="grid gap-3 md:grid-cols-[260px,minmax(0,1fr)]">
      <section class="panel-box" :class="!isDesktop && activeMail ? 'hidden' : ''">
        <div class="flex items-center justify-between mb-2">
          <Divider label="邮箱" />
          <span class="text-[10px] text-muted">未读 {{ mailboxStore.unreadCount }}</span>
        </div>
        <div class="detail-card mb-3">
          <div class="flex items-center justify-between mb-1">
            <p class="text-xs text-accent">周路线 / 邮件摘要</p>
            <span class="text-[10px] text-muted">可领 {{ claimableMailCount }}</span>
          </div>
          <p class="text-[10px] text-muted leading-4">
            {{ goalStore.currentEventCampaign ? `当前活动：${goalStore.currentEventCampaign.label}` : `当前主路线：${weeklyPlanSnapshot.primaryRouteLabel}` }}
          </p>
          <p class="text-[10px] text-accent mt-1">
            活动邮件 {{ activityMailCount }} 封 · 周纪行 {{ latestWeeklyChronicle ? latestWeeklyChronicle.weekId : '待生成' }}
          </p>
          <div class="border border-accent/10 rounded-xs px-2 py-2 mt-2 bg-bg/10">
            <p class="text-[10px] text-muted">本周主路线</p>
            <p class="text-[10px] text-accent mt-1 leading-4">
              {{ weeklyPlanSnapshot.primaryRouteLabel }}：{{ weeklyPlanSnapshot.primaryRouteSummary }}
            </p>
            <p v-if="weeklyPlanSnapshot.secondaryRouteLabels.length > 0" class="text-[10px] text-muted mt-1 leading-4">
              辅助路线：{{ weeklyPlanSnapshot.secondaryRouteLabels.join('、') }}
            </p>
            <p v-if="currentEventMailTemplateTitles.length > 0" class="text-[10px] text-muted mt-1 leading-4">
              本周邮件节奏：{{ currentEventMailTemplateTitles.join('、') }}
            </p>
          </div>
          <div class="border border-success/10 rounded-xs px-2 py-2 mt-2 bg-success/5">
            <p class="text-[10px] text-muted">当前可领奖点</p>
            <p class="text-[10px] text-accent mt-1 leading-4">
              {{ weeklyPlanSnapshot.claimableNodeLabels.length > 0 ? weeklyPlanSnapshot.claimableNodeLabels.join('、') : '当前没有待领取的路线节点，可优先推进本周主路线。' }}
            </p>
            <p v-if="claimableActivityMailCount > 0" class="text-[10px] text-muted mt-1 leading-4">
              当前有 {{ claimableActivityMailCount }} 封活动奖励邮件可领取。
            </p>
            <p v-if="questStore.currentLimitedTimeQuestCampaign" class="text-[10px] text-muted mt-1 leading-4">
              限时任务：{{ questStore.currentLimitedTimeQuestCampaign.label }} · 剩余 {{ questStore.currentLimitedTimeQuestRemainingDays }} 天
            </p>
          </div>
          <div class="border border-warning/10 rounded-xs px-2 py-2 mt-2 bg-warning/5">
            <p class="text-[10px] text-muted">下周准备</p>
            <p class="text-[10px] text-accent mt-1 leading-4">
              {{ weeklyPlanSnapshot.nextWeekPrepSummary }}
            </p>
            <p v-if="previewMailTemplateTitles.length > 0" class="text-[10px] text-muted mt-1 leading-4">
              预计邮件：{{ previewMailTemplateTitles.join('、') }}
            </p>
          </div>
          <div v-if="latestWeeklyChronicle" class="border border-accent/10 rounded-xs px-2 py-2 mt-2 bg-bg/10">
            <p class="text-[10px] text-muted">最近周纪行</p>
            <p class="text-[10px] text-accent mt-1 leading-4">{{ latestWeeklyChronicle.settlementSummary }}</p>
            <p v-if="latestWeeklyChronicle.highlightSummaries.length > 0" class="text-[10px] text-muted mt-1 leading-4">
              本周高光：{{ latestWeeklyChronicle.highlightSummaries.join('、') }}
            </p>
          </div>
        </div>
        <div class="flex flex-col space-y-1.5 mb-3">
          <Button class="w-full justify-center" :icon="RefreshCw" :icon-size="12" :disabled="mailboxStore.loading" @click="refreshMails">
            刷新邮件
          </Button>
          <Button class="w-full justify-center" :icon="Inbox" :icon-size="12" :disabled="claimAllPending" @click="claimAllRewards">
            一键领取
          </Button>
          <Button class="w-full justify-center" :icon="Trash2" :icon-size="12" :disabled="clearClaimedPending" @click="clearClaimed">
            清空已领取
          </Button>
        </div>

        <div v-if="mailboxStore.mails.length === 0" class="empty-box">
          <Mail :size="30" class="text-accent/20 mb-2" />
          <p class="text-xs text-muted">暂无邮件</p>
        </div>

        <button
          v-for="mail in mailboxStore.mails"
          :key="mail.id"
          class="mail-item"
          :class="{ 'mail-item-active': activeMailId === mail.id }"
          @click="selectMail(mail.id)"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="text-xs text-text truncate">
                <span v-if="mail.unread" class="text-accent">[新]</span>
                {{ mail.title }}
              </p>
              <p class="text-[10px] text-muted line-clamp-2">{{ mail.preview }}</p>
            </div>
            <span class="status-badge" :class="statusClass(mail.claim_status)">{{ statusLabel(mail.claim_status) }}</span>
          </div>
          <div class="mt-1 flex items-center justify-between text-[10px] text-muted">
            <span>{{ formatTime(mail.sent_at) }}</span>
            <span v-if="mail.has_rewards">奖励 {{ mail.reward_count }}</span>
            <span v-else>公告</span>
          </div>
        </button>
      </section>

      <section class="panel-box detail-box" :class="!isDesktop && !activeMail ? 'hidden' : ''">
        <template v-if="activeMail">
          <div v-if="!isDesktop" class="flex items-center justify-between gap-2 mb-3">
            <Button class="justify-center shrink-0" :icon="ChevronLeft" :icon-size="12" @click="backToMailList">
              返回列表
            </Button>
            <div class="flex gap-2">
              <Button class="justify-center shrink-0" :icon="ChevronLeft" :icon-size="12" :disabled="!hasPrevMail" @click="selectAdjacentMail(-1)">
                上一封
              </Button>
              <Button class="justify-center shrink-0" :icon="ChevronRight" :icon-size="12" :disabled="!hasNextMail" @click="selectAdjacentMail(1)">
                下一封
              </Button>
            </div>
          </div>

          <div class="flex items-start justify-between gap-2 mb-3">
            <div class="min-w-0">
              <p class="text-sm text-accent truncate">{{ activeMail.title }}</p>
              <div class="flex flex-wrap gap-1 mt-1">
                <span class="status-badge" :class="statusClass(activeMail.claim_status)">{{ statusLabel(activeMail.claim_status) }}</span>
                <span class="status-badge" :class="activeMail.unread ? 'badge-muted' : 'badge-read'">
                  {{ activeMail.unread ? '未读' : '已读' }}
                </span>
                <span v-if="activeMail.template_type" class="status-badge badge-muted">{{ templateLabel(activeMail.template_type) }}</span>
              </div>
            </div>
            <span class="text-[10px] text-muted text-right">
              <span class="block">发送 {{ formatTime(activeMail.sent_at) }}</span>
              <span v-if="activeMail.expires_at" class="block">到期 {{ formatTime(activeMail.expires_at) }}</span>
            </span>
          </div>

          <div class="detail-card mb-3 whitespace-pre-wrap text-xs leading-relaxed">{{ activeMail.content || '暂无正文' }}</div>

          <div class="detail-card mb-3">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs text-accent">奖励内容</p>
              <span v-if="activeMail.duplicate_compensation_money > 0" class="text-[10px] text-muted">
                重复装备补偿 {{ activeMail.duplicate_compensation_money }} 文
              </span>
            </div>
            <div v-if="activeMail.rewards.length > 0" class="flex flex-col space-y-1">
              <div v-for="(reward, index) in activeMail.rewards" :key="`${reward.type}-${reward.id}-${index}`" class="reward-row">
                <span class="text-xs">{{ rewardLabel(reward) }}</span>
              </div>
            </div>
            <p v-else class="text-xs text-muted">这是一封纯文字公告</p>
          </div>

          <div v-if="activeMail.claim_result" class="detail-card mb-3">
            <p class="text-xs text-accent mb-2">领取记录</p>
            <p class="text-[11px] text-muted mb-1">已入账 {{ activeMail.claim_result.money_added }} 文</p>
            <p v-if="activeMail.claim_result.applied_rewards.length > 0" class="text-[11px] text-muted mb-1">
              发放 {{ activeMail.claim_result.applied_rewards.length }} 条
            </p>
            <p v-if="activeMail.claim_result.skipped_rewards.length > 0" class="text-[11px] text-warning">
              跳过 {{ activeMail.claim_result.skipped_rewards.length }} 条重复装备
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <Button
              v-if="activeMail.can_claim"
              class="justify-center"
              :icon="Gift"
              :icon-size="12"
              :disabled="claimCurrentPending"
              @click="claimCurrentMail"
            >
              领取奖励
            </Button>
            <Button v-else class="justify-center" disabled>
              {{ activeMail.claim_status === 'claimed' ? '已领取' : activeMail.claim_status === 'expired' ? '已过期' : '无奖励' }}
            </Button>
          </div>
        </template>

        <div v-else class="empty-box">
          <MailOpen :size="32" class="text-accent/20 mb-2" />
          <p class="text-xs text-muted">请选择一封邮件查看详情</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
  import { useMailboxStore } from '@/stores/useMailboxStore'
  import { useGoalStore } from '@/stores/useGoalStore'
  import { useQuestStore } from '@/stores/useQuestStore'
  import { getItemById } from '@/data/items'
  import { getWeaponById } from '@/data/weapons'
  import { getRingById } from '@/data/rings'
  import { getHatById } from '@/data/hats'
  import { getShoeById } from '@/data/shoes'
  import { showFloat } from '@/composables/useGameLog'
  import { Mail, MailOpen, RefreshCw, Inbox, Trash2, Gift, ChevronLeft, ChevronRight } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import Divider from '@/components/game/Divider.vue'
  import GuidanceDigestPanel from '@/components/game/GuidanceDigestPanel.vue'
  import type { MailClaimSyncState, TaoyuanMailDetail, TaoyuanMailReward, TaoyuanMailSummary } from '@/stores/useMailboxStore'

  const mailboxStore = useMailboxStore()
  const goalStore = useGoalStore()
  const questStore = useQuestStore()
  const weeklyPlanSnapshot = computed(() => goalStore.weeklyPlanSnapshot)
  const latestWeeklyChronicle = computed(() => goalStore.latestWeeklyChronicleEntry)
  const activeMailId = ref<string | null>(null)
  const activeMail = ref<TaoyuanMailDetail | null>(null)
  const selectRequestId = ref(0)
  const claimCurrentPending = ref(false)
  const claimAllPending = ref(false)
  const clearClaimedPending = ref(false)
  const mailViewRoot = ref<HTMLElement | null>(null)
  const isDesktop = ref(typeof window === 'undefined' ? true : window.innerWidth >= 768)
  const claimableMailCount = computed(() => mailboxStore.mails.filter(mail => mail.can_claim).length)
  const isActivityMailTemplate = (templateType?: string | null) =>
    ['activity_reward', 'activity_notice', 'activity_midweek', 'activity_preview'].includes(String(templateType || ''))
  const activityMailCount = computed(() => mailboxStore.mails.filter(mail => isActivityMailTemplate(mail.template_type)).length)
  const claimableActivityMailCount = computed(() => mailboxStore.mails.filter(mail => mail.can_claim && mail.template_type === 'activity_reward').length)
  const currentEventMailTemplateTitles = computed(() => {
    if (!goalStore.currentEventCampaign) return []
    return goalStore.eventMailTemplateRefs
      .filter(template => goalStore.currentEventCampaign?.mailboxTemplateIds.includes(template.id))
      .map(template => template.title)
  })
  const previewMailTemplateTitles = computed(() => {
    const templateIds = goalStore.eventMailTemplateRefs
      .filter(template => template.cadenceSlot === 'preview')
      .map(template => template.title)
    return templateIds.slice(0, 2)
  })
  const activeMailIndex = computed(() => mailboxStore.mails.findIndex(mail => mail.id === activeMailId.value))
  const hasPrevMail = computed(() => activeMailIndex.value > 0)
  const hasNextMail = computed(() => activeMailIndex.value >= 0 && activeMailIndex.value < mailboxStore.mails.length - 1)
  const isEventMailReceiptKey = (value: string) => value.startsWith('event_')
  const isActivityWindowMailReceiptKey = (value: string) => value.startsWith('activity_window_')
  const updateViewportMode = () => {
    if (typeof window === 'undefined') return
    isDesktop.value = window.innerWidth >= 768
  }
  const scrollMailViewToTop = () => {
    mailViewRoot.value?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  const syncActivityRewardMailState = (mail: TaoyuanMailSummary | TaoyuanMailDetail | null | undefined) => {
    if (!mail || mail.template_type !== 'activity_reward' || !mail.is_claimed) return
    if (typeof mail.campaign_id === 'string' && isEventMailReceiptKey(mail.campaign_id)) {
      goalStore.markEventCampaignMailClaimed(mail.campaign_id)
    }
    if (typeof mail.id === 'string' && typeof mail.campaign_id === 'string' && isActivityWindowMailReceiptKey(mail.campaign_id)) {
      questStore.markActivityRewardMailClaimed(mail.id)
    }
  }

  const syncClaimedActivityRewardMails = () => {
    for (const mail of mailboxStore.mails) {
      syncActivityRewardMailState(mail)
    }
  }

  const rewardLabel = (reward: TaoyuanMailReward) => {
    if (reward.type === 'money') return `桃源乡铜钱 x${reward.amount ?? 0}`
    if (reward.type === 'item' || reward.type === 'seed') {
      const item = getItemById(reward.id || '')
      return `${item?.name ?? reward.id} x${reward.quantity ?? 0}`
    }
    if (reward.type === 'weapon') return `${getWeaponById(reward.id || '')?.name ?? reward.id} x${reward.quantity ?? 0}`
    if (reward.type === 'ring') return `${getRingById(reward.id || '')?.name ?? reward.id} x${reward.quantity ?? 0}`
    if (reward.type === 'hat') return `${getHatById(reward.id || '')?.name ?? reward.id} x${reward.quantity ?? 0}`
    if (reward.type === 'shoe') return `${getShoeById(reward.id || '')?.name ?? reward.id} x${reward.quantity ?? 0}`
    return reward.id || reward.type
  }

  const formatTime = (timestamp?: number | null) => {
    if (!timestamp) return '长期保留'
    return new Date(timestamp * 1000).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const statusLabel = (status: string) => {
    if (status === 'claimable') return '可领取'
    if (status === 'claimed') return '已领取'
    if (status === 'expired') return '已过期'
    return '公告'
  }

  const statusClass = (status: string) => {
    if (status === 'claimable') return 'badge-claimable'
    if (status === 'claimed') return 'badge-claimed'
    if (status === 'expired') return 'badge-expired'
    return 'badge-muted'
  }

  const templateLabel = (templateType: string) => {
    if (templateType === 'compensation') return '补偿'
    if (templateType === 'activity_reward') return '活动'
    if (templateType === 'activity_notice') return '开启'
    if (templateType === 'activity_midweek') return '周中'
    if (templateType === 'activity_preview') return '预告'
    if (templateType === 'weekly_recap') return '周纪行'
    if (templateType === 'maintenance_notice') return '维护'
    return templateType
  }

  const formatSlotLabels = (slots: number[]) => slots.map(slot => `槽位${slot + 1}`).join('、')

  const resolveClaimSyncFeedback = (syncState?: MailClaimSyncState | null) => {
    if (!syncState) return { text: '奖励领取完成', type: 'success' as const }
    if (syncState.reason === 'synced') {
      return { text: '奖励已同步到当前服务端存档', type: 'success' as const }
    }
    if (syncState.reason === 'no_save_slot') {
      return { text: '奖励领取完成，但这批邮件没有写入存档槽位', type: 'accent' as const }
    }

    const claimedSlotsText = syncState.claimed_save_slots.length > 0
      ? formatSlotLabels(syncState.claimed_save_slots)
      : '服务端存档'

    if (syncState.reason === 'current_session_not_server') {
      return {
        text: `奖励已写入${claimedSlotsText}，当前运行中不是服务端存档，需切换后手动载入查看`,
        type: 'accent' as const
      }
    }
    if (syncState.reason === 'no_active_session_slot') {
      return {
        text: `奖励已写入${claimedSlotsText}，但当前没有已载入的服务端存档，请手动载入对应槽位查看`,
        type: 'accent' as const
      }
    }
    if (syncState.reason === 'current_session_slot_mismatch') {
      return {
        text: `奖励已写入${claimedSlotsText}，当前会话仍停留在槽位${(syncState.current_session_slot ?? -1) + 1}，未自动切换`,
        type: 'accent' as const
      }
    }
    return {
      text: `奖励已写入${claimedSlotsText}，但当前服务端存档刷新失败，请手动重新载入查看`,
      type: 'accent' as const
    }
  }

  const ensureSelection = async () => {
    if (!mailboxStore.mails.length) {
      activeMailId.value = null
      activeMail.value = null
      return
    }
    if (mailboxStore.mails.some(item => item.id === activeMailId.value)) {
      await selectMail(activeMailId.value!)
      return
    }
    if (!isDesktop.value && !activeMailId.value) {
      activeMail.value = null
      return
    }
    await selectMail(mailboxStore.mails[0]!.id)
  }

  const refreshMails = async () => {
    try {
      await mailboxStore.refreshList()
      syncClaimedActivityRewardMails()
      await ensureSelection()
    } catch (error: any) {
      showFloat(error?.message || '刷新邮箱失败', 'danger')
    }
  }

  const selectMail = async (id: string) => {
    const previousActiveMailId = activeMailId.value
    const previousActiveMail = activeMail.value
    const requestId = ++selectRequestId.value
    try {
      const detail = await mailboxStore.openMail(id)
      if (requestId !== selectRequestId.value) return
      activeMailId.value = id
      activeMail.value = detail
      if (!isDesktop.value) scrollMailViewToTop()
    } catch (error: any) {
      if (requestId !== selectRequestId.value) return
      activeMailId.value = previousActiveMailId
      activeMail.value = previousActiveMail
      showFloat(error?.message || '读取邮件失败', 'danger')
    }
  }

  const backToMailList = () => {
    activeMailId.value = null
    activeMail.value = null
    if (!isDesktop.value) scrollMailViewToTop()
  }

  const selectAdjacentMail = async (offset: -1 | 1) => {
    const nextMail = mailboxStore.mails[activeMailIndex.value + offset]
    if (!nextMail) return
    await selectMail(nextMail.id)
  }

  const claimCurrentMail = async () => {
    if (claimCurrentPending.value || !activeMail.value?.id) return
    claimCurrentPending.value = true
    try {
      const data = await mailboxStore.claimMail(activeMail.value.id)
      activeMail.value = data.mail
      activeMailId.value = data.mail.id
      syncActivityRewardMailState(data.mail)
      const feedback = resolveClaimSyncFeedback(data.save_sync_state)
      showFloat(feedback.text, feedback.type)
    } catch (error: any) {
      showFloat(error?.message || '' + '领取失败', 'danger')
    } finally {
      claimCurrentPending.value = false
    }
  }

  const claimAllRewards = async () => {
    if (claimAllPending.value) return
    claimAllPending.value = true
    try {
      const data = await mailboxStore.claimAll()
      for (const claimed of data.claimed ?? []) {
        syncActivityRewardMailState(claimed?.mail)
      }
      await ensureSelection()
      const claimedCount = data.claimed?.length || 0
      const failedCount = data.failed?.length || 0
      if (claimedCount === 0 && failedCount > 0) {
        const failedMessage = data.failed?.[0]?.message || '一键领取失败'
        showFloat(`未成功领取任何邮件：${failedMessage}`, 'danger')
        return
      }
      const feedback = resolveClaimSyncFeedback(data.save_sync_state)
      const baseText = `已领取 ${claimedCount} 封邮件`
      const suffix = failedCount ? `，另有 ${failedCount} 封失败` : ''
      showFloat(`${baseText}${suffix}。${feedback.text}`, failedCount ? 'accent' : feedback.type)
    } catch (error: any) {
      showFloat(error?.message || '' + '一键领取失败', 'danger')
    } finally {
      claimAllPending.value = false
    }
  }

  const clearClaimed = async () => {
    if (clearClaimedPending.value) return
    clearClaimedPending.value = true
    try {
      const data = await mailboxStore.clearClaimed()
      await ensureSelection()
      showFloat(`已清理 ${data.count || 0} 封已领取邮件`, 'success')
    } catch (error: any) {
      showFloat(error?.message || '' + '清理失败', 'danger')
    } finally {
      clearClaimedPending.value = false
    }
  }

  onMounted(async () => {
    goalStore.ensureInitialized()
    updateViewportMode()
    if (typeof window !== 'undefined') window.addEventListener('resize', updateViewportMode)
    await refreshMails()
  })

  onUnmounted(() => {
    if (typeof window !== 'undefined') window.removeEventListener('resize', updateViewportMode)
  })

  watch(
    () => mailboxStore.lastLoadedAt,
    async (value, oldValue) => {
      if (!value || value === oldValue) return
      await ensureSelection()
    }
  )

</script>

<style scoped>
  .panel-box {
    border: 1px solid rgba(200, 164, 92, 0.18);
    border-radius: 2px;
    padding: 10px;
    background: rgba(15, 18, 30, 0.4);
  }

  .detail-box {
    min-height: 360px;
  }

  .mail-item {
    width: 100%;
    text-align: left;
    border: 1px solid rgba(200, 164, 92, 0.16);
    border-radius: 2px;
    padding: 8px;
    margin-bottom: 6px;
    transition:
      border-color 0.15s,
      background-color 0.15s;
  }

  .mail-item:hover,
  .mail-item-active {
    border-color: var(--color-accent);
    background: rgba(200, 164, 92, 0.08);
  }

  .detail-card {
    border: 1px solid rgba(200, 164, 92, 0.16);
    border-radius: 2px;
    padding: 10px;
    background: rgba(15, 18, 30, 0.36);
  }

  .reward-row {
    padding: 6px 8px;
    border: 1px solid rgba(200, 164, 92, 0.12);
    border-radius: 2px;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    height: 18px;
    padding: 0 6px;
    border-radius: 999px;
    font-size: 10px;
    line-height: 1;
    white-space: nowrap;
    word-break: keep-all;
    flex-shrink: 0;
    border: 1px solid transparent;
  }

  @media (min-width: 768px) {
    .status-badge {
      min-width: 52px;
      padding: 0 8px;
    }
  }

  .badge-claimable {
    color: #111827;
    background: rgba(202, 138, 4, 0.9);
  }

  .badge-claimed,
  .badge-read {
    color: #86efac;
    border-color: rgba(134, 239, 172, 0.35);
    background: rgba(22, 101, 52, 0.18);
  }

  .badge-expired {
    color: #fca5a5;
    border-color: rgba(252, 165, 165, 0.28);
    background: rgba(127, 29, 29, 0.18);
  }

  .badge-muted {
    color: rgb(var(--color-muted));
    border-color: rgba(200, 164, 92, 0.16);
    background: rgba(255, 255, 255, 0.04);
  }

  .empty-box {
    min-height: 240px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
</style>

