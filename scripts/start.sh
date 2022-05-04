#!/usr/bin/env bash
set -e  # Exit immediately if a command exits with a non-zero status.

# Get field from json file
function get_json_field() {
    local json_file="$1"
    local field="$2"

    echo $(jq -r ".${field}" "${json_file}")
}

# use greadlink instead of readlink on osx
if [[ "$(uname)" == "Darwin" ]]; then
  readlink=greadlink
else
  readlink=readlink
fi

ROOT_FOLDER="$($readlink -f $(dirname "${BASH_SOURCE[0]}")/..)"
STATE_FOLDER="${ROOT_FOLDER}/state"
INTERNAL_IP="$(hostname -I | awk '{print $1}')"
DNS_IP=9.9.9.9

# Get dns ip if pihole is installed
str=$(get_json_field ${STATE_FOLDER}/apps.json installed)

# if pihole is present in str add it as DNS
if [[ $str = *"pihole"* ]]; then
  DNS_IP=10.21.21.201
fi

PUID="$(id -u)"
PGID="$(id -g)"
TZ="$(cat /etc/timezone | sed 's/\//\\\//g' || echo "Europe/Berlin")"

if [[ $UID != 0 ]]; then
    echo "Tipi must be started as root"
    echo "Please re-run this script as"
    echo "  sudo ./scripts/start"
    exit 1
fi

# Configure Umbrel if it isn't already configured
if [[ ! -f "${STATE_FOLDER}/configured" ]]; then
  "${ROOT_FOLDER}/scripts/configure.sh"
fi

# Copy the app state if it isn't here
if [[ ! -f "${STATE_FOLDER}/apps.json" ]]; then
  cp "${ROOT_FOLDER}/templates/apps-sample.json" "${STATE_FOLDER}/apps.json" && chown -R "1000:1000" "${STATE_FOLDER}/users.json"
fi

# Copy the user state if it isn't here
if [[ ! -f "${STATE_FOLDER}/users.json" ]]; then
  cp "${ROOT_FOLDER}/templates/users-sample.json" "${STATE_FOLDER}/users.json" && chown -R "1000:1000" "${STATE_FOLDER}/users.json"
fi

export DOCKER_CLIENT_TIMEOUT=240
export COMPOSE_HTTP_TIMEOUT=240

echo "Generating config files..."
# Remove current .env file
[[ -f "${ROOT_FOLDER}/.env" ]] && rm -f "${ROOT_FOLDER}/.env"

# Store paths to intermediary config files
ENV_FILE="$ROOT_FOLDER/templates/.env"

# Remove intermediary config files
[[ -f "$ENV_FILE" ]] && rm -f "$ENV_FILE"

# Copy template configs to intermediary configs
[[ -f "$ROOT_FOLDER/templates/env-sample" ]] && cp "$ROOT_FOLDER/templates/env-sample" "$ENV_FILE"

for template in "${ENV_FILE}"; do
  sed -i "s/<dns_ip>/${DNS_IP}/g" "${template}"
  sed -i "s/<internal_ip>/${INTERNAL_IP}/g" "${template}"
  sed -i "s/<puid>/${PUID}/g" "${template}"
  sed -i "s/<pgid>/${PGID}/g" "${template}"
  sed -i "s/<tz>/${TZ}/g" "${template}"
done

mv -f "$ENV_FILE" "$ROOT_FOLDER/.env"

ansible-playbook ansible/start.yml -i ansible/hosts -K

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


