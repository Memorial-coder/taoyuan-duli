# 全 NPC 图片嵌入游戏计划

## 结论

根目录没有单独的 `npc/` 文件夹，当前可用的 NPC 原图在 `images/npc/`；旧的一图版本在 `images/generated/npc/`。本次应沿用物品图标管线的原则：原图只留本地，Git 和部署包只保留压缩后的运行时资源。

`images/npc/` 现有 285 张 PNG，覆盖 57 组人物基名，每组都有 `_01` 到 `_05` 五个变体，总体积约 612.8MB，单张约 1.4-2.59MB。直接进 Git 或直接放进前端包都会明显拖慢 clone、构建和加载。

## 资产覆盖

- 常规 NPC：`taoyuan-main/src/data/npcs.ts` 中 34 个顶层 NPC 名称，图片目录已全部直接匹配。
- 隐藏 NPC：图片用 `名字-真名` 命名，需要别名映射到 `taoyuan-main/src/data/hiddenNpcs.ts`。
- 随机来访 NPC：图片用 `职业（姓名种子）` 命名，对应 `taoyuan-main/src/data/randomNpcs.ts` 的模板。
- 商人和村中居民：`旅行商人`、`行脚书生`、`节庆商人`、`巡回艺人`、`异乡客`、`老掌柜`、`驿商阿遥`、`闻笺先生`、`青岚` 等图片可接入商店、书肆、居民提示或后续来访卡片。

隐藏 NPC 第一批别名：

| id | 数据名 | 图片基名 |
| --- | --- | --- |
| `long_ling` | 龙灵 / 沧澜 | `龙灵-沧澜` |
| `tao_yao` | 桃夭 / 灼华 | `桃夭-灼华` |
| `yue_tu` | 月兔 / 素问 | `月兔-素问` |
| `hu_xian` | 狐仙 / 无名 | `狐仙-无名` |
| `shan_weng` | 山翁 / 清虚 | `山翁-清虚` |
| `gui_nv` | 归女 / 锦归 | `归女-锦归` |

随机 NPC 第一批别名：

| template id | 图片基名 |
| --- | --- |
| `tea_caravan_apprentice` | `行脚茶商学徒（陆青-谢小茶-苏闻）` |
| `traveling_pet_healer` | `游方兽医（程鹿-阿眠-白芷）` |
| `lost_exam_scholar` | `迷路书生（周砚-林小卷-孟行舟）` |
| `lantern_wall_artisan` | `花灯修补匠（顾灯-梅三娘-宋巧）` |
| `river_oath_weaver` | `河湾织补师（沈织-柳阿澄-乔晚灯）` |
| `missing_sister_apothecary` | `寻亲药童（许寻-阿灯-白小蓁）` |
| `runaway_betrothal_tailor` | `逃婚绣娘（纪鸢-阿缎-沈棠）` |
| `wandering_map_painter` | `游历绘图人（唐野-叶行川-阿路）` |

## 管线方案

参照现有 item 管线：

- 原图输入：`images/npc/*.png`
- 生成脚本：`taoyuan-main/scripts/prepare-npc-portraits.cjs` 调用 `prepare-npc-portraits.py`
- 运行时输出：`taoyuan-main/public/npc/128/`、`taoyuan-main/public/npc/256/`
- 清单文件：`taoyuan-main/public/npc/npc-portrait-manifest.json`
- 可选打包：`taoyuan-main/public/npc-portraits-YYYYMMDDHHMMSS.zip`

建议先生成 128 和 256 两档。128 用于列表、关系图和来访卡片，256 用于详情弹窗；如果详情页截图明显糊，再加 512，但不要第一版就把包体拉大。

命名识别规则：

```text
陈伯_01.png -> base=陈伯, variant=01
龙灵-沧澜_03.png -> base=龙灵-沧澜, variant=03
```

和 item 的 `__01` 不同，NPC 目前是单下划线 `_01`；脚本应兼容这个格式，不强行改原图文件名。

## Manifest 格式

建议清单保持接近 item manifest，但字段从 item 改为 portrait：

```json
{
  "version": "2026-06-04T00:00:00.000Z",
  "basePath": "/npc",
  "defaultVariant": "01",
  "sizes": [128, 256],
  "byId": {
    "chen_bo": {
      "name": "陈伯",
      "displayName": "陈伯",
      "assetBase": "陈伯",
      "kind": "regular",
      "variants": {
        "01": { "128": "128/陈伯_01.png", "256": "256/陈伯_01.png" }
      }
    }
  },
  "byName": {},
  "byDisplayName": {},
  "byTemplateId": {}
}
```

