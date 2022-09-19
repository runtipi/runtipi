#!/usr/bin/env bash
# Required Notice: Copyright
# Umbrel (https://umbrel.com)

set -euo pipefail

# use greadlink instead of readlink on osx
if [[ "$(uname)" == "Darwin" ]]; then
  rdlk=greadlink
else
  rdlk=readlink
fi

ROOT_FOLDER="$($rdlk -f $(dirname "${BASH_SOURCE[0]}")/..)"
REPO_ID="$(echo -n "https://github.com/meienberger/runtipi-appstore" | sha256sum | awk '{print $1}')"
STATE_FOLDER="${ROOT_FOLDER}/state"

show_help() {
  cat <<EOF
app 0.0.1

CLI for managing Tipi apps

Usage: app <command> <app> [<arguments>]

Commands:
    install                    Pulls down images for an app and starts it
    uninstall                  Removes images and destroys all data for an app
    stop                       Stops an installed app
    start                      Starts an installed app
    compose                    Passes all arguments to Docker Compose
    ls-installed               Lists installed apps
EOF
}

# Get field from json file
function get_json_field() {
  local json_file="$1"
  local field="$2"

  echo $(jq -r ".${field}" "${json_file}")
}

list_installed_apps() {
  str=$(get_json_field ${STATE_FOLDER}/apps.json installed)
  echo $str
}

if [ -z ${1+x} ]; then
  command=""
else
  command="$1"
fi

# Lists installed apps
if [[ "$command" = "ls-installed" ]]; then
  list_installed_apps

  exit
fi

if [ -z ${2+x} ]; then
  show_help
  exit 1
else

  app="$2"
  root_folder_host="${3:-$ROOT_FOLDER}"
  repo_id="${4:-$REPO_ID}"

  if [[ -z "${repo_id}" ]]; then
    echo "Error: Repo id not provided"
    exit 1
  fi

  if [[ -z "${root_folder_host}" ]]; then
    echo "Error: Root folder not provided"
    exit 1
  fi

  app_dir="${ROOT_FOLDER}/apps/${app}"

  if [[ ! -d "${app_dir}" ]]; then
    # copy from repo
    echo "Copying app from repo"
    mkdir -p "${app_dir}"
    cp -r "${ROOT_FOLDER}/repos/${repo_id}/apps/${app}"/* "${app_dir}"
  fi

  app_data_dir="${ROOT_FOLDER}/app-data/${app}"

  if [[ -z "${app}" ]] || [[ ! -d "${app_dir}" ]]; then
    echo "Error: \"${app}\" is not a valid app"
    exit 1
  fi

fi

if [ -z ${3+x} ]; then
  args=""
else
  args="${@:3}"
fi

compose() {
  local app="${1}"
  shift

  local architecture="$(uname -m)"

  if [[ "$architecture" == "aarch64" ]]; then
    architecture="arm64"
  fi

  # App data folder
  local env_file="${ROOT_FOLDER}/.env"
  local app_compose_file="${app_dir}/docker-compose.yml"

  # Pick arm architecture if running on arm and if the app has a docker-compose.arm.yml file
  if [[ "$architecture" == "arm"* ]] && [[ -f "${app_dir}/docker-compose.arm.yml" ]]; then
    app_compose_file="${app_dir}/docker-compose.arm.yml"
  fi

  local common_compose_file="${ROOT_FOLDER}/repos/${repo_id}/apps/docker-compose.common.yml"

  # Vars to use in compose file
  export APP_DATA_DIR="${root_folder_host}/app-data/${app}"
  export APP_DIR="${app_dir}"
  export ROOT_FOLDER_HOST="${root_folder_host}"
  export ROOT_FOLDER="${ROOT_FOLDER}"

  # Docker Compose does not support multiple env files
  # --env-file "${env_file}" \

  docker compose \
    --env-file "${ROOT_FOLDER}/app-data/${app}/app.env" \
    --project-name "${app}" \
    --file "${app_compose_file}" \
    --file "${common_compose_file}" \
    "${@}"
}

# Install new app
if [[ "$command" = "install" ]]; then
  compose "${app}" pull

  # Copy default data dir to app data dir if it exists
  if [[ -d "${app_dir}/data" ]]; then
    cp -r "${app_dir}/data" "${app_data_dir}/data"
  fi

  # Remove all .gitkeep files from app data dir
  find "${app_data_dir}" -name ".gitkeep" -exec rm -f {} \;

  chown -R "1000:1000" "${app_data_dir}"

  compose "${app}" up -d
  exit
fi

# Removes images and destroys all data for an app
if [[ "$command" = "uninstall" ]]; then
  echo "Removing images for app ${app}..."

  compose "${app}" up --detach
  compose "${app}" down --rmi all --remove-orphans

  echo "Deleting app data for app ${app}..."
  if [[ -d "${app_data_dir}" ]]; then
    rm -rf "${app_data_dir}"
  fi

  if [[ -d "${app_dir}" ]]; then
    rm -rf "${app_dir}"
  fi

  echo "Successfully uninstalled app ${app}"
  exit
fi

# Update an app
if [[ "$command" = "update" ]]; then
  compose "${app}" up --detach
  compose "${app}" down --rmi all --remove-orphans

  # Remove app
  if [[ -d "${app_dir}" ]]; then
    rm -rf "${app_dir}"
  fi

  # Copy app from repo
  cp -r "${ROOT_FOLDER}/repos/${repo_id}/apps/${app}" "${app_dir}"

  compose "${app}" pull
  exit
fi

# Stops an installed app
if [[ "$command" = "stop" ]]; then
  echo "Stopping app ${app}..."
  compose "${app}" rm --force --stop
  exit
fi

# Starts an installed app
if [[ "$command" = "start" ]]; then
  echo "Starting app ${app}..."
  compose "${app}" up --detach
  exit
fi

# Passes all arguments to Docker Compose
if [[ "$command" = "compose" ]]; then
  compose "${app}" ${args}
  exit
fi

# If we get here it means no valid command was supplied
# Show help and exit
show_help
exit 1
