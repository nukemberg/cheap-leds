# /// script
# requires-python = ">=3.10"
# dependencies = ["bleak"]
# ///
"""Connect to the first BLE device whose name starts with a prefix and dump its services/characteristics/descriptors."""
import asyncio
import sys

from bleak import BleakClient, BleakScanner

NAME = sys.argv[1] if len(sys.argv) > 1 else "GATT--DEMO"
SCAN_SECS = float(sys.argv[2]) if len(sys.argv) > 2 else 60.0


async def dump(dev):
    print(f"=== {dev.address} {dev.name}")
    async with BleakClient(dev, timeout=30) as c:
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
    # Connect as soon as the device is seen: some controllers advertise only briefly.
    for attempt in range(1, 4):
        dev = await BleakScanner.find_device_by_filter(
            lambda d, adv: (adv.local_name or d.name or "").startswith(NAME), timeout=SCAN_SECS)
        if not dev:
            print(f"  attempt {attempt}: {NAME!r} not seen in {SCAN_SECS:.0f}s")
            continue
        try:
            await dump(dev)
            return
        except (TimeoutError, OSError) as e:
            print(f"  attempt {attempt} failed: {e!r}")


asyncio.run(main())
