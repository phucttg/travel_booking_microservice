#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/deployments/docker-compose/docker-compose.yaml"
RDS_OVERLAY_FILE="$ROOT_DIR/deployments/docker-compose/docker-compose.dev-rds.troubleshooting.yaml"
OBSERVABILITY_OVERLAY_FILE="$ROOT_DIR/deployments/docker-compose/docker-compose.observability.yaml"
SERVICES=(identity flight passenger booking payment)

use_rds=0
use_observability=0
generated_rds_files=0
compose_args=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --rds)
      use_rds=1
      shift
      ;;
    --observability)
      use_observability=1
      shift
      ;;
    --)
      shift
      compose_args+=("$@")
      break
      ;;
    *)
      compose_args+=("$1")
      shift
      ;;
  esac
done

if [[ ${#compose_args[@]} -eq 0 ]]; then
  compose_args=(up -d --build)
fi

ensure_env_file() {
  local target_path="$1"
  local template_path="$2"
  local display_path

  if [[ -f "$target_path" ]]; then
    return 0
  fi

  if [[ ! -f "$template_path" ]]; then
    echo "Missing env template: $template_path" >&2
    exit 1
  fi

  cp "$template_path" "$target_path"

  if [[ "$target_path" == "$ROOT_DIR/"* ]]; then
    display_path="${target_path#"$ROOT_DIR/"}"
  else
    display_path="$target_path"
  fi

  echo "Created $display_path from template."
}

for service in "${SERVICES[@]}"; do
  ensure_env_file \
    "$ROOT_DIR/src/$service/.env.docker" \
    "$ROOT_DIR/src/$service/.env.docker.example"

  if [[ "$use_rds" -eq 1 ]]; then
    if [[ ! -f "$ROOT_DIR/src/$service/.env.rds" ]]; then
      generated_rds_files=1
    fi

    ensure_env_file \
      "$ROOT_DIR/src/$service/.env.rds" \
      "$ROOT_DIR/src/$service/.env.rds.example"
  fi
done

compose_cmd=(docker compose -f "$COMPOSE_FILE")

if [[ "$use_rds" -eq 1 ]]; then
  compose_cmd+=(-f "$RDS_OVERLAY_FILE")
fi

if [[ "$use_observability" -eq 1 ]]; then
  compose_cmd+=(-f "$OBSERVABILITY_OVERLAY_FILE")
fi

compose_cmd+=("${compose_args[@]}")

if [[ "$use_rds" -eq 1 && "$generated_rds_files" -eq 1 ]]; then
  echo "Generated one or more .env.rds files from templates."
  echo "Update the placeholder RDS values before using the troubleshooting overlay against a real database."
fi

(
  cd "$ROOT_DIR"
  "${compose_cmd[@]}"
)
