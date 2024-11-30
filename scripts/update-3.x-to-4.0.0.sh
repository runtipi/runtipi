#!/usr/bin/env bash
set -o errexit
set -o nounset
set -o pipefail

sudo ./runtipi-cli stop

sudo rm -rf ./repos/*

sudo ./runtipi-cli update v4.0.0

# Wait for runtipi container to be healthy
echo "Waiting for runtipi container to be healthy..."

while [ "$(sudo docker inspect -f {{.State.Health.Status}} runtipi)" != "healthy" ]; do
  sleep 1
done

sleep 3

# Get the first repo in the repos directory as a single string
NEW_REPO_ID=$(ls ./repos/ | head -n 1)
APPS_TO_MIGRATE=$(ls ./apps/)
APP_DATA_PATH=$(cat .env | grep RUNTIPI_APP_DATA_PATH | cut -d '=' -f 2 | sed -E ':loop; s|/app-data$||; t loop')

# Stop all apps
for app in $APPS_TO_MIGRATE; do
  sudo ./runtipi-cli stop "$app"
done

sudo ./runtipi-cli stop

sudo mv ./user-config/* ./user-config/"$NEW_REPO_ID"/
sudo mv ./apps/* ./apps/"$NEW_REPO_ID"/
sudo mv ./"$APP_DATA_PATH"/* ./"$APP_DATA_PATH"/"$NEW_REPO_ID"/
sudo mv ./backups/* ./backups/"$NEW_REPO_ID"/
