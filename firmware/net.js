/**
 * Amigos en la maquinita: publica el estado de la mascota en el broker MQTT
 * y recibe los regalos y mensajes que le mandan desde la app.
 *
 * Usa el cliente MQTT de ECMA-419 (embedded:network/mqtt/client). Si se cae
 * la conexion, vuelve a intentar sola cada vez con mas espera.
 */
import Timer from 'timer';
import {
  RELAY_HOST,
  RELAY_KEEPALIVE_S,
  RELAY_TCP_PORT,
  machinePetState,
  parseRelayMessage,
  parseRelayTopic,
  relayTopics,
} from 'animo-relay';

const MAX_PAYLOAD = 4096;
/** Antes de que el reloj se ponga en hora (SNTP) no se publica nada. */
const CLOCK_OK = 1_700_000_000_000;

export class AnimoNet {
  #o;
  #topics;
  #client = null;
  #ready = false;
  #retryMs = 5000;
  #retry = null;
  #incoming = null;
  #pending = null;

  /**
   * @param {{ roomId: string, playerId: string, ownerName?: string,
   *   onMessage: (msg: object) => void, onFriend?: (state: object) => void,
   *   onStatus?: (online: boolean) => void }} options
   */
  constructor(options) {
    this.#o = options;
    this.#topics = relayTopics(options.roomId, options.playerId);
  }

  get online() {
    return this.#ready;
  }

  start() {
    const MQTTClient = device.network.mqtt.io;
    const topics = this.#topics;
    const self = this;
    try {
      this.#client = new MQTTClient({
        ...device.network.mqtt,
        host: RELAY_HOST,
        port: RELAY_TCP_PORT,
        id: `animo-m-${this.#o.playerId.slice(0, 12)}-${(Math.random() * 1e6) | 0}`,
        keepAlive: RELAY_KEEPALIVE_S * 1000,
        will: { topic: topics.myOff, message: ArrayBuffer.fromString('1'), QoS: 0, retain: true },
        onControl(operation) {
          if (operation !== MQTTClient.CONNACK) return;
          self.#ready = true;
          self.#retryMs = 5000;
          this.write(null, {
            operation: MQTTClient.SUBSCRIBE,
            items: topics.subscribe.map((topic) => ({ topic, QoS: 0 })),
          });
          self.#write(topics.myOff, '', true);
          if (self.#pending) self.#write(topics.myPet, self.#pending, true);
          self.#o.onStatus?.(true);
        },
        onReadable(count, options) {
          if (options.topic !== undefined) self.#incoming = { topic: options.topic, parts: [] };
          const chunk = this.read(count);
          const msg = self.#incoming;
          if (msg && chunk) msg.parts.push(String.fromArrayBuffer(chunk));
          if (msg && !options.more) {
            self.#incoming = null;
            self.#receive(msg.topic, msg.parts.join(''));
          }
        },
        onError() {
          self.#lost();
        },
        onClose() {
          self.#lost();
        },
      });
    } catch {
      this.#lost();
    }
  }

  /** Publica la mascota (retenido, para que la app la vea al entrar). */
  publishPet(pet, now) {
    if (now < CLOCK_OK) return;
    this.#pending = JSON.stringify(machinePetState(pet, { playerId: this.#o.playerId, ownerName: this.#o.ownerName, now }));
    if (this.#ready) this.#write(this.#topics.myPet, this.#pending, true);
  }

  #write(topic, text, retain) {
    try {
      this.#client.write(ArrayBuffer.fromString(text), { topic, QoS: 0, retain });
    } catch {
      // El socket esta lleno: se manda en la siguiente vuelta.
    }
  }

  #receive(topic, text) {
    const t = parseRelayTopic(this.#topics.base, topic);
    if (!t || t.from === this.#o.playerId || !text || text.length > MAX_PAYLOAD) return;
    if (t.kind === 'off') return;
    let raw;
    try {
      raw = JSON.parse(text);
    } catch {
      return;
    }
    if (t.kind === 'pet') {
      if (raw && raw.playerId === t.from && typeof raw.name === 'string') this.#o.onFriend?.(raw);
      return;
    }
    const msg = parseRelayMessage(raw, t);
    if (msg) this.#o.onMessage(msg);
  }

  #lost() {
    const was = this.#ready;
    this.#ready = false;
    this.#incoming = null;
    try {
      this.#client?.close();
    } catch {
      // ya estaba cerrado
    }
    this.#client = null;
    if (was) this.#o.onStatus?.(false);
    if (this.#retry) return;
    this.#retry = Timer.set(() => {
      this.#retry = null;
      this.start();
    }, this.#retryMs);
    this.#retryMs = Math.min(this.#retryMs * 2, 120_000);
  }
}
