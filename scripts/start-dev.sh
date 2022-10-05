#!/usr/bin/env bash
source "${BASH_SOURCE%/*}/common.sh"

ROOT_FOLDER="${PWD}"

kill_watcher
"${ROOT_FOLDER}/scripts/watcher.sh" &

docker compose -f docker-compose.dev.yml --env-file "${ROOT_FOLDER}/.env.dev" up --build
