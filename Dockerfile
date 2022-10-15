FROM node:18 AS builder

RUN npm install node-gyp -g

WORKDIR /api
COPY ./packages/system-api/package.json /api/package.json
RUN npm i
# ---
WORKDIR /dashboard
COPY ./packages/dashboard/package.json /dashboard/package.json
RUN npm i

WORKDIR /api
COPY ./packages/system-api /api
RUN npm run build
# ---
WORKDIR /dashboard
COPY ./packages/dashboard /dashboard
RUN npm run build


FROM alpine:3.16.0 as app

WORKDIR /

# # Install dependencies
RUN apk --no-cache add nodejs npm
RUN apk --no-cache add g++
RUN apk --no-cache add make
RUN apk --no-cache add python3

RUN npm install node-gyp -g

WORKDIR /api
COPY ./packages/system-api/package*.json /api/
RUN npm install --omit=dev

COPY --from=builder /api/dist /api/dist

WORKDIR /dashboard
COPY --from=builder /dashboard/next.config.js ./
COPY --from=builder /dashboard/public ./public
COPY --from=builder /dashboard/package.json ./package.json
COPY --from=builder --chown=node:node /dashboard/.next/standalone ./
COPY --from=builder --chown=node:node /dashboard/.next/static ./.next/static

WORKDIR /