#!/usr/bin/env bash
# dev.sh — Lance le serveur de développement Inspir
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="$PROJECT_ROOT/venv"

# Vérifications préalables
if [[ ! -f "$VENV/bin/activate" ]]; then
  echo "[inspir] Environnement virtuel introuvable : $VENV/bin/activate" >&2
  echo "[inspir] Crée-le avec : python3 -m venv venv && pip install -r requirements.txt" >&2
  exit 1
fi

if [[ ! -f "$PROJECT_ROOT/app/main.py" ]]; then
  echo "[inspir] app/main.py introuvable — vérifie que tu es dans le bon répertoire." >&2
  exit 1
fi

# Activation du venv
# shellcheck source=/dev/null
source "$VENV/bin/activate"

HOST="${INSPIR_HOST:-0.0.0.0}"
PORT="${INSPIR_PORT:-8000}"

echo ""
echo "  Inspir — serveur de développement"
echo "  Adresse : http://localhost:$PORT"
echo "  Arrêt   : Ctrl+C"
echo ""

exec uvicorn app.main:app \
  --reload \
  --host "$HOST" \
  --port "$PORT"
