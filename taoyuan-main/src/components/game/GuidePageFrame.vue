<template>
  <div
    class="guide-page-frame flex min-h-screen flex-col gap-6 px-4 py-6 md:py-8"
    :class="{ 'pt-10': Capacitor.isNativePlatform() }"
    @click.once="startBgm"
  >
    <div class="mx-auto w-full max-w-6xl space-y-4">
      <section class="game-panel space-y-3">
        <div class="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div class="space-y-2 min-w-0">
            <div class="flex items-center space-x-3">
              <div class="logo" />
              <div class="space-y-1 min-w-0">
                <p class="game-section-title">{{ eyebrow }}</p>
                <h1 class="text-accent text-lg md:text-xl break-words">{{ title }}</h1>
              </div>
            </div>
            <p class="max-w-3xl text-xs text-muted leading-6">
              {{ description }}
            </p>
            <div v-if="badges.length > 0" class="flex flex-wrap gap-2">
              <span v-for="badge in badges" :key="badge" class="game-chip">{{ badge }}</span>
            </div>
          </div>
          <div class="flex flex-wrap gap-2 xl:justify-end">
            <slot name="actions" :jumpTo="jumpTo" :goTop="goTop" />
          </div>
        </div>
      </section>

      <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside class="game-panel guide-page-frame__sidebar space-y-3">
          <div class="space-y-1">
            <p class="game-section-title">页面目录</p>
            <p class="game-section-desc">点一下直接跳到对应内容。</p>
          </div>
          <div class="flex flex-col gap-2">
            <button
              v-for="section in sections"
              :key="section.id"
              class="btn !justify-start !px-3 !py-2"
              type="button"
              @click="jumpTo(section.id)"
            >
              <span>{{ section.label }}</span>
            </button>
          </div>
        </aside>

        <main class="min-w-0 space-y-4">
          <slot :jumpTo="jumpTo" :goTop="goTop" />
        </main>
      </div>
    </div>

    <Button class="guide-page-frame__top !px-2 !py-1 justify-center" :icon="ChevronUp" :icon-size="12" @click="goTop">
      顶部
    </Button>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { Capacitor } from '@capacitor/core'
  import { ChevronUp } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import { useAudio } from '@/composables/useAudio'

  export interface GuidePageSectionLink {
    id: string
    label: string
  }

  withDefaults(
    defineProps<{
      eyebrow: string
      title: string
      description: string
      sections: GuidePageSectionLink[]
      badges?: string[]
    }>(),
    {
      badges: () => [],
    }
  )

  const route = useRoute()
  const router = useRouter()
  const { startBgm } = useAudio()

  const scrollToId = (id: string, behavior: 'auto' | 'smooth' = 'smooth') => {
    requestAnimationFrame(() => {
      const target = document.getElementById(id)
      if (!target) return
      target.scrollIntoView({
        behavior,
        block: 'start',
      })
    })
  }

  const jumpTo = async (id: string) => {
    const nextHash = `#${id}`
    if (route.hash !== nextHash) {
      await router.replace({ hash: nextHash })
    }
    scrollToId(id)
  }

  const goTop = async () => {
    if (route.hash) {
      await router.replace({ hash: '' })
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  onMounted(() => {
    if (route.hash) {
      scrollToId(route.hash.slice(1), 'auto')
    }
  })

  watch(
    () => route.hash,
    hash => {
      if (!hash) return
      scrollToId(hash.slice(1), 'auto')
    }
  )
</script>

<style scoped>
  .guide-page-frame__sidebar {
    top: 16px;
    position: sticky;
  }

  .guide-page-frame__top {
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 30;
  }

  .logo {
    width: 50px;
    height: 50px;
    background: url(@/assets/logo.png) center / contain no-repeat;
    image-rendering: pixelated;
    flex-shrink: 0;
  }

  @media (max-width: 1023px) {
    .guide-page-frame__sidebar {
      position: static;
    }
  }
</style>
