port := "8765"

# Serve the webapp on localhost (Web Bluetooth needs localhost or HTTPS)
serve:
    uv run python -m http.server {{port}} --directory web

# Serve and expose to an Android phone over USB (open http://localhost:8765 on the phone)
android:
    adb reverse tcp:{{port}} tcp:{{port}}
    just serve

test:
    node --test web/drivers.test.js

# Scan nearby BLE advertisements
scan secs="10":
    uv run scan.py {{secs}}

# Dump GATT table of the first device whose name starts with a prefix
gatt prefix="GATT--DEMO":
    uv run gatt_dump.py "{{prefix}}"

# Cycle power/colors/brightness on all controllers
probe:
    uv run probe.py

# Send the timer query with FFF4 notifications enabled
query:
    uv run query.py

icons:
    uv run make_icons.py

# Wait for a MELK controller, then run the power/colour/effect test sequence
probe-melk:
    uv run probe_melk.py

# Print the first advertisement of devices whose name starts with a prefix
watch prefixes="MELK,GATT--DEMO" secs="120":
    uv run watch_scan.py {{prefixes}} {{secs}}
