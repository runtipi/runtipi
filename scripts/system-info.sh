#!/usr/bin/env bash
set -e # Exit immediately if a command exits with a non-zero status.

source "${BASH_SOURCE%/*}/common.sh"

ensure_pwd

ROOT_FOLDER="$(pwd)"
STATE_FOLDER="${ROOT_FOLDER}/state"

# Available disk space
TOTAL_DISK_SPACE_BYTES=$(df -P -B 1 / | tail -n 1 | awk '{print $2}')
AVAILABLE_DISK_SPACE_BYTES=$(df -P -B 1 / | tail -n 1 | awk '{print $4}')
USED_DISK_SPACE_BYTES=$((TOTAL_DISK_SPACE_BYTES - AVAILABLE_DISK_SPACE_BYTES))

# CPU info
CPU_LOAD_PERCENTAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')

# Memory info
MEM_TOTAL_BYTES=$(($(grep </proc/meminfo MemTotal | awk '{print $2}') * 1024))
MEM_AVAILABLE_BYTES=$(($(grep </proc/meminfo MemAvailable | awk '{print $2}') * 1024))
MEM_USED_BYTES=$((MEM_TOTAL_BYTES - MEM_AVAILABLE_BYTES))

# Create temporary json file
TEMP_JSON_FILE=$(mktemp)
echo '{ "cpu": { "load": '"${CPU_LOAD_PERCENTAGE}"' }, "memory": { "total": '"${MEM_TOTAL_BYTES}"' , "used": '"${MEM_USED_BYTES}"', "available": '"${MEM_AVAILABLE_BYTES}"' }, "disk": { "total": '"${TOTAL_DISK_SPACE_BYTES}"' , "used": '"${USED_DISK_SPACE_BYTES}"', "available": '"${AVAILABLE_DISK_SPACE_BYTES}"' } }' >"${TEMP_JSON_FILE}"

# Write to state file
cat "${TEMP_JSON_FILE}" >"${STATE_FOLDER}/system-info.json"
