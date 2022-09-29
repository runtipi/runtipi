#!/usr/bin/env bash

set -e # Exit immediately if a command exits with a non-zero status.

source "${BASH_SOURCE%/*}/common.sh"

write_log "Starting Tipi..."

ROOT_FOLDER="${PWD}"

# Cleanup and ensure environment
ensure_linux
ensure_pwd
ensure_root
clean_logs

# Default variables
NGINX_PORT=80
NGINX_PORT_SSL=443
DOMAIN=tipi.localhost
NETWORK_INTERFACE="$(ip route | grep default | awk '{print $5}' | uniq)"
INTERNAL_IP="$(ip addr show "${NETWORK_INTERFACE}" | grep "inet " | awk '{print $2}' | cut -d/ -f1)"
STATE_FOLDER="${ROOT_FOLDER}/state"
SED_ROOT_FOLDER="$(echo "$ROOT_FOLDER" | sed 's/\//\\\//g')"
DNS_IP=9.9.9.9 # Default to Quad9 DNS
ARCHITECTURE="$(uname -m)"
TZ="$(timedatectl | grep "Time zone" | awk '{print $3}' | sed 's/\//\\\//g' || Europe\/Berlin)"
apps_repository="https://github.com/meienberger/runtipi-appstore"
REPO_ID="$("${ROOT_FOLDER}"/scripts/git.sh get_hash ${apps_repository})"
APPS_REPOSITORY_ESCAPED="$(echo ${apps_repository} | sed 's/\//\\\//g')"
JWT_SECRET=$(derive_entropy "jwt")
POSTGRES_PASSWORD=$(derive_entropy "postgres")
TIPI_VERSION=$(get_json_field "${ROOT_FOLDER}/package.json" version)
storage_path="${ROOT_FOLDER}"
STORAGE_PATH_ESCAPED="$(echo "${storage_path}" | sed 's/\//\\\//g')"

if [[ "$ARCHITECTURE" == "aarch64" ]]; then
  ARCHITECTURE="arm64"
fi

# Parse arguments
while [ -n "$1" ]; do
  case "$1" in
  --rc) rc="true" ;;
  --ci) ci="true" ;;
  --port)
    port="$2"

    if [[ "${port}" =~ ^[0-9]+$ ]]; then
      NGINX_PORT="${port}"
    else
      echo "--port must be a number"
      exit 1
    fi
    shift
    ;;
  --ssl-port)
    ssl_port="$2"

    if [[ "${ssl_port}" =~ ^[0-9]+$ ]]; then
      NGINX_PORT_SSL="${ssl_port}"
    else
      echo "--ssl-port must be a number"
      exit 1
    fi
    shift
    ;;
  --domain)
    domain="$2"

    if [[ "${domain}" =~ ^[a-zA-Z0-9.-]+$ ]]; then
      DOMAIN="${domain}"
    else
      echo "--domain must be a valid domain"
      exit 1
    fi
    shift
    ;;
  --listen-ip)
    listen_ip="$2"

    if [[ "${listen_ip}" =~ ^[a-fA-F0-9.:]+$ ]]; then
      INTERNAL_IP="${listen_ip}"
    else
      echo "--listen-ip must be a valid IP address"
      exit 1
    fi
    shift
    ;;
  --)
    shift # The double dash makes them parameters
    break
    ;;
  *) echo "Option $1 not recognized" && exit 1 ;;
  esac
  shift
done

# If port is not 80 and domain is not tipi.localhost, we exit
if [[ "${NGINX_PORT}" != "80" ]] && [[ "${DOMAIN}" != "tipi.localhost" ]]; then
  echo "Using a custom domain with a custom port is not supported"
  exit 1
fi

# Configure Tipi
"${ROOT_FOLDER}/scripts/configure.sh"

# Copy the config sample if it isn't here
if [[ ! -f "${STATE_FOLDER}/apps.json" ]]; then
  cp "${ROOT_FOLDER}/templates/config-sample.json" "${STATE_FOLDER}/config.json"
fi

# Create seed file with cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1
if [[ ! -f "${STATE_FOLDER}/seed" ]]; then
  echo "Generating seed..."
  tr </dev/urandom -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1 >"${STATE_FOLDER}/seed"
fi

export DOCKER_CLIENT_TIMEOUT=240
export COMPOSE_HTTP_TIMEOUT=240

echo "Generating config files..."
# Remove current .env file
[[ -f "${ROOT_FOLDER}/.env" ]] && rm -f "${ROOT_FOLDER}/.env"

# Store paths to intermediary config files
ENV_FILE=$(mktemp)

# Copy template configs to intermediary configs
[[ -f "$ROOT_FOLDER/templates/env-sample" ]] && cp "$ROOT_FOLDER/templates/env-sample" "$ENV_FILE"

