#!/usr/bin/env bash
set -e  # Exit immediately if a command exits with a non-zero status.

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

# Install ansible if not installed
if ! command -v ansible-playbook > /dev/null; then
  echo "Installing Ansible..."
  sudo apt-get update
  sudo apt-get install python3 python3-pip -y
  sudo pip3 install ansible
fi



ansible-playbook ansible/setup.yml -i ansible/hosts -K

# echo "Configuring permissions..."
# echo
# find "$ROOT_FOLDER" -path "$ROOT_FOLDER/app-data" -prune -o -exec chown 1000:1000 {} + || true

# Create configured status
touch "${ROOT_FOLDER}/state/configured"