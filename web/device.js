// Web Bluetooth connection to one MR Star controller.
// Writes are serialized (GATT allows one op at a time) and coalesced per opcode,
// so dragging a slider sends only the latest value instead of flooding the link.

import { ADV_SERVICE, GATT_SERVICE, WRITE_CHAR } from "./protocol.js";

export class Light extends EventTarget {
  constructor(device) {
    super();
    this.device = device;
    this.char = null;
    this.pending = new Map(); // opcode -> latest frame
    this.busy = false;
    this.wantConnected = true;
    this.retry = 0;
    device.addEventListener("gattserverdisconnected", () => this.#onDrop());
  }

  get id() {
    return this.device.id;
  }

  get connected() {
    return !!this.char && this.device.gatt.connected;
  }

  static async pick() {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [ADV_SERVICE] }],
      optionalServices: [GATT_SERVICE],
    });
    return new Light(device);
  }

  // Devices granted earlier (needs Chrome's persistent Web Bluetooth permissions).
  static async known() {
    if (!navigator.bluetooth?.getDevices) return [];
    return (await navigator.bluetooth.getDevices()).map((d) => new Light(d));
  }

  async connect() {
    this.wantConnected = true;
    this.#emit("connecting");
    try {
      const server = await this.device.gatt.connect();
      const svc = await server.getPrimaryService(GATT_SERVICE);
      this.char = await svc.getCharacteristic(WRITE_CHAR);
      this.retry = 0;
      this.#emit("connected");
      this.#pump();
    } catch (err) {
      this.char = null;
      this.#emit("error", err);
      this.#scheduleReconnect();
      throw err;
    }
  }

  disconnect() {
    this.wantConnected = false;
    this.pending.clear();
    if (this.device.gatt.connected) this.device.gatt.disconnect();
  }

  send(bytes) {
    this.pending.set(bytes[1], bytes);
    this.#pump();
  }

  async #pump() {
    if (this.busy || !this.connected) return;
    this.busy = true;
    try {
      while (this.pending.size && this.connected) {
        const [op, bytes] = this.pending.entries().next().value;
        this.pending.delete(op);
        await this.char.writeValueWithoutResponse(bytes);
      }
    } catch (err) {
      this.#emit("error", err);
    } finally {
      this.busy = false;
    }
  }

  #onDrop() {
    this.char = null;
    this.#emit("disconnected");
    this.#scheduleReconnect();
  }

  #scheduleReconnect() {
    if (!this.wantConnected) return;
    const delay = Math.min(30000, 1000 * 2 ** this.retry++);
    setTimeout(() => {
      if (this.wantConnected && !this.connected) this.connect().catch(() => {});
    }, delay);
  }

  #emit(type, error) {
    this.dispatchEvent(Object.assign(new Event("change"), { state: type, error }));
  }
}
