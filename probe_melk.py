# /// script
# requires-python = ">=3.10"
# dependencies = ["bleak"]
# ///
"""Probe a MELK (Lotus Lamp X / ELK-BLEDOM family) controller: clock sync, power/colour/brightness/effect.

Frames match the official Lotus Lamp X app and web/drivers/melk.js (see PROTOCOL.md).
"""
import asyncio
import sys
import time

from bleak import BleakClient, BleakScanner

PREFIX = sys.argv[1] if len(sys.argv) > 1 else "MELK"
WAIT = float(sys.argv[2]) if len(sys.argv) > 2 else 120.0
STEP = 3.0

WRITE = "0000fff3-0000-1000-8000-00805f9b34fb"
NOTIFY = "0000fff4-0000-1000-8000-00805f9b34fb"

def clock():
    t = time.localtime()
    return bytes([0x7E, 0x06, 0x83, t.tm_hour, t.tm_min, t.tm_sec, (t.tm_wday + 1) % 7, 0x00, 0xEF])


def color(r, g, b):
    return bytes([0x7E, 0x07, 0x05, 0x03, r, g, b, 0x10, 0xEF])


def brightness(pct):
    return bytes([0x7E, 0x04, 0x01, pct, 0x01, 0xFF, 0x02, 0x01, 0xEF])


def effect(mode):
    return bytes([0x7E, 0x07, 0x03, mode, 0x06, 0xFF, 0xFF, 0x00, 0xEF])


STEPS = [
    ("off", bytes.fromhex("7e07040000000201ef")),
    ("on", bytes.fromhex("7e0704ff00010201ef")),
    ("red", color(255, 0, 0)),
    ("green", color(0, 255, 0)),
    ("blue", color(0, 0, 255)),
    ("brightness 20%", brightness(20)),
    ("brightness 100%", brightness(100)),
    ("effect 23 7-colour tail", effect(23)),
    ("effect 24 7-colour tail (back)", effect(24)),
    ("warm-ish colour (255,140,40)", color(255, 140, 40)),
]


async def main():
    t0 = time.monotonic()
    print(f"waiting up to {WAIT:.0f}s for {PREFIX!r}…", flush=True)
    dev = await BleakScanner.find_device_by_filter(
        lambda d, adv: (adv.local_name or d.name or "").startswith(PREFIX), timeout=WAIT)
    if not dev:
        print("not seen")
        return
    print(f"[{time.monotonic() - t0:5.1f}s] found {dev.address} {dev.name!r}", flush=True)

    async with BleakClient(dev, timeout=30) as c:
        await c.start_notify(NOTIFY, lambda _, d: print(f"    <- {d.hex()}", flush=True))
        sync = clock()
        print(f"clock -> {sync.hex()}", flush=True)
        await c.write_gatt_char(WRITE, sync, response=False)
        await asyncio.sleep(1)
        for label, frame in STEPS:
            print(f"[{time.monotonic() - t0:5.1f}s] {label}: {frame.hex()}", flush=True)
            await c.write_gatt_char(WRITE, frame, response=False)
            await asyncio.sleep(STEP)
        print(f"read FFF4: {(await c.read_gatt_char(NOTIFY)).hex()}", flush=True)


asyncio.run(main())
