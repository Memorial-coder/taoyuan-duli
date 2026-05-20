# 首屏加载优化 TODO（交接下一个 AI）

> 目标：解决网站长时间停留在“桃源乡加载中...”的问题，优先改善首屏体感，不改玩法逻辑，不牺牲全局 `zpix` 字体风格，不移除旧浏览器兼容。

---

## 0. 硬约束

- [ ] 不能把全局字体退回系统字体，`zpix` 必须继续作为全站默认字体使用。
- [ ] 不能移除 `@vitejs/plugin-legacy`，旧浏览器兼容本次保留。
- [ ] 不能改动核心业务行为，只做首屏加载与静态资源交付优化。
- [ ] 优先做“体感立刻改善”的改动：先让页面尽快挂载，再优化包体和缓存。
- [ ] 不手改 `taoyuan-main/docs/assets/*` 产物文件，所有产物都必须通过构建重新生成。

---

## 1. 当前已知事实（已确认）

### 1.1 用户看到的“桃源乡加载中...”

- [ ] `taoyuan-main/public/taoyuan-entry.css`
  - `#app:empty::after` 会显示“桃源乡加载中...”
  - 说明只要 `app.mount('#app')` 没执行完成，页面就会一直卡在这个占位态

### 1.2 启动链路被阻塞

- [ ] `taoyuan-main/src/main.ts`
  - 当前 `bootstrap()` 里先执行：
    - `installApiFetchBridge()`
    - `await Promise.all([initCurrentAccount(), loadProjectCreditMessage()])`
  - 然后才：
    - `createApp(App)`
    - `app.mount('#app')`
- [ ] 这意味着 `/api/me` 和 `/api/taoyuan/ai/config` 任何一个慢，都会直接拖住首屏挂载

### 1.3 首屏资源偏大

- [ ] 当前构建产物中观察到：
  - `taoyuan-main/docs/assets/index-CDBwnV7N.js` 约 `2.44 MB`
  - `taoyuan-main/docs/assets/index-legacy-DxNaUNjB.js` 约 `2.63 MB`
  - `taoyuan-main/src/assets/fonts/zpix.woff2` 约 `875 KB`
- [ ] 这说明问题不只是接口慢，首屏 JS 和字体本身也偏重

### 1.4 静态资源缓存策略不合理

- [ ] `server/src/index.js`
  - `/assets` 当前被设置成：
    - `Cache-Control: no-store, no-cache, must-revalidate`
    - `etag: false`
    - `lastModified: false`
- [ ] 这会导致哈希资源每次刷新都重新下载，严重拖慢二次打开和调试体验

### 1.5 目前未见压缩中间件

- [ ] `server/src/index.js` 当前未接入 `compression`
- [ ] 需要确认当前线上是否有反向代理压缩；如果没有，就必须在 Node 层补 gzip
- [ ] 本地独立部署场景默认按“没有上层压缩”处理

### 1.6 首屏关键路径里有全局 AI 助手

- [ ] `taoyuan-main/src/App.vue` 直接引入 `AiAssistantWidget`
- [ ] `AiAssistantWidget` 里又依赖多个 store 和工具模块，不适合继续放在首屏关键包里

---

## 2. 当前工作区注意事项

### 2.1 现有未提交改动（非本任务）

- [ ] 当前 `git status` 里已有以下改动，不要误回滚：
  - `server/scripts/qa-online-smoke.mjs`
  - `server/src/routes/api.js`
  - `server/src/taoyuanSocietyRuntime.js`
  - `taoyuan-main/src/stores/useSocietyStore.ts`
  - `taoyuan-main/src/utils/societyApi.ts`
  - `taoyuan-main/src/views/game/SocietyView.vue`
  - `server/.tmp-l64-debug/`

### 2.2 本任务优先只改这些文件

- [ ] `taoyuan-main/src/main.ts`
- [ ] `taoyuan-main/src/App.vue`
- [ ] `taoyuan-main/src/app.css`
- [ ] `taoyuan-main/public/taoyuan-entry.css`
- [ ] `taoyuan-main/index.html`
- [ ] `taoyuan-main/vite.config.ts`
- [ ] `server/src/index.js`
- [ ] `server/package.json`
- [ ] 如需字体分包，再新增 `taoyuan-main/src/assets/fonts/*`

