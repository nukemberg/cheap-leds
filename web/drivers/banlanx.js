// BanlanX SP621E "Mini SPI RGB Controller" (SP6xxE v2 protocol, LED Hue/SP LED app). See PROTOCOL.md.
//
// Protocol taken from monty68/uniled (banlanx2.py); power, colour and brightness checked on a real SP621E.
// GATT service 0xFFE0, commands written to 0xFFE1. Frame: A0 <op> <len> <args...>, no checksum.
// Advertises manufacturer data (company 0x5053 or 0x13BD, first byte 0x0D or 0x16) as well as a name.

export const id = "banlanx";
export const label = "BanlanX SP621E";
export const filters = [
  { namePrefix: "SP6" },
  ...[0x5053, 0x13bd].flatMap((companyIdentifier) =>
    [0x0d, 0x16].map((b) => ({ manufacturerData: [{ companyIdentifier, dataPrefix: new Uint8Array([b]) }] })),
  ),
];
export const service = 0xffe0;
export const writeChar = 0xffe1;
// SP621E has no LED-count command in this protocol (0x68 is effect length, not strip length).
export const lengthRange = [1, 150];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const byte = (level) => Math.round(clamp(level, 0, 1) * 255);

export const frame = (op, args) => new Uint8Array([0xa0, op, args.length, ...args]);

const SOLID = 0xbe;

export const power = (on) => frame(0x62, [on ? 1 : 0]);

// 0-1 mapped onto 0-255
export const brightness = (level) => frame(0x66, [byte(level)]);

// 0-1 mapped onto 1-10
export const speed = (level) => frame(0x67, [Math.round(1 + clamp(level, 0, 1) * 9)]);

export const effect = (effectId) => frame(0x63, [effectId]);

function hsToRgb(hue, sat) {
  const s = clamp(sat, 0, 100) / 100;
  const f = (n) => {
    const k = (n + hue / 60) % 6;
    return Math.round(255 * (1 - s * Math.max(0, Math.min(k, 4 - k, 1))));
  };
  return [f(5), f(3), f(1)];
}

// Switch to the solid-colour effect, then set the colour (last byte = colour level).
export const color = (hue, sat) => [effect(SOLID), frame(0x69, [...hsToRgb(hue, sat), 0xff])];

// Families are consecutive id ranges (colour/direction variants), numbered within the family.
const family = (name, from, to) => [name, Array.from({ length: to - from + 1 }, (_, i) => [from + i, `${name} ${i + 1}`])];

export const effects = [
  family("Rainbow", 0x01, 0x04),
  family("Fire", 0x05, 0x0a),
  family("Comet", 0x0b, 0x11),
  family("Meteor", 0x12, 0x18),
  family("Gradual snake", 0x19, 0x2d),
  family("Wave", 0x2e, 0x49),
  family("Stars", 0x4a, 0x50),
  family("Background stars", 0x51, 0x5d),
  family("Breath", 0x5e, 0x64),
  family("Stacking", 0x65, 0x6b),
  family("Stack", 0x6c, 0x72),
  family("Snake", 0x73, 0x78),
  family("Comet spin", 0x79, 0x7f),
  family("Dot spin", 0x80, 0x86),
  family("Segment spin", 0x87, 0x8d),
  ["Gradient", [[0x8e, "Gradient"]]],
];
