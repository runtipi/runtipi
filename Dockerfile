FROM node:18-alpine3.16 AS build

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


FROM node:18-alpine3.16 as app

WORKDIR /

# Install dependencies
RUN npm install node-gyp -g

WORKDIR /api
COPY ./packages/system-api/package*.json /api/
RUN npm install --production

WORKDIR /dashboard
COPY ./packages/dashboard/package*.json /dashboard/
RUN npm install --production

COPY --from=build /api/dist /api/dist
COPY --from=build /dashboard/.next /dashboard/.next

WORKDIR /