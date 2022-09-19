#!/usr/bin/env bash
set -euo pipefail

# use greadlink instead of readlink on osx
if [[ "$(uname)" == "Darwin" ]]; then
  readlink=greadlink
else
  readlink=readlink
fi

if [[ $UID != 0 ]]; then
  echo "Tipi must be stopped as root"
  echo "Please re-run this script as"
  echo "  sudo ./scripts/stop.sh"
  exit 1
fi

ROOT_FOLDER="$($readlink -f $(dirname "${BASH_SOURCE[0]}")/..)"
STATE_FOLDER="${ROOT_FOLDER}/state"

cd "$ROOT_FOLDER"

export DOCKER_CLIENT_TIMEOUT=240
export COMPOSE_HTTP_TIMEOUT=240

# Stop all installed apps if there are any
apps_folder="${ROOT_FOLDER}/apps"
if [ "$(find ${apps_folder} -maxdepth 1 -type d | wc -l)" -gt 1 ]; then
  apps_names=($(ls -d ${apps_folder}/*/ | xargs -n 1 basename | sed 's/\///g'))

  for app_name in "${apps_names[@]}"; do
    # if folder ${ROOT_FOLDER}/app-data/app_name exists, then stop app
    if [[ -d "${ROOT_FOLDER}/app-data/${app_name}" ]]; then
      echo "Stopping ${app_name}"
      "${ROOT_FOLDER}/scripts/app.sh" stop $app_name
    fi
  done
else
  echo "No app installed that can be stopped."
fi

echo "Stopping Docker services..."
echo
docker compose down --remove-orphans --rmi local
