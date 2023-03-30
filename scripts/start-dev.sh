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
SED_ROOT_FOLDER="$(echo "$ROOT_FOLDER" | sed 's/\//\\\//g')"
NGINX_PORT=3000
NGINX_PORT_SSL=443
DOMAIN=tipi.localhost
DNS_IP="9.9.9.9" # Default to Quad9 DNS
ARCHITECTURE="$(uname -m)"
TZ="UTC"
JWT_SECRET=secret
POSTGRES_PASSWORD=postgres
POSTGRES_USERNAME=tipi
POSTGRES_DBNAME=tipi
POSTGRES_PORT=5432
POSTGRES_HOST=tipi-db
REDIS_HOST=tipi-redis
TIPI_VERSION=$(get_json_field "${ROOT_FOLDER}/package.json" version)
INTERNAL_IP=localhost
DEMO_MODE=false
storage_path="${ROOT_FOLDER}"
STORAGE_PATH_ESCAPED="$(echo "${storage_path}" | sed 's/\//\\\//g')"
if [[ "$ARCHITECTURE" == "aarch64" ]]; then
    ARCHITECTURE="arm64"
elif [[ "$ARCHITECTURE" == "armv7l" ]]; then
    ARCHITECTURE="arm"
elif [[ "$ARCHITECTURE" == "x86_64" ]]; then
    ARCHITECTURE="amd64"
fi
# If none of the above conditions are met, the architecture is not supported
if [[ "$ARCHITECTURE" != "arm64" ]] && [[ "$ARCHITECTURE" != "arm" ]] && [[ "$ARCHITECTURE" != "amd64" ]]; then
    echo "Architecture not supported!"
    exit 1
fi

### --------------------------------
### Apps repository configuration
### --------------------------------
apps_repository="https://github.com/meienberger/runtipi-appstore"
APPS_REPOSITORY_ESCAPED="$(echo ${apps_repository} | sed 's/\//\\\//g')"
REPO_ID="$("${ROOT_FOLDER}"/scripts/git.sh get_hash ${apps_repository})"

# Override configs with settings.json
if [[ -f "${STATE_FOLDER}/settings.json" ]]; then
    if [[ "$(get_json_field "${STATE_FOLDER}/settings.json" appsRepoUrl)" != "null" ]]; then
        apps_repository=$(get_json_field "${STATE_FOLDER}/settings.json" appsRepoUrl)
        APPS_REPOSITORY_ESCAPED="$(echo "${apps_repository}" | sed 's/\//\\\//g')"
        REPO_ID="$("${ROOT_FOLDER}"/scripts/git.sh get_hash "${apps_repository}")"
    fi
fi

### --------------------------------
### Watcher and system-info
### --------------------------------
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
ENV_FILE=$(mktemp)
[[ -f "${ROOT_FOLDER}/.env" ]] && rm -f "${ROOT_FOLDER}/.env"
[[ -f "$ROOT_FOLDER/templates/env-sample" ]] && cp "$ROOT_FOLDER/templates/env-sample" "$ENV_FILE"

OS=$(uname)
sed_args=(-i)
# If os is macos, use gnu sed
if [[ "$OS" == "Darwin" ]]; then
    echo "Using gnu sed"
    sed_args=(-i '')
fi

