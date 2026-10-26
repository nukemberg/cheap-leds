# /// script
# requires-python = ">=3.10"
# dependencies = ["bleak"]
# ///
"""Subscribe to FFF4 and send the timer query (BC 0C 01 01 55); print any notifications."""
import asyncio

from bleak import BleakClient, BleakScanner

SERVICE = "00002022-0000-1000-8000-00805f9b34fb"
WRITE = "0000fff3-0000-1000-8000-00805f9b34fb"
NOTIFY = "0000fff4-0000-1000-8000-00805f9b34fb"
QUERY_TIMERS = bytes.fromhex("bc0c010155")


async def query(dev):
    async with BleakClient(dev) as c:
        await c.start_notify(NOTIFY, lambda _, d: print(f"  {dev.address[:8]} <- {d.hex()}"))
        for response in (True, False):
            print(f"{dev.address[:8]} -> {QUERY_TIMERS.hex()} (response={response})")
            await c.write_gatt_char(WRITE, QUERY_TIMERS, response=response)
            await asyncio.sleep(3)


async def main():
    devs = await BleakScanner.discover(timeout=12, service_uuids=[SERVICE])
    print("found:", [d.address for d in devs])
    for d in devs:
        try:
            await query(d)
        except Exception as e:  # noqa: BLE001
            print(f"{d.address[:8]} failed: {e}")


asyncio.run(main())
