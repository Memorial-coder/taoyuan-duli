<template>
  <div class="space-y-3" data-testid="online-center">
    <section class="game-panel space-y-3">
      <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <div class="flex items-center gap-2 text-accent">
            <Wifi :size="16" />
            <h2 class="game-section-title">在线中心</h2>
          </div>
          <p class="mt-1 text-xs leading-5 text-muted">
            联机玩法统一从这里分流，交流大厅仍保留在主菜单外入口。
          </p>
        </div>
        <RouterLink class="online-action-btn online-action-btn--compact shrink-0" to="/hall">
          <MessageCircle :size="12" />
          交流大厅
        </RouterLink>
      </div>
    </section>

    <section class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
      <article
        v-for="module in modules"
        :key="module.routeName"
        class="game-panel-muted flex min-h-[168px] min-w-0 flex-col justify-between p-3"
      >
        <div class="min-w-0">
          <div class="flex items-center gap-2 text-accent">
            <component :is="module.icon" :size="15" />
            <h3 class="text-sm leading-5">{{ module.title }}</h3>
          </div>
          <p class="mt-2 text-xs leading-5 text-muted">{{ module.summary }}</p>
          <p class="mt-2 text-[10px] leading-4 text-muted">{{ module.status }}</p>
        </div>
        <RouterLink class="online-action-btn online-action-btn--compact mt-3 w-full" :to="{ name: module.routeName }">
          <ArrowRight :size="12" />
          进入
        </RouterLink>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
  import { ArrowRight, CalendarDays, Handshake, Home, MessageCircle, ShieldCheck, Users, Wifi } from 'lucide-vue-next'

  const modules = [
    {
      title: '庄园',
      summary: '公开展示、来访、留言、主题周、收藏。',
      status: '后续拆入庄园概览、主题、留言、来访、导览。',
      routeName: 'online-manor',
      icon: Home
    },
    {
      title: '邻里',
      summary: '名片、好友、邻里组织、订阅。',
      status: '后续拆入名片、好友、邻里组织和订阅。',
      routeName: 'online-neighbor',
      icon: Users
    },
    {
      title: '委托',
      summary: '在线求助单、接单、交付、互助声望。',
      status: '后续迁出在线求助单，单人任务板保持独立。',
      routeName: 'online-orders',
      icon: Handshake
    },
    {
      title: '节会',
      summary: '世界事件、节会房间、远征房间、纪念。',
      status: '后续拆入世界事件、房间和远征入口。',
      routeName: 'online-festival',
      icon: CalendarDays
    },
    {
      title: '村社',
      summary: '组织、成员、仓库、提案、公共建设。',
      status: '后续拆入村社治理、仓库、建设和史册。',
      routeName: 'online-society',
      icon: ShieldCheck
    }
  ] as const
</script>
