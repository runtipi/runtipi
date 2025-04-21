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

docker_version=$(docker -v)
if [[ $docker_version =~ [0-9]+\.[0-9]+\.[0-9]+ ]]; then
  version=${BASH_REMATCH[0]}

  major_version=${version%%.*}

  if [ "$major_version" -lt 28 ]; then
    echo "Error: Docker version $version is lower than required version 28. Please update Docker to at least version 28."
    exit 1
  fi
else
  echo "Error: Could not determine Docker version"
  exit 1
fi

# Check if runtipi-cli exists
if [[ ! -f "runtipi-cli" ]]; then
  echo -e "❌ ${Red}You need to run this script from the runtipi directory!${ColorOff}"
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

# Validate app configurations
echo -e "\nValidating app configurations..."

# Get APPS_REPO_ID from .env
if [ ! -f ".env" ]; then
  echo -e "${Red}Error: .env file not found${ColorOff}"
  exit 1
fi

REPO_ID=$(grep "^APPS_REPO_ID=" .env | cut -d'=' -f2)

if [ -z "$REPO_ID" ]; then
  echo -e "${Red}Error: APPS_REPO_ID not found in .env file${ColorOff}"
  exit 1
fi

repo_dir="repos/$REPO_ID"
if [ -d "$repo_dir" ]; then
  for app_dir in "$repo_dir/apps/"*; do
    if [ -d "$app_dir" ]; then
      app_name=$(basename "$app_dir")
      echo -ne "\033[KChecking repository app ${Green}$app_name${ColorOff}\r"

      # Check config.json exists and has dynamic-config property
      config_file="$app_dir/config.json"
      if [ ! -f "$config_file" ]; then
        echo -e "\n${Red}Error: $app_name is not a valid app in repository, skipping...${ColorOff}"
        continue
      fi

      # Check if dynamic-config is set to true using jq
      if ! jq -e '.dynamic_config == true' "$config_file" >/dev/null 2>&1; then
        echo -e "\n${Red}Error: $app_name in repository does not have dynamic_config set to true in config.json. Make sure you have correctly migrated and tested your custom apps with the dynamic config.${ColorOff}"
        exit 1
      fi

      # Check docker-compose.json exists
      compose_file="$app_dir/docker-compose.json"
      if [ ! -f "$compose_file" ]; then
        echo -e "\n${Red}Error: $app_name in repository is missing docker-compose.json file. Make sure you have correctly migrated and tested your custom apps with the dynamic config.${ColorOff}"
        exit 1
      fi
    fi
  done
else
  echo -e "\n${Red}Error: Repository directory $repo_dir not found${ColorOff}"
  exit 1
fi

# Validate installed apps configurations
echo -e "\nValidating installed apps configurations..."
for app_dir in apps/*; do
  if [ -d "$app_dir" ]; then
    app_name=$(basename "$app_dir")
    echo -ne "\033[KChecking installed app ${Green}$app_name${ColorOff}\r"

    # Check config.json exists and has dynamic-config property
    config_file="$app_dir/config.json"
    if [ ! -f "$config_file" ]; then
      echo -e "\n${Red}Error: $app_name is not a valid installed app, skipping...${ColorOff}"
      continue
    fi

    # Check if dynamic-config is set to true using jq
    if ! jq -e '.dynamic_config == true' "$config_file" >/dev/null 2>&1; then
      echo -e "\n${Red}Error: installed app $app_name does not have dynamic_config set to true in config.json. Make sure you have correctly migrated and tested your custom apps with the dynamic config.${ColorOff}"
      exit 1
    fi

    # Check docker-compose.json exists
    compose_file="$app_dir/docker-compose.json"
    if [ ! -f "$compose_file" ]; then
      echo -e "\n${Red}Error: installed app $app_name is missing docker-compose.json file. Make sure you have correctly migrated and tested your custom apps with the dynamic config.${ColorOff}"
      exit 1
    fi
  fi
done

echo -e "\n${Green}All app configurations validated successfully${ColorOff}"
read -p "Press enter to continue with the migration..." -r

# Stop apps
echo -e "Stopping apps...\n"

for app in apps/*; do
  app=${app#apps/}
  echo -ne "\033[KStopping ${Green}$app${ColorOff}\r"
  if ! ./runtipi-cli app stop "$app" >/dev/null 2>&1; then
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

if [[ -f "migration-backups/user-config/tipi-compose.yml" ]]; then
  mv migration-backups/user-config/tipi-compose.yml user-config/tipi-compose.yml
fi

# Start runtipi
echo -e "\nMigration complete! Updating Runtipi to v4.0.0...\n"

ARCHITECTURE="$(uname -m)"

ASSET="runtipi-cli-linux-x86_64.tar.gz"
if [[ "$ARCHITECTURE" == "arm64" || "$ARCHITECTURE" == "aarch64" ]]; then
  ASSET="runtipi-cli-linux-aarch64.tar.gz"
fi

URL="https://github.com/runtipi/runtipi/releases/download/v4.0.0-beta.11/$ASSET"

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

echo -e "🎉 Runtipi has been updated to v4.0.0! 🎉\nOnce you have confirmed everything is working, you can delete the migration-backups folder.\n"
