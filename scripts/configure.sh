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

sudo wget -O "${ROOT_FOLDER}"/scripts/pacapt https://github.com/icy/pacapt/raw/ng/pacapt
sudo chmod 755 "${ROOT_FOLDER}"/scripts/pacapt
sudo "${ROOT_FOLDER}"/scripts/pacapt -Sy
sudo "${ROOT_FOLDER}"/scripts/pacapt -S docker docker-compose jq coreutils curl lsb-release -y

LSB="$(lsb_release -is)"

systemctl start docker.service
systemctl enable docker.service

# if [[ "${LSB}" == "Arch" ]]; then
#   sudo "${ROOT_FOLDER}"/scripts/pacapt -S hostname -y
# fi

# Create configured status
touch "${ROOT_FOLDER}/state/configured"
