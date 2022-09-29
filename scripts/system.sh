#!/usr/bin/env bash

source "${BASH_SOURCE%/*}/common.sh"

ensure_pwd

if [ -z ${1+x} ]; then
    command=""
else
    command="$1"
fi

# Restart Tipi
if [[ "$command" = "restart" ]]; then
    echo "Restarting Tipi..."

    scripts/stop.sh
    scripts/start.sh

    exit
fi

# Update Tipi
if [[ "$command" = "update" ]]; then
    scripts/stop.sh
    git pull origin master
    scripts/start.sh
    exit
fi
