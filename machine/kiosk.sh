#!/usr/bin/env bash
# Pixel Pet · lanza Chromium a pantalla completa en el modo máquina.
#
#   TAMA_URL=https://tu-app.vercel.app ./kiosk.sh
#
# Por defecto abre la URL guardada en ~/.config/tama/url (la escribe install.sh).
set -euo pipefail

URL="${TAMA_URL:-$(cat "$HOME/.config/tama/url" 2>/dev/null || echo "http://localhost:4173")}"
case "$URL" in
  *\?*) URL="$URL&modo=maquina" ;;
  *)    URL="$URL/?modo=maquina" ;;
esac

BROWSER="$(command -v chromium-browser || command -v chromium)"

# Que la pantalla no se apague ni muestre el cursor.
xset s off -dpms 2>/dev/null || true
command -v unclutter >/dev/null && (unclutter -idle 0.5 -root &) || true

exec "$BROWSER" \
  --kiosk "$URL" \
  --noerrdialogs \
  --disable-infobars \
  --no-first-run \
  --disable-session-crashed-bubble \
  --disable-features=Translate \
  --check-for-update-interval=31536000 \
  --autoplay-policy=no-user-gesture-required \
  --overscroll-history-navigation=0 \
  --password-store=basic
