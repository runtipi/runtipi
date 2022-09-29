#!/usr/bin/env bash
# Required Notice: Copyright
# Umbrel (https://umbrel.com)

echo "Starting app script"

source "${BASH_SOURCE%/*}/common.sh"

set -euo pipefail

ensure_pwd

ROOT_FOLDER="${PWD}"
STATE_FOLDER="${ROOT_FOLDER}/state"
ENV_FILE="${ROOT_FOLDER}/.env"

# Root folder in host system
ROOT_FOLDER_HOST=$(grep -v '^#' "${ENV_FILE}" | xargs -n 1 | grep ROOT_FOLDER_HOST | cut -d '=' -f2)
REPO_ID=$(grep -v '^#' "${ENV_FILE}" | xargs -n 1 | grep APPS_REPO_ID | cut -d '=' -f2)
STORAGE_PATH=$(grep -v '^#' "${ENV_FILE}" | xargs -n 1 | grep STORAGE_PATH | cut -d '=' -f2)

# Override vars with values from settings.json
if [[ -f "${STATE_FOLDER}/settings.json" ]]; then
  # If storagePath is set in settings.json, use it
  if [[ "$(get_json_field "${STATE_FOLDER}/settings.json" storagePath)" != "null" ]]; then
    STORAGE_PATH="$(get_json_field "${STATE_FOLDER}/settings.json" storagePath)"
  fi
fi

write_log "Running app script: ROOT_FOLDER=${ROOT_FOLDER}, ROOT_FOLDER_HOST=${ROOT_FOLDER_HOST}, REPO_ID=${REPO_ID}, STORAGE_PATH=${STORAGE_PATH}"

if [ -z ${1+x} ]; then
  command=""
else
  command="$1"
fi

if [ -z ${2+x} ]; then
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

  app_data_dir="/app/storage/app-data/${app}"

  if [[ -z "${app}" ]] || [[ ! -d "${app_dir}" ]]; then
    echo "Error: \"${app}\" is not a valid app"
    exit 1
  fi
fi

if [ -z ${3+x} ]; then
  args=""
else
  args="${*:3}"
fi

compose() {
  local app="${1}"
  shift

  arch=$(uname -m)
  local architecture="${arch}"

  if [[ "$architecture" == "aarch64" ]]; then
    architecture="arm64"
  fi

  # App data folder
  local app_compose_file="${app_dir}/docker-compose.yml"

  # Pick arm architecture if running on arm and if the app has a docker-compose.arm.yml file
  if [[ "$architecture" == "arm"* ]] && [[ -f "${app_dir}/docker-compose.arm.yml" ]]; then
    app_compose_file="${app_dir}/docker-compose.arm.yml"
  fi

  # Pick arm architecture if running on arm and if the app has a docker-compose.arm64.yml file
  if [[ "$architecture" == "arm64" ]] && [[ -f "${app_dir}/docker-compose.arm64.yml" ]]; then
    app_compose_file="${app_dir}/docker-compose.arm64.yml"
  fi

  local common_compose_file="${ROOT_FOLDER}/repos/${REPO_ID}/apps/docker-compose.common.yml"

  # Vars to use in compose file
  export APP_DATA_DIR="${STORAGE_PATH}/app-data/${app}"
  export ROOT_FOLDER_HOST="${ROOT_FOLDER_HOST}"

  write_log "Running docker compose -f ${app_compose_file} -f ${common_compose_file} ${*}"
  write_log "APP_DATA_DIR=${APP_DATA_DIR}"
  write_log "ROOT_FOLDER_HOST=${ROOT_FOLDER_HOST}"

  docker compose \
    --env-file "${app_data_dir}/app.env" \
    --project-name "${app}" \
    --file "${app_compose_file}" \
    --file "${common_compose_file}" \
    "${@}"
}

# Install new app
if [[ "$command" = "install" ]]; then
  # Write to file script.log
  write_log "Installing app ${app}..."

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
  compose "${app}" "${args}"
  exit
fi

exit 1
