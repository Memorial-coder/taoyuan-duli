# 0518 联机命名与模块切分

## 1. 总体命名原则

- 在线层统一用 `online` 或具体领域名，不用含糊的 `multiplayer`。
- 服务端权威模块统一用 `taoyuanXxxRuntime`。
- 前端远端态统一用 `useXxxStore`，但不接管单人玩法的即时权威。
- 事件统一用 `领域.对象.动作` 三段式，避免后面房间、委托、村社各写一套风格。

## 2. 服务端 runtime 命名

### 2.1 统一规则

- 文件名：`server/src/taoyuanXxxRuntime.js`
- 导出对象：与文件同名，例如 `taoyuanSocialRuntime`
- 责任：只处理联机权威状态、审计、结算、补偿、权限边界

### 2.2 首批保留名

- `taoyuanIdentityRuntime`
- `taoyuanSocialRuntime`
- `taoyuanManorRuntime`
- `taoyuanVisitRuntime`
- `taoyuanCoopOrderRuntime`
- `taoyuanGiftRuntime`
- `taoyuanNeighborRuntime`
- `taoyuanSocietyRuntime`
- `taoyuanFestivalRuntime`
- `taoyuanRankingRuntime`
- `taoyuanMarketRuntime`
- `taoyuanActivityRoomRuntime`
- `taoyuanWorldEventRuntime`
- `taoyuanAuditRuntime`

### 2.3 切分规则

- `Identity`：账号、公开资料、公开状态。
- `Social`：好友、关注、黑名单、关系图。
- `Manor + Visit`：庄园快照、来访、留言、收藏。
- `CoopOrder + Gift + Market`：求助、书信、礼物、慢交易、结算凭证。
- `Festival + ActivityRoom`：日历活动、房间、实时动作、断线恢复。
- `Society + WorldEvent + Ranking`：村社、投票、公共建设、榜单、公共目标。
- `Audit`：跨玩家变更流水、补偿记录、管理查询。

## 3. 前端 store 命名

### 3.1 统一规则

- 文件名：`taoyuan-main/src/stores/useXxxStore.ts`
- 单人玩法 store 继续保留原名，例如 `useGameStore`、`useSaveStore`
- 新联机 store 只保存远端投影、筛选条件、分页、加载态和本地草稿
- 不允许把跨玩家权威逻辑塞回 `useGameStore` 或别的单人运行时 store

### 3.2 首批保留名

- `useSocialStore`
- `useManorStore`
- `useVisitStore`
- `useNeighborStore`
- `useCoopOrderStore`
- `useGiftStore`
- `useFestivalStore`
- `useActivityRoomStore`
- `useSocietyStore`
- `useWorldEventStore`
- `useRankingStore`

### 3.3 前端边界

- 单人状态：时间、天气、背包、农场、剧情推进，继续留在现有单人 store。
- 联机状态：公开档案、列表、关系、委托、房间、榜单，进入联机 store。
- 跨玩家奖励结果：前端只展示凭证与领取状态，不自己认定发奖成功。

## 4. 路由命名

- 公共只读接口：`/api/taoyuan/online/public/<domain>/...`
- 登录后接口：`/api/taoyuan/online/<domain>/...`
- 管理接口：`/api/admin/taoyuan/online/<domain>/...`

当前已有的 `/api/taoyuan/save`、`/api/taoyuan/mail`、`/api/taoyuan/hall` 先继续保留，后续通过适配层并入上述命名体系，不做一次性硬切。

## 5. 事件命名

### 5.1 统一格式

`<domain>.<entity>.<action>`

例如：

- `social.friend.requested`
- `social.friend.accepted`
- `manor.snapshot.published`
- `visit.guestbook.created`
- `coop_order.delivery.submitted`
- `gift.parcel.claimed`
- `festival.room.created`
- `room.member.ready`
- `room.settlement.persisted`
- `society.proposal.created`
- `world_event.progress.updated`
- `audit.receipt.recorded`

### 5.2 动作词表

- `created`
- `updated`
- `deleted`
- `requested`
- `accepted`
- `rejected`
- `submitted`
- `confirmed`
- `claimed`
- `settled`
- `persisted`
- `compensated`
- `reconnected`

## 6. 禁止项

- 不新建 `useMultiplayerStore` 这类大桶 store。
- 不新建 `taoyuanMultiplayerRuntime` 这类混装 runtime。
- 不用 `event1`、`roomAction2` 这类无语义事件名。
- 不把“联机 UI 状态”和“跨玩家权威结算”混在同一个 store 或 runtime。
