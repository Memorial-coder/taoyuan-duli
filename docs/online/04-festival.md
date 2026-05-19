# 节会线

- 主目标：在不破坏日常经营主循环的前提下，把同场联机收进节庆与短时活动房间。
- 首批范围：统一房间状态机、Ready、倒计时、断线重连、结算凭证。
- 首批目标文件：`server/src/taoyuanActivityRoomRuntime.js`、`taoyuan-main/src/views/game/FestivalView.vue`、`taoyuan-main/src/stores/useFestivalRoomStore.ts`、`taoyuan-main/src/utils/festivalRoomApi.ts`。
- 边界：房间负责互动过程，奖励通过结算凭证安全回写个人存档。

## 当前进度

- `L60` 第一轮已完成：节会房间现在已经支持创建、邀请、加入、准备确认、倒计时、开场演出、断线重连、结算凭证与关闭流程。
- `L61` 第一轮已完成：元日守岁、上元灯会、端午赛舟、七夕同游、中秋赏月、腊八共煮六个节会房型已经接入同一套房间模板。
- 下一步进入 `L62`：在现有房间底座上继续补“公共进度 / 小队协作 / 抢答 / 拼装 / 采集 / 表演 / 合照”这些玩法模板，而不是重做房间生命周期。
