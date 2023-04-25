#!/usr/bin/env bash

ROOT_FOLDER="${PWD}"
STATE_FOLDER="${ROOT_FOLDER}/state"

# Get field from json file
function get_json_field() {
    local json_file="$1"
    local field="$2"

    jq -r ".${field}" "${json_file}"
}

function write_log() {
    local message="$1"
    local log_file="${PWD}/logs/script.log"

    echo "$(date) - ${message}" >>"${log_file}"
}

# Function below is taken from Umbrel
# Required Notice: Copyright
# Umbrel (https://umbrel.com)
function derive_entropy() {
    SEED_FILE="${STATE_FOLDER}/seed"
    identifier="${1}"
    tipi_seed=$(cat "${SEED_FILE}") || true

    if [[ -z "$tipi_seed" ]] || [[ -z "$identifier" ]]; then
        echo >&2 "Seed file not found. exiting..."
        exit 1
    fi

    printf "%s" "${identifier}" | openssl dgst -sha256 -hmac "${tipi_seed}" | sed 's/^.* //'
}

function ensure_pwd() {
    if [[ $(basename "$(pwd)") != "runtipi" ]] || [[ ! -f "${BASH_SOURCE[0]}" ]]; then
        echo "Please run this script from the runtipi directory"
        exit 1
    fi
}

function ensure_root() {
    if [[ $UID != 0 ]]; then
        echo "Tipi must be started as root"
        echo "Please re-run this script as"
        echo "  sudo ./scripts/start"
        exit 1
    fi
}

function ensure_linux() {
    # Check we are on linux
    if [[ "$(uname)" != "Linux" ]]; then
        echo "Tipi only works on Linux"
        exit 1
    fi
}

