#!/usr/bin/env bash
#set -e # Exit immediately if a command exits with a non-zero status.

# Prompt to confirm
echo "This will reset your system to factory defaults. Are you sure you want to do this? (y/n)"
read -r confirm
if [ "$confirm" != "y" ]; then
    echo "Aborting."
    exit 1
fi

ROOT_FOLDER="$(readlink -f "$(dirname "${BASH_SOURCE[0]}")"/..)"

# Stop Tipi
"${ROOT_FOLDER}/scripts/stop.sh"

echo y | docker system prune
echo y | docker volume prune
echo y | docker network prune
echo y | docker container prune
echo y | docker image prune -a

# Remove everything in app-data folder
rm -rf "${ROOT_FOLDER}/app-data"
rm -rf "${ROOT_FOLDER}/data/postgres"
mkdir -p "${ROOT_FOLDER}/app-data"

cd "$ROOT_FOLDER" || echo ""
sudo ./runtipi-cli start
