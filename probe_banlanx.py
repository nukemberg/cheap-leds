# /// script
# requires-python = ">=3.10"
# dependencies = ["bleak"]
# ///
"""Probe a BanlanX SP621E: state query, then power/colour/brightness/effect steps.

Frames match web/drivers/banlanx.js (see PROTOCOL.md). Prints any notifications.
"""
import asyncio
import sys
import time

from bleak import BleakClient, BleakScanner

PREFIX = sys.argv[1] if len(sys.argv) > 1 else "SP621E"
STEP = 3.0
SERVICE = "0000ffe0-0000-1000-8000-00805f9b34fb"
WRITE = "0000ffe1-0000-1000-8000-00805f9b34fb"


def frame(op, *args):
    return bytes([0xA0, op, len(args), *args])


SOLID = frame(0x63, 0xBE)
STEPS = [
    ("state query", frame(0x70)[:3]),
    ("off", frame(0x62, 0)),
    ("on", frame(0x62, 1)),
    ("solid", SOLID),
    ("red", frame(0x69, 255, 0, 0, 255)),
    ("green", frame(0x69, 0, 255, 0, 255)),
    ("blue", frame(0x69, 0, 0, 255, 255)),
    ("brightness 20%", frame(0x66, 51)),
    ("brightness 100%", frame(0x66, 255)),
    ("speed 10", frame(0x67, 10)),
    ("effect 0x01 rainbow", frame(0x63, 0x01)),
    ("effect 0x2e wave", frame(0x63, 0x2E)),
    ("effect 0x8e gradient", frame(0x63, 0x8E)),
    ("back to solid", SOLID),
    ("red", frame(0x69, 255, 0, 0, 255)),
]


async def main():
    dev = await BleakScanner.find_device_by_filter(
        lambda d, adv: (adv.local_name or d.name or "").startswith(PREFIX), timeout=30)
    if not dev:
        print("not seen")
        return
    print(f"found {dev.address} {dev.name!r}", flush=True)
    async with BleakClient(dev, timeout=30) as c:
        for s in c.services:
            for ch in s.characteristics:
                print(f"  {s.uuid} / {ch.uuid} {ch.properties}", flush=True)
        for s in c.services:
            for ch in s.characteristics:
                if "notify" in ch.properties:
                    await c.start_notify(ch, lambda _, d: print(f"    <- {d.hex()}", flush=True))
        for label, f in STEPS:
            print(f"{label}: {f.hex()}", flush=True)
            await c.write_gatt_char(WRITE, f, response=False)
            await asyncio.sleep(STEP)


asyncio.run(main())
