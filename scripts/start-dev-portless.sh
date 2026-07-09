#!/usr/bin/env bash

set -euo pipefail

BASE_NAME="${RUNTIPI_DEV_NAME:-runtipi}"

slugify() {
  local value="$1"
  local slug

  slug=$(printf "%s" "$value" | tr '[:upper:]' '[:lower:]' | tr -cs '[:alnum:]' '-')
  slug="${slug#-}"
  slug="${slug%-}"

  if [ -z "$slug" ]; then
    slug="dev"
  fi

  printf "%s" "$slug"
}

absolute_path_from() {
  local base="$1"
  local path="$2"

  if [[ "$path" = /* ]]; then
    printf "%s" "$path"
    return
  fi

  (cd "$base/$path" >/dev/null 2>&1 && pwd -P)
}

detect_worktree_slug() {
  local root
  root=$(git rev-parse --show-toplevel 2>/dev/null || true)

  if [ -z "$root" ]; then
    return
  fi

  local git_dir
  local common_dir_raw
  git_dir=$(git rev-parse --absolute-git-dir 2>/dev/null || true)
  common_dir_raw=$(git rev-parse --git-common-dir 2>/dev/null || true)

  if [ -z "$git_dir" ] || [ -z "$common_dir_raw" ]; then
    return
  fi

  local common_dir
  common_dir=$(absolute_path_from "$root" "$common_dir_raw")

  if [ "$git_dir" = "$common_dir" ]; then
    return
  fi

  local branch_name
  branch_name=$(git branch --show-current 2>/dev/null || true)

  if [ -z "$branch_name" ]; then
    branch_name=$(basename "$root")
  fi

  slugify "$branch_name"
}

derive_base_port() {
  local name="$1"
  local checksum_output
  local checksum

  checksum_output=$(printf "%s" "$name" | cksum)
  checksum=${checksum_output%% *}

  printf "%s" $((20000 + (checksum % 20000)))
}

WORKTREE_SLUG="${RUNTIPI_DEV_WORKTREE_SLUG:-$(detect_worktree_slug)}"

if [ -n "${RUNTIPI_DEV_ROUTE_NAME:-}" ]; then
  ROUTE_NAME="$RUNTIPI_DEV_ROUTE_NAME"
elif [ -n "$WORKTREE_SLUG" ]; then
  ROUTE_NAME="$WORKTREE_SLUG.$BASE_NAME"
else
  ROUTE_NAME="$BASE_NAME"
fi

COMPOSE_PROJECT_SLUG=$(slugify "${ROUTE_NAME//./-}")

if [ -n "$WORKTREE_SLUG" ]; then
  DEFAULT_BASE_PORT=$(derive_base_port "$ROUTE_NAME")
  DEFAULT_DEV_PORT="$DEFAULT_BASE_PORT"
  DEFAULT_DB_PORT=$((DEFAULT_BASE_PORT + 1))
  DEFAULT_HTTP_PORT=$((DEFAULT_BASE_PORT + 2))
  DEFAULT_HTTPS_PORT=$((DEFAULT_BASE_PORT + 3))
  DEFAULT_TRAEFIK_DASHBOARD_PORT=$((DEFAULT_BASE_PORT + 4))
  DEFAULT_COMPOSE_PROJECT="$COMPOSE_PROJECT_SLUG"
  DEFAULT_NETWORK="${COMPOSE_PROJECT_SLUG}_tipi_main_network"
else
  DEFAULT_DEV_PORT=3000
  DEFAULT_DB_PORT=5432
  DEFAULT_HTTP_PORT=80
  DEFAULT_HTTPS_PORT=443
  DEFAULT_TRAEFIK_DASHBOARD_PORT=8080
  DEFAULT_COMPOSE_PROJECT="runtipi"
  DEFAULT_NETWORK="runtipi_tipi_main_network"
fi

export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-$DEFAULT_COMPOSE_PROJECT}"
export RUNTIPI_DOCKER_NETWORK="${RUNTIPI_DOCKER_NETWORK:-$DEFAULT_NETWORK}"
export RUNTIPI_DEV_PORT="${RUNTIPI_DEV_PORT:-$DEFAULT_DEV_PORT}"
export RUNTIPI_DB_PORT="${RUNTIPI_DB_PORT:-$DEFAULT_DB_PORT}"
export RUNTIPI_HTTP_PORT="${RUNTIPI_HTTP_PORT:-$DEFAULT_HTTP_PORT}"
export RUNTIPI_HTTPS_PORT="${RUNTIPI_HTTPS_PORT:-$DEFAULT_HTTPS_PORT}"
export RUNTIPI_TRAEFIK_DASHBOARD_PORT="${RUNTIPI_TRAEFIK_DASHBOARD_PORT:-$DEFAULT_TRAEFIK_DASHBOARD_PORT}"
export PORTLESS_PORT="${PORTLESS_PORT:-1355}"

if command -v portless >/dev/null 2>&1; then
  if portless proxy start >/dev/null && portless alias "$ROUTE_NAME" "$RUNTIPI_DEV_PORT" --force >/dev/null; then
    if [ -n "${RUNTIPI_DEV_ROUTE_NAME:-}" ]; then
      ROUTE_URL=$(printf "https://%s.localhost:%s" "$ROUTE_NAME" "$PORTLESS_PORT")
    else
      ROUTE_URL=$(portless get "$BASE_NAME" 2>/dev/null || printf "https://%s.localhost:%s" "$ROUTE_NAME" "$PORTLESS_PORT")
    fi

    printf "Portless route: %s -> localhost:%s\n" "$ROUTE_URL" "$RUNTIPI_DEV_PORT"
  else
    printf "Portless setup failed; continuing without https://%s.localhost.\n" "$ROUTE_NAME"
  fi
else
  printf "Portless is not installed; install it with 'npm install -g portless' to use https://%s.localhost.\n" "$ROUTE_NAME"
fi

printf "Docker project: %s\n" "$COMPOSE_PROJECT_NAME"
printf "Dashboard port: http://localhost:%s\n" "$RUNTIPI_DEV_PORT"

exec docker compose -f docker-compose.dev.yml up --build "$@"