读取顺序：

1. 常规 NPC：`byId[npc.id]`，再兜底 `byName[npc.name]`。
2. 隐藏 NPC：`byId[hidden.id]`，再用 `name-trueName` 别名。
3. 随机 NPC：`byTemplateId[visitor.templateId]`，再用 `occupation` 或 `nameSeeds` 组合别名。
4. 找不到或玩家关闭照片时，回到现有文字 UI，不改变玩法状态。

## 前端接入

新增组件和 composable：

- `taoyuan-main/src/composables/useNpcPortraitManifest.ts`
- `taoyuan-main/src/components/game/NpcPortrait.vue`

`NpcPortrait.vue` 负责：

- 懒加载 manifest。
- 根据 `settingsStore.npcPortraitsEnabled` 决定是否显示图片。
- 图片加载失败时显示现有首字/文字 fallback。
- 列表卡片用 `size="sm"` 和 128，详情弹窗用 `size="lg"` 和 256。

接入位置优先级：

1. `taoyuan-main/src/views/game/NpcView.vue` 常规村民列表和常规 NPC 详情弹窗。
2. `NpcView.vue` 仙灵已揭示列表、仙灵传闻卡和仙灵详情弹窗。
3. `NpcView.vue` 本周来访、熟人册、长住 NPC 卡片。
4. `taoyuan-main/src/components/game/FamilyRelationGraph.vue` 只在布局稳定后接入小头像。
5. 商店页可后续把 `旅行商人`、`行脚书生`、`老掌柜` 等用同一个组件接上。

## 玩家开关

已在设置页预留开关：

- 位置：设置 -> 外观 -> 人物照片
- 状态字段：`settingsStore.npcPortraitsEnabled`
- 默认：`false`
- 存档字段：`settings.npcPortraitsEnabled`

默认关闭是为了尊重不喜欢人物照片的玩家。正式接入图片后，所有 NPC 图片显示入口都必须检查这个字段；关闭时不请求 manifest，不加载图片，不改变卡片高度到不可读。

## Git 和部署

本次已把 NPC 原图加入忽略规则：

- `.gitignore` 忽略 `images/npc/**` 的大图和生成日志。
- `.dockerignore` 忽略同样的源图，避免 Docker build context 被 600MB 原图拖慢。
- 运行时压缩图应进入 `taoyuan-main/public/npc/`，这部分不忽略。
- Express 静态挂载与物品图标一致：`/npc` 优先读取 `TAOYUAN_NPC_PORTRAIT_DIR` 或 Linux 默认 `/opt/taoyuan/npc`，Windows 本地默认 `taoyuan-main/public/npc`；容器内使用宿主机目录时需要把 `./npc` volume 到 `/opt/taoyuan/npc`。

部署时不要只上传 `/npc` 图片目录。只要前端代码接入了 `NpcPortrait.vue` 或设置开关，就必须重新构建并部署 `taoyuan-main/docs/`，包括 `assets/` 和 `npc/`。

## 验收清单

- `npm --prefix taoyuan-main run prepare:npc-portraits` 能生成 128/256 图片和 manifest。
- manifest 中常规 NPC 覆盖率为 34/34，隐藏 NPC 覆盖率为 6/6，随机 NPC 模板覆盖率至少 8/8。
- `npm --prefix taoyuan-main run type-check` 通过。
- `npm --prefix taoyuan-main run check` 通过。
- 浏览器检查：设置开关开/关后，NPC 页列表和详情都能切换；关闭时不出现空白图框。
- 移动端检查：NPC 卡片文字不被图片挤压，详情弹窗不溢出屏幕。
- 构建检查：`npm --prefix taoyuan-main run build` 后 `taoyuan-main/docs/npc/` 与新前端 assets 同时存在。

## 风险

- 照片风格会改变文字游戏观感，所以必须保留默认关闭和稳定 fallback。
- 单张原图较大，压缩脚本要优先保证输出尺寸和文件体积，不要把源图复制进 public。
- 隐藏 NPC 和随机 NPC 需要别名表；只靠名字自动匹配会漏掉 `龙灵-沧澜`、`职业（姓名种子）` 这类组合名。
- 详情页如果使用 512 图，移动端首屏可能变慢；第一版先用 256 验证。
