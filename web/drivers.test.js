// node --test web/drivers.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import * as mrstar from "./drivers/mrstar.js";
import * as melk from "./drivers/melk.js";
import { driverFor, requestOptions } from "./drivers/index.js";

const hex = (b) => Buffer.from(b).toString("hex");

// Frames verified against real MR Star controllers with probe.py.
test("mrstar power", () => {
  assert.equal(hex(mrstar.power(false)), "bc01010055");
  assert.equal(hex(mrstar.power(true)), "bc01010155");
});

test("mrstar color hue/sat", () => {
  assert.equal(hex(mrstar.color(0, 100)), "bc0406000003e8000055");
  assert.equal(hex(mrstar.color(120, 100)), "bc0406007803e8000055");
  assert.equal(hex(mrstar.color(240, 100)), "bc040600f003e8000055");
});

test("mrstar brightness 0-1 -> 0-1024", () => {
  assert.equal(hex(mrstar.brightness(0.25)), "bc050601000000000055");
  assert.equal(hex(mrstar.brightness(1)), "bc050604000000000055");
  assert.equal(hex(mrstar.brightness(2)), "bc050604000000000055"); // clamped
});

test("mrstar effect / speed / reverse / length", () => {
  assert.equal(hex(mrstar.effect(91)), "bc0602005b55");
  assert.equal(hex(mrstar.effect(91, true)), "bc0602005b55"); // direction is a separate command
  assert.equal(hex(mrstar.speed(0.5)), "bc08013255");
  assert.equal(hex(mrstar.reverse(true)), "bc07010155");
  assert.equal(hex(mrstar.length(300)), "bc0302012c55");
  assert.equal(hex(mrstar.length(1)), "bc0302000855"); // clamped to 8
});

// From the MR Star app's TimerUtils.sendPhoneTime / TimerFragment.
test("mrstar clock sync puts weekday after the end byte", () => {
  const d = new Date(2026, 9, 24, 11, 49, 54); // Saturday
  assert.equal(hex(mrstar.clock(d)), "bc0b0707ea0a180b31365506");
  assert.equal(hex(mrstar.clock(new Date(2026, 9, 25))).slice(-2), "07"); // Sunday = 7
  assert.deepEqual(mrstar.init().map(([cmd]) => cmd), ["clock"]);
});

test("mrstar timers", () => {
  const weekdays = 0b0011111;
  assert.equal(hex(mrstar.timer("on", { enabled: true, hour: 7, minute: 30, days: weekdays })), "bc0d060101011f071e55");
  assert.equal(hex(mrstar.timer("off", { enabled: false, hour: 23, minute: 0, days: 0x7f })), "bc0d06010000ff170055");
});

// Frames as built by the Lotus Lamp X app (BlePackagingDevice / E1Achieve).
test("melk timers", () => {
  assert.equal(hex(melk.timer("on", { enabled: true, hour: 7, minute: 30, days: 0b0011111 })), "7e0782071e00009fef");
  assert.equal(hex(melk.timer("off", { enabled: false, hour: 23, minute: 0, days: 0x7f })), "7e0782170000017fef");
});

test("melk power", () => {
  assert.equal(hex(melk.power(true)), "7e0704ff00010201ef");
  assert.equal(hex(melk.power(false)), "7e07040000000201ef");
});

test("melk color converts hue/sat to RGB", () => {
  assert.equal(hex(melk.color(0, 100)), "7e070503ff000010ef");
  assert.equal(hex(melk.color(120, 100)), "7e07050300ff0010ef");
  assert.equal(hex(melk.color(240, 100)), "7e0705030000ff10ef");
  assert.equal(hex(melk.color(0, 0)), "7e070503ffffff10ef");
});

test("melk brightness / speed 0-100", () => {
  assert.equal(hex(melk.brightness(0.2)), "7e04011401ff0201ef");
  assert.equal(hex(melk.brightness(1)), "7e04016401ff0201ef");
  assert.equal(hex(melk.speed(0.5)), "7e070232ffffff00ef");
});

test("melk effect picks back variant for paired effects", () => {
  assert.equal(hex(melk.effect(0)), "7e07030006ffff00ef");
  assert.equal(hex(melk.effect(0, true)), "7e07030006ffff00ef"); // unpaired
  assert.equal(hex(melk.effect(23)), "7e07031706ffff00ef"); // 7-colour tail forward
  assert.equal(hex(melk.effect(23, true)), "7e07031806ffff00ef"); // ...back = 24
  assert.equal(hex(melk.effect(1, true)), "7e07030206ffff00ef"); // magic back = 2
});

test("melk length is little-endian and clamped", () => {
  assert.equal(hex(melk.length(300)), "7e07212c0100ff00ef");
  assert.equal(hex(melk.length(5)), "7e07210a0000ff00ef");
});

test("melk clock sync", () => {
  const d = new Date(2026, 9, 24, 11, 49, 54); // a Saturday
  assert.equal(hex(melk.clock(d)), "7e06830b31360600ef");
  assert.deepEqual(melk.init().map(([cmd]) => cmd), ["clock"]);
});

test("melk effect ids are unique", () => {
  const ids = melk.effects.flatMap(([, items]) => items.map(([i]) => i));
  assert.equal(new Set(ids).size, ids.length);
});

test("driver selection and request options", () => {
  assert.equal(driverFor("GATT--DEMO"), mrstar);
  assert.equal(driverFor("MELK-OA10   45"), melk);
  assert.equal(driverFor(undefined), mrstar);
  const opts = requestOptions();
  assert.deepEqual(opts.filters, [{ services: [0x2022] }, { namePrefix: "MELK" }]);
  assert.deepEqual(opts.optionalServices, [0xfff0]);
});
