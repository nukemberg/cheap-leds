# MR Star LED control

Offline PWA that drives MR Star BLE LED controllers (advertise as `GATT--DEMO`) via Web Bluetooth.

## Protocol

| | |
|---|---|
| Advertised service | `0x2022` (discovery filter) |
| GATT service | `0xFFF0` |
| Write char | `0xFFF3` (write without response) |
| Notify char | `0xFFF4` (silent, no state readback) |

Frame: `BC <op> <len> <args…> 55`, big-endian u16s.

| op | command | args |
|---|---|---|
| `01` | power | `00`/`01` |
| `03` | LED count | u16, 8–300 |
| `04` | color | hue u16 (0–360), sat×10 u16 (0–1000), `00 00` |
| `05` | brightness | u16 (0–1024), `00 00 00 00` |
| `06` | effect | u16 id (see `web/protocol.js`) |
| `07` | reverse | `00`/`01` |
| `08` | speed | u8 0–100 |

Examples: off `bc01010055`, red `bc0406000003e8000055`, 25% `bc050601000000000055`.
Command map from [mishamyrt/mr-star-ble](https://github.com/mishamyrt/mr-star-ble), verified on hardware with `probe.py`.
Full decoded protocol (extra opcodes, timers, mic mode, hidden effects, no state readback): [PROTOCOL.md](PROTOCOL.md).

## Run

- `just serve` — http://localhost:8765 (Web Bluetooth needs localhost or HTTPS)
- `just android` — phone over USB: `adb reverse` then open http://localhost:8765 in Chrome, menu → *Install app*
- Or host `web/` on any HTTPS static host, open once, install. Works offline afterwards.
- `just test` — protocol byte tests
- `just scan` / `just gatt` / `just probe` — BLE tooling

Bump `VERSION` in `web/sw.js` when changing files so installed copies update.
