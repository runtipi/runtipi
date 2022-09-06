FROM node:18
ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /

# Install dependencies
RUN apt update && apt install -y bash git g++ make
# Install docker-compose
RUN apt install -y docker-compose

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
