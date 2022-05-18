#!/usr/bin/env bash
set -e # Exit immediately if a command exits with a non-zero status.

# use greadlink instead of readlink on osx
if [[ "$(uname)" == "Darwin" ]]; then
  readlink=greadlink
else
  readlink=readlink
fi

NGINX_PORT=80
PROXY_PORT=8080

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
  --)
    shift # The double dash makes them parameters
    break
    ;;
  *) echo "Option $1 not recognized" && exit 1 ;;
  esac
  shift
done

# Check we are on linux
if [[ "$(uname)" != "Linux" ]]; then
  echo "Tipi only works on Linux"
  exit 1
fi

ROOT_FOLDER="$($readlink -f $(dirname "${BASH_SOURCE[0]}")/..)"
STATE_FOLDER="${ROOT_FOLDER}/state"
SED_ROOT_FOLDER="$(echo $ROOT_FOLDER | sed 's/\//\\\//g')"
INTERNAL_IP="$(hostname -I | awk '{print $1}')"
DNS_IP=9.9.9.9 # Default to Quad9 DNS
ARCHITECTURE="$(uname -m)"

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
if [[ ! -f "${STATE_FOLDER}/configured" ]]; then
  "${ROOT_FOLDER}/scripts/configure.sh"
fi

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

PUID="$(id -u)"
PGID="$(id -g)"
TZ="$(cat /etc/timezone | sed 's/\//\\\//g' || echo "Europe/Berlin")"

# Copy the app state if it isn't here
if [[ ! -f "${STATE_FOLDER}/apps.json" ]]; then
  cp "${ROOT_FOLDER}/templates/apps-sample.json" "${STATE_FOLDER}/apps.json"
fi

# Copy the user state if it isn't here
if [[ ! -f "${STATE_FOLDER}/users.json" ]]; then
  cp "${ROOT_FOLDER}/templates/users-sample.json" "${STATE_FOLDER}/users.json"
fi

chown -R 1000:1000 "${STATE_FOLDER}/apps.json"
chown -R 1000:1000 "${STATE_FOLDER}/users.json"

# Get current dns from host
if [[ -f "/etc/resolv.conf" ]]; then
  TEMP=$(cat /etc/resolv.conf | grep -E -o '[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}' | head -n 1)
fi

# Get dns ip if pihole is installed
str=$(get_json_field ${STATE_FOLDER}/apps.json installed)

# if pihole is present in str add it as DNS
if [[ $str = *"pihole"* ]]; then
  DNS_IP=10.21.21.201
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
[[ -f "${ROOT_FOLDER}/packages/system-api/.env" ]] && rm -f "${ROOT_FOLDER}/packages/system-api/.env"

# Store paths to intermediary config files
ENV_FILE=$(mktemp)

# Copy template configs to intermediary configs
[[ -f "$ROOT_FOLDER/templates/env-sample" ]] && cp "$ROOT_FOLDER/templates/env-sample" "$ENV_FILE"

JWT_SECRET=$(derive_entropy "jwt")

for template in "${ENV_FILE}"; do
  sed -i "s/<dns_ip>/${DNS_IP}/g" "${template}"
  sed -i "s/<internal_ip>/${INTERNAL_IP}/g" "${template}"
  sed -i "s/<puid>/${PUID}/g" "${template}"
  sed -i "s/<pgid>/${PGID}/g" "${template}"
  sed -i "s/<tz>/${TZ}/g" "${template}"
  sed -i "s/<jwt_secret>/${JWT_SECRET}/g" "${template}"
  sed -i "s/<root_folder>/${SED_ROOT_FOLDER}/g" "${template}"
  sed -i "s/<tipi_version>/$(cat "${ROOT_FOLDER}/VERSION")/g" "${template}"
  sed -i "s/<architecture>/${ARCHITECTURE}/g" "${template}"
  sed -i "s/<nginx_port>/${NGINX_PORT}/g" "${template}"
  sed -i "s/<proxy_port>/${PROXY_PORT}/g" "${template}"
done

mv -f "$ENV_FILE" "$ROOT_FOLDER/.env"

# Run system-info.sh
echo "Running system-info.sh..."
bash "${ROOT_FOLDER}/scripts/system-info.sh"

# Give permissions 1000:1000 to app data
# chown -R 1000:1000 "${ROOT_FOLDER}/app-data"

## Don't run if config-only
if [[ ! $ci == "true" ]]; then

  if [[ $rc == "true" ]]; then
    docker-compose -f docker-compose.rc.yml --env-file "${ROOT_FOLDER}/.env" pull
    # Run docker-compose
    docker-compose -f docker-compose.rc.yml --env-file "${ROOT_FOLDER}/.env" up --detach --remove-orphans --build || {
      echo "Failed to start containers"
      exit 1
    }
  else
    docker-compose --env-file "${ROOT_FOLDER}/.env" pull
    # Run docker-compose
    docker-compose --env-file "${ROOT_FOLDER}/.env" up --detach --remove-orphans --build || {
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
