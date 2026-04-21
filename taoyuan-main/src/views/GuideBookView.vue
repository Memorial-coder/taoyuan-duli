/*
 * 本项目由Memorial开发，开源地址：https://github.com/Memorial-coder/taoyuan-duli，如果你觉得这个项目对你有帮助，也欢迎前往仓库点个 Star 支持一下，玩家交流群1094297186
 */
<template>
  <GuidePageFrame
    eyebrow="主菜单资料 · 系统索引页"
    title="桃源乡百科全书"
    description="如果你已经玩到“东西越来越多、页面越来越杂、但又说不清该先管哪件”的阶段，就来看这页。它不是冷冰冰的系统表，而是帮你把桃源乡现在这堆玩法理顺的一本大手册。"
    :sections="sections"
    :badges="['主菜单入口', '系统索引页', '统一到游戏 UI']"
  >
    <template #actions="{ jumpTo }">
      <Button class="justify-center" :icon="ArrowLeft" @click="goGuide">返回新手教程</Button>
      <Button class="justify-center" :icon="ScrollText" @click="jumpTo('core-loop')">核心循环</Button>
      <Button class="justify-center" :icon="Home" @click="goMenu">回主菜单</Button>
    </template>

    <template #default>
      <GuideBookManual />
    </template>
  </GuidePageFrame>
</template>

<script setup lang="ts">
  import { useRouter } from 'vue-router'
  import {
    ArrowLeft,
    Home,
    ScrollText,
  } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import GuidePageFrame, { type GuidePageSectionLink } from '@/components/game/GuidePageFrame.vue'
  import GuideBookManual from '@/components/game/GuideBookManual.vue'

  const router = useRouter()

  const sections: GuidePageSectionLink[] = [
    { id: 'how-to-use', label: '这页怎么用' },
    { id: 'menu-overview', label: '主菜单与开局入口' },
    { id: 'start-and-save', label: '开始前与存档' },
    { id: 'farm-choice', label: '田庄与前七天' },
    { id: 'core-loop', label: '当前版本核心循环' },
    { id: 'farm-system', label: '农场与林木' },
    { id: 'animal-system', label: '牧场与动物' },
    { id: 'home-system', label: '设施、仓库与建设' },
    { id: 'cottage-system', label: '小屋与家庭' },
    { id: 'village-system', label: '桃源村、村民与仙灵' },
    { id: 'shop-system', label: '商圈与采购' },
    { id: 'forage-system', label: '竹林与采集' },
    { id: 'fishing-system', label: '清溪钓鱼' },
    { id: 'cooking-system', label: '灶台与料理' },
    { id: 'processing-system', label: '工坊与制造' },
    { id: 'upgrade-system', label: '铁匠铺与工具升级' },
    { id: 'inventory-system', label: '背包与装备' },
    { id: 'skills-system', label: '技能与角色成长' },
    { id: 'collection-system', label: '图鉴与游戏内百科' },
    { id: 'quest-week', label: '任务板 / 主题周 / 周结算' },
    { id: 'fishpond', label: '钓鱼与鱼塘' },
    { id: 'mining-guild', label: '矿洞与公会' },
    { id: 'breeding', label: '育种' },
    { id: 'museum', label: '博物馆' },
    { id: 'mail-system', label: '邮箱' },
    { id: 'hanhai', label: '瀚海' },
    { id: 'wallet-budget', label: '钱袋、预算与高价投入' },
    { id: 'online', label: '在线功能' },
    { id: 'faq', label: '常见问题 FAQ' },
    { id: 'feature-matrix', label: '全入口速查矩阵' },
    { id: 'coverage-checklist', label: '功能覆盖清单' },
  ]

  const goMenu = () => {
    void router.push({ name: 'menu' })
  }

  const goGuide = () => {
    void router.push({ name: 'guide' })
  }
</script>
