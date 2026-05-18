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

  onMounted(() => {
    if (!manorStore.snapshot) {
      void refreshSnapshot()
    }
  })
</script>
