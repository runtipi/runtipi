ROOT_FOLDER="$(readlink -f $(dirname "${BASH_SOURCE[0]}")/..)"
STATE_FOLDER="${ROOT_FOLDER}/state"

if [[ $UID != 0 ]]; then
    echo "Tipi must be started as root"
    echo "Please re-run this script as"
    echo "  sudo ./scripts/start"
    exit 1
fi

# Run docker-compose
# docker-compose up -d

# Get field from json file
function get_json_field() {
    local json_file="$1"
    local field="$2"

    echo $(jq -r ".${field}" "${json_file}")
}

str=$(get_json_field ${STATE_FOLDER}/apps.json installed)
apps_to_start=($str)

for app in "${apps_to_start[@]}"; do
    echo "Starting app: $app"

    # App data folder
    app_data_folder="${UMBREL_ROOT}/app-data/${app}"

    docker-compose -f ${ROOT_FOLDER}/apps/${app}/docker-compose.yml --env-file ${ROOT_FOLDER}/.env -e DATA_FOLDER=${app_data_folder} up -d
done