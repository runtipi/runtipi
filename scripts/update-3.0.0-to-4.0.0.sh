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
echo -e "👋 Welcome to the Runtipi migration script. It will automatically update everything to work with version ${Green}4.0.0${ColorOff}\n"

# Check if running as root
if [[ "$EUID" -ne 0 ]]; then
  echo -e "❌ ${Red}Root is required for this script!${ColorOff}"
  exit 1
fi

# Verify app data
if [[ -d "app-data/app-data" ]]; then
  echo -e "❌ ${Red}You have an additional app-data folder, the script cannot continue with this folder, please seek help in our Discord or Forums for a guide on how to fix the issue.${ColorOff}"
  exit 1
fi

# Backups warning
echo -e "⚠️ ${Yellow}Warning:${ColorOff} Make sure you have backed up your data before continuing, if something goes wrong during the migration process, you can risk losing important data!"
read -p "🚨 Do you want to continue? (y/n): " -r

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "\n❌ ${Red}Migration cancelled!${ColorOff}"
  exit 1
fi

echo -e "\n🔍 Checking for apps..."
sleep 3

for app in apps/*; do
  app=${app#apps/}
  echo -e "📦 Found app: ${Green}$app${ColorOff}"
done

echo -e "\n⚠️ ${Yellow}Warning:${ColorOff} ensure all your apps are listed above, if not, please seek help in our Discord or Forums for a guide on how to fix the issue.${ColorOff}"
read -p "🚨 Do you want to continue? (y/n): " -r

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "\n❌ ${Red}Migration cancelled!${ColorOff}"
  exit 1
fi

# Stop apps
echo -e "🛑 Stopping apps..."
sleep 3

failed_stops=()
for app in apps/*; do
  app=${app#apps/}
  echo -e "🛑 Stopping app: ${Green}$app${ColorOff}"
  if ! ./runtipi-cli app stop "$app"; then
    echo -e "${Red}Failed to stop $app${ColorOff}"
    failed_stops+=("$app")
  fi
done

# Stop runtipi
echo -e "\n🛑 Stopping Runtipi...\n"
sleep 3

if ! ./runtipi-cli stop; then
  echo -e "${Red}Failed to stop Runtipi${ColorOff}"
  exit 1
fi

# Move app-data to backups
echo -e "⏭️  Backing up data..."
sleep 3

mkdir -p migration-backups

mv app-data migration-backups/app-data
mv apps migration-backups/apps
mv user-config migration-backups/user-config
mv backups migration-backups/backups

mkdir -p {app-data,apps,user-config,backups}

# Update runtipi
echo -e "🔄 Updating Runtipi...\n"
sleep 3

if ! ./runtipi-cli update nightly; then
  echo -e "${Red}Failed to update Runtipi${ColorOff}"
  exit 1
fi

# Move apps
echo -e "⏭️  Moving apps..."
sleep 3

REPO_ID=migrated

mkdir -p apps/$REPO_ID
mkdir -p app-data/$REPO_ID
mkdir -p user-config/$REPO_ID
mkdir -p backups/$REPO_ID

for app in migration-backups/apps/*; do
  app=${app#migration-backups/apps/}
  echo -e "⏭️  Moving app: ${Green}$app${ColorOff}"
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
echo -e "\n🚀 Migration complete! Restarting Runtipi...\n"
sleep 3

./runtipi-cli start

