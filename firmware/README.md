# Firmware de Animo (ESP32 / Moddable SDK)

Firmware nativo en JavaScript moderno (ES2022) para el dispositivo físico de **Animo** (ESP32-C3 + pantalla ST7789 240x240 + 3 botones).

---

## 1. Requisitos en CachyOS / Arch Linux

Moddable SDK utiliza las bibliotecas estándar de C y GTK3 para el simulador de escritorio:

```bash
sudo pacman -S --needed base-devel git gtk3 ninja
```

### Instalar Moddable SDK

```bash
cd ~
git clone https://github.com/Moddable-OpenSource/moddable.git
cd moddable/build/makefiles/lin
make
```

### Variables de entorno (`~/.bashrc` o `~/.zshrc`)

```bash
export MODDABLE=~/moddable
export PATH=$PATH:$MODDABLE/build/bin/lin/release
```

---

## 2. Probar en el simulador de escritorio (Linux)

Sin conectar el ESP32. En el simulador no hay botones: la mascota vive y se dibuja sola.
Con `room="codigo"` también se conecta a los amigos de esa sala.

```bash
cd ~/Proyectos/tama-p2p/firmware
mcconfig -d -m -p lin
```

Solo compilar, sin abrir la ventana: `mcconfig -m -p lin -t build -o /tmp/animo-build`.

---

## 3. ESP-IDF (para compilar al ESP32)

Moddable pide ESP-IDF v6.1. En esta PC ya está en `~/esp32/esp-idf-v6.1` (herramientas en `~/.espressif`).
Para instalarlo en otra:

```bash
sudo pacman -S --needed git wget flex bison gperf python-pip cmake ninja ccache libffi openssl dfu-util libusb
mkdir -p ~/esp32 && cd ~/esp32
git clone -b v6.1 --recursive --shallow-submodules --depth 1 https://github.com/espressif/esp-idf.git esp-idf-v6.1
./esp-idf-v6.1/install.sh esp32c3
```

En cada terminal donde vayas a compilar:

```bash
export IDF_PATH=~/esp32/esp-idf-v6.1
. $IDF_PATH/export.sh
```

---

## 4. Flashear al hardware (ESP32-C3 SuperMini)

Conecta la placa por USB-C y ejecuta (el Wi-Fi y la sala van al compilar):

```bash
cd ~/Proyectos/tama-p2p/firmware
mcconfig -d -m -p esp32/esp32c3 ssid="MiWifi" password="clave" room="mochi-k7p3-luna-x9qd" owner="Reyno"
```

- `room`: el mismo código de sala que sale en la app (Amigos, Invitar). Sin `room` la maquinita
  funciona sola, sin amigos.
- `owner`: tu nombre, como lo verán tus amigos (opcional).
- Solo compilar, sin grabar: agrega `-t build -o ~/.cache/animo-fw-c3`.

### Amigos en la maquinita

El ESP32 no puede usar WebRTC como la app. Por eso la app y la maquinita también se hablan por
MQTT (`broker.emqx.io`: la app por WebSocket seguro, la maquinita por TCP 1883), en un tema que
sale del código de la sala (`core/relay.js`):

- La maquinita publica su mascota cada 30 segundos y después de cada acción. En la app sale en
  Amigos como "maquinita", sin racha (no lleva hábitos).
- Los regalos, ánimos y caricias que le mandes desde la app le llegan aunque estuviera apagada
  (queda guardado el último de cada amigo). En la pantalla dice "Regalo de ...".
- El cuadrito verde arriba a la derecha indica que está conectada.

El broker es público: quien conozca el código de la sala puede ver el estado de las mascotas
de esa sala. No se manda nada más (ni hábitos ni datos personales, solo el nombre que pongas).

### Cableado predeterminado de la pantalla ST7789 (SPI)

| Pin Pantalla | Pin ESP32-C3 | Función |
|---|---|---|
| **GND** | GND | Tierra |
| **VCC** | 3.3V / 5V | Alimentación |
| **SCL** | GPIO 5 | Reloj SPI (SCK) |
| **SDA** | GPIO 4 | Datos SPI (MOSI) |
| **RES** | GPIO 1 | Reset (RST) |
| **DC** | GPIO 2 | Data/Command |
| **BLK** | GPIO 3 | Iluminación de fondo |
| **CS** | GPIO 7 | Chip Select |

### Botones físicos (Pull-Up interno)

| Botón | Pin ESP32-C3 | Función |
|---|---|---|
| **Botón A** | GPIO 9 | Mover menú |
| **Botón B** | GPIO 8 | Confirmar / Ejecutar acción |
| **Botón C** | GPIO 6 | Cancelar / Volver |

---

## 5. Estructura de archivos

El firmware usa el mismo núcleo que la app (en `../core`), así la mascota se comporta igual.

```
firmware/
├── manifest.json       # Compilación, pines de pantalla y botones, módulos compartidos
├── main.js             # Bucle: reloj de la mascota, botones A/B/C, guardado, amigos
├── screen.js           # Dibujo de la pantalla con Poco (se prueba en la computadora)
├── net.js              # Amigos por MQTT (cliente ECMA-419, se reconecta solo)
├── buttons-esp32.js    # Botones físicos (ECMA-419 Digital, antirrebote)
├── buttons-sim.js      # Simulador: sin botones
└── test/               # Pruebas de la pantalla y de la red con imitaciones

../core/animo.js        # Reglas (módulo "animo-core" en Moddable)
../core/sprites.js      # Dibujos (módulo "animo-sprites")
../core/relay.js        # Temas y mensajes del puente MQTT (módulo "animo-relay")
```

La partida se guarda con el Key-Value store de ECMA-419 (flash del ESP32) cada 5 minutos y
después de cada acción. En el simulador de Linux se guarda solo en memoria.
Sin internet el ESP32 arranca con el reloj en cero: la mascota no se cobra ese tiempo y las
esperas de las acciones se limpian solas.
