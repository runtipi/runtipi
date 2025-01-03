#!/bin/bash

if [ "$EUID" -ne 0 ]
  then echo "Please run as root"
  exit
fi

echo "Nuking the system..."

# Remove all runtipi data

rm -rf app-data
rm -rf apps
rm -rf backups
rm -rf cache
rm -rf logs
rm -rf media
rm -rf repos
rm -rf state
rm -rf traefik
rm -rf user-config

# Remove containers

docker rm -f runtipi runtipi-reverse-proxy runtipi-db

# Remove docker volumes

docker volume rm runtipi_pgdata
