<template>
  <GuidePageFrame
    eyebrow="主菜单资料 · 新手路线页"
    title="桃源乡新手教程"
    description="如果你是第一次来桃源乡，先看这页就够了。别急着把所有系统都弄明白，先把账号、存档、田庄选择和第一周节奏理顺，后面自然会顺很多。"
    :sections="sections"
    :badges="['主菜单入口', '当前版本路线页', '先看路线再去百科']"
  >
    <template #actions="{ jumpTo }">
      <Button class="justify-center" :icon="ArrowLeft" @click="goMenu">返回主菜单</Button>
      <Button class="justify-center" :icon="ScrollText" @click="jumpTo('first-week')">第一周路线</Button>
      <Button class="justify-center" :icon="BookOpen" @click="goGuideBook">百科全书</Button>
    </template>

    <template #default="{ jumpTo }">
      <section class="game-panel space-y-3">
        <Divider title label="一句话开局" />
        <div class="game-panel-muted p-3 text-xs leading-6">
          先把账号和存档方式确认好，再选田庄开局。前几天别贪，先靠种田把底盘稳住，体力有余再去钓鱼、采集或接委托，睡前记得手动存一次档。
        </div>
        <div class="flex flex-wrap gap-2">
          <Button class="justify-center !px-3 !py-2" :icon="Sparkles" @click="jumpTo('core-loop')">看核心循环</Button>
          <Button class="justify-center !px-3 !py-2" :icon="ClipboardList" @click="goGuideBookHash('quest-week')">任务板 / 主题周</Button>
        </div>
      </section>

      <section id="preflight" class="game-panel space-y-3">
        <Divider title label="1. 开始前确认" />
        <div class="grid gap-3 md:grid-cols-2">
          <section class="game-panel-muted p-3 space-y-2">
            <p class="text-xs text-accent">账号</p>
            <p class="text-[11px] text-muted leading-5">认真玩一档的话，先登录再开。主菜单现在已经写得很直白了：不登录直接开始，存档是留不住的。</p>
            <div class="space-y-1 text-xs leading-5">
              <p>准备长期玩：先注册 / 登录</p>
              <p>想用交流大厅、邮箱、额度兑换：必须先登录</p>
              <p>不想后面来回折腾：开局前就处理完</p>
            </div>
          </section>
          <section class="game-panel-muted p-3 space-y-2">
            <p class="text-xs text-accent">存档方式</p>
            <p class="text-[11px] text-muted leading-5">这里其实就是在问你：这档是随便看看，还是准备认真养。只是体验一下，本地档够用；真要长期玩，优先服务端持久化。</p>
            <div class="space-y-1 text-xs leading-5">
              <p>本地存储：偏当前设备</p>
              <p>服务端持久化：按账号读取，更适合长期游玩</p>
              <p>额度兑换：还要求载入目标服务端存档</p>
            </div>
          </section>
        </div>
        <div class="game-panel-muted p-3 space-y-2">
          <p class="text-xs text-accent">这些入口先知道，但不用一开始全研究</p>
          <p class="text-[11px] text-muted leading-5">交流大厅、邮箱、AI 助手这些入口你先认得就行。第一把最重要的，还是把主线、告示板和基础经营节奏跑顺。</p>
          <div class="flex flex-wrap gap-2">
            <Button class="justify-center !px-3 !py-2" :icon="BookMarked" @click="goGuideBookHash('start-and-save')">开始前与存档</Button>
            <Button class="justify-center !px-3 !py-2" :icon="MessagesSquare" @click="goGuideBookHash('online')">在线功能</Button>
          </div>
        </div>
      </section>

      <section id="rules" class="game-panel space-y-3">
        <Divider title label="2. 先记住这 5 条" />
        <div class="game-panel-muted p-3">
          <ol class="space-y-2 pl-5 text-xs leading-6">
            <li>第一把优先选桃源田庄。想早点碰动物线，再考虑草甸田庄。</li>
            <li>别什么都碰一点。前期先养出一条稳稳能赚钱的线，比什么都试一下更重要。</li>
            <li>不知道做什么，就去看任务页。桃源乡现在很少真让你“没方向”。</li>
            <li>到了中期，光会埋头刷钱不够了，还得学会看主题周和市场风向。</li>
            <li>保存别拖到最后。下矿前、换季前、大额花钱前后，都值得顺手存一下。</li>
          </ol>
        </div>
        <div class="border border-accent/15 rounded-xs bg-bg/10 px-3 py-3 text-xs leading-6 text-accent">
          你可以把前期节奏理解成一句话：任务给方向，种田保底，副线补钱，长线慢慢开。
        </div>
      </section>

      <section id="farm-choice" class="game-panel space-y-3">
        <Divider title label="3. 六种田庄怎么选" />
        <div class="grid gap-3 md:grid-cols-2">
          <section class="game-panel-muted p-3 space-y-2">
            <p class="text-xs text-accent">桃源田庄</p>
            <p class="text-[11px] text-muted leading-5">最稳，也最适合第一次玩。你会更容易把主线、种田、商圈和告示板这些基本盘跑顺。</p>
          </section>
          <section class="game-panel-muted p-3 space-y-2">
            <p class="text-xs text-accent">草甸田庄</p>
            <p class="text-[11px] text-muted leading-5">适合你就是想早点养鸡养牛。不过也别忘了，选了它就得更早开始管喂养和产物节奏。</p>
          </section>
          <section class="game-panel-muted p-3 space-y-2">
            <p class="text-xs text-accent">溪流田庄</p>
            <p class="text-[11px] text-muted leading-5">适合想靠钓鱼更早拉现金流的人。来钱会更快一点，但你也得开始注意天气、时间和钓点。</p>
          </section>
          <section class="game-panel-muted p-3 space-y-2">
            <p class="text-xs text-accent">竹林 / 山丘 / 荒野</p>
            <p class="text-[11px] text-muted leading-5">这些更像“带着想法开第二轮”的图。你已经知道自己偏采集、下矿或战斗时再选，会更舒服。</p>
          </section>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button class="justify-center !px-3 !py-2" :icon="BookMarked" @click="goGuideBookHash('farm-choice')">看详细说明</Button>
          <Button class="justify-center !px-3 !py-2" :icon="Wheat" @click="goGuideBookHash('life-production')">农场 / 牧场 / 加工</Button>
        </div>
      </section>

      <section id="first-week" class="game-panel space-y-3">
        <Divider title label="4. 第一天到第一周" />
        <div class="grid gap-3 xl:grid-cols-3">
          <section class="game-panel-muted p-3 space-y-2">
            <p class="text-xs text-accent">第一天</p>
            <div class="space-y-1 text-xs leading-5">
              <p>确认账号和存档方式，再正式开局</p>
              <p>只开你第二天能稳定浇完的地</p>
              <p>先看主线和任务页</p>
              <p>认一下商圈、背包、角色、告示板在哪</p>
            </div>
          </section>
          <section class="game-panel-muted p-3 space-y-2">
            <p class="text-xs text-accent">前 2 到 3 天</p>
            <div class="space-y-1 text-xs leading-5">
              <p>先养出第一条稳定现金流</p>
              <p>体力有余就用钓鱼或采集补钱</p>
              <p>开始做简单委托</p>
              <p>第一笔大钱优先给背包、仓储、工具或种子</p>
            </div>
          </section>
          <section class="game-panel-muted p-3 space-y-2">
            <p class="text-xs text-accent">第一周</p>
            <div class="space-y-1 text-xs leading-5">
              <p>保持主线不停</p>
              <p>开始理解主题周、市场和今日目标</p>
              <p>最多补一条副线</p>
              <p>别同时硬开鱼塘、育种、瀚海</p>
            </div>
          </section>
        </div>
        <div class="border border-success/20 rounded-xs bg-success/5 px-3 py-3 text-xs leading-6">
          第一周真正算打稳了，不是因为你赚了很多，而是因为你已经有稳定收入、主线没断，而且每天都知道下一步该去哪儿。
        </div>
      </section>

      <section id="core-loop" class="game-panel space-y-3">
        <Divider title label="5. 当前版本核心循环" />
        <div class="grid gap-3 xl:grid-cols-3">
          <section class="game-panel-muted p-3 space-y-2">
            <p class="text-xs text-accent">1. 看任务页 / 告示板</p>
            <p class="text-[11px] text-muted leading-5">主线、日常委托、特殊订单、限时活动会告诉你今天最值的方向。</p>
          </section>
          <section class="game-panel-muted p-3 space-y-2">
            <p class="text-xs text-accent">2. 看目标规划</p>
            <p class="text-[11px] text-muted leading-5">主题周、市场轮换、今日目标、活动，会决定这周最值得承接什么。</p>
          </section>
          <section class="game-panel-muted p-3 space-y-2">
            <p class="text-xs text-accent">3. 去对应系统出货</p>
            <p class="text-[11px] text-muted leading-5">农场、商圈、钓鱼、矿洞、牧场、加工，把“方向”变成资源和钱。</p>
          </section>
          <section class="game-panel-muted p-3 space-y-2">
            <p class="text-xs text-accent">4. 把收益回流</p>
            <p class="text-[11px] text-muted leading-5">工具、仓储、设施、预算和高价投入，决定你下周能承接多高一级的循环。</p>
          </section>
          <section class="game-panel-muted p-3 space-y-2">
            <p class="text-xs text-accent">5. 周结算后开新线</p>
            <p class="text-[11px] text-muted leading-5">基础线稳定后，再去接鱼塘、育种、博物馆、公会、瀚海这些长线系统。</p>
          </section>
          <section class="game-panel-muted p-3 space-y-2">
            <p class="text-xs text-accent">迷路时的默认答案</p>
            <p class="text-[11px] text-muted leading-5">真要是突然不知道今天干嘛了，就先看任务页，再看目标规划和引导面板，通常答案就在那儿。</p>
          </section>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button class="justify-center !px-3 !py-2" :icon="BookMarked" @click="goGuideBookHash('core-loop')">去百科看完整解释</Button>
        </div>
      </section>

      <section id="second-line" class="game-panel space-y-3">
        <Divider title label="6. 什么时候开第二条线" />
        <div class="grid gap-3 md:grid-cols-2">
          <section class="game-panel-muted p-3 space-y-2">
            <p class="text-xs text-accent">钓鱼 / 采集</p>
            <p class="text-[11px] text-muted leading-5">最适合第一条副线。前期缺现金流、缺任务材料时都很实用。</p>
          </section>
          <section class="game-panel-muted p-3 space-y-2">
            <p class="text-xs text-accent">矿洞</p>
            <p class="text-[11px] text-muted leading-5">开始明显缺矿石、工具材料和装备成长时就能开，但不建议第一周完全压重心。</p>
          </section>
          <section class="game-panel-muted p-3 space-y-2">
            <p class="text-xs text-accent">牧场 / 鱼塘</p>
            <p class="text-[11px] text-muted leading-5">牧场可以较早接；鱼塘现在有周赛、高阶养护和展示池，更适合中期再认真开。</p>
          </section>
          <section class="game-panel-muted p-3 space-y-2">
            <p class="text-xs text-accent">育种 / 博物馆 / 公会 / 瀚海 / 钱袋</p>
            <p class="text-[11px] text-muted leading-5">它们都已经是完整长线内容，适合你能稳定赚钱和推进周目标后再投入。</p>
          </section>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button class="justify-center !px-3 !py-2" :icon="Waves" @click="goGuideBookHash('fishpond')">钓鱼与鱼塘</Button>
          <Button class="justify-center !px-3 !py-2" :icon="FlaskConical" @click="goGuideBookHash('breeding')">育种</Button>
          <Button class="justify-center !px-3 !py-2" :icon="Landmark" @click="goGuideBookHash('museum')">博物馆</Button>
          <Button class="justify-center !px-3 !py-2" :icon="Swords" @click="goGuideBookHash('mining-guild')">矿洞与公会</Button>
          <Button class="justify-center !px-3 !py-2" :icon="Tent" @click="goGuideBookHash('hanhai')">瀚海</Button>
        </div>
      </section>

      <section id="common-blocks" class="game-panel space-y-3">
        <Divider title label="7. 常见卡点" />
        <div class="grid gap-3 md:grid-cols-2">
          <section class="game-panel-muted p-3 space-y-2">
            <p class="text-xs text-accent">我不知道今天该做什么</p>
            <p class="text-[11px] text-muted leading-5">先开任务页 / 告示板，再看目标规划和引导面板。当前版本默认就是让它们告诉你下一步。</p>
          </section>
          <section class="game-panel-muted p-3 space-y-2">
            <p class="text-xs text-accent">我总觉得钱不够</p>
            <p class="text-[11px] text-muted leading-5">先确保种田保底没断，再用钓鱼 / 采集补钱，不要一上来就把钱砸进多个长线系统。</p>
          </section>
          <section class="game-panel-muted p-3 space-y-2">
            <p class="text-xs text-accent">材料总是不够用</p>
            <p class="text-[11px] text-muted leading-5">现在任务、加工、育种、鱼塘都会吃材料，别把所有东西都卖光。</p>
          </section>
          <section class="game-panel-muted p-3 space-y-2">
            <p class="text-xs text-accent">我是不是该立刻去看百科</p>
            <p class="text-[11px] text-muted leading-5">不用先整页通读。新手页先看完，碰到具体问题时再去百科按主题查更有效。</p>
          </section>
        </div>
      </section>

      <section id="quick-links" class="game-panel space-y-3">
        <Divider title label="8. 快速查询入口" />
        <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          <Button class="justify-center !px-3 !py-2" :icon="Save" @click="goGuideBookHash('start-and-save')">账号、存档和保存</Button>
          <Button class="justify-center !px-3 !py-2" :icon="Map" @click="goGuideBookHash('farm-choice')">六种田庄与前七天</Button>
          <Button class="justify-center !px-3 !py-2" :icon="ClipboardList" @click="goGuideBookHash('quest-week')">任务板 / 主题周 / 周结算</Button>
          <Button class="justify-center !px-3 !py-2" :icon="Wheat" @click="goGuideBookHash('life-production')">农场、牧场、加工</Button>
          <Button class="justify-center !px-3 !py-2" :icon="Waves" @click="goGuideBookHash('fishpond')">钓鱼与鱼塘</Button>
          <Button class="justify-center !px-3 !py-2" :icon="FlaskConical" @click="goGuideBookHash('breeding')">育种</Button>
          <Button class="justify-center !px-3 !py-2" :icon="Landmark" @click="goGuideBookHash('museum')">博物馆</Button>
          <Button class="justify-center !px-3 !py-2" :icon="Tent" @click="goGuideBookHash('hanhai')">瀚海</Button>
          <Button class="justify-center !px-3 !py-2" :icon="Wallet" @click="goGuideBookHash('wallet-budget')">钱袋与预算</Button>
          <Button class="justify-center !px-3 !py-2" :icon="MessagesSquare" @click="goGuideBookHash('online')">在线功能</Button>
        </div>
      </section>

      <section id="faq" class="game-panel space-y-3">
        <Divider title label="9. 新手 FAQ" />
        <div class="space-y-3">
          <section class="game-panel-muted p-3 space-y-1">
            <p class="text-xs text-accent">Q1：我不登录也能直接玩吗？</p>
            <p class="text-[11px] text-muted leading-5">能进入流程，但当前主菜单已经明确提示：未登录直接开始旅程时，存档无法保存。</p>
          </section>
          <section class="game-panel-muted p-3 space-y-1">
            <p class="text-xs text-accent">Q2：第一周最重要的成果是什么？</p>
            <p class="text-[11px] text-muted leading-5">有稳定收入、主线没断、知道下一步该去哪一个页面。</p>
          </section>
          <section class="game-panel-muted p-3 space-y-1">
            <p class="text-xs text-accent">Q3：什么时候开始碰鱼塘和育种？</p>
            <p class="text-[11px] text-muted leading-5">鱼塘通常是中期；育种更偏中后期。两者现在都带周赛、评级和联动，不适合第一周硬开。</p>
          </section>
          <section class="game-panel-muted p-3 space-y-1">
            <p class="text-xs text-accent">Q4：我需要现在就把百科全书整页看完吗？</p>
            <p class="text-[11px] text-muted leading-5">不需要。先把这页看完，再按问题跳去百科查具体机制，效率更高。</p>
          </section>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button class="justify-center" :icon="BookOpen" @click="goGuideBook">进入百科全书</Button>
          <Button class="justify-center" :icon="ChevronUp" @click="jumpTo('preflight')">回到开头</Button>
        </div>
      </section>
    </template>
  </GuidePageFrame>
