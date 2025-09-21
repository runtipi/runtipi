ARG BUN_VERSION="1.2"

FROM oven/bun:${BUN_VERSION}-alpine AS node_base

# ---- BUILDER BASE ----
FROM node_base AS builder_base

WORKDIR /deps

ARG TARGETARCH
ARG DOCKER_COMPOSE_VERSION="v2.39.2"
ENV TARGETARCH=${TARGETARCH}

RUN apk add --no-cache curl python3 make g++ git

RUN echo "Building for ${TARGETARCH}"
RUN if [ "${TARGETARCH}" = "arm64" ]; then \
      curl -L -o docker-binary "https://github.com/docker/compose/releases/download/$DOCKER_COMPOSE_VERSION/docker-compose-linux-aarch64"; \
      elif [ "${TARGETARCH}" = "amd64" ]; then \
      curl -L -o docker-binary "https://github.com/docker/compose/releases/download/$DOCKER_COMPOSE_VERSION/docker-compose-linux-x86_64"; \
      fi

RUN chmod +x docker-binary

# ---- RUNNER BASE ----
FROM node_base AS runner_base

RUN apk add --no-cache curl openssl git

# ---- BUILDER ----
FROM builder_base AS builder

ARG TIPI_VERSION
ARG LOCAL

ENV SENTRY_RELEASE=${TIPI_VERSION}

WORKDIR /app

COPY ./bun.lock ./
COPY ./package.json ./
COPY ./scripts/ ./scripts
COPY ./packages/backend/package.json ./packages/backend/package.json
COPY ./packages/frontend/package.json ./packages/frontend/package.json
COPY ./packages/common/package.json ./packages/common/package.json
COPY ./packages/frontend/scripts ./packages/frontend/scripts
COPY ./packages/frontend/public ./packages/frontend/public

RUN bun install --frozen-lockfile

COPY ./turbo.json ./turbo.json
COPY ./packages ./packages
RUN bun run build

RUN echo "TIPI_VERSION: ${SENTRY_RELEASE}"
RUN echo "LOCAL: ${LOCAL}"

RUN bun run bundle
RUN --mount=type=secret,id=sentry_token,env=SENTRY_AUTH_TOKEN if [ "${LOCAL}" != "true" ]; then \
  cd ./packages/backend && \
  bun run sentry:sourcemaps; \
  fi

RUN find ./packages/backend/dist -name "*.js.map" -type f -delete
RUN find ./packages/frontend/dist -name "*.js.map" -type f -delete

# ---- RUNNER ----
FROM runner_base AS runner

ENV NODE_ENV="production"

WORKDIR /app

COPY --from=builder_base /deps/docker-binary /usr/local/bin/docker-compose
COPY --from=builder /app/package.json ./
COPY --from=builder /app/packages/backend/dist ./

# Assets
COPY --from=builder /app/packages/backend/assets ./assets
COPY --from=builder /app/packages/backend/src/core/database/drizzle ./assets/migrations
COPY --from=builder /app/packages/backend/src/modules/i18n/translations ./assets/translations
COPY --from=builder /app/packages/frontend/dist/client ./assets/frontend

EXPOSE 3000

CMD ["bun", "./main.js"]
