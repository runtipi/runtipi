# Constants
NETWORK_IP="10.21.21.0"
GATEWAY_IP="10.21.21.1"
NGINX_IP="10.21.21.2"
NGINX_PORT="80"
TIPI_IP="$1"
USERNAME="$(whoami)"

# Apps
APP_PI_HOLE_PORT="8081"
APP_PI_HOLE_IP="10.21.21.20"

# Store paths to intermediary config files
ANSIBLE_HOSTS_FILE="./templates/ansible-hosts-sample.cfg"
ENV_FILE="./templates/.env"

# Remove intermediary config files
[[ -f "$ENV_FILE" ]] && rm -f "$ENV_FILE"
[[ -f "$ANSIBLE_HOSTS_FILE" ]] && rm -f "$ANSIBLE_HOSTS_FILE"

# Copy template configs to intermediary configs
[[ -f "./templates/.env-sample" ]] && cp "./templates/.env-sample" "$ENV_FILE"
[[ -f "./templates/ansible-hosts-sample.cfg" ]] && cp "./templates/ansible-hosts-sample.cfg" "$ANSIBLE_HOSTS_FILE"

# Install ansible if not installed
if ! command -v ansible > /dev/null; then
    echo "Installing Ansible..."
    apt-get update
    apt-get install -y software-properties-common
    apt-add-repository -y ppa:ansible/ansible
    apt-get update
    apt-get install -y ansible
fi

# Install ssh-keygen if not installed
if ! command -v ssh-keygen > /dev/null; then
    echo "Installing ssh-keygen..."
    apt-get update
    apt-get install -y ssh-keygen
fi

# Generate ssh keys
if [[ ! -f "~/ssh/id_rsa_tipi" ]]; then
    echo "Generating ssh keys..."
    mkdir -p "~/ssh"
    ssh-keygen -t rsa -b 4096 -f "~/ssh/id_rsa_tipi" -N ""
fi

echo "Generating config files..."
for template in "${ENV_FILE}" "${ANSIBLE_HOSTS_FILE}"; do
  # Umbrel
  sed -i "s/<network-ip>/${NETWORK_IP}/g" "${template}"
  sed -i "s/<gateway-ip>/${GATEWAY_IP}/g" "${template}"
  sed -i "s/<nginx-ip>/${NGINX_IP}/g" "${template}"
  sed -i "s/<nginx-port>/${NGINX_PORT}/g" "${template}"
  # Apps
  sed -i "s/<app-pi-hole-port>/${APP_PI_HOLE_PORT}/g" "${template}"
  sed -i "s/<app-pi-hole-ip>/${APP_PI_HOLE_IP}/g" "${template}"
  # Ansible
  sed -i "s/<host_ip>/${TIPI_IP}/g" "${template}"
  sed -i "s/<username>/${USERNAME}/g" "${template}"
done

# Copy SSH keys to ansible host
echo "Copying SSH keys to tipi server..."
ssh-copy-id -i "~/ssh/id_rsa_tipi" "${USERNAME}@${TIPI_IP}"

mv -f "$ENV_FILE" "./.env"
mv -f "$ANSIBLE_HOSTS_FILE" "./ansible/hosts"

echo "Configuring permissions..."
find "$UMBREL_ROOT" -path "$UMBREL_ROOT/app-data" -prune -o -exec chown 1000:1000 {} + || true

# Run ansible playbook
echo "Running Ansible playbook..."
ansible-playbook -i "./ansible/hosts" "./ansible/playbook.yml"