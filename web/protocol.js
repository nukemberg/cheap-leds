// MR Star BLE LED controller protocol.
//
// Advertised service 0x2022 (used for discovery only); GATT service 0xFFF0,
// commands written (without response) to characteristic 0xFFF3.
// Frame: BC <op> <len> <args...> 55. Multi-byte values are big-endian.
// The device sends no state back (0xFFF4 notify stays silent).

export const ADV_SERVICE = 0x2022;
export const GATT_SERVICE = 0xfff0;
export const WRITE_CHAR = 0xfff3;

export const Op = {
  POWER: 0x01,
  LENGTH: 0x03,
  COLOR: 0x04,
  BRIGHTNESS: 0x05,
  EFFECT: 0x06,
  REVERSE: 0x07,
  SPEED: 0x08,
};

const u16 = (v) => [(v >> 8) & 0xff, v & 0xff];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function frame(op, args) {
  if (!args.length) throw new Error("empty command");
  return new Uint8Array([0xbc, op, args.length, ...args, 0x55]);
}

export const power = (on) => frame(Op.POWER, [on ? 1 : 0]);

// hue 0-360, saturation 0-100 (device takes saturation * 10)
export const color = (hue, sat) =>
  frame(Op.COLOR, [
    ...u16(Math.round(clamp(hue, 0, 360))),
    ...u16(Math.round(clamp(sat, 0, 100) * 10)),
    0,
    0,
  ]);

// 0-1 mapped onto 0-1024
export const brightness = (level) =>
  frame(Op.BRIGHTNESS, [...u16(Math.round(clamp(level, 0, 1) * 1024)), 0, 0, 0, 0]);

export const effect = (id) => frame(Op.EFFECT, u16(id));

// 0-1 mapped onto 0-100
export const speed = (level) => frame(Op.SPEED, [Math.round(clamp(level, 0, 1) * 100)]);

export const reverse = (on) => frame(Op.REVERSE, [on ? 1 : 0]);

export const length = (count) => frame(Op.LENGTH, u16(clamp(Math.round(count), 8, 300)));

export const EFFECTS = [
  ["Basic", [
    [1, "Automatic loop"], [2, "Symphony"], [3, "Colorful energy"], [4, "Colorful jumps"],
    [7, "Rainbow strobe"], [9, "YPB strobe"], [10, "Rainbow gradient"],
  ]],
  ["Fluttering & brushing", [
    [26, "Colorful flutter"], [27, "RGB flutter"], [28, "YCP flutter"],
    [29, "Colorful brush"], [30, "RGB brush"], [31, "YCP brush"], [32, "Brush closed pull"],
  ]],
  ["Open & close", [
    [35, "Rainbow"], [36, "RGB"], [37, "YCP"], [38, "Red"], [39, "Green"], [40, "Blue"],
    [41, "Yellow"], [42, "Cyan"], [43, "Purple"], [44, "White"],
  ]],
  ["Breathing", [
    [45, "Rainbow"], [46, "RGB"], [47, "VGY"], [48, "Red"], [49, "Green"], [50, "Blue"],
    [51, "Cyan"], [52, "Yellow"], [53, "Purple"], [54, "White"],
  ]],
  ["Flowing water", [
    [55, "Rainbow"], [56, "RGB"], [57, "VY"], [58, "RG"], [59, "GB"], [60, "YB"],
    [61, "YC"], [62, "GP"],
  ]],
  ["Trailing", [
    [76, "Rainbow"], [77, "Red"], [78, "Green"], [79, "Blue"], [80, "Yellow"],
    [81, "Cyan"], [82, "Purple"], [83, "White"],
  ]],
  ["Running", [
    [91, "Rainbow"], [84, "Red"], [85, "Green"], [86, "Blue"], [87, "Yellow"], [88, "Cyan"],
    [89, "Purple"], [90, "White"], [92, "BGR"], [93, "PCY"], [94, "BPCY"], [95, "BGCY"],
  ]],
];
