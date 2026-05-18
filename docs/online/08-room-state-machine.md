# 0518 统一房间状态机

## 1. 适用范围

这套状态机统一服务于所有实时联机房间，包括但不限于：

- 节会房间
- 协作探索房间
- 竞速或协作小游戏房间
- 临时活动房间

后续不再为每个玩法重做一套房间生命周期。

## 2. 房间主状态

统一主状态如下：

- `created`
- `inviting`
- `ready_check`
- `countdown`
- `running`
- `paused`
- `settling`
- `closed`
- `aborted`

## 3. 各状态含义

### 3.1 `created`

- 房间已创建但还未正式进入邀请或匹配阶段。
- 可写入房间配置、玩法模板、人数上限、房主信息。

### 3.2 `inviting`

- 正在邀请、匹配或等待成员加入。
- 允许成员进入、退出、替换。
- 不允许发放正式奖励。

### 3.3 `ready_check`

- 成员已基本到齐，进入准备确认。
- 允许 `ready / unready`。
- 若准备超时，可回退到 `inviting` 或直接 `aborted`。

### 3.4 `countdown`

- 所有开场前条件满足，进入短倒计时。
- 只允许取消、掉线保护和最终锁定成员名单。
- 倒计时开始后原则上不再允许新成员加入。

### 3.5 `running`

- 实时玩法正在进行。
- 允许实时动作、快照同步、断线重连、轻量暂停。

### 3.6 `paused`

- 房间被系统或房主临时暂停。
- 原因可能包括关键成员断线、服务端保护暂停、管理员介入。
- 暂停只能恢复到 `running`，或推进到 `aborted / settling`。

### 3.7 `settling`

- 玩法过程已经结束，房间开始服务端结算。
- 此阶段只允许读结果、重试结算、生成结算凭证。
- 不再接收新的玩法动作。

### 3.8 `closed`

- 结算完成，房间正式关闭。
- 只保留最小结果快照、结算摘要和审计引用。

### 3.9 `aborted`

- 房间在未完成正常结算前被中止。
- 必须记录中止原因，并明确是否进入部分补偿。

## 4. 生命周期转换

### 4.1 标准成功链路

`created -> inviting -> ready_check -> countdown -> running -> settling -> closed`

### 4.2 失败 / 回退链路

- `inviting -> aborted`
- `ready_check -> inviting`
- `ready_check -> aborted`
- `countdown -> ready_check`
- `countdown -> aborted`
- `running -> paused -> running`
- `running -> paused -> aborted`
- `running -> settling`
- `settling -> closed`

### 4.3 禁止转换

- `closed` 不能回到任何活动状态。
- `aborted` 不能重新回到 `running`。
- `running` 不能直接回到 `inviting`。
- `settling` 不能重新接收实时动作。

## 5. 统一生命周期事件

### 5.1 房间级事件

- `room.create`
- `room.invite`
- `room.join`
- `room.leave`
- `room.kick`
- `room.ready`
- `room.unready`
- `room.start`
- `room.countdown.cancel`
- `room.pause`
- `room.resume`
- `room.abort`
- `room.settle`
- `room.close`
- `room.reconnect`
- `room.snapshot`

### 5.2 玩法动作事件

- `room.action`
- `room.progress`
- `room.score.update`
- `room.objective.complete`

玩法特有细节可以继续放进 `payload`，但事件主名保持统一。

## 6. 成员状态

房间成员统一使用以下状态：

- `invited`
- `joined`
- `ready`
- `countdown_locked`
- `active`
- `disconnected`
- `reconnecting`
- `finished`
- `settled`
- `left`
- `kicked`

## 7. 成员状态规则

- `invited`：已被邀请但尚未进入房间。
- `joined`：已进房但未准备。
- `ready`：准备确认完成。
- `countdown_locked`：倒计时中，成员名单已锁。
- `active`：正在运行中。
- `disconnected`：运行中掉线。
- `reconnecting`：掉线后恢复中。
- `finished`：玩法过程对该成员已结束。
- `settled`：该成员结算凭证已生成。
- `left`：主动离开。
- `kicked`：被移出房间。

## 8. 结算流程

统一结算流程如下：

1. 房间进入 `settling`。
2. 固化房间最终快照。
3. 计算每位成员的结果摘要。
4. 为每位成员分别生成 `SettlementReceipt`。
5. 逐张凭证写入服务端结算层。
6. 写入审计记录。
7. 全部成功后房间进入 `closed`。

## 9. 关闭流程

### 9.1 正常关闭

- 所有成员凭证状态已达到 `persisted` 或明确 `compensated`。
- 房间快照已固化。
- 审计记录已落库。
- 然后进入 `closed`。

### 9.2 异常关闭

若出现结算中断：

- 房间保持在 `settling` 或转 `aborted`。
- 不允许直接标记 `closed`。
- 必须记录未完成成员、失败原因、可重试次数和补偿策略。

## 10. 断线恢复策略

- `inviting/ready_check` 掉线：允许重新加入并恢复成员席位。
- `countdown` 掉线：优先短时等待，超时则回退或中止。
- `running` 掉线：成员先标记为 `disconnected`，保留重连窗口。
- `settling` 掉线：客户端只需回读结果，不能重放动作。

## 11. 与结算凭证的关系

- 房间状态只负责过程控制。
- 最终发奖必须逐成员生成结算凭证。
- 房间关闭不等于玩家已领奖，只等于凭证已稳定生成并可被后续领取/回看。

## 12. 对后续阶段的约束

- `L60-L65` 节会房间必须完全复用本状态机。
- `L80-L85` 远征房间必须复用本状态机，只允许在动作 payload 上做玩法扩展。
- 后续若有双人矿洞、赛舟、灯会、夜钓等玩法，不允许另起一套新状态名。
