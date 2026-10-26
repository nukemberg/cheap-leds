# /// script
# requires-python = ">=3.10"
# dependencies = ["bleak"]
# ///
"""Scan BLE advertisements and print everything seen (name, rssi, services, mfr data)."""
import asyncio
import sys

from bleak import BleakScanner

DURATION = float(sys.argv[1]) if len(sys.argv) > 1 else 10.0


async def main():
    found = await BleakScanner.discover(timeout=DURATION, return_adv=True)
    rows = sorted(found.values(), key=lambda t: -t[1].rssi)
    for dev, adv in rows:
        print(f"{dev.address}  rssi={adv.rssi:4d}  name={adv.local_name!r}")
        if adv.service_uuids:
            print(f"    services: {adv.service_uuids}")
        if adv.manufacturer_data:
            for k, v in adv.manufacturer_data.items():
                print(f"    mfr 0x{k:04x}: {v.hex()}")
        if adv.service_data:
            for k, v in adv.service_data.items():
                print(f"    svcdata {k}: {v.hex()}")


asyncio.run(main())
