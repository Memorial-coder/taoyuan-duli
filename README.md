> 在线体验：[立即进入桃源乡独立版](https://taoyuan.ymzcc.com/)  
> 链接地址：`https://taoyuan.ymzcc.com/`

<p align="center">
  <img src="taoyuan-main/images/logo.png" alt="桃源乡独立版封面" width="760" />
</p>

<h1 align="center">桃源乡独立版</h1>

<p align="center">
  <a href="https://taoyuan.ymzcc.com/" target="_blank">
    <img src="https://img.shields.io/badge/在线体验-立即进入桃源乡-14b8a6?style=for-the-badge&logo=joy-con&logoColor=white" alt="在线体验">
  </a>
  <a href="https://github.com/setube/taoyuan" target="_blank">
    <img src="https://img.shields.io/badge/开源地址-GitHub-black?style=for-the-badge&logo=github" alt="GitHub">
  </a>
</p>

<p align="center">
  <b>🌟 一个可独立部署的国风田园经营项目 🌟</b><br>
  整合单人经营冒险与账号、云存档、交流大厅、游戏邮箱、AI 小助理等在线能力。
</p>

---

### 🚀 快速访问

> [!IMPORTANT]
> **在线游玩地址**：[https://taoyuan.ymzcc.com/](https://taoyuan.ymzcc.com/)  
> **官方交流群**：1094297186 (QQ)

---
<p align="center">
  <a href="游戏简介.md">玩家向简介</a> ·
  <a href="https://taoyuan.ymzcc.com/guide.html">新手教程</a> ·
  <a href="https://taoyuan.ymzcc.com/guide-book.html">系统百科</a> ·
  <a href="https://github.com/setube/taoyuan">参考仓库</a> ·
  QQ 群：1094297186
</p>

<p align="center">
  <code>国风田园经营</code>
  <code>单人冒险</code>
  <code>任务板 / 主题周 / 周结算</code>
  <code>鱼塘 / 育种 / 博物馆 / 公会 / 瀚海</code>
  <code>Docker / Compose</code>
</p>

## 项目定位

| 项目 | 说明 |
| --- | --- |
| 游戏定位 | 国风田园经营 + 探索冒险 + 关系养成 + 独立版在线能力 |
| 核心体验 | 单人经营仍然是主轴，在线能力负责账号、持久化和辅助社交 |
| 适用场景 | 本地自用、局域网试跑、朋友小范围共享、自建公网服务 |
| 默认端口 | 单端口 `4013` |
| 前端目录 | `taoyuan-main/` |
| 后端目录 | `server/` |
| 数据目录 | `data/` |
| 部署方式 | 本地启动、Docker、Docker Compose |

## 文档导航
- 想直接试玩线上版本：访问 [在线体验](https://taoyuan.ymzcc.com/)
- 想先判断游戏是不是你喜欢的类型：阅读 [游戏简介.md](游戏简介.md)
- 想快速理解当前版本的开局路线：阅读 https://taoyuan.ymzcc.com/guide.html
- 想按系统查看更细的机制分工：阅读 https://taoyuan.ymzcc.com/guide-book.html
- 想先把项目跑起来：阅读下面的 `快速开始`
- 想部署到服务器：阅读 `Docker 与 Compose 部署`
- 想改代码、联调或二开：阅读 `开发者说明`
## 游戏特色

- **不是只靠种地撑全程**：除了田庄经营，还有矿洞、公会、鱼塘、育种、博物馆、瀚海、关系线和隐藏仙灵等多条成长线
- **当前版本更强调“任务给方向”**：主线、告示板、委托、特殊订单、主题周、周结算会一起推动经营节奏
- **六种田庄带来不同开局**：桃源、草甸、溪流、竹林、山丘、荒野会明显影响前几天的体验手感
- **中后期系统已经成型**：鱼塘有周赛和展示池，育种有谱系与认证，公会和博物馆也都有完整承接
- **独立版在线能力可单独部署**：支持注册登录、账号云存档、交流大厅、游戏邮箱、AI 小助理

如果你想看更完整的玩家向介绍，建议直接打开 [游戏简介.md](游戏简介.md)。

## 游戏截图

<p align="center">
  <img src="taoyuan-main/images/1.png" alt="桃源乡独立版截图 1" width="48%" />
  <img src="taoyuan-main/images/2.png" alt="桃源乡独立版截图 2" width="48%" />
</p>

<p align="center">
  <img src="taoyuan-main/images/3.png" alt="桃源乡独立版截图 3" width="48%" />
  <img src="taoyuan-main/images/4.png" alt="桃源乡独立版截图 4" width="48%" />
  
### 部署指南

### 前置条件
- 若选择docker启动，请确保已安装 Docker（建议 20.10 以上）并确保 Docker Daemon 正常运行。
- 若选择本地源码启动，请确保已安装 Node.js（LTS 版本）和 npm。

---

### 方式一：快速启动（使用 GHCR 镜像）【推荐】
一行命令即可运行，省去本地依赖安装和前端编译。

```bash
docker pull ghcr.io/memorial-coder/taoyuan-duli:latest

docker run -d \
  --name taoyuan \
  -p 4014:4013 \
  -e SECRET_KEY=请替换为至少24位随机字符串 \
  -e ADMIN_TOKEN=请替换为管理员口令 \
  -e SUPER_ADMIN_TOKEN=如需可填入超级管理员口令 \
  -e COOKIE_SECURE=false \
  -e COOKIE_SAME_SITE=lax \
  -v taoyuan-duli-data:/app/data \
  ghcr.io/memorial-coder/taoyuan-duli:latest
```

访问 `http://127.0.0.1:4014` 即可看到游戏。生产环境请在运行前添加 `CORS_ALLOWED_ORIGINS`、`COOKIE_SECURE=true` 等安全配置。

---

### 方式二：本地源码启动（适合二次开发）
1. **准备环境**：确保已安装 Node.js（建议 LTS）和 npm。
2. **构建前端**：

```bash
cd taoyuan-main
npm install
npm run build   # 输出至 taoyuan-main/docs
```
3. **配置后端**：

```bash
cd ../server
copy .env.example .env
```

在 `server/.env` 中至少修改：
- `SECRET_KEY`：随机长字符串
- `ADMIN_TOKEN`：管理员口令
- `SUPER_ADMIN_TOKEN`（可选）
4. **启动后端**：

```bash
npm install
npm start
```

服务启动后，打开 `http://127.0.0.1:4013` 访问游戏。确保 `taoyuan-main/docs` 已完成构建，否则前端页面将无法展示。

---

### 方式三：Docker Compose 部署（适合服务器）
创建根目录 `.env`（复制 `.env.compose.example`），并填写 `SECRET_KEY`、`ADMIN_TOKEN`、`SUPER_ADMIN_TOKEN`（如需）。

目录结构示例：

```text
/opt/taoyuan/
  ├─ docker-compose.yml
  ├─ .env
  └─ data/   # 用于持久化 /app/data
```

`docker-compose.yml` 示例：

```yaml
services:
  taoyuan:
    image: ghcr.io/memorial-coder/taoyuan-duli:latest
    container_name: taoyuan
    restart: unless-stopped
    env_file: [.env]
    environment:
      DB_STORAGE: /app/data/.storage.json
    ports:
      - "${HOST_PORT:-4014}:4013"
    volumes:
      - ./data:/app/data
```

启动或更新：

```bash
cd ......./taoyuan
docker compose pull        # 拉取最新镜像
docker compose up -d       # 启动或重启服务
```

健康检查：

```bash
curl http://127.0.0.1:4014/api/health
```


---


## 技术栈

| 模块 | 技术 | 说明 |
| --- | --- | --- |
| 前端框架 | Vue 3.5 + Pinia + Vue Router | 游戏界面、状态管理、页面路由 |
| 构建与类型 | Vite 7 + TypeScript 5.9 | 前端构建、类型检查、开发联调 |
| 样式 | TailwindCSS 3 + 原生 CSS | UI 布局与样式组织 |
| 后端服务 | Express 4 + express-session + Helmet + CORS | 登录、存档、大厅、邮箱、AI 助手接口 |
| 数据存储 | 本地文件用户库 / MySQL2 | 支持本地文件与 MySQL 两种账号模式 |
| 多端能力 | Electron + Capacitor | 桌面打包与 Android 构建能力已在前端目录中保留 |
| 部署 | Docker + Docker Compose | 本地、服务器、自定义镜像部署 |

## 项目结构

```text
.
├─ taoyuan-main/              # 前端源码、静态资源、构建产物
│  ├─ src/                    # 游戏前端源码
│  ├─ public/                 # 新手教程、系统百科等静态文件
│  ├─ images/                 # README / 宣传图等素材
│  ├─ docs/                   # Vite 构建输出目录
│  └─ package.json            # 前端脚本与依赖
├─ server/                    # 独立版后端
│  ├─ src/                    # API、会话、存档、大厅、邮箱、AI 助手
│  ├─ .env.example            # 后端配置示例
│  └─ package.json            # 后端脚本与依赖
├─ data/                      # 运行时数据
├─ data-defaults/             # 默认配置与初始数据
├─ tools/                     # 辅助工具脚本
├─ docker-compose.yml         # 默认 Compose 入口（本地 repack 流程）
├─ Dockerfile                 # 完整构建镜像
├─ Dockerfile.repack          # 基于现有镜像快速回填构建
├─ .env.compose.example       # Compose 环境变量示例
├─ 游戏简介.md                # 玩家向介绍
└─ README.md                  # 项目入口说明
```

## 游戏系统一览

| 系统 | 定位 | 当前特点 |
| --- | --- | --- |
| 田庄 / 种植 | 开局保底经营线 | 六种田庄、轮作种植、设施升级、稳定现金流 |
| 牧场 / 家园 | 日常经营扩展线 | 动物照料、产物维护、宅院布置与生活化体验 |
| 钓鱼 / 鱼塘 | 中期经营线 | 钓鱼补现金流、鱼塘周赛、展示池、高阶养护 |
| 矿洞 / 公会 | 冒险成长线 | 矿石素材、战斗推进、讨伐、捐献、荣誉与赛季 |
| 育种 | 中后期实验线 | 谱系、认证、图鉴、品鉴周赛、规划器 |
| 博物馆 | 收藏与展陈线 | 展陈评分、馆务推进、学者委托、长期收集目标 |
| 瀚海 | 高阶段商路线 | 商路投资、遗迹勘探、轮换货架、异域经营 |
| 村民 / 婚姻 / 仙灵 | 关系与奇遇线 | 送礼、恋爱、婚姻、仙缘与长期加成 |
| 在线功能 | 独立版差异能力 | 登录、云存档、交流大厅、邮箱、AI 小助理 |

## 部署配置速查

部署时主要看根目录 `.env`。如果你是本地源码直跑，再另外参考 `server/.env.example`。

### 根目录 `.env` 常用配置

| 配置项 | 是否常用 | 作用 | 常见说明 |
| --- | --- | --- | --- |
| `HOST_PORT` | 是 | 映射到宿主机的端口 | 常见为 `4014`、`80`、`443` 后的反代入口 |
| `SECRET_KEY` | 是 | 传给容器内服务的会话密钥 | 规则同上 |
| `ADMIN_TOKEN` | 是 | 传给容器内服务的管理员口令 | 规则同上 |
| `SUPER_ADMIN_TOKEN` | 否 | 超级管理员口令 | 可留空 |
| `CORS_ALLOWED_ORIGINS` | 通常是 | 允许跨域携带 Cookie 的来源 | 生产环境建议填写真实域名 |
| `COOKIE_SECURE` | 生产环境建议开启 | 控制 HTTPS Cookie | 与反向代理配置一起考虑 |
| `COOKIE_SAME_SITE` | 视跨域策略 | Cookie 跨站策略 | 跨站登录常见为 `none` |
| `MYSQL_HOST / MYSQL_PORT / MYSQL_USER / MYSQL_PASSWORD / MYSQL_DATABASE` | 否 | MySQL 用户库配置 | 不使用 MySQL 时留空即可 |

## 上线检查清单

- 不要直接使用示例 `SECRET_KEY`、`ADMIN_TOKEN`、`SUPER_ADMIN_TOKEN`
- 不要把根目录 `.env` 或 `server/.env` 提交到仓库
- 生产环境建议通过 HTTPS 反向代理暴露服务
- 若使用跨站 Cookie，确保 `COOKIE_SAME_SITE=none` 时同时启用 `COOKIE_SECURE=true`
- 确认 `CORS_ALLOWED_ORIGINS` 填写的是实际访问地址，而不是临时测试地址
- 确认数据卷已挂载到 `/app/data`
- 若使用 MySQL，额外备份数据库，不要只备份容器

## 部署运维

- `data/` 目录或容器挂载的数据卷
- 当前使用的 `.env`
- 若启用了 MySQL，再额外备份数据库
- 如有自定义部署脚本，也一并备份

### 升级

1. 先备份 `data/`、`.env` 和数据库
2. 准备新镜像，或等待 GitHub Actions 推送新的 GHCR 镜像，或在目标机器上构建新镜像
3. 保持数据挂载目录不变
4. 执行 `docker compose down` 后再 `docker compose up -d`
5. 用 `/api/health` 和实际登录流程确认升级成功

### 恢复

1. 停掉当前容器
2. 还原旧数据目录或旧数据库
3. 还原旧配置文件
4. 重新加载旧镜像并启动
5. 检查首页、登录、存档和后台入口是否正常

## 常用运维命令

查看容器状态：

```bash
docker compose ps
```

查看实时日志：

```bash
docker logs -f taoyuan
```

检查健康接口：

```bash
curl http://127.0.0.1:4014/api/health
```

重建并启动：

```bash
docker compose up -d --build
```

停止并移除当前服务：

```bash
docker compose down
```

如果你当前是本地直接运行模式，后端启动命令是：

```bash
cd server
npm start
```

## 开发者说明

如果你要继续开发、二开或本地联调，可以把前后端分开运行。

### 前端开发

```bash
cd taoyuan-main
npm install
npm run dev
```

常用命令：

- `npm run build`：构建生产静态资源到 `taoyuan-main/docs`
- `npm run lint`：执行前端 lint
- `npm run type-check`：执行 TypeScript 检查
- `npm run qa:late-game`：执行较完整的后期样本与静态检查流程

### 后端开发

```bash
cd server
npm install
npm run dev
```

常用命令：

- `npm start`：普通启动
- `npm run dev`：使用 `node --watch` 监听改动

### 联调与构建说明

- 正式对外服务时，`server` 会优先提供 `taoyuan-main/docs` 下的静态页面
- 如果你改的是前端页面，记得重新执行 `taoyuan-main` 下的 `npm run build`
- 如果你只改了后端接口，重新启动 `server` 或容器即可
- 如果你使用的是 `Dockerfile.repack` 流程，前端修改只有在重新构建 `docs` 后才会进入镜像

## 常见问题

### 打开网页失败

先检查两件事：

- 你有没有先执行 `npm run build`
- 你现在是不是已经在 `server` 目录里执行了 `npm start`

### 构建了前端，但页面还是旧的

优先排查这几项：

- 你是否重新执行了 `taoyuan-main` 下的 `npm run build`
- 你是否只是 `docker compose up -d`，但没有重新构建镜像
- 你当前是否仍在使用旧的 `taoyuan-duli:latest` 镜像

### 端口被占用

如果 `4013` 被别的程序占用了，可以修改 `server/.env` 里的 `PORT`。如果你用的是 Compose，则修改根目录 `.env` 里的 `HOST_PORT`。

### 登录或 Cookie 异常

先优先检查：

- `SECRET_KEY` 有没有改掉示例值
- `CORS_ALLOWED_ORIGINS` 是否和你的访问地址一致
- 跨站部署时是否正确设置了 `COOKIE_SECURE` 与 `COOKIE_SAME_SITE`

### 数据丢失

如果你是本地直接运行，通常数据会保存在本地运行目录。

如果你是用 Docker 运行，必须挂载 `/app/data`，否则重建容器后数据会丢失。

### 想继续使用本地文件用户库，而不是 MySQL

不要填写 `MYSQL_HOST / MYSQL_PORT / MYSQL_USER / MYSQL_PASSWORD / MYSQL_DATABASE`，后端会自动回退到本地文件用户库。

## 交流与参考

- 玩家向简介：[游戏简介.md](游戏简介.md)
- 新手教程：https://taoyuan.ymzcc.com/guide.html
- 系统百科：https://taoyuan.ymzcc.com/guide-book.html
- 参考仓库：<https://github.com/setube/taoyuan>
- 用户 QQ 群：1094297186

## 默认说明

- 用户可在游戏首页自行注册/登录
- 请务必在 `.env` 中自定义管理员口令与会话密钥，不要直接使用示例值
- 如配置了 `SUPER_ADMIN_TOKEN`，则可启用“普通管理员 / 超级管理员”双角色
- 游戏默认使用本地存档，也支持账号云存档

---

## ⚖️ 开源声明与版权说明

本仓库代码遵循 **[MIT](LICENSE)** 开源协议，但在使用与分流时请遵守以下约定：

1. **注明出处**：若您引用本项目的核心代码、美术素材或在此基础上进行二次开发，**必须**在您的项目说明文档（README）或显著位置保留指向本仓库的链接。
2. **禁止商用**：未经原作者书面许可，严禁将本项目（及其修改版本）用于任何形式的商业盈利行为（包括但不限于出售游戏激活码、内置付费充值、商业授权等）。
3. **转载要求**：任何个人或组织在第三方平台（如 Bilibili、知乎、CSDN、个人博客等）转载、解说或发布本项目的相关教程、源码分析时，**必须显著注明出处及原作者信息**。

> [!CAUTION]
> **尊重开源，始于致敬。** 桃源乡的每一行代码都倾注了开发者的心血，请在遵守协议的前提下进行交流与学习。