# Override vars with values from settings.json
if [[ -f "${STATE_FOLDER}/settings.json" ]]; then

  # If dnsIp is set in settings.json, use it
  if [[ "$(get_json_field "${STATE_FOLDER}/settings.json" dnsIp)" != "null" ]]; then
    DNS_IP=$(get_json_field "${STATE_FOLDER}/settings.json" dnsIp)
  fi

  # If domain is set in settings.json, use it
  if [[ "$(get_json_field "${STATE_FOLDER}/settings.json" domain)" != "null" ]]; then
    DOMAIN=$(get_json_field "${STATE_FOLDER}/settings.json" domain)
  fi

  # If appsRepoUrl is set in settings.json, use it
  if [[ "$(get_json_field "${STATE_FOLDER}/settings.json" appsRepoUrl)" != "null" ]]; then
    APPS_REPOSITORY_ESCAPED="$(echo ${apps_repository} | sed 's/\//\\\//g')"
  fi

  # If appsRepoId is set in settings.json, use it
  if [[ "$(get_json_field "${STATE_FOLDER}/settings.json" appsRepoId)" != "null" ]]; then
    REPO_ID=$(get_json_field "${STATE_FOLDER}/settings.json" appsRepoId)
  fi

  # If port is set in settings.json, use it
  if [[ "$(get_json_field "${STATE_FOLDER}/settings.json" port)" != "null" ]]; then
    NGINX_PORT=$(get_json_field "${STATE_FOLDER}/settings.json" port)
  fi

  # If sslPort is set in settings.json, use it
  if [[ "$(get_json_field "${STATE_FOLDER}/settings.json" sslPort)" != "null" ]]; then
    NGINX_PORT_SSL=$(get_json_field "${STATE_FOLDER}/settings.json" sslPort)
  fi

  # If listenIp is set in settings.json, use it
  if [[ "$(get_json_field "${STATE_FOLDER}/settings.json" listenIp)" != "null" ]]; then
    INTERNAL_IP=$(get_json_field "${STATE_FOLDER}/settings.json" listenIp)
  fi

  # If storagePath is set in settings.json, use it
  if [[ "$(get_json_field "${STATE_FOLDER}/settings.json" storagePath)" != "null" ]]; then
    storage_path="$(get_json_field "${STATE_FOLDER}/settings.json" storagePath)"
    STORAGE_PATH_ESCAPED="$(echo "${storage_path}" | sed 's/\//\\\//g')"
  fi
fi

# Set array with all new values
new_values="DOMAIN=${DOMAIN}\nDNS_IP=${DNS_IP}\nAPPS_REPOSITORY=${APPS_REPOSITORY_ESCAPED}\nREPO_ID=${REPO_ID}\nNGINX_PORT=${NGINX_PORT}\nNGINX_PORT_SSL=${NGINX_PORT_SSL}\nINTERNAL_IP=${INTERNAL_IP}\nSTORAGE_PATH=${STORAGE_PATH_ESCAPED}\nTZ=${TZ}\nJWT_SECRET=${JWT_SECRET}\nROOT_FOLDER=${SED_ROOT_FOLDER}\nTIPI_VERSION=${TIPI_VERSION}\nARCHITECTURE=${ARCHITECTURE}"
write_log "Final values: \n${new_values}"

for template in ${ENV_FILE}; do
  sed -i "s/<dns_ip>/${DNS_IP}/g" "${template}"
  sed -i "s/<internal_ip>/${INTERNAL_IP}/g" "${template}"
  sed -i "s/<tz>/${TZ}/g" "${template}"
  sed -i "s/<jwt_secret>/${JWT_SECRET}/g" "${template}"
  sed -i "s/<root_folder>/${SED_ROOT_FOLDER}/g" "${template}"
  sed -i "s/<tipi_version>/${TIPI_VERSION}/g" "${template}"
  sed -i "s/<architecture>/${ARCHITECTURE}/g" "${template}"
  sed -i "s/<nginx_port>/${NGINX_PORT}/g" "${template}"
  sed -i "s/<nginx_port_ssl>/${NGINX_PORT_SSL}/g" "${template}"
  sed -i "s/<postgres_password>/${POSTGRES_PASSWORD}/g" "${template}"
  sed -i "s/<apps_repo_id>/${REPO_ID}/g" "${template}"
  sed -i "s/<apps_repo_url>/${APPS_REPOSITORY_ESCAPED}/g" "${template}"
  sed -i "s/<domain>/${DOMAIN}/g" "${template}"
  sed -i "s/<storage_path>/${STORAGE_PATH_ESCAPED}/g" "${template}"
done

mv -f "$ENV_FILE" "$ROOT_FOLDER/.env"

# Run system-info.sh
echo "Running system-info.sh..."
bash "${ROOT_FOLDER}/scripts/system-info.sh"

# Add crontab to run system-info.sh every minute
! (crontab -l | grep -q "${ROOT_FOLDER}/scripts/system-info.sh") && (
  crontab -l
  echo "* * * * * ${ROOT_FOLDER}/scripts/system-info.sh"
) | crontab -

## Don't run if config-only
if [[ ! $ci == "true" ]]; then

  if [[ $rc == "true" ]]; then
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

port_display=""
if [[ $NGINX_PORT != "80" ]]; then
  port_display=":${NGINX_PORT}"
fi

echo ""
echo "Visit http://${INTERNAL_IP}${port_display}/ to view the dashboard"
echo ""
