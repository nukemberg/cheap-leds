# /// script
# requires-python = ">=3.10"
# dependencies = ["bleak"]
# ///
"""Watch BLE advertisements and print the first sighting of devices whose name matches a prefix."""
import asyncio
import sys
import time

from bleak import BleakScanner

PREFIXES = tuple(sys.argv[1].split(",")) if len(sys.argv) > 1 else ("MELK", "ELK", "GATT--DEMO")
DURATION = float(sys.argv[2]) if len(sys.argv) > 2 else 120.0


async def main():
    seen = set()
    start = time.monotonic()

    def on_adv(dev, adv):
        name = adv.local_name or dev.name or ""
        if dev.address in seen or not name.startswith(PREFIXES):
            return
        seen.add(dev.address)
        print(f"[{time.monotonic() - start:6.1f}s] {dev.address} rssi={adv.rssi} name={name!r} "
              f"services={adv.service_uuids} mfr={ {hex(k): v.hex() for k, v in adv.manufacturer_data.items()} }",
              flush=True)

    async with BleakScanner(on_adv):
        await asyncio.sleep(DURATION)
    print(f"done, {len(seen)} matching device(s)", flush=True)


asyncio.run(main())