</template>

<script setup lang="ts">
  import { useRouter } from 'vue-router'
  import {
    ArrowLeft,
    BookMarked,
    BookOpen,
    ChevronUp,
    ClipboardList,
    FlaskConical,
    Landmark,
    Map,
    MessagesSquare,
    Save,
    ScrollText,
    Sparkles,
    Swords,
    Tent,
    Wallet,
    Waves,
    Wheat,
  } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import Divider from '@/components/game/Divider.vue'
  import GuidePageFrame, { type GuidePageSectionLink } from '@/components/game/GuidePageFrame.vue'

  const router = useRouter()

  const sections: GuidePageSectionLink[] = [
    { id: 'preflight', label: '开始前确认' },
    { id: 'rules', label: '先记住这 5 条' },
    { id: 'farm-choice', label: '六种田庄怎么选' },
    { id: 'first-week', label: '第一天到第一周' },
    { id: 'core-loop', label: '当前版本核心循环' },
    { id: 'second-line', label: '什么时候开第二条线' },
    { id: 'common-blocks', label: '常见卡点' },
    { id: 'quick-links', label: '快速查询入口' },
    { id: 'faq', label: '新手 FAQ' },
  ]

  const goMenu = () => {
    void router.push({ name: 'menu' })
  }

  const goGuideBook = () => {
    void router.push({ name: 'guide-book' })
  }

  const goGuideBookHash = (hash: string) => {
    void router.push({ name: 'guide-book', hash: `#${hash}` })
  }
</script>
