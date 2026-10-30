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

---

# Lotus Lamp X / MELK protocol

Decoded from the official Android app `com.szelk.ledlamppro` ("LotusLamp X") 5.21.01, cross-checked
with the [elkbledom](https://github.com/dave-code-ruiz/elkbledom) Home Assistant integration,
and probed on a `MELK-OA10   45` controller. Driver: `web/drivers/melk.js`.

## Transport

| | |
|---|---|
| Advertised name | `MELK-OA10   45` — name only, no service UUIDs; advertises intermittently (power-cycle to make it visible) |
| GATT service | `0xFFF0` |
| Write | `0xFFF3` (write, write-without-response, read) |
| Notify | `0xFFF4` (notify, read) |

The app picks a variant from the name. `MELK-O*` without W/WCT in the name is "Symphony"
(addressable) using the plain 9-byte E1 frame below. Names starting `ELK-` use an encrypted
variant (AA…55 frame XORed with a keystream, 21 bytes) — not supported here.

No handshake for MELK-OA10. The app enables notify on FFF4, then sends a clock sync.
(elkbledom sends `7E 07 83` then `7E 04 04` as a "login"; the device answered `12 13 14` on
FFF4, after which FFF4 read back ASCII `CSZGP10Y69-BGR04`, likely a chip/firmware tag.)

## Frame (E1)

```
7E <len> <cmd> p0 p1 p2 p3 p4 EF        defaults: p0–p3 = FF, p4 = 00
```

`len` is 07 except 04 for brightness and 06 for clock. Firmware appears to ignore it.

| Function | Frame |
|---|---|
| Power on / off | `7E 07 04 FF 00 01 02 01 EF` / `7E 07 04 00 00 00 02 01 EF` (p1 = lamp type, 0 = all) |
| RGB colour | `7E 07 05 03 RR GG BB 10 EF` |
| Brightness 0–100 | `7E 04 01 BB 01 FF 02 01 EF` |
| Speed 0–100 | `7E 07 02 SS FF FF FF 00 EF` |
| Effect | `7E 07 03 MM 06 FF FF 00 EF` |
| Device-mic mode | `7E 07 03 MM 04 FF FF 00 EF` (80 Energy1, 81 Rhythm1, 82 Spectrum1, 83 Scroll1, 84–87 the "2" set) |
| Mic sensitivity / on-off | `7E 07 06 SS FF FF FF 00 EF` / `7E 07 07 0X FF FF FF 00 EF` |
| Phone-music beat | `7E 07 08 VAL IDX FF FF 00 EF`; colour `7E 07 05 03 R G B 20 EF` |
| RGB channel order | `7E 07 81 a b c FF 00 EF` (1 = R, 2 = G, 3 = B in wire order). **Persistent config** |
| LED count 10–1000 | `7E 07 21 LO HI 00 FF 00 EF` (little-endian). **Persistent config** |
| Clock sync | `7E 06 83 hh mm ss wd 00 EF` (wd 0 = Sunday) |
| Timer set / query | `7E 07 82 hh mm 00 OO MASK EF` (OO 00 on / 01 off; MASK bit0 Mon … bit6 Sun, bit7 enabled) / `7E 07 82 FF FF FF OO 00 EF` |
| Multi-timer | read `7E 8A 00 00 EF`; write `7E 89 [8-byte records] n 00 EF` |

**Never send:** factory reset `7E 07 87 …`; protect code / password `8E 07 24 …`; pairing/lock
`8F`/`8C`; BLE settings `D7`, sync code `72`, OTA `43`, app type `EA`, mesh `C1`–`C5`/`E1`.

## State readback

None. The app parses only timer (`82`), multi-timer (`8A`), protect-code (`24`) and TV (`66`)
replies. FFF3/FFF4 reads echo the last frame written (an observed `7E 06 83 0B 31 36 06 00 EF`
is a clock sync for 11:49:54 Saturday). The elkbledom query `7E 00 01 FA …` got no reply.

## Effects (decimal ids)

Most come in forward/back pairs `id`, `id + 1`; the webapp lists the forward id and the
Reverse toggle selects `id + 1`.

| Group | Ids |
|---|---|
| Basic | 0 Auto play, 1/2 Magic, 212 7-colour energy, 193–195 jump (7C, RGB, YCP), 196–198 strobe, 199 7C gradual, 200 R-Y, 201 R-P, 202 G-C, 203 G-Y, 204 B-P gradual |
| Marquee | 205–211 Red, Green, Blue, Yellow, Cyan, Purple, White |
| Transition (pairs) | 3 7C, 5 RGB, 7 YCP, 9–21 "6 colours → X" for Red, Green, Blue, Cyan, Yellow, Purple, White |
| Tail (pairs) | 23 7C, then Red … White |
| Water (pairs) | 39 7C, RGB, YCP, R-G, G-B, Y-B, Y-C, C-P, White |
| Close / open (pairs) | 57 7C, RGB, YCP, Red … White |
| Race / Wave (pairs) | 77 / 83: 7C, RGB, YCP |
| Running (pairs) | 89 Red … White, 7C, RGB, YCP, B-P-C-Y, B-G-C-Y; 113–141 and 167–180 dot / 7C-in-colour (not in UI, names unknown) |
| Flow (pairs) | 143 W-x-W, 155 x-W-x for R, G, B, Y, C, P |
| Flush (pairs) | 181 7C, RGB, YCP; 187 same, close/open |
| Other | 213–233, only for model numbers ≥ 21 (not OA10) |

---

# BanlanX SP621E

Not decoded by us: taken from [monty68/uniled](https://github.com/monty68/uniled) `banlanx2.py`
(model id `0x621E`, "Mini SPI RGB Controller"). Checked on a real SP621E (advertised as `SP621E`, company `0x5053`, data `0D 10 …`): power, red/green/blue/orange, brightness, effects and the state query (reply `53 43 …`) work. The controller also exposes a second service `5833FF01-9B8B-5191-6142-22A4536EF123` (write `…FF02`, notify `…FF03`), unused. Driver: `web/drivers/banlanx.js`.

| | |
|---|---|
| Discovery | Manufacturer data, company `0x5053` or `0x13BD`, first byte `0x0D` or `0x16`; name assumed `SP6…` |
| GATT service / write | `0xFFE0` / `0xFFE1` |

Frame `A0 <op> <len> <args…>`, no checksum.

| Op | Args | Meaning |
|---|---|---|
| `62` | 1 on, 0 off | Power |
| `63` | effect id | Effect; `BE` = solid colour, `01`–`8E` animations |
| `64` | order | Chip colour order (persistent; not exposed) |
| `66` | 0–255 | Brightness |
| `67` | 1–10 | Speed |
| `68` | 1–150 | Effect length (not LED count; not exposed) |
| `69` | R G B level | Solid colour (send `63 BE` first) |
| `6A` | 0–2 | Light mode |
| `70` | – | State query (reply header `53 43`) |

Effect families (7 variants each unless noted; per-variant names unknown): rainbow 01–04, fire 05–0A,
comet 0B–11, meteor 12–18, gradual snake 19–2D, wave 2E–49, stars 4A–50, background stars 51–5D,
breath 5E–64, stacking 65–6B, stack 6C–72, snake 73–78, comet spin 79–7F, dot spin 80–86,
segment spin 87–8D, gradient 8E.
