# 桃源潜能系统轻量规格（2026-06-14）

## 目标

做一个长期、低风险、跨玩法的横向成长系统，让玩家在矿洞、行旅、订单、主题周、博物馆、节庆和仙灵事件中沉淀专用材料，再投入到“桃源潜能”节点中。它要带来体质、手艺、山行、人和四类小幅成长，而不是重做现有技能树。

## 系统边界

- 天赋精研：沿用现有 `SkillStore` 和 20 级后的技能精研节点，负责单个技能内部的玩法分支。
- 桃源潜能：新增独立系统，负责跨技能的长期修行，首版只接小幅生命、体力、容错、效率和信息提示。
- 首版不做：PvP、战力评分、大额攻击倍率、暴击倍率、全局售价倍率、付费抽取、外部游戏术语/图标/文案复制。
- 首版材料只走玩法结算和统一 helper，不开放纯铜钱购买。

## 数据与存档

- 类型定义：`taoyuan-main/src/types/potential.ts`
- 数据表：`taoyuan-main/src/data/potential.ts`
- 状态与发放：`taoyuan-main/src/stores/usePotentialStore.ts`
- 存档接入：`taoyuan-main/src/stores/useSaveStore.ts`
- 服务端基础字段守卫：`server/src/taoyuanSaveRuntime.js`
- 样本档：`taoyuan-main/src/data/sampleSaves.ts`

## 分线与节点

| 分线 | 定位 | 节点 | 首版状态 |
| --- | --- | --- | --- |
| 根骨 | 生命、体力、昏倒容错 | 根骨、气脉舒展、护身余息、片刻调息、危息自觉 | 前 3 个接线，后 2 个预留/信息 |
| 巧作 | 加工、工具、工坊秩序 | 顺手成流、器用有度、炉火耐心、仓中有序、工坊手记 | 前 2 个接线，后 3 个预留/信息 |
| 山行 | 行旅、矿洞、采集路线 | 识路避险、入洞听声、识草看风、回身留路、山图留记 | 识路避险、入洞听声、山图留记接线 |
| 人和 | 委托、节庆、社交 | 识人问事、会期周全、投其所好、村社牵线、客来有缘 | 前 2 个接线，后 3 个预留/信息 |

首版共 4 条分线、20 个节点，每个节点 1-3 阶。接线节点使用 `POTENTIAL_EFFECT_VALUES` 集中配置，预留节点只能显示玩家态说明，不能暗中给真实收益。

## 资源来源

首版保持 5 类来源方向、6 条具体规则：

| 规则 ID | 来源方向 | 周期上限 |
| --- | --- | --- |
| `mine_boss_clear` | 矿洞 Boss / 高层首领 | 每日 2 次，材料量 4 |
| `journey_high_risk` | 高风险行旅 / 区域首领 | 每日 2 次，材料量 4 |
| `special_order_finish` | 特殊订单 / 阶段订单 | 每周 2 次，材料量 6 |
| `theme_week_settlement` | 主题周 / 周目标结算 | 每周 1 次，材料量 3 |
| `museum_hidden_sample` | 博物馆考据 / 隐藏样本 | 每季 3 次，材料量 6 |
| `festival_spirit_event` | 节庆 / 仙灵相关事件 | 每周 2 次，材料量 4 |

发放必须通过 `claimPotentialSourceReward(sourceId, eventKey, options)`。同一 `sourceId + periodKey + eventKey` 不得重复领取；达到周期次数或材料量上限时只给玩家态提示，不继续发放。

## 首批接线效果

| effectKey | 类型 | 接线面 | 安全上限 |
| --- | --- | --- | --- |
| `potential_max_hp_flat` | 公式型 | 角色生命上限 | +30 |
| `potential_max_stamina_flat` | 公式型 | 角色体力上限 | +9 |
| `potential_passout_loss_reduction` | 公式型 | 昏倒铜钱损失 | 15% |
| `potential_processing_speed` | 公式型 | 加工耗时 | 10%，最低 1 天 |
| `potential_tool_stamina_save` | 公式型 | 工具体力消耗 | 6%，单次最低 1 点 |
| `potential_journey_hazard_resist` | 公式型 | 行旅压险 | +9 |
| `potential_mine_entry_hint` | 信息型 | 矿洞进层提示 | 不加产出 |
| `potential_festival_bonus` | 公式型 | 节庆窗口出货 | 9%，限定节庆供应窗口 |
| `potential_quest_bias` | 信息/权重型 | 任务板提示 | 不直接发奖励 |
| `potential_region_marker` | 信息型 | 区域图提示 | 不直接发奖励 |

## UI 与引导

- 独立页面：`/game/potential`，展示资源、分线、节点、升级成本、来源和重修。
- 入口：移动菜单、技能页、角色信息页、指南页。
- 角色信息页显示分线阶数和已显化效果，不显示内部 key。
- 样本档 `endgame_showcase` 默认落点改为潜能页，便于 QA 直接检查。

## 重修规则

- 首版只支持整条分线重修，不做单节点撤销。
- 每季每条分线首次重修全额返还；之后返还 80%，保留 20% 作为决策成本。
- 重修必须先预览返还与保留材料，确认后才清空该分线节点。
- 重修记录保留最近 20 条，旧档异常记录会被归一化。

## 验收

- `npm run qa:potential-save-guards`
- `npm run qa:potential-effect-guards`
- `npm run qa:potential-resource-guards`
- `npm run qa:potential-ui-structure`
- `npm run qa:skill-mastery-effect-guards`
- `npm run qa:late-game-samples`

## 风险说明

- 潜能首版不提供攻击、暴击或全局售价膨胀，避免压扁后期战斗和经济。
- 信息型节点必须保持“提示、标记、偏向”定位，不能顺手加产出。
- 来源上限应偏保守，避免玩家在一周内点满首版潜能。
- 后续扩展优先补玩家可感知但低数值风险的能力，例如提示、容错、路径选择，而不是直接堆收益。
