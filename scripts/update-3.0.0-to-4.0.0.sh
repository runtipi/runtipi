#!/usr/bin/env bash
set -o errexit
set -o nounset
set -o pipefail

# Colors
Red='\e[31m'
Green='\e[32m'
Yellow='\e[33m'
ColorOff='\e[0m'

# Welcome message
echo -e "👋 Welcome to the Runtipi migration script. It will automatically update everything to work with version ${Green}4.0.0${ColorOff}\n"

# Check if running as root
if [[ "$EUID" -ne 0 ]] then
  echo -e "❌ ${Red}Root is required for this script!${ColorOff}"
  exit 1
fi

# Verify app data
if [[ -d "app-data/app-data" ]] then
  echo -e "❌ ${Red}You have an additional app-data folder, the script cannot continue with this folder, please seek help in our Discord or Forums for a guide on how to fix the issue.${ColorOff}"
  exit 1
fi

# I don't think we can check this if we use app names

# Check if already migrated 
# if [[ -d "apps/1" ]] then
#   echo -e "❌ ${Red}You have already migrated your apps, if you haven't updated yet, run ${Green}./runtipi-cli update latest${ColorOff}"
#   exit 1
# fi

# Backups warning
echo -e "⚠️  ${Yellow}Warning:${ColorOff} Make sure you have backed up your data before continuing, if something goes wrong during the migration process, you can risk losing important data! You can press Ctrl+C to cancel now if you need to backup\n"
echo -e "⏳ Starting in 10 seconds...\n"

sleep 10s

# Get all apps
echo -e "📦 Detecting apps..."

for app in $(ls apps); do
  echo -e "📦 Found app: ${Green}$app${ColorOff}"
done

echo -e "\n⚠️  ${Yellow}Warning:${ColorOff} If an app is missing from the list above, please cancel the script immediately with Ctrl+C and seek help in our Discord or Forums\n"
echo -e "⏳ Starting in 10 seconds...\n"

sleep 10s

# Stop apps
echo -e "🛑 Stopping apps..."

for app in $(ls apps); do
  echo -e "🛑 Stopping app: ${Green}$app${ColorOff}"
  ./runtipi-cli app stop $app >/dev/null 2>&1
done

# Stop runtipi
echo -e "\n🛑 Stopping Runtipi...\n"

./runtipi-cli stop >/dev/null 2>&1

# Move app-data to backups
echo -e "⏭️  Backing up data..."

mkdir -p migration-backups

mv app-data migration-backups/app-data
mv apps migration-backups/apps
mv user-config migration-backups/user-config
mv backups migration-backups/backups

mkdir -p {app-data,apps,user-config,backups}

# Clean repos
echo -e "\n🧹 Cleaning repos...\n"

rm -rf repos/*

# Update runtipi
echo -e "🔄 Updating Runtipi...\n"

./runtipi-cli update nightly >/dev/null 2>&1 # change this!

# Stop runtipi
echo -e "\n🛑 Stopping Runtipi...\n"

./runtipi-cli stop >/dev/null 2>&1

# Move apps
echo -e "⏭️  Moving apps..."

REPO_ID=$(ls apps)

mkdir -p apps/$REPO_ID
mkdir -p app-data/$REPO_ID
mkdir -p user-config/$REPO_ID
mkdir -p backups/$REPO_ID

for app in $(ls migrations-backups/apps); do
  echo -e "⏭️  Moving app: ${Green}$app${ColorOff}"
  mv migration-backups/apps/$app apps/$REPO_ID/$app
  mv migration-backups/app-data/$app app-data/$REPO_ID/$app
  if [[ -d "migration-backups/user-config/$app" ]]; then
    mv migration-backups/user-config/$app user-config/$REPO_ID/$app
  fi
  if [[ -d "migration-backups/backups/$app" ]]; then
    mv migration-backups/backups/$app backups/$REPO_ID/$app
  fi
done

# Start runtipi
echo -e "\n🚀 Starting Runtipi...\n"

./runtpi-cli start