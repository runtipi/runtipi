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

RUN npm install pnpm@9.12.2 -g
RUN apk add --no-cache curl python3 make g++ git

WORKDIR /deps

COPY ./pnpm-lock.yaml ./
COPY ./patches ./patches
RUN pnpm fetch

# ---- RUNNER BASE ----
FROM node_base AS runner_base

RUN apk add --no-cache curl openssl git rabbitmq-server supervisor

# ---- BUILDER ----
FROM builder_base AS builder

ARG TARGETARCH
ARG DOCKER_COMPOSE_VERSION="v2.32.1"
ENV TARGETARCH=${TARGETARCH}

WORKDIR /app

RUN echo "Building for ${TARGETARCH}"

RUN if [ "${TARGETARCH}" = "arm64" ]; then \
  curl -L -o docker-binary "https://github.com/docker/compose/releases/download/$DOCKER_COMPOSE_VERSION/docker-compose-linux-aarch64"; \
  elif [ "${TARGETARCH}" = "amd64" ]; then \
  curl -L -o docker-binary "https://github.com/docker/compose/releases/download/$DOCKER_COMPOSE_VERSION/docker-compose-linux-x86_64"; \
  fi

RUN chmod +x docker-binary

COPY ./pnpm-workspace.yaml ./
COPY ./pnpm-lock.yaml ./
COPY ./package.json ./
COPY ./packages/backend/package.json ./packages/backend/package.json
COPY ./packages/frontend/package.json ./packages/frontend/package.json
COPY ./packages/frontend/scripts ./packages/frontend/scripts
COPY ./packages/frontend/public ./packages/frontend/public
COPY ./patches ./patches

RUN pnpm install -r --prefer-offline

COPY ./turbo.json ./turbo.json
COPY ./packages ./packages

RUN echo "TIPI_VERSION: ${SENTRY_RELEASE}"
RUN echo "LOCAL: ${LOCAL}"

RUN npm run bundle

RUN if [ "${LOCAL}" != "true" ]; then \
  pnpm -r sentry:sourcemaps; \
  fi

# ---- RUNNER ----
FROM runner_base AS runner

ENV NODE_ENV="production"

WORKDIR /app

RUN npm install argon2

COPY --from=builder /app/package.json ./
COPY --from=builder /app/packages/backend/dist ./
COPY --from=builder /app/docker-binary /usr/local/bin/docker-compose

# Swagger UI
COPY --from=builder /app/packages/backend/node_modules/swagger-ui-dist/swagger-ui.css ./swagger-ui.css
COPY --from=builder /app/packages/backend/node_modules/swagger-ui-dist/swagger-ui-bundle.js ./swagger-ui-bundle.js
COPY --from=builder /app/packages/backend/node_modules/swagger-ui-dist/swagger-ui-standalone-preset.js ./swagger-ui-standalone-preset.js

# Assets
COPY --from=builder /app/packages/backend/assets ./assets
COPY --from=builder /app/packages/backend/src/core/database/drizzle ./assets/migrations
COPY --from=builder /app/packages/backend/src/modules/i18n/translations ./assets/translations
COPY --from=builder /app/packages/frontend/dist ./assets/frontend

COPY ./supervisord.prod.conf /etc/supervisord.conf

EXPOSE 3000 5001

CMD ["supervisord", "-c", "/etc/supervisord.conf"]
