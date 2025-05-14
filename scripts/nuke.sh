#!/bin/bash

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root"
  exit
fi

echo "Nuking the system..."

# Remove all runtipi data
rm -rf .internal

# Remove containers
docker rm -f runtipi runtipi-reverse-proxy runtipi-db runtipi-queue

# Remove docker volumes
docker volume rm runtipi_pgdata
