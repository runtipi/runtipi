#!/usr/bin/env bash

source "${BASH_SOURCE%/*}/common.sh"

ROOT_FOLDER="${PWD}"
WATCH_FILE="${ROOT_FOLDER}/state/events"

function clean_events() {
    echo "Cleaning events..."

    # Create the file if it doesn't exist
    if [[ ! -f "${WATCH_FILE}" ]]; then
        touch "${WATCH_FILE}"
    fi

    echo "" >"$WATCH_FILE"

    chmod -R a+rwx "${ROOT_FOLDER}/state/events"
}

function set_status() {
    local id=$1
    local status=$2

    write_log "Setting status for ${id} to ${status}"

    # Update the status of the event
    if [[ "$(uname)" != "Linux" ]]; then
        sed -i '' "s/${id} [a-z]*/${id} ${status}/g" "${WATCH_FILE}"
    else
        sed -i "s/${id}.*$/$(echo "${id} ${status}" | sed 's/\//\\\//g')/" "$WATCH_FILE"
    fi
}

function run_command() {
    local command_path="${1}"
    local id=$2
    shift 2

    set_status "$id" "running"

    $command_path "$@" >>"${ROOT_FOLDER}/logs/${id}.log" 2>&1

    local result=$?

    echo "Command ${command_path} exited with code ${result}"

    if [[ $result -eq 0 ]]; then
        set_status "$id" "success"
    else
        set_status "$id" "error"
    fi
}

function select_command() {
    # Example command:
    # clone_repo id waiting "args"

    local command=$(echo "$1" | cut -d ' ' -f 1)
    local id=$(echo "$1" | cut -d ' ' -f 2)
    local status=$(echo "$1" | cut -d ' ' -f 3)
    local args=$(echo "$1" | cut -d ' ' -f 4-)

    if [[ "$status" != "waiting" ]]; then
        return 0
    fi

    write_log "Executing command ${command}"

    if [ -z "$command" ]; then
        return 0
    fi

    if [ "$command" = "clone_repo" ]; then
        run_command "${ROOT_FOLDER}/scripts/git.sh" "$id" "clone" "$args"
        return 0
    fi

    if [ "$command" = "update_repo" ]; then
        run_command "${ROOT_FOLDER}/scripts/git.sh" "$id" "update" "$args"
        return 0
    fi

    if [ "$command" = "app" ]; then
        local arg1=$(echo "$args" | cut -d ' ' -f 1)
        local arg2=$(echo "$args" | cut -d ' ' -f 2)

        # Args example: start filebrowser
        run_command "${ROOT_FOLDER}/scripts/app.sh" "$id" "$arg1" "$arg2"
        return 0
    fi

    if [ "$command" = "system_info" ]; then
        run_command "${ROOT_FOLDER}/scripts/system-info.sh" "$id"
        return 0
    fi

    if [ "$command" = "update" ]; then
        run_command "${ROOT_FOLDER}/scripts/system.sh" "$id" "update"
        return 0
    fi

    if [ "$command" = "restart" ]; then
        run_command "${ROOT_FOLDER}/scripts/system.sh" "$id" "restart"
        return 0
    fi

    echo "Unknown command ${command}"
    return 0
}

write_log "Listening for events in ${WATCH_FILE}..."
clean_events
# Listen in for changes in the WATCH_FILE
fswatch -0 "${WATCH_FILE}" | while read -d ""; do
    # Read the command from the last line of the file
    command=$(tail -n 1 "${WATCH_FILE}")
    status=$(echo "$command" | cut -d ' ' -f 3)

    if [ -z "$command" ] || [ "$status" != "waiting" ]; then
        continue
    else
        select_command "$command"
    fi
done
