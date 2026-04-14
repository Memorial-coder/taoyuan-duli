# taoyuan-duli

这是从 Lucky Web 中拆出来的 **桃源乡独立版**。

## 目录说明

- `taoyuan-main/`：桃源乡前端源码与构建产物
- `server/`：独立版后端，提供登录、云存档、交流大厅、邮箱、AI 助手等接口
- `data/`：独立版运行数据
- `data-defaults/`：默认配置

## 运行方式

项目统一收口为 **单端口 4013**：前端先构建到 `taoyuan-main/docs`，再由 `server` 统一托管页面与 `/api`。

### 1. 前端构建

```bash
cd taoyuan-main
npm install
npm run build
```

### 2. 配置后端环境

先复制一份环境文件：

```bash
cd ../server
copy .env.example .env
```

重点配置说明：

- `PORT=4013`：本地统一运行端口
- `SECRET_KEY`：会话密钥，必须改成随机长字符串
- `ADMIN_TOKEN`：普通管理员口令，必须修改默认示例值
- `SUPER_ADMIN_TOKEN`：超级管理员口令
- `CORS_ALLOWED_ORIGINS`：允许跨域携带 Cookie 的来源列表
- `COOKIE_SECURE=true`：若部署在 HTTPS 反向代理后，建议开启
- `COOKIE_SAME_SITE`：可选，默认在 `COOKIE_SECURE=true` 时自动使用 `none`，否则为 `lax`
- `MYSQL_PASSWORD`：**MySQL 数据库连接密码**，不是玩家登录密码

> 玩家账号密码不在 `.env` 里配置，而是用户在注册页面自行设置并写入数据库。

### 3. 启动后端

```bash
npm install
npm start
```

默认访问地址：

```text
http://127.0.0.1:4013
```

> 如果你像当前联调一样用 Docker 做端口映射（例如 `4014:4013`），那么：
>
> - 容器内应用实际仍监听 **4013**
> - 宿主机访问地址则是 `http://127.0.0.1:4014`

### 4. Docker 部署（推荐服务器使用）

先在项目根目录构建镜像：

```bash
docker build -t taoyuan-duli:latest .
```

生产运行示例：

```bash
docker run -d \
  --name taoyuan-duli \
  -p 4014:4013 \
  -e SECRET_KEY=请替换成至少24位随机长字符串 \
  -e ADMIN_TOKEN=请替换成至少12位管理员口令 \
  -e SUPER_ADMIN_TOKEN=请替换成至少12位超级管理员口令 \
  -e COOKIE_SECURE=true \
  -e CORS_ALLOWED_ORIGINS=https://你的域名 \
  -v taoyuan-duli-data:/app/data \
  taoyuan-duli:latest
```

补充说明：

- **必须**挂载 `/app/data`，否则重建容器后用户、会话、存档、邮箱、审计日志等运行数据会丢失
- 镜像已内置健康检查，可通过 `/api/health` 判活
- 若你打算使用 **MySQL** 管理账号，请额外传入 `MYSQL_HOST / MYSQL_PORT / MYSQL_USER / MYSQL_PASSWORD / MYSQL_DATABASE`
- 若你打算继续使用本地 `users.json` 模式，请**不要**传入上述 MySQL 变量，后端会自动回退到本地文件用户库
- 容器内服务始终监听 **4013**，对外可按需映射为 `4014`、`80` 或 `443` 之后的反向代理入口

导出镜像：

```bash
docker save -o taoyuan-duli-latest.tar taoyuan-duli:latest
```

### 5. 手动上传镜像到服务器后用 docker compose 启动

如果你打算像现在这样：

- 手动上传 `tar` 镜像包
- 手动上传 `docker-compose.yml`
- 手动上传运行用 `.env`

那可以直接使用仓库根目录里的：

- `docker-compose.yml`
- `.env.compose.example`

建议服务器目录结构类似：

```text
/opt/lucky-test/
  ├─ taoyuan-duli-latest.tar
  ├─ docker-compose.yml
  ├─ .env
  └─ data/
```

其中：

- 容器名已经固定为 `taoyuan`
- 数据目录使用 `./data:/app/data`
- 你只需要把 `.env.compose.example` 改名为 `.env` 并填写真实值

服务器上可按下面流程执行：

```bash
cd /opt/lucky-test
docker load -i taoyuan-duli-latest.tar
docker compose down
docker compose up -d
```

如果你想保持你自己的命名方式，也可以把镜像文件改名后再上传，例如：

```bash
docker load -i lucky-test.tar
cd /opt/lucky-test
docker compose down
docker compose up -d
```

查看状态：

```bash
docker compose ps
docker logs -f taoyuan
curl http://127.0.0.1:4014/api/health
```

如果你的对外端口不是 `4014`，把上面的端口改成你在 `.env` 里设置的 `HOST_PORT` 即可。

## 默认说明

- 独立版不再依赖抽奖系统或 NewAPI
- 用户可在游戏首页自行注册/登录
- 请务必在 `.env` 中自定义管理员口令与会话密钥，不要直接使用示例值
- 如配置了 `SUPER_ADMIN_TOKEN`，则可启用“普通管理员 / 超级管理员”双角色
- 游戏默认使用本地存档，也支持账号云存档
