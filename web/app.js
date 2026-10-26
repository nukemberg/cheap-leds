import * as P from "./protocol.js";
import { Light } from "./device.js";

const $ = (id) => document.getElementById(id);

const DEFAULTS = { on: true, mode: "color", hue: 30, sat: 80, bri: 80, effect: 1, spd: 50, rev: false, len: 100 };
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

const state = { ...DEFAULTS, ...store.get("state", {}) };
const meta = store.get("devices", {}); // id -> { name, enabled }
const lights = new Map(); // id -> Light

const save = () => store.set("state", state);
const saveMeta = () => store.set("devices", meta);

function broadcast(bytes) {
  for (const light of lights.values()) {
    if (meta[light.id]?.enabled !== false) light.send(bytes);
  }
}

// Full state sync, used when a controller (re)connects since it can't report its own state.
function syncTo(light) {
  light.send(P.power(state.on));
  light.send(P.brightness(state.bri / 100));
  light.send(P.speed(state.spd / 100));
  light.send(P.reverse(state.rev));
  light.send(state.mode === "effect" ? P.effect(state.effect) : P.color(state.hue, state.sat));
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
  return light;
}

function renderDevices() {
  const ul = $("devices");
  ul.replaceChildren();
  $("empty").hidden = lights.size > 0;
  let i = 0;
  for (const light of lights.values()) {
    i++;
    const m = meta[light.id];
    const li = document.createElement("li");
    li.className = light.connected ? "on" : "off";

    const check = Object.assign(document.createElement("input"), { type: "checkbox", checked: m.enabled !== false, title: "Include in commands" });
    check.onchange = () => {
      m.enabled = check.checked;
      saveMeta();
      if (check.checked) syncTo(light);
    };

    const name = Object.assign(document.createElement("input"), { className: "name", value: m.name === "GATT--DEMO" ? `Strip ${i}` : m.name });
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
    b.classList.toggle("active", state.mode === "effect" && +b.dataset.id === state.effect);
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
  broadcast(P.color(hue, sat));
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

function buildEffects() {
  for (const [group, items] of P.EFFECTS) {
    const details = document.createElement("details");
    details.append(Object.assign(document.createElement("summary"), { textContent: group }));
    const grid = document.createElement("div");
    grid.className = "chips";
    for (const [id, label] of items) {
      const b = Object.assign(document.createElement("button"), { textContent: label });
      b.dataset.id = id;
      b.onclick = () => {
        Object.assign(state, { effect: id, mode: "effect" });
        broadcast(P.effect(id));
        paint();
        save();
      };
      grid.append(b);
    }
    details.append(grid);
    $("effects").append(details);
  }
}

function init() {
  buildPresets();
  buildEffects();

  bindRange("hue", "hue", () => {
    state.mode = "color";
    broadcast(P.color(state.hue, state.sat));
  });
  bindRange("sat", "sat", () => {
    state.mode = "color";
    broadcast(P.color(state.hue, state.sat));
  });
  bindRange("bri", "bri", () => broadcast(P.brightness(state.bri / 100)));
  bindRange("spd", "spd", () => broadcast(P.speed(state.spd / 100)));
  bindRange("len", "len", () => {});

  $("swatch").onclick = () => setColor(state.hue, state.sat);
  $("rev").checked = state.rev;
  $("rev").onchange = () => {
    state.rev = $("rev").checked;
    broadcast(P.reverse(state.rev));
    save();
  };
  $("send-len").onclick = () => broadcast(P.length(state.len));
  $("power").onclick = () => {
    state.on = !state.on;
    broadcast(P.power(state.on));
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
