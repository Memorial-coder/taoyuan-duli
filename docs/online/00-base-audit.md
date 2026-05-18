# 0518 联机底座盘点

## 1. 当前已经存在的在线底座

### 1.1 账号、登录、会话、CSRF

- `server/src/index.js` 已挂好 `express-session`、`cors`、`helmet` 和 `/api` 路由入口。
- `server/src/routes/api.js` 已提供：
  - `POST /register`
  - `POST /login`
  - `POST /logout`
  - 会话里的 `csrf_token`
- `loginRequired` 与 `signRequired` 已经是现成的权限与 CSRF 守门。

结论：

- 这部分可以直接复用为联机身份底座。
- 后续联机接口无需重新发明登录态和签名校验。

### 1.2 服务端存档

- `server/src/routes/api.js` 已提供：
  - `GET /taoyuan/save/slots`
  - `GET /taoyuan/save/:slot`
  - `POST /taoyuan/save/:slot`
  - `POST /taoyuan/save/active-slot`
- `server/src/taoyuanSaveRuntime.js` 已具备：
  - 原子写 `writeJsonFileAtomic`
  - 槽位版本号 `nextSlotRevision`
  - 活跃槽位解析 `getActiveSaveContext`
  - 存档回写 `persistGameplayData`
- `taoyuan-main/src/utils/serverSaveApi.ts` 与 `taoyuan-main/src/stores/useSaveStore.ts` 已接好前端调用、待同步副本、补传与服务端活动槽位。

结论：

- 服务端存档链路可以直接复用为“个人世界”的权威落点。
- 现阶段不适合让多人直接共同编辑完整存档，只适合通过联机结算回写个人存档。

### 1.3 邮箱

- `server/src/routes/api.js` 已提供邮箱列表、详情、已读、单封领取、一键领取、系统邮件创建与后台邮件活动入口。
- 这条链路已经具备“服务端生成内容 -> 玩家领取 -> 写回个人存档”的闭环。

结论：

- 邮箱可以直接扩成玩家书信、礼物包裹、结算凭证和补偿通知的统一投递层。
- 需要扩展的是玩家对玩家的收件人、附件校验、限额与审计，而不是另起一套投递系统。

### 1.4 交流大厅

- `server/src/routes/api.js` 已提供大厅帖子列表、详情、发帖、回帖、举报、删除、最佳回复、置顶、加精。
- `server/src/taoyuanHall.js` 已具备：
  - 原子写大厅数据
  - 顺序锁 `withHallLock`
  - 悬赏扣钱与发钱 `updateActiveSaveMoney`
  - 悬赏最佳回复结算 `selectBestReply`
- 大厅悬赏已经会通过 `getActiveSaveContext` + `persistGameplayData` 修改当前服务端存档的钱。

结论：

- 交流大厅是现成的“弱实时社会层”底座，可复用到公开求助、活动帖、互助广场和留言类互动。
- 但它现在仍是帖子模型，不是联机关系图，也不是通用委托状态机。

## 2. 哪些可以直接复用

- 账号、会话、CSRF、登录守卫。
- 服务端存档读写、槽位版本号、活跃槽位绑定。
- 邮箱投递与领取闭环。
- 大厅的数据原子写、顺序锁和悬赏型结算。

## 3. 哪些需要扩展

- 账号层缺少联机公开档案、关系链、黑名单和关注模型。
- 服务端存档层缺少“联机结算凭证”“补偿记录”“审计流水”。
- 邮箱层缺少玩家对玩家书信、礼物附件、频控和风控。
- 大厅层缺少结构化委托状态、多阶段交付、多人接力和权限边界。

## 4. 当前仍然完全本地的核心状态

- `taoyuan-main/src/stores/useGameStore.ts` 的日期、天气、旅行、地点与日常运行时。
- `taoyuan-main/src/stores/useSaveStore.ts` 聚合的绝大多数单人玩法 store 序列化状态。
- 农场、背包、NPC 关系、节气推进、探索与战斗的大部分即时运行态。

结论：

- 这些内容继续留在个人世界。
- 联机层只读取必要快照，不直接共享整个实时状态。

## 5. 联机优先接管的状态边界

- `身份边界`：账号、公开名片、关系链、公开展示配置。
- `展示边界`：庄园快照、访客痕迹、留言、收藏、热度。
- `交换边界`：书信、礼物、求助单、慢交易、结算凭证。
- `活动边界`：节会房间、Ready、房间动作、房间结算。
- `治理边界`：村社成员、提案、投票、公共建设与贡献记录。

## 6. 当前建议

- 后续先接 `庄园 / 邻里 / 委托`，因为这些都能复用现有“账号 + 邮箱 + 大厅 + 服务端存档”底座。
- `节会` 和 `村社` 继续排在后面，等统一房间状态机与审计底座完成后再推进。
