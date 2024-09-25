ARG NODE_VERSION="iron"
ARG ALPINE_VERSION="3.20"

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS node_base

# ---- BUILDER BASE ----
FROM node_base AS builder_base

ARG SENTRY_AUTH_TOKEN
ARG TIPI_VERSION
ARG LOCAL

ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}
ENV SENTRY_RELEASE=${TIPI_VERSION}
ENV LOCAL=${LOCAL}

RUN npm install pnpm@9.4.0 -g
RUN apk add --no-cache curl python3 make g++ git

WORKDIR /deps

COPY ./pnpm-lock.yaml ./
RUN pnpm fetch

# ---- RUNNER BASE ----
FROM node_base AS runner_base

RUN apk add --no-cache curl openssl git
RUN npm install pm2 -g

# ---- BUILD DASHBOARD ----
FROM builder_base AS dashboard_builder

WORKDIR /dashboard

COPY ./pnpm-workspace.yaml ./
COPY ./scripts ./scripts
COPY ./public ./public

COPY ./package.json ./
COPY ./packages/worker/package.json ./packages/worker/package.json
COPY ./packages/shared/package.json ./packages/shared/package.json
COPY ./packages/db/package.json ./packages/db/package.json
COPY ./packages/cache/package.json ./packages/cache/package.json

RUN pnpm install -r --prefer-offline 

COPY ./packages ./packages

COPY ./src ./src
COPY ./tsconfig.json ./tsconfig.json
COPY ./next.config.mjs ./next.config.mjs
COPY ./tests ./tests

# Sentry
COPY ./sentry.client.config.ts ./sentry.client.config.ts

RUN pnpm build

# ---- BUILD WORKER ----
FROM builder_base AS worker_builder

WORKDIR /worker

ARG TARGETARCH
ENV TARGETARCH=${TARGETARCH}
ARG DOCKER_COMPOSE_VERSION="v2.29.7"

RUN echo "Building for ${TARGETARCH}"

RUN if [ "${TARGETARCH}" = "arm64" ]; then \
  curl -L -o docker-binary "https://github.com/docker/compose/releases/download/$DOCKER_COMPOSE_VERSION/docker-compose-linux-aarch64"; \
  elif [ "${TARGETARCH}" = "amd64" ]; then \
  curl -L -o docker-binary "https://github.com/docker/compose/releases/download/$DOCKER_COMPOSE_VERSION/docker-compose-linux-x86_64"; \
  else \
  echo "Unsupported architecture"; \
  fi

RUN chmod +x docker-binary

COPY ./pnpm-workspace.yaml ./
COPY ./packages/worker/package.json ./packages/worker/package.json
COPY ./packages/shared/package.json ./packages/shared/package.json
COPY ./packages/db/package.json ./packages/db/package.json
COPY ./packages/cache/package.json ./packages/cache/package.json
COPY ./packages/shared/package.json ./packages/shared/package.json

RUN pnpm install -r --prefer-offline

COPY ./packages ./packages

# Print TIPI_VERSION to the console
RUN echo "TIPI_VERSION: ${SENTRY_RELEASE}"

RUN pnpm -r --filter @runtipi/worker build

# ---- RUNNER ----
FROM runner_base AS app

ENV NODE_ENV=production

WORKDIR /worker

COPY --from=worker_builder /worker/packages/worker/dist .
COPY --from=worker_builder /worker/packages/worker/assets ./assets
COPY --from=worker_builder /worker/packages/db/assets/migrations ./assets/migrations
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
