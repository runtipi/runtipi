#!/usr/bin/env bash

echo "Updating Tipi to latest version..."

scripts/stop.sh
git pull origin master
scripts/start.sh
exit
