ARG NODE_VERSION="20.10"
ARG ALPINE_VERSION="3.18"

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS node_base

FROM node_base AS builder_base

RUN npm install pnpm -g

# BUILDER
FROM builder_base AS builder

WORKDIR /app

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

ARG SENTRY_AUTH_TOKEN
ARG SENTRY_DISABLE_AUTO_UPLOAD

ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}
ENV SENTRY_DISABLE_AUTO_UPLOAD=${SENTRY_DISABLE_AUTO_UPLOAD}

RUN pnpm build

# APP
FROM node_base AS app

ENV NODE_ENV production

USER node

WORKDIR /app

COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

EXPOSE 3000

CMD ["npm", "run", "start"]
