/*
 * 本项目由Memorial开发，开源地址：https://github.com/Memorial-coder/taoyuan-duli，如果你觉得这个项目对你有帮助，也欢迎前往仓库点个 Star 支持一下，玩家交流群1094297186
 */
import { createRouter, createWebHashHistory } from 'vue-router'
import { ensureLateGameDebugAccess, LATE_GAME_DEBUG_AUTH_QUERY_KEY } from '@/utils/lateGameDebugAccess'

const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) {
      return {
        el: to.hash,
        top: 12,
        behavior: 'smooth',
      }
    }
    return { top: 0 }
  },
  routes: [
    { path: '/', name: 'menu', component: () => import('@/views/MainMenu.vue') },
    { path: '/auth', name: 'auth', component: () => import('@/views/AuthView.vue') },
    { path: '/guide', name: 'guide', component: () => import('@/views/GuideView.vue') },
    { path: '/guide-book', name: 'guide-book', component: () => import('@/views/GuideBookView.vue') },
    { path: '/admin', name: 'admin', component: () => import('@/views/TaoyuanAdminView.vue') },
    { path: '/admin/users', name: 'admin-users', component: () => import('@/views/UserAdminView.vue') },
    { path: '/hall', name: 'hall', component: () => import('@/views/HallView.vue') },
    ...(import.meta.env.DEV
      ? [
          {
            path: '/dev/late-game',
            name: 'late-game-debug',
            component: () => import('@/views/dev/LateGameDebugView.vue'),
            meta: {
              requiresSuperAdmin: true,
            },
          }
        ]
      : []),
    {
      path: '/game',
      component: () => import('@/views/GameLayout.vue'),
      redirect: '/game/farm',
      children: [
        { path: 'farm', name: 'farm', component: () => import('@/views/game/FarmView.vue') },
        { path: 'animal', name: 'animal', component: () => import('@/views/game/AnimalView.vue') },
        { path: 'home', name: 'home', component: () => import('@/views/game/HomeView.vue') },
        { path: 'cottage', name: 'cottage', component: () => import('@/views/game/CottageView.vue') },
        { path: 'village', name: 'village', component: () => import('@/views/game/NpcView.vue') },
        { path: 'village-projects', name: 'village-projects', component: () => import('@/views/game/VillageView.vue') },
        { path: 'shop', name: 'shop', component: () => import('@/views/game/ShopView.vue') },
        { path: 'forage', name: 'forage', component: () => import('@/views/game/ForageView.vue') },
        { path: 'fishing', name: 'fishing', component: () => import('@/views/game/FishingView.vue') },
        { path: 'mining', name: 'mining', component: () => import('@/views/game/MiningView.vue') },
        { path: 'cooking', name: 'cooking', component: () => import('@/views/game/CookingView.vue') },
        { path: 'workshop', name: 'workshop', component: () => import('@/views/game/ProcessingView.vue') },
        { path: 'upgrade', name: 'upgrade', component: () => import('@/views/game/ToolUpgradeView.vue') },
        { path: 'inventory', name: 'inventory', component: () => import('@/views/game/InventoryView.vue') },
        { path: 'skills', name: 'skills', component: () => import('@/views/game/SkillView.vue') },
        { path: 'achievement', name: 'achievement', component: () => import('@/views/game/AchievementView.vue') },
        { path: 'glossary', name: 'glossary', component: () => import('@/views/game/GlossaryView.vue') },
        { path: 'wallet', name: 'wallet', component: () => import('@/views/game/WalletView.vue') },
        { path: 'quest', name: 'quest', component: () => import('@/views/game/QuestView.vue') },
        { path: 'mail', name: 'mail', component: () => import('@/views/game/MailView.vue') },
        { path: 'charinfo', name: 'charinfo', component: () => import('@/views/game/CharInfoView.vue') },
        { path: 'breeding', name: 'breeding', component: () => import('@/views/game/BreedingView.vue') },
        { path: 'museum', name: 'museum', component: () => import('@/views/game/MuseumView.vue') },
        { path: 'guild', name: 'guild', component: () => import('@/views/game/GuildView.vue') },
        { path: 'hanhai', name: 'hanhai', component: () => import('@/views/game/HanhaiView.vue') },
        { path: 'fishpond', name: 'fishpond', component: () => import('@/views/game/FishPondView.vue') },
        { path: 'decoration', name: 'decoration', component: () => import('@/views/game/DecorationView.vue') }
      ]
    }
  ]
})

router.beforeEach(async to => {
  if (to.meta?.requiresSuperAdmin !== true) return true
  if (!import.meta.env.DEV) return { name: 'menu' }

  try {
    await ensureLateGameDebugAccess()
    return true
  } catch {
    return {
      name: 'menu',
      query: {
        [LATE_GAME_DEBUG_AUTH_QUERY_KEY]: '1',
      },
    }
  }
})

export default router
