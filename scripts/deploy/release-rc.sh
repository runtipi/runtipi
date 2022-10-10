#!/usr/bin/env bash

docker buildx build --platform linux/amd64,linux/arm64,linux/arm/v7 -t meienberger/runtipi:rc-"$(npm run version --silent)" . --push
