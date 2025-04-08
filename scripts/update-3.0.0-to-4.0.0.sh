#!/usr/bin/env bash
set -o errexit
set -o nounset
set -o pipefail
shopt -s nullglob

# Colors
Red='\e[31m'
Green='\e[32m'
Yellow='\e[33m'
ColorOff='\e[0m'

# Welcome message
echo -e "Welcome to the Runtipi migration script! It will automatically update everything to work with version ${Green}4.0.0${ColorOff}\n"

# Check if running as root
if [[ "$EUID" -ne 0 ]]; then
  echo -e "${Red}Root is required for this script!${ColorOff}"
  exit 1
fi

# Check if in the correct directory
if [[ "$(basename "$(pwd)")" != "runtipi" ]]; then
  echo -e "${Red}You need to run this script from the runtipi directory!${ColorOff}"
  exit 1
fi

current_version=$(cat VERSION)
if [[ ! "$current_version" =~ ^v3\..* ]]; then
  echo -e "${Red}This script is only for migrating from version 3.x.x to 4.0.0${ColorOff}"
  echo -e "Current version: ${current_version}"
  exit 1
fi

# Verify app data
if [[ -d "app-data/app-data" ]]; then
  echo -e "${Red}You have an additional app-data folder, the script cannot continue with this folder, please seek help in our Discord or Forums for a guide on how to fix the issue.${ColorOff}"
  exit 1
fi

# Backups warning
echo -e "${Yellow}Warning:${ColorOff} Make sure you have backed up your data before continuing, if something goes wrong during the migration process, you can risk losing important data!"
read -p "Do you want to continue? (y/n): " -r

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "\n${Red}Migration cancelled!${ColorOff}"
  exit 1
fi

echo -e "\nChecking for apps..."

for app in apps/*; do
  app=${app#apps/}
  echo -e "Found app: ${Green}$app${ColorOff}"
done

echo -e "\n${Yellow}Warning:${ColorOff} ensure all your apps are listed above, if not, please seek help in our Discord or Forums for a guide on how to fix the issue.${ColorOff}"
read -p "Do you want to continue? (y/n): " -r

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "\n${Red}Migration cancelled!${ColorOff}"
  exit 1
fi

# Stop apps
echo -e "Stopping apps...\n"

for app in apps/*; do
  app=${app#apps/}
  echo -ne "\033[KStopping ${Green}$app${ColorOff}\r"
  if ! ./runtipi-cli app stop "$app" > /dev/null 2>&1; then
    echo -e "${Red}Failed to stop $app!${ColorOff}"
  fi
  sleep 3
done

read -p "🚨 Please go  to the Runtipi web interface and make sure all apps are stopped, then press enter to continue..." -r

# Stop runtipi
echo -e "\nStopping Runtipi...\n"

if ! ./runtipi-cli stop; then
  echo -e "${Red}Failed to stop Runtipi${ColorOff}"
  exit 1
fi

# Move app-data to backups
echo -e "Backing up data..."
sleep 5

mkdir -p migration-backups

mv app-data migration-backups/app-data
mv apps migration-backups/apps
mv user-config migration-backups/user-config
mv backups migration-backups/backups

mkdir -p {app-data,apps,user-config,backups}

# Move apps
echo -e "Moving apps...\n"

REPO_ID=migrated

mkdir -p apps/$REPO_ID
mkdir -p app-data/$REPO_ID
mkdir -p user-config/$REPO_ID
mkdir -p backups/$REPO_ID

for app in migration-backups/apps/*; do
  app=${app#migration-backups/apps/}
  echo -ne "\033[KMoving ${Green}$app${ColorOff}\r"
  mv migration-backups/apps/"$app" apps/$REPO_ID/"$app"
  mv migration-backups/app-data/"$app" app-data/$REPO_ID/"$app"
  if [[ -d "migration-backups/user-config/$app" ]]; then
    mv migration-backups/user-config/"$app" user-config/$REPO_ID/"$app"
  fi
  if [[ -d "migration-backups/backups/$app" ]]; then
    mv migration-backups/backups/"$app" backups/$REPO_ID/"$app"
  fi
done

# Start runtipi
echo -e "\nMigration complete! Updating Runtipi to v4.0.0...\n"

ARCHITECTURE="$(uname -m)"

ASSET="runtipi-cli-linux-x86_64.tar.gz"
if [[ "$ARCHITECTURE" == "arm64" || "$ARCHITECTURE" == "aarch64" ]]; then
  ASSET="runtipi-cli-linux-aarch64.tar.gz"
fi

URL="https://github.com/runtipi/runtipi/releases/download/v4.0.0/$ASSET"

rm -f ./runtipi-cli

if [[ "$ASSET" == *".tar.gz" ]]; then
  curl --location "$URL" -o ./runtipi-cli.tar.gz
  tar -xzf ./runtipi-cli.tar.gz

  asset_name=$(tar -tzf ./runtipi-cli.tar.gz | head -n 1 | cut -f1 -d"/")
  mv "./${asset_name}" ./runtipi-cli
  rm ./runtipi-cli.tar.gz
else
  curl --location "$URL" -o ./runtipi-cli
fi

chmod +x ./runtipi-cli
sudo ./runtipi-cli start
