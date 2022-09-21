#!/usr/bin/env bash

# Required Notice: Copyright
# Umbrel (https://umbrel.com)

set -e # Exit immediately if a command exits with a non-zero status.

NGINX_PORT=80
NGINX_PORT_SSL=443
PROXY_PORT=8080
DOMAIN=tipi.localhost

# Check we are on linux
if [[ "$(uname)" != "Linux" ]]; then
  echo "Tipi only works on Linux"
  exit 1
fi

NETWORK_INTERFACE="$(ip route | grep default | awk '{print $5}' | uniq)"
INTERNAL_IP="$(ip addr show "${NETWORK_INTERFACE}" | grep "inet " | awk '{print $2}' | cut -d/ -f1)"

while [ -n "$1" ]; do # while loop starts
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
  --proxy-port)
    proxy_port="$2"

    if [[ "${proxy_port}" =~ ^[0-9]+$ ]]; then
      PROXY_PORT="${proxy_port}"
    else
      echo "--proxy-port must be a number"
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

# Ensure BASH_SOURCE is ./scripts/start.sh
if [[ $(basename $(pwd)) != "runtipi" ]] || [[ ! -f "${BASH_SOURCE[0]}" ]]; then
  echo "Please make sure this script is executed from runtipi/"
  exit 1
fi

# If port is not 80 and domain is not tipi.localhost, we exit
if [[ "${NGINX_PORT}" != "80" ]] && [[ "${DOMAIN}" != "tipi.localhost" ]]; then
  echo "Using a custom domain with a custom port is not supported"
  exit 1
fi

ROOT_FOLDER="${PWD}"
STATE_FOLDER="${ROOT_FOLDER}/state"
SED_ROOT_FOLDER="$(echo $ROOT_FOLDER | sed 's/\//\\\//g')"

DNS_IP=9.9.9.9 # Default to Quad9 DNS
ARCHITECTURE="$(uname -m)"
TZ="$(timedatectl | grep "Time zone" | awk '{print $3}' | sed 's/\//\\\//g' || Europe\/Berlin)"
APPS_REPOSITORY="https://github.com/meienberger/runtipi-appstore"
REPO_ID="$(${ROOT_FOLDER}/scripts/git.sh get_hash ${APPS_REPOSITORY})"
APPS_REPOSITORY_ESCAPED="$(echo ${APPS_REPOSITORY} | sed 's/\//\\\//g')"

if [[ "$ARCHITECTURE" == "aarch64" ]]; then
  ARCHITECTURE="arm64"
fi

if [[ $UID != 0 ]]; then
  echo "Tipi must be started as root"
  echo "Please re-run this script as"
  echo "  sudo ./scripts/start"
  exit 1
fi

# Configure Tipi if it isn't already configured
"${ROOT_FOLDER}/scripts/configure.sh"

# Get field from json file
function get_json_field() {
  local json_file="$1"
  local field="$2"

  echo $(jq -r ".${field}" "${json_file}")
}

# Deterministically derives 128 bits of cryptographically secure entropy
function derive_entropy() {
  SEED_FILE="${STATE_FOLDER}/seed"
  identifier="${1}"
  tipi_seed=$(cat "${SEED_FILE}") || true

  if [[ -z "$tipi_seed" ]] || [[ -z "$identifier" ]]; then
    echo >&2 "Missing derivation parameter, this is unsafe, exiting."
    exit 1
  fi

  # We need `sed 's/^.* //'` to trim the "(stdin)= " prefix from some versions of openssl
  printf "%s" "${identifier}" | openssl dgst -sha256 -hmac "${tipi_seed}" | sed 's/^.* //'
}

# Copy the config sample if it isn't here
if [[ ! -f "${STATE_FOLDER}/apps.json" ]]; then
  cp "${ROOT_FOLDER}/templates/config-sample.json" "${STATE_FOLDER}/config.json"
fi

# Get current dns from host
if [[ -f "/etc/resolv.conf" ]]; then
  TEMP=$(grep -E -o '[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}' /etc/resolv.conf | head -n 1)
fi

# Create seed file with cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1
if [[ ! -f "${STATE_FOLDER}/seed" ]]; then
  echo "Generating seed..."
  cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1 >"${STATE_FOLDER}/seed"
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

JWT_SECRET=$(derive_entropy "jwt")
POSTGRES_PASSWORD=$(derive_entropy "postgres")
TIPI_VERSION=$(get_json_field "${ROOT_FOLDER}/package.json" version)

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
    APPS_REPOSITORY_ESCAPED="$(echo ${APPS_REPOSITORY} | sed 's/\//\\\//g')"
  fi

  # If appsRepoId is set in settings.json, use it
  if [[ "$(get_json_field "${STATE_FOLDER}/settings.json" appsRepoId)" != "null" ]]; then
    REPO_ID=$(get_json_field "${STATE_FOLDER}/settings.json" appsRepoId)
  fi

fi

echo "Creating .env file with the following values:"
echo "  DOMAIN=${DOMAIN}"
echo "  INTERNAL_IP=${INTERNAL_IP}"
echo "  NGINX_PORT=${NGINX_PORT}"
echo "  NGINX_PORT_SSL=${NGINX_PORT_SSL}"
echo "  PROXY_PORT=${PROXY_PORT}"
echo "  DNS_IP=${DNS_IP}"
echo "  ARCHITECTURE=${ARCHITECTURE}"
echo "  TZ=${TZ}"
echo "  APPS_REPOSITORY=${APPS_REPOSITORY}"
echo "  REPO_ID=${REPO_ID}"
echo "  JWT_SECRET=<redacted>"
echo "  POSTGRES_PASSWORD=<redacted>"
echo "  TIPI_VERSION=${TIPI_VERSION}"
echo "  ROOT_FOLDER=${SED_ROOT_FOLDER}"
echo "  APPS_REPOSITORY=${APPS_REPOSITORY_ESCAPED}"

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
  sed -i "s/<proxy_port>/${PROXY_PORT}/g" "${template}"
  sed -i "s/<postgres_password>/${POSTGRES_PASSWORD}/g" "${template}"
  sed -i "s/<apps_repo_id>/${REPO_ID}/g" "${template}"
  sed -i "s/<apps_repo_url>/${APPS_REPOSITORY_ESCAPED}/g" "${template}"
  sed -i "s/<domain>/${DOMAIN}/g" "${template}"
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
