# Pixel Pet en la Raspberry Pi (maquinita)

La Pi abre la misma app web en **modo máquina** (`?modo=maquina`) a pantalla completa,
y 3 botones físicos se convierten en las teclas **A / S / D**.

| Botón | Tecla | Acción | GPIO (BCM) | Pin físico |
|---|---|---|---|---|
| Izquierdo | `A` | siguiente opción | GPIO17 | 11 |
| Centro | `S` | OK / seleccionar | GPIO27 | 13 |
| Derecho | `D` | atrás | GPIO22 | 15 |

Cada botón va entre su GPIO y **GND** (pin 9, 14, 20, 25…). Se usa la pull-up interna;
no hacen falta resistencias.

## Instalación rápida (Raspberry Pi OS Bookworm con escritorio)

```bash
git clone <este repo> ~/tama-p2p
cd ~/tama-p2p/machine
./install.sh https://tu-app.vercel.app
sudo reboot
```

Eso:
1. instala `python3-gpiozero`, `python3-evdev` y `unclutter`;
2. crea el servicio `tama-buttons` (GPIO → teclas, arranca con el sistema);
3. configura Chromium en kiosco apuntando a `https://tu-app.vercel.app/?modo=maquina`
   al iniciar sesión (autostart de labwc o servicio de usuario `tama-kiosk`).

¿Sin internet? Sirve la app en la propia Pi y usa esa URL:

```bash
pnpm install && pnpm build && pnpm preview --host --port 4173
./install.sh http://localhost:4173
```
(La conexión P2P con amigos sí necesita internet para los relays de señalización.)

## Probar sin botones

Con un teclado USB: `A`, `S`, `D` (o flechas, Enter y Esc). Para ver los botones:

```bash
journalctl -u tama-buttons -f
```

Pines distintos: edita `/etc/systemd/system/tama-buttons.service`
(`Environment=TAMA_PIN_A=5 TAMA_PIN_S=6 TAMA_PIN_D=13`) y
`sudo systemctl daemon-reload && sudo systemctl restart tama-buttons`.

## Conectar la máquina con tu teléfono

En la máquina: menú **Amigos** (💞) → aparece un **QR**. Escanéalo con la cámara del
teléfono: se abre la app en la misma sala y la máquina aparece en tu lista como
“🕹️ máquina”. La Pi tiene su propia mascota y su propia racha.

## Accesibilidad en la máquina

- Todo se maneja con 3 botones; la opción activa se ve grande, en amarillo y con borde.
- **Voz**: menú Estado (📊) → OK. Lee en voz alta (español) la opción seleccionada y los avisos.
  Necesita una voz instalada: `sudo apt install espeak-ng speech-dispatcher-espeak-ng`.
- La pantalla no se apaga (Wake Lock + `xset s off -dpms`), sin cursor.

## Salir del modo máquina

Abre la URL con `?modo=telefono`, o cierra Chromium con `Alt+F4` desde un teclado.
