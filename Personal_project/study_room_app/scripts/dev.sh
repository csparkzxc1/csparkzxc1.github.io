#!/usr/bin/env bash
# One-shot local development bootstrap.
# Usage: scripts/dev.sh [--reset]
#   --reset   Drop existing Postgres volume and reseed demo data.
#
# Spins up Postgres via docker compose, applies migrations, seeds demo data,
# starts the API, detects the LAN IP, and boots Expo so a phone on the same
# Wi-Fi can connect via Expo Go.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

RESET=false
for arg in "$@"; do
  case "$arg" in
    --reset) RESET=true ;;
    -h|--help)
      sed -n '2,12p' "$0"; exit 0 ;;
  esac
done

have() { command -v "$1" >/dev/null 2>&1; }

need_node() {
  if ! have node; then
    echo "✖ node not found. Install Node 20+ first."; exit 1
  fi
  local major
  major="$(node -p "process.versions.node.split('.')[0]")"
  if [ "$major" -lt 20 ]; then
    echo "✖ Node $major detected; need 20+."; exit 1
  fi
}

detect_ip() {
  if have ipconfig && [[ "$(uname)" == "Darwin" ]]; then
    ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true
  elif have hostname; then
    hostname -I 2>/dev/null | awk '{print $1}'
  fi
}

echo "▶ 1/6  Checking prerequisites"
need_node
if ! have docker; then
  echo "  ! docker not found; will assume a local Postgres is already running."
  USE_DOCKER=false
else
  USE_DOCKER=true
fi

echo "▶ 2/6  Installing npm workspaces"
if [ ! -d node_modules ]; then
  npm install
else
  echo "  ✓ node_modules already exists; skipping"
fi

echo "▶ 3/6  Preparing Postgres"
if [ "$USE_DOCKER" = true ]; then
  if [ "$RESET" = true ]; then
    docker compose down -v
  fi
  docker compose up -d db
  echo -n "  waiting for db to accept connections"
  for _ in $(seq 1 30); do
    if docker compose exec -T db pg_isready -U study >/dev/null 2>&1; then
      echo " ✓"; break
    fi
    echo -n "."; sleep 1
  done
fi

ENV_FILE="$ROOT/apps/api/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "▶ 4/6  Writing apps/api/.env"
  cat > "$ENV_FILE" <<ENV
DATABASE_URL=postgresql://study:study@localhost:5432/study_room?schema=public
PORT=4000
ENV
else
  echo "▶ 4/6  apps/api/.env exists; leaving alone"
fi

echo "▶ 5/6  Applying migrations + demo seed"
npm run prisma:migrate --workspace apps/api --silent || true
npm run seed:demo --workspace apps/api --silent

IP="$(detect_ip || true)"
if [ -z "${IP:-}" ]; then
  IP="localhost"
  echo "  ! Could not detect LAN IP; defaulting to localhost. Phone won't reach API."
fi

echo "▶ 6/6  Starting API (:4000) and Expo dev server"
echo ""
echo "─────────────────────────────────────────"
echo "  API:        http://${IP}:4000/health"
echo "  Parent:     http://${IP}:4000/p/<token>"
echo "  Mobile env: EXPO_PUBLIC_API_URL=http://${IP}:4000"
echo "─────────────────────────────────────────"
echo ""

(npm run dev --workspace apps/api &)
sleep 3

EXPO_PUBLIC_API_URL="http://${IP}:4000" \
  npm run start --workspace apps/mobile
