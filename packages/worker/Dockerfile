ARG NODE_VERSION="20.10"
ARG ALPINE_VERSION="3.18"

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS node_base

# ---- BUILDER BASE ----
FROM node_base AS builder_base

RUN npm install pnpm -g
RUN apk add curl

# ---- RUNNER BASE ----
FROM node_base AS runner_base

RUN apk add curl openssl git && rm -rf /var/cache/apk/*

ARG NODE_ENV="production"

# ---- BUILDER ----
FROM builder_base AS builder

WORKDIR /app

ARG TARGETARCH
ENV TARGETARCH=${TARGETARCH}

RUN echo "Building for ${TARGETARCH}"

RUN if [ "${TARGETARCH}" = "arm64" ]; then \
  curl -L -o docker-binary "https://github.com/docker/compose/releases/download/v2.23.1/docker-compose-linux-aarch64"; \
  elif [ "${TARGETARCH}" = "amd64" ]; then \
  curl -L -o docker-binary "https://github.com/docker/compose/releases/download/v2.23.1/docker-compose-linux-x86_64"; \
  else \
  echo "Unsupported architecture"; \
  fi

RUN chmod +x docker-binary

COPY ./pnpm-lock.yaml ./
RUN pnpm fetch --ignore-scripts

COPY ./pnpm-workspace.yaml ./
COPY ./packages ./packages

RUN pnpm install -r --prefer-offline

COPY ./packages/worker/build.js ./packages/worker/build.js
COPY ./packages/worker/src ./packages/worker/src
COPY ./packages/worker/package.json ./packages/worker/package.json
COPY ./packages/worker/assets ./packages/worker/assets

ARG SENTRY_AUTH_TOKEN
ARG SENTRY_DISABLE_AUTO_UPLOAD
ARG TIPI_VERSION

ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}
ENV SENTRY_DISABLE_AUTO_UPLOAD=${SENTRY_DISABLE_AUTO_UPLOAD}
ENV TIPI_VERSION=${TIPI_VERSION}

RUN pnpm -r build --filter @runtipi/worker

# ---- RUNNER ----
FROM runner_base AS app

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/packages/worker/dist .
COPY --from=builder /app/packages/worker/assets ./assets
COPY --from=builder /app/docker-binary /usr/local/bin/docker-compose

CMD ["node", "index.js", "start"]

