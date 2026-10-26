// node --test web/protocol.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import * as P from "./protocol.js";

const hex = (b) => Buffer.from(b).toString("hex");

// Frames verified against real controllers with probe.py.
test("power", () => {
  assert.equal(hex(P.power(false)), "bc01010055");
  assert.equal(hex(P.power(true)), "bc01010155");
});

test("color hue/sat", () => {
  assert.equal(hex(P.color(0, 100)), "bc0406000003e8000055");
  assert.equal(hex(P.color(120, 100)), "bc0406007803e8000055");
  assert.equal(hex(P.color(240, 100)), "bc040600f003e8000055");
});

test("brightness 0-1 -> 0-1024", () => {
  assert.equal(hex(P.brightness(0.25)), "bc050601000000000055");
  assert.equal(hex(P.brightness(1)), "bc050604000000000055");
  assert.equal(hex(P.brightness(2)), "bc050604000000000055"); // clamped
});

test("effect / speed / reverse / length", () => {
  assert.equal(hex(P.effect(91)), "bc0602005b55");
  assert.equal(hex(P.speed(0.5)), "bc08013255");
  assert.equal(hex(P.reverse(true)), "bc07010155");
  assert.equal(hex(P.length(300)), "bc0302012c55");
  assert.equal(hex(P.length(1)), "bc0302000855"); // clamped to 8
});