function clean_logs() {
    # Clean logs folder
    local logs_folder="${ROOT_FOLDER}/logs"

    # Create the folder if it doesn't exist
    if [[ ! -d "${logs_folder}" ]]; then
        mkdir "${logs_folder}"
    fi

    if [ "$(find "${logs_folder}" -maxdepth 1 -type f | wc -l)" -gt 0 ]; then
        echo "Cleaning logs folder..."

        local files=($(ls -d "${logs_folder}"/* | xargs -n 1 basename | sed 's/\///g'))

        for file in "${files[@]}"; do
            echo "Removing ${file}"
            rm -rf "${ROOT_FOLDER}/logs/${file}"
        done
    fi
}

function kill_watcher() {
    local watcher_pid="$(ps aux | grep "scripts/watcher" | grep -v grep | awk '{print $2}')"

    # kill it if it's running
    if [[ -n $watcher_pid ]]; then
        # If multiline kill each pid
        if [[ $watcher_pid == *" "* ]]; then
            for pid in $watcher_pid; do
                # shellcheck disable=SC2086
                kill -9 $pid
            done
        else
            # shellcheck disable=SC2086
            kill -9 $watcher_pid
        fi
    fi
}


function generate_env_file() {
  echo "Generating .env file..."
  env_variables=$1

  json_file=$(mktemp)
  echo "$env_variables" > "$json_file"

  local default_tz="Etc\/UTC"
  local tz="$(timedatectl | grep "Time zone" | awk '{print $3}' | sed 's/\//\\\//g')"
  if [[ -z "$tz" ]]; then
    tz="$default_tz"
  fi

  local architecture="$(uname -m | tr '[:upper:]' '[:lower:]')"

  if [[ "$architecture" == "aarch64" ]] || [[ "$architecture" == "armv8"* ]]; then
    architecture="arm64"
  elif [[ "$architecture" == "x86_64" ]]; then
    architecture="amd64"
  fi

  # If none of the above conditions are met, the architecture is not supported
  if [[ "$architecture" != "arm64" ]] && [[ "$architecture" != "amd64" ]]; then
    echo "Architecture ${architecture} not supported if you think this is a mistake, please open an issue on GitHub."
    exit 1
  fi

  local dns_ip=$(get_json_field "$json_file" dns_ip)
  local internal_ip=$(get_json_field "$json_file" internal_ip)
  local jwt_secret=$(get_json_field "$json_file" jwt_secret)
  local tipi_version=$(get_json_field "$json_file" tipi_version)
  local nginx_port=$(get_json_field "$json_file" nginx_port)
  local nginx_port_ssl=$(get_json_field "$json_file" nginx_port_ssl)
  local repo_id=$(get_json_field "$json_file" repo_id)
  local domain=$(get_json_field "$json_file" domain)
  local postgres_password=$(get_json_field "$json_file" postgres_password)
  local postgres_username=$(get_json_field "$json_file" postgres_username)
  local postgres_dbname=$(get_json_field "$json_file" postgres_dbname)
  local postgres_host=$(get_json_field "$json_file" postgres_host)
  local postgres_port=$(get_json_field "$json_file" postgres_port)
  local redis_host=$(get_json_field "$json_file" redis_host)
  local demo_mode=$(get_json_field "$json_file" demo_mode)
  local root_folder=$(get_json_field "$json_file" root_folder | sed 's/\//\\\//g')
  local apps_repository=$(get_json_field "$json_file" apps_repository | sed 's/\//\\\//g')
  local storage_path=$(get_json_field "$json_file" storage_path | sed 's/\//\\\//g')

  env_file=$(mktemp)
  [[ -f "${ROOT_FOLDER}/.env" ]] && rm -f "${ROOT_FOLDER}/.env"
  [[ -f "$ROOT_FOLDER/templates/env-sample" ]] && cp "$ROOT_FOLDER/templates/env-sample" "$env_file"


  if [[ -f "${STATE_FOLDER}/settings.json" ]]; then
    # If dnsIp is set in settings.json, use it
    if [[ "$(get_json_field "${STATE_FOLDER}/settings.json" dnsIp)" != "null" ]]; then
      dns_ip=$(get_json_field "${STATE_FOLDER}/settings.json" dnsIp)
    fi

    # If domain is set in settings.json, use it
    if [[ "$(get_json_field "${STATE_FOLDER}/settings.json" domain)" != "null" ]]; then
      domain=$(get_json_field "${STATE_FOLDER}/settings.json" domain)
    fi

    # If appsRepoUrl is set in settings.json, use it
    if [[ "$(get_json_field "${STATE_FOLDER}/settings.json" appsRepoUrl)" != "null" ]]; then
      apps_repository_temp=$(get_json_field "${STATE_FOLDER}/settings.json" appsRepoUrl)
      apps_repository="$(echo "${apps_repository_temp}" | sed 's/\//\\\//g')"
      repo_id="$("${ROOT_FOLDER}"/scripts/git.sh get_hash "${apps_repository}")"
    fi

    # If port is set in settings.json, use it
    if [[ "$(get_json_field "${STATE_FOLDER}/settings.json" port)" != "null" ]]; then
      nginx_port=$(get_json_field "${STATE_FOLDER}/settings.json" port)
    fi

    # If sslPort is set in settings.json, use it
    if [[ "$(get_json_field "${STATE_FOLDER}/settings.json" sslPort)" != "null" ]]; then
      nginx_port_ssl=$(get_json_field "${STATE_FOLDER}/settings.json" sslPort)
    fi

    # If listenIp is set in settings.json, use it
    if [[ "$(get_json_field "${STATE_FOLDER}/settings.json" listenIp)" != "null" ]]; then
      internal_ip=$(get_json_field "${STATE_FOLDER}/settings.json" listenIp)
    fi

    # If demoMode is set in settings.json, use it
    if [[ "$(get_json_field "${STATE_FOLDER}/settings.json" demoMode)" == "true" ]]; then
      demo_mode="true"
    fi

    # If storagePath is set in settings.json, use it
    storage_path_settings=$(get_json_field "${STATE_FOLDER}/settings.json" storagePath)
    if [[ "${storage_path_settings}" != "null" && "${storage_path_settings}" != "" ]]; then
      storage_path_temp="${storage_path_settings}"
      storage_path="$(echo "${storage_path_temp}" | sed 's/\//\\\//g')"
    fi
  fi

  # If port is not 80 and domain is not tipi.localhost, we exit
  if [[ "${nginx_port}" != "80" ]] && [[ "${domain}" != "tipi.localhost" ]]; then
    echo "Using a custom domain with a custom port is not supported"
    exit 1
  fi

  os=$(uname)
  sed_args=(-i)
  # If os is macos, use gnu sed
  if [[ "$os" == "Darwin" ]]; then
      echo "Using gnu sed"
      sed_args=(-i '')
  fi

  # Function below is modified from Umbrel
  # Required Notice: Copyright
  # Umbrel (https://umbrel.com)
  for template in ${env_file}; do
      sed "${sed_args[@]}" "s/<dns_ip>/${dns_ip}/g" "${template}"
      sed "${sed_args[@]}" "s/<internal_ip>/${internal_ip}/g" "${template}"
      sed "${sed_args[@]}" "s/<tz>/${tz}/g" "${template}"
      sed "${sed_args[@]}" "s/<jwt_secret>/${jwt_secret}/g" "${template}"
      sed "${sed_args[@]}" "s/<root_folder>/${root_folder}/g" "${template}"
      sed "${sed_args[@]}" "s/<tipi_version>/${tipi_version}/g" "${template}"
      sed "${sed_args[@]}" "s/<architecture>/${architecture}/g" "${template}"
      sed "${sed_args[@]}" "s/<nginx_port>/${nginx_port}/g" "${template}"
      sed "${sed_args[@]}" "s/<nginx_port_ssl>/${nginx_port_ssl}/g" "${template}"
      sed "${sed_args[@]}" "s/<apps_repo_id>/${repo_id}/g" "${template}"
      sed "${sed_args[@]}" "s/<apps_repo_url>/${apps_repository}/g" "${template}"
      sed "${sed_args[@]}" "s/<domain>/${domain}/g" "${template}"
      sed "${sed_args[@]}" "s/<storage_path>/${storage_path}/g" "${template}"
      sed "${sed_args[@]}" "s/<postgres_password>/${postgres_password}/g" "${template}"
      sed "${sed_args[@]}" "s/<postgres_username>/${postgres_username}/g" "${template}"
      sed "${sed_args[@]}" "s/<postgres_dbname>/${postgres_dbname}/g" "${template}"
      sed "${sed_args[@]}" "s/<postgres_port>/${postgres_port}/g" "${template}"
      sed "${sed_args[@]}" "s/<postgres_host>/${postgres_host}/g" "${template}"
      sed "${sed_args[@]}" "s/<redis_host>/${redis_host}/g" "${template}"
      sed "${sed_args[@]}" "s/<demo_mode>/${demo_mode}/g" "${template}"
  done

  mv -f "$env_file" "$ROOT_FOLDER/.env"
  chmod a+rwx "$ROOT_FOLDER/.env"
}
