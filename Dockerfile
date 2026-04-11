ARG BASE_IMAGE=node:22-alpine
ARG NPM_REGISTRY=https://registry.npmjs.org
ARG ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/

FROM ${BASE_IMAGE} AS frontend-builder

ARG NPM_REGISTRY
ARG ELECTRON_MIRROR

WORKDIR /app/taoyuan-main

ENV NODE_ENV=development
ENV ELECTRON_MIRROR=${ELECTRON_MIRROR}

RUN npm config set registry ${NPM_REGISTRY}

COPY taoyuan-main/package.json taoyuan-main/package-lock.json ./
RUN npm ci --include=dev

COPY taoyuan-main ./
RUN rm -rf docs && npm run build

FROM ${BASE_IMAGE}

ARG NPM_REGISTRY

WORKDIR /app

RUN npm config set registry ${NPM_REGISTRY}

COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

COPY server ./server
COPY --from=frontend-builder /app/taoyuan-main/docs ./taoyuan-main/docs
COPY data-defaults ./data-defaults

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=4013
ENV DB_STORAGE=/app/data/.storage.json
ENV SECRET_KEY=
ENV ADMIN_TOKEN=
ENV SUPER_ADMIN_TOKEN=
ENV DEFAULT_USER_QUOTA=2000000
ENV EXCHANGE_RATE=500000
ENV TAOYUAN_EXCHANGE_RATE_DOLLAR_PER_MONEY=0.0002

EXPOSE 4013

VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" > /dev/null || exit 1

CMD ["node", "server/src/index.js"]
