#!/usr/bin/env bash
set -o errexit
set -o nounset
set -o pipefail
if [[ "${TRACE-0}" == "1" ]]; then
    set -o xtrace
fi

export DEBIAN_FRONTEND=noninteractive

source "${BASH_SOURCE%/*}/common.sh"

clean_logs

### --------------------------------
### General variables
### --------------------------------
ROOT_FOLDER="${PWD}"
STATE_FOLDER="${ROOT_FOLDER}/state"
## Comes from first argument
DOCKER_TAG="${1}"
echo "Starting e2e tests with tag meienberger/runtipi:${DOCKER_TAG}"

### --------------------------------
### Pre-configuration
### --------------------------------
sudo "${ROOT_FOLDER}/scripts/configure.sh"
mkdir -p "${ROOT_FOLDER}/state"
STATE_FOLDER="${ROOT_FOLDER}/state"

if [[ ! -f "${STATE_FOLDER}/seed" ]]; then
  echo "Generating seed..."
  mkdir -p "${STATE_FOLDER}"
  touch "${STATE_FOLDER}/seed"

  if ! tr </dev/urandom -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1 >"${STATE_FOLDER}/seed"; then
    echo "Created seed file..."
  fi
fi

### --------------------------------
### Apps repository configuration
### --------------------------------
apps_repository="https://github.com/meienberger/runtipi-appstore"

env_variables_json=$(cat <<EOF
{
  "dns_ip": "9.9.9.9",
  "domain": "tipi.localhost",
  "root_folder": "${ROOT_FOLDER}",
  "nginx_port": 80,
  "nginx_port_ssl": 443,
  "jwt_secret": "secret",
  "postgres_password": "postgres",
  "postgres_username": "tipi",
  "postgres_dbname": "tipi",
  "postgres_port": 5432,
  "postgres_host": "tipi-db",
  "redis_host": "tipi-redis",
  "tipi_version": "$(get_json_field "${ROOT_FOLDER}/package.json" version)",
  "internal_ip": "localhost",
  "demo_mode": false,
  "apps_repository": "${apps_repository}",
  "storage_path": "${ROOT_FOLDER}",
  "repo_id": "$("${ROOT_FOLDER}"/scripts/git.sh get_hash ${apps_repository})",
  "docker_tag": "${DOCKER_TAG}"
}
EOF
)

### --------------------------------
### Watcher and system-info
### --------------------------------

echo "creating events file"
if [[ ! -f "${ROOT_FOLDER}/state/events" ]]; then
    touch "${ROOT_FOLDER}/state/events"
fi

echo "creating system-info file"
if [[ ! -f "${ROOT_FOLDER}/state/system-info.json" ]]; then
    echo "{}" >"${ROOT_FOLDER}/state/system-info.json"
fi

chmod -R a+rwx "${ROOT_FOLDER}/state/events"
chmod -R a+rwx "${ROOT_FOLDER}/state/system-info.json"
echo "kill previous watcher"
kill_watcher
echo "starting watcher"
nohup "${ROOT_FOLDER}/scripts/watcher.sh" > /dev/null 2>&1 &

### --------------------------------
### env file generation
### --------------------------------
echo "Generating env file..."
generate_env_file "${env_variables_json}"

### --------------------------------
### Start the project
### --------------------------------
echo "Starting docker-compose..."
docker compose -f docker-compose.e2e.yml up -d --build