if [[ -f "${STATE_FOLDER}/settings.json" ]]; then
  # If dnsIp is set in settings.json, use it
  if [[ "$(get_json_field "${STATE_FOLDER}/settings.json" dnsIp)" != "null" ]]; then
    DNS_IP=$(get_json_field "${STATE_FOLDER}/settings.json" dnsIp)
  fi

  # If domain is set in settings.json, use it
  if [[ "$(get_json_field "${STATE_FOLDER}/settings.json" domain)" != "null" ]]; then
    DOMAIN=$(get_json_field "${STATE_FOLDER}/settings.json" domain)
  fi

  # If appsRepoUrl is set in settings.json, use it
  if [[ "$(get_json_field "${STATE_FOLDER}/settings.json" appsRepoUrl)" != "null" ]]; then
    apps_repository=$(get_json_field "${STATE_FOLDER}/settings.json" appsRepoUrl)
    APPS_REPOSITORY_ESCAPED="$(echo "${apps_repository}" | sed 's/\//\\\//g')"
    REPO_ID="$("${ROOT_FOLDER}"/scripts/git.sh get_hash "${apps_repository}")"
  fi

  # If port is set in settings.json, use it
  if [[ "$(get_json_field "${STATE_FOLDER}/settings.json" port)" != "null" ]]; then
    NGINX_PORT=$(get_json_field "${STATE_FOLDER}/settings.json" port)
  fi

  # If sslPort is set in settings.json, use it
  if [[ "$(get_json_field "${STATE_FOLDER}/settings.json" sslPort)" != "null" ]]; then
    NGINX_PORT_SSL=$(get_json_field "${STATE_FOLDER}/settings.json" sslPort)
  fi

  # If listenIp is set in settings.json, use it
  if [[ "$(get_json_field "${STATE_FOLDER}/settings.json" listenIp)" != "null" ]]; then
    INTERNAL_IP=$(get_json_field "${STATE_FOLDER}/settings.json" listenIp)
  fi

  # If storagePath is set in settings.json, use it
  storage_path_settings=$(get_json_field "${STATE_FOLDER}/settings.json" storagePath)
  if [[ "${storage_path_settings}" != "null" && "${storage_path_settings}" != "" ]]; then
    storage_path="${storage_path_settings}"
    STORAGE_PATH_ESCAPED="$(echo "${storage_path}" | sed 's/\//\\\//g')"
  fi
fi

# Function below is modified from Umbrel
# Required Notice: Copyright
# Umbrel (https://umbrel.com)
for template in ${ENV_FILE}; do
    sed "${sed_args[@]}" "s/<dns_ip>/${DNS_IP}/g" "${template}"
    sed "${sed_args[@]}" "s/<internal_ip>/${INTERNAL_IP}/g" "${template}"
    sed "${sed_args[@]}" "s/<tz>/${TZ}/g" "${template}"
    sed "${sed_args[@]}" "s/<jwt_secret>/${JWT_SECRET}/g" "${template}"
    sed "${sed_args[@]}" "s/<root_folder>/${SED_ROOT_FOLDER}/g" "${template}"
    sed "${sed_args[@]}" "s/<tipi_version>/${TIPI_VERSION}/g" "${template}"
    sed "${sed_args[@]}" "s/<architecture>/${ARCHITECTURE}/g" "${template}"
    sed "${sed_args[@]}" "s/<nginx_port>/${NGINX_PORT}/g" "${template}"
    sed "${sed_args[@]}" "s/<nginx_port_ssl>/${NGINX_PORT_SSL}/g" "${template}"
    sed "${sed_args[@]}" "s/<apps_repo_id>/${REPO_ID}/g" "${template}"
    sed "${sed_args[@]}" "s/<apps_repo_url>/${APPS_REPOSITORY_ESCAPED}/g" "${template}"
    sed "${sed_args[@]}" "s/<domain>/${DOMAIN}/g" "${template}"
    sed "${sed_args[@]}" "s/<storage_path>/${STORAGE_PATH_ESCAPED}/g" "${template}"
    sed "${sed_args[@]}" "s/<postgres_password>/${POSTGRES_PASSWORD}/g" "${template}"
    sed "${sed_args[@]}" "s/<postgres_username>/${POSTGRES_USERNAME}/g" "${template}"
    sed "${sed_args[@]}" "s/<postgres_dbname>/${POSTGRES_DBNAME}/g" "${template}"
    sed "${sed_args[@]}" "s/<postgres_port>/${POSTGRES_PORT}/g" "${template}"
    sed "${sed_args[@]}" "s/<postgres_host>/${POSTGRES_HOST}/g" "${template}"
    sed "${sed_args[@]}" "s/<redis_host>/${REDIS_HOST}/g" "${template}"
    sed "${sed_args[@]}" "s/<demo_mode>/${DEMO_MODE}/g" "${template}"
done

mv -f "$ENV_FILE" "$ROOT_FOLDER/.env.dev"
cp "$ROOT_FOLDER/.env.dev" "$ROOT_FOLDER/.env"
chmod a+rwx "$ROOT_FOLDER/.env"
chmod a+rwx "${ROOT_FOLDER}/.env.dev"

### --------------------------------
### Start the project
### --------------------------------
docker compose -f docker-compose.dev.yml --env-file "${ROOT_FOLDER}/.env.dev" up --build
