#!/usr/bin/env bash
set -o errexit
set -o nounset
set -o pipefail

echo "Installing runtipi..."

ARCHITECTURE="$(uname -m)"
# Not supported on 32 bits systems
if [[ "$ARCHITECTURE" == "armv7"* ]] || [[ "$ARCHITECTURE" == "i686" ]] || [[ "$ARCHITECTURE" == "i386" ]]; then
    echo "runtipi is not supported on 32 bits systems"
    exit 1
fi


LATEST_VERSION=$(curl -s https://api.github.com/repos/meienberger/runtipi/releases/latest | grep tag_name | cut -d '"' -f4)

### --------------------------------
### CLI arguments
### --------------------------------
UPDATE="false"
while [ -n "${1-}" ]; do
    case "$1" in
    --update) UPDATE="true" ;;
    --)
        shift # The double dash makes them parameters
        break
        ;;
    *) echo "Option $1 not recognized" && exit 1 ;;
    esac
    shift
done

if [[ "${UPDATE}" == "false" ]]; then
    mkdir -p runtipi
    cd runtipi || exit
fi

curl --location https://api.github.com/repos/meienberger/runtipi/tarball/"${LATEST_VERSION}" -o runtipi.tar.gz
mkdir runtipi-"${LATEST_VERSION}"
tar -xzf runtipi.tar.gz -C runtipi-"${LATEST_VERSION}" --strip-components=1
rm runtipi.tar.gz

# copy from downloaded /scripts/*
if [ -d "scripts" ]; then
    rm -rf scripts
fi
mkdir scripts
cp -r runtipi-"${LATEST_VERSION}"/scripts/* ./scripts

# copy from downloaded /templates/*
if [ -d "templates" ]; then
    rm -rf templates
fi
mkdir templates
cp -r runtipi-"${LATEST_VERSION}"/templates/* ./templates

# copy from downloaded /traefik/*
if [ -d "traefik" ]; then
    rm -rf traefik
fi
mkdir traefik
cp -r runtipi-"${LATEST_VERSION}"/traefik/* ./traefik

# copy from downloaded /docker-compose.yml
if [ -f "docker-compose.yml" ]; then
    rm -f docker-compose.yml
fi
cp -r runtipi-"${LATEST_VERSION}"/docker-compose.yml .

# copy from downloaded /package.json
if [ -f "package.json" ]; then
    rm -f package.json
fi
cp -r runtipi-"${LATEST_VERSION}"/package.json .

mkdir -p apps
mkdir -p app-data
mkdir -p state
mkdir -p repos

mkdir -p media/torrents
mkdir -p media/torrents/watch
mkdir -p media/torrents/completed
mkdir -p media/torrents/incomplete

mkdir -p media/usenet
mkdir -p media/usenet/watch
mkdir -p media/usenet/completed
mkdir -p media/usenet/incomplete

mkdir -p media/data
mkdir -p media/data/books
mkdir -p media/data/movies
mkdir -p media/data/music
mkdir -p media/data/tv
mkdir -p media/data/podcasts
mkdir -p media/data/images

## remove downloaded folder
rm -rf runtipi-"${LATEST_VERSION}"

sudo ./scripts/start.sh
