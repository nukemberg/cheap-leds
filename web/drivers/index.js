// Driver registry. A driver exports: id, label, filters (Web Bluetooth requestDevice
// filters), service, writeChar, lengthRange, effects, and frame builders
// power/color/brightness/speed/effect/length/clock/timer, plus optional reverse and init.
import * as melk from "./melk.js";
import * as mrstar from "./mrstar.js";

export const drivers = [mrstar, melk];

// MR Star controllers advertise as GATT--DEMO; anything else we accept is MELK.
export const driverFor = (name) => (name?.startsWith("MELK") ? melk : mrstar);

export const requestOptions = () => ({
  filters: drivers.flatMap((d) => d.filters),
  optionalServices: [...new Set(drivers.map((d) => d.service))],
});
