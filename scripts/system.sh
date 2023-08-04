#!/usr/bin/env bash

source "${BASH_SOURCE%/*}/common.sh"
ensure_pwd

ROOT_FOLDER="${PWD}"

if [ -z ${1+x} ]; then
    command=""
else
    command="$1"
fi

function update() {
    write_log "Updating Tipi..."

    local current_version=$(get_json_field "${ROOT_FOLDER}/package.json" version)
    # check latest version
    local latest=$(curl -s https://api.github.com/repos/meienberger/runtipi/releases/latest | grep tag_name | cut -d '"' -f4)

    scripts/stop.sh

    # backup current version to backups/${current_version}/
    local timestamp=$(date +%s)
    local backup_folder="${ROOT_FOLDER}/backups/${current_version}-${timestamp}"

    mkdir -p "${backup_folder}"
    cp -r "${ROOT_FOLDER}/scripts" "${backup_folder}"
    cp -r "${ROOT_FOLDER}/templates" "${backup_folder}"
    cp -r "${ROOT_FOLDER}/traefik" "${backup_folder}"
    cp -r "${ROOT_FOLDER}/package.json" "${backup_folder}"
    cp -r "${ROOT_FOLDER}/docker-compose.yml" "${backup_folder}"

    # download install.sh from latest release to install-${latest_version}.sh
    curl -L https://raw.githubusercontent.com/meienberger/runtipi/master/scripts/install.sh >install-"${latest}".sh

    chmod +x ./install-"${latest}".sh
    # run install-${latest_version}.sh
    ./install-"${latest}".sh --update

    # remove install-${latest_version}.sh
    rm install-"${latest}".sh
    rm -rf runtipi-"${latest}"
    rm -rf runtipi.tar.gz

    exit 0
}

# Update Tipi
if [[ "$command" = "update" ]]; then
    update
fi
