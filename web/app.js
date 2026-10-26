import { drivers } from "./drivers/index.js";
import { Light } from "./device.js";

const $ = (id) => document.getElementById(id);

const DEFAULTS = {
  on: true, mode: "color", hue: 30, sat: 80, bri: 80, effects: {}, spd: 50, rev: false, len: 100,
  // days: bit 0 = Mon … bit 6 = Sun
  timers: {
    on: { enabled: false, time: "07:00", days: 0x7f },
    off: { enabled: false, time: "23:00", days: 0x7f },
  },
};
const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const PRESETS = [[0, 100], [30, 100], [55, 100], [120, 100], [180, 100], [220, 100], [275, 100], [320, 90], [35, 45], [0, 0]];

const store = {
  get(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
};

const saved = store.get("state", {});
const state = { ...DEFAULTS, ...saved, timers: { ...DEFAULTS.timers, ...saved.timers } };
// v1 kept a single MR Star effect id.
if (typeof state.effect === "number") {
  state.effects = { mrstar: state.effect, ...state.effects };
  delete state.effect;
}
const meta = store.get("devices", {}); // id -> { name, enabled }
const lights = new Map(); // id -> Light

const save = () => store.set("state", state);
const saveMeta = () => store.set("devices", meta);

const targets = () => [...lights.values()].filter((l) => meta[l.id]?.enabled !== false);

function broadcast(cmd, ...args) {
  for (const light of targets()) light.command(cmd, ...args);
}

function sendEffect(light) {
  const effectId = state.effects[light.driver.id];
  if (effectId !== undefined) light.command("effect", effectId, state.rev);
}

// Full state sync, used when a controller (re)connects since it can't report its own state.
function syncTo(light) {
  light.command("power", state.on);
  light.command("brightness", state.bri / 100);
  light.command("speed", state.spd / 100);
  light.command("reverse", state.rev);
  if (state.mode === "effect" && state.effects[light.driver.id] !== undefined) sendEffect(light);
  else light.command("color", state.hue, state.sat);
}

// ---- devices ----

function addLight(light) {
  if (lights.has(light.id)) return lights.get(light.id);
  lights.set(light.id, light);
  meta[light.id] ??= { name: light.device.name || "Controller", enabled: true };
  saveMeta();
  light.addEventListener("change", (e) => {
    if (e.state === "connected") syncTo(light);
    renderDevices();
  });
  renderDevices();
  renderEffects();
  return light;
}

function renderDevices() {
  const ul = $("devices");
  ul.replaceChildren();
  $("empty").hidden = lights.size > 0;
  const counts = {};
  for (const light of lights.values()) {
    const { driver } = light;
    counts[driver.id] = (counts[driver.id] ?? 0) + 1;
    const m = meta[light.id];
    const li = document.createElement("li");
    li.className = light.connected ? "on" : "off";

    const check = Object.assign(document.createElement("input"), { type: "checkbox", checked: m.enabled !== false, title: "Include in commands" });
    check.onchange = () => {
      m.enabled = check.checked;
      saveMeta();
      if (check.checked) syncTo(light);
    };

    // Raw advertised names (GATT--DEMO, MELK-OA10 …) get a friendlier default.
    const isRaw = m.name === light.device.name || m.name === "GATT--DEMO";
    const name = Object.assign(document.createElement("input"), { className: "name", value: isRaw ? `${driver.label} ${counts[driver.id]}` : m.name });
    name.onchange = () => {
      m.name = name.value;
      saveMeta();
    };

    const status = document.createElement("span");
    status.className = "status";
    status.textContent = light.connected ? "connected" : "offline";

    const remove = Object.assign(document.createElement("button"), { className: "ghost small", textContent: "✕", title: "Forget" });
    remove.onclick = async () => {
      light.disconnect();
      lights.delete(light.id);
      delete meta[light.id];
      saveMeta();
      await light.device.forget?.().catch(() => {});
      renderDevices();
      renderEffects();
    };

    li.append(check, name, status, remove);
    ul.append(li);
  }
}

async function addDevice() {
  try {
    const light = addLight(await Light.pick());
    await light.connect();
  } catch (err) {
    if (err.name !== "NotFoundError") console.warn(err); // NotFoundError = chooser cancelled
  }
}

// ---- controls ----

function paint() {
  const css = `hsl(${state.hue} ${state.sat}% ${100 - state.sat / 2}%)`;
  document.documentElement.style.setProperty("--light", state.on ? css : "#333");
  document.documentElement.style.setProperty("--hue", state.hue);
  $("glow").style.opacity = state.on ? 0.25 + (state.bri / 100) * 0.75 : 0.05;
  $("power").setAttribute("aria-pressed", state.on);
  $("bri-out").textContent = `${state.bri}%`;
  $("spd-out").textContent = `${state.spd}%`;
  $("len-out").textContent = state.len;
  for (const b of document.querySelectorAll("#effects button")) {
    b.classList.toggle("active", state.mode === "effect" && state.effects[b.dataset.driver] === +b.dataset.id);
  }
  $("swatch").classList.toggle("active", state.mode === "color");
}

function bindRange(id, key, onInput) {
  const el = $(id);
  el.value = state[key];
  el.addEventListener("input", () => {
    state[key] = +el.value;
    onInput();
    paint();
    save();
  });
}

function setColor(hue, sat) {
  Object.assign(state, { hue, sat, mode: "color" });
  $("hue").value = hue;
  $("sat").value = sat;
  broadcast("color", hue, sat);
  paint();
  save();
}

function buildPresets() {
  for (const [h, s] of PRESETS) {
    const b = document.createElement("button");
    b.style.background = `hsl(${h} ${s}% ${100 - s / 2}%)`;
    b.setAttribute("aria-label", `hue ${h} saturation ${s}`);
    b.onclick = () => setColor(h, s);
    $("presets").append(b);
  }
}

function pickEffect(driver, effectId) {
  state.effects[driver.id] = effectId;
  state.mode = "effect";
  for (const light of targets()) if (light.driver === driver) sendEffect(light);
  paint();
  save();
}

// Effect lists differ per brand: show one block per brand in use (all brands when none added).
function renderEffects() {
  const present = new Set([...lights.values()].map((l) => l.driver));
  const shown = drivers.filter((d) => !present.size || present.has(d));
  const root = $("effects");
  root.replaceChildren();
  for (const driver of shown) {
    if (shown.length > 1) {
      root.append(Object.assign(document.createElement("h3"), { textContent: driver.label }));
    }
    for (const [group, items] of driver.effects) {
      const details = document.createElement("details");
      details.append(Object.assign(document.createElement("summary"), { textContent: group }));
      const grid = document.createElement("div");
      grid.className = "chips";
      for (const [effectId, label] of items) {
        const b = Object.assign(document.createElement("button"), { textContent: label });
        b.dataset.id = effectId;
        b.dataset.driver = driver.id;
        b.onclick = () => pickEffect(driver, effectId);
        grid.append(b);
      }
      details.append(grid);
      root.append(details);
    }
  }
  paint();
}

function buildTimers() {
  for (const el of document.querySelectorAll(".timer")) {
    const t = state.timers[el.dataset.kind];
    const enabled = el.querySelector(".enabled");
    const time = el.querySelector(".time");
    enabled.checked = t.enabled;
    time.value = t.time;
    enabled.onchange = () => {
      t.enabled = enabled.checked;
      save();
    };
    time.onchange = () => {
      if (time.value) t.time = time.value;
      save();
    };
    const days = el.querySelector(".days");
    DAY_LABELS.forEach((label, bit) => {
      const b = Object.assign(document.createElement("button"), { textContent: label, title: DAY_NAMES[bit] });
      const sync = () => b.setAttribute("aria-pressed", !!(t.days & (1 << bit)));
      b.onclick = () => {
        t.days ^= 1 << bit;
        sync();
        save();
      };
      sync();
      days.append(b);
    });
  }
}

// Timers live on the controllers, so they're written only on Apply, after a clock sync.
function applyTimers() {
  const lightsWithTimers = targets().filter((l) => l.driver.timer);
  for (const light of lightsWithTimers) {
    light.send("clock", light.driver.clock());
    for (const kind of ["on", "off"]) {
      const { enabled, time, days } = state.timers[kind];
      const [hour, minute] = time.split(":").map(Number);
      light.send(`timer-${kind}`, light.driver.timer(kind, { enabled, hour, minute, days }));
    }
  }
  const connected = lightsWithTimers.filter((l) => l.connected).length;
  $("timers-status").textContent = connected
    ? `Sent to ${connected} controller${connected > 1 ? "s" : ""}${connected < lightsWithTimers.length ? `; ${lightsWithTimers.length - connected} offline will get it on reconnect` : ""}.`
    : lightsWithTimers.length
      ? "No controller connected right now; timers will be sent when they reconnect."
      : "Add and tick a controller first.";
}

function init() {
  buildPresets();
  renderEffects();
  buildTimers();
  $("apply-timers").onclick = applyTimers;

  const sendColor = () => {
    state.mode = "color";
    broadcast("color", state.hue, state.sat);
  };
  bindRange("hue", "hue", sendColor);
  bindRange("sat", "sat", sendColor);
  bindRange("bri", "bri", () => broadcast("brightness", state.bri / 100));
  bindRange("spd", "spd", () => broadcast("speed", state.spd / 100));
  bindRange("len", "len", () => {});

  $("swatch").onclick = () => setColor(state.hue, state.sat);
  $("rev").checked = state.rev;
  $("rev").onchange = () => {
    state.rev = $("rev").checked;
    broadcast("reverse", state.rev);
    // Drivers without a direction command encode it in the effect id.
    if (state.mode === "effect") {
      for (const light of targets()) if (!light.driver.reverse) sendEffect(light);
    }
    save();
  };
  $("send-len").onclick = () => broadcast("length", state.len);
  $("power").onclick = () => {
    state.on = !state.on;
    broadcast("power", state.on);
    paint();
    save();
  };
  paint();

  if (!navigator.bluetooth) {
    $("unsupported").hidden = false;
    $("add").disabled = true;
    return;
  }
  $("add").onclick = addDevice;

  // Reconnect controllers granted in an earlier session.
  Light.known().then((known) => {
    for (const light of known) addLight(light).connect().catch(() => {});
  });
}

init();

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");

// Chrome fires this only when the app is installable and not yet installed.
let installPrompt = null;
addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e;
  $("install").hidden = false;
});
addEventListener("appinstalled", () => {
  installPrompt = null;
  $("install").hidden = true;
});
$("install").onclick = async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  $("install").hidden = true;
};
