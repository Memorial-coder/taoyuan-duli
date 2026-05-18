<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-2">
      <div>
        <p class="text-sm text-accent">公开名片</p>
        <p class="text-[10px] text-muted mt-1">把当前账号的公开名片整理出来，方便后续好友、邻里和来访系统直接复用。</p>
      </div>
      <Button class="text-[10px]" :disabled="socialStore.loading || socialStore.saving" @click="refreshProfile">
        {{ socialStore.loading ? '加载中…' : '刷新名片' }}
      </Button>
    </div>

    <div v-if="socialStore.errorMessage" class="game-panel border border-danger/20 rounded-xs p-3 text-xs text-danger">
      {{ socialStore.errorMessage }}
    </div>

    <div v-if="!socialStore.profile" class="game-panel border border-accent/10 rounded-xs p-3 text-xs text-muted">
      暂未载入公开名片。登录后可自动读取当前账号的公开资料。
    </div>

    <template v-else>
      <div class="game-panel border border-accent/10 rounded-xs p-3 space-y-2">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="text-sm text-accent">{{ socialStore.displayTitle }}</p>
            <p class="text-[10px] text-muted mt-1">{{ socialStore.profile.display_name }} · {{ socialStore.profile.honorific }}</p>
          </div>
          <span class="text-[10px] px-1.5 py-0.5 rounded-xs border border-accent/30 text-accent">
            {{ visibilityLabel }}
          </span>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-[10px] text-muted">庄园名</p>
            <p class="text-accent mt-1">{{ socialStore.profile.manor_name }}</p>
            <p class="text-[10px] text-muted mt-1">{{ socialStore.profile.public_title }}</p>
          </div>
          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-[10px] text-muted">季节进度</p>
            <p class="text-accent mt-1">{{ socialStore.profile.season_progress }}</p>
            <p class="text-[10px] text-muted mt-1">{{ socialStore.profile.showcase_theme }}</p>
          </div>
        </div>

        <div class="border border-accent/10 rounded-xs p-2 text-xs">
          <p class="text-[10px] text-muted">公开介绍</p>
          <p class="mt-1">{{ socialStore.profile.public_intro || '这个人还没写公开介绍。' }}</p>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-[10px] text-muted">主营方向</p>
            <p class="text-accent mt-1">{{ socialStore.profile.primary_route_label }}</p>
          </div>
          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-[10px] text-muted">邻里身份</p>
            <p class="text-accent mt-1">{{ socialStore.profile.neighborhood_role }}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-[10px] text-muted">最近活跃</p>
            <p class="text-accent mt-1">{{ socialStore.profile.recent_activity }}</p>
          </div>
          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-[10px] text-muted">本周展示主题</p>
            <p class="text-accent mt-1">{{ socialStore.profile.showcase_theme }}</p>
          </div>
        </div>
      </div>

      <div class="game-panel border border-accent/10 rounded-xs p-3 space-y-2">
        <p class="text-xs text-accent">名片设置</p>
        <div class="grid grid-cols-2 gap-2">
          <label class="flex flex-col gap-1 text-[10px] text-muted">
            庄园名
            <input v-model="socialStore.draftManorName" maxlength="40" class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent" />
          </label>
          <label class="flex flex-col gap-1 text-[10px] text-muted">
            公开称号
            <input v-model="socialStore.draftPublicTitle" maxlength="24" class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent" />
          </label>
          <label class="flex flex-col gap-1 text-[10px] text-muted">
            邻里身份
            <input v-model="socialStore.draftNeighborhoodRole" maxlength="24" class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent" />
          </label>
          <label class="flex flex-col gap-1 text-[10px] text-muted">
            展示主题
            <input v-model="socialStore.draftShowcaseTheme" maxlength="24" class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent" />
          </label>
        </div>
        <label class="flex flex-col gap-1 text-[10px] text-muted">
          公开状态
          <select v-model="socialStore.draftVisibility" class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent">
            <option value="public">公开</option>
            <option value="friends_only">仅好友（当前视作未公开）</option>
            <option value="private">私密</option>
          </select>
        </label>
        <label class="flex flex-col gap-1 text-[10px] text-muted">
          一句公开介绍
          <textarea
            v-model="socialStore.draftIntro"
            rows="3"
            maxlength="120"
            class="bg-bg border border-accent/20 rounded-xs px-2 py-1.5 text-xs text-text outline-none focus:border-accent resize-none"
            placeholder="例如：这周主打鱼塘与博物馆补展，欢迎来看看。"
          />
        </label>
        <div class="flex items-center justify-between gap-2">
          <p class="text-[10px] text-muted">保存后会同步成公开名片预览。</p>
          <Button class="text-[10px]" :disabled="!socialStore.hasDirtyDraft || socialStore.saving" @click="saveProfile">
            {{ socialStore.saving ? '保存中…' : '保存名片' }}
          </Button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted } from 'vue'
  import Button from '@/components/game/Button.vue'
  import { useSocialStore } from '@/stores/useSocialStore'

  const socialStore = useSocialStore()

  const visibilityLabel = computed(() => {
    if (!socialStore.profile) return '未公开'
    if (socialStore.profile.visibility === 'public') return '公开'
    if (socialStore.profile.visibility === 'friends_only') return '仅好友'
    return '私密'
  })

  const refreshProfile = async () => {
    await socialStore.refreshProfile().catch(() => {})
  }

  const saveProfile = async () => {
    await socialStore.saveProfile().catch(() => {})
  }

  onMounted(() => {
    if (!socialStore.profile) {
      void refreshProfile()
    }
  })
</script>
