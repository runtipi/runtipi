ARG NODE_VERSION="18.18"

FROM node:${NODE_VERSION}-slim AS node_base

FROM node_base AS builder_base

RUN npm install pnpm -g

FROM node_base AS runner_base

RUN apt-get update && apt-get install -y \
  openssl \
  git \
  curl \
  && rm -rf /var/lib/apt/lists/*

FROM builder_base AS builder

WORKDIR /app

COPY ./pnpm-lock.yaml ./
COPY ./pnpm-workspace.yaml ./
COPY ./patches ./patches
RUN pnpm fetch --no-scripts

COPY ./packages ./packages

RUN pnpm install -r --prefer-offline 

COPY ./packages/worker/build.js ./packages/worker/build.js
COPY ./packages/worker/src ./packages/worker/src
COPY ./packages/worker/package.json ./packages/worker/package.json
COPY ./packages/worker/assets ./packages/worker/assets

RUN pnpm -r build --filter @runtipi/worker

FROM runner_base AS app

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/packages/worker/dist .
COPY --from=builder /app/packages/worker/assets ./assets

CMD ["node", "index.js", "start"]

