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
    echo "  sudo ./scripts/stop"
    exit 1
fi

ROOT_FOLDER="$($readlink -f $(dirname "${BASH_SOURCE[0]}")/..)"
STATE_FOLDER="${ROOT_FOLDER}/state"

cd "$ROOT_FOLDER"

ansible-playbook ansible/stop.yml -i ansible/hosts -e username="$USER"

export DOCKER_CLIENT_TIMEOUT=240
export COMPOSE_HTTP_TIMEOUT=240

function get_json_field() {
    local json_file="$1"
    local field="$2"

    echo $(jq -r ".${field}" "${json_file}")
}

str=$(get_json_field ${STATE_FOLDER}/apps.json installed)
apps_to_start=($str)

# If apps_to_start is not empty, then we're stopping all apps
if [[ ${#apps_to_start[@]} -gt 0 ]]; then
    for app in "${apps_to_start[@]}"; do
        "${ROOT_FOLDER}/scripts/app.sh" stop $app
    done
fi

echo "Stopping Docker services..."
echo
docker-compose down --remove-orphans --rmi local