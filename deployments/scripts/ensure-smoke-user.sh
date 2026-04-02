#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:?BASE_URL is required}"
BASE_URL="${BASE_URL%/}"
SMOKE_USER_EMAIL="${SMOKE_USER_EMAIL:?SMOKE_USER_EMAIL is required}"
SMOKE_USER_PASSWORD="${SMOKE_USER_PASSWORD:?SMOKE_USER_PASSWORD is required}"
SMOKE_USER_NAME="${SMOKE_USER_NAME:-Smoke User}"
SMOKE_USER_PASSPORT="${SMOKE_USER_PASSPORT:-SMOKE123456}"
SMOKE_USER_AGE="${SMOKE_USER_AGE:-30}"
SMOKE_USER_PASSENGER_TYPE="${SMOKE_USER_PASSENGER_TYPE:-1}"

normalize_http_code() {
  local raw digits
  raw="${1:-}"
  digits="$(printf '%s' "$raw" | tr -cd '0-9')"

  if [[ ${#digits} -ge 3 ]]; then
    printf '%s' "${digits: -3}"
  else
    printf '%s' "$digits"
  fi
}

response_has_access_token() {
  jq -e '.access.token | strings | length > 0' "$response_file" >/dev/null 2>&1
}

login_payload="$(jq -nc \
  --arg email "$SMOKE_USER_EMAIL" \
  --arg password "$SMOKE_USER_PASSWORD" \
  '{email: $email, password: $password}')"

response_file="$(mktemp)"
trap 'rm -f "$response_file"' EXIT

login_status_raw="$(
  curl -sS -o "$response_file" -w '%{http_code}' \
    -H 'Content-Type: application/json' \
    -X POST \
    -d "$login_payload" \
    "$BASE_URL/api/v1/identity/login"
)"
login_status="$(normalize_http_code "$login_status_raw")"

if response_has_access_token; then
  echo "Smoke user already exists"
  exit 0
fi

register_payload="$(jq -nc \
  --arg email "$SMOKE_USER_EMAIL" \
  --arg password "$SMOKE_USER_PASSWORD" \
  --arg name "$SMOKE_USER_NAME" \
  --arg passportNumber "$SMOKE_USER_PASSPORT" \
  --argjson age "$SMOKE_USER_AGE" \
  --argjson passengerType "$SMOKE_USER_PASSENGER_TYPE" \
  '{
    email: $email,
    password: $password,
    name: $name,
    passportNumber: $passportNumber,
    age: $age,
    passengerType: $passengerType
  }')"

register_status_raw="$(
  curl -sS -o "$response_file" -w '%{http_code}' \
    -H 'Content-Type: application/json' \
    -X POST \
    -d "$register_payload" \
    "$BASE_URL/api/v1/identity/register"
)"
register_status="$(normalize_http_code "$register_status_raw")"

if [[ "$register_status" != "201" && "$register_status" != "409" ]]; then
  echo "Failed to provision smoke user" >&2
  cat "$response_file" >&2
  exit 1
fi

login_status_raw="$(
  curl -sS -o "$response_file" -w '%{http_code}' \
    -H 'Content-Type: application/json' \
    -X POST \
    -d "$login_payload" \
    "$BASE_URL/api/v1/identity/login"
)"
login_status="$(normalize_http_code "$login_status_raw")"

if ! response_has_access_token; then
  echo "Smoke user provisioning succeeded but login still fails (status: ${login_status:-unknown})" >&2
  cat "$response_file" >&2
  exit 1
fi

echo "Smoke user is ready"
