#!/usr/bin/env bash

cd /runtipi || echo ""

# Ensure PWD ends with /runtipi
if [[ "${PWD##*/}" != "runtipi" ]]; then
    echo "Please run this script from the runtipi directory"
    exit 1
fi

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
