FROM node:18 AS build

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


FROM alpine:latest as app

WORKDIR /

# Install docker
RUN apk --no-cache --virtual build-dependencies add docker docker-compose curl nodejs npm bash

RUN npm install node-gyp -g

WORKDIR /api
COPY ./packages/system-api/package*.json /api/
RUN npm install --production

WORKDIR /dashboard
COPY ./packages/dashboard/package*.json /dashboard/
RUN npm install --production

COPY --from=build /api/dist /api/dist
COPY ./packages/system-api /api

COPY --from=build /dashboard/.next /dashboard/.next
COPY ./packages/dashboard /dashboard

WORKDIR /
