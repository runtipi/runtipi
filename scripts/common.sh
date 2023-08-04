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
