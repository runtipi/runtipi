#!/usr/bin/env bash

source "${BASH_SOURCE%/*}/common.sh"

ensure_pwd

ROOT_FOLDER="${PWD}"

# Get a static hash based on the repo url
function get_hash() {
    url="${1}"
    echo -n "${url}" | sha256sum | awk '{print $1}'
}

if [ -z ${1+x} ]; then
    command=""
else
    command="$1"
fi

# Clone a repo
if [[ "$command" = "clone" ]]; then
    repo="$2"
    repo_hash=$(get_hash "${repo}")

    write_log "Cloning ${repo} to ${ROOT_FOLDER}/repos/${repo_hash}"
    repo_dir="${ROOT_FOLDER}/repos/${repo_hash}"
    if [ -d "${repo_dir}" ]; then
        write_log "Repo already exists"
        exit 0
    fi

    write_log "Cloning ${repo} to ${repo_dir}"

    if ! git clone "${repo}" "${repo_dir}"; then
        write_log "Failed to clone repo"
        exit 1
    fi

    write_log "Done"
    exit 0
fi

# Update a repo
if [[ "$command" = "update" ]]; then
    repo="$2"
    repo_hash=$(get_hash "${repo}")
    repo_dir="${ROOT_FOLDER}/repos/${repo_hash}"
    git config --global --add safe.directory "${repo_dir}"
    if [ ! -d "${repo_dir}" ]; then
        write_log "Repo does not exist"
        exit 1
    fi

    write_log "Updating ${repo} in ${repo_hash}"
    cd "${repo_dir}" || exit

    if ! git pull origin "$(git rev-parse --abbrev-ref HEAD)"; then
        cd "${ROOT_FOLDER}" || exit
        write_log "Failed to update repo"
        exit 1
    fi

    cd "${ROOT_FOLDER}" || exit
    write_log "Done"
    exit 0
fi

if [[ "$command" = "get_hash" ]]; then
    repo="$2"
    get_hash "${repo}"
    exit
fi
