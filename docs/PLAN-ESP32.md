# Plan: pasar la maquinita de Raspberry Pi a ESP32 y comercializar

Fecha: 26-oct-2026. Reemplaza la recomendación de Raspberry Pi de `~/Proyectos/tamagotchi/investigacion/04-stack-p2p-y-raspberry.md`.
Este archivo es nuevo; no toca los cambios sin commit que hay en `src/` (otra IA trabaja ahí).

## 0. Bloqueo antes de vender: la licencia del código actual

Comprobado el 26-oct con la API de GitHub: `tama-p2p` sale de `laleet008/pixel-pet`.
- Tiene los mismos archivos en `src/game/`, `src/sprites/` y `src/machines/petMachine.ts`.
- Las primeras 25 líneas de `src/game/offline.ts` son idénticas.
- `package.json` todavía se llama `pixel-pet`.

`laleet008/pixel-pet` **no tiene licencia**. Sin licencia, el código y los sprites son de su autor: se pueden leer, pero no copiar, vender ni portar a C. Un port a C sigue siendo una obra derivada.

Hay dos salidas; hay que elegir una antes de la Fase 2:
1. **Pedir permiso:** escribirle al autor y pedir una licencia MIT o un permiso escrito para uso comercial.
2. **Reescribir desde cero:** reescribir la lógica y dibujar sprites nuevos en la Fase 2. El port a C es buen momento para hacerlo. Lo propio (red, cripto, racha, hábitos, UI de amigos) se queda.

Recomendación: hacer las dos. Escribir hoy y, si no contesta en 2 semanas, reescribir.

## 1. Qué cambia y qué se queda

| Capa | Hoy (web / Pi) | Huevo ESP32 | Teléfono y computadora |
|---|---|---|---|
| Dibujo | Canvas + `src/sprites/*.ts` | JavaScript con Moddable SDK (Piu / Commodetto). Acelerado por hardware para ST7789 a 30-60 fps. | Igual que hoy |
| Lógica de la mascota | `src/game/*.ts` | JavaScript ES2022 nativo (se reutiliza la misma lógica TS compilada a JS, sin portar a C) | Igual que hoy |
| Guardado | IndexedDB / Yjs | Flash local vía Moddable File / Preference (LittleFS) | IndexedDB |
| Identidad | ECDSA P-256 por WebCrypto (`src/network/crypto.ts`) | ECDSA P-256 vía WebCrypto nativo de Moddable (`crypto.subtle`) | Igual. **Se queda P-256**: lo soportan WebCrypto y Moddable. |
| Internet | `y-webrtc` | MQTT sobre WebSocket con TLS vía cliente nativo de Moddable | Hay que cambiarlo (ver 2) |
| Cerca, sin internet | No hay | ESP-NOW o BLE de huevo a huevo, estilo StreetPass | No aplica |
| Configurar el Wi-Fi | No hay | Punto de acceso propio con portal cautivo; funciona en iPhone y Android | La PWA guía el proceso |

## 2. La decisión técnica central: un solo protocolo que entiendan la web y el ESP32

Yjs y WebRTC no caben bien en un microcontrolador. Hace falta un **protocolo v2** sencillo que la web y el firmware implementen igual:

- **Sobre:** JSON canónico firmado con ECDSA P-256, con la misma `canonicalizePayload` de hoy, replicada en C y verificada con vectores. Además, cifrado AES-GCM con la llave de la sala, que viaja en el QR de emparejamiento.
- **Tipos de mensaje:**
  - `snapshot`: estado de la mascota, retenido.
  - `gift`
  - `interaction` (visit, pet, cheer)
  - `memory`: la pregunta estilo Miitomo
  - `handoff`: mueve la mascota del teléfono al huevo o al revés.
- **Dueño del estado:** la mascota vive en un solo lugar a la vez (el huevo o el teléfono). Los demás solo muestran copias. No hace falta CRDT y no hay conflictos.
- **Transporte por internet:** MQTT sobre WebSocket con TLS.
  - En la web: `mqtt.js`. En el ESP32: `esp-mqtt`, que es parte de ESP-IDF y es estable.
  - Los mensajes retenidos dan "último estado de tu amiga aunque esté apagada", y QoS 1 da los regalos pendientes.
  - Alternativa evaluada: relays Nostr. Exigen firmas secp256k1 y los relays pueden borrar mensajes, así que se descartan.

