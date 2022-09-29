#!/usr/bin/env bash
# Don't break if command fails

cd /runtipi || echo ""

# Ensure PWD ends with /runtipi
if [[ $(basename "$(pwd)") != "runtipi" ]] || [[ ! -f "${BASH_SOURCE[0]}" ]]; then
    echo "Please make sure this script is executed from runtipi/"
    exit 1
fi

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

    echo "Cloning ${repo} to ${ROOT_FOLDER}/repos/${repo_hash}"
    repo_dir="${ROOT_FOLDER}/repos/${repo_hash}"
    if [ -d "${repo_dir}" ]; then
        echo "Repo already exists"
        exit 0
    fi

    echo "Cloning ${repo} to ${repo_dir}"
    git clone "${repo}" "${repo_dir}"
    echo "Done"
    exit
fi

# Update a repo
if [[ "$command" = "update" ]]; then
    repo="$2"
    repo_hash=$(get_hash "${repo}")
    repo_dir="${ROOT_FOLDER}/repos/${repo_hash}"
    if [ ! -d "${repo_dir}" ]; then
        echo "Repo does not exist"
        exit 0
    fi

    echo "Updating ${repo} in ${repo_hash}"
    cd "${repo_dir}" || exit
    git pull origin master
    echo "Done"
    exit
fi

if [[ "$command" = "get_hash" ]]; then
    repo="$2"
    get_hash "${repo}"
    exit
fi
