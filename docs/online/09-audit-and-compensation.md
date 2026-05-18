# 0518 联机审计与补偿底座

## 1. 目标

所有跨玩家变更必须做到：

- 可追踪
- 可解释
- 可补发
- 可撤销
- 可审计

后续送礼、委托、房间结算、村社共建都统一接这套底座。

## 2. 审计入口

### 2.1 统一入口

所有跨玩家变更最终都要进入 `taoyuanAuditRuntime`。

允许直接写审计的对象仅限：

- 联机事件确认成功
- 结算凭证创建 / 落账
- 补偿凭证创建 / 执行
- 管理员手动干预

### 2.2 不允许绕过

- 不允许在业务 runtime 里只写业务数据、不写审计。
- 不允许客户端本地日志替代正式审计。
- 不允许“奖励已经到账，但后台查不到来源”。

## 3. 审计记录最小字段

每条审计记录至少包含：

- `auditId`
- `domain`
- `entityType`
- `entityId`
- `action`
- `operatorType`
- `operatorId`
- `targetPlayerId`
- `targetSlot`
- `relatedReceiptId`
- `relatedRoomId`
- `relatedEventId`
- `beforeSnapshotDigest`
- `afterSnapshotDigest`
- `status`
- `reason`
- `createdAt`

## 4. 奖励发放凭证结构

### 4.1 凭证对象

奖励发放统一使用 `SettlementReceipt`。

它是：

- 结算依据
- 审计索引
- 补偿入口
- 管理端查询对象

### 4.2 扩展字段建议

在 `07-state-and-settlement.md` 的最小字段基础上，再补：

- `deliveryDigest`
- `rewardDigest`
- `persistAttemptCount`
- `lastPersistError`
- `claimChannel`
- `reversalReason`
- `compensationReceiptIds`

### 4.3 结构要求

- 一张凭证只对应一个目标玩家 + 一个目标槽位。
- 一次多人结算必须拆成多张逐成员凭证。
- 一次补偿不能覆盖原凭证，只能新增补偿凭证并建立关联。

## 5. 异常补偿记录

### 5.1 补偿对象

异常补偿统一使用 `CompensationRecord`。

### 5.2 最小字段

- `compensationId`
- `sourceReceiptId`
- `sourceAuditId`
- `targetPlayerId`
- `targetSlot`
- `reasonCode`
- `reasonDetail`
- `compensationType`
- `compensationPayload`
- `status`
- `operatorId`
- `createdAt`
- `resolvedAt`

### 5.3 补偿类型

- `regrant`
- `delta_adjust`
- `manual_mail`
- `reverse_then_regrant`
- `no_action_explained`

## 6. 管理端可读流水

管理端至少需要四种视图：

- `按玩家看`
- `按活动 / 房间看`
- `按凭证看`
- `按补偿看`

## 7. 管理端查询字段

### 7.1 玩家视图

- 玩家 ID
- 目标槽位
- 最近联机事件
- 最近结算凭证
- 最近补偿记录
- 当前异常标记

### 7.2 房间 / 活动视图

- 房间 ID / 活动 ID
- 成员列表
- 生命周期摘要
- 成员凭证状态
- 未完成结算成员
- 是否触发补偿

### 7.3 凭证视图

- 凭证 ID
- 来源域
- 目标玩家
- 奖励内容摘要
- 幂等 key
- 落账状态
- 领取状态
- 关联补偿

### 7.4 补偿视图

- 补偿 ID
- 原凭证 ID
- 补偿原因
- 执行人
- 执行结果
- 是否已通知玩家

## 8. 标准审计链路

### 8.1 委托交付

1. 记录交付事件
2. 生成交付审计记录
3. 生成结算凭证
4. 写凭证审计记录
5. 回写目标存档
6. 成功或失败都记录最终状态

### 8.2 房间结算

1. 固化房间快照
2. 按成员逐张生成凭证
3. 每张凭证独立落账
4. 每次落账写审计
5. 若部分失败，转补偿链

### 8.3 礼物 / 包裹

1. 记录寄送事件
2. 记录领取事件
3. 领取成功后生成审计记录
4. 如附件发放失败，生成补偿记录

## 9. 失败与补偿规则

### 9.1 可自动重试

- 落账超时
- 临时网络异常
- 房间关闭前的短时写入失败

### 9.2 必须进补偿队列

- 幂等冲突后状态不一致
- 凭证存在但目标存档未稳定落账
- 部分成员成功、部分成员失败
- 管理员回滚或强制中止后的差额修复

### 9.3 必须人工可见

- 同一凭证多次失败
- 同一玩家短时间内连续异常
- 奖励已领取但后续发现配置错误

## 10. 与后续阶段的绑定

- `L30-L34`：委托交付必须出审计和凭证。
- `L40-L45`：礼物和书信至少要有寄送 / 领取 / 补偿审计。
- `L60-L65`：房间结算必须按成员生成可查询流水。
- `L110-L114`：反作弊、客服与后台工具直接建立在本底座之上。
