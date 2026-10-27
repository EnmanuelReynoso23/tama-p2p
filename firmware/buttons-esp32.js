/** Tres botones a tierra (con pull-up interna) en el ESP32. Pines en manifest.json > config. */
import Digital from 'embedded:io/digital';
import config from 'mc/config';

export default function buttons(onPress) {
  const pins = { a: config.buttonA ?? 9, b: config.buttonB ?? 8, c: config.buttonC ?? 6 };
  const last = { a: 0, b: 0, c: 0 };
  const keep = [];
  for (const key of ['a', 'b', 'c']) {
    keep.push(
      new Digital({
        pin: pins[key],
        mode: Digital.InputPullUp,
        edge: Digital.Falling,
        onReadable() {
          // Antirrebote: ignora pulsos a menos de 180 ms.
          const t = Date.now();
          if (t - last[key] < 180) return;
          last[key] = t;
          onPress(key);
        },
      }),
    );
  }
  return keep;
}
