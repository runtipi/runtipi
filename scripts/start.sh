#!/usr/bin/env bash

# use greadlink instead of readlink on osx
if [[ "$(uname)" == "Darwin" ]]; then
  readlink=greadlink
else
  readlink=readlink
fi

ROOT_FOLDER="$($readlink -f $(dirname "${BASH_SOURCE[0]}")/..)"
STATE_FOLDER="${ROOT_FOLDER}/state"
DOMAIN=local

if [[ $UID != 0 ]]; then
    echo "Tipi must be started as root"
    echo "Please re-run this script as"
    echo "  sudo ./scripts/start"
    exit 1
fi

# Configure Umbrel if it isn't already configured
if [[ ! -f "${STATE_FOLDER}/configured" ]]; then
  "${ROOT_FOLDER}/scripts/configure.sh"
fi

ansible-playbook ansible/start.yml -i ansible/hosts -K

export DOCKER_CLIENT_TIMEOUT=240
export COMPOSE_HTTP_TIMEOUT=240

# Run docker-compose
docker-compose up --detach --remove-orphans --build || {
  echo "Failed to start containers"
  exit 1
}

# Get field from json file
# function get_json_field() {
#     local json_file="$1"
#     local field="$2"

#     echo $(jq -r ".${field}" "${json_file}")
# }

# str=$(get_json_field ${STATE_FOLDER}/apps.json installed)
# apps_to_start=($str)

# for app in "${apps_to_start[@]}"; do
#     "${ROOT_FOLDER}/scripts/app.sh" start $app
# done

