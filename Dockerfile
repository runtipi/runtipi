ARG NODE_VERSION="18.12.1"
ARG ALPINE_VERSION="3.16"

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS node_base

FROM node_base AS builder_base

RUN npm install pnpm -g

# BUILDER
FROM builder_base AS builder

WORKDIR /app

COPY ./pnpm-lock.yaml ./
RUN pnpm fetch --no-scripts

COPY ./package*.json ./
COPY ./prisma/schema.prisma ./prisma/

RUN pnpm install -r --prefer-offline 
COPY ./src ./src
COPY ./esbuild.js ./esbuild.js
COPY ./tsconfig.json ./tsconfig.json
COPY ./next.config.mjs ./next.config.mjs
COPY ./public ./public

RUN npm run build

# APP
FROM node_base AS app

# USER node

WORKDIR /app

COPY --from=builder /app/dist ./
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

EXPOSE 3000

CMD ["npm", "run", "start"]
