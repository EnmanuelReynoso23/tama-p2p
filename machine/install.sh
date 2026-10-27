#!/usr/bin/env bash
# Pixel Pet · instalación en Raspberry Pi OS (Bookworm, escritorio).
#
#   ./install.sh https://tu-app.vercel.app
#
# - Instala dependencias (gpiozero, evdev, unclutter)
# - Servicio de sistema para los botones GPIO
# - Servicio de usuario que abre Chromium en modo máquina al iniciar sesión
set -euo pipefail

URL="${1:-}"
if [ -z "$URL" ]; then
  echo "Uso: $0 https://tu-app.vercel.app   (o http://localhost:4173 si la sirves en la Pi)"
  exit 1
fi
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "→ Paquetes"
sudo apt-get update -qq
sudo apt-get install -y python3-gpiozero python3-evdev unclutter

echo "→ Botones GPIO (/opt/tama)"
sudo mkdir -p /opt/tama
sudo install -m 755 "$HERE/gpio-keys.py" /opt/tama/gpio-keys.py
sudo install -m 644 "$HERE/tama-buttons.service" /etc/systemd/system/tama-buttons.service
sudo systemctl daemon-reload
sudo systemctl enable --now tama-buttons.service

echo "→ Kiosco"
mkdir -p "$HOME/.config/tama" "$HOME/.local/bin" "$HOME/.config/systemd/user"
echo "$URL" > "$HOME/.config/tama/url"
install -m 755 "$HERE/kiosk.sh" "$HOME/.local/bin/tama-kiosk"
install -m 644 "$HERE/tama-kiosk.service" "$HOME/.config/systemd/user/tama-kiosk.service"
systemctl --user daemon-reload
systemctl --user enable tama-kiosk.service

# Escritorio labwc (Pi OS Bookworm reciente): además lo añadimos al autostart,
# que es lo más fiable para arrancar apps gráficas.
if [ -d "$HOME/.config/labwc" ] || command -v labwc >/dev/null; then
  mkdir -p "$HOME/.config/labwc"
  grep -q tama-kiosk "$HOME/.config/labwc/autostart" 2>/dev/null || \
    echo "$HOME/.local/bin/tama-kiosk &" >> "$HOME/.config/labwc/autostart"
  systemctl --user disable tama-kiosk.service  # evita abrirlo dos veces
fi

echo "Listo. Reinicia la Pi: sudo reboot"
