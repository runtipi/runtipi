FROM alpine:3.16.0 as app

WORKDIR /

# Install dependencies
RUN apk --no-cache add docker-compose nodejs npm bash g++ make git
RUN npm install node-gyp -g

WORKDIR /api
COPY ./packages/system-api/package*.json /api/
RUN npm install --omit=dev

WORKDIR /dashboard
COPY ./packages/dashboard/package*.json /dashboard/
RUN npm install --omit=dev

WORKDIR /api
COPY ./packages/system-api /api
RUN npm i -g @swc/cli @swc/core && npm run build && npm uninstall -g @swc/cli @swc/core
# ---
WORKDIR /dashboard
COPY ./packages/dashboard /dashboard
RUN npm i typescript @types/node && npm run build && npm uninstall typescript @types/node

WORKDIR /
