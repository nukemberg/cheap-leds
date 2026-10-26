# /// script
# requires-python = ">=3.10"
# dependencies = ["bleak"]
# ///
"""Connect to BLE device(s) by name and dump all services/characteristics/descriptors."""
import asyncio
import sys

from bleak import BleakClient, BleakScanner

NAME = sys.argv[1] if len(sys.argv) > 1 else "GATT--DEMO"


async def dump(dev):
    print(f"=== {dev.address} {dev.name}")
    async with BleakClient(dev) as c:
        for s in c.services:
            print(f"[svc] {s.uuid} ({s.description})")
            for ch in s.characteristics:
                val = ""
                if "read" in ch.properties:
                    try:
                        val = (await c.read_gatt_char(ch)).hex()
                    except Exception as e:  # noqa: BLE001
                        val = f"<err {e}>"
                print(f"   [chr] {ch.uuid} h={ch.handle} {ch.properties} {val}")
                for d in ch.descriptors:
                    try:
                        dv = (await c.read_gatt_descriptor(d.handle)).hex()
                    except Exception as e:  # noqa: BLE001
                        dv = f"<err {e}>"
                    print(f"      [desc] {d.uuid} {dv}")


async def main():
    devs = [d for d in await BleakScanner.discover(timeout=8) if d.name == NAME]
    for d in devs:
        await dump(d)


asyncio.run(main())
