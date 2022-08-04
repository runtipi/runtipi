#!/usr/bin/env bash

# use greadlink instead of readlink on osx
if [[ "$(uname)" == "Darwin" ]]; then
    rdlk=greadlink
else
    rdlk=readlink
fi

ROOT_FOLDER="$($rdlk -f $(dirname "${BASH_SOURCE[0]}")/..)"

show_help() {
    cat <<EOF
app 0.0.1

CLI for managing Tipi apps

Usage: git <command> <repo> [<arguments>]

Commands:
    clone                      Clones a repo in the repo folder
    update                     Updates the repo folder
    get_hash                   Gets the local hash of the repo
EOF
}

# Get a static hash based on the repo url
function get_hash() {
    url="${1}"
    echo $(echo -n "${url}" | sha256sum | awk '{print $1}')
}

if [ -z ${1+x} ]; then
    command=""
else
    command="$1"
fi

# Clone a repo
if [[ "$command" = "clone" ]]; then
    repo="$2"
    echo "Cloning ${repo} to ${ROOT_FOLDER}/repos/${repo}"
    repo_dir="${ROOT_FOLDER}/repos/${repo}"
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
    repo_dir="${ROOT_FOLDER}/repos/${repo}"
    if [ ! -d "${repo_dir}" ]; then
        echo "Repo does not exist"
        exit 0
    fi

    echo "Updating ${repo} in ${repo_dir}"
    cd "${repo_dir}"
    git pull origin master
    echo "Done"
    exit
fi

if [[ "$command" = "get_hash" ]]; then
    repo="$2"
    echo $(get_hash "${repo}")
    exit
fi
