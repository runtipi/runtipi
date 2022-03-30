ROOT_FOLDER="$(readlink -f $(dirname "${BASH_SOURCE[0]}")/..)"

# Constants
NGINX_PORT="80"
# Apps
APP_PI_HOLE_PORT="8081"

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

# Store paths to intermediary config files
ENV_FILE="./templates/.env"

# Remove intermediary config files
[[ -f "$ENV_FILE" ]] && rm -f "$ENV_FILE"

# Copy template configs to intermediary configs
[[ -f "./templates/.env-sample" ]] && cp "./templates/.env-sample" "$ENV_FILE"

# Install jq if not installed
if ! command -v jq > /dev/null; then
    echo "Installing jq..."
    apt-get update
    apt-get install -y jq
fi

# Install docker if not installed
if ! command -v docker > /dev/null; then
    echo "Installing docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
fi

# Install docker-compose if not installed
if ! command -v docker-compose > /dev/null; then
    echo "Installing docker-compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.3.4/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

echo "Generating config files..."
for template in "${ENV_FILE}"; do
  sed -i "s/<nginx-port>/${NGINX_PORT}/g" "${template}"
  # Apps
  sed -i "s/<app-pi-hole-port>/${APP_PI_HOLE_PORT}/g" "${template}"
  sed -i "s/<domain>/${DOMAIN}/g" "${template}"
done

mv -f "$ENV_FILE" "./.env"

echo "Configuring permissions..."
echo
find "$ROOT_FOLDER" -path "$ROOT_FOLDER/app-data" -prune -o -exec chown 1000:1000 {} + || true

# Create configured status
touch "${ROOT_FOLDER}/state/configured"