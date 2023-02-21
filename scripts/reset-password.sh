#!/usr/bin/env bash
set -euo pipefail

source "${BASH_SOURCE%/*}/common.sh"

ensure_pwd

ROOT_FOLDER="$(pwd)"
STATE_FOLDER="${ROOT_FOLDER}/state"

# Create file request-password-change in state folder
touch "${STATE_FOLDER}/password-change-request"
