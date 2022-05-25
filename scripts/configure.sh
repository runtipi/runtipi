#!/usr/bin/env bash
set -e # Exit immediately if a command exits with a non-zero status.

ROOT_FOLDER="$(readlink -f $(dirname "${BASH_SOURCE[0]}")/..)"

echo
echo "======================================"
if [[ -f "${ROOT_FOLDER}/state/configured" ]]; then
  echo "=========== RECONFIGURING ============"
else
  echo "============ CONFIGURING ============="
fi
echo "=============== TIPI ================="
echo "======================================"
echo

sudo wget -O /usr/local/bin/pacapt https://github.com/icy/pacapt/raw/ng/pacapt
sudo chmod 755 /usr/local/bin/pacapt
sudo ln -sv /usr/local/bin/pacapt /usr/local/bin/pacman || true
sudo pacapt -Sy; sudo pacapt -S docker docker-ce docker-compose containerd.io jq coreutils curl -y

# Create configured status
touch "${ROOT_FOLDER}/state/configured"
