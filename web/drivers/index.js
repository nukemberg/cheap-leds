// Driver registry. A driver exports: id, label, filters (Web Bluetooth requestDevice
// filters), service, writeChar, lengthRange, effects, and frame builders
// power/color/brightness/speed/effect/length/clock/timer, plus optional reverse and init.
import * as melk from "./melk.js";
import * as banlanx from "./banlanx.js";
import * as mrstar from "./mrstar.js";

export const drivers = [mrstar, melk, banlanx];

// MR Star controllers advertise as GATT--DEMO; MELK-* is Lotus Lamp, SP6* is BanlanX.
export const driverFor = (name) => (name?.startsWith("MELK") ? melk : name?.startsWith("SP6") ? banlanx : mrstar);

export const requestOptions = () => ({
  filters: drivers.flatMap((d) => d.filters),
  optionalServices: [...new Set(drivers.map((d) => d.service))],
});
