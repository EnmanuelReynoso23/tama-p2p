# Animo

Un brote que crece contigo. Cuidas a tu mascota, cumples tus hábitos del día y mantienes la racha
con tus amigos, conectados directo entre teléfonos (P2P), sin servidor propio. La maquinita
ESP32 se une a los mismos amigos por un broker MQTT público ([`core/relay.js`](core/relay.js)).

Corre en tres lugares con las **mismas reglas**:

- **Teléfono** (Android y iPhone): app web instalable (PWA), funciona sin internet.
- **Maquinita con Raspberry Pi**: la misma app en modo kiosco (`?modo=maquina`) con 3 botones.
  Ver [`machine/README.md`](machine/README.md).
- **Huevo con ESP32-C3**: firmware en JavaScript con Moddable SDK; compila para el ESP32-C3 con
  ESP-IDF v6.1. Ver [`firmware/README.md`](firmware/README.md).

## Cómo funciona la mascota

Las reglas están en [`core/animo.js`](core/animo.js) y los dibujos en
[`core/sprites.js`](core/sprites.js). Son JavaScript puro: los usan tal cual la app y el firmware.

| Etapa  | Empieza a los |
|--------|---------------|
| Huevo  | 0             |
| Bebé   | 2 minutos     |
| Peque  | 12 horas      |
| Joven  | 2 días        |
| Adulto | 5 días        |

- Necesidades de 0 a 100: hambre, ánimo, energía, limpieza y salud. Bajan con el tiempo; dormida
  recupera energía. Se duerme sola si se queda sin energía.
- Después de comer, a la hora y media sale una caca. Con caca o hambre la salud baja; por debajo
  de 30 se enferma y necesita medicina.
- Forma adulta según cómo la cuidaste (promedio de cuidado cada media hora de juego):
  **radiant** (le sale una flor), **chill** (hoja ancha de sombrero) o **scruffy** (hojas
  revueltas). Una racha de hábitos de 7 días o más sube un escalón.
- Al volver se simula el tiempo que estuviste fuera, hasta una semana.
- Las caricias suben el ánimo, con tope de 10 por hora.

Los dibujos se generan por código (24x24 pixeles): cuerpo, hojas por etapa y cara según el ánimo.
Los iconos de la app salen de esos mismos dibujos: `node scripts/make-icons.mjs`.

## Desarrollo

```bash
pnpm install
pnpm dev        # http://localhost:5173  (modo maquinita: /?modo=maquina)
pnpm test       # pruebas del núcleo, la app, la red y la pantalla del firmware
pnpm build      # revisa tipos y arma dist/
```

Teclas en la computadora: `C` comer, `M` merienda, `J` jugar, `B` bañar, `D` dormir.
En Ajustes hay un reloj acelerado (x10, x60, x600) para ver crecer a la mascota rápido.

## iPhone y Android

- Se instala desde el navegador: en iPhone, Safari > Compartir > "Agregar a inicio"; en Android,
  el aviso de instalar o el menú de Chrome.
- El sonido se activa con el primer toque (iOS no deja sonar nada antes).
- La partida se guarda en el teléfono. Para pasarla a otro equipo: Ajustes > "Pasar la partida a
  otro equipo" (código QR firmado con ECDSA P-256).

## Estructura

```
core/            reglas y dibujos compartidos (app + firmware) y sus pruebas
src/
  store/         usePetStore (mascota), useHabitStore (hábitos y racha), useP2PStore (amigos)
  components/    pantallas: mascota, hábitos, amigos, ajustes, modo maquinita
  network/       P2P (Yjs + WebRTC), puente MQTT con la maquinita, invitaciones, firma y
                 transferencia de partida
  sounds/        efectos con Web Audio (sin archivos)
  sprites/       pasa los dibujos del núcleo a canvas
firmware/        ESP32-C3 + ST7789 con Moddable SDK
machine/         Raspberry Pi: kiosco + botones GPIO
scripts/         generador de iconos
```
