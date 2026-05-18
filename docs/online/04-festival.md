# 节会线

- 主目标：在不破坏日常经营主循环的前提下，把同场联机收进节庆与短时活动房间。
- 首批范围：统一房间状态机、Ready、倒计时、断线重连、结算凭证。
- 首批目标文件：`server/src/taoyuanActivityRoomRuntime.js`、`taoyuan-main/src/views/game/FestivalView.vue`、`taoyuan-main/src/stores/useFestivalStore.ts`。
- 边界：房间负责互动过程，奖励通过结算凭证安全回写个人存档。
