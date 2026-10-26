# MR Star BLE protocol

Decoded from the official Android app `com.frok.mrstar` 1.0.0 (versionCode 104, Java, FastBLE) and
checked against real controllers. Command names cross-checked with
[mishamyrt/mr-star-ble](https://github.com/mishamyrt/mr-star-ble).

## Transport

| | |
|---|---|
| Advertised name | `GATT--DEMO` (app ignores the name) |
| Advertised service | `0x2022` — the app's scan filter only checks this |
| GATT service | `0xFFF0` |
| Write | `0xFFF3` — app writes with response; write-without-response also works |
| Notify | `0xFFF4` — must be subscribed before any reply can arrive |

No handshake, no checksum, no GATT reads, no protocol variants by name or firmware.

## Frame

```
BC <op> <len> <args…> 55
```

Multi-byte values are big-endian.

## Opcodes

| Op | Args | Meaning | Verified |
|---|---|---|---|
| `01` | u8: 1 on, 0 off | Power | yes |
| `02` | u8: 1 RGB, 2 RBG, 3 GRB, 4 GBR, 5 BRG, 6 BGR | Colour channel order. **Persistent config**; wrong value scrambles colours | no |
| `03` | u16, 8–300 | LED count. **Persistent config** | no |
| `04` | hue u16 0–360, sat u16 0–1000, `00 00` | Colour | yes |
| `05` | u16 brightness, `00 00 00 00` | Brightness. App slider 100–1000; 1024 also accepted | yes |
| `06` | u16 effect id | Effect (app encodes as `id/255, id%255`; identical for ids < 255) | yes |
| `07` | u8: 0 normal, 1 reversed | Direction | no |
| `08` | u8, 1–100 | Speed | no |
| `09` | same layout as `04` | Colour stream from phone mic (~every 200 ms); probably not persisted | no |
| `0B` | year u16, month, day, hour, min, sec, `55`, weekday (1 Mon … 7 Sun) | Clock sync. `len` = 7; the weekday byte comes *after* the `55` | no |
| `0C` | `01` | Query timers | sent, no reply |
| `0D` | `01`, kind (1 on, 0 off), enabled, day mask, hour, min | Set schedule. Day mask bits 0–6 = Mon–Sun; bit 7 = inverse of enabled (meaning unknown) | no |
| `0F` | u8: 1 device mic, 0 phone mic | Mic source; app sends 1 whenever the Mic tab opens | no |
| `11` | u8: 1 Energy, 2 Rhythm, 3 Spectrum, 4 Scroll | Device-mic music mode | no |
| `12` | u8, 0–100 | Mic sensitivity | no |
| `13` | u16 angle 0–360 | Probably colour temperature (hidden view in app) | no |
| `50` | ? | Never sent; only in the app's retry list with `0B`, `0C` | no |

There is no rename, factory reset, chip type, segment/DIY or white-channel command.

## State readback

There is no query for power, colour, effect, brightness or version — clients must track
what they sent.

The app subscribes to `FFF4` only on the Timer tab and immediately writes `BC 0C 01 01 55`.
Expected reply: byte 1 = `0x0D`, byte 4 kind, 5 enabled, 6 day mask, 7 hour, 8 minute (one
frame per timer; the app re-queries on any other op). The app also parses unsolicited frames
with op `05` (brightness u16 at bytes 3–4), `08` (speed at byte 3) and `10` (mic sensitivity at
byte 3), but the device was not observed sending them.

Observed: with notify enabled, `BC 0C 01 01 55` got **no reply** (no timers were set; untested
with timers configured). Ops `01`/`04`/`05` produce no notifications either.

## Effects

Shown in the app (all confirmed in its UI):

| Group | Ids |
|---|---|
| Basic | 1 Automatic loop, 2 Symphony, 3 Colorful energy, 4 Colorful jumps, 7 7-colour strobe, 10 7-colour gradient, 26 Colorful fluttering, 27 RGB fluttering, 29 Colorful brushing, 30 RGB brushing, 31 YCP brushing, 32 Colorful brush closed-pull |
| Opening & closing | 35 7-colour, 36 RGB, 37 YCP, 38 Red, 39 Green, 40 Blue, 41 Yellow, 42 Cyan, 43 Purple, 44 White |
| Light-dark transition | 45 7-colour, 46 Blue-red-green, 47 Violet-green-yellow, 48 Red, 49 Green, 50 Blue, 51 Cyan, 52 Yellow, 53 Purple, 54 White |
| Running water | 55 7-colour, 56 Blue-green-red, 57 Purple-green-yellow, 58 Red-green, 59 Green-blue, 60 Yellow-blue, 61 Yellow-cyan, 62 Blue-purple |
| Tailing | 76 7-colour, 77 Red, 78 Green, 79 Blue, 80 Yellow, 81 Cyan, 82 Purple, 83 White |
| Running | 84 Red, 85 Green, 86 Blue, 87 Yellow, 88 Cyan, 89 Purple, 90 White, 91 7-colour, 92 Blue-green-red, 93 Purple-cyan-yellow |

Hidden (names in the app's strings, never sent; firmware support unknown):

| Group | Ids |
|---|---|
| Jumps / strobe | 5 RGB jumps, 6 YBP jumps, 8 RGB strobe, 9 YPB strobe |
| Alternating gradients | 11 Red-yellow, 12 Red-purple, 13 "Green-green", 14 Green-yellow, 15 Blue-purple |
| Horse racing / chasing | 16 Red, 17 Green, 18 Blue, 19 Yellow, 20 Cyan, 21 Purple, 22 White, 23 Colorful chasing, 24 RGB follow-up, 25 YCP follow-up |
| Misc | 28 YCP fluttering, 33 RGB closed-pull, 34 YCP closed-pull |
| Flow | 63 Black-white running water; 64–69 White-X-white (red, green, blue, yellow, cyan?, purple); 70–75 X-white-X (red, green, blue, yellow, cyan?, purple) |
| Running | 94 Blue-purple-cyan-yellow, 95 Blue-green-cyan-yellow |
| Dot on background | 96 red/white, 97 green/red, 98 blue/green, 99 yellow/blue, 100 blue/yellow, 101 purple/blue, 102 white/purple, 103 white/red |
| 7-colour on background | 104 red, 105 green, 106 blue, 107 yellow, 108 green(dup), 109 purple, 110 white |
| Dot on background | 111 green/blue, 112 green/red, 113 red/blue, 114 blue/yellow, 115 yellow/purple, 116 white/yellow, 117 yellow/white |

The webapp currently exposes the shown set plus 9, 28, 94, 95 (from mr-star-ble).

## Open questions

`09` persistence, `13` meaning, `50`, timer day-mask bit 7, timer reply bytes 0/2/3, whether
`0C` replies once timers exist, which hidden effects the firmware implements.
