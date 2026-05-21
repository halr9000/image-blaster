#!/usr/bin/env bash
# Runtime launcher — pulls secrets from BWS, never writes them to disk
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Get BWS token from openclaw gateway service env
BWS_ACCESS_TOKEN="$(systemctl --user cat openclaw-gateway | grep BWS_ACCESS_TOKEN | sed 's/.*Environment="BWS_ACCESS_TOKEN=\(.*\)".*/\1/')"
export BWS_ACCESS_TOKEN

export WORLD_LABS_API_KEY="$(bws secret get 02df0536-ef43-48f4-97b5-b45000ca05d3 --output json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['value'])")"
export FAL_KEY="$(bws secret get 62bda555-c65c-4807-8479-b43a00c1f616 --output json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['value'])")"

cd "$SCRIPT_DIR"
exec "$@"
