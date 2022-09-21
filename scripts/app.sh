#!/usr/bin/env bash
# Required Notice: Copyright
# Umbrel (https://umbrel.com)

set -euo pipefail

cd /runtipi || echo ""
# Ensure PWD ends with /runtipi
if [[ "${PWD##*/}" != "runtipi" ]]; then
  echo "Please run this script from the runtipi directory"
  exit 1
fi

# Root folder in container is /runtipi
ROOT_FOLDER="${PWD}"

ENV_FILE="${ROOT_FOLDER}/.env"

# Root folder in host system
ROOT_FOLDER_HOST=$(grep -v '^#' "${ENV_FILE}" | xargs -n 1 | grep ROOT_FOLDER_HOST | cut -d '=' -f2)
REPO_ID=$(grep -v '^#' "${ENV_FILE}" | xargs -n 1 | grep APPS_REPO_ID | cut -d '=' -f2)

# Get field from json file
function get_json_field() {
  local json_file="$1"
  local field="$2"

  jq -r ".${field}" "${json_file}"
}

if [ -z ${1+x} ]; then
  command=""
else
  command="$1"
fi

if [ -z ${2+x} ]; then
  show_help
  exit 1
else
  app="$2"

  app_dir="${ROOT_FOLDER}/apps/${app}"

  if [[ ! -d "${app_dir}" ]]; then
    # copy from repo
    echo "Copying app from repo"
    mkdir -p "${app_dir}"
    cp -r "${ROOT_FOLDER}/repos/${REPO_ID}/apps/${app}"/* "${app_dir}"
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
  local app_compose_file="${app_dir}/docker-compose.yml"

  # Pick arm architecture if running on arm and if the app has a docker-compose.arm.yml file
  if [[ "$architecture" == "arm"* ]] && [[ -f "${app_dir}/docker-compose.arm.yml" ]]; then
    app_compose_file="${app_dir}/docker-compose.arm.yml"
  fi

  local common_compose_file="${ROOT_FOLDER}/repos/${REPO_ID}/apps/docker-compose.common.yml"

  # Vars to use in compose file
  export APP_DATA_DIR="${ROOT_FOLDER_HOST}/app-data/${app}"
  export ROOT_FOLDER_HOST="${ROOT_FOLDER_HOST}"

  docker compose \
    --env-file "${app_data_dir}/app.env" \
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
  cp -r "${ROOT_FOLDER}/repos/${REPO_ID}/apps/${app}" "${app_dir}"

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

exit 1