**Verdad sobre "sin servidor":** para vender un producto que funcione siempre hace falta un buzón (broker MQTT). Como todo va firmado y cifrado de punta a punta, el broker no puede leer ni falsificar nada.
- **Prototipo:** broker público de pruebas (`broker.emqx.io`). Sin garantías.
- **Producto:** un Mosquitto propio en una VM gratuita o barata, o un plan gratuito administrado (HiveMQ Cloud; verificar sus límites actuales).
- **No usar la VM de Oracle de AsistoYA.**

El modo cercano (ESP-NOW) sí funciona sin ningún servidor.

## 3. Hardware

### Prototipo: comprar 3 juegos, para 2 huevos más 1 de repuesto
- ESP32-C3 SuperMini (Wi-Fi + BLE 5, RISC-V, 400 KB de RAM). Alcanza para un framebuffer de 240x240 (115 KB) más TLS.
- Pantalla IPS ST7789 de 1.3" o 1.54", 240x240, SPI.
- 3 botones táctiles (A, B, C como el original). Sin pantalla táctil, que encarece.
- Zumbador pasivo.
- LiPo de 400-600 mAh y módulo de carga TP4056 **con protección** (DW01).
- Opcional: medidor USB de consumo para la Fase 3.

### Producto: PCB propia, Fase 6
- **Módulo ESP32-C3-MINI-1**, que ya viene precertificado FCC/CE.
- Componentes en la PCB: cargador LiPo, regulador, USB-C y conector de la pantalla.
- Fabricación y ensamblado en JLCPCB.
- Carcasa en forma de huevo, con la fabricación gratuita que tienes.

### Costo por unidad: **estimación, hay que cotizar en LCSC/JLCPCB/AliExpress en la Fase 0**
| Pieza | USD aprox. |
|---|---|
| PCB ensamblada con ESP32-C3 (lote de 50-100) | 3,00 - 5,00 |
| Pantalla 240x240 | 2,00 - 3,00 |
| Batería LiPo | 1,00 - 1,50 |
| Botones, zumbador, USB-C | 0,50 |
| Carcasa | 0,50 - 1,00 |
| Empaque | 0,50 |
| **Total** | **7,50 - 11,50** (unos 450 - 700 DOP, a ~60 DOP por USD) |

No incluye envío, aduana de RD, unidades defectuosas ni garantía. Con eso, **800 DOP deja un margen muy corto**: apunta a 1.200 - 1.500 DOP o baja el costo.

### Producto de entrada: llavero NFC (sin electrónica)
- Etiqueta NTAG213 con la URL de la sala: unos 0,20 USD más la carcasa.
- **En Android** abre la PWA instalada.
- **En iPhone** abre Safari, no la app instalada. La propuesta que pegaste decía "abre la PWA en pantalla completa": en iPhone eso no es cierto.

## 4. Batería: lo que hay que medir, no prometer

Las cifras de "3 a 7 días" de la propuesta no están medidas. La pantalla encendida con su luz gasta unos 20-40 mA, y con Wi-Fi activo hay picos de más de 100 mA. Con la pantalla siempre encendida, 500 mAh duran horas, no días.

Diseño para que dure días:
- **Pantalla:** se apaga a los 20-30 s sin tocar nada.
- **Sueño:** el ESP32 duerme en sueño ligero o profundo y despierta con un botón o con el temporizador RTC.
- **Simulación:** no corre mientras duerme. Al despertar se calcula el tiempo pasado, igual que hoy hace `offline.ts`.
- **Wi-Fi:** solo cada 15-30 min, o al abrir el menú de amigos. La hora se corrige por NTP en cada conexión.
- **Avisos:** la mascota pide comida con un LED o un pitido, despertándose por temporizador.

Meta para dar por buena la Fase 3: **5 días o más con uso normal, medido** con el medidor USB.

## 5. Teléfono y computadora

La misma PWA de `tama-p2p` sirve para las tres cosas:
1. **Sin huevo:** la mascota vive en el teléfono (producto gratis o barato).
2. **Con huevo:** el teléfono es el control remoto y el visor. Desde ahí se escribe lo largo (preguntas tipo Miitomo, mensajes) y se configura el Wi-Fi del huevo.
3. **En la computadora:** se instala igual, desde Chrome o Edge. Además tendrá una página para **actualizar el firmware del huevo por USB** con ESP Web Tools (Web Serial, solo Chrome/Edge en escritorio). Las actualizaciones normales irán por OTA, por Wi-Fi.

