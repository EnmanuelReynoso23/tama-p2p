#!/usr/bin/env python3
"""
Pixel Pet · botones físicos para la Raspberry Pi.

Convierte 3 pulsadores GPIO en las teclas A / S / D que entiende el modo
máquina (?modo=maquina):

    A (GPIO17, pin 11) -> siguiente opción
    S (GPIO27, pin 13) -> OK / seleccionar
    D (GPIO22, pin 15) -> atrás

Cablea cada botón entre el GPIO y GND (pin 9, 14, 20…). Se usa la
resistencia pull-up interna, no hace falta nada más.

Cambia los pines con variables de entorno: TAMA_PIN_A, TAMA_PIN_S, TAMA_PIN_D.

Requiere:  sudo apt install python3-gpiozero python3-evdev
Necesita acceso a /dev/uinput (root o grupo 'input' + regla udev, ver README).
"""
import os
import signal

from evdev import UInput, ecodes as e
from gpiozero import Button

PINS = {
    e.KEY_A: int(os.environ.get("TAMA_PIN_A", 17)),
    e.KEY_S: int(os.environ.get("TAMA_PIN_S", 27)),
    e.KEY_D: int(os.environ.get("TAMA_PIN_D", 22)),
}

ui = UInput({e.EV_KEY: list(PINS.keys())}, name="tama-buttons")


def tap(key):
    ui.write(e.EV_KEY, key, 1)
    ui.write(e.EV_KEY, key, 0)
    ui.syn()


buttons = []
for key, pin in PINS.items():
    # bounce_time evita dobles pulsaciones por rebote mecánico.
    b = Button(pin, pull_up=True, bounce_time=0.05)
    b.when_pressed = lambda k=key: tap(k)
    buttons.append(b)

print("tama-buttons listo:", {e.KEY[k]: p for k, p in PINS.items()}, flush=True)
signal.pause()
