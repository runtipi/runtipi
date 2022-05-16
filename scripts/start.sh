#!/usr/bin/env bash
set -e  # Exit immediately if a command exits with a non-zero status.

# use greadlink instead of readlink on osx
if [[ "$(uname)" == "Darwin" ]]; then
  readlink=greadlink
else
  readlink=readlink
fi

ROOT_FOLDER="$($readlink -f $(dirname "${BASH_SOURCE[0]}")/..)"
STATE_FOLDER="${ROOT_FOLDER}/state"
SED_ROOT_FOLDER="$(echo $ROOT_FOLDER | sed 's/\//\\\//g')"
INTERNAL_IP="$(hostname -I | awk '{print $1}')"
DNS_IP=9.9.9.9 # Default to Quad9 DNS
USERNAME="$(id -nu 1000)"

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
    >&2 echo "Missing derivation parameter, this is unsafe, exiting."
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

# Get dns ip if pihole is installed
str=$(get_json_field ${STATE_FOLDER}/apps.json installed)

# if pihole is present in str add it as DNS
if [[ $str = *"pihole"* ]]; then
  DNS_IP=10.21.21.201
fi

# Create seed file with cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1
if [[ ! -f "${STATE_FOLDER}/seed" ]]; then
  echo "Generating seed..."
  cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1 > "${STATE_FOLDER}/seed"
fi

export DOCKER_CLIENT_TIMEOUT=240
export COMPOSE_HTTP_TIMEOUT=240

echo "Generating config files..."
# Remove current .env file
[[ -f "${ROOT_FOLDER}/.env" ]] && rm -f "${ROOT_FOLDER}/.env"
[[ -f "${ROOT_FOLDER}/packages/system-api/.env" ]] && rm -f "${ROOT_FOLDER}/packages/system-api/.env"

# Store paths to intermediary config files
ENV_FILE="$ROOT_FOLDER/templates/.env"
ENV_FILE_SYSTEM_API="$ROOT_FOLDER/templates/.env-api"

# Remove intermediary config files
[[ -f "$ENV_FILE" ]] && rm -f "$ENV_FILE"
[[ -f "$ENV_FILE_SYSTEM_API" ]] && rm -f "$ENV_FILE_SYSTEM_API"

# Copy template configs to intermediary configs
[[ -f "$ROOT_FOLDER/templates/env-sample" ]] && cp "$ROOT_FOLDER/templates/env-sample" "$ENV_FILE"
[[ -f "$ROOT_FOLDER/templates/env-api-sample" ]] && cp "$ROOT_FOLDER/templates/env-api-sample" "$ENV_FILE_SYSTEM_API"

JWT_SECRET=$(derive_entropy "jwt")

for template in "${ENV_FILE}" "${ENV_FILE_SYSTEM_API}"; do
  sed -i "s/<dns_ip>/${DNS_IP}/g" "${template}"
  sed -i "s/<internal_ip>/${INTERNAL_IP}/g" "${template}"
  sed -i "s/<puid>/${PUID}/g" "${template}"
  sed -i "s/<pgid>/${PGID}/g" "${template}"
  sed -i "s/<tz>/${TZ}/g" "${template}"
  sed -i "s/<jwt_secret>/${JWT_SECRET}/g" "${template}"
  sed -i "s/<root_folder>/${SED_ROOT_FOLDER}/g" "${template}"
done

mv -f "$ENV_FILE" "$ROOT_FOLDER/.env"
mv -f "$ENV_FILE_SYSTEM_API" "$ROOT_FOLDER/packages/system-api/.env"

# ansible-playbook ansible/start.yml -i ansible/hosts -K -e username="$USERNAME"

# Run docker-compose
docker-compose --env-file "${ROOT_FOLDER}/.env" up --detach --remove-orphans --build || {
  echo "Failed to start containers"
  exit 1
}

str=$(get_json_field ${STATE_FOLDER}/apps.json installed)
apps_to_start=($str)

# for app in "${apps_to_start[@]}"; do
#     "${ROOT_FOLDER}/scripts/app.sh" start $app
# done

echo "Tipi is now running"
echo ""
cat << "EOF"
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


