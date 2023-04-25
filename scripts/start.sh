#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail
if [[ "${TRACE-0}" == "1" ]]; then
  set -o xtrace
fi
source "${BASH_SOURCE%/*}/common.sh"

ROOT_FOLDER="${PWD}"

# Cleanup and ensure environment
ensure_linux
ensure_pwd
ensure_root
clean_logs

### --------------------------------
### Pre-configuration
### --------------------------------
"${ROOT_FOLDER}/scripts/configure.sh"

STATE_FOLDER="${ROOT_FOLDER}/state"
# Create seed file with cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1
if [[ ! -f "${STATE_FOLDER}/seed" ]]; then
  echo "Generating seed..."
  if ! tr </dev/urandom -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1 >"${STATE_FOLDER}/seed"; then
    echo "Created seed file..."
  fi
fi

### --------------------------------
### General variables
### --------------------------------
apps_repository="https://github.com/meienberger/runtipi-appstore"
INTERNAL_IP=


if [[ -f "${STATE_FOLDER}/settings.json" ]]; then
  # If listenIp is set in settings.json, use it
  if [[ "$(get_json_field "${STATE_FOLDER}/settings.json" listenIp)" != "null" ]]; then
    INTERNAL_IP=$(get_json_field "${STATE_FOLDER}/settings.json" listenIp)
  fi
fi

if [[ -z "${INTERNAL_IP:-}" ]]; then
  network_interface="$(ip route | grep default | awk '{print $5}' | uniq)"
  network_interface_count=$(echo "$network_interface" | wc -l)

  if [[ "$network_interface_count" -eq 0 ]]; then
    echo "No network interface found!"
    exit 1
  elif [[ "$network_interface_count" -gt 1 ]]; then
    echo "Found multiple network interfaces. Please select one of the following interfaces:"
    echo "$network_interface"
    while true; do
      read -rp "> " USER_NETWORK_INTERFACE
      if echo "$network_interface" | grep -x "$USER_NETWORK_INTERFACE"; then
        network_interface="$USER_NETWORK_INTERFACE"
        break
      else
        echo "Please select one of the interfaces above. (CTRL+C to abort)"
      fi
    done
  fi

  INTERNAL_IP="$(ip addr show "${network_interface}" | grep "inet " | awk '{print $2}' | cut -d/ -f1)"
  internal_ip_count=$(echo "$INTERNAL_IP" | wc -l)

  if [[ "$internal_ip_count" -eq 0 ]]; then
    echo "No IP address found for network interface ${network_interface}! Set the IP address manually with --listen-ip or with the listenIp field in settings.json."
    exit 1
  elif [[ "$internal_ip_count" -gt 1 ]]; then
    echo "Found multiple IP addresses for network interface ${network_interface}. Please select one of the following IP addresses:"
    echo "$INTERNAL_IP"
    while true; do
      read -rp "> " USER_INTERNAL_IP
      if echo "$INTERNAL_IP" | grep -x "$USER_INTERNAL_IP"; then
        INTERNAL_IP="$USER_INTERNAL_IP"
        break
      else
        echo "Please select one of the IP addresses above. (CTRL+C to abort)"
      fi
    done
  fi
fi

env_variables_json=$(cat <<EOF
{
  "dns_ip": "9.9.9.9",
  "internal_ip": "${INTERNAL_IP}",
  "jwt_secret": "$(derive_entropy "jwt")",
  "root_folder": "${ROOT_FOLDER}",
  "tipi_version": "$(get_json_field "${ROOT_FOLDER}/package.json" version)",
  "nginx_port": 80,
  "nginx_port_ssl": 443,
  "postgres_password": "$(derive_entropy "postgres")
  "postgres_username": "tipi",
  "postgres_dbname": "tipi",
  "postgres_port": 5432,
  "postgres_host": "tipi-db",
  "redis_host": "tipi-redis",
  "repo_id": "$("${ROOT_FOLDER}"/scripts/git.sh get_hash "${apps_repository}")",
  "apps_repository": "${apps_repository}",
  "domain": "tipi.localhost",
  "storage_path": "${ROOT_FOLDER}",
  "demo_mode": false,
}
EOF
)

echo "Generating config files..."
write_log "Final values: \n${env_variables_json}"
generate_env_file "${env_variables_json}"

### --------------------------------
### Watcher and system-info
### --------------------------------
echo "Running system-info.sh..."
"${ROOT_FOLDER}/scripts/system-info.sh"

kill_watcher
"${ROOT_FOLDER}/scripts/watcher.sh" &


### --------------------------------
### Start the project
### --------------------------------
if [[ "${rc-false}" == "true" ]]; then
  docker compose -f docker-compose.rc.yml --env-file "${ROOT_FOLDER}/.env" pull
  # Run docker compose
  docker compose -f docker-compose.rc.yml --env-file "${ROOT_FOLDER}/.env" up --detach --remove-orphans --build || {
    echo "Failed to start containers"
    exit 1
  }
else
  docker compose --env-file "${ROOT_FOLDER}/.env" pull
  # Run docker compose
  docker compose --env-file "${ROOT_FOLDER}/.env" up --detach --remove-orphans --build || {
    echo "Failed to start containers"
    exit 1
  }
fi

echo "Tipi is now running"
echo ""
cat <<"EOF"
       _,.
     ,` -.)
    '( _/'-\\-.               
   /,|`--._,-^|            ,     
   \_| |`-._/||          ,'|       
     |  `-, / |         /  /      
     |     || |        /  /       
      `r-._||/   __   /  /  
  __,-<_     )`-/  `./  /
 '  \   `---'   \   /  / 
     |           |./  /  
     /           //  /     
 \_/' \         |/  /         
  |    |   _,^-'/  /              
  |    , ``  (\/  /_        
   \,.->._    \X-=/^         
   (  /   `-._//^`  
    `Y-.____(__}              
     |     {__)           
           ()`     
EOF

echo ""
echo "Visit http://${INTERNAL_IP}/ to view the dashboard"
echo ""