---

## 3. 执行原则

- [ ] 先做不改视觉、不改交互的低风险收益项
- [ ] 每完成一个阶段都要重新构建并记录产物变化
- [ ] 每次改动后都要验证“首屏更快”而不是只看代码更优雅
- [ ] 保证最终方案在“全局 zpix + legacy 兼容”这两个前提下成立

---

## 4. TODO 分阶段执行

## Phase A：先建立基线与验证口径

- [ ] 运行一次前端构建，记录当前基线
  - 命令：`npm --prefix taoyuan-main run build`
  - 记录现代入口、legacy 入口、CSS、字体文件体积
- [ ] 用浏览器网络面板记录一次冷启动
  - 重点记录：
    - `index.html`
    - 现代入口 JS
    - 字体文件
    - `/api/me`
    - `/api/taoyuan/ai/config`
- [ ] 在 `main.ts` 临时加性能打点，至少标记：
  - `bootstrap-start`
  - `before-app-mount`
  - `after-app-mount`
  - `account-context-ready`
  - `credit-config-ready`
- [ ] 验证结论是否一致：
  - loading 卡住主要是挂载前等待 + 主包过大 + 缓存缺失

完成标准：

- [ ] 有一份本地基线数据，后续每轮优化都能对比前后差异

---

## Phase B：先解除挂载前阻塞（最高优先级）

- [ ] 修改 `taoyuan-main/src/main.ts`
  - 保留 `installApiFetchBridge()` 在挂载前执行
  - 去掉 `await Promise.all([initCurrentAccount(), loadProjectCreditMessage()])`
  - 改成：
    - 先创建 app / pinia / router
    - 立即 `app.mount('#app')`
    - 再后台异步执行：
      - `initCurrentAccount()`
      - `loadProjectCreditMessage()`
- [ ] 保证挂载前默认状态安全：
  - 账号默认按 guest / 未登录处理
  - console credit 未加载前继续使用默认文案
- [ ] 检查所有依赖账号上下文的入口是否仍安全
  - 尤其关注：
    - `ensureCurrentAccount`
    - `ensureCurrentCsrfToken`
    - 首页登录态展示
    - 首次点击需要登录/签名的按钮时是否会异常

完成标准：

- [ ] 即使 `/api/me` 很慢，页面也能先挂载出主菜单
- [ ] “桃源乡加载中...”不再等两个接口一起返回才消失

---

## Phase C：静态资源缓存与压缩

- [ ] `server/package.json`
  - 新增依赖：`compression`
- [ ] `server/src/index.js`
  - 在静态资源和 API 中间件前接入 `compression()`
  - 默认启用 gzip 压缩
- [ ] 调整 `/assets` 静态资源策略
  - 哈希文件使用：
    - `Cache-Control: public, max-age=31536000, immutable`
  - 不再对哈希资源设置 `no-store`
  - 允许 `etag` / `lastModified`
- [ ] `index.html` 保持短缓存
  - 使用 `no-cache` 或 `must-revalidate`
  - 目的是版本更新时仍能及时拿到新入口
- [ ] `taoyuan-entry.css` 不走 immutable 长缓存
  - 保持短缓存或跟随 `index.html`

完成标准：

- [ ] 二次刷新时哈希资源出现缓存命中
- [ ] 网络面板里 JS / CSS 响应头包含合理缓存策略
- [ ] 传输体积明显下降

---

## Phase D：首屏入口包拆分

### D1. 把 AI 助手移出首屏关键包

- [ ] 修改 `taoyuan-main/src/App.vue`
  - 不再同步静态引入 `AiAssistantWidget`
  - 改为异步组件
  - 在首屏挂载后再延迟加载
- [ ] 默认方案：
  - 首选 `requestIdleCallback`
  - 若浏览器不支持则退化到 `setTimeout`
- [ ] 要求：
  - 首页可先渲染
  - AI 助手稍后出现
  - 功能行为不变

### D2. 配置 Vite 手动拆包

- [ ] 修改 `taoyuan-main/vite.config.ts`
  - 在 `build.rollupOptions.output.manualChunks` 中显式拆包
