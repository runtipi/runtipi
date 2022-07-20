#!/usr/bin/env bash
#set -e # Exit immediately if a command exits with a non-zero status.

# Prompt to confirm
echo "This will reset your system to factory defaults. Are you sure you want to do this? (y/n)"
read confirm
if [ "$confirm" != "y" ]; then
    echo "Aborting."
    exit 1
fi

ROOT_FOLDER="$(readlink -f $(dirname "${BASH_SOURCE[0]}")/..)"

# Stop Tipi
"${ROOT_FOLDER}/scripts/stop.sh"

echo y | docker system prune
echo y | docker volume prune
echo y | docker network prune
echo y | docker container prune
echo y | docker image prune -a

# Remove everything in app-data folder
rm -rf "${ROOT_FOLDER}/app-data"
mkdir -p "${ROOT_FOLDER}/app-data"

# Put {"installed":""} in state/apps.json
echo '{"installed":""}' >"${ROOT_FOLDER}/state/apps.json"

"${ROOT_FOLDER}/scripts/start.sh"
