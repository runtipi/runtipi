#!/usr/bin/env bash
set -e # Exit immediately if a command exits with a non-zero status.

ROOT_FOLDER="$(readlink -f $(dirname "${BASH_SOURCE[0]}")/..)"
USERNAME="$(id -nu 1000)"

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

# Enable passwordless sudo for $USERNAME
if ! grep -q "${USERNAME} ALL=(ALL) NOPASSWD: ALL" /etc/sudoers; then
  echo "${USERNAME} ALL=(ALL) NOPASSWD: ALL" | sudo tee -a /etc/sudoers
fi

sudo apt-get update
sudo apt-get install -y jq coreutils ca-certificates curl gnupg lsb-release

LSB="$(lsb_release -is)"

# Add docker gpg key (Debian)
if [[ "${LSB}" == "Debian" ]]; then
  curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
fi

# Add docker gpg key (Ubuntu)
if [[ "${LSB}" == "Ubuntu" ]]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
fi

# Add deb repo for docker (Debian)
if [[ "${LSB}" == "Debian" ]]; then
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
fi

# Add deb repo for docker (Ubuntu)
if [[ "${LSB}" == "Ubuntu" ]]; then
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
fi

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

# Install docker compose if not here
if ! command -v docker-compose >/dev/null; then
  sudo curl -L "https://github.com/docker/compose/releases/download/v2.3.4/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose
fi

# create docker group
if ! getent group docker >/dev/null; then
  sudo groupadd docker
fi
sudo usermod -aG docker "${USERNAME}"

# echo "Configuring permissions..."
# echo
# find "$ROOT_FOLDER" -path "$ROOT_FOLDER/app-data" -prune -o -exec chown 1000:1000 {} + || true

# Create configured status
touch "${ROOT_FOLDER}/state/configured"
