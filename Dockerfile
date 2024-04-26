ARG NODE_VERSION="20.10"
ARG ALPINE_VERSION="3.18"

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS node_base

# ---- BUILDER BASE ----
FROM node_base AS builder_base

ARG SENTRY_AUTH_TOKEN
ARG TIPI_VERSION
ARG LOCAL

ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}
ENV TIPI_VERSION=${TIPI_VERSION}
ENV LOCAL=${LOCAL}

RUN npm install pnpm -g
RUN apk add --no-cache curl python3 make g++ git

# ---- RUNNER BASE ----
FROM node_base AS runner_base

RUN apk add --no-cache curl openssl git
RUN npm install pm2 -g

# ---- BUILD DASHBOARD ----
FROM builder_base AS dashboard_builder

WORKDIR /dashboard

COPY ./pnpm-lock.yaml ./
RUN pnpm fetch

COPY ./pnpm-workspace.yaml ./
COPY ./package*.json ./
COPY ./packages/shared ./packages/shared

RUN pnpm install -r --prefer-offline 
COPY ./src ./src
COPY ./tsconfig.json ./tsconfig.json
COPY ./next.config.mjs ./next.config.mjs
COPY ./public ./public
COPY ./tests ./tests

# Sentry
COPY ./sentry.client.config.ts ./sentry.client.config.ts
COPY ./sentry.edge.config.ts ./sentry.edge.config.ts
COPY ./sentry.server.config.ts ./sentry.server.config.ts

RUN pnpm build

# ---- BUILD WORKER ----
FROM builder_base AS worker_builder

WORKDIR /worker

ARG TARGETARCH
ENV TARGETARCH=${TARGETARCH}
ARG DOCKER_COMPOSE_VERSION="v2.27.0"

RUN echo "Building for ${TARGETARCH}"


RUN if [ "${TARGETARCH}" = "arm64" ]; then \
  curl -L -o docker-binary "https://github.com/docker/compose/releases/download/$DOCKER_COMPOSE_VERSION/docker-compose-linux-aarch64"; \
  elif [ "${TARGETARCH}" = "amd64" ]; then \
  curl -L -o docker-binary "https://github.com/docker/compose/releases/download/$DOCKER_COMPOSE_VERSION/docker-compose-linux-x86_64"; \
  else \
  echo "Unsupported architecture"; \
  fi

RUN chmod +x docker-binary

COPY ./pnpm-lock.yaml ./
RUN pnpm fetch --ignore-scripts

COPY ./pnpm-workspace.yaml ./
COPY ./packages/worker/package.json ./packages/worker/package.json
COPY ./packages/shared/package.json ./packages/shared/package.json

RUN pnpm install -r --prefer-offline

COPY ./packages ./packages
COPY ./packages/worker/build.js ./packages/worker/build.js
COPY ./packages/worker/src ./packages/worker/src
COPY ./packages/worker/package.json ./packages/worker/package.json
COPY ./packages/worker/assets ./packages/worker/assets

# Print TIPI_VERSION to the console
RUN echo "TIPI_VERSION: ${TIPI_VERSION}"

RUN pnpm -r --filter @runtipi/worker build

# ---- RUNNER ----
FROM runner_base AS app

ENV NODE_ENV=production

WORKDIR /worker

COPY --from=worker_builder /worker/packages/worker/dist .
COPY --from=worker_builder /worker/packages/worker/assets ./assets
COPY --from=worker_builder /worker/docker-binary /usr/local/bin/docker-compose

WORKDIR /dashboard

COPY --from=dashboard_builder /dashboard/next.config.mjs ./
COPY --from=dashboard_builder /dashboard/public ./public
COPY --from=dashboard_builder /dashboard/package.json ./package.json
COPY --from=dashboard_builder /dashboard/.next/standalone ./
COPY --from=dashboard_builder /dashboard/.next/static ./.next/static

WORKDIR /
COPY ./start.prod.sh ./start.sh

EXPOSE 3000 5000 5001

CMD ["sh", "start.sh"]
