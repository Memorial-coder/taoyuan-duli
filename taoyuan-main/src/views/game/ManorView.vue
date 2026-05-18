<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-2">
      <div>
        <p class="text-sm text-accent">公开庄园</p>
        <p class="text-[10px] text-muted mt-1">把庄园公开展示成一个可以被别人理解的在线地点。</p>
      </div>
      <Button class="text-[10px]" :disabled="manorStore.loading" @click="refreshSnapshot">
        {{ manorStore.loading ? '加载中…' : '刷新庄园快照' }}
      </Button>
    </div>

    <div v-if="manorStore.errorMessage" class="game-panel border border-danger/20 rounded-xs p-3 text-xs text-danger">
      {{ manorStore.errorMessage }}
    </div>

    <ManorPreviewCard :snapshot="manorStore.snapshot" />

    <div v-if="manorStore.snapshot" class="game-panel border border-accent/10 rounded-xs p-3 space-y-2">
      <p class="text-xs text-accent">留言墙</p>
      <div class="grid grid-cols-3 gap-2">
        <Button class="text-[10px]" :disabled="manorStore.guestbookActionRunning" @click="submitGuestbook('text')">留言</Button>
        <Button class="text-[10px]" :disabled="manorStore.guestbookActionRunning" @click="submitGuestbook('blessing')">祝福</Button>
        <Button class="text-[10px]" :disabled="manorStore.guestbookActionRunning" @click="submitGuestbook('advice')">建议</Button>
      </div>
      <textarea
        v-model="manorStore.guestbookDraft"
        rows="3"
        maxlength="160"
        class="w-full bg-bg border border-accent/20 rounded-xs px-2 py-1.5 text-xs text-text outline-none focus:border-accent resize-none"
        placeholder="给这座庄园留下一句可被回看的痕迹。"
      />

      <div class="space-y-2">
        <div v-if="manorStore.snapshot.guestbook_entries.length === 0" class="text-[10px] text-muted">当前还没有访客留言。</div>
        <div v-for="entry in manorStore.snapshot.guestbook_entries" :key="entry.id" class="border border-accent/10 rounded-xs p-2">
          <div class="flex items-center justify-between gap-2">
            <div>
              <p class="text-xs text-accent">{{ entry.author_display_name }} · {{ guestbookKindLabel(entry.kind) }}</p>
              <p class="text-[10px] text-muted mt-1">{{ entry.content }}</p>
            </div>
            <Button
              v-if="manorStore.snapshot.viewer_is_owner"
              class="text-[10px]"
              :disabled="manorStore.guestbookActionRunning"
              @click="togglePinned(entry.id, !entry.pinned)"
            >
              {{ entry.pinned ? '取消置顶' : '置顶' }}
            </Button>
          </div>
          <div v-if="entry.reply_text" class="border border-accent/10 rounded-xs px-2 py-1.5 mt-2 bg-bg/10">
            <p class="text-[10px] text-muted">{{ entry.reply_author_display_name || '庄园主人' }} 回复：</p>
            <p class="text-[10px] mt-1">{{ entry.reply_text }}</p>
          </div>
          <div v-else-if="manorStore.snapshot.viewer_is_owner" class="mt-2 flex gap-2">
            <input
              v-model="manorStore.guestbookReplyDraft[entry.id]"
              maxlength="160"
              class="flex-1 bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent"
              placeholder="回复这条留言"
            />
            <Button class="text-[10px]" :disabled="manorStore.guestbookActionRunning" @click="replyGuestbook(entry.id)">
              回复
            </Button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="manorStore.snapshot" class="game-panel border border-accent/10 rounded-xs p-3 space-y-2">
      <p class="text-xs text-accent">访客记录</p>
      <div class="grid gap-2 md:grid-cols-3">
        <select v-model="manorStore.visitPurposeDraft" class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent">
          <option value="explore">参观取景</option>
          <option value="friend_visit">好友回访</option>
          <option value="gift">带礼探访</option>
          <option value="quest">顺手带走需求</option>
          <option value="other">其他来意</option>
        </select>
        <input
          v-model="manorStore.visitSummaryDraft"
          maxlength="160"
          class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent"
          placeholder="这次来访做了什么"
        />
        <input
          v-model="manorStore.visitFeedbackDraft"
          maxlength="160"
          class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent"
          placeholder="给庄园主的反馈"
        />
      </div>
      <div class="flex justify-end">
        <Button class="text-[10px]" :disabled="manorStore.visitActionRunning" @click="recordVisit">
          {{ manorStore.visitActionRunning ? '记录中…' : '记录这次来访' }}
        </Button>
      </div>

      <div class="space-y-2">
        <div v-if="manorStore.snapshot.visit_entries.length === 0" class="text-[10px] text-muted">当前还没有访客记录。</div>
        <div v-for="entry in manorStore.snapshot.visit_entries" :key="entry.id" class="border border-accent/10 rounded-xs p-2">
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs text-accent">{{ entry.visitor_display_name }} · {{ visitPurposeLabel(entry.purpose) }}</p>
            <span class="text-[10px] text-muted">{{ new Date(entry.created_at * 1000).toLocaleString('zh-CN', { hour12: false }) }}</span>
          </div>
          <p class="text-[10px] text-muted mt-1">来访行为：{{ entry.summary }}</p>
          <p v-if="entry.feedback" class="text-[10px] text-muted mt-1">来访反馈：{{ entry.feedback }}</p>
          <p v-if="entry.carried_items.length > 0" class="text-[10px] text-muted mt-1">
            带走委托：{{ entry.carried_items.map(item => `${item.itemId} x${item.quantity}`).join('、') }}
          </p>
        </div>
      </div>
    </div>

    <div v-if="manorStore.snapshot" class="game-panel border border-accent/10 rounded-xs p-3 space-y-2">
      <p class="text-xs text-accent">庄园导览</p>
      <div class="grid gap-2 md:grid-cols-2">
        <div class="border border-accent/10 rounded-xs p-2">
          <p class="text-[10px] text-muted mb-1">推荐参观点</p>
          <input
            v-model="manorStore.guidePointTitleDraft"
            maxlength="30"
            class="w-full bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent mb-2"
            placeholder="参观点标题"
          />
          <input
            v-model="manorStore.guidePointSummaryDraft"
            maxlength="120"
            class="w-full bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent"
            placeholder="告诉访客为什么值得看"
          />
          <div class="flex justify-end mt-2">
            <Button class="text-[10px]" :disabled="manorStore.guideActionRunning" @click="saveGuide">
              {{ manorStore.guideActionRunning ? '保存中…' : '加入导览点' }}
            </Button>
          </div>
        </div>

        <div class="border border-accent/10 rounded-xs p-2">
          <p class="text-[10px] text-muted mb-1">今日来访摘要</p>
          <p class="text-xs text-accent">{{ manorStore.snapshot.today_visit_summary }}</p>
          <p class="text-[10px] text-muted mt-2">
            当前主题路线：{{ manorStore.snapshot.guide_routes[0]?.title || '还没设置主题路线' }}
          </p>
          <p class="text-[10px] text-muted mt-1">
            {{ manorStore.snapshot.guide_routes[0]?.summary || '保存第一个参观点后，会自动整理出一条基础参观路线。' }}
          </p>
        </div>
      </div>

      <div class="border border-accent/10 rounded-xs p-2">
        <p class="text-[10px] text-muted mb-1">已设置参观点</p>
        <div v-if="manorStore.snapshot.guide_points.length === 0" class="text-[10px] text-muted">当前还没有推荐参观点。</div>
        <div v-for="point in manorStore.snapshot.guide_points" :key="point.id" class="border border-accent/10 rounded-xs p-2 mb-1.5">
          <p class="text-xs text-accent">{{ point.order }}. {{ point.title }}</p>
          <p class="text-[10px] text-muted mt-1">{{ point.summary }}</p>
        </div>
      </div>
    </div>

    <div class="game-panel border border-accent/10 rounded-xs p-3 text-[10px] text-muted space-y-1">
      <p>当前这轮先完成 L20 的最小公开庄园快照：公开状态、展示主题、主视觉摘要、经营标签、当前重点和本周目标都已经有落点。</p>
      <p>留言墙、访客痕迹、导览和收藏会在 `L21-L24` 继续接。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { onMounted } from 'vue'
  import Button from '@/components/game/Button.vue'
  import ManorPreviewCard from '@/components/game/ManorPreviewCard.vue'
  import { useManorStore } from '@/stores/useManorStore'

  const manorStore = useManorStore()

  const refreshSnapshot = async () => {
    await manorStore.refreshSnapshot().catch(() => {})
  }

  const submitGuestbook = async (kind: 'text' | 'blessing' | 'advice' | 'stamp' | 'signature') => {
    await manorStore.createGuestbookEntry(kind).catch(() => {})
  }

  const replyGuestbook = async (entryId: string) => {
    await manorStore.replyGuestbookEntry(entryId).catch(() => {})
  }

  const togglePinned = async (entryId: string, pinned: boolean) => {
    await manorStore.togglePinnedGuestbookEntry(entryId, pinned).catch(() => {})
  }

  const guestbookKindLabel = (kind: 'text' | 'blessing' | 'advice' | 'stamp' | 'signature') => {
    if (kind === 'blessing') return '祝福'
    if (kind === 'advice') return '建议'
    if (kind === 'stamp') return '图章'
    if (kind === 'signature') return '签名'
    return '留言'
  }

  const recordVisit = async () => {
    await manorStore.createVisitRecord().catch(() => {})
  }

  const visitPurposeLabel = (purpose: 'explore' | 'friend_visit' | 'gift' | 'quest' | 'other') => {
    if (purpose === 'explore') return '参观取景'
    if (purpose === 'friend_visit') return '好友回访'
    if (purpose === 'gift') return '带礼探访'
    if (purpose === 'quest') return '带走需求'
    return '其他来意'
  }

  const saveGuide = async () => {
    await manorStore.saveGuideSnapshot().catch(() => {})
  }

  onMounted(() => {
    if (!manorStore.snapshot) {
      void refreshSnapshot()
    }
  })
</script>
