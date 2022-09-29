#!/usr/bin/env bash

# Get field from json file
function get_json_field() {
    local json_file="$1"
    local field="$2"

    jq -r ".${field}" "${json_file}"
}

function write_log() {
    local message="$1"
    local log_file="/app/logs/script.log"

    echo "$(date) - ${message}" >>"${log_file}"
}

function derive_entropy() {
    SEED_FILE="${STATE_FOLDER}/seed"
    identifier="${1}"
    tipi_seed=$(cat "${SEED_FILE}") || true

    if [[ -z "$tipi_seed" ]] || [[ -z "$identifier" ]]; then
        echo >&2 "Missing derivation parameter, this is unsafe, exiting."
        exit 1
    fi

    printf "%s" "${identifier}" | openssl dgst -sha256 -hmac "${tipi_seed}" | sed 's/^.* //'
}

function ensure_pwd() {
    # # Ensure PWD ends with /runtipi
    cd /runtipi || echo ""

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
    logs_folder="${ROOT_FOLDER}/logs"
    if [ "$(find "${logs_folder}" -maxdepth 1 -type f | wc -l)" -gt 0 ]; then
        echo "Cleaning logs folder..."

        files=($(ls -d "${logs_folder}"/* | xargs -n 1 basename | sed 's/\///g'))

        for file in "${files[@]}"; do
            echo "Removing ${file}"
            rm -rf "${ROOT_FOLDER}/logs/${file}"
        done
    fi
}
