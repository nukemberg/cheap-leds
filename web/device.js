// Web Bluetooth connection to one LED controller.
// Writes are serialized (GATT allows one op at a time) and coalesced per command,
// so dragging a slider sends only the latest value instead of flooding the link.

import { driverFor, requestOptions } from "./drivers/index.js";

export class Light extends EventTarget {
  constructor(device) {
    super();
    this.device = device;
    this.driver = driverFor(device.name);
    this.char = null;
    this.pending = new Map(); // command name -> latest frame
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
    return new Light(await navigator.bluetooth.requestDevice(requestOptions()));
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
      const svc = await server.getPrimaryService(this.driver.service);
      this.char = await svc.getCharacteristic(this.driver.writeChar);
      this.retry = 0;
      for (const [cmd, bytes] of this.driver.init?.() ?? []) this.send(cmd, bytes);
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

  // Build a frame with the driver and queue it; unsupported commands are skipped.
  command(cmd, ...args) {
    const build = this.driver[cmd];
    if (typeof build === "function") this.send(cmd, build(...args));
  }

  send(cmd, bytes) {
    this.pending.set(cmd, bytes);
    this.#pump();
  }

  async #pump() {
    if (this.busy || !this.connected) return;
    this.busy = true;
    try {
      while (this.pending.size && this.connected) {
        const [cmd, bytes] = this.pending.entries().next().value;
        this.pending.delete(cmd);
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
