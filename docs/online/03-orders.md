# 委托线

- 主目标：把互助、送礼、书信和慢交易统一收进可审计的跨玩家结算层。
- 首批范围：求助单、接单、交付、结算凭证、玩家书信、礼物包裹。
- 首批目标文件：`taoyuan-main/src/views/game/QuestView.vue`、`taoyuan-main/src/views/game/MailView.vue`、`server/src/taoyuanMailbox.js`、`server/src/taoyuanCoopOrderRuntime.js`。
- 边界：任何跨玩家奖励都必须走幂等 key、审计记录和补偿入口。
