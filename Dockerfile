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

RUN apt-get update 
# Install docker
RUN apt-get install -y ca-certificates curl gnupg lsb-release jq
RUN mkdir -p /etc/apt/keyrings
RUN curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
RUN echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list >/dev/null
RUN apt-get update
RUN apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Install node
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
RUN apt-get install -y nodejs

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