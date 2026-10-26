// MELK-O* "Symphony" controllers (Lotus Lamp X app, ELK-BLEDOM family). See PROTOCOL.md.
//
// Advertises its name only (no service UUIDs), intermittently. GATT service 0xFFF0,
// commands written to 0xFFF3. Frame: 7E <len> <cmd> p0 p1 p2 p3 p4 EF, unused params
// default to FF FF FF FF 00. Frames match what the official app sends; names starting
// with "ELK-" use an encrypted variant and are not supported.

export const id = "melk";
export const label = "Lotus Lamp X";
export const filters = [{ namePrefix: "MELK" }];
export const service = 0xfff0;
export const writeChar = 0xfff3;
export const lengthRange = [10, 1000];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const pct = (level) => Math.round(clamp(level, 0, 1) * 100);

export function frame(cmd, params = [], len = 7) {
  const f = [0x7e, len, cmd, 0xff, 0xff, 0xff, 0xff, 0x00, 0xef];
  params.slice(0, 5).forEach((p, i) => (f[3 + i] = p));
  return new Uint8Array(f);
}

function hsToRgb(hue, sat) {
  const s = clamp(sat, 0, 100) / 100;
  const f = (n) => {
    const k = (n + hue / 60) % 6;
    return Math.round(255 * (1 - s * Math.max(0, Math.min(k, 4 - k, 1))));
  };
  return [f(5), f(3), f(1)];
}

// Byte 4 is the lamp type (0 = all channels); 02 01 = app type / version.
export const power = (on) => frame(0x04, on ? [0xff, 0x00, 0x01, 0x02, 0x01] : [0x00, 0x00, 0x00, 0x02, 0x01]);

export const color = (hue, sat) => frame(0x05, [0x03, ...hsToRgb(hue, sat), 0x10]);

export const brightness = (level) => frame(0x01, [pct(level), 0x01, 0xff, 0x02, 0x01], 4);

export const speed = (level) => frame(0x02, [pct(level)]);

// Most effects come in forward/back pairs (id, id + 1); `rev` picks the back variant.
export function effect(effectId, rev = false) {
  const paired = PAIRED.has(effectId);
  return frame(0x03, [effectId + (paired && rev ? 1 : 0), 0x06]);
}

// LED count is little-endian.
export const length = (count) => {
  const n = clamp(Math.round(count), ...lengthRange);
  return frame(0x21, [n & 0xff, n >> 8, 0x00]);
};

// Clock sync; the official app sends it right after connecting. wd: 0 = Sunday.
export const clock = (d = new Date()) =>
  new Uint8Array([0x7e, 0x06, 0x83, d.getHours(), d.getMinutes(), d.getSeconds(), d.getDay(), 0x00, 0xef]);

export const init = () => [["clock", clock()]];

const COLORS = ["Red", "Green", "Blue", "Yellow", "Cyan", "Purple", "White"];
const C = ["Red", "Green", "Blue", "Yellow", "Cyan", "Purple"];

// Build [id, name] entries for consecutive forward/back pairs starting at `start`.
const pairs = (start, names) => names.map((n, i) => [start + 2 * i, n]);

const PAIRED_GROUPS = [
  ["Transition", pairs(3, ["7 colors", "RGB", "YCP", ...["Red", "Green", "Blue", "Cyan", "Yellow", "Purple", "White"].map((c) => `6 colors → ${c}`)])],
  ["Tail", pairs(23, ["7 colors", ...COLORS])],
  ["Water", pairs(39, ["7 colors", "RGB", "YCP", "R-G", "G-B", "Y-B", "Y-C", "C-P", "White"])],
  ["Close / open", pairs(57, ["7 colors", "RGB", "YCP", ...COLORS])],
  ["Race", pairs(77, ["7 colors", "RGB", "YCP"])],
  ["Wave", pairs(83, ["7 colors", "RGB", "YCP"])],
  ["Running", pairs(89, [...COLORS, "7 colors", "RGB", "YCP", "B-P-C-Y", "B-G-C-Y"])],
  ["Flow", [...pairs(143, C.map((c) => `White-${c}-White`)), ...pairs(155, C.map((c) => `${c}-White-${c}`))]],
  ["Flush", [...pairs(181, ["7 colors", "RGB", "YCP"]), ...pairs(187, ["7 colors close/open", "RGB close/open", "YCP close/open"])]],
];

const PAIRED = new Set([1, ...PAIRED_GROUPS.flatMap(([, items]) => items.map(([i]) => i))]);

export const effects = [
  ["Basic", [
    [0, "Auto play"], [1, "Magic"], [212, "7 colors energy"],
    [193, "7 colors jump"], [194, "RGB jump"], [195, "YCP jump"],
    [196, "7 colors strobe"], [197, "RGB strobe"], [198, "YCP strobe"],
    [199, "7 colors gradual"], [200, "R-Y gradual"], [201, "R-P gradual"], [202, "G-C gradual"],
    [203, "G-Y gradual"], [204, "B-P gradual"],
  ]],
  ["Marquee", COLORS.map((c, i) => [205 + i, c])],
  ...PAIRED_GROUPS,
];
