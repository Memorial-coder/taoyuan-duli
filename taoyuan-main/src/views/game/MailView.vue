<template>
  <div ref="mailViewRoot">
    <GuidanceDigestPanel surface-id="mail" title="活动邮件引导" />

    <div class="grid gap-3 md:grid-cols-[260px,minmax(0,1fr)]">
      <section class="panel-box" :class="!isDesktop && activeMail ? 'hidden' : ''">
        <div class="flex items-center justify-between mb-2">
          <Divider label="邮箱" />
          <span class="text-[10px] text-muted">未读 {{ mailboxStore.unreadCount }}</span>
        </div>
        <div v-if="mailArrivalNoticeText" class="detail-card mb-3 border border-warning/20 bg-warning/5">
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-xs text-accent">邮件抵达提醒</p>
              <p class="text-[10px] text-muted mt-1 leading-4">{{ mailArrivalNoticeText }}</p>
            </div>
            <Button class="justify-center shrink-0" :disabled="!mailboxStore.arrivalDigest.first_mail_id" @click="jumpToNewestArrival">
              去查看
            </Button>
          </div>
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
          <div class="border border-accent/10 rounded-xs px-2 py-2 mt-2 bg-bg/10">
            <p class="text-[10px] text-muted">本周日历提醒</p>
            <p v-for="line in calendarPrepDigestLines" :key="`mail-calendar-${line}`" class="text-[10px] text-accent mt-1 leading-4">
              {{ line }}
            </p>
            <p v-for="line in rareVisitorDigestLines" :key="`mail-visitor-${line}`" class="text-[10px] text-muted mt-1 leading-4">
              {{ line }}
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

        <div class="detail-card mb-3">
          <div class="flex items-center justify-between mb-2">
            <p class="text-xs text-accent">玩家书信</p>
            <span class="text-[10px] text-muted">L40 / L42</span>
          </div>
          <div class="space-y-2">
            <label class="flex flex-col gap-1 text-[10px] text-muted">
              收件人用户名
              <input
                v-model="mailboxStore.letterTargetDraft"
                maxlength="60"
                class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent"
                placeholder="输入要寄信的玩家用户名"
              />
            </label>
            <label class="flex flex-col gap-1 text-[10px] text-muted">
              书信模板
              <select
                v-model="mailboxStore.letterTemplateTypeDraft"
                class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent"
              >
                <option value="player_letter">普通书信</option>
                <option value="season_greeting">节气信</option>
                <option value="festival_greeting">节庆贺信</option>
                <option value="blessing_card">祝福卡</option>
                <option value="short_note">短讯</option>
                <option value="photo_letter">合照附信</option>
              </select>
            </label>
            <div class="flex flex-wrap gap-1">
              <button
                v-for="preset in mailboxStore.letterTemplatePresets"
                :key="preset.id"
                type="button"
                class="text-[10px] px-1.5 py-0.5 rounded-xs border border-accent/15 text-muted hover:border-accent/30 hover:text-accent"
                @click="applyLetterPreset(preset.id)"
              >
                {{ preset.label }}
              </button>
            </div>
            <label class="flex flex-col gap-1 text-[10px] text-muted">
              书信标题
              <input
                v-model="mailboxStore.letterTitleDraft"
                maxlength="60"
                class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent"
                placeholder="给这封信起一个标题"
              />
            </label>
            <label class="flex flex-col gap-1 text-[10px] text-muted">
              正文
              <textarea
                v-model="mailboxStore.letterContentDraft"
                rows="5"
                maxlength="5000"
                class="bg-bg border border-accent/20 rounded-xs px-2 py-1.5 text-xs text-text outline-none focus:border-accent resize-none"
                placeholder="写下你想寄给对方的话。"
              />
            </label>
            <div class="space-y-2">
              <div class="flex items-center justify-between gap-2">
                <p class="text-[10px] text-muted">合照附信</p>
                <Button class="justify-center shrink-0" :icon="Mail" :icon-size="12" :disabled="uploadingLetterPhoto" @click="triggerLetterPhotoUpload">
                  {{ uploadingLetterPhoto ? '上传中…' : '上传附图' }}
                </Button>
              </div>
              <input ref="letterPhotoInputRef" type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" @change="handleLetterPhotoSelected" />
              <div v-if="mailboxStore.letterPhotoUrlDraft" class="border border-accent/10 rounded-xs p-2 bg-bg/10">
                <img :src="mailboxStore.letterPhotoUrlDraft" :alt="mailboxStore.letterPhotoAltDraft || '书信附图'" class="letter-photo-preview" />
                <input
                  v-model="mailboxStore.letterPhotoAltDraft"
                  maxlength="80"
                  class="mt-2 w-full bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent"
                  placeholder="给这张附图写一句说明"
                />
              </div>
            </div>
            <Button class="w-full justify-center" :icon="Mail" :icon-size="12" :disabled="mailboxStore.sendLetterRunning" @click="sendPlayerLetter">
              {{ mailboxStore.sendLetterRunning ? '寄送中…' : '寄出这封信' }}
            </Button>
          </div>
        </div>

        <div class="detail-card mb-3">
          <div class="flex items-center justify-between mb-2">
            <p class="text-xs text-accent">礼物包裹</p>
            <span class="text-[10px] text-muted">L41</span>
          </div>
          <div class="space-y-2">
            <label class="flex flex-col gap-1 text-[10px] text-muted">
              收件人用户名
              <input
                v-model="mailboxStore.giftPackageTargetDraft"
                maxlength="60"
                class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent"
                placeholder="输入要寄送礼物包裹的玩家用户名"
              />
            </label>
            <label class="flex flex-col gap-1 text-[10px] text-muted">
              包裹类型
              <select
                v-model="mailboxStore.giftPackageTemplateTypeDraft"
                class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent"
                @change="syncGiftPackageDraftDefaults"
              >
                <option v-for="option in GIFT_PACKAGE_TYPE_OPTIONS" :key="option.id" :value="option.id">
                  {{ option.label }}
                </option>
              </select>
            </label>
            <p class="text-[10px] text-muted">{{ currentGiftPackageTypeOption?.summary }}</p>
            <label class="flex flex-col gap-1 text-[10px] text-muted">
              包裹标题
              <input
                v-model="mailboxStore.giftPackageTitleDraft"
                maxlength="60"
                class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent"
                placeholder="给包裹起一个标题"
              />
            </label>
            <label class="flex flex-col gap-1 text-[10px] text-muted">
              附言
              <textarea
                v-model="mailboxStore.giftPackageContentDraft"
                rows="3"
                maxlength="5000"
                class="bg-bg border border-accent/20 rounded-xs px-2 py-1.5 text-xs text-text outline-none focus:border-accent resize-none"
                placeholder="写一段给对方的话。"
              />
            </label>
            <div class="space-y-2">
              <div class="flex items-center justify-between gap-2">
                <p class="text-[10px] text-muted">包裹内容</p>
                <Button class="justify-center shrink-0" :disabled="mailboxStore.sendLetterRunning" @click="addGiftRewardRow">
                  新增一项
                </Button>
              </div>
              <div v-for="(reward, index) in mailboxStore.giftPackageRewardsDraft" :key="`gift-${index}`" class="border border-accent/10 rounded-xs p-2 space-y-2">
                <div class="grid gap-2 md:grid-cols-3">
                  <select :value="rewardSelectionValue(reward)" class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent" @change="updateGiftRewardSelection(index, String(($event.target as HTMLSelectElement).value || ''))">
                    <option value="">选择要寄送的内容</option>
                    <option v-for="option in availableGiftPackageOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                  <input
                    v-model="reward.id"
                    maxlength="80"
                    class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent"
                    placeholder="物品 ID"
                  />
                  <input
                    v-model.number="reward.quantity"
                    type="number"
                    min="1"
                    class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent"
                    placeholder="数量"
                  />
                </div>
                <div class="flex items-center justify-between gap-2">
                  <input
                    v-if="reward.type !== 'decoration'"
                    v-model="reward.quality"
                    maxlength="20"
                    class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent"
                    placeholder="品质（可选）"
                  />
                  <Button class="justify-center shrink-0" :disabled="mailboxStore.sendLetterRunning || mailboxStore.giftPackageRewardsDraft.length <= 1" @click="removeGiftRewardRow(index)">
                    删除
                  </Button>
                </div>
              </div>
            </div>
            <Button class="w-full justify-center" :icon="Mail" :icon-size="12" :disabled="mailboxStore.sendLetterRunning" @click="sendPlayerGiftPackage">
              {{ mailboxStore.sendLetterRunning ? '寄送中…' : '寄出礼物包裹' }}
            </Button>
          </div>
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
                <span v-if="mail.is_pinned" class="text-warning">[置顶]</span>
                <span v-if="mail.unread" class="text-accent">[新]</span>
                {{ mail.title }}
              </p>
              <p class="text-[10px] text-muted line-clamp-2">{{ mail.preview }}</p>
            </div>
            <span class="status-badge" :class="statusClass(mail.claim_status)">{{ statusLabel(mail.claim_status, !!mail.sender_display_name) }}</span>
          </div>
          <div class="mt-1 flex items-center justify-between text-[10px] text-muted">
            <span>{{ formatTime(mail.sent_at) }}</span>
            <span v-if="mail.has_rewards">奖励 {{ mail.reward_count }}</span>
            <span v-else>{{ mail.sender_display_name ? `来信 · ${mail.sender_display_name}` : '公告' }}</span>
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
              <p v-if="activeMail.sender_display_name" class="text-[10px] text-muted mt-1">寄信人：{{ activeMail.sender_display_name }}</p>
              <div class="flex flex-wrap gap-1 mt-1">
                <span class="status-badge" :class="statusClass(activeMail.claim_status)">{{ statusLabel(activeMail.claim_status, !!activeMail.sender_display_name) }}</span>
                <span v-if="activeMail.is_pinned" class="status-badge badge-pinned">置顶</span>
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

          <div v-if="activeMail.photo_url" class="detail-card mb-3">
            <p class="text-xs text-accent mb-2">附图</p>
            <img :src="activeMail.photo_url" :alt="activeMail.photo_alt || '书信附图'" class="letter-photo-preview" />
            <p v-if="activeMail.photo_alt" class="text-[10px] text-muted mt-2">{{ activeMail.photo_alt }}</p>
          </div>

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
            <p v-else class="text-xs text-muted">{{ activeMail.sender_display_name ? '这封玩家书信不附带奖励。' : '这是一封纯文字公告' }}</p>
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
            <Button class="justify-center" @click="togglePinned(activeMail.id, !activeMail.is_pinned)">
              {{ activeMail.is_pinned ? '取消置顶' : '置顶这封信' }}
            </Button>
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

          <div v-if="mailboxStore.receipts.length > 0" class="detail-card mt-3">
            <div class="flex items-center justify-between gap-2 mb-2">
              <p class="text-xs text-accent">结算凭证回看</p>
              <span class="text-[10px] text-muted">最近 {{ mailboxStore.receipts.length }} 条</span>
            </div>
            <div class="space-y-2">
              <div v-for="receipt in mailboxStore.receipts" :key="receipt.id" class="border border-accent/10 rounded-xs p-2">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="text-xs text-accent truncate">{{ receipt.mail_title }}</p>
                    <p class="text-[10px] text-muted mt-1">
                      {{ receipt.sender_display_name ? `来自 ${receipt.sender_display_name}` : '系统结算' }} · {{ receipt.save_slot === null ? '未写入槽位' : `槽位${receipt.save_slot + 1}` }}
                    </p>
                  </div>
                  <span class="text-[10px] text-muted shrink-0">{{ formatTime(receipt.claimed_at) }}</span>
                </div>
                <p class="text-[10px] text-muted mt-1">
                  入账 {{ receipt.money_added }} 文 · 发放 {{ receipt.applied_rewards.length }} 条 · 跳过 {{ receipt.skipped_rewards.length }} 条
                </p>
              </div>
            </div>
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
  import { useGameStore, SEASON_NAMES, WEATHER_NAMES } from '@/stores/useGameStore'
  import { useInventoryStore } from '@/stores/useInventoryStore'
  import { useDecorationStore } from '@/stores/useDecorationStore'
  import { useMailboxStore } from '@/stores/useMailboxStore'
  import { useGoalStore } from '@/stores/useGoalStore'
  import { useQuestStore } from '@/stores/useQuestStore'
  import { DECORATIONS } from '@/data/decorations'
  import { NPCS } from '@/data/npcs'
  import { getSeasonEventsForDay, getSeasonalActivitiesForDay } from '@/data/events'
  import { getUpcomingRareVisitors } from '@/data/bookseller'
  import { getUpcomingTravelingMerchantVisits } from '@/data/travelingMerchant'
  import { getItemById } from '@/data/items'
  import { getWeaponById } from '@/data/weapons'
  import { getRingById } from '@/data/rings'
  import { getHatById } from '@/data/hats'
  import { getShoeById } from '@/data/shoes'
  import { showFloat } from '@/composables/useGameLog'
  import { uploadHallImage } from '@/utils/taoyuanHallApi'
  import { Mail, MailOpen, RefreshCw, Inbox, Trash2, Gift, ChevronLeft, ChevronRight } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import Divider from '@/components/game/Divider.vue'
  import GuidanceDigestPanel from '@/components/game/GuidanceDigestPanel.vue'
  import type { MailClaimSyncState, TaoyuanMailDetail, TaoyuanMailReward, TaoyuanMailSummary } from '@/stores/useMailboxStore'

  const gameStore = useGameStore()
  const inventoryStore = useInventoryStore()
  const decorationStore = useDecorationStore()
  const mailboxStore = useMailboxStore()
  const goalStore = useGoalStore()
  const questStore = useQuestStore()
  const decorationNameMap = new Map(DECORATIONS.map(def => [def.id, def.name]))
  type GiftPackageTemplateType = 'material_package' | 'seed_package' | 'fish_fry_package' | 'decoration_package' | 'souvenir_package'
  const GIFT_PACKAGE_TYPE_OPTIONS: Array<{ id: GiftPackageTemplateType; label: string; summary: string; defaultTitle: string }> = [
    { id: 'material_package', label: '材料包', summary: '适合寄送木材、矿料与加工材料。', defaultTitle: '寄来一份材料包' },
    { id: 'seed_package', label: '种子包', summary: '适合补种、开季备货与周任务接力。', defaultTitle: '寄来一份种子包' },
    { id: 'fish_fry_package', label: '鱼苗包', summary: '先用鱼类库存承接鱼塘补货与放养。', defaultTitle: '寄来一份鱼苗包' },
    { id: 'decoration_package', label: '装饰包', summary: '从当前已拥有的装饰物里挑一份寄给对方。', defaultTitle: '寄来一份装饰包' },
    { id: 'souvenir_package', label: '纪念品包', summary: '适合寄送礼物、古物和偏纪念向的小物件。', defaultTitle: '寄来一份纪念品包' },
  ]
  const GIFT_PACKAGE_CATEGORY_FILTERS: Record<GiftPackageTemplateType, string[]> = {
    material_package: ['material', 'ore', 'gem', 'processed'],
    seed_package: ['seed'],
    fish_fry_package: ['fish'],
    decoration_package: [],
    souvenir_package: ['gift', 'artifact', 'fossil', 'misc'],
  }
  const QUALITY_SHORT_LABELS: Record<string, string> = {
    normal: '普',
    fine: '良',
    excellent: '优',
    supreme: '绝',
  }
  const weeklyPlanSnapshot = computed(() => goalStore.weeklyPlanSnapshot)
  const latestWeeklyChronicle = computed(() => goalStore.latestWeeklyChronicleEntry)
  const activeMailId = ref<string | null>(null)
  const activeMail = ref<TaoyuanMailDetail | null>(null)
  const selectRequestId = ref(0)
  const claimCurrentPending = ref(false)
  const claimAllPending = ref(false)
  const clearClaimedPending = ref(false)
  const uploadingLetterPhoto = ref(false)
  const mailViewRoot = ref<HTMLElement | null>(null)
  const letterPhotoInputRef = ref<HTMLInputElement | null>(null)
  const isDesktop = ref(typeof window === 'undefined' ? true : window.innerWidth >= 768)
  const claimableMailCount = computed(() => mailboxStore.mails.filter(mail => mail.can_claim).length)
  const mailArrivalNoticeText = computed(() => {
    if (!mailboxStore.arrivalDigest.count) return ''
    const titles = mailboxStore.arrivalDigest.titles.join('、')
    return mailboxStore.arrivalDigest.count === 1
      ? `刚收到 1 封新邮件：${titles}`
      : `刚收到 ${mailboxStore.arrivalDigest.count} 封新邮件：${titles}`
  })
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
  const currentGiftPackageTypeOption = computed(() =>
    GIFT_PACKAGE_TYPE_OPTIONS.find(option => option.id === mailboxStore.giftPackageTemplateTypeDraft) ?? GIFT_PACKAGE_TYPE_OPTIONS[0]
  )
  const availableGiftPackageOptions = computed(() => {
    if (mailboxStore.giftPackageTemplateTypeDraft === 'decoration_package') {
      return Object.entries(decorationStore.owned)
        .filter(([, count]) => Number(count) > 0)
        .map(([id, count]) => ({
          value: `decoration::${id}`,
          type: 'decoration' as const,
          id,
          quality: '',
          quantity: Number(count) || 0,
          label: `${decorationNameMap.get(id) || id} ×${count}`,
        }))
    }

    const categoryFilter = GIFT_PACKAGE_CATEGORY_FILTERS[mailboxStore.giftPackageTemplateTypeDraft]
    const bucket = new Map<string, { value: string; type: 'item' | 'seed'; id: string; quality: string; quantity: number; label: string }>()
    for (const slot of [...inventoryStore.items, ...inventoryStore.tempItems]) {
      const itemDef = getItemById(slot.itemId)
      if (!itemDef || !categoryFilter.includes(itemDef.category)) continue
      const key = `${slot.itemId}::${slot.quality}`
      const current = bucket.get(key)
      const nextQuantity = (current?.quantity || 0) + slot.quantity
      bucket.set(key, {
        value: key,
        type: itemDef.category === 'seed' ? 'seed' : 'item',
        id: slot.itemId,
        quality: slot.quality,
        quantity: nextQuantity,
        label: `${itemDef.name}（${QUALITY_SHORT_LABELS[slot.quality] || slot.quality}）×${nextQuantity}`,
      })
    }
    return [...bucket.values()].sort((left, right) => left.label.localeCompare(right.label, 'zh-CN'))
  })
  const formatCalendarDay = (season: keyof typeof SEASON_NAMES, day: number) => `${SEASON_NAMES[season]}${day}日`
  const getNextCalendarPoint = (year: number, season: keyof typeof SEASON_NAMES, day: number) => {
    const seasons = ['spring', 'summer', 'autumn', 'winter'] as const
    let nextYear = year
    let nextSeason = season
    let nextDay = day + 1
    if (nextDay > 28) {
      nextDay = 1
      const nextSeasonIndex = seasons.indexOf(season) + 1
      if (nextSeasonIndex >= seasons.length) {
        nextSeason = 'spring'
        nextYear += 1
      } else {
        nextSeason = seasons[nextSeasonIndex]!
      }
    }
    return { year: nextYear, season: nextSeason, day: nextDay }
  }
  const calendarPrepDigestLines = computed(() => {
    const lines: string[] = []
    let cursor = { year: gameStore.year, season: gameStore.season, day: gameStore.day }
    for (let offset = 1; offset <= 3; offset++) {
      cursor = getNextCalendarPoint(cursor.year, cursor.season, cursor.day)
      const birthdays = NPCS.filter(npc => npc.birthday?.season === cursor.season && npc.birthday?.day === cursor.day).map(npc => npc.name)
      if (birthdays.length > 0 && offset <= 2) {
        lines.push(`${offset}天后 ${formatCalendarDay(cursor.season, cursor.day)} 有生日：${birthdays.join('、')}`)
      }
      const events = getSeasonEventsForDay(cursor.season, cursor.day, cursor.year)
      events.forEach(event => {
        lines.push(`${offset}天后「${event.name}」：${event.prepChecklist.slice(0, 2).join('；')}`)
      })
      const activities = getSeasonalActivitiesForDay(cursor.season, cursor.day)
      activities.forEach(activity => {
        lines.push(`${offset}天后进入「${activity.name}」：${activity.prepChecklist[0] ?? activity.description}`)
      })
    }
    if (['rainy', 'stormy', 'green_rain'].includes(gameStore.tomorrowWeather)) {
      lines.push(`明日天气：${WEATHER_NAMES[gameStore.tomorrowWeather]}，相关窗口更值得提前安排。`)
    }
    return lines.slice(0, 4).length > 0 ? lines.slice(0, 4) : ['未来三天没有硬性节点，可以按周计划慢慢推进。']
  })
  const rareVisitorDigestLines = computed(() => {
    const lines: string[] = []
    getUpcomingRareVisitors(gameStore.season, gameStore.day, 7, gameStore.year)
      .slice(0, 2)
      .forEach(visit => {
        lines.push(`${visit.daysAway}天后 ${formatCalendarDay(visit.season, visit.day)}：${visit.visitor.stallName} / ${visit.visitor.name}`)
      })
    getUpcomingTravelingMerchantVisits(gameStore.season, gameStore.day, 5, gameStore.year)
      .slice(0, 1)
      .forEach(visit => {
        lines.push(`${visit.daysAway}天后旅行商人摆摊，适合预留一点稀有货预算。`)
      })
    return lines.length > 0 ? lines : ['本周暂无新的稀有来访提醒。']
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

  const syncGiftPackageDraftDefaults = () => {
    const defaultType = mailboxStore.giftPackageTemplateTypeDraft === 'decoration_package'
      ? 'decoration'
      : mailboxStore.giftPackageTemplateTypeDraft === 'seed_package'
        ? 'seed'
        : 'item'
    mailboxStore.giftPackageTitleDraft = currentGiftPackageTypeOption.value?.defaultTitle || '寄来一份礼物包裹'
    mailboxStore.giftPackageRewardsDraft = [
      { type: defaultType as 'item' | 'seed' | 'decoration', id: '', quantity: 1, quality: defaultType === 'decoration' ? undefined : 'normal' }
    ]
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

  const statusLabel = (status: string, isPlayerMail = false) => {
    if (status === 'claimable') return '可领取'
    if (status === 'claimed') return '已领取'
    if (status === 'expired') return '已过期'
    if (isPlayerMail) return '来信'
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
    if (templateType === 'player_letter') return '书信'
    if (templateType === 'season_greeting') return '节气信'
    if (templateType === 'festival_greeting') return '节庆贺信'
    if (templateType === 'blessing_card') return '祝福卡'
    if (templateType === 'short_note') return '短讯'
    if (templateType === 'photo_letter') return '合照附信'
    if (templateType === 'material_package') return '材料包'
    if (templateType === 'seed_package') return '种子包'
    if (templateType === 'fish_fry_package') return '鱼苗包'
    if (templateType === 'decoration_package') return '装饰包'
    if (templateType === 'souvenir_package') return '纪念品包'
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
      await mailboxStore.refreshReceipts().catch(() => {})
      syncClaimedActivityRewardMails()
      await ensureSelection()
    } catch (error: any) {
      showFloat(error?.message || '刷新邮箱失败', 'danger')
    }
  }

  const applyLetterPreset = (presetId: string) => {
    const preset = mailboxStore.letterTemplatePresets.find(item => item.id === presetId)
    if (!preset) return
    mailboxStore.letterTemplateTypeDraft = preset.template_type
    mailboxStore.letterTitleDraft = preset.title
    mailboxStore.letterContentDraft = preset.content
  }

  const updateGiftRewardSelection = (index: number, value: string) => {
    const reward = mailboxStore.giftPackageRewardsDraft[index]
    if (!reward) return
    if (!value) {
      reward.id = ''
      reward.quality = reward.type === 'decoration' ? undefined : 'normal'
      return
    }
    if (value.startsWith('decoration::')) {
      reward.type = 'decoration'
      reward.id = value.slice('decoration::'.length)
      reward.quality = undefined
      return
    }
    const [itemId, quality] = value.split('::')
    const option = availableGiftPackageOptions.value.find(entry => entry.value === value)
    reward.type = option?.type || (mailboxStore.giftPackageTemplateTypeDraft === 'seed_package' ? 'seed' : 'item')
    reward.id = itemId || ''
    reward.quality = quality || 'normal'
  }

  const rewardSelectionValue = (reward: { type: string; id: string; quality?: string }) => {
    if (!reward.id) return ''
    if (reward.type === 'decoration') return `decoration::${reward.id}`
    return `${reward.id}::${reward.quality || 'normal'}`
  }

  const addGiftRewardRow = () => {
    const defaultType = mailboxStore.giftPackageTemplateTypeDraft === 'decoration_package'
      ? 'decoration'
      : mailboxStore.giftPackageTemplateTypeDraft === 'seed_package'
        ? 'seed'
        : 'item'
    mailboxStore.addGiftPackageRewardDraft()
    const next = mailboxStore.giftPackageRewardsDraft[mailboxStore.giftPackageRewardsDraft.length - 1]
    if (!next) return
    next.type = defaultType as 'item' | 'seed' | 'decoration'
    next.quality = defaultType === 'decoration' ? undefined : 'normal'
  }

  const removeGiftRewardRow = (index: number) => {
    mailboxStore.removeGiftPackageRewardDraft(index)
  }

  const triggerLetterPhotoUpload = () => {
    letterPhotoInputRef.value?.click()
  }

  const handleLetterPhotoSelected = async (event: Event) => {
    const input = event.target as HTMLInputElement | null
    const file = input?.files?.[0]
    if (!file) return
    uploadingLetterPhoto.value = true
    try {
      const uploaded = await uploadHallImage(file)
      mailboxStore.letterPhotoUrlDraft = uploaded.url
      mailboxStore.letterPhotoAltDraft = uploaded.alt || file.name.replace(/\.[^.]+$/, '')
      if (mailboxStore.letterTemplateTypeDraft !== 'photo_letter') {
        mailboxStore.letterTemplateTypeDraft = 'photo_letter'
      }
    } catch (error: any) {
      showFloat(error?.message || '上传附图失败', 'danger')
    } finally {
      uploadingLetterPhoto.value = false
      if (input) input.value = ''
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

  const jumpToNewestArrival = async () => {
    const mailId = mailboxStore.arrivalDigest.first_mail_id
    if (!mailId) return
    await selectMail(mailId)
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

  const togglePinned = async (id: string, pinned: boolean) => {
    try {
      const detail = await mailboxStore.setPinned(id, pinned)
      if (activeMail.value?.id === id) {
        activeMail.value = detail
      }
      showFloat(pinned ? '已置顶这封邮件' : '已取消置顶', 'success')
    } catch (error: any) {
      showFloat(error?.message || '更新置顶状态失败', 'danger')
    }
  }

  const sendPlayerLetter = async () => {
    try {
      const data = await mailboxStore.sendPlayerLetterMail()
      const mail = data?.mail as TaoyuanMailDetail | undefined
      if (mail?.id) {
        activeMailId.value = mail.id
        activeMail.value = mail
      }
      showFloat('书信已经寄出，对方会在邮箱里收到。', 'success')
    } catch (error: any) {
      showFloat(error?.message || '寄信失败', 'danger')
    }
  }

  const sendPlayerGiftPackage = async () => {
    try {
      const data = await mailboxStore.sendPlayerGiftPackageMail()
      const mail = data?.mail as TaoyuanMailDetail | undefined
      if (mail?.id) {
        activeMailId.value = mail.id
        activeMail.value = mail
      }
      showFloat('礼物包裹已经寄出，对方可在邮箱里领取。', 'success')
    } catch (error: any) {
      showFloat(error?.message || '寄送礼物包裹失败', 'danger')
    }
  }

  onMounted(async () => {
    goalStore.ensureInitialized()
    updateViewportMode()
    if (typeof window !== 'undefined') window.addEventListener('resize', updateViewportMode)
    await mailboxStore.refreshLetterPresets().catch(() => {})
    await mailboxStore.refreshReceipts().catch(() => {})
    syncGiftPackageDraftDefaults()
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

  .letter-photo-preview {
    width: 100%;
    max-height: 240px;
    object-fit: cover;
    border-radius: 2px;
    border: 1px solid rgba(200, 164, 92, 0.16);
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

  .badge-pinned {
    color: #fcd34d;
    border-color: rgba(252, 211, 77, 0.28);
    background: rgba(120, 53, 15, 0.22);
  }

  .empty-box {
    min-height: 240px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
</style>

