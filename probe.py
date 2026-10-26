# /// script
# requires-python = ">=3.10"
# dependencies = ["bleak"]
# ///
"""Verify MR Star protocol on all nearby controllers: power cycle + RGB colors, log notifications."""
import asyncio

from bleak import BleakClient, BleakScanner

SERVICE = "00002022-0000-1000-8000-00805f9b34fb"
WRITE = "0000fff3-0000-1000-8000-00805f9b34fb"
NOTIFY = "0000fff4-0000-1000-8000-00805f9b34fb"


def cmd(op: int, *args: int) -> bytes:
    return bytes([0xBC, op, len(args), *args, 0x55])


def hs(hue: int, sat_pct: float) -> bytes:
    s = int(sat_pct * 10)
    return cmd(0x04, hue >> 8, hue & 0xFF, s >> 8, s & 0xFF, 0, 0)


STEPS = [
    ("off", cmd(0x01, 0)),
    ("on", cmd(0x01, 1)),
    ("red", hs(0, 100)),
    ("green", hs(120, 100)),
    ("blue", hs(240, 100)),
    ("brightness 25%", cmd(0x05, 0x01, 0x00, 0, 0, 0, 0)),
    ("brightness 100%", cmd(0x05, 0x04, 0x00, 0, 0, 0, 0)),
]


async def main():
    devs = await BleakScanner.discover(timeout=12, service_uuids=[SERVICE])
    print("found:", [d.address for d in devs])
    clients = [BleakClient(d) for d in devs]
    for c in clients:
        await c.connect()
        addr = c.address
        await c.start_notify(NOTIFY, lambda _, data, a=addr: print(f"  notify {a[:8]}: {data.hex()}"))
    for label, payload in STEPS:
        print(f"{label}: {payload.hex()}")
        for c in clients:
            await c.write_gatt_char(WRITE, payload, response=False)
        await asyncio.sleep(3)
    for c in clients:
        await c.disconnect()


asyncio.run(main())
