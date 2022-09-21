#!/usr/bin/env bash

cd /runtipi || echo ""

# Ensure PWD ends with /runtipi
if [[ $(basename "$(pwd)") != "runtipi" ]] || [[ ! -f "${BASH_SOURCE[0]}" ]]; then
    echo "Please make sure this script is executed from runtipi/"
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
