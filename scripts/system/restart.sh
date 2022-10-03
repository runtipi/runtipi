#!/usr/bin/env bash

echo "Restarting Tipi..."

scripts/stop.sh
scripts/start.sh

exit
