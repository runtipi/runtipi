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

# Check if already migrated
if [[ -d "apps/1" ]] then
  echo -e "❌ ${Red}You have already migrated your apps, if you haven't updated yet, run ${Green}./runtipi-cli update latest${ColorOff}"
  exit 1
fi

# Backups warning
echo -e "⚠️  ${Yellow}Warning:${ColorOff} Make sure you have backed up your data before continuing, if something goes wrong during the migration process, you can risk losing important data! You can press Ctrl+C to cancel now if you need to backup\n"
echo -e "⏳ Starting in 10 seconds...\n"

sleep 10s

# Get all apps
echo -e "📦 Detecting apps..."

for app in $(ls apps); do
  echo -e "📦 Found app: ${Green}$app${ColorOff}"
done

echo -e "\n⚠️  ${Yellow}Warning:${ColorOff} If an app is missing from the list above, please cancel the script immidiately with Ctrl+C and seek help in our Discord or Forums\n"
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

# Moving apps
echo -e "⏭️  Moving apps..."

mkdir -p apps/1
mkdir -p app-data/1
mkdir -p user-config/1
mkdir -p backups/1

for app in $(ls apps); do
  if [[ $app == 1 ]] then
    continue
  fi
  echo -e "⏭️  Moving app: ${Green}$app${ColorOff}"
  mv apps/$app apps/1/$app
  mv app-data/$app app-data/1/$app
  if [[ -d "user-config/$app" ]]; then
    mv user-config/$app user-config/1/$app
  fi
  if [[ -d "backups/$app" ]]; then
    mv backups/$app backups/1/$app
  fi
done

# Clean repos
echo -e "\n🧹 Cleaning repos...\n"

rm -rf repos/*

# Update runtipi
echo -e "🔄 Updating Runtipi...\n"

./runtipi-cli update nightly