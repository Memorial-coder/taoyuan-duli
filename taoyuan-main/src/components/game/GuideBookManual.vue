<template>
  <section id="how-to-use" class="game-panel space-y-3">
    <Divider title label="1. 这页怎么用" />
    <div class="game-panel-muted p-3 space-y-2 text-xs leading-6">
      <p>你可以把这页当成一本放在主菜单里的“桃源乡说明书”。它不是给程序看的，也不是让你背概念的，而是帮你在想不明白时，快速知道该去哪里、先做什么、这一页到底值不值得花时间。</p>
      <p>如果你刚开局，先看新手教程；如果你已经玩到中期，开始觉得系统越来越多、页面越来越杂，那这页就是拿来理顺思路的。</p>
      <p>它主要解决三类问题：这个入口是干嘛的、我现在是不是该碰这条线、它和别的玩法到底有什么关系。</p>
      <p>至于某个物品从哪来、送谁好、什么时候出现，这类更细的事，还是建议你进游戏以后用独立百科页查，会更快。</p>
    </div>
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <div class="game-panel-muted p-3 space-y-1">
        <p class="text-xs text-accent">适合什么时候看</p>
        <p class="text-[11px] text-muted leading-5">开档前、卡关时、想换流派时、准备开新系统时。</p>
      </div>
      <div class="game-panel-muted p-3 space-y-1">
        <p class="text-xs text-accent">推荐使用方式</p>
        <p class="text-[11px] text-muted leading-5">先从目录跳到对应系统，再看该系统的“入口 / 核心玩法 / 中期联动 / 常见误区”。</p>
      </div>
      <div class="game-panel-muted p-3 space-y-1">
        <p class="text-xs text-accent">和游戏内百科的分工</p>
        <p class="text-[11px] text-muted leading-5">这里讲系统结构，游戏内百科讲具体物品、机制、条件和词条。</p>
      </div>
    </div>
  </section>

  <section id="menu-overview" class="game-panel space-y-3">
    <Divider title label="2. 主菜单与开局入口" />
    <div class="game-panel-muted p-3 space-y-2 text-xs leading-6">
      <p>现在的主菜单已经不是一张单纯的封面图了，它更像是你每次进入桃源乡前的准备桌。</p>
      <p>桌面端会把账号、存档方式和继续旅程分区摆开；非桌面端则会把“存档方式 + 继续旅程”合并到同一张卡里，省得你来回滚动。</p>
      <p>说白了，它想让你开局前先想明白三件事：这次用哪个账号、这档存在哪儿、我是开新局还是继续老日子。</p>
    </div>
    <div class="grid gap-3 md:grid-cols-2">
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">账号状态卡片</p>
        <p class="text-[11px] text-muted leading-5">会显示当前登录账号，未登录时会明确提醒你登录后才能稳定使用云存档、交流大厅、额度兑换和邮箱。</p>
        <p class="text-[11px] text-muted leading-5">如果当前已登录，主菜单还会直接提供退出按钮，方便切账号。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">存档方式卡片</p>
        <p class="text-[11px] text-muted leading-5">这里能切换本地存储和服务端持久化，同时显示当前模式说明。非桌面端还会把继续旅程直接并进来。</p>
        <p class="text-[11px] text-muted leading-5">当前设计明显在引导你把“账号”和“存档模式”先处理好，再开始长期游玩。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">开始与入口区域</p>
        <p class="text-[11px] text-muted leading-5">新的旅程负责开新局，新手教程和百科全书负责带路，交流大厅是看别人心得和提问的地方，桃源管理则偏后台用途。</p>
        <p class="text-[11px] text-muted leading-5">如果开了相关配置，这里还会再多出返回首页和关于游戏按钮。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">继续旅程区域</p>
        <p class="text-[11px] text-muted leading-5">桌面端这里仍是独立区域；非桌面端则会被提到上方，和存档方式合并展示，方便直接选档继续。</p>
        <p class="text-[11px] text-muted leading-5">你是接着过现在的日子，还是另开一档走别的路线，大多都从这里分出来。</p>
      </section>
    </div>
    <div class="border border-accent/15 rounded-xs bg-bg/10 px-3 py-3 text-xs leading-6">
      主菜单真正想让你做的，不是“马上点开始”，而是先把身份和存档弄明白，再决定今天要怎么进桃源乡。
    </div>
  </section>

  <section id="start-and-save" class="game-panel space-y-3">
    <Divider title label="3. 开始前与存档" />
    <div class="grid gap-3 md:grid-cols-2">
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">登录与注册</p>
        <p class="text-[11px] text-muted leading-5">登录页现在是单独的一页，登录和注册都能直接处理，成功后会自动回主菜单并同步账号。</p>
        <p class="text-[11px] text-muted leading-5">如果你打算认真玩一档，别跳过这一步。主菜单已经说得很清楚了：不登录，存档就留不住。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">本地存储</p>
        <p class="text-[11px] text-muted leading-5">偏当前设备使用，适合测试、离线体验和手动导入导出备份。</p>
        <p class="text-[11px] text-muted leading-5">优点是直接、轻量；缺点是换设备或清缓存时风险更高。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">服务端持久化</p>
        <p class="text-[11px] text-muted leading-5">它更像“把这档和账号绑在一起”。适合长期玩、换设备继续，也适合搭配大厅、邮箱和额度兑换这些在线功能。</p>
        <p class="text-[11px] text-muted leading-5">要是你已经决定这档要好好养，优先切到服务端持久化会更省心。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">显式保存与活跃槽位</p>
        <p class="text-[11px] text-muted leading-5">无论是主菜单继续、顶栏保存还是保存并返回，底层都围绕“当前活跃存档槽位”运转。</p>
        <p class="text-[11px] text-muted leading-5">所以遇到“为什么保存不生效”时，第一反应不是怀疑按钮坏了，而是先确认自己当前是不是有正确的活动存档。</p>
      </section>
    </div>
    <div class="grid gap-3 md:grid-cols-3">
      <section class="game-panel-muted p-3 space-y-1">
        <p class="text-xs text-accent">导入 / 导出</p>
        <p class="text-[11px] text-muted leading-5">适合手动备份、迁移档案和调试。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-1">
        <p class="text-xs text-accent">WebDAV</p>
        <p class="text-[11px] text-muted leading-5">属于额外同步能力，不替代你对当前存档模式的理解。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-1">
        <p class="text-xs text-accent">关于额度兑换</p>
        <p class="text-[11px] text-muted leading-5">不仅要登录，还要切到服务端持久化并载入目标存档。</p>
      </section>
    </div>
    <div class="border border-warning/20 rounded-xs bg-warning/5 px-3 py-3 text-xs leading-6">
      最容易让人吃亏的，不是不会按保存，而是没弄清楚“我现在玩的这份进度，到底绑在哪个模式、哪个槽位上”。
    </div>
  </section>

  <section id="farm-choice" class="game-panel space-y-3">
    <Divider title label="4. 田庄与前七天" />
    <div class="overflow-x-auto">
      <table class="w-full min-w-[760px] text-left text-xs">
        <thead>
          <tr class="border-b border-accent/20 text-accent">
            <th class="px-2 py-2">田庄</th>
            <th class="px-2 py-2">核心偏向</th>
            <th class="px-2 py-2">更适合谁</th>
            <th class="px-2 py-2">开局建议</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b border-accent/10">
            <td class="px-2 py-2">桃源田庄</td>
            <td class="px-2 py-2 text-muted">稳定农耕</td>
            <td class="px-2 py-2 text-muted">完全新手、种田保底流</td>
            <td class="px-2 py-2 text-muted">默认推荐，最容易把主线、商圈和告示板跑顺。</td>
          </tr>
          <tr class="border-b border-accent/10">
            <td class="px-2 py-2">草甸田庄</td>
            <td class="px-2 py-2 text-muted">畜牧舒适开局</td>
            <td class="px-2 py-2 text-muted">想提早碰牧场的人</td>
            <td class="px-2 py-2 text-muted">更早进入鸡舍和动物产物线，但维护复杂度略高。</td>
          </tr>
          <tr class="border-b border-accent/10">
            <td class="px-2 py-2">溪流田庄</td>
            <td class="px-2 py-2 text-muted">钓鱼现金流</td>
            <td class="px-2 py-2 text-muted">想靠钓鱼起钱的人</td>
            <td class="px-2 py-2 text-muted">适合愿意围绕天气、地点和时间行动的玩家。</td>
          </tr>
          <tr class="border-b border-accent/10">
            <td class="px-2 py-2">竹林田庄</td>
            <td class="px-2 py-2 text-muted">采集与材料</td>
            <td class="px-2 py-2 text-muted">偏资源堆料流</td>
            <td class="px-2 py-2 text-muted">适合会主动承接采集、加工和任务材料的人。</td>
          </tr>
          <tr class="border-b border-accent/10">
            <td class="px-2 py-2">山丘田庄</td>
            <td class="px-2 py-2 text-muted">采矿成长</td>
            <td class="px-2 py-2 text-muted">想更快接矿洞与工具升级</td>
            <td class="px-2 py-2 text-muted">适合有明确矿石与装备成长目标的玩家。</td>
          </tr>
          <tr>
            <td class="px-2 py-2">荒野田庄</td>
            <td class="px-2 py-2 text-muted">战斗挑战</td>
            <td class="px-2 py-2 text-muted">第二轮或明确战斗流</td>
            <td class="px-2 py-2 text-muted">不太推荐第一把盲选，更适合你已经知道自己想玩什么。</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="grid gap-3 xl:grid-cols-3">
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">第一天重点</p>
        <p class="text-[11px] text-muted leading-5">把账号和存档确认好，地先少开一点，先接主线和任务，把商圈和背包认熟。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">前三天重点</p>
        <p class="text-[11px] text-muted leading-5">先把第一条稳定收入线养起来，开始接点简单委托，第一笔大钱优先砸在背包、仓储、工具和种子上。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">第一周重点</p>
        <p class="text-[11px] text-muted leading-5">主线别断，慢慢开始看懂主题周、市场和今日目标。副线最多先补一条，别一下把中后期系统全掀开。</p>
      </section>
    </div>
    <div class="border border-success/20 rounded-xs bg-success/5 px-3 py-3 text-xs leading-6">
      前七天最重要的不是“我把所有系统都试过了”，而是“我已经能把主线、收入和下一步方向稳稳地接起来了”。
    </div>
  </section>

  <section id="core-loop" class="game-panel space-y-3">
    <Divider title label="5. 当前版本核心循环" />
    <div class="grid gap-3 xl:grid-cols-3">
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">看任务页 / 告示板</p>
        <p class="text-[11px] text-muted leading-5">这里最像“今天该干嘛”的答案。主线、委托、特殊订单和活动都会在这儿给你方向。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">看目标规划</p>
        <p class="text-[11px] text-muted leading-5">这一块更像“这周值不值得押这条线”。主题周、市场、今日目标都会在这儿提醒你风向。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">去对应系统出货</p>
        <p class="text-[11px] text-muted leading-5">农场、商圈、钓鱼、矿洞、牧场、加工这些页面，负责把“方向”变成真东西：钱、材料和能交的成果。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">把收益回流</p>
        <p class="text-[11px] text-muted leading-5">背包扩容、工具强化、设施解锁、预算投入和高价消费，会决定你下周能不能承接更大体量的经营结构。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">周结算放大收益</p>
        <p class="text-[11px] text-muted leading-5">周目标、奖励池、周赛、馆务和赛季，把你这一周的投入转成更长期的滚雪球回报。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">再开新系统</p>
        <p class="text-[11px] text-muted leading-5">等基础线真的稳了，再去认真碰鱼塘、育种、博物馆、公会、瀚海和钱袋预算，节奏会舒服很多。</p>
      </section>
    </div>
    <div class="border border-accent/15 rounded-xs bg-bg/10 px-3 py-3 text-xs leading-6 text-accent">
      你可以把现在的桃源乡理解成“很多条生活线缠在一起往前走”，而不是“只要种地就行”的单系统经营。
    </div>
  </section>

  <section id="farm-system" class="game-panel space-y-3">
    <Divider title label="6. 农场与林木" />
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">田庄标签页</p>
        <p class="text-[11px] text-muted leading-5">农场页本身分成田庄和林木两个标签。田庄负责作物地块，林木负责果树、野树和相关采脂、砍伐逻辑。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">基础循环</p>
        <p class="text-[11px] text-muted leading-5">标准顺序仍然是开垦、播种、浇水、等待成熟、收获和出售。换季前一定要确认成熟时间，不然作物会直接枯萎。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">批量操作</p>
        <p class="text-[11px] text-muted leading-5">现在农场页已经提供一键浇水、一键开垦、一键收获、一键种植、一键施肥、一键除虫、一键除草，适合中后期提效。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">田庄地图特性</p>
        <p class="text-[11px] text-muted leading-5">部分田庄会在农场页体现特殊资源，如溪流鱼获、山丘地表矿脉等，这些不是额外彩蛋，而是开局地图特性的直接收益体现。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">农场设施</p>
        <p class="text-[11px] text-muted leading-5">稻草人、避雷针、洒水器等会直接改变日常维护压力。中期以后，如果你还完全手工处理所有地块，节奏会越来越紧。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">育种种子接线</p>
        <p class="text-[11px] text-muted leading-5">农场地块和温室都已经能承接育种种子，所以农场页本身也是育种长期经营链的一部分，而不只是普通作物页。</p>
      </section>
    </div>
    <div class="game-panel-muted p-3 space-y-2 text-xs leading-6">
      <p>林木线除了果树和野树成长，还涉及砍伐、树脂采集、树苗种植和长期素材供应。对加工流和仓储流来说，林木不是装饰性内容，而是稳定原料来源。</p>
      <p>温室线则是农场页的重要跃迁点。温室解锁后，你在任何季节都能种植作物，而且后续还能承接批量播种和育种种子，是中期节奏从“季节被动”转向“全年规划”的关键。</p>
    </div>
  </section>

  <section id="animal-system" class="game-panel space-y-3">
    <Divider title label="7. 牧场与动物" />
    <div class="grid gap-3 md:grid-cols-2">
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">宠物区域</p>
        <p class="text-[11px] text-muted leading-5">牧场页最上方会单独维护宠物。宠物有名字、好感、每日抚摸状态，高好感后还能带回采集物。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">鸡舍 / 牲口棚 / 马厩</p>
        <p class="text-[11px] text-muted leading-5">不同建筑承载不同动物类型，并通过升级解锁更高容量、孵化器和更多经营深度。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">日常照料</p>
        <p class="text-[11px] text-muted leading-5">喂食、抚摸、关注饥饿和心情，是维持动物线稳定产出的基本动作。页面也提供一键抚摸之类的减压按钮。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">疾病与治疗</p>
        <p class="text-[11px] text-muted leading-5">动物会生病，生病天数会累积，需要治疗。说明动物线不是“买完就等产物”，而是有维护成本和照护节奏的。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">孵化器</p>
        <p class="text-[11px] text-muted leading-5">鸡舍和牲口棚达到一定等级后都会出现孵化器。背包里有对应蛋时，就能把扩繁和长期培育接进来。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">出售与重整</p>
        <p class="text-[11px] text-muted leading-5">每只动物都可以单独出售，这意味着牧场线本身也支持经营调整，而不是只能不断堆数量。</p>
      </section>
    </div>
    <div class="border border-accent/15 rounded-xs bg-bg/10 px-3 py-3 text-xs leading-6">
      牧场系统的真正门槛不是建鸡舍，而是你是否愿意每天稳定处理“喂养、抚摸、疾病、繁殖、产物”这一整套维护节奏。
    </div>
  </section>

  <section id="home-system" class="game-panel space-y-3">
    <Divider title label="8. 设施、仓库与建设" />
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">村庄建设总览</p>
        <p class="text-[11px] text-muted leading-5">设施页最上层会展示村庄建设概览，包括完成项目数、可推进项目、维护计划和捐赠计划，是长线治理的枢纽页。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">可推进项目</p>
        <p class="text-[11px] text-muted leading-5">这里能直接看到当前哪些建设项目已经满足条件，说明设施页不仅是“拥有了什么”，也是“下一步能建什么”。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">维护与捐赠</p>
        <p class="text-[11px] text-muted leading-5">建设不是一次性完成就结束。维护状态和捐赠推进会持续影响长期经营收益与开放内容。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">家庭 / 陪伴模块</p>
        <p class="text-[11px] text-muted leading-5">设施页还会汇总婚后分工、知己项目、孩子数量和家庭心愿，说明家庭线已经被纳入正式运营结构。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">山洞</p>
        <p class="text-[11px] text-muted leading-5">山洞会在收入达到一定阶段后开放，并要求你在蘑菇洞和蝙蝠洞之间做一次不可逆选择，是中期资源倾向的重要分支。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">温室</p>
        <p class="text-[11px] text-muted leading-5">设施页负责温室解锁，真正使用则回到农场页承接。它是“设施解锁”与“生产效率”之间最典型的一次交汇。</p>
      </section>
    </div>
    <div class="grid gap-3 md:grid-cols-2">
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">仓库</p>
        <p class="text-[11px] text-muted leading-5">仓库解锁后可以放置箱子分类存放物品，是中后期材料管理的基本盘。如果没有仓库，你会越来越难承接加工和长期订单。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">虚空箱</p>
        <p class="text-[11px] text-muted leading-5">一旦做出虚空箱，就能远程存取。它是对仓库体系的进一步升级，适合高频跑图和多线经营。</p>
      </section>
    </div>
  </section>

  <section id="cottage-system" class="game-panel space-y-3">
    <Divider title label="9. 小屋与家庭" />
    <div class="game-panel-muted p-3 space-y-2 text-xs leading-6">
      <p>导航里的“小屋”并不只是一个装饰性入口，它会随着婚姻和家庭状态发生变化，甚至会在有配偶后切换成心形图标。</p>
      <p>这说明小屋页本质上是家庭生活的运营面板，而不仅仅是住所展示。配偶、孩子、家庭提议、婚后协作和长期陪伴感都会在这条线上逐步展开。</p>
      <p>如果你把“家庭线”理解成单纯剧情线，就会低估它对日常经营的影响。当前版本里，家庭心愿、婚后分工和陪伴收益已经在多个页面有了反向体现。</p>
      <p>当前可婚 NPC 已支持同性婚姻；如果是同性伴侣，家庭扩展会走“迎一个孩子回家”的专线，而不是沿用孕期语义。</p>
      <p>若你和某位同性 NPC 当前已经是知己，想转去婚缘路线，需要先断缘，再重新赠帕开始约会。</p>
    </div>
    <div class="grid gap-3 md:grid-cols-3">
      <section class="game-panel-muted p-3 space-y-1">
        <p class="text-xs text-accent">婚后生活</p>
        <p class="text-[11px] text-muted leading-5">不只多一段关系，而是多一套家庭经营和互动目标。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-1">
        <p class="text-xs text-accent">孩子与提议</p>
        <p class="text-[11px] text-muted leading-5">孩子数量和家庭提议已经被接入正式系统，而不是独立剧情弹窗。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-1">
        <p class="text-xs text-accent">关系的系统价值</p>
        <p class="text-[11px] text-muted leading-5">会反向作用于心愿、陪伴、部分委托和整体生活节奏。</p>
      </section>
    </div>
  </section>

  <section id="village-system" class="game-panel space-y-3">
    <Divider title label="10. 桃源村、村民与仙灵" />
    <div class="grid gap-3 md:grid-cols-2">
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">桃源村页面</p>
        <p class="text-[11px] text-muted leading-5">承担 NPC 关系、送礼、心事件、知己线和仙灵线，是“人际 / 陪伴 / 关系收益”的主入口。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">日常村民关系</p>
        <p class="text-[11px] text-muted leading-5">聊天、送礼、生日、日程和心事件提示，都是提升好感和解锁剧情的基础动作。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">知己线</p>
        <p class="text-[11px] text-muted leading-5">即使不走恋爱，也能通过知己线承接协作项目、关系收益和生活化内容。知己与婚缘互斥；若想从知己转婚缘，必须先断缘。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">仙灵线</p>
        <p class="text-[11px] text-muted leading-5">传闻、显现、互动、供奉、求缘、结缘是一整条独立进阶链，后期还会转化成祝福与长期能力。</p>
      </section>
    </div>
    <div class="border border-accent/15 rounded-xs bg-bg/10 px-3 py-3 text-xs leading-6">
      村庄页在当前版本里的作用，是把“关系”和“经营”重新接起来：它既讲感情，也讲收益和路线承接。
    </div>
  </section>

  <section id="shop-system" class="game-panel space-y-3">
    <Divider title label="11. 商圈与采购" />
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">商圈总入口</p>
        <p class="text-[11px] text-muted leading-5">商圈不是单一商店，而是多个子商铺的集合。能进商圈，不等于每家店当天都开门。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">经济观测看板</p>
        <p class="text-[11px] text-muted leading-5">当前商店页已经不只是卖东西，还会展示经济风险、市场轮换、推荐消费池和地区收购详情。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">目录运营</p>
        <p class="text-[11px] text-muted leading-5">目录货架、主题周承接、本周精选和流派推荐，会决定你现在花钱是“补漏”还是“押方向”。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">万物铺</p>
        <p class="text-[11px] text-muted leading-5">负责大部分种子、基础材料、背包扩容、仓库扩容、农场扩建等开荒资源。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">铁匠铺 / 渔具铺 / 药铺等</p>
        <p class="text-[11px] text-muted leading-5">不同子店对应不同成长线：工具、武器、鱼饵与浮漂、肥料与药剂、礼品和穿戴等都分散在各个铺子里。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">买入与卖出</p>
        <p class="text-[11px] text-muted leading-5">商店页本身已经提供买卖双向操作、筛选、批量出售和价格预览，是背包出货的重要接口。</p>
      </section>
    </div>
    <div class="game-panel-muted p-3 space-y-2 text-xs leading-6">
      <p>当前版本的商圈页更像“经济中枢”，而不是单纯“点开买点东西”的页面。很多玩家卡中期，其实不是不会赚钱，而是不会看商圈给出的轮换和推荐。</p>
    </div>
  </section>

  <section id="forage-system" class="game-panel space-y-3">
    <Divider title label="12. 竹林与采集" />
    <div class="grid gap-3 md:grid-cols-2">
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">采集页定位</p>
        <p class="text-[11px] text-muted leading-5">竹林页是前中期很稳定的资源补给线，门槛低、即时性强，特别适合没准备好下矿或钓鱼时补材料。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">采集能提供什么</p>
        <p class="text-[11px] text-muted leading-5">食材、草药、木材、任务素材和可卖物品都能从这里来，是很多订单和加工链的底层支撑。</p>
      </section>
    </div>
    <div class="game-panel-muted p-3 space-y-2 text-xs leading-6">
      <p>采集的价值在当前版本里有两个层次：第一层是补日常资源，第二层是低压力地承接任务和生产链。你不一定总靠它赚钱，但很多“缺一点点材料”的问题都能靠它兜底。</p>
      <p>竹林田庄尤其容易把这条线滚起来，因为地图特性会直接强化你从采集页得到的回报。</p>
    </div>
  </section>

  <section id="fishing-system" class="game-panel space-y-3">
    <Divider title label="13. 清溪钓鱼" />
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">钓点选择</p>
        <p class="text-[11px] text-muted leading-5">钓鱼页开头就要先选地点。不同钓点会决定当前可钓鱼种，所以地点、天气、时间是钓鱼收益的基本前提。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">陪伴 / 仙缘联动</p>
        <p class="text-[11px] text-muted leading-5">钓鱼页已经接入家庭心愿和仙灵祝福，说明钓鱼也不再是纯独立副业，而是会被陪伴系统反向影响。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">装备</p>
        <p class="text-[11px] text-muted leading-5">鱼竿、鱼饵、浮漂都会影响效率和体验。鱼竿升级后，钩子范围、可装浮漂条件和操作时限都会改变。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">抛竿与结果</p>
        <p class="text-[11px] text-muted leading-5">抛竿会消耗体力和时间，钓鱼结果页则会即时反馈今天的产出，是前期最直接的现金流补线之一。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">当前可钓鱼类</p>
        <p class="text-[11px] text-muted leading-5">页面会明确列出当前时段真正能钓到的鱼，因此“今天钓什么”其实是个可读信息，而不是只能靠试错。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">蟹笼与淘金</p>
        <p class="text-[11px] text-muted leading-5">钓鱼页不仅有抛竿，还有蟹笼管理和雨天淘金，这让清溪页逐渐变成一条更完整的水域经营线。</p>
      </section>
    </div>
    <div class="border border-accent/15 rounded-xs bg-bg/10 px-3 py-3 text-xs leading-6">
      钓鱼在当前版本里仍然适合做前期副现金流，但已经不是“单点赚钱小游戏”，而是一条能延伸到鱼塘、家庭、仙缘和资源采集的正式经营路线。
    </div>
  </section>

  <section id="cooking-system" class="game-panel space-y-3">
    <Divider title label="14. 灶台与料理" />
    <div class="grid gap-3 md:grid-cols-2">
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">食谱列表</p>
        <p class="text-[11px] text-muted leading-5">灶台页会列出所有已学会食谱，并支持只看“当前可制作”的过滤视角。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">恢复与增益</p>
        <p class="text-[11px] text-muted leading-5">料理不仅恢复体力和生命，还可能带增益效果，所以它不只是补给品，也是战斗、跑图和生产提效工具。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">材料校验与数量制作</p>
        <p class="text-[11px] text-muted leading-5">灶台页会清楚展示每道菜缺哪些材料、最多能做几份，因此很适合从“临时做一份”过渡到“批量备餐”。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">食谱来源</p>
        <p class="text-[11px] text-muted leading-5">如果没有食谱，页面会明确提示常见来源，例如与村民交好或观看电视，说明食谱学习也被纳入了长期成长链。</p>
      </section>
    </div>
    <div class="game-panel-muted p-3 space-y-2 text-xs leading-6">
      <p>灶台的真实价值是把“普通材料”变成“恢复、增益、礼物、任务素材和利润品”。很多玩家早期只把料理当体力药，到了中期就会发现自己错过了很大一块承接能力。</p>
    </div>
  </section>

  <section id="processing-system" class="game-panel space-y-3">
    <Divider title label="15. 工坊与制造" />
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">加工区与制造区双标签</p>
        <p class="text-[11px] text-muted leading-5">工坊页不是单层页面，而是分成“加工区”和“制造区”两部分：前者跑机器产线，后者做新机器或设施。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">加工机器管理</p>
        <p class="text-[11px] text-muted leading-5">机器按类型分组，支持展开、折叠、批量加工、一键收取和全部取消，说明工坊已经是正式产线面板而不是几个按钮的集合。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">只看可加工</p>
        <p class="text-[11px] text-muted leading-5">“只显示有材料的配方”会显著提升中后期效率，尤其当机器种类和配方量都起来以后。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">种子制造机等特殊机器</p>
        <p class="text-[11px] text-muted leading-5">某些机器并不是普通输入输出，它们还会带品质、配方细分和育种接线，这也是工坊和育种系统连接的重要节点。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">工坊升级</p>
        <p class="text-[11px] text-muted leading-5">工坊等级会影响可放机器数和整体产线容量。机器不是孤立的，工坊等级本身也是资源天花板。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">制造区</p>
        <p class="text-[11px] text-muted leading-5">制造区负责做出新的加工机、功能设施和部分生产工具，是“开新链路”的直接入口。</p>
      </section>
    </div>
  </section>

  <section id="upgrade-system" class="game-panel space-y-3">
    <Divider title label="16. 铁匠铺与工具升级" />
    <div class="grid gap-3 md:grid-cols-2">
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">工具升级机制</p>
        <p class="text-[11px] text-muted leading-5">工具升级需要金属锭和铜钱，并且要等待 2 天完成。这意味着升级是计划行为，而不是即刻强化。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">升级预览</p>
        <p class="text-[11px] text-muted leading-5">页面会展示从当前等级到下一等级的成本、材料、体力减免变化，以及钓竿类工具的额外属性提升。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">小满好感度要求</p>
        <p class="text-[11px] text-muted leading-5">高等级工具不只是资源要求，还会绑定铁匠关系进度，说明工具升级也被纳入了社交成长体系。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">锻造中状态</p>
        <p class="text-[11px] text-muted leading-5">升级过程会显示剩余天数和进度条，提醒你近期规划要考虑工具暂时不可用或暂时不提升的窗口。</p>
      </section>
    </div>
  </section>

  <section id="inventory-system" class="game-panel space-y-3">
    <Divider title label="17. 背包与装备" />
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">物品页</p>
        <p class="text-[11px] text-muted leading-5">支持整理、筛选、锁定、按品质查看。背包容量满时，管理效率会直接影响你整天的行动手感。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">临时背包</p>
        <p class="text-[11px] text-muted leading-5">当正式背包塞满时，溢出物品会进临时背包，需要尽快取回。这是当前版本对“背包管理失败”的直接缓冲层。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">装备页</p>
        <p class="text-[11px] text-muted leading-5">武器、帽子、鞋子等都有单独装备逻辑，不再只是静态收藏品。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">装备方案</p>
        <p class="text-[11px] text-muted leading-5">背包页已经支持装备方案，这代表切流派和切场景时，可以不必完全手工重新搭配。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">品质与锁定</p>
        <p class="text-[11px] text-muted leading-5">锁定机制能避免误卖和误处理，品质显示则帮助你快速判断哪些资源应该留下来承接高阶系统。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">为什么背包这么重要</p>
        <p class="text-[11px] text-muted leading-5">钓鱼、下矿、采集、加工、订单都依赖背包空间。背包管理差，会连锁拖慢几乎所有系统。</p>
      </section>
    </div>
  </section>

  <section id="skills-system" class="game-panel space-y-3">
    <Divider title label="18. 技能与角色成长" />
    <div class="grid gap-3 md:grid-cols-2">
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">技能页</p>
        <p class="text-[11px] text-muted leading-5">农耕、采集、钓鱼、挖矿、战斗都有等级、经验条和每级收益，后期还会延伸到多层天赋。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">专精天赋</p>
        <p class="text-[11px] text-muted leading-5">Lv5、Lv10、Lv15、Lv20 会给你不同专精选择，意味着成长路线不是纯数值叠加，而是会逐渐形成玩法偏向。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">角色信息页</p>
        <p class="text-[11px] text-muted leading-5">角色页负责集中展示人物状态、成长结果和长期养成概况，是判断“现在缺什么”的重要总览页。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">成长意义</p>
        <p class="text-[11px] text-muted leading-5">技能不是单独存在，它们会反向影响农场效率、钓鱼成功率、矿石产出、战斗生存和部分订单承接能力。</p>
      </section>
    </div>
  </section>

  <section id="collection-system" class="game-panel space-y-3">
    <Divider title label="19. 图鉴与游戏内百科" />
    <div class="grid gap-3 md:grid-cols-2">
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">图鉴</p>
        <p class="text-[11px] text-muted leading-5">图鉴负责“看收录、看缺口、看完成度”，也会展示一部分阶段里程碑和解锁进度。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">百科</p>
        <p class="text-[11px] text-muted leading-5">百科已经从收藏页中独立出来，负责按“怎么获得 / 有什么用 / 解锁条件 / 相关系统”回答具体问题。</p>
      </section>
    </div>
    <div class="game-panel-muted p-3 space-y-2 text-xs leading-6">
      <p>当前设计很强调这两者的分工：图鉴看“你已经有什么、还差什么”，百科看“这个东西到底怎么来、怎么用、和哪个系统有关”。</p>
      <p>很多中期卡点不是玩家不会玩，而是没有分清“现在应该看图鉴找缺口”还是“应该进百科查机制”。</p>
    </div>
  </section>

  <section id="quest-week" class="game-panel space-y-3">
    <Divider title label="20. 任务板 / 主题周 / 周结算" />
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">主线任务</p>
        <p class="text-[11px] text-muted leading-5">告诉你当前阶段要解锁什么、该碰哪些系统，是开荒期间最该优先看的入口。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">日常委托</p>
        <p class="text-[11px] text-muted leading-5">负责提供稳定的短期方向、钱、材料和关系推进，也是“今天先做什么”的默认答案之一。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">特殊订单</p>
        <p class="text-[11px] text-muted leading-5">当前会吃鱼塘、育种、关系和季节偏好，是把中后期系统卷入任务链的关键设计。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">活动编排</p>
        <p class="text-[11px] text-muted leading-5">限时任务窗口和活动来源会直接改变订单语义和奖励说明，所以任务页也负责承接运营活动。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">主题周</p>
        <p class="text-[11px] text-muted leading-5">主题周会反向影响任务风向、商圈推荐、馆务、公会、鱼塘、育种等多个系统的重点承接方向。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">周结算</p>
        <p class="text-[11px] text-muted leading-5">周目标、奖励池、连周进度、预算和周赛结算都是在这里形成闭环的，所以“周”已经是当前版本真正的经营节拍器。</p>
      </section>
    </div>
    <div class="border border-accent/15 rounded-xs bg-bg/10 px-3 py-3 text-xs leading-6 text-accent">
      不知道下一步做什么时，先看任务页；不知道这周押哪条线时，再看目标规划和主题周。
    </div>
  </section>

  <section id="fishpond" class="game-panel space-y-3">
    <Divider title label="21. 鱼塘" />
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">基础养殖</p>
        <p class="text-[11px] text-muted leading-5">鱼塘不是“把鱼丢进去等收成”的懒人箱子。真开了这条线，你每天都得管容量、水质、喂食和病鱼。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">周赛和报名</p>
        <p class="text-[11px] text-muted leading-5">鱼塘页会明确展示本周周赛规则、报名数量和上周结算结果，这代表鱼塘已经是正式的周循环内容。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">高阶养护</p>
        <p class="text-[11px] text-muted leading-5">高评分样鱼会引入额外承压，所以观赏饲料和高级净水剂不再只是加成品，而是维持高端样本稳定性的工具。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">展示池</p>
        <p class="text-[11px] text-muted leading-5">展示池更像是“把你最得意的鱼摆出来”。它不搬走原鱼，但会把它的价值继续放大到周赛和博物馆里。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">经营评级 / 资格快照</p>
        <p class="text-[11px] text-muted leading-5">系统会自动告诉你哪些鱼更适合观赏、食用或直接交付，这是中后期做鱼类经营判断的关键依据。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">繁殖逻辑</p>
        <p class="text-[11px] text-muted leading-5">通常要求同种、成熟、健康且有空位，所以“鱼很多”不等于“能繁殖”，状态管理比数量更重要。</p>
      </section>
    </div>
    <div class="game-panel-muted p-3 space-y-2 text-xs leading-6">
      <p>鱼塘现在已经很像一条单独的生活线了：前面靠钓鱼把样本带回来，后面再慢慢把它养成、展示、拿去比赛、拿去交付。</p>
      <p>如果你中期想玩的是那种“慢慢养、慢慢挑、慢慢把一条线做精”的感觉，鱼塘会比单纯钓鱼更有味道。</p>
    </div>
  </section>

  <section id="mining-guild" class="game-panel space-y-3">
    <Divider title label="22. 矿洞与公会" />
    <div class="grid gap-3 md:grid-cols-2">
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">矿洞基础结构</p>
        <p class="text-[11px] text-muted leading-5">矿洞玩法结合采矿、战斗、楼层推进、炸弹运用、掉落和宝箱，是很多高级资源与后续解锁的源头。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">矿洞的准备工作</p>
        <p class="text-[11px] text-muted leading-5">进入前应该确认体力、回复、背包空位、武器和逃生节奏，不然很容易把整天收益赔在矿里。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">公会赛季总览</p>
        <p class="text-[11px] text-muted leading-5">当前公会页会显示赛季、阶段、荣誉档位、活动和奖励池，说明这条线已经是正式赛季化内容，而不是附属成就页。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">讨伐 / 捐献 / 商店 / 图鉴</p>
        <p class="text-[11px] text-muted leading-5">公会内部标签分别对应战斗目标、资源投入、奖励兑换和长期收录，是战斗流的完整闭环。</p>
      </section>
    </div>
    <div class="border border-danger/20 rounded-xs bg-danger/5 px-3 py-3 text-xs leading-6">
      对很多中后期玩家来说，矿洞已经不是“有空再去挖一挖”，而是工具升级、公会成长、瀚海前置和资源体系的根节点。
    </div>
  </section>

  <section id="breeding" class="game-panel space-y-3">
    <Divider title label="23. 育种" />
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">育种台</p>
        <p class="text-[11px] text-muted leading-5">负责执行杂交、显示培育中与完成收取，是育种系统的操作中枢。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">种子箱</p>
        <p class="text-[11px] text-muted leading-5">等你种子多起来以后，种子箱就像你的育种柜。不是每颗都值得留，重点是慢慢挑出那几条真想养下去的线。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">研究等级</p>
        <p class="text-[11px] text-muted leading-5">影响识别范围、速育门槛、失败损耗和谱系深度，是长期投入而不是一次性解锁项。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">图鉴与谱系认证</p>
        <p class="text-[11px] text-muted leading-5">当前版本会追踪世代、分数和供货线，说明育种已经具备收藏、评价和经营承接三个层次。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">周赛 / 品鉴会</p>
        <p class="text-[11px] text-muted leading-5">育种现在有自己的周赛体系，说明这条线也被完整卷入“周循环运营”。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">失败回收与规划器</p>
        <p class="text-[11px] text-muted leading-5">失败也不至于全白忙一场，系统会给你回收物。规划器更像有人在旁边帮你算：这周该补图鉴、冲订单，还是继续养品系。</p>
      </section>
    </div>
    <div class="game-panel-muted p-3 space-y-2 text-xs leading-6">
      <p>育种这条线最迷人的地方，不在“一次出奇迹”，而在你能慢慢把一条品系养出来。你会记得它从哪一代开始变好，也会记得哪次失败把路带偏了。</p>
      <p>如果你喜欢的是那种越玩越深、越懂越上头的系统，育种大概会是桃源乡里最容易让人沉进去的一块。</p>
    </div>
  </section>

  <section id="museum" class="game-panel space-y-3">
    <Divider title label="24. 博物馆" />
    <div class="grid gap-3 md:grid-cols-2">
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">基础收藏</p>
        <p class="text-[11px] text-muted leading-5">古物、化石和特殊藏品会在这里长期沉淀，成为收录进度和里程碑来源。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">馆务运营</p>
        <p class="text-[11px] text-muted leading-5">展陈等级、展示评分、访客热度和祠堂主题，让博物馆具备了真正的运营维度。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">馆区推进</p>
        <p class="text-[11px] text-muted leading-5">不同馆区等级和槽位数量会决定你能把收藏线扩展到什么程度。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">学者委托</p>
        <p class="text-[11px] text-muted leading-5">博物馆不再只是被动收集，而是可以主动接任务、领奖励并继续推动馆务发展的体系。</p>
      </section>
    </div>
    <div class="game-panel-muted p-3 space-y-2 text-xs leading-6">
      <p>如果你喜欢收集和展示，博物馆现在已经足够支撑一条专门路线。它和鱼塘展示、村庄声望、主题周以及部分长期目标都有联动。</p>
    </div>
  </section>

  <section id="mail-system" class="game-panel space-y-3">
    <Divider title label="25. 邮箱" />
    <div class="grid gap-3 md:grid-cols-2">
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">邮件类型</p>
        <p class="text-[11px] text-muted leading-5">邮箱会接收活动信件、公告、奖励、补偿和系统结算，是在线独立版的重要收件入口。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">使用体验</p>
        <p class="text-[11px] text-muted leading-5">当前已经针对移动端做了主从结构优化，更适合在手机上连续查看多封信。</p>
      </section>
    </div>
    <div class="border border-accent/15 rounded-xs bg-bg/10 px-3 py-3 text-xs leading-6 text-accent">
      邮箱不是点缀，而是服务端运营、玩家奖励和活动信息的正式落点。
    </div>
  </section>

  <section id="hanhai" class="game-panel space-y-3">
    <Divider title label="26. 瀚海" />
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">解锁条件</p>
        <p class="text-[11px] text-muted leading-5">你得先把矿洞打到很深，还得掏得出修路费，所以瀚海天生就不是给刚起步的人准备的地方。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">驿站商店</p>
        <p class="text-[11px] text-muted leading-5">提供瀚海专属货架和特殊商品，和普通商圈形成差异化经营空间。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">遗迹勘探</p>
        <p class="text-[11px] text-muted leading-5">负责遗迹套组、勘探成果和轮换目标，是瀚海区域的重要资源玩法。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">瀚海赌坊</p>
        <p class="text-[11px] text-muted leading-5">这块会让瀚海不只是“远一点的商店”或“另一张地图”，而是真的有自己的异域味道和额外玩法。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">商路投资与合同</p>
        <p class="text-[11px] text-muted leading-5">瀚海不仅是区域地图，还会承接投资和合同，说明它已经具备独立经营面。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">主题周联动</p>
        <p class="text-[11px] text-muted leading-5">瀚海页会回看主题周和建设承接，所以它会反向作用于整个大经营结构。</p>
      </section>
    </div>
  </section>

  <section id="wallet-budget" class="game-panel space-y-3">
    <Divider title label="27. 钱袋、预算与高价投入" />
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">后期经济观测</p>
        <p class="text-[11px] text-muted leading-5">到了后期，钱袋页会开始像个账房先生，提醒你现在是该继续攒，还是该把钱往更大的盘子里投。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">豪华消费路线</p>
        <p class="text-[11px] text-muted leading-5">当前商圈推荐已经能结合钱包路线和目录偏好，说明消费本身也成了经营策略。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">周预算系统</p>
        <p class="text-[11px] text-muted leading-5">这块很像你每周自己给桃源乡排预算。钱先往哪边倾斜，后面那周的节奏就会跟着变。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">资源券 / 凭证</p>
        <p class="text-[11px] text-muted leading-5">这些内容让钱包页从“状态显示器”变成“长期货币和奖励管理器”。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">额度兑换</p>
        <p class="text-[11px] text-muted leading-5">这里会明确展示汇率和上下文条件，但能否兑换取决于你的登录、存档模式和目标存档状态。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">钱包流派</p>
        <p class="text-[11px] text-muted leading-5">你可以在旧钱包被动之外选择额外经营流派，从而影响目标偏好和消费推荐。</p>
      </section>
    </div>
    <div class="border border-accent/15 rounded-xs bg-bg/10 px-3 py-3 text-xs leading-6 text-accent">
      钱袋页现在已经不是让你看看余额那么简单了，它更像在问你：这些钱，接下来到底要把哪条日子养大。
    </div>
  </section>

  <section id="online" class="game-panel space-y-3">
    <Divider title label="28. 在线功能" />
    <div class="grid gap-3 md:grid-cols-2">
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">交流大厅</p>
        <p class="text-[11px] text-muted leading-5">这里更像村口公告栏加茶摊。你能看别人的经验，也能发帖问路、发求助，或者顺手看看最近大家都在聊什么。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">求助与最佳回复</p>
        <p class="text-[11px] text-muted leading-5">求助帖不是普通帖子换皮，它能和悬赏、最佳回复和问题解决后的奖励发放联动。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">AI 助手</p>
        <p class="text-[11px] text-muted leading-5">适合你卡住时来问一句“我接下来该干嘛”。它更像个带路的小帮手，不会告诉你那些不该公开的后台细节。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">后台治理</p>
        <p class="text-[11px] text-muted leading-5">主菜单和站外页已经连接桃源管理与用户管理，说明独立版不仅有游戏系统，也有运营后台和内容管理链路。</p>
      </section>
    </div>
    <div class="game-panel-muted p-3 space-y-2 text-xs leading-6">
      <p>在线功能最舒服的打开方式，不是刚进游戏就研究一遍，而是先把自己的日子过顺，再慢慢把这些功能接进来。</p>
    </div>
  </section>

  <section id="faq" class="game-panel space-y-3">
    <Divider title label="29. 常见问题 FAQ" />
    <div class="grid gap-3 md:grid-cols-2">
      <section class="game-panel-muted p-3 space-y-1">
        <p class="text-xs text-accent">Q1：第一次玩先看哪个页面最有效？</p>
        <p class="text-[11px] text-muted leading-5">先看新手教程，再进游戏看任务页 / 告示板。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-1">
        <p class="text-xs text-accent">Q2：第一周最重要的不是赚钱吗？</p>
        <p class="text-[11px] text-muted leading-5">赚钱重要，但当前版本更看重你有没有把主线、告示板和稳定收益线跑顺。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-1">
        <p class="text-xs text-accent">Q3：为什么现在总强调主题周？</p>
        <p class="text-[11px] text-muted leading-5">因为它已经会影响商圈推荐、目标规划、特殊订单和多个长线系统承接。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-1">
        <p class="text-xs text-accent">Q4：鱼塘和育种哪个更早开？</p>
        <p class="text-[11px] text-muted leading-5">通常鱼塘比育种更早，育种明显更偏中后期。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-1">
        <p class="text-xs text-accent">Q5：公会和博物馆只是兴趣内容吗？</p>
        <p class="text-[11px] text-muted leading-5">不是，它们都已经有各自的成长、奖励、结算和跨系统影响。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-1">
        <p class="text-xs text-accent">Q6：瀚海什么时候值得开？</p>
        <p class="text-[11px] text-muted leading-5">当你能稳定下矿、打过 120 层 BOSS、且经济不再吃紧时再开体验最好。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-1">
        <p class="text-xs text-accent">Q7：为什么额度兑换有时不能用？</p>
        <p class="text-[11px] text-muted leading-5">因为它要求你切到服务端持久化，并且已经载入目标服务端存档。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-1">
        <p class="text-xs text-accent">Q8：主菜单百科和游戏内百科有什么区别？</p>
        <p class="text-[11px] text-muted leading-5">主菜单百科看系统结构，游戏内百科查具体机制、来源、用途和送礼。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-1">
        <p class="text-xs text-accent">Q9：为什么我总觉得事情很多但不知道先做哪件？</p>
        <p class="text-[11px] text-muted leading-5">因为你已经进入多系统阶段了。默认顺序永远是：任务页 → 目标规划 → 当前承接系统。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-1">
        <p class="text-xs text-accent">Q10：这份百科最适合什么时候回来看？</p>
        <p class="text-[11px] text-muted leading-5">当你准备开新系统、切流派、卡在某个页面看不懂，或者想知道某条线值不值得长期投入的时候。</p>
      </section>
    </div>
  </section>

  <section id="feature-matrix" class="game-panel space-y-3">
    <Divider title label="30. 全入口速查矩阵" />
    <div class="overflow-x-auto">
      <table class="w-full min-w-[880px] text-left text-xs">
        <thead>
          <tr class="border-b border-accent/20 text-accent">
            <th class="px-2 py-2">入口</th>
            <th class="px-2 py-2">主要作用</th>
            <th class="px-2 py-2">什么时候最该看</th>
            <th class="px-2 py-2">会和谁联动</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b border-accent/10"><td class="px-2 py-2">主菜单</td><td class="px-2 py-2 text-muted">账号、存档、开局、入口分流</td><td class="px-2 py-2 text-muted">开档前、换存档前</td><td class="px-2 py-2 text-muted">登录、存档、教程、百科、大厅、后台</td></tr>
          <tr class="border-b border-accent/10"><td class="px-2 py-2">农场</td><td class="px-2 py-2 text-muted">种植、林木、温室、批量操作</td><td class="px-2 py-2 text-muted">每天都要看</td><td class="px-2 py-2 text-muted">商圈、工坊、育种、任务</td></tr>
          <tr class="border-b border-accent/10"><td class="px-2 py-2">牧场</td><td class="px-2 py-2 text-muted">宠物、动物、孵化、疾病</td><td class="px-2 py-2 text-muted">养殖起步后每天看</td><td class="px-2 py-2 text-muted">商圈、家庭、加工</td></tr>
          <tr class="border-b border-accent/10"><td class="px-2 py-2">设施</td><td class="px-2 py-2 text-muted">村庄建设、山洞、温室、仓库</td><td class="px-2 py-2 text-muted">想开新能力时</td><td class="px-2 py-2 text-muted">村庄建设、家庭、仓储、温室</td></tr>
          <tr class="border-b border-accent/10"><td class="px-2 py-2">桃源村</td><td class="px-2 py-2 text-muted">村民关系、知己、仙灵</td><td class="px-2 py-2 text-muted">推进关系或剧情时</td><td class="px-2 py-2 text-muted">任务、家庭、祝福、心愿</td></tr>
          <tr class="border-b border-accent/10"><td class="px-2 py-2">商圈</td><td class="px-2 py-2 text-muted">买卖、扩容、经济观测、主题周承接</td><td class="px-2 py-2 text-muted">缺资源、出货、做预算时</td><td class="px-2 py-2 text-muted">钱包、任务、市场、生产</td></tr>
          <tr class="border-b border-accent/10"><td class="px-2 py-2">竹林 / 清溪 / 矿洞</td><td class="px-2 py-2 text-muted">采集、钓鱼、战斗与基础资源</td><td class="px-2 py-2 text-muted">副现金流和材料缺口期</td><td class="px-2 py-2 text-muted">鱼塘、公会、工坊、博物馆</td></tr>
          <tr class="border-b border-accent/10"><td class="px-2 py-2">灶台 / 工坊 / 铁匠铺</td><td class="px-2 py-2 text-muted">加工、制造、工具升级</td><td class="px-2 py-2 text-muted">想提高效率时</td><td class="px-2 py-2 text-muted">农场、矿洞、背包、育种</td></tr>
          <tr class="border-b border-accent/10"><td class="px-2 py-2">背包 / 技能 / 角色</td><td class="px-2 py-2 text-muted">管理资源、能力和成长结果</td><td class="px-2 py-2 text-muted">经常性复盘时</td><td class="px-2 py-2 text-muted">所有系统</td></tr>
          <tr class="border-b border-accent/10"><td class="px-2 py-2">图鉴 / 百科 / 任务</td><td class="px-2 py-2 text-muted">看收录、查机制、拿方向</td><td class="px-2 py-2 text-muted">卡关时最优先</td><td class="px-2 py-2 text-muted">所有系统</td></tr>
          <tr class="border-b border-accent/10"><td class="px-2 py-2">育种 / 鱼塘 / 博物馆 / 公会</td><td class="px-2 py-2 text-muted">中后期长线经营核心</td><td class="px-2 py-2 text-muted">基础线稳定后</td><td class="px-2 py-2 text-muted">主题周、订单、展示、赛季</td></tr>
          <tr class="border-b border-accent/10"><td class="px-2 py-2">钱袋 / 邮箱 / 瀚海</td><td class="px-2 py-2 text-muted">后期调度、服务端奖励和扩展区域</td><td class="px-2 py-2 text-muted">中后期</td><td class="px-2 py-2 text-muted">市场、预算、兑换、活动</td></tr>
          <tr><td class="px-2 py-2">交流大厅 / 登录 / 后台</td><td class="px-2 py-2 text-muted">独立版站外能力</td><td class="px-2 py-2 text-muted">需要账号、交流、治理时</td><td class="px-2 py-2 text-muted">存档、邮箱、活动、AI</td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <section id="coverage-checklist" class="game-panel space-y-3">
    <Divider title label="31. 功能覆盖清单" />
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">开局准备</p>
        <p class="text-[11px] text-muted leading-5">已覆盖账号、登录注册、存档模式、新的旅程、继续旅程、导入导出、关于游戏与返回入口。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">基础经营</p>
        <p class="text-[11px] text-muted leading-5">已覆盖农场、林木、温室、牧场、宠物、鸡舍、牲口棚、马厩、山洞、仓库和村庄建设。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">资源与探索</p>
        <p class="text-[11px] text-muted leading-5">已覆盖竹林采集、清溪钓鱼、蟹笼、淘金、矿洞、怪物、公会与瀚海解锁前置。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">生产与成长</p>
        <p class="text-[11px] text-muted leading-5">已覆盖灶台、工坊、制造、工具升级、背包、装备、技能、角色信息和长期成长意义。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">资料与路线</p>
        <p class="text-[11px] text-muted leading-5">已覆盖图鉴、游戏内百科、任务板、特殊订单、主题周、周结算和目标承接逻辑。</p>
      </section>
      <section class="game-panel-muted p-3 space-y-2">
        <p class="text-xs text-accent">中后期系统</p>
        <p class="text-[11px] text-muted leading-5">已覆盖鱼塘、育种、博物馆、公会、钱包预算、邮箱、瀚海和在线功能。</p>
      </section>
    </div>
    <div class="border border-success/20 rounded-xs bg-success/5 px-3 py-3 text-xs leading-6">
      这页现在的目标已经不是“概览几个系统”，而是把主菜单外页和游戏内主要功能链全部用同一套口径重新讲清楚。
    </div>
  </section>
</template>

<script setup lang="ts">
  import Divider from '@/components/game/Divider.vue'
</script>
