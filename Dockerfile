ARG NODE_VERSION="18.12.1"
ARG ALPINE_VERSION="3.16"

FROM node:${NODE_VERSION}-buster-slim AS builder

RUN apt update
RUN apt install -y openssl

RUN npm install node-gyp -g

WORKDIR /dashboard
COPY ./packages/dashboard/package.json /dashboard/package.json
COPY ./packages/dashboard/prisma/schema.prisma /dashboard/prisma/
RUN npm i

COPY ./packages/dashboard /dashboard
RUN npm run build

FROM node:${NODE_VERSION}-buster-slim as app

RUN apt update
RUN apt install -y openssl

WORKDIR /dashboard
COPY --from=builder /dashboard/next.config.mjs ./
COPY --from=builder /dashboard/migrations ./migrations
COPY --from=builder /dashboard/public ./public
COPY --from=builder /dashboard/package.json ./package.json
COPY --from=builder --chown=node:node /dashboard/.next/standalone ./
COPY --from=builder --chown=node:node /dashboard/.next/static ./.next/static

CMD ["npm", "run", "start"]
