FROM node:18 AS build

RUN npm install node-gyp -g

WORKDIR /common
COPY ./packages/common /common
RUN npm i
RUN npm run build

WORKDIR /api
COPY ./packages/system-api/package.json /api/package.json
RUN npm i
COPY ./packages/system-api /api
RUN npm run build

WORKDIR /dashboard
COPY ./packages/dashboard/package.json /dashboard/package.json
RUN npm i
COPY ./packages/dashboard /dashboard
RUN npm run build


FROM ubuntu:20.04
ARG DEBIAN_FRONTEND=noninteractive

WORKDIR /

# Install docker
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

RUN apt-get install -y \
    g++ gcc make python

RUN curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

RUN echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

RUN apt-get update
RUN apt-get install -y docker-ce docker-ce-cli containerd.io

# Install node
RUN curl -sL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs
RUN npm install node-gyp -g

# Install docker-compose
RUN curl -L "https://github.com/docker/compose/releases/download/v2.5.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
RUN chmod +x /usr/local/bin/docker-compose

COPY --from=build /common /common

WORKDIR /api
COPY ./packages/system-api/package.json /api/package.json
RUN npm install --omit=dev

WORKDIR /dashboard
COPY ./packages/dashboard/package.json /dashboard/package.json
RUN npm install --omit=dev

COPY --from=build /api /api
COPY --from=build /dashboard /dashboard

WORKDIR /
