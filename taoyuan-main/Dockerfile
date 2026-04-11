# 本地构建用的 Dockerfile
# 支持完整的源代码构建流程

FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package.json pnpm-lock.yaml ./

# 安装 pnpm
RUN npm install -g pnpm

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建项目
RUN pnpm run build

# 生产阶段
FROM nginx:alpine

# 复制 nginx 配置文件
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 清理默认的 nginx 静态文件
RUN rm -rf /usr/share/nginx/html/*

# 复制构建产物到 nginx 静态文件目录
COPY --from=builder /app/docs /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]