- [ ] 本次建议固定拆分：
  - `vendor-core`
    - `vue`
    - `vue-router`
    - `pinia`
  - `vendor-capacitor`
    - `@capacitor/*`
  - `feature-ai`
    - AI 助手相关
  - `feature-admin`
    - 管理端页面与管理工具
- [ ] 本次不移除 legacy，只优化现代入口 chunk

### D3. 复查根级同步引入

- [ ] 检查首屏页面和根组件是否还有大型同步依赖
  - `MainMenu.vue`
  - 根级通用工具
  - 不必要的 store 初始化
- [ ] 不要做大范围重构，只处理明确进入首屏关键链的模块

完成标准：

- [ ] 现代入口 JS 比当前 `2.44 MB` 显著缩小
- [ ] AI 助手相关代码不再出现在首屏关键请求链

---

## Phase E：在不放弃全局 zpix 的前提下优化字体交付

### E1. 先做保守优化

- [ ] 保留 `body` 全局 `font-family: var(--font-game)`
- [ ] 保留 `zpix` 作为默认字体，不允许切换到系统字体
- [ ] 在 `taoyuan-main/index.html` 中为首屏字体增加 `preload`
  - 优先尝试现有 `zpix.woff2`
- [ ] 确认 `font-display: swap` 继续保留

### E2. 如果体感仍差，再做同字体分层

- [ ] 第二步不是换字体，而是拆同一字体的交付方式
- [ ] 目标方案：
  - 做一个 `zpix-entry.woff2`，仅覆盖首页/加载页/主菜单首屏会出现的常用字符
  - 保留完整 `zpix.woff2` 作为后续完整字体
- [ ] 要求：
  - 首屏仍然看起来是 zpix
  - 不是系统字体回退
  - 常见中文按钮、标题、说明文本不能缺字
- [ ] 若本地没有可靠子集化工具，不要卡死整个优化链路
  - 可以先完成 Phase B/C/D
  - 字体分层作为第二轮继续

完成标准：

- [ ] 保持全局 zpix 前提下，字体不再成为首屏最重阻塞项
- [ ] 首屏无明显字体闪烁、缺字、风格退化

---

## Phase F：最终验证与交付

### F1. 必做验证

- [ ] `npm --prefix taoyuan-main run build`
- [ ] `node --check server/src/index.js`
- [ ] 冷启动验证
- [ ] 二次刷新验证
- [ ] 慢网速节流验证
- [ ] 已登录 / 未登录两种场景验证
- [ ] legacy 浏览器路径至少做一次基本确认

### F2. 需要记录的数据

- [ ] 优化前后现代入口 JS 体积
- [ ] 优化前后字体请求体积与时序
- [ ] 优化前后 loading 停留时长
- [ ] 优化前后二次刷新是否命中缓存

### F3. 输出给用户的结论

- [ ] 哪几项是本次真正落地的
- [ ] 哪几项只是记录为后续可继续做
- [ ] 若字体分层未做，明确说明原因和下一步入口

---

## 5. 验收标准

- [ ] 首屏页面应在 `app.mount()` 后立即出现，不再因为 `/api/me` 和 AI 配置阻塞
- [ ] “桃源乡加载中...”的停留时间明显缩短
- [ ] 二次刷新不能再整包重下哈希资源
- [ ] 全局 `zpix` 视觉保持不变
- [ ] AI 助手仍可正常使用，只是延后加载
- [ ] legacy 兼容不被破坏

---

## 6. 推荐执行顺序（不要乱）

- [ ] 先做 Phase A：打基线
- [ ] 再做 Phase B：解除挂载前阻塞
- [ ] 再做 Phase C：缓存 + 压缩
- [ ] 再做 Phase D：AI 助手和入口拆包
- [ ] 最后做 Phase E：字体交付优化
- [ ] 每做完一个阶段都构建并复测，不要一口气改完再查问题

---

## 7. 给下一个 AI 的一句话总结

- [ ] 这次优化的主线不是“删功能”，也不是“换系统字体”，而是：
  - 先挂载
  - 再请求
  - 资源可缓存
  - 首屏包变小
  - 全局 zpix 保留

