<template>
  <div class="grid gap-3 md:grid-cols-[260px,minmax(0,1fr)]">
    <section class="panel-box">
      <div class="flex items-center justify-between mb-2">
        <Divider label="邮箱" />
        <span class="text-[10px] text-muted">未读 {{ mailboxStore.unreadCount }}</span>
      </div>
      <div class="flex flex-col space-y-1.5 mb-3">
        <Button class="w-full justify-center" :icon="RefreshCw" :icon-size="12" :disabled="mailboxStore.loading" @click="refreshMails">
          刷新邮件
        </Button>
        <Button class="w-full justify-center" :icon="Inbox" :icon-size="12" @click="claimAllRewards">
          一键领取
        </Button>
        <Button class="w-full justify-center" :icon="Trash2" :icon-size="12" @click="clearClaimed">
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

    <section class="panel-box detail-box">
      <template v-if="activeMail">
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
</template>

<script setup lang="ts">
  import { onMounted, ref, watch } from 'vue'
  import { useMailboxStore } from '@/stores/useMailboxStore'
  import { getItemById } from '@/data/items'
  import { getWeaponById } from '@/data/weapons'
  import { getRingById } from '@/data/rings'
  import { getHatById } from '@/data/hats'
  import { getShoeById } from '@/data/shoes'
  import { showFloat } from '@/composables/useGameLog'
  import { Mail, MailOpen, RefreshCw, Inbox, Trash2, Gift } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import Divider from '@/components/game/Divider.vue'
  import type { TaoyuanMailDetail, TaoyuanMailReward } from '@/stores/useMailboxStore'

  const mailboxStore = useMailboxStore()
  const activeMailId = ref<string | null>(null)
  const activeMail = ref<TaoyuanMailDetail | null>(null)
  const selectRequestId = ref(0)

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
    if (templateType === 'maintenance_notice') return '维护'
    return templateType
  }

  const ensureSelection = async () => {
    if (!mailboxStore.mails.length) {
      activeMailId.value = null
      activeMail.value = null
      return
    }
    const nextId = mailboxStore.mails.some(item => item.id === activeMailId.value) ? activeMailId.value : mailboxStore.mails[0]!.id
    if (nextId) await selectMail(nextId)
  }

  const refreshMails = async () => {
    try {
      await mailboxStore.refreshList()
      await ensureSelection()
    } catch (error: any) {
      showFloat(error?.message || '刷新邮箱失败', 'danger')
    }
  }

  const selectMail = async (id: string) => {
    activeMailId.value = id
    const requestId = ++selectRequestId.value
    try {
      const detail = await mailboxStore.openMail(id)
      if (requestId !== selectRequestId.value || activeMailId.value !== id) return
      activeMail.value = detail
    } catch (error: any) {
      if (requestId !== selectRequestId.value) return
      showFloat(error?.message || '读取邮件失败', 'danger')
    }
  }

  const claimCurrentMail = async () => {
    if (!activeMailId.value) return
    try {
      const data = await mailboxStore.claimMail(activeMailId.value)
      activeMail.value = data.mail
      if (data.save_sync_ok === false) {
        showFloat('奖励已领取，但当前桃源乡存档刷新失败，请手动重新载入当前存档查看', 'accent')
      } else {
        showFloat('奖励已发放到当前桃源乡存档', 'success')
      }
    } catch (error: any) {
      showFloat(error?.message || '领取失败', 'danger')
    }
  }

  const claimAllRewards = async () => {
    try {
      const data = await mailboxStore.claimAll()
      await ensureSelection()
      if (data.save_sync_ok === false) {
        showFloat(`已领取 ${data.claimed?.length || 0} 封邮件，但当前桃源乡存档刷新失败，请手动重新载入当前存档查看`, 'accent')
      } else {
        showFloat(`成功领取 ${data.claimed?.length || 0} 封邮件`, data.failed?.length ? 'accent' : 'success')
      }
    } catch (error: any) {
      showFloat(error?.message || '一键领取失败', 'danger')
    }
  }

  const clearClaimed = async () => {
    try {
      const data = await mailboxStore.clearClaimed()
      await ensureSelection()
      showFloat(`已清理 ${data.count || 0} 封已领取邮件`, 'success')
    } catch (error: any) {
      showFloat(error?.message || '清理失败', 'danger')
    }
  }

  onMounted(async () => {
    await refreshMails()
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
