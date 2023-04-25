#!/usr/bin/env bash
set -o errexit
set -o nounset
set -o pipefail
if [[ "${TRACE-0}" == "1" ]]; then
    set -o xtrace
fi

source "${BASH_SOURCE%/*}/common.sh"

clean_logs

### --------------------------------
### General variables
### --------------------------------
ROOT_FOLDER="${PWD}"
STATE_FOLDER="${ROOT_FOLDER}/state"

### --------------------------------
### Apps repository configuration
### --------------------------------
apps_repository="https://github.com/meienberger/runtipi-appstore"

env_variables_json=$(cat <<EOF
{
  "dns_ip": "9.9.9.9",
  "domain": "tipi.localhost",
  "root_folder": "${ROOT_FOLDER}",
  "nginx_port": 3000,
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
  "repo_id": "$("${ROOT_FOLDER}"/scripts/git.sh get_hash ${apps_repository})"
}
EOF
)

### --------------------------------
### Watcher and system-info
### --------------------------------
mkdir -p "${ROOT_FOLDER}/state"

if [[ ! -f "${ROOT_FOLDER}/state/events" ]]; then
    touch "${ROOT_FOLDER}/state/events"
fi

if [[ ! -f "${ROOT_FOLDER}/state/system-info.json" ]]; then
    echo "{}" >"${ROOT_FOLDER}/state/system-info.json"
fi

chmod -R a+rwx "${ROOT_FOLDER}/state/events"
chmod -R a+rwx "${ROOT_FOLDER}/state/system-info.json"
kill_watcher
"${ROOT_FOLDER}/scripts/watcher.sh" &

### --------------------------------
### env file generation
### --------------------------------
generate_env_file "${env_variables_json}"

### --------------------------------
### Start the project
### --------------------------------
docker compose -f docker-compose.e2e.yml up -d --build