El Bluetooth desde la web no sirve en iPhone, porque Safari no tiene Web Bluetooth. Por eso todo lo de teléfono a huevo va por Wi-Fi y el broker; el Bluetooth queda como extra opcional para Android.

## 6. Estructura del código (monorepo pnpm, ya existe `pnpm-workspace.yaml`)

Al usar JavaScript (Moddable SDK) en el huevo físico, no hace falta mantener dos lenguajes distintos:

```
tama-p2p/
  src/                      # la PWA actual (React + Vite + TypeScript)
  firmware/                 # firmware del huevo en JavaScript (Moddable SDK)
    manifest.json           # configuración de pantalla ST7789, pines ESP32-C3 y módulos
    main.js                 # bucle principal de animación, eventos y botones
    game/                   # módulos de lógica (reutilizados directamente de src/game/)
    gfx/                    # sprites y vistas Piu / Commodetto
    net/                    # cliente MQTT y Wi-Fi en JS
  protocol/                 # especificación del protocolo v2 (JSON canónico firmado)
  tools/export-sprites.ts   # exporta sprites de la PWA a formatos compatibles con Piu
```

Herramientas: Moddable SDK (motor XS). Se compila con `mcconfig` apuntando a `esp32/esp32c3` para el hardware o `sim` para el simulador de escritorio en Linux/CachyOS.

## 7. Fases

| Fase | Qué | Listo cuando |
|---|---|---|
| F0 (1 semana) | Decidir lo de la sección 0 y escribirle al autor. Comprar 3 kits. Cotizar costos reales. Nombre y marca: **no usar "Tamagotchi", "Mii" ni "Miitomo"**, que son marcas de Bandai y Nintendo. | Cotización real en tabla y kits pedidos |
| F1 | Hola pantalla en JS: Moddable SDK, simulador en Linux, ST7789 en C3, 3 botones y animación | La mascota se anima en el simulador y en el huevo físico |
| F2 | Lógica en JS compartida: importar la máquina y estadísticas de `src/game/` directamente en el firmware. | El huevo calcula hambre, sueño y evolución con el mismo código que la web |
| F3 | Energía: sueño ligero/profundo, RTC, batería, aviso por temporizador | 5 días o más medidos |
| F4 | Protocolo v2 en web y firmware. MQTT. Emparejar con el QR que muestra el huevo. Portal Wi-Fi. | Alimentar desde el teléfono se ve en el huevo en menos de 3 s, y un huevo apagado recibe los regalos al volver |
| F5 | ESP-NOW / BLE (huevo a huevo), OTA, página de flasheo Web Serial | Dos huevos juntos intercambian visitas sin internet, y una actualización OTA funciona |
| F6 | PCB en KiCad con el módulo C3-MINI-1, carcasa y lote piloto de 10 | 10 unidades funcionando una semana con amigos |
| F7 | Venta piloto (20-50 unidades): empaque, precio, garantía, soporte | Primeras ventas y lista de fallas |

## 8. Riesgos y cosas por verificar
- Licencia del código actual (sección 0): **bloquea la venta**.
- Marcas: Tamagotchi (Bandai); Mii y Miitomo (Nintendo).
- Certificación: el módulo precertificado ayuda, pero el producto final puede necesitar su propia homologación. Verificar qué pide INDOTEL en RD (y FCC/CE si se vende fuera).
- LiPo: restricciones para enviarlas por avión y para importarlas; siempre con protección.
- Broker: si se cae, se pierde el modo internet. El modo cercano sigue andando. Hay que tener un broker de respaldo configurable.
- Perder la llave privada significa perder la identidad: respaldo de la llave desde el teléfono (exportarla en QR).
- Cifras de la propuesta pegada que no están verificadas:
  - "ECDSA en menos de 2 ms": el C3 firma P-256 por software, probablemente en decenas de ms (sigue siendo suficiente).
  - "ESP-NOW a 150-200 m": es al aire libre; dentro de casa es mucho menos.
  - "3-7 días de batería": ver sección 4.
