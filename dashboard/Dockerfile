FROM node:latest

WORKDIR /app

COPY ./package.json ./
COPY ./yarn.lock ./

RUN yarn

COPY ./ ./

ARG INTERNAL_IP_ARG
ENV INTERNAL_IP $INTERNAL_IP_ARG

RUN yarn build

CMD ["yarn", "start"]