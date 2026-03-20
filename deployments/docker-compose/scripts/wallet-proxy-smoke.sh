#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost}"
WALLET_SMOKE_EMAIL="${WALLET_SMOKE_EMAIL:-dev@dev.com}"
WALLET_SMOKE_PASSWORD="${WALLET_SMOKE_PASSWORD:-Admin@12345}"

fail() {
  echo "[wallet-smoke] ERROR: $1" >&2
  exit 1
}

if ! command -v curl >/dev/null 2>&1; then
  fail "curl is required."
fi

if ! command -v node >/dev/null 2>&1; then
  fail "node is required."
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

login_body="$tmp_dir/login.json"
login_status="$(curl -sS -o "$login_body" -w '%{http_code}' \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${WALLET_SMOKE_EMAIL}\",\"password\":\"${WALLET_SMOKE_PASSWORD}\"}" \
  "${BASE_URL}/api/v1/identity/login")"

if [[ "$login_status" -lt 200 || "$login_status" -ge 300 ]]; then
  fail "Login failed with status ${login_status}. Response: $(cat "$login_body")"
fi

access_token="$(node -e "const fs=require('fs');const raw=fs.readFileSync(0,'utf8');const data=JSON.parse(raw);const token=data?.access?.token; if(typeof token!=='string'||!token){process.exit(1);} process.stdout.write(token);" < "$login_body")" \
  || fail "Unable to read access token from login response."

check_wallet_endpoint() {
  local endpoint="$1"
  local payload_type="$2"
  local body_file="$tmp_dir/body_$(echo "$endpoint" | tr '/?&=' '_').json"
  local headers_file="$tmp_dir/headers_$(echo "$endpoint" | tr '/?&=' '_').txt"

  local status
  status="$(curl -sS -o "$body_file" -D "$headers_file" -w '%{http_code}' \
    -H "Authorization: Bearer ${access_token}" \
    "${BASE_URL}${endpoint}")"

  if [[ "$status" -lt 200 || "$status" -ge 300 ]]; then
    fail "Endpoint ${endpoint} failed with status ${status}. Response: $(cat "$body_file")"
  fi

  local content_type
  content_type="$(awk 'BEGIN{IGNORECASE=1} /^Content-Type:/{print $2}' "$headers_file" | tr -d '\r' | head -n 1)"
  if [[ "${content_type}" != application/json* ]]; then
    fail "Endpoint ${endpoint} returned non-JSON content-type '${content_type}'."
  fi

  if [[ "$payload_type" == "wallet" ]]; then
    node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync(0,'utf8'));if(!p||typeof p!=='object'||Array.isArray(p)||typeof p.userId!=='number'||typeof p.balance!=='number'||typeof p.currency!=='string'){process.exit(1);}" < "$body_file" \
      || fail "Endpoint ${endpoint} did not return a valid wallet object."
    return
  fi

  if [[ "$payload_type" == "topups" ]]; then
    node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync(0,'utf8'));if(!Array.isArray(p)){process.exit(1);}for(const item of p){if(!item||typeof item!=='object'||Array.isArray(item)){process.exit(1);}if(typeof item.id!=='number'||typeof item.userId!=='number'||typeof item.amount!=='number'||typeof item.currency!=='string'||typeof item.status!=='string'){process.exit(1);}}" < "$body_file" \
      || fail "Endpoint ${endpoint} did not return a valid topup request array."
    return
  fi

  fail "Unknown payload type '${payload_type}' for endpoint ${endpoint}."
}

check_wallet_endpoint "/api/v1/wallet/me" "wallet"
check_wallet_endpoint "/api/v1/wallet/topup-requests/my" "topups"

echo "[wallet-smoke] Wallet proxy smoke check passed."
