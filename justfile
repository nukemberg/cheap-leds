port := "8765"

# Serve the webapp on localhost (Web Bluetooth needs localhost or HTTPS)
serve:
    uv run python -m http.server {{port}} --directory web

# Serve and expose to an Android phone over USB (open http://localhost:8765 on the phone)
android:
    adb reverse tcp:{{port}} tcp:{{port}}
    just serve

test:
    node --test web/protocol.test.js

# Scan nearby BLE advertisements
scan secs="10":
    uv run scan.py {{secs}}

# Dump GATT table of MR Star controllers
gatt:
    uv run gatt_dump.py

# Cycle power/colors/brightness on all controllers
probe:
    uv run probe.py

icons:
    uv run make_icons.py
